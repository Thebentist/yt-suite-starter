/* Lit tongue for the phase-2 upgrade (tip-vs-back, dentist-check, brush-vs-scrape, one-spot). Loaded after _lib.js.
 *
 *   TONGUE.buildLit(api, { res, region: [vMin, vMax], seed })  -> T  (same local units and outline as TONGUE.build)
 *   TONGUE.drawLit(ctx, T, { x, y, s, coat: { amount, reach, tint: [r,g,b], erase(g), add(g) }, teeth, under, over })
 *   TONGUE.buildTeethLit(api, T)
 *
 * The tongue is a height field (rolled dome, midline groove, thousands of filiform points that grow toward the back,
 * redder fungiform dots at the tip and sides, the V of circumvallate papillae, lumpy root) shaded per pixel in setup:
 * warm key light from the upper left, cool rim from behind right, wrap diffuse + a red subsurface glow in the shadows,
 * patchy wet specular, cavity occlusion. The coating is a second shaded layer (thicker, fibrous, matte) tinted per frame
 * with multiply so it keeps its lighting. `region` builds only a band of the tongue (v from tip 0 to back 1) at high
 * resolution for macro close-ups; the papillae are generated over the whole tongue with the same seed, so a close-up
 * shows exactly the bumps the wide shot shows.
 */
