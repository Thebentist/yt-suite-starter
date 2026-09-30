# Apply static punch-ins (Zoom X/Y + Position) to A-roll clips in DaVinci Resolve Studio through its native MCP server.
#
# The fallback for when the smoke test shows Resolve ignores FCPXML <adjust-transform> (or the timeline was imported
# through the API, whose ImportTimelineFromFile has no "use sizing information" option). Run it with the davinci-resolve
# MCP tool `run_script` (sandboxed Python; `project` is pre-injected; `result` is returned). build-timeline.mjs writes a
# filled copy to videos/<slug>/out/resolve-punchins.py with one row per punched-in clip.
#
# Clips are matched by where they START on the timeline (relative to the timeline start), not by index, so the script
# refuses to touch anything if the A-roll track no longer looks like the imported rough cut. DRY_RUN = True only reports.
# Pan/Tilt are Resolve's Position X/Y in timeline pixels (+x right, +y up).

# ---- DATA (build-timeline.mjs fills this block) ----
TIMELINE_NAME = ""            # "" = the current timeline
TRACK = 1                     # video track holding the A-roll
TIMELINE_START_FRAME = 108000 # frame of 01:00:00:00 in the FCPXML; rows below are absolute FCPXML frames
CLIP_COUNT = 0                # clips the FCPXML put on TRACK; 0 = do not check
PUNCHINS = [
    # (timeline start frame, zoom, position x px, position y px)
]
DRY_RUN = False
# ---- END DATA ----


def _find_timeline(name):
    if not name:
        return project.GetCurrentTimeline()
    for i in range(1, project.GetTimelineCount() + 1):
        t = project.GetTimelineByIndex(i)
        if t is not None and t.GetName() == name:
            return t
    return None


tl = _find_timeline(TIMELINE_NAME)
report = {"applied": 0, "unchanged": 0, "missing": [], "failed": [], "dryRun": DRY_RUN}
if tl is None:
    result = {"error": "timeline not found: " + TIMELINE_NAME}
else:
    items = [it for it in (tl.GetItemListInTrack("video", TRACK) or []) if it.GetType() != "transition"]
    report["timeline"] = tl.GetName()
    report["itemsOnTrack"] = len(items)
    if CLIP_COUNT and len(items) != CLIP_COUNT:
        result = {"error": "track %d has %d clips but the rough cut had %d; refusing to guess" % (TRACK, len(items), CLIP_COUNT), "timeline": tl.GetName()}
    else:
        tl_start = tl.GetStartFrame()
        by_start = {}
        for it in items:
            by_start[it.GetStart() - tl_start] = it
        for row in PUNCHINS:
            frame, zoom, px, py = row
            rel = frame - TIMELINE_START_FRAME
            it = by_start.get(rel)
            if it is None:
                it = by_start.get(rel - 1) or by_start.get(rel + 1)
            if it is None:
                report["missing"].append(frame)
                continue
            if DRY_RUN:
                report["applied"] += 1
                continue
            ok = it.SetProperty("ZoomX", float(zoom)) and it.SetProperty("ZoomY", float(zoom))
            if px:
                ok = it.SetProperty("Pan", float(px)) and ok
            if py:
                ok = it.SetProperty("Tilt", float(py)) and ok
            if ok:
                report["applied"] += 1
            else:
                report["failed"].append(frame)
        print("punch-ins: %d applied, %d missing, %d failed on %s track %d%s" % (
            report["applied"], len(report["missing"]), len(report["failed"]), tl.GetName(), TRACK, " (dry run)" if DRY_RUN else ""))
        result = report
