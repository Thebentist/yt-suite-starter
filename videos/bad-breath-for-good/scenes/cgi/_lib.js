/* cgi group: a ray-marched product studio shared by every cgi-* scene (window.CGI).
 *
 * Why not api.gl.create: a product shot needs real depth of field. gl.js tone-maps straight to 8-bit, so there is
 * no depth to blur by. This file has its own tiny WebGL2 wrapper (it reuses window.GL.LIB for the SDF/noise library):
 *   pass 1  ray-march the studio into an RGBA16F target: linear HDR colour + view depth (aa x aa samples, HDR-safe
 *           Karis resolve so a hot highlight does not alias),
 *   pass 2  gather depth of field (scatter-as-gather disc, background never bleeds onto a sharper foreground), then
 *           exposure, ACES and sRGB gamma to the canvas. api.finish() adds bloom, grain and vignette on top.
 *
 * The world (1 unit = 10 cm): a glossy black acrylic floor fading into an indigo void with a lavender glow on the far
 * seamless; three graphite plinths at x = -1, 0, 1; three softboxes (warm key front-left, cool rim strip right,
 * lavender rim strip left) and a top panel, all analytic rectangles, so every reflection is a real softbox shape;
 * a spot over each plinth. Products (all generic, no brand, no logo):
 *   toothbrush  translucent blue handle, white rubber grip band, 4 x 9 tufts of individual round filaments
 *   floss       a soft pebble-square dispenser (translucent mint base, pearl lid, steel cutter) + a waxed strand
 *   scraper     a brushed-stainless U strip (anisotropic streaks along the strip) with lavender silicone grips
 *   cards       two textured light panels (used by cgi-lineup for Ben's own product photos)
 */
