// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
/* one-in-three (words 465-494): "And it's actually super common. About one in three people have bad breath or
 * halitosis. So if that's you, you're definitely not alone."
 * Five shots on the words: a crowd of rim-lit silhouettes at eye level (super common) -> the 30-person array, every
 * third lights, "1 IN 3", HAVE BAD BREATH -> the dictionary entry on "halitosis" -> close on one lit figure, "you?" ->
 * the crowd from above, the lit third linked up: not alone.
 * Source: Silva et al., Clin Oral Investig 2018, pooled prevalence 31.8% (research-notes row 1).
 */
let DATA, T, SHOTS, crowd;

defineScene({
  name: 'one-in-three',
  anchor: { word: 465, offset: -0.15 },
  anchorEnd: { word: 494, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    DATA = window.DATA.init(api);
    T = { common: api.at(468), one: api.at(478), inW: api.at(479), three: api.at(480), have: api.at(482), hal: api.at(486), so: api.at(487), you: api.at(490), def: api.at(492), alone: api.at(493) };
    SHOTS = [0, T.one - 0.12, T.hal - 0.1, T.so - 0.05, T.def - 0.1];
    const r = api.rand('crowd3d'); crowd = [];
    for (let row = 0; row < 14; row++) for (let c = 0; c < 17; c++) {
      const x = (c - 8) * 0.95 + (row % 2) * 0.45 + (r() - 0.5) * 0.4, z = 2.5 + row * 1.15 + (r() - 0.5) * 0.45;
      crowd.push({ x, z, h: 1.62 + r() * 0.2, ph: r() * 6, lit: r() < 0.333, side: r() < 0.5 ? -1 : 1 });
    }
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    const sh = DATA.shot(t, SHOTS), lt = sh.lt;
    const bgG = ctx.createLinearGradient(0, 0, 0, 1080); bgG.addColorStop(0, '#07061a'); bgG.addColorStop(0.55, '#141032'); bgG.addColorStop(1, '#08071a');
    ctx.fillStyle = bgG; ctx.fillRect(0, 0, 1920, 1080);

    const drawCrowd = (cam, litK, focus, o = {}) => {
      DATA.floorGrid(ctx, cam, { step: 1, x: [-9, 9], z: [0, 20], fog: 26, alpha: 0.22, color: '#7a6cff', wRef: 200 });
      const list = crowd.map((p) => ({ p, q: cam.project(p.x, 0, p.z) })).filter((o2) => o2.q).sort((a, b) => b.q.z - a.q.z);
      const far = list.filter((o2) => Math.abs(o2.q.z - focus) > focus * 0.45), near = list.filter((o2) => Math.abs(o2.q.z - focus) <= focus * 0.45);
      const one = (g, { p, q }, cheap) => {
        const s = p.h * q.s, bob = Math.abs(Math.sin(t * 1.8 + p.ph)) * s * 0.01, lit = p.lit ? litK : 0;
        if (lit > 0) DATA.lightPool(g, q.x, q.y, s * 0.5, s * 0.1, P.lime, 0.4 * lit);
        DATA.figure(g, q.x, q.y, s, { lit, rimSide: p.side, bob, cheap, alpha: o.alpha ? o.alpha(p) : 1 });
      };
      DATA.blurLayer(ctx, 10, (g) => { for (const it of far) one(g, it, true); });
      for (const it of near) one(ctx, it, false);
    };

    if (sh.i === 0) {
      // ---- the crowd at eye level
      DATA.glow(ctx, 960, 420, 1200, P.purple, 0.2);
      const cam = DATA.cam3({ pos: [-0.6 + lt * 0.3, 2.3, -3.2 + lt * 0.25], target: [0.3, 1.0, 9], f: 1250 });
      drawCrowd(cam, 0, 8);
      DATA.bokeh(ctx, t, { n: 10, seed: 'c3-bk', alpha: 0.14, size: [150, 380], colors: [P.lavender, '#8fd8ff'] });
      DATA.caps(ctx, 'super common', 960, 190, { size: 60, align: 'center', color: P.ink, alpha: prog(t, T.common - 0.1, 0.4), tracking: 12 });
    } else if (sh.i === 1) {
      // ---- the array: 30 people, every third lights
      DATA.glow(ctx, 700, 560, 900, P.purple, 0.14);
      for (let i = 0; i < 30; i++) {
        const row = Math.floor(i / 10), c = i % 10, s = 150 + row * 14, x = 150 + c * 98 + (row % 2) * 24, y = 430 + row * 190;
        const k = pop(t, SHOTS[1] + c * 0.025 + row * 0.04, 0.4); if (k <= 0) continue;
        const lit = i % 3 === 2 ? prog(t, T.three + (i / 30) * 0.3, 0.3) : 0;
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k); DATA.figure(ctx, 0, 0, s, { lit, rimSide: 1, bob: Math.abs(Math.sin(t * 2 + i)) * 3, alpha: lit || t < T.three ? 1 : 0.55 }); ctx.restore();
      }
      const bx = 1480, by = 480, sz = 230, parts = ['1', ' IN ', '3'], ws = parts.map((s) => api.measure(ctx, s, { size: sz, weight: 700, tracking: -1 }));
      let x = bx - ws.reduce((a, b) => a + b, 0) / 2; [T.one, T.inW, T.three].forEach((at, i) => { DATA.big(ctx, parts[i], x + ws[i] / 2, by, { size: sz, p: pop(t, at, 0.45), glow: i === 1 ? undefined : 'rgba(215,243,74,0.4)' }); x += ws[i]; });
      DATA.chip(ctx, t, 'HAVE BAD BREATH', bx, by + 96, T.have - 0.05, { size: 56 });
    } else if (sh.i === 2) {
      // ---- the dictionary entry, crowd far out of focus behind
      const cam = DATA.cam3({ pos: [0, 1.5, -3], target: [0, 1.3, 8], f: 1300 });
      DATA.glow(ctx, 960, 500, 1100, P.purple, 0.18);
      DATA.blurLayer(ctx, 16, (g) => { for (const p of crowd) { const q = cam.project(p.x, 0, p.z); if (q) DATA.figure(g, q.x, q.y, p.h * q.s, { lit: p.lit ? 1 : 0, cheap: true }); } }, { alpha: 0.7 });
      const s = 1 + lt * 0.05;
      ctx.save(); ctx.translate(960, 520); ctx.scale(s, s);
      ctx.fillStyle = 'rgba(6,5,16,0.55)'; api.roundRect(ctx, -560, -250, 1120, 470, 20); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
      api.text(ctx, 'hal·i·to·sis', -480, -60, { size: 150, weight: 400, family: 'serif', color: P.ink });
      api.text(ctx, 'hal-ih-TOE-sis', -476, 30, { size: 50, weight: 400, family: 'serif', italic: true, color: P.dim });
      api.text(ctx, 'noun', -476, 130, { size: 40, weight: 700, family: 'serif', italic: true, color: P.lime });
      api.text(ctx, 'bad breath', -360, 130, { size: 52, weight: 600, family: 'body', color: P.ink });
      ctx.restore();
    } else if (sh.i === 3) {
      // ---- close on one lit figure: "if that's you"
      const cam = DATA.cam3({ pos: [0.5 + lt * 0.1, 1.5, -1.6 + lt * 0.15], target: [0.2, 1.1, 3.6], f: 1400 });
      DATA.glow(ctx, 960, 500, 900, P.lime, 0.1);
      DATA.blurLayer(ctx, 12, (g) => { for (const p of crowd) { if (Math.abs(p.x) < 0.6 && p.z < 3) continue; const q = cam.project(p.x, 0, p.z + 2.5); if (q) DATA.figure(g, q.x, q.y, p.h * q.s, { lit: p.lit ? 0.8 : 0, cheap: true }); } });
      const q = cam.project(0.05, 0, 3.6);
      if (q) { DATA.lightPool(ctx, q.x, q.y, 220, 40, P.lime, 0.5); DATA.figure(ctx, q.x, q.y, 1.7 * q.s, { lit: 1, rimSide: 1, bob: Math.abs(Math.sin(t * 1.6)) * 4 }); }
      const yk = prog(t, T.you - 0.1, 0.6, ease.outCubic);
      if (yk > 0 && q) { api.doodle.text(ctx, 'you?', q.x + 300, q.y - 1.7 * q.s * 0.62, yk, { color: P.lime, size: 110, rotate: -0.1, stroke: 'rgba(0,0,0,0.55)', strokeWidth: 12 }); api.doodle.arrow(ctx, q.x + 300, q.y - 1.7 * q.s * 0.68, q.x + 170, q.y - 1.7 * q.s * 0.62, prog(t, T.you + 0.25, 0.35, ease.inOutCubic), { color: P.lime, width: 9, bend: 30, head: 28, seed: 4 }); }
    } else {
      // ---- high wide: the lit third linked up on the floor, not alone
      const cam = DATA.cam3({ pos: [0.3, 5.2 - lt * 0.25, -5.5 + lt * 0.35], target: [0.2, 0.2, 9], f: 1250 });
      DATA.glow(ctx, 960, 560, 1100, P.lime, 0.08);
      const lk = prog(t, T.alone - 0.05, 0.7);
      // links on the floor between lit people, drawn on
      const lit = crowd.filter((p) => p.lit).sort((a, b) => (a.z - b.z) || (a.x - b.x));
      DATA.floorGrid(ctx, cam, { step: 1, x: [-9, 9], z: [0, 22], fog: 28, alpha: 0.22, color: '#7a6cff', wRef: 200 });
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const n = Math.floor(lit.length * lk);
      for (let i = 0; i < n; i++) { const a = lit[i]; let best = null, bd = 1e9; for (const b of lit) { if (b === a) continue; const d = Math.hypot(b.x - a.x, b.z - a.z); if (d < bd && (b.z > a.z || (b.z === a.z && b.x > a.x))) { bd = d; best = b; } } if (best && bd < 3) DATA.neon(ctx, () => DATA.path3(ctx, cam, [[a.x, 0.01, a.z], [best.x, 0.01, best.z]]), P.lime, 2.2, { alpha: 0.7 }); }
      ctx.restore();
      const list = crowd.map((p) => ({ p, q: cam.project(p.x, 0, p.z) })).filter((o2) => o2.q).sort((a, b) => b.q.z - a.q.z);
      for (const { p, q } of list) { const s = p.h * q.s, litK = p.lit ? 0.5 + 0.5 * lk : 0; if (litK > 0) DATA.lightPool(ctx, q.x, q.y, s * 0.5, s * 0.12, P.lime, 0.45 * litK); DATA.figure(ctx, q.x, q.y, s, { lit: litK, rimSide: p.side, cheap: q.z > 12, rim: p.lit ? undefined : DATA.mix('#b7a8ff', '#3a3460', lk) }); }
      DATA.caps(ctx, 'you’re not alone', 960, 150, { size: 64, align: 'center', color: P.lime, alpha: lk, tracking: 12 });
    }
    DATA.source(ctx, t, 'Silva et al., Clin Oral Investig 2018 · systematic review of 13 studies: pooled prevalence 31.8%', { at: 0.5 });
    DATA.finish(ctx, t);
  },
});
