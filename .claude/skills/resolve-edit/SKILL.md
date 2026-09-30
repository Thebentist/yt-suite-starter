---
name: resolve-edit
description: Edit a raw talking-head recording into a finished DaVinci Resolve timeline in a reference style. Cleans and levels the dialogue, cuts dead air on word boundaries (checked against the waveform), removes fillers, stutters and false starts only where it is safe, punches in around the speaker's eyes, places scenes and music, adds 2-frame audio crossfades on every cut, then imports, verifies, renders and "listens" to the result through the Resolve MCP. Use for "/resolve-edit", "edit my video", "edit this like <reference>", "make the rough cut", "cut the dead air".
argument-hint: "<slug> [style:<name>] [notes: no punch-ins, keep pauses longer, keep the ums, skip music...]"
---

# resolve-edit

Code makes every cut; Claude looks, judges and checks; Resolve receives a new timeline (never modify an existing one). Read `docs/resolve-editing.md` once per session, and **`docs/edit-lessons.md` before every edit**: every mistake from past edits, and the guard or rule that now prevents it. `S=videos/<slug>`.

**Story / Huge If True edits (graphics-heavy) use the assemble route in section 6**, not the build-timeline rough cut below.

A reference video for the style? Run `/edit-style` on it first and use the style it writes (`style:<name>`).

## 1. Inputs
- The raw take: `$S/raw/*.mp4|mov` (never modified). If it lives elsewhere (e.g. `E:/YT VIDEOS/<date>_camera.mp4`, the 4K camera file; the plain `<date>.mp4` beside it is the screen recording with the host's private notes and never goes in the edit), stream-copy the wanted stretch into `$S/raw/take.mp4` (`ffmpeg -ss <s> -i <file> -t <s> -map 0:v:0 -map 0:a:0 -c copy`) and write `$S/raw/SOURCE.txt`.
- Word timings: `node pipeline/edit/transcribe.mjs --in $S/raw/<file> --out $S/raw/transcript --edit --prompt "<transcribe_prompt from channels/<host>.json>"`. `--edit` adds a prompted pass for punctuation and fillers, merged by text onto the plain pass's timing (never the prompted timing: it drifted up to 13 s).
- Style by VIDEO TYPE: `type:<reaction|story|explainer>` → `editing_styles[type]` in `channels/<host>.json` (reaction = clip reactions; story = Huge If True-style storytelling; explainer = Vsauce-style). `style:<name>` → `styles/<name>/style.json` directly. Neither → ask which type it is; `editing_style` is only the fallback. No style at all → the tool's defaults; say so.
- Optional: `$S/scenes/manifest.json`, `$S/music/manifest.json`, `$S/script.md` (chapter titles).

## 2. Prepare and build
1. **Clean the dialogue**: `node pipeline/edit/clean-audio.mjs --in $S/raw/<file>` → `$S/work/<file>.clean.mov` (video copied, audio levelled to -16 LUFS / -1.5 dBTP, noise reduction only on a noisy room). It refuses its own output unless sync is sample-exact and the length identical; the build then uses it automatically. Report its loudness, room tone and quiet-speech numbers.
2. **Find the eyes**: `node pipeline/resolve/frame-grid.mjs --in $S/raw/<file>` and **look** at `$S/work/grid.jpg`; read the point between the eyes (percent across, percent down) on all frames.
3. **Content pass (the real edit)**: The original host's editor removed 40-44% of the raw talk, not just dead air (measure this host's with /edit-style on their published videos). Follow `docs/content-pass.md`: `node pipeline/edit/transcript-view.mjs --words $S/raw/transcript.words.json`, read ALL of `$S/work/transcript-view.md`, then write `$S/work/content-cuts.json` (sentence ranges, each with a why): production chatter, earlier takes, abandoned hooks, memory searches, asides, rejected clips, and secondary elaboration/riffs/plugs until the style's keep ratio (the original host kept ~55-60%). Keep the story spine and true emotional moments. Say what you cut and why in the report; the user can restore any of it (purple CUT markers, full handles).
4. **Build**: `node pipeline/resolve/build-timeline.mjs --slug <slug> --style <style.json> --anchor <x%,y%>` plus flags from the notes (`--no-punch`, `--no-music`, `--no-overlays`, `--threshold <dBFS>`, `--name "<timeline name>"`, `--no-clean`). Style `edit.takes` sets fillers / stutters / retakes to `cut`, `mark` or `off` (notes like "keep the ums" → `mark`).
5. **Judge every take decision** in `$S/out/takes.json` (read the context of each cut and each kept item). A cut that removes content, a list item or one half of a parallel phrase is a bug: fix the rule in `pipeline/resolve/takes.mjs`, never patch the output by hand. Then `$S/out/joins.json`: every `CHECK JOIN`.

