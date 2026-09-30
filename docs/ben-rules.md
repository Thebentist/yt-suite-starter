# Ben's rules for scripts and packaging

> **Worked example.** These are the original host's rules (Dr. Ben Winters, TheBentist), kept so a new host's `docs/host-rules.md` can be written the same way. They apply to Ben, not to the new host, except where `docs/host-rules.md` adopts them (most of rules 2, 5-9 and the talking-points loop turned out to be universal). His clinical notes are private and not included.

Collected from Ben's own corrections across earlier sessions (Sep 16-23, 2026). They override any general writing advice.

## What Ben is on camera
1. **Talking head plus animation only.** Never write a beat where Ben physically does something (a demo, a self-test, a field trip, holding a prop he'd have to buy). Optional `[HOLD]` cues for desk objects are the most allowed.
2. **Nothing invented about Ben.** No specific patient, event, memory, habit, possession or number of his unless he supplied it. Generic professional experience is fine ("I move teeth all day", "when you come into my office"). Hedges that claim a past action ("I had to go check that") count as invented. When a beat needs a witness, attribute it to the documented group ("orthodontists all over the country") with a source. List every first-person line near the top of the script for his sign-off.
3. **Never naive about a dental fad.** Ben's stance is "we saw it coming; what I got wrong was how it ended", never "I thought it was fine at first."
4. **Ask for the clinician's point.** Before finalizing any dental script, ask Ben what a clinician would say is missing (e.g. mail-order aligners were plastic only: no attachments, no IPR, no elastics). In his setup, his answers were kept in a private clinical-notes file (not included here); a new host keeps theirs in `docs/host-expert-notes.md`.

## How it should feel
5. **Magic School Bus bar.** One trip, two images, about six numbers on camera. Sample sizes and evidence grades go in the pinned comment. Edutainment anyone can follow without technical terms.
6. **Spoken, not written.** The house voice is `docs/style-prompts/bentist-measured.md`, measured from 80 of his videos (2026-09-27). It replaced `bentist-casual.md` (Sep 22), which Ben said he wasn't a fan of: "I trust your info over what was built from that." His transcripts (`voice/thebentist/`) always win over any prompt. When a draft "doesn't sound like me", go back to his passages (`pipeline/voice/passages.mjs query`), not to adjectives.
7. **Viral-grade open with ethos and pathos.** The sharpest documented human line in the first 20 seconds, then the credential, then the question stack. Title words spoken by about 0:10, the thumbnail promise confirmed by 0:15.
8. **Structure like a story.** But/therefore between beats, never "and then" (that is about how the story moves from beat to beat; inside an explanation Ben really does chain steps with "and then"). Write the last line first. A returning element must be something the viewer saw in the first minute; never invent a mid-script device. No coined shorthand in the ending. Advice is a full sentence to one person.
9. **No phantom promises.** Every forward reference points at a published video (title and id), a scheduled script, or text in the same file; otherwise close on the video itself with his sign-off.

## The talking-points loop (preferred for new scripts)
Ben proposed it after nine drafts that "didn't sound like me": Claude writes structured talking points (the one-line story, the two images, the sourced numbers he may say and nothing else, six beats each with a goal, 3-6 bullets of substance, the connective to the next beat, a "tangent welcome" hint and a "don't say" line where legal or invention risk exists). He records himself talking through them loosely. Claude builds the script from his transcript, keeping his sentences and order wherever they work, and lists every change with the reason. Bullets must be substance, not sentences he could read aloud.

## Packaging on his channel
From `docs/examples/thebentist-channel-brand.json`: specific and superlative titles outperform vague consequence titles ("57 Most SATISFYING Dental TikToks" beats "This isn't normal.."). His house style: one or two words in caps, titles often end in ".." or "??". Check current numbers in `voice/thebentist/index.json` (titles with views) before claiming what works for him.
