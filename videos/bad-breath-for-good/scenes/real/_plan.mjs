// Writes scenes/real/plan.json from the specs below (anchors = the scene files' anchor/anchorEnd; sfx cues given on
// words are turned into scene seconds with the current cut), and checks our lane against every other planned scene.
// Re-run after a re-cut:  node videos/bad-breath-for-good/scenes/real/_plan.mjs
import fs from 'node:fs'; import path from 'node:path';
const VD = decodeURIComponent(new URL('../../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, '') + '/videos/bad-breath-for-good';
const cw = JSON.parse(fs.readFileSync(VD + '/edit/cut-words.json', 'utf8'));
const byI = new Map(cw.words.map((w) => [w.i, w]));
const find = (i) => { let w = byI.get(i); for (let d = 1; !w && d < 40; d++) w = byI.get(i + d) || byI.get(i - d); return w; };
const at = (a) => (a.edge === 'end' ? find(a.word).end : find(a.word).t) + (a.offset || 0);
const W = (w, d = 0) => ({ w, d });

const S = [
  { id: 'quirynen-photo', transparent: true, lane: 3, start: { word: 1302, offset: -0.2 }, end: { word: 1310, edge: 'end', offset: 0.6 }, sfx: [[0.1, 'tick']] },
  { id: 'paper-memon', start: { word: 439, offset: -0.12 }, end: { word: 448, offset: 0.1 }, sfx: [[0.02, 'paper'], [W(444, -0.06), 'tick'], [W(446, -0.06), 'scribble-short']] },
  { id: 'headlines', start: { word: 465, offset: -0.12 }, end: { word: 477, offset: -0.04 }, sfx: [[0.0, 'paper'], [W(466, 0.1), 'paper'], [W(468, -0.12), 'paper'], [W(469, -0.04), 'tick'], [W(469, 0.14), 'scribble-short']] },
  { id: 'paper-romano', start: { word: 632, offset: -0.12 }, end: { word: 650, offset: -0.1 }, sfx: [[0.02, 'paper'], [W(637, -0.06), 'tick'], [W(640, -0.05), 'scribble-short']] },
  { id: 'micro-papillae', start: { word: 945, offset: 0.08 }, end: { word: 949, offset: -0.08 }, sfx: [[0.0, 'tick'], [0.2, 'pop'], [W(948, -0.04), 'tick']] },
  { id: 'micro-bacteria', start: { word: 1049, offset: -0.1 }, end: { word: 1053, offset: -0.06 }, sfx: [[0.0, 'tick'], [0.18, 'pop']] },
  { id: 'paper-quirynen', start: { word: 1310, edge: 'end', offset: 0.6 }, end: { word: 1328, offset: -0.15 }, sfx: [[0.02, 'paper'], [W(1316, -0.1), 'tick'], [W(1318, -0.22), 'scribble-short']] },
  { id: 'micro-pging', start: { word: 1444, offset: -0.1 }, end: { word: 1448, offset: 0.12 }, sfx: [[0.0, 'tick'], [0.14, 'pop']] },
  { id: 'micro-tonsil', transparent: true, lane: 3, start: { word: 1630, offset: -0.08 }, end: { word: 1633, offset: 0.55 }, sfx: [[0.02, 'tick'], [0.16, 'pop-high']] },
  { id: 'archival-tried', start: { word: 2153, offset: -0.1 }, end: { word: 2161, offset: -0.05 }, sfx: [[0.0, 'tock'], [W(2156, -0.04), 'tock'], [W(2158, -0.04), 'tock']] },
  { id: 'archival-mouthwash', start: { word: 2269, offset: -0.1 }, end: { word: 2272, offset: 0.0 }, sfx: [[0.0, 'tock'], [W(2271, -0.12), 'scribble-short']] },
  { id: 'paper-cochrane', start: { word: 2444, offset: -0.1 }, end: { word: 2455, offset: -0.1 }, sfx: [[0.02, 'paper'], [W(2446, -0.02), 'scribble-short'], [W(2449, -0.06), 'tick'], [W(2453, -0.02), 'scribble-short']] },
];

const plan = [];
for (const s of S) {
  const a = at(s.start), e = at(s.end);
  const sfx = s.sfx.map(([x, kind]) => ({ t: +(typeof x === 'number' ? x : find(x.w).t + x.d - a).toFixed(2), kind })).filter((c) => c.t >= 0 && c.t < e - a);
  plan.push({ id: s.id, output: `videos/bad-breath-for-good/scenes/out/${s.id}.${s.transparent ? 'mov' : 'mp4'}`, start: s.start, end: s.end, transparent: !!s.transparent, lane: s.lane || 3, sfx });
  s._a = a; s._e = e;
}
fs.writeFileSync(VD + '/scenes/real/plan.json', JSON.stringify(plan, null, 1) + '\n');

// overlap check against everything else that is planned on lane 3 (the assembler trims the earlier of two same-lane
// scenes), and a note of what each of ours sits over
const others = [];
for (const g of fs.readdirSync(VD + '/scenes')) {
  if (g === 'real') continue;
  const pf = path.join(VD, 'scenes', g, 'plan.json'); if (!fs.existsSync(pf)) continue;
  for (const o of JSON.parse(fs.readFileSync(pf, 'utf8'))) {
    let a, e; try { a = o.start.special ? null : at(o.start); e = o.end ? at(o.end) : a + (o.duration || 0); } catch { continue; }
    if (a == null) continue; others.push({ id: o.id, g, a, e, lane: o.lane || (o.transparent ? 2 : 1) });
  }
}
for (const s of S) {
  const clash = others.filter((o) => o.lane === (s.lane || 3) && o.a < s._e && o.e > s._a).map((o) => `${o.id} ${o.a.toFixed(2)}-${o.e.toFixed(2)}`);
  const under = others.filter((o) => o.lane !== (s.lane || 3) && o.a < s._e && o.e > s._a).map((o) => `${o.id}(L${o.lane})`);
  console.log(`${s.id.padEnd(19)} ${s._a.toFixed(2)}-${s._e.toFixed(2)} (${(s._e - s._a).toFixed(2)} s)${clash.length ? '  LANE CLASH: ' + clash.join(', ') : ''}  over: ${under.join(' ') || 'Ben'}`);
}
const ours = [...S].sort((x, y) => x._a - y._a);
for (let k = 1; k < ours.length; k++) if (ours[k]._a < ours[k - 1]._e - 1e-3) console.log(`OWN OVERLAP ${ours[k - 1].id} / ${ours[k].id}`);
