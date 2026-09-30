// @use videos/bad-breath-for-good/scenes/throat/_lib.js
// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js
/* flashlight (words 3738-3779): "now for the tonsil stones, if you really want to know if you've got them or not, just
 * look back in there with a little flashlight and you'll see them. You can the eye and you'll see these little white
 * specs everywhere."
 * 3D, inside a dark open mouth, cut on the words:
 *   1 start      the dark mouth from the lips, the arch far back ("got them?")
 *   2 "look"     a penlight slides in and clicks on at "flashlight"; its beam reaches the back of the throat
 *   3 "and"      closer: the beam finds a tonsil, a white stone in a pit ("you'll see them")
 *   4 "see"(2)   the beam opens wide: little white specks on both tonsils, circled: LITTLE WHITE SPECKS */
defineScene({
  name: 'flashlight',
  anchor: { word: 3738, offset: -0.15 },
  anchorEnd: { word: 3784, offset: -0.15 },
  tail: 0.5,
  setup(api) { this.tun = window.THROAT3D.world3(api, 'TUNNEL', { steps: 140 }); },
  draw(ctx, t, api) {
    const TH = window.THROAT, T3 = window.THROAT3D, { P, prog, pop, ease, env, clamp, lerp } = api;
    const W = (i, o = 0) => api.at(i, o);
    const tKnow = W(3748), tLook = W(3756), tFlash = W(3763), tAnd = W(3764), tSee2 = W(3774), tWhite = W(3777), tSpecs = W(3778);
    const sh = T3.shot(t, [{ t: -1, n: 'dark' }, { t: tLook, n: 'light' }, { t: tAnd, n: 'tonsil' }, { t: tSee2, n: 'specks' }]);
    const lt = sh.lt;
    const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
    let c, spot = 0, target = [0, -0.2, 3.2], cosE = 0.93, stoneR = 0, specks = 0;
    if (sh.n === 'dark') {
      const k = ease.inOutSine(clamp(lt / tLook));
      c = { ro: [0, lerp(0.4, 0.36, k), lerp(-3.3, -2.9, k)], ta: [0, -0.1, 2.6], fov: 1.4 };
      spot = 0.82;
    } else if (sh.n === 'light') {
      const k = ease.inOutSine(clamp(lt / (tAnd - tLook)));
      c = { ro: [lerp(0.4, 0.3, k), 0.18, lerp(-1.9, -1.6, k)], ta: [-0.1, -0.12, 2.8], fov: 1.45, roll: -0.04 };
      const on = prog(t, tFlash + 0.05, 0.12);
      spot = lerp(0.82, 1, on); target = [lerp(-0.3, 0.1, k), -0.1, 3.3]; cosE = lerp(0.999, 0.955, on);
    } else if (sh.n === 'tonsil') {
      const k = ease.inOutSine(clamp(lt / (tSee2 - tAnd)));
      c = { ro: [lerp(0.2, 0.3, k), lerp(0.05, 0.0, k), lerp(0.9, 1.3, k)], ta: [0.95, -0.25, 2.9], fov: 1.5 };
      spot = 1; target = [0.9, -0.25, 2.9]; cosE = 0.955; stoneR = 0.07; specks = 0.5;
    } else {
      const k = ease.inOutSine(clamp(lt / Math.max(0.5, api.duration - tSee2)));
      c = { ro: [0, lerp(0.25, 0.22, k), lerp(-0.6, -0.3, k)], ta: [0, -0.2, 2.8], fov: 1.45 };
      spot = 1; target = [0, -0.2, 3.0]; cosE = lerp(0.97, 0.9, ease.inOutCubic(clamp(lt / 0.5))); stoneR = 0.055; specks = prog(t, tWhite - 0.1, 0.5);
    }
    const lp = [c.ro[0], c.ro[1] + 0.25, c.ro[2] - 0.1];
    const dir = norm([target[0] - lp[0], target[1] - lp[1], target[2] - lp[2]]);
    T3.draw3(ctx, api, this.tun, 'TUNNEL', c, t, { uCoat: 0.8, uSpot: spot, uSpotDir: dir, uSpotCos: cosE, uStoneR: stoneR, uSpecks: specks });
    // the penlight (2D, foreground): slides in, clicks on at "flashlight"
    if (sh.n === 'light') {
      const pin = prog(t, tFlash - 0.55, 0.5, ease.outCubic), on = prog(t, tFlash + 0.05, 0.12);
      const [sx, sy] = T3.project(c.ro, c.ta, c.fov, target);
      const px = lerp(2150, 1600, pin), py = lerp(1200, 990, pin), a = Math.atan2(sy - py, sx - px);
      if (on > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.16 * on;
        const nx = -Math.sin(a), ny = Math.cos(a), lx = px + Math.cos(a) * 120, ly = py + Math.sin(a) * 120, r = 170;
        const g = ctx.createLinearGradient(lx, ly, sx, sy); g.addColorStop(0, 'rgba(255,245,210,1)'); g.addColorStop(1, 'rgba(255,245,210,0.05)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx + nx * 16, ly + ny * 16); ctx.lineTo(sx + nx * r, sy + ny * r); ctx.lineTo(sx - nx * r, sy - ny * r); ctx.lineTo(lx - nx * 16, ly - ny * 16); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.save(); ctx.translate(px, py); ctx.rotate(a);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30;
      ctx.fillStyle = TH.lin(ctx, 0, -24, 0, 24, [[0, '#e6e9f1'], [0.45, '#9aa1b3'], [1, '#474c5d']]); api.roundRect(ctx, -190, -22, 290, 44, 14); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = TH.lin(ctx, 0, -30, 0, 30, [[0, '#f2f4f8'], [1, '#666b7e']]); api.roundRect(ctx, 80, -30, 48, 60, 11); ctx.fill();
      ctx.fillStyle = '#353a4a'; ctx.fillRect(-100, -24, 14, 48); ctx.fillStyle = P.lavender; api.roundRect(ctx, -46, -28, 36, 11, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-180, -14); ctx.lineTo(70, -14); ctx.stroke();
      if (on > 0) TH.glow(ctx, 130, 0, 90, `rgba(255,250,220,${0.9 * on})`);
      ctx.fillStyle = on > 0 ? '#fffbe8' : '#b9bdca'; ctx.beginPath(); ctx.ellipse(126, 0, 7, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (sh.n === 'dark') api.doodle.text(ctx, 'got them?', 1460, 250, prog(t, tKnow - 0.05, 0.7, ease.linear), { color: P.lime, size: 76, align: 'center', rotate: -0.06, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
    if (sh.n === 'tonsil') {
      const [x, y] = T3.project(c.ro, c.ta, c.fov, [0.72, -0.24, 2.84]);
      api.doodle.circle(ctx, x, y, 95, 85, prog(t, tAnd + 0.3, 0.5, ease.inOutCubic), { color: P.marker, width: 10, seed: 3 });
      api.doodle.text(ctx, "you'll see them", x - 420, y - 250, prog(t, tAnd + 0.1, 0.6, ease.linear), { color: P.lime, size: 70, align: 'center', stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12, rotate: -0.05 });
    }
    if (sh.n === 'specks') {
      const [lx, ly] = T3.project(c.ro, c.ta, c.fov, [-0.98, -0.28, 2.9]), [rx, ry] = T3.project(c.ro, c.ta, c.fov, [0.98, -0.28, 2.9]);
      api.doodle.circle(ctx, lx, ly, 150, 220, prog(t, tSpecs - 0.05, 0.5, ease.inOutCubic), { color: P.marker, width: 10, seed: 3 });
      api.doodle.circle(ctx, rx, ry, 150, 220, prog(t, tSpecs + 0.1, 0.5, ease.inOutCubic), { color: P.marker, width: 10, seed: 8 });
      TH.chip(ctx, api, 'LITTLE WHITE SPECKS', null, null, 960, 150, pop(t, tSpecs, 0.5), { size: 62 });
    }
    T3.bokeh(ctx, t, 61, 6, 0.5);
    T3.artistic(ctx, api);
    api.finish(ctx, t, { bloom: 0.32, grain: 0.05, vignette: 0.55 });
  },
});
