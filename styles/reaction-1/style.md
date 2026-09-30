# Editing style: reaction-1

Learned from [Watching Teeth NIGHTMARES So You Don't Have To..](https://www.youtube.com/watch?v=JGCAtg57pJg) (The Bentist, 2026-07-18), analysed 0:00-15:30 (930 s) by `pipeline/style/learn.mjs`. Use it with `node pipeline/resolve/build-timeline.mjs --slug <slug> --style styles/reaction-1/style.json`.

## Measured

| What | Value |
|---|---|
| Cuts detected (scene score >= 0.12, isolated spikes) | 247 |
| Cuts per minute, overall | 15.94 |
| Cuts per minute, first 60 s | 15 |
| Shot length mean / median | 3.75 s / 2.37 s |
| Shot length p10 / p75 / p90 | 0.87 s / 4.77 s / 7.7 s |
| Shot length histogram | <1s: 33, 1-2s: 70, 2-4s: 64, 4-8s: 57, 8-15s: 20, 15s+: 4 |
| Detector sensitivity (cuts at score threshold) | 0.08: 303, 0.12: 247, 0.2: 173, 0.3: 113, 0.4: 57 |
| Speech pauses kept (>= 0.1 s) | 486 (31.35/min) |
| Pause median / p75 / p90 | 0.2 s / 0.41 s / 0.94 s |
| Share of time below the speech threshold | 20% |
| Audio floor / speech level / threshold | -51.9 / -21.1 / -42.7 dBFS |
| Integrated loudness / LRA / true peak | -20.6 LUFS / 14.6 LU / 0.3 dBTP |
| Music bed likely (pauses not silent and fluctuating) | no (pause level -51.3 dBFS, std 7.92 dB, -30.2 dB under speech) |

## Edit parameters derived (style.json `edit`)

- Pauses: between sentences keep 0.2 s (cut anything over 0.32 s); inside a sentence keep 0.3 s (cut over 0.45 s). From the median/p90 pause the editor left in.
- Punch-ins: 1.4x on every other segment, hold one framing at most 4.77 s (p75 shot), no piece shorter than 0.87 s (p10 shot). Scale set after looking at the sheets (see Visual notes).
- Cut rate target: 15.94 framing changes per minute (all detected cuts; lower it if b-roll/graphics drive most of them, since the rough cut only makes jump cuts and punch-ins).
- Music bed: -22 dB clip gain. Deliver at -20.6 LUFS integrated, true peak 0.3 dBTP.

## Sheets (Read these)

- `styles/reaction-1/sheets/first60-01.png`: first 60 s at 1 fps, 0:00-0:30 (tile k = 0:00 + k x 1 s, left to right, top to bottom)
- `styles/reaction-1/sheets/first60-02.png`: first 60 s at 1 fps, 0:30-1:00 (tile k = 0:30 + k x 1 s, left to right, top to bottom)
- `styles/reaction-1/sheets/overview-01.png`: whole range at 1 frame / 11 s, 0:00-5:30 (tile k = 0:00 + k x 11 s, left to right, top to bottom)
- `styles/reaction-1/sheets/overview-02.png`: whole range at 1 frame / 11 s, 5:30-11:00 (tile k = 5:30 + k x 11 s, left to right, top to bottom)
- `styles/reaction-1/sheets/overview-03.png`: whole range at 1 frame / 11 s, 11:00-15:30 (tile k = 11:00 + k x 11 s, left to right, top to bottom)
- `styles/reaction-1/sheets/cuts-01.png`: cut check 1-12: each pair = 0.1 s before | 0.07 s after a detected cut at 0:01, 0:03, 0:06, 0:08, 0:10, 0:15, 0:17, 0:19, 0:26, 0:30, 0:35, 0:36
- `styles/reaction-1/sheets/cuts-02.png`: cut check 13-24: each pair = 0.1 s before | 0.07 s after a detected cut at 0:43, 0:46, 0:48, 1:02, 1:06, 1:12, 1:20, 1:22, 1:23, 1:24, 1:28, 1:30

Every tile has its source timestamp burned in (top-left).

## Visual notes

Filled by Claude (subagent) on 2026-09-28 after reading all 7 sheets, with 2-3x crops of the tiles for the measurements. Positions are percent of the 16:9 frame, judged by eye on 480p tiles (about +-3%). Nobody has watched or listened to the video for these notes: sound, music and any motion between frames are unknown.

- **Sheet timing (read this first):** the labels burned into `first60-*` and `overview-*` tiles are the start of each sampling bucket, but ffmpeg `fps=...:round=down` keeps the *last* frame of the bucket. Each tile really shows about label + 1 s (first60) or label + 11 s (overview). Checked against the cut sheets, whose times are exact: first60 tile "0:07" is the white flash that cuts-01 shows at 0:07.900, tile "0:16" already shows the punch-in cuts-01 puts at 0:16.92, and overview "1:17" is the washed frame cuts-02 shows at 1:27.900. The times below are the labels as printed; "real" means corrected.
- **Framing:** one camera and one set throughout: lavender wall, white cube shelves with his product boxes, a figurine on the right-hand cube, a black foam mic at the bottom, black scrubs. The base framing is a medium shot with a lot of headroom: hair top about 31% down the frame, chin about 70%, eyes 46-56% depending on posture, face centred at x about 50% (first60 0:00, overview 2:23, 9:21, 15:02). In the split layout (below) the same base shot is moved right by about 12-13% of the frame width at the same scale. The shelf cubes keep their size and shift by that amount (first60 0:06 vs 0:08), so his face lands at x about 60-65% (0:08, 1:06, 6:14, 13:12).
- **Punch-ins / zooms:** heavy, frequent, and alternating base/tight. Measured by the size and spacing of the background cubes, tight framings are about 1.45x the base at first60 0:03, about 1.4x inside the split (0:09) and the card layout (0:28), and about 1.6x on host-only stretches (first60 0:59, overview 1:50, 3:40, 6:25, 14:40). There are some smaller steps near 1.2x (cuts-01 0:34.767) and about 5% reframes (cuts-01 0:35.5/0:35.667, cuts-02 0:47.733/0:47.9). Tight shots keep the face at x about 50% (host only) or about 65% (split), with the eyes near the middle of the frame height (40-55%). Pairs 0.17 s apart show the zoom changing on the cut (0:09.75, 0:16.92, 1:23.08), so these are static punch-ins, not push-ins. At least one lands mid-phrase: the caption "THAT GO" stays on across the zoom at 1:30.2. Four framing changes visible on the 1 fps sheet have no detected cut (real time about 0:03.5-4, 0:10-11, 0:28-29, 0:59-60). They could be animated zooms or slides, or just low-contrast cuts; the stills can't tell.
- **Reaction layout (the core of the style):** there are three layouts, switched on hard cuts, and the reacted clip is **never full screen** (0 of 144 tiles).
  1. *Split*: 48 of 84 overview tiles and 48 of 60 first-minute tiles. The clip fills a full-height panel on the LEFT, x 0-34% on most clips. Some clips use 26% (overview 12:06-12:28), 37% (9:54) or 41% (real 0:15-0:29, where the panel widens at the 0:15.45 cut). The panel has a hard straight edge with no border, no rounded corners, no shadow and no blurred fill. The TikTok is scaled to cover the panel, so a little of its top is cut: the native text "Things you want to bite really really bad" is clipped at first60 0:08. The TikTok's own text, labels and emoji stay on, and where the TikTok itself has black bars they stay black (9:54, 10:27-10:38). The host is on the right as described above. His zoom keeps alternating while the clip plays.
  2. *Host + floating card*: 15 of 84. The host is not shifted (face x about 50%) and is at base or tight framing. The clip, a still, a photo or a comment screenshot sits over the left wall as a hard-edged rectangle, usually top-left. Portrait clips sit at x about 5-30%, y 16-84% (first60 0:26-0:28, overview 3:18, 8:04, 11:44, 12:39). Landscape stills sit at x about 3-35%, y 15-58% (6:36, 9:10, 10:49, 11:00, 13:56). One card is top-right, x 70-100%, y 13-39% (14:18). An edge treatment (thin light edge or soft shadow) can't be judged at 480p.
  3. *Host only*: 21 of 84, face centred, base or about 1.6x.
  The layout changes between clips and also inside one clip: the @clearpressure press clip goes split, then card, then split at real 0:26.4-0:29.5 while he keeps talking.
- **How clips enter and exit:** every before/after pair shows a hard cut. The panel or card appears or disappears between two frames 0.17 s apart (0:07.98, 0:26.38, 0:29.48, 1:12.2, 1:19.58, 1:24.0, 1:27.98). Several of these clip cuts carry a **white flash**: the frames on both sides of the cut are blown out to near white (cuts-01 0:07.9/0:08.067; cuts-02 1:12.133/1:12.3, 1:19.5/1:19.667, 1:24.1, 1:27.9/1:28.067). Tiles between those cuts are normal (overview 1:06 = real 1:17), so the flash is short and on the cut, not a look. The stills can't show its length. The clip keeps playing under his talk-over: the item in the press moves between consecutive 1 fps tiles while his captions run (first60 0:12-0:23). No freeze frames were seen, but short pauses can't be ruled out from stills.
- **Captions / on-screen text:** running captions of his own words, 1-3 at a time ("OF SOME", "IF YOU", "BRO MADE A", "YOU KNOW?"). They are ALL CAPS in a heavy condensed sans (Anton/Impact-like), white with a thin black outline and a soft shadow. They are centred on the frame (x about 50%) with the baseline at y about 93-95% in every layout, so in the split they sit just right of the panel over his chest and mic. Cap height is about 7% of frame height in the hook (0:00-0:07) and about 5% after that. Captions are intermittent: they appear on 16 of 60 first-minute tiles and about 16 of 84 overview tiles, and many talking tiles have none (overview 1:50, 4:13, 11:11, 14:40). The stills can't show whether whole passages go uncaptioned. Every split clip carries the creator's handle as small white bold text with a dark edge, bottom-left of the frame (x about 1%, y about 96%, about 3% tall), e.g. "@clearpressure". It has the same style on every clip, so it looks added in the edit. No handle was seen on floating cards. The TikToks' own on-video text stays in ("A dental horror film:" 3:29, "Does a toothache supposed to hurt this bad????" 1:28). A yellow version of the caption style carries his brand URL "SOMETHINGNICECOMPANY.COM" (overview 9:32-9:43, x about 13-87%, y about 87-95%). No counters or numbering, arrows, circles, highlights or added emoji appear in any of the 144 tiles.
- **Graphics and b-roll beyond the reacted clips:** he explains over photo pop-ups of teeth and braces shown as floating cards (overview 9:10, 10:49, 11:00, 13:56, 14:18, 14:29). TikTok comment screenshots appear as white strips top-left (4:24, 5:52, 10:16, cuts-02 1:21.833), and a full comment-list panel covers x about 47-70% at full height at 10:05. A subscribe-button graphic ("SUBS" on a white box, x about 29-41%, y 73-85%) is caught mid-animation at 6:03. For the brand plug at 9:32 the room is keyed out to white with a product image behind him. There is no stock footage, no lower thirds and no chapter cards.
- **Colour and look:** bright and high-key. The wall is cool lavender/purple with pink and blue LED accents on the shelves, skin is warm, contrast moderate. The look is identical across the whole video (same set, same grade), and clips keep their own colour. The only departures are the white flashes and the dark sepia horror background in the hook.
- **Open (first60 0:00-0:07 plus cuts-01, real 0-8 s):** the host starts medium in the room ("CRAZIEST"). At 0:01.38 the room is swapped for a dark horror bedroom with a shadow creature behind him, so he has been cut out of his background. Three clip stills pop in around him as cards: two stacked on the left and one tall on the right, a TikTok about having all her teeth pulled. At 0:03.45 he is back in the room, then punched in about 1.45x ("PEOPLE"). Two portrait clip stills then flank his face (left x 5-28%, right x 71-94%, y 6-70%). At 0:06.38 he is medium with the cards gone ("ASAP"). A white flash lands on "INTO IT", and at 0:07.98 the first clip starts in the split. That is roughly seven picture changes in eight seconds. The rest of the first minute is one hydraulic-press TikTok compilation in the split (chalk, then lipstick at 0:29.5, then styrofoam at 0:43.1), with him punching in and out every few seconds. At about real 1:00 the clip leaves and he is host-only, tight.
- **What a code-built rough cut can copy, and what it can't:**
  - The code can already copy the static punch-ins around the eyes at about 1.4x, alternating with the base framing at a high rate.
  - It can also copy the 1-3-word ALL-CAPS captions at x 50%, baseline about 94%, from the word timings, if the builder emits titles; otherwise they are styled in Resolve.
  - The split and card layouts are plain transforms (crop the clip to x 0-34%, move the host +12.5%), so in principle code can build them. It needs the reacted clip files and where each one starts, and the raw recording alone does not give it that.
  - Resolve or motion-design work: the hook (background removal/Magic Mask, collage cards), the white flashes, card pop-ins, comment screenshots, picking photo b-roll, the subscribe animation, the yellow URL and the white-background plug.
  - The stills can't show sound effects, music, how loud the clip audio sits under his voice, or any animated zoom or slide.
  - Caveat for reaction raws: if Ben watches a clip in silence while recording, pause-cutting would delete the watching time, so those sections need the clip timeline to drive the cut.
- **Cut detector check (cuts-01/02: the first 24 detected cuts, 0:01-1:30):** all 24 are real picture changes and none is a false detection.
  - 9 are host-only reframes with the clip unchanged: 0:09.75, 0:16.92, 0:19.38, 0:34.68, 0:35.58, 0:46.15, 0:47.82, 1:01.55 and 1:23.08. Two of them (0:35.58, 0:47.82) are small reframes of about 5%.
  - 2 are changes inside the clip only: at 0:15.45 the clip cuts to a new shot and the panel widens, and at 0:43.12 lipstick becomes styrofoam.
  - 13 are layout changes (panel, card, collage or background in or out). 8 of those also change his zoom on the same frame.
  - That makes 17 of 24 detected cuts that change the host's zoom.
  - The detector also misses changes: at least 4 host framing changes on the first60 sheet have no detected cut (see Punch-ins).
  - Verdict: the measured cuts per minute is a trustworthy count of real picture changes, if anything slightly low. Most detected cuts involve a host framing change, and the clip/layout-only cuts are roughly offset by the misses, so the cut-rate targets were kept as the host framing-change targets. Caveat: the sample is only the first 90 s.
- **Layout spec** (percent of the 16:9 frame, from the tiles above):
  - *Split:* clip panel x 0-34% (26-41% on some clips), y 0-100%. Scale the clip to cover the panel, centred, and crop the overflow. Keep the TikTok's own black bars; no blur fill. Hard edge, no border, no rounded corners, no shadow. Draw the panel over the host.
  - *Host in the split:* the full base frame at 100%, moved right by 12.5% of the frame width, so the face sits at x about 63% and the eyes at y about 50%. On tight beats, scale about 1.4x around the eyes, face at x about 65%.
  - *Handle in the split:* white bold text about 3% of frame height with a dark outline, bottom-left at x 1%, y 96%.
  - *Card:* host not shifted (face x 50%) at base or about 1.4x. Portrait clip card at x 5-30%, y 16-84%. Landscape still or photo at x 3-35%, y 15-58%. Comment strip at x 5-45%, y 16-25%. Hard-edged, above the host.
  - *Host only:* face x 50%, base or about 1.6x.
  - *Captions (all layouts):* 1-3 words, ALL CAPS, heavy condensed sans, white with a thin black outline and soft shadow. Centred at x 50%, baseline y about 94%, cap height about 5% (about 7% in the hook). The brand URL uses the same style in yellow.
  - *Switching:* hard cuts, with a short white flash on some clip entries and exits.
  - *Screen-time share (overview tiles):* split 48/84, card 15/84, host only 21/84, clip full screen 0.

