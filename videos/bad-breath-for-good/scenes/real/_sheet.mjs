// contact sheet of other groups' final renders at given scene times: node _sheet.mjs <out.jpg> id@t,t,t id@t,t ...
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child_process';
const ROOT = decodeURIComponent(new URL('../../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, ''), FF = ROOT + '/node_modules/ffmpeg-static/ffmpeg.exe';
const [out, ...specs] = process.argv.slice(2), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sheet-')), tiles = [];
for (const sp of specs) {
  const [id, ts] = sp.split('@');
  const f = [`${ROOT}/videos/bad-breath-for-good/scenes/out/${id}.mp4`, `${ROOT}/videos/bad-breath-for-good/scenes/out/${id}.mov`].find((p) => fs.existsSync(p)) || (fs.existsSync(id) ? id : null);
  if (!f) { console.error('missing', id); continue; }
  for (const t of ts.split(',')) {
    const o = path.join(tmp, `${tiles.length}.jpg`);
    spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', t, '-i', f, '-frames:v', '1', '-vf', `scale=640:360,drawtext=text='${path.basename(id)} ${t}s':x=8:y=8:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6:fontfile='C\:/Windows/Fonts/arial.ttf'`, o]);
    if (fs.existsSync(o)) tiles.push(o);
  }
}
const cols = Math.min(4, tiles.length), rows = Math.ceil(tiles.length / cols);
const inputs = tiles.flatMap((t) => ['-i', t]);
const layout = tiles.map((_, k) => `${(k % cols) * 640}_${Math.floor(k / cols) * 360}`).join('|');
const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', `${tiles.map((_, k) => `[${k}:v]`).join('')}xstack=inputs=${tiles.length}:layout=${layout}:fill=black`, out], { encoding: 'utf8' });
if (r.status) console.error(r.stderr); else console.log(out, tiles.length);
