/* Media helpers shared by pipeline/resolve/* and pipeline/style/*: ffmpeg/ffprobe paths, probing, and an
 * audio energy envelope (ffmpeg decodes to 16 kHz mono PCM, we compute RMS per 10 ms window in JS).
 *
 *   import { FFMPEG, FFPROBE, probeMedia, runFF, audioEnvelope, levelStats, voicedRuns } from './media.mjs';
 *
 * probeMedia(file) -> {
 *   path, name, duration (s), hasVideo, hasAudio, width, height, fps: {num, den}, fpsFloat,
 *   pixFmt, alpha (bool, pixel format carries alpha), codec, audioChannels, audioRate,
 *   timecode ("HH:MM:SS:FF" or null, from a tmcd track or format/stream tags), tcStartSeconds (0 if none)
 * }
 * audioEnvelope(file, {start, end, rate, win}) -> { db: Float32Array (dBFS per window), win (s), start (s) }
 * levelStats(db) -> { floor, speech, threshold } adaptive speech/silence threshold in dBFS
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

export const FFMPEG = process.env.FFMPEG_PATH || ffmpegPath;
export const FFPROBE = process.env.FFPROBE_PATH || ffprobe.path;

/** Run ffmpeg, resolve with stderr text (ffmpeg logs there). Rejects with the tail of stderr. */
export function runFF(args, { quiet = true } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; if (!quiet) process.stderr.write(d); });
    p.stdout.on('data', () => {});
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(err) : reject(new Error(`ffmpeg exited ${code}\n${err.slice(-3000)}`))));
  });
}

export function parseRate(s) {
  if (!s || s === '0/0') return null;
  const [n, d] = String(s).split('/').map(Number);
  if (!n || !(d ?? 1)) return null;
  return normalizeFps({ num: n, den: d || 1 });
}

/** Snap near-standard rates to exact rationals (29.97 -> 30000/1001, 23.976 -> 24000/1001, 59.94 -> 60000/1001). */
export function normalizeFps(f) {
  const v = f.num / f.den;
  for (const base of [24, 30, 48, 60, 120]) {
    if (Math.abs(v - base * 1000 / 1001) < 0.005) return { num: base * 1000, den: 1001 };
  }
  if (Math.abs(v - Math.round(v)) < 0.001) return { num: Math.round(v), den: 1 };
  return f;
}

function parseTimecode(tc, fps) {
  const m = /^(\d+):(\d+):(\d+)[:;.](\d+)$/.exec(tc || '');
  if (!m) return null;
  const tb = Math.round(fps.num / fps.den);
  const frames = ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * tb + +m[4];
  return { frames, seconds: frames * fps.den / fps.num };
}

export function probeMedia(file) {
  const r = spawnSync(FFPROBE, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffprobe failed on ${file}: ${r.stderr}`);
  const j = JSON.parse(r.stdout);
  const streams = j.streams || [];
  // attached pictures (cover art) are not video
  const v = streams.find((s) => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic));
  const a = streams.find((s) => s.codec_type === 'audio');
  const ext = path.extname(file).toLowerCase();
  const isStill = v && ['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.bmp'].includes(ext);
  const fps = v ? (parseRate(v.r_frame_rate) || parseRate(v.avg_frame_rate) || { num: 30, den: 1 }) : null;
  let duration = parseFloat(j.format?.duration);
  if (!Number.isFinite(duration)) duration = parseFloat(v?.duration ?? a?.duration ?? 'NaN');
  const tcTag = streams.map((s) => s.tags?.timecode).find(Boolean) || j.format?.tags?.timecode || null;
  const tc = fps && tcTag ? parseTimecode(tcTag, fps) : null;
  const pixFmt = v?.pix_fmt || null;
  return {
    path: path.resolve(file),
    name: path.basename(file),
    duration: Number.isFinite(duration) ? duration : 0,
    hasVideo: !!v && !isStill,
    isStill: !!isStill,
    hasAudio: !!a,
    width: v?.width ?? null,
    height: v?.height ?? null,
    fps,
    fpsFloat: fps ? fps.num / fps.den : null,
    codec: v?.codec_name ?? a?.codec_name ?? null,
    pixFmt,
    alpha: !!pixFmt && /^(yuva|rgba|argb|bgra|abgr|gbrap|ya)/.test(pixFmt),
    audioChannels: a ? (a.channels || 2) : 0,
    audioRate: a ? (parseInt(a.sample_rate, 10) || 48000) : 0,
    timecode: tc ? tcTag : null,
    tcStartSeconds: tc ? tc.seconds : 0,
    tcStartFrames: tc ? tc.frames : 0,
  };
}

/**
 * RMS envelope of the first audio stream, in dBFS per window. Streams PCM so hour-long files stay cheap.
 * start/end (seconds) limit the analysed range; returned times are relative to `start`.
 */
export function audioEnvelope(file, { start = 0, end = null, rate = 16000, win = 0.01 } = {}) {
  return new Promise((resolve, reject) => {
    const args = ['-hide_banner', '-loglevel', 'error'];
    if (start) args.push('-ss', String(start));
    if (end != null) args.push('-to', String(end));
    args.push('-i', file, '-vn', '-ac', '1', '-ar', String(rate), '-f', 's16le', '-acodec', 'pcm_s16le', '-');
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const n = Math.max(1, Math.round(rate * win));
    const out = [];
    let acc = 0, cnt = 0, carry = null, err = '';
    p.stdout.on('data', (buf) => {
      if (carry) { buf = Buffer.concat([carry, buf]); carry = null; }
      const usable = buf.length - (buf.length % 2);
      if (usable < buf.length) carry = buf.subarray(usable);
      for (let i = 0; i < usable; i += 2) {
        const s = buf.readInt16LE(i) / 32768;
        acc += s * s; cnt++;
        if (cnt === n) { out.push(10 * Math.log10(acc / n + 1e-12)); acc = 0; cnt = 0; }
      }
    });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg envelope failed: ${err.slice(-1500)}`));
      if (cnt > n / 2) out.push(10 * Math.log10(acc / cnt + 1e-12));
      resolve({ db: Float32Array.from(out), win, start });
    });
  });
}

