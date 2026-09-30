#!/usr/bin/env node
/* Score an editorial content pass (content-cuts.json) against what the human editor actually removed (edit-match.json).
 *
 *   node pipeline/style/score-content.mjs --words <raw words.json> --cuts <content-cuts.json> --match <edit-match.json>
 *
 * Works in raw seconds. "Theirs" = raw ranges between the editor's kept segments that contain words (dead air and
 * alignment noise are left out: the automatic passes handle those). Reports:
 *   precision  of the seconds we cut, the share the editor also removed
 *   recall     of the seconds the editor removed (words, not dead air), the share we also cut
 *   per cut    each of our cuts: removed by the editor too, kept by the editor, or partly
 *   misses     the editor's biggest removals we did not make, with their words
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';
import { sentences } from '../edit/transcript-view.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const words = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.words), 'utf8'));
const cuts = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.cuts), 'utf8')).cuts;
const match = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.match), 'utf8'));
const S = sentences(words); const byId = new Map(S.map((s) => [s.id, s]));
const ours = cuts.map((c) => {
  const a = c.words ? c.words[0] : byId.get(c.from).w0, b = c.words ? c.words[1] : byId.get(c.to || c.from).w1;
  return { from: words[a].t, to: words[b].end, why: c.why, label: c.from ? `${c.from}${c.to ? '-' + c.to : ''}` : `w${a}-${b}` };
});
const theirs = match.removedList.filter((r) => !/dead air|alignment noise|silence/.test(r.kind)).map((r) => ({ from: r.rawFrom, to: r.rawTo, kind: r.kind, words: r.words }));
const overlap = (x, list) => list.reduce((s, y) => s + Math.max(0, Math.min(x.to, y.to) - Math.max(x.from, y.from)), 0);
const oursSec = ours.reduce((s, x) => s + x.to - x.from, 0), theirsSec = theirs.reduce((s, x) => s + x.to - x.from, 0);
const both = ours.reduce((s, x) => s + overlap(x, theirs), 0);
const rows = ours.map((x) => { const o = overlap(x, theirs), len = x.to - x.from; return { ...x, seconds: +len.toFixed(1), alsoRemovedByEditor: +(o / Math.max(len, 1e-6)).toFixed(2) }; });
const misses = theirs.map((y) => ({ ...y, seconds: +(y.to - y.from).toFixed(1), covered: +(overlap(y, ours) / Math.max(y.to - y.from, 1e-6)).toFixed(2) })).filter((y) => y.covered < 0.5).sort((a, b) => b.seconds - a.seconds);
const report = { oursSeconds: +oursSec.toFixed(1), editorSeconds: +theirsSec.toFixed(1), bothSeconds: +both.toFixed(1), precision: +(both / Math.max(oursSec, 1e-6)).toFixed(3), recall: +(both / Math.max(theirsSec, 1e-6)).toFixed(3), perCut: rows, misses: misses.slice(0, 25) };
const out = path.join(path.dirname(path.resolve(ROOT, args.cuts)), 'content-score.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2));
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
console.log(`[score] we cut ${report.oursSeconds} s of words, the editor ${report.editorSeconds} s; both ${report.bothSeconds} s -> precision ${report.precision}, recall ${report.recall}`);
for (const r of rows) console.log(`  ${r.alsoRemovedByEditor >= 0.8 ? 'AGREE ' : r.alsoRemovedByEditor <= 0.2 ? 'EDITOR KEPT' : 'PARTLY'}  ${r.label.padEnd(10)} ${mmss(r.from)} ${String(r.seconds).padStart(5)}s  ${r.why.slice(0, 90)}`);
console.log(`[score] the editor's biggest removals we did not make:`);
for (const m of misses.slice(0, 15)) console.log(`  ${mmss(m.from)} ${String(m.seconds).padStart(5)}s  ${m.kind}: ${m.words.slice(0, 150)}`);
console.log(`[score] wrote ${path.relative(ROOT, out)}`);
