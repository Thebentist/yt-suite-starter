// @use videos/bad-breath-for-good/scenes/mouth3d/_lib.js
/* regrow3d (w4373-4394, cut at w4456; replaces tongue/no-permanent). A time-lapse on the same 3D tongue: scraped clean,
 * the coating creeps back overnight (the light goes from warm day to cool night), scrape, it comes back again, so it
 * is a habit, not a one-off fix.
 * Words: "But for now, there's no permanent fix. It just kind of means that you just got to do your part every day."
 * Shots: the coating grows back overnight "no permanent fix" | top view, fast day cycles (scrape, regrow) with a day
 * counter | three-quarter view, the morning scrape, EVERY DAY and a row of ticked days.
 */
const FR = M3D.frag({
  parts: ['base', 'tongue'],
  uniforms: 'uniform float uNight;',
  map: 'float map(vec3 p){ return tongueMap(p); }',
  post: ['tongueShade'],
  render: `
vec3 render(vec2 fc){
  vec3 ro; vec3 rd = camRay(fc, ro);
  vec2 uv = (2. * fc - uRes) / uRes.y;
  vec3 bgD = mix(vec3(0.026, 0.011, 0.026), vec3(0.080, 0.030, 0.062), exp(-dot(uv - vec2(0.15, 0.25), uv - vec2(0.15, 0.25)) * 0.7));
  vec3 bgN = mix(vec3(0.010, 0.012, 0.030), vec3(0.030, 0.040, 0.095), exp(-dot(uv - vec2(0.15, 0.25), uv - vec2(0.15, 0.25)) * 0.7));
  vec3 bg = mix(bgD, bgN, uNight);
  float t = march(ro, rd, 5.0);
  if (t < 0.) return bg;
  vec3 p = ro + rd * t, n = calcNormal(p);
  vec3 col = shadeTongue(p, n, rd, t);
  return mix(col, bg, tongueFade(p));
}`,
});
const TZ = -0.2, TY = 0.16, R = 0.16, ZB = 0.3, ZF = -0.28;

