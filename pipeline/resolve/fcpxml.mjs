/* FCPXML 1.10 writer (and a tiny XML parser/validator) for DaVinci Resolve timeline import.
 *
 *   import { resolveTimeline, toFcpxml, validateFcpxml, writeTimeline, parseXml } from './fcpxml.mjs';
 *   const { xml, tl, report } = writeTimeline(spec, 'videos/x/out/timeline.fcpxml', { baseDir });
 *
 * Resolve (free and Studio) imports this via File > Import > Timeline... . Nothing here needs Resolve scripting.
 *
 * ---------------------------------------------------------------------------------------------------------------
 * TIMELINE SPEC (plain JSON, what build-timeline.mjs writes to out/timeline-spec.json and preview.mjs renders)
 * ---------------------------------------------------------------------------------------------------------------
 * {
 *   "version": 1,
 *   "name": "my-slug rough cut",        // timeline name Resolve shows (FCPXML <project name>)
 *   "event": "YT Suite",           // FCPXML <event name> (optional)
 *   "fps": "30000/1001",                // optional: 30 | 29.97 | "30000/1001" | {num, den}; default = first A-roll file's rate
 *   "width": 1920, "height": 1080,       // optional: default = first A-roll file's size
 *   "tcStart": "01:00:00:00",           // optional: timeline start timecode (NDF), default 01:00:00:00 like Resolve
 *   "media": {                           // id -> file. Paths absolute or relative to the spec's baseDir. Probed with ffprobe.
 *     "raw":   { "path": "E:/.../raw/take.mp4" },
 *     "lt":    { "path": "E:/.../out/lower-third.mov" },
 *     "bed":   { "path": "E:/.../music/song.bed.wav" }
 *   },
 *   "aroll": [                           // the primary storyline (spine), played in order, video+audio together
 *     { "media": "raw", "in": 12.3, "out": 17.8,   // SOURCE seconds in the file (0 = first frame; embedded timecode is added for you)
 *       "inFrame": 369, "outFrame": 534,           // optional exact source frames (at the timeline rate); win over in/out
 *       "scale": 1.12, "position": [0, 0],         // optional static punch-in: scale factor, offset in timeline pixels (+x right, +y up)
 *       "gainDb": 0, "name": "seg 3" }
 *   ],
 *   "overlays": [                        // connected clips ABOVE the A-roll (lane 1, 2, ...; auto-assigned so none overlap)
 *     { "media": "lt", "at": 2.0, "duration": 5.0, "in": 0,        // at = TIMELINE seconds from the start of the cut
 *       "lane": 1, "mode": "overlay|fullscreen|pip", "scale": 1, "position": [0, 0], "opacity": 1, "name": "lower third" }
 *   ],
 *   "music": [                           // audio-only connected clips BELOW the A-roll, ONE per lane (-1, -2, ...): Resolve
 *     { "media": "bed", "at": 0, "duration": 180, "in": 0, "gainDb": -22, "lane": -1, "name": "bed" }
 *   ],                                   // scrambles audio tracks when a lane holds two clips, so the validator refuses it;
 *                                        // "loop": true still works for preview.mjs but not for the FCPXML (loop the file)
 *   "markers": [                         // attached to the A-roll clip under the time, so they travel with the content
 *     { "at": 12.5, "kind": "chapter|todo|note", "name": "Why it works", "note": "free text", "duration": 0,
 *       "element": "marker|chapter-marker" }        // chapters default to a plain <marker> named "CHAPTER: ..." (safest in Resolve)
 *   ]
 * }
 * Every time is snapped to whole frames of the timeline rate (a source start Resolve would floor one frame short in
 * floating point is written 1/1000 of a frame late; see framesToTime). Source in/out round to the nearest frame, so pass exact
 * frame times (k / fps) or inFrame/outFrame when it matters (build-timeline does). A-roll keeps its native rate: the
 * timeline rate defaults to it, and mixed-rate A-roll is quantised to the timeline grid (Resolve then conforms it).
 *
 * FCPXML facts this writer relies on (1.10 DTD): <asset> carries <media-rep kind="original-media" src="file:///E:/..."/>;
 * spine offsets include the sequence tcStart (Resolve's own exports start at 3600s); a connected clip's offset and a
 * marker's start are in the PARENT clip's source time (parent.start + (t - parent.offset)); adjust-transform position
 * is in FCP units (percent of frame height, +y up) and scale is "sx sy"; adjust-volume amount is "-12dB".
 * Whether Resolve honours adjust-transform / adjust-volume / chapter-marker / to-do markers on import is what
 * renders/resolve-smoke (pipeline/resolve/smoke.mjs) is for.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { probeMedia, normalizeFps } from './media.mjs';

// ---------------------------------------------------------------- rational time -------------------------------------
const babs = (a) => (a < 0n ? -a : a);
function bgcd(a, b) { a = babs(a); b = babs(b); while (b) { [a, b] = [b, a % b]; } return a || 1n; }

export function parseFps(x) {
  if (x == null) return null;
  if (typeof x === 'object') return normalizeFps({ num: Number(x.num), den: Number(x.den || 1) });
  if (typeof x === 'string' && x.includes('/')) { const [n, d] = x.split('/').map(Number); return normalizeFps({ num: n, den: d }); }
  const v = Number(x);
  if (!Number.isFinite(v) || v <= 0) throw new Error(`bad fps ${x}`);
  return normalizeFps({ num: Math.round(v * 1000), den: 1000 });
}
export const timebase = (fps) => Math.round(fps.num / fps.den);

// Resolve (Studio 21.1) reads a clip's source `start` as floor((num / den) * fps) in doubles: "1307/10s" at 30 fps
// (frame 3921) became frame 3920, because 130.7 * 30 = 3920.9999999999995. Offsets and durations are read correctly
// even where the same product lands a hair short (29.97 test), and nudging THOSE made Resolve scatter the dialogue across
// audio tracks. So only source starts (and marker starts) are nudged: written 1/1000 of a frame late where the floor
// would lose a frame, which a reader that rounds maps to the same frame (renders/resolve-smoke/RESULT.md).
const NUDGE = 1000n;
const floorsShort = (n, d, frames, fps) => {
  const s = Number(n) / Number(d);
  return [(s * fps.num) / fps.den, s * (fps.num / fps.den), s / (fps.den / fps.num)].some((x) => Math.floor(x) < frames);
};

/** frames at `fps` -> FCPXML time string ("0s", "3600s", "1001/30000s"). nudge: for source starts only (see above). */
export function framesToTime(frames, fps, nudge = false) {
  if (!Number.isInteger(frames)) throw new Error(`non-integer frame count ${frames}`);
  let n = BigInt(frames) * BigInt(fps.den), d = BigInt(fps.num);
  if (nudge && frames > 0 && floorsShort(n, d, frames, fps)) {
    n = n * NUDGE + 1n; d *= NUDGE;
    if (floorsShort(n, d, frames, fps)) throw new Error(`cannot write frame ${frames} at ${fps.num}/${fps.den} so that it survives a floating-point floor`);
  }
  const g = bgcd(n, d); n /= g; d /= g;
  return d === 1n ? `${n}s` : `${n}/${d}s`;
}
/** FCPXML time string -> {n, d} BigInt seconds. */
export function parseTime(str) {
  const m = /^(-?\d+)(?:\/(\d+))?s$/.exec(String(str).trim());
  if (!m) throw new Error(`bad FCPXML time "${str}"`);
  return { n: BigInt(m[1]), d: BigInt(m[2] || 1) };
}
export const timeToSeconds = (str) => { const { n, d } = parseTime(str); return Number(n) / Number(d); };
/** true when the time is a whole number of frames of `frameDuration` ({n, d} seconds), or at most 1/1000 of a frame
 * past one (the Resolve-safe nudge framesToTime writes). */
