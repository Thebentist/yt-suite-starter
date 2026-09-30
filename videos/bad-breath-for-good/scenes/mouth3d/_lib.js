/* mouth3d shared library: GLSL building blocks for the ray-marched tongue hero shots, plus small JS helpers.
 * Loaded by each scene with a first line   // @use videos/bad-breath-for-good/scenes/mouth3d/_lib.js
 *
 * World conventions (every mouth3d scene):  x across the tongue, y up, z from the tip (front, -z) toward the throat (+z).
 *   Papillae field (M3D.GLSL.field): the tongue surface at y = 0, one papilla per CELL (0.085), short at the front, long
 *   toward the back (uLongZ0..uLongZ1), specks of food / gunk caught at the cell corners, coating toward the back.
 *   Whole tongue (M3D.GLSL.tongue): about 1 unit long, tip at z = -0.5, back at z = +0.45, root curving down into the throat.
 *
 * Frag assembly:  M3D.frag({ defs: ['#define FIELD_EXTRA'], uniforms, parts: ['base', 'field'], map, post: ['fieldShade'], render })
 *   parts (before map):  base    camera uniforms, studio lights and environment, Voronoi dots, wet-tissue shading, fog
 *                        field   the papillae field SDF (fieldMap): specks, coating, cutaway; FIELD_EXTRA adds mucus,
 *                                dead cells and the labelled hero crumb / strand (carpet3d only, it is costly)
 *                        tongue  the whole tongue in a lower dental arch (tongueMap): coating, scraped stripes, steel U scraper
 *                        carpet  a real wool shag carpet (carpetMap)
 *                        saliva  spitLayer(): translucent saliva riding on the papilla tips (call it from render)
 *   post (after the ray marcher, may use calcAO/softShadow):  fieldShade, tongueShade, carpetShade
 * The scene writes `float map(vec3 p)` (usually just returns fieldMap(p) / tongueMap(p) / carpetMap(p)) and its render().
 * JS: M3D.create (GL canvas sized in real pixels), shot (cut list -> shot index), camU/project (camera), tongueTopY
 * (place the scraper on the surface), dof (tilt-shift blur), glass (frosted panel), sparkle, tag (* ARTISTIC RENDERING).
 * Every uniform a scene does not set is 0 in WebGL, so switch features off explicitly (e.g. uCut: -99 in field scenes).
 */
