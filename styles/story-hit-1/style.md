# Editing style: story-hit-1

Learned from [Something’s Happening to the Ozone Hole](https://www.youtube.com/watch?v=yWgHx0HE8m8) (Cleo Abram, 2026-08-29), analysed 0:00-16:21 (981 s) by `pipeline/style/learn.mjs`. Use it with `node pipeline/resolve/build-timeline.mjs --slug <slug> --style styles/story-hit-1/style.json`.

## Measured

| What | Value |
|---|---|
| Cuts detected (scene score >= 0.12, isolated spikes) | 374 |
| Cuts per minute, overall | 22.87 |
| Cuts per minute, first 60 s | 28 |
| Shot length mean / median | 2.62 s / 1.83 s |
| Shot length p10 / p75 / p90 | 0.67 s / 3.04 s / 5.63 s |
| Shot length histogram | <1s: 59, 1-2s: 151, 2-4s: 99, 4-8s: 52, 8-15s: 14, 15s+: 0 |
| Detector sensitivity (cuts at score threshold) | 0.08: 390, 0.12: 374, 0.2: 348, 0.3: 294, 0.4: 245 |
| Speech pauses kept (>= 0.1 s) | 924 (56.51/min) |
| Pause median / p75 / p90 | 0.17 s / 0.29 s / 0.42 s |
| Share of time below the speech threshold | 22% |
| Audio floor / speech level / threshold | -34.2 / -12.1 / -27.6 dBFS |
| Integrated loudness / LRA / true peak | -13.5 LUFS / 6.5 LU / 1.7 dBTP |
| Music bed likely (pauses not silent and fluctuating) | yes (pause level -32.84 dBFS, std 6.17 dB, -20.74 dB under speech) |

## Edit parameters derived (style.json `edit`)

- Pauses: between sentences keep 0.17 s (cut anything over 0.29 s); inside a sentence keep 0.27 s (cut over 0.42 s). From the median/p90 pause the editor left in.
- Punch-ins: 1.12x on every other segment, hold one framing at most 4 s (p75 shot), no piece shorter than 0.8 s (p10 shot). Scale set after looking at the sheets (see Visual notes).
- Cut rate target: 15 framing changes per minute (set after looking; all detected cuts give 22.87).
- Music bed: -20.74 dB clip gain. Deliver at -13.5 LUFS integrated, true peak 1.7 dBTP.

## Sheets (Read these)

- `styles/story-hit-1/sheets/first60-01.png`: first 60 s at 1 fps, 0:00-0:30 (tile k = 0:00 + k x 1 s, left to right, top to bottom)
- `styles/story-hit-1/sheets/first60-02.png`: first 60 s at 1 fps, 0:30-1:00 (tile k = 0:30 + k x 1 s, left to right, top to bottom)
- `styles/story-hit-1/sheets/overview-01.png`: whole range at 1 frame / 11 s, 0:00-5:30 (tile k = 0:00 + k x 11 s, left to right, top to bottom)
- `styles/story-hit-1/sheets/overview-02.png`: whole range at 1 frame / 11 s, 5:30-11:00 (tile k = 5:30 + k x 11 s, left to right, top to bottom)
- `styles/story-hit-1/sheets/overview-03.png`: whole range at 1 frame / 11 s, 11:00-16:21 (tile k = 11:00 + k x 11 s, left to right, top to bottom)
- `styles/story-hit-1/sheets/cuts-01.png`: cut check 1-12: each pair = 0.1 s before | 0.07 s after a detected cut at 0:01, 0:02, 0:03, 0:04, 0:07, 0:08, 0:10, 0:11, 0:13, 0:14, 0:15, 0:17
- `styles/story-hit-1/sheets/cuts-02.png`: cut check 13-24: each pair = 0.1 s before | 0.07 s after a detected cut at 0:21, 0:22, 0:23, 0:27, 0:29, 0:30, 0:31, 0:33, 0:33, 0:33, 0:34, 0:35

Every tile has its source timestamp burned in (top-left).

## Visual notes

_Caveat (2026-09-28): these sheets predate a fix in learn.mjs. The burned-in time on a first60 or overview tile is the start of its bucket, but the frame is from near the end of it: a first60 tile shows about label + 1 s, an overview tile (1 frame / 11 s) about label + 11 s. Checked against the exact cut sheets and the transcript (the "CAPE TOWN" flight map is on the 2:45 overview tile; "We flew from Cape Town" is said at 2:53). The cut sheets are exact. Tile times below are the burned-in labels so you can find them on the sheet; "real" marks a corrected time._

Filled by Claude (subagent) on 2026-09-28 after reading all 7 sheets, with the reference transcript to line pictures up with words. The source is 854x480 and the tiles are 320 px wide, so zoom factors and small text are estimates.

- **Host on camera (share, framing, locations, angles):** Cleo is recognisably on screen in only 14 of 89 overview tiles (about 16%; 19 of 89, about 21%, if you count wide shots of a small figure that is probably her). She works in two places. (1) A studio "narrator" set, 6 tiles (2:12, 6:25, 6:58, 7:42, 14:18, plus a webcam view of her on the Susan Solomon call at 12:06, which is a different room). It is one locked-off camera. The shot is a medium close-up (head to mid-chest) with almost no headroom (hair touches the top edge). Her eyes sit about 26-37% down the frame and her face is centred to slightly left (41-50% across). Behind her: bookshelves on the left, a white wall with acoustic panels and a small rainbow print top right, a monitor and desk on the right, shallow depth of field. (2) On location in Antarctica, 8 tiles (3:18, 4:13, 4:46, 5:52, 6:03, 13:56, 14:07, 15:46). These are handheld vlog shots, tripod mediums and selfie angles, plus an extreme close-up (5:52), a profile (6:03) and a low angle (first60 0:41). She is always centred, in a red parka or a black beanie. Guests: a two-shot interview on location over her shoulder (8:15), and the Solomon video call with Cleo's webcam as a picture-in-picture box bottom right (5:30, 11:33).
- **Punch-ins / zooms:** In the studio the framing is locked, with a digital punch-in on about half the studio shots. I measured the wall print (a sub-pixel box on its colour). Three tiles line up within 0.3 px: cut sheet 0:00.709, overview 6:58 and 14:18. The other three are 1.10-1.16x bigger and shifted toward her face: 2:12 and 6:25, with 7:42 the tightest at about 1.15-1.2x. Her face varies more (about 1.3x) because she leans in and out. So 1.12x on alternate segments fits, and style.json keeps it. On location, the one host run in the hook (first60 tiles 0:37-0:41, real about 0:37.5-0:43) has three framings in about 5 s. First a medium on take 1. Then take 2, where she is about 1.25x bigger but the horizon and mountains are unchanged and the clouds differ, so it is a different take rather than a zoom. Then a low angle of her pointing up at a composited beam. Stills can't show whether the studio punch-ins are cuts or animated pushes.
- **B-roll / visuals share and types:** 75 of 89 overview tiles (84%) are not the host; 73 if you leave out the two end-card tiles. Breakdown of those 73:
  - Designed graphics, about 49%: 29 motion-graphic or 3D-animation tiles (globes, maps, timelines, charts, molecules); 5 filmed shots with a graphic on top (map pins, a lime arrow, a month grid, the VFX ozone hole in the sky); 2 black-and-white "recreation" photos labelled *ARTISTIC RENDERING (7:53, 8:04).
  - Filmed location b-roll, about 32%: 22 tiles of landscapes, drone aerials, glacier-climb POV, the plane, gear and hikers, plus 1 stock-looking underwater fish shot (14:51).
  - Archival, about 12%: 9 tiles of 1980s TV news, satellite ozone maps, VHS sunbathers, 1950s-60s film and photos, and the treaty signing (15:35).
  - Interviews, about 4%: 3 tiles.
  - Screenshots, about 3%: an email with a highlighted date (6:14) and an Our World in Data map page (12:28).
  - No text-only cards seen.
- **How long visuals stay, and how they relate to the words:** Exact cut times give the durations. The opening location b-roll runs 0.8-2.4 s a shot (15 shots between 0:00.9 and 0:22.9) and archival runs 0.8-1.9 s (0:27.1-0:35). Animations run longer, with the camera moving inside them: the growing red ozone hole holds 4.1 s (0:22.9-0:27.0), and the sequence from the hole in the sky through the globe pull-out and the timeline track to the bar chart runs from about 0:43 to 1:00 real with only a few shot changes. Visuals are literal and in sync, often to the word:
  - "By 2040" and "By 2065" land on the 2040 and 2065 globes.
  - "flip it" lands on the Mercator map (8:37 tile, said 8:47).
  - "over 2 kilometers or 1.3 miles thick" lands on an ice cliff with a Burj Khalifa and Eiffel Tower scale comparison (9:32 tile, said 9:38).
  - "All of this would be underwater" lands on a flooding globe (9:54 tile, said 10:04).
  - "the Russian base" lands on a map pin (11:00 tile, said 11:09).
  Archival news keeps its own sound: the anchors' lines ("The ozone layer still is disappearing...") are in the transcript under the news tiles at 0:27-0:33. Mood shots (the sun flare at 0:35-0:36, empty ice plains) are short breathers between the literal beats.
- **Captions / on-screen text:** There are no burned-in captions of speech anywhere, and no name lower thirds on the three interview tiles (one might appear at a guest's first appearance, but none is visible). All text lives inside the graphics:
  - Lime-yellow label boxes with black bold uppercase (USHUAIA ARGENTINA, CAPE TOWN, the KM / 1.34 MI ice height), and a blue box with white text (RUSSIAN BASE).
  - Lime map pins.
  - Big white year counters beside a vertical gradient scale (1980 at 1:50, 2026 JUNE at 13:01), and lime year labels on the timeline (1985, 1990s, TODAY, 2040, 2065).
  - White bold condensed uppercase labels (FLIGHT TIME: 5-6 HOURS, STRATOSPHERE, MERCATOR PROJECTION, SEA SURFACE TEMP).
  - Tiny source credits bottom left on archival and charts ("SOURCE: ..." on the news clips, "DATA SOURCE: HEGGLIN ET AL (2014) | OUR WORLD IN DATA" on the 12:50 chart, "DATA SOURCE: NASA" on 1:50).
  - A tiny "*ARTISTIC RENDERING" top right on the 3D renders and recreations (0:22, 2:23, 7:31, 8:04, 11:55 among others).
  - A lime "AD" ring badge top left through the sponsor read (tiles 5:52-6:58).
  The typeface is a heavy uppercase sans; I can't identify it at this size.
- **Graphics / graphic language:**
  - Base: a consistent 3D Earth (a photoreal globe on near-black space with a rim glow). Ozone data shows as heat-map colour, red-orange means "bad", and lime outlines and rings point at things.
  - Main device, a timeline: a red "OUR TIMELINE" line on a dark perspective grid with a branching "ALT TIMELINE", and yellow dots and diamonds for 1950, 1959 and 1987. It returns at least five times (1:06, 1:28, 5:41, 10:38, 12:39), plus the row of globes on the line (first60 0:48-0:57) and a VHS-style "REW" rewind overlay on a globe with a 1980-1990 scrubber (4:24).
  - A look per era: a parchment map with flags and pie-slice claims for the 1950s Cold War (7:20, 7:31); black-and-white recreation photos for the 1950 dinner party (7:53, 8:04); archival inside an old film-viewer frame on black with a gold outline at the left (5:08, 5:19, 8:26, 10:27, 11:44, 15:24); a 1970s rainbow-stripe frame around the satellite map (first60 0:30-0:31).
  - Screenshots appear as floating rounded cards with a purple-red glow on dark (12:28), or full frame with a lime highlighter (6:14).
  - Palette: near-black navy, lime-yellow, red/orange, cyan/teal and white.
  - End card: split screen, a dark teal credits side and a pale sage side with the lime show logo and arrows pointing at a round avatar (15:57, 16:08).
  - Movement implied by successive tiles: the hole grows (0:22-0:26), a pull-out from the sky hole to the globe (0:42-0:47), a lateral track along the globe row (0:48-0:57), the bars and arrow build (0:58-0:59), and currents are drawn onto the flipped map (8:48 -> 8:59).
- **Colour and look:** In the studio the look is warm-neutral, with a soft even key, low-to-medium contrast and natural skin. The blue denim jacket is the colour anchor against warm wood and a white wall, with shallow depth of field. On location it is bright, high-key snow with cool blue skies and shadows, and the red parka is the colour pop. Some warm low-sun shots (5:52) and grey overcast shots (13:56-14:07) are left looking natural. Archival keeps its period softness and colour cast. The studio and location looks are not matched to each other; each stays true to its source.
- **Transitions:** All 21 real cuts in the cut check are hard cuts: the frame 0.07 s after the cut is already clean, with no blend. The detector missed one shot change, from the line of climbers to the drone aerial between about 0:18 and 0:19 real, so that one may be a dissolve or a fast move (can't tell). Some transitions are built into the animation instead: the VFX beam and sky hole pull out to the globe (0:41-0:47), and the rewind overlay (4:24). Whooshes and sound effects can't be judged from frames; the audio numbers do show a music bed.
- **Open (first 60 s):** The first minute has about 30 distinct pictures, which matches the measured 28 cuts/min.
  - 0:00-0:00.8: Cleo in the studio says "Ready?" and reaches toward the lens. It is the only studio shot in the first minute.
  - 0:00.9-0:22.9: 15 location shots of 0.8-2.4 s (glacier climb POV and third person, ice plains, a meltwater lake, drone aerials of a roped team) under "I'm scaling a glacier right now... This is Antarctica."
  - 0:22.9: a 3D globe where the red hole appears and grows, on "in 1985 it became the center of a global crisis".
  - 0:27-0:35: an archival montage: two 1980s news anchors with an OZONE LAYER box, the satellite ozone map twice, VHS sunbathers, a woman covering her face. Then a sun flare.
  - About 0:37.5 real: Cleo on the ice in a red parka and white round sunglasses, talking to camera for about 5 s in three framings.
  - Then the VFX hole in the sky and the pull-out to the globe. At about 0:49-0:58 real comes the ALT TIMELINE / OUR TIMELINE track (1985, 1990s, TODAY, 2040, 2065), ending on a rising bar chart for skin cancer at about 0:59.
  The premise (we would be living in "an alternate world" if nothing had been done) is stated visually by that timeline, not by a title card. No title card is visible in the first minute. There is no speech from 1:42 to about 1:58 (music), and the one tile inside that gap (1:39, real about 1:50) is a climbing POV, not a title, though a title could sit elsewhere in the gap.
- **What to copy in the rough cut, and what it cannot do:**
  - Copy: the tight pauses (already measured); the locked medium close-up with about 1.1x punch-ins on alternate segments, anchored near the eyes; a fresh framing each time the host would come back from b-roll; faster framing changes in the first minute; and a sub-second look-to-camera cold open, only if Ben actually records one (nothing invented). Keep text off the host shots.
  - Cannot do: about 84% of this video is b-roll and graphics, and nearly all of its 22.87 cuts/min are picture changes in that layer. That layer needs a motion designer (the globe, maps, the timeline device, charts with source lines, VFX composites), archival licensing (news clips with their own sound), screenshots, and in Cleo's case a location shoot. Her credits (15:57 tile) list a creative director + lead animator, a second animator, two editors, a director of photography and a drone pilot.
  - For Ben (talking head plus animation only, no demos or trips; docs/ben-rules.md), the 32% location share has to become animation, archival, stock or screenshots of papers. The many on-screen years and figures here also need cutting down to his "about six numbers on camera" bar.
- **Cut-detector check (cuts-01/02: the first 24 detected cuts, 0:00.7-0:34.9):** 21 are real picture changes:
  - 1 host to b-roll: 0:00.709 studio -> 0:00.918 climbing POV.
  - 13 location b-roll to b-roll: 0:02.1 through 0:21.6.
  - 7 involving animation, archival or a graphic re-frame: 0:22.7 aerial -> globe, 0:26.9 globe -> news, 0:28.9 anchor -> anchor, 0:29.8 anchor -> satellite map, 0:30.8 map -> the same map in the retro frame, 0:32.4 map -> sunbathers, 0:33.8 sunbathers -> woman covering her face.
  - 3 are false, all inside the grainy VHS sunbather clip: 0:32.7 (a foreground passer-by), 0:33.3 and 0:34.7 (no visible change).
  None of the 24 is a host framing change, and one real change was missed (about 0:18-0:19). So the measured 22.87/min and 28/min are almost entirely b-roll and graphic changes. If the 1-in-8 false rate held everywhere, real picture changes would be about 20 a minute. The false ones were all in grainy archive, though, so the true rate is probably between 20 and 23 a minute. Nothing after 0:35 was checked.
- **B-roll spec (for a producer):**
  - Pace: about 20-23 picture changes a minute (about 28 in the first minute), so a new visual every 2-3 s.
  - Host: on screen only about 16-20% of the time, in short appearances (the hook's location run is about 5 s; the "Ready?" open is under 1 s), each in a fresh framing.
  - Mix of the non-host time in this video: about 49% designed graphics (40% motion graphics/3D, meaning a recurring globe, a recurring timeline device, maps with lime label boxes and pins, and charts with source lines; 7% text, pins or arrows on footage; 3% labelled recreation stills), about 32% filmed b-roll, about 12% archival (news bites keep their own sound; all archival sits in one framed template), about 4% interviews, about 3% screenshots with a lime highlighter.
  - Durations: filmed and archival shots 1-2.5 s; animations 4-10 s, up to about 15 s when the camera travels through them.
  - Text: only inside the graphics. Labels go on the object, years as big white numbers, the source credit tiny bottom left, and "*ARTISTIC RENDERING" top right on renders. No burned captions and no lower thirds over the host.
  - Every visual illustrates the exact noun or number being said.
  - For Ben, the filmed-b-roll share moves to animation, archival, stock or paper screenshots.

Adjusted in style.json after looking:
- `edit.cutRate.targetCutsPerMin` 22.87 -> 15. The measured rate is b-roll and graphic changes, so the A-roll holds one framing up to maxHoldSec 4 s (about 15 changes a minute) and the b-roll layer supplies the rest.
- `edit.punchIn.scale` 1.12 confirmed, recorded as 1.12 -> 1.12 (about 1.1x measured on the wall print).
- `edit.cutRate.targetCutsPerMinFirst60` 28 kept: the one host run in the hook changes framing about every 1.7 s.

