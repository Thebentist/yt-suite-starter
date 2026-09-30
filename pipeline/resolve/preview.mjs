#!/usr/bin/env node
/* Render a timeline spec with ffmpeg so Claude can check frames without Resolve.
 *
 *   node pipeline/resolve/preview.mjs --spec videos/<slug>/out/timeline-spec.json [--out videos/<slug>/out/preview.mp4]
 *                                     [--height 720] [--clean] [--crf 23]
 *
 * Uses exactly the frame-quantised timeline that fcpxml.mjs writes (resolveTimeline), so what you see here is what the
 * FCPXML describes: A-roll segments cut from the ORIGINAL raw file with their static punch-in (scale + position, centred
 * like Resolve's Zoom/Position), overlays composited on top in lane order (alpha kept), music mixed at its static clip
 * gain (no ducking: the FCPXML carries none either). A burned-in timeline timecode (starting at the spec's tcStart) and
 * the segment number/zoom sit in the top-left corner unless --clean.
 *
 * Why not pipeline/edit/assemble.mjs: it composites on a pre-cut base at that base's resolution and side-chain ducks the
 * music, so it cannot show per-segment punch-ins and would not match what Resolve plays from the FCPXML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, parseArgs, drawtextFont } from './media.mjs';
import { resolveTimeline, framesToSec, timecode } from './fcpxml.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
if (!args.spec) { console.error('usage: --spec <timeline-spec.json> [--out preview.mp4] [--height 720] [--clean]'); process.exit(1); }
const specPath = path.resolve(ROOT, args.spec);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const tl = resolveTimeline(spec, { baseDir: path.dirname(specPath) });
const out = path.resolve(ROOT, args.out || path.join(path.dirname(specPath), 'preview.mp4'));
fs.mkdirSync(path.dirname(out), { recursive: true });

const H = Math.round(Number(args.height || 720) / 2) * 2;
const W = Math.round((H * tl.width) / tl.height / 2) * 2;
const k = W / tl.width; // timeline px -> preview px
const rate = `${tl.fps.num}/${tl.fps.den}`;
const sec = (f) => framesToSec(f, tl.fps);
const n6 = (x) => x.toFixed(6);

const inputs = []; const inputIdx = new Map();
const input = (id) => {
  if (!inputIdx.has(id)) { inputIdx.set(id, inputs.length); inputs.push(tl.media[id].path); }
  return inputIdx.get(id);
};
const filters = [];
const AFMT = 'aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo';

// ---- A-roll: trim each segment from the raw file, punch in, concat ------------------------------------------------
const cat = [];
const warned = new Set();
tl.aroll.forEach((s, i) => {
  const m = tl.media[s.media]; const idx = input(s.media);
  // half-frame guards so float timestamps never drop/duplicate the boundary frame
  let v = `[${idx}:v]trim=start=${n6(Math.max(0, sec(s.srcIn) - sec(1) / 2))}:end=${n6(sec(s.srcOut) - sec(1) / 2)},setpts=PTS-STARTPTS,scale=${W}:${H}:flags=bicubic,setsar=1`;
  if (s.scale !== 1 || s.position[0] || s.position[1]) {
    const zw = Math.round((W * s.scale) / 2) * 2, zh = Math.round((H * s.scale) / 2) * 2;
    let cx = (zw - W) / 2 - s.position[0] * k * 1, cy = (zh - H) / 2 + s.position[1] * k;
    const ccx = Math.min(Math.max(0, cx), zw - W), ccy = Math.min(Math.max(0, cy), zh - H);
    if ((ccx !== cx || ccy !== cy) && !warned.has('pos')) { console.warn('[preview] a punch-in position pushes the frame edge into view; Resolve will show black there, the preview clamps'); warned.add('pos'); }
    v += `,scale=${zw}:${zh}:flags=bicubic,crop=${W}:${H}:${Math.round(ccx)}:${Math.round(ccy)}`;
  }
  filters.push(`${v},setsar=1,fps=${rate},format=yuv420p[v${i}]`);
  if (m.hasAudio) {
    let a = `[${idx}:a]atrim=start=${n6(sec(s.srcIn))}:end=${n6(sec(s.srcOut))},asetpts=PTS-STARTPTS,${AFMT}`;
    if (s.gainDb) a += `,volume=${s.gainDb}dB`;
    filters.push(`${a},apad=whole_dur=${n6(sec(s.srcOut - s.srcIn))}[a${i}]`);
  } else {
    filters.push(`aevalsrc=0:c=stereo:s=48000:d=${n6(sec(s.srcOut - s.srcIn))},aformat=sample_fmts=fltp[a${i}]`);
  }
  cat.push(`[v${i}][a${i}]`);
});
filters.push(`${cat.join('')}concat=n=${tl.aroll.length}:v=1:a=1[vcat][voice]`);

// ---- overlays, lowest lane first -------------------------------------------------------------------------------------
let vLabel = '[vcat]';
[...tl.overlays].sort((a, b) => a.lane - b.lane || a.recIn - b.recIn).forEach((o, i) => {
  const m = tl.media[o.media]; const idx = input(o.media);
  const at = sec(o.recIn), end = sec(o.recOut);
  // full-frame media maps onto the frame like Resolve's "scale entire image to fit"; then the clip's own scale/position
  const fit = Math.min(W / (m.width || W), H / (m.height || H));
  const ow = Math.max(2, Math.round(((m.width || W) * fit * o.scale) / 2) * 2), oh = Math.max(2, Math.round(((m.height || H) * fit * o.scale) / 2) * 2);
  const x = Math.round((W - ow) / 2 + o.position[0] * k), y = Math.round((H - oh) / 2 - o.position[1] * k);
  let c = `[${idx}:v]trim=start=${n6(sec(o.srcIn))}:duration=${n6(end - at)},setpts=PTS-STARTPTS+${n6(at)}/TB,format=yuva420p,scale=${ow}:${oh}`;
  if (o.opacity < 1) c += `,colorchannelmixer=aa=${o.opacity}`;
  filters.push(`${c}[ov${i}]`);
  filters.push(`${vLabel}[ov${i}]overlay=${x}:${y}:eof_action=pass:enable='between(t,${n6(at)},${n6(end - sec(1) / 2)})'[vo${i}]`);
  vLabel = `[vo${i}]`;
});

// ---- burn-in: timeline TC + segment/zoom label ------------------------------------------------------------------------
const font = drawtextFont();
if (!args.clean && font) {
  const tc0 = timecode(0, tl.fps, tl.tcStartFrames).replace(/:/g, '\\:');
  let c = `${vLabel}drawtext=${font}:timecode='${tc0}':rate=${rate}:fontsize=${Math.round(H / 24)}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6:x=10:y=10`;
  tl.aroll.forEach((s, i) => {
    const label = `seg ${i + 1}${s.scale !== 1 ? ` x${s.scale}` : ''}`;
    c += `,drawtext=${font}:text='${label}':fontsize=${Math.round(H / 32)}:fontcolor=yellow:box=1:boxcolor=black@0.6:boxborderw=5:x=10:y=${Math.round(H / 24) + 26}:enable='between(t,${n6(sec(s.recIn) - sec(1) / 2)},${n6(sec(s.recOut) - sec(1) / 2)})'`;
  });
  filters.push(`${c}[vtc]`); vLabel = '[vtc]';
}

// ---- audio: voice + music at static gain -----------------------------------------------------------------------------
// amix duration=first ends ~0.5 s early in ffmpeg 6.1 (measured), so mix to the longest input and trim to the cut length
const mix = ['[voice]'];
tl.music.forEach((mu, i) => {
  const idx = input(mu.media);
  const ms = Math.round(sec(mu.recIn) * 1000);
  filters.push(`[${idx}:a]atrim=start=${n6(sec(mu.srcIn))}:end=${n6(sec(mu.srcOut))},asetpts=PTS-STARTPTS,${AFMT},volume=${mu.gainDb}dB,adelay=${ms}|${ms}[mu${i}]`);
  mix.push(`[mu${i}]`);
});
let aLabel = '[voice]';
if (mix.length > 1) { filters.push(`${mix.join('')}amix=inputs=${mix.length}:duration=longest:normalize=0,atrim=end=${n6(sec(tl.durationFrames))}[amix]`); aLabel = '[amix]'; }
filters.push(`${aLabel}alimiter=limit=0.95:level=false[aout]`);

const script = out.replace(/\.[^.]+$/, '') + '.filter';
fs.writeFileSync(script, filters.join(';\n'));
const dur = sec(tl.durationFrames);
const ff = ['-y', '-hide_banner', '-loglevel', 'error', '-stats'];
for (const p of inputs) ff.push('-i', p);
ff.push('-filter_complex_script', script, '-map', vLabel, '-map', '[aout]', '-r', rate, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(args.crf || 23),
  '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-t', n6(dur), '-movflags', '+faststart', out);

console.log(`[preview] ${tl.aroll.length} A-roll segments (${tl.aroll.filter((s) => s.scale !== 1).length} punched in), ${tl.overlays.length} overlays, ${tl.music.length} music clips, ${dur.toFixed(2)} s at ${W}x${H}`);
const t0 = Date.now();
const p = spawn(FFMPEG, ff, { stdio: ['ignore', 'inherit', 'pipe'] });
let err = ''; p.stderr.on('data', (d) => { err += d; });
p.on('close', (code) => {
  if (code !== 0) { console.error(err.slice(-4000)); console.error(`[preview] ffmpeg failed (${code}); filter graph: ${path.relative(ROOT, script)}`); process.exit(code || 1); }
  console.log(`[preview] wrote ${path.relative(ROOT, out)} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(JSON.stringify({ output: path.relative(ROOT, out).split(path.sep).join('/'), seconds: +dur.toFixed(3), width: W, height: H, segments: tl.aroll.length }));
});
