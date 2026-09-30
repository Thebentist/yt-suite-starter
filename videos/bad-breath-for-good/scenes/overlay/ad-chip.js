// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* ad-chip: the paid-segment disclosure, top-left, for the whole product segment: word 3013 - 0.15 s to the end of
 * word 3706 ("...where these things go.", the softer landing Ben asked for in v4e) + 0.25 s, about 84 s; timing from the
 * cut via anchor/anchorEnd. Lane 3 (above the full-screen graphics). Glass pill, pulsing lime dot, "AD" in lime +
 * "· SOMETHING NICE (BEN'S COMPANY)" in white. Opens from the dot, closes into it at the end.
 */
defineScene({
  name: 'ad-chip', fps: 30, transparent: true,
  anchor: { word: 3013, offset: -0.15 }, anchorEnd: { word: 3706, edge: 'end', offset: 0.25 }, tail: 0.5,
  plan: { lane: 3 }, sfx: [{ t: 0.05, kind: 'pop-low' }],
  draw(ctx, t, api) {
    const { P, prog, ease, clamp } = api;
    const END = OV.endT(api, this.anchorEnd), X = 64, Y = 92, size = 34, h = 58, r = h / 2;
    const A = 'AD', B = ' ·  SOMETHING NICE (BEN\'S COMPANY)';
    const wA = api.measure(ctx, A, { size, weight: 700, tracking: 2 }), wB = api.measure(ctx, B, { size, weight: 700, tracking: 1.5 });
    const dotX = X + 30, textX = X + 54, fullW = 54 + wA + wB + 26;
    const openP = prog(t, 0.12, 0.5, ease.outExpo) * (1 - prog(t, END - 0.36, 0.3, ease.inCubic));
    const dotP = api.pop(t, 0.0, 0.4) * (1 - prog(t, END - 0.12, 0.12, ease.inCubic));
    if (dotP <= 0) return;
    const w = Math.max(h, fullW * openP);
    ctx.save();
    ctx.globalAlpha *= clamp(dotP * 1.5);
    // glass pill (same family as the chapter cards); a soft light sweep crosses it every 12 s
    const sp = t > 3 ? ((t - 3) % 12) / 1.4 : -1;
    OV.glassCard(ctx, api, X, Y - h / 2, w, h, { r: h / 2, sweep: sp >= 0 && sp <= 1 ? sp : null, sweepAlpha: 0.22 });
    // pulsing lime dot
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
    ctx.fillStyle = P.lime; ctx.shadowColor = 'rgba(215,243,74,0.85)'; ctx.shadowBlur = 8 + 10 * pulse;
    ctx.beginPath(); ctx.arc(dotX, Y, 8 * dotP + 1.2 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.shadowColor = 'transparent';
    // text, revealed by the opening pill
    ctx.save(); ctx.beginPath(); ctx.rect(X, Y - h / 2, w - 12, h); ctx.clip();
    api.text(ctx, A, textX, Y + size * 0.36, { size, weight: 700, tracking: 2, color: P.lime });
    api.text(ctx, B, textX + wA, Y + size * 0.36, { size, weight: 700, tracking: 1.5, color: P.ink });
    ctx.restore();
    ctx.restore();
  },
});
