# Onboarding checklist

The agent ticks each item when it's done (`- [x]`, with the date) so every later session knows where things stand. The steps are explained in `docs/START-HERE.md`.

## Phase 0: the machine
- [ ] Node 22+, `npm install`
- [ ] `tools/`: yt-dlp, whisper.cpp (CPU; CUDA optional), ggml-base.en + ggml-small.en, face_landmarker.task
- [ ] Chrome installed
- [ ] DaVinci Resolve (Studio for the MCP); Resolve MCP registered and approved
- [ ] `npm run doctor` has no ✗

## Phase 1: meet the host
- [ ] Interview done (answers saved in the host's words)
- [ ] `channels/<id>.json` written from the template
- [ ] `docs/host-rules.md` written and approved by the host
- [ ] `docs/host-expert-notes.md` created
- [ ] `suite.json` → host set

## Phase 2: their voice
- [ ] `/voice-learn <id>`: transcripts, fingerprint, passage bank, voice guide, blind control (doctor shows all five)
- [ ] `docs/style-prompts/<id>-house-voice.md` written; host says "that's me"

## Phase 3: their editing style
- [ ] `/edit-style` on their best videos, per type; visual notes written from the sheets
- [ ] `editing_styles` mapped in `channels/<id>.json`

## First video
- [ ] Phase 4: `/swipe` shortlist; host picked a concept
- [ ] Phase 5: `/write-script`; checks and blind test passed; first-person lines signed off
- [ ] Phase 6: recorded; `/read-check` done; `script_wpm` measured
- [ ] Phase 7: `/resolve-edit`; review rounds closed; delivered and checked
- [ ] Phase 8: `/shorts`; finals and posting sheet
- [ ] Phase 9: results noted; lessons added
