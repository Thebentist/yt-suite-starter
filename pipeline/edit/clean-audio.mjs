#!/usr/bin/env node
/* Dialogue cleanup BEFORE the cut: process the raw take's audio and remux it with the untouched video.
 *
 *   node pipeline/edit/clean-audio.mjs --in videos/<slug>/raw/take.mp4 [--out videos/<slug>/work/take.clean.mov]
 *        [--lufs -16] [--tp -1.5] [--hp 70] [--nr 10] [--denoise | --no-denoise] [--no-compress] [--no-expand]
 *
 * Chain (ffmpeg): high-pass (rumble) -> afftdn noise reduction calibrated on the measured room tone -> gentle compressor
 * (threshold 6 dB under the measured speech level, 3:1, 5 ms / 150 ms) -> two-pass loudnorm to --lufs / --tp (linear
 * when possible). Video is stream-copied; audio becomes 48 kHz 24-bit PCM in a .mov. The raw file is never modified.
 * Why before the cut: every clip then plays already-levelled audio, no live effects to render (clean-davinci-dialogue).
 *
 * Proof it did no harm, written to <out>.json next to the file:
 *   loudness before/after (integrated LUFS, LRA, true peak); room noise measured in the SAME ten quietest half-second
 *   windows of the original; speech level; sample-accurate sync (cross-correlation of 8 kHz audio over 3 stretches,
 *   lag must be 0); equal duration. The build refuses the file if sync or duration is off.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, runFF, probeMedia, audioEnvelope, levelStats, parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

/** ebur128 integrated loudness, LRA and true peak of a file (or of a filter chain applied to it). */
export async function loudness(file, af = '') {
  const log = await runFF(['-hide_banner', '-nostats', '-i', file, '-vn', '-af', `${af ? af + ',' : ''}ebur128=peak=true`, '-f', 'null', '-']);
  const s = log.slice(log.lastIndexOf('Summary:'));
  const num = (re) => { const m = re.exec(s); return m ? +m[1] : null; };
  return { lufs: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), truePeak: num(/Peak:\s+(-?[\d.]+) dBFS/) };
}

/** Decode [start, start+dur) of a file's first audio stream to 8 kHz mono float samples. */
function pcm(file, start, dur, rate = 8000) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-ss', String(start), '-t', String(dur), '-i', file, '-vn', '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-']);
    const chunks = []; p.stdout.on('data', (d) => chunks.push(d)); p.on('error', reject);
    p.on('close', (code) => { if (code) return reject(new Error('ffmpeg pcm failed')); const b = Buffer.concat(chunks); resolve(new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4))); });
  });
}

/** Lag (samples at 8 kHz) that best aligns b to a, searched over +-maxLag, by normalized cross-correlation. */
function bestLag(a, b, maxLag = 400) {
  let best = { lag: 0, r: -Infinity };
  const n = Math.min(a.length, b.length) - 2 * maxLag;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let s = 0, sa = 0, sb = 0;
    for (let i = maxLag; i < maxLag + n; i += 2) { const x = a[i], y = b[i + lag]; s += x * y; sa += x * x; sb += y * y; }
    const r = s / Math.sqrt(sa * sb + 1e-12);
    if (r > best.r) best = { lag, r };
  }
  return best;
}

