// Which story finals need a re-render after a re-cut?  node videos/bad-breath-for-good/scenes/story/_check-times.cjs
// Compares each plan entry's span on the CURRENT edit/cut-words.json (+0.5 s tail) with the duration of the rendered file.
// Scenes time themselves from the cut (anchor/anchorEnd + api.at), so a re-render is all a changed scene needs.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../../../');
const FF = path.join(ROOT, 'node_modules/ffmpeg-static/ffmpeg.exe');
const cw = JSON.parse(fs.readFileSync(path.join(ROOT, 'videos/bad-breath-for-good/edit/cut-words.json'), 'utf8')).words;
const by = new Map(cw.map((w) => [w.i, w]));
const find = (i) => { let w = by.get(i); for (let d = 1; !w && d < 30; d++) w = by.get(i + d) || by.get(i - d); return w; };
const T = (a) => (a.edge === 'end' ? find(a.word).end : find(a.word).t) + (a.offset || 0);
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'plan.json'), 'utf8'));
for (const s of plan) {
  const file = path.join(ROOT, s.output);
  const want = s.end ? T(s.end) - T(s.start) + 0.5 : s.duration;
  let have = null;
  if (fs.existsSync(file)) { const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(spawnSync(FF, ['-hide_banner', '-i', file], { encoding: 'utf8' }).stderr || ''); if (m) have = +m[1] * 3600 + +m[2] * 60 + +m[3]; }
  const ok = have != null && Math.abs(have - want) < 0.03;
  console.log(s.id.padEnd(17), 'cut', want.toFixed(2).padStart(6), 'file', have == null ? '  none' : have.toFixed(2).padStart(6), ok ? 'ok' : 'RE-RENDER');
}
