#!/usr/bin/env node
/* Re-time a transcript's words by transcribing the recording in speech chunks.
 *
 * whisper.cpp stamps the first words after a pause with the START of the pause (seen on the 2026-09-28 raw: nine words
 * at 154.44-154.46 s, sentence-final words ending early), and build-timeline places its cut edges on those times, so
 * retakes leaked in and sentence ends were clipped. Here the audio is split at silences (so every chunk starts at the
 * speech), all chunks are transcribed in ONE whisper run (model loaded once), and the chunk-relative word times are
 * carried back onto the existing transcript by text alignment. Word indices do not change (paper edits keep working).
 *
 *   node pipeline/edit/retime-words.mjs --in videos/x/work/take.clean.wav --words videos/x/raw/transcript.words.json
 *        [--min-silence 0.35] [--pad 0.12] [--max-chunk 25]
 * Writes <words>.orig.json once (the untouched original) and overwrites <words> with re-timed times, plus
 * <words dir>/retime-report.json. Words whisper does not hear again keep their old times (listed in the report).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, levelStats, silentRuns, parseArgs } from '../resolve/media.mjs';
import { alignWords, whisperJsonToWords } from './words-merge.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
if (!args.in || !args.words) { console.error('usage: --in <audio/video> --words <transcript.words.json>'); process.exit(1); }
const minSil = +(args['min-silence'] ?? 0.35), pad = +(args.pad ?? 0.12), maxChunk = +(args['max-chunk'] ?? 25);
const wordsPath = path.resolve(ROOT, args.words), origPath = wordsPath.replace(/\.json$/, '.orig.json');
if (!fs.existsSync(origPath)) fs.copyFileSync(wordsPath, origPath);
const words = JSON.parse(fs.readFileSync(origPath, 'utf8'));
const work = path.join(path.dirname(wordsPath), 'retime-chunks'); fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true });
const R = 16000;

// 16 kHz mono PCM and a 10 ms envelope
const raw = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', path.resolve(ROOT, args.in), '-map', '0:a:0', '-ac', '1', '-ar', String(R), '-f', 's16le', '-'], { maxBuffer: 2 ** 30 });
if (raw.status !== 0) { console.error(String(raw.stderr)); process.exit(1); }
const pcm = new Int16Array(raw.stdout.buffer, raw.stdout.byteOffset, raw.stdout.length >> 1);
const N = R / 100, db = new Float32Array(Math.floor(pcm.length / N));
for (let w = 0; w < db.length; w++) { let a = 0; for (let i = w * N; i < (w + 1) * N; i++) { const s = pcm[i] / 32768; a += s * s; } db[w] = 10 * Math.log10(a / N + 1e-12); }
const env = { db, win: 0.01, start: 0 }, lv = levelStats(db), total = pcm.length / R;
const sil = silentRuns(env, lv.threshold, { minSilence: minSil });
// speech chunks between silences, padded; long chunks split at their longest inner pause (>= 0.15 s)
let chunks = []; let s0 = 0;
for (const r of sil) { if (r.s > s0) chunks.push([Math.max(0, s0 - pad), Math.min(total, r.s + pad)]); s0 = r.e; }
if (s0 < total) chunks.push([Math.max(0, s0 - pad), total]);
chunks = chunks.filter(([a, b]) => b - a > 0.25);
const inner = silentRuns(env, lv.threshold, { minSilence: 0.15 });
const split = (a, b) => {
  if (b - a <= maxChunk) return [[a, b]];
  const cands = inner.filter((r) => r.s > a + 3 && r.e < b - 3).sort((x, y) => (y.e - y.s) - (x.e - x.s));
  if (!cands.length) return [[a, b]];
  const m = (cands[0].s + cands[0].e) / 2; return [...split(a, m + 0.05), ...split(m - 0.05, b)];
};
chunks = chunks.flatMap(([a, b]) => split(a, b));
const wav = (file, a, b) => {
  const seg = pcm.subarray(Math.floor(a * R), Math.floor(b * R)), n = seg.length, h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + n * 2, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(R, 24); h.writeUInt32LE(R * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(n * 2, 40);
  fs.writeFileSync(file, Buffer.concat([h, Buffer.from(seg.buffer, seg.byteOffset, n * 2)]));
};
const files = chunks.map(([a, b], k) => { const f = path.join(work, `c${String(k).padStart(4, '0')}.wav`); wav(f, a, b); return f; });
console.log(`[retime] ${chunks.length} speech chunks (silence >= ${minSil}s, pad ${pad}s), median ${(chunks.map(([a, b]) => b - a).sort((x, y) => x - y)[chunks.length >> 1]).toFixed(1)}s`);

// one whisper run over every chunk (batches keep the command line short)
const model = path.resolve(ROOT, ['tools/ggml-medium.en.bin', 'tools/ggml-small.en.bin', 'tools/ggml-base.en.bin'].find((m) => fs.existsSync(path.resolve(ROOT, m))));
const gpu = path.resolve(ROOT, 'tools/whisper-cuda/Release/whisper-cli.exe');
const whisper = fs.existsSync(gpu) ? gpu : path.resolve(ROOT, 'tools/whisper/Release/whisper-cli.exe');
const t0 = Date.now();
for (let b = 0; b < files.length; b += 120) {
  const batch = files.slice(b, b + 120);
  const r = spawnSync(whisper, ['-m', model, '-l', 'en', '-ml', '1', '-oj', '-np', ...batch.flatMap((f) => ['-f', f])], { encoding: 'utf8', maxBuffer: 256 << 20, cwd: work });
  if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(1); }
}
console.log(`[retime] whisper ${((Date.now() - t0) / 1000).toFixed(0)}s`);
const heard = [];
chunks.forEach(([a], k) => {
  const jf = files[k] + '.json'; if (!fs.existsSync(jf)) return;
  for (const w of whisperJsonToWords(JSON.parse(fs.readFileSync(jf, 'utf8')))) heard.push({ t: +(a + w.t).toFixed(3), end: +(a + w.end).toFixed(3), w: w.w, chunk: k });
});
// the chunks overlap by the padding: drop words heard twice (same text within 0.3 s)
heard.sort((x, y) => x.t - y.t);
const dedup = heard.filter((w, k) => !(k && heard[k - 1].w === w.w && w.t - heard[k - 1].t < 0.3));

const pairs = alignWords(words, dedup);
const out = words.map((w) => ({ ...w }));
let moved = 0, big = 0, used = 0;
for (const [i, j] of pairs) {
  const h = dedup[j]; if (h.end - h.t < 0.02) continue;
  const d = Math.abs(h.t - out[i].t); if (d > 0.08) moved++; if (d > 0.5) big++;
  out[i].t = h.t; out[i].end = h.end; out[i].retimed = true; used++;
}
// keep order: an un-retimed word squeezed between re-timed neighbours is clamped into the gap
for (let i = 0; i < out.length; i++) {
  if (out[i].retimed) continue;
  const p = out[i - 1], n = out.slice(i + 1).find((x) => x.retimed);
  if (p && out[i].t < p.end) { out[i].t = p.end; out[i].end = Math.max(out[i].end, p.end + 0.05); }
  if (n && out[i].end > n.t) { out[i].end = n.t; if (out[i].t > out[i].end) out[i].t = Math.max(p ? p.end : 0, n.t - 0.1); }
}
for (const w of out) delete w.retimed;
fs.writeFileSync(wordsPath, JSON.stringify(out));
const report = { chunks: chunks.length, heard: dedup.length, words: words.length, aligned: pairs.length, used, movedOver80ms: moved, movedOver500ms: big, threshold: lv.threshold };
fs.writeFileSync(path.join(path.dirname(wordsPath), 'retime-report.json'), JSON.stringify(report, null, 1));
console.log('[retime]', JSON.stringify(report));
