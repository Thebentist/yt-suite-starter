/* 3D kit for the `teeth` group (phase 2): ray-marched SDF worlds for pipeline/motion/gl.js, plus camera helpers.
 *   // @use videos/bad-breath-for-good/scenes/teeth/_gl.js
 * window.TEETH3D = { MOLARS, proj(cam, P), shot(...), ... }
 *
 * MOLARS world. Units: 1 = 10 mm. Lower posterior teeth, buccal (cheek) side facing +z, crowns up (+y), origin at the
 * M1|M2 contact at the level of the cemento-enamel junction. PM2 at x -1.36, M1 at -0.5 (five cusps, two roots with the
 * mesial one curving distally), M2 at +0.475 (x0.95, four cusps), M3 at +1.38 (x0.9). Real proportions: crown ~7.5 mm,
 * roots ~12-13 mm, enamel ~1.1 mm thick on the section. The gum is an alveolar ridge plus a collar hugging each neck,
 * with the margin ~1 mm above the CEJ mid-tooth and papillae rising between the teeth. Bone (seen in the cutaway)
 * sits ~1.6 mm below the CEJ with a periodontal-ligament gap round every root. State uniforms: uRed/uSwell
 * (gingivitis), uDrop (bone loss at the M1|M2 septum), uPocket, uPlaque, uCut (section plane z = uCutZ, keeps z < it).
 */