export function isWholeFrames(str, frameDur) {
  const { n, d } = parseTime(str);
  const r = (n * frameDur.d) % (d * frameDur.n); // fraction of a frame = r / (d * frameDur.n)
  return r === 0n || r * NUDGE <= d * frameDur.n;
}
export const frameDurOf = (fps) => ({ n: BigInt(fps.den), d: BigInt(fps.num) });
export const secToFrames = (sec, fps) => Math.round((sec * fps.num) / fps.den + 1e-9);
export const framesToSec = (frames, fps) => (frames * fps.den) / fps.num;

/** frames -> "HH:MM:SS:FF" (non-drop), counting from tcStartFrames. */
export function timecode(frames, fps, tcStartFrames = 0) {
  const tb = timebase(fps); let f = frames + tcStartFrames; const sign = f < 0 ? '-' : ''; f = Math.abs(f);
  const ff = f % tb, s = Math.floor(f / tb), p = (x) => String(x).padStart(2, '0');
  return `${sign}${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(ff)}`;
}
export function parseTimecode(tc, fps) {
  const m = /^(\d+):(\d+):(\d+)[:;](\d+)$/.exec(String(tc));
  if (!m) throw new Error(`bad timecode "${tc}"`);
  return ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * timebase(fps) + +m[4];
}

