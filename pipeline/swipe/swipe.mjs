#!/usr/bin/env node
/* Swipe file engine: find videos that beat their own creator's baseline, then hand them to Claude to adapt.
 * Method from Angus Sewell's "Find your next winning video": 90-day window, creators up to 10x your size,
 * candidate count / median of the creator's 10 other most recent same-format uploads, qualified at 3x or more.
 * Every number is computed here; Claude does the judgment (niches, relevance, thumbnails, rewrites).
 *
 *   node pipeline/swipe/swipe.mjs init      --channel thebentist --run <slug>
 *   node pipeline/swipe/swipe.mjs plan      --run <dir> --file <plan.json>     Brief + 8 niches (written by the swipe-niches skill)
 *   node pipeline/swipe/swipe.mjs check     --run <dir>                        one real video + creator per platform (connection test)
 *   node pipeline/swipe/swipe.mjs discover  --run <dir> --platform youtube|tiktok|instagram [--per-query 15]
 *   node pipeline/swipe/swipe.mjs review    --run <dir> --platform <p>         unjudged candidates, for Claude's relevance call
 *   node pipeline/swipe/swipe.mjs judge     --run <dir> --relevant id,id --off-topic id,id [--reason "..."]
 *   node pipeline/swipe/swipe.mjs baseline  --run <dir> --platform <p> [--batch 10] [--retry-needs-data]
 *   node pipeline/swipe/swipe.mjs status    --run <dir>
 *   node pipeline/swipe/swipe.mjs winners   --run <dir> [--json] [--all]       qualified rows, normal confidence first, then by multiple
 *   node pipeline/swipe/swipe.mjs thumbs    --run <dir> [--ids id,id]          download covers so Claude can look at them
 *   node pipeline/swipe/swipe.mjs concepts  --run <dir> --file <concepts.json> upsert rewrites (swipe-rewrite skill)
 *   node pipeline/swipe/swipe.mjs export    --run <dir>                        writes "Video Swipe File.xlsx"
 * <dir> is research/<channel>/<run-slug>. swipe.json there is the source of truth.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, readJson, nowIso, daysAgoIso, median, canonicalUrl, fmtNum, table } from './lib.mjs';
import * as S from './store.mjs';
import * as yt from './providers/youtube.mjs';
import * as tt from './providers/tiktok.mjs';
import * as ig from './providers/instagram.mjs';
import { token, me, perItemEstimate } from './providers/apify.mjs';

const args = parseArgs();
const cmd = args._[0];
const MULTIPLE = 3, SIZE_CAP = 10, BASELINE_N = 10, BASELINE_MIN = 5;
const METRIC = { youtube: 'views', tiktok: 'plays', instagram: 'plays' };

function dirOf() {
  if (!args.run) die('--run <research/<channel>/<run>> is required');
  return path.resolve(ROOT, args.run);
}
function die(msg) { console.error(`[swipe] ${msg}`); process.exit(1); }
const list = (v) => (v && v !== true ? String(v).split(',').map((x) => x.trim()).filter(Boolean) : []);
const inWindow = (s, iso) => iso && iso >= s.brief.window_start && iso <= s.brief.as_of;

// ---------- init ----------
async function init() {
  const ch = args.channel || 'thebentist';
  if (!args.run) die('--run <slug> is required (e.g. --run 2026-09-braces)');
  const dir = args.run.includes('/') || args.run.includes('\\') ? path.resolve(ROOT, args.run) : path.join(ROOT, 'research', ch, args.run);
  if (fs.existsSync(path.join(dir, 'swipe.json'))) { console.log(`[swipe] ${path.relative(ROOT, dir)} already exists; reusing it`); return; }
  const c = readJson(path.join(ROOT, 'channels', `${ch}.json`), {});
  const as_of = nowIso();
  const p = c.platforms || {};
  const s = {
    version: 1, channel: ch, created_at: as_of,
    brief: {
      idea: null, audience: c.audience || null, own_niche: c.niche || null, language: c.language || 'English', market: c.market || null, format: null,
      youtube_url: p.youtube?.url || null, youtube_size: p.youtube?.size ?? null,
      tiktok_url: p.tiktok?.url || null, tiktok_size: p.tiktok?.size ?? null,
      instagram_url: p.instagram?.url || null, instagram_size: p.instagram?.size ?? null,
      as_of, window_start: daysAgoIso(as_of, 90), budget_limit: null, budget_unit: 'USD', own_searches: { youtube: [], tiktok: [], instagram: [] },
      platforms: list(args.platforms).length ? list(args.platforms) : ['youtube'],
      formats: list(args.formats).length ? list(args.formats) : ['youtube_long'],
    },
    own: { youtube: p.youtube?.channel_id || null, tiktok: p.tiktok?.handle || null, instagram: p.instagram?.handle || null },
    niches: [], videos: [], checks: [], concepts: [], creators: {}, cursors: {}, spend: { total: 0, unit: 'USD', runs: [] },
  };
  if (!s.own.youtube && s.brief.youtube_url) s.own.youtube = await yt.channelIdFromUrl(s.brief.youtube_url);
  S.save(dir, s);
  console.log(`[swipe] created ${path.relative(ROOT, dir)}/swipe.json (window ${s.brief.window_start.slice(0, 10)} to ${as_of.slice(0, 10)})`);
  console.log(JSON.stringify(s.brief, null, 2));
}

// ---------- plan ----------
function plan() {
  const dir = dirOf(); const s = S.load(dir);
  const file = readJson(path.resolve(ROOT, args.file || ''), null);
  if (!file) die('--file <plan.json> with { brief: {...}, niches: [...] } is required');
  const errs = [];
  if (file.brief) {
    for (const k of ['idea', 'window_start', 'as_of']) {
      if (s.brief[k] && file.brief[k] && file.brief[k] !== s.brief[k] && !args.force) errs.push(`brief.${k} is already set to "${s.brief[k]}"; ask the user, then rerun with --force to change it`);
    }
    for (const k of Object.keys(file.brief)) if (!S.BRIEF_COLUMNS.includes(k)) errs.push(`unknown brief field ${k}`);
  }
  const b = { ...s.brief, ...(file.brief || {}) };
  const active = b.platforms?.length ? b.platforms : ['youtube'];
  for (const p of active) if (!S.PLATFORMS.includes(p)) errs.push(`unknown platform ${p}`);
  for (const f of b.formats || []) if (!S.FORMATS.includes(f)) errs.push(`unknown format ${f} (use ${S.FORMATS.join(', ')})`);
  for (const k of ['idea', 'audience', 'own_niche', 'language', 'market', 'format', 'budget_limit', 'budget_unit']) if (b[k] == null || b[k] === '') errs.push(`brief.${k} is missing (ask the user; do not guess)`);
  for (const p of active) if (!(b.own_searches?.[p]?.length)) errs.push(`brief.own_searches.${p} needs at least one search`);
  const niches = file.niches ?? s.niches;
  if (niches.length !== 8) errs.push(`need exactly 8 adjacent niches, got ${niches.length}`);
  niches.forEach((n, i) => {
    const want = `niche-${String(i + 1).padStart(3, '0')}`;
    if (n.niche_id !== want) errs.push(`niche ${i + 1} must have niche_id ${want}`);
    if (n.rank !== i + 1) errs.push(`${want}: rank must be ${i + 1} (list niches in rank order)`);
    if ((n.overlap || '').trim().split(/\s+/).length !== 5) errs.push(`${want}: overlap must be exactly five words ("${n.overlap}")`);
    if (!n.transfer_reason) errs.push(`${want}: transfer_reason missing`);
    for (const p of active) if (!(n.searches?.[p]?.length)) errs.push(`${want}: searches.${p} missing`);
    if (n.niche && b.own_niche && n.niche.toLowerCase() === b.own_niche.toLowerCase()) errs.push(`${want}: your own niche does not count as adjacent`);
  });
  if (s.niches.length && file.niches && !args.force && JSON.stringify(s.niches.map((n) => n.niche)) !== JSON.stringify(file.niches.map((n) => n.niche)) && s.videos.length) errs.push('niches already have videos found against them; rerun with --force only if the user asked to change them');
  if (errs.length) die('plan rejected:\n  - ' + errs.join('\n  - '));
  for (const p of S.PLATFORMS) { const n = Number(b[`${p}_size`]); b[`${p}_size`] = Number.isFinite(n) && n > 0 ? n : null; }
  s.brief = b; s.niches = niches;
  S.save(dir, s);
  const blocked = active.filter((p) => !S.sizeFor(s, p));
  console.log(`[swipe] plan saved: idea "${b.idea}", 8 niches, window ${b.window_start.slice(0, 10)} to ${b.as_of.slice(0, 10)}, budget ${b.budget_limit} ${b.budget_unit}`);
  if (blocked.length) console.log(`[swipe] 10x size check BLOCKED on: ${blocked.join(', ')} (your own size there is unknown or zero); candidates there will end as needs_data`);
}

// ---------- budget ----------
function canSpend(s, est, platform, what) {
  if (platform === 'youtube') return true; // free provider
  const rem = S.remainingBudget(s);
  if (rem == null) { S.logCheck(s, platform, what, 'paused', 'remaining allowance cannot be established (brief.budget_limit missing)'); return false; }
  if (est > rem) { S.logCheck(s, platform, what, 'paused', `estimated ${est.toFixed(4)} USD exceeds remaining ${rem.toFixed(4)} USD`); return false; }
  return true;
}
function spent(s, platform, what, run) {
  S.recordSpend(s, { platform, what, actor: run.actor, run_id: run.id, cost: run.cost_usd, cached: !!run.cached, items: run.items });
  S.logCheck(s, platform, what, run.cached ? 'ok (cache, no charge)' : 'ok', `run ${run.id} ${run.cached ? '(cached)' : ''} cost ${run.cost_usd} USD; cumulative ${s.spend.total} ${s.spend.unit}`);
}

// ---------- check ----------
async function check() {
  const dir = dirOf(); const s = S.load(dir);
  const out = [];
  const r = await yt.search(s.brief.own_searches?.youtube?.[0] || 'braces', { limit: 3 });
  const first = r.items?.[0];
  if (first) {
    const d = await yt.details(first.url);
    out.push({ platform: 'youtube', url: d.url, published_at: d.published_at, count: `${d.count} views`, creator: d.creator_name, creator_size: d.creator_size, image: d.image_url });
    S.logCheck(s, 'youtube', 'connection check', d.ok ? 'ok' : 'failed', d.ok ? d.url : d.error);
  } else S.logCheck(s, 'youtube', 'connection check', 'failed', r.error || 'no results');
  if (!token()) {
    console.log('[swipe] APIFY_TOKEN not set: TikTok and Instagram checks skipped. Add APIFY_TOKEN=... to .env');
    S.logCheck(s, 'tiktok', 'connection check', 'unavailable', 'APIFY_TOKEN missing');
    S.logCheck(s, 'instagram', 'connection check', 'unavailable', 'APIFY_TOKEN missing');
  } else {
    const acct = await me().catch((e) => ({ error: e.message }));
    console.log(`[swipe] Apify account: ${JSON.stringify(acct)}`);
    for (const [p, prov] of [['tiktok', tt], ['instagram', ig]]) {
      const q = s.brief.own_searches?.[p]?.[0] || (p === 'tiktok' ? 'braces' : '#braces');
      if (!canSpend(s, 0.02, p, 'connection check')) continue;
      try {
        const res = await prov.search(q, { limit: 1, maxChargeUsd: 0.05 });
        spent(s, p, `connection check: ${q}`, res.run);
        const v = res.items[0];
        if (v) {
          if (p === 'instagram' && v.creator_id) { const z = await ig.sizes([v.creator_id], { maxChargeUsd: 0.05 }); spent(s, p, `size ${v.creator_id}`, z.run); v.creator_size = z.sizes[v.creator_id.toLowerCase()] ?? null; }
          out.push({ platform: p, url: v.url, published_at: v.published_at, count: `${v.count} ${METRIC[p]}`, creator: v.creator_id, creator_size: v.creator_size, image: v.image_url });
        } else S.logCheck(s, p, `connection check: ${q}`, 'unavailable', 'no results');
      } catch (e) { S.logCheck(s, p, `connection check: ${q}`, 'failed', e.message); console.log(`[swipe] ${p} check failed: ${e.message}`); }
    }
  }
  S.save(dir, s);
  for (const o of out) console.log(`\n${o.platform}: ${o.url}\n  published ${o.published_at}  ${o.count}  creator ${o.creator} (${fmtNum(o.creator_size)})\n  cover ${o.image}`);
  console.log(`\n[swipe] spend so far ${s.spend.total} ${s.spend.unit}`);
}

// ---------- discover ----------
async function discover() {
  const dir = dirOf(); const s = S.load(dir);
  const p = args.platform || 'youtube'; if (!S.PLATFORMS.includes(p)) die('--platform youtube|tiktok|instagram');
  if (!S.activePlatforms(s).includes(p)) die(`${p} is not in brief.platforms (${S.activePlatforms(s).join(', ')})`);
  const formats = S.activeFormats(s);
  const per = Number(args['per-query'] || (p === 'youtube' ? 20 : 15));
  const queries = [
    ...(s.brief.own_searches?.[p] || []).map((q) => ({ niche_id: 'own', query: q })),
    ...s.niches.flatMap((n) => (n.searches?.[p] || []).map((q) => ({ niche_id: n.niche_id, query: q }))),
  ];
  const cur = (s.cursors[p] ??= { done: [] });
  const todo = queries.filter((q) => !cur.done.includes(`${q.niche_id}|${q.query}`)).slice(0, Number(args['max-queries'] || 1e9));
  if (!todo.length) {
    console.log(`[swipe] ${p}: every search already ran (${queries.length})`);
    if (p === 'youtube') { await youtubeDates(s, dir, formats); console.log(`[swipe] youtube totals: ${JSON.stringify(S.counts(s).youtube)}`); }
    return;
  }
  let added = 0, seen = 0, outOfWindow = 0;
  for (const q of todo) {
    const label = `search [${q.niche_id}] ${q.query}`;
    let res;
    try {
      if (p === 'youtube') {
        // Two passes per query: this month by view count (recent hits) + this year by relevance (reaches the rest of the 90 days).
        const a = await yt.search(q.query, { limit: per, sp: 'CAMSBAgEEAE=' });
        const b = await yt.search(q.query, { limit: per, sp: 'EgQIBRAB' });
        const seenIds = new Set();
        res = { ok: a.ok || b.ok, error: a.error || b.error, items: [...a.items, ...b.items].filter((x) => !seenIds.has(x.url) && seenIds.add(x.url)) };
      }
      else {
        const est = per * perItemEstimate(p === 'tiktok' ? tt.ACTOR : 'apify/instagram-hashtag-scraper') + 0.001;
        if (!canSpend(s, est, p, label)) { console.log(`[swipe] budget stop before "${q.query}" (spent ${s.spend.total}, limit ${s.brief.budget_limit})`); break; }
        res = await (p === 'tiktok' ? tt : ig).search(q.query, { limit: per, maxChargeUsd: Math.max(0.01, Math.min(est * 1.5, S.remainingBudget(s))) });
        spent(s, p, label, res.run);
      }
    } catch (e) { res = { ok: false, error: e.message, items: [] }; }
    if (!res.ok) { S.logCheck(s, p, label, 'unavailable', res.error); cur.done.push(`${q.niche_id}|${q.query}`); S.save(dir, s); continue; }
    const minDur = Number(s.brief.min_duration_sec ?? 240); // long-form means 4+ minutes unless the Brief says otherwise
    for (const it of res.items) if (it.format === 'youtube_long' && Number.isFinite(it.duration) && it.duration < minDur) it.format = 'youtube_under_min';
    const otherFormat = res.items.filter((it) => !formats.includes(it.format) && !['tiktok_photo', 'instagram_post'].includes(it.format));
    if (p === 'youtube') S.logCheck(s, p, label, res.items.length ? 'ok' : 'no results', `${res.items.length} results${otherFormat.length ? `, ${otherFormat.length} skipped as not ${formats.join('/')}` : ''}`);
    for (const it of res.items) {
      seen++;
      if (otherFormat.includes(it)) continue;
      if (p !== 'youtube' && it.published_at && !inWindow(s, it.published_at)) { outOfWindow++; }
      const { row, created } = S.upsertVideo(s, { ...it, metric: METRIC[p], observed_at: nowIso(), provider: p === 'youtube' ? yt.PROVIDER : res.run?.actor, found_by: [{ niche_id: q.niche_id, query: q.query }] });
      if (created) {
        added++;
        if (row.format === 'tiktok_photo' || row.format === 'instagram_post') { row.status = 'excluded'; row.reason = 'not a video (photo post)'; }
        else if (row.published_at && !inWindow(s, row.published_at)) { row.status = 'excluded'; row.reason = `published ${row.published_at.slice(0, 10)}, outside the 90-day window`; }
      }
    }
    cur.done.push(`${q.niche_id}|${q.query}`);
    S.save(dir, s);
    console.log(`[swipe] ${p} ${label}: ${res.items.length} results`);
  }
  if (p === 'youtube') outOfWindow += await youtubeDates(s, dir, formats);
  const c = S.counts(s)[p];
  console.log(`[swipe] ${p}: ${seen} results seen, ${added} new candidates, ${outOfWindow} outside the window. Totals: ${JSON.stringify(c)}`);
  console.log(`[swipe] next: review --platform ${p}, then judge relevance before baseline`);
}

/* YouTube search cards carry no publish date. Dates and exact views come from each creator's long-form RSS feed (their 15
 * most recent long-form uploads): one request per creator, the same feed the baseline uses, so it's cached for baseline too.
 * yt-dlp per-video lookups trip YouTube's bot check at volume, so they're only a throttled fallback for the rare creator
 * who posts more than 15 long-form videos inside the window. */
