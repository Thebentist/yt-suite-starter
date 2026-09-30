/* Shared kit for the `data` group (stats, studies, maps) of bad-breath-for-good.
 * Loaded before each data scene with   // @use videos/bad-breath-for-good/scenes/data/_lib.js
 * Call DATA.init(api) in setup(); every helper below then draws in 1920x1080 design units.
 *
 *   stage(ctx,t,o) / finish(ctx,t)      dark stage with drifting grid, glow and dust motes / vignette + grain
 *   kicker(ctx,t,str,at)                small section header top-left (lime tick + caps)
 *   source(ctx,t,str,o)                 the small citation line, bottom-left (every stat card has one)
 *   big(ctx,str,x,y,o)                  big white number (Bahnschrift 700) with glow and pop
 *   person(ctx,x,y,s,o)                 shaded icon person, lit 0..1 toward lime (or any colour)
 *   bar / ring / donut                  data marks with track, gloss and glow
 *   sprite(w,h,fn) / blit(...)          offscreen layers at 2x for 4K sharpness
 *   paperSheet(w,h,o) / drawPaper(...)  the paper / study-card look (fibres, edge shading, soft shadow)
 *   textBars(g,...)                     unreadable grey "body text" lines for paper cards (no invented words)
 *   stamp(ctx,str,x,y,p,o)              rubber stamp slam (textured, rotated)
 *   dotSprite / packRegion              glowing dot sprites and even point packing for dot fields
 *   icons: tooth, pillBottle, scraper, toothbrush, floss, moon, sun, stopwatch, check
 */
