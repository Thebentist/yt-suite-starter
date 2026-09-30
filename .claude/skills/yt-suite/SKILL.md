---
name: yt-suite
description: Map of the long-form YouTube suite (research, voice, scripts, editing), with a setup check and the status of every channel, research run and video. Use for "/yt-suite", "what can you do", "where are we", "what's next", "check setup".
---

1. Run `node pipeline/doctor.mjs` and show its output.
2. Show where things stand:
   - research runs: `research/*/*/swipe.json`, one line each with `node pipeline/swipe/swipe.mjs status --run <dir>` counts (candidates / qualified / rewritten);
   - videos: `videos/*/`, one line each saying which of packaging.md, beat-map.md, talking-points.md, script.md, review.md, raw/, out/timeline.fcpxml exist;
   - voice profiles and edit styles (from doctor).
3. Print this map, then suggest the single next command given that state:

| Step | Command | What you get |
|---|---|---|
| Research | `/swipe [idea]` (or `/swipe-niches` → `/swipe-find` → `/swipe-rewrite`) | 8 adjacent niches, outliers at 3x their creator's baseline, our title, thumbnail and angle for each, in `Video Swipe File.xlsx` |
| Voice | `/voice-learn [channel]` | transcripts of your uploads, a measured fingerprint, `voice-guide.md` |
| Script | `/write-script <run> <video_id>` or `/write-script <slug> <topic>` | packaging, beat map from the source outlier, talking points or script, voice and AI-tell checks |
| Edit style | `/edit-style <url or file> --name <style>` | cut rate, pauses, punch-ins, contact sheets, a style.json |
| Edit | `/resolve-edit <slug> [--style name]` | an FCPXML timeline plus captions to import into Resolve; with the Resolve MCP it verifies and finishes |
| Shorts | `/shorts <slug> [go]` | vertical shorts from the finished video: complete stories under 3 min, YouTube Shorts + TikTok files, a posting sheet (runs by itself after /resolve-edit) |

Keep the whole reply under 30 lines.
