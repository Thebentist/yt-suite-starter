// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
/* study-card (words 632-720): "people have actually tested how good we are at this. They had people that were worried
 * about their breath rate their own breath ... and then they would have a professional bad breath smeller, yeah,
 * that's actually a thing ... it's their job to just smell bad breath, would smell it and then rate it, and guess
 * what? people only got it right like half of the time."
 * Seven shots cut on the words: the journal page under a desk lamp -> the title, highlighted -> the worried person
 * (rim-lit silhouette) rating their own breath -> the professional judge -> the two of them, the breath drifting over
 * -> the two ratings side by side, not matching -> the result as a glowing bar on a data floor: 37.8% against a HALF
 * line, chip in Ben's words. The example ratings (2 vs 4) are illustrative.
 * Source: Romano et al., Int J Dent Hyg 2010 (research-notes row 4).
 */
const PW = 1500, PH = 1250;
let DATA, T, SHOTS, page, titleGeom;

function hud(ctx, api, x, y, sel, pSel, color, label, pIn, o = {}) {
  if (pIn <= 0) return;
  const { P } = api, R = o.r ?? 34, gap = o.gap ?? 92, x0 = x - 2 * gap;
  ctx.save(); ctx.globalAlpha *= api.clamp(pIn * 1.4);
  DATA.caps(ctx, label, x, y - R - 30, { size: o.labelSize || 30, align: 'center', color: DATA.alpha(color, 0.9), tracking: 5 });
  for (let i = 0; i < 5; i++) {
    const k = api.prog(pIn, i * 0.08, 0.5, api.ease.outBack), cx = x0 + i * gap, on = i + 1 === sel ? pSel : 0;
    ctx.save(); ctx.translate(cx, y); ctx.scale(k, k);
    if (on > 0) DATA.glow(ctx, 0, 0, R * 2.6, color, 0.45 * on);
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.4, 2, 0, 0, R);
    g.addColorStop(0, on > 0 ? DATA.mix('#2a2550', color, on * 0.9) : '#2a2550'); g.addColorStop(1, on > 0 ? DATA.mix('#120f26', color, on * 0.55) : '#120f26');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = on > 0 ? color : 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2.5; ctx.stroke();
    api.text(ctx, String(i + 1), 0, R * 0.36, { size: R * 1.05, weight: 700, align: 'center', color: on > 0.5 ? P.black : 'rgba(244,241,234,0.8)' });
    ctx.restore();
  }
  ctx.restore();
}

