# Retention playbook: TheBentist long-form

How the scriptwriter holds a viewer from 0:00 to the sign-off in a 10 to 14 minute talking-head explainer or reaction. Built 2026-09-28 from three study notes on Kallaway's method (37 of his videos), checked against Ben's rules, the measured voice and four blind-test rounds.

**Precedence.** `docs/ben-rules.md`, then `docs/style-prompts/bentist-measured.md` and the blind-test lessons, then this page, then Kallaway. If a retention move needs a tell or an invention, use the conflicts table at the end.

**Tools.** `node pipeline/script/retention-check.mjs <script.md> [--wpm N] [--title "<title>"]` prints the timeline and runs every test marked *[code]*. `docs/retention-checklist.md` scores the rest. Timestamps = script words at **140 per finished minute**, ±15%. That's `channels/thebentist.json` `script_wpm`, the tool's default. *Learned from the bad-breath read, 2026-09-28:* the old 236 wpm is his talking pace, not how fast a script plays. He says 1.34 words per script word and reads at 188 wpm after silence cuts, so a 2,543-word script timed at 10:47 ran 18:09. The tool doesn't model a react open or clips: add their seconds by hand. With a react cold open, the intro clock for R7-R11 starts at the bridge line after the clip, and the first proof should come within about 100 script words of it. Evidence: `videos/bad-breath-for-good/take/read-lessons.md`.

**Evidence key.** H, S, P = `research/strategy/kallaway-notes-{hooks,story,psych}.md` with the rule id and the notes' short video id. *Measured* = counted (his numbers, his transcripts, or "Ben": counted here from Ben's 80 transcripts); *self-reported* = his claim about one video; *opinion* = asserted without data, which is most of Kallaway. BR n = ben-rules item; bible §n = `docs/huge-if-true-writing.md`; voice = bentist-measured.md; blind rounds = `videos/wisdom-teeth-not-shifting/review.md`.

**Top 10:** R3, R7, R10, R12, R15, R16, R17, R18, R21, R22.

## 1. Packaging first

**R1. Write the package before the outline.**
How: `packaging.md` holds the title, the thumbnail brief, the one-sentence promise, what the viewer expects after the click, and the last line.
Evidence: H1, S2 (7I50), opinion; Iqy, his team's practice.
Test: all five fields exist before the first draft.

**R2. One subject and one pain or desire, readable in a second.**
How: the title names the subject and the pain in the viewer's words; the thumbnail text adds to it and never repeats it; three elements at most; the face shows what the viewer will feel.
Evidence: H15, H16 (Iqy, jZCu), opinion; Iqy's re-thumbnail went from 1,700 to 1.2M views, measured but confounded by a channel move; P-E1 (YD2v), opinion.
Test: the title and the thumbnail text share no words; three elements or fewer; at least two of pain, solve and proof are visible across the pair.

## 2. Outline: the high-shock points

**R3. Don't write a line until the outline says something new.**
How: list every fact the video could carry and shock-score it: of 100 parents, how many haven't heard this? 10 to 14 minutes needs 8 to 10 reveal-grade points; if under half score 50+, research more or drop the idea. Shock isn't numbers: the camera still gets about six (BR 5).
Evidence: S1 (_Z11, 7I50), opinion; one max-shock fact, "40 million views in five days" (_Z11), self-reported; S4, "eight to 10" loops (SDHKQ), opinion; H17.
Test: the outline table has at least 8 scored points, and half or more score 50+.

**R4. Write the reveals first, then the least context each one needs.**
How: a loop is a setup the viewer can predict from, then a reveal that beats the prediction. A guessable reveal is "equal": rework or cut it. No loop needs context from a later one.
Evidence: S4 (SDHKQ), opinion.
Test: every reveal names its setup line, and no setup comes after its reveal.

**R5. Make body point one new, and let the value climb.**
How: the first point after the intro must beat what a casual viewer knows; then novelty rises, with the head fake last in the proof run. Don't save the best: second-best-first is one video's opinion (7I50), and his later videos push value early (W--, p4W23V).
Evidence: S6, H13 (7I50, 96HQ), opinion; S17 double aha (W--), opinion.
Test: read point one to someone who knows teeth casually ("I knew that" means swap it). Two aha facts land before 40% of runtime.

**R6. Join beats with but or so, never "and then". One trip, two images.**
How: read the connectives between outline beats as a column: but, so, but, so. "And then" between beats makes a list. Inside an explanation it's Ben's real chain, and it stays (BR 8).
Evidence: S10 (t5Z, pcnrz), opinion; his "but" rate, 3.8 to 9.5 per 1,000 words, measured; bible §19-20.
Test: the column has no "and then". *[code]* No section opens on "and then".

