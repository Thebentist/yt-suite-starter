/* Shared drawing code for the `tongue` group (bad-breath-for-good).
 *
 *   window.TONGUE  one top-view tongue used by every tongue shot: tip at the bottom, back at the top, midline groove,
 *                  filiform papillae (denser and longer toward the back third), fungiform dots (tip and sides),
 *                  the V of circumvallate papillae at the back, wet gloss, and an optional coating layer that can grow
 *                  from the back, be tinted white / yellow / dark, and be erased (scraper stripes) or smeared.
 *                  Optional lower dental arch around it (teeth + gum) for the "teeth" beats.
 *   window.PILE    a 2.5D strand field (papillae or shag-carpet yarn): pre-rendered shaded strand sprites with baked
 *                  fog levels and depth-of-field blur, perspective camera, depth-sorted back to front.
 *
 * Local tongue units: the tongue is L = 800 long and up to 2*HW = 560 wide, origin at its centre, +y toward the tip.
 * (u, v) coordinates: v = 0 at the tip, 1 at the back; u = -1 left edge .. +1 right edge.
 */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hexRgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixRgb = (a, b, t) => { const A = typeof a === 'string' ? hexRgb(a) : a, B = typeof b === 'string' ? hexRgb(b) : b; return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]; };
  const rgba = (c, a = 1) => { const C = typeof c === 'string' ? hexRgb(c) : c; return `rgba(${Math.round(C[0])},${Math.round(C[1])},${Math.round(C[2])},${a})`; };
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

  // =============================================================== TONGUE ==========================================
  const L = 800, HW = 280;
  function hw(v) {
    if (v <= 0 || v >= 1) return 0;
    const vt = 0.26;
    let w;
    w = HW * (0.7 + 0.3 * sstep(vt - 0.04, 0.72, v));   // continuous and smooth across vt (a kink here shows in the lit shading)
    if (v < vt) { const k = 1 - v / vt; w *= Math.pow(1 - k * k, 0.56); }
    if (v > 0.76) { const k = (v - 0.76) / 0.24; w *= Math.pow(1 - k * k, 0.55); }
    return w;
  }
  const pt = (u, v) => [u * hw(v), L / 2 - v * L];
  // the V of the sulcus terminalis: filiform papillae (and the coating on them) stop here; apex at the midline
  const vCut = (x) => 0.952 - 0.085 * Math.min(1.6, Math.abs(x) / (0.62 * HW));
  const vOfY = (y) => (L / 2 - y) / L;
  let OUTLINE = null;
  function outline() {
    if (OUTLINE) return OUTLINE;
    const pts = [], n = 160;
    for (let i = 0; i <= n; i++) { const v = Math.pow(i / n, 1.0); pts.push(pt(1, v)); }
    for (let i = n; i >= 0; i--) { const v = i / n; pts.push(pt(-1, v)); }
    OUTLINE = pts; return pts;
  }
  function tonguePath(g, grow = 0) {
    const pts = outline(); g.beginPath();
    for (let i = 0; i < pts.length; i++) {
      let [x, y] = pts[i];
      if (grow) { const len = Math.hypot(x, y * 0.7) || 1; x += (x / len) * grow; y += ((y * 0.7) / len) * grow; }
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
  }
  function inside(x, y) { const v = vOfY(y); if (v <= 0 || v >= 1) return false; return Math.abs(x) < hw(v); }

  // dental arch centreline (offset of the outline), from left molars round the front to right molars
  function archLine(off = 72, vMax = 0.64) {
    const pts = outline(), out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], r = pts[Math.max(0, i - 1)];
      let tx = q[0] - r[0], ty = q[1] - r[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      // outward normal (outline runs up the right side then down the left: clockwise on screen)
      let nx = ty, ny = -tx; if (nx * p[0] + ny * (p[1] - 0) < 0 && Math.abs(p[0]) > 1) { nx = -nx; ny = -ny; }
      const v = vOfY(p[1]); if (v > vMax) continue;
      out.push({ x: p[0] + nx * off, y: p[1] + ny * off, v, side: p[0] >= 0 ? 1 : -1, i });
    }
    // order: left side from back (v=vMax) down to the tip, then right side up to vMax
    const left = out.filter((o) => o.side < 0).sort((a, b) => b.v - a.v), right = out.filter((o) => o.side >= 0).sort((a, b) => a.v - b.v);
    return left.concat(right);
  }

  function build(api, o = {}) {
    const res = o.res || Math.max(1, api.scale) * (o.zoom || 1);
    const pad = 44, R = api.rand('tongue-' + (o.seed || 1)), NZ = api.noise('tongue-nz-' + (o.seed || 1));
    const cw = (2 * HW + 2 * pad) * res, ch = (L + 2 * pad) * res, ox = HW + pad, oy = L / 2 + pad;
    const T = { res, pad, cw, ch, ox, oy };
    const local = (g) => g.setTransform(res, 0, 0, res, ox * res, oy * res);

    // ---- base: flesh, shading, groove, papillae
    const base = mk(cw, ch), g = base.getContext('2d'); local(g);
    g.save(); tonguePath(g); g.clip();
    g.fillStyle = '#dd6c86'; g.fillRect(-ox, -oy, 2 * ox, 2 * oy);
    // big soft form light: crown of the dorsum lighter, from the upper left
    let rg = g.createRadialGradient(-50, 40, 20, -10, 20, 420); rg.addColorStop(0, 'rgba(255,176,192,0.75)'); rg.addColorStop(0.55, 'rgba(245,140,160,0.25)'); rg.addColorStop(1, 'rgba(200,70,100,0)');
    g.fillStyle = rg; g.fillRect(-ox, -oy, 2 * ox, 2 * oy);
    // mottling
    for (let i = 0; i < 520; i++) {
      const x = (R() * 2 - 1) * HW, y = (R() * 2 - 1) * L / 2, r = 10 + R() * 40;
      const c = R() < 0.5 ? 'rgba(255,190,200,' : 'rgba(170,50,85,';
      const gg = g.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, c + (0.05 + R() * 0.06) + ')'); gg.addColorStop(1, c + '0)');
      g.fillStyle = gg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    // the back slopes away into the throat: darker toward the top
    let lg = g.createLinearGradient(0, -120, 0, -L / 2); lg.addColorStop(0, 'rgba(80,12,38,0)'); lg.addColorStop(0.6, 'rgba(80,12,38,0.35)'); lg.addColorStop(1, 'rgba(45,6,24,0.85)');
    g.fillStyle = lg; g.fillRect(-ox, -oy, 2 * ox, 2 * oy);
    // rolled lateral edges: inner edge darkening
    g.lineJoin = 'round';
    for (let k = 0; k < 12; k++) { g.strokeStyle = 'rgba(105,16,48,0.075)'; g.lineWidth = 10 + k * 14; tonguePath(g); g.stroke(); }
    // two lit crowns either side of the groove (the dorsum is convex both sides of the midline)
    for (const sx of [-1, 1]) {
      g.save(); g.translate(sx * 95 - 18, 30); g.scale(95, 330);
      const cg = g.createRadialGradient(0, 0, 0, 0, 0, 1); cg.addColorStop(0, `rgba(255,190,204,${sx < 0 ? 0.42 : 0.26})`); cg.addColorStop(1, 'rgba(255,190,204,0)');
      g.fillStyle = cg; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
    }
    // midline groove (median sulcus), tip to the V: soft valley with lit lips
    const gy0 = L / 2 - 0.07 * L, gy1 = L / 2 - 0.9 * L, grooveX = (y) => NZ(y / 140, 3.1) * 5;
    const groovePoly = (wmul, shift = 0) => {
      const n = 60, left = [], right = [];
      for (let i = 0; i <= n; i++) {
        const s = i / n, y = lerp(gy0, gy1, s), w = (1.5 + 10 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15)), 0.6)) * wmul;
        left.push([grooveX(y) - w + shift, y]); right.push([grooveX(y) + w + shift, y]);
      }
      g.beginPath(); left.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]); g.closePath();
    };
    g.save(); g.filter = `blur(${5 * res}px)`; g.fillStyle = 'rgba(255,200,212,0.22)'; groovePoly(2.1, -4); g.fill(); g.restore();
    g.save(); g.filter = `blur(${4 * res}px)`; g.fillStyle = 'rgba(105,18,48,0.42)'; groovePoly(1.5); g.fill(); g.restore();
    g.save(); g.filter = `blur(${1.5 * res}px)`; g.fillStyle = 'rgba(80,10,36,0.55)'; groovePoly(0.45, 1); g.fill(); g.restore();
    T.grooveX = grooveX;

    // filiform papillae: tiny velvety points everywhere on the dorsum, denser and longer toward the back.
    // Pink, not white: the back looks rougher (longer points, deeper gaps), the coating layer is what makes it white.
    const nFil = o.papillae || 15000; const PAP = []; T.pap = PAP;
    for (let i = 0, tries = 0; i < nFil && tries < nFil * 6; tries++) {
      const u = R() * 2 - 1, v = 0.015 + R() * 0.95;
      const dens = (0.5 + 0.5 * sstep(0.1, 0.8, v)) * (1 - 0.7 * sstep(0.8, 1, Math.abs(u))) * (1 - 0.85 * Math.exp(-Math.pow((u * hw(v) - grooveX(pt(0, v)[1])) / 6, 2)));
      if (R() > dens) continue;
      if (R() < sstep(-0.035, 0.0, v - vCut(u * hw(v)))) continue;   // behind the V (sulcus terminalis): none
      i++;
      const [x, y] = pt(u, v), grow = sstep(0.05, 0.9, v), r = lerp(0.95, 1.9, grow) * (0.75 + R() * 0.5), len = r * lerp(1.0, 2.3, grow);
      const ang = -Math.PI / 2 + (R() - 0.5) * 0.7 + u * 0.35; // point backward (up), fanning out a little
      PAP.push([x, y, r, len, ang, u, v]);
      g.save(); g.translate(x, y); g.rotate(ang + Math.PI / 2);
      g.fillStyle = `rgba(88,12,40,${lerp(0.18, 0.34, grow)})`; g.beginPath(); g.ellipse(r * 0.5, r * 0.6, r * 1.1, len * 1.08, 0, 0, TAU); g.fill();
      const light = lerp(0.3, 0.46, grow) * (0.7 + R() * 0.5);
      g.fillStyle = `rgba(255,${Math.round(lerp(168, 186, grow))},${Math.round(lerp(184, 198, grow))},${light})`;
      g.beginPath(); g.ellipse(0, 0, r, len, 0, 0, TAU); g.fill();
      if (R() < 0.25) { g.fillStyle = 'rgba(255,225,232,0.35)'; g.beginPath(); g.arc(-r * 0.3, -len * 0.5, r * 0.45, 0, TAU); g.fill(); }
      g.restore();
    }
    // fungiform papillae: redder dots scattered, most at the tip and along the sides
    for (let i = 0, tries = 0; i < 125 && tries < 4000; tries++) {
      const u = R() * 2 - 1, v = 0.03 + R() * 0.75;
      const w = Math.max(1 - sstep(0.0, 0.45, v), sstep(0.55, 0.95, Math.abs(u))) * 0.9 + 0.06;
      if (R() > w) continue; i++;
      const [x, y] = pt(u * 0.95, v), r = 1.8 + R() * 2.0;
      g.fillStyle = 'rgba(90,10,35,0.28)'; g.beginPath(); g.arc(x + 0.8, y + 1, r * 1.1, 0, TAU); g.fill();
      const fg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.2, x, y, r); fg.addColorStop(0, '#fb97a6'); fg.addColorStop(0.6, '#de4c68'); fg.addColorStop(1, '#b23553');
      g.fillStyle = fg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    // circumvallate papillae: a V at the back, apex backward, with the foramen caecum at the apex
    const vPts = []; const apex = pt(0, 0.945);
    for (let k = -4; k <= 4; k++) { const s = Math.abs(k) / 4; vPts.push([k * 0.155 * HW, apex[1] + s * 0.085 * L]); }
    for (const [x, y] of vPts) {
      const r = 7;
      g.fillStyle = 'rgba(70,8,30,0.38)'; g.beginPath(); g.arc(x, y, r + 4, 0, TAU); g.fill();
      const cg = g.createRadialGradient(x - 3, y - 3, 1, x, y, r); cg.addColorStop(0, '#e98ea2'); cg.addColorStop(0.7, '#c45472'); cg.addColorStop(1, '#8e2a4c');
      g.fillStyle = cg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(40,4,18,0.7)'; g.beginPath(); g.ellipse(apex[0], apex[1] - 12, 4, 3, 0, 0, TAU); g.fill();
    // behind the V: the smooth, lumpy root (lingual tonsil), no filiform papillae
    for (let i = 0, tries = 0; i < 46 && tries < 900; tries++) {
      const u = R() * 2 - 1, v = 0.8 + R() * 0.19, x = u * hw(v); if (v < vCut(x) + 0.015) continue; i++;
      const y = L / 2 - v * L, r = 7 + R() * 9, lg2 = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
      lg2.addColorStop(0, 'rgba(236,140,164,0.32)'); lg2.addColorStop(0.7, 'rgba(170,60,95,0.2)'); lg2.addColorStop(1, 'rgba(90,15,45,0)');
      g.fillStyle = lg2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    T.vPts = vPts;
    // rim light on the upper-left edge, soft dark rim on the right
    g.save(); g.filter = `blur(${2.5 * res}px)`; lg = g.createLinearGradient(-HW, 0, HW, 0); lg.addColorStop(0, 'rgba(255,205,215,0.55)'); lg.addColorStop(0.45, 'rgba(255,205,215,0.0)');
    g.strokeStyle = lg; g.lineWidth = 7; tonguePath(g, -3); g.stroke(); g.restore();
    g.restore();
    // crisp silhouette edge
    g.strokeStyle = 'rgba(70,8,30,0.7)'; g.lineWidth = 2.2; tonguePath(g); g.stroke();
    // the root dips away into the throat: fade the last strip into the dark
    g.save(); g.globalCompositeOperation = 'destination-out'; lg = g.createLinearGradient(0, L / 2 - 0.88 * L, 0, -L / 2); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.92)'); g.fillStyle = lg; g.fillRect(-ox, -oy, 2 * ox, oy - L / 2 + 0.12 * L + 2); g.restore();
    T.base = base;

    function fadeRoot(q, a = 0.92) { q.save(); local(q); q.globalCompositeOperation = 'destination-out'; const fg2 = q.createLinearGradient(0, L / 2 - 0.88 * L, 0, -L / 2); fg2.addColorStop(0, 'rgba(0,0,0,0)'); fg2.addColorStop(1, `rgba(0,0,0,${a})`); q.fillStyle = fg2; q.fillRect(-ox, -oy, 2 * ox, oy - L / 2 + 0.12 * L + 2); q.restore(); }
    // ---- gloss (wet specular), drawn with 'screen'
    const gloss = mk(cw, ch), q = gloss.getContext('2d'); local(q);
    q.save(); tonguePath(q, -4); q.clip();
    const sheen = (x, y, rx, ry, rot, a) => { q.save(); q.translate(x, y); q.rotate(rot); q.scale(rx, ry); const sg = q.createRadialGradient(0, 0, 0, 0, 0, 1); sg.addColorStop(0, `rgba(255,255,255,${a})`); sg.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = sg; q.beginPath(); q.arc(0, 0, 1, 0, TAU); q.fill(); q.restore(); };
    sheen(-95, 110, 70, 210, 0.12, 0.26); sheen(-60, -40, 40, 170, 0.05, 0.18); sheen(95, 150, 30, 120, -0.1, 0.12); sheen(-150, 250, 26, 70, 0.4, 0.2);
    for (let i = 0; i < 520; i++) {
      const x = (R() * 2 - 1) * HW, y = (R() * 2 - 1) * L / 2; if (!inside(x, y)) continue;
      const k = Math.exp(-Math.pow((x + 80) / 120, 2) - Math.pow((y - 80) / 300, 2));
      if (R() > k * 0.9 + 0.05) continue;
      q.fillStyle = `rgba(255,255,255,${0.35 + R() * 0.55})`; q.beginPath(); q.arc(x, y, 0.6 + R() * 1.2, 0, TAU); q.fill();
    }
    q.restore();
    T.gloss = gloss;

    // ---- drop shadow (low res, blurred)
    const sres = 0.5 * res, spad = 120, shadow = mk((2 * HW + 2 * spad) * sres, (L + 2 * spad) * sres), s = shadow.getContext('2d');
    s.setTransform(sres, 0, 0, sres, (HW + spad) * sres, (L / 2 + spad) * sres); s.filter = `blur(${26 * sres}px)`;
    s.fillStyle = 'rgba(0,0,0,0.6)'; s.translate(14, 30); tonguePath(s, 6); s.fill();
    T.shadow = shadow; T.spad = spad; T.sres = sres;

    // ---- coating texture (white, neutral); tinted per frame. Density: back third heaviest, margins stay pink
    if (o.coat !== false) {
      const coat = mk(cw, ch), c = coat.getContext('2d');
      // film at low res via ImageData
      const fr = Math.max(0.5, res / 2.5), fw = Math.ceil((2 * HW + 2 * pad) * fr), fh = Math.ceil((L + 2 * pad) * fr);
      const film = mk(fw, fh), fg = film.getContext('2d'), img = fg.createImageData(fw, fh), N2 = api.noise('coat-film-' + (o.seed || 1)), N3 = api.noise('coat-film2-' + (o.seed || 1));
      for (let py = 0; py < fh; py++) for (let px = 0; px < fw; px++) {
        const x = px / fr - ox, y = py / fr - oy, v = vOfY(y), w = hw(v); if (w <= 0) continue;
        const u = x / w; if (Math.abs(u) >= 1) continue;
        const dens = coatDensity(u, v) * (0.72 + 0.45 * (N2(x / 40, y / 40) * 0.5 + 0.5) + 0.12 * N3(x / 12, y / 12));
        const a = sstep(0.04, 0.9, dens) * 0.72, j = (py * fw + px) * 4, sh = 232 + N3(x / 7, y / 7) * 16;
        img.data[j] = sh + 8; img.data[j + 1] = sh + 3; img.data[j + 2] = sh - 8; img.data[j + 3] = Math.round(a * 255);
      }
      fg.putImageData(img, 0, 0);
      c.drawImage(film, 0, 0, fw, fh, 0, 0, fw * res / fr, fh * res / fr);
      local(c); c.save(); tonguePath(c, -6); c.clip();
      // coated papillae: the film sits on the papilla tips, so redraw every papilla as a cream point where it is coated
      for (const [x, y, r, len, ang, u, v] of T.pap) {
        const d = coatDensity(u, v); if (d < 0.04 || R() > d * 1.25) continue;
        c.save(); c.translate(x, y); c.rotate(ang + Math.PI / 2);
        c.fillStyle = `rgba(120,108,90,${0.1 + d * 0.12})`; c.beginPath(); c.ellipse(r * 0.4, r * 0.5, r * 1.25, len * 1.25, 0, 0, TAU); c.fill();
        c.fillStyle = `rgba(255,251,242,${clamp(0.35 + d * 0.55 + (R() - 0.5) * 0.2)})`; c.beginPath(); c.ellipse(0, -len * 0.1, r * 1.12, len * 1.2, 0, 0, TAU); c.fill();
        c.restore();
      }
      // fibres: keratin threads pointing back, with a shadow side
      for (let i = 0, tries = 0; i < (o.fibres || 3500) && tries < 60000; tries++) {
        const u = R() * 2 - 1, v = R(); const d = coatDensity(u, v); if (R() > d) continue; i++;
        const [x, y] = pt(u, v), len = 2 + R() * 5 * (0.5 + v), a = -Math.PI / 2 + (R() - 0.5) * 0.9 + u * 0.3;
        c.lineCap = 'round';
        c.strokeStyle = `rgba(150,138,118,${0.08 + R() * 0.1})`; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x + 1, y + 1); c.lineTo(x + 1 + Math.cos(a) * len, y + 1 + Math.sin(a) * len); c.stroke();
        c.strokeStyle = `rgba(255,253,246,${0.18 + R() * 0.3})`; c.lineWidth = 1 + R() * 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
      }
      for (let i = 0; i < 160; i++) {
        const u = (R() * 2 - 1) * 0.7, v = 0.45 + R() * 0.48; if (R() > coatDensity(u, v)) continue;
        const [x, y] = pt(u, v), r = 6 + R() * 16, bg = c.createRadialGradient(x, y, 0, x, y, r); bg.addColorStop(0, 'rgba(255,250,240,0.35)'); bg.addColorStop(1, 'rgba(255,250,240,0)');
        c.fillStyle = bg; c.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      c.restore();
      fadeRoot(c, 0.97);
      T.coat = coat; T.tmp = mk(cw, ch); T.tg = T.tmp.getContext('2d');
    }
    T.local = local;
    return T;
  }
  function coatDensity(u, v) {
    const au = Math.abs(u), e = lerp(0.5, 0.84, sstep(0.3, 0.78, v));
    return clamp((sstep(0.28, 0.7, v + (1 - au) * 0.08) * (1 - sstep(e - 0.2, e + 0.1, au)) + 0.08 * sstep(0.4, 0.62, v) * (1 - au)) * (1 - 0.85 * sstep(-0.05, 0.03, v - vCut(u * hw(v)))));
  }

  const COATS = { white: ['#f3ede0', 0.2], yellow: ['#d8bd4e', 0.62], dark: ['#2a2017', 0.86], clean: ['#ffffff', 0] };
  // o: { x, y, s, rot, alpha, shadow, coat: { amount, reach, color: name | [rgb], tint (0..1), erase(g), add(g) }, gloss, teeth (0..1), over(ctx) }
  function draw(ctx, T, o = {}) {
    const s = o.s || 1;
    ctx.save(); ctx.translate(o.x || 0, o.y || 0); if (o.rot) ctx.rotate(o.rot); ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.shadow !== false) { const w = T.shadow.width / T.sres, h = T.shadow.height / T.sres; ctx.drawImage(T.shadow, -(HW + T.spad), -(L / 2 + T.spad), w, h); }
    if (o.teeth && T.teethCv) drawTeeth(ctx, T, o.teeth, 'under');
    const W2 = T.cw / T.res, H2 = T.ch / T.res;
    ctx.drawImage(T.base, -T.ox, -T.oy, W2, H2);
    if (o.under) { ctx.save(); o.under(ctx); ctx.restore(); }
    const c = o.coat;
    if (c && T.coat && (c.amount ?? 1) > 0.001) {
      const g = T.tg; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
      g.clearRect(0, 0, T.cw, T.ch); g.drawImage(T.coat, 0, 0);
      T.local(g);
      const reach = c.reach ?? 1;
      if (reach < 0.999) {
        g.globalCompositeOperation = 'destination-in';
        const cy0 = -L / 2 - 0.1 * L, Rr = Math.max(2, reach * 1.12 * L), fe = 0.2 * L;
        const rgd = g.createRadialGradient(0, cy0, Math.max(0, Rr - fe), 0, cy0, Rr); rgd.addColorStop(0, 'rgba(0,0,0,1)'); rgd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rgd; g.fillRect(-T.ox, -T.oy, T.cw, T.ch);
      }
      if (c.erase) { g.globalCompositeOperation = 'destination-out'; g.save(); c.erase(g); g.restore(); }
      if (c.add) { g.globalCompositeOperation = 'source-over'; g.save(); c.add(g); g.restore(); }
      let tint, ta;
      if (Array.isArray(c.color)) { tint = c.color; ta = c.tint ?? 0.6; } else { const k = COATS[c.color || 'white'] || COATS.white; tint = hexRgb(k[0]); ta = c.tint ?? k[1]; }
      if (ta > 0) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = ta; g.fillStyle = rgba(tint); g.fillRect(-T.ox, -T.oy, T.cw, T.ch); g.globalAlpha = 1; }
      ctx.save(); ctx.globalAlpha *= clamp(c.amount ?? 1); ctx.drawImage(T.tmp, -T.ox, -T.oy, W2, H2); ctx.restore();
    }
    if (o.gloss !== 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= o.gloss ?? 0.75; ctx.drawImage(T.gloss, -T.ox, -T.oy, W2, H2); ctx.restore(); }
    if (o.teeth && T.teethCv) drawTeeth(ctx, T, o.teeth, 'over');
    if (o.over) { ctx.save(); o.over(ctx); ctx.restore(); }
    ctx.restore();
  }

  // ---- lower dental arch (occlusal view) around the tongue: gum band + 14 teeth
  // The lower arch is its own U curve (incisors just in front of the tip, second molars beside the middle of the
  // tongue), not an offset of the tongue outline.
  const ARCH = { y0: L / 2 + 62, Wa: HW + 64, Da: 420, p: 1.75 };
  function archPoint(x) { const k = Math.min(1, Math.abs(x) / ARCH.Wa); return [x, ARCH.y0 - ARCH.Da * Math.pow(k, ARCH.p)]; }
  function buildTeeth(api, T) {
    const res = T.res, pad = 190, cw = (2 * HW + 2 * pad) * res, ch = (L + 2 * pad) * res, ox = HW + pad, oy = L / 2 + pad;
    const cv = mk(cw, ch), g = cv.getContext('2d'); g.setTransform(res, 0, 0, res, ox * res, oy * res);
    // dense polyline of the arch, then arc-length placement from the midline outward
    const poly = []; for (let i = 0; i <= 400; i++) { const x = lerp(-ARCH.Wa * 0.999, ARCH.Wa * 0.999, i / 400); poly.push(archPoint(x)); }
    const half = poly.slice(200), acc = [0]; for (let i = 1; i < half.length; i++) acc.push(acc[i - 1] + Math.hypot(half[i][0] - half[i - 1][0], half[i][1] - half[i - 1][1]));
    const at = (sLen) => { let k = 1; while (k < acc.length - 1 && acc[k] < sLen) k++; const f = clamp((sLen - acc[k - 1]) / Math.max(1e-6, acc[k] - acc[k - 1])); const a = half[k - 1], b = half[k]; return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; };
    const kinds = ['i', 'l', 'c', 'p', 'p', 'm', 'm'], widths = { m: 62, p: 42, c: 40, l: 34, i: 31 }, depths = { m: 58, p: 46, c: 40, l: 22, i: 19 }, sc = 1.32, gap = 2.5;
    const teeth = []; let sPos = 1.5;
    for (const kind of kinds) { const w = widths[kind] * sc, d = depths[kind] * sc; const c = at(sPos + w / 2); teeth.push({ ...c, w, d, kind }); sPos += w + gap; }
    const endLen = sPos + 10;
    // the band path: mirror of the used half
    const band = []; for (let i = half.length - 1; i >= 0; i--) if (acc[i] <= endLen) band.push([-half[i][0], half[i][1]]);
    for (let i = 1; i < half.length; i++) if (acc[i] <= endLen) band.push(half[i]);
    const line = (w, col, blur = 0) => { g.save(); if (blur) g.filter = `blur(${blur * res}px)`; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); band.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.restore(); };
    line(150, 'rgba(0,0,0,0.5)', 16);
    line(128, '#3f0c20'); line(114, '#b85470'); line(100, '#e7879c');
    line(52, 'rgba(255,205,215,0.22)', 8);
    T.teethPos = [];
    const bump = (x, y, r, hi = 0.9) => { const bg = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); bg.addColorStop(0, `rgba(255,255,252,${hi})`); bg.addColorStop(0.7, 'rgba(240,232,215,0.35)'); bg.addColorStop(1, 'rgba(190,178,155,0)'); g.fillStyle = bg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    for (const side of [-1, 1]) for (const t of teeth) {
      const x = side * t.x, y = t.y, ang = side > 0 ? t.ang : Math.PI - t.ang, w = t.w, d = t.d, kind = t.kind;
      T.teethPos.push({ x, y, ang, w, d, kind, side });
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = 'rgba(40,6,18,0.5)'; g.beginPath(); g.ellipse(1.5, 3, w / 2 + 3, d / 2 + 3, 0, 0, TAU); g.fill();
      const tg = g.createRadialGradient(-w * 0.12, -d * 0.18, 1, 0, 0, Math.max(w, d) * 0.62); tg.addColorStop(0, '#fbf7ee'); tg.addColorStop(0.7, '#e6dcc8'); tg.addColorStop(1, '#b3a78f');
      g.fillStyle = tg; api.roundRect(g, -w / 2, -d / 2, w, d, Math.min(w, d) * (kind === 'i' || kind === 'l' ? 0.45 : 0.36)); g.fill();
      g.strokeStyle = 'rgba(130,112,86,0.5)'; g.lineWidth = 1.4; g.lineCap = 'round';
      if (kind === 'm') {
        for (const [cx, cy] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) bump(cx * w, cy * d, Math.min(w, d) * 0.3);
        g.beginPath(); g.moveTo(-w * 0.36, 0); g.bezierCurveTo(-w * 0.1, -d * 0.06, w * 0.1, d * 0.06, w * 0.36, 0); g.moveTo(0, -d * 0.34); g.lineTo(0, d * 0.34); g.stroke();
      } else if (kind === 'p') {
        bump(0, -d * 0.18, Math.min(w, d) * 0.36); bump(0, d * 0.2, Math.min(w, d) * 0.28, 0.7);
        g.beginPath(); g.moveTo(-w * 0.3, 0); g.quadraticCurveTo(0, d * 0.06, w * 0.3, 0); g.stroke();
      } else if (kind === 'c') {
        bump(0, 0, Math.min(w, d) * 0.42);
        g.beginPath(); g.moveTo(-w * 0.32, d * 0.12); g.lineTo(0, -d * 0.04); g.lineTo(w * 0.32, d * 0.12); g.stroke();
      } else {
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-w * 0.34, -d * 0.12); g.lineTo(w * 0.34, -d * 0.12); g.stroke();
      }
      g.restore();
    }
    T.teethCv = cv; T.teethPad = pad; T.teethRes = res;
    return T;
  }
  function drawTeeth(ctx, T, a, pass) {
    if (pass !== 'under') return; // arch sits around (below) the tongue in the image
    const pad = T.teethPad, W2 = T.teethCv.width / T.teethRes, H2 = T.teethCv.height / T.teethRes;
    ctx.save(); ctx.globalAlpha *= clamp(a); ctx.drawImage(T.teethCv, -(HW + pad), -(L / 2 + pad), W2, H2); ctx.restore();
  }

  // helpers for scene code working in local tongue coordinates
  function stripe(g, x, y0, y1, w, soft = 8) {
    const top = Math.min(y0, y1), h = Math.abs(y1 - y0);
    g.save(); g.globalAlpha = 0.45; g.beginPath(); g.roundRect ? g.roundRect(x - w / 2 - soft, top - soft, w + soft * 2, h + soft * 2, w / 2) : g.rect(x - w / 2 - soft, top - soft, w + soft * 2, h + soft * 2); g.fill(); g.restore();
    g.save(); g.globalAlpha = 1; g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, top, w, h, w * 0.45) : g.rect(x - w / 2, top, w, h); g.fill(); g.restore();
  }

  window.TONGUE = { L, HW, hw, pt, vOfY, vCut, inside, outline, path: tonguePath, archLine, build, buildTeeth, draw, stripe, coatDensity, COATS, hexRgb, mixRgb, rgba, clamp, lerp, sstep, ARCH, archPoint };


  // =============================================================== PILE (2.5D strands) =============================
  // A strand sprite: a tapered cone with a rounded tip, anchored at its base, pre-shaded (light from the left, a pale
  // keratin tip, dark root, a backlight rim on the right side only). `bend` bends it into an arc: the chord base->tip
  // stays vertical in the sprite, and the base tangent leans `bend` radians clockwise from it.
  function strandSprite(api, sw, aspect, col, o = {}) {
    const sh = Math.round(sw * aspect), bend = o.bend || 0, sag = (sh * Math.tan(bend)) / 4;
    const pad = Math.ceil(sw * 0.6 + Math.abs(sag)), cv = mk(sw + 2 * pad, sh + 2 * pad), g = cv.getContext('2d');
    g.translate(pad + sw / 2, pad);          // x = 0 on the chord, y = 0 at the tip, y = sh at the base
    const taper = o.taper ?? (aspect < 2 ? 0.4 : aspect < 4 ? 0.34 : aspect < 7 ? 0.24 : 0.2);
    const N = 28, cx = (s) => 4 * sag * s * (1 - s), cy = (s) => sh * (1 - s);
    const pw = aspect < 2 ? 0.55 : aspect < 4 ? 0.7 : aspect < 7 ? 0.8 : 0.9, capMin = o.yarn ? 0.5 : aspect < 2 ? 0.2 : aspect < 4 ? 0.13 : 0.09;
    const wd = o.yarn ? (s) => sw * lerp(1, taper, Math.pow(s, 0.8)) * (1 + 0.1 * Math.pow(1 - s, 5)) : (s) => sw * (capMin + (1 - capMin) * Math.pow(1 - s, pw)) * (1 + 0.12 * Math.pow(1 - s, 5));
    const left = [], right = [];
    for (let i = 0; i <= N; i++) {
      const s = (i / N) * 0.985, tx = 4 * sag * (1 - 2 * s), ty = -sh, tl = Math.hypot(tx, ty), nx = -ty / tl, ny = tx / tl, h = wd(s) / 2;
      left.push([cx(s) - nx * h, cy(s) - ny * h]); right.push([cx(s) + nx * h, cy(s) + ny * h]);
    }
    const tipS = 0.985, tr = wd(tipS) / 2, tcx = cx(tipS), tcy = cy(tipS);
    const path = () => {
      g.beginPath(); g.moveTo(left[0][0], left[0][1]);
      for (let i = 1; i < left.length; i++) g.lineTo(left[i][0], left[i][1]);
      const a0 = Math.atan2(left[N][1] - tcy, left[N][0] - tcx), a1 = Math.atan2(right[N][1] - tcy, right[N][0] - tcx);
      g.arc(tcx, tcy, tr, a0, a1, false);
      for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
      g.quadraticCurveTo(cx(0), sh + sw * 0.07, left[0][0], left[0][1]); g.closePath();
    };
    const span = sw / 2 + Math.abs(sag) + 2;
    path(); g.save(); g.clip();
    let lg = g.createLinearGradient(-sw / 2 + Math.min(0, sag), 0, sw / 2 + Math.max(0, sag), 0);
    lg.addColorStop(0, col.light); lg.addColorStop(0.3, col.mid); lg.addColorStop(0.72, col.dark); lg.addColorStop(1, col.dark2 || col.dark);
    g.fillStyle = lg; g.fillRect(-span, -pad, span * 2, sh + 2 * pad);
    if (o.yarn) {   // twisted yarn: diagonal plies following the strand
      for (let i = 0; i < N; i += 1) {
        const s = i / N; if ((i % 3) !== 0) continue;
        const x = cx(s), y = cy(s), h = wd(s) / 2;
        g.strokeStyle = col.ply || 'rgba(0,0,0,0.2)'; g.lineWidth = sw * 0.08; g.beginPath(); g.moveTo(x - h - 2, y + h * 0.9); g.lineTo(x + h + 2, y - h * 0.9); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = sw * 0.05; g.beginPath(); g.moveTo(x - h - 2, y + h * 0.9 - sw * 0.12); g.lineTo(x + h + 2, y - h * 0.9 - sw * 0.12); g.stroke();
      }
    }
    lg = g.createLinearGradient(0, 0, 0, sh * 0.5); lg.addColorStop(0, col.tip); lg.addColorStop(1, rgba(col.tip, 0));
    g.globalAlpha = col.tipA ?? 0.55; g.fillStyle = lg; g.fillRect(-span, -pad, span * 2, sh * 0.5 + pad); g.globalAlpha = 1;
    lg = g.createLinearGradient(0, sh, 0, sh * (aspect < 2 ? 0.35 : 0.45)); lg.addColorStop(0, rgba(col.ao, 0.95)); lg.addColorStop(0.5, rgba(col.ao, 0.4)); lg.addColorStop(1, rgba(col.ao, 0));
    g.fillStyle = lg; g.fillRect(-span, 0, span * 2, sh + pad);
    // rim light on the right edge only, strongest near the tip
    const rg = g.createLinearGradient(0, 0, 0, sh); rg.addColorStop(0, rgba(col.rim, 0)); rg.addColorStop(0.12, rgba(col.rim, 0)); rg.addColorStop(0.3, rgba(col.rim, 0.42)); rg.addColorStop(0.7, rgba(col.rim, 0.16)); rg.addColorStop(1, rgba(col.rim, 0));
    g.strokeStyle = rg; g.lineWidth = sw * 0.07; g.lineJoin = 'round';
    g.beginPath(); for (let i = 0; i < right.length; i++) { const [x, y] = right[i]; i ? g.lineTo(x - sw * 0.02, y) : g.moveTo(x - sw * 0.02, y); } g.stroke();
    // specular streak near the tip, left of the centreline
    const s0 = 0.78, sx = cx(s0) - wd(s0) * 0.18, sy = cy(s0);
    g.save(); g.translate(sx, sy); g.rotate(Math.atan2(4 * sag * (1 - 2 * s0), sh)); g.scale(wd(s0) * 0.16, Math.max(wd(s0) * 0.3, sh * 0.14));
    const sg = g.createRadialGradient(0, 0, 0, 0, 0, 1); sg.addColorStop(0, `rgba(255,255,255,${col.spec ?? 0.55})`); sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
    g.restore();
    if (o.fuzz) {  // loose fibres on the yarn edges
      const R = api.rand('fuzz' + sw + aspect + (o.seed || 0)); g.strokeStyle = rgba(col.light, 0.45); g.lineWidth = 1.1;
      for (let i = 0; i < 30; i++) { const k = Math.floor(R() * N), side = R() < 0.5 ? left : right, [x, y] = side[k], dir = side === left ? -1 : 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dir * (2 + R() * 5), y - 2 - R() * 6); g.stroke(); }
    }
    return { cv, sw, sh, pad, ax: pad + sw / 2, ay: pad + sh };
  }
  function dotSprite(sw, col) {
    const pad = 4, cv = mk(sw + pad * 2, sw + pad * 2), g = cv.getContext('2d'), r = sw / 2, c = pad + r;
    let rg = g.createRadialGradient(c + r * 0.15, c + r * 0.2, r * 0.2, c + r * 0.1, c + r * 0.15, r); rg.addColorStop(0, rgba(col.ao, 0.45)); rg.addColorStop(1, rgba(col.ao, 0));
    g.fillStyle = rg; g.beginPath(); g.arc(c + r * 0.1, c + r * 0.15, r, 0, TAU); g.fill();
    rg = g.createRadialGradient(c - r * 0.25, c - r * 0.3, r * 0.05, c, c, r * 0.78); rg.addColorStop(0, rgba(col.light, 0.95)); rg.addColorStop(0.55, rgba(col.mid, 0.9)); rg.addColorStop(1, rgba(col.mid, 0));
    g.fillStyle = rg; g.beginPath(); g.arc(c, c, r * 0.8, 0, TAU); g.fill();
    return { cv, sw, sh: sw, pad, ax: c, ay: c };
  }
  function blurred(sp, px) {
    const p2 = sp.pad + px * 2, cv = mk(sp.cv.width + px * 4, sp.cv.height + px * 4), g = cv.getContext('2d'); g.filter = `blur(${px}px)`; g.drawImage(sp.cv, px * 2, px * 2);
    return { cv, sw: sp.sw, sh: sp.sh, pad: p2, ax: sp.ax + px * 2, ay: sp.ay + px * 2 };
  }
  // o: { sw, aspects, colors: [col...], bends: [...rad], blurs: [px...], yarn, fuzz, fog }
  function sprites(api, o) {
    const S = { aspects: o.aspects || [1.3, 2.6, 5, 8.5, 12], bends: o.bends || [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42], set: [], blur: [], blurs: o.blurs || [4, 10], fog: o.fog };
    const sw = o.sw || 64;
    for (let a = 0; a < S.aspects.length; a++) {
      S.set.push([]); S.blur.push([]);
      for (let c = 0; c < o.colors.length; c++) {
        const byBend = [];
        for (const b of S.bends) byBend.push(a < 1 && b !== 0 ? null : strandSprite(api, sw, S.aspects[a], o.colors[c], { yarn: o.yarn, fuzz: o.fuzz, bend: b, seed: c, taper: o.taper }));
        const mid = S.bends.indexOf(0);
        for (let k = 0; k < byBend.length; k++) if (!byBend[k]) byBend[k] = byBend[mid];
        S.set[a].push(byBend);
        S.blur[a].push(S.blurs.map((px) => blurred(byBend[mid], px)));
      }
    }
    S.dot = o.colors.map((c) => dotSprite(sw, c));
    S.nColors = o.colors.length; S.bendMid = S.bends.indexOf(0); S.bendStep = S.bends[S.bendMid + 1] - S.bends[S.bendMid];
    return S;
  }
  // jittered-grid field of strands. o: { seed, x0, x1, z0, z1, spacing, height(x,z,r), width(x,z,r), ground(x,z), nColors, keep(x,z,r) }
  function field(api, o) {
    const R = api.rand('pile-' + (o.seed || 1)), sp = o.spacing || 0.6;
    const xs = [], zs = [], hs = [], ws = [], ys = [], ph = [], cs = [], rs = [];
    let row = 0;
    for (let z = o.z0; z < o.z1; z += sp * 0.866, row++) for (let x = o.x0 + (row % 2) * sp * 0.5; x < o.x1; x += sp) {
      const jx = x + (R() - 0.5) * sp * 1.1, jz = z + (R() - 0.5) * sp * 1.1, r = R();
      if (o.keep && !o.keep(jx, jz, r)) continue;
      xs.push(jx); zs.push(jz); rs.push(r); hs.push(o.height(jx, jz, r)); ws.push(o.width(jx, jz, r)); ys.push(o.ground ? o.ground(jx, jz) : 0);
      ph.push(R() * TAU); cs.push(Math.floor(R() * (o.nColors || 2)));
    }
    const n = xs.length;
    return { n, x: Float32Array.from(xs), z: Float32Array.from(zs), h: Float32Array.from(hs), w: Float32Array.from(ws), y: Float32Array.from(ys), ph: Float32Array.from(ph), c: Uint8Array.from(cs), r: Float32Array.from(rs),
      vis: new Int32Array(n), hr: new Float32Array(n), dep: new Float32Array(n), bx: new Float32Array(n), by: new Float32Array(n), tx: new Float32Array(n), ty: new Float32Array(n), wp: new Float32Array(n), bi: new Int8Array(n) };
  }
  function makeCam(c) { return { ...c, cp: Math.cos(c.pitch), sp: Math.sin(c.pitch) }; }
  function project(cam, x, y, z) {
    const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z, d = dz * cam.cp - dy * cam.sp, v = dy * cam.cp + dz * cam.sp;
    return [cam.cx + (cam.f * dx) / d, cam.cy - (cam.f * v) / d, d];
  }
  function horizonY(cam) { return cam.cy - cam.f * Math.tan(cam.pitch); }
  function fogAt(o, d) { return (o.fogMax ?? 0.9) * sstep(o.fogNear, o.fogFar, d); }
  // ground plane + sky; o: { clip:[x,y,w,h], ground: near colour, fog, sky: [top, horizon], fogNear, fogFar, fogMax, glow:{h,a}, groundY }
  function backdrop(ctx, cam, o) {
    const [X, Y, Wc, Hc] = o.clip || [0, 0, 1920, 1080];
    const hy = horizonY(cam);
    if (hy > Y) {
      const lg = ctx.createLinearGradient(0, Y, 0, hy);
      lg.addColorStop(0, o.sky[0]); lg.addColorStop(1, o.sky[1]);
      ctx.fillStyle = lg; ctx.fillRect(X, Y, Wc, Math.min(Hc, hy - Y) + 2);
    }
    if (hy < Y + Hc) {
      const y0 = Math.max(Y, hy), gl = ctx.createLinearGradient(0, y0, 0, Y + Hc); let last = -1;
      for (let k = 0; k <= 20; k++) {
        const yy = lerp(y0, Y + Hc, Math.pow(k / 20, 1.6));
        const sv = (cam.cy - yy) / cam.f, dy = (o.groundY || 0) - cam.y, den = cam.sp - sv * cam.cp;
        let d = 1e4; if (Math.abs(den) > 1e-6) { const dz = (dy * (sv * cam.sp + cam.cp)) / -den; d = dz * cam.cp - dy * cam.sp; if (d < 0) d = 1e4; }
        const f = fogAt(o, d), col = mixRgb(o.ground, o.fog, f);
        const pos = clamp((yy - y0) / Math.max(1, Y + Hc - y0)); if (pos <= last) continue; last = pos;
        gl.addColorStop(pos, rgba(col));
      }
      ctx.fillStyle = gl; ctx.fillRect(X, y0, Wc, Y + Hc - y0);
    }
    if (o.glow) {  // haze along the horizon
      const gg = ctx.createLinearGradient(0, hy - o.glow.h, 0, hy + o.glow.h * 0.7);
      gg.addColorStop(0, rgba(o.fog, 0)); gg.addColorStop(0.6, rgba(o.fog, o.glow.a)); gg.addColorStop(1, rgba(o.fog, 0));
      ctx.fillStyle = gg; ctx.fillRect(X, hy - o.glow.h, Wc, o.glow.h * 1.7);
    }
  }
  // Draw the strands into an offscreen layer, far to near; depth fog is applied in bands with 'source-atop' fills so
  // every strand is fogged by exactly fogAt(depth) (quantised to 1/bands), and the layer is composited onto ctx.
  // o: { t, rise(i,x,z,r,d) -> 0..1, sway(x,z,ph,t,h) -> [ax, az], near, far, fog, fogNear, fogFar, fogMax, bands,
  //      blurNear: [dBlur2, dBlur1], nearFade, clip:[x,y,w,h], extras: [{x,y,z, draw(g, sx, sy, k, d)}], lod(d, r) -> bool }
  function render(ctx, F, S, cam, o) {
    const n = F.n, near = o.near ?? 1.2, far = o.far ?? 60, cp = cam.cp, sp = cam.sp, f = cam.f;
    const [CX, CY, CW, CH] = o.clip || [0, 0, 1920, 1080];
    let m = 0;
    for (let i = 0; i < n; i++) {
      const x = F.x[i], z = F.z[i], yb = F.y[i];
      const dx = x - cam.x, dyb = yb - cam.y, dz = z - cam.z;
      const d = dz * cp - dyb * sp; if (d < near || d > far) continue;
      if (o.lod && !o.lod(d, F.r[i])) continue;
      const wp = (f * F.w[i]) / d * (o.lodWiden ? o.lodWiden(d) : 1);
      const bx = cam.cx + (f * dx) / d;
      if (bx < CX - wp * 3 - 260 || bx > CX + CW + wp * 3 + 260) continue;
      const by = cam.cy - (f * (dyb * cp + dz * sp)) / d;
      let h = F.h[i]; if (o.rise) h *= o.rise(i, x, z, F.r[i], d);
      if (h < 0.003) continue;
      let ax = 0, az = 0; if (o.sway) { const s = o.sway(x, z, F.ph[i], o.t, h); ax = s[0]; az = s[1]; }
      const txw = x + Math.sin(ax) * h, tyw = yb + Math.cos(ax) * Math.cos(az) * h, tzw = z + Math.sin(az) * h;
      const tdx = txw - cam.x, tdy = tyw - cam.y, tdz = tzw - cam.z, td = Math.max(0.05, tdz * cp - tdy * sp);
      const tx = cam.cx + (f * tdx) / td, ty = cam.cy - (f * (tdy * cp + tdz * sp)) / td;
      if (Math.max(by, ty) < CY - wp || Math.min(by, ty) > CY + CH + wp * 2) continue;
      // bend: angle between the projected local vertical at the base and the chord
      let bi = S.bendMid;
      if (h / F.w[i] > 3) {
        const vdx = 0, vdy = 0.2, vd = (dz) * cp - (dyb + vdy) * sp;
        const vx = cam.cx + (f * dx) / vd - bx, vy = cam.cy - (f * ((dyb + vdy) * cp + dz * sp)) / vd - by;
        const aV = Math.atan2(vx, -vy), aC = Math.atan2(tx - bx, -(ty - by));
        let dA = aV - aC; if (dA > Math.PI) dA -= TAU; if (dA < -Math.PI) dA += TAU;
        bi = Math.max(0, Math.min(S.bends.length - 1, S.bendMid + Math.round(dA / S.bendStep)));
      }
      F.vis[m] = i; F.hr[i] = h; F.dep[i] = d; F.bx[i] = bx; F.by[i] = by; F.tx[i] = tx; F.ty[i] = ty; F.wp[i] = wp; F.bi[i] = bi; m++;
    }
    const extras = o.extras || [], ne = extras.length;
    const order = new Array(m + ne);
    for (let k = 0; k < m; k++) order[k] = F.vis[k];
    const edep = new Float32Array(ne);
    for (let e = 0; e < ne; e++) { const ex = extras[e]; const p = project(cam, ex.x, ex.y, ex.z); ex._sx = p[0]; ex._sy = p[1]; ex._d = p[2]; edep[e] = p[2]; order[m + e] = n + e; }
    const depOf = (k) => (k < n ? F.dep[k] : edep[k - n]);
    order.sort((a, b) => depOf(b) - depOf(a));
    // layer
    const cw = ctx.canvas.width, chh = ctx.canvas.height;
    if (!S.layer || S.layer.width !== cw || S.layer.height !== chh) { S.layer = mk(cw, chh); S.lg = S.layer.getContext('2d'); }
    const g = S.lg, M = ctx.getTransform(), A = M.a, B = M.b, C = M.c, D = M.d, E = M.e, Fm = M.f;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.clearRect(0, 0, cw, chh);
    g.save();
    if (o.clip) { g.setTransform(A, B, C, D, E, Fm); g.beginPath(); g.rect(CX, CY, CW, CH); g.clip(); }
    // fog bands
    const NB = o.bands || 24, fN = o.fogNear, fF = o.fogFar, rep = [], alpha = [];
    for (let k = 0; k <= NB; k++) rep.push(k < NB ? lerp(fF, fN, (k + 0.5) / NB) : fN);
    const Fr = rep.map((d) => fogAt(o, d)); Fr[NB] = 0;
    for (let k = 0; k < NB; k++) alpha.push(clamp(1 - (1 - Fr[k]) / Math.max(1e-4, 1 - Fr[k + 1])));
    const bound = (k) => lerp(fF, fN, (k + 1) / NB);  // near edge of band k
    const fogCol = hexRgb(o.fog || S.fog || '#000000');
    let cb = 0;
    const fill = (k) => { if (alpha[k] <= 0.002) return; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 1; g.fillStyle = rgba(fogCol, alpha[k]); g.fillRect(0, 0, cw, chh); g.restore(); };
    const nA = S.aspects.length;
    for (let k = 0; k < order.length; k++) {
      const i = order[k], d = depOf(i);
      while (cb < NB && d < bound(cb)) { fill(cb); cb++; }
      if (i >= n) {
        const ex = extras[i - n]; if (ex._d < near * 0.5) continue;
        g.setTransform(A, B, C, D, E, Fm); g.globalAlpha = 1;
        ex.draw(g, ex._sx, ex._sy, f / ex._d, ex._d); continue;
      }
      const bx = F.bx[i], by = F.by[i], vx = F.tx[i] - bx, vy = F.ty[i] - by, wp = F.wp[i];
      let len = Math.hypot(vx, vy); const sn = len > 1e-3 ? vx / len : 0, cs = len > 1e-3 ? -vy / len : 1;
      if (len < wp * 0.5) len = wp * 0.5;
      const ar = F.hr[i] / F.w[i];
      let ai = 0; while (ai < nA - 1 && ar > (S.aspects[ai] + S.aspects[ai + 1]) / 2) ai++;
      let spr;
      const nf = o.nearFade ? clamp((d - near) / o.nearFade) : 1, q = len / Math.max(1e-3, wp), dotA = 1 - sstep(0.95, 1.7, q);
      if (dotA > 0.01 && !(o.blurNear && d < o.blurNear[1])) {   // seen end-on: a soft round bump, cross-faded with the cone
        const ds = S.dot[F.c[i]], k2 = (wp * 1.1) / ds.sw, mx = bx + vx * 0.45, my = by + vy * 0.45;
        g.setTransform(A * k2, B * k2, C * k2, D * k2, A * mx + C * my + E, B * mx + D * my + Fm); g.globalAlpha = nf * dotA * (o.dotAlpha ?? 1);
        g.drawImage(ds.cv, -ds.ax, -ds.ay); if (dotA > 0.99) continue;
      }
      if (o.blurNear && d < o.blurNear[1]) spr = S.blur[ai][F.c[i]][d < o.blurNear[0] ? 1 : 0];
      else spr = S.set[ai][F.c[i]][F.bi[i]];
      const kx = wp / spr.sw, ky = len / spr.sh;
      const l0 = cs * kx, l1 = sn * kx, l2 = -sn * ky, l3 = cs * ky;
      g.setTransform(A * l0 + C * l1, B * l0 + D * l1, A * l2 + C * l3, B * l2 + D * l3, A * bx + C * by + E, B * bx + D * by + Fm);
      g.globalAlpha = nf * (dotA > 0.01 && !(o.blurNear && d < o.blurNear[1]) ? 1 - dotA : 1);
      g.drawImage(spr.cv, -spr.ax, -spr.ay);
    }
    while (cb < NB) { fill(cb); cb++; }
    g.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = o.alpha ?? 1; ctx.drawImage(S.layer, 0, 0); ctx.restore();
    return m;
  }
  window.PILE = { sprites, field, render, backdrop, makeCam, project, horizonY, fogAt, strandSprite };
})();

