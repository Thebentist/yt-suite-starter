// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// end-question (phase 2): words 4764-4773 "So would you tell a friend if their breath stunk?"  Holds 0.8 s after.
// A callback to the hook: the same candle-lit café table and the two friends, soft-focused far behind big type. WOULD YOU /
// TELL A FRIEND (lime) / IF THEIR BREATH STUNK? land on their words; a comment bubble for "let me know".
defineScene({
  name: 'end-question',
  anchor: { word: 4764, offset: -0.15 },
  anchorEnd: { word: 4773, edge: 'end', offset: 0.8 },
  tail: 0.5,
  setup(api) {
    STORY.init(api);
    this.g = api.gl.create(api, STORYGL.frag({ figs: 2, extra: STORYGL.CAFE, lamp: true }), { res: 0.5, aa: 1, steps: 110 });
    this.bg = STORY.bokehField({ seed: 'cafe', cols: ['#ffb36b', '#ff8a5c', '#ffd28a', '#ffcf9a', '#a78bfa'], n: 80, big: 80, windows: true, top: '#1c1020', mid: '#150b18', bottom: '#060409' });
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const flick = 1 + 0.08 * Math.sin(t * 13.1) + 0.05 * Math.sin(t * 29.7 + 1.3), k = ease.inOutSine(clamp(t / api.duration));
    S.bokeh(ctx, this.bg, -t * 12, 0, 1);
    const camO = { ro: [0.2, 2.05, lerp(6.0, 5.4, k)], ta: [0, 2.1, 0], focal: 2.1 };
    const u = Object.assign({}, G.RIG.cafe, { uRimDir: [0.15, 0.5, -1], uLampPos: [0.02, 1.13, 0.28], uLampCol: [4.2 * flick, 2.2 * flick, 0.8 * flick], uLamp2Pos: [0, 5, 5], uLamp2Col: [0, 0, 0], uExtra: 1, uRimExtra: 0.35, uExposure: 1.05, uAO: 1, uWrap: 0.7, uShow: G.show([1, 1]) },
      G.figs([{ pos: [-1.45, 0, 0], yaw: Math.PI / 2, skin: [0.46, 0.3, 0.22], cloth: [0.2, 0.17, 0.32], hair: 3, hairCol: [0.035, 0.028, 0.03], head: [0, -0.04, 0], mouth: 0.2 * Math.max(0, Math.sin(t * 8)) },
        { pos: [1.45, 0, 0], yaw: -Math.PI / 2, skin: [0.66, 0.46, 0.36], cloth: [0.42, 0.16, 0.13], hair: 1, hairCol: [0.09, 0.05, 0.04], lean: 0.03, head: [0, -0.05, 0] }]), G.cam(camO));
    ctx.save(); ctx.filter = 'blur(9px) brightness(0.7)'; ctx.drawImage(this.g.draw(u), 0, 0, 1920, 1080); ctx.restore();
    const fp = G.project(camO, [0.02, 1.1, 0.28]); S.glow(ctx, fp[0], fp[1], 300, '#ffb060', 0.55 * flick);
    ctx.fillStyle = 'rgba(8,5,14,0.35)'; ctx.fillRect(0, 0, 1920, 1080);
    ctx.save(); api.cam(ctx, t, { zoom0: 1.0, zoom1: 1.05, dur: api.duration });
    const size = 150, lines = [
      { y: 330, words: [['WOULD', api.at(4765)], ['YOU', api.at(4766)]] },
      { y: 530, words: [['TELL', api.at(4767)], ['A', api.at(4768)], ['FRIEND', api.at(4769)]], hi: true },
      { y: 730, words: [['IF', api.at(4770)], ['THEIR', api.at(4771)], ['BREATH', api.at(4772)], ['STUNK?', api.at(4773)]] },
    ];
    for (const L of lines) {
      const ws = L.words.map(([w]) => api.measure(ctx, w, { size, tracking: 2 })), gap = 36, tot = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
      let x = 960 - tot / 2;
      if (L.hi) { const hp = prog(t, L.words[0][1] - 0.02, 0.45, ease.outCubic); if (hp > 0) { ctx.save(); ctx.fillStyle = P.lime; ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; api.roundRect(ctx, x - 30, L.y - size * 0.86, (tot + 60) * hp, size * 1.06, 10); ctx.fill(); ctx.restore(); } }
      L.words.forEach(([w, at], i) => {
        const p = pop(t, at - 0.03, 0.4);
        if (p > 0) { ctx.save(); ctx.translate(x + ws[i] / 2, L.y - size * 0.35); ctx.scale(p, p); ctx.translate(-(x + ws[i] / 2), -(L.y - size * 0.35));
          if (L.hi) api.text(ctx, w, x, L.y, { size, tracking: 2, color: P.black });
          else S.type(ctx, w, x + ws[i] / 2, L.y, 1, { size, tracking: 2, color: w === 'STUNK?' ? '#ff5a66' : P.ink, side: '#3a2470', depth: 8 });
          ctx.restore(); }
        x += ws[i] + gap;
      });
    }
    const cp = pop(t, api.atEnd(4773) + 0.1, 0.5);
    if (cp > 0) { ctx.save(); ctx.translate(1640, 880); ctx.scale(cp, cp); ctx.rotate(-0.06); S.icons.comment(ctx, 0, 0, 80, t); ctx.restore(); }
    ctx.restore();
    api.finish(ctx, t, { bloom: 0.3, grain: 0.06, vignette: 0.5 });
  },
});