// ---------------------------------------------------------------- paths ----------------------------------------------
/** Absolute path -> file:///E:/dir%20name/file.mp4 (drive letter kept, every other segment percent-encoded). */
export function fileUrl(p) {
  const abs = path.resolve(p).split(path.sep).join('/');
  const parts = abs.split('/').map((seg, i) => (i === 0 && /^[A-Za-z]:$/.test(seg) ? seg.toUpperCase() : encodeURIComponent(seg)));
  const joined = parts.join('/');
  return joined.startsWith('/') ? `file://${joined}` : `file:///${joined}`;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// ---------------------------------------------------------------- resolve spec -> frames ------------------------------
export function resolveTimeline(spec, { baseDir = process.cwd(), probe = probeMedia } = {}) {
  const warnings = [];
  if (!spec.aroll?.length) throw new Error('timeline spec has no aroll segments');
  const media = {};
  for (const [id, m] of Object.entries(spec.media || {})) {
    const p = path.resolve(baseDir, m.path || m.file);
    if (!fs.existsSync(p)) throw new Error(`media "${id}" not found: ${p}`);
    media[id] = { ...probe(p), id };
  }
  const first = media[spec.aroll[0].media];
  if (!first) throw new Error(`aroll[0] references unknown media "${spec.aroll[0].media}"`);
  const fps = parseFps(spec.fps) || first.fps || { num: 30, den: 1 };
  const width = spec.width || first.width || 1920, height = spec.height || first.height || 1080;
  const tcStartFrames = spec.tcStart == null ? 3600 * timebase(fps)
    : typeof spec.tcStart === 'number' ? spec.tcStart : parseTimecode(spec.tcStart, fps);
  const mediaFrames = (m) => Math.floor(m.duration * fps.num / fps.den + 1e-6);
  const need = (id, what) => { const m = media[id]; if (!m) throw new Error(`${what} references unknown media "${id}"`); return m; };

  const aroll = []; let rec = 0;
  spec.aroll.forEach((seg, i) => {
    const m = need(seg.media, `aroll[${i}]`);
    if (!m.hasVideo) warnings.push(`aroll[${i}] media "${seg.media}" has no video`);
    let srcIn = seg.inFrame ?? secToFrames(seg.in ?? 0, fps);
    let srcOut = seg.outFrame ?? secToFrames(seg.out ?? m.duration, fps);
    const maxF = mediaFrames(m);
    if (srcOut > maxF) { warnings.push(`aroll[${i}] out ${srcOut} > media length ${maxF} frames, clamped`); srcOut = maxF; }
    if (srcIn < 0) srcIn = 0;
    if (srcOut <= srcIn) { warnings.push(`aroll[${i}] is empty after snapping to frames, skipped`); return; }
    const len = srcOut - srcIn;
    aroll.push({ i: aroll.length, media: seg.media, srcIn, srcOut, recIn: rec, recOut: rec + len,
      scale: seg.scale ?? 1, position: seg.position || [0, 0], gainDb: seg.gainDb ?? 0, name: seg.name || m.name, note: seg.note, videoOnly: !!seg.videoOnly });
    rec += len;
  });
  const durationFrames = rec;

  // exclusive: one item per lane. Audio lanes need it: Resolve's FCPXML import scatters the storyline's audio across
  // tracks as soon as any audio lane holds two clips, adjacent or not (renders/resolve-smoke/RESULT.md). Video lanes share.
  const assignLanes = (items, sign, exclusive = false) => {
    const lanes = new Map(); // lane -> last end frame
    for (const it of [...items].sort((a, b) => a.recIn - b.recIn)) {
      if (it.lane && !(exclusive && lanes.has(it.lane))) { lanes.set(it.lane, Math.max(lanes.get(it.lane) ?? 0, it.recOut)); continue; }
      if (it.lane) warnings.push(`lane ${it.lane} already holds a clip; "${it.parts?.[0]?.name ?? ''}" moved to a free lane`);
      let lane = sign;
      while (exclusive ? lanes.has(lane) : (lanes.get(lane) ?? -1) > it.recIn) lane += sign;
      it.lane = lane; lanes.set(lane, it.recOut);
    }
  };
  const place = (list, kind, sign) => {
    const out = [];
    (list || []).forEach((c, i) => {
      const m = need(c.media, `${kind}[${i}]`);
      const srcIn = c.inFrame ?? secToFrames(c.in ?? 0, fps);
      const avail = mediaFrames(m) - srcIn;
      let recIn = c.atFrame ?? secToFrames(c.at ?? 0, fps);
      // the end frame comes from the true end time, not start + rounded length: rounding both separately left 1-frame
      // holes between back-to-back scenes that flashed the A-roll through (Ben, v4e 12:03: "a flash frame of me")
      let dur = c.durationFrame ?? (c.duration != null ? secToFrames((c.at ?? 0) + c.duration, fps) - recIn : avail);
      if (recIn >= durationFrames) { warnings.push(`${kind}[${i}] starts after the end of the cut, skipped`); return; }
      if (recIn < 0) { dur += recIn; recIn = 0; }
      dur = Math.min(dur, durationFrames - recIn);
      const loop = c.loop && kind === 'music';
      if (!loop && dur > avail) { warnings.push(`${kind}[${i}] asks for ${dur} frames but media has ${avail}; trimmed`); dur = avail; }
      if (dur <= 0) { warnings.push(`${kind}[${i}] has no duration, skipped`); return; }
      // loop music by laying copies back to back on the same lane
      let t = recIn, left = dur, part = 0;
      while (left > 0) {
        const len = Math.min(left, part === 0 ? avail : mediaFrames(m));
        const s = part === 0 ? srcIn : 0;
        out.push({ kind, media: c.media, srcIn: s, srcOut: s + len, recIn: t, recOut: t + len, lane: c.lane,
          scale: c.scale ?? 1, position: c.position || [0, 0], opacity: c.opacity ?? 1, gainDb: c.gainDb ?? (kind === 'music' ? -22 : 0),
          mode: c.mode || 'overlay', name: c.name || m.name, group: i });
        t += len; left -= len; part++;
        if (!loop) break;
      }
    });
    // looped parts of one entry share a lane
    const groups = new Map();
    for (const it of out) { if (!groups.has(it.group)) groups.set(it.group, []); groups.get(it.group).push(it); }
    const heads = [...groups.values()].map((parts) => ({ recIn: parts[0].recIn, recOut: parts.at(-1).recOut, lane: parts[0].lane, parts }));
    if (kind === 'music') for (const h of heads) if (h.parts.length > 1) warnings.push(`music "${h.parts[0].name}" loops as ${h.parts.length} clips on one lane, which Resolve's FCPXML import scrambles; render the loop to one file (build-timeline does)`);
    assignLanes(heads, sign, kind === 'music');
    for (const h of heads) for (const p of h.parts) p.lane = h.lane;
    return out;
  };
  const overlays = place(spec.overlays, 'overlay', 1);
  const music = place(spec.music, 'music', -1);

  const markers = (spec.markers || []).map((mk) => {
    let at = mk.atFrame ?? secToFrames(mk.at ?? 0, fps);
    at = Math.max(0, Math.min(durationFrames - 1, at));
    return { rec: at, dur: Math.max(1, mk.durationFrame ?? secToFrames(mk.duration || 0, fps)), kind: mk.kind || 'note',
      name: mk.name || '', note: mk.note || '', element: mk.element || (mk.kind === 'chapter' ? 'marker' : 'marker') };
  }).sort((a, b) => a.rec - b.rec);

  return { name: spec.name || 'Rough cut', event: spec.event || 'YT Suite', fps, width, height, tcStartFrames,
    audioRate: spec.audioRate || 48000, media, aroll, overlays, music, markers, durationFrames, warnings };
}

/** Index of the A-roll segment under timeline frame t (clamped to the last). */
export function segmentAt(tl, t) {
  let lo = 0, hi = tl.aroll.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (tl.aroll[mid].recIn <= t) lo = mid; else hi = mid - 1; }
  return lo;
}

