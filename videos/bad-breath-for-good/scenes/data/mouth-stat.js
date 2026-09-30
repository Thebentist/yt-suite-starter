// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
/* mouth-stat (words 439-464): "And more than likely, it's actually your mouth, like eight or nine times out of ten.
 * It's gonna be your mouth rather than something you ate."
 * Three shots on the words: a macro on one glass token (a neon mouth) lighting on "your mouth" -> the ten tokens on a
 * data floor, eight light as the counter ticks, the ninth half on "nine", "/ 10" on "ten" -> a glowing ring gauge:
 * the 80-90% arc is the mouth, the rest is "something you ate" (a stomach), chip STARTS IN YOUR MOUTH.
 * Source: Memon et al., Oral Diseases 2023, systematic review: 80-90% intra-oral (research-notes row 2).
 */
let DATA, T, SHOTS;

defineScene({
  name: 'mouth-stat',
  anchor: { word: 439, offset: -0.15 },
  anchorEnd: { word: 465, offset: -0.15 },
  tail: 0.1,                                   // a few frames past the handoff (the assembler trims)
  setup(api) {
    DATA = window.DATA.init(api);
    T = { mouth: api.at(446), eight: api.at(448), nine: api.at(450), ten: api.at(454), its: api.at(455), mouth2: api.at(459), rather: api.at(460), ate: api.at(462) };
    SHOTS = [0, T.eight - 0.22, T.its - 0.08];
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    const sh = DATA.shot(t, SHOTS), lt = sh.lt;
    const bgG = ctx.createLinearGradient(0, 0, 0, 1080); bgG.addColorStop(0, '#08071a'); bgG.addColorStop(0.6, '#110e2b'); bgG.addColorStop(1, '#09081a');
    ctx.fillStyle = bgG; ctx.fillRect(0, 0, 1920, 1080);
    const lips = DATA.glyph.lips, stomach = DATA.glyph.stomach;

    if (sh.i === 0) {
      // ---- macro on one token; the other nine out of focus behind
      DATA.glow(ctx, 960, 520, 900, P.purple, 0.14);
      DATA.blurLayer(ctx, 14, (g) => { for (let i = 0; i < 6; i++) { const x = 200 + i * 330 + Math.sin(i) * 40 - t * 20, y = 360 + (i % 2) * 120; DATA.token(g, x, y, 120, lips, 0, P.lime, { alpha: 0.7 }); } });
      const lit = prog(t, T.mouth - 0.1, 0.4), s = 1 + t * 0.035;
      DATA.token(ctx, 960 + t * 8, 560, 250 * s, lips, lit, P.lime);
      DATA.caps(ctx, 'your mouth', 960, 900, { size: 56, align: 'center', color: P.lime, alpha: prog(t, T.mouth, 0.4), tracking: 10 });
      DATA.bokeh(ctx, t, { n: 8, seed: 'ms-bk', alpha: 0.12, size: [160, 360], colors: [P.lavender, P.lime] });
    } else if (sh.i === 1) {
      // ---- ten tokens on the data floor
      const cam = DATA.cam3({ pos: [0.6 - lt * 0.15, 1.9 - lt * 0.04, -10.5 + lt * 0.25], target: [0, 0.9, 0], f: 1450 });
      DATA.glow(ctx, 960, 620, 1100, P.purple, 0.14);
      DATA.floorGrid(ctx, cam, { step: 0.7, x: [-10, 10], z: [-3, 16], fog: 22, alpha: 0.28, color: '#7a6cff', wRef: 170 });
      for (let i = 0; i < 10; i++) {
        const q = cam.project((i - 4.5) * 1.12, 0.62, 0), f = cam.project((i - 4.5) * 1.12, 0, 0); if (!q) continue;
        const k = pop(t, SHOTS[1] + i * 0.03, 0.4), r = 0.5 * q.s * k;
        const lit = i < 8 ? prog(t, T.eight + i * 0.05, 0.22) : i === 8 ? prog(t, T.nine, 0.3) * 0.5 : 0;
        if (f) DATA.lightPool(ctx, f.x, f.y, r * 1.4, r * 0.35, lit > 0 ? P.lime : P.lavender, 0.25 * (0.3 + lit));
        if (i === 8 && lit > 0) {
          DATA.glow(ctx, q.x - r * 0.4, q.y, r * 1.8, P.lime, 0.2);
          DATA.token(ctx, q.x, q.y, r, lips, 0, P.lime);
          ctx.save(); ctx.beginPath(); ctx.arc(q.x, q.y, r * 1.02, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.clip(); DATA.token(ctx, q.x, q.y, r, lips, 1, P.lime); ctx.restore();
        } else DATA.token(ctx, q.x, q.y, r, i === 9 ? stomach : lips, lit, P.lime, { alpha: i === 9 ? 0.75 : 1 });
      }
      // the counter
      const nLit = Math.max(0, Math.min(8, Math.floor((t - T.eight) / 0.05) + 1));
      if (t >= T.eight) {
        const main = t < T.nine ? String(nLit) : '8–9', sz = 230;
        const mw = api.measure(ctx, main, { size: sz, weight: 700, tracking: -1 }), sw = t >= T.ten ? api.measure(ctx, ' / 10', { size: 140, weight: 700 }) : 0;
        const x0 = 960 - (mw + sw * prog(t, T.ten, 0.4, ease.outCubic)) / 2, y = 330;
        DATA.big(ctx, main, x0, y, { size: sz, align: 'left', noScale: true, glow: 'rgba(215,243,74,0.4)' });
        if (t >= T.ten) api.text(ctx, ' / 10', x0 + mw, y, { size: 140, weight: 700, color: P.dim, alpha: clamp(pop(t, T.ten, 0.45) * 1.5) });
      }
    } else {
      // ---- the ring gauge: 80-90% mouth, the rest "something you ate"
      const cx = 700, cy = 540, R = 330, s = 1 + lt * 0.03;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
      DATA.glow(ctx, cx, cy, 700, P.lime, 0.1);
      // tick marks around the dial
      for (let i = 0; i < 100; i++) { const a = -Math.PI / 2 + (i / 100) * Math.PI * 2, big = i % 10 === 0; ctx.strokeStyle = big ? 'rgba(244,241,234,0.45)' : 'rgba(244,241,234,0.14)'; ctx.lineWidth = big ? 3 : 1.5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R + 46), cy + Math.sin(a) * (R + 46)); ctx.lineTo(cx + Math.cos(a) * (R + (big ? 70 : 58)), cy + Math.sin(a) * (R + (big ? 70 : 58))); ctx.stroke(); }
      const p = prog(t, SHOTS[2], 0.9, ease.inOutCubic);
      ctx.save(); ctx.lineWidth = 64; ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      const arc = (a0, a1, col, w, al = 1) => DATA.arcBar(ctx, cx, cy, R, a0, a1, col, w, { alpha: al, glow: 26 });
      arc(0.002, 0.8 * p, P.lime, 58);
      // the 80-90 band: striped
      const b = clamp((p - 0.8) / 0.1) * 0.1;
      if (b > 0) { for (let k = 0; k < 10; k++) { const a0 = 0.8 + k * 0.01 + 0.001, a1 = Math.min(0.8 + b, a0 + 0.0055); arc(a0, a1, P.lime, 58, 0.55); } }
      const rest = prog(t, T.rather, 0.6, ease.inOutCubic);
      arc(0.906, 0.906 + 0.09 * rest, P.orange, 30, 0.9);
      DATA.big(ctx, '8–9', cx, cy + 10, { size: 190, glow: 'rgba(215,243,74,0.35)', p: pop(t, SHOTS[2] + 0.1, 0.5) });
      DATA.caps(ctx, 'in 10', cx, cy + 90, { size: 52, align: 'center', color: P.dim, tracking: 8, alpha: prog(t, SHOTS[2] + 0.3, 0.4) });
      // stomach marker on the remainder
      if (rest > 0) { const a = -Math.PI / 2 + 0.95 * Math.PI * 2, x = cx + Math.cos(a) * (R + 150), y = cy + Math.sin(a) * (R + 150) + 20;
        ctx.save(); ctx.globalAlpha *= rest; DATA.neon(ctx, () => { ctx.save(); ctx.translate(x, y); stomach(ctx, 70); ctx.restore(); }, P.orange, 4); ctx.restore(); }
      ctx.restore();
      // right side: labels
      DATA.chip(ctx, t, 'STARTS IN YOUR MOUTH', 1440, 430, T.mouth2 - 0.05, { size: 60 });
      const ra = prog(t, T.ate, 0.5);
      if (ra > 0) { DATA.caps(ctx, 'rather than', 1440, 560, { size: 34, align: 'center', color: P.dim, alpha: ra, tracking: 6 }); DATA.caps(ctx, 'something you ate', 1440, 620, { size: 50, align: 'center', color: P.orange, alpha: ra, tracking: 4 }); }
    }
    DATA.source(ctx, t, 'Memon et al., Oral Diseases 2023 · systematic review: 80–90% of bad breath has a cause inside the mouth', { at: 0.5 });
    DATA.finish(ctx, t);
  },
});
