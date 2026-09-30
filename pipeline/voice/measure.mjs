/* Text statistics shared by fingerprint.mjs (a creator's corpus) and voice-check.mjs (one script against that corpus). */

export const MARKERS = [
  'you know', 'kind of', 'sort of', 'actually', 'basically', 'honestly', 'literally', 'like', 'i mean', 'right', 'okay', 'ok',
  'you guys', 'guys', 'obviously', 'pretty', 'super', 'really', 'probably', 'maybe', 'i think', 'i guess', 'i feel like',
  'crazy', 'insane', 'wild', 'gonna', 'wanna', 'gotta', "let's", 'dude', 'folks', 'so', 'now', 'well', 'anyway', 'yeah',
  'oh my gosh', 'guess what', 'what if i told you', 'fun fact', 'let me explain', 'you see', "i'm not gonna lie", "i'm not going to lie",
  'which is', 'and so', 'all these different things', 'at the end of the day', 'to be honest', 'for sure', 'definitely',
];

const CONTRACTIONS = [
  ["don't", 'do not'], ["doesn't", 'does not'], ["isn't", 'is not'], ["can't", 'cannot'], ["won't", 'will not'], ["i'm", 'i am'],
  ["it's", 'it is'], ["that's", 'that is'], ["you're", 'you are'], ["we're", 'we are'], ["they're", 'they are'], ["there's", 'there is'],
  ["gonna", 'going to'], ["i've", 'i have'], ["you've", 'you have'], ["didn't", 'did not'], ["wasn't", 'was not'],
];

export function clean(text) {
  return text
    .replace(/\[[^\]]*\]/g, ' ')          // [Music], [VISUAL: ...], [HOLD] etc.
    .replace(/>>/g, ' ')
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export const words = (text) => (text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) || []);

export function sentences(text) {
  return clean(text).split(/(?<=[.?!])\s+(?=["'(]?[A-Z0-9])/).map((s) => s.trim()).filter((s) => words(s).length > 0);
}

export function ngrams(ws, n) {
  const out = [];
  for (let i = 0; i + n <= ws.length; i++) out.push(ws.slice(i, i + n).join(' '));
  return out;
}

function countPhrase(joined, phrase) {
  // joined is ' w1 w2 w3 ' so phrase boundaries are spaces
  let c = 0, i = 0; const needle = ` ${phrase} `;
  while ((i = joined.indexOf(needle, i)) !== -1) { c++; i += needle.length - 1; }
  return c;
}

/* Cadence: how sentence lengths follow each other. Buckets S (1-6 words), M (7-14), L (15-24), X (25+).
 * dist = share of sentences per bucket; next = P(next bucket | this bucket); cv = spread of lengths (std/mean);
 * drop = how often a long sentence (L/X) is followed by a short one (S), the "run on, then react" move. */
export const BUCKETS = ['S', 'M', 'L', 'X'];
const bucket = (n) => (n <= 6 ? 'S' : n <= 14 ? 'M' : n <= 24 ? 'L' : 'X');
const r3 = (x) => Math.round(x * 1000) / 1000;
export function cadence(lens) {
  const b = lens.map(bucket);
  const pairs = b.slice(0, -1).map((x, i) => [x, b[i + 1]]);
  const dist = Object.fromEntries(BUCKETS.map((k) => [k, r3(b.filter((x) => x === k).length / (b.length || 1))]));
  const next = {};
  for (const a of BUCKETS) {
    const from = pairs.filter(([x]) => x === a);
    next[a] = Object.fromEntries(BUCKETS.map((k) => [k, r3(from.filter(([, y]) => y === k).length / (from.length || 1))]));
  }
  const mean = lens.reduce((x, y) => x + y, 0) / (lens.length || 1);
  const sd = Math.sqrt(lens.reduce((x, y) => x + (y - mean) ** 2, 0) / (lens.length || 1));
  const longs = pairs.filter(([x]) => x === 'L' || x === 'X');
  return { dist, next, cv: r3(sd / (mean || 1)), drop: r3(longs.filter(([, y]) => y === 'S').length / (longs.length || 1)) };
}
/** 0 = identical cadence, 1 = nothing alike: half the L1 distance of the bucket shares, averaged with the transitions. */
export function cadenceDistance(a, b) {
  const l1 = (p, q) => BUCKETS.reduce((s, k) => s + Math.abs((p?.[k] || 0) - (q?.[k] || 0)), 0) / 2;
  const trans = BUCKETS.reduce((s, k) => s + l1(a.next[k], b.next[k]) * (b.dist[k] || 0), 0);
  return r3(0.5 * l1(a.dist, b.dist) + 0.5 * trans);
}

const pct = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

/** Measure one body of text. */
export function measure(text) {
  const sents = sentences(text);
  const ws = words(text);
  const joined = ` ${ws.join(' ')} `;
  const lens = sents.map((s) => words(s).length);
  const per1k = (n) => (ws.length ? r1((n / ws.length) * 1000) : null);
  const markers = {};
  for (const m of MARKERS) markers[m] = per1k(countPhrase(joined, m));
  const openers = {};
  for (const s of sents) { const w = words(s)[0]; if (w) openers[w] = (openers[w] || 0) + 1; }
  const contr = { contracted: 0, expanded: 0 };
  for (const [c, e] of CONTRACTIONS) { contr.contracted += countPhrase(joined, c); contr.expanded += countPhrase(joined, e); }
  return {
    words: ws.length,
    sentences: sents.length,
    sentence_len: { mean: r1(lens.reduce((a, b) => a + b, 0) / (lens.length || 1)), median: pct(lens, 0.5), p10: pct(lens, 0.1), p90: pct(lens, 0.9) },
    fragment_share: r1((100 * lens.filter((l) => l <= 4).length) / (lens.length || 1)),
    long_share: r1((100 * lens.filter((l) => l >= 25).length) / (lens.length || 1)),
    question_share: r1((100 * sents.filter((s) => s.endsWith('?')).length) / (sents.length || 1)),
    exclaim_share: r1((100 * sents.filter((s) => s.endsWith('!')).length) / (sents.length || 1)),
    comma_per_sentence: r1((clean(text).match(/,/g) || []).length / (sents.length || 1)),
    you_per_1k: per1k(countPhrase(joined, 'you') + countPhrase(joined, 'your') + countPhrase(joined, "you're")),
    i_per_1k: per1k(countPhrase(joined, 'i') + countPhrase(joined, 'me') + countPhrase(joined, 'my') + countPhrase(joined, "i'm")),
    we_per_1k: per1k(countPhrase(joined, 'we') + countPhrase(joined, 'us') + countPhrase(joined, 'our') + countPhrase(joined, "we're")),
    contraction_ratio: r1((100 * contr.contracted) / ((contr.contracted + contr.expanded) || 1)),
    markers,
    cadence: cadence(lens),
    openers: Object.fromEntries(Object.entries(openers).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([w, c]) => [w, r1((100 * c) / (sents.length || 1))])),
  };
}

export { countPhrase, pct, r1 };