(function () {
  const COMMON = `
uniform vec3 uRo; uniform vec3 uTa; uniform float uRoll; uniform float uFov;
uniform float uGlow;  // background glow strength
const vec3 L1 = normalize(vec3(-0.55, 0.85, 0.65));   // warm key, upper left front
const vec3 L2 = normalize(vec3(0.75, 0.35, -0.75));   // cool rim from behind right
const vec3 L3 = normalize(vec3(0.6, -0.2, 0.8));      // low fill
vec3 bgCol(vec2 uv){
  vec3 c = mix(vec3(0.008, 0.007, 0.02), vec3(0.03, 0.022, 0.06), smoothstep(-0.9, 0.9, uv.y));
  vec2 g = uv - vec2(0.05, 0.12);
  c += vec3(0.30, 0.2, 0.62) * 0.08 * uGlow * exp(-dot(g, g) * 1.4);
  return c;
}
// environment reflection: a warm softbox overhead-left and a cool strip light right
vec3 envRefl(vec3 r){
  float box = smoothstep(0.55, 0.92, dot(r, normalize(vec3(-0.45, 0.85, 0.35))));
  float strip = smoothstep(0.82, 0.97, dot(r, normalize(vec3(0.9, 0.25, -0.2))));
  return vec3(1.0, 0.95, 0.88) * box * 1.3 + vec3(0.6, 0.55, 1.0) * strip * 0.7 + vec3(0.05, 0.04, 0.08);
}
`;

  const MOLARS = COMMON + `
uniform float uSpotX; uniform float uRed; uniform float uSwell; uniform float uDrop; uniform float uPocket; uniform float uPlaque;
uniform float uCut; uniform float uCutZ; uniform float uPulse;
uniform float uFood; uniform vec3 uFoodP; uniform float uFoodS;
uniform float uNB; uniform float uB[128]; uniform vec3 uBC; uniform float uBR; uniform float uBugGlow; uniform float uBugS;
uniform float uFloss; uniform vec3 uFV; uniform vec3 uFL; uniform vec3 uFR;
#define ZERO min(int(uTime), 0)
float gMat; vec3 gLoc; float gKind; float gBug; float gTS; float gNoBug = 0.;

float molarCrown(vec3 p, float four){
  // bell-shaped crown: narrow at the neck (CEJ), widest at the contact areas, cusps rising from the occlusal table
  float tx = mix(0.8, 1.0, smoothstep(0.0, 0.34, p.y)), tz = mix(0.86, 1.0, smoothstep(0.0, 0.22, p.y)) * mix(1.0, 0.9, smoothstep(0.35, 0.6, p.y));
  vec3 q = vec3(p.x / tx, p.y, p.z / tz);
  float d = sdRoundBox(q - vec3(0., 0.29, 0.), vec3(0.5, 0.23, 0.44), 0.14) * min(tx, tz);
  float c = sdEllipsoid(p - vec3(-0.28, 0.52, 0.19), vec3(0.22, 0.14, 0.2));
  c = min(c, sdEllipsoid(p - vec3(0.05, 0.53, 0.2), vec3(0.2, 0.13, 0.19)));
  if (four < 0.5) c = min(c, sdEllipsoid(p - vec3(0.33, 0.49, 0.12), vec3(0.16, 0.11, 0.16)));
  c = min(c, sdEllipsoid(p - vec3(-0.25, 0.555, -0.18), vec3(0.22, 0.15, 0.2)));
  c = min(c, sdEllipsoid(p - vec3(0.18, 0.555, -0.18), vec3(0.22, 0.15, 0.2)));
  d = smin(d, c, 0.13);
  // central fossa + grooves (shallow, soft)
  float g = sdCapsule(p, vec3(-0.36, 0.7, 0.0), vec3(0.36, 0.7, 0.0), 0.045);
  g = min(g, sdCapsule(p, vec3(-0.11, 0.72, 0.), vec3(-0.1, 0.52, 0.47), 0.012));
  if (four < 0.5) g = min(g, sdCapsule(p, vec3(0.21, 0.72, 0.), vec3(0.22, 0.52, 0.45), 0.01));
  g = min(g, sdCapsule(p, vec3(-0.03, 0.72, 0.), vec3(-0.03, 0.54, -0.46), 0.012));
  return smax(d, -g, 0.03);
}
float molarRoots(vec3 p){
  float trunk = sdRoundBox(p - vec3(0., -0.07, 0.), vec3(0.37, 0.14, 0.33), 0.12);
  vec3 q = vec3(p.x * 1.25, p.y, p.z);
  float m = sdRoundCone(q, vec3(-0.31, -0.1, 0.), vec3(-0.22, -1.22, 0.02), 0.21, 0.055);
  float ds = sdRoundCone(q, vec3(0.33, -0.1, 0.), vec3(0.4, -1.12, 0.0), 0.2, 0.055);
  return smin(trunk, min(m, ds) * 0.8, 0.12);
}
float molar(vec3 p, float four){ return smin(molarCrown(p, four), molarRoots(p), 0.09); }
float premolar(vec3 p){
  float tp = mix(0.78, 1.0, smoothstep(0.0, 0.32, p.y));
  vec3 q = vec3(p.x / tp, p.y, p.z / tp);
  float d = sdRoundBox(q - vec3(0., 0.3, 0.), vec3(0.33, 0.22, 0.4), 0.14) * tp;
  d = smin(d, sdEllipsoid(p - vec3(0.0, 0.58, 0.14), vec3(0.22, 0.2, 0.2)), 0.09);
  d = smin(d, sdEllipsoid(p - vec3(0.0, 0.52, -0.2), vec3(0.19, 0.14, 0.16)), 0.08);
  d = smax(d, -sdCapsule(p, vec3(-0.3, 0.71, -0.02), vec3(0.3, 0.71, -0.02), 0.045), 0.03);
  vec3 r = vec3(p.x * 1.2, p.y, p.z);
  float root = sdRoundCone(r, vec3(0., -0.05, 0.), vec3(0.02, -1.3, 0.), 0.3, 0.06) * 0.83;
  return smin(d, root, 0.1);
}
float molarPulp(vec3 p){
  float ch = sdRoundBox(p - vec3(0., 0.13, 0.), vec3(0.2, 0.065, 0.16), 0.06);
  ch = smin(ch, sdEllipsoid(p - vec3(-0.21, 0.27, 0.1), vec3(0.045, 0.1, 0.045)), 0.04);
  ch = smin(ch, sdEllipsoid(p - vec3(0.06, 0.27, 0.1), vec3(0.045, 0.09, 0.045)), 0.04);
  ch = smin(ch, sdEllipsoid(p - vec3(-0.19, 0.28, -0.1), vec3(0.045, 0.1, 0.045)), 0.04);
  ch = smin(ch, sdEllipsoid(p - vec3(0.15, 0.28, -0.1), vec3(0.045, 0.1, 0.045)), 0.04);
  vec3 q = vec3(p.x * 1.25, p.y, p.z);
  float c1 = sdRoundCone(q, vec3(-0.3, 0.08, 0.), vec3(-0.23, -1.15, 0.02), 0.05, 0.01);
  float c2 = sdRoundCone(q, vec3(0.33, 0.08, 0.), vec3(0.39, -1.05, 0.0), 0.05, 0.01);
  return smin(ch, min(c1, c2) * 0.8, 0.06);
}
float premolarPulp(vec3 p){
  float ch = sdEllipsoid(p - vec3(0., 0.2, 0.), vec3(0.08, 0.18, 0.12));
  vec3 r = vec3(p.x * 1.2, p.y, p.z);
  return smin(ch, sdRoundCone(r, vec3(0., 0.05, 0.), vec3(0.02, -1.25, 0.), 0.06, 0.01) * 0.83, 0.05);
}
const vec4 TOOTH[4] = vec4[4](vec4(-1.36, 1.0, 0., 0.), vec4(-0.5, 1.0, 1., 0.), vec4(0.475, 0.95, 1., 1.), vec4(1.38, 0.9, 1., 1.));
float teethD(vec3 p){
  float d = 1e5; gTS = 1e5;
  for (int k = ZERO; k < 4; k++) {
    vec4 T = TOOTH[k];
    vec3 q = (p - vec3(T.x, 0., 0.)) / T.y;
    float e;
    if (abs(q.x) > 1.35) e = (abs(q.x) - 0.62) * T.y;
    else e = (T.z < 0.5 ? premolar(q) : molar(q, T.w)) * T.y;
    gTS = smin(gTS, e, 0.07);
    if (e < d) { d = e; gLoc = q; gKind = float(k); }
  }
  return d;
}
float papBump(float x){ return exp(-pow((x + 1.0) / 0.15, 2.)) + exp(-pow(x / 0.15, 2.)) + exp(-pow((x - 0.95) / 0.15, 2.)); }
float nearSeptum(float x){ return exp(-pow(x / 0.42, 2.)); }
float marginY(float x){
  return 0.1 + 0.19 * papBump(x) + 0.045 * uSwell * (0.6 + 0.4 * papBump(x)) - (0.1 * papBump(x) + 0.05) * uDrop * nearSeptum(x);
}
float crestY(float x){ return -0.16 - 0.24 * uDrop * nearSeptum(x); }
float gumD(vec3 p, float dT){
  float ridge = sdRoundBox(p - vec3(0., -0.84, 0.), vec3(5., 0.82, 0.52), 0.36);
  float mY = marginY(p.x);
  float th = (0.012 + 0.03 * uSwell) + (0.1 + 0.04 * uSwell) * smoothstep(mY, mY - 0.3, p.y);
  float collar = smax(dT - th, p.y - mY, 0.03 + 0.03 * uSwell);
  collar = smax(collar, -0.3 - p.y, 0.1);
  float g = smin(ridge, collar, 0.18);
  if (uPocket > 0.001) {
    float pw = 0.045 * uPocket * nearSeptum(p.x);
    float hole = max(dT - pw, crestY(p.x) + 0.05 - p.y);
    g = smax(g, -hole, 0.006);
  }
  return g;
}
float boneD(vec3 p, float dT){
  float b = sdRoundBox(p - vec3(0., -0.95, 0.), vec3(5., 0.8, 0.4), 0.28);
  b = max(b, p.y - crestY(p.x));
  return smax(b, -(dT - 0.022), 0.004);
}
float foodD(vec3 p){
  vec3 q = (p - uFoodP) / uFoodS;
  float r = length(q); if (r > 0.7) return (r - 0.55) * uFoodS;
  float d = sdEllipsoid(q, vec3(0.14, 0.085, 0.11));
  d = smin(d, sdCapsule(q, vec3(0.0, -0.02, 0.05), vec3(0.01, -0.22, 0.2), 0.034), 0.05);
  d = smin(d, sdCapsule(q, vec3(0.01, -0.22, 0.2), vec3(0.02, -0.34, 0.36), 0.022), 0.04);
  d += 0.018 * (noise3(q * 28.) - 0.5);
  return d * uFoodS * 0.8;
}
float bugsD(vec3 p){
  float r = length(p - uBC); if (r > uBR) return r - uBR + 0.05;
  float d = 1e5;
  int nb = int(uNB);
  for (int i = ZERO; i < 32; i++) {
    if (i >= nb) break;
    vec3 c = vec3(uB[i * 4], uB[i * 4 + 1], uB[i * 4 + 2]); float ph = uB[i * 4 + 3];
    vec3 ax = normalize(vec3(cos(ph * 2.1), 0.5 * sin(ph * 1.3), sin(ph * 2.1)));
    float s = uBugS * (0.8 + 0.4 * fract(ph * 7.31));
    float e = sdCapsule(p, c - ax * s * 1.4, c + ax * s * 1.4, s * 0.62);
    if (e < d) { d = e; gBug = float(i); }
  }
  return d;
}
float map(vec3 p){
  float dT = teethD(p);
  vec3 loc = gLoc; float kind = gKind; float dTS = gTS;
  float dG = gumD(p, dTS);
  float d = dT; gMat = 1.;
  if (dG < d) { d = dG; gMat = 3.; }
  if (uCut > 0.5) { float c = p.z - uCutZ; if (c > d) { d = c; gMat = 7.; } }
  if (uFood > 0.001) { float f = foodD(p); if (f < d) { d = f; gMat = 4.; } }
  if (uNB > 0.5 && gNoBug < 0.5) { float b = bugsD(p); if (b < d) { d = b; gMat = 5.; } }
  if (uFloss > 0.001) { float f = min(sdCapsule(p, uFV, uFL, 0.013), sdCapsule(p, uFV, uFR, 0.013)); if (f < d) { d = f; gMat = 6.; } }
  gLoc = loc; gKind = kind;
  return d;
}

uniform float uSteps;
float march(vec3 ro, vec3 rd, float tmax){ float t = 0.; int n = int(uSteps); for (int i = ZERO; i < 400; i++) { if (i >= n) break; float d = map(ro + rd * t); if (abs(d) < 0.00015 * t + 0.00006) return t; t += d * 0.82; if (t > tmax) break; } float dl = map(ro + rd * t); return (t < tmax && dl < 0.004) ? t : -1.; }
vec3 calcNormal(vec3 p){ vec3 n = vec3(0.); for (int i = ZERO; i < 4; i++) { vec3 e = 0.5773 * (2.0 * vec3((((i + 3) >> 1) & 1), ((i >> 1) & 1), (i & 1)) - 1.0); n += e * map(p + e * 0.0009); } return normalize(n); }
float calcAO(vec3 p, vec3 n){ gNoBug = 1.; float occ = 0., sca = 1.; for (int i = ZERO; i < 5; i++) { float h = 0.01 + 0.12 * float(i) / 4.; occ += (h - map(p + h * n)) * sca; sca *= 0.95; } gNoBug = 0.; return clamp(1. - 3. * occ, 0., 1.); }

vec3 lightIt(vec3 base, vec3 p, vec3 n, vec3 rd, float wrap, float specPow, float specAmt, float envAmt, float f0, float ao){
  float dif = clamp((dot(n, L1) + wrap) / (1. + wrap), 0., 1.);
  float fill = clamp(dot(n, L3) * 0.5 + 0.5, 0., 1.);
  vec3 h = normalize(L1 - rd);
  float fr = fresnel(dot(n, -rd), f0);
  float sp = pow(clamp(dot(n, h), 0., 1.), specPow) * specAmt * fr * 8.;
  float rim = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.) * clamp(dot(n, L2) * 0.7 + 0.3, 0., 1.);
  vec3 c = base * (0.07 + 0.92 * dif * vec3(1.0, 0.93, 0.85) + 0.14 * fill * vec3(0.6, 0.6, 1.0)) * ao;
  c += sp * vec3(1.0, 0.96, 0.9);
  c += envRefl(reflect(rd, n)) * envAmt * fr * ao;
  c += rim * vec3(0.55, 0.45, 1.0) * 0.55 * ao;
  return c;
}
vec3 render(vec2 fc){
  vec2 uv = (2. * fc - uRes) / uRes.y;
  mat3 cam = camMat(uRo, uTa, uRoll);
  vec3 rd = cam * normalize(vec3(uv, uFov));
  vec3 bg = bgCol(uv);
  float t = march(uRo, rd, 14.);
  if (t < 0.) return bg;
  for (int i = ZERO; i < 3; i++) t += map(uRo + rd * t) * 0.9;
  vec3 p = uRo + rd * t;
  map(p); float mat = gMat; vec3 loc = gLoc; float kind = gKind; float bi = gBug;
  vec3 n = calcNormal(p);
  #ifdef DEBUG_N
  return (n * 0.5 + 0.5) * 0.8;
  #endif
  float mY = marginY(p.x);
  vec3 base = vec3(0.8); vec3 emis = vec3(0.); float wrap = 0.4, spw = 60., sa = 0.5, ea = 0.2, f0 = 0.04; bool flatCut = false;
  if (mat < 1.5) {                                    // enamel (and exposed root below the CEJ)
    float cej = 0.03 + 0.05 * smoothstep(0.25, 0.48, abs(loc.x));
    base = vec3(0.92, 0.88, 0.82);
    base = mix(base, vec3(0.9, 0.78, 0.58), smoothstep(0.26, 0.02, loc.y));
    base = mix(base, vec3(0.82, 0.86, 0.95), smoothstep(0.6, 0.78, loc.y) * 0.45);
    base = mix(base, vec3(0.84, 0.7, 0.48), step(loc.y, cej));
    float pl = uPlaque * smoothstep(mY + 0.22, mY + 0.02, p.y) * (0.35 + 0.65 * nearSeptum(p.x * 1.6));
    pl = max(pl, uPlaque * 0.9 * smoothstep(0.12, 0.0, abs(p.x)) * step(0.3, p.y));
    pl = clamp(pl, 0., 0.85);
    base = mix(base, vec3(0.84, 0.77, 0.46), pl);
    wrap = 0.25; spw = 160.; sa = mix(1.3, 0.25, pl); ea = mix(0.8, 0.15, pl); f0 = 0.06;
    float th = pow(clamp(dot(rd, -L2) * 0.5 + 0.5, 0., 1.), 3.);
    emis = base * vec3(1.0, 0.85, 0.7) * th * 0.3 * smoothstep(0.4, 0.75, loc.y);
  } else if (mat < 3.5) {                             // gum: stippled when healthy, glossy and red when inflamed
    float inf = clamp(uRed, 0., 1.);
    vec3 bn = vec3(noise3(p * 90.), noise3(p * 90. + 7.1), noise3(p * 90. + 3.7)) - 0.5;
    n = normalize(n + bn * 0.2 * (1. - inf));
    float margin = smoothstep(mY - 0.2, mY, p.y);
    base = mix(vec3(0.78, 0.3, 0.4), vec3(0.72, 0.1, 0.12), inf);
    base = mix(base, mix(vec3(0.93, 0.5, 0.56), vec3(0.9, 0.2, 0.2), inf), margin * 0.55);
    base = mix(base, vec3(0.55, 0.16, 0.3), smoothstep(-0.25, -0.6, p.y) * (1. - inf * 0.5));
    base = mix(base, vec3(1.0, 0.1, 0.22), uPulse * (0.5 + 0.5 * margin));
    wrap = 0.6; spw = mix(50., 120., inf); sa = mix(0.35, 1.2, inf); ea = mix(0.12, 0.5, inf); f0 = 0.03;
    float sss = pow(clamp(dot(rd, -L2) * 0.5 + 0.5, 0., 1.), 2.);
    emis = base * vec3(1.0, 0.3, 0.3) * (0.14 + 0.3 * sss) + vec3(1.0, 0.15, 0.25) * uPulse * 0.25 * margin;
  } else if (mat < 4.5) {                             // food: cooked fibres
    vec3 q = (p - uFoodP) / uFoodS;
    base = mix(vec3(0.42, 0.2, 0.12), vec3(0.72, 0.44, 0.28), smoothstep(0.3, 0.7, noise3(vec3(q.x * 70., q.y * 9., q.z * 9.))));
    wrap = 0.4; spw = 40.; sa = 0.25; ea = 0.08;
  } else if (mat < 5.5) {                             // bacteria: glossy green capsules
    base = mix(vec3(0.16, 0.72, 0.4), vec3(0.58, 0.82, 0.18), step(0.62, fract(bi * 0.37)));
    wrap = 0.5; spw = 90.; sa = 1.0; ea = 0.35; f0 = 0.05;
    emis = base * (0.2 + 3.0 * uBugGlow) * vec3(0.6, 1.0, 0.5) * 0.4;
  } else if (mat < 6.5) {                             // floss
    base = vec3(0.93, 0.92, 1.0); wrap = 0.4; spw = 60.; sa = 0.6; ea = 0.3; f0 = 0.05;
  } else {                                            // the cutaway face
    flatCut = true;
    float dT = teethD(p); vec3 l = gLoc; float k = gKind;
    float dB = boneD(p, dT), dG = gumD(p, dT);
    if (dT < 0.) {
      float pulp = k < 0.5 ? premolarPulp(l) : molarPulp(l);
      float cej = 0.03 + 0.05 * smoothstep(0.25, 0.48, abs(l.x));
      float enT = mix(0.035, 0.15, smoothstep(0.05, 0.6, l.y));
      if (pulp < 0.) base = mix(vec3(0.72, 0.1, 0.2), vec3(0.45, 0.04, 0.14), smoothstep(0.2, -1.0, l.y)) * (0.9 + 0.2 * noise3(p * 60.));
      else if (dT > -enT && l.y > cej) base = vec3(0.93, 0.95, 0.98);
      else { base = vec3(0.95, 0.72, 0.38) * (0.96 + 0.06 * noise3(p * 30.)); base = mix(base, vec3(0.78, 0.52, 0.28), smoothstep(0.1, -1.0, l.y) * 0.55); base = mix(base, vec3(1.0, 0.86, 0.6), smoothstep(-0.08, -0.02, pulp) * 0.0); }
      if (dT > -enT - 0.012 && dT < -enT && l.y > cej) base *= 0.82;
    } else if (dB < 0.) {
      float tr = abs(fbm3(p * 26., 3) - 0.5);
      base = mix(vec3(0.5, 0.26, 0.24), vec3(0.86, 0.76, 0.6), smoothstep(0.02, 0.07, tr));
      base = mix(base, vec3(0.92, 0.86, 0.74), smoothstep(-0.035, -0.005, dB));
    } else if (dT < 0.024 && p.y < crestY(p.x) + 0.02) {
      base = vec3(0.3, 0.08, 0.12);
    } else {
      float inf = clamp(uRed, 0., 1.);
      base = mix(vec3(0.84, 0.36, 0.46), vec3(0.72, 0.08, 0.16), inf);
      base = mix(base, vec3(0.96, 0.62, 0.68), smoothstep(-0.03, 0.0, dG) * 0.6);
      base = mix(base, vec3(1.0, 0.1, 0.22), uPulse * 0.6);
    }
  }
  vec3 nn = flatCut ? vec3(0., 0., 1.) : n;
  float ao = calcAO(p, nn);
  vec3 col;
  if (flatCut) { float ks = clamp(dot(nn, L1) * 0.6 + 0.5, 0., 1.); col = base * (0.14 + 0.56 * ks) * ao * ao * (0.8 + 0.28 * smoothstep(-0.9, 0.5, p.y)); }
  else col = lightIt(base, p, n, rd, wrap, spw, sa, ea, f0, ao) + emis;
  float spot = exp(-pow(max(abs(p.x - uSpotX) - 0.9, 0.) / 1.1, 2.)) * mix(0.25, 1., smoothstep(-1.05, -0.2, p.y));
  col = mix(bg, col, spot);
  col = mix(col, bg, 1. - exp(-0.004 * t * t));
  return col;
}`;


  // ================================================================= BRACES world ================================
  // Front of both arches in occlusion, with fixed appliances. Units: 1 = 10 mm. Arch = circle arc (anterior segment),
  // centre (0, 0, -R); upper R = 2.6 (labial surfaces), lower R = 2.36 (2.4 mm overjet), overbite 2.5 mm. Upper:
  // central 8.6, lateral 6.6, canine 7.8, PM1 7.0, PM2 6.8 mm wide; lower: central 5.4, lateral 6.0, canine 7.0,
  // PM1 7.0, PM2 7.0. Twin brackets bonded at the crown centre (FA point), slots levelled on one archwire per arch
  // (0.5 mm round, polar torus), elastic O-ring ligature around the four tie wings. Food blobs from uniform arrays.
  const BRACES = COMMON + `
#define ZERO min(int(uTime), 0)
uniform float uSteps; uniform float uSpotX;
uniform float uNF; uniform float uF[128]; uniform vec3 uFC; uniform float uFR;
uniform float uGunk; uniform float uTieHue; uniform float uBraces;
const float RU = 2.6, RL = 2.36, YWU = -0.56, YWL = -1.2;
// cumulative centre angles and sizes: (theta, width, height, type 0 incisor 1 canine 2 premolar)
const vec4 UT[5] = vec4[5](vec4(0.4300/2.6, 0.86, 1.05, 0.), vec4(1.2200/2.6, 0.66, 0.92, 0.), vec4(1.9400/2.6, 0.78, 1.02, 1.), vec4(2.6800/2.6, 0.70, 0.84, 2.), vec4(3.3700/2.6, 0.68, 0.78, 2.));
const vec4 LT[5] = vec4[5](vec4(0.27/2.36, 0.54, 0.9, 0.), vec4(0.84/2.36, 0.60, 0.92, 0.), vec4(1.49/2.36, 0.70, 1.05, 1.), vec4(2.19/2.36, 0.70, 0.84, 2.), vec4(2.89/2.36, 0.70, 0.8, 2.));
float gMat; float gFood; vec3 gLoc; float gTip;
// one crown + root in tooth-local coords: u along the arch, v from the cervical line toward the incisal edge, w outward
float crown(vec3 q, float W, float H, float type){
  float k = clamp(q.y / H, 0., 1.);
  float th = type < 0.5 ? mix(0.66, 0.16, k) : type < 1.5 ? mix(0.78, 0.3, k) : mix(0.82, 0.62, k);
  float hw = W * 0.555 * (type < 0.5 ? mix(0.88, 1.0, smoothstep(0., 0.6, k)) : mix(0.86, 1.0, sin(k * 3.1416 * 0.62)));
  float v = q.y;
  if (type > 0.5) v += (type < 1.5 ? 0.16 : 0.1) * abs(q.x) / (W * 0.5);     // canine / premolar cusp tip
  float w = q.z + 0.05 * pow(q.x / (W * 0.5), 4.) + 0.05 * pow((q.y - H * 0.45) / (H * 0.5), 2.);
  float r = 0.1;
  vec3 b = vec3(q.x * (W * 0.5) / max(hw, 0.05), v - H * 0.5, w + th * 0.5);
  float d = sdRoundBox(b, vec3(W * 0.5 - r, H * 0.5 - r, max(th * 0.5 - r * 0.6, 0.02)), r) * 0.8;
  float root = sdRoundCone(q, vec3(0., 0.05, -0.3), vec3(0., -0.62, -0.35), W * 0.33, 0.14);
  return smin(d, root, 0.1);
}
// bracket, wire slot and ligature, in tooth-local coords; bracket centre at (0, vb, 0); ret.x steel, ret.y tie
vec2 bracket(vec3 q, float vb, float bw){
  vec3 b = q - vec3(0., vb, 0.);
  float pad = sdRoundBox(b - vec3(0., 0., 0.005), vec3(bw * 0.56, 0.16, 0.012), 0.01);
  float body = sdRoundBox(b - vec3(0., 0., 0.075), vec3(bw * 0.5, 0.15, 0.065), 0.028);
  body = smax(body, -sdBox(b - vec3(0., 0., 0.15), vec3(bw * 0.09, 0.2, 0.05)), 0.01);                  // twin gap
  body = smax(body, -sdBox(b - vec3(0., 0., 0.14), vec3(bw * 0.6, 0.03, 0.065)), 0.006);                  // wire slot
  body = smax(body, -sdBox(b - vec3(0., 0.105, 0.05), vec3(bw * 0.6, 0.02, 0.022)), 0.006);              // tie grooves
  body = smax(body, -sdBox(b - vec3(0., -0.105, 0.05), vec3(bw * 0.6, 0.02, 0.022)), 0.006);
  float steel = min(pad, body);
  vec2 rb = abs(b.xy) - vec2(bw * 0.46, 0.08);
  float ring2 = length(max(rb, 0.)) + min(max(rb.x, rb.y), 0.) - 0.03;
  float side = smoothstep(-0.08, 0.08, rb.x - rb.y);
  float tie = (length(vec2(ring2, b.z - mix(0.098, 0.132, side))) - 0.029) * 0.9;
  return vec2(steel, tie * uBraces + (1. - uBraces) * 1e3);
}
float ARCHD(vec3 p, bool upper, out vec3 loc, out float tipk){
  float R = upper ? RU : RL;
  vec3 c = vec3(abs(p.x), p.y, p.z + RU);
  float rr = length(c.xz), th = atan(c.x, c.z);
  float d = 1e5; loc = vec3(0.); tipk = 0.;
  for (int i = ZERO; i < 5; i++) {
    vec4 T = upper ? UT[i] : LT[i];
    float e;
    float ang = abs(th - T.x) * rr;
    if (ang > T.y * 0.5 + 0.45) e = ang - T.y * 0.5 - 0.2;
    else {
      vec3 dir = vec3(sin(T.x), 0., cos(T.x)), tg = vec3(cos(T.x), 0., -sin(T.x));
      vec3 rel = vec3(c.x, 0., c.z);
      vec3 q = vec3(dot(rel, tg), upper ? -p.y : p.y - (-1.62), dot(rel, dir) - R);
      e = crown(q, T.y, T.z, T.w);
      if (e < d) { loc = q; tipk = float(i); }
    }
    d = min(d, e);
  }
  return d;
}
float gumD(vec3 p, bool upper){
  float R = upper ? RU : RL;
  vec3 c = vec3(abs(p.x), p.y, p.z + RU);
  float rr = length(c.xz), th = atan(c.x, c.z);
  float y = upper ? p.y : -(p.y + 1.62);            // height above the cervical line, into the gum
  float mY = 0.0; float pap = 0.;
  for (int i = ZERO; i < 5; i++) {
    vec4 T = upper ? UT[i] : LT[i];
    float edge = T.x + T.y * 0.5 / R;
    pap = max(pap, exp(-pow((th - edge) * R / 0.12, 2.)));
  }
  pap = max(pap, exp(-pow(th * R / 0.1, 2.)));       // midline papilla
  mY = 0.02 - 0.34 * pap;
  float rOut = R + 0.1 * smoothstep(mY, mY + 0.4, y) - 0.03 - 0.45 * pow(smoothstep(0.35, 0.95, y), 1.6);
  float thEnd = (upper ? UT[4].x : LT[4].x) + 0.2;
  float g = max(max(rr - rOut, R - 0.95 - rr), max(mY - y, y - 0.95)) * 0.85;
  g = max(g, (th - thEnd) * rr);
  return g;
}
float foodD(vec3 p){
  float r = length(p - uFC); if (r > uFR) return r - uFR + 0.05;
  float d = 1e5;
  int nf = int(uNF);
  for (int i = ZERO; i < 32; i++) {
    if (i >= nf) break;
    vec3 c = vec3(uF[i * 4], uF[i * 4 + 1], uF[i * 4 + 2]); float s = uF[i * 4 + 3];
    float rad = 0.03 + 0.04 * fract(s * 3.7);
    vec3 q = p - c;
    float e = sdEllipsoid(q, vec3(rad * 1.3, rad, rad * 0.9)) + 0.012 * (noise3(q * 80. + s) - 0.5);
    if (e < d) { d = e; gFood = fract(s * 7.13); }
  }
  return d * 0.8;
}
float map(vec3 p){
  vec3 lu, ll; float tu, tl;
  float du = ARCHD(p, true, lu, tu), dl = ARCHD(p, false, ll, tl);
  float d = du; gMat = 1.; gLoc = lu; gTip = tu;
  if (dl < d) { d = dl; gLoc = ll; gTip = tl + 10.; }
  float gu = gumD(p, true), gl = gumD(p, false);
  if (gu < d) { d = gu; gMat = 3.; }
  if (gl < d) { d = gl; gMat = 3.; }
  // brackets and wires (both arches)
  if (uBraces > 0.001) {
    for (int a = ZERO; a < 2; a++) {
      bool up = a == 0;
      float R = up ? RU : RL;
      vec3 c = vec3(abs(p.x), p.y, p.z + RU);
      float rr = length(c.xz), th = atan(c.x, c.z);
      float yw = up ? YWU : YWL;
      if (abs(p.y - yw) < 0.35) {
        for (int i = ZERO; i < 5; i++) {
          vec4 T = up ? UT[i] : LT[i];
          if (abs(th - T.x) * rr > 0.4) continue;
          vec3 dir = vec3(sin(T.x), 0., cos(T.x)), tg = vec3(cos(T.x), 0., -sin(T.x));
          vec3 rel = vec3(c.x, 0., c.z);
          float vb = up ? -yw : yw + 1.62;
          vec3 q = vec3(dot(rel, tg), up ? -p.y : p.y + 1.62, dot(rel, dir) - R + 0.01);
          vec2 bt = bracket(q, vb, T.y * 0.4);
          if (bt.x < d) { d = bt.x; gMat = 2.; }
          if (bt.y < d) { d = bt.y; gMat = 6.; }
        }
        float thMax = (up ? UT[4].x : LT[4].x) + 0.08;
        float wire = length(vec2(rr - (R + 0.13), p.y - yw)) - 0.026;
        wire = max(wire, (th - thMax) * rr);
        if (wire < d) { d = wire; gMat = 2.; }
      }
    }
  }
  if (uNF > 0.5) { float f = foodD(p); if (f < d) { d = f; gMat = 4.; } }
  return d;
}
float march(vec3 ro, vec3 rd, float tmax){ float t = 0.; int n = int(uSteps); for (int i = ZERO; i < 400; i++) { if (i >= n) break; float d = map(ro + rd * t); if (abs(d) < 0.00015 * t + 0.00006) return t; t += d * 0.8; if (t > tmax) break; } float dl = map(ro + rd * t); return (t < tmax && dl < 0.004) ? t : -1.; }
vec3 calcNormal(vec3 p){ vec3 n = vec3(0.); for (int i = ZERO; i < 4; i++) { vec3 e = 0.5773 * (2.0 * vec3((((i + 3) >> 1) & 1), ((i >> 1) & 1), (i & 1)) - 1.0); n += e * map(p + e * 0.0007); } return normalize(n); }
float calcAO(vec3 p, vec3 n){ float occ = 0., sca = 1.; for (int i = ZERO; i < 5; i++) { float h = 0.01 + 0.1 * float(i) / 4.; occ += (h - map(p + h * n)) * sca; sca *= 0.95; } return clamp(1. - 3. * occ, 0., 1.); }
vec3 lightIt(vec3 base, vec3 p, vec3 n, vec3 rd, float wrap, float specPow, float specAmt, float envAmt, float f0, float ao){
  float dif = clamp((dot(n, L1) + wrap) / (1. + wrap), 0., 1.);
  float fill = clamp(dot(n, L3) * 0.5 + 0.5, 0., 1.);
  vec3 h = normalize(L1 - rd);
  float fr = fresnel(dot(n, -rd), f0);
  float sp = pow(clamp(dot(n, h), 0., 1.), specPow) * specAmt * fr * 8.;
  float rim = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.) * clamp(dot(n, L2) * 0.7 + 0.3, 0., 1.);
  vec3 c = base * (0.07 + 0.92 * dif * vec3(1.0, 0.93, 0.85) + 0.14 * fill * vec3(0.6, 0.6, 1.0)) * ao;
  c += sp * vec3(1.0, 0.96, 0.9);
  c += envRefl(reflect(rd, n)) * envAmt * fr * ao;
  c += rim * vec3(0.55, 0.45, 1.0) * 0.5 * ao;
  return c;
}
vec3 render(vec2 fc){
  vec2 uv = (2. * fc - uRes) / uRes.y;
  mat3 cam = camMat(uRo, uTa, uRoll);
  vec3 rd = cam * normalize(vec3(uv, uFov));
  vec3 bg = bgCol(uv);
  float t = march(uRo, rd, 16.);
  if (t < 0.) return bg;
  for (int i = ZERO; i < 3; i++) t += map(uRo + rd * t) * 0.9;
  vec3 p = uRo + rd * t;
  map(p); float mat = gMat; vec3 loc = gLoc; float ff = gFood; float tip = gTip;
  vec3 n = calcNormal(p);
  float ao = calcAO(p, n);
  vec3 base; vec3 emis = vec3(0.); float wrap = 0.4, spw = 60., sa = 0.5, ea = 0.2, f0 = 0.04;
  if (mat < 1.5) {                                 // enamel
    float k = clamp(loc.y / 1.0, 0., 1.);
    base = mix(vec3(0.9, 0.8, 0.62), vec3(0.93, 0.9, 0.85), smoothstep(0.0, 0.3, k));
    base = mix(base, vec3(0.8, 0.85, 0.94), smoothstep(0.78, 1.0, k) * 0.55);           // translucent incisal edge
    // gunk collects on the gum side of each bracket
    bool lowr = tip > 9.5; int ti = int(mod(tip, 10.));
    float Wt = lowr ? LT[ti].y : UT[ti].y, vb = lowr ? YWL + 1.62 : -YWU;
    vec2 rq = abs(vec2(loc.x, loc.y - vb + 0.03)) - vec2(Wt * 0.2 + 0.05, 0.19);
    float rd2 = length(max(rq, 0.)) + min(max(rq.x, rq.y), 0.);
    float g = uGunk * (smoothstep(0.08, 0.0, rd2) * (0.55 + 0.45 * noise3(p * 60.)) + smoothstep(0.14, 0.02, loc.y) * 0.7) * step(loc.z, 0.08);
    base = mix(base, vec3(0.93, 0.88, 0.66), clamp(g, 0., 0.85));
    wrap = 0.25; spw = 160.; sa = mix(1.3, 0.3, g); ea = mix(0.75, 0.15, g); f0 = 0.06;
    float thr = pow(clamp(dot(rd, -L2) * 0.5 + 0.5, 0., 1.), 3.);
    emis = base * vec3(1.0, 0.85, 0.7) * thr * 0.25 * k;
  } else if (mat < 2.5) {                          // stainless steel: dark base, bright reflections
    base = vec3(0.3, 0.31, 0.34); wrap = 0.1; spw = 260.; sa = 2.6; ea = 2.2; f0 = 0.6;
  } else if (mat < 3.5) {                          // gum
    vec3 bn = vec3(noise3(p * 90.), noise3(p * 90. + 7.1), noise3(p * 90. + 3.7)) - 0.5;
    n = normalize(n + bn * 0.18);
    base = vec3(0.8, 0.32, 0.42); wrap = 0.6; spw = 60.; sa = 0.5; ea = 0.18; f0 = 0.03;
    float yy = p.y > -0.8 ? p.y : -(p.y + 1.62), thh = atan(abs(p.x), p.z + RU);
    float fadeG = smoothstep(0.62, 0.15, yy) * smoothstep(1.45, 1.0, thh);
    base *= fadeG; base = mix(vec3(0.05, 0.02, 0.05), base, fadeG);
    float sss = pow(clamp(dot(rd, -L2) * 0.5 + 0.5, 0., 1.), 2.);
    emis = base * vec3(1.0, 0.3, 0.3) * (0.14 + 0.3 * sss);
  } else if (mat < 4.5) {                          // food: bread, meat, greens
    base = ff < 0.45 ? vec3(0.86, 0.66, 0.36) : ff < 0.8 ? vec3(0.52, 0.26, 0.14) : vec3(0.3, 0.6, 0.2);
    base *= 0.85 + 0.3 * noise3(p * 120.);
    wrap = 0.5; spw = 30.; sa = 0.2; ea = 0.06;
  } else {                                         // elastic ligature
    base = mix(vec3(0.55, 0.3, 1.0), vec3(1.0, 0.3, 0.62), uTieHue); wrap = 0.5; spw = 90.; sa = 1.2; ea = 0.5; f0 = 0.05;
    emis = base * 0.22;
  }
  vec3 col = lightIt(base, p, n, rd, wrap, spw, sa, ea, f0, ao) + emis;
  col = mix(col, bg, 1. - exp(-0.004 * t * t));
  return col;
}`;

  // ================================================================= shared pieces for the prop worlds ============
  const HEAD = `
#define ZERO min(int(uTime), 0)
uniform float uSteps;
float gMat; vec3 gLoc; float gBug; float gNoBug = 0.;
`;
  const RM = `
float march(vec3 ro, vec3 rd, float tmax){ float t = 0.; int n = int(uSteps); for (int i = ZERO; i < 400; i++) { if (i >= n) break; float d = map(ro + rd * t); if (abs(d) < 0.00015 * t + 0.00006) return t; t += d * 0.8; if (t > tmax) break; } float dl = map(ro + rd * t); return (t < tmax && dl < 0.004) ? t : -1.; }
vec3 calcNormal(vec3 p){ vec3 n = vec3(0.); for (int i = ZERO; i < 4; i++) { vec3 e = 0.5773 * (2.0 * vec3((((i + 3) >> 1) & 1), ((i >> 1) & 1), (i & 1)) - 1.0); n += e * map(p + e * 0.0008); } return normalize(n); }
float calcAO(vec3 p, vec3 n){ gNoBug = 1.; float occ = 0., sca = 1.; for (int i = ZERO; i < 5; i++) { float h = 0.01 + 0.12 * float(i) / 4.; occ += (h - map(p + h * n)) * sca; sca *= 0.95; } gNoBug = 0.; return clamp(1. - 3. * occ, 0., 1.); }
vec3 lightIt(vec3 base, vec3 p, vec3 n, vec3 rd, float wrap, float specPow, float specAmt, float envAmt, float f0, float ao){
  float dif = clamp((dot(n, L1) + wrap) / (1. + wrap), 0., 1.);
  float fill = clamp(dot(n, L3) * 0.5 + 0.5, 0., 1.);
  vec3 h = normalize(L1 - rd);
  float fr = fresnel(dot(n, -rd), f0);
  float sp = pow(clamp(dot(n, h), 0., 1.), specPow) * specAmt * fr * 8.;
  float rim = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.) * clamp(dot(n, L2) * 0.7 + 0.3, 0., 1.);
  vec3 c = base * (0.07 + 0.92 * dif * vec3(1.0, 0.93, 0.85) + 0.14 * fill * vec3(0.6, 0.6, 1.0)) * ao;
  c += sp * vec3(1.0, 0.96, 0.9);
  c += envRefl(reflect(rd, n)) * envAmt * fr * ao;
  c += rim * vec3(0.55, 0.45, 1.0) * 0.5 * ao;
  return c;
}
`;
  // bacteria: uB = (x, y, z, phase) x 32; uBX = (kind, dead) x 32. kind 0 bad rod (green), 1 good diplococcus (teal),
  // 2 cavity-type coccus chain (lime); dead 0..1 greys and deflates.
  const BUGS = `
uniform float uNB; uniform float uB[128]; uniform float uBX[64]; uniform vec3 uBC; uniform float uBR; uniform float uBugS;
float bugsD(vec3 p){
  float r = length(p - uBC); if (r > uBR) return r - uBR + 0.05;
  float d = 1e5; int nb = int(uNB);
  for (int i = ZERO; i < 32; i++) {
    if (i >= nb) break;
    vec3 c = vec3(uB[i * 4], uB[i * 4 + 1], uB[i * 4 + 2]); float ph = uB[i * 4 + 3];
    float kind = uBX[i * 2], dead = uBX[i * 2 + 1];
    vec3 ax = normalize(vec3(cos(ph * 2.1), 0.35 * sin(ph * 1.3), sin(ph * 2.1)));
    float s = uBugS * (0.85 + 0.3 * fract(ph * 7.31)) * (1. - 0.22 * dead);
    float e;
    if (kind < 0.5) e = sdCapsule(p, c - ax * s * 1.5, c + ax * s * 1.5, s * 0.62);
    else if (kind < 1.5) e = min(length(p - c - ax * s * 0.55) - s * 0.72, length(p - c + ax * s * 0.55) - s * 0.72);
    else e = min(min(length(p - c) - s * 0.6, length(p - c - ax * s * 1.1) - s * 0.6), length(p - c + ax * s * 1.1) - s * 0.6);
    e += dead * 0.25 * s * (noise3(p / s * 3.) - 0.5);
    if (e < d) { d = e; gBug = float(i); }
  }
  return d;
}
vec3 bugColor(int i){
  float kind = uBX[i * 2], dead = uBX[i * 2 + 1];
  vec3 c = kind < 0.5 ? vec3(0.16, 0.72, 0.4) : kind < 1.5 ? vec3(0.12, 0.66, 0.72) : vec3(0.55, 0.8, 0.16);
  return mix(c, vec3(0.34, 0.33, 0.36), dead);
}
`;

  // ---------------------------------------------------------------- BOTTLE world: generic bottles on a dark studio floor
  // Two generic, unbranded mouthwash bottles (local: base at y = 0, height 1.9) with a printed label from a texture (unit 0:
  // left half ALCOHOL, right half ALCOHOL-FREE), liquid seen through the plastic (thickness-based absorption), a ribbed cap,
  // a dosing cup, and a pour stream (quadratic curve, capsule chain). 1 unit = 10 cm.
  const BOTTLE = COMMON + HEAD + `
uniform sampler2D uLabel;
uniform vec4 uA; uniform vec4 uB2;      // bottle A / B: (x, z, tilt about z, visible 0/1)
uniform float uAY; uniform float uBY;   // lift
uniform vec3 uLiqA; uniform vec3 uLiqB; uniform float uLevA; uniform float uLevB;
uniform float uCupOn; uniform vec3 uCup; uniform float uCupFill;
uniform float uStream; uniform vec3 uS0; uniform vec3 uS1; uniform vec3 uS2;
float gSide; float gPart;
mat2 R2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec3 toLocal(vec3 p, vec4 B, float lift){ vec3 q = p - vec3(B.x, lift + 0.9, B.y); q.xy = R2(-B.z) * q.xy; q.y += 0.9; return q; }
float sdBottleL(vec3 q, out float part){
  float waist = 0.03 * exp(-pow((q.y - 0.72) / 0.2, 2.));
  float body = sdRoundBox(q - vec3(0., 0.66, 0.), vec3(0.34 - waist, 0.64, 0.22 - waist * 0.6), 0.13);
  float d = smin(body, sdEllipsoid(q - vec3(0., 1.28, 0.), vec3(0.3, 0.22, 0.2)), 0.08);
  d = smin(d, sdCylinder(q - vec3(0., 1.5, 0.), 0.1, 0.1), 0.05);
  float cap = sdCylinder(q - vec3(0., 1.7, 0.), 0.13, 0.14) - 0.012;
  cap += 0.003 * smoothstep(0.2, 0.9, sin(atan(q.z, q.x) * 44.)) * step(q.y, 1.8);
  part = 0.; if (cap < d) { d = cap; part = 1.; }
  return d;
}
float streamD(vec3 p){
  float d = 1e5; vec3 prev = uS0;
  for (int i = ZERO; i < 10; i++) {
    float u = float(i + 1) / 10.;
    vec3 q = (1. - u) * (1. - u) * uS0 + 2. * (1. - u) * u * uS1 + u * u * uS2;
    float wob = 0.004 * sin(uTime * 30. + u * 20.);
    d = min(d, sdCapsule(p, prev, q, 0.022 + wob - 0.008 * u));
    prev = q;
  }
  return d;
}
float map(vec3 p){
  float d = p.y + 0.0; gMat = 0.;                                   // studio floor
  float part;
  if (uA.w > 0.5) { vec3 q = toLocal(p, uA, uAY); float bb = length(q - vec3(0., 0.9, 0.)) - 1.1; float e = bb > 0.1 ? bb : sdBottleL(q, part); if (e < d) { d = e; gMat = part > 0.5 ? 2. : 1.; gLoc = q; gSide = 0.; } }
  if (uB2.w > 0.5) { vec3 q = toLocal(p, uB2, uBY); float bb = length(q - vec3(0., 0.9, 0.)) - 1.1; float e = bb > 0.1 ? bb : sdBottleL(q, part); if (e < d) { d = e; gMat = part > 0.5 ? 2. : 1.; gLoc = q; gSide = 1.; } }
  if (uCupOn > 0.5) {
    vec3 q = p - uCup;
    float cup = max(sdCylinder(q - vec3(0., 0.12, 0.), 0.12, 0.15 - 0.02 * (q.y / 0.24)), -sdCylinder(q - vec3(0., 0.16, 0.), 0.12, 0.13 - 0.02 * (q.y / 0.24)));
    if (cup < d) { d = cup; gMat = 3.; gLoc = q; }
    float liq = max(sdCylinder(q - vec3(0., 0.03, 0.), uCupFill * 0.2, 0.128), q.y - 0.03 - uCupFill * 0.2);
    if (uCupFill > 0.01 && liq < d) { d = liq; gMat = 4.; gLoc = q; }
  }
  if (uStream > 0.5) { float s = streamD(p); if (s < d) { d = s; gMat = 4.; } }
  return d;
}
` + RM + `
vec3 shadeBottle(vec3 p, vec3 n, vec3 rd, vec3 q, float side, vec2 uv, vec3 bgc){
  vec3 liq = side < 0.5 ? uLiqA : uLiqB; float lev = side < 0.5 ? uLevA : uLevB;
  // label: front face band (the texture's left or right half)
  float lx = q.x / 0.34, ly = (q.y - 0.42) / 0.62;
  if (abs(lx) < 0.98 && ly > 0. && ly < 1. && q.z > 0.1) {
    vec3 tc = texture(uLabel, vec2((lx * 0.5 + 0.5) * 0.5 + side * 0.5, 1. - ly)).rgb;
    tc = pow(tc, vec3(2.2));
    vec3 c = lightIt(tc, p, n, rd, 0.4, 60., 0.35, 0.15, 0.04, 1.);
    return c;
  }
  // thickness of the bottle along the view ray (march inside)
  float th = 0.; vec3 pp = p + rd * 0.01;
  for (int i = ZERO; i < 24; i++) { float dd = map(pp); if (dd > 0.002) break; float st = max(-dd, 0.02); pp += rd * st; th += st; }
  float filled = step(q.y, lev);
  vec3 absorb = exp(-th * (1. - liq) * mix(1.2, 7.0, filled));
  vec3 trans = (bgc * 0.6 + vec3(0.12, 0.1, 0.16)) * absorb + liq * filled * 0.45 * (1. - absorb.g);
  float fr = fresnel(dot(n, -rd), 0.05);
  vec3 refl = envRefl(reflect(rd, n)) * 1.4;
  vec3 h = normalize(L1 - rd);
  float sp = pow(clamp(dot(n, h), 0., 1.), 240.) * 6.;
  // meniscus line at the liquid level
  float men = smoothstep(0.012, 0., abs(q.y - lev)) * 0.6;
  return trans * (1. - fr) + refl * fr + sp + liq * men;
}
vec3 render(vec2 fc){
  vec2 uv = (2. * fc - uRes) / uRes.y;
  mat3 cam = camMat(uRo, uTa, uRoll);
  vec3 rd = cam * normalize(vec3(uv, uFov));
  vec3 bg = bgCol(uv);
  float t = march(uRo, rd, 20.);
  if (t < 0.) return bg;
  for (int i = ZERO; i < 2; i++) t += map(uRo + rd * t) * 0.9;
  vec3 p = uRo + rd * t;
  map(p); float mat = gMat; vec3 q = gLoc; float side = gSide;
  vec3 n = calcNormal(p);
  vec3 col;
  if (mat < 0.5) {                               // glossy dark floor with a soft reflection
    vec3 r = reflect(rd, vec3(0., 1., 0.));
    float t2 = march(p + vec3(0., 0.002, 0.), r, 6.);
    vec3 rc = bgCol(uv) * 0.4;
    if (t2 > 0.) { vec3 p2 = p + r * t2; map(p2); rc = gMat < 2.5 && gMat > 0.5 ? (gSide < 0.5 ? uLiqA : uLiqB) * 0.35 + 0.08 : vec3(0.1); rc *= exp(-t2 * 1.2); }
    float fr = fresnel(dot(vec3(0., 1., 0.), -rd), 0.04);
    float fade = exp(-0.08 * dot(p.xz, p.xz));
    col = mix(vec3(0.012, 0.01, 0.022), rc, 0.35 + 0.65 * fr) * fade + bg * (1. - fade);
    col += vec3(0.3, 0.2, 0.6) * 0.06 * exp(-dot(p.xz, p.xz) * 0.6);
    return col;
  }
  if (mat < 1.5) col = shadeBottle(p, n, rd, q, side, uv, bg);
  else if (mat < 2.5) col = lightIt(vec3(0.92, 0.92, 0.95), p, n, rd, 0.4, 90., 0.6, 0.35, 0.05, calcAO(p, n));
  else if (mat < 3.5) { float fr = fresnel(dot(n, -rd), 0.05); col = bg * 0.3 + envRefl(reflect(rd, n)) * fr * 1.5 + vec3(0.9, 0.95, 1.0) * 0.08; }
  else { vec3 liq = uStream > 0.5 && length(p - uS2) > 0.3 ? uLiqA : uLiqA; float fr = fresnel(dot(n, -rd), 0.04); col = liq * 0.5 + envRefl(reflect(rd, n)) * fr * 1.6 + pow(clamp(dot(n, normalize(L1 - rd)), 0., 1.), 120.) * 3.; }
  return col;
}`;

  // ---------------------------------------------------------------- MUCOSA world: a macro of the tongue surface
  // Filiform-like bumps on a soft surface (y = 0 plane, x/z across), wet film (uWet: gloss + droplets) drying into a
  // matte, cracked surface (uDry: Voronoi crack grooves). Bacteria from BUGS can sit on it.
  const MUCOSA = COMMON + HEAD + BUGS + `
uniform float uWet; uniform float uDry; uniform float uWash; uniform float uWashX;
vec2 vor(vec2 x){
  vec2 n = floor(x), f = fract(x); float d1 = 8., d2 = 8.;
  for (int j = ZERO - 1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)), o = hash22(n + g), r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(sqrt(d1), sqrt(d2) - sqrt(d1));
}
float surf(vec3 p){
  vec2 cp = p.xz / 0.06; vec2 id = floor(cp), f = fract(cp);
  float bump = 0.;
  for (int j = ZERO - 1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)), o = 0.5 + (hash22(id + g) - 0.5) * 0.7, r = g + o - f;
    float hh = 0.014 + 0.016 * hash12((id + g) * 1.7);
    bump = max(bump, hh * pow(max(0., 1. - dot(r, r) / 0.42), 2.2));
  }
  float h = bump + 0.008 * noise3(vec3(p.xz * 6., 0.));
  if (uDry > 0.001) { float e = vor(p.xz * 3.2).y; h -= uDry * 0.03 * smoothstep(0.1, 0.0, e); h -= uDry * 0.006; }
  return p.y - h;
}
float map(vec3 p){
  float d = surf(p) * 0.55; gMat = 0.;
  if (uNB > 0.5 && gNoBug < 0.5) { float b = bugsD(p); if (b < d) { d = b; gMat = 5.; } }
  return d;
}
` + RM + `
vec3 render(vec2 fc){
  vec2 uv = (2. * fc - uRes) / uRes.y;
  mat3 cam = camMat(uRo, uTa, uRoll);
  vec3 rd = cam * normalize(vec3(uv, uFov));
  vec3 bg = bgCol(uv);
  float t = march(uRo, rd, 12.);
  if (t < 0.) return bg;
  for (int i = ZERO; i < 2; i++) t += map(uRo + rd * t) * 0.9;
  vec3 p = uRo + rd * t;
  map(p); float mat = gMat; float bi = gBug;
  vec3 n = calcNormal(p);
  float ao = calcAO(p, n);
  vec3 col;
  if (mat < 0.5) {
    float h = p.y;
    vec3 base = mix(vec3(0.62, 0.16, 0.26), vec3(0.95, 0.58, 0.64), smoothstep(-0.005, 0.028, h));
    base = mix(base, vec3(0.9, 0.78, 0.76), uDry * 0.35);                                  // dry: paler, chalky
    float e = uDry > 0.001 ? vor(p.xz * 3.2).y : 1.;
    base = mix(base, vec3(0.4, 0.08, 0.14), uDry * smoothstep(0.08, 0.0, e));             // crack floors
    float wet = uWet * (1. - uDry);
    col = lightIt(base, p, n, rd, 0.6, mix(20., 180., wet), mix(0.1, 2.2, wet), mix(0.02, 0.9, wet), 0.03, ao);
    float sss = pow(clamp(dot(rd, -L2) * 0.5 + 0.5, 0., 1.), 2.);
    col += base * vec3(1.0, 0.35, 0.35) * (0.12 + 0.25 * sss) * (1. - 0.5 * uDry);
    if (uWash > 0.001 && p.x < uWashX) {                                                   // alcohol rinse film
      float k = uWash * smoothstep(uWashX, uWashX - 0.25, p.x);
      col = mix(col, col * vec3(1.2, 0.85, 0.45) + vec3(0.12, 0.07, 0.0), 0.6 * k);
      col += vec3(1.0, 0.85, 0.5) * 0.35 * uWash * smoothstep(0.03, 0.0, abs(p.x - uWashX + 0.02)) * (0.6 + 0.4 * noise3(p * 40. + uTime));
    }
  } else {
    int i = int(bi);
    vec3 base = bugColor(i); float dead = uBX[i * 2 + 1];
    col = lightIt(base, p, n, rd, 0.5, mix(90., 20., dead), mix(1.0, 0.2, dead), mix(0.35, 0.05, dead), 0.05, ao);
    col += base * (1. - dead) * 0.18;
  }
  col = mix(col, bg, 1. - exp(-0.02 * t * t));
  return col;
}`;

  // ---------------------------------------------------------------- MINTS world: a xylitol tablet and a sugary swirl candy
  // On a glossy dark floor. Tablet (matte white, bevelled, centre score) at uTabP; swirl candy (glossy red/white pinwheel,
  // hard sugar) at uSwP with bites (uBite[8] spheres subtracted), cavity-type bacteria (BUGS kind 2) swarming it.
  const MINTS = COMMON + HEAD + BUGS + `
uniform vec4 uTabP; uniform vec4 uSwP; uniform float uNBite; uniform float uBite[32]; uniform float uSpin;
mat2 R2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float tabletD(vec3 q){ vec2 w = vec2(length(q.xz) - 0.3, abs(q.y) - 0.035); float d = min(max(w.x, w.y), 0.) + length(max(w, 0.)) - 0.045; d = smax(d, -sdBox(q - vec3(0., 0.085, 0.), vec3(0.26, 0.012, 0.012)), 0.01); return d; }
float candyD(vec3 q){
  vec2 w = vec2(length(q.xz) - 0.28, abs(q.y) - 0.05); float d = min(max(w.x, w.y), 0.) + length(max(w, 0.)) - 0.07;
  int nb = int(uNBite);
  for (int i = ZERO; i < 8; i++) { if (i >= nb) break; vec3 c = vec3(uBite[i * 4], uBite[i * 4 + 1], uBite[i * 4 + 2]); d = smax(d, -(length(q - c) - uBite[i * 4 + 3]), 0.015); }
  return d;
}
float map(vec3 p){
  float d = p.y; gMat = 0.;
  if (uTabP.w > 0.5) { vec3 q = p - uTabP.xyz; q.xz = R2(uSpin) * q.xz; q.yz = R2(0.18) * q.yz; float e = tabletD(q); if (e < d) { d = e; gMat = 1.; gLoc = q; } }
  if (uSwP.w > 0.5) { vec3 q = p - uSwP.xyz; q.xz = R2(-uSpin * 0.8) * q.xz; q.yz = R2(0.18) * q.yz; float e = candyD(q); if (e < d) { d = e; gMat = 2.; gLoc = q; } }
  if (uNB > 0.5 && gNoBug < 0.5) { float b = bugsD(p); if (b < d) { d = b; gMat = 5.; } }
  return d;
}
` + RM + `
vec3 render(vec2 fc){
  vec2 uv = (2. * fc - uRes) / uRes.y;
  mat3 cam = camMat(uRo, uTa, uRoll);
  vec3 rd = cam * normalize(vec3(uv, uFov));
  vec3 bg = bgCol(uv);
  float t = march(uRo, rd, 12.);
  if (t < 0.) return bg;
  for (int i = ZERO; i < 2; i++) t += map(uRo + rd * t) * 0.9;
  vec3 p = uRo + rd * t;
  map(p); float mat = gMat; vec3 q = gLoc; float bi = gBug;
  vec3 n = calcNormal(p);
  float ao = calcAO(p, n);
  vec3 col;
  if (mat < 0.5) {
    float fr = fresnel(dot(vec3(0., 1., 0.), -rd), 0.04);
    float fade = exp(-0.5 * dot(p.xz - vec2(0., 0.), p.xz));
    col = vec3(0.01, 0.009, 0.02) * ao + envRefl(reflect(rd, vec3(0., 1., 0.))) * fr * 0.25;
    col += vec3(0.3, 0.2, 0.6) * 0.05 * fade;
    col = mix(bg, col, fade);
    return col;
  }
  if (mat < 1.5) {                                  // pressed tablet: matte, speckled
    vec3 base = vec3(0.9, 0.93, 0.94) * (0.9 + 0.12 * noise3(q * 160.));
    base = mix(base, vec3(0.55, 0.85, 0.8), step(0.86, noise3(q * 90. + 4.)) * 0.5);
    col = lightIt(base, p, n, rd, 0.5, 30., 0.25, 0.08, 0.04, ao);
    col += base * 0.05;
  } else if (mat < 2.5) {                           // swirl candy: glossy, pinwheel stripes
    float a = atan(q.z, q.x) + length(q.xz) * 4.;
    float stripe = smoothstep(-0.15, 0.15, sin(a * 4.));
    vec3 base = mix(vec3(0.97, 0.95, 0.93), vec3(0.85, 0.06, 0.12), stripe);
    col = lightIt(base, p, n, rd, 0.4, 220., 2.4, 1.1, 0.05, ao);
    float th = pow(clamp(dot(rd, -L2) * 0.5 + 0.5, 0., 1.), 2.);
    col += base * vec3(1.0, 0.5, 0.5) * th * 0.25;
  } else {
    int i = int(bi); vec3 base = bugColor(i);
    col = lightIt(base, p, n, rd, 0.5, 90., 1.0, 0.35, 0.05, ao) + base * 0.18;
  }
  col = mix(col, bg, 1. - exp(-0.01 * t * t));
  return col;
}`;

  // label texture for the bottles: left half ALCOHOL, right half ALCOHOL-FREE (plain type, no brand, no claims)
  function labelCanvas() {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d');
    const half = (x0, bgc, band, big, bigSize) => {
      g.fillStyle = bgc; g.fillRect(x0, 0, 1024, 1024);
      g.fillStyle = band; g.fillRect(x0, 90, 1024, 30); g.fillRect(x0, 900, 1024, 30);
      const txt = (s, y, px, col, tr) => { g.font = `700 ${px}px Bahnschrift, "Segoe UI", Arial`; try { g.fontStretch = 'condensed'; g.letterSpacing = tr + 'px'; } catch (e) {} g.fillStyle = col; g.textAlign = 'center'; g.fillText(s, x0 + 512, y); };
      txt('MOUTHWASH', 330, 96, 'rgba(40,34,30,0.7)', 18);
      txt(big, 600, bigSize, '#1f1a18', 4);
    };
    half(0, '#f1ece2', '#c9761c', 'ALCOHOL', 190);
    half(1024, '#eef6f2', '#2fb39f', 'ALCOHOL-FREE', 124);
    return c;
  }
  function bindTexture(r, canvas) {
    const gl = r.gl, tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }
  // bacteria packing for BUGS: list of { p, ph, kind, dead }
  function packBugsX(list) {
    const B = new Float32Array(128), X = new Float32Array(64); let n = 0, cx = 0, cy = 0, cz = 0;
    for (const b of list) { if (n >= 32) break; B.set([b.p[0], b.p[1], b.p[2], b.ph], n * 4); X.set([b.kind || 0, b.dead || 0], n * 2); cx += b.p[0]; cy += b.p[1]; cz += b.p[2]; n++; }
    if (!n) return { uNB: 0, uB: B, uBX: X, uBC: [0, 50, 0], uBR: 0.01 };
    cx /= n; cy /= n; cz /= n; let r = 0;
    for (let i = 0; i < n; i++) r = Math.max(r, Math.hypot(B[i * 4] - cx, B[i * 4 + 1] - cy, B[i * 4 + 2] - cz));
    return { uNB: n, uB: B, uBX: X, uBC: [cx, cy, cz], uBR: r + 0.12 };
  }

  // ---------------------------------------------------------------- camera helpers (JS side of camMat)
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  // world point -> design px (1920x1080) for a camera {ro, ta, roll, fov}
  function proj(c, P, W = 1920, H = 1080) {
    const cw = norm([c.ta[0] - c.ro[0], c.ta[1] - c.ro[1], c.ta[2] - c.ro[2]]), cp = [Math.sin(c.roll || 0), Math.cos(c.roll || 0), 0];
    const cu = norm(cross(cw, cp)), cv = cross(cu, cw), d = [P[0] - c.ro[0], P[1] - c.ro[1], P[2] - c.ro[2]];
    const x = dot(d, cu), y = dot(d, cv), z = dot(d, cw);
    const ux = (c.fov * x) / z, uy = (c.fov * y) / z;
    return [W / 2 + ux * H / 2, H / 2 - uy * H / 2, z];
  }
  // a shot: two camera states and a move over [t0, t1] (inOutSine), orbiting slightly for life
  function shotCam(s, t) {
    const u = Math.min(1, Math.max(0, (t - s.t0) / Math.max(0.01, s.t1 - s.t0))), e = -(Math.cos(Math.PI * u) - 1) / 2;
    return { ro: lerp3(s.a.ro, s.b.ro, e), ta: lerp3(s.a.ta, s.b.ta, e), roll: lerp(s.a.roll || 0, s.b.roll || 0, e), fov: lerp(s.a.fov || 2, s.b.fov || 2, e) };
  }
  // pick the shot for time t from a list of {from, a, b}; hard cuts between shots; each shot moves over its own span
  function pickShot(shots, t, end) {
    let k = 0; for (let i = 0; i < shots.length; i++) if (t >= shots[i].from) k = i;
    const s = shots[k], t1 = k + 1 < shots.length ? shots[k + 1].from : end;
    return { i: k, cam: shotCam({ t0: s.from, t1, a: s.a, b: s.b }, t), local: t - s.from, span: t1 - s.from };
  }
  function camUniforms(c) { return { uRo: c.ro, uTa: c.ta, uRoll: c.roll || 0, uFov: c.fov || 2 }; }

  // full uniform set for the MOLARS shader with defaults; o overrides
  const EMPTY_B = new Float32Array(128);
  function molarsU(t, cam, o = {}) {
    return Object.assign({
      uTime: t, uSteps: 220, uGlow: 1, uSpotX: 0,
      uRed: 0, uSwell: 0, uDrop: 0, uPocket: 0, uPlaque: 0, uCut: 0, uCutZ: 0, uPulse: 0,
      uFood: 0, uFoodP: [0, 5, 0], uFoodS: 1,
      uNB: 0, uB: EMPTY_B, uBC: [0, 5, 0], uBR: 0.01, uBugGlow: 0, uBugS: 0.018,
      uFloss: 0, uFV: [0, 5, 0], uFL: [0, 5, 0], uFR: [0, 5, 0],
    }, camUniforms(cam), o);
  }
  // pack bacteria [{p:[x,y,z], ph}] into the uB array; returns { uNB, uB, uBC, uBR }
  function packBugs(list) {
    const B = new Float32Array(128); let n = 0, cx = 0, cy = 0, cz = 0;
    for (const b of list) { if (n >= 32) break; B[n * 4] = b.p[0]; B[n * 4 + 1] = b.p[1]; B[n * 4 + 2] = b.p[2]; B[n * 4 + 3] = b.ph; cx += b.p[0]; cy += b.p[1]; cz += b.p[2]; n++; }
    if (!n) return { uNB: 0, uB: B, uBC: [0, 5, 0], uBR: 0.01 };
    cx /= n; cy /= n; cz /= n; let r = 0;
    for (let i = 0; i < n; i++) r = Math.max(r, Math.hypot(B[i * 4] - cx, B[i * 4 + 1] - cy, B[i * 4 + 2] - cz));
    return { uNB: n, uB: B, uBC: [cx, cy, cz], uBR: r + 0.08 };
  }
  // 2D depth layers drawn over a 3D frame --------------------------------------------------------------------
  // soft out-of-focus particles (saliva droplets / dust) in front of the lens: big, blurred, drifting
  function bokeh(ctx, api, t, o = {}) {
    const rnd = api.rand('bokeh' + (o.seed || 1)), n = o.n || 9;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < n; i++) {
      const x0 = rnd() * 1920, y0 = rnd() * 1080, r = (o.r || 60) * (0.5 + rnd()), sp = 8 + rnd() * 18, ph = rnd() * 6;
      const x = ((x0 + t * sp * (o.dx ?? 1)) % 2100 + 2100) % 2100 - 90, y = y0 - t * sp * 0.4 + Math.sin(t * 0.6 + ph) * 12;
      const g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
      const c = o.color || '200,180,255';
      g.addColorStop(0, `rgba(${c},${(o.a ?? 0.07) * (0.6 + 0.4 * Math.sin(ph))})`); g.addColorStop(0.85, `rgba(${c},${(o.a ?? 0.07) * 1.4})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // a volumetric-looking gas puff: layered blurred blobs, screen-blended (x, y design px, s size, a alpha)
  function gas(ctx, api, x, y, s, a, seed, col = '185,227,90') {
    const rnd = api.rand('gas' + seed);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 7; i++) {
      const r = s * (0.3 + rnd() * 0.45), ox = (rnd() - 0.5) * s, oy = (rnd() - 0.5) * s * 0.6;
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, `rgba(${col},${a * 0.55})`); g.addColorStop(0.5, `rgba(${col},${a * 0.25})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function artistic(ctx, api) { api.text(ctx, '* ARTISTIC RENDERING', 1860, 60, { size: 20, color: api.P.faint, align: 'right', tracking: 2 }); }

  window.TEETH3D = { MOLARS, BRACES, BOTTLE, MUCOSA, MINTS, labelCanvas, bindTexture, packBugsX, COMMON, proj, shotCam, pickShot, camUniforms, norm, cross, dot, lerp3, molarsU, packBugs, bokeh, gas, artistic };
})();
