#!/usr/bin/env node
/* Build a Resolve rough cut (FCPXML 1.10) from a raw talking-head take + its word timings.
 *
 *   node pipeline/resolve/build-timeline.mjs --slug <slug> [--style styles/<name>/style.json]
 *   node pipeline/resolve/build-timeline.mjs --raw <file> --words <words.json> [--out <dir>] [--style ...]
 *   options: --name "<timeline name>"  --chapters <chapters.json>  --no-punch  --no-music  --no-overlays  --threshold <dBFS>
 *            --anchor <x%,y%> (punch-in centre: the eyes, read off frame-grid.mjs)  --no-clean (raw audio, not work/*.clean.mov)
 *            --no-probe (fillers by energy snapping only, without the try-and-listen whisper probe)
 *
 * --slug uses videos/<slug>/raw/*.mp4|mov (the largest if several), raw/transcript.words.json, scenes/manifest.json,
 * music/manifest.json and script.md (chapter titles) when present, and writes into videos/<slug>/out/:
 *   timeline.fcpxml      import in Resolve: File > Import > Timeline...  (see IMPORT.md, written next to it)
 *   timeline-spec.json   the same timeline as plain JSON (pipeline/resolve/fcpxml.mjs documents the format); preview.mjs renders it
 *   joins.json           one record per join: timeline TC, source ranges, words either side, silence found, pause kept, flags
 *   captions.srt         transcript re-timed to the cut (import as a subtitle track)
 *   chapters.txt         YouTube chapter list re-timed to the cut (only chapters whose title was found in the transcript)
 *   IMPORT.md            exact click path + the review-marker list
 *   resolve-import.py / resolve-markers.py / resolve-verify.py / resolve-punchins.py   the pipeline/resolve/*.py
 *                        templates filled for this timeline, for the Resolve Studio MCP; see docs/resolve-editing.md
 *   <music>.loop.wav     a music bed looped to the cut's length (one clip per audio lane; see fcpxml.mjs)
 *
 * How the cut is decided (dead-air pass only; takes are Ben's call):
 *   1. Word times from whisper are navigation estimates (whisper.cpp tokens are contiguous, so gaps are invisible in them).
 *      The audio decides where silence is: ffmpeg decodes the RAW file, we take a 10 ms RMS envelope and an adaptive
 *      threshold (noise floor + 30% of the floor-to-speech span, or --threshold / style.edit.energy.thresholdDb).
 *   2. Every silent run longer than the allowed pause is shortened: inside a sentence (previous word has no . ? !) runs over
 *      pause.maxInSentence are cut down to pause.keepInSentence; between sentences runs over pause.maxBetweenSentences are cut
 *      to pause.keepBetweenSentences. Kept pause sits on the OUTGOING side; the incoming clip starts pause.headPad before the
 *      first phoneme (2-5 idle frames trimmed, per the waveform-timing rules). A softer threshold (-6 dB) protects quiet word
 *      tails and onsets. Cut frames round OUTWARD (out-point up, in-point down) so a word is never clipped by quantisation.
 *   3. Words veto cuts: if whisper puts a word inside a silence we would remove AND there is quiet sound (above the soft
 *      threshold) under it, that sound is kept and the join gets a CHECK JOIN marker. Whisper often stretches a word across
 *      a pause; where nothing is audible under the stretch, the silence is still cut (noted in joins.json).
 *      Unpunctuated transcripts (whisper base sometimes emits none) treat silences >= 0.7 s as sentence breaks.
 *   4. Head/tail: only silence touching the file start/end is trimmed (to pause.leadIn / pause.tailOut); pre-roll chatter
 *      and slates stay for the human.
 *   5. Punch-ins (static scale per segment, style.edit.punchIn): framing alternates at every jump cut (every Nth segment
 *      zoomed), and any stretch longer than maxHoldSec gets a through-edit at the best word boundary near its middle so the
 *      framing changes. Pieces shorter than minSegmentSec keep the previous framing (no flash zooms).
 *   6. Nothing is cut for retakes/fillers: a 3+ word run said again within 15 s with no sentence finished in between
 *      (and a pause/comma before the restart, or <= 2 words between) becomes a RETAKE? to-do marker; stutters and um/uh
 *      become optional markers. Scenes land on lane 1+ at their word, music on lane -1 and below at a static gain, one
 *      clip per lane (a bed shorter than the cut is looped into out/<name>.loop.wav; Resolve scrambles lanes with 2+ clips).
 * Nobody has listened to the seams: joins.json marks every join "listened": false. Check them in Resolve.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probeMedia, audioEnvelope, levelStats, silentRuns, meanDb, parseArgs, runFF } from './media.mjs';
import { writeTimeline, secToFrames, framesToSec, timecode, timebase } from './fcpxml.mjs';
import { writeMcpScripts } from './mcp-scripts.mjs';
import { planContentCuts, applyContentCuts, TAKE_DEFAULTS } from './takes.mjs';
import { probeFillers } from '../edit/filler-probe.mjs';
import { loudness } from '../edit/clean-audio.mjs';
import { sentences } from '../edit/transcript-view.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

export const DEFAULT_STYLE = {
  name: 'default-talking-head',
  edit: {
    pause: {
      maxInSentence: 0.5, keepInSentence: 0.3,        // seconds
      maxBetweenSentences: 0.32, keepBetweenSentences: 0.16,
      headPad: 0.04, tailPad: 0.08,                    // kept before the first phoneme / after the last
      leadIn: 0.12, tailOut: 0.6,                      // start of video / end of video
      minCut: 0.12,                                    // do not bother removing less than this
      minSilence: 0.12,                                // shortest silent run the detector reports
      softDb: 6, softReach: 0.18,                      // quieter threshold (dB below) used to protect word edges, and how far
    },
    energy: { thresholdDb: null, frac: 0.3 },
    punchIn: { enabled: true, scale: 1.12, every: 2, maxHoldSec: 12, minSegmentSec: 1.2, position: [0, 0] },
    cutRate: { targetCutsPerMin: null },               // framing changes per minute to aim for (learned styles set this)
    music: { gainDb: -22, uses: ['bed', 'rhythm', 'sparkle'] },
    captions: { maxChars: 42, maxSec: 5, minSec: 0.7 },
    takes: { ...TAKE_DEFAULTS },                       // fillers / stutters / retakes: 'cut' | 'mark' | 'off' (takes.mjs)
    markers: {
      retakeWindowSec: 15, minRepeatWords: 3, fillers: ['um', 'uh', 'uhm', 'umm', 'uhh', 'er', 'erm', 'ah', 'hmm', 'mm', 'mhm'],
      fillerMarkers: true, stutterMarkers: true, chapterElement: 'marker',
    },
  },
};

const STOP = new Set("a an the and or but so to of in on at for with is it's its i i'm you your we they he she that this was be are do did just like um uh".split(' '));
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const isSentenceEnd = (w) => /[.!?]["')\]]*$/.test(w);
function deepMerge(a, b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b ?? a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = a && typeof a[k] === 'object' && !Array.isArray(a[k]) ? deepMerge(a[k], v) : v;
  return out;
}
const srtTime = (s) => { const ms = Math.max(0, Math.round(s * 1000)); const p = (x, n = 2) => String(x).padStart(n, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
const ytTime = (s) => { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };

// ------------------------------------------------------------------ inputs ------------------------------------------
function loadInputs(args) {
  let rawPath, wordsPath, outDir, videoDir = null, slug = args.slug || null;
  if (slug) {
    videoDir = path.join(ROOT, 'videos', slug);
    const rawDir = path.join(videoDir, 'raw');
    if (!fs.existsSync(rawDir)) throw new Error(`no ${rel(rawDir)}`);
    const vids = fs.readdirSync(rawDir).filter((f) => /\.(mp4|mov|mxf|mkv|m4v)$/i.test(f)).map((f) => path.join(rawDir, f));
    if (!vids.length) throw new Error(`no video in ${rel(rawDir)}`);
    rawPath = args.raw ? path.resolve(ROOT, args.raw) : vids.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    if (vids.length > 1 && !args.raw) console.warn(`[build] ${vids.length} raw files; using the largest (${path.basename(rawPath)}). Pass --raw to choose.`);
    const cands = [args.words && path.resolve(ROOT, args.words), path.join(rawDir, 'transcript.words.json'),
      path.join(rawDir, path.basename(rawPath, path.extname(rawPath)) + '.words.json')].filter(Boolean);
    wordsPath = cands.find((p) => fs.existsSync(p));
    if (!wordsPath) throw new Error(`no word timings: run  npm run transcribe -- --in ${rel(rawPath)}`);
    outDir = path.resolve(ROOT, args.out || path.join(videoDir, 'out'));
  } else {
    if (!args.raw || !args.words) throw new Error('usage: --slug <slug> | --raw <file> --words <words.json> [--out <dir>]');
    rawPath = path.resolve(ROOT, args.raw); wordsPath = path.resolve(ROOT, args.words);
    const rd = path.dirname(rawPath);
    outDir = path.resolve(ROOT, args.out || (path.basename(rd) === 'raw' ? path.join(path.dirname(rd), 'out') : path.join(rd, 'out')));
    if (path.basename(rd) === 'raw') videoDir = path.dirname(rd);
  }
  for (const p of [rawPath, wordsPath]) if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
  let style = DEFAULT_STYLE, stylePath = null;
  if (args.style) {
    stylePath = path.resolve(ROOT, args.style);
    const s = JSON.parse(fs.readFileSync(stylePath, 'utf8'));
    style = { ...DEFAULT_STYLE, ...s, edit: deepMerge(DEFAULT_STYLE.edit, s.edit || {}) };
  }
  return { rawPath, wordsPath, outDir, videoDir, slug: slug || path.basename(videoDir || path.dirname(rawPath)), style, stylePath };
}

function loadWords(p) {
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return raw.map((w) => ({ t: +w.t, end: +(w.end ?? w.t), w: String(w.w || '').trim() }))
    .filter((w) => w.w && !/^[[(].*[\])]$/.test(w.w) && !/^[♪*#]+$/.test(w.w))
    .sort((a, b) => a.t - b.t)
    .map((w, i) => ({ ...w, i, n: norm(w.w), mid: (w.t + Math.max(w.end, w.t)) / 2 }));
}

// ------------------------------------------------------------------ the cut ------------------------------------------
function decideCut({ words, env, thr, media, style, punctuated = true, contentCuts = [] }) {
  const P = style.edit.pause;
  const fps = media.fps; const F = (s) => s * fps.num / fps.den;
  const dur = media.duration;
  const runs = silentRuns(env, thr, { minSilence: P.minSilence });
  // every silenced content range must sit in a run, even one shorter than minSilence (a stuttered "the")
  for (const c of contentCuts) if (!runs.some((r) => c.from < r.e && c.to > r.s)) runs.push({ s: c.from, e: c.to });
  runs.sort((x, y) => x.s - y.s);
  const soft = thr - P.softDb;
  const dbAt = (t) => env.db[Math.min(env.db.length - 1, Math.max(0, Math.floor(t / env.win)))] ?? -120;
  // walk from t in direction dir while the envelope stays above the soft threshold (quiet consonants, decays)
  const softEdge = (t, dir, reach) => { let x = t; const step = env.win * dir; for (let k = 0; k < reach / env.win; k++) { if (dbAt(x + (dir > 0 ? 0 : -env.win)) <= soft) break; x += step; } return x; };
  const wordBefore = (t) => { let lo = -1; for (const w of words) { if (w.mid < t) lo = w.i; else break; } return lo >= 0 ? words[lo] : null; };
  const wordAfter = (t) => words.find((w) => w.mid >= t) || null;

  // head / tail
  // head/tail: only silence is trimmed (a silent run touching the file start/end); pre-roll chatter is a take decision
  let speechStart = runs.length && runs[0].s <= 0.05 ? runs[0].e : 0;
  if (speechStart > 0) speechStart = softEdge(speechStart, -1, P.softReach);
  let speechEnd = dur;
  const lastRun = runs[runs.length - 1];
  if (lastRun && lastRun.e >= dur - 0.05 && lastRun.s > speechStart) speechEnd = softEdge(lastRun.s, +1, P.softReach);
  const headIn = Math.max(0, speechStart - P.leadIn), tailOut = Math.min(dur, speechEnd + P.tailOut);

  const removals = [];
  const joinsInfo = [];
  for (const r of runs) {
    if (r.e <= headIn + 0.05 || r.s >= tailOut - 0.05) continue;
    if (r.s <= speechStart || r.e >= speechEnd) continue;
    const L = r.e - r.s, m = (r.s + r.e) / 2;
    const prev = wordBefore(m), next = wordAfter(m);
    // unpunctuated transcripts (whisper base sometimes emits none): treat long silences as sentence breaks
    const boundary = punctuated ? !!prev && isSentenceEnd(prev.w) : L >= 0.7;
    const maxAllowed = boundary ? P.maxBetweenSentences : P.maxInSentence;
    const keep = boundary ? P.keepBetweenSentences : P.keepInSentence;
    // a silenced filler / stutter / false start inside this run must go even when the run is short: without this, an
    // "um" with little silence around it made a run under maxAllowed and stayed in (caught by qa-render.mjs)
    const forced = contentCuts.filter((c) => c.from < r.e && c.to > r.s);
    if (L <= maxAllowed && !forced.length) continue;
    const endSoft = softEdge(r.s, +1, P.softReach);   // true end of the outgoing word, incl. quiet tail
    const onSoft = softEdge(r.e, -1, P.softReach);    // true onset of the incoming word, incl. quiet consonant
    let a = Math.max(r.s + Math.max(P.tailPad, keep - P.headPad), endSoft + P.tailPad);
    let b = Math.min(r.e - P.headPad, onSoft - P.headPad);
    if (forced.length) {
      // cover the whole removed content even if that leaves less than the usual pause (the content edges sit in silence)
      a = Math.min(a, Math.min(...forced.map((c) => c.from)));
      b = Math.max(b, Math.max(...forced.map((c) => c.to)));
    }
    const flags = [];
    if (endSoft - r.s > 0.05) flags.push(`soft tail ${Math.round((endSoft - r.s) * 1000)} ms kept past the threshold`);
    if (r.e - onSoft > 0.05) flags.push(`soft onset ${Math.round((r.e - onSoft) * 1000)} ms kept before the threshold`);
    // word veto: whisper places a word inside the silence AND there is quiet sound (above the soft threshold) where it
    // says the word is -> keep that sound. Whisper often stretches a word across a pause; with nothing audible under the
    // stretched part there is nothing to keep, so those words only earn a note.
    let pieces = [[a, b]];
    for (const w of words.filter((x) => x.end > a && x.t < b)) {
      const lo = Math.max(a, w.t), hi = Math.min(b, w.end);
      let first = null, lastV = null, n = 0;
      for (let t = lo; t < hi; t += env.win) if (dbAt(t) > soft) { n++; if (first == null) first = t; lastV = t + env.win; }
      if (n * env.win >= 0.06) {
        flags.push(`whisper places "${w.w}" (${w.t.toFixed(2)}-${w.end.toFixed(2)}s) inside this silence and there is quiet sound there (${Math.round(n * env.win * 1000)} ms above ${soft.toFixed(0)} dBFS): kept it`);
        const k0 = first - P.headPad, k1 = lastV + P.tailPad;
        pieces = pieces.flatMap(([x, y]) => (k1 > x && k0 < y ? [[x, k0], [k1, y]] : [[x, y]]));
      } else if ((hi - lo) > 0.25) flags.push(`whisper stretches "${w.w}" over ${Math.round((hi - lo) * 1000)} ms of this silence (nothing audible there)`);
    }
    for (const [x, y] of pieces) {
      const aF = Math.ceil(F(x) - 1e-6), bF = Math.floor(F(y) + 1e-6);
      if (framesToSec(bF - aF, fps) < P.minCut) continue;
      removals.push({ aF, bF, run: r, prev, next, boundary, flags: [...flags], keep });
    }
  }
  // kept segments = [head, tail] minus removals
  const headF = Math.floor(F(headIn) + 1e-6), tailF = Math.min(Math.ceil(F(tailOut) - 1e-6), Math.floor(F(dur) + 1e-6));
  removals.sort((x, y) => x.aF - y.aF);
  const segs = []; let cur = headF;
  for (const rm of removals) {
    if (rm.bF <= cur || rm.aF >= tailF) continue;
    if (rm.aF > cur) { segs.push({ inF: cur, outF: rm.aF }); joinsInfo.push(rm); }
    cur = Math.max(cur, rm.bF);
  }
  if (tailF > cur) segs.push({ inF: cur, outF: tailF });
  // the last pushed removal has no incoming segment if the tail was consumed
  const joins = joinsInfo.slice(0, Math.max(0, segs.length - 1));
  // drop word-less islands shorter than 0.35 s (clicks, lip smacks) by merging the removals around them
  for (let k = segs.length - 2; k >= 1; k--) {
    const s = segs[k]; const a = framesToSec(s.inF, fps), b = framesToSec(s.outF, fps);
    if (b - a < 0.35 && !words.some((w) => w.mid >= a && w.mid <= b)) {
      segs.splice(k, 1);
      const merged = joins[k - 1]; merged.flags.push(`dropped a ${Math.round((b - a) * 1000)} ms word-less sound between two cuts`);
      merged.bF = joins[k].bF; merged.next = joins[k].next; merged.run = { s: merged.run.s, e: joins[k].run.e };
      joins.splice(k, 1);
    }
  }
  return { segs, joins, headIn, tailOut, speechStart, speechEnd, runs };
}

// ------------------------------------------------------------------ punch-ins ----------------------------------------
function framing({ segs, words, env, media, style }) {
  const Pi = style.edit.punchIn; const fps = media.fps;
  const sec = (f) => framesToSec(f, fps);
  // hookHold: the longest hold in the first 60 s of the CUT (references cut faster in the hook: 13/min vs 8 in Ben's)
  const mk = (hold, hookHold = hold) => {
    const pieces = [];
    const split = (inF, outF, jumpBefore, recAt) => {
      const a = sec(inF), b = sec(outF);
      const h = recAt < 60 ? hookHold : hold;
      if (b - a <= h) { pieces.push({ inF, outF, jumpBefore, recAt }); return; }
      const mid = (a + b) / 2;
      const cands = [];
      for (let i = 0; i < words.length - 1; i++) {
        const w = words[i], nx = words[i + 1];
        const t = (w.end + nx.t) / 2;
        if (t < a + Pi.minSegmentSec || t > b - Pi.minSegmentSec) continue;
        const bonus = isSentenceEnd(w.w) ? 0 : /[,;:]$/.test(w.w) ? 0.12 : 0.3;
        cands.push({ t, score: Math.abs(t - mid) / (b - a) + bonus });
      }
      if (!cands.length) { pieces.push({ inF, outF, jumpBefore, recAt }); return; }
      cands.sort((x, y) => x.score - y.score);
      // place the through-edit on the quietest 10 ms window within +-120 ms of the word boundary
      let best = cands[0].t, bestDb = Infinity;
      for (let t = cands[0].t - 0.12; t <= cands[0].t + 0.12; t += env.win) { const d = meanDb(env, t, t + env.win); if (d < bestDb) { bestDb = d; best = t; } }
      const cutF = Math.min(outF - 1, Math.max(inF + 1, Math.round(best * fps.num / fps.den)));
      split(inF, cutF, jumpBefore, recAt); split(cutF, outF, false, recAt + sec(cutF - inF));
    };
    let rec = 0;
    segs.forEach((s, k) => { split(s.inF, s.outF, k > 0, rec); rec += sec(s.outF - s.inF); });
    let zoomIdx = 0, prevZoom = false;
    for (const p of pieces) {
      const short = sec(p.outF - p.inF) < Pi.minSegmentSec;
      const want = Pi.enabled && (zoomIdx % Math.max(2, Pi.every)) === Math.max(2, Pi.every) - 1;
      p.zoom = pieces.indexOf(p) > 0 && short ? prevZoom : want;
      if (!(short && pieces.indexOf(p) > 0)) zoomIdx++;
      prevZoom = p.zoom;
    }
    // per minute of the CUT (the raw span would count removed dead air as screen time)
    const minutes = sec(pieces.reduce((s, p) => s + p.outF - p.inF, 0)) / 60;
    const change = (p, i) => i > 0 && (p.jumpBefore || p.zoom !== pieces[i - 1].zoom);
    const changes = pieces.filter(change).length;
    const hookMin = Math.min(1, minutes);
    const hookChanges = pieces.filter((p, i) => p.recAt < 60 && change(p, i)).length;
    return { pieces, cutsPerMin: changes / Math.max(minutes, 1e-6), cutsPerMinFirst60: hookChanges / Math.max(hookMin, 1e-6), hold, hookHold };
  };
  if (!Pi.enabled) return mk(Infinity);
  let res = mk(Pi.maxHoldSec);
  const target = style.edit.cutRate?.targetCutsPerMin;
  if (target) for (let hold = Pi.maxHoldSec * 0.85; res.cutsPerMin < target && hold >= Math.max(3, Pi.minSegmentSec * 2); hold *= 0.85) res = mk(hold);
  // then the hook: a shorter hold in the first minute until it changes framing as often as the reference's first minute
  const hook = style.edit.cutRate?.targetCutsPerMinFirst60;
  if (hook) for (let hh = res.hold * 0.85; res.cutsPerMinFirst60 < hook && hh >= Math.max(2, Pi.minSegmentSec * 2); hh *= 0.85) res = mk(res.hold, hh);
  return res;
}

// ------------------------------------------------------------------ markers ------------------------------------------
function findRetakes(words, style, pauseBefore) {
  const M = style.edit.markers; const out = [];
  const n = words.length; let i = 0;
  while (i < n) {
    let found = null;
    for (let len = Math.min(8, n - i); len >= M.minRepeatWords && !found; len--) {
      const gram = words.slice(i, i + len).map((w) => w.n);
      if (gram.some((g) => !g)) continue;
      if (len < 4 && gram.every((g) => STOP.has(g))) continue;
      for (let j = i + len; j + len <= n && words[j].t - words[i].t <= M.retakeWindowSec; j++) {
        let ok = true; for (let k = 0; k < len; k++) if (words[j + k].n !== gram[k]) { ok = false; break; }
        if (!ok) continue;
        // a restart abandons the first attempt: no sentence end between the two, or only a few words in between.
        // Rhetorical repeats ("halfway through the year... further than halfway through the year") finish a sentence first.
        const between = words.slice(i + len - 1, j);
        const finished = between.some((w) => isSentenceEnd(w.w));
        const restartCue = /[,.;:—…-]$/.test(words[j - 1].w) || (pauseBefore && pauseBefore(words[j].t) >= 0.25);
        if ((!finished && restartCue) || j - (i + len) <= 2) { found = { i, j, len }; break; }
      }
    }
    if (found) { out.push(found); i = found.i + found.len; } else i++;
  }
  return out;
}

function findChapters({ videoDir, args, words }) {
  const list = [];
  if (args.chapters) {
    const j = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.chapters), 'utf8'));
    for (const c of j) list.push({ title: c.title, at: c.at, phrase: c.phrase });
  } else if (videoDir && fs.existsSync(path.join(videoDir, 'script.md'))) {
    const md = fs.readFileSync(path.join(videoDir, 'script.md'), 'utf8');
    // the "## Chapters ..." section up to the next heading or end of file (a "Chapters:" description block also works)
    const sec = /^(?:#+\s*Chapters[^\n]*|Chapters:\s*)\n([\s\S]*?)(?=\n#+\s|\n\s*\n\s*\n|(?![\s\S]))/im.exec(md);
    const body = sec ? sec[1] : '';
    for (const line of body.split('\n')) {
      const m = /^\s*(?:[-*]\s*)?\|?\s*(\d+:\d{2}(?::\d{2})?)\s*(?:\||[—–-])?\s*([^|\n]+?)\s*(?:\|.*)?$/.exec(line);
      if (m && !/^time$/i.test(m[2])) list.push({ title: m[2].trim(), estimate: m[1] });
    }
  }
  const W = words.map((w) => w.n);
  const out = [];
  for (const c of list) {
    if (c.at != null) { out.push({ title: c.title, rawT: +c.at, how: 'given time' }); continue; }
    const target = norm(c.phrase || c.title).length ? (c.phrase || c.title).split(/\s+/).map(norm).filter(Boolean) : [];
    const content = target.filter((t) => !STOP.has(t));
    if (!content.length) { out.push({ title: c.title, rawT: null, how: 'no content words' }); continue; }
    let best = null;
    for (let i = 0; i < W.length; i++) {
      const win = W.slice(i, i + target.length + 3);
      const hit = content.filter((t) => win.includes(t)).length / content.length;
      if (hit >= 0.6 && (!best || hit > best.hit)) best = { i, hit };
      if (best && best.hit === 1) break;
    }
    if (best) { let i = best.i; while (i < W.length - 1 && !target.includes(W[i])) i++; out.push({ title: c.title, rawT: words[i].t, how: `matched ${Math.round(best.hit * 100)}% of the title words`, estimate: c.estimate }); }
    else out.push({ title: c.title, rawT: null, how: 'title not found in the transcript', estimate: c.estimate });
  }
  return out;
}

// ------------------------------------------------------------------ main --------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inp = loadInputs(args);
  const { style } = inp;
  const media = probeMedia(inp.rawPath);
  if (!media.hasVideo) throw new Error('raw file has no video stream');
  if (!media.hasAudio) throw new Error('raw file has no audio stream');
  const fps = media.fps; const sec = (f) => framesToSec(f, fps);
  const allWords = loadWords(inp.wordsPath);
  if (allWords.length < 3) throw new Error('too few words in the transcript');
  console.log(`[build] ${rel(inp.rawPath)}: ${media.width}x${media.height} @ ${(fps.num / fps.den).toFixed(3)} fps, ${media.duration.toFixed(1)} s, ${allWords.length} words; style ${style.name}`);

  const rawEnv = await audioEnvelope(inp.rawPath);
  const lv = levelStats(rawEnv.db, { frac: style.edit.energy.frac });
  const thr = args.threshold != null ? Number(args.threshold) : style.edit.energy.thresholdDb ?? lv.threshold;
  console.log(`[build] audio floor ${lv.floor} dBFS, speech ${lv.speech} dBFS, silence threshold ${thr} dBFS`);

  const punctuated = allWords.filter((w) => /[.!?,]$/.test(w.w)).length / allWords.length >= 0.02;
  if (!punctuated) console.warn('[build] transcript has no punctuation: silences >= 0.7 s are treated as sentence breaks (transcribe with --edit for punctuation)');
  // takes: fillers, stutters and false starts are cut (or marked) first; the removed ranges then count as silence, so
  // the pause rules below give every such join a natural pause and the usual word-edge protection
  const runs0 = silentRuns(rawEnv, thr, { minSilence: style.edit.pause.minSilence });
  const pauseBefore0 = (t) => { let best = 0; for (const r of runs0) { if (r.e >= t - 0.35 && r.e <= t + 0.2) best = Math.max(best, r.e - r.s); if (r.s > t + 0.2) break; } return best; };
  // fillers are found by trying the cut and listening (whisper on short snippets), not by whisper's word time alone
  const T = { ...TAKE_DEFAULTS, ...(style.edit.takes || {}) };
  let fillerProbe = null, extraFillers = [];
  if (T.fillers === 'cut' && !args['no-probe']) {
    const fset = new Set(style.edit.markers.fillers);
    const targets = allWords.map((w, i) => ({ w, i })).filter(({ w }) => fset.has(w.n.replace(/'/g, ''))).map(({ w, i }) => ({ key: `w${i}`, t: w.t, end: Math.max(w.end, w.t + 0.1) }));
    const mergePath = inp.wordsPath.replace(/\.words\.json$/, '.merge.json');
    if (fs.existsSync(mergePath)) {
      const miss = JSON.parse(fs.readFileSync(mergePath, 'utf8')).fillersNotPlaced || [];
      miss.forEach((m, k) => { if (m.near != null && !targets.some((t) => Math.abs(t.t - m.near) < 0.8)) extraFillers.push({ key: `x${k}`, t: m.near, end: m.near + 1.0, w: String(m.w).replace(/[.,!?]+$/, '') }); });
      targets.push(...extraFillers);
    }
    const whisperExe = [path.join(ROOT, 'tools/whisper-cuda/Release/whisper-cli.exe'), path.join(ROOT, 'tools/whisper/Release/whisper-cli.exe')].find((p) => fs.existsSync(p));
    const model = ['tools/ggml-medium.en.bin', 'tools/ggml-small.en.bin', 'tools/ggml-base.en.bin'].map((m) => path.join(ROOT, m)).find((p) => fs.existsSync(p));
    if (targets.length && whisperExe && model) {
      const t0 = Date.now();
      fillerProbe = await probeFillers({ media: inp.rawPath, targets, env: rawEnv, thr, work: path.join(inp.videoDir || path.dirname(inp.rawPath), 'work'), whisper: whisperExe, model });
      console.log(`[build] filler probe: ${targets.length} fillers tried and listened to in ${((Date.now() - t0) / 1000).toFixed(0)} s; ${[...fillerProbe.values()].filter((d) => d.cut).length} have a clean cut`);
    }
  }
  // Claude's editorial content pass (work/content-cuts.json, sentence ids from pipeline/edit/transcript-view.mjs)
  let editorial = [];
  const contentPath = args.content ? path.resolve(ROOT, args.content) : path.join(inp.videoDir || path.dirname(inp.rawPath), 'work', 'content-cuts.json');
  if (!args['no-content'] && fs.existsSync(contentPath)) {
    const S = sentences(allWords);
    const byId = new Map(S.map((s) => [s.id, s]));
    for (const c of JSON.parse(fs.readFileSync(contentPath, 'utf8')).cuts || []) {
      const w0 = c.words ? c.words[0] : byId.get(c.from)?.w0, w1 = c.words ? c.words[1] : byId.get(c.to || c.from)?.w1;
      if (w0 == null || w1 == null) { console.warn(`[build] content cut ${JSON.stringify(c)} does not resolve to words; skipped`); continue; }
      editorial.push({ w0, w1, why: c.why });
    }
    console.log(`[build] editorial content pass: ${editorial.length} cuts from ${rel(contentPath)}`);
  }
  const takes = planContentCuts({ words: allWords, env: rawEnv, thr, style, retakes: findRetakes(allWords, style, pauseBefore0), fillerProbe, extraFillers, editorial });
  const { env, words } = applyContentCuts(rawEnv, allWords, takes.cuts);
  const byKind = (k) => takes.cuts.filter((c) => c.kind === k).length;
  console.log(`[build] takes: cut ${byKind('filler')} fillers, ${byKind('stutter')} stutters, ${byKind('retake')} false starts (${takes.cuts.reduce((s, c) => s + c.to - c.from, 0).toFixed(1)} s); left for review: ${takes.kept.length}`);
  const cut = decideCut({ words, env, thr, media, style, punctuated, contentCuts: takes.cuts });
  if (!cut.segs.length) throw new Error('nothing kept; try --threshold lower');
  if (args['no-punch']) style.edit.punchIn.enabled = false;
  const fr = framing({ segs: cut.segs, words, env, media, style });
  const pieces = fr.pieces;
  const Pi = style.edit.punchIn;
  // punch in AROUND the speaker's eyes (--anchor x%,y% read off pipeline/resolve/frame-grid.mjs, or style punchIn.anchor),
  // so the face stays where it is on screen and only gets bigger: no sideways or vertical jump at the cut. Zooming about
  // any point inside the frame keeps the frame covered. Position is Resolve's Pan/Tilt in pixels (+x right, +y up).
  const anchor = args.anchor ? String(args.anchor).split(',').map((v) => parseFloat(v)) : Pi.anchor || null;
  if (anchor) {
    const dx = (anchor[0] / 100) * media.width - media.width / 2, dyUp = media.height / 2 - (anchor[1] / 100) * media.height;
    Pi.position = [Math.round(dx * (1 - Pi.scale)), Math.round(dyUp * (1 - Pi.scale))];
    Pi.anchor = anchor;
    console.log(`[build] punch-ins centred on ${anchor[0]}% across, ${anchor[1]}% down: ${Pi.scale}x with position ${Pi.position.join(', ')} px`);
  }

  // raw seconds -> timeline seconds
  const pieceRec = []; let rec = 0;
  for (const p of pieces) { pieceRec.push({ ...p, recIn: rec }); rec += p.outF - p.inF; }
  const totalF = rec;
  const mapRaw = (t, { snapForward = true } = {}) => {
    const f = t * fps.num / fps.den;
    for (const p of pieceRec) { if (f < p.inF) return snapForward ? sec(p.recIn) : null; if (f < p.outF) return sec(p.recIn + (f - p.inF)); }
    return sec(totalF);
  };

  // ---- spec
  const nameStamp = new Date(); const stamp = `${String(nameStamp.getMonth() + 1).padStart(2, '0')}${String(nameStamp.getDate()).padStart(2, '0')}-${String(nameStamp.getHours()).padStart(2, '0')}${String(nameStamp.getMinutes()).padStart(2, '0')}`;
  // dialogue cleaned before the cut (pipeline/edit/clean-audio.mjs): same video, levelled audio. Cut decisions above were
  // made on the original; the clean file is only used if its own checks say it is sample-in-sync and the same length.
  let aMedia = inp.rawPath, cleanInfo = null;
  const cleanPath = path.join(inp.videoDir || path.dirname(inp.rawPath), 'work', path.basename(inp.rawPath, path.extname(inp.rawPath)) + '.clean.mov');
  if (!args['no-clean'] && fs.existsSync(cleanPath)) {
    const rep = JSON.parse(fs.readFileSync(cleanPath.replace(/\.mov$/, '.json'), 'utf8'));
    if (rep.inSync && rep.durationOk) { aMedia = cleanPath; cleanInfo = { file: rel(cleanPath), lufs: rep.after.lufs, truePeak: rep.after.truePeak, gainDb: rep.gainDb, denoise: rep.denoise.used }; console.log(`[build] A-roll audio: ${rel(cleanPath)} (cleaned, ${rep.after.lufs} LUFS, in sync)`); }
    else console.warn(`[build] ${rel(cleanPath)} failed its sync/duration check; using the raw audio`);
  } else if (!args['no-clean']) console.log(`[build] no cleaned dialogue (${rel(cleanPath)}); run pipeline/edit/clean-audio.mjs for levelled audio`);
  const spec = {
    version: 1, name: args.name || `${inp.slug} AI rough cut ${stamp}`, event: 'YT Suite', fps: `${fps.num}/${fps.den}`,
    width: media.width, height: media.height, tcStart: '01:00:00:00',
    media: { raw: { path: aMedia } }, aroll: [], overlays: [], music: [], markers: [],
  };
  pieces.forEach((p, k) => spec.aroll.push({ media: 'raw', in: +sec(p.inF).toFixed(6), out: +sec(p.outF).toFixed(6), inFrame: p.inF, outFrame: p.outF,
    ...(p.zoom ? { scale: Pi.scale, position: Pi.position } : {}), name: path.basename(inp.rawPath) }));

  // overlays from the scene manifest
  const report = { overlays: [], music: [], skipped: [] };
  const vd = inp.videoDir;
  const findFile = (p) => [path.resolve(ROOT, p), vd && path.resolve(vd, p), vd && path.resolve(vd, 'out', path.basename(p))].filter(Boolean).find((x) => fs.existsSync(x));
  if (vd && !args['no-overlays'] && fs.existsSync(path.join(vd, 'scenes', 'manifest.json'))) {
    const man = JSON.parse(fs.readFileSync(path.join(vd, 'scenes', 'manifest.json'), 'utf8'));
    for (const s of Array.isArray(man) ? man : man.scenes || []) {
      const file = s.output && findFile(s.output);
      if (!file) { report.skipped.push(`scene ${s.id}: rendered file not found (${s.output})`); continue; }
      let rawT = s.at != null ? +s.at : s.after_words != null && allWords[s.after_words] ? allWords[Math.min(allWords.length - 1, s.after_words)].t : null;
      let how = s.at != null ? 'at' : 'after_words';
      if (rawT == null) { report.skipped.push(`scene ${s.id}: no at/after_words`); continue; }
      const id = `scene_${s.id}`.replace(/[^\w]/g, '_');
      spec.media[id] = { path: file };
      const at = mapRaw(rawT);
      spec.overlays.push({ media: id, at: +at.toFixed(4), ...(s.duration ? { duration: s.duration } : {}), mode: s.mode || (s.transparent === false ? 'fullscreen' : 'overlay'), name: s.id });
      report.overlays.push({ id: s.id, rawT: +rawT.toFixed(2), at: +at.toFixed(2), how });
    }
  }
  // music
  if (vd && !args['no-music']) {
    const mdir = path.join(vd, 'music');
    let tracks = [];
    if (fs.existsSync(path.join(mdir, 'manifest.json'))) tracks = JSON.parse(fs.readFileSync(path.join(mdir, 'manifest.json'), 'utf8')).tracks || [];
    else if (fs.existsSync(mdir)) tracks = fs.readdirSync(mdir).filter((f) => /\.bed\.wav$/i.test(f)).map((f) => ({ file: f, use: 'bed' }));
    // style music.gainDb is the bed's level RELATIVE to the voice (measured from the reference); the clip gain is worked
    // out from the actual loudness of the dialogue and of each music file, so a loud track does not stay loud
    let dialogueLufs = null;
    for (const [i, t] of tracks.entries()) {
      if (!style.edit.music.uses.includes(t.use)) { report.skipped.push(`music ${t.file}: use "${t.use}" not placed (stingers/sfx are placed by hand)`); continue; }
      const src = [path.resolve(mdir, t.file), path.resolve(vd, t.file), path.resolve(ROOT, t.file)].find((x) => fs.existsSync(x));
      if (!src) { report.skipped.push(`music ${t.file}: file not found`); continue; }
      // one clip per audio lane (Resolve scrambles the audio tracks otherwise), so a short bed is looped into one file
      const file = await fitMusic(src, sec(totalF), inp.outDir);
      const id = `music_${i}`; spec.media[id] = { path: file };
      let gainDb = t.gain_db, how = 'manifest gain_db';
      if (gainDb == null) {
        dialogueLufs ??= cleanInfo?.lufs ?? (await loudness(inp.rawPath)).lufs;
        const musicLufs = (await loudness(src)).lufs;
        const relDb = style.edit.music.relativeDb ?? style.edit.music.gainDb;
        gainDb = dialogueLufs != null && musicLufs != null ? +Math.max(-40, Math.min(6, dialogueLufs + relDb - musicLufs)).toFixed(2) : relDb;
        how = `voice ${dialogueLufs} LUFS ${relDb} dB = ${(dialogueLufs + relDb).toFixed(1)} LUFS target; file ${musicLufs} LUFS`;
      }
      spec.music.push({ media: id, at: 0, duration: +sec(totalF).toFixed(4), gainDb, name: `${t.use} ${path.basename(src)}` });
      report.music.push({ file: rel(src), ...(file !== src ? { loopedTo: rel(file) } : {}), use: t.use, gainDb, how });
    }
  }

  // markers
  const M = style.edit.markers; const markers = [];
  const addMarker = (rawT, m) => { const at = mapRaw(rawT); markers.push({ ...m, at: +at.toFixed(4), rawT: +rawT.toFixed(3) }); };
  const chapters = findChapters({ videoDir: vd, args, words: allWords });
  chapters.forEach((c, i) => { if (c.rawT == null) return; const t = i === 0 ? cut.headIn : c.rawT; addMarker(t, { kind: 'chapter', name: c.title, note: c.how, element: M.chapterElement }); c.at = mapRaw(t); if (i === 0) c.at = 0; });
  // takes left for a human: false starts that might be deliberate, and fillers/stutters with no clean pause to cut at
  const clip = (s) => s.replace(/\s+/g, ' ').slice(0, 60);
  for (const k of takes.kept) {
    if (k.kind === 'retake') addMarker(k.t, { kind: 'todo', name: `RETAKE? "${clip(k.text)}"`, note: `${k.why}. ${k.context}. Nothing was cut here.` });
    else if (k.kind === 'filler' && M.fillerMarkers) addMarker(k.t, { kind: 'note', name: `FILLER "${clip(k.text)}"`, note: `${k.why}. ${k.context}` });
    else if (k.kind === 'stutter' && M.stutterMarkers) addMarker(k.t, { kind: 'note', name: `STUTTER "${clip(k.text)}"`, note: `${k.why}. ${k.context}` });
  }
  const retakes = takes.kept.filter((k) => k.kind === 'retake');

  // joins (+ CHECK markers for the ones that need a human ear)
  const joins = []; const pr = pieceRec;
  let cutIdx = 0;
  for (let k = 1; k < pr.length; k++) {
    const a = pr[k - 1], b = pr[k];
    const isCut = b.jumpBefore;
    const j = { id: `J${String(k).padStart(3, '0')}`, kind: isCut ? 'cut' : 'punch', timelineFrame: b.recIn, timecode: timecode(b.recIn, fps, 3600 * timebase(fps)), timelineSec: +sec(b.recIn).toFixed(3),
      outgoing: { segment: k, srcIn: +sec(a.inF).toFixed(3), srcOut: +sec(a.outF).toFixed(3), srcOutFrame: a.outF, words: '' },
      incoming: { segment: k + 1, srcIn: +sec(b.inF).toFixed(3), srcInFrame: b.inF, words: '' },
      framing: { before: a.zoom ? Pi.scale : 1, after: b.zoom ? Pi.scale : 1 }, flags: [], listened: false, status: 'unreviewed' };
    const outT = sec(a.outF), inT = sec(b.inF);
    const before = words.filter((w) => w.mid < outT).slice(-4), after = words.filter((w) => w.mid >= inT).slice(0, 4);
    j.outgoing.words = before.map((w) => w.w).join(' '); j.outgoing.lastWord = before.at(-1) ? { w: before.at(-1).w, t: before.at(-1).t, end: before.at(-1).end } : null;
    j.incoming.words = after.map((w) => w.w).join(' '); j.incoming.firstWord = after[0] ? { w: after[0].w, t: after[0].t, end: after[0].end } : null;
    if (isCut) {
      const info = cut.joins[cutIdx++];
      if (info) {
        j.removed = { from: +sec(a.outF).toFixed(3), to: +sec(b.inF).toFixed(3), seconds: +sec(b.inF - a.outF).toFixed(3) };
        j.silence = { from: +info.run.s.toFixed(3), to: +info.run.e.toFixed(3), seconds: +(info.run.e - info.run.s).toFixed(3) };
        j.keptPause = { afterSpeech: +(outT - info.run.s).toFixed(3), beforeSpeech: +(info.run.e - inT).toFixed(3) };
        j.keptPause.total = +(j.keptPause.afterSpeech + j.keptPause.beforeSpeech).toFixed(3);
        j.sentenceBoundary = info.boundary;
        // what did we throw away? peak level and the longest stretch above the threshold (clicks/breaths are short)
        const seg = Array.from(env.db.subarray(Math.ceil(outT / env.win), Math.max(Math.ceil(outT / env.win) + 1, Math.floor(inT / env.win))));
        let run = 0, longest = 0; for (const d of seg) { run = d > thr ? run + 1 : 0; longest = Math.max(longest, run); }
        j.removedMaxDb = +Math.max(...seg).toFixed(1); j.removedLongestVoicedMs = Math.round(longest * env.win * 1000);
        j.flags.push(...info.flags);
        // fillers / stutters / false starts removed at this join (planned, so their audio no longer counts as voiced)
        const inside = takes.cuts.filter((c) => c.from >= info.run.s - 0.02 && c.to <= info.run.e + 0.02);
        if (inside.length) {
          j.content = inside.map((c) => ({ kind: c.kind, text: c.text, from: c.from, to: c.to, why: c.why }));
          for (const c of inside.filter((x) => x.kind === 'retake' || x.kind === 'editorial')) {
            const label = c.kind === 'retake' ? 'CUT RETAKE' : `CUT ${String(c.why).split(':')[0].slice(0, 30)}`;
            markers.push({ kind: 'note', name: `${label} "${c.text.slice(0, 50)}"`, note: `Removed ${(c.to - c.from).toFixed(1)} s: ${c.why}. ${c.context}. The clip has handles: drag the outgoing edit point to restore it.`, at: +sec(b.recIn).toFixed(4), rawT: +c.from.toFixed(3) });
            if (c.check) j.flags.push(`editorial cut ${c.check}`);
          }
        }
        if (j.removedLongestVoicedMs >= 60 || j.removedMaxDb > thr + 8) j.flags.push(`removed audio has ${j.removedLongestVoicedMs} ms above the threshold (peak ${j.removedMaxDb} dBFS): listen`);
        const wOut = j.outgoing.lastWord; if (wOut && wOut.end > outT + 0.15 && wOut.end < inT) j.flags.push(`whisper says "${wOut.w}" ends ${Math.round((wOut.end - outT) * 1000)} ms after the out-point (audio says silence; whisper word ends are loose)`);
      }
      if (a.zoom === b.zoom) j.flags.push('jump cut without a framing change (short segment)');
    } else j.flags.push('through-edit for a punch-in; no material removed');
    j.check = j.flags.some((f) => /inside this silence|ms above the threshold|dropped a|editorial cut edge in speech/.test(f));
    joins.push(j);
    if (j.check) markers.push({ kind: 'todo', name: `CHECK JOIN ${j.id}`, note: j.flags.join('; '), at: +sec(b.recIn).toFixed(4), rawT: +sec(b.inF).toFixed(3) });
  }
  spec.markers = markers; // rawT (raw-file seconds) rides along for style/diff.mjs; fcpxml.mjs ignores it

  // ---- write
  fs.mkdirSync(inp.outDir, { recursive: true });
  const specPath = path.join(inp.outDir, 'timeline-spec.json');
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
  const xmlPath = path.join(inp.outDir, 'timeline.fcpxml');
  const { tl, report: vr } = writeTimeline(spec, xmlPath, { baseDir: inp.outDir });
  for (const w of tl.warnings) console.warn('[build] ' + w);

  // captions re-timed to the cut
  const C = style.edit.captions; const cues = []; let curC = null;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const s = mapRaw(w.t), e = Math.max(s + 0.05, mapRaw(Math.max(w.end, w.t + 0.05)));
    if (curC && ((curC.text + ' ' + w.w).length > C.maxChars || e - curC.s > C.maxSec)) { cues.push(curC); curC = null; }
    if (!curC) curC = { s, e, text: w.w }; else { curC.text += ' ' + w.w; curC.e = e; }
    if (isSentenceEnd(w.w) && curC.text.length > 12) { cues.push(curC); curC = null; }
  }
  if (curC) cues.push(curC);
  for (let i = 0; i < cues.length; i++) { const nx = cues[i + 1]; if (cues[i].e - cues[i].s < C.minSec) cues[i].e = cues[i].s + C.minSec; if (nx && cues[i].e > nx.s) cues[i].e = nx.s; }
  fs.writeFileSync(path.join(inp.outDir, 'captions.srt'), cues.map((c, i) => `${i + 1}\n${srtTime(c.s)} --> ${srtTime(c.e)}\n${c.text}\n`).join('\n'));

  const placedCh = chapters.filter((c) => c.at != null);
  if (placedCh.length) fs.writeFileSync(path.join(inp.outDir, 'chapters.txt'), placedCh.map((c) => `${ytTime(c.at)} ${c.title}`).join('\n') + '\n');

  const cutJoins = joins.filter((j) => j.kind === 'cut');
  const pauses = cutJoins.map((j) => j.keptPause?.total).filter((x) => x != null).sort((x, y) => x - y);
  const summary = {
    raw: rel(inp.rawPath), dialogue: cleanInfo || { file: rel(inp.rawPath), cleaned: false }, style: style.name, punctuated, fps: `${fps.num}/${fps.den}`, threshold: thr, levels: lv,
    rawSeconds: +media.duration.toFixed(2), cutSeconds: +sec(totalF).toFixed(2), removedSeconds: +(media.duration - sec(totalF)).toFixed(2),
    headTrim: +cut.headIn.toFixed(2), tailTrim: +(media.duration - cut.tailOut).toFixed(2),
    segments: pieces.length, jumpCuts: cutJoins.length, throughEdits: joins.length - cutJoins.length,
    punchedIn: pieces.filter((p) => p.zoom).length, punchScale: Pi.enabled ? Pi.scale : null, framingChangesPerMin: +fr.cutsPerMin.toFixed(1), framingChangesPerMinFirst60: +(fr.cutsPerMinFirst60 ?? 0).toFixed(1), maxHoldUsed: Number.isFinite(fr.hold) ? +fr.hold.toFixed(1) : null,
    keptPauseMedian: pauses.length ? pauses[Math.floor(pauses.length / 2)] : null,
    takes: { policy: takes.policy, cut: { fillers: byKind('filler'), stutters: byKind('stutter'), retakes: byKind('retake'), seconds: +takes.cuts.reduce((s, c) => s + c.to - c.from, 0).toFixed(2) },
      leftForReview: { retakes: takes.kept.filter((k) => k.kind === 'retake').length, fillers: takes.kept.filter((k) => k.kind === 'filler').length, stutters: takes.kept.filter((k) => k.kind === 'stutter').length } },
    markers: { total: markers.length, chapters: markers.filter((m) => m.kind === 'chapter').length, retakes: retakes.length, fillers: markers.filter((m) => /^FILLER/.test(m.name)).length, stutters: markers.filter((m) => /^STUTTER/.test(m.name)).length, checkJoins: joins.filter((j) => j.check).length },
    overlays: report.overlays.length, music: report.music.length, skipped: report.skipped, chaptersNotFound: chapters.filter((c) => c.at == null).map((c) => `${c.title} (${c.how})`),
    fcpxml: { valid: vr.ok, ...vr.stats },
  };
  fs.writeFileSync(path.join(inp.outDir, 'joins.json'), JSON.stringify({
    note: 'Automated analysis only: nobody has listened to these seams. Word times are whisper estimates; silence is from a 10 ms RMS envelope of the raw audio.',
    raw: rel(inp.rawPath), fps: `${fps.num}/${fps.den}`, thresholdDb: thr, levels: lv, style: style.name, pause: style.edit.pause, summary, joins,
  }, null, 2));
  fs.writeFileSync(path.join(inp.outDir, 'takes.json'), JSON.stringify({ note: 'Fillers, stutters and false starts: what was cut (raw-file seconds) and what was left for a human, with why.', policy: takes.policy, cuts: takes.cuts, kept: takes.kept }, null, 2));
  fs.writeFileSync(path.join(inp.outDir, 'IMPORT.md'), importMd({ inp, spec, tl, summary, markers, cues: cues.length, chapters: placedCh, fps, takes }));
  // filled copies of the Resolve MCP scripts (import / verify / punch-in fallback) for this exact timeline
  const tcStartF = 3600 * timebase(fps);
  writeMcpScripts({ outDir: inp.outDir, xmlPath, srtPath: path.join(inp.outDir, 'captions.srt'), timelineName: spec.name, tcStartFrames: tcStartF,
    clipCount: pieces.length, punchins: pieceRec.filter((p) => p.zoom).map((p) => [tcStartF + p.recIn, Pi.scale, Pi.position[0], Pi.position[1]]),
    markers: tl.markers, finish: { crossfadeFrames: style.edit.audio?.crossfadeFrames ?? 2 } });

  console.log(`[build] raw ${summary.rawSeconds}s -> cut ${summary.cutSeconds}s (removed ${summary.removedSeconds}s, ${Math.round(100 * summary.removedSeconds / summary.rawSeconds)}%; head ${summary.headTrim}s, tail ${summary.tailTrim}s)`);
  console.log(`[build] ${summary.segments} segments: ${summary.jumpCuts} jump cuts + ${summary.throughEdits} punch-in through-edits; ${summary.punchedIn} segments at ${Pi.scale}x; ${summary.framingChangesPerMin} framing changes/min (first minute ${summary.framingChangesPerMinFirst60}); median kept pause at cuts ${summary.keptPauseMedian}s`);
  console.log(`[build] markers: ${summary.markers.total} (${summary.markers.chapters} chapters, ${summary.markers.retakes} RETAKE?, ${summary.markers.fillers} fillers, ${summary.markers.stutters} stutters, ${summary.markers.checkJoins} CHECK JOIN); overlays ${summary.overlays}, music ${summary.music}; ${cues.length} caption cues`);
  for (const s of summary.skipped) console.log(`[build] skipped: ${s}`);
  if (summary.chaptersNotFound.length) console.log(`[build] chapters not found in transcript: ${summary.chaptersNotFound.join('; ')}`);
  console.log(`[build] wrote ${rel(xmlPath)} (valid: ${vr.ok}, ${vr.stats.timeAttrsChecked} times on the frame grid) + timeline-spec.json, joins.json, captions.srt, IMPORT.md, resolve-{import,markers,verify,punchins}.py`);
  console.log(JSON.stringify({ fcpxml: rel(xmlPath), spec: rel(specPath), rawSeconds: summary.rawSeconds, cutSeconds: summary.cutSeconds, joins: joins.length, punchIns: summary.punchedIn, markers: summary.markers.total }));
}

/** A music file at least `seconds` long: the file itself, or out/<name>.loop.wav, the file played end to start again
 * (sample-exact for PCM, the same audio as copies laid back to back). Reused while it is newer than the source and long enough. */
