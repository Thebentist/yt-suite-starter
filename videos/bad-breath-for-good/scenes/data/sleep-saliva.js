// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
/* sleep-saliva (words 1541-1609): "when you sleep, that saliva amount slows way down ... why you wake up with bad breath
 * in the morning ... if you sleep with an open mouth ... it gets even worse ... drying out the already dry area. And
 * even worse, if you're on medications that dry your mouth out on top of that."
 * Act 1: a day of saliva flow draws on (high by day, a trough under the moon, back up at sunrise) with a stink cloud
 * at the morning point. Act 2: a sleeper with the mouth falling open, dry air in and out, moisture drying off. Act 3:
 * pill bottles, chip SOME MEDICATIONS DRY YOUR MOUTH. A SALIVA tank on the right drains a step at each stage.
 * Qualitative only (no units): research-notes rows 15-16 (flow drops in sleep; mouth breathing and medicines dry it).
 */

const CH = { x0: 180, x1: 1380, y0: 760, amp: 440, hours: 28 };      // chart: 7 AM to 11 AM next day
const TANK = { x: 1570, y: 250, w: 170, h: 600 };
let DATA, stars, drops, T, SHOTS;

// saliva flow, qualitative 0..1, by hour since 7 AM
function flow(h) {
  const meal = (c) => 0.07 * Math.exp(-((h - c) ** 2) / 0.6);
  if (h < 15.5) return 0.74 + meal(1) + meal(5.5) + meal(11.5) + 0.02 * Math.sin(h * 1.7);
  if (h < 17.2) { const k = (h - 15.5) / 1.7; return 0.74 + (0.16 - 0.74) * (k * k * (3 - 2 * k)); }
  if (h < 24) return 0.16 + 0.015 * Math.sin(h * 2.3);
  if (h < 25.2) { const k = (h - 24) / 1.2; return 0.16 + (0.78 - 0.16) * (k * k * (3 - 2 * k)); }
  return 0.78 + meal(26.5);
}
const hx = (h) => CH.x0 + (h / CH.hours) * (CH.x1 - CH.x0), fy = (f) => CH.y0 - f * CH.amp;

