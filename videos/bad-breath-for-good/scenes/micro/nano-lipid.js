// @use videos/bad-breath-for-good/scenes/micro/_lib.js
// nano-lipid · words 3171-3204 (10:26.5-10:35.7), inside Ben's Zero Pro segment. "Well, we're the first company in the world to
// use these things called nano lipid emulsions. This is really cool biotech that can actually specifically target certain
// bacteria." Premium look: iridescent nano-droplets (oil core, lipid shell) drift in over a soft, out-of-focus crevice;
// NANO LIPID EMULSIONS lands word by word; one droplet comes close; a mixed crowd of bacteria appears and the droplets home in
// on one kind only (reticles). On screen: only the name and "certain bacteria"; no "first in the world" claim on screen.
// Hands off to pg-target at scene time 9.20.
(function () {
  const CUT = MICRO.cut(3171, 3204, 3220);   // word timing + render length from the current cut
  let T;   // word times (read from the current cut in setup)
  const CROWD = [
    ['good', 300, 830, 120, 0.2, 0], ['rod', 470, 650, 118, 0.3, 0], ['pg', 800, 880, 140, 0, 0], ['good', 640, 740, 104, -0.3, 1],
    ['rod', 1080, 910, 116, -0.2, 1], ['pg', 1300, 770, 146, 0.1, 1], ['good', 1500, 900, 112, 0.4, 0], ['rod', 1720, 760, 110, 0.2, 1],
    ['pg', 1640, 560, 132, -0.2, 0], ['good', 1100, 640, 96, -0.4, 0],
  ];
  let drops, snap;
  defineScene({
    name: 'nano-lipid', duration: CUT.dur,
    async setup(api) {
      const M = MICRO.init(api), W = CUT.W;
      T = { first: W(3174), things: W(3182), nano: W(3184), lipid: W(3185), emulsions: W(3186), thisW: W(3193), cool: W(3196), biotech: W(3197), can: W(3199), specifically: W(3201), target: W(3202), certain: W(3203), bacteria: W(3204) };
      snap = M.snapshot({ x: 965, y: 560, z: 1.25 }, { blur: 8, t: 4, dim: 0.1, tint: 'rgba(12,8,28,0.35)' });
      const r = api.rand('nl-drops'), pgs = CROWD.map((c, i) => [c, i]).filter(([c]) => c[0] === 'pg');
      drops = Array.from({ length: 24 }, (_, i) => ({ x0: 80 + r() * 1760, y0: 170 + r() * 760, r: i === 0 ? 58 : 16 + Math.pow(r(), 1.6) * 40, ph: r() * 6.28, vx: 14 + r() * 26, delay: r() * 1.6,
        tgt: i < 9 ? pgs[i % 3][1] : -1, ang: (i / 3) * 2.1 + r(), home: T.specifically + (i % 9) * 0.07 }));
      drops[0].x0 = 1180; drops[0].y0 = 520;
    },
    draw(ctx, t, api) {
      const M = MICRO, { P, ease, clamp, lerp, prog, pop, env } = api;
      M.drawSnap(ctx, snap, t, { z0: 1.0, z1: 1.07, dur: 10.1 });
      M.bokeh(ctx, t, { n: 24, alpha: 0.1, seed: 2 });
      ctx.save(); api.cam(ctx, t, { zoom0: 1, zoom1: 1.05, dur: 10 });
      // the crowd (from "can actually")
      CROWD.forEach(([kind, x, y, s, rot, fl], i) => {
        const a = pop(t, T.can - 0.1 + i * 0.05, 0.5); if (a <= 0) return;
        const dimOthers = kind === 'pg' ? 0 : 0.35 * prog(t, T.certain, 0.5);
        ctx.save(); ctx.translate(x + Math.sin(t * 0.8 + i) * 10, y + Math.cos(t * 0.7 + i) * 8); ctx.scale(a, a);
        M.bug(ctx, 0, 0, s, t, { kind, rot: rot + Math.sin(t + i) * 0.08, flip: !!fl, phase: i, seed: i, eyes: true, smile: kind === 'pg' ? 0 : 0.8, frown: kind === 'pg', dim: dimOthers });
        ctx.restore();
        if (kind === 'pg') M.reticle(ctx, x + Math.sin(t * 0.8 + i) * 10, y + Math.cos(t * 0.7 + i) * 8, s * 0.72, prog(t, T.target + (i % 3) * 0.06, 0.45), t, { width: 5, seed: i });
      });
      // droplets: drift in and flow; the hero one comes close on "this is really cool biotech"; then they home in
      drops.forEach((d, i) => {
        const inK = ease.outCubic(clamp((t - 0.1 - d.delay * 0.6) / 1.6));
        let x = d.x0 - 500 * (1 - inK) + Math.sin(t * 0.6 + d.ph) * 26 + t * d.vx * 0.4, y = d.y0 + Math.cos(t * 0.5 + d.ph) * 22;
        let r = d.r * inK;
        if (i === 0) {
          const big = prog(t, T.thisW, 0.8, ease.inOutCubic) * (1 - prog(t, T.can - 0.1, 0.6, ease.inOutCubic));
          x = lerp(x, 1060, big); y = lerp(y, 560, big); r = lerp(r, 190, big);
        }
        if (d.tgt >= 0) {
          const c = CROWD[d.tgt], hk = ease.inOutCubic(clamp((t - d.home) / 1.1));
          const cx = c[1] + Math.sin(t * 0.8 + d.tgt) * 10, cy = c[2] + Math.cos(t * 0.7 + d.tgt) * 8, orb = c[3] * 0.72 + 10;
          const ox = cx + Math.cos(d.ang + t * 0.9) * orb, oy = cy + Math.sin(d.ang + t * 0.9) * orb;
          x = lerp(x, ox, hk); y = lerp(y, oy, hk); r = lerp(r, Math.min(r, 26), hk);
        }
        if (r > 1) M.droplet(ctx, x, y, r, t, { seed: i, haloA: i === 0 ? 1.4 : 1 });
      });
      ctx.restore();
      // NANO LIPID EMULSIONS
      const hd = 1 - 0.25 * prog(t, T.can, 0.6);
      ctx.save(); ctx.globalAlpha *= hd;
      M.words(ctx, t, [['NANO', T.nano], ['LIPID', T.lipid], ['EMULSIONS', T.emulsions]], 960, 250, { size: 104 });
      const ul = prog(t, T.emulsions + 0.25, 0.6, ease.inOutCubic);
      if (ul > 0) api.doodle.underline(ctx, 600, 600 + 720 * ul, 282, 1, { color: P.lime, width: 10, seed: 5 });
      ctx.restore();
      M.chip(ctx, 'CERTAIN BACTERIA', 960, 365, pop(t, T.certain, 0.5), { size: 56 });
      M.finish(ctx, t);
    },
  });
})();