## 3. Intro (0:00 to about 0:45)

**R7. Confirm the click in sentence one.**
How: the title's key words go in sentence one ("So your wisdom teeth are not what's shifting your teeth"), the thumbnail's object on screen at 0:00. Delete every line before the subject.
Evidence: H2 (jZCu, 7I50), opinion; H4, "avoid throat-clearing openers" held in 3 of 4 channels (a7Vj), measured, small n; P-E2; bible §10; BR 7.
Test: *[code]* title-words PASS. The first `[VISUAL]` names the thumbnail object.

**R8. Common belief, then the contrarian take, inside 30 seconds.**
How: say what people think in the viewer's world ("somebody, maybe your dentist, maybe your mom, tells you it's your wisdom teeth"), then Ben's reversal with his hedge ("more than likely it is not"). In a reaction, the belief is the clip's claim.
Evidence: H5 (LmXp, 7I50), S2, P-B4, opinion.
Test: write belief A and reveal B in one line each, and B isn't A restated. No "It's not X. It's Y." frame, which is a voice tell.

**R9. Pathos first, then the credential as a job.**
How: the sharpest human line comes in the first 20 seconds, said to "you". Then "I'm an orthodontist, I move teeth all day". The relatable character is the viewer or a documented group, never an invented patient.
Evidence: BR 7; H7, P-B2, opinion; his own credential lands at 0:16-0:48 in 13 of 13 videos, measured (S).
Test: "you/your" outnumber "I/me/my" in the first 30 s, and the credential starts by 0:30 (±10%).

**R10. Put one checkable proof item in the lock-in zone, by 0:45.**
How: the sentences after the hook are a trust trial. Give one thing a viewer could check (a study result said loosely, a documented number, a line Ben has said on camera), hedged where the evidence is. Ben does it with "because" ("And it does matter because one in five Americans over 75 years old have lost all of their teeth", `NGOf5DmEFvA#1`).
Evidence: H9 (pNIY, 96HQ), opinion; P-B3 (g_6T), opinion; bible §10 (first real fact by 0:45, from the MrBeast memo and Galloway).
Test: the proof line starts by 0:45 and is sourced in research-notes.md or supplied by Ben.

**R11. Plan in one loose sentence that promises more than the title.**
How: say what we'll figure out, in his words ("So today we're going to figure out what's actually moving them"). It beats the expectation: the title says what it isn't, the plan says you'll learn what it is. No counted roadmap, no "in this video I'm going to".
Evidence: H2, expectations vs reality (7I50), opinion; his plan lands by 0:40 in 11 of 13 videos, measured (S); voice: roadmaps are a tell.
Test: one plan sentence by 0:45, and no count or ordinal list in the first minute.

**R12. Open one long loop that only the last 20% closes.**
How: a question or promise the body can't settle early ("I'm not saying never get your wisdom teeth out, we'll get to that"). Mini loops close along the way; this one waits.
Evidence: P-B6, create a hunt (g_6T), opinion; H14; bible §10, close every loop you open.
Test: name the loop line and its payoff line. The payoff starts after 80% of runtime.

**R13. Open in his rhythm, not staccato, with a question he answers.**
How: clarity comes from sixth-grade words and one subject, not from chopped sentences. State the title claim. If there's a question, it's one he answers in the next breath.
Evidence: H11, staccato (pNIY, 0f6), opinion, yet his own sentence-length SD is 8 to 11 words, measured (S11). Ben's explainers ask 2 to 4 questions in the first 60 s in 3 of 4, measured (Ben). Statements beat hedged questions (H contradiction 3, a7Vj), measured, small n.
Test: *[code]* 1 to 4 questions in the first 60 s. Voice-check flags no intro paragraph, and there are never three sentences of 6 words or fewer in a row.

## 4. Body

**R14. Run each section as a value loop that lands on "you".**
How: what it is (plainly), how it works (his one image or "kind of like", then "what we call"), why it matters (the consequence lands on "you", or on what to ask your orthodontist).
Evidence: S5 (7I50, 9K1b6), opinion; voice, "Explain" moves (measured from 80 videos).
Test: for each section, quote the line where it lands on the viewer.

**R15. Turn a section every 1.5 to 3 minutes, with the first turn by 1:30.**
How: a section is one loop or one question. Split anything that runs past 2:50.
Evidence: S16: his advice runs from 60-90 s (pcnrz) to 2-5 min (wgX), opinion, but his own section turns come every 95 to 170 s in 10 of 13 videos, measured; bible §10.
Test: *[code]* first-turn and section-gap PASS.

