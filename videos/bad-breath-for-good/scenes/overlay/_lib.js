/* Shared drawing code for the `overlay` group (transparent doodles, chips and cards over Ben's footage and the TikTok).
 * Kevin Ngo "doodle on the video" spirit: marker strokes and handwriting drawn on live, with a soft dark halo so they
 * read over Ben's bright lavender set. Loaded by `// @use videos/bad-breath-for-good/scenes/overlay/_lib.js`.
 */
(function () {
  const HALO = 'rgba(12,8,28,0.55)';

  // run fn with a soft dark shadow behind whatever it draws (reads over the light set without a hard outline)
  function halo(ctx, fn, o = {}) {
    ctx.save();
    ctx.shadowColor = o.color || HALO; ctx.shadowBlur = o.blur ?? 14; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = o.dy ?? 3;
    fn(); ctx.restore();
  }

  // handwritten note (Ink Free), written on left to right, with a thin dark keyline + shadow for legibility
  function hand(ctx, api, str, x, y, p, o = {}) {
    if (p <= 0) return;
    halo(ctx, () => api.doodle.text(ctx, str, x, y, p, {
      size: o.size || 58, color: o.color || '#ffffff', align: o.align, rotate: o.rotate,
      stroke: o.stroke === false ? undefined : (o.stroke || 'rgba(14,10,30,0.85)'), strokeWidth: o.strokeWidth || Math.round((o.size || 58) * 0.16),
    }), { blur: o.blur ?? 16 });
  }

  // marker doodles with a halo: kind = circle | arrow | underline | cross | check | stroke | box | scribble
  function mark(ctx, api, kind, args, p, o = {}) {
    if (p <= 0) return;
    const opts = Object.assign({ color: api.P.marker, width: 9, glow: o.noHalo ? undefined : 'rgba(10,6,24,0.6)' }, o);
    api.doodle[kind](ctx, ...args, p, opts);
  }

  // dark translucent pill with white condensed caps and an optional lime dot (AD chip, chapter chips)
  function pill(ctx, api, str, x, y, o = {}) {
    const { P } = api, size = o.size || 36, padX = o.padX ?? size * 0.55, h = size * 1.62;
    const tw = api.measure(ctx, str, { size, weight: 700, tracking: 1.5 });
    const dot = o.dot ? size * 0.62 : 0;
    const w = tw + padX * 2 + dot, r = h / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = o.bg || 'rgba(11,10,24,0.78)'; api.roundRect(ctx, x, y - h / 2, w, h, r); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5; api.roundRect(ctx, x + 0.75, y - h / 2 + 0.75, w - 1.5, h - 1.5, r); ctx.stroke();
    if (o.dot) {
      const cx = x + padX * 0.8 + size * 0.14, pulse = o.pulse ?? 1;
      ctx.fillStyle = P.lime; ctx.shadowColor = 'rgba(215,243,74,0.8)'; ctx.shadowBlur = 12 * pulse;
      ctx.beginPath(); ctx.arc(cx, y, size * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowColor = 'transparent';
    }
    api.text(ctx, str, x + padX + dot, y + size * 0.36, { size, weight: 700, color: o.color || P.ink, tracking: 1.5 });
    ctx.restore();
    return { w, h };
  }

  // a word "sticker": condensed caps, white with dark keyline + shadow, or black on a lime box (hl)
  function word(ctx, api, str, x, y, o = {}) {
    const { P } = api, size = o.size || 96;
    const w = api.measure(ctx, str, { size, weight: 700, tracking: 1 });
    if (o.hl) {
      const padX = size * 0.16, padY = size * 0.1, bh = size * 0.98;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
      ctx.fillStyle = o.bg || P.lime;
      const k = o.hlP == null ? 1 : api.clamp(o.hlP);
      ctx.beginPath(); ctx.moveTo(x - padX, y - bh * 0.84 + 3); ctx.lineTo(x - padX + (w + padX * 2) * k, y - bh * 0.84);
      ctx.lineTo(x - padX + (w + padX * 2) * k + 3, y + bh * 0.16 + padY); ctx.lineTo(x - padX - 2, y + bh * 0.16 + padY + 2); ctx.closePath(); ctx.fill();
      ctx.restore();
      api.text(ctx, str, x, y, { size, weight: 700, color: o.color || P.black, tracking: 1 });
    } else {
      api.text(ctx, str, x, y, { size, weight: 700, color: o.color || P.ink, tracking: 1, stroke: 'rgba(12,8,28,0.9)', strokeWidth: size * 0.12,
        shadow: 'rgba(8,4,20,0.55)', shadowBlur: 22, shadowY: 6 });
    }
    return w;
  }

  // pop transform around (x, y): scale from p (outBack settle), fade in fast
  function popAt(ctx, api, x, y, p, fn, rot = 0) {
    if (p <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot * (1 - api.clamp(p))); ctx.scale(p, p); ctx.globalAlpha *= api.clamp(p * 1.8); ctx.translate(-x, -y);
    fn(); ctx.restore();
  }

  // the phone mockup: returns { draw(ctx, t, drawScreen) } with the body pre-rendered at 2x
  function makePhone(api, x, y, w, h, o = {}) {
    const S = 2, bez = o.bezel ?? 13, R = o.radius ?? 64, rS = R - bez + 1;
    const pad = 90;
    const mk = () => { const c = document.createElement('canvas'); c.width = (w + pad * 2) * S; c.height = (h + pad * 2) * S; const g = c.getContext('2d'); g.scale(S, S); g.translate(pad, pad); return [c, g]; };
    // under: shadow + body; over: gloss + island + rim
    const [cu, gu] = mk(), [co, go] = mk();
    gu.save(); gu.shadowColor = 'rgba(0,0,0,0.55)'; gu.shadowBlur = 60; gu.shadowOffsetY = 26;
    const body = gu.createLinearGradient(0, 0, w, h); body.addColorStop(0, '#2c2838'); body.addColorStop(0.5, '#141220'); body.addColorStop(1, '#221e2e');
    gu.fillStyle = body; api.roundRect(gu, 0, 0, w, h, R); gu.fill(); gu.restore();
    // side buttons
    gu.fillStyle = '#26222f'; api.roundRect(gu, -4, h * 0.2, 6, 70, 3); gu.fill(); api.roundRect(gu, -4, h * 0.29, 6, 70, 3); gu.fill(); api.roundRect(gu, w - 2, h * 0.24, 6, 110, 3); gu.fill();
    gu.fillStyle = '#000'; api.roundRect(gu, bez, bez, w - bez * 2, h - bez * 2, rS); gu.fill();
    // over layer
    const rim = go.createLinearGradient(0, 0, w, h); rim.addColorStop(0, 'rgba(255,255,255,0.55)'); rim.addColorStop(0.35, 'rgba(255,255,255,0.08)'); rim.addColorStop(0.7, 'rgba(255,255,255,0.05)'); rim.addColorStop(1, 'rgba(255,255,255,0.3)');
    go.strokeStyle = rim; go.lineWidth = 2.5; api.roundRect(go, 1.5, 1.5, w - 3, h - 3, R - 1); go.stroke();
    go.strokeStyle = 'rgba(0,0,0,0.6)'; go.lineWidth = 2; api.roundRect(go, bez - 1, bez - 1, w - bez * 2 + 2, h - bez * 2 + 2, rS + 1); go.stroke();
    go.save(); api.roundRect(go, bez, bez, w - bez * 2, h - bez * 2, rS); go.clip();
    const gl = go.createLinearGradient(0, 0, w * 0.9, h * 0.55); gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(0.45, 'rgba(255,255,255,0.03)'); gl.addColorStop(0.46, 'rgba(255,255,255,0)');
    go.fillStyle = gl; go.fillRect(0, 0, w, h);
    go.restore();
    go.fillStyle = '#050508'; api.roundRect(go, w / 2 - 58, bez + 12, 116, 34, 17); go.fill();
    go.fillStyle = 'rgba(80,90,140,0.5)'; go.beginPath(); go.arc(w / 2 + 36, bez + 29, 6, 0, Math.PI * 2); go.fill();
    const screen = { x: x + bez, y: y + bez, w: w - bez * 2, h: h - bez * 2, r: rS };
    return {
      screen,
      draw(ctx, drawScreen) {
        ctx.drawImage(cu, x - pad, y - pad, w + pad * 2, h + pad * 2);
        ctx.save(); api.roundRect(ctx, screen.x, screen.y, screen.w, screen.h, screen.r); ctx.clip(); drawScreen(screen); ctx.restore();
        ctx.drawImage(co, x - pad, y - pad, w + pad * 2, h + pad * 2);
      },
    };
  }

  // draw an image to cover a rect (centre crop); returns the mapping so doodles can follow points in the image
  function cover(ctx, img, r, o = {}) {
    const iw = o.iw || img.width, ih = o.ih || img.height, s = Math.max(r.w / iw, r.h / ih) * (o.zoom || 1);
    const dw = iw * s, dh = ih * s, dx = r.x + (r.w - dw) * (o.ax ?? 0.5), dy = r.y + (r.h - dh) * (o.ay ?? 0.5);
    if (img) ctx.drawImage(img, dx, dy, dw, dh);
    return { at: (u, v) => [dx + u * dw, dy + v * dh], s: dw };
  }
  // linear keyframe track [[t, ...vals]] -> vals at t
  function track(keys, t) {
    if (t <= keys[0][0]) return keys[0].slice(1);
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i], k = (t - a[0]) / (b[0] - a[0]), e = k * k * (3 - 2 * k); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * e); }
    }
    return keys[keys.length - 1].slice(1);
  }

  // hand-drawn grimace face (the "eek" face, drawn, never an emoji font)
  function grimace(ctx, api, cx, cy, r, p, o = {}) {
    const col = o.color || api.P.ink, seed = o.seed || 41;
    const opt = { color: col, width: o.width || 6, seed, glow: 'rgba(10,6,24,0.55)' };
    const pts = []; for (let i = 0; i <= 60; i++) { const a = -2 + (i / 60) * Math.PI * 2.08; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.02]); }
    const k1 = api.clamp(p / 0.45), k2 = api.clamp((p - 0.4) / 0.25), k3 = api.clamp((p - 0.6) / 0.4);
    if (o.fill && k1 > 0) { ctx.save(); ctx.globalAlpha *= k1 * 0.95; ctx.fillStyle = o.fill; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    api.doodle.stroke(ctx, pts, k1, opt);
    // eyes: little arcs raised (worried brows) + dots
    api.doodle.stroke(ctx, [[cx - r * 0.5, cy - r * 0.28], [cx - r * 0.3, cy - r * 0.4]], k2, { ...opt, width: opt.width * 0.8, seed: seed + 1 });
    api.doodle.stroke(ctx, [[cx + r * 0.5, cy - r * 0.28], [cx + r * 0.3, cy - r * 0.4]], k2, { ...opt, width: opt.width * 0.8, seed: seed + 2 });
    if (k2 > 0) { ctx.save(); ctx.globalAlpha *= k2; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx - r * 0.36, cy - r * 0.12, r * 0.09, 0, 7); ctx.arc(cx + r * 0.36, cy - r * 0.12, r * 0.09, 0, 7); ctx.fill(); ctx.restore(); }
    // clenched teeth: a wide rounded box with a middle line and 3 tooth lines
    const mw = r * 1.05, mh = r * 0.42, mx = cx - mw / 2, my = cy + r * 0.2;
    if (k3 > 0) {
      ctx.save(); ctx.globalAlpha *= api.clamp(k3 * 2); ctx.fillStyle = '#ffffff'; api.roundRect(ctx, mx, my, mw, mh, mh * 0.35); ctx.fill(); ctx.restore();
    }
    api.doodle.stroke(ctx, [[mx + mh * 0.3, my], [mx + mw, my + 1], [mx + mw, my + mh], [mx, my + mh], [mx, my], [mx + mh * 0.3, my]], k3, { ...opt, width: opt.width * 0.8, seed: seed + 3, glow: undefined });
    api.doodle.stroke(ctx, [[mx, my + mh / 2], [mx + mw, my + mh / 2]], api.clamp(k3 * 1.5 - 0.3), { ...opt, width: opt.width * 0.6, seed: seed + 4, glow: undefined });
    for (let i = 1; i <= 3; i++) api.doodle.stroke(ctx, [[mx + (mw * i) / 4, my], [mx + (mw * i) / 4, my + mh]], api.clamp(k3 * 2 - 0.8 - i * 0.1), { ...opt, width: opt.width * 0.5, seed: seed + 5 + i, glow: undefined });
  }

  // tiny hand-drawn nose in profile (for "a mile away")
  function nose(ctx, api, x, y, s, p, o = {}) {
    const dir = o.dir || 1, ink = o.color || '#1b1a22', clamp = api.clamp;
    // profile nose as cubic segments in unit space (pointing right), origin at the bridge line
    const segs = [[[0, -1.0], [0.06, -0.55], [0.36, -0.12], [0.52, 0.16]], [[0.52, 0.16], [0.64, 0.36], [0.52, 0.56], [0.32, 0.5]],
      [[0.32, 0.5], [0.24, 0.47], [0.2, 0.36], [0.11, 0.38]], [[0.11, 0.38], [0.02, 0.42], [0.02, 0.56], [-0.06, 0.6]]];
    const pts = [];
    for (const [a, b, c, d] of segs) for (let i = 0; i <= 12; i++) {
      const u = i / 12, v = 1 - u, bx = v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], by = v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1];
      pts.push([x + dir * bx * s, y + by * s]);
    }
    const fk = clamp((p - 0.35) / 0.4);
    if (fk > 0) { // soft skin fill behind the outline
      ctx.save(); ctx.globalAlpha *= fk * 0.95; ctx.fillStyle = o.fill || '#f6c9a8';
      ctx.shadowColor = 'rgba(10,6,24,0.35)'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]);
      ctx.lineTo(x - dir * s * 0.1, y + s * 0.62); ctx.lineTo(x - dir * s * 0.1, y - s * 1.0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const opt = { color: ink, width: o.width || 7, seed: o.seed || 57, glow: o.glow || 'rgba(255,255,255,0.9)' };
    api.doodle.stroke(ctx, pts, clamp(p / 0.75), opt);
    const k = clamp((p - 0.7) / 0.3); // nostril
    api.doodle.stroke(ctx, [[x + dir * s * 0.2, y + s * 0.44], [x + dir * s * 0.3, y + s * 0.4]], k, { ...opt, width: opt.width * 0.9, seed: opt.seed + 3 });
  }

  // kinetic type: lines = [{ y, size, words: [{ w, t, hl }] }] laid out left-aligned from x. Each word pops on its
  // time (scale + rise, outBack); hl words sit on a lime box that sweeps open first (adjacent hl boxes merge).
  // o: { x, color, alpha, underline: { word, t, color } }. Returns word boxes for doodles.
  function kinetic(ctx, api, t, lines, o = {}) {
    const { P, clamp, ease } = api, x0 = o.x ?? 96, boxes = [];
    for (const L of lines) {
      const size = L.size, gap = api.measure(ctx, ' ', { size, weight: 700 }) + size * 0.06;
      let x = x0;
      const laid = L.words.map((wd) => { const w = api.measure(ctx, wd.w, { size, weight: 700, tracking: 1 }); const r = { ...wd, str: wd.w, x, w, y: L.y, size }; x += w + gap; return r; });
      // lime boxes first: one box per run of consecutive hl words, its right edge sweeping out word by word
      const runs = []; let cur = null;
      for (const r of laid) { if (r.hl) { if (!cur) runs.push(cur = []); cur.push(r); } else cur = null; }
      for (const run of runs) {
        const pad = size * 0.16, top = run[0].y - size * 0.86, h = size * 1.08, left = run[0].x - pad;
        let right = left;
        for (const r of run) { const k = ease.outCubic(clamp((t - r.t + 0.04) / 0.14)); if (k <= 0) break; right = right + (r.x + r.w + pad - right) * k; }
        if (right <= left + 0.5) continue;
        ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1);
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 7; ctx.fillStyle = run[0].bg || P.lime;
        ctx.beginPath(); ctx.moveTo(left, top + 2); ctx.lineTo(right, top); ctx.lineTo(right + 2, top + h); ctx.lineTo(left - 1, top + h + 2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      for (const r of laid) {
        const p = api.pop(t, r.t - 0.03, 0.42); if (p <= 0) continue;
        const cx = r.x + r.w / 2, cy = r.y - size * 0.3, s = 0.55 + 0.45 * p;
        ctx.save(); ctx.globalAlpha *= clamp(p * 2.2) * (o.alpha ?? 1);
        ctx.translate(cx, cy + (1 - clamp(p)) * size * 0.25); ctx.scale(s, s); ctx.translate(-cx, -cy);
        if (r.hl) api.text(ctx, r.str, r.x, r.y, { size, weight: 700, tracking: 1, color: r.color || P.black });
        else api.text(ctx, r.str, r.x, r.y, { size, weight: 700, tracking: 1, color: r.color || o.color || P.ink, stroke: 'rgba(12,8,28,0.92)', strokeWidth: size * 0.13, shadow: 'rgba(8,4,20,0.5)', shadowBlur: 20, shadowY: 6 });
        ctx.restore();
        boxes.push(r);
      }
    }
    return boxes;
  }

  // lime sticker chip with a hand-drawn black check at its left; pops (outBack) from its left-centre, settles at rot.
  // parts: optional second string (appended later at t2 with the chip growing to fit). Returns the chip width.
  function checkChip(ctx, api, str, x, y, p, o = {}) {
    const { P, clamp, ease } = api, size = o.size || 58, padX = size * 0.4, h = size * 1.32, ck = o.check === false ? 0 : size * 0.95;
    const w1 = api.measure(ctx, str, { size, weight: 700, tracking: 1.5 });
    const w2 = o.more ? api.measure(ctx, o.more, { size, weight: 700, tracking: 1.5 }) : 0;
    const k2 = o.more ? ease.outCubic(clamp(o.p2 || 0)) : 0;
    const w = ck + padX * 2 + w1 + w2 * k2;
    if (p <= 0) return w;
    ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot || 0) + (1 - clamp(p)) * -0.12); const s = 0.4 + 0.6 * p; ctx.scale(s, s);
    ctx.globalAlpha *= clamp(p * 2);
    ctx.shadowColor = 'rgba(10,6,24,0.4)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 9;
    ctx.fillStyle = o.bg || P.lime; api.roundRect(ctx, 0, -h / 2, w, h, 8); ctx.fill();
    ctx.shadowColor = 'transparent';
    if (ck) api.doodle.check(ctx, padX + ck * 0.36, -size * 0.04, size * 0.3, clamp((p - 0.35) / 0.5) , { color: P.black, width: size * 0.11, seed: o.seed || 5, passes: 1, wobble: 1.5 });
    api.text(ctx, str, padX + ck, size * 0.36, { size, weight: 700, tracking: 1.5, color: P.black });
    if (o.more && k2 > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(padX + ck + w1, -h / 2, w2 * k2 + 4, h); ctx.clip();
      api.text(ctx, o.more, padX + ck + w1, size * 0.36, { size, weight: 700, tracking: 1.5, color: P.black }); ctx.restore();
    }
    ctx.restore();
    return w;
  }

  // ================================================================ phase 2: premium type, glass, timing helpers
  // planned end of a scene in scene seconds, from its anchorEnd (the render adds `tail` after it)
  function endT(api, a) { return (a.edge === 'end' ? api.atEnd(a.word) : api.at(a.word)) + (a.offset || 0); }

  // per-character reveal: each glyph rises, fades in and slides from the right into its final tracking, staggered;
  // `lt` = seconds since this line started; `out` = 0..1 exit (glyphs lift and fade, left first). Returns the width.
  const prefixCache = new Map();
  function charType(ctx, api, str, x, y, lt, o = {}) {
    const size = o.size || 60, f = { size, weight: o.weight || 700, family: o.family, tracking: o.tracking ?? 2 };
    const key = str + '|' + JSON.stringify(f);
    let xs = prefixCache.get(key);
    if (!xs) { xs = []; const ch = [...str]; for (let i = 0; i <= ch.length; i++) xs.push(api.measure(ctx, ch.slice(0, i).join(''), f)); prefixCache.set(key, xs); }
    if (lt <= 0) return xs[xs.length - 1];
    const chars = [...str], st = o.stagger ?? 0.022, dur = o.dur ?? 0.46, out = o.out || 0, n = chars.length;
    for (let i = 0; i < n; i++) {
      if (chars[i] === ' ') continue;
      const e = api.ease.outCubic(api.clamp((lt - i * st) / dur));
      const eo = api.ease.inCubic(api.clamp(out * 1.6 - (i / n) * 0.6));
      const a = e * (1 - eo); if (a <= 0.003) continue;
      const dx = (1 - e) * size * 0.34, dy = (1 - e) * size * 0.3 - eo * size * 0.35;
      ctx.save(); ctx.globalAlpha *= a;
      if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = (o.glowBlur ?? 18) * (0.6 + 0.4 * (1 - e)); }
      api.text(ctx, chars[i], x + xs[i] + dx, y + dy, { ...f, color: o.color || api.P.ink });
      ctx.restore();
    }
    return xs[xs.length - 1];
  }

  // glass card: layered depth (wide soft shadow + contact shadow), top-lit gradient, key-light bloom from the top-left,
  // hairline border with a bright top edge, optional diagonal light sweep (sweep 0..1). open 0..1 wipes it from the left.
  let cardNoise = null;
  function glassCard(ctx, api, x, y, w, h, o = {}) {
    const open = o.open ?? 1; if (open <= 0) return;
    const r = o.r ?? 16, ww = Math.max(r * 2 + 2, w * open), P = api.P, tint = o.tint || '167,139,250';
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(48,42,88,0.94)'); g.addColorStop(0.5, 'rgba(22,18,44,0.94)'); g.addColorStop(1, 'rgba(10,9,22,0.95)');
    if (o.glow) { ctx.save(); ctx.shadowColor = o.glow; ctx.shadowBlur = 70; ctx.fillStyle = g; api.roundRect(ctx, x, y, ww, h, r); ctx.fill(); ctx.restore(); }
    ctx.shadowColor = 'rgba(0,0,0,0.42)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
    if (o.blur > 0.3) ctx.filter = 'blur(' + o.blur.toFixed(1) + 'px)';
    ctx.fillStyle = g; api.roundRect(ctx, x, y, ww, h, r); ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; ctx.fill();
    ctx.filter = 'none';
    ctx.shadowColor = 'transparent';
    ctx.save(); api.roundRect(ctx, x, y, ww, h, r); ctx.clip();
    const kg = ctx.createRadialGradient(x + 40, y - 10, 0, x + 40, y - 10, Math.max(w, h) * 0.9);
    kg.addColorStop(0, `rgba(${tint},0.22)`); kg.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = kg; ctx.fillRect(x, y, ww, h);
    // fine surface texture (static noise tile, low alpha)
    if (!cardNoise) { cardNoise = document.createElement('canvas'); cardNoise.width = cardNoise.height = 192; const ng = cardNoise.getContext('2d'), id = ng.createImageData(192, 192), rn = api.rand('card-noise'); for (let i = 0; i < id.data.length; i += 4) { const v = 110 + rn() * 145; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } ng.putImageData(id, 0, 0); }
    ctx.globalAlpha *= 0.05; ctx.fillStyle = ctx.createPattern(cardNoise, 'repeat'); ctx.globalCompositeOperation = 'overlay'; ctx.fillRect(x, y, ww, h); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha /= 0.05;
    if (o.draw) o.draw();
    const sw = o.sweep;
    if (sw != null && sw > 0 && sw < 1) {
      const sx = x - h + (ww + h * 2) * sw, bw = 120;
      const lg = ctx.createLinearGradient(sx - bw, 0, sx + bw, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,' + (o.sweepAlpha ?? 0.3) + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(sx - bw + h * 0.45, y); ctx.lineTo(sx + bw + h * 0.45, y); ctx.lineTo(sx + bw - h * 0.45, y + h); ctx.lineTo(sx - bw - h * 0.45, y + h); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1.5; api.roundRect(ctx, x + 0.75, y + 0.75, ww - 1.5, h - 1.5, r - 0.5); ctx.stroke();
    if (o.accent) { const bg = ctx.createLinearGradient(x, 0, x + ww, 0); bg.addColorStop(0, 'rgba(' + o.accent.join(',') + ',0.55)'); bg.addColorStop(0.7, 'rgba(' + o.accent.join(',') + ',0.08)'); bg.addColorStop(1, 'rgba(' + o.accent.join(',') + ',0)'); ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + r, y + h - 1); ctx.lineTo(x + ww - r, y + h - 1); ctx.stroke(); }
    const tg = ctx.createLinearGradient(x, 0, x + ww, 0); tg.addColorStop(0, 'rgba(255,255,255,0.42)'); tg.addColorStop(0.6, 'rgba(255,255,255,0.08)'); tg.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.strokeStyle = tg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + r, y + 0.9); ctx.lineTo(x + ww - r, y + 0.9); ctx.stroke();
    ctx.restore();
  }

  // an official logo image, trimmed to its visible pixels (alpha bbox) and prepared for a crisp, undistorted reveal.
  // makeLogo(api, img, h) -> { img, bbox: [x, y, w, h] in image px, w, h in design px, off: offscreen at render scale }
  function makeLogo(api, img, h) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d');
    g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const bbox = [x0, y0, x1 - x0 + 1, y1 - y0 + 1], w = h * bbox[2] / bbox[3];
    // the trimmed logo pre-scaled once to its on-screen pixel size (high-quality downsample in steps, never upscaled)
    const S = api.scale, tw = Math.round(w * S), th = Math.round(h * S);
    let src = document.createElement('canvas'); src.width = bbox[2]; src.height = bbox[3]; src.getContext('2d').drawImage(img, x0, y0, bbox[2], bbox[3], 0, 0, bbox[2], bbox[3]);
    while (src.width / 2 > tw) { const n = document.createElement('canvas'); n.width = Math.round(src.width / 2); n.height = Math.round(src.height / 2); const ng = n.getContext('2d'); ng.imageSmoothingQuality = 'high'; ng.drawImage(src, 0, 0, n.width, n.height); src = n; }
    const fin = document.createElement('canvas'); fin.width = tw; fin.height = th; const fg = fin.getContext('2d'); fg.imageSmoothingQuality = 'high'; fg.drawImage(src, 0, 0, tw, th);
    const off = document.createElement('canvas'); off.width = tw + 2; off.height = th + 2;
    return { img, bbox, w, h, S, sharp: fin, off };
  }
  // soft-edged left-to-right wipe with a slight rise and fade (no scaling, so the logo is never distorted); out lifts it away
  function logoReveal(ctx, api, L, x, y, lt, out = 0) {
    if (lt <= 0) return;
    const { ease, clamp } = api, p = ease.outCubic(clamp(lt / 0.75)), soft = 0.22;
    const a = clamp(lt / 0.35) * (1 - ease.inCubic(clamp(out * 1.4)));
    if (a <= 0.003) return;
    const g = L.off.getContext('2d'), W2 = L.sharp.width;
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, L.off.width, L.off.height); g.drawImage(L.sharp, 0, 0);
    if (p < 1) {
      const e = p * (1 + soft) * W2, m = g.createLinearGradient(e - soft * W2, 0, e, 0);
      m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-in'; g.fillStyle = m; g.fillRect(0, 0, L.off.width, L.off.height);
    }
    const dy = (1 - p) * 12 - ease.inCubic(clamp(out)) * 16;
    ctx.save(); ctx.globalAlpha *= a; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
    // snap to the device pixel grid so the pre-scaled logo maps 1:1 onto output pixels (crisp at 4K)
    const S = L.S, px = Math.round(x * S) / S, py = Math.round((y + dy) * S) / S;
    ctx.drawImage(L.off, px, py, L.off.width / S, L.off.height / S);
    ctx.restore();
  }

  // premium lower third: glass card opens, a glowing accent bar draws down, the name types in glyph by glyph, the sub
  // line wipes on with a hairline rule, one light sweep crosses it; exits by lifting the glyphs and folding the card.
  // o: { name, sub, t0, tSub, end, x, y, accent: [r,g,b], nameSize, subSize, family, weight, nameTracking }
  function lowerThird(ctx, api, t, o) {
    const { prog, ease, P } = api;
    const X = o.x ?? 96, Y = o.y ?? 850, ns = o.nameSize || 72, ss = o.subSize || 34, t0 = o.t0, end = o.end;
    const acc = o.accent || [215, 243, 74], accS = `rgb(${acc.join(',')})`;
    const nf = { size: ns, weight: o.weight || 700, family: o.family, tracking: o.nameTracking ?? 2 };
    const nameW = o.logo ? o.logo.w : api.measure(ctx, o.name, nf), subW = api.measure(ctx, o.sub, { size: ss, weight: 700, tracking: 7 });
    const padL = 50, w = Math.max(nameW, subW + 70) + padL + 44, h = ns * 1.02 + ss + 58;
    const out = prog(t, end - 0.46, 0.4, ease.inCubic), outFold = prog(t, end - 0.3, 0.26, ease.inCubic);
    const open = prog(t, t0, 0.62, ease.outExpo) * (1 - outFold);
    if (open <= 0) return { out };
    const y = Y + (1 - prog(t, t0, 0.7, ease.outExpo)) * 18;
    glassCard(ctx, api, X, y, w, h, { open, sweep: prog(t, t0 + 0.62, 1.1, ease.inOutSine), tint: o.tint, accent: acc, glow: 'rgba(' + acc.join(',') + ',0.16)', blur: 10 * (1 - prog(t, t0, 0.4, ease.outCubic)) });
    ctx.save(); api.roundRect(ctx, X, y, Math.max(34, w * open), h, 16); ctx.clip();
    // accent bar with glow
    const bp = prog(t, t0 + 0.1, 0.42, ease.outCubic) * (1 - out);
    if (bp > 0) { ctx.save(); ctx.shadowColor = `rgba(${acc.join(',')},0.9)`; ctx.shadowBlur = 16; ctx.fillStyle = accS; ctx.fillRect(X + 22, y + 20, 5, (h - 40) * bp); ctx.restore(); }
    if (o.logo) logoReveal(ctx, api, o.logo, X + padL, y + (o.logo.top ?? 22), t - (t0 + 0.2), out);
    else charType(ctx, api, o.name, X + padL, y + 20 + ns * 0.9, t - (t0 + 0.2), { ...nf, out, stagger: o.stagger ?? 0.02 });
    const sp = prog(t, o.tSub, 0.5, ease.outCubic) * (1 - out);
    if (sp > 0) {
      const sy = y + 20 + ns * 1.02 + ss * 0.95 + 4;
      ctx.save(); ctx.beginPath(); ctx.rect(X + padL - 4, sy - ss * 1.1, (subW + 12) * sp, ss * 1.5); ctx.clip();
      api.text(ctx, o.sub, X + padL, sy, { size: ss, weight: 700, tracking: 7, color: accS });
      ctx.restore();
      const rp = prog(t, o.tSub + 0.25, 0.6, ease.inOutCubic) * (1 - out);
      if (rp > 0) { const rx = X + padL + subW + 22, rw = Math.max(0, w - (rx - X) - 30); ctx.fillStyle = `rgba(${acc.join(',')},0.45)`; ctx.fillRect(rx, sy - ss * 0.36, rw * rp, 2); }
    }
    ctx.restore();
    return { out, w, h };
  }

  // hand-drawn price tag hanging from its hole (hx, hy), rotated rot; paper body, marker outline, punched hole
  function priceTag(ctx, api, hx, hy, w, h, rot, p, o = {}) {
    if (p <= 0) return;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(rot); ctx.globalAlpha *= api.clamp(p * 2);
    const body = () => { ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(0, -h / 2); ctx.lineTo(w - 14, -h / 2); ctx.quadraticCurveTo(w, -h / 2, w, -h / 2 + 14); ctx.lineTo(w, h / 2 - 14); ctx.quadraticCurveTo(w, h / 2, w - 14, h / 2); ctx.lineTo(0, h / 2); ctx.closePath(); };
    // shadow + paper
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 16;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#fbf7ec'); g.addColorStop(1, '#e9e1cc');
    ctx.fillStyle = g; body(); ctx.fill(); ctx.restore();
    // paper fibres (deterministic)
    const A = ctx.globalAlpha;
    ctx.save(); body(); ctx.clip(); const rnd = api.rand('tag-fibres');
    for (let i = 0; i < 90; i++) { ctx.globalAlpha = A * (0.05 + rnd() * 0.06); ctx.strokeStyle = rnd() < 0.5 ? '#8a7f66' : '#ffffff'; ctx.lineWidth = 1; const x = -30 + rnd() * (w + 30), y = -h / 2 + rnd() * h, a = rnd() * 3.14, l = 4 + rnd() * 12; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
    // soft light from the top-left, darker toward the tip
    const lg = ctx.createLinearGradient(-30, -h / 2, w, h / 2); lg.addColorStop(0, 'rgba(255,255,255,0.25)'); lg.addColorStop(1, 'rgba(90,70,40,0.12)');
    ctx.globalAlpha = A; ctx.fillStyle = lg; ctx.fillRect(-40, -h, w + 60, h * 2);
    if (o.draw) o.draw();
    ctx.restore();
    // marker outline + reinforced hole ring
    const pts = [[-34, 0], [0, -h / 2], [w - 10, -h / 2], [w, -h / 2 + 10], [w, h / 2 - 10], [w - 10, h / 2], [0, h / 2], [-34, 0]];
    api.doodle.stroke(ctx, pts, api.clamp(p * 1.4), { color: '#1b1a22', width: 4.5, seed: o.seed || 131, wobble: 1.6, passes: 1 });
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(160,140,100,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // line-art nose (white, glowing) in profile, pointing dir (1 right, -1 left): for the "a mile away" measure
  function noseLine(ctx, api, x, y, s, p, o = {}) {
    const dir = o.dir || 1, clamp = api.clamp;
    const segs = [[[0, -1.0], [0.06, -0.55], [0.36, -0.12], [0.52, 0.16]], [[0.52, 0.16], [0.64, 0.36], [0.52, 0.56], [0.32, 0.5]],
      [[0.32, 0.5], [0.24, 0.47], [0.2, 0.36], [0.11, 0.38]], [[0.11, 0.38], [0.02, 0.42], [0.02, 0.56], [-0.06, 0.6]]];
    const pts = [];
    for (const [a, b, c, d] of segs) for (let i = 0; i <= 12; i++) {
      const u = i / 12, v = 1 - u, bx = v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], by = v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1];
      pts.push([x + dir * bx * s, y + by * s]);
    }
    const opt = { color: o.color || '#ffffff', width: o.width || 4, seed: 57, wobble: 0.8, passes: 1, glow: o.glow || 'rgba(255,255,255,0.55)' };
    api.doodle.stroke(ctx, pts, clamp(p / 0.8), opt);
    api.doodle.stroke(ctx, [[x + dir * s * 0.2, y + s * 0.44], [x + dir * s * 0.3, y + s * 0.4]], clamp((p - 0.75) / 0.25), opt);
  }

  // ambient light from a video frame: the frame shrunk to a tiny canvas and scaled back up (a cheap, very soft blur),
  // drawn over rect with alpha; o.mask = an optional canvas (same aspect as rect) whose alpha shapes it
  const amb = { small: null, big: null };
  function ambient(ctx, api, img, rect, o = {}) {
    if (!img) return;
    if (!amb.small) { amb.small = document.createElement('canvas'); amb.small.width = 48; amb.small.height = 48; }
    const s = amb.small.getContext('2d'); s.clearRect(0, 0, 48, 48);
    const iw = img.width, ih = img.height, k = Math.max(48 / iw, 48 / ih); s.drawImage(img, (48 - iw * k) / 2, (48 - ih * k) / 2, iw * k, ih * k);
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 0.6; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (o.mask) {
      const S = 2; if (!amb.big || amb.big.width !== Math.round(rect.w * S / 4)) { amb.big = document.createElement('canvas'); amb.big.width = Math.round(rect.w * S / 4); amb.big.height = Math.round(rect.h * S / 4); }
      const b = amb.big.getContext('2d'); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, amb.big.width, amb.big.height);
      b.drawImage(amb.small, -amb.big.width * 0.1, -amb.big.height * 0.1, amb.big.width * 1.2, amb.big.height * 1.2);
      b.globalCompositeOperation = 'destination-in'; b.drawImage(o.mask, 0, 0, amb.big.width, amb.big.height);
      ctx.drawImage(amb.big, rect.x, rect.y, rect.w, rect.h);
    } else ctx.drawImage(amb.small, rect.x - rect.w * 0.1, rect.y - rect.h * 0.1, rect.w * 1.2, rect.h * 1.2);
    ctx.restore();
  }

  window.OV = { halo, hand, mark, pill, word, popAt, makePhone, cover, track, grimace, nose, noseLine, kinetic, lowerThird, checkChip, charType, glassCard, priceTag, endT, ambient, makeLogo, logoReveal, HALO };
})();
