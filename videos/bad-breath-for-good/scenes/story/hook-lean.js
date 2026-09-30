// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// hook-lean (phase 2): words 258-291 "You're talking to somebody, you know, close enough to see their teeth, and then all of a sudden
// they lean away and you're like, wait a second, is my breath stink? Is it me?"
// A candle-lit café, two sculpted figures, five hard-cut shots on the words: wide two-shot -> over-the-shoulder on the friend
// ("close enough to see their teeth") -> profile two-shot, the friend leans back on "lean" (punch-in + flash) -> close-up on you
// ("wait a second") -> extreme close-up, a green haze leaves your mouth on "breath", IS / IT / ME? land on their words.
defineScene({
  name: 'hook-lean',
  anchor: { word: 258, offset: -0.15 },
  anchorEnd: { word: 291, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    STORY.init(api);
    const FR = STORYGL.frag({ figs: 2, extra: STORYGL.CAFE, lamp: true });
    this.g = api.gl.create(api, FR, { res: 0.5, aa: 1, steps: 120 });
    this.gNear = api.gl.create(api, FR, { res: 0.5, aa: 1, steps: 100 });   // foreground layer (blurred for depth of field)
    this.bg = STORY.bokehField({ seed: 'cafe', cols: ['#ffb36b', '#ff8a5c', '#ffd28a', '#ffcf9a', '#a78bfa'], n: 80, big: 80, windows: true, top: '#1c1020', mid: '#150b18', bottom: '#060409' });
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const CLOSE = api.at(264), AND = api.at(270), LEAN = api.at(277), YOU = api.at(279), WAIT = api.at(282), IS = api.at(285), BREATH = api.at(287), STINK = api.at(288), IS2 = api.at(289), IT = api.at(290), ME = api.at(291);
    const sh = S.shot(t, [CLOSE - 0.04, AND - 0.04, YOU - 0.04, IS - 0.04], api.duration);
    const flick = 1 + 0.08 * Math.sin(t * 13.1) + 0.05 * Math.sin(t * 29.7 + 1.3);
    // figures: 0 = you (left, facing +x), 1 = the friend (right, facing -x)
    const leanK = prog(t, LEAN - 0.02, 0.32, ease.outBack);
    const breathe = Math.sin(t * 1.7) * 0.012;
    const you = { pos: [-1.45, 0, 0], yaw: Math.PI / 2, skin: [0.46, 0.3, 0.22], cloth: [0.2, 0.17, 0.32], hairCol: [0.035, 0.028, 0.03], hair: 3,
      head: [0, -0.04 + breathe, 0], lean: 0.02 + breathe, mouth: t < LEAN ? 0.25 * Math.max(0, Math.sin(t * 9)) : 0 };
    const friend = { pos: [1.45, 0, 0], yaw: -Math.PI / 2, skin: [0.66, 0.46, 0.36], cloth: [0.42, 0.16, 0.13], hairCol: [0.09, 0.05, 0.04], hair: 1,
      lean: 0.03 + 0.3 * leanK - breathe, head: [0.16 * leanK, -0.05 - 0.22 * leanK, -0.06 * leanK], mouth: 0.55 * (1 - leanK) };
    if (sh.i === 3) { you.head = [0.1, 0.1 + breathe, 0.1 * prog(t, WAIT, 0.5, ease.inOutCubic)]; you.mouth = 0; }
    if (sh.i === 4) { you.head = [0.05, 0.05, 0.08]; you.mouth = 0.18 * prog(t, BREATH - 0.2, 0.3); }
    // cameras per shot (slow move inside each shot)
    const k = ease.inOutSine(sh.k);
    let camO;
    let rim = [0.15, 0.5, -1];
    if (sh.i === 0) camO = { ro: [0.2, 2.05, lerp(6.4, 5.6, k)], ta: [0, 2.1, 0], focal: 2.1 };
    else if (sh.i === 1) { camO = { ro: [lerp(-3.05, -2.9, k), 3.05, -1.3], ta: [1.15, 2.8, 0.1], focal: 2.35 }; rim = [1, 0.45, 0.35]; }
    else if (sh.i === 2) {
      const punch = S.bump(t, LEAN, 0.5) * 0.18 + prog(t, LEAN, 0.3) * 0.12;
      camO = { ro: [0.05, 2.6, lerp(4.2, 3.9, k)], ta: [0.25 * prog(t, LEAN, 0.4), 2.62, 0], focal: 2.0 + punch };
    } else if (sh.i === 3) { camO = { ro: [0.25, 2.95, lerp(1.85, 1.65, k)], ta: [-1.4, 2.8, 0.05], focal: 2.3 }; rim = [-1, 0.5, -0.7]; }
    else { camO = { ro: [lerp(-0.9, -0.98, k), 2.72, lerp(2.0, 1.8, k)], ta: [-1.66, 2.68, 0.0], focal: 2.3 }; rim = [0.85, 0.35, -0.6]; }
    const lk = [1, 0.8, 1, 0.45, 0.0][sh.i], hazeL = sh.i === 4 ? prog(t, BREATH - 0.1, 0.6) : 0;
    const lamp = { uLampPos: [0.02, 1.13, 0.28], uLampCol: [4.2 * flick * lk, 2.2 * flick * lk, 0.8 * flick * lk], uLamp2Pos: sh.i === 4 ? [-0.8, 2.52, 0.1] : [-3, 3.5, 3], uLamp2Col: sh.i === 4 ? [0.5 * hazeL, 1.3 * hazeL, 0.2 * hazeL] : [0, 0, 0] };
    const base = Object.assign({}, G.RIG.cafe, { uRimDir: rim }, lamp, G.figs([you, friend]), { uExtra: 1, uRimExtra: 0.35, uExposure: 1.05, uAO: 1, uWrap: [0.7, 0.5, 0.7, 0.2, 0.1][sh.i] });
    // background: out-of-focus café, parallax per shot
    const par = [[0, 0], [-260, -40], [60, -20], [240, 10], [300, 20]][sh.i];
    ctx.save(); ctx.globalAlpha = 0.8; S.bokeh(ctx, this.bg, par[0] + Math.sin(t * 0.2) * 20 - sh.local * (sh.i === 1 ? 14 : 6), par[1], sh.i >= 3 ? 1.15 : 1); ctx.restore();
    if (sh.i === 1) {
      // over the shoulder: the friend sharp, you (foreground) soft
      ctx.drawImage(this.g.draw(Object.assign({}, base, G.cam(camO), { uShow: G.show([0, 1]) })), 0, 0, 1920, 1080);
      ctx.save(); ctx.filter = 'blur(14px)'; ctx.drawImage(this.gNear.draw(Object.assign({}, base, G.cam(camO), { uShow: G.show([1, 0]), uExtra: 0 })), 0, 0, 1920, 1080); ctx.restore();
    } else if (sh.i === 3 || sh.i === 4) {
      ctx.drawImage(this.g.draw(Object.assign({}, base, G.cam(camO), { uShow: G.show([1, 0]), uExtra: sh.i === 3 ? 1 : 0 })), 0, 0, 1920, 1080);
    } else {
      ctx.drawImage(this.g.draw(Object.assign({}, base, G.cam(camO), { uShow: G.show([1, 1]) })), 0, 0, 1920, 1080);
    }
    if (sh.i === 0 || sh.i === 2) { const bg = ctx.createLinearGradient(0, 700, 0, 1080); bg.addColorStop(0, 'rgba(4,2,8,0)'); bg.addColorStop(1, 'rgba(4,2,8,0.75)'); ctx.fillStyle = bg; ctx.fillRect(0, 700, 1920, 380); }
    // candle glow bloom (screen space, pinned to the flame)
    const fp = G.project(camO, [0.02, 1.1, 0.28]);
    if (fp[2] > 0.2 && sh.i !== 4) { S.glow(ctx, fp[0], fp[1], 520 / fp[2] * 2.2, '#ffb060', 0.5 * flick); S.glow(ctx, fp[0], fp[1], 90 / fp[2] * 2.2, '#fff0c0', 0.9); }
    S.motes(ctx, t, { seed: 'cafe' + sh.i, n: 26, alpha: 0.28, rBig: 18 });
    // shot-specific overlays
    if (sh.i === 2) {
      // motion streaks on the lean + freeze flash
      const mk = prog(t, LEAN + 0.02, 0.22) * (1 - prog(t, LEAN + 0.9, 0.3));
      const hp = G.project(camO, [1.45, 2.85, 0]);
      for (let i = 0; i < 3; i++) api.doodle.stroke(ctx, [[hp[0] - 230 - i * 10, hp[1] - 40 + i * 42], [hp[0] - 150 - i * 4, hp[1] - 42 + i * 42]], mk, { color: P.marker, width: 8, seed: 30 + i });
      const fl = clamp(1 - (t - LEAN) / 0.16) * (t >= LEAN ? 1 : 0);
      if (fl > 0) { ctx.fillStyle = 'rgba(255,240,228,' + (0.35 * fl) + ')'; ctx.fillRect(0, 0, 1920, 1080); }
    }
    if (sh.i === 3) api.doodle.text(ctx, 'wait...', 1560, 330, prog(t, WAIT, 0.35), { size: 96, color: P.lime, align: 'center', rotate: -0.06, stroke: 'rgba(10,6,18,0.6)', strokeWidth: 10 });
    if (sh.i === 4) {
      // a green haze leaving your mouth on "breath"
      const mp = G.project(camO, [-1.02, 2.5, 0.0]);
      const hz = prog(t, BREATH - 0.1, 0.8);
      for (let i = 0; i < 9; i++) {
        const ph = ((t - BREATH) * 0.35 + i / 9) % 1; if (t < BREATH - 0.1) break;
        S.puff(ctx, mp[0] + 30 + ph * 560 + Math.sin(i * 2.1 + t) * 30, mp[1] - ph * 200 + Math.cos(i * 1.7 + t) * 26, 90 + ph * 260, 0.55 * hz * Math.sin(Math.PI * Math.min(1, ph * 1.2)), P.gas, i);
      }
      // IS / IT / ME?  (left third)
      const words = [['IS', IS2], ['IT', IT], ['ME?', ME]], size = 190;
      let y = 330;
      for (const [w, at] of words) {
        const p = pop(t, at - 0.02, 0.4);
        if (p > 0) { ctx.save(); ctx.translate(120, y); ctx.scale(p, p); S.type(ctx, w, 0, 0, 1, { size, align: 'left', color: w === 'ME?' ? '#ff4d5a' : '#fbf7f0', side: w === 'ME?' ? '#5a0d18' : '#2a1f4a', depth: 10, tracking: 2 }); ctx.restore(); }
        y += 200;
      }
      api.text(ctx, 'is my breath...', 128, 150, { family: 'hand', size: 58, color: P.gas, alpha: prog(t, BREATH - 0.1, 0.35) * (1 - prog(t, IS2, 0.3)), stroke: 'rgba(0,0,0,0.5)', strokeWidth: 8 });
    }
    api.finish(ctx, t, { bloom: 0.32, grain: 0.06, vignette: 0.55 });
  },
});
