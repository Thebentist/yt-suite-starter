#!/usr/bin/env node
/* Transcribe one YouTube video (an outlier we are adapting) and lay it out for structure analysis.
 *   node pipeline/script/source-transcript.mjs --url <youtube url> --out <dir> [--model tools/ggml-base.en.bin]
 * Writes <dir>/<id>.txt (whisper paragraphs), <id>.words.json, and <id>.beats.md: the transcript in 30-second blocks with
 * timestamps and running % of runtime, which is what the write-script skill maps into "their beat / our beat".
 * Audio is deleted after transcription. Captions are not used (YouTube returns 429 for them from this machine).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, parseArgs, readJson } from '../swipe/lib.mjs';

const args = parseArgs();
if (!args.url || !args.out) { console.error('usage: --url <youtube url> --out <dir> [--model <ggml>] [--block 30]'); process.exit(1); }
const id = args.url.match(/(?:v=|shorts\/|youtu\.be\/)([\w-]{11})/)?.[1];
if (!id) { console.error('could not read a video id from --url'); process.exit(1); }
const out = path.resolve(ROOT, args.out);
fs.mkdirSync(out, { recursive: true });
const prefix = path.join(out, id);

if (!fs.existsSync(prefix + '.words.json')) {
  const dl = spawnSync(path.join(ROOT, 'tools', 'yt-dlp.exe'), ['-f', 'ba[ext=m4a]/ba', '--no-warnings', '--no-playlist', '-o', path.join(out, '%(id)s.audio.%(ext)s'), args.url], { encoding: 'utf8' });
  const audio = fs.readdirSync(out).find((f) => f.startsWith(`${id}.audio.`) && !f.endsWith('.part'));
  if (dl.status !== 0 || !audio) { console.error(`download failed: ${(dl.stderr || '').split('\n').filter(Boolean).pop()}`); process.exit(1); }
  const tr = spawnSync(process.execPath, [path.join(ROOT, 'pipeline/edit/transcribe.mjs'), '--in', path.join(out, audio), ...(args.model ? ['--model', args.model] : []), '--out', prefix], { stdio: 'inherit' });
  for (const f of fs.readdirSync(out)) if (f.startsWith(`${id}.audio.`) || f === `${id}.16k.wav` || f === `${id}.srt` || f === `${id}.json`) fs.rmSync(path.join(out, f), { force: true });
  if (tr.status !== 0) process.exit(1);
}

const words = readJson(prefix + '.words.json', []);
const total = words.length ? words[words.length - 1].end : 0;
const block = Number(args.block || 30);
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const md = [`# Source structure: ${id}`, '', `${args.url} · ${mmss(total)} · ${words.length} words · ${Math.round(words.length / (total / 60 || 1))} wpm`, '', 'Whisper transcript in fixed blocks. Map beats against this: where the hook lands, when the title promise is confirmed, where each loop opens and closes, where the payoff sits (as % of runtime).', ''];
for (let t0 = 0; t0 < total; t0 += block) {
  const ws = words.filter((w) => w.t >= t0 && w.t < t0 + block).map((w) => w.w).join(' ');
  if (ws.trim()) md.push(`**${mmss(t0)}** (${Math.round((100 * t0) / total)}%) ${ws}`, '');
}
fs.writeFileSync(prefix + '.beats.md', md.join('\n'));
console.log(`[source] ${id}: ${mmss(total)}, ${words.length} words -> ${path.relative(ROOT, prefix)}.beats.md`);
