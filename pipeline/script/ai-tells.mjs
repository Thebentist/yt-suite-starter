#!/usr/bin/env node
/* Count the writing habits that make a script read as machine-written.
 *   node pipeline/edit/ai-tells.mjs videos/<slug>/script.md
 * Reads only the spoken lines under "## Script" (skips [cues], headings, quoted clip lines).
 * Thresholds come from docs/huge-if-true-writing.md section 9. Exit code 1 if any hard threshold is crossed.
 */
import fs from 'node:fs';

const file = process.argv[2];
const allowFragments = process.argv.includes('--allow-fragments'); // for style prompts that ask for fragments
if (!file) { console.error('usage: ai-tells.mjs <script.md>'); process.exit(2); }
let t = fs.readFileSync(file, 'utf8');
if (t.includes('## Script')) t = t.split('## Script')[1].split(/\n## (Description|Facts|Scorecard)/)[0];
const paras = t.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !/^\[/.test(p) && !/^#/.test(p) && !/^---/.test(p) && !/^"/.test(p));
const text = paras.join(' ');
const words = text.split(/\s+/).filter(Boolean).length;
const per1k = (n) => (1000 * n / words).toFixed(1);

const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
const negationReframe = (text.match(/\b(It's|That's|This is|It is|That is|Not|not)\s+(not\s+)?(a |the |about |because )?[^.!?]{2,60}[.!?]\s+(It's|That's|It is|That is|Because|Just because)\s/g) || []).length;
const fragments = sentences.filter((s) => s.split(/\s+/).length <= 2 && !/\?$/.test(s)).length;
const fragmentClosers = paras.filter((p) => { const last = p.split(/(?<=[.!?])\s+/).pop() || ''; return last.split(/\s+/).length <= 3; }).length;
const pointers = (text.match(/\b(read that again|let that sink in|here's the thing|here is the thing|the part nobody tells you|and this is the part)\b/gi) || []).length;
const sincerity = (text.match(/\b(genuinely|actually|honestly|literally)\b/gi) || []).length;
const doubleSincerity = sentences.filter((s) => (s.match(/\b(genuinely|actually|honestly|literally)\b/gi) || []).length >= 2).length;
const parallelStacks = paras.filter((p) => {
  const ss = p.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (ss.length < 3) return false;
  for (let i = 0; i + 2 < ss.length; i++) {
    const heads = ss.slice(i, i + 3).map((s) => s.split(/\s+/).slice(0, 2).join(' ').toLowerCase());
    const lens = ss.slice(i, i + 3).map((s) => s.split(/\s+/).length);
    if (new Set(heads).size === 1 && lens.every((l) => l <= 8)) return true;
  }
  return false;
}).length;
const hedges = (text.match(/\b(I think|I could be|I'm gonna get this|I might be|kind of|sort of|maybe|I don't know|I had to look|I'm reading this off|probably)\b/gi) || []).length;
const avgSent = (words / sentences.length).toFixed(1);
const lens = paras.map((p) => p.split(/\s+/).length);
const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);

const rows = [
  ['spoken words', words, ''],
  ['avg sentence length', avgSent, 'Ben real: 12 to 16'],
  ['paragraph length mean / sd', `${mean.toFixed(0)} / ${sd.toFixed(0)}`, 'sd under 15 reads as machine rhythm'],
  ['negation reframes ("not X. Y.")', `${negationReframe} (${per1k(negationReframe)}/1k)`, 'hard limit 2 per 1k'],
  ['fragment sentences (<=2 words)', `${fragments} (${per1k(fragments)}/1k)`, 'aim under 3 per 1k'],
  ['paragraphs ending on <=3 words', `${fragmentClosers} of ${paras.length}`, 'hard limit 1 in 5'],
  ['self-aware pointers', pointers, 'hard limit 0'],
  ['sincerity markers', `${sincerity} (${per1k(sincerity)}/1k)`, 'Ben real: about 8/1k'],
  ['two sincerity markers in one sentence', doubleSincerity, 'aim 0'],
  ['parallel 3-stacks', parallelStacks, 'hard limit 0'],
  ['hedges / self-corrections', `${hedges} (${per1k(hedges)}/1k)`, 'aim 6+/1k; Ben real is higher'],
];
for (const [k, v, note] of rows) console.log(`${k.padEnd(40)} ${String(v).padEnd(16)} ${note}`);

let fail = false;
if (1000 * negationReframe / words > 2) fail = true;
if (!allowFragments && fragmentClosers / paras.length > 0.2) fail = true;
if (pointers > 0) fail = true;
if (parallelStacks > 0) fail = true;
console.log(fail ? '\nFAIL: rewrite (see docs/huge-if-true-writing.md section 9)' : '\nPASS on hard thresholds; now read it aloud.');
process.exit(fail ? 1 : 0);