(function () {
  const GLSL = `
uniform vec3 uRo; uniform vec3 uTa; uniform float uLens; uniform float uRoll;
uniform vec4 uBrP; uniform vec3 uBrR;
uniform vec4 uFlP; uniform vec3 uFlR;
uniform vec4 uScP; uniform vec3 uScR;
uniform vec4 uLit; uniform vec3 uSpot; uniform vec3 uPlin;
uniform float uFil; uniform float uBgGlow; uniform float uHaze; uniform float uExpo;
uniform float uCards; uniform float uCardH; uniform vec4 uCropA; uniform vec4 uCropB; uniform float uCardGain;
uniform vec4 uCaP; uniform vec4 uCbP; uniform float uCaR; uniform float uCbR;
uniform sampler2D uImgA; uniform sampler2D uImgB;

const float PLR = 0.36, PLH = 0.07;                         // plinth radius, height
const float SR = 0.22, SL = 0.72, SHS = 0.05, STH = 0.0034; // scraper: bend radius, arm length, half band width, half thickness
const vec3 KEY_C = vec3(-2.4, 2.8, -2.1);
const vec3 RR_C = vec3(2.7, 1.4, 1.9);
const vec3 RL_C = vec3(-2.8, 1.4, 2.2);
const vec3 TOP_C = vec3(0., 3.8, 0.4);
const vec3 FILL_C = vec3(2.6, 1.3, -2.4);
const vec3 AIM = vec3(0., 0.8, 0.);
const vec3 KEY_COL = vec3(1.0, 0.93, 0.84);
const vec3 RR_COL = vec3(0.80, 0.90, 1.0);
const vec3 RL_COL = vec3(0.78, 0.60, 1.0);

mat3 gBrM, gFlM, gScM, gCaM, gCbM;      // local -> world
mat3 gBrI, gFlI, gScI, gCaI, gCbI;      // world -> local
float gMat; vec3 gL; vec4 gX;
vec3 gStr[16]; vec4 gStrB;

// inverse of the ACES fit: a photo emitted with this shows at its own sRGB values after tone-mapping
vec3 acesInv(vec3 y){ y = clamp(y, 0., 0.96); vec3 A = y * 2.43 - 2.51, B = y * 0.59 - 0.03, C = y * 0.14; return (-B - sqrt(max(B * B - 4. * A * C, 0.))) / (2. * A); }
mat3 eul(vec3 r){ return rotY(r.x) * rotX(r.y) * rotZ(r.z); }
// camera basis with screen-right = +x when looking down +z (camMat in gl.js mirrors x)
mat3 camM(vec3 ro, vec3 ta, float cr){ vec3 cw = normalize(ta - ro), cp = vec3(sin(cr), cos(cr), 0.); vec3 cu = normalize(cross(cp, cw)); return mat3(cu, cross(cw, cu), cw); }

// ------------------------------------------------------------------ toothbrush (local: handle end y=0, head y~1.69, bristles +z)
float sdBrushBody(vec3 q, out float grip){
  vec3 s = vec3(q.x, q.y, q.z * 1.55);
  float d = sdRoundCone(s, vec3(0., 0.07, 0.), vec3(0., 0.62, 0.), 0.064, 0.074);
  d = smin(d, sdRoundCone(s, vec3(0., 0.62, 0.), vec3(0., 1.18, 0.), 0.074, 0.046), 0.015);
  d = smin(d, sdRoundCone(s, vec3(0., 1.18, 0.), vec3(0., 1.52, -0.012), 0.046, 0.029), 0.015);
  d /= 1.55;
  float hd = sdRoundBox(q - vec3(0., 1.685, 0.), vec3(0.066, 0.152, 0.030), 0.028);
  grip = 0.;
  return smin(d, hd, 0.04);
}
const float TUFT_RT = 0.0120, TUFT_SPL = 0.20, FIL_P = 0.0042, FIL_R = 0.00165;
// one tuft (grid cell cid): the solid tuft (uFil < 0.5), or its round filaments inside a bound that contains every one
// of them (tips included), so taking the max with the bound never clips a filament
float sdTuft(vec3 q, vec2 bp, vec2 cid){
  vec2 cc = (cid - vec2(1.5, 4.0)) * vec2(0.032, 0.030);
  float hT = 0.096 + 0.010 * sin(cid.y * 0.9 + 0.6) + ((cid.x < 0.5 || cid.x > 2.5) ? 0.012 : 0.0) + (cid.y > 7.5 ? 0.016 : 0.0);
  float z0 = 0.018, z1 = 0.031 + hT;
  vec2 fq = bp - cc;
  float hz = clamp((q.z - z0) / (z1 - z0), 0., 1.), sc = 1. + TUFT_SPL * hz;
  const float rad = 0.004;
  if (uFil < 0.5) {
    vec2 w = vec2(length(fq) - TUFT_RT * sc + rad, abs(q.z - (z0 + z1) * 0.5) - (z1 - z0) * 0.5 + rad);
    return (min(max(w.x, w.y), 0.) + length(max(w, 0.)) - rad) * 0.9;
  }
  float zTop = z0 + (z1 - z0) * 1.01 + FIL_R;
  vec2 w = vec2(length(fq) - (TUFT_RT * sc + FIL_R) + rad, abs(q.z - (z0 + zTop) * 0.5) - (zTop - z0) * 0.5 + rad);
  float dB = (min(max(w.x, w.y), 0.) + length(max(w, 0.)) - rad) * 0.9;
  if (dB > 0.004) return dB;
  vec2 uq = fq / sc;
  // staggered rows (odd rows shifted half a pitch): the nearest filament is in this row or the adjacent one
  float r0 = floor(uq.y / FIL_P + 0.5), r1 = r0 + (uq.y > r0 * FIL_P ? 1. : -1.);
  float df = FIL_P * 0.3;
  for (int k = ZERO; k < 2; k++) {
    float row = k == 0 ? r0 : r1, sh = mod(row, 2.) * 0.5 * FIL_P;
    vec2 fid = vec2(floor((uq.x - sh) / FIL_P + 0.5), row);
    vec2 fc = vec2(fid.x * FIL_P + sh, row * FIL_P);
    if (length(fc) > TUFT_RT - FIL_R * 0.4) continue;
    float hsh = hash12(fid * 1.7 + cid * 13.1);
    float zt = z0 + (z1 - z0) * (0.93 + 0.08 * hsh);
    float ra = length(uq - fc) * sc;
    float dz = q.z - zt;
    df = min(df, (dz > 0.) ? length(vec2(ra, dz)) - FIL_R : ra - FIL_R);
  }
  return max(max(df, z0 - q.z), dB) * 0.85;
}
// the bristle field: 4 x 9 tufts. Filaments overhang their cell by up to ~1 mm, so test the own tuft and the three
// nearest neighbours (2 x 2), and cap the step by the distance to the tufts not tested (no overshoot, no popping)
float sdBristles(vec3 q, out vec2 cidOut, out float tip){
  vec2 bp = vec2(q.x, q.y - 1.685);
  vec2 f = bp / vec2(0.032, 0.030) + vec2(2.0, 4.5);
  vec2 c0 = clamp(floor(f), vec2(0.), vec2(3., 8.));
  vec2 fr2 = f - c0;
  vec2 o = vec2(fr2.x < 0.5 ? -1. : 1., fr2.y < 0.5 ? -1. : 1.);
  float d = 1e5; cidOut = c0;
  for (int k = ZERO; k < 4; k++) {
    vec2 cid = c0 + vec2(float(k & 1), float(k >> 1)) * o;
    if (cid.x < -0.5 || cid.x > 3.5 || cid.y < -0.5 || cid.y > 8.5) continue;
    float dd = sdTuft(q, bp, cid);
    if (dd < d) { d = dd; cidOut = cid; }
  }
  vec2 g = vec2(o.x > 0. ? fr2.x : 1. - fr2.x, o.y > 0. ? fr2.y : 1. - fr2.y) * vec2(0.032, 0.030) - 0.0013;
  d = min(d, max(max(min(g.x, g.y), 0.0005), q.z - 0.172));
  tip = clamp((q.z - 0.018) / 0.13, 0., 1.);
  return d;
}
float mapBrush(vec3 q, out float m, out vec4 x){
  float grip; float d = sdBrushBody(q, grip);
  m = grip > 0.5 ? 3. : 2.; x = vec4(0.);
  float bb = sdBox(q - vec3(0., 1.685, 0.09), vec3(0.08, 0.16, 0.075));
  if (bb < 0.01) {
    vec2 cid; float tip; float db = sdBristles(q, cid, tip);
    if (db < d) { d = db; m = ((cid.x < 0.5 || cid.x > 2.5) || cid.y > 7.5) ? 5. : 4.; x = vec4(cid, tip, 0.); }
  } else d = min(d, bb);   // the box bounds the bristles: never step past it (skipping it made rays land inside the tufts)
  return d;
}

// ------------------------------------------------------------------ floss (local: puck in the xz plane, lid +y, exit near +z edge)
void setupStrand(){
  vec3 a = vec3(0., 0.078, 0.165);
  vec3 mn = vec3(1e5), mx = vec3(-1e5);
  for (int k = ZERO; k < 16; k++){
    float s = float(k) / 15.;
    float sw = 0.03 * sin(uTime * 0.8 + s * 4.) * s;
    vec3 p = a + vec3(0.26 * s + 0.16 * s * s + sw, 0.05 * sin(s * 3.14159) + 0.02 * s, 0.20 * sin(s * 2.7));
    gStr[k] = p; mn = min(mn, p); mx = max(mx, p);
  }
  gStrB = vec4((mn + mx) * 0.5, length(mx - mn) * 0.5 + 0.012);
}
float mapFloss(vec3 q, out float m, out vec4 x){
  float d = sdRoundBox(q, vec3(0.23, 0.08, 0.23), 0.075);
  d = smax(d, -(sdCylinder(q - vec3(0., 0.083, -0.02), 0.006, 0.13)), 0.006);
  d += 0.004 * (1. - smoothstep(0., 0.006, abs(q.y - 0.012)));      // seam between base and lid
  m = q.y > 0.012 ? 7. : 6.; x = vec4(0.);
  float c = sdRoundBox(q - vec3(0., 0.078, 0.172), vec3(0.03, 0.004, 0.014), 0.002);   // steel cutter
  if (c < d) { d = c; m = 11.; }
  if (length(q - gStrB.xyz) - gStrB.w < d) {
    float s = 1e5; vec3 tg = vec3(0., 1., 0.);
    for (int k = ZERO; k < 15; k++) { float ds = sdCapsule(q, gStr[k], gStr[k + 1], 0.0032); if (ds < s) { s = ds; tg = gStr[k + 1] - gStr[k]; } }
    if (s < d) { d = s; m = 8.; x = vec4(normalize(tg), 0.); }
  }
  return d;
}

// ------------------------------------------------------------------ U tongue scraper (local: arch in xy, arms down to y=0, band along z)
float mapScraper(vec3 q, out float m, out vec4 x){
  vec2 p = q.xy; float du, u; vec2 T;
  if (p.y > SL) { vec2 r = p - vec2(0., SL); du = abs(length(r) - SR); u = SL + SR * atan(r.y, r.x); T = normalize(vec2(-r.y, r.x)); }
  else { du = length(vec2(abs(p.x) - SR, p.y - clamp(p.y, 0., SL))); u = p.x > 0. ? p.y : 2. * SL + 3.14159 * SR - p.y; T = vec2(0., 1.); }
  vec2 w = vec2(du - STH + 0.001, abs(q.z) - SHS + 0.001);
  float d = min(max(w.x, w.y), 0.) + length(max(w, 0.)) - 0.001;
  m = 9.; x = vec4(u, q.z, T);
  float g = sdRoundBox(vec3(abs(q.x) - SR, q.y - 0.08, q.z), vec3(0.020, 0.085, 0.058), 0.018) + 0.0003 * sin(q.y * 150.);
  if (g < d) { d = g; m = 10.; x = vec4(0.); }
  return d;
}

float sdCard(vec3 q){ return sdRoundBox(q, vec3(uCardH, uCardH, 0.010), 0.008); }

#ifdef CGI_EXTRA
void mapExtra(vec3 p, inout float d);
void setupExtra();
#endif
float map(vec3 p){
  float d = p.y; gMat = 0.; gL = p; gX = vec4(0.);
  for (int i = ZERO; i < 3; i++) {
    float pres = i == 0 ? uPlin.x : (i == 1 ? uPlin.y : uPlin.z);
    if (pres < 0.01) continue;
    float hh = PLH * 0.5 * pres;
    vec3 pp = p - vec3(float(i) - 1., hh, 0.);
    vec2 w = vec2(length(pp.xz) - PLR + 0.012, abs(pp.y) - hh + 0.012);
    float dp = min(max(w.x, w.y), 0.) + length(max(w, 0.)) - 0.012;
    if (dp < d) { d = dp; gMat = 1.; gL = pp; }
  }
  if (uBrP.w > 0.5) {
    vec3 q = gBrI * (p - uBrP.xyz);
    float bb = sdCapsule(q, vec3(0., 0.05, 0.02), vec3(0., 1.80, 0.06), 0.19);
    if (bb < d) {
      if (bb > 0.12) d = bb;
      else { float m; vec4 x; float db = mapBrush(q, m, x); if (db < d) { d = db; gMat = m; gL = q; gX = x; } }
    }
  }
  if (uFlP.w > 0.5) {
    vec3 q = gFlI * (p - uFlP.xyz);
    float bb = min(length(q) - 0.36, length(q - gStrB.xyz) - gStrB.w);
    if (bb < d) {
      if (bb > 0.12) d = bb;
      else { float m; vec4 x; float df = mapFloss(q, m, x); if (df < d) { d = df; gMat = m; gL = q; gX = x; } }
    }
  }
  if (uScP.w > 0.5) {
    vec3 q = gScI * (p - uScP.xyz);
    float bb = sdBox(q - vec3(0., (SL + SR) * 0.5, 0.), vec3(SR + 0.05, (SL + SR) * 0.5 + 0.03, 0.08));
    if (bb < d) {
      if (bb > 0.12) d = bb;
      else { float m; vec4 x; float ds = mapScraper(q, m, x); if (ds < d) { d = ds; gMat = m; gL = q; gX = x; } }
    }
  }
  if (uCards > 0.5) {
    vec3 q = gCaI * (p - uCaP.xyz); float dc = sdCard(q); if (dc < d) { d = dc; gMat = 12.; gL = q; }
    q = gCbI * (p - uCbP.xyz); dc = sdCard(q); if (dc < d) { d = dc; gMat = 13.; gL = q; }
  }
#ifdef CGI_EXTRA
  mapExtra(p, d);                       // extra products (materials >= 20), only in scenes that define CGI_EXTRA
#endif
  return d;
}

float march(vec3 ro, vec3 rd, float tmax, float eps, float t0){ float t = t0; for (int i = ZERO; i < RM_STEPS; i++) { float d = map(ro + rd * t); if (abs(d) < eps * t + 2e-5) return t; t += d * RM_STEP; if (t > tmax) break; } return -1.; }
float gD0;
vec3 calcNormal(vec3 p, float h){ vec3 n = vec3(0.); gD0 = 0.; for (int i = ZERO; i < 4; i++) { vec3 e = 0.5773 * (2.0 * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.0); float d = map(p + e * h); n += e * d; gD0 += d * 0.25; } return normalize(n); }
// soft shadows toward the key softbox (x) and toward the spot over the nearest plinth (y), one map() call site
vec2 shadows(vec3 p, vec3 n){
  vec2 res = vec2(1.); float ix = clamp(floor(p.x + 0.5), -1., 1.);
  for (int k = ZERO; k < 2; k++) {
    vec3 tg = k == 0 ? KEY_C : vec3(ix, 3.0, 0.); float kk = k == 0 ? 12. : 9.;
    vec3 ro = p + n * 0.002, rd = normalize(tg - p); float r = 1., t = 0.006;
    for (int i = ZERO; i < 40; i++) { float h = map(ro + rd * t); r = min(r, kk * h / t); t += clamp(h, .004, .2); if (r < .004 || t > 4.) break; }
    res[k] = clamp(r, 0., 1.);
  }
  return res;
}
float calcAO(vec3 p, vec3 n){ float occ = 0., sca = 1.; for (int i = ZERO; i < 5; i++) { float h = .006 + .09 * float(i) / 4.; occ += (h - map(p + h * n)) * sca; sca *= .9; } return clamp(1. - 2.6 * occ, 0., 1.); }
float thinness(vec3 p, vec3 n){ float s = 0.; for (int k = ZERO; k < 3; k++) { float dd = 0.012 * float(k + 1); s += clamp(dd + map(p - n * dd), 0., dd) / dd; } return s / 3.; }

// ------------------------------------------------------------------ lights & environment
float rectHit(vec3 p, vec3 r, vec3 C, vec2 hs, float soft){
  vec3 N = normalize(AIM - C);
  vec3 U = abs(N.y) > 0.95 ? vec3(1., 0., 0.) : normalize(cross(vec3(0., 1., 0.), N));
  vec3 V = cross(N, U);
  float dn = dot(r, N); if (dn > -1e-3) return 0.;
  float t = dot(C - p, N) / dn; if (t < 0.) return 0.;
  vec3 h = p + r * t - C;
  vec2 uv = vec2(dot(h, U), dot(h, V)) / hs;
  float m = (1. - smoothstep(1. - soft, 1. + soft, abs(uv.x))) * (1. - smoothstep(1. - soft, 1. + soft, abs(uv.y)));
  return m * (0.72 + 0.28 * (1. - uv.x * uv.x));
}
vec3 bgCol(vec3 ro, vec3 rd){
  vec3 c = vec3(0.011, 0.009, 0.022) * (1.0 - 0.45 * clamp(rd.y * 2., 0., 1.));
  if (rd.z > 0.02) {
    float t = (6.5 - ro.z) / rd.z;
    if (t > 0.) { vec3 w = ro + rd * t; float g = exp(-(w.x * w.x) / 12. - (w.y - 1.0) * (w.y - 1.0) / 4.);
      c += vec3(0.24, 0.15, 0.52) * 0.16 * g * uBgGlow; }
  }
  return c;
}
vec3 env(vec3 p, vec3 r, float rough){
  float s = 0.03 + rough * 1.3, k = 1. / (1. + 2.5 * rough);
  vec3 c = bgCol(p, r);
  c += vec3(0.34, 0.30, 0.48) * 0.38 * uLit.x * exp(-pow((r.y - 0.03) / (0.07 + rough * 0.6), 2.));   // horizon band
  c += vec3(0.11, 0.10, 0.14) * uLit.x * smoothstep(-0.05, 0.7, r.y);                                   // dim studio dome (reflections only)
  c += KEY_COL * 5.0 * uLit.x * k * rectHit(p, r, KEY_C, vec2(1.4, 0.95), s);
  c += RR_COL * 8.0 * uLit.y * k * rectHit(p, r, RR_C, vec2(0.16, 1.45), s);
  c += RL_COL * 6.0 * uLit.z * k * rectHit(p, r, RL_C, vec2(0.16, 1.45), s);
  c += vec3(1.0) * 2.4 * uLit.w * k * rectHit(p, r, TOP_C, vec2(1.6, 0.7), s);
  c += vec3(0.95, 0.96, 1.0) * 0.85 * uLit.x * rectHit(p, r, FILL_C, vec2(1.6, 1.4), s + 0.25);      // big soft bounce card, camera right
  c += vec3(0.05, 0.045, 0.065) * uLit.x * smoothstep(0.05, -0.6, r.y);                                // glossy floor sheen seen from below
  return c;
}
float spotCone(vec3 p, int i, out vec3 dir, out float dist){
  vec3 S = vec3(float(i) - 1., 3.0, 0.); vec3 v = p - S; dist = length(v); dir = v / dist;
  return smoothstep(0.972, 0.992, -dir.y);
}
vec3 diffuseLight(vec3 p, vec3 n, float shK, float shS){
  vec3 c = vec3(0.);
  vec3 L = normalize(KEY_C - p); c += KEY_COL * 1.0 * uLit.x * max(dot(n, L), 0.) * shK;
  L = normalize(RR_C - p); c += RR_COL * 0.55 * uLit.y * max(dot(n, L), 0.);
  L = normalize(RL_C - p); c += RL_COL * 0.42 * uLit.z * max(dot(n, L), 0.);
  c += vec3(0.9, 0.92, 1.0) * 0.32 * uLit.w * max(n.y, 0.);
  for (int i = ZERO; i < 3; i++) {
    float si = i == 0 ? uSpot.x : (i == 1 ? uSpot.y : uSpot.z);
    if (si < 0.001) continue;
    vec3 dir; float dist; float cone = spotCone(p, i, dir, dist);
    c += vec3(1.0, 0.95, 0.88) * si * 9.0 * cone * max(dot(n, -dir), 0.) / (dist * dist) * shS;
  }
  if (uCards > 0.5) {
    vec3 v = uCaP.xyz - p; float dd = max(dot(v, v), 0.05); c += vec3(0.62, 0.95, 0.95) * uCaP.w * 0.30 * max(dot(n, normalize(v)), 0.) / dd;
    v = uCbP.xyz - p; dd = max(dot(v, v), 0.05); c += vec3(0.95, 0.88, 1.0) * uCbP.w * 0.30 * max(dot(n, normalize(v)), 0.) / dd;
  }
  return c;
}

struct Mat { vec3 alb; float rough; float f0; float metal; float sss; vec3 T; float fiber; vec3 emit; float streak; float refl; };
#ifdef CGI_EXTRA
void matExtra(float mat, vec3 L, vec4 X, vec3 n, inout Mat m);
#endif
Mat getMat(float mat, vec3 L, vec4 X, vec3 n){
  Mat m; m.alb = vec3(0.5); m.rough = 0.3; m.f0 = 0.04; m.metal = 0.; m.sss = 0.; m.T = vec3(0.); m.fiber = 0.; m.emit = vec3(0.); m.streak = 1.; m.refl = 0.;
  if (mat < 0.5) { m.alb = vec3(0.016, 0.015, 0.021); m.rough = 0.05; m.f0 = 0.0; m.refl = 1.; }
  else if (mat < 1.5) { m.alb = vec3(0.060, 0.058, 0.070); m.rough = n.y > 0.9 ? 0.10 : 0.22; m.f0 = 0.05; m.refl = n.y > 0.9 ? 0.38 : 0.; }
  else if (mat < 2.5) {
    m.alb = vec3(0.05, 0.30, 0.88); m.rough = 0.025; m.f0 = 0.05; m.sss = 0.8;
    float inlay = (1. - smoothstep(0.036, 0.040, abs(L.x))) * smoothstep(0.26, 0.30, L.y) * (1. - smoothstep(1.00, 1.04, L.y)) * smoothstep(0.012, 0.022, abs(L.z));
    if (inlay > 0.5) { m.alb = vec3(0.78, 0.81, 0.86) * (0.92 + 0.08 * sin(L.y * 260.)); m.rough = 0.35; m.f0 = 0.035; m.sss = 0.; }
  }
  else if (mat < 3.5) { m.alb = vec3(0.80, 0.83, 0.88); m.rough = 0.35; m.f0 = 0.035; }
  else if (mat < 4.5) { m.alb = vec3(0.93, 0.94, 0.96); m.rough = 0.25; m.fiber = 1.; m.T = gBrM * vec3(0., 0., 1.); m.sss = 0.45; }
  else if (mat < 5.5) { m.alb = vec3(0.16, 0.52, 1.0); m.rough = 0.25; m.fiber = 1.; m.T = gBrM * vec3(0., 0., 1.); m.sss = 0.7; }
  else if (mat < 6.5) { m.alb = vec3(0.28, 0.88, 0.76); m.rough = 0.04; m.f0 = 0.05; m.sss = 1.; }
  else if (mat < 7.5) { m.alb = vec3(0.70, 0.71, 0.75); m.rough = 0.05; m.f0 = 0.05; m.sss = 0.25; }
  else if (mat < 8.5) { m.alb = vec3(0.90, 0.98, 0.95); m.rough = 0.3; m.fiber = 1.; m.T = gFlM * X.xyz; m.sss = 0.5; }
  else if (mat < 9.5) {
    m.alb = vec3(0.63, 0.63, 0.65); m.rough = 0.035; m.metal = 1.; m.T = gScM * vec3(X.zw, 0.);
    float s1 = noise3(vec3(X.x * 7., L.z * 1300., 3.1)), s2 = noise3(vec3(X.x * 2., L.z * 260., 7.7));
    m.streak = 0.55 + 0.60 * s1 + 0.30 * s2;
  }
  else if (mat < 10.5) { m.alb = vec3(0.46, 0.34, 0.90); m.rough = 0.38; m.f0 = 0.035; m.sss = 0.35; }
  else if (mat < 11.5) { m.alb = vec3(0.66, 0.66, 0.68); m.rough = 0.05; m.metal = 1.; m.T = gFlM * vec3(1., 0., 0.); }
#ifdef CGI_EXTRA
  else if (mat > 19.5) matExtra(mat, L, X, n, m);
#endif
  else {
    // card: a thin dark glass panel with the photo lit on its front face
    m.alb = vec3(0.02); m.rough = 0.02; m.f0 = 0.04;
    if (L.z < -0.004) {
      vec2 uv = L.xy / uCardH * 0.5 + 0.5;
      // crop (image space, top-left origin): x0, y0, width, height, so the product fills more of the panel
      vec4 cr = mat < 12.5 ? uCropA : uCropB;
      vec2 iv = cr.xy + vec2(uv.x, 1. - uv.y) * cr.zw;
      vec4 tx = mat < 12.5 ? texture(uImgA, iv) : texture(uImgB, iv);
      float on = mat < 12.5 ? uCaP.w : uCbP.w;
      m.emit = acesInv(pow(tx.rgb, vec3(2.2)) * 0.93 * uCardGain) / max(uExpo, 0.05) * tx.a * on;
      m.f0 = 0.02;
    }
  }
  return m;
}

vec3 shadeCore(vec3 p, vec3 n, vec3 rd, Mat m, float ao, float shK, float shS, bool full){
  vec3 V = -rd; float ndv = clamp(dot(n, V), 0., 1.);
  vec3 dif = diffuseLight(p, n, shK, shS) + vec3(0.030, 0.028, 0.045) * uLit.x;
  vec3 col = m.alb * dif * ao * (1. - m.metal);
  if (m.metal > 0.5) {
    vec3 spec = vec3(0.);
    if (full && dot(m.T, m.T) > 0.25) {
      vec3 B = normalize(cross(n, normalize(m.T)));
      for (int k = ZERO; k < 6; k++) { float o = (float(k) - 2.5) / 2.5; spec += env(p, reflect(rd, normalize(n + B * o * 0.42)), m.rough); }
      spec /= 6.;
    } else spec = env(p, reflect(rd, n), m.rough + 0.08);
    vec3 F = m.alb + (1. - m.alb) * pow(1. - ndv, 5.);
    col += spec * F * m.streak * mix(0.55, 1., ao);
  } else {
    if (m.refl <= 0.) col += env(p, reflect(rd, n), m.rough) * fresnel(ndv, m.f0) * (1. - 0.6 * m.fiber) * mix(0.4, 1., ao);
  }
  if (m.sss > 0.) {
    float th = full ? thinness(p, n) : 0.5;
    vec3 tint = m.alb * m.alb * 1.4;
    vec3 back = RR_COL * uLit.y * pow(clamp(dot(rd, normalize(RR_C - p)), 0., 1.), 4.) * 2.2
              + RL_COL * uLit.z * pow(clamp(dot(rd, normalize(RL_C - p)), 0., 1.), 4.) * 1.6
              + KEY_COL * uLit.x * 0.22;
    col += tint * (0.30 + 0.70 * th) * back * m.sss * 0.9;
    col += m.alb * dif * 0.18 * th * m.sss;
  }
  if (m.fiber > 0.5 && dot(m.T, m.T) > 0.25) {
    vec3 T = normalize(m.T);
    vec3 H = normalize(normalize(KEY_C - p) + V); float c = dot(T, H);
    col += KEY_COL * uLit.x * pow(sqrt(max(0., 1. - c * c)), 70.) * 0.55 * shK;
    H = normalize(normalize(RR_C - p) + V); c = dot(T, H);
    col += RR_COL * uLit.y * pow(sqrt(max(0., 1. - c * c)), 50.) * 0.7;
    H = normalize(normalize(RL_C - p) + V); c = dot(T, H);
    col += RL_COL * uLit.z * pow(sqrt(max(0., 1. - c * c)), 50.) * 0.45;
  }
  col += m.emit;
  return col;
}

// thin haze inside the three spot cones (a few samples along the view ray), for the lit-studio feel
vec3 spotHaze(vec3 ro, vec3 rd, float tEnd){
  if (uHaze < 0.001) return vec3(0.);
  vec3 acc = vec3(0.); const int N = 28; float tt = min(tEnd, 9.);
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  for (int k = ZERO; k < N; k++) {
    vec3 p = ro + rd * tt * (float(k) + j) / float(N);
    if (p.y < 0. || p.y > 3.) continue;
    float topFade = smoothstep(2.9, 1.7, p.y);
    for (int i = ZERO; i < 3; i++) {
      float si = i == 0 ? uSpot.x : (i == 1 ? uSpot.y : uSpot.z);
      if (si < 0.001) continue;
      vec3 dir; float dist; float cone = smoothstep(0.974, 0.995, -(normalize(p - vec3(float(i) - 1., 3.0, 0.)).y));
      dist = length(p - vec3(float(i) - 1., 3.0, 0.));
      acc += vec3(1.0, 0.95, 0.9) * si * cone * topFade / (dist * dist + 0.5);
    }
  }
  return acc * tt / float(N) * 0.22 * uHaze;
}

vec4 renderHDR(vec2 fc){
  gBrM = eul(uBrR); gBrI = transpose(gBrM);
  gFlM = eul(uFlR); gFlI = transpose(gFlM);
  gScM = eul(uScR); gScI = transpose(gScM);
  gCaM = rotY(uCaR); gCaI = transpose(gCaM);
  gCbM = rotY(uCbR); gCbI = transpose(gCbM);
  setupStrand();
#ifdef CGI_EXTRA
  setupExtra();
#endif
  vec2 uv = (2. * fc - uRes) / uRes.y;
  mat3 cam = camM(uRo, uTa, uRoll);
  vec3 rd = cam * normalize(vec3(uv, uLens));
  vec3 ro = uRo;
  vec3 bg0 = bgCol(ro, rd);
  vec3 col = vec3(0.), wgt = vec3(1.); float depth = 1000., fogK = 0., baseY = 0.;
  // bounce 0 = camera ray (full shading), bounce 1 = the glossy floor / plinth-top reflection (cheap shading)
  for (int b = ZERO; b < 2; b++) {
    bool full = b == 0;
    float t = march(ro, rd, full ? 16. : 5., full ? RM_EPS : 0.0012, full ? 0. : 0.004);
    if (t < 0.) {
      col += wgt * (full ? bg0 + spotHaze(ro, rd, 9.) : bgCol(ro, rd));
      break;
    }
    vec3 p = ro + rd * t;
    map(p); float mat = gMat; vec3 L = gL; vec4 X = gX;
    vec3 n = calcNormal(p, full ? max(2.2e-4, 3.5e-4 * t) : 1e-3);
    p -= n * gD0;                                   // project onto the surface: no epsilon banding in AO / SSS
    Mat m = getMat(mat, L, X, n);
    float ao = 1.; vec2 sh = vec2(1.);
    if (full) { ao = calcAO(p, n); sh = shadows(p, n); }
    vec3 c = shadeCore(p, n, rd, m, ao, sh.x, sh.y, full);
    if (full) {
      c += spotHaze(ro, rd, t);
      fogK = smoothstep(3.2, 8.5, length(p.xz - vec2(0., 0.4)));
      depth = t * dot(rd, cam[2]);
    } else c *= exp(-1.8 * max(p.y - baseY, 0.));
    col += wgt * c;
    if (full && m.refl > 0.) {
      wgt *= m.refl * (0.10 + 0.9 * fresnel(dot(n, -rd), 0.02));
      baseY = p.y; ro = p + n * 0.003; rd = reflect(rd, n);
      continue;
    }
    break;
  }
  col = mix(col, bg0, fogK);
  return vec4(col, depth);
}
`;

  const POST = `
uniform sampler2D uTex; uniform float uFocus; uniform float uAper; uniform float uMaxR; uniform float uExpo;
out vec4 outColor;
#define ZERO (min(int(uTime), 0))
float cocOf(float z){ return min(uAper * uRes.y * abs(1. - uFocus / max(z, 1e-3)), uMaxR); }
void main(){
  vec2 px = 1. / uRes, fc = gl_FragCoord.xy;
  vec4 c0 = texture(uTex, fc * px);
  float r0 = cocOf(c0.a);
  vec3 col = c0.rgb; float tot = 1.;
  if (uMaxR > 0.5) {
    float ang = hash12(fc) * 6.2831853, rad = 0.6;
    for (int i = ZERO; i < 700; i++) {
      if (rad >= uMaxR) break;
      vec2 o = vec2(cos(ang), sin(ang)) * rad;
      vec4 s = texture(uTex, (fc + o) * px);
      float rs = cocOf(s.a);
      if (s.a > c0.a) rs = min(rs, r0 * 2.);
      float m = smoothstep(rad - 0.5, rad + 0.5, rs);
      col += mix(col / tot, s.rgb, m); tot += 1.;
      ang += 2.39996323; rad += 0.62 / rad;
    }
    col /= tot;
  }
  col = aces(col * uExpo);
  outColor = vec4(pow(col, vec3(1. / 2.2)), 1.);
}
`;

  const VERT = `#version 300 es
layout(location = 0) in vec2 aPos; void main(){ gl_Position = vec4(aPos, 0., 1.); }`;

  function create(api, opts = {}) {
    const res = opts.res ?? 0.5, aa = Math.max(1, Math.min(3, opts.aa ?? 1));
    const W = Math.round(api.W * api.scale * res), H = Math.round(api.H * api.scale * res);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 is not available');
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float missing');
    const LIB = window.GL.LIB;
    const head = `#version 300 es\nprecision highp float;\nprecision highp int;\nuniform vec2 uRes;\nuniform float uTime;\nuniform float uAspect;\n`;
    // ZERO is 0 at run time but unknown to the compiler, so ANGLE/D3D keeps loops as loops (compile time stays sane)
    const defs = `#define RM_STEPS ${opts.steps ?? 150}\n#define RM_EPS ${(opts.eps ?? 0.0005).toFixed(6)}\n#define RM_STEP ${(opts.stepScale ?? 0.85).toFixed(3)}\n#define AA ${aa}\n#define ZERO (min(int(uTime), 0))\n`;
    const main1 = `out vec4 outColor; void main(){ vec3 acc = vec3(0.); float ws = 0., dmin = 1e9;
      for (int j = ZERO; j < AA; j++) for (int i = ZERO; i < AA; i++) { vec2 o = (vec2(float(i), float(j)) + .5) / float(AA) - .5;
        vec4 c = renderHDR(gl_FragCoord.xy + o); c.rgb = clamp(c.rgb, 0., 64.); float w = 1. / (1. + dot(c.rgb, vec3(.2126, .7152, .0722)));
        acc += c.rgb * w; ws += w; dmin = min(dmin, c.a); }
      outColor = vec4(acc / ws, dmin); }`;
    const sh = (type, s) => { const o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(o); const lines = s.split('\n'); const mm = /ERROR: \d+:(\d+)/.exec(log || ''); throw new Error('GLSL: ' + log + (mm ? '\n> ' + lines[+mm[1] - 1] : '')); } return o; };
    const prog = (fsrc) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsrc)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('GLSL link: ' + gl.getProgramInfoLog(p)); return p; };
    // opts.extra: GLSL that defines mapExtra()/matExtra() (appended after the studio code, turns CGI_EXTRA on);
    // opts.extraUniforms: its uniform declarations (inserted before the studio code). Scenes without extra are unchanged.
    const p1 = prog(head + defs + LIB + (opts.extra ? '#define CGI_EXTRA\n' + (opts.extraUniforms || '') : '') + GLSL + (opts.extra || '') + main1);
    const p2 = prog(head + LIB + POST);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // HDR target
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W, H, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('HDR framebuffer incomplete');
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // images (card photos): units 1, 2
    const imgTex = (img, unit) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      if (img) { gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
      else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0])); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const tA = imgTex(opts.imgA, 1), tB = imgTex(opts.imgB, 2), tC = imgTex(opts.imgC, 3);   // C: a per-frame texture (updateC)
    const locs = new Map(); const U = (p, n) => { const k = p === p1 ? '1' + n : '2' + n; if (!locs.has(k)) locs.set(k, gl.getUniformLocation(p, n)); return locs.get(k); };
    const setU = (p, n, v) => { const l = U(p, n); if (l == null) return; if (typeof v === 'number') gl.uniform1f(l, v); else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v); else gl.uniform1fv(l, v); };
    return {
      canvas: cv, gl, W, H,
      // re-upload texture C from a canvas (e.g. handwriting that writes itself on a 3D object)
      updateC(src) {
        gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, tC); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      },
      draw(u = {}, post = {}) {
        gl.bindVertexArray(vao);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, W, H); gl.useProgram(p1);
        setU(p1, 'uRes', [W, H]); setU(p1, 'uAspect', W / H);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tA); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tB);
        gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, tC);
        const la = U(p1, 'uImgA'); if (la) gl.uniform1i(la, 1); const lb = U(p1, 'uImgB'); if (lb) gl.uniform1i(lb, 2); const lc = U(p1, 'uImgC'); if (lc) gl.uniform1i(lc, 3);
        for (const [k, v] of Object.entries(u)) setU(p1, k, v);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.useProgram(p2);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U(p2, 'uTex'), 0);
        setU(p2, 'uRes', [W, H]);
        const s = W / 1920;   // radii are given in 1920-wide pixels
        setU(p2, 'uFocus', post.focus ?? 3); setU(p2, 'uAper', post.aper ?? 0); setU(p2, 'uMaxR', (post.maxR ?? 18) * s * ((post.aper ?? 0) > 0 ? 1 : 0)); setU(p2, 'uExpo', post.expo ?? 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return cv;
      },
    };
  }

  // ---------------------------------------------------------------- JS helpers (camera, state, overlays)
  const V = {
    add: (a, b) => a.map((x, i) => x + b[i]), sub: (a, b) => a.map((x, i) => x - b[i]), mul: (a, k) => a.map((x) => x * k),
    lerp: (a, b, k) => a.map((x, i) => x + (b[i] - x) * k), len: (a) => Math.hypot(...a),
  };
  // camera on a sphere around a target: az 0 = in front (-z), + = to the right; el + = above
  function orbit(ta, dist, azDeg, elDeg) {
    const az = azDeg * Math.PI / 180, el = elDeg * Math.PI / 180;
    return [ta[0] + dist * Math.cos(el) * Math.sin(az), ta[1] + dist * Math.sin(el), ta[2] - dist * Math.cos(el) * Math.cos(az)];
  }
  // default studio state; scenes override fields
  function baseState() {
    return {
      ro: [0, 1, -4], ta: [0, 0.8, 0], lens: 3, roll: 0,
      brush: { pos: [-1, 0.26, 0], rot: [0, 0, 0], on: 0 },
      floss: { pos: [1, 0.55, 0], rot: [0, 0, 0], on: 0 },
      scr: { pos: [0, 0.22, 0], rot: [0, 0, 0], on: 0 },
      lit: [1, 1, 1, 1], spot: [0, 0, 0], plin: [1, 1, 1], fil: 0, bgGlow: 1, haze: 0,
      cards: 0, cardH: 0.55, cardGain: 1, cropA: [0, 0, 1, 1], cropB: [0, 0, 1, 1], ca: { pos: [-0.8, 0.62, 1.5], on: 0, yaw: 0.25 }, cb: { pos: [0.8, 0.62, 1.5], on: 0, yaw: -0.25 },
      focus: 4, aper: 0, maxR: 18, expo: 1,
    };
  }
  function uniforms(s, t) {
    return {
      uTime: t, uRo: s.ro, uTa: s.ta, uLens: s.lens, uRoll: s.roll,
      uBrP: [...s.brush.pos, s.brush.on], uBrR: s.brush.rot,
      uFlP: [...s.floss.pos, s.floss.on], uFlR: s.floss.rot,
      uScP: [...s.scr.pos, s.scr.on], uScR: s.scr.rot,
      uLit: s.lit, uSpot: s.spot, uPlin: s.plin, uFil: s.fil, uBgGlow: s.bgGlow, uHaze: s.haze,
      uExpo: s.expo, uCards: s.cards, uCardH: s.cardH, uCardGain: s.cardGain, uCropA: s.cropA, uCropB: s.cropB, uCaP: [...s.ca.pos, s.ca.on], uCbP: [...s.cb.pos, s.cb.on], uCaR: s.ca.yaw, uCbR: s.cb.yaw,
    };
  }
  function render(ctx, api, r, s, t) {
    const u = uniforms(s, t); if (s.extraU) Object.assign(u, s.extraU);
    const cv = r.draw(u, { focus: s.focus, aper: s.aper, maxR: s.maxR, expo: s.expo });
    ctx.drawImage(cv, 0, 0, api.W, api.H);
  }
  // which shot is live: cuts = [t0, t1, ...] (scene seconds); returns { i, u (seconds into shot), len }
  function shot(cuts, t, end) {
    let i = 0; while (i + 1 < cuts.length && t >= cuts[i + 1]) i++;
    const t1 = i + 1 < cuts.length ? cuts[i + 1] : end;
    return { i, u: t - cuts[i], len: Math.max(0.01, t1 - cuts[i]), k: Math.min(1, Math.max(0, (t - cuts[i]) / Math.max(0.01, t1 - cuts[i]))) };
  }
  // lime chip with a drawn check, the house "yes" mark
  function checkChip(ctx, api, str, x, y, p, o = {}) {
    if (p <= 0) return;
    const size = o.size || 46;
    const b = api.label(ctx, str, x, y, { p, size, align: o.align || 'left' }), sc = Math.max(0, p);
    const ax = o.align === 'center' ? x - b.w * sc / 2 : o.align === 'right' ? x - b.w * sc : x;
    const cx = ax - size * 0.95 * sc, cy = y;
    ctx.save(); ctx.globalAlpha *= api.clamp(p * 1.6);
    ctx.fillStyle = api.P.lime; ctx.beginPath(); ctx.arc(cx, cy, size * 0.62 * Math.min(1, p), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    api.doodle.check(ctx, cx + 1, cy - 1, size * 0.30, api.clamp((p - 0.35) / 0.5), { color: api.P.black, width: size * 0.13, wobble: 0.6, passes: 1, seed: 5 });
  }
  function smallPrint(ctx, api, str = '* ARTISTIC RENDERING') {
    api.text(ctx, str, 1860, 72, { size: 20, color: api.P.faint, align: 'right', tracking: 2 });
  }
  // the same Euler order and matrices as the GLSL (rotY * rotX * rotZ), for placing 2D marks on 3D objects
  function rotate(r, v) {
    let [x, y, z] = v, c = Math.cos(r[2]), s = Math.sin(r[2]);
    [x, y] = [c * x - s * y, s * x + c * y];
    c = Math.cos(r[1]); s = Math.sin(r[1]); [y, z] = [c * y - s * z, s * y + c * z];
    c = Math.cos(r[0]); s = Math.sin(r[0]); [x, z] = [c * x + s * z, -s * x + c * z];
    return [x, y, z];
  }
  const toWorld = (obj, local) => V.add(obj.pos, rotate(obj.rot, local));
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => V.mul(a, 1 / (V.len(a) || 1));
  // world point -> design-space pixel [x, y, depth] for the camera in state s (matches camM in the shader)
  function project(s, P) {
    const cw = norm(V.sub(s.ta, s.ro)), cp = [Math.sin(s.roll), Math.cos(s.roll), 0];
    const cu = norm(cross(cp, cw)), cv = cross(cw, cu), d = V.sub(P, s.ro), z = dot(d, cw);
    if (z <= 1e-4) return null;
    return [960 + (dot(d, cu) / z) * s.lens * 540, 540 - (dot(d, cv) / z) * s.lens * 540, z];
  }
  // flicker of a light switching on (u = seconds since the switch)
  const flick = (u) => (u < 0 ? 0 : u < 0.05 ? 1 : u < 0.11 ? 0.12 : u < 0.18 ? 0.85 : u < 0.24 ? 0.35 : 1);

  // screen quads of the two photo panels and of their mirror images in the glossy floor (design units), for the mask
  function cardQuads(s, grow = 1.05) {
    const out = [];
    if (!s.cards) return out;
    for (const c of [s.ca, s.cb]) {
      const h = s.cardH * grow, corners = [[-h, -h], [h, -h], [h, h], [-h, h]];
      for (const mirror of [1, -1]) {
        const q = corners.map(([x, y]) => { const w = V.add(c.pos, rotate([c.yaw, 0, 0], [x, y, -0.011])); w[1] *= mirror; return project(s, w); });
        if (q.every(Boolean)) out.push(q);
      }
    }
    return out;
  }
  // api.finish with the runtime's own bloom settings, except that the masked quads (the photo panels) feed no bloom:
  // the photos keep their real contrast instead of glowing like lightboxes. Vignette and grain come from api.finish.
  let bl = null;
  function finishMasked(ctx, t, api, o, quads) {
    const cv = ctx.canvas, bw = Math.round(cv.width / 4), bh = Math.round(cv.height / 4);
    const mk = () => { const c = document.createElement('canvas'); c.width = bw; c.height = bh; return c; };
    if (!bl || bl.a.width !== bw) bl = { a: mk(), b: mk() };
    const a = bl.a.getContext('2d'), b = bl.b.getContext('2d'), amt = o.bloom ?? 0.32;
    if (amt > 0) {
      a.clearRect(0, 0, bw, bh); a.drawImage(cv, 0, 0, bw, bh);
      const k = bw / 1920; a.fillStyle = '#000';
      for (const q of quads) { a.beginPath(); q.forEach((p, i) => (i ? a.lineTo(p[0] * k, p[1] * k) : a.moveTo(p[0] * k, p[1] * k))); a.closePath(); a.fill(); }
      b.clearRect(0, 0, bw, bh);
      b.filter = `brightness(${o.bloomBright ?? 0.75}) contrast(${o.bloomContrast ?? 2.4}) blur(${Math.round(bw / (o.bloomRadius ?? 90))}px)`;
      b.drawImage(bl.a, 0, 0); b.filter = 'none';
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = amt;
      ctx.drawImage(bl.b, 0, 0, cv.width, cv.height); ctx.restore();
    }
    api.finish(ctx, t, { ...o, bloom: 0 });
  }
  window.CGI = { GLSL, POST, create, orbit, baseState, uniforms, render, shot, checkChip, smallPrint, V, rotate, toWorld, project, flick, cardQuads, finishMasked };
})();
