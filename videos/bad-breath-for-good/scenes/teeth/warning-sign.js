// @use videos/bad-breath-for-good/scenes/teeth/_lib.js
// @use videos/bad-breath-for-good/scenes/teeth/_gl.js
// warning-sign (w1457-1477), phase 2: "So bad breath that won't go away no matter what you do can also be a sign of
// gum disease, technically." Same 3D molars as between-teeth, inflamed. Shot 1: the warning card builds on the left
// while the camera orbits the red, swollen gum line on the right. Shot 2 (hard cut on "can"): close on the inflamed
// papilla pulsing red, GUM DISEASE. Source: ADA via research-notes row 20.
function marginY(x, st) {
  const pap = Math.exp(-(((x + 1.0) / 0.15) ** 2)) + Math.exp(-((x / 0.15) ** 2)) + Math.exp(-(((x - 0.95) / 0.15) ** 2));
  return 0.1 + 0.19 * pap + 0.045 * st.swell * (0.6 + 0.4 * pap) - (0.1 * pap + 0.05) * st.drop * Math.exp(-((x / 0.42) ** 2));
}
defineScene({
  name: 'warning-sign',
  anchor: { word: 1457, offset: -0.15 },
  anchorEnd: { word: 1477, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    TEETH.init(api);
    this.gl = api.gl.create(api, TEETH3D.MOLARS, { res: 0.5, aa: 2 });
    const A = (i) => api.at(i);
    this.W = { bad: A(1458), that: A(1460), wont: A(1461), go: A(1462), away: A(1463), no: A(1464), can: A(1469), sign: A(1473), gum: A(1475), disease: A(1476), tech: A(1477) };
    const w = this.W;
    this.shots = [
      { from: 0, a: { ro: [-0.3, 0.75, 2.6], ta: [-0.75, 0.22, 0], fov: 2.1 }, b: { ro: [0.5, 0.7, 2.55], ta: [-0.62, 0.22, 0], fov: 2.1 } },
      { from: w.can, a: { ro: [0.42, 0.3, 1.2], ta: [0, 0.15, 0.2], fov: 2.2 }, b: { ro: [0.2, 0.26, 1.02], ta: [0, 0.15, 0.2], fov: 2.2 } },
    ];
    const rnd = api.rand('ws-bugs'); this.bugs = [];
    for (let i = 0; i < 16; i++) { const x = -0.8 + i * 0.1 + (rnd() - 0.5) * 0.04; this.bugs.push({ x, z: 0.39 + rnd() * 0.03, dy: 0.02 + rnd() * 0.05, ph: rnd() * 10 }); }
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp } = api, T3 = TEETH3D, w = this.W, nz = api.noise('ws');
    const S = T3.pickShot(this.shots, t, api.duration), cam = S.cam;
    const st = { red: 1, swell: 1, drop: 1, pocket: 1 };
    const pe = prog(t, w.gum - 0.05, 0.3);
    const pulse = pe * (0.35 + 0.35 * (0.5 + 0.5 * Math.sin((t - w.gum) * Math.PI * 3 - Math.PI / 2)));
    const bugs = this.bugs.map((b) => ({ p: [b.x + nz(t + b.ph, 1) * 0.01, marginY(b.x, st) + b.dy, b.z], ph: b.ph + t * 0.3 }));
    ctx.drawImage(this.gl.draw(T3.molarsU(t, cam, { uRed: 1, uSwell: 1, uDrop: 1, uPocket: 1, uPlaque: 0.8, uPulse: pulse, uSpotX: -0.1, ...T3.packBugs(bugs) })), 0, 0, api.W, api.H);
    const pj = (p) => T3.proj(cam, p);
    // gas keeps rising from the gum line (continuity with the end of between-teeth)
    for (let i = 0; i < 12; i++) {
      const t0 = -1.2 + i * 0.35, k = (t - t0) / 2.6; if (k <= 0 || k >= 1) continue;
      const x = -0.6 + (i % 6) * 0.2, [sx, sy, sz] = pj([x, marginY(x, st) + 0.02, 0.36]);
      T3.gas(ctx, api, sx + nz(i + k, 2) * 60 * k, sy - 420 * (1 - Math.pow(1 - k, 1.7)), (50 + 200 * k) * (1.6 / Math.max(0.6, sz)), Math.sin(Math.min(1, k * 1.5) * Math.PI) * 0.55, 'ws' + i);
    }
    T3.bokeh(ctx, api, t, { seed: 30 + S.i, n: 7, r: 70, a: 0.06 });
    if (S.i === 0) {
      // ---- the warning card
      const cardIn = prog(t, 0.0, 0.4, ease.outCubic);
      ctx.save(); ctx.globalAlpha = cardIn; ctx.translate(-60 * (1 - cardIn), 0);
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 14;
      ctx.fillStyle = 'rgba(14,11,30,0.78)'; api.roundRect(ctx, 90, 250, 760, 520, 26); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255,212,59,0.5)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); api.roundRect(ctx, 90, 250, 760, 520, 26); ctx.clip();
      for (let i = -2; i < 28; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,212,59,0.92)' : 'rgba(20,16,10,0.92)'; ctx.beginPath(); const x = 90 + i * 34 + ((t * 40) % 68); ctx.moveTo(x, 250); ctx.lineTo(x + 34, 250); ctx.lineTo(x + 20, 268); ctx.lineTo(x - 14, 268); ctx.closePath(); ctx.fill(); }
      ctx.restore(); ctx.restore();
      const tri = pop(t, 0.05, 0.5);
      if (tri > 0) { ctx.save(); ctx.translate(196, 390); ctx.scale(tri, tri); TEETH.warnTri(ctx, 0, 0, 110); ctx.restore(); }
      const w1 = pop(t, w.bad, 0.45);
      if (t >= w.bad) api.text(ctx, 'BAD BREATH', 274, 426, { size: 104, color: P.ink, alpha: clamp(w1), tracking: 1 });
      let x = 140;
      for (const [wd, at, hot] of [['THAT', w.that, 0], ["WON'T", w.wont, 1], ['GO', w.go, 0], ['AWAY', w.away, 1]]) {
        const p = prog(t, at, 0.28, ease.outBack), ww = api.measure(ctx, wd + ' ', { size: 80, tracking: 1 });
        if (t >= at) { ctx.save(); ctx.translate(x, 540 + (1 - p) * 18); api.text(ctx, wd, 0, 0, { size: 80, color: hot ? P.yellow : P.ink, alpha: clamp(p), tracking: 1 }); ctx.restore(); }
        x += ww;
      }
      api.doodle.text(ctx, 'no matter what you do', 146, 650, prog(t, w.no, 0.9, ease.linear), { color: 'rgba(244,241,234,0.85)', size: 54 });
      api.doodle.underline(ctx, 146, 640, 670, prog(t, w.no + 0.7, 0.35, ease.inOutCubic), { color: P.yellow, width: 6, seed: 6 });
    } else {
      // ---- close on the gum: the verdict
      const [px, py] = pj([0, marginY(0, st) - 0.05, 0.36]), beat = 0.5 + 0.5 * Math.sin((t - w.gum) * Math.PI * 3);
      const rp = prog(t, w.gum, 0.4);
      if (rp > 0) for (let q = 0; q < 3; q++) { const r = 120 + q * 70 + beat * 20; ctx.save(); ctx.globalAlpha = rp * (0.5 - q * 0.14); ctx.strokeStyle = P.marker; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.8, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      const sh = ctx.createRadialGradient(300, 180, 40, 300, 180, 760); sh.addColorStop(0, 'rgba(10,8,22,0.72)'); sh.addColorStop(1, 'rgba(10,8,22,0)');
      ctx.fillStyle = sh; ctx.fillRect(0, 0, 1200, 800);
      api.text(ctx, 'CAN BE A SIGN OF', 150, 140, { size: 56, color: P.ink, tracking: 2, alpha: prog(t, w.can, 0.35), stroke: 'rgba(0,0,0,0.6)', strokeWidth: 8 });
      if (t >= w.gum) api.label(ctx, 'GUM DISEASE', 150, 236, { size: 96, p: pop(t, w.gum, 0.55), bg: P.marker, color: '#ffffff' });
      api.doodle.text(ctx, '...technically', 160, 380, prog(t, w.tech, 0.7, ease.linear), { color: P.lime, size: 58, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 9, rotate: -0.03 });
    }
    T3.artistic(ctx, api);
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });
  },
});
