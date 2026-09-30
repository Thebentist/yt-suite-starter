---
name: voice-learn
description: Learn how a creator actually talks from their own YouTube uploads, so scripts can sound VERY close to them in any type of video. Transcribes their uploads on the GPU, measures rhythm, cadence and signature phrases per video type, builds a bank of their real passages for the scriptwriter to model every beat on, writes a verified voice guide, and calibrates the blind test. Every voice gets all five. Use for "/voice-learn", "learn my voice", "add <creator> as a voice", "refresh my voice profile", or when a script "doesn't sound like me".
argument-hint: "[channel id or new creator's YouTube URL] [--long N] [--shorts N] [--source <url> --match <regex>]"
---

# voice-learn

Everything is measured from the creator's own transcripts; nothing is described from a general idea of their style. **A voice is ready only when all five parts exist** (`node pipeline/doctor.mjs` shows each voice's checklist): transcripts, fingerprint, passage bank, voice guide, blind-test control. Do every step for every voice, the host's and reference voices alike.

## 0. The channel file
`channels/<id>.json` with `platforms.youtube.url`. For a new creator, create it (copy the shape of `channels/cleoabram.json` for a voice used only for scripts: `"role": "voice-reference"`; `channels/_host-template.json` for a host, then set `suite.json` → `host`). If their best material isn't on their own channel's /videos tab (e.g. a TV show's official clips on a network channel), add `"voice_source": { "url": "<playlist or channel search url>", "match": "<title regex>", "min_seconds": 150 }`. Official uploads only; skip unofficial reuploads.

## 1. Transcripts
`node pipeline/voice/corpus.mjs --channel <id> --long 45 --shorts 40` downloads audio only and transcribes locally on the RTX 3090 (small.en, roughly 3 to 4x faster than real time end to end including downloads; slower if a game or another transcription job is using the GPU/CPU). Run it in the background and give the user a real estimate from the listed minutes. It is resumable, paces downloads 8 s apart, stops cleanly at the first YouTube bot check (rerun later), skips uploads over 40 minutes, deletes audio after each transcript, and logs to `voice/<id>/corpus.log`. Only one YouTube-heavy job at a time. Aim for 30+ long-form transcripts (20+ for a reference voice); raise `--long` later to go deeper.

## 2. Fingerprint and passage bank
1. `node pipeline/voice/fingerprint.mjs --channel <id>`: `fingerprint.json`, `profile.md` (rhythm, signature phrases ranked by share of videos against other creators, markers, openers, openings, closings), `exemplars.md`, `vocab.json`. It sets aside near-empty and unpunctuated transcripts for rhythm, and counts repeated speech once (Shorts cut from a long video, compilations: listed in `fingerprint.json` as `duplicates`). Counts in the guide should use the de-duplicated set.
2. `node pipeline/voice/passages.mjs build --channel <id>` then `stats`: every punctuated transcript chunked into real passages labelled by video type (react, explainer, qa, ranked, personal, short, segment), position and job (explain, react, viewer, list, hedge, story), with a host score that keeps clip audio out of reaction videos, plus the rhythm and **cadence profile per video type** that `voice-check` compares scripts against. Look at the type counts: if videos are misclassified, set `type` on them in `voice/<id>/index.json` and rebuild. A type with fewer than 15 host passages has no profile of its own (scripts of that type fall back to "all").

## 3. The voice guide
Read `profile.md`, `exemplars.md`, the `stats` table and at least six full transcripts that cover the formats this creator actually makes (a react channel: explainers or Q&As where the host talks the whole time, reactions and a Short; an explainer channel: a spread of episode types; a show: several segments). Also read the first and last 60 words of every transcript. Before describing any top signature phrase, check it in context: whisper can hallucinate, and sponsor reads and recurring intros are their own category. In reaction videos only attribute a line to the host when context makes it clearly them. If the uploads are cut segments, their first and last lines aren't the real open and close: say so rather than inventing a pattern. Then write `voice/<id>/voice-guide.md` (900 to 1,400 words of prose; ids and tables don't count):
- **How they open** (first 20 seconds), **explain** a mechanism, **react**, **hedge**, **move between beats**, **close** (sign-off verbatim and how often): each with short verbatim examples and video ids.
- **How it changes by video type**: from the `stats` table and the transcripts (e.g. short bursts in reactions, long run-ons in Q&A, "I" in personal stories).
- **Rhythm and cadence targets** per type from the passage bank.
- **Words and moves they do NOT use**.
- **Running jokes and plugs**: recurring bits (e.g. a subscriber-milestone joke), their own product mentions, sponsor reads. Say how often each appears so the scriptwriter can use them on purpose or leave them out.
- **Trademarks**: catchphrases, sign-offs, show names, recurring bits. A voice reference: "Trademarks — never reuse in another host's script". The host's own voice: "Signature lines — use sparingly".
- Voice references only: **How to borrow this voice for a different host** (5 to 8 moves that transfer without impersonation).
- **Where the evidence disagrees with older docs** (`docs/huge-if-true-writing.md`, `docs/vsauce-layer.md`, `docs/voice.md`), if any.
- Quotes are one sentence or less, never whole paragraphs. **Verify every quote against its transcript with a script before finishing**; all must match. Counts you compute yourself are fine if labelled.
For a host, finish by updating their house-voice prompt from the guide (the file in `channels/<id>.json` → `voice.style_prompt`, usually `docs/style-prompts/<id>-house-voice.md`; the worked example is the original host's `docs/style-prompts/bentist-measured.md`): rhythm by type, measured words, words they never use, and the blind-test tells. The transcripts always win over the prompt; say what changed.

## 4. Blind-test control (the noise floor)
`node pipeline/voice/blind-test.mjs --channel <id> --control self --seed 11` writes a quiz where both halves are the creator's real passages. Launch two fresh judges in one message (Agent tool, `general-purpose`, `model: "sonnet"`): "Read voice/<id>/blind-control/judge-prompt.md and do exactly what it asks. Do not open any other file or search the web. Write ONLY the JSON array to voice/<id>/blind-control/verdict-a.json (or -b), then reply done." Then `node pipeline/voice/blind-test.mjs --score voice/<id>/blind-control/key.json voice/<id>/blind-control/verdict-a.json voice/<id>/blind-control/verdict-b.json` and write `voice/<id>/blind-control.md` with both accuracies and the date. Script blind tests for this voice pass when a judge's accuracy is within 15 points of its control.

## 5. Report
Transcripts measured (by format, words), the passage bank by type, the top 15 signature phrases with the % of videos, rhythm and cadence by type, the control accuracies, three things the guide says that older docs don't, and the paths. From now on `/write-script voice:<id>` models every beat on this voice's passages, checks cadence against its own videos of the same type, and blind-tests against it.
