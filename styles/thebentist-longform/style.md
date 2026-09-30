# Editing style: thebentist-longform

Learned from [Is soda ACTUALLY bad for your teeth??](https://www.youtube.com/watch?v=q8regjBdFxo) (The Bentist, 2026-09-04), analysed 0:00-12:37 (757 s) by `pipeline/style/learn.mjs`. Use it with `node pipeline/resolve/build-timeline.mjs --slug <slug> --style styles/thebentist-longform/style.json`.

## Measured

| What | Value |
|---|---|
| Cuts detected (scene score >= 0.12, isolated spikes) | 104 |
| Cuts per minute, overall | 8.24 |
| Cuts per minute, first 60 s | 13 |
| Shot length mean / median | 7.28 s / 3.87 s |
| Shot length p10 / p75 / p90 | 0.87 s / 11.3 s / 19.8 s |
| Shot length histogram | <1s: 14, 1-2s: 28, 2-4s: 11, 4-8s: 16, 8-15s: 19, 15s+: 16 |
| Detector sensitivity (cuts at score threshold) | 0.08: 108, 0.12: 104, 0.2: 93, 0.3: 82, 0.4: 28 |
| Speech pauses kept (>= 0.1 s) | 630 (49.93/min) |
| Pause median / p75 / p90 | 0.16 s / 0.27 s / 0.43 s |
| Share of time below the speech threshold | 20% |
| Audio floor / speech level / threshold | -47.7 / -23.8 / -40.5 dBFS |
| Integrated loudness / LRA / true peak | -24.3 LUFS / 7.6 LU / -1.3 dBTP |
| Music bed likely (pauses not silent and fluctuating) | yes (pause level -46.44 dBFS, std 6.52 dB, -22.64 dB under speech) |

## Edit parameters derived (style.json `edit`)

- Pauses: between sentences keep 0.16 s (cut anything over 0.28 s); inside a sentence keep 0.26 s (cut over 0.41 s). From the median/p90 pause the editor left in.
- Punch-ins: 1.3x on every other segment, hold one framing at most 11.3 s (p75 shot), no piece shorter than 0.87 s (p10 shot). Scale set after looking at the sheets (see Visual notes).
- Cut rate target: 7 framing changes per minute (set after looking; all detected cuts give 8.24).
- Music bed: -22.64 dB clip gain. Deliver at -24.3 LUFS integrated, true peak -1.3 dBTP.

## Sheets (Read these)

- `styles/thebentist-longform/sheets/first60-01.png`: first 60 s at 1 fps, 0:00-0:30 (tile k = 0:00 + k x 1 s, left to right, top to bottom)
- `styles/thebentist-longform/sheets/first60-02.png`: first 60 s at 1 fps, 0:30-1:00 (tile k = 0:30 + k x 1 s, left to right, top to bottom)
- `styles/thebentist-longform/sheets/overview-01.png`: whole range at 1 frame / 9 s, 0:00-4:30 (tile k = 0:00 + k x 9 s, left to right, top to bottom)
- `styles/thebentist-longform/sheets/overview-02.png`: whole range at 1 frame / 9 s, 4:30-9:00 (tile k = 4:30 + k x 9 s, left to right, top to bottom)
- `styles/thebentist-longform/sheets/overview-03.png`: whole range at 1 frame / 9 s, 9:00-12:37 (tile k = 9:00 + k x 9 s, left to right, top to bottom)
- `styles/thebentist-longform/sheets/cuts-01.png`: cut check 1-12: each pair = 0.1 s before | 0.07 s after a detected cut at 0:00, 0:04, 0:06, 0:07, 0:10, 0:12, 0:18, 0:20, 0:38, 0:44, 0:46, 0:57
- `styles/thebentist-longform/sheets/cuts-02.png`: cut check 13-24: each pair = 0.1 s before | 0.07 s after a detected cut at 0:58, 1:04, 1:05, 1:33, 1:34, 1:42, 1:43, 1:50, 1:52, 1:55, 1:56, 2:07

Every tile has its source timestamp burned in (top-left).

## Visual notes

_Caveat (2026-09-28): these sheets predate a fix in learn.mjs. A first60 tile shows about label + 1 s and an overview tile about label + 8 s (1 frame / 9 s, the frame from near the end of each bucket); the cut sheets are exact. The observations hold; tile times below can be up to that much early._

_Kept from the previous run and re-checked on 2026-09-27 against the sheets regenerated from the H.264 re-download: same 104 cuts, same frames._

Filled by Claude on 2026-09-27 after reading all 7 sheets (480p download, so fine detail and exact zoom factors are estimates).

- **Framing (wide/medium/close, headroom, where the eyes sit, background):** One locked-off camera. The wide is a medium shot: Ben centred, black scrubs with the "Dr. Benjamin Winters Orthodontist" logo, a black foam podcast mic at bottom centre, head in the upper third with a little headroom, eyes about 35-40% down the frame. Background is the white cube shelving with product boxes, trophies and the figurine on the top right shelf, lit lavender/pink.
- **Punch-ins / zooms (used? how tight? how often? on jump cuts or mid-sentence?):** Yes, constantly, and they are the main source of cuts. Nearly every jump cut changes framing between the wide and a tight single (face roughly 1.3-1.5x bigger than the wide, chin to crown filling about 60% of the height; e.g. 0:05.6 wide -> 0:05.7 tight, 0:06.7 tight -> 0:06.8 wide, 0:43.8 -> 0:43.9). A few extra-tight punches (~1.6x) land on gross-out reactions (0:44, 4:03, 4:30). All 24 detected cuts in the cut-check sheets are real picture changes; 20 of them are Ben-to-Ben zoom changes, the rest are clip/graphic entrances and wipes. Static zooms only; no slow push-ins visible.
- **Captions / on-screen text (burned-in captions? keyword pop-ups? font, colour, position):** No burned-in captions of Ben's speech anywhere. The only text is inside the reacted-to clips (their own TikTok captions/handles) and comment screenshots.
- **B-roll / cutaways share (roughly what % of tiles are not the talking head? what kind: clips, screenshots, stock, animation):** Ben is on screen in every tile; nothing is full-screen b-roll. The reacted-to vertical clip sits in a panel on the left third (full height) in about 24% of overview tiles (20 of 84); pop-up images/comment cards in about 17%; Ben alone about 60%.
- **Graphics (lower thirds, arrows, circles, emoji, progress bars, chapter cards):** Small cut-out pop-ups top left, near Ben's head: a 2026 calendar with August circled in red (0:04-0:07), a glass of milk (0:54-1:05), rotten-teeth photos (0:47-0:55, 1:30), a panoramic X-ray bottom left (2:33), a denture image (6:00), teeth close-ups (7:03, 9:09). TikTok/YouTube comment screenshots as white cards top left (1:57, 3:45, 7:48, 9:27, 9:36, 11:51, 12:09). One red animated SUBSCRIBE button lower centre (6:36). No lower thirds, arrows, progress bar or chapter cards seen.
- **Colour and look (warm/cool, contrast, saturation, skin tone, lighting):** High-key and bright, soft contrast, cool lavender/magenta background against warm skin, fairly saturated. Consistent across the whole video (no grade changes), except a one-off black-and-white gag frame at 0:02-0:03.
- **Transitions (hard cuts only? whooshes, zoom transitions, flashes):** Hard cuts almost everywhere. A purple + black panel wipe brings each reacted-to clip in (0:19.7, 1:56.0, also visible at 3:27 and 8:24). The open uses a motion-blur whip (0:00) and a white flash (0:01). Sound effects cannot be judged from frames.
- **Open (what happens in the first 10 s visually):** Cold open straight to camera with a blur whip, a flash, a black-and-white gag frame, then a calendar pop-up at 0:04, with a framing change every 1-2 s (13 cuts/min in the first minute vs 8 overall). First clip arrives at 0:19 via the purple wipe.
- **What to copy in the rough cut, and what the rough cut cannot do (left for Resolve / motion-designer):** Copy: tight pauses (median 0.16 s kept), a framing change on every jump cut, a strong punch-in (style.json now uses 1.3x; the 480p source cannot show whether 1.4-1.5x is really used, so check against Ben's 4K raw), faster cutting in the first minute. Cannot do in the FCPXML: the left-third clip panel layout, the purple wipe, the whip/flash open, pop-up graphics and comment cards (motion-designer scenes on V2+ or Resolve templates), and sound effects.

Adjusted in style.json after looking: `edit.punchIn.scale` 1.12 -> 1.3 (observed 1.3-1.5x) and `edit.cutRate.targetCutsPerMin` 8.24 -> 7 (about 20 of 24 checked cuts are Ben-to-Ben framing changes; the rest are clip and graphic entrances the rough cut does not make).
