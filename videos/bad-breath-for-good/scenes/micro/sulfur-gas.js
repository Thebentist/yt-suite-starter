// @use videos/bad-breath-for-good/scenes/micro/_lib.js
// sulfur-gas · words 1144-1186 (3:41.6-3:55.7). "So when the bacteria eat that... they poop out sulfur gas. We actually call these
// volatile sulfur compounds. And one of the main ones is the same gas that makes that rotten egg smell."
// A bacterium at the bottom of the crevice eats a sulfur bead, puffs out H2S; the gas rises out of the gap (camera follows);
// VOLATILE SULFUR COMPOUNDS; one H2S comes forward = a cracked egg: ROTTEN EGG SMELL. Scene time = word time + 0.15.
(function () {
  const CUT = MICRO.cut(1144, 1186, 1197);   // word timing + render length from the current cut
  let T, CAM, PUFFS;   // word times (read from the current cut in setup)
  const HERO = { x: 893, y: 953, s: 140 };
  let chainPts, mols, others, crumbs, clouds;

  defineScene({
    name: 'sulfur-gas', duration: CUT.dur,
    async setup(api) {
      const M = MICRO.init(api);
      const W = CUT.W;
      T = { bacteria: W(1147), eat: W(1148), poop1: W(1154), remains: W(1157), poop2: W(1160), out2: W(1161), sulfur: W(1162), gas: W(1163), volatile: W(1168), sulfur2: W(1169), compounds: W(1170), main: W(1175), ones: W(1176), same: W(1179), rotten: W(1184), egg: W(1185), smell: W(1186) };
      PUFFS = [T.poop1 + 0.8, T.poop1 + 1.2, T.poop1 + 1.55];
      CAM = [
        { t: 0, x: 1006, y: 925, z: 3.0 },
        { t: 0.62, x: 965, y: 815, z: 1.9, ease: (k) => 1 - Math.pow(1 - k, 3) },
        { t: T.poop2 + 0.13, x: 952, y: 812, z: 2.02 },
        { t: T.compounds + 0.1, x: 965, y: 360, z: 1.32 },
        { t: T.main - 0.3, x: 965, y: 120, z: 1.16 },
        { t: 15.1, x: 975, y: 90, z: 1.22 },
      ];
      chainPts = Array.from({ length: 9 }, (_, i) => { const a = Math.PI * 0.8 + (i / 8) * Math.PI * 1.4; return [1006 + Math.cos(a) * 42, 928 + Math.sin(a) * 50]; });
      others = [
        { kind: 'rod', x: 1078, y: 962, s: 106, rot: -0.1, flip: true, ph: 1.2, munch: 0 },
        { kind: 'cocc', x: 1108, y: 992, s: 70, rot: -0.3, ph: 2.1, munch: 0.6 },
        { kind: 'rod', x: 520, y: 982, s: 100, rot: 0.1, ph: 0.4, munch: 0.2 },
        { kind: 'cocc', x: 585, y: 990, s: 80, rot: 0.4, ph: 4.4, munch: 0.9 },
        { kind: 'rod2', x: 1405, y: 978, s: 104, rot: 0.2, flip: true, ph: 5.1, munch: 0.5 },
        { kind: 'rod', x: 1460, y: 990, s: 86, rot: -0.2, ph: 2.7, munch: 0.1 },
      ];
      const r = api.rand('sg-crumbs');
      crumbs = Array.from({ length: 14 }, (_, i) => ({ x: 460 + r() * 1060, y: 985 + r() * 14, s: 14 + r() * 16, rot: r() * 6, seed: i, kind: r() < 0.5 ? 'crumb' : 'cell' })).filter((c) => Math.abs(c.x - 700) > 110 && Math.abs(c.x - 1225) > 110);
      // H2S molecules: {b birth, ex, ey emitter, dx, dy kick dir, drift, vy, A, ph, s}
      const rm = api.rand('sg-mols'); mols = [];
      const add = (b, ex, ey, dx, dy, extra = {}) => mols.push({ b, ex, ey, dx, dy, xoff: (rm() - 0.5) * 230, drift: (rm() - 0.5) * 14, vy: 100 + rm() * 34, A: 18 + rm() * 26, ph: rm() * 6.28, s: 34 + rm() * 10, spin0: rm() * 6.28, ...extra });
      const back = [HERO.x - 76, HERO.y - 4];
      add(T.poop1 + 0.08, back[0], back[1], -1, -0.35); add(T.poop1 + 0.14, back[0], back[1], -0.75, -0.8);
      add(PUFFS[0], 1128, 958, 0.2, -1); add(PUFFS[1], 1112, 975, 0.1, -1); add(PUFFS[2], 1128, 960, 0.3, -0.9);
      add(T.out2 - 0.02, back[0], back[1], -1, -0.25); add(T.out2 + 0.03, back[0], back[1], -0.85, -0.7, { hero: true, drift: 9, vy: 118, A: 20 });
      add(T.out2 + 0.08, back[0], back[1], -0.6, -1); add(T.out2 + 0.12, back[0], back[1], -1, 0.05);
      const em = [back, [1128, 958], [1110, 978], back, [560, 975], [1365, 970]];
      for (let k = 0, tt = T.gas - 0.4; tt < T.compounds - 0.2; tt += 0.26, k++) { const e = em[k % em.length]; add(tt, e[0], e[1], (rm() - 0.5) * 1.4, -1); }
      clouds = Array.from({ length: 9 }, (_, i) => ({ x: 965 + (rm() - 0.5) * 700, y: 60 + rm() * 260, r: 150 + rm() * 140, ph: rm() * 6.28 }));
    },
    draw(ctx, t, api) {
      const M = MICRO, { P, ease, clamp, lerp, prog, pop, env } = api;
      const cam = M.camAt(t, CAM);
      M.crevice(ctx, t, cam, { glowTop: 1 });

      // ---------------- world content
      ctx.save(); M.applyCam(ctx, cam, 1);
      // gas haze collecting above the tips as the column arrives
      const haze = prog(t, T.gas + 0.8, 3.5, ease.inOutSine);
      for (const c of clouds) M.blob(ctx, 'gas', c.x + Math.sin(t * 0.4 + c.ph) * 30, c.y + Math.cos(t * 0.3 + c.ph) * 20, c.r, 0.13 * haze);
      // floor litter
      for (const c of crumbs) c.kind === 'crumb' ? M.crumb(ctx, c.x, c.y, c.s, c.rot, { seed: c.seed }) : M.deadCell(ctx, c.x, c.y - 4, c.s * 2.2, c.rot * 0.1, { seed: c.seed, alpha: 0.85 });
      // protein chain on the floor (bead 0 is the sulfur bead the hero eats)
      const eaten = t >= T.eat + 0.12;
      M.chain(ctx, chainPts, { r: 13, t, sulfur: new Set([0, 4, 8]), sGlow: 0.35 + 0.25 * Math.sin(t * 4) + 0.4 * (1 - api.clamp(t / 0.8)), seed: 2, skip: eaten ? new Set([0]) : null });
      // other bacteria (munching wobble)
      for (const b of others) {
        const mu = Math.sin(t * 7 + b.ph) * 0.05 * (0.5 + b.munch);
        const puffT = PUFFS.map((x) => t - x).filter((x) => x > -0.25 && x < 0.3)[0];
        let sq = mu; if (puffT != null && Math.abs(b.x - 1060) < 80) sq += puffT < 0 ? -0.12 : 0.1 * Math.exp(-puffT * 8);
        M.shadow(ctx, b.x, b.y + b.s * 0.26, b.s * 0.5, 0.5);
        M.bug(ctx, b.x, b.y, b.s, t, { kind: b.kind, flip: b.flip, rot: b.rot + Math.sin(t * 1.1 + b.ph) * 0.06, squash: sq, phase: b.ph, seed: b.ph * 10, eyes: true, alpha: b.back ? 0.9 : 1 });
      }
      // the hero bacterium
      const lunge = 16 * env(t, T.eat - 0.02, T.eat + 0.55, 0.12, 0.35);
      let sq = 0;
      sq += -0.09 * env(t, T.bacteria, T.eat, 0.25, 0.1);                                           // anticipation
      if (t > T.eat) sq += 0.22 * Math.exp(-(t - T.eat) * 6) * Math.cos((t - T.eat) * 16);            // gulp
      if (t > T.eat + 0.39 && t < T.eat + 1.24) sq += 0.06 * Math.sin((t - T.eat - 0.39) * 17) * (1 - (t - T.eat - 0.39) / 0.85);      // digest
      sq += -0.14 * env(t, T.poop1 - 0.25, T.poop1 + 0.05, 0.2, 0.05);                               // push
      if (t > T.poop1 + 0.05) sq += 0.14 * Math.exp(-(t - T.poop1 - 0.05) * 7) * Math.cos((t - T.poop1) * 15);
      sq += -0.2 * env(t, T.poop2 - 0.1, T.out2 - 0.05, 0.25, 0.06);
      if (t > T.out2 - 0.05) sq += 0.2 * Math.exp(-(t - T.out2 + 0.05) * 6) * Math.cos((t - T.out2) * 14);
      const hx = HERO.x + lunge, hy = HERO.y + Math.sin(t * 2.2) * 2;
      // bead flying in
      const beadIn = clamp((t - T.eat + 0.05) / 0.25);
      const bead0 = chainPts[0];
      M.shadow(ctx, hx, hy + 40, 80, 0.55);
      
      const inside = (c, L, R) => {
        if (t < T.eat + 0.22 || t > T.poop1 + 0.3) return;
        const u = clamp((t - T.eat - 0.22) / 1.0);
        if (u < 0.75) {
          const bx = lerp(L * 0.12, -L * 0.04, ease.outCubic(u)), by = lerp(R * 0.2, 0, u), r = lerp(8, 7, u);
          M.blob(c, 'sulfur', bx, by, r * 3.4, 0.6);
          M.chain(c, [[bx + Math.sin(t * 20) * 1.5, by + Math.cos(t * 17) * 1.5]], { r, sulfur: new Set([0]), sGlow: 0.8, letters: false });
        } else { // broken into specks drifting to the back
          const k = clamp((t - (T.eat + 0.2 + 0.75)) / 0.9);
          for (let i = 0; i < 6; i++) {
            const a = i * 1.05, x = lerp(-L * 0.02, -L * 0.36, k) + Math.cos(a) * 9 * (1 - k * 0.5), y = Math.sin(a) * 8 * (1 - k * 0.3);
            M.blob(c, 'sulfur', x, y, 7, 0.9 * (1 - k * 0.6));
          }
        }
      };
      M.bug(ctx, hx, hy, HERO.s, t, { kind: 'rod', rot: Math.sin(t * 1.2) * 0.04, squash: sq, phase: 0.3, seed: 77, eyes: true, smile: t > T.eat + 0.4 && t < T.poop2 ? 1 : 0.7, eyeSquint: t > T.poop2 - 0.1 && t < T.out2 + 0.25 ? 0.35 : 1, mouth: env(t, T.eat - 0.3, T.eat + 0.28, 0.2, 0.14), inside });
      if (t >= T.eat - 0.05 && beadIn < 1) { // bead travelling into the mouth
        const k2 = ease.inCubic(beadIn), bx = lerp(bead0[0], hx + 36, k2), by = lerp(bead0[1], hy + 7, k2);
        M.chain(ctx, [[bx, by]], { r: 13 * (1 - beadIn * 0.55), sulfur: new Set([0]), sGlow: 0.6, letters: beadIn < 0.5 });
      }

      // H2S molecules + their gas
      let heroMol = null;
      for (const m of mols) {
        const u = t - m.b; if (u < 0) continue;
        const kick = ease.outCubic(clamp(u / 0.55)) * 60;
        const lift = Math.max(0, u - 0.3);
        let x = m.ex + m.dx * kick + m.drift * u + Math.sin(u * 1.3 + m.ph) * m.A * clamp(u / 1.5);
        const y = m.ey + m.dy * kick - m.vy * Math.pow(lift, 1.08);
        x = lerp(x, 965 + m.xoff + Math.sin(u * 1.1 + m.ph) * 22, ease.inOutSine(clamp((u - 0.35) / 2.4)));
        if (y < 260) x += (x - 965) * clamp((260 - y) / 500) * 0.6;
        const sc = pop(t, m.b, 0.35);
        m.pos = [x, y];
        if (m.hero && t >= T.main) { heroMol = m; continue; }
        M.blob(ctx, 'gas', x, y, 85 + u * 14, 0.24 * clamp(u / 0.6) * (1 - 0.55 * prog(t, T.main, 0.5)));
        const dim = t >= T.main ? 1 - 0.6 * prog(t, T.main, 0.5) : 1;
        M.h2s(ctx, x, y, m.s * sc, Math.sin(u * 0.9 + m.ph) * 0.7, m.spin0 + u * 1.7, { alpha: dim });
      }
      // first-puff gas clouds at the hero's back
      const back = [hx - 80, hy - 6];
      M.gas(ctx, back[0] - 30, back[1] - 20, 55, t, env(t, T.poop1 + 0.05, T.poop1 + 2.2, 0.3, 1.2), { seed: 1, alpha: 0.5 });
      M.gas(ctx, back[0] - 50, back[1] - 40, 80, t, env(t, T.out2 - 0.02, T.out2 + 3.2, 0.3, 1.6), { seed: 2, alpha: 0.55 });
      // tag: SULFUR GAS (world-anchored beside the rising puff)
      ctx.restore();
      const tg = env(t, T.sulfur, T.volatile - 0.1, 0.35, 0.3), hm = mols.find((m) => m.hero);
      if (tg > 0 && hm.pos) { const [sx, sy] = M.toScreen(cam, hm.pos[0], hm.pos[1]); M.tag(ctx, 'SULFUR GAS', sx - 150, sy - 40, tg, { size: 46, align: 'right', leader: [sx - 45, sy - 5, sx - 140, sy - 50] }); }

      M.creviceFront(ctx, t, cam, { motes: 1 });

      // ---------------- screen-space type and the hero molecule
      // handwritten "pfft" on the big puff
      if (t > T.out2 - 0.05 && t < T.gas + 1.2) {
        const [sx, sy] = M.toScreen(cam, back[0] - 40, back[1] + 30);
        api.doodle.text(ctx, 'pfft!', sx - 20, sy + 40, prog(t, T.out2 - 0.05, 0.35), { color: P.gas, size: 66, align: 'right', stroke: 'rgba(10,8,22,0.7)', strokeWidth: 10, rotate: 0.1 });
      }
      // VOLATILE SULFUR COMPOUNDS
      const hOut = 1 - prog(t, T.main - 0.55, 0.4, ease.inCubic);
      if (t > T.volatile - 0.05 && hOut > 0) {
        ctx.save(); ctx.globalAlpha *= hOut;
        M.words(ctx, t, [['VOLATILE', T.volatile], ['SULFUR', T.sulfur2], ['COMPOUNDS', T.compounds]], 960, 200, { size: 104, colors: [P.ink, P.sulfur, P.ink] });
        M.chip(ctx, 'VSCs', 960, 290, pop(t, T.compounds + 0.45), { size: 50, upper: false });
        ctx.restore();
      }
      // focus: dim the world, bring one H2S forward
      const foc = prog(t, T.main, 0.6);
      if (foc > 0) { ctx.fillStyle = `rgba(8,6,20,${0.42 * foc})`; ctx.fillRect(0, 0, 1920, 1080); }
      if (heroMol) {
        const u = t - heroMol.b, [wx, wy] = heroMol.pos;
        const [sx, sy] = M.toScreen(cam, wx, wy);
        const k = prog(t, T.main, 0.75, ease.inOutCubic);
        const eggIn = prog(t, T.rotten - 0.1, 0.6, ease.inOutCubic);
        const tx = lerp(960, 640, eggIn), ty = 470;
        const x = lerp(sx, tx, k), y = lerp(sy, ty, k), s = lerp(heroMol.s * cam.z, 175, k);
        M.blob(ctx, 'gas', x, y, s * 3.2, 0.25 * k);
        const wSpin = heroMol.spin0 + u * 1.7, wRot = Math.sin(u * 0.9 + heroMol.ph) * 0.7;
        M.h2s(ctx, x, y, s, lerp(wRot, 0.07 * Math.sin(t * 1.3), k), lerp(wSpin, 2 * Math.PI * Math.round(wSpin / (2 * Math.PI)) + 0.45 * Math.sin((t - T.main) * 1.6), k), { glow: 0.35 * k });
        // H2S formula tag
        const ft = pop(t, T.ones, 0.5);
        if (ft > 0) { ctx.save(); ctx.translate(x, y + 245); ctx.scale(ft, ft); M.formula(ctx, 'H_2S', 0, 0, 96, { align: 'center', color: P.ink, stroke: 'rgba(10,8,22,0.85)', strokeWidth: 14 }); ctx.restore(); }
      }
      // the rotten egg
      if (t > T.rotten - 0.15) {
        const k = prog(t, T.rotten - 0.15, 0.7, ease.outCubic);
        const ex = lerp(2200, 1300, k), ey = 470 + Math.sin(t * 1.6) * 8;
        const open = pop(t, T.egg, 0.45) * 0.75;
        M.blob(ctx, 'gas', ex, ey - 60, 260, 0.22 * open);
        M.egg(ctx, ex, ey, 250, t, { rot: lerp(0.5, -0.08, k) + Math.sin(t * 1.3) * 0.04, open, rotten: open });
        if (open > 0) M.stink(ctx, ex + 10, ey - 150, 150, t, prog(t, T.egg + 0.1, 0.6), { n: 3, spread: 44, width: 7 });
        // equals sign
        const eq = pop(t, T.egg - 0.2, 0.4);
        if (eq > 0) { ctx.save(); ctx.translate(970, 470); ctx.scale(eq, eq); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; ctx.fillStyle = P.ink; for (const yy of [-26, 10]) { api.roundRect(ctx, -58, yy, 116, 18, 9); ctx.fill(); } ctx.restore(); }
        M.chip(ctx, 'ROTTEN EGG SMELL', 970, 820, pop(t, T.egg - 0.05, 0.5), { size: 60 });
      }
      M.finish(ctx, t);
    },
  });
})();
