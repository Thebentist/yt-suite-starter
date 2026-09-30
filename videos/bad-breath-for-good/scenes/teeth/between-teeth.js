// @use videos/bad-breath-for-good/scenes/teeth/_lib.js
// @use videos/bad-breath-for-good/scenes/teeth/_gl.js
// between-teeth (w1390-1456), phase 2: real 3D (ray-marched) lower molars, cut every 1.5-3 s on the words.
// "Now the other spots in your mouth are kind of the same idea. In between your teeth, the food gets stuck there, they
// get bacteria, breaks it down, and you know, yada yada yada. You know, eventually the gum gets inflamed, bone disease,
// gum disease, all that type of stuff happens. And some of those gum disease bacteria actually make that same sulfur
// breakdown smell as well."  Facts: research-notes rows 2, 8, 20 (gum disease -> bone loss; pocket bacteria make VSCs).
const U = () => TEETH3D;
function marginY(x, st) {
  const pap = Math.exp(-(((x + 1.0) / 0.15) ** 2)) + Math.exp(-((x / 0.15) ** 2)) + Math.exp(-(((x - 0.95) / 0.15) ** 2));
  return 0.1 + 0.19 * pap + 0.045 * st.swell * (0.6 + 0.4 * pap) - (0.1 * pap + 0.05) * st.drop * Math.exp(-((x / 0.42) ** 2));
}
const crestY = (x, st) => -0.16 - 0.24 * st.drop * Math.exp(-((x / 0.42) ** 2));
defineScene({
  name: 'between-teeth',
  anchor: { word: 1390, offset: -0.15 },
  anchorEnd: { word: 1457, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    TEETH.init(api);
    this.gl = api.gl.create(api, TEETH3D.MOLARS, { res: 0.5, aa: 2 });
    const A = (i) => api.at(i);
    this.W = { other: A(1392), spots: A(1393), inW: A(1403), between: A(1404), food: A(1408), stuck: A(1410), they: A(1412), bacteria: A(1414),
      breaks: A(1415), and: A(1418), yada: A(1421), eventually: A(1426), gum: A(1428), inflamed: A(1430), bone: A(1431), gum2: A(1433), disease: A(1434),
      and2: A(1441), bact2: A(1447), make: A(1449), sulfur: A(1452), smell: A(1454) };
    const w = this.W;
    this.shots = [
      { from: 0, a: { ro: [1.55, 1.45, 3.4], ta: [-0.15, 0.15, 0], fov: 2.1 }, b: { ro: [0.95, 1.3, 3.5], ta: [-0.05, 0.2, 0], fov: 2.1 } },
      { from: w.inW, a: { ro: [0.6, 1.5, 1.6], ta: [0, 0.52, 0.05], fov: 2.2 }, b: { ro: [0.36, 1.28, 1.32], ta: [0, 0.52, 0.05], fov: 2.2 } },
      { from: w.they, a: { ro: [-0.55, 1.05, 1.15], ta: [0, 0.62, 0.05], fov: 2.2 }, b: { ro: [-0.38, 0.98, 0.98], ta: [0, 0.62, 0.05], fov: 2.2 } },
      { from: w.and, a: { ro: [-1.0, 1.15, 1.55], ta: [0, 0.35, 0], fov: 2.2 }, b: { ro: [1.0, 1.15, 1.55], ta: [0, 0.35, 0], fov: 2.2 } },
      { from: w.eventually, a: { ro: [0.34, 0.32, 1.28], ta: [0, 0.16, 0.2], fov: 2.2 }, b: { ro: [0.12, 0.27, 1.05], ta: [0, 0.16, 0.2], fov: 2.2 } },
      { from: w.bone, cut: 1, a: { ro: [0.95, 0.5, 1.75], ta: [0, -0.18, 0], fov: 2.2 }, b: { ro: [0.78, 0.42, 1.55], ta: [0, -0.2, 0], fov: 2.2 } },
      { from: w.gum2, cut: 1, a: { ro: [1.45, 0.55, 2.9], ta: [0.05, -0.25, 0], fov: 2.1 }, b: { ro: [0.75, 0.62, 3.1], ta: [0, -0.25, 0], fov: 2.1 } },
      { from: w.and2, cut: 1, a: { ro: [-1.15, 0.55, 1.85], ta: [0, -0.1, 0], fov: 2.3 }, b: { ro: [-0.9, 0.45, 1.6], ta: [0, -0.1, 0], fov: 2.3 } },
      { from: w.make, a: { ro: [0.95, 0.42, 1.95], ta: [0, 0.3, 0], fov: 2.1 }, b: { ro: [0.5, 0.5, 1.72], ta: [0, 0.32, 0], fov: 2.1 } },
    ];
    // bacteria: A around the food (arrive on "bacteria"), B along the buccal gum line (time-lapse), C in the pocket
    const rnd = api.rand('bt-bugs');
    this.bugsA = []; this.bugsB = []; this.bugsC = [];
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2, e = 0.15 + rnd() * 0.9, k = i < 10;
      const dir = [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)], er = 1 / Math.hypot(dir[0] / 0.15, dir[1] / 0.095, dir[2] / 0.12);
      const p = k ? [dir[0] * (er + 0.02), dir[1] * (er + 0.02), dir[2] * (er + 0.02)] : [0.03 + (rnd() - 0.5) * 0.03, -0.08 - (i - 10) * 0.07, 0.1 + (i - 10) * 0.07];
      this.bugsA.push({ p, ph: rnd() * 10, t0: w.bacteria - 0.35 + i * 0.05, from: [(rnd() - 0.5) * 1.5, 0, 0] });
    }
    for (let i = 0; i < 10; i++) {
      const x = -0.42 + i * 0.09 + (rnd() - 0.5) * 0.03;
      this.bugsB.push({ x, z: 0.39 + rnd() * 0.03, ph: rnd() * 10, t0: w.and + 0.2 + i * 0.12, dy: 0.02 + rnd() * 0.04 });
    }
    for (let i = 0; i < 8; i++) this.bugsC.push({ x: (i % 2 ? 1 : -1) * (0.015 + rnd() * 0.02), y: 0.1 - i * 0.05, z: 0.025, ph: rnd() * 10 });
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api, T3 = U(), w = this.W, nz = api.noise('bt');
    const S = T3.pickShot(this.shots, t, api.duration), cam = S.cam, cut = !!this.shots[S.i].cut;
    // ---- world state
    const st = { red: prog(t, w.gum - 0.1, 0.8, ease.inOutCubic), swell: prog(t, w.gum, 0.9, ease.inOutCubic), drop: prog(t, w.bone - 0.05, 1.0, ease.inOutCubic), pocket: prog(t, w.bone, 1.2, ease.inOutCubic) };
    const plaque = cut ? 0 : Math.min(0.9, 0.35 * prog(t, w.bacteria, 2.0) + 0.55 * prog(t, w.and, w.eventually - w.and, ease.linear));
    const fall = prog(t, w.food - 0.15, 0.45, ease.inQuad), wedge = prog(t, w.stuck - 0.05, 0.35, ease.outBack);
    const foodY = lerp(2.2, 0.73, fall) - 0.05 * wedge, foodS = 1 - 0.22 * prog(t, w.breaks, 3.0, ease.inOutSine);
    const bugs = [];
    if (!cut) {
      for (const b of (S.i < 8 ? this.bugsA : [])) {
        if (t < b.t0) continue; const a = prog(t, b.t0, 0.8, ease.outCubic);
        const wig = [nz(t * 0.8 + b.ph, 1) * 0.012, nz(t * 0.8 + b.ph, 2) * 0.01, nz(t * 0.8 + b.ph, 3) * 0.012];
        const home = [0.02 + b.p[0] * foodS, foodY + b.p[1] * foodS, 0.05 + b.p[2] * foodS];
        bugs.push({ p: [lerp(home[0] + b.from[0], home[0], a) + wig[0], lerp(home[1] + 1.2, home[1], a) + wig[1], lerp(home[2] + 0.6, home[2], a) + wig[2]], ph: b.ph + t * 0.3 });
      }
      for (const b of this.bugsB) {
        if (t < b.t0) continue; const a = prog(t, b.t0, 0.5, ease.outBack);
        bugs.push({ p: [b.x + nz(t + b.ph, 4) * 0.01, marginY(b.x, st) + b.dy * a, b.z], ph: b.ph + t * 0.2 });
      }
    } else {
      for (const b of this.bugsC) {
        const yy = Math.max(crestY(b.x, st) + 0.06, Math.min(marginY(b.x, st) - 0.05, b.y));
        bugs.push({ p: [b.x + nz(t + b.ph, 5) * 0.004, yy + nz(t * 0.7 + b.ph, 6) * 0.01, b.z], ph: b.ph + t * 0.4 });
      }
    }
    const glow = prog(t, w.bact2 - 0.1, 0.5) * (t < w.make ? 1 : 0);
    const u = T3.molarsU(t, cam, {
      uRed: st.red, uSwell: st.swell, uDrop: st.drop, uPocket: st.pocket, uPlaque: plaque, uCut: cut ? 1 : 0, uCutZ: 0,
      uFood: !cut && S.i < 8 && t > w.food - 0.2 ? 1 : 0, uFoodP: [0.02, foodY, 0.05], uFoodS: foodS,
      uBugGlow: glow, uBugS: cut ? 0.028 : 0.024, ...T3.packBugs(bugs),
    });
    ctx.drawImage(this.gl.draw(u), 0, 0, api.W, api.H);
    const pj = (p) => T3.proj(cam, p);

    // ---- depth layers over the render
    if (S.i === 8 || (S.i === 7 && t > w.bact2)) {         // sulfur gas out of the gum line / pocket
      const from = S.i === 8 ? w.make - 0.2 : w.bact2;
      for (let i = 0; i < 16; i++) {
        const t0 = from + i * 0.2, k = (t - t0) / 2.6; if (k <= 0 || k >= 1) continue;
        const x = (i % 5 - 2) * 0.06 + nz(i * 3.1, 1) * 0.08, base = S.i === 8 ? [x, marginY(x, st) + 0.02, 0.36] : [x * 0.3, 0.05, 0.04];
        const [sx, sy, sz] = pj(base), up = (S.i === 8 ? 520 : 380) * (1 - Math.pow(1 - k, 1.7));
        T3.gas(ctx, api, sx + nz(i + k * 2, 2) * 90 * k, sy - up, (60 + 260 * k) * (1.6 / Math.max(0.6, sz)), Math.sin(Math.min(1, k * 1.5) * Math.PI) * 0.8, 'bt' + i);
      }
      for (let i = 0; i < 4; i++) {
        const t0 = from + 0.3 + i * 0.45, k = (t - t0) / 2.4; if (k <= 0 || k >= 1) continue;
        const [sx, sy] = pj([(i % 2 ? 1 : -1) * 0.12, 0.35, 0.3]);
        ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI);
        if (i === 3) ctx.filter = 'blur(5px)';
        api.icons.h2s(ctx, sx + (i - 1.5) * 120, sy - 150 - k * 380, i === 3 ? 58 : 34, t * 0.9 + i);
        ctx.restore();
      }
    }
    if (!api.params.nobokeh) T3.bokeh(ctx, api, t, { seed: S.i + 1, n: 7, r: 70, a: 0.06 });

    // ---- labels (landing on the words)
    const inShot = (i) => S.i === i;
    if (inShot(0)) {
      api.label(ctx, 'THE OTHER SPOTS', 150, 130, { size: 56, p: pop(t, w.spots) });
      const [tx, ty] = pj([-0.55, 0.45, 0.42]), [gx, gy] = pj([0.55, 0.0, 0.5]);
      TEETH.tag(ctx, 'TOOTH', tx, ty, tx - 120, ty - 170, prog(t, 0.55, 0.5), { size: 42 });
      TEETH.tag(ctx, 'GUM', gx, gy, gx + 150, gy + 120, prog(t, 1.0, 0.5), { size: 42 });
    }
    if (inShot(1)) {
      api.label(ctx, 'BETWEEN YOUR TEETH', 150, 130, { size: 56, p: pop(t, w.between) });
      const fp = pop(t, w.food + 0.05);
      if (fp > 0) { const [fx, fy] = pj([0.02, foodY, 0.05]); api.leader(ctx, fx + 30, fy - 20, 1500, 230, clamp(fp), { color: P.ink, width: 3 }); api.label(ctx, 'FOOD', 1500, 230, { size: 50, p: fp, align: 'left' }); }
      if (t > w.stuck) api.doodle.text(ctx, 'stuck', 1510, 330, prog(t, w.stuck, 0.5), { color: P.lime, size: 56, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 9 });
    }
    if (inShot(2)) {
      const bp = pop(t, w.bacteria);
      if (bp > 0) { const [bx, by] = pj([0.19, 0.78, 0.1]); api.leader(ctx, bx, by, 1480, 200, clamp(bp), { color: '#9ff0bf', width: 3 }); api.label(ctx, 'BACTERIA', 1480, 200, { size: 54, p: bp, bg: '#46d58a', align: 'left' }); }
      api.doodle.text(ctx, 'breaking it down', 150, 960, prog(t, w.breaks, 0.8, ease.linear), { color: P.lime, size: 56, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 9 });
    }
    if (inShot(3)) {
      const yd = prog(t, w.yada - 0.1, 0.9, ease.linear), x0 = 150, y0 = 140;
      for (let q = 0; q < 2; q++) api.doodle.stroke(ctx, [[x0 + q * 42, y0 - 32], [x0 + q * 42 + 36, y0], [x0 + q * 42, y0 + 32]], clamp(yd * 3 - q * 0.3), { color: P.lime, width: 8, seed: 20 + q });
      api.doodle.text(ctx, 'yada yada yada', x0 + 120, y0 + 18, clamp((yd - 0.1) * 1.4), { color: P.ink, size: 58, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 9 });
      api.text(ctx, 'PLAQUE BUILDS UP', 150, 980, { size: 40, color: P.dim, tracking: 3, alpha: prog(t, w.and + 0.3, 0.5) });
    }
    if (inShot(4)) {
      const [px, py] = pj([0, marginY(0, st) - 0.06, 0.34]), th = prog(t, w.gum, 0.5);
      if (th > 0) {
        const beat = 0.5 + 0.5 * Math.sin(t * 7.5);
        for (const sd of [-1, 1]) for (let q = 0; q < 3; q++) {
          const r0 = 150 + q * 40 + beat * 10, a0 = (q - 1) * 0.4, pts = [];
          for (let k = 0; k <= 8; k++) { const a = a0 - 0.2 + (k / 8) * 0.4; pts.push([px + sd * Math.cos(a) * r0, py + Math.sin(a) * r0 * 0.9]); }
          api.doodle.stroke(ctx, pts, clamp(th * 1.6 - q * 0.2), { color: P.marker, width: 7, seed: 40 + q + (sd > 0 ? 9 : 0), alpha: 0.65 + 0.35 * beat });
        }
      }
      api.label(ctx, 'INFLAMED', 150, 130, { size: 60, p: pop(t, w.inflamed), bg: P.marker, color: '#ffffff' });
    }
    if (inShot(5)) {
      const k = prog(t, w.bone, 0.5);
      if (k > 0) {
        const a = pj([-0.34, -0.16, 0.0]), b = pj([0.34, -0.16, 0.0]), c = pj([0, crestY(0, st), 0.0]);
        ctx.save(); ctx.globalAlpha = k; ctx.setLineDash([16, 12]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = P.marker; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
        ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const ax = b[0] + 60; ctx.beginPath(); ctx.moveTo(ax, a[1] + 16); ctx.lineTo(ax, c[1] - 10); ctx.moveTo(ax - 30, c[1] - 44); ctx.lineTo(ax, c[1] - 8); ctx.lineTo(ax + 30, c[1] - 44); ctx.stroke();
        ctx.restore();
        api.text(ctx, 'BONE LEVEL', b[0] + 20, b[1] + 12, { size: 36, color: P.ink, tracking: 2, alpha: k, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 7 });
      }
      api.label(ctx, 'BONE LOSS', 150, 130, { size: 60, p: pop(t, w.bone + 0.05), bg: P.marker, color: '#ffffff' });
    }
    if (inShot(6)) {
      api.label(ctx, 'GUM DISEASE', 960, 130, { size: 84, p: pop(t, w.disease), align: 'center' });
      const [px, py] = pj([0, 0.0, 0.0]), k = prog(t, w.disease + 0.4, 0.5, ease.inOutCubic);
      if (k > 0) api.doodle.circle(ctx, px, py, 120, 170, k, { color: P.marker, width: 7, seed: 9 });
      api.text(ctx, 'POCKET', px + 150, py + 12, { size: 38, color: P.ink, tracking: 2, alpha: prog(t, w.disease + 0.8, 0.4), stroke: 'rgba(0,0,0,0.6)', strokeWidth: 7 });
    }
    if (inShot(7)) api.label(ctx, 'GUM DISEASE BACTERIA', 150, 130, { size: 52, p: pop(t, w.bact2), bg: '#46d58a' });
    if (inShot(8)) api.label(ctx, 'SAME SULFUR SMELL', 150, 130, { size: 60, p: pop(t, w.sulfur), bg: P.gas, rotate: -0.02 });
    T3.artistic(ctx, api);
    if (!api.params.nofinish) api.finish(ctx, t, { bloom: cut ? 0.12 : 0.3, grain: 0.05, vignette: 0.5 });
  },
});