const BOT_CHECK = /confirm you.?re not a bot|Sign in to confirm|HTTP Error 429/i;
const feedKey = (p, creatorId, format) => `${p}:${(creatorId || '').toLowerCase()}:${format}`;
async function youtubeFeed(s, creatorId, format) {
  const k = feedKey('youtube', creatorId, format);
  if (s.creators[k]) return s.creators[k];
  const f = await yt.uploads(creatorId, format);
  if (!f.ok) return null;
  s.creators[k] = { fetched_at: nowIso(), source: f.feed, items: f.items };
  return s.creators[k];
}
async function youtubeDates(s, dir, formats) {
  s.creators ??= {};
  // Rows parked by an earlier bot check get another try.
  for (const v of s.videos) if (v.platform === 'youtube' && v.status === 'needs_data' && BOT_CHECK.test(v.reason || '')) { v.status = 'found'; v.reason = null; }
  const need = s.videos.filter((v) => v.platform === 'youtube' && v.status === 'found' && !v.published_at);
  if (!need.length) return 0;
  const byCreator = new Map();
  for (const v of need) { if (!byCreator.has(v.creator_id)) byCreator.set(v.creator_id, []); byCreator.get(v.creator_id).push(v); }
  console.log(`[swipe] youtube: dating ${need.length} candidates from ${byCreator.size} creator feeds...`);
  let out = 0, n = 0; const fallback = [];
  const creators = [...byCreator.keys()];
  for (let i = 0; i < creators.length; i += 3) {
    await Promise.all(creators.slice(i, i + 3).map(async (cid) => {
      const rows = byCreator.get(cid);
      if (s.own?.youtube && cid === s.own.youtube) { for (const v of rows) { v.status = 'excluded'; v.reason = 'your own video'; } return; }
      const format = rows[0].format === 'youtube_short' ? 'youtube_short' : 'youtube_long';
      const feed = cid ? await youtubeFeed(s, cid, format) : null;
      if (!feed) { for (const v of rows) fallback.push(v); return; }
      const oldest = feed.items.map((r) => r.published_at).filter(Boolean).sort()[0];
      for (const v of rows) {
        const hit = feed.items.find((r) => r.native_id === v.native_id);
        v.image_url ??= `https://i.ytimg.com/vi/${v.native_id}/hqdefault.jpg`;
        if (hit) {
          Object.assign(v, { published_at: hit.published_at, published_precision: 'exact', count: hit.count, observed_at: feed.fetched_at, format, date_source: 'creator rss' });
          if (!inWindow(s, v.published_at)) { v.status = 'excluded'; v.reason = `published ${v.published_at.slice(0, 10)}, outside the 90-day window`; out++; }
          else if (!formats.includes(format)) { v.status = 'excluded'; v.reason = `${format}, this run studies ${formats.join('/')}`; }
        } else if (feed.items.length < 15) {
          v.status = 'excluded'; v.reason = `not among the creator's long-form uploads (a Short, livestream, premiere or removed)`;
        } else if (oldest && oldest < s.brief.window_start) {
          v.status = 'excluded'; v.reason = `older than the creator's 15 most recent long-form uploads (which reach back to ${oldest.slice(0, 10)}), so outside the window`; out++;
        } else fallback.push(v);
      }
    }));
    if (++n % 10 === 0) { S.save(dir, s); process.stdout.write(`[swipe]   ${Math.min(i + 3, creators.length)}/${creators.length} feeds\n`); }
    await new Promise((r) => setTimeout(r, 300)); // gentle on YouTube
  }
  S.save(dir, s);
  // Fallback: yt-dlp one video at a time, slowly, and stop at the first bot check.
  const cap = Number(args['max-details'] ?? 40);
  if (fallback.length) console.log(`[swipe] youtube: ${fallback.length} candidates need a per-video lookup (creator posts 15+ long-form videos per window, or no feed); doing up to ${cap}, slowly`);
  let done = 0;
  for (const v of fallback) {
    if (done >= cap) { v.reason = 'date pending: per-video lookup cap reached this run (rerun discover)'; continue; }
    const d = await yt.details(v.url);
    done++;
    if (!d.ok) {
      if (BOT_CHECK.test(d.error || '')) { v.reason = 'date pending: YouTube bot check (rerun discover later)'; S.logCheck(s, 'youtube', v.url, 'paused', `bot check; stopped per-video lookups: ${d.error}`); console.log('[swipe] YouTube bot check hit: stopping per-video lookups for this run'); break; }
      if (/Premieres in|This live event will begin/i.test(d.error || '')) { v.status = 'excluded'; v.reason = 'upcoming premiere, not published yet'; continue; }
      v.status = 'needs_data'; v.reason = `details unavailable: ${d.error}`; continue;
    }
    Object.assign(v, { format: d.format, published_at: d.published_at, count: d.count, image_url: d.image_url, duration: d.duration, observed_at: nowIso(), date_source: 'yt-dlp' });
    if (!inWindow(s, v.published_at)) { v.status = 'excluded'; v.reason = `published ${v.published_at?.slice(0, 10)}, outside the 90-day window`; out++; }
    else if (!formats.includes(d.format)) { v.status = 'excluded'; v.reason = `${d.format}, this run studies ${formats.join('/')}`; }
    await new Promise((r) => setTimeout(r, 2500));
  }
  S.save(dir, s);
  return out;
}

