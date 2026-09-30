# Put audio stems (music, SFX, a clip's own audio) on their own new tracks AFTER the FCPXML import.
# Why: when the FCPXML itself carries connected audio stems, Resolve 21.1 scrambled the dialogue across audio tracks
# (2026-09-28: 315 of 316 dialogue clips landed on A4, then on A2 with only one stem). A picture + dialogue import is
# clean; stems appended through MediaPool.AppendToTimeline with trackIndex + recordFrame land exactly (checked: start
# frame = timeline start + at * fps). Audio-only media reports no "Frames", so the length comes from "Duration".
# Run with run_script_unsafe (reads the stems list from disk). A second run adds nothing if the stem is already there.

# ---- DATA (pipeline/edit/assemble.mjs fills this block via mcp-scripts.mjs) ----
TIMELINE_NAME = ""
STEMS_JSON = r""
# ---- END DATA ----
import json


def _find_timeline(name):
    if not name:
        return project.GetCurrentTimeline()
    for i in range(1, project.GetTimelineCount() + 1):
        t = project.GetTimelineByIndex(i)
        if t is not None and t.GetName() == name:
            return t
    return None


def _frames(tc, fps):
    h, m, s, f = [int(x) for x in tc.split(":")]
    return ((h * 60 + m) * 60 + s) * int(round(fps)) + f


tl = _find_timeline(TIMELINE_NAME)
if tl is None:
    result = {"error": "timeline not found: " + TIMELINE_NAME}
else:
    project.SetCurrentTimeline(tl)
    spec = json.load(open(STEMS_JSON, encoding="utf-8"))
    fps = float(spec.get("fps") or 30)
    mp = project.GetMediaPool()
    start = tl.GetStartFrame()
    present = set()
    for i in range(2, tl.GetTrackCount("audio") + 1):
        for it in tl.GetItemListInTrack("audio", i) or []:
            present.add(it.GetName())
    done = []
    for st in spec.get("stems", []):
        name = st["file"].replace("\\", "/").split("/")[-1]
        if name in present:
            done.append({"stem": st["id"], "skipped": "already on the timeline"})
            continue
        items = mp.ImportMedia([st["file"]]) or []
        if not items:
            done.append({"stem": st["id"], "error": "import failed"})
            continue
        item = items[0]
        if st["id"] == "dialogue" and not (tl.GetItemListInTrack("audio", 1) or []):
            track = 1   # split-edit build: the dialogue stem takes the emptied A1
        else:
            tl.AddTrack("audio", "stereo")
            track = tl.GetTrackCount("audio")
        n = _frames(item.GetClipProperty("Duration"), fps)
        s0 = int(round(float(st.get("in", 0)) * fps))
        e0 = min(n - 1, s0 + int(round(float(st["duration"]) * fps)) - 1) if st.get("duration") else n - 1
        placed = mp.AppendToTimeline([{"mediaPoolItem": item, "startFrame": s0, "endFrame": e0, "mediaType": 2,
                                        "trackIndex": track, "recordFrame": start + int(round(float(st.get("at", 0)) * fps))}])
        ti = placed[0] if placed else None
        done.append({"stem": st["id"], "track": track, "frames": n, "start": ti.GetStart() if ti else None,
                     "expected": start + int(round(float(st.get("at", 0)) * fps)), "ok": bool(ti)})
    tracks = {"a%d" % i: len(tl.GetItemListInTrack("audio", i) or []) for i in range(1, tl.GetTrackCount("audio") + 1)}
    print("stems: " + ", ".join("%s->A%s" % (d["stem"], d.get("track", "-")) for d in done) + "; tracks " + str(tracks))
    result = {"timeline": tl.GetName(), "stems": done, "tracks": tracks}
