#!/usr/bin/env node
/* Transcribe a recording with whisper.cpp (local, no API). Produces word-level timestamps the motion-designer and editor use.
 *   npm run transcribe -- --in videos/x/raw/take.mp4 [--model tools/ggml-base.en.bin] [--out videos/x/raw/transcript]
 *                         [--edit [--prompt "Hi. Um, so today..."]]
 * Writes <out>.srt, <out>.txt, <out>.json (whisper's full JSON with word timestamps) and <out>.words.json ([{t, end, w}]).
 * Requires tools/whisper/Release/whisper-cli.exe and a ggml model (tools/ggml-base.en.bin; use small.en or medium.en for better accuracy).
 *
 * --edit (what /resolve-edit uses): a second pass with a punctuated initial prompt that contains an "Um," supplies
 * sentence punctuation and the fillers plain whisper drops; pipeline/edit/words-merge.mjs merges it onto the plain pass's
 * timing (see that file for the measurements). words.json then carries punctuation and src per word; the plain pass is
 * kept as <out>.plain.words.json, the prompted one as <out>.prompted.json, the merge stats as <out>.merge.json. Without
 * --edit the output is unchanged (the voice pipeline depends on it).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { mergeWords, whisperJsonToWords } from './words-merge.mjs';
import { audioEnvelope, levelStats } from '../resolve/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = {}; const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { const k = argv[i].slice(2); const v = argv[i + 1]; if (v === undefined || v.startsWith('--')) args[k] = true; else { args[k] = v; i++; } }
if (!args.in) { console.error('usage: --in <video or audio> [--model <ggml.bin>] [--out <prefix>]'); process.exit(1); }

const input = path.resolve(ROOT, args.in);
// default: the most accurate model present in tools/ (medium > small > base)
const pick = ['tools/ggml-medium.en.bin', 'tools/ggml-small.en.bin', 'tools/ggml-base.en.bin'].find((m) => fs.existsSync(path.resolve(ROOT, m)));
const model = path.resolve(ROOT, args.model || pick || 'tools/ggml-base.en.bin');
// Prefer the CUDA build (tools/whisper-cuda, RTX 3090: ~22x realtime with small.en) over the CPU build; --cpu forces CPU.
const gpu = path.resolve(ROOT, 'tools/whisper-cuda/Release/whisper-cli.exe');
const whisper = !args.cpu && fs.existsSync(gpu) ? gpu : path.resolve(ROOT, 'tools/whisper/Release/whisper-cli.exe');
const outPrefix = path.resolve(ROOT, args.out || path.join(path.dirname(input), 'transcript'));
for (const [what, p] of [['input', input], ['model', model], ['whisper-cli', whisper]]) if (!fs.existsSync(p)) { console.error(`[transcribe] missing ${what}: ${p}`); process.exit(1); }

const wav = outPrefix + '.16k.wav';
console.log('[transcribe] extracting 16 kHz mono audio...');
let r = spawnSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }

console.log(`[transcribe] running whisper (${path.basename(model)}, ${whisper === gpu ? 'GPU' : 'CPU'})...`);
const t0 = Date.now();
r = spawnSync(whisper, ['-m', model, '-f', wav, '-l', 'en', '-ml', '1', '-oj', '-osrt', '-otxt', '-of', outPrefix, '-t', String(Math.max(2, (require_os_cpus() - 1)))], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
function require_os_cpus() { try { return (globalThis.process.availableParallelism?.() || 4); } catch { return 4; } }
if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(1); }
console.log(`[transcribe] done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

// whisper -ml 1 emits one token per segment; join into words with timings
let words = whisperJsonToWords(JSON.parse(fs.readFileSync(outPrefix + '.json', 'utf8')));
if (args.edit) {
  const prompt = typeof args.prompt === 'string' ? args.prompt : "Hi everyone. Um, so today, we're going to talk about this. Okay? Let's get into it.";
  console.log('[transcribe] second pass with a punctuated prompt (punctuation + fillers)...');
  const t1 = Date.now();
  const pr = spawnSync(whisper, ['-m', model, '-f', wav, '-l', 'en', '-ml', '1', '-oj', '-of', outPrefix + '.prompted', '--prompt', prompt, '--carry-initial-prompt', '-t', String(Math.max(2, (require_os_cpus() - 1)))], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (pr.status !== 0) { console.error(pr.stderr || pr.stdout); process.exit(1); }
  const prompted = whisperJsonToWords(JSON.parse(fs.readFileSync(outPrefix + '.prompted.json', 'utf8')));
  const env = await audioEnvelope(wav);
  const { words: merged, stats } = mergeWords(words, prompted, { env, thr: levelStats(env.db).threshold });
  fs.writeFileSync(outPrefix + '.plain.words.json', JSON.stringify(words));
  fs.writeFileSync(outPrefix + '.merge.json', JSON.stringify({ prompt, ...stats }, null, 2));
  console.log(`[transcribe] prompted pass ${((Date.now() - t1) / 1000).toFixed(0)}s; ${stats.matched}/${stats.plainWords} words matched by text, ${stats.sentenceEnds} sentence ends, ${stats.fillersInserted} fillers the plain pass missed inserted (${stats.fillersNotPlaced.length} not placed)`);
  words = merged;
}
fs.writeFileSync(outPrefix + '.words.json', JSON.stringify(words));
// readable txt as paragraphs (whisper -otxt with -ml 1 is one token per line, so rebuild it)
const plain = words.map((w) => w.w).join(' ').replace(/\s+([,.!?])/g, '$1');
fs.writeFileSync(outPrefix + '.txt', plain.split(/(?<=[.!?])\s+/).reduce((acc, s) => { const last = acc[acc.length - 1]; if (last && (last + ' ' + s).split(' ').length < 70) acc[acc.length - 1] = last + ' ' + s; else acc.push(s); return acc; }, []).join('\n\n'));
fs.rmSync(wav, { force: true });
console.log(`[transcribe] ${words.length} words, ${(words.at(-1)?.end / 60 || 0).toFixed(1)} min`);
console.log(`[transcribe] wrote ${path.relative(ROOT, outPrefix)}.{srt,txt,json,words.json}`);
console.log(JSON.stringify({ words: words.length, seconds: words.at(-1)?.end || 0, srt: path.relative(ROOT, outPrefix + '.srt').split(path.sep).join('/'), wordsJson: path.relative(ROOT, outPrefix + '.words.json').split(path.sep).join('/') }));
