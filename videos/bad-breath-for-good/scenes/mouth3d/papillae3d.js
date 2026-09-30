// @use videos/bad-breath-for-good/scenes/mouth3d/_lib.js
/* papillae3d (w940-990, replaces tongue/papillae-fly). Real 3D, ray-marched on the GPU: from the whole tongue down to
 * the papillae, then a flight toward the back where they get long like a shag carpet, with food and gunk caught
 * between them and the first hint of coating. Finished from the lead's hero test (scenes/hero/papillae3d.js).
 * Words: "If you look at a tongue close up microscopically, it's not smooth at all. It's actually covered by these tiny
 * little bumps. And as you go further back, weirdly enough, they get longer and longer. It's almost like those old shag
 * carpets you've seen, you know, all the shag moving around."
 * Shots (cuts land just before their words): whole tongue | top-down descent "close up microscopically" | grazing
 * "not smooth" | macro "tiny little bumps" (PAPILLAE) | flight "further back ... longer" | crane down "almost like" |
 * low inside "shag carpets" | across the tops "all the shag moving around".
 */
const FIELD = M3D.frag({
  parts: ['base', 'field'],
  map: 'float map(vec3 p){ return fieldMap(p); }',
  post: ['fieldShade'],
  render: `
vec3 render(vec2 fc){
  vec3 ro; vec3 rd = camRay(fc, ro);
  float t = march(ro, rd, 9.0);
  vec3 bg = uFogCol * (1.0 - 0.35 * rd.y);
  if (t < 0.) return bg;
  vec3 p = ro + rd * t, n = calcNormal(p);
  return applyFog(shadeField(p, n, rd, t), t, rd) * 1.1;
}`,
});
const TONGUE = M3D.frag({
  parts: ['base', 'tongue'],
  map: 'float map(vec3 p){ return tongueMap(p); }',
  post: ['tongueShade'],
  render: `
vec3 render(vec2 fc){
  vec3 ro; vec3 rd = camRay(fc, ro);
  vec2 uv = (2. * fc - uRes) / uRes.y;
  vec3 bg = mix(vec3(0.030, 0.014, 0.030), vec3(0.075, 0.030, 0.060), exp(-dot(uv - vec2(0.1, 0.1), uv - vec2(0.1, 0.1)) * 0.8));
  float t = march(ro, rd, 5.0);
  if (t < 0.) return bg;
  vec3 p = ro + rd * t, n = calcNormal(p);
  return mix(shadeTongue(p, n, rd, t), bg, tongueFade(p));
}`,
});