defineScene({
  name: 'study-card',
  anchor: { word: 632, offset: -0.15 },
  anchorEnd: { word: 720, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    DATA = window.DATA.init(api);
    T = { tested: api.at(636), they: api.at(650), worried: api.at(655), about: api.at(656), rate: api.at(659), own: api.at(661), smell: api.at(665),
      prof: api.at(675), smeller: api.at(678), yeah: api.at(679), apparently: api.at(684), job: api.at(687), smellBad: api.at(690), smellIt: api.at(694),
      rateIt: api.at(698), guess: api.at(701), people: api.at(711), right: api.at(715), half: api.at(717) };
    SHOTS = [0, T.they - 0.06, T.rate - 0.06, T.prof - 0.08, T.apparently - 0.06, T.guess - 0.2, T.people - 0.1];
    const tfont = { size: 84, weight: 400, family: 'serif' }, c = document.createElement('canvas').getContext('2d');
    const l1 = 'A study of people worried', l2 = 'about their breath';
    titleGeom = { l1x0: 90 + api.measure(c, 'A study of people ', tfont), l1x1: 90 + api.measure(c, l1, tfont), l2x1: 90 + api.measure(c, l2, tfont) };
    page = DATA.paperSheet(PW, PH, { seed: 'study-page2', draw(g) {
      const ink = '#1b1a22';
      api.text(g, 'INTERNATIONAL JOURNAL OF DENTAL HYGIENE', 90, 86, { size: 38, weight: 700, color: 'rgba(27,26,34,0.8)', tracking: 3 });
      api.text(g, '2010', PW - 90, 86, { size: 38, weight: 700, color: 'rgba(27,26,34,0.8)', tracking: 3, align: 'right' });
      g.fillStyle = ink; g.fillRect(90, 110, PW - 180, 4); g.fillRect(90, 121, PW - 180, 1.5);
      api.text(g, l1, 90, 262, { ...tfont, color: ink });
      api.text(g, l2, 90, 364, { ...tfont, color: ink });
      api.text(g, 'Romano et al.', 90, 440, { size: 42, weight: 400, family: 'serif', italic: true, color: 'rgba(27,26,34,0.65)' });
      g.fillStyle = 'rgba(27,26,34,0.25)'; g.fillRect(90, 480, PW - 180, 1.5);
      DATA.textBars(g, 90, 520, 630, 18, { seed: 'abs1', lh: 30, th: 9, para: 7 });
      DATA.textBars(g, 780, 520, 630, 11, { seed: 'abs2', lh: 30, th: 9, para: 6 });
      g.strokeStyle = 'rgba(27,26,34,0.3)'; g.lineWidth = 2; g.strokeRect(780, 870, 630, 300);
      g.fillStyle = 'rgba(124,92,255,0.5)'; for (let i = 0; i < 5; i++) g.fillRect(820 + i * 115, 1130 - [120, 190, 90, 220, 150][i], 70, [120, 190, 90, 220, 150][i]);
      api.text(g, 'FIG. 1', 780, 1210, { size: 26, weight: 700, color: 'rgba(27,26,34,0.6)', tracking: 2 });
    } });
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    const sh = DATA.shot(t, SHOTS), lt = sh.lt;
    const bg = (top, bot) => { const g = ctx.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); };

    if (sh.i === 0 || sh.i === 1) {
      // ---------------- the journal page on a dark desk, under a warm lamp
      bg('#120d18', '#07060c');
      DATA.glow(ctx, 700, 260, 1100, '#ffb46b', 0.16);
      const pageAt = (g) => {
        g.save();
        if (sh.i === 0) { g.translate(980 - lt * 10, 470 + lt * 6); g.rotate(-0.13 + lt * 0.006); g.scale(1.02 + lt * 0.018, 0.86 * (1.02 + lt * 0.018)); g.translate(-PW / 2, -170); }
        else { g.translate(900 - lt * 18, 520); g.rotate(-0.035); g.scale(1.9 + lt * 0.04, 1.9 * 0.93 + lt * 0.04); g.translate(-560, -300); }
        g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 60; g.shadowOffsetY = 30; g.fillStyle = '#e9e3d4'; g.fillRect(0, 0, PW, PH); g.shadowColor = 'transparent';
        g.drawImage(page, 0, 0, PW, PH);
        // marker work on the page, on the words
        api.doodle.underline(g, 90, 980, 142, prog(t, T.tested - 0.1, 0.6, ease.inOutCubic), { color: P.marker, width: 8, seed: 5 });
        const hA = prog(t, T.worried, 0.35, ease.inOutCubic), hB = prog(t, T.about + 0.05, 0.55, ease.inOutCubic);
        if (hA > 0) api.doodle.highlight(g, titleGeom.l1x0 - 8, 196, titleGeom.l1x1 - titleGeom.l1x0 + 16, 86, hA, { color: P.lime, alpha: 0.85, blend: 'multiply' });
        if (hB > 0) api.doodle.highlight(g, 82, 298, titleGeom.l2x1 - 74, 86, hB, { color: P.lime, alpha: 0.85, blend: 'multiply' });
        // lamp light falling across the paper
        const lg = g.createRadialGradient(300, -200, 100, 400, 200, 1500); lg.addColorStop(0, 'rgba(255,190,120,0.18)'); lg.addColorStop(1, 'rgba(0,0,0,0.28)');
        g.fillStyle = lg; g.fillRect(0, 0, PW, PH);
        g.restore();
      };
      DATA.dof(ctx, sh.i === 0 ? 7 : 5, pageAt, sh.i === 0 ? DATA.bandMask(-100, 80, 520, 900) : DATA.bandMask(180, 330, 700, 900));
      DATA.bokeh(ctx, t, { n: 7, seed: 'desk', alpha: 0.1, size: [160, 360], colors: ['#ffb46b', '#a78bfa'], drift: 6 });
    } else if (sh.i === 2 || sh.i === 3 || sh.i === 4) {
      // ---------------- the people: rim-lit silhouettes in the dark
      bg('#0c0a1d', '#050409');
      const person = { x: 0, y: 0, s: 0 }, judge = { x: 0, y: 0, s: 0 };
      if (sh.i === 2) { person.x = 700 - lt * 12; person.y = 1180; person.s = 1000 + lt * 20; }
      if (sh.i === 3) { judge.x = 1230 + lt * 10; judge.y = 1180; judge.s = 1000 + lt * 20; }
      if (sh.i === 4) { person.x = 560 + lt * 4; person.y = 1030; person.s = 640; judge.x = 1380 - lt * 4; judge.y = 1030; judge.s = 640; }
      // backlights
      if (person.s) DATA.glow(ctx, person.x - person.s * 0.45, person.y - person.s * 0.8, person.s * 1.1, P.lavender, 0.3);
      if (judge.s) DATA.glow(ctx, judge.x + judge.s * 0.45, judge.y - judge.s * 0.8, judge.s * 1.1, P.cyan, 0.26);
      if (sh.i === 4) { ctx.save(); const fg = ctx.createLinearGradient(0, 1000, 0, 1080); fg.addColorStop(0, 'rgba(120,100,255,0.10)'); fg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = fg; ctx.fillRect(0, 1000, 1920, 80); ctx.restore(); }
      DATA.bokeh(ctx, t, { n: 9, seed: 'ppl' + sh.i, alpha: 0.1, size: [140, 300], colors: [P.lavender, P.cyan], drift: 8 });
      // breath (gas puffs)
      const puff = (x, y, s, a) => { if (a > 0) api.icons.puff(ctx, x, y, s, a, P.gas); };
      if (person.s) {
        const mx = person.x + person.s * 0.22, my = person.y - person.s * 0.61;
        const own = prog(t, T.smell - 0.4, 1.4, ease.inOutSine);
        if (sh.i === 2) for (let k = 0; k < 5; k++) { const u = clamp(own * 1.3 - k * 0.12); if (u <= 0) continue; const ang = -0.2 - u * 2.3; puff(mx + 60 + Math.cos(ang) * 110 * u, my - 40 + Math.sin(ang) * 120 * u, 60 + k * 8, 0.35 * Math.sin(u * Math.PI)); }
        ctx.save(); ctx.translate(person.x, person.y);
        DATA.rimLit(ctx, (g) => DATA.profilePath(g, person.s, 1), { rim: '#c9bbff', light: [-1, -0.35], off: person.s * 0.007, glow: person.s * 0.06, gx0: -person.s * 0.35, gy0: -person.s * 0.8, gx1: person.s * 0.2, gy1: -person.s * 0.4 });
        ctx.restore();
      }
      if (judge.s) {
        ctx.save(); ctx.translate(judge.x, judge.y);
        DATA.rimLit(ctx, (g) => DATA.profilePath(g, judge.s, -1, { glasses: true }), { rim: '#9ff3ea', light: [1, -0.35], off: judge.s * 0.007, glow: judge.s * 0.06, gx0: judge.s * 0.35, gy0: -judge.s * 0.8, gx1: -judge.s * 0.2, gy1: -judge.s * 0.4 });
        ctx.restore();
        // sniff lines at the nose
        const nx = judge.x - judge.s * 0.3, ny = judge.y - judge.s * 0.68, sn = sh.i === 3 ? prog(t, T.smeller, 0.4) : prog(t, T.smellIt - 0.1, 0.3) * (1 - prog(t, T.rateIt, 0.3));
        if (sn > 0) for (let k = 0; k < 3; k++) { const ph = ((t * 2.2) + k / 3) % 1; api.doodle.stroke(ctx, [[nx - 40 - ph * 50, ny - 26 + k * 24], [nx - 14 - ph * 50, ny - 22 + k * 24]], 1, { color: '#9ff3ea', width: 5, seed: 30 + k, alpha: sn * (1 - ph) }); }
      }
      if (sh.i === 2) {
        hud(ctx, api, 1420, 560, 2, prog(t, T.own + 0.1, 0.35), P.lavender, 'rates their own breath', prog(t, T.rate, 0.6));
      }
      if (sh.i === 3) {
        DATA.chip(ctx, t, 'PROFESSIONAL BREATH JUDGE', 700, 300, Math.max(T.prof + 0.05, SHOTS[3] + 0.1), { size: 56, rotate: -0.02 });
        const rj = prog(t, T.yeah, 0.8, ease.outCubic);
        if (rj > 0) { api.doodle.text(ctx, 'yes, a real job', 420, 470, rj, { color: P.lime, size: 64, rotate: -0.05, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 10 }); api.doodle.arrow(ctx, 560, 420, 600, 352, prog(t, T.yeah + 0.5, 0.35, ease.inOutCubic), { color: P.lime, width: 7, bend: 20, head: 20, seed: 8 }); }
      }
      if (sh.i === 4) {
        // their breath drifts across to the judge ("it's their job to just smell bad breath")
        const dr = prog(t, T.job - 0.2, 1.6, ease.inOutSine);
        for (let k = 0; k < 6; k++) { const u = clamp(dr * 1.25 - k * 0.05); if (u <= 0) continue; const x = lerp(person.x + 180, judge.x - 200, u), y = person.y - person.s * 0.62 + Math.sin(u * 7 + k) * 20 - k * 6; puff(x, y, 50 + k * 8, 0.32 * Math.sin(Math.min(1, u) * Math.PI * 0.95 + 0.1)); }
        hud(ctx, api, person.x - 20, 250, 2, 1, P.lavender, 'self-rating', 1, { r: 26, gap: 68, labelSize: 26 });
        hud(ctx, api, judge.x + 20, 250, 4, prog(t, T.rateIt, 0.35), P.cyan, 'trained examiner', prog(t, SHOTS[4] + 0.2, 0.6), { r: 26, gap: 68, labelSize: 26 });
      }
    } else if (sh.i === 5) {
      // ---------------- the two ratings, side by side, not matching
      bg('#0d0b1f', '#06050d');
      DATA.glow(ctx, 520, 520, 600, P.lavender, 0.16); DATA.glow(ctx, 1400, 520, 600, P.cyan, 0.14);
      const s = 1 + lt * 0.03;
      ctx.save(); ctx.translate(960, 540); ctx.scale(s, s); ctx.translate(-960, -540);
      hud(ctx, api, 520, 560, 2, 1, P.lavender, 'self-rating', 1, { r: 58, gap: 136, labelSize: 40 });
      hud(ctx, api, 1400, 560, 4, 1, P.cyan, 'trained examiner', 1, { r: 58, gap: 136, labelSize: 40 });
      const ne = prog(t, T.guess, 0.45, ease.linear), nx = 960, ny = 560;
      if (ne > 0) {
        api.doodle.stroke(ctx, [[nx - 50, ny - 18], [nx + 50, ny - 20]], clamp(ne * 3), { color: P.marker, width: 11, seed: 41 });
        api.doodle.stroke(ctx, [[nx - 50, ny + 20], [nx + 50, ny + 18]], clamp(ne * 3 - 1), { color: P.marker, width: 11, seed: 42 });
        api.doodle.stroke(ctx, [[nx + 26, ny - 56], [nx - 26, ny + 56]], clamp(ne * 3 - 2), { color: P.marker, width: 11, seed: 43 });
      }
      ctx.restore();
      DATA.caps(ctx, 'example ratings', 960, 900, { size: 26, align: 'center', color: 'rgba(244,241,234,0.4)', tracking: 5 });
    } else {
      // ---------------- the result: a glowing bar on a data floor
      bg('#07061a', '#0d0b22');
      const cam = DATA.cam3({ pos: [0, 2.2 - lt * 0.05, -7.5 + lt * 0.15], target: [0, 0.6, 0], f: 1500 });
      DATA.glow(ctx, 960, 560, 1000, P.purple, 0.16);
      DATA.floorGrid(ctx, cam, { step: 0.5, x: [-8, 8], z: [-4, 14], fog: 20, alpha: 0.3, color: '#7a6cff', wRef: 160 });
      const X0 = 330, X1 = 1590, Y = 470, H = 96, fill = 0.378 * prog(t, T.people + 0.05, 1.3, ease.outCubic);
      DATA.caps(ctx, 'self-rating matched the examiner', X0, Y - 110, { size: 38, color: 'rgba(244,241,234,0.85)', tracking: 5 });
      // track
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.05)'; api.roundRect(ctx, X0, Y - H / 2, X1 - X0, H, 14); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      for (let i = 0; i <= 10; i++) { const x = X0 + (X1 - X0) * i / 10; ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 1, Y + H / 2 + 10, 2, i % 5 ? 12 : 22); }
      // the bar: neon fill with a hot edge
      if (fill > 0) {
        const w = (X1 - X0) * fill;
        ctx.save(); ctx.shadowColor = P.lavender; ctx.shadowBlur = 40;
        const g = ctx.createLinearGradient(0, Y - H / 2, 0, Y + H / 2); g.addColorStop(0, '#b7a3ff'); g.addColorStop(1, '#6a4be8');
        ctx.fillStyle = g; api.roundRect(ctx, X0, Y - H / 2, w, H, 14); ctx.fill(); ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; api.roundRect(ctx, X0 + 8, Y - H / 2 + 10, Math.max(0, w - 16), 12, 6); ctx.fill();
        DATA.neon(ctx, () => { ctx.beginPath(); ctx.moveTo(X0 + w, Y - H / 2 - 8); ctx.lineTo(X0 + w, Y + H / 2 + 8); }, '#ffffff', 3, { alpha: 0.8 });
      }
      // HALF line
      const hx = X0 + (X1 - X0) * 0.5, hl = prog(t, T.people - 0.05, 0.5, ease.inOutCubic);
      if (hl > 0) {
        ctx.save(); ctx.setLineDash([16, 12]); DATA.neon(ctx, () => { ctx.beginPath(); ctx.moveTo(hx, Y - H / 2 - 40); ctx.lineTo(hx, lerp(Y - H / 2 - 40, Y + H / 2 + 50, hl)); }, P.marker, 4, { alpha: 1 }); ctx.restore();
        const pulse = t > T.half ? 1 + 0.1 * Math.max(0, Math.sin((t - T.half) * 9)) * clamp(1 - (t - T.half) / 1.2) : 1;
        ctx.save(); ctx.translate(hx, Y + H / 2 + 100); ctx.scale(pulse, pulse); DATA.caps(ctx, 'half', 0, 0, { size: 44, align: 'center', color: P.marker, alpha: hl }); ctx.restore();
      }
      if (fill > 0) DATA.big(ctx, (fill * 100).toFixed(1) + '%', X0, Y + 250, { size: 170, align: 'left', noScale: true, glow: 'rgba(167,139,250,0.4)' });
      DATA.chip(ctx, t, 'RIGHT LESS THAN HALF THE TIME', 1250, Y + 200, T.half, { size: 54, rotate: -0.02 });
    }
    DATA.source(ctx, t, 'Romano et al., Int J Dent Hyg 2010 · 180 patients · self-rating matched a trained examiner in 37.8%', { at: 0.6, pill: sh.i < 2 });
    DATA.finish(ctx, t);
  },
});
