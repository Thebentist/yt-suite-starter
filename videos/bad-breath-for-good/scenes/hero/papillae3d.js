// HERO (lead editor's quality test): a real-3D macro flight over the surface of the tongue, front (short papillae) to
// back (long, swaying "shag carpet"). Ray-marched on the GPU (pipeline/motion/gl.js), finished with bloom and grain.
// Words 940-990: "If you look at a tongue close up microscopically, it's not smooth at all. It's actually covered by
// these tiny little bumps. And as you go further back, weirdly enough, they get longer and longer. It's almost like
// those old shag carpets you've seen, you know, all the shag moving around."
const FRAG = `
uniform float uTravel;   // camera distance along the tongue (0 = tip)
uniform float uGrow;     // 0..1 how far the long-papillae zone has been revealed
uniform float uSway;     // carpet sway amount
uniform float uCamY;
uniform float uLook;
const float CELL = 0.085;
float papHeight(vec2 id, float z){
  float back = smoothstep(1.2, 5.5, z);                       // longer toward the back of the tongue
  float r = hash12(id * 1.37);
  return mix(0.035, 0.34, back * uGrow) * (0.65 + 0.7 * r);
}
float gFung;
float papillae(vec3 p, out float tip){
  vec2 cell = floor(p.xz / CELL);
  float d = 1e5; tip = 0.; gFung = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = cell + vec2(float(i), float(j));
    vec2 jit = (hash22(id) - 0.5) * CELL * 0.45;
    vec2 base = (id + 0.5) * CELL + jit;
    float fung = step(0.93 - 0.05 * (1. - smoothstep(0.5, 3.0, base.y)), hash12(id * 3.7 + 1.9));   // a few fungiform (red, round)
    float h = fung > 0.5 ? CELL * 0.35 : papHeight(id, base.y);
    float ph = hash12(id + 7.1) * 6.283;
    vec2 bend = vec2(sin(uTime * 1.3 + ph + base.y * 2.0), cos(uTime * 1.1 + ph * 1.7)) * min(uSway * h * 0.3, CELL * 0.7);
    float lean = 0.18 * h;                                          // filiform papillae lean toward the throat
    vec3 pa = vec3(base.x, -0.01, base.y), pb = vec3(base.x + bend.x, h, base.y + bend.y + lean);
    float dd = fung > 0.5 ? sdEllipsoid(p - vec3(base.x, h * 0.55, base.y), vec3(CELL * 0.34, h * 0.75, CELL * 0.34))
                          : sdRoundCone(p, pa, pb, CELL * 0.20, CELL * (0.035 + 0.025 * hash12(id + 3.3)));
    if (dd < d) { d = dd; tip = clamp(p.y / max(h, 0.001), 0., 1.); gFung = fung; }
  }
  return d;
}
float surface(vec3 p){ return p.y + 0.012 * fbm3(vec3(p.xz * 9., 0.), 3) + 0.03 * sin(p.x * 1.3) ; }
float gTip; float gF;
float map(vec3 p){
  float t; float pap = papillae(p, t); gF = gFung;
  float s = surface(p);
  float d = smin(s, pap, 0.012);
  gTip = (pap < s) ? t : 0.; if (gF > 0.5 && pap < s) gTip = 0.35;
  return d;
}
#include <raymarch>
vec3 render(vec2 fc){
  vec2 uv = (2. * fc - uRes) / uRes.y;
  vec3 ro = vec3(0.05 * sin(uTime * 0.4), uCamY + 0.01 * sin(uTime * 1.7), uTravel);
  vec3 ta = ro + vec3(0.12 * sin(uTime * 0.3), -uLook, 1.0);
  mat3 cam = camMat(ro, ta, 0.03 * sin(uTime * 0.5));
  vec3 rd = cam * normalize(vec3(uv, 1.9));
  vec3 fogCol = vec3(0.09, 0.035, 0.07);
  float t = march(ro, rd, 7.0);
  vec3 col;
  if (t < 0.) { col = fogCol * (1.0 - 0.4 * uv.y); }
  else {
    vec3 p = ro + rd * t, n = calcNormal(p);
    float tip = gTip; map(p); tip = gTip;
    vec3 base = mix(vec3(0.55, 0.12, 0.2), vec3(0.97, 0.78, 0.78), pow(tip, 1.3));      // deep red gaps -> whitish keratin tips
    base = mix(base, vec3(0.86, 0.2, 0.3), gF * 0.85);                               // fungiform: redder
    base *= 0.9 + 0.2 * fbm3(p * 40., 2);
    vec3 L = normalize(vec3(-0.4, 0.9, 0.35)), R = normalize(vec3(0.5, 0.35, -0.8));
    float dif = clamp(dot(n, L) * 0.5 + 0.5, 0., 1.);                                  // wrapped diffuse (soft tissue)
    float sss = pow(clamp(dot(rd, -R) * 0.5 + 0.5, 0., 1.), 3.) * (0.4 + 0.6 * tip);   // light through the tips
    float ao = calcAO(p, n);
    vec3 h = normalize(L - rd);
    float spec = pow(clamp(dot(n, h), 0., 1.), 90.) * fresnel(dot(n, -rd), 0.04) * 6.0; // wet highlights
    float rim = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.);
    col = base * (0.18 + 1.05 * dif * vec3(1.0, 0.92, 0.86)) * ao;
    col += base * sss * vec3(1.0, 0.45, 0.4) * 0.9;
    col += spec * vec3(1.0, 0.95, 0.9);
    col += rim * vec3(0.55, 0.45, 1.0) * 0.35 * ao;
    col = mix(col, fogCol, 1. - exp(-0.28 * t * t));
  }
  return col * 1.15;
}`;

