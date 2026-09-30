// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* get-rid (words 307-319: "if I do have that breath, how do I get rid of it?"). Timing from the cut (anchor/api.at);
 * ends where who-tells (full screen) starts. Kinetic type on the left third over Ben: a small lead-in line, then
 * HOW DO I / GET RID / OF IT? popping on their words, GET RID OF IT on lime.
 */
defineScene({
  name: 'get-rid', fps: 30, transparent: true,
  anchor: { word: 307, offset: -0.15 }, anchorEnd: { word: 320, offset: -0.15 }, tail: 0.5,
  plan: { lane: 2 }, sfx: [{ w: 313, kind: 'pop' }, { w: 316, kind: 'pop-high' }],
  draw(ctx, t, api) {
    const { ease, clamp } = api, at = (i) => api.at(i);
    const z = 1 + 0.035 * ease.inOutSine(clamp(t / 3));
    ctx.save(); ctx.translate(96, 560); ctx.scale(z, z); ctx.translate(-96, -560 + t * 6);
    OV.kinetic(ctx, api, t, [
      { y: 330, size: 54, words: [{ w: 'IF', t: at(307) }, { w: 'I', t: at(308) }, { w: 'DO', t: at(309) }, { w: 'HAVE', t: at(310) }, { w: 'THAT', t: at(311) }, { w: 'BREATH...', t: at(312) }] },
      { y: 500, size: 124, words: [{ w: 'HOW', t: at(313) }, { w: 'DO', t: at(314) }, { w: 'I', t: at(315) }] },
      { y: 660, size: 142, words: [{ w: 'GET', t: at(316), hl: true }, { w: 'RID', t: at(317), hl: true }] },
      { y: 820, size: 142, words: [{ w: 'OF', t: at(318), hl: true }, { w: 'IT?', t: at(319), hl: true }] },
    ], { x: 96 });
    ctx.restore();
  },
});
