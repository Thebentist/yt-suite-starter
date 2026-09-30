// @use videos/bad-breath-for-good/scenes/teeth/_lib.js
// @use videos/bad-breath-for-good/scenes/teeth/_gl.js
// braces (w1488-1508), phase 2, real 3D: "...even worse because there were so many little spots for that food and gum
// to just get all over those brackets." Both arches in occlusion with fixed appliances: stainless twin brackets bonded
// at the crown centre, a round archwire through the slots, lavender elastic O-ring ligatures tucked under the tie
// wings. Shots: wide (EVEN WORSE) -> macro on the upper incisor brackets, hardware named, red circles on the little
// spots -> lower arch 3/4 where food lands and gunk builds -> wide pull-back, food all over, BRACKETS.
const RU = 2.6, RL = 2.36, YWU = -0.56, YWL = -1.2;
const UT = [[0.43 / 2.6, 0.86], [1.22 / 2.6, 0.66], [1.94 / 2.6, 0.78], [2.68 / 2.6, 0.7], [3.37 / 2.6, 0.68]];
const LT = [[0.27 / 2.36, 0.54], [0.84 / 2.36, 0.6], [1.49 / 2.36, 0.7], [2.19 / 2.36, 0.7], [2.89 / 2.36, 0.7]];
// tooth-local (u, v, w) -> world, side = +1 right / -1 left (mirror)
function world(upper, i, side, u, v, w) {
  const T = upper ? UT[i] : LT[i], R = upper ? RU : RL, th = T[0];
  const dir = [Math.sin(th), Math.cos(th)], tg = [Math.cos(th), -Math.sin(th)];
  const x = u * tg[0] + (R + w) * dir[0], z = u * tg[1] + (R + w) * dir[1] - RU;
  return [side * x, upper ? -v : v - 1.62, z];
}
defineScene({
  name: 'braces',
  anchor: { word: 1488, offset: -0.15 },
  anchorEnd: { word: 1508, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    TEETH.init(api);
    this.gl = api.gl.create(api, TEETH3D.BRACES, { res: 0.5, aa: 2 });
    const A = (i) => api.at(i);
    this.W = { worse: A(1489), because: A(1490), many: A(1494), spots: A(1496), food: A(1499), gum: A(1501), all: A(1505), over: A(1506), those: A(1507), brackets: A(1508) };
    const w = this.W;
    this.shots = [
      { from: 0, a: { ro: [0.75, -0.62, 3.05], ta: [0, -0.86, -0.3], fov: 2.1 }, b: { ro: [0.3, -0.58, 2.85], ta: [0, -0.84, -0.3], fov: 2.1 } },
      { from: w.because, a: { ro: [0.95, -0.46, 1.3], ta: [0.36, -0.6, -0.02], fov: 2.2 }, b: { ro: [0.78, -0.5, 1.16], ta: [0.3, -0.6, -0.02], fov: 2.2 } },
      { from: w.spots, a: { ro: [-1.9, -1.35, 1.75], ta: [-0.55, -1.12, -0.25], fov: 2.2 }, b: { ro: [-1.62, -1.3, 1.6], ta: [-0.48, -1.1, -0.25], fov: 2.2 } },
      { from: w.all, a: { ro: [1.7, -0.75, 2.75], ta: [0.2, -0.88, -0.3], fov: 2.1 }, b: { ro: [1.25, -0.72, 3.05], ta: [0.1, -0.88, -0.3], fov: 2.1 } },
    ];
    // food traps: at the corners where the wire leaves each bracket, and on the gum side of the bracket
    const rnd = api.rand('braces-food'); this.food = [];
    const add = (upper, i, side, u, v, t0) => this.food.push({ p: world(upper, i, side, u, v, 0.1 + rnd() * 0.04), s: rnd() * 10, t0 });
    for (const upper of [false, true]) for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const T = upper ? UT[i] : LT[i], bw = T[1] * 0.4, vb = upper ? -YWU : YWL + 1.62;
      const first = !upper && side < 0 && i < 3;                        // the lower-left ones land first (shot 3 faces them)
      const t0 = first ? w.food + i * 0.08 + rnd() * 0.06 : w.all + (i * 0.1 + (upper ? 0.15 : 0)) + rnd() * 0.2;
      add(upper, i, side, (rnd() < 0.5 ? -1 : 1) * (bw * 0.55 + 0.03), vb + (rnd() - 0.5) * 0.08, t0);
      if (i < 3) add(upper, i, side, (rnd() - 0.5) * bw * 0.6, vb + (upper ? -1 : 1) * 0.2, t0 + 0.12);
    }
    this.food = this.food.slice(0, 32);
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp } = api, T3 = TEETH3D, w = this.W;
    const S = T3.pickShot(this.shots, t, api.duration), cam = S.cam;
    // food: each bit drops in from in front of the teeth over 0.25 s
    const F = new Float32Array(128); let n = 0, cx = 0, cy = 0, cz = 0;
    for (const f of this.food) {
      if (t < f.t0) continue; const k = ease.outCubic(clamp((t - f.t0) / 0.25));
      const p = [f.p[0], f.p[1] + (1 - k) * 0.25, f.p[2] + (1 - k) * 0.4];
      F[n * 4] = p[0]; F[n * 4 + 1] = p[1]; F[n * 4 + 2] = p[2]; F[n * 4 + 3] = f.s; cx += p[0]; cy += p[1]; cz += p[2]; n++;
    }
    let fc = [0, 5, 0], fr = 0.01;
    if (n) { fc = [cx / n, cy / n, cz / n]; for (let i = 0; i < n; i++) fr = Math.max(fr, Math.hypot(F[i * 4] - fc[0], F[i * 4 + 1] - fc[1], F[i * 4 + 2] - fc[2])); fr += 0.12; }
    const gunk = 0.85 * prog(t, w.gum - 0.05, 0.8, ease.inOutCubic);
    const u = { uTime: t, uSteps: 200, uGlow: 1, uBraces: 1, uGunk: gunk, uTieHue: 0, uNF: n, uF: F, uFC: fc, uFR: fr, ...T3.camUniforms(cam) };
    ctx.drawImage(this.gl.draw(u), 0, 0, api.W, api.H);
    const pj = (p) => T3.proj(cam, p);
    T3.bokeh(ctx, api, t, { seed: 70 + S.i, n: 6, r: 80, a: 0.05 });
    // ---- labels
    if (S.i === 0 && t >= w.worse) api.label(ctx, 'EVEN WORSE', 150, 140, { size: 72, p: pop(t, w.worse), bg: P.marker, color: '#ffffff', rotate: -0.02 });
    if (S.i === 1) {
      const vb = -YWU, bw = UT[0][1] * 0.4;
      const [bx, by] = pj(world(true, 0, 1, bw * 0.25, vb - 0.1, 0.15)), [wx, wy] = pj(world(true, 0, 1, -0.3, vb, 0.13)), [tx, ty] = pj(world(true, 0, 1, bw * 0.48, vb - 0.06, 0.13));
      TEETH.tag(ctx, 'BRACKET', bx, by, bx - 60, by - 250, prog(t, w.because + 0.05, 0.45), { size: 44 });
      TEETH.tag(ctx, 'WIRE', wx, wy, wx - 260, wy + 200, prog(t, w.because + 0.3, 0.45), { size: 44 });
      TEETH.tag(ctx, 'ELASTIC TIE', tx, ty, tx + 220, ty + 250, prog(t, w.because + 0.55, 0.45), { size: 44, color: '#d9c8ff' });
      // the little spots: marker circles where the wire meets each bracket
      const spots = [[true, 0, 1, -bw * 0.6, vb], [true, 0, 1, bw * 0.6, vb], [true, 1, 1, -UT[1][1] * 0.24, vb], [true, 0, -1, bw * 0.6, vb], [true, 1, 1, UT[1][1] * 0.24, vb]];
      spots.forEach((s, i) => {
        const k = prog(t, w.many + i * 0.09, 0.3, ease.inOutCubic); if (k <= 0) return;
        const [sx, sy] = pj(world(s[0], s[1], s[2], s[3], s[4], 0.12));
        api.doodle.circle(ctx, sx, sy, 58, 50, k, { color: P.marker, width: 7, seed: 11 + i });
      });
    }
    if (S.i === 2) {
      if (t >= w.food) api.label(ctx, 'FOOD', 150, 140, { size: 64, p: pop(t, w.food) });
    }
    if (S.i === 3) {
      api.doodle.text(ctx, 'all over', 150, 150, prog(t, w.all, 0.5, ease.linear), { color: P.lime, size: 72, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 10 });
      if (t >= w.those) {
        api.label(ctx, 'THOSE BRACKETS', 1770, 140, { size: 64, p: pop(t, w.those), align: 'right' });
        const tg = [[true, 0, 1], [true, 1, -1], [true, 2, 1], [false, 0, -1], [false, 2, 1], [false, 1, 1]];
        tg.forEach((q, i) => { const vb = q[0] ? -YWU : YWL + 1.62, [sx, sy] = pj(world(q[0], q[1], q[2], 0, vb, 0.13)); const k = prog(t, w.those + 0.05 + i * 0.07, 0.3, ease.inOutCubic); if (k > 0) api.doodle.circle(ctx, sx, sy, 66, 58, k, { color: P.lime, width: 6, seed: 30 + i }); });
      }
    }
    T3.artistic(ctx, api);
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });
  },
});
