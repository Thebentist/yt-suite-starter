/* TikTok provider through Apify's clockworks/tiktok-scraper (pay per result).
 *   search()   keyword video search (searchSection "/video", last 3 months) or a hashtag feed when the query starts with #
 *   uploads()  several creators' latest posts in ONE run (profileSorting "latest"), for baselines
 * Metric is TikTok plays (playCount). Creator size is authorMeta.fans. Photo slideshows are skipped.
 */
import { runActor, perItemEstimate } from './apify.mjs';
import { canonicalUrl } from '../lib.mjs';

export const ACTOR = 'clockworks/tiktok-scraper';
export const PROVIDER = 'apify:clockworks/tiktok-scraper';
export const METRIC = 'plays';

function norm(it) {
  const handle = it.authorMeta?.name || it.authorMeta?.uniqueId || null;
  const url = it.webVideoUrl || (handle && it.id ? `https://www.tiktok.com/@${handle}/video/${it.id}` : null);
  if (!url) return null;
  return {
    platform: 'tiktok',
    format: it.isSlideshow || it.imagePost ? 'tiktok_photo' : 'tiktok_video',
    url: canonicalUrl(url),
    native_id: String(it.id || ''),
    creator_id: handle,
    creator_url: handle ? `https://www.tiktok.com/@${handle}` : null,
    creator_name: it.authorMeta?.nickName || handle,
    creator_size: Number.isFinite(it.authorMeta?.fans) ? it.authorMeta.fans : null,
    creator_size_note: 'followers (authorMeta.fans)',
    published_at: it.createTimeISO || (it.createTime ? new Date(it.createTime * 1000).toISOString() : null),
    published_precision: 'exact',
    count: Number.isFinite(it.playCount) ? it.playCount : null,
    likes: it.diggCount ?? null, shares: it.shareCount ?? null, comments: it.commentCount ?? null, saves: it.collectCount ?? null,
    duration: it.videoMeta?.duration ?? null,
    title_or_caption: it.text || '',
    title_kind: 'caption',
    image_url: it.videoMeta?.coverUrl || it.videoMeta?.originalCoverUrl || it.covers?.[0] || null,
  };
}

export function estimate(nResults, { dateFilter = false, runs = 1 } = {}) {
  return nResults * (perItemEstimate(ACTOR) + (dateFilter ? 0 : -0.0013)) + runs * 0.001;
}

export async function search(query, { limit = 20, maxChargeUsd } = {}) {
  const q = query.trim();
  const input = q.startsWith('#')
    ? { hashtags: [q.slice(1)], resultsPerPage: limit, downloadSubtitlesOptions: 'NEVER_DOWNLOAD_SUBTITLES', shouldDownloadVideos: false, shouldDownloadCovers: false }
    : { searchQueries: [q], searchSection: '/video', videoSearchDateFilter: 'LAST_3_MONTHS', resultsPerPage: limit, downloadSubtitlesOptions: 'NEVER_DOWNLOAD_SUBTITLES', shouldDownloadVideos: false, shouldDownloadCovers: false };
  const { items, run } = await runActor(ACTOR, input, { maxItems: limit, maxChargeUsd });
  return { ok: true, run, items: items.map(norm).filter(Boolean) };
}

// Latest posts for several creators in one run. Returns { byCreator: { handle: [rows] }, run }.
export async function uploads(handles, { perCreator = 15, maxChargeUsd } = {}) {
  const input = { profiles: handles, profileSorting: 'latest', resultsPerPage: perCreator, downloadSubtitlesOptions: 'NEVER_DOWNLOAD_SUBTITLES', shouldDownloadVideos: false, shouldDownloadCovers: false };
  const { items, run } = await runActor(ACTOR, input, { maxItems: perCreator * handles.length, maxChargeUsd });
  const byCreator = {};
  for (const r of items.map(norm).filter(Boolean)) (byCreator[r.creator_id?.toLowerCase()] ??= []).push(r);
  return { ok: true, run, byCreator };
}
