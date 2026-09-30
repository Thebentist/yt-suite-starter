#!/usr/bin/env node
/* Turn a paper edit (list of KEPT word ranges) into work/content-cuts.json (the removed ranges) for build-timeline.
 *   node pipeline/edit/keep-to-cuts.mjs --paper videos/x/edit/paper-edit.json --words videos/x/raw/transcript.words.json [--out videos/x/work/content-cuts.json]
 * paper-edit.json: { keep: [ { w: [a, b], beat, note } | { special, raw: [s, e] } ] } (inclusive word indices, raw order).
 * 'special' entries are left to the assembler. Prints kept words and the spoken seconds they span.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../resolve/media.mjs';
const args = parseArgs(process.argv.slice(2));
const paper = JSON.parse(fs.readFileSync(args.paper, 'utf8'));
const words = JSON.parse(fs.readFileSync(args.words, 'utf8'));
const out = args.out || path.join(path.dirname(path.dirname(args.paper)), 'work', 'content-cuts.json');
const keep = paper.keep.filter((k) => k.w).map((k) => ({ a: k.w[0], b: k.w[1], beat: k.beat, note: k.note }));
for (let i = 1; i < keep.length; i++) if (keep[i].a <= keep[i - 1].b) throw new Error(`keep ranges overlap or are out of order at ${keep[i].a}`);
const cuts = []; let next = 0;
for (const k of keep) { if (k.a > next) cuts.push({ words: [next, k.a - 1], why: `not in the paper edit (before: ${k.beat}: ${k.note.slice(0, 60)})` }); next = k.b + 1; }
if (next < words.length) cuts.push({ words: [next, words.length - 1], why: 'not in the paper edit (after the sign-off)' });
fs.writeFileSync(out, JSON.stringify({ source: path.relative(process.cwd(), args.paper), cuts }, null, 1));
const keptWords = keep.reduce((s, k) => s + k.b - k.a + 1, 0);
const spoken = keep.reduce((s, k) => s + (words[k.b].end - words[k.a].t), 0);
console.log(JSON.stringify({ out, keepRanges: keep.length, cuts: cuts.length, keptWords, totalWords: words.length, spokenSec: +spoken.toFixed(1) }));
