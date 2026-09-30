#!/usr/bin/env node
/* Writes scenes/overlay/plan.json from the scene files themselves: each scene's defineScene({ anchor, anchorEnd, plan,
 * sfx }) (read with a stub defineScene, nothing is rendered), chapters.js's `chapters` list, and the current cut
 * (edit/cut-words.json, beats.json; same anchor rule as the runtime: nearest word within 30 if one was cut).
 * Prints each scene's timeline span, planned length and sfx; --check also compares the rendered file's length.
 *   node videos/bad-breath-for-good/scenes/overlay/make-plan.mjs [--check]
 * sfx cues in a scene: { w: <word>, edge?: 'end', d?: <s>, kind } or { t: <scene s>, kind }; written to plan.json in
 * seconds from the clip's start on the timeline (minus plan.in when the lead trims the head of a render).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..', '..');
const VD = path.join(ROOT, 'videos', 'bad-breath-for-good');
const OUT = 'videos/bad-breath-for-good/scenes/out';
const cw = JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'cut-words.json'), 'utf8'));
const beats = JSON.parse(fs.readFileSync(path.join(VD, 'edit', 'beats.json'), 'utf8'));
const byIdx = new Map(cw.words.map((w) => [w.i, w]));
const find = (i) => { let w = byIdx.get(i); for (let d = 1; !w && d < 30; d++) w = byIdx.get(i + d) || byIdx.get(i - d); if (!w) throw new Error('word not in cut: ' + i); return w; };
const anchor = (a) => { if (a.special) { const p = beats.pieces.find((x) => x.special === a.special); return p.at + (a.offset || 0); } const w = find(a.word); return (a.edge === 'end' ? w.end : w.t) + (a.offset || 0); };
const specOf = (file) => { let spec = null; const ctx = { defineScene: (s) => { spec = s; } }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx); return spec; };
const r3 = (x) => Math.round(x * 1000) / 1000;
const cueT = (c, t0) => (c.t != null ? c.t : (c.edge === 'end' ? find(c.w).end : find(c.w).t) - t0) + (c.d || 0);

const plan = [];
for (const f of fs.readdirSync(HERE).filter((f) => f.endsWith('.js') && !f.startsWith('_') && f !== 'chapters.js').sort()) {
  const s = specOf(path.join(HERE, f)); if (!s || !s.anchor) { console.error('skip (no anchor):', f); continue; }
  const P = s.plan || {}, IN = P.in || 0, t0 = anchor(s.anchor);
  const END = s.anchorEnd ? anchor(s.anchorEnd) - t0 : (P.duration ?? s.duration);
  const sfx = (s.sfx || []).map((c) => ({ t: r3(cueT(c, t0) - IN), kind: c.kind })).filter((c) => c.t >= 0 && c.t < END);
  const e = { id: s.name, output: `${OUT}/${s.name}.${s.transparent ? 'mov' : 'mp4'}`, start: s.anchor, ...(IN ? { in: IN } : {}) };
  if (s.anchorEnd) e.end = s.anchorEnd; else e.duration = P.duration ?? s.duration;
  Object.assign(e, { transparent: !!s.transparent, lane: P.lane || 2, ...(P.replaces ? { replaces: P.replaces } : {}), sfx });
  plan.push({ e, t0, END, render: IN + END });
}
const ch = specOf(path.join(HERE, 'chapters.js'));
for (const [n, word, title] of ch.chapters) {
  const start = { word, offset: -0.15 };
  plan.push({ e: { id: `chapter-${n}`, output: `${OUT}/chapter-${n}.mov`, start, duration: ch.duration, transparent: true, lane: ch.plan.lane, params: { n, title },
    sfx: (ch.sfx || []).map((c) => ({ t: c.t, kind: c.kind })) }, t0: anchor(start), END: ch.duration, render: ch.duration });
}
plan.sort((a, b) => a.t0 - b.t0);
// the assembler trims the earlier of two overlapping scenes in the same lane: none of ours may overlap within a lane
for (const lane of new Set(plan.map((p) => p.e.lane))) { const L = plan.filter((p) => p.e.lane === lane); for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i]; if (a.t0 + a.END > b.t0 + 1e-6) console.error(`OVERLAP (lane ${lane}): ${a.e.id} ends ${r3(a.t0 + a.END)} after ${b.e.id} starts ${r3(b.t0)}`); } }
fs.writeFileSync(path.join(HERE, 'plan.json'), '[\n' + plan.map(({ e }) => '  ' + JSON.stringify(e)).join(',\n') + '\n]\n');
const probe = (f) => { const r = spawnSync(path.join(ROOT, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'), ['-hide_banner', '-i', f], { encoding: 'utf8' }); const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr || ''); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : null; };
for (const { e, t0, END, render } of plan) {
  const f = path.join(ROOT, e.output), len = process.argv.includes('--check') && fs.existsSync(f) ? probe(f) : null;
  console.log(`${e.id.padEnd(16)} ${r3(t0).toFixed(3).padStart(8)} -> ${r3(t0 + END).toFixed(3).padStart(8)}  len ${r3(END).toFixed(3)}` +
    (len != null ? `  render ${len.toFixed(2)}${len + 1e-3 < render ? '  TOO SHORT' : ''}` : '') + `  sfx ${e.sfx.map((s) => s.kind + '@' + s.t).join(' ')}`);
}
