#!/usr/bin/env node
// Short-form (TikTok / Reels / Shorts) cut lists from a finished long-form cut. A plan names each clip's pieces by
// the host's own words ("from" phrase to "to" phrase, "near" = rough final-cut second), in the order they play; the
// pieces may come from anywhere in the cut (a cold open lifted from later, a fix from the end). This resolves every
// piece to exact words on the final cut's audio, so every length is counted, not guessed.
//   node pipeline/edit/shorts-plan.mjs --slug bad-breath-for-good [--plan tiktok/plan.json]
// Plan: { "clips": [ { "id", "title", "textHook": [l1, l2], "captionHook", "lastLine", "segments": [
//   { "from": "phrase", "to": "phrase", "near": 352 } | { "t": [0, 6.56], "foreign": "whose clip" } ] } ] }
// Writes <plan dir>/plan.resolved.json (word indices and final-cut times per piece) and scripts.md (the words
// each clip says, piece by piece, with the word before and after every cut so a trimmed lead-in is visible).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
if (!args.slug) { console.error('usage: --slug <slug> [--plan tiktok/plan.json]'); process.exit(2); }
const VD = path.join(ROOT, 'videos', args.slug);
const planFile = path.resolve(VD, args.plan || 'tiktok/plan.json');
const plan = fs.existsSync(planFile) ? JSON.parse(fs.readFileSync(planFile, 'utf8')) : (args.transcript ? null : (console.error(`no plan: ${planFile} (run with --transcript first)`), process.exit(2)));
// the words are the final cut's own transcription (work/cut-transcript.words.json, what is actually in the audio),
// starts moved earlier by edit/timing.json wordLead like the captions. Not edit/cut-words.json: that map carries the
// raw transcript's words, including zero-length ones at old cuts ("head.", a removed "I can, I can, I can,").
const tm = fs.existsSync(path.join(VD, 'edit', 'timing.json')) ? JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'timing.json'), 'utf8')) : {};
const lead = +(tm.wordLead ?? 0);
const heardFile = path.join(VD, 'work', 'cut-transcript.words.json'), wav = path.join(VD, 'work', 'cut-audio16k.wav');
if (fs.existsSync(wav) && fs.statSync(heardFile).mtimeMs < fs.statSync(wav).mtimeMs) { console.error('work/cut-transcript.words.json is older than work/cut-audio16k.wav: transcribe the cut again first'); process.exit(2); }
const words = JSON.parse(fs.readFileSync(heardFile, 'utf8')).filter((w) => String(w.w).trim() && !/^\[.*\]$/.test(w.w)).map((w) => ({ ...w, t: Math.max(0, w.t - lead), end: Math.max(0, w.end - lead) }));
const cw = { total: words.at(-1).end };
// --transcript: the finished cut as timestamped sentences (<plan dir>/transcript.txt), the reading copy for finding
// sections that stand alone, before any plan exists; chapter titles from the long cut's chapter cards when present
if (args.transcript) {
  const fmtT = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  const placed = fs.existsSync(path.join(VD, 'edit', 'placed.json')) ? JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'placed.json'), 'utf8')) : null;
  const chapters = (placed?.overlays || []).filter((o) => /^chapter-/.test(o.id || o.name || '')).map((o) => ({ at: o.at, name: o.id || o.name }));
  let out = '', cur = [];
  for (const [i, w] of words.entries()) {
    if (!cur.length) { for (const c of chapters.filter((c) => c.at <= w.t && c.at > (words[i - 1]?.t ?? -1))) out += `\n== ${c.name} (${fmtT(c.at)}) ==\n`; }
    cur.push(w);
    if (/[.?!]["']?$/.test(w.w) || i === words.length - 1) { out += `[${fmtT(cur[0].t)}] ${cur.map((x) => String(x.w).trim()).join(' ')}\n`; cur = []; }
  }
  const tf = path.join(path.dirname(planFile), 'transcript.txt'); fs.mkdirSync(path.dirname(tf), { recursive: true }); fs.writeFileSync(tf, out);
  console.log(`${path.relative(ROOT, tf).split(path.sep).join('/')}: ${out.split('\n').filter((l) => l.startsWith('[')).length} sentences, ${fmtT(cw.total)}`);
  if (!fs.existsSync(planFile)) process.exit(0);
}
const norm = (s) => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const toks = words.map((w) => norm(w.w));
const phrase = (p) => norm(p).split(' ').filter(Boolean);
// every place a phrase occurs (a word may carry two tokens after normalising, e.g. "P.gingivalis")
const flat = []; toks.forEach((t, i) => t.split(' ').filter(Boolean).forEach((x) => flat.push({ x, i })));
function find(p) {
  const q = phrase(p), hits = [];
  for (let k = 0; k + q.length <= flat.length; k++) if (q.every((x, j) => flat[k + j].x === x)) hits.push({ a: flat[k].i, b: flat[k + q.length - 1].i });
  return hits;
}
const NUM = /^(\d[\d,.]*%?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|million|half|percent|dozen)$/;
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const text = (a, b) => words.slice(a, b + 1).map((w) => String(w.w).trim()).join(' ');

const out = { source: 'work/cut-transcript.words.json', wordLead: lead, total: cw.total, clips: [] };
let md = `# Short-form cut lists (${path.relative(ROOT, planFile).split(path.sep).join('/')})\n\nWords are the final cut's own transcription (what the audio says); lengths are counted from word times (first word start to last word end per piece, plus the foreign clip). [before] and [after] are the words the cut leaves out on each side.\n`;
let failed = 0;
for (const c of plan.clips) {
  const segs = [];
  for (const [k, s] of c.segments.entries()) {
    if (s.t) { segs.push({ n: k + 1, foreign: s.foreign || true, t0: s.t[0], t1: s.t[1], dur: +(s.t[1] - s.t[0]).toFixed(2) }); continue; }
    const near = +(s.near ?? 0);
    const fh = find(s.from).filter((h) => Math.abs(words[h.a].t - near) < 40).sort((x, y) => Math.abs(words[x.a].t - near) - Math.abs(words[y.a].t - near));
    if (!fh.length) { console.error(`[${c.id}] piece ${k + 1}: "${s.from}" not found near ${fmt(near)}`); failed++; continue; }
    const a = fh[0].a;
    const th = find(s.to).filter((h) => h.a >= a).sort((x, y) => x.a - y.a);
    if (!th.length) { console.error(`[${c.id}] piece ${k + 1}: "${s.to}" not found after "${s.from}"`); failed++; continue; }
    const b = th[0].b;
    const t0 = words[a].t, t1 = words[b].end;
    const nums = words.slice(a, b + 1).map((w) => norm(w.w)).flatMap((x) => x.split(' ')).filter((x) => NUM.test(x));
    segs.push({ n: k + 1, wa: a, wb: b, t0, t1, trimIn: s.trimIn, trimOut: s.trimOut, accept: s.accept, remove: s.remove, dur: +(t1 - t0).toFixed(2), before: a > 0 ? String(words[a - 1].w).trim() : '', after: b + 1 < words.length ? String(words[b + 1].w).trim() : '', text: text(a, b), nums, note: s.note });
  }
  const dur = +segs.reduce((x, s) => x + s.dur, 0).toFixed(1);
  const own = segs.filter((s) => !s.foreign);
  const nums = own.flatMap((s) => s.nums);
  out.clips.push({ id: c.id, title: c.title, textHook: c.textHook, captionHook: c.captionHook, duration: dur, pieces: segs.length, numbersSpoken: nums, segments: segs });
  md += `\n## ${c.id}: ${c.title}\n\n**${fmt(dur)}** (${dur} s), ${segs.length} pieces. Text hook: "${(c.textHook || []).join(' / ')}". Caption: "${c.captionHook || ''}". Numbers said: ${nums.length ? nums.join(', ') : 'none'}.\n\n`;
  for (const s of segs) {
    if (s.foreign) { md += `${s.n}. **${fmt(s.t0)}-${fmt(s.t1)}** (${s.dur} s) FOREIGN: ${s.foreign}\n`; continue; }
    md += `${s.n}. **${fmt(s.t0)}-${fmt(s.t1)}** (${s.dur} s)${s.note ? ` _${s.note}_` : ''}\n   [${s.before}] ${s.text} [${s.after}]\n`;
  }
}
const dir = path.dirname(planFile);
fs.writeFileSync(path.join(dir, 'plan.resolved.json'), JSON.stringify(out, null, 2));
fs.writeFileSync(path.join(dir, 'scripts.md'), md);
for (const c of out.clips) console.log(`${c.id.padEnd(16)} ${fmt(c.duration)}  ${c.pieces} pieces  numbers: ${c.numbersSpoken.join(', ') || '-'}`);
if (failed) { console.error(`${failed} piece(s) not resolved`); process.exit(1); }
