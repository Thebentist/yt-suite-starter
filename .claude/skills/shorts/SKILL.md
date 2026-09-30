---
name: shorts
description: Cut a finished long-form video into vertical shorts (YouTube Shorts, TikTok, Reels) that each tell a complete story in 3 minutes or less, in the long video's own look. Finds the sections that stand alone, builds them on Kallaway's short-form rules (aligned triple hook, lock-in, story loops, a last line that closes the loop), rebuilds the picture vertically from the 4K parts (host crop that follows his face, graphics in a panel or full-screen, cards moved above his head), captions word by word, takes out dead air, adds a silent subscribe/follow call-out per platform, checks every cut by ear-by-machine, and delivers one file per platform with a posting sheet. Use for "/shorts <slug>", "make tiktoks / shorts from this", "cut this into shorts", and automatically at the end of /resolve-edit once the long video is delivered.
argument-hint: "<slug> [go] [count:5] [platforms:youtube,tiktok]"
---

# shorts

A short is the long video's best stories, re-told for a phone. Code does every cut, crop and count; Claude chooses the stories, looks at every sheet and listens (by machine) at every cut. `S=videos/<slug>`, `T=$S/tiktok` (the folder name is historical: it holds every platform).

**Read first:** `docs/edit-lessons.md` (the S rows: every mistake from the first short-form run and the guard that now prevents it), the short-form parts of `research/strategy/kallaway-notes-hooks.md` and `-story.md` (triple hook, lock-in zone, story loops, rehooks), `docs/ben-rules.md`. The worked example is `videos/bad-breath-for-good/tiktok/` (plan.json, layout.json, posting.md, candidates.md).

**Needs** a long video finished through `/resolve-edit`'s story route: `$S/out/final-spec.json`, `$S/out/final/stems.json` (dialogue, sfx, score, clip audio), `$S/work/cut-transcript.words.json` newer than `$S/work/cut-audio16k.wav`, the 4K master in `$S/out/final/deliver/`. A video finished elsewhere has none of these parts: say so and stop (a master-only mode is future work).

