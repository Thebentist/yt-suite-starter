#!/usr/bin/env node
/* Automated "listen" of a render of the timeline (the closest thing to a watch-through a machine can do honestly).
 *
 *   node pipeline/resolve/qa-render.mjs --slug <slug> [--render videos/<slug>/out/qa/qa-mix.wav] [--no-transcribe]
 *
 * Needs out/timeline-spec.json, raw/transcript(.plain).words.json, out/takes.json and a render of the timeline (Resolve:
 * resolve-render.py MODE "qa", an audio-only WAV). Checks, written to out/qa/qa-report.json:
 *   duration   render length vs the planned timeline (to the frame)
 *   loudness   integrated LUFS, LRA, true peak of the mix
 *   clicks     at every seam: the biggest sample-to-sample jump within +-5 ms, relative to the typical jump in the 200 ms
 *              around it; a crossfaded seam should look like its surroundings
 *   words      the render is transcribed again (plain whisper, same model as the raw) and aligned by text with the words
 *              the plan kept (raw words mapped through the cut, minus the fillers/stutters/false starts it removed).
 *              Missing / extra words within 0.6 s of a seam are listed per seam; the same rate away from seams is the
 *              baseline (two whisper runs never agree perfectly), so a seam only counts as suspect when it has more.
 * This is signal and transcript evidence, not listening: the report says so, and a human pass is still needed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, probeMedia, parseArgs } from './media.mjs';
import { resolveTimeline, timecode } from './fcpxml.mjs';
import { alignWords, normWord } from '../edit/words-merge.mjs';
import { loudness } from '../edit/clean-audio.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const args = parseArgs(process.argv.slice(2));
if (!args.slug) { console.error('usage: --slug <slug> [--render <file>] [--no-transcribe]'); process.exit(2); }
const V = path.join(ROOT, 'videos', args.slug), O = path.join(V, 'out'), Q = path.join(O, 'qa');
fs.mkdirSync(Q, { recursive: true });
const render = path.resolve(ROOT, args.render || path.join(Q, 'qa-mix.wav'));
if (!fs.existsSync(render)) { console.error(`no render at ${rel(render)}: run out/resolve-render.py in Resolve first`); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(path.join(O, 'timeline-spec.json'), 'utf8'));
const tl = resolveTimeline(spec, { baseDir: O });
const fps = tl.fps, sec = (f) => (f * fps.den) / fps.num, T0 = tl.tcStartFrames;
const tc = (t) => timecode(Math.round((t * fps.num) / fps.den), fps, T0);
const takes = fs.existsSync(path.join(O, 'takes.json')) ? JSON.parse(fs.readFileSync(path.join(O, 'takes.json'), 'utf8')) : { cuts: [] };
const report = { render: rel(render), timeline: spec.name, listened: false, note: 'signal and transcript checks only; nobody has listened' };

// ---- duration
const rm = probeMedia(render);
report.duration = { renderSec: +rm.duration.toFixed(3), plannedSec: +sec(tl.durationFrames).toFixed(3), diffFrames: Math.round((rm.duration - sec(tl.durationFrames)) * fps.num / fps.den) };
report.duration.ok = Math.abs(report.duration.diffFrames) <= 1;

// ---- loudness
report.loudness = await loudness(render);

// ---- clicks at seams
const pcm = (file, rate = 48000) => new Promise((res, rej) => {
  const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-']);
  const c = []; p.stdout.on('data', (d) => c.push(d)); p.on('error', rej);
  p.on('close', () => { const b = Buffer.concat(c); res(new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4))); });
});
const x = await pcm(render);
const seams = tl.aroll.slice(1).map((s) => sec(s.recIn));
const jump = (i) => Math.abs(x[i] - x[i - 1]);
const clicks = seams.map((t) => {
  const c = Math.round(t * 48000), w = 240, ctx = 4800;
  let peak = 0; for (let i = Math.max(1, c - w); i < Math.min(x.length, c + w); i++) peak = Math.max(peak, jump(i));
  const around = []; for (let i = Math.max(1, c - ctx); i < Math.min(x.length, c + ctx); i++) if (Math.abs(i - c) > w) around.push(jump(i));
  around.sort((a, b) => a - b);
  const p99 = around[Math.floor(around.length * 0.99)] || 1e-9;
  return { at: tc(t), sec: +t.toFixed(3), ratio: +(peak / p99).toFixed(2), peakDb: +(20 * Math.log10(peak + 1e-12)).toFixed(1) };
});
// a through-edit for a punch-in removes nothing: its audio runs on from the same source frame, so it cannot click
const joinsFile = path.join(O, 'joins.json');
const kindAt = new Map(fs.existsSync(joinsFile) ? JSON.parse(fs.readFileSync(joinsFile, 'utf8')).joins.map((j) => [j.timelineFrame, j.kind]) : []);
clicks.forEach((c, k) => { c.kind = kindAt.get(tl.aroll[k + 1].recIn) || 'cut'; });
const sus = clicks.filter((c) => c.kind === 'cut' && c.ratio > 2 && c.peakDb > -50);
report.clicks = { seams: seams.length, cuts: clicks.filter((c) => c.kind === 'cut').length, suspect: sus.length, suspects: sus, worst: [...clicks].sort((a, b) => b.ratio - a.ratio).slice(0, 5), rule: 'suspect = at a real cut (not a punch-in through-edit), the biggest sample jump within 5 ms of the seam is > 2x the 99th percentile of jumps in the 200 ms around it (and above -50 dBFS)' };

// ---- words
if (!args['no-transcribe']) {
  const prefix = path.join(Q, 'qa-mix.transcript');
  const tr = spawnSync(process.execPath, [path.join(ROOT, 'pipeline/edit/transcribe.mjs'), '--in', render, '--out', prefix], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (tr.status !== 0) throw new Error(`transcribe failed: ${tr.stderr || tr.stdout}`);
  const heard = JSON.parse(fs.readFileSync(prefix + '.words.json', 'utf8'));
  // expected: the plain-pass raw words (same decoder as the check), mapped through the cut, minus what takes removed
  const rawWordsPath = [path.join(V, 'raw', 'transcript.plain.words.json'), path.join(V, 'raw', 'transcript.words.json')].find((p) => fs.existsSync(p));
  const rawWords = JSON.parse(fs.readFileSync(rawWordsPath, 'utf8'));
  const segs = tl.aroll.map((s) => ({ a: sec(s.srcIn), b: sec(s.srcOut), rec: sec(s.recIn) }));
  // raw time -> timeline time; a time inside removed dead air maps to the seam where that gap was closed (whisper
  // often stamps a word into a pause it was not spoken in, ~1 s off in the first real test)
  const toTl = (t) => {
    for (let k = 0; k < segs.length; k++) {
      const s = segs[k];
      if (t >= s.a && t < s.b) return s.rec + (t - s.a);
      if (t < s.a) return k === 0 ? null : s.rec;
    }
    return null;
  };
  const inCut = (t) => takes.cuts.some((c) => t >= c.from && t <= c.to);
  // a filler whose cut snapped to the sound can sit up to a second from whisper's time for it
  const isFiller = (w) => /^(um+|uh+|uhm|er+m?|ah+)$/.test(normWord(w.w));
  const fillerCut = (t) => takes.cuts.some((c) => c.kind === 'filler' && Math.abs((c.from + c.to) / 2 - t) <= 1.0);
  const expected = [];
  for (const w of rawWords) {
    const mid = (w.t + Math.max(w.t, w.end)) / 2;
    if (inCut(mid) || (isFiller(w) && fillerCut(mid))) continue;
    const at = toTl(mid); if (at != null) expected.push({ ...w, at });
  }
  // back from the timeline to raw time (for the fillers heard in the render)
  const toRaw = (t) => { for (const s of segs) if (t >= s.rec && t < s.rec + (s.b - s.a)) return s.a + (t - s.rec); return null; };
  const keptFillers = (takes.kept || []).filter((k) => k.kind === 'filler').map((k) => k.t);
  const cutFillers = takes.cuts.filter((c) => c.kind === 'filler');
  const pairs = alignWords(expected, heard);
  const mE = new Set(pairs.map((p) => p[0])), mH = new Set(pairs.map((p) => p[1]));
  const near = (t) => seams.reduce((best, s) => (Math.abs(s - t) < Math.abs(best - t) ? s : best), Infinity);
  const missing = expected.map((w, i) => ({ w: w.w, at: w.at, i })).filter((w) => !mE.has(w.i));
  const extra = heard.map((w, i) => ({ w: w.w, at: (w.t + w.end) / 2, i })).filter((w) => !mH.has(w.i));
  const R = 0.6;
  const nearSeam = (w) => Math.abs(near(w.at) - w.at) <= R;
  const zoneSec = seams.length * 2 * R, restSec = Math.max(1, sec(tl.durationFrames) - zoneSec);
  const bySeam = new Map();
  for (const [kind, list] of [['missing', missing], ['extra', extra]]) for (const w of list.filter(nearSeam)) {
    const s = near(w.at); if (!bySeam.has(s)) bySeam.set(s, { at: tc(s), sec: +s.toFixed(3), missing: [], extra: [] }); bySeam.get(s)[kind].push(w.w);
  }
  // every filler the render still has: one the plan meant to cut (a miss), one it left on purpose, or a new one the raw
  // transcript never had
  const rawFillers = rawWords.filter((w) => /^(um+|uh+|uhm|er+m?|ah+)$/.test(normWord(w.w))).map((w) => w.t);
  const fillersHeard = heard.filter((w) => /^(um+|uh+|uhm|er+m?|ah+)$/.test(normWord(w.w))).map((w) => {
    const raw = toRaw(w.t);
    const within = (t, d) => raw != null && Math.abs(t - raw) <= d;
    const missed = cutFillers.find((c) => within((c.from + c.to) / 2, 0.8));
    const verdict = missed ? 'CUT MISSED' : keptFillers.some((t) => within(t, 0.8)) ? 'left on purpose (no clean pause)' : rawFillers.some((t) => within(t, 0.8)) ? 'in the raw transcript, not cut' : 'not in the raw transcript';
    return { w: w.w, at: tc(w.t), raw: raw == null ? null : +raw.toFixed(2), verdict };
  });
  report.words = {
    expected: expected.length, heard: heard.length, aligned: pairs.length,
    missingNearSeams: missing.filter(nearSeam).length, missingElsewhere: missing.filter((w) => !nearSeam(w)).length,
    extraNearSeams: extra.filter(nearSeam).length, extraElsewhere: extra.filter((w) => !nearSeam(w)).length,
    ratePerMinNearSeams: +((missing.filter(nearSeam).length + extra.filter(nearSeam).length) / (zoneSec / 60)).toFixed(2),
    ratePerMinElsewhere: +((missing.filter((w) => !nearSeam(w)).length + extra.filter((w) => !nearSeam(w)).length) / (restSec / 60)).toFixed(2),
    seamsWithDifferences: [...bySeam.values()].sort((a, b) => a.sec - b.sec),
    fillersHeard,
    method: `expected = ${rel(rawWordsPath)} mapped through the cut minus takes.json cuts; heard = a fresh plain whisper pass on the render; "near" = within ${R} s of a seam`,
  };
}
fs.writeFileSync(path.join(Q, 'qa-report.json'), JSON.stringify(report, null, 2));
console.log(`[qa] duration ${report.duration.renderSec} s vs planned ${report.duration.plannedSec} s (${report.duration.diffFrames} frames) ${report.duration.ok ? 'OK' : 'MISMATCH'}`);
console.log(`[qa] loudness ${report.loudness.lufs} LUFS, LRA ${report.loudness.lra} LU, true peak ${report.loudness.truePeak} dBTP`);
console.log(`[qa] clicks: ${report.clicks.suspect}/${report.clicks.cuts} cuts suspect (${report.clicks.seams - report.clicks.cuts} punch-in through-edits cannot click); worst ${report.clicks.worst.map((c) => `${c.at} x${c.ratio} (${c.kind})`).join(', ')}`);
if (report.words) {
  const W = report.words;
  console.log(`[qa] words: ${W.aligned}/${W.expected} expected words heard; near seams ${W.missingNearSeams} missing + ${W.extraNearSeams} extra (${W.ratePerMinNearSeams}/min of seam zone) vs elsewhere ${W.missingElsewhere} + ${W.extraElsewhere} (${W.ratePerMinElsewhere}/min)`);
  for (const s of W.seamsWithDifferences.slice(0, 12)) console.log(`       ${s.at}: missing [${s.missing.join(' ')}] extra [${s.extra.join(' ')}]`);
  const fv = {}; for (const f of W.fillersHeard) fv[f.verdict] = (fv[f.verdict] || 0) + 1;
  console.log(`[qa] fillers heard in the render: ${W.fillersHeard.length} (${Object.entries(fv).map(([k, n]) => `${n} ${k}`).join(', ')})`);
  for (const f of W.fillersHeard.filter((x) => x.verdict === 'CUT MISSED')) console.log(`       CUT MISSED: "${f.w}" at ${f.at} (raw ${f.raw} s)`);
}
console.log(`[qa] wrote ${rel(path.join(Q, 'qa-report.json'))} (signal and transcript checks only; nobody has listened)`);
