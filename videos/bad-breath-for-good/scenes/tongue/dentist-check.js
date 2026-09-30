// @use videos/bad-breath-for-good/scenes/tongue/_lib.js
// @use videos/bad-breath-for-good/scenes/tongue/_lit.js
// @use videos/bad-breath-for-good/scenes/tongue/_props.js
/* dentist-check (w899-939), phase 2: six hard-cut framings of one lit world, each cut on a word.
 * Words (scene s, cut of 22:06): dentist 0.88, checks 1.25 | go 2.60, back 3.64 | Scrape 4.19, off 4.71 | little 5.35,
 * mirror 5.68, dry 6.81 | and 7.19, smell 7.69, that 8.00 | So 8.51, leads 9.01, back of the tongue 9.60-10.0.
 * The cut to papillae-fly is at 10.40 s (its start anchor): the push-in and the pink hand-off end there.
 * Shots: 1 wide, the mirror comes in (0) | 2 closer on the back third ("go", 2.55) | 3 macro scrape ("Scrape", 4.12) |
 * 4 hero shot of the little mirror, the gunk dries ("little", 5.3) | 5 a face in profile, rim-lit, sniffs ("and", 7.1) |
 * 6 wide, red circle on the back third, then a push into it ("So", 8.45). */
const CUT = TONGUE.cut('dentist-check', 11.36);   // cues follow their words in the current cut (see cues.json)
const SHOTS = [0, 2.55, 4.12, 5.3, 7.1, 8.45];
defineScene({
  name: 'dentist-check', duration: CUT.duration,
  setup(api) {
    const sc = Math.max(1, api.scale);
    this.T = TONGUE.buildLit(api, { res: sc * 1.3 }); TONGUE.buildTeethLit(api, this.T);
    this.BK = TONGUE.buildLit(api, { res: sc * 3.0, region: [0.42, 1] });
    this.B = PROPS.bokeh(api, 26, 'dc');
  },
  draw(ctx, t, api) {
    t = CUT.warp(t);
    const { P, clamp, lerp, ease, prog, pop, env } = api, ss = TONGUE.sstep, L = TONGUE.L;
    let k = 0; while (k < SHOTS.length - 1 && t >= SHOTS[k + 1]) k++;
    const t0 = SHOTS[k], t1 = SHOTS[k + 1] ?? CUT.duration, u = clamp((t - t0) / (t1 - t0));
    let cam = null;
    const view = (fx, fy, z, rot = 0) => { cam = { fx, fy, z, rot, c: Math.cos(rot), s: Math.sin(rot) }; };
    const proj = (x, y) => { const dx = (x - cam.fx) * cam.z, dy = (y - cam.fy) * cam.z; return [960 + dx * cam.c - dy * cam.s, 540 + dx * cam.s + dy * cam.c]; };
    const apply = (g) => { g.translate(960, 540); g.rotate(cam.rot); g.scale(cam.z, cam.z); g.translate(-cam.fx, -cam.fy); };
    const backdrop = (gx = 960, gy = 480, tint = [120, 40, 90]) => {
      api.stage(ctx, { grid: false, c1: '#140c22', c2: '#05040a' });
      const g = ctx.createRadialGradient(gx, gy, 40, gx, gy, 900); g.addColorStop(0, `rgba(${tint.join(',')},0.55)`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); PROPS.drawBokeh(ctx, this.B, t, 0.9);
    };
    // the mirror's path over the tongue (local units): in from the upper right, settles at the back, scrapes forward
    const xS = 36, yB = TONGUE.pt(0, 0.86)[1], yF = TONGUE.pt(0, 0.66)[1];
    const a1 = ease.inOutCubic(clamp((t - 0.55) / 2.9)), a2 = ease.inOutSine(clamp((t - 4.2) / 0.95));
    let mx = lerp(520, xS, a1), my = lerp(-640, yB, a1); my = lerp(my, yF, a2);
    const gunk = ss(4.3, 5.1, t), dry = ss(6.75, 7.35, t);
    const erase = (g) => { if (t < 4.2) return; g.fillStyle = '#000'; const n = Math.max(2, Math.ceil((my - yB + 20) / 4)); for (let i = 0; i <= n; i++) { const yy = lerp(yB - 20, my, i / n); g.globalAlpha = 0.5; g.beginPath(); g.ellipse(xS, yy, 62, 16, 0, 0, 6.2832); g.fill(); g.globalAlpha = 1; g.beginPath(); g.ellipse(xS, yy, 50, 12, 0, 0, 6.2832); g.fill(); } };
    const coat = { amount: 1, reach: 0.74, tint: [252, 246, 232], erase };
    const mirrorAt = (g, s = 1.9) => PROPS.mirror(g, mx, my, -0.62, s, { gunk, dry });

    if (k === 0) {   // 1 WIDE: tongue and teeth; the mirror comes in
      backdrop(960, 470);
      view(0, 30 - 20 * u, 1.0 + 0.05 * u, 0.03 - 0.03 * u);
      ctx.save(); apply(ctx); TONGUE.drawLit(ctx, this.T, { x: 0, y: 0, s: 1, teeth: 1, coat }); mirrorAt(ctx); ctx.restore();
    }
    if (k === 1) {   // 2 CLOSER: the back third; the mirror reaches all the way back
      backdrop(960, 420, [110, 50, 80]);
      view(10, -250 + 10 * u, 1.9 + 0.1 * u, -0.08);
      ctx.save(); apply(ctx); TONGUE.drawLit(ctx, this.BK, { x: 0, y: 0, s: 1, coat }); mirrorAt(ctx); ctx.restore();
      const [bx, by] = proj(-150, -300), [ax, ay] = proj(-150, -60);
      api.doodle.arrow(ctx, ax, ay, bx, by, prog(t, 3.05, 0.55, ease.inOutCubic), { color: P.lime, width: 8, bend: -30, seed: 4, head: 30 });
      api.doodle.text(ctx, 'all the way back', ax - 40, ay + 70, prog(t, 3.2, 0.6), { color: P.lime, size: 56, align: 'center', rotate: -0.04, stroke: 'rgba(6,4,12,0.6)', strokeWidth: 9 });
    }
    if (k === 2) {   // 3 MACRO: the scrape, shallow depth of field
      backdrop(960, 520, [140, 60, 80]);
      view(xS + 20, lerp(yB + 60, yF + 40, ease.inOutSine(u)), 3.3, 0.12);
      PROPS.tilt(ctx, api, (g) => { apply(g); TONGUE.drawLit(g, this.BK, { x: 0, y: 0, s: 1, coat }); mirrorAt(g); }, { focusY: 560, band: 160, fall: 300, blur: 10 });
      api.doodle.text(ctx, 'scrape', 1500, 220, prog(t, 4.25, 0.5), { color: P.ink, size: 64, align: 'center', rotate: -0.05 });
    }
    if (k === 3) {   // 4 HERO: the little mirror with its sample; it dries
      backdrop(760, 560, [90, 70, 120]);
      const rot = -0.55 + 0.08 * u, s = 5.2 + 0.25 * u;
      PROPS.tilt(ctx, api, (g) => PROPS.mirror(g, 700, 600, rot, s, { gunk: 1, dry, refl0: '#e8d8f0', refl1: '#8a6a9a' }), { focusY: 600, band: 200, fall: 300, blur: 12 });
      api.doodle.text(ctx, 'little mirror', 1420, 720, prog(t, 5.4, 0.6), { color: P.ink, size: 64, align: 'center', rotate: -0.05 });
      const ld = prog(t, 6.75, 0.6);
      if (ld > 0) api.doodle.text(ctx, 'let it dry' + '.'.repeat(1 + (Math.floor(t * 4) % 3)), 1420, 840, ld, { color: P.lime, size: 60, align: 'center', rotate: 0.02 });
    }
    if (k === 4) {   // 5 SNIFF: face in profile, rim-lit; the sample in the blurred foreground; the smell drifts to the nose
      api.stage(ctx, { grid: false, c1: '#120a1c', c2: '#040308' });
      const g = ctx.createRadialGradient(1500, 420, 60, 1500, 420, 800); g.addColorStop(0, 'rgba(167,139,250,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
      PROPS.drawBokeh(ctx, this.B, t, 0.6);
      const px = 1330 - 30 * u, py = 520;
      PROPS.profile(ctx, px, py, 1.05, { inhale: env(t, 7.7, 8.4, 0.2, 0.2) * 0.8 });
      ctx.save(); ctx.filter = 'blur(6px)'; PROPS.mirror(ctx, 900 + 30 * u, 700, 2.75, 3.0, { gunk: 1, dry: 1, refl0: '#d9c8e6', refl1: '#6a5078' }); ctx.restore();
      for (let q = 0; q < 5; q++) { const pq = clamp((t - 7.2 - q * 0.18) / 1.1); TFX.stink(ctx, api, lerp(930, px - 70, ease.inOutSine(pq)), lerp(660, 590, pq) - 14 * q, 90 - 8 * q, pq, q + 3); }
      api.doodle.text(ctx, 'sniff', px - 260, 330, prog(t, 7.72, 0.45), { color: P.ink, size: 62, align: 'center', rotate: -0.08 });
    }
    if (k === 5) {   // 6 WIDE -> PUSH: the back third circled, then the camera dives into it
      backdrop(960, 440);
      const push = ease.inCubic(clamp((t - 9.05) / 1.35));
      const z = lerp(1.02, 4.8, push), fx = lerp(0, 40, push), fy = lerp(-10, -250, ease.inOutSine(clamp((t - 8.7) / 1.4)));
      view(fx, fy, z, lerp(0, 0.06, push));
      const T = z > 1.9 ? this.BK : this.T;
      ctx.save(); apply(ctx); TONGUE.drawLit(ctx, T, { x: 0, y: 0, s: 1, teeth: z > 1.9 ? 0 : 1 - push * 2, coat: { ...coat, amount: 1 - ss(9.7, 10.3, t) } }); ctx.restore();
      const rc = prog(t, 8.55, 0.7, ease.inOutCubic), rco = 1 - ss(9.5, 9.9, t);
      if (rc > 0 && rco > 0) { const [cx, cy] = proj(0, TONGUE.pt(0, 0.77)[1]); ctx.save(); ctx.globalAlpha = rco; api.doodle.circle(ctx, cx, cy, 250 * z, 150 * z, rc, { color: P.marker, width: 12, seed: 12 }); ctx.restore(); }
      const ho = ss(10.05, 10.4, t);   // hand-off to papillae-fly: the frame fills with the bare pink surface it opens on
      if (ho > 0) { ctx.save(); ctx.globalAlpha = ho; const hg = ctx.createRadialGradient(840, 420, 60, 960, 540, 1250); hg.addColorStop(0, '#e08aa0'); hg.addColorStop(0.6, '#c9607c'); hg.addColorStop(1, '#8a3553'); ctx.fillStyle = hg; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); }
    }
    PROPS.tag(ctx, api);
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.45 });
  },
});
