#!/usr/bin/env node
/* Find leftover retakes in a cut by listening to it in small chunks.
 *
 * Whisper, given a whole take, often writes a phrase said twice only once ("because to be honest... because to be
 * honest" came out as one), so a transcript can look clean while the audio has a false start. Here the cut's own audio
 * (work/cut-audio16k.wav, from `assemble.mjs --stage audio`) is split at short silences into 1-6 s chunks and each
 * chunk is transcribed separately, so a repeat can't be merged across chunks. Then:
 *   stutter   the same word twice in a row ("because, because")            -> remove the first
 *   restart   a 2-6 word phrase that comes again within ~10 words / 8 s      -> remove from the first to the second
 * Each candidate gets its cut time, its raw range (edit/beats.json pieces) and context. Some are deliberate
 * (parallel phrasing: "you're probably brushing, you're probably flossing"; emphasis: "very, very", "super, super"):
 * JUDGE EVERY ONE before turning it into a fixes.json removal.
 *
 *   node pipeline/edit/find-retakes.mjs --slug bad-breath-for-good     -> edit/retakes.json + a readable list
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';
import { whisperJsonToWords, normWord } from './words-merge.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const a = parseArgs(process.argv.slice(2));
const VD = path.join(ROOT, 'videos', a.slug);
const b = fs.readFileSync(path.join(VD, 'work', 'cut-audio16k.wav'));
const pcm = new Int16Array(b.buffer, b.byteOffset + 44, (b.length - 44) >> 1), R = 16000, N = 160;
const pieces = JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'beats.json'), 'utf8')).pieces;
const nF = Math.floor(pcm.length / N), db = new Float32Array(nF);
for (let w = 0; w < nF; w++) { let s = 0; for (let i = w * N; i < (w + 1) * N; i++) s += (pcm[i] / 32768) ** 2; db[w] = 10 * Math.log10(s / N + 1e-12); }
// chunk boundaries: silences (< -45 dB) of >= 0.1 s, chunks 1-6 s (long ones split at their quietest 50 ms)
const quiet = []; for (let i = 0; i < nF;) { if (db[i] >= -45) { i++; continue; } let j = i; while (j < nF && db[j] < -45) j++; if (j - i >= 10) quiet.push((i + j) / 2); i = j; }
let cuts = [0]; for (const q of quiet) if (q - cuts[cuts.length - 1] >= 100) cuts.push(q); cuts.push(nF);
const bounds = [];
for (let k = 0; k + 1 < cuts.length; k++) {
  let s = cuts[k], e = cuts[k + 1];
  while (e - s > 600) { let best = s + 300, bv = 1e9; for (let i = s + 150; i < Math.min(e - 100, s + 600); i++) { const v = (db[i] + db[i + 1] + db[i + 2] + db[i + 3] + db[i + 4]) / 5; if (v < bv) { bv = v; best = i; } } bounds.push([s, best]); s = best; }
  bounds.push([s, e]);
}
const dir = path.join(VD, 'work', 'retake-chunks'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const files = bounds.map(([s, e], k) => {
  const seg = pcm.subarray(s * N, e * N), n = seg.length, h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + n * 2, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(R, 24); h.writeUInt32LE(R * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(n * 2, 40);
  const f = path.join(dir, `k${String(k).padStart(4, '0')}.wav`); fs.writeFileSync(f, Buffer.concat([h, Buffer.from(seg.buffer, seg.byteOffset, n * 2)])); return f;
});
const model = path.join(ROOT, 'tools', fs.existsSync(path.join(ROOT, 'tools/ggml-small.en.bin')) ? 'ggml-small.en.bin' : 'ggml-base.en.bin');
const gpu = path.join(ROOT, 'tools/whisper-cuda/Release/whisper-cli.exe'), whisper = fs.existsSync(gpu) ? gpu : path.join(ROOT, 'tools/whisper/Release/whisper-cli.exe');
for (let k = 0; k < files.length; k += 150) {
  const r = spawnSync(whisper, ['-m', model, '-l', 'en', '-ml', '1', '-oj', '-np', ...files.slice(k, k + 150).flatMap((f) => ['-f', f])], { encoding: 'utf8', cwd: dir, maxBuffer: 256 << 20 });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
}
const W = [];
bounds.forEach(([s], k) => { const jf = files[k] + '.json'; if (!fs.existsSync(jf)) return; for (const w of whisperJsonToWords(JSON.parse(fs.readFileSync(jf, 'utf8')))) W.push({ t: +(s / 100 + w.t).toFixed(3), end: +(s / 100 + w.end).toFixed(3), w: w.w, n: normWord(w.w), chunk: k }); });
const toRaw = (t) => { const p = pieces.find((x) => t >= x.at - 1e-6 && t < x.at + x.dur); return p ? +(p.in + (t - p.at)).toFixed(3) : null; };
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;
const EMPH = new Set(['very', 'super', 'really', 'yada', 'no', 'ha', 'so', 'much', 'more', 'long', 'bye', 'go', 'do', 'the', 'a', 'and', 'that', 'is', 'it']);
const ctx = (i, j) => W.slice(Math.max(0, i - 4), Math.min(W.length, j + 6)).map((x, k) => (Math.max(0, i - 4) + k >= i && Math.max(0, i - 4) + k < j ? `[${x.w}]` : x.w)).join(' ');
const cands = [];
for (let i = 0; i + 1 < W.length; i++) {
  if (W[i].n && W[i].n === W[i + 1].n && !EMPH.has(W[i].n) && W[i + 1].t - W[i].t < 1.5) cands.push({ kind: 'stutter', i, j: i + 1, t0: W[i].t, t1: W[i + 1].t, text: W[i].w, context: ctx(i, i + 1) });
}
for (let i = 0; i < W.length; i++) {
  for (let n = 6; n >= 2; n--) {
    const A = W.slice(i, i + n).map((x) => x.n); if (A.length < n || A.some((x) => !x)) continue;
    if (A.every((x) => EMPH.has(x))) continue;
    let hit = -1;
    for (let m = i + n; m <= i + n + 10 && m + n <= W.length; m++) { if (W[m].t - W[i].t > 8) break; if (W.slice(m, m + n).every((x, k) => x.n === A[k])) { hit = m; break; } }
    if (hit < 0) continue;
    if (!cands.some((c) => c.kind === 'restart' && c.i <= i && c.j >= hit)) cands.push({ kind: 'restart', i, j: hit, n, t0: W[i].t, t1: W[hit].t, text: W.slice(i, hit).map((x) => x.w).join(' '), context: ctx(i, hit) });
    break;
  }
}
cands.sort((x, y) => x.t0 - y.t0);
const outList = cands.map((c, k) => ({ id: `r${String(k + 1).padStart(2, '0')}`, kind: c.kind, at: fmt(c.t0), cut: [c.t0, c.t1], raw: [toRaw(c.t0), toRaw(Math.max(c.t0, c.t1 - 0.005))], removes: c.text, context: c.context }));
fs.writeFileSync(path.join(VD, 'edit', 'retakes.json'), JSON.stringify({ chunks: bounds.length, words: W.length, candidates: outList }, null, 1));
fs.writeFileSync(path.join(VD, 'work', 'cut-chunk-words.json'), JSON.stringify(W));
console.log(`${bounds.length} chunks, ${W.length} words heard, ${outList.length} candidates`);
for (const c of outList) console.log(`${c.id} ${c.at} ${c.kind.padEnd(7)} raw ${c.raw.join('-')}  removes "${c.removes}"\n      ${c.context}`);
