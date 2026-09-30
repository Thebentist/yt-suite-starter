// @use videos/bad-breath-for-good/scenes/micro/_lib.js
// @use videos/bad-breath-for-good/scenes/micro/_gl.js
// protein-sulfur · words 1104-1143. "And then what they do is they eat all that gunk, the dead cells, the proteins, and mucus,
// all that, they eat it up. And some of that stuff, specifically proteins, have sulfur in them."
// Real 3D (ray-marched) macro of the crevice floor. Hard cuts on the words:
//   S1 wide   the colony munching a heap of gunk
//   S2 truck  a lateral dolly past DEAD CELLS / PROTEINS / MUCUS, each tagged on its word
//   S3 close  one bacterium swallows the end of a protein strand ("they eat it up")
//   S4 macro  the protein strand as glossy beads; three become sulfur atoms on "sulfur"
// Facts: research-notes rows 8 and 10 (tongue coating = cells, food, bacteria; sulfur-containing amino acids in proteins).
(function () {
  const CUT = MICRO.cut(1104, 1143, 1144);
  let T, SH;
  const CELLS = [
    { p: [-0.42, 0.022, 0.26], yaw: 0.4, size: [0.2, 0.022, 0.15], k: 0 },
    { p: [-0.22, 0.02, -0.28], yaw: 1.1, size: [0.15, 0.018, 0.12], k: 0 },
    { p: [0.64, 0.058, 0.44], yaw: 0, size: [0.095, 0.068, 0.085], k: 1 },
    { p: [0.78, 0.045, 0.34], yaw: 0, size: [0.065, 0.05, 0.06], k: 1 },
    { p: [0.54, 0.04, 0.56], yaw: 0, size: [0.05, 0.04, 0.05], k: 1 },
  ];
  const CHAIN = Array.from({ length: 10 }, (_, i) => [-0.12 + i * 0.058, 0.032 + 0.018 * Math.sin(i * 1.1), 0.16 + 0.05 * Math.sin(i * 0.8)]);
  const SULF = new Set([1, 4, 6]);
  const BUGS = [
    { kind: 'rod', p: [-0.2, 0.068, 0.06], yaw: 2.55, seed: 0.11, eat: 1 },
    { kind: 'cocc', p: [-0.64, 0.082, 0.02], yaw: 0, seed: 0.23, eat: 1 },
    { kind: 'rod2', p: [0.08, 0.062, 0.36], yaw: -1.9, seed: 0.37, eat: 1 },
    { kind: 'rod', p: [0.3, 0.068, 0.36], yaw: -1.6, seed: 0.41, eat: 1 },
    { kind: 'cocc', p: [0.44, 0.082, 0.38], yaw: 0, seed: 0.53, eat: 0 },
    { kind: 'rod', p: [0.86, 0.068, 0.56], yaw: -2.5, seed: 0.67, eat: 1 },
    { kind: 'rod2', p: [-0.05, 0.062, -0.12], yaw: 1.4, seed: 0.71, eat: 0 },
    { kind: 'rod', p: [0.6, 0.068, 0.17], yaw: Math.PI, seed: 0.83, eat: 2 },      // the eater (S3)
  ];

  defineScene({
    name: 'protein-sulfur', duration: CUT.dur,
    setup(api) {
      const M = MICRO.init(api), G = M.G, W = CUT.W;
      T = { eat: W(1111), gunk: W(1114), dead: W(1116), proteins: W(1119), mucus: W(1121), all: W(1122), eat2: W(1125), up: W(1127), some: W(1134), specifically: W(1138), proteins2: W(1139), have: W(1140), sulfur: W(1141), them: W(1143) };
      const V = G.v;
      SH = [
        { t: 0, blur: 2.5, cam: (u, k) => G.cam(V.lerp([-0.22, 0.78, -1.32], [-0.12, 0.7, -1.12], k), [0.2, 0.02, 0.14], 1.9) },
        { t: T.dead - 0.06, blur: 4, cam: (u, k) => { const x = -0.4 + 1.02 * k; return G.cam([x, 0.6, -0.62], [x + 0.03, 0.03, 0.3], 2.0); } },
        { t: T.all - 0.04, blur: 6, cam: (u, k) => G.cam(V.lerp([0.47, 0.2, -0.22], [0.46, 0.18, -0.15], k), [0.44, 0.055, 0.16], 2.4) },
        { t: T.proteins2 - 0.04, blur: 9, far: 5, cam: (u, k) => G.cam(V.lerp([0.0, 0.18, -0.22], [0.05, 0.155, -0.15], k), [0.16, 0.045, 0.16], 2.8) },
      ];
      this.bg = G.create(api, G.bgFrag); this.fg = G.create(api, G.fgFrag()); this.fg2 = G.create(api, G.fgFrag());
    },
    draw(ctx, t, api) {
      const M = MICRO, G = M.G, { P, ease, clamp, lerp, prog, pop, env } = api;
      const s = G.shot(SH, t), k = ease.inOutSine(clamp(s.lt / s.len)), cam = s.cam(s.lt, k);
      // ---- world state
      const eatUp = ease.inCubic(clamp((t - T.eat2 + 0.1) / 0.55));            // last bead slides into the eater
      const beads = CHAIN.map((p, i) => {
        let q = p, r = 0.026;
        if (i === 9) { q = G.v.lerp(p, [0.54, 0.07, 0.17], eatUp); r = 0.026 * (1 - eatUp); }
        const sOn = SULF.has(i) ? prog(t, T.sulfur - 0.06, 0.3) : 0;
        return { p: q, r: r * (1 + 0.14 * sOn), s: sOn > 0 ? 1 + sOn * (0.7 + 0.3 * Math.sin(t * 6 + i)) : 0 };
      }).filter((b) => b.r > 0.002);
      const bugs = BUGS.map((b) => {
        let sq = 0;
        if (b.eat === 1) sq = 0.07 * Math.max(0, Math.sin(t * 9 + b.seed * 20)) * env(t, T.eat - 0.3, 7.5, 0.3, 0.3);
        if (b.eat === 2) { sq = -0.12 * env(t, T.eat2 - 0.2, T.eat2 + 0.25, 0.15, 0.1); if (t > T.eat2 + 0.25) sq += 0.18 * Math.exp(-(t - T.eat2 - 0.25) * 6) * Math.cos((t - T.eat2) * 16); }
        return { ...b, sq, p: [b.p[0] + Math.sin(t * 0.8 + b.seed * 9) * 0.006, b.p[1], b.p[2] + Math.cos(t * 0.7 + b.seed * 7) * 0.006], yaw: b.yaw + Math.sin(t * 1.1 + b.seed * 5) * 0.06 };
      });
      const cells = CELLS.map((c, i) => ({ ...c, size: c.size.map((v) => v * (1 - 0.18 * prog(t, T.eat + i * 0.3, 3.5))) }));
      // ---- layers
      G.blit(ctx, api, this.bg.draw({ uTime: t, ...cam.u, ...G.bgU({ sway: 0.3 }) }), { blur: s.blur });
      for (const b of bugs) if (b.kind !== 'cocc') G.flagella(ctx, cam, b, t, { color: s.k === 3 ? 'rgba(190,245,215,0.12)' : undefined });
      if (s.k === 3) {                                                           // macro: strand sharp, everything else soft
        G.blit(ctx, api, this.fg2.draw({ uTime: t, ...cam.u, ...G.pack(bugs, cells, []) }), { blur: s.far });
        G.blit(ctx, api, this.fg.draw({ uTime: t, ...cam.u, ...G.pack([], [], beads, { shadow: 0.8 }) }));
      } else {
        G.blit(ctx, api, this.fg.draw({ uTime: t, ...cam.u, ...G.pack(bugs, cells, beads) }));
      }
      // ---- labels on the words
      if (s.k === 1) {
        const items = [['DEAD CELLS', T.dead, CELLS[0].p], ['PROTEINS', T.proteins, CHAIN[4]], ['MUCUS', T.mucus, CELLS[2].p]];
        items.forEach(([str, tw, wp], j) => { const q = cam.project(wp), fade = j < items.length - 1 ? 1 - prog(t, items[j + 1][1] + 0.45, 0.3) : 1; if (fade <= 0) return; ctx.save(); ctx.globalAlpha *= fade; G.label(ctx, api, str, q, clamp(q.x, 260, 1660), Math.max(190, q.y - 260), pop(t, tw, 0.5), { size: 52 }); ctx.restore(); });
      }
      if (s.k === 3) {
        const mid = cam.project(CHAIN[5]);
        G.label(ctx, api, 'PROTEIN', null, 960, 170, pop(t, T.proteins2 + 0.05, 0.5), { size: 56, bg: P.ink });
        const sb = cam.project(CHAIN[4]);
        G.label(ctx, api, 'SULFUR', sb, sb.x + 40, Math.min(930, sb.y + 260), pop(t, T.sulfur, 0.5), { size: 62, bg: P.sulfur });
        for (const i of SULF) { const b = beads[i]; if (!b || !b.s) continue; const q = cam.project(b.p), a = prog(t, T.sulfur, 0.3); api.text(ctx, 'S', q.x, q.y + b.r * q.s * 0.36, { size: b.r * q.s * 1.05, weight: 700, color: `rgba(70,52,0,${(0.8 * a).toFixed(3)})`, align: 'center' }); }
        void mid;
      }
      G.artistic(ctx, api);
      api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.45 });
    },
  });
})();
