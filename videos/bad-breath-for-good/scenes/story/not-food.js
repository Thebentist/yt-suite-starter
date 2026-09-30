// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// not-food (phase 2): words 388-417 "And most people think that they got bad breath from something that they ate, you know, like the
// garlic and all that type of stuff, but that's not quite true."
// A dark dinner table in one warm pool of light (real 3D: plate, garlic bulb, red onion, coffee). Four cuts: MOST PEOPLE THINK...
// over the table -> "something that they ate": low across the plate -> "garlic": macro on the bulb, smell rising -> "not quite":
// wide again, a red marker line strikes the food, NOT QUITE.
const FOOD = `
float sdGarlic(vec3 p){
  float d = sdEllipsoid(p - vec3(0., 0.26, 0.), vec3(0.2, 0.22, 0.2));
  for (int i = 0; i < 8; i++) { float a = float(i) * 0.7854 + 0.2; vec3 q = p; q.xz = rot2(a) * q.xz; q -= vec3(0.2, 0.3, 0.); q.xy = rot2(0.38) * q.xy;
    d = smin(d, sdEllipsoid(q, vec3(0.115, 0.3, 0.135)), 0.025); }
  d = smin(d, sdRoundCone(p, vec3(0., 0.45, 0.), vec3(0.02, 0.78, 0.01), 0.07, 0.02), 0.08);
  return d;
}
float sdOnion(vec3 p){ float d = sdSphere(p - vec3(0., 0.27, 0.), 0.27); return smin(d, sdRoundCone(p, vec3(0., 0.4, 0.), vec3(0., 0.72, 0.), 0.1, 0.012), 0.1); }
float mapExtra(vec3 p, out float mat){
  mat = 10.;
  float d = max(p.y, length(p.xz) - 4.2);                                          // table top (a round table)
  float plate = sdCylinder(p - vec3(0., 0.03, 0.), 0.03, 1.05);
  plate = smax(plate, -sdCylinder(p - vec3(0., 0.07, 0.), 0.03, 0.78), 0.04);
  if (plate < d) { d = plate; mat = 11.; }
  float g = sdGarlic((p - vec3(0.05, 0.03, 0.05)) / 1.15) * 1.15;
  if (g < d) { d = g; mat = 12.; }
  float o = sdOnion(p - vec3(-1.75, 0., -0.55));
  if (o < d) { d = o; mat = 13.; }
  vec3 c = p - vec3(1.75, 0., -0.7);
  float cup = max(sdCylinder(c - vec3(0., 0.33, 0.), 0.33, 0.34), -sdCylinder(c - vec3(0., 0.4, 0.), 0.33, 0.3));
  cup = min(cup, sdTorus((c - vec3(0.4, 0.34, 0.)).xzy, vec2(0.13, 0.035)));
  cup = min(cup, sdCylinder(c - vec3(0., 0.012, 0.), 0.012, 0.55));
  if (cup < d) { d = cup; mat = 14.; }
  float coffee = sdCylinder(c - vec3(0., 0.58, 0.), 0.01, 0.31);
  if (coffee < d) { d = coffee; mat = 15.; }
  vec3 f = p - vec3(-1.35, 0.012, 0.35); float fork = sdRoundBox(f, vec3(0.05, 0.012, 0.7), 0.01);
  vec3 kn = p - vec3(1.35, 0.012, 0.35); float knife = sdRoundBox(kn, vec3(0.06, 0.012, 0.75), 0.01);
  if (min(fork, knife) < d) { d = min(fork, knife); mat = 16.; }
  return d;
}
vec4 albedoExtra(float mat, vec3 p, vec3 n){
  if (mat < 10.5) return vec4(vec3(0.1, 0.05, 0.035) * (0.7 + 0.6 * fbm3(vec3(p.x * 1.2, 0., p.z * 14.), 4)), 1.2);   // dark wood
  if (mat < 11.5) return vec4(0.82, 0.8, 0.84, 1.6);                                                                       // plate
  if (mat < 12.5) { float streak = 0.5 + 0.5 * sin(atan(p.z - 0.05, p.x - 0.05) * 14.); return vec4(mix(vec3(0.9, 0.86, 0.78), vec3(0.72, 0.52, 0.62), 0.25 * streak * smoothstep(0.1, 0.5, p.y)), 0.7); }
  if (mat < 13.5) return vec4(mix(vec3(0.42, 0.08, 0.2), vec3(0.7, 0.3, 0.45), 0.5 + 0.5 * sin(atan(p.z + 0.55, p.x + 1.75) * 10.)), 1.2);
  if (mat < 14.5) return vec4(0.86, 0.84, 0.82, 1.4);
  if (mat < 15.5) return vec4(0.1, 0.045, 0.02, 3.);
  return vec4(0.55, 0.55, 0.6, 3.);
}
`;
defineScene({
  name: 'not-food',
  anchor: { word: 388, offset: -0.15 },
  anchorEnd: { word: 417, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    STORY.init(api);
    this.g = api.gl.create(api, STORYGL.frag({ figs: 0, extra: FOOD, lamp: true }), { res: 0.5, aa: 1, steps: 120 });
    this.bg = STORY.bokehField({ seed: 'dinner', cols: ['#ffb36b', '#ff8a5c', '#ffd28a'], n: 30, big: 60, glows: 4, top: '#150b0c', mid: '#0e0708', bottom: '#050304' });
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const MOST = api.at(389), PEOPLE = api.at(390), THINK = api.at(391), SOMETHING = api.at(398), GARLIC = api.at(406), ALL = api.at(408), STUFF = api.at(412), BUT = api.at(413), NOT = api.at(415), QUITE = api.at(416);
    const sh = S.shot(t, [SOMETHING - 0.04, GARLIC - 0.04, BUT - 0.04], api.duration), k = ease.inOutSine(sh.k);
    let camO;
    if (sh.i === 0) camO = { ro: [lerp(-0.5, 0.5, k), 3.5, 4.3], ta: [0, 0.3, -0.25], focal: 2.1 };
    else if (sh.i === 1) camO = { ro: [lerp(-3.4, -2.8, k), 0.75, 2.6], ta: [0.2, 0.35, 0], focal: 2.4 };
    else if (sh.i === 2) camO = { ro: [lerp(0.95, 0.75, k), 0.75, lerp(1.6, 1.35, k)], ta: [0.05, 0.42, 0.05], focal: 2.2 };
    else camO = { ro: [lerp(0.3, -0.3, k), 3.3, 4.6], ta: [0, 0.3, -0.3], focal: 2.0 };
    S.bokeh(ctx, this.bg, [0, -260, 180, 0][sh.i] - sh.local * 15, 0, 1);
    const flick = 1 + 0.03 * Math.sin(t * 9.1);
    const u = Object.assign({}, G.RIG.studio, { uKeyDir: [-0.7, 0.6, 0.5], uKeyCol: [0.3, 0.24, 0.22], uRimDir: [0.3, 0.4, -1], uRimCol: [0.5, 0.4, 0.9], uFillCol: [0.07, 0.055, 0.055], uExposure: 1, uAO: 1, uWrap: 0, uExtra: 1, uRimExtra: 0.12,
      uLampPos: [0.4, 3.2, 0.8], uLampCol: [9 * flick, 6.2 * flick, 3.6 * flick], uLamp2Pos: [0, 5, 5], uLamp2Col: [0, 0, 0] }, G.cam(camO));
    const img = this.g.draw(u);
    if (sh.i === 1) {   // shallow depth of field: soft top and bottom
      ctx.save(); ctx.filter = 'blur(7px)'; ctx.drawImage(img, 0, 0, 1920, 1080); ctx.restore();
      ctx.save(); const m = ctx.createLinearGradient(0, 0, 0, 1080); ctx.beginPath(); ctx.rect(0, 330, 1920, 420); ctx.clip(); ctx.drawImage(img, 0, 0, 1920, 1080); ctx.restore();
    } else ctx.drawImage(img, 0, 0, 1920, 1080);
    // steam off the coffee, smell rising off the garlic and onion
    const smell = (P3, a, s) => { const q = G.project(camO, P3); if (q[2] <= 0) return; const sc = 2.2 / q[2]; for (let i = 0; i < 3; i++) S.wavy(ctx, q[0] + (i - 1) * 60 * sc, q[1] - 30 * sc, 220 * sc, -Math.PI / 2, t, a, { color: P.gas, lw: Math.max(3, 9 * sc), amp: 10 * sc, ph: i * 2 + s }); };
    smell([0.05, 0.95, 0.05], prog(t, SOMETHING, 0.5) * (sh.i === 2 ? 1 : 0.7), 0);
    smell([-1.75, 0.85, -0.55], prog(t, ALL, 0.5) * 0.6, 3);
    { const q = G.project(camO, [1.75, 0.7, -0.7]); if (q[2] > 0) for (let i = 0; i < 4; i++) { const ph = (t * 0.5 + i / 4) % 1; S.puff(ctx, q[0] + Math.sin(t + i) * 20, q[1] - ph * 260 * 2.2 / q[2], 60 * 2.2 / q[2], 0.25 * Math.sin(ph * Math.PI), '#fff0e0', i); } }
    if (sh.i === 0) {
      const words = [['MOST', MOST], ['PEOPLE', PEOPLE], ['THINK...', THINK]], size = 110;
      const ws = words.map(([w]) => api.measure(ctx, w, { size, tracking: 2 })), tot = ws.reduce((a, b) => a + b, 0) + 34 * 2;
      let x = 960 - tot / 2;
      words.forEach(([w, at], i) => { S.type(ctx, w, x + ws[i] / 2, 220, prog(t, at - 0.03, 0.35), { size, tracking: 2, color: P.ink, side: '#3a2470', depth: 6 }); x += ws[i] + 34; });
    }
    if (sh.i === 2) api.label(ctx, 'GARLIC', 1450, 820, { size: 50, p: pop(t, GARLIC + 0.1, 0.4), bg: 'rgba(12,8,28,0.85)', color: P.ink });
    if (sh.i === 3) {
      const a = G.project(camO, [-2.3, 0.45, -0.4]), b = G.project(camO, [2.3, 0.5, -0.4]);
      api.doodle.stroke(ctx, [[a[0], a[1]], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 12], [b[0], b[1]]], prog(t, NOT - 0.25, 0.4, ease.inOutCubic), { color: P.marker, width: 18, seed: 41, glow: 'rgba(255,40,40,0.35)' });
      S.chip(ctx, 'NOT QUITE', 960, 930, pop(t, QUITE, 0.5), { size: 76, rotate: -0.03 });
    }
    api.finish(ctx, t, { bloom: 0.32, grain: 0.06, vignette: 0.55 });
  },
});