async function fitMusic(file, seconds, outDir) {
  const m = probeMedia(file);
  if (m.duration >= seconds) return file;
  const out = path.join(outDir, `${path.parse(file).name}.loop.wav`);
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs && probeMedia(out).duration >= seconds) return out;
  fs.mkdirSync(outDir, { recursive: true });
  const pcm = /^pcm_/.test(m.codec || '') ? m.codec : 'pcm_s16le';
  await runFF(['-y', '-hide_banner', '-loglevel', 'error', '-stream_loop', '-1', '-i', file, '-t', (seconds + 1).toFixed(3), '-c:a', pcm, out]);
  return out;
}

function importMd({ inp, spec, tl, summary, markers, cues, chapters, fps, takes }) {
  const out = inp.outDir.split(path.sep).join('/');
  const tc = (s) => timecode(secToFrames(s, fps), fps, 3600 * timebase(fps));
  const L = [];
  L.push(`# Import "${spec.name}" into DaVinci Resolve`, '');
  L.push(`Rough cut built by \`pipeline/resolve/build-timeline.mjs\` from \`${summary.raw}\` (${summary.rawSeconds} s -> ${summary.cutSeconds} s, ${summary.segments} clips, ${summary.punchedIn} punched in at ${summary.punchScale ?? 1}x, ${summary.markers.total} markers). It references the ORIGINAL raw file, so every clip has full handles: drag any edit point in Resolve to restore material.`, '');
  L.push(`## 1. Timeline`, '');
  L.push(`1. Open (or create) the project. Importing never touches existing timelines; this arrives as a new timeline named **${spec.name}**.`);
  L.push(`2. **File > Import > Timeline...** (Ctrl+Shift+I) and choose \`${out}/timeline.fcpxml\`.`);
  L.push(`3. In the **Load XML** dialog:`);
  L.push(`   - **Automatically import source clips into media pool**: leave ON. The XML carries absolute file paths, so Resolve brings in the raw take, scenes and music itself. (Turn it OFF only if those exact files are already in the media pool, to avoid duplicates; Resolve then matches by name and asks you to locate anything it cannot find.)`);
  L.push(`   - **Automatically set project settings**: ON for a fresh project (it adopts ${tl.width}x${tl.height} at ${(fps.num / fps.den).toFixed(3).replace(/\.?0+$/, '')} fps). In a project that already has a different frame rate, turn it OFF; Resolve then makes the timeline at the project rate and conforms.`);
  L.push(`   - **Use sizing information**: ON. This carries the punch-in zooms (Zoom X/Y on the zoomed clips). If the clips come in at Zoom 1.0, run \`out/resolve-punchins.py\` through the Resolve MCP (see docs/resolve-editing.md).`);
  L.push(`   - Leave the rest at defaults (Ignore file extensions when matching: off; Import custom mattes / color information: off).`);
  L.push(`4. Timeline starts at **01:00:00:00**. V1/A1 = the A-roll (every clip is a straight cut through picture and sound), V2+ = scenes, A2+ = music, one clip per track at a static clip gain (${spec.music.map((m) => `${m.gainDb} dB`).join(', ') || 'none'}; no ducking is baked in, use Fairlight or Auto Ducking if wanted).`, '');
  L.push(`**Or let Claude do it through the Resolve Studio MCP** (\`davinci-resolve\` server approved, Resolve open with the project; tested on Studio 21.1, see renders/resolve-smoke/RESULT.md):`);
  L.push(`1. \`${out}/resolve-import.py\` with **run_script_unsafe**: imports the FCPXML (cuts, zooms, overlays, music gain all survive) and puts the captions in the media pool.`);
  L.push(`2. \`${out}/resolve-markers.py\` with **run_script**: the API import drops every marker; this puts the ${markers.length} below back as clip markers on the A-roll.`);
  L.push(`3. \`${out}/resolve-verify.py\` with **run_script_unsafe** (so it can save \`${out}/resolve-verify.json\` itself), then \`node pipeline/resolve/check-import.mjs --spec ${out}/timeline-spec.json\`: every clip, zoom, overlay, music clip and marker against the plan, frame by frame. All PASS or it is not done.`);
  L.push(`4. Look at a few frames (Project.ExportCurrentFrameAsStill) next to \`preview.mp4\`.`, '');
  L.push(`## 2. Captions`, '');
  L.push(`\`${out}/captions.srt\` (${cues} cues) is already re-timed to this cut. The MCP import puts it in the media pool as **captions**; by hand it is **File > Import > Subtitle...**. Then drag that subtitle clip onto the timeline so its head snaps to **01:00:00:00**; Resolve adds a Subtitle track. (A script cannot place it: Resolve's API ignores the position for subtitles.) Deliver page > Subtitle Settings > Export Subtitle to burn in or export for YouTube.`, '');
  if (chapters.length) { L.push(`## 3. Chapters`, '', `\`${out}/chapters.txt\` holds YouTube chapters re-timed to this cut:`, '', '```', ...chapters.map((c) => `${ytTime(c.at)} ${c.title}`), '```', ''); }
  L.push(`## ${chapters.length ? 4 : 3}. Review markers (nothing below was cut; you decide)`, '');
  const tk = summary.takes;
  L.push(`Already cut: ${tk.cut.fillers} fillers, ${tk.cut.stutters} stutters and ${tk.cut.retakes} false starts (${tk.cut.seconds} s), each only where the audio had a clean pause on both sides. False-start cuts carry a purple CUT RETAKE marker; every removal is listed in \`takes.json\` and on its join in \`joins.json\`, and every clip has handles, so dragging an edit point restores it.`, '');
  L.push(`Markers ride on the A-roll clips (so they move with the material). RETAKE? = the same 3+ words said twice within ${'15'} s that could be a deliberate repeat, keep the better take. CHECK JOIN = an automated check was unsure, listen to that seam. FILLER / STUTTER = one that could not be cut cleanly (no pause around it). Full per-join data is in \`joins.json\`.`, '');
  L.push(`| Timeline TC | Marker | Note |`, `|---|---|---|`);
  for (const m of [...markers].sort((a, b) => a.at - b.at)) L.push(`| ${tc(m.at)} | ${m.kind === 'chapter' ? 'CHAPTER: ' : ''}${m.name.replace(/\|/g, '/')} | ${(m.note || '').replace(/\|/g, '/').slice(0, 160)} |`);
  L.push('', `Honesty note: the joins were placed from the waveform and word timings only. Nobody has listened to them. Play the timeline through once at normal speed before trusting it.`);
  return L.join('\n') + '\n';
}

main().catch((e) => { console.error('[build] ERROR', e.stack || e.message); process.exit(1); });
