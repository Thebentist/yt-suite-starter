// @use videos/bad-breath-for-good/scenes/tongue/_lib.js
// @use videos/bad-breath-for-good/scenes/tongue/_lit.js
// @use videos/bad-breath-for-good/scenes/tongue/_props.js
/* brush-vs-scrape (w2284-2328), phase 2: five hard-cut framings of one lit world. Only what Ben says: brushing
 * deals mainly with the teeth; brushing the tongue mostly moves things around.
 * Words (scene s, cut of 22:06): brushing 0.33 | deals 1.90, teeth 2.80 | brush 3.65, tongue 3.85, but 4.49 |
 * moving 5.17, around 5.58 | not 6.11, doing 6.53, need 7.61, off 8.57. Visible until 9.16 (w2328 end + 0.25).
 * Shots: 1 close-up, the brush scrubbing the molars (0) | 2 wide: teeth clean, tongue still coated ("deals", 1.85) |
 * 3 closer on the back third, the brush arrives and scrubs ("brush", 3.55) | 4 macro, the coating pushed into ridges
 * ("moving", 5.1) | 5 medium, the brush lifts away, the coating is still there ("not", 6.05). */
const CUT = TONGUE.cut('brush-vs-scrape', 9.22);   // cues follow their words in the current cut (see cues.json)
const SHOTS = [0, 1.85, 3.55, 5.1, 6.05];
defineScene({
  name: 'brush-vs-scrape', duration: CUT.duration,
  setup(api) {
    const sc = Math.max(1, api.scale);
    this.T = TONGUE.buildLit(api, { res: sc * 1.3 }); TONGUE.buildTeethLit(api, this.T);
    this.BK = TONGUE.buildLit(api, { res: sc * 3.0, region: [0.42, 1] });
    this.TT = {}; TONGUE.buildTeethLit(api, this.TT, { res: sc * 2.0 });
    this.mol = this.TT.teethPos.filter((q) => q.kind === 'm' && q.side > 0).sort((a, b) => a.y - b.y)[1];
    this.B = PROPS.bokeh(api, 26, 'bvs');
  },
  // the brush head (tongue-local units) and its angle
  brush(t) {
    const m = this.mol, lerp = TONGUE.lerp, ss = TONGUE.sstep;
    const rowAng = m.ang;                                               // along the tooth row
    let x = m.x + Math.cos(rowAng) * Math.sin(t * 22) * 26, y = m.y + Math.sin(rowAng) * Math.sin(t * 22) * 26, rot = rowAng + 0.05;
    const off = ss(1.95, 2.5, t); x = lerp(x, 520, off); y = lerp(y, 60, off);                       // lifts off the teeth
    const toT = ss(3.2, 3.75, t); x = lerp(x, 30, toT); y = lerp(y, -190, toT); rot = lerp(rot, 0.45, ss(3.0, 3.7, t));
    const sc = ss(3.75, 3.95, t) * (1 - ss(6.2, 6.4, t)); x += Math.sin((t - 3.75) * 15) * 95 * sc; y += Math.sin((t - 3.75) * 7.5) * 30 * sc;
    const lift = ss(6.4, 7.2, t); x = lerp(x, 560, lift); y = lerp(y, 40, lift); rot -= lift * 0.2;
    return { x, y, rot, scrub: sc };
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
    const b = this.brush(t);
    const samples = []; for (let ti = 3.8; ti <= Math.min(t, 6.2); ti += 1 / 30) samples.push(this.brush(ti));
    const pile = ss(4.0, 5.9, t), cy = TONGUE.pt(0, 0.74)[1] + 110;
    const coat = { amount: 1, reach: 0.74, tint: [252, 246, 232],
      erase: (g) => { g.fillStyle = '#000'; g.globalAlpha = 0.02; for (const q of samples) { g.beginPath(); g.ellipse(q.x, q.y, 95, 40, 0, 0, 6.2832); g.fill(); } },
      add: (g) => {   // coating pushed to the ends of the strokes (ridges) and streaked through the scrubbed track
        if (pile <= 0) return;
        const yc = -190;
        for (const sd of [-1, 1]) for (let q = 0; q < 16; q++) {
          const yy = yc - 46 + q * 6.2, xx = 30 + sd * (196 + Math.sin(q * 1.9) * 10), r = (7 + 7 * Math.abs(Math.sin(q * 2.3))) * pile;
          const gg = g.createRadialGradient(xx - r * 0.4, yy - r * 0.4, 1, xx, yy, r * 1.4); gg.addColorStop(0, 'rgba(255,252,242,0.98)'); gg.addColorStop(1, 'rgba(210,198,170,0.9)');
          g.fillStyle = gg; g.beginPath(); g.ellipse(xx, yy, r * 1.4, r, 0.2 * sd, 0, 6.2832); g.fill();
        }
        g.strokeStyle = 'rgba(248,242,226,0.6)'; g.lineWidth = 4.5; g.lineCap = 'round';
        for (let q = 0; q < 22; q++) { const yy = yc - 44 + q * 4, a = pile * (0.55 + 0.45 * ((q * 0.37) % 1)); g.globalAlpha = a; g.beginPath(); g.moveTo(30 - 180, yy + Math.sin(q) * 3); g.bezierCurveTo(30 - 60, yy - 6, 30 + 60, yy + 6, 30 + 180, yy + Math.cos(q) * 3); g.stroke(); }
        g.globalAlpha = 1;
      } };
    const foam = (g) => {   // foam on the molars while brushing
      const fo = env(t, 0.2, 2.2, 0.3, 0.4); if (fo <= 0) return; const m = this.mol;
      for (let q = 0; q < 22; q++) { const a = q * 2.4, r = 20 + (q % 5) * 12, bx = m.x + Math.cos(a) * r * 0.9, by = m.y + Math.sin(a) * r * 0.9 + Math.sin(t * 3 + q) * 3, rr = 6 + (q % 3) * 4;
        g.globalAlpha = fo * 0.9; const fg = g.createRadialGradient(bx - rr * 0.3, by - rr * 0.3, 0.5, bx, by, rr); fg.addColorStop(0, '#ffffff'); fg.addColorStop(0.7, '#eef6ff'); fg.addColorStop(1, 'rgba(180,210,240,0.6)'); g.fillStyle = fg; g.beginPath(); g.arc(bx, by, rr, 0, 6.2832); g.fill(); }
      g.globalAlpha = 1;
    };
    const brushAt = (g, s = 1) => PROPS.brush(g, b.x, b.y, b.rot, s, { wiggle: t, gunk: ss(4.3, 5.6, t) });

    if (k === 0) {   // 1 CLOSE: the molars being scrubbed
      backdrop(1000, 520, [130, 60, 90]);
      const m = this.mol; view(m.x - 30, m.y - 10, 2.1 + 0.1 * u, -0.25);
      PROPS.tilt(ctx, api, (g) => { apply(g); g.drawImage(this.TT.teethCv, -this.TT.teethOx, -this.TT.teethOy, this.TT.teethCv.width / this.TT.teethRes, this.TT.teethCv.height / this.TT.teethRes); TONGUE.drawLit(g, this.T, { x: 0, y: 0, s: 1, coat }); foam(g); brushAt(g); }, { focusY: 540, band: 200, fall: 280, blur: 9 });
      api.doodle.text(ctx, 'brushing harder', 1470, 190, prog(t, 0.35, 0.6), { color: P.ink, size: 62, align: 'center', rotate: -0.04 });
    }
    if (k === 1) {   // 2 WIDE: the teeth are clean; the tongue is still coated
      backdrop(960, 470);
      view(0, 40, 1.0 + 0.04 * u, 0.02);
      ctx.save(); apply(ctx); TONGUE.drawLit(ctx, this.T, { x: 0, y: 0, s: 1, teeth: 1, coat }); foam(ctx); brushAt(ctx); ctx.restore();
      if (this.T.teethPos) this.T.teethPos.forEach((q, i) => { if (i % 2) return; const [sx, sy] = proj(q.x + 10, q.y - 10); TFX.sparkle(ctx, sx, sy, 22 + 6 * Math.sin(t * 7 + i), env(t, 2.6 + (i % 5) * 0.06, 3.6, 0.2, 0.2), '#fbffe6'); });
      const tk = pop(t, 2.8, 0.5);
      if (tk > 0) { const [mx, my] = proj(this.mol.x + 90, this.mol.y); TFX.checkBadge(ctx, api, mx + 60, my, 44, tk); api.text(ctx, 'TEETH', mx + 122, my + 18, { size: 54, alpha: clamp(tk), shadow: true }); }
    }
    if (k === 2) {   // 3 CLOSER: the back third; the brush arrives and scrubs
      backdrop(960, 420, [110, 50, 80]);
      view(20, -220, 1.9 + 0.08 * u, -0.05);
      ctx.save(); apply(ctx); TONGUE.drawLit(ctx, this.BK, { x: 0, y: 0, s: 1, coat }); brushAt(ctx); ctx.restore();
      const bt = pop(t, 3.85, 0.5);
      if (bt > 0) { const [tx, ty] = proj(-200, -120); api.leader(ctx, tx, ty, 420, 900, prog(t, 3.75, 0.35), { color: P.ink, width: 3 }); api.label(ctx, 'TONGUE', 420, 900, { size: 52, p: bt, align: 'right', bg: P.ink }); }
    }
    if (k === 3) {   // 4 MACRO: the coating pushed into ridges, not coming off
      backdrop(960, 520, [140, 60, 80]);
      view(40 + 20 * u, -180, 3.0 + 0.1 * u, 0.06);
      PROPS.tilt(ctx, api, (g) => { apply(g); TONGUE.drawLit(g, this.BK, { x: 0, y: 0, s: 1, coat }); brushAt(g); }, { focusY: 560, band: 170, fall: 280, blur: 10 });
      const mv = prog(t, 5.17, 0.7);
      if (mv > 0) api.doodle.text(ctx, 'just moving things around', 960, 180, mv, { color: P.lime, size: 64, align: 'center', rotate: -0.03, stroke: 'rgba(6,4,12,0.6)', strokeWidth: 9 });
      for (const [sd, sdd] of [[-1, 3], [1, 4]]) { const [ax, ay] = proj(30 + sd * 110, -250), [bx, by] = proj(30 + sd * 215, -205); api.doodle.arrow(ctx, ax, ay, bx, by, prog(t, 5.3 + (sd > 0 ? 0.12 : 0), 0.4, ease.inOutCubic), { color: P.lime, width: 8, bend: sd * 30, seed: sdd, head: 28 }); }
    }
    if (k === 4) {   // 5 MEDIUM: the brush lifts away; the coating is still there
      backdrop(960, 440);
      view(10, -120 + 20 * u, 1.35 + 0.05 * u, -0.03);
      ctx.save(); apply(ctx); TONGUE.drawLit(ctx, this.T, { x: 0, y: 0, s: 1, teeth: 1, coat }); brushAt(ctx); ctx.restore();
      const st = prog(t, 6.9, 0.7, ease.inOutCubic);
      if (st > 0) { const [cx, cy2] = proj(30, -190); api.doodle.circle(ctx, cx, cy2, 290 * cam.z * 0.95, 125 * cam.z * 0.95, st, { color: P.marker, width: 12, seed: 41 }); }
      api.doodle.text(ctx, 'not all off', 1560, 190, prog(t, 7.35, 0.6), { color: P.marker, size: 66, align: 'center', rotate: -0.05, stroke: 'rgba(6,4,12,0.55)', strokeWidth: 9 });
    }
    PROPS.tag(ctx, api);
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.45 });
  },
});
