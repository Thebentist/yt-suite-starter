// Transparent doodle overlay test: soft glow, marker circle, arrow, hand text
defineScene({
  name: '_test-alpha', duration: 3, transparent: true,
  draw(ctx, t, api) {
    const { P, prog, ease } = api;
    api.doodle.circle(ctx, 960, 480, 300, 200, prog(t, 0.2, 0.9, ease.inOutCubic), { color: P.marker, width: 12, glow: 'rgba(255,60,60,0.6)' });
    api.doodle.arrow(ctx, 400, 900, 700, 620, prog(t, 0.8, 0.8, ease.inOutCubic), { color: P.lime, width: 10 });
    api.doodle.text(ctx, 'the back!', 300, 980, prog(t, 1.3, 0.9), { color: P.lime, size: 90, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 12 });
    api.label(ctx, 'tongue coating', 1300, 800, { p: api.pop(t, 1.6), size: 48 });
  },
});
