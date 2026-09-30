/* Story group, phase 2: a shared WebGL "cinematic set" (ray-marched SDFs via pipeline/motion/gl.js).
 * Sculpted mannequin people (no cartoon faces: a smooth clay/porcelain sculpture look with subtle eyes and lips), lit with
 * a warm key, a cool lavender rim and optional practical lamps, output with alpha so 2D bokeh / haze layers sit behind and in
 * front. Loaded with   // @use videos/bad-breath-for-good/scenes/story/_gl.js
 *
 *   STORYGL.frag({ figs: 2, extra: GLSL, lamp: true, shadow: true })  -> FRAG string for api.gl.create
 *     extra GLSL may define   float mapExtra(vec3 p, out float mat)   (#define HAS_EXTRA)   materials >= 10
 *                              vec4 albedoExtra(float mat, vec3 p, vec3 n)  -> rgb albedo, a = specular strength
 *                              vec3 emissiveExtra(float mat, vec3 p)        (mat >= 20 are emissive)
 *   STORYGL.fig(i, o)  -> uniforms for figure i: { pos:[x,y,z], yaw, lean, head:[yaw,pitch,roll], armR, armL, mouth, hair,
 *                         legs, skin:[r,g,b], cloth, hairCol, scale }
 *   STORYGL.cam(o)     -> camera uniforms { ro, ta, roll, focal }
 *   STORYGL.project(camO, [x,y,z]) -> [sx, sy] in 1920x1080 design space (for 2D overlays pinned to 3D points)
 * Figure space: hip at the origin (seated), y up, facing +z; head centre at y ~ 2.75; one unit ~ one head height.
 */
