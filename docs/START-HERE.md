# START HERE: the runbook for the agent

This is the order of work that got the original host (Dr. Ben Winters, TheBentist, ~9.5M subscribers) from "an idea" to a finished 13-minute Huge If True-style explainer with 101 custom graphics, a 4K master that passed every check, and five shorts for YouTube and TikTok. It is written for **you, the agent**, to run with a **new host**: their channel, their voice, their feel. Do the phases in order. Each phase has a goal, the steps, what "done" means, and the traps that cost time the first time round.

Keep `ONBOARDING.md` current: tick each item as it's done and write the date. If a session ends mid-phase, the next one starts by reading `ONBOARDING.md` and this file.

**Two ideas carry everything:**
1. **The host's own words and sound are the product.** Scripts are built from their real speech, not from adjectives about it; every edit keeps their natural lines. Nothing about them is invented.
2. **Code measures, Claude judges, the host decides.** Numbers come from the tools. Claude looks at every frame and sheet before claiming anything. The host signs off on first-person lines, anything published, and every rule.

---

## Phase 0: the machine (the human does SETUP.md; you check it)
Goal: every tool works on this computer.
1. Ask the human to follow `SETUP.md` (Node, `npm install`, `tools/` downloads, Chrome, DaVinci Resolve). Offer to download the `tools/` files for them: say each file, its source and size, and wait for a yes before each download.
2. Run `npm run doctor`. Every ✗ must be fixed; ~ lines are optional but say what they cost (no NVIDIA GPU = slower renders and transcription; no Resolve Studio = import the timeline files by hand).
3. If Resolve Studio is installed: in Resolve, File > Setup AI Assistants > Claude Code, then restart Claude Code in this folder and approve the `davinci-resolve` MCP server. Check `.mcp.json` points at their `ResolveMCP.exe`.
**Done when** doctor shows no ✗. Tick phase 0 in ONBOARDING.md.

