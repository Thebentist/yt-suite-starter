#!/usr/bin/env node
/* Listen to the cut by machine: compare what whisper HEARS in the cut's own audio (work/cut-transcript.words.json, from
 * `assemble.mjs --stage audio` + transcribe.mjs) with the words the paper edit keeps, and report
 *   leaks  heard words that are not in the paper edit (a retake or aside the cut edge let through), with raw times
 *   drops  kept words that are not heard (an edge clipped into speech), with the piece edge nearest to them
 * Transcription variants ("30%" vs "30 percent", "'cause") show up too; judge each one. Writes edit/listen-check.json.
 *
 *   node pipeline/edit/listen-check.mjs --slug bad-breath-for-good
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';
import { alignWords, normWord } from './words-merge.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const VD = path.join(ROOT, 'videos', args.slug);
const rd = (p) => JSON.parse(fs.readFileSync(path.join(VD, p), 'utf8'));
const W = rd('raw/transcript.words.json');
const keep = rd('edit/paper-edit.json').keep.filter((k) => k.w);
const heard = rd('work/cut-transcript.words.json');
const pieces = rd('edit/beats.json').pieces;
const exp = []; for (const k of keep) for (let i = k.w[0]; i <= k.w[1]; i++) exp.push({ i, w: W[i].w, beat: k.beat });
const pairs = alignWords(exp, heard);
const hm = new Map(pairs.map((p) => [p[1], p[0]])), em = new Map(pairs.map((p) => [p[0], p[1]]));
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;
const pieceAt = (t) => pieces.findIndex((p) => t >= p.at - 1e-6 && t < p.at + p.dur);
const toRaw = (t) => { const k = pieceAt(t); if (k < 0) return null; const p = pieces[k]; return { piece: k, raw: +(p.in + (t - p.at)).toFixed(3), kind: p.kind }; };
const SMALL = /^(um|uh|a|the|and|so|like|to|of|is|it|its|cause|because|that|in|you|well|yeah|oh)$/;

const leaks = [];
for (let j = 0; j < heard.length;) {
  if (hm.has(j)) { j++; continue; }
  let e = j; while (e < heard.length && !hm.has(e)) e++;
  const run = heard.slice(j, e), t0 = run[0].t, t1 = run[run.length - 1].end;
  const a = toRaw(t0), b = toRaw(Math.max(t0, t1 - 0.01));
  const content = run.filter((x) => !SMALL.test(normWord(x.w))).length;
  leaks.push({ at: fmt(t0), t0: +t0.toFixed(3), t1: +t1.toFixed(3), text: run.map((x) => x.w).join(' '), words: run.length, content,
    raw: a && b ? [a.raw, b.raw] : null, pieces: a && b ? [a.piece, b.piece] : null, inInsert: a?.kind === 'insert',
    before: heard.slice(Math.max(0, j - 5), j).map((x) => x.w).join(' '), after: heard.slice(e, e + 5).map((x) => x.w).join(' ') });
  j = e;
}
const drops = [];
for (let j = 0; j < exp.length;) {
  if (em.has(j)) { j++; continue; }
  let e = j; while (e < exp.length && !em.has(e)) e++;
  const run = exp.slice(j, e);
  const prevH = j > 0 && em.has(j - 1) ? heard[em.get(j - 1)] : null, nextH = e < exp.length && em.has(e) ? heard[em.get(e)] : null;
  const gapT = prevH ? prevH.end : nextH ? nextH.t : null;
  const k = gapT != null ? pieceAt(Math.max(0, gapT - 0.001)) : -1;
  drops.push({ words: run.map((x) => `${x.w}[${x.i}]`).join(' '), n: run.length, rawWordTime: +W[run[0].i].t.toFixed(2), beat: run[0].beat,
    nearCut: gapT != null ? fmt(gapT) : null, piece: k, pieceEdges: k >= 0 ? [pieces[k].in, +(pieces[k].in + pieces[k].dur).toFixed(3)] : null,
    heardInstead: prevH && nextH ? heard.slice(em.get(j - 1) + 1, em.get(e)).map((x) => x.w).join(' ') : '' });
  j = e;
}
fs.writeFileSync(path.join(VD, 'edit', 'listen-check.json'), JSON.stringify({ heard: heard.length, expected: exp.length, matched: pairs.length, leaks, drops }, null, 1));
console.log(`heard ${heard.length}, expected ${exp.length}, matched ${pairs.length}; ${leaks.length} unmatched heard runs (${leaks.filter((l) => l.content >= 2).length} with 2+ content words), ${drops.length} unmatched kept runs`);
if (!args.quiet) {
  console.log('\nLEAKS (heard, not in the paper edit):');
  for (const l of leaks) console.log(`  ${l.at}  ${JSON.stringify(l.text)}  raw ${l.raw ? l.raw.join('-') : '?'}${l.inInsert ? ' (insert)' : ''}  | ${l.before} >> ${l.after}`);
  console.log('\nDROPS (kept, not heard):');
  for (const d of drops) console.log(`  ${d.nearCut}  ${d.words}  heard instead: ${JSON.stringify(d.heardInstead)}  piece ${d.piece} [${d.pieceEdges}] raw word t ${d.rawWordTime}`);
}
