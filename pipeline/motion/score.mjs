#!/usr/bin/env node
/* An original score, synthesised to the cut (no samples, nothing licensed): ambient pads, a sub pulse, a plucked
 * arpeggio with ping-pong echoes and a soft beat, arranged by a list of sections, then ducked under the dialogue.
 *
 *   node pipeline/motion/score.mjs --slug bad-breath-for-good [--sections edit/score.json] [--bpm 96]
 *
 * edit/score.json (at = timeline seconds, or anchor = { word, edge, offset } on the cut): { "bpm": 96, "sections": [ { "at": 0, "energy": 0.4, "layers": ["pad","arp"], "key": 0 }, ...],
 *   "hits": [ { "at": 66.1, "kind": "drop" } ] }    energy 0..1; layers from pad, sub, arp, beat, hat; key = semitones
 * Ducking: work/cut-audio16k.wav (the dialogue of the cut) drives a gain rider (-9 dB under speech, 60 ms attack,
 * 350 ms release). Writes music/score.wav (48 kHz stereo) and music/score-dry.wav (un-ducked).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const VD = path.join(ROOT, 'videos', args.slug);
const cfg = JSON.parse(fs.readFileSync(path.join(VD, args.sections || 'edit/score.json'), 'utf8'));
// sections and hits can be pinned to a word of the cut instead of a time: { anchor: { word: <raw id>, edge: 'end', offset } }
// (resolved through edit/cut-words.json, so the arrangement follows any re-cut)
{
  const cw = JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'cut-words.json'), 'utf8')).words, byI = new Map(cw.map((w) => [w.i, w]));
  const find = (i) => { for (let d = 0; d < 30; d++) { const w = byI.get(i + d) || byI.get(i - d); if (w) return w; } throw new Error('score anchor: word not in cut: ' + i); };
  for (const x of [...cfg.sections, ...(cfg.hits || [])]) if (x.anchor) { const w = find(x.anchor.word); x.at = Math.max(0, (x.anchor.edge === 'end' ? w.end : w.t) + (x.anchor.offset || 0)); }
}
const total = JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'beats.json'), 'utf8')).total;
const R = 48000, N = Math.round(total * R), BPM = +(args.bpm || cfg.bpm || 96), beat = 60 / BPM, bar = beat * 4;
const L = new Float32Array(N), Rr = new Float32Array(N);
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// sections -> per-time parameters
const secs = cfg.sections.slice().sort((a, b) => a.at - b.at);
const secAt = (t) => { let s = secs[0]; for (const x of secs) if (x.at <= t) s = x; return s; };
// progression (D minor): Dm - Bb - F - C, 2 bars each; voicings as MIDI notes
const PROG = [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [41, 53, 57, 60, 65], [48, 55, 60, 64, 67]];
const chordAt = (t) => PROG[Math.floor(t / (bar * 2)) % PROG.length];

// one-pole lowpass per voice
const onepole = () => { let y = 0; return (x, f) => { const a = 1 - Math.exp(-2 * Math.PI * f / R); y += a * (x - y); return y; }; };

// ---- pad: detuned saws through a slowly moving lowpass, crossfading between chords ----
{
  const voices = [], rnd = rng(5);
  for (let v = 0; v < 5; v++) for (let d = 0; d < 3; d++) voices.push({ v, det: (d - 1) * 0.08 + (rnd() - 0.5) * 0.02, ph: rnd(), pan: (d - 1) * 0.6, lp: onepole() });
  let gain = 0;
  for (let i = 0; i < N; i++) {
    const t = i / R, s = secAt(t), want = s.layers.includes('pad') ? 0.06 + 0.05 * s.energy : 0;
    gain += (want - gain) * 0.00002;                               // ~1 s glide
    if (gain < 1e-5) continue;
    const ch = chordAt(t), cut = 500 + 900 * s.energy + 300 * Math.sin(t * 0.21);
    let l = 0, r = 0;
    for (const vc of voices) {
      const f = mtof(ch[vc.v] + (s.key || 0) + 12) * (1 + vc.det / 100);
      vc.ph += f / R; if (vc.ph > 1) vc.ph -= 1;
      const x = vc.lp(2 * vc.ph - 1, cut);
      l += x * (0.5 - vc.pan * 0.5); r += x * (0.5 + vc.pan * 0.5);
    }
    L[i] += l * gain * 0.35; Rr[i] += r * gain * 0.35;
  }
}
// ---- note events: sub pulse, arp plucks, beat, hats ----
function addNote(t0, dur, f, amp, shape, pan = 0, decay = 6) {
  const i0 = Math.floor(t0 * R), n = Math.floor(dur * R); let ph = 0;
  for (let k = 0; k < n && i0 + k < N; k++) {
    const t = k / R; ph += f / R;
    const w = shape === 'sine' ? Math.sin(2 * Math.PI * ph) : shape === 'tri' ? 1 - 4 * Math.abs(((ph + 0.25) % 1) - 0.5) : Math.sin(2 * Math.PI * ph) + 0.3 * Math.sin(4 * Math.PI * ph);
    const e = Math.min(1, t / 0.004) * Math.exp(-t * decay);
    L[i0 + k] += w * e * amp * (1 - pan) * 0.5 * 2; Rr[i0 + k] += w * e * amp * (1 + pan) * 0.5 * 2;
  }
}
const hatRnd = rng(77);
function addHat(t0, amp) { const i0 = Math.floor(t0 * R); let prev = 0; for (let k = 0; k < 0.05 * R && i0 + k < N; k++) { const n = hatRnd() * 2 - 1, hp = n - prev; prev = n; const e = Math.exp(-k / R * 90); L[i0 + k] += hp * e * amp * 0.6; Rr[i0 + k] += hp * e * amp * 0.4; } }
function addKick(t0, amp) { const i0 = Math.floor(t0 * R); let ph = 0; for (let k = 0; k < 0.35 * R && i0 + k < N; k++) { const t = k / R, f = 45 + 90 * Math.exp(-t * 30); ph += f / R; const e = Math.exp(-t * 9); const x = Math.sin(2 * Math.PI * ph) * e * amp; L[i0 + k] += x; Rr[i0 + k] += x; } }
const stepsTotal = Math.floor(total / (beat / 2));
const arpRnd = rng(9);
for (let st = 0; st < stepsTotal; st++) {
  const t = st * beat / 2, s = secAt(t), ch = chordAt(t), k = (s.key || 0), onBeat = st % 2 === 0;
  if (s.layers.includes('sub') && onBeat) addNote(t, beat * 0.9, mtof(ch[0] + k - 12), 0.12 + 0.08 * s.energy, 'sine', 0, 3.5);
  if (s.layers.includes('arp')) {
    const order = [1, 2, 3, 4, 3, 2, 4, 2], note = ch[order[st % 8]] + k + 12;
    const amp = (0.035 + 0.03 * s.energy) * (onBeat ? 1 : 0.75), pan = Math.sin(st * 1.3) * 0.5;
    addNote(t, 0.6, mtof(note), amp, 'tri', pan, 9);
    addNote(t + beat * 0.75, 0.5, mtof(note), amp * 0.35, 'tri', -pan, 10);        // ping-pong echo
    if (arpRnd() < 0.25 * s.energy) addNote(t + beat / 4, 0.4, mtof(note + 12), amp * 0.4, 'sine', pan, 12);
  }
  if (s.layers.includes('beat') && onBeat && (st / 2) % 2 === 0) addKick(t, 0.22 + 0.12 * s.energy);
  if (s.layers.includes('hat') && !onBeat) addHat(t, 0.05 + 0.05 * s.energy);
}
// hits: short silences ("drop") or swells
for (const h of cfg.hits || []) {
  const i0 = Math.floor(h.at * R);
  if (h.kind === 'drop') { const len = Math.floor((h.dur || 1.2) * R); for (let k = 0; k < len && i0 + k < N; k++) { const g = Math.min(1, Math.min(k, len - k) / (0.08 * R)); L[i0 + k] *= 1 - g * 0.97; Rr[i0 + k] *= 1 - g * 0.97; } }
}
// section fades at the very start and end
for (let i = 0; i < N; i++) { const t = i / R, g = Math.min(1, t / 1.5, Math.max(0, (total + 1 - t) / 3)); L[i] *= g; Rr[i] *= g; }
// soft saturation + normalise to -1 dBFS
let peak = 1e-9; for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 1.2); Rr[i] = Math.tanh(Rr[i] * 1.2); peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i])); }
const norm = 0.89 / peak; for (let i = 0; i < N; i++) { L[i] *= norm; Rr[i] *= norm; }
function writeWav(file, a, b) {
  const n = a.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(R, 24); buf.writeUInt32LE(R * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, a[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, b[i])) * 32767), 46 + i * 4); }
  fs.writeFileSync(file, buf);
}
fs.mkdirSync(path.join(VD, 'music'), { recursive: true });
writeWav(path.join(VD, 'music', 'score-dry.wav'), L, Rr);
// ducking from the dialogue envelope (16 kHz mono cut audio)
const dPath = path.join(VD, 'work', 'cut-audio16k.wav');
let ducked = 0;
if (fs.existsSync(dPath)) {
  const d = fs.readFileSync(dPath), pcm = new Int16Array(d.buffer, d.byteOffset + 44, (d.length - 44) >> 1), win = 160;
  const envDb = new Float32Array(Math.ceil(pcm.length / win));
  for (let w = 0; w < envDb.length; w++) { let a = 0; for (let i = w * win; i < Math.min(pcm.length, (w + 1) * win); i++) a += (pcm[i] / 32768) ** 2; envDb[w] = 10 * Math.log10(a / win + 1e-12); }
  let g = 1; const att = 1 - Math.exp(-1 / (0.06 * R)), rel = 1 - Math.exp(-1 / (0.35 * R)), duck = Math.pow(10, -9 / 20);
  for (let i = 0; i < N; i++) {
    const w = Math.floor(i / 3 / win), speech = w < envDb.length && envDb[w] > -42;
    const target = speech ? duck : 1; g += (target - g) * (target < g ? att : rel);
    L[i] *= g; Rr[i] *= g; if (speech) ducked++;
  }
}
writeWav(path.join(VD, 'music', 'score.wav'), L, Rr);
console.log(JSON.stringify({ out: 'music/score.wav', sec: +(N / R).toFixed(1), bpm: BPM, sections: secs.length, duckedShare: +(ducked / N).toFixed(2) }));