(function () {
  const TG = window.TONGUE, { L, HW, hw, vOfY, vCut, sstep, clamp, lerp, coatDensity } = TG;
  const TAU = Math.PI * 2;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const norm3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
  const KEY = norm3(-0.5, -0.62, 0.6), FILL = norm3(0.65, 0.45, 0.6), RIM = norm3(0.72, -0.5, -0.1), HALF = norm3(KEY[0], KEY[1], KEY[2] + 1);

  // separable box blur of a Float32 field (w x h), radius r px, 2 passes ~ gaussian
  function blurField(src, w, h, r) {
    let a = src, b = new Float32Array(w * h);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) { let acc = 0; const row = y * w; for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { b[row + x] = acc / (2 * r + 1); acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
      const c = new Float32Array(w * h);
      for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { c[y * w + x] = acc / (2 * r + 1); acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; } }
      a = c;
    }
    return a;
  }

  TG.buildLit = function (api, o = {}) {
    const res = o.res || Math.max(1, api.scale) * 1.2, pad = 40, seed = o.seed || 1;
    const R = api.rand('lit-' + seed), NZ = api.noise('tongue-nz-' + seed), N1 = api.noise('lit-a-' + seed), N2 = api.noise('lit-b-' + seed), N3 = api.noise('lit-c-' + seed);
    const [vMin, vMax] = o.region || [0, 1];
    const yTop = Math.max(-L / 2 - pad, L / 2 - vMax * L - pad), yBot = Math.min(L / 2 + pad, L / 2 - vMin * L + pad);
    const ox = HW + pad, oy = -yTop;                                   // local (0,0) sits at canvas (ox, oy) * res
    const W = Math.ceil((2 * HW + 2 * pad) * res), H = Math.ceil((yBot - yTop) * res), n = W * H;
    const T = { lit: true, res, pad, cw: W, ch: H, ox, oy, region: [vMin, vMax] };
    T.local = (g) => g.setTransform(res, 0, 0, res, ox * res, oy * res);
    const grooveX = (y) => NZ(y / 140, 3.1) * 5;
    T.grooveX = grooveX;
    const toPx = (x, y) => [(x + ox) * res, (y + oy) * res];

    // ---- papillae list over the WHOLE tongue (same for every region build)
    const pap = [];
    for (let i = 0, tries = 0; i < (o.papillae || 30000) && tries < 240000; tries++) {
      const u = R() * 2 - 1, v = 0.012 + R() * 0.96, w = hw(v); if (w <= 0) continue;
      const x = u * w, y = L / 2 - v * L;
      const dens = (0.55 + 0.45 * sstep(0.1, 0.8, v)) * (1 - 0.65 * sstep(0.82, 1, Math.abs(u))) * (1 - 0.9 * Math.exp(-Math.pow((x - grooveX(y)) / 6, 2)));
      if (R() > dens) continue;
      if (v > vCut(x) - 0.01) continue;                                 // none behind the V
      i++;
      const grow = sstep(0.04, 0.88, v), r = lerp(1.25, 1.9, grow) * (0.8 + R() * 0.4), len = r * lerp(1.15, 2.4, grow);
      pap.push({ x, y, r, len, ang: -Math.PI / 2 + (R() - 0.5) * 0.7 + u * 0.35, a: lerp(0.8, 1.8, grow) * (0.7 + R() * 0.6), u, v });
    }
    const fung = [];
    for (let i = 0, tries = 0; i < 130 && tries < 5000; tries++) {
      const u = R() * 2 - 1, v = 0.03 + R() * 0.75;
      const k = Math.max(1 - sstep(0.0, 0.45, v), sstep(0.55, 0.95, Math.abs(u))) * 0.9 + 0.06;
      if (R() > k) continue; i++;
      fung.push({ x: u * 0.94 * hw(v), y: L / 2 - v * L, r: 2.2 + R() * 1.8 });
    }
    const vApex = TG.pt(0, 0.945), vPts = [];
    for (let k = -4; k <= 4; k++) { const s = Math.abs(k) / 4; vPts.push([k * 0.155 * HW, vApex[1] + s * 0.085 * L]); }
    const lumps = [];
    for (let i = 0, tries = 0; i < 40 && tries < 900; tries++) { const u = R() * 2 - 1, v = 0.82 + R() * 0.17, x = u * hw(v); if (v < vCut(x) + 0.02) continue; i++; lumps.push({ x, y: L / 2 - v * L, r: 7 + R() * 9 }); }
    T.pap = pap; T.fung = fung; T.vPts = vPts;

    // ---- height, bump, redness fields
    const Hh = new Float32Array(n), bump = new Float32Array(n), red = new Float32Array(n), mask = new Float32Array(n), U = new Float32Array(n), V = new Float32Array(n);
    for (let py = 0; py < H; py++) {
      const y = py / res - oy, v = vOfY(y), w = hw(v);
      const gw = v > 0.07 && v < 0.9 ? 2.5 + 7.5 * Math.pow(Math.sin(Math.PI * Math.min(1, ((v - 0.07) / 0.83) * 1.15)), 0.6) : 0, gx = grooveX(y);
      for (let px = 0; px < W; px++) {
        const j = py * W + px; V[j] = v;
        if (w <= 0) { mask[j] = 0; continue; }
        const x = px / res - ox, u = x / w; U[j] = u;
        const edge = (1 - Math.abs(u)) * w;                             // local units to the side edge
        mask[j] = clamp(edge * res + 0.5) * (1 - 0.92 * sstep(0.9, 1.0, v));
        if (edge <= 0) continue;
        let h = 58 * Math.pow(Math.max(0, 1 - u * u), 0.5) * (1 - 0.45 * sstep(0.78, 1.0, v)) * Math.pow(sstep(0, 0.08, v), 0.5);
        if (gw > 0) h -= 5.5 * Math.exp(-Math.pow((x - gx) / gw, 2)) * sstep(0.07, 0.14, v);
        h += 0.35 * N1(x / 3.2, y / 3.2) + 0.9 * N2(x / 22, y / 22);
        Hh[j] = h;
      }
    }
    const stamp = (x, y, rx, ry, ang, amp, field, field2, amp2) => {
      const [cx, cy] = toPx(x, y), ext = Math.ceil(Math.max(rx, ry) * 2.2 * res);
      if (cx + ext < 0 || cx - ext >= W || cy + ext < 0 || cy - ext >= H) return;
      const ca = Math.cos(ang), sa = Math.sin(ang), irx = 1 / (rx * res), iry = 1 / (ry * res);
      for (let yy = Math.max(0, Math.floor(cy - ext)); yy <= Math.min(H - 1, Math.ceil(cy + ext)); yy++) for (let xx = Math.max(0, Math.floor(cx - ext)); xx <= Math.min(W - 1, Math.ceil(cx + ext)); xx++) {
        const dx = xx - cx, dy = yy - cy, a = (dx * ca + dy * sa) * irx, b = (-dx * sa + dy * ca) * iry, q = a * a + b * b; if (q > 4.8) continue;
        const e = Math.exp(-q), j = yy * W + xx; field[j] += amp * e; if (field2) field2[j] += amp2 * e;
      }
    };
    // filiform points (elongated along their direction: the long axis is `len`, pointing back)
    for (const p of pap) stamp(p.x, p.y, p.len, p.r, p.ang, p.a, bump, null, 0);
    for (const f of fung) stamp(f.x, f.y, f.r, f.r, 0, 1.8, bump, red, 1.0);
    for (const [x, y] of vPts) { stamp(x, y, 11, 11, 0, -2.2, Hh, null, 0); stamp(x, y, 6.5, 6.5, 0, 4.2, Hh, red, 0.45); }
    for (const l of lumps) stamp(l.x, l.y, l.r, l.r, 0, 2.6, Hh, red, 0.2);
    for (let j = 0; j < n; j++) Hh[j] += bump[j];
    // ---- shade
    const blurH = blurField(Hh, W, H, Math.max(2, Math.round(5 * res)));
    const img = new ImageData(W, H), d = img.data, sh = 1 / (2 / res);
    const litAt = (j, px, py, hf, nk) => {
      const hl = hf[px > 0 ? j - 1 : j], hr = hf[px < W - 1 ? j + 1 : j], hu = hf[py > 0 ? j - W : j], hd = hf[py < H - 1 ? j + W : j];
      return norm3(-(hr - hl) * sh * nk, -(hd - hu) * sh * nk, 1);
    };
    const coatHf = new Float32Array(n), coatA = new Float32Array(n);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const j = py * W + px, m = mask[j]; if (m <= 0) continue;
      const y = py / res - oy, x = px / res - ox, u = U[j], v = V[j];
      const [nx, ny, nz] = litAt(j, px, py, Hh, 1);
      // albedo: tissue pink, deeper toward the root, lighter keratin on the points, red fungiform dots
      const b = clamp(bump[j] / 2.2), rr = clamp(red[j]);
      let ar = 196, ag = 80, ab = 102;
      const deep = 0.6 * sstep(0.6, 1.0, v); ar = lerp(ar, 128, deep); ag = lerp(ag, 36, deep); ab = lerp(ab, 70, deep);
      const var1 = 1 + 0.08 * N2(x / 30, y / 30); ar *= var1; ag *= var1; ab *= var1;
      ar = lerp(ar, 226, b * 0.4); ag = lerp(ag, 138, b * 0.4); ab = lerp(ab, 150, b * 0.4);
      ar = lerp(ar, 200, rr); ag = lerp(ag, 38, rr); ab = lerp(ab, 64, rr);
      // light
      const kd = clamp((nx * KEY[0] + ny * KEY[1] + nz * KEY[2] + 0.35) / 1.35), fd = Math.max(0, nx * FILL[0] + ny * FILL[1] + nz * FILL[2]);
      const ao = 1 - 0.55 * clamp((blurH[j] - Hh[j]) * 0.22);
      const rim = Math.pow(Math.max(0, nx * RIM[0] + ny * RIM[1] + nz * RIM[2]), 1.6) * (1 - nz * 0.6);
      const nh = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]);
      const wet = 0.3 + 0.7 * sstep(-0.25, 0.45, N3(x / 45, y / 45)) * (1 - 0.5 * sstep(0.75, 1, v));
      const spec = (Math.pow(nh, 55) * 0.75 + Math.pow(nh, 12) * 0.06) * wet;
      const sss = (1 - kd) * 0.22;
      let r = (ar / 255) * (0.98 * kd + 0.16 * fd + 0.12) * ao + sss * 0.55 + rim * 0.42 + spec;
      let g = (ag / 255) * (0.92 * kd + 0.18 * fd + 0.12) * ao + sss * 0.08 + rim * 0.4 + spec;
      let bl = (ab / 255) * (0.9 * kd + 0.28 * fd + 0.14) * ao + sss * 0.14 + rim * 0.6 + spec * 0.98;
      r = r / (1 + 0.3 * r) * 1.2; g = g / (1 + 0.3 * g) * 1.2; bl = bl / (1 + 0.3 * bl) * 1.2;
      const k4 = j * 4; d[k4] = clamp(r) * 255; d[k4 + 1] = clamp(g) * 255; d[k4 + 2] = clamp(bl) * 255; d[k4 + 3] = m * 255;
      // coating: a thicker fibrous layer over the points, back third heaviest
      const cd = coatDensity(u, v) * (0.72 + 0.45 * (N2(x / 40, y / 40) * 0.5 + 0.5) + 0.12 * N1(x / 12, y / 12));
      if (cd > 0.01) {
        const fib = 0.5 + 0.5 * N1(x / 1.8, y / 5.5);
        coatA[j] = clamp(sstep(0.04, 0.8, cd) * 0.8 + b * cd * 0.8) * m;
        coatHf[j] = Hh[j] * 0.6 + cd * (4 + 1.4 * fib) + b * 0.5;
      } else coatHf[j] = Hh[j];
    }
    const base = mk(W, H); base.getContext('2d').putImageData(img, 0, 0);
    // crisp dark edge line to seat it on the stage
    { const g = base.getContext('2d'); T.local(g); g.strokeStyle = 'rgba(60,6,26,0.55)'; g.lineWidth = 1.6; g.globalCompositeOperation = 'source-atop'; TG.path(g); g.stroke(); }
    T.base = base;
    // ---- coat layer, shaded (cream, matte with a faint sheen)
    const cimg = new ImageData(W, H), cd4 = cimg.data;
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const j = py * W + px, a = coatA[j]; if (a <= 0.004) continue;
      const x = px / res - ox, y = py / res - oy;
      const [nx, ny, nz] = litAt(j, px, py, coatHf, 0.7);
      const kd = clamp((nx * KEY[0] + ny * KEY[1] + nz * KEY[2] + 0.5) / 1.5), ao = 1 - 0.5 * clamp((blurH[j] + 3 - coatHf[j]) * -0.1 + 0.2);
      const nh = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), rim = Math.pow(Math.max(0, nx * RIM[0] + ny * RIM[1] + nz * RIM[2]), 1.6);
      const tone = 0.93 + 0.07 * N2(x / 9, y / 9);
      const lum = (0.55 + 0.55 * kd) * ao * tone, sp = Math.pow(nh, 30) * 0.16;
      const k4 = j * 4;
      cd4[k4] = clamp(1.0 * lum + sp + rim * 0.2) * 255; cd4[k4 + 1] = clamp(0.96 * lum + sp + rim * 0.2) * 255; cd4[k4 + 2] = clamp(0.88 * lum + sp + rim * 0.3) * 255;
      cd4[k4 + 3] = clamp(a) * 255;
    }
    const coat = mk(W, H); coat.getContext('2d').putImageData(cimg, 0, 0);
    T.coat = coat; T.tmp = mk(W, H); T.tg = T.tmp.getContext('2d'); T.tmp2 = mk(W, H); T.tg2 = T.tmp2.getContext('2d');
    // ---- soft drop shadow (whole tongue)
    const sres = Math.min(1, res * 0.35), spad = 140, shadow = mk((2 * HW + 2 * spad) * sres, (L + 2 * spad) * sres), s = shadow.getContext('2d');
    s.setTransform(sres, 0, 0, sres, (HW + spad) * sres, (L / 2 + spad) * sres); s.filter = `blur(${30 * sres}px)`;
    s.fillStyle = 'rgba(0,0,0,0.75)'; s.translate(18, 36); TG.path(s, 8); s.fill();
    T.shadow = shadow; T.spad = spad; T.sres = sres;
    return T;
  };

  TG.drawLit = function (ctx, T, o = {}) {
    const s = o.s || 1;
    ctx.save(); ctx.translate(o.x || 0, o.y || 0); if (o.rot) ctx.rotate(o.rot); ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.shadow !== false && T.shadow) ctx.drawImage(T.shadow, -(HW + T.spad), -(L / 2 + T.spad), T.shadow.width / T.sres, T.shadow.height / T.sres);
    if (o.teeth && T.teethCv) { ctx.save(); ctx.globalAlpha *= clamp(o.teeth); ctx.drawImage(T.teethCv, -T.teethOx, -T.teethOy, T.teethCv.width / T.teethRes, T.teethCv.height / T.teethRes); ctx.restore(); }
    const W2 = T.cw / T.res, H2 = T.ch / T.res;
    ctx.drawImage(T.base, -T.ox, -T.oy, W2, H2);
    if (o.under) { ctx.save(); o.under(ctx); ctx.restore(); }
    const c = o.coat;
    if (c && (c.amount ?? 1) > 0.001) {
      const g = T.tg; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
      g.clearRect(0, 0, T.cw, T.ch); g.drawImage(T.coat, 0, 0);
      T.local(g);
      const reach = c.reach ?? 1;
      if (reach < 0.999) {
        g.globalCompositeOperation = 'destination-in';
        const cy0 = -L / 2 - 0.1 * L, Rr = Math.max(2, reach * 1.12 * L), fe = 0.2 * L;
        const rgd = g.createRadialGradient(0, cy0, Math.max(0, Rr - fe), 0, cy0, Rr); rgd.addColorStop(0, 'rgba(0,0,0,1)'); rgd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rgd; g.fillRect(-T.ox, -T.oy, W2, H2);
      }
      if (c.erase) { g.globalCompositeOperation = 'destination-out'; g.save(); c.erase(g); g.restore(); }
      if (c.add) { g.globalCompositeOperation = 'source-over'; g.save(); c.add(g); g.restore(); }
      if (c.tint) {   // multiply keeps the shading; restore the alpha afterwards
        const g2 = T.tg2; g2.setTransform(1, 0, 0, 1, 0, 0); g2.globalCompositeOperation = 'copy'; g2.drawImage(T.tmp, 0, 0);
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = TG.rgba(c.tint); g.fillRect(0, 0, T.cw, T.ch);
        g.globalCompositeOperation = 'destination-in'; g.drawImage(T.tmp2, 0, 0); g.globalCompositeOperation = 'source-over';
      }
      ctx.save(); ctx.globalAlpha *= clamp(c.amount ?? 1); ctx.drawImage(T.tmp, -T.ox, -T.oy, W2, H2); ctx.restore();
    }
    if (o.over) { ctx.save(); o.over(ctx); ctx.restore(); }
    ctx.restore();
  };

  // lower arch, lit: wet gum band + teeth with a key light, a cool rim, enamel specular and dark gaps
  TG.buildTeethLit = function (api, T, o = {}) {
    const res = o.res || T.res, pad = 190, ox = HW + pad, oy = L / 2 + pad, W = Math.ceil((2 * HW + 2 * pad) * res), H = Math.ceil((L + 2 * pad) * res);
    const cv = mk(W, H), g = cv.getContext('2d'); g.setTransform(res, 0, 0, res, ox * res, oy * res);
    const A = TG.ARCH, half = [], acc = [0];
    for (let i = 0; i <= 200; i++) half.push(TG.archPoint((i / 200) * A.Wa * 0.999));
    for (let i = 1; i < half.length; i++) acc.push(acc[i - 1] + Math.hypot(half[i][0] - half[i - 1][0], half[i][1] - half[i - 1][1]));
    const at = (sl) => { let k = 1; while (k < acc.length - 1 && acc[k] < sl) k++; const f = clamp((sl - acc[k - 1]) / Math.max(1e-6, acc[k] - acc[k - 1])); const a = half[k - 1], b = half[k]; return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; };
    const kinds = ['i', 'l', 'c', 'p', 'p', 'm', 'm'], widths = { m: 62, p: 42, c: 40, l: 34, i: 31 }, depths = { m: 58, p: 46, c: 40, l: 22, i: 19 }, sc = 1.32, gap = 2.5;
    const teeth = []; let sp = 1.5;
    for (const kind of kinds) { const w = widths[kind] * sc, d = depths[kind] * sc, c = at(sp + w / 2); teeth.push({ ...c, w, d, kind }); sp += w + gap; }
    const endLen = sp + 10, band = [];
    for (let i = half.length - 1; i >= 0; i--) if (acc[i] <= endLen) band.push([-half[i][0], half[i][1]]);
    for (let i = 1; i < half.length; i++) if (acc[i] <= endLen) band.push(half[i]);
    const line = (w, col, blur = 0, dx = 0, dy = 0) => { g.save(); if (blur) g.filter = `blur(${blur * res}px)`; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); band.forEach((p, i) => (i ? g.lineTo(p[0] + dx, p[1] + dy) : g.moveTo(p[0] + dx, p[1] + dy))); g.stroke(); g.restore(); };
    line(156, 'rgba(0,0,0,0.6)', 18, 10, 18);
    line(132, '#360717'); line(122, '#8e2c48'); line(110, '#c04c69'); line(92, '#d8657f');
    line(26, 'rgba(255,215,225,0.35)', 5, -8, -10);                    // wet sheen along the ridge
    line(10, 'rgba(255,245,248,0.5)', 2, -10, -12);
    T.teethPos = [];
    for (const side of [-1, 1]) for (const t of teeth) {
      const x = side * t.x, y = t.y, ang = side > 0 ? t.ang : Math.PI - t.ang, w = t.w, d = t.d, kind = t.kind;
      T.teethPos.push({ x, y, ang, w, d, kind, side });
      g.save(); g.translate(x, y); g.rotate(ang);
      const rad = Math.min(w, d) * (kind === 'i' || kind === 'l' ? 0.45 : 0.36);
      g.save(); g.filter = `blur(${3 * res}px)`; g.fillStyle = 'rgba(30,0,10,0.7)'; api.roundRect(g, -w / 2 + 3, -d / 2 + 5, w, d, rad); g.fill(); g.restore();
      // body: warm key from the upper left, falloff to a cooler lower right
      g.save(); g.rotate(-ang);
      const tg = g.createLinearGradient(-w * 0.6, -d * 0.6, w * 0.6, d * 0.6); tg.addColorStop(0, '#fffdf6'); tg.addColorStop(0.45, '#efe6d3'); tg.addColorStop(1, '#a89c8a');
      g.restore(); g.fillStyle = tg; api.roundRect(g, -w / 2, -d / 2, w, d, rad); g.fill();
      g.save(); api.roundRect(g, -w / 2, -d / 2, w, d, rad); g.clip();
      // cusps as soft domes with AO in the fissures
      const dome = (cx, cy, r) => { const b = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.08, cx, cy, r); b.addColorStop(0, 'rgba(255,255,252,0.95)'); b.addColorStop(0.55, 'rgba(236,228,210,0.35)'); b.addColorStop(1, 'rgba(120,105,85,0.28)'); g.fillStyle = b; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); };
      if (kind === 'm') for (const [cx, cy] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) dome(cx * w, cy * d, Math.min(w, d) * 0.3);
      else if (kind === 'p') { dome(0, -d * 0.18, Math.min(w, d) * 0.36); dome(0, d * 0.2, Math.min(w, d) * 0.28); }
      else if (kind === 'c') dome(0, 0, Math.min(w, d) * 0.42);
      g.strokeStyle = 'rgba(110,92,70,0.55)'; g.lineWidth = 1.6; g.lineCap = 'round';
      if (kind === 'm') { g.beginPath(); g.moveTo(-w * 0.36, 0); g.bezierCurveTo(-w * 0.1, -d * 0.06, w * 0.1, d * 0.06, w * 0.36, 0); g.moveTo(0, -d * 0.34); g.lineTo(0, d * 0.34); g.stroke(); }
      else if (kind === 'p') { g.beginPath(); g.moveTo(-w * 0.3, 0); g.quadraticCurveTo(0, d * 0.06, w * 0.3, 0); g.stroke(); }
      // enamel specular + cool rim on the far edge
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(-w * 0.2, -d * 0.22, w * 0.12, d * 0.06, -0.4, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(200,210,255,0.55)'; g.lineWidth = 2.2; api.roundRect(g, -w / 2 + 1.5, -d / 2 + 1.5, w - 3, d - 3, rad); g.stroke();
      g.restore();
      g.restore();
    }
    T.teethCv = cv; T.teethRes = res; T.teethOx = ox; T.teethOy = oy;
    return T;
  };
})();
