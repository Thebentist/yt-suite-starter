// @use videos/bad-breath-for-good/scenes/throat/_lib.js
// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js
/* dont-dig (words 3829-3918): "Also, please don't go digging with like a cotton swab or your fingers or scrapers. And
 * because your tonsils are very, very delicate, they can get scratchy easily, bleeding, even get infected super, super
 * easy."
 * Cut on the words:
 *   1 start      the tonsil in macro: DON'T DIG
 *   2 "cotton"   the tonsil out of focus behind; a cotton swab, a finger and a pick line up on their words, each crossed out
 *   3 "because"  close and soft on the tonsil: "very, very delicate"
 *   4 "scratchy" it flinches: thin red scratches (SCRATCH)
 *   5 "bleeding" a new angle: one small red bead (BLEED), nothing gory
 *   6 "infected" wide: the tonsil reddens and swells (INFECTION) */
defineScene({
  name: 'dont-dig',
  anchor: { word: 3829, offset: -0.15 },
  anchorEnd: { word: 3919, offset: -0.15 },
  tail: 0.5,
  setup(api) { this.ton = window.THROAT3D.world3(api, 'TONSIL', { steps: 140 }); },
  draw(ctx, t, api) {
    const TH = window.THROAT, T3 = window.THROAT3D, { P, prog, pop, ease, env, clamp, lerp } = api;
    const W = (i, o = 0) => api.at(i, o);
    const tDont = W(3831), tCotton = W(3837), tFingers = W(3841), tScrapers = W(3843), tBecause = W(3900), tVery = W(3904), tDelicate = W(3906),
      tScr = W(3910), tBleed = W(3912), tInf = W(3915);
    const sh = T3.shot(t, [{ t: -1, n: 'wide' }, { t: tCotton, n: 'tools' }, { t: tBecause, n: 'delicate' }, { t: tScr, n: 'scratch' }, { t: tBleed, n: 'bleed' }, { t: tInf, n: 'infect' }]);
    const lt = sh.lt;
    const stones = { uS0: [-1.05, -0.03, -0.85, 0.12], uS1: [0.45, -0.03, 1.25, 0.13] };
    let flinch = 0; for (const h of [tScr, tBleed, tInf]) flinch = Math.max(flinch, env(t, h, h + 0.45, 0.07, 0.35));
    const cams = {
      wide: { ro: [0.3, 2.3, -2.9], ta: [0, -0.2, 0.2], fov: 1.8 },
      delicate: { ro: [0.9, 1.1, -1.6], ta: [0.6, -0.1, 0.1], fov: 1.75 },
      scratch: { ro: [-0.2, 1.0, -1.9], ta: [-0.3, -0.1, -0.6], fov: 1.7 },
      bleed: { ro: [1.9, 0.8, -0.7], ta: [1.15, -0.05, 0.2], fov: 1.7 },
      infect: { ro: [0.1, 2.9, -3.4], ta: [0, -0.2, 0.3], fov: 1.8 },
    };
    const base = cams[sh.n === 'tools' ? 'wide' : sh.n];
    const push = ease.inOutSine(clamp(lt / 2.5)) * 0.12;
    const c = { ro: base.ro.map((v, i) => v + (base.ta[i] - v) * push), ta: base.ta, fov: base.fov };
    const u = { ...stones, uHead: sh.n === 'delicate' ? 0.15 : 0.3, uScratch: prog(t, tScr, 0.35), uBleed: prog(t, tBleed, 0.35, ease.outBack), uRed: 0.85 * prog(t, tInf, 0.5) + 0.2 * flinch, uSq: 0.3 * flinch };
    if (sh.n === 'tools') ctx.filter = 'blur(10px)';
    T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, u);
    ctx.filter = 'none';
    if (sh.n === 'tools') {
      ctx.fillStyle = 'rgba(8,6,18,0.35)'; ctx.fillRect(0, 0, 1920, 1080);
      const tools = [{ k: 'swab', t0: tCotton, x: 420 }, { k: 'finger', t0: tFingers, x: 960 }, { k: 'pick', t0: tScrapers, x: 1500 }];
      for (const tl of tools) {
        const p = prog(t, tl.t0 - 0.1, 0.35, ease.outBack); if (p <= 0) continue;
        const y = lerp(760, 540, Math.min(1, p));
        ctx.save(); ctx.globalAlpha = clamp(p * 2); ctx.translate(tl.x, y); ctx.rotate(-0.55);
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
        if (tl.k === 'swab') TH.icons.swab(ctx, 0, 0, 440, 0); else if (tl.k === 'finger') TH.icons.finger(ctx, 0, 0, 420, 0); else TH.icons.pick(ctx, 0, 0, 440, 0);
        ctx.restore();
        api.doodle.cross(ctx, tl.x, 540, 120, prog(t, tl.t0 + 0.2, 0.3), { color: P.marker, width: 18, seed: 4 + tl.x });
      }
      TH.chip(ctx, api, "DON'T DIG", null, null, 960, 170, 1, { size: 70, bg: P.red, color: '#ffffff' });
    } else {
      if (sh.n === 'wide') TH.chip(ctx, api, "DON'T DIG", null, null, 960, 170, pop(t, tDont, 0.5), { size: 70, bg: P.red, color: '#ffffff' });
      if (sh.n === 'delicate') { TH.glow(ctx, 960, 560, 800, 'rgba(255,230,240,0.08)'); api.doodle.text(ctx, 'very, very delicate', 960, 900, prog(t, tVery, 0.8, ease.linear), { color: '#ffe9f0', size: 82, align: 'center', rotate: -0.03, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 }); }
      if (sh.n === 'infect') { const inf = prog(t, tInf, 0.5); TH.glow(ctx, 960, 600, 900, `rgba(255,50,60,${0.22 * inf * (0.75 + 0.25 * Math.sin(t * 7))})`); }
      const labels = [['SCRATCH', tScr], ['BLEED', tBleed], ['INFECTION', tInf]];
      labels.forEach(([str, t0], i) => { const p = pop(t, t0, 0.4); if (p > 0) TH.chip(ctx, api, str, null, null, 260, 320 + i * 170, p, { size: 72, bg: P.red, color: '#ffffff', align: 'left' }); });
    }
    T3.bokeh(ctx, t, 81, 6, 0.7);
    T3.artistic(ctx, api);
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });
  },
});
