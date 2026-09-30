#!/usr/bin/env node
/* Transcribe short raw snippets (one whisper run) to see exactly which words sit where around a cut edge.
 *   node pipeline/edit/snippet-listen.mjs --slug x 626.0-629.3 1052.3-1054.6 ...   (--cut: times are in the CUT, work/cut-audio16k.wav)
 * Uses work/take16k.s16 (from assemble --stage audio). Prints each snippet's words with RAW times.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../resolve/media.mjs';
import { whisperJsonToWords } from './words-merge.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const buf = args.cut ? fs.readFileSync(path.join(ROOT, 'videos', args.slug, 'work', 'cut-audio16k.wav')).subarray(44) : fs.readFileSync(path.join(ROOT, 'videos', args.slug, 'work', 'take16k.s16'));
const pcm = new Int16Array(buf.buffer, buf.byteOffset, buf.length >> 1), R = 16000;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-'));
const snips = args._.map((s) => s.split('-').map(Number));
const files = snips.map(([a, b], k) => {
  const seg = pcm.subarray(Math.floor(a * R), Math.floor(b * R)), n = seg.length, h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + n * 2, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(R, 24); h.writeUInt32LE(R * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(n * 2, 40);
  const f = path.join(dir, `s${k}.wav`); fs.writeFileSync(f, Buffer.concat([h, Buffer.from(seg.buffer, seg.byteOffset, n * 2)])); return f;
});
const model = path.join(ROOT, 'tools', fs.existsSync(path.join(ROOT, 'tools/ggml-small.en.bin')) ? 'ggml-small.en.bin' : 'ggml-base.en.bin');
const gpu = path.join(ROOT, 'tools/whisper-cuda/Release/whisper-cli.exe');
const r = spawnSync(fs.existsSync(gpu) ? gpu : path.join(ROOT, 'tools/whisper/Release/whisper-cli.exe'), ['-m', model, '-l', 'en', '-ml', '1', '-oj', '-np', ...files.flatMap((f) => ['-f', f])], { encoding: 'utf8', cwd: dir });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
snips.forEach(([a, b], k) => {
  const ws = whisperJsonToWords(JSON.parse(fs.readFileSync(files[k] + '.json', 'utf8')));
  console.log(`${a}-${b}: ` + ws.map((w) => `${w.w}@${(a + w.t).toFixed(2)}-${(a + w.end).toFixed(2)}`).join('  '));
});
fs.rmSync(dir, { recursive: true, force: true });
