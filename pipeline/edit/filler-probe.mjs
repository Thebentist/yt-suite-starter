/* Try-and-listen for fillers: find the exact stretch of audio that is the "um" by cutting candidates out of a short
 * snippet and asking whisper what is left.
 *
 * Why: whisper's time for an "um" was 0.25-1.2 s off on a real take, it stretches the word over pauses, and one "um"
 * can be two separate bursts. Snapping to the nearest voiced blob still missed 2 of 5 (caught by qa-render.mjs).
 * An editor tries the cut and listens; this does the machine version:
 *   1. candidates = each isolated voiced blob (0.06-0.9 s) within +-0.8 s of the filler's estimate, and each pair of
 *      neighbouring blobs (union <= 1.1 s);
 *   2. a 16 kHz snippet of +-1.6 s around it, once as is and once per candidate with that range removed;
 *   3. one whisper run over all snippets (model loaded once), prompted so it writes fillers down;
 *   4. a candidate passes when the snippet has fewer fillers after the cut AND no other word went missing (whisper noise
 *      allowed: at most one substituted word). The passing candidate that removes the most fillers, then the least
 *      audio, wins. No pass (or whisper does not hear a filler in the snippet at all) -> the filler stays for a human.
 *
 *   probeFillers({ media, targets: [{key, t, end}], env, thr, work, whisper, model }) -> Map(key -> decision)
 *   decision: { cut: {from, to} | null, why, tried: [{from, to, text}] , baseline }
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runFF } from '../resolve/media.mjs';
import { editOps, normWord, FILLER_RE } from './words-merge.mjs';

const PROMPT = 'Um, so, uh, I think, um, yeah. Okay?';

function blobs(env, thr, t0, t1, minGap = 0.05) {
  const out = []; let s = null, lastV = null;
  for (let t = Math.max(0, t0); t < t1; t += env.win) {
    const d = env.db[Math.floor(t / env.win)] ?? -120;
    if (d > thr) { if (s == null) s = t; else if (t - lastV > minGap) { out.push([s, lastV]); s = t; } lastV = t + env.win; }
  }
  if (s != null) out.push([s, lastV]);
  return out.filter(([x, y]) => x > Math.max(0, t0) + env.win && y < t1 - env.win);
}

const words = (text) => String(text).replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').split(/\s+/).map(normWord).filter(Boolean);

export async function probeFillers({ media, targets, env, thr, work, whisper, model, keepFiles = false }) {
  const dir = path.join(work, 'filler-probe');
  fs.mkdirSync(dir, { recursive: true });
  // the whole take once as 16 kHz mono, then cheap cuts from it
  const full = path.join(dir, 'full16k.wav');
  if (!fs.existsSync(full) || fs.statSync(full).mtimeMs < fs.statSync(media).mtimeMs) await runFF(['-y', '-hide_banner', '-loglevel', 'error', '-i', media, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', full]);
  const jobs = [];
  for (const tg of targets) {
    const S = Math.max(0, tg.t - 1.6), E = tg.end + 1.6;
    const bl = blobs(env, thr, tg.t - 0.8, tg.end + 0.8).filter(([x, y]) => y - x >= 0.06 && y - x <= 0.9);
    const cands = bl.map(([x, y]) => [x, y]);
    for (let k = 0; k + 1 < bl.length; k++) if (bl[k + 1][1] - bl[k][0] <= 1.1) cands.push([bl[k][0], bl[k + 1][1]]);
    const mid = (tg.t + tg.end) / 2;
    cands.sort((a, b) => Math.abs((a[0] + a[1]) / 2 - mid) - Math.abs((b[0] + b[1]) / 2 - mid));
    const chosen = cands.slice(0, 6).map(([x, y]) => [+(x - 0.02).toFixed(3), +(y + 0.02).toFixed(3)]);
    const base = path.join(dir, `${tg.key}-base.wav`);
    await runFF(['-y', '-hide_banner', '-loglevel', 'error', '-ss', S.toFixed(3), '-t', (E - S).toFixed(3), '-i', full, '-c:a', 'pcm_s16le', base]);
    const files = [];
    for (const [k, [a, b]] of chosen.entries()) {
      const f = path.join(dir, `${tg.key}-c${k}.wav`);
      await runFF(['-y', '-hide_banner', '-loglevel', 'error', '-i', base, '-filter_complex',
        `[0:a]atrim=0:${(a - S).toFixed(3)},asetpts=PTS-STARTPTS[p];[0:a]atrim=${(b - S).toFixed(3)},asetpts=PTS-STARTPTS[q];[p][q]concat=n=2:v=0:a=1[o]`, '-map', '[o]', '-c:a', 'pcm_s16le', f]);
      files.push({ f, cut: [a, b] });
    }
    jobs.push({ tg, base, files });
  }
  const all = jobs.flatMap((j) => [j.base, ...j.files.map((x) => x.f)]);
  const decisions = new Map();
  if (!all.length) return decisions;
  // one whisper run over every snippet (the model loads once), in chunks to keep the command line short
  for (let k = 0; k < all.length; k += 40) {
    const chunk = all.slice(k, k + 40).filter((f) => !fs.existsSync(f + '.json'));
    if (!chunk.length) continue;
    const r = spawnSync(whisper, ['-m', model, ...chunk.flatMap((f) => ['-f', f]), '-l', 'en', '-oj', '-np', '--prompt', PROMPT, '-t', '8'], { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0) throw new Error(`whisper failed: ${(r.stderr || '').slice(-500)}`);
  }
  const textOf = (f) => { try { return (JSON.parse(fs.readFileSync(f + '.json', 'utf8')).transcription || []).map((s) => s.text).join(' ').trim(); } catch { return ''; } };
  for (const j of jobs) {
    const baseText = textOf(j.base), B = words(baseText);
    const fB = B.filter((w) => FILLER_RE.test(w)).length, NB = B.filter((w) => !FILLER_RE.test(w));
    const tried = [];
    let best = null;
    for (const c of j.files) {
      const text = textOf(c.f), C = words(text);
      const fC = C.filter((w) => FILLER_RE.test(w)).length, NC = C.filter((w) => !FILLER_RE.test(w));
      const ops = editOps(NB, NC);
      const lost = ops.filter((o) => o.type === 'del').map((o) => NB[o.i]), subs = ops.filter((o) => o.type === 'sub').length;
      const pass = fB > 0 && fC < fB && lost.length === 0 && subs <= 1;
      tried.push({ from: c.cut[0], to: c.cut[1], text, fillersBefore: fB, fillersAfter: fC, lost, pass });
      if (pass && (!best || fC < best.fC || (fC === best.fC && c.cut[1] - c.cut[0] < best.cut[1] - best.cut[0]))) best = { cut: c.cut, fC };
    }
    const why = best ? `tried ${tried.length} cuts; removing ${best.cut[0].toFixed(2)}-${best.cut[1].toFixed(2)} s takes the filler out and keeps every other word`
      : fB === 0 ? `whisper hears no filler in the ${(j.tg.end - j.tg.t + 3.2).toFixed(1)} s around it` : `none of ${tried.length} candidate cuts removed the filler without losing a word`;
    decisions.set(j.tg.key, { cut: best ? { from: best.cut[0], to: best.cut[1] } : null, why, baseline: baseText, tried });
  }
  if (!keepFiles) for (const f of all) { fs.rmSync(f, { force: true }); fs.rmSync(f + '.json', { force: true }); }
  return decisions;
}
