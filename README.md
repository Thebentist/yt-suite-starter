# yt suite (starter)

Claude Code skills and tools that take a YouTube channel from research to a finished, edited video and its shorts, in the host's own voice:

- **Research**: find long-form videos beating their own creator's baseline in the niches next to yours, and turn each into your title, thumbnail brief and angle.
- **Voice**: measure how you actually talk from your own uploads, so scripts sound like you and not like AI.
- **Scripts**: talking points or full scripts built beat by beat from your real speech, checked for retention (Kallaway's method), voice match, AI tells, and a blind test.
- **Editing**: your raw recording becomes a DaVinci Resolve timeline, from a clean rough cut up to a Huge If True-style edit with custom 2D/3D graphics, reviewed in a local Frame.io-style app with timestamped notes.
- **Shorts**: complete stories under 3 minutes, cut vertically from the finished video, with captions and subscribe/follow call-outs, for YouTube Shorts and TikTok.

It was built and proven with Dr. Ben Winters (TheBentist, ~9.5M subscribers). His rules, house voice and one finished project ship as worked examples, and transcripts of 103 of his real videos (about 228,000 words) ship (with his permission) as a reference for natural spoken rhythm. You set it up as **your** channel: the first thing the agent does is interview you and learn your voice.

## Start
1. Follow **[SETUP.md](SETUP.md)** (programs, the `tools/` folder, `npm run doctor`).
2. Open Claude Code in this folder and say **"Start here."** The agent follows **[docs/START-HERE.md](docs/START-HERE.md)** phase by phase and tracks progress in **[ONBOARDING.md](ONBOARDING.md)**.

## Commands
| Command | What it does |
|---|---|
| `/yt-suite` | the map, the setup check, where everything stands, the next step |
| `/swipe [idea]` | the whole research run → `research/<channel>/<run>/Video Swipe File.xlsx` |
| `/swipe-niches`, `/swipe-find`, `/swipe-rewrite` | the same three steps one at a time |
| `/voice-learn [channel]` | transcribes uploads locally and measures the voice (all five parts) |
| `/write-script <run> <video_id>` or `<slug> <topic>` | packaging, beat map, talking points or script, and a scored review; `voice:<id>` / `structure:<id>` to borrow a reference's rhythm or architecture |
| `/read-check <slug> <raw file>` | after recording: what was said vs the script, the read test, lessons fed back |
| `/edit-style <url> --name <style>` | measures an editing style from a reference video |
| `/resolve-edit <slug>` | the edit, in Resolve (timeline file, then the MCP finishes and checks it) |
| `/shorts <slug> [go]` | vertical shorts from the finished video, per platform, with a posting sheet |
| `npm run review` | the review app at http://localhost:4600 |
| `npm run doctor` | the setup check |

## What's in here, and what isn't
In git: the skills (`.claude/skills/`), the scriptwriter agent, the tools (`pipeline/`), the playbooks and lessons (`docs/`), channel configs, measured voices and editing styles, the Kallaway study notes, and the worked example project.
Not in git: `tools/` (download per SETUP.md), `node_modules/`, footage and every other media file, other creators' transcripts (the tools rebuild them), secrets.
