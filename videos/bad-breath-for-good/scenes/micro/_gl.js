/* 3D (GPU, ray-marched) layer for the micro group. Load after _lib.js:
 *   // @use videos/bad-breath-for-good/scenes/micro/_lib.js
 *   // @use videos/bad-breath-for-good/scenes/micro/_gl.js
 * Defines MICRO.G:
 *   G.bgFrag       the crevice world (filiform papillae around a clearing, wet tissue floor, fog, optional rinse slab
 *                  and cleaning sweep); draw it first, blurred for depth of field.
 *   G.fgFrag(o)    the subjects (bacteria, dead cells, mucus, crumbs, sugar crystals, protein beads) as a TRANSPARENT
 *                  layer with a floor shadow catcher; draw it sharp on top (a second instance can be blurred as a far
 *                  layer). Objects come in through uniform float arrays packed by G.pack().
 *   G.cam(ro, ta, fl, roll)   camera shared by both shaders + project(p) -> design-space {x, y, z, s} for 2D overlays.
 *   G.create(api, frag, o)    api.gl.create with res chosen so the GL canvas is 1920x1080 at any render scale.
 * World units: floor y = 0 (tongue surface), papillae ~1.5-2.8 tall on a 0.8 grid, clearing of radius uGap around uGapC,
 * bacteria ~0.25-0.35 long. Light comes from above (+y), a cool rim from behind (+z), fog is dark plum.
 */