// Channel-page subscriber count, fetched once per channel and kept in s.creators.
async function ytSize(s, channelId) {
  if (!channelId) return null;
  const k = `youtube:size:${channelId}`;
  s.creators ??= {};
  if (s.creators[k]?.size != null) return s.creators[k].size;
  const size = await yt.channelSize(channelId);
  s.creators[k] = { size, fetched_at: nowIso() };
  return size;
}

// ---------- review / judge ----------
function review() {
  const dir = dirOf(); const s = S.load(dir);
  const rows = s.videos.filter((v) => (!args.platform || v.platform === args.platform) && v.status === 'found' && !v.relevance && (v.published_at || args.all));
  const pendingDates = s.videos.filter((v) => v.status === 'found' && !v.published_at).length;
  if (pendingDates && !args.json) console.log(`(${pendingDates} candidates are hidden until their publish date is verified; rerun discover later)`);
  const niche = Object.fromEntries(s.niches.map((n) => [n.niche_id, n.niche]));
  if (args.json) { console.log(JSON.stringify(rows.map((v) => ({ id: v.video_id, platform: v.platform, format: v.format, niches: [...new Set((v.found_by || []).map((f) => f.niche_id))].map((n) => niche[n] || n), text: (v.title_or_caption || '').slice(0, 160), creator: v.creator_name || v.creator_id, creator_size: v.creator_size ?? null, count: v.count, date: v.published_at?.slice(0, 10), minutes: v.duration ? Math.round(v.duration / 6) / 10 : null, non_latin_title: /[^ -ɏ -⁯🀀-🫿☀-➿]/u.test(v.title_or_caption || '') })), null, 1)); return; }
  console.log(`Idea: ${s.brief.idea}\nOwn niche: ${s.brief.own_niche}\n${rows.length} unjudged candidates:\n`);
  for (const v of rows) console.log(`${v.video_id} [${v.format}] ${fmtNum(v.count)} ${v.metric} · ${v.published_at?.slice(0, 10) || '?'} · ${v.creator_name || v.creator_id} · niche ${[...new Set((v.found_by || []).map((f) => f.niche_id))].join('/')}\n    ${(v.title_or_caption || '').replace(/\s+/g, ' ').slice(0, 150)}`);
}
function judge() {
  const dir = dirOf(); const s = S.load(dir);
  const rel = list(args.relevant), off = list(args['off-topic']);
  let n = 0;
  for (const v of s.videos) {
    if (rel.includes(v.video_id)) { v.relevance = 'relevant'; n++; }
    if (off.includes(v.video_id)) { v.relevance = 'off_topic'; if (['found', 'qualified'].includes(v.status)) { v.status = 'excluded'; v.reason = `off topic${args.reason && args.reason !== true ? ': ' + args.reason : ''}`; } n++; }
  }
  S.save(dir, s);
  console.log(`[swipe] judged ${n} rows (${rel.length} relevant, ${off.length} off topic)`);
}

