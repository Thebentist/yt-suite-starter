#!/usr/bin/env node
/* Showreel assembler: turns the rough dialogue cut (build-timeline's out/timeline-spec.json) plus the paper edit's
 * special inserts, the visual plan's scenes, per-segment framing, music and SFX stems into the final timeline spec and
 * FCPXML for Resolve.
 *
 *   node pipeline/edit/assemble.mjs --slug bad-breath-for-good [--stage map|full] [--name "..."]
 *
 * --stage map   final A-roll (with inserts) -> edit/cut-words.json (every kept word's timeline time) and edit/beats.json
 * --stage full  + overlays from edit/visual-plan.json (rendered files), framing from edit/framing.json, audio stems
 *               from edit/audio.json -> out/final-spec.json + out/final.fcpxml (+ the Resolve MCP scripts)
 *
 * Inserts (paper-edit.json keep[] with "special"):
 *   tiktok-watch  raw [a, b] placed first, muted (the TikTok's own audio plays from edit/audio.json)
 *   wrist-wait    the silence after "I'll wait." (continuous with the piece before it), plus `extend` seconds of a
 *                 silent stretch elsewhere (hidden under the full-screen countdown)
 * Anchors used by the visual plan: { word: <raw word index>, offset: <s> } or { beat: "<beat>", at: "start|end" }.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
if (!args.slug) { console.error('usage: --slug <slug> [--stage map|full]'); process.exit(1); }
const VD = path.join(ROOT, 'videos', args.slug);
const rd = (p) => JSON.parse(fs.readFileSync(path.join(VD, p), 'utf8'));
const spec = rd('out/timeline-spec.json');
// the A-roll comes from out/timeline-spec.json, which build-timeline makes from the paper edit (via keep-to-cuts):
// a paper-edit change is invisible until both are re-run (v4b: a restored line silently didn't play)
{
  const pe = path.join(VD, 'edit', 'paper-edit.json'), ts = path.join(VD, 'out', 'timeline-spec.json');
  if (fs.existsSync(pe) && fs.statSync(pe).mtimeMs > fs.statSync(ts).mtimeMs + 1000 && !args['allow-stale-spec']) {
    console.error(`paper-edit.json is newer than out/timeline-spec.json. Run:\n  node pipeline/edit/keep-to-cuts.mjs --paper ${path.relative(ROOT, pe)} --words ${path.relative(ROOT, path.join(VD, 'raw', 'transcript.words.json'))}\n  node pipeline/resolve/build-timeline.mjs --slug ${args.slug} --style <style.json> --anchor <x%,y%> --no-music --no-overlays --name "${spec.name}"\n(or pass --allow-stale-spec)`);
    process.exit(1);
  }
}
const words = rd('raw/transcript.words.json');
const paper = rd('edit/paper-edit.json');
const fps = typeof spec.fps === 'object' ? spec.fps.num / spec.fps.den : Number(String(spec.fps).split('/')[0]) / Number(String(spec.fps).split('/')[1] || 1);
const F = (s) => Math.round(s * fps);                  // seconds -> frame
const r3 = (x) => Math.round(x * 1000) / 1000;

// ------------------------------------------------------------------ 1. final A-roll with inserts
let pieces = spec.aroll.map((p) => ({ ...p, kind: 'dialogue' }));

// Edge fixes found by listening (pipeline/edit/listen-check.mjs + snippet-listen.mjs): edit/fixes.json
//   edges:  { near, edge: 'in'|'out', valley: [a, b] | to, why }   move the dialogue piece edge closest to `near` (raw s)
//           to the quietest 30 ms inside [a, b] of the raw audio (or to `to`)
//   remove: { raw: [a, b], why }                                     cut a raw stretch out of whatever piece holds it
const fixesPath = path.join(VD, 'edit', 'fixes.json');
const fixLog = [];
if (fs.existsSync(fixesPath)) {
  const fixes = JSON.parse(fs.readFileSync(fixesPath, 'utf8'));
  const pcmPath = path.join(VD, 'work', 'take16k.s16');
  const pcm = fs.existsSync(pcmPath) ? (() => { const b = fs.readFileSync(pcmPath); return new Int16Array(b.buffer, b.byteOffset, b.length >> 1); })() : null;
  const valley = ([a, b]) => {
    if (!pcm) return (a + b) / 2;
    const R = 16000, win = Math.round(0.03 * R), hop = Math.round(0.005 * R); let best = a, bestE = Infinity;
    for (let s = Math.floor(a * R); s + win <= Math.floor(b * R); s += hop) { let e = 0; for (let i = s; i < s + win; i++) e += pcm[i] * pcm[i]; if (e < bestE) { bestE = e; best = (s + win / 2) / R; } }
    return best;
  };
  const snap = (x) => F(x) / fps;
  for (const f of fixes.edges || []) {
    const cands = pieces.map((p, k) => ({ k, d: Math.abs((f.edge === 'in' ? p.in : p.out) - f.near) })).sort((x, y) => x.d - y.d);
    if (!cands.length || cands[0].d > 1.5) { fixLog.push({ ...f, applied: false, why2: 'no edge near' }); continue; }
    const p = pieces[cands[0].k], to = snap(f.to != null ? f.to : valley(f.valley)), from = f.edge === 'in' ? p.in : p.out;
    if (f.edge === 'in') { p.in = +to.toFixed(6); p.inFrame = F(to); } else { p.out = +to.toFixed(6); p.outFrame = F(to); }
    fixLog.push({ near: f.near, edge: f.edge, from: +from.toFixed(3), to: +to.toFixed(3), why: f.why });
  }
  for (const f of fixes.remove || []) {
    // snap: move each boundary to the quietest 30 ms within +-snap s (cuts inside running speech land between words)
    let [a, b] = f.raw; const next = [];
    if (f.snap) { a = valley([a - f.snap, a + f.snap]); b = valley([b - f.snap, b + f.snap]); }
    for (const p of pieces) {
      if (b <= p.in || a >= p.out) { next.push(p); continue; }
      if (a > p.in) next.push({ ...p, out: +snap(a).toFixed(6), outFrame: F(a) });
      if (b < p.out) next.push({ ...p, in: +snap(b).toFixed(6), inFrame: F(b) });
    }
    pieces = next; fixLog.push({ remove: [+a.toFixed(3), +b.toFixed(3)], why: f.why });
  }
  //   keep: { raw: [a, b], why }   make sure a raw stretch plays: extend the piece it touches (within 0.6 s), or add it
  for (const f of fixes.keep || []) {
    const [a, b] = f.raw;
    const before = pieces.find((p) => p.kind === 'dialogue' && p.out >= a - 0.6 && p.out <= b + 0.01 && p.in < a);
    const after = pieces.find((p) => p.kind === 'dialogue' && p.in <= b + 0.6 && p.in >= a - 0.01 && p.out > b);
    if (after) { after.in = +snap(Math.min(after.in, a)).toFixed(6); after.inFrame = F(after.in); }
    else if (before) { before.out = +snap(Math.max(before.out, b)).toFixed(6); before.outFrame = F(before.out); }
    else {
      const k = pieces.findIndex((p) => p.in > a);
      const np = { media: 'raw', in: +snap(a).toFixed(6), out: +snap(b).toFixed(6), inFrame: F(a), outFrame: F(b), name: 'take.mp4', kind: 'dialogue' };
      pieces.splice(k < 0 ? pieces.length : k, 0, np);
    }
    fixLog.push({ keep: f.raw, how: after ? 'extended next piece' : before ? 'extended previous piece' : 'added', why: f.why });
  }
  pieces = pieces.filter((p) => p.outFrame - p.inFrame >= 2);
}

// Tighten (edit/tighten.json; Ben 2026-09-28: "cut as much dead space before and after each cut", "dead space with me
// just breathing"): inside every dialogue piece, speech = 10 ms frames above speechDb (breaths sit ~15-30 dB under his
// speech), padded by hangAfter/hangBefore so word tails and onsets survive. Leading/trailing non-speech is trimmed to
// edgeHead/edgeTail; a non-speech run of minGap or more inside a piece is cut down to keepAfter + keepBefore (a jump
// cut). Split pieces alternate framing (wide <-> punch) so a jump never looks like a glitch.
const tightenLog = { trimmedSec: 0, splits: 0 };
if (fs.existsSync(path.join(VD, 'edit', 'tighten.json')) && !args['no-tighten']) {
  const tc = rd('edit/tighten.json');
  const pcmPath = path.join(VD, 'work', 'take16k.s16');
  const b = fs.readFileSync(pcmPath), pcm = new Int16Array(b.buffer, b.byteOffset, b.length >> 1), R = 16000, N = 160;
  const nF = Math.floor(pcm.length / N), db = new Float32Array(nF);
  for (let w = 0; w < nF; w++) { let a = 0; for (let i = w * N; i < (w + 1) * N; i++) a += (pcm[i] / 32768) ** 2; db[w] = 10 * Math.log10(a / N + 1e-12); }
  const S = tc.speechDb ?? -30, minGap = tc.minGap ?? 0.25, kA = tc.keepAfter ?? 0.05, kB = tc.keepBefore ?? 0.04, hA = Math.round((tc.hangAfter ?? 0.06) * 100), hB = Math.round((tc.hangBefore ?? 0.04) * 100);
  const eH = tc.edgeHead ?? 0.04, eT = tc.edgeTail ?? 0.06, minPiece = tc.minPiece ?? 0.12;
  const tightenKeeps = fs.existsSync(fixesPath) ? (JSON.parse(fs.readFileSync(fixesPath, 'utf8')).keep || []).map((k) => k.raw) : [];
  const out = [];
  for (const p of pieces) {
    if (p.kind !== 'dialogue') { out.push(p); continue; }
    const i0 = Math.floor(p.in * 100), i1 = Math.min(nF, Math.ceil(p.out * 100));
    const sp = new Uint8Array(i1 - i0);
    for (let i = i0; i < i1; i++) if (db[i] > S) for (let k = Math.max(i0, i - hB); k < Math.min(i1, i + hA + 1); k++) sp[k - i0] = 1;
    let fsI = sp.indexOf(1), feI = sp.lastIndexOf(1);
    if (fsI < 0) { out.push(p); continue; }                        // no loud frame: leave it alone (a quiet word)
    const segs = []; let a = Math.max(p.in, (i0 + fsI) / 100 - eH);
    for (let i = fsI; i <= feI;) {
      if (sp[i]) { i++; continue; }
      let j = i; while (j <= feI && !sp[j]) j++;
      if ((j - i) / 100 >= minGap) { segs.push([a, (i0 + i) / 100 + kA]); a = (i0 + j) / 100 - kB; }
      i = j;
    }
    segs.push([a, Math.min(p.out, (i0 + feI + 1) / 100 + eT)]);
    const kept = segs.filter(([x, y]) => y - x >= minPiece);
    // fixes.json keep ranges survive tightening (v4d 12:54: a keep for the soft end of "different way" was trimmed
    // straight back off, because the word trails off under speechDb): stretch the nearest kept segment over each one
    for (const [ka, kb] of tightenKeeps) {
      if (kb <= p.in || ka >= p.out || !kept.length) continue;
      const a0 = Math.max(ka, p.in), b0 = Math.min(kb, p.out);
      let best = 0, bd = Infinity; kept.forEach(([x, y], k) => { const dd = Math.max(0, x - b0, a0 - y); if (dd < bd) { bd = dd; best = k; } });
      kept[best] = [Math.min(kept[best][0], a0), Math.max(kept[best][1], b0)];
    }
    kept.forEach(([x, y], k) => {
      const sub = { ...p, in: +(F(x) / fps).toFixed(6), out: +(F(y) / fps).toFixed(6), inFrame: F(x), outFrame: F(y) };
      if (k % 2 === 1) { if (p.scale && p.scale > 1) { delete sub.scale; delete sub.position; } else sub.scale = 1.12; }
      if (sub.outFrame - sub.inFrame >= 2) out.push(sub);
    });
    tightenLog.splits += Math.max(0, kept.length - 1);
    tightenLog.trimmedSec += (p.out - p.in) - kept.reduce((s, [x, y]) => s + (y - x), 0);
  }
  pieces = out; tightenLog.trimmedSec = r3(tightenLog.trimmedSec);
}

// Noise slivers and replays (Ben, v4b 10:27 "a little glitch here and some dead space"): after the passes above, a
// dialogue piece under 1 s with fewer than 10 speech frames (10 ms above -33 dB; real short words measured 19-80, breath
// and mouth-noise slivers 0-6) is dropped unless a fixes.json keep range covers it; and a piece may never replay raw
// frames the piece before it already played (two paper ranges once overlapped by 0.73 s).
const cleanLog = { slivers: [], overlaps: [] };
{
  const pb = fs.readFileSync(path.join(VD, 'work', 'take16k.s16')), pp = new Int16Array(pb.buffer, pb.byteOffset, pb.length >> 1);
  const loud = (x, y) => { let n = 0; for (let i = Math.floor(x * 100); i < Math.ceil(y * 100); i++) { let a = 0; for (let k = i * 160; k < (i + 1) * 160 && k < pp.length; k++) a += (pp[k] / 32768) ** 2; if (10 * Math.log10(a / 160 + 1e-12) > -33) n++; } return n; };
  const keepR = fs.existsSync(fixesPath) ? (JSON.parse(fs.readFileSync(fixesPath, 'utf8')).keep || []).map((k) => k.raw) : [];
  pieces = pieces.filter((p) => {
    if (p.kind !== 'dialogue' || p.out - p.in >= 1.0 || keepR.some(([a, b]) => a < p.out && b > p.in)) return true;
    const n = loud(p.in, p.out); if (n >= 10) return true;
    cleanLog.slivers.push({ raw: [r3(p.in), r3(p.out)], loudFrames: n }); return false;
  });
  for (let j = 0; j + 1 < pieces.length; j++) {
    const A = pieces[j], B = pieces[j + 1];
    if (A.kind !== 'dialogue' || B.kind !== 'dialogue' || A.media !== B.media) continue;
    if (B.inFrame < A.outFrame && B.inFrame > A.inFrame) { cleanLog.overlaps.push({ a: [r3(A.in), r3(A.out)], b: r3(B.in) }); A.outFrame = B.inFrame; A.out = +(A.outFrame / fps).toFixed(6); }
  }
}

// Gaze (edit/gaze.json + work/gaze.json from pipeline/edit/gaze.mjs; Ben 2026-09-28: "I tend to look over at the screen
// for the next line after I get done speaking... if I glance and it will cut off a word keep the word, but overall I
// should be done talking before the glance"). A frame is "away" when the face landmarker's eye/head numbers leave the
// range they hold while he talks to the lens (calibrated on frames mid-speech, per video). At each dialogue piece's
// tail, cut from the first away frame after his last word; at its head, start after the last away frame before his
// first word. Words are protected by a lower speech threshold than tighten's (protectDb) plus protectTail/Head, so a
// glance that starts during a word never costs the word. Mid-sentence glances are left alone on purpose (Ben: 'sometimes
// I may look at the screen to pronounce a name'); only away runs that touch a piece edge (the glance started before
// the last word ended) are listed, in edit/gaze-report.json, so a graphic can cover them if they are on camera.
const gazeLog = { trimmedSec: 0, tails: 0, heads: 0, residual: [], edits: [] };
let gazeAwayFn = null;   // frame -> true (looking away) / false (on the lens) / null (not scanned); used by --split
let gazeCleanFn = null;  // frame -> strictly on the lens (not away, head not tipped down to his notes, eyes open): split pre-roll
const gazeCfgPath = path.join(VD, 'edit', 'gaze.json'), gazeDataPath = path.join(VD, 'work', 'gaze.json');
if (fs.existsSync(gazeCfgPath) && fs.existsSync(gazeDataPath) && !args['no-gaze']) {
  const gc = rd('edit/gaze.json'), gd = JSON.parse(fs.readFileSync(gazeDataPath, 'utf8')), GF = gd.fps || 30, G = gd.frames;
  const pcm = (() => { const b = fs.readFileSync(path.join(VD, 'work', 'take16k.s16')); return new Int16Array(b.buffer, b.byteOffset, b.length >> 1); })();
  const dbAt = (t) => { const s = Math.floor(t * 16000), n = 160; let a = 0; for (let i = s; i < s + n && i < pcm.length; i++) a += (pcm[i] / 32768) ** 2; return 10 * Math.log10(a / n + 1e-12); };
  // calibration: median + MAD of each measure over found frames whose 10 ms audio is loud (he is mid-word)
  const idx = { yaw: 1, pitch: 2, eyeH: 3, blink: 5, lookL: 6, lookR: 7, down: 8 };
  const calib = {};
  const speaking = Object.entries(G).filter(([f, v]) => v[0] && dbAt(+f / GF) > (gc.calibDb ?? -30)).map(([, v]) => v);
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  for (const [k, j] of Object.entries(idx)) { const col = speaking.map((v) => v[j]); const m = med(col); calib[k] = { med: m, mad: med(col.map((x) => Math.abs(x - m))) }; }
  const th = gc.thresholds || {};
  const awayRaw = (f) => {
    const v = G[f]; if (!v) return null;             // not scanned: unknown
    if (!v[0]) return true;                          // no face found (turned far away / hand over face)
    const z = (k) => (v[idx[k]] - calib[k].med);
    return z('lookL') > (th.lookL ?? 0.3) || z('lookR') > (th.lookR ?? 0.3) || Math.abs(z('eyeH')) > (th.eyeH ?? 0.07)
      || Math.abs(z('yaw')) > (th.yaw ?? 0.22) || z('down') > (th.down ?? 0.35) || z('blink') > (th.lids ?? 0.4);
  };
  // lowered lids read like a blink: only count a lids/down run as away when it lasts minRun frames (a blink is shorter)
  const minRun = gc.minRunFrames ?? 6, awayCache = new Map();
  const away = (f) => {
    if (awayCache.has(f)) return awayCache.get(f);
    let r = awayRaw(f);
    if (r) { let a = f, b = f; while (awayRaw(a - 1) && f - a < 40) a--; while (awayRaw(b + 1) && b - f < 40) b++; if (b - a + 1 < minRun) r = false; }
    awayCache.set(f, r); return r;
  };
  gazeAwayFn = away;
  // v4c 8:56: a split cut to frames where he looked DOWN at his notes; pitch (nose below the eye-mouth midline) and
  // lowered lids catch that, but his pitch while talking spans too much to use as a general away signal
  const cl = gc.clean || {};
  gazeCleanFn = (f) => { const v = G[f]; if (!v || !v[0] || away(f)) return false; return v[2] - calib.pitch.med < (cl.pitch ?? 0.06) && v[5] - calib.blink.med < (cl.lids ?? 0.25); };
  const pDb = gc.protectDb ?? -42, pT = gc.protectTail ?? 0.03, pH = gc.protectHead ?? 0.02;
  // stretches restored on purpose (fixes.json keep: reactions, lead-ins) are never trimmed
  const keeps = fs.existsSync(fixesPath) ? (JSON.parse(fs.readFileSync(fixesPath, 'utf8')).keep || []).map((k) => k.raw) : [];
  for (const p of pieces) {
    if (p.kind !== 'dialogue') continue;
    if (keeps.some(([a, b]) => a < p.out + 0.3 && b > p.in - 0.3)) continue;
    // protected speech span inside the piece (10 ms steps)
    let s0 = null, s1 = null;
    for (let t = p.in; t < p.out; t += 0.01) if (dbAt(t) > pDb) { if (s0 == null) s0 = t; s1 = t + 0.01; }
    if (s0 == null) continue;
    const protIn = Math.max(p.in, s0 - pH), protOut = Math.min(p.out, s1 + pT);
    const gIn = Math.round(p.in * GF), gOut = Math.round(p.out * GF), gpIn = Math.floor(protIn * GF), gpOut = Math.ceil(protOut * GF);
    // tail: first away frame at/after the protected end (or already inside the last word: cut right at protOut)
    let newOut = p.out;
    for (let f = gpOut - 3; f < gOut; f++) if (away(f)) { newOut = Math.max(protOut, f / GF); break; }
    // head: last away frame before the protected start
    let newIn = p.in;
    for (let f = gpIn + 3; f >= gIn; f--) if (away(f)) { newIn = Math.min(protIn, (f + 1) / GF); break; }
    if (F(newOut) - F(newIn) < Math.round((gc.minPiece ?? 0.3) * fps)) continue;
    if (F(newOut) < p.outFrame) gazeLog.edits.push({ edge: 'tail', from: r3(p.out), to: r3(F(newOut) / fps), protOut: r3(protOut) });
    if (F(newIn) > p.inFrame) gazeLog.edits.push({ edge: 'head', from: r3(p.in), to: r3(F(newIn) / fps), protIn: r3(protIn) });
    if (F(newOut) < p.outFrame) { gazeLog.tails++; gazeLog.trimmedSec += (p.outFrame - F(newOut)) / fps; p.out = +(F(newOut) / fps).toFixed(6); p.outFrame = F(newOut); }
    if (F(newIn) > p.inFrame) { gazeLog.heads++; gazeLog.trimmedSec += (F(newIn) - p.inFrame) / fps; p.in = +(F(newIn) / fps).toFixed(6); p.inFrame = F(newIn); }
    // what stays: away runs inside the kept piece
    const runs = []; let r0 = null;
    for (let f = p.inFrame; f <= p.outFrame; f++) { const a = f < p.outFrame && away(f); if (a && r0 == null) r0 = f; if (!a && r0 != null) { runs.push([r0 / GF, f / GF]); r0 = null; } }
    const edge = gc.edgeWindow ?? 0.5;
    const atEdge = runs.filter(([a, b]) => b - a >= (gc.reportMin ?? 0.1) && (a - p.in < edge || p.out - b < edge));
    if (atEdge.length) p.gazeAway = atEdge;
  }
  gazeLog.trimmedSec = r3(gazeLog.trimmedSec); gazeLog.calib = Object.fromEntries(Object.entries(calib).map(([k, v]) => [k, { med: r3(v.med), mad: r3(v.mad) }]));
}
const specials = paper.keep.filter((k) => k.special);
const seg = (inS, outS, extra) => ({ media: 'raw', in: +(F(inS) / fps).toFixed(6), out: +(F(outS) / fps).toFixed(6), inFrame: F(inS), outFrame: F(outS), name: 'take.mp4', ...extra });
for (const s of specials) {
  if (s.special === 'tiktok-watch') {
    if (s.raw && s.raw.length === 2 && !s.dur) {
      // an explicit raw stretch (Ben watching and reacting while the clip plays): it replaces any dialogue in it
      const [a, b] = s.raw;
      pieces = pieces.filter((p) => !(p.kind === 'dialogue' && p.in < b && p.out > a));
      pieces.unshift(seg(a, b, { kind: 'insert', special: s.special, gainDb: s.gainDb ?? 0 }));
      continue;
    }
    // butt the insert against the first dialogue piece so the footage is continuous into "That sucks."
    const first = pieces[0], dur = s.dur || (s.raw[1] - s.raw[0]);
    pieces.unshift(seg(first.in - dur, first.in, { kind: 'insert', special: s.special, gainDb: s.gainDb ?? -96 }));
  } else if (s.special === 'wrist-wait') {
    // the silence after the piece that ends near s.raw[0], up to the next piece; then an extension for the countdown
    // the last dialogue piece that starts before the end of the anchor word (s.afterWord), or ends near s.raw[0]
    const endT = s.afterWord != null ? words[s.afterWord].end : s.raw[0];
    let k = -1; pieces.forEach((p, j) => { if (p.kind === 'dialogue' && p.in <= endT) k = j; });
    if (k < 0 || Math.abs(pieces[k].out - endT) > 1.2) throw new Error(`wrist-wait: no piece ends near ${endT}`);
    const next = pieces[k + 1];
    const ins = [seg(pieces[k].out, Math.min(s.raw[1], next.in), { kind: 'insert', special: s.special })];
    if (s.extend) ins.push(seg(s.extend[0], s.extend[1], { kind: 'insert', special: s.special + '-extend', gainDb: 0 }));
    pieces.splice(k + 1, 0, ...ins);
  }
}
let t = 0;
for (const p of pieces) { p.at = r3(t); p.dur = (p.outFrame - p.inFrame) / fps; t += p.dur; }
const total = t;

// ------------------------------------------------------------------ 2. word map + beats
// Whisper stretches sentence-edge words into the pauses around them, so a word goes to the dialogue piece it OVERLAPS
// most (at least 60 ms or half the word), and its times are clamped to that piece.
const cutWords = [];
for (let i = 0; i < words.length; i++) {
  const w = words[i], wEnd = Math.max(w.end, w.t + 0.05);
  let best = -1, bestOv = 0;
  for (let k = 0; k < pieces.length; k++) {
    const p = pieces[k];
    if (p.kind !== 'dialogue' || p.out < w.t - 1 || p.in > wEnd + 1) continue;
    const ov = Math.min(wEnd, p.out) - Math.max(w.t, p.in);
    if (ov > bestOv) { bestOv = ov; best = k; }
  }
  if (best < 0 || bestOv < Math.min(0.06, (wEnd - w.t) / 2)) continue;
  const p = pieces[best];
  cutWords.push({ i, w: w.w, t: r3(p.at + Math.max(0, w.t - p.in)), end: r3(p.at + Math.min(p.dur, wEnd - p.in)), piece: best });
}
// Whisper also collapses runs of words onto one timestamp (e.g. nine words at 154.44-154.46). Kept words that found no
// piece are interpolated between their mapped neighbours inside the same paper-edit range (marked interp: true).
{
  const have = new Map(cutWords.map((c) => [c.i, c]));
  for (const k of paper.keep.filter((x) => x.w)) {
    const idx = []; for (let i = k.w[0]; i <= k.w[1]; i++) idx.push(i);
    let j = 0;
    while (j < idx.length) {
      if (have.has(idx[j])) { j++; continue; }
      let e = j; while (e < idx.length && !have.has(idx[e])) e++;
      const prev = j > 0 ? have.get(idx[j - 1]) : null, next = e < idx.length ? have.get(idx[e]) : null;
      if (!prev && !next) break;
      const a = prev ? prev.end : Math.max(0, next.t - 0.25 * (e - j)), b = next ? next.t : prev.end + 0.25 * (e - j);
      const n = e - j, step = Math.max(0, b - a) / n;
      for (let m = 0; m < n; m++) { const c = { i: idx[j + m], w: words[idx[j + m]].w, t: r3(a + m * step), end: r3(a + (m + 1) * step), piece: (prev || next).piece, interp: true }; have.set(c.i, c); cutWords.push(c); }
      j = e;
    }
  }
  cutWords.sort((x, y) => x.i - y.i);
}
// Best: the cut's own audio transcribed (work/cut-transcript.words.json, from --stage audio + transcribe.mjs). Matched
// words take the heard times (exact timeline times); words whisper collapsed are re-interpolated between heard ones.
let heardStats = null;
{
  const hp = path.join(VD, 'work', 'cut-transcript.words.json'), wav = path.join(VD, 'work', 'cut-audio16k.wav');
  // only a transcript of THIS cut: newer than the cut audio, and that audio is this cut's length (a stale transcript
  // from the previous cut once moved every word after a re-cut by the length of the change; 2026-09-28, v4b)
  let fresh = fs.existsSync(hp) && fs.existsSync(wav) && fs.statSync(hp).mtimeMs >= fs.statSync(wav).mtimeMs;
  if (fresh) { const wavSec = (fs.statSync(wav).size - 44) / 32000; if (Math.abs(wavSec - total) > 0.1) fresh = false; }
  if (fs.existsSync(hp) && !fresh) heardStats = { skipped: 'work/cut-transcript is not of this cut: run --stage audio, transcribe work/cut-audio16k.wav, then --stage map again' };
  if (fresh) {
    const heard0 = JSON.parse(fs.readFileSync(hp, 'utf8'));
    const { alignWords } = await import('./words-merge.mjs');
    // v4d 9:58 ("text a little off my voice"): whisper heard "nanolipid emulsion" for "nano lipid emulsions", so the
    // three words failed to match and were interpolated 0.5 s late. Split a heard compound into two words of the cut's
    // vocabulary (time shared by letters), and match singular and plural as the same word.
    const nw = (w) => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
    const vocab = new Set(cutWords.map((c) => nw(c.w)));
    const heard = [];
    for (const h of heard0) {
      const n = nw(h.w); let k0 = 0;
      if (n.length >= 7 && !vocab.has(n)) for (let k = 3; k <= n.length - 3 && !k0; k++) if (vocab.has(n.slice(0, k)) && vocab.has(n.slice(k))) k0 = k;
      if (k0) { const mid = r3(h.t + (h.end - h.t) * k0 / n.length); heard.push({ ...h, w: n.slice(0, k0), end: mid }, { ...h, w: n.slice(k0), t: mid }); }
      else heard.push(h);
    }
    const fold = (w) => { const n = nw(w); return n.length > 4 && n.endsWith('s') && !n.endsWith('ss') ? n.slice(0, -1) : n; };
    const pairs = alignWords(cutWords.map((c) => ({ w: fold(c.w) })), heard.map((h) => ({ w: fold(h.w) })));
    let used = 0;
    for (const c of cutWords) { c.heard = false; }
    for (const [a, b] of pairs) {
      const c = cutWords[a], h = heard[b];
      if (h.end - h.t < 0.03) continue;                 // collapsed timestamp: not trustworthy
      c.t = r3(h.t); c.end = r3(h.end); c.heard = true; delete c.interp; used++;
    }
    // re-interpolate the rest between heard neighbours (whole list is in timeline order)
    for (let j = 0; j < cutWords.length;) {
      if (cutWords[j].heard) { j++; continue; }
      let e = j; while (e < cutWords.length && !cutWords[e].heard) e++;
      const prev = j > 0 ? cutWords[j - 1] : null, next = e < cutWords.length ? cutWords[e] : null;
      const a = prev ? prev.end : Math.max(0, (next ? next.t : 0) - 0.3 * (e - j)), b = next ? next.t : (prev ? prev.end : 0) + 0.3 * (e - j);
      const step = Math.max(0, b - a) / (e - j);
      for (let m = j; m < e; m++) { cutWords[m].t = r3(a + (m - j) * step); cutWords[m].end = r3(a + (m - j + 1) * step); cutWords[m].interp = true; }
      j = e;
    }
    heardStats = { heardWords: heard.length, aligned: pairs.length, used, interpolated: cutWords.filter((c) => c.interp).length };
    // Whisper's word starts run late (v4d 9:58 "text a little off my voice": median 0.23 s after a pause, 0.15-0.18 s
    // mid-phrase). Measure it on words that follow a pause (sound onset vs whisper start), and move the whole word map
    // earlier by edit/timing.json wordLead (a uniform shift: scenes keep their internal timing, so nothing re-renders;
    // text landing a hair before the word reads right, after it reads late).
    const wavP = path.join(VD, 'work', 'cut-audio16k.wav');
    if (fs.existsSync(wavP)) {
      const wb = fs.readFileSync(wavP), wp = new Int16Array(wb.buffer.slice(wb.byteOffset + 44, wb.byteOffset + wb.length));
      const wdb = (i) => { let a = 0; for (let k = i * 160; k < (i + 1) * 160 && k < wp.length; k++) a += (wp[k] / 32768) ** 2; return 10 * Math.log10(a / 160 + 1e-12); };
      const d = [];
      for (const c of cutWords) {
        if (!c.heard) continue;
        const i0 = Math.round(c.t * 100);
        for (let i = i0 - 40; i <= i0 + 30; i++) { if (wdb(i) > -30) { let q = true; for (let k = i - 12; k < i; k++) if (wdb(k) > -40) { q = false; break; } if (q) d.push(c.t - i / 100); break; } }
      }
      d.sort((x, y) => x - y);
      heardStats.startBias = d.length ? { words: d.length, median: r3(d[Math.floor(d.length / 2)]), p25: r3(d[Math.floor(d.length / 4)]), p75: r3(d[Math.floor(d.length * 3 / 4)]) } : null;
    }
    const tm = fs.existsSync(path.join(VD, 'edit', 'timing.json')) ? rd('edit/timing.json') : {};
    const lead = +(tm.wordLead ?? 0);
    if (lead) { for (const c of cutWords) { c.t = r3(Math.max(0, c.t - lead)); c.end = r3(Math.max(c.t, c.end - lead)); } heardStats.wordLead = lead; }
  }
}
const byIdx = new Map(cutWords.map((c) => [c.i, c]));
const beats = [];
for (const k of paper.keep) {
  if (k.special) { const p = pieces.find((x) => x.special === k.special); if (p) beats.push({ beat: k.beat, special: k.special, t0: p.at, t1: r3(p.at + p.dur), note: k.note }); continue; }
  const inRange = cutWords.filter((c) => c.i >= k.w[0] && c.i <= k.w[1]);
  if (!inRange.length) { beats.push({ beat: k.beat, w: k.w, missing: true, note: k.note }); continue; }
  beats.push({ beat: k.beat, w: k.w, t0: inRange[0].t, t1: inRange[inRange.length - 1].end, text: inRange.map((c) => c.w).join(' '), note: k.note });
}
export function anchorTime(a) {
  if (a == null) return null;
  if (typeof a === 'number') return a;
  if (a.word != null) { let c = byIdx.get(a.word); if (!c) { for (let d = 1; d < 40 && !c; d++) c = byIdx.get(a.word + d) || byIdx.get(a.word - d); } if (!c) throw new Error('anchor word not in the cut: ' + a.word); return r3((a.edge === 'end' ? c.end : c.t) + (a.offset || 0)); }
  if (a.beat) { const bs = beats.filter((b) => b.beat === a.beat && !b.missing); if (!bs.length) throw new Error('no beat ' + a.beat); return r3((a.at === 'end' ? bs[bs.length - 1].t1 : bs[0].t0) + (a.offset || 0)); }
  if (a.special) { const p = pieces.find((x) => x.special === a.special); return r3(p.at + (a.offset || 0)); }
  throw new Error('bad anchor ' + JSON.stringify(a));
}

fs.mkdirSync(path.join(VD, 'edit'), { recursive: true });
fs.writeFileSync(path.join(VD, 'edit', 'cut-words.json'), JSON.stringify({ total: r3(total), fps, words: cutWords }, null, 0));
fs.writeFileSync(path.join(VD, 'edit', 'fix-log.json'), JSON.stringify(fixLog, null, 1));
fs.writeFileSync(path.join(VD, 'edit', 'beats.json'), JSON.stringify({ total: r3(total), pieces: pieces.map((p) => ({ at: p.at, dur: r3(p.dur), in: p.in, out: p.out, kind: p.kind, special: p.special, scale: p.scale })), beats }, null, 1));
if (gazeLog.calib) {
  for (const p of pieces) for (const [a, b] of p.gazeAway || []) gazeLog.residual.push({ at: r3(p.at + a - p.in), dur: r3(b - a), raw: [r3(a), r3(b)], edge: a - p.in < p.out - b ? 'head' : 'tail' });
  fs.writeFileSync(path.join(VD, 'edit', 'gaze-report.json'), JSON.stringify(gazeLog, null, 1));
}
const summary = { total: r3(total), tighten: tightenLog, clean: { slivers: cleanLog.slivers, overlaps: cleanLog.overlaps }, gaze: gazeLog.calib ? { trimmedSec: gazeLog.trimmedSec, tails: gazeLog.tails, heads: gazeLog.heads, residualAtEdges: gazeLog.residual.length } : null, fixes: fixLog.length, heard: heardStats, pieces: pieces.length, inserts: pieces.filter((p) => p.kind === 'insert').map((p) => ({ special: p.special, at: p.at, dur: r3(p.dur) })), words: cutWords.length, beatsMissing: beats.filter((b) => b.missing).length };
if (args.stage === 'audio') {
  // sample-exact dialogue of the cut (16 kHz mono) for whisper: ffmpeg's concat inpoint/outpoint drifted 2.3 s over
  // 320 pieces, so slice decoded PCM by sample index instead
  const { FFMPEG } = await import('../resolve/media.mjs');
  const { spawnSync } = await import('node:child_process');
  const src = path.join(VD, 'work', fs.existsSync(path.join(VD, 'work', 'take.clean.wav')) ? 'take.clean.wav' : 'take.clean.mov');
  const R = 16000, rawPcm = path.join(VD, 'work', 'take16k.s16');
  if (!fs.existsSync(rawPcm)) spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-map', '0:a:0', '-ac', '1', '-ar', String(R), '-f', 's16le', rawPcm]);
  const pcm = new Int16Array(fs.readFileSync(rawPcm).buffer.slice(0));
  const parts = pieces.map((p) => (p.gainDb != null && p.gainDb <= -60) ? new Int16Array(Math.round(p.dur * R)) : pcm.subarray(Math.round(p.inFrame / fps * R), Math.round(p.inFrame / fps * R) + Math.round(p.dur * R)));
  const n = parts.reduce((s, x) => s + x.length, 0), outPcm = new Int16Array(n); let o = 0;
  for (const x of parts) { outPcm.set(x, o); o += x.length; }
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + n * 2, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(R, 24); h.writeUInt32LE(R * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(n * 2, 40);
  // rewrite only when the content changed: the cut transcript counts as current only if it is newer than this file
  const outWav = path.join(VD, 'work', 'cut-audio16k.wav'), buf = Buffer.concat([h, Buffer.from(outPcm.buffer)]);
  if (fs.existsSync(outWav) && fs.statSync(outWav).size === buf.length && fs.readFileSync(outWav).equals(buf)) { console.log(JSON.stringify({ wav: 'work/cut-audio16k.wav', unchanged: true, total: r3(total) })); process.exit(0); }
  fs.writeFileSync(outWav, buf);
  console.log(JSON.stringify({ wav: 'work/cut-audio16k.wav', sec: +(n / R).toFixed(3), total: r3(total) })); process.exit(0);
}
if ((args.stage || 'map') === 'map') { console.log(JSON.stringify(summary)); process.exit(0); }

// ------------------------------------------------------------------ 3. full: overlays, framing, audio -> final spec + FCPXML
const { writeTimeline } = await import('../resolve/fcpxml.mjs');
const { writeMcpScripts } = await import('../resolve/mcp-scripts.mjs');
const plan = fs.existsSync(path.join(VD, 'edit', 'visual-plan.json')) ? rd('edit/visual-plan.json') : { scenes: [] };
const framing = fs.existsSync(path.join(VD, 'edit', 'framing.json')) ? rd('edit/framing.json') : { default: { scale: 1, position: [0, 0] }, pieces: {} };
const audio = fs.existsSync(path.join(VD, 'edit', 'audio.json')) ? rd('edit/audio.json') : { stems: [] };
const out = { ...spec, name: args.name || spec.name, media: { ...spec.media }, aroll: [], overlays: [], music: [], markers: [] };
// framing.moments: [{ words: [a, b], scale, face: [x, y] (fractions of the frame) }] -> a punch-in centred on the face
// for every dialogue piece that holds one of those words (anchored by word, so it survives re-cuts)
const momentFor = new Map();
for (const m of framing.moments || []) {
  const [fx, fy] = m.face || [0.5, 0.4], W = spec.width || 3840, H = spec.height || 2160, s = m.scale || 1.3;
  const pos = [Math.round((fx * W - W / 2) * (1 - s)), Math.round((H / 2 - fy * H) * (1 - s))];
  for (const c of cutWords) if (c.i >= m.words[0] && c.i <= m.words[1]) momentFor.set(c.piece, { scale: s, position: pos });
}
pieces.forEach((p, k) => {
  const fr = momentFor.get(k) || framing.pieces?.[k] || (p.kind === 'insert' ? framing.inserts?.[p.special] : null) || (p.scale && p.scale > 1 ? framing.punch : framing.default) || {};
  const a = { media: 'raw', in: p.in, out: p.out, inFrame: p.inFrame, outFrame: p.outFrame, name: p.special || `seg ${k}` };
  if (fr.scale && fr.scale !== 1) { a.scale = fr.scale; a.position = fr.position || [0, 0]; }
  else if (fr.position && (fr.position[0] || fr.position[1])) { a.scale = 1; a.position = fr.position; }
  // a zoom change needs a cut in time to hide behind (Ben, v4b 12:06 "weird glitch to my camera and off again": a
  // 0.27 s punch-in between two wide pieces of one continuous take). A piece that continues the previous one's raw
  // frames, or lasts under 0.8 s, keeps the previous framing; face moments (framing.moments) still win.
  const prev = pieces[k - 1], prevA = out.aroll[k - 1];
  if (prev && prevA && p.kind === 'dialogue' && !momentFor.get(k) && ((prev.media === p.media && prev.outFrame === p.inFrame) || p.outFrame - p.inFrame < Math.round(0.8 * fps))) {
    delete a.scale; delete a.position;
    if (prevA.scale != null) { a.scale = prevA.scale; a.position = prevA.position; }
  }
  if (p.gainDb != null) a.gainDb = p.gainDb;
  out.aroll.push(a);
});

// Split edits (--split; Ben 2026-09-28: glances at his script screen, "if I glance and it will cut off a word keep the
// word"). Where a glance starts inside the last word of a piece, the PICTURE cuts to the next piece up to splitMaxSec
// early, showing that piece's own on-lens frames from just before it starts (its pre-roll), while the SOUND of the last
// word plays on underneath: an L-cut. The dialogue then comes from one sample-exact stem (work/dialogue48k.wav, the
// same 2-frame 0 dB crossfades Resolve used) and the A-roll clips go into the FCPXML as picture only.
const splitLog = { joins: 0, frames: 0, at: [] };
if (args.split) {
  if (!gazeAwayFn) throw new Error('--split needs the gaze pass (edit/gaze.json + work/gaze.json)');
  const gcs = rd('edit/gaze.json'), maxK = Math.round((gcs.splitMaxSec ?? 0.2) * fps);
  for (let j = 0; j + 1 < pieces.length; j++) {
    const A = pieces[j], B = pieces[j + 1], a = out.aroll[j], b = out.aroll[j + 1];
    if (A.kind !== 'dialogue' || B.kind !== 'dialogue') continue;
    let k = 0; for (let f = A.outFrame - 1; f > A.inFrame + 3 && gazeAwayFn(f); f--) k++;
    if (k < 2) continue;
    let c = 0; for (let f = B.inFrame - 1; c < Math.min(k, maxK) && f >= 0 && gazeCleanFn(f); f--) c++;
    if (B.inFrame >= A.outFrame) c = Math.min(c, B.inFrame - A.outFrame);   // never show A's own frames twice
    else if (B.inFrame > A.inFrame) c = 0;
    if (c < 2) continue;
    a.outFrame -= c; a.out = +(a.outFrame / fps).toFixed(6); b.inFrame -= c; b.in = +(b.inFrame / fps).toFixed(6);
    splitLog.joins++; splitLog.frames += c; splitLog.at.push([r3(B.at), c]);
  }
  for (const a of out.aroll) a.videoOnly = true;
  // the dialogue stem, from the same cleaned audio the A-roll clips carry (work/take.clean.wav, 48 kHz)
  const srcWav = path.join(VD, 'work', 'take.clean.wav'), wb = fs.readFileSync(srcWav);
  let off = 12, fmt = null, dataOff = -1, dataLen = 0;
  while (off + 8 <= wb.length) { const id = wb.toString('ascii', off, off + 4), len = wb.readUInt32LE(off + 4); if (id === 'fmt ') fmt = { ch: wb.readUInt16LE(off + 10), rate: wb.readUInt32LE(off + 12), bits: wb.readUInt16LE(off + 22), tag: wb.readUInt16LE(off + 8) }; if (id === 'data') { dataOff = off + 8; dataLen = Math.min(len, wb.length - dataOff); break; } off += 8 + len + (len & 1); }
  if (!fmt || dataOff < 0 || ![1, 65534].includes(fmt.tag) || ![16, 24].includes(fmt.bits)) throw new Error(`dialogue stem: unsupported ${srcWav} (${JSON.stringify(fmt)})`);
  const SR = fmt.rate, CH = fmt.ch, BPS = fmt.bits / 8, nSrc = Math.floor(dataLen / (BPS * CH));
  const rdS = BPS === 3 ? (i) => wb.readIntLE(dataOff + i * 3, 3) / 8388608 : (i) => wb.readInt16LE(dataOff + i * 2) / 32768;
  const spf = SR / fps, H = Math.round(spf);                        // crossfade: 1 frame each side of the cut (2 frames)
  const N = Math.round(total * SR), mix = new Float32Array(N * 2);
  let T0 = 0;
  pieces.forEach((p, j) => {
    const L = Math.round((p.outFrame - p.inFrame) * spf), s0 = Math.round(p.inFrame * spf);
    const g = p.gainDb != null ? (p.gainDb <= -60 ? 0 : 10 ** (p.gainDb / 20)) : 1;
    const hIn = j > 0 ? H : 0, hOut = j + 1 < pieces.length ? H : 0;
    if (g > 0) for (let t = -hIn; t < L + hOut; t++) {
      const o = T0 + t, s = s0 + t; if (o < 0 || o >= N || s < 0 || s >= nSrc) continue;
      let w = 1;
      if (t < hIn) w = Math.sin(Math.PI / 2 * (t + hIn) / (2 * hIn));                  // equal power (0 dB)
      else if (t >= L - hOut) w = Math.cos(Math.PI / 2 * (t - (L - hOut)) / (2 * hOut));
      for (let c = 0; c < 2; c++) mix[o * 2 + c] += g * w * rdS(s * CH + Math.min(c, CH - 1));
    }
    T0 += L;
  });
  const stem = path.join(VD, 'work', 'dialogue48k.wav'), ob = Buffer.alloc(44 + N * 2 * 3);
  ob.write('RIFF', 0); ob.writeUInt32LE(36 + N * 6, 4); ob.write('WAVE', 8); ob.write('fmt ', 12); ob.writeUInt32LE(16, 16); ob.writeUInt16LE(1, 20); ob.writeUInt16LE(2, 22);
  ob.writeUInt32LE(SR, 24); ob.writeUInt32LE(SR * 6, 28); ob.writeUInt16LE(6, 32); ob.writeUInt16LE(24, 34); ob.write('data', 36); ob.writeUInt32LE(N * 6, 40);
  for (let i = 0; i < N * 2; i++) ob.writeIntLE(Math.max(-8388608, Math.min(8388607, Math.round(mix[i] * 8388607))), 44 + i * 3, 3);
  fs.writeFileSync(stem, ob);
  audio.stems = [{ id: 'dialogue', file: path.relative(ROOT, stem), at: 0, gainDb: 0 }, ...(audio.stems || []).filter((s) => s.id !== 'dialogue')];
  splitLog.stem = path.relative(VD, stem).split(path.sep).join('/');
}
const report = { overlays: [], skipped: [] };
// scenes: edit/visual-plan.json plus every scene group's scenes/<group>/plan.json (a group entry with the same id wins;
// a placeholder with `replacedBy` is dropped once that scene exists)
const scenes = new Map((plan.scenes || []).map((s) => [s.id, { ...s, group: 'plan' }]));
const sdir = path.join(VD, 'scenes');
if (fs.existsSync(sdir) && !args['no-scenes']) for (const g of fs.readdirSync(sdir)) {
  const pf = path.join(sdir, g, 'plan.json');
  if (!fs.existsSync(pf)) continue;
  try { for (const s of JSON.parse(fs.readFileSync(pf, 'utf8'))) scenes.set(s.id, { ...s, group: g }); } catch (e) { report.skipped.push(`plan ${g}: ${e.message}`); }
}
for (const [id, o] of Object.entries(plan.overrides || {})) if (scenes.has(id)) scenes.set(id, { ...scenes.get(id), ...o });
for (const [id, s] of [...scenes]) if (s.skip) { scenes.delete(id); report.skipped.push(`${id}: skip (${s.skip === true ? 'override' : s.skip})`); }
for (const s of [...scenes.values()]) for (const r of s.replaces || []) if (fs.existsSync(path.resolve(ROOT, s.output || ''))) scenes.delete(r);
for (const [id, s] of [...scenes]) if (s.replacedBy && scenes.has(s.replacedBy) && fs.existsSync(path.resolve(ROOT, scenes.get(s.replacedBy).output || ''))) scenes.delete(id);
const placed = [];
for (const s of scenes.values()) {
  const file = s.output && path.resolve(ROOT, s.output);
  if (!file || !fs.existsSync(file)) { report.skipped.push(`${s.id}: not rendered (${s.output || 'no output'})`); continue; }
  let at, end;
  try { at = anchorTime(s.start); end = s.end ? anchorTime(s.end) : null; } catch (e) { report.skipped.push(`${s.id}: ${e.message}`); continue; }
  const dur = end != null ? end - at : s.duration;
  if (!(dur > 0)) { report.skipped.push(`${s.id}: bad duration`); continue; }
  // lanes: full-screen graphics 1, overlays on Ben 2, chips that must sit on top of everything 3
  placed.push({ ...s, file, at, dur, lane: s.lane || (s.transparent ? 2 : 1) });
}
// within a lane, a later scene wins: trim the earlier one so nothing overlaps
placed.sort((a, b) => a.lane - b.lane || a.at - b.at);
for (let k = 1; k < placed.length; k++) {
  const a = placed[k - 1], b = placed[k];
  if (a.lane === b.lane && a.at + a.dur > b.at) { report.skipped.push(`trim ${a.id} to ${r3(b.at - a.at)} s (overlaps ${b.id})`); a.dur = b.at - a.at; }
}
// every scene file must be complete (a render in progress has no index yet) and at least as long as its slot;
// --snapshot <name> copies each into work/snap/<name>/ so later re-renders cannot change a published version
{
  const { spawnSync } = await import('node:child_process');
  const { FFPROBE } = await import('../resolve/media.mjs');
  // always a frozen copy (agents re-render scene files in place, and a file can be rewritten between any check and the
  // import): copy, then probe the COPY; if the copy is incomplete, use the newest good copy of that file from an earlier
  // snapshot; if there is none, leave the scene out
  const snapRoot = path.join(VD, 'work', 'snap'), snapDir = path.join(snapRoot, String(args.snapshot || args.version || 'current'));
  fs.mkdirSync(snapDir, { recursive: true });
  const probeDur = (f) => parseFloat(spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout);
  for (const s of placed) {
    const base = path.basename(s.file), dst = path.join(snapDir, base);
    const fresh = Date.now() - fs.statSync(s.file).mtimeMs > 20000;
    if (fresh && (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(s.file).size)) { try { fs.copyFileSync(s.file, dst); } catch {} }
    let use = fs.existsSync(dst) && probeDur(dst) > 0 ? dst : null;
    if (!use) {
      const older = fs.readdirSync(snapRoot).map((d) => path.join(snapRoot, d, base)).filter((f) => f !== dst && fs.existsSync(f)).sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs);
      use = older.find((f) => probeDur(f) > 0) || null;
      if (use) { fs.copyFileSync(use, dst); use = dst; report.skipped.push(`${s.id}: render in progress, used the previous finished version`); }
    }
    if (!use) { report.skipped.push(`${s.id}: no finished file yet (render in progress?)`); s.dur = 0; continue; }
    const fdur = probeDur(use);
    if (s.dur > fdur - (s.in || 0)) { report.skipped.push(`shorten ${s.id} ${r3(s.dur)} -> ${r3(fdur - (s.in || 0))} s (file is shorter than its slot)`); s.dur = fdur - (s.in || 0) - 1 / fps; }
    s.file = use; s.fileDur = fdur;
  }
  // close slivers of A-roll between full-screen scenes (Ben, v4d 12:37: "weird glitch out here and a frame of me in there
  // randomly": a file 1.4 frames short of its slot let him flash through). A gap under 0.5 s is closed by extending the
  // earlier scene into its tail; if its file has no frames to spare, the later scene starts up to 3 frames early.
  const L1 = placed.filter((p) => p.lane === 1 && p.dur > 0.05).sort((a, b) => a.at - b.at);
  for (let k = 1; k < L1.length; k++) {
    const a = L1[k - 1], b = L1[k], gap = b.at - (a.at + a.dur);
    if (!(gap > 1e-3 && gap < 0.5)) continue;
    if (a.fileDur && a.fileDur - (a.in || 0) - a.dur >= gap + 1 / fps) { a.dur += gap; report.skipped.push(`close gap ${r3(gap)} s: extend ${a.id}`); }
    else if (gap <= 3 / fps + 1e-3) { b.at -= gap; b.dur += gap; report.skipped.push(`close gap ${r3(gap)} s: start ${b.id} early`); }
    else report.skipped.push(`gap ${r3(gap)} s between ${a.id} and ${b.id} left open (no spare frames)`);
  }
  // A-roll slivers (Ben, v4e 11:30: "weird glitch video of me right after this frame": a full-screen scene ended
  // 0.27 s before an A-roll cut, so the end of the previous take flashed before the new shot). If the A-roll left
  // showing after a scene is cut away within 0.5 s, the scene runs on to that cut (into its tail frames); if a scene
  // starts within 4 frames after an A-roll cut, it starts on the cut.
  const aCuts = []; { let T = 0; for (const a of out.aroll) { T += (a.outFrame - a.inFrame) / fps; aCuts.push(T); } }
  const startsIn = (x, y) => L1.some((b) => b.at > x + 1e-3 && b.at < y - 1e-3);
  for (const a of L1) {
    const end = a.at + a.dur, nc = aCuts.find((c) => c > end + 1e-3);
    if (nc == null || nc - end >= 0.5 || startsIn(end, nc) || L1.some((b) => b !== a && b.at <= end + 1e-3 && b.at + b.dur > end + 1e-3)) continue;
    if (a.fileDur && a.fileDur - (a.in || 0) - a.dur >= nc - end + 1 / fps) { report.skipped.push(`A-roll sliver ${r3(nc - end)} s after ${a.id}: extended to the cut`); a.dur = nc - a.at; }
  }
  for (const b of L1) {
    const pc = [...aCuts].reverse().find((c) => c < b.at - 1e-3);
    if (pc == null || b.at - pc > 4 / fps || L1.some((a) => a !== b && a.at < b.at && a.at + a.dur > pc + 1e-3)) continue;
    report.skipped.push(`A-roll sliver ${r3(b.at - pc)} s before ${b.id}: started on the cut`); b.dur += b.at - pc; b.at = pc;
  }
}
const sfxCues = [];
for (const s of placed) {
  if (!(s.dur > 0.05)) continue;
  const id = `sc_${s.id}`.replace(/[^\w]/g, '_');
  out.media[id] = { path: s.file };
  out.overlays.push({ media: id, at: r3(s.at), duration: r3(s.dur), in: s.in || 0, mode: s.transparent ? 'overlay' : 'fullscreen', lane: s.lane, ...(s.scale ? { scale: s.scale } : {}), ...(s.position ? { position: s.position } : {}), name: s.id });
  report.overlays.push({ id: s.id, group: s.group, lane: s.lane, at: r3(s.at), dur: r3(s.dur) });
  for (const c of s.sfx || []) if (c.t < s.dur) sfxCues.push({ at: s.at + c.t, kind: c.kind, gainDb: c.gainDb, from: s.id });
}
// extra cues placed by hand: edit/sfx-cues.json [{ at: <anchor>, kind, gainDb }]
if (fs.existsSync(path.join(VD, 'edit', 'sfx-cues.json')) && !args['no-scenes']) for (const c of rd('edit/sfx-cues.json').cues || []) { try { sfxCues.push({ at: anchorTime(c.at), kind: c.kind, gainDb: c.gainDb, from: 'manual' }); } catch (e) { report.skipped.push(`sfx cue: ${e.message}`); } }
// mix every cue into one stem (Resolve scrambles audio when a lane holds more than one clip, so one file it is)
if (!sfxCues.length) audio.stems = (audio.stems || []).filter((s) => s.id !== 'sfx');
if (sfxCues.length) {
  const R = 48000, n = Math.round(total * R), mixL = new Float32Array(n), mixR = new Float32Array(n), lib = path.join(VD, 'sfx', 'lib'), cache = {};
  const GAIN = { whoosh: -20, 'whoosh-soft': -22, 'whoosh-long': -18, pop: -22, 'pop-high': -24, 'pop-low': -20, tick: -16, tock: -18, riser: -16, impact: -10, scribble: -24, 'scribble-short': -26, bubble: -22, 'bubble-small': -26, splash: -18, ding: -22, buzz: -24, paper: -22, sparkle: -24 };
  const load = (k) => { if (cache[k]) return cache[k]; const f = path.join(lib, k + '.wav'); if (!fs.existsSync(f)) return null; const b = fs.readFileSync(f); const s = new Int16Array(b.buffer, b.byteOffset + 44, (b.length - 44) >> 1); return (cache[k] = s); };
  let used = 0;
  for (const c of sfxCues) {
    const s = load(c.kind); if (!s) { report.skipped.push(`sfx kind ${c.kind} (${c.from})`); continue; }
    const g = Math.pow(10, ((c.gainDb ?? GAIN[c.kind] ?? -22)) / 20) / 32768, i0 = Math.round(c.at * R);
    for (let k = 0; k * 2 + 1 < s.length && i0 + k < n; k++) { if (i0 + k < 0) continue; mixL[i0 + k] += s[k * 2] * g; mixR[i0 + k] += s[k * 2 + 1] * g; }
    used++;
  }
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(R, 24); buf.writeUInt32LE(R * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mixL[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mixR[i])) * 32767), 46 + i * 4); }
  fs.mkdirSync(path.join(VD, 'sfx'), { recursive: true });
  fs.writeFileSync(path.join(VD, 'sfx', 'sfx-stem.wav'), buf);
  fs.writeFileSync(path.join(VD, 'sfx', 'cues.json'), JSON.stringify(sfxCues.map((c) => ({ ...c, at: r3(c.at) })), null, 1));
  audio.stems = (audio.stems || []).filter((s) => s.id !== 'sfx').concat({ id: 'sfx', file: path.relative(ROOT, path.join(VD, 'sfx', 'sfx-stem.wav')), at: 0, gainDb: 0 });
  report.sfx = used;
}
fs.writeFileSync(path.join(VD, 'edit', 'placed.json'), JSON.stringify(report, null, 1));
// Resolve scrambles the dialogue across audio tracks when the FCPXML carries several audio stems (v3 test, 2026-09-28:
// 315 of 316 dialogue clips landed on A4). Only stems named in --fcpxml-stems (default: none) go in the FCPXML;
// the rest are listed in out/final/stems.json for resolve-stems.py to add after the import.
const inXml = String(args['fcpxml-stems'] || 'none').split(',');
const laterStems = [];
for (const st of audio.stems || []) {
  const file = path.resolve(ROOT, st.file);
  if (!inXml.includes(st.id)) { if (fs.existsSync(file)) laterStems.push({ id: st.id, file, at: r3(st.at != null ? anchorTime(st.at) : 0), in: st.in || 0, ...(st.duration ? { duration: st.duration } : {}), gainDb: st.gainDb ?? 0 }); continue; }
  if (!fs.existsSync(file)) { report.skipped.push(`audio ${st.id}: missing ${st.file}`); continue; }
  const id = `au_${st.id}`.replace(/[^\w]/g, '_');
  out.media[id] = { path: file };
  out.music.push({ media: id, at: r3(st.at != null ? anchorTime(st.at) : 0), ...(st.duration ? { duration: st.duration } : {}), in: st.in || 0, gainDb: st.gainDb ?? 0, name: st.id });
}
for (const m of plan.markers || []) out.markers.push({ at: anchorTime(m.at), kind: m.kind || 'note', name: m.name, note: m.note || '' });
fs.writeFileSync(path.join(VD, 'out', 'final-spec.json'), JSON.stringify(out, null, 1));
const res = writeTimeline(out, path.join(VD, 'out', 'final.fcpxml'), { baseDir: VD });
const mcpDir = path.join(VD, 'out', 'final'); fs.mkdirSync(mcpDir, { recursive: true });
fs.writeFileSync(path.join(mcpDir, 'stems.json'), JSON.stringify({ timeline: out.name, fps, stems: laterStems }, null, 1));
const [hh, mm, ss, ff] = String(out.tcStart || '01:00:00:00').split(':').map(Number);
writeMcpScripts({ outDir: mcpDir, xmlPath: path.join(VD, 'out', 'final.fcpxml'), timelineName: out.name, tcStartFrames: ((hh * 60 + mm) * 60 + ss) * Math.round(fps) + ff,
  clipCount: out.aroll.length, markers: out.markers, finish: { crossfadeFrames: 2, musicFadeInFrames: 0, musicFadeOutFrames: 6, reviewDir: path.join(VD, 'review'), reviewName: String(args.version || 'review'), pictureOnlyAroll: !!args.split } });
console.log(JSON.stringify({ ...summary, split: args.split ? splitLog : undefined, overlays: report.overlays.length, skipped: report.skipped, fcpxml: 'out/final.fcpxml', valid: res.report?.valid ?? res.valid }));
