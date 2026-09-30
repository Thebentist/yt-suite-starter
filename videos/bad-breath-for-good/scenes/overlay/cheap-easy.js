// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* cheap-easy (words 2648-2674): "...but it doesn't hurt. And so it's cheap, it's easy, and so I would recommend doing it".
 * Timing from the cut (anchor/api.at); ends where chapter-07 starts, word 2691 - 0.15.
 * Three lime check chips pop on the left third on their words: DOESN'T HURT, CHEAP, EASY.
 */
defineScene({
  name: 'cheap-easy', fps: 30, transparent: true,
  anchor: { word: 2648, offset: -0.15 }, anchorEnd: { word: 2691, offset: -0.15 }, tail: 0.5,
  plan: { lane: 2 }, sfx: [{ w: 2650, kind: 'pop', d: -0.04 }, { w: 2655, kind: 'pop', d: -0.04 }, { w: 2657, kind: 'pop-high', d: -0.04 }],
  draw(ctx, t, api) {
    const { prog, ease, pop } = api, T = { doesnt: api.at(2650), cheap: api.at(2655), easy: api.at(2657) }, END = OV.endT(api, this.anchorEnd);
    const out = prog(t, END - 0.32, 0.28, ease.inCubic);
    const items = [['DOESN\'T HURT', T.doesnt, -0.03, 380], ['CHEAP', T.cheap, 0.02, 520], ['EASY', T.easy, -0.015, 660]];
    items.forEach(([s, t0, rot, y], i) => {
      const bob = Math.sin(t * 1.6 + i * 1.3) * 4;
      const p = pop(t, t0 - 0.04, 0.5) * (1 - out);
      OV.checkChip(ctx, api, s, 96, y + bob, p, { size: 64, rot, seed: 11 + i });
    });
  },
});
