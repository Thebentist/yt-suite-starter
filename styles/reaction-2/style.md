# Editing style: reaction-2

Learned from [We have a lot to talk about..](https://www.youtube.com/watch?v=xIa4b50z9vQ) (The Bentist, 2026-03-08), analysed 0:00-14:23 (863 s) by `pipeline/style/learn.mjs`. Use it with `node pipeline/resolve/build-timeline.mjs --slug <slug> --style styles/reaction-2/style.json`.

## Measured

| What | Value |
|---|---|
| Cuts detected (scene score >= 0.12, isolated spikes) | 116 |
| Cuts per minute, overall | 8.06 |
| Cuts per minute, first 60 s | 12 |
| Shot length mean / median | 7.44 s / 3.97 s |
| Shot length p10 / p75 / p90 | 1.07 s / 10.1 s / 17.67 s |
| Shot length histogram | <1s: 11, 1-2s: 26, 2-4s: 24, 4-8s: 19, 8-15s: 21, 15s+: 15 |
| Detector sensitivity (cuts at score threshold) | 0.08: 128, 0.12: 116, 0.2: 89, 0.3: 37, 0.4: 18 |
| Speech pauses kept (>= 0.1 s) | 740 (51.45/min) |
| Pause median / p75 / p90 | 0.15 s / 0.26 s / 0.4 s |
| Share of time below the speech threshold | 19% |
| Audio floor / speech level / threshold | -51.9 / -31.2 / -45.7 dBFS |
| Integrated loudness / LRA / true peak | -31.6 LUFS / 7.1 LU / -6.9 dBTP |
| Music bed likely (pauses not silent and fluctuating) | no (pause level -51.35 dBFS, std 5.95 dB, -20.15 dB under speech) |

## Edit parameters derived (style.json `edit`)

- Pauses: between sentences keep 0.15 s (cut anything over 0.27 s); inside a sentence keep 0.25 s (cut over 0.4 s). From the median/p90 pause the editor left in.
- Punch-ins: 1.25x on every other segment, hold one framing at most 10.1 s (p75 shot), no piece shorter than 1.07 s (p10 shot). Scale set after looking at the sheets (see Visual notes).
- Cut rate target: 5.4 framing changes per minute (set after looking; all detected cuts give 8.06). First 60 s: 8 (all detected: 12).
- Captions (set after looking): cues of at most 25 characters and 1.5 s (the build-timeline default is 42 characters and 5 s).
- Music bed: -22 dB clip gain. Deliver at -31.6 LUFS integrated, true peak -6.9 dBTP.

## Sheets (Read these)

- `styles/reaction-2/sheets/first60-01.png`: first 60 s at 1 fps, 0:00-0:30 (tile k = 0:00 + k x 1 s, left to right, top to bottom)
- `styles/reaction-2/sheets/first60-02.png`: first 60 s at 1 fps, 0:30-1:00 (tile k = 0:30 + k x 1 s, left to right, top to bottom)
- `styles/reaction-2/sheets/overview-01.png`: whole range at 1 frame / 10 s, 0:00-5:00 (tile k = 0:00 + k x 10 s, left to right, top to bottom)
- `styles/reaction-2/sheets/overview-02.png`: whole range at 1 frame / 10 s, 5:00-10:00 (tile k = 5:00 + k x 10 s, left to right, top to bottom)
- `styles/reaction-2/sheets/overview-03.png`: whole range at 1 frame / 10 s, 10:00-14:23 (tile k = 10:00 + k x 10 s, left to right, top to bottom)
- `styles/reaction-2/sheets/cuts-01.png`: cut check 1-12: each pair = 0.1 s before | 0.07 s after a detected cut at 0:00, 0:04, 0:05, 0:06, 0:10, 0:26, 0:27, 0:34, 0:46, 0:49, 0:50, 0:57
- `styles/reaction-2/sheets/cuts-02.png`: cut check 13-24: each pair = 0.1 s before | 0.07 s after a detected cut at 1:08, 1:09, 1:17, 1:19, 1:30, 1:35, 1:36, 1:51, 1:51, 1:59, 2:03, 2:07

Every tile has its source timestamp burned in (top-left).

## Visual notes

Looked at by Claude (subagent) on 2026-09-28: all 7 sheets, plus 3x crops of single tiles (kept in scratch space only). Zoom factors were measured on the white shelf cubes behind Ben (their width and the gap between them), not on his head, because he leans in and out.

- **Tile times caveat:** these sheets were made before the learn.mjs timestamp fix. A first60 tile shows about its label + 1 s, and an overview tile shows about its label + 9-10 s (checked: the overview tile labelled 1:50 is the cut-sheet frame at 1:59.43). Below, times marked "≈" are corrected tile times, and times with decimals are exact cut-sheet frames.
- **Framing:** one static camera in a medium close-up. Ben is centred (face about 50% across), with his eye line about 47-50% down, the top of his hair about 25-28% down, and his head (hair to chin) about 38-44% of the frame height. He wears black scrubs, and a lavender wall of white shelf cubes fills the rest (cubes at about 19-34% and 64-79% across). This wide shot is home base: about 4 in 5 host-only moments use it (about 40 of the 50 host-only overview tiles, and 42 of the 53 host seconds in the first minute).
- **Punch-ins / zooms:** hard-cut punch-ins that strictly alternate wide and punched (all 16 host jump cuts on the cut sheets toggle between the two). Scale on landing, against the wide at 0:06.233: 1.17 (0:48.667, 1:07.833), 1.25 (1:17.433), about 1.3 (1:34.633, 1:50.767), 1.38 (0:26.133). There is also a tight gag level of about 1.5 (0:05.300, and ≈8:40). Punched shots are short (0.6-2 s: 0:05.30-0:06.07, 1:07.83-1:08.47, 0:48.67-0:49.97, 1:50.77-1:51.33). Wide holds are long (0:56.8-1:07.7, and 1:36.1-1:50.6, about 14 s). Many punched shots keep zooming in (animated push-ins, not static): 0:05.300 about 1.5 becomes 0:06.067 about 1.7; 0:10.167 about 1.15 becomes ≈0:12 about 1.45; and ≈0:43-0:46 goes from the wide to about 1.35 with no cut (the detector found nothing between 0:34.4 and 0:46.07). The zoom holds the eye line about 45-50% down and the face about 50% across. Punch-ins land on phrase boundaries, and the caption changes at the same moment.
- **Reaction layout (the core of this style):** a clip is always shown as the same left-hand split, never full screen and never as picture-in-picture. The clip panel is flush left, full height and about 31.5% of the frame wide, which is a 9:16 clip at full height (0:27.4-0:34.2, ≈3:40-4:10, ≈4:50-5:40, ≈6:40-7:10, ≈9:00-9:20, ≈10:30-11:10, ≈12:20-13:00). The non-9:16 before/after montage (1:51.5-≈3:10) gets a panel about 35.5% wide. Its bottom quarter is soft and blurred, and I can't tell whether that blur is in the source or was added. The panel has a hard vertical edge: no border, gap, rounded corners, shadow or blurred fill behind it. The host fills the rest of the frame: the same camera, shown smaller (about 0.87x the full-screen wide) and moved right so Ben's face sits about 68% across. The split shows more of the room than the wide: the top shelf reaches about 19% down, against about 9% in the wide (compare ≈2:00 with ≈1:10). So the full-screen wide is itself about a 1.15x crop of what the split shows. The host is never punched in while a clip is up (host framing is unchanged across the 1:59-2:07 pairs, and at one scale in all 36 split tiles). Of the 86 overview tiles: host only 50 (58%, about 9 of them with a pop-up graphic), clip plus host 36 (42%), clip only 0. There are eight clip blocks and the layout is identical in every one. This is a real reaction video, not mostly talking to camera. While the clip plays, Ben watches silently on screen, hand on chin and eyes down (≈0:31-0:34, ≈3:40-3:50, ≈12:20-12:30).
- **How clips enter and exit:** into a clip comes at least one frame of full-frame grey TV static with a dark diagonal band (0:27.267 and 1:51.500, both clip entries the cut sheets caught), then a hard cut to the split. Out of a clip is a hard cut straight to the wide host (0:34.233 to 0:34.400). Pauses and holds: the montage's last frame ("Final result...") is identical at ≈2:50, ≈3:00 and ≈3:10 while Ben talks over it, so it is held. At "OKAY LET'S PAUSE" (≈6:50) the clip frame differs slightly from ≈7:00, so I can't confirm a freeze there. Stills lifted from a clip also come back later as small pop-ups over the full-screen host (≈0:35-0:37, "WHEN YOU PAUSE IT"; again ≈0:53-0:54).
- **Captions / on-screen text:** burned-in captions on nearly every talking frame. Style: white, heavy geometric sans-serif, ALL CAPS, thin dark outline or shadow, one line of 1-4 words (the longest seen is 25 characters, e.g. "GET SOME OF THAT DIRT OFF"). Position: bottom centre, baseline about 96% down, cap height about 5% of the frame height. A new cue comes about every second: every 1 fps tile in the first minute has a different caption, and cut-sheet pairs 0.6-1 s apart often share one. In the split layout the captions are centred on the host area (about 65% across), not on the frame. Clip speech is captioned too (≈0:28-0:30 "BEDAZZLED MY RETAINER / BECAUSE I'M A YOUNG" matches the clip's own on-screen text), but many split tiles have no caption (≈3:40, ≈4:50, ≈5:10, ≈6:40). The end words of one caption (≈0:16) are smeared sideways, which suggests the captions animate in; I can't tell how from stills. I saw no coloured keyword highlights, emoji, arrows, circles, numbered counters, chapter cards or lower thirds. The editor adds no @handle or source credit anywhere. Clips keep only their own burned-in text (a TikTok caption, "10th week", "Final result at 1 year and 5 mo", and a creator banner with a subscribe button on the tonsil clip).
- **Graphics and b-roll beyond the clips:** pop-ups appear only over host-only shots, never over the split, and there is no stock b-roll or full-screen cutaway. Seen: a teeth image top-left (≈0:20-0:21); an elephant cutout over the left third with an RGB-split glitch and flying black debris, over a blurred frame (0:03.733-0:05.133, "THE ELEPHANT IN THE ROOM"); a YouTube-style subscriber card top-centre (avatar, channel name, a count climbing to 10M and a red bar filling, fading in at ≈0:22 and held to ≈0:25); clip stills top-left; a glue-bottle cutout (≈0:52); a small photo of Ben top-left (1:07.667); an x-ray card on the left (≈8:00); a gum-box cutout on the right (≈9:30); a throat photo top-left (≈13:20). Social comment screenshots appear as white cards top-right (1:30.400, 1:36.100 sliding in with motion blur, ≈3:20, ≈4:20, ≈10:10, ≈14:10), and once on the left with a meme image (≈11:40). At ≈13:40 Ben holds up a white sheet, and I can't tell whether it is a physical prop or a graphic.
- **Colour and look:** bright, high-key, soft light. A lavender-purple LED wash on white shelves gives a cool-magenta background against warm, tanned skin and black scrubs, with moderate contrast and saturated purples. The look is identical across all 50 host tiles. Clips keep their own look and are not graded to match.
- **Transitions:** hard cuts for every jump cut and clip exit. Beyond those: an opening zoom-blur (0:00.000); a frame blur with the elephant (0:03.733); a full-frame blur between a punched shot and the wide at ≈0:13 (the detector missed it); TV static into clips; pop-ups that seem to animate in (the teeth card changes size between ≈0:20 and ≈0:21; the subscriber card fades in; the comment card at 1:36.100 is motion-blurred), but I can't tell the speed or easing from stills. Nobody has listened to this, so whooshes, static noise, pop sound effects and music are unknown. The meter measured no music bed.
- **Open (the hook, first 27 s):** a zoom-blur into "WHAT'S UP EVERYBODY" (wide, hands up), then:
  - 0:03.7: the elephant cutout with a glitch.
  - 0:05.3: tight about 1.5x, pushing to about 1.7x, on "I'VE GOT FACIAL HAIR".
  - 0:06.2: back to wide.
  - 0:10.2: punch-in that pushes from 1.15 to 1.45.
  - ≈0:13: blur back to wide; Ben pulls his lip to show his own bracket (≈0:14).
  - ≈0:20: teeth pop-up.
  - ≈0:22-0:25: subscriber counter to 10M.
  - 0:26.1: punch about 1.4, "LET'S GET LEARNING".
  - 0:27.3: static, and the first clip in the split.

  That is 4 host framing changes, 3 graphics, 2 blur transitions and the first clip inside 27 s, a new caption every second, then the pattern settles into long wide holds broken by short punches.
- **What a code-built rough cut can copy, and what it can't:**
  - The builder can copy: hard jump cuts on word boundaries; alternating wide and punched framing at 1.25x (style.json); about 5.4 framing changes per minute overall and 8 in the first minute; short caption cues in the SRT (at most 25 characters and 1.5 s).
  - Set in Resolve's subtitle style: ALL CAPS, white, heavy, outlined, bottom-centred.
  - Needs Resolve or motion-design work: the split layout for each clip (panel, host reposition, captions shifted to about 65% across); sourcing and syncing the reacted clips; the static transition; held frames; animated push-ins (a keyframed +0.1-0.2 over 1-3 s); the tight 1.5x gag punches (picked per joke); blur transitions; pop-up images and cutouts with glitch; comment cards; the subscriber counter; caption animation; any sound effects.
  - Known gaps: the builder alternates framing evenly, so it can't make punches short and wides long the way the reference does. Its 1.07 s minimum piece also rules out the reference's 0.6-0.8 s flash punches.
  - Caution: Ben's silent watching time is on screen during clips, and a dead-air pass would cut it. Mark the clip stretches before cutting.
- **Cut detector check (24 cut-sheet pairs):** 23 are real picture changes. The other one is the file's first frame (0:00.000, the opening zoom-blur). The 23 are:
  - 16 host framing jump cuts, all wide to punched or back (0:05.3, 0:06.2, 0:10.2, 0:26.1, 0:46.2, 0:48.7, 0:50.1, 0:56.8, 1:07.8, 1:08.6, 1:17.4, 1:19.3, 1:30.4, 1:34.6, 1:36.1, 1:50.8).
  - 3 layout changes: static into a clip (0:27.3, 1:51.5) and a clip exit (0:34.4).
  - 3 cuts inside a reacted clip's own montage (1:59.4, 2:03.4, 2:07.5).
  - 1 graphic entrance (the elephant, 0:03.7).

  Missed: animated push-ins, the ≈0:13 blur transition, and one wide-to-punched change somewhere in 1:19.3-1:30.2. So 8.06 per minute is a fair count of hard picture changes, but it is not a host rate. Host framing changes run about 5.4 per minute over the runtime (8.06 x 16/24), about 9 per minute inside host-only stretches (16 in the 104 s of 0:00-0:27.3 and 0:34.4-1:51.5), and 0 while a clip is up. The first-minute 12 includes 4 non-host detections. Montage clips inflate the count most (3 detections in 8 s at 1:59-2:07). Beyond 2:07 the split between types is extrapolated from the overview, not checked pair by pair.

**Layout spec** (percentages of the 16:9 frame; x from the left, y from the top; only what the sheets show):
- **Host full screen:** Ben's camera fills the frame. In the wide, his face sits at x 50% with the eye line at y 47-50%. Punched shots use scale 1.15-1.4 (1.25 typical) of the wide, anchored so the eye line stays at y 45-50% and the face at x 50%. A tight gag level is about 1.5. A punched shot may ramp up by +0.1-0.2 over its 1-3 s. Framing alternates wide and punched at each jump cut. The host is never punched while a clip is on screen.
- **Reaction split:** the clip layer sits at x 0 to 31.6% (frame height x 9/16), y 0-100%, a 9:16 source scaled to full height with no crop. Wider sources widen the panel (35.5% seen). The panel has no border, gap, corner radius, shadow or blurred fill. The host layer underneath is the full camera frame at about 0.87x the full-screen wide, translated so Ben's face lands at x ≈68% (layer centre at about x 70%, y 55%), and it is not zoomed during the clip.
- **Transitions:** into the split, 1-3 frames of full-frame TV static. Out of the split, a hard cut to the host wide.
- **Captions:** one line, ALL CAPS, white, heavy sans-serif with a dark outline. Centred at x 50% (full screen) or x ≈65% (split). Baseline at y ≈96%, cap height about 5% of frame height. 1-4 words (25 characters or fewer), about one cue per second.
- **Pop-up cards:** only over the full-screen host.
  - Images: top-left, x 10-38%, y 17-50%.
  - Comment screenshots: white cards top-right, x 62-96%, y 10-22%.
  - Subscriber card: top-centre, x 30-67%, y 11-31%.
  - Object cutouts: anywhere beside the head (e.g. x 20-28% or x 68-88%, y 15-50%), or the whole left third (the elephant).

