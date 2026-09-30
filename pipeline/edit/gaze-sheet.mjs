#!/usr/bin/env node
// Look at the gaze pass: for a sample of its trims (edit/gaze-report.json edits), a strip per cut of the two frames
// kept next to the cut (green) and the first two removed (red), face crop from the proxy.
//   node pipeline/edit/gaze-sheet.mjs --slug bad-breath-for-good [--n 12] [--edge tail|head] [--crop 480:300:720:260]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const VD = path.join(ROOT, 'videos', args.slug);
const rep = JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'gaze-report.json'), 'utf8'));
const src = path.join(VD, 'work', 'proxy', 'take.clean.mov');
const crop = args.crop || '480:300:720:260', n = +(args.n || 12), edge = args.edge || 'tail';
const edits = rep.edits.filter((e) => e.edge === edge);
const pick = []; for (let k = 0; k < n && edits.length; k++) pick.push(edits[Math.floor((k + 0.5) * edits.length / n)]);
const outDir = path.join(VD, 'work', 'look'); fs.mkdirSync(outDir, { recursive: true });
const rows = [];
for (const [k, e] of pick.entries()) {
  // tail: kept = to-2f, to-1f ; removed = to, to+1f      head: removed = to-2f, to-1f ; kept = to, to+1f
  const t0 = e.to - 2 / 30;
  const [c1, c2] = edge === 'tail' ? ['green', 'red'] : ['red', 'green'];
  const f = path.join(outDir, `gaze-${edge}-${k}.jpg`);
  const vf = `crop=${crop},scale=240:-2,tile=4x1,drawbox=x=0:y=0:w=480:h=ih:color=${c1}:t=5,drawbox=x=480:y=0:w=480:h=ih:color=${c2}:t=5`;
  const r = spawnSync(FFMPEG, ['-v', 'error', '-y', '-ss', t0.toFixed(4), '-t', (6.5 / 30).toFixed(4), '-i', src, '-vf', vf, '-frames:v', '1', f]);
  if (r.status === 0) rows.push(f);
}
const sheet = path.join(outDir, `gaze-${edge}-sheet.jpg`);
spawnSync(FFMPEG, ['-v', 'error', '-y', ...rows.flatMap((f) => ['-i', f]), '-filter_complex', `${rows.map((_, i) => `[${i}:v]`).join('')}vstack=${rows.length}`, sheet]);
console.log(JSON.stringify({ sheet: path.relative(ROOT, sheet).split(path.sep).join('/'), rows: rows.length, of: edits.length, cuts: pick.map((e) => e.to) }));