function sleeper(ctx, api, x, y, s, open, t, P) {
  // a person asleep on their back, lit only by moonlight from the upper left: dark silhouettes with a cool rim
  const R = s * 0.42, RIM = '#a9c8ff', BODY = '#14122a';
  ctx.save(); ctx.translate(x, y);
  const rimFill = (pathFn, off = R * 0.022) => {
    ctx.save(); ctx.fillStyle = RIM; ctx.shadowColor = RIM; ctx.shadowBlur = R * 0.08; ctx.translate(-off * 0.7, -off); pathFn(); ctx.fill(); ctx.restore();
    const g = ctx.createLinearGradient(-R, -R * 1.2, R * 0.8, R * 0.8); g.addColorStop(0, '#2a2750'); g.addColorStop(0.5, BODY); g.addColorStop(1, '#0a0916');
    ctx.fillStyle = g; pathFn(); ctx.fill();
  };
  // pillow and blanket
  rimFill(() => { ctx.beginPath(); api.roundRect(ctx, -R * 1.55, R * 0.5, R * 2.7, R * 0.62, R * 0.3); });
  rimFill(() => { ctx.beginPath(); ctx.moveTo(R * 1.0, R * 1.12); ctx.bezierCurveTo(R * 0.95, R * 0.2, R * 1.3, -R * 0.2, R * 1.9, -R * 0.24);
    ctx.lineTo(R * 3.3, -R * 0.2); ctx.quadraticCurveTo(R * 3.6, -R * 0.2, R * 3.6, R * 0.1); ctx.lineTo(R * 3.6, R * 1.12); ctx.closePath(); });
  // fold lines on the blanket catching the light
  ctx.strokeStyle = 'rgba(169,200,255,0.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(R * 1.6, R * 0.1); ctx.bezierCurveTo(R * 2.0, R * 0.25, R * 2.4, R * 0.2, R * 2.9, R * 0.35); ctx.stroke();
  // jaw drops (rotates clockwise) about a hinge in front of the ear
  const a = open * 0.34, H = [R * 0.32, -R * 0.42];
  const rot = ([px, py]) => { const dx = px - H[0], dy = py - H[1], c = Math.cos(a), sn = Math.sin(a); return [H[0] + dx * c - dy * sn, H[1] + dx * sn + dy * c]; };
  const P_ = (u, v) => [u * R, v * R];
  const upLip = P_(0.6, -0.93), loLip = rot(P_(0.62, -0.9)), chin = rot(P_(0.9, -0.84)), chinC1 = rot(P_(0.8, -0.95)), under = rot(P_(1.0, -0.55)), jaw = rot(P_(0.95, -0.3));
  // mouth cavity, faintly warm
  if (open > 0.02) { ctx.fillStyle = '#2a0a16'; ctx.beginPath(); ctx.moveTo(upLip[0], upLip[1]); ctx.lineTo(R * 0.46, -R * 0.66); ctx.lineTo(loLip[0], loLip[1]); ctx.closePath(); ctx.fill(); }
  const head = () => {
    ctx.beginPath(); ctx.moveTo(-R * 0.98, -R * 0.1);
    ctx.bezierCurveTo(-R * 0.98, -R * 0.75, -R * 0.45, -R * 1.05, R * 0.0, -R * 0.97);
    ctx.bezierCurveTo(R * 0.14, -R * 0.95, R * 0.24, -R * 1.02, R * 0.3, -R * 1.2);
    ctx.quadraticCurveTo(R * 0.36, -R * 1.3, R * 0.42, -R * 1.22);
    ctx.quadraticCurveTo(R * 0.46, -R * 1.02, R * 0.52, -R * 0.99);
    ctx.quadraticCurveTo(R * 0.58, -R * 1.0, upLip[0], upLip[1]);
    if (open > 0.02) ctx.lineTo(R * 0.46, -R * 0.66);
    ctx.lineTo(loLip[0], loLip[1]);
    ctx.quadraticCurveTo(chinC1[0], chinC1[1], chin[0], chin[1]);
    ctx.quadraticCurveTo(under[0] + R * 0.04, under[1] - R * 0.2, under[0], under[1]);
    ctx.lineTo(jaw[0], jaw[1]);
    ctx.bezierCurveTo(R * 1.1, -R * 0.1, R * 1.15, R * 0.3, R * 1.2, R * 0.7);
    ctx.lineTo(R * 0.5, R * 0.75);
    ctx.bezierCurveTo(-R * 0.2, R * 0.8, -R * 0.9, R * 0.55, -R * 0.98, -R * 0.1);
    ctx.closePath();
  };
  rimFill(head, R * 0.028);
  // eyelash line catching a sliver of light
  ctx.strokeStyle = 'rgba(169,200,255,0.35)'; ctx.lineWidth = Math.max(2, R * 0.018); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(R * 0.06, -R * 0.84); ctx.quadraticCurveTo(R * 0.14, -R * 0.79, R * 0.22, -R * 0.86); ctx.stroke();
  ctx.restore();
  return { mx: x + (upLip[0] + loLip[0]) / 2, my: y + Math.min(upLip[1], loLip[1]) - 4 };
}

