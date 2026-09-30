// @use videos/bad-breath-for-good/scenes/micro/_lib.js
// @use videos/bad-breath-for-good/scenes/micro/_gl.js
// comes-back · words 3013-3047, the ad opener (the overlay group puts the AD chip top-left: keep that corner clear).
// "If these bacteria are the problem, and doing all these things in the studies, like, it helps, but it's not the end game
// because it just keeps coming back, what do you do?"   Real 3D, hard cuts:
//   S1 close  the colony, circled: "the problem"
//   S2 wide   a cleaning sweep glides across the floor and clears it (a few survivors stay down in the corners)
//   S3 close  IT HELPS, then time-lapse: a survivor divides and the colony regrows
//   S4 wide   the colony is back: IT KEEPS COMING BACK, "?"
(function () {
  const CUT = MICRO.cut(3013, 3047);
  let T, SH, COL, SURV, GROW;
  defineScene({
    name: 'comes-back', duration: CUT.dur,
    setup(api) {
      const M = MICRO.init(api), G = M.G, W = CUT.W, V = G.v;
      T = { bacteria: W(3015), problem: W(3018), doing: W(3020), studies: W(3026), helps: W(3029), but: W(3030), end: W(3036), keeps: W(3041), coming: W(3042), back: W(3043), what: W(3044), doQ: W(3047) };
      COL = [['rod', -0.16, 0.04, 0.3], ['cocc', 0.02, 0.14, 0], ['rod2', 0.16, -0.02, -0.5], ['rod', 0.3, 0.16, 2.6], ['cocc', -0.34, 0.2, 0], ['rod', -0.04, -0.2, 1.3], ['rod2', 0.42, -0.14, 2.9], ['cocc', 0.12, 0.3, 0], ['rod', -0.42, -0.1, -0.8], ['rod2', 0.5, 0.36, 2.2], ['cocc', -0.2, 0.42, 0], ['rod', 0.08, -0.42, 0.4]]
        .map(([kind, x, z, yaw], i) => ({ kind, p: [x, G.SIZE[kind][1], z], yaw, seed: i * 0.13 }));
      SURV = [{ kind: 'rod', p: [0.95, 0.068, 0.3], yaw: 2.9, seed: 0.9 }, { kind: 'cocc', p: [-0.92, 0.082, -0.3], yaw: 0, seed: 0.7 }, { kind: 'rod2', p: [-0.35, 0.062, 0.95], yaw: 1.6, seed: 0.5 }];
      const pos = [[0.82, 0.44], [0.92, 0.14], [0.68, 0.54], [0.64, 0.3], [0.78, 0.63], [0.5, 0.47], [0.6, 0.7]], par = [0, 0, 1, 1, 2, 3, 3];
      const tt = [T.but + 0.15, T.but + 0.6, T.but + 0.65, T.but + 1.05, T.but + 1.1, T.but + 1.2, T.but + 1.3];
      const kinds = ['rod', 'rod', 'rod2', 'rod', 'cocc', 'rod2', 'rod'];
      GROW = pos.map((q, i) => ({ kind: kinds[i], p: [q[0], G.SIZE[kinds[i]][1], q[1]], yaw: 2.6 + i * 0.7, parent: par[i], t: tt[i], seed: 0.3 + i * 0.11 }));
      SH = [
        { t: 0, blur: 6, cam: (k) => G.cam(V.lerp([0.62, 0.4, -0.78], [0.54, 0.36, -0.66], k), [0.05, 0.08, 0.05], 2.1) },
        { t: T.doing - 0.04, blur: 2, cam: (k) => G.cam(V.lerp([0.05, 2.5, -1.45], [0.0, 2.4, -1.35], k), [0.0, 0.0, 0.2], 1.9) },
        { t: T.helps - 0.06, blur: 7, cam: (k) => G.cam(V.lerp([0.28, 0.4, -0.3], [0.32, 0.37, -0.22], k), [0.78, 0.07, 0.4], 2.1) },
        { t: T.keeps - 0.06, blur: 3, cam: (k) => G.cam(V.lerp([-0.25, 1.1, -1.55], [-0.2, 1.0, -1.38], k), [0.05, 0.02, 0.08], 1.9) },
      ];
      this.bg = G.create(api, G.bgFrag); this.fg = G.create(api, G.fgFrag());
    },
    draw(ctx, t, api) {
      const M = MICRO, G = M.G, V = G.v, { P, ease, clamp, lerp, prog, pop, env } = api;
      const s = G.shot(SH, t), k = ease.inOutSine(clamp(s.lt / s.len)), cam = s.cam(k);
      const live = (b) => ({ ...b, p: [b.p[0] + Math.sin(t * 0.8 + b.seed * 9) * 0.004, b.p[1], b.p[2] + Math.cos(t * 0.7 + b.seed * 5) * 0.004], yaw: b.yaw + Math.sin(t + b.seed * 7) * 0.05 });
      let bugs = [], sweep = [0, 0.35, 0, 0.6];
      if (s.k === 0) bugs = COL.map(live).concat(SURV.map(live));
      if (s.k === 1) {                                                         // the sweep clears the floor
        const front = lerp(-2.0, 2.2, ease.inOutSine(clamp((t - T.doing) / 1.5)));
        sweep = [front, 0.42, 1.2, 0.8];
        for (const b of COL) {
          const push = clamp((front - b.p[0] + 0.12) / 0.5); if (push >= 1) continue;
          const lb = live(b); lb.p = [b.p[0] + push * 0.6, b.p[1] + Math.sin(push * Math.PI) * 0.12, b.p[2]]; lb.yaw += push * 4; lb.scale = 1 - push; if (lb.scale > 0.05) bugs.push(lb);
        }
        bugs = bugs.concat(SURV.map(live));
      }
      if (s.k === 2) {                                                         // survivor regrows (time-lapse)
        bugs.push(live(SURV[0]));
        const all = [SURV[0], ...GROW];
        GROW.forEach((g, i) => { const gk = ease.outBack(clamp((t - g.t) / 0.4), 1.4); if (gk <= 0) return; const from = all[g.parent].p; const b = live(g); b.p = V.lerp(from, g.p, clamp(gk)); b.p[1] = g.p[1]; b.scale = 0.4 + 0.6 * clamp(gk); bugs.push(b); });
        bugs = bugs.concat(SURV.slice(1).map(live));
      }
      if (s.k === 3) {                                                         // it's back
        COL.forEach((b, i) => { const lb = live(b); const gk = i < 8 ? 1 : ease.outBack(clamp((t - T.keeps - 0.1 - (i - 8) * 0.12) / 0.4), 1.5); if (gk <= 0) return; lb.scale = gk; bugs.push(lb); });
        bugs = bugs.concat(SURV.map(live));
      }
      G.blit(ctx, api, this.bg.draw({ uTime: t, ...cam.u, ...G.bgU({ sway: 0.35, sweep }) }), { blur: s.blur });
      for (const b of bugs) if (b.kind !== 'cocc') G.flagella(ctx, cam, b, t);
      G.blit(ctx, api, this.fg.draw({ uTime: t, ...cam.u, ...G.pack(bugs, [], []) }));
      // sweep sparkle
      if (s.k === 1 && sweep[0] > -1.8 && sweep[0] < 2) { const r = api.rand('sw'); for (let i = 0; i < 26; i++) { const q = cam.project([sweep[0] - r() * 0.4, r() * 0.4, -1 + r() * 2]), tw = 0.5 + 0.5 * Math.sin(t * 20 + i); ctx.fillStyle = `rgba(230,250,255,${(0.9 * tw).toFixed(3)})`; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); } }
      // overlays (AD chip lives top-left: nothing there)
      if (s.k === 0) {
        const q = cam.project([0.05, 0.06, 0.08]);
        api.doodle.circle(ctx, q.x, q.y, 0.62 * q.s, 0.3 * q.s, prog(t, T.problem - 0.05, 0.5, ease.inOutCubic), { color: P.marker, width: 10, seed: 3 });
        api.doodle.text(ctx, 'the problem', 1260, 200, prog(t, T.problem + 0.1, 0.45, ease.linear), { color: P.marker, size: 70, stroke: 'rgba(10,8,22,0.7)', strokeWidth: 10, rotate: -0.06 });
      }
      if (s.k === 2) {
        M.chip(ctx, 'IT HELPS', 960, 190, pop(t, T.helps, 0.5) * (1 - prog(t, T.but + 0.1, 0.2)), { size: 64 });
        const ff = env(t, T.but, T.keeps + 0.1, 0.2, 0.2);
        if (ff > 0) {
          ctx.save(); ctx.globalAlpha *= ff; G.glass(ctx, 1560, 110, 240, 110, { r: 22 }); ctx.translate(1680, 165);
          ctx.fillStyle = P.ink; for (const ox of [-62, -14]) { ctx.beginPath(); ctx.moveTo(ox - 22, -28); ctx.lineTo(ox + 24, 0); ctx.lineTo(ox - 22, 28); ctx.closePath(); ctx.fill(); }
          ctx.strokeStyle = P.lime; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(52, 0, 26, 0, Math.PI * 2); ctx.stroke();
          const ha = (t - T.but) * 9; ctx.beginPath(); ctx.moveTo(52, 0); ctx.lineTo(52 + Math.cos(ha) * 18, Math.sin(ha) * 18); ctx.stroke(); ctx.restore();
        }
      }
      if (s.k === 3) {
        const kb = pop(t, T.keeps, 0.5);
        M.chip(ctx, 'IT KEEPS COMING BACK', 960, 200, kb, { size: 66 });
        if (kb > 0) {
          const lp = prog(t, T.coming, 0.6, ease.inOutCubic), pts = [];
          for (let i = 0; i <= 50; i++) { const a = -Math.PI * 0.9 + (i / 50) * Math.PI * 1.7; pts.push([960 + Math.cos(a) * 420, 200 + Math.sin(a) * 88]); }
          api.doodle.stroke(ctx, pts, lp, { color: P.lime, width: 8, seed: 4 });
        }
        api.doodle.text(ctx, '?', 1660, 560, prog(t, T.what, 0.45, ease.linear), { color: P.lime, size: 260, stroke: 'rgba(10,8,22,0.75)', strokeWidth: 16, rotate: 0.12 * Math.sin(t * 2) });
      }
      G.artistic(ctx, api);
      api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.45 });
    },
  });
})();
