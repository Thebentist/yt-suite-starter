// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
/* two-weeks (words 4456-4558): "if you've been doing all of these things ... and it's been two weeks and you still
 * have terrible bad breath, go see a doctor ... You could have decay somewhere in your mouth ... a rotten tooth ...
 * And if your dentist doesn't see anything wrong, then maybe go see an ENT. Make sure you don't have gastric reflux or
 * sinus problems." The routine (scraper, brush, floss) over a 14-day strip that checks off day by day, a stink cloud
 * on day 14, then a flow: DENTIST (decay, a rotten tooth) -> ENT (reflux, sinus problems).
 * Sources: ADA MouthHealthy (dentist first, then your doctor; row 20); the 2 weeks is a practical cut-off, short trials
 * saw changes in 1-2 weeks (row 21).
 */
const N = 14, CW = 96, GAP = 12;
const DEN = { x: 580, y: 640, w: 540, h: 470 }, ENT = { x: 1340, y: 640, w: 540, h: 470 };
let DATA, T, SHOTS;

function entIcon(ctx, x, y, s, P, lit) {
  // profile head outline facing right with the ear, nose and throat marked
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = P.lavender;
  ctx.fillStyle = 'rgba(167,139,250,0.12)';
  ctx.beginPath(); ctx.moveTo(-0.1 * s, 0.62 * s);
  ctx.bezierCurveTo(-0.12 * s, 0.4 * s, -0.42 * s, 0.3 * s, -0.42 * s, -0.08 * s);
  ctx.bezierCurveTo(-0.42 * s, -0.46 * s, -0.12 * s, -0.62 * s, 0.1 * s, -0.6 * s);
  ctx.bezierCurveTo(0.3 * s, -0.58 * s, 0.4 * s, -0.4 * s, 0.4 * s, -0.22 * s);
  ctx.lineTo(0.52 * s, -0.02 * s); ctx.lineTo(0.4 * s, 0.02 * s); ctx.lineTo(0.42 * s, 0.14 * s); ctx.lineTo(0.38 * s, 0.2 * s);
  ctx.bezierCurveTo(0.36 * s, 0.32 * s, 0.24 * s, 0.34 * s, 0.14 * s, 0.32 * s); ctx.lineTo(0.16 * s, 0.62 * s);
  ctx.fill(); ctx.stroke();
  // ear
  ctx.beginPath(); ctx.ellipse(-0.1 * s, -0.04 * s, 0.07 * s, 0.11 * s, 0, 0, Math.PI * 2); ctx.stroke();
  const dot = (dx, dy, k) => { if (k <= 0) return; DATA.glow(ctx, dx, dy, 34, P.lime, 0.6 * k); ctx.fillStyle = P.lime; ctx.beginPath(); ctx.arc(dx, dy, 10 * k, 0, Math.PI * 2); ctx.fill(); };
  dot(-0.1 * s, -0.04 * s, lit[0]); dot(0.44 * s, -0.04 * s, lit[1]); dot(0.02 * s, 0.48 * s, lit[2]);
  ctx.restore();
}
function card(ctx, api, c, p, P, accent) {
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= Math.min(1, p * 1.5); ctx.translate(c.x, c.y); const k = 0.9 + 0.1 * p; ctx.scale(k, k);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  const g = ctx.createLinearGradient(0, -c.h / 2, 0, c.h / 2); g.addColorStop(0, 'rgba(46,40,88,0.95)'); g.addColorStop(1, 'rgba(24,21,50,0.95)');
  ctx.fillStyle = g; api.roundRect(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 28); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = window.DATA.alpha(accent, 0.55); ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}