defineScene({
  name: 'papillae3d',
  anchor: { word: 940, offset: -0.15 },
  anchorEnd: { word: 991, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    this.F = M3D.create(api, FIELD, { aa: 2, steps: 200, stepScale: 0.8 });
    this.T = M3D.create(api, TONGUE, { aa: 3, steps: 130, stepScale: 0.85 });
    const A = (i, o = 0) => api.at(i) + o;
    this.cuts = [0, A(946, -0.08), A(949, -0.1), A(956, -0.1), A(965, -0.1), A(975, -0.1), A(980, -0.06), A(986, -0.1)];
  },
  // the GL frame for scene time tt inside shot S (motion blur: several subframes of the same shot are averaged)
  frame(api, S, tt) {
    const { ease, clamp, lerp } = api, t = tt;
    const k = clamp((tt - this.cuts[S.i]) / Math.max(0.01, S.len)), io = ease.inOutSine(k);
    const base = { ...M3D.LIGHTS, uTime: t, uGrow: 1, uSway: 0.15, uCoat: 0.85, uSpeck: 1, uLongZ0: 1.2, uLongZ1: 5.5, uCoatZ0: 3.4, uCoatZ1: 6.5, uFall: 0, uClear: 0, uShadow: 0, uCut: -99, uMucus: 0, uCells: 0 };
    let cam, cv, dofO = null;
    if (S.i === 0) {                   // the whole tongue, three-quarter view, slow push in
      cam = { ro: M3D.V.lerp([0.55, 0.66, -1.15], [0.3, 0.46, -0.78], ease.inOutSine(k)), ta: M3D.V.lerp([0.0, 0.0, -0.18], [0.0, 0.03, -0.12], io), fov: 2.15 };
      cv = M3D.timed(api, this.T, { ...M3D.LIGHTS, uFogK: 0.02, uTime: t, ...M3D.camU(cam), uCoat: 0.3, uCoatCol: [0.84, 0.78, 0.60], uCoatFuzz: 0.2, uCoatSolid: 0, uStr: new Float32Array(20), uPile: 0, uScrR: 0, uScrP: [0, 0, 0], uScrA: [0, 0, 0], uDay: 0, uTongueY: 0.16, uTongueZ: -0.2, uJaw: 1, uScrBend: 0, uGag: 0, uLines: [-1, -1, -1, 0] });
    } else {
      let o = {};
      if (S.i === 1) {                 // top-down, descending into the surface ("close up, microscopically")
        const h = lerp(1.25, 0.34, ease.outCubic(k));
        cam = { ro: [0.1, h, 0.45], ta: [0.1 + 0.001, 0, 0.45 + 0.02], fov: 1.9, roll: 0.25 + 0.25 * io };
      } else if (S.i === 2) {          // grazing angle across the short front papillae ("not smooth at all")
        cam = { ro: [lerp(-0.25, -0.05, io), 0.065, lerp(0.55, 0.72, io)], ta: [1.0, 0.02, lerp(0.7, 0.8, io)], fov: 2.2 };
        dofO = { blur: 6, stops: [[0, 1], [0.36, 1], [0.5, 0], [0.9, 0], [1, 0.5]] };
      } else if (S.i === 3) {          // macro on a few bumps, one fungiform among them
        const a = lerp(-0.5, -0.2, io);
        cam = { ro: M3D.V.orbit([0.34, 0.02, 0.62], 0.34, a, 0.62), ta: [0.34, 0.02, 0.62], fov: 2.4 };
        dofO = { blur: 8, stops: [[0, 1], [0.22, 1], [0.42, 0], [0.8, 0], [1, 0.7]] };
      } else if (S.i === 4) {          // the flight toward the back: they get longer
        const z = lerp(0.3, 2.6, k * 0.85 + ease.inOutSine(k) * 0.15);        // steady, slower glide (was 0.25 -> 3.6, eased)
        cam = { ro: [0.05 + 0.05 * Math.sin(t * 0.4), lerp(0.24, 0.6, ease.inOutSine(k)), z], ta: [0.12, lerp(0.04, 0.16, k), z + 1.0], fov: 1.9, roll: 0.03 * Math.sin(t * 0.5) };
        dofO = { blur: 6, stops: [[0, 1], [0.3, 1], [0.46, 0], [0.72, 0], [1, 0.85]] };   // far and near bands soft
      } else if (S.i === 5) {          // crane down over the long papillae ("almost like those old...")
        cam = { ro: [lerp(0.6, 0.45, io), lerp(0.95, 0.62, io), 3.9], ta: [0.2, 0.1, 4.7], fov: 2.0 };
        o.uSway = lerp(0.2, 0.7, k); o.uShadow = 1;
        dofO = { blur: 6, stops: [[0, 1], [0.25, 1], [0.42, 0], [1, 0]] };
      } else if (S.i === 6) {          // low inside the shag: specks caught at the base, coating toward the back
        cam = { ro: [lerp(0.20, 0.3, io), 0.16, lerp(4.35, 4.5, io)], ta: [lerp(0.9, 1.0, io), 0.1, 5.4], fov: 2.1 };
        o.uSway = 0.9; o.uSwayF = 0.6; o.uClear = 0.36; o.uShadow = 1;
        dofO = { blur: 7, stops: [[0, 1], [0.24, 1], [0.4, 0], [0.82, 0], [1, 0.8]] };
      } else {                         // across the tops: the shag moving around
        cam = { ro: [lerp(-0.2, 0.05, io), 0.58, 3.6], ta: [0.6, 0.22, 4.9], fov: 2.2, roll: -0.04 };
        o.uSway = 1.6; o.uSwayF = 1.2; o.uShadow = 1;
        dofO = { blur: 6, stops: [[0, 1], [0.22, 1], [0.38, 0], [1, 0]] };
      }
      cv = M3D.timed(api, this.F, { ...base, ...o, ...M3D.camU(cam), uTight: 1 });
    }
    return { cv, dofO };
  },
  draw(ctx, t, api) {
    const { ease, clamp, lerp, P, prog, pop } = api;
    const S = M3D.shot(t, this.cuts, api.duration);
    // motion blur: subframes of the same shot averaged over most of a frame, so thin tips stop strobing under camera motion
    const N = api.params.subframes ?? 6, dt = (api.params.shutter ?? 1.0) / 30;   // 6 subframes over one frame, averaged
    let dofO = null;
    if (!this.acc) { this.acc = document.createElement('canvas'); }
    for (let s = 0; s < N; s++) {
      const tt = Math.max(this.cuts[S.i], Math.min(t + ((s + 0.5) / N - 0.5) * dt, (this.cuts[S.i + 1] ?? api.duration) - 1e-3));
      const f = this.frame(api, S, N > 1 ? tt : t); dofO = f.dofO;
      if (this.acc.width !== f.cv.width) { this.acc.width = f.cv.width; this.acc.height = f.cv.height; }
      const g = this.acc.getContext('2d'); g.globalAlpha = 1 / (s + 1); g.drawImage(f.cv, 0, 0); g.globalAlpha = 1;
    }
    ctx.drawImage(this.acc, 0, 0, api.W, api.H);
    if (dofO) M3D.dof(ctx, api, dofO);

    // labels on the words, sparingly
    if (S.i === 3) {
      api.label(ctx, 'PAPILLAE', 150, 170, { p: pop(t, api.at(959)), size: 50 });
      api.text(ctx, 'tiny bumps', 156, 262, { family: 'hand', size: 56, color: P.lime, alpha: prog(t, api.at(961), 0.4), stroke: 'rgba(0,0,0,0.55)', strokeWidth: 9 });
    }
    if (S.i === 4) {
      const tl = api.at(972);
      api.label(ctx, 'LONGER TOWARD THE BACK', 960, 170, { p: pop(t, tl), size: 50, align: 'center' });
      api.doodle.arrow(ctx, 1560, 930, 1700, 560, prog(t, tl + 0.15, 0.6, ease.inOutCubic), { color: P.lime, width: 11, bend: 40, seed: 4, head: 40 });
    }
    if (S.i === 6) api.doodle.text(ctx, '"shag carpet"', 1760, 960, prog(t, api.at(980), 0.7), { color: P.lime, size: 76, align: 'right', stroke: 'rgba(0,0,0,0.55)', strokeWidth: 10 });
    M3D.tag(ctx, api);
    api.finish(ctx, t, { bloom: 0.35, grain: 0.05, vignette: 0.5 });
    M3D.benchText(ctx, api);
  },
});
