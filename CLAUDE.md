# yt suite

Claude's long-form YouTube suite for **the host** (the person on camera, named in `suite.json` → `host`, described in `channels/<host>.json`). It finds what's working, writes scripts that sound like the host (not like AI), edits the recording in DaVinci Resolve to a high bar (Huge If True-style graphics included), and cuts vertical shorts. Everything runs as slash skills from this folder.

**New here? Read `docs/START-HERE.md` and follow it phase by phase.** `ONBOARDING.md` shows how far this install has got; tick items off there as they are done, so every later session knows where things stand. If `suite.json` has no host yet, start at phase 1 (the interview) before anything else.

## The jobs
1. **Research**: long-form videos that beat their own creator's baseline in adjacent niches, twisted into our packaging. `/swipe`, or `/swipe-niches`, `/swipe-find`, `/swipe-rewrite`.
2. **Voice**: `/voice-learn` measures how the host actually talks from their own uploads (five parts: transcripts, fingerprint, passage bank, verified voice guide, blind-test control).
3. **Scripts**: `/write-script` builds the story from a swipe concept or a topic and writes it (or talking points) in the host's voice, then checks it (retention, voice, AI tells, blind test).
4. **Read check**: after recording, `/read-check <slug> <raw file>` compares what was said with the script and feeds the lessons back.
5. **Editing**: `/edit-style` learns an editing style from reference videos; `/resolve-edit` turns a raw recording into a DaVinci Resolve timeline (FCPXML import), then finishes it through the Resolve MCP (Studio). The review app (`npm run review`, http://localhost:4600) is where the host leaves timestamped notes.
6. **Shorts**: `/shorts <slug>` cuts the finished video into vertical shorts (YouTube Shorts + TikTok files, silent subscribe/follow call-outs); `/resolve-edit` runs it after delivery.
`/yt-suite` prints the map and checks setup; `npm run doctor` checks the machine.

## The original host (read this before the docs)
This suite was built and battle-tested with **Dr. Ben Winters ("Ben", channel TheBentist)**. The docs, lessons and worked example say "Ben" often: read it as **the host**, and apply the lesson to this host unless `docs/host-rules.md` says otherwise. His own files are kept as worked examples and references, never as this host's identity:
- `docs/ben-rules.md` (his rules) → the model for this host's `docs/host-rules.md`
- `docs/style-prompts/bentist-measured.md` (his house voice) → the model for `docs/style-prompts/<host>-house-voice.md`
- `voice/thebentist/` (transcripts of 103 of his real videos: 66 long, 37 Shorts, about 228,000 words, mostly unscripted; shared with his permission) → a **voice reference** for natural spoken rhythm. Borrow how speech moves; never his phrases, profession, stories or catchphrases.
- `videos/bad-breath-for-good/` → a complete finished project (plans, edit configs, 101 graphics' scene code, shorts plans, review notes).

## Layout
```
suite.json                 which channel is the host
channels/<id>.json         platforms, audience, niche, rules file, voice + style pointers (template: channels/_host-template.json)
research/<id>/<run>/       swipe.json (source of truth), Video Swipe File.xlsx, thumbs/, sources/
research/strategy/         Kallaway study notes (hooks, story, psychology): the retention method
voice/<id>/                index.json, transcripts/, fingerprint.json, passages.json, profile.md, exemplars.md, voice-guide.md, blind-control.md
styles/<name>/             editing style references (style.json + style.md)
videos/<slug>/             packaging.md, beat-map.md, talking-points.md, script.md, review.md, raw/, edit/, scenes/, out/, tiktok/
docs/                      the playbooks (START-HERE, host-rules, huge-if-true-writing, retention-playbook, edit-lessons, motion-style, resolve-editing...)
pipeline/                  the deterministic tools (Node 22+): swipe, voice, script, resolve, edit, motion, review, style
tools/                     yt-dlp, whisper.cpp builds, whisper models, face model (not in git; SETUP.md)
```

## Rules that apply everywhere
- **Numbers come from code, judgment from Claude.** Outlier multiples, medians, loudness, durations, word counts: the tools produce them. Never compute or restate a number the tools did not produce.
- **Swipe method** (Angus Sewell's): 90-day window, creators up to 10x our size on that platform, multiple = views / median of the creator's 10 other most recent same-format uploads in the window (at least 5), qualified at 3x. Never loosen or tighten either threshold.
- **Borrow the idea, never the wording, footage, thumbnail pixels or likeness.** Every concept names the structural mechanism it borrows. Reference voices lend rhythm and structure, never trademarks (catchphrases, sign-offs, show names).
- **The host's rules win** (`channels/<host>.json` → `rules`): nothing invented about the host (no people, events, habits, memories they didn't supply), only what they can do on camera, no phantom "next video" promises, ask what an expert in their field would say is missing.
- **Every script is written beat by beat from the voice's real passages**, checked with `voice-check --type`, and blind-tested against that voice.
- **Look before you claim.** Read thumbnails before describing them, contact sheets before describing a style, render and look at frames before calling an edit done. Say plainly what nobody has watched or listened to.
- **Track every mistake.** After each review round, add what went wrong and the guard that now prevents it to `docs/edit-lessons.md`; turn checkable rules into code guards.
- **YouTube from one machine:** search, channel pages, RSS feeds and thumbnails are reliable; watch pages and audio downloads get bot-checked when hammered. One YouTube-heavy job at a time, paced; never retry in a loop, never use browser cookies, never work around a CAPTCHA.
- **Publishing is the host's call.** Uploading, posting, changing a live title or thumbnail, or pushing to GitHub happens only after the host says yes to that specific action.
- Windows: Bash heredocs with apostrophes fail; write prose files with the Write tool. `raw/` recordings are never modified.