// =============================================================== TFX: small shared props and effects ==============
(function () {
  const TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const TFX = {};
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  TFX.rr = rr;
  // forearm + palm-up hand seen from above, lying horizontally, wrist crease at (0,0), fingers to the left
  TFX.arm = function (ctx, x, y, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); const s = o.s || 1; ctx.scale(s, s);
    const skin = (y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#f7d2b4'); g.addColorStop(0.35, '#eab28d'); g.addColorStop(0.8, '#cf8f6b'); g.addColorStop(1, '#a9694d'); return g; };
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 22;
    ctx.fillStyle = skin(-92, 92); ctx.beginPath();
    ctx.moveTo(-30, -70); ctx.bezierCurveTo(200, -78, 600, -96, 1200, -104); ctx.lineTo(1200, 104); ctx.bezierCurveTo(600, 96, 200, 78, -30, 70); ctx.closePath(); ctx.fill();
    ctx.fillStyle = skin(-80, 80); ctx.beginPath();
    ctx.moveTo(-10, -66); ctx.bezierCurveTo(-60, -80, -150, -84, -196, -66); ctx.bezierCurveTo(-214, -30, -214, 30, -196, 66); ctx.bezierCurveTo(-150, 82, -60, 80, -10, 66); ctx.closePath(); ctx.fill();
    const finger = (y0, len, w, ang) => {
      ctx.save(); ctx.translate(-192, y0); ctx.rotate(Math.PI + ang); ctx.fillStyle = skin(-w, w); rr(ctx, -6, -w / 2, len, w, w / 2); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(150,90,65,0.45)'; ctx.lineWidth = 2;
      for (const k of [0.42, 0.72]) { ctx.beginPath(); ctx.moveTo(len * k, -w * 0.3); ctx.lineTo(len * k, w * 0.3); ctx.stroke(); }
      ctx.restore();
    };
    finger(-48, 138, 33, 0.1); finger(-15, 156, 34, 0.02); finger(18, 150, 33, -0.04); finger(49, 118, 30, -0.12);
    ctx.save(); ctx.translate(-70, -64); ctx.rotate(-2.35); ctx.fillStyle = skin(-18, 18); rr(ctx, -10, -19, 132, 38, 19); ctx.fill(); ctx.restore();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(150,90,65,0.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-40, -40); ctx.bezierCurveTo(-90, -20, -130, -30, -175, -44); ctx.moveTo(-30, 10); ctx.bezierCurveTo(-90, 20, -140, 12, -180, 0); ctx.moveTo(-60, 52); ctx.bezierCurveTo(-90, 10, -80, -20, -50, -50); ctx.stroke();
    ctx.lineWidth = 3.5; for (const dx of [-4, 14]) { ctx.beginPath(); ctx.moveTo(dx, -54); ctx.quadraticCurveTo(dx - 7, 0, dx, 54); ctx.stroke(); }
    ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff0e2'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(1100, -70); ctx.bezierCurveTo(600, -64, 200, -54, 30, -46); ctx.stroke(); ctx.globalAlpha = 1;
    if (o.wet > 0) {
      const rg = ctx.createRadialGradient(0, -30, 4, 0, -30, 90); rg.addColorStop(0, `rgba(170,225,255,${0.7 * o.wet})`); rg.addColorStop(1, 'rgba(170,225,255,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(0, -26, 90, 44, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.7 * o.wet})`; ctx.beginPath(); ctx.ellipse(-22, -40, 20, 5, -0.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(24, -16, 9, 3, -0.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };
  // the roof of the mouth seen from below: a soft lavender arch with rugae, fading toward the back
  TFX.palate = function (ctx, x, y, a, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= a; const w = o.w || 300, h = o.h || 360;
    ctx.beginPath(); ctx.moveTo(-w, -h * 0.6); ctx.bezierCurveTo(-w * 1.02, h * 0.45, -w * 0.5, h * 0.62, 0, h * 0.62); ctx.bezierCurveTo(w * 0.5, h * 0.62, w * 1.02, h * 0.45, w, -h * 0.6); ctx.closePath();
    const g = ctx.createRadialGradient(0, h * 0.45, 20, 0, h * 0.3, w * 1.05); g.addColorStop(0, 'rgba(196,178,255,0.28)'); g.addColorStop(0.6, 'rgba(150,120,255,0.14)'); g.addColorStop(1, 'rgba(124,92,255,0)');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(240,234,255,0.8)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(200,180,255,0.9)'; ctx.shadowBlur = 14;
    for (let k = 0; k < 4; k++) { const yy = h * (0.42 - k * 0.2), ww = 170 - k * 14; ctx.globalAlpha = 0.65 - k * 0.14; ctx.beginPath(); ctx.moveTo(-ww, yy + 12); ctx.bezierCurveTo(-ww * 0.5, yy - 18, -24, yy + 14, 0, yy - 6); ctx.bezierCurveTo(24, yy + 14, ww * 0.5, yy - 18, ww, yy + 12); ctx.stroke(); }
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(0, -h * 0.4); ctx.stroke();
    ctx.restore();
    ctx.setLineDash([16, 12]); ctx.strokeStyle = 'rgba(217,204,255,0.85)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-w, -h * 0.1); ctx.bezierCurveTo(-w * 1.0, h * 0.48, -w * 0.5, h * 0.62, 0, h * 0.62); ctx.bezierCurveTo(w * 0.5, h * 0.62, w * 1.0, h * 0.48, w, -h * 0.1); ctx.stroke();
    ctx.restore();
  };
  // saliva sloshing in from both edges over the front of the tongue; g is in local tongue units (TONGUE.draw `over`)
  TFX.salivaWash = function (g, t, a, o = {}) {
    const TG = window.TONGUE, vMax = o.vMax ?? 0.4, vMin = o.vMin ?? 0.0;
    g.save(); TG.path(g); g.clip();
    for (const side of [-1, 1]) {
      const cover = (v) => clamp(0.32 + 0.26 * Math.sin(t * 2.1 + side * 1.3 + v * 7) + 0.12 * Math.sin(t * 3.7 + v * 13 + side), 0.05, 0.95) * a;
      const pts = [];
      for (let k = 0; k <= 40; k++) { const v = lerp(vMin, vMax, k / 40), w = TG.hw(Math.max(0.004, v)); pts.push([side * w * (1 - cover(v) * 1.1), TG.L / 2 - v * TG.L]); }
      g.beginPath(); g.moveTo(side * 420, TG.L / 2 - vMin * TG.L + 20); pts.forEach((p) => g.lineTo(p[0], p[1])); g.lineTo(side * 420, TG.L / 2 - vMax * TG.L); g.closePath();
      const yb = TG.L / 2 - vMax * TG.L, gr = g.createLinearGradient(0, yb, 0, yb + 110); gr.addColorStop(0, 'rgba(143,216,255,0)'); gr.addColorStop(1, 'rgba(143,216,255,0.36)');
      g.fillStyle = gr; g.fill();
      if (o.glossy) {   // a liquid film: cool tint, a bright meniscus band just inside the front, specular glints
        g.save(); g.clip(); g.globalCompositeOperation = 'screen';
        const cg = g.createLinearGradient(side * 300, 0, 0, 0); cg.addColorStop(0, 'rgba(90,170,240,0.35)'); cg.addColorStop(1, 'rgba(90,170,240,0.08)'); g.fillStyle = cg; g.fillRect(-420, -500, 840, 1000);
        g.lineJoin = 'round'; g.lineCap = 'round';
        g.strokeStyle = 'rgba(200,240,255,0.55)'; g.lineWidth = 16; g.filter = 'blur(4px)'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0] + side * 12, p[1]) : g.moveTo(p[0] + side * 12, p[1]))); g.stroke(); g.filter = 'none';
        for (let k = 0; k < 14; k++) { const q = pts[(k * 3 + 2) % pts.length], gx = q[0] + side * (18 + (k % 4) * 14), gy = q[1] + ((k * 13) % 20) - 10, rr = 2 + (k % 3) * 1.5; const sg = g.createRadialGradient(gx, gy, 0, gx, gy, rr * 3); sg.addColorStop(0, 'rgba(255,255,255,0.95)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillRect(gx - rr * 3, gy - rr * 3, rr * 6, rr * 6); }
        g.restore();
      }
      g.strokeStyle = 'rgba(215,242,255,0.85)'; g.lineWidth = 3.5; g.lineJoin = 'round';
      g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      g.strokeStyle = 'rgba(230,248,255,0.55)'; g.lineWidth = 2.5; g.lineCap = 'round';
      for (let k = 0; k < 7; k++) {
        const v = lerp(vMin + 0.03, vMax - 0.04, (k + 0.5) / 7), w = TG.hw(v), c = cover(v), ph = (t * 0.8 + k * 0.37) % 1;
        const x0 = side * w * (1 - c * 1.05 * ph), x1 = side * w * (1 - c * 1.05 * Math.min(1, ph + 0.35)), y = TG.L / 2 - v * TG.L;
        g.globalAlpha = Math.sin(Math.PI * ph); g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y + 3); g.stroke();
      }
      g.globalAlpha = 1;
      for (let k = 0; k < 9; k++) {
        const v = lerp(vMin + 0.04, vMax - 0.05, ((k * 0.618) % 1)), w = TG.hw(v), c = cover(v), u = side * (1 - c * (0.25 + 0.7 * ((k * 0.37) % 1))), y = TG.L / 2 - v * TG.L - ((t * 18 + k * 11) % 24), r = 2.5 + (k % 3) * 1.6;
        g.strokeStyle = 'rgba(225,246,255,0.8)'; g.lineWidth = 1.6; g.beginPath(); g.arc(u * w, y, r, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(u * w - r * 0.35, y - r * 0.35, r * 0.3, 0, TAU); g.fill();
      }
    }
    g.restore();
  };
  // a four-point sparkle
  TFX.sparkle = function (ctx, x, y, r, a = 1, color = '#ffffff') {
    if (a <= 0 || r <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.translate(x, y);
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const ang = (i * Math.PI) / 4, q = i % 2 ? r * 0.22 : r; ctx.lineTo(Math.cos(ang - Math.PI / 2) * q, Math.sin(ang - Math.PI / 2) * q); } ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  // a yellow-green smell puff that rises and fades (p: 0..1 life)
  TFX.stink = function (ctx, api, x, y, s, p, seed = 1) {
    if (p <= 0 || p >= 1) return;
    const a = Math.sin(Math.PI * p) * 0.75, yy = y - p * s * 2.2, xx = x + Math.sin(p * 5 + seed) * s * 0.25;
    api.icons.puff(ctx, xx, yy, s * (0.7 + p * 0.6), a, '#b9e35a');
    ctx.save(); ctx.globalAlpha *= a * 0.9; ctx.strokeStyle = '#d4f07a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); for (let i = 0; i <= 10; i++) { const q = i / 10, px = xx + k * s * 0.32 + Math.sin(q * 6 + p * 8 + k) * s * 0.07, py = yy + s * 0.3 - q * s * 0.8; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
    ctx.restore();
  };
  window.TFX = TFX;
})();

// =============================================================== TOOLS: toothbrush and U-shaped tongue scraper =====
(function () {
  const TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const rr = (ctx, x, y, w, h, r) => window.TFX.rr(ctx, x, y, w, h, r);
  // generic manual toothbrush seen from above, head centred at (0,0), handle running along +x; s = scale
  window.TFX.toothbrush = function (ctx, x, y, rot, s = 1, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 14;
    // handle
    let g = ctx.createLinearGradient(0, -26, 0, 26); g.addColorStop(0, '#c9b8ff'); g.addColorStop(0.5, '#8f73f0'); g.addColorStop(1, '#5a40c0');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(60, -16); ctx.bezierCurveTo(160, -18, 220, -30, 700, -34); ctx.lineTo(700, 34); ctx.bezierCurveTo(220, 30, 160, 18, 60, 16); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(215,243,74,0.9)'; rr(ctx, 300, -22, 180, 44, 22); ctx.fill();   // grip
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, 90, -10, 560, 6, 3); ctx.fill();
    // head
    g = ctx.createLinearGradient(0, -34, 0, 34); g.addColorStop(0, '#b9a6ff'); g.addColorStop(1, '#6a50d8');
    ctx.fillStyle = g; rr(ctx, -95, -34, 170, 68, 30); ctx.fill();
    // bristle tufts (seen from above through/over the head)
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) {
      const bx = -80 + i * 18, by = -20 + j * 20, wig = o.wiggle ? Math.sin(o.wiggle * 30 + i + j) * 1.5 : 0;
      const bg = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 9); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, j === 1 ? '#bfe8ff' : '#e7f7ff');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx + wig, by, 8, 0, TAU); ctx.fill();
    }
    if (o.gunk > 0) { ctx.globalAlpha = clamp(o.gunk); ctx.fillStyle = o.gunkColor || 'rgba(240,232,205,0.9)'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(-70 + i * 24, -8 + (i % 3) * 10, 12, 7, 0.3, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    ctx.restore();
  };
  // U-shaped metal tongue scraper, top view. The blade is an arc across (x from -w to +w) at (0,0), bulging toward -y
  // (the back of the tongue); the two arms run toward +y (out of the mouth) and converge to the grips.
  window.TFX.scraper = function (ctx, x, y, s = 1, o = {}) {
    const w = o.w || 170, bow = o.bow ?? 26, armLen = o.armLen || 760;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
    const blade = (k) => { const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24 * 2 - 1; pts.push([u * w * k, -bow * (1 - u * u) * k]); } return pts; };
    const outer = blade(1);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 16;
    const steel = ctx.createLinearGradient(-w, -40, w, 40); steel.addColorStop(0, '#f5f7fb'); steel.addColorStop(0.45, '#aeb6c4'); steel.addColorStop(0.7, '#e8ecf3'); steel.addColorStop(1, '#8e97a8');
    ctx.strokeStyle = steel; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.moveTo(-w * 0.72, armLen); ctx.bezierCurveTo(-w * 0.9, armLen * 0.45, -w * 1.05, 60, outer[0][0], outer[0][1]);
    outer.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.bezierCurveTo(w * 1.05, 60, w * 0.9, armLen * 0.45, w * 0.72, armLen); ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 5; ctx.beginPath(); outer.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] - 5) : ctx.moveTo(p[0], p[1] - 5))); ctx.stroke();
    // grips
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * w * 0.72, armLen - 40); const gg = ctx.createLinearGradient(-20, 0, 20, 0); gg.addColorStop(0, '#e9ff8a'); gg.addColorStop(1, '#9fbf1f'); ctx.fillStyle = gg; rr(ctx, -20, -130, 40, 200, 20); ctx.fill(); ctx.restore(); }
    // gunk collected on the leading (tip-side) edge of the blade
    if (o.gunk > 0) {
      ctx.fillStyle = o.gunkColor || '#efe6c8'; ctx.globalAlpha = clamp(o.gunk * 1.5);
      ctx.beginPath(); outer.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + 10) : ctx.moveTo(p[0], p[1] + 10)));
      for (let i = outer.length - 1; i >= 0; i--) { const p = outer[i], u = i / 24 * 2 - 1; ctx.lineTo(p[0], p[1] + 10 + (10 + 14 * Math.abs(Math.sin(i * 1.7))) * o.gunk * (1 - 0.6 * u * u)); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-w * 0.3, 18 + 6 * o.gunk, 20, 4, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return outer;
  };
  // local-tongue polygon swept by the scraper blade moving from (x, yFrom) to (x, yTo) (both in tongue-local units)
  window.TFX.scraperSweep = function (g, x, yFrom, yTo, w = 170, bow = 26) {
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24 * 2 - 1; pts.push([x + u * w, -bow * (1 - u * u)]); }
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + yFrom) : g.moveTo(p[0], p[1] + yFrom)));
    for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0], pts[i][1] + yTo);
    g.closePath(); g.fill();
  };
  // a lime check mark in a circle
  window.TFX.checkBadge = function (ctx, api, x, y, r, p) {
    if (p <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(p, p);
    ctx.fillStyle = 'rgba(11,10,24,0.8)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#d7f34a'; ctx.lineWidth = 4; ctx.stroke();
    api.doodle.check(ctx, 0, 2, r * 0.5, clamp(p), { color: '#d7f34a', width: 8, seed: 5, passes: 1 });
    ctx.restore();
  };
})();

