#!/usr/bin/env node
/* Retention timeline plus the checks code can make on a script (docs/retention-playbook.md, docs/retention-checklist.md).
 *   node pipeline/script/retention-check.mjs <script.md> [--wpm 236] [--title "<title>"] [--channel thebentist]
 *                                           [--minutes 10-14] [--json]
 * Spoken text is read the way voice-check.mjs reads it: the "## Script" section when there is one; headings, tables,
 * quotes, metadata bullets, HTML comments and [VISUAL]/[CUE] notes are not spoken. "###" headings mark sections.
 * Time = spoken words before a point / wpm. Default wpm: channels/<channel>.json script_wpm (script words per finished
 * minute; learned from the bad-breath read, 2026-09-28: Ben's 2,543-word script ran 18:09 cut, i.e. 140, not his 230 talking
 * pace), else voice/<channel>/fingerprint.json wpm.median, else 230. A "- " bullet line in the script is a beat he talks
 * through (same read): it counts as at least BEAT_WORDS words, the median he says per glance.
 * No pauses, cutaways or clips are modelled, so treat every timestamp as +-10%.
 * Every check prints PASS or WARN. They are advisory: the checklist and the host's ear decide. Exit code is always 0.
 */
import { hostId } from '../host.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, readJson } from '../swipe/lib.mjs';
import { words, sentences } from '../voice/measure.mjs';

const args = parseArgs();
const file = args._[0];
if (!file) { console.error('usage: retention-check.mjs <script.md> [--wpm 236] [--title "<title>"] [--channel id] [--minutes 10-14] [--json]'); process.exit(1); }
const channel = args.channel && args.channel !== true ? String(args.channel) : hostId();
const fp = readJson(path.join(ROOT, 'voice', channel, 'fingerprint.json'), null);
const ch = readJson(path.join(ROOT, 'channels', `${channel}.json`), null);
const BEAT_WORDS = 35; // learned from the bad-breath read, 2026-09-28: median words he says between look-downs
let wpm = Number(args.wpm), wpmSource = '--wpm';
if (!Number.isFinite(wpm) || wpm <= 0) {
  if (Number(ch?.script_wpm) > 0) { wpm = Number(ch.script_wpm); wpmSource = `channels/${channel}.json script_wpm, script words per finished minute`; }
  else if (fp?.wpm?.median) { wpm = fp.wpm.median; wpmSource = `voice/${channel}/fingerprint.json wpm.median`; }
  else { wpm = 230; wpmSource = 'default (no fingerprint wpm)'; }
}
const [minLo, minHi] = String(args.minutes && args.minutes !== true ? args.minutes : '10-14').split('-').map(Number);

