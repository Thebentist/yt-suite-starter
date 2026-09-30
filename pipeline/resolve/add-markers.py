# Put the rough cut's markers onto an imported timeline in DaVinci Resolve Studio through its native MCP server.
#
# Why: MediaPool.ImportTimelineFromFile drops every FCPXML marker (plain, chapter-marker and to-do alike; smoke test of
# 2026-09-27 in renders/resolve-smoke/RESULT.md), so the chapters, RETAKE?, CHECK JOIN and filler notes go back on here.
# Run it with the davinci-resolve MCP tool `run_script` (sandboxed Python; `project` is pre-injected; `result` is
# returned) right after the import. build-timeline.mjs writes a filled copy to videos/<slug>/out/resolve-markers.py.
#
# TARGET "clip" puts each marker on the A-roll clip under it, as the FCPXML does, so it moves with the material when a
# retake is ripple-deleted; "timeline" puts them on the ruler instead. Clip-marker frame ids are SOURCE frames of the
# clip's media (Resolve's own OTIO export places them there), so a marker k frames into a clip goes at
# GetSourceStartFrame() + k. Colors must be name strings ("Blue"): the resolve.MARKER_* constants make AddMarker fail.
# Safe to run twice: a marker whose customData is already on its clip (or the ruler) is skipped. A frame that already
# holds a marker moves to the next free frame inside the same clip and is reported as nudged. DRY_RUN = True only reports.

# ---- DATA (build-timeline.mjs fills this block) ----
TIMELINE_NAME = ""            # "" = the current timeline
TRACK = 1                     # video track holding the A-roll
TIMELINE_START_FRAME = 108000 # frame of 01:00:00:00 in the FCPXML (for the report only)
CLIP_COUNT = 0                # clips the FCPXML put on TRACK; 0 = do not check
TARGET = "clip"               # "clip" or "timeline"
MARKERS = [
    # (frame from the timeline start, color, name, note, duration frames, id)
]
DRY_RUN = False
# ---- END DATA ----

TAG = "yt-suite:"


def _find_timeline(name):
    if not name:
        return project.GetCurrentTimeline()
    for i in range(1, project.GetTimelineCount() + 1):
        t = project.GetTimelineByIndex(i)
        if t is not None and t.GetName() == name:
            return t
    return None


tl = _find_timeline(TIMELINE_NAME)
report = {"added": 0, "skipped": 0, "nudged": [], "failed": [], "outside": [], "dryRun": DRY_RUN, "target": TARGET}
if tl is None:
    result = {"error": "timeline not found: " + (TIMELINE_NAME or "(current)")}
else:
    tl_start = tl.GetStartFrame()
    items = [it for it in (tl.GetItemListInTrack("video", TRACK) or []) if it.GetType() != "transition"]
    report["timeline"] = tl.GetName()
    report["itemsOnTrack"] = len(items)
    if TARGET == "clip" and CLIP_COUNT and len(items) != CLIP_COUNT:
        result = {"error": "track %d has %d clips but the rough cut had %d; refusing to guess" % (TRACK, len(items), CLIP_COUNT), "timeline": tl.GetName()}
    else:
        # holder = where a marker lives: (object, first timeline frame, end frame, frame id of its first frame)
        spans = []
        for it in items:
            s, e = it.GetStart() - tl_start, it.GetEnd() - tl_start
            spans.append((it, s, e, it.GetSourceStartFrame()))
        cache = {}

        def holder_for(rel):
            if TARGET == "timeline":
                return (tl, 0, tl.GetEndFrame() - tl_start, 0)
            for h in spans:
                if h[1] <= rel < h[2]:
                    return h
            return None

        def taken(obj):
            key = id(obj)
            if key not in cache:
                cache[key] = dict(obj.GetMarkers() or {})
            return cache[key]

        colors = {}
        for row in MARKERS:
            rel, color, name, note, dur, mid = row
            h = holder_for(rel)
            if h is None:
                report["outside"].append(mid)
                continue
            obj, s, e, base = h
            have = taken(obj)
            if any((m.get("customData") or "") == TAG + mid for m in have.values()):
                report["skipped"] += 1
                continue
            fid = base + (rel - s)
            last = base + (e - s) - 1
            while fid in have and fid <= last:
                fid += 1
            if fid > last:
                report["failed"].append({"id": mid, "why": "no free frame left in its clip"})
                continue
            if fid != base + (rel - s):
                report["nudged"].append({"id": mid, "by": fid - (base + (rel - s))})
            if not DRY_RUN:
                if not obj.AddMarker(fid, color, name, note, max(1, int(dur)), TAG + mid):
                    report["failed"].append({"id": mid, "why": "AddMarker returned False", "frameId": fid, "color": color})
                    continue
            have[fid] = {"name": name, "customData": TAG + mid}
            report["added"] += 1
            colors[color] = colors.get(color, 0) + 1
        report["byColor"] = colors
        report["wanted"] = len(MARKERS)
        print("markers: %d added, %d already there, %d nudged, %d failed, %d outside the A-roll on %s (%s)%s" % (
            report["added"], report["skipped"], len(report["nudged"]), len(report["failed"]), len(report["outside"]),
            tl.GetName(), TARGET, " (dry run)" if DRY_RUN else ""))
        result = report
