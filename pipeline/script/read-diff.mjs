#!/usr/bin/env node
/* What did the host actually say, against the script? The feedback loop for the scriptwriter.
 *   node pipeline/script/read-diff.mjs --script videos/<slug>/script.md --words videos/<slug>/take/transcript.words.json [--out <dir>]
 * Hosts rarely read verbatim: they memorise a few lines and say them their way, redo lines, and riff. So the alignment
 * is by meaning, sentence by sentence: each spoken sentence goes to the script paragraph whose content words it shares
 * most (IDF-weighted, forward order preferred), consecutive sentences for the same paragraph form a take, and the keeper
 * is the LAST take that covers at least 40% of the paragraph's content (else the fullest take).
 * Outputs (in --out, default the transcript's folder):
 *   read-diff.json   every paragraph with its takes, keeper text, coverage, and the off-script stretches
 *   read-diff.md     side by side: the script paragraph, then what he actually said in the keeper take
 *   read-diff.html   the same side by side for reading in the side panel
 * The side-by-side is the evidence for voice lessons: what he expands, simplifies, swaps, adds, and never says.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, readJson, writeJson } from '../swipe/lib.mjs';

const args = parseArgs();
const scriptPath = args.script && path.resolve(ROOT, args.script);
const wordsPath = args.words && path.resolve(ROOT, args.words);
if (!scriptPath || !wordsPath) { console.error('usage: --script <script.md> --words <transcript.words.json> [--out dir]'); process.exit(1); }
const out = path.resolve(ROOT, args.out || path.dirname(wordsPath));
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ---- script paragraphs (spoken lines only)
const md = fs.readFileSync(scriptPath, 'utf8');
const body = /^##\s+Script\b/m.test(md) ? md.split(/^##\s+Script\b[^\n]*\n/m)[1].split(/^##\s(?!#)/m)[0] : md;
const paras = []; let cur = []; let section = '';
for (const raw of body.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)) {
  const l = raw.trim(); const h = l.match(/^#{3,4}\s+(.+)/);
  if (!l || h || /^\[/.test(l) || /^\|/.test(l)) { if (cur.length) { paras.push({ section, text: cur.join(' ').replace(/\s+/g, ' ').trim() }); cur = []; } if (h) section = h[1]; continue; }
  cur.push(l.replace(/\[[^\]]*\]/g, ' ').replace(/\*\*|__/g, ''));
}
if (cur.length) paras.push({ section, text: cur.join(' ').replace(/\s+/g, ' ').trim() });

// ---- content words: lowercase, no stopwords, light stemming
const STOP = new Set(("a an the and or but so to of in on at for with is are was were be been being it its it's this that these those i i'm i've you you're your yours he she we they them their our my me " +
  "what which who whom how why when where there here just like really very can could would should will do does did doing have has had not no yes if then than about into from up down out over all some any more most much many " +
  "one two three also get got gonna going go know kind sort thing things stuff actually basically pretty little lot right okay yeah well mean say said see way even still too back make made let's let").split(/\s+/));
const stem = (w) => w.replace(/'s$/, '').replace(/(ing|ed|es|s)$/, '').replace(/e$/, '');
const content = (t) => (t.toLowerCase().replace(/[’]/g, "'").match(/[a-z0-9']+/g) || []).filter((w) => w.length > 2 && !STOP.has(w)).map(stem);
for (const p of paras) { p.cw = content(p.text); p.set = new Set(p.cw); }
const df = new Map(); for (const p of paras) for (const w of p.set) df.set(w, (df.get(w) || 0) + 1);
const idf = (w) => Math.log(1 + paras.length / (df.get(w) || 0.5));

// ---- transcript sentences
const W = readJson(wordsPath, []);
// Sentence breaks: punctuation, or (whisper sometimes stops punctuating in long takes) a pause of 0.6 s+ between words,
// or 30 words without either. Learned on the bad-breath take: after ~22:00 there was no punctuation at all.
const sents = []; let buf = [];
for (let k = 0; k < W.length; k++) {
  const w = W[k]; buf.push(w);
  const next = W[k + 1];
  const pause = next ? next.t - w.end : 0;
  if (/[.?!]["')]*$/.test(w.w) || (pause >= 0.6 && buf.length >= 4) || buf.length >= 30) { sents.push(buf); buf = []; }
}
if (buf.length) sents.push(buf);
const S = sents.map((ws) => { const text = ws.map((w) => w.w).join(' ').replace(/\s+([,.?!])/g, '$1').trim(); const cw = content(text); return { t: ws[0].t, end: ws[ws.length - 1].end, n: ws.length, text, cw: [...new Set(cw)] }; });

// ---- assign each sentence to its best paragraph (forward order preferred)
let lastP = 0;
for (const s of S) {
  if (s.cw.length < 2) { s.p = -1; continue; }
  const tot = s.cw.reduce((a, w) => a + idf(w), 0);
  let best = -1, bestScore = 0;
  paras.forEach((p, pi) => {
    const hit = s.cw.filter((w) => p.set.has(w));
    if (hit.length < 2) return;
    let sc = hit.reduce((a, w) => a + idf(w), 0) / tot;
    if (pi >= lastP && pi <= lastP + 2) sc *= 1.15; // the host usually moves forward through the script
    if (sc > bestScore) { bestScore = sc; best = pi; }
  });
  s.p = bestScore >= 0.42 ? best : -1; s.score = Math.round(bestScore * 100) / 100;
  if (s.p >= 0) lastP = s.p;
}
// ---- takes: consecutive sentences for one paragraph (one stray sentence allowed inside)
const takes = [];
for (let i = 0; i < S.length; i++) {
  if (S[i].p < 0) continue;
  const last = takes[takes.length - 1];
  if (last && last.p === S[i].p && i - last.to <= 2) last.to = i; else takes.push({ p: S[i].p, from: i, to: i });
}
for (const tk of takes) {
  const words = new Set(S.slice(tk.from, tk.to + 1).flatMap((s) => s.cw));
  const p = paras[tk.p]; const tot = [...p.set].reduce((a, w) => a + idf(w), 0);
  tk.cover = [...p.set].filter((w) => words.has(w)).reduce((a, w) => a + idf(w), 0) / (tot || 1);
  tk.t = S[tk.from].t; tk.end = S[tk.to].end;
  tk.text = S.slice(tk.from, tk.to + 1).map((s) => s.text).join(' ');
  tk.words = S.slice(tk.from, tk.to + 1).reduce((a, s) => a + s.n, 0);
}

const result = paras.map((p, pi) => {
  const mine = takes.filter((t) => t.p === pi);
  const good = mine.filter((t) => t.cover >= 0.4);
  const keeper = good.length ? good[good.length - 1] : [...mine].sort((a, b) => b.cover - a.cover)[0] || null;
  return {
    i: pi + 1, section: p.section, script: p.text, script_words: p.text.split(/\s+/).length,
    takes: mine.map((t) => ({ at: mmss(t.t), cover: Math.round(t.cover * 100), words: t.words })),
    keeper: keeper ? { at: mmss(keeper.t), cover: Math.round(keeper.cover * 100), words: keeper.words, seconds: Math.round(keeper.end - keeper.t), text: keeper.text } : null,
  };
});
const inTake = new Set(takes.flatMap((t) => Array.from({ length: t.to - t.from + 1 }, (_, k) => t.from + k)));
const off = []; let run = [];
S.forEach((s, i) => { if (!inTake.has(i)) run.push(s); else { if (run.reduce((a, x) => a + x.n, 0) >= 12) off.push(run); run = []; } });
if (run.reduce((a, x) => a + x.n, 0) >= 12) off.push(run);
const offOut = off.map((r) => ({ at: mmss(r[0].t), words: r.reduce((a, x) => a + x.n, 0), text: r.map((x) => x.text).join(' ') }));

const found = result.filter((r) => r.keeper);
const totals = {
  paragraphs: paras.length, found: found.length, retaken: result.filter((r) => r.takes.length > 1).length,
  recording: mmss(W.length ? W[W.length - 1].end : 0),
  keeper_time: mmss(found.reduce((a, r) => a + r.keeper.seconds, 0)),
  keeper_wpm: Math.round(found.reduce((a, r) => a + r.keeper.words, 0) / (found.reduce((a, r) => a + r.keeper.seconds, 0) / 60 || 1)),
  script_words: result.reduce((a, r) => a + r.script_words, 0), spoken_words_in_keepers: found.reduce((a, r) => a + r.keeper.words, 0),
  off_script_words: offOut.reduce((a, o) => a + o.words, 0),
};
writeJson(path.join(out, 'read-diff.json'), { totals, paragraphs: result, off_script: offOut });

const L = [`# Read vs script: ${path.basename(path.dirname(scriptPath))}`, '',
  `Recording ${totals.recording} · ${totals.found}/${totals.paragraphs} script paragraphs delivered · ${totals.retaken} matched in more than one place (retakes, in-place restarts or repeated content: check by hand) · keeper takes add up to ${totals.keeper_time} at about ${totals.keeper_wpm} words/min (rough: pauses inside takes count) · script ${totals.script_words} words, his keepers ${totals.spoken_words_in_keepers} words · ${totals.off_script_words} words off script`, ''];
for (const r of result) {
  L.push(`## ¶${r.i}${r.section ? ` · ${r.section}` : ''}`, '', `**Script:** ${r.script}`, '');
  if (!r.keeper) { L.push('**Said:** (not found: skipped, or said too differently to match)', ''); continue; }
  L.push(`**Said** (keeper ${r.keeper.at}, covers ${r.keeper.cover}% of the content${r.takes.length > 1 ? `; takes at ${r.takes.map((t) => t.at).join(', ')}` : ''}): ${r.keeper.text}`, '');
}
L.push('## Off script', '', ...offOut.map((o) => `- ${o.at} (${o.words} words): ${o.text}`));
fs.writeFileSync(path.join(out, 'read-diff.md'), L.join('\n') + '\n');

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Read vs script</title>
<style>:root{--bg:#fbf8f2;--ink:#15171c;--muted:#6b6f78;--line:#e6e0d4;--a:#eef2f8;--b:#eef7ef}@media(prefers-color-scheme:dark){:root{--bg:#101216;--ink:#eef0f3;--muted:#9aa0aa;--line:#262a31;--a:#161d29;--b:#15231a}}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.55 system-ui,sans-serif;padding:16px}main{max-width:1100px;margin:0 auto}
.meta{color:var(--muted);margin-bottom:16px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 14px}@media(max-width:760px){.row{grid-template-columns:1fr}}
.c{border-radius:10px;padding:10px 12px}.s{background:var(--a)}.h{background:var(--b)}.lab{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}h2{font-size:14px;color:var(--muted);margin:20px 0 6px;border-top:1px solid var(--line);padding-top:10px}</style></head>
<body><main><h1 style="font-size:20px">What you said vs the script</h1><div class="meta">${esc(L[2])}</div>
${result.map((r) => `<h2>¶${r.i}${r.section ? ' · ' + esc(r.section) : ''}</h2><div class="row"><div class="c s"><div class="lab">Script</div>${esc(r.script)}</div><div class="c h"><div class="lab">You said${r.keeper ? ` · ${r.keeper.at}` : ''}</div>${r.keeper ? esc(r.keeper.text) : '<i>not found</i>'}</div></div>`).join('\n')}
</main></body></html>`;
fs.writeFileSync(path.join(out, 'read-diff.html'), html);
console.log(`[read-diff] ${totals.found}/${totals.paragraphs} paragraphs delivered, ${totals.retaken} matched in more than one place (retakes, in-place restarts or repeated content: check by hand); keepers ${totals.keeper_time} at ${totals.keeper_wpm} wpm (script ${totals.script_words} words vs his ${totals.spoken_words_in_keepers}); ${totals.off_script_words} words off script -> ${path.relative(ROOT, out)}/read-diff.{md,html,json}`);
