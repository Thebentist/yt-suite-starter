// @use videos/bad-breath-for-good/scenes/mouth3d/_lib.js
/* scrape3d (w2702-2857, replaces tongue/scrape-how). How to scrape, on the 3D tongue (out, over the lower teeth):
 * a brushed-steel U scraper goes to the back and pulls forward, clearing stripes through the coating; rinse and repeat
 * (it brings up less each time); the gag tip (start in the middle and work your way back); the clean back third.
 * Words: "I mean, obviously the easy one is like, yeah, just start tongue scraping. At least get the gunk and nastiness
 * off of your tongue, off of your gums, off of your teeth. Do all the things that you're supposed to be doing. You want to
 * literally go make sure when you're doing this, go as far back as you can, scrape everything off and get everything off
 * there, rinse it off, and do it multiple times until you stop getting that gunk off of your mouth. If you are a big gagger
 * and you just feel you can't get too far back, well then start a little bit in the middle of your tongue and then slowly
 * work your way, you get used to that. But the goal is we really want to clean that area good."
 * On screen only Ben's words: no "each day" / mm figures (the gag tip is flagged for Ben in research-notes question 2).
 */
const FR = M3D.frag({
  parts: ['base', 'tongue'],
  map: 'float map(vec3 p){ return tongueMap(p); }',
  post: ['tongueShade'],
  render: `
vec3 render(vec2 fc){
  vec3 ro; vec3 rd = camRay(fc, ro);
  vec2 uv = (2. * fc - uRes) / uRes.y;
  vec3 bg = mix(vec3(0.026, 0.011, 0.026), vec3(0.080, 0.030, 0.062), exp(-dot(uv - vec2(0.15, 0.25), uv - vec2(0.15, 0.25)) * 0.7));
  float t = march(ro, rd, 5.0);
  if (t < 0.) return bg;
  vec3 p = ro + rd * t, n = calcNormal(p);
  vec3 col = shadeTongue(p, n, rd, t);
  return mix(col, bg, tongueFade(p));
}`,
});
const TZ = -0.2, TY = 0.16, R = 0.16;               // the tongue is out; scraper arc radius
const COAT = [0.84, 0.78, 0.60];

