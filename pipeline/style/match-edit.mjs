#!/usr/bin/env node
/* Reverse-engineer a human edit: align a PUBLISHED video's transcript to the RAW recording it was cut from and
 * reconstruct what the editor kept and removed. Then (optionally) score our own rough cut of the same raw against it.
 *
 *   node pipeline/style/match-edit.mjs --published <words.json> --raw <words.json> [--raw-media <camera.mp4>]
 *        [--ours <videos/x/out/timeline-spec.json>] [--out <dir>]
 *
 * Only the host's own speech aligns (the camera mic does not hear reacted-to clips), matched by text with
 * pipeline/edit/words-merge.mjs alignWords. Inside a kept stretch, raw time - published time is constant; where it
 * jumps forward, the editor cut. Segment edges are at whisper precision (~0.1 s) unless refined with audio later.
 *
 * Writes <out>/edit-match.json and prints:
 *   segments   kept raw ranges in published order (published start, raw start, length)
 *   removed    each raw range between kept segments, classified by the raw words inside it: dead air (no words),
 *              fillers only, a repeat of what follows (retake), or content (sentences the editor dropped)
 *   pauses     the silence the editor left at each cut (published word gap across the cut) and inside segments
 *   reorder    kept segments whose raw time goes backwards (the editor moved material)
 *   ours       with --ours: how much raw time both kept, only they kept, only we kept; our cuts vs theirs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';
import { alignWords, normWord, FILLER_RE } from '../edit/words-merge.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
if (!args.published || !args.raw) { console.error('usage: --published <words.json> --raw <words.json> [--ours <timeline-spec.json>] [--out <dir>]'); process.exit(2); }
const load = (p) => JSON.parse(fs.readFileSync(path.resolve(ROOT, p), 'utf8')).map((w) => ({ t: +w.t, end: +(w.end ?? w.t), w: String(w.w) }));
const P = load(args.published), R = load(args.raw);
const out = path.resolve(ROOT, args.out || path.dirname(path.resolve(ROOT, args.raw)));
const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(3); };

// 1. word pairs, then segments of constant offset (raw - published)
const pairs = alignWords(P, R).map(([i, j]) => ({ i, j, d: R[j].t - P[i].t }));
const segs = [];
for (const p of pairs) {
  const cur = segs.at(-1);
  const med = cur ? cur.ds[Math.floor(cur.ds.length / 2)] : null;
  // a new segment when the offset jumps by more than 0.35 s (whisper jitter is ~0.1-0.2 s) or raw goes backwards
  if (!cur || Math.abs(p.d - med) > 0.35) segs.push({ pairs: [p], ds: [p.d] });
  else { cur.pairs.push(p); cur.ds.push(p.d); cur.ds.sort((x, y) => x - y); }
}
// merge single-word flukes (a lone pair whose offset matches neither neighbour is a mis-alignment, not a segment)
const clean = segs.filter((s, k) => s.pairs.length >= 2 || (k > 0 && k < segs.length - 1 && false));
const S = clean.map((s) => {
  const d = s.ds[Math.floor(s.ds.length / 2)];
  const a = s.pairs[0], b = s.pairs.at(-1);
  return { pubStart: +P[a.i].t.toFixed(3), pubEnd: +P[b.i].end.toFixed(3), rawStart: +R[a.j].t.toFixed(3), rawEnd: +R[b.j].end.toFixed(3), offset: +d.toFixed(3), words: s.pairs.length, i0: a.i, i1: b.i, j0: a.j, j1: b.j };
});
// 2. what was removed between consecutive kept segments (raw words strictly between them)
const EMPH = new Set(['really', 'very', 'so', 'no', 'yeah', 'much']);
const removed = [], reorder = [];
for (let k = 1; k < S.length; k++) {
  const A = S[k - 1], B = S[k];
  if (B.j0 <= A.j1) { reorder.push({ at: B.pubStart, rawFrom: A.rawEnd, rawTo: B.rawStart }); continue; }
  const inside = R.slice(A.j1 + 1, B.j0);
  const n = inside.map((w) => normWord(w.w)).filter(Boolean);
  const next = R.slice(B.j0, B.j0 + Math.max(3, n.length)).map((w) => normWord(w.w));
  const rawFrom = +(R[A.j1].end).toFixed(3), rawTo = +(R[B.j0].t).toFixed(3);
  const text = inside.map((w) => w.w).join(' ').toLowerCase();
  const spoken = inside.filter((w) => !/^\[.*\]$/.test(w.w)).length;
  let kind;
  if (!n.length || !spoken) kind = /blank_audio|music/.test(text) && rawTo - rawFrom > 2 ? 'silence (clip playing or dead air)' : 'dead air';
  else if (n.length <= 2 && rawTo - rawFrom <= 0.35) kind = 'alignment noise';
  else if (/\b(one,? two,? (three,? )?(ready,? )?go|ready,? go|next one|start with this one|let'?s do (this|that|it|one|two|three|four|five)\b|that'?s (only )?(three|four|five|six|seven|eight)|one,? two,? three,? four)/.test(text)) kind = 'production chatter (countdowns, next clip, counting)';
  else if (n.every((w) => FILLER_RE.test(w))) kind = 'fillers';
  else if (n.length <= 12 && n.slice(0, Math.min(3, n.length)).every((w, x) => w === next[x])) kind = 'retake (said again right after)';
  else if (n.length <= 2 && n.every((w, x) => w === next[x] || EMPH.has(w))) kind = 'stutter';
  else kind = n.length <= 8 ? 'short phrase' : 'content';
  removed.push({ at: +B.pubStart.toFixed(2), rawFrom, rawTo, seconds: +(rawTo - rawFrom).toFixed(2), kind, words: inside.map((w) => w.w).join(' '),
    keptPause: +(P[B.i0].t - P[A.i1].end).toFixed(3) });
}
// 3. pauses: at cuts (from the published transcript) vs inside kept segments
const inPause = [];
for (const s of S) for (let i = s.i0 + 1; i <= s.i1; i++) { const g = P[i].t - P[i - 1].end; if (g > 0.05) inPause.push(g); }
const cutPause = removed.map((r) => r.keptPause).filter((g) => g > -0.05);
const byKind = {}; for (const r of removed) { byKind[r.kind] ??= { count: 0, seconds: 0 }; byKind[r.kind].count++; byKind[r.kind].seconds = +(byKind[r.kind].seconds + r.seconds).toFixed(2); }
const rawSpan = R.at(-1).end - R[0].t, keptRaw = S.reduce((s, x) => s + (x.rawEnd - x.rawStart), 0);
const rawFillers = R.filter((w) => FILLER_RE.test(normWord(w.w))).length, pubFillers = P.filter((w) => FILLER_RE.test(normWord(w.w))).length;
const report = {
  published: args.published, raw: args.raw,
  words: { published: P.length, raw: R.length, aligned: pairs.length, publishedNotFromRaw: P.length - pairs.length },
  segments: S.length, cuts: removed.length, reorders: reorder.length,
  rawSeconds: +rawSpan.toFixed(1), keptRawSeconds: +keptRaw.toFixed(1), keptShare: +(keptRaw / rawSpan).toFixed(3),
  removedByKind: byKind,
  pauses: { atCuts: { median: q(cutPause, 0.5), p25: q(cutPause, 0.25), p75: q(cutPause, 0.75), n: cutPause.length }, insideSegments: { median: q(inPause, 0.5), p90: q(inPause, 0.9), n: inPause.length } },
  fillers: { raw: rawFillers, published: pubFillers },
  segmentsList: S, removedList: removed, reorderList: reorder,
  note: 'text alignment of whisper transcripts: cut edges +-0.1-0.2 s; reacted-to clip audio does not align (camera mic) and counts as publishedNotFromRaw',
};
// 4. our rough cut of the same raw, if given
if (args.ours) {
  const spec = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.ours), 'utf8'));
  const ours = spec.aroll.map((s) => [+s.in, +s.out]);
  const theirs = S.map((s) => [s.rawStart, s.rawEnd]);
  const union = (iv) => { const s = [...iv].sort((a, b) => a[0] - b[0]); const o = []; for (const [a, b] of s) { if (o.length && a <= o.at(-1)[1]) o.at(-1)[1] = Math.max(o.at(-1)[1], b); else o.push([a, b]); } return o; };
  const len = (iv) => iv.reduce((s, [a, b]) => s + b - a, 0);
  const inter = (x, y) => { const o = []; for (const [a, b] of x) for (const [c, d] of y) { const lo = Math.max(a, c), hi = Math.min(b, d); if (hi > lo) o.push([lo, hi]); } return o; };
  const O = union(ours), T = union(theirs), both = len(inter(O, T));
  report.ours = { spec: args.ours, oursSeconds: +len(O).toFixed(1), theirsSeconds: +len(T).toFixed(1), bothKept: +both.toFixed(1), onlyTheyKept: +(len(T) - both).toFixed(1), onlyWeKept: +(len(O) - both).toFixed(1),
    agreement: +(both / Math.max(len(O), len(T))).toFixed(3) };
}
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'edit-match.json'), JSON.stringify(report, null, 2));
console.log(`[match] ${report.words.aligned}/${report.words.published} published words found in the raw (${report.words.publishedNotFromRaw} not from the raw: reacted-to clips, VO or mis-hearings)`);
console.log(`[match] ${S.length} kept segments, ${removed.length} cuts, ${reorder.length} reorders; kept ${report.keptRawSeconds} of ${report.rawSeconds} raw seconds (${Math.round(report.keptShare * 100)}%)`);
console.log(`[match] removed: ${Object.entries(byKind).map(([k, v]) => `${k} ${v.count}x ${v.seconds}s`).join('; ')}`);
console.log(`[match] pause left at cuts: median ${report.pauses.atCuts.median}s (p25 ${report.pauses.atCuts.p25}, p75 ${report.pauses.atCuts.p75}); inside segments median ${report.pauses.insideSegments.median}s p90 ${report.pauses.insideSegments.p90}s`);
console.log(`[match] fillers: raw ${rawFillers}, published ${pubFillers}`);
if (report.ours) console.log(`[match] ours vs theirs (raw seconds kept): both ${report.ours.bothKept}, only theirs ${report.ours.onlyTheyKept}, only ours ${report.ours.onlyWeKept}; agreement ${report.ours.agreement}`);
console.log(`[match] wrote ${path.relative(ROOT, path.join(out, 'edit-match.json'))}`);
