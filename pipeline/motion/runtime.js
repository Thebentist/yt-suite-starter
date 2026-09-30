/* Motion runtime (browser side) for claude-yt-suite scenes.
 * Loaded by pipeline/motion/render.html before the scene file. A scene is one plain script that calls
 *
 *   defineScene({
 *     name: 'wrist-counter', duration: 12, fps: 30, transparent: false,
 *     assets: { tongue: { image: 'videos/x/sources/tongue.jpg' }, tiktok: { video: 'videos/x/sources/tt.mp4', start: 0 } },
 *     params: { from: 10 },                       // defaults; the renderer merges --params over them
 *     setup(api) { ... },                         // optional, once, may be async (precompute geometry)
 *     draw(ctx, t, api) { ... },                  // pure function of t (seconds); design space is 1920 x 1080
 *   });
 *
 * The renderer scales the canvas (2 = 3840x2160) so scenes always draw in 1920x1080 design units. Everything is
 * deterministic: seeded random, value noise, no Date/Math.random. docs/motion-style.md is the visual language.
 */
(function () {
  const W = 1920, H = 1080;

  // ---------------------------------------------------------------- palette & type ------------------------------
  // "Huge If True" language on Ben's colors: near-black indigo stage, warm white type, lime highlight chips,
  // his set's lavender and pink as accents, anatomy pinks, bacteria/gas greens, sulfur yellow.
  const P = {
    bg: '#0b0a18', bg2: '#15122b', grid: 'rgba(160,150,255,0.07)',
    ink: '#f4f1ea', dim: 'rgba(244,241,234,0.62)', faint: 'rgba(244,241,234,0.28)', black: '#0a0a0f',
    lime: '#d7f34a', lavender: '#a78bfa', purple: '#7c5cff', pink: '#ff6fae', blue: '#5cc8ff', cyan: '#62f0e0',
    red: '#ff4d5a', orange: '#ff9f43', yellow: '#ffd43b', sulfur: '#e9e24a', gas: '#b9e35a', green: '#46d58a',
    tongue: '#e8798e', tongueDeep: '#b24763', tongueLight: '#f7a9b6', gum: '#f08da0', gumRed: '#e0485d',
    enamel: '#f7f3ea', coat: '#efe7c4', saliva: '#8fd8ff', paper: '#f3eee2', paperInk: '#1b1a22', marker: '#ff3b3b',
  };
  const FONTS = {
    head: 'Bahnschrift, "Segoe UI", Arial, sans-serif',   // condensed bold via fontStretch
    body: '"Segoe UI", Arial, sans-serif',
    black: '"Segoe UI Black", "Arial Black", sans-serif',
    hand: '"Ink Free", "Segoe Print", "Comic Sans MS", cursive',
    serif: 'Georgia, Cambria, serif',
    mono: 'Consolas, monospace',
  };

  // ---------------------------------------------------------------- math & randomness ---------------------------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function makeNoise(seed) {
    const rnd = mulberry32(seed), N = 256, perm = new Uint8Array(N * 2), grad = new Float32Array(N);
    for (let i = 0; i < N; i++) { perm[i] = i; grad[i] = rnd() * 2 - 1; }
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const k = perm[i]; perm[i] = perm[j]; perm[j] = k; }
    for (let i = 0; i < N; i++) perm[i + N] = perm[i];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const g = (x, y) => grad[perm[(perm[x & 255] + y) & 255]];
    return (x, y = 0) => {
      const X = Math.floor(x), Y = Math.floor(y), fx = x - X, fy = y - Y, u = fade(fx), v = fade(fy);
      const a = g(X, Y), b = g(X + 1, Y), c = g(X, Y + 1), d = g(X + 1, Y + 1);
      const top = a + (b - a) * u, bot = c + (d - c) * u; return top + (bot - top) * v;
    };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const map = (v, a, b, c, d, cl = true) => { const t = (v - a) / (b - a); return lerp(c, d, cl ? clamp(t) : t); };
  const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const ease = {
    linear: (t) => t,
    inQuad: (t) => t * t, outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: (t) => t * t * t, outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: (t) => 1 - Math.pow(1 - t, 4), inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)), inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2, outSine: (t) => Math.sin((t * Math.PI) / 2),
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  };
  // progress of an animation that starts at `start` and lasts `dur` seconds, eased (default outCubic), clamped 0..1
  const prog = (t, start, dur, fn = ease.outCubic) => fn(clamp((t - start) / Math.max(1e-6, dur)));
  // in/out envelope: 0 -> 1 over `inDur` from `start`, back to 0 over `outDur` ending at `end`
  const env = (t, start, end, inDur = 0.4, outDur = 0.4, fin = ease.outCubic, fout = ease.inCubic) =>
    Math.min(fin(clamp((t - start) / inDur)), 1 - fout(clamp((t - (end - outDur)) / outDur)));
  // spring-ish settle for pops: overshoots then settles to 1
  const pop = (t, start, dur = 0.5) => { const k = clamp((t - start) / dur); return k <= 0 ? 0 : ease.outBack(k, 2.2); };

  // ---------------------------------------------------------------- text ------------------------------------------
  function font(ctx, o = {}) {
    const size = o.size || 48, weight = o.weight || 700, fam = o.family ? (FONTS[o.family] || o.family) : FONTS.head;
    ctx.font = `${o.italic ? 'italic ' : ''}${weight} ${size}px ${fam}`;
    try { ctx.fontStretch = o.stretch || (fam === FONTS.head ? 'condensed' : 'normal'); } catch (e) {}
    try { ctx.letterSpacing = (o.tracking != null ? o.tracking : 0) + 'px'; } catch (e) {}
  }
  function text(ctx, str, x, y, o = {}) {
    ctx.save();
    font(ctx, o);
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.baseline || 'alphabetic';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    str = o.upper ? String(str).toUpperCase() : String(str);
    if (o.shadow) { ctx.shadowColor = o.shadow === true ? 'rgba(0,0,0,0.45)' : o.shadow; ctx.shadowBlur = o.shadowBlur ?? 18; ctx.shadowOffsetY = o.shadowY ?? 6; }
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur ?? 24; }
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeWidth || 8; ctx.strokeText(str, x, y, o.maxWidth); }
    ctx.fillStyle = o.color || P.ink; ctx.fillText(str, x, y, o.maxWidth);
    ctx.restore();
  }
  function measure(ctx, str, o = {}) { ctx.save(); font(ctx, o); const m = ctx.measureText(o.upper ? String(str).toUpperCase() : String(str)); ctx.restore(); return m.width; }
  function wrap(ctx, str, maxWidth, o = {}) {
    ctx.save(); font(ctx, o);
    const words = String(o.upper ? String(str).toUpperCase() : str).split(/\s+/), lines = []; let line = '';
    for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test; }
    if (line) lines.push(line); ctx.restore(); return lines;
  }
  // typewriter / word reveal: returns the visible prefix of `str` at progress p (0..1), by characters
  const typed = (str, p) => String(str).slice(0, Math.round(clamp(p) * String(str).length));

  // ---------------------------------------------------------------- shapes ----------------------------------------
  function roundRect(ctx, x, y, w, h, r = 12) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2); ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // Cleo-style highlight chip: lime box, black condensed caps. p = pop progress (0..1+), anchor by align.
  function label(ctx, str, x, y, o = {}) {
    const size = o.size || 44, padX = o.padX ?? size * 0.42, padY = o.padY ?? size * 0.22;
    const s = String(o.upper === false ? str : String(str).toUpperCase());
    const tw = measure(ctx, s, { size, weight: o.weight || 700, family: o.family, tracking: o.tracking ?? 1 });
    const bw = tw + padX * 2, bh = size * 1.05 + padY * 2;
    const p = o.p == null ? 1 : o.p; if (p <= 0) return { w: bw, h: bh };
    const ax = o.align === 'center' ? -bw / 2 : o.align === 'right' ? -bw : 0;
    ctx.save(); ctx.translate(x, y);
    if (o.rotate) ctx.rotate(o.rotate);
    const sc = o.noScale ? 1 : Math.max(0, p); ctx.scale(sc, sc);
    ctx.globalAlpha *= clamp(p * 1.6);
    if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; }
    ctx.fillStyle = o.bg || P.lime; roundRect(ctx, ax, -bh / 2, bw, bh, o.radius ?? 6); ctx.fill();
    ctx.shadowColor = 'transparent';
    text(ctx, s, ax + padX, size * 0.36, { size, weight: o.weight || 700, family: o.family, color: o.color || P.black, tracking: o.tracking ?? 1 });
    ctx.restore(); return { w: bw, h: bh };
  }
  // a thin leader line from a point to a label, drawn on with progress p
  function leader(ctx, x1, y1, x2, y2, p = 1, o = {}) {
    ctx.save(); ctx.strokeStyle = o.color || P.ink; ctx.lineWidth = o.width || 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, clamp(p)), lerp(y1, y2, clamp(p))); ctx.stroke();
    ctx.fillStyle = o.color || P.ink; ctx.beginPath(); ctx.arc(x1, y1, (o.dot || 7) * clamp(p * 3), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- doodles (hand-drawn, drawn on) ----------------
  // Every doodle is a polyline with low-frequency wobble, drawn in 2 slightly different passes like a marker, and
  // revealed along its length with progress p (0..1). o: {color, width, seed, wobble, passes, alpha, cap}
  function polyLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function wobbly(pts, seed, amt) {
    const nz = makeNoise(seed), out = []; let s = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      out.push([pts[i][0] + nz(s / 90, 1.3) * amt, pts[i][1] + nz(s / 90, 7.7) * amt]);
    }
    return out;
  }
  function resample(pts, step = 6) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / step));
      for (let k = 1; k <= n; k++) out.push([lerp(x0, x1, k / n), lerp(y0, y1, k / n)]);
    }
    return out;
  }
  function strokePartial(ctx, pts, p) {
    if (p <= 0 || pts.length < 2) return;
    const L = polyLength(pts) * clamp(p); let acc = 0;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + seg >= L) { const k = (L - acc) / seg; ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); break; }
      ctx.lineTo(pts[i][0], pts[i][1]); acc += seg;
    }
    ctx.stroke();
  }
  function doodleStroke(ctx, pts, p = 1, o = {}) {
    const seed = o.seed ?? 7, width = o.width ?? 9, color = o.color || P.marker, passes = o.passes ?? 2, wob = o.wobble ?? 3.5;
    const base = resample(pts, 5);
    ctx.save(); ctx.lineCap = o.cap || 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 16; }
    for (let k = 0; k < passes; k++) {
      ctx.lineWidth = width * (k ? 0.72 : 1);
      ctx.globalAlpha *= k ? 0.85 : 1;
      strokePartial(ctx, wobbly(base, seed * 31 + k * 101, wob * (k ? 1.4 : 1)), p);
    }
    ctx.restore();
  }
  const doodle = {
    stroke: doodleStroke,
    // hand-drawn ellipse that overshoots its start, like circling something with a marker
    circle(ctx, cx, cy, rx, ry, p = 1, o = {}) {
      const turns = o.turns ?? 1.12, n = 90, a0 = o.start ?? -2.2, pts = [];
      const rnd = mulberry32(o.seed ?? 3);
      const k1 = 0.94 + rnd() * 0.06, k2 = 1.04 + rnd() * 0.05;
      for (let i = 0; i <= n; i++) {
        const u = i / n, a = a0 + u * Math.PI * 2 * turns, grow = lerp(k1, k2, u);
        pts.push([cx + Math.cos(a) * rx * grow, cy + Math.sin(a) * ry * grow]);
      }
      doodleStroke(ctx, pts, p, { ...o, seed: o.seed ?? 3 });
    },
    // arrow from (x1,y1) to (x2,y2) with a curve bend (px, + = left of travel) and a two-stroke head
    arrow(ctx, x1, y1, x2, y2, p = 1, o = {}) {
      const bend = o.bend ?? 60, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      const cx = mx - (dy / L) * bend, cy = my + (dx / L) * bend, pts = [];
      for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * cx + u * u * x2, (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * cy + u * u * y2]); }
      const shaft = clamp(p / 0.75), head = clamp((p - 0.72) / 0.28);
      doodleStroke(ctx, pts, shaft, o);
      if (head > 0) {
        const ang = Math.atan2(y2 - cy, x2 - cx), hl = o.head ?? 34;
        doodleStroke(ctx, [[x2 - Math.cos(ang - 0.5) * hl, y2 - Math.sin(ang - 0.5) * hl], [x2, y2]], clamp(head * 2), { ...o, seed: (o.seed ?? 7) + 5 });
        doodleStroke(ctx, [[x2, y2], [x2 - Math.cos(ang + 0.5) * hl, y2 - Math.sin(ang + 0.5) * hl]], clamp(head * 2 - 1), { ...o, seed: (o.seed ?? 7) + 9 });
      }
    },
    underline(ctx, x1, x2, y, p = 1, o = {}) { doodleStroke(ctx, [[x1, y + 3], [(x1 + x2) / 2, y - 2], [x2, y + 4]], p, o); },
    cross(ctx, cx, cy, r, p = 1, o = {}) {
      doodleStroke(ctx, [[cx - r, cy - r], [cx + r, cy + r]], clamp(p * 2), o);
      doodleStroke(ctx, [[cx + r, cy - r], [cx - r, cy + r]], clamp(p * 2 - 1), { ...o, seed: (o.seed ?? 7) + 13 });
    },
    check(ctx, cx, cy, r, p = 1, o = {}) { doodleStroke(ctx, [[cx - r, cy], [cx - r * 0.3, cy + r * 0.7], [cx + r, cy - r * 0.8]], p, o); },
    box(ctx, x, y, w, h, p = 1, o = {}) { doodleStroke(ctx, [[x, y], [x + w, y + 2], [x + w - 2, y + h], [x + 2, y + h - 2], [x + 4, y - 6]], p, o); },
    // zig-zag scribble filling a box (crossing something out, shading)
    scribble(ctx, x, y, w, h, p = 1, o = {}) {
      const n = o.lines ?? 7, pts = [];
      for (let i = 0; i <= n; i++) { const yy = y + (h * i) / n; pts.push(i % 2 ? [x + w, yy] : [x, yy]); }
      doodleStroke(ctx, pts, p, o);
    },
    // hand-lettered text revealed left to right (clip) with a slight baseline wobble
    text(ctx, str, x, y, p = 1, o = {}) {
      const size = o.size || 56; ctx.save();
      font(ctx, { size, weight: o.weight || 700, family: 'hand' });
      const w = ctx.measureText(str).width, ax = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0;
      ctx.beginPath(); ctx.rect(x + ax - 10, y - size * 1.2, (w + 20) * clamp(p), size * 1.8); ctx.clip();
      if (o.rotate) { ctx.translate(x, y); ctx.rotate(o.rotate); ctx.translate(-x, -y); }
      if (o.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeWidth || 10; ctx.strokeText(str, x + ax, y); }
      ctx.fillStyle = o.color || P.marker; ctx.fillText(str, x + ax, y);
      ctx.restore();
    },
    // translucent highlighter swipe behind a region (multiply-ish on light, screen on dark)
    highlight(ctx, x, y, w, h, p = 1, o = {}) {
      ctx.save(); ctx.globalAlpha *= o.alpha ?? 0.55; ctx.fillStyle = o.color || P.lime;
      if (o.blend) ctx.globalCompositeOperation = o.blend;
      const ww = w * clamp(p); ctx.beginPath();
      ctx.moveTo(x, y + 3); ctx.lineTo(x + ww, y); ctx.lineTo(x + ww + 4, y + h); ctx.lineTo(x - 2, y + h + 2); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
  };

  // ---------------------------------------------------------------- backgrounds & finishing ---------------------
  function stage(ctx, o = {}) {           // the dark "Huge If True" stage: radial glow + faint grid
    const g = ctx.createRadialGradient(W * (o.cx ?? 0.5), H * (o.cy ?? 0.45), 60, W * 0.5, H * 0.5, W * 0.75);
    g.addColorStop(0, o.c1 || P.bg2); g.addColorStop(1, o.c2 || P.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (o.grid !== false) {
      const step = o.step || 60, off = o.gridOffset || [0, 0];
      ctx.save(); ctx.strokeStyle = o.gridColor || P.grid; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = ((off[0] % step) + step) % step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = ((off[1] % step) + step) % step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke(); ctx.restore();
    }
  }
  function paper(ctx, o = {}) {           // warm paper with fibres, for study cards and doodle boards
    ctx.fillStyle = o.color || P.paper; ctx.fillRect(0, 0, W, H);
    const rnd = mulberry32(o.seed ?? 11); ctx.save();
    for (let i = 0; i < 1400; i++) {
      ctx.globalAlpha = 0.03 + rnd() * 0.05; ctx.strokeStyle = rnd() < 0.5 ? '#8a7f66' : '#ffffff'; ctx.lineWidth = 1;
      const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI, l = 4 + rnd() * 16;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
    ctx.restore();
  }
  let grainTiles = null;
  function grain(ctx, t, amount = 0.06) {  // animated film grain (8 cached tiles, cycles every frame)
    if (!grainTiles) {
      grainTiles = [];
      for (let k = 0; k < 8; k++) {
        const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
        const img = g.createImageData(256, 256), rnd = mulberry32(900 + k);
        for (let i = 0; i < img.data.length; i += 4) { const v = rnd() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        g.putImageData(img, 0, 0); grainTiles.push(c);
      }
    }
    const tile = grainTiles[Math.floor(t * 30) % 8];
    ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // Cinematic finish for opaque scenes, applied last in draw(): bloom (bright areas glow: a downscaled, contrast-lifted,
  // blurred copy screened back on), vignette, grain. Same settings everywhere so all graphics share one look.
  let bloomCv = null;
  function finish(ctx, t, o = {}) {
    const cv = ctx.canvas, bw = Math.round(cv.width / 4), bh = Math.round(cv.height / 4);
    if (!bloomCv || bloomCv.width !== bw) { bloomCv = document.createElement('canvas'); bloomCv.width = bw; bloomCv.height = bh; }
    const b = bloomCv.getContext('2d'), amt = o.bloom ?? 0.32;
    if (amt > 0) {
      b.clearRect(0, 0, bw, bh);
      b.filter = `brightness(${o.bloomBright ?? 0.75}) contrast(${o.bloomContrast ?? 2.4}) blur(${Math.round(bw / (o.bloomRadius ?? 90))}px)`;
      b.drawImage(cv, 0, 0, bw, bh); b.filter = 'none';
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = amt;
      ctx.drawImage(bloomCv, 0, 0, cv.width, cv.height); ctx.restore();
    }
    ctx.save(); const s = ctx.getTransform(); void s;
    if ((o.vignette ?? 0.45) > 0) vignette(ctx, o.vignette ?? 0.45);
    if ((o.grain ?? 0.055) > 0) grain(ctx, t, o.grain ?? 0.055);
    ctx.restore();
  }
  function vignette(ctx, amount = 0.55) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${amount})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // slow push-in / drift so nothing is ever static (Cleo's graphics always move): wrap draw calls in cam()
  function cam(ctx, t, o = {}) {
    const z = (o.zoom0 ?? 1) + ((o.zoom1 ?? 1.06) - (o.zoom0 ?? 1)) * ease.inOutSine(clamp(t / (o.dur || 6)));
    const cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
    ctx.translate(cx, cy); ctx.scale(z, z); if (o.rot) ctx.rotate(o.rot * clamp(t / (o.dur || 6))); ctx.translate(-cx + (o.dx || 0) * clamp(t / (o.dur || 6)), -cy + (o.dy || 0) * clamp(t / (o.dur || 6)));
  }

  // ---------------------------------------------------------------- little characters & icons -------------------
  const icons = {
    // simple person (head + shoulders), filled; used in icon arrays and the two-shot
    person(ctx, x, y, s, color = P.ink) {
      ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y - s * 0.55, s * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - s * 0.45, y + s * 0.5); ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.18, x, y - s * 0.18);
      ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.18, x + s * 0.45, y + s * 0.5); ctx.closePath(); ctx.fill(); ctx.restore();
    },
    // a wobbling rod/blob bacterium with a face-free body and a few flagella; phase animates the wiggle
    bacterium(ctx, x, y, s, phase = 0, o = {}) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
      const col = o.color || P.green, len = s * (o.rod ? 1.6 : 1.0), wid = s * 0.62;
      ctx.strokeStyle = o.flagella || 'rgba(190,255,200,0.55)'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath(); const y0 = (k - 1) * wid * 0.25; ctx.moveTo(-len / 2, y0);
        for (let i = 1; i <= 12; i++) ctx.lineTo(-len / 2 - i * s * 0.07, y0 + Math.sin(phase * 7 + i * 0.9 + k) * s * 0.06);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(-len * 0.15, -wid * 0.2, s * 0.05, 0, 0, len * 0.7);
      g.addColorStop(0, o.light || '#b8ffcf'); g.addColorStop(0.55, col); g.addColorStop(1, o.dark || '#1f7a4b');
      ctx.fillStyle = g; roundRect(ctx, -len / 2, -wid / 2, len, wid, wid / 2); ctx.fill();
      ctx.globalAlpha *= 0.35; ctx.fillStyle = '#ffffff'; roundRect(ctx, -len * 0.3, -wid * 0.36, len * 0.35, wid * 0.16, wid * 0.08); ctx.fill();
      ctx.restore();
    },
    // H2S molecule: big sulfur ball with two small hydrogens, ball-and-stick with glossy shading
    h2s(ctx, x, y, s, rot = 0) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      const ball = (bx, by, r, c1, c2) => { const g = ctx.createRadialGradient(bx - r * 0.35, by - r * 0.35, r * 0.1, bx, by, r); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); };
      const a = 1.63; // ~92 degrees between the bonds
      const hx1 = Math.cos(Math.PI / 2 + a / 2) * s, hy1 = Math.sin(Math.PI / 2 + a / 2) * s, hx2 = Math.cos(Math.PI / 2 - a / 2) * s, hy2 = Math.sin(Math.PI / 2 - a / 2) * s;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = s * 0.12; ctx.beginPath(); ctx.moveTo(hx1, hy1); ctx.lineTo(0, 0); ctx.lineTo(hx2, hy2); ctx.stroke();
      ball(hx1, hy1, s * 0.28, '#ffffff', '#b9c2cf'); ball(hx2, hy2, s * 0.28, '#ffffff', '#b9c2cf'); ball(0, 0, s * 0.5, '#fff7a6', '#c9b200');
      ctx.restore();
    },
    // soft gas puff (for smell): layered translucent circles, drifting
    puff(ctx, x, y, s, alpha = 0.5, color = P.gas) {
      ctx.save(); ctx.globalAlpha *= alpha; const rnd = mulberry32(Math.round(x * 13 + y * 7));
      for (let i = 0; i < 6; i++) {
        const r = s * (0.35 + rnd() * 0.4), ox = (rnd() - 0.5) * s, oy = (rnd() - 0.5) * s * 0.6;
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },
  };

  // ---------------------------------------------------------------- assets ----------------------------------------
  const assetCache = {};      // images by key; video frames by key+frame
  async function loadImage(src) { const img = new Image(); img.decoding = 'sync'; img.src = src; await img.decode(); return img; }

  // ---------------------------------------------------------------- scene host ------------------------------------
  let SCENE = null;
  window.defineScene = function (spec) {
    SCENE = spec;
    window.__sceneAssets = spec.assets || {};
    window.__sceneMeta = { name: spec.name, fps: spec.fps || 30, duration: spec.duration || (spec.anchorEnd ? 30 : 5), transparent: !!spec.transparent, dynamic: !!spec.anchorEnd };
  };
  window.__motion = {
    async init(opts) {
      if (!SCENE) throw new Error('scene file never called defineScene()');
      const scale = opts.scale || 1, fps = SCENE.fps || 30, duration = opts.duration || SCENE.duration || 5;
      opts.durationFixed = !!opts.durationFixed;
      const canvas = document.createElement('canvas'); canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
      const params = Object.assign({}, SCENE.params || {}, opts.params || {});
      const api = {
        w: W, h: H, W, H, fps, duration, scale, params, P, FONTS, gl: window.GL || null,
        lerp, clamp, map, smoothstep, ease, prog, env, pop, typed,
        rand: (seed) => mulberry32(hashSeed(seed)), noise: (seed = 1) => makeNoise(hashSeed(seed)), hash: hashSeed,
        font, text, measure, wrap, roundRect, label, leader, doodle, stage, paper, grain, vignette, finish, cam, icons,
        image: (key) => assetCache[key], frame: 0, t: 0,
        video: (key) => assetCache[`${key}#${api.__vframe(key)}`],
        // frames were extracted from asset.start, so frame 0 = asset.start; asset.rate plays it faster/slower
        __vframe: (key) => { const a = SCENE.assets[key]; const f = Math.round(Math.max(0, api.t - (a.at || 0)) * (a.rate || 1) * (a.fps || fps)); return Math.max(0, Math.min((a.frames || 1) - 1, f)); },
      };
      // Word timing from the cut (opts.cutWords / opts.beats are URLs the renderer passes for scenes under videos/<slug>/).
      // A scene declares anchor: { word, offset } or { special, offset } and optionally anchorEnd: { word, edge, offset }
      // (+ tail, default 0.5 s): api.at(i) = word i's time relative to the scene start, api.atEnd(i) its end, and the
      // duration follows the cut. Re-cut -> re-render, never re-time by hand.
      api.words = null; api.sceneStart = 0;
      if (opts.cutWords && (SCENE.anchor || SCENE.anchorEnd)) {
        const cw = await (await fetch(opts.cutWords, { cache: 'no-store' })).json();
        const byI = new Map(cw.words.map((w) => [w.i, w]));
        const find = (i) => { let w = byI.get(i); for (let d = 1; !w && d < 30; d++) w = byI.get(i + d) || byI.get(i - d); if (!w) throw new Error('word not in cut: ' + i); return w; };
        let beats = null; if (opts.beats) beats = await (await fetch(opts.beats, { cache: 'no-store' })).json();
        const anchorT = (a) => { if (a.special) { const p = beats.pieces.find((x) => x.special === a.special); return p.at + (a.offset || 0); } const w = find(a.word); return (a.edge === 'end' ? w.end : w.t) + (a.offset || 0); };
        api.sceneStart = anchorT(SCENE.anchor || { word: SCENE.anchorEnd.word });
        api.words = byI;
        api.at = (i, off = 0) => find(i).t - api.sceneStart + off;
        api.atEnd = (i, off = 0) => find(i).end - api.sceneStart + off;
        api.wordsIn = (a, b) => cw.words.filter((w) => w.i >= a && w.i <= b).map((w) => ({ ...w, t: w.t - api.sceneStart, end: w.end - api.sceneStart }));
        if (SCENE.anchorEnd && !opts.durationFixed) api.duration = anchorT(SCENE.anchorEnd) - api.sceneStart + (SCENE.tail ?? 0.5);
      } else {
        api.at = () => { throw new Error('api.at needs anchor + the cut (render under videos/<slug>/)'); };
      }
      // images now; video frames lazily per frame (the renderer extracted them to <frames>/%05d.jpg)
      for (const [k, a] of Object.entries(SCENE.assets || {})) {
        if (a.image) assetCache[k] = await loadImage(opts.base + a.image);
        if (a.video) { a.frames = (opts.videoFrames || {})[k] || 1; a.fps = a.fps || fps; a.dir = (opts.videoDirs || {})[k]; }
      }
      if (SCENE.setup) await SCENE.setup(api);
      this.ctx = ctx; this.canvas = canvas; this.api = api; this.scale = scale;
      const dur = api.duration;
      return { name: SCENE.name, fps, duration: +dur.toFixed(3), totalFrames: Math.round(fps * dur), transparent: !!SCENE.transparent, width: canvas.width, height: canvas.height, sceneStart: api.sceneStart };
    },
    async render(i) {
      const { ctx, api, scale } = this, t = i / api.fps;
      api.t = t; api.frame = i;
      for (const [k, a] of Object.entries(SCENE.assets || {})) {
        if (!a.video) continue;
        const f = api.__vframe(k), key = `${k}#${f}`;
        if (!assetCache[key]) {
          for (const old of Object.keys(assetCache)) if (old.startsWith(k + '#')) delete assetCache[old];
          assetCache[key] = await loadImage(`${a.dir}/${String(f + 1).padStart(5, '0')}.jpg`);
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (!SCENE.transparent && SCENE.bg !== false) { ctx.fillStyle = SCENE.bg || P.bg; ctx.fillRect(0, 0, W, H); }
      ctx.save(); SCENE.draw(ctx, t, api); ctx.restore();
    },
    async png(i) { await this.render(i); return this.canvas.toDataURL('image/png'); },
    async jpeg(i, q = 0.92) { await this.render(i); return this.canvas.toDataURL('image/jpeg', q); },
    // Fast path for the renderer: opaque -> one JPEG; transparent -> one JPEG twice as tall, colour (premultiplied on
    // black) on top and the alpha matte (white = opaque) below; ffmpeg merges and un-premultiplies them. PNG at 4K
    // costs ~250 ms a frame in Chrome, JPEG ~57 ms.
    async frame(i, alpha, q = 0.95) {
      await this.render(i);
      if (!alpha) return this.canvas.toDataURL('image/jpeg', q);
      const w = this.canvas.width, h = this.canvas.height;
      if (!this.stack) { this.stack = document.createElement('canvas'); this.stack.width = w; this.stack.height = h * 2; this.matte = document.createElement('canvas'); this.matte.width = w; this.matte.height = h; }
      const g = this.stack.getContext('2d'), mg = this.matte.getContext('2d');
      g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, w, h * 2); g.drawImage(this.canvas, 0, 0);
      mg.globalCompositeOperation = 'source-over'; mg.clearRect(0, 0, w, h); mg.fillStyle = '#fff'; mg.fillRect(0, 0, w, h);
      mg.globalCompositeOperation = 'destination-in'; mg.drawImage(this.canvas, 0, 0);
      g.drawImage(this.matte, 0, h);
      return this.stack.toDataURL('image/jpeg', q);
    },
  };
})();
