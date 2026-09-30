/* Phase-2 props and camera helpers for the tongue group (loaded after _lib.js and _lit.js).
 *   PROPS.wrist(api, res)            -> prebuilt lit inner forearm + wrist (canvas), drawn with PROPS.drawWrist
 *   PROPS.profile(ctx, x, y, s, o)   -> a face in profile as a dark silhouette with a warm rim light (facing left)
 *   PROPS.mirror(ctx, x, y, rot, s, o)-> dental mirror: brushed steel, reflective glass, optional gunk (wet -> dry)
 *   PROPS.brush(ctx, x, y, rot, s, o) -> glossy toothbrush seen from above, bristle tufts, rim light
 *   PROPS.bokeh(api, n, seed)        -> soft out-of-focus discs for a background layer; PROPS.drawBokeh(ctx, B, t, a)
 *   PROPS.tilt(ctx, api, fn, o)      -> draws fn(ctx) sharp, then a blurred copy outside a focus band (macro lens look)
 *   PROPS.tag(ctx, api)              -> "* ARTISTIC RENDERING", tiny, top right
 */
(function () {
  const TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const P = {};

  // ---------------------------------------------------------------- wrist: lit skin cylinder (local units, x along the arm)
  // Covers x -1300..1300, y -330..330. The wrist crease is at x = -300; the hand (left) falls into shadow.
  P.wrist = function (api, res) {
    const X0 = -1300, X1 = 1300, Y0 = -330, Y1 = 330, W = Math.ceil((X1 - X0) * res), H = Math.ceil((Y1 - Y0) * res);
    const N1 = api.noise('wrist-a'), N2 = api.noise('wrist-b'), N3 = api.noise('wrist-c');
    const radius = (x) => { const k = (x + 300) / 1400; return x < -300 ? 150 + 40 * sstep(-300, -700, x) : 150 + 80 * sstep(0, 1, k) + 6 * Math.sin(x / 90); };
    const img = new ImageData(W, H), d = img.data;
    const K = [-0.35, -0.7, 0.62], kl = Math.hypot(...K); K[0] /= kl; K[1] /= kl; K[2] /= kl;
    const creases = [-318, -272];
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const x = X0 + px / res, y = Y0 + py / res, r = radius(x), q = y / r; if (Math.abs(q) >= 1) continue;
      // cylinder normal + fine surface relief (pores, creases)
      let ny = q, nz = Math.sqrt(1 - q * q), nx = 0;
      const pore = N1(x / 2.2, y / 2.2) * 0.06 + N2(x / 9, y / 7) * 0.05;
      nx += pore; ny += N1(x / 2.2 + 50, y / 2.2) * 0.06;
      let crease = 0; for (const c of creases) { const dxc = x - c - 34 * q * q; const fade = (1 - sstep(0.55, 0.95, Math.abs(q))); crease += Math.exp(-dxc * dxc / 40) * fade * 0.7; nx += Math.sign(dxc) * Math.exp(-dxc * dxc / 90) * 0.35 * fade; }
      for (let f = 0; f < 5; f++) { const lx = -600 + f * 260 + 40 * N2(f, 3), dxl = x - lx - 60 * q; nx += Math.exp(-dxl * dxl / 400) * 0.05 * Math.sign(dxl); }
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      const kd = clamp((nx * K[0] + ny * K[1] + nz * K[2] + 0.3) / 1.3);
      const rim = Math.pow(clamp(-ny), 4) * 0.8;                        // cool rim along the far (top) edge
      const hv = [K[0], K[1], K[2] + 1], hl = Math.hypot(...hv), nh = Math.max(0, (nx * hv[0] + ny * hv[1] + nz * hv[2]) / hl);
      const spec = Math.pow(nh, 30) * 0.18 + Math.pow(nh, 6) * 0.04;
      const vein = Math.exp(-Math.pow((y + 40 - 26 * Math.sin(x / 260) - x * 0.02) / 5, 2)) * sstep(-250, 150, x) * (1 - sstep(500, 900, x)) * 0.35
                 + Math.exp(-Math.pow((y - 70 - 20 * Math.sin(x / 200 + 1)) / 4, 2)) * sstep(-200, 200, x) * (1 - sstep(400, 700, x)) * 0.25;
      const tone = 1 + 0.05 * N3(x / 40, y / 40), blush = 0.5 + 0.5 * N2(x / 120 + 7, y / 90);
      let ar = 228 * tone, ag = 168 * tone, ab = 140 * tone;
      ag -= 18 * blush * (0.5 + 0.5 * Math.abs(q)); ab -= 10 * blush;
      ar = lerp(ar, 150, vein * 0.5); ag = lerp(ag, 150, vein * 0.3); ab = lerp(ab, 190, vein * 0.6);
      const sss = (1 - kd) * 0.2;
      const hand = sstep(-420, -900, x);                                // hand side falls into shadow
      const lit = (1 - 0.8 * hand);
      let R = (ar / 255) * (0.95 * kd + 0.12) * (1 - crease * 0.35) * lit + sss * 0.7 * lit + spec * lit + rim * 0.55;
      let G = (ag / 255) * (0.9 * kd + 0.12) * (1 - crease * 0.4) * lit + sss * 0.18 * lit + spec * lit + rim * 0.62;
      let B = (ab / 255) * (0.85 * kd + 0.16) * (1 - crease * 0.4) * lit + sss * 0.16 * lit + spec * lit + rim * 0.85;
      R = R / (1 + 0.25 * R) * 1.15; G = G / (1 + 0.25 * G) * 1.15; B = B / (1 + 0.25 * B) * 1.15;
      const edge = clamp((1 - Math.abs(q)) * r * res * 0.8), j = (py * W + px) * 4;
      d[j] = clamp(R) * 255; d[j + 1] = clamp(G) * 255; d[j + 2] = clamp(B) * 255; d[j + 3] = edge * 255 * (1 - 0.85 * sstep(-800, -1250, x));
    }
    const cv = mk(W, H); cv.getContext('2d').putImageData(img, 0, 0);
    return { cv, res, X0, Y0, W: X1 - X0, H: Y1 - Y0, radius };
  };
  P.drawWrist = function (ctx, Wr, x, y, s, rot, wet = 0, wetAt = [-160, -30]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.save(); ctx.filter = 'blur(26px)'; ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.beginPath(); ctx.ellipse(40, 90, 1250, 220, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.drawImage(Wr.cv, Wr.X0, Wr.Y0, Wr.W, Wr.H);
    if (wet > 0) {   // a glossy wet patch where the tip touched: darker skin + sharp specular + thin bright edge
      const [wx, wy] = wetAt;
      ctx.save(); ctx.globalAlpha = wet;
      let g = ctx.createRadialGradient(wx, wy, 5, wx, wy, 90); g.addColorStop(0, 'rgba(120,70,60,0.28)'); g.addColorStop(1, 'rgba(120,70,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(wx, wy, 95, 55, 0.1, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'screen';
      g = ctx.createRadialGradient(wx - 30, wy - 18, 2, wx - 30, wy - 18, 46); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(wx - 30, wy - 18, 46, 13, -0.25, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(210,235,255,0.55)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(wx, wy, 88, 50, 0.1, 0.3, 2.6); ctx.stroke();
      for (const [dx, dy, r] of [[40, 10, 6], [-55, 22, 4], [15, -28, 3.5]]) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(wx + dx, wy + dy, r, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- face profile silhouette with rim light (faces left)
  function profilePath(ctx) {
    ctx.beginPath();
    ctx.moveTo(90, -760); ctx.bezierCurveTo(40, -560, 60, -400, 20, -300);
    ctx.bezierCurveTo(0, -250, 30, -220, 40, -190);
    ctx.bezierCurveTo(10, -110, -60, -30, -100, 18); ctx.bezierCurveTo(-126, 50, -100, 80, -62, 74);
    ctx.bezierCurveTo(-40, 72, -24, 88, 4, 90); ctx.bezierCurveTo(24, 92, 30, 120, 22, 150);
    ctx.bezierCurveTo(8, 175, -14, 182, -10, 205); ctx.bezierCurveTo(-4, 225, 16, 232, 14, 250);    // upper lip
    ctx.bezierCurveTo(8, 268, -8, 278, -2, 300); ctx.bezierCurveTo(6, 322, 30, 330, 34, 360);        // lower lip
    ctx.bezierCurveTo(40, 420, 10, 470, 40, 520); ctx.bezierCurveTo(80, 590, 200, 600, 260, 760);    // chin, jaw
    ctx.lineTo(900, 760); ctx.lineTo(900, -760); ctx.closePath();
  }
  P.profile = function (ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // body: near-black with a faint warm fill toward the lit edge
    profilePath(ctx); ctx.save(); ctx.clip();
    let g = ctx.createLinearGradient(-130, 0, 420, 0); g.addColorStop(0, '#3a1c24'); g.addColorStop(0.18, '#1a0c14'); g.addColorStop(1, '#07050b');
    ctx.fillStyle = g; ctx.fillRect(-200, -800, 1200, 1600);
    g = ctx.createRadialGradient(-60, 40, 10, -60, 40, 220); g.addColorStop(0, 'rgba(255,150,120,0.22)'); g.addColorStop(1, 'rgba(255,150,120,0)');
    ctx.fillStyle = g; ctx.fillRect(-200, -200, 500, 500);
    ctx.restore();
    // rim light: wide soft glow + tight bright line along the edge
    const rim = o.rim || '#ffc9a8';
    ctx.save(); profilePath(ctx); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(14px)'; ctx.strokeStyle = rim; ctx.globalAlpha = 0.35; ctx.lineWidth = 60; profilePath(ctx); ctx.stroke();
    ctx.filter = 'blur(3px)'; ctx.globalAlpha = 0.85; ctx.lineWidth = 10; profilePath(ctx); ctx.stroke();
    ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.strokeStyle = '#fff4ea'; ctx.lineWidth = 2.5; profilePath(ctx); ctx.stroke();
    ctx.restore();
    // outer halo (backlight bleeding round the edge)
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(40px)'; ctx.globalAlpha = 0.35; ctx.strokeStyle = o.halo || '#a78bfa'; ctx.lineWidth = 40; profilePath(ctx); ctx.stroke(); ctx.restore();
    // nostril and lip line hints
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.ellipse(-44, 66, 18, 8, 0.35, 0, TAU); ctx.fill();
    if (o.inhale > 0) { ctx.save(); ctx.globalAlpha = o.inhale; ctx.strokeStyle = 'rgba(255,220,200,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-44, 66, 22, 11, 0.35, 0, TAU); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  };

  // ---------------------------------------------------------------- dental mirror (head at 0,0; handle along +x, up-right)
  P.mirror = function (ctx, x, y, rot, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const steel = (a, b, flip) => { const g = ctx.createLinearGradient(0, a, 0, b); g.addColorStop(0, flip ? '#5d6472' : '#fbfcff'); g.addColorStop(0.35, '#c7ccd6'); g.addColorStop(0.55, '#7b8291'); g.addColorStop(0.8, '#dfe3ea'); g.addColorStop(1, '#4b515d'); return g; };
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 20;
    ctx.fillStyle = steel(-7, 7); ctx.beginPath(); ctx.roundRect(40, -6, 130, 12, 6); ctx.fill();
    ctx.save(); ctx.translate(165, 0); ctx.rotate(-0.2); ctx.fillStyle = steel(-15, 15); ctx.beginPath(); ctx.roundRect(0, -15, 1100, 30, 15); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(40,44,54,0.5)'; ctx.lineWidth = 2;
    for (let k = 0; k < 34; k++) { const xx = 50 + k * 8; ctx.beginPath(); ctx.moveTo(xx, -14); ctx.lineTo(xx + 5, 14); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(0, -9, 1100, 3); ctx.restore();
    // head rim
    ctx.fillStyle = steel(-48, 48); ctx.beginPath(); ctx.arc(0, 0, 48, 0, TAU); ctx.fill(); ctx.restore();
    // glass: reflects a soft pink (the mouth) with a bright window highlight
    const g = ctx.createLinearGradient(-38, -38, 38, 38); g.addColorStop(0, o.refl0 || '#f6d6e0'); g.addColorStop(0.5, o.refl1 || '#b7839d'); g.addColorStop(1, '#3d2a44');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 39, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 39, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(-14, -16, 20, 7, -0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-40, 10, 80, 5);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 47, -2.6, -1.0); ctx.stroke();
    // gunk on the leading edge: wet glossy cream -> dry matte, crackled, a little yellower
    if ((o.gunk || 0) > 0) {
      const k = o.gunk, dry = o.dry || 0, R = 26 * k;
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 52, 0, TAU); ctx.clip();
      const base = [lerp(242, 222, dry), lerp(236, 206, dry), lerp(214, 150, dry)];
      const gg = ctx.createRadialGradient(-26, 20, 2, -18, 28, R * 1.6); gg.addColorStop(0, `rgb(${base.map((c) => Math.round(Math.min(255, c + 12))).join(',')})`); gg.addColorStop(1, `rgb(${base.map((c) => Math.round(c * 0.78)).join(',')})`);
      ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(-20, 26, R * 1.5, R * 0.8, -0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(-2, 36, R * 0.9, R * 0.5, -0.2, 0, TAU); ctx.fill();
      if (dry < 0.95) { ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - dry)})`; ctx.beginPath(); ctx.ellipse(-28, 18, R * 0.4, R * 0.13, -0.5, 0, TAU); ctx.fill(); }
      if (dry > 0.15) { ctx.strokeStyle = `rgba(120,95,50,${0.7 * dry})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-38, 22); ctx.lineTo(-24, 30); ctx.lineTo(-14, 25); ctx.moveTo(-24, 30); ctx.lineTo(-22, 40); ctx.moveTo(-8, 34); ctx.lineTo(4, 40); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- toothbrush, top view (head at 0,0, handle along +x)
  P.brush = function (ctx, x, y, rot, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.save(); ctx.filter = 'blur(14px)'; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(-90, -10, 800, 70, 30); ctx.fill(); ctx.restore();
    // handle: translucent violet with an inner glow, a specular stripe and a rim
    const hp = () => { ctx.beginPath(); ctx.moveTo(60, -15); ctx.bezierCurveTo(160, -17, 220, -30, 720, -34); ctx.lineTo(720, 34); ctx.bezierCurveTo(220, 30, 160, 17, 60, 15); ctx.closePath(); };
    let g = ctx.createLinearGradient(0, -34, 0, 34); g.addColorStop(0, '#d9ccff'); g.addColorStop(0.3, '#8f73f0'); g.addColorStop(0.7, '#4f35b8'); g.addColorStop(1, '#2a1a70');
    hp(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); hp(); ctx.clip();
    ctx.fillStyle = 'rgba(215,243,74,0.92)'; ctx.beginPath(); ctx.roundRect(300, -22, 190, 44, 22); ctx.fill();
    g = ctx.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(300, -22, 190, 44);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(80, -12, 640, 4);
    ctx.strokeStyle = 'rgba(190,220,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(80, 14); ctx.bezierCurveTo(200, 16, 260, 28, 720, 31); ctx.stroke();
    ctx.restore();
    // head
    g = ctx.createLinearGradient(0, -36, 0, 36); g.addColorStop(0, '#cbbdff'); g.addColorStop(0.5, '#7b5ee6'); g.addColorStop(1, '#3a2596');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-100, -36, 178, 72, 32); ctx.fill();
    // bristle tufts: 3 rows, each a small lit disc
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) {
      const bx = -84 + i * 18.5, by = -21 + j * 21, wig = o.wiggle ? Math.sin(o.wiggle * 30 + i + j) * 1.6 : 0;
      const bg = ctx.createRadialGradient(bx - 3 + wig, by - 3, 0.5, bx + wig, by, 9.5); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.6, j === 1 ? '#bfe4ff' : '#e6f4ff'); bg.addColorStop(1, 'rgba(120,150,190,0.9)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx + wig, by, 9, 0, TAU); ctx.fill();
    }
    if ((o.gunk || 0) > 0) { ctx.globalAlpha = clamp(o.gunk); for (let i = 0; i < 8; i++) { const gx = -78 + i * 21, gy = -10 + (i % 3) * 11; const gg = ctx.createRadialGradient(gx - 3, gy - 3, 1, gx, gy, 12); gg.addColorStop(0, '#fffaf0'); gg.addColorStop(1, '#cfc4a4'); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(gx, gy, 12, 7, 0.3, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    ctx.restore();
  };

  // ---------------------------------------------------------------- depth helpers
  P.bokeh = function (api, n = 26, seed = 'bokeh') {
    const R = api.rand(seed), out = [];
    for (let i = 0; i < n; i++) out.push({ x: R() * 1920, y: R() * 1080, r: 18 + R() * 70, a: 0.04 + R() * 0.1, c: R() < 0.6 ? [255, 140, 170] : R() < 0.5 ? [167, 139, 250] : [255, 200, 160], sp: 4 + R() * 12, ph: R() * TAU });
    return out;
  };
  P.drawBokeh = function (ctx, B, t, a = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const b of B) {
      const x = b.x + Math.sin(t * 0.2 + b.ph) * b.sp * 3, y = b.y - t * b.sp;
      const yy = ((y % 1180) + 1180) % 1180 - 50;
      const g = ctx.createRadialGradient(x, yy, b.r * 0.6, x, yy, b.r); g.addColorStop(0, `rgba(${b.c.join(',')},${b.a * a})`); g.addColorStop(0.85, `rgba(${b.c.join(',')},${b.a * a * 0.8})`); g.addColorStop(1, `rgba(${b.c.join(',')},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, yy, b.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };
  let tiltA = null, tiltB = null;
  // o: { focusY (design px), band (half height in focus), fall (px to full blur), blur (design px) }
  P.tilt = function (ctx, api, fn, o = {}) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height, sc = api.scale;
    if (!tiltA || tiltA.width !== cw || tiltA.height !== ch) { tiltA = mk(cw, ch); tiltB = mk(cw, ch); }
    const a = tiltA.getContext('2d'), b = tiltB.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, cw, ch); a.setTransform(sc, 0, 0, sc, 0, 0); a.save(); fn(a); a.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(tiltA, 0, 0);
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'copy'; b.filter = `blur(${Math.round((o.blur || 10) * sc)}px)`; b.drawImage(tiltA, 0, 0); b.filter = 'none';
    b.globalCompositeOperation = 'destination-out';
    const fy = (o.focusY ?? 540) * sc, band = (o.band ?? 160) * sc, fall = (o.fall ?? 240) * sc;
    const g = b.createLinearGradient(0, fy - band - fall, 0, fy + band + fall);
    const tot = 2 * (band + fall), s0 = fall / tot, s1 = (fall + 2 * band) / tot;
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(s0, 'rgba(0,0,0,1)'); g.addColorStop(s1, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = g; b.fillRect(0, 0, cw, ch); b.globalCompositeOperation = 'source-over';
    ctx.drawImage(tiltB, 0, 0); ctx.restore();
  };
  P.tag = function (ctx, api) { api.text(ctx, '* ARTISTIC RENDERING', 1860, 62, { size: 22, color: api.P.faint, align: 'right', tracking: 2 }); };
  window.PROPS = P;
})();
