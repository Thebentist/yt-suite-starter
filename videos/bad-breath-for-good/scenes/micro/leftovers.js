// @use videos/bad-breath-for-good/scenes/micro/_lib.js
// @use videos/bad-breath-for-good/scenes/micro/_gl.js
// leftovers · words 1197-1216. "Basically what you're smelling is the remains of the leftovers, that bacteria basically
// dissolve and poop out on your mouth." The one comic beat (the only micro shot with a face). Real 3D, hard cuts:
//   S1 wide   leftovers tumble down into the gap; a big bacterium looks up at them
//   S2 close  LEFTOVERS: it gulps them; on "dissolve" its body turns glassy and the bits dissolve inside
//   S3 rear   on "poop": it squeezes and lets out a little puff (H2S), "that's the smell"
(function () {
  const CUT = MICRO.cut(1197, 1216, 1221);
  let T, SH, HERO, A, MOUTH, REAR, ITEMS;

  defineScene({
    name: 'leftovers', duration: CUT.dur,
    setup(api) {
      const M = MICRO.init(api), G = M.G, W = CUT.W, V = G.v;
      T = { smelling: W(1200), remains: W(1203), leftovers: W(1206), bacteria: W(1208), dissolve: W(1210), and: W(1211), poop: W(1212), out: W(1213), mouth: W(1216) };
      HERO = { kind: 'rod', p: [0, 0.122, 0.2], yaw: -2.0, scale: 1.8, seed: 0.3, wig: 0.08 };
      A = [Math.cos(HERO.yaw), 0, Math.sin(HERO.yaw)];
      const hl = G.SIZE.rod[0] * 1.8, r = G.SIZE.rod[1] * 1.8;
      MOUTH = V.add(HERO.p, V.mul(A, hl + r * 0.7)); REAR = V.add(HERO.p, V.mul(A, -(hl + r * 0.9)));
      ITEMS = [
        { k: 4, size: [0.05, 0.035, 0.045], land: [-0.34, 0.035, -0.02] },
        { k: 0, size: [0.095, 0.012, 0.075], land: [-0.08, 0.014, -0.2] },
        { k: 2, size: [0.045, 0.04, 0.045], land: [-0.3, 0.04, -0.2] },
        { k: 9, size: [0.022, 0, 0], land: [-0.18, 0.024, -0.1] },                  // a short protein strand (3 beads)
      ].map((it, i) => ({ ...it, from: [it.land[0] + 0.18 - i * 0.1, 0.62 + i * 0.1, it.land[2] + 0.15], f0: 0.05 + i * 0.32, g: T.leftovers + 0.12 + i * 0.27, inside: V.add(HERO.p, V.mul(A, (0.5 - i * 0.33) * hl)), spin: 3 + i }));
      SH = [
        { t: 0, blur: 3, cam: (k) => G.cam(V.lerp([0.12, 0.4, -1.15], [0.06, 0.35, -0.98], k), [-0.12, 0.24, 0.05], 1.9) },
        { t: T.leftovers - 0.05, blur: 7, cam: (k) => G.cam(V.lerp([-0.52, 0.34, -0.5], [-0.46, 0.3, -0.42], k), [-0.08, 0.12, 0.08], 2.1) },
        { t: T.poop - 0.05, blur: 5, cam: (k) => G.cam(V.lerp([0.78, 0.3, 0.3], [0.72, 0.28, 0.36], k), [0.12, 0.2, 0.56], 1.9) },
      ];
      this.bg = G.create(api, G.bgFrag); this.fg = G.create(api, G.fgFrag()); this.fg2 = G.create(api, G.fgFrag());
    },
    draw(ctx, t, api) {
      const M = MICRO, G = M.G, V = G.v, { P, ease, clamp, lerp, prog, pop, env } = api;
      const s = G.shot(SH, t), k = ease.inOutSine(clamp(s.lt / s.len)), cam = s.cam(k);
      // ---- items: fall, gulp, dissolve inside
      const outside = { cells: [], beads: [] }, inside = { cells: [], beads: [] };
      const dis = ease.inCubic(clamp((t - T.dissolve) / 0.75));
      ITEMS.forEach((it, i) => {
        const fall = ease.outBounce ? 0 : 0; void fall;
        const fk = clamp((t - it.f0) / (T.leftovers - 0.15 - it.f0));
        let p = V.lerp(it.from, it.land, ease.inOutCubic(fk)), sc = 1, yaw = it.spin * (1 - fk) * 3;
        p[1] += Math.sin(fk * Math.PI) * 0.05;
        let inBody = false;
        if (t > it.g) { const gk = ease.inCubic(clamp((t - it.g) / 0.28)); p = V.lerp(it.land, MOUTH, gk); sc = lerp(1, 0.55, gk); if (gk >= 1) { inBody = true; p = it.inside; sc = 0.55 * (1 - dis); } }
        if (sc <= 0.01) return;
        const dst = inBody ? inside : outside;
        if (it.k === 9) { for (let j = 0; j < 3; j++) dst.beads.push({ p: [p[0] + (j - 1) * 0.045 * sc, p[1] + Math.sin(j * 1.7) * 0.01, p[2] + (j - 1) * 0.02 * sc], r: it.size[0] * sc }); }
        else dst.cells.push({ p, yaw, size: it.size.map((v) => v * sc), k: it.k });
      });
      // ---- the hero bacterium
      let sq = 0;
      ITEMS.forEach((it) => { if (t > it.g + 0.2) sq += 0.14 * Math.exp(-(t - it.g - 0.2) * 7) * Math.cos((t - it.g) * 18); });
      sq += -0.16 * env(t, T.poop - 0.2, T.poop + 0.12, 0.18, 0.06);
      if (t > T.poop + 0.12) sq += 0.2 * Math.exp(-(t - T.poop - 0.12) * 6) * Math.cos((t - T.poop) * 15);
      const glassy = env(t, T.dissolve - 0.25, T.poop - 0.1, 0.25, 0.25);
      const hero = { ...HERO, sq, dim: -0.8 * glassy, p: [HERO.p[0], HERO.p[1] + Math.sin(t * 2.2) * 0.004, HERO.p[2]] };
      // ---- layers
      G.blit(ctx, api, this.bg.draw({ uTime: t, ...cam.u, ...G.bgU({ sway: 0.3, gap: 0.78 }) }), { blur: s.blur });
      if (s.k < 2) G.flagella(ctx, cam, hero, t, { n: 3, len: 1.3 });
      if (inside.cells.length || inside.beads.length) G.blit(ctx, api, this.fg2.draw({ uTime: t, ...cam.u, ...G.pack([], inside.cells, inside.beads, { shadow: 0 }) }));
      G.blit(ctx, api, this.fg.draw({ uTime: t, ...cam.u, ...G.pack([hero], outside.cells, outside.beads) }));
      // fizz while dissolving (inside the glassy body)
      if (glassy > 0.05 && s.k === 1) {
        const r = api.rand('fizz');
        for (let i = 0; i < 30; i++) {
          const b0 = T.dissolve + r() * 0.7, u = t - b0; if (u < 0 || u > 0.6) continue;
          const wp = V.add(HERO.p, V.add(V.mul(A, (r() - 0.5) * 0.3), [0, (r() - 0.3) * 0.08 + u * 0.08, (r() - 0.5) * 0.05])), q = cam.project(wp);
          ctx.strokeStyle = `rgba(255,255,235,${(0.75 * (1 - u / 0.6)).toFixed(3)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, (0.004 + r() * 0.006) * q.s, 0, Math.PI * 2); ctx.stroke();
        }
      }
      // face (comic beat): looks up while the leftovers fall, mouth open on each gulp, eyes shut while straining
      if (s.k < 2) {
        const gulp = ITEMS.reduce((m, it) => Math.max(m, env(t, it.g - 0.12, it.g + 0.3, 0.1, 0.12)), 0);
        G.face(ctx, cam, hero, { mouth: gulp, smile: 1, eyeScale: 1.2, closed: glassy > 0.6 && t > T.dissolve + 0.2 });
      }
      // ---- the puff (S3)
      const pt = t - (T.poop + 0.1);
      if (pt > 0) {
        const rq = cam.project(REAR), pdir = V.norm(V.add(V.mul(A, -1), [0, 0.7, 0.1])), pc = cam.project(V.add(REAR, V.mul(pdir, 0.12 + 0.25 * (1 - Math.exp(-pt * 2.5)))));
        for (let i = 0; i < 8; i++) { const u = clamp(pt / 1.2), a = i * 0.8; M.blob(ctx, 'gas', pc.x + Math.cos(a) * (30 + pt * 90), pc.y + Math.sin(a) * (20 + pt * 60), (80 + pt * 170) * (0.7 + 0.08 * i), 0.34 * clamp(pt / 0.2) * (1 - 0.4 * u)); }
        [[0.02, 0.9, -0.1], [0.08, 1.2, 0.35], [0.14, 0.75, 0.6]].forEach(([d, sp, a], i) => {
          const u = pt - d; if (u <= 0) return;
          const dir = V.norm(V.add(V.mul(A, -1), [0, 0.5 + a * 0.5, a * 0.4]));
          const wp = V.add(REAR, V.mul(dir, sp * 0.35 * (1 - Math.exp(-u * 3)) + u * 0.05)), q = cam.project(wp);
          M.h2s(ctx, q.x, q.y, 0.036 * q.s * pop(t, T.poop + 0.1 + d, 0.35), Math.sin(u * 2 + i) * 0.6, i + u * 2);
        });
        api.doodle.text(ctx, 'pfft', pc.x - 40, pc.y - 150, prog(t, T.poop + 0.12, 0.3), { color: P.gas, size: 70, stroke: 'rgba(10,8,22,0.7)', strokeWidth: 10, rotate: 0.12 });
        api.doodle.text(ctx, 'ew', 1640, 250, prog(t, T.out, 0.3), { color: P.marker, size: 110, stroke: 'rgba(10,8,22,0.7)', strokeWidth: 12, rotate: -0.12 });
        api.doodle.text(ctx, "that's the smell", 1250, 930, prog(t, T.poop + 0.2, 0.45, ease.linear), { color: P.lime, size: 66, stroke: 'rgba(10,8,22,0.7)', strokeWidth: 10, rotate: -0.03 });
        api.doodle.arrow(ctx, 1560, 870, pc.x + 60, pc.y + 60, prog(t, T.poop + 0.5, 0.35), { color: P.lime, width: 9, bend: 50, seed: 5 });
      }
      M.chip(ctx, 'LEFTOVERS', 960, 170, pop(t, T.leftovers, 0.5) * (1 - prog(t, T.poop - 0.2, 0.2)), { size: 60 });
      G.artistic(ctx, api);
      api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.45 });
    },
  });
})();
