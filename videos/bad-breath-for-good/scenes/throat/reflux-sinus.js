// @use videos/bad-breath-for-good/scenes/throat/_lib.js
// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js
/* reflux-sinus (words 1961-2042): "Because it's not actually coming from the food, it's probably coming from the
 * stomach, and that stomach is acid reflux. Technically, sinuses can do it too, it can drain down from your sinuses
 * into the back of your throat, as well, that is another thing that can happen. And there is another thing too, if
 * you're diabetic or something like that, if you have a lot of ketones on your breath, your breath can actually still
 * smell sweet, not necessarily bad though."
 * Shots cut on the words (the list of three non-mouth sources builds on the right as each is named):
 *   1 start        the stomach with the food in it: the food gets crossed out on "food"
 *   2 "it's"       side view of the valve and the stomach; the stomach pulses on "stomach"
 *   3 "stomach"(2) 3D: above the valve looking down; it opens and a yellow-green gas rises (1 ACID REFLUX)
 *   4 "Technically" the head map: the sinuses light up (2 SINUSES)
 *   5 "drain"      the map: a drip runs from the back of the nose down the throat ("drains down")
 *   6 "back"       3D: the back of the throat, the drip running down the wall onto the back of the tongue
 *   7 "And"        the list card: 3 DIABETES; on "ketones" a glossy ketone molecule (KETONES)
 *   8 "your"(2)    the head map: a sweet pink breath out of the mouth, candy doodle, SWEET, NOT BAD */
