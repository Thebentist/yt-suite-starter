#!/usr/bin/env node
/* Word timings for a stretch of the cut, for timing a scene to speech.
 *   node pipeline/edit/scene-words.mjs --slug x --from 388 --to 464 [--at <scene start s>]
 * Prints each word with its time in the TIMELINE and relative to the scene start (default: the first word).
 * Word indices are raw/transcript.words.json indices (the ones in edit/paper-edit.json and edit/visual-plan.json).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const a = parseArgs(process.argv.slice(2));
const cw = JSON.parse(fs.readFileSync(path.join(ROOT, 'videos', a.slug, 'edit', 'cut-words.json'), 'utf8')).words;
const from = +a.from, to = +(a.to ?? a.from), sel = cw.filter((c) => c.i >= from && c.i <= to);
if (!sel.length) { console.error('no words in that range are in the cut'); process.exit(1); }
const t0 = a.at != null ? +a.at : sel[0].t;
console.log(`scene start ${t0.toFixed(2)} s (timeline); words ${from}-${to}; ${(sel[sel.length - 1].end - t0).toFixed(2)} s to the last word's end`);
console.log(sel.map((c) => `${c.w}[${c.i}] ${(c.t - t0).toFixed(2)}`).join('  '));
