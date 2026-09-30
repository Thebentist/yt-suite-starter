// @use videos/bad-breath-for-good/scenes/teeth/_lib.js
// @use videos/bad-breath-for-good/scenes/teeth/_gl.js
// xylitol (w2891-2936), phase 2, real 3D: "And if you have dry mouth, well make sure if you're going to use mints do like
// a xylitol mint or something like that instead of a sugary mint. Because like I said, you're just going to feed that
// bacteria with the sugary stuff as well."
// Shots: 1 the dry, cracked tongue surface (same macro world as alcohol-mouthwash) -> 2 hero of a sugar-free xylitol
// tablet (lime check) -> 3 the two mints side by side, the swirl candy lands on "sugary" (red X) -> 4 close on the sugary
// candy: cavity-type bacteria (round cocci chains, per research-notes row 14) swarm it and bite it away, and multiply.
// No breath or sulfur claim is made about sugar here (row 14: that would be overstated).
defineScene({
  name: 'xylitol',
  anchor: { word: 2891, offset: -0.15 },
  anchorEnd: { word: 2936, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    TEETH.init(api);
    const T3 = TEETH3D;
    this.gm = api.gl.create(api, T3.MUCOSA, { res: 0.5, aa: 2 });
    this.gn = api.gl.create(api, T3.MINTS, { res: 0.5, aa: 2 });
    const A = (i) => api.at(i);
    this.W = { dry: A(2895), mouth: A(2896), well: A(2897), mints: A(2905), xylitol: A(2909), mint: A(2910), instead: A(2915), sugary: A(2918),
      because: A(2920), feed: A(2928), bacteria: A(2930), sugary2: A(2933), stuff: A(2934) };
    const w = this.W;
    this.cuts = [0, w.mints - 0.2, w.instead, w.because];
    const rnd = api.rand('xyl-swarm'); this.swarm = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rnd() * 0.2, r = 0.36 + (i % 3) * 0.07 + rnd() * 0.03;
      this.swarm.push({ a, r, y: 0.1 + (i % 2) * 0.1 + rnd() * 0.05, ph: rnd() * 20, t0: w.feed - 0.5 + rnd() * 0.6 + (i > 17 ? 0.9 + (i - 18) * 0.12 : 0), from: a + (rnd() - 0.5) * 1.2 });
    }
    this.bites = [];
    for (let i = 0; i < 8; i++) { const a = 0.4 + i * 0.83; this.bites.push({ a, t0: w.bacteria + 0.2 + i * 0.22 }); }
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api, T3 = TEETH3D, w = this.W, nz = api.noise('xyl');
    let S = 0; for (let i = 0; i < this.cuts.length; i++) if (t >= this.cuts[i]) S = i;
    const s0 = this.cuts[S], s1 = S + 1 < this.cuts.length ? this.cuts[S + 1] : api.duration, k = clamp((t - s0) / (s1 - s0)), e = ease.inOutSine(k);
    if (S === 0) {
      const c = { ro: [lerp(0.2, -0.05, e), lerp(0.62, 0.5, e), lerp(0.72, 0.6, e)], ta: [0, 0, -0.1], fov: 2.0 };
      ctx.drawImage(this.gm.draw({ uTime: t, uSteps: 170, uGlow: 1, ...T3.camUniforms(c), uWet: 1, uDry: 0.55 + 0.45 * prog(t, w.dry - 0.2, 0.8, ease.inOutCubic), uWash: 0, uWashX: 5, ...T3.packBugsX([]) }), 0, 0, api.W, api.H);
      if (t >= w.dry) api.label(ctx, 'IF YOU HAVE DRY MOUTH', 150, 140, { size: 62, p: pop(t, w.dry) });
      api.text(ctx, '* ARTISTIC RENDERING', 1860, 60, { size: 20, color: P.faint, align: 'right', tracking: 2 });
    } else {
      // ---- mints world
      const tabP = [-0.42, 0.085, 0, 1], swLand = ease.outBack(prog(t, w.sugary - 0.1, 0.45));
      let c, swP = [0.42, 0.12 + (1 - swLand) * 1.5, 0, t > w.sugary - 0.12 ? 1 : 0];
      if (S === 1) { swP[3] = 0; c = { ro: [lerp(-0.95, -0.7, e), lerp(0.55, 0.45, e), lerp(0.95, 0.8, e)], ta: [-0.42, 0.06, 0], fov: 2.2 }; }
      else if (S === 2) c = { ro: [lerp(-0.25, 0.1, e), lerp(0.95, 0.9, e), lerp(1.75, 1.6, e)], ta: [0, 0.05, 0], fov: 2.1 };
      else c = { ro: [lerp(0.95, 0.72, e), lerp(0.7, 0.6, e), lerp(1.05, 0.92, e)], ta: [0.42, 0.1, 0], fov: 2.2 };
      // bites and bacteria (only on the sugary candy)
      const bite = new Float32Array(32); let nb = 0;
      for (const b of this.bites) { if (t < b.t0) continue; const g = ease.outCubic(prog(t, b.t0, 0.3)); bite.set([Math.cos(b.a) * 0.385, 0.07, Math.sin(b.a) * 0.385, 0.085 * g], nb * 4); nb++; }
      const eaten = nb / 8;
      const bugs = [];
      if (S >= 2) for (const s of this.swarm) {
        if (t < s.t0) continue; const a = ease.outCubic(prog(t, s.t0, 0.8));
        const ang = lerp(s.from, s.a, a) + nz(t * 0.3 + s.ph, 1) * 0.1, rr = lerp(1.6, s.r - eaten * 0.08, a) + Math.sin(t * 7 + s.ph) * 0.01;
        bugs.push({ p: [0.42 + Math.cos(ang) * rr, lerp(0.6, s.y, a), Math.sin(ang) * rr], ph: s.ph + t * 0.5, kind: 2 });
      }
      // a couple of passers-by glide over the xylitol tablet without stopping
      if (S >= 2) for (let i = 0; i < 2; i++) { const u = clamp((t - w.feed - i * 0.6) / 2.2); if (u > 0 && u < 1) bugs.push({ p: [lerp(-1.2, 0.0, u), 0.3 + i * 0.1, -0.25 + i * 0.4], ph: i * 3 + t, kind: 2 }); }
      ctx.drawImage(this.gn.draw({ uTime: t, uSteps: 170, uGlow: 1, ...T3.camUniforms(c), uTabP: tabP, uSwP: swP, uSpin: t * 0.25, uNBite: nb, uBite: bite, uBugS: 0.032, ...T3.packBugsX(bugs) }), 0, 0, api.W, api.H);
      const pj = (p) => T3.proj(c, p);
      T3.bokeh(ctx, api, t, { seed: 90 + S, n: 7, r: 80, a: 0.05 });
      if (S === 1) {
        if (t >= w.mints) api.text(ctx, 'IF YOU USE MINTS', 150, 150, { size: 52, color: P.ink, tracking: 2, alpha: prog(t, w.mints, 0.35), stroke: 'rgba(0,0,0,0.5)', strokeWidth: 8 });
        if (t >= w.xylitol) api.label(ctx, 'XYLITOL', 150, 250, { size: 76, p: pop(t, w.xylitol) });
        const ck = prog(t, w.mint, 0.45, ease.inOutCubic);
        if (ck > 0) api.doodle.check(ctx, 540, 240, 50, ck, { color: P.lime, width: 14, seed: 4 });
        api.text(ctx, 'SUGAR-FREE', 150, 360, { size: 40, color: P.dim, tracking: 4, alpha: prog(t, w.mint + 0.2, 0.4) });
      }
      if (S === 2) {
        const [tx, ty] = pj([-0.42, 0.1, 0]), [sx, sy] = pj([0.42, 0.12, 0]);
        api.label(ctx, 'XYLITOL', tx, 150, { size: 58, align: 'center' });
        api.doodle.check(ctx, tx + 170, 140, 40, 1, { color: P.lime, width: 12, seed: 4 });
        if (t >= w.sugary) {
          api.label(ctx, 'SUGARY', sx, 150, { size: 58, p: pop(t, w.sugary), align: 'center', bg: P.marker, color: '#ffffff' });
          const xo = prog(t, w.sugary + 0.35, 0.4, ease.inOutCubic);
          if (xo > 0) api.doodle.cross(ctx, sx + 160, 150, 30, xo, { color: P.marker, width: 12, seed: 6 });
        }
      }
      if (S === 3) {
        if (t >= w.feed) api.label(ctx, 'FEEDS THE BACTERIA', 150, 140, { size: 60, p: pop(t, w.feed), bg: '#9bdc3c' });
        api.doodle.text(ctx, 'the sugary stuff', 150, 980, prog(t, w.sugary2, 0.8, ease.linear), { color: P.ink, size: 56, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 9 });
        api.text(ctx, 'CAVITY BACTERIA', 1860, 1010, { size: 30, color: P.faint, align: 'right', tracking: 3, alpha: prog(t, w.bacteria, 0.4) });
      }
    }
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });
  },
});
