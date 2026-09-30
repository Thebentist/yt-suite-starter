# Editing in DaVinci Resolve: timeline files first, MCP second

**The short version.** Claude decides the edit in code and writes an **FCPXML 1.10 timeline file** that points at the original raw take. Ben imports it with File > Import > Timeline. After that, the **Resolve Studio MCP** checks the result and handles the jobs a file can't carry. The file stays the source of truth for the cuts.

## Why a timeline file and not "Claude drives Resolve"

- The install at `E:\davinci` is **Resolve 21.1 Studio**. The FCPXML import works the same way in free and Studio, so this route works on any machine.
- The Resolve scripting API **can't blade at an arbitrary time** and **has no keyframe API**. You can't make a jump cut through the API. You can make one in a timeline file.
- FCPXML (Resolve imports 1.8 to 1.10) carries clips, source in/out, lanes, markers and, on paper, static transforms and clip volume. OTIO carries clips, tracks and markers but not transforms. So FCPXML is the target.
- The cut is built from the **original raw file**, never from a re-encoded cut. Every clip keeps full handles, so Ben can drag any edit point open again.
- Every import creates a **new** timeline, so the old one is never changed. The timeline name carries a date stamp.

## Pipeline

```
raw/take.mp4 --transcribe --edit--> raw/transcript.words.json   (plain whisper timing + a prompted pass's punctuation/fillers)
      |------ pipeline/edit/clean-audio.mjs --> work/take.clean.mov  (video copied, dialogue levelled, sync proven)
      |------ pipeline/resolve/frame-grid.mjs --> work/grid.jpg      (Claude reads the eyes: --anchor x%,y%)
      v
pipeline/resolve/build-timeline.mjs  <-- styles/<name>/style.json (learned by /edit-style from a reference)
      |   takes.mjs: fillers / stutters / false starts cut only where safe, then treated as silence
      |   audio decides silence (10 ms RMS of the raw audio); words veto and classify; punch-ins around the eyes
      v
videos/<slug>/out/ timeline.fcpxml  timeline-spec.json  takes.json  joins.json  captions.srt  chapters.txt  IMPORT.md
                   resolve-import / -markers / -finish / -render / -verify / -deliver / -punchins .py
      |
MCP: import -> markers -> finish (2-frame crossfades) -> render (QA WAV) -> verify
      -> check-import.mjs (every line PASS) -> qa-render.mjs (duration, loudness, clicks, re-transcription) -> stills
      |  Ben polishes, then File > Export > Timeline > FCPXML
      v
pipeline/style/diff.mjs  ->  what he changed + a suggested style.json patch
```

## Commands

| Command | What it does |
|---|---|
| `node pipeline/resolve/build-timeline.mjs --slug <slug> [--style styles/<name>/style.json]` | Rough cut. Also `--raw <file> --words <words.json> [--out <dir>]`, `--no-punch`, `--no-music`, `--no-overlays`, `--threshold <dBFS>`, `--chapters <json>`, `--name <timeline>`. Prints raw/cut duration, joins, punch-ins and markers. |
| `node pipeline/resolve/preview.mjs --spec videos/<slug>/out/timeline-spec.json` | Renders the exact same timeline (frame-quantised) to `out/preview.mp4` at 720p, with punch-ins, overlays and music at their static gain, and burns in the timeline TC and segment number. |
| `node pipeline/resolve/smoke.mjs [--fps 29.97] [--preview] [--no-media]` | Synthetic media plus `renders/resolve-smoke/smoke.fcpxml`, `EXPECTED.md` and the MCP scripts. `--no-media` keeps the existing media (Resolve holds it open once imported). |
| `node pipeline/resolve/check-import.mjs --spec videos/<slug>/out/timeline-spec.json` | Compares `resolve-verify.json` (what Resolve built) with the plan, frame by frame: timeline, A-roll V1/A1 with zooms, dialogue only on A1, overlays, music clips and gain, markers. PASS/FAIL per line, exit 1 on any FAIL. |
| `node pipeline/edit/transcribe.mjs --in <raw> --out <prefix> --edit --prompt "<channel transcribe_prompt>"` | Word timings for the editor: plain pass for timing, prompted pass for punctuation and fillers, merged by text (`pipeline/edit/words-merge.mjs`). Without `--edit` the output is unchanged (the voice pipeline uses that). |
| `node pipeline/edit/clean-audio.mjs --in <raw>` | Dialogue levelled before the cut: high-pass, compressor, static gain to -16 LUFS, latency-compensated limiter at -1.5 dBTP; noise reduction (with its 25 ms delay compensated) and an expander only when speech-to-room-tone < 40 dB. Writes `work/<raw>.clean.mov` + `.json` and refuses it unless sync is sample-exact and the length identical. |
| `node pipeline/resolve/frame-grid.mjs --in <raw>` | Frames with a labelled 10% grid; Claude reads the eyes for `--anchor`. |
| `node pipeline/resolve/check-deliver.mjs --slug <slug>` | Checks the newest file in `out/deliver/` before upload: a video stream at the timeline size and frame rate, duration to the frame, audio, loudness, bit rate; writes a frames strip to look at. |
| `node pipeline/resolve/qa-render.mjs --slug <slug>` | The automated listen on Resolve's QA render (`out/qa/qa-mix.wav`): duration to the frame, loudness, clicks at every seam, and a fresh transcription aligned with the kept words (missing / extra words near seams vs elsewhere, every filler still heard classified: CUT MISSED, left on purpose, new). |
| `node pipeline/style/learn.mjs --url <yt url> --name <style>` | Measures a reference edit (cuts/min, shot lengths, kept pauses, loudness, music bed) and writes contact sheets. Claude then **looks** at them and fills `style.md` > Visual notes. |
| `node pipeline/style/diff.mjs --ours out/timeline-spec.json --theirs <export.fcpxml / .edl / resolve-verify.json>` | Shows what the human changed: pauses tightened or loosened, segments removed or restored, markers acted on, punch-ins added or rescaled. Suggests a style patch and never writes it. |