// ---------------------------------------------------------------- XML writer ----------------------------------------
const STD_NAMES = { '1920x1080': '1080p', '1280x720': '720p', '3840x2160': '3840x2160p', '4096x2160': '4096x2160p' };
function formatName(w, h, fps) {
  const key = STD_NAMES[`${w}x${h}`]; if (!key) return null;
  const r = fps.den === 1001 ? { 24000: '2398', 30000: '2997', 60000: '5994' }[fps.num] : String(fps.num / fps.den);
  return r ? `FFVideoFormat${key}${r}` : null;
}
function tag(name, attrs, children, ind) {
  const a = Object.entries(attrs).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  if (!children || !children.length) return `${ind}<${name}${a}/>`;
  return `${ind}<${name}${a}>\n${children.join('\n')}\n${ind}</${name}>`;
}

export function toFcpxml(tl) {
  const { fps } = tl;
  const T = (f) => framesToTime(f, fps);
  const Ts = (f) => framesToTime(f, fps, true); // source starts and marker starts: the only times Resolve floors
  const formats = new Map(); let rid = 0; const nextId = () => `r${++rid}`;
  const formatFor = (w, h, f) => {
    const key = `${w}x${h}@${f.num}/${f.den}`;
    if (!formats.has(key)) formats.set(key, { id: nextId(), w, h, f });
    return formats.get(key).id;
  };
  const seqFormat = formatFor(tl.width, tl.height, fps);
  const assets = new Map();
  const used = new Set([...tl.aroll, ...tl.overlays, ...tl.music].map((c) => c.media));
  for (const id of used) {
    const m = tl.media[id];
    const a = { id: nextId(), m };
    if (m.hasVideo) {
      a.format = formatFor(m.width, m.height, m.fps);
      a.start = framesToTime(m.tcStartFrames || 0, m.fps);
      a.duration = framesToTime(Math.floor(m.duration * m.fps.num / m.fps.den + 1e-6), m.fps);
    } else {
      a.start = '0s';
      a.duration = T(Math.floor(m.duration * fps.num / fps.den + 1e-6));
    }
    // clip start values live in the source's time: its embedded timecode (on the timeline grid) + source frame
    a.tcOnGrid = m.hasVideo && m.tcStartSeconds ? Math.round(m.tcStartSeconds * fps.num / fps.den) : 0;
    assets.set(id, a);
  }
  const ind = (n) => '  '.repeat(n);
  const res = [];
  for (const f of formats.values()) {
    res.push(tag('format', { id: f.id, name: formatName(f.w, f.h, f.f) || undefined, frameDuration: framesToTime(1, f.f), width: f.w, height: f.h, colorSpace: '1-1-1 (Rec. 709)' }, null, ind(2)));
  }
  for (const a of assets.values()) {
    const m = a.m;
    const uid = crypto.createHash('md5').update(m.path.toLowerCase()).digest('hex').toUpperCase();
    res.push(tag('asset', {
      id: a.id, name: path.basename(m.path, path.extname(m.path)), uid, start: a.start, duration: a.duration,
      hasVideo: m.hasVideo ? '1' : undefined, format: a.format, videoSources: m.hasVideo ? '1' : undefined,
      hasAudio: m.hasAudio ? '1' : undefined, audioSources: m.hasAudio ? '1' : undefined,
      audioChannels: m.hasAudio ? m.audioChannels : undefined, audioRate: m.hasAudio ? m.audioRate : undefined,
    }, [tag('media-rep', { kind: 'original-media', src: fileUrl(m.path) }, null, ind(3))], ind(2)));
  }

  const px2fcp = (px) => +((px / tl.height) * 100).toFixed(4); // FCP position units: percent of frame height
  const transformEl = (c, d) => (c.scale !== 1 || c.position[0] || c.position[1])
    ? tag('adjust-transform', { position: `${px2fcp(c.position[0])} ${px2fcp(c.position[1])}`, scale: `${c.scale} ${c.scale}` }, null, ind(d)) : null;
  const volumeEl = (c, d) => (c.gainDb ? tag('adjust-volume', { amount: `${+c.gainDb.toFixed(2)}dB` }, null, ind(d)) : null);

  // group connected clips and markers under the A-roll segment they start in
  const kids = tl.aroll.map(() => ({ clips: [], markers: [] }));
  for (const c of [...tl.overlays, ...tl.music]) kids[segmentAt(tl, c.recIn)].clips.push(c);
  for (const mk of tl.markers) kids[segmentAt(tl, mk.rec)].markers.push(mk);

  const spine = tl.aroll.map((s, k) => {
    const a = assets.get(s.media);
    const parentStart = a.tcOnGrid + s.srcIn; // parent's local time at its first frame
    const local = (t) => parentStart + (t - s.recIn);
    const children = [];
    const tr = transformEl(s, 7); if (tr) children.push(tr);
    const vol = s.videoOnly ? null : volumeEl(s, 7); if (vol) children.push(vol);
    for (const c of kids[k].clips.sort((x, y) => x.recIn - y.recIn || x.lane - y.lane)) {
      const ca = assets.get(c.media);
      const cm = ca.m;
      const cc = [];
      if (c.kind === 'overlay') {
        const t2 = transformEl(c, 8); if (t2) cc.push(t2);
        if (c.opacity < 1) cc.push(tag('adjust-blend', { amount: c.opacity }, null, ind(8)));
      }
      const v2 = volumeEl(c, 8); if (v2) cc.push(v2);
      children.push(tag('asset-clip', {
        ref: ca.id, lane: c.lane, offset: T(local(c.recIn)), name: c.name, start: Ts(ca.tcOnGrid + c.srcIn), duration: T(c.recOut - c.recIn),
        format: cm.hasVideo ? ca.format : undefined, tcFormat: cm.hasVideo ? 'NDF' : undefined,
        srcEnable: c.kind === 'overlay' && cm.hasAudio ? 'video' : undefined,
        audioRole: c.kind === 'music' ? 'music' : undefined,
      }, cc, ind(7)));
    }
    for (const mk of kids[k].markers) {
      const start = Ts(local(mk.rec)), duration = T(mk.dur);
      if (mk.kind === 'chapter' && mk.element === 'chapter-marker') {
        children.push(tag('chapter-marker', { start, duration, value: mk.name, posterOffset: '0s' }, null, ind(7)));
      } else {
        const value = mk.kind === 'chapter' ? `CHAPTER: ${mk.name}` : mk.name;
        children.push(tag('marker', { start, duration, value, completed: mk.kind === 'todo' ? '0' : undefined, note: mk.note || undefined }, null, ind(7)));
      }
    }
    return tag('asset-clip', {
      ref: a.id, offset: T(tl.tcStartFrames + s.recIn), name: s.name, start: Ts(parentStart), duration: T(s.recOut - s.recIn),
      format: a.format, tcFormat: 'NDF', audioRole: s.videoOnly ? undefined : 'dialogue', srcEnable: s.videoOnly ? 'video' : undefined,
    }, children, ind(6));
  });

  const seq = tag('sequence', { format: seqFormat, duration: T(tl.durationFrames), tcStart: T(tl.tcStartFrames), tcFormat: 'NDF', audioLayout: 'stereo', audioRate: '48k' },
    [tag('spine', {}, spine, ind(5))], ind(4));
  const lib = tag('library', {}, [tag('event', { name: tl.event }, [tag('project', { name: tl.name }, [seq], ind(3))], ind(2))], ind(1));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE fcpxml>\n\n<fcpxml version="1.10">\n${tag('resources', {}, res, ind(1))}\n${lib}\n</fcpxml>\n`;
}

// ---------------------------------------------------------------- XML parser (well-formedness) ----------------------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decodeEntities(s, fail) {
  return s.replace(/&([^;&\s]*);?/g, (all, name) => {
    if (!all.endsWith(';')) fail(`bare "&" (write &amp;)`);
    if (name[0] === '#') { const cp = name[1] === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10); if (!Number.isFinite(cp)) fail(`bad char ref &${name};`); return String.fromCodePoint(cp); }
    if (!(name in ENT)) fail(`unknown entity &${name};`);
    return ENT[name];
  });
}
/** Strict-enough XML parser: throws on mismatched/unclosed tags, bad attributes, duplicate attributes, bare & or <. */
export function parseXml(src) {
  let i = 0;
  const doc = { name: '#document', attrs: {}, children: [] }; const stack = [doc];
  const fail = (msg) => { const line = src.slice(0, i).split('\n').length; throw new Error(`XML not well formed (line ${line}): ${msg}`); };
  const NAME = /[A-Za-z_][\w.\-:]*/y, WS = /\s*/y, ATTR = /([A-Za-z_][\w.\-:]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/y;
  const text = (t) => {
    const top = stack[stack.length - 1];
    if (top === doc) { if (t.trim()) fail('text outside the root element'); return; }
    if (t.includes('>') && /]]>/.test(t)) fail('"]]>" in text');
    top.children.push({ text: decodeEntities(t, fail) });
  };
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) { text(src.slice(i)); break; }
    if (lt > i) text(src.slice(i, lt));
    i = lt;
    if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i + 4); if (e < 0) fail('unterminated comment'); i = e + 3; continue; }
    if (src.startsWith('<![CDATA[', i)) { const e = src.indexOf(']]>', i); if (e < 0) fail('unterminated CDATA'); stack[stack.length - 1].children.push({ text: src.slice(i + 9, e) }); i = e + 3; continue; }
    if (src.startsWith('<?', i)) { const e = src.indexOf('?>', i); if (e < 0) fail('unterminated processing instruction'); i = e + 2; continue; }
    if (src.startsWith('<!DOCTYPE', i)) {
      if (doc.children.length) fail('DOCTYPE after the root element');
      let j = i, depth = 0;
      for (; j < src.length; j++) { const c = src[j]; if (c === '[') depth++; else if (c === ']') depth--; else if (c === '>' && depth === 0) break; }
      if (j >= src.length) fail('unterminated DOCTYPE'); i = j + 1; continue;
    }
    if (src[i + 1] === '/') {
      NAME.lastIndex = i + 2; const m = NAME.exec(src); if (!m) fail('bad closing tag');
      let j = NAME.lastIndex; WS.lastIndex = j; WS.exec(src); j = WS.lastIndex;
      if (src[j] !== '>') fail(`bad closing tag </${m[0]}`);
      const top = stack.pop();
      if (top === doc || top.name !== m[0]) fail(`</${m[0]}> closes <${top === doc ? '(nothing)' : top.name}>`);
      i = j + 1; continue;
    }
    NAME.lastIndex = i + 1; const nm = NAME.exec(src); if (!nm) fail('bare "<" (write &lt;)');
    if (stack[stack.length - 1] === doc && doc.children.some((c) => c.name)) fail('more than one root element');
    const el = { name: nm[0], attrs: {}, children: [], line: src.slice(0, i).split('\n').length };
    let j = NAME.lastIndex;
    for (;;) {
      WS.lastIndex = j; WS.exec(src); const hadWs = WS.lastIndex > j; j = WS.lastIndex;
      if (src[j] === '/' && src[j + 1] === '>') { j += 2; break; }
      if (src[j] === '>') { j += 1; stack[stack.length - 1].children.push(el); stack.push(el); el.open = true; break; }
      if (!hadWs) fail(`expected whitespace before attribute in <${el.name}>`);
      ATTR.lastIndex = j; const am = ATTR.exec(src); if (!am) fail(`bad attribute in <${el.name}>`);
      if (am[1] in el.attrs) fail(`duplicate attribute ${am[1]} in <${el.name}>`);
      el.attrs[am[1]] = decodeEntities(am[2] ?? am[3], fail); j = ATTR.lastIndex;
    }
    if (!el.open) stack[stack.length - 1].children.push(el);
    delete el.open; i = j;
  }
  if (stack.length !== 1) fail(`unclosed <${stack[stack.length - 1].name}>`);
  const root = doc.children.find((c) => c.name);
  if (!root) fail('no root element');
  return root;
}
export function* walk(el, parents = []) {
  yield [el, parents];
  for (const c of el.children || []) if (c.name) yield* walk(c, [...parents, el]);
}
export const findAll = (el, name) => [...walk(el)].filter(([e]) => e.name === name).map(([e]) => e);

// ---------------------------------------------------------------- validation ----------------------------------------
/** Parse + check: refs resolve, every time is a whole number of frames, spine is gap-free, children sit inside parents. */
export function validateFcpxml(xml) {
  const errors = [], warnings = [];
  let root;
  try { root = parseXml(xml); } catch (e) { return { ok: false, errors: [e.message], warnings, stats: {} }; }
  if (root.name !== 'fcpxml') errors.push(`root is <${root.name}>, expected <fcpxml>`);
  if (root.attrs.version !== '1.10') warnings.push(`fcpxml version ${root.attrs.version}`);
  const formats = new Map(), assets = new Map();
  for (const f of findAll(root, 'format')) formats.set(f.attrs.id, f);
  for (const a of findAll(root, 'asset')) {
    if (assets.has(a.attrs.id) || formats.has(a.attrs.id)) errors.push(`duplicate resource id ${a.attrs.id}`);
    assets.set(a.attrs.id, a);
    const rep = a.children.find((c) => c.name === 'media-rep');
    if (!rep?.attrs.src?.startsWith('file:///')) errors.push(`asset ${a.attrs.id} has no file:/// media-rep`);
    const fmt = a.attrs.format ? formats.get(a.attrs.format) : null;
    if (a.attrs.format && !fmt) errors.push(`asset ${a.attrs.id} references missing format ${a.attrs.format}`);
    if (fmt) for (const k of ['start', 'duration']) if (!isWholeFrames(a.attrs[k], parseTime(fmt.attrs.frameDuration))) errors.push(`asset ${a.attrs.id} ${k}=${a.attrs[k]} is not whole frames of ${fmt.attrs.frameDuration}`);
  }
  const seqs = findAll(root, 'sequence');
  if (seqs.length !== 1) { errors.push(`expected 1 <sequence>, found ${seqs.length}`); return { ok: false, errors, warnings, stats: {} }; }
  const seq = seqs[0];
  const sfmt = formats.get(seq.attrs.format);
  if (!sfmt) { errors.push('sequence format missing'); return { ok: false, errors, warnings, stats: {} }; }
  const fd = parseTime(sfmt.attrs.frameDuration);
  const stats = { spineClips: 0, connected: {}, markers: 0, chapterMarkers: 0, todoMarkers: 0, transforms: 0, volumes: 0, timeAttrsChecked: 0 };
  for (const k of ['duration', 'tcStart']) { stats.timeAttrsChecked++; if (!isWholeFrames(seq.attrs[k], fd)) errors.push(`sequence ${k}=${seq.attrs[k]} not whole frames`); }
  for (const [el, parents] of walk(seq)) {
    if (el === seq) continue;
    for (const k of ['offset', 'start', 'duration']) {
      if (el.attrs[k] == null) continue;
      stats.timeAttrsChecked++;
      try { if (!isWholeFrames(el.attrs[k], fd)) errors.push(`<${el.name}> line ${el.line} ${k}=${el.attrs[k]} is not a whole number of frames`); }
      catch (e) { errors.push(`<${el.name}> line ${el.line}: ${e.message}`); }
    }
    if (el.attrs.ref && !assets.has(el.attrs.ref)) errors.push(`<${el.name}> line ${el.line} ref ${el.attrs.ref} does not resolve`);
    if (el.attrs.format && !formats.has(el.attrs.format)) errors.push(`<${el.name}> line ${el.line} format ${el.attrs.format} does not resolve`);
    const parent = parents[parents.length - 1];
    if (el.name === 'asset-clip' && parent.name === 'asset-clip') {
      const lane = el.attrs.lane || '0';
      stats.connected[lane] = (stats.connected[lane] || 0) + 1;
      const ps = timeToSeconds(parent.attrs.start || '0s'), pe = ps + timeToSeconds(parent.attrs.duration), o = timeToSeconds(el.attrs.offset);
      if (o < ps - 1e-9 || o > pe + 2e-4) warnings.push(`connected clip line ${el.line} anchors outside its parent (${o.toFixed(3)} not in ${ps.toFixed(3)}-${pe.toFixed(3)})`);
    }
    if (el.name === 'marker' || el.name === 'chapter-marker') {
      stats.markers++; if (el.name === 'chapter-marker' || /^CHAPTER:/.test(el.attrs.value || '')) stats.chapterMarkers++; if (el.attrs.completed === '0') stats.todoMarkers++;
      const ps = timeToSeconds(parent.attrs.start || '0s'), pe = ps + timeToSeconds(parent.attrs.duration), s = timeToSeconds(el.attrs.start);
      if (s < ps - 1e-9 || s >= pe + 1e-9) errors.push(`marker line ${el.line} "${el.attrs.value}" lies outside its clip`);
    }
    if (el.name === 'adjust-transform') stats.transforms++;
    if (el.name === 'adjust-volume') stats.volumes++;
  }
  for (const [lane, n] of Object.entries(stats.connected)) {
    if (Number(lane) < 0 && n > 1) errors.push(`audio lane ${lane} holds ${n} clips; Resolve's FCPXML import then scatters the dialogue across audio tracks (renders/resolve-smoke/RESULT.md), so give each audio clip its own lane`);
  }
  const spine = seq.children.find((c) => c.name === 'spine');
  let expect = timeToSeconds(seq.attrs.tcStart || '0s');
  for (const c of (spine?.children || []).filter((x) => x.name)) {
    stats.spineClips++;
    const o = timeToSeconds(c.attrs.offset);
    if (Math.abs(o - expect) > 2e-4) errors.push(`spine clip line ${c.line} starts at ${o.toFixed(4)}s, expected ${expect.toFixed(4)}s (gap/overlap)`);
    expect = o + timeToSeconds(c.attrs.duration);
  }
  const seqEnd = timeToSeconds(seq.attrs.tcStart || '0s') + timeToSeconds(seq.attrs.duration);
  if (Math.abs(expect - seqEnd) > 2e-4) errors.push(`spine ends at ${expect.toFixed(4)}s but sequence duration ends at ${seqEnd.toFixed(4)}s`);
  return { ok: errors.length === 0, errors, warnings, stats };
}

/** resolve + write + validate. Throws if the result does not validate. */
export function writeTimeline(spec, outPath, opts = {}) {
  const tl = resolveTimeline(spec, opts);
  const xml = toFcpxml(tl);
  const report = validateFcpxml(xml);
  if (!report.ok) throw new Error(`FCPXML failed validation:\n  ${report.errors.join('\n  ')}`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, xml);
  return { xml, tl, report };
}
