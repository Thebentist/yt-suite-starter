// @use videos/bad-breath-for-good/scenes/real/_lib.js
/* micro-tonsil (throat-trip -> crypts, words 1630-1633): "...the tonsil stones. You see, your tonsils..."
 * Transparent inset (lane 3) on the right of the throat cross-section, which keeps its own drawn stone and circle on the
 * left: a real photo of an extracted tonsil stone next to a centimetre ruler (Wikimedia Commons, public domain) pops
 * in like a snapshot on "stones" and clears early in crypts, before "little holes".
 */
defineScene({
  name: 'micro-tonsil', fps: 30, transparent: true,
  anchor: { word: 1630, offset: -0.08 }, anchorEnd: { word: 1633, offset: 0.55 }, tail: 0.3,
  assets: { im: REAL.img('micro-tonsil-stone-ruler.jpg') },
  draw(ctx, t, api) {
    const R = REAL, { ease, prog } = api, end = api.duration - 0.3;
    const pin = api.pop(t, -0.07, 0.4), out = prog(t, end - 0.3, 0.28, ease.inCubic);
    if (pin <= 0 || out >= 1) return;
    const cx = 1545, cy = 430, w = 560, h = 424, sc = (0.86 + 0.14 * Math.min(1.05, pin)) * (1 - 0.08 * out);
    ctx.save(); ctx.globalAlpha = api.clamp(pin * 1.8) * (1 - out);
    ctx.translate(cx, cy); ctx.rotate(0.028 - 0.012 * api.clamp(pin)); ctx.scale(sc, sc);
    // the print: white border, shadow
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40 * api.scale; ctx.shadowOffsetY = 14 * api.scale;
    ctx.fillStyle = '#f4f1ea'; ctx.fillRect(-w / 2 - 14, -h / 2 - 14, w + 28, h + 28); ctx.shadowColor = 'transparent';
    ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
    const z = 1.04 + 0.06 * (t / end);
    R.cover(ctx, api.image('im'), -w / 2, -h / 2, w, h, 0.47, 0.5, z);
    R.flash(ctx, t, -0.07, { peak: 0.9, dur: 0.2, rect: [-w / 2, -h / 2, w, h] });
    ctx.restore();
    R.brackets(ctx, { x: -w / 2 + 16, y: -h / 2 + 16, w: w - 32, h: h - 32, len: 34, width: 3, color: 'rgba(255,255,255,0.85)' });
    ctx.restore();
    // label above, credit below
    const lp = api.pop(t, 0.16, 0.4) * (1 - out);
    if (lp > 0) api.label(ctx, 'A real tonsil stone', cx - w / 2 - 6, cy - h / 2 - 56, { p: lp, size: 44, rotate: 0.02 });
    ctx.save(); ctx.globalAlpha = api.clamp(pin) * (1 - out);
    R.source(ctx, api, 'Wikimedia Commons (public domain)', { x: cx - w / 2 + 6, y: cy + h / 2 + 64, size: 20 });
    ctx.restore();
  },
});