The library is `pipeline/resolve/fcpxml.mjs`. Its header documents the timeline-spec JSON. It works in whole frames (30, 29.97 = 30000/1001, 25, 24, 23.976, 60, 59.94), uses file:/// URLs with Windows drive letters, and validates every time on the frame grid and the XML well-formedness before it writes anything.

## How the rough cut decides (dead-air pass only)

1. **The audio decides where silence is. Words only guide.** whisper.cpp tokens run back to back, so the gaps between them mean nothing, and whisper often stretches a word across a pause.
2. Silences longer than the allowed pause are shortened. The limits are tighter between sentences than inside them. The kept pause stays on the outgoing side. The incoming clip starts `headPad` (40 ms) before the first phoneme, which trims the 2 to 5 idle frames. A threshold 6 dB lower protects quiet word tails and onsets. Cut frames round outward, so quantising never clips a word.
3. If whisper hears a word inside a silence **and** there is quiet sound under it, the sound is kept and the join gets a `CHECK JOIN` marker.
4. **Takes** (`pipeline/resolve/takes.mjs`, style `edit.takes`: `cut` | `mark` | `off`). Ben's published edits have no "um"s (0 in 3.6 min vs 1.3/min in his raw), so by default: fillers are cut where the audio shows a separate voiced blob near whisper's time (snapped to the sound; whisper was 0.25-1.2 s off on real footage); a stutter keeps its last occurrence (never emphasis words like "really really", never across a comma); a false start is cut only when its first attempt adds nothing new (the repeat follows at once, or only fillers between). Anything that carries its own words ("when you get rid of X, you get rid of Y", "we've done lab studies, we've done…") is parallel phrasing or a list far more often, so it is only a `RETAKE?` marker. Every removal is silenced and then goes through the pause rules below, and is always removed even when the gap is short. `takes.json` lists every cut and every kept item with why.
5. Punch-ins are static zooms on alternate segments (1.12x by default, 1.3x in `thebentist-longform`), centred on the eyes (`--anchor`), so the face keeps its screen position and only gets bigger. Long stretches get a through-edit at a word boundary so the framing still changes.
6. Every cut is a straight cut through picture and sound. Scenes go on V2 and up, music on A2 and down, **one clip per audio track**: a bed shorter than the cut is looped into one `out/<name>.loop.wav` rather than laid as copies (Resolve scatters the dialogue otherwise; the FCPXML validator refuses two clips on one audio lane).
7. `joins.json` holds one record per join: timeline TC, source ranges, the words on either side, the silence found, the pause kept and any flags. Every record says `"listened": false`.

