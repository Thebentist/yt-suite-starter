# Retention checklist (score before delivery)

Every full script and every talking-points outline passes this before the voice checks and the blind test. Rules and evidence: `docs/retention-playbook.md` (R numbers). Run `node pipeline/script/retention-check.mjs videos/<slug>/script.md` first: items marked *[code]* take its PASS/WARN, and its timeline supplies the timestamps the other items need. Log the scored table in `review.md` with the line numbers.

**Scoring.** Each item is pass (1) or fail (0), 25 in all. **HARD** items must pass. Deliver only with every HARD item passing and 21 or more of 25. A fix that would break `docs/ben-rules.md` or the measured voice isn't a fix: take the "instead" from the playbook's conflicts table, or leave the item failed and say why.

## Packaging (before the outline)
| # | item | test | rule |
|---|---|---|---|
| 1 | **HARD** Package written first | `packaging.md` has the title, thumbnail brief, one-sentence promise, what the viewer expects, and the last line | R1, R21 |
| 2 | One subject, pain in the title | Title and thumbnail text share no words; 3 thumbnail elements or fewer; at least 2 of pain / solve / proof visible across the pair | R2 |

## Outline
| # | item | test | rule |
|---|---|---|---|
| 3 | **HARD** Shock-scored outline | At least 8 reveal-grade points, each scored (of 100 parents, how many haven't heard it); half or more score 50+ | R3 |
| 4 | Reveals have setups | Every reveal names its setup line; no setup comes after its reveal; no guessable ("equal") reveal left | R4 |
| 5 | Point one is new, two ahas early | Body point one passes the "I knew that" test; two aha facts timestamped before 40% of runtime | R5 |

## Intro (0:00 to about 0:45)
| # | item | test | rule |
|---|---|---|---|
| 6 | **HARD** Click confirmed | *[code]* title-words PASS; the first `[VISUAL]` is the thumbnail's object | R7 |
| 7 | Belief, then reversal | Belief A and reveal B each written in one line, both said by 0:30; B isn't A restated; no "It's not X. It's Y." | R8 |
| 8 | Pathos, then the credential | A human "you" line in the first 20 s; you/your beat I/me/my in the first 30 s; credential as a job by 0:30 (±10%) | R9 |
| 9 | **HARD** Proof by 0:45 | One checkable proof item starts by 0:45, sourced in research-notes.md or Ben-supplied | R10 |
| 10 | Plan beats the title | One loose plan sentence by 0:45 that promises more than the title; no count, ordinal list or "in this video I'm going to" in the first minute | R11 |
| 11 | One long loop | The loop line (timestamp) and its payoff line (after 80%) are both named | R12 |
| 12 | His rhythm in the open | *[code]* questions-60s PASS; voice-check flags no intro paragraph; no three sentences of 6 words or fewer in a row | R13 |

## Body
| # | item | test | rule |
|---|---|---|---|
| 13 | **HARD** Section cadence | *[code]* first-turn (by 1:30) and section-gap (no section over 2:50) PASS | R15 |
| 14 | Nothing dead | *[code]* dead-stretch PASS (no 90 s without a fact marker, question or cue) | R16 |
| 15 | Value loops land on "you" | For every section, the line where it lands on the viewer is quoted | R14 |
| 16 | **HARD** No dropped baton | In the seam column every seam carries a live question, complication or stake, including the seam right after the title is answered | R17, R18 |
| 17 | **HARD** Pivots are his | *[code]* pivots PASS (no formula he never says, none 3+ times); zero objection formulas ("you might be thinking", "that's a fair question") | R17 |
| 18 | A fair head fake | At least one head fake with the prediction it breaks and the earlier line that makes it fair | R19 |
| 19 | But or so between beats | *[code]* seams PASS; the connective column between beats has no "and then" | R6 |
| 20 | Fix before fear | First fix line timestamped before the fear peak | R20 |

## Ending
| # | item | test | rule |
|---|---|---|---|
| 21 | **HARD** Ends on the answer | Last line matches packaging.md; the close is a loose answer, one real question, his formula; *[code]* no-recap PASS; no stacked asks, no quotable directive | R21 |
| 22 | Keeps paying | *[code]* last-fact at 85%+; one over-deliver item named in the last 20% | R22 |
| 23 | **HARD** No mid-roll ask, no phantom | No ask before the close; every forward reference is a published video (title and id) or text in the same file | R23 |

## Alignment and guards
| # | item | test | rule |
|---|---|---|---|
| 24 | Package delivered | A cluster word in the title and sentence 1; every part of the promise sentence mapped to a timestamp; *[code]* length PASS | R24, R27 |
| 25 | **HARD** Retention fixes broke nothing | After the fixes: voice-check (`--type`) and ai-tells rerun with no new miss or hard fail; every new first-person line is in the sign-off table; nothing invented (BR 2) | conflicts |

## Score line for review.md
`Retention: NN/25, HARD fails: none | #n, #n · retention-check: N PASS, N WARN · runtime m:ss at 140 script wpm (+ react open s)`
(Runtime at 140 script words per finished minute since 2026-09-28, learned from the bad-breath read; 236 was his talking pace. See `docs/retention-playbook.md` Tools.)
