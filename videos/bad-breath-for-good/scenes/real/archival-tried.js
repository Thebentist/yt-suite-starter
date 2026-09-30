// @use videos/bad-breath-for-good/scenes/real/_lib.js
/* archival-tried (tried-everything, words 2153-2160): "You've tried mints, and mouthwash, and brushing harder."
 * Three archival punches in a film gate (Cleo's archival frame: 4:3 gate, perforation outline, grain, weave, dust),
 * cut on the words: a c.1920s show card of breath sweets (Grossmith's Violet Cachous, Wellcome Collection, CC BY 4.0)
 * on "mints"; a 1948 mouthwash ad (Ladies' Home Journal, public domain; cropped above the brand line) on "mouthwash";
 * and a girl scrubbing her teeth in the 1953 Prelinger film "Health: Your Cleanliness" (public domain) on "brushing
 * harder". Hands back to the story group's lineup (MINTS / MOUTHWASH / BRUSHING HARDER + red X's) on "And the reason".
 */
defineScene({
  name: 'archival-tried', fps: 30,
  anchor: { word: 2153, offset: -0.1 }, anchorEnd: { word: 2161, offset: -0.05 }, tail: 0.3,
  assets: {
    mints: REAL.img('ad-grossmith-violet-cachous-c1920.jpg'), wash: REAL.img('ad-lhj-1948-buttercup.jpg'),
    film: { video: 'videos/bad-breath-for-good/assets/web/film-brushing-1953.mp4', start: 1.1, width: 1280 },
  },
  draw(ctx, t, api) {
    const R = REAL, { ease, prog } = api;
    const c1 = api.at(2156) - 0.04, c2 = api.at(2158) - 0.04, end = api.duration - 0.3;
    const shot = t < c1 ? 0 : t < c2 ? 1 : 2, st = [0, c1, c2][shot], en = [c1, c2, end][shot], k = api.clamp((t - st) / Math.max(0.3, en - st));
    // snap-zoom already underway on frame 1 (the picture settles into the gate)
    const snap = 1 + 0.14 * (1 - api.ease.outExpo(api.clamp((t + 0.06) / 0.45)));
    R.filmGate(ctx, api, t, (g, x, y, w, h) => {
      if (shot === 0) R.cover(g, api.image('mints'), x, y, w, h, 0.5, 0.3 + 0.04 * k, (1.12 + 0.1 * ease.inOutSine(k)) * (shot === 0 ? snap : 1));
      else if (shot === 1) R.cover(g, api.image('wash'), x, y, w, h, 0.42 - 0.04 * k, 0.4 - 0.03 * k, 1.05 + 0.1 * ease.inOutSine(k));
      else R.cover(g, api.video('film'), x, y, w, h, 0.5, 0.45, 1.06 + 0.06 * k, { filter: 'contrast(1.12) brightness(1.04)' });
    }, { seed: shot, tint: shot === 2 ? 'rgba(255,238,212,1)' : 'rgba(255,240,222,1)', lift: shot === 2 ? 0.5 : 0.35 });
    // what we are looking at, on its word (small chip inside the gate, top-left)
    const chip = [['BREATH MINTS, 1920s', api.at(2155) - 0.12], ['MOUTHWASH AD, 1948', api.at(2157) - 0.1], ['FILM, 1953', api.at(2159) - 0.1]][shot];
    api.label(ctx, chip[0], R.GATE.x + 44, R.GATE.y + 70, { p: api.pop(t, Math.max(st + 0.04, chip[1]), 0.36), size: 40, upper: false });
    const src = ['Wellcome Collection (CC BY 4.0)', "Ladies' Home Journal, 1948 · Internet Archive", 'Prelinger Archives · Health: Your Cleanliness (1953)'][shot];
    R.source(ctx, api, src, { x: R.GATE.x + 40, y: R.GATE.y + R.GATE.h - 34 });
    R.flash(ctx, t, shot ? st : -0.03, { peak: shot ? 0.28 : 0.25, dur: 0.1 });
    api.finish(ctx, t, { bloom: 0.12, grain: 0.09, vignette: 0.35 });
  },
});
