// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// cup-hand (phase 2): words 599-631 "And this whole, like, cup your hand over your mouth and snippet thing, that doesn't really work either.
// You're kind of just smelling the same air that you've been smelling all day long."  Ends where study-card starts (w632).
// Four cuts: medium profile -> "cup your hand": close, the hand comes up over mouth and nose -> "sniff": inside the cup the same
// green air loops mouth -> nose (a red X lands on "doesn't really work") -> "you're kind of just smelling the same air": pull wide,
// the figure sits in a faint green bubble of its own air, SAME AIR.
defineScene({
  name: 'cup-hand',
  anchor: { word: 599, offset: -0.15 },
  anchorEnd: { word: 632, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    const S = STORY.init(api);
    this.g = api.gl.create(api, STORYGL.frag({ figs: 1 }), { res: 0.5, aa: 1, steps: 100 });
    this.bg = S.bokehField({ seed: 'cup', cols: ['#a78bfa', '#ff6fae', '#7c5cff'], n: 36, big: 60, glows: 4, top: '#150d22', mid: '#0d0918', bottom: '#050409' });
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const CUP = api.at(603), SNIFF = api.at(610), DOESNT = api.at(613), WORK = api.at(615), YOURE = api.at(617), SAME = api.at(623), AIR = api.at(624), ALLDAY = api.at(629);
    const sh = S.shot(t, [CUP - 0.04, SNIFF - 0.1, YOURE - 0.04], api.duration), k = ease.inOutSine(sh.k);
    S.bokeh(ctx, this.bg, [-60, 120, 200, 0][sh.i] - sh.local * 18, 0, 1.05);
    const hand = sh.i === 0 ? 0 : sh.i === 1 ? prog(t, CUP + 0.05, 0.55, ease.inOutCubic) : 1;
    const sniff = S.bump(t, SNIFF + 0.05, 0.6);
    let camO;
    if (sh.i === 0) camO = { ro: [lerp(0.4, 0.2, k), 2.5, lerp(4.4, 4.0, k)], ta: [0.3, 2.2, 0], focal: 2.1 };
    else if (sh.i === 1 || sh.i === 2) camO = { ro: [lerp(0.85, 0.75, k), 2.7, lerp(1.9, 1.75, k)], ta: [0.18, 2.6, 0], focal: 2.2 };
    else camO = { ro: [lerp(0.6, 0.2, k), 2.4, lerp(6.4, 7.2, k)], ta: [0.2, 1.9, 0], focal: 2.05 };
    const hz = sh.i >= 2 ? 1 : 0;
    const u = Object.assign({}, G.RIG.cafe, { uKeyDir: [0.6, 0.5, 0.7], uKeyCol: [0.07, 0.06, 0.07], uRimDir: [-0.6, 0.45, -0.7], uRimCol: [0.95, 0.75, 1.8], uFillCol: [0.015, 0.012, 0.025], uExposure: 1, uAO: 1, uWrap: 0.18,
      uLamp2Pos: [0.52, 2.62, 0.05], uLamp2Col: [0.35 * hz, 0.85 * hz, 0.12 * hz], uLampPos: [0, -9, 0], uLampCol: [0, 0, 0], uShow: G.show([1]) },
      G.figs([{ pos: [-0.2, 0, 0], yaw: Math.PI / 2, skin: [0.58, 0.4, 0.3], cloth: [0.16, 0.34, 0.32], hair: 2, hairCol: [0.16, 0.09, 0.05], legs: 1, armL: 2, armR: 4 + hand, head: [0.05, -0.06 - sniff * 0.08, 0], lean: 0.02 - sniff * 0.03 }]), G.cam(camO));
    ctx.drawImage(this.g.draw(u), 0, 0, 1920, 1080);
    if (sh.i === 2) {
      // inside the cup: the same air loops from the mouth back up into the nose
      const c = G.project(camO, [0.27, 2.62, 0.12]), sc = 1.5 / Math.max(0.3, c[2]);
      const loop = (v) => { const a = Math.PI * 0.75 - v * Math.PI * 1.6; return [c[0] + Math.cos(a) * 120 * sc, c[1] + 20 * sc + Math.sin(a) * 110 * sc]; };
      const lp = prog(t, SNIFF - 0.05, 0.5, ease.inOutCubic);
      ctx.save(); ctx.strokeStyle = S.rgba(P.gas, 0.9); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.setLineDash([2, 16]); ctx.lineDashOffset = -t * 60;
      ctx.beginPath(); for (let i = 0; i <= 40 * lp; i++) { const [x, y] = loop(i / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
      for (let i = 0; i < 8; i++) { const v = (t * 0.5 + i / 8) % 1; if (v > lp) continue; const [x, y] = loop(v); S.puff(ctx, x, y, 40 * sc, 0.5, P.gas, i); }
      ctx.save(); ctx.globalAlpha = 1 - 0.6 * prog(t, YOURE - 0.3, 0.3); api.doodle.cross(ctx, c[0] - 40, c[1], 300, prog(t, DOESNT, 0.6, ease.inOutCubic), { color: P.marker, width: 28, seed: 5, glow: 'rgba(255,40,40,0.4)' }); ctx.restore();
    }
    if (sh.i === 3) {
      // the figure inside a faint bubble of its own air
      const c = G.project(camO, [-0.2, 2.2, 0]), r = 1.9 * 1080 * camO.focal / 2 / Math.max(1, c[2]);
      ctx.save(); const g = ctx.createRadialGradient(c[0], c[1], r * 0.5, c[0], c[1], r); g.addColorStop(0, 'rgba(185,227,90,0)'); g.addColorStop(0.85, 'rgba(185,227,90,0.13)'); g.addColorStop(1, 'rgba(185,227,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(210,255,140,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c[0], c[1], r * 0.95, 0, Math.PI * 2 * prog(t, YOURE, 0.8)); ctx.stroke(); ctx.restore();
      for (let i = 0; i < 16; i++) { const a = t * 0.25 + i * 0.39, rr = r * (0.5 + 0.35 * ((i * 7) % 5) / 5); S.puff(ctx, c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * 0.9, 70, 0.22, P.gas, i); }
      api.doodle.text(ctx, 'SAME AIR', 1520, 300, prog(t, SAME - 0.1, 0.45), { size: 120, color: P.lime, align: 'center', rotate: -0.05, stroke: 'rgba(10,6,20,0.6)', strokeWidth: 12 });
      api.doodle.text(ctx, '(all day)', 1520, 420, prog(t, ALLDAY, 0.4), { size: 64, color: P.dim, align: 'center', rotate: -0.05 });
    }
    api.finish(ctx, t, { bloom: 0.35, grain: 0.06, vignette: 0.55 });
  },
});
