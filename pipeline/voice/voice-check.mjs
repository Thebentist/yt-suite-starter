#!/usr/bin/env node
/* Score a script against a creator's measured voice (voice/<id>/fingerprint.json from fingerprint.mjs).
 *   node pipeline/voice/voice-check.mjs <script.md> [--channel thebentist] [--json]
 * Only spoken lines count: markdown headings, [VISUAL]/[CUE] notes, tables, bullet metadata and HTML comments are dropped.
 * Reports each rhythm measure against the creator's range, the signature phrases used (and how often), words the creator
 * has never said on camera, and a 0-100 closeness score. Advisory: the creator's ear is the final judge.
 */
import { hostId } from '../host.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, readJson } from '../swipe/lib.mjs';
import { measure, words, MARKERS, cadenceDistance, BUCKETS } from './measure.mjs';

const args = parseArgs();
const file = args._[0];
const id = args.channel || hostId();
if (!file) { console.error('usage: voice-check.mjs <script.md> [--channel id] [--json]'); process.exit(1); }
const fp = readJson(path.join(ROOT, 'voice', id, 'fingerprint.json'), null);
if (!fp) { console.error(`voice/${id}/fingerprint.json missing: run the voice-learn skill first`); process.exit(1); }
const vocab = new Set(readJson(path.join(ROOT, 'voice', id, 'vocab.json'), []));