## 3. Into Resolve (MCP)
1. `get_resolve_status`; `launch_resolve` if needed (can outlast the tool's 60 s; check again before retrying; a first-run Welcome window blocks scripting until the user closes it). A project must be open (ask which, or create a test project); its frame rate and resolution must match the cut (`SetSetting` before importing).
2. Read `renders/resolve-smoke/RESULT.md`: what the API import keeps and drops, and the quirks already worked around. Rerun the smoke test after a Resolve upgrade.
3. Run the generated scripts as they are (paste the file, or `exec` it from disk inside one `run_script_unsafe`; never retype them), in this order:
   - `resolve-import.py` (unsafe: reads files). Captions land in the media pool only; the user drags them to 01:00:00:00 if they want them.
   - `resolve-markers.py`: puts the markers back (the import drops them).
   - `resolve-finish.py`: a centred 2-frame Cross Fade 0 dB on every dialogue cut, short fades on the music. It verifies every seam itself.
   - `resolve-render.py`: queues an audio-only QA render and returns; poll `project.GetRenderJobStatus(<job>)` with short calls (never wait inside one script).
   - `resolve-verify.py` (unsafe: saves `out/resolve-verify.json`), then `node pipeline/resolve/check-import.mjs --spec $S/out/timeline-spec.json`: every line must PASS.
4. **Listen by machine**: `node pipeline/resolve/qa-render.mjs --slug <slug>` on the finished render: duration to the frame, loudness, clicks at every seam, and a fresh transcription aligned with the kept words. Required: 0 missing words near seams, 0 `CUT MISSED` fillers, suspect clicks explained. A miss is a bug to fix in the pipeline and rebuild, then run the loop again.
5. **Look**: export stills (`project.ExportCurrentFrameAsStill`) either side of 2 or 3 punch-in cuts and at every overlay; the face must not jump, nothing may cover it, no border at the frame edge.
6. **Deliver** only when asked: `resolve-deliver.py` (loads the YouTube 2160p preset, then MP4 / NVIDIA H.265 at the timeline resolution; it refuses a queued job without video), poll it, then `node pipeline/resolve/check-deliver.mjs --slug <slug>` (video stream, size, frame rate, duration to the frame, audio, loudness, bit rate) and **look** at the frames strip it writes. A render once "succeeded" with no picture at all; never report a delivery without this check.
Never touch grades; never delete the user's clips, timelines or projects. Keep each script short: a script killed mid-call can take Resolve down (it did once).

**Manual route** (no MCP): point the user to `$S/out/IMPORT.md`.

## 4. Report
Raw vs cut duration; what the takes pass cut (fillers, stutters, false starts, seconds) and what it left for review, with the RETAKE? list (timecode + words); punch-ins and the anchor; the dialogue numbers (LUFS, true peak, room tone); `check-import` and `qa-render` results; the frames you looked at; marker colours in Resolve (blue chapter, red CHECK JOIN, yellow RETAKE?, purple CUT RETAKE, cream filler/stutter left in); the captions step. Say plainly that the checks are signal and transcript evidence and **nobody has listened**; suggest the user plays the red and purple markers first.

## 5. Learning loop (after the user polishes it)
When the user finishes the edit: export File > Export > Timeline > FCPXML 1.10 (or run `resolve-verify.py` on their final timeline), then `node pipeline/style/diff.mjs --ours $S/out/timeline-spec.json --theirs <export> --words $S/raw/transcript.words.json`. Show what they changed and the suggested style patch; apply it only after they say yes.

**After every review round** (comments in the review app, notes in chat): add each new mistake to `docs/edit-lessons.md` (what went wrong, cause, fix, and whether it is now a code guard or a rule), and turn every rule that can be checked into a guard in the pipeline. A lesson that only lives in the chat is lost.

## 6. Story / Huge If True route (the bad-breath-for-good pipeline)
Dialogue first, locked before any final graphics render (`docs/edit-lessons.md` T6):
1. `$S/edit/paper-edit.json` (word keep ranges, raw order, `special` inserts), then a comprehension read of the whole cut. `$S/edit/fixes.json` (raw-time `remove`/`keep` with valley snap), `$S/edit/tighten.json`, `node pipeline/edit/find-retakes.mjs` (keep the last take).
2. `node pipeline/edit/gaze.mjs --slug <slug>` (host's script glances; config `$S/edit/gaze.json`; check with `gaze-sheet.mjs`).
3. `node pipeline/edit/assemble.mjs --slug <slug> --stage map`, then `--stage audio`, then `node pipeline/edit/transcribe.mjs --in $S/work/cut-audio16k.wav --out $S/work/cut-transcript`, then `--stage map` again; `listen-check.mjs` and `snippet-listen.mjs` for leaks and clipped words.
4. Graphics: scene groups in `$S/scenes/<group>/` (briefs `$S/edit/agent-brief.md`, `$S/edit/phase2-brief.md`; runtime `pipeline/motion/`; anchors only, `api.finish`, a new framing every 2-4 s). Announce every dialogue change to every group; they re-render.
5. `node pipeline/motion/score.mjs --slug <slug>` (sections anchored to words), then `assemble.mjs --stage full --split --version <v> --name "<timeline>" --snapshot <v>`.
6. Resolve: `out/final/resolve-import.py`, `resolve-stems.py`, `resolve-finish.py`, `resolve-review.py` (poll the job). With `--split` the dialogue is one stem and the A-roll is picture only.
7. Look: a contact sheet (one frame per 10 s), `node pipeline/edit/rhythm-check.mjs --video $S/review/<v>.mp4 --slug <slug>`, and `node pipeline/motion/stale-check.mjs --slug <slug>` (stale or stuttering frames in every placed graphic; re-render any it flags, after looking, since designed flickers can trip it). Then publish to the review app (`node pipeline/review/comments.mjs --slug <slug> --publish <v> --name ... --notes ...`), with notes checked against `out/final-spec.json`.
8. Deliver (when asked): `out/final/resolve-deliver.py` (4K H.265), then `node pipeline/resolve/check-deliver.mjs --slug <slug> --file <mp4>` and LOOK at its frames strip; if true peak > -1 dBTP, remux the audio through the oversampled limiter in `docs/edit-lessons.md` R7. Captions: `node pipeline/edit/captions.mjs --slug <slug> [--intro <s>]` (fixes in `$S/edit/caption-fixes.json`); chapters from the chapter cards' placed times (`$S/edit/placed.json`).
9. Shorts: once the long video is delivered, run the `shorts` skill in automatic mode (`/shorts <slug> go`): it finds the stories that stand alone, builds drafts of the strongest (YouTube Shorts + TikTok) and publishes them to the review app as `<slug>-tiktok`. Tell the host they are there.
