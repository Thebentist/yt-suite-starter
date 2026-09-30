// @use videos/bad-breath-for-good/scenes/teeth/_lib.js
// @use videos/bad-breath-for-good/scenes/teeth/_gl.js
// floss (w2858-2890), phase 2: "Now obviously you want to clean between your teeth and floss every day because that same
// bacteria is sitting inside in between all those nooks and crannies, also breaking down all that food."
// The same 3D molars (plaque, a wedged food fibre, bacteria in the gap). The floss strand runs cheek-to-tongue through
// the contact as it does in a real mouth: it seats on "floss", scrapes each side on "nooks and crannies", and lifts the
// food out; the last shot is a macro of bacteria on that food. Cuts land on the words.
function marginY(x) {
  const pap = Math.exp(-(((x + 1.0) / 0.15) ** 2)) + Math.exp(-((x / 0.15) ** 2)) + Math.exp(-(((x - 0.95) / 0.15) ** 2));
  return 0.1 + 0.19 * pap;
}
defineScene({
  name: 'floss',
  anchor: { word: 2858, offset: -0.15 },
  anchorEnd: { word: 2891, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    TEETH.init(api);
    this.gl = api.gl.create(api, TEETH3D.MOLARS, { res: 0.5, aa: 2 });
    const A = (i) => api.at(i);
    this.W = { clean: A(2863), between: A(2864), floss: A(2868), every: A(2869), because: A(2871), bacteria: A(2874), sitting: A(2876), inside: A(2877),
      all: A(2880), nooks: A(2882), crannies: A(2884), also: A(2885), breaking: A(2886), food: A(2890) };
    const w = this.W;
    this.shots = [
      { from: 0, a: { ro: [1.45, 1.3, 3.0], ta: [-0.05, 0.25, 0], fov: 2.1 }, b: { ro: [0.85, 1.2, 3.1], ta: [0, 0.28, 0], fov: 2.1 } },
      { from: w.between, a: { ro: [0.62, 1.1, 1.55], ta: [0, 0.45, 0.05], fov: 2.2 }, b: { ro: [0.45, 1.0, 1.38], ta: [0, 0.45, 0.05], fov: 2.2 } },
      { from: w.because, a: { ro: [0.16, 0.33, 0.98], ta: [0, 0.38, 0], fov: 2.2 }, b: { ro: [0.07, 0.35, 0.86], ta: [0, 0.38, 0], fov: 2.2 } },
      { from: w.all, a: { ro: [0.5, 0.58, 1.28], ta: [0, 0.4, 0.05], fov: 2.2 }, b: { ro: [0.34, 0.54, 1.12], ta: [0, 0.4, 0.05], fov: 2.2 } },
      { from: w.also, a: { ro: [0.36, 1.12, 0.8], ta: [0, 0.98, 0.05], fov: 2.2 }, b: { ro: [0.26, 1.1, 0.66], ta: [0, 1.0, 0.05], fov: 2.2 } },
    ];
    const rnd = api.rand('fl-bugs');
    this.gap = []; this.onFood = [];
    for (let i = 0; i < 14; i++) {
      const side = i % 2 ? 1 : -1;
      const y = 0.31 + rnd() * 0.13, z = 0.3 + rnd() * 0.12;
      this.gap.push({ p: [side * (0.03 + rnd() * 0.07 + (y - 0.31) * 0.2), y, z], ph: rnd() * 10, fly: [side * (0.25 + rnd() * 0.3), 0.45 + rnd() * 0.4, 0.05 + rnd() * 0.1] });
    }
    for (let i = 0; i < 10; i++) {
      const a = rnd() * Math.PI * 2, e = -0.3 + rnd() * 1.3, dir = [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)];
      const er = 1 / Math.hypot(dir[0] / 0.15, dir[1] / 0.095, dir[2] / 0.12);
      this.onFood.push({ d: [dir[0] * (er + 0.018), dir[1] * (er + 0.018), dir[2] * (er + 0.018)], ph: rnd() * 10 });
    }
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api, T3 = TEETH3D, w = this.W, nz = api.noise('fl');
    const S = T3.pickShot(this.shots, t, api.duration), cam = S.cam;
    // ---- floss vertex: descends, seats on the contact, snaps through on "floss", scrapes, lifts the food
    let vx = 0, vy = 1.9;
    const down = prog(t, w.floss - 0.85, 0.75, ease.inOutCubic), snap = prog(t, w.floss + 0.02, 0.1, ease.inQuad);
    vy = lerp(1.9, 0.64, down); vy = lerp(vy, 0.3, snap);
    if (t >= w.all) {
      const k = (t - w.all) / Math.max(0.2, w.also - w.all);
      vx = (k < 0.5 ? -0.028 : 0.028); vy = 0.3 + 0.17 * (0.5 - 0.5 * Math.cos(k * Math.PI * 4));
    }
    const lift = prog(t, w.also - 0.25, 0.7, ease.inOutCubic);
    vy = lerp(vy, 0.92, lift); vx = lerp(vx, 0, lift);
    vy += prog(t, w.also + 0.5, 3, ease.linear) * 0.05;
    const flossOn = S.i !== 2 && t > w.floss - 0.9;
    const V = [vx, vy, 0.02], FL = [vx - 0.02, vy + 1.6, 1.45], FR = [vx + 0.02, vy + 1.6, -1.45];
    // ---- food: wedged, then carried up on the floss
    const foodP = lift > 0 ? [lerp(0.02, vx, lift), lerp(0.73, vy + 0.08, lift), lerp(0.05, 0.02, lift)] : [0.02, 0.73, 0.05];
    const foodS = 1 - 0.2 * prog(t, w.breaking, 1.5, ease.inOutSine);
    // ---- bacteria
    const bugs = [];
    if (S.i < 4) for (const b of this.gap) {
      let p = b.p.slice();
      const hit = t >= w.all ? w.all + (b.p[0] < 0 ? 0 : 0.5) * (w.also - w.all) + (0.52 - b.p[1]) * 0.8 : 1e9, f = prog(t, hit, 0.6, ease.outCubic);
      if (f >= 1) continue;
      p = [p[0] + b.fly[0] * f + nz(t + b.ph, 1) * 0.004, p[1] + b.fly[1] * f + nz(t + b.ph, 2) * 0.004, p[2] + b.fly[2] * f];
      bugs.push({ p, ph: b.ph + t * 0.3 });
    }
    if (S.i === 4 || S.i === 0 || S.i === 1) for (const b of this.onFood) {
      const wig = nz(t * 0.9 + b.ph, 4) * 0.012;
      bugs.push({ p: [foodP[0] + b.d[0] * foodS + wig, foodP[1] + b.d[1] * foodS + wig * 0.5, foodP[2] + b.d[2] * foodS - wig], ph: b.ph + t * 0.4 });
    }
    const u = T3.molarsU(t, cam, { uPlaque: 0.5 * (1 - prog(t, w.all, w.also - w.all, ease.linear)) + 0.15, uFood: 1, uFoodP: foodP, uFoodS: foodS,
      uFloss: flossOn ? 1 : 0, uFV: V, uFL: FL, uFR: FR, uBugS: S.i === 4 ? 0.02 : 0.024, ...T3.packBugs(bugs) });
    ctx.drawImage(this.gl.draw(u), 0, 0, api.W, api.H);
    const pj = (p) => T3.proj(cam, p);
    // snap flash on the contact
    const sf = (t - w.floss - 0.08) / 0.35;
    if (S.i === 1 && sf > 0 && sf < 1) {
      const [sx, sy] = pj([0, 0.45, 0.35]);
      ctx.save(); ctx.globalAlpha = 1 - sf; ctx.strokeStyle = P.lime; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, r0 = 40 + sf * 40, r1 = 80 + sf * 90; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); ctx.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1); ctx.stroke(); }
      ctx.restore();
    }
    T3.bokeh(ctx, api, t, { seed: 50 + S.i, n: 7, r: 70, a: 0.06 });
    // ---- labels
    if (S.i === 0) api.text(ctx, 'CLEAN BETWEEN YOUR TEETH', 150, 150, { size: 48, color: P.ink, tracking: 2, alpha: prog(t, w.clean, 0.4), stroke: 'rgba(0,0,0,0.55)', strokeWidth: 8 });
    if (S.i === 1 && t >= w.floss) api.label(ctx, 'FLOSS EVERY DAY', 150, 140, { size: 64, p: pop(t, w.floss) });
    if (S.i === 2 && t >= w.bacteria) {
      const [bx, by] = pj(this.gap[1].p);
      api.leader(ctx, bx, by, 1440, 200, clamp(pop(t, w.bacteria)), { color: '#9ff0bf', width: 3 });
      api.label(ctx, 'BACTERIA', 1440, 200, { size: 58, p: pop(t, w.bacteria), bg: '#46d58a', align: 'left' });
      api.doodle.text(ctx, 'sitting in between', 150, 960, prog(t, w.sitting, 0.9, ease.linear), { color: P.lime, size: 56, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 9 });
    }
    if (S.i === 3) {
      const [cx, cy] = pj([0, 0.4, 0.3]), k = prog(t, w.nooks - 0.05, 0.45, ease.inOutCubic);
      if (k > 0) api.doodle.circle(ctx, cx, cy, 170, 230, k, { color: P.marker, width: 8, seed: 5 });
      api.doodle.text(ctx, 'nooks & crannies', 150, 150, prog(t, w.nooks, 0.6, ease.linear), { color: P.ink, size: 62, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 9 });
    }
    if (S.i === 4 && t >= w.breaking) api.label(ctx, 'BREAKING DOWN FOOD', 150, 140, { size: 60, p: pop(t, w.breaking) });
    T3.artistic(ctx, api);
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });
  },
});
