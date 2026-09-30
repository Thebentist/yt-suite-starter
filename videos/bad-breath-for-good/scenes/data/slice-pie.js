// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
/* slice-pie (words 1820-1858): "But I would say that probably this, the slice, although they are a definite cause of
 * bad breath, it seems like from the research that tongue coating and bacteria is a bigger cause of that bad breath on
 * average."
 * An extruded 3D donut on the data floor, WHERE BAD BREATH COMES FROM, cut on the words: wide as it builds -> close on
 * the thin TONSIL STONES slice lifting out (a definite cause) -> high wide as the big TONGUE COATING + BACTERIA slice
 * turns lime and rises -> low angle, the big slice towering: a bigger cause, on average.
 * Slice sizes are illustrative (research-notes row 17: tonsils a small slice, as few as 3%; row 3: tongue coating the
 * top cause in 2,000 clinic patients). No percentages on screen.
 */
const SL = [{ id: 'tonsil', v: 4 }, { id: 'gums', v: 17 }, { id: 'other', v: 19 }, { id: 'tongue', v: 60 }];
const R0 = 1.1, R1 = 2.4, H = 0.45;
let DATA, T, SHOTS, bugs;

function donut3d(ctx, cam, slices, t) {
  // slices: [{a0, a1, color, h, lift, explode, glow, alpha}] angles in radians on the floor (x = cos, z = sin)
  const order = slices.map((s, i) => { const m = (s.a0 + s.a1) / 2, ex = s.explode || 0; const c = cam.project(Math.cos(m) * (1.75 + ex), 0, Math.sin(m) * (1.75 + ex)); return { s, i, z: c ? c.z : 0 }; }).sort((a, b) => b.z - a.z);
  for (const { s } of order) {
    if (s.a1 <= s.a0) continue;
    const m = (s.a0 + s.a1) / 2, ex = s.explode || 0, ox = Math.cos(m) * ex, oz = Math.sin(m) * ex, y0 = s.lift || 0, y1 = y0 + s.h;
    const n = Math.max(3, Math.ceil((s.a1 - s.a0) / 0.05)), A = [];
    for (let k = 0; k <= n; k++) A.push(s.a0 + (s.a1 - s.a0) * k / n);
    const P3 = (r, a, y) => cam.project(ox + Math.cos(a) * r, y, oz + Math.sin(a) * r);
    const poly = (pts, fill, stroke) => { if (pts.some((p) => !p)) return; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke || fill; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.stroke(); };
    ctx.save(); if (s.alpha != null) ctx.globalAlpha *= s.alpha;
    const col = s.color, side = DATA.shade(col, -0.45), side2 = DATA.shade(col, -0.25);
    if (s.glow) { const c = cam.project(ox + Math.cos(m) * 1.75, 0, oz + Math.sin(m) * 1.75); if (c) DATA.lightPool(ctx, c.x, c.y, 2.4 * c.s, 0.7 * c.s, col, 0.35 * s.glow); }
    // walls: inner, the two ends, outer (camera-facing parts win by drawing order)
    const inner = [], outer = [];
    for (const a of A) { inner.push(P3(R0, a, y0)); } for (let k = A.length - 1; k >= 0; k--) inner.push(P3(R0, A[k], y1));
    poly(inner, side);
    for (const a of [s.a0, s.a1]) poly([P3(R0, a, y0), P3(R1, a, y0), P3(R1, a, y1), P3(R0, a, y1)], side2);
    for (let k = 0; k < A.length - 1; k++) { const sh = 0.5 + 0.5 * Math.cos(A[k] + 0.6); poly([P3(R1, A[k], y0), P3(R1, A[k + 1], y0), P3(R1, A[k + 1], y1), P3(R1, A[k], y1)], DATA.mix(side, side2, sh)); }
    // top face with a radial gradient and gloss
    const top = []; for (const a of A) top.push(P3(R1, a, y1)); for (let k = A.length - 1; k >= 0; k--) top.push(P3(R0, A[k], y1));
    if (!top.some((p) => !p)) {
      const c = cam.project(ox + Math.cos(m) * 1.75, y1, oz + Math.sin(m) * 1.75);
      const g = ctx.createRadialGradient(c.x, c.y - 20, 5, c.x, c.y, 1.4 * c.s); g.addColorStop(0, DATA.shade(col, 0.3)); g.addColorStop(1, col);
      ctx.save(); if (s.glow) { ctx.shadowColor = col; ctx.shadowBlur = 40 * s.glow; } poly(top, g); ctx.restore();
      ctx.save(); ctx.globalAlpha *= 0.5; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); A.forEach((a, i) => { const p = P3(R1 - 0.03, a, y1); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
}

defineScene({
  name: 'slice-pie',
  anchor: { word: 1820, offset: -0.15 },
  anchorEnd: { word: 1858, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    DATA = window.DATA.init(api);
    T = { slice: api.at(1828), definite: api.at(1833), research: api.at(1843), tongue: api.at(1845), coating: api.at(1846), bacteria: api.at(1848), bigger: api.at(1851), average: api.at(1857) };
    SHOTS = [0, T.slice - 0.12, T.research - 0.1, T.bigger - 0.1];
    const r = api.rand('pie-bugs'); bugs = Array.from({ length: 14 }, (_, i) => ({ u: (i + 0.5) / 14, v: 0.2 + r() * 0.6, ph: r() * 6, s: 0.5 + r() * 0.3, rod: r() < 0.5 }));
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    const sh = DATA.shot(t, SHOTS), lt = sh.lt;
    const bgG = ctx.createLinearGradient(0, 0, 0, 1080); bgG.addColorStop(0, '#07061a'); bgG.addColorStop(0.55, '#130f2d'); bgG.addColorStop(1, '#08071a');
    ctx.fillStyle = bgG; ctx.fillRect(0, 0, 1920, 1080);
    // cameras: orbiting around the donut, one per shot
    const orbit = (ang, el, dist, tgt, f) => DATA.cam3({ pos: [tgt[0] + Math.cos(ang) * dist * Math.cos(el), tgt[1] + Math.sin(el) * dist, tgt[2] + Math.sin(ang) * dist * Math.cos(el)], target: tgt, f });
    const tonsilMid = -Math.PI / 2 + (4 / 100) * Math.PI;           // slice layout: tonsil starts at 12 o'clock (angle -pi/2, toward -z)
    let cam;
    if (sh.i === 0) cam = orbit(-1.9 + lt * 0.08, 0.62, 8.2, [0, 0.2, 0], 1250);
    else if (sh.i === 1) cam = orbit(tonsilMid - 0.55 + lt * 0.06, 0.4, 4.2, [Math.cos(tonsilMid) * 2.0, 0.35, Math.sin(tonsilMid) * 2.0], 1350);
    else if (sh.i === 2) cam = orbit(-2.3 + lt * 0.07, 1.05, 8.6, [0, 0, 0.2], 1250);
    else cam = orbit(1.6 + lt * 0.06, 0.2, 7.2, [0, 0.9, 0.3], 1150);
    DATA.glow(ctx, 960, 520, 1100, P.purple, 0.14);
    DATA.floorGrid(ctx, cam, { step: 0.6, x: [-9, 9], z: [-9, 9], fog: 20, alpha: 0.28, color: '#7a6cff', wRef: 170 });
    // slices
    const build = prog(t, 0.1, 1.2, ease.inOutCubic), ton = prog(t, T.slice, 0.5, ease.outBack), tng = prog(t, T.tongue, 0.6, ease.outCubic), big = prog(t, T.bigger, 0.8, ease.outCubic);
    let a = -Math.PI / 2; const tot = 100, parts = [];
    for (const s of SL) {
      const span = (s.v / tot) * Math.PI * 2, gap = 0.02, o = { a0: a + gap / 2, a1: a + gap / 2 + (span - gap) * clamp(build * 1.1), h: H * (0.2 + 0.8 * build), color: '#3b3660', alpha: 1 };
      if (s.id === 'tonsil') { o.color = DATA.mix('#3b3660', '#f4f1ea', ton); o.explode = 0.5 * clamp(ton); o.lift = 0.25 * clamp(ton); o.glow = 0.5 * ton * (1 - 0.6 * tng); o.alpha = 1 - 0.35 * tng; }
      if (s.id === 'gums') o.color = '#453f6b';
      if (s.id === 'other') o.color = '#35305a';
      if (s.id === 'tongue') { o.color = tng > 0 ? DATA.mix('#3b3660', P.lime, tng) : '#3b3660'; o.h = H * (0.2 + 0.8 * build) + 0.45 * tng + 0.55 * big; o.glow = 0.7 * tng; }
      parts.push(o); a += span;
    }
    donut3d(ctx, cam, parts, t);
    // bacteria on the big slice
    const bk = prog(t, T.bacteria, 0.5);
    if (bk > 0) {
      const g = parts[3], y = g.h + 0.02;
      for (const b of bugs) { const aa = lerp(g.a0 + 0.2, g.a1 - 0.2, b.u) + Math.sin(t * 0.5 + b.ph) * 0.03, rr = lerp(R0 + 0.25, R1 - 0.25, b.v); const q = cam.project(Math.cos(aa) * rr, y, Math.sin(aa) * rr); if (!q) continue;
        ctx.save(); ctx.globalAlpha *= bk; api.icons.bacterium(ctx, q.x, q.y, 0.2 * q.s * b.s * clamp(bk * 1.5), t + b.ph, { rot: b.ph + Math.sin(t * 2 + b.ph) * 0.3, rod: b.rod, color: '#2f8a57', light: '#9df0b5', dark: '#12402a' }); ctx.restore(); }
    }
    // labels
    const labAt = (str, w, at, o = {}) => { const q = cam.project(...w); if (!q) return; api.label(ctx, str, q.x + (o.dx || 0), q.y + (o.dy || 0), { size: o.size || 48, align: o.align || 'center', p: pop(t, at, 0.5), bg: o.bg, color: o.color }); };
    if (sh.i === 0) DATA.caps(ctx, 'where bad breath comes from', 960, 150, { size: 50, align: 'center', alpha: prog(t, 0.2, 0.5), tracking: 10 });
    if (sh.i === 1) {
      const tp = [Math.cos(tonsilMid) * 2.6, H + 0.9, Math.sin(tonsilMid) * 2.6];
      labAt('TONSIL STONES', tp, T.slice + 0.1, { size: 60, bg: P.ink, color: P.black });
      const dc = prog(t, T.definite, 0.5, ease.inOutCubic), q = cam.project(...tp);
      if (dc > 0 && q) { api.doodle.check(ctx, q.x + 280, q.y, 34, dc, { color: P.lime, width: 11 }); api.doodle.text(ctx, 'a definite cause', q.x + 560, q.y + 330, prog(t, T.definite + 0.2, 0.6), { color: P.lime, size: 56, align: 'center', rotate: -0.03, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 10 }); }
    }
    if (sh.i >= 2) {
      const m = (parts[3].a0 + parts[3].a1) / 2;
      labAt('TONGUE COATING', [Math.cos(m) * 1.75, parts[3].h + 0.9, Math.sin(m) * 1.75], sh.i === 2 ? T.coating - 0.1 : SHOTS[3], { size: sh.i === 3 ? 62 : 54 });
      labAt('+ BACTERIA', [Math.cos(m) * 1.75, parts[3].h + 0.9, Math.sin(m) * 1.75], sh.i === 2 ? T.bacteria : SHOTS[3], { size: sh.i === 3 ? 62 : 54, dy: sh.i === 3 ? 84 : 74 });
      const tm = (parts[0].a0 + parts[0].a1) / 2, q = cam.project(Math.cos(tm) * 2.9, 0.5, Math.sin(tm) * 2.9);
      if (q && sh.i === 2) DATA.caps(ctx, 'tonsil stones', q.x, q.y, { size: 34, align: 'center', color: 'rgba(244,241,234,0.7)', tracking: 4 });
    }
    if (sh.i === 3) {
      const bc = prog(t, T.bigger, 0.6, ease.outCubic);
      if (bc > 0) api.doodle.text(ctx, 'a bigger cause', 1480, 820, bc, { color: P.lime, size: 72, align: 'center', rotate: -0.04, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 12 });
      const av = prog(t, T.average, 0.5);
      if (av > 0) DATA.caps(ctx, 'on average', 1480, 900, { size: 42, align: 'center', color: P.dim, alpha: av, tracking: 8 });
    }
    DATA.source(ctx, t, 'Slices illustrative · tonsils: as few as 3% of cases (Ferguson et al., Otolaryngol Head Neck Surg 2014) · tongue coating: Quirynen et al. 2009', { at: 0.5 });
    DATA.finish(ctx, t);
  },
});
