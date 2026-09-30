#!/usr/bin/env node
/* Face track: where the host's face is in the camera frame, sampled over the raw ranges a short-form plan uses (or all
 * of the cut's A-roll), for vertical crops that follow him when he leans (MediaPipe Face Landmarker in headless Chrome,
 * the same local page as gaze.mjs).
 *
 *   node pipeline/edit/face-track.mjs --slug bad-breath-for-good [--src work/proxy/take.clean.mov] [--step 5] [--all]
 *
 * Default ranges: the A-roll pieces under every piece of <dir>/plan.resolved.json (tiktok/ by default); --all = every
 * A-roll piece of out/final-spec.json. Cache: work/face-track.json { fps, step, frames: { rawFrame: [found, x, y, w] } }
 * with x = cheek midpoint, y = eye line, w = face width, all fractions of the frame. Frames already there are skipped.
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
const log = (...m) => console.error('[face-track]', ...m);
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const DIR = path.join(ROOT, 'videos', args.slug);
const SRC = path.resolve(DIR, args.src || 'work/proxy/take.clean.mov');
const CACHE = path.join(DIR, 'work', 'face-track.json');
const FPS = 30, STEP = +(args.step || 5);
const spec = JSON.parse(fs.readFileSync(path.join(DIR, 'out', 'final-spec.json'), 'utf8'));
let pos = 0; const aroll = spec.aroll.map((a) => { const len = a.outFrame - a.inFrame; const r = { ...a, f0: pos, f1: pos + len }; pos += len; return r; });
const main = spec.aroll[Math.floor(spec.aroll.length / 2)].media;

// raw frame ranges to sample
let pieces = aroll.filter((a) => a.media === main);
if (!args.all) {
  const plan = JSON.parse(fs.readFileSync(path.join(DIR, args.dir || 'tiktok', 'plan.resolved.json'), 'utf8'));
  const spans = plan.clips.flatMap((c) => c.segments).map((s) => [Math.floor((s.t0 - 0.5) * FPS), Math.ceil((s.t1 + 0.5) * FPS)]);
  pieces = pieces.filter((a) => spans.some(([x, y]) => a.f0 < y && a.f1 > x));
}
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : { fps: FPS, step: STEP, src: path.relative(DIR, SRC).split(path.sep).join('/'), frames: {} };
const want = new Set();
for (const a of pieces) { for (let f = a.inFrame; f < a.outFrame; f += STEP) want.add(f); want.add(a.outFrame - 1); }
const todo = [...want].filter((f) => !(f in cache.frames)).sort((x, y) => x - y);
log(`${pieces.length} A-roll pieces, ${todo.length} frames to look at (${Object.keys(cache.frames).length} cached)`);
if (!todo.length) { summarize(); process.exit(0); }

// ------------------------------------------------------------------ server + Chrome (as gaze.mjs)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.task': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname); const file = path.join(ROOT, u);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'facetrack-'));
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

// ------------------------------------------------------------------ sample: one ffmpeg per run of wanted frames, keep every STEP-th
const runs = []; for (const f of todo) { if (runs.length && f - runs.at(-1)[1] <= STEP) runs.at(-1)[1] = f; else runs.push([f, f]); }
const t0 = Date.now(); let done = 0;
for (const [a, b] of runs) {
  const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-ss', ((a - 0.25) / FPS).toFixed(4), '-i', SRC, '-frames:v', String(b - a + 1), '-an',
    '-vf', 'scale=960:540', '-f', 'image2pipe', '-c:v', 'mjpeg', '-q:v', '5', '-']);
  let buf = Buffer.alloc(0), k = 0, batch = [];
  const flush = async () => { if (!batch.length) return; const bt = batch; batch = []; for (const r of await evaluate(sessionId, `__gaze.where(${JSON.stringify(bt)})`)) cache.frames[r[0]] = r.slice(1); done += bt.length; };
  for await (const chunk of ff.stdout) {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const e = buf.indexOf(Buffer.from([0xff, 0xd9]));
      if (e < 0) break;
      const jpg = buf.subarray(0, e + 2); buf = buf.subarray(e + 2);
      const f = a + k++;
      if (want.has(f) && !(f in cache.frames)) batch.push({ f, b64: jpg.toString('base64') });
      if (batch.length >= 12) await flush();
    }
  }
  await flush();
}
fs.writeFileSync(CACHE, JSON.stringify(cache));
log(`looked at ${done} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
summarize();
process.exit(0);

function summarize() {
  const v = Object.values(cache.frames); const found = v.filter((x) => x[0]);
  const xs = found.map((x) => x[1]).sort((p, q) => p - q), q = (p) => xs[Math.floor(p * (xs.length - 1))];
  console.log(JSON.stringify({ cache: path.relative(ROOT, CACHE).split(path.sep).join('/'), frames: v.length, faceFound: +(found.length / Math.max(1, v.length)).toFixed(4), x: { p5: q(0.05), p50: q(0.5), p95: q(0.95) } }));
}
