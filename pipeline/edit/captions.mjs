#!/usr/bin/env node
// YouTube captions from the final cut's own transcription (work/cut-transcript.words.json): readable cues instead of
// one cue per word. Lines up to --chars (42), cues up to 2 lines and --max (5.5) s, broken at sentence ends and at
// pauses over 0.35 s. Word starts are moved earlier by edit/timing.json wordLead (whisper starts run late, same as the
// word map). Spelling fixes (brand and science names whisper gets wrong) come from edit/caption-fixes.json:
// { "fixes": [["Aqua Clean Duo", "AquaClean Duo"], ...] } (plain text, case-sensitive).
//   node pipeline/edit/captions.mjs --slug bad-breath-for-good [--out out/final/deliver/captions.srt]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const VD = path.join(ROOT, 'videos', args.slug);
const words = JSON.parse(fs.readFileSync(path.join(VD, 'work', 'cut-transcript.words.json'), 'utf8')).filter((w) => String(w.w).trim() && !/^\[.*\]$/.test(w.w));
const tm = fs.existsSync(path.join(VD, 'edit', 'timing.json')) ? JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'timing.json'), 'utf8')) : {};
const lead = +(tm.wordLead ?? 0);
const fixes = fs.existsSync(path.join(VD, 'edit', 'caption-fixes.json')) ? JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'caption-fixes.json'), 'utf8')).fixes : [];
const CH = +(args.chars ?? 42), MAX = +(args.max ?? 5.5);
// fixes apply to the word list first, so a name can never be split across two cues ("Aqua | Clean Duo")
for (const [a, b] of fixes) {
  const parts = a.split(' '), norm = (s) => String(s).trim().replace(/[.,!?;:]+$/, '');
  for (let i = 0; i + parts.length <= words.length; i++) {
    if (!parts.every((p, k) => norm(words[i + k].w) === p)) continue;
    const tail = String(words[i + parts.length - 1].w).trim().match(/[.,!?;:]+$/)?.[0] || '';
    words.splice(i, parts.length, { ...words[i], w: b + tail, end: words[i + parts.length - 1].end });
  }
}
// a clip that opens the video (the TikTok the host reacts to) is labelled, not transcribed: whisper garbles
// someone else's audio under the host's room sound. --intro <seconds> [--intro-label "[TikTok]"]
const intro = +(args.intro ?? 0);
if (intro > 0) { const k = words.findIndex((w) => w.t >= intro - 0.05); words.splice(0, k < 0 ? words.length : k); }

const cues = []; let cur = [];
const flush = () => { if (cur.length) cues.push(cur); cur = []; };
const text = (ws) => ws.map((w) => String(w.w).trim()).join(' ');
for (let i = 0; i < words.length; i++) {
  const w = words[i], next = words[i + 1];
  cur.push(w);
  const len = text(cur).length, dur = w.end - cur[0].t;
  const end = /[.?!]["']?$/.test(w.w), pause = next ? next.t - w.end > 0.35 : true;
  const nextLen = next ? len + 1 + String(next.w).trim().length : 0;
  if (!next || (end && len > 14) || pause || nextLen > CH * 2 || dur > MAX) flush();
}
flush();
const fmt = (s) => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x.toFixed(3).replace('.', ',').padStart(6, '0')}`; };
const lines = (t) => { if (t.length <= CH) return t; const mid = t.length / 2; let best = -1; for (let i = 0; i < t.length; i++) if (t[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i; return best < 0 ? t : t.slice(0, best) + '\n' + t.slice(best + 1); };
let srt = '', n = 0, prevEnd = 0;
if (intro > 0) { srt += `${++n}\n${fmt(0)} --> ${fmt(intro - 0.2)}\n${args['intro-label'] || '[TikTok]'}\n\n`; prevEnd = intro - 0.2; }
for (const c of cues) {
  const t = text(c);
  const a = Math.max(prevEnd, c[0].t - lead), b = Math.max(a + 0.8, c.at(-1).end - lead);
  srt += `${++n}\n${fmt(a)} --> ${fmt(b)}\n${lines(t)}\n\n`; prevEnd = b;
}
const out = path.resolve(VD, args.out || 'out/final/deliver/captions.srt');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, srt);
console.log(JSON.stringify({ out: path.relative(ROOT, out).split(path.sep).join('/'), cues: n, words: words.length, lead }));
