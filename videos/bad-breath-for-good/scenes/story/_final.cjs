// Render story finals and stamp what cut they were timed to:   node videos/bad-breath-for-good/scenes/story/_final.cjs <id> [<id> ...]
//   node .../_final.cjs --check      lists every plan entry whose words (inside its span) moved since it was rendered, or never stamped
//   node .../_final.cjs --stale      re-renders exactly those
// A stamp = the scene's word times relative to its start, from the cut-words.json the render read (snapshotted before and after the
// render starts; if the cut changed in between, the stamp is dropped so the scene shows as stale). Stamps live in _stamps.json.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../../../');
const CUT = path.join(ROOT, 'videos/bad-breath-for-good/edit/cut-words.json');
const STAMPS = path.join(__dirname, '_stamps.json');
const planOf = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'plan.json'), 'utf8'));
const stamps = fs.existsSync(STAMPS) ? JSON.parse(fs.readFileSync(STAMPS, 'utf8')) : {};
function sig(entry, cutText) {
  const cw = JSON.parse(cutText).words, by = new Map(cw.map((w) => [w.i, w]));
  const find = (i) => { let w = by.get(i); for (let d = 1; !w && d < 30; d++) w = by.get(i + d) || by.get(i - d); return w; };
  if (entry.start.special) return { special: true };
  const t0 = (entry.start.edge === 'end' ? find(entry.start.word).end : find(entry.start.word).t) + (entry.start.offset || 0);
  const t1 = entry.end ? (entry.end.edge === 'end' ? find(entry.end.word).end : find(entry.end.word).t) + (entry.end.offset || 0) : t0 + entry.duration;
  const words = cw.filter((w) => w.t >= t0 - 0.01 && w.t <= t1).map((w) => [w.i, +(w.t - t0).toFixed(3)]);
  return { dur: +(t1 - t0).toFixed(3), words };
}
function same(a, b) {
  if (!a || !b) return false; if (a.special || b.special) return !!(a.special && b.special);
  if (Math.abs(a.dur - b.dur) > 0.034 || a.words.length !== b.words.length) return false;
  return a.words.every(([i, t], k) => b.words[k][0] === i && Math.abs(b.words[k][1] - t) <= 0.034);
}
function stale() {
  const now = fs.readFileSync(CUT, 'utf8');
  return planOf().filter((e) => !fs.existsSync(path.join(ROOT, e.output)) || !same(stamps[e.id], sig(e, now)));
}
function render(id) {
  const e = planOf().find((x) => x.id === id); if (!e) throw new Error('not in plan: ' + id);
  const src = path.join(__dirname, path.basename(e.output).replace(/\.(mp4|mov)$/, '.js'));
  const outBase = e.output.replace(/\.(mp4|mov)$/, '');
  const before = fs.readFileSync(CUT, 'utf8');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'pipeline/motion/render.mjs'), '--scene', path.relative(ROOT, src).split(path.sep).join('/'), '--out', outBase, '--pages', '3'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const after = fs.readFileSync(CUT, 'utf8');
  const line = (r.stdout || '').trim().split('\n').pop();
  if (r.status !== 0) { console.log(id, 'FAILED', (r.stderr || '').slice(-400)); return; }
  const cur = fs.existsSync(STAMPS) ? JSON.parse(fs.readFileSync(STAMPS, 'utf8')) : {};   // merge: other runs may have stamped meanwhile
  if (before === after) cur[id] = sig(e, before); else delete cur[id];
  Object.assign(stamps, cur); fs.writeFileSync(STAMPS, JSON.stringify(cur));
  console.log(id, before === after ? 'rendered + stamped' : 'rendered, CUT CHANGED during render (unstamped)', line.slice(0, 160));
}
const args = process.argv.slice(2);
if (args[0] === '--check') for (const e of planOf()) console.log(e.id.padEnd(17), stale().some((x) => x.id === e.id) ? 'STALE' : 'ok');
else if (args[0] === '--stale') for (const e of stale()) render(e.id);
else if (args[0] === '--stamp') { const now = fs.readFileSync(CUT, 'utf8'); const cur = fs.existsSync(STAMPS) ? JSON.parse(fs.readFileSync(STAMPS, 'utf8')) : {}; for (const id of args.slice(1)) { const e = planOf().find((x) => x.id === id); cur[id] = sig(e, now); } fs.writeFileSync(STAMPS, JSON.stringify(cur)); console.log('stamped', args.slice(1).join(' ')); }
else for (const id of args) render(id);