(function () {
  const D = {};
  let A = null, P = null;

  D.init = (api) => { A = api; P = api.P; D.A = api; D.P = api.P; D.S = Math.max(2, api.scale || 1); return D; };

  // ---------------------------------------------------------------- colour helpers
  function hex(c) {
    if (c.startsWith('rgb')) { const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] ?? 1]; }
    c = c.replace('#', ''); if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16), 1];
  }
  D.mix = (a, b, t) => { const x = hex(a), y = hex(b), k = Math.max(0, Math.min(1, t)); return `rgba(${Math.round(x[0] + (y[0] - x[0]) * k)},${Math.round(x[1] + (y[1] - x[1]) * k)},${Math.round(x[2] + (y[2] - x[2]) * k)},${(x[3] + (y[3] - x[3]) * k).toFixed(3)})`; };
  D.alpha = (c, a) => { const x = hex(c); return `rgba(${x[0]},${x[1]},${x[2]},${a})`; };
  D.shade = (c, k) => (k >= 0 ? D.mix(c, '#ffffff', k) : D.mix(c, '#000000', -k));
  D.fmt = (n) => Math.round(n).toLocaleString('en-US');
  D.count = (t, start, dur, to, from = 0) => from + (to - from) * A.prog(t, start, dur, A.ease.outExpo);

  // ---------------------------------------------------------------- offscreen layers
  D.sprite = (w, h, fn) => {
    const S = D.S, c = document.createElement('canvas');
    c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
    const g = c.getContext('2d'); g.scale(S, S); fn(g, w, h);
    c.dw = w; c.dh = h; return c;
  };
  // draw a sprite centred on (x,y) (ax/ay anchor 0..1), with optional scale / rotation / alpha
  D.blit = (ctx, spr, x, y, o = {}) => {
    const sc = o.scale ?? 1, w = spr.dw * sc, h = spr.dh * sc;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.op) ctx.globalCompositeOperation = o.op;
    ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
    ctx.drawImage(spr, -w * (o.ax ?? 0.5), -h * (o.ay ?? 0.5), w, h); ctx.restore();
  };

  // ---------------------------------------------------------------- stage & finishing
  let motes = null;
  D.stage = (ctx, t, o = {}) => {
    A.stage(ctx, { gridOffset: [-t * (o.driftX ?? 8), -t * (o.driftY ?? 4)], cx: o.cx, cy: o.cy, c1: o.c1, grid: o.grid });
    if (o.glow !== false) D.glow(ctx, o.gx ?? 960, o.gy ?? 480, o.gr ?? 700, o.glowColor || P.purple, o.glowAlpha ?? 0.10);
    if (o.motes !== false) {
      if (!motes) { const r = A.rand('data-motes'); motes = Array.from({ length: 46 }, () => ({ x: r() * 1920, y: r() * 1080, s: 1 + r() * 2.6, v: 6 + r() * 14, a: 0.05 + r() * 0.16, ph: r() * 10 })); }
      ctx.save();
      for (const m of motes) {
        const y = ((m.y - t * m.v) % 1120 + 1120) % 1120 - 20, x = m.x + Math.sin(t * 0.4 + m.ph) * 14;
        ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(t * 1.3 + m.ph)); ctx.fillStyle = o.moteColor || '#cfc6ff';
        ctx.beginPath(); ctx.arc(x, y, m.s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  };
  D.glow = (ctx, x, y, r, color, a = 0.3) => {
    if (a <= 0 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, D.alpha(color, a)); g.addColorStop(0.45, D.alpha(color, a * 0.35)); g.addColorStop(1, D.alpha(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  // the shared cinematic pass (bloom, vignette, grain): always the last call of an opaque scene's draw()
  D.finish = (ctx, t, o = {}) => A.finish(ctx, t, { bloom: 0.32, grain: 0.05, vignette: 0.45, ...o });

  // ---------------------------------------------------------------- type
  // section kicker, top-left: a lime tick and caps in dim white
  D.kicker = (ctx, t, str, at = 0.2, o = {}) => {
    const p = A.prog(t, at, 0.5, A.ease.outExpo), x = o.x ?? 90, y = o.y ?? 104;
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= p;
    ctx.fillStyle = o.color || P.lime; A.roundRect(ctx, x, y - 30, 10 * p, 34, 3); ctx.fill();
    ctx.beginPath(); ctx.rect(x + 22, y - 50, 1400 * p, 70); ctx.clip();
    A.text(ctx, str, x + 26 - (1 - p) * 30, y, { size: o.size || 36, weight: 700, color: o.textColor || P.dim, tracking: 3, upper: true });
    ctx.restore();
  };
  // the citation line: small, faint, bottom-left. o.pill puts a dark pill behind it (over bright layers)
  D.source = (ctx, t, str, o = {}) => {
    const p = A.prog(t, o.at ?? 0.35, 0.6), x = o.x ?? 90, y = o.y ?? 1016;
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= p * (o.alpha ?? 1);
    const tag = 'SOURCE', size = o.size || 23;
    const tw = A.measure(ctx, tag, { size: size - 3, weight: 700, tracking: 2 });
    const bw = A.measure(ctx, str, { size, weight: 600, family: 'body' });
    if (o.pill) { ctx.fillStyle = 'rgba(8,7,20,0.9)'; A.roundRect(ctx, x - 16, y - size - 8, tw + bw + 50, size + 22, 10); ctx.fill(); }
    A.text(ctx, tag, x, y, { size: size - 3, weight: 700, color: 'rgba(215,243,74,0.55)', tracking: 2 });
    A.text(ctx, str, x + tw + 16, y, { size, weight: 600, family: 'body', color: o.color || 'rgba(244,241,234,0.36)' });
    ctx.restore();
  };
  // big number with a soft glow; p = pop progress (scales about the anchor)
  D.big = (ctx, str, x, y, o = {}) => {
    const p = o.p ?? 1; if (p <= 0) return;
    const size = o.size || 220;
    ctx.save(); ctx.translate(x, y); const sc = o.noScale ? 1 : Math.max(0, p); ctx.scale(sc, sc);
    ctx.globalAlpha *= A.clamp(p * 1.5);
    A.text(ctx, str, 0, 0, { size, weight: 700, align: o.align || 'center', color: o.color || P.ink, tracking: o.tracking ?? -1, glow: o.glow || 'rgba(190,170,255,0.35)', glowBlur: o.glowBlur ?? 40, stretch: o.stretch });
    A.text(ctx, str, 0, 0, { size, weight: 700, align: o.align || 'center', color: o.color || P.ink, tracking: o.tracking ?? -1, stretch: o.stretch });
    ctx.restore();
  };
  // a lime chip that pops on its word (thin wrapper so every scene uses the same size)
  D.chip = (ctx, t, str, x, y, at, o = {}) => A.label(ctx, str, x, y, { size: o.size || 46, align: o.align || 'center', p: A.pop(t, at, 0.5), bg: o.bg, color: o.color, rotate: o.rotate });

  // ---------------------------------------------------------------- people
  // Shaded icon person. (x,y) = bottom centre; s = height of the whole figure. o.lit 0..1 blends base -> litColor,
  // o.glow adds a coloured halo, o.bob lifts it (walking), o.alpha fades.
  D.person = (ctx, x, y, s, o = {}) => {
    const lit = o.lit ?? 0, base = o.color || '#4a4468', hi = o.litColor || P.lime;
    const col = lit > 0 ? D.mix(base, hi, lit) : base;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.translate(x, y - (o.bob || 0)); if (o.rot) ctx.rotate(o.rot);
    const hw = s * 0.40, top = -s * 0.64, hr = s * 0.205, hy = -s * 0.80;
    if (o.glow) { ctx.shadowColor = D.alpha(hi, 0.75 * o.glow); ctx.shadowBlur = s * 0.45 * o.glow; }
    // body: tombstone with rounded shoulders
    const gb = ctx.createLinearGradient(0, top, 0, 0); gb.addColorStop(0, D.shade(col, 0.16)); gb.addColorStop(1, D.shade(col, -0.28));
    ctx.fillStyle = gb; ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(-hw, top + hw * 0.9);
    ctx.bezierCurveTo(-hw, top - hw * 0.08, hw, top - hw * 0.08, hw, top + hw * 0.9); ctx.lineTo(hw, 0); ctx.closePath(); ctx.fill();
    // head
    const gh = ctx.createRadialGradient(-hr * 0.35, hy - hr * 0.4, hr * 0.1, 0, hy, hr * 1.05); gh.addColorStop(0, D.shade(col, 0.28)); gh.addColorStop(1, D.shade(col, -0.18));
    ctx.fillStyle = gh; ctx.beginPath(); ctx.arc(0, hy, hr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    // rim light on the right side
    ctx.strokeStyle = D.alpha('#ffffff', 0.22 + 0.25 * lit); ctx.lineWidth = Math.max(1.2, s * 0.018); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, hy, hr * 0.9, -1.1, 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hw * 0.92, top + hw * 0.75); ctx.bezierCurveTo(hw * 0.92, top + hw * 0.3, hw * 0.6, top + hw * 0.02, hw * 0.3, top); ctx.stroke();
    // a neck shadow gap between head and body
    ctx.restore();
  };

  // ---------------------------------------------------------------- marks
  // horizontal bar (x,y = top-left) or vertical (o.vertical: x,y = bottom-left, grows up). frac 0..1 of w (or h).
  D.bar = (ctx, x, y, w, h, frac, o = {}) => {
    const col = o.color || P.lime, r = o.radius ?? Math.min(w, h) / 2;
    ctx.save();
    if (o.track !== false) {
      ctx.fillStyle = o.trackColor || 'rgba(255,255,255,0.07)';
      if (o.vertical) A.roundRect(ctx, x, y - h, w, h, r); else A.roundRect(ctx, x, y, w, h, r); ctx.fill();
      if (o.trackStroke) { ctx.strokeStyle = o.trackStroke; ctx.lineWidth = 2; ctx.stroke(); }
    }
    const f = Math.max(0, frac); if (f <= 0) { ctx.restore(); return; }
    let g;
    if (o.vertical) {
      const hh = h * f; g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, D.shade(col, 0.2)); g.addColorStop(1, D.shade(col, -0.22));
      if (o.glow) { ctx.shadowColor = D.alpha(col, 0.55 * o.glow); ctx.shadowBlur = 40 * o.glow; }
      ctx.fillStyle = g; A.roundRect(ctx, x, y - hh, w, hh, Math.min(r, hh / 2)); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.globalAlpha *= 0.28; ctx.fillStyle = '#fff'; A.roundRect(ctx, x + w * 0.12, y - hh + 8, w * 0.16, Math.max(0, hh - 16), w * 0.08); ctx.fill();
    } else {
      const ww = w * f; g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, D.shade(col, 0.22)); g.addColorStop(1, D.shade(col, -0.2));
      if (o.glow) { ctx.shadowColor = D.alpha(col, 0.55 * o.glow); ctx.shadowBlur = 40 * o.glow; }
      ctx.fillStyle = g; A.roundRect(ctx, x, y, ww, h, Math.min(r, ww / 2)); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.globalAlpha *= 0.3; ctx.fillStyle = '#fff'; A.roundRect(ctx, x + 8, y + h * 0.14, Math.max(0, ww - 16), h * 0.16, h * 0.08); ctx.fill();
    }
    ctx.restore();
  };
  // progress ring (0..1 from 12 o'clock, clockwise)
  D.ring = (ctx, cx, cy, r, p, o = {}) => {
    ctx.save(); ctx.lineCap = o.cap || 'round'; ctx.lineWidth = o.width || 14;
    if (o.track !== false) { ctx.strokeStyle = o.trackColor || 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
    if (p > 0) {
      if (o.glow) { ctx.shadowColor = D.alpha(o.color || P.lime, 0.7); ctx.shadowBlur = 24 * o.glow; }
      ctx.strokeStyle = o.color || P.lime; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2 + (o.from || 0) * Math.PI * 2, -Math.PI / 2 + ((o.from || 0) + p) * Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  };
  // donut: slices [{v, color, p (0..1 drawn), explode (px), alpha, glow, lift}] clockwise from 12 o'clock
  D.donut = (ctx, cx, cy, r0, r1, slices, o = {}) => {
    const tot = slices.reduce((s, x) => s + x.v, 0), gap = o.gap ?? 0.012;
    let a = -Math.PI / 2 + (o.rot || 0); const out = [];
    for (const s of slices) {
      const span = (s.v / tot) * Math.PI * 2, a0 = a + gap / 2, a1 = a + span * (s.p ?? 1) - gap / 2, mid = a + span / 2;
      out.push({ a0: a, a1: a + span, mid });
      if (a1 > a0) {
        const ex = s.explode || 0, dx = Math.cos(mid) * ex, dy = Math.sin(mid) * ex, lift = s.lift || 0;
        ctx.save(); ctx.globalAlpha *= s.alpha ?? 1; ctx.translate(dx, dy);
        const R0 = r0 - lift * 0.3, R1 = r1 + lift;
        const g = ctx.createRadialGradient(cx, cy, R0, cx, cy, R1); g.addColorStop(0, D.shade(s.color, -0.3)); g.addColorStop(0.55, s.color); g.addColorStop(1, D.shade(s.color, 0.12));
        if (s.glow) { ctx.shadowColor = D.alpha(s.color, 0.7 * s.glow); ctx.shadowBlur = 50 * s.glow; }
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R1, a0, a1); ctx.arc(cx, cy, R0, a1, a0, true); ctx.closePath(); ctx.fill();
        ctx.shadowColor = 'transparent';
        // top gloss
        ctx.globalAlpha *= 0.22; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R1 - 6, a0 + 0.01, a1 - 0.01); ctx.stroke();
        ctx.restore();
      }
      a += span;
    }
    return out;
  };

  // ---------------------------------------------------------------- dot fields
  const dotCache = {};
  // a glowing dot sprite (core + halo) for thousands of particles; draw with ctx.drawImage(spr, x - R, y - R, 2R, 2R)
  D.dotSprite = (color, r, halo = 2.2) => {
    const key = color + r + halo; if (dotCache[key]) return dotCache[key];
    const R = r * halo, spr = D.sprite(R * 2, R * 2, (g) => {
      const hg = g.createRadialGradient(R, R, r * 0.6, R, R, R); hg.addColorStop(0, D.alpha(color, 0.35)); hg.addColorStop(1, D.alpha(color, 0)); g.fillStyle = hg; g.fillRect(0, 0, R * 2, R * 2);
      const cg = g.createRadialGradient(R - r * 0.3, R - r * 0.35, r * 0.1, R, R, r); cg.addColorStop(0, D.shade(color, 0.55)); cg.addColorStop(0.7, color); cg.addColorStop(1, D.shade(color, -0.15));
      g.fillStyle = cg; g.beginPath(); g.arc(R, R, r, 0, Math.PI * 2); g.fill();
    });
    spr.R = R; dotCache[key] = spr; return spr;
  };
  // n evenly spread points inside a region (test(x,y) -> bool), jittered hex grid, nearest to (cx,cy) first
  D.packRegion = (n, test, bbox, spacing, seed = 'pack', cx, cy) => {
    // tries spacings from a little above the given one down until the region holds n points, so the fill has no holes
    const [x0, y0, x1, y1] = bbox; let pts = [];
    for (let s = spacing * 1.1; s > spacing * 0.5; s *= 0.985) {
      const r = A.rand(seed), dy = s * 0.866; pts = [];
      for (let row = 0, y = y0; y <= y1; row++, y += dy) for (let x = x0 + (row % 2 ? s / 2 : 0); x <= x1; x += s) {
        const jx = x + (r() - 0.5) * s * 0.22, jy = y + (r() - 0.5) * s * 0.22;
        if (test(jx, jy)) pts.push([jx, jy]);
      }
      if (pts.length >= n) break;
    }
    const r = A.rand(seed + 'o');
    if (cx != null) pts.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
    else for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    return pts.slice(0, n);
  };

  // ---------------------------------------------------------------- paper
  // A sheet of paper as a sprite: warm off-white, fibres, darker edges, faint top-light. draw(g,w,h) prints on it.
  D.paperSheet = (w, h, o = {}) => D.sprite(w, h, (g) => {
    g.fillStyle = o.color || P.paper; g.fillRect(0, 0, w, h);
    const r = A.rand(o.seed || 'paper');
    for (let i = 0; i < (w * h) / 700; i++) {
      g.globalAlpha = 0.025 + r() * 0.05; g.strokeStyle = r() < 0.5 ? '#8a7f66' : '#ffffff'; g.lineWidth = 1;
      const x = r() * w, y = r() * h, a = r() * Math.PI, l = 3 + r() * 14;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    g.globalAlpha = 1;
    const eg = g.createRadialGradient(w * 0.45, h * 0.3, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    eg.addColorStop(0, 'rgba(255,255,255,0.10)'); eg.addColorStop(1, 'rgba(120,100,70,0.16)'); g.fillStyle = eg; g.fillRect(0, 0, w, h);
    if (o.draw) o.draw(g, w, h);
  });
  // draw a paper sprite with a soft drop shadow (x,y = centre)
  D.drawPaper = (ctx, spr, x, y, o = {}) => {
    const sc = o.scale ?? 1, w = spr.dw * sc, h = spr.dh * sc;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = o.shadow ?? 50; ctx.shadowOffsetY = (o.shadow ?? 50) * 0.4;
    ctx.fillStyle = '#e9e3d4'; ctx.fillRect(-w * (o.ax ?? 0.5), -h * (o.ay ?? 0.5), w, h);
    ctx.shadowColor = 'transparent';
    ctx.drawImage(spr, -w * (o.ax ?? 0.5), -h * (o.ay ?? 0.5), w, h);
    ctx.restore();
  };
  // grey placeholder "text" lines (unreadable on purpose: no invented study wording)
  D.textBars = (g, x, y, w, n, o = {}) => {
    const r = A.rand(o.seed || 'bars'), lh = o.lh ?? 22, th = o.th ?? 8;
    g.save(); g.fillStyle = o.color || 'rgba(40,36,50,0.22)';
    for (let i = 0; i < n; i++) {
      const last = i === n - 1 || (o.para && (i + 1) % o.para === 0);
      let xx = x; const ww = last ? w * (0.3 + r() * 0.4) : w * (0.94 + r() * 0.06);
      while (xx < x + ww - 10) { const word = 18 + r() * 70; const ew = Math.min(word, x + ww - xx); A.roundRect(g, xx, y + i * lh, ew, th, th / 2); g.fill(); xx += word + 9; }
    }
    g.restore();
  };

  // ---------------------------------------------------------------- stamp
  const stampCache = {};
  D.stamp = (ctx, str, x, y, p, o = {}) => {
    if (p <= 0) return;
    const key = str + (o.color || '') + (o.size || 0) + (o.sub || '') + (o.top || '');
    if (!stampCache[key]) {
      const size = o.size || 96, col = o.color || P.marker;
      const small = o.sub || o.top, tw = A.measure(ctx, str, { size, weight: 700, tracking: 4 }), sw = small ? A.measure(ctx, small, { size: size * 0.34, weight: 700, tracking: 6 }) : 0;
      const w = Math.max(tw, sw) + size * 0.9, h = size * (small ? 1.75 : 1.35);
      stampCache[key] = D.sprite(w + 20, h + 20, (g) => {
        g.translate(10, 10); g.strokeStyle = col; g.fillStyle = col;
        g.lineWidth = size * 0.07; A.roundRect(g, 0, 0, w, h, size * 0.14); g.stroke();
        g.lineWidth = size * 0.025; A.roundRect(g, size * 0.11, size * 0.11, w - size * 0.22, h - size * 0.22, size * 0.08); g.stroke();
        A.text(g, str, w / 2, (o.sub ? h * 0.56 : o.top ? h * 0.84 : h / 2 + size * 0.36), { size, weight: 700, align: 'center', color: col, tracking: 4 });
        if (o.top) A.text(g, o.top, w / 2, h * 0.34, { size: size * 0.34, weight: 700, align: 'center', color: col, tracking: 6 });
        if (o.sub) A.text(g, o.sub, w / 2, h * 0.82, { size: size * 0.34, weight: 700, align: 'center', color: col, tracking: 4 });
        // ink texture: knock out specks and streaks
        const r = A.rand('stamp' + str); g.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 900; i++) { g.globalAlpha = 0.25 + r() * 0.6; g.beginPath(); g.arc(r() * w, r() * h, 0.5 + r() * 2.4, 0, Math.PI * 2); g.fill(); }
        for (let i = 0; i < 14; i++) { g.globalAlpha = 0.18 + r() * 0.2; g.fillRect(r() * w, r() * h, 30 + r() * 120, 1 + r() * 2); }
      });
    }
    const spr = stampCache[key], k = A.clamp(p), sc = 1 + (1 - A.ease.outCubic(k)) * 1.4;
    ctx.save(); ctx.globalAlpha *= A.clamp(k * 3) * (o.alpha ?? 0.92);
    D.blit(ctx, spr, x, y, { scale: sc * (o.scale ?? 1), rot: o.rot ?? -0.12 });
    ctx.restore();
  };

  // ---------------------------------------------------------------- icons (flat 2.5D, drawn at size s around 0,0)
  const icons = {};
  // molar-ish tooth, crown up. o.decay 0..1 paints a dark cavity
  icons.tooth = (ctx, x, y, s, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const path = () => { ctx.beginPath(); ctx.moveTo(-40, -38); ctx.bezierCurveTo(-52, -60, -20, -62, 0, -50); ctx.bezierCurveTo(20, -62, 52, -60, 40, -38);
      ctx.bezierCurveTo(48, -10, 38, 4, 32, 18); ctx.bezierCurveTo(28, 40, 26, 58, 16, 58); ctx.bezierCurveTo(6, 58, 8, 30, 0, 26); ctx.bezierCurveTo(-8, 30, -6, 58, -16, 58); ctx.bezierCurveTo(-26, 58, -28, 40, -32, 18); ctx.bezierCurveTo(-38, 4, -48, -10, -40, -38); ctx.closePath(); };
    if (o.glow) { ctx.shadowColor = D.alpha(o.glowColor || P.lime, 0.6 * o.glow); ctx.shadowBlur = 40 * o.glow; }
    const g = ctx.createLinearGradient(-40, -60, 40, 60); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, o.color || P.enamel); g.addColorStop(1, '#cfc6b4');
    path(); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(80,70,60,0.35)'; ctx.stroke();
    ctx.globalAlpha *= 0.55; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-18, -36, 12, 6, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= 0.55;
    if (o.decay > 0) {
      ctx.save(); path(); ctx.clip(); const d = o.decay;
      const dg = ctx.createRadialGradient(14, -30, 2, 14, -30, 30 * d); dg.addColorStop(0, '#2a1a12'); dg.addColorStop(0.6, 'rgba(70,45,25,0.9)'); dg.addColorStop(1, 'rgba(90,60,30,0)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(14, -30, 32 * d, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  };
  // generic pill bottle (no brand): amber body, white cap, blank label
  icons.pillBottle = (ctx, x, y, s, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100); if (o.rot) ctx.rotate(o.rot);
    const body = o.color || '#ff9f43';
    const g = ctx.createLinearGradient(-38, 0, 38, 0); g.addColorStop(0, D.shade(body, -0.25)); g.addColorStop(0.35, D.shade(body, 0.25)); g.addColorStop(1, D.shade(body, -0.35));
    ctx.fillStyle = g; A.roundRect(ctx, -38, -40, 76, 96, 12); ctx.fill();
    const cg = ctx.createLinearGradient(-44, 0, 44, 0); cg.addColorStop(0, '#cfcbd8'); cg.addColorStop(0.4, '#ffffff'); cg.addColorStop(1, '#a9a4b8');
    ctx.fillStyle = cg; A.roundRect(ctx, -44, -66, 88, 30, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2; for (let i = -36; i <= 36; i += 8) { ctx.beginPath(); ctx.moveTo(i, -63); ctx.lineTo(i, -40); ctx.stroke(); }
    ctx.fillStyle = '#f7f3ea'; A.roundRect(ctx, -32, -18, 64, 50, 5); ctx.fill();
    ctx.fillStyle = 'rgba(60,50,70,0.35)'; for (let i = 0; i < 3; i++) { A.roundRect(ctx, -24, -8 + i * 13, i === 2 ? 28 : 48, 6, 3); ctx.fill(); }
    ctx.globalAlpha *= 0.35; ctx.fillStyle = '#fff'; A.roundRect(ctx, -30, -36, 10, 88, 5); ctx.fill();
    ctx.restore();
  };
  // U-shaped tongue scraper, drawn lying diagonally
  icons.scraper = (ctx, x, y, s, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100); ctx.rotate(o.rot ?? 0);
    const col = o.color || '#c9d2e3';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = D.shade(col, -0.35); ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(-26, 62); ctx.lineTo(-26, -20); ctx.bezierCurveTo(-26, -66, 26, -66, 26, -20); ctx.lineTo(26, 62); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 11; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-29, 58); ctx.lineTo(-29, -20); ctx.bezierCurveTo(-29, -60, 10, -68, 22, -40); ctx.stroke();
    const hg = ctx.createLinearGradient(-40, 0, 40, 0); hg.addColorStop(0, D.shade(o.handle || P.lavender, -0.3)); hg.addColorStop(0.4, D.shade(o.handle || P.lavender, 0.2)); hg.addColorStop(1, D.shade(o.handle || P.lavender, -0.3));
    ctx.fillStyle = hg; A.roundRect(ctx, -38, 50, 24, 50, 10); ctx.fill(); A.roundRect(ctx, 14, 50, 24, 50, 10); ctx.fill();
    ctx.restore();
  };
  // toothbrush, head up
  icons.toothbrush = (ctx, x, y, s, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100); ctx.rotate(o.rot ?? 0);
    const col = o.color || P.saliva;
    const hg = ctx.createLinearGradient(-12, 0, 12, 0); hg.addColorStop(0, D.shade(col, -0.3)); hg.addColorStop(0.4, D.shade(col, 0.25)); hg.addColorStop(1, D.shade(col, -0.35));
    ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(-9, -40); ctx.lineTo(9, -40); ctx.lineTo(12, 100); ctx.quadraticCurveTo(0, 110, -12, 100); ctx.closePath(); ctx.fill();
    A.roundRect(ctx, -13, -88, 26, 54, 10); ctx.fill();
    for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) {
      const bx = -26 - c * 10, by = -84 + r * 10;
      ctx.fillStyle = r % 2 ? '#ffffff' : '#dff4ff'; A.roundRect(ctx, bx, by, 16, 7, 3); ctx.fill();
    }
    ctx.restore();
  };
  // floss: a little dispenser with a strand
  icons.floss = (ctx, x, y, s, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
    const g = ctx.createLinearGradient(-40, -40, 40, 40); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b9b3cf');
    ctx.fillStyle = g; A.roundRect(ctx, -40, -30, 80, 70, 16); ctx.fill();
    ctx.fillStyle = D.shade(o.color || P.cyan, -0.1); A.roundRect(ctx, -40, -30, 80, 20, 12); ctx.fill();
    ctx.strokeStyle = o.color || P.cyan; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.bezierCurveTo(4, -60, 30, -70, 40, -92); ctx.stroke();
    ctx.restore();
  };
  // crescent moon: drawn as a clipped disc (no destination-out, so it never cuts through the layers below)
  icons.moon = (ctx, x, y, r, o = {}) => {
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    D.glow(ctx, x, y, r * 3.2, '#bfd4ff', 0.28);
    ctx.beginPath(); ctx.rect(x - r * 2, y - r * 2, r * 4, r * 4); ctx.arc(x + r * 0.45, y - r * 0.28, r * 0.86, 0, Math.PI * 2, true); ctx.clip('evenodd');
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#fffbe8'); g.addColorStop(1, '#d9d2ff');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  icons.sun = (ctx, x, y, r, t = 0, o = {}) => {
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    D.glow(ctx, x, y, r * 3.4, P.yellow, 0.35);
    ctx.strokeStyle = P.yellow; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + t * 0.3, l = i % 2 ? 1.5 : 1.75; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25); ctx.lineTo(x + Math.cos(a) * r * l, y + Math.sin(a) * r * l); ctx.stroke(); }
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#fff6c4'); g.addColorStop(1, P.orange);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  // stopwatch face; p = hand position 0..1 of a full turn; o.fill 0..1 paints a wedge
  icons.stopwatch = (ctx, x, y, r, p, o = {}) => {
    ctx.save();
    ctx.fillStyle = '#2a2548'; A.roundRect(ctx, x - r * 0.16, y - r * 1.32, r * 0.32, r * 0.26, 6); ctx.fill();
    ctx.fillStyle = '#3a3462'; ctx.beginPath(); ctx.arc(x, y - r * 1.02, r * 0.1, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r * 1.08); g.addColorStop(0, '#3a3466'); g.addColorStop(1, '#171431');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.08, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 4; ctx.stroke();
    if (o.fill > 0) { ctx.fillStyle = D.alpha(o.fillColor || P.lime, 0.28); ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r * 0.92, -Math.PI / 2, -Math.PI / 2 + o.fill * Math.PI * 2); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineCap = 'round';
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, big = i % 5 === 0; ctx.lineWidth = big ? 4 : 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * (big ? 0.8 : 0.87), y + Math.sin(a) * r * (big ? 0.8 : 0.87)); ctx.lineTo(x + Math.cos(a) * r * 0.94, y + Math.sin(a) * r * 0.94); ctx.stroke(); }
    const a = -Math.PI / 2 + p * Math.PI * 2;
    ctx.strokeStyle = o.handColor || P.lime; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r * 0.12, y - Math.sin(a) * r * 0.12); ctx.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); ctx.stroke();
    ctx.fillStyle = o.handColor || P.lime; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  // cartoon stink cloud: lumpy green cloud with an outline and wavy smell lines; p pops it, t wobbles it
  icons.stink = (ctx, x, y, s, p = 1, t = 0, o = {}) => {
    if (p <= 0) return;
    ctx.save(); ctx.translate(x, y); const k = Math.max(0, p); ctx.scale(k * s / 100, k * s / 100); ctx.globalAlpha *= A.clamp(p * 2) * (o.alpha ?? 1);
    const lumps = [[-38, 6, 30], [-12, -14, 36], [22, -8, 32], [40, 12, 24], [4, 16, 30], [-28, 22, 22]];
    const fill = o.fill || '#c9e67a', line = o.line || '#5f8a14';
    ctx.beginPath(); for (const [lx, ly, lr] of lumps) { const w = 1 + 0.04 * Math.sin(t * 3 + lx); ctx.moveTo(lx + lr * w, ly); ctx.arc(lx, ly, lr * w, 0, Math.PI * 2); }
    ctx.lineWidth = 8; ctx.strokeStyle = line; ctx.lineJoin = 'round'; ctx.stroke();
    const g = ctx.createLinearGradient(0, -50, 0, 40); g.addColorStop(0, D.shade(fill, 0.3)); g.addColorStop(1, fill); ctx.fillStyle = g; ctx.fill();
    ctx.globalAlpha *= 0.5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(-16, -24, 14, 7, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= 0.5;
    if (o.lines !== false) {
      ctx.strokeStyle = line; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const bx = -26 + i * 26, ph = t * 4 + i;
        ctx.beginPath(); for (let j = 0; j <= 10; j++) { const yy = -54 - j * 4.4, xx = bx + Math.sin(j * 0.9 + ph) * 5; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
      }
    }
    ctx.restore();
  };
  // a crisp (non-doodle) check mark drawn on with p
  icons.check = (ctx, x, y, s, p, o = {}) => {
    if (p <= 0) return;
    const pts = [[x - s * 0.5, y], [x - s * 0.15, y + s * 0.36], [x + s * 0.55, y - s * 0.42]];
    ctx.save(); ctx.strokeStyle = o.color || P.black; ctx.lineWidth = o.width || s * 0.16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const L1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), L2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]), L = (L1 + L2) * A.clamp(p);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    if (L <= L1) ctx.lineTo(A.lerp(pts[0][0], pts[1][0], L / L1), A.lerp(pts[0][1], pts[1][1], L / L1));
    else { ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(A.lerp(pts[1][0], pts[2][0], (L - L1) / L2), A.lerp(pts[1][1], pts[2][1], (L - L1) / L2)); }
    ctx.stroke(); ctx.restore();
  };
  D.icons = icons;

  window.DATA = D;
})();
