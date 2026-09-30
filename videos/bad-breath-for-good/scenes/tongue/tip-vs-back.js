// @use videos/bad-breath-for-good/scenes/tongue/_lib.js
// @use videos/bad-breath-for-good/scenes/tongue/_lit.js
// @use videos/bad-breath-for-good/scenes/tongue/_props.js
/* tip-vs-back (w811-898), phase 2: seven hard-cut framings of one lit world, each cut on a word.
 * Words (scene s, cut of 22:06; cues.json keeps them on their words if the cut moves): clear 3.42 | Because 3.67,
 * wrist 4.19, tip 6.48, tongue 7.01 | not 7.53, rest 8.06 | tip 9.01, cleanest 9.70 | entire 10.67, tongue 10.93 |
 * rubbing 12.75, teeth 13.61, roof 14.49, mouth 15.39 | Water 15.55, saliva 16.05, always 16.34, hitting 16.79,
 * stuff like that 17.74-17.95. Cut at 18.20 (dentist-check).
 * Shots: 1 wide (0) | 2 wrist close-up (3.62, "Because") | 3 wide, the rest dims (7.45, "not") | 4 macro of the tip
 * (8.9, "tip") | 5 wide, coating builds at the back (10.55, "entire") | 6 front close-up with teeth and the roof of the
 * mouth (12.62, "rubbing") | 7 macro, saliva washing over the tip (15.45, "Water"). */
