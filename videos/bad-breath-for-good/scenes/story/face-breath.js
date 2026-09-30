// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// face-breath (phase 2): words 575-598 "And trust me, there's nothing more around you than your bad breath. I mean, literally, it's coming
// out of your face all day long."  Ends where cup-hand starts.
// Three cuts: close profile, a slow curl of green breath leaving the lips -> "around you": wider, the figure sits inside its own
// cloud, which wraps all the way round -> "literally... all day long": a time-lapse, the light sweeps from warm sun to cool moonlight
// across the figure while the breath never stops; "24/7" in marker.
defineScene({
  name: 'face-breath',
  anchor: { word: 575, offset: -0.15 },
  anchorEnd: { word: 599, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    const S = STORY.init(api);
    this.g = api.gl.create(api, STORYGL.frag({ figs: 1 }), { res: 0.5, aa: 1, steps: 100 });
    this.bgNight = S.bokehField({ seed: 'fb-n', cols: ['#a78bfa', '#5c7cff', '#7c5cff'], n: 36, big: 55, glows: 4, top: '#0d0c24', mid: '#0a0918', bottom: '#050409' });
    this.bgDay = S.bokehField({ seed: 'fb-d', cols: ['#ffcf8a', '#ffb36b', '#ff8a5c'], n: 36, big: 55, glows: 4, top: '#2a1a1c', mid: '#1a1012', bottom: '#080506' });
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const AROUND = api.at(581), BREATH = api.at(586), LIT = api.at(589), OUT = api.at(592), FACE = api.at(595), ALL = api.at(596), LONG = api.at(598);
    const sh = S.shot(t, [AROUND - 0.04, LIT - 0.04], api.duration), k = ease.inOutSine(sh.k);
    // time of day for the time-lapse (0 = warm day, 1 = night); cycles faster and faster in the last shot
    const tl = sh.i === 2 ? (sh.local * 0.55 + Math.max(0, sh.local - 0.8) ** 2 * 0.5) : 0.25;
    const day = 0.5 + 0.5 * Math.cos(tl * Math.PI * 2);           // 1 = noon
    ctx.save(); ctx.globalAlpha = 1; S.bokeh(ctx, this.bgNight, -sh.local * 20, 0, 1.05); ctx.globalAlpha = sh.i === 2 ? day : 0.25; S.bokeh(ctx, this.bgDay, -sh.local * 20, 0, 1.05); ctx.restore();
    let camO;
    if (sh.i === 0) camO = { ro: [lerp(0.55, 0.45, k), 2.72, lerp(1.9, 1.75, k)], ta: [0.1, 2.66, 0], focal: 2.2 };
    else if (sh.i === 1) camO = { ro: [lerp(0.6, 0.2, k), 2.6, lerp(6.2, 5.6, k)], ta: [0.3, 2.0, 0], focal: 2.05 };
    else camO = { ro: [lerp(2.3, 2.0, k), 2.4, lerp(4.2, 3.9, k)], ta: [0.2, 2.2, 0], focal: 2.15 };
    const sunA = tl * Math.PI * 2, keyDir = [Math.cos(sunA) * 0.9, 0.5 + 0.4 * Math.abs(Math.sin(sunA)), 0.6];
    const keyCol = sh.i === 2 ? [lerp(0.08, 0.95, day), lerp(0.1, 0.72, day), lerp(0.22, 0.5, day)] : [0.06, 0.05, 0.06];
    const u = Object.assign({}, G.RIG.cafe, { uKeyDir: keyDir, uKeyCol: keyCol, uRimDir: [-0.6, 0.45, -0.7], uRimCol: [0.9, 0.72, 1.7], uFillCol: [0.015, 0.012, 0.025], uExposure: 1, uAO: 1, uWrap: sh.i === 2 ? 0.5 : 0.15,
      uLamp2Pos: [0.55, 2.55, 0.1], uLamp2Col: [0.35, 0.8, 0.12], uLampPos: [0, -9, 0], uLampCol: [0, 0, 0], uShow: G.show([1]) },
      G.figs([{ pos: [-0.2, 0, 0], yaw: Math.PI / 2, skin: [0.5, 0.33, 0.25], cloth: [0.42, 0.2, 0.16], hair: 1, hairCol: [0.08, 0.05, 0.04], legs: 1, armR: 2, armL: 2, head: [0, -0.02 + Math.sin(t * 1.3) * 0.015, 0], mouth: 0.2 + 0.12 * Math.sin(t * 2.2), lean: 0.02 }]), G.cam(camO));
    ctx.drawImage(this.g.draw(u), 0, 0, 1920, 1080);
    // the breath: puffs leave the lips and (from "around you") wrap all the way round the figure
    const mouth = [0.23, 2.54, 0], wrap = prog(t, AROUND - 0.2, 1.0, ease.inOutCubic), strong = 1 + prog(t, OUT, 0.5) * 0.4;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const ph = (t * 0.2 + i / N) % 1, u2 = ph * lerp(0.3, 1, wrap);
      let P3;
      if (u2 < 0.25) { const a = u2 / 0.25; P3 = [mouth[0] + a * 1.3, mouth[1] + Math.sin(a * 2.5) * 0.25, 0.1 * Math.sin(i)]; }
      else { const a = 0.35 - (u2 - 0.25) / 0.75 * Math.PI * 1.9; P3 = [-0.2 + Math.cos(a) * 1.55, 2.0 + Math.sin(a) * 1.45, Math.sin(i * 1.7) * 0.4]; }
      const q = G.project(camO, P3); if (q[2] <= 0.2) continue;
      S.puff(ctx, q[0] + Math.sin(t + i) * 10, q[1] + Math.cos(t * 0.8 + i) * 8, (70 + u2 * 120) * strong * 2.2 / q[2], 0.32 * (1 - u2 * 0.5) * clamp(ph * 10) * prog(t, 0, 0.4), S.mix(P.gas, '#8aa040', (i % 3) / 3), i);
    }
    if (sh.i === 2) {
      // sun / moon crossing the sky behind
      const sx = 960 + Math.cos(sunA + Math.PI) * 820, sy = 520 - Math.abs(Math.sin(sunA)) * 380;
      ctx.save(); ctx.globalAlpha = 0.9; if (day > 0.5) { S.glow(ctx, sx, sy, 220, '#ffcf6a', day); ctx.fillStyle = '#fff2c8'; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, Math.PI * 2); ctx.fill(); } else { S.glow(ctx, sx, sy, 160, '#a9b8ff', 1 - day); ctx.fillStyle = '#e8ecff'; ctx.beginPath(); ctx.arc(sx, sy, 28, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(10,10,30,0.9)'; ctx.beginPath(); ctx.arc(sx + 12, sy - 8, 24, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
      api.doodle.text(ctx, '24/7', 1500, 900, prog(t, ALL - 0.05, 0.45), { size: 160, color: P.lime, align: 'center', rotate: -0.06, stroke: 'rgba(10,6,20,0.6)', strokeWidth: 12 });
      api.doodle.underline(ctx, 1350, 1650, 935, prog(t, LONG, 0.35, ease.inOutCubic), { color: P.lime, width: 10, seed: 3 });
      const mp = G.project(camO, mouth);
      api.doodle.arrow(ctx, mp[0] + 380, mp[1] + 300, mp[0] + 60, mp[1] + 40, prog(t, FACE - 0.15, 0.4, ease.inOutCubic), { color: P.marker, width: 10, bend: -50, seed: 9 });
    }
    if (sh.i === 1) api.doodle.text(ctx, 'all around you', 1480, 250, prog(t, AROUND + 0.1, 0.5), { size: 70, color: P.gas, align: 'center', rotate: -0.05, stroke: 'rgba(0,0,0,0.5)', strokeWidth: 8 });
    api.finish(ctx, t, { bloom: 0.35, grain: 0.06, vignette: 0.55 });
  },
});