defineScene({
  name: 'scrape3d',
  anchor: { word: 2702, offset: -0.15 },
  anchorEnd: { word: 2858, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    this.R = M3D.create(api, FR, { aa: 3, steps: 130, stepScale: 0.85 });
    const A = (i, o = 0) => api.at(i) + o;
    this.W = { tongue: A(2713), gunk: A(2738), tng: A(2744), gums: A(2748), teeth: A(2752), things: A(2756), you: A(2763), go: A(2774), back: A(2777),
      scrape: A(2781), every2: A(2786), rinse: A(2789), multiple: A(2795), getting: A(2799), gunk2: A(2802), gagger: A(2812), cant: A(2818), well: A(2822),
      start: A(2825), middle: A(2831), slowly: A(2837), way: A(2840), used: A(2843), but: A(2846), goal: A(2848), clean: A(2854), good: A(2857) };
    const W = this.W;
    this.cuts = [0, W.tongue - 0.12, W.gunk - 0.1, W.tng - 0.1, W.gums - 0.1, W.teeth - 0.1, W.things - 0.1, W.you - 0.1, W.go - 0.1, W.scrape - 0.1,
      W.rinse - 0.1, W.getting - 0.1, W.gagger - 0.25, W.well - 0.1, W.slowly - 0.1, W.but - 0.1];
    // the three cleaning pulls (tongue-local z from the back to the front), each bringing up less
    this.pulls = [{ t0: W.scrape, d: 1.7, x: 0, pile: 1 }, { t0: W.multiple - 0.05, d: 1.0, x: -0.11, pile: 0.6 }, { t0: W.gunk2 - 0.13, d: 1.0, x: 0.11, pile: 0.28 }];
    // the gag-tip pulls: start in the middle, then a little further back
    this.gagPulls = [{ t0: W.middle - 0.15, z: 0.02 }, { t0: W.slowly - 0.05, z: 0.1 }, { t0: W.used - 0.3, z: 0.18 }];
  },
  // scraper arc centre for an arc whose back edge sits on the tongue at tongue-local z = zl (+ lift above it)
  pose(x, zl, lift = 0) {
    const zw = zl + TZ, pitch = TY + 0.04;
    const yb = M3D.tongueTopY(x, zw + R, TZ, TY) + 0.004;
    return { P: [x, yb + 0.021 + R * Math.sin(pitch) + 0.002 + lift, zw], A: [pitch, 0, 0] };
  },
  draw(ctx, t, api) {
    const { ease, clamp, lerp, P, prog, pop, env } = api, W = this.W;
    const S = M3D.shot(t, this.cuts, api.duration), u = S.u, k = S.k, io = ease.inOutSine(k), i = S.i;
    const ZB = 0.3, ZF = -0.28;                       // a pull runs from the back (ZB) to the front (ZF), tongue-local
    const str = new Float32Array(20);
    let coat = 1, scr = null, pile = 0, day = 0, gag = 0, lines = [-1, -1, -1, 0];
    // ---- the scraper through the cleaning part (shots 1-11)
    const pullK = (q) => ease.inOutSine(clamp((t - q.t0) / q.d));
    if (i <= 11) {
      // stripes cleared so far
      this.pulls.forEach((q, n) => { if (t >= q.t0) { const kk = pullK(q); str.set([q.x, R, lerp(ZB, ZF, kk), ZB, 1], n * 5); } });
      // where the scraper is
      const inK = ease.outCubic(clamp((t - (W.tongue - 0.1)) / 0.9));
      const toBack = ease.inOutCubic(clamp((t - (W.you + 0.3)) / 1.6));   // travels back while "make sure when you're doing this"
      let x = 0, zl = lerp(-0.3, ZB, toBack), lift = lerp(0.35, 0.03, inK) * (1 - toBack) + 0.03 * toBack;
      if (t >= W.back - 0.2) lift = lerp(0.03, 0.0, clamp((t - W.back + 0.2) / 0.4));
      const q0 = this.pulls[0], q1 = this.pulls[1], q2 = this.pulls[2];
      if (t >= q0.t0) { zl = lerp(ZB, ZF, pullK(q0)); pile = q0.pile * pullK(q0); lift = 0; }
      // rinse: lift off, the pile washes away, come back to the back for the next pull
      const between = (qa, qb) => {
        const e = qa.t0 + qa.d, up = ease.inOutCubic(clamp((t - e) / 0.3)), back = ease.inOutCubic(clamp((t - (qb.t0 - 0.5)) / 0.45));
        lift = 0.16 * up * (1 - back); x = lerp(qa.x, qb.x, back); zl = lerp(ZF, ZB, back);
        pile = qa.pile * (1 - clamp((t - e - 0.25) / 0.3));
      };
      if (t >= q0.t0 + q0.d && t < q1.t0) between(q0, q1);
      if (t >= q1.t0) { x = q1.x; zl = lerp(ZB, ZF, pullK(q1)); pile = q1.pile * pullK(q1); lift = 0; }
      if (t >= q1.t0 + q1.d && t < q2.t0) between(q1, q2);
      if (t >= q2.t0) { x = q2.x; zl = lerp(ZB, ZF, pullK(q2)); pile = q2.pile * pullK(q2); lift = 0; }
      if (t >= q2.t0 + q2.d) { lift = 0.3 * ease.inCubic(clamp((t - q2.t0 - q2.d) / 0.5)); }
      if (t >= W.tongue - 0.15) scr = this.pose(x, zl, lift);
    }
    // ---- the gag tip (shots 12-14): a fresh coating (another day), the red zone at the back, start in the middle
    if (i >= 12 && i <= 14) {
      day = 1;
      gag = i === 12 ? ease.outCubic(clamp(u / 0.5)) : i === 13 ? 1 : lerp(1, 0.55, io);
      let x = 0, zl = 0.18, lift = 0.12;
      if (i === 13) { zl = lerp(0.0, 0.26, ease.inOutSine(clamp(u / 0.8))); lift = 0.02; if (u > 0.8) zl = 0.26 - 0.08 * ease.outBack(clamp((u - 0.8) / 0.35), 2.5); }  // goes back, stops short
      const gp = this.gagPulls;
      gp.forEach((q, n) => { if (t >= q.t0) { const kk = ease.inOutSine(clamp((t - q.t0) / 0.7)); str.set([0, R, lerp(q.z, ZF, kk), q.z, 1], n * 5); } });
      for (let n = 0; n < 3; n++) if (t >= gp[n].t0 - 0.3) { lines[n] = gp[n].z + R; lines[3] = 1; }
      const cur = [...gp].reverse().find((q) => t >= q.t0 - 0.35);
      if (i === 14 || (i === 13 && cur)) {
        if (cur) { const kk = ease.inOutSine(clamp((t - cur.t0) / 0.7)); const settle = ease.inOutCubic(clamp((t - (cur.t0 - 0.35)) / 0.3)); zl = t < cur.t0 ? lerp(zl, cur.z, settle) : lerp(cur.z, ZF, kk); lift = t < cur.t0 ? lerp(0.08, 0, settle) : 0; pile = 0.4 * kk; }
        if (cur && t > cur.t0 + 0.7) { lift = 0.08 * clamp((t - cur.t0 - 0.7) / 0.2); }
      }
      scr = i === 12 ? null : this.pose(x, zl, lift);
    }
    // ---- the goal: the back clean (shot 15)
    if (i === 15) { coat = lerp(0.35, 0.0, ease.inOutSine(clamp(u / 0.8))); day = 1; }

    // ---- cameras
    let cam, dofO = null;
    const at = (c, r, yaw, pitch, ta, fov = 2.2) => ({ ro: M3D.V.orbit(c, r, yaw, pitch), ta: ta || c, fov });
    switch (i) {
      case 0: cam = at([0, 0.02, -0.12], lerp(1.35, 1.2, io), lerp(-0.55, -0.35, io), 0.62); break;                     // establishing
      case 1: cam = at([0, 0.06, -0.2], lerp(1.1, 1.0, io), lerp(0.45, 0.35, io), 0.5); break;                          // the scraper arrives
      case 2: cam = { ro: [lerp(0.34, 0.3, io), 0.22, lerp(-0.38, -0.34, io)], ta: [0, 0.08, 0.05], fov: 2.3 }; dofO = { blur: 6, stops: [[0, 0.8], [0.25, 0], [0.8, 0], [1, 0.8]] }; break;
      case 3: cam = at([0, 0.05, -0.18], 0.7, lerp(-0.2, -0.12, io), 1.0); break;                                        // tongue
      case 4: cam = { ro: [lerp(0.62, 0.58, io), 0.12, lerp(-0.55, -0.5, io)], ta: [0.3, -0.05, -0.25], fov: 2.3 }; break;   // gums
      case 5: cam = { ro: [lerp(-0.62, -0.58, io), 0.2, lerp(-0.72, -0.68, io)], ta: [-0.2, -0.02, -0.38], fov: 2.35 }; break;   // teeth (other side)
      case 6: cam = at([0, 0.02, -0.15], lerp(1.55, 1.45, io), 0.02, 1.25); break;                                       // top view
      case 7: cam = { ro: [lerp(0.95, 0.88, io), 0.3, lerp(-0.2, -0.1, io)], ta: [0, 0.06, -0.05], fov: 2.2 }; break;        // side, tracking back
      case 8: cam = { ro: [lerp(0.42, 0.38, io), 0.34, lerp(-0.18, -0.12, io)], ta: [0, 0.06, 0.12], fov: 2.25 }; break;    // at the far back
      case 9: { const b = scr ? scr.P : [0, 0.1, 0]; cam = { ro: [0.34, b[1] + 0.03, b[2] - 0.3], ta: [0.02, b[1] - 0.04, b[2] + 0.12], fov: 2.25 }; dofO = { blur: 6, stops: [[0, 0.9], [0.2, 0], [0.85, 0], [1, 0.6]] }; break; }  // in front of the blade, backing away
      case 10: cam = at([0, 0.02, -0.15], lerp(1.45, 1.38, io), lerp(-0.06, 0.04, io), 1.12); break;                    // rinse, repeat (top)
      case 11: cam = at([0, 0.02, -0.12], lerp(1.2, 1.1, io), lerp(0.5, 0.42, io), 0.82); break;                         // until no more gunk
      case 12: cam = { ro: [lerp(-0.2, -0.14, io), lerp(0.62, 0.56, io), lerp(-0.62, -0.55, io)], ta: [0, 0.0, 0.1], fov: 2.2 }; break;   // big gagger: the red zone at the back
      case 13: cam = at([0, 0.02, -0.12], lerp(1.42, 1.36, io), 0.0, 1.2); break;                                        // top: can't get too far back
      case 14: cam = at([0, 0.02, -0.12], lerp(1.36, 1.3, io), 0.0, 1.2); break;                                         // top: work your way back
      default: cam = at([0, 0.04, 0.02], lerp(0.85, 0.72, io), lerp(0.55, 0.42, io), 0.72); break;                       // the goal
    }
    const U = { ...M3D.LIGHTS, uFogK: 0.02, uTime: t, ...M3D.camU(cam), uJaw: 1, uTongueZ: TZ, uTongueY: TY,
      uCoat: coat, uCoatCol: COAT, uCoatFuzz: 0.25, uCoatSolid: 0, uDay: day, uStr: str, uPile: pile, uScrBend: 1.6,
      uScrR: scr ? R : 0, uScrP: scr ? scr.P : [0, 0, 0], uScrA: scr ? scr.A : [0, 0, 0], uGag: gag, uLines: lines };
    const cv = M3D.timed(api, this.R, U);
    ctx.drawImage(cv, 0, 0, api.W, api.H);
    if (dofO) M3D.dof(ctx, api, dofO);

    // ---- words on screen (sparingly), right side unless noted
    const RX = 1500;
    if (i === 1) api.label(ctx, 'TONGUE SCRAPER', RX, 160, { p: pop(t, W.tongue + 0.1), size: 54, align: 'center' });
    if (i >= 3 && i <= 5) {                                    // the checklist builds over three quick cuts, on a glass panel
      const PX = 120, PY = 110, ga = prog(t, W.tng - 0.12, 0.3);
      M3D.glass(ctx, api, PX, PY, 440, 400, 28, { alpha: ga });
      api.text(ctx, 'GET THE GUNK OFF', PX + 40, PY + 70, { size: 36, color: P.dim, tracking: 3, alpha: ga });
      [['TONGUE', W.tng], ['GUMS', W.gums], ['TEETH', W.teeth]].forEach(([name, tt], n) => {
        const pp = pop(t, tt, 0.45); if (pp <= 0) return;
        const y = PY + 150 + n * 96;
        ctx.save(); ctx.translate(PX + 72, y); ctx.scale(pp, pp);
        ctx.fillStyle = P.lime; ctx.beginPath(); ctx.arc(0, 0, 28, 0, 6.2832); ctx.fill(); ctx.restore();
        api.doodle.check(ctx, PX + 72, y + 2, 15, prog(t, tt + 0.08, 0.3), { color: P.black, width: 7, passes: 1, seed: 3 + n });
        api.text(ctx, name, PX + 124, y + 21, { size: 60, alpha: clamp(pp), tracking: 2 });
      });
    }
    if (i === 8) api.label(ctx, 'AS FAR BACK AS YOU CAN', 960, 150, { p: pop(t, W.back), size: 54, align: 'center' });
    if (i === 9) api.label(ctx, 'PULL FORWARD', RX, 160, { p: pop(t, W.scrape + 0.1), size: 54, align: 'center' });
    if (i === 10) {
      api.label(ctx, 'RINSE', RX, 160, { p: pop(t, W.rinse), size: 54, align: 'center' });
      const dp = pop(t, W.rinse + 0.1, 0.5);                  // a small water drop next to it
      if (dp > 0) { ctx.save(); ctx.translate(RX + 118, 158); ctx.scale(dp, dp); const g = ctx.createLinearGradient(0, -36, 0, 30); g.addColorStop(0, '#d8f3ff'); g.addColorStop(1, P.saliva);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -38); ctx.bezierCurveTo(14, -16, 26, -2, 26, 12); ctx.arc(0, 12, 26, 0, Math.PI); ctx.bezierCurveTo(-26, -2, -14, -16, 0, -38); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(-9, 8, 5, 9, 0.4, 0, 6.2832); ctx.fill(); ctx.restore(); }
      const rp = pop(t, W.multiple, 0.45);
      if (rp > 0) api.label(ctx, 'REPEAT', RX, 262, { p: rp, size: 54, align: 'center' });
    }
    if (i === 11) api.doodle.text(ctx, 'until no more gunk', RX, 190, prog(t, W.getting, 0.8), { color: P.lime, size: 60, align: 'center', rotate: -0.03, stroke: 'rgba(11,10,24,0.55)', strokeWidth: 9 });
    if (i === 12) api.doodle.text(ctx, 'big gagger?', RX, 190, prog(t, W.gagger - 0.1, 0.6), { color: P.ink, size: 72, align: 'center', rotate: -0.04, stroke: 'rgba(11,10,24,0.55)', strokeWidth: 9 });
    if (i === 13) api.label(ctx, 'START IN THE MIDDLE', RX, 160, { p: pop(t, W.start), size: 52, align: 'center' });
    if (i === 14) {
      api.label(ctx, 'START IN THE MIDDLE', RX, 160, { p: 1, size: 52, align: 'center' });
      api.doodle.text(ctx, 'then work your way back', RX, 270, prog(t, W.slowly, 0.9), { color: P.lime, size: 50, align: 'center', rotate: -0.02, stroke: 'rgba(11,10,24,0.55)', strokeWidth: 8 });
    }
    if (i === 15) {
      api.label(ctx, 'CLEAN THE BACK', 960, 150, { p: pop(t, W.clean), size: 60, align: 'center' });
      [[-0.12, 0.2], [0.08, 0.26], [0.02, 0.12], [-0.05, 0.3], [0.14, 0.16]].forEach(([x, z], n) => {
        const q = M3D.project(cam, [x, M3D.tongueTopY(x, z + TZ, TZ, TY) + 0.01, z + TZ]); if (!q) return;
        const tt = W.good - 0.2 + n * 0.12; M3D.sparkle(ctx, q[0], q[1], 58 + 14 * Math.sin(t * 5 + n), env(t, tt, tt + 1.3, 0.25, 0.4));
      });
    }
    M3D.tag(ctx, api);
    api.finish(ctx, t, { bloom: 0.32, grain: 0.05, vignette: 0.5 });
    M3D.benchText(ctx, api);
  },
});
