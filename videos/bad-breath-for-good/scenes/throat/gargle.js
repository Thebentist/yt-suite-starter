// @use videos/bad-breath-for-good/scenes/throat/_lib.js
// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js
/* gargle (words 4165-4287, with a cut): "Now, once these tonsil stones are out and clear, I would recommend gargling
 * with something, whether it's like salt water, warm saltwater rinse, or a alcohol free mouthwash. And what that does
 * is basically just keeps those holes clean so that more food and gunk can't form in there."
 * Cut on the words:
 *   1 start       3D macro: the last stone pops out of its pit on "out", the pits sparkle "out and clear!"
 *   2 "recommend" 3D inside the mouth: water rises at the back of the throat and bubbles (GARGLE)
 *   3 "whether"   a glass of warm water, salt pouring in (WARM SALT WATER)
 *   4 "or"        a generic rinse bottle marked NO ALCOHOL (ALCOHOL-FREE MOUTHWASH)
 *   5 "And"       3D macro, looking down on the clean, empty pits, each ringed lime (KEEPS THE HOLES CLEAN)
 *   6 "more"      bits of food drift toward the pits and get rinsed away (FOOD + GUNK, crossed out on "can't") */
defineScene({
  name: 'gargle',
  anchor: { word: 4165, offset: -0.15 },
  anchorEnd: { word: 4287, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) { const T3 = window.THROAT3D; this.ton = T3.world3(api, 'TONSIL', { steps: 140 }); this.tun = T3.world3(api, 'TUNNEL', { steps: 140 }); },
  draw(ctx, t, api) {
    const TH = window.THROAT, T3 = window.THROAT3D, { P, prog, pop, ease, env, clamp, lerp } = api;
    const W = (i, o = 0) => api.at(i, o);
    const tOut = W(4171), tClear = W(4173), tRec = W(4176), tGarg = W(4177), tWhether = W(4180), tSalt = W(4183), tWarm = W(4185), tOr = W(4188),
      tAlc = W(4190), tAnd = W(4265), tKeeps = W(4274), tHoles = W(4276), tMore = W(4280), tFood = W(4281), tCant = W(4284);
    const sh = T3.shot(t, [{ t: -1, n: 'out' }, { t: tRec, n: 'gargle' }, { t: tWhether, n: 'salt' }, { t: tOr, n: 'rinse' }, { t: tAnd, n: 'clean' }, { t: tMore, n: 'gunk' }]);
    const lt = sh.lt, end = { out: tRec, gargle: tWhether, salt: tOr, rinse: tAnd, clean: tMore, gunk: api.duration }[sh.n];
    const k = ease.inOutSine(clamp(lt / Math.max(0.4, end - sh.t)));
    const cr = T3.CRYPTS3[3];
    if (sh.n === 'out') {
      const c = { ro: [lerp(2.1, 1.95, k), lerp(1.0, 0.9, k), lerp(-0.9, -0.75, k)], ta: [cr[0], -0.05, cr[1]], fov: 1.7 };
      const o = prog(t, tOut - 0.15, 0.8, ease.inQuad), half = prog(t, tOut - 0.45, 0.3, ease.outBack);
      const sx = cr[0] + 1.3 * o, sy = lerp(-0.03, 0.12, Math.min(1, half)) + 1.0 * o - 1.3 * o * o, sz = cr[1] - 0.9 * o;
      T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, { uS0: o < 0.98 ? [sx, sy, sz, 0.15] : [0, 0, 0, 0], uHead: 0.3, uRing: 0.8 * prog(t, tClear - 0.1, 0.4) });
      const spk = env(t, tClear - 0.15, tRec + 0.2, 0.15, 0.4);
      if (spk > 0) {
        ctx.save(); ctx.globalAlpha = spk; ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
        T3.CRYPTS3.forEach(([x, z], i) => { const [px, py] = T3.project(c.ro, c.ta, c.fov, [x, 0.08, z]); if (!(px > 0 && px < 1920)) return; const r = 26 * (0.6 + 0.4 * Math.sin(t * 9 + i)); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px - r, py - 40); ctx.lineTo(px + r, py - 40); ctx.moveTo(px, py - 40 - r); ctx.lineTo(px, py - 40 + r); ctx.stroke(); });
        ctx.restore();
      }
      api.doodle.text(ctx, 'out and clear!', 1420, 250, prog(t, tClear - 0.1, 0.5, ease.linear), { color: P.lime, size: 84, align: 'center', rotate: -0.06, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      T3.bokeh(ctx, t, 101, 6, 0.8);
      T3.artistic(ctx, api);
    } else if (sh.n === 'gargle') {
      const c = { ro: [0.05, lerp(0.3, 0.26, k), lerp(-0.4, 0.0, k)], ta: [0, -0.3, 3.0], fov: 1.45 };
      T3.draw3(ctx, api, this.tun, 'TUNNEL', c, t, { uCoat: 0.6, uWater: 0.12 + 0.2 * prog(t, tRec - 0.1, 0.7) });
      // bubbles rising through the water
      const r = TH.rng(7);
      ctx.save();
      for (let i = 0; i < 40; i++) {
        const bx = 700 + r() * 520, spd = 90 + r() * 140, ph = r() * 10, rr = 6 + r() * 16, y = 1080 - ((t * spd + ph * 60) % 560);
        ctx.globalAlpha = 0.85 * prog(t, tRec, 0.4); ctx.strokeStyle = 'rgba(225,245,255,0.9)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(bx + Math.sin(t * 5 + i) * 10, y, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(bx + Math.sin(t * 5 + i) * 10 - rr * 0.3, y - rr * 0.3, rr * 0.25, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      TH.chip(ctx, api, 'GARGLE', null, null, 960, 160, pop(t, tGarg, 0.5), { size: 70, bg: '#8fd8ff' });
      T3.bokeh(ctx, t, 103, 6, 0.8, [150, 210, 255]);
      T3.artistic(ctx, api);
    } else if (sh.n === 'salt' || sh.n === 'rinse') {
      api.stage(ctx, { gridOffset: [-t * 10, -t * 5], c1: sh.n === 'salt' ? '#1a2240' : '#162238' });
      TH.motes(ctx, t, { x: t * 30, y: 0 }, 40, 105);
      TH.glow(ctx, 960, 560, 560, 'rgba(143,216,255,0.22)');
      // a soft reflective floor
      ctx.save(); const fg = ctx.createLinearGradient(0, 760, 0, 1080); fg.addColorStop(0, 'rgba(143,216,255,0.10)'); fg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = fg; ctx.fillRect(0, 760, 1920, 320); ctx.restore();
      const s = 1 + 0.04 * k;
      ctx.save(); ctx.translate(960, 560); ctx.scale(s, s); ctx.translate(-960, -560);
      // mirror reflection on the floor
      ctx.save(); ctx.globalAlpha = 0.14; ctx.translate(0, 1560); ctx.scale(1, -1);
      if (sh.n === 'salt') TH.icons.glass(ctx, 900, 560, 2.4, t, 0.72); else TH.icons.bottle(ctx, 960, 560, 2.3, '#8fd8ff');
      ctx.restore();
      TH.glow(ctx, 960, 560, 420, 'rgba(143,216,255,0.12)');
      if (sh.n === 'salt') {
        TH.icons.glass(ctx, 900, 560, 2.4, t, 0.72);
        TH.icons.shaker(ctx, 1230, 330, 1.9);
        const sf = env(t, tSalt - 0.1, tOr, 0.2, 0.3);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 16; i++) { const q = (t * 1.2 + i / 16) % 1; ctx.globalAlpha = sf * (1 - q); ctx.beginPath(); ctx.arc(lerp(1180, 950, q) + Math.sin(i * 3) * 18, lerp(250, 420, q) + q * q * 40, 5, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      } else {
        TH.icons.bottle(ctx, 960, 560, 2.3, '#8fd8ff');
        api.text(ctx, 'NO', 960, 640, { size: 64, color: '#1b1a22', align: 'center' });
        api.text(ctx, 'ALCOHOL', 960, 712, { size: 56, color: '#1b1a22', align: 'center' });
      }
      ctx.restore();
      if (sh.n === 'salt') TH.chip(ctx, api, 'WARM SALT WATER', null, null, 960, 960, pop(t, tWarm, 0.5), { size: 64, bg: '#8fd8ff' });
      else TH.chip(ctx, api, 'ALCOHOL-FREE MOUTHWASH', null, null, 960, 960, pop(t, tAlc, 0.5), { size: 64, bg: '#8fd8ff' });
      T3.bokeh(ctx, t, 107, 7, 1, [150, 210, 255]);
    } else {
      const clean = sh.n === 'clean';
      const c = clean ? { ro: [lerp(0.35, 0.25, k), lerp(2.6, 2.3, k), lerp(-1.6, -1.4, k)], ta: [0.05, -0.2, 0.35], fov: 1.8 }
        : { ro: [lerp(-1.6, -1.45, k), lerp(1.05, 0.95, k), lerp(-1.0, -0.9, k)], ta: [-0.6, -0.05, 0.0], fov: 1.75 };
      let parts = T3.parts([]);
      if (!clean) {
        const list = [];
        T3.CRYPTS3.forEach(([x, z], i) => {
          const q = clamp((t - tMore - i * 0.12) / 1.3); if (q <= 0) return;
          const into = Math.min(1, q / 0.55), away = Math.max(0, q - 0.55) / 0.45;
          list.push([lerp(x - 0.9, x - 0.18, ease.outCubic(into)) - 0.9 * away, lerp(0.55, 0.12, ease.outCubic(into)) + 0.6 * away, lerp(z - 0.5, z - 0.1, into) - 0.4 * away, 0.085 * (1 - away * away)]);
        });
        parts = T3.parts(list);
      }
      T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, { uP: parts, uWet: 1, uRing: clean ? 0.9 * prog(t, tKeeps - 0.1, 0.4) : 0.7, uHead: 0.3 });
      if (clean) TH.chip(ctx, api, 'KEEPS THE HOLES CLEAN', null, null, 960, 170, pop(t, tKeeps, 0.5), { size: 66 });
      else {
        const fg = pop(t, tFood - 0.02, 0.5);
        TH.chip(ctx, api, 'FOOD + GUNK', null, null, 480, 180, fg, { size: 60, bg: '#efe7c4' });
        api.doodle.cross(ctx, 480, 180, 90, prog(t, tCant, 0.4), { color: P.marker, width: 14, seed: 12 });
        // the rinse: a soft blue sheen sweeping across
        const sw = (t - tMore) * 0.9 % 1; TH.glow(ctx, lerp(200, 1800, sw), 650, 380, 'rgba(143,216,255,0.16)');
      }
      T3.bokeh(ctx, t, 109, 6, 0.8);
      T3.artistic(ctx, api);
    }
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });
  },
});
