// @use videos/bad-breath-for-good/scenes/tongue/_lib.js
/* coated-tongue (w1221-1270). "You can see it": a bathroom mirror, the tongue stuck out (same tongue as every other
 * shot), the coating appears and swaps colour on its words: WHITE, YELLOW, BLACK; then COATED TONGUE and an arrow:
 * THIS IS PROBABLY IT. Stylised, not gross.
 * Words (scene s, cut of 21:58): fun fact 0.49-0.89 | see it 1.48-1.63 | stick your tongue out 3.25-3.91 | super white 4.47-4.79 |
 * yellow 4.92 | black 6.49 | really crazy 7.82-7.97 | we call a coated tongue 9.15-10.10 (coated 10.07) |
 * probably 11.32, bad breath 12.31-12.63, coming from 12.90-13.24. Visible until 13.94 (w1270 end + 0.25). */
const CUT = TONGUE.cut('coated-tongue', 14.42);   // cues follow their words in the current cut (see cues.json)
defineScene({
  name: 'coated-tongue', duration: CUT.duration,
  setup(api) { this.T = TONGUE.build(api, { seed: 1 }); },
  draw(ctx, t, api) {
    t = CUT.warp(t);
    const { P, clamp, lerp, ease, prog, pop, env } = api, ss = TONGUE.sstep, T = this.T, L = TONGUE.L;
    api.stage(ctx, { gridOffset: [-t * 8, -t * 4] });
    // mirror
    const MX = 470, MY = 70, MW = 780, MH = 940, mIn = ease.outCubic(clamp(t / 0.7));
    ctx.save(); api.cam(ctx, t, { zoom0: 1.0, zoom1: 1.05, dur: 14.4, cx: 860, cy: 540 });
    ctx.translate(0, (1 - mIn) * 60); ctx.globalAlpha = clamp(mIn * 1.3);
    // bezel
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
    let g = ctx.createLinearGradient(MX, MY, MX + MW, MY + MH); g.addColorStop(0, '#eef1f6'); g.addColorStop(0.5, '#9aa2b1'); g.addColorStop(1, '#d9dde6');
    ctx.fillStyle = g; api.roundRect(ctx, MX - 22, MY - 22, MW + 44, MH + 44, 70); ctx.fill(); ctx.restore();
    ctx.save(); api.roundRect(ctx, MX, MY, MW, MH, 52); ctx.clip();
    // the reflection: lower face (skin), lips, mouth, tongue
    const My = 285, Mx = MX + MW / 2;
    g = ctx.createRadialGradient(Mx - 60, My + 160, 60, Mx, My + 250, 760); g.addColorStop(0, '#f1c4a6'); g.addColorStop(0.6, '#d99c7c'); g.addColorStop(1, '#8a5540');
    ctx.fillStyle = g; ctx.fillRect(MX, MY, MW, MH);
    // mouth: opening (dark), lower lip, the tongue coming out over it, upper teeth, upper lip
    const out = ease.inOutCubic(clamp((t - 3.1) / 0.95));
    const cL = [Mx - 310, My + 20], cR = [Mx + 310, My + 20];
    const topCurve = (c) => { c.moveTo(cL[0], cL[1]); c.bezierCurveTo(Mx - 190, My - 62, Mx + 190, My - 62, cR[0], cR[1]); };
    const botCurveBack = (c) => c.bezierCurveTo(Mx + 200, My + 150, Mx - 200, My + 150, cL[0], cL[1]);
    ctx.save(); ctx.beginPath(); topCurve(ctx); botCurveBack(ctx); ctx.closePath();
    g = ctx.createLinearGradient(0, My - 50, 0, My + 140); g.addColorStop(0, '#1e030b'); g.addColorStop(1, '#4e0c1d'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    // lower lip
    ctx.save(); ctx.beginPath(); ctx.moveTo(cR[0] + 18, cR[1]); ctx.bezierCurveTo(Mx + 230, My + 230, Mx - 230, My + 230, cL[0] - 18, cL[1]);
    ctx.bezierCurveTo(Mx - 200, My + 150, Mx + 200, My + 150, cR[0] + 18, cR[1]); ctx.closePath();
    g = ctx.createLinearGradient(0, My + 110, 0, My + 200); g.addColorStop(0, '#d86f7d'); g.addColorStop(1, '#a9495a');
    ctx.shadowColor = 'rgba(70,25,20,0.45)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10; ctx.fillStyle = g; ctx.fill(); ctx.restore();
    // the tongue, stuck out: root inside the mouth (clipped at the upper lip), tip over the chin
    const s = 0.86, Y = My - 30 + (0.35 * L) * s + lerp(-120, 0, out) + Math.sin(t * 1.3) * 3;
    const white = [243, 237, 224], yellow = [226, 196, 86], black = [44, 34, 26];
    const k1 = ss(4.92, 5.15, t), k2 = ss(6.45, 6.75, t), k3 = ss(9.3, 9.8, t);
    let col = TONGUE.mixRgb(white, yellow, k1), tint = lerp(0.2, 0.62, k1);
    col = TONGUE.mixRgb(col, black, k2); tint = lerp(tint, 0.86, k2);
    col = TONGUE.mixRgb(col, white, k3); tint = lerp(tint, 0.2, k3);
    const amt = Math.max(0.45 * ss(1.45, 2.3, t), ss(4.4, 4.8, t));
    ctx.save(); ctx.beginPath(); topCurve(ctx); ctx.lineTo(MX + MW + 50, My + 20); ctx.lineTo(MX + MW + 50, MY + MH + 50); ctx.lineTo(MX - 50, MY + MH + 50); ctx.lineTo(MX - 50, My + 20); ctx.closePath(); ctx.clip();
    this.tongueY = Y;
    TONGUE.draw(ctx, T, { x: Mx, y: Y, s, shadow: true, coat: { amount: amt, reach: lerp(0.35, 0.78, ss(1.45, 4.8, t)), color: col, tint } });
    // upper incisors hanging into the opening
    for (let k = -3; k <= 3; k++) {
      if (!k) continue; const ak = Math.abs(k), w = [0, 58, 50, 44][ak], xk = Mx + Math.sign(k) * [0, 31, 86, 134][ak], h = [0, 58, 50, 40][ak], y0 = My - 52 + ak * ak * 3;
      const tg = ctx.createLinearGradient(0, y0, 0, y0 + h); tg.addColorStop(0, '#cfc5b3'); tg.addColorStop(0.5, '#f4efe4'); tg.addColorStop(1, '#fffdf8');
      ctx.fillStyle = tg; api.roundRect(ctx, xk - w / 2 + 2, y0, w - 4, h, 11); ctx.fill();
    }
    ctx.restore();
    // upper lip with a cupid's bow
    ctx.save(); ctx.beginPath(); ctx.moveTo(cL[0] - 20, cL[1]);
    ctx.bezierCurveTo(Mx - 230, My - 88, Mx - 90, My - 118, Mx - 36, My - 104); ctx.quadraticCurveTo(Mx, My - 86, Mx + 36, My - 104);
    ctx.bezierCurveTo(Mx + 90, My - 118, Mx + 230, My - 88, cR[0] + 20, cR[1]);
    ctx.bezierCurveTo(Mx + 190, My - 50, Mx - 190, My - 50, cL[0] - 20, cL[1]); ctx.closePath();
    g = ctx.createLinearGradient(0, My - 110, 0, My - 40); g.addColorStop(0, '#b34f5f'); g.addColorStop(1, '#d67482');
    ctx.shadowColor = 'rgba(40,5,15,0.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(255,225,225,0.3)'; ctx.beginPath(); ctx.ellipse(Mx - 110, My - 80, 60, 9, -0.1, 0, 6.2832); ctx.fill(); ctx.beginPath(); ctx.ellipse(Mx + 120, My - 78, 50, 8, 0.1, 0, 6.2832); ctx.fill();
    // mirror glass: glints (a sweep on "see it"), edge darkening
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const sweep = prog(t, 1.45, 0.9, ease.inOutCubic);
    for (const [off, w, a] of [[0, 90, 0.22], [140, 36, 0.16]]) {
      const x0 = lerp(MX - 400, MX + MW + 300, sweep) + off;
      ctx.save(); ctx.translate(x0, MY); ctx.rotate(0.35); ctx.fillStyle = `rgba(255,255,255,${a * (sweep > 0 && sweep < 1 ? 1 : 0.25)})`; ctx.fillRect(0, -200, w, MH + 500); ctx.restore();
    }
    ctx.restore();
    g = ctx.createRadialGradient(Mx, MY + MH / 2, MH * 0.35, Mx, MY + MH / 2, MH * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,20,40,0.35)');
    ctx.fillStyle = g; ctx.fillRect(MX, MY, MW, MH);
    ctx.restore();   // mirror clip
    ctx.restore();   // cam

    // ---------------- labels on the right
    const sw = [['WHITE', '#f3ede0', 4.7], ['YELLOW', '#e2c456', 4.92], ['BLACK', '#3a2e24', 6.47]];
    const swOut = 1 - prog(t, 8.9, 0.35, ease.inCubic);
    const active = t < 4.92 ? 0 : t < 6.47 ? 1 : 2;
    api.doodle.text(ctx, 'fun fact:', 1570, 150, prog(t, 0.45, 0.6) * (1 - prog(t, 3.6, 0.3)), { color: P.ink, size: 58, align: 'center', rotate: -0.05 });
    if (swOut > 0) for (let i = 0; i < 3; i++) {
      const [name, c, tt] = sw[i], pp = pop(t, tt, 0.45); if (pp <= 0) continue;
      const y = 380 + i * 130, on = i === active, a = (on ? 1 : 0.4) * swOut;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(1340, y); ctx.scale(pp, pp);
      ctx.fillStyle = 'rgba(11,10,24,0.75)'; api.roundRect(ctx, 0, -48, 420, 96, 48); ctx.fill();
      if (on) { ctx.strokeStyle = P.lime; ctx.lineWidth = 4; api.roundRect(ctx, 0, -48, 420, 96, 48); ctx.stroke(); }
      const dg = ctx.createRadialGradient(40, -12, 4, 48, 0, 34); dg.addColorStop(0, '#ffffff'); dg.addColorStop(0.35, c); dg.addColorStop(1, c);
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(48, 0, 30, 0, 6.2832); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
      api.text(ctx, name, 100, 20, { size: 56, color: P.ink, tracking: 2 });
      ctx.restore();
    }
    // "really crazy" (7.45-7.89): marker shake-lines around BLACK
    const cz = env(t, 7.75, 8.9, 0.25, 0.3);
    if (cz > 0) { for (const [x1, y1, x2, y2, sd] of [[1790, 610, 1830, 590, 1], [1795, 650, 1840, 650, 2], [1790, 690, 1830, 710, 3]]) api.doodle.stroke(ctx, [[x1, y1], [x2, y2]], cz, { color: P.marker, width: 7, seed: sd }); }
    // COATED TONGUE on "coated" (9.62)
    const ct = pop(t, 10.02, 0.5);
    if (ct > 0) api.label(ctx, 'COATED TONGUE', 1560, 420, { size: 64, p: ct, align: 'center' });
    // THIS IS PROBABLY IT on "probably" (11.33), arrow into the coating
    const ar = prog(t, 11.15, 0.6, ease.inOutCubic);
    if (ar > 0) {
      const zc = 1 + 0.05 * ease.inOutSine(clamp(t / 14.4)), cyT = this.tongueY + (TONGUE.L / 2 - 0.63 * TONGUE.L) * 0.86, tx = 860, ty = 540 + (cyT - 540) * zc;
      api.doodle.arrow(ctx, 1450, 640, tx + 150, ty + 60, ar, { color: P.marker, width: 11, bend: -70, seed: 17, head: 40 });
      api.doodle.circle(ctx, tx, ty, 230, 135, prog(t, 11.45, 0.7, ease.inOutCubic), { color: P.marker, width: 10, seed: 23 });
    }
    const pi = pop(t, 11.32, 0.5);
    if (pi > 0) api.label(ctx, 'THIS IS PROBABLY IT', 1560, 720, { size: 50, p: pi, align: 'center', bg: P.marker, color: '#ffffff' });
    api.vignette(ctx, 0.5);
    api.grain(ctx, t, 0.055);
  },
});

