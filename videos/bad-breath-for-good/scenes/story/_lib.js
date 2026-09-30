/* Story group kit (bad-breath-for-good): one illustration language for every story beat and the title card.
 * Flat 2.5D: soft gradients, a crisp rim-light crescent, soft contact shadows, on the dark indigo stage.
 * Loaded with   // @use videos/bad-breath-for-good/scenes/story/_lib.js   then call STORY.init(api) in setup().
 *
 *   STORY.stage(ctx, t, o)             dark stage + warm glows + drifting dust (o.warm, o.glows, o.dust)
 *   STORY.finish(ctx, t, o)            vignette + grain
 *   STORY.solid(ctx, pathFn, o)        fill a path as a lit 2.5D object (gradient, rim crescent, drop shadow)
 *   STORY.bust(ctx, x, y, s, o)        front / three-quarter person (face = expressions), head centre at x,y, s = half head height
 *   STORY.backHead(ctx, x, y, s, o)    over-the-shoulder back of a head, facing right (o.flip for left)
 *   STORY.profile(ctx, x, y, s, o)     head in profile facing right (o.flip for left)
 *   STORY.bubble / stink / sparkle / type / chip / icons.*
 */
(function () {
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  const S = {};
  let A = null;          // api
  S.init = function (api) { A = api; S.api = api; S.P = api.P; return S; };

  // ------------------------------------------------------------------ colour helpers
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  S.mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
  S.light = (c, t) => S.mix(c, '#ffffff', t);
  S.dark = (c, t) => S.mix(c, '#1a0f24', t);
  S.rgba = (c, a) => { const [r, g, b] = hex2rgb(c); return `rgba(${r},${g},${b},${a})`; };
  S.clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  S.lerp = (a, b, t) => a + (b - a) * t;
  // 0 -> 1 punch that settles back: for zoom punches and ticks
  S.bump = (t, at, dur = 0.35) => { const k = (t - at) / dur; if (k < 0 || k > 1) return 0; return Math.sin(k * Math.PI) * (1 - k * 0.5); };
  S.kick = (t, at, dur = 0.5) => { const k = (t - at) / dur; if (k < 0) return 0; if (k > 1) return 0; return Math.exp(-k * 5) * Math.cos(k * 9); };

  // ------------------------------------------------------------------ stage
  let dustSprite = null;
  function makeDust() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
  }
  S.glow = function (ctx, x, y, r, color, a = 1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, S.rgba(color, 0.55 * a)); g.addColorStop(0.45, S.rgba(color, 0.18 * a)); g.addColorStop(1, S.rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  S.stage = function (ctx, t, o = {}) {
    const P = A.P;
    A.stage(ctx, { c1: o.c1 || (o.warm ? '#24142a' : '#181330'), c2: o.c2 || P.bg, cx: o.cx ?? 0.5, cy: o.cy ?? 0.42, gridOffset: [-t * (o.gridSpeed ?? 9), -t * (o.gridSpeed ?? 9) * 0.45], gridColor: o.gridColor || (o.warm ? 'rgba(255,170,190,0.05)' : P.grid), grid: o.grid });
    const glows = o.glows || (o.warm ? [{ x: 0.66, y: 0.42, r: 0.5, c: '#ff8a6b', a: 0.55 }, { x: 0.18, y: 0.8, r: 0.45, c: '#7c5cff', a: 0.5 }] : [{ x: 0.5, y: 0.4, r: 0.55, c: '#7c5cff', a: 0.45 }]);
    for (const g of glows) S.glow(ctx, W * g.x + Math.sin(t * 0.4 + g.x * 9) * 18, H * g.y + Math.cos(t * 0.33 + g.y * 7) * 12, W * g.r, g.c, g.a ?? 0.5);
    const n = o.dust ?? 34;
    if (n > 0) {
      if (!dustSprite) dustSprite = makeDust();
      const rnd = A.rand('dust' + (o.seed || 1));
      ctx.save();
      for (let i = 0; i < n; i++) {
        const x0 = rnd() * W, y0 = rnd() * H, sp = 6 + rnd() * 16, r = 3 + rnd() * rnd() * 16, ph = rnd() * TAU, a = 0.05 + rnd() * 0.16;
        const y = ((y0 - t * sp) % (H + 60) + H + 60) % (H + 60) - 30, x = x0 + Math.sin(t * 0.5 + ph) * 22;
        ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 1.3 + ph));
        ctx.drawImage(dustSprite, x - r * 2, y - r * 2, r * 4, r * 4);
      }
      ctx.restore();
    }
  };
  S.finish = function (ctx, t, o = {}) { A.vignette(ctx, o.vignette ?? 0.55); A.grain(ctx, t, o.grain ?? 0.06); };

  // ------------------------------------------------------------------ cinematic backgrounds (phase 2)
  // An out-of-focus world behind the 3D figures: a dark gradient plus soft bokeh discs (string lights, windows), pre-rendered
  // once (2400x1400 design px, drawn at 2x) and slid for parallax. o: { seed, cols:[...], n, top, bottom, big, windows }
  S.bokehField = function (o = {}) {
    const c = document.createElement('canvas'); c.width = 4800; c.height = 2800; const g = c.getContext('2d'); g.scale(2, 2);
    const bg = g.createLinearGradient(0, 0, 0, 1400); bg.addColorStop(0, o.top || '#1a1024'); bg.addColorStop(0.55, o.mid || '#140c1c'); bg.addColorStop(1, o.bottom || '#07050c');
    g.fillStyle = bg; g.fillRect(0, 0, 2400, 1400);
    const rnd = A.rand('bokeh' + (o.seed || 1)), cols = o.cols || ['#ffb36b', '#ff8a5c', '#ffd28a', '#a78bfa', '#ff6fae'];
    // soft glows first (big, very blurred), then discs
    for (let i = 0; i < (o.glows ?? 6); i++) { const x = rnd() * 2400, y = 200 + rnd() * 700, r = 250 + rnd() * 350; const gr = g.createRadialGradient(x, y, 0, x, y, r); const col = cols[Math.floor(rnd() * cols.length)]; gr.addColorStop(0, S.rgba(col, 0.22)); gr.addColorStop(1, S.rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    if (o.windows) {   // tall soft window panes far behind
      g.save(); g.filter = 'blur(18px)';
      for (let i = 0; i < 4; i++) { const x = 300 + i * 520 + rnd() * 60; const wg = g.createLinearGradient(0, 150, 0, 900); wg.addColorStop(0, 'rgba(90,110,190,0.28)'); wg.addColorStop(1, 'rgba(60,50,120,0.05)'); g.fillStyle = wg; g.fillRect(x, 150, 300, 750); }
      g.restore();
    }
    g.save(); g.filter = `blur(${o.blur ?? 3}px)`;
    for (let i = 0; i < (o.n ?? 70); i++) {
      const x = rnd() * 2400, y = (o.band ? o.band[0] + rnd() * (o.band[1] - o.band[0]) : 60 + rnd() * 900), r = (o.small ?? 10) + rnd() * rnd() * (o.big ?? 70);
      const col = cols[Math.floor(rnd() * cols.length)], a = 0.12 + rnd() * 0.3;
      const gr = g.createRadialGradient(x, y, r * 0.1, x, y, r); gr.addColorStop(0, S.rgba(col, a * 0.8)); gr.addColorStop(0.8, S.rgba(col, a)); gr.addColorStop(1, S.rgba(col, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.strokeStyle = S.rgba(S.light(col, 0.3), a * 0.9); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r * 0.92, 0, TAU); g.stroke();
    }
    g.restore();
    return c;
  };
  S.bokeh = function (ctx, field, dx = 0, dy = 0, scale = 1) {
    const w = 2400 * scale, h = 1400 * scale;
    ctx.drawImage(field, (1920 - w) / 2 + dx, (1080 - h) / 2 + dy, w, h);
  };
  // floating dust motes lit in a light beam (foreground depth), deterministic
  S.motes = function (ctx, t, o = {}) {
    if (!dustSprite) dustSprite = makeDust();
    const rnd = A.rand('motes' + (o.seed || 1)), n = o.n ?? 40;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const x0 = rnd() * 1920, y0 = rnd() * 1080, sp = 4 + rnd() * 10, r = (o.r ?? 3) + rnd() * rnd() * (o.rBig ?? 14), ph = rnd() * TAU;
      const x = x0 + Math.sin(t * 0.3 + ph) * 30 + (o.dx || 0), y = ((y0 - t * sp) % 1100 + 1100) % 1100 - 10 + (o.dy || 0);
      ctx.globalAlpha = (o.alpha ?? 0.35) * (0.4 + 0.6 * Math.sin(t * 0.9 + ph) ** 2);
      ctx.drawImage(dustSprite, x - r * 2, y - r * 2, r * 4, r * 4);
    }
    ctx.restore();
  };
  // hard-cut helper: which shot is active at t, given cut times [t1, t2, ...] -> { i, t0, t1, local }
  S.shot = function (t, cuts, dur) {
    let i = 0; while (i < cuts.length && t >= cuts[i]) i++;
    const t0 = i === 0 ? 0 : cuts[i - 1], t1 = i < cuts.length ? cuts[i] : dur;
    return { i, t0, t1, local: t - t0, len: t1 - t0, k: Math.min(1, (t - t0) / Math.max(0.001, t1 - t0)) };
  };
  // small print, top-right, for renders
  S.artistic = function (ctx) { A.text(ctx, '* ARTISTIC RENDERING', 1880, 52, { size: 20, color: A.P.faint, align: 'right', tracking: 2 }); };

  // ------------------------------------------------------------------ lit solid
  // pathFn(ctx) builds a path (it must call beginPath). o: { color | light+dark, rim, rimW, rimDir:[dx,dy] (unit, toward the light),
  //   shadow (bool), sBlur, sY, bounds:[x,y,w,h], line, lineW, gloss }
  S.solid = function (ctx, pathFn, o = {}) {
    const b = o.bounds || [-100, -100, 200, 200];
    const base = o.color || '#888888', light = o.light || S.light(base, 0.28), dark = o.dark || S.dark(base, 0.35);
    const rim = o.rim, rimW = o.rimW ?? Math.max(3, Math.min(b[2], b[3]) * 0.045), dir = o.rimDir || [1, -0.6];
    // drop shadow + rim colour base (the rim is the part of this fill that the shifted body fill leaves uncovered)
    ctx.save();
    if (o.shadow !== false) { ctx.shadowColor = o.sColor || 'rgba(6,3,18,0.5)'; ctx.shadowBlur = o.sBlur ?? 34; ctx.shadowOffsetY = o.sY ?? 16; ctx.shadowOffsetX = o.sX ?? 0; }
    pathFn(ctx); ctx.fillStyle = rim || dark; ctx.fill();
    ctx.restore();
    const g = ctx.createLinearGradient(b[0] + b[2] * (o.gx0 ?? 0.2), b[1] + b[3] * (o.gy0 ?? 0), b[0] + b[2] * (o.gx1 ?? 0.8), b[1] + b[3] * (o.gy1 ?? 1));
    g.addColorStop(0, light); g.addColorStop(o.mid ?? 0.45, base); g.addColorStop(1, dark);
    ctx.save();
    pathFn(ctx); ctx.clip();
    if (rim) { const L = Math.hypot(dir[0], dir[1]) || 1; ctx.translate(-dir[0] / L * rimW, -dir[1] / L * rimW); }
    pathFn(ctx); ctx.fillStyle = g; ctx.fill();
    if (o.gloss) {   // soft specular highlight, top-left
      const gx = b[0] + b[2] * (o.glossX ?? 0.3), gy = b[1] + b[3] * (o.glossY ?? 0.22), gr = Math.max(b[2], b[3]) * (o.glossR ?? 0.35);
      const hg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr); hg.addColorStop(0, `rgba(255,255,255,${o.gloss})`); hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg; ctx.fillRect(b[0] - 50, b[1] - 50, b[2] + 100, b[3] + 100);
    }
    ctx.restore();
    if (o.line) { ctx.save(); pathFn(ctx); ctx.strokeStyle = o.line; ctx.lineWidth = o.lineW || 3; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }
  };
  S.contact = function (ctx, x, y, rx, ry, a = 0.45) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(4,2,12,${a})`); g.addColorStop(1, 'rgba(4,2,12,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  };
  const ell = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); };
  S.ell = ell;
  const rr = (ctx, x, y, w, h, r) => { A.roundRect(ctx, x, y, w, h, r); };

  // ------------------------------------------------------------------ people: palettes
  S.SKIN = ['#f3c7a5', '#e2a57f', '#c98a5f', '#9c6440', '#6e4430', '#f7d6bd'];
  S.HAIR = ['#2b1d24', '#4a2d22', '#7a4a2c', '#c98a3c', '#1a1418', '#8c8fa3'];
  S.SHIRT = ['#ff7a59', '#7c5cff', '#46c2a8', '#ffb547', '#ff6fae', '#5cc8ff', '#a78bfa', '#e85d75'];

  // ------------------------------------------------------------------ face parts
  function eye(ctx, ex, ey, rx, ry, o) {
    const lid = S.clamp(o.lid ?? 0.18), low = S.clamp(o.lowLid ?? 0), look = o.look || [0, 0], skin = o.skin;
    if (lid > 0.96 || o.closed) {           // closed: a curve (happy = arch up)
      ctx.save(); ctx.strokeStyle = o.lash || '#2a1a24'; ctx.lineWidth = Math.max(2, rx * 0.28); ctx.lineCap = 'round';
      ctx.beginPath(); const h = (o.happy ? -1 : 0.6) * ry * 0.55;
      ctx.moveTo(ex - rx, ey + (o.happy ? ry * 0.15 : 0)); ctx.quadraticCurveTo(ex, ey + h * 2 * (o.happy ? 1 : 0.5), ex + rx, ey + (o.happy ? ry * 0.15 : 0)); ctx.stroke(); ctx.restore(); return;
    }
    ctx.save();
    ell(ctx, ex, ey, rx, ry); ctx.fillStyle = '#fbf6f1'; ctx.fill(); ctx.clip();
    // iris
    const ir = ry * (o.irisK ?? 0.66), ix = ex + look[0] * (rx - ir * 0.75), iy = ey + look[1] * ry * 0.3 + ry * 0.05;
    const ig = ctx.createRadialGradient(ix - ir * 0.3, iy - ir * 0.3, 0, ix, iy, ir); ig.addColorStop(0, S.light(o.iris || '#5a3a2a', 0.25)); ig.addColorStop(1, S.dark(o.iris || '#5a3a2a', 0.4));
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill();
    ctx.fillStyle = '#140c12'; ctx.beginPath(); ctx.arc(ix, iy, ir * (o.pupil ?? 0.52), 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(ix - ir * 0.32, iy - ir * 0.36, ir * 0.26, 0, TAU); ctx.fill();
    // upper-eye shadow
    ctx.fillStyle = 'rgba(80,40,60,0.18)'; ctx.fillRect(ex - rx, ey - ry, rx * 2, ry * 0.5);
    // lids (skin)
    const lidY = ey - ry + 2 * ry * lid;
    ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(ex - rx - 2, ey - ry - 2); ctx.lineTo(ex + rx + 2, ey - ry - 2); ctx.lineTo(ex + rx + 2, lidY - ry * 0.1);
    ctx.quadraticCurveTo(ex, lidY + ry * 0.45 * (1 - lid), ex - rx - 2, lidY - ry * 0.1); ctx.closePath(); ctx.fill();
    if (low > 0) { const lowY = ey + ry - 2 * ry * low; ctx.beginPath(); ctx.moveTo(ex - rx - 2, ey + ry + 2); ctx.lineTo(ex + rx + 2, ey + ry + 2); ctx.lineTo(ex + rx + 2, lowY + ry * 0.2); ctx.quadraticCurveTo(ex, lowY - ry * 0.35, ex - rx - 2, lowY + ry * 0.2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // lash line along the lid edge
    ctx.save(); ctx.strokeStyle = o.lash || '#2a1a24'; ctx.lineWidth = Math.max(2, rx * 0.2); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex - rx * 1.02, lidY - ry * 0.05 + (lid < 0.2 ? ry * 0.35 * (0.2 - lid) * 5 * 0.3 : 0));
    ctx.quadraticCurveTo(ex, lidY + ry * 0.45 * (1 - lid) - ry * 0.95 * (1 - lid) * (lid < 0.25 ? 1 : 0.6), ex + rx * 1.05, lidY - ry * 0.12);
    ctx.stroke(); ctx.restore();
  }
  function mouth(ctx, mx, my, s, o, skin) {
    // expression numbers (in head units): smile 0..1 open grin, stiff 0..1 clenched grimace, open 0..1 jaw, oh 0..1
    const smile = o.smile ?? 0.4, stiff = o.stiff ?? 0, open = o.open ?? 0, oh = o.oh ?? 0, frown = o.frown ?? 0;
    const hw = s * (0.2 + smile * 0.06 + stiff * 0.1 - oh * 0.1);
    const cornerY = s * (-0.07 * smile + 0.05 * frown + 0.01 * stiff);
    const up = s * (0.015 - 0.02 * stiff + 0.02 * frown);
    const lowD = s * (0.02 + open * 0.2 + smile * open * 0.04 + stiff * 0.1 + oh * 0.14) + (smile > 0 && open === 0 && stiff === 0 ? s * 0.07 * smile : 0);
    const lipC = S.dark(skin, 0.45);
    const isOpen = open > 0.03 || stiff > 0.03 || oh > 0.03;
    ctx.save(); ctx.translate(mx, my);
    if (!isOpen) {
      ctx.strokeStyle = lipC; ctx.lineWidth = s * 0.045; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-hw, cornerY); ctx.quadraticCurveTo(0, cornerY + (lowD - s * 0.02) * 2 - s * 0.01 * (frown ? -2 : 0), hw, cornerY); ctx.stroke();
      // dimples
      if (smile > 0.3) { ctx.lineWidth = s * 0.025; for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(k * hw * 1.08, cornerY - s * 0.01, s * 0.035, k > 0 ? -1.2 : Math.PI - 0.8, k > 0 ? 0.8 : Math.PI + 1.2); ctx.stroke(); } }
      ctx.restore(); return;
    }
    const path = () => {
      ctx.beginPath();
      if (oh > 0.5 && smile < 0.2 && stiff < 0.2) { ctx.ellipse(0, s * 0.03, hw * 0.9, s * (0.06 + oh * 0.08), 0, 0, TAU); return; }
      ctx.moveTo(-hw, cornerY);
      ctx.bezierCurveTo(-hw * 0.5, up + cornerY * 0.2, hw * 0.5, up + cornerY * 0.2, hw, cornerY);
      if (stiff > 0.5) { ctx.lineTo(hw * 0.97, cornerY + lowD * 0.9); ctx.bezierCurveTo(hw * 0.4, cornerY + lowD * 1.05, -hw * 0.4, cornerY + lowD * 1.05, -hw * 0.97, cornerY + lowD * 0.9); }
      else ctx.bezierCurveTo(hw * 0.75, cornerY + lowD * 1.25, -hw * 0.75, cornerY + lowD * 1.25, -hw, cornerY);
      ctx.closePath();
    };
    path(); ctx.fillStyle = '#4a1826'; ctx.fill();
    ctx.save(); path(); ctx.clip();
    // tongue
    ctx.fillStyle = '#e0707f'; ell(ctx, 0, cornerY + lowD * 1.1, hw * 0.7, lowD * 0.55); ctx.fill();
    // teeth
    const teethH = s * (0.075 + stiff * 0.02);
    ctx.fillStyle = '#fbf8f1';
    ctx.beginPath(); ctx.moveTo(-hw * 1.2, up - s * 0.05); ctx.lineTo(hw * 1.2, up - s * 0.05); ctx.lineTo(hw * 1.2, up + teethH); ctx.quadraticCurveTo(0, up + teethH + s * 0.02 * (1 - stiff), -hw * 1.2, up + teethH); ctx.fill();
    if (stiff > 0.3) {
      ctx.globalAlpha = S.clamp((stiff - 0.3) / 0.4);
      ctx.fillRect(-hw * 1.2, up + teethH + s * 0.012, hw * 2.4, lowD);
      ctx.strokeStyle = 'rgba(120,90,100,0.55)'; ctx.lineWidth = s * 0.012;
      ctx.beginPath(); ctx.moveTo(-hw, up + teethH + s * 0.006); ctx.lineTo(hw, up + teethH + s * 0.006);
      for (let i = -3; i <= 3; i++) { const x = i * hw * 0.27; ctx.moveTo(x, up - s * 0.02); ctx.lineTo(x, up + teethH + lowD); }
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = lipC; ctx.lineWidth = s * 0.03; ctx.lineJoin = 'round'; path(); ctx.stroke();
    ctx.restore();
  }
  function brows(ctx, cx, y, sep, s, o, col) {
    const raise = o.brow ?? 0, worry = o.worry ?? 0, turn = o.turn || 0;
    ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.075;
    for (const k of [-1, 1]) {
      const sc = 1 + 0.14 * turn * k, bx = cx + k * sep, by = y - raise * s * 0.08;
      const inner = bx - k * s * 0.13 * sc, outer = bx + k * s * 0.14 * sc;
      const innerY = by - worry * s * 0.07 + (o.angry || 0) * s * 0.07, outerY = by + worry * s * 0.03 + s * 0.01;
      ctx.beginPath(); ctx.moveTo(inner, innerY); ctx.quadraticCurveTo(bx, Math.min(innerY, outerY) - s * 0.045, outer, outerY); ctx.stroke();
    }
    ctx.restore();
  }
  // hair: back layer (behind head) and front layer (over the forehead). u = s.
  function hairBack(ctx, style, s, o) {
    const c = o.hair;
    if (style === 'bob' || style === 'long') {
      const bot = style === 'long' ? 1.55 : 0.72;
      S.solid(ctx, (g) => { g.beginPath(); g.moveTo(-0.98 * s, -0.25 * s); g.bezierCurveTo(-1.08 * s, -1.25 * s, 1.08 * s, -1.25 * s, 0.98 * s, -0.25 * s); g.lineTo(1.02 * s, bot * s); g.quadraticCurveTo(0.9 * s, (bot + 0.14) * s, 0.55 * s, bot * s); g.lineTo(-0.55 * s, bot * s); g.quadraticCurveTo(-0.9 * s, (bot + 0.14) * s, -1.02 * s, bot * s); g.closePath(); },
        { color: c, bounds: [-s, -1.2 * s, 2 * s, (bot + 1.2) * s], rim: o.rimColor, rimW: s * 0.05, rimDir: [o.rimSide || 1, -0.5], shadow: false });
    }
    if (style === 'bun') S.solid(ctx, (g) => { ell(g, 0.05 * s, -1.08 * s, 0.36 * s, 0.3 * s); }, { color: c, bounds: [-0.3 * s, -1.4 * s, 0.7 * s, 0.6 * s], rim: o.rimColor, rimW: s * 0.04, rimDir: [o.rimSide || 1, -0.6], shadow: false });
    if (style === 'curly') {
      const pts = [[-0.9, -0.25], [-0.98, -0.6], [-0.78, -0.95], [-0.4, -1.15], [0, -1.2], [0.4, -1.15], [0.78, -0.95], [0.98, -0.6], [0.9, -0.25]];
      S.solid(ctx, (g) => { g.beginPath(); for (const [px, py] of pts) { g.moveTo(px * s + 0.3 * s, py * s); g.arc(px * s, py * s, 0.3 * s, 0, TAU); } }, { color: c, bounds: [-1.2 * s, -1.5 * s, 2.4 * s, 1.4 * s], rim: o.rimColor, rimW: s * 0.04, rimDir: [o.rimSide || 1, -0.6], shadow: false });
    }
  }
  function hairFront(ctx, style, s, o) {
    const c = o.hair, fx = (o.turn || 0) * 0.18 * s, rim = o.rimColor, side = o.rimSide || 1;
    const bnd = [-s, -1.25 * s, 2 * s, 1.2 * s];
    if (style === 'bald') return;
    if (style === 'short' || style === 'bun' || style === 'buzz') {
      S.solid(ctx, (g) => {
        g.beginPath(); g.moveTo(-0.84 * s, -0.08 * s);
        g.bezierCurveTo(-0.98 * s, -0.95 * s, -0.35 * s, -1.2 * s, 0.05 * s, -1.13 * s);
        g.bezierCurveTo(0.7 * s, -1.12 * s, 0.98 * s, -0.7 * s, 0.84 * s, -0.08 * s);
        g.quadraticCurveTo(0.8 * s, -0.4 * s, 0.66 * s, -0.5 * s);
        g.bezierCurveTo(0.4 * s + fx, -0.62 * s, 0.05 * s + fx, -0.5 * s, -0.25 * s + fx, -0.62 * s);
        g.quadraticCurveTo(-0.55 * s, -0.66 * s, -0.7 * s, -0.46 * s);
        g.quadraticCurveTo(-0.8 * s, -0.35 * s, -0.84 * s, -0.08 * s);
        g.closePath();
      }, { color: c, bounds: bnd, rim, rimW: s * 0.05, rimDir: [side, -0.5], shadow: false, alpha: style === 'buzz' ? 0.8 : 1 });
      return;
    }
    if (style === 'bob' || style === 'long') {
      S.solid(ctx, (g) => {
        g.beginPath(); g.moveTo(-0.9 * s, 0.1 * s);
        g.bezierCurveTo(-1.02 * s, -1.0 * s, -0.3 * s, -1.2 * s, 0.1 * s, -1.14 * s);
        g.bezierCurveTo(0.75 * s, -1.1 * s, 1.02 * s, -0.7 * s, 0.9 * s, 0.1 * s);
        g.quadraticCurveTo(0.84 * s, -0.4 * s, 0.62 * s, -0.55 * s);
        g.bezierCurveTo(0.3 * s + fx, -0.6 * s, 0.0 + fx, -0.7 * s, -0.18 * s + fx, -0.86 * s);   // side part sweep
        g.bezierCurveTo(-0.35 * s + fx, -0.55 * s, -0.62 * s, -0.5 * s, -0.76 * s, -0.3 * s);
        g.quadraticCurveTo(-0.84 * s, -0.12 * s, -0.9 * s, 0.1 * s);
        g.closePath();
      }, { color: c, bounds: bnd, rim, rimW: s * 0.05, rimDir: [side, -0.5], shadow: false });
      return;
    }
    if (style === 'curly') {
      const pts = [[-0.62, -0.62], [-0.3, -0.78], [0.05, -0.8], [0.4, -0.76], [0.66, -0.6]];
      S.solid(ctx, (g) => { g.beginPath(); for (const [px, py] of pts) { g.moveTo((px * s + fx * 0.6) + 0.24 * s, py * s); g.arc(px * s + fx * 0.6, py * s, 0.24 * s, 0, TAU); } }, { color: c, bounds: bnd, rim, rimW: s * 0.04, rimDir: [side, -0.6], shadow: false });
    }
  }

  // ------------------------------------------------------------------ bust (front / three-quarter)
  // o: skin, hair, hairStyle, shirt, collar('round'|'v'|'hood'), turn(-1..1, + faces our right), look[x,y], lid, lowLid, closed, happy,
  //    smile, stiff, open, oh, frown, brow, worry, angry, blush, rimColor, rimSide(1 right,-1 left), beard, glasses, noBody, zip(0..1)
  S.bust = function (ctx, x, y, s, o = {}) {
    const skin = o.skin || S.SKIN[0], shirt = o.shirt || S.SHIRT[0], hair = o.hair || S.HAIR[0], style = o.hairStyle || 'short';
    const turn = o.turn || 0, rimC = o.rimColor || '#ffd2b8', side = o.rimSide || 1;
    const hopt = { ...o, hair, rimColor: S.mix(hair, rimC, 0.55), rimSide: side };
    ctx.save(); ctx.translate(x, y);
    if (!o.noBody) {
      ctx.save(); ctx.translate(0, (o.bodyDY || 0) * s); ctx.rotate(o.bodyRot || 0);
      // torso
      const sh = o.shrug || 0;
      S.solid(ctx, (g) => { g.beginPath(); g.moveTo(-1.75 * s, 3.4 * s); g.lineTo(-1.62 * s, 2.0 * s - sh * 0.2 * s); g.bezierCurveTo(-1.55 * s, 1.35 * s - sh * 0.25 * s, -1.0 * s, 1.18 * s - sh * 0.2 * s, -0.36 * s, 1.12 * s); g.lineTo(0.36 * s, 1.12 * s); g.bezierCurveTo(1.0 * s, 1.18 * s - sh * 0.2 * s, 1.55 * s, 1.35 * s - sh * 0.25 * s, 1.62 * s, 2.0 * s - sh * 0.2 * s); g.lineTo(1.75 * s, 3.4 * s); g.closePath(); },
        { color: shirt, bounds: [-1.7 * s, 1.1 * s, 3.4 * s, 2.3 * s], rim: S.mix(shirt, rimC, 0.6), rimW: s * 0.07, rimDir: [side, -0.8], sBlur: 50, sY: 20, shadow: !o.cheap });
      // neck, down into the neckline
      const nk = (g) => { g.beginPath(); g.moveTo(-0.3 * s + turn * 0.08 * s, 0.55 * s); g.lineTo(-0.36 * s, 1.14 * s); if (o.collar === 'v') g.lineTo(0, 1.58 * s); else g.quadraticCurveTo(0, 1.62 * s, 0.36 * s, 1.14 * s); g.lineTo(0.36 * s, 1.14 * s); g.lineTo(0.3 * s + turn * 0.08 * s, 0.55 * s); g.closePath(); };
      S.solid(ctx, nk, { color: S.dark(skin, 0.14), light: S.dark(skin, 0.02), dark: S.dark(skin, 0.32), bounds: [-0.36 * s, 0.55 * s, 0.72 * s, 1.05 * s], gx0: 0.5, gy0: 1, gx1: 0.5, gy1: 0, shadow: false, rim: S.mix(skin, rimC, 0.4), rimW: s * 0.04, rimDir: [side, 0] });
      // chin shadow on the neck
      ctx.save(); nk(ctx); ctx.clip(); const cg = ctx.createLinearGradient(0, 0.6 * s, 0, 0.95 * s); cg.addColorStop(0, 'rgba(60,20,30,0.35)'); cg.addColorStop(1, 'rgba(60,20,30,0)'); ctx.fillStyle = cg; ctx.fillRect(-0.5 * s, 0.55 * s, s, 0.45 * s); ctx.restore();
      // collar band along the neckline
      ctx.save(); ctx.strokeStyle = S.dark(shirt, 0.28); ctx.lineWidth = s * 0.075; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-0.4 * s, 1.12 * s); if (o.collar === 'v') { ctx.lineTo(0, 1.6 * s); ctx.lineTo(0.4 * s, 1.12 * s); } else ctx.quadraticCurveTo(0, 1.66 * s, 0.4 * s, 1.12 * s); ctx.stroke();
      ctx.strokeStyle = S.rgba(S.light(shirt, 0.4), 0.5); ctx.lineWidth = s * 0.018; ctx.beginPath(); ctx.moveTo(-0.44 * s, 1.16 * s); if (o.collar === 'v') { ctx.lineTo(0, 1.66 * s); ctx.lineTo(0.44 * s, 1.16 * s); } else ctx.quadraticCurveTo(0, 1.74 * s, 0.44 * s, 1.16 * s); ctx.stroke();
      ctx.restore();
      ctx.restore();
    }
    // head group
    ctx.save(); ctx.translate((o.headDX || 0) * s, (o.headDY || 0) * s); ctx.rotate(o.headRot || 0);
    hairBack(ctx, style, s, hopt);
    // ears
    for (const k of [-1, 1]) {
      const vis = 1 - S.clamp((turn * k) * 1.4 - 0.2);  // the far ear hides as the head turns
      if (vis <= 0.05) continue;
      const exx = k * (0.8 - 0.1 * Math.max(0, turn * k)) * s - turn * 0.1 * s;
      S.solid(ctx, (g) => { ell(g, exx, 0.06 * s, 0.14 * s * vis, 0.21 * s); }, { color: S.dark(skin, 0.08), bounds: [exx - 0.14 * s, -0.15 * s, 0.28 * s, 0.42 * s], shadow: false });
      ctx.fillStyle = S.rgba(S.dark(skin, 0.4), 0.45); ell(ctx, exx + k * 0.01 * s, 0.08 * s, 0.06 * s * vis, 0.11 * s); ctx.fill();
    }
    // head
    const headPath = (g) => { g.beginPath(); g.moveTo(0, -1.0 * s); g.bezierCurveTo(0.62 * s, -1.0 * s, 0.84 * s, -0.55 * s, 0.82 * s, -0.02 * s); g.bezierCurveTo(0.8 * s, 0.5 * s, 0.5 * s, 0.98 * s, 0.0 + turn * 0.08 * s, 1.0 * s); g.bezierCurveTo(-0.5 * s, 0.98 * s, -0.8 * s, 0.5 * s, -0.82 * s, -0.02 * s); g.bezierCurveTo(-0.84 * s, -0.55 * s, -0.62 * s, -1.0 * s, 0, -1.0 * s); g.closePath(); };
    S.solid(ctx, headPath, { color: skin, light: S.light(skin, 0.18), dark: S.dark(skin, 0.22), bounds: [-0.82 * s, -s, 1.64 * s, 2 * s], gx0: side > 0 ? 0.1 : 0.9, gx1: side > 0 ? 0.95 : 0.05, gy0: 0.1, gy1: 0.9, rim: S.mix(skin, rimC, 0.7), rimW: s * 0.06, rimDir: [side, -0.35], sBlur: 30, sY: 10, sColor: 'rgba(6,3,18,0.35)', shadow: !o.cheap });
    // face features
    const fx = turn * 0.3 * s, eyeY = (o.eyeY ?? -0.02) * s, sep = 0.33 * s * (1 - 0.18 * Math.abs(turn));
    if (o.blush !== 0) { ctx.save(); ctx.globalAlpha *= o.blush ?? 0.5; for (const k of [-1, 1]) { const g = ctx.createRadialGradient(fx + k * 0.46 * s, 0.3 * s, 0, fx + k * 0.46 * s, 0.3 * s, 0.2 * s); g.addColorStop(0, 'rgba(255,105,120,0.55)'); g.addColorStop(1, 'rgba(255,105,120,0)'); ctx.fillStyle = g; ctx.fillRect(fx + k * 0.46 * s - 0.2 * s, 0.1 * s, 0.4 * s, 0.4 * s); } ctx.restore(); }
    brows(ctx, fx, eyeY - 0.24 * s, sep, s, o, S.dark(hair, 0.15));
    for (const k of [-1, 1]) {
      const sc = 1 + 0.14 * turn * k * (o.wide ? 0.5 : 1), wide = 1 + (o.wide || 0) * 0.25;
      eye(ctx, fx + k * sep, eyeY, 0.105 * s * sc * wide, 0.125 * s * wide, { lid: o.lid, lowLid: o.lowLid, look: o.look || [0, 0], skin: S.dark(skin, 0.06), closed: o.closed, happy: o.happy, iris: o.iris, lash: S.dark(hair, 0.3) });
    }
    // nose
    ctx.save(); const nx = fx * 1.3;
    ctx.fillStyle = S.rgba(S.dark(skin, 0.5), 0.35); ell(ctx, nx + turn * 0.02 * s, 0.24 * s, 0.085 * s, 0.05 * s); ctx.fill();
    ctx.fillStyle = S.rgba(S.light(skin, 0.5), 0.55); ell(ctx, nx - 0.02 * s, 0.17 * s, 0.035 * s, 0.03 * s); ctx.fill();
    ctx.strokeStyle = S.rgba(S.dark(skin, 0.5), 0.45); ctx.lineWidth = s * 0.028; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(nx + (turn >= 0 ? 0.06 : -0.06) * s, 0.02 * s); ctx.quadraticCurveTo(nx + (turn >= 0 ? 0.1 : -0.1) * s, 0.18 * s, nx + (turn >= 0 ? 0.04 : -0.04) * s, 0.26 * s); ctx.stroke();
    ctx.restore();
    if (o.beard) { ctx.save(); ctx.fillStyle = S.rgba(hair, 0.85); ctx.beginPath(); ctx.moveTo(-0.8 * s, 0.05 * s); ctx.bezierCurveTo(-0.78 * s, 0.6 * s, -0.4 * s, 1.02 * s, 0 + turn * 0.08 * s, 1.04 * s); ctx.bezierCurveTo(0.4 * s, 1.02 * s, 0.78 * s, 0.6 * s, 0.8 * s, 0.05 * s); ctx.bezierCurveTo(0.6 * s, 0.5 * s, 0.3 * s, 0.34 * s, fx * 1.1, 0.36 * s); ctx.bezierCurveTo(-0.3 * s, 0.34 * s, -0.6 * s, 0.5 * s, -0.8 * s, 0.05 * s); ctx.fill(); ctx.restore(); }
    mouth(ctx, fx * 1.15, (o.mouthY ?? 0.5) * s, s, o, skin);
    if (o.zip) {   // zipped mouth: a zipper drawn across
      const zp = S.clamp(o.zip), zw = 0.46 * s, mx = fx * 1.15, my = (o.mouthY ?? 0.5) * s;
      ctx.save(); ctx.strokeStyle = '#3b3346'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(mx - zw, my); ctx.lineTo(mx - zw + 2 * zw * zp, my); ctx.stroke();
      ctx.strokeStyle = '#c9c3d6'; ctx.lineWidth = s * 0.03;
      ctx.beginPath(); for (let i = 0; i <= 10 * zp; i++) { const xx = mx - zw + i * zw * 0.2; ctx.moveTo(xx, my - s * 0.05); ctx.lineTo(xx, my + s * 0.05); } ctx.stroke();
      const px = mx - zw + 2 * zw * zp; ctx.fillStyle = '#d9d4e4'; rr(ctx, px - s * 0.04, my - s * 0.02, s * 0.08, s * 0.16, s * 0.03); ctx.fill();
      ctx.restore();
    }
    hairFront(ctx, style, s, hopt);
    if (o.glasses) { ctx.save(); ctx.strokeStyle = '#1e1a26'; ctx.lineWidth = s * 0.045; for (const k of [-1, 1]) { rr(ctx, fx + k * sep - 0.17 * s, eyeY - 0.14 * s, 0.34 * s, 0.28 * s, 0.1 * s); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(fx - sep + 0.17 * s, eyeY - 0.02 * s); ctx.lineTo(fx + sep - 0.17 * s, eyeY - 0.02 * s); ctx.stroke(); ctx.restore(); }
    if (o.sweat) { const a = S.clamp(o.sweat); ctx.save(); ctx.globalAlpha *= a; const sx = side * -0.62 * s + fx * 0.3, sy = -0.45 * s + (1 - a) * 0.1 * s; ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.moveTo(sx, sy - 0.14 * s); ctx.quadraticCurveTo(sx + 0.09 * s, sy + 0.02 * s, sx, sy + 0.06 * s); ctx.quadraticCurveTo(sx - 0.09 * s, sy + 0.02 * s, sx, sy - 0.14 * s); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ell(ctx, sx - 0.02 * s, sy, 0.015 * s, 0.03 * s); ctx.fill(); ctx.restore(); }
    ctx.restore();
    ctx.restore();
  };

  // ------------------------------------------------------------------ full standing person (feet at x, footY); s = half head height
  // o: everything bust() takes for the face, plus pants, shoes, walk (phase, 0 = still), lean (rad, + = backwards/away to the left),
  //    arms: 'down' | 'nose' (a hand up at the nose)
  S.person = function (ctx, x, footY, s, o = {}) {
    const skin = o.skin || S.SKIN[1], shirt = o.shirt || S.SHIRT[1], pants = o.pants || '#2e2a4a', rimC = o.rimColor || '#ffd2b8';
    const walk = o.walk || 0, sw = Math.sin(walk) * (o.stride ?? 0.32);
    ctx.save(); ctx.translate(x, footY); if (o.flip) ctx.scale(-1, 1); ctx.rotate(-(o.lean || 0));
    const hipY = -2.35 * s, headY = -5.25 * s - Math.abs(Math.cos(walk)) * 0.08 * s * (walk ? 1 : 0);
    // legs
    for (const k of [-1, 1]) {
      const a = k * sw;
      ctx.save(); ctx.translate(k * 0.3 * s, hipY); ctx.rotate(a);
      S.solid(ctx, (g) => { A.roundRect(g, -0.26 * s, -0.1 * s, 0.52 * s, 2.4 * s, 0.24 * s); }, { color: k < 0 ? S.dark(pants, 0.15) : pants, bounds: [-0.26 * s, 0, 0.52 * s, 2.4 * s], shadow: false, rim: S.mix(pants, rimC, 0.4), rimW: s * 0.05, rimDir: [1, -0.3] });
      ctx.fillStyle = '#1a1622'; S.ell(ctx, 0.12 * s, 2.3 * s, 0.4 * s, 0.17 * s); ctx.fill();
      ctx.restore();
    }
    // torso
    ctx.save(); ctx.translate(0, headY);
    const torso = (g) => { g.beginPath(); g.moveTo(-0.95 * s, 1.35 * s); g.bezierCurveTo(-0.9 * s, 1.12 * s, -0.5 * s, 1.08 * s, -0.3 * s, 1.08 * s); g.lineTo(0.3 * s, 1.08 * s); g.bezierCurveTo(0.5 * s, 1.08 * s, 0.9 * s, 1.12 * s, 0.95 * s, 1.35 * s); g.lineTo(0.8 * s, 3.1 * s); g.quadraticCurveTo(0, 3.25 * s, -0.8 * s, 3.1 * s); g.closePath(); };
    // back arm
    const arm = (k, up) => {
      ctx.save(); ctx.translate(k * 0.82 * s, 1.35 * s); ctx.rotate(up ? -2.5 * k * 0 + (k < 0 ? 2.6 : -2.6) * up : -k * 0.08 - k * sw * 0.6);
      S.solid(ctx, (g) => { A.roundRect(g, -0.2 * s, -0.1 * s, 0.4 * s, 1.75 * s, 0.2 * s); }, { color: S.dark(shirt, 0.1), bounds: [-0.2 * s, 0, 0.4 * s, 1.75 * s], shadow: false, rim: S.mix(shirt, rimC, 0.5), rimW: s * 0.04, rimDir: [1, -0.3] });
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, 1.78 * s, 0.2 * s, 0, TAU); ctx.fill();
      ctx.restore();
    };
    arm(-1, 0);
    S.solid(ctx, torso, { color: shirt, bounds: [-0.95 * s, 1.08 * s, 1.9 * s, 2.1 * s], rim: S.mix(shirt, rimC, 0.6), rimW: s * 0.06, rimDir: [1, -0.6], shadow: false });
    ctx.restore();
    // head via bust (no body) + neck
    ctx.save(); ctx.translate(0, headY);
    S.solid(ctx, (g) => { A.roundRect(g, -0.26 * s, 0.5 * s, 0.52 * s, 0.7 * s, 0.1 * s); }, { color: S.dark(skin, 0.2), bounds: [-0.26 * s, 0.5 * s, 0.52 * s, 0.7 * s], shadow: false });
    S.bust(ctx, 0, 0, s, { ...o, noBody: true });
    ctx.restore();
    ctx.save(); ctx.translate(0, headY); arm(1, o.armUp || 0); ctx.restore();
    ctx.restore();
  };

  // ------------------------------------------------------------------ back of a head (over-the-shoulder), facing right
  S.backHead = function (ctx, x, y, s, o = {}) {
    const skin = o.skin || S.SKIN[1], hair = o.hair || S.HAIR[0], shirt = o.shirt || '#6b4fe0', rimC = o.rimColor || '#ffb89a';
    ctx.save(); ctx.translate(x, y); if (o.flip) ctx.scale(-1, 1);
    // shoulders from behind
    S.solid(ctx, (g) => { g.beginPath(); g.moveTo(-1.9 * s, 3.6 * s); g.lineTo(-1.75 * s, 2.0 * s); g.bezierCurveTo(-1.65 * s, 1.3 * s, -0.9 * s, 1.1 * s, -0.3 * s, 1.08 * s); g.lineTo(0.4 * s, 1.08 * s); g.bezierCurveTo(1.1 * s, 1.1 * s, 1.7 * s, 1.3 * s, 1.8 * s, 2.0 * s); g.lineTo(1.95 * s, 3.6 * s); g.closePath(); },
      { color: shirt, bounds: [-1.9 * s, 1.08 * s, 3.8 * s, 2.5 * s], rim: S.mix(shirt, rimC, 0.65), rimW: s * 0.09, rimDir: [1, -0.7], sBlur: 60, sY: 24, gx0: 0.9, gx1: 0.1 });
    // neck
    S.solid(ctx, (g) => { g.beginPath(); g.moveTo(-0.34 * s, 0.4 * s); g.lineTo(-0.38 * s, 1.25 * s); g.quadraticCurveTo(0.05 * s, 1.36 * s, 0.4 * s, 1.22 * s); g.lineTo(0.38 * s, 0.4 * s); g.closePath(); },
      { color: S.dark(skin, 0.3), bounds: [-0.38 * s, 0.4 * s, 0.78 * s, 0.9 * s], shadow: false, rim: S.mix(skin, rimC, 0.6), rimW: s * 0.05, rimDir: [1, 0] });
    // head (skin shows as the cheek/jaw sliver on the right)
    const head = (g) => { g.beginPath(); g.moveTo(0, -1.0 * s); g.bezierCurveTo(0.64 * s, -1.0 * s, 0.86 * s, -0.5 * s, 0.84 * s, 0.0); g.bezierCurveTo(0.82 * s, 0.5 * s, 0.55 * s, 0.95 * s, 0.1 * s, 1.0 * s); g.bezierCurveTo(-0.45 * s, 0.98 * s, -0.8 * s, 0.5 * s, -0.82 * s, 0.0); g.bezierCurveTo(-0.84 * s, -0.55 * s, -0.62 * s, -1.0 * s, 0, -1.0 * s); g.closePath(); };
    S.solid(ctx, head, { color: S.dark(skin, 0.15), bounds: [-0.84 * s, -s, 1.68 * s, 2 * s], rim: S.mix(skin, rimC, 0.75), rimW: s * 0.07, rimDir: [1, -0.2], sBlur: 20, gx0: 0.9, gx1: 0.1 });
    // ear on the right
    S.solid(ctx, (g) => { ell(g, 0.8 * s, 0.05 * s, 0.13 * s, 0.22 * s, -0.15); }, { color: S.dark(skin, 0.1), bounds: [0.67 * s, -0.17 * s, 0.26 * s, 0.44 * s], rim: S.mix(skin, rimC, 0.8), rimW: s * 0.04, rimDir: [1, -0.3], shadow: false });
    // hair covering the back of the head
    S.solid(ctx, (g) => { g.beginPath(); g.moveTo(0.66 * s, -0.3 * s); g.bezierCurveTo(0.8 * s, -0.8 * s, 0.4 * s, -1.12 * s, -0.05 * s, -1.1 * s); g.bezierCurveTo(-0.72 * s, -1.08 * s, -0.95 * s, -0.5 * s, -0.86 * s, 0.1 * s); g.bezierCurveTo(-0.8 * s, 0.6 * s, -0.5 * s, 0.85 * s, -0.1 * s, 0.82 * s); g.bezierCurveTo(0.25 * s, 0.8 * s, 0.5 * s, 0.6 * s, 0.6 * s, 0.25 * s); g.quadraticCurveTo(0.68 * s, 0.0, 0.66 * s, -0.3 * s); g.closePath(); },
      { color: hair, light: S.light(hair, 0.16), dark: S.dark(hair, 0.3), bounds: [-0.9 * s, -1.1 * s, 1.7 * s, 1.95 * s], rim: S.mix(hair, rimC, 0.6), rimW: s * 0.06, rimDir: [1, -0.4], shadow: false, gx0: 0.85, gy0: 0.05, gx1: 0.2, gy1: 0.95 });
    // hair strands and a soft sheen so it reads as a head, not a blob
    ctx.save();
    ctx.beginPath(); ctx.ellipse(-0.1 * s, -0.1 * s, 0.84 * s, 0.95 * s, 0, 0, TAU); ctx.clip();
    const sh = ctx.createRadialGradient(0.25 * s, -0.55 * s, 0, 0.25 * s, -0.55 * s, 0.7 * s); sh.addColorStop(0, S.rgba(S.light(hair, 0.5), 0.35)); sh.addColorStop(1, S.rgba(S.light(hair, 0.5), 0));
    ctx.fillStyle = sh; ctx.fillRect(-s, -1.2 * s, 2 * s, 1.4 * s);
    ctx.strokeStyle = S.rgba(S.light(hair, 0.4), 0.16); ctx.lineWidth = s * 0.02; ctx.lineCap = 'round';
    for (const [x0, y0, x1, y1, bx] of [[0.3, -0.9, 0.5, -0.1, 0.62], [0.1, -0.95, 0.3, 0.2, 0.5], [-0.15, -0.92, -0.05, 0.35, 0.25], [-0.45, -0.8, -0.5, 0.3, -0.2], [0.45, -0.7, 0.55, 0.25, 0.7]]) {
      ctx.beginPath(); ctx.moveTo(x0 * s, y0 * s); ctx.quadraticCurveTo(bx * s, (y0 + y1) * 0.5 * s, x1 * s, y1 * s); ctx.stroke();
    }
    ctx.restore();
    // nape hairline
    ctx.strokeStyle = S.rgba(S.dark(hair, 0.2), 0.8); ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(-0.34 * s, 0.72 * s); ctx.quadraticCurveTo(0.0, 0.86 * s, 0.34 * s, 0.7 * s); ctx.stroke();
    ctx.restore();
  };

  // ------------------------------------------------------------------ profile head, facing right
  // o: skin, hair, shirt, open (mouth 0..1), lid, closed, happy, brow, blush, rimColor, body(bool), nostril glow, flip
  S.profilePath = function (g, s, m = 0) {
    g.beginPath();
    g.moveTo(-0.3 * s, 1.5 * s);
    g.bezierCurveTo(-0.32 * s, 1.15 * s, -0.4 * s, 0.9 * s, -0.55 * s, 0.62 * s);
    g.bezierCurveTo(-0.92 * s, 0.25 * s, -0.98 * s, -0.55 * s, -0.48 * s, -0.9 * s);
    g.bezierCurveTo(-0.06 * s, -1.16 * s, 0.5 * s, -1.02 * s, 0.63 * s, -0.46 * s);
    g.bezierCurveTo(0.67 * s, -0.3 * s, 0.68 * s, -0.2 * s, 0.63 * s, -0.12 * s);
    g.quadraticCurveTo(0.6 * s, -0.07 * s, 0.63 * s, -0.02 * s);
    g.bezierCurveTo(0.72 * s, 0.1 * s, 0.82 * s, 0.18 * s, 0.82 * s, 0.25 * s);
    g.bezierCurveTo(0.82 * s, 0.3 * s, 0.75 * s, 0.32 * s, 0.69 * s, 0.31 * s);
    g.quadraticCurveTo(0.655 * s, 0.34 * s, 0.665 * s, 0.37 * s);
    g.quadraticCurveTo(0.71 * s, 0.41 * s, 0.7 * s, 0.44 * s);
    g.lineTo(0.66 * s, 0.47 * s + m * 0.05 * s);
    g.quadraticCurveTo(0.7 * s, 0.5 * s + m * 0.1 * s, 0.68 * s, 0.54 * s + m * 0.1 * s);
    g.quadraticCurveTo(0.61 * s, 0.58 * s + m * 0.1 * s, 0.64 * s, 0.65 * s + m * 0.1 * s);
    g.bezierCurveTo(0.67 * s, 0.75 * s + m * 0.08 * s, 0.6 * s, 0.86 * s + m * 0.06 * s, 0.45 * s, 0.87 * s + m * 0.05 * s);
    g.bezierCurveTo(0.3 * s, 0.89 * s, 0.22 * s, 0.93 * s, 0.18 * s, 1.03 * s);
    g.bezierCurveTo(0.14 * s, 1.16 * s, 0.13 * s, 1.32 * s, 0.14 * s, 1.5 * s);
    g.closePath();
  };
  S.profile = function (ctx, x, y, s, o = {}) {
    const skin = o.skin || S.SKIN[1], hair = o.hair || S.HAIR[0], rimC = o.rimColor || '#ffc9a8', m = o.open || 0;
    ctx.save(); ctx.translate(x, y); if (o.flip) ctx.scale(-1, 1); if (o.rot) ctx.rotate(o.rot);
    S.solid(ctx, (g) => S.profilePath(g, s, m), { color: skin, light: S.light(skin, 0.2), dark: S.dark(skin, 0.25), bounds: [-0.95 * s, -1.1 * s, 1.8 * s, 2.6 * s], gx0: 0.9, gy0: 0.2, gx1: 0.1, gy1: 0.8, rim: S.mix(skin, rimC, 0.75), rimW: s * 0.05, rimDir: [1, -0.25], sBlur: 30, sY: 10 });
    if (o.body !== false) {
      const shirt = o.shirt || '#7c5cff';
      S.solid(ctx, (g) => { g.beginPath(); g.moveTo(-1.2 * s, 3.2 * s); g.lineTo(-1.1 * s, 1.9 * s); g.bezierCurveTo(-1.0 * s, 1.4 * s, -0.6 * s, 1.22 * s, -0.3 * s, 1.18 * s); g.quadraticCurveTo(0.0, 1.3 * s, 0.22 * s, 1.18 * s); g.lineTo(0.3 * s, 1.25 * s); g.bezierCurveTo(0.7 * s, 1.35 * s, 0.9 * s, 1.7 * s, 0.95 * s, 2.2 * s); g.lineTo(1.0 * s, 3.2 * s); g.closePath(); },
        { color: shirt, bounds: [-1.2 * s, 1.2 * s, 2.2 * s, 2 * s], rim: S.mix(shirt, rimC, 0.6), rimW: s * 0.07, rimDir: [1, -0.6], sBlur: 50, sY: 20 });
    }
    // lips gap when open
    if (m > 0.05) { ctx.fillStyle = '#4a1826'; ctx.beginPath(); ctx.moveTo(0.66 * s, 0.465 * s); ctx.quadraticCurveTo(0.7 * s, 0.47 * s + m * 0.04 * s, 0.695 * s, 0.49 * s + m * 0.07 * s); ctx.quadraticCurveTo(0.65 * s, 0.5 * s + m * 0.06 * s, 0.6 * s, 0.48 * s + m * 0.03 * s); ctx.closePath(); ctx.fill(); }
    // lip tint
    ctx.fillStyle = S.rgba('#d8606e', 0.35); ell(ctx, 0.665 * s, 0.47 * s + m * 0.03 * s, 0.045 * s, 0.06 * s); ctx.fill();
    // nostril
    ctx.strokeStyle = S.rgba(S.dark(skin, 0.55), 0.8); ctx.lineWidth = s * 0.025; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0.66 * s, 0.27 * s); ctx.quadraticCurveTo(0.72 * s, 0.29 * s, 0.74 * s, 0.26 * s); ctx.stroke();
    ctx.fillStyle = S.rgba(S.dark(skin, 0.4), 0.35); ell(ctx, 0.69 * s, 0.24 * s, 0.07 * s, 0.045 * s, 0.3); ctx.fill();
    // cheek
    if (o.blush !== 0) { const g = ctx.createRadialGradient(0.42 * s, 0.28 * s, 0, 0.42 * s, 0.28 * s, 0.2 * s); g.addColorStop(0, `rgba(255,105,120,${0.3 * (o.blush ?? 1)})`); g.addColorStop(1, 'rgba(255,105,120,0)'); ctx.fillStyle = g; ctx.fillRect(0.2 * s, 0.05 * s, 0.45 * s, 0.45 * s); }
    // eye
    const ex = 0.47 * s, ey = -0.04 * s;
    if (o.closed) { ctx.strokeStyle = '#2a1a24'; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(ex - 0.06 * s, ey); ctx.quadraticCurveTo(ex, ey + (o.happy ? -0.04 : 0.035) * s, ex + 0.07 * s, ey - 0.01 * s); ctx.stroke(); }
    else {
      ctx.fillStyle = '#fbf6f1'; ctx.beginPath(); ctx.moveTo(ex - 0.05 * s, ey); ctx.quadraticCurveTo(ex + 0.03 * s, ey - 0.07 * s, ex + 0.085 * s, ey - 0.005 * s); ctx.quadraticCurveTo(ex + 0.03 * s, ey + 0.05 * s, ex - 0.05 * s, ey); ctx.fill();
      ctx.fillStyle = '#2a1812'; ell(ctx, ex + 0.045 * s, ey - 0.002 * s, 0.026 * s, 0.036 * s); ctx.fill();
      ctx.fillStyle = '#fff'; ell(ctx, ex + 0.037 * s, ey - 0.014 * s, 0.009 * s, 0.009 * s); ctx.fill();
      const lid = S.clamp(o.lid ?? 0.1);
      if (lid > 0.1) { ctx.fillStyle = S.dark(skin, 0.08); ctx.beginPath(); ctx.moveTo(ex - 0.06 * s, ey - 0.001 * s); ctx.quadraticCurveTo(ex + 0.03 * s, ey - 0.08 * s, ex + 0.095 * s, ey - 0.006 * s); ctx.lineTo(ex + 0.095 * s, ey - 0.06 * s + lid * 0.07 * s); ctx.quadraticCurveTo(ex + 0.02 * s, ey - 0.07 * s + lid * 0.1 * s, ex - 0.06 * s, ey - 0.001 * s); ctx.fill(); }
      ctx.strokeStyle = '#2a1a24'; ctx.lineWidth = s * 0.022; ctx.beginPath(); ctx.moveTo(ex - 0.055 * s, ey - 0.005 * s); ctx.quadraticCurveTo(ex + 0.03 * s, ey - 0.075 * s + (o.lid ?? 0.1) * 0.05 * s, ex + 0.1 * s, ey - 0.01 * s); ctx.stroke();
    }
    // brow
    ctx.strokeStyle = S.dark(hair, 0.1); ctx.lineWidth = s * 0.05; ctx.beginPath(); const bY = -0.2 * s - (o.brow || 0) * 0.06 * s; ctx.moveTo(0.36 * s, bY + 0.01 * s); ctx.quadraticCurveTo(0.47 * s, bY - 0.04 * s, 0.58 * s, bY + 0.015 * s + (o.browIn || 0) * 0.03 * s); ctx.stroke();
    // ear
    S.solid(ctx, (g) => { ell(g, -0.12 * s, 0.08 * s, 0.13 * s, 0.2 * s, 0.15); }, { color: S.dark(skin, 0.06), bounds: [-0.25 * s, -0.12 * s, 0.26 * s, 0.4 * s], shadow: false, rim: S.mix(skin, rimC, 0.6), rimW: s * 0.03, rimDir: [1, -0.4] });
    ctx.strokeStyle = S.rgba(S.dark(skin, 0.5), 0.6); ctx.lineWidth = s * 0.025; ctx.beginPath(); ctx.arc(-0.11 * s, 0.07 * s, 0.07 * s, -1.8, 1.4); ctx.stroke();
    // hair
    S.solid(ctx, (g) => { g.beginPath(); g.moveTo(0.58 * s, -0.62 * s); g.bezierCurveTo(0.5 * s, -1.08 * s, -0.2 * s, -1.2 * s, -0.55 * s, -0.95 * s); g.bezierCurveTo(-1.02 * s, -0.6 * s, -0.98 * s, 0.1 * s, -0.62 * s, 0.55 * s); g.quadraticCurveTo(-0.45 * s, 0.4 * s, -0.36 * s, 0.1 * s); g.quadraticCurveTo(-0.28 * s, -0.16 * s, -0.08 * s, -0.2 * s); g.quadraticCurveTo(0.12 * s, -0.28 * s, 0.2 * s, -0.5 * s); g.quadraticCurveTo(0.4 * s, -0.56 * s, 0.58 * s, -0.62 * s); g.closePath(); },
      { color: hair, bounds: [-1 * s, -1.2 * s, 1.6 * s, 1.75 * s], rim: S.mix(hair, rimC, 0.55), rimW: s * 0.045, rimDir: [1, -0.6], shadow: false, gx0: 0.9, gx1: 0.1 });
    ctx.restore();
  };

  // ------------------------------------------------------------------ bubbles, stink, sparkles
  // thought cloud (tail = small circles toward tx,ty) or speech bubble (o.speech) centred at x,y; p = pop progress
  S.bubble = function (ctx, x, y, w, h, p, o = {}) {
    if (p <= 0) return;
    const fill = o.fill || '#fbf8f2', line = o.line || 'rgba(20,12,30,0.0)';
    ctx.save();
    if (!o.speech && o.tail) {   // trailing dots first
      const [tx, ty] = o.tail;
      for (let i = 0; i < 3; i++) {
        const k = S.clamp(p * 3 - i * 0.6); if (k <= 0) continue;
        const u = 0.25 + i * 0.22, px = S.lerp(tx, x, u * 0.8), py = S.lerp(ty, y + h * 0.35, u * 0.8), r = (8 + i * 9) * A.ease.outBack(Math.min(1, k));
        ctx.fillStyle = fill; ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; ctx.beginPath(); ctx.arc(px, py, Math.max(0, r), 0, TAU); ctx.fill();
      }
    }
    const k = S.clamp((p - (o.tail ? 0.45 : 0)) / (o.tail ? 0.55 : 1)); if (k <= 0) { ctx.restore(); return; }
    const sc = A.ease.outBack(k, 2.0); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(o.rot || 0);
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; ctx.fillStyle = fill;
    ctx.beginPath();
    if (o.speech) {
      rr(ctx, -w / 2, -h / 2, w, h, Math.min(h / 2, o.radius ?? 36)); ctx.fill();
      const sd = o.tailSide || -1; ctx.beginPath(); ctx.moveTo(sd * w * 0.22, h / 2 - 4); ctx.lineTo(sd * w * 0.36, h / 2 + h * 0.34); ctx.lineTo(sd * w * 0.06, h / 2 - 4); ctx.closePath(); ctx.fill();
    } else {
      const n = o.lobes || 9;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rx = w * 0.42, ry = h * 0.38, r = Math.min(w, h) * (0.28 + 0.05 * Math.sin(i * 2.3)); ctx.moveTo(Math.cos(a) * rx + r, Math.sin(a) * ry); ctx.arc(Math.cos(a) * rx, Math.sin(a) * ry, r, 0, TAU); }
      ctx.ellipse(0, 0, w * 0.44, h * 0.4, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };
  // cached soft cloud sprite (fast smell/steam puffs): draws a 2r-wide cloud centred at x,y
  const puffCache = {};
  S.puff = function (ctx, x, y, r, alpha, color = '#b9e35a', seed = 0) {
    const key = color + '|' + (seed % 4);
    if (!puffCache[key]) {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const rnd = A.rand('puff' + key);
      for (let i = 0; i < 7; i++) { const rr0 = 40 + rnd() * 45, ox = 128 + (rnd() - 0.5) * 90, oy = 128 + (rnd() - 0.5) * 60; const gr = g.createRadialGradient(ox, oy, 0, ox, oy, rr0); gr.addColorStop(0, S.rgba(color, 0.55)); gr.addColorStop(1, S.rgba(color, 0)); g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, rr0, 0, TAU); g.fill(); }
      puffCache[key] = c;
    }
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= Math.min(1, alpha); ctx.drawImage(puffCache[key], x - r, y - r, r * 2, r * 2); ctx.restore();
  };
  // cartoon stink: a translucent green puff with 3 wavy lines rising. p = presence 0..1
  S.stink = function (ctx, x, y, s, t, p = 1, o = {}) {
    if (p <= 0) return;
    const col = o.color || A.P.gas;
    ctx.save(); ctx.globalAlpha *= S.clamp(p);
    if (o.puff !== false) for (let i = 0; i < 3; i++) A.icons.puff(ctx, x + Math.sin(t * 1.2 + i * 2) * s * 0.1 + (i - 1) * s * 0.35, y + Math.cos(t + i) * s * 0.06, s * 0.9, 0.35, col);
    ctx.strokeStyle = o.lineColor || col; ctx.lineWidth = o.lw || s * 0.09; ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
      const bx = x + k * s * 0.42, len = s * (1.1 - Math.abs(k) * 0.15), rise = ((t * 0.6 + k * 0.33) % 1 + 1) % 1;
      ctx.globalAlpha = S.clamp(p) * (0.9 - rise * 0.5) * (o.alpha ?? 1);
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) { const u = i / 16, yy = y - s * 0.3 - u * len - rise * s * 0.25, xx = bx + Math.sin(u * 9 + t * 5 + k) * s * 0.12; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
    }
    ctx.restore();
  };
  // wavy stink lines only (for the recoil), drawn radiating from x,y along angle a
  S.wavy = function (ctx, x, y, len, a, t, p, o = {}) {
    if (p <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.strokeStyle = o.color || A.P.gas; ctx.lineWidth = o.lw || 7; ctx.lineCap = 'round'; ctx.globalAlpha *= S.clamp(p);
    ctx.beginPath(); const n = 18, L = len * S.clamp(p);
    for (let i = 0; i <= n; i++) { const u = i / n, xx = u * L, yy = Math.sin(u * 10 + t * 8 + (o.ph || 0)) * (o.amp || 8); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke(); ctx.restore();
  };
  S.sparkle = function (ctx, x, y, s, p, color = '#ffffff') {
    if (p <= 0 || p >= 1) return;
    const k = Math.sin(p * Math.PI), r = s * k; ctx.save(); ctx.translate(x, y); ctx.rotate(p * 1.2); ctx.fillStyle = color; ctx.globalAlpha *= k;
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rad = i % 2 ? r * 0.22 : r; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); ctx.restore();
  };

  // ------------------------------------------------------------------ type
  // big confident type with a 2.5D extrusion; p = reveal (rise + fade). o: size, color, side (extrude colour), depth, align, tracking, glow
  S.type = function (ctx, str, x, y, p, o = {}) {
    if (p <= 0) return;
    const size = o.size || 120, depth = o.depth ?? Math.round(size * 0.045), k = S.clamp(p);
    ctx.save(); ctx.globalAlpha *= S.clamp(k * 1.5);
    const dy = (1 - A.ease.outCubic(k)) * size * 0.35;
    const opt = { size, weight: o.weight || 700, align: o.align || 'center', tracking: o.tracking ?? 2, family: o.family };
    if (o.clip) { const w = A.measure(ctx, str, opt); ctx.beginPath(); const ax = opt.align === 'center' ? -w / 2 : opt.align === 'right' ? -w : 0; ctx.rect(x + ax - 20, y - size * 1.1, w + 40, size * 1.45); ctx.clip(); }
    for (let i = depth; i >= 1; i--) A.text(ctx, str, x, y + dy + i, { ...opt, color: o.side || '#2a1f4a' });
    A.text(ctx, str, x, y + dy, { ...opt, color: o.color || A.P.ink, shadow: 'rgba(0,0,0,0.5)', shadowBlur: size * 0.35, shadowY: size * 0.1 });
    if (o.glow) A.text(ctx, str, x, y + dy, { ...opt, color: o.color || A.P.ink, glow: o.glow, glowBlur: size * 0.3, alpha: 0.35 });
    ctx.restore();
  };
  // lime chip with defaults (pop)
  S.chip = function (ctx, str, x, y, p, o = {}) { return A.label(ctx, str, x, y, { size: 46, align: 'center', ...o, p }); };

  // ------------------------------------------------------------------ icons (2.5D, centred on x,y, size s ~ half height)
  const I = {};
  I.garlic = function (ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y);
    const lobes = [[-0.62, 0.22, 0.27, 0.5, -0.35], [0.62, 0.22, 0.27, 0.5, 0.35], [-0.34, 0.12, 0.33, 0.68, -0.16], [0.34, 0.12, 0.33, 0.68, 0.16], [0, 0.06, 0.36, 0.78, 0]];
    const body = (g) => { g.beginPath(); for (const [lx, ly, rx, ry, r] of lobes) { g.moveTo(lx * s + Math.cos(r) * rx * s, ly * s + Math.sin(r) * rx * s); g.ellipse(lx * s, ly * s, rx * s, ry * s, r, 0, TAU); }
      g.moveTo(-0.16 * s, -0.55 * s); g.quadraticCurveTo(-0.05 * s, -0.95 * s, -0.02 * s, -1.2 * s); g.lineTo(0.05 * s, -1.2 * s); g.quadraticCurveTo(0.06 * s, -0.95 * s, 0.16 * s, -0.55 * s); g.closePath(); };
    S.solid(ctx, body, { color: '#f2ebe0', light: '#fffdf8', dark: '#c4b3a4', bounds: [-0.9 * s, -1.2 * s, 1.8 * s, 2.1 * s], rim: '#fff4e8', rimW: s * 0.045, gloss: 0.4, glossX: 0.4, glossY: 0.45 });
    // clove seams + faint purple streaks
    ctx.lineCap = 'round';
    for (const k of [-1, 1]) {
      ctx.strokeStyle = 'rgba(150,120,120,0.5)'; ctx.lineWidth = s * 0.03;
      ctx.beginPath(); ctx.moveTo(k * 0.1 * s, -0.6 * s); ctx.quadraticCurveTo(k * 0.26 * s, 0.1 * s, k * 0.14 * s, 0.82 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k * 0.36 * s, -0.42 * s); ctx.quadraticCurveTo(k * 0.64 * s, 0.1 * s, k * 0.48 * s, 0.68 * s); ctx.stroke();
      ctx.strokeStyle = 'rgba(190,110,170,0.28)'; ctx.lineWidth = s * 0.05;
      ctx.beginPath(); ctx.moveTo(k * 0.22 * s, 0.2 * s); ctx.quadraticCurveTo(k * 0.3 * s, 0.55 * s, k * 0.24 * s, 0.8 * s); ctx.stroke();
    }
    // root base + hairs
    ctx.fillStyle = '#cdb99a'; S.ell(ctx, 0, 0.84 * s, 0.26 * s, 0.07 * s); ctx.fill();
    ctx.strokeStyle = '#b39c78'; ctx.lineWidth = s * 0.025;
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 0.05 * s, 0.88 * s); ctx.quadraticCurveTo(i * 0.09 * s, 0.98 * s, i * 0.07 * s + Math.sin(i) * 0.04 * s, 1.04 * s); ctx.stroke(); }
    ctx.restore();
  };
  I.onion = function (ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    const b = (g) => { g.beginPath(); g.moveTo(0, -1.0 * s); g.bezierCurveTo(0.15 * s, -0.6 * s, 0.95 * s, -0.4 * s, 0.9 * s, 0.2 * s); g.bezierCurveTo(0.85 * s, 0.75 * s, 0.35 * s, 0.92 * s, 0, 0.92 * s); g.bezierCurveTo(-0.35 * s, 0.92 * s, -0.85 * s, 0.75 * s, -0.9 * s, 0.2 * s); g.bezierCurveTo(-0.95 * s, -0.4 * s, -0.15 * s, -0.6 * s, 0, -1.0 * s); g.closePath(); };
    S.solid(ctx, b, { color: '#b0527f', light: '#e38fb4', dark: '#6a2350', bounds: [-0.9 * s, -s, 1.8 * s, 1.9 * s], rim: '#f7b3d0', rimW: s * 0.05, gloss: 0.3 });
    ctx.strokeStyle = 'rgba(255,220,240,0.35)'; ctx.lineWidth = s * 0.03;
    for (const k of [-0.55, -0.2, 0.2, 0.55]) { ctx.beginPath(); ctx.moveTo(k * 0.25 * s, -0.8 * s); ctx.quadraticCurveTo(k * 1.4 * s, 0.1 * s, k * 0.6 * s, 0.88 * s); ctx.stroke(); }
    ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = s * 0.05; ctx.beginPath(); for (const k of [-1, 0, 1]) { ctx.moveTo(k * 0.1 * s, 0.9 * s); ctx.lineTo(k * 0.18 * s, 1.02 * s); } ctx.stroke();
    ctx.restore();
  };
  I.coffee = function (ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    // handle
    ctx.strokeStyle = '#d9cfe6'; ctx.lineWidth = s * 0.16; ctx.beginPath(); ctx.arc(0.72 * s, 0.05 * s, 0.3 * s, -1.3, 1.3); ctx.stroke();
    const cup = (g) => { g.beginPath(); g.moveTo(-0.8 * s, -0.55 * s); g.lineTo(0.8 * s, -0.55 * s); g.bezierCurveTo(0.8 * s, 0.4 * s, 0.55 * s, 0.85 * s, 0, 0.85 * s); g.bezierCurveTo(-0.55 * s, 0.85 * s, -0.8 * s, 0.4 * s, -0.8 * s, -0.55 * s); g.closePath(); };
    S.solid(ctx, cup, { color: '#f1ecf7', light: '#ffffff', dark: '#a79cc0', bounds: [-0.8 * s, -0.6 * s, 1.6 * s, 1.45 * s], rim: '#ffffff', rimW: s * 0.05, gx0: 0, gy0: 0.5, gx1: 1, gy1: 0.5 });
    ctx.fillStyle = '#5a3322'; ell(ctx, 0, -0.55 * s, 0.8 * s, 0.17 * s); ctx.fill();
    ctx.fillStyle = '#7b4a30'; ell(ctx, 0, -0.52 * s, 0.68 * s, 0.11 * s); ctx.fill();
    ctx.strokeStyle = '#e8e0f2'; ctx.lineWidth = s * 0.06; ell(ctx, 0, -0.55 * s, 0.8 * s, 0.17 * s); ctx.stroke();
    // saucer
    ctx.fillStyle = '#cfc4e0'; ell(ctx, 0, 0.9 * s, 1.1 * s, 0.16 * s); ctx.fill();
    ctx.restore();
  };
  I.fish = function (ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    const tail = (g) => { g.beginPath(); g.moveTo(-0.7 * s, 0); g.lineTo(-1.25 * s, -0.5 * s); g.quadraticCurveTo(-1.1 * s, 0, -1.25 * s, 0.5 * s); g.closePath(); };
    S.solid(ctx, tail, { color: '#4fa3d9', bounds: [-1.25 * s, -0.5 * s, 0.6 * s, s], shadow: false });
    const body = (g) => { g.beginPath(); g.moveTo(1.05 * s, 0.05 * s); g.bezierCurveTo(0.7 * s, -0.62 * s, -0.4 * s, -0.62 * s, -0.8 * s, 0); g.bezierCurveTo(-0.4 * s, 0.55 * s, 0.7 * s, 0.55 * s, 1.05 * s, 0.05 * s); g.closePath(); };
    S.solid(ctx, body, { color: '#6cc0ee', light: '#bfe8ff', dark: '#2f6f9e', bounds: [-0.8 * s, -0.5 * s, 1.85 * s, s], rim: '#d4f1ff', rimW: s * 0.05, gloss: 0.35 });
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-0.3 * s + i * 0.22 * s, 0.05 * s, 0.12 * s, -1.2, 1.2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(20,50,80,0.5)'; ctx.lineWidth = s * 0.035; ctx.beginPath(); ctx.arc(0.62 * s, 0.02 * s, 0.24 * s, -1.2, 1.2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0.78 * s, -0.12 * s, 0.09 * s, 0, TAU); ctx.fill(); ctx.fillStyle = '#10202c'; ctx.beginPath(); ctx.arc(0.8 * s, -0.12 * s, 0.05 * s, 0, TAU); ctx.fill();
    ctx.restore();
  };
  I.plate = function (ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    S.solid(ctx, (g) => ell(g, 0, 0, 1.25 * s, 0.42 * s), { color: '#e9e4f2', light: '#ffffff', dark: '#a49ab8', bounds: [-1.25 * s, -0.42 * s, 2.5 * s, 0.84 * s], rim: '#ffffff', rimW: s * 0.03, gy0: 0, gy1: 1, gx0: 0.5, gx1: 0.5 });
    ctx.fillStyle = 'rgba(160,150,190,0.35)'; ell(ctx, 0, 0.02 * s, 0.85 * s, 0.26 * s); ctx.fill();
    ctx.restore();
  };
  I.stomach = function (ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    const st = (g) => { g.beginPath(); g.moveTo(-0.25 * s, -1.0 * s); g.lineTo(0.05 * s, -1.0 * s); g.bezierCurveTo(0.08 * s, -0.7 * s, 0.1 * s, -0.55 * s, 0.35 * s, -0.55 * s); g.bezierCurveTo(0.95 * s, -0.55 * s, 1.0 * s, 0.35 * s, 0.6 * s, 0.7 * s); g.bezierCurveTo(0.25 * s, 1.0 * s, -0.35 * s, 0.95 * s, -0.65 * s, 0.75 * s); g.quadraticCurveTo(-0.85 * s, 0.62 * s, -0.95 * s, 0.75 * s); g.lineTo(-0.98 * s, 0.5 * s); g.quadraticCurveTo(-0.7 * s, 0.4 * s, -0.45 * s, 0.5 * s); g.bezierCurveTo(-0.05 * s, 0.6 * s, 0.1 * s, 0.0, -0.18 * s, -0.4 * s); g.quadraticCurveTo(-0.3 * s, -0.6 * s, -0.25 * s, -1.0 * s); g.closePath(); };
    S.solid(ctx, st, { color: o.color || '#f08da0', light: '#ffc3cd', dark: '#b24763', bounds: [-s, -s, 2 * s, 2 * s], rim: o.rim || '#ffd6de', rimW: s * 0.05, gloss: 0.3 });
    ctx.strokeStyle = 'rgba(178,71,99,0.45)'; ctx.lineWidth = s * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0.2 * s, -0.2 * s); ctx.quadraticCurveTo(0.6 * s, 0.05 * s, 0.4 * s, 0.45 * s); ctx.stroke();
    ctx.restore();
  };
  // lips + teeth mouth icon (front view)
  I.mouth = function (ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y);
    const open = o.open ?? 0.55;
    const outer = (g) => { g.beginPath(); g.moveTo(-1.0 * s, 0); g.bezierCurveTo(-0.7 * s, -0.55 * s, -0.25 * s, -0.62 * s, 0, -0.45 * s); g.bezierCurveTo(0.25 * s, -0.62 * s, 0.7 * s, -0.55 * s, 1.0 * s, 0); g.bezierCurveTo(0.7 * s, (0.5 + open * 0.3) * s, -0.7 * s, (0.5 + open * 0.3) * s, -1.0 * s, 0); g.closePath(); };
    S.solid(ctx, outer, { color: '#e85d75', light: '#ff9aab', dark: '#9c2a45', bounds: [-s, -0.6 * s, 2 * s, 1.3 * s], rim: '#ffc0cb', rimW: s * 0.04, gloss: 0.25 });
    const inner = (g) => { g.beginPath(); g.moveTo(-0.82 * s, 0.0); g.bezierCurveTo(-0.4 * s, -0.2 * s, 0.4 * s, -0.2 * s, 0.82 * s, 0); g.bezierCurveTo(0.5 * s, (0.2 + open * 0.45) * s, -0.5 * s, (0.2 + open * 0.45) * s, -0.82 * s, 0); g.closePath(); };
    inner(ctx); ctx.fillStyle = '#3c1020'; ctx.fill();
    ctx.save(); inner(ctx); ctx.clip();
    ctx.fillStyle = '#e0707f'; ell(ctx, 0, (0.25 + open * 0.3) * s, 0.5 * s, 0.22 * s); ctx.fill();
    ctx.fillStyle = '#fbf8f1'; ctx.fillRect(-0.9 * s, -0.3 * s, 1.8 * s, 0.4 * s);
    ctx.strokeStyle = 'rgba(150,130,140,0.6)'; ctx.lineWidth = s * 0.02; ctx.beginPath(); for (let i = -3; i <= 3; i++) { ctx.moveTo(i * 0.2 * s, -0.2 * s); ctx.lineTo(i * 0.2 * s, 0.1 * s); } ctx.stroke();
    ctx.restore();
    ctx.restore();
  };
  // tongue, top view: tip at the bottom, back at the top (the title's silhouette and the recap icon)
  S.tonguePath = function (g, s) {
    g.beginPath();
    g.moveTo(0, -1.0 * s);
    g.bezierCurveTo(0.5 * s, -1.01 * s, 0.8 * s, -0.86 * s, 0.8 * s, -0.4 * s);
    g.bezierCurveTo(0.8 * s, 0.1 * s, 0.7 * s, 0.55 * s, 0.5 * s, 0.85 * s);
    g.bezierCurveTo(0.36 * s, 1.06 * s, 0.18 * s, 1.1 * s, 0, 1.1 * s);
    g.bezierCurveTo(-0.18 * s, 1.1 * s, -0.36 * s, 1.06 * s, -0.5 * s, 0.85 * s);
    g.bezierCurveTo(-0.7 * s, 0.55 * s, -0.8 * s, 0.1 * s, -0.8 * s, -0.4 * s);
    g.bezierCurveTo(-0.8 * s, -0.86 * s, -0.5 * s, -1.01 * s, 0, -1.0 * s);
    g.closePath();
  };
  I.tongue = function (ctx, x, y, s, o = {}) {
    const P = A.P;
    ctx.save(); ctx.translate(x, y);
    S.solid(ctx, (g) => S.tonguePath(g, s), { color: o.color || P.tongue, light: P.tongueLight, dark: P.tongueDeep, bounds: [-0.8 * s, -s, 1.6 * s, 2.1 * s], rim: o.rim || '#ffc6d0', rimW: s * 0.03, gloss: 0.25, gy0: 0.8, gy1: 0.1, gx0: 0.3, gx1: 0.7, sBlur: o.sBlur ?? 40 });
    // coating on the back third
    if (o.coat) { ctx.save(); S.tonguePath(ctx, s); ctx.clip(); const g = ctx.createLinearGradient(0, -s, 0, 0.05 * s); g.addColorStop(0, S.rgba('#e9e0b0', 0.75 * o.coat)); g.addColorStop(0.7, S.rgba('#e9e0b0', 0.35 * o.coat)); g.addColorStop(1, 'rgba(233,224,176,0)'); ctx.fillStyle = g; ctx.fillRect(-s, -s, 2 * s, 1.1 * s); ctx.restore(); }
    // midline groove
    ctx.strokeStyle = S.rgba(P.tongueDeep, 0.6); ctx.lineWidth = s * 0.04; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -0.75 * s); ctx.quadraticCurveTo(0.02 * s, 0.1 * s, 0, 0.75 * s); ctx.stroke();
    if (o.papillae !== false) {
      const rnd = A.rand('tongue-pap'); ctx.fillStyle = S.rgba(S.light(P.tongue, 0.35), 0.5);
      for (let i = 0; i < (o.nPap || 120); i++) { const px = (rnd() * 2 - 1) * 0.7 * s, py = (rnd() * 2 - 1) * 0.95 * s; if ((px * px) / (0.6 * s) ** 2 + ((py + 0.05 * s) ** 2) / (0.95 * s) ** 2 > 1) continue; ctx.beginPath(); ctx.arc(px, py, s * (0.012 + rnd() * 0.012), 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  };
  // rich tongue for pre-rendering into an offscreen canvas (top view, tip down): volume shading, rim light, midline groove,
  // the V of big papillae at the back, fine papillae texture, optional coating on the back third, back edge fading into the throat
  S.tongueArt = function (g, cx, cy, s, o = {}) {
    const P = A.P, rnd = A.rand(o.seed || 'tongue-art');
    g.save(); g.translate(cx, cy);
    // glow + shadow
    S.glow(g, 0, 0.1 * s, 1.35 * s, '#ff6f9a', o.glow ?? 0.45);
    g.save(); g.shadowColor = 'rgba(8,2,16,0.6)'; g.shadowBlur = s * 0.2; g.shadowOffsetY = s * 0.06; S.tonguePath(g, s); g.fillStyle = P.tongueDeep; g.fill(); g.restore();
    g.save(); S.tonguePath(g, s); g.clip();
    const bg = g.createRadialGradient(-0.1 * s, 0.1 * s, 0.05 * s, 0, 0.05 * s, 1.1 * s);
    bg.addColorStop(0, '#f7a2b2'); bg.addColorStop(0.45, P.tongue); bg.addColorStop(0.85, '#c65672'); bg.addColorStop(1, '#8e2f4e');
    g.fillStyle = bg; g.fillRect(-s, -1.1 * s, 2 * s, 2.3 * s);
    // lengthwise volume: two soft lobes either side of the groove
    for (const k of [-1, 1]) { const lg = g.createRadialGradient(k * 0.34 * s, 0.05 * s, 0, k * 0.34 * s, 0.05 * s, 0.55 * s); lg.addColorStop(0, 'rgba(255,200,212,0.28)'); lg.addColorStop(1, 'rgba(255,200,212,0)'); g.fillStyle = lg; g.fillRect(-s, -s, 2 * s, 2.2 * s); }
    // fine papillae texture
    for (let i = 0; i < (o.nPap ?? 2600); i++) {
      const x = (rnd() * 2 - 1) * 0.82 * s, y = (rnd() * 2.1 - 1.02) * s, r = s * (0.0035 + rnd() * 0.0045);
      g.fillStyle = rnd() < 0.75 ? `rgba(255,214,224,${0.18 + rnd() * 0.22})` : `rgba(120,30,60,${0.15 + rnd() * 0.15})`;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    // the fungiform dots near the tip and sides (slightly redder)
    for (let i = 0; i < 90; i++) { const a = rnd() * TAU, rr0 = Math.sqrt(rnd()); const x = Math.cos(a) * rr0 * 0.6 * s, y = 0.35 * s + Math.sin(a) * rr0 * 0.6 * s; g.fillStyle = 'rgba(232,80,110,0.45)'; g.beginPath(); g.arc(x, y, s * (0.006 + rnd() * 0.006), 0, TAU); g.fill(); }
    // V of circumvallate papillae
    for (let i = -3; i <= 3; i++) {
      const x = i * 0.11 * s, y = -0.64 * s + Math.abs(i) * 0.06 * s, r = 0.019 * s;
      g.fillStyle = 'rgba(120,30,60,0.25)'; g.beginPath(); g.arc(x, y, r * 1.35, 0, TAU); g.fill();
      const pg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); pg.addColorStop(0, 'rgba(255,194,207,0.8)'); pg.addColorStop(1, 'rgba(217,96,126,0.8)'); g.fillStyle = pg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    // coating on the back third
    if (o.coat) {
      const cg = g.createLinearGradient(0, -s, 0, -0.05 * s); cg.addColorStop(0, S.rgba('#dcd98e', 0.7 * o.coat)); cg.addColorStop(0.6, S.rgba('#e2dc9a', 0.34 * o.coat)); cg.addColorStop(1, 'rgba(232,223,168,0)');
      g.fillStyle = cg; g.fillRect(-s, -s, 2 * s, s);
      for (let i = 0; i < 1600 * o.coat; i++) {
        const x = (rnd() * 2 - 1) * 0.8 * s, y = -s + Math.pow(rnd(), 1.6) * 0.95 * s, back = 1 - (y + s) / (0.95 * s);
        g.fillStyle = S.rgba(rnd() < 0.5 ? '#f2ecc8' : '#d9d08a', (0.12 + rnd() * 0.25) * back * o.coat); g.beginPath(); g.arc(x, y, s * (0.004 + rnd() * 0.01), 0, TAU); g.fill();
      }
    }
    // midline groove
    g.strokeStyle = 'rgba(120,28,60,0.55)'; g.lineWidth = 0.028 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -0.58 * s); g.bezierCurveTo(0.02 * s, -0.1 * s, -0.01 * s, 0.4 * s, 0, 0.78 * s); g.stroke();
    g.strokeStyle = 'rgba(255,200,215,0.3)'; g.lineWidth = 0.012 * s; g.beginPath(); g.moveTo(0.025 * s, -0.5 * s); g.bezierCurveTo(0.045 * s, -0.1 * s, 0.015 * s, 0.4 * s, 0.025 * s, 0.74 * s); g.stroke();
    // edge darkening + rim light on the right
    g.save(); g.shadowColor = 'rgba(80,10,40,0.75)'; g.shadowBlur = 0.12 * s; g.lineWidth = 0.03 * s; g.strokeStyle = 'rgba(80,10,40,0.6)'; S.tonguePath(g, s); g.stroke(); g.restore();
    g.save(); g.beginPath(); g.rect(0.3 * s, -1.2 * s, s, 2.5 * s); g.clip(); g.translate(-0.014 * s, 0.006 * s); g.lineWidth = 0.028 * s; g.strokeStyle = 'rgba(255,214,226,0.55)'; S.tonguePath(g, s); g.stroke(); g.restore();
    g.restore();
    // the back edge fades into the throat
    if (o.fadeBack !== false) {
      g.save(); g.globalCompositeOperation = 'destination-out';
      g.translate(0, -1.22 * s); g.scale(1.9, 1);
      const fg = g.createRadialGradient(0, 0, 0, 0, 0, 0.62 * s); fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(0.45, 'rgba(0,0,0,0.92)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fg; g.fillRect(-0.7 * s, -0.7 * s, 1.4 * s, 1.4 * s); g.restore();
    }
    g.restore();
  };
  I.nose = function (ctx, x, y, s, o = {}) {   // side-view nose icon, facing right
    ctx.save(); ctx.translate(x, y); if (o.flip) ctx.scale(-1, 1);
    const skin = o.skin || S.SKIN[1];
    const p = (g) => { g.beginPath(); g.moveTo(-0.5 * s, -1.0 * s); g.bezierCurveTo(-0.1 * s, -0.7 * s, 0.5 * s, 0.05 * s, 0.72 * s, 0.45 * s); g.bezierCurveTo(0.85 * s, 0.7 * s, 0.6 * s, 0.85 * s, 0.35 * s, 0.8 * s); g.quadraticCurveTo(0.2 * s, 0.95 * s, -0.05 * s, 0.9 * s); g.quadraticCurveTo(-0.45 * s, 0.85 * s, -0.5 * s, 0.5 * s); g.closePath(); };
    S.solid(ctx, p, { color: skin, bounds: [-0.5 * s, -s, 1.35 * s, 1.95 * s], rim: S.mix(skin, '#ffe0c8', 0.7), rimW: s * 0.05, gx0: 0.8, gx1: 0.2 });
    ctx.fillStyle = S.rgba(S.dark(skin, 0.6), 0.7); ell(ctx, 0.3 * s, 0.72 * s, 0.14 * s, 0.07 * s, 0.2); ctx.fill();
    ctx.strokeStyle = S.rgba(S.dark(skin, 0.45), 0.6); ctx.lineWidth = s * 0.04; ctx.beginPath(); ctx.arc(0.08 * s, 0.6 * s, 0.26 * s, -0.4, 2.2); ctx.stroke();
    ctx.restore();
  };
  I.stopwatch = function (ctx, x, y, s, frac = 0, o = {}) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#c9c3d6'; rr(ctx, -0.14 * s, -1.22 * s, 0.28 * s, 0.26 * s, 0.05 * s); ctx.fill();
    ctx.fillStyle = '#a79fbd'; rr(ctx, -0.22 * s, -1.32 * s, 0.44 * s, 0.14 * s, 0.05 * s); ctx.fill();
    S.solid(ctx, (g) => { g.beginPath(); g.arc(0, 0, s, 0, TAU); }, { color: '#e9e4f2', light: '#ffffff', dark: '#8f86ad', bounds: [-s, -s, 2 * s, 2 * s], rim: '#ffffff', rimW: s * 0.05, gloss: 0.3 });
    ctx.fillStyle = '#1b1830'; ctx.beginPath(); ctx.arc(0, 0, 0.84 * s, 0, TAU); ctx.fill();
    if (frac > 0) { ctx.fillStyle = S.rgba(o.color || A.P.lime, 0.9); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 0.84 * s, -Math.PI / 2, -Math.PI / 2 + TAU * S.clamp(frac)); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = s * 0.03; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.7 * s, Math.sin(a) * 0.7 * s); ctx.lineTo(Math.cos(a) * 0.8 * s, Math.sin(a) * 0.8 * s); ctx.stroke(); }
    const a = -Math.PI / 2 + TAU * frac; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 0.68 * s, Math.sin(a) * 0.68 * s); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 0.08 * s, 0, TAU); ctx.fill();
    ctx.restore();
  };
  I.mint = function (ctx, x, y, s, o = {}) {      // a round striped mint candy
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    // wrapper twists
    ctx.fillStyle = 'rgba(210,240,255,0.55)';
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * 0.85 * s, 0); ctx.lineTo(k * 1.45 * s, -0.42 * s); ctx.quadraticCurveTo(k * 1.3 * s, 0, k * 1.45 * s, 0.42 * s); ctx.closePath(); ctx.fill(); }
    S.solid(ctx, (g) => { g.beginPath(); g.arc(0, 0, 0.9 * s, 0, TAU); }, { color: '#f7f7fb', light: '#ffffff', dark: '#b9bdd6', bounds: [-0.9 * s, -0.9 * s, 1.8 * s, 1.8 * s], rim: '#ffffff', rimW: s * 0.04, gloss: 0.4 });
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 0.9 * s, 0, TAU); ctx.clip();
    ctx.fillStyle = '#3fcf8e'; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 0.9 * s, a, a + 0.32); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, -0.3 * s, -0.35 * s, 0.35 * s, 0.2 * s, -0.6); ctx.fill();
    ctx.restore(); ctx.restore();
  };
  I.mouthwash = function (ctx, x, y, s, o = {}) {  // generic unbranded bottle
    ctx.save(); ctx.translate(x, y);
    S.solid(ctx, (g) => { rr(g, -0.32 * s, -1.25 * s, 0.64 * s, 0.34 * s, 0.08 * s); }, { color: '#e9e4f2', bounds: [-0.32 * s, -1.25 * s, 0.64 * s, 0.34 * s], shadow: false });
    const b = (g) => { g.beginPath(); g.moveTo(-0.26 * s, -0.95 * s); g.lineTo(0.26 * s, -0.95 * s); g.bezierCurveTo(0.3 * s, -0.7 * s, 0.62 * s, -0.62 * s, 0.62 * s, -0.35 * s); g.lineTo(0.62 * s, 0.95 * s); g.quadraticCurveTo(0.62 * s, 1.1 * s, 0.45 * s, 1.1 * s); g.lineTo(-0.45 * s, 1.1 * s); g.quadraticCurveTo(-0.62 * s, 1.1 * s, -0.62 * s, 0.95 * s); g.lineTo(-0.62 * s, -0.35 * s); g.bezierCurveTo(-0.62 * s, -0.62 * s, -0.3 * s, -0.7 * s, -0.26 * s, -0.95 * s); g.closePath(); };
    S.solid(ctx, b, { color: o.color || '#35c6b0', light: '#9ff5e6', dark: '#127a6d', bounds: [-0.62 * s, -0.95 * s, 1.24 * s, 2.05 * s], rim: '#c8fff4', rimW: s * 0.05, gloss: 0.35, gx0: 0, gy0: 0.5, gx1: 1, gy1: 0.5 });
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; rr(ctx, -0.46 * s, -0.05 * s, 0.92 * s, 0.62 * s, 0.06 * s); ctx.fill();
    ctx.fillStyle = S.rgba(o.color || '#35c6b0', 0.8); rr(ctx, -0.34 * s, 0.1 * s, 0.68 * s, 0.1 * s, 0.03 * s); ctx.fill(); rr(ctx, -0.34 * s, 0.28 * s, 0.45 * s, 0.07 * s, 0.03 * s); ctx.fill();
    ctx.restore();
  };
  I.toothbrush = function (ctx, x, y, s, o = {}) {  // horizontal, head on the right
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.35);
    S.solid(ctx, (g) => { rr(g, -1.3 * s, -0.13 * s, 2.25 * s, 0.26 * s, 0.13 * s); }, { color: o.color || '#7c5cff', light: '#b9a6ff', dark: '#3f2aa8', bounds: [-1.3 * s, -0.13 * s, 2.25 * s, 0.26 * s], rim: '#d9ccff', rimW: s * 0.03, gloss: 0.3, gx0: 0.5, gy0: 0, gx1: 0.5, gy1: 1 });
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(ctx, -1.0 * s, -0.08 * s, 0.9 * s, 0.05 * s, 0.03 * s); ctx.fill();
    // bristles
    const bx = 0.5 * s; ctx.fillStyle = '#e8f7ff'; rr(ctx, bx, -0.52 * s, 0.62 * s, 0.4 * s, 0.05 * s); ctx.fill();
    ctx.fillStyle = '#8fd8ff'; for (let i = 0; i < 5; i++) { rr(ctx, bx + 0.04 * s + i * 0.12 * s, -0.52 * s, 0.07 * s, 0.4 * s, 0.03 * s); ctx.fill(); }
    ctx.restore();
  };
  I.comment = function (ctx, x, y, s, t = 0, o = {}) {  // comment bubble with typing dots
    ctx.save(); ctx.translate(x, y);
    const b = (g) => { rr(g, -1.1 * s, -0.75 * s, 2.2 * s, 1.4 * s, 0.4 * s); g.moveTo(-0.6 * s, 0.6 * s); g.lineTo(-0.85 * s, 1.05 * s); g.lineTo(-0.2 * s, 0.6 * s); g.closePath(); };
    S.solid(ctx, b, { color: o.color || '#f4f1ea', light: '#ffffff', dark: '#b7b0cc', bounds: [-1.1 * s, -0.75 * s, 2.2 * s, 1.8 * s], rim: '#ffffff', rimW: s * 0.04 });
    for (let i = 0; i < 3; i++) { const k = 0.5 + 0.5 * Math.sin(t * 7 - i * 0.9); ctx.fillStyle = S.mix('#9a92b5', '#3b3456', k); ctx.beginPath(); ctx.arc((i - 1) * 0.55 * s, -0.05 * s - k * 0.08 * s, 0.17 * s, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  S.icons = I;
  window.STORY = S;
})();
