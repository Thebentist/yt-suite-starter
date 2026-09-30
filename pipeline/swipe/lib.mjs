/* Shared helpers for the swipe research tools (pipeline/swipe/*). No dependencies beyond Node 22+. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const k = a.slice(2); const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) args[k] = true; else { args[k] = v; i++; }
  }
  return args;
}

// Reads KEY=value lines from .env at the repo root into process.env (never overrides what is already set).
export function loadEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const nowIso = () => new Date().toISOString();
export const daysAgoIso = (iso, days) => new Date(new Date(iso).getTime() - days * 86400e3).toISOString();

export function median(nums) {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// One canonical URL per video so rows are reused, never duplicated.
export function canonicalUrl(url) {
  if (!url) return url;
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return url.includes('/shorts/') ? `https://www.youtube.com/shorts/${m[1]}` : `https://www.youtube.com/watch?v=${m[1]}`;
  m = url.match(/tiktok\.com\/@([^/?#]+)\/(?:video|photo)\/(\d+)/);
  if (m) return `https://www.tiktok.com/@${m[1].toLowerCase()}/video/${m[2]}`;
  m = url.match(/instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p)\/([\w-]+)/);
  if (m) return `https://www.instagram.com/reel/${m[1]}/`;
  return url.split('#')[0].replace(/\/+$/, '');
}

export function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

export function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function fmtNum(n) {
  if (n == null || !Number.isFinite(n)) return '?';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K';
  return String(Math.round(n));
}

export function table(rows, cols) {
  const w = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)));
  const line = (vals) => vals.map((v, i) => String(v ?? '').padEnd(w[i])).join('  ');
  return [line(cols), line(w.map((n) => '-'.repeat(n))), ...rows.map((r) => line(cols.map((c) => r[c])))].join('\n');
}
