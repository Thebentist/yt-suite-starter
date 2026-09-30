/* Instagram provider through Apify (pay per result). Experimental until a live check passes with your token.
 *   search()   hashtag discovery with apify/instagram-hashtag-scraper (reels only). Plain keywords become a hashtag.
 *   uploads()  creators' latest reels with apify/instagram-reel-scraper, for baselines
 *   sizes()    follower counts with apify/instagram-profile-scraper
 * Metric is Instagram-only plays: igPlayCount when present, else videoPlayCount (recorded in `metric` so rows never mix).
 */
import { runActor } from './apify.mjs';
import { canonicalUrl } from '../lib.mjs';

export const PROVIDER = 'apify:instagram';
export const METRIC = 'plays';

function norm(it) {
  const url = it.url || (it.shortCode ? `https://www.instagram.com/reel/${it.shortCode}/` : null);
  if (!url) return null;
  const isVideo = it.type === 'Video' || it.productType === 'clips' || it.videoPlayCount != null || it.videoUrl;
  const ig = Number.isFinite(it.igPlayCount) ? it.igPlayCount : null;
  const plays = ig ?? (Number.isFinite(it.videoPlayCount) ? it.videoPlayCount : null);
  return {
    platform: 'instagram',
    format: isVideo ? 'instagram_reel' : 'instagram_post',
    url: canonicalUrl(url),
    native_id: it.shortCode || it.id,
    creator_id: it.ownerUsername || null,
    creator_url: it.ownerUsername ? `https://www.instagram.com/${it.ownerUsername}/` : null,
    creator_name: it.ownerFullName || it.ownerUsername,
    creator_size: null,
    published_at: it.timestamp ? new Date(it.timestamp).toISOString() : null,
    published_precision: 'exact',
    count: plays,
    metric_field: ig != null ? 'igPlayCount' : 'videoPlayCount',
    likes: it.likesCount ?? null, comments: it.commentsCount ?? null,
    duration: it.videoDuration ?? null,
    title_or_caption: it.caption || '',
    title_kind: 'caption',
    image_url: it.displayUrl || it.thumbnailUrl || null,
  };
}

export async function search(query, { limit = 20, maxChargeUsd } = {}) {
  const tag = query.trim().replace(/^#/, '').replace(/[^\p{L}\p{N}_]/gu, '').toLowerCase();
  if (!tag) return { ok: false, error: 'empty hashtag', items: [] };
  const { items, run } = await runActor('apify/instagram-hashtag-scraper', { hashtags: [tag], resultsType: 'reels', resultsLimit: limit }, { maxItems: limit, maxChargeUsd });
  return { ok: true, run, items: items.map(norm).filter(Boolean), note: query.trim().startsWith('#') ? null : `searched as #${tag}` };
}

export async function uploads(handles, { perCreator = 15, maxChargeUsd, since } = {}) {
  const input = { username: handles, resultsLimit: perCreator, ...(since ? { onlyPostsNewerThan: since.slice(0, 10) } : {}) };
  const { items, run } = await runActor('apify/instagram-reel-scraper', input, { maxItems: perCreator * handles.length, maxChargeUsd });
  const byCreator = {};
  for (const r of items.map(norm).filter(Boolean)) (byCreator[r.creator_id?.toLowerCase()] ??= []).push(r);
  return { ok: true, run, byCreator };
}

export async function sizes(handles, { maxChargeUsd } = {}) {
  const { items, run } = await runActor('apify/instagram-profile-scraper', { usernames: handles }, { maxItems: handles.length, maxChargeUsd });
  const out = {};
  for (const p of items) if (p.username) out[p.username.toLowerCase()] = p.followersCount ?? p.followers ?? null;
  return { ok: true, run, sizes: out };
}
