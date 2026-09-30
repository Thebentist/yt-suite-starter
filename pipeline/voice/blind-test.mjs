#!/usr/bin/env node
/* Blind test: can a reader tell our script's paragraphs from the host really talking?
 *
 *   node pipeline/voice/blind-test.mjs --script videos/<slug>/script.md [--channel thebentist] [--type explainer]
 *        [--n 12] [--seed 7] [--out videos/<slug>/blind] [--control self|<channel>] [--keep-commas]
 *   node pipeline/voice/blind-test.mjs --score <out>/key.json <verdict1.json> [<verdict2.json> ...]
 *
 * Writes quiz.json (unlabelled items), key.json (labels + where each came from), judge-prompt.md (the exact prompt for a
 * fresh model judge) and quiz.html (a self-scoring page for a person).
 * Real items come from the host's passage bank (voice/<channel>/passages.json, host >= 0.5, no sponsor reads), about 70%
 * from videos of the script's type. Everything, real or ours, is re-chunked on sentence boundaries to 45-110 words and
 * normalised (no um/uh, no stutters, no ellipses, no shouting) so transcription noise isn't the clue. For thebentist,
 * commas are stripped from both sides (whisper's commas vs a writer's commas would be a clue) unless --keep-commas.
 * --control self: the "AI" half is real host passages from held-out videos (the judge's noise floor: should be ~50%).
 * --control <channel>: the "AI" half is another creator's real passages (e.g. cleoabram: what a scripted human reads like).
 * Pass rule (docs/huge-if-true-writing.md section 16): each Sonnet-class judge under 60%, no paragraph caught by every
 * judge, and within 15 points of the same judge on a control. A strong judge (Opus) sorts composed from transcribed text
 * almost perfectly even for real scripted creators: use its reasons to find tells, not its score as the gate.
 */
import { hostId } from '../host.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, readJson } from '../swipe/lib.mjs';

const args = parseArgs();
if (args.score) { score(String(args.score), args._); process.exit(0); }

const id = args.channel || hostId();
const isControl = args.control && args.control !== true;
const scriptPath = args.script && path.resolve(ROOT, String(args.script));
if (!isControl && (!scriptPath || !fs.existsSync(scriptPath))) { console.error('usage: --script <script.md> [--channel id] [--type t] [--n 12] [--seed 7] | --control self|<channel> [--channel id]'); process.exit(2); }
const N = Number(args.n || 12);
const out = path.resolve(ROOT, String(args.out || (scriptPath ? path.join(path.dirname(scriptPath), 'blind') : path.join('voice', id, 'blind-control'))));
fs.mkdirSync(out, { recursive: true });

let s = (Number(args.seed || 7) >>> 0) || 1;
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wc = (t) => t.split(/\s+/).filter(Boolean).length;
const take = (arr, k) => shuffle(arr.slice()).slice(0, k);

// Stutters and doubled words ("you you you", "is, is") collapse to one, repeated until nothing changes.
const unstutter = (t) => { let prev; do { prev = t; t = t.replace(/\b(\w+(?:\s+\w+){0,2}),?\s+\1\b/gi, '$1'); } while (t !== prev); return t; };
const normalize = (t) => unstutter(t
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/—|–/g, ', '))
  .replace(/\b[A-Z][A-Z]+:\s*/g, '')
  .replace(/\.{2,}|…/g, ',')
  .replace(/\b(um+|uh+|erm)\b[,.]?\s*/gi, '')
  .replace(/\b(\w+(?:\s+\w+){0,2})\s+\1\b/gi, '$1')
  .replace(/\b([A-Z]{4,})\b/g, (m) => m[0] + m.slice(1).toLowerCase())
  .replace(/([.!?])\s+([a-z])/g, (m, p, c) => p + ' ' + c.toUpperCase())
  .replace(/,(?=[^\s\d])/g, ', ') // space after a comma, but never inside a number ("$5,000")
  .replace(/\s+([,.!?])/g, '$1').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
