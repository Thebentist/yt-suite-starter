// Builds scenes/story/plan.json from word-anchored specs, so every sfx cue follows the cut (scene seconds are computed from
// edit/cut-words.json at build time; re-run after any re-cut):   node videos/bad-breath-for-good/scenes/story/_plan.cjs
// sfx: { w: <raw word>, off: <s>, edge: 'end'?, kind } (time = that word relative to the scene start) or { t: <scene s>, kind }.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../../');
const cw = JSON.parse(fs.readFileSync(path.join(ROOT, 'videos/bad-breath-for-good/edit/cut-words.json'), 'utf8')).words;
const beats = JSON.parse(fs.readFileSync(path.join(ROOT, 'videos/bad-breath-for-good/edit/beats.json'), 'utf8'));
const by = new Map(cw.map((w) => [w.i, w]));
const find = (i) => { let w = by.get(i); for (let d = 1; !w && d < 30; d++) w = by.get(i + d) || by.get(i - d); if (!w) throw new Error('word not in cut: ' + i); return w; };
const T = (a) => { if (a.special) { const p = beats.pieces.find((x) => x.special === a.special); return p.at + (a.offset || 0); } const w = find(a.word); return (a.edge === 'end' ? w.end : w.t) + (a.offset || 0); };
const OUT = 'videos/bad-breath-for-good/scenes/out/';
// Ben (v4d): keep the phase-1 illustrated look for the scenes with people. These ids render from <id>-v1.js to out/<id>-v1.mp4.
const V1 = new Set(['hook-lean', 'who-tells', 'house-smell', 'nose-adapt', 'face-breath', 'cup-hand']);
const S = (w) => ({ word: w, offset: -0.15 }), E = (w, o = 0.25) => ({ word: w, edge: 'end', offset: o });
const specs = [
  { id: 'hook-lean', start: S(258), end: E(291), sfx: [{ t: 0, kind: 'whoosh-soft' }, { w: 264, off: -0.04, kind: 'whoosh-soft' }, { w: 270, off: -0.04, kind: 'whoosh-soft' }, { w: 277, kind: 'impact' }, { w: 282, kind: 'scribble-short' }, { w: 287, kind: 'bubble' }, { w: 289, kind: 'pop' }, { w: 290, kind: 'pop' }, { w: 291, kind: 'pop-high' }] },
  { id: 'who-tells', start: S(320), end: E(329), sfx: [{ t: 0, kind: 'whoosh-soft' }, { w: 324, off: -0.04, kind: 'whoosh' }, { w: 329, kind: 'pop' }] },
  { id: 'house-smell', start: S(347), end: S(388), sfx: [{ w: 357, kind: 'whoosh-soft' }, { w: 361, off: -0.03, kind: 'whoosh-soft' }, { w: 372, off: -0.03, kind: 'whoosh-soft' }, { w: 372, off: 0.5, kind: 'scribble-short' }, { w: 381, off: -0.03, kind: 'whoosh' }, { w: 383, kind: 'pop' }] },
  { id: 'not-food', start: S(388), end: E(417), sfx: [{ w: 389, kind: 'pop-low' }, { w: 398, off: -0.04, kind: 'whoosh-soft' }, { w: 406, off: -0.04, kind: 'whoosh' }, { w: 406, off: 0.1, kind: 'pop' }, { w: 413, off: -0.04, kind: 'whoosh-soft' }, { w: 415, off: -0.25, kind: 'scribble' }, { w: 416, kind: 'pop' }] },
  { id: 'question-title', start: S(517), end: E(529, 1.2), sfx: [{ t: 0.1, kind: 'pop-low' }, { w: 524, off: -0.04, kind: 'whoosh-soft' }, { w: 526, off: -0.04, kind: 'whoosh-soft' }, { w: 528, off: -0.03, kind: 'impact' }, { w: 529, kind: 'impact' }, { w: 529, off: 0.3, kind: 'scribble' }] },
  { id: 'nose-adapt', start: E(529, 1.2), end: S(575), sfx: [{ t: 0.2, kind: 'bubble-small' }, { w: 556, kind: 'paper' }, { w: 558, kind: 'pop' }, { w: 570, kind: 'pop' }] },
  { id: 'face-breath', start: S(575), end: S(599), sfx: [{ t: 0.1, kind: 'whoosh-soft' }, { w: 589, kind: 'tick' }, { w: 592, off: -0.1, kind: 'scribble-short' }, { w: 596, kind: 'scribble' }] },
  { id: 'cup-hand', start: S(599), end: S(632), sfx: [{ w: 603, off: -0.1, kind: 'whoosh-soft' }, { w: 610, off: -0.15, kind: 'bubble-small' }, { w: 613, kind: 'buzz' }, { w: 623, off: -0.1, kind: 'scribble' }] },
  { id: 'wrist-steps', start: S(728), end: E(775), sfx: [{ w: 732, off: -0.35, kind: 'scribble-short' }, { w: 734, kind: 'paper' }, { w: 744, off: -0.1, kind: 'pop' }, { w: 756, off: -0.05, kind: 'pop' }, { w: 764, kind: 'ding' }, { w: 774, off: -0.05, kind: 'pop' }] },
  { id: 'countdown', start: { special: 'wrist-wait', offset: 0 }, duration: 1.35, transparent: true, lane: 2, sfx: [{ t: 0.0, kind: 'whoosh' }, { t: 0.1, kind: 'tick' }, { t: 0.35, kind: 'tick' }, { t: 0.6, kind: 'tick' }, { t: 0.74, kind: 'pop' }, { t: 1.12, kind: 'whoosh-soft' }] },
  { id: 'saliva-washer', start: S(1509), end: S(1541), sfx: [{ w: 1513, off: -0.1, kind: 'bubble' }, { w: 1524, kind: 'pop' }, { w: 1528, off: -0.1, kind: 'whoosh' }, { w: 1529, kind: 'splash' }, { w: 1538, kind: 'scribble-short' }] },
  { id: 'tried-everything', start: S(2129), end: E(2171), sfx: [{ t: 0.3, kind: 'pop' }, { w: 2133, kind: 'scribble-short' }, { w: 2138, kind: 'pop-low' }, { w: 2140, off: -0.3, kind: 'whoosh' }, { w: 2147, kind: 'paper' }, { w: 2151, kind: 'pop-high' }, { w: 2155, kind: 'pop' }, { w: 2157, kind: 'pop' }, { w: 2159, kind: 'pop' }, { w: 2165, kind: 'buzz' }, { w: 2168, kind: 'buzz' }, { w: 2169, kind: 'buzz' }] },
  { id: 'zero-pro-card', start: S(3302), end: E(3329), sfx: [{ t: 0.3, kind: 'whoosh-soft' }, { w: 3310, kind: 'pop-low' }, { w: 3314, kind: 'pop-low' }, { w: 3322, kind: 'pop-low' }, { w: 3326, off: -0.3, kind: 'riser' }, { w: 3328, kind: 'impact' }, { w: 3329, kind: 'sparkle' }] },
  { id: 'recap', start: S(4614), end: E(4640), sfx: [{ t: 0.4, kind: 'whoosh-soft' }, { w: 4619, kind: 'pop' }, { w: 4620, kind: 'pop' }, { w: 4622, kind: 'pop' }, { w: 4624, kind: 'ding' }] },
  { id: 'end-question', start: S(4764), end: E(4773, 0.8), sfx: [{ w: 4765, kind: 'pop-low' }, { w: 4767, kind: 'pop' }, { w: 4773, kind: 'pop-high' }, { w: 4773, off: 0.25, kind: 'bubble-small' }] },
  { id: 'teeth-belief', start: E(1270), end: S(1290), sfx: [{ w: 1275, off: -0.1, kind: 'pop' }, { w: 1279, off: -0.04, kind: 'whoosh-soft' }, { w: 1280, kind: 'sparkle' }, { w: 1282, off: -0.04, kind: 'whoosh' }, { w: 1288, off: -0.1, kind: 'scribble' }], pending: true },
];
const out = [];
for (const s of specs) {
  const file = OUT + s.id + (V1.has(s.id) ? '-v1' : '') + (s.transparent ? '.mov' : '.mp4');
  if (s.pending && !fs.existsSync(path.join(ROOT, file))) continue;         // new scenes join the plan once rendered
  const t0 = T(s.start), dur = s.end ? T(s.end) - t0 : s.duration;
  const sfx = (s.sfx || []).map((c) => ({ t: +(c.t != null ? c.t : ((c.edge === 'end' ? find(c.w).end : find(c.w).t) - t0 + (c.off || 0))).toFixed(2), kind: c.kind })).filter((c) => c.t >= 0 && c.t <= dur + 0.01);
  const e = { id: s.id, output: file, start: s.start };
  if (s.end) e.end = s.end; else e.duration = s.duration;
  e.transparent = !!s.transparent; if (s.lane) e.lane = s.lane; if (s.replaces) e.replaces = s.replaces;
  e.sfx = sfx; out.push(e);
}
fs.writeFileSync(path.join(__dirname, 'plan.json'), JSON.stringify(out, null, 1));
console.log(out.map((e) => `${e.id} ${e.sfx.length} cues`).join('\n'));
