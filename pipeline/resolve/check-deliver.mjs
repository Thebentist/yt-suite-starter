#!/usr/bin/env node
/* Check a delivered render against the plan before anyone uploads it (a "successful" render once came out audio-only).
 *
 *   node pipeline/resolve/check-deliver.mjs --slug <slug> [--file videos/<slug>/out/deliver/<name>.mp4]
 *
 * PASS/FAIL: a video stream exists at the timeline's size and frame rate; duration equals the planned timeline to the
 * frame; audio is present (codec, rate); loudness and true peak are reported; bit rate is reported. Writes
 * out/deliver/<name>.frames.jpg (start, 25%, 50%, 75%, near the end) for Claude to LOOK at.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFPROBE, runFF, parseArgs } from './media.mjs';
import { resolveTimeline } from './fcpxml.mjs';
import { loudness } from '../edit/clean-audio.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const args = parseArgs(process.argv.slice(2));
if (!args.slug) { console.error('usage: --slug <slug> [--file <mp4>]'); process.exit(2); }
const O = path.join(ROOT, 'videos', args.slug, 'out');
const dir = path.join(O, 'deliver');
const file = args.file ? path.resolve(ROOT, args.file) : fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(mp4|mov)$/i.test(f)).map((f) => path.join(dir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] : null;
if (!file || !fs.existsSync(file)) { console.error('no delivered file in out/deliver (run out/resolve-deliver.py in Resolve)'); process.exit(2); }
// the assembled edit (out/final-spec.json, from pipeline/edit/assemble.mjs) is what gets delivered when it exists;
// timeline-spec.json is only the rough cut it started from (a v4f check once compared against it and falsely failed)
const spec = JSON.parse(fs.readFileSync(path.join(O, fs.existsSync(path.join(O, 'final-spec.json')) ? 'final-spec.json' : 'timeline-spec.json'), 'utf8'));
const tl = resolveTimeline(spec, { baseDir: O });
const fpsT = tl.fps.num / tl.fps.den, planned = tl.durationFrames / fpsT;
const pr = JSON.parse(spawnSync(FFPROBE, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], { encoding: 'utf8' }).stdout);
const v = pr.streams.find((s) => s.codec_type === 'video'), a = pr.streams.find((s) => s.codec_type === 'audio');
const rate = (r) => { const [n, d] = String(r || '0/1').split('/').map(Number); return d ? n / d : 0; };
const dur = +pr.format.duration;
const checks = [];
const add = (name, ok, detail) => checks.push({ name, ok, detail });
add('video stream', !!v, v ? `${v.codec_name} ${v.profile || ''} ${v.width}x${v.height} ${rate(v.r_frame_rate).toFixed(3)} fps ${v.pix_fmt}` : 'NONE: this file has no picture');
if (v) {
  add('size', v.width === tl.width && v.height === tl.height, `${v.width}x${v.height} (timeline ${tl.width}x${tl.height})`);
  add('frame rate', Math.abs(rate(v.r_frame_rate) - fpsT) < 0.01, `${rate(v.r_frame_rate).toFixed(3)} (timeline ${fpsT.toFixed(3)})`);
}
add('duration', Math.abs(dur - planned) <= 1.5 / fpsT, `${dur.toFixed(3)} s (planned ${planned.toFixed(3)} s)`);
add('audio stream', !!a, a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch${a.bit_rate ? ` ${Math.round(a.bit_rate / 1000)} kb/s` : ''}` : 'NONE');
const loud = a ? await loudness(file) : null;
const mbps = +(pr.format.bit_rate / 1e6).toFixed(1);
const report = { file: rel(file), sizeMB: +(fs.statSync(file).size / 1048576).toFixed(1), totalMbps: mbps, videoMbps: v?.bit_rate ? +(v.bit_rate / 1e6).toFixed(1) : null, loudness: loud, checks, passed: checks.every((c) => c.ok) };
if (v) {
  const out = file.replace(/\.[^.]+$/, '.frames.jpg');
  const ts = [0.5, dur * 0.25, dur * 0.5, dur * 0.75, Math.max(0.5, dur - 1)];
  const tmp = [];
  for (const [i, t] of ts.entries()) { const f = file.replace(/\.[^.]+$/, `.f${i}.png`); await runFF(['-y', '-hide_banner', '-loglevel', 'error', '-ss', t.toFixed(2), '-i', file, '-frames:v', '1', '-vf', 'scale=640:-2', f]); tmp.push(f); }
  await runFF(['-y', '-hide_banner', '-loglevel', 'error', ...tmp.flatMap((f) => ['-i', f]), '-filter_complex', `${tmp.map((_, i) => `[${i}]`).join('')}hstack=${tmp.length}`, out]);
  for (const f of tmp) fs.rmSync(f, { force: true });
  report.frames = rel(out);
}
fs.writeFileSync(file.replace(/\.[^.]+$/, '.check.json'), JSON.stringify(report, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
console.log(`[deliver] ${report.file}: ${report.sizeMB} MB, ${mbps} Mb/s total${report.videoMbps ? ` (video ${report.videoMbps})` : ''}; loudness ${loud?.lufs} LUFS, true peak ${loud?.truePeak} dBTP${report.frames ? `; frames: ${report.frames} (look at them)` : ''}`);
console.log(report.passed ? '[deliver] all checks passed' : '[deliver] FAILED: do not upload this file');
process.exit(report.passed ? 0 : 1);
