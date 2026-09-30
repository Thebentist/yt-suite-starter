#!/usr/bin/env node
/* Gaze scan: where the host is looking, frame by frame, around every piece of the cut (MediaPipe Face Landmarker in
 * headless Chrome, all local: node_modules/@mediapipe/tasks-vision + tools/mediapipe/face_landmarker.task).
 *
 *   node pipeline/edit/gaze.mjs --slug bad-breath-for-good [--src work/proxy/take.clean.mov] [--margin 1.2]
 *        [--crop 960:960:480:0] [--all] [--from 100 --to 160]
 *
 * Scans the raw ranges of out/final-spec.json's A-roll pieces +- margin (merged), or the whole take with --all, or
 * [from, to]. Results are cached per raw frame (30 fps) in edit/../work/gaze.json; frames already there are skipped.
 * Each frame: [frame, found, yaw, pitch, eyeH, eyeV, blink, lookL, lookR, lookDown, lookUp] (see gaze.html). Judgement (what counts as
 * "looking away") is made later from these numbers by assemble.mjs's gaze pass, calibrated on frames mid-speech.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const log = (...m) => console.error('[gaze]', ...m);
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const DIR = path.join(ROOT, 'videos', args.slug);
const SRC = path.resolve(DIR, args.src || 'work/proxy/take.clean.mov');
const CACHE = path.join(DIR, 'work', 'gaze.json');
const FPS = 30, margin = +(args.margin ?? 1.2), crop = args.crop || '960:960:480:0';

// ------------------------------------------------------------------ ranges to scan
let ranges = [];
if (args.from != null) ranges = [[+args.from, +args.to]];
else if (args.all) ranges = [[0, 1e9]];
else {
  const spec = JSON.parse(fs.readFileSync(path.join(DIR, 'out', 'final-spec.json'), 'utf8'));
  const main = spec.aroll[Math.floor(spec.aroll.length / 2)].media;
  for (const p of spec.aroll) if (p.media === main) ranges.push([Math.max(0, +p.in - margin), +p.out + margin]);
  ranges.sort((a, b) => a[0] - b[0]);
  const m = []; for (const r of ranges) { if (m.length && r[0] <= m.at(-1)[1] + 0.5) m.at(-1)[1] = Math.max(m.at(-1)[1], r[1]); else m.push([...r]); }
  ranges = m;
}
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : { fps: FPS, src: path.relative(DIR, SRC).split(path.sep).join('/'), crop, frames: {} };
const VERSION = 2;  // bump when the per-frame fields change
if (cache.crop !== crop || cache.version !== VERSION) { log('crop or fields changed: starting a fresh cache'); cache.crop = crop; cache.version = VERSION; cache.frames = {}; }
// frame ranges still missing
const todo = [];
for (const [a, b] of ranges) {
  let f0 = null;
  for (let f = Math.round(a * FPS); f <= Math.round(b * FPS); f++) {
    const miss = !(f in cache.frames);
    if (miss && f0 == null) f0 = f;
    if ((!miss || f === Math.round(b * FPS)) && f0 != null) { todo.push([f0, miss ? f : f - 1]); f0 = null; }
  }
}
const nTodo = todo.reduce((s, [a, b]) => s + b - a + 1, 0);
log(`${ranges.length} ranges, ${nTodo} frames to scan (${Object.keys(cache.frames).length} cached)`);
if (!nTodo) { summarize(); process.exit(0); }

// ------------------------------------------------------------------ server + Chrome
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.task': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname); const file = path.join(ROOT, u);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gaze-'));
const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${TMP}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--mute-audio', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill(); } catch {} server.close(); setTimeout(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} }, 800); };
process.on('exit', cleanup);
const portFile = path.join(TMP, 'DevToolsActivePort');
for (let i = 0; i < 300 && !fs.existsSync(portFile); i++) await new Promise((r) => setTimeout(r, 50));
await new Promise((r) => setTimeout(r, 100));
const [dport, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
const ws = new WebSocket(`ws://127.0.0.1:${dport}${wsPath}`);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP websocket failed')); });
let nextId = 1; const pending = new Map();
ws.onmessage = (ev) => { const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString()); if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const evaluate = async (sessionId, expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Runtime.enable', {}, sessionId);
await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/pipeline/edit/gaze.html${args.cpu ? '?cpu=1' : ''}` }, sessionId);
for (let i = 0; ; i++) {
  const st = await evaluate(sessionId, '({ ready: !!window.__ready, error: window.__error || null })').catch(() => ({}));
  if (st.error) { log('page error:', st.error); process.exit(1); }
  if (st.ready) break;
  if (i > 600) { log('landmarker did not load in 30 s'); process.exit(1); }
  await new Promise((r) => setTimeout(r, 50));
}

// ------------------------------------------------------------------ scan
const t0 = Date.now(); let done = 0, lastSave = Date.now();
const save = () => fs.writeFileSync(CACHE, JSON.stringify(cache));
for (const [f0, f1] of todo) {
  const n = f1 - f0 + 1;
  const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-ss', (f0 / FPS).toFixed(4), '-i', SRC, '-frames:v', String(n), '-an',
    '-vf', `crop=${crop}`, '-f', 'image2pipe', '-c:v', 'mjpeg', '-q:v', '4', '-']);
  let buf = Buffer.alloc(0), k = 0, batch = [];
  const flush = async () => { if (!batch.length) return; const b = batch; batch = []; for (const r of await evaluate(sessionId, `__gaze.run(${JSON.stringify(b)})`)) cache.frames[r[0]] = r.slice(1); done += b.length; };
  for await (const chunk of ff.stdout) {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {  // split the MJPEG stream on end-of-image markers
      const e = buf.indexOf(Buffer.from([0xff, 0xd9]));
      if (e < 0) break;
      const jpg = buf.subarray(0, e + 2); buf = buf.subarray(e + 2);
      batch.push({ f: f0 + k, b64: jpg.toString('base64') }); k++;
      if (batch.length >= 12) await flush();
    }
    if (Date.now() - lastSave > 20000) { save(); lastSave = Date.now(); const s = (Date.now() - t0) / 1000; log(`${done}/${nTodo} frames, ${(done / s).toFixed(1)} fps, ~${Math.round((nTodo - done) / (done / s) / 60)} min left`); }
  }
  await flush();
}
save();
log(`scanned ${done} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
summarize();
process.exit(0);

function summarize() {
  const v = Object.values(cache.frames); const found = v.filter((x) => x[0]).length;
  console.log(JSON.stringify({ cache: path.relative(ROOT, CACHE).split(path.sep).join('/'), frames: v.length, faceFound: +(found / Math.max(1, v.length)).toFixed(4) }));
}