defineScene({
  name: 'reflux-sinus',
  anchor: { word: 1961, offset: -0.15 },
  anchorEnd: { word: 2043, offset: -0.15 },
  tail: 0.5,
  setup(api) { const T3 = window.THROAT3D; this.eso = T3.world3(api, 'ESO', { steps: 140 }); this.tun = T3.world3(api, 'TUNNEL', { steps: 140 }); },
  draw(ctx, t, api) {
    const TH = window.THROAT, T3 = window.THROAT3D, { P, prog, pop, ease, env, clamp, lerp } = api;
    TH.build();
    const W = (i, o = 0) => api.at(i, o);
    const tFood = W(1968), tIts = W(1969), tStom1 = W(1974), tStom2 = W(1977), tAcid = W(1979), tTech = W(1981), tSinus = W(1982), tDrain = W(1989),
      tBack = W(1996), tAnd = W(2009), tDiab = W(2017), tKet = W(2028), tYour = W(2032), tSweet = W(2038), tNot = W(2039);
    const sh = T3.shot(t, [{ t: -1, n: 'food' }, { t: tIts, n: 'side' }, { t: tStom2, n: 'reflux' }, { t: tTech, n: 'sinus' }, { t: tDrain, n: 'dripMap' }, { t: tBack, n: 'drip3d' }, { t: tAnd, n: 'list' }, { t: tYour, n: 'sweet' }]);
    const lt = sh.lt;
    let showList = true;
    if (sh.n === 'food' || sh.n === 'side') {
      const food = sh.n === 'food';
      const cam = food ? { x: 745, y: 3020, z: lerp(1.45, 1.52, ease.inOutSine(clamp(lt / tIts))) } : { x: 800, y: lerp(2860, 2900, ease.inOutSine(clamp(lt / (tStom2 - tIts)))), z: 0.95 };
      api.stage(ctx, { gridOffset: [-cam.x * 0.2, -cam.y * 0.2] });
      TH.motes(ctx, t, cam, 40, 13);
      const pulse = food ? 0.6 : 0.5 + 0.5 * env(t, tStom1 - 0.1, tStom1 + 0.8, 0.15, 0.5);
      TH.world(ctx, api, cam, t, { coat: 0.7, stomachGlow: pulse, acid: 0.6, inStomach: (c) => TH.stomachFood(c, t, -5, food ? 1 : 0.5, 0.6) });
      if (food) {
        TH.stomachFoodMarks(ctx, api, cam, t, prog(t, tFood - 0.05, 0.4, ease.inOutCubic), 0.6);
        api.doodle.text(ctx, 'not the food', 1380, 260, prog(t, tFood + 0.1, 0.6, ease.linear), { color: P.marker, size: 76, align: 'center', rotate: -0.05, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      } else {
        const [vx, vy] = TH.toScreen(cam, TH.G.les.x, TH.G.les.y), [sx, sy] = TH.toScreen(cam, 780, 3000);
        TH.chip(ctx, api, 'STOMACH', sx + 150, sy, sx + 430, sy - 60, pop(t, tStom1, 0.5), { size: 56 });
      }
      showList = false;
    } else if (sh.n === 'reflux') {
      const k = ease.inOutSine(clamp(lt / (tTech - tStom2)));
      const c = { ro: [0.12, lerp(-6.2, -6.5, k), 0.05], ta: [0, -9.6, 0], fov: 1.45, roll: 0.12 * lt };
      const open = env(t, tAcid - 0.2, tTech + 0.5, 0.3, 0.3);
      const gasY = lerp(-10.5, -6.2, ease.inOutSine(clamp((t - tAcid + 0.1) / 1.2)));
      T3.draw3(ctx, api, this.eso, 'ESO', c, t, { uOpen: 0.55 * open, uGlowV: 0.3, uGas: prog(t, tAcid - 0.1, 0.4), uGasY: gasY, uAcid: 0.6 * open });
      T3.bokeh(ctx, t, 41, 5, 0.6, [200, 255, 120]);
      T3.artistic(ctx, api);
    } else if (sh.n === 'sinus' || sh.n === 'dripMap' || sh.n === 'sweet') {
      let cam, st = { coat: 0.7 };
      if (sh.n === 'sinus') { const k = ease.inOutSine(clamp(lt / (tDrain - tTech))); cam = { x: lerp(560, 540, k), y: lerp(480, 470, k), z: lerp(1.35, 1.45, k) }; st.sinusGlow = prog(t, tSinus - 0.1, 0.5) * (0.85 + 0.15 * Math.sin(t * 4)); }
      else if (sh.n === 'dripMap') { const k = ease.inOutSine(clamp(lt / (tBack - tDrain))); cam = { x: lerp(700, 730, k), y: lerp(760, 800, k), z: 1.45 }; st.sinusGlow = 0.5; st.drip = clamp((t - tDrain + 0.1) / 1.4); }
      else { const k = ease.inOutSine(clamp(lt / Math.max(1, api.duration - tYour))); cam = { x: lerp(420, 380, k), y: lerp(720, 740, k), z: lerp(1.25, 1.35, k) }; }
      api.stage(ctx, { gridOffset: [-cam.x * 0.2, -cam.y * 0.2] });
      TH.motes(ctx, t, cam, 40, 17);
      TH.world(ctx, api, cam, t, st);
      if (sh.n === 'dripMap') {
        const [x0, y0] = TH.toScreen(cam, 930, 640), [x1, y1] = TH.toScreen(cam, 925, 960);
        api.doodle.arrow(ctx, x0, y0, x1, y1, prog(t, tDrain + 0.1, 0.8, ease.inOutCubic), { color: P.lime, width: 9, bend: -30, seed: 14, head: 30 });
        api.doodle.text(ctx, 'drains down', x0 + 60, y0 + 170, prog(t, tDrain + 0.3, 0.6), { color: P.lime, size: 64, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12, rotate: 0.06 });
      }
      if (sh.n === 'sweet') {
        const [mx, my] = TH.toScreen(cam, 206, 772), sw = prog(t, tYour + 0.1, 1.0);
        for (let i = 0; i < 7; i++) {
          const k = ((t - tYour) * 0.22 + i / 7) % 1, x = mx - 60 - k * 520, y = my - 10 - Math.sin(k * 3 + i) * 40 - k * 80;
          TH.glow(ctx, x, y, 80 + 120 * k, TH.rgba('#ff9ccf', 0.6 * sw * Math.sin(Math.PI * k)));
        }
        ctx.save(); ctx.globalAlpha *= sw; ctx.strokeStyle = '#ffd6ec'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) { const k = ((t - tYour) * 0.3 + i / 6) % 1, x = mx - 120 - k * 420 + Math.sin(i * 7) * 40, y = my - 50 - k * 110 + Math.cos(i * 5) * 50, r = 13 * Math.sin(Math.PI * k); ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); }
        ctx.restore();
        const cd = prog(t, tSweet - 0.05, 0.6, ease.inOutCubic), cx = mx - 380, cy = my - 230, o = { color: P.pink, width: 8, seed: 21 };
        if (cd > 0) { api.doodle.circle(ctx, cx, cy, 44, 30, cd, o); api.doodle.stroke(ctx, [[cx - 44, cy], [cx - 90, cy - 28], [cx - 82, cy + 30], [cx - 44, cy]], clamp(cd * 1.5 - 0.3), { ...o, seed: 22 }); api.doodle.stroke(ctx, [[cx + 44, cy], [cx + 90, cy - 28], [cx + 82, cy + 30], [cx + 44, cy]], clamp(cd * 1.5 - 0.5), { ...o, seed: 23 }); }
        api.doodle.text(ctx, 'sweet', cx, cy + 110, prog(t, tSweet, 0.4), { color: '#ffb3d9', size: 64, align: 'center', stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
        TH.chip(ctx, api, 'SWEET, NOT BAD', null, null, mx - 260, my + 230, pop(t, tNot, 0.5), { size: 60, bg: '#ffb3d9' });
      }
      T3.bokeh(ctx, t, 43, 7, 1);
      if (sh.n !== 'sweet') T3.artistic(ctx, api);
    } else if (sh.n === 'drip3d') {
      const k = ease.inOutSine(clamp(lt / (tAnd - tBack)));
      const c = { ro: [lerp(0.6, 0.5, k), lerp(0.25, 0.1, k), lerp(1.3, 1.7, k)], ta: [0.3, -0.25, 4.3], fov: 1.5 };
      const drip = clamp((t - tBack + 0.6) / 1.8);
      T3.draw3(ctx, api, this.tun, 'TUNNEL', c, t, { uCoat: 0.85, uDrip: drip });
      const [x, y] = T3.project(c.ro, c.ta, c.fov, [0.38, 0.4, 4.25]);
      api.doodle.arrow(ctx, x + 170, y - 200, x + 170, y + 260, prog(t, tBack + 0.2, 0.8, ease.inOutCubic), { color: P.lime, width: 9, bend: -20, seed: 15, head: 30 });
      api.doodle.text(ctx, 'back of your throat', x + 190, y - 250, prog(t, tBack, 0.7, ease.linear), { color: P.lime, size: 60, align: 'center', stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12, rotate: -0.04 });
      T3.bokeh(ctx, t, 45, 5, 0.7);
      T3.artistic(ctx, api);
    } else {
      // the list as its own composition, with a glossy ketone molecule on "ketones"
      api.stage(ctx, { gridOffset: [-t * 12, -t * 6] });
      TH.motes(ctx, t, { x: t * 40, y: 0 }, 40, 19);
      const mk = pop(t, tKet, 0.6);
      if (mk > 0) { TH.glow(ctx, 1320, 560, 420 * Math.min(1, mk), 'rgba(255,140,200,0.25)'); ketone(ctx, api, 1320, 560, 1.0 * Math.min(1.05, mk), t); TH.chip(ctx, api, 'KETONES', null, null, 1320, 860, mk, { size: 60, bg: '#ffb3d9' }); }
      showList = 'big';
      T3.bokeh(ctx, t, 47, 7, 1);
    }
    // the list of non-mouth sources
    if (showList) {
      const big = showList === 'big';
      const lx = big ? 180 : 1310, ly = big ? 330 : 250, gap = big ? 150 : 110, size = big ? 64 : 46;
      const starts = [tAcid + 0.02, tSinus, tDiab];
      const items = [[1, 'ACID REFLUX'], [2, 'SINUSES'], [3, t < tKet ? 'DIABETES' : 'DIABETES · KETONES']];
      items.forEach(([n, str], i) => {
        const p = big ? (i < 2 ? 1 : pop(t, starts[i], 0.5)) : pop(t, starts[i], 0.5);
        const active = t >= starts[i] && t < (i < 2 ? starts[i + 1] : 1e9) ? 1 : 0;
        TH.listChip(ctx, api, n, str, lx, ly + i * gap, p, active, { size });
      });
    }
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });
    // acetone (a ketone), ball and stick: C=O with two CH3 groups; glossy balls
    function ketone(ctx, api, x, y, s, t) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.15 * Math.sin(t * 0.8)); ctx.scale(s, s);
      const ball = (bx, by, r, c1, c2) => { const g = ctx.createRadialGradient(bx - r * 0.35, by - r * 0.4, r * 0.1, bx, by, r); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); };
      const bond = (x1, y1, x2, y2, w = 16, off = 0) => { const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a) * off, ny = Math.cos(a) * off; ctx.strokeStyle = 'rgba(235,235,245,0.85)'; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny); ctx.stroke(); };
      const C0 = [0, 20], O = [0, -140], C1 = [-150, 110], C2 = [150, 110];
      bond(...C0, ...O, 12, -14); bond(...C0, ...O, 12, 14); bond(...C0, ...C1); bond(...C0, ...C2);
      const Hs = [[-240, 60], [-180, 210], [-110, 200], [240, 60], [180, 210], [110, 200]];
      Hs.forEach(([hx, hy], i) => bond(...(i < 3 ? C1 : C2), hx, hy, 10));
      Hs.forEach(([hx, hy]) => ball(hx, hy, 30, '#ffffff', '#aab3c4'));
      ball(...C1, 56, '#8a8f9c', '#2b2e38'); ball(...C2, 56, '#8a8f9c', '#2b2e38'); ball(...C0, 60, '#8a8f9c', '#2b2e38');
      ball(...O, 62, '#ff9a9a', '#b3202a');
      ctx.restore();
    }
  },
});
