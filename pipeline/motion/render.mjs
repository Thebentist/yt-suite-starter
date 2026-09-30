#!/usr/bin/env node
/* Render a defineScene() file (pipeline/motion/runtime.js) to a video or stills with the installed Chrome, headless,
 * driven over the DevTools protocol (Node's built-in WebSocket; no puppeteer, nothing downloaded).
 *
 *   node pipeline/motion/render.mjs --scene videos/x/scenes/wrist.js --out videos/x/scenes/out/wrist [--scale 2]
 *        [--params '{"from":10}'] [--duration 8] [--stills 0.1,0.5,2.5s] [--pages 4] [--codec prores|h264] [--preview]
 *
 *   --scale 2        render 3840x2160 (design space stays 1920x1080); default 2 (the 4K timeline), --preview = 1 + h264
 *   --stills a,b     PNGs only, at fractions of the duration or seconds with an "s" suffix: <out>-<label>.png
 *   --codec          opaque scenes: h264 (.mp4, NVENC, CQ 15; default) or prores (ProRes 422 HQ .mov);
 *                    transparent scenes are always ProRes 4444 with alpha (.mov)
 *   --quality 0.95   JPEG quality of the frames Chrome hands over (PNG costs 4x the time at 4K)
 *   --pages N        parallel Chrome instances rendering interleaved frames (default 4)
 *
 * Video assets ({ video: 'path', start, fps, rate, width }) are extracted with ffmpeg to JPEG frames first and served
 * to the page. Prints one JSON line at the end: { output, name, fps, duration, frames, width, height, transparent, sec }.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, parseArgs } from '../resolve/media.mjs';
import { h264 } from '../gpu.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
const args = parseArgs(process.argv.slice(2));
const log = (...m) => console.error('[motion]', ...m);
const die = (m) => { console.error('[motion] ERROR:', m); process.exit(1); };
if (!args.scene) die('--scene <file> is required');
if (!CHROME) die('Chrome not found (set CHROME_PATH)');
const sceneAbs = path.resolve(ROOT, args.scene);
if (!fs.existsSync(sceneAbs)) die(`scene not found: ${sceneAbs}`);
const sceneRel = path.relative(ROOT, sceneAbs).split(path.sep).join('/');
const preview = !!args.preview;
const scale = +(args.scale ?? (preview ? 1 : 2));
const nPages = Math.max(1, +(args.pages ?? 4));
const codec = preview ? 'h264' : (args.codec || 'h264');
let params = {};
if (args.params) { try { params = JSON.parse(args.params); } catch (e) { die(`--params is not JSON: ${e.message}`); } }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-'));

// ------------------------------------------------------------------ static server (repo root + extracted frames)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = u.startsWith('/__tmp/') ? path.join(TMP, u.slice(7)) : path.join(ROOT, u);
  if (!file.startsWith(u.startsWith('/__tmp/') ? TMP : ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

// ------------------------------------------------------------------ Chrome + a minimal CDP client
// One Chrome per worker: pages of the same site share one renderer process, so tabs in one browser do not render in
// parallel (measured: 1 page and 6 pages both ~6.7 fps at 4K). Separate browsers do.
const browsers = [];
async function launchChrome(k) {
  const profile = path.join(TMP, `profile-${k}`);
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--hide-scrollbars', '--mute-audio', '--font-render-hinting=none', '--force-color-profile=srgb', ...(process.env.MOTION_GPU === '0' ? ['--disable-gpu'] : ['--ignore-gpu-blocklist']),
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 300 && !fs.existsSync(portFile); i++) await new Promise((r) => setTimeout(r, 50));
  if (!fs.existsSync(portFile)) throw new Error('Chrome did not start (no DevToolsActivePort)');
  await new Promise((r) => setTimeout(r, 100));
  const [dport, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
  const ws = new WebSocket(`ws://127.0.0.1:${dport}${wsPath}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP websocket failed')); });
  let nextId = 1; const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
    else if (msg.method === 'Runtime.exceptionThrown') log('page exception:', msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
    else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) log('page console:', msg.params.args.map((x) => x.value ?? x.description).join(' '));
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  const evaluate = async (sessionId, expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const br = { send, evaluate, close: () => { try { ws.close(); } catch {} try { proc.kill(); } catch {} } };
  browsers.push(br); return br;
}
let cleaned = false;
function cleanup() { if (cleaned) return; cleaned = true; for (const br of browsers) br.close(); server.close(); setTimeout(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} }, 800); }
process.on('exit', cleanup);

async function loadScene(br) {
  const { targetId } = await br.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await br.send('Target.attachToTarget', { targetId, flatten: true });
  await br.send('Runtime.enable', {}, sessionId);
  await br.send('Page.enable', {}, sessionId);
  await br.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/pipeline/motion/render.html?scene=${encodeURIComponent(sceneRel)}` }, sessionId);
  for (let i = 0; ; i++) {
    const st = await br.evaluate(sessionId, '({ ready: !!window.__ready, error: window.__error || null })').catch(() => ({ ready: false }));
    if (st.error) throw new Error(st.error);
    if (st.ready) break;
    if (i > 300) throw new Error('scene did not load in 15 s');
    await new Promise((r) => setTimeout(r, 50));
  }
  await br.evaluate(sessionId, 'document.fonts ? document.fonts.ready.then(() => true) : true');
  return { br, sessionId, targetId };
}
async function openPage(br, init) {
  const pg = await loadScene(br);
  pg.meta = await br.evaluate(pg.sessionId, `__motion.init(${JSON.stringify(init)})`);
  return pg;
}
// the scene file is the single source of truth for its assets: ask a page for them
async function readSceneAssets(br) {
  const pg = await loadScene(br);
  const assets = await br.evaluate(pg.sessionId, '(() => { try { return JSON.parse(JSON.stringify(window.__sceneAssets || null)); } catch (e) { return null; } })()');
  const meta = await br.evaluate(pg.sessionId, '(() => ({ fps: window.__sceneMeta && window.__sceneMeta.fps, duration: window.__sceneMeta && window.__sceneMeta.duration }))()');
  await br.send('Target.closeTarget', { targetId: pg.targetId });
  return { assets: assets || {}, meta };
}

function runFFmpeg(ffArgs) {
  return new Promise((res, rej) => {
    const p = spawn(FFMPEG, ffArgs, { stdio: ['ignore', 'ignore', 'pipe'] }); let err = '';
    p.stderr.on('data', (d) => { err += d; }); p.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}: ${err.slice(-1500)}`))));
  });
}

// Final renders share the GPU with other agents' renders: take one of MOTION_SLOTS (default 2) slots first (lock files
// in the OS temp dir, freed on exit; a slot whose process is gone is reclaimed). Stills and --no-queue skip the queue.
let slotFile = null;
// First come, first served: each waiter holds a ticket file (arrival time + pid); only the oldest live tickets may take
// a free slot (the old free-for-all let one agent's final wait 35 min behind later arrivals).
let ticketFile = null;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function takeSlot() {
  const dir = path.join(os.tmpdir(), 'motion-slots'); fs.mkdirSync(dir, { recursive: true });
  const n = +(process.env.MOTION_SLOTS || 2); let waited = 0;
  ticketFile = path.join(dir, `ticket-${String(Date.now()).padStart(15, '0')}-${process.pid}.wait`);
  fs.writeFileSync(ticketFile, String(process.pid));
  for (;;) {
    // free slots whose owner died; drop tickets whose owner died
    let free = 0;
    for (let k = 0; k < n; k++) {
      const f = path.join(dir, `slot-${k}.lock`);
      if (!fs.existsSync(f)) { free++; continue; }
      try { if (!alive(+fs.readFileSync(f, 'utf8'))) { fs.rmSync(f, { force: true }); free++; } } catch {}
    }
    const queue = fs.readdirSync(dir).filter((x) => x.endsWith('.wait')).sort()
      .filter((x) => { const pid = +x.split('-')[2].split('.')[0]; if (alive(pid)) return true; try { fs.rmSync(path.join(dir, x), { force: true }); } catch {} return false; });
    const pos = queue.indexOf(path.basename(ticketFile));
    if (pos >= 0 && pos < free) {
      for (let k = 0; k < n; k++) {
        const f = path.join(dir, `slot-${k}.lock`);
        try { fs.writeFileSync(f, String(process.pid), { flag: 'wx' }); slotFile = f; fs.rmSync(ticketFile, { force: true }); ticketFile = null; return; } catch {}
      }
    }
    if (waited % 30 === 0) log(`waiting for a render slot (${n} in use, ${pos} ahead of this render)...`);
    await new Promise((r) => setTimeout(r, 2000)); waited += 2;
  }
}
process.on('exit', () => { for (const f of [slotFile, ticketFile]) if (f) try { fs.rmSync(f, { force: true }); } catch {} });
if (!args.stills && !args.bench && !args['no-queue']) await takeSlot();

try {
  const t0 = Date.now();
  const nWorkers = args.stills || args.bench ? 1 : nPages;
  const brs = await Promise.all(Array.from({ length: nWorkers }, (_, k) => launchChrome(k)));
  const { assets, meta: m0 } = await readSceneAssets(brs[0]);
  const fps = m0.fps || 30, duration = +(args.duration ?? m0.duration ?? 5);
  const videoDirs = {}, videoFrames = {};
  for (const [k, a] of Object.entries(assets)) {
    if (!a.video) continue;
    const dir = path.join(TMP, `v-${k}`); fs.mkdirSync(dir, { recursive: true });
    const need = (duration - (a.at || 0)) * (a.rate || 1) + 0.5, w = a.width || Math.round(1920 * scale);
    await runFFmpeg(['-hide_banner', '-loglevel', 'error', '-ss', String(a.start || 0), '-i', path.resolve(ROOT, a.video), '-t', String(need),
      '-vf', `fps=${a.fps || fps},scale=${w}:-2:flags=lanczos`, '-q:v', '2', path.join(dir, '%05d.jpg')]);
    videoDirs[k] = `/__tmp/v-${k}`; videoFrames[k] = fs.readdirSync(dir).length;
    log(`asset ${k}: ${videoFrames[k]} frames from ${a.video}`);
  }
  // scenes under videos/<slug>/ get the cut's word times (runtime api.at) and beats (special anchors)
  const slugM = /^videos\/([^/]+)\//.exec(sceneRel);
  const init = { scale, params, duration, durationFixed: args.duration != null, base: '/', videoDirs, videoFrames,
    ...(slugM ? { cutWords: `/videos/${slugM[1]}/edit/cut-words.json`, beats: `/videos/${slugM[1]}/edit/beats.json` } : {}) };
  const pages = [];
  for (const br of brs) pages.push(await openPage(br, init));
  const meta = pages[0].meta;
  const outBase = path.resolve(ROOT, args.out || path.join('renders', 'motion', meta.name));
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  log(`${meta.name}: ${meta.width}x${meta.height} @${meta.fps} fps, ${meta.duration}s, ${meta.totalFrames} frames, transparent=${meta.transparent}, ${pages.length} page(s)`);
  const grab = async (pg, i) => { const url = await pg.br.evaluate(pg.sessionId, `__motion.png(${i})`); return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'); };
  const grabFast = async (pg, i) => { const url = await pg.br.evaluate(pg.sessionId, `__motion.frame(${i}, ${meta.transparent}, ${+(args.quality ?? 0.95)})`); return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'); };

  if (args.bench) {
    const r = await pages[0].br.evaluate(pages[0].sessionId, `(async () => { const T = () => performance.now(); let a = T(); for (let i = 0; i < 10; i++) await __motion.render(i * 3); const draw = (T() - a) / 10; a = T(); for (let i = 0; i < 5; i++) __motion.canvas.toDataURL('image/png'); const png = (T() - a) / 5; a = T(); let jl = 0; for (let i = 0; i < 5; i++) jl = __motion.canvas.toDataURL('image/jpeg', 0.95).length; const jpg = (T() - a) / 5; a = T(); const b = await new Promise((r) => __motion.canvas.toBlob(r, 'image/png')); const blob = T() - a; return { draw, png, jpg, blobPng: blob, pngMB: __motion.canvas.toDataURL('image/png').length / 1e6, jpgMB: jl / 1e6 }; })()`);
    console.log(JSON.stringify(r)); cleanup(); process.exit(0);
  }
  if (args.stills) {
    const outs = [];
    for (const s of String(args.stills).split(',')) {
      const sec = s.endsWith('s') ? parseFloat(s) : parseFloat(s) * meta.duration;
      const f = Math.min(meta.totalFrames - 1, Math.max(0, Math.round(sec * meta.fps)));
      const label = s.endsWith('s') ? s : (+s).toFixed(2);
      const out = `${outBase}-${label}.png`; fs.writeFileSync(out, await grab(pages[0], f)); outs.push(path.relative(ROOT, out).split(path.sep).join('/'));
    }
    console.log(JSON.stringify({ stills: outs, name: meta.name, sec: +((Date.now() - t0) / 1000).toFixed(1) }));
  } else {
    const alpha = meta.transparent;
    const out = `${outBase}${alpha || codec === 'prores' ? '.mov' : '.mp4'}`;
    const tags = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'];
    // frames arrive as JPEG (full-range BT.601): go through RGB, then to BT.709 video range
    const vf = alpha
      ? ['-filter_complex', '[0:v]format=rgb24,split[a][b];[a]crop=iw:ih/2:0:0[c];[b]crop=iw:ih/2:0:ih/2,format=gray[m];[c][m]alphamerge,unpremultiply=inplace=1,scale=out_color_matrix=bt709:out_range=tv,format=yuva444p10le[o]', '-map', '[o]']
      : ['-vf', `format=rgb24,scale=out_color_matrix=bt709:out_range=tv,format=${codec === 'prores' ? 'yuv422p10le' : 'yuv420p'}`];
    const enc = alpha ? ['-c:v', 'prores_ks', '-profile:v', '4444', '-alpha_bits', '16', '-vendor', 'apl0']
      : codec === 'prores' ? ['-c:v', 'prores_ks', '-profile:v', '3', '-vendor', 'apl0']
        : h264('master');
    const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(meta.fps), '-i', '-',
      ...vf, ...enc, ...tags, '-r', String(meta.fps), out], { stdio: ['pipe', 'ignore', 'pipe'] });
    let ffErr = ''; ff.stderr.on('data', (d) => { ffErr += d; });
    const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}: ${ffErr.slice(-1500)}`)))));
    const write = (buf) => new Promise((res) => { if (ff.stdin.write(buf)) res(); else ff.stdin.once('drain', res); });
    // pages render interleaved frames; an ordered buffer feeds ffmpeg
    const done = new Map(); let nextOut = 0, nextFrame = 0;
    const worker = async (pg) => {
      while (nextFrame < meta.totalFrames) {
        const i = nextFrame++; done.set(i, await grabFast(pg, i));
        while (done.has(nextOut)) { const b = done.get(nextOut); done.delete(nextOut); await write(b); nextOut++; }
        if (nextOut % 30 === 0) process.stderr.write(`\r[motion] frame ${nextOut}/${meta.totalFrames}`);
      }
    };
    await Promise.all(pages.map(worker));
    while (done.has(nextOut)) { await write(done.get(nextOut)); done.delete(nextOut); nextOut++; }
    ff.stdin.end(); await ffDone;
    process.stderr.write('\n');
    const sec = (Date.now() - t0) / 1000;
    log(`wrote ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB) in ${sec.toFixed(1)} s (${(meta.totalFrames / sec).toFixed(1)} fps)`);
    console.log(JSON.stringify({ output: path.relative(ROOT, out).split(path.sep).join('/'), name: meta.name, fps: meta.fps, duration: meta.duration,
      frames: meta.totalFrames, width: meta.width, height: meta.height, transparent: meta.transparent, sec: +sec.toFixed(1) }));
  }
} catch (e) {
  console.error('[motion] ERROR:', e.stack || e.message); cleanup(); process.exit(1);
}
cleanup();
process.exit(0);