defineScene({
  name: 'papillae3d',
  anchor: { word: 940, offset: -0.15 },
  anchorEnd: { word: 990, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) { this.gl = api.gl.create(api, FRAG, { res: 0.5, aa: 1, steps: 110, stepScale: 0.8 }); },
  draw(ctx, t, api) {
    const { prog, ease, P } = api;
    const tBumps = api.at(958), tBack = api.at(965), tLong = api.at(972), tShag = api.at(979), tEnd = api.duration;
    // camera: slow push in at the tip, then glide back over the tongue
    const travel = 0.3 + 0.35 * t + 3.2 * ease.inOutSine(api.clamp((t - tBack) / Math.max(0.1, tEnd - tBack)));
    const grow = api.clamp((t - tBack + 0.3) / 1.2);
    const sway = 0.15 + 1.2 * ease.inOutSine(api.clamp((t - tShag) / 1.2));
    const camY = api.lerp(0.3, 0.2, ease.inOutSine(api.clamp(t / Math.max(1, tBumps)))) + 0.42 * grow * ease.inOutSine(api.clamp((t - tBack) / 2.5));
    const cv = this.gl.draw({ uTime: t, uTravel: travel, uGrow: grow, uSway: sway, uCamY: camY, uLook: 0.36 + 0.1 * grow });
    ctx.drawImage(cv, 0, 0, api.W, api.H);
    // labels on the words
    api.label(ctx, 'PAPILLAE', 150, 150, { p: api.pop(t, tBumps), size: 46 });
    api.text(ctx, 'tiny bumps', 150, 230, { family: 'hand', size: 52, color: P.lime, alpha: prog(t, tBumps + 0.3, 0.4), stroke: 'rgba(0,0,0,0.5)', strokeWidth: 8 });
    api.label(ctx, 'LONGER TOWARD THE BACK', 1770, 150, { p: api.pop(t, tLong), size: 42, align: 'right' });
    api.doodle.text(ctx, '"shag carpet"', 1770, 960, prog(t, tShag, 0.7), { color: P.lime, size: 72, align: 'right', stroke: 'rgba(0,0,0,0.55)', strokeWidth: 10 });
    api.text(ctx, '* ARTISTIC RENDERING', 1880, 1050, { size: 20, color: P.faint, align: 'right', tracking: 2 });
    api.finish(ctx, t, { bloom: 0.35, grain: 0.05, vignette: 0.5 });
  },
});
