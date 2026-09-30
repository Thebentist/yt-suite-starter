#!/usr/bin/env node
/* Passage bank: every stretch of a creator's real speech, labelled so a scriptwriter can pull the right models for each beat.
 *   node pipeline/voice/passages.mjs build --channel thebentist
 *   node pipeline/voice/passages.mjs query --channel thebentist [--type react,explainer] [--function explain] [--topic "whitening sensitivity"]
 *                                          [--position open|body|close] [--n 6] [--min-host 0.4] [--json] [--seed 1]
 *   node pipeline/voice/passages.mjs stats --channel thebentist
 * Passages are 2+ whole sentences, 40-140 words, from punctuated transcripts only.
 * Labels: type (pipeline/voice/types.mjs), position (open = first ~6%, close = last ~8%), functions (regex heuristics:
 * explain, react, viewer, list, hedge, story, sponsor), host = how likely the passage is the host talking and not clip audio
 * (reaction videos mix both): signature-phrase density plus host markers, with a prior for video types where the host
 * talks the whole time. Reference channels (no clip audio) are host = 1. Sponsor reads are excluded from queries by default.
 */
import { hostId } from '../host.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, readJson, writeJson } from '../swipe/lib.mjs';
import { words, sentences, measure } from './measure.mjs';
import { classifyType } from './types.mjs';

const args = parseArgs();
const cmd = args._[0];
const id = args.channel || hostId();
const dir = path.join(ROOT, 'voice', id);
const bankPath = path.join(dir, 'passages.json');

