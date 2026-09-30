# Voice guide: Alton Brown (Good Eats segments)

Reference voice for `/write-script voice:altonbrown`. Borrow the moves, never the bits.

**Evidence.** `profile.md`, `exemplars.md`, `fingerprint.json` (33 transcripts, 27,086 words), and titles from `index.json`. I read 32 transcripts in full and part of `VxbBBwj0-mA`, plus the first and last 60 words of all 33. "grep" counts are videos out of 33.

**The corpus.** 28 Food Network recipe segments, 2 compilations re-cut from segments (`bTaTxsIFWrs`, `VxbBBwj0-mA`) and 3 unscripted web extras (`6jz3BJhJC2c`, `ZfABPIq8r_s`, `LawWilQ90v0`). Recipe amounts ("a cup of" is in 45.5% of videos) are the format, not the voice. The fingerprint's "openings" are edit points, since most segments start mid-procedure.

**What segments can't show:** act breaks, cold opens, the full episode arc, or how often the sign-off lands. We only have traces:
- callbacks to other episodes, such as "as you probably remember from our biscuit show" `FKuXz5gcr_g`
- foil skits inside segments (`Z1VGSSzfRRU`, `BgPQBbiJeDg`, `eaKOLGIcMGE`)
- one episode close (`iTTjmFI2kUg`) and one tag (`VEMHagBgTj8`)
- props we can only infer from words, such as "Remember this guy?" `GXZ5ZRvVBvc`

Everything here is whisper audio. Nobody has watched the videos.

## How he opens
He starts a dish with a claim about the food: its problem, a definition or a credo. He never opens with a greeting.
- "Wings are covered with skin." `qfdAF62j8ZA`
- "If I have a stew credo, it is this." `psxwyyrZN3A`
- "It seems wrong to make pie out of a swollen root." `iTTjmFI2kUg`
- "A cure is nothing more than a mixture of salt" `TJXEb0eJSfw`

"So" brings in the method: "So you're going to use racks" `qfdAF62j8ZA`. Sometimes he goes mock-grand: "Based on my examination of the field sample" `rUu7EP2zKCc`. Only the two web extras open with "Hey, Alton Brown here" (`6jz3BJhJC2c`, `ZfABPIq8r_s`).

## How he explains (how a recipe becomes a story)
- **A problem, two bad options, a third way:** "Obviously, if we roast the wings at 425, we'll get fabulous skin, but too much smoke" `qfdAF62j8ZA`, then "the answer to our dilemma is to cook the wings twice" `qfdAF62j8ZA`.
- **He asks why and answers in one line.** He asks it himself in 8 of 31 non-compilation videos, and a foil asks it in `Z1VGSSzfRRU` (grep plus reading): "Just salt. Why? Well, because it actually seasons the meat." `cOP6QuhyONc`
- **Plain words first, then the term:** "The process is called retrogradation" `GXZ5ZRvVBvc`
- **Similes from the garage and the weather:** "Skin will stick to a hot piece of metal like a tongue to a winter flagpole." `qfdAF62j8ZA`; "like rain on a freshly waxed car hood" `cOP6QuhyONc`
- **Molecules and tools have motives.** On pectins: "The problem is they're a little on the negative side." `VxbBBwj0-mA`
- **Consequence chains:** "brown means crisp, and crisp is what a lot of this dish is about" `Z1VGSSzfRRU`
- **Reframes:** "So don't think of it as sweet potato pie." `iTTjmFI2kUg`
- **Exact numbers as a joke:** "Not 4, not 6, 5." `cOP6QuhyONc`

## How he reacts
Short and dry, often at his own expense. The only exclamation mark in 33 transcripts is the show tag.
- "There, now that's what I'm talking about." `eChbcRHRuCQ`
- "Ganache is French for jowl, which makes absolutely no sense to me, but there you go." `JT4aJhXLuVY`
- On a turkey joint: "I got a hip that'll do that." `IvPuc8s-LR8`

## How he hedges
He concedes, then sizes the risk. He gives the viewer permission and owns his taste.
- "Well, you're right." then "it would take a very, very long time for that leaching to reach anything close to a toxic level" `psxwyyrZN3A`
- "It's not actually mold, at least it shouldn't be, every now and then it is" `Tl4SKZ9BF2c`
- "If I'm wrong on that, somebody let me know." `LawWilQ90v0`
- "I like it sharp and a little on the gooey side" `MMUy8eBADSc` ("i like": 69.7% of videos against 22.8%, fingerprint)

