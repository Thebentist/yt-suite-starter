#!/usr/bin/env node
/* Audio for an ElevenLabs voice clone: the host's mic from each recording, dead space cut down, level set to
 * ElevenLabs' guidance (-23 to -18 dB RMS, true peak -3 dB), MP3 192 kbps. The source files are only read.
 *
 *   node pipeline/edit/voice-clone-audio.mjs --out exports/elevenlabs-thebentist "E:/YT VIDEOS/<rec>_camera.mp4" ...
 *     [--max-pause 0.6] [--keep-after 0.2] [--keep-before 0.15] [--rms -20] [--peak -3] [--part-min 10] [--prefix ben-voice]
 *
 * Per input: picks the loudest audio stream (some recordings carry a near-silent second track), decodes it to 48 kHz
 * mono, finds silences with the pipeline's adaptive threshold (media.mjs levelStats/silentRuns), shortens every pause
 * longer than --max-pause to keep-after + keep-before (word tails and breaths stay), trims both ends, joins with 5 ms
 * fades, applies one static gain to the RMS target (no compression, no noise reduction), limits peaks, encodes, then
 * measures each MP3 (RMS, integrated LUFS, true peak, duration) and the output noise floor. Output longer than --part-min minutes is split into
 * near-equal parts at shortened pauses. If a screen recording (same name without `_camera`) sits beside the input,
 * it also measures whether the camera mic picked up the screen's audio (reacted clips playing out loud).
 * Writes <out>/<prefix>_<recording>[_partN].mp3 and <out>/report.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { FFPROBE, runFF, audioEnvelope, levelStats, silentRuns, percentile, ensureDir, parseArgs } from '../resolve/media.mjs';

const args = parseArgs(process.argv.slice(2));
const inputs = args._;
if (!inputs.length || !args.out) {
  console.error('usage: node pipeline/edit/voice-clone-audio.mjs --out <dir> <recording> [<recording> ...]');
  process.exit(1);
}
const OUT = ensureDir(path.resolve(args.out));
const WORK = ensureDir(path.join(OUT, '.work'));
const RATE = 48000, WIN = 0.01, N = RATE * WIN, FADE = Math.round(0.005 * RATE);
const maxPause = +(args['max-pause'] ?? 0.6), keepAfter = +(args['keep-after'] ?? 0.2), keepBefore = +(args['keep-before'] ?? 0.15);
const rmsTarget = +(args.rms ?? -20), peakTarget = +(args.peak ?? -3), partMax = +(args['part-min'] ?? 10) * 60;
const prefix = args.prefix ?? 'ben-voice';
const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;

function probe(f) {
  const r = spawnSync(FFPROBE, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', f], { encoding: 'utf8', maxBuffer: 32 << 20 });
  if (r.status) throw new Error(`ffprobe failed on ${f}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

async function meanVolume(f, k, dur) {
  const err = await runFF(['-hide_banner', '-ss', String(Math.min(60, dur / 4)), '-t', '120', '-i', f, '-map', `0:a:${k}`, '-af', 'volumedetect', '-f', 'null', '-']);
  const m = err.match(/mean_volume:\s*(-?[\d.]+)/);
  return m ? parseFloat(m[1]) : -Infinity;
}

function envelope(pcm) {
  const n = Math.floor(pcm.length / N), db = new Float32Array(n);
  for (let w = 0; w < n; w++) {
    let acc = 0;
    for (let i = w * N, e = i + N; i < e; i++) { const s = pcm[i] / 32768; acc += s * s; }
    db[w] = 10 * Math.log10(acc / N + 1e-12);
  }
  return { db, win: WIN, start: 0 };
}

function rmsDb(pcm) {
  let acc = 0;
  for (let i = 0; i < pcm.length; i++) { const s = pcm[i] / 32768; acc += s * s; }
  return 10 * Math.log10(acc / Math.max(1, pcm.length) + 1e-12);
}

function writeWav(file, pcm) {
  const bytes = pcm.length * 2, h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + bytes, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(bytes, 40);
  const fd = fs.openSync(file, 'w');
  fs.writeSync(fd, h);
  const body = Buffer.from(pcm.buffer, pcm.byteOffset, bytes);
  for (let off = 0; off < bytes;) off += fs.writeSync(fd, body, off, Math.min(bytes - off, 64 << 20));
  fs.closeSync(fd);
}

async function measure(f) {
  const err = await runFF(['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=peak=true,astats', '-f', 'null', '-']);
  const last = (re) => { const all = [...err.matchAll(re)]; return all.length ? parseFloat(all[all.length - 1][1]) : null; };
  const p = probe(f);
  return {
    sec: r1(+p.format.duration), mb: r1(+p.format.size / 1e6), bitrateK: Math.round(+p.format.bit_rate / 1000),
    rmsDb: last(/RMS level dB:\s*(-?[\d.]+)/g), lufs: last(/I:\s*(-?[\d.]+)\s*LUFS/g), truePeakDb: last(/Peak:\s*(-?[\d.]+)\s*dBFS/g),
  };
}

/* Does the camera mic hear the screen recording's audio? Correlation of the two level envelopes at the best lag
 * within +-2 s, and how often the camera is above its speech threshold while the screen audio is / is not. */