const FUNCTIONS = {
  explain: /\b(basically|because|what happens (is|when)|the reason|think of (it|this)|which means|it's called|so what (that|this) means|the way (it|this) works|in other words|let me explain|you see)\b/i,
  react: /\b(oh my (gosh|god)|no way|what the|that is (insane|crazy|wild|disgusting)|that's (insane|crazy|wild|so)|holy|dude|bro|yikes|wow|ew+|jeez|come on)\b/i,
  viewer: /\b(you guys|let me know|comment|subscribe|in the comments|if you (have|want|ever)|make sure you)\b/i,
  list: /\b(number (one|two|three|four|five|\d+)|next (one|up)|first (one|up)|last one|moving on|this (next )?one)\b/i,
  hedge: /\b(i think|probably|maybe|i don't know|i'm not sure|i guess|kind of|sort of|i could be wrong|not gonna lie|to be honest)\b/i,
  story: /\b(when i was|i remember|back (then|in)|one time|in dental school|my (mom|dad|wife|kids?|patient)|years ago)\b/i,
  sponsor: /\b(sponsor(ed)?|promo code|use code|link (in|down) (the|below)|brought to you by|check (them|it) out at|percent off|free trial)\b/i,
};
const HOST_MARKERS = /\b(you guys|i'm a (dentist|orthodontist)|as an? (dentist|orthodontist)|my (patients?|office|practice)|in my (office|chair|practice)|dental school|we'll see you|see you next week|let me explain)\b/i;
const TALKY_TYPES = new Set(['explainer', 'qa', 'personal', 'segment']);

function build() {
  const ch = readJson(path.join(ROOT, 'channels', `${id}.json`), { id });
  const index = readJson(path.join(dir, 'index.json'), { videos: {} });
  const fp = readJson(path.join(dir, 'fingerprint.json'), null);
  if (!fp) { console.error(`voice/${id}/fingerprint.json missing: run fingerprint.mjs first`); process.exit(1); }
  const sig = (fp.signature_phrases || []).slice(0, 50).map((p) => p.phrase);
  const dupSet = new Set((fp.duplicates || []).map((d) => d.vid));
  const isRef = ch.role === 'voice-reference';
  const tDir = path.join(dir, 'transcripts');
  const bank = [];
  const counts = {};
  for (const f of fs.readdirSync(tDir).filter((x) => x.endsWith('.txt'))) {
    const vid = f.replace(/\.txt$/, '');
    const text = fs.readFileSync(path.join(tDir, f), 'utf8');
    const ws = words(text);
    if (ws.length < 80 || (text.match(/[.?!]/g) || []).length / ws.length < 1 / 40) continue; // near-empty or unpunctuated
    if (dupSet.has(vid)) continue; // a Short cut from a long video, or a compilation: the original is in the bank already
    const meta = index.videos[vid] || {};
    const type = classifyType(meta, ch);
    counts[type] = (counts[type] || 0) + 1;
    const sents = sentences(text).map((s) => s.replace(/\s+/g, ' ').trim());
    // drop whisper hallucination loops (the same sentence 3+ times in a row)
    const kept = sents.filter((s, i) => !(i >= 2 && s === sents[i - 1] && s === sents[i - 2]));
    const total = kept.reduce((a, s) => a + words(s).length, 0);
    let at = 0, cur = [], curW = 0, k = 0, startAt = 0;
    const flush = () => {
      if (curW < 40 || cur.length < 2) { cur = []; curW = 0; return; } // too short to show rhythm
      const body = cur.join(' ');
      const j = ` ${words(body).join(' ')} `;
      const functions = Object.entries(FUNCTIONS).filter(([, re]) => re.test(body)).map(([f]) => f);
      const sigHits = sig.filter((p) => j.includes(` ${p} `)).length;
      const host = isRef ? 1 : Math.min(1, Math.round(((TALKY_TYPES.has(type) ? 0.45 : 0) + 0.2 * sigHits + (HOST_MARKERS.test(body) ? 0.35 : 0)) * 100) / 100);
      const pos = startAt / (total || 1);
      bank.push({ id: `${vid}#${k++}`, vid, title: meta.title || null, type, pos: Math.round(pos * 1000) / 1000, position: pos < 0.06 ? 'open' : (at / (total || 1)) > 0.92 ? 'close' : 'body', words: curW, functions, host, text: body });
      cur = []; curW = 0;
    };
    for (const s of kept) {
      const n = words(s).length;
      if (curW + n > 140 && curW >= 40) flush();
      if (!cur.length) startAt = at;
      cur.push(s); curW += n; at += n;
      if (curW >= 70) flush();
    }
    flush();
  }
  // Titles mislead ("They actually showed this on camera.." reads as an explainer but is a reaction to footage). A video
  // whose passages are full of live-narration markers is a reaction, whatever its title, unless index.json sets `type`.
  if (!isRef) {
    const LIVE = /\b(pause it|let's (see|watch)|what do we (got|have) here|you guys tagged me|look at (this|that)|right here|oh my (gosh|god)|here we go|all right so|this (guy|girl|lady)|she's|he's)\b/i;
    const retyped = [];
    for (const vid of [...new Set(bank.map((p) => p.vid))]) {
      const ps = bank.filter((p) => p.vid === vid);
      if (!['explainer', 'qa', 'personal'].includes(ps[0].type) || index.videos[vid]?.type) continue;
      const live = ps.filter((p) => LIVE.test(p.text)).length / ps.length;
      if (live >= 0.35) { for (const p of ps) p.type = 'react'; retyped.push(`${vid} (${Math.round(live * 100)}% live)`); counts[ps[0].type] = (counts[ps[0].type] || 0); }
    }
    if (retyped.length) console.log(`[passages] reclassified as react from their content: ${retyped.join(', ')}`);
  }
  // Rhythm profile per video type, from host passages only (clip audio left out). voice-check compares scripts with these.
  const profiles = {};
  const hostPs = bank.filter((p) => p.host >= 0.4 && !p.functions.includes('sponsor'));
  for (const t of [...new Set(hostPs.map((p) => p.type))]) {
    const ps = hostPs.filter((p) => p.type === t);
    if (ps.length >= 15) profiles[t] = { passages: ps.length, ...measure(ps.map((p) => p.text).join('\n')) };
  }
  if (hostPs.length >= 15) profiles.all = { passages: hostPs.length, ...measure(hostPs.map((p) => p.text).join('\n')) };
  writeJson(bankPath, { channel: id, built_at: new Date().toISOString(), types: counts, profiles, passages: bank });
  const byType = {};
  for (const p of bank) byType[p.type] = (byType[p.type] || 0) + 1;
  console.log(`[passages] ${id}: ${bank.length} passages from ${Object.values(counts).reduce((a, b) => a + b, 0)} transcripts. By type: ${JSON.stringify(byType)}. Host >= 0.4: ${bank.filter((p) => p.host >= 0.4).length}. Sponsor: ${bank.filter((p) => p.functions.includes('sponsor')).length}.`);
}

const STOP = new Set('the a an and or but so to of in on at for with is are was were be been it this that these those i you he she we they my your his her our their me him them what which who how why when where there here just like really very can could would should do does did have has had not no yes if then than about into from up down out over all some any more most much many one two three'.split(' '));
function query() {
  const bank = readJson(bankPath, null);
  if (!bank) { console.error(`voice/${id}/passages.json missing: run "passages.mjs build --channel ${id}"`); process.exit(1); }
  const types = args.type && args.type !== true ? String(args.type).split(',') : null;
  const fn = args.function && args.function !== true ? String(args.function) : null;
  const position = args.position && args.position !== true ? String(args.position) : null;
  const minHost = Number(args['min-host'] ?? 0.4);
  const n = Number(args.n || 6);
  const topic = (args.topic && args.topic !== true ? words(String(args.topic)) : []).filter((w) => !STOP.has(w) && w.length > 2);
  let seed = Number(args.seed || 1) >>> 0 || 1;
  const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const scored = bank.passages
    .filter((p) => !p.functions.includes('sponsor') || fn === 'sponsor')
    .filter((p) => p.host >= minHost)
    .filter((p) => !position || p.position === position)
    .filter((p) => !fn || p.functions.includes(fn))
    .map((p) => {
      const pw = words(p.text);
      const tScore = topic.length ? topic.filter((t) => pw.some((w) => w === t || (t.length > 4 && w.startsWith(t.slice(0, 5))))).length / topic.length : 0;
      return { p, s: 2 * tScore + p.host + (types && types.includes(p.type) ? 1 : 0) + rnd() * 0.3 };
    })
    .sort((a, b) => b.s - a.s);
  const pick = []; const perVid = {};
  for (const { p } of scored) { if ((perVid[p.vid] = (perVid[p.vid] || 0) + 1) > 2) continue; pick.push(p); if (pick.length >= n) break; }
  if (args.json) { console.log(JSON.stringify(pick, null, 1)); return; }
  if (!pick.length) { console.log('[passages] nothing matched; loosen --function / --min-host / --type'); return; }
  for (const p of pick) console.log(`--- ${p.id} · ${p.type}${types && !types.includes(p.type) ? ' (other type: no closer match)' : ''} · ${p.position} ${Math.round(p.pos * 100)}% · host ${p.host} · [${p.functions.join(', ')}]\n    "${p.title || ''}"\n${p.text}\n`);
}

function stats() {
  const bank = readJson(bankPath, null);
  if (!bank) { console.error('no passage bank; run build'); process.exit(1); }
  const rows = {};
  for (const p of bank.passages) { const r = (rows[p.type] ??= { passages: 0, host40: 0 }); r.passages++; if (p.host >= 0.4) r.host40++; for (const f of p.functions) r[f] = (r[f] || 0) + 1; }
  console.log(`transcripts by type: ${JSON.stringify(bank.types)}`);
  console.table(rows);
  const prof = Object.entries(bank.profiles || {}).map(([t, m]) => ({ type: t, passages: m.passages, 'words/sent': m.sentence_len.mean, 'median (p10-p90)': `${m.sentence_len.median} (${m.sentence_len.p10}-${m.sentence_len.p90})`, 'questions %': m.question_share, 'you/1k': m.you_per_1k, 'I/1k': m.i_per_1k, 'S/M/L/X': ['S', 'M', 'L', 'X'].map((k) => Math.round(m.cadence.dist[k] * 100)).join('/'), 'long→short': m.cadence.drop }));
  console.log('\nRhythm by type (host passages only):'); console.table(prof);
}

const run = { build, query, stats }[cmd];
if (run) run(); else console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
