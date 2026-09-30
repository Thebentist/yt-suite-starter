---
name: read-check
description: After the host records a script, compare what they actually said with what was written, run the blind test on their real delivery, and feed the lessons back into the voice rules and the scriptwriter. Use for "/read-check", "I filmed it", "here's the raw video", "check what I said vs the script".
argument-hint: "<slug> <path to raw recording>"
---

# read-check

The recording is the truest voice evidence there is: every line he rephrased on the fly shows what didn't sound like him, every line he kept shows what did. Never modify the raw file.

1. **Transcribe** (GPU, about a minute per 30 minutes of footage): `node pipeline/edit/transcribe.mjs --in "<raw file>" --out videos/<slug>/take/transcript`, then delete `transcript.16k.wav`. Read the first two minutes of `transcript.txt`: hosts often say how they're approaching the take ("reading off the script as best I can", "I'll wing it", a react cold open). That changes how to read everything else.
2. **Align by meaning**: `node pipeline/script/read-diff.mjs --script videos/<slug>/script.md --words videos/<slug>/take/transcript.words.json`. It writes `take/read-diff.{md,json,html}`: every script paragraph beside his keeper take, retakes, keeper pace, off-script stretches. Send `read-diff.html` to the side panel.
3. **The read test** (the fair version of the blind test): build `take/keepers.md` from the keeper texts (a `type:` line and a `## Script` section) and run `node pipeline/voice/blind-test.mjs --script videos/<slug>/take/keepers.md --channel <host> --type <type> --seed <n> --n 16 --out videos/<slug>/blind-read`, then two fresh Sonnet judges as in `/write-script`. This measures his delivery of our script against his unscripted videos.
4. **Lessons**: write `take/read-lessons.md` with evidence (script vs said, timestamps): his recurring transformations (expand, simplify, restate, swap, add examples), what he skipped or condensed and why, the paragraphs he retook most, his read pace and the real runtime, the format he chose, ad-libs worth keeping, and any new first-person facts he volunteered (expert ones go to `docs/host-expert-notes.md`). Then make the surgical edits the lessons call for in the host's house-voice prompt (`channels/<host>.json` → `voice.style_prompt`, section "When they read a script"), `.claude/agents/yt-scriptwriter.md` (length budget, density, format) and the timing defaults, each marked with the date and video it was learned from.
5. **Report** in chat, short: paragraphs delivered and retaken, keeper pace and real runtime vs the estimate, the read-test scores, the top lessons with one example each, and what changed in the process. Offer `/resolve-edit <slug>` next (the raw file path goes in `videos/<slug>/raw/` only as a copy or link; never move or edit the original).