(function () {
  const M = window.MICRO; if (!M) throw new Error('_gl.js needs _lib.js first');
  const G = M.G = {};
  const MAXB = 24, MAXC = 12, MAXP = 18;
  G.MAX = { B: MAXB, C: MAXC, P: MAXP };
  G.KIND = { rod: 0, rod2: 1, cocc: 2, good: 3, pg: 4, neutral: 5 };
  G.SIZE = { rod: [0.12, 0.068], rod2: [0.11, 0.062], cocc: [0.015, 0.082], good: [0.05, 0.075], pg: [0.045, 0.088], neutral: [0.016, 0.066] };

  const CAM = `
uniform vec3 uRo; uniform vec3 uTa; uniform float uFl; uniform float uRoll;
vec3 camRay(vec2 fc){ vec2 uv = (2. * fc - uRes) / uRes.y; mat3 c = camMat(uRo, uTa, uRoll); return c * normalize(vec3(uv, uFl)); }
`;

  // ------------------------------------------------------------------------------------------------ background
  G.bgFrag = `${CAM}
uniform vec2 uGapC; uniform float uGap; uniform float uSway; uniform float uFogK; uniform float uBright;
uniform vec4 uFluid;   // x surface height, y thickness, z front x (fluid where x < front), w amount
uniform vec4 uSweep;   // x front x, y width, z amount, w height of the glow
uniform vec4 uTint;    // rgb multiplier for the tissue (1,1,1 = default), a = extra haze
const float CELL = 0.8;
float gTip; float gFloor;
float papField(vec3 p, out float tip){
  vec2 cell = floor(p.xz / CELL);
  float d = 1e5; tip = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = cell + vec2(float(i), float(j));
    vec2 base = (id + 0.5) * CELL + (hash22(id) - 0.5) * CELL * 0.5;
    if (length(base - uGapC) < uGap || length(base - uRo.xz) < 0.55) continue;
    float r = hash12(id * 1.37);
    float h = 1.5 + 1.3 * r;
    float ph = hash12(id + 7.1) * 6.283;
    vec2 bend = vec2(sin(uTime * 0.9 + ph), cos(uTime * 0.7 + ph * 1.7)) * uSway * 0.05 * h + vec2(0.16 * (r - 0.5), 0.1 * (hash12(id + 2.2) - 0.5)) * h;
    vec3 pa = vec3(base.x, -0.12, base.y), pb = vec3(base.x + bend.x, h, base.y + bend.y);
    float dd = sdRoundCone(p, pa, pb, CELL * 0.29, CELL * (0.06 + 0.03 * hash12(id + 3.3)));
    if (dd < d) { d = dd; tip = clamp(p.y / h, 0., 1.); }
  }
  return d;
}
float floorH(vec2 xz){ return 0.06 * fbm3(vec3(xz * 2.2, 1.7), 3) - 0.03; }
float map(vec3 p){
  float tip; float pf = papField(p, tip);
  float fl = p.y - floorH(p.xz);
  gFloor = fl < pf ? 1. : 0.; gTip = tip;
  return smin(fl, pf, 0.12);
}
#include <raymarch>
vec3 render(vec2 fc){
  vec3 ro = uRo, rd = camRay(fc);
  vec3 fogCol = vec3(0.05, 0.028, 0.065) * uBright;
  float TMAX = 16.;
  float t = march(ro, rd, TMAX);
  float tHit = t < 0. ? TMAX : t;
  vec3 col;
  if (t < 0.) { col = mix(fogCol, vec3(0.2, 0.1, 0.17) * uBright, smoothstep(-0.1, 0.9, rd.y)); }
  else {
    vec3 p = ro + rd * t, n = calcNormal(p); map(p);
    float tip = gFloor > 0.5 ? 0. : gTip;
    vec3 deep = vec3(0.30, 0.05, 0.12), mid = vec3(0.80, 0.25, 0.36), top = vec3(0.98, 0.80, 0.82);
    vec3 base = mix(deep, mid, smoothstep(0., 0.5, tip)); base = mix(base, top, smoothstep(0.55, 1., tip));
    base = mix(base, vec3(0.40, 0.08, 0.16), gFloor);
    float tex = fbm3(p * vec3(13., 4., 13.), 3);
    base *= (0.8 + 0.4 * tex) * uTint.rgb;
    vec3 L = normalize(vec3(-0.35, 1., -0.45)), R = normalize(vec3(0.45, 0.35, 1.));
    float dif = clamp(dot(n, L) * 0.5 + 0.5, 0., 1.); dif *= dif;
    float ao = calcAO(p, n);
    float lightDepth = 0.12 + 0.88 * pow(smoothstep(0.0, 2.6, p.y), 1.3); // the light falls off down in the gaps
    vec3 H = normalize(L - rd);
    float spec = pow(clamp(dot(n, H), 0., 1.), 80.) * fresnel(dot(n, -rd), 0.04) * 6.;
    float rim = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.);
    float sss = pow(clamp(dot(rd, -R) * 0.5 + 0.5, 0., 1.), 3.) * (0.25 + 0.75 * tip);
    col = base * (0.07 + 1.2 * dif * lightDepth * vec3(1., 0.9, 0.86)) * ao;
    col += base * sss * vec3(1., 0.42, 0.42) * 0.85 * lightDepth;
    col += spec * vec3(1., 0.95, 0.92) * (0.3 + 0.7 * lightDepth);
    col += rim * vec3(0.55, 0.45, 1.) * 0.28 * ao;
    if (uSweep.z > 0.) {
      float g = exp(-pow((p.x - uSweep.x) / uSweep.y, 2.)) * (1. - smoothstep(0., uSweep.w, p.y));
      float behind = smoothstep(uSweep.x, uSweep.x - 0.6, p.x) * (1. - smoothstep(0., 0.6, p.y));
      col += vec3(0.55, 0.95, 1.) * g * uSweep.z * 1.6 + vec3(0.2, 0.35, 0.4) * behind * 0.25 * uSweep.z;
    }
    col *= uBright;
    col = mix(col, fogCol, 1. - exp(-uFogK * t * t));
  }
  if (uFluid.w > 0.001 && abs(rd.y) > 1e-4) {
    float yTop = uFluid.x, yBot = uFluid.x - uFluid.y;
    float ta = (yTop - ro.y) / rd.y, tb = (yBot - ro.y) / rd.y;
    float t0 = max(min(ta, tb), 0.), t1 = min(max(ta, tb), tHit);
    if (t1 > t0) {
      vec3 pm = ro + rd * (0.5 * (t0 + t1));
      float inside = smoothstep(uFluid.z + 0.25, uFluid.z - 0.25, pm.x) * uFluid.w;
      float len = t1 - t0;
      vec3 caus = vec3(0.5, 0.85, 1.) * pow(noise3(vec3(pm.xz * 5., uTime * 0.8)), 3.) * 0.6;
      col = mix(col, col * vec3(0.42, 0.72, 1.0) + vec3(0.02, 0.1, 0.18) + caus * 0.35, (1. - exp(-1.1 * len)) * 0.85 * inside);
    }
    if (ta > 0. && ta < tHit) {
      vec3 ps = ro + rd * ta;
      float rip = fbm3(vec3(ps.xz * 2.5, uTime * 0.7), 3);
      float fr = fresnel(abs(rd.y), 0.02);
      float edge = smoothstep(uFluid.z + 0.2, uFluid.z - 0.2, ps.x) * uFluid.w;
      col += vec3(0.55, 0.85, 1.) * (0.08 + 0.9 * fr) * (0.3 + 1.1 * rip * rip) * 0.32 * edge * step(ro.y, yTop + 5.) * step(yTop, ro.y);
      col += vec3(0.9, 1., 1.) * exp(-pow((ps.x - uFluid.z) / 0.12, 2.)) * 0.7 * uFluid.w;   // foamy front line
    }
  }
  col = mix(col, vec3(0.16, 0.1, 0.2), uTint.a);
  return col;
}`;

  // ------------------------------------------------------------------------------------------------ subjects
  G.fgFrag = function (o = {}) {
    return `${CAM}
#define HAS_ALPHA
#define MAXB ${MAXB}
#define MAXC ${MAXC}
#define MAXP ${MAXP}
uniform float uB[${MAXB * 8}]; uniform float uK[${MAXB * 4}]; uniform float uNB;
uniform float uC[${MAXC * 8}]; uniform float uNC;
uniform float uP[${MAXP * 4}]; uniform float uPK[${MAXP}]; uniform float uNP;
uniform float uFloorY; uniform float uShadow; uniform vec3 uBox0; uniform vec3 uBox1; uniform float uBright;
int gType; int gIdx; vec3 gLoc;
vec3 bugAxis(int o){ float yaw = uB[o + 3], pit = uB[o + 4]; return vec3(cos(pit) * cos(yaw), sin(pit), cos(pit) * sin(yaw)); }
float sdBug(vec3 p, int i, out vec3 lp){
  int o = i * 8;
  vec3 c = vec3(uB[o], uB[o + 1], uB[o + 2]); float hl = uB[o + 5], r = uB[o + 6], wig = uB[o + 7];
  vec3 a = bugAxis(o);
  vec3 q = p - c;
  float s = dot(q, a);
  vec3 side = normalize(cross(a, vec3(0.001, 1., 0.)));
  vec3 up = cross(side, a);
  float u = clamp(s / max(hl + r, 1e-3), -1., 1.);
  q -= side * wig * r * sin(u * 2.2 + uK[i * 4 + 3] * 6.283 + uTime * 5.);
  float sc = clamp(s, -hl, hl);
  lp = vec3(s / max(hl + r, 1e-3), dot(q, side) / r, dot(q, up) / r);
  float d = length(q - a * sc) - r * (1. - 0.12 * u * u);
  return d;
}
float sdCell(vec3 p, int i){
  int o = i * 8; vec3 c = vec3(uC[o], uC[o + 1], uC[o + 2]); float yaw = uC[o + 3]; vec3 sz = vec3(uC[o + 4], uC[o + 5], uC[o + 6]); float k = uC[o + 7];
  vec3 q = rotY(yaw) * (p - c);
  if (k > 2.5 && k < 3.5) return sdRoundBox(rotX(yaw * 1.3) * q, sz, min(sz.x, sz.y) * 0.18);               // sugar crystal
  if (k > 4.5) { vec3 m = rotY(yaw) * (rotX(sz.z) * (p - c)); float rr = sz.y * 0.8; return sdCylinder(m, sz.y - rr, sz.x - rr) - rr; }   // mint
  if (k > 3.5) return sdRoundBox(q, sz, min(sz.x, sz.y) * 0.35);                                              // crumb
  return sdEllipsoid(q, sz);
}
float map(vec3 p){
  float d = 1e5; gType = 0; gIdx = 0;
  for (int i = 0; i < MAXB; i++) {
    if (float(i) >= uNB) break;
    vec3 lp; float dd = sdBug(p, i, lp);
    if (uK[i * 4] > 3.5 && uK[i * 4] < 4.5 && dd < 0.05) dd += 0.0075 * (noise3(p * 38.) - 0.5);           // P. gingivalis: bumpy
    if (dd < d) { d = dd; gType = 1; gIdx = i; gLoc = lp; }
  }
  for (int i = 0; i < MAXC; i++) {
    if (float(i) >= uNC) break;
    float dd = sdCell(p, i);
    if (dd < 0.04 && uC[i * 8 + 7] < 1.5) dd += 0.02 * (noise3(p * 14. + float(i)) - 0.5);                // irregular cell edges
    if (dd < d) { d = dd; gType = 2; gIdx = i; }
  }
  for (int i = 0; i < MAXP; i++) {
    if (float(i) >= uNP) break;
    vec3 c = vec3(uP[i * 4], uP[i * 4 + 1], uP[i * 4 + 2]); float r = uP[i * 4 + 3];
    if (r <= 0.) continue;
    float dd = length(p - c) - r;
    if (dd < d) { d = dd; gType = 3; gIdx = i; }
    if (i + 1 < MAXP && float(i + 1) < uNP && uP[i * 4 + 7] > 0.) {
      vec3 c2 = vec3(uP[i * 4 + 4], uP[i * 4 + 5], uP[i * 4 + 6]);
      float ds = sdCapsule(p, c, c2, min(r, uP[i * 4 + 7]) * 0.3);
      if (ds < d) { d = ds; gType = 4; gIdx = i; }
    }
  }
  return d;
}
#include <raymarch>
vec3 kindCol(float k){
  if (k < 0.5) return vec3(0.16, 0.66, 0.40);
  if (k < 1.5) return vec3(0.50, 0.74, 0.16);
  if (k < 2.5) return vec3(0.14, 0.58, 0.44);
  if (k < 3.5) return vec3(0.12, 0.60, 0.68);
  if (k < 4.5) return vec3(0.40, 0.10, 0.52);
  return vec3(0.96, 0.86, 0.62);
}
vec2 boxHit(vec3 ro, vec3 rd){ vec3 inv = 1. / rd, t0 = (uBox0 - ro) * inv, t1 = (uBox1 - ro) * inv; vec3 tmin = min(t0, t1), tmax = max(t0, t1);
  return vec2(max(max(tmin.x, tmin.y), tmin.z), min(min(tmax.x, tmax.y), tmax.z)); }
vec4 render4(vec2 fc){
  vec3 ro = uRo, rd = camRay(fc);
  float tFloor = (rd.y < -1e-4 && uShadow > 0.) ? (uFloorY - ro.y) / rd.y : 1e5;
  vec2 bh = boxHit(ro, rd);
  float t = -1.;
  if (bh.y > max(bh.x, 0.)) {
    float tmax = min(bh.y, tFloor) + 0.02;
    float tt = max(bh.x, 0.);
    for (int k = 0; k < RM_STEPS; k++) { vec3 p = ro + rd * tt; float d = map(p); if (abs(d) < RM_EPS * tt + 0.0004) { t = tt; break; } tt += d * RM_STEP; if (tt > tmax) break; }
  }
  vec3 L = normalize(vec3(-0.35, 1., -0.45)), R = normalize(vec3(0.45, 0.35, 1.));
  if (t < 0.) {
    if (tFloor < 1e4 && uShadow > 0.) {
      vec3 p = ro + rd * tFloor;
      if (p.x > uBox0.x - 0.4 && p.x < uBox1.x + 0.4 && p.z > uBox0.z - 0.4 && p.z < uBox1.z + 0.4) {
        float sh = softShadow(p + vec3(0., 0.004, 0.), L, 0.01, 2.5, 5.);
        float ao = calcAO(p, vec3(0., 1., 0.));
        float a = clamp((1. - sh) * 0.32 + (1. - ao) * 0.55, 0., 0.6) * uShadow;
        return vec4(0., 0., 0., a);
      }
    }
    return vec4(0.);
  }
  vec3 p = ro + rd * t, n = calcNormal(p); map(p);
  int type = gType, idx = gIdx; vec3 lp = gLoc;
  float nv = clamp(dot(n, -rd), 0., 1.);
  float dif = clamp(dot(n, L) * 0.5 + 0.5, 0., 1.);
  float ao = calcAO(p, n);
  vec3 H = normalize(L - rd);
  float spec = pow(clamp(dot(n, H), 0., 1.), 110.) * fresnel(nv, 0.05) * 9.;
  float rim = pow(1. - nv, 2.6);
  float sss = pow(clamp(dot(rd, -R) * 0.5 + 0.5, 0., 1.), 2.);
  float heightLight = 0.55 + 0.45 * smoothstep(0., 1.4, p.y);
  vec3 col; float alpha = 1.;
  if (type == 1) {
    float k = uK[idx * 4], dim = uK[idx * 4 + 1], glow = uK[idx * 4 + 2];
    vec3 base = kindCol(k);
    float inner = fbm3(lp * vec3(2.6, 3.4, 3.4) + uK[idx * 4 + 3] * 13., 3);
    base *= 0.86 + 0.28 * smoothstep(0.3, 0.8, inner);                                     // soft nucleoid mottling
    float core = smoothstep(0.9, 0.2, length(lp.yz));                                       // denser core, clear edges
    col = base * (0.05 + 0.95 * dif * dif * heightLight) * ao * (0.75 + 0.35 * core);
    col += base * 1.35 * sss * pow(1. - nv, 1.4) * (0.6 + 0.4 * heightLight);              // light through the thin edges
    col += base * base * 0.55 * pow(1. - nv, 2.) ;                                          // subsurface bleed
    col += spec * vec3(1., 0.97, 0.94);
    col += rim * vec3(0.62, 0.56, 1.) * 0.22;
    col += glow * vec3(0.84, 0.95, 0.29) * (0.2 + 1.3 * rim);
    float g = dot(col, vec3(0.3, 0.55, 0.15));
    col = mix(col, vec3(g) * vec3(0.72, 0.7, 0.8) * 0.55, max(dim, 0.));
    if (dim < 0.) { float cl = -dim; alpha = mix(1., 0.28 + 0.6 * pow(1. - nv, 2.), cl); col = mix(col, col * 0.6 + spec * vec3(1.) + rim * base * 0.9, cl); }
  } else if (type == 2) {
    float k = uC[idx * 8 + 7];
    if (k < 0.5) {                           // dead epithelial cell (flat squame)
      vec3 q = rotY(uC[idx * 8 + 3]) * (p - vec3(uC[idx * 8], uC[idx * 8 + 1], uC[idx * 8 + 2]));
      float nuc = smoothstep(0.35, 0.2, length(q.xz / vec2(uC[idx * 8 + 4], uC[idx * 8 + 6])));
      float fold = fbm3(q * 22., 3);
      vec3 base = mix(vec3(0.93, 0.74, 0.74), vec3(0.72, 0.42, 0.55), nuc * 0.8) * (0.85 + 0.3 * fold);
      col = base * (0.12 + 0.8 * dif * heightLight) * ao + base * sss * 0.6 * (1. - nv) + spec * 0.5 + rim * vec3(0.9, 0.8, 1.) * 0.3;
      alpha = 0.78 + 0.2 * (1. - nv);
    } else if (k < 1.5) {                    // mucus: clear, glassy
      col = vec3(0.75, 0.85, 0.95) * (0.1 + 0.25 * dif) + spec * 2.2 + rim * vec3(0.85, 0.92, 1.) * 1.1;
      alpha = clamp(0.22 + 0.75 * rim + spec * 0.3, 0., 0.9);
    } else if (k < 2.5) {                    // generic food particle
      vec3 base = vec3(0.85, 0.62, 0.36);
      col = base * (0.15 + 0.9 * dif * heightLight) * ao + spec * 0.5 + rim * vec3(1., 0.85, 0.7) * 0.3;
    } else if (k < 3.5) {                    // sugar crystal
      float spark = pow(hash13(floor(p * 60.)), 30.) * 3.;
      col = vec3(0.92, 0.95, 1.) * (0.25 + 0.7 * dif) * ao + spec * 1.6 + rim * vec3(0.8, 0.9, 1.) * 0.6 + spark;
      alpha = 0.92;
    } else if (k < 4.5) {                    // crumb
      vec3 base = vec3(0.78, 0.55, 0.30);
      col = base * (0.15 + 0.9 * dif * heightLight) * ao + spec * 0.3;
    } else {                                 // mint: glossy white candy with a pinwheel swirl
      vec3 c0 = vec3(uC[idx * 8], uC[idx * 8 + 1], uC[idx * 8 + 2]);
      vec3 m = rotY(uC[idx * 8 + 3]) * (rotX(uC[idx * 8 + 6]) * (p - c0));
      float ang = atan(m.z, m.x), rad = length(m.xz) / uC[idx * 8 + 4];
      float sw = smoothstep(0.42, 0.58, fract(ang / 6.2832 * 6. + rad * 0.9)) * smoothstep(0.08, 0.3, rad) * step(rad, 0.93);
      vec3 base = mix(vec3(0.97, 0.97, 0.96), vec3(0.16, 0.72, 0.74), sw);
      col = base * (0.2 + 0.85 * dif) * ao + spec * 1.6 + rim * vec3(0.8, 0.9, 1.) * 0.35 + base * sss * 0.25;
      if (k > 5.5) col += pow(hash13(floor(m * 90.)), 26.) * 4. * vec3(1., 0.98, 0.9);             // sugar sparkle
    }
  } else if (type == 3) {
    float s = uPK[idx];
    vec3 pal[5]; pal[0] = vec3(0.98, 0.55, 0.70); pal[1] = vec3(0.70, 0.60, 1.0); pal[2] = vec3(1.0, 0.72, 0.52); pal[3] = vec3(0.55, 0.85, 0.95); pal[4] = vec3(0.93, 0.87, 0.72);
    vec3 base = pal[int(mod(float(idx) * 3., 5.))];
    float sg = clamp(s - 1., 0., 1.);
    if (s > 0.5) base = vec3(0.98, 0.78, 0.04);
    col = base * (0.12 + 0.95 * dif) * ao + spec * 1.2 + rim * vec3(0.8, 0.8, 1.) * 0.35;
    col += s > 0.5 ? vec3(1., 0.82, 0.12) * sg * (0.35 + 1.1 * rim) + vec3(0.25, 0.18, 0.) * sg : vec3(0.);
  } else {
    col = vec3(0.85, 0.83, 0.9) * (0.2 + 0.8 * dif) * ao + spec * 0.5;
  }
  col *= uBright;
  return vec4(col * alpha, alpha);
}`;
  };

  // ------------------------------------------------------------------------------------------------ JS side
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  G.v = { sub, dot, cross, norm, add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k] };
  // camera: same maths as camMat + camRay in the shaders
  G.cam = function (ro, ta, fl = 1.9, roll = 0) {
    const cw = norm(sub(ta, ro)), cp = [Math.sin(roll), Math.cos(roll), 0], cu = norm(cross(cw, cp)), cv = cross(cu, cw);
    return {
      ro, ta, fl, roll, u: { uRo: ro, uTa: ta, uFl: fl, uRoll: roll },
      project(p) { const d = sub(p, ro), x = dot(d, cu), y = dot(d, cv), z = dot(d, cw), k = fl / Math.max(1e-4, z); return { x: 960 + x * k * 540, y: 540 - y * k * 540, z, s: k * 540 }; },
    };
  };
  // GL canvas always 1920x1080 (res = 1/scale), whatever the render scale
  G.create = function (api, frag, o = {}) { return api.gl.create(api, frag, { res: (o.res ?? 1) / Math.max(1, api.scale), aa: o.aa ?? 1, steps: o.steps ?? 110, stepScale: o.stepScale ?? 0.85, eps: o.eps }); };
  // pack subjects into the fg uniforms. bugs: {p:[x,y,z], yaw, pitch, kind, hl, r, wig, dim, glow, seed, sq}
  // cells: {p, yaw, size:[x,y,z], k: 0 cell 1 mucus 2 food 3 sugar 4 crumb}; beads: [{p, r, s (0 plain, 1..2 sulfur glow)}]
  G.pack = function (bugs = [], cells = [], beads = [], o = {}) {
    const B = new Float32Array(MAXB * 8), K = new Float32Array(MAXB * 4), C = new Float32Array(MAXC * 8), P = new Float32Array(MAXP * 4), PK = new Float32Array(MAXP);
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    const grow = (p, r) => { for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k] - r); hi[k] = Math.max(hi[k], p[k] + r); } };
    const nb = Math.min(MAXB, bugs.length);
    for (let i = 0; i < nb; i++) {
      const b = bugs[i], sz = G.SIZE[b.kind] || G.SIZE.rod, sc = b.scale ?? 1, sq = b.sq || 0;
      const hl = (b.hl ?? sz[0]) * sc * (1 + sq), r = (b.r ?? sz[1]) * sc / Math.sqrt(1 + sq) * (1 + (b.swell || 0) * 0.6);
      B.set([b.p[0], b.p[1], b.p[2], b.yaw || 0, b.pitch || 0, hl + (b.swell || 0) * r * 0.2, r, b.wig ?? 0.12], i * 8);
      K.set([G.KIND[b.kind] ?? 0, b.dim || 0, b.glow || 0, b.seed ?? i * 0.137], i * 4);
      grow(b.p, hl + r * 1.4);
    }
    const nc = Math.min(MAXC, cells.length);
    for (let i = 0; i < nc; i++) { const c = cells[i]; C.set([c.p[0], c.p[1], c.p[2], c.yaw || 0, c.size[0], c.size[1], c.size[2], c.k || 0], i * 8); grow(c.p, Math.max(...c.size) * 1.3); }
    const np = Math.min(MAXP, beads.length);
    for (let i = 0; i < np; i++) { const b = beads[i]; P.set([b.p[0], b.p[1], b.p[2], b.r], i * 4); PK[i] = b.s || 0; if (b.r > 0) grow(b.p, b.r * 1.2); }
    if (nb + nc + np === 0) { lo = [0, 0, 0]; hi = [0, 0, 0]; }
    return { uB: B, uK: K, uNB: nb, uC: C, uNC: nc, uP: P, uPK: PK, uNP: np, uBox0: [lo[0], Math.min(lo[1], o.floorY ?? 0), lo[2]], uBox1: hi, uFloorY: o.floorY ?? 0, uShadow: o.shadow ?? 1, uBright: o.bright ?? 1 };
  };
  G.bgU = function (o = {}) {
    return { uGapC: o.gapC || [0, 0], uGap: o.gap ?? 1.05, uSway: o.sway ?? 0.4, uFogK: o.fog ?? 0.012, uBright: o.bright ?? 1, uFluid: o.fluid || [0, 0, 0, 0], uSweep: o.sweep || [0, 0.3, 0, 0.5], uTint: o.tint || [1, 1, 1, 0] };
  };
  // draw a GL canvas into the scene with optional blur (design px) and alpha
  G.blit = function (ctx, api, cv, o = {}) {
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.blur) ctx.filter = `blur(${(o.blur * api.scale).toFixed(1)}px)`;
    ctx.drawImage(cv, 0, 0, api.W, api.H); ctx.restore();
  };
  // shot list: [{ t, ...shot }]; returns the active shot and its local time
  G.shot = function (shots, t) { let k = 0; for (let i = 0; i < shots.length; i++) if (t >= shots[i].t) k = i; const s = shots[k]; return { ...s, k, lt: t - s.t, len: (shots[k + 1] ? shots[k + 1].t : s.t + 4) - s.t }; };
  // flagella behind a bug, projected (draw BEFORE the fg layer so bodies cover the roots)
  G.flagella = function (ctx, cam, b, t, o = {}) {
    const sz = G.SIZE[b.kind] || G.SIZE.rod, sc = b.scale ?? 1, hl = (b.hl ?? sz[0]) * sc, r = (b.r ?? sz[1]) * sc;
    const a = [Math.cos(b.pitch || 0) * Math.cos(b.yaw || 0), Math.sin(b.pitch || 0), Math.cos(b.pitch || 0) * Math.sin(b.yaw || 0)];
    const side = norm(cross(a, [0.001, 1, 0])), up = cross(side, a), n = o.n ?? 3, len = (o.len ?? 1.6) * (hl + r) * 1.3;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < n; k++) {
      const off = (k - (n - 1) / 2) * r * 0.45, ph = (b.seed ?? 0) * 6 + k * 1.9;
      const pts = [];
      for (let i = 0; i <= 18; i++) {
        const u = i / 18, along = -(hl + r * 0.6) - u * len, w = Math.sin(u * 11 - t * 11 + ph) * r * 0.75 * Math.sqrt(u);
        const P = [b.p[0] + a[0] * along + side[0] * (off + w) + up[0] * off * 0.3, b.p[1] + a[1] * along + side[1] * (off + w) + up[1] * off * 0.3 + w * 0.3, b.p[2] + a[2] * along + side[2] * (off + w) + up[2] * off * 0.3];
        pts.push(cam.project(P));
      }
      if (pts[0].z <= 0.05) continue;
      const w0 = Math.max(1, r * 0.2 * pts[0].s);
      ctx.strokeStyle = o.color || 'rgba(190,245,215,0.3)';
      for (const [frac, wk] of [[1, 0.35], [0.66, 0.35], [0.33, 0.35]]) { const m = Math.max(2, Math.round(pts.length * frac)); ctx.lineWidth = w0 * wk * (frac === 1 ? 1 : frac === 0.66 ? 1.9 : 2.8); ctx.beginPath(); for (let i = 0; i < m; i++) i ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y); ctx.stroke(); }
    }
    ctx.restore();
  };
  // fimbriae (P. gingivalis): short hairs around the projected silhouette
  G.fuzz = function (ctx, cam, b, t, o = {}) {
    const sz = G.SIZE[b.kind] || G.SIZE.pg, sc = b.scale ?? 1, r = (b.r ?? sz[1]) * sc * (1 + (b.swell || 0) * 0.6), hl = (b.hl ?? sz[0]) * sc;
    const c = cam.project(b.p); if (c.z <= 0.05) return;
    const rx = (hl + r) * c.s, ry = r * c.s, n = o.n ?? 70, rnd = M.rand ? null : null;
    ctx.save(); ctx.strokeStyle = o.color || 'rgba(220,180,255,0.5)'; ctx.lineWidth = Math.max(0.7, ry * 0.035); ctx.lineCap = 'round';
    const rot = -(b.yaw || 0) * 0.2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rot, ex = Math.cos(a) * rx * 0.97, ey = Math.sin(a) * ry * 0.97, hlen = ry * (0.22 + 0.12 * Math.sin(i * 2.7)), w = Math.sin(t * 3 + i) * 0.3;
      const nx = Math.cos(a), ny = Math.sin(a);
      ctx.beginPath(); ctx.moveTo(c.x + ex, c.y + ey); ctx.quadraticCurveTo(c.x + ex + nx * hlen * 0.6 - ny * hlen * w, c.y + ey + ny * hlen * 0.6 + nx * hlen * w, c.x + ex + nx * hlen, c.y + ey + ny * hlen); ctx.stroke();
    }
    ctx.restore();
  };
  // tiny "* ARTISTIC RENDERING" note, top-right
  G.artistic = function (ctx, api) { api.text(ctx, '* ARTISTIC RENDERING', 1876, 44, { size: 20, color: api.P.faint, align: 'right', tracking: 2 }); };
  // premium HUD panel (glass) behind a label or gauge
  G.glass = function (ctx, x, y, w, h, o = {}) {
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, 'rgba(34,28,62,0.78)'); g.addColorStop(1, 'rgba(14,11,28,0.86)');
    ctx.fillStyle = g; roundRect(ctx, x, y, w, h, o.r ?? 18); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(190,170,255,0.28)'; ctx.lineWidth = 1.5; roundRect(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, o.r ?? 18); ctx.stroke();
    const hl = ctx.createLinearGradient(x, y, x, y + h * 0.5); hl.addColorStop(0, 'rgba(255,255,255,0.08)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; roundRect(ctx, x, y, w, h * 0.5, o.r ?? 18); ctx.fill();
    ctx.restore();
  };
  // chip with a thin leader from a projected point (dot on the object) to the chip
  G.label = function (ctx, api, str, from, x, y, p, o = {}) {
    if (p <= 0) return;
    if (from) {
      const k = api.clamp(p * 1.8), ex = api.lerp(from.x, x, k), ey = api.lerp(from.y, y + (o.dy ?? 0), k);
      ctx.save(); ctx.strokeStyle = o.line || 'rgba(244,241,234,0.85)'; ctx.lineWidth = 2.5; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = o.line || 'rgba(244,241,234,0.95)'; ctx.beginPath(); ctx.arc(from.x, from.y, 6 * api.clamp(p * 3), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(244,241,234,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(from.x, from.y, 14 * api.clamp(p * 2), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    api.label(ctx, str, x, y, { p, size: o.size || 44, align: o.align || 'center', bg: o.bg, color: o.color, upper: o.upper });
  };
  // comic face on a bug (leftovers only): eyes + mouth near the front end, facing the camera
  G.face = function (ctx, cam, b, o = {}) {
    const sz = G.SIZE[b.kind] || G.SIZE.rod, sc = b.scale ?? 1, hl = (b.hl ?? sz[0]) * sc, r = (b.r ?? sz[1]) * sc;
    const a = [Math.cos(b.pitch || 0) * Math.cos(b.yaw || 0), Math.sin(b.pitch || 0), Math.cos(b.pitch || 0) * Math.sin(b.yaw || 0)];
    const toCam = norm(sub(cam.ro, b.p));
    const fp = [b.p[0] + a[0] * hl * 0.9 + toCam[0] * r * 0.95, b.p[1] + a[1] * hl * 0.9 + toCam[1] * r * 0.95 + r * 0.15, b.p[2] + a[2] * hl * 0.9 + toCam[2] * r * 0.95];
    const c = cam.project(fp); if (c.z <= 0.05) return;
    const er = r * 0.2 * c.s * (o.eyeScale ?? 1), gap = r * 0.36 * c.s;
    ctx.save();
    for (const dx of [-gap, gap]) {
      ctx.save(); ctx.translate(c.x + dx, c.y); ctx.scale(1, o.closed ? 0.12 : (o.squint ?? 1));
      ctx.fillStyle = '#0c1a14'; ctx.beginPath(); ctx.ellipse(0, 0, er * 0.8, er, 0, 0, Math.PI * 2); ctx.fill();
      if (!o.closed) { ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(-er * 0.25, -er * 0.35, er * 0.32, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (o.mouth > 0.02) { ctx.fillStyle = '#0c1a14'; ctx.beginPath(); ctx.ellipse(c.x, c.y + er * 2.1, er * 1.1, er * 1.2 * o.mouth, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (o.smile) { ctx.strokeStyle = '#0c1a14'; ctx.lineWidth = Math.max(2, er * 0.35); ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(c.x, c.y + er * 1.2, er * 1.1 * o.smile, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    ctx.restore();
  };
  // premium gauge (glass panel, segmented glowing arc, needle with glow). v: 0 fresh .. 1 bad
  G.gauge = function (ctx, api, x, y, R, v, o = {}) {
    const P = api.P, clamp = api.clamp;
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha *= o.alpha; const sc = o.scale ?? 1; ctx.scale(sc, sc);
    G.glass(ctx, -R * 1.42, -R * 1.5, R * 2.84, R * 2.25, { r: R * 0.16 });
    if (o.title) api.text(ctx, o.title, 0, -R * 1.12, { size: Math.max(34, R * 0.2), color: P.dim, align: 'center', tracking: 4 });
    const n = 28, a0 = Math.PI * 1.08, a1 = Math.PI * 1.92;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), a = a0 + (a1 - a0) * u, on = u <= clamp(v) + 0.02;
      const col = u < 0.28 ? [143, 216, 255] : u < 0.5 ? [215, 243, 74] : u < 0.7 ? [255, 212, 59] : [255, 77, 90];
      ctx.strokeStyle = `rgba(${col.join(',')},${on ? 0.95 : 0.16})`; ctx.lineWidth = R * 0.13; ctx.lineCap = 'butt';
      if (on) { ctx.shadowColor = `rgba(${col.join(',')},0.8)`; ctx.shadowBlur = R * 0.12; } else ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(0, 0, R, a - 0.045, a + 0.045); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    api.text(ctx, 'FRESH', -R * 0.95, R * 0.42, { size: Math.max(34, R * 0.19), color: '#8fd8ff', align: 'center', tracking: 3 });
    api.text(ctx, 'BAD', R * 0.95, R * 0.42, { size: Math.max(34, R * 0.19), color: '#ff4d5a', align: 'center', tracking: 3 });
    const a = a0 + (a1 - a0) * clamp(v);
    ctx.save(); ctx.rotate(a); ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.moveTo(-R * 0.1, -R * 0.03); ctx.lineTo(R * 0.8, -R * 0.008); ctx.lineTo(R * 0.8, R * 0.008); ctx.lineTo(-R * 0.1, R * 0.03); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.arc(0, 0, R * 0.075, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  // dark studio backdrop for object inserts (mint): soft key glow, floor gradient, drifting bokeh
  G.studio = function (ctx, api, t, o = {}) {
    const g = ctx.createRadialGradient(960 + (o.kx ?? 0), 380, 50, 960, 540, 1300);
    g.addColorStop(0, o.c0 || '#2a2146'); g.addColorStop(0.5, o.c1 || '#130f26'); g.addColorStop(1, '#07060f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
    const fl = ctx.createLinearGradient(0, 700, 0, 1080); fl.addColorStop(0, 'rgba(0,0,0,0)'); fl.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = fl; ctx.fillRect(0, 700, 1920, 380);
    M.bokeh(ctx, t, { n: 22, alpha: o.bokeh ?? 0.07, seed: o.seed || 9 });
  };
  function roundRect(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
})();
