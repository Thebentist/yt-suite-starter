// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
/* research-weak (words 2418-2465): "to be fair, I don't want to oversell this. The research on fixing bad breath is
 * honestly not great. There's a ton of small studies, and even big studies ... really just kind of said that
 * everything was kind of weak." A headline builds, "not great" in marker; a rain of small papers piles up, a few big
 * ones thud down, a magnifier sweeps the pile, the review card slides up (COCHRANE REVIEW · 2019 · 44 TRIALS) and the
 * red stamp EVIDENCE: WEAK slams on "kind of weak". Source: Cochrane 2019, 44 trials, 1,809 people, low to very-low
 * certainty for every intervention (research-notes row 11).
 */
let DATA, smallSpr, bigSpr, cardSpr, papers, bigs, T, SHOTS;

defineScene({
  name: 'research-weak',
  anchor: { word: 2418, offset: -0.15 },
  anchorEnd: { word: 2488, offset: -0.15 },
  tail: 0.1,                                   // a few frames past the handoff (the assembler trims)
  setup(api) {
    DATA = window.DATA.init(api);
    T = { fair: 0.08, oversell: api.at(2426), research: api.at(2429), fixing: api.at(2431), bad: api.at(2432), great: api.at(2437) - 0.15, small: api.at(2442), big: api.at(2446), looked: api.at(2449), said: api.at(2459), weak: api.at(2465) };
    SHOTS = [0, T.research - 0.12, T.small - 0.3, T.looked - 0.12, T.said - 0.25];
    const { P } = api;
    smallSpr = [0, 1, 2].map((k) => DATA.paperSheet(118, 152, { seed: 'sp' + k, color: ['#f3eee2', '#efe9dc', '#f6f2e8'][k], draw(g, w, h) {
      g.fillStyle = ['#7c5cff', '#46d58a', '#ff9f43'][k]; g.fillRect(10, 10, w - 20, 6);
      DATA.textBars(g, 12, 26, w - 24, 2, { seed: 'st' + k, lh: 14, th: 7, color: 'rgba(27,26,34,0.5)' });
      DATA.textBars(g, 12, 60, w - 24, 6, { seed: 'sb' + k, lh: 12, th: 4 });
      g.strokeStyle = 'rgba(27,26,34,0.3)'; g.lineWidth = 1.5; g.strokeRect(12, 136 - 30, 40, 30);
    } }));
    bigSpr = [0, 1].map((k) => DATA.sprite(250, 320, (g) => {
      // a thick bound report: stacked page edges + cover
      for (let i = 6; i >= 1; i--) { g.fillStyle = i % 2 ? '#d9d2c2' : '#e8e2d4'; g.fillRect(6 + i * 2, 10 + i * 2.2, 226, 296); }
      const cov = DATA.paperSheet(226, 296, { seed: 'bg' + k, color: k ? '#efe9dc' : '#f3eee2', draw(gg, w, h) {
        gg.fillStyle = k ? '#2f3a8f' : '#5b3aa6'; gg.fillRect(0, 0, w, 64);
        DATA.textBars(gg, 18, 88, w - 36, 2, { seed: 'bt' + k, lh: 22, th: 11, color: 'rgba(27,26,34,0.55)' });
        DATA.textBars(gg, 18, 150, w - 36, 9, { seed: 'bb' + k, lh: 14, th: 5 });
      } });
      g.drawImage(cov, 4, 6, 226, 296);
    }));
    cardSpr = DATA.paperSheet(860, 440, { seed: 'cochrane', draw(g, w, h) {
      g.fillStyle = '#1b1a22'; g.fillRect(0, 0, w, 86);
      api.text(g, 'COCHRANE REVIEW', 44, 58, { size: 44, weight: 700, color: '#f4f1ea', tracking: 3 });
      api.text(g, '2019', w - 44, 58, { size: 44, weight: 700, color: P.lime, tracking: 3, align: 'right' });
      api.text(g, 'A review of the trials on treating bad breath', 44, 150, { size: 38, weight: 400, family: 'serif', italic: true, color: 'rgba(27,26,34,0.75)' });
      api.text(g, '44', 44, 318, { size: 170, weight: 700, color: '#1b1a22', tracking: -2 });
      api.text(g, 'TRIALS', 250, 318, { size: 80, weight: 700, color: '#1b1a22', tracking: 2 });
      api.text(g, 'Certainty of the evidence:', 44, 382, { size: 34, weight: 600, family: 'body', color: 'rgba(27,26,34,0.75)' });
      api.text(g, 'low to very low, for every treatment', 44, 420, { size: 34, weight: 700, family: 'body', color: '#1b1a22' });
    } });
    const r = api.rand('pile');
    papers = Array.from({ length: 70 }, (_, i) => ({ k: i % 3, x: (r() - 0.5) * 7.5, z: (r() - 0.5) * 4.5 + 1, rot: (r() - 0.5) * 2.2, t0: T.small - 0.15 + (i / 70) * 1.0 + r() * 0.08, h0: 3 + r() * 3, spin: (r() - 0.5) * 5, y: 0.004 + i * 0.0004 }));
    bigs = [{ x: -1.3, z: 0.6, rot: -0.3, t0: T.big }, { x: 1.4, z: 0.9, rot: 0.35, t0: T.big + 0.12 }, { x: 0.1, z: 0.2, rot: 0.05, t0: T.big + 0.24 }];
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    const sh = DATA.shot(t, SHOTS), lt = sh.lt;
    const bgG = ctx.createLinearGradient(0, 0, 0, 1080); bgG.addColorStop(0, '#08071a'); bgG.addColorStop(0.55, '#141030'); bgG.addColorStop(1, '#07061a');
    ctx.fillStyle = bgG; ctx.fillRect(0, 0, 1920, 1080);
    const thud = (a, amp) => (t > a ? amp * Math.exp(-(t - a) * 9) * Math.sin((t - a) * 60) : 0);
    if (sh.i === 0) {
      // ---- handwritten aside in the dark
      DATA.glow(ctx, 960, 520, 900, P.lavender, 0.16);
      DATA.bokeh(ctx, t, { n: 9, seed: 'rw-a', alpha: 0.12, size: [160, 360], colors: [P.lavender, P.saliva] });
      const s = 1 + t * 0.03; ctx.save(); ctx.translate(960, 540); ctx.scale(s, s); ctx.translate(-960, -540);
      api.doodle.text(ctx, 'to be fair...', 960, 540, prog(t, T.fair, 0.9, ease.outCubic), { color: P.lavender, size: 150, align: 'center', rotate: -0.04 });
      DATA.caps(ctx, 'i don’t want to oversell this', 960, 680, { size: 46, align: 'center', color: P.dim, alpha: prog(t, T.oversell, 0.4), tracking: 8 });
      ctx.restore();
    } else if (sh.i === 1) {
      // ---- the headline, big, with the verdict in marker
      DATA.glow(ctx, 960, 520, 1000, P.purple, 0.14);
      const s = 1.04 - lt * 0.02; ctx.save(); ctx.translate(960, 500); ctx.scale(s, s); ctx.translate(-960, -500);
      const words = [['THE RESEARCH', T.research], ['ON FIXING', T.fixing], ['BAD BREATH', T.bad]];
      words.forEach(([w, at], i) => { const p = prog(t, at, 0.45, ease.outExpo); if (p > 0) api.text(ctx, w, 960, 330 + i * 150 + (1 - p) * 40, { size: 140, weight: 700, align: 'center', color: P.ink, tracking: 2, alpha: p, glow: 'rgba(167,139,250,0.3)', glowBlur: 30 }); });
      const ng = prog(t, T.great - 0.2, 0.7, ease.outCubic);
      if (ng > 0) { api.doodle.text(ctx, 'is honestly not great', 960, 800, ng, { color: P.marker, size: 92, align: 'center', rotate: -0.03 }); api.doodle.underline(ctx, 620, 1300, 830, prog(t, T.great + 0.3, 0.4), { color: P.marker, width: 8, seed: 3 }); }
      ctx.restore();
    } else {
      // ---- the desk: papers rain onto a dark floor (3D), big reports thud, then a light sweeps the pile
      let cam;
      if (sh.i === 2) cam = DATA.cam3({ pos: [0.3 - lt * 0.15, 5.6 - lt * 0.15, -5.4 + lt * 0.25], target: [0, 0, 1], f: 1250 });
      else if (sh.i === 3) cam = DATA.cam3({ pos: [-3.6 + lt * 0.9, 1.0, -2.6 + lt * 0.2], target: [0.5 + lt * 0.4, 0.05, 1.3], f: 1150 });
      else cam = DATA.cam3({ pos: [0, 6.5, -3.5], target: [0, 0, 1.1], f: 1250 });
      const cx = thud(T.big + 0.25, 5) + thud(T.weak, 6), cy = thud(T.big + 0.27, 7) + thud(T.weak + 0.02, 10);
      ctx.save(); ctx.translate(cx, cy);
      DATA.glow(ctx, 960, 480, 1100, P.purple, 0.14);
      DATA.floorGrid(ctx, cam, { step: 0.5, x: [-8, 8], z: [-4, 12], fog: 18, alpha: 0.24, color: '#7a6cff', wRef: 170 });
      // the search light
      const sw = sh.i === 3 ? lerp(-3.2, 3.2, ease.inOutSine(clamp(lt / (SHOTS[4] - SHOTS[3])))) : null;
      if (sw != null) { const q = cam.project(sw, 0, 1.2); if (q) DATA.lightPool(ctx, q.x, q.y, 1.6 * q.s, 0.7 * q.s, '#fff2c8', 0.45); }
      for (const p of papers) {
        const k = prog(t, p.t0, 0.6, ease.outCubic); if (k <= 0) continue;
        const y = p.y + p.h0 * (1 - ease.outCubic(clamp((t - p.t0) / 0.6))) ;
        const lit = sw != null ? Math.max(0, 1 - Math.abs(p.x - sw) / 1.3) : 0;
        DATA.sprite3(ctx, cam, smallSpr[p.k], p.x, y, p.z, 0.55, 0.71, p.rot + (1 - k) * p.spin, { tilt: (1 - k) * 0.9, shadow: k > 0.9 ? 0.6 : 0, shade: 0.3 - 0.3 * lit - (sh.i === 4 ? -0.25 : 0) });
      }
      for (const [i, b] of bigs.entries()) {
        const k = prog(t, b.t0, 0.3, ease.inQuad); if (k <= 0) continue;
        DATA.sprite3(ctx, cam, bigSpr[i % 2], b.x, 0.06 + (1 - k) * 3.5 + i * 0.02, b.z, 1.15, 1.47, b.rot, { shadow: 0.8, shade: sh.i === 4 ? 0.5 : (sw != null ? 0.3 - 0.3 * Math.max(0, 1 - Math.abs(b.x - sw) / 1.3) : 0.12) });
      }
      ctx.restore();
      if (sh.i === 2) {
        api.label(ctx, 'SMALL STUDIES', 360, 180, { size: 50, p: pop(t, T.small, 0.5), bg: P.ink, color: P.black, rotate: -0.03 });
        api.label(ctx, 'BIG STUDIES', 1560, 180, { size: 50, p: pop(t, T.big, 0.5), bg: P.ink, color: P.black, rotate: 0.03 });
      }
      if (sh.i === 3) DATA.caps(ctx, 'i looked at all the small studies', 960, 170, { size: 46, align: 'center', alpha: prog(t, T.looked, 0.4), tracking: 10 });
      if (sh.i === 4) {
        // the review card rises toward the camera, then the stamp
        const cd = prog(t, SHOTS[4], 0.7, ease.outExpo);
        if (cd > 0) DATA.drawPaper(ctx, cardSpr, 960 + cx, lerp(1500, 560, cd) + cy, { rot: lerp(0.15, -0.02, cd), shadow: 70, scale: lerp(0.8, 1.35, cd) });
        const sp = prog(t, T.weak - 0.12, 0.2, ease.linear);
        DATA.stamp(ctx, 'WEAK', 1320 + cx, 610 + cy, sp, { size: 150, top: 'EVIDENCE:', rot: -0.14, color: P.marker });
      }
    }
    DATA.source(ctx, t, 'Cochrane systematic review, 2019 · 44 trials, 1,809 people · low to very-low certainty evidence for every treatment', { at: 0.5, pill: sh.i === 4 });
    DATA.finish(ctx, t);
  },
});