(function () {
  const G = {};

  // ------------------------------------------------------------------------------------------------ base
  G.base = `
uniform vec3 uRo; uniform vec3 uTa; uniform float uFov; uniform float uRoll;
uniform vec3 uKeyCol; uniform vec3 uRimCol; uniform vec3 uFillCol; uniform vec3 uFogCol; uniform float uFogK;
#define PI 3.14159265
#define KEY_DIR normalize(vec3(-0.55, 0.78, -0.42))
#define RIM_DIR normalize(vec3(0.45, 0.42, 0.78))
#define FILL_DIR normalize(vec3(0.7, 0.25, -0.6))
float sat(float x){ return clamp(x, 0., 1.); }
// nearest feature of a jittered grid: (distance, hash of that cell)
vec2 vor2(vec2 x){ vec2 n = floor(x), f = fract(x); float md = 8., h = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 o = 0.15 + 0.7 * hash22(n + g); vec2 r = g + o - f; float d = dot(r, r); if (d < md) { md = d; h = hash12(n + g + 7.3); } }
  return vec2(sqrt(md), h); }
float softbox(vec3 r, vec3 dir, vec2 size){ float c = dot(r, dir); if (c <= 0.) return 0.;
  vec3 rt = normalize(cross(dir, vec3(0., 1., 0.001))), up = cross(rt, dir);
  vec2 q = abs(vec2(dot(r, rt), dot(r, up)) / c) / size; return smoothstep(1., 0.7, max(q.x, q.y)); }
// a dark studio: warm key softbox, cool strip rim, faint pink fill, dim floor
vec3 studioEnv(vec3 r){
  vec3 c = mix(vec3(0.018, 0.010, 0.020), vec3(0.05, 0.035, 0.065), sat(r.y * 0.5 + 0.5));
  c += uKeyCol * 3.2 * softbox(r, KEY_DIR, vec2(0.75, 0.45));
  c += uRimCol * 2.6 * softbox(r, RIM_DIR, vec2(0.10, 0.85));
  c += uFillCol * 0.8 * softbox(r, FILL_DIR, vec2(0.9, 0.35));
  return c; }
float ggx(float nh, float a){ float a2 = a * a; float d = nh * nh * (a2 - 1.) + 1.; return a2 / (PI * d * d); }
// Wet soft tissue: wrapped diffuse with red subsurface scatter into the shadow side, translucency against the rim light,
// GGX key highlight, studio reflections (fresnel) for the wet film, cool rim. alb linear albedo.
vec3 shadeTissue(vec3 n, vec3 rd, vec3 alb, float rough, float wet, float sss, float thin, float ao, float sh){
  vec3 Lk = KEY_DIR, Lr = RIM_DIR, v = -rd;
  float nk = dot(n, Lk), dif = sat(nk) * sh, wrap = sat((nk + 0.5) / 1.5);
  vec3 col = alb * uKeyCol * (dif * 0.9 + wrap * 0.12);
  col += alb * uKeyCol * vec3(1.0, 0.32, 0.26) * max(wrap - dif, 0.) * 0.55 * sss;           // subsurface red in the shadow side
  col += alb * uFillCol * (0.55 + 0.45 * n.y) * 0.30 * ao;                                     // sky / fill
  col += alb * vec3(0.55, 0.12, 0.16) * sat(0.5 - 0.5 * n.y) * 0.18 * ao;                     // red bounce from below
  col += alb * uRimCol * vec3(1.0, 0.55, 0.5) * pow(sat(dot(rd, Lr)), 3.) * thin * sss * 1.4; // light through thin tips
  float fr = fresnel(dot(n, v), 0.028);
  vec3 h = normalize(Lk + v);
  col += uKeyCol * ggx(sat(dot(n, h)), rough) * fr * dif * wet * 1.6;
  col += studioEnv(reflect(rd, n)) * fr * wet * mix(ao, 1., 0.3);
  col += uRimCol * pow(1. - sat(dot(n, v)), 3.) * sat(dot(n, Lr) + 0.35) * 0.35 * ao * (0.25 + 0.75 * wet);
  return col; }
vec3 applyFog(vec3 col, float t, vec3 rd){ return mix(col, uFogCol * (1.0 - 0.35 * rd.y), 1. - exp(-uFogK * t * t)); }
vec3 camRay(vec2 fc, out vec3 ro){ vec2 uv = (2. * fc - uRes) / uRes.y; ro = uRo; mat3 cm = camMat(uRo, uTa, uRoll); return cm * normalize(vec3(uv, uFov)); }
`;

  // ------------------------------------------------------------------------------------------------ papillae field
  G.field = `
uniform float uGrow;     // 0..1 long papillae toward the back
uniform float uSway;     // sway amount of the long ones
uniform float uSwayF;    // extra sway speed (0 = normal)
uniform float uTight;    // 1 = keep every tip within one cell of its base (lean + sway), so the 3x3 cell check never misses a
                         // tip and thin tips stop popping between frames (papillae3d); 0 = the original look (carpet3d)
uniform float uCoat;     // 0..1 coating toward the back
uniform float uSpeck;    // 0..1 density of food / gunk specks
uniform float uLongZ0; uniform float uLongZ1;   // z range over which papillae get long
uniform float uCoatZ0; uniform float uCoatZ1;   // z range over which the coating builds
uniform float uFall;     // specks falling in: 0 = all resting, >0 = time since the drop started (s)
uniform float uClear;    // keep papillae out of a small circle around the camera (low shots inside the shag)
uniform float uCut;      // cutaway: everything at x < uCut is removed and the cut face shows the tissue section (off below -50)
uniform float uMucus;    // 0..1 glossy mucus strands slung between papillae (FIELD_EXTRA)
uniform float uCells;    // dead cells drifting down and settling: 0 = none, >0 = seconds since they started (FIELD_EXTRA)
uniform vec4 uHeroCrumb; // FIELD_EXTRA: one labelled crumb at xyz, w = size (0 = none)
uniform vec4 uHeroA; uniform vec4 uHeroB;   // FIELD_EXTRA: one labelled mucus strand between A and B (w = on)
const float CELL = 0.085;
float hex2(vec2 p, float r){ const vec3 k = vec3(-0.866025, 0.5, 0.57735); p = abs(p); p -= 2. * min(dot(k.xy, p), 0.) * k.xy; p -= vec2(clamp(p.x, -k.z * r, k.z * r), r); return length(p) * sign(p.y); }
float gMat; float gTip; float gId; float gCoat;
float papHeight(vec2 id, float z){ float back = smoothstep(uLongZ0, uLongZ1, z); return mix(0.035, 0.34, back * uGrow) * (0.65 + 0.7 * hash12(id * 1.37)); }
float coatH(vec2 xz){ float k = uCoat * smoothstep(uCoatZ0, uCoatZ1, xz.y); if (k <= 0.) return 0.; return k * (0.030 + 0.030 * noise3(vec3(xz * 7., 1.3))); }
float fieldSurf(vec3 p){ return p.y + 0.005 * noise3(vec3(p.xz * 16., 0.)) + 0.03 * sin(p.x * 1.3) - coatH(p.xz); }
float fieldMap(vec3 p){
  float hb = 0.07 + 0.47 * uGrow * smoothstep(uLongZ0 - 0.6, uLongZ1, p.z + 0.25);
  float s = fieldSurf(p);
  float hbc = hb + (uCells > 0. && uCells < 2.6 ? 1.0 : 0.) + (uFall > 0. && uFall < 2.3 ? 0.75 : 0.);
  if (p.y > hbc + 0.03) { gMat = 0.; return max(min(p.y - hbc, s) * 0.9, uCut - p.x); }
  vec2 cell = floor(p.xz / CELL);
  float dP = 1e5, dS = 1e5, dM = 1e5, dC = 1e5, tip = 0., fung = 0., sid = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = cell + vec2(float(i), float(j));
    vec2 base = (id + 0.5) * CELL + (hash22(id) - 0.5) * CELL * 0.45;
    float isF = step(0.93 - 0.05 * (1. - smoothstep(0.5, 3.0, base.y)), hash12(id * 3.7 + 1.9)) * (1. - smoothstep(uLongZ0, uLongZ0 + 1.5, base.y));
    float h = isF > 0.5 ? CELL * 0.30 : papHeight(id, base.y);
    if (uClear > 0.) h *= mix(0.12, 1., smoothstep(uClear * 0.5, uClear, length(base - uRo.xz)));
    float ph = hash12(id + 7.1) * 6.283;
    float st = uTime * (1. + uSwayF);
    vec2 bend = vec2(sin(st * 1.3 + ph * 0.35 + base.y * 2.0 + base.x * 1.5), cos(st * 1.1 + ph * 1.7)) * min(uSway * h * 0.3, CELL * mix(0.7, 0.42, uTight));
    float lean = mix(0.18, 0.1, uTight) * h;
    float dd = isF > 0.5 ? sdEllipsoid(p - vec3(base.x, h * 0.40, base.y), vec3(CELL * 0.36, h * 0.66, CELL * 0.36))
                         : sdRoundCone(p, vec3(base.x, -0.01, base.y), vec3(base.x + bend.x, h, base.y + bend.y + lean), CELL * 0.20, CELL * (0.035 + 0.025 * hash12(id + 3.3)));
    if (dd < dP) { dP = dd; tip = clamp(p.y / max(h, 0.001), 0., 1.); fung = isF; }
    if (i <= 0 && j <= 0 && uSpeck > 0.) {                            // a speck of food / gunk at this cell's far corner
      float zc = (id.y + 1.) * CELL;
      float dens = uSpeck * (0.18 + 0.62 * smoothstep(uLongZ0 - 0.8, uLongZ1, zc));
      if (hash12(id * 5.1 + 2.7) < dens) {
        vec2 c = (id + 1.) * CELL + (hash22(id + 11.) - 0.5) * CELL * 0.3;
        float r = CELL * (0.07 + 0.12 * hash12(id + 13.));
        float lodged = smoothstep(uLongZ0, uLongZ1, zc) * uGrow * hash12(id + 19.) * 0.12;
        float y = r * 0.25 + coatH(c) * 0.8 + lodged;
        if (uFall > 0.) { float t0 = hash12(id + 23.) * 1.1; float k = clamp((uFall - t0) / 0.85, 0., 1.); y += (1. - k * k) * 0.7; }
        vec3 q = p - vec3(c.x, y, c.y);
        q.xz = rot2(hash12(id + 29.) * 6.283) * q.xz;
        float kind = hash12(id + 17.);
        float de;
        if (kind < 0.42) {                                                // a crumb: irregular, dry
          q.xy = rot2(hash12(id + 31.) * 0.8 - 0.4) * q.xy;
          de = sdRoundBox(q, vec3(r * 0.9, r * 0.55, r * 0.7), r * 0.3);
          if (de < 0.02) de += (noise3(q * 90. + id.xyx) - 0.5) * r * 0.9;
        } else {                                                          // gunk: a soft lumpy smear, two lobes
          vec3 q2 = q - vec3(r * 0.9, 0., r * 0.4);
          de = smin(sdEllipsoid(q, vec3(r * 1.1, r * 0.5, r * 0.8)), sdEllipsoid(q2, vec3(r * 0.8, r * 0.4, r * 0.6)), r * 0.5);
          if (de < 0.02) de += (noise3(q * 45. + id.xyx) - 0.5) * r * 0.8;
        }
        if (de < dS) { dS = de; sid = kind; }
      }
    }
#ifdef FIELD_EXTRA
    if (j <= 0 && uMucus > 0. && hash12(id * 7.7 + 3.1) < uMucus * 0.5) {     // a mucus strand to the next papilla in z
      vec2 id2 = id + vec2(0., 1.);
      vec2 b2 = (id2 + 0.5) * CELL + (hash22(id2) - 0.5) * CELL * 0.45;
      float h2 = papHeight(id2, b2.y), y1 = h * (0.35 + 0.35 * hash12(id + 41.)), y2 = h2 * (0.35 + 0.35 * hash12(id + 43.));
      vec3 a = vec3(base.x + bend.x * y1 / max(h, 0.01), y1, base.y + (bend.y + lean) * y1 / max(h, 0.01)), c2 = vec3(b2.x, y2, b2.y + 0.18 * y2);
      vec3 m = (a + c2) * 0.5 - vec3(0., 0.035 + 0.03 * hash12(id + 47.), 0.);
      float rr = 0.0026 + 0.0018 * hash12(id + 53.);
      float dm = min(sdCapsule(p, a, m, rr), sdCapsule(p, m, c2, rr));
      dm = smin(dm, sdSphere(p - m, rr * 2.0), 0.008);                           // a droplet sagging in the middle
      dM = min(dM, dm);
    }
    if (i <= 0 && j <= 0 && uCells > 0. && hash12(id * 9.3 + 1.7) < 0.22) {     // a dead cell (flat squame) drifting down
      vec2 c = (id + 1.) * CELL + (hash22(id + 61.) - 0.5) * CELL * 0.4;
      float rest = 0.03 + hash12(id + 67.) * 0.22 * uGrow;
      float k = clamp((uCells - hash12(id + 71.) * 1.2) / 1.1, 0., 1.); k = 1. - (1. - k) * (1. - k);
      vec3 q = p - vec3(c.x + 0.04 * sin(uCells * 2. + id.x) * (1. - k), rest + (1. - k) * 0.9, c.y);
      q = rotX(0.5 * (hash12(id + 73.) - 0.5) + (1. - k) * sin(uCells * 3. + id.y)) * rotZ(0.6 * (hash12(id + 79.) - 0.5)) * q;
      float rc = CELL * (0.32 + 0.1 * hash12(id + 83.));
      float dc = max(hex2(q.xz, rc), abs(q.y) - 0.0016) - 0.0012;
      dc = min(dc, sdEllipsoid(q, vec3(rc * 0.26, 0.0045, rc * 0.26)));           // the nucleus
      dC = min(dC, dc);
    }
#endif
  }
  float d = smin(s, dP, 0.012);
  d = min(d, dS);
  gMat = dS < min(dP, s) ? 3. : (dP < s ? (fung > 0.5 ? 2. : 1.) : 0.);
#ifdef FIELD_EXTRA
  if (uHeroCrumb.w > 0.) { vec3 q = p - uHeroCrumb.xyz; float r = uHeroCrumb.w; q.xy = rot2(0.3) * q.xy;
    float de = sdRoundBox(q, vec3(r * 0.9, r * 0.6, r * 0.75), r * 0.3); if (de < 0.02) de += (noise3(q * 70.) - 0.5) * r * 0.7;
    if (de < d) { d = de; gMat = 3.; sid = 0.2; } }
  if (uHeroA.w > 0.) { vec3 m = (uHeroA.xyz + uHeroB.xyz) * 0.5 - vec3(0., 0.05, 0.);
    float dm = min(sdCapsule(p, uHeroA.xyz, m, 0.005), sdCapsule(p, m, uHeroB.xyz, 0.005)); dm = smin(dm, sdSphere(p - m - vec3(0., -0.006, 0.), 0.012), 0.012);
    dM = min(dM, dm); }
#endif
  if (dM < d) { d = dM; gMat = 4.; }
  if (dC < d) { d = dC; gMat = 5.; }
  if (uCut > -50.) { float dc = uCut - p.x; if (dc > d) { d = dc; gMat = 6.; } }
  gTip = tip; gId = sid; gCoat = coatH(p.xz);
  return d; }
`;

  // shading for the field (after #include <raymarch>)
  G.fieldShade = `
uniform float uShadow;   // 0/1 soft shadows from the key (costly; worth it inside the shag)
vec3 shadeField(vec3 p, vec3 n, vec3 rd, float t){
  float ao = calcAO(p, n);
  float sh = uShadow > 0.5 ? mix(0.4, 1., softShadow(p + n * 0.003, KEY_DIR, 0.004, 0.8, 9.)) : 1.;
  fieldMap(p); float mat = gMat, tip = gTip, id = gId, coat = sat(gCoat / 0.05);
  vec3 alb; float rough = 0.2, wet = 1.0, sss = 1.0, thin = 0.;
  vec3 nb = n;
  if (mat < 0.5) {                                                    // the tongue surface between papillae
    alb = vec3(0.36, 0.045, 0.085) * (0.8 + 0.35 * noise3(p * 30.));
    alb = mix(alb, vec3(0.78, 0.70, 0.52) * (0.85 + 0.3 * noise3(p * 80.)), smoothstep(0.05, 0.6, coat));   // coating: pale yellow-white film
    rough = mix(0.16, 0.55, coat); wet = mix(1., 0.35, coat);
    nb = normalize(n + (vec3(noise3(p * 55.), 0., noise3(p * 55. + 5.)) - 0.5) * 0.12);
  } else if (mat < 1.5) {                                             // filiform papilla: red base, pale keratin tip
    alb = mix(vec3(0.46, 0.07, 0.13), vec3(0.94, 0.72, 0.72), pow(tip, 1.15));
    alb *= 0.88 + 0.24 * noise3(p * 45.);
    alb = mix(alb, vec3(0.80, 0.72, 0.55), smoothstep(0.2, 0.9, coat) * (1. - tip) * 0.8);
    thin = pow(tip, 2.);
    float nf = mix(220., 90., uTight);                                 // papillae3d: coarser, softer so tips do not sparkle in motion
    nb = normalize(n + (vec3(noise3(p * nf), noise3(p * nf + 3.), noise3(p * nf + 5.)) - 0.5) * mix(0.22, 0.1, uTight));
  } else if (mat < 2.5) {                                             // fungiform: rounder, redder, glossy
    alb = vec3(0.74, 0.13, 0.21) * (0.9 + 0.15 * noise3(p * 60.)); rough = 0.12;
  } else if (mat < 3.5 && id < 0.42) {                                // crumb: dry, golden to brown
    alb = mix(vec3(0.80, 0.58, 0.30), vec3(0.42, 0.24, 0.10), hash13(floor(p * 40.)) * 0.6 + 0.2 * noise3(p * 120.));
    rough = 0.55; wet = 0.25; sss = 0.3;
    nb = normalize(n + (vec3(noise3(p * 300.), noise3(p * 300. + 3.), noise3(p * 300. + 5.)) - 0.5) * 0.5);
  } else if (mat < 3.5) {                                             // gunk: whitish-yellow, soft, a little glossy
    alb = mix(vec3(0.84, 0.80, 0.60), vec3(0.72, 0.66, 0.38), smoothstep(0.42, 1., id)) * (0.8 + 0.3 * noise3(p * 110.));
    rough = 0.34; wet = 0.55; sss = 0.7;
  } else if (mat < 4.5) {                                             // mucus: pale, glassy, very wet
    alb = vec3(0.50, 0.54, 0.50); rough = 0.04; wet = 2.4; sss = 1.8; thin = 1.; sh = mix(sh, 1., 0.7);
  } else if (mat < 5.5) {                                             // dead cell: pale, papery, a darker nucleus
    alb = vec3(0.90, 0.80, 0.78) * (0.9 + 0.2 * noise3(p * 150.)); rough = 0.4; wet = 0.4; sss = 1.; thin = 1.;
  } else {                                                            // the cut face: muscle below a thin epithelium, darker with depth
    float y = p.y;
    float fib = 0.5 + 0.5 * sin(y * 260. + noise3(p * 18.) * 6.);
    alb = mix(vec3(0.30, 0.03, 0.07), vec3(0.46, 0.07, 0.12), fib * 0.6) * (0.8 + 0.3 * noise3(p * 40.));
    alb = mix(alb, vec3(0.70, 0.22, 0.28), smoothstep(-0.03, 0.0, y));
    alb *= mix(1., 0.25, smoothstep(-0.05, -0.4, y));
    rough = 0.3; wet = 0.5; sss = 0.6;
  }
  vec3 col = shadeTissue(nb, rd, alb, rough, wet, sss, thin, ao, sh * mix(1., ao, 0.5));
  return col; }
`;

  // ------------------------------------------------------------------------------------------------ a real shag carpet (wool)
  G.carpet = `
const float CC = 0.058;
float gYs; vec3 gYa; vec3 gYb; float gYid; float gCrumb;
float carpetMap(vec3 p){
  float back = p.y + 0.004 * noise3(vec3(p.xz * 30., 0.));
  if (p.y > 0.42) { gCrumb = 0.; return min(p.y - 0.4, back); }
  vec2 cell = floor(p.xz / CC);
  float d = 1e5, dcr = 1e5;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = cell + vec2(float(i), float(j)); vec2 hid = id * 1.7;
    vec2 b = (id + 0.5) * CC + (hash22(hid) - 0.5) * CC * 0.6;
    float h = 0.24 + 0.12 * hash12(hid * 2.3);
    float ang = hash12(hid + 4.1) * 6.283;
    vec2 dir = vec2(cos(ang), sin(ang));
    float sw = 0.01 * sin(uTime * 0.9 + ang * 3.);
    vec3 a = vec3(b.x, 0., b.y), m = vec3(b.x + dir.x * 0.045, h, b.y + dir.y * 0.045);
    vec3 e = vec3(b.x + dir.x * (0.13 + sw), h * 0.66, b.y + dir.y * (0.13 + sw));
    float r = 0.0135 + 0.004 * hash12(hid + 9.);
    float d1 = sdCapsule(p, a, m, r), d2 = sdRoundCone(p, m, e, r, r * 0.75);
    float dd = min(d1, d2);
    if (dd < d) { d = dd; gYa = d1 < d2 ? a : m; gYb = d1 < d2 ? m : e; gYid = hash12(hid + 13.); gYs = d1 < d2 ? 0. : 1.; }
    if (i <= 0 && j <= 0 && hash12(id * 5.3 + 1.) < 0.08) {                    // a crumb lost in the pile
      vec2 c = (id + 1.) * CC; float rc = 0.012 + 0.01 * hash12(id + 3.);
      vec3 q = p - vec3(c.x, 0.02 + hash12(id + 5.) * 0.12, c.y);
      float dc = sdRoundBox(q, vec3(rc, rc * 0.6, rc * 0.8), rc * 0.3);
      if (dc < 0.02) dc += (noise3(q * 120.) - 0.5) * rc * 0.8;
      dcr = min(dcr, dc);
    }
  }
  d = smin(d, back, 0.01);
  gCrumb = dcr < d ? 1. : 0.;
  return min(d, dcr); }
`;
  G.carpetShade = `
vec3 shadeCarpet(vec3 p, vec3 n, vec3 rd, float t){
  float ao = calcAO(p, n);
  carpetMap(p);
  vec3 v = -rd; float nk = dot(n, KEY_DIR);
  if (gCrumb > 0.5) {
    vec3 alb = vec3(0.70, 0.46, 0.20) * (0.8 + 0.3 * noise3(p * 150.));
    return alb * uKeyCol * (sat(nk) * 0.9 + 0.15) * ao + alb * uFillCol * 0.2 * ao; }
  // wool: two plies twisting round the yarn, fine fibres, a soft velvet sheen at grazing angles
  vec3 ax = normalize(gYb - gYa); vec3 w = p - gYa; float s = dot(w, ax);
  vec3 radial = normalize(w - ax * s + 1e-5); vec3 bx = normalize(cross(ax, vec3(0.3, 0.1, 0.9)));
  float th = atan(dot(radial, cross(ax, bx)), dot(radial, bx));
  float lod = smoothstep(1.6, 0.5, t);
  float ply = 0.5 + 0.5 * sin(th * 2. + s * 260.);
  vec3 fz = vec3(noise3(p * 900.), noise3(p * 900. + 3.), noise3(p * 900. + 7.)) - 0.5;
  vec3 nb = normalize(n + fz * 0.4 * lod + ax * (ply - 0.5) * 0.22 * lod);
  vec3 alb = mix(vec3(0.80, 0.72, 0.58), vec3(0.62, 0.52, 0.40), gYid * 0.7) * (0.92 + 0.1 * mix(0.5, ply, lod));
  float depth = smoothstep(0.0, 0.2, p.y);
  float dif = sat(dot(nb, KEY_DIR)), wrap = sat((dot(nb, KEY_DIR) + 0.6) / 1.6);
  vec3 col = alb * uKeyCol * (dif * 0.75 + wrap * 0.25) * mix(0.35, 1., depth);
  col += alb * uFillCol * (0.5 + 0.5 * nb.y) * 0.25 * ao;
  col += uKeyCol * alb * pow(1. - sat(abs(dot(n, v))), 3.) * 0.6 * depth;          // velvet sheen
  return col * mix(ao, 1., 0.25); }
`;
  // translucent saliva riding on the tops of the papillae (render-time, after the march): x > uCut, z < uSpitFront
  G.saliva = `
uniform float uSpit; uniform float uSpitY; uniform float uSpitFront;
vec3 spitLayer(vec3 ro, vec3 rd, float tHit, vec3 behind){
  if (uSpit <= 0.) return behind;
  float yb = uSpitY, yt = uSpitY + 0.075, t0 = 0., t1 = 1e4; vec3 nIn = vec3(0., 1., 0.);
  if (abs(rd.y) < 1e-4) { if (ro.y < yb || ro.y > yt) return behind; }
  else { float ta = (yb - ro.y) / rd.y, tb = (yt - ro.y) / rd.y; t0 = min(ta, tb); t1 = max(ta, tb); nIn = vec3(0., rd.y < 0. ? 1. : -1., 0.); }
  if (uCut > -50.) {
    if (abs(rd.x) > 1e-5) { float tx = (uCut - ro.x) / rd.x; if (rd.x > 0.) { if (tx > t0) { t0 = tx; nIn = vec3(-1., 0., 0.); } } else t1 = min(t1, tx); }
    else if (ro.x < uCut) return behind; }
  if (abs(rd.z) > 1e-5) { float tz = (uSpitFront - ro.z) / rd.z; if (rd.z > 0.) t1 = min(t1, tz); else if (tz > t0) { t0 = tz; nIn = vec3(0., 0., 1.); } }
  else if (ro.z > uSpitFront) return behind;
  t0 = max(t0, 0.); float tEnd = tHit > 0. ? min(t1, tHit) : t1;
  if (tEnd <= t0) return behind;
  float len = tEnd - t0; vec3 pe = ro + rd * t0;
  if (nIn.y > 0.5) nIn = normalize(nIn + vec3(noise3(vec3(pe.xz * vec2(16., 7.) - vec2(0., uTime * 2.2), uTime * 0.6)) - 0.5, 0., noise3(vec3(pe.xz * vec2(16., 7.) + 9., uTime * 0.6)) - 0.5) * 0.35);
  vec3 tr = exp(-len * vec3(7., 3., 1.6));
  vec3 col = behind * mix(vec3(1.), tr, uSpit);
  col += vec3(0.20, 0.48, 0.75) * (1. - tr.b) * 0.3 * uSpit;
  col += studioEnv(reflect(rd, nIn)) * fresnel(dot(nIn, -rd), 0.02) * uSpit;
  float st = pow(noise3(vec3(pe.x * 28., pe.y * 40., pe.z * 5. - uTime * 3.)), 5.);
  col += vec3(0.7, 0.9, 1.0) * st * 0.8 * uSpit;
  float edge = smoothstep(0.03, 0.0, abs(pe.z - uSpitFront)) + smoothstep(0.006, 0.0, abs(pe.y - yt)) * 0.6;
  col += vec3(0.75, 0.92, 1.0) * edge * 0.25 * uSpit;
  return col; }
`;

  // ------------------------------------------------------------------------------------------------ whole tongue + lower arch
  // The lower dental arch (a typodont-style model: gums and 14 teeth, no lips) gives the tongue its context.
  // Teeth sit on a half ellipse (centre z = ARCH.zc, radii a x b) from the incisors at z = zc - b; positions by arc length.
  const ARCH = { a: 0.36, b: 0.56, zc: 0.02, gy: -0.05 };
  const TEETH = (() => {
    const N = 3000, pts = []; let s = 0, prev = null;
    for (let i = 0; i <= N; i++) { const th = (i / N) * Math.PI / 2, p = [ARCH.a * Math.sin(th), ARCH.zc - ARCH.b * Math.cos(th)]; if (prev) s += Math.hypot(p[0] - prev[0], p[1] - prev[1]); pts.push({ th, s, p }); prev = p; }
    const widths = [0.052, 0.056, 0.068, 0.070, 0.072, 0.108, 0.100].map((w) => w * 1.35);
    let acc = 0.004; const out = [];
    widths.forEach((w) => { const sc = acc + w / 2; acc += w + 0.004; const q = pts.find((o) => o.s >= sc) || pts[pts.length - 1];
      out.push([q.p[0], q.p[1], Math.atan2(ARCH.b * Math.sin(q.th), ARCH.a * Math.cos(q.th)), w]); });
    return out;
  })();
  const f4 = (v) => v.toFixed(5);
  G.tongue = `
uniform float uCoat;          // 0..1 coating amount
uniform vec3 uCoatCol;        // coating colour (linear)
uniform float uCoatFuzz;      // 0..1 hairy / furred look of the coating (dark coating)
uniform float uCoatSolid;     // 0 = speckled on the papilla tips, 1 = a continuous film
uniform float uStr[20];       // up to 4 scraped stripes: xc, halfW, zNow, zStart, amount (tongue-local z)
uniform float uPile;          // gunk collected on the scraper (0..1)
uniform vec3 uScrP;           // scraper: arc centre (world)
uniform vec3 uScrA;           // scraper: pitch, yaw, roll
uniform float uScrR;          // scraper: arc radius (0 = no scraper)
uniform float uDay;           // regrowth: a different coating pattern each day
uniform float uTongueY;       // tilt of the tongue (radians, front up) about a pivot at the back: sticking out over the teeth
uniform float uTongueZ;       // tongue slide along z (negative = out of the mouth)
uniform float uJaw;           // 1 = draw the lower arch (gums, teeth, floor of the mouth)
uniform float uScrBend;       // the U bends across its width to follow the dome of the tongue
uniform float uGag;           // 0..1 red glow on the very back (the gag zone)
uniform vec4 uLines;          // tongue-local z of up to 3 lime dashed lines (xyz) drawn on the surface, w = alpha
const float GY = ${f4(ARCH.gy)};
const vec2 AR = vec2(${f4(ARCH.a)}, ${f4(ARCH.b)}); const float AZC = ${f4(ARCH.zc)};
const vec4 TEETH[7] = vec4[7](${TEETH.map((q) => `vec4(${q.map(f4).join(', ')})`).join(', ')});
float gMat; float gCoat; float gTip;
float tHalfW(float z){                                                // planform half width (approximation for masks)
  float f = clamp((-z - 0.05) / 0.47, 0., 1.);
  return (0.285 + 0.02 * smoothstep(0.0, 0.4, z)) * pow(max(1. - pow(f, 2.2), 0.), 0.5); }
float tTop(float x, float z){
  float top = 0.022 + 0.040 * smoothstep(-0.52, 0.05, z) - 0.13 * (x * x) / 0.08;
  top -= 0.008 * exp(-x * x / 0.0012) * smoothstep(-0.46, -0.26, z) * smoothstep(0.34, 0.08, z);   // median groove
  top -= 1.1 * pow(max(z - 0.36, 0.), 2.);                                                          // the root dips into the throat
  return top; }
// tongue-local -> world: tilt by uTongueY about (y 0, z TPZ), then slide by uTongueZ; tLift = world y offset of a top point
const float TPZ = 0.6;
vec3 toTongue(vec3 p){ p.z -= uTongueZ; float c = cos(uTongueY), s = sin(uTongueY), dz = p.z - TPZ; return vec3(p.x, p.y * c + dz * s, -p.y * s + dz * c + TPZ); }
float tLift(float zl){ return -(zl - TPZ) * sin(uTongueY); }
float stripeClear(vec2 xz){
  float c = 0.;
  for (int k = 0; k < 4; k++) {
    float xc = uStr[k * 5], hw = uStr[k * 5 + 1], zn = uStr[k * 5 + 2], zs = uStr[k * 5 + 3], a = uStr[k * 5 + 4];
    if (a <= 0. || hw <= 0.) continue;
    float dx = xz.x - xc + (noise3(vec3(xz * 60., float(k))) - 0.5) * 0.012; float inside = smoothstep(hw, hw * 0.9, abs(dx));
    float arc = sqrt(max(hw * hw - dx * dx, 0.));                   // the U bulges toward the throat
    float z0 = zn + arc, z1 = zs + arc;
    float band = smoothstep(z0 - 0.006, z0 + 0.004, xz.y) * smoothstep(z1 + 0.02, z1 - 0.01, xz.y);
    c = max(c, inside * band * a);
  }
  return c; }
float coatMask(vec2 xz){
  if (uCoat <= 0.) return 0.;
  float z = xz.y, hw = max(tHalfW(z), 0.01);
  float n = fbm3(vec3(xz * 7., uDay * 0.37), 3);
  float k = smoothstep(-0.36 + 0.1 * n, 0.22, z) * smoothstep(0.98, 0.45 + 0.2 * n, abs(xz.x) / hw);
  k *= 0.45 + 0.9 * n;
  k = smoothstep(0.08, 0.75, k * uCoat * 1.2);
  return k * (1. - stripeClear(xz)); }
mat3 scrRot(){ return rotY(uScrA.y) * rotX(uScrA.x) * rotZ(uScrA.z); }
// steel U: a thin strip bent into a U lying in the local xz plane, arc at +z (the back), legs toward -z, then up to the handles
float sdScraper(vec3 p, out float pileD){
  pileD = 1e5;
  vec3 q = transpose(scrRot()) * (p - uScrP);
  float R = uScrR, L = 0.72;
  float lift = max(-q.z, 0.); q.y -= 0.35 * lift * lift;               // the legs bend up toward the handles
  q.y += uScrBend * q.x * q.x;
  float d2 = q.z > 0. ? abs(length(q.xz) - R) : length(vec2(abs(q.x) - R, q.z - clamp(q.z, -L, 0.)));
  float strip = sdBox(vec3(d2, q.y, 0.), vec3(0.0022, 0.021, 1.)) - 0.0008;
  float grip = q.z < -L * 0.55 ? length(vec2((abs(q.x) - R) * 0.8, q.y)) - 0.012 : 1e5;   // rounded grips on the leg ends
  grip = max(grip, -q.z - L);
  if (uPile > 0.) { float ra = length(q.xz); pileD = length(vec2(ra - (R - 0.010 * uPile - 0.002), q.y + 0.015)) - 0.013 * uPile; pileD = max(pileD, -q.z + 0.004); }
  return min(strip, grip); }
float tongueBody(vec3 p){
  p = toTongue(p);
  float e1 = sdEllipsoid(p - vec3(0., -0.022, -0.25), vec3(0.222, 0.062, 0.275));
  float e2 = sdEllipsoid(p - vec3(0., -0.060, 0.02), vec3(0.272, 0.115, 0.40));
  float e3 = sdEllipsoid(p - vec3(0., -0.13, 0.36), vec3(0.292, 0.17, 0.30));
  float d = smin(smin(e1, e2, 0.12), e3, 0.12);
  d = smin(d, sdEllipsoid(p - vec3(0., -0.40, 0.60), vec3(0.30, 0.36, 0.24)), 0.14);     // the root, down into the throat
  float gx = 3.25 * p.x;
  d = smax(d, (p.y - tTop(p.x, p.z)) / sqrt(1. + gx * gx), 0.045);
  return d * 0.9; }
// signed 2D distance to the arch centreline (negative inside the arch)
float archD(vec2 xz){ vec2 q = vec2(abs(xz.x), xz.y - AZC);
  if (q.y < 0.) { float k0 = length(q / AR), k1 = length(q / (AR * AR)); return k0 * (k0 - 1.) / k1; }
  return q.x - AR.x; }
float sdTooth(vec3 p, int i, out float hn){
  vec4 T = TEETH[i];
  vec2 d = vec2(abs(p.x), p.z) - T.xy; vec2 tg = vec2(cos(T.z), sin(T.z)), nm = vec2(tg.y, -tg.x);
  float u = dot(d, tg), v = dot(d, nm), w = T.w;
  float H = i < 2 ? 0.100 : i == 2 ? 0.108 : i < 5 ? 0.088 : 0.078;
  float y = p.y - GY; hn = clamp(y / H, 0., 1.);
  float r;
  if (i < 2) {                                                      // incisors: thin, chisel-edged
    float th = 0.036 * (1. - 0.5 * hn);
    r = sdRoundBox(vec3(u / (0.92 + 0.08 * hn), y - H * 0.45, v), vec3(w * 0.5 - 0.0015, H * 0.55, th * 0.5), 0.010);
  } else if (i == 2) {                                              // canine: a pointed cusp
    r = sdRoundBox(vec3(u, y - H * 0.42 + 0.45 * abs(u), v / (1. - 0.35 * hn)), vec3(w * 0.5 - 0.002, H * 0.5, 0.028), 0.016);
  } else {                                                          // premolars and molars, cusps on top
    float t2 = i < 5 ? 0.078 : 0.104;
    r = sdRoundBox(vec3(u / (0.9 + 0.1 * hn), y - H * 0.45, v / (0.9 + 0.1 * hn)), vec3(w * 0.5 - 0.003, H * 0.52, t2 * 0.5 - 0.004), i < 5 ? 0.032 : 0.028);
    if (r < 0.01) r += 0.008 * (cos(u / w * 6.283 * (i < 5 ? 1. : 1.5)) * cos(v / t2 * 6.283) + 1.) * smoothstep(0.6, 1., hn);
  }
  return r; }
float jawMap(vec3 p, out float mat){
  float d2 = archD(p.xz);
  // gum ridge along the arch, the floor of the mouth inside it
  float gum = smax(abs(d2) - 0.064 - 0.25 * max(GY - p.y, 0.), p.y - (GY + 0.014 - 2.6 * d2 * d2 - 1.4 * pow(max(p.z + 0.02, 0.), 2.)), 0.03);
  gum = smax(gum, p.z - 0.16, 0.08);
  gum = max(gum, -0.4 - p.y);
  float floorD = smax(p.y + 0.105, d2 + 0.03, 0.06);
  floorD = smax(floorD, p.z - 0.4, 0.05);
  float d = smin(gum, floorD, 0.05); mat = 4.;
  if (abs(d2) < 0.12 && p.y > GY - 0.03 && p.y < 0.12) {
    float hn, best = 1e5, bh = 0.;
    for (int i = 0; i < 7; i++) { float h; float r = sdTooth(p, i, h); if (r < best) { best = r; bh = h; } }
    if (best < d + 0.004) { mat = 3.; gTip = bh; }
    d = smin(d, best, 0.006);
  }
  if (mat > 3.5 && floorD < gum) mat = 5.;
  return d; }
float tongueMap(vec3 p){
  float d = tongueBody(p);
  gMat = 0.; gCoat = 0.;
  vec2 xz = toTongue(p).xz;
  if (d < 0.03 && uCoat > 0.) { float c = coatMask(xz); gCoat = c; d -= c * 0.0055; }
  if (uJaw > 0.5) { float jm; float dj = jawMap(p, jm); if (dj < d) { d = dj; gMat = jm; } }
  if (uScrR > 0.) {
    float pd; float ds = sdScraper(p, pd);
    if (ds < d) { d = ds; gMat = 1.; }
    if (pd < d) { d = pd; gMat = 2.; }
  }
  return d; }
`;

  G.tongueShade = `
// fine surface detail by bump mapping: dense filiform dots, sparse fungiform (tip and sides), the circumvallate V
float tBump(vec2 xz, out float fungK, out float filK){
  vec2 v1 = vor2(xz * 150.); float fil = smoothstep(0.62, 0.05, v1.x);
  vec2 v2 = vor2(xz * 34. + 3.1);
  float hw = max(tHalfW(xz.y), 0.01), edge = smoothstep(0.55, 0.95, abs(xz.x) / hw);
  float dens = 0.12 + 0.45 * smoothstep(-0.05, -0.42, xz.y) + 0.35 * edge;
  float isF = step(1. - dens * 0.55, v2.y) * smoothstep(0.3, 0.1, xz.y);
  float fung = isF * smoothstep(0.36, 0.08, v2.x);
  float cv = 0.;
  for (int k = -4; k <= 4; k++) { float x = float(k) * 0.047; vec2 c = vec2(x, 0.335 - abs(x) * 0.62); float r = length(xz - c); cv = max(cv, smoothstep(0.02, 0.012, r) - 0.6 * smoothstep(0.026, 0.021, r) * smoothstep(0.018, 0.022, r)); }
  fungK = max(fung, cv * 0.8); filK = fil * (1. - fung);
  return fil * 0.55 * (1. - fung) + fung * 1.3 + cv * 2.2; }
vec3 bumpNormal(vec3 p, vec3 n, float amt, out float fungK, out float filK){
  vec2 xz = toTongue(p).xz; float e = 0.0012;
  float h0 = tBump(xz, fungK, filK); float f2, f3;
  float hx = tBump(xz + vec2(e, 0.), f2, f3), hz = tBump(xz + vec2(0., e), f2, f3);
  vec3 g = vec3((hx - h0) / e, 0., (hz - h0) / e) * amt;
  return normalize(n - g + n * dot(g, n)); }
// a neutral high-contrast studio for polished metal: dark room, a big overhead softbox, the warm key box, a cool strip,
// a soft horizon band and the pink tongue below. Steel = mostly dark with sharp bright bands, never a flat grey.
vec3 steelEnv(vec3 r){
  vec3 c = vec3(0.020, 0.020, 0.024);
  c += vec3(0.92, 0.93, 0.98) * 2.4 * smoothstep(0.62, 0.8, r.y);
  c += vec3(1.0, 0.9, 0.8) * 3.2 * softbox(r, KEY_DIR, vec2(0.42, 0.26));
  c += vec3(0.7, 0.8, 1.0) * 2.6 * softbox(r, RIM_DIR, vec2(0.07, 0.9));
  c += vec3(0.30, 0.30, 0.33) * smoothstep(-0.02, 0.12, r.y) * smoothstep(0.42, 0.14, r.y);
  c += vec3(0.30, 0.08, 0.11) * smoothstep(-0.05, -0.5, r.y);
  return c; }
vec3 shadeSteel2(vec3 p, vec3 n, vec3 rd, vec3 tg, float ao){
  vec3 v = -rd; vec3 b = normalize(cross(n, tg));
  float streak = noise3(vec3(dot(p, b) * 2600., dot(p, tg) * 4., 0.)) - 0.5;
  vec3 nn = normalize(n + b * streak * 0.05);
  vec3 r = reflect(rd, nn);
  vec3 env = vec3(0.);                                                     // brushed: reflections smeared across the grain
  for (int k = -2; k <= 2; k++) env += steelEnv(normalize(r + b * float(k) * 0.12));
  env /= 5.;
  vec3 base = vec3(0.66, 0.68, 0.72);
  vec3 col = env * base * fresnel(dot(nn, v), 0.6);
  vec3 h = normalize(KEY_DIR + v);
  col += uKeyCol * pow(sat(1. - pow(dot(h, tg), 2.)), 120.) * sat(dot(nn, KEY_DIR)) * 0.8;
  return col * mix(ao, 1., 0.6); }
// enamel: ivory, glossy, a little translucent toward the edge
vec3 shadeEnamel(vec3 p, vec3 n, vec3 rd, float hn, float ao, float sh){
  vec3 alb = mix(vec3(0.80, 0.70, 0.52), vec3(0.93, 0.90, 0.84), smoothstep(0.0, 0.5, hn));
  alb = mix(alb, vec3(0.70, 0.74, 0.80), smoothstep(0.8, 1.0, hn) * 0.5);
  vec3 v = -rd; float nk = dot(n, KEY_DIR);
  vec3 col = alb * uKeyCol * (sat(nk) * sh * 0.8 + sat((nk + 0.7) / 1.7) * 0.34);
  col += alb * uFillCol * (0.5 + 0.5 * n.y) * 0.42 * ao;
  float fr = fresnel(dot(n, v), 0.04);
  col += uKeyCol * ggx(sat(dot(n, normalize(KEY_DIR + v))), 0.1) * fr * sat(nk) * sh * 2.;
  col += steelEnv(reflect(rd, n)) * fr * 0.6 * ao;
  col += uRimCol * pow(1. - sat(dot(n, v)), 3.) * 0.25 * ao;
  return col; }
vec3 shadeTongue(vec3 p, vec3 n, vec3 rd, float t){
  float ao = calcAO(p, n);
  float nl = dot(n, KEY_DIR);
  float sh = nl > 0. ? softShadow(p + n * 0.012, KEY_DIR, 0.025, 1.5, 10.) : 0.;
  sh = mix(1., sh, smoothstep(0.0, 0.25, nl));                           // no shadow acne at the terminator
  tongueMap(p); float mat = gMat, coat = gCoat, hn = gTip;
  if (mat > 0.5 && mat < 1.5) {                                          // steel
    vec3 q = transpose(scrRot()) * (p - uScrP);
    vec3 tgL = q.z > 0. ? normalize(vec3(q.z, 0., -q.x)) : vec3(0., 0., 1.);
    return shadeSteel2(p, n, rd, scrRot() * tgL, mix(ao, 1., 0.3) * mix(sh, 1., 0.4)); }
  if (mat > 1.5 && mat < 2.5) {                                          // gunk on the blade
    vec3 alb = uCoatCol * (0.75 + 0.35 * noise3(p * 220.));
    return shadeTissue(n, rd, alb, 0.45, 0.5, 0.4, 0., ao, sh); }
  float deep = min(1., smoothstep(-0.04, -0.16, p.y) * 0.9 + smoothstep(0.02, 0.2, p.z) * 0.6);  // deeper in the mouth = darker
  if (mat > 2.5 && mat < 3.5) return shadeEnamel(p, n, rd, hn, ao, sh) * (1. - 0.6 * deep);
  if (mat > 3.5) {                                                       // gums and the floor of the mouth
    vec3 alb = mat < 4.5 ? vec3(0.78, 0.28, 0.30) : vec3(0.40, 0.05, 0.09);
    vec3 nb = normalize(n + (vec3(noise3(p * 260.), 0., noise3(p * 260. + 4.)) - 0.5) * 0.18);
    return shadeTissue(nb, rd, alb, 0.16, 1., 1., 0., ao, sh) * (1. - 0.75 * deep); }
  float fk, fil; vec3 nb = bumpNormal(p, n, 0.0022 * (1. - coat * 0.5) * smoothstep(0.35, 0.85, n.y), fk, fil);
  float mouth = smoothstep(0.55, 0.25, p.z - uTongueZ);                     // the back sits in the dark of the mouth
  vec3 alb = mix(vec3(0.50, 0.085, 0.13), vec3(0.62, 0.14, 0.19), 0.5 + 0.5 * noise3(p * 14.));
  alb = mix(alb, vec3(0.62, 0.10, 0.16), smoothstep(-0.2, -0.48, p.z - uTongueZ) * 0.6);
  alb = mix(alb, vec3(0.72, 0.12, 0.20), fk * 0.8);
  alb = mix(alb, vec3(0.52, 0.08, 0.13), smoothstep(0.7, 0.3, n.y));       // redder, smoother sides
  float rough = 0.18, wet = 1., sss = 1.;
  if (coat > 0.) {
    // the coating collects on the papilla tips first: a thin coat is speckled pink, a thick one a continuous film
    float cf = sat(coat * mix(0.55 + 0.9 * fil, 1.05 + 0.25 * fil, max(uCoatSolid, smoothstep(0.55, 0.95, coat))) * 1.2);
    vec3 cc = uCoatCol * (0.8 + 0.35 * fbm3(vec3(p.xz * 70., 2.), 2)) * (0.85 + 0.25 * fil);
    alb = mix(alb, cc, cf);
    rough = mix(rough, mix(0.55, 0.75, uCoatFuzz), cf); wet = mix(1., mix(0.35, 0.12, uCoatFuzz), cf); sss = mix(1., 0.45, cf);
    vec3 fz = vec3(noise3(p * vec3(520., 520., 140.)), 0., noise3(p * vec3(520., 520., 140.) + 7.)) - 0.5;   // fibres run front to back
    nb = normalize(nb + fz * uCoatFuzz * 0.7 * cf);
  }
  vec3 col = shadeTissue(nb, rd, alb, rough, wet, sss, 0., ao, sh);
  vec3 tl = toTongue(p);
  if (uGag > 0.) { float gz = smoothstep(0.1, 0.26, tl.z); col = mix(col, col * vec3(0.9, 0.22, 0.2), gz * uGag * 0.8); col += vec3(1.0, 0.12, 0.07) * uGag * 1.6 * gz * (0.8 + 0.2 * sin(uTime * 6.)); }   // the gag zone
  if (uLines.w > 0.) {                                                   // lime dashed lines on the surface
    float dash = step(0.45, fract(tl.x * 13. + 0.25));
    for (int k = 0; k < 3; k++) { float zk = uLines[k]; if (zk < -0.9) continue; col = mix(col, vec3(0.62, 0.95, 0.10) * 1.5, smoothstep(0.0062, 0.0035, abs(tl.z - zk)) * dash * uLines.w); }
  }
  return col * mix(0.2, 1., mouth); }
// how much a hit dissolves into the dark of the mouth / background (render: mix(col, bg, tongueFade(p)))
float tongueFade(vec3 p){ return clamp(max(smoothstep(0.40, 0.66, p.z - (gMat < 0.5 ? uTongueZ : 0.)), smoothstep(-0.08, -0.22, p.y)), 0., 1.); }
`;
  function frag(o) {
    return [
      ...(o.defs || []),
      o.uniforms || '',
      ...(o.parts || ['base']).map((k) => G[k]),
      o.map || '',
      '#include <raymarch>',
      ...(o.post || []).map((k) => G[k]),
      o.render || '',
    ].join('\n');
  }

  // ------------------------------------------------------------------------------------------------ JS helpers
  const lin = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.pow(v / 255, 2.2)); };
  const LIGHTS = { uKeyCol: [1.0, 0.86, 0.74], uRimCol: [0.62, 0.72, 1.0], uFillCol: [0.85, 0.62, 0.78], uFogCol: [0.09, 0.035, 0.07], uFogK: 0.28 };
  // GL renderer sized in real pixels: `px` = height of the GL canvas (1080 -> 1920x1080 at any --scale)
  function create(api, src, o = {}) {
    const res = (o.px || 1080) / (api.H * api.scale);
    return api.gl.create(api, src, { res, aa: o.aa ?? 2, steps: o.steps ?? 120, stepScale: o.stepScale ?? 0.8, eps: o.eps ?? 0.0005 });
  }
  // shots: cuts = [t0, t1, ...] (scene seconds, ascending) -> { i, u (s into the shot), len, k (0..1 through the shot) }
  function shot(t, cuts, end) {
    let i = 0; for (let k = 0; k < cuts.length; k++) if (t >= cuts[k]) i = k;
    const t0 = cuts[i], t1 = i + 1 < cuts.length ? cuts[i + 1] : end;
    return { i, u: t - t0, len: t1 - t0, k: Math.min(1, Math.max(0, (t - t0) / Math.max(0.01, t1 - t0))) };
  }
  const V = {
    lerp: (a, b, k) => a.map((v, i) => v + (b[i] - v) * k),
    add: (a, b) => a.map((v, i) => v + b[i]),
    orbit: (c, r, yaw, pitch) => [c[0] + r * Math.cos(pitch) * Math.sin(yaw), c[1] + r * Math.sin(pitch), c[2] - r * Math.cos(pitch) * Math.cos(yaw)],
  };
  // small print, top right (Cleo's "* ARTISTIC RENDERING")
  function tag(ctx, api, str = '* ARTISTIC RENDERING') { api.text(ctx, str, 1860, 64, { size: 22, color: api.P.faint, align: 'right', tracking: 2 }); }
  // tilt-shift depth of field: a blurred copy of the frame masked toward the far (top) or near (bottom) band
  let dofCv = null;
  function dof(ctx, api, o = {}) {
    const cv = ctx.canvas; if (!dofCv || dofCv.width !== cv.width) { dofCv = document.createElement('canvas'); dofCv.width = cv.width; dofCv.height = cv.height; }
    const g = dofCv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, cv.width, cv.height);
    g.filter = `blur(${Math.round((o.blur ?? 7) * api.scale)}px)`; g.drawImage(cv, 0, 0); g.filter = 'none';
    g.globalCompositeOperation = 'destination-in';
    const H = cv.height, gr = g.createLinearGradient(0, 0, 0, H);
    for (const [pos, a] of o.stops || [[0, 1], [0.3, 1], [0.5, 0], [1, 0]]) gr.addColorStop(pos, `rgba(0,0,0,${a})`);
    g.fillStyle = gr; g.fillRect(0, 0, cv.width, H);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dofCv, 0, 0); ctx.restore();
  }
  // frosted glass panel (for text over busy renders): the frame behind it blurred and darkened, a thin light edge
  let glassCv = null;
  function glass(ctx, api, x, y, w, h, r = 24, o = {}) {
    const cv = ctx.canvas; if (!glassCv || glassCv.width !== cv.width) { glassCv = document.createElement('canvas'); glassCv.width = cv.width; glassCv.height = cv.height; }
    const g = glassCv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(cv, 0, 0);
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    api.roundRect(ctx, x, y, w, h, r); ctx.clip();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = `blur(${Math.round(16 * api.scale)}px)`; ctx.drawImage(glassCv, 0, 0); ctx.filter = 'none'; ctx.restore();
    ctx.fillStyle = o.tint || 'rgba(11,10,24,0.55)'; ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.strokeStyle = 'rgba(244,241,234,0.16)'; ctx.lineWidth = 2; api.roundRect(ctx, x, y, w, h, r); ctx.stroke(); ctx.restore();
  }
  // a four-point glint (wet sparkle)
  function sparkle(ctx, x, y, s, a, color = '#fff6ea') {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 0.6); g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,240,230,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 0.6, 0, 6.2832); ctx.fill();
    ctx.fillStyle = color;
    for (const [dx, dy] of [[1, 0], [0, 1]]) { ctx.beginPath(); ctx.moveTo(x - dx * s, y - dy * s); ctx.lineTo(x + dy * s * 0.07, y + dx * s * 0.07); ctx.lineTo(x + dx * s, y + dy * s); ctx.lineTo(x - dy * s * 0.07, y - dx * s * 0.07); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  // bench: pass --params '{"bench":1}' to print the GL frame time on the still
  // Draw a GL frame and hand back a 2D canvas copied from it with a synchronous readPixels. drawImage() straight from the
  // WebGL canvas intermittently returned the page's PREVIOUS frame under GPU load (papillae3d v4e: a one-frame flash of the
  // last shot after cuts, and 0.1 s back-jumps = "stutter", since each render page draws every 3rd frame). readPixels can
  // only return the finished current frame.
  const grabs = new WeakMap();
  function grab(r) {
    const gl = r.gl, w = r.canvas.width, h = r.canvas.height;
    let o = grabs.get(r);
    if (!o) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); o = { c, g, px: new Uint8Array(w * h * 4), img: g.createImageData(w, h) }; grabs.set(r, o); }
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, o.px);
    const row = w * 4, d = o.img.data;
    for (let y = 0; y < h; y++) d.set(o.px.subarray((h - 1 - y) * row, (h - y) * row), y * row);   // GL rows are bottom-up
    o.g.putImageData(o.img, 0, 0);
    return o.c;
  }
  function timed(api, r, uniforms) {
    const t0 = performance.now(); r.draw(uniforms); const cv = grab(r);
    if (api.params.bench) api.__benchMs = (api.__benchMs || 0) + (performance.now() - t0);
    return cv;
  }
  function benchText(ctx, api) { if (api.params.bench) { api.text(ctx, `GL ${Math.round(api.__benchMs || 0)} ms`, 60, 1040, { size: 40, color: '#ff0' }); api.__benchMs = 0; } }
  // world -> screen (design px) for a camera like camRay(): for pinning labels to 3D points
  function project(cam, p) {
    const f = cam.fov, ro = cam.ro, ta = cam.ta, roll = cam.roll || 0;
    const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const nrm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
    const cw = nrm(sub(ta, ro)), cp = [Math.sin(roll), Math.cos(roll), 0], cu = nrm(cross(cw, cp)), cv = cross(cu, cw);
    const d = sub(p, ro), z = dot(d, cw); if (z <= 0.001) return null;
    const x = dot(d, cu) / z * f, y = dot(d, cv) / z * f;
    return [960 + x * 540, 540 - y * 540, z];
  }
  function camU(cam) { return { uRo: cam.ro, uTa: cam.ta, uFov: cam.fov, uRoll: cam.roll || 0 }; }
  // world y of the tongue's top at (x, z) for a tongue slid by tz and lifted by ty (mirror of tTop + tLift in the GLSL)
  // world y of the tongue's top at (x, world z) for a tongue slid by tz and tilted by ty (mirror of toTongue in the GLSL)
  function tongueTopY(x, z, tz = 0, ty = 0) {
    const TPZ = 0.6, c = Math.cos(ty), s = Math.sin(ty);
    let zl = z - tz; for (let k = 0; k < 4; k++) { const yl = tTop(x, zl), dz = zl - TPZ; const zw = yl * s + dz * c + TPZ; zl += (z - tz) - zw; }
    const yl = tTop(x, zl); return yl * c - (zl - TPZ) * s;
  }
  // JS mirror of tTop() in the GLSL (for placing the scraper on the surface)
  function tTop(x, z) {
    const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    let top = 0.022 + 0.040 * ss(-0.52, 0.05, z) - 0.13 * (x * x) / 0.08;
    top -= 0.008 * Math.exp(-x * x / 0.0012) * ss(-0.46, -0.26, z) * ss(0.34, 0.08, z);
    top -= 1.1 * Math.pow(Math.max(z - 0.36, 0), 2);
    return top;
  }
  window.M3D = { GLSL: G, frag, lin, LIGHTS, create, shot, V, tag, dof, glass, sparkle, timed, benchText, project, camU, tTop, tongueTopY, ARCH, TEETH };
})();