**R16. Put something new in every 90 seconds.**
How: a new fact, a number with a comparison, a visual change, a named study or Ben's reaction. Troughs are where he explains, not where nothing happens. Score beats 0 to 100: open near 70, a peak over 85 before 2:00, never five minutes without a peak.
Evidence: S3, the modern story arc (wgX), opinion; bible §10, no dull moments.
Test: *[code]* dead-stretch PASS, and the beat scores fit the arc.

**R17. Rehook at every seam with content, in Ben's pivots.**
How: where one loop closes, open the next in the same breath: a complication, a stake, or the question the viewer now has. It's a fact or a real question, not a formula. A pivot phrase must be one he says, used once:
- *and guess what* (28 uses in 17 of 80 videos), *the crazy part is* (17 in 14), *what if I told you* (9 in 8, mostly mid-video), *fun fact* (53 in 26), *in fact* (50 in 27), *the problem is* (20 in 11), *like I said* (23 in 18), *first off*, *either way*, *that being said*, *anyways*, and his ask-and-answer: "So what do you got to do? You got to close it up." (`DY7ZtvZBgCw`), "They drink milk, right? ... Well, some mothers..." (`q8regjBdFxo#3`).
- Never: *here's the thing*, *but here's the crazy part / the problem*, *but wait*, *you might be thinking / wondering*, *and it gets worse*, *stick around* (0 in 80 videos).

Evidence: S7 (KyC8r, pcnrz), opinion, named in 8 of 13 videos; phrase counts measured (Ben); blind rounds 1 and 3 caught rhetorical turn questions, objection formulas and outline transitions.
Test: read the seam column (*[code]* prints it). Every seam carries a live question, complication or stake. *[code]* pivots PASS.

**R18. Re-open the video at the seam where the title gets answered.**
How: a myth-bust settles the title mid-video, the biggest exit. In the next breath, hand over the bigger question (then what is it, what do I do?) and start answering. His move is ask-and-answer, not a tease left hanging.
Evidence: S7, seams are danger zones (KyC8r), opinion; P-B6, keep the long loop open; wisdom-teeth audit, the 4:28 seam.
Test: find where the title is answered. One of the next two sentences opens the next question.

**R19. Run the addiction loop: stakes, a big question, a head fake.**
How: stakes are the viewer's mouth, money or time; urgency only when something really changed. The big question is specific enough to predict. The head fake breaks the prediction but is obviously true once heard (the lying-down study). The villain is a practice or a myth, never a person.
Evidence: S8 (KyC8r), S9 (jtmst), opinion and pop neuroscience (a checklist, never said on camera); S13 (LvuoNl).
Test: for each head fake, name the prediction it breaks and the earlier line that makes it fair.

**R20. Show the fear, but tease the fix before its peak.**
How: when the video raises a worry (relapse numbers, damage), hint at the fix before the scariest number, or anxious viewers leave.
Evidence: P-B8 (IywT), opinion.
Test: timestamp the first fix line and the fear peak. The fix comes first.

## 5. Ending

**R21. Write the last line first, and end on the answer, not a summary.**
How: the last line goes in packaging.md before drafting. The close answers the title loosely, asks the comments a real question, then runs his formula ("If you enjoyed it, you know what to do. I'll see you in the next one."). No list read back, no stacked asks, no slogan.
Evidence: S18, the last dab (t5Z), opinion. His list recap (7 of 13 videos, measured) is rejected: blind round 3 caught a stacked outro and a quotable directive. Voice: 39 of 43 long videos end on "see you".
Test: the last line is in packaging.md. *[code]* no-recap PASS. The close has one answer, one question and the formula.

**R22. Keep paying until the last 15%.**
How: the long loop from the intro pays in the last 20%, and one thing the title didn't promise lands there too (the "unexpected surprise": the impacted tooth left in because of the nerve).
Evidence: P-B9 (g_6T), opinion; bible §10.
Test: *[code]* last-fact at 85% or later, and you can name the over-deliver item.

**R23. One ask, at the end. Anything else is a pointer to a real video.**
How: no mid-roll subscribe or like. Point to another Ben video only where it solves the viewer's problem, and only if it's published.
Evidence: S19, native embeds (7I50), opinion; P-E3, hard CTAs "nuke your share rate" (V6), opinion; BR 9.
Test: no ask before the close. Every forward reference names a published video or text in the same file.

## 6. Idea selection and packaging-content alignment

