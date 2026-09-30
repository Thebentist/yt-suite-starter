// @use videos/bad-breath-for-good/scenes/micro/_lib.js
// @use videos/bad-breath-for-good/scenes/micro/_gl.js
// mouthwash-cover · words 2269-2283. "And most mouthwash, to be honest, are kind of doing the same thing as well."
//   S1 tops   a blue rinse washes over the tips of the papillae; the breath gauge drops toward FRESH; MOUTHWASH
//   S2 gap    down at the bottom of the gap the colony is untouched under the rinse; the smell rises again, the gauge climbs
//             back: SAME THING. Facts: research-notes rows 10 and 13 (mouthwash is a temporary measure; crevices are protected).
(function () {
  const CUT = MICRO.cut(2269, 2283, 2284);
  let T, SH, COL;
  defineScene({
    name: 'mouthwash-cover', duration: CUT.dur,
    setup(api) {
      const M = MICRO.init(api), G = M.G, W = CUT.W, V = G.v;
      T = { mouthwash: W(2271), honest: W(2274), doing: W(2278), same: W(2280), thing: W(2281), well: W(2283) };
      COL = [['rod', -0.16, 0.04, 0.3], ['cocc', 0.02, 0.14, 0], ['rod2', 0.16, -0.02, -0.5], ['rod', 0.3, 0.16, 2.6], ['cocc', -0.34, 0.2, 0], ['rod', -0.04, -0.2, 1.3], ['rod2', 0.42, -0.14, 2.9], ['cocc', 0.12, 0.3, 0]]
        .map(([kind, x, z, yaw], i) => ({ kind, p: [x, G.SIZE[kind][1], z], yaw, seed: i * 0.17 }));
      SH = [
        { t: 0, blur: 1.5, cam: (k) => G.cam(V.lerp([0.7, 3.9, -2.7], [0.5, 3.75, -2.45], k), [0.1, 2.15, 0.9], 1.9) },
        { t: T.doing - 0.03, blur: 4, cam: (k) => G.cam(V.lerp([0.3, 0.22, -0.8], [0.26, 0.2, -0.7], k), [0.0, 0.62, 0.3], 1.55) },
      ];
      this.bg = G.create(api, G.bgFrag); this.fg = G.create(api, G.fgFrag());
    },
    draw(ctx, t, api) {
      const M = MICRO, G = M.G, V = G.v, { P, ease, clamp, lerp, prog, pop, env } = api;
      const s = G.shot(SH, t), k = ease.inOutSine(clamp(s.lt / s.len)), cam = s.cam(k);
      const front = lerp(-3.2, 4.5, ease.inOutSine(clamp((t - T.mouthwash + 0.35) / Math.max(0.8, Math.min(1.3, T.doing - T.mouthwash + 0.1)))));
      const fluid = [2.95, 0.85, front, 1];
      G.blit(ctx, api, this.bg.draw({ uTime: t, ...cam.u, ...G.bgU({ sway: 0.35, fluid }) }), { blur: s.blur });
      const bugs = COL.map((b) => ({ ...b, p: [b.p[0] + Math.sin(t * 0.8 + b.seed * 9) * 0.004, b.p[1], b.p[2]], yaw: b.yaw + Math.sin(t + b.seed * 7) * 0.05 }));
      if (s.k === 1) for (const b of bugs) if (b.kind !== 'cocc') G.flagella(ctx, cam, b, t);
      if (s.k === 1) G.blit(ctx, api, this.fg.draw({ uTime: t, ...cam.u, ...G.pack(bugs, [], []) }));
      // smell: under the rinse in S1 (hidden), rising again from the colony in S2
      if (s.k === 1) {
        const c = cam.project([0.05, 0.1, 0.05]);
        for (let i = 0; i < 9; i++) { const ph = (t * 0.45 + i / 9) % 1; M.gas(ctx, c.x + Math.sin(i * 2.1 + t) * 180, c.y - ph * 700, 90 + ph * 120, t, Math.sin(ph * Math.PI) * prog(t, T.doing + 0.1, 0.5), { seed: i, alpha: 0.42 }); }
        const q = cam.project([0.05, 0.12, 0.05]);
        api.doodle.circle(ctx, q.x, q.y + 10, 0.55 * q.s, 0.2 * q.s, prog(t, T.doing + 0.25, 0.55, ease.inOutCubic), { color: P.marker, width: 9, seed: 6 });
      } else {
        for (let i = 0; i < 8; i++) { const ph = (t * 0.35 + i / 8) % 1; M.gas(ctx, 200 + i * 220, 1150 - ph * 700, 130 + ph * 90, t, Math.sin(ph * Math.PI) * (1 - 0.9 * clamp((front - 1) / 2)), { seed: i + 3, alpha: 0.32 }); }
      }
      // gauge: drops with the rinse, climbs back once we see the gap
      const v = lerp(lerp(0.86, 0.12, ease.outBack(clamp((t - T.mouthwash - 0.1) / 0.8), 1.2)), 0.84, ease.inOutSine(clamp((t - T.doing - 0.1) / 1.2))) + Math.sin(t * 21) * 0.008;
      G.gauge(ctx, api, 1590, 300, 160, v, { title: 'BREATH', scale: 0.95 });
      M.chip(ctx, 'MOUTHWASH', 380, 170, pop(t, T.mouthwash, 0.5) * (1 - prog(t, T.doing - 0.15, 0.15)), { size: 60, bg: '#8fd8ff' });
      if (s.k === 1) { const q = cam.project([0.05, 0.12, 0.05]); api.doodle.text(ctx, 'untouched', q.x - 470, q.y - 170, prog(t, T.doing + 0.45, 0.5, ease.linear), { color: P.marker, size: 58, align: 'right', stroke: 'rgba(10,8,22,0.7)', strokeWidth: 9, rotate: -0.04 }); }
      M.chip(ctx, 'SAME THING', 1590, 520, pop(t, T.same, 0.5), { size: 58 });
      G.artistic(ctx, api);
      api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.45 });
    },
  });
})();
