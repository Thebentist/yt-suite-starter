// @use videos/bad-breath-for-good/scenes/throat/_lib.js
// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js
/* flosser-a (words 3919-3983): "If you absolutely have to flush them out with water,"
 * 3D macro on the tonsil, two framings cut on "flush": the stone sitting in its pit; then a gentle stream of water
 * arcs in and rinses it out (FLUSH WITH WATER). Ends before "I would recommend", where Ben holds up the real device
 * on camera (flosser-card sits over that), and flosser-b picks up at "A normal water flosser". */
defineScene({
  name: 'flosser-a',
  anchor: { word: 3919, offset: -0.15 },
  anchorEnd: { word: 3984, offset: -0.15 },
  tail: 0.5,
  setup(api) { this.ton = window.THROAT3D.world3(api, 'TONSIL', { steps: 140 }); },
  draw(ctx, t, api) {
    const TH = window.THROAT, T3 = window.THROAT3D, { P, prog, pop, ease, clamp, lerp } = api;
    const tFlush = api.at(3924), tWater = api.at(3928);
    const cr = T3.CRYPTS3[3];
    const first = t < tFlush;
    const k = ease.inOutSine(clamp(first ? t / tFlush : (t - tFlush) / Math.max(0.5, api.duration - tFlush)));
    const c = first ? { ro: [lerp(0.9, 0.75, k), lerp(1.3, 1.15, k), lerp(-1.9, -1.7, k)], ta: [cr[0] - 0.2, -0.05, cr[1] - 0.1], fov: 1.75 }
      : { ro: [lerp(2.3, 2.15, k), lerp(1.2, 1.1, k), lerp(-1.6, -1.45, k)], ta: [cr[0] - 0.1, -0.05, cr[1]], fov: 1.75 };
    const out = prog(t, tFlush + 0.35, 1.1, ease.inQuad);
    T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, { uHead: 0.3, uWet: first ? 0.4 : 1, uS0: [cr[0] + 1.2 * out, -0.02 + 0.5 * out - 0.2 * out * out, cr[1] + 0.9 * out, 0.15] });
    if (first) {
      const [sx, sy] = T3.project(c.ro, c.ta, c.fov, [cr[0], 0.02, cr[1]]);
      api.doodle.circle(ctx, sx, sy, 105, 80, prog(t, 0.25, 0.5, ease.inOutCubic), { color: P.marker, width: 10, seed: 5 });
      api.doodle.text(ctx, 'if you absolutely have to...', 960, 900, prog(t, api.at(3921) - 0.1, 0.8, ease.linear), { color: P.lime, size: 70, align: 'center', rotate: -0.03, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
    } else {
      const [ex, ey] = T3.project(c.ro, c.ta, c.fov, [cr[0], 0, cr[1]]);
      stream(ctx, -60, 260, ex - 20, ey - 10, 34, t, prog(t, tFlush - 0.1, 0.4));
      TH.chip(ctx, api, 'FLUSH WITH WATER', null, null, 1380, 900, pop(t, tWater - 0.25, 0.5), { size: 60, bg: '#8fd8ff' });
    }
    T3.bokeh(ctx, t, 97, 6, 0.8);
    T3.artistic(ctx, api);
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });

    function stream(ctx, x0, y0, x1, y1, w, t, p) {
      if (p <= 0) return;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 140, ex = x0 + (x1 - x0) * p, ey = y0 + (y1 - y0) * p, cx = x0 + (mx - x0) * p, cy = y0 + (my - y0) * p;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(143,216,255,0.22)'; ctx.lineWidth = w * 2.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,222,255,0.75)'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      ctx.setLineDash([w * 1.2, w * 3]); ctx.lineDashOffset = -t * 160;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(2, w * 0.28); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      ctx.restore();
      if (p >= 1) { ctx.save(); ctx.strokeStyle = 'rgba(210,240,255,0.6)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { const q = (t * 0.9 + i / 3) % 1; ctx.globalAlpha = 1 - q; ctx.beginPath(); ctx.ellipse(ex, ey, 20 + w * 1.6 * q, 8 + w * 0.6 * q, 0.2, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); }
    }
  },
});
