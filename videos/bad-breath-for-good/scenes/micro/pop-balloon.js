// @use videos/bad-breath-for-good/scenes/micro/_lib.js
// pop-balloon · words 3501-3544 (11:05.7-11:17.4), inside Ben's Zero Pro segment. "What it does, it basically seeks it out,
// attaches to it, and then pops it. Like a water balloon. And the cool thing is, unlike alcohol mouthwashes that harm all
// the bacteria that they've got, this only specifically kills the bacteria that we target."
// Part 1: a nano-lipid droplet seeks a P. gingivalis cell, attaches, the cell swells and pops like a water balloon.
// Part 2: split screen. Left: an alcohol rinse sweeps through and every bacterium goes grey. Right: droplets pop only the
// P. gingivalis cells; the blue-green ones stay. Claims nothing beyond Ben's words. Scene time = word time + 0.15.
(function () {
  const CUT = MICRO.cut(3501, 3544);   // word timing + render length from the current cut
  let T, POP, SPLIT;   // word times (read from the current cut in setup)
  const PG = { x: 1130, y: 560, s: 400 };
  const DECOR = [[300, 250, 130, 0.3, 0], [1720, 230, 116, 0.5, 1], [1730, 870, 140, -0.16, 1], [250, 880, 112, -0.4, 0], [720, 150, 92, 1.2, 0], [700, 960, 110, -0.34, 1], [1500, 1000, 96, 0.8, 0]];
  const CROWD = [
    [-300, 300, 'good', 108], [-100, 290, 'pg', 118], [110, 305, 'good', 104], [310, 290, 'good', 100],
    [-250, 530, 'pg', 124], [-20, 540, 'good', 112], [220, 525, 'pg', 120],
    [-310, 760, 'good', 104], [-110, 770, 'good', 98], [100, 760, 'pg', 116], [300, 770, 'good', 108],
  ];
  let snap;

  defineScene({
    name: 'pop-balloon', duration: CUT.dur,
    async setup(api) {
      const M = MICRO.init(api), W = CUT.W;
      T = { seeks: W(3506), attaches: W(3509), pops: W(3514), water: W(3518), balloon: W(3519), and: W(3520), unlike: W(3525), alcohol: W(3526), mouthwashes: W(3527), harm: W(3529), all: W(3530), bacteria1: W(3532), got: W(3535), thisW: W(3536), only: W(3537), specifically: W(3538), kills: W(3539), bacteria2: W(3541), target: W(3544) };
      POP = T.pops + 0.05; SPLIT = T.and - 0.04;
      snap = M.snapshot({ x: 965, y: 560, z: 1.25 }, { blur: 7, t: 2, dim: 0.15, tint: 'rgba(12,8,28,0.28)' });
    },
    draw(ctx, t, api) {
      const M = MICRO, { P, ease, clamp, lerp, prog, pop, env } = api;
      // camera shake on the pop
      const shake = t > POP ? 12 * Math.exp(-(t - POP) * 7) : 0;
      ctx.save(); ctx.translate(Math.sin(t * 61) * shake, Math.cos(t * 47) * shake);
      M.drawSnap(ctx, snap, t, { z0: 1.02, z1: 1.08, dur: 12.6 });

      // ======================================================== PART 1: seek, attach, pop
      const p1 = 1 - prog(t, SPLIT - 0.15, 0.4, ease.inCubic);
      if (p1 > 0) {
        ctx.save(); ctx.globalAlpha *= p1;
        api.cam(ctx, t, { zoom0: 1, zoom1: 1.06, dur: 4.6, cx: PG.x, cy: PG.y });
        // decor: friendly blue-green bacteria drifting around the edges
        DECOR.forEach(([x, y, s, r, fl], i) => {
          const push = t > POP ? 26 * ease.outCubic(clamp((t - POP) / 0.5)) : 0, ang = Math.atan2(y - PG.y, x - PG.x);
          M.bug(ctx, x + Math.sin(t * 0.7 + i) * 14 + Math.cos(ang) * push, y + Math.cos(t * 0.6 + i * 2) * 10 + Math.sin(ang) * push, s, t, { kind: 'good', flip: !!fl, rot: r + Math.sin(t * 0.8 + i) * 0.15, phase: i, seed: i, eyes: true, smile: 0.8 });
        });
        // the P. gingivalis cell
        const bob = Math.sin(t * 1.6) * 6;
        const swell = t < POP ? ease.inQuad(clamp((t - (T.attaches + 0.2)) / (POP - T.attaches - 0.2))) : 0;
        const jig = t > T.attaches + 0.03 && t < POP ? 0.12 * Math.exp(-(t - T.attaches - 0.03) * 5) * Math.sin((t - T.attaches) * 24) + swell * 0.04 * Math.sin(t * 38) : 0;
        if (t < POP) {
          M.reticle(ctx, PG.x, PG.y + bob, 262, prog(t, T.seeks, 0.45), t, { alpha: 1 - prog(t, T.attaches + 0.15, 0.3) });
          M.bug(ctx, PG.x, PG.y + bob, PG.s, t, { kind: 'pg', rot: Math.sin(t * 0.9) * 0.05, swell, squash: jig, phase: 0.4, seed: 5, eyes: true, frown: t < T.attaches, eyeScale: t < T.attaches ? 1 : 1.3 + swell * 0.3, glow: swell > 0 ? 'lav' : null, glowA: 0.35 * swell });
          if (t < T.seeks) M.tag(ctx, 'P. GINGIVALIS', PG.x, PG.y - 230 + bob, prog(t, 0.25, 0.4) * (1 - prog(t, T.seeks - 0.1, 0.2)), { size: 50, align: 'center' });
        } else {
          M.splash(ctx, PG.x, PG.y, t - POP, { shards: '#8a4bb0', scale: 2.1, n: 64, seed: 3, linger: 2.2 });
        }
        // the droplet
        let dx, dy, dr = 66, dsq = 0;
        if (t < T.seeks) { const k = ease.outCubic(clamp((t - 0.05) / 1.25)); dx = lerp(-120, 420, k); dy = lerp(780, 660, k) + Math.sin(t * 2) * 8; }
        else if (t < T.attaches + 0.02) {
          const k = ease.inOutCubic(clamp((t - T.seeks) / (T.attaches + 0.02 - T.seeks)));
          const ax = 420, ay = 660 + Math.sin(T.seeks * 2) * 8, cx = 680, cy = 430, bx = PG.x - 156 - 48, by = PG.y + 16;
          dx = (1 - k) * (1 - k) * ax + 2 * (1 - k) * k * cx + k * k * bx; dy = (1 - k) * (1 - k) * ay + 2 * (1 - k) * k * cy + k * k * by;
        } else {
          const u = t - T.attaches - 0.02; dx = PG.x - 204 + 52 * ease.inCubic(clamp((u - 0.2) / 0.5)); dy = PG.y + 16 + bob;
          dsq = 0.45 * ease.outBack(clamp(u / 0.18)); dr = 66 * (1 - ease.inCubic(clamp((u - 0.2) / 0.55)));
        }
        if (t > T.seeks && t < T.attaches + 0.1) {
          const tr = []; for (let k = 6; k >= 1; k--) { const tt = t - k * 0.035, kk = ease.inOutCubic(clamp((tt - T.seeks) / (T.attaches + 0.02 - T.seeks))); tr.push([(1 - kk) * (1 - kk) * 420 + 2 * (1 - kk) * kk * 680 + kk * kk * (PG.x - 204), (1 - kk) * (1 - kk) * 660 + 2 * (1 - kk) * kk * 430 + kk * kk * (PG.y + 16)]); }
          M.trail(ctx, tr, 60, { alpha: 0.3 });
        }
        if (dr > 1 && t < POP) {
          if (t > T.attaches) M.blob(ctx, 'white', PG.x - 160, PG.y + 16 + bob, 110, 0.5 * env(t, T.attaches, T.attaches + 0.7, 0.08, 0.4));
          M.droplet(ctx, dx, dy, dr, t, { squash: dsq, squashRot: 0, seed: 1 });
        }
        // doodles: POP!, water balloon
        if (t > POP) {
          api.doodle.text(ctx, 'POP!', PG.x - 10, PG.y - 300, prog(t, POP + 0.02, 0.22), { color: P.lime, size: 120, align: 'center', stroke: 'rgba(10,8,22,0.75)', strokeWidth: 14, rotate: -0.08 });
          M.balloonDoodle(ctx, 1640, 470, 70, prog(t, T.water - 0.06, 0.75, ease.linear), { color: '#8fd8ff' });
          api.doodle.text(ctx, 'like a water balloon', 1600, 700, prog(t, T.water + 0.1, 0.55, ease.linear), { color: '#8fd8ff', size: 50, align: 'center', stroke: 'rgba(10,8,22,0.7)', strokeWidth: 9 });
        }
        ctx.restore();
      }

      // ======================================================== PART 2: split screen
      if (t > SPLIT - 0.05) {
        const div = prog(t, SPLIT, 0.45, ease.outExpo);
        const panels = [{ cx: 480, x0: 0, x1: 955, side: 'L' }, { cx: 1440, x0: 965, x1: 1920, side: 'R' }];
        // alcohol rinse front (left panel)
        const front = lerp(-80, 1060, ease.inOutSine(clamp((t - T.mouthwashes) / 1.25)));
        for (const pn of panels) {
          ctx.save(); ctx.beginPath(); ctx.rect(pn.x0, 0, pn.x1 - pn.x0, 1080); ctx.clip();
          if (pn.side === 'L' && t > T.mouthwashes) { ctx.fillStyle = `rgba(60,40,10,${0.22 * prog(t, T.mouthwashes, 1.2)})`; ctx.fillRect(pn.x0, 0, 960, 1080); }
          CROWD.forEach(([ox, oy, kind, s], i) => {
            const bx = pn.cx + ox + Math.sin(t * 0.7 + i) * 10, by0 = oy + 30 + Math.cos(t * 0.6 + i * 1.7) * 8;
            const inP = pop(t, SPLIT + 0.12 + i * 0.04, 0.45);
            if (inP <= 0) return;
            let o = { kind, rot: (i % 3 - 1) * 0.35 + Math.sin(t * 0.9 + i) * 0.1, phase: i * 1.3, seed: i + (pn.side === 'R' ? 20 : 0), eyes: true, smile: kind === 'good' ? 0.8 : 0, frown: kind === 'pg' };
            let x = bx, y = by0, sc = inP;
            if (pn.side === 'L') {
              const th = T.mouthwashes + ((bx + 80) / 1140) * 1.25 * 0.95;
              const h = clamp((t - th) / 0.45);
              if (h > 0) {
                o = { ...o, dim: h, eyesClosed: h > 0.4, smile: 0, frown: false, squash: 0.12 * Math.exp(-(t - th) * 5) * Math.sin((t - th) * 22), flagellaAmp: 1 - h };
                sc *= 1 - 0.18 * h; y += 34 * ease.inOutSine(clamp((t - th) / 2.2)); o.rot += 0.3 * h * (i % 2 ? 1 : -1);
              }
              ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); M.bug(ctx, 0, 0, s * 1.14, t, o); ctx.restore();
            } else {
              if (kind === 'pg') {
                const k = CROWD.filter((c) => c[2] === 'pg').findIndex((c) => c === CROWD[i]);
                const pt = T.kills + k * 0.09, att = pt - 0.36, st = T.thisW + 0.05 + k * 0.08;
                if (t < pt) {
                  const sw = ease.inQuad(clamp((t - att - 0.05) / 0.3));
                  M.reticle(ctx, x, y, 92, prog(t, T.only + k * 0.06, 0.4), t, { width: 4, alpha: 1 - prog(t, att, 0.2), seed: k });
                  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); M.bug(ctx, 0, 0, s * 1.14, t, { ...o, swell: sw, frown: t < att, eyeScale: t < att ? 1 : 1.35, squash: t > att ? 0.08 * Math.sin((t - att) * 30) * (1 - sw * 0.5) : 0 }); ctx.restore();
                  // its droplet homing in from the right edge
                  if (t > st) {
                    const u = ease.inOutCubic(clamp((t - st) / (att - st))), sx = pn.x1 + 60, sy = y + (k % 2 ? -220 : 200);
                    const ddx = lerp(sx, x - 66, u) + Math.sin(u * Math.PI) * -40, ddy = lerp(sy, y, u) + Math.sin(u * Math.PI) * (k % 2 ? -60 : 60);
                    const dr = 24 * (1 - ease.inCubic(clamp((t - att - 0.08) / 0.26)));
                    if (dr > 1) M.droplet(ctx, t > att ? x - 66 + 14 * clamp((t - att) / 0.3) : ddx, t > att ? y : ddy, dr, t, { squash: t > att ? 0.4 : 0, seed: k, shell: true });
                  }
                } else {
                  M.splash(ctx, x, y, t - pt, { shards: '#8a4bb0', scale: 0.62, n: 26, seed: 10 + k });
                }
              } else {
                const hb = t > T.bacteria2 ? 0.16 * Math.exp(-(t - T.bacteria2 - i * 0.03) * 5) * Math.sin((t - T.bacteria2 - i * 0.03) * 20) : 0;
                const jump = t > T.bacteria2 ? -26 * Math.max(0, Math.sin(clamp((t - T.bacteria2 - i * 0.03) / 0.45) * Math.PI)) : 0;
                ctx.save(); ctx.translate(x, y + jump); ctx.scale(sc, sc); M.bug(ctx, 0, 0, s * 1.14, t, { ...o, squash: hb, smile: t > T.bacteria2 ? 1 : 0.8, glow: t > T.bacteria2 ? 'teal' : null, glowA: 0.3 * prog(t, T.bacteria2, 0.4) }); ctx.restore();
                // little sparkles
                const sp = pop(t, T.bacteria2 + 0.05 + (i % 4) * 0.05, 0.4) * (1 - prog(t, T.bacteria2 + 1.4, 0.5));
                if (sp > 0) sparkle(ctx, x + s * 0.45, y - s * 0.38 + jump, 14 * sp, t);
              }
            }
          });
          if (pn.side === 'L') M.sweep(ctx, pn.x0, 0, pn.x1, 1080, front, t, { color: '#ffd9a0', alpha: 0.16, seed: 2 });
          ctx.restore();
        }
        // divider
        ctx.save(); ctx.fillStyle = 'rgba(244,241,234,0.9)'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20;
        const hh = 1080 * div; ctx.fillRect(957, 540 - hh / 2, 6, hh); ctx.restore();
        // headers and verdicts
        M.chip(ctx, 'ALCOHOL MOUTHWASH', 480, 205, pop(t, T.alcohol, 0.5), { size: 50, bg: P.ink, color: P.black });
        M.chip(ctx, 'HARMS ALL', 480, 962, pop(t, T.all, 0.5), { size: 54, bg: P.red, color: '#ffffff' });
        M.chip(ctx, 'TARGETED', 1440, 205, pop(t, T.thisW, 0.5), { size: 50 });
        M.chip(ctx, 'ONLY THE TARGET', 1440, 962, pop(t, T.target, 0.5), { size: 54 });
      }
      ctx.restore();
      M.finish(ctx, t);

      function sparkle(c, x, y, r, tt) {
        c.save(); c.translate(x, y); c.rotate(tt * 1.5); c.fillStyle = P.lime; c.shadowColor = P.lime; c.shadowBlur = 12;
        c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.3 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.restore();
      }
    },
  });
})();