**Measured on a synthetic take** (Ben's video with 39 s of dead air, a false start and head/tail idle time inserted at known places): 86% of the inserted dead air was removed, about 0.2 s was kept per gap, **no audio above the threshold was removed**, and the false start was flagged `RETAKE?`.

## What the smoke test proved (Resolve Studio 21.1, 2026-09-27)

`renders/resolve-smoke/EXPECTED.md` lists what should appear; `renders/resolve-smoke/RESULT.md` records what did, through the MCP import, at 30 and 29.97 fps and on the 3-minute `videos/resolve-test-full` cut. In short:

- **Kept by the API import:** cuts and source ranges, `adjust-transform` zoom and position (in pixels, +y up, even though the API has no "use sizing information" switch), `adjust-volume`, ProRes 4444 alpha, lanes as tracks.
- **Dropped:** every marker (plain, `chapter-marker`, to-do) and `<caption>` elements. `resolve-markers.py` adds the markers back; captions need one drag by hand.
- **Resolve quirks the pipeline now works around:** (1) an audio lane holding two or more clips makes Resolve scatter the dialogue across audio tracks, so each audio clip gets its own lane and music loops are rendered to one file; (2) Resolve rounds a clip's source `start` down in floating point (`1307/10s` at 30 fps became frame 3920, not 3921), so a start that would lose a frame is written 1/1000 of a frame late; offsets and durations are read correctly and are never nudged (nudging them scattered the audio at 29.97).
- **Still unverified:** the manual File > Import > Timeline dialog route (markers and sizing may behave differently there), 25/24/23.976/60 fps, and media with embedded timecode (camera files). Nobody has listened to a seam.

## The MCP layer (Resolve 21.1 Studio)

**Setup.**
1. In Resolve, File > Setup AI Assistants registers Resolve's native `ResolveMCP.exe` (stdio) for Claude Code. It is registered for this project in `.mcp.json` as **`davinci-resolve`** and has to be approved in a new Claude Code session.
2. Set Preferences > System > General > **External scripting using = Local**.
3. External Python scripts need these environment variables (not needed for the MCP's own Python):
   - `RESOLVE_SCRIPT_API=%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting`
   - `RESOLVE_SCRIPT_LIB=E:\davinci\fusionscript.dll`
   - `PYTHONPATH += %RESOLVE_SCRIPT_API%\Modules\`

The community server samuelgursky/davinci-resolve-mcp would need python.org 3.12 x64, so the native server is the one to use.

**Tools.**
- `run_script`: sandboxed Python 3.14. No os, sys or file access. `resolve` and `project` are already defined. Assign to `result` to return data. Default timeout is 10 s.
- `run_script_unsafe`: full access. Needed to read files from disk.
- `get_scripting_api` and `search_scripting_api`: the 21.1 `.pyi` stubs. Check them before writing a new call.
- Also `launch_resolve`, `get_resolve_status` and the LUT/DCTL tools.

**Our scripts.** The templates live in `pipeline/resolve/`. `build-timeline` writes filled copies into `out/`.

| Script | Tool | Job |
|---|---|---|
| `resolve-import.py` (import-timeline.py) | run_script_unsafe | `MediaPool.ImportTimelineFromFile(fcpxml, {importSourceClips})`, then imports `captions.srt` into the media pool and returns `captionsTodo` (the user drags it to 01:00:00:00). |
| `resolve-markers.py` (add-markers.py) | run_script | Adds every planned marker as a clip marker on the A-roll clip under it (frame id = the clip's source frame: `GetSourceStartFrame() + offset`), colour by kind (blue chapter, red CHECK JOIN, yellow RETAKE?, cream filler/stutter), tagged `yt-suite:mNNN` in customData so a second run skips them. Refuses if V1 no longer has the rough cut's clip count. |
| `resolve-verify.py` (verify-timeline.py) | run_script_unsafe | Per-track items with start/end, source in/out, ZoomX/Y, Pan/Tilt, Opacity, AudioVolume and file; timeline markers and `clipMarkers` placed on the timeline. Saves `out/resolve-verify.json` itself and returns a summary (under `run_script` it cannot save and returns everything). Then `check-import.mjs`. |
| `resolve-punchins.py` (apply-punchins.py) | run_script | Only for a timeline whose clips came in at Zoom 1.0 (not needed after the MCP import on 21.1). Sets ZoomX/ZoomY/Pan/Tilt, matching clips by timeline start frame; refuses if the track no longer matches the rough cut. |

**API facts learned the hard way (21.1).** Marker colours must be name strings ("Blue"); the `resolve.MARKER_*` constants make `AddMarker` return False. `Timeline.AddMarker` frame ids count from the timeline start. `AppendToTimeline` ignores `recordFrame` for subtitle clips (they land at the timeline's end, or nowhere without a subtitle track) and crashed Resolve when given a source range. `Timeline.Export` to FCPXML leaves markers out; `EXPORT_OTIO` keeps clip markers in source time. A script killed by the MCP timeout mid-call can take Resolve down, so keep each call short.

**Division of labour.** The MCP imports, adds markers, verifies, and handles fades, normalising, transitions (21.1 API) and the render queue when asked. **It does not make the cuts.** The FCPXML does.

## The learning loop

1. `learn.mjs` on a reference edit gives the numbers and the sheets. Claude reads the sheets and writes the Visual notes.
2. `build-timeline --style ...` produces the rough cut.
3. Ben polishes and exports FCPXML.
4. `diff.mjs` shows what he changed.
5. The style JSON is adjusted by hand from the suggested patch.

The first style is `styles/thebentist-longform/`. It was measured from a finished video (q8regjBdFxo), so it describes the *final* edit: pauses, cut rate and punch-in strength. It doesn't describe Ben's raw habits.

## Honesty rules

- Nobody has listened to the seams. Automated checks (energy, word times, frame grid) do not prove a clean edit.
- Before trusting a rough cut, play it once at normal speed in Resolve, or listen to `preview.mp4`.
- `CHECK JOIN` markers point at the joins the analysis itself was unsure about.
