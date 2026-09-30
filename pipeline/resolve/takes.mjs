/* Content cuts for the rough cut: fillers, stutters and false starts ("takes"), decided from word times + the audio.
 *
 *   planContentCuts({ words, env, thr, style }) -> { cuts: [...], kept: [...] }
 *   applyContentCuts(env, words, cuts) -> { env, words }   (a copy of the envelope with the cut ranges silenced, and the
 *                                                            word list without the removed words)
 *
 * A removal is never placed on whisper's word times alone (they are estimates: median 70 ms, p90 240 ms off the real
 * onset). Each edge goes on the quietest 10 ms of audio between the two words' midpoints, and the cut is only made
 * when BOTH edges sit in a real dip (<= threshold + edgeDb for >= 20 ms): a filler or repeat that runs straight into
 * its neighbours ("it-um-which" in one breath) cannot be removed cleanly by a straight cut, so it is only reported.
 * The removed range is then treated as silence: decideCut() merges it with the pauses on either side and leaves the
 * style's natural pause, so the join gets the same word-edge protection as any dead-air cut.
 *
 * Policy (style.edit.takes, each 'cut' | 'mark' | 'off'):
 *   fillers   um / uh / er ... (style.edit.markers.fillers)
 *   stutters  a word said twice or more in a row: all but the last occurrence go. Never for emphasis words (really,
 *             very, so, ...); "that that" / "had had" can be grammatical, so they are only marked.
 *   retakes   a 3+ word run said again: the abandoned first attempt goes, but only when the restart follows within
 *             retakeMaxSec with at most retakeMaxGapWords words after the repeated run and no sentence ends in the
 *             attempt. Anything looser is a RETAKE? marker for a human.
 */

