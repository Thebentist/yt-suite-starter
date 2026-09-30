#!/usr/bin/env node
/* Reading copy of a script: what the host actually reads on camera, nothing else.
 *   node pipeline/script/read-copy.mjs <videos/<slug>/script.md> [--out <file.html>] [--wpm 236]
 * Writes <name>-read.html (opens in the Claude side panel; big type, spoken lines only, section markers, estimated
 * timestamps; [VISUAL] cues and [OPTIONAL DEMO] blocks hidden behind toggles; text size and dark/light switchable)
 * and <name>-read.txt (plain spoken text for teleprompter apps).
 * Only the "## Script" section is used; tables, sign-off lists, descriptions, pinned comments and notes stay in the .md.
 * Learned from the bad-breath read, 2026-09-28: "- " bullet lines are beats he talks through (not lines to read). They render
 * as a bulleted list and each counts as at least BEAT_WORDS words for timing. The default wpm is the host's
 * channels/<host>.json script_wpm (script words per finished minute; the original host's was 140), not the talking pace.
 * --channel <id> reads another channel's numbers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, readJson } from '../swipe/lib.mjs';
import { hostId } from '../host.mjs';

const args = parseArgs();
const HOST = args.channel && args.channel !== true ? String(args.channel) : hostId();
const file = args._[0] && path.resolve(ROOT, args._[0]);
if (!file || !fs.existsSync(file)) { console.error('usage: read-copy.mjs <script.md> [--out file.html] [--wpm 236]'); process.exit(1); }
const md = fs.readFileSync(file, 'utf8');
const title = (md.match(/^#\s+(.+)$/m)?.[1] || path.basename(file, '.md')).trim();
const body = /^##\s+Script\b/m.test(md) ? md.split(/^##\s+Script\b[^\n]*\n/m)[1].split(/^##\s(?!#)/m)[0] : md;
const fp = readJson(path.join(ROOT, 'voice', HOST, 'fingerprint.json'), null);
const ch = readJson(path.join(ROOT, 'channels', HOST + '.json'), null);
const wpm = Number(args.wpm || ch?.script_wpm || fp?.wpm?.median || 230);
const BEAT_WORDS = 35; // bad-breath read, 2026-09-28: median words he says between look-downs

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (t) => esc(t)
  .replace(/\[(?:VISUAL|ON SCREEN|TEXT|B-ROLL|HOLD|SFX|MUSIC|CUE)[^\]]*\]/gi, (m) => `<span class="cue">${m}</span>`)
  .replace(/\[BEN:[^\]]*\]/gi, (m) => `<span class="ben">${m}</span>`)
  .replace(/\*\*(.+?)\*\*/g, '$1').replace(/(?<![\w*])\*(?!\s)(.+?)\*(?!\w)/g, '$1').replace(/__(.+?)__/g, '$1');