defineScene({
  name: 'two-weeks',
  anchor: { word: 4456, offset: -0.15 },
  anchorEnd: { word: 4558, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    DATA = window.DATA.init(api);
    T = { things: api.at(4467) - 0.24, fill0: api.at(4473) - 0.24, weeks: api.at(4478), still: api.at(4482) + 0.02, stillChip: api.at(4485) - 0.07, doctor: api.at(4490) - 0.06, decay: api.at(4501), rotten: api.at(4512), know: api.at(4518), dentist: api.at(4531),
      wrong: api.at(4534) + 0.04, ent: api.at(4541), reflux: api.at(4547), sinus: api.at(4550) };
    SHOTS = [0, T.weeks - 0.12, T.still - 0.1, T.doctor - 0.25, T.decay - 0.12, T.rotten - 0.12, T.dentist - 0.12, T.ent - 0.15, T.reflux - 0.15];
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    DATA.stage(ctx, t, { gy: 520, glowColor: P.purple, glowAlpha: 0.12 });
    const sh = DATA.shot(t, SHOTS), lt = sh.lt;
    // framing per shot: [zoom, focus x, focus y] in scene space
    const x0s = 960 - (N * CW + (N - 1) * GAP) / 2;
    const dnX = lerp(960, DEN.x, prog(t, T.wrong - 0.3, 0.8, ease.inOutCubic));
    const F = [[1.0, 960, 540], [1.5, 1150, 620], [1.5, 1450, 470], [1.0, 960, 540], [2.2, dnX - 150, DEN.y - 70], [1.5, dnX - 20, DEN.y + 60], [1.0, 960, 560], [1.6, ENT.x + 60, ENT.y - 40], [1.55, ENT.x + 20, ENT.y + 40]][sh.i];
    const zz = F[0] * (1 + 0.03 * lt);
    ctx.save(); ctx.translate(960, 540); ctx.scale(zz, zz); ctx.translate(-F[1] - lt * 5, -F[2]);
    const up = prog(t, T.doctor - 0.25, 0.9, ease.inOutCubic);                 // strip moves up for the flow chart

    // ---- the routine: scraper, brush, floss
    const rt = 1 - up;
    if (rt > 0) {
      const icons = [['scraper', 600], ['toothbrush', 800], ['floss', 1000]];
      icons.forEach(([k, x], i) => {
        const p = pop(t, T.things + i * 0.2, 0.5) * rt; if (p <= 0) return;
        ctx.save(); ctx.globalAlpha *= Math.min(1, p); DATA.glow(ctx, x, 280, 110, P.lavender, 0.2 * p);
        if (k === 'scraper') DATA.icons.scraper(ctx, x, 290, 120 * p, { rot: -0.5, handle: P.lime });
        if (k === 'toothbrush') DATA.icons.toothbrush(ctx, x + 10, 290, 110 * p, { rot: 0.5 });
        if (k === 'floss') DATA.icons.floss(ctx, x, 300, 110 * p);
        ctx.restore();
      });
    }
    // ---- 14-day strip
    const sc = lerp(1, 0.56, up), sy = lerp(560, 150, up);
    ctx.save(); ctx.translate(960, sy); ctx.scale(sc, sc);
    const x0 = -(N * CW + (N - 1) * GAP) / 2;
    for (let i = 0; i < N; i++) {
      const p = pop(t, 0.2 + i * 0.04, 0.45); if (p <= 0) continue;
      const x = x0 + i * (CW + GAP), fk = prog(t, T.fill0 + (i / (N - 1)) * (T.weeks + 0.16 - T.fill0), 0.22, ease.outCubic);
      ctx.save(); ctx.translate(x + CW / 2, 0); ctx.scale(p, p);
      if (fk > 0) DATA.glow(ctx, 0, 0, CW, P.lime, 0.18 * fk);
      ctx.fillStyle = fk > 0 ? D(P.bg2, P.lime, fk) : '#1d1938'; api.roundRect(ctx, -CW / 2, -CW / 2, CW, CW, 16); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 3; ctx.stroke();
      api.text(ctx, String(i + 1), 0, -CW / 2 - 16, { size: 34, weight: 700, align: 'center', color: P.dim });
      if (fk > 0) DATA.icons.check(ctx, 0, 4, 52, fk, { color: P.black, width: 9 });
      ctx.restore();
    }
    // bracket + 2 WEEKS
    const br = prog(t, T.weeks - 0.1, 0.45, ease.inOutCubic);
    if (br > 0) { const bx1 = x0, bx2 = -x0, by = CW / 2 + 26; api.doodle.stroke(ctx, [[bx1, by - 10], [bx1 + 6, by + 8], [bx2 - 6, by + 8], [bx2, by - 10]], br, { color: P.lime, width: 7, seed: 5 }); }
    if (sh.i !== 2) api.label(ctx, '2 WEEKS', 0, CW / 2 + 100, { size: 64, align: 'center', p: pop(t, T.weeks, 0.5) });
    // still bad breath: a stink cloud rising off day 14
    const sk = pop(t, T.still, 0.6);
    DATA.icons.stink(ctx, -x0 - CW / 2, -CW / 2 - 110 - 30 * prog(t, T.still, 3), 130, sk * (1 - 0.9 * up), t, { alpha: 1 - up });
    ctx.restore();
    const stc = pop(t, T.stillChip, 0.5);
    if (stc > 0) api.label(ctx, 'STILL BAD BREATH', lerp(1330, 1560, up), lerp(330, 110, up), { size: lerp(50, 38, up), align: 'center', p: stc, bg: P.marker, color: P.ink });

    // ---- flow: DENTIST -> ENT
    const dp = prog(t, T.doctor + 0.2, 0.6, ease.outBack), ep = prog(t, T.ent - 0.1, 0.6, ease.outBack);
    const DN = { ...DEN, x: lerp(960, DEN.x, prog(t, T.wrong - 0.3, 0.8, ease.inOutCubic)) };
    // arrow from the strip into the dentist card
    const a1 = prog(t, T.doctor, 0.6, ease.inOutCubic);
    if (a1 > 0) api.doodle.arrow(ctx, 960, 268, DN.x - 20, DN.y - DN.h / 2 - 20, a1, { color: P.ink, width: 7, bend: -60, head: 26, seed: 2 });
    card(ctx, api, DN, dp, P, P.saliva);
    if (dp > 0) {
      ctx.save(); ctx.globalAlpha *= Math.min(1, dp);
      const decay = prog(t, T.decay, 0.6, ease.outCubic) * 0.6 + prog(t, T.rotten, 0.6, ease.outCubic) * 0.55;
      DATA.icons.tooth(ctx, DN.x - 150, DN.y - 70, 170, { decay, glow: 0.3 });
      api.label(ctx, 'DENTIST', DN.x - 20, DN.y - 120, { size: 54, p: pop(t, T.doctor + 0.3, 0.5), bg: P.saliva });
      const item = (s, at, yy, col) => { const p = prog(t, at, 0.45, ease.outExpo); if (p > 0) { ctx.save(); ctx.globalAlpha *= p; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(DN.x - 200 + 8, yy - 13, 9, 0, Math.PI * 2); ctx.fill(); api.text(ctx, s, DN.x - 172 + (1 - p) * 30, yy, { size: 46, weight: 700, color: P.ink, tracking: 2 }); ctx.restore(); } };
      item('DECAY', T.decay, DN.y + 90, P.orange);
      item('A ROTTEN TOOTH', T.rotten, DN.y + 160, P.orange);
      ctx.restore();
    }
    // "doesn't see anything wrong?" then the arrow to ENT
    const nw = prog(t, T.wrong, 0.7, ease.outCubic);
    if (nw > 0) { api.doodle.text(ctx, 'nothing', 960, 718, nw, { color: P.lime, size: 44, align: 'center', rotate: -0.04 }); api.doodle.text(ctx, 'wrong?', 960, 766, prog(t, T.wrong + 0.3, 0.6), { color: P.lime, size: 44, align: 'center', rotate: -0.04 }); }
    const a2 = prog(t, T.wrong + 0.35, 0.8, ease.inOutCubic);
    if (a2 > 0) api.doodle.arrow(ctx, DN.x + DN.w / 2 + 14, DEN.y - 20, ENT.x - ENT.w / 2 - 14, ENT.y - 20, a2, { color: P.ink, width: 8, bend: 40, head: 28, seed: 9 });
    card(ctx, api, ENT, ep, P, P.lime);
    if (ep > 0) {
      ctx.save(); ctx.globalAlpha *= Math.min(1, ep);
      const lit = [prog(t, T.ent + 0.3, 0.3), prog(t, T.sinus, 0.3), prog(t, T.reflux, 0.3)];
      entIcon(ctx, ENT.x - 150, ENT.y - 70, 190, P, lit);
      api.label(ctx, 'ENT', ENT.x - 30, ENT.y - 140, { size: 72, p: pop(t, T.ent, 0.5) });
      api.text(ctx, 'EAR · NOSE · THROAT', ENT.x - 30, ENT.y - 50, { size: 30, weight: 700, color: P.dim, tracking: 2, alpha: prog(t, T.ent + 0.3, 0.5) });
      const item = (s, at, yy) => { const p = prog(t, at, 0.45, ease.outExpo); if (p > 0) { ctx.save(); ctx.globalAlpha *= p; ctx.fillStyle = P.lime; ctx.beginPath(); ctx.arc(ENT.x - 200 + 8, yy - 13, 9, 0, Math.PI * 2); ctx.fill(); api.text(ctx, s, ENT.x - 172 + (1 - p) * 30, yy, { size: 46, weight: 700, color: P.ink, tracking: 2 }); ctx.restore(); } };
      item('REFLUX', T.reflux, ENT.y + 90);
      item('SINUS PROBLEMS', T.sinus, ENT.y + 160);
      ctx.restore();
    }
    ctx.restore();
    DATA.bokeh(ctx, t, { n: 8, seed: 'tw-bk' + sh.i, alpha: 0.1, size: [150, 340], colors: [P.lavender, P.saliva] });
    DATA.source(ctx, t, 'ADA MouthHealthy: see your dentist first, then your doctor · 2 weeks is a practical cut-off; short trials saw changes in 1–2 weeks', { at: 0.6 });
    DATA.finish(ctx, t);
  },
});
function D(a, b, k) { return window.DATA.mix(a, b, k); }
