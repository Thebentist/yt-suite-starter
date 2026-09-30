---
name: edit-style
description: Learn an editing style from a reference video (yours or any creator's). Measures cut rate, shot lengths, pauses kept, loudness and music bed with ffmpeg, makes contact sheets, then looks at them to describe zooms, captions, b-roll, graphics and transitions, and saves styles/<name>/style.json that /resolve-edit uses. Use for "/edit-style", "learn this editing style", "edit like this video", "analyze how this is edited".
argument-hint: "<youtube url | video file> [name:<style>] [start:<s>] [end:<s>] [host:<id> to make it the channel default]"
---

# edit-style

1. **Measure**: `node pipeline/style/learn.mjs --url <url> --name <style>` (or `--file <video>`; add `--start/--end` to analyse a section, e.g. skip a long intro). It also transcribes the reference (GPU, about 45 s for 4 minutes; `--no-transcribe` skips it) and counts what the editor LEFT IN: fillers and stutters per minute set `edit.takes` (<= 0.3/min left → `cut`, else `mark`), plus words per minute. The first-minute cut rate becomes `edit.cutRate.targetCutsPerMinFirst60` (the hook). If YouTube answers "Sign in to confirm you're not a bot" / 429, don't retry in a loop: tell the user it's rate-limited and either wait a few hours or use a file they have (`--file`, or `--video`/`--audio` for separate streams). This tool never uses browser cookies.
2. **Look**: Read every PNG in `styles/<style>/sheets/` (the 1 fps sheet of the first 60 s, the whole-video sheet and the cut-check sheets). Then fill the "Visual notes" section of `styles/<style>/style.md` with what you actually saw, citing tile times:
   - framing (distance, headroom, where the face sits) and how it changes at jump cuts (zoom level, how often);
   - b-roll, clips and graphics: what share of the screen time, where they sit (full screen, panel, lower third);
   - captions or on-screen text: burned in or not, style, how often;
   - transitions, colour and look, sound design you can infer (whooshes at cuts);
   - the first 60 seconds specifically (hook pacing is usually faster).
   Also judge the cut detector from the cut-check sheets (real cuts vs false ones) and say how far the cuts/min number can be trusted.
3. **Tune**: adjust `edit.*` in `style.json` to match what you saw (e.g. `edit.punchIn.scale` from the zoom you observed, `edit.cutRate.targetCutsPerMin` and `targetCutsPerMinFirst60` by the same factor when b-roll drives the measured rate). Record every change in `adjustedAfterLooking.changes` (`"edit.x.y": [measured, chosen]`) so a re-run keeps it. List each change and the tile that justifies it.
4. **Several references** (one video TYPE, e.g. three reaction videos): learn each into its own style (`<type>-1`, `<type>-2`, …; one download at a time, never retry a failed download in a loop), fill each one's Visual notes, then `node pipeline/style/blend.mjs --name <type> --from <type>-1,<type>-2,... --type <type>` (median of the numbers, majority of the policies) and write its Visual notes from what the references share and where they differ.
5. **Map it to the channel**: set `editing_styles.<type>` in `channels/<id>.json` to `styles/<type>/style.json` (types: reaction, story, explainer). `editing_style` stays the fallback.

Report: the measured table (cuts/min overall and first minute, median shot, pauses median/p90, words/min, fillers and stutters left in per minute, loudness, music bed), the visual notes in 5 to 8 bullets, the edit parameters (including the takes policy) and the path. The reference's loudness is information only: the edit's dialogue is levelled to -16 LUFS by `clean-audio.mjs` (Ben's published videos measure about -24 LUFS, too quiet to copy). Existing styles: `styles/*/style.json` (TheBentist's own: `styles/thebentist-longform`).
