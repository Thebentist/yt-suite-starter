/* The swipe file for one research run: research/<channel>/<run>/swipe.json is the source of truth,
 * `Video Swipe File.xlsx` beside it is regenerated from it (never edit the xlsx and expect it to flow back).
 * Tabs mirror Angus Sewell's three-prompt build: Brief, Niches, Videos, Checks, Concepts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, writeJson, canonicalUrl, nowIso } from './lib.mjs';

export const STATUSES = ['found', 'qualified', 'excluded', 'needs_data', 'rewritten'];
export const FORMATS = ['youtube_long', 'youtube_short', 'youtube_live', 'youtube_under_min', 'tiktok_video', 'instagram_reel'];
export const PLATFORMS = ['youtube', 'tiktok', 'instagram'];

export const BRIEF_COLUMNS = ['idea', 'audience', 'own_niche', 'language', 'market', 'format', 'youtube_url', 'youtube_size', 'tiktok_url', 'tiktok_size', 'instagram_url', 'instagram_size', 'as_of', 'window_start', 'budget_limit', 'budget_unit', 'own_searches', 'platforms', 'formats', 'min_duration_sec'];
export const NICHE_COLUMNS = ['niche_id', 'rank', 'niche', 'overlap', 'transfer_reason', 'searches'];
export const VIDEO_COLUMNS = ['video_id', 'platform', 'format', 'url', 'creator_url', 'creator_size', 'published_at', 'title_or_caption', 'image_url', 'count', 'metric', 'observed_at', 'baseline_sample', 'baseline_median', 'multiple', 'status', 'reason'];
export const CHECK_COLUMNS = ['platform', 'query_or_url', 'checked_at', 'outcome', 'detail'];
export const CONCEPT_COLUMNS = ['video_id', 'source_url', 'original_title_or_caption', 'source_multiple', 'mechanism', 'why_it_worked', 'my_title', 'my_thumbnail', 'my_angle', 'image_check'];

export function load(dir) {
  const s = readJson(path.join(dir, 'swipe.json'), null);
  if (!s) throw new Error(`no swipe.json in ${dir} (run: node pipeline/swipe/swipe.mjs init ...)`);
  s.videos ??= []; s.checks ??= []; s.concepts ??= []; s.niches ??= []; s.cursors ??= {}; s.spend ??= { total: 0, unit: s.brief?.budget_unit || 'USD', runs: [] };
  return s;
}

export function save(dir, s) {
  s.updated_at = nowIso();
  writeJson(path.join(dir, 'swipe.json'), s);
}

export function nextId(list, prefix, key) {
  let max = 0;
  for (const r of list) { const n = Number(String(r[key] || '').split('-').pop()); if (n > max) max = n; }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

// Insert or reuse by canonical URL. Returns { row, created }.
export function upsertVideo(s, rec) {
  const url = canonicalUrl(rec.url);
  let row = s.videos.find((v) => v.url === url);
  if (row) {
    for (const [k, v] of Object.entries(rec)) if (v != null && (row[k] == null || row[k] === '')) row[k] = v;
    for (const q of rec.found_by || []) if (!row.found_by?.some((f) => f.query === q.query && f.niche_id === q.niche_id)) (row.found_by ??= []).push(q);
    return { row, created: false };
  }
  row = { video_id: nextId(s.videos, 'video', 'video_id'), ...rec, url, status: 'found', reason: rec.reason || null };
  s.videos.push(row);
  return { row, created: true };
}

export function logCheck(s, platform, query_or_url, outcome, detail) {
  s.checks.push({ platform, query_or_url, checked_at: nowIso(), outcome, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
}

export function recordSpend(s, entry) {
  s.spend.runs.push({ at: nowIso(), ...entry });
  s.spend.total = Math.round((s.spend.total + (entry.cost || 0)) * 1e6) / 1e6;
}

export function remainingBudget(s) {
  const raw = s.brief?.budget_limit;
  const limit = raw == null || raw === '' ? NaN : Number(raw);
  if (!Number.isFinite(limit)) return null;
  return limit - (s.spend?.total || 0);
}

export function sizeFor(s, platform) {
  const n = Number(s.brief?.[`${platform}_size`]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function platformOfFormat(format) {
  return format?.startsWith('youtube') ? 'youtube' : format?.startsWith('tiktok') ? 'tiktok' : format?.startsWith('instagram') ? 'instagram' : null;
}

export const activePlatforms = (s) => (s.brief?.platforms?.length ? s.brief.platforms : ['youtube']);
export const activeFormats = (s) => (s.brief?.formats?.length ? s.brief.formats : ['youtube_long']);

export function counts(s) {
  const out = {};
  for (const p of PLATFORMS) {
    const rows = s.videos.filter((v) => v.platform === p);
    out[p] = { total: rows.length };
    for (const st of STATUSES) out[p][st] = rows.filter((v) => v.status === st).length;
  }
  return out;
}
