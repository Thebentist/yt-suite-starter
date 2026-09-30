/* Fill the Resolve MCP script templates (import-timeline.py, verify-timeline.py, apply-punchins.py, add-markers.py,
 * finish-timeline.py) for one timeline.
 *
 *   writeMcpScripts({ outDir, xmlPath, srtPath, timelineName, tcStartFrames, clipCount, punchins: [[frame, zoom, x, y]],
 *                     markers: tl.markers, finish: {crossfadeFrames, crossfadeType, musicFadeInFrames, musicFadeOutFrames} })
 *   -> writes <outDir>/resolve-import.py, resolve-verify.py, resolve-punchins.py, resolve-markers.py, resolve-finish.py
 *
 * Each template has a block between "# ---- DATA" and "# ---- END DATA ----"; only that block is replaced, so the
 * templates stay the single source of the script logic.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NL = '\n';
const pyVal = (v) => (v == null ? 'None' : typeof v === 'string' ? (v.includes('\\') ? `r"${v}"` : JSON.stringify(v)) : v === true ? 'True' : v === false ? 'False' : String(v));
// tuple members: JSON string escapes are valid Python escapes, and unlike r"..." they survive quotes and backslashes
const pyItem = (v) => (typeof v === 'string' ? JSON.stringify(v) : pyVal(v));
const ROW_COMMENTS = {
  PUNCHINS: '(timeline start frame, zoom, position x px, position y px)',
  MARKERS: '(frame from the timeline start, color, name, note, duration frames, id)',
};

export function fillTemplate(template, label, vals) {
  const src = fs.readFileSync(path.join(HERE, template), 'utf8');
  const block = Object.entries(vals).map(([k, v]) => (Array.isArray(v)
    ? `${k} = [${NL}    # ${ROW_COMMENTS[k] || ''}${NL}${v.map((r) => `    (${r.map(pyItem).join(', ')}),`).join(NL)}${NL}]`
    : `${k} = ${pyVal(v)}`)).join(NL);
  return src.replace(/# ---- DATA[^\n]*\n[\s\S]*?# ---- END DATA ----/, () => `# ---- DATA (filled for "${label}") ----${NL}${block}${NL}# ---- END DATA ----`);
}

/** Resolve marker color for a timeline-spec marker: chapters blue, CHECK JOIN red, RETAKE? yellow, automatic take cuts
 * purple, optional trims cream. */
export function markerColor(m) {
  if (m.kind === 'chapter') return 'Blue';
  if (/^CHECK JOIN/.test(m.name)) return 'Red';
  if (/^RETAKE\?/.test(m.name)) return 'Yellow';
  if (/^CUT /.test(m.name)) return 'Purple';
  if (m.kind === 'todo') return 'Red';
  if (/^(FILLER|STUTTER)/.test(m.name)) return 'Cream';
  return 'Green';
}

/** tl.markers ({rec, dur, kind, name, note}, frames from the timeline start) -> add-markers.py rows. */
export function markerRows(markers) {
  return markers.map((m, i) => [m.rec, markerColor(m), m.kind === 'chapter' ? `CHAPTER: ${m.name}` : m.name, m.note || '', m.dur || 1, `m${String(i + 1).padStart(3, '0')}`]);
}

export function writeMcpScripts({ outDir, xmlPath, srtPath = '', timelineName, tcStartFrames, clipCount, punchins = [], markers = [], finish = {} }) {
  const files = {
    'resolve-import.py': fillTemplate('import-timeline.py', timelineName, { FCPXML_PATH: path.resolve(xmlPath), TIMELINE_NAME: '', SRT_PATH: srtPath ? path.resolve(srtPath) : '', IMPORT_SOURCE_CLIPS: true, PICTURE_ONLY_AROLL: !!finish.pictureOnlyAroll }),
    'resolve-verify.py': fillTemplate('verify-timeline.py', timelineName, { TIMELINE_NAME: timelineName, WITH_ITEM_MARKERS: true, MAX_ITEMS_PER_TRACK: 1500, SAVE_TO: path.resolve(outDir, 'resolve-verify.json') }),
    'resolve-punchins.py': fillTemplate('apply-punchins.py', timelineName, { TIMELINE_NAME: timelineName, TRACK: 1, TIMELINE_START_FRAME: tcStartFrames, CLIP_COUNT: clipCount, PUNCHINS: punchins, DRY_RUN: false }),
    'resolve-markers.py': fillTemplate('add-markers.py', timelineName, { TIMELINE_NAME: timelineName, TRACK: 1, TIMELINE_START_FRAME: tcStartFrames, CLIP_COUNT: clipCount, TARGET: 'clip', MARKERS: markerRows(markers), DRY_RUN: false }),
    'resolve-render.py': fillTemplate('render-timeline.py', timelineName, { TIMELINE_NAME: timelineName, MODE: 'qa', TARGET_DIR: path.resolve(outDir, 'qa'), CUSTOM_NAME: 'qa-mix', FORMAT: 'mp4', CODEC: 'H265_NVIDIA', VIDEO_QUALITY: 0, VIDEO_PRESET: 'YouTube - 2160p', RESOLUTION: '' }),
    'resolve-deliver.py': fillTemplate('render-timeline.py', timelineName, { TIMELINE_NAME: timelineName, MODE: 'deliver', TARGET_DIR: path.resolve(outDir, 'deliver'), CUSTOM_NAME: timelineName.replace(/[^\w.-]+/g, '_'), FORMAT: 'mp4', CODEC: 'H265_NVIDIA', VIDEO_QUALITY: finish.videoKbps ?? 0, VIDEO_PRESET: finish.videoPreset ?? 'YouTube - 2160p', RESOLUTION: '' }),
    'resolve-review.py': fillTemplate('render-timeline.py', timelineName, { TIMELINE_NAME: timelineName, MODE: 'review', TARGET_DIR: path.resolve(finish.reviewDir || path.join(outDir, 'review')), CUSTOM_NAME: finish.reviewName || 'review', FORMAT: 'mp4', CODEC: 'H264_NVIDIA', VIDEO_QUALITY: 12000, VIDEO_PRESET: 'YouTube - 1080p', RESOLUTION: '1920x1080' }),
    'resolve-stems.py': fillTemplate('add-stems.py', timelineName, { TIMELINE_NAME: timelineName, STEMS_JSON: path.resolve(outDir, 'stems.json') }),
    'resolve-finish.py': fillTemplate('finish-timeline.py', timelineName, { TIMELINE_NAME: timelineName, DIALOGUE_TRACK: 1, XFADE_FRAMES: finish.crossfadeFrames ?? 2, XFADE_TYPE: finish.crossfadeType ?? 'Cross Fade 0 dB', MUSIC_TRACKS: null, MUSIC_FADE_IN: finish.musicFadeInFrames ?? 15, MUSIC_FADE_OUT: finish.musicFadeOutFrames ?? 30, DRY_RUN: false }),
  };
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(outDir, name), text);
  return Object.keys(files).map((f) => path.join(outDir, f));
}
