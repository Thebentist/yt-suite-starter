// who covers a timeline moment? node _cover.mjs <word> [<word> ...]  (lists every planned scene over each word's start)
import fs from 'node:fs'; import path from 'node:path';
const VD = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', '..');
const cw = JSON.parse(fs.readFileSync(path.join(VD, 'edit/cut-words.json'), 'utf8'));
const beats = JSON.parse(fs.readFileSync(path.join(VD, 'edit/beats.json'), 'utf8'));
const byI = new Map(cw.words.map((w) => [w.i, w]));
const find = (i) => { let w = byI.get(i); for (let d = 1; !w && d < 40; d++) w = byI.get(i + d) || byI.get(i - d); return w; };
const at = (a) => a.special ? beats.pieces.find((p) => p.special === a.special).at + (a.offset || 0) : (a.edge === 'end' ? find(a.word).end : find(a.word).t) + (a.offset || 0);
const scenes = [];
for (const g of fs.readdirSync(path.join(VD, 'scenes'))) {
  const pf = path.join(VD, 'scenes', g, 'plan.json'); if (!fs.existsSync(pf)) continue;
  for (const s of JSON.parse(fs.readFileSync(pf, 'utf8'))) {
    const a = at(s.start), e = s.end ? at(s.end) : a + s.duration;
    scenes.push({ id: s.id, g, a, e, lane: s.lane || (s.transparent ? 2 : 1), rendered: fs.existsSync(path.resolve(VD, '..', '..', s.output || 'x')), replaces: s.replaces || [] });
  }
}
const repl = new Set(scenes.filter((s) => s.rendered).flatMap((s) => s.replaces));
for (const arg of process.argv.slice(2)) {
  const t = arg.endsWith('s') ? parseFloat(arg) : find(+arg).t;
  const hits = scenes.filter((s) => s.a <= t + 0.01 && s.e > t).map((s) => `${s.id}[${s.g} L${s.lane} ${s.a.toFixed(2)}-${s.e.toFixed(2)} +${(t - s.a).toFixed(2)}s${s.rendered ? '' : ' UNRENDERED'}${repl.has(s.id) ? ' REPLACED' : ''}]`);
  console.log(`${arg} @${t.toFixed(2)}: ${hits.join('  ') || '(Ben on camera, nothing planned)'}`);
}
