/* Shared drawing for the "real" group (bad-breath-for-good): the "this is real" texture — real web pages as lit sheets
 * with a highlighter and a marker circle, news clippings, a microscope field for real micrographs, a film gate for
 * archival ads/film, a photo card, and the small SOURCE credit. Loaded with
 *   // @use videos/bad-breath-for-good/scenes/real/_lib.js
 * Every real image lives in assets/web/ and is listed in assets/web/sources.json. Web captures come with a .json of
 * text rectangles (CSS px, from capture.mjs), so highlights and circles land on the real words.
 */
window.REAL = (function () {
  const W = 1920, H = 1080, WEB = 'videos/bad-breath-for-good/assets/web/';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const img = (file) => ({ image: WEB + file });
  async function meta(name) { const r = await fetch('/' + WEB + name + '.json', { cache: 'no-store' }); return r.json(); }

  // ------------------------------------------------------------------ offscreen layers at the output resolution
  function layer(api) { const c = document.createElement('canvas'); c.width = Math.round(W * api.scale); c.height = Math.round(H * api.scale); return c.getContext('2d'); }
  function begin(g, api) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
    g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.setTransform(api.scale, 0, 0, api.scale, 0, 0);
  }
  // depth of field: `sharp` holds the finished frame; draw it blurred, then a sharp copy masked to a horizontal band
  // (focusY ± band, feathered over `feather`), like a macro lens focused on one line of text.
  function dof(ctx, api, sharp, mask, focusY, band, feather, blur) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = `blur(${(blur * api.scale).toFixed(1)}px)`; ctx.drawImage(sharp.canvas, 0, 0); ctx.filter = 'none';
    begin(mask, api); mask.drawImage(sharp.canvas, 0, 0, W, H);
    mask.globalCompositeOperation = 'destination-in';
    const y0 = focusY - band - feather, y1 = focusY + band + feather;
    const gr = mask.createLinearGradient(0, y0, 0, y1), a = feather / (y1 - y0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(a, 'rgba(0,0,0,1)'); gr.addColorStop(1 - a, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    mask.fillStyle = gr; mask.fillRect(0, 0, W, H);
    ctx.drawImage(mask.canvas, 0, 0); ctx.restore();
  }

  // ------------------------------------------------------------------ backgrounds
  function desk(ctx, api, t, o = {}) {           // dark, softly lit surface the paper lies on
    const g = ctx.createRadialGradient(W * (o.cx ?? 0.42), H * (o.cy ?? 0.4), 40, W * 0.5, H * 0.5, W * 0.8);
    g.addColorStop(0, o.c1 || '#1e1a33'); g.addColorStop(0.55, o.c2 || '#110f1f'); g.addColorStop(1, '#07060d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (o.grid !== false) {
      ctx.save(); ctx.strokeStyle = 'rgba(160,150,255,0.05)'; ctx.lineWidth = 1; ctx.beginPath();
      const off = (t * 6) % 60;
      for (let x = -60 + off; x < W; x += 60) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = -60 + off * 0.5; y < H; y += 60) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke(); ctx.restore();
    }
  }

  // ------------------------------------------------------------------ web page as a lit sheet
  // cam: { x, y } screen point where page point { fx, fy } (CSS px of the capture) lands, s = design px per CSS px, rot
  function pageXf(g, cam) { g.translate(cam.x, cam.y); g.rotate(cam.rot || 0); g.scale(cam.s, cam.s); g.translate(-cam.fx, -cam.fy); }
  function sheet(g, api, im, m, cam, o = {}) {
    const w = m.clip.w, h = m.clip.h;
    g.save(); pageXf(g, cam);
    g.shadowColor = 'rgba(0,0,0,0.62)'; g.shadowBlur = (o.shadow ?? 60) * api.scale; g.shadowOffsetY = (o.shadowY ?? 22) * api.scale;
    g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, w, h); g.shadowColor = 'transparent';
    g.drawImage(im, 0, 0, w, h);
    // printed-paper warmth + a key light from the top left (so it is a lit object, not a flat screenshot)
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgba(246,240,226,0.55)'; g.fillRect(0, 0, w, h);
    const lg = g.createRadialGradient(w * 0.25, h * 0.1, 50, w * 0.45, h * 0.45, Math.max(w, h) * 0.95);
    lg.addColorStop(0, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(206,200,214,1)');
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    // a faint sheen band sliding across (light catching the surface)
    if (o.sheen != null) {
      const sx = lerp(-w * 0.3, w * 1.3, o.sheen);
      const sg = g.createLinearGradient(sx - 220, 0, sx + 220, h * 0.2);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.16)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg; g.fillRect(0, 0, w, h);
    }
    g.restore();
  }
  // highlighter swept over CSS rects (one per line), in order, p 0..1; call inside pageXf
  function highlight(g, rects, p, o = {}) {
    if (!rects || p <= 0) return;
    const total = rects.reduce((s, r) => s + r.w, 0); let acc = 0;
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = o.color || '#dcf046'; g.globalAlpha *= o.alpha ?? 0.92;
    for (const r of rects) {
      const f = clamp((p * total - acc) / r.w); acc += r.w; if (f <= 0) break;
      const pad = o.pad ?? 3, x = r.x - pad, y = r.y - pad * 0.3, w = (r.w + pad * 2) * f, h = r.h + pad * 0.6;
      g.beginPath(); g.moveTo(x, y + 1.2); g.lineTo(x + w, y - 0.4); g.lineTo(x + w + 0.8, y + h); g.lineTo(x - 0.8, y + h + 0.8); g.closePath(); g.fill();
    }
    g.restore();
  }
  // marker circle around one CSS rect; call inside pageXf with the camera scale s so the stroke stays ~width design px
  function ring(g, api, r, p, s, o = {}) {
    if (p <= 0) return;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    api.doodle.circle(g, cx, cy, r.w / 2 + (o.padX ?? 12), r.h / 2 + (o.padY ?? 9), p, { color: o.color || api.P.marker, width: (o.width ?? 8) / s, wobble: 2.2 / s, seed: o.seed ?? 5, turns: o.turns ?? 1.1 });
  }
  function underline(g, api, r, p, s, o = {}) {
    if (p <= 0) return;
    api.doodle.underline(g, r.x - 4, r.x + r.w + 4, r.y + r.h + (o.dy ?? 4), p, { color: o.color || api.P.marker, width: (o.width ?? 7) / s, wobble: 1.8 / s, seed: o.seed ?? 9 });
  }
  // screen position of a page point under a camera (for placing screen-space labels next to page words)
  function toScreen(cam, px, py) {
    const c = Math.cos(cam.rot || 0), s = Math.sin(cam.rot || 0), dx = (px - cam.fx) * cam.s, dy = (py - cam.fy) * cam.s;
    return [cam.x + dx * c - dy * s, cam.y + dx * s + dy * c];
  }

  // ------------------------------------------------------------------ small print, flashes, HUD
  function source(ctx, api, txt, o = {}) {
    const x = o.x ?? 58, y = o.y ?? 1034, size = o.size ?? 22;
    const s1 = o.label ?? 'SOURCE', s2 = String(txt).toUpperCase();
    const w1 = api.measure(ctx, s1, { size, weight: 700, tracking: 1.6 }), w2 = api.measure(ctx, s2, { size, weight: 600, tracking: 1.2 });
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    ctx.fillStyle = 'rgba(8,8,14,0.66)'; api.roundRect(ctx, x - 12, y - size - 5, w1 + w2 + 36, size + 17, 6); ctx.fill();
    api.text(ctx, s1, x, y, { size, weight: 700, color: api.P.lime, tracking: 1.6 });
    api.text(ctx, s2, x + w1 + 12, y, { size, weight: 600, color: 'rgba(244,241,234,0.86)', tracking: 1.2 });
    ctx.restore();
  }
  function tag(ctx, api, txt, o = {}) {           // tiny top-right note, the counterpart of "* ARTISTIC RENDERING"
    api.text(ctx, txt, o.x ?? 1862, o.y ?? 58, { size: o.size ?? 20, weight: 600, align: 'right', color: o.color || 'rgba(244,241,234,0.55)', tracking: 2 });
  }
  function flash(ctx, t, t0, o = {}) {           // camera-shutter flash (o.rect = [x, y, w, h] in current coords)
    const k = (t - t0) / (o.dur ?? 0.16); if (k < 0 || k > 1) return;
    const [x, y, w, h] = o.rect || [0, 0, W, H];
    ctx.save(); ctx.globalAlpha = (o.peak ?? 0.55) * Math.pow(1 - k, 2); ctx.fillStyle = o.color || '#fff'; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  function brackets(ctx, o = {}) {               // viewfinder corner brackets
    const x = o.x ?? 64, y = o.y ?? 64, w = o.w ?? W - 128, h = o.h ?? H - 128, L = o.len ?? 64;
    ctx.save(); ctx.strokeStyle = o.color || 'rgba(255,255,255,0.8)'; ctx.lineWidth = o.width ?? 3; ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
    ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
    ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
    ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
    ctx.stroke(); ctx.restore();
  }
  function shake(ctx, api, t, t0, amp = 10, dur = 0.22) {   // small camera kick when something lands
    const k = (t - t0) / dur; if (k < 0 || k > 1) return;
    const a = amp * Math.pow(1 - k, 2), r = api.rand('shake' + Math.round(t * 30));
    ctx.translate((r() - 0.5) * a, (r() - 0.5) * a);
  }

  // ------------------------------------------------------------------ microscope field
  // A round field (like looking down an eyepiece) with the real micrograph inside: focus pull on entry, slow push,
  // lens rim, tick ring, crosshair, viewfinder brackets. o: { cx, cy, r, ix, iy (image focus 0..1), zoom0, zoom1,
  // t0 (entry), focusDur, blur, rot }
  function scope(ctx, api, t, im, o = {}) {
    const cx = o.cx ?? W / 2, cy = o.cy ?? H / 2, R = o.r ?? 440, t0 = o.t0 ?? 0;
    const bg = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, W * 0.75);
    bg.addColorStop(0, '#0d0c16'); bg.addColorStop(1, '#030306');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const k = clamp((t - t0) / (o.dur ?? 3));
    const z = lerp(o.zoom0 ?? 1.0, o.zoom1 ?? 1.12, api.ease.inOutSine(k)) * (o.zoomMul ?? 1);
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    const base = (2 * R) / Math.min(iw, ih), sc = base * z * (o.fit ?? 1.02);
    const ix = (o.ix ?? 0.5) * iw + (o.driftX ?? 0) * k, iy = (o.iy ?? 0.5) * ih + (o.driftY ?? 0) * k;
    let blur = (o.blur ?? 14) * (1 - api.ease.outCubic(clamp((t - t0) / (o.focusDur ?? 0.45))));
    if (o.refocusAt != null && t >= o.refocusAt) blur = Math.max(blur, (o.blur ?? 14) * 0.7 * (1 - api.ease.outCubic(clamp((t - o.refocusAt) / 0.3))));
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.translate(cx, cy); ctx.rotate((o.rot ?? 0.03) * k); ctx.scale(sc, sc); ctx.translate(-ix, -iy);
    if (blur > 0.3) ctx.filter = `blur(${(blur * api.scale / sc).toFixed(2)}px)`;
    ctx.drawImage(im, 0, 0, iw, ih); ctx.filter = 'none';
    ctx.restore();
    // lens falloff inside the field
    ctx.save();
    const fall = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
    fall.addColorStop(0, 'rgba(0,0,0,0)'); fall.addColorStop(0.82, 'rgba(0,0,0,0.25)'); fall.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = fall; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, Math.PI * 2); ctx.fill();
    // rim: a thin bright bevel + a soft outer glow
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(200,196,230,0.35)'; ctx.beginPath(); ctx.arc(cx, cy, R + 2, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, R + 6, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
    // tick ring
    ctx.strokeStyle = 'rgba(244,241,234,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let a = 0; a < 72; a++) { const an = a / 72 * Math.PI * 2 + (o.tickRot ?? 0) * k, l = a % 6 === 0 ? 18 : 8; ctx.moveTo(cx + Math.cos(an) * (R + 16), cy + Math.sin(an) * (R + 16)); ctx.lineTo(cx + Math.cos(an) * (R + 16 + l), cy + Math.sin(an) * (R + 16 + l)); }
    ctx.stroke();
    // crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(cx - 22, cy); ctx.lineTo(cx - 8, cy); ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 22, cy);
    ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy - 8); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 22); ctx.stroke();
    ctx.restore();
    return { sc, ix, iy, cx, cy, R };
  }
  // scale bar in design px for a real length in image px (sc = design px per image px from scope())
  function scaleBar(ctx, api, x, y, lenPx, label, o = {}) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 5; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x - lenPx, y); ctx.lineTo(x, y); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - lenPx, y - 9); ctx.lineTo(x - lenPx, y + 9); ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9); ctx.stroke();
    api.text(ctx, label, x - lenPx / 2, y - 18, { size: o.size ?? 30, weight: 700, align: 'center', color: '#fff', shadow: 'rgba(0,0,0,0.8)', shadowBlur: 10, shadowY: 2, family: 'body' });
    ctx.restore();
  }

  // ------------------------------------------------------------------ film gate (archival)
  // Cleo's archival frame: a 4:3 gate with rounded corners on black, a pale-gold perforation outline at the left, film
  // grain, gate weave, flicker, dust and the odd scratch. drawContent(ctx, gx, gy, gw, gh) paints the picture.
  const GATE = { x: 262, y: 10, w: 1412, h: 1060, r: 30 };
  function filmGate(ctx, api, t, drawContent, o = {}) {
    const f = Math.round(t * 30), rnd = api.rand('gate' + f + (o.seed || ''));
    ctx.fillStyle = '#040405'; ctx.fillRect(0, 0, W, H);
    // weave: sub-pixel jitter + an occasional slip
    const nz = api.noise('weave' + (o.seed || ''));
    const wx = nz(t * 7, 1) * 2.2 + (rnd() < 0.04 ? (rnd() - 0.5) * 5 : 0), wy = nz(t * 6, 5) * 2.6 + (rnd() < 0.05 ? (rnd() - 0.5) * 7 : 0), wr = nz(t * 3, 9) * 0.0016;
    const g = GATE;
    ctx.save();
    ctx.translate(g.x + g.w / 2 + wx, g.y + g.h / 2 + wy); ctx.rotate(wr); ctx.translate(-(g.x + g.w / 2), -(g.y + g.h / 2));
    ctx.save(); api.roundRect(ctx, g.x, g.y, g.w, g.h, g.r); ctx.clip();
    ctx.fillStyle = '#111'; ctx.fillRect(g.x, g.y, g.w, g.h);
    drawContent(ctx, g.x, g.y, g.w, g.h);
    // film stock: lifted blacks, warm fade, flicker
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(38,30,22,${o.lift ?? 0.55})`; ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.tint || 'rgba(255,236,205,1)'; ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.globalCompositeOperation = 'source-over';
    const fl = 0.03 + rnd() * 0.07; ctx.fillStyle = `rgba(0,0,0,${fl})`; ctx.fillRect(g.x, g.y, g.w, g.h);
    // gate vignette (hot centre, burnt edges)
    const vg = ctx.createRadialGradient(g.x + g.w / 2, g.y + g.h / 2, g.h * 0.3, g.x + g.w / 2, g.y + g.h / 2, g.h * 0.86);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = vg; ctx.fillRect(g.x, g.y, g.w, g.h);
    // dust and hair (a new set every frame)
    const nd = 3 + Math.floor(rnd() * 6);
    for (let i = 0; i < nd; i++) {
      const x = g.x + rnd() * g.w, y = g.y + rnd() * g.h, r = 0.8 + rnd() * 2.6;
      ctx.fillStyle = rnd() < 0.7 ? `rgba(0,0,0,${0.35 + rnd() * 0.4})` : `rgba(255,250,235,${0.3 + rnd() * 0.4})`;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.5 + rnd()), rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
    if (rnd() < 0.18) {
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
      let x = g.x + rnd() * g.w, y = g.y + rnd() * g.h; ctx.moveTo(x, y);
      for (let i = 0; i < 6; i++) { x += (rnd() - 0.5) * 30; y += 6 + rnd() * 10; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    if (rnd() < 0.3) { const x = g.x + (0.15 + rnd() * 0.7) * g.w; ctx.fillStyle = `rgba(255,255,240,${0.06 + rnd() * 0.08})`; ctx.fillRect(x, g.y, 1.4, g.h); }
    // inner edge burn
    ctx.restore();
    ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.filter = `blur(${(6 * api.scale).toFixed(1)}px)`;
    api.roundRect(ctx, g.x + 4, g.y + 4, g.w - 8, g.h - 8, g.r); ctx.stroke(); ctx.filter = 'none';
    ctx.restore();
    // perforation outline (does not weave: it is the frame of the "projector")
    ctx.save(); ctx.strokeStyle = 'rgba(226,203,132,0.9)'; ctx.lineWidth = 3;
    api.roundRect(ctx, 70, 404, 250, 272, 30); ctx.stroke(); ctx.restore();
  }
  // image cover-fitted into a box with a Ken Burns move: fx, fy = focus (0..1 of the image), z = zoom over cover
  function cover(ctx, im, x, y, w, h, fx = 0.5, fy = 0.5, z = 1, o = {}) {
    const iw = im.naturalWidth || im.videoWidth || im.width, ih = im.naturalHeight || im.videoHeight || im.height;
    const s = Math.max(w / iw, h / ih) * z, dw = iw * s, dh = ih * s;
    let dx = x + w / 2 - fx * dw, dy = y + h / 2 - fy * dh;
    if (!o.free) { dx = Math.min(x, Math.max(x + w - dw, dx)); dy = Math.min(y, Math.max(y + h - dh, dy)); }
    if (o.filter) ctx.filter = o.filter;
    ctx.drawImage(im, dx, dy, dw, dh); ctx.filter = 'none';
    return { s, dx, dy };
  }

  // ------------------------------------------------------------------ cards (photo, clipping)
  // a crop (CSS px rect of a capture) drawn as a flat card with a cut edge and a shadow; centred at (x, y), width w
  function clipping(ctx, api, im, m, crop, x, y, w, rot, o = {}) {
    const d = m.dpr || 2, s = w / crop.w, h = crop.h * s;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = (o.shadow ?? 40) * api.scale; ctx.shadowOffsetY = 16 * api.scale;
    ctx.fillStyle = o.paper || '#fff'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowColor = 'transparent';
    ctx.drawImage(im, crop.x * d, crop.y * d, crop.w * d, crop.h * d, -w / 2, -h / 2, w, h);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(247,242,230,0.5)'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.globalCompositeOperation = 'source-over';
    if (o.after) { ctx.save(); ctx.translate(-w / 2, -h / 2); ctx.scale(s, s); ctx.translate(-crop.x, -crop.y); o.after(ctx, s); ctx.restore(); }
    ctx.restore();
    return { s, h };
  }

  // ------------------------------------------------------------------ the paper punch (wide page -> hard cut -> close-up)
  // cfg: { im, m, cut, wide: { fx, fy, s0, s1, x, y, rot0, rot1, enter, from: [dx, dy] }, close: { key | rect, fx, fy,
  //        s0, s1, x, y, dx, rot, blur }, marks: [{ kind: 'hl'|'ring'|'under', key, i, t0, dur, ...opts }], source }
  // Page marks live in page space, so they show in whichever shot frames them. Needs self.A / self.B layers.
  function paper(ctx, t, api, self, cfg) {
    const { ease, prog } = api, m = cfg.m, g = self.A;
    begin(g, api); desk(g, api, t, cfg.desk || {});
    let cam, focus = null;
    if (t < cfg.cut || !cfg.close) {
      // the slide is already underway on frame 1 (pre-rolled), so the cut never opens on an empty desk
      const w = cfg.wide, k = prog(t + (w.pre ?? 0.08), w.t0 ?? 0, w.enter ?? 0.55, ease.outExpo), d = clamp(t / Math.max(0.5, cfg.cut || api.duration));
      const [ex, ey] = (w.from || [140, 720]).map((v) => v * 0.6);
      cam = { x: (w.x ?? 960) + (1 - k) * ex, y: (w.y ?? 540) + (1 - k) * ey, fx: w.fx, fy: w.fy, s: lerp(w.s0, w.s1 ?? w.s0 * 1.05, d), rot: lerp(w.rot0 ?? -0.07, w.rot1 ?? -0.018, k) };
      sheet(g, api, cfg.im, m, cam, { sheen: d });
    } else {
      const c = cfg.close, u = t - cfg.cut, dd = clamp(u / Math.max(0.4, api.duration - cfg.cut));
      cam = { x: (c.x ?? 960) + (c.dx ?? -20) * dd, y: c.y ?? 540, fx: c.fx, fy: c.fy, s: lerp(c.s0, c.s1 ?? c.s0 * 1.05, dd), rot: c.rot ?? -0.012 };
      sheet(g, api, cfg.im, m, cam, { shadow: 30 });
      const rs = c.rect ? [c.rect] : m.rects[c.key];
      if (rs) { const top = Math.min(...rs.map((r) => r.y)), bot = Math.max(...rs.map((r) => r.y + r.h)); focus = { y: cam.y + ((top + bot) / 2 - cam.fy) * cam.s, band: (bot - top) / 2 * cam.s + (c.band ?? 26) }; }
    }
    g.save(); pageXf(g, cam);
    for (const mk of cfg.marks || []) {
      const rs = mk.rect ? [mk.rect] : m.rects[mk.key]; if (!rs) continue;
      const p = prog(t, mk.t0, mk.dur ?? 0.5, mk.ease || ease.inOutCubic);
      if (mk.kind === 'hl') highlight(g, mk.i != null ? [rs[mk.i]] : rs, p, mk);
      else if (mk.kind === 'ring') ring(g, api, rs[mk.i ?? 0], p, cam.s, mk);
      else if (mk.kind === 'under') underline(g, api, rs[mk.i ?? 0], p, cam.s, mk);
    }
    g.restore();
    if (focus) dof(ctx, api, g, self.B, focus.y, focus.band, cfg.close.feather ?? 110, cfg.close.blur ?? 5);
    else ctx.drawImage(g.canvas, 0, 0, W, H);
    if (cfg.source) source(ctx, api, cfg.source);
    if (cfg.close) flash(ctx, t, cfg.cut, { peak: 0.16, dur: 0.1 });
    return cam;
  }

  return { W, H, WEB, img, meta, layer, begin, dof, desk, pageXf, sheet, highlight, ring, underline, toScreen, source, tag, flash, brackets, shake, scope, scaleBar, GATE, filmGate, cover, clipping, paper, clamp, lerp };
})();
