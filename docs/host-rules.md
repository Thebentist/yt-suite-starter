# Host rules for scripts, packaging and edits

> Fill this in during phase 1 of `docs/START-HERE.md` (the interview), then keep adding to it: every time the host corrects a script, a title or an edit, the correction becomes a numbered rule here with the date and their words in quotes. These rules override any general writing or editing advice in the suite. Worked example: `docs/ben-rules.md` (the original host's file).
> Rules marked **(universal)** came from the original host but held for every script since; keep them unless the host overrules one.

Host: `<name>` · channel: `channels/<id>.json` · last updated: `<date>`

## What the host is on camera
1. **Format:** `<talking head only? talking head plus animation? demos, props, locations, B-roll the host films?>` Never write a beat the host can't physically do in their setup.
2. **Nothing invented about the host (universal).** No specific person, event, memory, habit, possession or number of theirs unless they supplied it. Generic professional experience is fine. Hedges that claim a past action ("I had to go check that") count as invented. When a beat needs a witness, attribute it to a documented group with a source. List every first-person line near the top of the script for their sign-off.
3. **Their stance:** `<how they relate to their field's fads, controversies and competitors; what they must never sound naive or wrong about>`
4. **Ask for the expert's point.** Before finalizing a script in their field, ask what an expert would say is missing. Keep their answers in `docs/host-expert-notes.md` and read it first next time.

## How it should feel
5. **Magic School Bus bar (universal default).** One trip, two images, about six numbers on camera. Sample sizes and evidence grades go in the pinned comment. `<keep, or the host's own bar>`
6. **Spoken, not written (universal).** The house voice is `docs/style-prompts/<id>-house-voice.md` (written in phase 2 from their transcripts). Their transcripts (`voice/<id>/`) always win over any prompt. When a draft "doesn't sound like me", go back to their passages (`node pipeline/voice/passages.mjs query --channel <id> ...`), not to adjectives.
7. **Open:** `<how they like to open: a clip they react to, a question, a story; the credential line; how fast the title promise must be confirmed (default: title words by ~0:10, thumbnail promise by ~0:15)>`
8. **Structure like a story (universal).** But/therefore between beats, never "and then" (inside an explanation, steps can chain). Write the last line first. A returning element must be something the viewer saw in the first minute. Advice is a full sentence to one person.
9. **No phantom promises (universal).** Every forward reference points at a published video, a scheduled script, or text in the same file; otherwise close on the video itself with their sign-off: `<their sign-off, verbatim>`.
10. **Words they never use / always use:** `<from the interview and the voice guide>`

## How they like to record
- **Talking points or full script:** `<the original host preferred talking points: structured beats he talks through loosely, then the script is built from his transcript (see docs/ben-rules.md "The talking-points loop"). Ask which this host wants.>`
- **Reading setup:** `<teleprompter? a screen beside the lens? memorizes lines? This decides how glances get trimmed in the edit.>`

## Packaging on their channel
- `<their title style (caps, punctuation, length), what has worked on their channel (check voice/<id>/index.json titles with views), thumbnail rules (face? text? colours?)>`

## Products and sponsors
- `<their own products or regular sponsors, the claims they have supplied (with sources), how long a segment may run, and the disclosure they use>`

## Editing preferences
- `<pace, jump cuts, zooms, music, captions, graphics taste (e.g. the original host: people drawn in high-taste 2D, 3D for anatomy and products; public web images are fine, never paid stock), anything they have asked to keep or cut>`

## Corrections log
| Date | What they said (their words) | Rule it became |
|---|---|---|