(function () {
  const FIG = `
// ---------------------------------------------------------------- mannequin figure
float gSub;   // sub-material from the figure: 1 skin, 2 hair, 3 cloth, 4 eye, 5 teeth, 6 lips
vec3 basisLocal(vec3 q, vec3 c, vec3 f){ vec3 up = abs(f.y) > 0.95 ? vec3(1,0,0) : vec3(0,1,0); vec3 r = normalize(cross(up, f)); vec3 u = cross(f, r); vec3 d = q - c; return vec3(dot(d, r), dot(d, u), dot(d, f)); }
float sdHair(vec3 q, float style){
  float h = sdEllipsoid(q - vec3(0., 0.13, -0.05), vec3(0.395, 0.41, 0.45));
  float cut = -(q.y - 0.52 * q.z - 0.05) / 1.13;                 // hairline plane: forehead high, nape low
  float d = smax(h, cut, 0.03);
  d = smin(d, sdEllipsoid(q - vec3(0.06, 0.33, 0.12), vec3(0.3, 0.13, 0.27)), 0.08);          // volume on top / front
  if (style > 0.5 && style < 1.5) {                              // long / bob: falls to the shoulders at the back and sides
    float b = sdEllipsoid(q - vec3(0., -0.2, -0.14), vec3(0.43, 0.5, 0.36));
    b = smax(b, q.z - 0.12, 0.05);
    d = smin(d, b, 0.08);
  }
  if (style > 1.5 && style < 2.5) d = smin(d, sdSphere(q - vec3(0., 0.36, -0.34), 0.16), 0.06);   // bun
  if (style > 2.5) d = smax(d, -(q.y - 0.3), 0.02);                // style 3: very short (buzz): trimmed cap
  d += 0.012 * (noise3(vec3(q.x * 26., q.y * 9., q.z * 26.)) - 0.5);   // strands
  return d;
}
float sdHead(vec3 q, float mouth, float style){
  vec3 qa = vec3(abs(q.x), q.yz);
  float d = sdEllipsoid(q - vec3(0., 0.06, -0.03), vec3(0.365, 0.43, 0.43));                  // cranium
  d = smin(d, sdEllipsoid(q - vec3(0., -0.15, 0.07), vec3(0.285, 0.31, 0.31)), 0.12);          // face / jaw
  d = smin(d, sdSphere(q - vec3(0., -0.37, 0.19), 0.095), 0.1);                                // chin
  d = smin(d, sdEllipsoid(q - vec3(0., 0.11, 0.3), vec3(0.27, 0.06, 0.09)), 0.06);             // brow
  d = smin(d, sdEllipsoid(qa - vec3(0.19, -0.08, 0.25), vec3(0.1, 0.08, 0.1)), 0.08);          // cheeks
  d = smax(d, -sdEllipsoid(qa - vec3(0.135, 0.025, 0.375), vec3(0.075, 0.045, 0.06)), 0.04);   // eye sockets
  d = smin(d, sdRoundCone(q, vec3(0., 0.05, 0.38), vec3(0., -0.1, 0.475), 0.035, 0.05), 0.04);  // nose
  float lips = sdEllipsoid(q - vec3(0., -0.215, 0.36), vec3(0.1, 0.034, 0.05));
  d = smin(d, lips, 0.03);
  if (mouth > 0.01) d = smax(d, -sdEllipsoid(q - vec3(0., -0.215, 0.43), vec3(0.08, 0.008 + 0.03 * mouth, 0.08)), 0.012);
  d = smin(d, sdEllipsoid(qa - vec3(0.355, -0.01, -0.03), vec3(0.045, 0.105, 0.07)), 0.03);    // ears
  gSub = 1.;
  if (lips < d + 0.004 && q.z > 0.33) gSub = 6.;
  float eye = sdSphere(qa - vec3(0.135, 0.022, 0.282), 0.056);
  if (eye < d) { d = eye; gSub = 4.; }
  if (mouth > 0.01) { float te = sdEllipsoid(q - vec3(0., -0.2, 0.34), vec3(0.078, 0.028, 0.05)); if (te < d) { d = te; gSub = 5.; } }
  float hr = sdHair(q, style);
  if (hr < d) { d = hr; gSub = 2.; }
  return d;
}
float sdArm(vec3 q, float side, float pose, out float sub){
  vec3 sh = vec3(0.74 * side, 1.84, -0.03);
  vec3 hRest = vec3(0.4 * side, 0.98, 0.92);
  vec3 hFace = vec3(0.05 * side, 2.42, 0.55);
  vec3 h = mix(hRest, hFace, clamp(pose, 0., 1.));
  if (pose > 1.5) h = vec3(0.95 * side, 0.2, 0.2);                   // pose 2: arm hanging at the side (standing)
  if (pose > 2.5) h = vec3(0.3 * side, 0.42, 0.78);                   // pose 3: hands resting in the lap (seated)
  vec3 bend = normalize(vec3(side * 0.8, -0.7, -0.2 + 0.6 * clamp(pose, 0., 1.)));
  if (pose > 1.5) bend = normalize(vec3(side * 0.3, 0.0, -1.0));
  if (pose > 2.5) bend = normalize(vec3(side * 0.9, -0.3, -0.4));
  if (pose > 3.5) { float m = clamp(pose - 4., 0., 1.); h = mix(vec3(0.95 * side, 0.2, 0.2), hFace, m); bend = normalize(mix(vec3(side * 0.3, 0.0, -1.0), vec3(side * 0.8, -0.7, 0.4), m)); }   // pose 4..5: from hanging (standing) up to the face
  vec3 mid = (sh + h) * 0.5; float hl = length(h - sh) * 0.5, seg = 0.78;
  vec3 el = mid + bend * sqrt(max(0., seg * seg - hl * hl));
  float up = sdCapsule(q, sh, el, 0.155);
  float fo = sdCapsule(q, el, h, 0.115);
  float sleeve = smin(up, sdCapsule(q, el, mix(el, h, 0.5), 0.135), 0.04);
  vec3 f = normalize(h - el);
  vec3 hl3 = basisLocal(q, h + f * 0.13, f);
  float hand = sdEllipsoid(hl3, vec3(0.125, 0.055, 0.17));
  hand = smin(hand, sdEllipsoid(hl3 - vec3(0., 0.0, 0.12), vec3(0.11, 0.045, 0.12)), 0.04);
  float skin = smin(fo, hand, 0.05);
  sub = sleeve < skin ? 3. : 1.;
  return min(sleeve, skin);
}
// A: pos.xyz, yaw   B: lean, headYaw, headPitch, headRoll   C: armR, armL, mouth, hairStyle   D: legs, scale, -, -
float sdFigure(vec3 p, vec4 A, vec4 B, vec4 C, vec4 D){
  float S = D.y > 0. ? D.y : 1.;
  vec3 q = rotY(-A.w) * (p - A.xyz) / S;
  float lg = min(D.x, 1.); float bound = length((q - vec3(0., 1.3 - lg * 1.2, 0.2)) * vec3(1., 0.55 - 0.22 * lg, 1.)) - 1.9;
  if (bound > 0.35) { gSub = 0.; return (bound + 0.1) * S; }
  q = rotX(B.x) * q;                                                    // lean about the hip
  float sub = 3.;
  float d = sdEllipsoid(q - vec3(0., 1.28, 0.02), vec3(0.64, 0.72, 0.38));                        // chest
  d = smin(d, sdEllipsoid(q - vec3(0., 1.86, -0.04), vec3(0.86, 0.27, 0.36)), 0.18);            // shoulders
  d = smin(d, sdEllipsoid(q - vec3(0., 2.02, -0.07), vec3(0.42, 0.2, 0.26)), 0.14);             // trapezius
  d = smin(d, sdEllipsoid(q - vec3(0., 0.45, 0.), vec3(0.5, 0.58, 0.32)), 0.2);                 // waist
  if (D.x > 1.5) {                                                                                  // seated: thighs forward, shins down
    vec3 qa = vec3(abs(q.x), q.yz);
    d = smin(d, sdCapsule(qa, vec3(0.25, 0.02, 0.05), vec3(0.27, 0.06, 1.2), 0.22), 0.1);
    d = smin(d, sdCapsule(qa, vec3(0.27, 0.06, 1.22), vec3(0.28, -1.45, 1.3), 0.17), 0.05);
    d = smin(d, sdEllipsoid(qa - vec3(0.28, -1.56, 1.45), vec3(0.14, 0.09, 0.27)), 0.03);
  } else if (D.x > 0.5) {                                                                           // standing: legs
    vec3 qa = vec3(abs(q.x), q.yz);
    d = smin(d, sdEllipsoid(q - vec3(0., -0.05, -0.02), vec3(0.52, 0.4, 0.33)), 0.15);
    d = smin(d, sdCapsule(qa, vec3(0.24, -0.2, 0.), vec3(0.22, -2.5, 0.03), 0.19), 0.06);
    d = smin(d, sdEllipsoid(qa - vec3(0.22, -2.62, 0.14), vec3(0.14, 0.09, 0.27)), 0.03);
  }
  float neck = sdCapsule(q, vec3(0., 2.0, -0.02), vec3(0., 2.4, 0.04), 0.16);
  float sa, sb;
  float aR = sdArm(q, 1., C.x, sa), aL = sdArm(q, -1., C.y, sb);
  vec3 qh = q - vec3(0., 2.38, 0.05);
  qh = rotZ(-B.w) * rotX(B.z) * rotY(-B.y) * qh;
  qh -= vec3(0., 0.4, 0.02);
  float hd = sdHead(qh, C.z, C.w); float hsub = gSub;
  float skinN = smin(neck, hd, 0.06);
  gSub = 3.;
  if (skinN < d) { gSub = (hd <= neck + 0.001) ? hsub : 1.; }
  d = smin(d, skinN, 0.035);
  if (hd < d + 0.001 && hsub != 1.) gSub = hsub;
  if (aR < d) { d = aR; gSub = sa; }
  if (aL < d) { d = aL; gSub = sb; }
  return d * S;
}
`;
  const SHADE = `
vec3 figSkin(float id){ int i = int(id + 0.5) * 3; return vec3(uFS[i], uFS[i + 1], uFS[i + 2]); }
vec3 figCloth(float id){ int i = int(id + 0.5) * 3; return vec3(uFCl[i], uFCl[i + 1], uFCl[i + 2]); }
vec3 figHair(float id){ int i = int(id + 0.5) * 3; return vec3(uFH[i], uFH[i + 1], uFH[i + 2]); }
`;

  // Figures live in packed uniform arrays and are evaluated in ONE loop: the D3D shader compiler inlines map() at every call
  // site (march, normal, AO...), so unrolled per-figure code made a 5-figure shader take ~40 s to compile.
  function frag(o = {}) {
    const figU = 'uniform float uFA[24], uFB[24], uFC[24], uFD[24], uFS[18], uFCl[18], uFH[18]; uniform float uNF;';
    const mapFigs = `
    for (int i = 0; i < 6; i++) {
      if (float(i) >= uNF) break;
      if (uShow[i] < 0.5) continue;
      int k = i * 4;
      float dd = sdFigure(p, vec4(uFA[k], uFA[k + 1], uFA[k + 2], uFA[k + 3]), vec4(uFB[k], uFB[k + 1], uFB[k + 2], uFB[k + 3]), vec4(uFC[k], uFC[k + 1], uFC[k + 2], uFC[k + 3]), vec4(uFD[k], uFD[k + 1], uFD[k + 2], uFD[k + 3]));
      if (dd < d) { d = dd; gMat = gSub; gId = float(i); }
    }`;
    return `
#define HAS_ALPHA
uniform vec3 uRo, uTa; uniform float uRoll, uFocal;
uniform vec3 uKeyDir, uKeyCol, uRimDir, uRimCol, uFillCol, uLampPos, uLampCol, uLamp2Pos, uLamp2Col;
uniform float uShow[8];
uniform float uExtra, uExposure, uAO, uWrap, uRimExtra;
${figU}
${FIG}
${SHADE}
float gMat; float gId;
${o.extra || ''}
float map(vec3 p){
  float d = 1e5; gMat = 0.; gId = -1.;
  ${mapFigs}
  ${o.extra && /mapExtra/.test(o.extra) ? `if (uExtra > 0.5) { float m; float dd = mapExtra(p, m); if (dd < d) { d = dd; gMat = m; gId = 9.; } }` : ''}
  return d;
}
#include <raymarch>
vec3 lightFrom(vec3 p, vec3 n, vec3 rd, vec3 alb, float spec, float sss, vec3 L, vec3 C, float shadow){
  float ndl = dot(n, L);
  float w = 0.35 * sss * uWrap; float dif = clamp(ndl * (1. - w) + w, 0., 1.);            // wrapped for skin (uWrap 0 = hard silhouette light)
  vec3 h = normalize(L - rd);
  float sp = pow(clamp(dot(n, h), 0., 1.), 60.) * spec * fresnel(dot(n, -rd), 0.05) * 4.;
  vec3 sc = alb * dif + sp;
  sc += alb * sss * pow(clamp(-ndl * 0.5 + 0.5, 0., 1.), 3.) * vec3(1., 0.35, 0.3) * 0.35;   // light bleeding through
  return sc * C * shadow;
}
vec4 render4(vec2 fc){
  vec2 uv = (2. * fc - uRes) / uRes.y;
  mat3 cam = camMat(uRo, uTa, uRoll);
  vec3 rd = cam * normalize(vec3(uv, uFocal));
  float t = march(uRo, rd, 60.);
  if (t < 0.) return vec4(0.);
  vec3 p = uRo + rd * t;
  vec3 n = calcNormal(p);
  map(p);
  float mat = gMat, id = gId;
  vec3 alb = vec3(0.7); float spec = 0.3, sss = 0.;
  ${o.extra && /normalHook/.test(o.extra) ? 'if (id > 8.5) normalHook(mat, p, n);' : ''}
  if (id < 8.5) {
    if (mat < 1.5) { alb = figSkin(id); spec = 0.35; sss = 1.; }
    else if (mat < 2.5) { alb = figHair(id); spec = 0.9; }
    else if (mat < 3.5) { alb = figCloth(id); spec = 0.12; alb *= 0.9 + 0.2 * fbm3(p * 22., 2); }
    else if (mat < 4.5) { alb = figSkin(id) * 1.08; spec = 1.6; sss = 0.6; }
    else if (mat < 5.5) { alb = vec3(0.92, 0.9, 0.86); spec = 1.2; sss = 0.5; }
    else { alb = figSkin(id) * vec3(1.0, 0.82, 0.8); spec = 0.8; sss = 1.; }
  }
  ${o.extra && /albedoExtra/.test(o.extra) ? `else { vec4 ae = albedoExtra(mat, p, n); alb = ae.rgb; spec = ae.a; }` : ''}
  float ao = mix(1., calcAO(p, n), uAO);
  vec3 col = alb * uFillCol * (0.5 + 0.5 * n.y) * ao;                                     // soft fill / ambient
  float shK = ${o.shadow ? 'softShadow(p + n * 0.01, normalize(uKeyDir), 0.02, 6., 10.)' : '1.'};
  col += lightFrom(p, n, rd, alb, spec, sss, normalize(uKeyDir), uKeyCol, shK) * mix(0.6, 1., ao);
  // rim: strong cool edge light from behind
  float ndv = clamp(dot(n, -rd), 0., 1.);
  float rim = pow(1. - ndv, 3.) * clamp(dot(n, normalize(uRimDir)) * 0.8 + 0.2, 0., 1.);
  col += uRimCol * rim * (0.8 + spec * 0.5) * ao * (id < 8.5 ? 1. : (mat < 10.5 ? 0. : uRimExtra));   // mat 10 = floors / tables: no rim
  col += lightFrom(p, n, rd, alb, spec, sss, normalize(uRimDir), uRimCol * 0.3, 1.) * ao;
  ${o.lamp ? `{ vec3 lv = uLampPos - p; float ld = length(lv); vec3 L = lv / ld; float sh = ${o.lampShadow ? 'softShadow(p + n * 0.01, L, 0.02, ld, 12.)' : '1.'};
    col += lightFrom(p, n, rd, alb, spec, sss, L, uLampCol / (1. + 1.3 * ld * ld), sh) * mix(0.7, 1., ao); }
  { vec3 lv = uLamp2Pos - p; float ld = length(lv); col += lightFrom(p, n, rd, alb, spec, sss, lv / ld, uLamp2Col / (1. + 4. * ld * ld), 1.) * ao; }` : ''}
  ${o.extra && /emissiveExtra/.test(o.extra) ? `if (id > 8.5 && mat > 19.5) col += emissiveExtra(mat, p);` : ''}
  return vec4(col * uExposure, 1.);
}`;
  }

  const n3 = (v, d) => (Array.isArray(v) ? v : d);
  // figs([o0, o1, ...]) -> packed uniforms for up to 6 figures (see sdFigure for the fields)
  function figs(list) {
    const A = new Float32Array(24), B = new Float32Array(24), C = new Float32Array(24), D = new Float32Array(24), Sk = new Float32Array(18), Cl = new Float32Array(18), Hr = new Float32Array(18);
    list.forEach((o, i) => {
      const pos = n3(o.pos, [0, 0, 0]), h = n3(o.head, [0, 0, 0]), k = i * 4, j = i * 3;
      A.set([pos[0], pos[1], pos[2], o.yaw || 0], k); B.set([o.lean || 0, h[0], h[1], h[2]], k);
      C.set([o.armR || 0, o.armL || 0, o.mouth || 0, o.hair ?? 0], k); D.set([o.legs || 0, o.scale || 1, 0, 0], k);
      Sk.set(n3(o.skin, [0.72, 0.52, 0.42]), j); Cl.set(n3(o.cloth, [0.3, 0.2, 0.35]), j); Hr.set(n3(o.hairCol, [0.06, 0.045, 0.05]), j);
    });
    return { uFA: A, uFB: B, uFC: C, uFD: D, uFS: Sk, uFCl: Cl, uFH: Hr, uNF: list.length };
  }
  function cam(o) { return { uRo: o.ro, uTa: o.ta, uRoll: o.roll || 0, uFocal: o.focal || 2.0 }; }
  // JS twin of camMat + the ray in render4: world point -> design-space screen coordinates
  function project(o, P) {
    const ro = o.ro, ta = o.ta, cr = o.roll || 0, f = o.focal || 2.0;
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const cw = norm(sub(ta, ro)), cp = [Math.sin(cr), Math.cos(cr), 0], cu = norm(cross(cw, cp)), cv = cross(cu, cw);
    const d = sub(P, ro), x = dot(d, cu), y = dot(d, cv), z = dot(d, cw);
    const u = (x / z) * f, v = (y / z) * f;           // uv in [-aspect..aspect] x [-1..1], y up
    return [960 + u * 540, 540 - v * 540, z];
  }
  // standard light rigs
  const RIG = {
    cafe: { uKeyDir: [0.2, 0.5, 0.6], uKeyCol: [0.04, 0.03, 0.03], uRimDir: [-0.2, 0.45, -1], uRimCol: [0.95, 0.7, 1.7], uFillCol: [0.02, 0.018, 0.03] },
    studio: { uKeyDir: [0.5, 0.7, 0.6], uKeyCol: [1.0, 0.9, 0.8], uRimDir: [-0.6, 0.4, -1], uRimCol: [0.6, 0.55, 1.2], uFillCol: [0.1, 0.09, 0.13] },
  };
  function show(arr) { const a = new Array(8).fill(0); arr.forEach((v, i) => { a[i] = v; }); return a; }
  // café table set: round table, two cups, a candle in a glass (emissive flame). Figures sit at x = -/+1.3 facing each other.
  const CAFE = `
float mapExtra(vec3 p, out float mat){
  mat = 10.;
  if (length(p - vec3(0., 0.9, 0.)) > 2.4) return length(p - vec3(0., 0.9, 0.)) - 2.2;
  float d = sdCylinder(p - vec3(0., 0.8, 0.), 0.035, 1.5);
  d = min(d, sdCylinder(p - vec3(0., 0.4, 0.), 0.4, 0.07));
  vec3 c1 = p - vec3(-0.55, 0.94, 0.38), c2 = p - vec3(0.58, 0.94, -0.3);
  float cups = min(max(sdCylinder(c1, 0.11, 0.15), -sdCylinder(c1 - vec3(0., 0.05, 0.), 0.1, 0.13)), max(sdCylinder(c2, 0.11, 0.15), -sdCylinder(c2 - vec3(0., 0.05, 0.), 0.1, 0.13)));
  cups = min(cups, min(sdTorus((c1 - vec3(0.17, 0., 0.)).xzy, vec2(0.06, 0.018)), sdTorus((c2 - vec3(-0.17, 0., 0.)).xzy, vec2(0.06, 0.018))));
  if (cups < d) { d = cups; mat = 11.; }
  float coffee = min(sdCylinder(c1 - vec3(0., 0.04, 0.), 0.005, 0.13), sdCylinder(c2 - vec3(0., 0.04, 0.), 0.005, 0.13));
  if (coffee < d) { d = coffee; mat = 13.; }
  vec3 cg = p - vec3(0.02, 0.92, 0.28);
  float glass = max(sdCylinder(cg, 0.11, 0.1), -sdCylinder(cg - vec3(0., 0.03, 0.), 0.11, 0.088));
  if (glass < d) { d = glass; mat = 14.; }
  float wax = sdCylinder(cg + vec3(0., 0.03, 0.), 0.07, 0.075);
  if (wax < d) { d = wax; mat = 12.; }
  float fl = sdEllipsoid(p - vec3(0.02, 1.1, 0.28), vec3(0.022, 0.06, 0.022));
  if (fl < d) { d = fl; mat = 20.; }
  return d;
}
vec4 albedoExtra(float mat, vec3 p, vec3 n){
  if (mat < 10.5) return vec4(vec3(0.13, 0.065, 0.05) * (0.75 + 0.5 * fbm3(vec3(p.x * 2., p.z * 26., 0.), 3)), 1.4);
  if (mat < 11.5) return vec4(0.86, 0.83, 0.8, 1.0);
  if (mat < 12.5) return vec4(0.95, 0.85, 0.7, 0.3);
  if (mat < 13.5) return vec4(0.12, 0.05, 0.02, 2.0);
  return vec4(0.35, 0.3, 0.3, 2.5);
}
vec3 emissiveExtra(float mat, vec3 p){ return vec3(5., 2.6, 0.9); }
`;
  // a wet, papillae-textured tongue (tip toward +z, back toward -z, top surface near y = 0.07) with an optional coating on
  // the back third (uCoat 0..1, uCoatCol). mat 30 = tongue. Optional teeth arc: see TEETH.
  const TONGUE_FN = `
uniform float uCoat; uniform vec3 uCoatCol; uniform vec4 uTongue;   // uTongue: x = scale, yzw = offset
float sdTongueL(vec3 p){
  float d = sdEllipsoid(p - vec3(0., -0.2, 0.08), vec3(0.74, 0.3, 1.08));
  d = smin(d, sdEllipsoid(p - vec3(0., -0.22, -0.5), vec3(0.86, 0.32, 0.8)), 0.3);
  d = smax(d, p.y - 0.075 + 0.035 * p.x * p.x, 0.12);                  // a soft flat-ish top
  float g = sdCapsule(p, vec3(0., 0.09, -0.95), vec3(0., 0.09, 0.8), 0.045);
  d = smax(d, -g, 0.07);                                                 // midline groove
  return d;
}
float sdTongue(vec3 p){ float s = uTongue.x > 0. ? uTongue.x : 1.; return sdTongueL((p - uTongue.yzw) / s) * s; }
vec3 tongueShade(vec3 p, inout vec3 n, out float spec){
  float s = uTongue.x > 0. ? uTongue.x : 1.; vec3 q = (p - uTongue.yzw) / s;
  // papillae: small bumps in the normal, denser and taller toward the back
  float back = smoothstep(0.5, -0.8, q.z);
  vec3 bp = q * (58. + 20. * back);
  float b1 = noise3(bp), b2 = noise3(bp + vec3(3.1, 7.7, 1.3));
  n = normalize(n + (0.18 + 0.3 * back) * vec3(b1 - 0.5, 0., b2 - 0.5));
  float dots = smoothstep(0.62, 0.8, noise3(q * vec3(34., 34., 34.) + 5.));
  vec3 base = mix(vec3(0.45, 0.04, 0.1), vec3(0.85, 0.2, 0.3), 0.3 + 0.55 * b1);
  base = mix(base, vec3(0.8, 0.08, 0.18), dots * (1. - back) * 0.7);                     // fungiform dots, redder, toward the tip
  float groove = smoothstep(0.12, 0.0, abs(q.x)) * smoothstep(-0.9, -0.2, q.z) * smoothstep(0.85, 0.3, q.z);
  base *= 1. - 0.35 * groove;
  float coat = uCoat * smoothstep(-0.12, -0.72, q.z) * (0.65 + 0.35 * fbm3(q * 9., 3)) * (1. - 0.6 * groove);
  base = mix(base, uCoatCol * (0.85 + 0.3 * b2), clamp(coat, 0., 1.));
  spec = mix(3.2, 0.8, clamp(coat, 0., 1.));
  return base;
}`;
  // a row of stylised teeth on a gum (front view, facing +z): uTeeth x = count visible, y = gap, z = scale, w = y offset
  const TEETH_FN = `
uniform vec4 uTeeth; uniform vec3 uTeethPos;
float sdTooth(vec3 p, float w, float h){
  float body = sdEllipsoid(p - vec3(0., h * 0.52, 0.), vec3(w * 0.5, h * 0.62, w * 0.34));
  float box = sdRoundBox(p - vec3(0., h * 0.45, 0.), vec3(w * 0.44, h * 0.48, w * 0.28), w * 0.2);
  float d = smin(body, box, 0.08);
  d = smax(d, p.y - h, 0.1);                                                  // flat-ish biting edge
  d = smax(d, -(p.y + 0.3), 0.05);
  return d;
}
float sdTeeth(vec3 p, out float isGum){
  vec3 q = (p - uTeethPos) / uTeeth.z;
  float d = 1e5;
  for (int i = -3; i <= 3; i++) {
    float fi = float(i), w = 0.86 - abs(fi) * 0.02;
    vec3 c = vec3(fi * (0.95 + uTeeth.y), 0., -0.05 * fi * fi);
    vec3 lq = q - c; lq.xz = rot2(fi * 0.1) * lq.xz;
    d = min(d, sdTooth(lq, w, 1.25 - abs(fi) * 0.05));
  }
  float line = 0.2 - 0.1 * cos(6.2832 * q.x / (0.95 + uTeeth.y));             // gum line: low over each tooth, papillae between
  float gum = sdRoundBox(q - vec3(0., -0.35, -0.12), vec3(3.8, 0.5, 0.5), 0.25);
  gum = smax(gum, q.y - line, 0.06);
  isGum = gum < d ? 1. : 0.;
  d = min(d, gum);
  if (uTeeth.w > 0.5) {                                                        // lower lip in front, below the teeth
    float lip = sdCapsule(q, vec3(-4.2, -0.75 + 0., 0.75), vec3(4.2, -0.75, 0.75), 0.42);
    lip = smin(lip, sdEllipsoid(q - vec3(0., -0.8, 0.6), vec3(4.6, 0.45, 0.5)), 0.2);
    if (lip < d) { d = lip; isGum = 2.; }
  }
  return d * uTeeth.z;
}`;
  // looking into an open mouth toward the throat: a wet cavity, palate, uvula, the two tonsils (with a couple of white specks, the tonsil
  // stones) and the tongue at the bottom. mat 70 cavity, 71 uvula, 72 tonsil, 73 stone; uses TONGUE_FN for the tongue (mat 30).
  const THROAT_FN = `
uniform float uStones;
float sdThroat(vec3 p, out float m){
  float cav = -sdEllipsoid(p - vec3(0., 0.1, -1.7), vec3(1.35, 0.95, 2.3));
  cav = max(cav, -sdCapsule(p, vec3(0., -0.05, -3.3), vec3(0., -0.4, -7.), 0.5));
  m = 70.; float d = cav;
  float uv = sdRoundCone(p, vec3(0., 0.95, -2.75), vec3(0., 0.42, -2.9), 0.15, 0.1);
  float d0 = d; d = smin(d, uv, 0.14); if (uv < d0) m = 71.;
  vec3 pa = vec3(abs(p.x), p.yz);
  float to = sdEllipsoid(pa - vec3(1.08, 0.02, -2.75), vec3(0.3, 0.42, 0.34));
  d0 = d; d = smin(d, to, 0.22); if (to < d0 - 0.02) m = 72.;
  if (uStones > 0.) { float st = min(sdSphere(p - vec3(-0.78, 0.18, -2.62), 0.06), sdSphere(p - vec3(0.8, -0.05, -2.7), 0.05)); if (st < d) { d = st; m = 73.; } }
  return d;
}
vec4 throatAlbedo(float m, vec3 p){
  float n = noise3(p * 14.);
  if (m < 70.5) return vec4(mix(vec3(0.55, 0.12, 0.2), vec3(0.78, 0.3, 0.38), n) * (0.6 + 0.4 * smoothstep(-4., -1., p.z)), 3.);
  if (m < 71.5) return vec4(vec3(0.82, 0.3, 0.4), 3.);
  if (m < 72.5) { float pit = smoothstep(0.62, 0.8, noise3(p * 30.)); return vec4(mix(vec3(0.82, 0.3, 0.38), vec3(0.55, 0.14, 0.22), pit * 0.7), 2.5); }
  return vec4(0.96, 0.94, 0.86, 1.);
}`;
  window.STORYGL = { frag, figs, cam, project, RIG, show, FIG, CAFE, TONGUE_FN, TEETH_FN, THROAT_FN };
})();
