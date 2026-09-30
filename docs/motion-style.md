# Motion style: the "Huge If True" look for TheBentist

The visual language for JS-drawn graphics (`pipeline/motion/`). Studied from Cleo Abram's *Something's Happening to the Ozone Hole* (`styles/story-hit-1/`, sheets read 2026-09-28) and adapted to Ben: his set is lavender and pink, his rules say talking head plus animation, no physical demos (`docs/ben-rules.md`).

## What makes it feel like Huge If True
1. **Everything moves.** No graphic sits still: a slow push-in (`api.cam`, ~5% over the shot), drifting particles, a grid that slides. Hard cuts between shots, motion inside them.
2. **One idea per shot, shown literally.** The picture is the exact noun or number being said at that moment. If Ben says "shag carpet", we see a shag carpet. If he says "2,000 patients", we see 2,000 dots.
3. **Dark stage, bright subject.** Near-black indigo background (`P.bg` → `P.bg2` radial glow) with a faint grid; the subject is lit (gradients, glow, rim light). Never a flat mid-grey slide.
4. **Lime highlight chips** (`api.label`): black condensed caps on lime `#d7f34a`, pop in with a little overshoot (`api.pop`). Used for names of things and short claims, 1-5 words. White type for big numbers.
5. **Data is physical.** Numbers are counted up, icon arrays fill in, dots sort themselves into groups. A chart is never just shown; it is built on screen in step with the sentence.
6. **Hand-drawn doodles on top** (`api.doodle`): marker circles, arrows, underlines, crosses and handwritten notes ("Ink Free") drawn on over footage or graphics, like Kevin Ngo's doodles. Marker red `#ff3b3b` for "look here / wrong", lime for "yes / this one". Use them for asides and jokes, not as the main information.
7. **Real texture.** Film grain (`api.grain`, 0.05-0.07) and a soft vignette on full-screen graphics. Paper (`api.paper`) for studies and documents.
8. **Sources on screen, small.** Every stat card carries a small citation line (author, journal, year) in `P.faint`, bottom-left. Sample sizes and grades stay off the main text (Ben's Magic School Bus bar: about six numbers on camera).

## Palette (`api.P`)
| role | token | hex |
|---|---|---|
| stage | `bg`, `bg2`, `grid` | `#0b0a18`, `#15122b`, lavender 7% |
| type | `ink`, `dim`, `faint` | `#f4f1ea`, 62%, 28% |
| highlight | `lime` | `#d7f34a` |
| Ben's set | `lavender`, `purple`, `pink` | `#a78bfa`, `#7c5cff`, `#ff6fae` |
| anatomy | `tongue`, `tongueDeep`, `tongueLight`, `gum`, `gumRed`, `enamel`, `coat` | `#e8798e`, `#b24763`, `#f7a9b6`, `#f08da0`, `#e0485d`, `#f7f3ea`, `#efe7c4` |
| microbes & smell | `green` (bacteria), `gas` (smell), `sulfur` (S atoms), `saliva` | `#46d58a`, `#b9e35a`, `#e9e24a`, `#8fd8ff` |
| warnings | `red`, `marker`, `orange`, `yellow` | `#ff4d5a`, `#ff3b3b`, `#ff9f43`, `#ffd43b` |

Good = lime / green / saliva blue. Bad = red / sulfur-gas yellow-green. Keep it to two or three colours per shot plus the stage.

## Type
- Headlines and labels: **Bahnschrift condensed bold, uppercase** (`family: 'head'`, the default), tracking +1.
- Big numbers: Bahnschrift 700, 160-260 px, white, with a soft glow or shadow.
- Body/explanations (rare): Segoe UI 600, sentence case.
- Handwriting (doodle notes): Ink Free 700 (`api.doodle.text`).
- Study titles: Georgia (serif) on paper, like a journal page.
Minimum 34 px for anything that must be read at phone size (design space 1920x1080). Nothing important within 60 px of the frame edge.

## Motion
- Entrances 0.3-0.6 s, `outCubic`/`outBack` (pops) or `outExpo` (slides). Exits 0.25-0.4 s `inCubic`. Stagger lists by 0.06-0.12 s.
- Numbers count with `outExpo` over 1-2 s. Draw-on strokes `inOutCubic` 0.5-0.9 s.
- Hold the finished state at least 1 s before the shot ends so the viewer can read it.
- Every shot also moves as a whole: `api.cam(ctx, t, { zoom0: 1, zoom1: 1.05, dur })` or a drift of the grid/particles.
- Time everything to the spoken words: the brief gives word times inside the shot (seconds from the shot start). A label lands on its word, not before.

## Illustration style
Flat-shaded, rounded shapes with soft gradients and a rim light, like clean 2.5D explainer art: tongue pinks with a darker underside, glossy molecules (ball and stick), bacteria as soft green capsules with wiggling flagella (`api.icons.bacterium`), smell as translucent yellow-green puffs (`api.icons.puff`). Anatomy is simplified but correct in layout (papillae longer toward the back; tonsils at the sides of the throat behind the tongue; the valve at the top of the stomach). No gore, no real photos of mouths unless licensed.

## Overlays on footage (transparent scenes)
Doodles, chips and lower-thirds over Ben or a clip: keep Ben's face clear (his face is around x 45-70%, y 15-45% of the frame), put text on the left or right third, and give white type a dark stroke or shadow so it reads over the lavender set.

## Technical
- A scene is `defineScene({ name, duration, transparent, assets, params, draw(ctx, t, api) })` in design units 1920x1080; the renderer scales it (default 2 = 3840x2160, the timeline).
- Deterministic only: `api.rand(seed)`, `api.noise(seed)`; never `Math.random` or `Date`.
- Render: `node pipeline/motion/render.mjs --scene <file> --out <path> [--stills 0.2,0.5,0.9]` (stills at 1920 with `--scale 1` for quick looks). Opaque → H.264 .mp4; transparent → ProRes 4444 .mov with alpha.
- Look at stills before calling a scene done: text readable, nothing clipped at the edges, timing lands on the words.
