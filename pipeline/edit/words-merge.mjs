/* Merge two whisper passes over the same audio into one word list: [{t, end, w, src}].
 *
 * Measured on a real 6-minute take (2026-09-28):
 *   - plain whisper small.en wrote no punctuation at all and dropped about half the "um"s;
 *   - a punctuated initial prompt with an "Um," in it (--carry-initial-prompt) gives sentences, capitals and the
 *     fillers, but its TIMESTAMPS ARE UNRELIABLE: one prompt skipped the first 10 s and shifted it by 8 s; a nearly
 *     identical prompt drifted 3-13 s for the first 140 s. It also tidied two "the the" stutters into one.
 *   - plain word starts sit a median 70 ms from the real onset after a pause (p90 240 ms); DTW token times were worse.
 * So the plain pass is the base: every word and every time comes from it. The prompted pass only lends TEXT, matched by
 * word sequence (never by time):
 *   - a plain word that matches a prompted word takes its written form (capitals, trailing punctuation);
 *   - a filler only the prompted pass has, between two matched neighbours with nothing else between them in the plain
 *     pass, is inserted where the audio has exactly one separate short voiced blob between those two words
 *     (src 'inferred'); otherwise it is left out and counted.
 *
 *   mergeWords(plain, prompted, { env, thr }) -> { words, stats }
 *   env: audioEnvelope() of the same audio; thr: its speech threshold (dBFS). Without env no fillers are inserted.
 */

export const normWord = (w) => String(w).toLowerCase().replace(/[^a-z0-9']/g, '').replace(/'/g, '');
export const FILLER_RE = /^(um+|uh+|uhm+|er+m?|ah+|hmm+|mm+)$/;

/** Monotonic exact-match alignment of two word lists by text: unique-trigram anchors, then edit distance between them. */
export function alignWords(A, B) {
  const a = A.map((w) => normWord(w.w)), b = B.map((w) => normWord(w.w));
  const key = (x, i) => `${x[i]}|${x[i + 1]}|${x[i + 2]}`;
  const uniq = (x) => { const m = new Map(); for (let i = 0; i + 2 < x.length; i++) { const k = key(x, i); m.set(k, m.has(k) ? -1 : i); } return m; };
  const ua = uniq(a), ub = uniq(b);
  const cand = [];
  for (const [k, i] of ua) { const j = ub.get(k); if (i >= 0 && j != null && j >= 0) cand.push([i, j]); }
  cand.sort((p, q) => p[0] - q[0]);
  const tails = [], tailIdx = [], prev = new Array(cand.length).fill(-1);
  cand.forEach(([, j], c) => {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] < j) lo = mid + 1; else hi = mid; }
    tails[lo] = j; tailIdx[lo] = c; prev[c] = lo > 0 ? tailIdx[lo - 1] : -1;
  });
  const chain = []; for (let c = tailIdx[tails.length - 1] ?? -1; c >= 0; c = prev[c]) chain.unshift(cand[c]);
  const pairs = [];
  const fill = (i0, i1, j0, j1) => { for (const op of editOps(a.slice(i0, i1), b.slice(j0, j1))) if (op.type === 'match') pairs.push([i0 + op.i, j0 + op.j]); };
  let pi = 0, pj = 0;
  for (const [i, j] of chain) {
    if (i < pi || j < pj) continue;
    fill(pi, i, pj, j);
    for (let k = 0; k < 3; k++) pairs.push([i + k, j + k]);
    pi = i + 3; pj = j + 3;
  }
  fill(pi, a.length, pj, b.length);
  pairs.sort((p, q) => p[0] - q[0]);
  return pairs.filter((p, k) => k === 0 || (p[0] > pairs[k - 1][0] && p[1] > pairs[k - 1][1]));
}

/** Edit script between two normalized token arrays: [{type: match|sub|del (only in a)|ins (only in b), i, j}]. */
export function editOps(a, b) {
  const n = a.length, m = b.length;
  if (!n) return b.map((_, j) => ({ type: 'ins', i: -1, j }));
  if (!m) return a.map((_, i) => ({ type: 'del', i, j: -1 }));
  if (n * m > 4e6) return [...a.map((_, i) => ({ type: 'del', i, j: -1 })), ...b.map((_, j) => ({ type: 'ins', i: -1, j }))];
  const D = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = 0; i <= n; i++) D[i][0] = i;
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const ops = [];
  for (let i = n, j = m; i > 0 || j > 0;) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { ops.push({ type: a[i - 1] === b[j - 1] ? 'match' : 'sub', i: i - 1, j: j - 1 }); i--; j--; }
    else if (i > 0 && D[i][j] === D[i - 1][j] + 1) { ops.push({ type: 'del', i: i - 1, j: -1 }); i--; }
    else { ops.push({ type: 'ins', i: -1, j: j - 1 }); j--; }
  }
  return ops.reverse();
}

