#!/usr/bin/env node
/* Frames from a video with a labelled 10% grid, so Claude can LOOK and read a position (e.g. the speaker's eyes for
 * the punch-in anchor) instead of guessing.
 *
 *   node pipeline/resolve/frame-grid.mjs --in videos/<slug>/raw/take.mp4 [--at 5,120,300] [--out videos/<slug>/work/grid.jpg]
 *
 * One JPEG, the frames side by side at 960 px wide each, grid lines every 10% (labels = percent from the left / top,
 * which is what build-timeline --anchor takes: --anchor 50,38 means 50% across, 38% down).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFF, probeMedia, parseArgs, drawtextFont } from './media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
if (!args.in) { console.error('usage: --in <video> [--at s1,s2,...] [--out <jpg>]'); process.exit(1); }
const input = path.resolve(ROOT, args.in);
const m = probeMedia(input);
const times = String(args.at || [0.1, 0.5, 0.9].map((f) => +(m.duration * f).toFixed(1)).join(',')).split(',').map(Number);
const out = path.resolve(ROOT, args.out || path.join(path.dirname(path.dirname(input)), 'work', 'grid.jpg'));
fs.mkdirSync(path.dirname(out), { recursive: true });
const font = drawtextFont();
const W = 960, H = Math.round(W * m.height / m.width / 2) * 2;
const lines = [];
for (let k = 1; k < 10; k++) {
  lines.push(`drawbox=x=${Math.round(W * k / 10)}:y=0:w=1:h=${H}:color=yellow@0.6:t=fill`, `drawbox=x=0:y=${Math.round(H * k / 10)}:w=${W}:h=1:color=yellow@0.6:t=fill`);
  if (font) lines.push(`drawtext=${font}:text='${k * 10}':x=${Math.round(W * k / 10) + 3}:y=3:fontsize=16:fontcolor=yellow`, `drawtext=${font}:text='${k * 10}':x=3:y=${Math.round(H * k / 10) + 2}:fontsize=16:fontcolor=yellow`);
}
const tmp = [];
for (const [i, t] of times.entries()) {
  const f = out.replace(/\.jpg$/i, `.${i}.png`);
  const label = font ? `,drawtext=${font}:text='${t} s':x=w-tw-8:y=h-th-8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6` : '';
  await runFF(['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', input, '-frames:v', '1', '-vf', `scale=${W}:${H},${lines.join(',')}${label}`, f]);
  tmp.push(f);
}
await runFF(['-y', '-hide_banner', '-loglevel', 'error', ...tmp.flatMap((f) => ['-i', f]), '-filter_complex', `${tmp.map((_, i) => `[${i}]`).join('')}hstack=${tmp.length}`, out]);
for (const f of tmp) fs.rmSync(f, { force: true });
console.log(JSON.stringify({ out: path.relative(ROOT, out).split(path.sep).join('/'), times, source: `${m.width}x${m.height}` }));
