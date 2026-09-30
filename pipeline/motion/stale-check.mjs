#!/usr/bin/env node
// Find stale frames in scene renders: a frame that repeats an earlier frame (usually the one `lag` frames back, the
// same render page's previous draw) while differing from both neighbours. Seen when a WebGL canvas was drawn into the
// 2D frame under GPU load before its new image was ready (papillae3d, 2026-09-29): a 0.1 s backward jump that reads as
// stutter.
//   node pipeline/motion/stale-check.mjs --slug bad-breath-for-good [--ids a,b] [--lag 3]
// Prints one line per scene with stale frames (frame numbers). Luma at 160x90; thresholds in mean absolute difference.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const VD = path.join(ROOT, 'videos', args.slug);
const W = 160, H = 90, N = W * H;
const placed = JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'placed.json'), 'utf8')).overlays;
const spec = JSON.parse(fs.readFileSync(path.join(VD, 'out', 'final-spec.json'), 'utf8'));
const want = args.ids ? new Set(String(args.ids).split(',')) : null;
const files = [];
if (args.file) files.push({ id: path.basename(String(args.file)), file: path.resolve(ROOT, String(args.file)) });
else for (const o of spec.overlays) if (!want || want.has(o.name)) files.push({ id: o.name, file: spec.media[o.media].path });

const frames = (file) => new Promise((res, rej) => {
  const ff = spawn(FFMPEG, ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-']);
  const out = []; let buf = Buffer.alloc(0);
  ff.stdout.on('data', (d) => { buf = Buffer.concat([buf, d]); while (buf.length >= N) { out.push(buf.subarray(0, N)); buf = buf.subarray(N); } });
  ff.on('close', (c) => (c === 0 ? res(out) : rej(new Error('ffmpeg ' + c))));
});
const mad = (a, b) => { let s = 0; for (let i = 0; i < N; i++) s += Math.abs(a[i] - b[i]); return s / N; };

let total = 0;
for (const f of files) {
  let fr; try { fr = await frames(f.file); } catch { console.log(`${f.id}: unreadable`); continue; }
  const stale = [];
  for (let i = 4; i + 1 < fr.length; i++) {
    const dPrev = mad(fr[i], fr[i - 1]), dNext = mad(fr[i], fr[i + 1]);
    if (dPrev < 2 || dNext < 2) continue;                   // a still or a hold: not a stale frame
    for (let k = 2; k <= 4; k++) {                            // repeats an older frame far better than its neighbours
      const dOld = mad(fr[i], fr[i - k]);
      if (dOld < 0.35 * Math.min(dPrev, dNext) && dOld < 1.5) { stale.push(i); break; }
    }
  }
  total += stale.length;
  if (stale.length) console.log(`${f.id}: ${stale.length} stale frame(s) at ${stale.slice(0, 12).join(', ')}${stale.length > 12 ? ' ...' : ''}`);
}
console.log(JSON.stringify({ scenes: files.length, staleFrames: total }));