**R24. Keep the channel promise and say its words.**
How: every idea passes the avatar filter (an orthodontist on teeth), and the title and sentence 1 carry a cluster word (teeth, braces, retainer, orthodontist, dentist).
Evidence: P-A2 (tVZO), opinion. Measured on Ben (`research/thebentist/own-longform.tsv`): his lows name no topic ("I genuinely Cannot Explain This.." 3.9K), his 2-10M hits say TikTok, braces or orthodontist.
Test: a cluster word appears in the title and in sentence 1.

**R25. Pick a mass topic seen through Ben's lens, and one game.**
How: a common topic with a unique lens (an orthodontist's read), or an uncommon topic with a normal lens, never uncommon plus uncommon. Ask "can the viewer use this right now?" to pick education or entertainment, then build for that.
Evidence: P-C3 (ECQB), opinion; P-C4 (cAEY), opinion; S13, story lens.
Test: the pitch places the idea in the 2x2 and answers the use-it-now question.

**R26. Remix proven long-form outliers, don't clone them.**
How: start from a long-form outlier (the swipe method: 3x its creator's median, 90 days), keep the proven parts (topic, structure, visual), swap in Ben's angle, and name what you kept and swapped. Cross-niche clones fail; formats don't transfer from Shorts.
Evidence: P-C2 (pirn), opinion; H17 (pNIY, a7Vj), measured, small n; the CLAUDE.md swipe rules.
Test: the pitch names the source outlier and lists the held and swapped parts.

**R27. Deliver exactly what the package promised, early, then more.**
How: the thumbnail's subject is on screen and named within 5 s, the first partial payoff lands before 0:60, every loop the package opens is closed out loud, and nothing is asked before the payoff.
Evidence: H10 (onQo, xnOe), anecdote: an aligned video at 15M vs a misaligned one under 100K. P-E2, P-E3, opinion; bible §10 (the 30-second cliff).
Test: map each part of the promise sentence to a timestamp in the retention-check timeline.

## Conflicts: where Ben's rules and voice win
| Kallaway says | House rule | Do this instead |
|---|---|---|
| Recap the list at the end (7I50; 7 of 13 of his videos, measured) | Recaps and tidy summaries are a blind-test tell (voice, round 3) | Answer the title in one loose line, then his close |
| Staccato opening (0f6, LmXp) | Rhythm per video type; stacked fragments get caught (voice) | Plain words and one subject, joined with and, so, because |
| Proof for "someone like the viewer"; his demo invents a patient (LvuoNl) | Nothing invented about Ben (BR 2) | A study said loosely, the documented group, Ben's answers (`docs/ben-clinical-notes.md`), a signed-off hypothetical ("if you came in and said...") |
| Rehook lines ("that point was important but...", "but here's the problem") | Placed rehooks and outline transitions read "too orderly" (rounds 1, 3) | A new fact, or his ask-and-answer; pivots only from his bank (R17) |
| The plan as an ordered list (7I50) | No signposting or roadmaps (voice) | One loose sentence of what we'll figure out (R11) |
| Thought narration: say the objection aloud (pcnrz) | "You might be thinking" and "that's a fair question" got caught (round 3) | Say the belief as the thing: "Now the whole idea is that they're pushing, right?" |
| Cut every hedge, use embedded truths ("when you", pcnrz) | Hedges are his voice and clinical honesty | Keep *probably* and *might* where the evidence has them |
| Term branding (pcnrz) | No coined shorthand (BR 8) | His "what we call" names, glossed in the same sentence |
| A pitch mid-video (his own land at about 50%, measured) | No lead magnet, no phantom promises (BR 9) | No mid-roll ask; point only to a published video |
| Rehook every 20-25 s (cAEY) or 60-90 s (pcnrz; youtube-playbook §2.5) | Ben's pivots are irregular: longest gap between pivot phrases in his explainers 2:44 to 5:15, measured (Ben) | Sections of 2:50 or less (R15), something new every 90 s (R16), no rehook line on a timer |
| The last line as a shareable slogan (t5Z) | Round 3 caught the quotable directive | The share line is a fact somewhere in the last 90 s; the last line is his formula |

## Short-form only (don't carry these into long-form)
The 20-25 s rehook interval (P-B6); freeze points, visual pacifiers and the magician's "check this out" (H, what doesn't transfer); caption hooks and 3-second on-screen text; the 3% share-rate threshold and 200-viewer sample as script targets (P-A1, P-A3); a color-and-motion burst in the first 1-2 s (long-form gives that job to the thumbnail and first frame, R7); "raise your energy 50%, record line by line" (P-B7, delivery; Ben records loosely); lead-generation desire hooks (8Vol).
