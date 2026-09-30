// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* question (words 495-516): "So the real question is, how do you check something that you can't even smell? And where
 * is it really coming from?" Timing from the cut (anchor/api.at); ends where question-title (full screen) starts,
 * word 517 - 0.15. Left third over Ben: chip THE REAL QUESTION, Q1 pops word by word, then
 * recedes (smaller, dim) as Q2 builds below it; REALLY gets a red marker underline.
 */
defineScene({
  name: 'question', fps: 30, transparent: true,
  anchor: { word: 495, offset: -0.15 }, anchorEnd: { word: 517, offset: -0.15 }, tail: 0.5,
  plan: { lane: 2 }, sfx: [{ w: 497, kind: 'pop' }, { w: 507, kind: 'pop-high' }, { w: 510, kind: 'whoosh-soft' }, { w: 514, kind: 'scribble-short', d: 0.18 }, { w: 515, kind: 'pop-high' }],
  draw(ctx, t, api) {
    const { P, prog, ease, lerp, pop } = api, a = (i) => api.at(i);
    const T = { real: a(497), how: a(500), do: a(501), you: a(502), check: a(503), something: a(504), you2: a(506), cant: a(507), smell: a(509), and: a(510), where: a(511), is: a(512), it: a(513), really: a(514), coming: a(515), from: a(516) };
    const drift = t * 5; // slow rise
    // Q1 recedes on "And" (scale toward the top-left, dim)
    const back = prog(t, T.and, 0.45, ease.inOutCubic);
    const s1 = lerp(1, 0.58, back), a1 = lerp(1, 0.6, back), ax = 96, ay = 196;
    ctx.save(); ctx.translate(0, -drift);
    api.label(ctx, 'THE REAL QUESTION', 96, 238 - back * 40, { p: pop(t, T.real, 0.5) * (1 - prog(t, T.and, 0.3, ease.inCubic)), size: 40 });
    ctx.save(); ctx.translate(ax, ay - back * 24); ctx.scale(s1, s1); ctx.translate(-ax, -ay);
    OV.kinetic(ctx, api, t, [
      { y: 382, size: 80, words: [{ w: 'HOW', t: T.how }, { w: 'DO', t: T.do }, { w: 'YOU', t: T.you }, { w: 'CHECK', t: T.check }] },
      { y: 474, size: 80, words: [{ w: 'SOMETHING', t: T.something }, { w: 'YOU', t: T.you2 }] },
      { y: 578, size: 90, words: [{ w: "CAN'T", t: T.cant, hl: true }, { w: 'SMELL?', t: T.smell, hl: true }] },
    ], { x: 96, alpha: a1 });
    ctx.restore();
    // Q2 below
    const boxes = OV.kinetic(ctx, api, t, [
      { y: 590, size: 104, words: [{ w: 'WHERE', t: T.where }, { w: 'IS', t: T.is }, { w: 'IT', t: T.it }] },
      { y: 708, size: 104, words: [{ w: 'REALLY', t: T.really }] },
      { y: 830, size: 112, words: [{ w: 'COMING', t: T.coming, hl: true }, { w: 'FROM?', t: T.from, hl: true }] },
    ], { x: 96 });
    const really = boxes.find((b) => b.str === 'REALLY');
    if (really) OV.mark(ctx, api, 'underline', [really.x - 6, really.x + really.w + 10, really.y + 16], prog(t, T.really + 0.18, 0.32, ease.inOutCubic), { width: 10, seed: 44, glow: 'rgba(255,255,255,0.85)' });
    ctx.restore();
  },
});
