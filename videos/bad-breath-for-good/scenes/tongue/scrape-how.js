// @use videos/bad-breath-for-good/scenes/tongue/_lib.js
/* scrape-how (w2702-2857). How to scrape, on the same top-view tongue.
 * Words (scene s, cut of 21:58): start tongue scraping 2.44-2.93 | gunk and nastiness off your tongue 4.57-5.78, gums 6.60, teeth 7.43 |
 * all the things 7.77-8.12 | go as far back as you can 11.27-11.95 | scrape everything off 12.75-13.45 |
 * get everything off there 13.66-14.32 | rinse it off 14.61-14.9 | multiple times 15.30-15.64 | until you stop getting that
 * gunk off 15.95-17.92 | big gagger 18.75-18.91 | can't get too far back 19.96-20.52 | start ... in the middle 21.23-22.08 |
 * slowly work your way 23.15-23.75 | get used to that 24.30-24.92 | the goal ... clean that area good 25.47-26.97.
 * Cut at 27.19 (teeth: floss).
 * Beats: 0-11 the scraper arrives and waits below the tip while TONGUE / GUMS / TEETH tick; 11-11.6 it goes to the back;
 * 12.1 / 15.3 / 17.0 three pulls forward, each clearing a stripe, a rinse between the first two (the scraper collects less
 * each time); 18.4-25 the gag tip: the tongue is coated again for the diagram, dashed lines DAY 1 / DAY 2 / DAY 3 creep a little further back each day, START IN THE MIDDLE;
 * 25.5-27.2 the back third clean, sparkle. */
