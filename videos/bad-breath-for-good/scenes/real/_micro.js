/* Shared layout for the micrograph punches (loaded after _lib.js): the microscope field on the right, a label block on
 * the left with a leader into the field, a scale bar when the real scale is known, viewfinder brackets, "REAL IMAGE"
 * top-right, SOURCE bottom-left, a shutter flash on entry.   window.MICRO.draw(ctx, t, api, im, o)
 */
window.MICRO = {
  draw(ctx, t, api, im, o) {
    const R = REAL, { ease, prog } = api;
    // fast push already underway on frame 1: the field arrives zoomed out and snaps in, the focus pull starts half-sharp
    const entry = prog(t + 0.05, 0, 0.42, ease.outExpo);
    const f = R.scope(ctx, api, t, im, { cx: 1196, cy: 540, r: 452, ...o.scope, zoomMul: (o.scope.zoomMul ?? 1) * (0.8 + 0.2 * entry), blur: (o.scope.blur ?? 14) * 0.55, focusDur: 0.32 });
    const at = o.labelAt ?? 0.16, lp = api.pop(t, at, 0.45);
    if (lp > 0) {
      const lx = 124, ly = 452, size = 50;
      const lab = api.label(ctx, o.label, lx, ly, { p: lp, size });
      const a = api.clamp(lp);
      if (o.sub) api.text(ctx, o.sub, lx + 2, ly + 84, { size: 36, weight: 700, color: 'rgba(244,241,234,0.9)', tracking: 1.5, alpha: a });
      if (o.sub2) api.text(ctx, o.sub2, lx + 2, ly + 128, { size: 28, weight: 600, color: 'rgba(244,241,234,0.55)', tracking: 1.5, alpha: a });
      const ang = o.leadAngle ?? Math.PI * 1.02, ax = f.cx + Math.cos(ang) * (f.R - 30), ay = f.cy + Math.sin(ang) * (f.R - 30);
      api.leader(ctx, ax, ay, lx + lab.w + 18, ly, prog(t, at + 0.08, 0.3, ease.outCubic), { color: 'rgba(244,241,234,0.8)', width: 2.5, dot: 7 });
    }
    if (o.bar) R.scaleBar(ctx, api, f.cx + f.R * 0.62, f.cy + f.R * 0.74, o.bar.px * f.sc, o.bar.label, { size: 30 });
    R.brackets(ctx, { color: 'rgba(255,255,255,0.5)', width: 3, len: 56 });
    R.tag(ctx, api, o.tag || 'REAL IMAGE');
    R.source(ctx, api, o.source);
    R.flash(ctx, t, -0.03, { peak: 0.3, dur: 0.12 });
    if (o.stepAt != null) R.flash(ctx, t, o.stepAt, { peak: 0.22, dur: 0.1 });
  },
};