async function bleedCheck(camEnv, camThr, partner) {
  const scr = await audioEnvelope(partner, { rate: 16000, win: WIN });
  const lv = levelStats(scr.db);
  if (lv.speech < -60) return { partner: path.basename(partner), screenAudio: 'silent', screenSpeechDb: lv.speech };
  const a = camEnv.db, b = scr.db, fa = levelStats(a).floor, fb = lv.floor;
  const corrAt = (lag) => {
    let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
    for (let i = Math.max(0, -lag); i < a.length && i + lag < b.length; i++) {
      const x = Math.max(a[i], fa), y = Math.max(b[i + lag], fb);
      n++; sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y;
    }
    const cov = sab / n - (sa / n) * (sb / n), va = saa / n - (sa / n) ** 2, vb = sbb / n - (sb / n) ** 2;
    return cov / Math.sqrt(va * vb + 1e-12);
  };
  let best = { lag: 0, r: -2 };
  for (let lag = -200; lag <= 200; lag += 2) { const r = corrAt(lag); if (r > best.r) best = { lag, r }; }
  // OBS writes both files on one clock, so lag 0 unless the envelopes clearly line up elsewhere.
  const lag = best.r > 0.3 ? best.lag : 0;
  // Quiet-frame levels: in the camera's own pauses (host silent), is it louder while the screen audio plays?
  let on = 0, onCam = 0, off = 0, offCam = 0, qOn = 0, qOnN = 0, qOff = 0, qOffN = 0;
  for (let i = 0; i < a.length; i++) {
    const j = i + lag; if (j < 0 || j >= b.length) continue;
    const loud = b[j] > lv.threshold, voiced = a[i] > camThr;
    if (loud) { on++; if (voiced) onCam++; else { qOn += Math.pow(10, a[i] / 10); qOnN++; } }
    else { off++; if (voiced) offCam++; else { qOff += Math.pow(10, a[i] / 10); qOffN++; } }
  }
  const dB = (s, n) => r1(10 * Math.log10(s / Math.max(1, n) + 1e-12));
  return {
    partner: path.basename(partner), screenSpeechDb: lv.speech, screenAudioShare: r2(on / Math.max(1, on + off)),
    bestLagSec: r2(best.lag * WIN), envelopeCorr: r2(best.r), envelopeCorrAtZero: r2(corrAt(0)), lagUsedSec: r2(lag * WIN),
    camVoicedWhenScreenLoud: r2(onCam / Math.max(1, on)), camVoicedWhenScreenQuiet: r2(offCam / Math.max(1, off)),
    camPauseDbScreenLoud: dB(qOn, qOnN), camPauseDbScreenQuiet: dB(qOff, qOffN),
  };
}

