// @use videos/bad-breath-for-good/scenes/teeth/_lib.js
// @use videos/bad-breath-for-good/scenes/teeth/_gl.js
// alcohol-mouthwash (w2552-2626), phase 2, real 3D. Ben's recommendation, shown as he says it (research-notes row 13:
// the evidence is mixed; no extra claim goes on screen).
// "And then obviously we have the alcohol mouthwash thing. I definitely wouldn't use alcohol mouthwash if I was you,
// because it can dry out your mouth even more. And even more importantly, it can kill some of the good bacteria that
// fight those bacteria that cause those volatile sulfur compounds. So try and find an alcohol-free mouthwash if you
// are going to go that route."
// Shots: 1 bottle hero (ALCOHOL label) -> 2 the pour into a dosing cup (on "use alcohol mouthwash") -> 3 tongue-surface
// macro, glossy and wet, then it dries and cracks ("dry out your mouth") -> 4 macro with good (teal) and bad (green)
// bacteria, a good one nudging a bad one ("fight"), VSC haze from the bad ones -> 5 the alcohol film sweeps across and
// both kinds die ("kill some of the good bacteria") -> 6 the two bottles, ALCOHOL-FREE lit and checked.
defineScene({
  name: 'alcohol-mouthwash',
  anchor: { word: 2552, offset: -0.15 },
  anchorEnd: { word: 2626, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    TEETH.init(api);
    const T3 = TEETH3D;
    this.gb = api.gl.create(api, T3.BOTTLE, { res: 0.5, aa: 2 }); T3.bindTexture(this.gb, T3.labelCanvas());
    this.gm = api.gl.create(api, T3.MUCOSA, { res: 0.5, aa: 2 });
    const A = (i) => api.at(i);
    this.W = { alcohol: A(2558), wouldnt: A(2563), use: A(2564), mw2: A(2566), because: A(2573), dry: A(2576), mouth: A(2579), even: A(2580),
      importantly: A(2585), kill: A(2588), good: A(2592), bact: A(2593), fight: A(2595), those: A(2596), cause: A(2599), volatile: A(2601),
      so: A(2605), alcfree: A(2615), free: A(2616), mw3: A(2617), if2: A(2618), root: A(2626) };
    const w = this.W;
    this.cuts = [0, w.wouldnt, w.because, w.importantly, w.good, w.so];
    this.washT = [w.kill, w.good + 0.25, w.volatile + 0.2, w.so - 0.1];   // S3 sweep: kill -> good; S4 sweep: after VSCs
    const rnd = api.rand('amw-bugs'); this.bugs = [];
    for (let i = 0, tries = 0; i < 22 && tries < 2000; tries++) {
      const x = -0.62 + rnd() * 1.24, z = -0.45 + rnd() * 0.6;
      if (this.bugs.some((b) => Math.hypot(b.x - x, b.z - z) < 0.15)) continue;
      this.bugs.push({ x, z, ph: rnd() * 20, kind: i % 3 === 0 ? 1 : 0 }); i++;
    }
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api, T3 = TEETH3D, w = this.W, nz = api.noise('amw');
    let S = 0; for (let i = 0; i < this.cuts.length; i++) if (t >= this.cuts[i]) S = i;
    const s0 = this.cuts[S], s1 = S + 1 < this.cuts.length ? this.cuts[S + 1] : api.duration, k = clamp((t - s0) / (s1 - s0)), e = ease.inOutSine(k);
    const liqA = [0.85, 0.48, 0.07], liqB = [0.16, 0.72, 0.64];
    if (S === 0 || S === 1 || S === 5) {
      // ---------------------------------------------------------------- bottle world
      let u;
      if (S === 0) {
        const c = { ro: [lerp(-1.1, -0.5, e), lerp(1.35, 1.25, e), lerp(2.7, 2.35, e)], ta: [0, 0.95, 0], fov: 2.2 };
        u = { ...T3.camUniforms(c), uA: [0, 0, 0.0, 1], uAY: 0, uB2: [9, 0, 0, 0], uBY: 0, uLevA: 1.15, uLevB: 1.15, uCupOn: 0, uCupFill: 0, uStream: 0 };
      } else if (S === 1) {
        const tilt = 1.95 * ease.inOutCubic(prog(t, s0, 0.7)), lift = 0.5 * ease.inOutCubic(prog(t, s0, 0.6));
        const pouring = t > s0 + 0.55 ? 1 : 0, fill = prog(t, s0 + 0.6, s1 - s0 - 0.6, ease.linear);
        const mouth = [-0.18 + Math.sin(tilt) * 0.86, lift + 0.9 + Math.cos(tilt) * 0.86, 0];
        const cup = [0.95, 0, 0.1];
        const c = { ro: [lerp(0.9, 0.7, e), lerp(1.3, 1.2, e), lerp(3.3, 3.0, e)], ta: [0.45, 0.8, 0.05], fov: 2.2 };
        u = { ...T3.camUniforms(c), uA: [-0.18, 0, tilt, 1], uAY: lift, uB2: [9, 0, 0, 0], uBY: 0, uLevA: lerp(0.75, 0.62, fill), uLevB: 1.15,
          uCupOn: 1, uCup: cup, uCupFill: 0.1 + 0.8 * fill, uStream: pouring, uS0: mouth, uS1: [mouth[0] + 0.32, mouth[1] - 0.05, 0.05], uS2: [cup[0], 0.12 + 0.18 * fill, cup[2]] };
      } else {
        const outA = ease.inCubic(prog(t, s0 + 0.05, 0.45)), inB = ease.outBack(prog(t, w.alcfree - 0.1, 0.5));
        const c = { ro: [lerp(0.1, 0.45, e), 1.2, lerp(3.4, 3.1, e)], ta: [0.1, 0.9, 0], fov: 2.2 };
        u = { ...T3.camUniforms(c), uA: [-0.55 - 1.4 * outA * 0, 0, 0, 1], uAY: 0, uB2: [0.65, 0, 0, t > w.alcfree - 0.1 ? 1 : 0], uBY: (1 - inB) * 1.6, uLevA: 1.15, uLevB: 1.15, uCupOn: 0, uCupFill: 0, uStream: 0 };
      }
      ctx.drawImage(this.gb.draw({ uTime: t, uSteps: 170, uGlow: 1, uLiqA: liqA, uLiqB: liqB, ...u }), 0, 0, api.W, api.H);
      T3.bokeh(ctx, api, t, { seed: 80 + S, n: 7, r: 90, a: 0.05, color: '255,210,150' });
      if (S === 0) {
        if (t >= w.alcohol) api.label(ctx, 'ALCOHOL MOUTHWASH', 150, 140, { size: 60, p: pop(t, w.alcohol) });
      } else if (S === 1) {
        api.doodle.text(ctx, "I wouldn't use it", 150, 150, prog(t, s0 + 0.1, 0.9, ease.linear), { color: P.ink, size: 62, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 9 });
      } else {
        const ca = { ro: [lerp(0.1, 0.45, e), 1.2, lerp(3.4, 3.1, e)], ta: [0.1, 0.9, 0], fov: 2.2 };
        const [ax, ay] = T3.proj(ca, [-0.55, 1.0, 0.25]), [bx, by] = T3.proj(ca, [0.65, 1.0, 0.25]);
        const xo = prog(t, s0 + 0.3, 0.45, ease.inOutCubic);
        if (xo > 0) api.doodle.cross(ctx, ax, ay, 130, xo, { color: P.marker, width: 16, seed: 3 });
        if (t >= w.free) api.label(ctx, 'ALCOHOL-FREE', bx, 150, { size: 60, p: pop(t, w.free), align: 'center' });
        const ck = prog(t, w.mw3, 0.45, ease.inOutCubic);
        if (ck > 0) api.doodle.check(ctx, bx + 270, 150, 50, ck, { color: P.lime, width: 14, seed: 8 });
        api.doodle.text(ctx, 'if you go that route', 150, 980, prog(t, w.if2, 1.0, ease.linear), { color: P.ink, size: 54, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 9 });
      }
    } else {
      // ---------------------------------------------------------------- tongue-surface macro
      let c, uu = {};
      if (S === 2) {
        const dry = ease.inOutCubic(prog(t, w.dry - 0.1, 1.1));
        c = { ro: [lerp(-0.1, 0.1, e), lerp(0.55, 0.42, e), lerp(0.75, 0.62, e)], ta: [0, 0, -0.1], fov: 2.0 };
        uu = { uWet: 1, uDry: dry, uWash: 0.35 * (1 - dry), uWashX: 5, ...T3.packBugsX([]) };
      } else {
        const W0 = S === 3 ? this.washT[0] : this.washT[2], W1 = S === 3 ? this.washT[1] + 1.6 : this.washT[3];
        const wash = t > W0 ? 1 : 0, wx = lerp(-1.0, 1.0, prog(t, W0, W1 - W0, ease.linear));
        const list = this.bugs.map((b, i) => {
          const hit = W0 + ((b.x + 1.0) / 2.0) * (W1 - W0), dead = prog(t, hit, 0.5);
          let x = b.x + nz(t * 0.4 + b.ph, 1) * 0.02 * (1 - dead), z = b.z + nz(t * 0.4 + b.ph, 2) * 0.02 * (1 - dead);
          if (S === 4 && i === 3) { const bump = Math.sin(clamp((t - w.fight + 0.1) / 0.5) * Math.PI); x += bump * 0.05; }
          return { p: [x, 0.045 - 0.012 * dead, z], ph: b.ph + t * 0.3 * (1 - dead), kind: b.kind, dead };
        });
        c = S === 4 ? { ro: [lerp(0.25, 0.05, e), lerp(0.5, 0.42, e), lerp(0.7, 0.6, e)], ta: [0, 0.02, -0.12], fov: 2.1 }
          : { ro: [lerp(-0.1, 0.12, e), 0.62, 0.68], ta: [0, 0.02, -0.15], fov: 2.0 };
        uu = { uWet: 1, uDry: 0.25, uWash: wash, uWashX: wx, uBugS: 0.032, ...T3.packBugsX(list) };
      }
      ctx.drawImage(this.gm.draw({ uTime: t, uSteps: 170, uGlow: 1, ...T3.camUniforms(c), ...uu }), 0, 0, api.W, api.H);
      const pj = (p) => T3.proj(c, p);
      if (S === 2) {
        // vapour leaving the drying surface
        const vap = prog(t, w.dry - 0.1, 0.4) * (1 - prog(t, s1 - 0.4, 0.4));
        for (let i = 0; i < 10 && vap > 0; i++) {
          const q = ((t - w.dry) * 0.45 + i / 10) % 1; if (q < 0) continue;
          const [x0, y0] = pj([-0.6 + (i % 5) * 0.3, 0.03, -0.3 + Math.floor(i / 5) * 0.3]);
          ctx.save(); ctx.globalAlpha = vap * Math.sin(q * Math.PI) * 0.45; ctx.strokeStyle = '#fff4ee'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.filter = 'blur(3px)'; ctx.beginPath();
          for (let j = 0; j <= 12; j++) { const yy = y0 - q * 260 - j * 11, xx = x0 + Math.sin(j * 0.7 + t * 3 + i) * 14; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
          ctx.stroke(); ctx.restore();
        }
        if (t >= w.dry) api.label(ctx, 'DRIES OUT YOUR MOUTH', 150, 140, { size: 60, p: pop(t, w.dry) });
        api.doodle.text(ctx, 'even more', 160, 240, prog(t, w.even, 0.5, ease.linear), { color: P.lime, size: 58, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 9 });
      }
      if (S === 3) {
        if (t >= w.kill) api.label(ctx, 'CAN KILL THEM', 150, 140, { size: 60, p: pop(t, w.kill), bg: P.marker, color: '#ffffff' });
        const [lx, ly] = pj([lerp(-1.0, 1.0, prog(t, this.washT[0], this.washT[1] + 1.6 - this.washT[0], ease.linear)) - 0.05, 0.02, 0.1]);
        if (t > w.kill) api.text(ctx, 'ALCOHOL', Math.max(150, lx - 200), 980, { size: 46, color: '#ffd48a', tracking: 4, alpha: prog(t, w.kill, 0.3), stroke: 'rgba(0,0,0,0.5)', strokeWidth: 7 });
      }
      if (S === 4) {
        const g = this.bugs[0], [gx, gy] = pj([g.x, 0.08, g.z]);
        api.leader(ctx, gx, gy, 1480, 170, clamp(pop(t, w.good)), { color: '#8ff3f6', width: 3 });
        api.label(ctx, 'GOOD BACTERIA', 1480, 170, { size: 54, p: pop(t, w.good), bg: '#35c3c9', align: 'left' });
        const sp = (t - w.fight - 0.15) / 0.45;
        if (sp > 0 && sp < 1) { const b = this.bugs[3], [sx, sy] = pj([b.x + 0.05, 0.05, b.z]); ctx.save(); ctx.globalAlpha = 1 - sp; ctx.strokeStyle = P.lime; ctx.lineWidth = 6; ctx.lineCap = 'round'; for (let q = 0; q < 8; q++) { const a2 = q * 0.785, r0 = 30 + sp * 30, r1 = 70 + sp * 70; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a2) * r0, sy + Math.sin(a2) * r0); ctx.lineTo(sx + Math.cos(a2) * r1, sy + Math.sin(a2) * r1); ctx.stroke(); } ctx.restore(); }
        api.doodle.text(ctx, 'they fight the bad ones', 150, 980, prog(t, w.fight, 0.9, ease.linear), { color: P.ink, size: 54, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 9 });
        if (t > w.cause) { let n = 0; for (const b of this.bugs) { if (b.kind !== 0 || n >= 9) continue; n++;
          const q = ((t - w.cause) * 0.7 + n / 9) % 1, hit = this.washT[2] + ((b.x + 1.0) / 2.0) * (this.washT[3] - this.washT[2]); if (t > hit) continue;
          const [bx, by] = pj([b.x, 0.05, b.z]); T3.gas(ctx, api, bx, by - 30 - q * 200, 40 + 90 * q, Math.sin(q * Math.PI) * 0.6, 'am' + n); } }
        if (t >= w.volatile) api.label(ctx, 'VSCs', 150, 140, { size: 60, p: pop(t, w.volatile), bg: P.gas, upper: false });
      }
      api.text(ctx, '* ARTISTIC RENDERING', 1860, 60, { size: 20, color: P.faint, align: 'right', tracking: 2 });
    }
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });
  },
});
