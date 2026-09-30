// @use videos/bad-breath-for-good/scenes/tongue/_lib.js
/* no-permanent (w4373-4394). "No permanent fix... do your part every day": a time-lapse on the same tongue.
 * The coating grows back overnight (moon), is scraped clean in the morning (sun), grows back again; a day counter
 * and a lime chip EVERY DAY on "every day".
 * Words (scene s, cut of 21:58): for now 0.41-0.63 | no permanent fix 1.63-2.54 | just got to do your part 3.22-4.49 | every day 4.78-4.83.
 * Cut at 5.00 (two-weeks, data group, starts at w4456 - 0.15), so EVERY DAY lands at design 3.75 (on "you just got to", ~3.6 s on the 00:55 cut)
 * to be readable for a second; the third morning check lands at 4.58. */
const CUT = TONGUE.cut('no-permanent', 5.9);   // cues follow their words in the current cut (see cues.json)
defineScene({
  name: 'no-permanent', duration: CUT.duration,
  setup(api) { this.T = TONGUE.build(api, { seed: 1 }); },
  // time-lapse clock: cycle phase c in [0, 1): 0-0.62 night (coat grows), 0.62-0.8 morning scrape, 0.8-1 day (clean)
  cycle(t) { const d = 1.6, u = Math.max(0, t - 0.1) / d; return { n: Math.floor(u), c: u - Math.floor(u) }; },
  draw(ctx, t, api) {
    t = CUT.warp(t);
    const { P, clamp, lerp, ease, prog, pop, env } = api, ss = TONGUE.sstep, T = this.T, L = TONGUE.L;
    const { n, c } = this.cycle(t), night = t < 0.1 ? 0 : 1 - ss(0.5, 0.66, c) + ss(0.94, 1.0, c);
    // stage tinted by the time of day
    api.stage(ctx, { gridOffset: [-t * 14, -t * 7], c1: TONGUE.rgba(TONGUE.mixRgb('#2a2250', '#15122b', night)), c2: '#0b0a18' });
    const X = 820, Y = 540, s = 0.9;
    ctx.save(); api.cam(ctx, t, { zoom0: 1.0, zoom1: 1.05, dur: 5.9, cx: 820, cy: 540 });
    const grow = t < 0.1 ? 0 : ss(0.02, 0.6, c);                    // overnight regrowth
    const scrapeK = t < 0.1 ? 0 : ss(0.64, 0.8, c);                  // morning scrape (blade pass)
    const yBack = L / 2 - 0.9 * L, yFront = L / 2 - 0.3 * L, yb = lerp(yBack, yFront, scrapeK);
    TONGUE.draw(ctx, T, { x: X, y: Y, s, coat: {
      amount: grow * (1 - ss(0.8, 0.84, c)), reach: lerp(0.2, 0.74, grow), color: [236, 228, 200], tint: 0.3,
      erase: (g) => { if (scrapeK <= 0) return; g.fillStyle = '#000'; TFX.scraperSweep(g, 0, yBack - 40, yb, 300, 22); },
    } });
    if (scrapeK > 0 && scrapeK < 1) TFX.scraper(ctx, X, Y + yb * s, s, { w: 300, bow: 22, armLen: 700, gunk: scrapeK });
    // morning sparkle
    const sp = env(c, 0.8, 0.96, 0.04, 0.05);
    if (sp > 0 && t > 0.2) for (let k = 0; k < 4; k++) { const [px, py] = TONGUE.pt([-0.4, 0.3, -0.05, 0.42][k], [0.62, 0.7, 0.78, 0.8][k]); TFX.sparkle(ctx, X + px * s, Y + py * s, 26, sp, '#f6ffd6'); }
    ctx.restore();

    // sky dial on the right: sun and moon orbiting, a day counter
    const DX = 1500, DY = 400, R = 170;
    ctx.save();
    ctx.strokeStyle = 'rgba(244,241,234,0.18)'; ctx.lineWidth = 3; ctx.setLineDash([6, 12]); ctx.beginPath(); ctx.arc(DX, DY, R, Math.PI, 0); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(244,241,234,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(DX - R - 40, DY); ctx.lineTo(DX + R + 40, DY); ctx.stroke();
    ctx.beginPath(); ctx.rect(DX - R - 60, DY - R - 80, 2 * R + 120, R + 80); ctx.clip();
    const ang = Math.PI + (t < 0.1 ? 0.05 : c) * Math.PI * 2;
    const body = (a, isSun) => {
      const bx = DX + Math.cos(a) * R, by = DY + Math.sin(a) * R; if (by > DY + 40) return;
      if (isSun) { const g = ctx.createRadialGradient(bx, by, 4, bx, by, 70); g.addColorStop(0, 'rgba(255,212,59,0.9)'); g.addColorStop(1, 'rgba(255,212,59,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 70, 0, 6.2832); ctx.fill();
        ctx.fillStyle = P.yellow; ctx.beginPath(); ctx.arc(bx, by, 34, 0, 6.2832); ctx.fill(); }
      else { ctx.fillStyle = '#e8e4ff'; ctx.beginPath(); ctx.arc(bx, by, 32, 0, 6.2832); ctx.fill(); ctx.fillStyle = TONGUE.rgba(TONGUE.mixRgb('#2a2250', '#15122b', night)); ctx.beginPath(); ctx.arc(bx + 14, by - 8, 28, 0, 6.2832); ctx.fill(); }
    };
    body(ang, false); body(ang + Math.PI, true);
    ctx.restore();
    const day = n + 1;
    api.text(ctx, 'DAY ' + day, DX, DY + 90, { size: 64, align: 'center', shadow: true });
    // a row of days; each gets its lime check when that morning's scrape is done
    for (let k = 0; k < 4; k++) {
      const bx = DX - 195 + k * 130, by = 640, tk = 0.1 + k * 1.6 + 0.8 * 1.6, done = k < 3 ? prog(t, tk, 0.35) : 0, a = clamp(prog(t, 0.1 + k * 0.08, 0.4));
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(11,10,24,0.7)'; api.roundRect(ctx, bx - 50, by - 50, 100, 100, 14); ctx.fill();
      ctx.strokeStyle = done > 0 ? P.lime : 'rgba(244,241,234,0.3)'; ctx.lineWidth = 4; api.roundRect(ctx, bx - 50, by - 50, 100, 100, 14); ctx.stroke(); ctx.restore();
      if (done > 0) api.doodle.check(ctx, bx, by + 4, 28, done, { color: P.lime, width: 9, seed: 7 + k, passes: 1 });
    }
    api.doodle.text(ctx, 'no permanent fix', DX, 150, prog(t, 1.62, 0.7), { color: P.ink, size: 58, align: 'center', rotate: -0.04 });
    const ed = pop(t, 3.75, 0.35);
    if (ed > 0) api.label(ctx, 'EVERY DAY', DX, 820, { size: 72, p: ed, align: 'center' });
    api.vignette(ctx, 0.5);
    api.grain(ctx, t, 0.055);
  },
});