## Phase 1: meet the host (interview, about 20 minutes)
Goal: `channels/<id>.json`, `docs/host-rules.md`, `suite.json`, all from the host's own answers.
1. Ask, one topic at a time, and write their answers down in their words:
   - Who they are on camera, and the credential or experience that gives them authority. Their channel URL and handle.
   - The niche and formats they make (reactions, explainers, stories, Q&A, lists...), who watches, and why.
   - Three of their videos they're proudest of, and three creators they admire (for style and structure, never to copy).
   - What they can do on camera: talking head only? demos, props, locations, B-roll they shoot? (The original host was talking head plus animation only; writing a beat he couldn't physically do was a recurring mistake.)
   - Their stance on their field: what they must never sound naive or wrong about; topics or claims that are off limits.
   - How they like to record: talking points they riff on, or a full script? teleprompter, a screen, memorized lines? (This decides the script format and how script glances get trimmed in the edit.)
   - Their sign-off, words they always use, words they never would, anything in AI-written scripts that makes them cringe.
   - Their own products or sponsors, and how they like them worked in.
   - Editing taste: pace, zooms, music, captions, graphics style (2D or 3D, real images or drawn), anything they hate.
2. Write `channels/<id>.json` from `channels/_host-template.json` (id = short lowercase handle), `docs/host-rules.md` from its template (keep the rules marked universal unless they overrule one), an empty `docs/host-expert-notes.md`, and set `suite.json` → `"host": "<id>"`.
3. Read the rules back to the host in plain words and fix what they correct.
**Done when** doctor shows the host line with a rules file, and the host has approved `docs/host-rules.md`.

## Phase 2: learn their voice (the part that makes scripts not sound like AI)
Goal: all five voice parts for the host, and their house-voice prompt.
1. `/voice-learn <id>`. It transcribes their recent long videos and Shorts locally (paced, one YouTube job at a time), builds the fingerprint and the passage bank by video type, writes a quote-verified voice guide, and runs the blind-test control. Give the host a real time estimate from the listed minutes and let it run in the background.
2. Write their house-voice prompt, `docs/style-prompts/<id>-house-voice.md`, from the guide and the passage stats. Use the original host's `docs/style-prompts/bentist-measured.md` as the model: the one rule (their transcripts win), rhythm by video type, how they do each job (open, explain, react, hedge, move on, close), words they use and never use, what gives a script away (from the blind-control judges), punctuation, signature lines (use sparingly), and later "When they read a script" (filled by `/read-check`).
3. Compare their rhythm with the reference voices: `node pipeline/voice/passages.mjs stats --channel <id>` next to `--channel thebentist`. The original host's 103 transcribed videos (about 228,000 words) are a second, large sample of real unscripted YouTube speech; the scriptwriter uses them when the host's own bank has no passage for a beat. Borrow movement, never his words.
4. Read five of their passages and the house-voice summary to the host: "is this you?" Fix what they say isn't.
**Done when** doctor shows `voice: <id>` with all five parts, and the host agrees the house voice sounds like them.
**Traps:** a voice is its transcripts, not adjectives ("casual, energetic" produced scripts the original host rejected nine times). Never add fake disfluency to pass a blind test.

## Phase 3: learn their editing style
Goal: a measured style for each video type they make.
1. `/edit-style` on 2-3 of their best-performing videos of one type (one download at a time), blend them (`--name <type>`), and look at every contact sheet before writing the visual notes.
2. For the Huge If True-style story edit, `styles/story/` (measured from Cleo Abram) ships ready; add a reference they admire if they want a different feel.
3. Map the styles in `channels/<id>.json` → `editing_styles`.
**Done when** each type they make has a style with visual notes written from the sheets.

## Phase 4: research the next video
Goal: a filming shortlist.
1. `/swipe` (or the three steps). It works the 8 niches next to theirs, measures each candidate against its own creator's baseline (3x the median of their other recent uploads, 90 days, creators up to 10x our size), and writes our title, thumbnail brief and angle for each winner. The code does every number.
2. The host picks the concept. Their taste beats the multiple.
**Traps:** never loosen the thresholds to find more; never use browser cookies or work around a YouTube bot check (wait hours instead).

## Phase 5: write it
Goal: talking points or a script the host would say, that holds attention.
1. `/write-script <run> <video_id>` (or `<slug> <topic>`), in the mode the host chose in phase 1. The scriptwriter agent builds the packaging first (title, thumbnail, one-sentence promise, the last line), maps the source outlier's structure (architecture only), sources every fact, outlines by shock-scored reveals (Kallaway's method, `docs/retention-playbook.md`), then drafts beat by beat from the host's real passages.
2. Checks it must pass: retention checklist 21+/25 with no HARD fail, voice-check against their own videos of that type, ai-tells, and (full scripts) the blind test with two fresh judges: under 60%, no paragraph caught by both, within 15 points of the control. 3 rounds maximum; then the read test after recording is the fair judge.
3. Before recording: the host signs off every first-person line and answers the expert question. Send them the reading copy (`read-copy.mjs` → `-read.html`).
**Bars** (from the original host's corrections): the Magic School Bus bar (one trip, two images, about six numbers on camera); but/therefore between beats; title words spoken by ~0:10 and the thumbnail promise confirmed by ~0:15; no phantom "next video" promises; a product segment only with claims they supplied.
**Traps:** nine drafts in a written voice never sounded like him; the talking-points loop (he talks the beats, we build the script from his transcript) fixed it. If a draft "doesn't sound like me", go back to their passages, not to adjectives.

## Phase 6: record, then read-check
1. The host records. Their raw files are never modified; copy or link them into `videos/<slug>/raw/`.
2. `/read-check <slug> <raw file>`: what they said vs the script (by meaning), their real pace (`script_wpm`, measured, goes into their channel file), the read test (their delivery vs their unscripted videos), and lessons fed into the house voice and the scriptwriter.

## Phase 7: edit it
Goal: a finished video in their style, with graphics at a high bar, delivered 4K.
1. First time on this machine: the Resolve smoke test (`/resolve-edit` runs it) so the import quirks are known.
2. `/resolve-edit <slug> type:<reaction|story|explainer>`. Read `docs/edit-lessons.md` first, every time: every mistake from the original project and the guard that now prevents it.
3. For the story route (section 6 of the skill), the order that saves days: **lock the dialogue first** (paper edit, fixes, retakes, script-glance trims, a dialogue-only review the host approves), then design graphics in parallel as stills, then render finals once, then assemble. Every dialogue change after graphics exist costs re-renders.
4. The review loop: publish each version to the review app (`npm run review` → http://localhost:4600; speed, theater, volume, download). Read every open comment first, fix it, reply on each with what changed, mark it done only when fixed. Add each new mistake to `docs/edit-lessons.md`.
5. Look before claiming: contact sheets, rhythm-check, stale-frame check, and frames at every noted spot. Deliver with check-deliver (true peak must be ≤ -1 dBTP; the limiter remux is in the lessons).
**Habits the host will notice** (from the original host's notes): keep their natural lines (lead-ins and reactions are not stumbles); trim script glances only at line ends, never cutting words; people drawn in high-taste 2D (3D people looked wonky), 3D for objects, anatomy and products; public web images are fine (credited), never paid stock; review renders at 1080p, 4K only for the final.

## Phase 8: shorts
`/shorts <slug>` (or it runs after delivery): complete stories under 3 minutes, no cliffhangers, only their words, face-tracked vertical crops, graphics in a panel or full-screen, word-by-word captions, dead air removed, silent subscribe/follow call-outs, one file per platform, every cut checked by transcribing it. Publish to the review app; their notes drive the finals and the posting sheet.

## Phase 9: after it's published
1. Ask the host how it did (views vs their normal, retention, comments) and what they'd change; add it to `docs/host-rules.md` or `docs/edit-lessons.md`.
2. Posting is theirs to approve: scheduling tools (YouTube Studio, TikTok Studio, or an official-API scheduler such as Metricool) are fine; never post or change a live title or thumbnail without a yes for that action. YouTube's own Test & Compare is the right way to A/B test titles and thumbnails on long videos.
3. Start the next video at phase 4.

---

## What ships as reference
| Path | What it is | How to use it |
|---|---|---|
| `voice/thebentist/` | Transcripts of 103 of the original host's real videos (66 long, 37 Shorts) + his fingerprint, passage bank, guide, blind control | Natural-speech reference for rhythm; the scriptwriter pulls it when the host's bank has no match. Never his phrases or persona |
| `voice/cleoabram`, `vsauce`, `altonbrown` | Measured voice references (transcripts not shipped; `/voice-learn <id>` rebuilds them) | `/write-script voice:<id>` or `structure:<id>`; never their trademarks |
| `docs/huge-if-true-writing.md` | The storytelling and retention bible (Cleo Abram's structure, Kallaway's framework, the Magic School Bus bar, the talking-points loop) | Read by the scriptwriter every time |
| `docs/retention-playbook.md`, `retention-checklist.md`, `research/strategy/kallaway-notes-*.md` | Kallaway's method, distilled with evidence labels | Outline and hook rules, short-form rules |
| `docs/edit-lessons.md` | Every editing mistake and its guard | Read before every edit; add after every review round |
| `docs/motion-style.md`, `videos/bad-breath-for-good/scenes/` | The graphics style and 101 scenes of working code (2D story, data, 3D anatomy and microbes, overlays) | Reuse kits and patterns; keep the look consistent |
| `styles/` | Measured editing styles (story = Huge If True; reaction blends; the original host's long-form) | Starting points until the host's own are measured |
| `videos/bad-breath-for-good/` | A complete finished project: packaging, script, edit configs, paper edit, graphics, review comments with replies, shorts plans and layouts | The worked example for every file a video needs |
| `docs/ben-rules.md`, `docs/style-prompts/bentist-measured.md`, `docs/examples/` | The original host's rules, house voice and brand notes | Models for the host's own files |
