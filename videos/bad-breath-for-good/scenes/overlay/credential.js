// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* credential (words 418-438, "Because trust me, I'm an orthodontist... I know what bad breath smells like").
 * Timing from the cut; ends where mouth-stat (full screen) starts (word 439 - 0.15).
 * Premium lower third bottom-left: glass card, glowing lime bar, DR. BEN WINTERS types in glyph by glyph, ORTHODONTIST
 * wipes on with the word, one light sweep. A red marker "him" + arrow points at Ben (tip stays clear of his head).
 * The card never opens before the previous full-screen graphic (not-food, ends word 417 end + 0.25) is gone.
 */
defineScene({
  name: 'credential', fps: 30, transparent: true,
  anchor: { word: 418, offset: -0.15 }, anchorEnd: { word: 439, offset: -0.15 }, tail: 0.5,
  plan: { lane: 2 }, sfx: [{ w: 419, kind: 'whoosh-soft', d: -0.05 }, { w: 423, kind: 'pop' }, { w: 423, edge: 'end', kind: 'scribble-short', d: 0.1 }],
  draw(ctx, t, api) {
    const { P, prog, ease } = api;
    const END = OV.endT(api, this.anchorEnd);
    const t0 = Math.max(api.atEnd(417) + 0.25, api.at(419) - 0.05);
    const { out } = OV.lowerThird(ctx, api, t, { name: 'DR. BEN WINTERS', sub: 'ORTHODONTIST', t0, tSub: Math.max(api.at(423), t0 + 0.45), end: END, x: 96, y: 846 });
    const th = api.atEnd(423) + 0.1;
    ctx.save(); ctx.globalAlpha *= 1 - out;
    OV.hand(ctx, api, 'him', 470, 360, prog(t, th, 0.3, ease.linear), { size: 92, color: P.marker, rotate: -0.08, stroke: 'rgba(255,255,255,0.9)', strokeWidth: 12, blur: 10 });
    OV.mark(ctx, api, 'arrow', [608, 350, 752, 436], prog(t, th + 0.23, 0.4, ease.inOutCubic), { width: 10, seed: 33, bend: -46, head: 32, glow: 'rgba(255,255,255,0.9)' });
    ctx.restore();
  },
});
