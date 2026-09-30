# Verify a timeline inside DaVinci Resolve Studio through its native MCP server.
#
# Run it with the davinci-resolve MCP tool `run_script` (sandboxed Python: no os/sys/open; `resolve` and `project` are
# pre-injected; whatever is assigned to `result` is returned). Keep it under the 10 s default timeout: per-item markers
# cost one call per clip, so they are off in this template; the filled copies build-timeline.mjs writes to
# videos/<slug>/out/resolve-verify.py turn them on, because the rough cut's markers live on the A-roll clips.
#
# Returns: {timeline, fps, startFrame, endFrame, startTimecode, tracks: {video|audio|subtitle: [{track, name, count,
# items: [{name, start, end, duration, leftOffset, sourceStart, sourceEnd, ZoomX, ZoomY, Pan, Tilt, Opacity (video),
# AudioVolume (audio, dB), file}]}]}, markers,
# clipMarkers}. clipMarkers (with WITH_ITEM_MARKERS) places every clip marker on the timeline: a clip marker's frame id
# is a source frame of the clip's media, so its timeline frame is start + (frameId - sourceStart); "hidden" = it sits
# on a handle outside the clip's visible range.
# Frames are Resolve timeline frames (01:00:00:00 = 108000 at 30 fps). Save the returned JSON as
# videos/<slug>/out/resolve-verify.json and compare it with the rough cut:
#   node pipeline/style/diff.mjs --ours videos/<slug>/out/timeline-spec.json --theirs videos/<slug>/out/resolve-verify.json
# (identical cut = nothing removed/restored; zoom differences show whether Resolve honoured adjust-transform).

# ---- DATA (build-timeline.mjs fills this block) ----
TIMELINE_NAME = ""          # "" = the current timeline
WITH_ITEM_MARKERS = False   # True also reads clip markers (slower on long timelines)
MAX_ITEMS_PER_TRACK = 1500
SAVE_TO = ""                # path for the JSON; needs run_script_unsafe (the sandbox has no open), then only a summary returns
# ---- END DATA ----


def _find_timeline(name):
    if not name:
        return project.GetCurrentTimeline()
    for i in range(1, project.GetTimelineCount() + 1):
        t = project.GetTimelineByIndex(i)
        if t is not None and t.GetName() == name:
            return t
    return None


def _try(fn, *a):
    try:
        return fn(*a)
    except Exception:
        return None


def _item_row(it, kind):
    row = {
        "name": _try(it.GetName),
        "start": _try(it.GetStart),
        "end": _try(it.GetEnd),
        "duration": _try(it.GetDuration),
        "leftOffset": _try(it.GetLeftOffset),
    }
    if hasattr(it, "GetSourceStartFrame"):
        row["sourceStart"] = _try(it.GetSourceStartFrame)
        row["sourceEnd"] = _try(it.GetSourceEndFrame)
    if kind == "video":
        for key in ("ZoomX", "ZoomY", "Pan", "Tilt", "Opacity"):
            row[key] = _try(it.GetProperty, key)
    if kind == "audio":
        row["AudioVolume"] = _try(it.GetProperty, "AudioVolume")
    if kind != "subtitle":
        mpi = _try(it.GetMediaPoolItem)
        if mpi is not None:
            row["file"] = _try(mpi.GetClipProperty, "File Path")
    if WITH_ITEM_MARKERS:
        m = _try(it.GetMarkers)
        if m:
            row["markers"] = m
    return row


tl = _find_timeline(TIMELINE_NAME)
if tl is None:
    result = {"error": "timeline not found", "wanted": TIMELINE_NAME,
              "available": [project.GetTimelineByIndex(i).GetName() for i in range(1, project.GetTimelineCount() + 1)]}
else:
    out = {
        "timeline": tl.GetName(),
        "fps": _try(tl.GetSetting, "timelineFrameRate"),
        "startFrame": _try(tl.GetStartFrame),
        "endFrame": _try(tl.GetEndFrame),
        "startTimecode": _try(tl.GetStartTimecode),
        "tracks": {},
    }
    lines = []
    clip_markers = []
    for kind in ("video", "audio", "subtitle"):
        n = _try(tl.GetTrackCount, kind) or 0
        tracks = []
        for ti in range(1, n + 1):
            everything = _try(tl.GetItemListInTrack, kind, ti) or []
            # transitions (e.g. the audio crossfades resolve-finish.py adds) are listed apart from the clips
            items = [it for it in everything if _try(it.GetType) != "transition"]
            fades = [{"name": _try(f.GetName), "start": _try(f.GetStart), "end": _try(f.GetEnd), "duration": _try(f.GetDuration)} for f in everything if _try(f.GetType) == "transition"]
            rows = [_item_row(it, kind) for it in items[:MAX_ITEMS_PER_TRACK]]
            if kind == "audio":
                for it, row in zip(items, rows):
                    fd = _try(it.GetFades)
                    if fd:
                        row["fades"] = fd
            tracks.append({"track": ti, "name": _try(tl.GetTrackName, kind, ti), "count": len(items), "items": rows, "transitions": fades})
            if fades:
                lines.append("%s %d: %d transitions" % (kind, ti, len(fades)))
            zoomed = len([r for r in rows if (r.get("ZoomX") or 1) > 1.001]) if kind == "video" else 0
            lines.append("%s %d: %d items%s" % (kind, ti, len(items), (", %d zoomed" % zoomed) if kind == "video" else ""))
            for r in rows:
                for fid, m in sorted((r.get("markers") or {}).items(), key=lambda kv: float(kv[0])):
                    f = r["start"] + (int(float(fid)) - (r.get("sourceStart") or 0))
                    clip_markers.append({"track": "%s %d" % (kind, ti), "frame": f, "frameId": int(float(fid)), "hidden": not (r["start"] <= f < r["end"]),
                                         "name": m.get("name"), "color": m.get("color"), "duration": m.get("duration"), "note": m.get("note"), "customData": m.get("customData")})
        out["tracks"][kind] = tracks
    out["markers"] = _try(tl.GetMarkers) or {}
    out["clipMarkers"] = clip_markers
    lines.append("timeline markers: %d" % len(out["markers"]))
    if WITH_ITEM_MARKERS:
        lines.append("clip markers: %d (%d hidden on handles)" % (len(clip_markers), len([m for m in clip_markers if m["hidden"]])))
    print("\n".join([out["timeline"] + " @ " + str(out["fps"]) + " fps, frames " + str(out["startFrame"]) + "-" + str(out["endFrame"])] + lines))
    result = out
    if SAVE_TO:
        try:
            import json
            with open(SAVE_TO, "w", encoding="utf-8") as fh:
                json.dump(out, fh, indent=1)
            result = {k: out[k] for k in ("timeline", "fps", "startFrame", "endFrame", "startTimecode")}
            result["savedTo"] = SAVE_TO
            result["summary"] = lines
        except Exception as e:
            out["saveError"] = "not saved (%s); save the returned JSON yourself or run with run_script_unsafe" % e
