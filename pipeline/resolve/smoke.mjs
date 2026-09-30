#!/usr/bin/env node
/* Resolve FCPXML smoke test: synthetic media + a small timeline that exercises every FCPXML feature the editor uses,
 * so a 2-minute manual import proves which ones DaVinci Resolve honours.
 *
 *   node pipeline/resolve/smoke.mjs [--fps 30|29.97|25|24] [--out renders/resolve-smoke] [--preview] [--no-media]
 *
 * Writes into renders/resolve-smoke/ (or --out):
 *   source.mp4     20 s 1920x1080 test pattern: 10x10 grid, red centre crosshair, burned-in SOURCE timecode, a beep every second
 *   overlay.mov    3 s ProRes 4444 with alpha (yellow box "OVERLAY lane 1"), same codec the scene renderer uses
 *   music.wav      15 s chord tone, 48 kHz stereo
 *   smoke.fcpxml   3 A-roll segments with the gaps cut out, segment 2 at scale 1.25 and offset, overlay on lane 1,
 *                  music at -12 dB on lane -1, a plain marker, a to-do marker and a chapter-marker
 *   smoke-spec.json  the timeline spec (render it with preview.mjs to compare against Resolve)
 *   EXPECTED.md    exactly what the timeline should look like after import, and a checklist to fill in
 *   resolve-import.py / resolve-verify.py / resolve-punchins.py / resolve-markers.py   the MCP route to the same test
 * --preview also renders smoke-preview.mp4 with pipeline/resolve/preview.mjs. --no-media keeps the existing media files
 * (Resolve holds them open once imported) and only rewrites the timeline, EXPECTED.md and the scripts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runFF, parseArgs, drawtextFont, FFMPEG } from './media.mjs';
import { writeTimeline, parseFps, timecode, framesToSec, secToFrames, timebase } from './fcpxml.mjs';
import { writeMcpScripts } from './mcp-scripts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const args = parseArgs(process.argv.slice(2));
const fps = parseFps(args.fps || 30);
const rate = `${fps.num}/${fps.den}`;
const tag = fps.den === 1 ? String(fps.num) : (fps.num / fps.den).toFixed(2).replace('.', '');
const sfx = tag === '30' ? '' : '-' + tag;
const OUT = path.resolve(ROOT, args.out || 'renders/resolve-smoke');
fs.mkdirSync(OUT, { recursive: true });
const font = drawtextFont();
const W = 1920, H = 1080;

async function makeMedia() {
  const src = path.join(OUT, `source${sfx}.mp4`);
  if (args['no-media']) {
    const files = { src, ov: path.join(OUT, `overlay${sfx}.mov`), mus: path.join(OUT, `music${sfx}.wav`) };
    for (const f of Object.values(files)) if (!fs.existsSync(f)) throw new Error(`--no-media but ${path.relative(ROOT, f)} is missing; run without it once`);
    return files;
  }
  const txt = (opts) => (font ? `,drawtext=${font}:${opts}` : '');
  const vf = [
    `drawgrid=w=iw/10:h=ih/10:t=3:c=white@0.55`,
    `drawbox=x=iw/2-3:y=0:w=6:h=ih:color=red@0.85:t=fill`,
    `drawbox=x=0:y=ih/2-3:w=iw:h=6:color=red@0.85:t=fill`,
  ].join(',')
    + txt(`timecode='00\\:00\\:00\\:00':rate=${rate}:fontsize=120:fontcolor=white:box=1:boxcolor=black@0.75:boxborderw=18:x=(w-tw)/2:y=(h-th)/2-180`)
    + txt(`text='SOURCE TC':fontsize=44:fontcolor=white:box=1:boxcolor=black@0.75:boxborderw=10:x=(w-tw)/2:y=(h-th)/2-300`)
    + txt(`text='TOP-LEFT':fontsize=40:fontcolor=black:box=1:boxcolor=white@0.9:boxborderw=8:x=12:y=12`)
    + txt(`text='BOTTOM-RIGHT':fontsize=40:fontcolor=black:box=1:boxcolor=white@0.9:boxborderw=8:x=w-tw-12:y=h-th-12`);
  await runFF(['-y', '-hide_banner', '-f', 'lavfi', '-i', `testsrc2=s=${W}x${H}:r=${rate}:d=20`,
    '-f', 'lavfi', '-i', 'sine=frequency=440:beep_factor=4:sample_rate=48000:duration=20',
    '-vf', vf, '-af', 'volume=-6dB', '-ac', '2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-g', String(timebase(fps)), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', '20', '-movflags', '+faststart', src]);

  const ov = path.join(OUT, `overlay${sfx}.mov`);
  // colour sources carry no alpha: force rgba, zero the alpha, then paint the box with replace=1 so it is opaque
  await runFF(['-y', '-hide_banner', '-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${rate}:d=3`,
    '-vf', `format=rgba,colorchannelmixer=aa=0,drawbox=x=120:y=760:w=1000:h=220:color=0xffcc33@1.0:t=fill:replace=1,drawbox=x=120:y=760:w=1000:h=220:color=black@1.0:t=6:replace=1`
      + txt(`text='OVERLAY lane 1':fontsize=84:fontcolor=black:x=160:y=822`),
    '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0', '-t', '3', ov]);

  const mus = path.join(OUT, `music${sfx}.wav`);
  await runFF(['-y', '-hide_banner',
    '-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=48000:duration=15',
    '-f', 'lavfi', '-i', 'sine=frequency=277.18:sample_rate=48000:duration=15',
    '-f', 'lavfi', '-i', 'sine=frequency=329.63:sample_rate=48000:duration=15',
    '-filter_complex', '[0][1][2]amix=inputs=3:normalize=0,volume=-9dB,afade=t=in:d=0.3,afade=t=out:st=14.5:d=0.5,pan=stereo|c0=c0|c1=c0[a]',
    '-map', '[a]', '-c:a', 'pcm_s16le', mus]);
  return { src, ov, mus };
}

function expectedMd(tl, files, specName) {
  const tc = (f) => timecode(f, tl.fps, tl.tcStartFrames);
  const stc = (f) => timecode(f, tl.fps, 0);
  const seg = tl.aroll;
  const fcpUnits = (px) => +((px / tl.height) * 100).toFixed(4);
  const ovl = tl.overlays[0], mu = tl.music[0];
  const mk = tl.markers;
  const lines = [];
  lines.push(`# Resolve smoke test: what you should see`, '');
  lines.push(`Generated by \`node pipeline/resolve/smoke.mjs${args.fps ? ' --fps ' + args.fps : ''}\`. Import \`${path.basename(files.xml)}\` and compare. This takes about 2 minutes and tells us which FCPXML features DaVinci Resolve actually honours.`, '');
  lines.push(`## Import`, '');
  lines.push(`1. Create a new empty project (Project Manager > New Project), open it.`);
  lines.push(`2. File > Import > Timeline... (Ctrl+Shift+I) and pick \`${files.xml.split(path.sep).join('/')}\`.`);
  lines.push(`3. In the Load XML dialog: leave **Automatically set project settings** ON (the empty project adopts ${tl.width}x${tl.height} at ${(tl.fps.num / tl.fps.den).toFixed(3).replace(/\.?0+$/, '')} fps), leave **Automatically import source clips into media pool** ON (the file paths in the XML are absolute), and turn **Use sizing information** ON (that is what carries the punch-in). Click OK.`);
  lines.push(`4. If Resolve asks to locate media, the files are in \`${OUT.split(path.sep).join('/')}\`.`, '');
  lines.push(`## Expected timeline "${tl.name}"`, '');
  lines.push(`- ${tl.width}x${tl.height}, ${(tl.fps.num / tl.fps.den).toFixed(3).replace(/\.?0+$/, '')} fps, starts at **${tc(0)}**, ends at **${tc(tl.durationFrames)}** (${framesToSec(tl.durationFrames, tl.fps).toFixed(2)} s long). The source is 20 s, so 7 s were cut out.`);
  lines.push(`- Every A-roll clip is one video+audio pair from \`source\`; the burned-in **SOURCE TC** and the beep every second prove which source range each clip plays.`, '');
  lines.push(`| # | Track | Timeline in | Timeline out | Plays source (burned-in TC) | Look for |`);
  lines.push(`|---|---|---|---|---|---|`);
  seg.forEach((s, i) => {
    const zoom = s.scale !== 1 ? `**ZOOMED ${s.scale}x**: about ${Math.round(10 / s.scale)} grid columns visible instead of 10, TOP-LEFT/BOTTOM-RIGHT labels cropped off, red crosshair moved ${s.position[0]} px right and ${s.position[1]} px up` : 'full frame: 10x10 grid, crosshair centred, both corner labels visible';
    lines.push(`| ${i + 1} | V1 + A1 | ${tc(s.recIn)} | ${tc(s.recOut)} | ${stc(s.srcIn)} to ${stc(s.srcOut - 1)} | ${zoom} |`);
  });
  lines.push(`| ${seg.length + 1} | V2 | ${tc(ovl.recIn)} | ${tc(ovl.recOut)} | overlay.mov 0 s to 3 s | yellow box "OVERLAY lane 1" lower left; the face/test pattern stays visible around it (alpha). Spans the cut at ${tc(seg[1].recIn)} |`);
  lines.push(`| ${seg.length + 2} | A2 | ${tc(mu.recIn)} | ${tc(mu.recOut)} | music.wav 0 s to ${framesToSec(mu.recOut - mu.recIn, tl.fps).toFixed(1)} s | steady chord under the beeps; clip volume **${mu.gainDb} dB** |`);
  lines.push('');
  lines.push(`Cut points: the source TC must jump ${stc(seg[0].srcOut - 1)} -> ${stc(seg[1].srcIn)} at ${tc(seg[1].recIn)} and ${stc(seg[1].srcOut - 1)} -> ${stc(seg[2].srcIn)} at ${tc(seg[2].recIn)}. Source seconds ${framesToSec(seg[0].srcOut, tl.fps)}-${framesToSec(seg[1].srcIn, tl.fps)} and ${framesToSec(seg[1].srcOut, tl.fps)}-${framesToSec(seg[2].srcIn, tl.fps)} must not appear anywhere.`, '');
  lines.push(`## Punch-in on clip 2`, '');
  lines.push(`FCPXML says \`<adjust-transform scale="${seg[1].scale} ${seg[1].scale}" position="${fcpUnits(seg[1].position[0])} ${fcpUnits(seg[1].position[1])}"/>\`. FCPXML position units are percent of frame height, so in Resolve's Inspector (Video > Transform) expect **Zoom X = Zoom Y = ${seg[1].scale.toFixed(3)}** and **Position X = ${seg[1].position[0]}, Position Y = ${seg[1].position[1]}**.`);
  lines.push(`- If Position shows ${fcpUnits(seg[1].position[0])} / ${fcpUnits(seg[1].position[1])}, Resolve reads FCP units as pixels (tell Claude: position must be written in pixels).`);
  lines.push(`- Any other numbers: write them down. For reference, percent-of-width would read ${+(fcpUnits(seg[1].position[0]) / 100 * tl.width).toFixed(1)} / ${+(fcpUnits(seg[1].position[1]) / 100 * tl.width).toFixed(1)}, and a flipped Y axis would show Position Y = -${seg[1].position[1]} (crosshair moved down instead of up).`);
  lines.push(`- If Zoom is 1.000 on every clip, sizing was ignored (check that Use sizing information was ON; if it was, use \`pipeline/resolve/apply-punchins.py\` through the Resolve MCP instead).`, '');
  lines.push(`## Markers`, '');
  lines.push(`| Timeline TC | FCPXML element | Name | Note | Expected |`);
  lines.push(`|---|---|---|---|---|`);
  for (const m of mk) {
    const el = m.kind === 'chapter' && m.element === 'chapter-marker' ? '`<chapter-marker>`' : m.kind === 'todo' ? '`<marker completed="0">` (to-do)' : '`<marker>`';
    const name = m.kind === 'chapter' && m.element !== 'chapter-marker' ? `CHAPTER: ${m.name}` : m.name;
    lines.push(`| ${tc(m.rec)} | ${el} | ${name} | ${m.note || ''} | a marker at this TC, on the clip (clip marker) or on the ruler (timeline marker) |`);
  }
  lines.push('');
  lines.push(`## Or through the Resolve Studio MCP (after the davinci-resolve server is approved)`, '');
  const mcpRel = path.relative(ROOT, files.mcpDir).split(path.sep).join('/');
  const specRel = path.relative(ROOT, specName).split(path.sep).join('/');
  lines.push(`Claude runs \`${mcpRel}/resolve-import.py\` with **run_script_unsafe** (MediaPool.ImportTimelineFromFile; it has no "use sizing information" switch), then \`${mcpRel}/resolve-markers.py\` with **run_script** (that import drops every FCPXML marker; this puts the ${mk.length} above back as clip markers on the A-roll), then \`${mcpRel}/resolve-verify.py\` with **run_script**, saves the returned JSON as \`${mcpRel}/resolve-verify.json\` and runs \`node pipeline/style/diff.mjs --ours ${specRel} --theirs ${mcpRel}/resolve-verify.json\`. Identical cut = nothing removed or restored; the punch-in line shows whether the API import kept the ${seg[1].scale}x (if not, \`${mcpRel}/resolve-punchins.py\` sets it); the verify's \`clipMarkers\` must list the ${mk.length} markers at the timecodes above, none hidden. Do the manual import as well: the dialog and the API may treat sizing and markers differently.`, '');
  lines.push(`## Checklist (write yes / no / what you saw, then paste it back to Claude)`, '');
  lines.push(`| Feature | Honoured? |`, `|---|---|`);
  for (const f of ['3 clips on V1/A1 with the right source ranges (cuts land on the TCs above)', 'Timeline starts at 01:00:00:00', 'Clip 2 Zoom = 1.25', 'Clip 2 Position (numbers shown)', 'Overlay on V2 at the right time', 'Overlay alpha (transparent around the box)', 'Music on its own audio track (A2)', 'Music clip volume -12 dB', 'Plain marker (CHAPTER: Intro)', 'Chapter-marker element', 'To-do marker (and its note text)', 'Markers are clip markers or timeline markers?', 'Media linked automatically (no offline red clips)']) lines.push(`| ${f} | |`);
  lines.push('');
  lines.push(`Also compare against \`smoke-preview.mp4\` (rendered by \`node pipeline/resolve/preview.mjs --spec ${path.relative(ROOT, specName).split(path.sep).join('/')}\`), which shows what the timeline should play like.`);
  return lines.join('\n') + '\n';
}

async function main() {
  console.log(`[smoke] ${args['no-media'] ? 'reusing' : 'building'} synthetic media at ${rate} fps in ${path.relative(ROOT, OUT) || OUT}`);
  const media = await makeMedia();
  const f = (s) => framesToSec(secToFrames(s, fps), fps);
  const spec = {
    version: 1, name: `resolve-smoke ${tag}`, event: 'YT Suite smoke test', fps: rate, width: W, height: H, tcStart: '01:00:00:00',
    media: { source: { path: media.src }, overlay: { path: media.ov }, music: { path: media.mus } },
    aroll: [
      { media: 'source', in: 0, out: 4, name: 'source' },
      { media: 'source', in: 6, out: 10, scale: 1.25, position: [108, 54], name: 'source' },
      { media: 'source', in: 13, out: 18, name: 'source' },
    ],
    overlays: [{ media: 'overlay', at: 2, duration: 3, name: 'overlay' }],
    music: [{ media: 'music', at: 0, duration: 13, gainDb: -12, name: 'music' }],
    markers: [
      { at: f(0.5), kind: 'chapter', name: 'Intro', note: 'plain marker used as a chapter' },
      { at: 5, kind: 'chapter', element: 'chapter-marker', name: 'Chapter element test' },
      { at: 9, kind: 'todo', name: 'REVIEW: to-do marker', note: 'this note text should appear in the marker' },
    ],
  };
  const xmlPath = path.join(OUT, tag === '30' ? 'smoke.fcpxml' : `smoke-${tag}.fcpxml`);
  const specPath = path.join(OUT, tag === '30' ? 'smoke-spec.json' : `smoke-${tag}-spec.json`);
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
  const { tl, report } = writeTimeline(spec, xmlPath, { baseDir: OUT });
  const expPath = path.join(OUT, tag === '30' ? 'EXPECTED.md' : `EXPECTED-${tag}.md`);
  const mcpDir = sfx ? path.join(OUT, 'mcp' + sfx) : OUT; fs.mkdirSync(mcpDir, { recursive: true });
  writeMcpScripts({ outDir: mcpDir, xmlPath, timelineName: spec.name, tcStartFrames: tl.tcStartFrames, clipCount: tl.aroll.length,
    punchins: tl.aroll.filter((s) => s.scale !== 1).map((s) => [tl.tcStartFrames + s.recIn, s.scale, s.position[0], s.position[1]]),
    markers: tl.markers });
  fs.writeFileSync(expPath, expectedMd(tl, { xml: xmlPath, mcpDir }, specPath));
  console.log(`[smoke] wrote ${path.relative(ROOT, xmlPath)} (${report.stats.spineClips} spine clips, connected ${JSON.stringify(report.stats.connected)}, ${report.stats.markers} markers, ${report.stats.transforms} transforms, ${report.stats.volumes} volume adjusts, ${report.stats.timeAttrsChecked} time attributes checked on the frame grid)`);
  if (report.warnings.length) console.log('[smoke] warnings:\n  ' + report.warnings.join('\n  '));
  if (tl.warnings.length) console.log('[smoke] timeline warnings:\n  ' + tl.warnings.join('\n  '));
  console.log(`[smoke] wrote ${path.relative(ROOT, expPath)}`);
  if (args.preview) {
    const r = spawnSync(process.execPath, [path.join(HERE, 'preview.mjs'), '--spec', specPath, '--out', path.join(OUT, `smoke-preview${tag === '30' ? '' : '-' + tag}.mp4`)], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status || 1);
  }
  console.log(JSON.stringify({ fcpxml: path.relative(ROOT, xmlPath).split(path.sep).join('/'), expected: path.relative(ROOT, expPath).split(path.sep).join('/'), valid: report.ok, stats: report.stats }));
}
main().catch((e) => { console.error('[smoke] ERROR', e.message); process.exit(1); });
void FFMPEG;
