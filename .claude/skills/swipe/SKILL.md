---
name: swipe
description: One-command outlier research for long-form YouTube. Runs swipe-niches (intake and 8 adjacent niches), swipe-find (outliers at 3x their creator's baseline) and swipe-rewrite (our title, thumbnail and angle for each winner) in order, ending with a filming shortlist in Video Swipe File.xlsx. Use for "/swipe", "find me outliers", "what's working on YouTube that I could twist", "research my next video".
argument-hint: "[channel id] [idea | 'open sweep']"
---

Run the three skills in order in this conversation, following each one's SKILL.md exactly:

1. `.claude/skills/swipe-niches/SKILL.md`: stop once for the intake message and wait for the answers, then build and save the plan. Show the eight niches in one short table and continue without waiting unless the user objects.
2. `.claude/skills/swipe-find/SKILL.md`: YouTube runs to completion. Post one progress line after discovery (how many candidates) and one after the baselines (how many qualified).
3. `.claude/skills/swipe-rewrite/SKILL.md`: the first 10 winners.

Final message: the run folder, the workbook path, counts (candidates, qualified, rewritten), the recommended one or two concepts, and the next command (`/swipe-rewrite` for the rest, or `/write-script <run> <video_id>`). Keep it under 25 lines; the workbook holds the detail.
