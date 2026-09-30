// @use videos/bad-breath-for-good/scenes/mouth3d/_lib.js
/* carpet3d (w991-1045, replaces tongue/carpet-gunk). A real 3D shag carpet next to the long papillae at the back of the
 * tongue; food and gunk fall in and get stuck between them (seen in a cutaway section of the tongue); mucus and dead
 * cells join it; spit washes over the tops but never gets down between them.
 * Words: "And just like that real shag carpet, well, food, gunk, particles, all that get stuck in between those little
 * shag carpet filaments. And not only just food, but you have mucus and dead cells from your cheek and tongue. And spit
 * can't really get all the way down there to wash it all out either."
 * Shots: the carpet | split carpet / tongue "shag carpet" | debris falls in "food, gunk, particles" | cutaway "stuck in
 * between" | macro "filaments" | FOOD, MUCUS | DEAD CELLS drift down | cutaway, spit flows over the tops | SPIT CAN'T REACH.
 */
const FIELD = M3D.frag({
  defs: ['#define FIELD_EXTRA'],
  parts: ['base', 'field', 'saliva'],
  map: 'float map(vec3 p){ return fieldMap(p); }',
  post: ['fieldShade'],
  render: `
vec3 render(vec2 fc){
  vec3 ro; vec3 rd = camRay(fc, ro);
  float t = march(ro, rd, 9.0);
  vec3 bg = uFogCol * (1.0 - 0.35 * rd.y);
  vec3 col = bg;
  if (t > 0.) { vec3 p = ro + rd * t, n = calcNormal(p); col = applyFog(shadeField(p, n, rd, t), t, rd) * 1.1; }
  return spitLayer(ro, rd, t, col);
}`,
});
const CARPET = M3D.frag({
  parts: ['base', 'carpet'],
  map: 'float map(vec3 p){ return carpetMap(p); }',
  post: ['carpetShade'],
  render: `
vec3 render(vec2 fc){
  vec3 ro; vec3 rd = camRay(fc, ro);
  float t = march(ro, rd, 8.0);
  vec3 bg = uFogCol * (1.0 - 0.35 * rd.y);
  if (t < 0.) return bg;
  vec3 p = ro + rd * t, n = calcNormal(p);
  return applyFog(shadeCarpet(p, n, rd, t), t, rd) * 1.1;
}`,
});

