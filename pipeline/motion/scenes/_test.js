// Kitchen-sink test of the runtime: stage, grid drift, big number, chip label, doodles, bacteria, H2S, grain.
defineScene({
  name: '_test',
  duration: 4,
  draw(ctx, t, api) {
    const { P, ease, prog, pop } = api;
    api.stage(ctx, { gridOffset: [-t * 12, -t * 6] });
    ctx.save(); api.cam(ctx, t, { zoom0: 1, zoom1: 1.05, dur: 4 });
    // icon array: 1 in 3
    const n = 30;
    for (let i = 0; i < n; i++) {
      const col = i % 10, row = Math.floor(i / 10), x = 360 + col * 90, y = 330 + row * 150;
      const p = prog(t, 0.2 + i * 0.02, 0.4, ease.outBack);
      ctx.save(); ctx.globalAlpha = api.clamp(p); ctx.translate(x, y); ctx.scale(p, p);
      api.icons.person(ctx, 0, 0, 90, i % 3 === 0 && t > 1.4 ? P.lime : 'rgba(244,241,234,0.35)'); ctx.restore();
    }
    api.text(ctx, '1 IN 3', 1500, 520, { size: 190, weight: 700, color: P.ink, align: 'center', alpha: prog(t, 1.4, 0.5) });
    api.label(ctx, 'people have bad breath', 1500, 600, { size: 40, align: 'center', p: pop(t, 1.7) });
    api.doodle.circle(ctx, 1500, 450, 230, 120, prog(t, 2.2, 0.8, ease.inOutCubic), { color: P.marker, width: 10, seed: 4 });
    api.doodle.arrow(ctx, 1210, 820, 1370, 620, prog(t, 2.6, 0.7, ease.inOutCubic), { color: P.lime, width: 9, bend: -60 });
    api.doodle.text(ctx, 'that\'s a lot!', 1080, 880, prog(t, 2.9, 0.8), { color: P.lime, size: 64 });
    for (let k = 0; k < 4; k++) api.icons.bacterium(ctx, 260 + k * 110, 900 + Math.sin(t * 3 + k) * 10, 60, t + k, { rot: Math.sin(t + k) * 0.4, rod: k % 2 === 0 });
    api.icons.h2s(ctx, 780, 900, 70, t * 0.8);
    api.icons.puff(ctx, 900 + t * 30, 880 - t * 20, 120, 0.45);
    ctx.restore();
    api.vignette(ctx, 0.5);
    api.grain(ctx, t, 0.07);
  },
});
