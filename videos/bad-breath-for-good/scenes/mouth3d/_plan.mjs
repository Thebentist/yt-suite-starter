#!/usr/bin/env node
/* Writes scenes/mouth3d/plan.json from the current edit/cut-words.json and prints a check table.
 *   node videos/bad-breath-for-good/scenes/mouth3d/_plan.mjs
 * Each scene's start/end equal its defineScene anchor/anchorEnd. SFX cues are anchored to words ([word, offset, kind],
 * or [null, t, kind] for a fixed scene time), converted to scene seconds in the current cut. Re-run after a re-cut.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..', '..', '..', '..');
const cw = JSON.parse(fs.readFileSync(path.join(ROOT, 'videos/bad-breath-for-good/edit/cut-words.json'), 'utf8')).words;
const W = new Map(cw.map((w) => [w.i, w]));
const find = (i) => { let w = W.get(i); for (let d = 1; !w && d < 30; d++) w = W.get(i + d) || W.get(i - d); if (!w) throw new Error('word not in cut: ' + i); return w; };
const anchorT = (a) => (a.edge === 'end' ? find(a.word).end : find(a.word).t) + (a.offset || 0);

const SCENES = [
  { id: 'papillae3d', replaces: ['papillae-fly'], start: { word: 940, offset: -0.15 }, end: { word: 991, offset: -0.15 },
    sfx: [[null, 0.05, 'whoosh-soft'], [946, -0.25, 'whoosh-long'], [949, -0.1, 'whoosh-soft'], [959, 0, 'pop'], [961, 0, 'scribble-short'],
      [965, -0.15, 'whoosh-long'], [972, 0, 'pop'], [972, 0.15, 'scribble-short'], [980, 0, 'scribble-short'], [986, -0.1, 'whoosh-soft']] },
  { id: 'carpet3d', replaces: ['carpet-gunk'], start: { word: 991, offset: -0.15 }, end: { word: 1046, offset: -0.15 },
    sfx: [[null, 0.05, 'whoosh-soft'], [996, -0.1, 'whoosh-soft'], [999, -0.2, 'whoosh'], [1005, 0.05, 'scribble-short'], [1017, 0, 'pop'],
      [1021, 0, 'pop'], [1023, 0, 'pop-high'], [1031, 0, 'splash'], [1038, 0, 'pop-low'], [1038, 0.6, 'scribble-short']] },
  { id: 'coated3d', replaces: ['coated-tongue'], start: { word: 1221, offset: -0.15 }, end: { word: 1270, edge: 'end', offset: 0.25 },
    sfx: [[null, 0.05, 'whoosh-soft'], [1228, -0.1, 'sparkle'], [1234, 0, 'whoosh-soft'], [1241, 0, 'pop'], [1242, 0, 'pop'], [1248, 0, 'pop-low'],
      [1259, 0, 'pop-high'], [1263, 0, 'pop'], [1266, -0.1, 'whoosh-soft']] },
  { id: 'scrape3d', replaces: ['scrape-how'], start: { word: 2702, offset: -0.15 }, end: { word: 2858, offset: -0.15 },
    sfx: [[2713, -0.1, 'whoosh'], [2713, 0.1, 'pop'], [2744, 0, 'pop'], [2748, 0, 'pop'], [2752, 0, 'pop'], [2774, -0.1, 'whoosh-soft'],
      [2777, 0, 'pop'], [2781, 0, 'scribble'], [2789, 0, 'splash'], [2795, 0, 'pop'], [2795, -0.05, 'scribble-short'], [2802, -0.13, 'scribble-short'],
      [2812, -0.1, 'buzz'], [2812, 0, 'scribble-short'], [2825, 0, 'pop'], [2837, 0, 'scribble-short'], [2854, 0, 'pop-high'], [2857, 0, 'sparkle']] },
  { id: 'regrow3d', replaces: ['no-permanent'], start: { word: 4373, offset: -0.15 }, end: { word: 4456, offset: -0.15 },
    sfx: [[null, 0.1, 'whoosh-soft'], [4377, 0, 'scribble-short'], [4380, -0.1, 'whoosh-long'], [4388, -0.1, 'whoosh-soft'], [4388, 0.08, 'pop-high'], [4390, 0.1, 'sparkle']] },
];

const plan = [], rows = [];
for (const s of SCENES) {
  const t0 = anchorT(s.start), t1 = anchorT(s.end), len = t1 - t0;
  const sfx = s.sfx.map(([w, off, kind]) => ({ t: +(w == null ? off : find(w).t - t0 + off).toFixed(2), kind })).filter((c) => c.t >= 0 && c.t < len).sort((a, b) => a.t - b.t);
  plan.push({ id: s.id, output: `videos/bad-breath-for-good/scenes/out/${s.id}.mp4`, start: s.start, end: s.end, transparent: false, replaces: s.replaces, sfx });
  rows.push(`${s.id.padEnd(12)} timeline ${t0.toFixed(2).padStart(7)}  on screen ${len.toFixed(2).padStart(5)} s  sfx ${sfx.length}  replaces ${s.replaces.join(',')}`);
}
fs.writeFileSync(path.join(DIR, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
console.log(rows.join('\n'));