## How he moves between beats
"Now" opens 11.8% of his sentences, against 2% for other creators.
- "Now, let's talk sauce." `qfdAF62j8ZA`
- "Time for the blues." `Fy2Jcrl8-Fk` ("time to" or "time for" appears in 11 of 31, grep)
- "Speaking of cheese, I like to go with three varieties." `4D6KstTbVM4`
- Time jumps are played as jokes: "Time's up, my luscious lovelies." `psxwyyrZN3A`

## How he closes
My count of the 28 recipe segments' last 60 words: 9 end on a dry button, 8 on the principle proven, 8 on an instruction where the edit cuts, 2 on the show close and 1 on a preference. Only `TJXEb0eJSfw` recaps.
- "But I find that the lid for my kettle grill wards off all poachers." `eaKOLGIcMGE`
- "Almost burned on the outside, barely cooked on the inside." `eChbcRHRuCQ`
- "We hope we've opened your mind and maybe even your heart to the star potential of the sweet potato." `iTTjmFI2kUg`

## Rhythm targets (fingerprint)
| measure | Alton | others |
|---|---|---|
| words per sentence, median (p10 to p90) | 11 (3 to 25) | 10 (3 to 28) |
| words per sentence, mean | 13 | 16.6 |
| questions | 5.4% | 9.4% |
| you / I / we per 1k | 24.2 / 15.9 / 12.7 | 32.2 / 24.8 / 13.8 |
| contractions | 75.3% | 79.2% |

Median pace is 162 words a minute. He asks few questions and answers his own. "I" is low because the food is the subject.

## What he does NOT do
- Greet in a cooking segment (0 of 28).
- Cite studies. "study", "research" and "according to" are in 0 videos (grep).
- Use filler. Per 1k words: "you know" 0.7 (others 3.8), "actually" 1.2 (4.2), "basically" 0.1 (1.1), "yeah" 0.2 (2.1).
- Hype things up. "crazy" and "super" appear once each, both in compilations. "oh my gosh" never appears (grep).
- Tell long stories. An anecdote is one sentence that serves a step: "One day, about two hours after cutting some chilies, I put in my contact lenses." `LQHqezQzQoM`

## Trademarks — never reuse in another host's script
- **The show name, including as a verdict:** "Here at Good Eats" `mLi3G7RSUS0`; "That's not good eats." `Z1VGSSzfRRU`; "Now, that's Good Eats!" `VEMHagBgTj8`
- **His coinages:** "golden brown and delicious" (4 videos with variants, grep), "hot box" for the oven (3), "a pint's a pound the world around" (2), "what a multitasker it is" `SgbBBaY7COs`, "let's meet the brownie software" `SgbBBaY7COs`
- **Bits and characters:**
  - "Sorry, Uncle Alton." `VEMHagBgTj8`
  - "where's that big puppet I hired?" `Vph5hJTvnP8`
  - "Is it A, the sponge method, B, the muffin method, or C, the creaming method?" `Fy2Jcrl8-Fk`
  - "Nope, the answer is the turkey triangle." `eaKOLGIcMGE`
  - "but that's another show" `IvPuc8s-LR8`
  - "I'll be back." as the cut line (2 segments, grep)
- **Not evidenced here:** "Your results may vary".
- **Impression risks.** Use each at most once, and rephrase it: "lube", "said vessel", "bad boy", "don protection", "last but not least".

## How to borrow this voice for a different host
Worked for an orthodontist. Italic lines are illustrations, and each fact needs a source.
1. **Open on the object's problem.** *Your teeth sit in bone.*
2. **Show the too-hard way and the too-gentle way,** then what the clinician does.
3. **Ask the viewer's why and answer it in one sentence.** For TheBentist, use *Why? Because...* (evidenced in `nGYlHWWZE9Y`, no joining comma).
4. **Give cells a job.** *One crew clears bone ahead of the tooth and another builds it back behind.* Don't borrow the software/hardware frame.
5. **Use plain words, then the term once.** *That's called remodeling.*
6. **Draw similes from things the viewer has touched.**
7. **Voice the objection, concede what's true, then size the risk with a number.** This fits Ben's rule that he's never naive about a fad.
8. **End a beat on visible proof or a dry button,** never on "that's another show" (ben-rules 9 bans phantom promises).

**For TheBentist:** the foil becomes an animated character or an on-screen comment. There's no second actor and no invented relative (ben-rules 1 and 2). "Now" and "Well" are already among Ben's starters in `docs/style-prompts/bentist-casual.md`. Keep them, but drop the commas.

## Where the evidence disagrees with older docs
None exist. `docs/` has no Alton Brown or Good Eats material (grep). The only earlier statement is the trademark rule in `write-script/SKILL.md` and `yt-scriptwriter.md`. The evidence agrees with it and adds the verdict use of "good eats", "golden brown and delicious", "hot box" and the software/hardware frame.
