/* Phase-2 kit for the `data` group: depth, light, cuts and 3D. Loaded after _lib.js:
 *   // @use videos/bad-breath-for-good/scenes/data/_lib.js
 *   // @use videos/bad-breath-for-good/scenes/data/_kit.js
 * Extends window.DATA (call DATA.init(api) in setup first).
 *
 *   shot(t, cuts)                     hard-cut helper: { i, t0, lt } = which shot is live, its start, time inside it
 *   cam3(o) -> project([x,y,z])        a pinhole camera for 3D point/figure worlds drawn in 2D (y up, floor y = 0)
 *   floorGrid(ctx, cam, o)            glowing perspective grid on the floor, fading into fog (Cleo's data floor)
 *   neon(ctx, pathFn, color, w, o)    glowing stroke: wide soft halo + mid glow + hot core
 *   bokeh(ctx, t, o)                  out-of-focus foreground/background discs (depth)
 *   blurLayer(ctx, px, fn)            draw fn(g) into a quarter-res layer, blur it, composite (cheap depth of field)
 *   figure(ctx, x, y, s, o)           rim-lit silhouette person (front), o.lit 0..1 lime backlight
 *   walker(ctx, x, y, s, phase, o)    rim-lit side-view walking silhouette
 *   lightPool(ctx, x, y, rx, ry, c, a) soft elliptical light on a floor
 *   caps(ctx, str, x, y, o)           Cleo-style small-caps label (white condensed, tracked, soft shadow)
 *   artistic(ctx)                     "* ARTISTIC RENDERING", tiny, top-right
 *   card(ctx, img, x, y, w, o)        floating screenshot/photo card: rounded, 1px light border, soft shadow
 *   glTex(r, name, canvas, unit)      bind a 2D canvas as a sampler2D uniform of an api.gl program
 */
