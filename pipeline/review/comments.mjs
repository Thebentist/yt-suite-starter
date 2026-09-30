#!/usr/bin/env node
/* Claude's side of the review app: read comments with the words under them, reply, set status.
 *
 *   node pipeline/review/comments.mjs --slug x                    open comments, with the transcript at each time
 *   node pipeline/review/comments.mjs --slug x --all              every comment
 *   node pipeline/review/comments.mjs --slug x --reply <id> --text "Done in v4: ..." [--status done|working|open]
 *   node pipeline/review/comments.mjs --slug x --status working --id <id>
 *   node pipeline/review/comments.mjs --slug x --publish v4 --name "v4: graphics" --notes "..." --timeline "..."
 *        (writes review/v4.json and snapshots edit/cut-words.json to review/v4.words.json for the transcript strip)
 * Replies are posted as "Claude". Edits comments.json in place (the app polls it every 4 s).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const a = parseArgs(process.argv.slice(2));
if (!a.slug) { console.error('usage: --slug <slug> [--all] [--reply <id> --text "..."] [--status s --id <id>] [--publish <version>]'); process.exit(1); }
const RD = path.join(ROOT, 'videos', a.slug, 'review'), CF = path.join(RD, 'comments.json');
const read = () => { try { return JSON.parse(fs.readFileSync(CF, 'utf8')); } catch { return []; } };
const write = (x) => { const tmp = CF + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(x, null, 1)); fs.renameSync(tmp, CF); };
const tc = (s) => { const f = Math.floor((s % 1) * 30 + 1e-6), t = Math.floor(s); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}:${String(f).padStart(2, '0')}`; };

if (a.publish) {
  fs.mkdirSync(RD, { recursive: true });
  const meta = { name: a.name || a.publish, created: new Date().toISOString(), timeline: a.timeline || '', notes: a.notes || '' };
  fs.writeFileSync(path.join(RD, a.publish + '.json'), JSON.stringify(meta, null, 1));
  const cw = path.join(ROOT, 'videos', a.slug, 'edit', 'cut-words.json');
  if (fs.existsSync(cw)) {
    const keep = JSON.parse(fs.readFileSync(path.join(ROOT, 'videos', a.slug, 'edit', 'paper-edit.json'), 'utf8')).keep.filter((k) => k.w);
    const words = JSON.parse(fs.readFileSync(cw, 'utf8')).words.filter((c) => keep.some((k) => c.i >= k.w[0] && c.i <= k.w[1])).sort((x, y) => x.t - y.t).map((c) => ({ t: c.t, end: c.end, w: c.w, i: c.i }));
    fs.writeFileSync(path.join(RD, a.publish + '.words.json'), JSON.stringify(words));
  }
  console.log(JSON.stringify({ published: a.publish, meta }));
  process.exit(0);
}
const all = read();
if (a.reply || (a.status && a.id)) {
  const id = a.reply || a.id, c = all.find((x) => x.id === id);
  if (!c) { console.error('no comment ' + id); process.exit(1); }
  if (a.reply && a.text) c.replies.push({ author: 'Claude', text: String(a.text), created: new Date().toISOString() });
  if (a.status && a.status !== true) c.status = a.status;
  write(all); console.log(JSON.stringify({ id, status: c.status, replies: c.replies.length }));
  process.exit(0);
}
const wordsFor = (v) => { try { return JSON.parse(fs.readFileSync(path.join(RD, v + '.words.json'), 'utf8')); } catch { return []; } };
const cache = {};
const list = all.filter((c) => a.all || c.status !== 'done').sort((x, y) => (x.version === y.version ? x.t - y.t : x.version < y.version ? -1 : 1));
if (!list.length) { console.log(a.all ? 'no comments' : 'no open comments'); process.exit(0); }
for (const c of list) {
  const ws = cache[c.version] || (cache[c.version] = wordsFor(c.version));
  const t1 = c.t2 ?? c.t, near = ws.filter((w) => w.end >= c.t - 1.5 && w.t <= t1 + 1.5);
  console.log(`\n[${c.id}] ${c.version} ${tc(c.t)}${c.t2 != null ? ' -> ' + tc(c.t2) : ''} (frame ${c.frame ?? Math.round(c.t * 30)})  ${c.status.toUpperCase()}  by ${c.author}, ${c.created}`);
  if (c.text) console.log('  ' + c.text.replace(/\n/g, '\n  '));
  for (const l of c.links) console.log('  link: ' + l);
  for (const f of c.files) console.log('  file: ' + path.join(RD, f));
  if (c.drawing) console.log('  drawing: ' + path.join(RD, c.drawing));
  if (near.length) console.log('  words there: "' + near.map((w) => (w.t <= t1 && w.end >= c.t ? w.w.toUpperCase() : w.w)).join(' ') + `"  (raw words ${near[0].i}-${near[near.length - 1].i})`);
  for (const r of c.replies) console.log(`  > ${r.author}: ${r.text}`);
}
