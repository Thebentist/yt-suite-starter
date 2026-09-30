// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// tried-everything (phase 2): words 2129-2171 "now that we know where bad breath comes from, what next? You've had bad breath for a while, you've
// tried everything. You've tried mints, and mouthwash, and brushing harder. And the reason that none of it's really worked is because,"
// Eight hard cuts: the coated 3D tongue, circled ("where bad breath comes from") -> WHAT NEXT? -> a slumped figure under time-lapse
// light ("for a while") -> "tried everything": a studio lineup of generic products on a dark glossy floor -> hard cuts to MINTS,
// MOUTHWASH, BRUSHING HARDER on their words -> the lineup again, a red X on each on "none / really / worked". No brands.
const TONGUE_EXTRA = `${STORYGL.TONGUE_FN}
float mapExtra(vec3 p, out float mat){ mat = 30.; return sdTongue(p); }
vec3 gTA; float gTS;
void normalHook(float mat, vec3 p, inout vec3 n){ gTA = tongueShade(p, n, gTS); }
vec4 albedoExtra(float mat, vec3 p, vec3 n){ return vec4(gTA, gTS); }
`;
const PRODUCTS = `
uniform float uSpin, uBuzz;
float sdMints(vec3 p){ float d = 1e5; for (int i = 0; i < 3; i++) { float fi = float(i); vec3 q = p - vec3(-0.42 + fi * 0.42, 0.12 + fi * 0.0, fi == 1. ? -0.25 : 0.1); q.xy = rot2(fi * 0.5 - 0.5) * q.xy; d = min(d, sdEllipsoid(q, vec3(0.28, 0.1, 0.28))); } return d; }
float sdBottle(vec3 p){
  float b = sdRoundBox(p - vec3(0., 0.95, 0.), vec3(0.42, 0.9, 0.28), 0.18);
  b = smin(b, sdCylinder(p - vec3(0., 1.95, 0.), 0.14, 0.17), 0.12);
  return min(b, sdCylinder(p - vec3(0., 2.2, 0.), 0.14, 0.21));
}
float sdBrush(vec3 p){
  vec3 q = p; q.x += uBuzz * 0.03 * sin(uTime * 80.);
  float h = sdCapsule(q, vec3(-1.3, 0.12, 0.), vec3(0.7, 0.2, 0.), 0.08);
  h = smin(h, sdRoundBox(q - vec3(0.95, 0.2, 0.), vec3(0.28, 0.05, 0.1), 0.04), 0.06);
  float bristle = sdRoundBox(q - vec3(0.95, 0.36, 0.), vec3(0.26, 0.12, 0.09), 0.03);
  return min(h, bristle);
}
float mapExtra(vec3 p, out float mat){
  mat = 10.; float d = p.y;                                                                                 // glossy floor
  vec3 m = p - vec3(-2.6, 0., 0.); m.xz = rot2(uSpin) * m.xz;
  float a = sdMints(m); if (a < d) { d = a; mat = 60.; }
  vec3 b = p - vec3(0., 0., -0.2); b.xz = rot2(uSpin * 0.7) * b.xz;
  float bo = sdBottle(b); if (bo < d) { d = bo; mat = (b.y > 1.9) ? 62. : 61.; }
  vec3 c = p - vec3(2.7, 0., 0.1); c.xz = rot2(0.6 + uSpin * 0.5) * c.xz;
  float br = sdBrush(c); if (br < d) { d = br; mat = (c.y > 0.26 && c.x > 0.6) ? 64. : 63.; }
  return d;
}
vec4 albedoExtra(float mat, vec3 p, vec3 n){
  if (mat < 10.5) return vec4(vec3(0.015, 0.013, 0.02), 1.2);
  if (mat < 60.5) { vec3 m = p - vec3(-2.6, 0., 0.); float sw = 0.5 + 0.5 * sin(atan(m.z, m.x) * 8. + length(m.xz) * 10.); return vec4(mix(vec3(0.96, 0.96, 0.98), vec3(0.2, 0.75, 0.5), step(0.6, sw) * 0.9), 2.5); }
  if (mat < 61.5) { float band = smoothstep(0.02, 0.0, abs(p.y - 1.0) - 0.3); return vec4(mix(vec3(0.12, 0.62, 0.6), vec3(0.92, 0.94, 0.95), band * 0.85), 3.5); }
  if (mat < 62.5) return vec4(0.9, 0.9, 0.92, 2.);
  if (mat < 63.5) return vec4(0.45, 0.32, 0.9, 2.5);
  return vec4(mix(vec3(0.85, 0.95, 1.0), vec3(0.3, 0.75, 0.95), step(0.5, fract(p.x * 12.))), 0.6);
}
`;
defineScene({
  name: 'tried-everything',
  anchor: { word: 2129, offset: -0.15 },
  anchorEnd: { word: 2171, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    const S = STORY.init(api);
    this.gTon = api.gl.create(api, STORYGL.frag({ figs: 0, extra: TONGUE_EXTRA }), { res: 0.5, aa: 1, steps: 110 });
    this.gFig = api.gl.create(api, STORYGL.frag({ figs: 1 }), { res: 0.5, aa: 1, steps: 100 });
    this.gPro = api.gl.create(api, STORYGL.frag({ figs: 0, extra: PRODUCTS }), { res: 0.5, aa: 1, steps: 120 });
    this.bg = S.bokehField({ seed: 'tried', cols: ['#a78bfa', '#7c5cff', '#ff6fae', '#5cc8ff'], n: 34, big: 60, glows: 4, top: '#120d22', mid: '#0b0918', bottom: '#050409' });
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const WHERE = api.at(2133), WHAT = api.at(2138), NEXT = api.at(2139), YOUVE = api.at(2140), WHILE = api.at(2149), TRIED = api.at(2151), MINTS = api.at(2155), WASH = api.at(2157), BRUSH = api.at(2159), NONE = api.at(2165), REALLY = api.at(2168), WORKED = api.at(2169);
    const sh = S.shot(t, [WHAT - 0.04, YOUVE - 0.04, TRIED - 0.04, MINTS - 0.04, WASH - 0.04, BRUSH - 0.04, NONE - 0.3], api.duration), k = ease.inOutSine(sh.k);
    if (sh.i === 0) {
      const bg = ctx.createRadialGradient(960, 300, 50, 960, 540, 1100); bg.addColorStop(0, '#300c1c'); bg.addColorStop(1, '#050308'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1920, 1080);
      const camO = { ro: [lerp(-0.4, 0.3, k), lerp(2.6, 2.4, k), 1.6], ta: [0, -0.1, -0.2], focal: 2.2 };
      ctx.drawImage(this.gTon.draw(Object.assign({}, G.RIG.studio, { uKeyDir: [-0.9, 0.85, 0.35], uKeyCol: [0.8, 0.62, 0.55], uRimDir: [0.8, 0.5, -0.7], uRimCol: [0.35, 0.28, 0.7], uFillCol: [0.05, 0.02, 0.03], uExposure: 1, uAO: 1, uExtra: 1, uRimExtra: 0.3, uCoat: 0.9, uCoatCol: [0.84, 0.8, 0.52], uTongue: [1, 0, 0, 0] }, G.cam(camO))), 0, 0, 1920, 1080);
      const bc = G.project(camO, [0, 0.05, -0.62]);
      api.doodle.circle(ctx, bc[0], bc[1], 360, 170, prog(t, WHERE, 0.6, ease.inOutCubic), { color: P.marker, width: 12, seed: 12, glow: 'rgba(255,40,40,0.3)' });
      S.artistic(ctx);
    } else if (sh.i === 1) {
      S.bokeh(ctx, this.bg, -sh.local * 40, 0, 1.1);
      S.type(ctx, 'WHAT', 960, 470, prog(t, WHAT - 0.03, 0.25), { size: 230, side: '#3a2470', depth: 12 });
      S.type(ctx, 'NEXT?', 960, 720, prog(t, NEXT - 0.03, 0.25), { size: 230, color: P.lime, side: '#5a6a10', depth: 12 });
    } else if (sh.i === 2) {
      // slumped, time-lapse light ("had bad breath for a while")
      S.bokeh(ctx, this.bg, -sh.local * 15, 40, 1.05);
      const tl = sh.local * 0.9, a = tl * Math.PI * 2, day = 0.5 + 0.5 * Math.cos(a);
      const camO = { ro: [lerp(1.8, 1.4, k), 2.5, lerp(5.2, 4.8, k)], ta: [0.2, 1.8, 0], focal: 2.1 };
      ctx.drawImage(this.gFig.draw(Object.assign({}, G.RIG.cafe, { uKeyDir: [Math.cos(a), 0.6, 0.6], uKeyCol: [lerp(0.06, 0.7, day), lerp(0.07, 0.55, day), lerp(0.16, 0.4, day)], uRimDir: [-0.6, 0.45, -0.7], uRimCol: [0.9, 0.72, 1.7], uFillCol: [0.015, 0.012, 0.025], uExposure: 1, uAO: 1, uWrap: 0.4, uLampPos: [0, -9, 0], uLampCol: [0, 0, 0], uShow: G.show([1]) },
        G.figs([{ pos: [0, 0, 0], yaw: Math.PI / 2 - 0.4, legs: 2, armR: 3, armL: 3, lean: -0.18, head: [0, 0.35, 0], skin: [0.48, 0.32, 0.24], cloth: [0.3, 0.26, 0.42], hair: 3, hairCol: [0.03, 0.025, 0.03] }]), G.cam(camO))), 0, 0, 1920, 1080);
      const hp = G.project(camO, [0.2, 3.3, 0]); S.stink(ctx, hp[0], hp[1], 60, t, prog(t, YOUVE, 0.4), { puff: false, color: P.gas, lw: 7 });
      api.doodle.text(ctx, 'for a while...', 1500, 880, prog(t, WHILE - 0.2, 0.5), { size: 80, color: P.dim, align: 'center', rotate: -0.04 });
      // days ticking by
      const days = Math.floor(sh.local * 9) + 1;
      api.text(ctx, 'DAY ' + days, 120, 160, { size: 54, color: P.ink, tracking: 3, alpha: prog(t, YOUVE, 0.3) });
    } else {
      // the studio lineup and its close-ups
      const spin = t * 0.35;
      let camO;
      if (sh.i === 3 || sh.i === 7) camO = { ro: [lerp(-0.5, 0.5, k), 2.2, lerp(6.6, 6.1, k)], ta: [0, 0.75, 0], focal: 2.1 };
      else if (sh.i === 4) camO = { ro: [lerp(-1.9, -2.1, k), 1.3, 1.9], ta: [-2.6, 0.2, 0], focal: 2.3 };
      else if (sh.i === 5) camO = { ro: [lerp(0.8, 0.5, k), 1.9, 3.3], ta: [0, 1.1, -0.2], focal: 2.2 };
      else camO = { ro: [lerp(3.4, 3.2, k), 1.4, 2.3], ta: [2.7, 0.3, 0.1], focal: 2.3 };
      const bgc = ctx.createRadialGradient(960, 420, 50, 960, 540, 1100); bgc.addColorStop(0, '#221a3a'); bgc.addColorStop(1, '#050409'); ctx.fillStyle = bgc; ctx.fillRect(0, 0, 1920, 1080);
      const failed = sh.i === 7;
      ctx.drawImage(this.gPro.draw(Object.assign({}, G.RIG.studio, { uKeyDir: [-0.5, 0.9, 0.6], uKeyCol: failed ? [0.5, 0.35, 0.35] : [0.85, 0.78, 0.8], uRimDir: [0.4, 0.5, -1], uRimCol: [0.8, 0.7, 1.6], uFillCol: [0.05, 0.045, 0.06], uExposure: 1, uAO: 1, uExtra: 1, uRimExtra: 0.9, uSpin: spin, uBuzz: sh.i === 6 ? 1 : 0 }, G.cam(camO))), 0, 0, 1920, 1080);
      const labels = { 4: ['MINTS', MINTS], 5: ['MOUTHWASH', WASH], 6: ['BRUSHING HARDER', BRUSH] };
      if (labels[sh.i]) api.label(ctx, labels[sh.i][0], 960, 940, { size: 70, align: 'center', p: pop(t, labels[sh.i][1], 0.45) });
      if (sh.i === 3) api.label(ctx, 'TRIED EVERYTHING', 960, 940, { size: 64, align: 'center', p: pop(t, TRIED + 0.1, 0.45), bg: 'rgba(12,8,28,0.85)', color: P.ink });
      if (sh.i === 6) for (let m = 0; m < 3; m++) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; const c = G.project(camO, [2.8, 0.4, 0.1]); ctx.beginPath(); ctx.arc(c[0], c[1], 260 + m * 30, -2.5 + m * 0.1, -2.0 + m * 0.1); ctx.stroke(); ctx.beginPath(); ctx.arc(c[0], c[1], 260 + m * 30, 0.6 + m * 0.1, 1.1 + m * 0.1); ctx.stroke(); ctx.restore(); }
      if (failed) {
        [[-2.6, 0.2, NONE], [0, 1.1, REALLY], [2.8, 0.35, WORKED]].forEach(([x, y, at], i) => { const c = G.project(camO, [x, y, 0]); api.doodle.cross(ctx, c[0], c[1], 150, prog(t, at, 0.3, ease.inOutCubic), { color: P.marker, width: 22, seed: 30 + i, glow: 'rgba(255,40,40,0.35)' }); });
        [['MINTS', -2.6], ['MOUTHWASH', 0], ['BRUSHING HARDER', 2.8]].forEach(([w, x]) => { const c = G.project(camO, [x, -0.2, 0.8]); api.text(ctx, w, c[0], c[1] + 40, { size: 40, align: 'center', color: P.dim, tracking: 1 }); });
      }
    }
    api.finish(ctx, t, { bloom: 0.32, grain: 0.06, vignette: 0.55 });
  },
});
