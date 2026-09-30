// @use videos/bad-breath-for-good/scenes/tongue/_lib.js
// @use videos/bad-breath-for-good/scenes/tongue/_lit.js
// @use videos/bad-breath-for-good/scenes/tongue/_props.js
/* one-spot (w2402-2417), phase 2: two framings of the lit mouth. The teeth sparkle (they get brushed), the back third
 * of the tongue stays coated; a red marker circle on "the one spot"; MOST PEOPLE NEVER CLEAN IT on "most people".
 * Words (scene s, cut of 22:06): cleaning 0.95 | one 1.64, spot 2.45 | most 2.73, don't 3.34, clean 3.88.
 * Cut at 4.26 (data: research-weak). Shots: 1 wide (0) | 2 closer on the back third ("one", 1.55). */
const CUT = TONGUE.cut('one-spot', 5.22);   // cues follow their words in the current cut (see cues.json)
const SHOTS = [0, 1.55];
defineScene({
  name: 'one-spot', duration: CUT.duration,
  setup(api) {
    const sc = Math.max(1, api.scale);
    this.T = TONGUE.buildLit(api, { res: sc * 1.3 }); TONGUE.buildTeethLit(api, this.T);
    this.BK = TONGUE.buildLit(api, { res: sc * 2.6, region: [0.42, 1] });
    this.B = PROPS.bokeh(api, 26, 'os');
  },
  draw(ctx, t, api) {
    t = CUT.warp(t);
    const { P, clamp, lerp, ease, prog, pop, env } = api;
    const k = t >= SHOTS[1] ? 1 : 0, u = k ? clamp((t - SHOTS[1]) / (CUT.duration - SHOTS[1])) : clamp(t / SHOTS[1]);
    let cam = null;
    const view = (fx, fy, z, rot = 0) => { cam = { fx, fy, z, rot, c: Math.cos(rot), s: Math.sin(rot) }; };
    const proj = (x, y) => { const dx = (x - cam.fx) * cam.z, dy = (y - cam.fy) * cam.z; return [960 + dx * cam.c - dy * cam.s, 540 + dx * cam.s + dy * cam.c]; };
    const apply = (g) => { g.translate(960, 540); g.rotate(cam.rot); g.scale(cam.z, cam.z); g.translate(-cam.fx, -cam.fy); };
    api.stage(ctx, { grid: false, c1: '#140c22', c2: '#05040a' });
    const g0 = ctx.createRadialGradient(960, 460, 40, 960, 460, 900); g0.addColorStop(0, 'rgba(120,40,90,0.55)'); g0.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g0; ctx.fillRect(0, 0, 1920, 1080);
    PROPS.drawBokeh(ctx, this.B, t, 0.9);
    const coat = { amount: 1, reach: 0.74, tint: [252, 246, 232] };
    const cyB = TONGUE.pt(0, 0.77)[1];
    if (k === 0) {   // 1 WIDE: teeth sparkle, tongue coated at the back
      view(0, 40 - 20 * u, 1.0 + 0.04 * u, 0.02);
      ctx.save(); apply(ctx); TONGUE.drawLit(ctx, this.T, { x: 0, y: 0, s: 1, teeth: 1, coat }); ctx.restore();
      this.T.teethPos.forEach((q, i) => { if (i % 2) return; const [sx, sy] = proj(q.x + 10, q.y - 10); TFX.sparkle(ctx, sx, sy, 24 + 7 * Math.sin(t * 7 + i), env(t, 0.2 + (i % 5) * 0.08, 1.7, 0.25, 0.3), '#fbffe6'); });
    } else {         // 2 CLOSER: the back third, circled
      view(0, cyB + 30 - 20 * u, 1.75 + 0.12 * ease.inOutSine(u), -0.04);
      ctx.save(); apply(ctx); TONGUE.drawLit(ctx, this.BK, { x: 0, y: 0, s: 1, coat, over: (g) => {
        const pl = env(t, 2.0, 5.4, 0.4, 0.2) * (0.6 + 0.4 * Math.sin(t * 5));
        if (pl > 0) { const rg = g.createRadialGradient(0, cyB, 20, 0, cyB, 260); rg.addColorStop(0, `rgba(255,59,59,${0.22 * pl})`); rg.addColorStop(1, 'rgba(255,59,59,0)'); g.save(); TONGUE.path(g); g.clip(); g.fillStyle = rg; g.fillRect(-300, -420, 600, 500); g.restore(); }
      } }); ctx.restore();
      const [cx, cy] = proj(0, cyB);
      api.doodle.circle(ctx, cx, cy, 250 * cam.z, 150 * cam.z, prog(t, 1.62, 0.6, ease.inOutCubic), { color: P.marker, width: 13, seed: 31 });
      api.doodle.text(ctx, 'the one spot', 1560, 330, prog(t, 1.75, 0.6), { color: P.marker, size: 66, align: 'center', rotate: -0.06, stroke: 'rgba(6,4,12,0.55)', strokeWidth: 9 });
      const mp = pop(t, 2.73, 0.5);
      if (mp > 0) api.label(ctx, 'MOST PEOPLE NEVER CLEAN IT', 960, 960, { size: 58, p: mp, align: 'center' });
    }
    PROPS.tag(ctx, api);
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.45 });
  },
});
