---
name: swipe-niches
description: Step 1 of the swipe research. Intake plus the research plan for a run: a Brief and eight adjacent niches (with exact YouTube searches) where the channel's audience already watches, saved to research/<channel>/<run>/swipe.json and Video Swipe File.xlsx. Use for "/swipe-niches", "plan a research run", "find adjacent niches", or before /swipe-find.
argument-hint: "[channel id, default the host in suite.json] [idea or 'open sweep']"
---

# swipe-niches

Builds the plan only. Nothing is scraped here.

## 1. Pick or resume the run
- Channel: first argument if it matches a file in `channels/`, else the host (`suite.json` → `host`). Read `channels/<id>.json`. Never run research for a `"role": "voice-reference"` channel.
- If the user names an existing run (or there is exactly one run in `research/<id>/` from the last 7 days and they said "continue"), reuse it: run `node pipeline/swipe/swipe.mjs status --run research/<id>/<run>` and never reset its Brief or Niches. Ask before changing the idea or the research window; the tool refuses without `--force`.
- Otherwise create one: `node pipeline/swipe/swipe.mjs init --channel <id> --run <YYYY-MM-DD>-<idea-slug>` (defaults: platforms youtube, formats youtube_long; add `--platforms youtube,tiktok,instagram --formats youtube_long,tiktok_video,instagram_reel` only if the user asks for short-form).

## 2. Intake: one message, only what is missing
Show what the channel file already answers (audience, own niche, language, market, YouTube URL and subscriber count) as a short list to confirm, and ask in the same message only for what is missing:
- the **idea** (a topic, a format, or "open sweep: what should I make next");
- the **intended format** (default: YouTube long-form, 10 to 20 minutes, talking head plus animation);
- the **budget** and unit (YouTube costs nothing; only TikTok/Instagram through Apify cost money, so for a YouTube-only run the answer can be 0 USD);
- the size on any active platform the channel file doesn't have.
Do not guess missing answers. A zero or unknown own size blocks the 10x size check on that platform: say which platform is blocked.

## 3. Eight adjacent niches
Adjacent niche = somewhere **our audience already spends time** whose winning concepts could be re-made by our host with his real expertise. Not our own niche (that goes in `own_searches`), and not merely "health".

Think across these transfer paths and pick the 8 that transfer most cleanly to the idea:
- another expert reacting (doctor, dermatologist, plastic surgeon, pharmacist, vet, lawyer, chef reacting to their field's viral content)
- the same fear or insecurity (appearance, pain, being scammed, parents worrying about kids)
- the same satisfying payoff (transformations, restorations, before and after, cleaning)
- the same curiosity engine (myth vs truth, "what happens if", tested, ranked, big-question explainers)
- the same villain (scams, fake experts, influencer trends, companies that collapsed)

Rank 1 to 8 by how cleanly a winning concept would transfer to the idea. For each: `niche_id` niche-001..niche-008 in rank order, `overlap` in **exactly five words**, one-sentence `transfer_reason`, and 2 to 3 exact YouTube searches the way people type them, mixing format words ("reacts", "explained", "tested", "vs", "I tried", "truth about"). Also write 2 to 4 searches for our own niche in `brief.own_searches.youtube`. These are research hypotheses, not proven winners.

## 4. Save, validate, export
Write `research/<id>/<run>/plan.json`:
```json
{ "brief": { "idea": "...", "audience": "...", "own_niche": "...", "language": "English", "market": "...", "format": "...",
             "budget_limit": 0, "budget_unit": "USD", "own_searches": { "youtube": ["...", "..."] } },
  "niches": [ { "niche_id": "niche-001", "rank": 1, "niche": "...", "overlap": "five words exactly here ok", "transfer_reason": "...", "searches": { "youtube": ["...", "..."] } } ] }
```
Then `node pipeline/swipe/swipe.mjs plan --run research/<id>/<run> --file research/<id>/<run>/plan.json`. If it rejects the plan, fix exactly what it lists and rerun. Then `node pipeline/swipe/swipe.mjs export --run research/<id>/<run>`.

## 5. Report
The run path, the window (dates), a table of the eight niches (rank, niche, overlap, one search each), any blocked platform, and the workbook path. Next step: `/swipe-find`.