// ---------- baseline ----------
async function baseline() {
  const dir = dirOf(); const s = S.load(dir);
  const p = args.platform || 'youtube'; if (!S.PLATFORMS.includes(p)) die('--platform youtube|tiktok|instagram');
  const batchN = Number(args.batch || 10);
  if (args['retry-needs-data']) for (const v of s.videos) if (v.platform === p && v.status === 'needs_data') { v.status = 'found'; v.reason = null; }
  const unjudged = s.videos.filter((v) => v.platform === p && v.status === 'found' && !v.relevance && v.published_at).length;
  const batch = s.videos.filter((v) => v.platform === p && v.status === 'found' && v.relevance === 'relevant' && v.published_at).slice(0, batchN); // never baseline an unverified date
  if (!batch.length) { console.log(`[swipe] ${p}: no relevant found rows waiting${unjudged ? ` (${unjudged} still need a relevance judgment: run review)` : ''}`); return; }
  const own = S.sizeFor(s, p);
  s.creators ??= {};

  // 1. creator sizes (Instagram needs a profile lookup)
  if (p === 'instagram') {
    const handles = [...new Set(batch.filter((v) => v.creator_size == null && v.creator_id).map((v) => v.creator_id))];
    if (handles.length && canSpend(s, handles.length * 0.0026 + 0.001, p, `sizes for ${handles.length} creators`)) {
      try { const z = await ig.sizes(handles, { maxChargeUsd: Math.min(0.05 + handles.length * 0.004, S.remainingBudget(s)) }); spent(s, p, `sizes for ${handles.length} creators`, z.run); for (const v of batch) if (v.creator_id && z.sizes[v.creator_id.toLowerCase()] != null) v.creator_size = z.sizes[v.creator_id.toLowerCase()]; }
      catch (e) { S.logCheck(s, p, 'instagram profile sizes', 'failed', e.message); }
    }
  }
  if (p === 'youtube') for (const v of batch) if (v.creator_size == null || v.creator_size < 100) v.creator_size = await ytSize(s, v.creator_id);
  // 2. size gate
  const eligible = [];
  for (const v of batch) {
    if (p === 'youtube' && s.own?.youtube && v.creator_id === s.own.youtube) { v.status = 'excluded'; v.reason = 'your own video'; continue; }
    if (!own) { v.status = 'needs_data'; v.reason = `your own ${p} size is unknown or zero, so the 10x size check is blocked`; continue; }
    if (v.creator_size == null) { v.status = 'needs_data'; v.reason = 'creator size unknown'; continue; }
    if (v.creator_size > SIZE_CAP * own) { v.status = 'excluded'; v.reason = `creator has ${fmtNum(v.creator_size)}, more than 10x your ${fmtNum(own)}`; continue; }
    eligible.push(v);
  }
  // 3. creator feeds (reused across candidates)
  const key = (v) => `${p}:${(v.creator_id || '').toLowerCase()}:${v.format}`;
  const needFeed = [...new Map(eligible.filter((v) => !s.creators[key(v)]).map((v) => [key(v), v])).values()];
  if (p === 'youtube') {
    for (const v of needFeed) {
      const f = await yt.uploads(v.creator_id, v.format);
      if (f.ok) s.creators[key(v)] = { fetched_at: nowIso(), source: f.feed, items: f.items };
      else S.logCheck(s, p, `feed ${v.creator_id} ${v.format}`, 'unavailable', f.error);
    }
  } else if (needFeed.length) {
    const handles = [...new Set(needFeed.map((v) => v.creator_id))];
    const est = handles.length * 15 * (p === 'tiktok' ? perItemEstimate(tt.ACTOR) : 0.0026) + 0.001;
    if (canSpend(s, est, p, `feeds for ${handles.length} creators`)) {
      try {
        const f = p === 'tiktok' ? await tt.uploads(handles, { perCreator: 15, maxChargeUsd: Math.min(est * 1.5, S.remainingBudget(s)) }) : await ig.uploads(handles, { perCreator: 15, since: s.brief.window_start, maxChargeUsd: Math.min(est * 1.5, S.remainingBudget(s)) });
        spent(s, p, `feeds for ${handles.length} creators`, f.run);
        for (const v of needFeed) {
          const rows = (f.byCreator[(v.creator_id || '').toLowerCase()] || []).filter((r) => r.format === v.format);
          s.creators[key(v)] = { fetched_at: nowIso(), source: f.run.actor, items: rows.map((r) => ({ url: r.url, published_at: r.published_at, count: r.count })) };
          if (v.creator_size == null && f.byCreator[(v.creator_id || '').toLowerCase()]?.[0]?.creator_size != null) v.creator_size = f.byCreator[(v.creator_id || '').toLowerCase()][0].creator_size;
        }
      } catch (e) { S.logCheck(s, p, `feeds for ${handles.length} creators`, 'failed', e.message); }
    }
  }
  S.save(dir, s);
  // 4. baseline math
  for (const v of eligible) {
    const feed = s.creators[key(v)];
    if (!feed) { v.status = 'found'; v.reason = 'creator feed not fetched yet (budget pause or unavailable); will retry next batch'; continue; }
    const self = feed.items.find((r) => canonicalUrl(r.url) === v.url || r.native_id === v.native_id);
    if (self && p === 'youtube' && Number.isFinite(self.count)) { v.count = self.count; v.observed_at = feed.fetched_at; } // same source as the baseline
    const comps = feed.items
      .filter((r) => canonicalUrl(r.url) !== v.url && r.published_at && inWindow(s, r.published_at) && Number.isFinite(r.count))
      .sort((a, b) => b.published_at.localeCompare(a.published_at))
      .slice(0, BASELINE_N);
    v.baseline_sample = comps.map((r) => ({ url: canonicalUrl(r.url), published_at: r.published_at, count: r.count }));
    v.baseline_source = feed.source;
    if (!Number.isFinite(v.count)) { v.status = 'needs_data'; v.reason = 'candidate count missing'; continue; }
    if (comps.length < BASELINE_MIN) { v.status = 'needs_data'; v.reason = `only ${comps.length} usable comparisons in the window (need ${BASELINE_MIN})`; continue; }
    v.baseline_median = median(comps.map((r) => r.count));
    if (!v.baseline_median) { v.status = 'needs_data'; v.reason = 'baseline median is zero'; continue; }
    v.multiple = v.count / v.baseline_median;
    // Not part of the 3x rule (never loosened or tightened): a label so a fluke on a tiny channel isn't read like a proven pattern.
    v.confidence = v.baseline_median < 1000 || v.count < 10000 ? 'low (small channel: tiny baseline)'
      : Number.isFinite(v.creator_size) && v.creator_size < 5000 && v.baseline_median > 5 * v.creator_size ? 'check (views far above subscribers: often paid promotion)'
      : v.multiple >= 20 ? 'check (20x+ is often outside traffic)' : 'normal';
    if (v.multiple >= MULTIPLE) { v.status = 'qualified'; v.reason = `${v.multiple.toFixed(2)}x the median of ${comps.length} recent uploads`; }
    else { v.status = 'excluded'; v.reason = `${v.multiple.toFixed(2)}x, below 3x`; }
  }
  S.save(dir, s);
  const rows = batch.map((v) => ({ id: v.video_id, status: v.status, multiple: v.multiple ? v.multiple.toFixed(2) + 'x' : '', count: fmtNum(v.count), median: fmtNum(v.baseline_median), creator: `${(v.creator_name || v.creator_id || '').slice(0, 22)} (${fmtNum(v.creator_size)})`, reason: (v.reason || '').slice(0, 60) }));
  console.log(table(rows, ['id', 'status', 'multiple', 'count', 'median', 'creator', 'reason']));
  printStatus(s);
}

