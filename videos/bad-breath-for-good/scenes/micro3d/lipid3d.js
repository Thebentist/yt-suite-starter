// @use videos/bad-breath-for-good/scenes/micro3d/_lib.js
// lipid3d (replaces micro/nano-lipid) · words 3171-3204, inside Ben's Zero Pro segment: "Well, we're the first company in the world
// to use these things called nano lipid emulsions. This is really cool biotech that can actually specifically target certain
// bacteria." Iridescent nano-droplets (thin-film shell, golden oil core) drift through the fluid / one droplet up close
// (NANO LIPID EMULSIONS) / the droplets stream toward a crowd of bacteria / they gather on the purple ones only (CERTAIN BACTERIA).
// On screen only the name and "certain bacteria": the "first in the world" claim stays off screen (research-notes Don't-say list).
// The ad-chip overlay sits top-left during this segment, so type stays centre/bottom. Hands off to micro/pg-target.
(function () {
  const FRAG = M3.GLSL.core + `
float groundH(vec2 xz){ return 0.; } float colonyDens(vec2 xz){ return 0.; }
` + M3.GLSL.bact + M3.GLSL.pap + M3.GLSL.drop + M3.GLSL.lipid;

  defineScene({
    name: 'lipid3d',
    anchor: { word: 3171, offset: -0.15 },
    anchorEnd: { word: 3220, offset: -0.15 },
    tail: 0,
    setup(api) {
      this.r = M3.create(api, FRAG, { res: 0.5, aa: 2, steps: 150, stepScale: 0.8, sc: 1 });
      const A = (w) => api.at(w);
      const T = this.T = { called: A(3183), nano: A(3184), lipid: A(3185), emulsions: A(3186), thisW: A(3193), cool: A(3196), biotech: A(3197), can: A(3199), specifically: A(3201), target: A(3202), certain: A(3203), bacteria: A(3204) };
      const c = -0.04;
      this.shots = [{ at: 0, k: 'drift' }, { at: T.nano + c, k: 'hero' }, { at: T.cool + c, k: 'stream' }, { at: T.target + c, k: 'home' }];
      this.crowd = M3.LIPID.crowd();
      const r = api.rand('l3-drops');
      this.free = Array.from({ length: 20 }, () => ({ p: [(r() - 0.5) * 30, 6 + r() * 14, -6 + r() * 26], r: 0.35 + Math.pow(r(), 1.8) * 0.75, ph: r() * 6.28, v: 0.4 + r() * 0.5 }));
      const q = api.rand('l3-motes'); this.motes = Array.from({ length: 120 }, () => ({ p: [(q() - 0.5) * 50, q() * 30, (q() - 0.5) * 40], r: 0.04 + q() * 0.08, a: 0.25 + q() * 0.4, ph: q() * 6.28 }));
    },
    draw(ctx, t, api) {
      const { ease, clamp, lerp, prog, pop } = api, T = this.T, L = M3.LIPID;
      const s = M3.shot(t, this.shots, api.duration), k = s.k, u = clamp(s.lt / Math.max(0.1, s.len));
      let ro, ta, fov = 2, focus, blur = 0.014, maxR = 0.026, drops = [], crowdOn = true;
      const targets = this.crowd.map((b, i) => [b, i]).filter(([b]) => b.tgt);
      if (k === 'drift') {
        const e = ease.inOutSine(u);
        ro = [lerp(-7, -3, e), 12.5, 26]; ta = [lerp(-4, 0, e), 12, 6]; fov = 2.1; focus = 12; blur = 0.018; maxR = 0.03;
        drops = this.free.map((d, i) => [d.p[0] * 0.8 + t * d.v * 1.2 + Math.sin(t * 0.7 + d.ph) * 0.4, 12 + (d.p[1] - 13) * 0.8 + Math.sin(t * 0.5 + d.ph) * 0.5, d.p[2] * 0.7 + 10, d.r * (i % 3 === 0 ? 2.2 : 1.4)]);
        crowdOn = false;
      } else if (k === 'hero') {
        const a = -0.35 + 0.4 * u, c = [0, 12.4, 12];
        ro = [c[0] + Math.sin(a) * 6.2, c[1] + 0.9, c[2] + Math.cos(a) * 6.2]; ta = [c[0] - 1.1, c[1] - 0.7, c[2]]; fov = 2.4; focus = 6.3; blur = 0.02; maxR = 0.034;
        drops = [[c[0], c[1], c[2], 1.8], ...this.free.slice(1, 9).map((d, i) => [c[0] + Math.sin(i * 2.4) * (5 + i), c[1] + Math.cos(i * 1.7) * 3, c[2] - 6 - i * 2.2 + t * 0.4, d.r])];
        crowdOn = false;
      } else if (k === 'stream') {
        const e = ease.inOutSine(u);
        ro = [lerp(-3, -1.5, e), 13, lerp(25, 22, e)]; ta = [0.5, 12, 0]; fov = 2.0; focus = 21; blur = 0.013;
        drops = this.free.map((d, i) => { const ph = ((t - T.cool) * (0.45 + 0.25 * d.v) + i / 20) % 1; const z = lerp(24, 3, ph); return [d.p[0] * 0.55 * (1 - ph * 0.6), 12 + (d.p[1] - 13) * 0.45, z, d.r * 0.8 * Math.min(1, (1 - ph) * 6)]; });
      } else {
        const e = ease.outCubic(u);
        ro = [lerp(1.5, 1.0, e), 12.8, lerp(19, 16.5, e)]; ta = [0.2, 12, 0]; fov = 1.95; focus = 16.5; blur = 0.013;
        // droplets gather on the targets: 3 around each
        const hk = ease.inOutCubic(clamp((t - T.target + 0.1) / 0.8));
        targets.forEach(([b, i], j) => { const q = L.at(b, t, i); for (let m = 0; m < 3; m++) { const ang = m * 2.1 + j + t * 0.8, rr = 1.25 * b.s;
          const from = [q.p[0] + (j - 2) * 3, q.p[1] + 2 + m, q.p[2] + 12]; const to = [q.p[0] + Math.cos(ang) * rr, q.p[1] + Math.sin(ang) * rr * 0.8, q.p[2] + 0.4];
          drops.push([lerp(from[0], to[0], hk), lerp(from[1], to[1], hk), lerp(from[2], to[2], hk), 0.42]); } });
      }
      const cam = M3.camera(ro, ta, 0, fov), dof = { focus, blur, maxR };
      const state = (i, b) => [b.tgt, 0, 0, 0];
      const U = { uTime: t, ...cam.uniforms, uSplit: 0, uWave: -100, uFogK: 0.028, uKeyPos: [ta[0] - 6, ta[1] + 8, ta[2] + 6], uKeyCol: [1.1, 1.0, 0.95],
        ...(crowdOn ? L.pack(this.crowd, t, state) : L.pack([], t, state)), ...L.drops(drops) };
      ctx.drawImage(this.r.draw(U, dof), 0, 0, api.W, api.H);
      M3.motes(ctx, cam, dof, this.motes.map((m) => ({ ...m, p: [m.p[0] + t * 0.4, m.p[1] + Math.sin(t * 0.3 + m.ph) * 0.5, m.p[2]] })), { color: '200,240,255', alpha: 0.55 });
      // ---------- type (centre/bottom: the ad chip owns the top-left)
      if (k === 'hero') {
        M3.headline(ctx, api, t, [['NANO', T.nano], ['LIPID', T.lipid], ['EMULSIONS', T.emulsions]], 960, 930, { size: 100 });
      }
      if (k === 'home') {
        api.label(ctx, 'CERTAIN BACTERIA', 960, 940, { p: pop(t, T.certain), size: 62, align: 'center' });
        // thin rings on the targets
        targets.forEach(([b, i], j) => { const q = L.at(b, t, i); const sp = M3.project(cam, q.p); if (!sp) return; const rp = prog(t, T.certain + j * 0.06, 0.4);
          if (rp <= 0) return; const R = (2.1 * b.s / sp.z) * fov * 540; ctx.save(); ctx.globalAlpha *= rp * 0.9; ctx.strokeStyle = api.P.lime; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(215,243,74,0.6)'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(sp.x, sp.y, R * (1.25 - 0.25 * rp), 0, Math.PI * 2 * rp); ctx.stroke(); ctx.restore(); });
      }
      M3.art(ctx, api);
      api.finish(ctx, t, { bloom: 0.36, grain: 0.05, vignette: 0.5 });
    },
  });
})();
