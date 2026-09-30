/* Shared kit for the `micro` group (bacteria and molecules, tongue side). Loaded with
 *   // @use videos/bad-breath-for-good/scenes/micro/_lib.js
 * Defines window.MICRO. Call MICRO.init(api) in setup(); everything else draws in design units (1920x1080).
 *
 * World: a side cross-section of the deep gaps between filiform papillae on the back of the tongue.
 *   floor (tongue surface) at world y ~ 1000, strand tips at y ~ 60-230, open "mouth air" above (y < 150),
 *   hero gap centred on x = 960 (x 790-1130). Light comes from above; the gaps get darker with depth.
 * Camera: { x, y, z } = world point at the screen centre and zoom. Layers use a depth factor d (1 = near plane).
 */
(function () {
  const W = 1920, H = 1080;
  let api = null, P = null, SS = 2;
  const SPR = {};                      // sprites
  const M = {};
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function mk(w, h, ss = SS) {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * ss)); c.height = Math.max(1, Math.ceil(h * ss));
    const g = c.getContext('2d'); g.scale(ss, ss); return [c, g];
  }
  function rgba(hex, a) {
    const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  M.rgba = rgba;

  // ------------------------------------------------------------------------------------------------ colours
  const C = {
    tip: '#fde4ea', light: '#f6a6b9', mid: '#e27792', deep: '#a33f66', base: '#46133a',
    gap0: '#2b1f4c', gap1: '#171230', gap2: '#0c0918', floor0: '#5a1a44', floor1: '#260a24',
    o2a: '#bfe9ff', o2b: '#3b93e0', o2c: '#1b4f99',
    sulfur: '#e9e24a', gas: '#b9e35a', mint: '#8fe8ff', rinse: '#8fd8ff',
  };
  M.C = C;
  const KINDS = {
    rod:   { len: 1.0, rad: 0.25, p: 2.7, light: '#d4ffe2', mid: '#46d58a', dark: '#146b44', flag: 'rgba(200,255,215,0.6)', flagella: 3, eye: '#0e2a1c' },
    rod2:  { len: 1.0, rad: 0.22, p: 2.9, light: '#f0ffc4', mid: '#9bdc3c', dark: '#3f7417', flag: 'rgba(225,255,190,0.55)', flagella: 2, eye: '#1e2a0e' },
    cocc:  { len: 0.62, rad: 0.29, p: 2.1, light: '#d9ffe6', mid: '#3fc47e', dark: '#12603c', flag: null, flagella: 0, eye: '#0e2a1c' },
    good:  { len: 0.7, rad: 0.3, p: 2.2, light: '#d8fcff', mid: '#35c3c9', dark: '#0f5e70', flag: 'rgba(200,250,255,0.5)', flagella: 1, eye: '#0b2630' },
    pg:    { len: 0.78, rad: 0.3, p: 2.3, light: '#e2b9ff', mid: '#6d2f8c', dark: '#1f0a2e', flag: null, flagella: 0, hair: 'rgba(214,176,255,0.6)', eye: '#f3e6ff' },
  };
  M.KINDS = KINDS;

  // ------------------------------------------------------------------------------------------------ word timing
  // Reads the CURRENT cut (edit/cut-words.json) at render time, so a scene stays on its words if the cut is re-timed:
  //   const W = await MICRO.loadWords(1144);  W(1147) -> scene time of word 1147's start (first word at 0.15 s);
  //   W(1186, 'end') -> scene time of its end. Missing words fall back to the nearest word in the cut.
  M.loadWords = async function (first) {
    const res = await fetch('/videos/bad-breath-for-good/edit/cut-words.json');
    const words = (await res.json()).words, by = new Map(words.map((w) => [w.i, w]));
    const near = (i) => { for (let d = 0; d < 40; d++) { const w = by.get(i + d) || by.get(i - d); if (w) return w; } throw new Error('word not in cut: ' + i); };
    const t0 = near(first).t;
    const W = (i, edge) => { const w = near(i); return +(((edge === 'end' ? w.end : w.t) - t0) + 0.15).toFixed(3); };
    W.t0 = t0; return W;
  };

  // Synchronous version for defineScene time (the render duration must be known before setup runs):
  //   const CUT = MICRO.cut(1144, 1186);  CUT.W(i[, 'end']) as above;  CUT.dur = (last word end - first word start) + 0.9
  //   (0.15 lead + 0.25 tail + 0.5 margin, per the brief). Sync XHR is fine here: same-origin, once per page.
  let CUTWORDS = null;
  M.cut = function (first, last, next) {   // next: the word the following scene starts on (render must reach it)
    if (!CUTWORDS) { const x = new XMLHttpRequest(); x.open('GET', '/videos/bad-breath-for-good/edit/cut-words.json', false); x.send(); CUTWORDS = JSON.parse(x.responseText).words; }
    const by = new Map(CUTWORDS.map((w) => [w.i, w]));
    const near = (i) => { for (let d = 0; d < 40; d++) { const w = by.get(i + d) || by.get(i - d); if (w) return w; } throw new Error('word not in cut: ' + i); };
    const t0 = near(first).t;
    const W = (i, edge) => +(((edge === 'end' ? near(i).end : near(i).t) - t0) + 0.15).toFixed(3);
    const span = near(last).end - t0 + 0.9, reach = next != null ? near(next).t - t0 + 0.5 : 0;
    return { W, t0, dur: +Math.max(span, reach).toFixed(2) };
  };

  // ------------------------------------------------------------------------------------------------ init
  M.init = function (a) {
    api = a; P = a.P; SS = Math.max(1, a.scale || 2);
    buildStrands(); buildBlobs(); buildShafts();
    return M;
  };

  // ------------------------------------------------------------------------------------------------ strands (papillae)
  // One filiform papilla, side view, base at the bottom. Drawn straight with cylinder shading, then bent by row warp.
  function strandSprite(h, w0, o = {}) {
    const bend = o.bend || 0, pad = 24, tw = w0 * 1.3 + pad * 2, th = h + pad * 2;
    const [c0, g] = mk(tw, th);
    const cx = tw / 2, base = h + pad, top = pad, tipW = w0 * (o.taper ?? 0.5), flare = w0 * 0.62;
    const path = () => {
      g.beginPath();
      g.moveTo(cx - flare, base + 2);
      g.bezierCurveTo(cx - w0 / 2, base - h * 0.08, cx - w0 / 2, base - h * 0.45, cx - tipW / 2, top + tipW * 0.9);
      g.arc(cx, top + tipW * 0.55, tipW / 2, Math.PI * 0.95, Math.PI * 2.05);
      g.bezierCurveTo(cx + w0 / 2, base - h * 0.45, cx + w0 / 2, base - h * 0.08, cx + flare, base + 2);
      g.closePath();
    };
    path();
    const vg = g.createLinearGradient(0, top, 0, base);
    vg.addColorStop(0, C.tip); vg.addColorStop(0.06, C.light); vg.addColorStop(0.3, C.mid); vg.addColorStop(0.58, C.deep); vg.addColorStop(0.9, C.base); vg.addColorStop(1, '#2a0a26');
    g.fillStyle = vg; g.fill();
    g.save(); path(); g.clip();
    // cylinder shading across the width
    const hg = g.createLinearGradient(cx - w0 / 2, 0, cx + w0 / 2, 0);
    hg.addColorStop(0, 'rgba(255,230,240,0.30)'); hg.addColorStop(0.22, 'rgba(255,255,255,0.10)'); hg.addColorStop(0.5, 'rgba(0,0,0,0)');
    hg.addColorStop(0.8, 'rgba(45,5,40,0.32)'); hg.addColorStop(1, 'rgba(35,0,35,0.55)');
    g.fillStyle = hg; g.fillRect(0, 0, tw, th);
    // soft ring striations
    const rnd = api.rand('strand' + h + w0 + (o.seed || 0));
    g.lineWidth = 2.2;
    for (let y = top + tipW * 1.2; y < base - 20; y += 26 + rnd() * 26) {
      const k = (y - top) / h, ww = lerp(tipW, w0, Math.min(1, k * 1.6)) / 2;
      g.strokeStyle = `rgba(110,20,60,${0.06 + rnd() * 0.07})`;
      g.beginPath(); g.ellipse(cx, y, ww, 7 + rnd() * 5, 0, 0.1, Math.PI - 0.1); g.stroke();
    }
    // speckles
    for (let i = 0; i < 70; i++) {
      const y = top + rnd() * h, x = cx + (rnd() - 0.5) * w0 * 0.8;
      g.fillStyle = rnd() < 0.5 ? 'rgba(255,220,230,0.10)' : 'rgba(90,10,50,0.10)';
      g.beginPath(); g.arc(x, y, 1.5 + rnd() * 3, 0, TAU); g.fill();
    }
    // specular streak (light from upper left)
    const sg = g.createLinearGradient(0, top, 0, top + h * 0.7);
    sg.addColorStop(0, 'rgba(255,255,255,0.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg; g.beginPath(); g.ellipse(cx - w0 * 0.2, top + h * 0.3, w0 * 0.06, h * 0.3, 0.02, 0, TAU); g.fill();
    // rim light on the right (lavender bounce) and a darker core shadow
    g.lineWidth = 22; const rg = g.createLinearGradient(cx + w0 * 0.1, 0, cx + w0 / 2, 0);
    rg.addColorStop(0, 'rgba(200,170,255,0)'); rg.addColorStop(1, 'rgba(205,180,255,0.22)');
    g.strokeStyle = rg; path(); g.stroke();
    // keratin cap at the tip
    const kg = g.createRadialGradient(cx - tipW * 0.1, top + tipW * 0.4, 1, cx, top + tipW * 0.6, tipW * 1.1);
    kg.addColorStop(0, 'rgba(255,250,252,0.85)'); kg.addColorStop(1, 'rgba(255,240,245,0)');
    g.fillStyle = kg; g.fillRect(cx - tipW, top - 5, tipW * 2, tipW * 2);
    // base occlusion
    const og = g.createLinearGradient(0, base - h * 0.35, 0, base);
    og.addColorStop(0, 'rgba(20,4,24,0)'); og.addColorStop(1, 'rgba(20,4,24,0.55)');
    g.fillStyle = og; g.fillRect(0, base - h * 0.35, tw, h * 0.35 + pad);
    g.restore();
    // hair-like fringe at the tip (filiform papillae end in fine keratin threads)
    g.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const a = -Math.PI / 2 + (k - 1.5) * 0.36, x0 = cx + Math.cos(a) * tipW * 0.42, y0 = top + tipW * 0.55 + Math.sin(a) * tipW * 0.42;
      const L = tipW * (0.16 + rnd() * 0.2);
      g.strokeStyle = 'rgba(255,236,242,0.55)'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + Math.cos(a) * L * 0.6 + 4, y0 + Math.sin(a) * L * 0.6, x0 + Math.cos(a) * L + (rnd() - 0.5) * 8, y0 + Math.sin(a) * L); g.stroke();
    }
    // bend by row warp (tip moves by `bend`, quadratic along the height)
    const bw = tw + Math.abs(bend) * 2, [c1, g1] = mk(bw, th);
    const rows = Math.ceil(th * SS), step = 2;
    for (let r = 0; r < rows; r += step) {
      const yy = r / SS, k = clamp((base - yy) / h), off = bend * k * k + Math.abs(bend);
      g1.drawImage(c0, 0, r, c0.width, step, off, yy, tw, step / SS);
    }
    return { c: c1, w: bw, h: th, ax: bw / 2 + (bend < 0 ? 0 : 0), ay: base, tipX: bw / 2 + bend, bend };
  }
  function blurred(spr, px, tint) {
    const pad = px * 3, [c, g] = mk(spr.w + pad * 2, spr.h + pad * 2);
    if (px > 0) g.filter = `blur(${px * SS}px)`;
    g.drawImage(spr.c, pad, pad, spr.w, spr.h);
    g.filter = 'none';
    if (tint) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, spr.w + pad * 2, spr.h + pad * 2); }
    return { c, w: spr.w + pad * 2, h: spr.h + pad * 2, ax: spr.ax + pad, ay: spr.ay + pad, bend: spr.bend };
  }
  function buildStrands() {
    const rnd = api.rand('micro-strands');
    SPR.near = []; SPR.mid = []; SPR.far = []; SPR.fg = [];
    for (let i = 0; i < 7; i++) SPR.near.push(strandSprite(800 + rnd() * 180, 180 + rnd() * 40, { bend: (rnd() - 0.5) * 90, seed: i, taper: 0.56 + rnd() * 0.1 }));
    for (let i = 0; i < 5; i++) SPR.mid.push(blurred(strandSprite(760 + rnd() * 160, 175 + rnd() * 40, { bend: (rnd() - 0.5) * 80, seed: 20 + i }), 1.2, 'rgba(30,14,60,0.38)'));
    for (let i = 0; i < 4; i++) SPR.far.push(blurred(strandSprite(700 + rnd() * 160, 170 + rnd() * 40, { bend: (rnd() - 0.5) * 70, seed: 40 + i }), 2.6, 'rgba(26,16,58,0.62)'));
    for (let i = 0; i < 3; i++) SPR.fg.push(blurred(strandSprite(950 + rnd() * 100, 250 + rnd() * 40, { bend: (rnd() - 0.5) * 70, seed: 60 + i }), 9, 'rgba(18,6,26,0.55)'));
    // layout per layer (world x of the base, which sprite, scale, sway phase)
    const lay = (xs, n, sc, jit, seed) => { const r = api.rand(seed); return xs.map((x) => ({ x: x + (r() - 0.5) * jit, s: Math.floor(r() * n), sc: sc * (0.88 + r() * 0.24), ph: r() * TAU, amp: 0.6 + r() * 0.8 })); };
    // near plane: hero gap between the strands at x 700 and 1225 (gap ~ 800-1125 at the floor)
    const nearX = [-1280, -950, -620, -290, 40, 370, 700, 1225, 1555, 1885, 2215, 2545, 2875];
    M.layout = {
      near: lay(nearX, SPR.near.length, 1.0, 36, 'L-near'),
      mid: lay(Array.from({ length: 18 }, (_, i) => -1100 + i * 260), SPR.mid.length, 0.84, 70, 'L-mid'),
      far: lay(Array.from({ length: 24 }, (_, i) => -1150 + i * 190), SPR.far.length, 0.64, 60, 'L-far'),
      fg: lay([-80, 2010], SPR.fg.length, 1.55, 20, 'L-fg'),
    };
    // the two hero strands: fixed sprites, positions and scale
    for (const s of M.layout.near) { if (s.x > 650 && s.x < 750) { s.x = 700; s.s = 1; s.sc = 1.02; } if (s.x > 1175 && s.x < 1275) { s.x = 1225; s.s = 4; s.sc = 1.0; } }
  }
  function drawStrand(ctx, spr, x, y, sc, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    ctx.drawImage(spr.c, -spr.ax, -spr.ay, spr.w, spr.h);
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------------ soft sprites
  function blobSprite(color, soft = 0) {
    const [c, g] = mk(128, 128, 2);
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(0.35 + soft * 0.2, rgba(color, 0.55)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
  }
  function buildBlobs() {
    SPR.blob = {};
    for (const [k, col] of Object.entries({ gas: C.gas, sulfur: C.sulfur, mint: C.mint, white: '#ffffff', rinse: C.rinse, lime: '#d7f34a', pink: '#ff9ec0', lav: '#b9a4ff', amber: '#ffcf7a', teal: '#62f0e0' })) SPR.blob[k] = blobSprite(col);
  }
  M.blob = function (ctx, key, x, y, r, a = 1) {
    if (a <= 0 || r <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(SPR.blob[key] || SPR.blob.white, x - r, y - r, r * 2, r * 2); ctx.restore();
  };
  function buildShafts() {
    const [c, g] = mk(900, 1300, 1);
    g.filter = 'blur(28px)';
    const rnd = api.rand('shafts');
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 140 + rnd() * 60, w = 40 + rnd() * 70;
      const gr = g.createLinearGradient(0, 0, 0, 1300); gr.addColorStop(0, 'rgba(255,225,240,0.9)'); gr.addColorStop(0.55, 'rgba(255,200,230,0.25)'); gr.addColorStop(1, 'rgba(255,200,230,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w + 160, 1300); g.lineTo(x + 120, 1300); g.closePath(); g.fill();
    }
    SPR.shafts = c;
  }

  // ------------------------------------------------------------------------------------------------ camera
  // apply camera for a layer at depth factor d (1 = near plane, 0 = infinitely far)
  M.applyCam = function (ctx, cam, d = 1) {
    const z = 1 + (cam.z - 1) * d, cx = 960 + (cam.x - 960) * d, cy = 540 + (cam.y - 540) * d;
    ctx.translate(960, 540); ctx.scale(z, z); ctx.translate(-cx, -cy);
  };
  M.toScreen = function (cam, x, y, d = 1) {
    const z = 1 + (cam.z - 1) * d, cx = 960 + (cam.x - 960) * d, cy = 540 + (cam.y - 540) * d;
    return [960 + (x - cx) * z, 540 + (y - cy) * z];
  };
  // interpolate a list of camera keys [{t, x, y, z}] with inOutSine (or per-key ease)
  M.camAt = function (t, keys) {
    if (t <= keys[0].t) return { ...keys[0] };
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (t <= b.t) { const k = (b.ease || api.ease.inOutCubic)(clamp((t - a.t) / (b.t - a.t))); return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) }; }
    }
    return { ...keys[keys.length - 1] };
  };

  // ------------------------------------------------------------------------------------------------ the crevice
  // Draws the whole background world. o: { sway (1), shafts (1), motes (1), fg (false), dim (0), glowTop (1), floor (true) }
  // Returns nothing; draw content afterwards inside ctx.save(); M.applyCam(ctx, cam, 1); ... ctx.restore().
  M.crevice = function (ctx, t, cam, o = {}) {
    const sway = o.sway ?? 1;
    // backdrop: vertical gradient in world space (d = 0.5), bright "mouth air" above, deep indigo in the gaps
    ctx.save(); M.applyCam(ctx, cam, 0.5);
    const bg = ctx.createLinearGradient(0, -900, 0, 1200);
    bg.addColorStop(0, '#4a3470'); bg.addColorStop(0.28, '#33245a'); bg.addColorStop(0.5, C.gap1); bg.addColorStop(0.75, '#100c22'); bg.addColorStop(1, C.gap2);
    ctx.fillStyle = bg; ctx.fillRect(-2600, -2000, 7200, 4400);
    // glow of the light source above
    const lg = ctx.createRadialGradient(900, -700, 50, 900, -700, 1500);
    lg.addColorStop(0, `rgba(255,200,225,${0.45 * (o.glowTop ?? 1)})`); lg.addColorStop(1, 'rgba(255,200,225,0)');
    ctx.fillStyle = lg; ctx.fillRect(-2600, -2000, 7200, 4400);
    ctx.restore();
    // far strands
    ctx.save(); M.applyCam(ctx, cam, 0.45);
    for (const s of M.layout.far) drawStrand(ctx, SPR.far[s.s], s.x, 900, s.sc, Math.sin(t * 0.5 + s.ph) * 0.012 * sway * s.amp);
    ctx.restore();
    // light shafts
    if ((o.shafts ?? 1) > 0) {
      ctx.save(); M.applyCam(ctx, cam, 0.6); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.16 * (o.shafts ?? 1);
      ctx.drawImage(SPR.shafts, 250 + Math.sin(t * 0.2) * 30, -700, 1500, 1900);
      ctx.drawImage(SPR.shafts, -900 + Math.sin(t * 0.17 + 1) * 30, -700, 1300, 1800);
      ctx.drawImage(SPR.shafts, 1700 + Math.sin(t * 0.23 + 2) * 30, -700, 1300, 1800);
      ctx.restore();
    }
    // fog between far and mid
    ctx.save(); M.applyCam(ctx, cam, 0.6);
    const fg1 = ctx.createLinearGradient(0, 0, 0, 1100); fg1.addColorStop(0, 'rgba(40,26,80,0.10)'); fg1.addColorStop(1, 'rgba(8,6,18,0.55)');
    ctx.fillStyle = fg1; ctx.fillRect(-2600, -1400, 7200, 3400); ctx.restore();
    // mid strands
    ctx.save(); M.applyCam(ctx, cam, 0.72);
    for (const s of M.layout.mid) drawStrand(ctx, SPR.mid[s.s], s.x, 960, s.sc, Math.sin(t * 0.55 + s.ph) * 0.013 * sway * s.amp);
    ctx.restore();
    // fog before near + motes
    ctx.save(); M.applyCam(ctx, cam, 0.85);
    const fg2 = ctx.createLinearGradient(0, 200, 0, 1100); fg2.addColorStop(0, 'rgba(14,10,30,0.0)'); fg2.addColorStop(1, 'rgba(10,6,20,0.45)');
    ctx.fillStyle = fg2; ctx.fillRect(-2600, -1400, 7200, 3400);
    if ((o.motes ?? 1) > 0) motes(ctx, t, o.motes ?? 1, 'far');
    ctx.restore();
    // near plane: floor + strands
    ctx.save(); M.applyCam(ctx, cam, 1);
    if (o.floor !== false) floor(ctx, t);
    for (const s of M.layout.near) drawStrand(ctx, SPR.near[s.s], s.x, 1010, s.sc, Math.sin(t * 0.6 + s.ph) * 0.010 * sway * s.amp);
    // depth: the deep gaps get darker (light comes from above)
    const dg = ctx.createLinearGradient(0, 280, 0, 1010); dg.addColorStop(0, 'rgba(10,6,22,0)'); dg.addColorStop(0.6, 'rgba(10,6,22,0.28)'); dg.addColorStop(1, `rgba(10,6,22,${o.deep ?? 0.5})`);
    ctx.fillStyle = dg; ctx.fillRect(-2600, 280, 7200, 1400);
    if (o.dim) { ctx.fillStyle = `rgba(8,6,18,${o.dim})`; ctx.fillRect(-2600, -1600, 7200, 3800); }
    ctx.restore();
  };
  // foreground (in front of content): out-of-focus strands and near motes
  M.creviceFront = function (ctx, t, cam, o = {}) {
    ctx.save(); M.applyCam(ctx, cam, 1.3);
    if ((o.motes ?? 1) > 0) motes(ctx, t, o.motes ?? 1, 'near');
    if (o.fg) for (const s of M.layout.fg) drawStrand(ctx, SPR.fg[s.s], s.x, 1200, s.sc, Math.sin(t * 0.5 + s.ph) * 0.01);
    ctx.restore();
  };
  function floor(ctx, t) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-2600, 1600); ctx.lineTo(-2600, 1000);
    for (let x = -2600; x <= 4600; x += 40) ctx.lineTo(x, 1000 + Math.sin(x / 150) * 10 + Math.sin(x / 61 + 1) * 4);
    ctx.lineTo(4600, 1600); ctx.closePath();
    const g = ctx.createLinearGradient(0, 990, 0, 1300); g.addColorStop(0, C.floor0); g.addColorStop(1, C.floor1);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,150,190,0.18)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.clip();
    const r = api.rand('floor-cells');
    for (let i = 0; i < 150; i++) { const x = -1400 + r() * 4200, y = 1004 + Math.pow(r(), 1.6) * 140, w = 26 + r() * 30; ctx.fillStyle = r() < 0.5 ? 'rgba(255,140,190,0.06)' : 'rgba(20,0,20,0.14)'; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.34, 0, 0, Math.PI * 2); ctx.fill(); }
    const hl = ctx.createLinearGradient(0, 995, 0, 1040); hl.addColorStop(0, 'rgba(255,160,200,0.16)'); hl.addColorStop(1, 'rgba(255,160,200,0)'); ctx.fillStyle = hl; ctx.fillRect(-2600, 990, 7200, 60);
    ctx.restore();
  }
  function motes(ctx, t, amt, which) {
    const rnd = api.rand('motes-' + which), n = which === 'far' ? 70 : 18;
    for (let i = 0; i < n; i++) {
      const x0 = -600 + rnd() * 3100, y0 = -500 + rnd() * 1500, sp = 6 + rnd() * 14, r = which === 'far' ? 2 + rnd() * 4 : 5 + rnd() * 10, ph = rnd() * TAU;
      const x = x0 + Math.sin(t * 0.3 + ph) * 30 + t * sp * 0.6, y = y0 - t * sp + Math.cos(t * 0.4 + ph) * 12;
      const a = (which === 'far' ? 0.35 : 0.18) * amt * (0.5 + 0.5 * Math.sin(t * 0.8 + ph));
      M.blob(ctx, i % 3 ? 'pink' : 'white', x, y, r * 2, a);
    }
  }
  // hero gap geometry (world units)
  M.GAP = { x0: 820, x1: 1110, cx: 965, floor: 995 };

  // ------------------------------------------------------------------------------------------------ bacteria
  // o: kind, rot, phase, squash (+ stretches along the body axis), bend, eyes, blink, alpha, dim (0..1 grey-out), glow (colour),
  //    swell (0..1 balloon), shadow, inside (fn(ctx, L, R) drawn clipped inside the body), mouth (0..1 open), flagellaAmp
  M.bug = function (ctx, x, y, s, t, o = {}) {
    const K = KINDS[o.kind || 'rod'], ph = (o.phase || 0) + t;
    const sw = o.swell || 0;
    let L = s * K.len * (1 + sw * 0.25), R = s * K.rad * (1 + sw * 0.9);
    const p = lerp(K.p, 2.0, sw);
    const rot = o.rot || 0;
    ctx.save(); ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    // soft glow
    if (o.glow) M.blob(ctx, o.glow, 0, 0, Math.max(L, R * 2) * 1.2, o.glowA ?? 0.5);
    if (o.flip) ctx.scale(-1, 1);   // mirror (faces left) instead of rotating by pi, so faces stay upright
    ctx.rotate(rot);
    const sq = o.squash || 0; ctx.scale(1 + sq, 1 / (1 + sq));
    const bend = (o.bend ?? 0.25) * Math.sin(ph * (o.wiggle ?? 5));
    const N = s > 220 ? 72 : s > 120 ? 40 : 26, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, xx = -L / 2 + u * L, e = Math.abs(2 * u - 1), r = R * Math.pow(Math.max(0, 1 - Math.pow(e, p)), 1 / p);
      const yy = bend * R * Math.sin((u - 0.5) * Math.PI) * 0.6;
      top.push([xx, yy - r]); bot.push([xx, yy + r]);
    }
    const outline = () => { ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (const q of top) ctx.lineTo(q[0], q[1]); for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath(); };
    const dim = o.dim || 0;
    let light = dim ? mixHex(K.light, '#8a8796', dim) : K.light, mid = dim ? mixHex(K.mid, '#55525f', dim) : K.mid, dark = dim ? mixHex(K.dark, '#26242d', dim) : K.dark;
    if (sw > 0) { mid = mixHex(mid, light, sw * 0.4); dark = mixHex(dark, mid, sw * 0.3); }
    // flagella
    if (K.flagella && (o.flagella ?? true)) {
      ctx.save(); ctx.strokeStyle = dim ? 'rgba(160,160,170,0.35)' : K.flag; ctx.lineWidth = Math.max(1.2, Math.min(s * 0.028, 6)); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const amp = (o.flagellaAmp ?? 1) * s * 0.07 * (o.flagellaLen ?? 1);
      for (let k = 0; k < K.flagella; k++) {
        const y0 = (k - (K.flagella - 1) / 2) * R * 0.55, n = 16, step = s * 0.045 * (o.flagellaLen ?? 1);
        ctx.beginPath(); ctx.moveTo(-L / 2 + R * 0.25, y0);
        for (let i = 1; i <= n; i++) ctx.lineTo(-L / 2 + R * 0.25 - i * step, y0 + (i / n) * amp * Math.sin(ph * 9 - i * 0.75 + k * 1.7) + y0 * i * 0.05);
        ctx.stroke();
      }
      ctx.restore();
    }
    // fimbriae (P. gingivalis): fine hairs all round
    if (K.hair) {
      ctx.save(); ctx.strokeStyle = dim ? 'rgba(170,165,180,0.4)' : K.hair; ctx.lineWidth = Math.max(1, s * 0.014); ctx.lineCap = 'round';
      const n = 44;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU, ex = Math.cos(a) * L / 2, ey = Math.sin(a) * R, nx = Math.cos(a) * R, ny = Math.sin(a) * L / 2, nl = Math.hypot(nx, ny) || 1;
        const hl = s * (0.07 + 0.03 * Math.sin(i * 2.3)), w = Math.sin(ph * 4 + i) * 0.35;
        const dx = nx / nl, dy = ny / nl;
        ctx.beginPath(); ctx.moveTo(ex * 0.96, ey * 0.96);
        ctx.quadraticCurveTo(ex + dx * hl * 0.6 - dy * hl * w, ey + dy * hl * 0.6 + dx * hl * w, ex + dx * hl, ey + dy * hl);
        ctx.stroke();
      }
      ctx.restore();
    }
    // outer slime capsule
    ctx.save(); ctx.scale(1.07, 1.12); outline(); ctx.fillStyle = rgba(dim ? '#9a98a6' : K.light, 0.16); ctx.fill(); ctx.restore();
    // body
    const lx = -0.3, ly = -1, cr = Math.cos(-rot), sr = Math.sin(-rot);
    const hx = (cr * lx - sr * ly) * L * 0.22, hy = (sr * lx + cr * ly) * R * 0.45;
    const g = ctx.createRadialGradient(hx, hy, R * 0.1, 0, 0, Math.max(L * 0.62, R * 1.3));
    g.addColorStop(0, light); g.addColorStop(0.5, mid); g.addColorStop(1, dark);
    outline(); ctx.fillStyle = g; ctx.fill();
    // inside: organelles + optional content
    ctx.save(); outline(); ctx.clip();
    const rnd = api.rand('bug-in-' + (o.seed ?? 0));
    for (let i = 0; i < 6; i++) {
      const ix = (rnd() - 0.5) * L * 0.6 + Math.sin(ph * 0.9 + i) * L * 0.04, iy = (rnd() - 0.5) * R * 0.8 + Math.cos(ph * 1.1 + i) * R * 0.06;
      ctx.fillStyle = rgba(dark, 0.22); ctx.beginPath(); ctx.arc(ix, iy, R * (0.08 + rnd() * 0.1), 0, TAU); ctx.fill();
    }
    if (o.inside) o.inside(ctx, L, R);
    // bottom bounce light
    const bl = ctx.createLinearGradient(0, R * 0.2, 0, R * 1.1); bl.addColorStop(0, 'rgba(255,255,255,0)'); bl.addColorStop(1, rgba(light, 0.35));
    ctx.fillStyle = bl; ctx.fillRect(-L, -R * 2, L * 2, R * 4);
    ctx.restore();
    // membrane edge
    outline(); ctx.strokeStyle = rgba(light, 0.45); ctx.lineWidth = Math.max(1, s * 0.018); ctx.stroke();
    // gloss
    ctx.save(); ctx.globalAlpha *= 0.55 * (1 - dim * 0.7); ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(hx * 0.9, hy * 0.9 - R * 0.05, Math.max(R * 0.2, L * 0.16), R * 0.12, Math.atan2(sr, cr) * 0 + 0.0, 0, TAU); ctx.fill();
    ctx.globalAlpha *= 0.6; ctx.beginPath(); ctx.ellipse(hx * 0.4 + L * 0.12, hy * 0.5, R * 0.07, R * 0.05, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // eyes
    if (o.eyes && o.eyesClosed) {
      const ex = L * 0.24 * (o.eyeX ?? 1), ey = -R * 0.12, er = R * 0.15 * (o.eyeScale ?? 1);
      ctx.strokeStyle = dim ? 'rgba(40,38,48,0.8)' : K.eye; ctx.lineWidth = Math.max(1.5, er * 0.35); ctx.lineCap = 'round';
      for (const dx of [-er * 1.2, er * 1.2]) { ctx.beginPath(); ctx.moveTo(ex + dx - er * 0.6, ey); ctx.lineTo(ex + dx + er * 0.6, ey + er * 0.15); ctx.stroke(); }
    } else if (o.eyes) {
      const ex = L * 0.24 * (o.eyeX ?? 1), ey = -R * 0.12, er = R * 0.15 * (o.eyeScale ?? 1);
      const blink = o.blink != null ? o.blink : (Math.sin(ph * 1.3 + (o.seed || 0)) > 0.985 ? 0.1 : 1);
      for (const dx of [-er * 1.35, er * 1.35]) {
        ctx.save(); ctx.translate(ex + dx * 0.9, ey); ctx.scale(1, blink * (o.eyeSquint ?? 1));
        ctx.fillStyle = K.eye; ctx.beginPath(); ctx.ellipse(0, 0, er * 0.72, er, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = K.eye === '#f3e6ff' ? '#1a0626' : '#ffffff'; ctx.beginPath(); ctx.arc(-er * 0.25, -er * 0.35, er * 0.3, 0, TAU); ctx.fill();
        ctx.restore();
      }
      if (o.mouth > 0.02) {           // open mouth (eating)
        ctx.fillStyle = K.eye === '#f3e6ff' ? '#12041c' : '#0b2016'; ctx.beginPath(); ctx.ellipse(ex + er * 0.2, ey + er * 1.9, er * 0.95, er * 1.05 * o.mouth, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,120,150,0.8)'; ctx.beginPath(); ctx.ellipse(ex + er * 0.2, ey + er * 1.9 + er * 0.55 * o.mouth, er * 0.5, er * 0.35 * o.mouth, 0, 0, TAU); ctx.fill();
      } else if (o.smile) {
        ctx.strokeStyle = K.eye; ctx.lineWidth = Math.max(1.5, R * 0.07); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(ex, ey + er * 1.3, er * 0.9 * o.smile, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      }
      if (o.frown) {                  // grumpy brows (the villain)
        ctx.strokeStyle = K.eye; ctx.lineWidth = Math.max(1.5, R * 0.08); ctx.lineCap = 'round';
        for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ex + sgn * er * 2.0, ey - er * 1.55); ctx.lineTo(ex + sgn * er * 0.45, ey - er * 1.05); ctx.stroke(); }
      }
    }
    ctx.restore();
    return { L, R };
  };
  function mixHex(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, k)), g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, k)), bl = Math.round(lerp(pa & 255, pb & 255, k));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }
  M.mixHex = mixHex;
  // soft contact shadow under something resting on the floor
  M.shadow = function (ctx, x, y, w, a = 0.45) {
    ctx.save(); ctx.globalAlpha *= a; const g = ctx.createRadialGradient(x, y, 0, x, y, w);
    g.addColorStop(0, 'rgba(10,0,15,0.9)'); g.addColorStop(1, 'rgba(10,0,15,0)');
    ctx.fillStyle = g; ctx.scale(1, 1); ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.28, 0, 0, TAU); ctx.fill(); ctx.restore();
  };

  // ------------------------------------------------------------------------------------------------ molecules
  function ball(ctx, x, y, r, c0, c1, c2, rim) {
    const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.05, x, y, r);
    g.addColorStop(0, c0); g.addColorStop(0.45, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (rim) { ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, r * 0.06); ctx.beginPath(); ctx.arc(x, y, r * 0.97, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(x - r * 0.36, y - r * 0.4, r * 0.22, r * 0.14, -0.6, 0, TAU); ctx.fill();
  }
  function stick(ctx, x1, y1, x2, y2, w, col) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const g = ctx.createLinearGradient(x1 + nx * w / 2, y1 + ny * w / 2, x1 - nx * w / 2, y1 - ny * w / 2);
    g.addColorStop(0, col[0]); g.addColorStop(0.35, col[1]); g.addColorStop(1, col[2]);
    ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // H2S: yellow S, two white H at ~92 degrees; spin = rotation about the vertical axis (3D), rot = in-plane rotation
  M.h2s = function (ctx, x, y, s, rot = 0, spin = 0, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow) M.blob(ctx, 'sulfur', 0, 0, s * 1.9, o.glow);
    const half = 0.8 * 0.5 * (92 / 57.3) * 1.25; // spread
    const hs = [[-Math.sin(half), Math.cos(half)], [Math.sin(half), Math.cos(half)]].map(([hx, hy]) => {
      const x3 = hx * Math.cos(spin), z3 = hx * Math.sin(spin); return { x: x3 * s * 0.95, y: hy * s * 0.95, z: z3 };
    });
    const drawH = (h) => { const sc = 1 + h.z * 0.12; stick(ctx, 0, 0, h.x, h.y, s * 0.16, ['#ffffff', '#e8e6de', '#9d9a8e']); ball(ctx, h.x, h.y, s * 0.3 * sc, '#ffffff', '#eef0f3', '#9ea6b3', 'rgba(255,255,255,0.35)'); };
    for (const h of hs) if (h.z < 0) drawH(h);
    ball(ctx, 0, 0, s * 0.52, '#fffbd2', C.sulfur, '#9c8a00', 'rgba(255,255,200,0.5)');
    if (o.letters) { api.text(ctx, 'S', 0, s * 0.17, { size: s * 0.46, weight: 700, color: 'rgba(80,60,0,0.75)', align: 'center' }); }
    for (const h of hs) if (h.z >= 0) drawH(h);
    if (o.letters) for (const h of hs) api.text(ctx, 'H', h.x, h.y + s * 0.1, { size: s * 0.28, weight: 700, color: 'rgba(60,60,80,0.7)', align: 'center' });
    ctx.restore();
  };
  // O2: two blue balls with a double bond
  M.o2 = function (ctx, x, y, s, rot = 0, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow) M.blob(ctx, 'rinse', 0, 0, s * 1.6, o.glow);
    const d = s * 0.42;
    for (const off of [-s * 0.07, s * 0.07]) stick(ctx, -d, off, d, off, s * 0.08, ['#ffffff', '#cfe8ff', '#6c9cc8']);
    ball(ctx, -d, 0, s * 0.36, C.o2a, '#6cc0ff', C.o2c, 'rgba(200,240,255,0.5)');
    ball(ctx, d, 0, s * 0.36, C.o2a, '#6cc0ff', C.o2c, 'rgba(200,240,255,0.5)');
    ctx.restore();
  };
  // chemical formula with subscripts: M.formula(ctx, 'H_2S', x, y, size, { color, align })
  M.formula = function (ctx, str, x, y, size, o = {}) {
    const parts = []; for (let i = 0; i < str.length; i++) { if (str[i] === '_') { parts.push([str[i + 1], true]); i++; } else parts.push([str[i], false]); }
    const fo = (sub) => ({ size: sub ? size * 0.62 : size, weight: 700, family: o.family, tracking: 1 });
    let w = 0; for (const [ch, sub] of parts) w += api.measure(ctx, ch, fo(sub));
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    for (const [ch, sub] of parts) {
      api.text(ctx, ch, cx, y + (sub ? size * 0.2 : 0), { ...fo(sub), color: o.color || P.ink, stroke: o.stroke, strokeWidth: o.strokeWidth, shadow: o.shadow, alpha: o.alpha, glow: o.glow });
      cx += api.measure(ctx, ch, fo(sub));
    }
    return w;
  };

  // ------------------------------------------------------------------------------------------------ protein bead chains
  // a folded chain path: seeded smooth walk of n beads from (x, y), spacing `step`
  M.chainPath = function (seed, x, y, n, step, o = {}) {
    const r = api.rand('chain-' + seed), pts = [[x, y]]; let a = o.angle ?? 0, da = 0;
    for (let i = 1; i < n; i++) {
      da = da * 0.7 + (r() - 0.5) * (o.curl ?? 0.9); a += da;
      if (o.bounds) { const [bx0, by0, bx1, by1] = o.bounds, [px, py] = pts[i - 1]; const cxb = (bx0 + bx1) / 2, cyb = (by0 + by1) / 2; if (px < bx0 || px > bx1 || py < by0 || py > by1) { const ta = Math.atan2(cyb - py, cxb - px); a = a + Math.atan2(Math.sin(ta - a), Math.cos(ta - a)) * 0.35; } }
      pts.push([pts[i - 1][0] + Math.cos(a) * step, pts[i - 1][1] + Math.sin(a) * step]);
    }
    return pts;
  };
  const BEADS = [['#fff0f6', '#ffb3cf', '#b8577d'], ['#f4efff', '#c3b0ff', '#6e56b8'], ['#fff5ea', '#ffc9a0', '#b87342'], ['#eefcff', '#a9e6f5', '#4b8ea3'], ['#fdf8ef', '#efe2c4', '#a08b5c']];
  // pts: bead centres; o: r, sulfur (Set of indices), sGlow (0..1), t, wiggle (px), alpha, letters, show (0..1 draw-on), dim
  M.chain = function (ctx, pts, o = {}) {
    const r = o.r || 18, t = o.t || 0, wig = o.wiggle ?? r * 0.25, sulf = o.sulfur || new Set(), n = pts.length;
    const nz = o.seed != null ? o.seed : 3;
    const shown = Math.floor(n * clamp(o.show ?? 1));
    const P2 = pts.map(([x, y], i) => [x + Math.sin(t * 1.7 + i * 0.9 + nz) * wig, y + Math.cos(t * 1.3 + i * 1.1 + nz) * wig]);
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    for (let i = 1; i < shown; i++) stick(ctx, P2[i - 1][0], P2[i - 1][1], P2[i][0], P2[i][1], r * 0.34, ['#fff', '#d9d2e6', '#6d6480']);
    for (let i = 0; i < shown; i++) {
      if (o.skip && o.skip.has(i)) continue;
      const [x, y] = P2[i];
      if (sulf.has(i)) {
        const gl = o.sGlow || 0, sp = o.sulfurP == null ? 1 : clamp(o.sulfurP);
        if (sp < 1) { const c = BEADS[(i * 7 + nz) % BEADS.length]; ball(ctx, x, y, r, c[0], c[1], c[2], 'rgba(255,255,255,0.3)'); }
        if (sp <= 0) continue;
        ctx.save(); ctx.globalAlpha *= clamp(sp * 1.5); ctx.translate(x, y); const ps = 0.5 + 0.5 * api.ease.outBack(sp, 2.2); ctx.scale(ps, ps); ctx.translate(-x, -y);
        if (gl > 0) M.blob(ctx, 'sulfur', x, y, r * (2.2 + gl * 1.4), 0.55 * gl);
        const rr = r * (1.08 + 0.18 * gl);
        ball(ctx, x, y, rr, '#fffbd2', C.sulfur, '#9c8a00', 'rgba(255,255,200,0.5)');
        if (o.letters !== false && r >= 12) api.text(ctx, 'S', x, y + rr * 0.36, { size: rr * 1.0, weight: 700, color: 'rgba(70,55,0,0.85)', align: 'center' });
        ctx.restore();
      } else {
        const c = BEADS[(i * 7 + nz) % BEADS.length];
        const col = o.dim ? c.map((h) => mixHex(h, '#5a5566', o.dim)) : c;
        ball(ctx, x, y, r, col[0], col[1], col[2], 'rgba(255,255,255,0.3)');
      }
    }
    ctx.restore();
    return P2;
  };

  // ------------------------------------------------------------------------------------------------ gunk
  M.deadCell = function (ctx, x, y, s, rot = 0, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const r = api.rand('cell-' + (o.seed || 0)), n = 9, pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rr = s * (0.42 + r() * 0.14); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.62]); }
    ctx.beginPath(); ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    ctx.closePath();
    const g = ctx.createRadialGradient(-s * 0.15, -s * 0.12, 2, 0, 0, s * 0.55);
    g.addColorStop(0, 'rgba(255,240,236,0.95)'); g.addColorStop(1, 'rgba(236,190,186,0.85)');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(170,100,110,0.55)'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
    // fold line + nucleus
    ctx.strokeStyle = 'rgba(190,130,140,0.35)'; ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.12); ctx.quadraticCurveTo(0, s * 0.02, s * 0.28, s * 0.16); ctx.stroke();
    ctx.fillStyle = 'rgba(176,96,128,0.75)'; ctx.beginPath(); ctx.ellipse(s * 0.04, -s * 0.04, s * 0.09, s * 0.07, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  };
  M.mucus = function (ctx, x, y, s, t, o = {}) {
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const r = api.rand('muc-' + (o.seed || 0));
    ctx.strokeStyle = 'rgba(210,225,240,0.28)'; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const a = r() * TAU, L = s * (0.6 + r() * 0.5); ctx.lineWidth = s * (0.08 + r() * 0.06);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a + 0.6) * L * 0.5 + Math.sin(t + k) * 4, Math.sin(a + 0.6) * L * 0.5, Math.cos(a) * L, Math.sin(a) * L); ctx.stroke();
    }
    for (let k = 0; k < 4; k++) {
      const bx = (r() - 0.5) * s * 0.5, by = (r() - 0.5) * s * 0.35, br = s * (0.2 + r() * 0.16) * (1 + 0.04 * Math.sin(t * 2 + k));
      const g = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, 1, bx, by, br);
      g.addColorStop(0, 'rgba(245,250,255,0.55)'); g.addColorStop(0.7, 'rgba(190,210,230,0.22)'); g.addColorStop(1, 'rgba(190,210,230,0.35)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(bx - br * 0.35, by - br * 0.4, br * 0.22, br * 0.12, -0.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };
  M.crumb = function (ctx, x, y, s, rot = 0, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const r = api.rand('crumb-' + (o.seed || 0)), n = 7; ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rr = s * (0.35 + r() * 0.2); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath();
    const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); g.addColorStop(0, '#f1cf95'); g.addColorStop(1, '#9a6a3a');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,240,210,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  };

  // ------------------------------------------------------------------------------------------------ gas
  // a translucent cloud of soft blobs; grows with `a` (0..1)
  M.gas = function (ctx, x, y, r, t, a = 1, o = {}) {
    if (a <= 0) return;
    const rnd = api.rand('gas-' + (o.seed || 0)), n = o.n || 7, key = o.key || 'gas';
    for (let i = 0; i < n; i++) {
      const ox = (rnd() - 0.5) * r * 1.2 + Math.sin(t * 0.9 + i * 1.7) * r * 0.12, oy = (rnd() - 0.5) * r * 0.9 + Math.cos(t * 0.7 + i) * r * 0.1;
      M.blob(ctx, key, x + ox, y + oy, r * (0.45 + rnd() * 0.45), a * (o.alpha ?? 0.45));
    }
  };
  // hand-drawn wavy stink lines rising (p 0..1 draw-on)
  M.stink = function (ctx, x, y, h, t, p = 1, o = {}) {
    const n = o.n || 3, sp = o.spread || 34;
    for (let k = 0; k < n; k++) {
      const pts = [], x0 = x + (k - (n - 1) / 2) * sp;
      for (let i = 0; i <= 18; i++) { const u = i / 18; pts.push([x0 + Math.sin(u * 9 + t * 5 + k) * 9, y - u * h]); }
      api.doodle.stroke(ctx, pts, p, { color: o.color || C.gas, width: o.width || 6, seed: 50 + k, wobble: 1.5, alpha: o.alpha ?? 0.9 });
    }
  };

  // ------------------------------------------------------------------------------------------------ nano lipid droplet
  M.droplet = function (ctx, x, y, r, t, o = {}) {
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.halo !== false) M.blob(ctx, 'pink', 0, 0, r * 2.3, 0.22 * (o.haloA ?? 1));
    const sq = o.squash || 0; if (sq) { ctx.rotate(o.squashRot || 0); ctx.scale(1 - sq * 0.35, 1 + sq * 0.2); ctx.rotate(-(o.squashRot || 0)); }
    // clear body with a faint violet tint
    const bgm = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    bgm.addColorStop(0, 'rgba(255,245,235,0.10)'); bgm.addColorStop(0.8, 'rgba(210,190,255,0.16)'); bgm.addColorStop(1, 'rgba(240,230,255,0.35)');
    ctx.fillStyle = bgm; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    // golden oil core
    const g = ctx.createRadialGradient(-r * 0.12, -r * 0.14, r * 0.02, 0, 0, r * 0.62);
    g.addColorStop(0, 'rgba(255,248,220,0.95)'); g.addColorStop(0.45, 'rgba(255,214,120,0.62)'); g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, TAU); ctx.fill();
    // iridescent thin film at the rim (soap-bubble colours), fading inward
    const cg = ctx.createConicGradient((o.spin ?? t * 0.8), 0, 0);
    const cols = ['#ff7ad9', '#a78bfa', '#62f0e0', '#b9f58a', '#ffd43b', '#ff9f73', '#ff7ad9'];
    cols.forEach((c, i) => cg.addColorStop(i / (cols.length - 1), c));
    ctx.strokeStyle = cg;
    for (const [rr, ww, aa] of [[0.93, 0.14, 0.85], [0.81, 0.12, 0.35], [0.7, 0.1, 0.12]]) { ctx.globalAlpha *= aa; ctx.lineWidth = r * ww; ctx.beginPath(); ctx.arc(0, 0, r * rr, 0, TAU); ctx.stroke(); ctx.globalAlpha /= aa; }
    // shell of lipid heads
    if (r > 10 && o.shell !== false) {
      const n = Math.min(48, Math.max(14, Math.round(r * 0.9))), rot = t * 0.25 + (o.seed || 0);
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * TAU, hx = Math.cos(a) * r * 1.02, hy = Math.sin(a) * r * 1.02, hr = Math.max(1.2, Math.min(r * 0.075, (TAU * r / n) * 0.36));
        const bg = ctx.createRadialGradient(hx - hr * 0.3, hy - hr * 0.3, 0, hx, hy, hr);
        bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, 'rgba(210,190,255,0.85)');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
      }
    }
    // speculars
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.ellipse(-r * 0.36, -r * 0.42, r * 0.26, r * 0.14, -0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(r * 0.42, r * 0.38, r * 0.07, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.beginPath(); ctx.arc(0, 0, r * 0.98, 0.15 * Math.PI, 0.65 * Math.PI); ctx.stroke();
    ctx.restore();
  };

  // ------------------------------------------------------------------------------------------------ splash (water-balloon pop)
  // tt = seconds since the pop; o: { n, speed, color, shards (hex of the skin), seed, scale }
  M.splash = function (ctx, x, y, tt, o = {}) {
    if (tt < 0) return;
    const r = api.rand('splash-' + (o.seed || 0)), n = o.n || 34, sc = o.scale || 1;
    ctx.save(); ctx.translate(x, y);
    // flash, the water mass bursting outward, and a shock ring
    const fl = Math.max(0, 1 - tt / 0.2);
    if (fl > 0) M.blob(ctx, 'white', 0, 0, 150 * sc * (0.6 + tt * 3), 0.8 * fl);
    const wm = clamp(1 - tt / 0.35);
    if (wm > 0) M.blob(ctx, 'rinse', 0, 0, 120 * sc * (1 + tt * 3.5), 0.55 * wm);
    const ringP = clamp(tt / 0.6);
    if (ringP < 1) { ctx.strokeStyle = 'rgba(200,240,255,' + (0.75 * (1 - ringP)) + ')'; ctx.lineWidth = 7 * sc * (1 - ringP) + 1; ctx.beginPath(); ctx.arc(0, 0, sc * (50 + api.ease.outCubic(ringP) * 210), 0, TAU); ctx.stroke(); }
    // skin shards (curved pieces of the membrane)
    if (o.shards) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + r() * 0.6, sp = (260 + r() * 260) * sc, k = 4, d = sp * (1 - Math.exp(-k * tt)) / k, rad = (11 + r() * 9) * sc, spin = (r() - 0.5) * 9;
        const life = clamp(1 - (tt - 0.15) / 0.45); if (life <= 0) continue;
        ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d + 110 * sc * tt * tt); ctx.rotate(a + Math.PI + tt * spin); ctx.globalAlpha *= life;
        const sz = 0.55 + life * 0.45;
        ctx.strokeStyle = o.shards; ctx.lineWidth = 8 * sc * sz; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, rad, -0.75, 0.75); ctx.stroke();
        ctx.strokeStyle = 'rgba(230,200,255,0.55)'; ctx.lineWidth = 3 * sc * sz; ctx.beginPath(); ctx.arc(0, 0, rad - 2 * sc, -0.4, 0.3); ctx.stroke();
        ctx.restore();
      }
    }
    // droplets: many sizes and speeds, so they fill the burst instead of sitting on one ring
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, sp = (140 + Math.pow(r(), 0.8) * 820) * sc * (o.speed || 1), sz = (3 + Math.pow(r(), 2.2) * 12) * sc, k = 3.4, lag = r() * 0.05;
      const tl = Math.max(0, tt - lag), d = sp * (1 - Math.exp(-k * tl)) / k, g = 150 * sc * tl * tl;
      const px = Math.cos(a) * d, py = Math.sin(a) * d + g;
      const vx = Math.cos(a) * sp * Math.exp(-k * tl), vy = Math.sin(a) * sp * Math.exp(-k * tl) + 300 * sc * tl;
      const vel = Math.hypot(vx, vy), stretch = 1 + Math.min(1.1, vel / 520), ang = Math.atan2(vy, vx);
      const Lg = o.linger || 1, life = clamp(1 - (tt - (0.3 + r() * 0.35) * Lg) / (0.45 * Lg));
      if (life <= 0 || tl <= 0) continue;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.globalAlpha *= life;
      const gg = ctx.createRadialGradient(sz * 0.2, -sz * 0.3, 0, 0, 0, sz * stretch);
      gg.addColorStop(0, 'rgba(255,255,255,0.95)'); gg.addColorStop(0.55, o.color || 'rgba(160,220,255,0.85)'); gg.addColorStop(1, 'rgba(110,180,255,0.35)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(-sz * (stretch - 1) * 0.6, 0, sz * stretch, sz, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  // ------------------------------------------------------------------------------------------------ props
  // cracked egg: open 0..1 lifts the top shell
  M.egg = function (ctx, x, y, s, t, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const eggPath = () => { ctx.beginPath(); ctx.moveTo(0, -s * 0.62); ctx.bezierCurveTo(s * 0.42, -s * 0.62, s * 0.5, s * 0.1, s * 0.46, s * 0.26); ctx.bezierCurveTo(s * 0.4, s * 0.55, s * 0.2, s * 0.62, 0, s * 0.62); ctx.bezierCurveTo(-s * 0.2, s * 0.62, -s * 0.4, s * 0.55, -s * 0.46, s * 0.26); ctx.bezierCurveTo(-s * 0.5, s * 0.1, -s * 0.42, -s * 0.62, 0, -s * 0.62); ctx.closePath(); };
    const shade = () => { const g = ctx.createRadialGradient(-s * 0.16, -s * 0.2, s * 0.05, 0, 0, s * 0.7); g.addColorStop(0, '#fffdf6'); g.addColorStop(0.6, '#f1e9d6'); g.addColorStop(1, '#b8a88a'); return g; };
    const zig = []; for (let i = 0; i <= 8; i++) zig.push([-s * 0.52 + i * s * 0.13, -s * 0.12 + (i % 2 ? -s * 0.08 : s * 0.05)]);
    const open = o.open || 0;
    // bottom shell (below the crack)
    ctx.save(); ctx.beginPath(); ctx.moveTo(-s, s); ctx.lineTo(-s, zig[0][1]); for (const q of zig) ctx.lineTo(q[0], q[1]); ctx.lineTo(s, zig[8][1]); ctx.lineTo(s, s); ctx.closePath(); ctx.clip();
    eggPath(); ctx.fillStyle = shade(); ctx.fill();
    if (open > 0) { // dark inside rim
      ctx.fillStyle = `rgba(70,60,20,${0.7 * open})`; ctx.beginPath(); ctx.ellipse(0, -s * 0.12, s * 0.43, s * 0.07 * open + 1, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // top shell, lifted and tilted
    ctx.save(); ctx.translate(s * 0.08 * open, -s * 0.2 * open); ctx.rotate(0.35 * open);
    ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(-s, zig[0][1]); for (const q of zig) ctx.lineTo(q[0], q[1]); ctx.lineTo(s, zig[8][1]); ctx.lineTo(s, -s); ctx.closePath(); ctx.clip();
    eggPath(); ctx.fillStyle = shade(); ctx.fill();
    ctx.restore();
    // crack line
    ctx.strokeStyle = 'rgba(90,70,40,0.75)'; ctx.lineWidth = Math.max(1.5, s * 0.025); ctx.lineJoin = 'round';
    ctx.beginPath(); zig.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); if (open < 0.05) ctx.stroke();
    // greenish tint on the shell (rotten)
    if (o.rotten) { ctx.save(); eggPath(); ctx.clip(); M.blob(ctx, 'gas', s * 0.1, s * 0.25, s * 0.6, 0.25 * o.rotten); ctx.restore(); }
    ctx.restore();
  };
  M.mint = function (ctx, x, y, r, t, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const sc = o.scale ?? 1; ctx.scale(sc, sc);
    M.shadow(ctx, 0, r * 0.95, r * 0.9, 0.35);
    // side (thickness)
    ctx.fillStyle = '#b9c9d2'; ctx.beginPath(); ctx.ellipse(0, r * 0.12, r, r * 0.92, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#eef6f8'); g.addColorStop(1, '#c9dce3');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.92, 0, 0, TAU); ctx.fill();
    // pinwheel stripes (generic peppermint)
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.92, r * 0.85, 0, 0, TAU); ctx.clip();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + (o.spin || 0);
      ctx.fillStyle = o.stripe || 'rgba(64,196,200,0.75)'; ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a + 0.5) * r * 0.5, Math.sin(a + 0.5) * r * 0.5, Math.cos(a + 0.35) * r, Math.sin(a + 0.35) * r);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.quadraticCurveTo(Math.cos(a + 0.2) * r * 0.4, Math.sin(a + 0.2) * r * 0.4, 0, 0); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.22, r * 0.1, -0.6, 0, TAU); ctx.fill();
    // sugar crystals sparkle
    if (o.sugar) {
      const rn = api.rand('mintsugar');
      for (let i = 0; i < 26; i++) { const a = rn() * TAU, d = Math.sqrt(rn()) * r * 0.85; ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 5 + i)})`; ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, 3.5, 3.5); }
    }
    ctx.restore();
  };
  M.sugarCube = function (ctx, x, y, s, rot = 0, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const h = s / 2;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(h * 1.1, -h * 0.45); ctx.lineTo(0, h * 0.1); ctx.lineTo(-h * 1.1, -h * 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dfe6f0'; ctx.beginPath(); ctx.moveTo(-h * 1.1, -h * 0.45); ctx.lineTo(0, h * 0.1); ctx.lineTo(0, h * 1.25); ctx.lineTo(-h * 1.1, h * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b9c3d3'; ctx.beginPath(); ctx.moveTo(h * 1.1, -h * 0.45); ctx.lineTo(0, h * 0.1); ctx.lineTo(0, h * 1.25); ctx.lineTo(h * 1.1, h * 0.7); ctx.closePath(); ctx.fill();
    const rn = api.rand('cube' + (o.seed || 0)); ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 10; i++) ctx.fillRect((rn() - 0.5) * s, (rn() - 0.4) * s, 2.5, 2.5);
    ctx.restore();
  };

  // ------------------------------------------------------------------------------------------------ smell meter
  // v: 0 = fresh .. 1 = bad. Panel centred at (x, y), radius R.
  M.meter = function (ctx, x, y, R, v, o = {}) {
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha *= o.alpha; const sc = o.scale ?? 1; ctx.scale(sc, sc);
    // panel
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    const top = o.title ? -R * 1.62 : -R * 1.3, hh = R * 0.62 - top;
    api.roundRect(ctx, -R * 1.34, top, R * 2.68, hh, R * 0.18); ctx.fillStyle = 'rgba(20,16,40,0.9)'; ctx.fill(); ctx.restore();
    api.roundRect(ctx, -R * 1.34, top, R * 2.68, hh, R * 0.18); ctx.strokeStyle = 'rgba(167,139,250,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    // arc
    const w = R * 0.2, cg = ctx.createConicGradient(Math.PI, 0, 0);
    cg.addColorStop(0, '#8fd8ff'); cg.addColorStop(0.18, '#d7f34a'); cg.addColorStop(0.32, '#ffd43b'); cg.addColorStop(0.5, '#ff4d5a'); cg.addColorStop(1, '#ff4d5a');
    ctx.strokeStyle = cg; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, R, Math.PI + 0.04, TAU - 0.04); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R + w * 0.5 + 6, Math.PI, TAU); ctx.stroke();
    for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI, r0 = R - w * 0.5 - 8, r1 = r0 - (i % 5 ? 12 : 24); ctx.strokeStyle = 'rgba(244,241,234,0.5)'; ctx.lineWidth = i % 5 ? 2 : 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke(); }
    api.text(ctx, 'FRESH', -R, R * 0.3, { size: Math.max(34, R * 0.19), color: '#8fd8ff', align: 'center', tracking: 2 });
    api.text(ctx, 'BAD', R, R * 0.3, { size: Math.max(34, R * 0.19), color: '#ff4d5a', align: 'center', tracking: 2 });
    if (o.title) api.text(ctx, o.title, 0, -R * 1.34, { size: Math.max(34, R * 0.19), color: P.dim, align: 'center', tracking: 3 });
    // needle
    const a = Math.PI + clamp(v) * Math.PI;
    ctx.save(); ctx.rotate(a); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.moveTo(-R * 0.12, -R * 0.045); ctx.lineTo(R * 0.86, -R * 0.012); ctx.lineTo(R * 0.86, R * 0.012); ctx.lineTo(-R * 0.12, R * 0.045); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.arc(0, 0, R * 0.09, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b1830'; ctx.beginPath(); ctx.arc(0, 0, R * 0.04, 0, TAU); ctx.fill();
    ctx.restore();
  };

  // ------------------------------------------------------------------------------------------------ type helpers
  // white condensed tag with a dark outline, optional leader from (lx, ly)
  M.tag = function (ctx, str, x, y, p, o = {}) {
    if (p <= 0) return;
    const size = o.size || 40, k = api.ease.outBack(clamp(p), 1.6);
    if (o.leader) api.leader(ctx, o.leader[0], o.leader[1], lerp(o.leader[0], o.leader[2] ?? x, 1), lerp(o.leader[1], o.leader[3] ?? y, 1), clamp(p * 1.6), { color: o.leaderColor || 'rgba(244,241,234,0.85)', width: 3, dot: 6 });
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.globalAlpha *= clamp(p * 2);
    api.text(ctx, str, 0, 0, { size, weight: 700, color: o.color || P.ink, align: o.align || 'left', tracking: o.tracking ?? 2, stroke: 'rgba(10,8,22,0.85)', strokeWidth: size * 0.2, upper: o.upper !== false });
    ctx.restore();
  };
  // lime chip with pop
  M.chip = function (ctx, str, x, y, p, o = {}) { if (p <= 0) return; api.label(ctx, str, x, y, { size: o.size || 46, align: o.align || 'center', p, bg: o.bg, color: o.color, rotate: o.rotate, upper: o.upper }); };
  // word-by-word pop of a chip-less headline: words [[str, t]], returns nothing
  M.words = function (ctx, t, words, x, y, o = {}) {
    const size = o.size || 72, gap = size * (o.gap ?? 0.5);
    const ws = words.map(([s]) => api.measure(ctx, s, { size, weight: 700, tracking: o.tracking ?? 2 }));
    const total = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
    let cx = o.align === 'left' ? x : x - total / 2;
    words.forEach(([s, tw], i) => {
      const k0 = clamp((t - tw) / 0.4), p = k0 <= 0 ? 0 : api.ease.outBack(k0, 1.2);
      if (p > 0) {
        ctx.save(); ctx.translate(cx + ws[i] / 2, y); ctx.scale(p, p); ctx.globalAlpha *= clamp(p * 1.8);
        api.text(ctx, s, 0, 0, { size, weight: 700, color: (o.colors && o.colors[i]) || o.color || P.ink, align: 'center', tracking: o.tracking ?? 2, stroke: 'rgba(10,8,22,0.8)', strokeWidth: size * 0.14, glow: o.glow });
        ctx.restore();
      }
      cx += ws[i] + gap;
    });
    return total;
  };
  // ------------------------------------------------------------------------------------------------ premium helpers
  // pre-rendered, blurred crevice ("macro lens" depth of field) for the product scenes; draw with M.drawSnap
  M.snapshot = function (cam, o = {}) {
    const pad = 80, [c, g] = mk(W + pad * 2, H + pad * 2);
    g.translate(pad, pad); M.crevice(g, o.t ?? 0, cam, o); g.setTransform(1, 0, 0, 1, 0, 0);
    if (!o.blur) return { c, pad };
    const [c2, g2] = mk(W + pad * 2, H + pad * 2); g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.filter = `blur(${o.blur * SS}px)`; g2.drawImage(c, 0, 0); g2.filter = 'none';
    if (o.tint) { g2.fillStyle = o.tint; g2.fillRect(0, 0, c2.width, c2.height); }
    return { c: c2, pad };
  };
  M.drawSnap = function (ctx, snap, t, o = {}) {
    const z = (o.z0 ?? 1.0) + ((o.z1 ?? 1.04) - (o.z0 ?? 1.0)) * clamp(t / (o.dur || 10));
    ctx.save(); ctx.translate(960 + (o.dx || 0) * t, 540 + (o.dy || 0) * t); ctx.scale(z, z);
    ctx.drawImage(snap.c, -960 - snap.pad, -540 - snap.pad, W + snap.pad * 2, H + snap.pad * 2); ctx.restore();
  };
  // targeting reticle: circle drawn on + 4 ticks, slowly rotating. p 0..1
  M.reticle = function (ctx, x, y, r, p, t, o = {}) {
    if (p <= 0) return;
    const col = o.color || P.lime, rot = t * 0.8 + (o.seed || 0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= clamp(p * 2) * (o.alpha ?? 1);
    ctx.strokeStyle = col; ctx.lineWidth = o.width || 5; ctx.lineCap = 'round';
    if (o.glow !== false) { ctx.shadowColor = col; ctx.shadowBlur = 16; }
    const k = api.ease.outCubic(clamp(p)), rr = r * (1.35 - 0.35 * k);
    for (let i = 0; i < 4; i++) { const a0 = i * Math.PI / 2 + 0.22, a1 = a0 + (Math.PI / 2 - 0.44) * k; ctx.beginPath(); ctx.arc(0, 0, rr, a0, a1); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (rr - 14), Math.sin(a) * (rr - 14)); ctx.lineTo(Math.cos(a) * (rr + 16), Math.sin(a) * (rr + 16)); ctx.stroke(); }
    ctx.restore();
  };
  // a rinse sweeping left->right across a rect; front = x of the leading edge. o: color (hex), alpha, foam
  M.sweep = function (ctx, x0, y0, x1, y1, front, t, o = {}) {
    if (front <= x0) return;
    const col = o.color || '#ffd9a0', fx = Math.min(front, x1 + 200);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    ctx.beginPath(); ctx.moveTo(x0 - 10, y0 - 10);
    for (let y = y0 - 10; y <= y1 + 10; y += 20) ctx.lineTo(fx + Math.sin(y / 60 + t * 6) * 22 + Math.sin(y / 23 - t * 4) * 8, y);
    ctx.lineTo(x0 - 10, y1 + 10); ctx.closePath();
    const g = ctx.createLinearGradient(fx - 500, 0, fx, 0);
    g.addColorStop(0, rgba(col, (o.alpha ?? 0.16) * (o.tail ?? 0.5))); g.addColorStop(1, rgba(col, (o.alpha ?? 0.16) * 1.6));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = 5; ctx.stroke();
    const rnd = api.rand('sweep' + (o.seed || 0));
    for (let i = 0; i < 70; i++) {
      const by = y0 + rnd() * (y1 - y0), bx = fx - rnd() * 420 + Math.sin(t * 3 + i) * 6, br = 3 + rnd() * 9;
      if (bx < x0) continue;
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + rnd() * 0.35})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by - ((t * 40 + i * 13) % 60), br, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };
  // fading ghost trail behind a moving thing: pts = [[x,y], ...] newest last
  M.trail = function (ctx, pts, r, o = {}) {
    for (let i = 0; i < pts.length; i++) { const k = (i + 1) / pts.length; M.blob(ctx, o.key || 'pink', pts[i][0], pts[i][1], r * (0.6 + 0.6 * k), (o.alpha ?? 0.25) * k); }
  };
  // hand-drawn water balloon (bursting) doodle, drawn on with p
  M.balloonDoodle = function (ctx, x, y, s, p, o = {}) {
    const col = o.color || '#8fd8ff', pts = [];
    for (let i = 0; i <= 44; i++) { const a = -Math.PI / 2 + 0.42 + (i / 44) * (TAU - 0.84); pts.push([x + Math.cos(a) * s * 0.88, y + Math.sin(a) * s * (Math.sin(a) > 0 ? 1.08 : 1)]); }
    const dop = { color: col, width: 7, seed: o.seed ?? 11, wobble: 1.6 };
    api.doodle.stroke(ctx, pts, clamp(p / 0.5), dop);
    api.doodle.stroke(ctx, [[x - s * 0.13, y + s * 1.3], [x, y + s * 1.08], [x + s * 0.13, y + s * 1.3], [x - s * 0.13, y + s * 1.3]], clamp((p - 0.45) / 0.15), { ...dop, seed: 13 });
    api.doodle.stroke(ctx, [[x, y + s * 1.3], [x + s * 0.12, y + s * 1.6], [x - s * 0.05, y + s * 1.85]], clamp((p - 0.55) / 0.15), { ...dop, seed: 14, width: 5 });
    // water bursting out of the top
    const drops = [[-0.55, -1.55, 0.13], [0, -1.8, 0.16], [0.55, -1.55, 0.13], [-0.95, -1.2, 0.1], [0.95, -1.2, 0.1]];
    drops.forEach(([dx, dy, r], k) => { const q = clamp((p - 0.62 - k * 0.05) / 0.12); if (q <= 0) return; ctx.save(); ctx.globalAlpha *= q; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, r * s, r * s * 1.3, dx * 0.6, 0, TAU); ctx.fill(); ctx.restore(); });
    for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.5; api.doodle.stroke(ctx, [[x + Math.cos(a) * s * 1.02, y + Math.sin(a) * s * 1.02], [x + Math.cos(a) * s * 1.35, y + Math.sin(a) * s * 1.35]], clamp((p - 0.55 - k * 0.05) / 0.12), { ...dop, seed: 20 + k, width: 6 }); }
  };

  // soft out-of-focus light discs drifting (screen space), for the premium product scenes
  M.bokeh = function (ctx, t, o = {}) {
    const r = api.rand('bokeh-' + (o.seed || 0)), n = o.n || 26;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < n; i++) {
      const x0 = r() * 2100 - 90, y0 = r() * 1200 - 60, rad = 20 + r() * 70, sp = 6 + r() * 16, ph = r() * TAU, key = ['pink', 'lav', 'white', 'teal'][i % 4];
      const x = x0 + Math.sin(t * 0.25 + ph) * 40 + t * sp * 0.5, y = y0 - t * sp * 0.6 + Math.cos(t * 0.3 + ph) * 20;
      const a = (o.alpha ?? 0.12) * (0.6 + 0.4 * Math.sin(t * 0.7 + ph));
      ctx.globalAlpha = a; ctx.fillStyle = rgba(key === 'pink' ? '#ff9ec0' : key === 'lav' ? '#b9a4ff' : key === 'teal' ? '#62f0e0' : '#ffffff', 1);
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      ctx.globalAlpha = a * 1.4; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  };
  // little filled heart with a white rim (bacteria "love it down there")
  M.heart = function (ctx, x, y, s, o = {}) {
    if (s <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.beginPath(); ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 0.1, s * 0.22, -s * 0.62, -s * 0.02, -s * 0.5, -s * 0.32);
    ctx.bezierCurveTo(-s * 0.38, -s * 0.62, -s * 0.04, -s * 0.56, 0, -s * 0.28);
    ctx.bezierCurveTo(s * 0.04, -s * 0.56, s * 0.38, -s * 0.62, s * 0.5, -s * 0.32);
    ctx.bezierCurveTo(s * 0.62, -s * 0.02, s * 0.1, s * 0.22, 0, s * 0.35); ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = o.color || '#ff6fae'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1.5, s * 0.07); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-s * 0.26, -s * 0.3, s * 0.1, s * 0.06, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  };
  // a bacterium swimming along a path: returns {x, y, rot, arrived (0..1 squash progress)}
  M.swim = function (t, b) {
    const u = clamp((t - b.t0) / (b.t1 - b.t0)), k = api.ease.inOutSine(u);
    const x = lerp(b.sx, b.x, k) + Math.sin(u * Math.PI * 2 * (b.wig || 1.5) + (b.ph || 0)) * (b.amp ?? 40) * (1 - u);
    const y = lerp(b.sy, b.y, api.ease.inOutCubic(u));
    const dx = (b.x - b.sx) + Math.cos(u * Math.PI * 2 * (b.wig || 1.5) + (b.ph || 0)) * (b.amp ?? 40) * 6 * (1 - u), dy = (b.y - b.sy) * 1.2;
    let heading = Math.atan2(dy, dx); if (b.flip) heading = Math.PI - heading;
    const dA = Math.atan2(Math.sin(b.rot - heading), Math.cos(b.rot - heading));
    const rot = u < 1 ? heading + dA * api.ease.inCubic(clamp((u - 0.6) / 0.4)) : b.rot;
    const land = t > b.t1 ? 0.2 * Math.exp(-(t - b.t1) * 6) * Math.cos((t - b.t1) * 18) : 0;
    return { x, y, rot, u, squash: -land };
  };

  // the runtime's shared cinematic finish (bloom + vignette + grain) when available, so every group's graphics match
  M.finish = function (ctx, t, o = {}) {
    if (api.finish) return api.finish(ctx, t, { bloom: o.bloom, vignette: o.vignette ?? 0.45, grain: o.grain ?? 0.055 });
    api.vignette(ctx, o.vignette ?? 0.5); api.grain(ctx, t, o.grain ?? 0.055);
  };
  // smooth hash-noise wiggle helper
  M.wob = (t, seed, f = 1) => Math.sin(t * f * 1.3 + seed * 1.7) * 0.6 + Math.sin(t * f * 2.1 + seed * 3.1) * 0.4;

  window.MICRO = M;
})();
