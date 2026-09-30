# Review: bad-breath-for-good (round 1 below; round 2, the current script, at the end)

Ben pasted a brief someone else wrote (`brief-original.md`) and asked to "convert it to my Cleo Abram x Bentist voice script". Brief to this agent: `structure:cleoabram voice:thebentist host:thebentist`, type explainer, full script. No source outlier (the source is the brief), so no `source-transcript.mjs` run; `beat-map.md` maps the brief's sections to ours, and the Cleo beat → our beat → % table is at the top of `script.md`.

## Files
- `packaging.md`: title (the brief's) + 2 alternates, thumbnail brief (the routine card proposed as test variant B, not the lead), promise, expectations, last line, chapters.
- `research-notes.md`: 9 clinician questions at the top, the six on-camera numbers, 23 sourced fact rows, a "don't say" list.
- `beat-map.md`: ABT line, 20 shock-scored points, head fake, loops, brief section → our section (kept / changed and why), the connective column.
- `script.md`: `type: explainer`; sign-off tables ([BEN:] placeholders, first-person lines); the Cleo beat map; `## Script`; three written Shorts; description and pinned comment drafts.
- `script-read.html` / `script-read.txt`: Ben's reading copy (`node pipeline/script/read-copy.mjs`): spoken lines only, demos and cues behind toggles, callouts shown as labelled blocks.
- `retention-check.txt`, `voice-check.txt`, `ai-tells.txt`: the final check outputs.
- `blind/`: the quiz (seed 51, 32 items). Judges not run here.

## Voice evidence read
`docs/ben-rules.md`, `docs/ben-clinical-notes.md`, `docs/style-prompts/bentist-measured.md` (all of it, including the wisdom-teeth rounds 1-3, the kids-dental exposé lesson and the borrowed-structure lesson), `voice/thebentist/voice-guide.md`, `exemplars.md`, `blind-control.md` (noise floor 38%). Full explainer transcripts: `NGOf5DmEFvA` (regrow teeth, his most scripted explainer), `q8regjBdFxo` (soda, first half), plus the bad-breath and tonsil-stone stretches of `RVXQmWSSfAo` (Q&A: "How do I get rid of bad breath permanently? Well, it depends"), `xIa4b50z9vQ`, `p_rJ_7w4ME0`, `irSK2gbcOm4`, `s4NUrJIh_bc`. Structure: `docs/huge-if-true-writing.md` in full, `voice/cleoabram/voice-guide.md`, `docs/retention-playbook.md`, `docs/retention-checklist.md`, `docs/youtube-playbook.md` §2-3, and `videos/kids-dental-chain-shut-down/script-cleo.md` + its review (the last Cleo-in-Ben build and what its judges caught).

### Five rhythm models (real sentences)
1. "So if you can get rid of the bacteria that causes volatile sulfur compounds, that's more morning breath and halitosis." (`RVXQmWSSfAo`, line 63): naming the term inside a plain run-on.
2. "a tonsil stone is basically food and gunk that's getting up into these little tonsil crips and then every time you swallow the tonsils compress..." (`p_rJ_7w4ME0`, line 29): the *and then* chain.
3. "It eats it, and then it poops out acid onto your teeth" (`_Y8IIXbfGA0`): the source of "they basically poop out these gases".
4. "I mean, that's actually why we created the first ever water flosser that has the dual motor mode... a regular water flosser... is gonna be really painful because they're not meant for that" (`irSK2gbcOm4`, line 77): his own problem → why others fail → what we did, the model for every product frame.
5. "So I don't know, would you trust a drug to regrow your teeth?... I don't know, let me know down in the comments below." (`NGOf5DmEFvA`, close): the close.

### Passages modelled, per beat (`passages.mjs query --channel thebentist --type explainer ...` plus direct greps, because the explainer bank is small: 4 videos)
| beat | passages |
|---|---|
| Open | `NGOf5DmEFvA#0` (question-led open), `NGOf5DmEFvA#1` ("Now first off... because one in five Americans"), credential as a job (`AN4K7xY__BQ`, via voice-guide) |
| Why you can't smell your own breath | `RVXQmWSSfAo` lines 61-65 (answering the bad-breath question), `q8regjBdFxo#18` ("Now a lot of questions people ask me is like... No, not really"), `iSbVvOJt4W4#7` |
| Where bad breath comes from | `_Y8IIXbfGA0` (eat → poop out), `p_rJ_7w4ME0` exemplar ("food and gunk down there, you don't clean it very well"), `XVgjWz0yLFk` ("the back posterior third of your tongue"), `Tr2K_faDjR8#15` ("That is what we call...") |
| Between teeth, dry mouth, tonsils | `s4NUrJIh_bc` line 19 (braces "stank breath... food and gunk is just sitting"), `RVXQmWSSfAo` lines 63-69 (crypts, floss for gum disease), `xIa4b50z9vQ` lines 105-107 ("smells different... if you've ever squished one") |
| Is it your stomach? | `xIa4b50z9vQ` line 117 (diabetes "smells sweet... It's pretty weird"), "to be fair" (`ZfzPdvD-sj0`, `LaG-mXDFucs`), specialist hand-off (`XVgjWz0yLFk#44`) |
| Why mints and mouthwash didn't work | `_Y8IIXbfGA0` (sugar feeds S. mutans), `NGOf5DmEFvA#16-17` ("even my company, Something Nice"), `s4NUrJIh_bc` (mouthwash clumps "when in reality") |
| The fix: tongue, floss, dry mouth | `RVXQmWSSfAo` line 67-69 ("Do I really need to floss? And the answer is yes"), `GFqZ9Ej2xKo` ("So make sure you floss. It's really important."), `iSbVvOJt4W4` exemplar ("You still want to get those bacteria down by brushing and flossing daily") |
| Tonsil stones | `irSK2gbcOm4` lines 77-85, `xIa4b50z9vQ` lines 111-115, `p_rJ_7w4ME0` line 33 |
| Routine / when it isn't your mouth / close | `NGOf5DmEFvA` close ("You still need to brush your teeth. You still need to floss."), `s4NUrJIh_bc` formula |
| Callouts | `AN4K7xY__BQ` line 69 (bracket, verbatim), `9JjBrR_e_GU` line 8 (subscribe, near-verbatim) |

## Retention (first, before the voice checks)
`node pipeline/script/retention-check.mjs videos/bad-breath-for-good/script.md --title "How to Get Rid of Bad Breath For Good" --minutes 8-12` (8-12 is the brief's range): **10 PASS, 0 WARN**. 2,665 spoken words = 11:18 at 236 wpm, plus the 10-second wrist-test pause (11:28). Sections: Open 0:00, Why you can't smell 1:00, Where it comes from 2:24, Between teeth/dry mouth/tonsils 3:24, Stomach 4:48, Mints and mouthwash 5:36, Tongue fix 6:59, Floss and dry mouth 7:58, Tonsil stones 8:28, Routine 9:39, When it isn't your mouth 10:33. Longest section 1:23 (every section is under the brief's 90 s). Dead stretch max 0:53. Last fact marker 91%. The fix starts at 6:59 spoken (7:09 with the pause), after the brief's 6:00 line.

| # | item | result | evidence (time) |
|---|---|---|---|
| 1 | HARD Package first | 1 | packaging.md: title, thumbnail, promise, expectations, last line |
| 2 | One subject, pain | 1 | title vs thumbnail A text "NOT YOUR STOMACH": no shared words; 3 elements; pain (bad breath) + solve (get rid of) + proof (the orthodontist) |
| 3 | HARD Shock-scored outline | 1 | beat-map.md: 20 points, 16 at 50+ |
| 4 | Reveals have setups | 1 | beat-map.md setup column; no setup after its reveal |
| 5 | Point one new, two ahas early | 1 | less than half right (1:30) and "the tip is the cleanest part" (1:52), both before 40% (4:31) |
| 6 | HARD Click confirmed | 1 | title-words PASS by 0:13 (bible's target is 0:10: 3 s over); first `[VISUAL]` includes the thumbnail's circled tongue |
| 7 | Belief, then reversal | 1 (just) | belief "most people figure it's their stomach or something they ate, or they're just unlucky" 0:28; reversal "more than likely it is coming from your mouth" 0:32 (inside the ±10% band); no "It's not X. It's Y." |
| 8 | Pathos, then the credential | 1 | the lean-back to "you" at 0:00; first 30 s you/your 8 vs I/me/my 6 (3 of them the viewer's own "do I have..."); credential 0:23 |
| 9 | HARD Proof by 0:45 | 1 | "like 8 or 9 out of 10 times" 0:32 (research-notes row 2) |
| 10 | Plan beats the title | 1 | "today I want to figure out if you actually even have it, because plenty of people who think they do, don't. And then where it's really coming from." 0:46 (±10%); promises the check and the source, not only the fix; no count |
| 11 | One long loop | 1 | "would anybody even tell you?" 0:13 → "just ask somebody you trust... they're probably not gonna bring it up on their own" 11:02 (97%) |
| 12 | His rhythm in the open | 1 | questions-60s PASS (3); voice-check flags no open paragraph; never three ≤6-word sentences in a row |
| 13 | HARD Section cadence | 1 | first turn 1:00; longest section 1:23 |
| 14 | Nothing dead | 1 | dead stretch 0:53 |
| 15 | Value loops land on "you" | 1 | Open: "So if you've got it, you're definitely not alone" · Smell: "that's more than likely what people are getting when you talk to them" · Source: "If you stick your tongue out in the mirror... that's usually where it's coming from" · Teeth/dry/tonsils: "if you've got bad breath that just won't go away... a sign of gum disease" · Stomach: "no amount of scraping is going to fix it" · Mints: "I really don't think it's that you're dirty or you weren't trying" · Tongue: "pick whichever one you'll actually do every day" · Floss/dry: "talk to whoever prescribed it" · Tonsils: "if it hurts or it bleeds, stop" · Routine: "you'd notice a difference in like a week or two" · End: "they're probably not gonna bring it up on their own" |
| 16 | HARD No dropped baton | 1 | 1:00 "the reason you can't smell it" (stake) · 2:24 "why is the back of your tongue so bad?" (question) · 3:24 "the tongue's not the only spot" (complication) · 4:48 "isn't bad breath coming from my stomach?" (question) · 5:36 "you've probably tried mints" (stake, after "no amount of scraping is going to fix it") · 6:59 "how do you actually get rid of it?" (the title's question) · 7:58 "get in between your teeth too" (complication) · 8:28 tonsil stones (the promised check, loop close) · 9:39 "what does for good even mean?" (the next question right after the title is answered, R18) · 10:33 "if... nothing's changed" (complication) |
| 17 | HARD Pivots are his | 1 | pivots PASS ("in fact", "first off", "anyways" once each); no "you might be thinking" / "that's a fair question"; the stomach objection is said as the belief ("Now the one everybody brings up is the stomach, right?"), the conflicts table's instead |
| 18 | A fair head fake | 1 | "I passed the wrist test, I'm fine" (1:33) breaks at 1:52 (the tip is the cleanest part); "I'm worried, so I have it" breaks at 2:10; both fair because of 0:15 ("you're pretty bad at smelling your own breath") |
| 19 | But or so between beats | 1 | seams PASS; column: so, but, so, but, but, so, so, and-you-gotta (inside the fix list), okay so, so, but; no "and then" between beats |
| 20 | Fix before fear | 1 | "it's usually pretty fixable" 0:44, before gum disease (3:42) and the medical causes (4:53) |
| 21 | HARD Ends on the answer | 1 | last line = packaging.md; loose answer (two weeks, dentist then doctor; ask somebody), one real question, his formula; no-recap PASS; one ask |
| 22 | Keeps paying | 1 | last fact 91%; over-deliver: "what does for good even mean" (85%) and the dentist-first-then-doctor order (93%) |
| 23 | HARD No mid-roll ask, no phantom | **0** | **Fails by the brief's own request:** the bracket callout (2:18) and the subscribe callout (6:53) are mid-roll asks, filmed as standalone takes because Ben's brief asks for them there (and the bracket bit runs mid-roll in 12 of his videos). No phantom: "we'll come back to how to check for them" pays at 8:28; no next video named. To pass R23, the editor drops both takes after the close instead |
| 24 | Package delivered | 1 | "teeth" in sentence 1; the title names bad breath (an oral-health term, not on R24's literal list: the alternate "(Dentist Explains)" in packaging.md adds a list word if Ben wants it); promise mapped: the check 1:33, the source 2:24-5:36, the routine 6:59-10:33, when it isn't your mouth 10:33; length PASS |
| 25 | HARD Fixes broke nothing | 1 | voice-check (`--type explainer`) and ai-tells rerun after every fix, no new miss; every first-person line in the sign-off table; nothing invented |

`Retention: 24/25, HARD fails: #23 (mid-roll callouts kept at Ben's brief's request) · retention-check: 10 PASS, 0 WARN · runtime 11:18 at 236 wpm (+10 s wrist-test pause)`

## Voice checks (after retention)
- **voice-check** (`--channel thebentist --type explainer`): **94/100, every rhythm row passing**: 13.5 words/sentence (his 12.6), fragments 9.6% (16.3 ±8.2), 25+ 12.1% (10.6), questions 5.1%, you/your 51, I/me/my 13.1 (21.3 ±8.5, low end), contractions 83.4%, cadence distance 0.112 (≤0.12), long→short 0.132, spread 0.589. No paragraph to reread; no heavy signature phrase. History: 56 (first draft: 20 words a sentence, 35% run-ons, 95% contractions) → 71 → 81 → 86 → 94, with dips to 85 when glosses lengthened sentences. The fixes were splits at his own joints, his short verdicts and hedges ("Everybody is.", "Which is crazy.", "I don't know.", "We call that gum disease.", "So yeah."), "going to"/"it is"/"that is"/"do not" where he uncontracts, and fewer "kind of" (9.9 → 3.4 per 1k) and "and stuff" (5 → 2). No fake disfluency.
- **ai-tells** (`--allow-fragments`): **PASS**. Negation reframes 3 (1.1/1k; the reframe itself plus two products' "it's not going to..." lines, which the brief requires); ≤2-word fragments 7 (2.6/1k); paragraphs ending on ≤3 words 4 of 41; pointers 0; parallel stacks 0; double sincerity 0; hedges and self-corrections 8.1/1k.
- **Trademark check** (spoken lines + Shorts): "huge if true", "hang on", "ready?", "let's go", "turns out", "see you for the next one", "optimistic", "we as humans", "oh my god", "here's what/how/the", "which means", "in other words", "time to go deeper", "let me show you", "back to the story", "around the world", "on the surface", "we're going to", "imagine": **0 each**. Her moves are in his words ("So first off", "to be fair", "I don't know", "So what does for good even mean?").
- **Last sentence of every paragraph, as a column:** buttons only where meant: "It's kind of like your house... yours doesn't" (the comparison), "Somebody's gotta do it, I guess." and "Which, I'm not gonna lie, that's pretty gross." (reactions), "a toothbrush is made for teeth" (the one earned aphorism, the reframe), "So for good really just means it's part of your routine..." (the definitional turn). 5 of 41, under one in three. The rest end on a fact, an instruction, a hedge or "So yeah."/"Anyways."
- **Physical-action audit:** talking head and animation only. The wrist test is the viewer's action (on-screen counter). Ben's own wrist test, tongue scraping and the water-flosser setting are three `[OPTIONAL DEMO — Ben's call: ...]` blocks; every one of those beats works without them.
- **Magic School Bus:** one trip (tip of the tongue → back → tonsils → stomach), two images (shag carpet, rotten eggs), six stats (1 in 3, 8 or 9 of 10, less than half, 2,000, 7 years, 1 in 4) plus instructions (10 s, two minutes, a week or two, 6 months). Medical words said and glossed in the same sentence: volatile sulfur compounds ("these gases"), crypts ("little holes"), plus plain names (coated tongue, gum disease, ENT glossed as ear, nose and throat).

## First-person lines
In `script.md` → "Sign-off before recording" (two tables: the [BEN:] placeholders, and every I/me/my/we line with a verdict). Nothing about Ben's own breath, routine, patients or history is claimed.

## Retention map (236 wpm, ±10%)
Hook 0:00-0:13 (the lean-back; title words by 0:13). Thumbnail A: the circled tongue is in the first visual (0:00) and its words ("not your stomach") are answered at 0:28-0:32, later than the bible's 0:15. Loops: "would anybody even tell you?" (0:13 → 11:02), the tonsil check (4:44 → 8:28), "no amount of scraping is going to fix it" (5:32 → 10:33). A new question or complication at every seam, the longest gap 1:23. Payoff: the fix from 62%, the long loop at 97%. Ends on a high note: common, fixable in a week or two, and one thing to do.

## Structural self-check (`docs/huge-if-true-writing.md` §5, structure rows; 1-5 each)
| row | score | note |
|---|---|---|
| 1 Physical cold open | 4 | present tense, first sentence, a moment the viewer is in; narrated, not held |
| 2 Scale in the first 30 s | 3 | the impossible fact and its household comparison share a breath ("kind of like your house"), but the numbers that follow (8 or 9 of 10, 1 in 3) have no comparison |
| 3 Question stack | 3 | three questions in one breath (have it? get rid of it for good? would anybody tell you?), not her naive → frontier shape; his delivery on purpose (kids-dental lesson) |
| 4 Receipts | 1 | **miss by design**: no montage; the wrist test is the viewer's own receipt |
| 5 Personal admission | 1 | **miss**: none, because Ben hasn't supplied one (bible §12) |
| 6 Vehicle | 4 | the trip across the tongue with "keep going back"; the stomach at the bottom |
| 7 Dumb question | 3 | "why is the back of your tongue so bad?" and "isn't bad breath coming from my stomach?" asked aloud; answered by Ben and the sources, not a named expert |
| 8 Wonder spike | 3 | "the number one cause by a lot was just that coating on the tongue... Which is crazy to me"; Ben can't claim his own model broke |
| 9 Reframe | 4 | 58%, reached from the clinic data (7 years, mostly tongue or gums), hinted at 0:36 ("one spot that nobody really cleans") |
| 10 Skeptic | 4 | the stomach, fair (reflux, sinus drip, diabetes), resolved (the valve), left open ("the studies kind of go back and forth", handed to "my doctors out there"); plus the evidence skeptic on scrapers and alcohol mouthwash |
| 11 Ending order | 4 | answer (two weeks, dentist then doctor), zoom out (everybody has these bacteria), feeling ("kind of crazy to me"), one action (ask somebody), outro; the optimism with a real thing sits just before (a week or two) |
| 14 Algorithm fit | 3 | thumbnail object at 0:00, title words 0:13 (3 s late), numbers by 0:32, a loop at every seam; share-worthy fact ("a good chunk of the worried didn't have it") lands at 2:10, not in the last 90 s |
| 16 Cold-viewer clarity | 5 | every term glossed in its sentence; the ending uses no shorthand |
| 17 Repeatable sentence | 3 | "it's usually the back of your tongue" runs through the open, the tongue beat and the ending, in different words on purpose (engineered callbacks are a blind-test tell) |
| 18 The argument | 4 | "Would you tell a friend if their breath stunk?", planted at 0:13 as "would anybody even tell you?" |
| 19 Humor | 4 | "trust me, I know what breath smells like", "that is a real job", "Somebody's gotta do it, I guess.", "dude, that's like double", "doing its thing": five, none at a person, one per paragraph |
| 20 Chapter answers up front | 4 | every question chapter answers in its first 30 s (the stomach chapter at about 26 s) |
| 21 No phantom promises | 5 | in-file payoff only; no next video named |
| 22 Question the question | 4 | "So what does for good even mean?" turns the title's cure into a habit |
| 23 Credit by name | 2 | **miss**: one named human (Dr. James Burns, Northwestern); the Leuven clinic is on camera by place, with Marc Quirynen's name in the pinned comment |
| 24 Last line on the viewer | 4 | "just ask somebody you trust... they're probably not gonna bring it up on their own", then the question |
| 25 Shorts written | 4 | three standalone scripts (187, 224, 146 words), object or question first, last line on the viewer, no call to action; only Short 2 carries a named credit |
`Structure: 76/110 on 22 rows. Misses: 4 (by design), 5 (no admission from Ben), 23 (one named human); partial: 2, 3, 7, 8, 14, 17.` Fixable if Ben wants: say Quirynen's name on camera with a hedge (row 23), and move a share line into the last 90 s (row 14).

## Brief: followed, and where it changed (full table in beat-map.md)
Followed: the title, the order of learning (can't smell → what it is → where → why nothing worked → fix → tonsil stones → routine → when it isn't your mouth), talking-head sit-down, sections under 90 s, no fix before 6:00, the wrist test as the key moment with a real pause and counter, "common and easy to fix" early, "never shaming", both callouts (standalone, marked), the products one per section with an early disclosure and what each doesn't do (no prices, no lineup), the tonsil-stone setup and payoff, the two-week rule "including mine", on-screen text for every fix step, the routine card, three Shorts.
Changed, and why: the cold open's lines (thesis/antithesis tell, and "cannot" overclaims), the tease lines placed at section ends (said as live questions and stakes instead), "scrape, don't brush" (evidence is modest), "alcohol mouthwash... a root cause" (evidence mixed), "sugary mints feed the bacteria" (the sulfur-makers eat protein; a mint masks, and a sugary one feeds cavity bacteria), the toothpaste moved from §5 to §7 (one product per section), both outro options (tidy triplet / stacked ask → his formula), the demos (optional blocks; ben-rules 1), the thumbnail (routine card as test variant B, packaging.md), Short 3 renamed "Your mints aren't fixing it".

## Respeak pass (step 9)
Every paragraph was read against the nearest real passages for its job (table above). What changed in that pass: restarts where he'd restart ("they basically, well, when they break it down", "a little valve at the top of it, well, technically the bottom of your esophagus", "And the studies, well, they kind of say"), a clean do/don't sequence broken with an aside ("the first time you see what comes off it's kind of gross"), rhetorical turn questions cut from five to three (the dumb question, the title question, "what does for good even mean"), list transitions varied ("Then there's your spit" → "And then dry mouth is a big one"), a balanced concession on scrapers made to wander, and two double-sincerity sentences fixed. For the quiz's fairness, each product frame reads as a complete sentence with its [BEN:] slot stripped (a dangling "the reason we made it is." would be an artifact no judge should see).

## Blind test (step 10)
`node pipeline/voice/blind-test.mjs --script videos/bad-breath-for-good/script.md --channel thebentist --type explainer --seed 51 --n 16 --out videos/bad-breath-for-good/blind`: 32 items (16 script, 16 real Ben, 11 of them from his explainers), topic-matched (real pool 305), commas stripped. Script items are 1, 2, 7, 10, 11, 15, 16, 17, 18, 22, 23, 24, 27, 28, 30, 32 (in `key.json`); checked for placeholder artifacts: none. The callout lines start with "[" so they're excluded from the quiz (they're Ben's own words anyway). No `--mask-names`: the only names are institutions (Cleveland Clinic, the ADA, Northwestern), one doctor, and Ben's own company; flag it if a judge's reasons mention names. **Judges not run here**; the main session runs them from `videos/bad-breath-for-good/blind/judge-prompt.md`.

## Still open
- Ben: the [BEN:] slots (disclosure, the mouthwash's existence and details, the scraper, the AquaClean Duo wording, Zero Pro's claim and fluoride, gag tip, mouth breathers, optional patient story) and the 9 clinician questions at the top of research-notes.md.
- Checklist #23 (HARD) stays failed unless the callouts move to after the close.
- Title words land at 0:13, not 0:10; thumbnail A's words are answered at 0:28-0:32, not 0:15. Tightening further would cut the lean-back scene or the credential.
- Structure rows 4, 5, 23 (above).
- Blind-test rounds and, after Ben records, the read test (his transcript vs his unscripted videos).

---

# Round 2 (2026-09-28): whole-script rebuild, more Cleo, the brief as gist only

**Why.** Round 1 blind test (seed 51, `blind/round1-score.txt`): both Sonnet judges 100%, 16/16 caught, 0 false alarms, confidence 3-5. Their reasons: stray fillers as their own sentence ("So yeah."), pasted casual colour ("Somebody's gotta do it I guess"), wrap-up tags after a fact ("Which is crazy.", "Which is fine."), a stat callback ending in a moral ("7 years... That is a long time to be worried"), the honesty-gesture ending ("including mine") and a neat hedged prediction, checklist-cadence advice with reassurance lines, product plugs followed by a tidy caveat, a neat disclosure line + "Let's get into it", stitched transitions ("Do not just stop taking it. Okay so tonsil stones."). Then Ben (via the coordinator): "remember we are writing this in that Cleo Abram style; also feel free to remove any extra crap from the original script, it's just for you to get the gist." Round 1 is saved as `script-r1.md`.

**What changed: every spoken paragraph** (round 1's 41 paragraphs → 29, all rewritten; only the lean-back open, the wrist-test instruction and his sign-off formula carry over in substance).
- **Structure:** one trip now carries the whole middle (tip → back of the tongue → teeth and gums → spit → tonsils → down the throat to the stomach, 17-55%); wonder at the mechanism (bacteria that don't like oxygen, protein has sulfur in it, "bacteria digesting dead cells off the back of your tongue"); the assumption that breaks ("you'd think it'd be your teeth, right?" → the Leuven clinic, now credited to Marc Quirynen by name with a live hedge); the reframe at 55-61%; the skeptic at 61-69% ("I don't want to oversell this": weak evidence, scrapers only a little better, the one-week alcohol-mouthwash trial); what works at 69-88%; Cleo's four-move ending before his sign-off. Beat map at the top of `script.md`.
- **Dropped as scaffolding:** the four product placements (one optional clause remains: the water flosser's soft mode, his own on-camera description, naming Something Nice in the same breath, marked [BEN:] keep/cut), the disclosure line, both mid-roll callouts, the "no fix before 6:00" rule, the on-screen-text step cadence and the routine card, the filming and editor notes and all three optional demo blocks, the "7 years" stat, the Zero Pro, mouthwash, scraper, gag-tip, mouth-breather and patient-story [BEN:] slots. One placeholder is left.
- **Blind-test patterns fixed across the whole script:** no wrap-up tags or pasted asides (every aside carries information or his reaction inside the sentence: "I mean it's coming out of your face all day", "like that's literally their job", "It's nasty"); no stat callbacks (the clinic appears once, all its facts in one run-on); no moral endings (paragraphs end on the fact or the next thought); advice said the way he'd tell a patient (step, why, the gag tangent modelled on his floss coaching in `ETwtQ9crwyc#5`: "they're like I'm gonna stop flossing forever now... No, that's the opposite"); the product caveat folded into the next breath ("...we made ours with a slower soft mode for back there. But with any of them, lowest setting..."), modelled on `irSK2gbcOm4` line 77 and his "even with our water flosser, I still recommend..."; transitions in his run-ons ("So if you keep going, past the tonsils and down the throat, that's kind of where everybody's head goes"); research mentioned loosely with a hedge on the detail ("I think there was a study that looked at CT scans"); rhetorical question-then-answer cut to the open, the teeth assumption and "Well, sometimes."
- **Passages modelled** (`passages.mjs query`, plus greps; the qa bank is one video): Q&A register `RVXQmWSSfAo#3-#4, #15, #20, #38` (long advice run-ons, "A lot of people think X, and that's not actually true", "One... and two, because, well"); product delivery `irSK2gbcOm4` lines 41-43, 65, 77-85, plus his "obviously I would tell you to use our zero pro" and "even with our water flosser" lines (grep); floss coaching `ETwtQ9crwyc#5`; explainer wonder `NGOf5DmEFvA#11` ("It's actually kind of crazy") and its close; tonsil stones `xIa4b50z9vQ` lines 111-117, `p_rJ_7w4ME0` line 33 ("a little intense ones, but still").
- **research-notes.md:** questions trimmed to what round 2 still needs (8), numbers list updated (6 stats: 8 or 9 of 10, 1 in 3, less than half, 2,000, 1 in 4, 2 weeks; "7 years" off camera), and a "Round 2 claim wording" section mapping every new on-camera claim to its row (anaerobes, protein → sulfur, bone loss, "builds right back up" flagged as interpretation, Cochrane 2019's weak evidence, the 2-week trials).

## Round 2 checks
- **retention-check** (`--title "How to Get Rid of Bad Breath For Good" --minutes 8-12`): **10 PASS, 0 WARN**. 2,543 words = 10:47 (+10 s pause). Sections: Open 0:00, Why you can't smell 0:57, The back of your tongue 2:13, Down to the tonsils 3:48, Isn't it your stomach? 5:11, Why nothing you've tried has worked 5:53, The honest part 6:34, What actually works 7:24, The tonsil stones 8:21, For good 9:28. Longest section 1:34; dead stretch 0:56; last fact 91%.
- **Retention checklist: 25/25, no HARD fails.** Changes from round 1: #23 now passes (no mid-roll asks); #7 (belief 0:26 → reversal 0:34) and #10 (the loose plan, 0:45-0:52) pass only inside the ±10% band; #6 title words by 0:15 (the bible's 0:10 missed by 5 s; the code check passes); #16 seams: 0:57 "the reason you can't smell" · 2:13 "So the back of your tongue" · 3:48 "the other spots" · 5:11 "isn't bad breath coming from my stomach?" · 5:53 "you've probably tried stuff" · 6:34 "I don't want to oversell this" · 7:24 "if you came in and asked me" · 8:21 the tonsil stones · 9:28 "for good" (the title question), then "But if... nothing's changed". Score line: `Retention: 25/25, HARD fails: none · retention-check: 10 PASS, 0 WARN · runtime 10:47 at 236 wpm (+10 s pause)`.
- **voice-check** (`--type explainer`): **79/100**, two rows off: cadence distance 0.177 (≤0.12) and length spread 0.563 (0.801 ±0.2); every other row passes (I/me/my 15.3, you/your 52.7, 16.1 words a sentence, fragments 8.9%, 25+ 17.1%, contractions 91%). This is the trade the judges asked for (run-ons, no placed short tags). **Control:** the same check on Ben's own videos scores `NGOf5DmEFvA` (his explainer) **72**, with the same two rows off (cadence 0.172, spread 0.536, fragments 3.1%), and `RVXQmWSSfAo` (his Q&A) **64**. His real explainers run 7-10% short sentences (counted), so the 17.7% baseline (70 explainer passages, several of them reaction-heavy) overstates it. Round 1 scored 94 on this check and was caught 16/16.
- **ai-tells** (`--allow-fragments`): **PASS**. Negation reframes 3 (1.2/1k); ≤2-word fragments 7 (2.7/1k); paragraphs ending on ≤3 words 1 of 29; pointers 0; parallel stacks 0; double sincerity 0; hedges 16/1k.
- **Trademark check** (spoken + Shorts): "huge if true", "hang on", "ready?", "let's go" (one "So let's go back there" rewritten to "So the back of your tongue"), "turns out", "see you for the next one", "optimistic", "we as humans", "oh my god", "here's what/how/the", "which means", "in other words", "time to go deeper", "let me show you", "back to the story", "around the world", "on the surface", "imagine": **0 each**.
- **Magic School Bus:** one trip, two images (shag carpet, rotten eggs; the house is a one-line comparison in the open), six stats. Medical words glossed in their sentence: volatile sulfur compounds, crypts, esophagus.
- **Physical-action audit:** talking head and animation only; the only action is the viewer's wrist test. No demo blocks.

## Structural self-check, round 2 (`docs/huge-if-true-writing.md` §5)
| row | r1 | r2 | note |
|---|---|---|---|
| 1 Physical cold open | 4 | 4 | the viewer's lean-back moment, present tense |
| 2 Scale in the first 30 s | 3 | 3 | the house comparison; the numbers have no comparison |
| 3 Question stack | 3 | 4 | two in the open, then "how do you even check something you can't smell? And where is it really coming from?" with the trip as the promise |
| 4 Receipts | 1 | 1 | by design: the wrist test is the receipt |
| 5 Personal admission | 1 | 1 | none supplied by Ben |
| 6 Vehicle | 4 | 5 | one trip carries 17-55%, "if you keep going" as the direction |
| 7 Dumb question | 3 | 3 | the stomach, answered by Ben and a source, no expert on camera |
| 8 Wonder spike | 3 | 4 | the teeth assumption breaks on the clinic data; wonder at the mechanism |
| 9 Reframe | 4 | 4 | 55-61%, discovered from the trip |
| 10 Skeptic | 4 | 4 | the evidence itself ("weak"), fair, partly resolved |
| 11 Ending order | 4 | 4 | answer (one loose run-on), everyone, a feeling ("I kind of love that"), optimism with a real thing + one action, then his close |
| 14 Algorithm fit | 3 | 3 | title words 0:15 |
| 16 Cold-viewer clarity | 5 | 5 | |
| 17 Repeatable sentence | 3 | 3 | |
| 18 The argument | 4 | 4 | "Would you tell a friend if their breath stunk?" |
| 19 Humor | 4 | 4 | "it's coming out of your face all day", "like that's literally their job", "dude, it's even worse", "I'm probably saying that wrong", "trust me, I know what breath smells like" |
| 20 Chapter answers up front | 4 | 4 | |
| 21 No phantom promises | 5 | 5 | |
| 22 Question the question | 4 | 4 | "for good" = every day, said as a statement, not a rhetorical question |
| 23 Credit by name | 2 | 3 | Marc Quirynen and Dr. James Burns |
| 24 Last line on the viewer | 4 | 4 | |
| 25 Shorts written | 4 | 4 | three, product-free |
`Structure: 80/110 on 22 rows (round 1: 76).`

## Round 2 quiz
`node pipeline/voice/blind-test.mjs --script videos/bad-breath-for-good/script.md --channel thebentist --type qa --seed 52 --n 16 --out videos/bad-breath-for-good/blind-r2`: 32 items (16 script, 16 real, 6 of them from his Q&A video; the qa bank is one video, so the rest are topic-matched from other types), commas stripped, no `--mask-names` (the names are two doctors, Cleveland Clinic, Northwestern and his own company). Script items: 1, 3, 4, 5, 8, 10, 12, 14, 17, 19, 22, 23, 25, 26, 27, 28 (`key.json`); scanned for placeholder artifacts: none. **Judges not run here.**
Read copy rebuilt: `script-read.html` / `script-read.txt` (2,542 spoken words, about 10:47).

## Still open after round 2
- Ben: the one optional product clause (keep or cut) and the 8 questions at the top of research-notes.md (scraper vs brush, gag tip, water flosser for tonsil stones, alcohol mouthwash, two weeks, mouth breathing, Quirynen's name on camera).
- voice-check's cadence and spread rows (the same rows his own explainer misses).
- Structure rows 4 and 5 (by design / nothing supplied).