defineScene({
  name: 'carpet3d',
  anchor: { word: 991, offset: -0.15 },
  anchorEnd: { word: 1046, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    this.F = M3D.create(api, FIELD, { aa: 2, steps: 130, stepScale: 0.8 });
    this.C = M3D.create(api, CARPET, { aa: 2, steps: 120, stepScale: 0.8 });
    const A = (i, o = 0) => api.at(i) + o;
    this.W = { shag: A(996), food: A(999), stuck: A(1005), filaments: A(1012), food2: A(1017), mucus: A(1021), dead: A(1023), cheek: A(1027), spit: A(1031), cant: A(1032), down: A(1038), wash: A(1041) };
    const W = this.W;
    this.cuts = [0, W.shag - 0.1, W.food - 0.1, W.stuck - 0.1, W.filaments - 0.1, W.food2 - 0.1, W.dead - 0.1, W.spit - 0.1, W.down - 0.1];
  },
  draw(ctx, t, api) {
    const { ease, clamp, lerp, P, prog, pop, env } = api, W = this.W;
    const S = M3D.shot(t, this.cuts, api.duration), u = S.u, k = S.k, io = ease.inOutSine(k), i = S.i;
    const Z0 = 5.0;                                                           // where we look on the tongue (long papillae)
    const F = { ...M3D.LIGHTS, uTime: t, uGrow: 1, uSway: 0.35, uCoat: 0.5, uSpeck: 1.3, uLongZ0: -10, uLongZ1: -9, uCoatZ0: 4.2, uCoatZ1: 7,
      uFall: 0, uClear: 0, uShadow: 1, uCut: -99, uMucus: 0, uCells: 0, uSpit: 0, uSpitY: 0.3, uSpitFront: -99, uHeroCrumb: [0, 0, 0, 0], uHeroA: [0, 0, 0, 0], uHeroB: [0, 0, 0, 0] };
    const HC = [0.07, 0.07, Z0 + 0.2], HA = [0.1, 0.18, Z0 + 0.4], HB = [0.12, 0.16, Z0 + 0.56];
    const CARP = { ...M3D.LIGHTS, uTime: t, uFogCol: [0.075, 0.045, 0.03], uFogK: 0.35, uKeyCol: [1.0, 0.84, 0.66] };
    let camF = null, camC = null, split = false, dofO = null;
    // debris is always there after it has fallen in (shot 2 drops it)
    F.uFall = i < 2 ? 0 : i === 2 ? Math.max(0.001, t - (W.food - 0.25)) : 0;
    if (i >= 5) F.uMucus = i === 5 ? ease.outCubic(clamp((t - W.mucus + 0.25) / 0.5)) : 1;
    if (i >= 6) F.uCells = i === 6 ? Math.max(0.001, t - (W.dead - 0.35)) : 9;
    if (i === 0) {                                     // the real shag carpet, low and slow
      camC = { ro: [lerp(-0.1, 0.05, io), lerp(0.52, 0.47, io), lerp(-0.45, -0.3, io)], ta: [0.3, 0.14, 0.7], fov: 2.1 };
      dofO = { blur: 6, stops: [[0, 1], [0.3, 1], [0.48, 0], [1, 0]] };
    } else if (i === 1) {                              // side by side: carpet | tongue
      split = true;
      camC = { ro: [0.05, 0.62, lerp(-0.5, -0.4, io)], ta: [0.1, 0.12, 0.6], fov: 1.9 };
      camF = { ro: [0.05, 0.58, Z0 - 1.1 + 0.1 * io], ta: [0.1, 0.12, Z0 + 0.1], fov: 1.9 };
    } else if (i === 2) {                              // food, gunk, particles fall in
      camF = { ro: [lerp(-0.1, 0.0, io), 0.62, Z0 - 0.9], ta: [0.3, 0.12, Z0 + 0.3], fov: 2.0 };
      dofO = { blur: 5, stops: [[0, 1], [0.22, 1], [0.38, 0], [1, 0]] };
    } else if (i === 3) {                              // cutaway: stuck in between
      F.uCut = 0;
      camF = { ro: [-0.62, lerp(0.19, 0.16, io), Z0 + lerp(-0.05, 0.08, io)], ta: [0.0, 0.1, Z0 + 0.1], fov: 2.1 };
    } else if (i === 4) {                              // macro on the filaments
      camF = { ro: [lerp(0.2, 0.14, io), 0.3, Z0 - 0.55], ta: [0.55, 0.1, Z0 + 0.1], fov: 2.25 }; F.uClear = 0.35;
      dofO = { blur: 7, stops: [[0, 1], [0.18, 1], [0.36, 0], [0.8, 0], [1, 0.8]] };
    } else if (i === 5) {                              // food, then mucus strung between them
      F.uCut = 0; F.uHeroCrumb = [...HC, 0.02]; F.uHeroA = [...HA, F.uMucus > 0.05 ? 1 : 0]; F.uHeroB = [...HB, 1];
      camF = { ro: [-0.36, lerp(0.2, 0.19, io), Z0 + 0.3], ta: [0.1, 0.14, Z0 + 0.34], fov: 2.2 };
    } else if (i === 6) {                              // dead cells drift down and settle
      camF = { ro: [lerp(-0.05, 0.02, io), 0.75, Z0 - 0.75], ta: [0.25, 0.2, Z0 + 0.25], fov: 2.1 };
      dofO = { blur: 5, stops: [[0, 1], [0.18, 1], [0.34, 0], [1, 0]] };
    } else {                                           // cutaway: spit flows over the tops, never down between them
      F.uCut = 0; F.uSpit = 1;
      F.uSpitFront = i === 7 ? Z0 - 0.9 + 2.2 * ease.inOutSine(clamp((t - W.spit + 0.1) / 1.4)) : 99;
      camF = i === 7 ? { ro: [-1.05, 0.22, Z0 + 0.05], ta: [0.0, 0.15, Z0 + 0.05], fov: 2.1 } : { ro: [-0.78, lerp(0.19, 0.17, io), Z0 + 0.25], ta: [0.0, 0.14, Z0 + 0.25], fov: 2.15 };
    }
    // render
    if (camC && !split) ctx.drawImage(M3D.timed(api, this.C, { ...CARP, ...M3D.camU(camC) }), 0, 0, api.W, api.H);
    if (camF && !split) ctx.drawImage(M3D.timed(api, this.F, { ...F, ...M3D.camU(camF) }), 0, 0, api.W, api.H);
    if (split) {
      const cvC = M3D.timed(api, this.C, { ...CARP, ...M3D.camU(camC) }), cvF = M3D.timed(api, this.F, { ...F, ...M3D.camU(camF) });
      const sw = cvC.width / 2, sh = cvC.height;
      ctx.drawImage(cvC, sw * 0.5, 0, sw, sh, 0, 0, 960, 1080);
      ctx.drawImage(cvF, sw * 0.5, 0, sw, sh, 960, 0, 960, 1080);
      ctx.fillStyle = 'rgba(11,10,24,0.95)'; ctx.fillRect(956, 0, 8, 1080); ctx.fillStyle = 'rgba(244,241,234,0.35)'; ctx.fillRect(959, 0, 2, 1080);
    }
    if (dofO) M3D.dof(ctx, api, dofO);

    // ---- words
    if (i === 0) api.text(ctx, 'SHAG CARPET', 960, 170, { size: 64, align: 'center', tracking: 3, color: '#ffe2b0', alpha: prog(t, W.shag - 0.5, 0.4), shadow: true });
    if (i === 1) {
      api.text(ctx, 'SHAG CARPET', 480, 170, { size: 60, align: 'center', tracking: 3, color: '#ffe2b0', shadow: true });
      api.text(ctx, 'YOUR TONGUE', 1440, 170, { size: 60, align: 'center', tracking: 3, color: '#ffc6d2', alpha: prog(t, S.u > 0 ? this.cuts[1] + 0.15 : 99, 0.35), shadow: true });
    }
    if (i === 3) api.doodle.text(ctx, 'stuck!', 1500, 930, prog(t, W.stuck + 0.05, 0.5), { color: P.lime, size: 76, rotate: -0.05, stroke: 'rgba(11,10,24,0.6)', strokeWidth: 10 });
    if (i === 5) {
      const qc = M3D.project(camF, HC), qm = M3D.project(camF, [(HA[0] + HB[0]) / 2, (HA[1] + HB[1]) / 2 - 0.05, (HA[2] + HB[2]) / 2]);
      const pf = pop(t, W.food2), pm = pop(t, W.mucus);
      if (pf > 0 && qc) { api.leader(ctx, qc[0], qc[1], 330, 205, prog(t, W.food2 - 0.05, 0.3), { color: P.lime, width: 4, dot: 9 }); api.label(ctx, 'FOOD', 330, 160, { p: pf, size: 56, align: 'center' }); }
      if (pm > 0 && qm) { api.leader(ctx, qm[0], qm[1], 1500, 205, prog(t, W.mucus - 0.05, 0.3), { color: '#eef0b8', width: 4, dot: 9 }); api.label(ctx, 'MUCUS', 1500, 160, { p: pm, size: 56, align: 'center', bg: '#eef0b8' }); }
    }
    if (i === 6) api.label(ctx, 'DEAD CELLS', 960, 150, { p: pop(t, W.dead), size: 60, align: 'center', bg: P.ink });
    if (i === 7) api.label(ctx, 'SPIT', 300, 160, { p: pop(t, W.spit), size: 56, align: 'center', bg: P.saliva });
    if (i === 8) {
      api.label(ctx, "SPIT CAN'T REACH", 960, 150, { p: pop(t, W.down), size: 60, align: 'center', bg: P.saliva });
      const ar = prog(t, W.down + 0.15, 0.5, ease.inOutCubic);
      api.doodle.arrow(ctx, 1500, 330, 1500, 700, ar, { color: P.saliva, width: 10, bend: 0, seed: 12, head: 36 });
      api.doodle.cross(ctx, 1500, 790, 48, prog(t, W.down + 0.6, 0.45), { color: P.marker, width: 12, seed: 14 });
    }
    M3D.tag(ctx, api);
    api.finish(ctx, t, { bloom: 0.34, grain: 0.05, vignette: 0.5 });
    M3D.benchText(ctx, api);
  },
});