const norm = (w) => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
const isSentenceEnd = (w) => /[.!?]["')\]]*$/.test(w);
const STOP = new Set("a an the and or but so to of in on at for with is it's its i i'm you your we they he she that this was be are do did just like um uh".split(' '));
export const EMPHASIS = new Set(['really', 'very', 'so', 'no', 'yeah', 'yes', 'much', 'more', 'way', 'too', 'many', 'go', 'bye', 'ha', 'haha', 'oh', 'please', 'never', 'super', 'big', 'long', 'far', 'bad', 'hey', 'wow', 'okay', 'ok', 'right', 'now']);
const MAYBE_GRAMMATICAL = new Set(['that', 'had', 'is', 'do', 'what']);

export const TAKE_DEFAULTS = { fillers: 'cut', stutters: 'cut', retakes: 'cut', edgeDb: 2, retakeMaxSec: 6, retakeMaxGapWords: 2, fillerSnapSec: 0.45 };

/** Voiced runs (above thr) in [t0, t1]; dips shorter than minGap do not split a run. */
function voiced(env, thr, t0, t1, minGap) {
  const out = []; let s = null, lastV = null;
  for (let t = Math.max(0, t0); t < t1; t += env.win) {
    const d = env.db[Math.floor(t / env.win)] ?? -120;
    if (d > thr) { if (s == null) s = t; else if (t - lastV > minGap) { out.push([s, lastV]); s = t; } lastV = t + env.win; }
  }
  if (s != null) out.push([s, lastV]);
  // a run touching the window edge may continue outside it: not isolated
  return out.filter(([x, y]) => x > Math.max(0, t0) + env.win && y < t1 - env.win);
}

/** Quietest 10 ms window between t0 and t1, and whether it is a real dip (<= limit for >= minMs around it). */
export function valley(env, t0, t1, limit, { minMs = 20 } = {}) {
  const i0 = Math.max(0, Math.floor(Math.min(t0, t1) / env.win)), i1 = Math.min(env.db.length - 1, Math.ceil(Math.max(t0, t1) / env.win));
  let best = i0;
  for (let i = i0; i <= i1; i++) if (env.db[i] < env.db[best]) best = i;
  // how long does the dip below the limit last around the minimum?
  let a = best, b = best;
  while (a > i0 && env.db[a - 1] <= limit) a--;
  while (b < i1 && env.db[b + 1] <= limit) b++;
  const clean = env.db[best] <= limit && (b - a + 1) * env.win * 1000 >= minMs;
  return { t: (best + 0.5) * env.win, db: +env.db[best].toFixed(1), clean, dipMs: Math.round((b - a + 1) * env.win * 1000) };
}

export function planContentCuts({ words, env, thr, style, retakes = [], fillerProbe = null, extraFillers = [], editorial = [] }) {
  const T = { ...TAKE_DEFAULTS, ...(style.edit.takes || {}) };
  const fillers = new Set(style.edit.markers?.fillers || ['um', 'uh', 'uhm', 'umm', 'uhh', 'er', 'erm', 'ah', 'hmm']);
  const limit = thr + T.edgeDb;
  const cuts = [], kept = [];
  const taken = new Set(); // word indices already inside a cut
  const ctx = (i, n) => words.slice(Math.max(0, i), Math.min(words.length, i + n)).map((w) => w.w).join(' ');
  // the removal of words[a..b] (inclusive): edges in the dips before a and after b
  const span = (a, b) => {
    const prev = words[a - 1], next = words[b + 1];
    const L = valley(env, prev ? prev.mid : words[a].t - 0.4, words[a].mid, limit);
    const R = valley(env, words[b].mid, next ? next.mid : words[b].end + 0.4, limit);
    return { L, R };
  };
  const tryCut = (kind, a, b, policy, why) => {
    for (let k = a; k <= b; k++) if (taken.has(k)) return;
    const text = ctx(a, b - a + 1);
    if (policy === 'off') return;
    const { L, R } = span(a, b);
    const where = `"...${ctx(a - 3, b - a + 7)}..."`;
    if (policy === 'mark' || !L.clean || !R.clean || R.t - L.t < 0.08) {
      const reason = policy === 'mark' ? 'policy: mark only' : !L.clean ? `no clean pause before it (quietest ${L.db} dBFS, ${L.dipMs} ms below ${limit.toFixed(0)})` : !R.clean ? `no clean pause after it (quietest ${R.db} dBFS, ${R.dipMs} ms below ${limit.toFixed(0)})` : 'too short to cut';
      kept.push({ kind, i0: a, i1: b, t: words[a].t, text, why: `${why}; kept: ${reason}`, context: where });
      return;
    }
    for (let k = a; k <= b; k++) taken.add(k);
    cuts.push({ kind, i0: a, i1: b, from: +L.t.toFixed(3), to: +R.t.toFixed(3), text, why, context: where, edgesDb: [L.db, R.db] });
  };

  // Editorial cuts first (Claude's content pass: production chatter, rejected clips, abandoned sentences, asides; see
  // pipeline/edit/transcript-view.mjs). The decision is deliberate, so an edge that finds no clean pause still cuts at
  // the quietest point between the words, and the cut is flagged so the join gets a listen.
  for (const e of editorial) {
    const a = Math.max(0, e.w0), b = Math.min(words.length - 1, e.w1);
    if (b < a || [...Array(b - a + 1).keys()].some((k) => taken.has(a + k))) continue;
    const { L, R } = span(a, b);
    for (let k = a; k <= b; k++) taken.add(k);
    const edgy = !L.clean || !R.clean;
    cuts.push({ kind: 'editorial', i0: a, i1: b, from: +L.t.toFixed(3), to: +R.t.toFixed(3), text: ctx(a, b - a + 1), why: e.why || 'editorial', context: `"...${ctx(a - 3, Math.min(b - a + 7, 30))}..."`, edgesDb: [L.db, R.db], ...(edgy ? { check: `edge in speech (${!L.clean ? `before: ${L.db} dBFS` : ''}${!L.clean && !R.clean ? ', ' : ''}${!R.clean ? `after: ${R.db} dBFS` : ''}): listen` } : {}) });
  }

  // False starts (they can contain fillers and stutters). Only a first attempt that adds NOTHING new is cut: the
  // repeated run is followed straight away by its repeat, or only by fillers / "sorry" / "I mean". Then cutting it
  // cannot lose content. When the first attempt carries its own words ("when you get rid of P. gingivalis, you get rid
  // of a lot of...", "we've done lab studies, we've done all these crazy studies") it is parallel phrasing or a list far
  // more often than a false start (both happened in the first real test), so it is only marked, and not even that when
  // a sentence ends inside it.
  const nn = (w) => norm(w.w).replace(/'/g, '');
  const restartGap = (gap) => gap.every((w) => fillers.has(nn(w)) || nn(w) === 'sorry') || gap.map(nn).join(' ') === 'i mean';
  for (const r of retakes) {
    const gap = words.slice(r.i + r.len, r.j);
    const secs = words[r.j].t - words[r.i].t;
    const finished = words.slice(r.i, r.j).some((w) => isSentenceEnd(w.w));
    const why = `said again ${secs.toFixed(1)} s later: "${ctx(r.j, r.len + 3)}"`;
    if (restartGap(gap) && secs <= T.retakeMaxSec && !isSentenceEnd(words[r.j - 1].w)) {
      tryCut('retake', r.i, r.j - 1, T.retakes, `${why}; ${gap.length ? `only "${gap.map((w) => w.w).join(' ')}" between the attempts` : 'the first attempt adds nothing new'}`);
    } else if (!finished && gap.length <= T.retakeMaxGapWords) {
      kept.push({ kind: 'retake', i0: r.i, i1: r.j - 1, t: words[r.i].t, text: ctx(r.i, r.j - r.i), why: `${why}; kept: the first attempt has its own words ("${gap.map((w) => w.w).join(' ')}"), so it may be deliberate`, context: `"...${ctx(r.i - 2, r.j - r.i + r.len + 4)}..."` });
    }
  }
  // two-word restarts said back to back ("it was, it was a mess"): the first pair adds nothing new
  for (let i = 0; i + 3 < words.length; i++) {
    const [a, b, c, d] = [nn(words[i]), nn(words[i + 1]), nn(words[i + 2]), nn(words[i + 3])];
    if (!a || !b || a !== c || b !== d || a === b) continue;
    if (EMPHASIS.has(a) && EMPHASIS.has(b)) continue;
    if (isSentenceEnd(words[i + 1].w) || words[i + 2].t - words[i].t > 2.5) continue;
    tryCut('retake', i, i + 1, T.retakes, `"${words[i].w} ${words[i + 1].w}" said twice in a row; the second stays`);
    i += 1;
  }
  // stutters: runs of the same word; all but the last occurrence go
  for (let i = 1; i < words.length; i++) {
    const n = norm(words[i].w);
    if (!n || n !== norm(words[i - 1].w)) continue;
    let a = i - 1; while (a > 0 && norm(words[a - 1].w) === n) a--;
    let b = i; while (b + 1 < words.length && norm(words[b + 1].w) === n) b++;
    i = b;
    if (EMPHASIS.has(n) || fillers.has(n)) continue;
    if (words[b].t - words[a].t > 2.5) continue;
    const count = b - a + 1;
    // a comma or full stop after an occurrence is a clause boundary ("attaches to it, it pokes"), not a stutter
    const boundary = words.slice(a, b).some((w) => /[,.;:!?]["')\]]*$/.test(w.w));
    const policy = boundary || (count === 2 && MAYBE_GRAMMATICAL.has(n)) ? 'mark' : T.stutters;
    tryCut('stutter', a, b - 1, policy, `"${n}" said ${count} times in a row${boundary ? ' with punctuation between (maybe two clauses)' : ''}; the last one stays`);
  }
  // Fillers: whisper's time for an "um" was off by 0.25-1.2 s in the first real test, so two of five cuts landed in the
  // silence next to it and the render still had the "um". So the cut snaps to the SOUND: the isolated voiced blob
  // (0.12-0.8 s, a silence >= 50 ms on both sides) whose centre is nearest whisper's estimate, within filterSnapSec.
  // No such blob (the "um" runs into its neighbours) -> left for a human.
  for (let i = 0; i < words.length; i++) {
    if (!fillers.has(norm(words[i].w).replace(/'/g, ''))) continue;
    if (taken.has(i)) continue;
    const w = words[i], label = `filler "${w.w.replace(/[.,!?]+$/, '')}"`, where = `"...${ctx(i - 3, 7)}..."`;
    if (T.fillers === 'off') continue;
    // tried and listened to (pipeline/edit/filler-probe.mjs): its verdict wins over any estimate
    const d = T.fillers === 'cut' && fillerProbe?.get(`w${i}`);
    if (d) {
      if (d.cut) { taken.add(i); cuts.push({ kind: 'filler', i0: i, i1: i, from: d.cut.from, to: d.cut.to, text: w.w, why: `${label}; ${d.why}`, context: where, edgesDb: [], probe: { baseline: d.baseline } }); }
      else kept.push({ kind: 'filler', i0: i, i1: i, t: w.t, text: w.w, why: `${label}; kept: ${d.why}`, context: where, probe: { baseline: d.baseline } });
      continue;
    }
    const blobs = voiced(env, thr, w.t - 0.6, w.end + 0.6, 0.05).filter(([x, y]) => y - x >= 0.12 && y - x <= 0.8);
    const c = w.mid;
    const best = blobs.map(([x, y]) => ({ x, y, d: Math.abs((x + y) / 2 - c) })).sort((p, q) => p.d - q.d)[0];
    if (T.fillers === 'mark' || !best || best.d > T.fillerSnapSec) {
      kept.push({ kind: 'filler', i0: i, i1: i, t: w.t, text: w.w, why: `${label}; kept: ${T.fillers === 'mark' ? 'policy: mark only' : !best ? 'no separate voiced blob near it (it runs into the next word)' : `nearest separate voiced blob is ${best.d.toFixed(2)} s from whisper's time`}`, context: where });
      continue;
    }
    // the blob must not be a neighbour's word: whisper places the neighbours on the other side of the filler
    const prev = words[i - 1], next = words[i + 1];
    if ((prev && best.y <= prev.t) || (next && best.x >= next.end)) {
      kept.push({ kind: 'filler', i0: i, i1: i, t: w.t, text: w.w, why: `${label}; kept: the nearest blob lies beyond a neighbouring word`, context: where });
      continue;
    }
    taken.add(i);
    cuts.push({ kind: 'filler', i0: i, i1: i, from: +(best.x - 0.02).toFixed(3), to: +(best.y + 0.02).toFixed(3), text: w.w, why: `${label}; snapped to the voiced blob ${best.x.toFixed(2)}-${best.y.toFixed(2)} s (${Math.round(best.d * 1000)} ms from whisper's time)`, context: where, edgesDb: [] });
  }
  // fillers only the prompted transcription pass heard (no word to attach them to), found by the probe
  for (const x of extraFillers) {
    const d = T.fillers === 'cut' && fillerProbe?.get(x.key);
    if (!d) continue;
    if (d.cut && !cuts.some((c) => c.from < d.cut.to && c.to > d.cut.from)) cuts.push({ kind: 'filler', i0: -1, i1: -1, from: d.cut.from, to: d.cut.to, text: x.w || 'um', why: `filler heard only by the prompted pass (near ${x.t.toFixed(2)} s); ${d.why}`, context: `"${d.baseline}"`, edgesDb: [], probe: { baseline: d.baseline } });
    else if (!d.cut) kept.push({ kind: 'filler', i0: -1, i1: -1, t: x.t, text: x.w || 'um', why: `filler heard only by the prompted pass; kept: ${d.why}`, context: `"${d.baseline}"` });
  }
  cuts.sort((x, y) => x.from - y.from);
  return { cuts, kept, policy: T };
}

/** Silence the cut ranges in a copy of the envelope and drop the removed words. */
export function applyContentCuts(env, words, cuts) {
  const db = Float32Array.from(env.db);
  for (const c of cuts) {
    for (let i = Math.max(0, Math.floor(c.from / env.win)); i < Math.min(db.length, Math.ceil(c.to / env.win)); i++) db[i] = -120;
  }
  const gone = new Set(); for (const c of cuts) for (let k = c.i0; k <= c.i1; k++) gone.add(k);
  const kept = words.filter((w, k) => !gone.has(k)).map((w, i) => ({ ...w, i }));
  return { env: { ...env, db }, words: kept };
}
