# Finish an imported rough cut in DaVinci Resolve Studio through its native MCP server: a centred 2-frame audio-only
# "Cross Fade 0 dB" on every dialogue cut (so jump cuts do not click), and short fades at the ends of the music.
#
# Run it with the davinci-resolve MCP tool `run_script` (sandboxed; `project` is pre-injected; `result` is returned)
# after resolve-import.py and resolve-markers.py. build-timeline.mjs writes a filled copy to videos/<slug>/out/resolve-finish.py.
#
# TimelineItem.AddTransition({type, category: 'audio', position: 'start', alignment: 'center', duration}) on the incoming
# clip puts the fade across the seam without moving either clip or touching the video (tested on 21.1: frames 108206-108208
# around a cut at 108207, clip boundaries unchanged). Only seams where one clip ends exactly where the next starts get a
# fade; a seam that already has a transition is skipped, so running it twice adds nothing. Every clip references the
# original raw file, so there are handles for the overlap. Afterwards the track is read back: every seam must have
# exactly one transition of XFADE_FRAMES centred on it, or the seam is reported. DRY_RUN = True only reports.

# ---- DATA (build-timeline.mjs fills this block) ----
TIMELINE_NAME = ""            # "" = the current timeline
DIALOGUE_TRACK = 1            # audio track holding the A-roll
XFADE_FRAMES = 2
XFADE_TYPE = "Cross Fade 0 dB"
MUSIC_TRACKS = None           # audio tracks holding music beds; None = every audio track except DIALOGUE_TRACK
MUSIC_FADE_IN = 15            # frames
MUSIC_FADE_OUT = 30           # frames
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


def _split(track):
    clips, fades = [], []
    for it in tl.GetItemListInTrack("audio", track) or []:
        (fades if it.GetType() == "transition" else clips).append(it)
    return clips, fades


tl = _find_timeline(TIMELINE_NAME)
report = {"dryRun": DRY_RUN, "added": 0, "alreadyThere": 0, "gaps": 0, "failed": [], "music": []}
if tl is None:
    result = {"error": "timeline not found: " + (TIMELINE_NAME or "(current)")}
else:
    report["timeline"] = tl.GetName()
    clips, fades = _split(DIALOGUE_TRACK)
    covered = set()
    for f in fades:
        covered.add(int(round((f.GetStart() + f.GetEnd()) / 2.0)))
    seams = []
    for k in range(1, len(clips)):
        a, b = clips[k - 1], clips[k]
        if a.GetEnd() != b.GetStart():
            report["gaps"] += 1
            continue
        seam = b.GetStart()
        seams.append(seam)
        if seam in covered:
            report["alreadyThere"] += 1
            continue
        if DRY_RUN:
            report["added"] += 1
            continue
        tr = b.AddTransition({"type": XFADE_TYPE, "category": "audio", "position": "start", "alignment": "center", "duration": XFADE_FRAMES})
        if tr is None:
            report["failed"].append(seam)
        else:
            report["added"] += 1
    # read back: exactly one transition of the right length centred on every seam
    clips, fades = _split(DIALOGUE_TRACK)
    by_seam = {}
    for f in fades:
        c = int(round((f.GetStart() + f.GetEnd()) / 2.0))
        by_seam.setdefault(c, []).append(f)
    bad = []
    for s in seams:
        fs = by_seam.get(s, [])
        if len(fs) != 1 or fs[0].GetDuration() != XFADE_FRAMES or fs[0].GetName() != XFADE_TYPE:
            bad.append({"seam": s, "transitions": [[f.GetName(), f.GetStart(), f.GetEnd()] for f in fs]})
    report["seams"] = len(seams)
    report["verified"] = len(seams) - len(bad)
    report["unverified"] = bad[:20]
    # music fades
    music_tracks = MUSIC_TRACKS if MUSIC_TRACKS is not None else [t for t in range(1, tl.GetTrackCount("audio") + 1) if t != DIALOGUE_TRACK]
    for mt in music_tracks:
        mclips, _ = _split(mt)
        for it in mclips:
            ok = True if DRY_RUN else it.SetFades({"FadeIn": MUSIC_FADE_IN, "FadeOut": MUSIC_FADE_OUT})
            report["music"].append({"track": mt, "clip": it.GetName(), "ok": bool(ok), "fades": it.GetFades() if not DRY_RUN else None})
    print("crossfades: %d added, %d already there, %d gaps skipped, %d failed; %d/%d seams verified (%s %d frames)%s" % (
        report["added"], report["alreadyThere"], report["gaps"], len(report["failed"]), report["verified"], report["seams"],
        XFADE_TYPE, XFADE_FRAMES, " (dry run)" if DRY_RUN else ""))
    result = report
