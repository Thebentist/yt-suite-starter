// @use videos/bad-breath-for-good/scenes/throat/_lib.js
// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js
/* down-throat (words 1904-1960): "Now we've gone for the teeth and the mouth and tongues all the way back to the
 * tonsils. Well, let's keep going back into the throat now. And the question is, is like, wait, is there bad breath
 * coming from my stomach? Is what I eat actually a big deal? And well, kind of a little bit."
 * Shots cut on the words:
 *   1 start     the map: the trip so far, stop by stop (TEETH / MOUTH / TONGUE / TONSILS)
 *   2 "Well"    3D: flying down inside the esophagus (THROAT)
 *   3 "And"     the map pulls out to the whole body; the route runs down to the stomach
 *   4 "wait"    closer on the stomach: it glows, STOMACH and a big "?"
 *   5 "Is"      3D: above the valve looking down; a bite of food goes through ("what I eat?")
 *   6 "And"     the stomach with the food in it; the "?" tilts on "kind of... a little bit" */
defineScene({
  name: 'down-throat',
  anchor: { word: 1904, offset: -0.15 },
  anchorEnd: { word: 1961, offset: -0.15 },
  tail: 0.5,
  setup(api) { this.eso = window.THROAT3D.world3(api, 'ESO', { steps: 140 }); },
  draw(ctx, t, api) {
    const TH = window.THROAT, T3 = window.THROAT3D, { P, prog, pop, ease, env, clamp, lerp } = api;
    TH.build();
    const G = TH.G, S = G.stops, W = (i, o = 0) => api.at(i, o);
    const tTeeth = W(1909), tMouth = W(1912), tTongue = W(1914), tTonsils = W(1921), tWell = W(1922), tThroat = W(1929), tAnd = W(1931),
      tWait = W(1937), tStomach = W(1945), tIs = W(1946), tEat = W(1949), tAnd2 = W(1954), tKind = W(1956);
    const sh = T3.shot(t, [{ t: -1, n: 'recap' }, { t: tWell, n: 'dive' }, { t: tAnd, n: 'body' }, { t: tWait, n: 'stomach' }, { t: tIs, n: 'valve' }, { t: tAnd2, n: 'end' }]);
    const lt = sh.lt;
    if (sh.n === 'recap') {
      const k = ease.inOutSine(clamp(t / tWell));
      const cam = { x: lerp(520, 560, k), y: lerp(760, 790, k), z: lerp(1.42, 1.32, k) };
      api.stage(ctx, { gridOffset: [-cam.x * 0.2, -cam.y * 0.2] });
      TH.motes(ctx, t, cam, 40, 11);
      const mouthU = (S.teeth + S.tongue) / 2;
      const rk = [[0.15, 0], [tTeeth, S.teeth], [tMouth, mouthU], [tTongue, S.tongue], [tTonsils, S.tonsils]];
      let ru = 0; for (let i = 0; i < rk.length - 1; i++) if (t >= rk[i][0]) ru = lerp(rk[i][1], rk[i + 1][1], ease.inOutCubic(clamp((t - rk[i][0]) / (rk[i + 1][0] - rk[i][0]))));
      if (t >= tTonsils) ru = S.tonsils;
      TH.world(ctx, api, cam, t, { route: [0, ru], probe: ru, coat: 0.7 });
      const stops = [['TEETH', 258, 748, tTeeth, -40, -200], ['MOUTH', 420, 736, tMouth, -10, -260], ['TONGUE', 580, 760, tTongue, 60, 210], ['TONSILS', 808, 884, tTonsils, 200, -180]];
      for (const [name, wx, wy, tw, dx, dy] of stops) {
        const p = pop(t, tw, 0.45); if (p <= 0) continue;
        const [x, y] = TH.toScreen(cam, wx, wy);
        TH.glow(ctx, x, y, 44, 'rgba(215,243,74,0.5)');
        ctx.strokeStyle = P.lime; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 17 * Math.min(1, p), 0, Math.PI * 2); ctx.stroke();
        TH.chip(ctx, api, name, x, y, x + dx, y + dy, p, { size: 48 });
      }
      T3.bokeh(ctx, t, 31, 7, 1);
    } else if (sh.n === 'dive') {
      // inside the esophagus, flying down
      const y = lerp(0.8, -4.6, ease.inOutSine(clamp(lt / (tAnd - tWell))));
      const c = { ro: [0.28 + 0.04 * Math.sin(t * 0.9), y, 0.1 * Math.cos(t * 0.7)], ta: [-0.35, y - 2.6, -0.1], fov: 1.35, roll: 0.18 * lt };
      T3.draw3(ctx, api, this.eso, 'ESO', c, t, {});
      T3.bokeh(ctx, t, 33, 5, 0.6);
      TH.chip(ctx, api, 'THROAT', null, null, 960, 170, pop(t, tThroat, 0.5), { size: 64 });
      T3.artistic(ctx, api);
    } else if (sh.n === 'body' || sh.n === 'stomach' || sh.n === 'end') {
      let cam, route = [0, S.stomach], probe = null;
      if (sh.n === 'body') {
        const k = ease.inOutCubic(clamp(lt / (tWait - tAnd)));
        cam = { x: lerp(760, 790, k), y: lerp(1000, 2850, k), z: 0.62 };
        const ru = lerp(S.tonsils, S.stomach, k);
        route = [0, ru]; probe = ru;
      } else if (sh.n === 'stomach') {
        const k = ease.inOutSine(clamp(lt / (tIs - tWait)));
        cam = { x: lerp(760, 752, k), y: lerp(2960, 3000, k), z: lerp(1.0, 1.12, k) };
      } else {
        const k = ease.inOutSine(clamp(lt / Math.max(0.5, api.duration - tAnd2)));
        cam = { x: 745, y: 3020, z: lerp(1.32, 1.4, k) };
      }
      api.stage(ctx, { gridOffset: [-cam.x * 0.2, -cam.y * 0.2] });
      TH.motes(ctx, t, cam, 40, 13);
      const glow = sh.n === 'body' ? 0 : prog(t, tStomach - 0.1, 0.5) * (0.8 + 0.2 * Math.sin(t * 5));
      TH.world(ctx, api, cam, t, {
        route: sh.n === 'body' ? route : null, probe, coat: 0.7, stomachGlow: sh.n === 'end' ? 0.8 : glow, acid: sh.n === 'end' ? 0.6 : 0.2,
        inStomach: sh.n === 'end' ? (c) => TH.stomachFood(c, t, -5, 1, 0.6) : null,
      });
      if (sh.n === 'body') {
        const [x, y] = TH.toScreen(cam, 790, 3010);
        api.doodle.text(ctx, 'wait...', 1380, 300, prog(t, tWait - 0.4, 0.4, ease.linear), { color: P.lime, size: 76, align: 'center', rotate: -0.05, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      }
      if (sh.n === 'stomach' || sh.n === 'end') {
        const [sx, sy] = TH.toScreen(cam, 740, 3000), [qx, qy] = TH.toScreen(cam, 858, 3010);
        const cP = sh.n === 'end' ? 1 : pop(t, tStomach, 0.5);
        if (cP > 0) TH.chip(ctx, api, 'STOMACH', sx + 170, sy - 130, sx + 420, sy - 280, cP, { size: 56 });
        const qP = sh.n === 'end' ? 1 : pop(t, tStomach + 0.12, 0.6);
        const rot = -0.34 * prog(t, tKind - 0.06, 0.7, ease.outBack) + 0.05 * Math.sin(t * 2.3);
        TH.question(ctx, api, qx, qy + 20, 300, qP * (1 - 0.15 * prog(t, tKind - 0.06, 0.6, ease.outBack)), rot);
        if (sh.n === 'end') api.doodle.text(ctx, 'kind of... a little bit', sx - 440, sy - 70, prog(t, tKind, 0.72, ease.linear), { color: P.lime, size: 64, align: 'center', rotate: -0.05, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      }
      T3.bokeh(ctx, t, 35, 7, 1);
    } else {
      // above the valve, looking down: a bite of food goes through
      const k = ease.inOutSine(clamp(lt / (tAnd2 - tIs)));
      const c = { ro: [0.1, lerp(-6.0, -6.6, k), 0.06], ta: [0, -9.6, 0], fov: 1.45, roll: 0.1 * lt };
      const bol = t < tEat - 0.7 ? 99 : lerp(-6.9, -11, ease.inCubic(clamp((t - tEat + 0.7) / 1.25)));
      const open = env(t, tEat - 0.15, tEat + 0.95, 0.25, 0.35);
      T3.draw3(ctx, api, this.eso, 'ESO', c, t, { uBolus: bol, uOpen: open * 0.9, uGlowV: 0.15 + 0.15 * open, uAcid: 0.25 * open });
      const [vx, vy] = T3.project(c.ro, c.ta, c.fov, [0, -9, 0]);
      TH.chip(ctx, api, 'VALVE', vx + 90, vy, vx + 420, vy - 190, pop(t, tIs + 0.15, 0.5), { size: 52 });
      api.doodle.text(ctx, 'what I eat?', 1420, 880, prog(t, tEat - 0.3, 0.6, ease.linear), { color: P.lime, size: 76, align: 'center', rotate: -0.05, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      T3.bokeh(ctx, t, 37, 5, 0.6);
      T3.artistic(ctx, api);
    }
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });
  },
});
