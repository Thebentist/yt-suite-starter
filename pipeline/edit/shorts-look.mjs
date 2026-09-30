#!/usr/bin/env node
// Look before choosing vertical layouts (short-form cut-downs): contact sheets of what the plan's pieces put on screen.
//   node pipeline/edit/shorts-look.mjs --slug bad-breath-for-good [--dir tiktok]
// Writes <dir>/work/look-graphics.jpg: every full-screen graphic the plan uses, 3 frames across its used stretch, with
// the centred 9:16 slice outlined (a subject inside the box can go full-screen: layout.json graphics.<name>.mode
// "fill"; one that widens past it stays in the panel, or gets "until"). And <dir>/work/look-overlays.jpg: every
// partial overlay (cards, chips, doodles) as it sits in the finished long cut (left) and alone on grey with a 10%
// grid (right), to set layout.json overlays.<name> (map / box parts with regions / pin / skip). The legend (cell order)
// is printed.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const VD = path.join(ROOT, 'videos', args.slug), TT = path.join(VD, args.dir || 'tiktok');
const plan = JSON.parse(fs.readFileSync(path.join(TT, 'plan.resolved.json'), 'utf8'));
const spec = JSON.parse(fs.readFileSync(path.join(VD, 'out', 'final-spec.json'), 'utf8'));
const dd = path.join(VD, 'out', 'final', 'deliver');
const master = fs.existsSync(dd) ? fs.readdirSync(dd).filter((f) => /\.mp4$/i.test(f)).map((f) => path.join(dd, f)).sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0] : null;
const spans = plan.clips.flatMap((c) => c.segments.filter((s) => !s.foreign).map((s) => [s.t0, s.t1, c.id]));
const used = new Map();
for (const o of spec.overlays) {
  if (/^chapter-/.test(o.name)) continue;
  for (const [a, b, id] of spans) {
    const x = Math.max(a, o.at), y = Math.min(b, o.at + o.duration);
    if (y - x > 0.2) { const u = used.get(o.name) || { o, from: x, to: y, clips: new Set() }; u.from = Math.min(u.from, x); u.to = Math.max(u.to, y); u.clips.add(id); used.set(o.name, u); }
  }
}
fs.mkdirSync(path.join(TT, 'work'), { recursive: true });
function sheet(cells, out, cols, w, h) {
  if (!cells.length) return;
  const ins = [], fc = [];
  cells.forEach((c, i) => { ins.push(...c.input); fc.push(`${c.filter(i)}[f${i}]`); });
  const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...ins, '-filter_complex',
    `${fc.join(';')};${cells.map((_, i) => `[f${i}]`).join('')}xstack=inputs=${cells.length}:layout=${cells.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|')}:fill=black`, '-frames:v', '1', out], { encoding: 'utf8' });
  if (r.status) console.error(r.stderr.slice(-600));
}
// full-screen graphics with the 9:16 slice: by default only those on screen in a clip's first 4 s (the hook, where
// full-screen matters most); --all for every one
const starts = plan.clips.map((c) => c.segments.find((s) => !s.foreign)).filter(Boolean).map((s) => [s.t0, s.t0 + 4]);
const full = [...used.values()].filter((u) => u.o.mode === 'fullscreen' && (args.all || starts.some(([a, b]) => u.o.at < b && u.o.at + u.o.duration > a)));
const gCells = [], gLegend = [];
for (const u of full) for (const k of [0.1, 0.5, 0.9]) {
  const t = u.from + (u.to - u.from) * k, src = spec.media[u.o.media].path, n = gCells.length;
  gCells.push({ input: ['-ss', Math.max(0, (u.o.in || 0) + t - u.o.at).toFixed(2), '-i', src], filter: (i) => `[${i}:v]trim=end_frame=1,scale=480:270,drawbox=x=${(480 - 152) / 2}:y=0:w=152:h=270:color=yellow@0.9:t=2` });
  gLegend.push(`${n}: ${u.o.name} @${t.toFixed(1)} (${[...u.clips].join(',')})`);
}
sheet(gCells, path.join(TT, 'work', 'look-graphics.jpg'), 6, 480, 270);
// partial overlays: in the master, and alone on grey (each alone-frame goes through a PNG first: seeking a ProRes
// 4444 input inside the same graph as a colour source came out blank)
const part = [...used.values()].filter((u) => u.o.mode !== 'fullscreen');
const lookDir = path.join(TT, 'work', 'look'); fs.mkdirSync(lookDir, { recursive: true });
const oCells = [], oLegend = [];
for (const u of part) {
  const t = u.o.at + Math.min(u.o.duration * 0.6, u.o.duration - 0.2), src = spec.media[u.o.media].path;
  const png = path.join(lookDir, `${u.o.name}.png`);
  spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', Math.max(0, (u.o.in || 0) + t - u.o.at).toFixed(2), '-i', src, '-frames:v', '1', '-vf', 'scale=480:270', png]);
  oCells.push(master ? { input: ['-ss', t.toFixed(2), '-i', master], filter: (i) => `[${i}:v]trim=end_frame=1,scale=480:270` } : { input: ['-f', 'lavfi', '-i', 'color=c=black:s=480x270:d=1'], filter: (i) => `[${i}:v]trim=end_frame=1` });
  oCells.push({ input: ['-i', png], alone: true });
  oLegend.push(`${oLegend.length}: ${u.o.name} (${u.o.mode}, lane ${u.o.lane}) @${t.toFixed(1)} (${[...u.clips].join(',')})`);
}
{
  // grey + grid under each alone-frame: one colour source, split
  const ins = [], fc = []; let k = 0;
  const greys = oCells.filter((c) => c.alone).length;
  oCells.forEach((c, i) => { ins.push(...c.input); fc.push(c.alone ? `[${k}:v]format=yuva420p[a${i}];[g${i}][a${i}]overlay=0:0,drawgrid=w=48:h=27:t=1:c=white@0.3[f${i}]` : `${c.filter(k)}[f${i}]`); k++; });
  const gIdx = k; ins.push('-f', 'lavfi', '-i', 'color=c=0x707070:s=480x270:d=1');
  const gl = oCells.map((c, i) => (c.alone ? `[g${i}]` : '')).join('');
  if (oCells.length) {
    const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...ins, '-filter_complex',
      `[${gIdx}:v]split=${greys}${gl};${fc.join(';')};${oCells.map((_, i) => `[f${i}]`).join('')}xstack=inputs=${oCells.length}:layout=${oCells.map((_, i) => `${(i % 4) * 480}_${Math.floor(i / 4) * 270}`).join('|')}:fill=black`,
      '-frames:v', '1', path.join(TT, 'work', 'look-overlays.jpg')], { encoding: 'utf8' });
    if (r.status) console.error(r.stderr.slice(-600));
  }
}
console.log(`look-graphics.jpg (6 per row, 3 frames per graphic):\n  ${gLegend.join('\n  ')}`);
console.log(`look-overlays.jpg (pairs: in the long cut | alone on grey):\n  ${oLegend.join('\n  ')}`);
