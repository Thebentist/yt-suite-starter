#!/usr/bin/env node
/* Synthesised sound-effects library for motion edits (no samples, nothing downloaded): whooshes, pops, ticks, a
 * riser, an impact, marker scribbles, bubbles, a splash, a ding, a buzz, a paper slide. 48 kHz stereo 16-bit WAV.
 *
 *   node pipeline/motion/sfx.mjs --out videos/x/sfx/lib
 *
 * Deterministic (seeded noise). Each file is normalised to a -3 dBFS peak; set the level where it is used.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../resolve/media.mjs';

const args = parseArgs(process.argv.slice(2));
const OUT = path.resolve(args.out || 'renders/sfx'); fs.mkdirSync(OUT, { recursive: true });
const R = 48000;

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1; }; }
// RBJ biquad, coefficients updated per sample when f/q change
function biquad(type) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, f, q = 0.7) => {
    const w = 2 * Math.PI * Math.min(f, R * 0.45) / R, a = Math.sin(w) / (2 * q), c = Math.cos(w);
    let b0, b1, b2; const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; } // band-pass (0 dB peak)
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y; return y;
  };
}
const env = (t, a, d, curve = 3) => (t < a ? t / a : Math.pow(Math.max(0, 1 - (t - a) / d), curve));
function write(name, L, Rch = L) {
  let peak = 1e-9; for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rch[i]));
  const g = 0.708 / peak, n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(R, 24); buf.writeUInt32LE(R * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, Rch[i] * g)) * 32767), 46 + i * 4); }
  fs.writeFileSync(path.join(OUT, name + '.wav'), buf); return name;
}
const make = (sec) => [new Float32Array(Math.round(sec * R)), new Float32Array(Math.round(sec * R))];
const made = [];

// whoosh: band-passed noise sweeping up then down, panning left to right
for (const [name, sec, f0, f1, seed] of [['whoosh', 0.55, 350, 2600, 1], ['whoosh-soft', 0.4, 500, 1800, 2], ['whoosh-long', 0.9, 250, 3200, 3]]) {
  const [L, Rr] = make(sec), n = rng(seed), bl = biquad('bp'), br = biquad('bp');
  for (let i = 0; i < L.length; i++) {
    const t = i / R, u = t / sec, f = f0 * Math.pow(f1 / f0, Math.sin(Math.PI * u)), a = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 2);
    const s = n() * a, pan = u;
    L[i] = bl(s, f, 1.4) * (1 - pan * 0.7); Rr[i] = br(s, f * 1.05, 1.4) * (0.3 + pan * 0.7);
  }
  made.push(write(name, L, Rr));
}
// pop: pitch-dropping sine blip with a click
for (const [name, fHi, fLo, sec] of [['pop', 900, 220, 0.14], ['pop-high', 1500, 500, 0.1], ['pop-low', 520, 120, 0.18]]) {
  const [L] = make(sec); let ph = 0; const n = rng(7);
  for (let i = 0; i < L.length; i++) { const t = i / R, f = fLo + (fHi - fLo) * Math.exp(-t * 40); ph += 2 * Math.PI * f / R; L[i] = Math.sin(ph) * env(t, 0.002, sec - 0.002, 2.5) + (t < 0.003 ? n() * 0.6 * (1 - t / 0.003) : 0); }
  made.push(write(name, L));
}
// tick / tock: clock ticks
for (const [name, f, seed] of [['tick', 3200, 11], ['tock', 1900, 12]]) {
  const [L] = make(0.06), n = rng(seed), bp = biquad('bp');
  for (let i = 0; i < L.length; i++) { const t = i / R; L[i] = (bp(n(), f, 6) * 3 + Math.sin(2 * Math.PI * f * 0.5 * t) * 0.3) * env(t, 0.0005, 0.05, 4); }
  made.push(write(name, L));
}
// riser: noise + rising sine, crescendo
{
  const sec = 2.2, [L, Rr] = make(sec), n = rng(21), hp = biquad('hp'), hp2 = biquad('hp'); let ph = 0;
  for (let i = 0; i < L.length; i++) { const t = i / R, u = t / sec, f = 180 * Math.pow(8, u); ph += 2 * Math.PI * f / R; const a = Math.pow(u, 2.2) * (u > 0.97 ? (1 - u) / 0.03 : 1); L[i] = (hp(n(), 300 + 4000 * u) * 0.7 + Math.sin(ph) * 0.35) * a; Rr[i] = (hp2(n(), 320 + 4100 * u) * 0.7 + Math.sin(ph * 1.003) * 0.35) * a; }
  made.push(write('riser', L, Rr));
}
// impact: sub drop + noise burst (title card, big reveal)
{
  const sec = 1.4, [L, Rr] = make(sec), n = rng(31), lp = biquad('lp'); let ph = 0;
  for (let i = 0; i < L.length; i++) { const t = i / R, f = 35 + 60 * Math.exp(-t * 8); ph += 2 * Math.PI * f / R; const s = Math.sin(ph) * env(t, 0.004, 1.3, 2) + lp(n(), 900) * env(t, 0.001, 0.25, 3) * 0.9; L[i] = s; Rr[i] = s; }
  made.push(write('impact', L, Rr));
}
// scribble: marker strokes on paper (band noise gated by stroke rhythm)
for (const [name, sec, seed] of [['scribble', 0.7, 41], ['scribble-short', 0.35, 42]]) {
  const [L] = make(sec), n = rng(seed), bp = biquad('bp'), m = rng(seed + 100);
  let gate = 0, target = 1, next = 0;
  for (let i = 0; i < L.length; i++) { const t = i / R; if (t >= next) { target = target > 0.5 ? 0.15 : 1; next = t + 0.05 + (m() + 1) * 0.06; } gate += (target - gate) * 0.004; L[i] = bp(n(), 2400 + 900 * Math.sin(t * 40), 0.9) * gate * env(t, 0.01, sec - 0.01, 0.6); }
  made.push(write(name, L));
}
// bubble / plop: upward chirp
for (const [name, f0, f1, sec] of [['bubble', 280, 1100, 0.16], ['bubble-small', 500, 1600, 0.1]]) {
  const [L] = make(sec); let ph = 0;
  for (let i = 0; i < L.length; i++) { const t = i / R, f = f0 * Math.pow(f1 / f0, t / sec); ph += 2 * Math.PI * f / R; L[i] = Math.sin(ph) * env(t, 0.004, sec - 0.004, 2); }
  made.push(write(name, L));
}
// splash: water-balloon pop (noise burst + bubbles)
{
  const sec = 0.8, [L, Rr] = make(sec), n = rng(51), lp = biquad('lp'), lp2 = biquad('lp'), b = rng(52); let ph = 0, f = 0, bt = 0;
  for (let i = 0; i < L.length; i++) {
    const t = i / R; if (t >= bt) { f = 400 + (b() + 1) * 700; bt = t + 0.03 + (b() + 1) * 0.04; }
    ph += 2 * Math.PI * f * (1 + (t - bt + 0.07) * 6) / R;
    const burst = lp(n(), 2500) * env(t, 0.001, 0.3, 2.5), bub = Math.sin(ph) * 0.25 * env(t, 0.05, 0.7, 1.5) * (t > 0.04 ? 1 : 0);
    L[i] = burst + bub; Rr[i] = lp2(n(), 2300) * env(t, 0.001, 0.3, 2.5) + bub * 0.8;
  }
  made.push(write('splash', L, Rr));
}
// ding: soft bell (inharmonic partials) for a correct/positive reveal
{
  const sec = 1.2, [L] = make(sec), parts = [[1, 1], [2.76, 0.4], [5.4, 0.2], [8.93, 0.1]], f0 = 1320;
  for (let i = 0; i < L.length; i++) { const t = i / R; let s = 0; for (const [k, a] of parts) s += a * Math.sin(2 * Math.PI * f0 * k * t) * Math.exp(-t * (2 + k * 1.2)); L[i] = s * Math.min(1, t / 0.002); }
  made.push(write('ding', L));
}
// buzz: short low "wrong" buzz for a red X
{
  const sec = 0.28, [L] = make(sec), lp = biquad('lp');
  for (let i = 0; i < L.length; i++) { const t = i / R, sq = Math.sign(Math.sin(2 * Math.PI * 110 * t)) + 0.5 * Math.sign(Math.sin(2 * Math.PI * 116 * t)); L[i] = lp(sq, 1400) * env(t, 0.005, sec - 0.005, 1.2); }
  made.push(write('buzz', L));
}
// paper: paper slide / card in
{
  const sec = 0.45, [L, Rr] = make(sec), n = rng(61), bp = biquad('bp'), bp2 = biquad('bp');
  for (let i = 0; i < L.length; i++) { const t = i / R, a = Math.sin(Math.PI * Math.min(1, t / sec)) ** 2; L[i] = bp(n(), 3200, 0.6) * a; Rr[i] = bp2(n(), 3000, 0.6) * a; }
  made.push(write('paper', L, Rr));
}
// sparkle: tiny upward twinkle (lime chip reveals)
{
  const sec = 0.5, [L, Rr] = make(sec), notes = [2093, 2637, 3136, 4186];
  for (let i = 0; i < L.length; i++) { const t = i / R; let s = 0; notes.forEach((f, k) => { const t0 = k * 0.05; if (t >= t0) s += Math.sin(2 * Math.PI * f * (t - t0)) * Math.exp(-(t - t0) * 14) * 0.5; }); L[i] = s; Rr[i] = s * 0.9; }
  made.push(write('sparkle', L, Rr));
}
console.log(JSON.stringify({ out: OUT, files: made }));
