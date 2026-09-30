# Import a rough-cut FCPXML (and its captions into the media pool) into the open DaVinci Resolve Studio project via the
# native MCP.
#
# Needs the davinci-resolve MCP tool `run_script_unsafe` (it reads files from disk, which the sandboxed `run_script`
# cannot). `project` is pre-injected; `result` is returned. build-timeline.mjs writes a filled copy to
# videos/<slug>/out/resolve-import.py. Importing always creates a NEW timeline; nothing existing is changed.
#
# What this import keeps and drops (Resolve Studio 21.1, renders/resolve-smoke/RESULT.md): cuts, adjust-transform
# zoom/position (even without a "use sizing information" switch), adjust-volume and alpha overlays survive; every
# FCPXML marker is dropped (run resolve-markers.py next); <caption> elements are ignored.
# Captions: the SRT is only imported INTO THE MEDIA POOL here. The API cannot place it: AppendToTimeline adds nothing
# without a subtitle track, puts it at the END of the timeline with one (recordFrame is ignored for subtitles), and
# crashed Resolve when given a source range. So a human drags the "captions" clip onto the timeline at 01:00:00:00.

# ---- DATA (build-timeline.mjs fills this block) ----
FCPXML_PATH = r""        # absolute path to videos/<slug>/out/timeline.fcpxml
TIMELINE_NAME = ""       # "" = the name inside the FCPXML
SRT_PATH = r""           # optional: videos/<slug>/out/captions.srt
IMPORT_SOURCE_CLIPS = True
PICTURE_ONLY_AROLL = False   # split-edit builds: the dialogue comes from one stem, so the A-roll audio is removed
# ---- END DATA ----

mp = project.GetMediaPool()
info = {"ok": False, "fcpxml": FCPXML_PATH}
opts = {"importSourceClips": IMPORT_SOURCE_CLIPS}
if TIMELINE_NAME:
    opts["timelineName"] = TIMELINE_NAME
tl = mp.ImportTimelineFromFile(FCPXML_PATH, opts)
if tl is None:
    info["error"] = "ImportTimelineFromFile returned None (wrong path, unreadable XML, or a timeline with that name exists)"
else:
    project.SetCurrentTimeline(tl)
    info["ok"] = True
    info["timeline"] = tl.GetName()
    info["startFrame"] = tl.GetStartFrame()
    info["endFrame"] = tl.GetEndFrame()
    info["videoTracks"] = tl.GetTrackCount("video")
    info["audioTracks"] = tl.GetTrackCount("audio")
    info["v1Items"] = len(tl.GetItemListInTrack("video", 1) or [])
    v1 = tl.GetItemListInTrack("video", 1) or []
    info["v1Zoomed"] = len([it for it in v1 if (it.GetProperty("ZoomX") or 1) > 1.001])
    if PICTURE_ONLY_AROLL:
        # Resolve ignores srcEnable="video" on storyline clips (21.1, 2026-09-28): unlink, then delete only the A1 audio
        v1i = tl.GetItemListInTrack("video", 1) or []
        a1i = tl.GetItemListInTrack("audio", 1) or []
        before = [(i.GetStart(), i.GetEnd()) for i in v1i]
        tl.SetClipsLinked(v1i + a1i, False)
        info["arollAudioRemoved"] = bool(tl.DeleteClips(a1i, False)) and not (tl.GetItemListInTrack("audio", 1) or [])
        info["pictureUnchanged"] = before == [(i.GetStart(), i.GetEnd()) for i in (tl.GetItemListInTrack("video", 1) or [])]
    if SRT_PATH:
        subs = mp.ImportMedia([SRT_PATH]) or []
        info["captionsInMediaPool"] = subs[0].GetName() if subs else None
        if subs:
            info["captionsTodo"] = "drag the subtitle clip '%s' from the media pool onto the timeline so it starts at %s" % (
                subs[0].GetName(), tl.GetStartTimecode())
    print("imported %s: %d V1 clips (%d zoomed), %d video / %d audio tracks" % (
        info["timeline"], info["v1Items"], info["v1Zoomed"], info["videoTracks"], info["audioTracks"]))
result = info
