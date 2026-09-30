# Editing style: reaction

Blended from 3 references by `pipeline/style/blend.mjs` (edit numbers = the median; policies = the majority). Each reference keeps its own sheets and notes in `styles/<reference>/`.

| | [Watching Teeth NIGHTMARES So You Don't Have To..](https://www.youtube.com/watch?v=JGCAtg57pJg) (The Bentist) | [We have a lot to talk about..](https://www.youtube.com/watch?v=xIa4b50z9vQ) (The Bentist) | [Things You Wish You Never Knew (Zack D. Films)](https://www.youtube.com/watch?v=nbKu9SRh4sE) (SSSniperWolf) |
|---|---|---|---|
| Cuts / min (first 60 s) | 15.94 (15) | 8.06 (12) | 21.37 (15) |
| Median shot | 2.37 s | 3.97 s | 1.97 s |
| Pause median / p90 | 0.2 / 0.94 s | 0.15 / 0.4 s | 0.15 / 0.28 s |
| Words / min | 207.03 | 244.45 | 195.36 |
| Fillers / stutters left per min | 0.19 / 0.26 | 0.14 / 0 | 0 / 0 |
| Loudness | -20.6 LUFS | -31.6 LUFS | -14.8 LUFS |
| Music bed likely | no | no | yes (-14.06 dB) |

## Edit parameters (blended)

```json
{
  "takes": {
    "fillers": "cut",
    "stutters": "cut",
    "retakes": "cut"
  },
  "pause": {
    "keepBetweenSentences": 0.15,
    "maxBetweenSentences": 0.27,
    "keepInSentence": 0.25,
    "maxInSentence": 0.4
  },
  "punchIn": {
    "enabled": true,
    "scale": 1.25,
    "every": 2,
    "maxHoldSec": 4.77,
    "minSegmentSec": 1.07
  },
  "cutRate": {
    "targetCutsPerMin": 6,
    "targetCutsPerMinFirst60": 8
  },
  "music": {
    "gainDb": -22
  },
  "deliver": {
    "loudnessLufs": -20.6,
    "truePeakDbtp": 0.3
  },
  "captions": {
    "maxChars": 25,
    "maxSec": 1.5
  }
}
```

## Visual notes

Merged by Claude on 2026-09-28 from the three references' own notes (`styles/reaction-1|2|3/style.md`, each read from contact sheets with crops). Nobody has watched any of them in motion or listened to them: sound effects, music, clip-audio level and animation speed are unknown. Positions are percent of the 16:9 frame, judged by eye on 480p tiles (about +-3%).

**What all three share (this is the reaction style):**
- **The clip is never full screen** (0 tiles in all three). It sits in a full-height panel flush LEFT: 31.6-34% wide in Ben's two (a 9:16 clip at full height), 40% for SSSniperWolf. Hard straight edge: no border, gap, rounded corners, shadow or blurred fill. The panel is drawn over the host.
- **The host moves right, not smaller (mostly)**: face at about 63% across (Ben, reaction-1: same scale, shifted +12.5%), about 68% (Ben, reaction-2: 0.87x and shifted) or about 69% (SSSniperWolf: same scale, +20%). Eyes stay where they were.
- **Split share of the runtime**: 57%, 42% and 47% of overview tiles. The rest is host alone (with pop-ups), switched on hard cuts. The layout is identical for every clip within a video.
- **Host alone**: one locked-off camera, face centred, static punch-ins on jump cuts, alternating base and tight.
- **One set, one look** all video; clips keep their own colour, no grade matching.
- **No stock b-roll, no lower thirds, no chapter cards, no progress bars** in any of them.

**Where they differ (pick per video):**

| | reaction-1 (Ben, Teeth NIGHTMARES) | reaction-2 (Ben, We have a lot to talk about) | reaction-3 (SSSniperWolf) |
|---|---|---|---|
| Host framing changes / min | 15.94 (kept after checking: 17 of 24 detected cuts change his zoom) | 5.4 (set after looking) | 6 (set after looking) |
| Punch-in | about 1.4x (1.6x host-only gags) | 1.25x typical (1.17-1.38), 1.5x gags, some animated push-ins | about 1.2x |
| Rhythm | alternates fast everywhere | short punches (0.6-2 s), long wide holds (up to about 14 s) | host shots 1.2-2.6 s in commentary |
| Host zoom while a clip plays | keeps alternating | never | never (no host cuts at all) |
| Clip entry | hard cut, often a short white flash | 1-3 frames of TV static | hard cut |
| During the clip | he talks over it, clip keeps playing | he watches silently (hand on chin), then talks | she talks over it; panel removed for longer comments |
| Captions of the host | 1-3 words, ALL CAPS, intermittent (16 of 60 first-minute tiles), x 50%, baseline about 94% | 1-4 words (max 25 characters), about one cue per second, x 50% (x 65% in the split), baseline about 96% | hook and channel intro only (heavy italic, 2-3 words) |
| Creator handle | added, bottom-left, white bold | none added | only the Short's own |
| Pop-ups | floating cards over the left wall (clips, photos, comments), also a card layout without the shift | only over host alone: images top-left, comment cards top-right, cut-outs | keyed meme stickers, gag effects, colour bars |

The blended numbers above are medians, so they sit with reaction-2 and reaction-3 (6 changes/min). For Ben's faster look use `style:reaction-1`; for his calmer one use `style:reaction-2`.

**Proposed layout spec for Ben's reaction edits** (from his own two videos; used by the dual-source builder once it exists):
- Split: clip panel x 0-31.6% (9:16 at full height; wider sources widen it, up to about 35%), y 0-100%, scaled to cover, hard edge, above the host.
- Host in the split: camera at 1.0x shifted right 12.5% (face about 63%), no punch-ins while the clip is up (reaction-2's habit; also safest for sync).
- Host alone: face 50%, alternating base and punched at 1.25-1.4x on jump cuts; a 1.5-1.6x tight shot for gags is picked per joke.
- Captions: ALL CAPS, white, heavy sans, thin dark outline, 1-4 words (at most 25 characters, 1.5 s), baseline about 94-96%, centred on the host (x 50% alone, about 65% in the split).
- Switching: hard cuts; a short white flash or TV static into a clip is a Resolve/motion-design choice.

**What today's builder can and can't do for a reaction:**
- Can: the content pass, fillers/stutters/false starts, tight pauses, alternating punch-ins at this style's scale and rate, short caption cues in the SRT (styled in Resolve).
- Can't yet: the split layout, which needs the reacted clips and where each one starts. On Ben's setup those are on the OBS screen recording, which has the clip audio; the camera mic doesn't hear the clips.
- Must not: run the dead-air pass across a clip. Ben's silent watching (reaction-2) would be deleted, and so would any stretch where the clip's own audio carries the video. Until the dual-source builder exists, only run it on commentary stretches.
- Left for Resolve / motion design: flashes and static, pop-up cards, comment screenshots, stickers and gag effects, animated push-ins, caption animation, sound effects.

**Loudness note:** the `deliver` numbers above are measured on the YouTube downloads (-20.6 LUFS, +0.3 dBTP median), which YouTube has re-encoded; a true peak above 0 dBTP is not a target. The pipeline's own dialogue level (`clean-audio.mjs`: -16 LUFS, -1.5 dBTP) is what the edit uses.
