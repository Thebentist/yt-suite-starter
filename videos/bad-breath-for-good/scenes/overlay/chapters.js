// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* chapters: one reusable chapter card, top-left, 3.0 s, lane 3 (above everything). Params { n: "01", title: "..." }.
 * Rendered once per chapter to scenes/out/chapter-NN.mov; each starts 0.15 s before its chapter's first word (plan.json,
 * written by make-plan.mjs from the `chapters` list below). A glass card opens out of a soft blur, a glowing lime bar
 * draws down, "CHAPTER NN" and then the title type in glyph by glyph, a hairline rule draws out, a big ghosted numeral
 * sits in the card for depth, one light sweep crosses it; on the way out the glyphs lift away and the card folds shut.
 */
defineScene({
  name: 'chapters', duration: 3.0, fps: 30, transparent: true,
  params: { n: '01', title: 'WHY YOU CAN\'T SMELL IT' },
  plan: { lane: 3 }, sfx: [{ t: 0.02, kind: 'whoosh-soft' }, { t: 0.3, kind: 'tick' }],
  chapters: [['01', 539, "WHY YOU CAN'T SMELL IT"], ['02', 930, 'THE BACK OF YOUR TONGUE'], ['03', 1390, 'THE OTHER SPOTS'],
    ['04', 1610, 'TONSIL STONES'], ['05', 1904, 'IS IT YOUR STOMACH?'], ['06', 2129, 'WHY NOTHING WORKED'], ['07', 2691, 'WHAT ACTUALLY WORKS'], ['08', 4373, 'FOR GOOD']],
  draw(ctx, t, api) {
    const { P, prog, ease } = api;
    const n = String(api.params.n), title = String(api.params.title).toUpperCase(), D = api.duration;
    const X = 60, Y0 = 50, padL = 50, ts = 66, ls = 26;
    const lf = { size: ls, weight: 700, tracking: 7 }, tf = { size: ts, weight: 700, tracking: 2 };
    const labelW = api.measure(ctx, 'CHAPTER ' + n, lf), titleW = api.measure(ctx, title, tf);
    const w = Math.max(titleW, labelW + 140) + padL + 52, h = 26 + ls + 16 + ts * 0.95 + 30;
    const out = prog(t, D - 0.62, 0.42, ease.inCubic), fold = prog(t, D - 0.36, 0.3, ease.inCubic);
    const open = prog(t, 0, 0.62, ease.outExpo) * (1 - fold);
    if (open <= 0) return;
    const x = X + t * 4, y = Y0 + (1 - prog(t, 0, 0.7, ease.outExpo)) * -16;
    OV.glassCard(ctx, api, x, y, w, h, { open, sweep: prog(t, 0.7, 1.1, ease.inOutSine), accent: [215, 243, 74], glow: 'rgba(124,92,255,0.35)', blur: 10 * (1 - prog(t, 0, 0.4, ease.outCubic)),
      draw: () => {
        // ghosted numeral for depth, anchored bottom-right, drifting a touch slower than the card (parallax)
        const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,0.13)'); g.addColorStop(1, 'rgba(255,255,255,0.02)');
        api.text(ctx, n, x + w - 22 - t * 3, y + h + 44, { size: 210, weight: 700, color: g, align: 'right', tracking: -4, alpha: prog(t, 0.2, 0.8) });
      } });
    ctx.save(); api.roundRect(ctx, x, y, Math.max(34, w * open), h, 16); ctx.clip();
    const bp = prog(t, 0.1, 0.45, ease.outCubic) * (1 - out);
    if (bp > 0) { ctx.save(); ctx.shadowColor = 'rgba(215,243,74,0.9)'; ctx.shadowBlur = 16; ctx.fillStyle = P.lime; ctx.fillRect(x + 22, y + 22, 5, (h - 44) * bp); ctx.restore(); }
    const ly = y + 26 + ls * 0.8;
    const cw = OV.charType(ctx, api, 'CHAPTER ', x + padL, ly, t - 0.14, { ...lf, color: 'rgba(244,241,234,0.62)', out, stagger: 0.014, dur: 0.36 });
    OV.charType(ctx, api, n, x + padL + cw, ly, t - 0.26, { ...lf, color: P.lime, out, stagger: 0.03, dur: 0.36 });
    const rp = prog(t, 0.42, 0.7, ease.inOutCubic) * (1 - out);
    if (rp > 0) { const rx = x + padL + labelW + 20, rw = w - (rx - x) - 34; const rg = ctx.createLinearGradient(rx, 0, rx + rw, 0); rg.addColorStop(0, 'rgba(244,241,234,0.45)'); rg.addColorStop(1, 'rgba(244,241,234,0)'); ctx.fillStyle = rg; ctx.fillRect(rx, ly - ls * 0.34, rw * rp, 1.5); }
    OV.charType(ctx, api, title, x + padL, y + 26 + ls + 16 + ts * 0.8, t - 0.3, { ...tf, out, stagger: 0.022 });
    ctx.restore();
  },
});