/** Voiced runs (energy above thr) in [t0, t1], merging dips shorter than minGap. */
export function voicedBlobs(env, thr, t0, t1, { minGap = 0.04 } = {}) {
  const dbAt = (t) => env.db[Math.min(env.db.length - 1, Math.max(0, Math.floor(t / env.win)))] ?? -120;
  const blobs = []; let s = null, lastV = null;
  for (let t = Math.max(0, t0); t < t1; t += env.win) {
    if (dbAt(t) > thr) { if (s == null) s = t; else if (t - lastV > minGap) { blobs.push([s, lastV]); s = t; } lastV = t + env.win; }
  }
  if (s != null) blobs.push([s, lastV]);
  return blobs;
}

export function mergeWords(plain, prompted, { env = null, thr = null } = {}) {
  const P = plain.map((w) => ({ t: +w.t, end: +(w.end ?? w.t), w: String(w.w).trim(), src: 'plain' }));
  const Q = prompted.map((w) => ({ w: String(w.w).trim() }));
  const pairs = alignWords(P, Q);
  const stats = { plainWords: P.length, promptedWords: Q.length, matched: pairs.length, textFromPrompted: 0, sentenceEnds: 0, fillersInserted: 0, fillersNotPlaced: [] };
  for (const [i, j] of pairs) { if (P[i].w !== Q[j].w) { P[i].w = Q[j].w; stats.textFromPrompted++; } }
  // fillers only the prompted pass has
  const iOfJ = new Map(pairs.map(([i, j]) => [j, i]));
  const inserts = [];
  for (let j = 0; j < Q.length; j++) {
    if (iOfJ.has(j) || !FILLER_RE.test(normWord(Q[j].w))) continue;
    let jl = j - 1; while (jl >= 0 && !iOfJ.has(jl)) jl--;
    let jr = j + 1; while (jr < Q.length && !iOfJ.has(jr)) jr++;
    const il = jl >= 0 ? iOfJ.get(jl) : null, ir = jr < Q.length ? iOfJ.get(jr) : null;
    const where = il != null ? P[il].t : null;
    if (il == null || ir == null) { stats.fillersNotPlaced.push({ w: Q[j].w, near: where, why: 'no matched word on one side' }); continue; }
    if (ir !== il + 1) { stats.fillersNotPlaced.push({ w: Q[j].w, near: where, why: `the plain pass has ${ir - il - 1} other word(s) there` }); continue; }
    if (!env || thr == null) { stats.fillersNotPlaced.push({ w: Q[j].w, near: where, why: 'no audio envelope' }); continue; }
    // whisper stretches the neighbours over a filler it did not write, so search from the left word's start to the right
    // word's end: the first blob is the left word, the last the right word, a filler is a separate blob in between
    const L = P[il], R = P[ir];
    const blobs = voicedBlobs(env, thr, L.t - 0.05, R.end + 0.05);
    const inner = blobs.slice(1, -1).filter(([x, y]) => y - x >= 0.1 && y - x <= 0.9);
    if (inner.length !== 1) { stats.fillersNotPlaced.push({ w: Q[j].w, near: +L.t.toFixed(2), why: `${inner.length} separate voiced blobs between "${L.w}" and "${R.w}"` }); continue; }
    const [x, y] = inner[0];
    inserts.push({ after: il, word: { t: +x.toFixed(3), end: +y.toFixed(3), w: Q[j].w, src: 'inferred' } });
  }
  const out = [...P];
  for (const ins of inserts.sort((p, q) => q.after - p.after)) {
    out.splice(ins.after + 1, 0, ins.word);
    // the neighbours no longer own the filler's time
    if (out[ins.after].end > ins.word.t) out[ins.after].end = ins.word.t;
    const nx = out[ins.after + 2]; if (nx && nx.t < ins.word.end) nx.t = ins.word.end;
  }
  stats.fillersInserted = inserts.length;
  stats.sentenceEnds = out.filter((w) => /[.!?]["')\]]*$/.test(w.w)).length;
  return { words: out, stats };
}

/** Whisper JSON (-ml 1, one token per segment) -> [{t, end, w}]. */
export function whisperJsonToWords(j) {
  const words = [];
  for (const s of j.transcription || []) {
    const text = s.text;
    if (!text || !text.trim()) continue;
    const start = s.offsets.from / 1000, end = s.offsets.to / 1000;
    if (text.startsWith(' ') || words.length === 0) words.push({ t: start, end, w: text.trim() });
    else { const last = words[words.length - 1]; last.w += text.trim(); last.end = end; }
  }
  return words;
}
