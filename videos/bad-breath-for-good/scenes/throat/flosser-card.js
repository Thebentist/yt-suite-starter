/* flosser-card (transparent overlay, lane 2; words 3984-4002): "I would recommend our AquaClean Duo. It is a special
 * motor mode and everything specifically for tonsil stones."
 * Ben holds the real AquaClean Duo up on camera (device centre-left, face ~45-72% of the width). A clean name card on
 * the right third: "AquaClean Duo" in plain type with a lime rule, slides in on "Aqua"; a TONSIL STONE MODE chip pops
 * under it on "tonsil stones". Nothing over his face or the device. Ends where flosser-b's full-screen shot begins. */
defineScene({
  name: 'flosser-card',
  transparent: true,
  anchor: { word: 3984, offset: -0.15 },
  anchorEnd: { word: 4033, offset: -0.15 },
  tail: 0,
  draw(ctx, t, api) {
    const { P, prog, pop, ease, clamp } = api;
    const tAqua = api.at(3988), tTonsil = api.at(4001), tEnd = api.duration;
    const out = prog(t, tEnd - 0.3, 0.3, ease.inCubic);
    const inP = prog(t, tAqua - 0.15, 0.55, ease.outExpo);
    if (inP <= 0) return;
    const X = 1860, Y = 560;              // right edge of the card, baseline of the name
    ctx.save();
    ctx.globalAlpha = clamp(inP * 1.4) * (1 - out);
    ctx.translate(60 * (1 - inP), 0);
    // soft dark panel behind the type so it reads over the lavender set
    const w = 560, h = 250;
    const g = ctx.createLinearGradient(X - w, 0, X, 0);
    g.addColorStop(0, 'rgba(10,8,22,0)'); g.addColorStop(0.3, 'rgba(10,8,22,0.42)'); g.addColorStop(1, 'rgba(10,8,22,0.58)');
    ctx.fillStyle = g; api.roundRect(ctx, X - w, Y - 150, w + 20, h, 18); ctx.fill();
    // name in plain condensed type + lime rule
    api.text(ctx, 'AquaClean Duo', X - 24, Y, { size: 92, weight: 700, color: '#ffffff', align: 'right', shadow: 'rgba(0,0,0,0.55)', shadowBlur: 18, shadowY: 4 });
    const rw = 440 * prog(t, tAqua + 0.1, 0.5, ease.outCubic);
    ctx.fillStyle = P.lime; ctx.fillRect(X - 24 - rw, Y + 20, rw, 6);
    ctx.restore();
    // the chip on "specifically for tonsil stones"
    const cp = pop(t, tTonsil, 0.5) * (1 - out);
    if (cp > 0) api.label(ctx, 'TONSIL STONE MODE', X - 24, Y + 78, { size: 52, align: 'right', p: cp });
  },
});
