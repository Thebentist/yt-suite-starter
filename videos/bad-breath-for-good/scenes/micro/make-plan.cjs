// Regenerates scenes/micro/plan.json from the CURRENT cut (edit/cut-words.json): word anchors + sfx cue times in scene
// seconds, using the same mapping as the scenes (MICRO.cut: first word at 0.15 s). Run from the repo root:
//   node videos/bad-breath-for-good/scenes/micro/make-plan.cjs
// Re-run it (and re-render the micro scenes) whenever the cut is re-timed.
const fs = require('fs');
const cw = JSON.parse(fs.readFileSync('videos/bad-breath-for-good/edit/cut-words.json', 'utf8')).words, by = new Map(cw.map((w) => [w.i, w]));
const Wf = (first) => (i, edge) => +(((edge === 'end' ? by.get(i).end : by.get(i).t) - by.get(first).t) + 0.15).toFixed(2);
const r2 = (x) => +x.toFixed(2);
const S = [];
const add = (id, first, end, cues) => { const W = Wf(first); S.push({ id, output: `videos/bad-breath-for-good/scenes/out/${id}.mp4`, start: { word: first, offset: -0.15 }, end, transparent: false, sfx: cues(W).map(([t, kind]) => ({ t: r2(t), kind })) }); };
add('anaerobes', 1046, { word: 1104, offset: -0.15 }, (W) => [[W(1050) - 0.3, 'whoosh-soft'], [W(1056) - 0.5, 'bubble-small'], [W(1076), 'pop'], [W(1082) + 0.18, 'scribble-short'], [W(1098), 'pop']]);
add('protein-sulfur', 1104, { word: 1144, offset: -0.15 }, (W) => [[W(1111), 'bubble-small'], [W(1116), 'pop-low'], [W(1119), 'pop-low'], [W(1121), 'pop-low'], [W(1125) - 0.05, 'bubble-small'], [W(1141), 'pop-high'], [W(1141) + 0.1, 'sparkle']]);
add('sulfur-gas', 1144, { word: 1197, offset: -0.15 }, (W) => [[W(1148), 'pop-low'], [W(1154) + 0.06, 'bubble-small'], [W(1161) - 0.02, 'bubble'], [W(1168), 'pop'], [W(1184) - 0.15, 'whoosh-soft'], [W(1185) - 0.05, 'pop']]);
add('leftovers', 1197, { word: 1221, offset: -0.15 }, (W) => [[W(1206), 'pop'], [W(1206) + 0.12, 'bubble-small'], [W(1206) + 0.93, 'bubble-small'], [W(1210), 'bubble'], [W(1212) + 0.1, 'bubble-small'], [W(1212) + 0.2, 'scribble-short']]);
add('mint-mask', 2205, { word: 2231, offset: -0.15 }, (W) => [[W(2208) + 0.12, 'pop-low'], [W(2208) + 0.15, 'sparkle'], [W(2211), 'whoosh-soft'], [W(2216), 'tick']]);
add('sugar-feeds', 2231, { word: 2269, offset: -0.15 }, (W) => [[W(2239), 'pop'], [W(2240) + 0.3, 'sparkle'], [W(2244), 'scribble-short'], [W(2253), 'bubble-small'], [W(2255) + 0.4, 'bubble-small'], [W(2258), 'pop']]);
add('mouthwash-cover', 2269, { word: 2284, offset: -0.15 }, (W) => [[W(2271) - 0.3, 'whoosh-long'], [W(2271), 'pop'], [W(2278) + 0.25, 'scribble-short'], [W(2280), 'pop']]);
add('comes-back', 3013, { word: 3047, edge: 'end', offset: 0.25 }, (W) => [[W(3018), 'scribble-short'], [W(3020), 'whoosh-long'], [W(3029), 'pop'], [W(3030), 'tick'], [W(3041), 'pop'], [W(3044), 'scribble-short']]);
add('nano-lipid', 3171, { word: 3220, offset: -0.15 }, (W) => [[0.2, 'sparkle'], [W(3184), 'pop'], [W(3193), 'whoosh-soft'], [W(3202), 'tick'], [W(3203), 'pop']]);
add('pg-target', 3220, { word: 3302, offset: -0.15 }, (W) => [[W(3231), 'bubble-small'], [W(3233), 'pop'], [W(3238), 'tick'], [W(3243), 'tock'], [W(3249), 'pop'], [W(3255), 'ding'], [W(3255) + 0.3, 'bubble-small']]);
add('pop-balloon', 3501, { word: 3544, edge: 'end', offset: 0.25 }, (W) => [[W(3506), 'whoosh-soft'], [W(3509) + 0.02, 'bubble-small'], [W(3514) + 0.05, 'splash'], [W(3527), 'whoosh'], [W(3539), 'pop-high'], [W(3541) + 0.05, 'ding']]);
// sanity: no overlaps inside the group, every anchor resolves
const at = (a) => (a.edge === 'end' ? by.get(a.word).end : by.get(a.word).t) + (a.offset || 0);
let prev = -1; for (const s of S) { const a = at(s.start), b = at(s.end); if (a < prev - 1e-6) throw new Error('overlap at ' + s.id); prev = b; s.note = `on screen ${(b - a).toFixed(2)} s`; }
fs.writeFileSync('videos/bad-breath-for-good/scenes/micro/plan.json', JSON.stringify(S, null, 2) + '\n');
for (const s of S) console.log(s.id.padEnd(16), s.note, s.sfx.map((c) => c.t + ' ' + c.kind).join(', '));