const CUT = TONGUE.cut('scrape-how', 28.0);   // cues follow their words in the current cut (see cues.json)
defineScene({
  name: 'scrape-how', duration: CUT.duration,
  setup(api) { this.T = TONGUE.build(api, { seed: 1 }); },
  // pull k (0,1,2): start time, lateral offset of the stripe, width scale
  pulls: [{ t0: 12.1, x: 0, w: 1.0 }, { t0: 15.3, x: -120, w: 0.9 }, { t0: 17.0, x: 118, w: 0.9 }],
  draw(ctx, t, api) {
    t = CUT.warp(t);
    const { P, clamp, lerp, ease, prog, pop, env } = api, ss = TONGUE.sstep, T = this.T, L = TONGUE.L;
    api.stage(ctx, { gridOffset: [-t * 8, -t * 4] });
    const X = 820, Y = 560, s = 0.98;
    ctx.save(); api.cam(ctx, t, { zoom0: 1.0, zoom1: 1.06, dur: 28, cx: 820, cy: 520 });
    const yBack = L / 2 - 0.9 * L, yFront = L / 2 - 0.38 * L;   // local y: where a pull starts (back) and ends
    // scraper state
    let sx = 0, sy = 520, sGunk = 0, sAlpha = 1, sRot = 0;
    const inA = ease.outCubic(clamp((t - 2.0) / 0.9));                  // "start tongue scraping": slides in from below
    sy = lerp(900, 470, inA);
    const toBack = ease.inOutCubic(clamp((t - 11.0) / 0.6)); sy = lerp(sy, yBack, toBack);   // "go as far back as you can"
    const P3 = this.pulls; let cleared = [];
    for (let k = 0; k < 3; k++) {
      const q = P3[k], pu = ease.inOutSine(clamp((t - q.t0) / 1.2)), back = ease.inOutCubic(clamp((t - q.t0 - 1.3) / 0.35));
      if (t >= q.t0) { sx = q.x; sy = lerp(yBack, yFront, pu); sGunk = pu * (1 - k * 0.3); }
      if (t >= q.t0 + 1.3 && k < 2) { sx = lerp(q.x, P3[k + 1].x, back); sy = lerp(yFront, yBack, back); sGunk = (1 - k * 0.3) * (1 - ss(q.t0 + 1.2, q.t0 + 1.5, t)); }
      if (t > q.t0) cleared.push({ x: q.x, w: q.w, y1: lerp(yBack, yFront + 60, pu) });
    }
    // between the first two pulls the scraper leaves for the rinse and comes back to the back for pull 2
    if (t > P3[0].t0 + 1.25 && t < P3[1].t0) {
      const o1 = ss(P3[0].t0 + 1.25, P3[0].t0 + 1.75, t), i1 = ss(P3[1].t0 - 0.6, P3[1].t0 - 0.05, t);
      sx = lerp(P3[0].x, P3[1].x, i1); sy = lerp(lerp(yFront, 900, o1), yBack, i1); sAlpha = Math.max(1 - o1, i1); sGunk = 1 - o1;
    }
    const out = ease.inCubic(clamp((t - 18.22) / 0.45)); if (t > 18.22) { sy = lerp(yFront, 900, out); sAlpha = 1 - out; }
    // the three pull tracks, used both to erase the coat (while the scraper is in use) and to show the result
    const reset = ss(18.45, 18.85, t);       // the gag tip needs the tongue coated again for the day-by-day diagram
    const finalClean = ss(25.45, 26.5, t);
    TONGUE.draw(ctx, T, {
      x: X, y: Y, s,
      coat: {
        amount: 1 - finalClean, reach: 0.72, color: [236, 228, 200], tint: 0.3,
        erase: (g) => {
          g.fillStyle = '#000';
          if (reset < 1) { g.globalAlpha = 1 - reset; for (const c of cleared) TFX.scraperSweep(g, c.x, yBack - 30, c.y1, 150 * c.w, 22); g.globalAlpha = 1; }
          // day-by-day zones: DAY 1 clears from the middle forward, DAY 2 and 3 a little further back each
          const dd = [ss(21.25, 21.85, t), ss(23.15, 23.75, t), ss(24.35, 24.95, t)], lines = [0.52, 0.6, 0.68];
          for (let k = 0; k < 3; k++) if (dd[k] > 0) { g.globalAlpha = dd[k] * 0.9; TFX.scraperSweep(g, 0, L / 2 - lines[k] * L, yFront + 90, 260, 22); }
          g.globalAlpha = 1;
        },
      },
      over: (g) => {
        // rinse water over the tongue (14.44 "rinse it off")
        const rn = env(t, 14.5, 15.6, 0.3, 0.35);
        if (rn > 0) TFX.salivaWash(g, t, rn, { vMin: 0.25, vMax: 0.92 });
        // gag tip diagram: the day lines
        const dg = env(t, 18.4, 27.6, 0.4, 0.3);
        if (dg > 0) {
          const lines = [[0.52, 'DAY 1', 21.2], [0.6, 'DAY 2', 23.1], [0.68, 'DAY 3', 24.3]];
          for (const [v, name, tt] of lines) {
            const p = prog(t, tt, 0.6, ease.inOutCubic); if (p <= 0) continue;
            const y = L / 2 - v * L, w = TONGUE.hw(v);
            g.save(); g.globalAlpha = dg * (1 - 0.6 * finalClean); g.setLineDash([22, 14]); g.lineWidth = 6; g.strokeStyle = P.lime; g.lineCap = 'round';
            g.beginPath(); g.moveTo(-w + 12, y); g.lineTo(lerp(-w + 12, w - 12, p), y); g.stroke(); g.setLineDash([]);
            g.restore();
          }
          // the gag zone at the very back (red haze) while talking about gagging (18.6-21)
          const gz = env(t, 18.6, 21.4, 0.4, 0.4);
          if (gz > 0) { g.save(); TONGUE.path(g); g.clip(); const y0 = L / 2 - 0.95 * L, rg = g.createLinearGradient(0, y0, 0, L / 2 - 0.75 * L); rg.addColorStop(0, `rgba(255,59,59,${0.55 * gz})`); rg.addColorStop(1, 'rgba(255,59,59,0)'); g.fillStyle = rg; g.fillRect(-300, y0 - 40, 600, 0.3 * L); g.restore(); }
        }
      },
    });
    // the scraper (in screen space, placed over the tongue)
    if (sAlpha > 0.01 && t > 1.9) {
      ctx.save(); ctx.globalAlpha = sAlpha;
      TFX.scraper(ctx, X + sx * s, Y + sy * s, s, { w: 150, bow: 22, armLen: 640, gunk: sGunk, rot: sRot });
      ctx.restore();
    }
    // rinse drops flicked off the scraper between pulls
    for (let k = 0; k < 2; k++) {
      const q = P3[k], ph = clamp((t - q.t0 - 1.25) / 0.7); if (ph <= 0 || ph >= 1) continue;
      for (let i = 0; i < 6; i++) { const a = -0.8 + i * 0.32, r = 40 + ph * 170, dx = X + q.x * s + Math.cos(a - 1.57) * r, dy = Y + yFront * s + 60 + Math.sin(a - 1.57) * r * -0.6 + ph * ph * 120;
        ctx.save(); ctx.globalAlpha = 1 - ph; ctx.fillStyle = P.saliva; ctx.beginPath(); ctx.ellipse(dx, dy, 9, 13, a, 0, 6.2832); ctx.fill(); ctx.restore(); }
    }
    // final sparkle on the clean back third
    for (let k = 0; k < 5; k++) { const [px, py] = TONGUE.pt([-0.4, 0.3, -0.1, 0.45, 0.05][k], [0.62, 0.7, 0.78, 0.8, 0.66][k]); TFX.sparkle(ctx, X + px * s, Y + py * s, 26 + 8 * Math.sin(t * 6 + k), env(t, 25.8 + k * 0.1, 28.2, 0.3, 0.3), '#f6ffd6'); }
    ctx.restore();

    // ---------------- labels (right side), mapped through the camera push where they point at the tongue
    const zc = 1 + 0.06 * ease.inOutSine(clamp(t / 28)), C = (x, y) => [820 + (x - 820) * zc, 520 + (y - 520) * zc];
    const RX = 1560;
    const hdr = (str, a, y = 170) => { if (a > 0) api.text(ctx, str, RX, y, { size: 44, color: P.dim, align: 'center', tracking: 3, alpha: a }); };
    // 1. the three places, ticked on their words
    const listA = env(t, 4.2, 10.4, 0.35, 0.35);
    if (listA > 0) {
      ctx.save(); ctx.globalAlpha = listA;
      const items = [['TONGUE', 5.75], ['GUMS', 6.6], ['TEETH', 7.4]];
      items.forEach(([name, tt], i) => { const y = 380 + i * 120, pp = pop(t, tt, 0.45); if (pp <= 0) return; TFX.checkBadge(ctx, api, RX - 150, y - 16, 40, pp); api.text(ctx, name, RX - 90, y + 4, { size: 60, alpha: clamp(pp), shadow: true }); });
      hdr('GET THE GUNK OFF', listA);
      ctx.restore();
    }
    // 2. the steps, as a running checklist
    const stA = env(t, 11.0, 18.3, 0.35, 0.35);
    if (stA > 0) {
      ctx.save(); ctx.globalAlpha = stA;
      hdr('HOW TO SCRAPE', stA);
      const steps = [['START AS FAR BACK', 'AS YOU CAN', 11.35], ['PULL FORWARD', '', 12.75], ['RINSE', '', 14.6], ['REPEAT', '', 15.3]];
      steps.forEach(([a, b, tt], i) => {
        const y = 330 + i * 130, pp = pop(t, tt, 0.45); if (pp <= 0) return;
        ctx.save(); ctx.translate(RX - 250, y); ctx.scale(pp, pp);
        ctx.fillStyle = P.lime; ctx.beginPath(); ctx.arc(0, -14, 30, 0, 6.2832); ctx.fill();
        api.text(ctx, String(i + 1), 0, 2, { size: 40, color: P.black, align: 'center' });
        ctx.restore();
        api.text(ctx, a, RX - 196, y + (b ? -12 : 2), { size: b ? 46 : 52, alpha: clamp(pp), shadow: true });
        if (b) api.text(ctx, b, RX - 196, y + 36, { size: 46, alpha: clamp(pp), shadow: true });
      });
      // "multiple times": x3 counter
      const n = t < 15.3 ? 1 : t < 17.0 ? 2 : 3, mx = pop(t, 15.3, 0.45);
      if (mx > 0) api.doodle.text(ctx, 'until no more gunk', RX - 196, 330 + 3 * 130 + 70, prog(t, 15.95, 0.8), { color: P.lime, size: 44, rotate: -0.02 });
      ctx.restore();
    }
    // 3. the gag tip
    const gA = env(t, 18.5, 27.7, 0.35, 0.3);
    if (gA > 0) {
      ctx.save(); ctx.globalAlpha = gA;
      api.doodle.text(ctx, 'big gagger?', RX, 190, prog(t, 18.72, 0.6), { color: P.ink, size: 64, align: 'center', rotate: -0.04 });
      const sm = pop(t, 21.25, 0.5);
      if (sm > 0) api.label(ctx, 'START IN THE MIDDLE', RX, 330, { size: 52, p: sm, align: 'center' });
      const wb = prog(t, 23.15, 0.7);
      if (wb > 0) api.doodle.text(ctx, 'a little further back each day', RX + 40, 445, wb, { color: P.lime, size: 40, align: 'center', rotate: -0.02 });
      // day labels at the ends of the lines
      for (const [v, name, tt] of [[0.52, 'DAY 1', 21.2], [0.6, 'DAY 2', 23.1], [0.68, 'DAY 3', 24.3]]) {
        const pp = pop(t, tt + 0.4, 0.45); if (pp <= 0) continue;
        const q = C(X + (TONGUE.hw(v) + 30) * s, Y + (L / 2 - v * L) * s);
        api.label(ctx, name, q[0] + 6, q[1], { size: 40, p: pp, bg: P.ink });
      }
      // back arrow (the direction of progress)
      const ba = prog(t, 23.3, 0.7, ease.inOutCubic);
      if (ba > 0) { const a0 = C(X - 330, Y + (L / 2 - 0.5 * L) * s), a1 = C(X - 330, Y + (L / 2 - 0.72 * L) * s); api.doodle.arrow(ctx, a0[0], a0[1], a1[0], a1[1], ba * (1 - finalClean), { color: P.lime, width: 8, bend: 16, seed: 9, head: 28 }); }
      ctx.restore();
    }
    // 4. the goal
    const gl = pop(t, 25.6, 0.5);
    if (gl > 0) api.label(ctx, 'CLEAN THE BACK', RX, 620, { size: 58, p: gl, align: 'center' });
    api.vignette(ctx, 0.5);
    api.grain(ctx, t, 0.055);
  },
});
