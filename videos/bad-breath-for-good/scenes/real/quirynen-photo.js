// @use videos/bad-breath-for-good/scenes/real/_lib.js
/* quirynen-photo (Ben on camera, words 1302-1310): "...named Mark Quirion and... Yeah, I completely botched that."
 * Transparent (lane 3) companion to the overlay group's quirynen name card: Prof. Marc Quirynen's real staff photo from
 * KU Leuven's Department of Oral Health Sciences, as a print on the left third, directly above their lower third
 * (x 96-848, y 846-1010) and clear of Ben's face and of their "Quirion -> Quirynen (sorry, Marc)" correction on the
 * right. Lands with a shutter flash on "named", leaves with their card (their exit: end - 0.46 s over 0.4 s).
 */
defineScene({
  name: 'quirynen-photo', fps: 30, transparent: true,
  anchor: { word: 1302, offset: -0.2 }, anchorEnd: { word: 1310, edge: 'end', offset: 0.6 }, tail: 0.3,
  assets: { im: REAL.img('person-marc-quirynen-kuleuven-x3.png') },
  draw(ctx, t, api) {
    const R = REAL, { ease, prog } = api, end = api.duration - 0.3, t0 = -0.07; // pop already underway on frame 1
    const pin = api.pop(t, t0, 0.45), out = prog(t, end - 0.46, 0.4, ease.inCubic);
    if (pin <= 0 || out >= 1) return;
    const pw = 318, ph = Math.round(pw * 359 / 247), bx = 18, bb = 18;           // photo 318 x 462, print border
    const cx = 96 + (pw + bx * 2) / 2 + 8, cy = 250 + (ph + bx + bb) / 2;          // left edge lines up with their card
    const drop = (1 - api.ease.outCubic(api.clamp((t - t0) / 0.35))) * -60, sway = Math.sin(t * 1.3) * 0.004;
    const sc = (0.9 + 0.1 * Math.min(1.04, pin)) * (1 - 0.05 * out);
    ctx.save(); ctx.globalAlpha = api.clamp(pin * 1.8) * (1 - out);
    ctx.translate(cx, cy + drop); ctx.rotate(-0.035 + sway + (1 - api.clamp(pin)) * -0.05); ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 36 * api.scale; ctx.shadowOffsetY = 14 * api.scale;
    const W = pw + bx * 2, Hh = ph + bx + bb;
    ctx.fillStyle = '#f4f1ea'; ctx.fillRect(-W / 2, -Hh / 2, W, Hh); ctx.shadowColor = 'transparent';
    ctx.save(); ctx.beginPath(); ctx.rect(-W / 2 + bx, -Hh / 2 + bx, pw, ph); ctx.clip();
    R.cover(ctx, api.image('im'), -W / 2 + bx, -Hh / 2 + bx, pw, ph, 0.5, 0.45, 1.02 + 0.03 * (t / end));
    // print finish: a touch of warmth and a soft sheen
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,214,170,0.35)'; ctx.fillRect(-W / 2, -Hh / 2, W, Hh);
    ctx.globalCompositeOperation = 'source-over';
    R.flash(ctx, t, t0, { peak: 0.95, dur: 0.22, rect: [-W / 2, -Hh / 2, W, Hh] });
    ctx.restore();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = api.clamp(pin) * (1 - out);
    R.source(ctx, api, 'KU Leuven', { x: 112, y: 250 + Hh + 44, size: 20 });
    ctx.restore();
  },
});