## Shorts rules (from the original host, Ben, 2026-09-29; they hold for any host unless their rules file says otherwise)
- Each short is a **complete story, 3 min or less** (60-120 s is the sweet spot). **No cliffhangers**: the last line pays the first; a question to the viewer at the end is fine ("would you tell a friend?").
- **Only the host's words.** Pieces may come from anywhere in the video (a cold open lifted from later in the same story, a fix from the end), but nothing is written for them. Trim only lead-ins at a piece start ("And", "So first off", "Because"); never cut inside a sentence; keep their natural lines (lead-ins and clip reactions are not stumbles).
- A clip they react to **stays in the file, credited on screen**, in the react layout. (Ben's call on fair use for his channel; confirm with this host before the first one.)
- Their own products or sponsors are fine; the long cut's AD chip stays pinned, and the posting sheet says to switch on the platform's disclosure.
- Call-outs to subscribe/follow: **silent and small**, never over their face, the captions or the hook.
- On-screen numbers: about six per short at most, the ones they said.

## 1. Find the stories
1. `node pipeline/edit/shorts-plan.mjs --slug <slug> --transcript` → read ALL of `$T/transcript.txt` (the finished cut as timestamped sentences, with chapter headings).
2. List every section that stands alone: its hook line, its arc (the loops), its payoff, its length, what joins it (two chapters can make one story: "what they are" + "how to get them out"). Rank by judgment, never invented numbers: hook strength (subject + stakes in the first sentence, a specific number), how surprising the reveals are (would most viewers not know this?), one line people repeat, the reason to share. Note what each needs (a cold open, a trimmed lead-in, a reaction clip).
3. Write `$T/candidates.md` (table: clip, pieces with final-cut times, length, text hook, notes). Show the host and stop for his picks, **unless** the run is automatic (`go`, or called from `/resolve-edit`): then build the strongest `count` (default 5) and say which and why in the report.

## 2. Plan
`$T/plan.json`, one entry per short (template: the bad-breath plan):
- `id`, `title`, `textHook` (2 lines of 35 characters or fewer, the subject + a specific number or a contrast; on screen for the first ~4 s), `captionHook` (the post caption's first line), `lastLine`.
- `segments`, in playing order: `{ "from": "his exact first words", "to": "his exact last words", "near": <final-cut s>, "note": "what this piece does" }`, or `{ "t": [a, b], "foreign": "whose clip" }` for a reacted clip. Hand fixes after listening: `trimIn` / `trimOut` (final-cut s), `remove: [[a, b]]` (cut a stretch inside the piece), `accept: ["word"]` (a first/last word whisper hears differently, checked by snippet).
- Structure (Kallaway): text, spoken and visual hooks say the same thing in the first second; the next 2-4 sentences confirm the hook and give the trust line (his credential, a study); 3-4 reveals per minute, each better than the viewer's guess; the seams read "but" or "so", never "and then"; the last line closes the loop.

Then `node pipeline/edit/shorts-plan.mjs --slug <slug>` → `$T/scripts.md` (exact words and counted lengths; `[before]`/`[after]` show what each cut leaves out). Read it all: every piece opens on the planned word, no lead-in left, no sentence cut in half.

## 3. Layout
1. `node pipeline/edit/shorts-look.mjs --slug <slug>` and LOOK at both sheets:
   - `$T/work/look-graphics.jpg` (each short's opening graphics with the centred 9:16 slice outlined): `fill` (full-screen) only when the subject stays inside the box; `until` where it later widens (a trail, a TV); everything else stays `stack` (the 16:9 panel above him).
   - `$T/work/look-overlays.jpg` (each partial overlay in the long cut | alone on a grid): labels drawn on a graphic → `map` (default); cards around him (name cards, photos, product labels) → `box` with `parts` (`region` = the one element, `zone` = where it goes, usually above his head); disclosure chips → `pin`; on-screen text that repeats the captions → `skip`.
2. Write `$T/layout.json` (template: the bad-breath one): `react` (the reacted clip's vertical source and its offset), `credit`, `skip`, `graphics`, `overlays`, `captionFixes` (names whisper spells wrong), `keepPauses` (pauses that are the joke, e.g. "I'll wait"), `tighten` (dead-air pass; `{}` = defaults), `platforms`, `cta`, per-clip `clips.<id>` (`hookY`, `cta.zone`).
3. `node pipeline/edit/face-track.mjs --slug <slug>` (where his face is, 6 samples a second, over the A-roll the shorts use; the crops follow it).

## 4. Call-outs (once per channel; reusable)
`node pipeline/motion/render.mjs --scene pipeline/motion/kits/shorts/cta.js --out $T/cta/cta-youtube --params '{"verb":"SUBSCRIBE","done":"SUBSCRIBED","icon":"bell","line":"FOR MORE FROM <HOST NAME>"}'` and the same with `cta-tiktok` / `"FOLLOW"` / `"FOLLOWING"` / `"plus"`. Or copy the renders from a previous video's `tiktok/cta/`. The builder places them at the top of the frame at the end of the piece nearest 40% of the short (after a payoff) and over the last line, ~3 s each.

## 5. Build, look, listen
1. `node pipeline/edit/shorts-build.mjs --slug <slug> --draft d1 --publish <slug>-tiktok` (all clips, or `--clip a,b`). Shots whose inputs did not change are not rendered again, so a revision rebuilds in about a minute per short.
2. LOOK at every `$T/out/<clip>-d1.sheet.jpg`, then at single frames: frame 1 (the hook fits, nothing covers his face), each card, each call-out, any shot where he leans or moves.
3. `node pipeline/edit/shorts-check.mjs --slug <slug> --draft d1`: picture (1080x1920, 30 fps, duration), audio (-14 LUFS, true peak ≤ -1 dBTP) and **every cut, transcribed on its own** (the first and last 1.6 s of each piece must open on its first word and close on its last). A failed cut: read what it heard; look at the dialogue waveform around the cut (whisper's word times drift up to 0.4 s); transcribe snippets at candidate cut points; fix with `trimIn`/`trimOut`/`remove`, or `accept` a word whisper hears differently (write why in the note). Never ship a failed cut.
4. Say plainly in the report that nobody has watched or listened end to end, and name the one or two spots worth his ear.

## 6. Notes, finish, deliver
1. The host's notes arrive in the review app (project `<slug>-tiktok`): `node pipeline/review/comments.mjs --slug <slug>-tiktok`. Fix each, rebuild (`--draft d2`), check, then reply to each note with what changed (`--reply <id> --text "..." --status done`).
2. Finals: add `--deliver` → `$T/deliver/<platform>/<clip>.mp4` (1080x1920, 30 fps, H.264 high ~14 Mb/s, AAC 320k 48 kHz, -14 LUFS).
3. `$T/posting.md`: per short, the caption (caption hook first), 3-5 hashtags, the disclosure reminder for his own products, the credit for a reacted clip.
4. Add every new mistake to `docs/edit-lessons.md` (S rows), and turn anything checkable into a guard.

## Tools
`pipeline/edit/shorts-plan.mjs` (transcript view; plan → exact words and lengths), `shorts-look.mjs` (layout sheets), `face-track.mjs` (face positions), `shorts-build.mjs` (vertical build: layouts, captions, text hook, dead-air pass, call-outs, platforms, publish, deliver), `shorts-check.mjs` (picture, loudness, every cut), `pipeline/motion/kits/shorts/cta.js` (the call-out).
