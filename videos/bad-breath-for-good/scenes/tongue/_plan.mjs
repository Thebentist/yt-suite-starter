#!/usr/bin/env node
/* Writes scenes/tongue/plan.json from cues.json and the current edit/cut-words.json, and prints a check table.
 *   node videos/bad-breath-for-good/scenes/tongue/_plan.mjs
 * The sfx times in cues.json are design times (the cut of 2026-09-28 21:58); they are mapped to scene seconds in the
 * current cut with the same word anchors TONGUE.cut() uses at render time. Re-run after the cut changes (and re-render).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..', '..', '..', '..');
const cues = JSON.parse(fs.readFileSync(path.join(DIR, 'cues.json'), 'utf8'));
const cw = JSON.parse(fs.readFileSync(path.join(ROOT, 'videos/bad-breath-for-good/edit/cut-words.json'), 'utf8')).words;
const W = new Map(cw.map((w) => [w.i, w]));
const order = ['tip-vs-back', 'dentist-check', 'papillae-fly', 'carpet-gunk', 'coated-tongue', 'brush-vs-scrape', 'one-spot', 'scrape-how', 'no-permanent'];
const plan = [], rows = [];
for (const id of order) {
  const c = cues[id], t0 = W.get(c.first).t - 0.15;
  const at = (w, off = 0, edge) => (edge === 'end' ? W.get(w).end : W.get(w).t) + off - t0;
  const raw = [[0, 0], ...c.anchors.filter(([w]) => W.has(w)).map(([w, d, off, edge]) => [at(w, off || 0, edge), d])].sort((a, b) => a[1] - b[1]);
  const pairs = []; for (const p of raw) { const q = pairs[pairs.length - 1]; if (!q || (p[0] > q[0] + 0.02 && p[1] > q[1] + 0.02)) pairs.push(p); }
  const base = (t) => {
    if (t <= pairs[0][0]) return t;
    for (let k = 1; k < pairs.length; k++) if (t <= pairs[k][0]) { const [a0, b0] = pairs[k - 1], [a1, b1] = pairs[k]; return b0 + ((t - a0) * (b1 - b0)) / (a1 - a0); }
    const [a, b] = pairs[pairs.length - 1]; return b + (t - a);
  };
  const H = 0.35, N = 12, warp = (t) => { let sw = 0, sv = 0; for (let j = -N; j <= N; j++) { const w = 1 - Math.abs(j) / (N + 1); sw += w; sv += w * base(t + (j / N) * H); } return Math.max(0, sv / sw); };
  const toCur = (d) => { let lo = -2, hi = 60; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (warp(m) < d) lo = m; else hi = m; } return (lo + hi) / 2; };
  const end = at(c.end.word, c.end.offset || 0, c.end.edge), lastEnd = W.get(c.last).end - t0;
  const duration = Math.ceil((Math.max(end + 0.3, lastEnd + 0.4) + 0.5) * 100) / 100;
  const stretch = []; for (let x = 0; x < duration; x += 1 / 30) stretch.push(1 / ((warp(x + 1 / 30) - warp(x)) * 30));
  const miss = c.anchors.filter(([w]) => W.has(w)).map(([w, d, off, edge]) => Math.abs(toCur(d) - at(w, off || 0, edge)));
  plan.push({ id, output: `videos/bad-breath-for-good/scenes/out/${id}.mp4`, start: { word: c.first, offset: -0.15 }, end: c.end, transparent: false,
    sfx: c.sfx.map(([d, kind]) => ({ t: +Math.max(0, toCur(d)).toFixed(2), kind })) });
  rows.push(`${id.padEnd(16)} start ${(t0).toFixed(2).padStart(7)}  len ${end.toFixed(2).padStart(5)}  render ${duration.toFixed(2).padStart(5)}  warp ${Math.min(...stretch).toFixed(2)}-${Math.max(...stretch).toFixed(2)}  anchors ${pairs.length - 1}/${c.anchors.length}  worst cue miss ${Math.max(...miss).toFixed(2)} s`);
}
// continuity: consecutive scenes in the same stretch must not overlap
const tl = plan.map((p) => { const c = cues[p.id], t0 = W.get(c.first).t - 0.15, e = c.end; return { id: p.id, s: t0, e: (e.edge === 'end' ? W.get(e.word).end : W.get(e.word).t) + (e.offset || 0) }; });
for (let k = 1; k < tl.length; k++) if (tl[k].s < tl[k - 1].e - 1e-6) rows.push(`OVERLAP ${tl[k - 1].id} / ${tl[k].id}`);
fs.writeFileSync(path.join(DIR, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
console.log(rows.join('\n'));
