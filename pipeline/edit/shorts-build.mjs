#!/usr/bin/env node
// Vertical (1080x1920) short-form edits from a finished long-form cut, from its own parts: the 4K camera take, the
// 4K scene renders and the audio stems, re-laid out for a phone instead of cropped from the 16:9 master.
//   node pipeline/edit/shorts-build.mjs --slug bad-breath-for-good [--clip wrist-test] [--draft d1] [--dir tiktok]
//        [--publish bad-breath-tiktok]   (also into the review app as its own project, one version per clip)
// Reads <dir>/plan.resolved.json (pieces in final-cut time, from shorts-plan.mjs), <dir>/layout.json (optional
// overrides), out/final-spec.json (A-roll pieces on the spine, overlays), out/final/stems.json (dialogue, sfx, score,
// clip audio) and the cut's own transcription for captions. Writes <dir>/out/<clip>-<draft>.mp4, a shot list .json and
// a contact sheet .sheet.jpg (LOOK at it before showing anyone).
//
// Layouts, per shot (a shot changes wherever an A-roll piece or a graphic starts or ends):
//   face   the host full frame (a 9:16 slice of the 4K take around his face; punch-ins from the long cut become
//          tighter slices so jump cuts still change framing); partial overlays (cards, chips) above his head
//   stack  a fullscreen graphic in a 16:9 panel on top (blurred fill behind it), the host below it
//   fill   a fullscreen graphic cropped to 9:16 (for graphics whose subject sits in the middle; layout.json)
//   react  the clip he reacts to (a vertical video) on top, the host below
// Captions: word by word, the active word in the house lime, 1-3 words per line (Bahnschrift, the house face).
// Text hook: the plan's two lines as lime chips for the first seconds. Audio: dialogue + sfx cut with the pieces,
// the score as one continuous bed (a cut score jumps), then -14 LUFS through the oversampled limiter (edit lessons R7).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, parseArgs, audioEnvelope } from '../resolve/media.mjs';
import { loudness } from './clean-audio.mjs';
import { h264 } from '../gpu.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
if (!args.slug) { console.error('usage: --slug <slug> [--clip <id>] [--draft d1] [--dir tiktok]'); process.exit(2); }
const VD = path.join(ROOT, 'videos', args.slug);
const TT = path.join(VD, args.dir || 'tiktok');
const DRAFT = args.draft || 'd1';
const rj = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const plan = rj(path.join(TT, 'plan.resolved.json'));
const cfg = fs.existsSync(path.join(TT, 'layout.json')) ? rj(path.join(TT, 'layout.json')) : {};
const spec = rj(path.join(VD, 'out', 'final-spec.json'));
const stems = rj(path.join(VD, 'out', 'final', 'stems.json')).stems;
const FPS = 30, W = 1080, H = 1920, SW = spec.width, SH = spec.height;
const G = {
  face: [0.52, 0.48, 0.26], // host in the camera frame: x of the face centre, y of the eyes, y of the top of the head
  panelY: 170, panelH: 608, // stack: the 16:9 graphic panel
  stackK: 0.889, stackHead: 190, // stack: host scale and where the top of his head sits below the panel
  reactSplit: 1200, reactCard: [436, 1180], reactSrc: [0.08, 0.78], reactK: 0.7, reactHead: 40,
  capY: { face: 1390, fill: 1390, stack: 872, react: 1232 },
  hookY: [250, 362], hookDur: 3.8,
  zone: { face: [40, 150, 1000, 300], fill: [40, 150, 1000, 300], stack: [40, 570, 1000, 190], react: [40, 150, 1000, 230] },
  ...(cfg.geometry || {}),
};
const skipName = (n) => /^chapter-/.test(n) || (cfg.skip || ['open-tiktok']).includes(n);
const even = (v) => 2 * Math.round(v / 2);
const fmtS = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- the long cut, in frames: A-roll pieces sit end to end on the spine; overlays by their own start
let pos = 0;
const aroll = spec.aroll.map((a) => { const len = a.outFrame - a.inFrame; const r = { ...a, f0: pos, f1: pos + len }; pos += len; return r; });
const media = (k) => spec.media[k].path;
const overlays = spec.overlays.map((o) => ({ ...o, f0: Math.round(o.at * FPS), f1: Math.round((o.at + o.duration) * FPS), file: media(o.media) })).filter((o) => !skipName(o.name));
const rawFile = media('raw');
const stem = (id) => stems.find((s) => s.id === id);

// ---- heard words (what the audio says), for pads and captions
const tm = fs.existsSync(path.join(VD, 'edit', 'timing.json')) ? rj(path.join(VD, 'edit', 'timing.json')) : {};
const lead = +(tm.wordLead ?? 0);
// t/end: moved earlier by the lead (caption display); rs/re: whisper's own times (cut decisions and word membership)
const heard = rj(path.join(VD, 'work', 'cut-transcript.words.json')).filter((w) => String(w.w).trim() && !/^\[.*\]$/.test(w.w)).map((w) => ({ w: String(w.w).trim(), t: Math.max(0, w.t - lead), end: Math.max(0, w.end - lead), rs: w.t, re: w.end }));
const fixes = [...(fs.existsSync(path.join(VD, 'edit', 'caption-fixes.json')) ? rj(path.join(VD, 'edit', 'caption-fixes.json')).fixes : []), ...(cfg.captionFixes || [])];

function run(argv, { cwd, stdout } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, argv, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = ''; const out = [];
    p.stderr.on('data', (d) => { err += d; if (err.length > 200000) err = err.slice(-100000); });
    p.stdout.on('data', (d) => { if (stdout) out.push(d); });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(stdout ? Buffer.concat(out) : err) : reject(new Error(`ffmpeg exited ${code}\n${err.slice(-2500)}`))));
  });
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } })); }

