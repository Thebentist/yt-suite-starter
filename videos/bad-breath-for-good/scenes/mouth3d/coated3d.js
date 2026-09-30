// @use videos/bad-breath-for-good/scenes/mouth3d/_lib.js
/* coated3d (w1221-1270, replaces tongue/coated-tongue). A whole 3D tongue in a lower-arch model (gums and teeth, no lips),
 * lit like a product render. The tongue comes out over the teeth, the coating appears and changes colour on its words:
 * white, yellow, black; then the name (coated tongue) and where the smell comes from.
 * Words: "And the fun fact is, you can see it. That's right. If you stick your tongue out and it's super white, yellow,
 * or you know, sometimes even black if it gets really crazy, that's what we call a coated tongue. And that's probably
 * where your bad breath is coming from."
 * Shots: hero orbit "you can see it" (a light sweep) | "stick your tongue out" (it slides out over the lower teeth) |
 * close, the coating turns white | other side, yellow | macro on the back, dark and furred "black ... really crazy" |
 * top view "coated tongue" | push to the back third "probably where" | close, faint smell wisps "bad breath is coming from".
 */
const FR = M3D.frag({
  parts: ['base', 'tongue'],
  uniforms: 'uniform float uGas; uniform float uSweep;',
  map: 'float map(vec3 p){ return tongueMap(p); }',
  post: ['tongueShade'],
  render: `
// faint smell wisps rising off the back third (noise slices along the ray; soft, never opaque)
vec4 gas(vec3 ro, vec3 rd, float tEnd){
  if (uGas <= 0.) return vec4(0.);
  vec4 acc = vec4(0.); float t1 = min(tEnd, 2.4);
  for (int i = 0; i < 32; i++) {
    float t = t1 * (float(i) + hash12(gl_FragCoord.xy * 0.37 + float(i))) / 32.;
    vec3 p = ro + rd * t;
    float zl = p.z - uTongueZ;
    float h = p.y - (tTop(p.x, zl) + tLift(zl));
    float m = smoothstep(0.0, 0.05, h) * smoothstep(0.5, 0.12, h) * smoothstep(-0.1, 0.12, zl) * smoothstep(0.55, 0.32, zl) * smoothstep(0.26, 0.08, abs(p.x));
    if (m <= 0.) continue;
    vec3 q = vec3(p.x * 6., p.y * 2.6 - uTime * 0.45, p.z * 6.);
    q.xz = rot2(p.y * 6. + uTime * 0.25) * q.xz;                        // curl as it rises
    float w = fbm3(q * 0.7, 2);
    float nn = fbm3(q + vec3(w * 2.4, 0., w * 1.4), 3);
    float band = pow(0.5 + 0.5 * sin(nn * 26.), 12.);                    // thin contour lines = wisps
    float mass = smoothstep(0.42, 0.64, fbm3(q * 0.45 + 3.1, 2));
    float d = band * mass * m * uGas;
    acc.rgb += (1. - acc.a) * vec3(0.62, 0.88, 0.24) * d * 0.5; acc.a += (1. - acc.a) * d * 0.14;
  }
  return acc; }
vec3 render(vec2 fc){
  vec3 ro; vec3 rd = camRay(fc, ro);
  vec2 uv = (2. * fc - uRes) / uRes.y;
  vec3 bg = mix(vec3(0.026, 0.011, 0.026), vec3(0.080, 0.030, 0.062), exp(-dot(uv - vec2(0.15, 0.25), uv - vec2(0.15, 0.25)) * 0.7));
  float t = march(ro, rd, 5.0);
  vec3 col = bg; float tEnd = 5.;
  if (t > 0.) {
    vec3 p = ro + rd * t, n = calcNormal(p);
    col = shadeTongue(p, n, rd, t);
    // a light sweep across the model on "you can see it"
    float sw = abs(p.x * 0.8 + p.z * 0.6 - mix(-1.0, 0.9, uSweep));
    col += sin(PI * uSweep) * vec3(1.0, 0.92, 0.88) * 0.22 * smoothstep(0.16, 0.0, sw) * sat(n.y);
    col = mix(col, bg, tongueFade(p));
    tEnd = t;
  }
  vec4 g = gas(ro, rd, tEnd);
  return col * (1. - g.a) + g.rgb;
}`,
});

