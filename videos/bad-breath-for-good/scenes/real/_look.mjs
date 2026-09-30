// quick look: render stills of one of our scenes and tile them into one sheet
//   node videos/bad-breath-for-good/scenes/real/_look.mjs <id> <t1,t2,...> [<sheet.jpg>] [cols]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const ROOT = decodeURIComponent(new URL('../../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, ''), FF = ROOT + '/node_modules/ffmpeg-static/ffmpeg.exe';
const [id, ts, sheetArg, colsArg] = process.argv.slice(2);
const out = `${ROOT}/videos/bad-breath-for-good/scenes/out/_look/${id}`;
const r = spawnSync('node', ['pipeline/motion/render.mjs', '--scene', `videos/bad-breath-for-good/scenes/real/${id}.js`, '--out', out, '--stills', ts.split(',').map((x) => x + 's').join(','), '--scale', '1'], { cwd: ROOT, encoding: 'utf8' });
if (r.status) { console.error(r.stderr.slice(-2500)); process.exit(1); }
const errs = r.stderr.split('\n').filter((l) => /exception|console|ERROR/i.test(l)); if (errs.length) console.error(errs.join('\n'));
const files = ts.split(',').map((x) => `${out}-${x}s.png`).filter((f) => fs.existsSync(f));
const sheet = sheetArg || `C:/Users/THEBEN~1/AppData/Local/Temp/claude/E--claude-yt-suite/5c2d07a5-b426-41a6-82dc-4c38eff1e924/scratchpad/look-${id}.jpg`;
const cols = +(colsArg || Math.min(3, files.length)), tw = 640, th = 360;
const inputs = files.flatMap((f) => ['-i', f]);
const lab = files.map((f, k) => `[${k}]scale=${tw}:${th},drawtext=text='${ts.split(',')[k]}s':x=6:y=6:fontsize=20:fontcolor=yellow:box=1:boxcolor=black@0.6:fontfile='C\\:/Windows/Fonts/arial.ttf'[v${k}]`).join(';');
const layout = files.map((_, k) => `${(k % cols) * tw}_${Math.floor(k / cols) * th}`).join('|');
const fc = files.length > 1 ? `${lab};${files.map((_, k) => `[v${k}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black` : lab.replace(/\[v0\]$/, '');
const s = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', fc, sheet], { encoding: 'utf8' });
if (s.status) console.error(s.stderr); else console.log(sheet);
