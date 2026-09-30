// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
/* scraper-vs-brush (words 2488-2551): "if you're thinking about a tongue scraper specifically, I'm sure most of you guys
 * are. The studies do say that using a tongue scraper is better than a toothbrush, but not by much. And the problem is
 * it wears right off, in that, you know, the coating just comes right back. So it's something that you have to do
 * every single day."
 * Shots on the words: a hero steel scraper turning under a rim light -> two papers (the studies) -> 3D bars on the data
 * floor, SCRAPER a little taller than TOOTHBRUSH ("not by much", close on the gap) -> a stopwatch runs and both bars
 * drain before the 30-minute mark (wears right off) -> a week of lit tiles: EVERY SINGLE DAY.
 * Bar heights follow one Cochrane trial (42% vs 33% less sulfur gas); no numbers on the bars.
 * Source: Outhouse et al., Cochrane 2006 (research-notes row 11).
 */
let DATA, T, SHOTS, paperSpr, scraperSpr, brushSpr;

defineScene({
  name: 'scraper-vs-brush',
  anchor: { word: 2488, offset: -0.15 },
  anchorEnd: { word: 2552, offset: -0.15 },     // butts against teeth/alcohol-mouthwash
  tail: 0.1,                                   // a few frames past the handoff (the assembler trims)
  setup(api) {
    DATA = window.DATA.init(api);
    T = { scraper: api.at(2495), guys: api.at(2502), studies: api.at(2505), sBar: api.at(2511), better: api.at(2514), brush: api.at(2517), notMuch: api.at(2519), problem: api.at(2524),
      wears: api.at(2528), coating: api.at(2536), back: api.at(2539), so: api.at(2541), every: api.at(2549), day: api.at(2551) };
    SHOTS = [0, T.studies - 0.12, T.sBar - 0.2, T.notMuch - 0.1, T.problem - 0.1, T.so - 0.1];
    paperSpr = DATA.paperSheet(340, 440, { seed: 'svb', draw(g, w, h) { g.fillStyle = '#7c5cff'; g.fillRect(28, 28, w - 56, 14); DATA.textBars(g, 30, 70, w - 60, 2, { seed: 'svt', lh: 34, th: 16, color: 'rgba(27,26,34,0.55)' }); DATA.textBars(g, 30, 160, w - 60, 10, { seed: 'svb', lh: 24, th: 8 }); } });
    scraperSpr = DATA.sprite(420, 420, (g) => { g.translate(210, 200); DATA.steelScraper(g, 360, { grip: api.P.lime }); });
    brushSpr = DATA.sprite(200, 420, (g) => { g.translate(100, 230); DATA.icons.toothbrush(g, 0, 0, 170, { rot: 0 }); });
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    const sh = DATA.shot(t, SHOTS), lt = sh.lt;
    const bgG = ctx.createLinearGradient(0, 0, 0, 1080); bgG.addColorStop(0, '#08071a'); bgG.addColorStop(0.55, '#141030'); bgG.addColorStop(1, '#07061a');
    ctx.fillStyle = bgG; ctx.fillRect(0, 0, 1920, 1080);
    const V = { s: 0.42, b: 0.33 };                          // bar heights (fraction of the full scale)
    const drain = 1 - prog(t, T.wears, 1.6, ease.inOutCubic);

    if (sh.i === 0) {
      // ---- hero: the steel scraper turning under a rim light, bokeh behind
      DATA.glow(ctx, 960, 500, 900, P.lavender, 0.22);
      DATA.bokeh(ctx, t, { n: 10, seed: 'svb-bk', alpha: 0.14, size: [160, 380], colors: [P.lavender, P.lime] });
      const turn = 0.8 + 0.2 * Math.cos(t * 1.1), s = 1.55 + t * 0.05;
      ctx.save(); ctx.translate(960, 450); ctx.rotate(-0.35 + Math.sin(t * 0.6) * 0.05); ctx.scale(turn * s, s);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 30;
      ctx.drawImage(scraperSpr, -210, -210, 420, 420); ctx.restore();
      // a moving specular glint
      DATA.glow(ctx, 960 + Math.sin(t * 1.3) * 120, 360, 140, '#ffffff', 0.25);
      api.label(ctx, 'TONGUE SCRAPER', 960, 900, { size: 64, align: 'center', p: pop(t, T.scraper, 0.5) });
      DATA.caps(ctx, 'most of you are thinking about it', 960, 990 - 30, { size: 34, align: 'center', color: P.dim, alpha: prog(t, T.guys - 0.2, 0.4), tracking: 6 });
    } else if (sh.i === 1) {
      // ---- the studies: two papers under a lamp
      DATA.glow(ctx, 900, 400, 900, '#ffc98a', 0.14);
      const s = 1 + lt * 0.04;
      ctx.save(); ctx.translate(960, 560); ctx.scale(s, s); ctx.translate(-960, -560);
      DATA.drawPaper(ctx, paperSpr, 800, 580, { rot: -0.1, shadow: 50 }); DATA.drawPaper(ctx, paperSpr, 1110, 600, { rot: 0.08, shadow: 50 });
      ctx.restore();
      api.label(ctx, 'THE STUDIES SAY', 960, 170, { size: 56, align: 'center', p: pop(t, T.studies, 0.5), bg: P.ink, color: P.black });
    } else if (sh.i >= 2 && sh.i <= 4) {
      // ---- 3D bars on the data floor
      let cam;
      if (sh.i === 2) cam = DATA.cam3({ pos: [2.2 - lt * 0.2, 2.3, -6.4 + lt * 0.2], target: [0, 1.3, 0], f: 1300 });
      else if (sh.i === 3) cam = DATA.cam3({ pos: [1.6, 2.6, -2.6], target: [0.2, 2.15, 0.2], f: 1400 });
      else cam = DATA.cam3({ pos: [-3.2 + lt * 0.2, 2.4, -6.4], target: [0.8, 1.2, 0], f: 1250 });
      DATA.glow(ctx, 960, 560, 1100, P.purple, 0.14);
      DATA.floorGrid(ctx, cam, { step: 0.5, x: [-7, 7], z: [-4, 12], fog: 18, alpha: 0.28, color: '#7a6cff', wRef: 170 });
      const H = 5.0, up = (at) => prog(t, at, 0.8, ease.outCubic);
      const hS = V.s * H * up(T.sBar) * drain, hB = V.b * H * up(T.brush) * drain;
      // scale line (full)
      DATA.neon(ctx, () => DATA.path3(ctx, cam, [[-1.6, 0.005, -0.6], [1.6, 0.005, -0.6]]), '#b7a8ff', 1.5, { alpha: 0.5 });
      DATA.box3(ctx, cam, 0.35, -0.5, 1.35, 0.5, hB, P.saliva, { glow: 0.6 * up(T.brush) });
      DATA.box3(ctx, cam, -1.35, -0.5, -0.35, 0.5, hS, P.lime, { glow: 0.7 * up(T.sBar) });
      // riders: the scraper and the toothbrush on top of their bars
      const top = (x, h) => cam.project(x, h + 0.05, 0);
      const qs = top(-0.85, hS), qb = top(0.85, hB);
      if (qs && t > T.sBar) { ctx.save(); ctx.translate(qs.x, qs.y); const k = 0.9 * qs.s / 220 * pop(t, T.sBar, 0.5); ctx.scale(k, k); ctx.rotate(-0.2); ctx.drawImage(scraperSpr, -210, -380, 420, 420); ctx.restore(); }
      if (qb && t > T.brush) { ctx.save(); ctx.translate(qb.x, qb.y); const k = 0.85 * qb.s / 220 * pop(t, T.brush, 0.5); ctx.scale(k, k); ctx.rotate(0.35); ctx.drawImage(brushSpr, -100, -420, 200, 420); ctx.restore(); }
      // labels at the bar feet
      const f1 = cam.project(-0.85, 0, -0.75), f2 = cam.project(0.85, 0, -0.75);
      if (sh.i === 2) {
        if (f1) api.label(ctx, 'TONGUE SCRAPER', f1.x, f1.y + 40, { size: 44, align: 'center', p: pop(t, T.sBar, 0.5) });
        if (f2) api.label(ctx, 'TOOTHBRUSH', f2.x, f2.y + 40, { size: 44, align: 'center', p: pop(t, T.brush, 0.5), bg: P.saliva });
        DATA.caps(ctx, 'sulfur gases reduced', 960, 130, { size: 40, align: 'center', color: P.dim, tracking: 8 });
        const bt = prog(t, T.better, 0.5, ease.outCubic); if (bt > 0 && qs) api.doodle.text(ctx, 'better', qs.x - 260, qs.y - 60, bt, { color: P.lime, size: 70, rotate: -0.08, stroke: 'rgba(0,0,0,0.5)', strokeWidth: 10 });
      }
      if (sh.i === 3) {
        // close on the gap between the two tops
        const a = cam.project(-0.35, V.s * H * drain, -0.5), b = cam.project(0.35, V.b * H * drain, -0.5);
        if (a && b) { const x = (a.x + b.x) / 2 + 140, nb = prog(lt, 0.05, 0.5, ease.inOutCubic);
          api.doodle.stroke(ctx, [[a.x + 10, a.y], [x, a.y], [x, b.y], [b.x - 10, b.y]], nb, { color: P.marker, width: 9, seed: 14 });
          api.doodle.text(ctx, 'not by much', x + 24, (a.y + b.y) / 2 + 18, prog(lt, 0.3, 0.6), { color: P.marker, size: 62, stroke: 'rgba(0,0,0,0.5)', strokeWidth: 10 }); }
      }
      if (sh.i === 4) {
        // the stopwatch: under 30 minutes
        const W = { x: 1480, y: 420, r: 190 }, run = prog(t, T.wears, 1.7, ease.inOutSine) * 0.45;
        const wk = pop(t, SHOTS[4] + 0.05, 0.5);
        ctx.save(); ctx.translate(W.x, W.y); ctx.scale(wk, wk); ctx.translate(-W.x, -W.y);
        DATA.glow(ctx, W.x, W.y, 330, P.marker, 0.16);
        DATA.icons.stopwatch(ctx, W.x, W.y, W.r, run, { fill: run, fillColor: P.marker, handColor: P.ink });
        ctx.strokeStyle = P.marker; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(W.x, W.y + W.r * 0.7); ctx.lineTo(W.x, W.y + W.r); ctx.stroke();
        DATA.caps(ctx, '30 min', W.x, W.y + W.r + 60, { size: 40, align: 'center', color: P.marker, tracking: 4 });
        ctx.restore();
        api.label(ctx, 'WEARS RIGHT OFF', W.x, W.y - W.r - 70, { size: 50, align: 'center', p: pop(t, T.wears, 0.5), bg: P.marker, color: P.ink });
        const cb = pop(t, T.coating - 0.05, 0.5); if (cb > 0) api.label(ctx, 'THE COATING COMES RIGHT BACK', 620, 170, { size: 46, align: 'center', p: cb, bg: P.ink, color: P.black });
      }
    } else {
      // ---- a week of lit tiles
      DATA.glow(ctx, 960, 560, 1000, P.lime, 0.08);
      const cam = DATA.cam3({ pos: [0, 3.2 - lt * 0.1, -6.8 + lt * 0.2], target: [0, 0.3, 0.6], f: 1350 });
      DATA.floorGrid(ctx, cam, { step: 0.5, x: [-8, 8], z: [-4, 12], fog: 18, alpha: 0.26, color: '#7a6cff', wRef: 170 });
      const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      days.forEach((d, i) => {
        const x = (i - 3) * 1.05, ck = prog(t, T.every - 0.45 + i * 0.1, 0.3, ease.outCubic), rise = pop(t, SHOTS[5] + i * 0.05, 0.5);
        DATA.box3(ctx, cam, x - 0.42, -0.42, x + 0.42, 0.42, 0.18 * rise + 0.25 * ck, ck > 0 ? DATA.mix('#3b3660', P.lime, ck) : '#3b3660', { glow: ck });
        const q = cam.project(x, 0.18 * rise + 0.25 * ck + 0.02, 0), lab = cam.project(x, 0, -0.75);
        if (q && ck > 0) DATA.icons.check(ctx, q.x, q.y - 4, 0.55 * q.s, ck, { color: P.black, width: 0.1 * q.s });
        if (lab) DATA.caps(ctx, d, lab.x, lab.y + 50, { size: 38, align: 'center', color: ck > 0 ? P.lime : P.dim, alpha: rise, tracking: 2 });
      });
      DATA.chip(ctx, t, 'EVERY SINGLE DAY', 960, 180, T.every, { size: 70 });
    }
    DATA.source(ctx, t, 'Outhouse et al., Cochrane 2006 · 2 small trials · one: sulfur gases −42% with a scraper vs −33% with a toothbrush · effects lasted under 30 min', { at: SHOTS[1] });
    DATA.finish(ctx, t);
  },
});
