#!/usr/bin/env node
/* Writes scenes/data/plan.json for the `data` group from edit/cut-words.json. start/end are exactly each scene's
 * defineScene anchor/anchorEnd; sfx cue times are in scene seconds, computed from the same anchors.
 * Re-run after a re-cut:  node videos/bad-breath-for-good/scenes/data/_plan.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VD = path.resolve(HERE, '..', '..');
const cw = new Map(JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'cut-words.json'), 'utf8')).words.map((w) => [w.i, w]));
const find = (i) => { let w = cw.get(i); for (let d = 1; !w && d < 30; d++) w = cw.get(i + d) || cw.get(i - d); if (!w) throw new Error('word not in cut: ' + i); return w; };
const T = (a) => (a.edge === 'end' ? find(a.word).end : find(a.word).t) + (a.offset || 0);
const r2 = (x) => Math.round(x * 100) / 100;
const S = (w, o = -0.15) => ({ word: w, offset: o }), E = (w, o = 0.25) => ({ word: w, edge: 'end', offset: o });

// [id, start anchor, end anchor, sfx: [word | 's<seconds>', offset, kind]]
const SCENES = [
  ['mouth-stat', S(439), S(465), [[446, -0.05, 'sparkle'], [448, -0.2, 'whoosh-soft'], [448, 0, 'tick'], [450, 0, 'pop'], [455, -0.08, 'whoosh-soft'], [459, -0.05, 'ding']]],
  ['one-in-three', S(465), E(494), [[478, -0.12, 'whoosh-soft'], [480, 0, 'pop'], [483, -0.05, 'pop-high'], [486, -0.1, 'paper'], [490, -0.1, 'scribble-short'], [493, 0, 'sparkle']]],
  ['study-card', S(632), E(720), [['s0.05', 0, 'paper'], [636, 0, 'scribble-short'], [659, -0.06, 'whoosh-soft'], [675, 0, 'pop'], [701, -0.2, 'buzz'], [717, 0, 'ding']]],
  ['belgium-globe', S(1290), E(1298), [['s0.05', 0, 'whoosh-long'], [1295, 0, 'pop'], [1298, -0.08, 'whoosh'], [1298, 0.3, 'pop-low'], [1298, 0.35, 'ding']]],
  ['clinic-2000', S(1328), S(1390), [[1328, 0, 'tick'], [1333, 0, 'ding'], [1348, -0.08, 'whoosh-soft'], [1359, -0.08, 'whoosh-soft'], [1377, 0, 'sparkle'], [1386, 0, 'scribble-short']]],
  ['sleep-saliva', S(1541), S(1610), [[1549, -0.1, 'whoosh-soft'], [1563, -0.06, 'pop'], [1567, -0.05, 'ding'], [1572, -0.17, 'whoosh'], [1600, 0, 'pop'], [1606, 0, 'buzz']]],
  ['ct-study', S(1778), S(1820), [[1791, 0, 'scribble-short'], [1797, -0.12, 'whoosh'], [1805, 0.1, 'sparkle'], [1811, 0, 'ding'], [1815, 0, 'pop']]],
  ['slice-pie', S(1820), E(1858), [['s0.15', 0, 'whoosh-soft'], [1828, -0.1, 'pop'], [1833, 0, 'scribble-short'], [1846, 0, 'pop'], [1851, 0, 'riser']]],
  ['research-weak', S(2418), S(2488), [['s0.3', 0, 'scribble'], [2442, 0, 'paper'], [2446, 0.25, 'impact'], [2459, -0.25, 'whoosh-soft'], [2465, -0.12, 'buzz']]],
  ['scraper-vs-brush', S(2488), S(2552), [[2495, 0, 'pop'], [2511, 0, 'pop-high'], [2517, 0, 'pop'], [2519, 0, 'scribble-short'], [2528, 0, 'tick'], [2549, 0, 'ding']]],
  ['ad-claims', E(3329), S(3501), [[3336, -0.05, 'pop'], [3344, -0.12, 'whoosh'], [3346, 0, 'riser'], [3354, 0, 'pop'], [3414, 0, 'paper'], [3426, -0.1, 'ding']]],
  ['two-weeks', S(4456), E(4558), [[4467, -0.24, 'pop'], [4473, -0.24, 'tick'], [4478, 0, 'ding'], [4485, -0.07, 'buzz'], [4490, -0.06, 'whoosh-soft'], [4541, 0, 'pop']]],
];

const plan = SCENES.map(([id, start, end, sfx]) => {
  const t0 = T(start);
  const at = (w, off) => r2(typeof w === 'string' ? +w.slice(1) + off : find(w).t - t0 + off);
  // study-card plays the restored phase-1 look (Ben, v4d notes); the phase-2 version stays in study-card.js / study-card.mp4
  const file = id === 'study-card' ? 'study-card-v1' : id;
  return { id, output: `videos/bad-breath-for-good/scenes/out/${file}.mp4`, start, end, transparent: false, sfx: sfx.map(([w, off, kind]) => ({ t: at(w, off), kind })) };
});
fs.writeFileSync(path.join(HERE, 'plan.json'), JSON.stringify(plan, null, 1) + '\n');
// quick self-check: spans and overlaps within the group
const spans = plan.map((p) => [p.id, T(p.start), T(p.end)]).sort((a, b) => a[1] - b[1]);
for (let i = 1; i < spans.length; i++) if (spans[i][1] < spans[i - 1][2] - 1e-6) console.log('OVERLAP', spans[i - 1][0], spans[i][0]);
console.log(`wrote plan.json (${plan.length} scenes)`);