(function () {
  const D = window.DATA;
  const A = () => D.A, P = () => D.P;

  // ---------------------------------------------------------------- cuts
  D.shot = (t, cuts) => { let i = 0; for (let k = 0; k < cuts.length; k++) if (t >= cuts[k]) i = k; return { i, t0: cuts[i], lt: t - cuts[i] }; };

  // ---------------------------------------------------------------- 3D camera for 2D-drawn worlds
  D.cam3 = (o) => {
    const [px, py, pz] = o.pos, [tx, ty, tz] = o.target;
    let fx = tx - px, fy = ty - py, fz = tz - pz; const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
    let rx = fz, ry = 0, rz = -fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    const ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
    const f = o.f ?? 1400, cx = o.cx ?? 960, cy = o.cy ?? 540, near = o.near ?? 0.05, cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
    const cam = {
      f, pos: o.pos, fwd: [fx, fy, fz],
      project(x, y, z) {
        const dx = x - px, dy = y - py, dz = z - pz;
        const zc = dx * fx + dy * fy + dz * fz; if (zc < near) return null;
        let xc = dx * rx + dy * ry + dz * rz, yc = dx * ux + dy * uy + dz * uz;
        const xr = xc * cr - yc * sr, yr = xc * sr + yc * cr;
        return { x: cx + (f * xr) / zc, y: cy - (f * yr) / zc, z: zc, s: f / zc };
      },
    };
    return cam;
  };
  // a polyline in world space, projected (points behind the camera split it)
  D.path3 = (ctx, cam, pts) => {
    let pen = false; ctx.beginPath();
    for (const p of pts) { const q = cam.project(p[0], p[1], p[2]); if (!q) { pen = false; continue; } if (pen) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); pen = true; }
  };
  // glowing perspective grid on y = 0, x in [x0,x1], z in [z0,z1]; o.step, o.color, o.fog (depth where it fades out)
  D.floorGrid = (ctx, cam, o = {}) => {
    const step = o.step ?? 1, [x0, x1] = o.x ?? [-10, 10], [z0, z1] = o.z ?? [-10, 10], fog = o.fog ?? 18, col = o.color || '#8f7dff', y = o.y ?? 0;
    const seg = (a, b, n) => { const out = []; for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, y, a[2] + (b[2] - a[2]) * i / n]); return out; };
    ctx.save(); ctx.lineCap = 'round';
    const drawSet = (lines) => {
      for (const pts of lines) {
        // split into short pieces so alpha can fade with depth
        for (let i = 1; i < pts.length; i++) {
          const a = cam.project(...pts[i - 1]), b = cam.project(...pts[i]); if (!a || !b) continue;
          const k = Math.max(0, 1 - ((a.z + b.z) / 2) / fog); if (k <= 0.01) continue;
          ctx.globalAlpha = (o.alpha ?? 0.35) * k * k;
          ctx.lineWidth = Math.max(0.6, (o.width ?? 2.2) * Math.min(1.6, ((a.s + b.s) / 2) / (o.wRef ?? 300)));
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    };
    const lines = [];
    for (let x = Math.ceil(x0 / step) * step; x <= x1 + 1e-6; x += step) lines.push(seg([x, y, z0], [x, y, z1], 24));
    for (let z = Math.ceil(z0 / step) * step; z <= z1 + 1e-6; z += step) lines.push(seg([x0, y, z], [x1, y, z], 24));
    ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = o.glow ?? 8; drawSet(lines);
    ctx.restore();
  };

  // draw a sprite lying on a world plane: centre (x, y, z), size (w, d) in world units, yaw rot, tilt about its own
  // x axis (0 = flat on the floor). Affine per sprite (fine for small things); returns false when behind the camera.
  D.sprite3 = (ctx, cam, spr, x, y, z, w, d, rot = 0, o = {}) => {
    const c = Math.cos(rot), s = Math.sin(rot), tl = o.tilt || 0, ct = Math.cos(tl), st = Math.sin(tl);
    const pt = (u, v) => { const lx = u * w, lz = v * d * ct, ly = -v * d * st; return cam.project(x + lx * c - lz * s, y + ly, z + lx * s + lz * c); };
    const p0 = pt(-0.5, 0.5), p1 = pt(0.5, 0.5), p2 = pt(-0.5, -0.5); if (!p0 || !p1 || !p2) return false;
    const W2 = spr.dw || spr.width, H2 = spr.dh || spr.height;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.shadow) { const q = pt(0, 0); if (q) { D.lightPool(ctx, q.x + 6, q.y + 10, Math.hypot(p1.x - p0.x, p1.y - p0.y) * 0.75, Math.abs(p2.y - p0.y) * 0.6 + 4, '#000000', 0.55 * o.shadow); } }
    ctx.transform((p1.x - p0.x) / W2, (p1.y - p0.y) / W2, (p2.x - p0.x) / H2, (p2.y - p0.y) / H2, p0.x, p0.y);
    ctx.drawImage(spr, 0, 0, W2, H2);
    if (o.shade) { ctx.fillStyle = 'rgba(0,0,0,' + o.shade + ')'; ctx.fillRect(0, 0, W2, H2); }
    ctx.restore(); return true;
  };

  // an extruded box on the floor (x0..x1, z0..z1, height h), lit from the upper left; o.glow, o.top colour
  D.box3 = (ctx, cam, x0, z0, x1, z1, h, color, o = {}) => {
    if (h <= 0.0005) return;
    const P3 = (x, y, z) => cam.project(x, y, z), y0 = o.y0 || 0, y1 = y0 + h;
    const faces = [
      { pts: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], n: [0, 0, -1], k: -0.1 },
      { pts: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], n: [1, 0, 0], k: -0.35 },
      { pts: [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], n: [-1, 0, 0], k: -0.35 },
      { pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], n: [0, 1, 0], k: 0.25 },
    ];
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow) { const c = P3((x0 + x1) / 2, 0, (z0 + z1) / 2); if (c) D.lightPool(ctx, c.x, c.y, (x1 - x0) * c.s * 1.6, (z1 - z0) * c.s * 0.8 + 10, color, 0.35 * o.glow); }
    for (const f of faces) {
      const cx = (x0 + x1) / 2 + f.n[0] * (x1 - x0) / 2, cy = (y0 + y1) / 2 + f.n[1] * h / 2, cz = (z0 + z1) / 2 + f.n[2] * (z1 - z0) / 2;
      const [px, py, pz] = cam.pos, vis = f.n[0] * (px - cx) + f.n[1] * (py - cy) + f.n[2] * (pz - cz); if (vis <= 0) continue;
      const q = f.pts.map((p) => P3(...p)); if (q.some((p) => !p)) continue;
      ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
      const g = ctx.createLinearGradient(q[0].x, q[3].y, q[0].x, q[0].y); g.addColorStop(0, D.shade(color, f.k + 0.12)); g.addColorStop(1, D.shade(color, f.k - 0.12));
      if (o.glow && f.n[1] === 1) { ctx.shadowColor = color; ctx.shadowBlur = 30 * o.glow; }
      ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = D.shade(color, f.k + 0.3); ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
  };
  // brushed-steel U tongue scraper, big and lit, drawn around (0,0), s = height; o.grip colour
  D.steelScraper = (g, s, o = {}) => {
    const k = s / 200; g.save(); g.scale(k, k); g.lineCap = 'round'; g.lineJoin = 'round';
    const band = (w, style) => { g.strokeStyle = style; g.lineWidth = w; g.beginPath(); g.moveTo(-34, 70); g.lineTo(-34, -30); g.bezierCurveTo(-34, -92, 34, -92, 34, -30); g.lineTo(34, 70); g.stroke(); };
    band(22, '#2a2d38');
    const mg = g.createLinearGradient(-50, -100, 50, 60); mg.addColorStop(0, '#f2f5fa'); mg.addColorStop(0.3, '#9aa3b4'); mg.addColorStop(0.55, '#e8ecf3'); mg.addColorStop(0.8, '#7d8698'); mg.addColorStop(1, '#c9d0dc');
    band(17, mg);
    g.globalAlpha = 0.9; band(3, 'rgba(255,255,255,0.9)'); g.globalAlpha = 1;
    // grips
    const gc = o.grip || '#a78bfa';
    for (const x of [-34, 34]) { const gg = g.createLinearGradient(x - 14, 0, x + 14, 0); gg.addColorStop(0, D.shade(gc, -0.4)); gg.addColorStop(0.35, D.shade(gc, 0.25)); gg.addColorStop(1, D.shade(gc, -0.45));
      g.fillStyle = gg; A().roundRect(g, x - 13, 60, 26, 70, 11); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; A().roundRect(g, x - 8, 66, 5, 58, 3); g.fill(); }
    g.restore();
  };

  // ---------------------------------------------------------------- light & glow
  D.neon = (ctx, pathFn, color, w = 6, o = {}) => {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    pathFn(); ctx.strokeStyle = D.alpha(color, 0.18); ctx.lineWidth = w * 4.5; ctx.stroke();
    ctx.shadowColor = color; ctx.shadowBlur = w * 3; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = D.mix(color, '#ffffff', o.core ?? 0.6); ctx.lineWidth = Math.max(1, w * 0.38); ctx.stroke();
    ctx.restore();
  };
  D.lightPool = (ctx, x, y, rx, ry, color, a = 0.3) => {
    if (a <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, D.alpha(color, a)); g.addColorStop(0.5, D.alpha(color, a * 0.35)); g.addColorStop(1, D.alpha(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  // a soft volumetric beam from (x,y) toward angle ang, spreading to width w at length len
  D.beam = (ctx, x, y, ang, len, w0, w1, color, a = 0.12) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalCompositeOperation = 'screen';
    const g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, D.alpha(color, a)); g.addColorStop(1, D.alpha(color, 0));
    ctx.fillStyle = g; ctx.filter = 'blur(12px)';
    ctx.beginPath(); ctx.moveTo(0, -w0 / 2); ctx.lineTo(len, -w1 / 2); ctx.lineTo(len, w1 / 2); ctx.lineTo(0, w0 / 2); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  const bokehCache = {};
  const bokehSprite = (color) => {
    if (bokehCache[color]) return bokehCache[color];
    const s = D.sprite(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 62); gr.addColorStop(0, D.alpha(color, 0.5)); gr.addColorStop(0.8, D.alpha(color, 0.35)); gr.addColorStop(0.93, D.alpha(color, 0.55)); gr.addColorStop(1, D.alpha(color, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    });
    bokehCache[color] = s; return s;
  };
  // o: n, seed, colors[], size [min,max], alpha, drift (px/s), y range
  D.bokeh = (ctx, t, o = {}) => {
    const r = A().rand(o.seed || 'bokeh'), n = o.n ?? 14, cols = o.colors || ['#a78bfa', '#8fd8ff', '#d7f34a'];
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < n; i++) {
      const bx = r() * 2200 - 140, by = (o.y0 ?? -60) + r() * ((o.y1 ?? 1140) - (o.y0 ?? -60)), sz = (o.size?.[0] ?? 60) + r() * ((o.size?.[1] ?? 220) - (o.size?.[0] ?? 60)), c = cols[Math.floor(r() * cols.length)], ph = r() * 6;
      const x = ((bx + t * (o.drift ?? 14) * (0.5 + r())) % 2240 + 2240) % 2240 - 160, y = by + Math.sin(t * 0.5 + ph) * 12;
      ctx.globalAlpha = (o.alpha ?? 0.18) * (0.6 + 0.4 * Math.sin(t * 0.8 + ph));
      ctx.drawImage(bokehSprite(c), x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.restore();
  };
  // depth of field: fn(g) draws in design units into a quarter-res layer that is blurred and composited
  let bl1 = null, bl2 = null;
  D.blurLayer = (ctx, px, fn, o = {}) => {
    const S = A().scale || 1, k = S / 4, w = Math.round(1920 * k), h = Math.round(1080 * k);
    if (!bl1 || bl1.width !== w) { bl1 = document.createElement('canvas'); bl1.width = w; bl1.height = h; bl2 = document.createElement('canvas'); bl2.width = w; bl2.height = h; }
    const g = bl1.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.setTransform(k, 0, 0, k, 0, 0); fn(g);
    const g2 = bl2.getContext('2d'); g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, w, h); g2.filter = `blur(${Math.max(0.5, px * k)}px)`; g2.drawImage(bl1, 0, 0); g2.filter = 'none';
    ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0); if (o.alpha != null) ctx.globalAlpha *= o.alpha; if (o.op) ctx.globalCompositeOperation = o.op;
    ctx.drawImage(bl2, 0, 0, 1920, 1080); ctx.restore();
  };

  // tilt-shift / focus falloff: fn(g) is drawn blurred everywhere, then sharp where maskFn(g) paints alpha (in design
  // units, e.g. a vertical gradient band). Both passes see the same design-unit transform.
  let fullCv = null;
  D.dof = (ctx, blurPx, fn, maskFn) => {
    D.blurLayer(ctx, blurPx, fn);
    const S = A().scale || 1, w = Math.round(1920 * S), h = Math.round(1080 * S);
    if (!fullCv || fullCv.width !== w) { fullCv = document.createElement('canvas'); fullCv.width = w; fullCv.height = h; }
    const g = fullCv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
    g.setTransform(S, 0, 0, S, 0, 0); fn(g);
    g.globalCompositeOperation = 'destination-in'; maskFn(g); g.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(fullCv, 0, 0); ctx.restore();
  };
  D.bandMask = (y0, y1, y2, y3) => (g) => { const gr = g.createLinearGradient(0, y0, 0, y3); const n = (v) => Math.max(0, Math.min(1, (v - y0) / (y3 - y0))); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(n(y1), 'rgba(0,0,0,1)'); gr.addColorStop(n(y2), 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(-2000, -2000, 6000, 6000); };

  // ---------------------------------------------------------------- figures
  // profile silhouette (head + neck + shoulders) facing right (dir 1) / left (-1), (0,0) = bottom centre, height s
  D.profilePath = (g, s, dir = 1, o = {}) => {
    g.save(); g.scale(dir, 1);
    const hy = -0.74 * s, X = (v) => v * s, Y = (v) => hy + v * s; g.beginPath();
    g.moveTo(X(-0.47), 0);
    g.bezierCurveTo(X(-0.48), X(-0.24), X(-0.32), X(-0.37), X(-0.14), X(-0.4));                 // back of the shoulders
    g.bezierCurveTo(X(-0.1), X(-0.43), X(-0.1), X(-0.52), X(-0.13), Y(0.17));                   // back of the neck
    g.bezierCurveTo(X(-0.22), Y(0.1), X(-0.25), Y(-0.02), X(-0.235), Y(-0.08));                 // nape to back of the head
    g.bezierCurveTo(X(-0.21), Y(-0.22), X(-0.1), Y(-0.27), X(0.0), Y(-0.26));                   // crown
    g.bezierCurveTo(X(0.13), Y(-0.26), X(0.21), Y(-0.15), X(0.215), Y(-0.05));                  // forehead
    g.bezierCurveTo(X(0.22), Y(-0.01), X(0.25), Y(0.03), X(0.285), Y(0.065));                   // brow to nose tip
    g.quadraticCurveTo(X(0.27), Y(0.09), X(0.22), Y(0.09));                                       // under the nose
    if (o.mouthOpen) { g.lineTo(X(0.215), Y(0.115)); g.quadraticCurveTo(X(0.17), Y(0.14), X(0.2), Y(0.175)); }
    else { g.quadraticCurveTo(X(0.228), Y(0.11), X(0.214), Y(0.125)); g.quadraticCurveTo(X(0.2), Y(0.14), X(0.212), Y(0.155)); }
    g.bezierCurveTo(X(0.215), Y(0.22), X(0.15), Y(0.25), X(0.08), Y(0.24));                     // chin
    g.bezierCurveTo(X(0.03), Y(0.24), X(0.03), X(-0.49), X(0.05), X(-0.46));                      // under the jaw into the throat
    g.bezierCurveTo(X(0.06), X(-0.4), X(0.13), X(-0.35), X(0.3), X(-0.33));                       // throat to collarbone
    g.bezierCurveTo(X(0.42), X(-0.29), X(0.46), X(-0.18), X(0.45), 0);                            // front shoulder / chest
    g.closePath();
    if (o.glasses) { g.moveTo(X(0.19), Y(-0.035)); g.ellipse(X(0.145), Y(-0.035), X(0.05), X(0.042), 0, 0, Math.PI * 2); }
    g.restore();
  };
  // draw any path function as a rim-lit silhouette: rim only on the side facing the light (lx, ly), dark body on top
  D.rimLit = (ctx, pathFn, o = {}) => {
    const rim = o.rim || '#b7a8ff', off = o.off ?? 4, [lx, ly] = o.light || [1, -0.6];
    ctx.save(); ctx.globalAlpha *= 0.35; ctx.shadowColor = rim; ctx.shadowBlur = (o.glow ?? 26); ctx.fillStyle = rim;
    ctx.translate(lx * off * 2.2, ly * off * 2.2); pathFn(ctx); ctx.fill(); ctx.restore();
    ctx.save(); ctx.shadowColor = rim; ctx.shadowBlur = off * 1.2; ctx.fillStyle = D.mix(rim, '#ffffff', 0.35);
    ctx.translate(lx * off, ly * off); pathFn(ctx); ctx.fill(); ctx.restore();
    ctx.save(); const gb = ctx.createLinearGradient(o.gx0 ?? -200, o.gy0 ?? -400, o.gx1 ?? 200, o.gy1 ?? 0);
    gb.addColorStop(0, D.mix(o.base || '#110f22', rim, o.tint ?? 0.16)); gb.addColorStop(0.45, o.base || '#110f22'); gb.addColorStop(1, D.mix(o.base || '#110f22', '#000000', 0.4));
    ctx.fillStyle = gb; pathFn(ctx); ctx.fill(); ctx.restore();
  };

  // front silhouette path, (0,0) = feet centre, height 1
  const personPath = (g, s) => {
    const hw = s * 0.4, top = -s * 0.64, hr = s * 0.2, hy = -s * 0.8;
    g.beginPath(); g.moveTo(-hw, 0); g.lineTo(-hw, top + hw * 0.9);
    g.bezierCurveTo(-hw, top - hw * 0.08, hw, top - hw * 0.08, hw, top + hw * 0.9); g.lineTo(hw, 0); g.closePath();
    g.moveTo(hr, hy); g.arc(0, hy, hr, 0, Math.PI * 2);
  };
  // o.lit 0..1 (lime backlight + rim), o.rim colour, o.rimSide -1/1, o.alpha, o.base colour
  D.figure = (ctx, x, y, s, o = {}) => {
    const lit = o.lit ?? 0, rim = lit > 0 ? D.mix(o.rim || '#b7a8ff', o.litColor || P().lime, lit) : (o.rim || '#b7a8ff'), side = o.rimSide ?? 1;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.translate(x, y - (o.bob || 0)); if (o.rot) ctx.rotate(o.rot);
    if (lit > 0) D.glow(ctx, 0, -s * 0.6, s * 0.8, o.litColor || P().lime, 0.28 * lit);
    const off = s * 0.018 * (1 + 0.6 * lit);
    // back-light rim: the shape in the rim colour, offset up and toward the light, the body covers all but the edge
    ctx.save(); ctx.fillStyle = rim; if (!o.cheap && lit > 0) { ctx.shadowColor = rim; ctx.shadowBlur = s * 0.06 * lit; }
    ctx.translate(side * off, -off * 0.9); personPath(ctx, s); ctx.fill();
    if (lit > 0.3) { ctx.translate(-2 * side * off, 0); ctx.globalAlpha *= lit; personPath(ctx, s); ctx.fill(); }
    ctx.restore();
    const gb = ctx.createLinearGradient(side * s * 0.4, -s, -side * s * 0.3, 0), base = o.base || '#14112a';
    gb.addColorStop(0, D.mix(base, rim, 0.18 + 0.12 * lit)); gb.addColorStop(0.5, base); gb.addColorStop(1, D.mix(base, '#000000', 0.4));
    ctx.fillStyle = gb; personPath(ctx, s); ctx.fill();
    ctx.restore();
  };
  // side-view walker, facing +x (o.dir -1 flips), (x,y) feet, s height: tapered limbs, a torso with shoulders.
  // Every body part is filled on its own (so overlapping parts never cancel out).
  D.walker = (ctx, x, y, s, ph, o = {}) => {
    const dir = o.dir ?? 1, rim = o.lit > 0 ? D.mix(o.rim || '#b7a8ff', P().lime, o.lit) : (o.rim || '#b7a8ff');
    const bob = Math.abs(Math.cos(ph)) * s * 0.014, a = Math.sin(ph) * 0.5;
    const parts = [];
    const seg = (p0, p1, w0, w1) => parts.push((g) => { g.beginPath(); g.lineCap = 'round'; const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      g.moveTo(p0[0] + nx * w0 / 2, p0[1] + ny * w0 / 2); g.lineTo(p1[0] + nx * w1 / 2, p1[1] + ny * w1 / 2); g.lineTo(p1[0] - nx * w1 / 2, p1[1] - ny * w1 / 2); g.lineTo(p0[0] - nx * w0 / 2, p0[1] - ny * w0 / 2); g.closePath(); g.fill();
      g.beginPath(); g.arc(p0[0], p0[1], w0 / 2, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(p1[0], p1[1], w1 / 2, 0, Math.PI * 2); g.fill(); });
    const limb = (p0, ang, L, bend, w0, w1) => { const k = [p0[0] + Math.sin(ang) * L, p0[1] + Math.cos(ang) * L], e = [k[0] + Math.sin(ang + bend) * L, k[1] + Math.cos(ang + bend) * L]; seg(p0, k, w0, (w0 + w1) / 2); seg(k, e, (w0 + w1) / 2, w1); return e; };
    const hip = [0, -s * 0.5 - bob], sh = [s * 0.02, -s * 0.8 - bob];
    const f1 = limb(hip, a, s * 0.25, -Math.max(0, -a) * 0.9 - 0.04, s * 0.1, s * 0.055), f2 = limb(hip, -a, s * 0.25, -Math.max(0, a) * 0.9 - 0.04, s * 0.1, s * 0.055);
    for (const f of [f1, f2]) parts.push((g) => { g.beginPath(); g.moveTo(f[0] - s * 0.03, f[1] + s * 0.02); g.lineTo(f[0] + s * 0.075, f[1] + s * 0.025); g.lineTo(f[0] + s * 0.07, f[1] - s * 0.02); g.lineTo(f[0] - s * 0.03, f[1] - s * 0.03); g.closePath(); g.fill(); });
    const coat = o.coat ? s * 0.12 : 0;
    parts.push((g) => { g.beginPath(); g.moveTo(sh[0] - s * 0.1, sh[1] + s * 0.03); g.quadraticCurveTo(sh[0], sh[1] - s * 0.035, sh[0] + s * 0.1, sh[1] + s * 0.035);
      g.lineTo(hip[0] + s * 0.085, hip[1] + coat); g.lineTo(hip[0] - s * 0.085, hip[1] + coat); g.closePath(); g.fill(); });
    limb([sh[0], sh[1] + s * 0.03], -a * 0.8, s * 0.19, 0.3, s * 0.07, s * 0.045); limb([sh[0], sh[1] + s * 0.03], a * 0.8, s * 0.19, 0.3, s * 0.07, s * 0.045);
    seg([s * 0.02, -s * 0.82 - bob], [s * 0.03, -s * 0.87 - bob], s * 0.06, s * 0.06);
    parts.push((g) => { g.beginPath(); g.arc(s * 0.03, -s * 0.925 - bob, s * 0.085, 0, Math.PI * 2); g.fill(); });
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.translate(x, y); ctx.scale(dir, 1);
    if (o.lit > 0) D.glow(ctx, 0, -s * 0.6, s * 0.7, P().lime, 0.25 * o.lit);
    ctx.save(); ctx.fillStyle = rim; ctx.translate(-s * 0.016, -s * 0.012); for (const p of parts) p(ctx); ctx.restore();
    const gb = ctx.createLinearGradient(-s * 0.2, -s, s * 0.2, 0); gb.addColorStop(0, D.mix('#131126', rim, 0.15)); gb.addColorStop(1, '#0a0918');
    ctx.fillStyle = gb; for (const p of parts) p(ctx);
    ctx.restore();
  };

  // ---------------------------------------------------------------- type & frames
  D.caps = (ctx, str, x, y, o = {}) => {
    A().text(ctx, str, x, y, { size: o.size || 40, weight: 700, color: o.color || P().ink, align: o.align || 'left', tracking: o.tracking ?? 4, upper: true, alpha: o.alpha, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 14, shadowY: 3 });
  };
  D.artistic = (ctx, o = {}) => A().text(ctx, '* ARTISTIC RENDERING', 1880, o.y ?? 50, { size: 20, color: P().faint, align: 'right', tracking: 2 });
  // floating card for a photo/screenshot: (x,y) centre, w width (height from the image aspect or o.h)
  D.card = (ctx, img, x, y, w, o = {}) => {
    const h = o.h ?? (w * (img.height || img.dh) / (img.width || img.dw)), r = o.r ?? 22;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.scale) ctx.scale(o.scale, o.scale);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
    ctx.fillStyle = o.bg || '#ffffff'; A().roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); A().roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.clip();
    if (o.src) ctx.drawImage(img, o.src[0], o.src[1], o.src[2], o.src[3], -w / 2, -h / 2, w, h); else ctx.drawImage(img, -w / 2, -h / 2, w, h);
    const sh = ctx.createLinearGradient(0, -h / 2, 0, h / 2); sh.addColorStop(0, 'rgba(255,255,255,0.10)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); ctx.fillStyle = sh; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; A().roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.stroke();
    ctx.restore();
  };

  // ---------------------------------------------------------------- arcs, neon glyphs, glass tokens
  // a thick glowing arc (fractions of a turn from 12 o'clock): solid tube with a lit edge and soft glow
  D.arcBar = (ctx, cx, cy, R, a0, a1, color, w, o = {}) => {
    if (a1 <= a0) return; const A0 = -Math.PI / 2 + a0 * Math.PI * 2, A1 = -Math.PI / 2 + a1 * Math.PI * 2;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.lineCap = o.cap || 'butt';
    ctx.shadowColor = color; ctx.shadowBlur = o.glow ?? 30; ctx.strokeStyle = D.shade(color, -0.15); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, cy, R, A0, A1); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = D.shade(color, 0.25); ctx.lineWidth = w * 0.45; ctx.beginPath(); ctx.arc(cx, cy, R + w * 0.12, A0, A1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1.5, w * 0.06); ctx.beginPath(); ctx.arc(cx, cy, R + w * 0.38, A0, A1); ctx.stroke();
    ctx.restore();
  };
  // neon glyphs (path builders centred at 0,0, size s)
  D.glyph = {
    lips(g, s) { const k = s / 100; g.beginPath(); g.moveTo(-46 * k, 0); g.bezierCurveTo(-34 * k, -14 * k, -20 * k, -24 * k, -10 * k, -22 * k); g.bezierCurveTo(-5 * k, -21 * k, -2 * k, -16 * k, 0, -15 * k);
      g.bezierCurveTo(2 * k, -16 * k, 5 * k, -21 * k, 10 * k, -22 * k); g.bezierCurveTo(20 * k, -24 * k, 34 * k, -14 * k, 46 * k, 0); g.bezierCurveTo(34 * k, 22 * k, 16 * k, 30 * k, 0, 30 * k); g.bezierCurveTo(-16 * k, 30 * k, -34 * k, 22 * k, -46 * k, 0); g.closePath();
      g.moveTo(-40 * k, 1 * k); g.bezierCurveTo(-18 * k, -6 * k, 18 * k, -6 * k, 40 * k, 1 * k); },
    stomach(g, s) { const k = s / 100; g.beginPath(); g.moveTo(-6 * k, -52 * k); g.lineTo(-6 * k, -30 * k); g.bezierCurveTo(-8 * k, -14 * k, 4 * k, -8 * k, 2 * k, 4 * k); g.bezierCurveTo(0, 16 * k, -20 * k, 20 * k, -34 * k, 14 * k);
      g.bezierCurveTo(-46 * k, 24 * k, -34 * k, 42 * k, -18 * k, 44 * k); g.bezierCurveTo(4 * k, 48 * k, 34 * k, 40 * k, 42 * k, 14 * k); g.bezierCurveTo(50 * k, -10 * k, 34 * k, -38 * k, 8 * k, -30 * k); g.lineTo(8 * k, -52 * k); },
  };
  // glass token: dark glass disc with a lit rim and a neon glyph inside; lit 0..1 turns it on in colour
  D.token = (ctx, x, y, r, glyphFn, lit, color, o = {}) => {
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (lit > 0) D.glow(ctx, 0, 0, r * 2.4, color, 0.35 * lit);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.45, r * 0.05, 0, 0, r); g.addColorStop(0, D.mix('#2b2752', color, 0.25 * lit)); g.addColorStop(1, D.mix('#0c0a1c', color, 0.12 * lit));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = lit > 0 ? D.mix('rgba(255,255,255,0.25)', color, lit) : 'rgba(255,255,255,0.2)'; ctx.lineWidth = Math.max(1.5, r * 0.035); ctx.stroke();
    ctx.save(); ctx.globalAlpha *= 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.arc(0, 0, r * 0.86, -2.5, -1.3); ctx.stroke(); ctx.restore();
    const gc = lit > 0 ? color : 'rgba(200,190,255,0.35)';
    if (lit > 0.02) D.neon(ctx, () => glyphFn(ctx, r * 1.05), gc, r * 0.06 * (0.6 + 0.4 * lit), { alpha: 0.35 + 0.65 * lit });
    else { ctx.strokeStyle = gc; ctx.lineWidth = r * 0.04; ctx.lineJoin = 'round'; glyphFn(ctx, r * 1.05); ctx.stroke(); }
    ctx.restore();
  };

  // ---------------------------------------------------------------- WebGL helpers
  D.glTex = (r, name, canvas, unit = 0) => {
    const gl = r.gl, prog = gl.getParameter(gl.CURRENT_PROGRAM), tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.useProgram(prog); gl.uniform1i(gl.getUniformLocation(prog, name), unit);
    return tex;
  };
})();