async function processOne(f) {
  const info = probe(f), dur = +info.format.duration;
  const streams = info.streams.filter((s) => s.codec_type === 'audio');
  if (!streams.length) throw new Error(`${f}: no audio stream`);
  const vols = [];
  for (let k = 0; k < streams.length; k++) vols.push(await meanVolume(f, k, dur));
  const k = vols.indexOf(Math.max(...vols));
  const base = path.basename(f).replace(/\.[^.]+$/, '');
  const stem = `${prefix}_${base.replace(/_camera$/, '').replace(/\s+/g, '_')}`;
  console.log(`\n[clone-audio] ${path.basename(f)}: ${r1(dur / 60)} min, audio stream ${k} of ${streams.length} (mean ${vols.map(r1).join(' / ')} dB)`);

  const raw = path.join(WORK, `${stem}.s16`);
  await runFF(['-hide_banner', '-y', '-i', f, '-map', `0:a:${k}`, '-ac', '1', '-ar', String(RATE), '-f', 's16le', '-acodec', 'pcm_s16le', raw]);
  let buf = fs.readFileSync(raw);
  if (buf.byteOffset % 2) buf = Buffer.from(buf);
  const pcm = new Int16Array(buf.buffer, buf.byteOffset, buf.length >> 1);
  const srcSec = pcm.length / RATE;

  // Dead space: silences over maxPause shrink to keepAfter (after speech) + keepBefore (before speech); ends trimmed.
  const env = envelope(pcm), lv = levelStats(env.db);
  const runs = silentRuns(env, lv.threshold, { minSilence: maxPause });
  const envEnd = env.db.length * WIN;
  const removed = [];
  for (const r of runs) {
    const atStart = r.s <= 0, atEnd = r.e >= envEnd - 1e-6;
    const a = atStart ? 0 : r.s + keepAfter, b = atEnd ? srcSec : r.e - keepBefore;
    if (b - a > 0.02) removed.push([a, b]);
  }
  const kept = [];
  let t = 0;
  for (const [a, b] of removed) { if (a > t) kept.push([t, a]); t = Math.max(t, b); }
  if (t < srcSec) kept.push([t, srcSec]);
  const ks = kept.map(([a, b]) => [Math.round(a * RATE), Math.min(pcm.length, Math.round(b * RATE))]).filter(([a, b]) => b - a > 2 * FADE);
  const len = ks.reduce((s, [a, b]) => s + b - a, 0);
  const out = new Int16Array(len), joins = [];
  let o = 0;
  for (let j = 0; j < ks.length; j++) {
    const [a, b] = ks[j], n = b - a;
    out.set(pcm.subarray(a, b), o);
    if (j > 0) { for (let i = 0; i < FADE; i++) out[o + i] = Math.round((out[o + i] * i) / FADE); joins.push(o); }
    if (j < ks.length - 1) for (let i = 0; i < FADE; i++) { const p = o + n - 1 - i; out[p] = Math.round((out[p] * i) / FADE); }
    o += n;
  }
  fs.rmSync(raw, { force: true });

  const outEnv = envelope(out);
  let sp = 0, spN = 0;
  for (const d of outEnv.db) if (d > lv.threshold) { sp += Math.pow(10, d / 10); spN++; }
  const before = { rmsDb: r1(rmsDb(out)), speechRmsDb: r1(10 * Math.log10(sp / Math.max(1, spN) + 1e-12)) };
  const gain = rmsTarget - before.rmsDb;
  const wav = path.join(WORK, `${stem}.wav`);
  writeWav(wav, out);

  const outSec = out.length / RATE, nParts = Math.max(1, Math.ceil(outSec / partMax - 1e-9));
  const bounds = [0];
  for (let p = 1; p < nParts; p++) {
    const ideal = Math.round((p * out.length) / nParts);
    let best = ideal;
    for (const j of joins) if (Math.abs(j - ideal) < Math.abs(best - ideal) || best === ideal) best = j;
    if (best > bounds[bounds.length - 1]) bounds.push(best);
  }
  bounds.push(out.length);

  const parts = [];
  for (let p = 0; p + 1 < bounds.length; p++) {
    const name = bounds.length > 2 ? `${stem}_part${p + 1}.mp3` : `${stem}.mp3`, dst = path.join(OUT, name);
    let limitDb = peakTarget - 1, m;
    for (let attempt = 0; attempt < 3; attempt++) {
      const af = `atrim=start_sample=${bounds[p]}:end_sample=${bounds[p + 1]},asetpts=PTS-STARTPTS,highpass=f=70,` +
        `volume=${gain.toFixed(2)}dB:precision=float,alimiter=limit=${Math.pow(10, limitDb / 20).toFixed(4)}:attack=5:release=50:level=0:latency=1`;
      await runFF(['-hide_banner', '-y', '-i', wav, '-af', af, '-c:a', 'libmp3lame', '-b:a', '192k', dst]);
      m = await measure(dst);
      if (m.truePeakDb == null || m.truePeakDb <= peakTarget) break;
      limitDb -= 0.7;
    }
    parts.push({ file: name, limiterDb: r1(limitDb), ...m });
    console.log(`[clone-audio]   ${name}: ${r1(m.sec / 60)} min, ${m.mb} MB, RMS ${m.rmsDb} dB, ${m.lufs} LUFS, true peak ${m.truePeakDb} dB`);
  }
  fs.rmSync(wav, { force: true });

  let bleed = null;
  const partner = path.join(path.dirname(f), base.replace(/_camera$/, '') + path.extname(f));
  if (/_camera$/.test(base) && fs.existsSync(partner)) bleed = await bleedCheck(env, lv.threshold, partner);

  // Noise floor as the clone will hear it: the quietest 5% of 10 ms windows in the output, after gain, leaving out
  // windows a noise gate made digitally silent (levelStats clamps its floor at -70 dBFS, so it cannot show this).
  const audible = Array.from(outEnv.db).filter((d) => d > -100).sort((x, y) => x - y);
  const noiseFloorDb = r1(percentile(audible, 0.05) + gain), gatedShare = r2(1 - audible.length / outEnv.db.length);
  const shortened = removed.filter(([a, b]) => a > 0 && b < srcSec).length;
  const rep = {
    source: f, audioStream: k, streamMeanDb: vols.map(r1), sourceMin: r1(srcSec / 60), outputMin: r1(outSec / 60),
    keptShare: r2(outSec / srcSec), pausesShortened: shortened, levels: lv, before, gainDb: r1(gain),
    noiseFloorDb, gatedShare, settings: { maxPause, keepAfter, keepBefore, rmsTarget, peakTarget, partMaxMin: partMax / 60 },
    parts, bleed,
  };
  console.log(`[clone-audio]   ${r1(srcSec / 60)} -> ${r1(outSec / 60)} min (${shortened} pauses shortened), gain ${r1(gain)} dB, noise floor ${noiseFloorDb} dBFS (gated ${Math.round(gatedShare * 100)}%)` +
    (bleed ? `, screen bleed check ${JSON.stringify(bleed)}` : ''));
  return rep;
}

const reportFile = path.join(OUT, 'report.json');
const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : { items: [] };
for (const f of inputs) {
  const rep = await processOne(path.resolve(f));
  report.items = report.items.filter((x) => x.source !== rep.source).concat(rep);
  report.updated = new Date().toISOString();
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
}
try { fs.rmdirSync(WORK); } catch {}
const tot = report.items.reduce((s, x) => s + x.outputMin, 0);
console.log(`\n[clone-audio] done: ${report.items.length} recordings, ${r1(tot)} min of audio in ${OUT}`);
