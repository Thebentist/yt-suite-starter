// @use videos/bad-breath-for-good/scenes/tongue/_lib.js
/* carpet-gunk (w991-1045). Split screen, two cut-away "dioramas" seen from a low angle: a real shag carpet (left) and
 * the back-of-tongue papillae (right), each a slab with its cut face toward us so the gaps between the strands show.
 * Crumbs, gunk and specks fall in and get stuck; then the carpet slides away, the papillae fill the frame, FOOD /
 * MUCUS / DEAD CELLS land on their words, and a saliva wave washes over the tops but never down between the strands.
 * Words (scene s, cut of 21:58): shag 1.45, carpet 1.63 | food 2.44, gunk 2.81, particles 3.16 | stuck 4.54, in between 4.93-5.19,
 * filaments 6.72 | not only just food 7.63-8.13 | mucus 9.15 | dead cells 9.41-9.63 | cheek and tongue 10.34-10.98 |
 * spit 11.71, can't 11.85, down there 13.25-13.38, wash it all out either 13.84-14.53. Cut at 15.02 (micro: anaerobes). */
const CG = { camY: 3.4, pitch: 0.24, camZ: -5.35, f: 900, cy: 560 };
const CUT = TONGUE.cut('carpet-gunk', 15.92);   // cues follow their words in the current cut (see cues.json)
defineScene({
  name: 'carpet-gunk', duration: CUT.duration,
  setup(api) {
    const { lerp } = api;
    this.SP = PILE.sprites(api, {
      sw: 64, aspects: [5, 8.5, 12], fog: '#6a3556', blurs: [4, 9],
      colors: [
        { light: '#ffc6d2', mid: '#f08aa0', dark: '#b8486a', dark2: '#74203f', ao: '#2c0716', tip: '#ffe8ec', tipA: 0.55, rim: '#ffd9e2', spec: 0.6 },
        { light: '#ffd2dc', mid: '#f49cb1', dark: '#c25879', dark2: '#7e2848', ao: '#2c0716', tip: '#fff4f4', tipA: 0.72, rim: '#ffe4ea', spec: 0.65 },
        { light: '#f7aabd', mid: '#e2728e', dark: '#a63c5e', dark2: '#661a39', ao: '#240512', tip: '#ffdbe2', tipA: 0.42, rim: '#ffc9d6', spec: 0.5 },
      ],
    });
    this.SC = PILE.sprites(api, {
      sw: 72, aspects: [4, 6.5, 9], fog: '#3a2618', blurs: [4, 9], yarn: true, fuzz: true, taper: 0.7,
      colors: [
        { light: '#ffd98a', mid: '#e7a53f', dark: '#a8641c', dark2: '#6a3a10', ao: '#1e1006', tip: '#ffe9b8', tipA: 0.4, rim: '#ffe2a6', spec: 0.3, ply: 'rgba(90,45,10,0.35)' },
        { light: '#ffc27a', mid: '#df8a33', dark: '#9c5217', dark2: '#5e300c', ao: '#1e1006', tip: '#ffdca8', tipA: 0.35, rim: '#ffd09a', spec: 0.25, ply: 'rgba(90,40,10,0.35)' },
        { light: '#f5e0a0', mid: '#cfa54e', dark: '#8d6a24', dark2: '#574012', ao: '#1e1006', tip: '#fff0c4', tipA: 0.4, rim: '#fff0c4', spec: 0.25, ply: 'rgba(80,55,15,0.35)' },
      ],
    });
    this.FP = PILE.field(api, { seed: 'cg-pap2', x0: -18, x1: 18, z0: 0, z1: 24, spacing: 0.7, nColors: 3,
      height: (x, z, r) => 2.2 + 0.8 * r, width: (x, z, r) => 0.26 * (0.85 + 0.3 * ((r * 5.3) % 1)) });
    this.FC = PILE.field(api, { seed: 'cg-carpet2', x0: -14, x1: 14, z0: 0, z1: 22, spacing: 0.86, nColors: 3,
      height: (x, z, r) => 2.3 + 0.7 * r, width: (x, z, r) => 0.44 * (0.85 + 0.3 * ((r * 3.7) % 1)) });
    const R = api.rand('cg-debris2');
    const mk = (kind, t0, n, xs, o = {}) => { const out = []; for (let i = 0; i < n; i++) {
      const caught = R() < (o.caught ?? 0.25);
      out.push({ kind, x: (R() * 2 - 1) * xs, z: lerp(0.3, o.zMax || 9, Math.pow(R(), 1.6)), rest: caught ? 1.1 + R() * 1.2 : 0.1 + R() * 0.3, caught,
        t0: t0 + R() * (o.spread ?? 0.9), dur: 0.8 + R() * 0.5, s: 0.75 + R() * 0.7, rot: R() * 6.28, spin: (R() - 0.5) * 4, seed: Math.floor(R() * 1e6), c: R() }); } return out; };
    this.debris = {
      pap: [...mk('crumb', 2.3, 30, 8), ...mk('gunk', 2.7, 16, 8), ...mk('speck', 3.05, 44, 8, { caught: 0.4 })],
      carpet: [...mk('crumb', 2.35, 26, 6), ...mk('gunk', 2.75, 12, 6), ...mk('speck', 3.1, 36, 6, { caught: 0.4 })],
      mucus: mk('mucus', 8.55, 12, 8, { caught: 0, spread: 0.7, zMax: 7 }),
      cells: mk('cell', 9.05, 22, 8, { caught: 0.3, spread: 1.4, zMax: 8 }),
    };
    for (const m of this.debris.mucus) m.rest = 0.25 + R() * 0.8;
    // the three labelled examples, placed and timed on purpose (near the front, well inside the frame)
    this.pick = {
      crumb: { kind: 'crumb', x: -2.5, z: 0.25, rest: 0.25, caught: false, t0: 2.35, dur: 0.85, s: 1.35, rot: 0.4, spin: 1.2, seed: 11, c: 0.3 },
      mucus: { kind: 'mucus', x: 0.3, z: 0.3, rest: 0.75, caught: false, t0: 8.7, dur: 0.01, s: 1.4, rot: 0, spin: 0, seed: 12, c: 0.5 },
      cell: { kind: 'cell', x: 2.9, z: 0.2, rest: 0.4, caught: false, t0: 8.95, dur: 0.45, s: 1.5, rot: 0.2, spin: 0.6, seed: 13, c: 0.5 },
    };
    this.debris.pap.push(this.pick.crumb); this.debris.mucus.push(this.pick.mucus); this.debris.cells.push(this.pick.cell);
  },
  cam(t, cx, panel) {
    return PILE.makeCam({ x: t * 0.05 + (panel === 'c' ? 0.3 : 0), y: CG.camY, z: CG.camZ + t * 0.025, pitch: CG.pitch, f: CG.f, cx, cy: CG.cy });
  },
  draw(ctx, t, api) {
    t = CUT.warp(t);
    const { P, clamp, lerp, ease, prog, pop, env } = api, ss = TONGUE.sstep;
    api.stage(ctx, { grid: false, c1: '#1a1024', c2: '#0b0a18' });
    const sp = ease.inOutCubic(clamp((t - 7.15) / 0.8));
    const inL = ease.outCubic(clamp(t / 0.6)), inR = ease.outCubic(clamp((t - 0.08) / 0.6));
    const divX = lerp(960, -8, sp);
    // ---- carpet (left)
    if (divX > 0) {
      const clipL = [0, 0, divX, 1080], camC = this.cam(t, 480 - sp * 480 - (1 - inL) * 300, 'c');
      ctx.save(); ctx.beginPath(); ctx.rect(...clipL); ctx.clip();
      PILE.backdrop(ctx, camC, { clip: clipL, ground: '#2a170b', fog: '#3a2618', fogNear: 6, fogFar: 22, fogMax: 0.95, sky: ['#110b0c', '#3a2618'], glow: { h: 70, a: 0.5 } });
      this.slab(ctx, camC, clipL, 'carpet', t);
      PILE.render(ctx, this.FC, this.SC, camC, { t, near: 3, far: 28, fog: '#3a2618', fogNear: 6, fogFar: 22, fogMax: 0.95, clip: clipL,
        sway: (x, z, ph, tt) => [0.06 * Math.sin(0.4 * x + 0.3 * z - 1.1 * tt + ph * 0.3), 0.04 * Math.sin(0.33 * z - 0.9 * tt + ph)],
        extras: this.extras(this.debris.carpet, t), alpha: 1 });
      ctx.restore();
    }
    // ---- papillae (right, then full frame)
    const x0 = Math.max(0, divX), clipR = [x0, 0, 1920 - x0, 1080];
    const camP = this.cam(t, lerp(1440, 960, sp) + (1 - inR) * 300, 'p');
    ctx.save(); ctx.beginPath(); ctx.rect(...clipR); ctx.clip();
    PILE.backdrop(ctx, camP, { clip: clipR, ground: '#3a0b20', fog: '#6a3556', fogNear: 6, fogFar: 24, fogMax: 0.95, sky: ['#120a18', '#6a3556'], glow: { h: 70, a: 0.5 } });
    this.slab(ctx, camP, clipR, 'pap', t);
    PILE.render(ctx, this.FP, this.SP, camP, { t, near: 3, far: 30, fog: '#6a3556', fogNear: 6, fogFar: 24, fogMax: 0.95, clip: clipR,
      sway: (x, z, ph, tt) => [0.08 * Math.sin(0.5 * x + 0.34 * z - 1.6 * tt + ph * 0.3) + this.waveTilt(x, z, tt), 0.05 * Math.sin(0.36 * z - 1.3 * tt + ph)],
      extras: this.extras([...this.debris.pap, ...this.debris.mucus, ...this.debris.cells], t), alpha: 1 });
    this.drawWave(ctx, api, t, camP);
    ctx.restore();
    if (divX > 0 && divX < 1920) { ctx.save(); ctx.fillStyle = 'rgba(11,10,24,0.95)'; ctx.fillRect(divX - 5, 0, 10, 1080); ctx.fillStyle = 'rgba(244,241,234,0.3)'; ctx.fillRect(divX - 1, 0, 2, 1080); ctx.restore(); }

    // ---- labels
    const lo = 1 - prog(t, 7.0, 0.35, ease.inCubic);
    if (lo > 0) {
      ctx.save(); ctx.globalAlpha = lo;
      api.text(ctx, 'SHAG CARPET', 480, 170, { size: 66, align: 'center', alpha: prog(t, 1.4, 0.4), shadow: true, tracking: 2, color: '#ffe2a6' });
      api.text(ctx, 'YOUR TONGUE', 1440, 170, { size: 66, align: 'center', alpha: prog(t, 1.62, 0.4), shadow: true, tracking: 2, color: '#ffc6d2' });
      api.doodle.text(ctx, 'stuck!', 250, 1000, prog(t, 4.45, 0.6), { color: P.lime, size: 64, rotate: -0.05, stroke: 'rgba(11,10,24,0.6)', strokeWidth: 9 });
      api.doodle.text(ctx, 'stuck!', 1210, 1000, prog(t, 4.6, 0.6), { color: P.lime, size: 64, rotate: -0.05, stroke: 'rgba(11,10,24,0.6)', strokeWidth: 9 });
      api.doodle.arrow(ctx, 330, 935, 385, 845, prog(t, 4.75, 0.5, ease.inOutCubic), { color: P.lime, width: 7, bend: -20, seed: 8, head: 24 });
      api.doodle.arrow(ctx, 1290, 935, 1345, 845, prog(t, 4.9, 0.5, ease.inOutCubic), { color: P.lime, width: 7, bend: -20, seed: 9, head: 24 });
      ctx.restore();
    }
    const chip = (key, word, tt, lx, ly, bg) => {
      const d = this.pick[key], pp = pop(t, tt, 0.5); if (pp <= 0) return;
      const fade = 1 - prog(t, 10.85, 0.4, ease.inCubic); if (fade <= 0) return;
      const pos = this.worldPos(d, t), q = PILE.project(camP, pos[0], pos[1] + 0.15, pos[2]);
      ctx.save(); ctx.globalAlpha = fade;
      const rr = 34 + 8 * Math.sin((t - tt) * 6), ra = env(t, tt - 0.05, 10.9, 0.25, 0.3);
      ctx.save(); ctx.globalAlpha *= ra; ctx.strokeStyle = bg || P.lime; ctx.lineWidth = 4; ctx.shadowColor = bg || P.lime; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(q[0], q[1], rr, 0, 6.2832); ctx.stroke(); ctx.restore();
      api.leader(ctx, q[0], q[1] - rr, lx, ly + 34, prog(t, tt - 0.1, 0.35), { color: bg || P.lime, width: 3, dot: 0.01 });
      api.label(ctx, word, lx, ly, { size: 52, p: pp, align: 'center', bg });
      ctx.restore();
    };
    chip('crumb', 'FOOD', 8.1, 520, 170);
    chip('mucus', 'MUCUS', 9.1, 960, 170, '#eef0b8');
    chip('cell', 'DEAD CELLS', 9.4, 1420, 170, P.ink);
    const cr = pop(t, 13.2, 0.55);
    if (cr > 0) api.label(ctx, "SPIT CAN'T REACH", 960, 150, { size: 64, p: cr, align: 'center', bg: P.saliva });
    api.vignette(ctx, 0.5);
    api.grain(ctx, t, 0.06);
  },
  // the cut face of the slab below the front row: tongue tissue (pap) or carpet backing (carpet)
  slab(ctx, cam, clip, kind, t) {
    const [X, , Wc] = clip, pts = [];
    for (let k = 0; k <= 24; k++) { const sx = X + (Wc * k) / 24; const q = PILE.project(cam, cam.x + ((sx - cam.cx) / cam.f) * 6, 0, 0); pts.push([sx, q[1]]); }
    const y0 = PILE.project(cam, cam.x, 0, 0)[1];
    ctx.save();
    ctx.beginPath(); ctx.moveTo(X, y0); ctx.lineTo(X + Wc, y0); ctx.lineTo(X + Wc, 1080); ctx.lineTo(X, 1080); ctx.closePath();
    const g = ctx.createLinearGradient(0, y0, 0, 1080);
    if (kind === 'pap') { g.addColorStop(0, '#c2506e'); g.addColorStop(0.08, '#9a3354'); g.addColorStop(1, '#3a0a1e'); }
    else { g.addColorStop(0, '#6e4a26'); g.addColorStop(0.1, '#4e3219'); g.addColorStop(1, '#1f1309'); }
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    if (kind === 'pap') {   // muscle-fibre texture of the cut face
      ctx.strokeStyle = 'rgba(255,170,190,0.08)'; ctx.lineWidth = 3;
      for (let k = 0; k < 14; k++) { const yy = y0 + 20 + k * 22; ctx.beginPath(); for (let x = X; x <= X + Wc; x += 40) { const y = yy + Math.sin(x * 0.01 + k) * 5; x === X ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    } else {                 // woven backing grid
      ctx.strokeStyle = 'rgba(255,220,160,0.08)'; ctx.lineWidth = 2;
      for (let x = X - 20; x <= X + Wc; x += 18) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, 1080); ctx.stroke(); }
      for (let y = y0; y <= 1080; y += 18) { ctx.beginPath(); ctx.moveTo(X, y); ctx.lineTo(X + Wc, y); ctx.stroke(); }
    }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = kind === 'pap' ? 'rgba(255,190,205,0.55)' : 'rgba(255,220,160,0.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X, y0 + 1); ctx.lineTo(X + Wc, y0 + 1); ctx.stroke(); ctx.restore();
  },
  waveFront(t) { return TONGUE.lerp(-12, 14, TONGUE.clamp((t - 11.4) / 2.4)); },
  waveTilt(x, z, t) { if (t < 11.35 || t > 14.8) return 0; const dx = x - this.waveFront(t); return 0.25 * Math.exp(-dx * dx / 5) * Math.min(1, (14.8 - t) / 0.8); },
  worldPos(d, t) {
    const k = TONGUE.clamp((t - d.t0) / Math.max(0.01, d.dur)), fall = k * k;
    let y = d.kind === 'mucus' ? d.rest : TONGUE.lerp(8.5, d.rest, fall), x = d.x, z = d.z;
    if (k >= 1 && d.kind !== 'mucus') { const b = t - d.t0 - d.dur; y = d.rest + Math.abs(Math.sin(b * 9)) * 0.12 * Math.exp(-b * 6); }
    if (d.caught && t > 11.35) { const f = this.waveFront(t); if (x < f) { const g = (f - x) * 0.6; x += g * 2.2; y += Math.min(1.2, g * 0.2); } }   // loose bits on the tips wash away
    return [x, y, z];
  },
  extras(list, t) {
    const out = [];
    for (const d of list) {
      if (t < d.t0 - 0.02) continue;
      const [x, y, z] = this.worldPos(d, t); if (x > 20) continue;
      const k = TONGUE.clamp((t - d.t0) / Math.max(0.01, d.dur)), rot = d.rot + d.spin * Math.min(1, k) * 1.5;
      out.push({ x, y, z, draw: (g, sx, sy, sc, dd) => drawDebris(g, d, sx, sy, sc, rot, t, dd) });
    }
    return out;
  },
  // saliva: a translucent slab of liquid over the tops (world y 1.55..3.25), its front face at the front row,
  // sweeping in from the left; it never reaches the gunk at the base
  drawWave(ctx, api, t, cam) {
    if (t < 11.3) return;
    const a = TONGUE.sstep(11.3, 11.65, t) * (1 - TONGUE.sstep(14.55, 15.02, t));
    if (a <= 0) return;
    const fxw = this.waveFront(t), yT = 3.25, yB = 1.55, zF = -0.2, zB = 26;
    const P2 = (x, y, z) => PILE.project(cam, x, y, z);
    const xL = cam.x - 16, wob = (x, k) => Math.sin(x * 1.3 + t * 3 + k) * 0.12 + Math.sin(x * 2.9 - t * 4.2 + k) * 0.05;
    ctx.save(); ctx.globalAlpha = a;
    // top surface
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) { const x = TONGUE.lerp(xL, fxw, i / 30), q = P2(x, yT + wob(x, 0), zF); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
    for (let i = 30; i >= 0; i--) { const x = TONGUE.lerp(xL, fxw + 3, i / 30), q = P2(x, yT, zB); ctx.lineTo(q[0], q[1]); }
    ctx.closePath();
    let g = ctx.createLinearGradient(0, P2(0, yT, zB)[1], 0, P2(0, yT, zF)[1]); g.addColorStop(0, 'rgba(120,200,255,0.0)'); g.addColorStop(1, 'rgba(130,205,255,0.2)');
    ctx.fillStyle = g; ctx.fill();
    // front face
    const top = [], bot = [];
    for (let i = 0; i <= 90; i++) { const x = TONGUE.lerp(xL, fxw, i / 90); top.push(P2(x, yT + wob(x, 0), zF)); bot.push(P2(x, yB + wob(x, 2) * 1.6, zF)); }
    const fr = P2(fxw + 0.6, (yT + yB) / 2, zF);
    ctx.beginPath(); top.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.quadraticCurveTo(fr[0] + 30, fr[1] - 40, fr[0], fr[1]); ctx.quadraticCurveTo(fr[0] - 10, fr[1] + 40, bot[90][0], bot[90][1]);
    for (let i = 90; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath();
    g = ctx.createLinearGradient(0, top[0][1], 0, bot[0][1]); g.addColorStop(0, 'rgba(150,215,255,0.42)'); g.addColorStop(1, 'rgba(100,185,250,0.3)');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'screen';
    for (let k = 0; k < 46; k++) { const u = ((k * 0.618 + t * 0.35) % 1), x = TONGUE.lerp(xL, fxw, u), yy = TONGUE.lerp(yB + 0.1, yT - 0.1, (k * 0.377) % 1) + ((t * 0.5 + k * 0.13) % 0.4), q = P2(x, yy, zF), r = 3 + (k % 4) * 2;
      ctx.strokeStyle = 'rgba(230,248,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 6.2832); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(225,246,255,0.95)'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath(); top.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,238,255,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); bot.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
    // the lowest reach, dashed, and red arrows down to the gunk it can't reach ("down there" 13.1)
    const dl = TONGUE.sstep(13.05, 13.4, t);
    if (dl > 0) {
      const l0 = P2(cam.x - 12, yB - 0.25, zF), l1 = P2(cam.x + 12, yB - 0.25, zF);
      ctx.globalAlpha = a * dl; ctx.setLineDash([18, 12]); ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(Math.max(60, l0[0]), l0[1]); ctx.lineTo(Math.min(1860, l1[0]), l1[1]); ctx.stroke(); ctx.setLineDash([]);
      const b0 = P2(cam.x, 0.3, 0.6)[1];
      for (const [ax, sd] of [[560, 3], [1380, 4]]) api.doodle.arrow(ctx, ax, l0[1] - 40, ax + 30, b0 - 10, TONGUE.sstep(13.3, 13.85, t), { color: api.P.marker, width: 8, bend: 22, seed: sd, head: 26 });
    }
    ctx.restore();
  },
});

// debris sprites at screen (sx, sy); sc = px per world unit at that depth
function drawDebris(g, d, sx, sy, sc, rot, t, dd) {
  const s = sc * d.s * 0.22, R = mulberryLocal(d.seed);
  if (s < 0.6) return;
  g.save(); g.translate(sx, sy); g.rotate(rot);
  if (d.kind === 'crumb') {
    const n = 6 + Math.floor(R() * 3), pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832, r = s * (0.6 + R() * 0.5); pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.8]); }
    const green = d.c < 0.12, base = green ? ['#8cc255', '#3f6b22'] : d.c < 0.55 ? ['#f0c67e', '#a0702f'] : ['#d69a55', '#734a21'];
    const gr = g.createLinearGradient(-s, -s, s, s); gr.addColorStop(0, base[0]); gr.addColorStop(1, base[1]);
    g.fillStyle = 'rgba(20,6,10,0.45)'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0] + s * 0.18, p[1] + s * 0.22) : g.moveTo(p[0] + s * 0.18, p[1] + s * 0.22))); g.closePath(); g.fill();
    g.fillStyle = gr; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,245,220,0.5)'; g.beginPath(); g.ellipse(-s * 0.25, -s * 0.25, s * 0.3, s * 0.14, -0.4, 0, 6.2832); g.fill();
    if (!green) { g.fillStyle = 'rgba(90,55,20,0.5)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc((R() - 0.5) * s, (R() - 0.5) * s * 0.7, s * 0.08, 0, 6.2832); g.fill(); } }
  } else if (d.kind === 'gunk') {
    const gr = g.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s * 1.1); gr.addColorStop(0, '#f8f0b8'); gr.addColorStop(0.6, '#d3c46e'); gr.addColorStop(1, '#8f8238');
    g.fillStyle = gr; g.beginPath();
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * 6.2832, r = s * (0.8 + 0.25 * Math.sin(a * 3 + d.seed)); i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.72) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.72); }
    g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-s * 0.3, -s * 0.25, s * 0.22, s * 0.1, -0.4, 0, 6.2832); g.fill();
  } else if (d.kind === 'speck') {
    g.fillStyle = d.c < 0.5 ? 'rgba(245,238,226,0.95)' : 'rgba(210,198,176,0.95)'; g.beginPath(); g.arc(0, 0, s * 0.32, 0, 6.2832); g.fill();
  } else if (d.kind === 'mucus') {
    const grow = TONGUE.sstep(d.t0, d.t0 + 0.55, t), s2 = s * 1.3 * grow; if (s2 < 0.5) { g.restore(); return; }
    g.rotate(-rot);
    g.strokeStyle = 'rgba(232,238,186,0.65)'; g.lineWidth = Math.max(1.2, s2 * 0.12); g.lineCap = 'round';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * s2 * 0.9, -s2 * 0.1); g.quadraticCurveTo(sd * s2 * 1.9, s2 * (0.5 + 0.1 * Math.sin(t * 2 + sd)), sd * s2 * 2.7, -s2 * (0.6 + 0.3 * (d.c > 0.5 ? 1 : 0))); g.stroke(); }
    const gr = g.createRadialGradient(-s2 * 0.3, -s2 * 0.35, s2 * 0.1, 0, 0, s2 * 1.2); gr.addColorStop(0, 'rgba(252,252,225,0.92)'); gr.addColorStop(0.55, 'rgba(222,232,166,0.75)'); gr.addColorStop(1, 'rgba(180,200,118,0.5)');
    g.fillStyle = gr; g.beginPath();
    for (let i = 0; i <= 16; i++) { const a2 = (i / 16) * 6.2832, r = s2 * (1 + 0.12 * Math.sin(a2 * 3 + d.seed + t * 1.5)); const y = Math.sin(a2) * r * 0.62 + (Math.sin(a2) > 0.6 ? s2 * 0.35 * (Math.sin(a2) - 0.6) * 2.5 : 0); i ? g.lineTo(Math.cos(a2) * r, y) : g.moveTo(Math.cos(a2) * r, y); }
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,240,0.75)'; g.beginPath(); g.ellipse(-s2 * 0.35, -s2 * 0.25, s2 * 0.28, s2 * 0.1, -0.3, 0, 6.2832); g.fill();
  } else if (d.kind === 'cell') {
    const s2 = s * 1.5, n = 6, pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832 + 0.3, r = s2 * (0.8 + R() * 0.3); pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.5]); }
    g.fillStyle = 'rgba(40,10,20,0.3)'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + s2 * 0.15) : g.moveTo(p[0], p[1] + s2 * 0.15))); g.closePath(); g.fill();
    const gr = g.createLinearGradient(0, -s2 * 0.5, 0, s2 * 0.5); gr.addColorStop(0, 'rgba(255,240,240,0.97)'); gr.addColorStop(1, 'rgba(236,200,208,0.93)');
    g.fillStyle = gr; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(190,120,140,0.75)'; g.lineWidth = Math.max(1, s2 * 0.06); g.stroke();
    g.fillStyle = 'rgba(150,80,120,0.85)'; g.beginPath(); g.ellipse(s2 * 0.05, 0, s2 * 0.17, s2 * 0.09, 0, 0, 6.2832); g.fill();
  }
  g.restore();
}
function mulberryLocal(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
