// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* RETIRED 2026-09-29 (coordinator): out of the edit; the cgi group hangs the price tag on the scraper inside cgi-lineup,
 * because the 3D scraper moves between camera angles and a separate overlay string ended in empty space. Kept for
 * reference only; the leading _ keeps it out of make-plan.mjs / render-all.mjs.
 * few-bucks (words 4670-4685): "With a scraper that only costs a few bucks, toothbrush and floss that you already have".
 * Phase 2: sits over cgi-lineup (a steel U tongue scraper on a dark studio turntable, centre of frame), so everything
 * keeps to the upper-right and lower-left and reads on dark. On "scraper" a string draws out from the product and a
 * paper price tag drops on it and swings; "only" / "a few bucks" are written on the tag on their words. On "toothbrush"
 * a white marker note writes in bottom-left, "already have" follows it, and a lime check lands on "already". Ends 0.1 s before "or
 * some new cool products" (4686), where cgi-lineup cuts to Ben's own products.
 */
defineScene({
  name: 'few-bucks', fps: 30, transparent: true,
  anchor: { word: 4670, offset: -0.15 }, anchorEnd: { word: 4686, offset: -0.1 }, tail: 0.5,
  plan: { lane: 2 }, sfx: [{ w: 4672, kind: 'whoosh-soft' }, { w: 4672, kind: 'pop-low', d: 0.3 }, { w: 4677, kind: 'scribble-short' }, { w: 4679, kind: 'scribble-short' }, { w: 4684, kind: 'pop-high', d: -0.08 }],
  draw(ctx, t, api) {
    const { P, prog, ease, clamp, lerp } = api;
    const END = OV.endT(api, this.anchorEnd), out = prog(t, END - 0.34, 0.3, ease.inCubic);
    const INK = '#1b1a22', KEY = 'rgba(8,6,16,0.9)';
    // --- the tag, hanging on a string from the product (centre) out to the upper right
    const tS = api.at(4672), tDrop = tS + 0.22;
    const drop = prog(t, tDrop, 0.55, ease.outBack), st = t - tDrop;
    const swing = st > 0 ? 0.16 * Math.sin(st * 4.2) * Math.exp(-st * 1.4) : 0;
    const hx = 1395, hy = lerp(-160, 262, drop) - out * 420, rot = 0.2 + swing + 0.015 * Math.sin(t * 1.3);
    // string: from the product's top-right to the tag's hole, sagging a little, drawn on
    const sp = prog(t, tS - 0.05, 0.5, ease.inOutCubic) * (1 - out);
    if (sp > 0) {
      const a = [1130, 360], m = [1290, Math.min(hy, 262) + 40], b = [hx - 6, hy + 2], pts = [];
      for (let i = 0; i <= 24; i++) { const u = i / 24, v = 1 - u; pts.push([v * v * a[0] + 2 * v * u * m[0] + u * u * b[0], v * v * a[1] + 2 * v * u * m[1] + u * u * b[1]]); }
      OV.mark(ctx, api, 'stroke', [pts], sp, { color: '#f4f1ea', width: 3.5, seed: 141, glow: 'rgba(255,255,255,0.35)', passes: 1, wobble: 1.2 });
      if (sp > 0.02) { ctx.save(); ctx.fillStyle = '#f4f1ea'; ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(a[0], a[1], 6, 0, 7); ctx.fill(); ctx.restore(); }
    }
    OV.priceTag(ctx, api, hx, hy, 420, 172, rot, drop * (1 - out), {
      draw: () => {
        OV.hand(ctx, api, 'only', 36, -22, prog(t, api.at(4674), 0.3, ease.linear), { size: 44, color: '#6a6356', stroke: false, blur: 0 });
        OV.hand(ctx, api, 'a few bucks', 32, 52, prog(t, api.at(4677) - 0.05, 0.5, ease.linear), { size: 74, color: INK, stroke: false, blur: 0 });
        api.doodle.underline(ctx, 36, 372, 72, prog(t, api.atEnd(4678), 0.3, ease.inOutCubic), { color: P.marker, width: 6, seed: 147, passes: 1 });
      },
    });
    // --- bottom-left: what you already have
    ctx.save(); ctx.globalAlpha *= 1 - out;
    OV.hand(ctx, api, 'toothbrush + floss', 120, 890, prog(t, api.at(4679), 0.6, ease.linear), { size: 68, color: '#ffffff', stroke: KEY, strokeWidth: 10, blur: 14 });
    OV.mark(ctx, api, 'check', [150, 968, 24], prog(t, api.at(4684) - 0.08, 0.22, ease.inOutCubic), { color: P.lime, width: 9, seed: 151, glow: 'rgba(215,243,74,0.6)' });
    OV.hand(ctx, api, 'already have', 196, 986, prog(t, Math.min(api.at(4684), api.atEnd(4681) + 0.05), 0.4, ease.linear), { size: 50, color: P.lime, stroke: KEY, strokeWidth: 9, blur: 12 });
    ctx.restore();
  },
});