// Spoken text only: the "## Script" section when there is one (the pipeline's script format), else the whole file.
let raw = fs.readFileSync(path.resolve(file), 'utf8');
const scriptSection = raw.match(/^##\s+Script\b[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m);
if (scriptSection && scriptSection[1].trim().length > 500) raw = scriptSection[1];
const spoken = raw
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .split(/\r?\n/)
  .filter((l) => !/^\s*(#|\||>|---|\*\*[A-Z][^*]*:\*\*|- \*\*|```)/.test(l))
  .filter((l) => !/^\s*[-*]\s+\w+:/.test(l))
  .map((l) => l.replace(/\[[^\]]*\]/g, ' ').replace(/\*\*|__|\*|_/g, ''))
  .join('\n');
const m = measure(spoken);
if (m.words < 50) { console.error(`only ${m.words} spoken words found in ${file}`); process.exit(1); }

// Baseline: the rhythm of the creator's own videos of the same type (react, explainer, qa, ranked, personal, short, segment),
// measured from host passages only (voice/<id>/passages.json). --type, or a "type: <t>" line in the script, picks it.
const bank = readJson(path.join(ROOT, 'voice', id, 'passages.json'), null);
const typeArg = args.type && args.type !== true ? String(args.type) : fs.readFileSync(path.resolve(file), 'utf8').match(/^\s*(?:\*\*)?type(?:\*\*)?:\s*(\w+)/im)?.[1]?.toLowerCase();
let base, baseLabel;
if (bank?.profiles?.[typeArg]) { base = bank.profiles[typeArg]; baseLabel = `${typeArg} videos (${base.passages} host passages)`; }
else if (bank?.profiles?.all) { base = bank.profiles.all; baseLabel = `all video types (${base.passages} host passages)${typeArg ? `; no "${typeArg}" profile yet` : ''}`; }
else { base = fp.by_format?.long || fp.all; baseLabel = 'long-form transcripts (no passage bank yet: run passages.mjs build)'; }
const checks = [];
const band = (name, got, want, tol, unit = '') => {
  tol = Math.round(tol * 10) / 10;
  const ok = Math.abs(got - want) <= tol;
  checks.push({ measure: name, script: got, creator: want, tolerance: `±${tol}${unit}`, verdict: ok ? 'ok' : got > want ? 'too high' : 'too low', weight: 1 });
  return ok;
};
band('words per sentence (mean)', m.sentence_len.mean, base.sentence_len.mean, Math.max(2, base.sentence_len.mean * 0.2));
band('fragments ≤4 words (%)', m.fragment_share, base.fragment_share, Math.max(4, base.fragment_share * 0.5), '%');
band('long sentences 25+ (%)', m.long_share, base.long_share, Math.max(4, base.long_share * 0.6), '%');
band('questions (%)', m.question_share, base.question_share, Math.max(3, base.question_share * 0.6), '%');
band('you/your per 1k', m.you_per_1k, base.you_per_1k, Math.max(8, base.you_per_1k * 0.35));
band('I/me/my per 1k', m.i_per_1k, base.i_per_1k, Math.max(8, base.i_per_1k * 0.4));
band('contractions (%)', m.contraction_ratio, base.contraction_ratio, 12, '%');
band('exclamations (%)', m.exclaim_share, base.exclaim_share, 3, '%');
// Cadence: how sentence lengths follow each other (see measure.mjs). The distance folds the bucket mix and the transitions.
let cadDist = null;
if (base.cadence && m.cadence) {
  cadDist = cadenceDistance(m.cadence, base.cadence);
  checks.push({ measure: 'cadence distance (0 = same)', script: cadDist, creator: 0, tolerance: '≤0.12', verdict: cadDist <= 0.12 ? 'ok' : 'off', weight: 2 });
  band('long→short drops (share)', m.cadence.drop, base.cadence.drop, Math.max(0.06, base.cadence.drop * 0.4));
  band('length spread (cv)', m.cadence.cv, base.cadence.cv, Math.max(0.1, base.cadence.cv * 0.2));
}

// Markers the creator leans on (top by rate) and whether the script uses them at a similar rate.
const markerRows = MARKERS.filter((k) => (base.markers[k] || 0) >= 1).sort((a, b) => base.markers[b] - base.markers[a]).slice(0, 14)
  .map((k) => ({ marker: k, script: m.markers[k] || 0, creator: base.markers[k], note: (m.markers[k] || 0) === 0 ? 'unused' : m.markers[k] > base.markers[k] * 2.5 ? 'overused' : '' }));

// Signature phrases present.
const joined = ` ${words(spoken).join(' ')} `;
const sig = (fp.signature_phrases || []).slice(0, 60).map((p) => ({ ...p, uses: (joined.match(new RegExp(` ${p.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `, 'g')) || []).length })).filter((p) => p.uses);
const overusedSig = sig.filter((p) => p.uses >= 4);

// Words the creator has never used on camera (excluding numbers and proper nouns in the script).
const properNouns = new Set((spoken.match(/(?<![.?!]\s)(?<!^)\b[A-Z][a-z]+/gm) || []).map((w) => w.toLowerCase()));
// Whisper spells casual forms out ("kind of", "going to"), so a script's "kinda" is his word if "kind" is.
const SPOKEN_FORMS = { kinda: 'kind', gonna: 'going', wanna: 'want', gotta: 'got', lemme: 'let', dunno: 'know', "y'all": 'you' };
const offVocab = {};
for (const w of words(spoken)) {
  if (vocab.has(w) || (SPOKEN_FORMS[w] && vocab.has(SPOKEN_FORMS[w])) || /\d/.test(w) || properNouns.has(w) || w.length <= 3) continue;
  const stem = w.replace(/('s|s|es|ed|ing|ly)$/, '');
  if (vocab.has(stem) || vocab.has(stem + 'e')) continue;
  offVocab[w] = (offVocab[w] || 0) + 1;
}
const offList = Object.entries(offVocab).sort((a, b) => b[1] - a[1]);

// Paragraphs whose rhythm doesn't sound like speech: a stack of fragments, or a monotone run with no long sentence.
const flagged = [];
spoken.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => words(p).length >= 40).forEach((p, i) => {
  const lens = p.split(/(?<=[.?!])\s+/).map((s) => words(s).length).filter(Boolean);
  let run = 0, maxRun = 0; for (const l of lens) { run = l <= 6 ? run + 1 : 0; maxRun = Math.max(maxRun, run); }
  const why = [];
  if (maxRun >= 3) why.push(`${maxRun} short sentences in a row`);
  if (lens.length >= 5 && Math.max(...lens) < 15) why.push('no sentence over 14 words (monotone)');
  if (lens.length >= 4 && Math.min(...lens) > 12) why.push('no short sentence at all');
  if (why.length) flagged.push({ paragraph: i + 1, starts: p.slice(0, 70), why: why.join('; ') });
});

const wsum = checks.reduce((a, c) => a + (c.weight || 1), 0);
const passed = checks.filter((c) => c.verdict === 'ok').reduce((a, c) => a + (c.weight || 1), 0);
const markerHit = markerRows.filter((r) => !r.note).length / (markerRows.length || 1);
const offRate = offList.reduce((a, [, c]) => a + c, 0) / m.words;
const score = Math.round(100 * (0.5 * (passed / wsum) + 0.3 * markerHit + 0.2 * Math.max(0, 1 - offRate * 12)));

if (args.json) { console.log(JSON.stringify({ score, baseline: baseLabel, words: m.words, checks, cadence: { script: m.cadence, creator: base.cadence, distance: cadDist }, flagged_paragraphs: flagged, markers: markerRows, signature_used: sig, off_vocab: offList.slice(0, 40) }, null, 2)); process.exit(0); }
console.log(`Voice check: ${path.basename(file)} vs ${id}, compared with ${baseLabel}\nSpoken words: ${m.words}, sentences: ${m.sentences}\nCloseness score: ${score}/100 (advisory)\n`);
if (base.cadence) console.log(`Cadence (share of sentences S 1-6 / M 7-14 / L 15-24 / X 25+ words): script ${BUCKETS.map((k) => Math.round(m.cadence.dist[k] * 100)).join('/')}  ${id} ${BUCKETS.map((k) => Math.round(base.cadence.dist[k] * 100)).join('/')}\n`);
console.log('Rhythm');
for (const c of checks) console.log(`  ${c.verdict === 'ok' ? '✓' : '✗'} ${c.measure.padEnd(28)} script ${String(c.script).padStart(6)}  ${id} ${String(c.creator).padStart(6)} (${c.tolerance})${c.verdict === 'ok' ? '' : '  ' + c.verdict}`);
console.log('\nHis markers (per 1k words)');
for (const r of markerRows) console.log(`  ${r.marker.padEnd(22)} script ${String(r.script).padStart(5)}  ${id} ${String(r.creator).padStart(5)}  ${r.note}`);
console.log(`\nSignature phrases used: ${sig.length ? sig.map((p) => `"${p.phrase}" x${p.uses}`).join(', ') : 'none'}`);
if (overusedSig.length) console.log(`  heavy: ${overusedSig.map((p) => `"${p.phrase}" x${p.uses}`).join(', ')} (a catchphrase used this often reads as impression)`);
console.log(`\nWords ${id} has never said on camera (${offList.length}): ${offList.slice(0, 40).map(([w, c]) => (c > 1 ? `${w} x${c}` : w)).join(', ')}`);
console.log('\nOff-vocabulary words are not errors (a topic needs its terms), but written-register words here are the usual tell.');
if (flagged.length) { console.log(`\nParagraphs to reread (${flagged.length}):`); for (const f of flagged) console.log(`  ¶${f.paragraph} "${f.starts}..." ${f.why}`); }
