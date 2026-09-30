// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
/* ct-study (words 1778-1819): "the crazy part is a lot of people have these, they got no idea. There was actually a
 * study that looked at these on CT scans and they found that one in four people actually have tonsil stones just
 * walking around."
 * Five shots on the words: people walking past in silhouette, "?" over their heads (no idea) -> a CT scanner ring
 * glowing in the dark (a study, CT scans) -> the axial slice on a radiology monitor, a scan line finds two bright
 * specks in the tonsils -> a 4x5 array, every fourth person lights with a speck at the throat: 1 IN 4 -> the crowd
 * walks on, TONSIL STONES, "just walking around". The slice is a stylised rendering, not a real scan.
 * Source: CT study, 24.6% of 150 (research-notes row 17).
 */
let DATA, T, SHOTS, ctSpr, noiseSpr, walkers;

function drawCT(g, S) {
  const k = S / 640; g.save(); g.scale(k, k);
  g.fillStyle = '#030304'; g.fillRect(0, 0, 640, 640);
  const X = 320, Y = 330, blur = (b) => { g.filter = b ? `blur(${b}px)` : 'none'; };
  const ell = (x, y, rx, ry, col, b = 1.5) => { blur(b); g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  ell(X, Y, 262, 222, '#8e8e8e', 2); ell(X, Y, 254, 214, '#343434', 3); ell(X, Y + 4, 228, 190, '#666', 3);
  ell(X - 92, Y + 110, 82, 60, '#707070', 5); ell(X + 92, Y + 110, 82, 60, '#707070', 5); ell(X, Y + 172, 72, 30, '#383838', 4);
  blur(1.5); g.strokeStyle = '#e6e6e6'; g.lineWidth = 20; g.lineCap = 'round'; g.beginPath(); g.ellipse(X, Y + 10, 200, 170, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  g.strokeStyle = '#a8a8a8'; g.lineWidth = 7; g.beginPath(); g.ellipse(X, Y + 10, 200, 170, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  ell(X, Y - 70, 120, 70, '#767676', 4);
  ell(X - 128, Y + 6, 26, 40, '#3c3c3c', 3); ell(X + 128, Y + 6, 26, 40, '#3c3c3c', 3);
  ell(X - 150, Y + 62, 17, 17, '#8a8a8a'); ell(X + 150, Y + 62, 17, 17, '#8a8a8a'); ell(X - 178, Y + 50, 22, 18, '#7c7c7c'); ell(X + 178, Y + 50, 22, 18, '#7c7c7c');
  ell(X - 82, Y + 8, 36, 42, '#868686', 3); ell(X + 82, Y + 8, 36, 42, '#868686', 3);
  blur(2); g.fillStyle = '#040404'; g.beginPath(); g.moveTo(X - 52, Y + 10);
  g.bezierCurveTo(X - 46, Y - 22, X - 10, Y - 16, X, Y - 20); g.bezierCurveTo(X + 16, Y - 24, X + 50, Y - 18, X + 52, Y + 8);
  g.bezierCurveTo(X + 48, Y + 30, X + 14, Y + 34, X, Y + 28); g.bezierCurveTo(X - 18, Y + 36, X - 50, Y + 32, X - 52, Y + 10); g.fill();
  ell(X, Y + 62, 70, 22, '#646464', 3);
  blur(1); g.fillStyle = '#9a9a9a'; g.beginPath(); g.arc(X, Y + 112, 40, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ededed'; g.lineWidth = 9; g.beginPath(); g.arc(X, Y + 112, 38, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#464646'; g.beginPath(); g.arc(X, Y + 176, 26, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5e5e5e'; g.beginPath(); g.arc(X, Y + 176, 15, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e2e2e2'; g.lineWidth = 9; g.beginPath(); g.arc(X, Y + 176, 30, Math.PI * 0.1, Math.PI * 0.9, true); g.stroke();
  g.beginPath(); g.moveTo(X - 28, Y + 190); g.lineTo(X - 10, Y + 226); g.lineTo(X + 10, Y + 226); g.lineTo(X + 28, Y + 190); g.stroke(); g.beginPath(); g.moveTo(X, Y + 226); g.lineTo(X, Y + 262); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(X - 38, Y + 112); g.lineTo(X - 62, Y + 150); g.moveTo(X + 38, Y + 112); g.lineTo(X + 62, Y + 150); g.stroke();
  blur(0); const vg = g.createRadialGradient(X, Y, 120, X, Y, 330); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = vg; g.fillRect(0, 0, 640, 640);
  // scanner annotations
  g.fillStyle = 'rgba(210,220,230,0.55)'; g.font = '600 13px Consolas, monospace';
  g.fillText('AXIAL', 18, 26); g.fillText('SOFT TISSUE', 18, 44); g.fillText('R', 18, 330); g.fillText('L', 612, 330);
  g.fillText('W 400  L 40', 520, 624);
  g.restore();
}

defineScene({
  name: 'ct-study',
  anchor: { word: 1778, offset: -0.15 },
  anchorEnd: { word: 1820, offset: -0.15 },
  tail: 0.1,                                   // a few frames past the handoff (the assembler trims)
  setup(api) {
    DATA = window.DATA.init(api);
    T = { people: api.at(1786), idea: api.at(1791), study: api.at(1797), ct: api.at(1803), scans: api.at(1804), found: api.at(1807), one: api.at(1809), four: api.at(1811), tonsil: api.at(1815), walking: api.at(1818) };
    SHOTS = [0, T.study - 0.12, T.scans - 0.1, T.one - 0.1, T.tonsil - 0.1];
    ctSpr = DATA.sprite(700, 700, (g) => drawCT(g, 700));
    noiseSpr = DATA.sprite(700, 700, (g, w, h) => { const rr = api.rand('ctnoise'); for (let i = 0; i < 12000; i++) { g.fillStyle = rr() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'; g.fillRect(rr() * w, rr() * h, 1.5, 1.5); } });
    const r = api.rand('walk'); walkers = Array.from({ length: 22 }, (_, i) => ({ x0: (i / 22) * 2400 + r() * 60, depth: r(), v: 70 + r() * 60, ph: r() * 6, dir: r() < 0.7 ? 1 : -1, q: i % 4 === 1, coat: r() < 0.4 }));
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    const sh = DATA.shot(t, SHOTS), lt = sh.lt;
    const bgG = ctx.createLinearGradient(0, 0, 0, 1080); bgG.addColorStop(0, '#07061a'); bgG.addColorStop(0.62, '#15112e'); bgG.addColorStop(1, '#07061a');
    ctx.fillStyle = bgG; ctx.fillRect(0, 0, 1920, 1080);

    const street = (lit, o = {}) => {
      // walkers on a glowing floor line, three depths; far ones blurred
      const floorY = o.floorY ?? 820;
      DATA.glow(ctx, 960, floorY - 250, 1100, P.purple, 0.16);
      ctx.save(); const fl = ctx.createLinearGradient(0, floorY - 30, 0, 1080); fl.addColorStop(0, 'rgba(122,108,255,0.18)'); fl.addColorStop(0.08, 'rgba(122,108,255,0.05)'); fl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = fl; ctx.fillRect(0, floorY - 30, 1920, 1110 - floorY); ctx.restore();
      const draw = (g, far) => {
        for (const w of walkers) {
          if ((w.depth < 0.5) !== far) continue;
          const s = (far ? 190 : 330) * (0.85 + 0.3 * w.depth) * (o.scale ?? 1), y = floorY - (far ? 110 : 0) + (far ? 0 : w.depth * 60);
          const x = ((w.x0 + w.dir * w.v * t) % 2400 + 2400) % 2400 - 240;
          const isLit = lit && w.q;
          if (isLit) DATA.lightPool(g, x, y, s * 0.35, s * 0.06, P.lime, 0.5);
          DATA.walker(g, x, y, s, t * 5.2 + w.ph, { dir: w.dir, lit: isLit ? 1 : 0, coat: w.coat });
          if (isLit) { const sx = x + w.dir * s * 0.05, sy = y - s * 0.84; DATA.glow(g, sx, sy, 22, '#ffffff', 0.9); g.fillStyle = '#fff'; g.beginPath(); g.arc(sx, sy, 5, 0, Math.PI * 2); g.fill(); }
          if (o.marks && w.q && !far && x > 80 && x < 1840) { const qk = prog(t, T.idea - 0.3 + w.ph * 0.05, 0.4); if (qk > 0) api.doodle.text(g, '?', x + w.dir * s * 0.04, y - s * 1.1, qk, { color: P.lavender, size: 62, align: 'center', rotate: Math.sin(w.ph) * 0.2, stroke: '#0b0a18', strokeWidth: 8 }); }
        }
      };
      DATA.blurLayer(ctx, 8, (g) => draw(g, true));
      draw(ctx, false);
    };

    if (sh.i === 0) {
      street(false, { marks: true });
      DATA.caps(ctx, 'a lot of people have these', 960, 190, { size: 54, align: 'center', alpha: prog(t, T.people - 0.1, 0.4), tracking: 8 });
    } else if (sh.i === 1) {
      // ---- the scanner in 3/4 view: a thick glowing gantry ring, the table running out toward us
      const cx = 1000 - lt * 30, cy = 500, s = 1 + lt * 0.06, K = 0.62;      // K squashes x (turned ring)
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
      DATA.glow(ctx, cx, cy, 900, P.cyan, 0.12);
      const R0 = 250, R1 = 430, D0 = 150;                                     // bore, outer radius, depth offset (px, to the right)
      const ring = (ox, fill) => { ctx.beginPath(); ctx.ellipse(cx + ox, cy, R1 * K, R1, 0, 0, Math.PI * 2); ctx.ellipse(cx + ox, cy, R0 * K, R0, 0, 0, Math.PI * 2, true); ctx.fillStyle = fill; ctx.fill('evenodd'); };
      // back face and the drum between (a stack of slices gives the depth)
      for (let k = 12; k >= 1; k--) ring(D0 * k / 12, DATA.mix('#15132a', '#090812', k / 12));
      // bore interior: dark tunnel with a cyan glow deep inside
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, R0 * K, R0, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#040409'; ctx.fillRect(cx - R0, cy - R0, R0 * 2, R0 * 2);
      DATA.glow(ctx, cx + D0 * 0.6, cy - 20, R0, P.cyan, 0.3 + 0.1 * Math.sin(t * 6));
      ctx.restore();
      // front face with a soft top light
      const fg = ctx.createLinearGradient(cx - R1 * K, cy - R1, cx + R1 * K, cy + R1); fg.addColorStop(0, '#3a3858'); fg.addColorStop(0.5, '#1e1c33'); fg.addColorStop(1, '#0e0d1b'); ring(0, fg);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, R1 * K - 2, R1 - 2, 0, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
      DATA.neon(ctx, () => { ctx.beginPath(); ctx.ellipse(cx, cy, (R0 + 16) * K, R0 + 16, 0, 0, Math.PI * 2); }, P.cyan, 4, { alpha: 0.85 });
      const a0 = t * 3.2; DATA.neon(ctx, () => { ctx.beginPath(); ctx.ellipse(cx, cy, (R0 + 40) * K, R0 + 40, 0, a0, a0 + 0.8); }, '#ffffff', 6, { alpha: 0.9 });
      // the table: a slab from inside the bore out to the lower left, toward the camera
      ctx.beginPath(); ctx.moveTo(cx - 40, cy + 70); ctx.lineTo(cx + D0 * 0.8, cy + 60); ctx.lineTo(cx - 700, cy + 470); ctx.lineTo(cx - 1100, cy + 520); ctx.closePath();
      const tg = ctx.createLinearGradient(cx, cy, cx - 900, cy + 500); tg.addColorStop(0, '#1b1930'); tg.addColorStop(1, '#2c2a48'); ctx.fillStyle = tg; ctx.fill();
      ctx.strokeStyle = 'rgba(98,240,224,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 40, cy + 70); ctx.lineTo(cx - 1100, cy + 520); ctx.stroke();
      ctx.restore();
      api.label(ctx, 'A STUDY', 330, 170, { size: 54, p: pop(t, T.study, 0.45), bg: P.ink, color: P.black });
      DATA.caps(ctx, 'ct scans', 330, 280, { size: 62, color: P.cyan, alpha: prog(t, T.ct - 0.05, 0.4), tracking: 16 });
    } else if (sh.i === 2) {
      // ---- the slice on a radiology monitor, scan finds the stones
      const x0 = 610, y0 = 90, S = 700, s = 1 + lt * 0.04;
      ctx.save(); ctx.translate(960, 440); ctx.scale(s, s); ctx.translate(-960, -440);
      ctx.fillStyle = '#020203'; api.roundRect(ctx, x0 - 30, y0 - 30, S + 60, S + 60, 18); ctx.fill(); ctx.strokeStyle = 'rgba(98,240,224,0.25)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); api.roundRect(ctx, x0, y0, S, S, 8); ctx.clip();
      ctx.drawImage(ctSpr, x0, y0, S, S); ctx.globalAlpha = 0.9; ctx.drawImage(noiseSpr, x0 + ((Math.floor(t * 30) % 3) - 1) * 2, y0, S, S); ctx.globalAlpha = 1;
      const sc = prog(lt, 0.15, 1.3, ease.inOutSine);
      if (sc > 0 && sc < 1) { const sy = y0 + sc * S, g = ctx.createLinearGradient(0, sy - 80, 0, sy + 4); g.addColorStop(0, 'rgba(98,240,224,0)'); g.addColorStop(1, 'rgba(98,240,224,0.35)'); ctx.fillStyle = g; ctx.fillRect(x0, sy - 80, S, 84); ctx.fillStyle = 'rgba(170,255,245,0.95)'; ctx.fillRect(x0, sy - 1.5, S, 3); }
      ctx.restore();
      const k = S / 640, stones = [[320 - 88, 330 + 24], [320 + 80, 330 + 8]];
      stones.forEach(([sx, sy], j) => {
        const gx = x0 + sx * k, gy = y0 + sy * k, gl = prog(t, T.found + 0.05 + j * 0.1, 0.3);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx, gy, 7 * k * (1 + 0.25 * gl), 0, Math.PI * 2); ctx.fill();
        if (gl > 0) { DATA.glow(ctx, gx, gy, 60, '#ffffff', 0.6 * gl); api.doodle.circle(ctx, gx, gy, 36, 34, prog(t, T.found + 0.15 + j * 0.15, 0.4, ease.inOutCubic), { color: P.lime, width: 6, seed: 3 + j }); }
      });
      ctx.restore();
      DATA.caps(ctx, 'tonsil', 330, 470, { size: 40, align: 'center', color: P.lime, alpha: prog(t, T.found + 0.4, 0.4), tracking: 6 });
      DATA.caps(ctx, 'tonsil', 1590, 470, { size: 40, align: 'center', color: P.lime, alpha: prog(t, T.found + 0.5, 0.4), tracking: 6 });
      DATA.caps(ctx, '* artistic rendering', 1880, 50, { size: 20, align: 'right', color: P.faint, tracking: 2 });
    } else if (sh.i === 3) {
      // ---- 1 IN 4: a 5x4 array, every fourth lights with a speck at the throat
      DATA.glow(ctx, 640, 560, 900, P.purple, 0.14);
      for (let i = 0; i < 20; i++) {
        const row = Math.floor(i / 5), c = i % 5, s = 170 + row * 12, x = 170 + c * 170 + (row % 2) * 40, y = 330 + row * 190;
        const lit = i % 4 === 3 ? prog(t, T.four + (i / 20) * 0.25, 0.3) : 0, k = SHOTS[3] - 0.35 + i * 0.012 < t ? pop(t, SHOTS[3] - 0.35 + i * 0.012, 0.4) : 0;
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
        DATA.figure(ctx, 0, 0, s, { lit, rimSide: 1, bob: Math.abs(Math.sin(t * 2 + i)) * 3, rim: lit ? undefined : DATA.mix('#b7a8ff', '#4a4470', prog(t, T.four, 0.4)) });
        if (lit > 0) { DATA.glow(ctx, 0, -s * 0.61, 30, '#ffffff', 0.9 * lit); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -s * 0.61, 7 * lit, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      const bx = 1440, by = 500, sz = 240, parts = ['1', ' IN ', '4'], ws = parts.map((s) => api.measure(ctx, s, { size: sz, weight: 700, tracking: -1 }));
      let x = bx - ws.reduce((a, b) => a + b, 0) / 2; [T.one, T.one + 0.2, T.four].forEach((at, i) => { DATA.big(ctx, parts[i], x + ws[i] / 2, by, { size: sz, p: pop(t, at, 0.45), glow: i === 1 ? undefined : 'rgba(215,243,74,0.4)' }); x += ws[i]; });
      DATA.caps(ctx, 'people', bx, by + 80, { size: 50, align: 'center', color: P.dim, alpha: prog(t, T.four + 0.2, 0.4), tracking: 10 });
    } else {
      // ---- the crowd walks on, a quarter carrying a stone they don't know about
      street(true, { scale: 1.05 });
      DATA.chip(ctx, t, 'TONSIL STONES', 960, 180, T.tonsil, { size: 64 });
      const wa = prog(t, T.walking - 0.1, 0.8);
      if (wa > 0) api.doodle.text(ctx, 'just walking around', 960, 290, wa, { color: P.lime, size: 60, align: 'center', rotate: -0.03, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 10 });
    }
    DATA.source(ctx, t, 'CT study: tonsil stones in 24.6% of 150 people (PMC3699974)', { at: SHOTS[1] });
    DATA.finish(ctx, t);
  },
});