// =============================================================== CUT: keep every cue on its word in the current cut =
// TONGUE.cut(id) reads scenes/tongue/cues.json and edit/cut-words.json (synchronously, at scene load, so the scene's
// duration can follow the cut too) and returns { duration, warp(t), end }. warp maps current scene time to the design
// time the animation was authored for (piecewise linear through the word anchors, slope 1 outside them).
(function () {
  const get = (url) => { const x = new XMLHttpRequest(); x.open('GET', url + '?v=' + Math.floor(performance.timeOrigin), false); x.send(); if (x.status !== 200) throw new Error(url + ' ' + x.status); return JSON.parse(x.responseText); };
  let WORDS = null, CUES = null;
  window.TONGUE.cut = function (id, fallbackDuration) {
    try {
      CUES = CUES || get('/videos/bad-breath-for-good/scenes/tongue/cues.json');
      if (!WORDS) { WORDS = new Map(); for (const w of get('/videos/bad-breath-for-good/edit/cut-words.json').words) WORDS.set(w.i, w); }
    } catch (e) { console.warn('TONGUE.cut: ' + e.message + ' (using design timing)'); return { duration: fallbackDuration, warp: (t) => t, pairs: [] }; }
    const c = CUES[id], W = (i) => WORDS.get(i);
    const t0 = W(c.first).t - 0.15;
    const at = (w, off = 0, edge) => { const x = W(w); if (!x) return null; return (edge === 'end' ? x.end : x.t) + off - t0; };
    const raw = [[0, 0]];
    for (const [w, d, off, edge] of c.anchors) { const cur = at(w, off || 0, edge); if (cur != null) raw.push([cur, d]); }
    raw.sort((a, b) => a[1] - b[1]);
    const pairs = [];   // strictly increasing in both
    for (const p of raw) { const q = pairs[pairs.length - 1]; if (!q || (p[0] > q[0] + 0.02 && p[1] > q[1] + 0.02)) pairs.push(p); }
    const end = at(c.end.word, c.end.offset || 0, c.end.edge);
    const lastEnd = W(c.last).end - t0;
    const duration = Math.ceil((Math.max(end + 0.3, lastEnd + 0.4) + 0.5) * 100) / 100;
    const base = (t) => {
      if (t <= pairs[0][0]) return t;
      for (let k = 1; k < pairs.length; k++) if (t <= pairs[k][0]) { const [a0, b0] = pairs[k - 1], [a1, b1] = pairs[k]; return b0 + ((t - a0) * (b1 - b0)) / (a1 - a0); }
      const [a, b] = pairs[pairs.length - 1]; return b + (t - a);
    };
    // whisper word edges jitter by a few tenths: smooth the warp (triangular window, +-0.35 s) so no stretch is jerky
    const H = 0.35, N = 12, warp = (t) => { let sw = 0, sv = 0; for (let j = -N; j <= N; j++) { const w = 1 - Math.abs(j) / (N + 1); sw += w; sv += w * base(t + (j / N) * H); } return Math.max(0, sv / sw); };
    return { duration, warp, end, pairs };
  };
})();
