---
name: swipe-find
description: Step 2 of the swipe research. Finds real outperforming long-form YouTube videos across our own niche and the eight adjacent niches in the last 90 days, judges relevance, and measures each against its creator's own baseline (3x the median of their 10 other recent uploads). Resumable. Use for "/swipe-find", "find outliers", "continue swipe-find".
argument-hint: "[run path or 'latest'] [platform, default youtube] ['retry needs_data']"
---

# swipe-find

The tool does every count, date, median and multiple. You do the relevance calls and the reporting. Run path: the argument, or the newest folder in `research/<channel>/` that has a Brief and 8 niches (if none, run `/swipe-niches` first). `R=research/<id>/<run>` below.

## Loop (YouTube is free, so run it to completion in one go)
1. `node pipeline/swipe/swipe.mjs status --run $R`, which shows candidates, unjudged rows, qualified rows, spend and searches run.
2. **Discover** until every search has run: `node pipeline/swipe/swipe.mjs discover --run $R --platform youtube`. Each query runs two passes (this month by views, this year by relevance). Dates and exact views come from each creator's public RSS feed, one request per creator; out-of-window, Shorts, under-4-minute uploads, livestreams and our own uploads are excluded automatically with a reason. Candidates from creators who post 15+ long-form videos per 90 days need a per-video lookup; the tool does up to 40 slowly and stops at the first YouTube bot check (they stay "date pending"; rerun discover hours later, or pass `--max-details 0` to skip). **Never loop discover rapidly or run other yt-dlp jobs at the same time**: YouTube blocks the IP's watch pages for hours when hammered. Target at least 40 in-window candidates. If a platform ends below 40 after every search, report the shortfall; don't pad it.
3. **Judge relevance**: `node pipeline/swipe/swipe.mjs review --run $R --json`. For each row decide:
   - **relevant**: a real long-form video from our niche or one of the eight niches whose concept could plausibly be re-made by our host (expert reaction, myth test, transformation, exposé, explainer...).
   - **off topic**: keyword collisions ("braces tips" returning a tech channel), music, gaming, kids' content, reupload or compilation farms that steal clips, news clips, podcasts cut into long videos with no concept, and non-English if the Brief says English (`non_latin_title: true` is a strong hint; check the title).
   Uploads shorter than 4 minutes are already filtered as not long-form (`brief.min_duration_sec`). Rows without a verified date are hidden from review until a later discover dates them; never judge or baseline a row without `date`. If a qualified row later turns out to be off topic, `judge --off-topic` removes it.
   Then `node pipeline/swipe/swipe.mjs judge --run $R --relevant id,id,... --off-topic id,id,... --reason "<short why>"`. Group the off-topic ones by reason and use one `judge` call per reason. Judge everything; unjudged rows never reach the baseline step.
4. **Baseline** in batches of 10 until no relevant `found` rows remain: `node pipeline/swipe/swipe.mjs baseline --run $R --batch 10`. Creators above 10x our size are excluded; fewer than 5 comparisons, unknown size or a zero median become `needs_data` (retry only if the user asks: `--retry-needs-data`).
5. `node pipeline/swipe/swipe.mjs export --run $R`.

For TikTok or Instagram (only if the Brief lists them and `APIFY_TOKEN` is set): first `node pipeline/swipe/swipe.mjs check --run $R`, then the same loop with `--platform tiktok|instagram`, **one batch of 10 per run**, and report spend after each. The tool stops before exceeding the budget and logs every paid run with its id and cumulative spend in Checks. On "continue swipe-find", resume from saved cursors and found rows; never touch qualified, rewritten or excluded rows.

## Report
- Counts per platform (candidates, qualified, excluded, needs_data, shortfall) and spend.
- The qualified list from `node pipeline/swipe/swipe.mjs winners --run $R`: multiple, views vs median, creator and size, niche, title. Put `low` or `check` confidence rows in a separate "treat with care" group (tiny baselines or 20x+ often mean outside traffic, not a repeatable concept).
- Two or three sentences on patterns you see in the winners' titles. Say it's an observation, not a measured finding.
- The workbook path. Next step: `/swipe-rewrite`.
