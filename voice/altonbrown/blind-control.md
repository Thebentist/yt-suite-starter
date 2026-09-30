# Blind-test control: altonbrown

Run 2026-09-27. Both halves of the quiz are Alton Brown's real passages from official Food Network Good Eats segments (held-out segments as the "AI" half), 24 items, commas kept, filler words and stutters normalised. Transcripts are local whisper (small.en). Files: `voice/altonbrown/blind-control/`.

| Judge | Model | Accuracy | Caught | False alarms |
|---|---|---|---|---|
| A | Sonnet | 38% | 1/12 | 4/12 |
| B | Sonnet | 54% | 6/12 | 5/12 |

**Noise floor: about 46%.** Judges leaned on live-cooking texture (real-time coaching asides, a second person interrupting, whisper mishearings) to call passages human; tidy, uniformly explanatory passages read as AI. A script in this voice passes when each Sonnet judge is under 60%, no paragraph is caught by both, and each judge is within 15 points of its control.