// ---- partial overlays: where the element actually is in its 4K frame (union of alpha over the used stretch)
const boxCache = path.join(TT, 'work', 'alpha-boxes.json');
const boxes = fs.existsSync(boxCache) ? rj(boxCache) : {};
// region = [x0, y0, x1, y1] as fractions of the 16:9 frame: only the element(s) inside it (a name card without the
// doodle next to it)
async function alphaBox(o, region = [0, 0, 1, 1]) {
  const key = `${o.name}|${region.join(',')}`;
  if (key in boxes) return boxes[key];
  const w = 480, h = 270, sc = SW / w;
  const buf = await run(['-hide_banner', '-loglevel', 'error', '-ss', String(o.in || 0), '-t', String(o.duration), '-i', o.file, '-vf', `fps=4,alphaextract,scale=${w}:${h}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { stdout: true });
  const [rx0, ry0, rx1, ry1] = [region[0] * w, region[1] * h, region[2] * w, region[3] * h].map(Math.round);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let k = 0; k + w * h <= buf.length; k += w * h) for (let y = ry0; y < ry1; y++) for (let x = rx0; x < rx1; x++) if (buf[k + y * w + x] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = 24;
  const b = x1 < 0 ? null : { x: even(clamp(x0 * sc - pad, 0, SW)), y: even(clamp(y0 * sc - pad, 0, SH)), w: 0, h: 0 };
  if (b) { b.w = even(clamp((x1 + 1) * sc + pad, 0, SW) - b.x); b.h = even(clamp((y1 + 1) * sc + pad, 0, SH) - b.y); }
  boxes[key] = b; fs.mkdirSync(path.dirname(boxCache), { recursive: true }); fs.writeFileSync(boxCache, JSON.stringify(boxes, null, 2));
  return b;
}
// how a partial overlay goes vertical: 'map' = stays where it was drawn, on the graphic under it (a label on a 3D
// render) or around the host (cropped with him); 'box' = its element(s) cut out and moved into a zone of the vertical
// frame (a name card from the lower left goes above his head); 'pin' = like box, over any layout (the ad chip)
const ovCfg = (o) => (cfg.overlays || {})[o.name] || {};
const ovMode = (o, shot) => ovCfg(o).mode || (shot.full ? 'map' : 'box');

// ---- host windows in the 4K camera frame, following his face (work/face-track.json from face-track.mjs; without it
// the fixed G.face). A shot centres on the median face position; if he moves across it (more than 3% of the frame
// between its first and last 40%), the window pans with him.
const trackFile = path.join(VD, 'work', 'face-track.json');
const track = fs.existsSync(trackFile) ? rj(trackFile).frames : {};
const trackKeys = Object.keys(track).map(Number).filter((k) => track[k][0]).sort((x, y) => x - y);
const med = (v) => { const s = [...v].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
function faceFor(a, f0, f1) {
  const r0 = a.inFrame + (f0 - a.f0), r1 = a.inFrame + (f1 - a.f0);
  let s = trackKeys.filter((k) => k >= r0 && k < r1);
  if (!s.length) s = trackKeys.filter((k) => Math.abs(k - (r0 + r1) / 2) < 45);
  if (!s.length) return { x0: G.face[0], x1: G.face[0], eyes: G.face[1] };
  const xs = s.map((k) => track[k][1]), eyes = med(s.map((k) => track[k][2]));
  const x0 = med(xs.slice(0, Math.max(1, Math.ceil(xs.length * 0.4)))), x1 = med(xs.slice(Math.floor(xs.length * 0.6)));
  return Math.abs(x1 - x0) > 0.03 ? { x0, x1, eyes } : { x0: med(xs), x1: med(xs), eyes };
}
// anchor: { eyes: y } puts his eye line at display y; { head: y } the top of his head (about 0.22 of the frame above
// the eyes)
function hostWindow(k, dispW, dispH, anchor, face, dur) {
  const w = even(dispW / k), h = even(dispH / k);
  const X = (fx) => even(clamp(fx * SW - w / 2, 0, SW - w)), X0 = X(face.x0), X1 = X(face.x1);
  const x = X0 === X1 ? X0 : `'${X0}+${X1 - X0}*min(t/${dur.toFixed(3)},1)'`;
  const y = even(clamp(anchor.eyes != null ? face.eyes * SH - anchor.eyes / k : (face.eyes - 0.22) * SH - anchor.head / k, 0, SH - h));
  return `crop=${w}:${h}:${x}:${y},scale=${dispW}:${dispH}:flags=lanczos`;
}
function faceZoom(a) { const s = a.scale ?? 1; return s <= 1.001 ? 1 : clamp(1 + (s - 1) * 1.4, 1, 1.3); }

// ---- one shot -> an intermediate 1080x1920 file
async function renderShot(shot, file) {
  const n = shot.f1 - shot.f0, dur = n / FPS;
  const ins = [], fc = [];
  const input = (f, t) => { ins.push('-ss', Math.max(0, t).toFixed(4), '-t', (dur + 0.25).toFixed(4), '-i', f); return ins.filter((x) => x === '-i').length - 1; };
  const a = shot.a, rawT = (a.inFrame + (shot.f0 - a.f0) - 0.25) / FPS;
  const ovT = (o) => clamp((o.in || 0) + (shot.f0 / FPS - o.at), o.in || 0, (o.in || 0) + o.duration - 1 / FPS);
  const mapped = shot.partials.filter((o) => ovMode(o, shot) === 'map'), moved = shot.partials.filter((o) => ovMode(o, shot) !== 'map');
  // the fullscreen graphic with its own labels drawn on it, still in 4K, before it is laid out
  const graphic = () => {
    let g = `${input(shot.full.file, ovT(shot.full))}:v`;
    for (const [i, o] of mapped.entries()) { const p = input(o.file, ovT(o)); fc.push(`[${g}][${p}:v]overlay=0:0:format=auto[gm${i}]`); g = `gm${i}`; }
    return g;
  };
  const face = faceFor(a, shot.f0, shot.f1);
  let base;
  if (shot.layout === 'face') {
    const r = input(rawFile, rawT), z = faceZoom(a), k = (H / SH) * z;
    const win = hostWindow(k, W, H, { eyes: z > 1 ? 860 : 922 }, face, dur);
    fc.push(`[${r}:v]${win}[b0]`); base = 'b0';
    for (const [i, o] of mapped.entries()) { const p = input(o.file, ovT(o)); fc.push(`[${p}:v]${win},format=yuva420p[hm${i}]`, `[${base}][hm${i}]overlay=0:0:format=auto[bm${i}]`); base = `bm${i}`; }
  } else if (shot.layout === 'stack') {
    const g = graphic(), r = input(rawFile, rawT);
    const top = G.panelY + G.panelH, benH = H - top;
    fc.push(`[${g}]split=2[g1][g2]`, `[g1]scale=${W}:${G.panelH}:flags=lanczos[panel]`,
      `[g2]scale=192:108,gblur=sigma=5,scale=${even(top * 16 / 9)}:${top},crop=${W}:${top},eq=brightness=-0.10:saturation=0.9[tbg]`,
      `[${r}:v]${hostWindow(G.stackK, W, benH, { head: G.stackHead }, face, dur)}[ben]`, '[tbg][ben]vstack[c0]', `[c0][panel]overlay=0:${G.panelY}[b0]`);
    base = 'b0';
  } else if (shot.layout === 'fill') {
    const g = graphic();
    const L = (cfg.graphics || {})[shot.full.name] || {}, w = even(SH * 9 / 16), x = even(clamp((L.x ?? 0.5) * SW - w / 2, 0, SW - w));
    fc.push(`[${g}]crop=${w}:${SH}:${x}:0,scale=${W}:${H}:flags=lanczos[b0]`); base = 'b0';
  } else if (shot.layout === 'react') {
    const c = shot.react, t = input(c.file, c.in + (shot.f0 / FPS - c.at)), r = input(rawFile, rawT);
    const [s0, s1] = G.reactSrc, [cy0, cy1] = G.reactCard, srcH = even((s1 - s0) * H), cardH = cy1 - cy0, cardW = even(W * cardH / srcH);
    fc.push(`[${t}:v]scale=${W}:${H},split=2[t1][t2]`, `[t1]crop=${W}:${srcH}:0:${even(s0 * H)},scale=${cardW}:${cardH}:flags=lanczos[card]`,
      `[t2]scale=108:192,gblur=sigma=4,scale=${W}:${H},crop=${W}:${G.reactSplit}:0:${even((H - G.reactSplit) / 2)},eq=brightness=-0.18[tbg]`,
      `[tbg][card]overlay=${(W - cardW) / 2}:${cy0}[top]`,
      `[${r}:v]${hostWindow(G.reactK, W, H - G.reactSplit, { head: G.reactHead }, face, dur)}[ben]`, '[top][ben]vstack[b0]');
    base = 'b0';
  }
  let n2 = 0;
  for (const o of moved) {
    const L = ovCfg(o);
    for (const part of L.parts || [{}]) {
      const b = await alphaBox(o, part.region); if (!b) continue;
      const [zx, zy, zw, zh] = part.zone || L.zone || G.zone[shot.layout];
      const s = Math.min(zw / b.w, zh / b.h, part.maxScale ?? L.maxScale ?? 0.6), ow = even(b.w * s), oh = even(b.h * s);
      const al = part.align || L.align, ox = al === 'left' ? zx : Math.round(zx + (zw - ow) / 2), oy = Math.round(zy + (zh - oh) / 2);
      const p = input(o.file, ovT(o)), i = n2++;
      fc.push(`[${p}:v]crop=${b.w}:${b.h}:${b.x}:${b.y},scale=${ow}:${oh}:flags=lanczos,format=yuva420p[o${i}]`, `[${base}][o${i}]overlay=${ox}:${oy}:format=auto[bo${i}]`);
      base = `bo${i}`;
    }
  }
  // a source that ends a frame early (a graphic's last frame) holds instead of shortening the shot
  fc.push(`[${base}]fps=${FPS},tpad=stop_mode=clone:stop_duration=1,format=yuv420p,setsar=1[vout]`);
  const argv = ['-y', '-hide_banner', '-loglevel', 'error', ...ins, '-filter_complex', fc.join(';'), '-map', '[vout]', '-frames:v', String(n), '-an',
    ...h264('mezz'), '-r', String(FPS), file];
  // a shot whose command and source files are unchanged is not rendered again (a note on one shot rebuilds one shot)
  const key = crypto.createHash('sha1').update(JSON.stringify(argv) + ins.filter((_, i) => ins[i - 1] === '-i').map((f) => fs.statSync(f).mtimeMs).join()).digest('hex');
  if (fs.existsSync(file) && fs.existsSync(file + '.key') && fs.readFileSync(file + '.key', 'utf8') === key) return false;
  await run(argv);
  fs.writeFileSync(file + '.key', key);
  return true;
}

// ---- captions + text hook (ASS, rendered by libass in the final encode)
const lime = '&H004AF3D7&';
function assTime(s) { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return `${h}:${String(m).padStart(2, '0')}:${x.toFixed(2).padStart(5, '0')}`; }
function applyFixes(ws) {
  for (const [a, b] of fixes) {
    const parts = a.split(' '), norm = (s) => String(s).trim().replace(/[.,!?;:]+$/, '');
    for (let i = 0; i + parts.length <= ws.length; i++) {
      if (!parts.every((p, k) => norm(ws[i + k].w) === p)) continue;
      const tail = String(ws[i + parts.length - 1].w).match(/[.,!?;:]+$/)?.[0] || '';
      ws.splice(i, parts.length, { ...ws[i], w: b + tail, end: ws[i + parts.length - 1].end });
    }
    // a fix of a fix ("Mark Querionin" -> "Mark Quirion" -> "Marc Quirynen") meets one merged word, not two
    for (const w of ws) if (w.w.includes(a)) w.w = w.w.replace(a, b);
  }
  return ws;
}
function buildAss(clip, pieces, shots) {
  const ws = [];
  for (const p of pieces) {
    if (p.foreign) continue;
    const A = p.A / FPS, B = p.B / FPS, off = p.o0 / FPS;
    // the piece's own words, from the plan (not every word whose whisper time falls inside it: whisper's times drift,
    // and a neighbour's stretched end once put a "HONESTLY" on screen that the cut does not say); shorts-check.mjs
    // confirms the audio says them
    // a word whisper times past the piece's end (late by up to 0.3 s) still gets its moment on screen before the cut
    for (const w of (p.words || heard.map((_, k) => k).slice(p.wa, p.wb + 1)).map((k) => heard[k])) {
      const t = Math.min(clamp(w.t, A, B), B - 0.25), end = Math.max(Math.min(w.end, B), t + 0.2);
      ws.push({ w: w.w, t: off + (Math.max(A, t) - A), end: off + (Math.min(B, end) - A), piece: `${p.n}.${p.part || 0}` });
    }
  }
  applyFixes(ws);
  const show = (s) => s.toUpperCase().replace(/[.,;:]+$/, '').replace(/^["']|["']$/g, '');
  const chunks = []; let cur = [];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i], nx = ws[i + 1]; cur.push(w);
    const txt = cur.map((x) => show(x.w)).join(' ');
    if (!nx || /[.?!]$/.test(w.w) || nx.t - w.end > 0.3 || cur.length >= 3 || (txt + ' ' + show(nx.w)).length > 17 || nx.piece !== w.piece) { chunks.push(cur); cur = []; }
  }
  const layoutAt = (t) => (shots.find((s) => t >= s.o0 / FPS - 1e-6 && t < s.o1 / FPS) || shots.at(-1)).layout;
  const ev = [];
  chunks.forEach((c, ci) => {
    const nextStart = chunks[ci + 1]?.[0].t ?? Infinity;
    c.forEach((w, j) => {
      const s = w.t; let e = j + 1 < c.length ? c[j + 1].t : Math.max(c.at(-1).end, w.t + 0.3);
      if (j + 1 === c.length && nextStart - e < 0.35) e = nextStart;
      e = Math.min(e, nextStart);
      if (e - s < 0.02) return;
      const txt = c.map((x, k) => (k === j ? `{\\c${lime}}${show(x.w)}{\\c&H00FFFFFF&}` : show(x.w))).join(' ');
      const pop = j === 0 ? '{\\fscx76\\fscy92\\t(0,80,\\fscx84\\fscy100)}' : '';
      ev.push(`Dialogue: 1,${assTime(s)},${assTime(e)},Cap,,0,0,0,,{\\an5\\pos(540,${G.capY[layoutAt(s)] ?? G.capY.face})}${pop}${txt}`);
    });
  });
  const hy = clip.hookY || G.hookY;
  (clip.textHook || []).forEach((line, i) => ev.push(`Dialogue: 2,${assTime(0)},${assTime(G.hookDur)},Hook,,0,0,0,,{\\an5\\pos(540,${hy[i]})\\fad(0,220)}${line.toUpperCase()}`));
  buildAss.words = ws;
  // the credit sits just above the reacted clip's card, clear of the clip's own on-screen text
  for (const p of pieces) if (p.foreign && cfg.credit) ev.push(`Dialogue: 2,${assTime(p.o0 / FPS)},${assTime(p.o1 / FPS)},Credit,,0,0,0,,{\\an2\\pos(540,${G.reactCard[0] - 6})}${cfg.credit}`);
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
    `Style: Cap,Bahnschrift,88,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,-1,0,0,0,84,100,1,0,1,7,3,5,40,40,0,1\n` +
    `Style: Hook,Bahnschrift,${cfg.hookSize || 60},&H00101010,&H00101010,${lime.replace(/&$/, '')},&H00000000,-1,0,0,0,86,100,1,0,3,16,0,5,40,40,0,1\n` +
    `Style: Credit,Bahnschrift,34,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,-1,0,0,0,90,100,0,0,1,3,1,1,0,0,0,1\n\n` +
    `[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${ev.join('\n')}\n`;
}

// ---- audio: dialogue + sfx per piece (+ the reacted clip's audio), the score as one bed, -14 LUFS, limiter
async function buildAudio(pieces, total, dir) {
  const d = stem('dialogue'), sx = stem('sfx'), sc = stem('score'), tk = stem('tiktok-audio');
  const ins = [], fc = []; let n = 0;
  const add = (file, t, dur) => { ins.push('-ss', Math.max(0, t).toFixed(4), '-t', dur.toFixed(4), '-i', file); return n++; };
  const fmt = 'aformat=sample_rates=48000:channel_layouts=stereo';
  pieces.forEach((p, i) => {
    const A = p.A / FPS, D = (p.B - p.A) / FPS, lab = [];
    const di = add(d.file, d.in + A - d.at, D); fc.push(`[${di}:a]${fmt},volume=${d.gainDb || 0}dB,apad=whole_dur=${D.toFixed(4)}[d${i}]`); lab.push(`[d${i}]`);
    if (sx) { const si = add(sx.file, sx.in + A - sx.at, D); fc.push(`[${si}:a]${fmt},volume=${sx.gainDb || 0}dB,apad=whole_dur=${D.toFixed(4)}[s${i}]`); lab.push(`[s${i}]`); }
    if (tk && A < tk.at + tk.duration && A + D > tk.at) {
      const ti = add(tk.file, tk.in + Math.max(0, A - tk.at), Math.min(D, tk.at + tk.duration - A));
      fc.push(`[${ti}:a]${fmt},volume=${tk.gainDb || 0}dB,adelay=${Math.round(Math.max(0, tk.at - A) * 1000)}:all=1,apad=whole_dur=${D.toFixed(4)}[k${i}]`); lab.push(`[k${i}]`);
    }
    fc.push(`${lab.join('')}amix=inputs=${lab.length}:normalize=0:duration=first,atrim=0:${D.toFixed(4)},afade=t=in:d=0.012,afade=t=out:st=${(D - 0.015).toFixed(4)}:d=0.015[p${i}]`);
  });
  fc.push(`${pieces.map((_, i) => `[p${i}]`).join('')}concat=n=${pieces.length}:v=0:a=1[dx]`);
  let mixIn = '[dx]';
  if (sc) {
    const first = pieces.find((p) => !p.foreign) || pieces[0];
    const si = add(sc.file, sc.in + first.A / FPS - sc.at, total);
    fc.push(`[${si}:a]${fmt},volume=${sc.gainDb || 0}dB,apad=whole_dur=${total.toFixed(4)},afade=t=in:d=0.6,afade=t=out:st=${Math.max(0, total - 2.5).toFixed(4)}:d=2.5[sc]`);
    fc.push('[dx][sc]amix=inputs=2:normalize=0:duration=first[mix]'); mixIn = '[mix]';
  }
  const raw = path.join(dir, 'mix.wav');
  await run(['-y', '-hide_banner', '-loglevel', 'error', ...ins, '-filter_complex', fc.join(';'), '-map', mixIn.replace(/[[\]]/g, '') === 'dx' ? '[dx]' : '[mix]', '-c:a', 'pcm_f32le', raw]);
  const l0 = await loudness(raw), target = cfg.lufs ?? -14, gain = +(target - l0.lufs).toFixed(2);
  const out = path.join(dir, 'audio.wav');
  await run(['-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-af', `volume=${gain}dB,aresample=192000,alimiter=limit=0.79:attack=1:release=60:level=disabled,aresample=48000`, '-c:a', 'pcm_s24le', out]);
  return { file: out, before: l0, gain, after: await loudness(out) };
}

// ---- cut points: whisper's word times drift (starts late, ends stretched to the next word), and a cut placed from
// them landed inside words ("'Cause" kept, "the" clipped). So every edge goes to the quietest frame boundary between
// the word and its neighbour on the dialogue stem: for a start, the latest frame within 3 dB of the quietest (closest
// to the word); for an end, the earliest. A plan piece can still force an edge with trimIn/trimOut (final-cut s).
const norm1 = (s) => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '');
async function snapEdge(dir, w, nb) {
  const d = stem('dialogue'), off = (d.in || 0) - (d.at || 0);
  let lo, hi;
  if (dir === 'in') { lo = Math.max(nb ? nb.rs + 0.06 : 0, w.rs - 0.4); hi = w.rs + 0.06; }
  else { lo = Math.max(w.rs + 0.1, w.re - 0.3); hi = nb ? Math.min(nb.rs + 0.03, w.re + 0.4) : w.re + 0.4; }
  if (hi < lo + 0.05) { const m = (lo + hi) / 2; lo = m - 0.035; hi = m + 0.035; }
  const e0 = Math.max(0, lo - 0.03), env = await audioEnvelope(d.file, { start: e0 + off, end: hi + 0.03 + off, win: 0.01 });
  const at = (t) => { const i = Math.floor((t - e0) / 0.01); const v = [i - 1, i, i + 1].map((j) => env.db[clamp(j, 0, env.db.length - 1)]); return v.reduce((x, y) => x + y) / 3; };
  const c = []; for (let f = Math.ceil(lo * FPS); f <= Math.floor(hi * FPS); f++) c.push({ f, db: at(f / FPS) });
  if (!c.length) return Math.round(((lo + hi) / 2) * FPS);
  const min = Math.min(...c.map((x) => x.db)), ok = c.filter((x) => x.db <= min + 3);
  return (dir === 'in' ? ok.at(-1) : ok[0]).f;
}

// ---- dead air (Ben on the first drafts: "dead space after that last word where im breathing", "we can tighten up
// the cuts"). A short-form cut runs tighter than the long cut it comes from. On the dialogue stem (10 ms windows,
// median of 3), "quiet" is below cfg.tighten.threshold (-27 dB: pauses with breaths in them, not soft word endings):
//   - at a real cut (not a join with the next piece in the long cut, not a plan trimIn/trimOut): lead-in silence down
//     to edgeIn (0.06 s) before the first sound, tail down to edgeOut (0.12 s) after the last
//   - inside a piece: a quiet stretch longer than maxPause (0.45 s) keeps `before` (0.1 s) after the word and `after`
//     (0.08 s) before the next one; the rest is cut out (the piece splits in two)
//   - plan segment "remove": [[a, b]] (final-cut s) cuts by hand; cfg.keepPauses [[a, b]] are pauses kept on purpose
async function tighten(pieces) {
  const T = { threshold: -27, maxPause: 0.45, before: 0.1, after: 0.08, edgeIn: 0.06, edgeOut: 0.12, ...(cfg.tighten || {}) };
  if (cfg.tighten === false) return;
  const d = stem('dialogue'), off = (d.in || 0) - (d.at || 0), keep = cfg.keepPauses || [];
  const out = [];
  for (const [i, p] of pieces.entries()) {
    if (p.foreign) { out.push(p); continue; }
    const s = p.seg, a0 = p.A / FPS, b0 = p.B / FPS;
    const env = await audioEnvelope(d.file, { start: a0 + off, end: b0 + off, win: 0.01 });
    const raw = Array.from(env.db), db = raw.map((_, k) => med(raw.slice(Math.max(0, k - 1), k + 2)));
    const loud = db.map((x) => x >= T.threshold);
    const first = loud.indexOf(true), last = loud.lastIndexOf(true);
    if (first < 0) { out.push(p); continue; }
    const joinedIn = i > 0 && pieces[i - 1].B === p.A, joinedOut = pieces[i + 1] && pieces[i + 1].A === p.B;
    if (!joinedIn && s.trimIn == null && first * 0.01 > T.edgeIn + 0.02) p.A += Math.floor((first * 0.01 - T.edgeIn) * FPS);
    const tail = (b0 - a0) - (last + 1) * 0.01;
    if (!joinedOut && s.trimOut == null && tail > T.edgeOut + 0.02) p.B -= Math.floor((tail - T.edgeOut) * FPS);
    const rm = (s.remove || []).map(([x, y]) => [Math.round(x * FPS), Math.round(y * FPS)]);
    for (let k = first, q = -1; k <= last; k++) {
      if (!loud[k] && q < 0) q = k;
      if (loud[k] && q >= 0) {
        const len = (k - q) * 0.01, t1 = a0 + q * 0.01, t2 = a0 + k * 0.01;
        if (len > T.maxPause && !keep.some(([x, y]) => t1 < y && t2 > x)) { const f1 = Math.ceil((t1 + T.before) * FPS), f2 = Math.floor((t2 - T.after) * FPS); if (f2 - f1 >= 4) rm.push([f1, f2]); }
        q = -1;
      }
    }
    // split around the removals; each part keeps the plan words that start inside it
    rm.sort((x, y) => x[0] - y[0]);
    const words = heard.map((_, k) => k).slice(p.wa, p.wb + 1);
    let from = p.A;
    const parts = [], cutMid = [];
    for (const [x, y] of rm) if (x > from && y < p.B) { parts.push([from, x]); cutMid.push((x + y) / 2); from = y; }
    parts.push([from, p.B]);
    // words split at the middle of each removed pause (whisper can time a word 0.3 s late, past the cut)
    parts.forEach(([A, B], k) => out.push({ ...p, A, B, part: parts.length > 1 ? k + 1 : undefined,
      words: words.filter((w) => { const t = heard[w].t * FPS; return (k === 0 || t >= cutMid[k - 1]) && (k === parts.length - 1 || t < cutMid[k]); }) }));
    if (rm.length) log(`[${s.n}] cut ${rm.map(([x, y]) => `${(x / FPS).toFixed(2)}-${(y / FPS).toFixed(2)}`).join(', ')}`);
  }
  pieces.splice(0, pieces.length, ...out);
}
const log = (...m) => { if (!args.quiet) console.log('   ', ...m); };

// ---- a clip
async function buildClip(clip) {
  const dir = path.join(TT, 'work', clip.id); fs.mkdirSync(dir, { recursive: true });
  const outDir = path.join(TT, 'out'); fs.mkdirSync(outDir, { recursive: true });
  // pieces: word spans cut at the quietest frame around them; a piece that follows the previous one in the long cut
  // (gap under 0.6 s) joins it exactly, so nothing between them is lost. tighten() then takes the dead air out.
  const pieces = [];
  for (const s of clip.segments) {
    let A, B;
    if (s.foreign) { A = Math.round(s.t0 * FPS); B = Math.round(s.t1 * FPS); }
    else {
      if (norm1(heard[s.wa]?.w) !== norm1(s.text.split(' ')[0])) throw new Error(`[${clip.id}] piece ${s.n}: plan.resolved.json no longer matches the transcription; run shorts-plan.mjs again`);
      A = s.trimIn != null ? Math.round(s.trimIn * FPS) : await snapEdge('in', heard[s.wa], heard[s.wa - 1]);
      B = s.trimOut != null ? Math.round(s.trimOut * FPS) : await snapEdge('out', heard[s.wb], heard[s.wb + 1]);
    }
    // a piece that follows the previous one in the long cut (gap under 0.6 s) joins it exactly: no cut, nothing lost,
    // and the words between them (a natural "And") are captioned too
    const pv = pieces.at(-1);
    let wa = s.wa;
    if (pv && A >= pv.B - 1 && A - pv.B < 0.6 * FPS) { A = pv.B; if (!pv.foreign && pv.wb != null) wa = pv.wb + 1; }
    pieces.push({ n: s.n, foreign: !!s.foreign, wa, wb: s.wb, A, B, seg: s });
  }
  await tighten(pieces);
  let o = 0;
  for (const p of pieces) { p.o0 = o; p.o1 = o + (p.B - p.A); o += p.B - p.A; }
  const total = o / FPS;
  // shots: split each piece wherever the A-roll piece or a graphic changes (graphic edges within 2 frames of another
  // edge are dropped, so rounding never leaves a 1-frame shot)
  const shots = [];
  for (const p of pieces) {
    const must = new Set([p.A, p.B, ...aroll.filter((a) => a.f0 > p.A && a.f0 < p.B).map((a) => a.f0)]);
    const cuts = [...must];
    const until = Object.values(cfg.graphics || {}).filter((L) => L.until != null).map((L) => Math.round(L.until * FPS));
    // a graphic edge within 10 frames of another cut moves onto it: a layout change must not flash for a third of a
    // second (the long cut could start a graphic 0.2 s before an A-roll cut; vertical, that is two layout changes)
    for (const f of [...overlays.flatMap((ov) => [ov.f0, ov.f1]), ...until]) if (f > p.A + 9 && f < p.B - 9 && cuts.every((c) => Math.abs(c - f) > 9)) cuts.push(f);
    cuts.sort((x, y) => x - y);
    for (let i = 0; i + 1 < cuts.length; i++) {
      const f0 = cuts[i], f1 = cuts[i + 1], mid = (f0 + f1) / 2;
      const a = aroll.find((r) => r.f0 <= f0 && r.f1 > f0) || aroll.find((r) => r.f0 <= mid && r.f1 > mid);
      const on = overlays.filter((ov) => ov.f0 <= mid && ov.f1 > mid);
      const full = on.filter((ov) => ov.mode === 'fullscreen').sort((x, y) => y.lane - x.lane)[0] || null;
      const partials = on.filter((ov) => ov.mode !== 'fullscreen' && !(full && ov.lane < full.lane)).sort((x, y) => x.lane - y.lane);
      let layout = 'face', react = null;
      // graphics.<name>.until (final-cut s): fill up to there, the panel after (a centred subject that later widens)
      if (full) { const L = (cfg.graphics || {})[full.name] || {}; layout = L.until != null && f0 / FPS >= L.until - 0.01 ? 'stack' : L.mode || 'stack'; }
      else if (a.name === 'tiktok-watch' && cfg.react) { layout = 'react'; react = { ...cfg.react, file: path.resolve(VD, cfg.react.file) }; }
      shots.push({ f0, f1, o0: p.o0 + (f0 - p.A), o1: p.o0 + (f1 - p.A), a, full, partials, layout, react, piece: `${p.n}.${p.part || 0}` });
    }
  }
  // a shot under 8 frames keeps its neighbour's layout (an A-roll cut a few frames from a graphic's edge would otherwise
  // flash the other layout); the graphic holds its first or last frame for those frames
  for (const [i, s] of shots.entries()) {
    if (s.f1 - s.f0 >= 8) continue;
    const nb = [shots[i - 1], shots[i + 1]].find((x) => x && x.piece === s.piece && x.f1 - x.f0 >= 8);
    if (nb && nb.layout !== s.layout) Object.assign(s, { layout: nb.layout, full: nb.full, react: nb.react, partials: nb.partials });
    // a sliver of the next A-roll piece at a piece's edge (the padding reaching past a long-cut cut) continues the
    // neighbouring A-roll instead: 3 frames of another moment read as a jerk
    if (nb && nb.a !== s.a && (i === 0 || shots[i - 1].piece !== s.piece || !shots[i + 1] || shots[i + 1].piece !== s.piece)) s.a = { ...nb.a, f1: Math.max(nb.a.f1, s.f1), f0: nb.a.f0 };
  }
  const t0 = Date.now();
  const files = shots.map((_, i) => path.join(dir, `shot${String(i).padStart(3, '0')}.mp4`));
  let rendered = 0;
  for (const f of fs.readdirSync(dir).filter((f) => /^shot\d+\.mp4(\.key)?$/.test(f))) if (!files.includes(path.join(dir, f.replace(/\.key$/, '')))) fs.rmSync(path.join(dir, f));
  await pool(shots, +(args.jobs || Math.max(2, Math.min(4, Math.floor(os.cpus().length / 6)))), async (s, i) => { if (await renderShot(s, files[i])) rendered++; });
  fs.writeFileSync(path.join(dir, 'shots.txt'), files.map((f) => `file '${path.basename(f)}'`).join('\n'));
  const video = path.join(dir, 'video.mp4');
  await run(['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'shots.txt', '-c', 'copy', 'video.mp4'], { cwd: dir });
  const audio = await buildAudio(pieces, total, dir);
  const fontDir = path.join(TT, 'work', 'fonts'); fs.mkdirSync(fontDir, { recursive: true });
  for (const f of cfg.fonts || ['bahnschrift.ttf']) if (!fs.existsSync(path.join(fontDir, f))) fs.copyFileSync(path.join(process.env.WINDIR || 'C:/Windows', 'Fonts', f), path.join(fontDir, f));
  fs.writeFileSync(path.join(dir, 'captions.ass'), buildAss(clip, pieces, shots));
  // follow / subscribe call-out (Ben 2026-09-29: YouTube wants "better subscribe / follow call outs without being
  // intrusive"): silent, at the top of the frame (clear of his face and the captions), once at the end of the piece
  // nearest 40% of the clip (after a payoff, never over the hook) and once over the last line. One file per platform
  // (cfg.platforms: youtube "SUBSCRIBE", tiktok "FOLLOW"; the call-out renders from pipeline/motion/kits/shorts/cta.js).
  const cta = { zone: [60, 180, 960, 96], mid: 'auto', end: true, dur: 3.2, ...(cfg.cta || {}), ...(clip.cta || {}) };
  const ctaTimes = [];
  if (cfg.platforms) {
    const ends = pieces.filter((p) => !p.foreign).map((p) => p.o1 / FPS).filter((t) => t > 8 && t < total - 14);
    const mid = cta.mid === 'auto' ? ends.sort((x, y) => Math.abs(x - total * 0.4) - Math.abs(y - total * 0.4))[0] : cta.mid;
    if (mid != null && mid !== false) ctaTimes.push(+mid + 0.05);
    if (cta.end) ctaTimes.push(Math.max(0, total - cta.dur - 0.1));
  }
  const platforms = cfg.platforms ? Object.entries(cfg.platforms) : [[null, {}]];
  const outs = [];
  for (const [key, pl] of platforms) {
    const file = path.join(outDir, `${clip.id}-${DRAFT}${key ? '-' + key : ''}.mp4`);
    const ins = ['-i', 'video.mp4', '-i', 'audio.wav'], fc = ['[0:v]ass=captions.ass:fontsdir=../fonts[v0]'];
    let last = 'v0';
    if (pl.cta && ctaTimes.length) {
      const src = path.resolve(VD, pl.cta), b = await alphaBox({ name: `cta-${key}`, file: src, in: 0, duration: cta.dur });
      const [zx, zy, zw, zh] = cta.zone, s = Math.min(zw / b.w, zh / b.h), ow = even(b.w * s), oh = even(b.h * s);
      const ox = Math.round(zx + (zw - ow) / 2), oy = Math.round(zy + (zh - oh) / 2);
      ctaTimes.forEach((t, k) => {
        ins.push('-itsoffset', t.toFixed(3), '-i', src);
        fc.push(`[${2 + k}:v]crop=${b.w}:${b.h}:${b.x}:${b.y},scale=${ow}:${oh}:flags=lanczos,format=yuva420p[c${k}]`, `[${last}][c${k}]overlay=${ox}:${oy}:eof_action=pass:format=auto[v${k + 1}]`);
        last = `v${k + 1}`;
      });
    }
    await run(['-y', '-hide_banner', '-loglevel', 'error', ...ins, '-filter_complex', fc.join(';'), '-map', `[${last}]`, '-map', '1:a',
      ...h264('final'), '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-shortest', '-movflags', '+faststart', file], { cwd: dir });
    outs.push({ key, file });
    // --deliver: the posting copies, <dir>/deliver/<platform>/<clip>.mp4 (hard links)
    if (args.deliver && key) {
      const dd = path.join(TT, 'deliver', key); fs.mkdirSync(dd, { recursive: true });
      const dst = path.join(dd, `${clip.id}.mp4`); fs.rmSync(dst, { force: true }); try { fs.linkSync(file, dst); } catch { fs.copyFileSync(file, dst); }
    }
  }
  // the first platform's file is also <clip>-<draft>.mp4 (checks, contact sheet, review app)
  const out = path.join(outDir, `${clip.id}-${DRAFT}.mp4`);
  if (outs[0].file !== out) { fs.rmSync(out, { force: true }); try { fs.linkSync(outs[0].file, out); } catch { fs.copyFileSync(outs[0].file, out); } }
  // contact sheet: 12 frames across the clip
  const sheet = out.replace(/\.mp4$/, '.sheet.jpg');
  const ts = Array.from({ length: 12 }, (_, i) => (0.4 + i * (total - 0.8) / 11));
  await run(['-y', '-hide_banner', '-loglevel', 'error', ...ts.flatMap((t) => ['-ss', t.toFixed(2), '-i', out]), '-filter_complex',
    `${ts.map((_, i) => `[${i}:v]trim=end_frame=1,scale=270:480[f${i}]`).join(';')};${ts.map((_, i) => `[f${i}]`).join('')}xstack=inputs=12:layout=${ts.map((_, i) => `${(i % 6) * 270}_${Math.floor(i / 6) * 480}`).join('|')}`, '-frames:v', '1', sheet]);
  const report = { id: clip.id, draft: DRAFT, file: path.relative(ROOT, out).split(path.sep).join('/'), duration: +total.toFixed(3), shots: shots.length,
    layouts: shots.reduce((m, s) => ((m[s.layout] = +((m[s.layout] || 0) + (s.f1 - s.f0) / FPS).toFixed(2)), m), {}),
    audio: { lufsBefore: audio.before.lufs, gainDb: audio.gain, lufs: audio.after.lufs, truePeak: audio.after.truePeak }, seconds: Math.round((Date.now() - t0) / 1000),
    platforms: outs.map((x) => ({ platform: x.key, file: path.relative(ROOT, x.file).split(path.sep).join('/') })), callouts: ctaTimes.map((t) => +t.toFixed(2)),
    pieces: pieces.map((p) => ({ n: p.n, part: p.part, foreign: p.foreign, from: +(p.A / FPS).toFixed(3), to: +(p.B / FPS).toFixed(3), at: +(p.o0 / FPS).toFixed(3) })),
    shotList: shots.map((s) => ({ at: +(s.o0 / FPS).toFixed(2), dur: +((s.f1 - s.f0) / FPS).toFixed(2), layout: s.layout, graphic: s.full?.name, overlays: s.partials.map((x) => x.name), host: s.a?.name })) };
  fs.writeFileSync(out.replace(/\.mp4$/, '.json'), JSON.stringify(report, null, 2));
  const words = buildAss.words.map((w, i) => ({ t: +w.t.toFixed(3), end: +w.end.toFixed(3), w: w.w, i, piece: w.piece }));
  fs.writeFileSync(out.replace(/\.mp4$/, '.words.json'), JSON.stringify(words));
  // --publish <project>: into the review app as videos/<project>/review/<clip>-<draft>.mp4 (a hard link, no copy)
  if (args.publish) {
    const rd = path.join(ROOT, 'videos', String(args.publish), 'review'); fs.mkdirSync(rd, { recursive: true });
    const v = `${clip.id}-${DRAFT}`, dst = path.join(rd, v + '.mp4');
    fs.rmSync(dst, { force: true }); try { fs.linkSync(out, dst); } catch { fs.copyFileSync(out, dst); }
    fs.writeFileSync(path.join(rd, v + '.json'), JSON.stringify({ name: `${clip.title} (${DRAFT})`, created: new Date().toISOString(), timeline: '', notes: `${fmtS(total)} vertical. Text hook: ${(clip.textHook || []).join(' / ')}. Caption: ${clip.captionHook || ''}` }, null, 1));
    fs.writeFileSync(path.join(rd, v + '.words.json'), JSON.stringify(words));
  }
  console.log(`[${clip.id}] ${report.file} ${total.toFixed(1)} s, ${shots.length} shots (${rendered} rendered) ${JSON.stringify(report.layouts)}, ${audio.after.lufs} LUFS, TP ${audio.after.truePeak} dBTP, ${report.seconds} s; sheet ${path.relative(ROOT, sheet).split(path.sep).join('/')}`);
}

const clips = plan.clips.filter((c) => !args.clip || String(args.clip).split(',').includes(c.id)).map((c) => ({ ...c, ...(cfg.clips?.[c.id] || {}) }));
if (!clips.length) { console.error('no clip matches --clip'); process.exit(2); }
for (const c of clips) await buildClip(c);
