# Blind-test control: thebentist

Run 2026-09-27. Both halves of the quiz are Ben's real passages (held-out videos as the "AI" half), 24 items, explainer-weighted, commas stripped, filler words and stutters normalised. Files: `voice/thebentist/blind-control/`.

| Judge | Model | Accuracy | Caught | False alarms |
|---|---|---|---|---|
| A | Sonnet | 38% | 1/12 | 4/12 |
| B | Sonnet | 38% | 1/12 | 4/12 |

**Noise floor: 38%.** A script passes against Ben when each Sonnet judge is under 60%, no paragraph is caught by both, and each judge is within 15 points of 38% (so at or under 53%).

## Calibration against a real script
Same judge setup on the SmileDirectClub script (v24, written in the locked voice before this suite existed) mixed with Ben's real passages: judges A and B both 100%, all 12 script paragraphs caught by both. Reasons it gave, which are the tells to write against:
- bookended callbacks ("That one sentence" ... "it was one sentence")
- a punchy analogy plus short aphoristic sentences ("$6,000 is a used car", "Stopping halfway isn't a pause")
- parallel listing rhythm ("It's the office. It's the staff and the building and honestly it's me.")
- a poetic button line closing a paragraph
- curiosity-gap phrasing with a reveal ("here's what most people don't know" ... "It was in your mouth")
- stacked explanatory fragments after a timeline ("Which means the laws. The nine states.")
- a technical list closed with symmetric wordplay
- compressed, polished summary insight instead of off-the-cuff explanation
What real Ben passages had instead (from the judges' HUMAN reasons): mid-sentence self-corrections, dangling clauses, repeated phrases, reading chat names aloud, meandering hedge-heavy reasoning.
