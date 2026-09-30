# Blind-test control: cleoabram

Run 2026-09-27. Both halves of the quiz are Cleo Abram's real passages (held-out episodes as the "AI" half), 24 items, commas kept, filler words and stutters normalised. Transcripts are YouTube captions from the Sep 2026 study. Files: `voice/cleoabram/blind-control/`.

| Judge | Model | Accuracy | Caught | False alarms |
|---|---|---|---|---|
| A | Sonnet | 42% | 1/12 | 3/12 |
| B | Sonnet | 38% | 1/12 | 4/12 |

**Noise floor: about 40%.** A script in Cleo's voice passes when each Sonnet judge is under 60%, no paragraph is caught by both, and each judge is within 15 points of its control (at or under 55% for A, 53% for B).

Caution from the earlier study (`docs/huge-if-true-writing.md` section 16): Cleo scripts her episodes, so a strong judge (Opus) flags even her own artifact-free paragraphs as AI. Use Sonnet judges as the gate; use Opus only to harvest tells.
