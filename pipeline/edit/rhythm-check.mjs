#!/usr/bin/env node
// Rhythm check: find every picture change in a render and report how long each shot is held.
// Cleo Abram's Huge If True changes the picture every 1-3 s; this measures ours against that.
//   node pipeline/edit/rhythm-check.mjs --video videos/<slug>/review/v4.mp4 [--slug <slug>] [--max 4] [--threshold 9]
// Cuts come from ffmpeg's scdet (scene-change score per frame, on a 320-px copy). With --slug, each long hold is
// labelled with the scene (or "Ben") on screen at that time, from out/final-spec.json, and the words said.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { FFMPEG, parseArgs } from '../resolve/media.mjs';

const args = parseArgs(process.argv.slice(2));
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const video = path.resolve(ROOT, args.video);
const maxHold = +(args.max ?? 4), threshold = +(args.threshold ?? 9);

const cuts = await new Promise((res, rej) => {
  const ff = spawn(FFMPEG, ['-hide_banner', '-nostats', '-i', video, '-an', '-vf', `scale=320:-2,scdet=threshold=${threshold}`, '-f', 'null', '-']);
  let err = ''; const out = [];
  ff.stderr.on('data', (d) => { err += d; const lines = err.split('\n'); err = lines.pop(); for (const l of lines) { const m = l.match(/lavfi\.scd\.time:\s*([\d.]+)/); if (m) out.push(+m[1]); } });
  ff.on('close', (c) => (c === 0 ? res(out) : rej(new Error('ffmpeg exit ' + c))));
});
const dur = await new Promise((res) => {
  const ff = spawn(FFMPEG, ['-hide_banner', '-i', video]); let e = '';
  ff.stderr.on('data', (d) => { e += d; }); ff.on('close', () => { const m = e.match(/Duration: (\d+):(\d+):([\d.]+)/); res(m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0); });
});

const bounds = [0, ...cuts, dur];
const shots = [];
for (let k = 0; k + 1 < bounds.length; k++) shots.push({ a: bounds[k], b: bounds[k + 1], len: bounds[k + 1] - bounds[k] });
const lens = shots.map((s) => s.len).sort((x, y) => x - y);
const median = lens[Math.floor(lens.length / 2)] || 0;
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

// label long holds with what is on screen and what is said
let spec = null, words = null;
if (args.slug) {
  const dir = path.join(ROOT, 'videos', args.slug);
  const sp = path.join(dir, 'out', 'final-spec.json'), cw = path.join(dir, 'edit', 'cut-words.json');
  if (fs.existsSync(sp)) spec = JSON.parse(fs.readFileSync(sp, 'utf8'));
  if (fs.existsSync(cw)) words = JSON.parse(fs.readFileSync(cw, 'utf8')).words;
}
const onScreen = (a, b) => {
  if (!spec) return '';
  const ids = (spec.scenes || spec.overlays || []).filter((s) => (s.at ?? s.start) < b && (s.at ?? s.start) + s.duration > a).map((s) => (s.name || s.id) + (s.transparent || s.mode === 'overlay' ? '(ov)' : ''));
  return ids.length ? ids.join(' + ') : 'Ben';
};
const said = (a, b) => (words ? words.filter((w) => w.t >= a && w.t < b).map((w) => w.w).join(' ').slice(0, 110) : '');

const long = shots.filter((s) => s.len > maxHold);
const report = {
  video: path.relative(ROOT, video).split(path.sep).join('/'), duration: +dur.toFixed(2), threshold,
  cuts: cuts.length, shots: shots.length, medianShot: +median.toFixed(2), meanShot: +(dur / shots.length).toFixed(2),
  within3s: +(shots.filter((s) => s.len <= 3).length / shots.length).toFixed(3),
  longHolds: long.length, longHoldSeconds: +long.reduce((s, x) => s + x.len, 0).toFixed(1),
  holds: long.map((s) => ({ at: fmt(s.a), to: fmt(s.b), len: +s.len.toFixed(1), onScreen: onScreen(s.a, s.b), said: said(s.a, s.b) })),
};
const outDir = path.join(path.dirname(video));
const outFile = path.join(outDir, path.basename(video, path.extname(video)) + '.rhythm.json');
fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
const { holds, ...summary } = report;
console.log(JSON.stringify(summary));
for (const h of holds) console.log(`${h.at}-${h.to}  ${String(h.len).padStart(5)} s  ${h.onScreen}  | ${h.said}`);
console.log('->', path.relative(ROOT, outFile));
