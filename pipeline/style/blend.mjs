#!/usr/bin/env node
/* Blend several learned styles into one style for a video TYPE (e.g. "reaction" from three reaction references).
 *
 *   node pipeline/style/blend.mjs --name reaction --from reaction-1,reaction-2,reaction-3 [--type reaction]
 *
 * edit.* numbers -> the median across the sources; edit.* strings (e.g. takes.fillers 'cut'|'mark') -> the majority
 * (ties go to the more conservative 'mark'); measured.* -> the per-source values side by side for the style.md table.
 * Writes styles/<name>/style.json and a style.md with the per-reference table and a "Visual notes" section for Claude
 * to fill from the sources' notes (each source's own sheets and notes stay in styles/<source>/). Never edits a source.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
if (!args.name || !args.from) { console.error('usage: --name <style> --from <style,style,...> [--type <video type>]'); process.exit(2); }
const names = String(args.from).split(',').map((s) => s.trim()).filter(Boolean);
const src = names.map((n) => ({ n, s: JSON.parse(fs.readFileSync(path.join(ROOT, 'styles', n, 'style.json'), 'utf8')) }));
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const RANK = { off: 0, mark: 1, cut: 2 };
function blend(objs) {
  const keys = [...new Set(objs.flatMap((o) => (o && typeof o === 'object' && !Array.isArray(o) ? Object.keys(o) : [])))];
  const out = {};
  for (const k of keys) {
    const vals = objs.map((o) => o?.[k]).filter((v) => v != null);
    if (!vals.length) continue;
    if (vals.every((v) => typeof v === 'number')) out[k] = +median(vals).toFixed(2);
    else if (vals.every((v) => typeof v === 'boolean')) out[k] = vals.filter(Boolean).length * 2 >= vals.length;
    else if (vals.every((v) => typeof v === 'string')) {
      const count = {}; for (const v of vals) count[v] = (count[v] || 0) + 1;
      const top = Math.max(...Object.values(count));
      const tied = Object.keys(count).filter((v) => count[v] === top);
      out[k] = tied.sort((a, b) => (RANK[a] ?? 9) - (RANK[b] ?? 9))[0];
    } else if (vals.every((v) => typeof v === 'object' && !Array.isArray(v))) out[k] = blend(vals);
    else out[k] = vals[0];
  }
  return out;
}
const style = {
  name: args.name, version: 1, type: args.type || args.name,
  blendedFrom: src.map(({ n, s }) => ({ style: n, title: s.learnedFrom?.title, channel: s.learnedFrom?.channel, url: s.learnedFrom?.url, analysedSeconds: s.learnedFrom?.analysedSeconds })),
  edit: blend(src.map(({ s }) => s.edit)),
  measuredBySource: Object.fromEntries(src.map(({ n, s }) => [n, s.measured])),
};
const dir = path.join(ROOT, 'styles', args.name);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'style.json'), JSON.stringify(style, null, 2) + '\n');
const row = (label, f) => `| ${label} | ${src.map(({ s }) => { try { const v = f(s.measured); return v == null ? '' : v; } catch { return ''; } }).join(' | ')} |`;
const L = [];
L.push(`# Editing style: ${args.name}`, '');
L.push(`Blended from ${src.length} references by \`pipeline/style/blend.mjs\` (edit numbers = the median; policies = the majority). Each reference keeps its own sheets and notes in \`styles/<reference>/\`.`, '');
L.push(`| | ${src.map(({ n, s }) => `[${s.learnedFrom?.title || n}](${s.learnedFrom?.url || ''}) (${s.learnedFrom?.channel || ''})`).join(' | ')} |`);
L.push(`|---|${src.map(() => '---').join('|')}|`);
L.push(row('Cuts / min (first 60 s)', (m) => `${m.shots.cutsPerMin} (${m.shots.cutsPerMinFirst60})`));
L.push(row('Median shot', (m) => `${m.shots.medianShotSec} s`));
L.push(row('Pause median / p90', (m) => `${m.speech.pauseMedianSec} / ${m.speech.pauseP90Sec} s`));
L.push(row('Words / min', (m) => m.speech.wordsPerMin));
L.push(row('Fillers / stutters left per min', (m) => `${m.speech.fillersLeftPerMin ?? '?'} / ${m.speech.stuttersLeftPerMin ?? '?'}`));
L.push(row('Loudness', (m) => `${m.loudness.integratedLufs} LUFS`));
L.push(row('Music bed likely', (m) => (m.musicBed.likely ? `yes (${m.musicBed.relativeDb} dB)` : 'no')));
L.push('', '## Edit parameters (blended)', '', '```json', JSON.stringify(style.edit, null, 2), '```', '');
L.push('## Visual notes', '', '_Fill from the references\' own Visual notes: what they share (framing, zoom habit, layout, b-roll share, text, transitions, sound) and where they differ._', '');
fs.writeFileSync(path.join(dir, 'style.md'), L.join('\n'));
console.log(JSON.stringify({ style: `styles/${args.name}/style.json`, from: names, edit: style.edit }));
