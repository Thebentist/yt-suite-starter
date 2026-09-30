// Writes scenes/micro3d/plan.json from the current cut (edit/cut-words.json): anchors = the scenes' anchors, sfx cue times in
// scene seconds computed from the same word anchors the scenes use. Re-run after a re-cut:  node videos/bad-breath-for-good/scenes/micro3d/make-plan.cjs
const fs = require('fs'), path = require('path');
const base = path.resolve(__dirname, '..', '..');
const cw = JSON.parse(fs.readFileSync(path.join(base, 'edit', 'cut-words.json'), 'utf8'));
const byI = new Map(cw.words.map((w) => [w.i, w]));
const find = (i) => { let w = byI.get(i); for (let d = 1; !w && d < 30; d++) w = byI.get(i + d) || byI.get(i - d); if (!w) throw new Error('word not in cut: ' + i); return w; };
const T = (a) => (a.edge === 'end' ? find(a.word).end : find(a.word).t) + (a.offset || 0);
const r2 = (x) => Math.round(x * 100) / 100;

const scenes = [
  { id: 'colony3d', replaces: ['anaerobes'], start: { word: 1046, offset: -0.15 }, end: { word: 1104, offset: -0.15 }, tail: 0,
    sfx: [[null, 0.1, 'whoosh-soft'], [1050, -0.04, 'bubble-small'], [1076, 0, 'pop'], [1079, 0.05, 'tick'], [1082, 0.08, 'tick'], [1086, 0, 'whoosh-soft'], [1091, 0, 'pop'], [1098, 0, 'pop-high']] },
  { id: 'gas3d', replaces: ['sulfur-gas'], start: { word: 1144, offset: -0.15 }, end: { word: 1197, offset: -0.15 }, tail: 0,
    sfx: [[1147, 0.1, 'tick'], [1148, 0, 'bubble-small'], [1154, 0.05, 'pop-low'], [1154, 0.3, 'pop-low'], [1154, 0.55, 'pop-low'], [1162, 0, 'tick'], [1164, 0, 'whoosh-soft'], [1168, 0, 'pop'], [1170, 0.4, 'pop-low'], [1176, 0, 'tick'], [1184, -0.15, 'pop-low'], [1184, 0, 'whoosh-soft'], [1185, 0, 'pop']] },
  { id: 'lipid3d', replaces: ['nano-lipid'], start: { word: 3171, offset: -0.15 }, end: { word: 3220, offset: -0.15 }, tail: 0,
    sfx: [[null, 0.2, 'sparkle'], [3184, 0, 'pop-low'], [3185, 0, 'pop-low'], [3186, 0, 'pop-low'], [3196, -0.04, 'whoosh-soft'], [3202, 0, 'tick'], [3203, 0, 'pop']] },
  { id: 'lipid3d-pop', replaces: ['pop-balloon'], start: { word: 3501, offset: -0.15 }, end: { word: 3544, edge: 'end', offset: 0.25 }, tail: 0,
    sfx: [[null, 0.35, 'tick'], [3506, 0, 'whoosh-soft'], [3509, 0, 'bubble-small'], [3514, 0.2, 'splash'], [3525, 0, 'whoosh'], [3526, 0, 'pop'], [3529, 0.05, 'tock'], [3536, -0.04, 'whoosh-soft'], [3537, 0, 'pop'], [3539, -0.05, 'pop-high'], [3539, 0.27, 'pop-high'], [3539, 0.59, 'pop-high']] },
  { id: 'tonsilstone3d', replaces: [], start: { word: 1699, offset: -0.15 }, end: { word: 1778, offset: -0.15 }, tail: 0,
    sfx: [[1702, -0.1, 'tick'], [1707, -0.04, 'whoosh-soft'], [1721, 0, 'impact'], [1721, 0.05, 'pop-low'], [1727, -0.04, 'whoosh-soft'], [1749, -0.04, 'whoosh-long']] },
  { id: 'everybody3d', replaces: [], start: { word: 4558, edge: 'end', offset: 0.25 }, end: { word: 4614, offset: -0.15 }, tail: 0,
    sfx: [[4577, 0, 'tick'], [4589, -0.04, 'whoosh-soft'], [4593, 0, 'pop'], [4597, 0, 'whoosh'], [4608, -0.04, 'sparkle'], [4611, 0, 'pop']] },
];

const plan = scenes.map((s) => {
  const s0 = T(s.start), dur = T(s.end) - s0 + s.tail;
  const sfx = s.sfx.map(([w, off, kind]) => ({ t: r2((w == null ? 0 : find(w).t - s0) + off), kind })).filter((c) => c.t >= 0 && c.t < dur);
  return { id: s.id, output: `videos/bad-breath-for-good/scenes/out/${s.id}.mp4`, start: s.start, end: s.end, transparent: false, replaces: s.replaces, sfx, note: `on screen ${dur.toFixed(2)} s` };
});
fs.writeFileSync(path.join(__dirname, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
for (const p of plan) console.log(p.id.padEnd(15), p.note, 'replaces', JSON.stringify(p.replaces), p.sfx.length, 'sfx');