export function percentile(sorted, p) {
  if (!sorted.length) return NaN;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i];
}

/**
 * Adaptive threshold: floor = 10th percentile (clamped to >= -70 dBFS so digital silence does not drag it down),
 * speech = 90th percentile, threshold = floor + max(6 dB, 30% of the floor-to-speech span).
 */
export function levelStats(db, { floorClamp = -70, frac = 0.3, minRise = 6 } = {}) {
  const sorted = Array.from(db).sort((a, b) => a - b);
  const floor = Math.max(percentile(sorted, 0.10), floorClamp);
  const speech = percentile(sorted, 0.90);
  const threshold = floor + Math.max(minRise, (speech - floor) * frac);
  return { floor: +floor.toFixed(1), speech: +speech.toFixed(1), threshold: +threshold.toFixed(1) };
}

/**
 * Silent runs (below threshold) at least `minSilence` long, after bridging voiced blips shorter than `minVoiced`
 * (clicks, lip smacks). Returns [{ s, e }] in seconds relative to the envelope start.
 */
export function silentRuns(env, threshold, { minSilence = 0.12, minVoiced = 0.04 } = {}) {
  const { db, win } = env;
  const voiced = new Uint8Array(db.length);
  for (let i = 0; i < db.length; i++) voiced[i] = db[i] > threshold ? 1 : 0;
  // drop voiced blips shorter than minVoiced
  const minV = Math.max(1, Math.round(minVoiced / win));
  for (let i = 0; i < voiced.length;) {
    if (!voiced[i]) { i++; continue; }
    let j = i; while (j < voiced.length && voiced[j]) j++;
    if (j - i < minV) voiced.fill(0, i, j);
    i = j;
  }
  const runs = [];
  const minS = Math.max(1, Math.round(minSilence / win));
  for (let i = 0; i < voiced.length;) {
    if (voiced[i]) { i++; continue; }
    let j = i; while (j < voiced.length && !voiced[j]) j++;
    if (j - i >= minS) runs.push({ s: +(i * win).toFixed(3), e: +(j * win).toFixed(3) });
    i = j;
  }
  return runs;
}

/** Mean dB of the envelope over [a, b) seconds (relative to envelope start). */
export function meanDb(env, a, b) {
  const i0 = Math.max(0, Math.floor(a / env.win)), i1 = Math.min(env.db.length, Math.ceil(b / env.win));
  if (i1 <= i0) return -120;
  let s = 0; for (let i = i0; i < i1; i++) s += Math.pow(10, env.db[i] / 10);
  return 10 * Math.log10(s / (i1 - i0) + 1e-12);
}

export function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }

/** drawtext needs a font file on Windows (fontconfig has no config there). Returns "fontfile='C\:/...'" or null. */
export function drawtextFont() {
  const cands = [process.env.DRAWTEXT_FONT, 'C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/segoeui.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf'].filter(Boolean);
  const f = cands.find((p) => fs.existsSync(p));
  return f ? `fontfile='${f.replace(/\\/g, '/').replace(/:/g, '\\:')}'` : null;
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2); const v = argv[i + 1];
      if (v === undefined || (v.startsWith('--') && !/^--?\d/.test(v))) args[k] = true; else { args[k] = v; i++; }
    } else args._.push(a);
  }
  return args;
}
