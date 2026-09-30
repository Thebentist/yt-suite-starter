# Brief for scene agents (bad-breath-for-good, Huge If True cut)

You are one of seven motion designers building the graphics for Ben Winters' (TheBentist, orthodontist, ~9.5M subscribers) video "How to Get Rid of Bad Breath For Good". The goal is Cleo Abram / *Huge If True* quality: this edit is a showreel. Every shot should look designed, move all the time, and show exactly what Ben is saying at that moment.

## Read first
1. `docs/motion-style.md` — the visual language (palette, type, motion, doodles). Follow it.
2. `pipeline/motion/runtime.js` — the scene API (`defineScene`, `api.*`: stage, paper, grain, vignette, cam, label, leader, doodle.*, icons.*, text, wrap, prog, env, pop, ease, rand, noise, video assets).
3. `videos/bad-breath-for-good/edit/shotlist.md` — find YOUR group's table; build every row in it. Also skim the top of the file (timing rules, when Ben is on camera).
4. `videos/bad-breath-for-good/research-notes.md` — the facts and sources. Anything written on screen must match it. Never invent a number, a quote or a study detail.
5. `docs/ben-rules.md` — nothing invented about Ben; nothing gory.
6. Look at `renders/motion/_test-3.5s.png` for the baseline look of the runtime helpers (you should go well beyond it).

## How to build a scene
- One file per scene: `videos/bad-breath-for-good/scenes/<group>/<id>.js`. Shared drawing code for your group: `scenes/<group>/_lib.js`, loaded by a first line `// @use videos/bad-breath-for-good/scenes/<group>/_lib.js` in each scene (define globals on `window`, e.g. `window.TONGUE = {...}`).
- Timing: `node pipeline/edit/scene-words.mjs --slug bad-breath-for-good --from <w1> --to <w2>` prints every word with its time relative to the first word. Your scene starts 0.15 s before the first word (so a word at relative time r happens at scene time r + 0.15). Duration = (last word end - first word start) + 0.4 + 0.5 margin. Land each reveal ON its word.
- Design space is 1920x1080 (the renderer scales to 4K). Deterministic only (api.rand/api.noise; no Math.random, no Date).
- Performance: keep a frame under ~40 ms at 4K. Pre-render static or heavy layers once in `setup(api)` into offscreen canvases (`document.createElement('canvas')`, draw at 2x for 4K sharpness) and reuse them.
- No downloads, no copyrighted images, no brand logos, no emoji fonts (draw doodles yourself), no real photos of mouths.

## Render and LOOK
- Quick look: `node pipeline/motion/render.mjs --scene <file> --out videos/bad-breath-for-good/scenes/out/_look/<id> --stills 0.1,0.3,0.5,0.7,0.9 --scale 1` then Read the PNGs. Check: readable at phone size (text >= 34 px), nothing clipped at the edges, the reveal order matches the words, it looks rich (not a flat slide), consistent with your other scenes.
- Iterate until it genuinely looks good. At least one revision pass per scene after looking.
- Final: `node pipeline/motion/render.mjs --scene <file> --out videos/bad-breath-for-good/scenes/out/<id> --pages 3` (4K; opaque → .mp4, transparent → .mov). Other agents render at the same time on the same GPU, so render finals one at a time.

## Deliverables
1. The scene files and final 4K renders in `videos/bad-breath-for-good/scenes/out/`.
2. `videos/bad-breath-for-good/scenes/<group>/plan.json`: an array, one entry per rendered scene:
   `{ "id": "hook-lean", "output": "videos/bad-breath-for-good/scenes/out/hook-lean.mp4", "start": { "word": 258, "offset": -0.15 }, "end": { "word": 291, "edge": "end", "offset": 0.25 }, "transparent": false }`
   (special anchors: `{ "special": "wrist-wait", "offset": 1.2 }` with `"duration": 11.0` instead of `end`). Scenes in your group must not overlap in time: where two are continuous, make one end exactly where the next starts.
3. A short final report: each scene id, duration, one line on what it shows, and any fact you were unsure about.

## Boundaries
Write ONLY inside `videos/bad-breath-for-good/scenes/<group>/` and your own ids in `scenes/out/` (and `scenes/out/_look/`). Don't edit `pipeline/`, `docs/`, other groups' folders, or the edit/ files. If the runtime has a bug or lacks something you need, work around it inside your group and mention it in your report.
