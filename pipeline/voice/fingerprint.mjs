#!/usr/bin/env node
/* Measure how a creator actually talks, from their transcript corpus (voice/<id>/transcripts, built by corpus.mjs).
 *   node pipeline/voice/fingerprint.mjs --channel thebentist [--min-df 0.08]
 * Writes voice/<id>/fingerprint.json, voice/<id>/profile.md (measured, human-readable), voice/<id>/exemplars.md
 * (real passages dense in their signature phrases) and voice/<id>/vocab.json (every word they use twice or more).
 *
 * Reaction videos mix the creator's voice with the audio of the clips they react to. Signature phrases are ranked by
 * document frequency (the share of their videos a phrase appears in) against a reference corpus of other creators,
 * so clip audio, which is different in every video, drops out on its own.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, readJson, writeJson, nowIso } from '../swipe/lib.mjs';
import { measure, words, sentences, ngrams, MARKERS, r1 } from './measure.mjs';

const args = parseArgs();
const id = args.channel || args.id;
if (!id) { console.error('usage: --channel <id>'); process.exit(1); }
const dir = path.join(ROOT, 'voice', id);
const tDir = path.join(dir, 'transcripts');
const index = readJson(path.join(dir, 'index.json'), { videos: {} });
const minDf = Number(args['min-df'] ?? 0.08);

const docs = fs.existsSync(tDir) ? fs.readdirSync(tDir).filter((f) => f.endsWith('.txt')).map((f) => {
  const vid = f.replace(/\.txt$/, '');
  const text = fs.readFileSync(path.join(tDir, f), 'utf8');
  const wj = readJson(path.join(tDir, `${vid}.words.json`), null);
  const seconds = wj?.length ? wj[wj.length - 1].end : index.videos[vid]?.duration;
  return { vid, text, seconds, meta: index.videos[vid] || {}, ws: words(text) };
}).filter((d) => d.ws.length > 80) : []; // under 80 words: a music-only track or a studio slate, not speech
// Sentence statistics need punctuation; caption-derived transcripts sometimes have almost none. Those still count for
// phrases (document frequency) but are left out of rhythm, openings and closings.
for (const d of docs) d.punctuated = (d.text.match(/[.?!]/g) || []).length / d.ws.length >= 1 / 40;
// Duplicates: Shorts cut from a long video, and compilations of earlier videos, repeat the same speech. A transcript whose
// 5-grams are mostly (>= 50%) already in a kept transcript is set aside so phrases and rhythm aren't counted twice.
// Long-form first, longest first, so the original is the one kept.
{
  const kept = [];
  const order = [...docs].sort((a, b) => (a.meta.format === 'short') - (b.meta.format === 'short') || b.ws.length - a.ws.length);
  for (const d of order) {
    const grams = new Set(ngrams(d.ws, 5));
    let best = 0, of = null;
    for (const k of kept) { let hit = 0; for (const g of grams) if (k.grams.has(g)) hit++; const share = hit / (grams.size || 1); if (share > best) { best = share; of = k.vid; } }
    if (best >= 0.5) { d.duplicateOf = of; d.dupShare = Math.round(best * 100) / 100; } else kept.push({ vid: d.vid, grams });
  }
}
const duplicates = docs.filter((d) => d.duplicateOf).map((d) => ({ vid: d.vid, of: d.duplicateOf, share: d.dupShare }));
if (duplicates.length) console.log(`[fingerprint] ${duplicates.length} transcripts repeat another (Shorts cut from long videos, compilations); counted once: ${duplicates.map((x) => `${x.vid}<${x.of}`).join(', ')}`);
docs.splice(0, docs.length, ...docs.filter((d) => !d.duplicateOf));
if (docs.length < 5) { console.error(`[fingerprint] only ${docs.length} transcripts in ${tDir}; run corpus.mjs first (aim for 40+)`); process.exit(1); }

// Reference corpus: every other creator's transcripts we have on disk.
// Reference corpus: every other creator's transcripts on disk, one copy per video id (reference/ and voice/ can overlap).
const vidOf = (f) => f.split('.')[0].replace(/^(vs|ref)-/, '');
const ownIds = new Set(docs.map((d) => vidOf(d.vid)));
const benLegacy = new Set(['NGOf5DmEFvA', 'q8regjBdFxo', '3glVMZtfYOU']); // Ben's own videos saved before the corpus tool existed
if (id === 'thebentist') for (const b of benLegacy) ownIds.add(b);
const refById = new Map();
const vroot = path.join(ROOT, 'voice');
for (const other of fs.existsSync(vroot) ? fs.readdirSync(vroot) : []) {
  if (other === id) continue;
  const od = path.join(vroot, other, 'transcripts');
  if (fs.existsSync(od)) for (const f of fs.readdirSync(od)) if (f.endsWith('.txt') && !ownIds.has(vidOf(f))) refById.set(vidOf(f), fs.readFileSync(path.join(od, f), 'utf8'));
}
const rt = path.join(ROOT, 'reference', 'transcripts'); // Cleo Abram, Vsauce, Kallaway, Nye, Tyson, and Ben's three legacy transcripts
if (fs.existsSync(rt)) for (const f of fs.readdirSync(rt)) {
  if (!f.endsWith('.txt') || ownIds.has(vidOf(f)) || refById.has(vidOf(f))) continue;
  refById.set(vidOf(f), fs.readFileSync(path.join(rt, f), 'utf8'));
}
const refTexts = [...refById.values()];
const refDocs = refTexts.map((t) => new Set([2, 3, 4, 5].flatMap((n) => ngrams(words(t), n))));
console.log(`[fingerprint] ${id}: ${docs.length} transcripts, ${docs.reduce((a, d) => a + d.ws.length, 0)} words; reference corpus ${refDocs.length} docs`);

// Document frequency of 2..5-grams.
const df = new Map();
for (const d of docs) {
  const seen = new Set([2, 3, 4, 5].flatMap((n) => ngrams(d.ws, n)));
  for (const g of seen) df.set(g, (df.get(g) || 0) + 1);
}
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'in', 'is', 'it', 'that', 'this', 'for', 'on', 'with', 'as', 'at', 'be', 'are', 'was', 'or', 'if', 'but', 'so']);
const N = docs.length, R = refDocs.length || 1;
// "General" words appear in at least a quarter of the other creators' videos whatever their topic. A voice phrase is made of
// general words (at most one topical word, and only in phrases of 3+ words): "your teeth" is topic, "i was going to say" is voice.
const refWordDf = new Map();
for (const t of refTexts) for (const w of new Set(words(t))) refWordDf.set(w, (refWordDf.get(w) || 0) + 1);
const general = (w) => (refWordDf.get(w) || 0) / R >= 0.25;
const isVoice = (parts) => { const topical = parts.filter((w) => !general(w)).length; return topical === 0 || (topical === 1 && parts.length >= 3); };
let phrases = [];
for (const [g, c] of df) {
  const dfOwn = c / N;
  if (dfOwn < minDf || c < 3) continue;
  const parts = g.split(' ');
  if (parts.every((w) => STOP.has(w))) continue;
  if (refTexts.length >= 10 && !isVoice(parts)) continue;
  const dfRef = refDocs.filter((s) => s.has(g)).length / R;
  const lift = (dfOwn + 0.01) / (dfRef + 0.01);
  if (lift < 1.6) continue;
  phrases.push({ phrase: g, df: r1(dfOwn * 100), ref_df: r1(dfRef * 100), lift: r1(lift), score: dfOwn * Math.log(lift) * Math.sqrt(parts.length) });
}
phrases.sort((a, b) => b.score - a.score);
// Drop a phrase when a longer phrase containing it has nearly the same document frequency.
phrases = phrases.filter((p) => !phrases.some((q) => q !== p && q.phrase.length > p.phrase.length && ` ${q.phrase} `.includes(` ${p.phrase} `) && q.df >= p.df * 0.8)).slice(0, 80);

// Whole-corpus and per-format measurements.
const pDocs = docs.filter((d) => d.punctuated);
const unpunctuated = docs.filter((d) => !d.punctuated).map((d) => d.vid);
if (unpunctuated.length) console.log(`[fingerprint] ${unpunctuated.length} transcripts have almost no punctuation; left out of rhythm, openings and closings: ${unpunctuated.join(', ')}`);
const all = measure(pDocs.map((d) => d.text).join('\n'));
const longDocs = pDocs.filter((d) => d.meta.format !== 'short'), shortDocs = pDocs.filter((d) => d.meta.format === 'short');
const byFormat = { long: longDocs.length ? measure(longDocs.map((d) => d.text).join('\n')) : null, short: shortDocs.length ? measure(shortDocs.map((d) => d.text).join('\n')) : null };
const ref = refTexts.length ? measure(refTexts.join('\n')) : null;
const wpm = docs.filter((d) => d.seconds > 30).map((d) => d.ws.length / (d.seconds / 60)).sort((a, b) => a - b);

// Openings and closings (long-form): where hooks and sign-offs live.
const edge = (d, which, n) => { const s = sentences(d.text); return (which === 'open' ? s.slice(0, n) : s.slice(-n)).join(' '); };
const edgePhrases = (which) => {
  const m = new Map();
  for (const d of longDocs) for (const g of new Set([3, 4, 5, 6].flatMap((n) => ngrams(words(edge(d, which, which === 'open' ? 4 : 6)), n)))) m.set(g, (m.get(g) || 0) + 1);
  return [...m].filter(([, c]) => c >= Math.max(3, longDocs.length * 0.06)).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 25).map(([phrase, c]) => ({ phrase, videos: c }));
};

// Vocabulary: words used at least twice across the corpus.
const freq = new Map();
for (const d of docs) for (const w of d.ws) freq.set(w, (freq.get(w) || 0) + 1);
const vocab = [...freq].filter(([, c]) => c >= 2).map(([w]) => w).sort();

// Exemplars: passages dense in signature phrases (most likely the creator talking, not a clip).
const top = phrases.slice(0, 40).map((p) => p.phrase);
const passages = [];
for (const d of docs) {
  const s = sentences(d.text);
  for (let i = 0; i + 4 <= s.length; i += 2) {
    const chunk = s.slice(i, i + 4).join(' ');
    const j = ` ${words(chunk).join(' ')} `;
    const hits = top.filter((p) => j.includes(` ${p} `));
    if (hits.length >= 2 && words(chunk).length >= 35 && words(chunk).length <= 140) passages.push({ vid: d.vid, title: d.meta.title, format: d.meta.format, chunk, hits: hits.length });
  }
}
passages.sort((a, b) => b.hits - a.hits);
const exemplars = []; const perVid = {};
for (const p of passages) { if ((perVid[p.vid] = (perVid[p.vid] || 0) + 1) > 1) continue; exemplars.push(p); if (exemplars.length >= 30) break; }

const fp = {
  channel: id, built_at: nowIso(), transcripts: N, long: longDocs.length, shorts: shortDocs.length, unpunctuated, duplicates,
  words: all.words, wpm: { median: r1(wpm[Math.floor(wpm.length / 2)]), p25: r1(wpm[Math.floor(wpm.length * 0.25)]), p75: r1(wpm[Math.floor(wpm.length * 0.75)]) },
  all, by_format: byFormat, reference: ref ? { docs: refTexts.length, ...ref } : null,
  signature_phrases: phrases, openings: edgePhrases('open'), closings: edgePhrases('close'),
  note: 'Transcripts are whisper output of whole videos, so react videos include clip audio. Use df (share of videos) and lift (vs other creators) for phrases; rates are indicative.',
};
writeJson(path.join(dir, 'fingerprint.json'), fp);
writeJson(path.join(dir, 'vocab.json'), vocab);

// Human-readable profile.
const md = [];
md.push(`# Voice fingerprint: ${id}`, '', `Measured ${fp.built_at.slice(0, 10)} from ${N} transcripts (${longDocs.length} long-form, ${shortDocs.length} Shorts, ${all.words.toLocaleString()} words). Reference: ${refTexts.length} transcripts from other creators. Built by \`pipeline/voice/fingerprint.mjs\`; do not hand-edit, rerun it.`, '');
md.push('> Transcripts are whisper output of whole videos, so reaction videos include the audio of the clips. Phrase ranks use the share of videos a phrase appears in, compared with other creators, which filters clip audio out. Treat rates as indicative.', '');
md.push('## Rhythm', '', '| measure | this creator (all) | long-form | Shorts | other creators |', '|---|---|---|---|---|');
const row = (label, f) => md.push(`| ${label} | ${f(all) ?? ''} | ${byFormat.long ? f(byFormat.long) ?? '' : ''} | ${byFormat.short ? f(byFormat.short) ?? '' : ''} | ${ref ? f(ref) ?? '' : ''} |`);
row('words per sentence (mean)', (m) => m.sentence_len.mean);
row('words per sentence (median, p10 to p90)', (m) => `${m.sentence_len.median} (${m.sentence_len.p10} to ${m.sentence_len.p90})`);
row('fragments, 4 words or fewer (% of sentences)', (m) => m.fragment_share);
row('long sentences, 25+ words (%)', (m) => m.long_share);
row('questions (% of sentences)', (m) => m.question_share);
row('commas per sentence', (m) => m.comma_per_sentence);
row('"you/your" per 1k words', (m) => m.you_per_1k);
row('"I/me/my" per 1k words', (m) => m.i_per_1k);
row('"we/us/our" per 1k words', (m) => m.we_per_1k);
row('contractions (% contracted)', (m) => m.contraction_ratio);
md.push('', fp.wpm.median == null ? 'Speaking rate: not measured (these transcripts have no word timings).' : `Speaking rate: median ${fp.wpm.median} words per minute (middle half ${fp.wpm.p25} to ${fp.wpm.p75}; react videos run lower because of clip time).`, '');
if (unpunctuated.length) md.push(`Left out of rhythm, openings and closings (almost no punctuation in the transcript): ${unpunctuated.join(', ')}.`, '');
md.push('## Signature phrases (ranked by share of videos, lifted against other creators)', '', '| phrase | % of videos | % of other creators\' videos | lift |', '|---|---|---|---|');
for (const p of phrases.slice(0, 60)) md.push(`| ${p.phrase} | ${p.df} | ${p.ref_df} | ${p.lift}x |`);
md.push('', '## Markers per 1,000 words', '', '| marker | this creator | other creators |', '|---|---|---|');
for (const m of MARKERS) if ((all.markers[m] || 0) > 0.2 || (ref?.markers[m] || 0) > 0.2) md.push(`| ${m} | ${all.markers[m]} | ${ref?.markers[m] ?? ''} |`);
md.push('', '## How sentences start (% of sentences)', '', Object.entries(all.openers).slice(0, 20).map(([w, p]) => `${w} ${p}%`).join(' · '), '');
if (ref) md.push('Other creators: ' + Object.entries(ref.openers).slice(0, 12).map(([w, p]) => `${w} ${p}%`).join(' · '), '');
md.push('## Openings (first 4 sentences of long-form videos)', '', ...fp.openings.map((o) => `- "${o.phrase}" (${o.videos} videos)`), '');
md.push('## Closings (last 6 sentences of long-form videos)', '', ...fp.closings.map((o) => `- "${o.phrase}" (${o.videos} videos)`), '');
fs.writeFileSync(path.join(dir, 'profile.md'), md.join('\n') + '\n');

const ex = ['# Exemplar passages: ' + id, '', 'Real passages from the corpus with the densest use of signature phrases, so they are very likely the creator talking rather than a clip. One per video. Whisper transcripts: punctuation is the model\'s, not the creator\'s.', ''];
for (const p of exemplars) ex.push(`### ${p.title || p.vid} (${p.format}, ${p.vid})`, '', `> ${p.chunk}`, '');
fs.writeFileSync(path.join(dir, 'exemplars.md'), ex.join('\n'));

console.log(`[fingerprint] wrote voice/${id}/fingerprint.json, profile.md, exemplars.md (${exemplars.length}), vocab.json (${vocab.length} words)`);
console.log(`[fingerprint] top phrases: ${phrases.slice(0, 12).map((p) => `"${p.phrase}" ${p.df}%`).join(', ')}`);
