#!/usr/bin/env node
/* What did the human change? Compare our rough cut with the timeline Ben (or an editor) exported after polishing.
 *
 *   node pipeline/style/diff.mjs --ours videos/<slug>/out/timeline-spec.json --theirs <export.fcpxml | export.edl | verify.json>
 *        [--fps 30] [--words videos/<slug>/raw/transcript.words.json] [--out videos/<slug>/out/style-diff.json]
 *
 * --ours     our timeline-spec.json (or joins.json next to it)
 * --theirs   Resolve export: File > Export > Timeline... > FCPXML 1.10 (best: carries zoom), or an EDL (CMX 3600, cuts only),
 *            or the JSON that pipeline/resolve/verify-timeline.py returns through the Resolve MCP.
 * Only A-roll from the same raw file is compared (matched by file name); overlays/music are ignored.
 *
 * Reports, in RAW-file seconds:
 *   removed by them   material we kept that they cut: at one of our joins = "pause tightened", inside a segment = a new cut
 *                     (retake/filler/tangent), with the words it contained and whether one of our markers pointed at it
 *   restored by them  material we cut that they put back: "pause loosened" or "cut undone"
 *   per-join pauses   our kept pause vs theirs at each of our cuts, median change split by sentence/in-sentence joins
 *   punch-ins         zoom sampled every 0.25 s of source: added / removed / rescaled, their typical zoom
 * and a suggested style patch (edit.pause.*, edit.punchIn.scale) for styles/<name>/style.json. It suggests, it never writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';
import { parseXml, findAll, timeToSeconds, parseFps, parseTimecode, secToFrames } from '../resolve/fcpxml.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
if (!args.ours || !args.theirs) { console.error('usage: --ours <timeline-spec.json> --theirs <fcpxml|edl|json> [--words words.json] [--fps N] [--out diff.json]'); process.exit(1); }
const r3 = (x) => +x.toFixed(3);
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

// ---------------------------------------------------------------- ours ------------------------------------------------
let oursPath = path.resolve(ROOT, args.ours);
if (/joins\.json$/.test(oursPath)) oursPath = path.join(path.dirname(oursPath), 'timeline-spec.json');
const spec = JSON.parse(fs.readFileSync(oursPath, 'utf8'));
const joinsPath = path.join(path.dirname(oursPath), 'joins.json');
const joinsDoc = fs.existsSync(joinsPath) ? JSON.parse(fs.readFileSync(joinsPath, 'utf8')) : null;
const fps = parseFps(args.fps || spec.fps || 30);
const rawPath = spec.media[spec.aroll[0].media].path;
const rawBase = path.basename(rawPath).toLowerCase();
const ours = spec.aroll.map((s) => ({ a: s.inFrame != null ? s.inFrame * fps.den / fps.num : s.in, b: s.outFrame != null ? s.outFrame * fps.den / fps.num : s.out, scale: s.scale || 1 }));
const wordsPath = args.words ? path.resolve(ROOT, args.words) : [path.join(path.dirname(rawPath), 'transcript.words.json')].find((p) => fs.existsSync(p));
const words = wordsPath && fs.existsSync(wordsPath) ? JSON.parse(fs.readFileSync(wordsPath, 'utf8')) : [];
const markers = spec.markers || [];

// ---------------------------------------------------------------- theirs ----------------------------------------------
function fromFcpxml(file) {
  const root = parseXml(fs.readFileSync(file, 'utf8'));
  const assets = new Map(); const formats = new Map();
  for (const f of findAll(root, 'format')) formats.set(f.attrs.id, f);
  for (const a of findAll(root, 'asset')) {
    const rep = a.children.find((c) => c.name === 'media-rep');
    const src = decodeURIComponent((rep?.attrs.src || a.attrs.src || '').replace(/^file:\/\/\/?/, ''));
    assets.set(a.attrs.id, { src, name: a.attrs.name || '', start: timeToSeconds(a.attrs.start || '0s') });
  }
  const isRaw = (id) => { const a = assets.get(id); return a && (path.basename(a.src).toLowerCase() === rawBase || `${a.name}`.toLowerCase() === rawBase.replace(/\.[^.]+$/, '')); };
  const seq = findAll(root, 'sequence')[0]; if (!seq) throw new Error('no <sequence> in the FCPXML');
  const fd = formats.get(seq.attrs.format)?.attrs.frameDuration;
  const spine = seq.children.find((c) => c.name === 'spine');
  const out = []; let other = 0;
  const scaleOf = (el) => { const t = el.children.find((c) => c.name === 'adjust-transform'); return t?.attrs.scale ? +t.attrs.scale.split(/\s+/)[0] : 1; };
  for (const el of spine.children.filter((c) => c.name)) {
    const dur = timeToSeconds(el.attrs.duration || '0s');
    let ref = el.attrs.ref, srcStart = timeToSeconds(el.attrs.start || '0s'), scale = scaleOf(el);
    if (el.name === 'clip') { // <clip><video ref offset start/></clip>: map the clip's local start into the media
      const inner = el.children.find((c) => (c.name === 'video' || c.name === 'asset-clip') && c.attrs.ref && isRaw(c.attrs.ref));
      if (inner) { ref = inner.attrs.ref; srcStart = timeToSeconds(inner.attrs.start || '0s') + (timeToSeconds(el.attrs.start || '0s') - timeToSeconds(inner.attrs.offset || '0s')); scale = scale !== 1 ? scale : scaleOf(inner); }
    }
    if (el.name === 'gap' || !ref || !isRaw(ref)) { if (el.name !== 'gap') other++; continue; }
    const a = srcStart - assets.get(ref).start;
    out.push({ a, b: a + dur, scale });
  }
  return { ranges: out, note: `FCPXML (${fd || '?'} frames), ${out.length} A-roll clips from ${rawBase}, ${other} other spine clips ignored` };
}
function fromEdl(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const ev = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\d{3,})\s+(\S+)\s+(\S+)\s+(C|D\s*\d*|W\d+\s*\d*)\s+(\d\d:\d\d:\d\d[:;]\d\d)\s+(\d\d:\d\d:\d\d[:;]\d\d)\s+(\d\d:\d\d:\d\d[:;]\d\d)\s+(\d\d:\d\d:\d\d[:;]\d\d)/.exec(lines[i]);
    if (!m || !/^V/.test(m[3])) continue;
    let clip = null; for (let k = i + 1; k < Math.min(lines.length, i + 4); k++) { const c = /FROM CLIP NAME:\s*(.+)$/i.exec(lines[k]); if (c) clip = c[1].trim(); }
    if (clip && clip.toLowerCase() !== rawBase && !rawBase.startsWith(clip.toLowerCase().replace(/\.[^.]+$/, ''))) continue;
    const sIn = parseTimecode(m[5], fps), sOut = parseTimecode(m[6], fps);
    ev.push({ a: sIn * fps.den / fps.num, b: sOut * fps.den / fps.num, scale: 1 });
  }
  return { ranges: ev, note: `EDL, ${ev.length} video events (EDLs carry no zoom; punch-in comparison skipped)`, noScale: true };
}
function fromVerifyJson(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const v1 = j.tracks?.video?.[0]?.items || [];
  const out = v1.filter((it) => !it.file || path.basename(String(it.file)).toLowerCase() === rawBase)
    .map((it) => { const a = (it.sourceStart ?? it.leftOffset ?? 0) * fps.den / fps.num; return { a, b: a + (it.end - it.start) * fps.den / fps.num, scale: it.ZoomX || 1 }; });
  return { ranges: out, note: `verify-timeline JSON from Resolve (${j.timeline}), ${out.length} V1 items` };
}
const theirsPath = path.resolve(ROOT, args.theirs);
const ext = path.extname(theirsPath).toLowerCase();
const theirs = ext === '.edl' ? fromEdl(theirsPath) : ext === '.json' ? fromVerifyJson(theirsPath) : fromFcpxml(theirsPath);
if (!theirs.ranges.length) { console.error(`[diff] no A-roll from ${rawBase} found in ${args.theirs}`); process.exit(1); }

// ---------------------------------------------------------------- interval maths --------------------------------------
const union = (rs) => { const s = rs.map((r) => [r.a, r.b]).sort((x, y) => x[0] - y[0]); const o = []; for (const [a, b] of s) { const l = o[o.length - 1]; if (l && a <= l[1] + 1e-6) l[1] = Math.max(l[1], b); else o.push([a, b]); } return o; };
const minus = (A, B) => { const out = []; for (const [a, b] of A) { let segs = [[a, b]]; for (const [c, d] of B) segs = segs.flatMap(([x, y]) => (d <= x || c >= y ? [[x, y]] : [[x, Math.max(x, c)], [Math.min(y, d), y]].filter(([p, q]) => q - p > 1e-6))); out.push(...segs); } return out; };
const covered = (U, a, b) => U.reduce((s, [c, d]) => s + Math.max(0, Math.min(b, d) - Math.max(a, c)), 0);
const wordsIn = (a, b) => words.filter((w) => (w.t + w.end) / 2 >= a && (w.t + w.end) / 2 <= b).map((w) => w.w).join(' ');
const O = union(ours), T = union(theirs.ranges);
const minLen = 1 / (fps.num / fps.den) * 2; // ignore sub-2-frame slivers
const ourCuts = []; for (let i = 1; i < O.length; i++) ourCuts.push([O[i - 1][1], O[i][0]]);
const nearOurCut = (a, b) => ourCuts.find(([c, d]) => Math.abs(a - d) < 0.05 || Math.abs(b - c) < 0.05 || (a < d && b > c));

const removed = minus(O, T).filter(([a, b]) => b - a >= minLen).map(([a, b]) => {
  const j = nearOurCut(a, b); const mk = markers.find((m) => m.rawT != null && m.rawT >= a - 0.3 && m.rawT <= b + 0.3);
  const w = wordsIn(a, b);
  const kind = mk ? 'acted on our marker' : j && !w ? 'pause tightened at our join' : j ? 'trimmed into words at our join' : w ? 'new cut inside our segment' : 'silence trimmed inside our segment';
  return { from: r3(a), to: r3(b), seconds: r3(b - a), kind, words: w, marker: mk ? mk.name : null };
});
const restored = minus(T, O).filter(([a, b]) => b - a >= minLen).map(([a, b]) => {
  const cut = ourCuts.find(([c, d]) => a <= c + 0.05 && b >= d - 0.05);
  return { from: r3(a), to: r3(b), seconds: r3(b - a), kind: cut ? 'cut undone (whole removed range restored)' : ourCuts.some(([c, d]) => a < d && b > c) ? 'pause loosened at our join' : 'material outside our cut (head/tail)', words: wordsIn(a, b) };
});

// per-join pauses (needs joins.json for the silence around each cut)
const joinRows = [];
for (const j of (joinsDoc?.joins || []).filter((x) => x.kind === 'cut' && x.silence)) {
  const { from: s, to: e } = j.silence;
  const oursKept = covered(O, s, e), theirsKept = covered(T, s, e);
  const theirsGone = covered(T, j.outgoing.srcIn, j.incoming.srcIn + 0.001) < 0.05; // they dropped the whole neighbourhood
  joinRows.push({ id: j.id, rawAt: r3(s), sentence: !!j.sentenceBoundary, oursKept: r3(oursKept), theirsKept: r3(theirsKept), delta: r3(theirsKept - oursKept), undone: theirsKept >= (e - s) - 0.05, theirsDropped: theirsGone });
}
const live = joinRows.filter((r) => !r.theirsDropped && !r.undone);
// a pause change only becomes a style suggestion when >= 3 joins of that kind exist and >= 30% of them moved the same way
const frame = fps.den / fps.num;
const pauseChange = (rows) => {
  const changed = rows.filter((r) => Math.abs(r.delta) >= 1.5 * frame);
  const up = changed.filter((r) => r.delta > 0), down = changed.filter((r) => r.delta < 0);
  const major = up.length >= down.length ? up : down;
  return { joins: rows.length, changed: changed.length, tightened: down.length, loosened: up.length, median: median(rows.map((r) => r.delta)),
    suggest: rows.length >= 3 && major.length / rows.length >= 0.3 ? median(major.map((r) => r.delta)) : null };
};
const pcS = pauseChange(live.filter((r) => r.sentence)), pcI = pauseChange(live.filter((r) => !r.sentence));
const dS = pcS.suggest, dI = pcI.suggest;

// punch-ins sampled over source time both kept
let added = 0, removedZ = 0, changed = 0, same = 0; const theirScales = [];
if (!theirs.noScale) {
  const scaleAt = (rs, t) => { const r = rs.find((x) => t >= x.a && t < x.b); return r ? r.scale : null; };
  const lo = Math.min(O[0][0], T[0][0]), hi = Math.max(O.at(-1)[1], T.at(-1)[1]);
  for (let t = lo; t < hi; t += 0.25) {
    const so = scaleAt(ours, t), st = scaleAt(theirs.ranges, t); if (so == null || st == null) continue;
    if (st > 1.001) theirScales.push(st);
    if (so <= 1.001 && st > 1.001) added++; else if (so > 1.001 && st <= 1.001) removedZ++; else if (Math.abs(so - st) > 0.005) changed++; else same++;
  }
}
const oursLen = O.reduce((s, [a, b]) => s + b - a, 0), theirsLen = T.reduce((s, [a, b]) => s + b - a, 0);
const style = joinsDoc?.pause || {};
const suggestion = {};
if (dS != null && Math.abs(dS) >= 0.03 && style.keepBetweenSentences != null) suggestion['edit.pause.keepBetweenSentences'] = r3(Math.max(0.05, style.keepBetweenSentences + dS));
if (dI != null && Math.abs(dI) >= 0.03 && style.keepInSentence != null) suggestion['edit.pause.keepInSentence'] = r3(Math.max(0.05, style.keepInSentence + dI));
if (theirScales.length) suggestion['edit.punchIn.scale'] = r3(median(theirScales));
if (!theirs.noScale && added + removedZ + changed + same > 0) suggestion['share of source time they zoomed'] = r3(theirScales.length / (added + removedZ + changed + same));

const report = {
  ours: path.relative(ROOT, oursPath).split(path.sep).join('/'), theirs: path.relative(ROOT, theirsPath).split(path.sep).join('/'), theirsNote: theirs.note, raw: rawBase,
  duration: { ours: r3(oursLen), theirs: r3(theirsLen), change: r3(theirsLen - oursLen) },
  segments: { ours: O.length, theirs: T.length },
  removedByThem: removed, restoredByThem: restored,
  joins: { compared: live.length, undone: joinRows.filter((r) => r.undone).length, droppedWithNeighbourhood: joinRows.filter((r) => r.theirsDropped).length, betweenSentences: pcS, inSentence: pcI, rows: joinRows },
  punchIns: theirs.noScale ? 'not in EDL' : { samplesAt: '0.25 s of source', added, removed: removedZ, rescaled: changed, unchanged: same, theirMedianScale: median(theirScales) },
  markersActedOn: removed.filter((r) => r.marker).map((r) => r.marker),
  suggestedStylePatch: suggestion,
};
if (args.out) fs.writeFileSync(path.resolve(ROOT, args.out), JSON.stringify(report, null, 2));

const sum = (arr, k) => arr.filter((r) => r.kind.startsWith(k)).reduce((s, r) => s + r.seconds, 0).toFixed(2);
console.log(`[diff] ${theirs.note}`);
console.log(`[diff] length ours ${oursLen.toFixed(2)} s -> theirs ${theirsLen.toFixed(2)} s (${(theirsLen - oursLen).toFixed(2)} s); segments ${O.length} -> ${T.length}`);
console.log(`[diff] they removed ${removed.length} ranges: pauses tightened at our joins ${sum(removed, 'pause tightened')} s, acted on our markers ${sum(removed, 'acted on')} s, new cuts inside segments ${sum(removed, 'new cut')} s, trimmed into words at joins ${sum(removed, 'trimmed into')} s`);
for (const r of removed.filter((x) => x.words)) console.log(`         - ${r.from}-${r.to}s (${r.seconds}s) ${r.kind}: "${r.words.slice(0, 90)}"${r.marker ? `  <- our marker ${r.marker}` : ''}`);
console.log(`[diff] they restored ${restored.length} ranges (${restored.reduce((s, r) => s + r.seconds, 0).toFixed(2)} s): ${restored.map((r) => `${r.from}-${r.to} ${r.kind}`).slice(0, 6).join('; ')}`);
const pcTxt = (p) => `${p.joins} joins, ${p.tightened} tightened / ${p.loosened} loosened, median change ${p.median ?? 'n/a'} s`;
console.log(`[diff] pauses at our cuts (${joinRows.filter((r) => r.undone).length} cut(s) undone, not counted): between sentences ${pcTxt(pcS)}; inside sentences ${pcTxt(pcI)}`);
if (!theirs.noScale) console.log(`[diff] punch-ins (0.25 s samples): added ${added}, removed ${removedZ}, rescaled ${changed}, unchanged ${same}; their median zoom ${median(theirScales) ?? 'none'}`);
console.log(`[diff] suggested style patch: ${JSON.stringify(suggestion)}${args.out ? `  (full report: ${args.out})` : ''}`);
void secToFrames;
