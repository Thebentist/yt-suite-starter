// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// nose-adapt (phase 2): words 539-574 "So first off, the reason that you can't smell your own bad breath is because, well, your nose gets
// used to smells around you that are frequent. It kind of just stops noticing it all together."  Starts 1.2 s after w529 (the
// title's hold) and ends where face-breath starts.
// Three cuts: a rim-lit profile, your own breath drifting past your nose -> "your nose": a real-3D macro of the smell receptors,
// cilia waving, cells flaring lime as the molecules land (SIGNAL high) -> "gets used to... frequent": same field, the molecules
// keep coming but the cells dim (the SIGNAL trace falls) -> "stops noticing": back to the face, the glow gone, YOUR NOSE TUNES IT OUT.
const RECEPT = `
uniform float uSig;
float gKind;
float map(vec3 p){
  float d = p.y + 0.04 * noise3(vec3(p.xz * 2.5, uTime * 0.25)) + 0.02; gKind = 0.;
  const float C = 0.55;
  vec2 id = floor(p.xz / C); vec2 cc = (id + 0.5) * C + (hash22(id) - 0.5) * 0.14;
  float body = sdSphere(p - vec3(cc.x, -0.3, cc.y), 0.15);
  float cell = smin(body, sdCapsule(p, vec3(cc.x, -0.3, cc.y), vec3(cc.x, 0.02, cc.y), 0.035), 0.06);
  cell = smin(cell, sdSphere(p - vec3(cc.x, 0.05, cc.y), 0.065), 0.04);
  if (cell < d) { d = cell; gKind = 1.; }
  float ph = hash12(id) * 6.28;
  for (int k = 0; k < 6; k++) {
    float a = float(k) * 1.0472 + ph;
    vec3 b = vec3(cc.x, 0.07, cc.y);
    vec3 e = b + vec3(cos(a) * 0.2 + 0.04 * sin(uTime * 2.3 + a), 0.12 + 0.05 * sin(uTime * 3.1 + a * 2.), sin(a) * 0.2 + 0.04 * cos(uTime * 1.9 + a));
    float cl = sdCapsule(p, b, e, 0.011);
    if (cl < d) { d = cl; gKind = 2.; }
  }
  return d;
}
#include <raymarch>
uniform vec3 uRo, uTa; uniform float uFocal;
vec3 render(vec2 fc){
  vec2 uv = (2. * fc - uRes) / uRes.y;
  mat3 cam = camMat(uRo, uTa, 0.);
  vec3 rd = cam * normalize(vec3(uv, uFocal));
  vec3 fog = vec3(0.07, 0.025, 0.05);
  float t = march(uRo, rd, 9.);
  if (t < 0.) return fog * (1. - 0.3 * uv.y);
  vec3 p = uRo + rd * t, n = calcNormal(p);
  map(p); float kind = gKind;
  vec2 id = floor(p.xz / 0.55);
  float flick = 0.75 + 0.25 * sin(uTime * 9. + hash12(id) * 30.);
  vec3 L = normalize(vec3(-0.3, 1., 0.4)), R = normalize(vec3(0.4, 0.5, -1.));
  float dif = clamp(dot(n, L) * 0.6 + 0.4, 0., 1.), ao = calcAO(p, n);
  float rim = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.);
  vec3 alb = kind < 0.5 ? vec3(0.4, 0.1, 0.18) * (0.8 + 0.4 * noise3(p * 6.)) : kind < 1.5 ? vec3(0.8, 0.55, 0.6) : vec3(0.95, 0.8, 0.85);
  vec3 col = alb * dif * vec3(0.9, 0.75, 0.75) * ao * 0.8;
  col += rim * vec3(0.55, 0.45, 1.1) * 0.6 * ao;
  float sp = pow(clamp(dot(n, normalize(L - rd)), 0., 1.), 70.) * fresnel(dot(n, -rd), 0.04) * 5.;
  col += sp * vec3(1.);
  if (kind > 0.5) col += vec3(0.75, 0.95, 0.25) * uSig * flick * (kind < 1.5 ? 1.6 : 0.9);   // the receptor fires
  if (kind < 0.5) { float near = 0.; col += vec3(0.4, 0.55, 0.12) * uSig * 0.12; }
  col = mix(col, fog, 1. - exp(-0.16 * t * t));
  return col;
}`;
defineScene({
  name: 'nose-adapt',
  anchor: { word: 529, edge: 'end', offset: 1.2 },
  anchorEnd: { word: 575, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    const S = STORY.init(api);
    this.gHead = api.gl.create(api, STORYGL.frag({ figs: 1 }), { res: 0.5, aa: 1, steps: 100 });
    this.gRec = api.gl.create(api, RECEPT, { res: 0.5, aa: 1, steps: 110, stepScale: 0.75 });
    this.bg = S.bokehField({ seed: 'nose', cols: ['#a78bfa', '#7c5cff', '#5cc8ff'], n: 34, big: 55, glows: 4, top: '#110c22', mid: '#0b0918', bottom: '#050409' });
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const OWN = api.at(549), NOSE = api.at(555), USED = api.at(558), FREQ = api.at(565), IT = api.at(566), STOPS = api.at(570);
    const sh = S.shot(t, [NOSE - 0.04, FREQ - 0.04, IT - 0.04], api.duration), k = ease.inOutSine(sh.k);
    // signal: high when the smell is new, falls while the molecules keep coming
    const sig = t < USED ? prog(t, NOSE, 0.5) : Math.max(0.05, Math.exp(-(t - USED) * 0.75));
    if (sh.i === 0 || sh.i === 3) {
      S.bokeh(ctx, this.bg, [-120, 0, 0, 160][sh.i] - sh.local * 18, 0, 1.05);
      const camO = sh.i === 0 ? { ro: [lerp(0.2, 0.0, k), 2.85, lerp(2.9, 2.6, k)], ta: [0.2, 2.7, 0], focal: 2.1 } : { ro: [lerp(0.55, 0.45, k), 2.8, lerp(2.0, 1.85, k)], ta: [0.05, 2.72, 0], focal: 2.2 };
      const glow = sh.i === 0 ? prog(t, OWN, 0.6) * 0.6 : 0.08;
      const u = Object.assign({}, G.RIG.cafe, { uKeyDir: [0.6, 0.5, 0.6], uKeyCol: [0.06, 0.05, 0.06], uRimDir: [-0.5, 0.5, -0.8], uRimCol: [0.95, 0.75, 1.8], uFillCol: [0.012, 0.01, 0.02], uExposure: 1, uAO: 1, uWrap: 0.15,
        uLamp2Pos: [0.35, 2.85, 0.05], uLamp2Col: [0.6 * glow, 1.3 * glow, 0.25 * glow], uLampPos: [0, -9, 0], uLampCol: [0, 0, 0], uShow: G.show([1]) },
        G.figs([{ pos: [-0.2, 0, 0], yaw: Math.PI / 2, skin: [0.44, 0.3, 0.24], cloth: [0.2, 0.18, 0.32], hair: 3, hairCol: [0.03, 0.025, 0.03], head: [0, -0.03, 0], mouth: 0.12 }]), G.cam(camO));
      ctx.drawImage(this.gHead.draw(u), 0, 0, 1920, 1080);
      // your own breath: molecules drifting out of the mouth and straight back up into the nose
      const mouth = G.project(camO, [0.23, 2.55, 0]), nose = G.project(camO, [0.32, 2.72, 0]);
      for (let i = 0; i < 14; i++) {
        const ph = (t * 0.28 + i / 14) % 1, loop = Math.sin(ph * Math.PI);
        const x = lerp(mouth[0], nose[0], ph) + loop * (200 + (i % 4) * 40), y = lerp(mouth[1], nose[1], ph) - loop * 30 + Math.sin(i + t) * 12;
        const near = (i % 3) === 0;
        ctx.save(); ctx.globalAlpha = 0.9 * Math.sin(Math.min(1, ph * 1.1) * Math.PI); if (near) ctx.filter = 'blur(3px)';
        api.icons.h2s(ctx, x, y, near ? 26 : 16, t * 1.5 + i); ctx.restore();
      }
      if (sh.i === 0) api.doodle.text(ctx, 'your own breath', 1180, 330, prog(t, OWN, 0.5), { size: 64, color: P.gas, rotate: -0.05, stroke: 'rgba(0,0,0,0.5)', strokeWidth: 8 });
      if (sh.i === 3) S.chip(ctx, 'YOUR NOSE TUNES IT OUT', 960, 930, pop(t, STOPS, 0.5), { size: 70 });
    } else {
      // ---- the receptor field (3D)
      const camO = sh.i === 1 ? { ro: [lerp(-0.3, 0.2, k), 1.35, lerp(2.6, 2.2, k)], ta: [0.1, -0.1, 0], focal: 2.0 } : { ro: [lerp(1.2, 1.5, k), 0.75, lerp(1.4, 1.2, k)], ta: [0.2, -0.05, -0.2], focal: 2.2 };
      ctx.drawImage(this.gRec.draw({ uTime: t, uSig: sig, uRo: camO.ro, uTa: camO.ta, uFocal: camO.focal }), 0, 0, 1920, 1080);
      // molecules raining in (they keep coming), a little depth of field
      for (let i = 0; i < 22; i++) {
        const sp = 0.35 + (i % 5) * 0.06, ph = (t * sp + i * 0.137) % 1;
        const x = 120 + ((i * 397) % 1680) + Math.sin(t + i) * 30, y = -60 + ph * 900;
        const near = i % 4 === 0;
        ctx.save(); ctx.globalAlpha = Math.min(1, (1 - ph) * 3) * 0.95; if (near) ctx.filter = 'blur(5px)';
        api.icons.h2s(ctx, x, y, near ? 34 : 18, t + i); ctx.restore();
      }
      if (sh.i === 1) api.label(ctx, 'SMELL RECEPTORS', 120, 150, { size: 46, p: pop(t, NOSE + 0.1, 0.45), bg: 'rgba(12,8,28,0.85)', color: P.ink });
      api.label(ctx, 'OLFACTORY ADAPTATION', 120, sh.i === 1 ? 230 : 150, { size: 40, p: pop(t, USED, 0.45) });
      // SIGNAL trace panel
      const PX = 1340, PY = 110, PW = 460, PH = 250, pp = prog(t, NOSE, 0.4);
      ctx.save(); ctx.globalAlpha = pp; ctx.fillStyle = 'rgba(12,9,26,0.8)'; api.roundRect(ctx, PX, PY, PW, PH, 18); ctx.fill(); ctx.strokeStyle = 'rgba(167,139,250,0.4)'; ctx.lineWidth = 2; ctx.stroke();
      api.text(ctx, 'SIGNAL', PX + 28, PY + 56, { size: 40, color: P.lime, tracking: 3 });
      const gx = PX + 28, gy = PY + 80, gw = PW - 56, gh = 140, T0 = NOSE - 0.2, T1 = api.duration;
      ctx.beginPath(); let last = null;
      for (let j = 0; j <= 100; j++) { const tt = lerp(T0, T1, j / 100); if (tt > t) break; const sv = tt < USED ? clamp((tt - NOSE) / 0.5) : Math.max(0.05, Math.exp(-(tt - USED) * 0.75)); const x = gx + gw * j / 100, y = gy + gh * (1 - sv); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); last = [x, y]; }
      ctx.strokeStyle = P.lime; ctx.lineWidth = 5; ctx.shadowColor = P.lime; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;
      if (last) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(last[0], last[1], 8, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    S.artistic(ctx);
    api.finish(ctx, t, { bloom: 0.38, grain: 0.06, vignette: 0.55 });
  },
});