// ---------- status ----------
function printStatus(s) {
  const c = S.counts(s);
  console.log('\n' + table(S.activePlatforms(s).map((p) => ({ platform: p, candidates: c[p].total, unjudged: s.videos.filter((v) => v.platform === p && v.status === 'found' && !v.relevance).length, found: c[p].found, qualified: c[p].qualified, rewritten: c[p].rewritten, excluded: c[p].excluded, needs_data: c[p].needs_data, shortfall: Math.max(0, 40 - s.videos.filter((v) => v.platform === p && v.published_at && inWindow(s, v.published_at) && (v.relevance === 'relevant' || ['qualified', 'rewritten'].includes(v.status))).length) })), ['platform', 'candidates', 'unjudged', 'found', 'qualified', 'rewritten', 'excluded', 'needs_data', 'shortfall']));
  const rem = S.remainingBudget(s);
  console.log(`\nSpend: ${s.spend.total} ${s.spend.unit}${rem != null ? ` of ${s.brief.budget_limit} (remaining ${rem.toFixed(4)})` : ' (no budget set)'} across ${s.spend.runs.filter((r) => !r.cached).length} paid runs`);
  const pending = S.activePlatforms(s).map((p) => `${p}: ${(s.cursors[p]?.done?.length || 0)} of ${(s.brief.own_searches?.[p]?.length || 0) + s.niches.reduce((a, n) => a + (n.searches?.[p]?.length || 0), 0)} searches run`).join(', ');
  console.log(`Searches: ${pending}`);
}
function status() { const s = S.load(dirOf()); console.log(`Idea: ${s.brief.idea}\nWindow: ${s.brief.window_start?.slice(0, 10)} to ${s.brief.as_of?.slice(0, 10)}`); printStatus(s); }

