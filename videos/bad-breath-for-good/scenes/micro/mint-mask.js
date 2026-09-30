// @use videos/bad-breath-for-good/scenes/micro/_lib.js
// @use videos/bad-breath-for-good/scenes/micro/_gl.js
// mint-mask · words 2205-2217. "You see, a mint just covers up your breath for a few minutes."
// S1 (to "up")  a glossy 3D peppermint drops into a dark studio through a sour yellow-green haze; a cool minty burst covers it
// S2            glass gauge over the blurred mint: the needle swings to FRESH, "A FEW MINUTES", then creeps back toward BAD
// Facts: research-notes row 14 (mints mostly mask, briefly).
(function () {
  const CUT = MICRO.cut(2205, 2217, 2231);
  let T, SH;
  defineScene({
    name: 'mint-mask', duration: CUT.dur,
    setup(api) {
      const M = MICRO.init(api), G = M.G, W = CUT.W;
      T = { mint: W(2208), covers: W(2210), up: W(2211), breath: W(2213), few: W(2216), minutes: W(2217) };
      SH = [{ t: 0 }, { t: T.up - 0.03 }];
      this.fg = G.create(api, G.fgFrag());
    },
    draw(ctx, t, api) {
      const M = MICRO, G = M.G, V = G.v, { P, ease, clamp, lerp, prog, pop, env } = api;
      const s = G.shot(SH, t);
      const land = T.mint + 0.12, fall = ease.inQuad(clamp((t - (land - 0.45)) / 0.45));
      const bounce = t > land ? 0.06 * Math.exp(-(t - land) * 7) * Math.abs(Math.sin((t - land) * 14)) : 0;
      const mint = { p: [0, lerp(1.6, 0.02, fall) + bounce, 0.1], yaw: t * 0.9, size: [0.34, 0.085, lerp(-0.4, -1.05, fall)], k: 5 };
      const cover = prog(t, land, 0.5) * (1 - 0.6 * prog(t, T.few, 0.9, ease.inOutSine));
      if (s.k === 0) {
        G.studio(ctx, api, t, { c0: '#22324a', c1: '#101a2a' });
        const cam = G.cam(V.lerp([0.05, 0.12, -1.55], [0.02, 0.1, -1.38], clamp(t / 1)), [0, 0.02, 0.1], 2.0);
        stink(ctx, t, 1 - 0.9 * cover);
        if (mint.p[1] < 1.5) G.blit(ctx, api, this.fg.draw({ uTime: t, ...cam.u, ...G.pack([], [mint], [], { shadow: 0, bright: 1.1 }) }));
        const c = cam.project(mint.p); burst(ctx, t, c.x, c.y);
        M.chip(ctx, 'MINT', c.x, c.y - 0.42 * c.s - 40, pop(t, T.mint + 0.05, 0.45), { size: 56, bg: P.ink });
      } else {
        G.studio(ctx, api, t, { c0: '#22324a', c1: '#101a2a' });
        const cam = G.cam([0.55, 0.3, -1.1], [0.45, 0.05, 0.1], 2.0);
        G.blit(ctx, api, this.fg.draw({ uTime: t, ...cam.u, ...G.pack([], [mint], [], { shadow: 0, bright: 0.9 }) }), { blur: 10 });
        stink(ctx, t, 1 - 0.9 * cover); mintHaze(ctx, t, cover);
        const swing = ease.outBack(clamp((t - T.up) / 0.45), 1.4), back = ease.inOutSine(clamp((t - (T.few - 0.05)) / 1.3));
        const v = lerp(lerp(0.88, 0.08, swing), 0.6, back) + Math.sin(t * 23) * 0.008;
        G.gauge(ctx, api, 960, 560, 260, v, { title: 'BREATH', scale: 0.9 + 0.1 * pop(t, s.t, 0.4) });
        const fm = pop(t, T.few, 0.45);
        if (fm > 0) {
          M.chip(ctx, 'A FEW MINUTES', 930, 900, fm, { size: 58 });
          ctx.save(); ctx.translate(1160, 896); ctx.scale(fm, fm); ctx.strokeStyle = P.ink; ctx.lineWidth = 6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(0, -44); ctx.moveTo(-8, -46); ctx.lineTo(8, -46); ctx.stroke();
          const ha = -Math.PI / 2 + (t - T.few) * 5; ctx.strokeStyle = P.lime; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ha) * 22, Math.sin(ha) * 22); ctx.stroke(); ctx.restore();
        }
      }
      G.artistic(ctx, api);
      api.finish(ctx, t, { bloom: 0.32, grain: 0.05, vignette: 0.45 });

      function stink(c, tt, a) {                     // sour haze rising from below
        if (a <= 0.02) return;
        for (let i = 0; i < 12; i++) { const ph = (tt * 0.32 + i / 12) % 1, x = 120 + i * 160 + Math.sin(tt + i) * 30, y = 1180 - ph * 1100; M.gas(c, x, y, 150 + ph * 90, tt, Math.sin(ph * Math.PI) * a, { seed: i, alpha: 0.32 }); }
      }
      function mintHaze(c, tt, a) { if (a <= 0) return; for (let i = 0; i < 10; i++) { const ang = i * 0.63 + tt * 0.4, r = 300 + (i % 4) * 170; M.blob(c, 'mint', 960 + Math.cos(ang) * r * 1.5, 540 + Math.sin(ang) * r * 0.7, 340, 0.12 * a); } }
      function burst(c, tt, x, y) {                  // cool ring + sparkles when it lands
        const u = tt - land; if (u < 0) return;
        for (let k = 0; k < 3; k++) { const rp = clamp((u - k * 0.1) / 0.8); if (rp <= 0 || rp >= 1) continue; c.strokeStyle = `rgba(160,236,255,${(0.7 * (1 - rp)).toFixed(3)})`; c.lineWidth = 14 * (1 - rp) + 2; c.beginPath(); c.ellipse(x, y, 140 + ease.outCubic(rp) * 1000, (140 + ease.outCubic(rp) * 1000) * 0.55, 0, 0, Math.PI * 2); c.stroke(); }
        mintHaze(c, tt, cover);
        const r = api.rand('mm-spark');
        for (let i = 0; i < 40; i++) { const a = r() * 6.283, d = (100 + r() * 700) * ease.outCubic(clamp(u / 0.9)), tw = 0.5 + 0.5 * Math.sin(tt * 9 + i); c.fillStyle = `rgba(215,250,255,${(0.9 * tw * (1 - clamp(u / 1.6))).toFixed(3)})`; c.save(); c.translate(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6); c.rotate(Math.PI / 4); c.fillRect(-3.5, -3.5, 7, 7); c.restore(); }
      }
    },
  });
})();