const CUT = TONGUE.cut('tip-vs-back', 19.3);   // cues follow their words in the current cut (see cues.json)
const SHOTS = [0, 3.62, 7.45, 8.9, 10.55, 12.62, 15.45];
defineScene({
  name: 'tip-vs-back', duration: CUT.duration,
  setup(api) {
    const sc = Math.max(1, api.scale);
    this.T = TONGUE.buildLit(api, { res: sc * 1.3 }); TONGUE.buildTeethLit(api, this.T);
    this.TIP = TONGUE.buildLit(api, { res: sc * 3.1, region: [0, 0.56] }); TONGUE.buildTeethLit(api, this.TIP, { res: sc * 2.1 });
    this.WR = PROPS.wrist(api, sc * 1.1);
    this.B = PROPS.bokeh(api, 26, 'tvb');
  },
  draw(ctx, t, api) {
    t = CUT.warp(t);
    const { P, clamp, lerp, ease, prog, pop, env } = api, ss = TONGUE.sstep, L = TONGUE.L;
    let k = 0; while (k < SHOTS.length - 1 && t >= SHOTS[k + 1]) k++;
    const t0 = SHOTS[k], t1 = SHOTS[k + 1] ?? CUT.duration, lt = t - t0, u = clamp(lt / (t1 - t0));
    // camera over tongue-local space: (fx, fy) at screen centre, z px per unit, rot
    let cam = null;
    const view = (fx, fy, z, rot = 0) => { cam = { fx, fy, z, rot, c: Math.cos(rot), s: Math.sin(rot) }; };
    const proj = (x, y) => { const dx = (x - cam.fx) * cam.z, dy = (y - cam.fy) * cam.z; return [960 + dx * cam.c - dy * cam.s, 540 + dx * cam.s + dy * cam.c]; };
    const apply = (g) => { g.translate(960, 540); g.rotate(cam.rot); g.scale(cam.z, cam.z); g.translate(-cam.fx, -cam.fy); };
    const backdrop = (glowX = 960, glowY = 480, tint = [120, 40, 90]) => {
      api.stage(ctx, { grid: false, c1: '#140c22', c2: '#05040a' });
      const g = ctx.createRadialGradient(glowX, glowY, 40, glowX, glowY, 900); g.addColorStop(0, `rgba(${tint.join(',')},0.55)`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
      PROPS.drawBokeh(ctx, this.B, t, 0.9);
    };
    const coatK = ss(10.62, 11.7, t);
    const coat = { amount: coatK, reach: lerp(0.2, 0.74, coatK), tint: [252, 246, 232] };
    const wideTongue = (g, o = {}) => TONGUE.drawLit(g, this.T, { x: 0, y: 0, s: 1, teeth: o.teeth ? 1 : 0, coat, over: o.over });

    if (k === 0) {   // 1 WIDE: the tongue and the lower teeth, from above
      backdrop(960, 470);
      view(0, 50 - 20 * u, 1.0 + 0.05 * ease.inOutSine(u), -0.03 + 0.03 * u);
      ctx.save(); apply(ctx); wideTongue(ctx, { teeth: true }); ctx.restore();
      api.doodle.text(ctx, 'in the clear?', 1480, 200, prog(t, 2.85, 0.7), { color: P.ink, size: 62, align: 'center', rotate: -0.05 });
    }
    if (k === 1) {   // 2 WRIST: inner wrist, lit skin; the tip comes down, touches, lifts, leaves a wet patch
      backdrop(900, 420, [110, 60, 70]);
      const drift = u * 30, contact = 6.3, lift = 7.22;
      const Wx = 1120 - drift, Wy = 800, ws = 1.28 + 0.05 * u, wr = -0.16;
      const wet = prog(t, contact + 0.15, 0.3);
      PROPS.drawWrist(ctx, this.WR, Wx, Wy, ws, wr, wet);
      // lick point in screen space
      const lx = -170, ly = -40, cx = Wx + (lx * Math.cos(wr) - ly * Math.sin(wr)) * ws, cy = Wy + (lx * Math.sin(wr) + ly * Math.cos(wr)) * ws;
      const down = ease.inOutCubic(clamp((t - (contact - 0.55)) / 0.55)) * (1 - ease.inOutCubic(clamp((t - lift) / 0.3)));
      const st = 1.7, tipY = cy - 170 * (1 - down) + 8 * down;           // the tongue tip (local y = L/2) sits at tipY
      if (t > 4.4) TONGUE.drawLit(ctx, this.TIP, { x: cx + 10, y: tipY - (L / 2) * st, s: st, rot: 0.06 });
      const lw = pop(t, 4.19, 0.45);
      if (lw > 0) { const cxw = Wx + (-300 * Math.cos(wr) - 60 * Math.sin(wr)) * ws, cyw = Wy + (-300 * Math.sin(wr) + 60 * Math.cos(wr)) * ws; api.leader(ctx, cxw, cyw, 420, 960, prog(t, 4.1, 0.4), { color: P.ink, width: 3 }); api.label(ctx, 'YOUR WRIST', 420, 960, { size: 46, p: lw, align: 'right', bg: P.ink }); }
      const ot = pop(t, 6.48, 0.5);
      if (ot > 0) api.label(ctx, 'ONLY THE TIP', 1500, 170, { size: 56, p: ot, align: 'center' });
    }
    if (k === 2) {   // 3 WIDE: only the tip was sampled; the rest dims
      backdrop(980, 520);
      view(0, 70, 1.08 + 0.03 * u, 0.05);
      const dim = prog(t, 7.53, 0.35);
      ctx.save(); apply(ctx); wideTongue(ctx, { over: (g) => {
        const yb = TONGUE.pt(0, 0.26)[1];
        g.save(); TONGUE.path(g); g.clip(); g.fillStyle = `rgba(6,4,12,${0.62 * dim})`; g.fillRect(-320, -440, 640, yb + 440); g.restore();
        const gl = g.createRadialGradient(0, 330, 10, 0, 330, 170); gl.addColorStop(0, `rgba(215,243,74,${0.22 * dim})`); gl.addColorStop(1, 'rgba(215,243,74,0)');
        g.save(); TONGUE.path(g); g.clip(); g.globalCompositeOperation = 'screen'; g.fillStyle = gl; g.fillRect(-300, 150, 600, 300); g.restore();
        const w = TONGUE.hw(0.26); g.save(); g.setLineDash([16, 12]); g.lineWidth = 5; g.strokeStyle = `rgba(215,243,74,${dim})`; g.beginPath(); g.moveTo(-w - 16, yb); g.lineTo(lerp(-w - 16, w + 16, prog(t, 7.5, 0.5)), yb); g.stroke(); g.restore();
      } }); ctx.restore();
      const [ex, ey] = proj(TONGUE.hw(0.26) + 30, TONGUE.pt(0, 0.26)[1]);
      api.doodle.text(ctx, 'not the rest', ex + 20, ey - 10, prog(t, 7.6, 0.6), { color: P.lime, size: 62, rotate: -0.04, stroke: 'rgba(6,4,12,0.6)', strokeWidth: 9 });
    }
    if (k === 3) {   // 4 MACRO: the tip, clean and wet, shallow depth of field
      backdrop(960, 700, [140, 50, 90]);
      view(-20 + 30 * u, 292 + 10 * u, 2.75 + 0.1 * u, -0.02);
      PROPS.tilt(ctx, api, (g) => { apply(g); TONGUE.drawLit(g, this.TIP, { x: 0, y: 0, s: 1, coat }); }, { focusY: 700, band: 140, fall: 300, blur: 9 });
      for (let i = 0; i < 4; i++) { const [sx, sy] = proj([-60, 50, -10, 90][i], [330, 350, 375, 300][i]); TFX.sparkle(ctx, sx, sy, [34, 26, 22, 18][i] * (0.8 + 0.2 * Math.sin(t * 6 + i)), env(t, 9.7 + i * 0.1, 10.6, 0.25, 0.2), '#f6ffe0'); }
      const pT = pop(t, 9.7, 0.5);
      if (pT > 0) { const [tx, ty] = proj(30, 370); api.leader(ctx, tx, ty, 1330, 900, prog(t, 9.6, 0.35), { color: P.lime, width: 3 }); api.label(ctx, 'TIP · CLEANEST', 1330, 900, { size: 54, p: pT }); }
    }
    if (k === 4) {   // 5 WIDE: the whole tongue; coating builds up at the back
      backdrop(960, 400, [110, 60, 60]);
      view(-20, -30 - 20 * u, 1.08 + 0.05 * u, -0.1);
      ctx.save(); apply(ctx); wideTongue(ctx); ctx.restore();
      const pB = pop(t, 10.93, 0.5);
      if (pB > 0) { const [bx, by] = proj(-110, -150); api.leader(ctx, bx, by, 1430, 170, prog(t, 10.85, 0.35), { color: P.ink, width: 3 }); api.label(ctx, 'BACK · WHERE IT BUILDS UP', 1430, 170, { size: 48, p: pB, align: 'center', bg: P.ink }); }
    }
    if (k === 5) {   // 6 FRONT: the tip rubbing on the lower teeth, then the roof of the mouth closing over it
      backdrop(960, 640, [130, 60, 110]);
      view(0, 348 + 8 * u, 1.95 + 0.08 * u, 0);
      const wig = Math.sin((t - 12.62) * 7.5) * 12 * env(t, 12.7, 15.4, 0.3, 0.3);
      ctx.save(); apply(ctx);
      TONGUE.drawLit(ctx, this.TIP, { x: wig, y: 40, s: 1, teeth: 1, coat, under: (g) => { const sh = env(t, 14.42, 15.6, 0.4, 0.15); if (sh > 0) { g.save(); TONGUE.path(g); g.clip(); g.fillStyle = `rgba(20,8,40,${0.35 * sh})`; g.fillRect(-300, -420, 600, 840); g.restore(); } } });
      ctx.restore();
      // motion arcs at the tip ("rubbing")
      const ra = env(t, 12.7, 15.4, 0.3, 0.3);
      if (ra > 0) { const [tx, ty] = proj(wig, 432); for (const sd of [-1, 1]) for (let q = 0; q < 2; q++) { const r = 150 + q * 40, a0 = sd > 0 ? -0.5 : Math.PI - 0.2, pts = []; for (let i = 0; i <= 12; i++) { const an = a0 + (i / 12) * 0.7; pts.push([tx + Math.cos(an) * r, ty - 40 + Math.sin(an) * r * 0.55]); } api.doodle.stroke(ctx, pts, prog(t, 12.75 + q * 0.1, 0.35, ease.inOutCubic), { color: P.lime, width: 7, seed: 30 + q + (sd > 0 ? 5 : 0), alpha: ra * (0.6 + 0.4 * Math.abs(Math.sin(t * 7.5 + q))) }); } }
      const tth = pop(t, 13.61, 0.45);
      if (tth > 0) { const [ix, iy] = proj(-120, 470); api.leader(ctx, ix, iy, 330, 900, prog(t, 13.5, 0.35), { color: P.ink, width: 3 }); api.label(ctx, 'TEETH', 330, 900, { size: 50, p: tth, align: 'right', bg: P.ink }); }
      const pal = env(t, 14.42, 15.6, 0.4, 0.15);
      if (pal > 0) { const [px, py] = proj(0, 250); TFX.palate(ctx, px, py - (1 - ease.outCubic(clamp((t - 14.42) / 0.4))) * 120, pal, { w: 560, h: 620 }); }
      const rf = pop(t, 14.49, 0.45);
      if (rf > 0) api.label(ctx, 'ROOF OF YOUR MOUTH', 1540, 170, { size: 50, p: rf, align: 'center', bg: '#d9ccff' });
    }
    if (k === 6) {   // 7 MACRO: saliva washing over the front
      backdrop(960, 640, [60, 90, 140]);
      view(-150 + 30 * u, 240, 2.3 + 0.12 * u, 0.42);
      const sal = prog(t, 15.5, 0.6);
      PROPS.tilt(ctx, api, (g) => { apply(g); TONGUE.drawLit(g, this.TIP, { x: 0, y: 0, s: 1, coat, over: (h) => { if (sal > 0) TFX.salivaWash(h, t, sal, { vMin: 0, vMax: 0.5, glossy: true }); } }); }, { focusY: 560, band: 190, fall: 320, blur: 9 });
      const ps = pop(t, 16.05, 0.5);
      if (ps > 0) { const [sx, sy] = proj(-170, 230); api.leader(ctx, sx, sy, 470, 880, prog(t, 15.95, 0.35), { color: P.saliva, width: 3 }); api.label(ctx, 'SALIVA', 470, 880, { size: 56, p: ps, align: 'right', bg: P.saliva }); }
    }
    PROPS.tag(ctx, api);
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.45 });
  },
});
