#!/usr/bin/env node
/* Capture a real web page (abstract page, headline) as a hi-DPI PNG for the "real" scene group, with headless Chrome
 * over the DevTools protocol (same approach as pipeline/motion/render.mjs; nothing downloaded).
 *
 *   node videos/bad-breath-for-good/scenes/real/capture.mjs --url <url> --out videos/bad-breath-for-good/assets/web/<name>
 *        [--width 1200] [--height 1800] [--dpr 2] [--wait 2500] [--hide "sel,sel"] [--css "extra css"]
 *        [--clip "<selector>"] [--crop x,y,w,h] [--find "text one||text two"] [--eval "js run before the shot"]
 *
 * Writes <out>.png and <out>.json: { url, finalUrl, title, retrieved, dpr, clip:{x,y,w,h} (CSS px), rects: { "<text>":
 * [{x,y,w,h}, ...] (CSS px, relative to the clip; one per line box) } }. The scene multiplies by its own scale.
 * Stops (exit 2) on a bot check / challenge page instead of working around it.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true; args[k] = v; } }
if (!args.url || !args.out) { console.error('usage: --url <url> --out <path-without-ext>'); process.exit(1); }
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const W = +(args.width || 1200), H = +(args.height || 1800), DPR = +(args.dpr || 2), WAIT = +(args.wait || 2500);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-'));
const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${TMP}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--hide-scrollbars', '--mute-audio', '--force-color-profile=srgb', '--font-render-hinting=none', '--lang=en-US', 'about:blank'], { stdio: 'ignore' });
const portFile = path.join(TMP, 'DevToolsActivePort');
for (let i = 0; i < 300 && !fs.existsSync(portFile); i++) await new Promise((r) => setTimeout(r, 50));
await new Promise((r) => setTimeout(r, 150));
const [dport, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
const ws = new WebSocket(`ws://127.0.0.1:${dport}${wsPath}`);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP websocket failed')); });
let nextId = 1; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString()); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const done = (code) => { try { ws.close(); } catch {} try { proc.kill(); } catch {} setTimeout(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} process.exit(code); }, 400); };
try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false }, sessionId);
  await send('Page.navigate', { url: args.url }, sessionId);
  for (let i = 0; i < 400; i++) { const st = await ev('document.readyState').catch(() => 'loading'); if (st === 'complete') break; await new Promise((r) => setTimeout(r, 100)); }
  await new Promise((r) => setTimeout(r, WAIT));
  const info = await ev(`({ title: document.title, url: location.href, text: (document.body && document.body.innerText || '').slice(0, 4000) })`);
  if (/just a moment|attention required|captcha|verify you are human|not a robot|cookies must be enabled|access denied/i.test(info.title + ' ' + info.text.slice(0, 600))) {
    console.error(`[capture] STOP: bot check / challenge page at ${args.url} ("${info.title}"). Not working around it.`); done(2);
  } else {
    const hide = String(args.hide || '').split(',').map((s) => s.trim()).filter(Boolean);
    const css = (hide.length ? `${hide.join(',')} { display: none !important; }` : '') + (args.css || '');
    await ev(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(css)}; document.head.appendChild(s); window.scrollTo(0, 0); return true; })()`);
    if (args.eval) await ev(String(args.eval));
    await new Promise((r) => setTimeout(r, 600));
    let clip;
    if (args.clip) clip = await ev(`(() => { const e = document.querySelector(${JSON.stringify(args.clip)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })()`);
    if (!clip && args.crop) { const [x, y, w, h] = String(args.crop).split(',').map(Number); clip = { x, y, w, h }; }
    if (!clip) clip = { x: 0, y: 0, w: W, h: H };
    if (args.crop && args.clip) { const [dx, dy, w, h] = String(args.crop).split(',').map(Number); clip = { x: clip.x + dx, y: clip.y + dy, w: w || clip.w, h: h || clip.h }; }
    // --until <selector>: extend/limit the clip's height to that element's bottom (+24 px)
    if (args.until) { const b = await ev(`(() => { const e = document.querySelector(${JSON.stringify(args.until)}); if (!e) return null; const r = e.getBoundingClientRect(); return r.bottom + scrollY; })()`); if (b) clip.h = Math.round(b + 24 - clip.y); }
    const finds = String(args.find || '').split('||').map((s) => s.trim()).filter(Boolean);
    const rects = await ev(`(() => {
      const out = {}, clip = ${JSON.stringify(clip)};
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
      // concatenate text with node offsets so a phrase may span several nodes (italics, links)
      let all = ''; const map = [];
      for (const nd of nodes) { map.push([all.length, nd]); all += nd.nodeValue; }
      const norm = (s) => s.replace(/\\s+/g, ' ');
      const locate = (idx) => { let lo = 0; for (let k = 0; k < map.length; k++) if (map[k][0] <= idx) lo = k; else break; return [map[lo][1], idx - map[lo][0]]; };
      for (const f of ${JSON.stringify(finds)}) {
        // whitespace-tolerant search
        const re = new RegExp(f.split(/\\s+/).map((w) => w.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&')).join('\\\\s+'));
        const m = re.exec(all); if (!m) { out[f] = null; continue; }
        const [sn, so] = locate(m.index), [en, eo] = locate(m.index + m[0].length - 1);
        const rg = document.createRange(); rg.setStart(sn, so); rg.setEnd(en, eo + 1);
        const rs = [...rg.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
        // merge boxes on the same line
        const lines = [];
        for (const r of rs) { const L = lines.find((l) => Math.abs(l.y - (r.top + scrollY)) < r.height * 0.5); const x = r.left + scrollX, y = r.top + scrollY;
          if (L) { const x2 = Math.max(L.x + L.w, x + r.width), y2 = Math.max(L.y + L.h, y + r.height); L.x = Math.min(L.x, x); L.y = Math.min(L.y, y); L.w = x2 - L.x; L.h = y2 - L.y; } else lines.push({ x, y, w: r.width, h: r.height }); }
        out[f] = lines.map((l) => ({ x: +(l.x - clip.x).toFixed(1), y: +(l.y - clip.y).toFixed(1), w: +l.w.toFixed(1), h: +l.h.toFixed(1) }));
      }
      return out;
    })()`);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: 1 } }, sessionId);
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out + '.png', Buffer.from(shot.data, 'base64'));
    const meta = { url: args.url, finalUrl: info.url, title: info.title, retrieved: new Date().toLocaleDateString('en-CA'), dpr: DPR, viewport: { w: W, h: H }, clip, rects };
    fs.writeFileSync(args.out + '.json', JSON.stringify(meta, null, 1));
    console.log(JSON.stringify({ png: args.out + '.png', title: info.title, clip, found: Object.fromEntries(Object.entries(rects).map(([k, v]) => [k, v ? v.length : 0])) }));
    done(0);
  }
} catch (e) { console.error('[capture] ERROR', e.message); done(1); }