const full = fs.readFileSync(path.resolve(file), 'utf8');
const title = (args.title && args.title !== true ? String(args.title) : full.match(/^#\s+(.+)$/m)?.[1] || '').trim();

// ---- spoken text, sections, paragraphs, cues (same line filters as pipeline/voice/voice-check.mjs) ----
let body = full;
const scriptSection = full.match(/^##\s+Script\b[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m);
if (scriptSection && scriptSection[1].trim().length > 500) body = scriptSection[1];
body = body.replace(/<!--[\s\S]*?-->/g, ' ');
const NOT_SPOKEN = /^\s*(#|\||>|---|\*\*[A-Z][^*]*:\*\*|- \*\*|```)/;
const sections = []; const paras = []; const cues = [];
let wordPos = 0, cur = null;
const newSection = (name) => sections.push({ name, startWord: wordPos, paras: [] });
const closePara = () => { if (cur && cur.text.trim()) { paras.push(cur); sections[sections.length - 1].paras.push(cur); } cur = null; };
newSection('(before the first ### heading)');
for (const line of body.split(/\r?\n/)) {
  const h = line.match(/^\s*###\s+(.+?)\s*$/);
  if (h) { closePara(); newSection(h[1]); continue; }
  if (!line.trim()) { closePara(); continue; }
  if (NOT_SPOKEN.test(line) || /^\s*[-*]\s+\w+:/.test(line)) { closePara(); continue; }
  for (const c of line.matchAll(/\[([^\]]*)\]/g)) cues.push({ word: wordPos + (cur ? words(cur.text).length : 0), text: c[1].trim() });
  const beat = /^\s*[-*]\s+/.test(line); // a beat bullet (bad-breath read, 2026-09-28)
  let spoken = line.replace(/\[[^\]]*\]/g, ' ').replace(/^\s*[-*]\s+/, '').replace(/\*\*|__|\*|_/g, '').trim();
  if (!spoken) continue;
  if (beat && !/[.?!]["')]*$/.test(spoken)) spoken += '.';
  if (!cur) cur = { startWord: wordPos, text: '', extra: 0 };
  cur.text += (cur.text ? ' ' : '') + spoken;
  if (beat) cur.extra += Math.max(0, BEAT_WORDS - words(spoken).length);
  wordPos = cur.startWord + words(cur.text).length + cur.extra;
}
closePara();
if (!sections[0].paras.length) sections.shift();
const totalWords = wordPos;
if (totalWords < 50) { console.error(`only ${totalWords} spoken words found in ${file}`); process.exit(1); }
const sec = (w) => (w / wpm) * 60;
const total = sec(totalWords);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60) === 60 ? 59 : Math.round(s % 60)).padStart(2, '0')}`;
const pct = (s) => Math.round((100 * s) / total);

// ---- sentences with times and markers ----
// A "fact marker" is what code can see of new information: a number, a study word, a named source (a capitalised word
// mid-sentence) or a named term ("what we call"). It misses plain-language facts, so the timeline shows it per paragraph for a human to judge.
const FACT = /\d|\b(percent|a third|a quarter|half of|study|studies|trial|review|research|researchers|measured|survey|surveyed|university|association|journal|followed (?:people|kids|them|patients|everybody)|what we call|we call (?:it|them|that|this))\b/i;
const NOT_NAME = new Set(['I', "I'm", "I'd", "I've", "I'll", 'OK', 'Okay', 'Oh', 'God', 'Dr']);
const hasName = (s) => s.split(/\s+/).slice(1).some((w) => { const c = w.replace(/[^A-Za-z']/g, ''); return /^[A-Z][A-Za-z']+$/.test(c) && !NOT_NAME.has(c); });
const sents = [];
paras.forEach((p, pi) => {
  let w = p.startWord;
  for (const s of sentences(p.text)) {
    const n = words(s).length;
    sents.push({ para: pi, start: sec(w), end: sec(w + n), text: s, q: /\?["')]*$/.test(s), fact: FACT.test(s) || hasName(s) });
    w += n;
  }
  p.start = sec(p.startWord); p.words = words(p.text).length;
});
for (const s of sections) { s.start = sec(s.startWord); }
sections.forEach((s, i) => { s.end = i + 1 < sections.length ? sections[i + 1].start : total; s.len = s.end - s.start; });

// ---- checks ----
const checks = [];
const add = (id, ok, detail) => checks.push({ id, status: ok ? 'PASS' : 'WARN', detail });

// 1. Title key words in the first 3 spoken sentences.
const STOP = new Set(('a an the your you you\'re my i i\'m me we our us they their them he she his her it it\'s its this that these those is are aren\'t isn\'t '
  + 'am was were be been being do does doesn\'t don\'t did didn\'t not no yes can can\'t could should would will won\'t why what how when who where which '
  + 'of to in on for and or but with at by from about after before if then than as into out up down off over all any every some most more ever '
  + 'never only even still just really actually very so like get got make made here there vs versus').split(' '));
const IRREG = { tooth: 'teeth' };
const stem = (w) => { w = w.toLowerCase().replace(/'s$/, ''); if (IRREG[w]) return IRREG[w]; return w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w; };
const keyWords = [...new Set(words(title).filter((w) => !STOP.has(w)))];
const keys = [...new Set(keyWords.map(stem))];
const shown = (k) => keyWords.find((w) => stem(w) === k) || k;
if (!title) add('title-words', false, 'no title: pass --title "<title>" or put it on the first "# " line');
else {
  const first3 = sents.slice(0, 3);
  const found = {}; for (const s of first3) for (const w of words(s.text)) { const k = stem(w); if (keys.includes(k) && found[k] == null) found[k] = s.end; }
  const missing = keys.filter((k) => found[k] == null);
  const by = Object.values(found).length ? Math.max(...Object.values(found)) : null;
  add('title-words', !missing.length, `title key words [${keys.map(shown).join(', ')}] in the first 3 sentences: ${missing.length ? `missing ${missing.map(shown).join(', ')}` : `all spoken by ${clock(by)}`}`);
}
// 2. First section change by about 1:30.
if (sections.length < 2) add('first-turn', false, 'no ### sections: the timeline cannot see section turns');
else add('first-turn', sections[1].start <= 90, `first section change at ${clock(sections[1].start)} ("${sections[1].name}"), target by 1:30`);
// 3. No section longer than 170 s (the gap between section starts, and the last section to the end).
const longest = [...sections].sort((a, b) => b.len - a.len)[0];
const over = sections.filter((s) => s.len > 170);
add('section-gap', !over.length, over.length ? `${over.length} section(s) run over 2:50: ${over.map((s) => `"${s.name}" ${clock(s.len)} from ${clock(s.start)}`).join('; ')}`
  : `longest section "${longest.name}" ${clock(longest.len)}, target 2:50 or less`);
// 4. Spoken length against the target range.
add('length', total >= minLo * 60 && total <= minHi * 60, `${totalWords} spoken words = ${clock(total)} at ${Math.round(wpm)} wpm, target ${minLo}-${minHi} min (${Math.round(minLo * wpm)}-${Math.round(minHi * wpm)} words)`);
// 5. Questions in the first 60 s.
const q60 = sents.filter((s) => s.q && s.start < 60);
add('questions-60s', q60.length >= 1 && q60.length <= 4, `${q60.length} question(s) in the first 60 s, band 1-4${channel === 'thebentist' ? " (Ben's explainers: 2 to 4 in 3 of 4)" : ''}${q60.length ? ': ' + q60.map((s) => `${clock(s.start)} "${s.text.slice(0, 60)}"`).join(' | ') : ''}`);
// 6. Where the last new fact lands.
const facts = sents.filter((s) => s.fact);
const lastFact = facts[facts.length - 1];
add('last-fact', lastFact && pct(lastFact.start) >= 85, lastFact ? `last fact marker at ${clock(lastFact.start)} (${pct(lastFact.start)}% of runtime), target 85% or later: "${lastFact.text.slice(0, 80)}"` : 'no fact markers found');
// 7. Longest stretch with nothing new on the page (no fact marker, question or cue).
const events = [0, ...facts.map((s) => s.start), ...sents.filter((s) => s.q).map((s) => s.start), ...cues.map((c) => sec(c.word)), total].sort((a, b) => a - b);
let gap = 0, gapAt = 0; for (let i = 1; i < events.length; i++) if (events[i] - events[i - 1] > gap) { gap = events[i] - events[i - 1]; gapAt = events[i - 1]; }
add('dead-stretch', gap <= 90, `longest stretch with no fact marker, question or cue: ${clock(gap)} from ${clock(gapAt)}, target 1:30 or less`);
// 8. Section seams never turn on "and then".
const seams = sections.slice(1).map((s) => ({ at: s.start, name: s.name, last: sents.filter((x) => x.end <= s.start + 0.01).pop()?.text || '', first: s.paras[0]?.text.slice(0, 90) || '' }));
const andThen = seams.filter((s) => /^((okay|so|now|well)[.,]?\s+)?and then\b/i.test(s.first));
if (!seams.length) add('seams', false, 'no ### sections: no seams to read');
else add('seams', !andThen.length, andThen.length ? `"and then" opens ${andThen.map((s) => `"${s.name}"`).join(', ')}` : `no section opens on "and then" (openers: ${seams.map((s) => words(s.first).slice(0, 3).join(' ')).join(' / ')})`);
// 9. No recap in the last 15%.
const RECAP = /\b(to recap|as a recap|recap|in summary|to sum (?:it )?up|to summarize|so to review|let's review|quick review)\b/i;
const recaps = sents.filter((s) => s.start >= total * 0.85 && RECAP.test(s.text));
add('no-recap', !recaps.length, recaps.length ? `recap phrase in the ending: ${recaps.map((s) => `"${s.text.slice(0, 60)}"`).join(' | ')}` : 'no recap phrase in the last 15%');
// 10. Pivot and re-hook formulas: only ones the host really says, none repeated.
const PIVOTS = ["here's the thing", "but here's", "here's the crazy part", "here's where", "here's why", 'but wait', 'you might be thinking', 'you might be wondering',
  'and it gets worse', "but that's not all", 'stick around', 'stay tuned', 'keep watching', 'until the end', 'in this video', 'let me explain', "let's dive in",
  'without further ado', 'turns out', 'plot twist', 'which brings us', 'that brings us', 'now that we know', 'the real question', 'the answer is',
  'and guess what', 'the crazy part', 'what if i told you', 'fun fact', 'in fact', 'first off', 'either way', 'anyways', 'that being said', 'the problem is', 'like i said'];
const norm = (t) => ` ${words(t).join(' ')} `;
const count = (hay, p) => { const n = ` ${words(p).join(' ')} `; let c = 0, i = 0; while ((i = hay.indexOf(n, i)) !== -1) { c++; i += n.length - 1; } return c; };
const scriptJoined = norm(paras.map((p) => p.text).join(' '));
const tDir = path.join(ROOT, 'voice', channel, 'transcripts');
let hostJoined = null, hostWords = 0;
if (fs.existsSync(tDir)) { const parts = fs.readdirSync(tDir).filter((f) => f.endsWith('.txt')).map((f) => norm(fs.readFileSync(path.join(tDir, f), 'utf8'))); hostJoined = parts.join(' '); hostWords = hostJoined.split(' ').filter(Boolean).length; }
const used = PIVOTS.map((p) => ({ p, n: count(scriptJoined, p), host: hostJoined ? count(hostJoined, p) : null })).filter((x) => x.n);
const never = used.filter((x) => x.host === 0), repeated = used.filter((x) => x.n >= 3);
if (hostJoined == null) add('pivots', !used.length, `no voice/${channel}/transcripts to check against; pivot formulas used: ${used.map((x) => `"${x.p}" x${x.n}`).join(', ') || 'none'}`);
else add('pivots', !never.length && !repeated.length, `pivot formulas used: ${used.map((x) => `"${x.p}" x${x.n} (host ${x.host} in ${hostWords} words)`).join(', ') || 'none'}`
  + (never.length ? `; host never says: ${never.map((x) => `"${x.p}"`).join(', ')}` : '') + (repeated.length ? `; used 3+ times: ${repeated.map((x) => `"${x.p}"`).join(', ')}` : ''));

// ---- output ----
if (args.json) {
  console.log(JSON.stringify({ file, title, keywords: keys.map(shown), wpm, wpm_source: wpmSource, words: totalWords, seconds: Math.round(total),
    sections: sections.map((s) => ({ name: s.name, start: Math.round(s.start), seconds: Math.round(s.len), words: s.paras.reduce((a, p) => a + p.words, 0) })),
    paragraphs: paras.map((p, i) => ({ n: i + 1, start: Math.round(p.start), words: p.words, facts: sents.filter((s) => s.para === i && s.fact).length, questions: sents.filter((s) => s.para === i && s.q).length, first: p.text.slice(0, 80) })),
    cues: cues.map((c) => ({ at: Math.round(sec(c.word)), text: c.text })), seams, checks }, null, 2));
  process.exit(0);
}
console.log(`Retention check: ${path.basename(file)} at ${Math.round(wpm * 10) / 10} wpm (${wpmSource})`);
console.log(`Title: "${title}"   key words: ${keys.map(shown).join(', ') || '(none)'}`);
console.log(`Spoken: ${totalWords} words, about ${clock(total)} (timestamps +-10%: no pauses or cutaways modelled)\n`);
console.log('Timeline   (F = sentences with a fact marker, ? = questions, V = a cue at or inside the paragraph)');
paras.forEach((p, i) => {
  const s = sections.find((x) => x.paras.includes(p));
  if (s.paras[0] === p) console.log(`${clock(s.start).padStart(5)}  ### ${s.name}   (${clock(s.len)}, ${pct(s.start)}%)`);
  const f = sents.filter((x) => x.para === i && x.fact).length, q = sents.filter((x) => x.para === i && x.q).length;
  const v = cues.some((c) => c.word >= p.startWord && c.word < p.startWord + p.words);
  const flags = `${f ? 'F' + f : '  '} ${q ? '?' + q : '  '} ${v ? 'V' : ' '}`;
  console.log(`${clock(p.start).padStart(9)}  ¶${String(i + 1).padEnd(3)}${String(p.words).padStart(4)}w  ${flags}  ${p.text.slice(0, 64)}${p.text.length > 64 ? '...' : ''}`);
});
console.log(`${clock(total).padStart(5)}  end\n`);
console.log('Seams (last sentence of a section | how the next one opens)');
for (const s of seams) console.log(`${clock(s.at).padStart(5)}  ...${s.last.slice(-60)} | ${s.first.slice(0, 70)}${s.first.length > 70 ? '...' : ''}`);
console.log('\nChecks');
for (const c of checks) console.log(`  ${c.status}  ${c.id.padEnd(13)} ${c.detail}`);
const warns = checks.filter((c) => c.status === 'WARN').length;
console.log(`\n${checks.length - warns} PASS, ${warns} WARN. Advisory: score the rest by hand with docs/retention-checklist.md.`);
