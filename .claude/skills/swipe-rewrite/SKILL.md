---
name: swipe-rewrite
description: Step 3 of the swipe research. Adapts each qualified outlier to our channel. Looks at the real thumbnail, names the mechanism that made it work, and writes our own title, thumbnail brief and angle using the host's real expertise, then saves them to the Concepts and Packaging tabs. Use for "/swipe-rewrite", "twist these winners", "make my versions", "yoink and twist".
argument-hint: "[run path or 'latest'] [video ids to retry]"
---

# swipe-rewrite

Borrow the structural idea, never the footage, thumbnail pixels, likeness or distinctive wording. `R=research/<id>/<run>` (the argument, or the newest run with qualified rows).

## 1. Gather
- `node pipeline/swipe/swipe.mjs winners --run $R --json` gives qualified rows with **normal confidence first**, each group sorted by multiple. Take up to 10 per run in that order. Rows labelled `low` (tiny baseline) or `check` (20x+, or views far above subscribers) are rewritten only when the user asks for them: a fluke on a 400-view channel isn't a proven concept. Skip rows already rewritten, and skip rows whose earlier `image_check` was `unavailable` unless the user asked for a retry.
- Before writing, look at the whole qualified list once (rewritten rows included) and note which topics or structures repeat across creators (e.g. "rise and fall" three times). Count by **creator**, not by row: several winners from one creator share one baseline and are one piece of evidence. A mechanism that wins for several creators is stronger evidence than one big multiple; say so in the report.
- `node pipeline/swipe/swipe.mjs thumbs --run $R --ids <those ids>`, then **Read every thumbnail image**. If one won't download, set `image_check` to `unavailable`, leave the row qualified and never describe a thumbnail you did not see.
- Calibrate against our own channel: read `channels/<id>.json`, the host rules file (`channels/<id>.json` → `rules`), and our own titles with views from `voice/<id>/index.json` if it exists (what has worked here before, and the house title style).

## 2. For each winner
- `image_check`: what is actually in the thumbnail: subject(s), expression, composition, the words on it, colour and contrast. One or two sentences.
- `mechanism`: one short label. Use these when they fit: **number**, **named person**, **taboo**, **before-and-after**, **permanent consequence**, **expert reacts to extreme**, **scam exposed**, **myth vs truth**, **tested/ranked**, **curiosity question**, **transformation**, **authority vs trend**. Otherwise write a plain description.
- `why_it_worked`: one sentence starting with "Interpretation:", about topic plus packaging (title and thumbnail working together).
- `my_title`: a fresh title for our subject that keeps the mechanism, in the channel's house style. Not a word-swap of theirs.
- `my_thumbnail`: a buildable brief: image subject, composition (who is where), contrast, and the short on-image text (3 words or fewer). Talking-head channel, so the host plus one striking visual (rendered or illustrated objects are safest; the host holding a simple object is fine for the thumbnail photo only if the script carries a matching `[HOLD]` cue, never a demo). Never someone else's face or photo: a named-person mechanism uses the name as text or an illustration.
- `my_angle`: 1 to 3 sentences: the promise, and the host's real authority behind it (their profession or experience and what they can explain), plus the question the video answers. Use only evidence the host has or that we can source. Never invent results, numbers, patients, access to famous people or experiences (see the host rules file: nothing invented, only what they can do on camera).

## 3. Save
Write this batch to `$R/concepts.json` (overwriting is fine: the tool upserts by video_id into swipe.json, so earlier concepts are kept there) as an array of `{ video_id, mechanism, why_it_worked, my_title, my_thumbnail, my_angle, image_check }`, then run `node pipeline/swipe/swipe.mjs concepts --run $R --file $R/concepts.json` (it copies the source fields, upserts by video_id and marks only complete rows `rewritten`), then `node pipeline/swipe/swipe.mjs export --run $R`. The Packaging tab shows each real thumbnail next to our version.

## 4. Report
Group by mechanism. For each concept: the source title with its measured multiple, then our title, the thumbnail brief in one line, and the angle in one line. Finish by recommending the one or two concepts to make first and why (the strongest multiple on a normal-confidence baseline that also fits the host's authority), and say how many qualified rows remain. If none remain, say so and stop. To turn a concept into a video: `/write-script <run> <video_id>`.
