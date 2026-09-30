# Resolve import: tested result

DaVinci Resolve Studio 21.1 on Windows, through the Resolve MCP (API route), 2026-09-27. `/resolve-edit` reads this instead of rerunning the smoke test. Rerun it (and update this file) after a Resolve upgrade.

## Status: all three test timelines import exactly as planned

`node pipeline/resolve/check-import.mjs` compares Resolve's own report (`resolve-verify.json`) with the plan, frame by frame. Every check passes on:

| Timeline | Project | Clips | Result |
|---|---|---|---|
| `resolve-smoke 30` (`smoke.fcpxml`) | resolve-smoke | 3 A-roll, 1 overlay, 1 music, 3 markers | 7/7 PASS |
| `resolve-smoke 2997` (`smoke-2997.fcpxml`, 30000/1001) | resolve-smoke-2997-b | same | 7/7 PASS |
| `resolve-test-full AI rough cut 0927-2217` (3:06, 854x480 @ 30) | resolve-test-full | 27 A-roll (13 punched in), 3 scenes, 2 music beds, 5 markers | 7/7 PASS |

Frames exported from Resolve (`ExportCurrentFrameAsStill`) and looked at: `frames/` (smoke: source timecode, zoom, alpha overlay) and `videos/resolve-test-full/out/resolve-frames/side-*.jpg` (Resolve left, `preview.mp4` right: lower-third + verdict stamp with alpha, a 1.3x punch-in, the full-screen mechanism scene, a plain segment). They match. **Nobody has listened to the audio**; music gain is checked from the clip property only.

## What the MCP import keeps and drops

| Feature | Kept? | How we know |
|---|---|---|
| Cuts, source ranges, timeline start 01:00:00:00 | yes | verify frames = plan; burned-in SOURCE TC in the smoke frames |
| `adjust-transform` zoom + position | yes, even without a "use sizing information" switch | ZoomX/Y 1.25, Pan 108 / Tilt 54 px (+y up); zoomed frames |
| `adjust-volume` | yes | AudioVolume -12 (smoke), -22.64 (full) |
| ProRes 4444 alpha overlay | yes | clip Alpha mode Straight; test pattern / footage visible around the box |
| Lanes -> tracks | yes, with one clip per audio lane (below) | |
| Markers (`<marker>`, `<chapter-marker>`, to-do) | **dropped, all of them** | 0 timeline, clip or media-pool markers |
| `<caption>` elements | **ignored** | no subtitle track (scratch variant G) |
| Captions as SRT | only into the media pool | see Captions |

## Resolve quirks, and what the pipeline does about them

1. **Two or more clips on one audio lane scramble the audio tracks.** With music looped as 16 copies per lane, Resolve put 1 dialogue clip on A1, 1 on A2 and 25 on A4, with the music split across A2 to A4. Two separate stingers on one lane did the same. One clip per audio lane is always clean. Fix: `fcpxml.mjs` gives every audio clip its own lane and its validator refuses to write two on one audio lane; `build-timeline.mjs` loops a short bed into one `out/<name>.loop.wav`. Scratch variants: `_scratch/resolve-variants/` A to F.
2. **A clip's source `start` is rounded down in floating point.** `start="1307/10s"` at 30 fps (frame 3921) came in as frame 3920 (130.7 x 30 = 3920.9999999999995), so clip 16 of the full test started and ended one frame early. Fix: `framesToTime(..., nudge)` writes such a start 1/1000 of a frame late (`3921001/30000s`). Only source and marker starts are nudged: offsets and durations were read correctly even where the same product lands short (29.97 variant H), and nudging them made Resolve scatter the dialogue at 29.97. At 29.97 many starts need the nudge (4 of 21 times in the smoke timeline), so camera and phone footage depends on this.
3. **Markers are dropped.** Fix: `resolve-markers.py` (template `pipeline/resolve/add-markers.py`) adds them as clip markers on the A-roll clip under each one, so they move with the material when a retake is ripple-deleted. Clip-marker frame ids are source frames of the clip's media: `GetSourceStartFrame() + offset` (confirmed with Resolve's own OTIO export). Colours: blue chapter, red CHECK JOIN, yellow RETAKE?, cream filler/stutter. customData `yt-suite:mNNN`; a second run adds nothing.
5. **Audio stems in the FCPXML scramble the dialogue, even one clip per lane** (2026-09-28, `bad-breath-for-good`, 316-clip 4K timeline). With the TikTok audio, score and SFX stem as connected audio (one clip per lane, all starting at 0), Resolve put 1 dialogue clip on A1 and 315 on A4 with the TikTok audio; with only the TikTok audio, 1 on A1 and 316 on A2. It happened whether or not the first clip had a -96 dB gain and whatever the video lanes were. A picture + dialogue import is clean (all 316 on A1). Fix: `assemble.mjs` keeps every stem out of the FCPXML (`--fcpxml-stems none`, the default) and lists them in `out/final/stems.json`; `resolve-stems.py` (template `add-stems.py`) adds each on a new track with `MediaPool.AppendToTimeline([{mediaPoolItem, startFrame: 0, endFrame, mediaType: 2, trackIndex, recordFrame}])`, which lands exactly (start frame checked). Audio-only media reports an empty `"Frames"`; take the length from `"Duration"`. `TimelineItem.SetProperty("Volume", dB)` returns False on those items: set stem levels in the file.
6. **Position of a clip that is not the timeline size is scaled.** A 1080x1920 clip fitted into 3840x2160 moved by Pan x 0.316 (= 1080 x 1.125 / 3840): `position -1300` px moved it 412 px. Full-frame renders (3840x2160 graphics) are not affected; for a foreign-size clip set `Pan` on the item (`-4150` put the TikTok flush left).
4. **Captions cannot be placed by script.** `AppendToTimeline` with a subtitle clip adds nothing without a subtitle track, puts the cues at the timeline's end with one (recordFrame is ignored), and **crashed Resolve** when given startFrame/endFrame. So `resolve-import.py` only imports `captions.srt` into the media pool and says so; the user drags it to 01:00:00:00.

