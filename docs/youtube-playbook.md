# TheBentist YouTube Playbook (2026)

This is the shared brain for the trend-scout, scriptwriter and editor agents. It is opinionated on purpose.
Sources: current retention/SEO guidance (Teleprompter, 1of10, SocialRails, Lenos benchmarks, SEO Sherpa, Learning Revolution) plus channel history.

## 1. What wins on this channel
- The core promise of a Bentist video: "a real orthodontist is going to tell you what is ACTUALLY happening in that mouth, and you will laugh while you learn."
- Best-performing format: **react + explain**. Clip plays, Ben reacts (pathos), then a 15-40 second mechanism explainer (ethos) with a visual.
- Highest CTR titles historically pair a curiosity gap with a credentialed judge: "Orthodontist Reacts to...", "Dentist Explains Why...", "...Ranked by a Real Orthodontist".

## 2. Retention rules (non-negotiable)
1. **No intro. No logo. No "welcome back."** First frame is the payoff preview or the clip itself.
2. **First 30 seconds** must answer "why keep watching?" Use one of three hooks:
   - **Preview hook**: show the wildest moment from later in the video (2-4s) then "we'll get to that".
   - **Question hook**: the exact question people type into Google/YouTube ("Can you actually move your teeth with rubber bands?").
   - **Bold claim hook**: a counterintuitive, defensible statement ("This TikTok hack is the number one reason I see 14-year-olds with cracked molars").
3. Cut every pause longer than ~0.5s. The silence cutter defaults to that.
4. Aim for a **visual change every 2-4 seconds** in the first 30s (cut, zoom, overlay, clip). The face should be on screen less than 20% of the first 30s.
5. **Re-hook every 60-90 seconds**: open a loop ("in a minute I'll show you the one hack that actually works").
6. Pattern interrupts: animated stat, on-screen text, a "Bentist verdict" stamp (SAFE / RISKY / NEVER), a sound cue.
7. End screen at the last 10-15s only. Point to a specific next video, not "any video".

## 3. Ethos, pathos, logos: how we use each
- **Ethos (credibility)**: name the mechanism, name the anatomy in plain words, cite the "in my clinic" pattern. Never over-claim; say "usually" and "I'd need an x-ray to be sure" where true. Credibility is what makes the laugh land.
- **Pathos (emotion)**: the viewer's fear (pain, cost, embarrassment), the parent's worry, the teen's impatience. Acknowledge it before correcting it: "I get it, braces take forever and this looks like a shortcut."
- **Logos (logic)**: one clean cause -> effect chain per segment. If we cannot explain WHY in one sentence, we cut the segment.
- Comedy comes from *reaction* and *specificity*, not from mocking the person. Punch up at the idea, never at the kid in the video.

## 4. Search (YouTube + Google) rules
- **Title**: primary keyword in the first 60 characters, phrased the way people actually search. Front-load it. Curiosity gap after the keyword. 5 variants, pick 1, keep 2 for A/B thumbnails.
- **Description**: primary keyword in the first 150 characters (first sentence). 180-250 words total. Include 3-5 secondary phrasings ("braces rubber bands", "DIY braces", "teeth moving hacks"). Include chapters.
- **Chapters**: descriptive, keyword-carrying labels ("Why rubber bands crack roots", not "Part 2"). Google Key Moments indexes each chapter as its own result.
- **Spoken keywords**: YouTube ranks off the transcript. Say the primary keyword out loud in the first 15 seconds and once more near the end.
- **Tags**: low value; only add misspellings and abbreviations.
- **Target questions**: the scout must find real queries (People Also Ask, Reddit r/braces titles, TikTok captions, YouTube autocomplete). Each video answers 1 primary + 2-3 secondary questions explicitly, in a complete sentence, so it can be pulled into AI Overviews and Key Moments.

## 4b. Two lanes
- **Lane A, explainer** (`format: explainer`): one big debated question, 12-18 min, chapters are questions, visual-first, skeptic beat, "next big choice" ending. Full spec in `docs/explainer-format.md`. Titles follow the patterns there; no "Orthodontist Reacts" in the title.
- **Lane B, react / test franchise** (`format: react | ranked | test`): the rules in sections 1-4 above, verdict stamps, weekly.
Route an idea to the lane its format demands. A ranked test is Lane B even if the topic is fascinating.

## 5. Script format the agents must produce
```
# <Working title>
## Titles (5)                         ## Thumbnail text (3 options, <=4 words each)
## Hook (3 variants, mark the pick)   ## Chapters (with estimated timestamps)
## Script                             ## Description (SEO)
## Shorts cut ideas (3)               ## Pinned comment
```
Inside `## Script`, every beat uses this notation so the other agents can parse it:
```
[HOOK]            segment markers: [HOOK] [CLIP 1] [EXPLAIN] [RE-HOOK] [CLIP 2] ... [VERDICT] [CTA]
(reaction)        stage directions in parentheses
[ANIM: id | 6s | what it shows]    animation cue, becomes a scene the motion-designer builds
[TEXT: "on screen text"]           lower-third or big text
[SFX: whoosh] [MUSIC: lift]         sound cues for the composer/editor
```

## 6. Verdict system (recurring brand device)
Every reacted clip ends with a stamped verdict and a one-line reason:
- **SAFE** (mint) - fine, maybe even smart
- **RISKY** (accent yellow) - works for some, hurts others, ask your ortho
- **NEVER** (coral) - this damages teeth or gums, here is the mechanism

## 7. Idea scoring rubric (trend scout)
Score 1-5 on each, total /25. Only pitch ideas scoring >= 17.
- Search demand (people are asking this exact question)
- Freshness (trending in the last 14 days, or evergreen with a fresh angle)
- Reaction potential (visual, surprising, funny, or alarming clip exists)
- Teachable mechanism (can Ben explain WHY in one sentence)
- Fit (braces/teeth/kids/parents, on-brand, safe to discuss)