defineScene({
  name: 'regrow3d',
  anchor: { word: 4373, offset: -0.15 },
  anchorEnd: { word: 4456, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    this.R = M3D.create(api, FR, { aa: 3, steps: 130, stepScale: 0.85 });
    const A = (i, o = 0) => api.at(i) + o;
    this.W = { no: A(4377), fix: A(4379), it: A(4380), got: A(4388), do: A(4390), every: A(4393), day: A(4394) };
    this.cuts = [0, this.W.it - 0.1, this.W.got - 0.1];   // the last shot must hold EVERY DAY on screen before the cut
  },
  pose(x, zl, lift = 0) {
    const zw = zl + TZ, pitch = TY + 0.04, yb = M3D.tongueTopY(x, zw + R, TZ, TY) + 0.004;
    return { P: [x, yb + 0.021 + R * Math.sin(pitch) + 0.002 + lift, zw], A: [pitch, 0, 0] };
  },
  // one morning: three quick pulls starting at t0 (each dur d); returns stripes, scraper pose, pile
  morning(t, t0, d, str) {
    const xs = [0, -0.11, 0.11], { clamp } = this.api;
    let scr = null, pile = 0;
    for (let n = 0; n < 3; n++) {
      const s0 = t0 + n * d, k = clamp((t - s0) / (d * 0.8));
      if (t >= s0) str.set([xs[n], R, ZB + (ZF - ZB) * k * k * (3 - 2 * k), ZB, 1], n * 5);
      if (t >= s0 - d * 0.25 && t < s0 + d) { const kk = k * k * (3 - 2 * k); scr = this.pose(xs[n], ZB + (ZF - ZB) * kk, t < s0 ? 0.1 * (s0 - t) / (d * 0.25) : (k >= 1 ? 0.12 * clamp((t - s0 - d * 0.8) / (d * 0.2)) : 0)); pile = kk * (1 - n * 0.3); }
    }
    return { scr, pile };
  },
  draw(ctx, t, api) {
    this.api = api;
    const { ease, clamp, lerp, P, prog, pop, env } = api, W = this.W;
    const S = M3D.shot(t, this.cuts, api.duration), u = S.u, k = S.k, io = ease.inOutSine(k), i = S.i;
    const str = new Float32Array(20);
    let coat = 0, day = 0, night = 0, scr = null, pile = 0, dayN = 1;
    if (i === 0) {                                     // clean, then it creeps back overnight
      const g = ease.inOutSine(clamp((t - 0.35) / (W.it - 0.6)));
      coat = g; day = 3.1; night = ease.inOutSine(clamp((t - 0.2) / 0.9)) * (1 - 0.15 * g);
      dayN = 1;
    } else if (i === 1) {                              // fast days: morning scrape, clean day, regrow overnight
      const T0 = this.cuts[1], per = (this.cuts[2] - T0) / 2;
      const n = Math.min(1, Math.floor((t - T0) / per)), c = (t - T0 - n * per) / per;   // c 0..1 through one day
      dayN = 2 + n; day = 4.3 + n * 1.7;
      const m = this.morning(t, T0 + n * per + 0.1 * per, per * 0.12, str); scr = m.scr; pile = m.pile;
      const regrow = ease.inOutSine(clamp((c - 0.55) / 0.42));
      coat = 1;
      if (c > 0.52) { str.fill(0); coat = regrow; }
      night = c < 0.45 ? 0.1 : ease.inOutSine(clamp((c - 0.45) / 0.3));
      if (c < 0.08) night = lerp(1, 0.1, c / 0.08);
    } else {                                           // the next morning, and every day
      const T0 = this.cuts[2];
      dayN = 4; day = 7.9;
      const m = this.morning(t, T0 + 0.03, 0.15, str); scr = m.scr; pile = m.pile;
      coat = 1; night = lerp(0.6, 0, ease.inOutSine(clamp(u / 0.25)));
    }
    const key = M3D.V.lerp([1.0, 0.86, 0.74], [0.34, 0.42, 0.78], night), fill = M3D.V.lerp([0.85, 0.62, 0.78], [0.35, 0.42, 0.8], night);
    let cam;
    if (i === 0) cam = { ro: M3D.V.orbit([0, 0.03, -0.08], lerp(1.02, 0.9, io), lerp(-0.5, -0.36, io), 0.8), ta: [0, 0.0, -0.06], fov: 2.2 };
    else if (i === 1) cam = { ro: M3D.V.orbit([0, 0.02, -0.14], lerp(1.42, 1.36, io), 0.0, 1.2), ta: [0, 0.0, -0.13], fov: 2.1 };
    else cam = { ro: M3D.V.orbit([0, 0.03, -0.05], lerp(1.0, 0.92, io), lerp(0.5, 0.42, io), 0.7), ta: [0, 0.02, -0.05], fov: 2.2 };
    const U = { ...M3D.LIGHTS, uKeyCol: key, uFillCol: fill, uFogK: 0.02, uTime: t, ...M3D.camU(cam), uJaw: 1, uTongueZ: TZ, uTongueY: TY,
      uCoat: coat, uCoatCol: [0.84, 0.78, 0.60], uCoatFuzz: 0.25, uCoatSolid: 0, uDay: day, uStr: str, uPile: pile, uScrBend: 1.6, uNight: night,
      uScrR: scr ? R : 0, uScrP: scr ? scr.P : [0, 0, 0], uScrA: scr ? scr.A : [0, 0, 0], uGag: 0, uLines: [-1, -1, -1, 0] };
    ctx.drawImage(M3D.timed(api, this.R, U), 0, 0, api.W, api.H);

    // ---- the day counter (bottom left, clear of the chapter card top left): sun or moon, DAY n
    {
      const x = 150, y = 950, a = prog(t, 0.1, 0.35) * (1 - prog(t, W.got - 0.1, 0.2));
      M3D.glass(ctx, api, x - 40, y - 58, 330, 116, 58, { alpha: a });
      ctx.save(); ctx.globalAlpha *= a;
      const cx = x + 18, cy = y;
      if (night > 0.5) { ctx.fillStyle = '#e8e4ff'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 6.2832); ctx.fill(); ctx.fillStyle = 'rgba(20,22,52,1)'; ctx.beginPath(); ctx.arc(cx + 12, cy - 8, 22, 0, 6.2832); ctx.fill(); }
      else { const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 52); g.addColorStop(0, 'rgba(255,212,59,0.8)'); g.addColorStop(1, 'rgba(255,212,59,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 52, 0, 6.2832); ctx.fill(); ctx.fillStyle = P.yellow; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, 6.2832); ctx.fill(); }
      api.text(ctx, 'DAY ' + dayN, x + 72, y + 22, { size: 62, tracking: 2 });
      ctx.restore();
    }
    if (i === 0) api.doodle.text(ctx, 'no permanent fix', 1560, 200, prog(t, W.no, 0.7), { color: P.ink, size: 66, align: 'center', rotate: -0.04, stroke: 'rgba(11,10,24,0.55)', strokeWidth: 9 });
    if (i === 2) {
      const ep = pop(t, W.got + 0.08, 0.45);                // lands on "got to do your part", readable before the cut
      if (ep > 0) api.label(ctx, 'EVERY DAY', 1500, 190, { p: ep, size: 76, align: 'center' });
      // a week of days, each ticking lime in turn
      const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      days.forEach((d, n) => {
        const bx = 1500 - 3 * 88 + n * 88, by = 330, tt = W.got + 0.12 + n * 0.06, pp = pop(t, tt, 0.35);
        if (pp <= 0) return;
        ctx.save(); ctx.translate(bx, by); ctx.scale(pp, pp);
        ctx.fillStyle = 'rgba(11,10,24,0.7)'; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 6.2832); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = P.lime; ctx.stroke(); ctx.restore();
        api.text(ctx, d, bx, by - 50, { size: 34, color: P.dim, align: 'center', alpha: clamp(pp) });
        api.doodle.check(ctx, bx, by + 3, 16, prog(t, tt + 0.1, 0.25), { color: P.lime, width: 8, passes: 1, seed: 5 + n });
      });
    }
    // sparkle on the freshly scraped back, each morning
    const sp = i === 2 ? env(t, this.cuts[2] + 0.5, api.duration, 0.15, 0.4) : 0;
    if (sp > 0) [[-0.1, 0.18], [0.07, 0.24], [0.0, 0.1]].forEach(([x, z], n) => { const q = M3D.project(cam, [x, M3D.tongueTopY(x, z + TZ, TZ, TY) + 0.01, z + TZ]); if (q) M3D.sparkle(ctx, q[0], q[1], 50 + 12 * Math.sin(t * 6 + n), sp); });
    M3D.tag(ctx, api);
    api.finish(ctx, t, { bloom: 0.32, grain: 0.05, vignette: 0.5 });
    M3D.benchText(ctx, api);
  },
});