## API facts

- Marker colours must be strings ("Blue"). `resolve.MARKER_*` constants are floats and `AddMarker` returns False with them.
- `Timeline.AddMarker` frame ids count from the timeline start (0 = 01:00:00:00).
- `Timeline.Export(..., EXPORT_FCPXML_1_10)` writes a bundle directory (`Info.fcpxml` inside) with no markers; `EXPORT_OTIO` keeps clip markers in source time.
- `project.SetSetting("timelinePlaybackFrameRate", ...)` returns False on a new project; the timeline rate setting works.
- `launch_resolve` can time out at 60 s while Resolve is still starting; a first-run Welcome window blocks scripting until closed.
- A script killed by the MCP's timeout can take Resolve down (it did once, mid subtitle experiment). The projects were saved; keep calls short.

## Finishing and rendering through the API (2026-09-28)

- `TimelineItem.AddTransition({type: "Cross Fade 0 dB", category: "audio", position: "start", alignment: "center", duration: 2})` on the incoming A1 clip puts a 2-frame audio-only crossfade across the seam (frames 108206-108208 around a cut at 108207); clip boundaries and video are untouched. Transitions then show up in `GetItemListInTrack` with `GetType() == "transition"`: every script filters them out.
- `TimelineItem.SetFades({FadeIn, FadeOut})` in frames works on music clips.
- Render: `LoadRenderPreset("Audio Only")` + `SetRenderSettings({ExportVideo: False, ExportAudio: True, AudioCodec: "lpcm", AudioBitDepth: 24, AudioSampleRate: 48000, ...})` renders a WAV (6 minutes in about 28 s). `SetCurrentRenderFormatAndCodec("wav", "lpcm")` returns False and is not needed.
- **After the Audio Only preset, a "delivery" render set with `SetCurrentRenderFormatAndCodec("mp4", "H265_NVIDIA")` and `ExportVideo: True` still came out audio-only** (13.9 MB, no video stream, while every call returned True). Loading a video preset first (`"YouTube - 2160p"`) fixes it. `resolve-render.py` now reads the queued job back (`GetRenderJobList()`: `IsExportVideo`, `IsExportAudio`, `VideoCodec`) and deletes a job of the wrong kind before starting, and `check-deliver.mjs` probes the file.
- `StartRendering` returns at once; poll `GetRenderJobStatus(job)` with short calls.

## Real footage (2026-09-28): `videos/real-0902-excerpt`

6 minutes of Ben's 4K 30 fps camera file (live comment session, 2 Sept) through the whole route: transcribe --edit, clean-audio, frame-grid anchor, build with `thebentist-longform`, import, markers, finish, QA render, verify, check-import, qa-render. Final run: 67 clips (32 punched in around the eyes), 6 fillers and 1 stutter cut after try-and-listen, 20 markers, 66/66 crossfades; check-import 8/8 PASS; render exact to the frame, -16 LUFS / -1.7 dBTP, 0/37 cuts with a click, 0 missing words within 0.6 s of any seam, every "um" still in the render one that was left on purpose. Bugs this found and fixed: three wrong take cuts (parallel phrasing, a list, two clauses), fillers cut in the silence next to the "um", short fillers never removed, the 25 ms noise-reduction delay, the dynamic loudnorm pumping room tone, and the audio-only delivery.

## Not verified yet

- The manual File > Import > Timeline dialog route ("Use sizing information", markers there).
- 25, 24, 23.976, 59.94 and 60 fps; media with embedded start timecode (camera files); a real 20-minute take (run time of the MCP scripts on ~300 clips).
- How any seam sounds.

## Test projects in Resolve (safe to delete)

`resolve-smoke`, `resolve-test-full` (also holds scratch variant timelines A to G and two earlier imports), `resolve-smoke-2997` (the pre-fix 29.97 import and variants H, I), `resolve-smoke-2997-b`.
