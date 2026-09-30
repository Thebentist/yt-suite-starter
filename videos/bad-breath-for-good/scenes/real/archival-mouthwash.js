// @use videos/bad-breath-for-good/scenes/real/_lib.js
/* archival-mouthwash (mouthwash-cover, words 2269-2271): "And most mouthwash, ..." (to be honest, kind of doing the
 * same thing [as a mint: covering it up]). An old mouthwash ad in the film gate (Calvert's "Dento-Phenolene",
 * Wellcome Collection, CC BY 4.0; undated, so no year on screen): the marker underlines "Unequalled for sweetening the breath" (sweetening = covering the smell). Hands back to the micro group's
 * rinse on "to be honest".
 */
defineScene({
  name: 'archival-mouthwash', fps: 30,
  anchor: { word: 2269, offset: -0.1 }, anchorEnd: { word: 2272, offset: 0.0 }, tail: 0.3,
  assets: { ad: REAL.img('ad-calvert-dento-phenolene.jpg') },
  draw(ctx, t, api) {
    const R = REAL, { ease, prog } = api, end = api.duration - 0.3, k = api.clamp(t / end);
    let tr = null;
    // snap-zoom already underway on frame 1 (the picture settles into the gate)
    const snap = 1 + 0.14 * (1 - api.ease.outExpo(api.clamp((t + 0.06) / 0.45)));
    R.filmGate(ctx, api, t, (g, x, y, w, h) => {
      tr = R.cover(g, api.image('ad'), x, y, w, h, 0.69 + 0.02 * k, 0.47 + 0.04 * k, (1.6 + 0.16 * ease.inOutSine(k)) * snap);
      // marker on the ad (image px -> screen): underline "Unequalled for sweetening the" / "breath"
      const P = (ix, iy) => [tr.dx + ix * tr.s, tr.dy + iy * tr.s];
      const u = prog(t, api.at(2271) - 0.12, 0.38, ease.inOutCubic);
      if (u > 0) {
        const [a1, b1] = P(1795, 878), [a2] = P(2180, 878), [c1, d1] = P(1370, 952), [c2] = P(1515, 952);
        api.doodle.underline(g, a1, a2, b1, api.clamp(u * 1.6), { color: api.P.marker, width: 9, seed: 61 });
        api.doodle.underline(g, c1, c2, d1, api.clamp(u * 1.6 - 0.6), { color: api.P.marker, width: 9, seed: 63 });
      }
    }, { seed: 7, lift: 0.3, tint: 'rgba(255,242,226,1)' });
    api.label(ctx, 'Old mouthwash ad', R.GATE.x + R.GATE.w - 44, R.GATE.y + R.GATE.h - 60, { align: 'right', p: api.pop(t, api.at(2270) - 0.04, 0.36), size: 40 });
    R.source(ctx, api, 'Wellcome Collection (CC BY 4.0)', { x: R.GATE.x + 40, y: R.GATE.y + R.GATE.h - 34 });
    R.flash(ctx, t, -0.03, { peak: 0.25, dur: 0.1 });
    api.finish(ctx, t, { bloom: 0.12, grain: 0.09, vignette: 0.35 });
  },
});
