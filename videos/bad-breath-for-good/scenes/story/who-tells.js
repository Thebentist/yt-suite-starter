// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// who-tells (phase 2): words 320-329 "Because to be honest, who's gonna ever tell me really?"
// A dark stage, five people (a friend, a coworker, a date...) each in a pool of light. Three cuts: the wide lineup facing us ->
// low angle as they turn their backs one by one ("who's gonna ever tell") -> close on the last one turning away as the pools go
// dark, lime chip NOBODY TELLS YOU on "really".
const FLOOR = `
uniform vec4 uPools;   // x = how many pools lit (0..5, fractional fades the last), y = floor y
float mapExtra(vec3 p, out float mat){ mat = 10.; return p.y - uPools.y; }
vec4 albedoExtra(float mat, vec3 p, vec3 n){
  float pool = 0.;
  for (int i = 0; i < 5; i++) { float fi = float(i); float on = clamp(uPools.x - fi, 0., 1.); vec2 c = vec2(-4.4 + fi * 2.2, 0.); pool += on * exp(-dot(p.xz - c, p.xz - c) * 1.1); }
  vec3 base = vec3(0.012, 0.01, 0.018) * (0.8 + 0.4 * fbm3(vec3(p.xz * 2., 0.), 3));
  return vec4(base + vec3(0.09, 0.07, 0.13) * pool, 1.6);
}
`;
defineScene({
  name: 'who-tells',
  anchor: { word: 320, offset: -0.15 },
  anchorEnd: { word: 329, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    STORY.init(api);
    this.g = api.gl.create(api, STORYGL.frag({ figs: 5, extra: FLOOR }), { res: 0.5, aa: 1, steps: 110 });
    this.bg = STORY.bokehField({ seed: 'stage', cols: ['#a78bfa', '#7c5cff', '#ff6fae', '#5cc8ff'], n: 40, big: 50, glows: 5, top: '#120d22', mid: '#0c0918', bottom: '#050409' });
    this.people = [
      { skin: [0.62, 0.43, 0.33], cloth: [0.42, 0.18, 0.2], hairCol: [0.08, 0.05, 0.04], hair: 1, tag: '' },
      { skin: [0.4, 0.26, 0.19], cloth: [0.18, 0.3, 0.34], hairCol: [0.03, 0.025, 0.03], hair: 3, tag: 'FRIEND' },
      { skin: [0.72, 0.52, 0.42], cloth: [0.3, 0.26, 0.42], hairCol: [0.22, 0.13, 0.07], hair: 2, tag: 'COWORKER' },
      { skin: [0.55, 0.38, 0.28], cloth: [0.36, 0.34, 0.3], hairCol: [0.05, 0.04, 0.04], hair: 0, tag: '' },
      { skin: [0.66, 0.46, 0.36], cloth: [0.5, 0.22, 0.3], hairCol: [0.12, 0.07, 0.05], hair: 1, tag: 'DATE' },
    ];
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const WHO = api.at(324), TELL = api.at(327), REALLY = api.at(329);
    const sh = S.shot(t, [WHO - 0.04], api.duration), k = ease.inOutSine(sh.k);
    // each person turns their back on a stagger through "who's gonna ever tell me"; the pools go dark after them
    const order = [1, 3, 0, 2, 4], span = Math.max(0.6, REALLY - WHO);
    const turn = (i) => ease.inOutCubic(clamp((t - WHO + 0.05 - order.indexOf(i) * span / 5.5) / 0.4));
    const u = Object.assign({}, G.RIG.studio, { uKeyDir: [0.25, 0.9, 0.5], uKeyCol: [0.09, 0.07, 0.09], uRimDir: [0.15, 0.6, -1], uRimCol: [1.1, 0.85, 2.0], uFillCol: [0.01, 0.01, 0.02], uExposure: 1.0, uAO: 1, uWrap: 0.25, uExtra: 1 });
    Object.assign(u, G.figs(this.people.map((p, i) => {
      const tk = turn(i), sway = Math.sin(t * 1.3 + i * 1.7) * 0.03;
      return { ...p, pos: [-4.4 + i * 2.2, 0, 0], yaw: tk * Math.PI + sway, legs: 1, armR: 2, armL: 2, head: [sway * 2 + tk * 0.3, 0.06 * tk, 0], lean: -0.02 };
    })));
    const lit = 5 - 5 * clamp((t - WHO - 0.35) / Math.max(0.5, REALLY - WHO + 0.3));
    u.uPools = [lit, -2.74, 0, 0];
    u.uShow = G.show([1, 1, 1, 1, 1]);
    let camO;
    if (sh.i === 0) camO = { ro: [lerp(-0.6, 0.2, k), 1.2, lerp(10.8, 9.8, k)], ta: [0, 0.6, 0], focal: 2.15 };
    else camO = { ro: [lerp(-2.2, -1.5, k), 1.6, 6.2], ta: [0.6, 1.4, 0], focal: 2.0 };
    Object.assign(u, G.cam(camO));
    S.bokeh(ctx, this.bg, [0, -180][sh.i] - sh.local * 30, [0, 120][sh.i], 1);
    // haze beams from above each lit pool (behind the figures)
    for (let i = 0; i < 5; i++) {
      const on = clamp(lit - i); if (on <= 0) continue;
      const top = G.project(camO, [-4.4 + i * 2.2, 7.5, 0]), bot = G.project(camO, [-4.4 + i * 2.2, -2.7, 0]);
      if (top[2] <= 0 || bot[2] <= 0) continue;
      const wTop = 60 / top[2] * 2, wBot = 700 / bot[2] * 2;
      const g = ctx.createLinearGradient(0, top[1], 0, bot[1]); g.addColorStop(0, 'rgba(190,170,255,0)'); g.addColorStop(1, `rgba(190,170,255,${0.1 * on})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(top[0] - wTop, top[1]); ctx.lineTo(top[0] + wTop, top[1]); ctx.lineTo(bot[0] + wBot, bot[1]); ctx.lineTo(bot[0] - wBot, bot[1]); ctx.closePath(); ctx.fill();
    }
    ctx.drawImage(this.g.draw(u), 0, 0, 1920, 1080);
    { const hz = ctx.createLinearGradient(0, 620, 0, 1080); hz.addColorStop(0, 'rgba(40,30,70,0)'); hz.addColorStop(1, 'rgba(20,14,40,0.55)'); ctx.fillStyle = hz; ctx.fillRect(0, 620, 1920, 460); }
    S.motes(ctx, t, { seed: 'stage' + sh.i, n: 22, alpha: 0.22 });
    // tags under the people (wide shot only)
    if (sh.i === 0) this.people.forEach((p, i) => { if (!p.tag) return; const q = G.project(camO, [-4.4 + i * 2.2, -3.25, 0.6]); api.label(ctx, p.tag, q[0], q[1], { size: 34, align: 'center', bg: 'rgba(12,8,28,0.82)', color: P.ink, radius: 6, shadow: false, p: pop(t, 0.3 + i * 0.1, 0.4) }); });
    S.chip(ctx, 'NOBODY TELLS YOU', 960, 930, pop(t, REALLY, 0.5), { size: 76 });
    api.finish(ctx, t, { bloom: 0.3, grain: 0.06, vignette: 0.55 });
  },
});
