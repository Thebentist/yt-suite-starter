#!/usr/bin/env node
// Listen by machine to the vertical edits from shorts-build.mjs: transcribe each finished file and line its words up
// with the words the plan says it contains. A word missing within 0.6 s of a join between pieces is a clipped word
// (FAIL); elsewhere it is usually whisper (listed, not failed). Also checks the picture (1080x1920, 30 fps, duration)
// and the audio (loudness, true peak).
//   node pipeline/edit/shorts-check.mjs --slug bad-breath-for-good [--clip id] [--draft d1] [--dir tiktok]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FFMPEG, FFPROBE, parseArgs } from '../resolve/media.mjs';
import { loudness } from './clean-audio.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseArgs(process.argv.slice(2));
const VD = path.join(ROOT, 'videos', args.slug), TT = path.join(VD, args.dir || 'tiktok'), DRAFT = args.draft || 'd1';
const plan = JSON.parse(fs.readFileSync(path.join(TT, 'plan.resolved.json'), 'utf8'));
// whisper writes the same speech two ways between runs ("wanna" / "want to", "'cause" / "because")
const SAME = { wanna: 'want to', gonna: 'going to', gotta: 'got to', cause: 'because', cuz: 'because', kinda: 'kind of', percent: '' };
const norm = (s) => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').map((x) => SAME[x] || x).join(' ');
const toks = (ws) => ws.flatMap((w) => norm(w.w).split(' ').filter(Boolean).map((x) => ({ x, t: w.t })));
const WHISPER = [path.join(ROOT, 'tools/whisper-cuda/Release/whisper-cli.exe'), path.join(ROOT, 'tools/whisper/Release/whisper-cli.exe')].find((p) => fs.existsSync(p));
const MODEL = path.join(ROOT, 'tools', 'ggml-small.en.bin');
let allOk = true;
for (const c of plan.clips.filter((c) => !args.clip || String(args.clip).split(',').includes(c.id))) {
  const base = path.join(TT, 'out', `${c.id}-${DRAFT}`), mp4 = base + '.mp4';
  if (!fs.existsSync(mp4)) { console.log(`[${c.id}] not built`); allOk = false; continue; }
  const rep = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
  const expect = JSON.parse(fs.readFileSync(base + '.words.json', 'utf8'));
  const heardPrefix = path.join(TT, 'work', c.id, 'heard');
  if (!fs.existsSync(heardPrefix + '.words.json') || fs.statSync(heardPrefix + '.words.json').mtimeMs < fs.statSync(mp4).mtimeMs) {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'pipeline', 'edit', 'transcribe.mjs'), '--in', mp4, '--out', heardPrefix], { encoding: 'utf8' });
    if (r.status) { console.log(`[${c.id}] transcription failed\n${r.stderr.slice(-800)}`); allOk = false; continue; }
  }
  const heard = JSON.parse(fs.readFileSync(heardPrefix + '.words.json', 'utf8')).filter((w) => String(w.w).trim() && !/^\[.*\]$/.test(w.w));
  const E = toks(expect), Hd = toks(heard);
  // longest common subsequence on word tokens, then walk it for the expected words that were not heard
  const n = E.length, m = Hd.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = E[i].x === Hd[j].x ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const missing = [], extra = []; let i = 0, j = 0;
  while (i < n && j < m) { if (E[i].x === Hd[j].x) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) missing.push(E[i++]); else extra.push(Hd[j++]); }
  while (i < n) missing.push(E[i++]);
  while (j < m) extra.push(Hd[j++]);
  // joins include the very start (a clip that opens on a leftover "And" is a join problem too); extra words heard at a
  // join are the other half (a lead-in the plan left out, still in the audio)
  const seams = [0, ...rep.pieces.slice(1).map((p) => p.at)];
  const atSeam = missing.filter((w) => seams.some((s) => Math.abs(w.t - s) < 0.6 && !(s === 0 && w.t > 0.15)));
  const extraAtSeam = extra.filter((w) => seams.some((s) => Math.abs(w.t - s) < 0.6));
  // every cut, heard on its own: the first and last 1.6 s of each piece from the dialogue stem, with a little silence
  // around it (whisper invents or drops words at the very start of a file and where two pieces meet, so the whole-file
  // comparison above can only point; this decides). A start must open on the piece's first (or second) word, an end
  // must close on its last (or second-last) word.
  const dlg = JSON.parse(fs.readFileSync(path.join(VD, 'out', 'final', 'stems.json'), 'utf8')).stems.find((s) => s.id === 'dialogue');
  const edgeFails = [];
  for (const [k, p] of rep.pieces.entries()) {
    if (p.foreign) continue;
    // the piece's own words, as the builder assigned them (older builds without the key: by time)
    const len = p.to - p.from, key = `${p.n}.${p.part || 0}`;
    const span = expect.some((w) => w.piece) ? toks(expect.filter((w) => w.piece === key)).map((w) => w.x) : E.filter((w) => w.t >= p.at - 0.05 && w.t < p.at + len - 0.02).map((w) => w.x);
    if (!span.length) continue;
    const prev = rep.pieces[k - 1], next = rep.pieces[k + 1];
    const cutIn = !(prev && Math.abs(prev.to - p.from) < 0.02), cutOut = !(next && Math.abs(next.from - p.to) < 0.02);
    for (const [side, a, b] of [['start', p.from, Math.min(p.to, p.from + 1.6)], ['end', Math.max(p.from, p.to - 1.6), p.to]]) {
      if ((side === 'start' && !cutIn) || (side === 'end' && !cutOut)) continue;
      const wav = path.join(TT, 'work', c.id, `edge-${k}-${side}.wav`);
      spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', a.toFixed(3), '-to', b.toFixed(3), '-i', dlg.file, '-af', 'afade=t=in:d=0.012,areverse,afade=t=in:d=0.015,areverse,apad=pad_dur=0.6,adelay=300:all=1', '-ar', '16000', '-ac', '1', wav]);
      const r = spawnSync(WHISPER, ['-m', MODEL, '-f', wav, '-l', 'en', '-nt', '-np'], { encoding: 'utf8' });
      const got = norm(r.stdout || '').split(' ').filter(Boolean);
      // plan segment "accept": other first/last words already checked by ear or by snippet ("have" for a soft "If")
      const acc = (c.segments.find((s) => s.n === p.n)?.accept || []).map(norm);
      const ok = side === 'start' ? got.length && [...span.slice(0, 2), ...acc].includes(got[0]) : got.length && [...span.slice(-2), ...acc].includes(got.at(-1));
      if (!ok) edgeFails.push(`piece ${p.n} ${side} at ${(side === 'start' ? p.from : p.to).toFixed(3)}: heard "${got.join(' ')}", planned "${(side === 'start' ? span.slice(0, 4) : span.slice(-4)).join(' ')}"`);
    }
  }
  const pr = JSON.parse(spawnSync(FFPROBE, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', mp4], { encoding: 'utf8' }).stdout);
  const v = pr.streams.find((s) => s.codec_type === 'video'), a = pr.streams.find((s) => s.codec_type === 'audio');
  const [fn, fd] = v.r_frame_rate.split('/').map(Number), dur = +pr.format.duration, loud = await loudness(mp4);
  const checks = [
    ['size', v.width === 1080 && v.height === 1920, `${v.width}x${v.height} ${v.codec_name}`],
    ['frame rate', Math.abs(fn / fd - 30) < 0.01, (fn / fd).toFixed(3)],
    ['duration', Math.abs(dur - rep.duration) < 0.1, `${dur.toFixed(3)} s (planned ${rep.duration})`],
    ['audio', !!a && Math.abs(loud.lufs - (-14)) < 1 && loud.truePeak <= -1, `${a?.codec_name} ${loud.lufs} LUFS, true peak ${loud.truePeak} dBTP`],
    ['cuts', edgeFails.length === 0, edgeFails.join('; ') || 'every cut opens on its first word and closes on its last'],
    ['words (whole file, a pointer)', true, `${n - missing.length}/${n} heard; near joins: missing ${atSeam.map((w) => `"${w.x}"@${w.t.toFixed(1)}`).join(' ') || 'none'}, extra ${extraAtSeam.map((w) => `"${w.x}"@${w.t.toFixed(1)}`).join(' ') || 'none'}; elsewhere missing: ${missing.filter((w) => !atSeam.includes(w)).map((w) => `"${w.x}"@${w.t.toFixed(1)}`).join(' ') || 'none'}`],
  ];
  for (const [k, ok, d] of checks) { console.log(`[${c.id}] ${ok ? 'PASS' : 'FAIL'} ${k}: ${d}`); if (!ok) allOk = false; }
}
console.log(allOk ? '[shorts-check] all passed' : '[shorts-check] FAILED');
process.exit(allOk ? 0 : 1);
