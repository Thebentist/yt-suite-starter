// @use videos/bad-breath-for-good/scenes/data/_lib.js
/* study-card-v1: the phase-1 look of study-card, restored at Ben's request ("i actually liked the first cut graphics of
 * this better", v4d notes). Same drawing as the phase-1 render frozen in work/snap/v4b/study-card.mp4; only the timing
 * source changed: anchor/anchorEnd + api.at, so it follows the current cut. The phase-2 version stays in study-card.js.
 *
 * Words 632-720: "people have actually tested how good we are at this ... people only got it right like half of the
 * time". A journal page on the dark stage; the camera reads down it: header + plain-words title, then FIG. 1 (the
 * method: a worried person rates their own breath, a professional judge sniffs and rates it), then FIG. 2 (self-rating
 * matched the examiner 37.8% of the time, against a 50% line) with the chip in Ben's words.
 * Source: Romano et al., Int J Dent Hyg 2010 (research-notes row 4).
 */
const PW = 1500, PH = 1900;           // page size in page units
const FIG1 = { y0: 730, y1: 1250 }, PX = 330, JX = 930, BASE = 1090, BS = 300;   // bust positions (page units)
const SCALE_Y = 1150, BOX = 58, GAP = 14;
const BAR = { x: 120, y: 1470, w: 1260, h: 100 }, MATCH = 0.378;

let DATA, T, page, bustPerson, bustJudge, titleGeom;