/** Delay (in 48 kHz samples) a filter chain adds, measured on 20 s of the input. */
async function chainDelay(input, af, at, tmpBase) {
  const ref = `${tmpBase}.lat-ref.wav`, out = `${tmpBase}.lat-out.wav`;
  await runFF(['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(at), '-t', '20', '-i', input, '-vn', '-ar', '48000', '-c:a', 'pcm_s24le', ref]);
  await runFF(['-y', '-hide_banner', '-loglevel', 'error', '-i', ref, '-af', af, '-ar', '48000', '-c:a', 'pcm_s24le', out]);
  const r = bestLag(await pcm(ref, 0, 20), await pcm(out, 0, 20));
  fs.rmSync(ref, { force: true }); fs.rmSync(out, { force: true });
  return { samples48k: r.lag * 6, r: r.r };
}

export async function cleanAudio({ input, output, lufs = -16, tp = -1.5, hp = 70, nr = 10, denoise = 'auto', compress = true, expand = true }) {
  const media = probeMedia(input);
  if (!media.hasAudio) throw new Error('no audio stream');
  const env = await audioEnvelope(input);
  const lv = levelStats(env.db);
  // room tone = the quietest 5% of 10 ms frames (true pauses). The quietest half-seconds are NOT room tone: on a real
  // take they held breaths and mouth sounds 16 dB above the true floor, which compression then lifts, as it should.
  const frames = [...env.db].filter((d) => d > -110).sort((x, y) => x - y);
  const roomDb = frames[Math.floor(frames.length * 0.05)];
  const roomFrames = []; for (let i = 0; i < env.db.length; i++) if (env.db[i] <= roomDb && env.db[i] > -110) roomFrames.push(i);
  const snr = lv.speech - roomDb;
  // afftdn is slow and adds a fixed delay (25 ms measured, compensated below); OBS-style sources are often already
  // gated to near-silence (-80 dBFS measured), so it only runs on a genuinely noisy room, with a gentle expander after it
  const useDenoise = denoise === 'auto' ? snr < 40 : !!denoise;
  const nf = Math.max(-80, Math.min(-20, Math.round(roomDb)));
  const pre = [
    `highpass=f=${hp}`,
    useDenoise ? `afftdn=nr=${nr}:nf=${nf}:tn=1` : null,
    // gentle downward expander for the pauses (noisy rooms only): 2:1 below 10 dB over the room tone, at most ~10 dB
    // less, slow release so word tails are not chopped (checked below)
    useDenoise && expand ? `agate=threshold=${(10 ** ((roomDb + 10) / 20)).toFixed(5)}:ratio=2:range=0.3:attack=5:release=250:knee=4` : null,
    compress ? `acompressor=threshold=${(10 ** ((lv.speech - 6) / 20)).toFixed(5)}:ratio=3:attack=5:release=150:knee=3:makeup=1` : null,
  ].filter(Boolean).join(',');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const base = output.replace(/\.[^.]+$/, '');
  const delay = useDenoise ? await chainDelay(input, pre, Math.min(60, media.duration / 3), base) : { samples48k: 0, r: 1 };
  const before = await loudness(input);
  // static gain to the target (never the dynamic loudnorm: it pumps the room tone up in every pause), then a
  // latency-compensated limiter a little under the true-peak target
  const mid = await loudness(input, pre);
  const gain = +(lufs - mid.lufs).toFixed(2);
  const limit = 10 ** ((tp - 0.5) / 20);
  const comp = delay.samples48k > 0 ? `,atrim=start_sample=${delay.samples48k},asetpts=PTS-STARTPTS,apad=pad_len=${delay.samples48k}` : '';
  const chain = `aresample=48000,${pre}${comp},volume=${gain}dB,alimiter=limit=${limit.toFixed(4)}:attack=5:release=50:level=false:latency=1`;
  const wav = base + '.dialogue.wav';
  await runFF(['-y', '-hide_banner', '-nostats', '-i', input, '-vn', '-af', chain, '-c:a', 'pcm_s24le', '-ar', '48000', '-t', media.duration.toFixed(6), wav]);
  const js2 = { normalization_type: `static gain ${gain} dB + limiter` };
  // remux: untouched video + processed audio (exact sample count kept by -t of the audio's own length)
  await runFF(['-y', '-hide_banner', '-loglevel', 'error', '-i', input, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'pcm_s24le', '-movflags', '+faststart', output]);
  const outMedia = probeMedia(output);
  const after = await loudness(wav);
  // sync: three stretches (start, middle, end), sample-accurate at 8 kHz
  const spots = [5, media.duration / 2, Math.max(5, media.duration - 25)].map((t) => Math.max(0, Math.min(t, media.duration - 20)));
  const sync = [];
  for (const t of spots) { const a = await pcm(input, t, 15), b = await pcm(wav, t, 15); const r = bestLag(a, b); sync.push({ at: +t.toFixed(1), lagSamples8k: r.lag, lagMs: +(r.lag / 8).toFixed(3), r: +r.r.toFixed(3) }); }
  // room tone in the SAME 10 ms frames, before and after (power average)
  const envAfter = await audioEnvelope(wav);
  const pw = (e, ii) => 10 * Math.log10(ii.reduce((s, i) => s + 10 ** ((e.db[i] ?? -120) / 10), 0) / Math.max(1, ii.length));
  const roomBefore = pw(env, roomFrames), roomAfter = pw(envAfter, roomFrames);
  const lvAfter = levelStats(envAfter.db);
  // quiet speech (word onsets and tails: 0-10 dB over the speech threshold in the original): how much did the chain
  // push it down beyond the static gain? The expander must not eat these.
  const qd = [];
  for (let i = 0; i < env.db.length && i < envAfter.db.length; i++) if (env.db[i] >= lv.threshold && env.db[i] < lv.threshold + 10) qd.push(envAfter.db[i] - env.db[i] - gain);
  qd.sort((x, y) => x - y);
  const report = {
    input: rel(input), output: rel(output), dialogueWav: rel(wav), chain,
    loudnormMode: js2.normalization_type, target: { lufs, truePeak: tp }, gainDb: gain,
    denoise: { used: useDenoise, why: denoise === 'auto' ? `speech-to-room-tone ${snr.toFixed(1)} dB ${useDenoise ? '< 40' : '>= 40: already clean'}` : 'forced', delayCompensatedSamples48k: delay.samples48k },
    quietSpeech: { frames: qd.length, medianChangeDb: qd.length ? +qd[Math.floor(qd.length / 2)].toFixed(1) : null, p10ChangeDb: qd.length ? +qd[Math.floor(qd.length * 0.1)].toFixed(1) : null, note: 'level change of quiet speech beyond the static gain; below -6 dB at p10 would mean the expander is eating word edges' },
    before: { ...before, speechDb: lv.speech, floorDb: lv.floor }, after: { ...after, speechDb: lvAfter.speech, floorDb: lvAfter.floor },
    roomTone: { frames: roomFrames.length, beforeDb: +roomBefore.toFixed(1), afterDb: +roomAfter.toFixed(1), note: 'the quietest 5% of 10 ms frames of the original, measured in the same frames after' },
    speechToRoomDb: { before: +(lv.speech - roomBefore).toFixed(1), after: +(lvAfter.speech - roomAfter).toFixed(1) },
    sync, inSync: sync.every((s) => s.lagSamples8k === 0 && s.r > 0.5),
    duration: { input: +media.duration.toFixed(3), output: +outMedia.duration.toFixed(3) },
    durationOk: Math.abs(media.duration - outMedia.duration) < 0.05,
    listened: false,
  };
  fs.writeFileSync(output.replace(/\.[^.]+$/, '') + '.json', JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.in) { console.error('usage: --in <raw video> [--out <work/x.clean.mov>] [--lufs -16] [--tp -1.5] [--hp 70] [--nr 10] [--no-denoise] [--no-compress]'); process.exit(1); }
  const input = path.resolve(ROOT, args.in);
  const rd = path.dirname(input);
  const output = path.resolve(ROOT, args.out || path.join(path.basename(rd) === 'raw' ? path.join(path.dirname(rd), 'work') : rd, path.basename(input, path.extname(input)) + '.clean.mov'));
  const t0 = Date.now();
  const r = await cleanAudio({ input, output, lufs: +(args.lufs ?? -16), tp: +(args.tp ?? -1.5), hp: +(args.hp ?? 70), nr: +(args.nr ?? 10), denoise: args['no-denoise'] ? false : args.denoise ? true : 'auto', compress: !args['no-compress'], expand: !args['no-expand'] });
  console.log(`[clean] ${r.output} in ${((Date.now() - t0) / 1000).toFixed(0)} s (${r.loudnormMode}); noise reduction ${r.denoise.used ? `on, delay ${r.denoise.delayCompensatedSamples48k} samples compensated` : 'off'} (${r.denoise.why})`);
  console.log(`[clean] quiet speech (word edges) changed by median ${r.quietSpeech.medianChangeDb} dB, p10 ${r.quietSpeech.p10ChangeDb} dB beyond the gain`);
  console.log(`[clean] loudness ${r.before.lufs} -> ${r.after.lufs} LUFS, true peak ${r.before.truePeak} -> ${r.after.truePeak} dBTP, LRA ${r.before.lra} -> ${r.after.lra} LU`);
  console.log(`[clean] room tone (same quietest frames) ${r.roomTone.beforeDb} -> ${r.roomTone.afterDb} dBFS; speech-to-room ${r.speechToRoomDb.before} -> ${r.speechToRoomDb.after} dB`);
  console.log(`[clean] sync ${r.sync.map((s) => `${s.at}s: ${s.lagMs} ms (r ${s.r})`).join(', ')} -> ${r.inSync ? 'IN SYNC' : 'OUT OF SYNC'}; duration ${r.duration.input} -> ${r.duration.output} s`);
  if (!r.inSync || !r.durationOk) { console.error('[clean] REFUSED: sync or duration check failed; do not use this file'); process.exit(1); }
}
