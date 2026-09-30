// @use videos/bad-breath-for-good/scenes/story/_lib.js
// nose-adapt-v1: the phase-1 (v4b) illustrated look, restored at Ben's request, timed with anchor/anchorEnd + api.at.
// Words 539-574 "So first off, the reason that you can't smell your own bad breath is because, well, your nose gets used to smells around you
// that are frequent. It kind of just stops noticing it all together."  Starts 1.2 s after w529 (the title's hold), ends where face-breath starts.
defineScene({
  name: 'nose-adapt-v1',
  anchor: { word: 529, edge: 'end', offset: 1.2 },
  anchorEnd: { word: 575, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    const S = STORY.init(api);
    this.HX = 440; this.HY = 400; this.HS = 560;
    const u = (x, y) => [this.HX + x * this.HS, this.HY + y * this.HS];
    this.u = u;
    // stream path (outside -> nostril -> roof)
    this.path = [[2050, 860], [1600, 790], [1250, 700], [1000, 610], ...[[0.71, 0.285], [0.62, 0.2], [0.52, 0.06], [0.42, -0.06], [0.33, -0.14]].map(([x, y]) => u(x, y))];
    this.cells = Array.from({ length: 9 }, (_, i) => { const k = i / 8, [x, y] = u(0.16 + k * 0.33, -0.175 + Math.sin(k * Math.PI) * -0.018); return { x, y }; });
    // pre-render the head with the cut-away (static)
    const c = document.createElement('canvas'); c.width = 3840; c.height = 2160; const g = c.getContext('2d'); g.scale(2, 2);
    const { HX, HY, HS } = this;
    const shifted = { beginPath: () => g.beginPath(), moveTo: (...a) => g.moveTo(HX + a[0], HY + a[1]), lineTo: (...a) => g.lineTo(HX + a[0], HY + a[1]), bezierCurveTo: (...a) => g.bezierCurveTo(HX + a[0], HY + a[1], HX + a[2], HY + a[3], HX + a[4], HY + a[5]), quadraticCurveTo: (...a) => g.quadraticCurveTo(HX + a[0], HY + a[1], HX + a[2], HY + a[3]), closePath: () => g.closePath() };
    S.profile(g, HX, HY, HS, { body: false, skin: S.SKIN[1], hair: '#2b1d24', rimColor: '#ffc9a8' });
    const win = (h) => { const [x0, y0] = u(-0.02, -0.35), [x1, y1] = u(1.2, 0.375); h.beginPath(); h.moveTo(x0 + 40, y0); h.quadraticCurveTo((x0 + x1) / 2, y0 - 18, x1, y0 + 10); h.lineTo(x1, y1); h.quadraticCurveTo((x0 + x1) / 2, y1 + 16, x0 + 40, y1); h.quadraticCurveTo(x0 - 10, (y0 + y1) / 2, x0 + 40, y0); h.closePath(); };
    g.save(); S.profilePath(shifted, HS, 0);
    g.clip(); win(g); g.clip();
    const tg = g.createRadialGradient(...u(0.4, 0.0), 20, ...u(0.37, 0), 0.5 * HS); tg.addColorStop(0, '#f7b0bd'); tg.addColorStop(0.7, '#e2808f'); tg.addColorStop(1, '#b85068');
    g.fillStyle = tg; g.fillRect(0, 0, 1920, 1080);
    const ts = api.rand('tissue'); g.fillStyle = 'rgba(255,225,232,0.18)'; for (let i = 0; i < 260; i++) { g.beginPath(); g.arc(...u(-0.02 + ts() * 0.8, -0.35 + ts() * 0.72), 2 + ts() * 5, 0, Math.PI * 2); g.fill(); }
    const ish = g.createLinearGradient(0, u(0, -0.35)[1], 0, u(0, -0.25)[1]); ish.addColorStop(0, 'rgba(90,20,50,0.5)'); ish.addColorStop(1, 'rgba(90,20,50,0)'); g.fillStyle = ish; g.fillRect(0, 0, 1920, 1080);
    // bone plate + olfactory bulb above the roof
    const plate = [u(0.1, -0.215), u(0.53, -0.2)];
    g.strokeStyle = '#f3e7cf'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(...plate[0]); g.quadraticCurveTo(...u(0.33, -0.24), ...plate[1]); g.stroke();
    g.fillStyle = '#e8cfa0'; g.beginPath(); g.ellipse(...u(0.31, -0.29), 0.2 * HS, 0.045 * HS, -0.02, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(160,110,60,0.5)'; g.lineWidth = 3; g.beginPath(); g.ellipse(...u(0.31, -0.29), 0.2 * HS, 0.045 * HS, -0.02, 0, Math.PI * 2); g.stroke();
    // nasal cavity
    const cav = [[0.715, 0.29], [0.6, 0.315], [0.3, 0.305], [0.08, 0.265], [0.0, 0.12], [0.04, -0.05], [0.16, -0.165], [0.36, -0.19], [0.52, -0.14], [0.6, -0.02], [0.67, 0.12], [0.735, 0.235]].map(([x, y]) => u(x, y));
    const cavPath = (h) => { h.beginPath(); cav.forEach(([x, y], i) => { if (!i) h.moveTo(x, y); else { const [px, py] = cav[i - 1]; h.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2); } }); h.closePath(); };
    const cg = g.createLinearGradient(...u(0.4, -0.2), ...u(0.4, 0.3)); cg.addColorStop(0, '#5a1834'); cg.addColorStop(1, '#2c0a1a');
    cavPath(g); g.fillStyle = cg; g.fill();
    g.save(); cavPath(g); g.clip();
    // turbinates (three curled shelves)
    for (const [x, y, rx, ry] of [[0.2, -0.06, 0.2, 0.05], [0.26, 0.07, 0.24, 0.055], [0.28, 0.2, 0.26, 0.05]]) {
      const [cx, cy] = u(x, y), tgr = g.createLinearGradient(cx, cy - ry * HS, cx, cy + ry * HS); tgr.addColorStop(0, '#f2a1b0'); tgr.addColorStop(1, '#a8445f');
      g.fillStyle = tgr; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(cx, cy, rx * HS, ry * HS, -0.05, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    }
    // olfactory epithelium along the roof
    g.strokeStyle = 'rgba(240,210,150,0.8)'; g.lineWidth = 26; g.beginPath(); g.moveTo(...u(0.13, -0.17)); g.quadraticCurveTo(...u(0.33, -0.215), ...u(0.52, -0.15)); g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(255,200,215,0.6)'; g.lineWidth = 4; cavPath(g); g.stroke();
    g.restore();
    // the cut edge
    g.save(); g.setLineDash([14, 10]); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 4;
    S.profilePath(shifted, HS, 0);
    g.clip(); win(g); g.stroke(); g.restore();
    this.head = c;
  },
  draw(ctx, t, api) {
    const S = STORY, { P, ease, prog, clamp, pop, lerp } = api;
    const OWN = api.at(548), NOSE = api.at(556), USED = api.at(558), STOPS = api.at(570);
    const T2 = NOSE - 0.12;   // the signal peaks as the first molecules land, then adapts away
    const sigAt = (tt) => (tt < T2 ? prog(tt, 0.2, 0.7) : Math.max(0.07, Math.exp(-(tt - T2) * 0.5)));
    const sig = sigAt(t);
    S.stage(ctx, t, { glows: [{ x: 0.3, y: 0.4, r: 0.5, c: '#ff6fae', a: 0.35 }, { x: 0.8, y: 0.3, r: 0.4, c: '#d7f34a', a: 0.12 * sig }, { x: 0.7, y: 0.8, r: 0.5, c: '#7c5cff', a: 0.4 }] });
    ctx.save(); api.cam(ctx, t, { zoom0: 1.0, zoom1: 1.07, dur: api.duration, cx: 800, cy: 450 });
    ctx.drawImage(this.head, 0, 0, 1920, 1080);
    // receptor cells: bright when the smell is new, dimming as the nose adapts
    this.cells.forEach((c, i) => {
      const fl = 0.75 + 0.25 * Math.sin(t * 13 + i * 2.1), k = clamp(sig * fl);
      const col = S.mix('#7a5a78', P.lime, k);
      if (k > 0.15) S.glow(ctx, c.x, c.y + 6, 40 + 30 * k, P.lime, 0.8 * k);
      ctx.strokeStyle = S.rgba(col, 0.9); ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(c.x, c.y - 8); ctx.lineTo(c.x + (i - 4) * 1.5, c.y - 52); ctx.stroke();
      for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(c.x, c.y + 14); ctx.lineTo(c.x + j * 7 + Math.sin(t * 6 + i + j) * 3, c.y + 34); ctx.stroke(); }
      ctx.fillStyle = col; S.ell(ctx, c.x, c.y + 4, 11, 14); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; S.ell(ctx, c.x - 3, c.y, 3.5, 4); ctx.fill();
    });
    // nerve out of the bulb to the SIGNAL panel; pulses travel along it (rate follows the signal)
    const [bx, by] = this.u(0.46, -0.3);
    const wire = [[bx, by], [bx + 40, by - 70], [bx + 150, by - 100], [1080, 200], [1180, 260], [1290, 260]];
    ctx.save(); ctx.strokeStyle = S.rgba(P.lime, 0.25 + 0.5 * sig); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); wire.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    const L = wire.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - wire[i][0], p[1] - wire[i][1]), 0);
    const at = (d) => { for (let i = 1; i < wire.length; i++) { const sl = Math.hypot(wire[i][0] - wire[i - 1][0], wire[i][1] - wire[i - 1][1]); if (d <= sl) return [lerp(wire[i - 1][0], wire[i][0], d / sl), lerp(wire[i - 1][1], wire[i][1], d / sl)]; d -= sl; } return wire[wire.length - 1]; };
    for (let k = 0; k < 8; k++) { const ph = (t * 0.9 + k / 8) % 1; if ((k / 8) > sig + 0.05) continue; const [x, y] = at(ph * L); S.glow(ctx, x, y, 34, P.lime, 1); ctx.fillStyle = '#f7ffd0'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // odour molecules: a steady stream from outside, into the nostril, up to the receptors (they keep coming)
    const path = this.path, segL = []; let PL = 0; for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); segL.push(l); PL += l; }
    const onPath = (d) => { for (let i = 0; i < segL.length; i++) { if (d <= segL[i]) return [lerp(path[i][0], path[i + 1][0], d / segL[i]), lerp(path[i][1], path[i + 1][1], d / segL[i])]; d -= segL[i]; } return path[path.length - 1]; };
    const rnd = api.rand('mol');
    for (let i = 0; i < 26; i++) {
      const off = rnd(), sp = 0.2 + rnd() * 0.06, j1 = (rnd() - 0.5) * 70, j2 = rnd() * 6.28;
      const ph = (t * sp + off) % 1; if (t * sp + off < 1 && t < 0.1) continue;
      const [x, y] = onPath(ph * PL), spread = 1 - ph;
      const mx = x + Math.sin(t * 2 + j2) * 18 * spread + j1 * spread * 0.6, my = y + Math.cos(t * 1.7 + j2) * 14 * spread + j1 * spread * 0.4;
      ctx.save(); ctx.globalAlpha = clamp(ph * 8) * clamp((1 - ph) * 10); api.icons.h2s(ctx, mx, my, 15, t * 2 + j2); ctx.restore();
    }
    for (let i = 0; i < 4; i++) api.icons.puff(ctx, 1500 - i * 150 + Math.sin(t + i) * 30, 800 - i * 45, 150, 0.12, P.gas);
    // "your breath" (hand-lettered) on the stream
    ctx.save(); ctx.globalAlpha *= 1 - prog(t, STOPS - 0.5, 0.4); api.doodle.text(ctx, 'your breath', 1330, 560, prog(t, OWN, 0.5), { size: 64, color: P.gas, rotate: -0.05 });
    api.doodle.arrow(ctx, 1420, 590, 1330, 690, prog(t, OWN + 0.3, 0.5, ease.inOutCubic), { color: P.gas, width: 7, bend: 30, head: 22 }); ctx.restore();
    ctx.restore();

    // SIGNAL panel (screen space)
    const pp = prog(t, NOSE - 0.3, 0.5, ease.outCubic);
    if (pp > 0) {
      const PX = 1290, PY = 110, PW = 520, PH = 300;
      ctx.save(); ctx.globalAlpha = pp; ctx.translate(0, (1 - pp) * 30);
      S.solid(ctx, (g) => api.roundRect(g, PX, PY, PW, PH, 22), { color: '#1d1838', light: '#2a2350', dark: '#120f26', bounds: [PX, PY, PW, PH], rim: '#5f4fc0', rimW: 3, sBlur: 30 });
      api.text(ctx, 'SIGNAL', PX + 34, PY + 64, { size: 46, color: P.lime, tracking: 3 });
      // trace of the signal over time
      const gx = PX + 34, gy = PY + 100, gw = PW - 68, gh = 150, T0 = 0, T1 = api.duration - 0.3;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; for (let k = 0; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(gx, gy + gh * k / 3); ctx.lineTo(gx + gw, gy + gh * k / 3); ctx.stroke(); }
      ctx.beginPath(); let last = null;
      for (let k = 0; k <= 120; k++) { const tt = T0 + (T1 - T0) * k / 120; if (tt > t) break; const sv = sigAt(tt); const x = gx + gw * k / 120, y = gy + gh * (1 - sv); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); last = [x, y]; }
      ctx.strokeStyle = P.lime; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.shadowColor = P.lime; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0;
      if (last) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(last[0], last[1], 9, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    S.chip(ctx, 'OLFACTORY ADAPTATION', 1550, 470, pop(t, USED, 0.45), { size: 38, bg: 'rgba(12,8,28,0.85)', color: P.ink });
    S.chip(ctx, 'YOUR NOSE TUNES IT OUT', 1370, 1000 - 40, pop(t, STOPS, 0.5), { size: 60 });
    S.finish(ctx, t);
  },
});
