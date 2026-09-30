# Blind-test control: vsauce

Run 2026-09-27. Both halves of the quiz are Michael Stevens' real passages (Vsauce long-form and @electricpants Shorts; held-out videos as the "AI" half), 24 items, commas kept, filler words and stutters normalised. Transcripts are YouTube captions from the Sep 2026 study. Files: `voice/vsauce/blind-control/`.

| Judge | Model | Accuracy | Caught | False alarms |
|---|---|---|---|---|
| A | Sonnet | 54% | 2/12 | 1/12 |
| B | Sonnet | 42% | 3/12 | 5/12 |

**Noise floor: about 48%** (the judges disagree more here than for other voices; Michael's written-register long-form reads composed even when it's real). A script in this voice passes when each Sonnet judge is under 60%, no paragraph is caught by both, and each judge is within 15 points of its control.
