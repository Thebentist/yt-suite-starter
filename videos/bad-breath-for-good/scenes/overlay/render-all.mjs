#!/usr/bin/env node
/* Re-render the overlay group (e.g. after a re-cut): writes plan.json (make-plan.mjs), renders every scene at 4K one
 * at a time through the render queue (3 Chrome pages each), then checks every render covers its planned span.
 *   node videos/bad-breath-for-good/scenes/overlay/render-all.mjs [ids...]      e.g. ... quirynen chapter-03
 * Scenes take their timing from the cut at render time (anchor/anchorEnd + api.at), so no scene file needs editing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..', '..');
const D = 'videos/bad-breath-for-good/scenes';
const node = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
const mp = node([path.join(HERE, 'make-plan.mjs')]);
process.stdout.write(mp.stdout); process.stderr.write(mp.stderr);
const plan = JSON.parse(fs.readFileSync(path.join(HERE, 'plan.json'), 'utf8'));
const only = process.argv.slice(2);
for (const e of plan) {
  if (only.length && !only.includes(e.id)) continue;
  const scene = e.params ? `${D}/overlay/chapters.js` : `${D}/overlay/${e.id}.js`;
  const args = ['pipeline/motion/render.mjs', '--scene', scene, '--out', `${D}/out/${e.id}`, '--pages', '3', ...(e.params ? ['--params', JSON.stringify(e.params)] : [])];
  const r = node(args);
  console.log(e.id, r.status === 0 ? 'ok' : 'FAILED', ((r.stdout || '').trim().split('\n').pop() || (r.stderr || '').slice(-400)).slice(0, 200));
}
const ck = node([path.join(HERE, 'make-plan.mjs'), '--check']);
process.stdout.write(ck.stdout); process.stderr.write(ck.stderr);
