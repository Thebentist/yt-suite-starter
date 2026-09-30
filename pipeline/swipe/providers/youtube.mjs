/* YouTube provider: free and exact, no API key.
 *   search()        yt-dlp flat search (results sorted by view count, uploaded this year); ids, titles, channel, format
 *   details()       yt-dlp -j for one video: exact timestamp, views, duration, channel subscriber count, thumbnail
 *   uploads()       the channel's public RSS feed for one format: UULF = long-form uploads, UUSH = Shorts.
 *                   15 most recent, exact publish time and exact view count. One request per creator and format.
 * Metric is always YouTube views; never mixed with another provider for the same row.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { ROOT, canonicalUrl, sleep } from '../lib.mjs';

const YTDLP = path.join(ROOT, 'tools', 'yt-dlp.exe');
export const PROVIDER = 'yt-dlp + youtube rss';
export const METRIC = 'views';

function run(args, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const p = spawn(YTDLP, args, { windowsHide: true });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill(); err += '\n[timeout]'; }, timeoutMs);
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => { clearTimeout(timer); resolve({ code, out, err }); });
    p.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, out, err: String(e) }); });
  });
}

// sp=CAMSBAgFEAE=: sort by view count, upload date "this year" (the narrowest filter that still covers a 90-day window), type video.
export async function search(query, { limit = 25, sp = 'CAMSBAgFEAE=' } = {}) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${encodeURIComponent(sp)}`;
  const r = await run(['--flat-playlist', '-J', '--no-warnings', '--playlist-end', String(limit), url]);
  if (r.code !== 0) return { ok: false, error: (r.err || '').trim().split('\n').pop(), items: [] };
  let j; try { j = JSON.parse(r.out); } catch { return { ok: false, error: 'unparseable search output', items: [] }; }
  const items = (j.entries || []).filter((e) => e && e.id && e.ie_key !== 'YoutubeTab').map((e) => ({
    platform: 'youtube',
    format: /\/shorts\//.test(e.url || '') ? 'youtube_short' : 'youtube_long',
    url: canonicalUrl(e.url || `https://www.youtube.com/watch?v=${e.id}`),
    native_id: e.id,
    creator_id: e.channel_id,
    creator_url: e.channel_id ? `https://www.youtube.com/channel/${e.channel_id}` : null,
    creator_name: e.channel || e.uploader || null,
    title_or_caption: e.title || null,
    title_kind: 'title',
    duration: e.duration ?? null,
    search_count: e.view_count ?? null, // search-card count; replaced by the exact count from details()
  }));
  return { ok: true, items };
}

export async function details(urlOrId) {
  const url = urlOrId.startsWith('http') ? urlOrId : `https://www.youtube.com/watch?v=${urlOrId}`;
  const r = await run(['-j', '--skip-download', '--no-warnings', '--no-playlist', url]);
  if (r.code !== 0) return { ok: false, error: (r.err || '').trim().split('\n').pop() };
  let j; try { j = JSON.parse(r.out); } catch { return { ok: false, error: 'unparseable details output' }; }
  const short = j.media_type === 'short' || /\/shorts\//.test(j.webpage_url || url);
  return {
    ok: true,
    format: short ? 'youtube_short' : (j.media_type === 'livestream' || j.was_live ? 'youtube_live' : 'youtube_long'),
    url: canonicalUrl(short ? `https://www.youtube.com/shorts/${j.id}` : `https://www.youtube.com/watch?v=${j.id}`),
    native_id: j.id,
    published_at: j.timestamp ? new Date(j.timestamp * 1000).toISOString() : null,
    published_precision: j.timestamp ? 'exact' : 'day',
    upload_date: j.upload_date || null,
    count: Number.isFinite(j.view_count) ? j.view_count : null,
    duration: j.duration ?? null,
    creator_id: j.channel_id,
    creator_url: j.channel_id ? `https://www.youtube.com/channel/${j.channel_id}` : null,
    creator_handle_url: j.uploader_url || null,
    creator_name: j.channel || j.uploader || null,
    creator_size: null, // filled from channelSize() by the caller (yt-dlp misparses "13M" as 13)
    creator_size_note: 'subscribers as shown on the channel page (YouTube rounds to 3 significant figures)',
    title_or_caption: j.title,
    title_kind: 'title',
    image_url: `https://i.ytimg.com/vi/${j.id}/hqdefault.jpg`,
  };
}

// Recent uploads for one channel and format from the public RSS feed (exact views + exact publish time).
export async function uploads(channelId, format) {
  if (!channelId?.startsWith('UC')) return { ok: false, error: `not a channel id: ${channelId}` };
  const prefix = format === 'youtube_short' ? 'UUSH' : 'UULF';
  const feed = `https://www.youtube.com/feeds/videos.xml?playlist_id=${prefix}${channelId.slice(2)}`;
  let res, text;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { res = await fetch(feed, { headers: { 'user-agent': 'Mozilla/5.0' } }); text = await res.text(); } catch (e) { text = ''; res = { status: 0, statusText: String(e) }; }
    if (res.status === 200) break;
    if (res.status === 404) return { ok: true, feed, items: [] }; // no uploads of this format
    await sleep(1500 * (attempt + 1));
  }
  if (res.status !== 200) return { ok: false, error: `rss HTTP ${res.status}`, feed };
  const items = [];
  for (const entry of text.split('<entry>').slice(1)) {
    const id = entry.match(/<yt:videoId>([^<]+)/)?.[1];
    const published = entry.match(/<published>([^<]+)/)?.[1];
    const views = entry.match(/<media:statistics views="(\d+)"/)?.[1];
    const title = entry.match(/<title>([^<]*)/)?.[1];
    if (!id) continue;
    items.push({
      native_id: id,
      url: canonicalUrl(format === 'youtube_short' ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`),
      published_at: published ? new Date(published).toISOString() : null,
      count: views != null ? Number(views) : null,
      title: decodeXml(title || ''),
    });
  }
  return { ok: true, feed, items };
}

// Subscriber count from the channel page ("9.27M subscribers"); this is the source of creator_size.
export async function channelSize(channelId) {
  try {
    const html = await (await fetch(`https://www.youtube.com/channel/${channelId}`, { headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'en-US,en' } })).text();
    // The channel's own count sits in the page header as "content"; "simpleText" counts belong to featured channels.
    const m = html.match(/"content":"([\d.,]+)\s*([KMB]?) subscribers?"/i);
    if (!m) return null;
    const n = Number(m[1].replace(/,/g, '')) * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()] || 1);
    return Number.isFinite(n) ? Math.round(n) : null;
  } catch { return null; }
}

// For a profile URL like https://www.youtube.com/@handle, find the UC channel id.
export async function channelIdFromUrl(url) {
  const m = url.match(/\/channel\/(UC[\w-]{22})/);
  if (m) return m[1];
  try {
    const html = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'en' } })).text();
    return html.match(/"externalId":"(UC[\w-]{22})"/)?.[1] || html.match(/"channelId":"(UC[\w-]{22})"/)?.[1] || null;
  } catch { return null; }
}

function decodeXml(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
