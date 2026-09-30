// @use videos/bad-breath-for-good/scenes/micro/_lib.js
// anaerobes · words 1046-1103 (3:20.2-3:33.4). "And guess what? The bacteria, they absolutely love it down there. And fun fact,
// they're the kind that actually don't even like oxygen. And guess what? Not a lot of oxygen down there. So technically it's
// the perfect spot for those bacteria to live."
// Bacteria swim down into the deep gap between the papillae and settle happily at the bottom; ANAEROBIC; blue O2 drifts at the
// top and never reaches the bottom; the colony glows: THE PERFECT SPOT. Hands off to protein-sulfur at scene time 13.24.
(function () {
  const CUT = MICRO.cut(1046, 1103, 1104);   // word timing + render length from the current cut
  let T, CAM;   // word times (read from the current cut in setup)
  // colony: rest spot + where each one swims in from
  const COL = [
    { kind: 'rod', x: 862, y: 970, s: 104, rot: 0.08, sx: 760, sy: -120, t0: 1.05, t1: 3.05, ph: 0.2 },
    { kind: 'cocc', x: 930, y: 986, s: 80, rot: -0.2, sx: 1010, sy: -60, t0: 1.15, t1: 3.2, ph: 1.1 },
    { kind: 'rod2', x: 992, y: 968, s: 100, rot: -0.14, sx: 900, sy: -200, t0: 1.0, t1: 3.3, ph: 2.3 },
    { kind: 'rod', x: 1058, y: 980, s: 96, rot: 0.08, flip: true, sx: 1180, sy: -90, t0: 1.25, t1: 3.35, ph: 3.1 },
    { kind: 'cocc', x: 1106, y: 990, s: 70, rot: 0.3, sx: 1250, sy: 40, t0: 1.4, t1: 3.45, ph: 4.2 },
    { kind: 'rod', x: 915, y: 928, s: 88, rot: 0.32, sx: 820, sy: -40, t0: 1.5, t1: 3.5, ph: 5.3 },
    { kind: 'cocc', x: 1022, y: 930, s: 74, rot: -0.3, sx: 1080, sy: -160, t0: 1.6, t1: 3.55, ph: 0.7 },
    { kind: 'rod', x: 520, y: 978, s: 96, rot: 0.12, sx: 470, sy: -80, t0: 1.2, t1: 3.4, ph: 1.9 },
    { kind: 'cocc', x: 578, y: 990, s: 72, rot: 0.2, sx: 610, sy: -30, t0: 1.45, t1: 3.6, ph: 2.9 },
    { kind: 'rod2', x: 1392, y: 976, s: 96, rot: -0.12, flip: true, sx: 1420, sy: -110, t0: 1.3, t1: 3.5, ph: 3.7 },
    { kind: 'cocc', x: 1452, y: 990, s: 70, rot: -0.2, sx: 1500, sy: 0, t0: 1.55, t1: 3.65, ph: 4.8 },
  ];
  let O2s;

  defineScene({
    name: 'anaerobes', duration: CUT.dur,
    async setup(api) {
      const M = MICRO.init(api), W = CUT.W;
      T = { bacteria: W(1050), love: W(1053), there: W(1056), kind: W(1076), dont: W(1079), oxygen: W(1082), and2: W(1083), guess: W(1084), not: W(1086), oxygen2: W(1090), downThere: W(1091), so: W(1093), perfect: W(1097), spot: W(1098), live: W(1103) };
      CAM = [
        { t: 0, x: 965, y: 470, z: 1.0 },
        { t: T.bacteria - 0.14, x: 965, y: 500, z: 1.04 },
        { t: T.there + 0.11, x: 965, y: 760, z: 1.45 },
        { t: T.there + 0.81, x: 965, y: 770, z: 1.48 },
        { t: T.oxygen + 0.16, x: 965, y: 470, z: 0.9 },
        { t: T.so - 0.2, x: 965, y: 455, z: 0.87 },
        { t: T.perfect + 0.17, x: 965, y: 800, z: 1.62 },
        { t: 14.2, x: 965, y: 815, z: 1.72 },
      ];
      const dB = T.bacteria - 1.34; COL.forEach((b) => { b.t0 += dB; b.t1 += dB; });
      const r = api.rand('an-o2');
      O2s = Array.from({ length: 20 }, (_, i) => ({ x: 200 + ((i * 0.618) % 1) * 1560 + r() * 60, y: -150 + r() * 250, ph: r() * 6.28, sp: 0.4 + r() * 0.5, dive: 0, t0: T.and2 - 0.15 + i * 0.04, rot: r() * 6.28, s: 60 + r() * 18 }));
      O2s.forEach((m, i) => { if (i % 3 === 1 && m.x > 820) m.dive = 220 + r() * 150; });
    },
    draw(ctx, t, api) {
      const M = MICRO, { P, ease, clamp, lerp, prog, pop, env } = api;
      const cam = M.camAt(t, CAM);
      M.crevice(ctx, t, cam, {});

      ctx.save(); M.applyCam(ctx, cam, 1);
      // oxygen-rich air above the tips (blue tint), from "guess what"
      const oxy = prog(t, 7.2, 1.0);
      if (oxy > 0) {
        const g = ctx.createLinearGradient(0, -500, 0, 420); g.addColorStop(0, `rgba(120,200,255,${0.2 * oxy})`); g.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = g; ctx.fillRect(-1600, -900, 5200, 1320);
      }
      // cosy glow around the colony: the perfect spot
      const cosy = prog(t, T.perfect - 0.1, 0.9);
      if (cosy > 0) { M.blob(ctx, 'lime', 975, 960, 330, 0.3 * cosy * (0.9 + 0.1 * Math.sin(t * 3))); M.blob(ctx, 'amber', 975, 975, 220, 0.25 * cosy); }
      // the colony
      COL.forEach((b, i) => {
        const sw = M.swim(t, b);
        if (t < b.t0) return;
        const settled = t > b.t1, idle = settled ? Math.sin(t * 2.2 + b.ph) * 0.04 : 0;
        if (settled || sw.u > 0.8) M.shadow(ctx, b.x, b.y + b.s * 0.27, b.s * 0.5, 0.5 * clamp((sw.u - 0.8) / 0.2));
        M.bug(ctx, sw.x, sw.y, b.s, t, { kind: b.kind, flip: b.flip, rot: sw.rot + (settled ? Math.sin(t * 1.1 + b.ph) * 0.05 : 0), squash: sw.squash + idle, phase: b.ph, seed: i, eyes: true, smile: settled ? 1 : 0.6, flagellaAmp: settled ? 0.6 : 1.4, eyeSquint: t > T.love - 0.1 && t < T.there + 0.8 ? 0.55 : 1 });
      });
      // O2 molecules: drift at the top, the divers turn back before the bottom
      for (const m of O2s) {
        const a = pop(t, m.t0, 0.45); if (a <= 0) continue;
        const u = t - m.t0;
        const dive = m.dive ? m.dive * Math.sin(clamp(u / 2.6) * Math.PI) : 0;
        const x = m.x + Math.sin(t * m.sp + m.ph) * 40, y = m.y + Math.cos(t * m.sp * 0.8 + m.ph) * 26 + dive;
        M.o2(ctx, x, y, m.s * a, m.rot + t * 0.5 * (m.ph > 3 ? 1 : -1), { glow: 0.3 });
      }
      ctx.restore();
      M.creviceFront(ctx, t, cam, {});

      // ---------- screen-space type
      // hearts over the settling colony
      COL.slice(0, 7).forEach((b, i) => {
        const ht = T.love + 0.1 + i * 0.12, hp = pop(t, ht, 0.4), fade = 1 - prog(t, ht + 1.4, 0.4);
        if (hp <= 0 || fade <= 0) return;
        const [sx, sy] = M.toScreen(cam, b.x, b.y - b.s * 0.45);
        M.heart(ctx, sx + (i % 2 ? 14 : -10), sy - 30 - (t - ht) * 40, 44 * hp * cam.z * 0.8, { alpha: fade, rot: (i % 2 ? 0.2 : -0.2) + Math.sin(t * 3 + i) * 0.1 });
      });
      // ANAEROBIC / DON'T LIKE OXYGEN
      const lab = 1 - prog(t, T.so - 0.27, 0.35, ease.inCubic);
      if (lab > 0 && t > T.kind - 0.1) {
        ctx.save(); ctx.globalAlpha *= lab;
        M.chip(ctx, 'ANAEROBIC', 110, 330, pop(t, T.kind, 0.5), { size: 64, align: 'left' });
        M.tag(ctx, "DON'T LIKE OXYGEN", 116, 432, prog(t, T.dont, 0.4), { size: 50 });
        // O2 icon with a red cross, on "oxygen"
        const oi = pop(t, T.oxygen, 0.5);
        if (oi > 0) {
          ctx.save(); ctx.translate(700, 330); ctx.scale(oi, oi); M.o2(ctx, 0, 0, 92, -0.2, { glow: 0.4 }); ctx.restore();
          api.doodle.cross(ctx, 700, 330, 58, prog(t, T.oxygen + 0.18, 0.35), { color: P.marker, width: 10, seed: 4 });
        }
        ctx.restore();
      }
      // O2 formula tag at the top
      const ot = env(t, T.guess + 0.4, T.so - 0.17, 0.4, 0.35), om = O2s.reduce((a, m) => (Math.abs(m.x - 1480) < Math.abs(a.x - 1480) && !m.dive ? m : a), O2s[0]);
      if (ot > 0) { const [sx0, sy0] = M.toScreen(cam, om.x + Math.sin(t * om.sp + om.ph) * 40, om.y + Math.cos(t * om.sp * 0.8 + om.ph) * 26), sx = sx0, sy = Math.max(sy0 + 150, 190); ctx.save(); ctx.globalAlpha *= ot; M.formula(ctx, 'O_2', sx, sy - 60, 58, { align: 'center', color: '#bfe9ff', stroke: 'rgba(10,8,22,0.85)', strokeWidth: 10 }); ctx.restore(); }
      // "not much oxygen" down at the colony
      const nm = env(t, T.not, T.so + 0.03, 0.1, 0.35);
      if (nm > 0) {
        const [sx, sy] = M.toScreen(cam, 965, 910);
        ctx.save(); ctx.globalAlpha *= nm;
        api.doodle.text(ctx, 'not much oxygen', sx + 300, sy - 170, prog(t, T.not, 0.6, ease.linear), { color: '#bfe9ff', size: 58, align: 'left', stroke: 'rgba(10,8,22,0.75)', strokeWidth: 10, rotate: -0.05 });
        api.doodle.arrow(ctx, sx + 330, sy - 150, sx + 150, sy - 40, prog(t, T.not + 0.45, 0.45), { color: '#bfe9ff', width: 8, bend: -40, seed: 6 });
        ctx.restore();
      }
      // THE PERFECT SPOT + a doodled roof over the colony
      const ps = pop(t, T.spot, 0.5);
      if (ps > 0) M.chip(ctx, 'THE PERFECT SPOT', 960, 250, ps, { size: 64 });
      const rf = prog(t, T.perfect + 0.15, 0.6, ease.inOutCubic);
      if (rf > 0) {
        const a = M.toScreen(cam, 835, 905), b = M.toScreen(cam, 975, 820), c = M.toScreen(cam, 1120, 905), ch0 = M.toScreen(cam, 1050, 862), ch1 = M.toScreen(cam, 1050, 820), ch2 = M.toScreen(cam, 1080, 820), ch3 = M.toScreen(cam, 1080, 880);
        api.doodle.stroke(ctx, [a, b, c], rf, { color: P.lime, width: 10, seed: 9, glow: 'rgba(215,243,74,0.5)' });
        api.doodle.stroke(ctx, [ch0, ch1, ch2, ch3], prog(t, T.perfect + 0.6, 0.35), { color: P.lime, width: 8, seed: 12 });
      }
      M.finish(ctx, t);
    },
  });
})();
