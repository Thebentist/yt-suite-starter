# Setup (about an hour, once)

Built and tested on **Windows 11 with an NVIDIA RTX 3090**. Other NVIDIA cards work; without one, renders and transcription fall back to the CPU (several times slower). macOS/Linux would need path changes and are untested.

## 1. Programs
| What | Where | Notes |
|---|---|---|
| Claude Code | https://claude.com/claude-code (desktop app or CLI) | Needs your own Claude subscription. Open it **in this folder**. |
| Node.js 22 or newer | https://nodejs.org | Then run `npm install` in this folder (brings ffmpeg, ffprobe, the face-tracking library, the spreadsheet writer). |
| Google Chrome | https://www.google.com/chrome | The graphics renderer and the face tools run headless Chrome. |
| DaVinci Resolve Studio 21+ | https://www.blackmagicdesign.com/products/davinciresolve | Studio (paid) lets Claude drive Resolve through its built-in MCP server. The free version still imports the timeline files Claude writes (File > Import > Timeline); you just do the finishing clicks yourself. |
| NVIDIA driver | https://www.nvidia.com/drivers | For GPU encoding and the CUDA whisper build. |

## 2. The `tools/` folder (not in git: too big, and binaries)
Create `tools/` in this folder, then:

| File | Get it from | Put it at |
|---|---|---|
| yt-dlp.exe | https://github.com/yt-dlp/yt-dlp/releases/latest (asset `yt-dlp.exe`) | `tools/yt-dlp.exe` |
| whisper.cpp, CPU build | https://github.com/ggml-org/whisper.cpp/releases (the Windows x64 zip, e.g. `whisper-bin-x64.zip`) | unzip so that `tools/whisper/Release/whisper-cli.exe` exists |
| whisper.cpp, CUDA build (optional, ~3x faster) | same releases page, the `cublas` Windows x64 zip | unzip so that `tools/whisper-cuda/Release/whisper-cli.exe` exists |
| ggml-base.en.bin | https://huggingface.co/ggerganov/whisper.cpp/tree/main | `tools/ggml-base.en.bin` |
| ggml-small.en.bin | same | `tools/ggml-small.en.bin` (voice work, word timing and the shorts checks use it) |
| face_landmarker.task | https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task | `tools/mediapipe/face_landmarker.task` |

You can also ask Claude: "set up my tools folder". It will name each file, its source and size, and download it only after you say yes.

## 3. Resolve MCP (Studio only)
1. In Resolve: **File > Setup AI Assistants > Claude Code**.
2. Check `.mcp.json` in this folder: `command` must point at your `ResolveMCP.exe` (default install: `C:\Program Files\Blackmagic Design\DaVinci Resolve\ResolveMCP.exe`).
3. Restart Claude Code in this folder and approve the `davinci-resolve` server when asked.
Details and the API quirks already worked around: `docs/resolve-editing.md`, `renders/resolve-smoke/RESULT.md`.

## 4. Optional
- `.env` with `APIFY_TOKEN=...` only if you want TikTok/Instagram research (paid, off by default). YouTube research is free and needs nothing.
- Keep `.env` and anything in `.secrets/` out of git (the `.gitignore` already does).

## 5. Check, then start
```
npm run doctor
```
Fix every ✗. Then in Claude Code, in this folder, say: **"Start here."** The agent reads `docs/START-HERE.md`, interviews you (phase 1), learns your voice from your own uploads (phase 2), and takes it from there. `ONBOARDING.md` shows the progress.
