# Queue and start a render of the rough cut in DaVinci Resolve Studio through its native MCP server.
#
# MODE "qa": an audio-only 48 kHz 24-bit WAV of the whole timeline for pipeline/resolve/qa-render.mjs (the automated
#            listen: clicks at seams, loudness, re-transcription against the plan). About 30 s for 6 minutes on this PC.
# MODE "deliver": a YouTube file (MP4, NVIDIA H.265 by default) at the timeline resolution and frame rate.
# MODE "review": the same kind of job at RESOLUTION (1080p H.264) for the review app (pipeline/review/).
#
# Run it with `run_script` (sandboxed; it only calls Resolve). It returns at once with the job id; the render runs in
# Resolve's queue. Poll with a short run_script: project.GetRenderJobStatus(job_id). Never wait inside one long script:
# an MCP timeout mid-call can take Resolve down. build-timeline.mjs writes a filled copy to out/resolve-render.py
# (MODE qa) and out/resolve-deliver.py (MODE deliver).

# ---- DATA (build-timeline.mjs fills this block) ----
TIMELINE_NAME = ""
MODE = "qa"
TARGET_DIR = r""
CUSTOM_NAME = "qa-mix"
FORMAT = "mp4"
CODEC = "H265_NVIDIA"
VIDEO_QUALITY = 0             # 0 = automatic, or a bit rate in kb/s
VIDEO_PRESET = "YouTube - 2160p"
RESOLUTION = ""               # "" = the timeline resolution, or "1920x1080" (review renders)
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
if tl is None:
    result = {"error": "timeline not found: " + (TIMELINE_NAME or "(current)")}
elif project.IsRenderingInProgress():
    result = {"error": "Resolve is already rendering; poll the running job first"}
else:
    project.SetCurrentTimeline(tl)
    info = {"timeline": tl.GetName(), "mode": MODE}
    if MODE == "qa":
        info["preset"] = project.LoadRenderPreset("Audio Only")
        settings = {"SelectAllFrames": True, "TargetDir": TARGET_DIR, "CustomName": CUSTOM_NAME, "ExportVideo": False, "ExportAudio": True,
                    "AudioCodec": "lpcm", "AudioBitDepth": 24, "AudioSampleRate": 48000}
        ext = "wav"
    else:
        # load a video preset first: after the "Audio Only" preset, setting format/codec and ExportVideo alone still
        # queued an audio-only MP4 (21.1, 2026-09-28). The job is read back below and refused if it has no video.
        info["preset"] = project.LoadRenderPreset(VIDEO_PRESET)
        info["format"] = project.SetCurrentRenderFormatAndCodec(FORMAT, CODEC)
        settings = {"SelectAllFrames": True, "TargetDir": TARGET_DIR, "CustomName": CUSTOM_NAME, "ExportVideo": True, "ExportAudio": True,
                    "AudioCodec": "aac", "AudioSampleRate": 48000,
                    "FormatWidth": int(RESOLUTION.split("x")[0] if RESOLUTION else tl.GetSetting("timelineResolutionWidth")), "FormatHeight": int(RESOLUTION.split("x")[1] if RESOLUTION else tl.GetSetting("timelineResolutionHeight"))}
        if VIDEO_QUALITY:
            settings["VideoQuality"] = VIDEO_QUALITY
        ext = FORMAT
    info["settings"] = project.SetRenderSettings(settings)
    job = project.AddRenderJob()
    info["jobId"] = job
    # what Resolve actually queued (its own job record), checked before starting
    rec = [j for j in (project.GetRenderJobList() or []) if j.get("JobId") == job]
    rec = rec[0] if rec else {}
    info["queued"] = {k: rec.get(k) for k in ("OutputFilename", "IsExportVideo", "IsExportAudio", "VideoFormat", "VideoCodec", "AudioCodec", "FormatWidth", "FormatHeight", "FrameRate")}
    want_video = MODE != "qa"
    if not job or bool(rec.get("IsExportVideo")) != want_video or not rec.get("IsExportAudio"):
        if job:
            project.DeleteRenderJob(job)
        info["error"] = "Resolve queued the wrong kind of render (video %s, audio %s); job deleted, nothing rendered" % (rec.get("IsExportVideo"), rec.get("IsExportAudio"))
        info["started"] = False
    else:
        info["started"] = project.StartRendering([job])
    info["output"] = TARGET_DIR.rstrip("\\/") + "\\" + CUSTOM_NAME + "." + ext
    info["status"] = project.GetRenderJobStatus(job) if job else None
    print("render %s: job %s %s -> %s" % (MODE, job, "started" if info["started"] else "NOT started", info["output"]))
    result = info
