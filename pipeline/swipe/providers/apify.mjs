/* Minimal Apify REST client (no SDK): start an actor run, wait, read its dataset, report what it cost.
 *   APIFY_TOKEN comes from .env (never put it in a URL; it goes in the Authorization header).
 *   Every call is cached by actor + input under research/_cache/apify/ so a repeat never pays twice.
 *   maxItems / maxTotalChargeUsd cap each run so one call cannot blow the run budget.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, loadEnv, readJson, writeJson, sleep } from '../lib.mjs';

const API = 'https://api.apify.com/v2';
const CACHE_DIR = path.join(ROOT, 'research', '_cache', 'apify');

export function token() {
  loadEnv();
  return process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN || null;
}

async function api(method, url, body) {
  const t = token();
  if (!t) throw new Error('APIFY_TOKEN is not set. Add a line APIFY_TOKEN=... to .env in the suite folder (Apify Console > Settings > API & Integrations).');
  const res = await fetch(API + url, {
    method,
    headers: { authorization: `Bearer ${t}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) throw new Error(`Apify ${method} ${url.split('?')[0]} -> HTTP ${res.status}: ${json?.error?.message || text.slice(0, 200)}`);
  return json;
}

export async function me() {
  const u = await api('GET', '/users/me');
  const lim = await api('GET', '/users/me/limits').catch(() => null);
  return {
    username: u.data?.username,
    plan: u.data?.plan?.id,
    monthly_usage_usd: lim?.data?.current?.monthlyUsageUsd ?? null,
    monthly_limit_usd: lim?.data?.limits?.maxMonthlyUsageUsd ?? null,
  };
}

const cacheKey = (actor, input) => crypto.createHash('sha1').update(actor + '\n' + JSON.stringify(input)).digest('hex').slice(0, 20);

/**
 * Run an actor and return { items, run: {id, status, cost_usd, actor, cached} }.
 * opts.maxItems caps pay-per-result actors; opts.maxChargeUsd caps pay-per-event actors; opts.maxAgeHours reuses cache.
 */
export async function runActor(actor, input, { maxItems, maxChargeUsd, timeoutSecs = 600, memoryMbytes, maxAgeHours = 72 } = {}) {
  const key = cacheKey(actor, { input, maxItems });
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  const cached = readJson(cachePath, null);
  if (cached && (Date.now() - new Date(cached.at).getTime()) / 3600e3 < maxAgeHours) {
    return { items: cached.items, run: { ...cached.run, cached: true, cost_usd: 0 } };
  }
  const q = new URLSearchParams({ timeout: String(timeoutSecs) });
  if (maxItems) q.set('maxItems', String(maxItems));
  if (maxChargeUsd) q.set('maxTotalChargeUsd', String(maxChargeUsd));
  if (memoryMbytes) q.set('memory', String(memoryMbytes));
  const started = await api('POST', `/acts/${actor.replace('/', '~')}/runs?${q}`, input);
  let run = started.data;
  const deadline = Date.now() + (timeoutSecs + 120) * 1000;
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(run.status)) {
    if (Date.now() > deadline) throw new Error(`Apify run ${run.id} still ${run.status} after ${timeoutSecs}s`);
    await sleep(2000);
    run = (await api('GET', `/actor-runs/${run.id}?waitForFinish=60`)).data;
  }
  const items = [];
  if (run.defaultDatasetId) {
    for (let offset = 0; ; offset += 1000) {
      const page = await api('GET', `/datasets/${run.defaultDatasetId}/items?clean=true&format=json&offset=${offset}&limit=1000`);
      items.push(...page);
      if (page.length < 1000) break;
    }
  }
  const meta = {
    id: run.id,
    actor,
    status: run.status,
    cost_usd: await runCost(actor, run, items.length),
    items: items.length,
    console: `https://console.apify.com/actors/runs/${run.id}`,
  };
  if (run.status === 'SUCCEEDED' || items.length) writeJson(cachePath, { at: new Date().toISOString(), actor, input, run: meta, items });
  if (run.status !== 'SUCCEEDED' && !items.length) throw Object.assign(new Error(`Apify run ${run.id} ended ${run.status}`), { run: meta });
  return { items, run: { ...meta, cached: false } };
}

/* What a run cost. Store actors here are pay-per-event, and the run's usageTotalUsd does not always include the event
 * charges, so price the charged events from the actor's own pricing table at the user's plan tier and take the larger.
 * Falls back to FALLBACK_PER_ITEM (Free-plan prices, the most expensive tier) when neither is readable. */
const FALLBACK_PER_ITEM = {
  'clockworks/tiktok-scraper': 0.005, 'apify/instagram-reel-scraper': 0.0026, 'apify/instagram-profile-scraper': 0.0026,
  'apify/instagram-hashtag-scraper': 0.0026, 'streamers/youtube-scraper': 0.004, 'streamers/youtube-channel-scraper': 0.0013,
  'karamelo/youtube-transcripts': 0.007,
};
export const perItemEstimate = (actor) => FALLBACK_PER_ITEM[actor] ?? 0.005;
const TIER = { FREE: 'FREE', STARTER: 'BRONZE', BRONZE: 'BRONZE', SCALE: 'SILVER', SILVER: 'SILVER', BUSINESS: 'GOLD', GOLD: 'GOLD' };
let tierCache = null; const pricingCache = new Map();
async function planTier() {
  if (tierCache) return tierCache;
  try { const u = await api('GET', '/users/me'); tierCache = TIER[String(u.data?.plan?.id || '').toUpperCase()] || 'FREE'; } catch { tierCache = 'FREE'; }
  return tierCache;
}
async function eventPrices(actor) {
  if (pricingCache.has(actor)) return pricingCache.get(actor);
  let prices = null;
  try {
    const a = (await api('GET', `/acts/${actor.replace('/', '~')}`)).data;
    const info = (a.pricingInfos || []).filter((p) => p.pricingModel === 'PAY_PER_EVENT').pop();
    const events = info?.pricingPerEvent?.actorChargeEvents;
    if (events) {
      const tier = await planTier();
      prices = {};
      for (const [name, ev] of Object.entries(events)) prices[name] = ev.eventTieredPricingUsd?.[tier]?.tieredEventPriceUsd ?? ev.eventPriceUsd ?? 0;
    }
  } catch { /* pricing not readable */ }
  pricingCache.set(actor, prices);
  return prices;
}
async function runCost(actor, run, nItems) {
  const usage = Number(run.usageTotalUsd ?? 0) || 0;
  let events = 0;
  const counts = run.chargedEventCounts;
  if (counts && Object.keys(counts).length) {
    const prices = await eventPrices(actor);
    if (prices) for (const [name, n] of Object.entries(counts)) events += (prices[name] || 0) * n;
  }
  const est = events || usage ? 0 : nItems * perItemEstimate(actor);
  return Math.round(Math.max(usage, events, est) * 1e5) / 1e5;
}

export function cacheStats() {
  if (!fs.existsSync(CACHE_DIR)) return { files: 0 };
  return { files: fs.readdirSync(CACHE_DIR).length, dir: CACHE_DIR };
}
