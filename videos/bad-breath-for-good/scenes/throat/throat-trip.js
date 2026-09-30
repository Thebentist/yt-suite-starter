// @use videos/bad-breath-for-good/scenes/throat/_lib.js
// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js
/* throat-trip (words 1610-1632): "Now, if you keep going past your tongue, we reach another spot of bad breathification,
 * and that is the tonsil stones. You see,"
 * The trip, four shots cut on the words:
 *   1 (start)      3D: flying in over the tongue toward the back of the mouth, the arch and uvula ahead; map card.
 *   2 "we"         3D: closer, inside the arch; the right tonsil lights up on "spot": TONSILS.
 *   3 "bad"        the map: the side cross-section with the route to the tonsils, a stink, "bad breathification!".
 *   4 "tonsil"     3D macro of the tonsil surface: a white stone pops up out of a pit, circled "stone".
 * Shot 4's camera continues into `crypts` (THROAT3D.macroCam, timed from w1629). */
defineScene({
  name: 'throat-trip',
  anchor: { word: 1610, offset: -0.15 },
  anchorEnd: { word: 1633, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    const T3 = window.THROAT3D;
    this.tun = T3.world3(api, 'TUNNEL', { steps: 130 });
    this.ton = T3.world3(api, 'TONSIL', { steps: 130 });
  },
  draw(ctx, t, api) {
    const TH = window.THROAT, T3 = window.THROAT3D, { P, prog, pop, ease, env, clamp, lerp } = api;
    TH.build();
    const S = TH.G.stops;
    const tWe = api.at(1618), tSpot = api.at(1621), tBad = api.at(1623), tTonsil = api.at(1629), tStones = api.at(1630);
    if (t < tWe) {
      // ---- 1: over the tongue, toward the arch
      const k = ease.inOutSine(clamp(t / tWe));
      const c = { ro: [0.05 * Math.sin(t * 0.8), lerp(0.5, 0.28, k), lerp(-3.4, -0.6, k)], ta: [0, lerp(-0.05, -0.12, k), 2.6], fov: 1.45, roll: 0.02 * Math.sin(t * 0.6) };
      T3.draw3(ctx, api, this.tun, 'TUNNEL', c, t, { uCoat: 0.85 });
      T3.bokeh(ctx, t, 4, 6, 0.8);
      T3.minimap(ctx, api, t, lerp(S.tongue - 0.06, S.tongueBack, k), { x: 560, y: 760, z: 1.05 }, [70, 770, 420, 236], prog(t, 0.2, 0.4));
    } else if (t < tBad) {
      // ---- 2: inside the arch, the right tonsil
      const k = ease.inOutSine(clamp((t - tWe) / (tBad - tWe)));
      const c = { ro: [lerp(0.1, 0.32, k), lerp(0.1, -0.02, k), lerp(0.7, 1.45, k)], ta: [0.95, -0.26, 2.9], fov: 1.5 };
      const glow = prog(t, tSpot - 0.1, 0.35) * (0.75 + 0.25 * Math.sin(t * 5));
      T3.draw3(ctx, api, this.tun, 'TUNNEL', c, t, { uCoat: 0.85, uGlowR: glow });
      T3.bokeh(ctx, t, 6, 5, 0.7);
      const [x, y] = T3.project(c.ro, c.ta, c.fov, [0.98, -0.28, 2.9]);
      TH.chip(ctx, api, 'TONSILS', x - 80, y - 150, x - 420, y - 330, pop(t, tSpot, 0.5), { size: 60 });
      T3.minimap(ctx, api, t, S.tonsils, { x: 560, y: 760, z: 1.05 }, [70, 770, 420, 236], 1);
    } else if (t < tTonsil) {
      // ---- 3: the map: where we are on the trip, and the stink
      const lt = t - tBad, k = ease.inOutSine(clamp(lt / (tTonsil - tBad)));
      const cam = { x: lerp(620, 700, k), y: lerp(780, 830, k), z: lerp(1.3, 1.5, k) };
      api.stage(ctx, { gridOffset: [-cam.x * 0.3, -cam.y * 0.3] });
      TH.motes(ctx, t, cam, 30, 7);
      TH.world(ctx, api, cam, t, { route: [0, S.tonsils], probe: S.tonsils, tonsilGlow: 0.8 + 0.2 * Math.sin(t * 5), coat: 0.8 });
      const T = TH.G.tonsilC, [tx, ty] = TH.toScreen(cam, T.x, T.y);
      TH.stink(ctx, tx + 140, ty - 130, 100, t, prog(t, tBad + 0.1, 0.5)); TH.stink(ctx, tx - 20, ty - 260, 80, t + 1.3, prog(t, tBad + 0.3, 0.5) * 0.8);
      api.doodle.text(ctx, 'bad breathification!', 1300, 190, prog(t, tBad + 0.25, 1.0, ease.linear), { color: P.marker, size: 76, align: 'center', rotate: -0.06, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      api.doodle.underline(ctx, 1010, 1590, 224, prog(t, tBad + 1.2, 0.4), { color: P.marker, width: 8, seed: 12 });
      T3.bokeh(ctx, t, 9, 6, 1);
    } else {
      // ---- 4: the tonsil surface in macro; a stone pops up out of a pit
      const c = T3.macroCam(t - tTonsil);
      const sp = Math.max(0, pop(t, tTonsil + 0.05, 0.6));
      const cr = T3.CRYPTS3[3];
      T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, { uS0: [cr[0], lerp(-0.25, -0.02, Math.min(1, sp)), cr[1], 0.15 * Math.min(1.1, sp)], uGlowStone: 0.5 * env(t, tTonsil + 0.1, tTonsil + 1.2, 0.1, 0.5), uHead: 0.2 });
      T3.bokeh(ctx, t, 12, 6, 0.8);
      T3.tripNotes3(ctx, api, c, t - tStones);
    }
    T3.artistic(ctx, api);
    api.finish(ctx, t, { bloom: 0.32, grain: 0.05, vignette: 0.5 });
  },
});
