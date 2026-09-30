#!/usr/bin/env node
/* Compare what Resolve actually built (resolve-verify.json from the MCP verify script) with the rough cut we planned
 * (timeline-spec.json), item by item and frame by frame. Prints one PASS/FAIL line per feature; exit code 1 on any FAIL.
 *
 *   node pipeline/resolve/check-import.mjs --spec videos/<slug>/out/timeline-spec.json [--verify <resolve-verify.json>]
 *
 * Checks: timeline start/length/fps; every A-roll clip on V1 and A1 (record frames, source frames, zoom, position);
 * the dialogue stays on A1 (Resolve's FCPXML import scatters it when an audio lane holds 2+ clips); every overlay and
 * music clip (frames, track, clip volume); every marker resolve-markers.py should have added (frame, color, name).
 * Writes resolve-check.json next to the verify file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './media.mjs';
import { resolveTimeline, timecode } from './fcpxml.mjs';
import { markerRows } from './mcp-scripts.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.spec) { console.error('usage: check-import.mjs --spec <timeline-spec.json> [--verify <resolve-verify.json>]'); process.exit(2); }
const specPath = path.resolve(args.spec);
const verifyPath = path.resolve(args.verify || path.join(path.dirname(specPath), 'resolve-verify.json'));
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const v = JSON.parse(fs.readFileSync(verifyPath, 'utf8'));
const tl = resolveTimeline(spec, { baseDir: path.dirname(specPath) });
const T0 = tl.tcStartFrames;
const tc = (f) => timecode(f - T0, tl.fps, T0);
const norm = (p) => (p ? path.resolve(p).toLowerCase() : '');
const fileOf = (id) => norm(tl.media[id].path);
const tracks = (kind) => v.tracks?.[kind] || [];
const results = [];
const check = (name, ok, detail, problems = []) => { results.push({ name, ok, detail, problems }); };
const near = (a, b, eps) => a != null && Math.abs(a - b) <= eps;

// timeline
const fps = Number(v.fps), wantFps = tl.fps.num / tl.fps.den;
check('timeline', v.startFrame === T0 && v.endFrame === T0 + tl.durationFrames && Math.abs(fps - wantFps) < 0.01,
  `${v.timeline}: ${tc(v.startFrame)}-${tc(v.endFrame)} at ${v.fps} fps (planned ${tc(T0)}-${tc(T0 + tl.durationFrames)} at ${+wantFps.toFixed(3)})`);

// A-roll, video and audio. Resolve's source frames may count from the file's embedded timecode, so only a constant
// offset between its sourceStart and our srcIn is allowed.
for (const [kind, label] of [['video', 'V1'], ['audio', 'A1']]) {
  const items = tracks(kind)[0]?.items || [];
  const probs = [];
  if (items.length !== tl.aroll.length) probs.push(`${items.length} clips, planned ${tl.aroll.length}`);
  const offsets = new Set();
  tl.aroll.forEach((s, i) => {
    const it = items[i]; if (!it) return;
    if (it.start !== T0 + s.recIn || it.end !== T0 + s.recOut) probs.push(`clip ${i + 1} at ${tc(it.start)}-${tc(it.end)}, planned ${tc(T0 + s.recIn)}-${tc(T0 + s.recOut)}`);
    if (it.sourceStart != null) offsets.add(it.sourceStart - s.srcIn);
    if (norm(it.file) !== fileOf(s.media)) probs.push(`clip ${i + 1} plays ${it.file}`);
    if (kind === 'video') {
      if (!near(it.ZoomX ?? 1, s.scale, 0.001) || !near(it.ZoomY ?? 1, s.scale, 0.001)) probs.push(`clip ${i + 1} zoom ${it.ZoomX}/${it.ZoomY}, planned ${s.scale}`);
      if (!near(it.Pan ?? 0, s.position[0], 0.5) || !near(it.Tilt ?? 0, s.position[1], 0.5)) probs.push(`clip ${i + 1} position ${it.Pan}/${it.Tilt}, planned ${s.position.join('/')}`);
    }
  });
  if (offsets.size > 1) probs.push(`source frames drift from the plan (offsets ${[...offsets].slice(0, 5).join(', ')})`);
  const zoomed = tl.aroll.filter((s) => s.scale !== 1).length;
  check(`A-roll ${label}`, !probs.length, `${Math.min(items.length, tl.aroll.length)}/${tl.aroll.length} clips on the planned frames${kind === 'video' ? `, ${zoomed} punch-ins with zoom and position` : ''}${offsets.size === 1 && [...offsets][0] ? ` (source frames offset by ${[...offsets][0]})` : ''}`, probs);
}

// audio crossfades on every dialogue seam (resolve-finish.py): one centred "Cross Fade 0 dB" of --xfade frames each
if (tracks('audio')[0] && tracks('audio')[0].transitions) {
  const xf = Number(args.xfade || 2);
  const fades = tracks('audio')[0].transitions;
  const seams = tl.aroll.slice(1).map((s) => T0 + s.recIn);
  const probs = [];
  for (const s of seams) {
    const on = fades.filter((f) => Math.round((f.start + f.end) / 2) === s);
    if (on.length !== 1) probs.push(`${tc(s)}: ${on.length} crossfades`);
    else if (on[0].duration !== xf || on[0].name !== 'Cross Fade 0 dB') probs.push(`${tc(s)}: ${on[0].name} ${on[0].duration} frames`);
  }
  const stray = fades.filter((f) => !seams.includes(Math.round((f.start + f.end) / 2)));
  if (stray.length) probs.push(`${stray.length} transitions not on a planned seam (first at ${tc(stray[0].start)})`);
  check('audio crossfades', !probs.length, `${seams.length - probs.filter((p) => / crossfades$| frames$/.test(p)).length}/${seams.length} dialogue seams with one centred ${xf}-frame Cross Fade 0 dB`, probs.length && !fades.length ? ['none yet: run resolve-finish.py'] : probs);
}

// dialogue must not leak onto the music tracks
const raws = new Set(tl.aroll.map((s) => fileOf(s.media)));
const leaked = tracks('audio').slice(1).flatMap((t) => (t.items || []).filter((it) => raws.has(norm(it.file))).map(() => `A${t.track}`));
check('dialogue stays on A1', !leaked.length, leaked.length ? `${leaked.length} A-roll audio clips on ${[...new Set(leaked)].join(', ')}` : 'no A-roll audio on any other track', leaked.length ? ['audio lanes with 2+ clips make Resolve scatter the dialogue; the FCPXML validator should have refused this'] : []);

// overlays and music: find each planned clip by file and record frames
const findItem = (kind, fromTrack, c) => {
  for (const t of tracks(kind).slice(fromTrack - 1)) for (const it of t.items || []) {
    if (norm(it.file) === fileOf(c.media) && it.start === T0 + c.recIn && it.end === T0 + c.recOut) return { t, it };
  }
  return null;
};
const ov = tl.overlays.map((c) => ({ c, hit: findItem('video', 2, c) }));
check('overlays', ov.every((o) => o.hit), `${ov.filter((o) => o.hit).length}/${ov.length} on the planned frames (${ov.filter((o) => o.hit).map((o) => `${o.c.name} V${o.hit.t.track}`).join(', ') || 'none'})`,
  ov.filter((o) => !o.hit).map((o) => `${o.c.name} ${tc(T0 + o.c.recIn)}-${tc(T0 + o.c.recOut)} not found`));
const mu = tl.music.map((c) => ({ c, hit: findItem('audio', 2, c) }));
const muProbs = [];
for (const m of mu) {
  if (!m.hit) { muProbs.push(`${m.c.name} ${tc(T0 + m.c.recIn)}-${tc(T0 + m.c.recOut)} not found`); continue; }
  if (m.hit.it.AudioVolume != null && !near(m.hit.it.AudioVolume, m.c.gainDb, 0.05)) muProbs.push(`${m.c.name} at ${m.hit.it.AudioVolume} dB, planned ${m.c.gainDb}`);
  if ((m.hit.t.items || []).length !== 1) muProbs.push(`A${m.hit.t.track} holds ${(m.hit.t.items || []).length} clips`);
}
check('music', !muProbs.length, `${mu.filter((m) => m.hit).length}/${mu.length} on their own tracks (${mu.filter((m) => m.hit).map((m) => `${m.c.name} A${m.hit.t.track} ${m.hit.it.AudioVolume ?? '?'} dB`).join(', ') || 'none'})`, muProbs);

// markers (clip markers added by resolve-markers.py, matched by their customData id)
const want = markerRows(tl.markers);
const have = new Map((v.clipMarkers || []).filter((m) => /^yt-suite:/.test(m.customData || '')).map((m) => [m.customData.slice(9), m]));
const mkProbs = []; let nudged = 0;
for (const [rec, color, name, , , id] of want) {
  const m = have.get(id);
  if (!m) { mkProbs.push(`${id} "${name}" at ${tc(T0 + rec)} missing`); continue; }
  if (m.hidden) mkProbs.push(`${id} sits on a hidden handle`);
  if (m.frame !== T0 + rec) { if (Math.abs(m.frame - (T0 + rec)) <= 3) nudged++; else mkProbs.push(`${id} at ${tc(m.frame)}, planned ${tc(T0 + rec)}`); }
  if (m.color !== color || m.name !== name) mkProbs.push(`${id} is ${m.color} "${m.name}", planned ${color} "${name}"`);
}
if (want.length && !have.size && !(v.clipMarkers || []).length) mkProbs.unshift('no clip markers at all: run resolve-markers.py (the FCPXML import drops markers)');
check('markers', !mkProbs.length, `${want.length - mkProbs.filter((p) => / missing$/.test(p)).length}/${want.length} on their planned frames${nudged ? ` (${nudged} nudged a frame or two off another marker)` : ''}`, mkProbs);

// report
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}: ${r.detail}`);
  for (const p of r.problems.slice(0, 8)) console.log(`       - ${p}`);
  if (r.problems.length > 8) console.log(`       - ... ${r.problems.length - 8} more`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `[check] ${failed} of ${results.length} checks FAILED` : `[check] all ${results.length} checks passed`);
const outPath = path.join(path.dirname(verifyPath), 'resolve-check.json');
fs.writeFileSync(outPath, JSON.stringify({ spec: path.relative(process.cwd(), specPath), verify: path.relative(process.cwd(), verifyPath), timeline: v.timeline, passed: !failed, results }, null, 2));
process.exit(failed ? 1 : 0);
