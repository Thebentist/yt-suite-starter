// @use videos/bad-breath-for-good/scenes/throat/_lib.js
// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js
/* scratchy (words 3784-3828): "or you'll get that feeling that something scratchy in the back of your throat, you
 * know, like you got a small and there's just something stuck by there. That's normally a tonsil stone that is about
 * to dislodge and, you know, get out of there."
 * 3D, cut on the words:
 *   1 start     pushing in toward the back of the throat; it reddens, jagged "scratchy!" marks on "scratchy"
 *   2 "like"    the right tonsil, a stone in a pit, circled "stuck?" on "stuck"
 *   3 "That's"  macro on the tonsil surface: the stone wiggles (TONSIL STONE)
 *   4 "dislodge" a lower angle: it pops out and tumbles away on "get out of there" */
defineScene({
  name: 'scratchy',
  anchor: { word: 3784, offset: -0.15 },
  anchorEnd: { word: 3829, offset: -0.15 },
  tail: 0.5,
  setup(api) { const T3 = window.THROAT3D; this.tun = T3.world3(api, 'TUNNEL', { steps: 140 }); this.ton = T3.world3(api, 'TONSIL', { steps: 140 }); },
  draw(ctx, t, api) {
    const TH = window.THROAT, T3 = window.THROAT3D, { P, prog, pop, ease, env, clamp, lerp } = api;
    const W = (i, o = 0) => api.at(i, o);
    const tScr = W(3791), tLike = W(3800), tStuck = W(3809), tThats = W(3812), tTonsil = W(3815), tDis = W(3821), tGet = W(3825), tOut = W(3826);
    const sh = T3.shot(t, [{ t: -1, n: 'back' }, { t: tLike, n: 'stuck' }, { t: tThats, n: 'wiggle' }, { t: tDis, n: 'pop' }]);
    const lt = sh.lt;
    const cr = T3.CRYPTS3[3];
    if (sh.n === 'back') {
      const k = ease.inOutSine(clamp(lt / tLike));
      const c = { ro: [0.05, lerp(0.3, 0.12, k), lerp(-1.4, 1.1, k)], ta: [0.05, -0.3, 4.3], fov: 1.45, roll: 0.02 * Math.sin(t * 7) * env(t, tScr, tLike, 0.2, 0.3) };
      const scr = env(t, tScr - 0.2, tLike + 0.5, 0.3, 0.3);
      T3.draw3(ctx, api, this.tun, 'TUNNEL', c, t, { uCoat: 0.8, uScr: scr });
      const [bx, by] = T3.project(c.ro, c.ta, c.fov, [0, -0.3, 4.2]);
      const marks = [[-330, -180, -0.6], [320, -150, 0.5], [380, 120, 0.15], [-360, 150, -0.2], [30, 300, 1.4], [-60, -320, 0.9]];
      marks.forEach(([dx, dy, a], i) => {
        const p = prog(t, tScr - 0.05 + i * 0.08, 0.3) * scr, L = 110, cx = bx + dx, cy = by + dy + Math.sin(t * 22 + i) * 3;
        const pts = []; for (let q = 0; q <= 6; q++) pts.push([cx + Math.cos(a) * (q - 3) * L / 6 + (q % 2 ? 1 : -1) * Math.sin(a) * 20, cy + Math.sin(a) * (q - 3) * L / 6 - (q % 2 ? 1 : -1) * Math.cos(a) * 20]);
        api.doodle.stroke(ctx, pts, p, { color: P.marker, width: 9, seed: 30 + i, wobble: 1.5 });
      });
      api.doodle.text(ctx, 'scratchy!', 1440, 230, prog(t, tScr + 0.05, 0.45, ease.linear) * (1 - prog(t, tLike - 0.2, 0.2)), { color: P.marker, size: 84, align: 'center', rotate: -0.07, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      T3.bokeh(ctx, t, 71, 6, 0.7, [255, 120, 130]);
    } else if (sh.n === 'stuck') {
      const k = ease.inOutSine(clamp(lt / (tThats - tLike)));
      const c = { ro: [lerp(0.25, 0.32, k), lerp(0.02, -0.04, k), lerp(1.0, 1.45, k)], ta: [0.95, -0.26, 2.9], fov: 1.5 };
      T3.draw3(ctx, api, this.tun, 'TUNNEL', c, t, { uCoat: 0.8, uStoneR: 0.075, uScr: 0.3 });
      const [x, y] = T3.project(c.ro, c.ta, c.fov, [0.72, -0.24, 2.84]);
      api.doodle.circle(ctx, x, y, 110, 95, prog(t, tStuck - 0.1, 0.5, ease.inOutCubic), { color: P.marker, width: 11, seed: 3 });
      api.doodle.text(ctx, 'stuck?', x - 330, y + 260, prog(t, tStuck, 0.4, ease.linear), { color: P.marker, size: 80, align: 'center', stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12, rotate: -0.05 });
      T3.bokeh(ctx, t, 73, 6, 0.7);
    } else if (sh.n === 'wiggle') {
      const k = ease.inOutSine(clamp(lt / (tDis - tThats)));
      const c = { ro: [lerp(2.0, 1.85, k), lerp(0.95, 0.85, k), lerp(-0.55, -0.4, k)], ta: [cr[0], -0.05, cr[1]], fov: 1.7 };
      const wig = prog(t, tTonsil - 0.1, 0.4);
      const sx = cr[0] + 0.02 * wig * Math.sin(t * 29), sy = -0.03 + 0.03 * wig * Math.abs(Math.sin(t * 21));
      T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, { uS0: [sx, sy, cr[1], 0.15], uHead: 0.3, uRed: 0.15 });
      const [x, y] = T3.project(c.ro, c.ta, c.fov, [cr[0], 0.05, cr[1]]);
      TH.chip(ctx, api, 'TONSIL STONE', x - 80, y + 40, x - 520, y + 280, pop(t, tTonsil, 0.5), { size: 64 });
      if (wig > 0.05) { ctx.save(); ctx.globalAlpha = wig; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const px = x + s * (190 + i * 26), py = y - 30 + i * 34; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + s * 30, py - 9); ctx.stroke(); } ctx.restore(); }
      T3.bokeh(ctx, t, 75, 6, 0.8);
    } else {
      const k = ease.inOutSine(clamp(lt / Math.max(0.5, api.duration - tDis)));
      const c = { ro: [lerp(2.35, 2.25, k), lerp(0.45, 0.55, k), lerp(-0.95, -1.05, k)], ta: [cr[0], 0.15, cr[1]], fov: 1.6 };
      const half = prog(t, tDis, 0.3, ease.outBack), out = prog(t, tGet - 0.1, 0.9, ease.inQuad);
      const sy = lerp(-0.03, 0.14, Math.min(1, half)) + 1.4 * out - 1.6 * out * out, sx = cr[0] + 1.5 * out, sz = cr[1] - 1.1 * out;
      T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, { uS0: [sx + 0.01 * Math.sin(t * 30) * (1 - out) * half, sy, sz, 0.15], uHead: 0.3, uGlowStone: 0.3 * half });
      const [x, y] = T3.project(c.ro, c.ta, c.fov, [cr[0], 0.1, cr[1]]);
      const sp = env(t, tDis, tDis + 0.6, 0.05, 0.3);
      if (sp > 0) { ctx.save(); ctx.globalAlpha = sp; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3, r0 = 130, r1 = 130 + 60 * prog(t, tDis, 0.3); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); } ctx.restore(); }
      api.doodle.text(ctx, 'dislodge!', 1450, 230, prog(t, tDis, 0.5, ease.linear), { color: P.lime, size: 84, align: 'center', rotate: -0.07, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      T3.bokeh(ctx, t, 77, 6, 0.8);
    }
    T3.artistic(ctx, api);
    api.finish(ctx, t, { bloom: 0.32, grain: 0.05, vignette: 0.5 });
  },
});
