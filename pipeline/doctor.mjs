#!/usr/bin/env node
/* Setup check for claude-yt-suite. Prints what works, what's missing, and the one step to fix each. Never prints secrets. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { ROOT, loadEnv, readJson } from './swipe/lib.mjs';

loadEnv();
const rows = [];
const ok = (name, detail) => rows.push(['✓', name, detail]);
const bad = (name, fix) => rows.push(['✗', name, fix]);
const warn = (name, detail) => rows.push(['~', name, detail]);
const exists = (p) => fs.existsSync(path.resolve(ROOT, p));

const major = Number(process.versions.node.split('.')[0]);
major >= 22 ? ok('Node', process.versions.node) : bad('Node', `found ${process.versions.node}; install Node 22 or newer`);

// the host (whose channel this is): suite.json + channels/<id>.json (docs/START-HERE.md, phase 1)
const suite = readJson(path.join(ROOT, 'suite.json'), null);
if (!suite?.host) bad('host', 'no suite.json host yet: run phase 1 of docs/START-HERE.md (ask Claude: "set me up as the host")');
else if (!exists(`channels/${suite.host}.json`)) bad('host', `suite.json names "${suite.host}" but channels/${suite.host}.json is missing`);
else {
  const ch = readJson(path.join(ROOT, 'channels', `${suite.host}.json`), {});
  ok('host', `${suite.host} (${ch.name || '?'})${ch.rules && exists(ch.rules) ? `, rules ${ch.rules}` : ', NO rules file yet (docs/host-rules.md)'}`);
}

const ytdlp = path.join(ROOT, 'tools', 'yt-dlp.exe');
if (fs.existsSync(ytdlp)) { const v = spawnSync(ytdlp, ['--version'], { encoding: 'utf8' }); ok('yt-dlp', v.stdout.trim()); } else bad('yt-dlp', 'download yt-dlp.exe into tools/ (SETUP.md)');
exists('tools/whisper/Release/whisper-cli.exe') ? ok('whisper.cpp (CPU)', 'tools/whisper/Release') : bad('whisper.cpp (CPU)', 'unzip a whisper.cpp Windows release into tools/whisper/Release (SETUP.md)');
exists('tools/whisper-cuda/Release/whisper-cli.exe') ? ok('whisper.cpp (GPU)', 'tools/whisper-cuda/Release') : warn('whisper.cpp (GPU)', 'optional: the CUDA build in tools/whisper-cuda/Release transcribes ~3x faster (SETUP.md)');
exists('tools/ggml-base.en.bin') ? ok('whisper model', 'ggml-base.en.bin' + (exists('tools/ggml-small.en.bin') ? ' + small.en' : '')) : bad('whisper model', 'put ggml-base.en.bin in tools/ (SETUP.md)');
if (!exists('tools/ggml-small.en.bin')) warn('whisper small.en', 'put ggml-small.en.bin in tools/: voice work, word timing and the shorts checks use it');
exists('tools/mediapipe/face_landmarker.task') ? ok('face model', 'tools/mediapipe/face_landmarker.task') : warn('face model', 'download face_landmarker.task into tools/mediapipe/ (script-glance trims and shorts face tracking)');
const chrome = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
chrome ? ok('Chrome', chrome) : bad('Chrome', 'install Google Chrome (the graphics renderer and face tools run in it) or set CHROME_PATH');
const nv = spawnSync('nvidia-smi', ['-L'], { encoding: 'utf8' });
nv.status === 0 ? ok('NVIDIA GPU', nv.stdout.split('\n')[0].trim()) : warn('NVIDIA GPU', 'none found: renders and shorts fall back to the CPU encoder (slower); whisper runs on the CPU build');
try { const f = (await import('ffmpeg-static')).default; fs.existsSync(f) ? ok('ffmpeg', f) : bad('ffmpeg', 'ffmpeg-static binary missing: copy ffmpeg.exe into node_modules/ffmpeg-static/'); } catch { bad('ffmpeg', 'npm install'); }
try { await import('exceljs'); ok('exceljs', 'xlsx export'); } catch { bad('exceljs', 'npm install'); }

// YouTube public endpoints (free research path)
try {
  const r = await fetch('https://www.youtube.com/feeds/videos.xml?playlist_id=UULFoaI5is-bILT3XVctKl5hpA', { headers: { 'user-agent': 'Mozilla/5.0' } });
  r.status === 200 ? ok('YouTube RSS', 'exact views + dates reachable') : warn('YouTube RSS', `HTTP ${r.status}`);
} catch (e) { warn('YouTube RSS', e.message); }

// Apify (optional: TikTok/Instagram only)
process.env.APIFY_TOKEN ? ok('Apify token', 'set in .env (TikTok/Instagram available)') : warn('Apify token', 'not set: fine for YouTube-only. For TikTok/IG add APIFY_TOKEN=... to .env');

// Channels and voice
for (const f of fs.existsSync(path.join(ROOT, 'channels')) ? fs.readdirSync(path.join(ROOT, 'channels')).filter((x) => x.endsWith('.json') && !x.startsWith('_')) : []) {
  const id = f.replace(/\.json$/, '');
  const idx = readJson(path.join(ROOT, 'voice', id, 'index.json'), null);
  // transcripts actually on disk (the index remembers ones made on another machine; reference voices ship without them)
  const n = idx ? Object.keys(idx.videos).filter((vid) => exists(`voice/${id}/transcripts/${vid}.txt`)).length : 0;
  const listed = idx ? Object.keys(idx.videos).length : 0;
  // A voice is ready only with all five parts (see .claude/skills/voice-learn).
  const need = readJson(path.join(ROOT, 'channels', f), {}).role === 'voice-reference' ? 20 : 30;
  const bank = readJson(path.join(ROOT, 'voice', id, 'passages.json'), null);
  const parts = [
    [`${n}/${listed} transcripts`, n >= need],
    ['fingerprint', exists(`voice/${id}/fingerprint.json`)],
    [`passages${bank ? ` (${bank.passages.length}, types: ${Object.keys(bank.profiles || {}).filter((t) => t !== 'all').join('/') || 'none'})` : ''}`, !!bank],
    ['voice-guide', exists(`voice/${id}/voice-guide.md`)],
    ['blind control', exists(`voice/${id}/blind-control.md`)],
  ];
  const ready = parts.every(([, okPart]) => okPart);
  (ready ? ok : warn)(`voice: ${id}`, parts.map(([label, okPart]) => `${okPart ? '' : 'NO '}${label}`).join(' · ') + (ready ? '' : '  (run /voice-learn)'));
}

// DaVinci Resolve
const resolveExe = ['E:/davinci/Resolve.exe', 'C:/Program Files/Blackmagic Design/DaVinci Resolve/Resolve.exe'].find((p) => fs.existsSync(p));
resolveExe ? ok('DaVinci Resolve', resolveExe) : warn('DaVinci Resolve', 'Resolve.exe not found in Program Files (Studio 21+ for the MCP; the free version can import the timeline files by hand)');
const cfg = readJson(path.join(os.homedir(), '.claude.json'), {});
const projCfg = Object.entries(cfg.projects || {}).find(([k]) => path.resolve(k).toLowerCase() === ROOT.toLowerCase())?.[1] || {};
const mcpNames = [...Object.keys(cfg.mcpServers || {}), ...Object.keys(projCfg.mcpServers || {}), ...Object.keys(readJson(path.join(ROOT, '.mcp.json'), {}).mcpServers || {})];
const resolveMcp = mcpNames.find((n) => /resolve|davinci/i.test(n));
resolveMcp ? ok('Resolve MCP', `registered as "${resolveMcp}"`) : warn('Resolve MCP', 'not registered with Claude Code. In Resolve Studio 21.1: File > Setup AI Assistants > Claude Code (see docs/resolve-editing.md). Timeline import works without it.');
const resultMd = path.join(ROOT, 'renders', 'resolve-smoke', 'RESULT.md');
if (fs.existsSync(resultMd)) {
  const head = fs.readFileSync(resultMd, 'utf8').split('\n').slice(0, 4).join(' ');
  const tested = /Resolve Studio ([\d.]+)[^.]*?(\d{4}-\d\d-\d\d)/.exec(head);
  ok('Resolve import tested', tested ? `Studio ${tested[1]} on ${tested[2]} (renders/resolve-smoke/RESULT.md)` : 'renders/resolve-smoke/RESULT.md');
} else warn('Resolve import tested', 'no renders/resolve-smoke/RESULT.md: the first /resolve-edit runs the smoke test');

const styles = fs.existsSync(path.join(ROOT, 'styles')) ? fs.readdirSync(path.join(ROOT, 'styles')).filter((d) => exists(`styles/${d}/style.json`)) : [];
styles.length ? ok('edit styles', styles.join(', ')) : warn('edit styles', 'none yet (run /edit-style on a reference video)');

const w = Math.max(...rows.map((r) => r[1].length));
for (const [m, n, d] of rows) console.log(`${m} ${n.padEnd(w)}  ${d}`);
process.exit(rows.some((r) => r[0] === '✗') ? 1 : 0);
