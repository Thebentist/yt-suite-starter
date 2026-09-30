// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* sorry (word 810, "Sorry."). Timing from the cut (anchor/api.at); ends where tip-vs-back (full screen) starts, word
 * 811 - 0.15 (about 1 s). Ben is punched in to 1.45x on this word (framing.json moments; his head spans x ~830-1270),
 * so a handwritten red "sorry" + a drawn grimace face (yellow, ink lines, never an emoji font) sit right of his head,
 * above his shoulder.
 */
defineScene({
  name: 'sorry', fps: 30, transparent: true,
  anchor: { word: 810, offset: -0.15 }, anchorEnd: { word: 811, offset: -0.15 }, tail: 0.5,
  plan: { lane: 2 }, sfx: [{ w: 810, kind: 'scribble-short', d: -0.05 }],
  draw(ctx, t, api) {
    const { P, prog, ease } = api, s0 = api.at(810) - 0.05;
    const wob = Math.sin(t * 9) * 0.03 * prog(t, s0 + 0.45, 0.2);
    ctx.save(); ctx.translate(1540, 600); ctx.rotate(-0.06 + wob); ctx.translate(-1500, -600);
    OV.hand(ctx, api, 'sorry', 1328, 652, prog(t, s0, 0.26, ease.linear), { size: 88, color: P.marker, stroke: 'rgba(255,255,255,0.95)', strokeWidth: 12, blur: 10 });
    OV.grimace(ctx, api, 1640, 604, 62, prog(t, s0 + 0.04, 0.3, ease.linear), { color: '#1b1a22', width: 7, fill: P.yellow });
    // two little "eek" ticks beside the face
    OV.mark(ctx, api, 'stroke', [[[1718, 540], [1742, 518]]], prog(t, s0 + 0.3, 0.08), { color: P.marker, width: 7, seed: 71, glow: 'rgba(255,255,255,0.9)' });
    OV.mark(ctx, api, 'stroke', [[[1730, 580], [1760, 572]]], prog(t, s0 + 0.34, 0.08), { color: P.marker, width: 7, seed: 73, glow: 'rgba(255,255,255,0.9)' });
    ctx.restore();
  },
});
