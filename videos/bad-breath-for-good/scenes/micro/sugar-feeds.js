// @use videos/bad-breath-for-good/scenes/micro/_lib.js
// @use videos/bad-breath-for-good/scenes/micro/_gl.js
// sugar-feeds · words 2231-2260. "And fun fact, if that mint is actually sugary, well, that bacteria is still in your mouth.
// And guess what? That bacteria eat sugar. So you're actually feeding that bacteria."
// Only what Ben says: bacteria eat sugar. The eaters are a NEUTRAL look (ivory cocci in chains), deliberately unlike the green
// sulfur-making colony (research-notes row 14: sugar feeds the acid-making cavity bacteria, not the sulfur-makers).
//   S1 studio  the sugary mint glitters; SUGARY
//   S2 wide    sugar crystals rain down onto chains of bacteria that are still there ("still here!")
//   S3 macro   a chain wraps a sugar crystal and eats it down
//   S4 wide    the chains grow longer: SUGAR FEEDS BACTERIA
(function () {
  const CUT = MICRO.cut(2231, 2260, 2269);
  let T, SH, CHAINS, CRYS;
  defineScene({
    name: 'sugar-feeds', duration: CUT.dur,
    setup(api) {
      const M = MICRO.init(api), G = M.G, W = CUT.W, V = G.v;
      T = { mint: W(2236), sugary: W(2239), well: W(2240), bacteria: W(2242), still: W(2244), mouth: W(2247), guess: W(2249), bacteria2: W(2252), eat: W(2253), sugar: W(2254), so: W(2255), feeding: W(2258), bacteria3: W(2260) };
      const chain = (x, z, a0, n, bend, grow) => ({ x, z, a0, n, bend, grow });
      CHAINS = [chain(-0.12, 0.02, 0.2, 5, 0.35, 3), chain(-0.55, 0.36, -0.6, 4, -0.3, 2), chain(0.42, -0.22, 1.9, 4, 0.25, 2), chain(0.26, 0.52, 3.3, 3, 0.4, 1)];
      CRYS = [
        { land: [0.2, 0.05, 0.08], s: 0.07, t0: T.well + 0.05, hero: true },
        { land: [-0.32, 0.045, 0.22], s: 0.055, t0: T.well + 0.25 },
        { land: [0.55, 0.04, 0.2], s: 0.05, t0: T.well + 0.45 },
        { land: [-0.2, 0.04, -0.3], s: 0.045, t0: T.well + 0.6 },
        { land: [0.1, 0.04, 0.45], s: 0.05, t0: T.well + 0.8 },
      ];
      SH = [
        { t: 0 },
        { t: T.well - 0.03, blur: 4, cam: (k) => G.cam(V.lerp([-0.05, 0.78, -1.02], [-0.08, 0.7, -0.9], k), [0.0, 0.03, 0.14], 1.9) },
        { t: T.guess - 0.03, blur: 8, cam: (k) => G.cam(V.lerp([0.46, 0.32, -0.4], [0.42, 0.29, -0.32], k), [0.16, 0.05, 0.08], 2.3) },
        { t: T.so - 0.03, blur: 3, cam: (k) => G.cam(V.lerp([0.2, 0.8, -0.98], [0.22, 0.95, -1.2], k), [0.02, 0.0, 0.16], 1.9) },
      ];
      this.bg = G.create(api, G.bgFrag); this.fg = G.create(api, G.fgFrag());
    },
    draw(ctx, t, api) {
      const M = MICRO, G = M.G, V = G.v, { P, ease, clamp, lerp, prog, pop, env } = api;
      const s = G.shot(SH, t), k = ease.inOutSine(clamp(s.lt / s.len));
      if (s.k === 0) {                                                          // ---- S1: the sugary mint
        G.studio(ctx, api, t, { c0: '#3a2a2a', c1: '#161020' });
        const cam = G.cam([0.18, 0.34, -1.2], [0, 0.0, 0.1], 2.1);
        const mint = { p: [0, 0.0 + Math.sin(t * 1.3) * 0.02, 0.1], yaw: t * 0.8, size: [0.34, 0.085, -0.75 + 0.05 * Math.sin(t)], k: 6 };
        G.blit(ctx, api, this.fg.draw({ uTime: t, ...cam.u, ...G.pack([], [mint], [], { shadow: 0, bright: 1.1 }) }));
        const c = cam.project(mint.p), r = api.rand('sf-glint');
        for (let i = 0; i < 16; i++) { const a = r() * 6.283, d = r() * 0.34 * c.s, tw = Math.max(0, Math.sin(t * 5 + i * 1.7)); star(ctx, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.6, 14 * tw * (0.4 + prog(t, T.sugary, 0.4))); }
        M.chip(ctx, 'MINT', c.x, c.y - 0.36 * c.s - 40, pop(t, T.mint, 0.45) * (1 - prog(t, T.sugary - 0.1, 0.15)), { size: 54, bg: P.ink });
        M.chip(ctx, 'SUGARY', c.x, c.y - 0.36 * c.s - 40, pop(t, T.sugary, 0.5), { size: 64, bg: P.orange });
      } else {
        const cam = s.cam(k);
        // ---- chains of bacteria (grow in S4)
        const bugs = [];
        const growK = prog(t, T.so + 0.2, 1.8, ease.inOutSine);
        CHAINS.forEach((c, ci) => {
          const nTot = c.n + Math.floor(c.grow * growK + 0.999 * (growK > 0 ? 1 : 0) * 0);
          const extra = c.grow * growK;
          for (let j = 0; j < c.n + c.grow; j++) {
            let sc = 1;
            if (j >= c.n) { sc = clamp(extra - (j - c.n)); if (sc <= 0) break; sc = ease.outBack(sc, 1.6); }
            const a = c.a0 + c.bend * j * 0.5, step = 0.135;
            let x = c.x, z = c.z; for (let q = 0; q < j; q++) { const aa = c.a0 + c.bend * q * 0.5; x += Math.cos(aa) * step; z += Math.sin(aa) * step; }
            const eat = ci === 0 ? 0.06 * Math.max(0, Math.sin(t * 9 + j)) * env(t, T.eat - 0.2, T.so + 1, 0.2, 0.3) : 0;
            bugs.push({ kind: 'neutral', p: [x + Math.sin(t * 0.9 + j + ci) * 0.004, 0.07 * sc, z], yaw: a, scale: sc, sq: eat, seed: ci * 0.3 + j * 0.07 });
            void nTot;
          }
        });
        // ---- sugar crystals
        const cells = [];
        CRYS.forEach((c, i) => {
          const fk = clamp((t - c.t0) / 0.55); if (fk <= 0) return;
          const bounce = t > c.t0 + 0.55 ? 0.03 * Math.exp(-(t - c.t0 - 0.55) * 8) * Math.abs(Math.sin((t - c.t0) * 14)) : 0;
          const p = V.lerp([c.land[0] + 0.1, 1.2, c.land[2] - 0.1], c.land, ease.inQuad(fk)); p[1] += bounce;
          let sz = c.s;
          if (c.hero) sz *= 1 - 0.7 * ease.inOutSine(clamp((t - T.eat + 0.1) / 1.6));
          if (!c.hero && t > T.so) sz *= 1 - 0.8 * prog(t, T.so + 0.4 + i * 0.1, 1.2);
          cells.push({ p, yaw: i * 1.3 + (1 - fk) * 6, size: [sz, sz * 0.9, sz], k: 3 });
        });
        G.blit(ctx, api, this.bg.draw({ uTime: t, ...cam.u, ...G.bgU({ sway: 0.3, gap: 1.1, tint: [1.02, 1, 1.04, 0.02] }) }), { blur: s.blur });
        G.blit(ctx, api, this.fg.draw({ uTime: t, ...cam.u, ...G.pack(bugs, cells, []) }));
        // sugar glints
        for (const c of cells) { const q = cam.project(c.p), tw = Math.max(0, Math.sin(t * 7 + c.yaw * 3)); star(ctx, q.x + c.size[0] * q.s * 0.4, q.y - c.size[1] * q.s * 0.5, 16 * tw); }
        if (s.k === 1) {
          const q = cam.project([-0.12, 0.07, 0.02]);
          const st = env(t, T.still, T.guess - 0.05, 0.1, 0.25);
          if (st > 0) { ctx.save(); ctx.globalAlpha *= st; api.doodle.text(ctx, 'still here!', q.x + 250, q.y - 250, prog(t, T.still, 0.5, ease.linear), { color: P.lime, size: 76, stroke: 'rgba(10,8,22,0.75)', strokeWidth: 11, rotate: -0.06 }); api.doodle.arrow(ctx, q.x + 330, q.y - 215, q.x + 60, q.y - 40, prog(t, T.still + 0.35, 0.4), { color: P.lime, width: 9, bend: -40, seed: 8 }); ctx.restore(); }
          M.chip(ctx, 'SUGAR', 1500, 180, pop(t, T.well + 0.2, 0.45) * (1 - prog(t, T.guess - 0.25, 0.2)), { size: 52, bg: P.ink });
        }
        if (s.k === 2) { const q = cam.project(CRYS[0].land); G.label(ctx, api, 'SUGAR', q, clamp(q.x - 380, 260, 1660), 200, pop(t, T.sugar - 0.05, 0.45), { size: 56, bg: P.ink }); }
        if (s.k === 3) M.chip(ctx, 'SUGAR FEEDS BACTERIA', 960, 170, pop(t, T.feeding, 0.5), { size: 64 });
      }
      G.artistic(ctx, api);
      api.finish(ctx, t, { bloom: 0.32, grain: 0.05, vignette: 0.45 });
      function star(c, x, y, r) { if (r <= 0.5) return; c.save(); c.translate(x, y); c.fillStyle = 'rgba(255,255,255,0.95)'; c.shadowColor = 'rgba(255,255,255,0.9)'; c.shadowBlur = r; c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.18 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.restore(); }
    },
  });
})();
