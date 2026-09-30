// look-only: Ben's A-roll frame at a timeline time (current cut), with the punch-in of that piece, at 1920x1080, and
// optionally our transparent still (and another overlay still) composited on top.
//   node _ben.mjs <timeline seconds> <out.png> [overlay.png ...]
import fs from 'node:fs'; import { spawnSync } from 'node:child_process';
const ROOT = decodeURIComponent(new URL('../../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, ''), VD = ROOT + '/videos/bad-breath-for-good', FF = ROOT + '/node_modules/ffmpeg-static/ffmpeg.exe';
const [T, out, ...ovs] = process.argv.slice(2); const t = +T;
const beats = JSON.parse(fs.readFileSync(VD + '/edit/beats.json', 'utf8'));
const p = beats.pieces.find((x) => x.at <= t && t < x.at + x.dur);
if (!p) { console.error('no piece at', t); process.exit(1); }
const src = p.in + (t - p.at);
let s = 1, pos = [0, 0];
try { const spec = JSON.parse(fs.readFileSync(VD + '/out/final-spec.json', 'utf8')); const a = spec.aroll.find((x) => Math.abs(x.in - p.in) < 0.08); if (a && a.scale) { s = a.scale; pos = a.position || [0, 0]; } } catch {}
// scale about the centre, then shift by the Resolve position (3840-wide units, y up) -> 1920 units
const W = 1920, H = 1080, sw = Math.round(W * s), sh = Math.round(H * s);
const cx = Math.round((sw - W) / 2 - pos[0] / 2), cy = Math.round((sh - H) / 2 + pos[1] / 2);
const vf = `scale=${sw}:${sh},crop=${W}:${H}:${Math.max(0, Math.min(sw - W, cx))}:${Math.max(0, Math.min(sh - H, cy))}`;
const inputs = ['-ss', String(src), '-i', VD + '/work/take.clean.mov', ...ovs.flatMap((o) => ['-i', o])];
const fc = [`[0:v]${vf}[b0]`, ...ovs.map((_, k) => `[b${k}][${k + 1}:v]overlay=0:0[b${k + 1}]`)].join(';');
const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', `[b${ovs.length}]`, '-frames:v', '1', out], { encoding: 'utf8' });
if (r.status) console.error(r.stderr); else console.log(JSON.stringify({ out, piece: p.in, src: +src.toFixed(3), scale: s, pos }));