const spokenWords = (t) => t.replace(/\[[^\]]*\]/g, ' ').split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// Blocks: headings, cue-only lines, optional-demo blocks (a line starting "[OPTIONAL DEMO" until its closing "]"), paragraphs.
const lines = body.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
const blocks = []; let para = [];
const flush = () => { if (para.length) { blocks.push({ kind: 'p', text: para.join(' ') }); para = []; } };
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (!l) { flush(); continue; }
  if (/^\|/.test(l) || /^---+$/.test(l)) { flush(); continue; }
  const h = l.match(/^#{2,4}\s+(.+)/);
  if (h) { flush(); blocks.push({ kind: 'h', text: h[1].replace(/\*\*/g, '') }); continue; }
  if (/^\[OPTIONAL DEMO/i.test(l) || /^\[DEMO/i.test(l)) {
    flush(); let t = l; while (!/\]\s*$/.test(t) && i + 1 < lines.length) t += ' ' + lines[++i].trim();
    blocks.push({ kind: 'demo', text: t.replace(/^\[|\]$/g, '') }); continue;
  }
  if (/^\[[^\]]*\]$/.test(l)) { flush(); blocks.push({ kind: 'cue', text: l }); continue; }
  if (/^\[(CALLOUT|STANDALONE)/i.test(l)) { flush(); blocks.push({ kind: 'callout', text: l.replace(/^\[|\]$/g, '') }); continue; }
  if (/^[-*]\s+/.test(l)) { // a beat (bad-breath read, 2026-09-28)
    flush(); const item = l.replace(/^[-*]\s+/, '');
    const last = blocks[blocks.length - 1];
    if (last && last.kind === 'beats') last.items.push(item); else blocks.push({ kind: 'beats', items: [item] });
    continue;
  }
  para.push(l.replace(/^>\s?/, ''));
}
flush();

let words = 0;
for (const b of blocks) {
  b.at = mmss((words / wpm) * 60);
  if (b.kind === 'p') words += spokenWords(b.text);
  if (b.kind === 'beats') words += b.items.reduce((a, it) => a + Math.max(BEAT_WORDS, spokenWords(it)), 0);
}
const total = mmss((words / wpm) * 60);

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--bg:#fbf8f2;--ink:#15171c;--muted:#6b6f78;--line:#e6e0d4;--cue:#2e6fd8;--cueBg:#eaf1fd;--ben:#9a5b00;--benBg:#fff2dc;--demo:#6d3fc0;--demoBg:#f2ecfc;--size:28px}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#101216;--ink:#eef0f3;--muted:#9aa0aa;--line:#262a31;--cue:#8db4ff;--cueBg:#172235;--ben:#ffc266;--benBg:#2b2213;--demo:#c3a6ff;--demoBg:#211a31}}
:root[data-theme=dark]{--bg:#101216;--ink:#eef0f3;--muted:#9aa0aa;--line:#262a31;--cue:#8db4ff;--cueBg:#172235;--ben:#ffc266;--benBg:#2b2213;--demo:#c3a6ff;--demoBg:#211a31}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink)}
body{font:var(--size)/1.6 Georgia,'Iowan Old Style','Times New Roman',serif;padding:0 16px 30vh}
.bar{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 0;font:15px/1.2 system-ui,sans-serif;color:var(--muted);max-width:40em;margin:0 auto}
.bar b{color:var(--ink);font-weight:600;margin-right:auto}
.bar button{font:inherit;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:8px;padding:6px 10px;cursor:pointer}
.bar button[aria-pressed=true]{background:var(--ink);color:var(--bg)}
main{max-width:30em;margin:0 auto}
h1{font:600 1.1em/1.3 system-ui,sans-serif;margin:1.2em 0 .2em}
.meta{font:15px/1.4 system-ui,sans-serif;color:var(--muted);margin-bottom:1.5em}
h2{font:600 15px/1.3 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-top:1px solid var(--line);padding-top:1.2em;margin:2em 0 .8em;display:flex;justify-content:space-between}
p{margin:0 0 1.1em}
.t{font:13px system-ui,sans-serif;color:var(--muted)}
.cue{display:none;font:15px/1.4 system-ui,sans-serif;color:var(--cue);background:var(--cueBg);border-radius:6px;padding:2px 6px}
div.cue{margin:0 0 1em;padding:6px 10px}
body.cues .cue{display:inline}body.cues div.cue{display:block}
.ben{font:16px/1.4 system-ui,sans-serif;color:var(--ben);background:var(--benBg);border-radius:6px;padding:2px 6px}
.demo,.callout{display:none;font:16px/1.45 system-ui,sans-serif;border-radius:10px;padding:10px 14px;margin:0 0 1.1em}
.demo{color:var(--demo);background:var(--demoBg)}.callout{display:block;color:var(--ben);background:var(--benBg)}
body.demos .demo{display:block}
ul.beats{margin:0 0 1.1em;padding-left:1.1em}ul.beats li{margin:0 0 .35em}ul.beats li::marker{color:var(--muted)}
.beatlabel{font:13px/1.2 system-ui,sans-serif;color:var(--muted);letter-spacing:.04em;margin:0 0 .3em}
</style></head><body class="">
<div class="bar"><b>${esc(title)}</b>
<button id="cues" aria-pressed="false">Visual cues</button>
<button id="demos" aria-pressed="false">Optional demos</button>
<button id="smaller">A−</button><button id="bigger">A+</button><button id="theme">Light/Dark</button></div>
<main><h1>${esc(title)}</h1>
<div class="meta">${words.toLocaleString()} spoken words${blocks.some((b) => b.kind === 'beats') ? ` (a beat counts as ${BEAT_WORDS})` : ''} · about ${total} at ${wpm} script words a finished minute · timestamps are estimates</div>
${blocks.map((b) => b.kind === 'h' ? `<h2><span>${esc(b.text)}</span><span class="t">${b.at}</span></h2>`
  : b.kind === 'cue' ? `<div class="cue">${esc(b.text)}</div>`
  : b.kind === 'demo' ? `<div class="demo">${inline(b.text)}</div>`
  : b.kind === 'callout' ? `<div class="callout">${inline(b.text)}</div>`
  : b.kind === 'beats' ? `<div class="beatlabel">BEATS · say it your way</div><ul class="beats">${b.items.map((it) => `<li>${inline(it)}</li>`).join('')}</ul>`
  : `<p>${inline(b.text)}</p>`).join('\n')}
</main>
<script>
const b=document.body,r=document.documentElement;const st=(k,v)=>{try{v===undefined?0:localStorage.setItem(k,v);return localStorage.getItem(k)}catch(e){return null}};
const tog=(id,cls)=>{const el=document.getElementById(id);const on=st(cls)==='1';b.classList.toggle(cls,on);el.setAttribute('aria-pressed',on);el.onclick=()=>{const n=!b.classList.contains(cls);b.classList.toggle(cls,n);el.setAttribute('aria-pressed',n);st(cls,n?'1':'0')}};
tog('cues','cues');tog('demos','demos');
let size=Number(st('size'))||28;const set=()=>{r.style.setProperty('--size',size+'px');st('size',size)};set();
document.getElementById('smaller').onclick=()=>{size=Math.max(18,size-2);set()};document.getElementById('bigger').onclick=()=>{size=Math.min(48,size+2);set()};
const th=st('theme');if(th)r.dataset.theme=th;document.getElementById('theme').onclick=()=>{const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';st('theme',r.dataset.theme)};
</script></body></html>`;

const out = path.resolve(ROOT, String(args.out || file.replace(/\.md$/, '-read.html')));
fs.writeFileSync(out, html);
const plain = (t) => t.replace(/\[[^\]]*\]/g, '').replace(/\*\*|__/g, '').replace(/\s{2,}/g, ' ').trim();
const txt = blocks.filter((b) => b.kind === 'h' || b.kind === 'p' || b.kind === 'beats')
  .map((b) => (b.kind === 'h' ? `\n${b.text.toUpperCase()}\n` : b.kind === 'beats' ? b.items.map((it) => `• ${plain(it)}`).join('\n') : plain(b.text))).join('\n\n');
fs.writeFileSync(out.replace(/\.html$/, '.txt'), `${title}\n${txt.trim()}\n`);
console.log(`[read-copy] ${path.relative(ROOT, out)} (+ .txt): ${words} spoken words, about ${total}`);
