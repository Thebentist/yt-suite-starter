// @use videos/bad-breath-for-good/scenes/throat/_lib.js
// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js
/* valve (words 2043-2091): "But your stomach is not breathing out of your mouth all the time, there's a little valve
 * that literally holds all of those things in, so it doesn't really make sense to go through your mouth. So unless
 * you have reflux, more than likely it's coming from your mouth."
 * Shots cut on the words:
 *   1 start      the stomach (map)
 *   2 "breathing" the body map: a dashed path from the stomach up to the mouth, crossed out on "all the time"
 *   3 "there's"  3D: above the valve, looking down: it glows on "valve", shut (A VALVE THAT STAYS SHUT); gas held below
 *   4 "things"   the map, close on the valve: bubbles bump against it and can't get through; the path up is crossed out
 *   5 "So"       3D: the valve cracks open on "reflux" and gas rises toward us
 *   6 "more"     3D: inside the mouth: OTHERWISE: IT'S YOUR MOUTH */
defineScene({
  name: 'valve',
  anchor: { word: 2043, offset: -0.15 },
  anchorEnd: { word: 2091, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) { const T3 = window.THROAT3D; this.eso = T3.world3(api, 'ESO', { steps: 140 }); this.tun = T3.world3(api, 'TUNNEL', { steps: 140 }); },
  draw(ctx, t, api) {
    const TH = window.THROAT, T3 = window.THROAT3D, { P, prog, pop, ease, env, clamp, lerp } = api;
    TH.build();
    const G = TH.G, W = (i, o = 0) => api.at(i, o);
    const tBreath = W(2048), tTime = W(2055), tTheres = W(2056), tValve = W(2059), tHolds = W(2062), tThings = W(2066), tSense = W(2072),
      tSo = W(2079), tReflux = W(2083), tMore = W(2084), tComing = W(2088);
    const sh = T3.shot(t, [{ t: -1, n: 'stomach' }, { t: tBreath, n: 'body' }, { t: tTheres, n: 'valve3d' }, { t: tThings, n: 'held' }, { t: tSo, n: 'reflux' }, { t: tMore, n: 'mouth' }]);
    const lt = sh.lt;
    if (sh.n === 'stomach' || sh.n === 'body' || sh.n === 'held') {
      let cam;
      if (sh.n === 'stomach') cam = { x: 770, y: lerp(3000, 2960, ease.inOutSine(clamp(lt / tBreath))), z: 1.15 };
      else if (sh.n === 'body') { const k = ease.inOutSine(clamp(lt / (tTheres - tBreath))); cam = { x: lerp(620, 600, k), y: lerp(1900, 1860, k), z: lerp(0.46, 0.49, k) }; }
      else { const k = ease.inOutSine(clamp(lt / (tSo - tThings))); cam = { x: 790, y: lerp(2760, 2740, k), z: lerp(2.3, 2.45, k) }; }
      api.stage(ctx, { gridOffset: [-cam.x * 0.2, -cam.y * 0.2] });
      TH.motes(ctx, t, cam, 40, 23);
      TH.world(ctx, api, cam, t, { coat: 0.7, stomachGlow: sh.n === 'stomach' ? 0.5 : 0, valveGlow: sh.n === 'held' ? 0.8 : 0, acid: 0.5 });
      if (sh.n === 'body') {
        // a dashed path stomach -> mouth, crossed out
        const pts = [[790, 2950], [850, 2500], [850, 1800], [846, 1200], [760, 880], [520, 760], [230, 770]].map(([x, y]) => TH.toScreen(cam, x, y));
        const dp = prog(t, tBreath + 0.1, 1.0, ease.inOutCubic);
        ctx.save(); ctx.setLineDash([14, 14]); ctx.lineDashOffset = -t * 40;
        api.doodle.stroke(ctx, pts, dp, { color: P.gas, width: 7, seed: 5, wobble: 2 });
        ctx.restore();
        const [mx, my] = pts[pts.length - 1];
        api.doodle.cross(ctx, TH.toScreen(cam, 846, 1500)[0], TH.toScreen(cam, 846, 1500)[1], 90, prog(t, tTime - 0.1, 0.45), { color: P.marker, width: 14, seed: 9 });
        api.doodle.text(ctx, 'not all the time', 560, 520, prog(t, W(2053) - 0.05, 0.6, ease.linear), { color: P.marker, size: 76, align: 'center', rotate: -0.05, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      }
      if (sh.n === 'held') {
        const [vx, vy] = TH.toScreen(cam, G.les.x, G.les.y);
        for (let i = 0; i < 8; i++) {
          const ph = ((t - tThings) * 0.6 + i / 8) % 1, x0 = vx + (i % 2 ? 1 : -1) * (18 + (i * 11) % 40);
          const y = lerp(vy + 560, vy + 60, ease.outCubic(Math.min(1, ph * 1.5))) + (ph > 0.66 ? Math.sin((ph - 0.66) * 30) * 12 * (1 - ph) : 0), r = 12 + (i % 3) * 6;
          ctx.save(); ctx.globalAlpha = ph > 0.9 ? (1 - ph) * 10 : 1; ctx.strokeStyle = 'rgba(240,255,190,0.9)'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x0 + Math.sin(t * 4 + i) * 6, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(185,227,90,0.22)'; ctx.fill(); ctx.restore();
        }
        api.doodle.arrow(ctx, vx + 230, vy + 120, vx + 230, vy - 260, prog(t, tSense - 0.3, 0.5, ease.inOutCubic), { color: P.marker, width: 9, bend: 0, seed: 4, head: 30 });
        api.doodle.cross(ctx, vx + 230, vy - 70, 70, prog(t, tSense + 0.2, 0.4), { color: P.marker, width: 13, seed: 6 });
        TH.chip(ctx, api, 'HOLDS IT ALL IN', vx - 60, vy, vx - 470, vy - 200, 1, { size: 54 });
      }
      T3.bokeh(ctx, t, 51, 7, 1);
      T3.artistic(ctx, api);
    } else if (sh.n === 'valve3d' || sh.n === 'reflux') {
      const re = sh.n === 'reflux';
      const k = ease.inOutSine(clamp(lt / ((re ? tMore : tThings) - (re ? tSo : tTheres))));
      const c = re ? { ro: [0.1, lerp(-7.2, -6.9, k), 0.05], ta: [0, -9.6, 0], fov: 1.4, roll: -0.1 * lt } : { ro: [0.15, lerp(-6.4, -7.0, k), 0.05], ta: [0, -9.6, 0], fov: 1.4, roll: 0.1 * lt };
      const open = re ? env(t, tReflux - 0.15, tMore + 0.6, 0.2, 0.3) * 0.5 : 0;
      const glow = re ? 0.25 : Math.max(0.2, pop(t, tValve, 0.5)) * (0.85 + 0.15 * Math.sin(t * 6));
      const gasY = re ? lerp(-10.6, -6.8, ease.inOutSine(clamp((t - tReflux + 0.1) / 0.9))) : -10.9 + 0.12 * Math.sin(t * 3);
      T3.draw3(ctx, api, this.eso, 'ESO', c, t, { uOpen: open, uGlowV: glow, uGas: re ? prog(t, tReflux - 0.2, 0.3) : 0.08, uGasY: gasY, uAcid: 0.3 });
      const [vx, vy] = T3.project(c.ro, c.ta, c.fov, [0, -9, 0]);
      if (!re) TH.chip(ctx, api, 'A VALVE THAT STAYS SHUT', vx + 100, vy, vx + 500, vy - 230, pop(t, tValve + 0.25, 0.5), { size: 58 });
      else api.doodle.text(ctx, 'unless: reflux', 1380, 880, prog(t, tReflux - 0.3, 0.5, ease.linear), { color: P.marker, size: 76, align: 'center', rotate: -0.05, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      T3.bokeh(ctx, t, 53, 5, 0.6, re ? [200, 255, 120] : [255, 150, 185]);
      T3.artistic(ctx, api);
    } else {
      const k = ease.inOutSine(clamp(lt / Math.max(0.5, api.duration - tMore)));
      const c = { ro: [0.02, lerp(0.42, 0.34, k), lerp(-2.7, -2.2, k)], ta: [0, -0.1, 2.6], fov: 1.4 };
      T3.draw3(ctx, api, this.tun, 'TUNNEL', c, t, { uCoat: 0.85 });
      TH.glow(ctx, 960, 600, 700, `rgba(215,243,74,${0.12 * prog(t, tComing, 0.5)})`);
      TH.chip(ctx, api, "OTHERWISE: IT'S YOUR MOUTH", null, null, 960, 930, pop(t, tComing, 0.55), { size: 66 });
      T3.bokeh(ctx, t, 55, 6, 0.8);
      T3.artistic(ctx, api);
    }
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });
  },
});