function bust(g, s, dir, o) {
  // profile bust, origin bottom centre, facing dir (+1 right / -1 left)
  g.save(); g.scale(dir, 1);
  const ink = o.ink || '#1b1a22';
  // torso
  const tg = g.createLinearGradient(0, -0.42 * s, 0, 0); tg.addColorStop(0, o.shirtHi); tg.addColorStop(1, o.shirt);
  g.fillStyle = tg; g.beginPath(); g.moveTo(-0.44 * s, 0); g.bezierCurveTo(-0.46 * s, -0.3 * s, -0.36 * s, -0.4 * s, -0.08 * s, -0.42 * s);
  g.lineTo(0.12 * s, -0.42 * s); g.bezierCurveTo(0.36 * s, -0.4 * s, 0.44 * s, -0.3 * s, 0.42 * s, 0); g.closePath(); g.fill();
  g.lineWidth = 4; g.strokeStyle = ink; g.stroke();
  if (o.coat) {   // lab coat lapels + pocket + pen
    g.fillStyle = '#e4e0d6'; g.beginPath(); g.moveTo(-0.02 * s, -0.42 * s); g.lineTo(0.14 * s, -0.42 * s); g.lineTo(0.06 * s, -0.2 * s); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = o.shirtUnder; g.beginPath(); g.moveTo(0.14 * s, -0.42 * s); g.lineTo(0.3 * s, -0.40 * s); g.lineTo(0.08 * s, -0.16 * s); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(0.18 * s, -0.16 * s, 0.14 * s, 0.1 * s);
    g.strokeStyle = '#3a6fd8'; g.lineWidth = 5; g.beginPath(); g.moveTo(0.22 * s, -0.22 * s); g.lineTo(0.22 * s, -0.13 * s); g.stroke();
  }
  // neck
  g.fillStyle = o.skin; g.beginPath(); g.rect(-0.06 * s, -0.56 * s, 0.14 * s, 0.17 * s); g.fill();
  g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.moveTo(-0.06 * s, -0.54 * s); g.lineTo(-0.06 * s, -0.42 * s); g.moveTo(0.08 * s, -0.54 * s); g.lineTo(0.08 * s, -0.42 * s); g.stroke();
  // head with nose and chin (profile)
  const hy = -0.74 * s;
  const hg = g.createRadialGradient(0.05 * s, hy - 0.08 * s, 0.02 * s, 0, hy, 0.28 * s); hg.addColorStop(0, o.skinHi); hg.addColorStop(1, o.skin);
  g.fillStyle = hg; g.beginPath();
  g.moveTo(-0.02 * s, hy - 0.25 * s);
  g.bezierCurveTo(0.14 * s, hy - 0.26 * s, 0.22 * s, hy - 0.14 * s, 0.21 * s, hy - 0.04 * s);   // forehead
  g.lineTo(0.28 * s, hy + 0.06 * s); g.lineTo(0.21 * s, hy + 0.08 * s);                        // nose
  g.lineTo(0.21 * s, hy + 0.12 * s); g.lineTo(0.18 * s, hy + 0.14 * s); g.lineTo(0.2 * s, hy + 0.16 * s); // lips
  g.bezierCurveTo(0.19 * s, hy + 0.24 * s, 0.1 * s, hy + 0.26 * s, 0.04 * s, hy + 0.22 * s);    // chin
  g.lineTo(0.02 * s, hy + 0.2 * s);
  g.bezierCurveTo(-0.16 * s, hy + 0.22 * s, -0.24 * s, hy + 0.06 * s, -0.22 * s, hy - 0.06 * s);
  g.bezierCurveTo(-0.2 * s, hy - 0.2 * s, -0.12 * s, hy - 0.25 * s, -0.02 * s, hy - 0.25 * s);
  g.closePath(); g.fill(); g.lineWidth = 4; g.strokeStyle = ink; g.stroke();
  // hair cap
  g.fillStyle = o.hair; g.beginPath(); g.moveTo(-0.23 * s, hy + 0.02 * s);
  g.bezierCurveTo(-0.26 * s, hy - 0.22 * s, -0.06 * s, hy - 0.32 * s, 0.14 * s, hy - 0.22 * s);
  g.bezierCurveTo(0.08 * s, hy - 0.16 * s, 0.0 * s, hy - 0.14 * s, -0.06 * s, hy - 0.1 * s);
  g.bezierCurveTo(-0.1 * s, hy - 0.04 * s, -0.14 * s, hy + 0.0 * s, -0.23 * s, hy + 0.02 * s); g.closePath(); g.fill(); g.stroke();
  // ear, eye
  g.fillStyle = o.skin; g.beginPath(); g.ellipse(-0.04 * s, hy + 0.02 * s, 0.035 * s, 0.05 * s, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 3; g.stroke();
  g.fillStyle = ink; g.beginPath(); g.arc(0.12 * s, hy - 0.03 * s, 0.018 * s, 0, Math.PI * 2); g.fill();
  if (o.glasses) { g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.arc(0.13 * s, hy - 0.03 * s, 0.05 * s, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(0.08 * s, hy - 0.04 * s); g.lineTo(-0.02 * s, hy - 0.02 * s); g.stroke(); }
  if (o.worried) {   // raised worried brow
    g.strokeStyle = ink; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(0.08 * s, hy - 0.1 * s); g.quadraticCurveTo(0.13 * s, hy - 0.13 * s, 0.18 * s, hy - 0.09 * s); g.stroke();
  }
  g.restore();
}

function scaleRow(ctx, api, cx, y, pick, pPick, color, label, pIn) {
  if (pIn <= 0) return;
  const w = 5 * BOX + 4 * GAP, x0 = cx - w / 2;
  ctx.save(); ctx.globalAlpha *= api.clamp(pIn * 1.4);
  for (let i = 0; i < 5; i++) {
    const k = api.prog(pIn, i * 0.1, 0.5, api.ease.outBack), x = x0 + i * (BOX + GAP);
    ctx.save(); ctx.translate(x + BOX / 2, y); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; api.roundRect(ctx, -BOX / 2, -BOX / 2, BOX, BOX, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(27,26,34,0.55)'; ctx.lineWidth = 3; ctx.stroke();
    api.text(ctx, String(i + 1), 0, 14, { size: 40, weight: 700, align: 'center', color: '#1b1a22' });
    ctx.restore();
  }
  api.text(ctx, label, cx, y + 76, { size: 34, weight: 700, align: 'center', color: 'rgba(27,26,34,0.7)', tracking: 2 });
  ctx.restore();
  if (pPick > 0) api.doodle.circle(ctx, x0 + (pick - 1) * (BOX + GAP) + BOX / 2, y, 46, 44, pPick, { color, width: 8, seed: pick * 7 });
}

defineScene({
  name: 'study-card-v1',
  anchor: { word: 632, offset: -0.15 },
  anchorEnd: { word: 720, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    DATA = window.DATA.init(api);
    const { P } = api;
    // the phase-1 timings, word-anchored (api.at(i) = the old W.at(i): word start - scene start)
    T = {
      enter: 0.0, tested: api.at(636), worried: api.at(655) + 0.15,
      pan1: api.at(659) - 0.3, person: api.at(659) - 0.05, rate: api.at(659), selfCircle: api.at(662) - 0.03, smellOwn: api.at(665),
      judge: api.at(675), judgeChip: api.at(676) + 0.03, realJob: api.at(679), apparently: api.at(684), sniff: api.at(690), judgeRate: api.at(698),
      guess: api.at(701) - 0.14, pan2: api.at(702) - 0.02, bar: api.at(711) - 0.04, half: api.at(717),
    };
    // measure the title words for the highlighter (serif, 80 px)
    const tsize = 80, tfont = { size: tsize, weight: 400, family: 'serif' };
    const l1 = 'A study of people worried', l2 = 'about their breath';
    const c = document.createElement('canvas').getContext('2d');
    titleGeom = {
      l1x0: 80 + api.measure(c, 'A study of people ', tfont), l1x1: 80 + api.measure(c, l1, tfont),
      l2x1: 80 + api.measure(c, l2, tfont),
    };
    page = DATA.paperSheet(PW, PH, {
      seed: 'study-page',
      draw(g) {
        const ink = '#1b1a22';
        api.text(g, 'INTERNATIONAL JOURNAL OF DENTAL HYGIENE', 80, 70, { size: 36, weight: 700, color: 'rgba(27,26,34,0.78)', tracking: 3 });
        api.text(g, '2010', PW - 80, 70, { size: 36, weight: 700, color: 'rgba(27,26,34,0.78)', tracking: 3, align: 'right' });
        g.fillStyle = ink; g.fillRect(80, 92, PW - 160, 4); g.fillRect(80, 102, PW - 160, 1.5);
        api.text(g, l1, 80, 232, { ...tfont, color: ink });
        api.text(g, l2, 80, 330, { ...tfont, color: ink });
        api.text(g, 'Romano et al.', 80, 404, { size: 40, weight: 400, family: 'serif', italic: true, color: 'rgba(27,26,34,0.65)' });
        DATA.textBars(g, 80, 452, 640, 9, { seed: 'abs1', lh: 26 });
        DATA.textBars(g, 780, 452, 640, 9, { seed: 'abs2', lh: 26 });
        // figure 1 frame
        api.text(g, 'FIG. 1', 80, 700, { size: 36, weight: 700, color: ink, tracking: 2 });
        api.text(g, 'METHOD', 190, 700, { size: 36, weight: 700, color: 'rgba(27,26,34,0.5)', tracking: 2 });
        g.fillStyle = 'rgba(120,100,160,0.07)'; api.roundRect(g, 80, FIG1.y0, PW - 160, FIG1.y1 - FIG1.y0, 14); g.fill();
        g.strokeStyle = 'rgba(27,26,34,0.25)'; g.lineWidth = 2; g.stroke();
        // figure 2 frame
        api.text(g, 'FIG. 2', 80, 1340, { size: 36, weight: 700, color: ink, tracking: 2 });
        api.text(g, 'RESULT', 190, 1340, { size: 36, weight: 700, color: 'rgba(27,26,34,0.5)', tracking: 2 });
        g.fillStyle = 'rgba(120,100,160,0.07)'; api.roundRect(g, 80, 1370, PW - 160, 400, 14); g.fill(); g.stroke();
        api.text(g, 'SELF-RATING MATCHED THE EXAMINER', BAR.x, 1440, { size: 36, weight: 700, color: 'rgba(27,26,34,0.72)', tracking: 2 });
        // bar ticks (printed)
        g.strokeStyle = 'rgba(27,26,34,0.25)';
        for (let i = 0; i <= 10; i++) { const x = BAR.x + (BAR.w * i) / 10; g.lineWidth = 2; g.beginPath(); g.moveTo(x, BAR.y + BAR.h + 6); g.lineTo(x, BAR.y + BAR.h + (i % 5 ? 16 : 26)); g.stroke(); }
        DATA.textBars(g, 80, 1810, 640, 3, { seed: 'end1', lh: 26 });
        DATA.textBars(g, 780, 1810, 640, 3, { seed: 'end2', lh: 26 });
      },
    });
    bustPerson = DATA.sprite(BS * 1.2, BS * 1.1, (g, w, h) => { g.translate(w / 2, h - 2); bust(g, BS, 1, { shirt: '#5b44c9', shirtHi: '#8f7bf0', skin: '#c9b8ff', skinHi: '#e7ddff', hair: '#2b2350', worried: true }); });
    bustJudge = DATA.sprite(BS * 1.2, BS * 1.1, (g, w, h) => { g.translate(w / 2, h - 2); bust(g, BS, -1, { shirt: '#f4f2ec', shirtHi: '#ffffff', shirtUnder: '#62c3b5', skin: '#8fd8c8', skinHi: '#c8f1e6', hair: '#1f3a3a', coat: true, glasses: true }); });
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    DATA.stage(ctx, t, { gy: 540, glowColor: P.lavender, glowAlpha: 0.12 });

    // ---- camera over the page (page units): enter, read the title, pan to FIG 1, pan to FIG 2
    const e0 = prog(t, T.enter, 1.1, ease.outExpo), e1 = prog(t, T.pan1, 0.95, ease.inOutCubic), e2 = prog(t, T.pan2, 0.95, ease.inOutCubic);
    let cy = lerp(-560, 360, e0); cy = lerp(cy, 985, e1); cy = lerp(cy, 1575, e2);
    let z = lerp(1.08, 1.02, e1); z = lerp(z, 1.1, e2); z *= 1 + 0.005 * t;           // slow creep
    const rot = lerp(-0.09, -0.022, e0) + 0.004 * Math.sin(t * 0.5);
    const cx = PW / 2 + 12 * Math.sin(t * 0.35);
    ctx.save();
    ctx.translate(960, 540); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-cx, -cy);
    DATA.drawPaper(ctx, page, 0, 0, { ax: 0, ay: 0, shadow: 60 });

    // "tested": marker underline under the journal line
    api.doodle.underline(ctx, 80, 900, 122, prog(t, T.tested - 0.1, 0.6, ease.inOutCubic), { color: P.marker, width: 7, seed: 5 });
    // highlighter on "worried about their breath" (multiply so the ink stays black)
    const hA = prog(t, T.worried, 0.35, ease.inOutCubic), hB = prog(t, T.worried + 0.3, 0.5, ease.inOutCubic);
    if (hA > 0) api.doodle.highlight(ctx, titleGeom.l1x0 - 8, 168, titleGeom.l1x1 - titleGeom.l1x0 + 16, 80, hA, { color: P.lime, alpha: 0.85, blend: 'multiply' });
    if (hB > 0) api.doodle.highlight(ctx, 72, 266, titleGeom.l2x1 - 64, 80, hB, { color: P.lime, alpha: 0.85, blend: 'multiply' });

    // ---- FIG 1: the person
    const pP = pop(t, T.person, 0.55);
    if (pP > 0) {
      const breathe = Math.sin(t * 2.2) * 0.008;
      DATA.blit(ctx, bustPerson, PX, BASE, { ax: 0.5, ay: 1, scale: pP * (1 + breathe), alpha: clamp(pP * 2) });
    }
    // own breath: a stink cloud by the mouth and an arrow back to the nose ("the smell of it")
    const own = prog(t, T.smellOwn, 1.4, ease.inOutSine);
    if (own > 0 && t < T.smellOwn + 2.4) {
      const mx = PX + 0.2 * BS, my = BASE - 0.74 * BS + 0.14 * BS, a = clamp(1 - (t - T.smellOwn - 1.5) / 0.9);
      DATA.icons.stink(ctx, mx + 70 + own * 20, my + 10 - own * 20, 70, pop(t, T.smellOwn, 0.5) * a, t, { lines: false });
      ctx.save(); ctx.globalAlpha *= a;
      api.doodle.arrow(ctx, mx + 110, my - 30, PX + 0.3 * BS, BASE - 0.74 * BS - 0.02 * BS, prog(t, T.smellOwn + 0.3, 0.7, ease.inOutCubic), { color: '#1b1a22', width: 6, bend: 40, head: 18, seed: 12 });
      ctx.restore();
    }
    scaleRow(ctx, api, PX, SCALE_Y, 2, prog(t, T.selfCircle, 0.6, ease.inOutCubic), P.purple, 'PERSON', prog(t, T.rate, 0.6));

    // ---- FIG 1: the professional judge
    const pJ = pop(t, T.judge, 0.55);
    if (pJ > 0) {
      const lean = prog(t, T.apparently + 0.3, 0.8, ease.inOutCubic) * (1 - prog(t, T.judgeRate - 0.2, 0.6, ease.inOutCubic));
      ctx.save(); ctx.translate(JX, BASE); ctx.rotate(-0.16 * lean); ctx.translate(-JX, -BASE);
      DATA.blit(ctx, bustJudge, JX, BASE, { ax: 0.5, ay: 1, scale: pJ, alpha: clamp(pJ * 2) });
      // sniff lines at the nose
      const sn = prog(t, T.sniff - 0.2, 0.5);
      if (sn > 0 && t < T.judgeRate) {
        const nx = JX - 0.3 * BS, ny = BASE - 0.74 * BS + 0.06 * BS;
        for (let k = 0; k < 3; k++) {
          const ph = ((t - T.sniff) * 2.2 + k / 3) % 1;
          api.doodle.stroke(ctx, [[nx - 30 - ph * 40, ny - 24 + k * 22], [nx - 10 - ph * 40, ny - 20 + k * 22]], 1, { color: '#1b1a22', width: 4, seed: 30 + k, alpha: sn * (1 - ph) });
        }
      }
      ctx.restore();
    }
    // the person's breath drifts over to the judge (apparently it's their job to smell bad breath)
    const drift = prog(t, T.apparently, 1.8, ease.inOutSine);
    if (drift > 0 && t < T.judgeRate + 0.8) {
      const fade = clamp(1 - (t - T.judgeRate) / 0.8);
      const x = lerp(PX + 0.36 * BS, JX - 0.5 * BS, drift), y = BASE - 0.66 * BS + Math.sin(drift * 7) * 16 - drift * 20;
      DATA.icons.stink(ctx, x, y, 84, pop(t, T.apparently, 0.5) * fade, t);
    }
    scaleRow(ctx, api, JX, SCALE_Y, 4, prog(t, T.judgeRate, 0.6, ease.inOutCubic), P.marker, 'TRAINED EXAMINER', prog(t, T.judge + 0.3, 0.6));
    DATA.chip(ctx, t, 'PROFESSIONAL BREATH JUDGE', JX + 70, 738, T.judgeChip, { size: 44, rotate: -0.03 });
    // "yes, a real job" doodle with an arrow to the chip
    const rj = prog(t, T.realJob, 0.8, ease.outCubic);
    api.doodle.text(ctx, 'yes, a real job', 1130, 900, rj, { color: P.marker, size: 50, rotate: -0.06 });
    api.doodle.arrow(ctx, 1240, 856, 1200, 782, prog(t, T.realJob + 0.55, 0.4, ease.inOutCubic), { color: P.marker, width: 6, bend: -20, head: 18, seed: 8 });
    // "guess what?": the two ratings don't match
    const ne = prog(t, T.guess, 0.4, ease.linear);
    if (ne > 0) {
      const nx = (PX + JX) / 2, ny = SCALE_Y;
      api.doodle.stroke(ctx, [[nx - 44, ny - 14], [nx + 44, ny - 16]], clamp(ne * 3), { color: P.marker, width: 9, seed: 41 });
      api.doodle.stroke(ctx, [[nx - 44, ny + 16], [nx + 44, ny + 14]], clamp(ne * 3 - 1), { color: P.marker, width: 9, seed: 42 });
      api.doodle.stroke(ctx, [[nx + 22, ny - 46], [nx - 22, ny + 46]], clamp(ne * 3 - 2), { color: P.marker, width: 9, seed: 43 });
    }

    // ---- FIG 2: agreement bar, 50% line, count to 37.8%
    const bp = prog(t, T.bar, 1.2, ease.outCubic);
    DATA.bar(ctx, BAR.x, BAR.y, BAR.w, BAR.h, MATCH * bp, { color: P.purple, trackColor: 'rgba(40,36,60,0.08)', trackStroke: 'rgba(27,26,34,0.25)', radius: 14, glow: 0.2 });
    const hl = prog(t, T.bar - 0.25, 0.6, ease.inOutCubic);
    if (hl > 0) {
      ctx.save(); ctx.strokeStyle = P.marker; ctx.lineWidth = 6; ctx.setLineDash([16, 12]); ctx.lineCap = 'round';
      const x = BAR.x + BAR.w * 0.5; ctx.beginPath(); ctx.moveTo(x, BAR.y - 26); ctx.lineTo(x, lerp(BAR.y - 26, BAR.y + BAR.h + 30, hl)); ctx.stroke(); ctx.restore();
      const pulse = 1 + 0.08 * Math.max(0, Math.sin((t - T.half) * 9)) * clamp(1 - (t - T.half) / 1.2) * (t > T.half ? 1 : 0);
      ctx.save(); ctx.translate(x, BAR.y + BAR.h + 80); ctx.scale(pulse, pulse);
      api.text(ctx, 'HALF', 0, 0, { size: 42, weight: 700, align: 'center', color: P.marker, tracking: 3, alpha: hl });
      ctx.restore();
    }
    if (bp > 0) {
      const v = DATA.count(t, T.bar, 1.3, 37.8);
      DATA.big(ctx, v.toFixed(1) + '%', BAR.x, 1732, { size: 150, align: 'left', color: '#1b1a22', glow: 'rgba(124,92,255,0.25)', p: clamp(bp * 3), noScale: true });
    }
    DATA.chip(ctx, t, 'RIGHT LESS THAN HALF THE TIME', 1040, 1712, T.half, { size: 46, rotate: -0.02 });
    ctx.restore();

    DATA.source(ctx, t, 'Romano et al., Int J Dent Hyg 2010 · 180 patients · self-rating matched a trained examiner in 37.8%', { at: 0.6, pill: true });
    // the phase-1 finish (vignette + grain, no bloom), kept so it matches the v4b render
    api.vignette(ctx, 0.5); api.grain(ctx, t, 0.055);
  },
});
