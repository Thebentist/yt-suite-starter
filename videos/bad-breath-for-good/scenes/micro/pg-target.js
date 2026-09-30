// @use videos/bad-breath-for-good/scenes/micro/_lib.js
// @use videos/bad-breath-for-good/scenes/micro/_gl.js
// pg-target · words 3220-3262, inside Ben's Zero Pro segment (the overlay group's AD chip is top-left: keep it clear).
// "Everything comes back to these bacteria that break down the food, release these volatile sulfur compounds. And we target
// one of these main bacteria that causes this, which is P. gingivalis. It's one of the biggest bacteria that causes those
// volatile sulfur compounds."  On screen: only the name and "VSCs" (research-notes row 8 names P. gingivalis among them).
//   S1 wide    a mixed crowd breaks down food
//   S2 close   one of them releases VSCs (H2S rising): VOLATILE SULFUR COMPOUNDS
//   S3 target  a reticle roams the crowd ... S3b locks onto one kind on "bacteria"
//   S4 macro   P. GINGIVALIS (purple, fimbriae)
//   S5 wide    every P. gingivalis ringed, the others dim, they keep puffing VSCs
(function () {
  const CUT = MICRO.cut(3220, 3262, 3302);
  let T, SH, CROWD, FOOD, LOCK;
  defineScene({
    name: 'pg-target', duration: CUT.dur,
    setup(api) {
      const M = MICRO.init(api), G = M.G, W = CUT.W, V = G.v;
      T = { bacteria: W(3225), food: W(3230), release: W(3231), volatile: W(3233), compounds: W(3235), target: W(3238), main: W(3242), bacteria2: W(3243), P: W(3249), gingivalis: W(3250), biggest: W(3255), causes: W(3258), volatile2: W(3260), compounds2: W(3262) };
      CROWD = [
        ['pg', -0.3, 0.25, 0.4], ['pg', 0.35, -0.2, -0.6], ['pg', 0.55, 0.45, 1.9], ['pg', -0.58, -0.32, 2.4],
        ['rod', 0.05, -0.05, 0.4], ['rod', -0.12, 0.5, -1.2], ['rod', 0.7, 0.05, 2.8], ['rod', -0.7, 0.2, 0.9],
        ['rod2', 0.2, 0.28, 2.2], ['rod2', -0.3, -0.62, 1.2], ['rod2', 0.42, -0.62, -2.5],
        ['cocc', -0.05, -0.36, 0], ['cocc', 0.8, -0.3, 0], ['good', -0.45, 0.62, 0.3], ['good', 0.15, 0.72, 2.5], ['good', -0.78, -0.02, 1.4],
      ].map(([kind, x, z, yaw], i) => ({ kind, p: [x, G.SIZE[kind][1], z], yaw, seed: i * 0.123 }));
      FOOD = [[0.18, -0.12, 2], [-0.22, 0.34, 4], [0.45, 0.32, 2], [-0.48, -0.22, 4], [-0.1, 0.1, 2]].map(([x, z, k], i) => ({ p: [x, 0.03, z], yaw: i, size: [0.045, 0.03, 0.04], k }));
      LOCK = 1;                                                                   // CROWD[1] is the one the reticle locks onto
      const L = CROWD[LOCK].p;
      SH = [
        { t: 0, blur: 2.5, cam: (k) => G.cam(V.lerp([0.35, 1.35, -1.85], [0.28, 1.22, -1.62], k), [0.02, 0.0, 0.1], 1.9) },
        { t: T.release - 0.04, blur: 7, cam: (k) => G.cam(V.lerp([-0.38, 0.3, -0.58], [-0.33, 0.33, -0.5], k), [0.05, 0.14, -0.04], 2.1) },
        { t: T.target - 0.05, blur: 3, cam: (k) => G.cam(V.lerp([0.75, 1.0, -1.45], [0.6, 0.95, -1.35], k), [0.05, 0.0, 0.05], 1.9) },
        { t: T.bacteria2 - 0.05, blur: 5, cam: (k) => G.cam(V.lerp([0.7, 0.5, -0.8], [0.64, 0.46, -0.72], k), [L[0], 0.08, L[2]], 2.1) },
        { t: T.P - 0.05, blur: 9, far: 5, cam: (k) => G.cam(V.lerp([0.03, 0.25, -0.66], [0.08, 0.23, -0.58], k), [L[0], 0.085, L[2]], 2.5) },
        { t: T.biggest - 0.05, blur: 3, cam: (k) => G.cam(V.lerp([-0.35, 1.45, -1.75], [-0.28, 1.35, -1.58], k), [0.05, 0.0, 0.1], 1.9) },
      ];
      this.bg = G.create(api, G.bgFrag); this.fg = G.create(api, G.fgFrag()); this.fg2 = G.create(api, G.fgFrag());
    },
    draw(ctx, t, api) {
      const M = MICRO, G = M.G, V = G.v, { P, ease, clamp, lerp, prog, pop, env } = api;
      const s = G.shot(SH, t), k = ease.inOutSine(clamp(s.lt / s.len)), cam = s.cam(k);
      const focus = s.k >= 4 ? prog(t, T.P, 0.5) : 0;
      const chomp = env(t, 0, T.release + 0.4, 0.2, 0.3);
      const bugs = CROWD.map((b, i) => {
        const isPg = b.kind === 'pg';
        const hi = isPg && s.k === 5 ? prog(t, T.biggest, 0.5) : 0;
        return { ...b, p: [b.p[0] + Math.sin(t * 0.8 + b.seed * 9) * 0.005, b.p[1], b.p[2] + Math.cos(t * 0.7 + b.seed * 5) * 0.005], yaw: b.yaw + Math.sin(t + b.seed * 7) * 0.06,
          sq: b.kind !== 'good' ? 0.06 * chomp * Math.max(0, Math.sin(t * 9 + i)) : 0, dim: s.k === 5 && !isPg ? 0.75 * prog(t, T.biggest, 0.5) : 0, glow: hi * (0.22 + 0.08 * Math.sin(t * 4 + i)) };
      });
      const food = FOOD.map((f, i) => ({ ...f, size: f.size.map((v) => v * (1 - 0.6 * prog(t, 0.3 + i * 0.3, 2.4))) }));
      // ---- layers
      G.blit(ctx, api, this.bg.draw({ uTime: t, ...cam.u, ...G.bgU({ sway: 0.3, bright: s.k === 5 ? 0.85 : 1 }) }), { blur: s.blur });
      for (const b of bugs) if (b.kind !== 'cocc' && b.kind !== 'pg') G.flagella(ctx, cam, b, t, { color: b.dim > 0.3 ? 'rgba(170,170,190,0.18)' : undefined });
      if (s.k === 4) {
        G.blit(ctx, api, this.fg2.draw({ uTime: t, ...cam.u, ...G.pack(bugs.filter((_, i) => i !== LOCK), food, []) }), { blur: s.far });
        G.blit(ctx, api, this.fg.draw({ uTime: t, ...cam.u, ...G.pack([{ ...bugs[LOCK], glow: 0 }], [], [], { shadow: 0.8, bright: 0.92 }) }));
      } else {
        G.blit(ctx, api, this.fg.draw({ uTime: t, ...cam.u, ...G.pack(bugs, s.k < 2 ? food : [], []) }));
      }
      for (const b of bugs) if (b.kind === 'pg' && (s.k >= 3 || b.dim === 0)) G.fuzz(ctx, cam, b, t, { n: s.k === 4 ? 110 : 70, color: s.k === 4 ? 'rgba(225,190,255,0.55)' : 'rgba(215,180,255,0.4)' });
      // ---- VSCs: puffs of H2S
      const emit = (b, t0, n, spread) => {
        const rear = V.add(b.p, [-Math.cos(b.yaw) * 0.12, 0.02, -Math.sin(b.yaw) * 0.12]);
        for (let j = 0; j < n; j++) {
          const b0 = t0 + j * spread, u = t - b0; if (u < 0 || u > 3) continue;
          const wp = [rear[0] + Math.sin(u * 1.3 + j * 2) * 0.06, rear[1] + u * 0.16, rear[2] + Math.cos(u * 1.1 + j) * 0.05], q = cam.project(wp); if (q.z < 0.05) continue;
          const fade = 1 - clamp((u - 2.2) / 0.8);
          M.blob(ctx, 'gas', q.x, q.y, 0.09 * q.s, 0.25 * fade * clamp(u / 0.3));
          M.h2s(ctx, q.x, q.y, 0.028 * q.s * pop(t, b0, 0.35), Math.sin(u + j) * 0.6, j + u * 1.8, { alpha: fade });
        }
      };
      if (s.k === 1) emit(bugs[4], T.release, 7, 0.2);
      if (s.k === 5) CROWD.forEach((b, i) => { if (b.kind === 'pg') emit(bugs[i], T.biggest + 0.2 + i * 0.13, 5, 0.3); });
      // ---- HUD / labels (top-left kept clear for the AD chip)
      if (s.k === 1) {
        M.tag(ctx, 'VOLATILE SULFUR COMPOUNDS', 1080, 210, prog(t, T.volatile, 0.4), { size: 60, align: 'center', color: P.gas });
        M.chip(ctx, 'VSCs', 1080, 300, pop(t, T.compounds, 0.45), { size: 46, upper: false });
      }
      if (s.k === 2) {                                                          // roaming reticle
        const path = [4, 8, 11, 0, LOCK], seg = (T.bacteria2 - T.target) / (path.length - 1);
        const u = clamp((t - T.target) / (T.bacteria2 - T.target)) * (path.length - 1), i0 = Math.min(path.length - 2, Math.floor(u)), f = ease.inOutCubic(u - i0);
        const a = cam.project(bugs[path[i0]].p), b = cam.project(bugs[path[i0 + 1]].p);
        M.reticle(ctx, lerp(a.x, b.x, f), lerp(a.y, b.y, f), 90, prog(t, T.target, 0.35), t * 2, { width: 5 });
        void seg;
      }
      if (s.k === 3) { const q = cam.project(bugs[LOCK].p); M.reticle(ctx, q.x, q.y, 0.17 * q.s, 1, t * 0.6, { width: 6 }); api.doodle.text(ctx, 'locked', q.x + 0.2 * q.s, q.y + 0.02 * q.s, prog(t, T.bacteria2 + 0.1, 0.4, ease.linear), { color: P.lime, size: 56, stroke: 'rgba(10,8,22,0.7)', strokeWidth: 9 }); }
      if (s.k === 4) { const q = cam.project(bugs[LOCK].p); G.label(ctx, api, 'P. GINGIVALIS', { x: q.x, y: q.y - 0.12 * q.s }, clamp(q.x, 420, 1500), 190, pop(t, T.P, 0.5), { size: 72 }); }
      if (s.k === 5) {
        CROWD.forEach((b, i) => { if (b.kind !== 'pg') return; const q = cam.project(bugs[i].p); M.reticle(ctx, q.x, q.y, 0.15 * q.s, prog(t, T.biggest + i * 0.05, 0.4), t * 0.8, { width: 5, seed: i }); });
        M.chip(ctx, 'P. GINGIVALIS', 960, 170, pop(t, T.biggest, 0.5), { size: 60 });
        const lk = cam.project(bugs[2].p);
        M.tag(ctx, 'VSCs', lk.x + 40, lk.y - 0.3 * lk.s, prog(t, T.volatile2, 0.4), { size: 56, color: P.gas, align: 'center', upper: false });
      }
      G.artistic(ctx, api);
      api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.45 });
    },
  });
})();
