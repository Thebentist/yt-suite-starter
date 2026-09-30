/* Real-3D worlds for the `throat` group (ray-marched SDFs via api.gl, pipeline/motion/gl.js).
 *
 *   THROAT3D.TONSIL   macro of a palatine tonsil: lobulated wet surface with 7 crypts (real cavities), stones,
 *                     food particles, an optional cutaway plane through the hero crypt (3D cross-section).
 *   THROAT3D.TUNNEL   inside the mouth looking back: tongue (papillae, coated back), palate, the arch with the uvula,
 *                     both tonsils between their pillars, the back wall, the dark throat below.
 *   THROAT3D.ESO      the esophagus as a wet folded tube going down, with the ring valve (LES) at the bottom.
 *   THROAT3D.cam(api, ro, ta, fov) -> uniforms; THROAT3D.project(ro, ta, fov, p) -> [x, y] in design px.
 * Loaded after _lib.js with `// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js`.
 */
(function () {
  // ------------------------------------------------------------------ shared GLSL: camera + lighting helpers
  const COMMON = `
uniform vec3 uRo; uniform vec3 uTa; uniform float uFov; uniform float uRoll;
vec3 camRay(vec2 fc, out vec3 ro){ vec2 uv = (2. * fc - uRes) / uRes.y; ro = uRo; mat3 c = camMat(uRo, uTa, uRoll); return c * normalize(vec3(uv, uFov)); }
`;

  // ------------------------------------------------------------------ TONSIL macro
  // crypt k: opening centre (x, z), opening radius, depth scale. Hero crypt = 0 (at the origin).
  const TONSIL = COMMON + `
uniform float uSq;          // squeeze of the hero crypt (swallow)
uniform float uCut;         // 1 = cutaway: tissue removed where x < uCutX (a section through the hero crypt)
uniform float uCutX;
uniform vec4 uS0; uniform vec4 uS1; uniform vec4 uS2;   // stones: xyz + radius (radius 0 = none)
uniform float uP[40];        // 10 particles: xyz + radius
uniform float uRing;         // lime rings on the crypt openings
uniform float uRed;          // inflammation
uniform float uScratch;      // thin red scratches
uniform float uBleed;        // a small red bead
uniform float uHead;         // headlamp strength (inside the crypt)
uniform float uWet;          // water film (flosser / gargle)
uniform float uGlowStone;    // stone glow (highlight)
const int NC = 7;
const vec4 CR[7] = vec4[7](vec4(0., 0., .16, 1.), vec4(-1.05, -.85, .12, .8), vec4(.95, -1.05, .11, .75), vec4(1.25, .35, .13, .85),
                           vec4(-1.35, .55, .12, .8), vec4(.45, 1.25, .14, .9), vec4(-.55, 1.75, .12, .8));
float gMat; float gCutFace; float gK;
float crypt(vec3 p, int k){
  vec4 c = CR[k]; float sq = (k == 0) ? uSq : 0.;
  vec3 q = p - vec3(c.x, 0., c.y);
  float bend = 0.18 * c.w;
  q.x -= bend * smoothstep(0., -1.2, q.y) * sign(c.x + .3);
  float neck = sdCapsule(q, vec3(0., .4, 0.), vec3(0., -.45 * c.w, 0.), c.z * (1. - .35 * sq));
  float ch = sdEllipsoid(q - vec3(0., -.85 * c.w, 0.), vec3(c.z * 2.1, .55 * c.w, c.z * 2.0) * (1. - .45 * sq));
  float side = (k == 0) ? sdEllipsoid(q - vec3(-.26, -.62, .05), vec3(.1, .22, .1) * (1. - .4 * sq)) : 1e5;
  return min(smin(neck, ch, .12), side);
}
float stone(vec3 p, vec4 s, float seed){
  if (s.w <= 0.) return 1e5;
  vec3 q = p - s.xyz; float b = length(q) - s.w * 1.4; if (b > .2) return b;
  float d = sdEllipsoid(q, vec3(1., .82, .92) * s.w);
  return d + s.w * (.10 * (noise3(q / s.w * 2.3 + seed) - .5) + .05 * (noise3(q / s.w * 6. + seed) - .5));
}
float map(vec3 p){
  // lobulated surface: smooth union of lymphoid lobules over a base
  vec2 cell = floor(p.xz / .62);
  float d = p.y + .08;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = cell + vec2(float(i), float(j));
    vec2 c = (id + .5) * .62 + (hash22(id) - .5) * .3;
    float r = .3 + .1 * hash12(id + 4.1);
    d = smin(d, length(p - vec3(c.x, -.2 - .06 * hash12(id), c.y)) - r, .2);
  }
  gMat = 0.; gCutFace = 0.; gK = -1.;
  float cr = 1e5;
  for (int k = 0; k < NC; k++) { float ck = crypt(p, k); if (ck < cr) { cr = ck; gK = float(k); } }
  d = smax(d, -cr, .07);
  if (uCut > .5) { float cp = uCutX - p.x; if (cp > d) { d = cp; gCutFace = 1.; } }
  float st = min(stone(p, uS0, 1.), min(stone(p, uS1, 7.), stone(p, uS2, 13.)));
  if (st < d) { d = st; gMat = 1.; gCutFace = 0.; }
  for (int i = 0; i < 10; i++) {
    float r = uP[i * 4 + 3]; if (r <= 0.) continue;
    vec3 q = p - vec3(uP[i * 4], uP[i * 4 + 1], uP[i * 4 + 2]);
    float pd = length(q * vec3(1., 1.25, 1.)) - r + r * .25 * sin(q.x / r * 3. + float(i)) * sin(q.y / r * 2.7);
    if (pd < d) { d = pd; gMat = 2. + float(i); gCutFace = 0.; }
  }
  return d;
}
#include <raymarch>
float march2(vec3 ro, vec3 rd, float tmax){ float t = 0., d = 1.; for (int i = 0; i < RM_STEPS; i++){ d = map(ro + rd * t); if (abs(d) < RM_EPS * t + .0004) return t; t += d * RM_STEP; if (t > tmax) return -1.; } return abs(d) < .03 ? t : -1.; }
vec3 partCol(float i){ float h = hash12(vec2(i, 3.1)); return h < .4 ? vec3(.85, .58, .3) : h < .7 ? vec3(.9, .9, .72) : h < .85 ? vec3(.45, .75, .35) : vec3(.95, .82, .78); }
vec3 render(vec2 fc){
  vec3 ro; vec3 rd = camRay(fc, ro);
  vec3 fogCol = vec3(.045, .01, .03);
  float t = march2(ro, rd, 14.);
  if (t < 0.) return fogCol * (1. - .3 * rd.y);
  vec3 p = ro + rd * t; map(p);
  float mat = gMat, cutf = gCutFace, kk = gK;
  vec3 n = calcNormal(p);
  if (mat < .5 && cutf < .5) n = normalize(n + .1 * (vec3(noise3(p * 16.), noise3(p * 16. + 4.), noise3(p * 16. + 9.)) - .5));
  vec3 base;
  float depth = clamp(-p.y, 0., 2.);
  if (mat > 1.5) base = partCol(mat - 2.);
  else if (mat > .5) base = vec3(.9, .84, .66) * (.78 + .3 * noise3(p * 30.));
  else if (cutf > .5) {
    // cut face: lighter tissue with lymphoid follicles
    vec2 q = p.yz * 2.6 + vec2(.37, .71); vec2 ci = floor(q); float fd = 9.;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g2 = ci + vec2(float(i), float(j)); vec2 o = g2 + .5 + (hash22(g2) - .5) * .6; fd = min(fd, length(q - o) / (.34 + .12 * hash12(g2))); }
    float g = noise3(p * 13. + vec3(.31, .17, .59));
    base = mix(vec3(.6, .15, .25), vec3(.8, .3, .4), .5 + .4 * (g - .5));
    base = mix(base, vec3(.84, .4, .48), smoothstep(1., .7, fd) * .55);        // follicles
    base = mix(base, vec3(.93, .58, .63), smoothstep(.45, .15, fd) * .4);       // germinal centres
    base *= mix(1., .55, smoothstep(-.2, -2.2, p.y));
  } else {
    base = mix(vec3(.86, .3, .38), vec3(.36, .03, .09), smoothstep(-.05, .8, depth));
    base *= .82 + .36 * fbm3(p * 5., 3);
    base = mix(base, vec3(.95, .15, .18), uRed * .55);
  }
  // scratches: fine red lines on the surface near the front
  if (mat < .5 && cutf < .5 && uScratch > 0.) {
    float s = 0.;
    for (int i = 0; i < 4; i++) { vec2 o = vec2(-.6 + .45 * float(i), -.9 + .25 * float(i)); vec2 q = rot2(.5 + .3 * float(i)) * (p.xz - o); s = max(s, smoothstep(.018, 0., abs(q.y)) * step(abs(q.x), .22 * uScratch)); }
    base = mix(base, vec3(.85, .05, .1), s * .9);
  }
  vec3 L = normalize(vec3(-.5, .85, -.45)), R = normalize(vec3(.6, .3, .75));
  float dif = clamp(dot(n, L), 0., 1.) * .8 + .2 * clamp(dot(n, L) * .5 + .5, 0., 1.);
  float ao = calcAO(p, n);
  float sh = mat < .5 ? mix(.35, 1., softShadow(p + n * .01, L, .02, 3., 10.)) : 1.;
  vec3 h = normalize(L - rd);
  float wet = mix(1., 1.8, uWet);
  float spec = pow(clamp(dot(n, h), 0., 1.), mat > .5 ? 40. : 110.) * fresnel(dot(n, -rd), .04) * 5. * wet;
  float rim = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.);
  // headlamp: point light at the camera (lights the inside of the crypt)
  vec3 lp = ro + vec3(.05, .1, 0.); vec3 ld = lp - p; float ll = length(ld); ld /= ll;
  float hl = uHead * clamp(dot(n, ld), 0., 1.) / (1. + ll * ll * 5.);
  float hs = uHead * pow(clamp(dot(n, normalize(ld - rd)), 0., 1.), 120.) * 1.6 / (1. + ll * ll * 3.);
  vec3 col = base * (.05 + .95 * dif * sh * vec3(1., .88, .8)) * ao;
  col += base * hl * vec3(1., .85, .76) * 1.2;
  col += base * pow(clamp(dot(rd, -R) * .5 + .5, 0., 1.), 3.) * vec3(1., .25, .3) * .35 * (mat < .5 ? 1. : .3);   // subsurface
  col += (spec * sh + hs) * vec3(1., .95, .92);
  col += rim * vec3(.55, .45, 1.) * .3 * ao;
  // lime rings around the crypt openings
  if (uRing > 0. && mat < .5 && cutf < .5) {
    float best = 1e5;
    for (int k = 0; k < NC; k++) { vec4 cc = CR[k]; best = min(best, abs(length(p.xz - cc.xy) - cc.z * 1.55)); }
    col = mix(col, vec3(.84, .95, .29) * 1.15, uRing * smoothstep(.016, .004, best) * step(-.15, p.y));
  }
  if (uGlowStone > 0. && mat > .5 && mat < 1.5) col += vec3(1., .98, .85) * uGlowStone * .35;
  if (uBleed > 0.) { vec3 bp = vec3(CR[3].x - .08, .02, CR[3].y - .2); float bd = length(p - bp); col = mix(col, vec3(.7, .02, .06) + spec * .5, smoothstep(.07 * uBleed, .05 * uBleed, bd)); }
  col = mix(col, fogCol, 1. - exp(-.045 * t * t));
  return col * .95;
}`;

  // ------------------------------------------------------------------ TUNNEL: inside the mouth, looking back
  const TUNNEL = COMMON + `
uniform float uCoat;       // coating on the back of the tongue
uniform float uStoneR;     // a white stone on the right tonsil (0 = none)
uniform float uGlowR;      // lime glow on the right tonsil
uniform float uSpot;       // flashlight: 0 = normal light, 1 = dark mouth lit only by a spot
uniform vec3 uSpotDir;     // spot direction (world)
uniform float uSpotCos;    // cone: cos of the half angle at the edge (smaller = wider)
uniform float uSpecks;     // white specks on both tonsils
uniform float uWater;      // gargle water level (0 = none)
uniform float uScr;        // scratchy red on the back wall
uniform float uDrip;       // postnasal drip down the back wall, 0..1
const float ZC = 2.4;      // the front arch (anterior pillars)
float gM;
float arch(vec3 p, float z0, float th, float w, float hTop){
  // an inverted-U curtain at z0 hanging from the roof; the opening is an ellipse of half-width w, top at hTop
  vec2 q = vec2(p.x / w, (p.y - (hTop - 1.9)) / 1.9);
  float hole = (length(q) - 1.) * min(w, 1.9);
  return max(abs(p.z - z0) - th, -hole);
}
float tonsilSd(vec3 p, float s){
  vec3 c = vec3(s * .98, -.28, ZC + .5);
  vec3 q = p - c;
  float d = sdEllipsoid(q, vec3(.36, .6, .42));
  d -= .028 * (sin(q.y * 12. + s) * sin(q.z * 10.) + .5 * sin(q.x * 9. + q.y * 7.));
  return d;
}
float map(vec3 p){
  gM = 0.;
  float roof = (1.25 - .16 * p.x * p.x - .06 * max(p.z - 1., 0.)) - p.y;           // hard/soft palate
  float side = (2.05 - .1 * max(p.z - 1.2, 0.) * 2.5) - abs(p.x);
  float back = (ZC + 1.9) - p.z;
  float tongue = sdEllipsoid(p - vec3(0., -1.85, .1), vec3(1.95, 1.45, 3.1));
  float c1 = arch(p, ZC, .16, 1.02, .95), c2 = arch(p, ZC + .95, .14, .86, .85);
  float uv = sdRoundCone(p, vec3(0., .9, ZC + .08), vec3(0., .12, ZC + .12), .19, .12);
  float d = smin(roof, side, .9);
  d = smin(d, back, .5);
  d = smin(d, c1, .18); d = smin(d, c2, .18);
  d = smin(d, uv, .12);
  float tg = tongue; if (tg < d) gM = 1.;
  d = smin(d, tongue, .25);
  float tl = tonsilSd(p, -1.), tr = tonsilSd(p, 1.);
  float to = min(tl, tr); if (to < d + .02) gM = 2.;
  d = smin(d, to, .08);
  if (uStoneR > 0.) { float st = length(p - vec3(.72, -.24, ZC + .44)) - uStoneR; if (st < d) { d = st; gM = 3.; } }
  return d;
}
#include <raymarch>
float march2(vec3 ro, vec3 rd, float tmax){ float t = 0., d = 1.; for (int i = 0; i < RM_STEPS; i++){ d = map(ro + rd * t); if (abs(d) < RM_EPS * t + .0004) return t; t += d * RM_STEP; if (t > tmax) return -1.; } return abs(d) < .03 ? t : -1.; }
vec3 render(vec2 fc){
  vec3 ro; vec3 rd = camRay(fc, ro);
  vec3 fogCol = vec3(.035, .008, .022);
  float t = march2(ro, rd, 16.);
  vec3 col = fogCol;
  if (t > 0.) {
    vec3 p = ro + rd * t; map(p); float m = gM;
    vec3 n = calcNormal(p);
    // fine texture in the normal: papillae on the tongue, lobules on the tonsils
    if (m > .5 && m < 1.5) n = normalize(n + .35 * (vec3(noise3(p * 38.), noise3(p * 38. + 7.), noise3(p * 38. + 13.)) - .5));
    else n = normalize(n + .12 * (vec3(noise3(p * 12.), noise3(p * 12. + 5.), noise3(p * 12. + 9.)) - .5));
    vec3 base = vec3(.74, .2, .3) * (.8 + .35 * fbm3(p * 3., 3));
    if (m > .5 && m < 1.5) {
      base = vec3(.86, .34, .42) * (.72 + .45 * noise3(p * 40.));
      float back = smoothstep(.4, 2.2, p.z);
      base = mix(base, vec3(.9, .84, .66), uCoat * back * (.4 + .5 * noise3(p * 18.)));
    }
    if (m > 1.5 && m < 2.5) {
      base = vec3(.84, .3, .4) * (.8 + .35 * noise3(p * 9.));
      float pits = smoothstep(.68, .82, noise3(p * vec3(6., 11., 8.)));
      base *= 1. - .85 * pits;
      if (uSpecks > 0.) base = mix(base, vec3(1., .98, .9), uSpecks * smoothstep(.83, .9, noise3(p * vec3(6., 11., 8.) + 2.3)) * 2.);
    }
    if (m > 2.5) base = vec3(.96, .92, .8);
    float depth = smoothstep(ZC - .5, ZC + 2., p.z) * smoothstep(.2, -1.2, p.y);
    base *= 1. - .75 * depth;
    if (uScr > 0.) base = mix(base, vec3(1., .12, .15), uScr * .5 * smoothstep(ZC + 1., ZC + 1.9, p.z));
    float drip = 0.;
    if (uDrip > 0. && p.z > ZC + 1.3) {
      float top = 1.3, yEnd = mix(top, -1.4, uDrip);
      float wx = .07 + .02 * sin(p.y * 7.);
      float lane = smoothstep(wx, wx * .4, abs(p.x - .38 - .06 * sin(p.y * 2.5)));
      drip = lane * step(yEnd, p.y) * step(p.y, top);
      float bead = smoothstep(.1, .04, length(vec2(p.x - .38 - .06 * sin(yEnd * 2.5), p.y - yEnd)));
      drip = max(drip, bead);
      base = mix(base, vec3(.93, .96, .72), drip * .85);
      n = normalize(n + vec3(0., 0., -.6) * drip);
    }
    vec3 L = normalize(vec3(-.3, .75, -.6));
    float dif = clamp(dot(n, L) * .5 + .5, 0., 1.);
    float ao = calcAO(p, n);
    vec3 lp = ro + vec3(0., .25, -.1); vec3 ld = lp - p; float ll = length(ld); ld /= ll;
    float head = clamp(dot(n, ld), 0., 1.) / (1. + ll * ll * .13);
    float spotMask = 1.;
    if (uSpot > 0.) spotMask = mix(1., smoothstep(uSpotCos, uSpotCos + .05, dot(-ld, normalize(uSpotDir))), uSpot);
    vec3 h = normalize(ld - rd);
    float spec = pow(clamp(dot(n, h), 0., 1.), 90.) * fresnel(dot(n, -rd), .05) * 6. / (1. + ll * ll * .2);
    float rim = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.);
    vec3 amb = base * (.03 + .18 * dif * (1. - uSpot)) * ao;
    col = amb + (base * head * 1.35 * vec3(1., .9, .82) * ao + spec * vec3(1., .96, .92)) * spotMask;
    col += base * pow(clamp(1. - dot(n, -rd), 0., 1.), 2.) * vec3(1., .3, .35) * .25 * spotMask;
    col += rim * vec3(.5, .42, 1.) * .12 * ao * (1. - uSpot);
    if (m > 1.5 && m < 2.5 && uGlowR > 0. && p.x > 0.) col += vec3(.84, .95, .29) * uGlowR * .45 * pow(rim, .6);
    col = mix(col, fogCol, 1. - exp(-.06 * t * t));
  }
  // gargle water: a translucent surface plane with bubbles
  if (uWater > 0.) {
    float wy = -.35 + .9 * uWater + .05 * sin(ro.x * 3. + uTime * 5.);
    float tw = (wy - ro.y) / rd.y;
    if (tw > 0. && (t < 0. || tw < t)) {
      vec3 wp = ro + rd * tw;
      float wave = .5 + .5 * sin(wp.x * 9. + uTime * 7.) * sin(wp.z * 7. - uTime * 5.);
      float fr = fresnel(abs(rd.y), .03);
      vec3 under = col * vec3(.45, .7, .95) + vec3(.02, .08, .14);
      col = mix(under, vec3(.35, .5, .65) * .35, fr) + vec3(.8, .95, 1.) * pow(wave, 10.) * .25 * exp(-.08 * tw * tw);
    }
  }
  return col;
}`;

  // ------------------------------------------------------------------ ESO: the esophagus and the valve
  const ESO = COMMON + `
uniform float uOpen;       // valve opening 0..1
uniform float uBolus;      // food bolus position along the tube (y), 99 = none
uniform float uGas;        // gas intensity 0..1
uniform float uGasY;       // gas cloud centre height (world y)
uniform float uGlowV;      // lime glow on the valve ring
uniform float uAcid;       // stomach glow below
const float VY = -9.;      // the valve (LES) height
float gE;
float tubeR(vec3 p){
  float a = atan(p.z, p.x);
  float fa = a * 3.5 + .5 * sin(p.y * .7) + .3 * sin(p.y * 1.9 + a);
  float folds = -.14 * pow(abs(sin(fa)), .55) + .03 * sin(a * 11. - p.y * .9);
  float rings = .045 * smoothstep(.3, 1., sin(p.y * 6.5));
  float r = .7 + folds + rings;
  // the valve: the tube pinches into a puckered ring at VY; it opens with uOpen
  float pinch = exp(-pow((p.y - VY) * 1.5, 2.));
  float puck = .5 + .5 * sin(a * 8.);
  r = mix(r, mix(.02 + .06 * puck, .45, uOpen), pinch);
  // below the valve: the stomach opens out
  r += 2.5 * smoothstep(VY - .4, VY - 2.5, p.y);
  return r;
}
float map(vec3 p){
  gE = 0.;
  float d = tubeR(p) - length(p.xz);          // inside the tube is air
  d *= .6;
  if (uBolus < 50.) { float b = sdEllipsoid(p - vec3(0., uBolus, 0.), vec3(.42, .55, .42)); if (b < d) { d = b; gE = 1.; } }
  return d;
}
#include <raymarch>
float march2(vec3 ro, vec3 rd, float tmax){ float t = 0., d = 1.; for (int i = 0; i < RM_STEPS; i++){ d = map(ro + rd * t); if (abs(d) < RM_EPS * t + .0004) return t; t += d * RM_STEP; if (t > tmax) return -1.; } return abs(d) < .03 ? t : -1.; }
vec3 render(vec2 fc){
  vec3 ro; vec3 rd = camRay(fc, ro);
  float t = march2(ro, rd, 24.);
  vec3 col = vec3(.03, .005, .015);
  if (t > 0.) {
    vec3 p = ro + rd * t; map(p);
    vec3 n = calcNormal(p);
    n = normalize(n + .1 * (vec3(noise3(p * 10.), noise3(p * 10. + 3.), noise3(p * 10. + 6.)) - .5));
    vec3 base = gE > .5 ? vec3(.62, .44, .22) * (.75 + .35 * noise3(p * 9.)) : vec3(.76, .22, .32) * (.78 + .35 * fbm3(p * vec3(3., .8, 3.), 3));
    float nearV = exp(-pow((p.y - VY) * 1.3, 2.));
    base = mix(base, vec3(.88, .32, .42), nearV * .5);
    vec3 lp = ro + vec3(.1, .2, 0.); vec3 ld = lp - p; float ll = length(ld); ld /= ll;
    float head = clamp(dot(n, ld), 0., 1.) / (1. + ll * ll * .9);
    vec3 h = normalize(ld - rd);
    float spec = pow(clamp(dot(n, h), 0., 1.), 90.) * fresnel(dot(n, -rd), .05) * 7. / (1. + ll * ll * .1);
    float ao = calcAO(p, n);
    vec3 K = normalize(vec3(.5, .6, -.3));
    float key = clamp(dot(n, K), 0., 1.) * exp(-.04 * t * t);
    float wetN = .45 + .9 * noise3(p * vec3(14., 5., 14.));
    col = base * (.015 + .8 * head + .35 * key) * ao * vec3(1., .86, .78) + spec * wetN * vec3(1., .95, .9) * (.4 + .6 * ao);
    col += vec3(.55, .05, .12) * pow(1. - clamp(dot(n, -rd), 0., 1.), 3.) * .25 * ao;
    col += base * pow(1. - clamp(dot(n, -rd), 0., 1.), 2.) * vec3(1., .3, .35) * .3;
    col += vec3(.84, .95, .29) * uGlowV * nearV * .28 * (.6 + .4 * sin(uTime * 5.));
    col += vec3(.95, .8, .3) * uAcid * smoothstep(VY - .3, VY - 3., p.y) * .35;
    col = mix(col, vec3(.02, .003, .01), 1. - exp(-.03 * t * t));
  }
  // reflux gas: a glowing yellow-green cloud rising up the tube (accumulated along the ray)
  if (uGas > 0.) {
    float gy = uGasY;
    float acc = 0.;
    for (int i = 0; i < 24; i++) {
      float s = float(i) * .45 + .2; if (t > 0. && s > t) break;
      vec3 q = ro + rd * s;
      float den = smoothstep(1.6, 0., length(vec2(length(q.xz) * 1.4, (q.y - gy) * .7))) * (.6 + .4 * noise3(q * 2. + vec3(0., -uTime * 2., 0.)));
      acc += den * .12;
    }
    col += vec3(.62, .85, .25) * acc * clamp(uGas, 0., 1.) * .75;
  }
  return col;
}`;

  // ------------------------------------------------------------------ JS helpers
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // world point -> design px (matches camMat + normalize(vec3(uv, fov)))
  function project(ro, ta, fov, p, roll = 0) {
    const cw = norm([ta[0] - ro[0], ta[1] - ro[1], ta[2] - ro[2]]), cp = [Math.sin(roll), Math.cos(roll), 0];
    const cu = norm(cross(cw, cp)), cv = cross(cu, cw);
    const d = [p[0] - ro[0], p[1] - ro[1], p[2] - ro[2]];
    const z = dot(d, cw); if (z <= 0.01) return [NaN, NaN];
    const ux = dot(d, cu) / z * fov, uy = dot(d, cv) / z * fov;
    return [960 + ux * 540, 540 - uy * 540];
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  // keyframed 3D camera: keys [{ t, ro:[..], ta:[..], fov, e }] (e: easing name from THROAT.EASE)
  function cam3(t, keys, o = {}) {
    const E = window.THROAT.EASE;
    let a = keys[0], b = keys[0], u = 0;
    if (t >= keys[keys.length - 1].t) { a = b = keys[keys.length - 1]; }
    else if (t > keys[0].t) { let i = 0; while (i < keys.length - 2 && t > keys[i + 1].t) i++; a = keys[i]; b = keys[i + 1]; u = (E[b.e || 'io'] || E.io)(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)))); }
    const ro = lerp3(a.ro, b.ro, u), ta = lerp3(a.ta, b.ta, u), fov = (a.fov ?? 1.8) + ((b.fov ?? 1.8) - (a.fov ?? 1.8)) * u;
    const f = o.float ?? 0.01, tt = t + (o.t0 || 0);
    ro[0] += Math.sin(tt * 0.7) * f; ro[1] += Math.sin(tt * 0.53 + 1.2) * f;
    return { ro, ta, fov, roll: (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * u };
  }
  const U = (c) => ({ uRo: c.ro, uTa: c.ta, uFov: c.fov, uRoll: c.roll || 0 });
  // the tonsil macro's crypt openings (x, z, r) in JS (same as CR in the shader)
  const CRYPTS3 = [[0, 0, .16], [-1.05, -.85, .12], [.95, -1.05, .11], [1.25, .35, .13], [-1.35, .55, .12], [.45, 1.25, .14], [-.55, 1.75, .12]];
  // particles array helper: list of [x, y, z, r] -> Float32Array(40)
  function parts(list) { const a = new Float32Array(40); list.slice(0, 10).forEach((q, i) => { a[i * 4] = q[0]; a[i * 4 + 1] = q[1]; a[i * 4 + 2] = q[2]; a[i * 4 + 3] = q[3]; }); return a; }
  // a hard-cut shot list: shots [{ t, ... }] -> the active shot and the local time inside it
  function shot(t, shots) { let s = shots[0]; for (const x of shots) if (t >= x.t) s = x; return { ...s, lt: t - s.t }; }

  // ------------------------------------------------------------------ the tonsil macro camera shared by throat-trip -> crypts
  // u = seconds since w1629 ("tonsil"); one slow continuous glide, so the cut between the two scenes is invisible.
  function macroCam(u) {
    const k = Math.min(1, Math.max(0, u / 5)), e = k * k * (3 - 2 * k);
    return { ro: [lerp(1.75, 1.0, e) + 0.02 * Math.sin(u * 0.7), lerp(1.0, 1.05, e), lerp(-1.05, -1.55, e)], ta: [lerp(1.2, 0.5, e), -0.05, lerp(0.34, 0.1, e)], fov: 1.75, roll: 0 };
  }
  // the circled stone in crypt 3 (u = seconds since w1630 "stones"); fade 0..1
  function tripNotes3(ctx, api, c, u, fade = 1) {
    if (u < 0 || fade <= 0) return;
    const { P, prog, ease } = api, cr = CRYPTS3[3];
    const [sx, sy] = project(c.ro, c.ta, c.fov, [cr[0], 0.02, cr[1]]);
    ctx.save(); ctx.globalAlpha *= fade;
    api.doodle.circle(ctx, sx, sy, 120, 90, prog(u, 0, 0.45, ease.inOutCubic), { color: P.marker, width: 10, seed: 5 });
    api.doodle.arrow(ctx, sx + 330, sy + 230, sx + 120, sy + 80, prog(u, 0.15, 0.4, ease.inOutCubic), { color: P.marker, width: 9, bend: 40, seed: 3, head: 30 });
    api.doodle.text(ctx, 'tonsil stone', sx + 390, sy + 300, prog(u, 0.2, 0.35), { color: P.marker, size: 64, align: 'center', stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
    ctx.restore();
  }

  // ------------------------------------------------------------------ uniform defaults (uniforms persist between draws)
  const NONE4 = [0, 0, 0, 0];
  const DEF = {
    TONSIL: { uSq: 0, uCut: 0, uCutX: 0, uS0: NONE4, uS1: NONE4, uS2: NONE4, uP: new Float32Array(40), uRing: 0, uRed: 0, uScratch: 0, uBleed: 0, uHead: 0.25, uWet: 0, uGlowStone: 0, uRoll: 0 },
    TUNNEL: { uCoat: 0.75, uStoneR: 0, uGlowR: 0, uSpot: 0, uSpotDir: [0, 0, 1], uSpotCos: 0.93, uSpecks: 0, uWater: 0, uScr: 0, uDrip: 0, uRoll: 0 },
    ESO: { uOpen: 0, uBolus: 99, uGas: 0, uGasY: -12, uGlowV: 0, uAcid: 0, uRoll: 0 },
  };
  // renderers are created lazily per scene: THROAT3D.world3(api, 'TONSIL') -> gl renderer
  function world3(api, name, o = {}) {
    const src = { TONSIL, TUNNEL, ESO }[name];
    return api.gl.create(api, src, { res: o.res ?? 0.5, aa: o.aa ?? 2, steps: o.steps ?? 130, stepScale: o.stepScale ?? 0.8 });
  }
  // draw a 3D world full-frame: r = renderer, name = 'TONSIL' | 'TUNNEL' | 'ESO', c = camera, u = extra uniforms
  function draw3(ctx, api, r, name, c, t, u = {}) {
    const cv = r.draw({ ...DEF[name], ...U(c), uTime: t, ...u });
    ctx.drawImage(cv, 0, 0, api.W, api.H);
  }
  // foreground bokeh: a few big, soft out-of-focus motes drifting in front of the lens (depth)
  function bokeh(ctx, t, seed = 3, n = 7, a = 1, tint = [255, 150, 185]) {
    const r = window.THROAT.rng(seed);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < n; i++) {
      const x = ((r() * 2200 + t * (14 + r() * 26)) % 2300) - 190, y = r() * 1080 + Math.sin(t * 0.4 + i) * 30, s = 70 + r() * 150;
      const g = ctx.createRadialGradient(x, y, s * 0.35, x, y, s);
      const al = (0.05 + r() * 0.07) * a;
      g.addColorStop(0, `rgba(${tint[0]},${tint[1]},${tint[2]},${al})`); g.addColorStop(0.8, `rgba(${tint[0]},${tint[1]},${tint[2]},${al * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function artistic(ctx, api) { api.text(ctx, '* ARTISTIC RENDERING', 1860, 62, { size: 20, color: api.P.faint, align: 'right', tracking: 2 }); }
  // the "you are here" map card (the trip): the 2D cross-section, route drawn to u, a pulsing dot at u.
  // region: { x, y, z } camera on the 2D world; box: [x, y, w, h] on screen; p = pop progress
  function minimap(ctx, api, t, u, region, box, p = 1, o = {}) {
    if (p <= 0) return;
    const TH = window.THROAT; TH.build();
    const [bx, by, bw, bh] = box;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, p * 1.5);
    const sc = 0.9 + 0.1 * Math.min(1, p);
    ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(sc, sc); ctx.translate(-bw / 2, -bh / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(10,8,22,0.92)'; api.roundRect(ctx, 0, 0, bw, bh, 16); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.save(); api.roundRect(ctx, 0, 0, bw, bh, 16); ctx.clip();
    // world drawn into the card: the camera maps region.z so that the card acts like a small screen
    ctx.translate(bw / 2, bh / 2); const k = bw / 1920; ctx.scale(k, k); ctx.translate(-960, -540);
    const cam = { x: region.x, y: region.y, z: region.z };
    TH.world(ctx, api, cam, t, { route: [0, u], probe: u, coat: 0.7, ...(o.world || {}) });
    ctx.restore();
    ctx.strokeStyle = 'rgba(215,243,74,0.55)'; ctx.lineWidth = 2; api.roundRect(ctx, 0, 0, bw, bh, 16); ctx.stroke();
    api.text(ctx, o.title || 'THE TRIP', 18, 34, { size: 24, color: api.P.lime, tracking: 2 });
    ctx.restore();
  }

  window.THROAT3D = { TONSIL, TUNNEL, ESO, project, cam3, U, CRYPTS3, parts, shot, lerp3, DEF, world3, draw3, bokeh, artistic, minimap, macroCam, tripNotes3 };
})();
