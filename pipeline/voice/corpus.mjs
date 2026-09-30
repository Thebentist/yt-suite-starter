#!/usr/bin/env node
/* Build a creator's voice corpus from YouTube: list uploads, pull audio, transcribe locally with whisper.cpp.
 *   node pipeline/voice/corpus.mjs --channel thebentist [--long 45] [--shorts 40] [--model tools/ggml-small.en.bin] [--list-only]
 *   node pipeline/voice/corpus.mjs --url https://www.youtube.com/@someone --id someone --long 30
 *   node pipeline/voice/corpus.mjs --channel altonbrown --source "https://www.youtube.com/@FoodNetwork/search?query=good%20eats" --match "Good Eats" --long 80
 * Options: --source <any listable URL: playlist, channel search, channel tab> instead of the channel's /videos and /shorts tabs;
 *          --match <title regex>; --min-seconds N; --max-minutes N (default 40: skips 2-hour compilations);
 *          --pause N seconds between downloads (default 8); --cpu to force the CPU whisper build.
 * Why whisper and not captions: YouTube returns HTTP 429 for caption downloads from this machine, and whisper punctuates,
 * which the fingerprint needs for sentence statistics. With the CUDA build in tools/whisper-cuda it runs ~22x realtime.
 * Output: voice/<id>/index.json (every listed upload with views, duration, transcript status)
 *         voice/<id>/transcripts/<videoId>.txt and .words.json. Audio is deleted after each transcript.
 * Resumable: rerun the same command and it skips finished videos. Stops cleanly at the first YouTube bot check.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, parseArgs, readJson, writeJson, nowIso } from '../swipe/lib.mjs';

const args = parseArgs();
const YTDLP = path.join(ROOT, 'tools', 'yt-dlp.exe');
const BOT = /confirm you.?re not a bot|Sign in to confirm|HTTP Error 429/i;

let id = args.id, url = args.url;
if (args.channel) {
  const ch = readJson(path.join(ROOT, 'channels', `${args.channel}.json`), null);
  if (!ch) { console.error(`channels/${args.channel}.json not found`); process.exit(1); }
  id = args.channel; url = url || ch.platforms?.youtube?.url;
  if (!args.source && ch.voice_source?.url) { args.source = ch.voice_source.url; args.match ??= ch.voice_source.match; args['min-seconds'] ??= ch.voice_source.min_seconds; }
}
if (!id || (!url && !args.source && !args['ids-file'])) { console.error('usage: --channel <id in channels/> | --url <youtube channel url> --id <name> [--source <url>]'); process.exit(1); }

const nLong = Number(args.long ?? 60), nShorts = Number(args.shorts ?? 40);
const dir = path.join(ROOT, 'voice', id);
const tDir = path.join(dir, 'transcripts'), aDir = path.join(dir, 'audio');
fs.mkdirSync(tDir, { recursive: true }); fs.mkdirSync(aDir, { recursive: true });
const indexPath = path.join(dir, 'index.json');
const index = readJson(indexPath, { channel_url: url || args.source, videos: {} });

function listUrl(src, n, fmt) {
  const r = spawnSync(YTDLP, ['--flat-playlist', '--no-warnings', '--playlist-end', String(n), '--print', '%(id)s\t%(duration)s\t%(view_count)s\t%(url)s\t%(title)s', src], { encoding: 'utf8', maxBuffer: 32 << 20 });
  if (r.status !== 0) { console.error(`[corpus] listing ${src} failed: ${(r.stderr || '').split('\n').filter(Boolean).pop()}`); return []; }
  return r.stdout.trim().split('\n').filter(Boolean).map((l) => {
    const [vid, dur, views, u, ...t] = l.split('\t');
    return { id: vid, duration: Number(dur) || null, views: Number(views) || null, title: t.join('\t'), format: fmt || (/\/shorts\//.test(u || '') ? 'short' : 'long') };
  }).filter((v) => /^[\w-]{11}$/.test(v.id));
}

const maxMin = Number(args['max-minutes'] ?? 40), minSec = Number(args['min-seconds'] || 0);
const match = args.match && args.match !== true ? new RegExp(args.match, 'i') : null;
const base = url ? url.replace(/\/+$/, '') : null;
// --ids-file <tsv>: a hand-picked list (id<TAB>views<TAB>seconds<TAB>title per line, as yt-dlp --print writes it), no listing request.
const fromFile = args['ids-file'] && args['ids-file'] !== true
  ? fs.readFileSync(path.resolve(ROOT, args['ids-file']), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const [vid, views, dur, ...t] = l.split('\t'); return { id: vid, views: Number(views) || null, duration: Number(dur) || null, title: t.join('\t'), format: 'long' }; }).filter((v) => /^[\w-]{11}$/.test(v.id))
  : null;
const listed = (fromFile || (args.source ? listUrl(args.source, nLong) : [...(nLong ? listUrl(`${base}/videos`, nLong, 'long') : []), ...(nShorts ? listUrl(`${base}/shorts`, nShorts, 'short') : [])]))
  .filter((v) => (!v.duration || (v.duration <= maxMin * 60 && v.duration >= minSec)) && (!match || match.test(v.title || '')));
for (const v of listed) index.videos[v.id] = { ...(index.videos[v.id] || {}), ...v };
index.listed_at = nowIso();
writeJson(indexPath, index);
console.log(`[corpus] ${id}: listed ${listed.length} uploads (${listed.filter((v) => v.format === 'long').length} long, ${listed.filter((v) => v.format === 'short').length} shorts)`);
if (args['list-only']) process.exit(0);

// GPU build present: small.en (accurate, ~22x realtime). CPU only: base.en unless --accurate.
const hasGpu = !args.cpu && fs.existsSync(path.join(ROOT, 'tools/whisper-cuda/Release/whisper-cli.exe'));
const model = args.model || (fs.existsSync(path.join(ROOT, 'tools/ggml-small.en.bin')) && (hasGpu || args.accurate) ? 'tools/ggml-small.en.bin' : 'tools/ggml-base.en.bin');
const pauseMs = Number(args.pause ?? 8) * 1000;
const todo = listed.filter((v) => !fs.existsSync(path.join(tDir, `${v.id}.txt`)));
console.log(`[corpus] ${todo.length} to transcribe with ${path.basename(model)} on ${hasGpu ? 'GPU' : 'CPU'} (${listed.length - todo.length} already done)`);
let done = 0; const t0 = Date.now();
for (const v of todo) {
  if (done > 0 || todo.indexOf(v) > 0) await new Promise((r) => setTimeout(r, pauseMs)); // pace requests to YouTube
  const watch = v.format === 'short' ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;
  const dl = spawnSync(YTDLP, ['-f', 'ba[ext=m4a]/ba', '--no-warnings', '--no-playlist', '--sleep-requests', '1', '-o', path.join(aDir, '%(id)s.%(ext)s'), watch], { encoding: 'utf8' });
  const audio = fs.readdirSync(aDir).find((f) => f.startsWith(v.id + '.') && !f.endsWith('.part') && !f.endsWith('.wav'));
  if (dl.status !== 0 || !audio) {
    if (BOT.test(dl.stderr || '')) { console.log(`[corpus] YouTube bot check on ${v.id}: stopping. Rerun the same command in a few hours to resume (${done} transcribed this run).`); break; }
    index.videos[v.id].error = (dl.stderr || 'download failed').split('\n').filter(Boolean).pop();
    writeJson(indexPath, index); console.log(`[corpus] ${v.id} download failed, skipping: ${index.videos[v.id].error}`); continue;
  }
  const tr = spawnSync(process.execPath, [path.join(ROOT, 'pipeline/edit/transcribe.mjs'), '--in', path.join(aDir, audio), '--model', model, '--out', path.join(tDir, v.id), ...(args.cpu ? ['--cpu'] : [])], { encoding: 'utf8', maxBuffer: 64 << 20 });
  for (const f of fs.readdirSync(aDir)) if (f.startsWith(v.id + '.')) fs.rmSync(path.join(aDir, f), { force: true });
  for (const ext of ['.16k.wav', '.srt', '.json']) fs.rmSync(path.join(tDir, v.id + ext), { force: true });
  if (tr.status !== 0) { index.videos[v.id].error = 'transcribe failed'; writeJson(indexPath, index); console.log(`[corpus] ${v.id} transcribe failed`); continue; }
  index.videos[v.id].transcribed_at = nowIso(); index.videos[v.id].model = path.basename(model); delete index.videos[v.id].error;
  writeJson(indexPath, index);
  done++;
  const per = (Date.now() - t0) / done / 1000;
  console.log(`[corpus] ${done}/${todo.length} ${v.id} "${(v.title || '').slice(0, 50)}" (~${Math.round((per * (todo.length - done)) / 60)} min left)`);
}
console.log(`[corpus] finished: ${Object.values(index.videos).filter((v) => v.transcribed_at).length} transcripts in ${tDir}`);