defineScene({
  name: 'sleep-saliva',
  anchor: { word: 1541, offset: -0.15 },
  anchorEnd: { word: 1610, offset: -0.15 },     // butts against throat/throat-trip
  tail: 0.1,                                   // a few frames past the handoff (the assembler trims)
  setup(api) {
    DATA = window.DATA.init(api);
    T = { dayDraw: 0.2, sleep: api.at(1545), slows: api.at(1549) - 0.09, wake: api.at(1560) - 0.04, stink: api.at(1563) - 0.06, morning: api.at(1567) - 0.05, act2: api.at(1572) - 0.17, sleep2: api.at(1575), open: api.at(1578) - 0.05, worse: api.at(1584) - 0.12,
      drying: api.at(1588), dry: api.at(1592) - 0.07, act3: api.at(1594) - 0.19, worse2: api.at(1596) - 0.08, meds: api.at(1600), medsChip: api.at(1602) - 0.04, top: api.at(1606) };
    SHOTS = [0, T.slows - 0.12, T.wake - 0.15, T.act2, T.drying - 0.12, T.act3, T.top - 0.12];
    const r = api.rand('stars');
    stars = Array.from({ length: 70 }, () => ({ x: r() * 1920, y: r() * 700, s: 0.8 + r() * 2.2, ph: r() * 6 }));
    drops = Array.from({ length: 9 }, () => ({ dx: (r() - 0.5) * 70, dy: (r() - 0.5) * 30, ph: r(), s: 6 + r() * 6 }));
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    const night = prog(t, T.sleep - 0.2, 0.8) * (1 - prog(t, T.wake - 0.1, 0.8)) + prog(t, T.act2 - 0.2, 0.6);
    DATA.stage(ctx, t, { gy: 480, glowColor: night > 0.5 ? '#3a4cff' : P.purple, glowAlpha: 0.1 });
    // stars at night
    ctx.save(); for (const s of stars) { ctx.globalAlpha = Math.min(1, night) * (0.3 + 0.5 * Math.abs(Math.sin(t * 1.5 + s.ph))); ctx.fillStyle = '#dfe4ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    const sh = DATA.shot(t, SHOTS), lt = sh.lt;
    // one framing per shot: zoom z about the point (fx, fy) of the scene, drifting slowly
    const F = [[1.0, 960, 540], [1.55, hx(19.5), fy(0.35)], [1.45, hx(25.2), fy(0.5) + 10], [1.0, 960, 540], [2.1, 0, 0], [1.0, 960, 540], [1.2, 1200, 600]][sh.i];
    let [zf, fxp, fyp] = F;
    if (sh.i === 4) { fxp = 700 + 560 * 0.21 + 40; fyp = 600 - 560 * 0.42 + 20; }
    const zz = zf * (1 + 0.035 * lt);
    ctx.save(); ctx.translate(960, 540); ctx.scale(zz, zz); ctx.translate(-fxp - lt * 6, -fyp);

    // ================= ACT 1: a day of saliva flow
    const a1 = sh.i <= 2 ? 1 : 0;
    if (a1 > 0) {
      ctx.save();
      // sky bands
      const nx0 = hx(16), nx1 = hx(24), top = CH.y0 - CH.amp - 60;
      const nb = prog(t, T.sleep - 0.3, 0.7);
      ctx.fillStyle = `rgba(10,12,40,${0.55 * nb})`; api.roundRect(ctx, nx0, top, nx1 - nx0, CH.y0 - top, 14); ctx.fill();
      const mb = prog(t, T.wake - 0.1, 0.8);
      if (mb > 0) { const g = ctx.createLinearGradient(0, CH.y0, 0, top); g.addColorStop(0, `rgba(255,159,67,${0.28 * mb})`); g.addColorStop(1, 'rgba(255,111,174,0)'); ctx.fillStyle = g; api.roundRect(ctx, nx1, top, CH.x1 - nx1, CH.y0 - top, 14); ctx.fill(); }
      // axis
      ctx.strokeStyle = 'rgba(244,241,234,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(CH.x0, CH.y0); ctx.lineTo(CH.x1, CH.y0); ctx.stroke();
      const lab = (s, x, at) => api.text(ctx, s, x, CH.y0 + 52, { size: 36, weight: 700, align: 'center', color: P.dim, tracking: 3, alpha: prog(t, at, 0.4) });
      lab('DAY', hx(8), 0.3); lab('NIGHT', hx(20), T.sleep); lab('MORNING', hx(26.3), T.wake);
      // icons
      DATA.icons.sun(ctx, hx(7.5), top + 70, 34, t, { alpha: prog(t, 0.3, 0.5) });
      const moonUp = prog(t, T.sleep, 0.8, ease.outCubic);
      if (moonUp > 0) DATA.icons.moon(ctx, hx(20), top + 150 - 80 * moonUp, 34, { alpha: moonUp });
      const sunUp = prog(t, T.wake, 0.9, ease.outCubic);
      if (sunUp > 0) DATA.icons.sun(ctx, hx(27.1), top + 170 - 110 * sunUp, 30, t, { alpha: sunUp });
      // the curve, drawn on in three pieces
      const d1 = prog(t, T.dayDraw, 1.4, ease.inOutSine), d2 = prog(t, T.slows, 1.1, ease.inOutSine), d3 = prog(t, T.wake, 0.8, ease.inOutSine);
      const hEnd = d3 > 0 ? 24 + 4 * d3 : d2 > 0 ? 15.5 + 8.5 * d2 : 15.5 * d1;
      if (hEnd > 0) {
        const pts = []; for (let h = 0; h <= hEnd + 1e-6; h += 0.1) pts.push([hx(h), fy(flow(h))]);
        const g = ctx.createLinearGradient(0, CH.y0 - CH.amp, 0, CH.y0); g.addColorStop(0, 'rgba(143,216,255,0.35)'); g.addColorStop(1, 'rgba(143,216,255,0.02)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(pts[0][0], CH.y0); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.lineTo(pts[pts.length - 1][0], CH.y0); ctx.closePath(); ctx.fill();
        DATA.neon(ctx, () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); }, P.saliva, 6, { core: 0.7 });
        const tip = pts[pts.length - 1]; DATA.glow(ctx, tip[0], tip[1], 40, P.saliva, 0.7); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tip[0], tip[1], 8, 0, Math.PI * 2); ctx.fill();
      }
      // "slows way down" arrow into the trough
      const sw = prog(t, T.slows + 0.5, 0.6, ease.inOutCubic);
      if (sw > 0) api.doodle.arrow(ctx, hx(17.5), fy(0.72), hx(19.5), fy(0.24), sw, { color: P.saliva, width: 7, bend: -40, head: 24, seed: 3 });
      // morning stink
      const sk = pop(t, T.stink, 0.6);
      DATA.icons.stink(ctx, hx(24.9), fy(0.78) - 100 - 20 * prog(t, T.stink, 3), 110, sk, t);
      ctx.restore();
    }

    // ================= ACT 2 + 3: the sleeper
    const a2 = sh.i >= 3 ? 1 : 0;
    if (a2 > 0) {
      const shrink = sh.i >= 5 ? 1 : 0;
      const sx = lerp(700, 560, shrink) + (1 - a2) * 260, sy = lerp(600, 470, shrink), s = lerp(560, 430, shrink);
      ctx.save(); ctx.globalAlpha *= a2;
      const openK = prog(t, T.open, 0.5, ease.outBack) * (0.85 + 0.15 * Math.sin(t * 1.6));
      DATA.glow(ctx, sx - 200, sy - 300, 700, '#6f8dff', 0.14);
      DATA.beam(ctx, sx - 900, sy - 700, 0.7, 1500, 200, 700, '#bcd2ff', 0.14);
      const m = sleeper(ctx, api, sx, sy, s, openK, t, P);
      // Z z z
      for (let k = 0; k < 3; k++) {
        const ph = ((t - T.sleep2) * 0.45 + k / 3) % 1; if (t < T.sleep2) break;
        api.text(ctx, 'z', m.mx - 140 - ph * 60 + k * 10, m.my - 80 - ph * 150, { size: 40 + k * 14, weight: 700, family: 'hand', color: P.lavender, alpha: Math.sin(ph * Math.PI) * 0.9 });
      }
      // dry air in and out of the open mouth
      const air = prog(t, T.open + 0.2, 0.5);
      if (air > 0) {
        for (let k = 0; k < 4; k++) {
          const ph = ((t * 0.7) + k / 4) % 1, inward = k % 2 === 0;
          const u = inward ? 1 - ph : ph, ax = m.mx + 40 + u * 170 + k * 10, ay = m.my - 40 - u * 140 + (k - 1.5) * 18;
          ctx.save(); ctx.globalAlpha *= air * Math.sin(ph * Math.PI) * 0.85; ctx.strokeStyle = '#e8e2c8'; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); for (let j = 0; j <= 12; j++) { const xx = ax + j * 6, yy = ay - j * 5 + Math.sin(j * 0.8 + t * 6 + k) * 5; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); ctx.restore();
        }
      }
      // moisture drying off: droplets shrink and rise as wisps
      const dr = prog(t, T.drying, 1.6, ease.inOutSine);
      for (const d of drops) {
        const k = clamp(dr * 1.3 - d.ph * 0.3); const px = m.mx + d.dx, py = m.my + 10 + d.dy - k * 90;
        if (t < T.open) continue;
        ctx.save(); ctx.globalAlpha *= a2 * (1 - k) * (t > T.drying - 1 ? 1 : prog(t, T.open, 0.6));
        ctx.fillStyle = P.saliva; ctx.beginPath(); ctx.arc(px, py, d.s * (1 - k * 0.8), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      const dk = prog(t, T.dry, 0.7, ease.outCubic);
      if (dk > 0) api.doodle.text(ctx, 'dry!', m.mx + 60, m.my + 70, dk, { color: P.orange, size: 64, rotate: -0.1 });
      ctx.restore();
      if (sh.i < 6) DATA.chip(ctx, t, 'MOUTH OPEN', sx - 20, lerp(215, 170, shrink), T.open + 0.1, { size: 50, bg: P.ink, color: P.black });
      const ew = Math.max(pop(t, T.worse, 0.5) * (1 - prog(t, T.act3, 0.3)), pop(t, T.worse2, 0.5) * (1 - prog(t, T.meds + 0.9, 0.3)));
      if (ew > 0) api.label(ctx, 'EVEN WORSE', 250, lerp(470, 380, shrink), { size: 46, align: 'center', p: ew, bg: P.marker, color: P.ink });
    }
    // ================= ACT 3: medications
    if (t > T.meds - 0.1) {
      for (let k = 0; k < 3; k++) {
        const p = pop(t, T.meds + k * 0.12, 0.55); if (p <= 0) continue;
        const bx = 1010 + k * 180, by = 790;
        DATA.glow(ctx, bx, by, 120, P.orange, 0.15 * p);
        DATA.icons.pillBottle(ctx, bx, by + (1 - Math.min(1, p)) * 60, 120 * p, { rot: (k - 1) * 0.12, color: ['#ff9f43', '#ffb86b', '#f08a3c'][k] });
      }
      DATA.chip(ctx, t, 'SOME MEDICATIONS DRY YOUR MOUTH', 1110, 880, T.medsChip, { size: 46 });
    }
    // ================= the SALIVA tank (whole scene)
    const level = lerp(lerp(lerp(0.86, 0.42, prog(t, T.slows, 1.0, ease.inOutCubic)), 0.24, prog(t, T.drying, 1.2, ease.inOutCubic)), 0.08, prog(t, T.top, 0.8, ease.inOutCubic));
    const up = prog(t, 0.1, 0.6, ease.outExpo), tk = TANK;
    ctx.save(); ctx.globalAlpha *= up; ctx.translate((1 - up) * 80, 0);
    api.text(ctx, 'SALIVA', tk.x + tk.w / 2, tk.y - 30, { size: 44, weight: 700, align: 'center', color: P.saliva, tracking: 4 });
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; api.roundRect(ctx, tk.x, tk.y, tk.w, tk.h, 40); ctx.fill();
    ctx.save(); api.roundRect(ctx, tk.x, tk.y, tk.w, tk.h, 40); ctx.clip();
    const surf = tk.y + tk.h * (1 - level);
    const lg = ctx.createLinearGradient(0, surf, 0, tk.y + tk.h); lg.addColorStop(0, '#bfeaff'); lg.addColorStop(0.2, P.saliva); lg.addColorStop(1, '#2f7fb8');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(tk.x, tk.y + tk.h);
    for (let x = 0; x <= tk.w; x += 6) ctx.lineTo(tk.x + x, surf + Math.sin(x * 0.06 + t * 3) * 6 + Math.sin(x * 0.11 - t * 2) * 3);
    ctx.lineTo(tk.x + tk.w, tk.y + tk.h); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 8; i++) { const bxp = tk.x + 20 + ((i * 37) % (tk.w - 40)), byp = tk.y + tk.h - (((t * 60 + i * 83) % (tk.h * level + 1))); if (byp > surf + 8) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(bxp, byp, 4 + (i % 3), 0, Math.PI * 2); ctx.fill(); } }
    ctx.restore();
    const warn = prog(t, T.top, 0.4) * (0.5 + 0.5 * Math.sin(t * 8));
    ctx.strokeStyle = warn > 0 ? `rgba(255,77,90,${0.4 + 0.6 * warn})` : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 4; api.roundRect(ctx, tk.x, tk.y, tk.w, tk.h, 40); ctx.stroke();
    ctx.globalAlpha *= 0.3; ctx.fillStyle = '#fff'; api.roundRect(ctx, tk.x + 18, tk.y + 30, 14, tk.h - 60, 7); ctx.fill();
    ctx.restore();
    // step labels beside the tank
    const step = (s, at, y) => { const p = prog(t, at, 0.4); if (p > 0) api.text(ctx, s, tk.x - 24, y, { size: 34, weight: 700, align: 'right', color: P.dim, tracking: 2, alpha: p }); };
    void step;
    ctx.restore();
    if (sh.i === 0) DATA.kicker(ctx, t, 'Saliva flow over a day', 0.15);
    if (sh.i === 2) DATA.chip(ctx, t, 'BAD BREATH IN THE MORNING', 700, 170, T.morning, { size: 56 });
    if (sh.i === 3 || sh.i === 4) DATA.bokeh(ctx, t, { n: 7, seed: 'ss-bk' + sh.i, alpha: 0.1, size: [160, 340], colors: ['#8fd8ff', '#a78bfa'] });
    DATA.source(ctx, t, 'Saliva flow drops during sleep · dry mouth from mouth breathing and certain medicines: ADA MouthHealthy; NIDCR', { at: 0.5 });
    DATA.finish(ctx, t);
  },
});
