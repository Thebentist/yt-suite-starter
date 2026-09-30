# The editorial content pass (what to cut from the raw talk)

The automatic passes (dead air, fillers, stutters, safe false starts) take about 4% out of a raw take. Ben's editor takes out **40-44%**: measured on two raw/published pairs by `pipeline/style/match-edit.mjs` (2026-09-28):

| Pair | Raw | Published | Kept | Removed words | Dead air removed |
|---|---|---|---|---|---|
| Is soda ACTUALLY bad for your teeth?? (reaction) | 21.8 min | 12.6 min | 56% | ~515 s | 23 s |
| Why I became a dentist (story) | 32.4 min | 19.0 min | 60% | 729 s | 6 s |

So the real edit is editorial: which of Ben's sentences stay. Claude makes that call in a content pass, and it is scored against the editor on the pairs in `styles/pairs.json` (`pipeline/style/score-content.mjs`).

## How to run it

1. `node pipeline/edit/transcript-view.mjs --words videos/<slug>/raw/transcript.words.json` → `work/transcript-view.md` (numbered sentences with raw times).
2. Read ALL of it before cutting anything. Know the story first: the hook, the beats, the payoff, the ending.
3. Write `work/content-cuts.json`: `{ "cuts": [ { "from": "S012", "to": "S014", "why": "..." }, { "words": [412, 419], "why": "..." } ] }`. Every cut says why.
4. Build as usual; the cuts get safe edges, a purple CUT marker each, and the render check.
5. Aim for the style's keep ratio (Ben: about 55-60% of the raw talk).

## Rules learned from Ben's editor

Always cut (they agreed with every one of these in the blind test):
- **Production chatter**: recording checks ("we are officially recording"), countdowns before clips ("one, two, ready, go"), "next one", counting clips, section cues read aloud ("now we're talking about the road"), reading from notes, "trim that down", "I think that's good".
- **Earlier takes**: keep only the last clean take of an intro, hook or line; cut rephrased false starts ("they had chairs that were made of hamburgers" → "chairs that look like hamburgers and sofas that look like hot dogs").
- **Abandoned hooks**: especially when Ben says on camera that a line does not work.
- **Searching for a memory** ("what did he say? … I can't remember … oh yeah").
- **Brag asides and redundant restatements** (a third way of saying the same thing).
- **Rejected clips** in reactions ("it's cool, but it's just so long") and the silence while they played.

Also cut, to reach the length (the editor did; the first blind pass missed these):
- **Secondary elaboration**: vivid but non-essential description (the whole hamburger-chairs passage went, 64 s), side comparisons (dental vs medical school, 40 s), process detail that does not move the story (subjective grading, 37 s).
- **Riffs** that repeat a point for fun ("this is where the crazy people go…", 35 s).
- **Product plugs** in the middle of a story (Something Nice, 40 s) unless the video is about it.
- **Both takes** of a list when neither is essential (the mistakes list, 48 s).

Keep:
- The spine of the story: the hook, each beat that changes the situation, the emotional peak, the payoff.
- Emotional, true moments even when rough ("I'm getting a little emotional here").
- Callouts Ben recorded for another place (a mid-video subscribe ask): keep it and flag it for moving (the builder cannot reorder yet).

## Scores so far (blind, 2026-09-28)

| Pair | Our cut | Editor's | Precision | Recall |
|---|---|---|---|---|
| Why I became a dentist | 222 s | 729 s | 0.77 | 0.23 |

Precision is how often the editor agreed with a cut we made; recall is how much of the editor's cutting we matched. The next pass has to tighten harder (secondary elaboration, riffs, plugs) without losing precision.
