# Editing style: story

Blended from 1 references by `pipeline/style/blend.mjs` (edit numbers = the median; policies = the majority). Each reference keeps its own sheets and notes in `styles/<reference>/`.

| | [Something’s Happening to the Ozone Hole](https://www.youtube.com/watch?v=yWgHx0HE8m8) (Cleo Abram) |
|---|---|
| Cuts / min (first 60 s) | 22.87 (28) |
| Median shot | 1.83 s |
| Pause median / p90 | 0.17 / 0.42 s |
| Words / min | 157.19 |
| Fillers / stutters left per min | 0 / 0.06 |
| Loudness | -13.5 LUFS |
| Music bed likely | yes (-20.74 dB) |

## Edit parameters (blended)

```json
{
  "takes": {
    "fillers": "cut",
    "stutters": "cut",
    "retakes": "cut"
  },
  "pause": {
    "keepBetweenSentences": 0.17,
    "maxBetweenSentences": 0.29,
    "keepInSentence": 0.27,
    "maxInSentence": 0.42
  },
  "punchIn": {
    "enabled": true,
    "scale": 1.12,
    "every": 2,
    "maxHoldSec": 4,
    "minSegmentSec": 0.8
  },
  "cutRate": {
    "targetCutsPerMin": 15,
    "targetCutsPerMinFirst60": 28
  },
  "music": {
    "gainDb": -20.74
  },
  "deliver": {
    "loudnessLufs": -13.5,
    "truePeakDbtp": 1.7
  }
}
```

## Visual notes

From `styles/story-hit-1/style.md` (Cleo Abram, Huge If True), read from the contact sheets 2026-09-28; nobody has watched it in motion.

- **The host is a minority of the picture**: on screen about 16-20% of the time (studio medium close-up, almost no headroom, eyes about 30% down; about 1.1x punch-ins on half her studio shots). The talking-head rules in this style (tight pauses, 1.12x punch-ins, a new framing every 4 s or less, faster in the first minute) cover only that part.
- **84% is visuals**: designed graphics about 49% (3D globe, maps, timelines, charts, labels over footage), filmed b-roll about 32%, archival about 12%, interviews about 4%, screenshots about 3%. A new picture every 2-3 s, about 28 changes in the first minute; filmed and archival shots 1-2.5 s, animations 4-15 s. Every visual shows the exact noun or number being said.
- **Text lives inside graphics only**: lime-yellow boxes with black bold uppercase labels, big white year counters, small source credits; no burned-in captions over the host.
- **Hook**: 'Ready?' on camera, then about 30 distinct pictures in the first minute (location, globe, archival news), host back on camera around 0:37, premise stated by a graphic device around 0:50.
- **For Ben** (docs/ben-rules.md: talking head plus animation only, no physical demos): the location share has to become animation, archival, paper/article screenshots or licensed stock; on-screen numbers have to be trimmed to about six. The rough cut builds his talking head in this rhythm; the visual layer is a separate job (motion design / sourcing), placed on V2+ through scenes/manifest.json.