// ---------- winners (packaging view for swipe-rewrite) ----------
function winners() {
  const s = S.load(dirOf());
  const want = args.all ? ['qualified', 'rewritten'] : ['qualified'];
  const rank = (v) => (!v.confidence || v.confidence === 'normal' ? 0 : 1);
  const rows = s.videos.filter((v) => want.includes(v.status)).sort((a, b) => rank(a) - rank(b) || (b.multiple || 0) - (a.multiple || 0));
  const niche = Object.fromEntries(s.niches.map((n) => [n.niche_id, n.niche]));
  const out = rows.map((v) => ({
    video_id: v.video_id, multiple: Number((v.multiple || 0).toFixed(2)), count: v.count, baseline_median: v.baseline_median,
    title: v.title_or_caption, url: v.url, creator: v.creator_name || v.creator_id, creator_size: v.creator_size, published: v.published_at?.slice(0, 10),
    duration_min: v.duration ? Math.round(v.duration / 6) / 10 : null, niches: [...new Set((v.found_by || []).map((f) => niche[f.niche_id] || f.niche_id))],
    thumb: v.thumb_path || null, status: v.status, confidence: v.confidence || null,
  }));
  if (args.json) console.log(JSON.stringify(out, null, 1));
  else for (const r of out) console.log(`${r.video_id} ${r.multiple}x${r.confidence && r.confidence !== 'normal' ? ' [' + r.confidence + ']' : ''}  ${fmtNum(r.count)} vs median ${fmtNum(r.baseline_median)}  ${r.creator} (${fmtNum(r.creator_size)})  ${r.duration_min} min  [${r.niches.join(', ')}]\n    "${r.title}"  ${r.thumb ? '· ' + r.thumb : ''}`);
  if (!out.length) console.log('[swipe] no qualified rows yet');
}

