#!/usr/bin/env node
/* A numbered, timed, sentence-by-sentence view of a raw transcript, for Claude's editorial content pass.
 *
 *   node pipeline/edit/transcript-view.mjs --words videos/<slug>/raw/transcript.words.json [--out videos/<slug>/work/transcript-view.md]
 *
 * Sentences split at . ? ! (transcribe with --edit for punctuation) or at a pause >= 0.7 s. Each line:
 *   S012  1:23.4-1:31.0  (w210-236)  +0.8s  text
 * where +0.8s is the pause before the sentence. Claude reads it and writes work/content-cuts.json:
 *   { "cuts": [ { "from": "S012", "to": "S014", "why": "production chatter: countdown before the next clip" },
 *               { "words": [412, 419], "why": "abandoned start, said again better in S031" } ] }
 * build-timeline.mjs turns those into cuts with the same edge rules as the filler/retake cuts (edges in the quietest
 * audio between words), so the pause rules and the render check apply to them too.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function sentences(words, { pauseBreak = 0.7 } = {}) {
  const out = []; let cur = null;
  words.forEach((w, i) => {
    const gap = i > 0 ? w.t - words[i - 1].end : 0;
    if (!cur || (gap >= pauseBreak && cur.w1 >= cur.w0)) { if (cur) out.push(cur); cur = { w0: i, w1: i, t: w.t, end: w.end, pause: +Math.max(0, gap).toFixed(2), text: [] }; }
    cur.w1 = i; cur.end = w.end; cur.text.push(w.w);
    if (/[.!?]["')\]]*$/.test(w.w)) { out.push(cur); cur = null; }
  });
  if (cur) out.push(cur);
  return out.map((s, k) => ({ id: `S${String(k + 1).padStart(3, '0')}`, ...s, text: s.text.join(' ') }));
}

const mmss = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.words) { console.error('usage: --words <words.json> [--out <md>]'); process.exit(2); }
  const wp = path.resolve(ROOT, args.words);
  const words = JSON.parse(fs.readFileSync(wp, 'utf8'));
  const S = sentences(words);
  const out = path.resolve(ROOT, args.out || path.join(path.dirname(path.dirname(wp)), 'work', 'transcript-view.md'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const L = [`# Transcript view: ${path.relative(ROOT, wp).split(path.sep).join('/')}`, '', `${S.length} sentences, ${words.length} words, ${mmss(words.at(-1).end)}. Format: id, raw time, word range, pause before, text.`, ''];
  for (const s of S) L.push(`${s.id}  ${mmss(s.t)}-${mmss(s.end)}  (w${s.w0}-${s.w1})  +${s.pause}s  ${s.text}`);
  fs.writeFileSync(out, L.join('\n') + '\n');
  console.log(JSON.stringify({ out: path.relative(ROOT, out).split(path.sep).join('/'), sentences: S.length }));
}
