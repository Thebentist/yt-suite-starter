#!/usr/bin/env node
/* Learn an editing style from a reference video (measure it, then LOOK at it).
 *
 *   node pipeline/style/learn.mjs --url <youtube url> --name <style> [--start 0] [--end 600] [--every 8] [--keep]
 *   node pipeline/style/learn.mjs --file <video> --name <style> [...]
 *   node pipeline/style/learn.mjs --url <url> --video <video-only file> --audio <audio file> --name <style>   (skip the download)
 *   options: --cut-threshold 0.12 (scene score for a cut)  --sheet-width 320  --cols 6 --rows 5
 *
 * --url downloads with tools/yt-dlp.exe into styles/<name>/src/: 480p video-only (H.264 preferred) and the audio stream
 * separately (yt-dlp cannot merge here: it finds no ffmpeg). src/ is deleted afterwards unless --keep. If YouTube answers
 * "Sign in to confirm you're not a bot" / HTTP 429 (it rate-limits repeated downloads), wait and retry, or pass streams you
 * already have with --video/--audio. This tool never passes browser cookies.
 *
 * Measures (ffmpeg only, over --start..--end):
 *   shots     scene-change score per frame (select=scene); a cut = an isolated spike >= --cut-threshold and >= 4x the local
 *             median. Cuts/min overall and in the first 60 s, mean/median/p10/p90 shot length, a length histogram.
 *             Punch-ins and b-roll register as cuts; a jump cut with no zoom and no movement may not (score too small).
 *   speech    10 ms RMS envelope, adaptive threshold; pauses = silent runs >= 0.1 s between speech: median, p75, p90, per minute.
 *   loudness  ebur128: integrated LUFS, LRA, true peak.
 *   music bed "likely" when the pauses are not silent (floor above -50 dBFS) and fluctuate (std > 2.5 dB), i.e. something
 *             musical fills the gaps. A heuristic, not a detector: confirm by listening.
 *   sheets    first 60 s at 1 fps and the whole range at 1 frame / N s, tiled 6x5 at 320 px, timestamps burned in;
 *             plus cut-check sheets (frame before | frame after) for the first detected cuts so the detector can be judged.
 * Writes styles/<name>/style.json (measured numbers + the edit parameters build-timeline.mjs consumes) and style.md
 * (numbers + an empty "Visual notes" section Claude fills after reading the sheets with the Read tool).
 *
 * style.json fields
 *   name, version, learnedFrom {url|file, title, channel, uploadDate, start, end, analysedSeconds}
 *   measured.shots   {cuts, cutsPerMin, cutsPerMinFirst60, meanShotSec, medianShotSec, p10ShotSec, p90ShotSec, histogram, threshold, sensitivity}
 *   measured.speech  {pauseCount, pausesPerMin, pauseMedianSec, pauseP75Sec, pauseP90Sec, silentShare, floorDb, speechDb, thresholdDb}
 *   measured.loudness {integratedLufs, lraLu, truePeakDbtp}
 *   measured.musicBed {likely, pauseLevelDb, pauseStdDb, speechDb, relativeDb}
 *   edit.pause       {keepBetweenSentences, maxBetweenSentences, keepInSentence, maxInSentence}   (seconds; from the pause stats)
 *   edit.punchIn     {enabled, scale, every, maxHoldSec, minSegmentSec}  (hold/min from shot lengths; scale is a default until
 *                    someone looks at the sheets)
 *   edit.cutRate     {targetCutsPerMin}   framing changes per minute build-timeline aims for (lowered when b-roll drives the rate)
 *   edit.music       {gainDb}             bed level under the voice
 *   edit.deliver     {loudnessLufs, truePeakDbtp}
 *   sheets           paths of the PNGs, with the time of every tile documented in style.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, runFF, probeMedia, audioEnvelope, levelStats, silentRuns, percentile, parseArgs, drawtextFont } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const args = parseArgs(process.argv.slice(2));
if (!args.name || (!args.url && !args.file)) { console.error('usage: --url <youtube url> [--video v.mp4 --audio a.m4a] | --file <video>  --name <style> [--start s] [--end s] [--every N] [--keep]'); process.exit(1); }
const name = String(args.name).replace(/[^\w.-]/g, '-');
const DIR = path.join(ROOT, 'styles', name); const SRC = path.join(DIR, 'src'); const SHEETS = path.join(DIR, 'sheets');
fs.mkdirSync(SRC, { recursive: true }); fs.mkdirSync(SHEETS, { recursive: true });
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(2));
const hms = (s) => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function ytdlp(argv) {
  const exe = process.env.YTDLP || path.join(ROOT, 'tools', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  const r = spawnSync(exe, ['--js-runtimes', 'node', ...argv], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`yt-dlp failed: ${(r.stderr || r.stdout || '').slice(-1500)}`);
  return r.stdout;
}

async function fetchSource() {
  if (args.file) { const f = path.resolve(ROOT, args.file); return { video: f, audio: f, meta: { file: rel(f), title: path.basename(f) } }; }
  const url = String(args.url);
  if (args.video) {
    // already-downloaded streams (e.g. a previous yt-dlp run, or when YouTube rate-limits): measure those, label with the URL
    const v = path.resolve(ROOT, args.video), a = path.resolve(ROOT, args.audio || args.video);
    let meta = { url, note: 'streams supplied with --video/--audio' };
    try { const j = JSON.parse(ytdlp(['--no-playlist', '-J', url])); meta = { ...meta, title: j.title, channel: j.channel || j.uploader, uploadDate: j.upload_date && String(j.upload_date).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'), duration: j.duration, id: j.id }; } catch { /* metadata is optional */ }
    return { video: v, audio: a, meta, supplied: true };
  }
  const find = (stem) => fs.readdirSync(SRC).find((f) => f.startsWith(stem + '.') && !f.endsWith('.part') && !f.endsWith('.json'));
  let meta = {};
  try { const j = JSON.parse(ytdlp(['--no-playlist', '-J', url])); meta = { url, title: j.title, channel: j.channel || j.uploader, uploadDate: j.upload_date && String(j.upload_date).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'), duration: j.duration, id: j.id }; }
  catch (e) { meta = { url }; console.warn('[learn] could not read metadata:', e.message.split('\n')[0]); }
  // YouTube sometimes answers 403 on the separate video/audio streams of a video (2 of 5 references, 2026-09-28) while
  // the old muxed 360p MP4 (format 18) still downloads: fall back to it ONCE for both (360p is enough for cuts/sheets)
  const muxed = () => { if (!find('muxed')) { console.log('[learn] 403 on the separate streams; trying the muxed 360p MP4 (format 18) once...'); ytdlp(['--no-playlist', '-f', '18', '-o', path.join(SRC, 'muxed.%(ext)s'), url]); } return path.join(SRC, find('muxed')); };
  let fallback = null;
  if (!find('video')) {
    console.log('[learn] downloading 480p video-only...');
    try { ytdlp(['--no-playlist', '-f', 'bv*[height<=480][vcodec^=avc1]/bv*[height<=480]', '-o', path.join(SRC, 'video.%(ext)s'), url]); }
    catch (e) { if (!/403/.test(e.message)) throw e; fallback = muxed(); }
  }
  if (fallback) { meta.note = 'muxed 360p MP4 (format 18) after a 403 on the separate streams'; return { video: fallback, audio: fallback, meta }; }
  if (!find('audio')) {
    console.log('[learn] downloading audio...');
    try { ytdlp(['--no-playlist', '-f', 'ba[ext=m4a]/ba', '-o', path.join(SRC, 'audio.%(ext)s'), url]); }
    catch (e) { if (!/403/.test(e.message)) throw e; const m = muxed(); return { video: path.join(SRC, find('video')), audio: m, meta }; }
  }
  return { video: path.join(SRC, find('video')), audio: path.join(SRC, find('audio')), meta };
}

// ---------------------------------------------------------------- shots ----------------------------------------------
async function sceneScores(video, start, end) {
  const a = ['-hide_banner', '-loglevel', 'info'];
  if (start) a.push('-ss', String(start));
  if (end != null) a.push('-to', String(end));
  a.push('-i', video, '-an', '-vf', "scale=240:-2,select='gte(scene,0)',metadata=print:key=lavfi.scene_score", '-f', 'null', '-');
  const log = await runFF(a);
  const out = []; let cur = null;
  for (const line of log.split(/\r?\n/)) {
    const f = /frame:\s*(\d+)\s+pts:\s*\S+\s+pts_time:\s*([\d.]+)/.exec(line);
    if (f) { cur = { n: +f[1], t: +f[2] }; continue; }
    const s = /lavfi\.scene_score=([\d.]+)/.exec(line);
    if (s && cur) { out.push({ ...cur, s: +s[1] }); cur = null; }
  }
  return out;
}
function detectCuts(scores, threshold, minGap = 0.25) {
  const cuts = [];
  for (let i = 1; i < scores.length; i++) {
    const s = scores[i].s; if (s < threshold) continue;
    const nb = []; for (let k = Math.max(0, i - 15); k <= Math.min(scores.length - 1, i + 15); k++) if (Math.abs(k - i) > 1) nb.push(scores[k].s);
    nb.sort((x, y) => x - y);
    const med = nb.length ? nb[Math.floor(nb.length / 2)] : 0;
    if (s < 4 * med) continue;             // sustained motion, not a cut
    if (s < scores[i - 1].s || (scores[i + 1] && s < scores[i + 1].s)) continue; // local peak only
    if (cuts.length && scores[i].t - cuts.at(-1).t < minGap) continue;
    cuts.push({ t: scores[i].t, n: scores[i].n, s: +s.toFixed(3) });
  }
  return cuts;
}

// ---------------------------------------------------------------- loudness -------------------------------------------
async function loudness(file, start, end) {
  const a = ['-hide_banner', '-nostats'];
  if (start) a.push('-ss', String(start));
  if (end != null) a.push('-to', String(end));
  a.push('-i', file, '-vn', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-');
  const log = await runFF(a);
  const sum = log.slice(log.lastIndexOf('Summary:'));
  const num = (re) => { const m = re.exec(sum); return m ? +m[1] : null; };
  return { integratedLufs: num(/I:\s*(-?[\d.]+)\s*LUFS/), lraLu: num(/LRA:\s*(-?[\d.]+)\s*LU/), truePeakDbtp: num(/Peak:\s*(-?[\d.]+)\s*dBFS/) };
}

// ---------------------------------------------------------------- sheets ---------------------------------------------
async function sheet(video, { start, dur, every, prefix, cols, rows, width, label }) {
  const font = drawtextFont();
  const dt = font ? `,drawtext=${font}:text='%{pts\\:hms\\:${start.toFixed(3)}}':fontsize=${Math.round(width / 12)}:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=4:x=6:y=6` : '';
  // pick the first frame at or after each step and stamp THAT frame's own time. (fps=1/N:round=down stamped the bucket
  // start on a frame from the end of the bucket: tiles showed label + ~1 s on 1 fps sheets and label + ~11 s on
  // overview sheets, found by a subagent against the exact cut sheets, 2026-09-28.)
  const vf = `select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,${(every - 0.001).toFixed(3)})',scale=${width}:-2${dt},tile=${cols}x${rows}:padding=4:margin=4:color=0x202020`;
  await runFF(['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(start), '-t', String(dur), '-i', video, '-an', '-vf', vf, '-fps_mode', 'vfr', path.join(SHEETS, `${prefix}-%02d.png`)]);
  const files = fs.readdirSync(SHEETS).filter((f) => f.startsWith(prefix + '-')).sort().map((f) => path.join(SHEETS, f));
  const per = cols * rows;
  return files.map((f, i) => ({ file: rel(f), label, from: +(start + i * per * every).toFixed(2), to: +Math.min(start + dur, start + (i + 1) * per * every).toFixed(2), every }));
}
async function cutSheet(video, start, cuts, { width, cols }) {
  if (!cuts.length) return [];
  const font = drawtextFont();
  const pick = cuts.slice(0, 24);
  const frames = pick.flatMap((c) => [Math.max(0, c.n - 3), c.n + 2]);
  const expr = frames.map((n) => `eq(n\\,${n})`).join('+');
  const dt = font ? `,drawtext=${font}:text='%{pts\\:hms\\:${start.toFixed(3)}}':fontsize=${Math.round(width / 12)}:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=4:x=6:y=6` : '';
  const rows = Math.ceil(Math.min(frames.length, 24) / cols);
  await runFF(['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(start), '-i', video, '-an', '-vf', `select='${expr}',scale=${width}:-2${dt},tile=${cols}x${rows}:padding=4:margin=4:color=0x202020`, '-fps_mode', 'vfr', path.join(SHEETS, 'cuts-%02d.png')]);
  return fs.readdirSync(SHEETS).filter((f) => f.startsWith('cuts-')).sort().map((f, i) => ({ file: rel(path.join(SHEETS, f)), label: `cut check ${i * 12 + 1}-${Math.min(pick.length, (i + 1) * 12)}: each pair = 0.1 s before | 0.07 s after a detected cut`, cuts: pick.slice(i * 12, (i + 1) * 12).map((c) => r2(c.t + start)) }));
}

// ---------------------------------------------------------------- main -----------------------------------------------
async function main() {
  const src = await fetchSource();
  const pv = probeMedia(src.video);
  const full = src.meta.duration || pv.duration;
  const start = Number(args.start || 0);
  const end = args.end != null ? Math.min(Number(args.end), full) : full;
  const dur = end - start;
  if (!(dur > 5)) throw new Error(`nothing to analyse (start ${start}, end ${end})`);
  console.log(`[learn] ${src.meta.title || rel(src.video)}: ${pv.width}x${pv.height} ${pv.codec}, analysing ${hms(start)}-${hms(end)} (${dur.toFixed(0)} s)`);
  for (const f of fs.readdirSync(SHEETS)) fs.rmSync(path.join(SHEETS, f));

  // shots
  const scores = await sceneScores(src.video, start, end);
  const thr = Number(args['cut-threshold'] || 0.12);
  const cuts = detectCuts(scores, thr);
  const bounds = [0, ...cuts.map((c) => c.t), dur];
  const shots = bounds.slice(1).map((b, i) => b - bounds[i]).filter((x) => x > 0.04).sort((a, b) => a - b);
  const hist = { '<1s': 0, '1-2s': 0, '2-4s': 0, '4-8s': 0, '8-15s': 0, '15s+': 0 };
  for (const s of shots) hist[s < 1 ? '<1s' : s < 2 ? '1-2s' : s < 4 ? '2-4s' : s < 8 ? '4-8s' : s < 15 ? '8-15s' : '15s+']++;
  const sensitivity = Object.fromEntries([0.08, 0.12, 0.2, 0.3, 0.4].map((t) => [t, detectCuts(scores, t).length]));
  const shotStats = {
    cuts: cuts.length, cutsPerMin: r2(cuts.length / (dur / 60)), cutsPerMinFirst60: r2(cuts.filter((c) => c.t < 60).length / (Math.min(60, dur) / 60)),
    meanShotSec: r2(shots.reduce((a, b) => a + b, 0) / Math.max(1, shots.length)), medianShotSec: r2(percentile(shots, 0.5)),
    p10ShotSec: r2(percentile(shots, 0.1)), p75ShotSec: r2(percentile(shots, 0.75)), p90ShotSec: r2(percentile(shots, 0.9)), histogram: hist, threshold: thr, sensitivity,
  };
  console.log(`[learn] ${cuts.length} cuts (${shotStats.cutsPerMin}/min; first 60 s ${shotStats.cutsPerMinFirst60}/min), median shot ${shotStats.medianShotSec}s`);

  // speech + music bed
  const env = await audioEnvelope(src.audio, { start, end });
  const lv = levelStats(env.db);
  const runs = silentRuns(env, lv.threshold, { minSilence: 0.1 });
  const inner = runs.filter((r) => r.s > 0.05 && r.e < dur - 0.05);
  const pauses = inner.map((r) => r.e - r.s).sort((a, b) => a - b);
  const silentSec = runs.reduce((a, r) => a + r.e - r.s, 0);
  const pauseVals = []; for (const r of inner) for (let i = Math.floor(r.s / env.win); i < Math.floor(r.e / env.win); i++) pauseVals.push(env.db[i]);
  pauseVals.sort((a, b) => a - b);
  const pauseLevel = pauseVals.length ? percentile(pauseVals, 0.5) : lv.floor;
  const mean = pauseVals.reduce((a, b) => a + b, 0) / Math.max(1, pauseVals.length);
  const std = Math.sqrt(pauseVals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, pauseVals.length));
  const speech = { pauseCount: pauses.length, pausesPerMin: r2(pauses.length / (dur / 60)), pauseMedianSec: r2(percentile(pauses, 0.5)), pauseP75Sec: r2(percentile(pauses, 0.75)), pauseP90Sec: r2(percentile(pauses, 0.9)), silentShare: r2(silentSec / dur), floorDb: lv.floor, speechDb: lv.speech, thresholdDb: lv.threshold };
  const musicBed = { likely: pauseLevel > -50 && std > 2.5, pauseLevelDb: r2(pauseLevel), pauseStdDb: r2(std), speechDb: lv.speech, relativeDb: r2(pauseLevel - lv.speech) };
  const loud = await loudness(src.audio, start, end);
  console.log(`[learn] pauses median ${speech.pauseMedianSec}s p90 ${speech.pauseP90Sec}s (${speech.pausesPerMin}/min); loudness ${loud.integratedLufs} LUFS; music bed likely: ${musicBed.likely}`);

  // what the editor did with fillers and stutters: transcribe the reference (two passes, so fillers are written down)
  // and count what is LEFT in. Ben's published edits had 0 "um"s in 3.6 min against 1.3/min in his raw.
  let takes = null;
  const transcriber = path.join(ROOT, 'pipeline', 'edit', 'transcribe.mjs');
  if (!args['no-transcribe'] && fs.existsSync(path.join(ROOT, 'tools', 'ggml-small.en.bin'))) {
    const prefix = path.join(DIR, 'ref-transcript');
    const tr = spawnSync(process.execPath, [transcriber, '--in', src.audio, '--out', prefix, '--edit'], { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (tr.status === 0) {
      const W = JSON.parse(fs.readFileSync(prefix + '.words.json', 'utf8')).filter((w) => w.t >= start && w.t < end);
      const n = (w) => String(w.w).toLowerCase().replace(/[^a-z']/g, '');
      const fillers = W.filter((w) => /^(um+|uh+|uhm+|er+m?|ah+)$/.test(n(w))).length;
      const EMPH = new Set(['really', 'very', 'so', 'no', 'yeah', 'yes', 'much', 'more', 'way', 'too', 'many', 'go', 'bye', 'ha', 'oh', 'please', 'never', 'super', 'okay', 'right']);
      let doubles = 0; for (let i = 1; i < W.length; i++) if (n(W[i]) && n(W[i]) === n(W[i - 1]) && !EMPH.has(n(W[i])) && !/[,.;:!?]$/.test(W[i - 1].w)) doubles++;
      const mins = dur / 60;
      takes = { wordsPerMin: r2(W.length / mins), fillersLeftPerMin: r2(fillers / mins), stuttersLeftPerMin: r2(doubles / mins), words: W.length, fillers, stutters: doubles };
      console.log(`[learn] speech: ${takes.wordsPerMin} words/min; left in by the editor: ${takes.fillersLeftPerMin} fillers/min, ${takes.stuttersLeftPerMin} stutters/min`);
      for (const f of ['.srt', '.json', '.prompted.json', '.plain.words.json']) fs.rmSync(prefix + f, { force: true });
    } else console.warn(`[learn] transcription skipped: ${(tr.stderr || tr.stdout || '').slice(-300)}`);
  }

  // sheets
  const W = Number(args['sheet-width'] || 320), cols = Number(args.cols || 6), rows = Number(args.rows || 5);
  const every = Number(args.every || Math.max(2, Math.ceil(dur / 90)));
  const sheets = [
    ...(await sheet(src.video, { start, dur: Math.min(60, dur), every: 1, prefix: 'first60', cols, rows, width: W, label: 'first 60 s at 1 fps' })),
    ...(await sheet(src.video, { start, dur, every, prefix: 'overview', cols, rows, width: W, label: `whole range at 1 frame / ${every} s` })),
    ...(await cutSheet(src.video, start, cuts, { width: W, cols })),
  ];

  // derived edit parameters (build-timeline consumes style.edit)
  const pm = speech.pauseMedianSec ?? 0.2, p90 = speech.pauseP90Sec ?? 0.5;
  const keepB = clamp(pm, 0.08, 0.45), keepI = clamp(Math.max(pm * 1.5, pm + 0.1), keepB, Math.max(keepB, Math.min(p90, 0.7)));
  const style = {
    name, version: 1,
    learnedFrom: { ...src.meta, start, end: r2(end), analysedSeconds: r2(dur) },
    measured: { durationSec: r2(dur), video: { width: pv.width, height: pv.height, fps: pv.fpsFloat && r2(pv.fpsFloat) }, shots: shotStats, speech: { ...speech, ...(takes || {}) }, loudness: loud, musicBed },
    edit: {
      // an editor who leaves almost none in cuts them (<= 0.3/min left); otherwise they are kept and only marked
      ...(takes ? { takes: { fillers: takes.fillersLeftPerMin <= 0.3 ? 'cut' : 'mark', stutters: takes.stuttersLeftPerMin <= 0.3 ? 'cut' : 'mark', retakes: 'cut' } } : {}),
      pause: { keepBetweenSentences: r2(keepB), maxBetweenSentences: r2(keepB + 0.12), keepInSentence: r2(keepI), maxInSentence: r2(keepI + 0.15) },
      punchIn: { enabled: true, scale: 1.12, every: 2, maxHoldSec: r2(clamp(shotStats.p75ShotSec ?? 8, 4, 20)), minSegmentSec: r2(clamp(shotStats.p10ShotSec ?? 1, 0.8, 2)) },
      cutRate: { targetCutsPerMin: r2(clamp(shotStats.cutsPerMin ?? 6, 2, 30)), targetCutsPerMinFirst60: r2(clamp(shotStats.cutsPerMinFirst60 ?? shotStats.cutsPerMin ?? 6, 2, 40)) },
      music: { gainDb: musicBed.likely ? r2(clamp(musicBed.relativeDb, -30, -12)) : -22 },
      deliver: { loudnessLufs: loud.integratedLufs, truePeakDbtp: loud.truePeakDbtp },
    },
    sheets: sheets.map((s) => s.file),
  };
  // a re-run keeps what a human/Claude decided after LOOKING: adjustedAfterLooking edits and filled Visual notes
  const jsonPath = path.join(DIR, 'style.json'), mdPath = path.join(DIR, 'style.md');
  let keptNotes = null;
  if (fs.existsSync(jsonPath)) {
    const old = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (old.adjustedAfterLooking?.changes) {
      for (const [k, v] of Object.entries(old.adjustedAfterLooking.changes)) {
        const keys = k.split('.'); let o = style; while (keys.length > 1) o = o[keys.shift()] ??= {}; o[keys[0]] = Array.isArray(v) ? v[1] : v;
      }
      style.adjustedAfterLooking = { ...old.adjustedAfterLooking, reappliedOnRerun: true };
      console.log(`[learn] re-applied the after-looking adjustments: ${Object.keys(old.adjustedAfterLooking.changes).join(', ')}`);
    }
  }
  if (fs.existsSync(mdPath)) {
    const m = /## Visual notes\n([\s\S]*)$/.exec(fs.readFileSync(mdPath, 'utf8'));
    if (m && !m[1].includes('_Fill after LOOKING')) keptNotes = m[1].trim().replace(/^_Kept from the previous run[^\n]*\n+/, '');
  }
  fs.writeFileSync(jsonPath, JSON.stringify(style, null, 2) + '\n');
  let md = styleMd(style, sheets, cuts, start);
  if (keptNotes) md = md.replace(/## Visual notes\n[\s\S]*$/, `## Visual notes\n\n_Kept from the previous run: re-check against the new sheets._\n\n${keptNotes}\n`);
  fs.writeFileSync(mdPath, md);
  if (!args.keep && args.url && !src.supplied) fs.rmSync(SRC, { recursive: true, force: true });
  console.log(`[learn] wrote ${rel(path.join(DIR, 'style.json'))}, style.md and ${sheets.length} sheets in ${rel(SHEETS)}${args.keep || !args.url || src.supplied ? '' : ' (downloaded source deleted; --keep keeps it)'}`);
  console.log('[learn] next: Read every sheet PNG, then fill the "Visual notes" section of style.md and adjust style.json edit.* if what you see disagrees with the numbers.');
  console.log(JSON.stringify({ style: rel(path.join(DIR, 'style.json')), cutsPerMin: shotStats.cutsPerMin, medianShotSec: shotStats.medianShotSec, pauseMedianSec: speech.pauseMedianSec, lufs: loud.integratedLufs, musicBedLikely: musicBed.likely, sheets: sheets.length }));
}

function styleMd(s, sheets, cuts, start) {
  const m = s.measured, L = [];
  L.push(`# Editing style: ${s.name}`, '');
  L.push(`Learned from ${s.learnedFrom.url ? `[${s.learnedFrom.title || s.learnedFrom.url}](${s.learnedFrom.url})` : '`' + s.learnedFrom.file + '`'}${s.learnedFrom.channel ? ` (${s.learnedFrom.channel}${s.learnedFrom.uploadDate ? ', ' + s.learnedFrom.uploadDate : ''})` : ''}, analysed ${hms(s.learnedFrom.start)}-${hms(s.learnedFrom.end)} (${Math.round(m.durationSec)} s) by \`pipeline/style/learn.mjs\`. Use it with \`node pipeline/resolve/build-timeline.mjs --slug <slug> --style styles/${s.name}/style.json\`.`, '');
  L.push(`## Measured`, '');
  L.push(`| What | Value |`, `|---|---|`);
  L.push(`| Cuts detected (scene score >= ${m.shots.threshold}, isolated spikes) | ${m.shots.cuts} |`);
  L.push(`| Cuts per minute, overall | ${m.shots.cutsPerMin} |`);
  L.push(`| Cuts per minute, first 60 s | ${m.shots.cutsPerMinFirst60} |`);
  L.push(`| Shot length mean / median | ${m.shots.meanShotSec} s / ${m.shots.medianShotSec} s |`);
  L.push(`| Shot length p10 / p75 / p90 | ${m.shots.p10ShotSec} s / ${m.shots.p75ShotSec} s / ${m.shots.p90ShotSec} s |`);
  L.push(`| Shot length histogram | ${Object.entries(m.shots.histogram).map(([k, v]) => `${k}: ${v}`).join(', ')} |`);
  L.push(`| Detector sensitivity (cuts at score threshold) | ${Object.entries(m.shots.sensitivity).map(([k, v]) => `${k}: ${v}`).join(', ')} |`);
  L.push(`| Speech pauses kept (>= 0.1 s) | ${m.speech.pauseCount} (${m.speech.pausesPerMin}/min) |`);
  L.push(`| Pause median / p75 / p90 | ${m.speech.pauseMedianSec} s / ${m.speech.pauseP75Sec} s / ${m.speech.pauseP90Sec} s |`);
  L.push(`| Share of time below the speech threshold | ${Math.round((m.speech.silentShare || 0) * 100)}% |`);
  L.push(`| Audio floor / speech level / threshold | ${m.speech.floorDb} / ${m.speech.speechDb} / ${m.speech.thresholdDb} dBFS |`);
  L.push(`| Integrated loudness / LRA / true peak | ${m.loudness.integratedLufs} LUFS / ${m.loudness.lraLu} LU / ${m.loudness.truePeakDbtp} dBTP |`);
  L.push(`| Music bed likely (pauses not silent and fluctuating) | ${m.musicBed.likely ? 'yes' : 'no'} (pause level ${m.musicBed.pauseLevelDb} dBFS, std ${m.musicBed.pauseStdDb} dB, ${m.musicBed.relativeDb} dB under speech) |`);
  L.push('');
  L.push(`## Edit parameters derived (style.json \`edit\`)`, '');
  L.push(`- Pauses: between sentences keep ${s.edit.pause.keepBetweenSentences} s (cut anything over ${s.edit.pause.maxBetweenSentences} s); inside a sentence keep ${s.edit.pause.keepInSentence} s (cut over ${s.edit.pause.maxInSentence} s). From the median/p90 pause the editor left in.`);
  L.push(`- Punch-ins: ${s.edit.punchIn.scale}x on every ${s.edit.punchIn.every === 2 ? 'other' : s.edit.punchIn.every + 'th'} segment, hold one framing at most ${s.edit.punchIn.maxHoldSec} s (p75 shot), no piece shorter than ${s.edit.punchIn.minSegmentSec} s (p10 shot). ${s.adjustedAfterLooking?.changes?.['edit.punchIn.scale'] ? 'Scale set after looking at the sheets (see Visual notes).' : 'The scale is a default until the sheets are read.'}`);
  L.push(`- Cut rate target: ${s.edit.cutRate.targetCutsPerMin} framing changes per minute (${s.adjustedAfterLooking?.changes?.['edit.cutRate.targetCutsPerMin'] ? `set after looking; all detected cuts give ${s.measured.shots.cutsPerMin}` : 'all detected cuts; lower it if b-roll/graphics drive most of them, since the rough cut only makes jump cuts and punch-ins'}).`);
  L.push(`- Music bed: ${s.edit.music.gainDb} dB clip gain. Deliver at ${s.edit.deliver.loudnessLufs} LUFS integrated, true peak ${s.edit.deliver.truePeakDbtp} dBTP.`, '');
  L.push(`## Sheets (Read these)`, '');
  for (const sh of sheets) L.push(`- \`${sh.file}\`: ${sh.label}${sh.from != null ? `, ${hms(sh.from)}-${hms(sh.to)} (tile k = ${hms(sh.from)} + k x ${sh.every} s, left to right, top to bottom)` : ''}${sh.cuts ? ` at ${sh.cuts.map(hms).join(', ')}` : ''}`);
  L.push('', `Every tile has its source timestamp burned in (top-left).`, '');
  L.push(`## Visual notes`, '');
  L.push(`_Fill after LOOKING at the sheets. Answer each; say "can't tell" rather than guess._`, '');
  for (const q of ['Framing (wide/medium/close, headroom, where the eyes sit, background):', 'Punch-ins / zooms (used? how tight? how often? on jump cuts or mid-sentence?):', 'Captions / on-screen text (burned-in captions? keyword pop-ups? font, colour, position):', 'B-roll / cutaways share (roughly what % of tiles are not the talking head? what kind: clips, screenshots, stock, animation):', 'Graphics (lower thirds, arrows, circles, emoji, progress bars, chapter cards):', 'Colour and look (warm/cool, contrast, saturation, skin tone, lighting):', 'Transitions (hard cuts only? whooshes, zoom transitions, flashes):', 'Open (what happens in the first 10 s visually):', 'What to copy in the rough cut, and what the rough cut cannot do (left for Resolve / motion-designer):']) L.push(`- **${q}** `);
  L.push('');
  return L.join('\n') + '\n';
}

main().catch((e) => { console.error('[learn] ERROR', e.stack || e.message); process.exit(1); });
void FFMPEG;
