// @use videos/bad-breath-for-good/scenes/real/_lib.js
/* headlines (one-in-three, words 465-469): "And it's actually super common."
 * Real headlines slam onto the desk one per beat: CNN (2020), Fox News (2016), TODAY (2014, whose standfirst says
 * "most of us experience an occasional bout of halitosis": highlighted on "super"). On "common" a hard cut to the
 * PubMed page of Silva et al. 2018 (research-notes row 1): the line "The combined prevalence of halitosis was found to
 * be 31.8%" is highlighted and "31.8%" circled. Hard stop before "About one in three" so the data group's "1 IN 3"
 * lands clean. Clean crops only (no article photos: news photos are agency stock).
 */
defineScene({
  name: 'headlines', fps: 30,
  anchor: { word: 465, offset: -0.12 }, anchorEnd: { word: 477, offset: -0.04 }, tail: 0.3,
  assets: {
    cnn: REAL.img('news-cnn-2020.png'), fox: REAL.img('news-fox-2016.png'), today: REAL.img('news-today-2014.png'), silva: REAL.img('paper-silva-2018.png'),
  },
  async setup(api) {
    this.m = { cnn: await REAL.meta('news-cnn-2020'), fox: await REAL.meta('news-fox-2016'), today: await REAL.meta('news-today-2014'), silva: await REAL.meta('paper-silva-2018') };
    this.A = REAL.layer(api); this.B = REAL.layer(api);
  },
  draw(ctx, t, api) {
    const R = REAL, { ease, prog } = api, m = this.m;
    const T = { its: api.at(466), actually: api.at(467), super: api.at(468), common: api.at(469), end: api.duration - 0.3 };
    const silvaT = T.common - 0.04;
    if (t >= silvaT) {
      const K = 'The combined prevalence of halitosis was found to be 31.8%';
      R.paper(ctx, t, api, this, {
        im: api.image('silva'), m: m.silva, cut: silvaT,
        wide: { fx: 600, fy: 600, s0: 1.5 },
        close: { key: K, fx: 640, fy: 866, s0: 2.45, s1: 2.55, y: 560, dx: -30 },
        marks: [
          { kind: 'hl', key: K, t0: silvaT + 0.03, dur: 0.2 },
          { kind: 'ring', key: '31.8%', t0: silvaT + 0.18, dur: 0.2, padX: 12, padY: 12, width: 9, seed: 51 },
        ],
        source: 'PubMed · Silva et al., Clin Oral Investig 2018',
      });
      api.finish(ctx, t, { bloom: 0.1, grain: 0.055, vignette: 0.42 });
      return;
    }
    const cards = [
      { k: 'cnn', t0: -0.08, crop: { x: 20, y: 300, w: 1230, h: 420 }, x: 900, y: 420, w: 1500, rot: -0.04, from: [-260, -420] },
      { k: 'fox', t0: T.its + 0.1, crop: { x: 60, y: 292, w: 1160, h: 270 }, x: 1020, y: 650, w: 1440, rot: 0.03, from: [460, 260] },
      { k: 'today', t0: T.super - 0.12, crop: { x: 80, y: 58, w: 1165, h: 442 }, x: 960, y: 530, w: 1560, rot: -0.014, from: [-180, 460],
        hl: { key: 'most of us experience an occasional bout of halitosis', t0: T.super - 0.05, dur: 0.18, grow: 16 } },
    ];
    R.desk(ctx, api, t, { c1: '#221d36' });
    ctx.save();
    for (const c of cards) R.shake(ctx, api, t, c.t0 + 0.12, 10, 0.2);
    const zoom = 1 + 0.04 * (t / T.end); ctx.translate(960, 540); ctx.scale(zoom, zoom); ctx.translate(-960, -540);
    cards.forEach((c, i) => {
      if (t < c.t0) return;
      // the card under the newest one sinks back a little
      const next = cards[i + 1], under = next && t > next.t0 ? prog(t, next.t0, 0.2) : 0;
      const k = prog(t, c.t0, 0.16, ease.outCubic), sc = (1 + (1 - k) * 0.18) * (1 - 0.06 * under);
      const x = c.x + (1 - k) * c.from[0], y = c.y + (1 - k) * c.from[1];
      R.clipping(ctx, api, api.image(c.k), m[c.k], c.crop, x, y, c.w * sc, c.rot * (1.6 - 0.6 * k), {
        after: c.hl ? (g) => R.highlight(g, m[c.k].rects[c.hl.key].map((r) => ({ ...r, w: r.w + (c.hl.grow || 0) })), prog(t, c.hl.t0, c.hl.dur, ease.inOutCubic), { pad: 3 }) : null,
      });
      if (under) { ctx.save(); ctx.globalAlpha = 0.4 * under; ctx.fillStyle = '#07060d'; ctx.fillRect(-100, -100, 2120, 1280); ctx.restore(); }
    });
    ctx.restore();
    R.source(ctx, api, 'CNN 2020 · Fox News 2016 · TODAY 2014');
    api.finish(ctx, t, { bloom: 0.1, grain: 0.055, vignette: 0.45 });
  },
});