// ---------- thumbs ----------
async function thumbs() {
  const dir = dirOf(); const s = S.load(dir);
  const ids = list(args.ids);
  const rows = s.videos.filter((v) => (ids.length ? ids.includes(v.video_id) : v.status === 'qualified') && v.image_url);
  fs.mkdirSync(path.join(dir, 'thumbs'), { recursive: true });
  for (const v of rows) {
    const out = path.join(dir, 'thumbs', `${v.video_id}.jpg`);
    if (fs.existsSync(out) && !args.force) { v.thumb_path = path.relative(ROOT, out).replace(/\\/g, '/'); continue; }
    let urls = [v.image_url];
    if (v.platform === 'youtube' && v.native_id) urls = [`https://i.ytimg.com/vi/${v.native_id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${v.native_id}/hqdefault.jpg`];
    let ok = false;
    for (const u of urls) {
      try { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' } }); if (r.ok) { const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 2000) { fs.writeFileSync(out, buf); ok = true; break; } } } catch { /* try next */ }
    }
    if (ok) v.thumb_path = path.relative(ROOT, out).replace(/\\/g, '/');
    else { v.thumb_path = null; S.logCheck(s, v.platform, v.url, 'unavailable', 'cover image could not be downloaded (TikTok and Instagram cover links expire; rerun discover for a fresh one)'); }
    console.log(`${v.video_id} ${ok ? 'saved ' + v.thumb_path : 'UNAVAILABLE'}`);
  }
  S.save(dir, s);
}

// ---------- concepts ----------
function concepts() {
  const dir = dirOf(); const s = S.load(dir);
  const file = readJson(path.resolve(ROOT, args.file || ''), null);
  if (!Array.isArray(file)) die('--file <concepts.json> must be an array of { video_id, mechanism, why_it_worked, my_title, my_thumbnail, my_angle, image_check }');
  const errs = []; let done = 0;
  for (const c of file) {
    const v = s.videos.find((x) => x.video_id === c.video_id);
    if (!v) { errs.push(`${c.video_id}: no such video`); continue; }
    if (!['qualified', 'rewritten'].includes(v.status)) { errs.push(`${c.video_id}: status is ${v.status}, only qualified rows can be rewritten`); continue; }
    const row = { video_id: v.video_id, source_url: v.url, original_title_or_caption: v.title_or_caption, source_multiple: v.multiple, mechanism: c.mechanism, why_it_worked: c.why_it_worked, my_title: c.my_title, my_thumbnail: c.my_thumbnail, my_angle: c.my_angle, image_check: c.image_check };
    const i = s.concepts.findIndex((x) => x.video_id === v.video_id);
    if (i >= 0) s.concepts[i] = { ...s.concepts[i], ...row }; else s.concepts.push(row);
    const complete = ['mechanism', 'why_it_worked', 'my_title', 'my_thumbnail', 'my_angle', 'image_check'].every((k) => row[k] && String(row[k]).trim());
    if (complete && row.image_check !== 'unavailable') { v.status = 'rewritten'; done++; }
  }
  S.save(dir, s);
  if (errs.length) console.log('[swipe] skipped:\n  - ' + errs.join('\n  - '));
  console.log(`[swipe] ${file.length} concepts upserted, ${done} source rows marked rewritten; ${s.videos.filter((v) => v.status === 'qualified').length} qualified rows remain`);
}

// ---------- export ----------
async function exportXlsx() {
  const { exportWorkbook } = await import('./export-xlsx.mjs');
  const dir = dirOf(); const s = S.load(dir);
  const out = await exportWorkbook(s, path.join(dir, 'Video Swipe File.xlsx'));
  console.log(`[swipe] wrote ${path.relative(ROOT, out)}`);
}

const cmds = { init, plan, check, discover, review, judge, baseline, status, winners, thumbs, concepts, export: exportXlsx };
if (!cmds[cmd]) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]); process.exit(cmd ? 1 : 0); }
await cmds[cmd]();