defineScene({
  name: 'coated3d',
  anchor: { word: 1221, offset: -0.15 },
  anchorEnd: { word: 1270, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    this.R = M3D.create(api, FR, { aa: 3, steps: 130, stepScale: 0.85 });
    const A = (i, o = 0) => api.at(i) + o;
    this.cuts = [0, A(1232, -0.1), A(1240, -0.12), A(1242, -0.1), A(1246, -0.1), A(1254, -0.1), A(1261, -0.1), A(1266, -0.1)];
    this.W = { white: A(1241), yellow: A(1242), black: A(1248), coated: A(1259), probably: A(1263), see: A(1228), bad: A(1266), stick: A(1234) };
  },
  draw(ctx, t, api) {
    const { ease, clamp, lerp, P, prog, pop } = api, W = this.W;
    const S = M3D.shot(t, this.cuts, api.duration), u = S.u, k = S.k, io = ease.inOutSine(k);
    const WHITE = [0.86, 0.83, 0.74], YEL = [0.80, 0.64, 0.24], DARK = [0.07, 0.05, 0.035], TYP = [0.84, 0.78, 0.60];
    const OUT = { uTongueZ: -0.2, uTongueY: 0.16 };
    let cam, U = { uCoat: 0.22, uCoatCol: WHITE, uCoatFuzz: 0.15, uCoatSolid: 0, uTongueZ: 0, uTongueY: 0, uGas: 0, uSweep: 0, uDay: 0 };
    let dofO = null;
    if (S.i === 0) {                                   // hero orbit, tongue at rest in the arch
      cam = { ro: M3D.V.orbit([0, -0.02, -0.08], lerp(1.3, 1.16, io), lerp(-0.6, -0.34, io), lerp(0.62, 0.68, io)), ta: [0, -0.03, -0.06], fov: 2.1 };
      U.uSweep = clamp((t - W.see + 0.25) / 1.3);
    } else if (S.i === 1) {                            // "stick your tongue out": it slides out over the lower teeth
      const o = ease.inOutCubic(clamp((t - W.stick + 0.05) / 0.75));
      cam = { ro: M3D.V.orbit([0, 0.0, -0.2], lerp(1.2, 1.12, io), -0.28, 0.36), ta: [0, 0.0, -0.22], fov: 2.2 };
      U.uTongueZ = lerp(0, OUT.uTongueZ, o); U.uTongueY = lerp(0, OUT.uTongueY, o);
    } else if (S.i === 2) {                            // super white
      Object.assign(U, OUT);
      cam = { ro: M3D.V.orbit([0, 0.02, -0.12], lerp(0.78, 0.7, io), lerp(0.42, 0.36, io), 0.72), ta: [0, 0.0, -0.1], fov: 2.2 };
      U.uCoat = lerp(0.3, 1, ease.outCubic(clamp((t - W.white + 0.2) / 0.5)));
    } else if (S.i === 3) {                            // yellow (other side)
      Object.assign(U, OUT);
      cam = { ro: M3D.V.orbit([0.0, 0.02, -0.12], lerp(0.8, 0.74, io), lerp(-0.55, -0.48, io), 0.58), ta: [0.0, 0.0, -0.1], fov: 2.2 };
      U.uCoat = 1; U.uCoatCol = M3D.V.lerp(WHITE, YEL, ease.inOutSine(clamp((t - W.yellow + 0.1) / 0.35)));
    } else if (S.i === 4) {                            // black and furred, "really crazy" (macro on the back)
      Object.assign(U, OUT);
      const kb = ease.inOutSine(clamp((t - W.black + 0.2) / 0.45));
      cam = { ro: M3D.V.orbit([0, 0.02, 0.05], lerp(0.62, 0.56, io), lerp(-0.62, -0.54, io), 0.52), ta: [0, 0.0, 0.04], fov: 2.25 };
      U.uCoat = lerp(1, 1.1, kb); U.uCoatCol = M3D.V.lerp(YEL, DARK, kb); U.uCoatFuzz = lerp(0.2, 1.0, kb); U.uCoatSolid = kb;
      dofO = { blur: 7, stops: [[0, 1], [0.2, 1], [0.4, 0], [0.8, 0], [1, 0.9]] };
    } else if (S.i === 5) {                            // top view: "a coated tongue"
      Object.assign(U, OUT);
      cam = { ro: [lerp(-0.06, 0.04, io), 1.5, lerp(-0.42, -0.36, io)], ta: [0, 0, -0.14], fov: 2.1, roll: lerp(0.04, -0.02, io) };
      U.uCoat = 1; U.uCoatCol = TYP; U.uCoatFuzz = 0.25;
    } else if (S.i === 6) {                            // push toward the back third, the smell starts rising
      Object.assign(U, OUT);
      cam = { ro: M3D.V.lerp([0.5, 0.62, -0.95], [0.38, 0.48, -0.7], io), ta: [0, 0.04, -0.02], fov: 2.2 };
      U.uCoat = 1; U.uCoatCol = TYP; U.uCoatFuzz = 0.25; U.uGas = 0.8 * clamp((u + 0.2) / 1.2);
    } else {                                           // side view: wisps rising off the back against the dark
      Object.assign(U, OUT);
      cam = { ro: [lerp(-1.02, -0.94, io), 0.2, lerp(-0.16, -0.1, io)], ta: [0, 0.15, 0.02], fov: 2.2 };
      U.uCoat = 1; U.uCoatCol = TYP; U.uCoatFuzz = 0.25; U.uGas = 1;
    }
    const cv = M3D.timed(api, this.R, { ...M3D.LIGHTS, uFogK: 0.02, uTime: t, ...M3D.camU(cam), ...U, uJaw: 1,
      uStr: new Float32Array(20), uPile: 0, uScrR: 0, uScrP: [0, 0, 0], uScrA: [0, 0, 0] });
    ctx.drawImage(cv, 0, 0, api.W, api.H);
    if (dofO) M3D.dof(ctx, api, dofO);

    // ---- the three colours as a small legend (right), built up across the cuts
    if (S.i >= 2 && S.i <= 4) {
      const items = [['WHITE', '#ece6d6', W.white], ['YELLOW', '#dcc15a', W.yellow], ['BLACK', '#2a2019', W.black]];
      const active = t < W.yellow ? 0 : t < W.black ? 1 : 2;
      items.forEach(([name, col, tt], i) => {
        const pp = pop(t, tt, 0.45); if (pp <= 0) return;
        const x = 1440, y = 380 + i * 124, on = i === active;
        ctx.save(); ctx.translate(x, y); ctx.scale(pp, pp); ctx.globalAlpha = on ? 1 : 0.5;
        ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
        ctx.fillStyle = 'rgba(11,10,24,0.66)'; api.roundRect(ctx, 0, -46, 360, 92, 46); ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.lineWidth = 3; ctx.strokeStyle = on ? P.lime : 'rgba(244,241,234,0.25)'; api.roundRect(ctx, 0, -46, 360, 92, 46); ctx.stroke();
        const g = ctx.createRadialGradient(36, -12, 3, 46, 0, 30); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, col); g.addColorStop(1, col);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(46, 0, 28, 0, 6.2832); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
        api.text(ctx, name, 94, 19, { size: 54, color: P.ink, tracking: 2 });
        ctx.restore();
      });
    }
    if (S.i === 5) {                                   // name it, with a leader into the coated back
      const pc = pop(t, W.coated), q = M3D.project(cam, [0.06, 0.05, 0.12]);
      if (pc > 0 && q) { api.leader(ctx, q[0], q[1], 430, 330, prog(t, W.coated - 0.05, 0.3), { color: P.lime, width: 4, dot: 9 }); api.label(ctx, 'COATED TONGUE', 430, 290, { p: pc, size: 64, align: 'center' }); }
    }
    if (S.i >= 6) api.label(ctx, 'PROBABLY THE SOURCE', 960, 140, { p: pop(t, W.probably, 0.5), size: 58, align: 'center' });
    M3D.tag(ctx, api);
    api.finish(ctx, t, { bloom: 0.32, grain: 0.05, vignette: 0.5 });
    M3D.benchText(ctx, api);
  },
});