const stripCommas = !args['keep-commas'] && id === 'thebentist';
const sc = (t) => (stripCommas ? t.replace(/(\d),(\d{3})/g, '$1$2').replace(/,/g, '') : t);
const chunk = (t) => {
  const sents = t.split(/(?<=[.!?])\s+/).filter((x) => wc(x) > 1);
  const paras = []; let cur = [];
  for (const sent of sents) {
    cur.push(sent);
    if (wc(cur.join(' ')) >= 45 + Math.floor(rnd() * 50)) { paras.push(cur.join(' ')); cur = []; }
  }
  return paras.filter((p) => wc(p) <= 130 && /^[A-Z0-9"']/.test(p) && /[.!?]$/.test(p));
};

// ---- our paragraphs: spoken lines only, flattened and re-chunked like the transcripts (paragraph edges are not a clue)
const md = scriptPath && fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, 'utf8') : '';
const body = /^##\s+Script\b/m.test(md) ? md.split(/^##\s+Script\b[^\n]*\n/m)[1].split(/^##\s/m)[0] : md;
const spoken = body.replace(/<!--[\s\S]*?-->/g, ' ').split(/\r?\n/).map((l) => l.trim())
  .filter((l) => l && !/^(#|\||>|---|```|\[)/.test(l) && !/^\s*[-*]\s+\w+:/.test(l) && !/^\*\*[^*]+:\*\*/.test(l))
  .map((l) => l.replace(/\[[^\]]*\]/g, ' ').replace(/\*\*|__|\*/g, '').replace(/^[-*]\s+/, ''))
  .join(' ');
const ours = chunk(normalize(spoken)).map(sc);

// ---- real paragraphs from the host's passage bank
const bank = readJson(path.join(ROOT, 'voice', id, 'passages.json'), null);
if (!bank) { console.error(`voice/${id}/passages.json missing: node pipeline/voice/passages.mjs build --channel ${id}`); process.exit(1); }
const type = args.type && args.type !== true ? String(args.type) : md.match(/^\s*(?:\*\*)?type(?:\*\*)?:\s*(\w+)/im)?.[1]?.toLowerCase() || null;
const hostPs = bank.passages.filter((p) => p.host >= 0.5 && !p.functions.includes('sponsor'));
const toItems = (ps) => ps.flatMap((p) => chunk(normalize(p.text)).map((text) => ({ text: sc(text), src: `${id}:${p.id}`, vid: p.vid, type: p.type })));

let mine, realPool = toItems(hostPs);
const control = args.control && args.control !== true ? String(args.control) : null;
if (control === 'self') {
  const vids = shuffle([...new Set(realPool.map((r) => r.vid))]);
  const held = new Set(vids.slice(0, Math.ceil(vids.length / 2)));
  mine = take(realPool.filter((r) => held.has(r.vid)), N).map((r) => ({ ...r, src: 'control-self:' + r.src }));
  realPool = realPool.filter((r) => !held.has(r.vid));
  console.log('CONTROL MODE (self): the AI-labelled half is real host passages from held-out videos');
} else if (control) {
  const other = readJson(path.join(ROOT, 'voice', control, 'passages.json'), null);
  if (!other) { console.error(`no passage bank for ${control}`); process.exit(1); }
  mine = take(other.passages.filter((p) => !p.functions.includes('sponsor')).flatMap((p) => chunk(normalize(p.text)).map((text) => ({ text: sc(text), src: `control-${control}:${p.id}` }))), N);
  console.log(`CONTROL MODE (${control}): the AI-labelled half is real ${control} passages`);
} else mine = take(ours, N).map((text) => ({ text, src: 'script' }));

// Topic matching (on unless --no-topic-match): judges use topic even when told not to, so the real half is drawn from
// the passages closest to the script's subject: scored by how many of the script's content words they contain.
let pool = realPool;
if (!args['no-topic-match'] && ours.length) {
  const SW = new Set('about after again also because been being could didn doesn every first going gonna great little maybe might people pretty really right should something still their there these thing things think those through would actually basically kind like just know that this with have what when where which your from they them then than were will into only other over some much more most very even while'.split(' '));
  const tf = new Map();
  for (const w of ours.join(' ').toLowerCase().match(/[a-z]{5,}/g) || []) if (!SW.has(w)) tf.set(w, (tf.get(w) || 0) + 1);
  const content = [...tf].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([w]) => w);
  const score = (t) => { const ws = new Set(t.toLowerCase().match(/[a-z]{5,}/g) || []); return content.filter((w) => ws.has(w) || ws.has(w.replace(/s$/, ''))).length; };
  pool = realPool.map((r) => ({ ...r, topic: score(r.text) })).sort((a, b) => b.topic - a.topic || (rnd() - 0.5));
  pool = pool.slice(0, Math.max(N * 4, 40)); // the closest few dozen, then sampled as usual
}
const sameType = type ? pool.filter((r) => r.type === type) : [];
const nSame = Math.min(sameType.length, Math.round(N * 0.7));
const real = [...take(sameType, nSame), ...take(pool.filter((r) => !sameType.includes(r)), N - nSame)];
// --mask-names: for scripts on a story the host never covered, mid-sentence capitalised names become "[name]" on BOTH
// sides (the story's company and outlets in ours, commenters and creators in theirs), so names can't give either away.
if (args['mask-names']) {
  const mask = (t) => t.replace(/(?<![.?!]\s|^)\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*/g, (m) => (/^(I|I'm|I've|I'll|I'd|OK|Okay)$/.test(m) ? m : '[name]'));
  for (const r of real) r.text = mask(r.text);
  for (const m of mine) m.text = mask(m.text);
}
// one item per video where possible, so a single memorable video can't dominate
if (mine.length < N) console.error(`only ${mine.length} eligible script paragraphs (need ${N}); the quiz is smaller`);

const items = shuffle([...real.map((r) => ({ text: r.text, src: r.src, label: 'HUMAN' })), ...mine.map((m) => ({ text: m.text, src: m.src, label: 'AI' }))])
  .map((it, i) => ({ id: i + 1, ...it }));
fs.writeFileSync(path.join(out, 'quiz.json'), JSON.stringify(items.map(({ id: i, text }) => ({ id: i, text })), null, 2));
fs.writeFileSync(path.join(out, 'key.json'), JSON.stringify(items.map(({ id: i, label, src, text }) => ({ id: i, label, src, text })), null, 2));

const chJson = readJson(path.join(ROOT, 'channels', `${id}.json`), {});
const who = (chJson.host || id).split(',')[0];
const prompt = `You are judging short passages from YouTube videos. Each passage is either (a) a transcript of ${who} really talking to camera, or (b) a passage written by an AI model to imitate how ${who} talks. About half are each. Transcripts were cleaned (filler words, stutters and punctuation quirks removed), so don't rely on those.

For every passage decide HUMAN or AI, give a confidence from 1 (coin flip) to 5 (certain), and one short reason naming the specific feature of the wording that decided it. Topic is not a clue; both kinds cover the same topics. Judge only how the words are put together.

Return ONLY a JSON array: [{"id":1,"label":"HUMAN"|"AI","confidence":1-5,"reason":"..."}, ...]

${items.map((it) => `[${it.id}] ${it.text}`).join('\n\n')}
`;
fs.writeFileSync(path.join(out, 'judge-prompt.md'), prompt);

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Human or AI</title>
<style>:root{--bg:#f6f1e7;--ink:#0b0f1a;--card:#fff;--acc:#ffcc33;--bad:#ff6b6b;--good:#6bcf9b}@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0b0f1a;--ink:#f6f1e7;--card:#161b2a}}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.5 Georgia,serif;padding:24px 16px}main{max-width:720px;margin:0 auto}h1{font-size:1.4em}.card{background:var(--card);border-radius:12px;padding:16px;margin:14px 0;box-shadow:0 1px 4px rgba(0,0,0,.08)}.n{opacity:.5;font-size:.8em}.btns{margin-top:10px;display:flex;gap:8px}button{font:inherit;padding:8px 14px;border-radius:8px;border:1px solid rgba(0,0,0,.2);background:transparent;color:inherit;cursor:pointer}button.on{background:var(--acc);color:#0b0f1a}#res{font-weight:bold}.h{border-left:4px solid var(--good)}.a{border-left:4px solid var(--bad)}</style></head>
<body><main><h1>Human or AI?</h1><p>Half of these are ${esc(who)} really talking. Half were written by a model to sound like him. Pick one for each, then press Score.</p>
${items.map((it) => `<div class="card" data-id="${it.id}"><div class="n">${it.id} of ${items.length}</div><div>${esc(it.text)}</div><div class="btns"><button data-v="HUMAN">Human</button><button data-v="AI">AI</button></div></div>`).join('')}
<p><button id="go">Score</button> <span id="res"></span></p></main>
<script>const KEY=${JSON.stringify(Object.fromEntries(items.map((it) => [it.id, it.label])))};const picks={};
document.querySelectorAll('.card').forEach(c=>c.querySelectorAll('button').forEach(b=>b.onclick=()=>{picks[c.dataset.id]=b.dataset.v;c.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));}));
document.getElementById('go').onclick=()=>{let right=0,n=0,caught=0,ai=0;document.querySelectorAll('.card').forEach(c=>{const id=c.dataset.id,k=KEY[id],p=picks[id];if(!p)return;n++;if(p===k)right++;if(k==='AI'){ai++;if(p==='AI')caught++;}c.classList.add(k==='AI'?'a':'h');});
const pct=n?Math.round(100*right/n):0;document.getElementById('res').textContent=n?\`\${right}/\${n} right (\${pct}%). You caught \${caught} of \${ai} AI paragraphs. Coin flip is 50%; under 60% means the script passes.\`:'Pick something first.';};</script></body></html>`;
fs.writeFileSync(path.join(out, 'quiz.html'), html);
console.log(`[blind] ${items.length} items (${mine.length} ${control ? 'control' : 'script'}, ${real.length} real ${who}: ${nSame} from ${type || 'any'} videos). Real pool ${realPool.length}, script paragraphs ${ours.length}. Commas ${stripCommas ? 'stripped' : 'kept'}.`);
console.log(`[blind] wrote ${path.relative(ROOT, out)}/quiz.json, key.json, judge-prompt.md, quiz.html`);

function score(keyPath, verdictPaths) {
  const key = JSON.parse(fs.readFileSync(path.resolve(ROOT, keyPath), 'utf8'));
  const flagged = {};
  const accs = [];
  for (const vp of verdictPaths) {
    let v = JSON.parse(fs.readFileSync(path.resolve(ROOT, vp), 'utf8').replace(/^[^[{]*/, '').replace(/[^\]}]*$/, ''));
    if (!Array.isArray(v)) v = Object.entries(v).map(([i, label]) => ({ id: +i, label }));
    const byId = Object.fromEntries(v.map((x) => [x.id, x]));
    let right = 0, caught = 0, falseAlarm = 0, nAI = 0, nH = 0;
    for (const k of key) {
      const g = byId[k.id]; if (!g) continue;
      const lab = String(g.label).toUpperCase();
      if (k.label === 'AI') { nAI++; if (lab === 'AI') { caught++; right++; (flagged[k.id] ||= []).push(`${path.basename(vp)}: ${g.reason || ''} (conf ${g.confidence ?? '?'})`); } }
      else { nH++; if (lab === 'AI') falseAlarm++; else right++; }
    }
    const acc = Math.round((100 * right) / key.length);
    accs.push(acc);
    console.log(`${path.basename(vp)}: accuracy ${acc}% | caught ${caught}/${nAI} AI | false alarms ${falseAlarm}/${nH} real | ${acc < 60 ? 'PASS' : 'FAIL'}`);
  }
  const all = Object.entries(flagged).filter(([, r]) => r.length === verdictPaths.length);
  console.log(`\nOverall: ${accs.every((a) => a < 60) && !all.length ? 'PASS' : 'FAIL'} (pass needs every judge under 60% and no paragraph caught by all ${verdictPaths.length})`);
  const rows = Object.entries(flagged).sort((a, b) => b[1].length - a[1].length);
  if (!rows.length) { console.log('No script paragraph was caught by any judge.'); return; }
  console.log('\nScript paragraphs caught (most often first):');
  for (const [i, reasons] of rows) {
    const k = key.find((x) => x.id === +i);
    console.log(`\n#${i} caught by ${reasons.length}: ${k.text.slice(0, 180)}...`);
    for (const r of reasons) console.log('   - ' + r);
  }
}
