// @use videos/bad-breath-for-good/scenes/tongue/_lib.js
/* papillae-fly (w940-990): the hero shot. A macro 2.5D flight over the top of the tongue.
 * Words (scene s, cut of 21:58): look 0.45, microscopically 1.92, not smooth 3.19-3.72, covered 5.23, tiny little bumps 6.24-6.83,
 * further back 7.95-8.64, longer and longer 10.11-10.96, shag carpets 12.58-12.80, all the shag moving around 14.36-15.28.
 * Cut at 15.75 (carpet-gunk).
 * World: x across the tongue, z from the front (short bumps) toward the back (long filiform papillae), y up.
 * The midline groove runs along x = 0, front to back. */
const CUT = TONGUE.cut('papillae-fly', 16.66);   // cues follow their words in the current cut (see cues.json)
defineScene({
  name: 'papillae-fly', duration: CUT.duration,
  setup(api) {
    const { lerp, clamp } = api, ss = TONGUE.sstep;
    this.S = PILE.sprites(api, {
      sw: 64, aspects: [1.3, 2.6, 5, 8.5, 12], fog: '#7c3f64', blurs: [4, 10],
      colors: [
        { light: '#ffc6d2', mid: '#f08aa0', dark: '#b8486a', dark2: '#74203f', ao: '#2c0716', tip: '#ffe8ec', tipA: 0.55, rim: '#ffd9e2', spec: 0.6 },
        { light: '#ffd2dc', mid: '#f49cb1', dark: '#c25879', dark2: '#7e2848', ao: '#2c0716', tip: '#fff4f4', tipA: 0.72, rim: '#ffe4ea', spec: 0.65 },
        { light: '#f7aabd', mid: '#e2728e', dark: '#a63c5e', dark2: '#661a39', ao: '#240512', tip: '#ffdbe2', tipA: 0.42, rim: '#ffc9d6', spec: 0.5 },
      ],
    });
    const NZ = api.noise('pf-ground');
    this.g = (z) => ss(3, 44, z);                                   // 0 at the front .. 1 at the back third
    this.groove = (x) => Math.exp(-Math.pow(x / 1.15, 2));
    this.F = PILE.field(api, {
      seed: 'papillae-fly', x0: -48, x1: 48, z0: -24, z1: 104, spacing: 0.56, nColors: 3,
      height: (x, z, r) => lerp(0.5, 3.0, Math.pow(this.g(z), 1.25)) * (0.72 + 0.56 * r) * (1 - 0.22 * this.groove(x)),
      width: (x, z, r) => lerp(0.36, 0.25, this.g(z)) * (0.82 + 0.36 * ((r * 7.13) % 1)),
      ground: (x, z) => -0.55 * this.groove(x) + 0.28 * NZ(x / 9, z / 9),
    });
    // floating motes (saliva droplets / light specks) for parallax
    const R = api.rand('pf-motes'); this.motes = [];
    for (let i = 0; i < 70; i++) this.motes.push({ x: (R() * 2 - 1) * 16, y: 0.8 + R() * 6, z: -8 + R() * 70, s: 0.04 + R() * 0.07, ph: R() * 6.28 });
  },
  cam(t, api) {
    const { lerp, ease, clamp } = api, ss = TONGUE.sstep;
    const k1 = ease.inOutSine(clamp(t / 3.1)), k2 = ease.inOutCubic(clamp((t - 2.6) / 4.6));
    let x = lerp(1.2, 1.9, k1), y = lerp(13, 8.5, k1), z = lerp(-15, -10.5, k1), pitch = lerp(54, 44, k1);
    x = lerp(x, 2.4, k2); y = lerp(y, 2.7, k2); z = lerp(z, -3.5, k2); pitch = lerp(pitch, 19.5, k2);
    // the flight: accelerate from 6.6 s, cruise, ease out near the long back papillae
    const fly = (tt) => { const a = clamp((tt - 6.6) / 9.4); return ease.inOutSine(a) * 0.55 + ease.outCubic(a) * 0.45; };
    const zf = lerp(-3.5, 40, fly(t));
    if (t > 6.6) {
      z = zf;
      const hAhead = lerp(0.5, 3.0, Math.pow(this.g(z + 3.5), 1.25));
      y = lerp(y, 1.05 + hAhead * 1.2, ss(6.6, 8.5, t));
      x = 2.4 + Math.sin(t * 0.35) * 0.6;
    }
    const up = ss(11.8, 15.5, t); y += up * 1.9; pitch = lerp(pitch, 26, up) + Math.sin(t * 0.7) * 0.6;
    return PILE.makeCam({ x, y, z, pitch: (pitch * Math.PI) / 180, f: 1000, cx: 960, cy: 540 });
  },
  draw(ctx, t, api) {
    t += api.params.t0 || 0;   // bench/preview offset only
    t = CUT.warp(t);
    const { P, clamp, lerp, ease, prog, pop } = api, ss = TONGUE.sstep;
    const cam = this.cam(t, api);
    const riseAll = ss(3.1, 7.0, t);
    const fogO = { fogNear: 3.5, fogFar: 40, fogMax: 0.98, fog: '#7c3f64' };
    // backdrop: dark mouth above, a warm haze along the horizon, the surface (smooth and glossy until the bumps rise)
    const surf = TONGUE.mixRgb('#d4657f', '#3a0b20', ss(3.2, 6.5, t));
    PILE.backdrop(ctx, cam, { ...fogO, ground: surf, sky: ['#0d0a1c', '#7c3f64'], groundY: -0.1 });
    if (riseAll < 1) {   // the "smooth" skin sheen before the bumps come up
      ctx.save(); ctx.globalAlpha = 1 - riseAll; ctx.globalCompositeOperation = 'screen';
      const hy = PILE.horizonY(cam), sy = Math.max(hy, 0) + 420 + Math.sin(t * 0.8) * 30;
      const sg = ctx.createRadialGradient(760 + t * 22, sy, 20, 760 + t * 22, sy, 620); sg.addColorStop(0, 'rgba(255,210,222,0.55)'); sg.addColorStop(1, 'rgba(255,210,222,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, 1920, 1080); ctx.restore();
    }
    // rise: a wave spreading out from the middle of the view, with a little overshoot
    const cz0 = -3, cx0 = 2;
    const rise = (i, x, z, r) => {
      const dd = Math.hypot(x - cx0, (z - cz0) * 0.8), t0 = 3.2 + dd / 24 + r * 0.9;
      const k = clamp((t - t0) / 0.75); return 0.1 + 0.9 * (k <= 0 ? 0 : ease.outBack(k, 1.6));
    };
    const A = 0.05 + 0.26 * ss(12.3, 14.4, t) + 0.06 * ss(14.4, 15.4, t);
    const sway = (x, z, ph, tt, h) => [
      A * (0.72 * Math.sin(0.5 * x + 0.34 * z - 2.3 * tt + ph * 0.25) + 0.28 * Math.sin(1.4 * x - 1.6 * tt + ph)),
      A * 0.55 * Math.sin(0.36 * z + 0.25 * x - 1.9 * tt + ph * 0.5),
    ];
    const extras = this.motes.map((m) => ({ x: m.x + Math.sin(t * 0.5 + m.ph) * 0.4, y: m.y + Math.sin(t * 0.7 + m.ph * 2) * 0.25, z: m.z,
      draw: (g, sx, sy, k, d) => {
        const r = Math.max(1.2, k * m.s), a = 0.5 * ss(0.8, 3, d) * (0.4 + 0.6 * ss(2, 6, t));
        if (a < 0.02) return;
        const blur = d < 4 ? 2.2 : 1; const rg = g.createRadialGradient(sx, sy, 0, sx, sy, r * blur);
        rg.addColorStop(0, `rgba(255,236,242,${a})`); rg.addColorStop(0.5, `rgba(255,200,220,${a * 0.45})`); rg.addColorStop(1, 'rgba(255,200,220,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(sx, sy, r * blur, 0, 6.2832); g.fill();
      } }));
    {
      PILE.render(ctx, this.F, this.S, cam, { ...fogO, t, near: 0.9, far: 48, nearFade: 0.8, dotAlpha: lerp(0.4, 1, ss(2.9, 4.2, t)), blurNear: [1.8, 3.2], rise, sway, extras,
        lod: (d, r) => d < 22 || (d < 36 ? r < 0.6 : r < 0.36), lodWiden: (d) => (d < 22 ? 1 : d < 36 ? 1.15 : 1.35) });
    }
    { // haze band over the far edge of the pile
      const hy = PILE.horizonY(cam), gg = ctx.createLinearGradient(0, hy - 150, 0, hy + 190);
      gg.addColorStop(0, 'rgba(124,63,100,0)'); gg.addColorStop(0.45, 'rgba(150,84,122,0.55)'); gg.addColorStop(1, 'rgba(124,63,100,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, hy - 150, 1920, 340);
    }
    // soft key light from the upper left + bloom
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    let lg = ctx.createRadialGradient(260, -120, 50, 260, -120, 1300); lg.addColorStop(0, 'rgba(255,190,215,0.22)'); lg.addColorStop(1, 'rgba(255,190,215,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, 1920, 1080); ctx.restore();

    // "PAPILLAE" label on "bumps" (w961, 6.8 s), with a leader into the pile; eases out as the shag takes over
    const lp = pop(t, 6.75, 0.5), lout = 1 - prog(t, 12.2, 0.4, ease.inCubic);
    if (lp > 0 && lout > 0) {
      ctx.save(); ctx.globalAlpha = lout;
      api.leader(ctx, 1330, 640, 1452, 330, prog(t, 6.6, 0.4), { color: 'rgba(244,241,234,0.85)', width: 3, dot: 7 });
      api.label(ctx, 'PAPILLAE', 1440, 300, { size: 46, p: lp });
      ctx.restore();
    }
    // "longer and longer": a lime measuring bracket that stretches with the words (10.1-11.0 s)
    const mb = prog(t, 9.95, 1.1, ease.inOutCubic), mbo = 1 - prog(t, 12.0, 0.35, ease.inCubic);
    if (mb > 0 && mbo > 0) {
      ctx.save(); ctx.globalAlpha = mbo;
      const x = 205, y1 = 930, y0 = lerp(880, 470, mb);
      for (const [col, w] of [['rgba(11,10,24,0.6)', 15], [P.lime, 7]]) {
        api.doodle.stroke(ctx, [[x, y1], [x, y0]], 1, { color: col, width: w, seed: 5, passes: 1 });
        api.doodle.stroke(ctx, [[x - 22, y1], [x + 22, y1]], 1, { color: col, width: w, seed: 6, passes: 1 });
        api.doodle.stroke(ctx, [[x - 22, y0], [x + 22, y0]], 1, { color: col, width: w, seed: 7, passes: 1 });
      }
      api.doodle.text(ctx, 'longer', x + 42, lerp(y1, y0, 0.5) + 18, prog(t, 10.1, 0.5), { color: P.lime, size: 60, stroke: 'rgba(11,10,24,0.6)', strokeWidth: 9 });
      ctx.restore();
    }
    // "shag carpets" (12.5 s): a hand-written aside
    const sc = prog(t, 12.58, 0.7);
    if (sc > 0) api.doodle.text(ctx, 'like a shag carpet', 1470, 190, sc, { color: P.lime, size: 60, align: 'center', rotate: -0.04, stroke: 'rgba(11,10,24,0.55)', strokeWidth: 8 });
    api.vignette(ctx, 0.6);
    api.grain(ctx, t, 0.06);
  },
});
