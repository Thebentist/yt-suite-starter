// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* mile-away (words 1753-1757: "...tonsil stones a mile away"). Phase 2: sits over micro3d/tonsilstone3d (a 3D tonsil
 * stone in macro) instead of Ben, so the marker doodle became a clean measurement graphic on the right third: on "a" a
 * glowing dimension line runs from the stone's side (x ~1190) to the right, end ticks snap on, "1 MILE" types in on
 * "mile", and on "away" a white line-art nose appears at the far end, sniffing back toward the stone while faint gas
 * wisps travel along the line. Ends where ct-study (full screen) starts (word 1778 - 0.15).
 */
defineScene({
  name: 'mile-away', fps: 30, transparent: true,
  anchor: { word: 1753, offset: -0.15 }, anchorEnd: { word: 1778, offset: -0.15 }, tail: 0.5,
  plan: { lane: 2 }, sfx: [{ w: 1755, kind: 'whoosh-soft', d: -0.05 }, { w: 1756, kind: 'tick' }, { w: 1757, kind: 'scribble-short' }],
  draw(ctx, t, api) {
    const { P, prog, ease, clamp, lerp } = api;
    const END = OV.endT(api, this.anchorEnd), out = prog(t, END - 0.32, 0.28, ease.inCubic);
    const x0 = 1190, x1 = 1742, y = 600, ta = api.at(1755) - 0.05;
    const lp = prog(t, ta, 0.55, ease.outExpo) * (1 - out);
    if (lp <= 0) return;
    ctx.save(); ctx.globalAlpha *= 1 - out * 0.6;
    // gas wisps drifting along the line toward the nose (behind the line)
    for (let k = 0; k < 7; k++) {
      const ph = ((t - ta) * 0.32 + k / 7) % 1; if (t < ta + 0.3) continue;
      const px = lerp(x0 + 20, x1 - 70, ph), py = y - 6 + Math.sin(ph * 9 + k) * 12;
      api.icons.puff(ctx, px, py, 34 + 10 * Math.sin(k * 2.1), 0.22 * Math.sin(ph * Math.PI) * lp, P.gas);
    }
    // the dimension line: glowing, dashed, crawling toward the nose
    const xe = lerp(x0, x1, lp);
    ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(255,255,255,0.75)'; ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3; ctx.setLineDash([14, 12]); ctx.lineDashOffset = -(t - ta) * 60;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xe, y); ctx.stroke(); ctx.setLineDash([]);
    // end ticks + an origin dot at the stone
    const tk = prog(t, ta + 0.1, 0.3, ease.outBack);
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y - 24 * tk); ctx.lineTo(x0, y + 24 * tk); ctx.stroke();
    const te = prog(t, ta + 0.45, 0.3, ease.outBack);
    if (te > 0) { ctx.beginPath(); ctx.moveTo(x1, y - 24 * te); ctx.lineTo(x1, y + 24 * te); ctx.stroke(); }
    ctx.fillStyle = P.lime; ctx.shadowColor = 'rgba(215,243,74,0.9)'; ctx.beginPath(); ctx.arc(x0, y, 7 * tk, 0, 7); ctx.fill();
    ctx.restore();
    // label: "1 MILE" types in on "mile", lime numeral
    const tm = api.at(1756) - 0.04, lf = { size: 58, weight: 700, tracking: 8 };
    const lw = api.measure(ctx, '1 MILE', lf), lx = (x0 + x1) / 2 - lw / 2 + 20, ly = y - 34;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 16;
    const w1 = OV.charType(ctx, api, '1 ', lx, ly, t - tm, { ...lf, color: P.lime, glow: 'rgba(215,243,74,0.6)', out, stagger: 0.03 });
    OV.charType(ctx, api, 'MILE', lx + w1, ly, t - tm - 0.06, { ...lf, color: '#ffffff', out, stagger: 0.03 });
    ctx.restore();
    // the nose at the far end, facing back toward the stone
    OV.noseLine(ctx, api, x1 + 70, y + 8, 70, prog(t, api.at(1757) - 0.05, 0.45, ease.linear) * (1 - out), { dir: -1, width: 4.5 });
    ctx.restore();
  },
});
