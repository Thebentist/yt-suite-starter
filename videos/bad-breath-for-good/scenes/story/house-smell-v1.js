// @use videos/bad-breath-for-good/scenes/story/_lib.js
// house-smell-v1: the phase-1 (v4b) illustrated look, restored at Ben's request, timed with anchor/anchorEnd + api.at.
// Words 347-387 "...you walk into somebody's house and they're just used to the way that their house smells. They don't really know
// that their house smelled bad. It's the same thing with your mouth."  Ends where not-food starts.
defineScene({
  name: 'house-smell-v1',
  anchor: { word: 347, offset: -0.15 },
  anchorEnd: { word: 388, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    const S = STORY.init(api);
    // the room's back wall, pre-rendered (wallpaper, window, picture, floor, rug)
    const c = document.createElement('canvas'); c.width = 3840; c.height = 2160; const g = c.getContext('2d'); g.scale(2, 2);
    const RX = 500, RY = 330, RW = 920, RH = 520;
    const wg = g.createLinearGradient(0, RY, 0, RY + RH); wg.addColorStop(0, '#6b3a55'); wg.addColorStop(1, '#3f2340'); g.fillStyle = wg; g.fillRect(RX, RY, RW, RH);
    g.fillStyle = 'rgba(255,220,200,0.05)'; for (let x = RX; x < RX + RW; x += 46) g.fillRect(x, RY, 20, RH);
    // window with a night sky and moon
    const wx = 740, wy = 400, ww = 200, wh = 170;
    g.fillStyle = '#2a1830'; api.roundRect(g, wx - 12, wy - 12, ww + 24, wh + 24, 10); g.fill();
    const sk = g.createLinearGradient(0, wy, 0, wy + wh); sk.addColorStop(0, '#1b2350'); sk.addColorStop(1, '#4a3a7a'); g.fillStyle = sk; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = '#fff5d6'; g.beginPath(); g.arc(wx + 140, wy + 55, 26, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1f2654'; g.beginPath(); g.arc(wx + 152, wy + 47, 22, 0, Math.PI * 2); g.fill();
    const rs = api.rand('stars'); g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(wx + rs() * ww, wy + rs() * wh * 0.8, 1 + rs() * 1.5, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#2a1830'; g.lineWidth = 8; g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
    g.fillStyle = '#c75b6e'; g.fillRect(wx - 30, wy - 20, 34, wh + 50); g.fillRect(wx + ww - 4, wy - 20, 34, wh + 50);
    // framed picture
    g.fillStyle = '#e8c07a'; api.roundRect(g, 1120, 395, 150, 110, 6); g.fill(); g.fillStyle = '#3f6a8a'; g.fillRect(1132, 407, 126, 86);
    g.fillStyle = '#7fb36a'; g.beginPath(); g.moveTo(1132, 493); g.lineTo(1180, 440); g.lineTo(1215, 470); g.lineTo(1240, 450); g.lineTo(1258, 493); g.closePath(); g.fill();
    // floor + rug
    const fg = g.createLinearGradient(0, 790, 0, 850); fg.addColorStop(0, '#8a5a3c'); fg.addColorStop(1, '#5b3826'); g.fillStyle = fg; g.fillRect(RX, 790, RW, 60);
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 2; for (let x = RX; x < RX + RW; x += 70) { g.beginPath(); g.moveTo(x, 790); g.lineTo(x - 20, 850); g.stroke(); }
    g.fillStyle = '#b8506a'; g.beginPath(); g.ellipse(960, 818, 300, 22, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#e8a0b0'; g.lineWidth = 4; g.beginPath(); g.ellipse(960, 818, 280, 17, 0, 0, Math.PI * 2); g.stroke();
    // door opening on the left with warm light
    g.fillStyle = '#ffcf8a'; g.fillRect(522, 500, 118, 292); const dl = g.createLinearGradient(522, 0, 640, 0); dl.addColorStop(0, 'rgba(255,240,200,0.9)'); dl.addColorStop(1, 'rgba(255,170,90,0.6)'); g.fillStyle = dl; g.fillRect(522, 500, 118, 292);
    g.fillStyle = '#7a4430'; g.beginPath(); g.moveTo(640, 500); g.lineTo(700, 520); g.lineTo(700, 800); g.lineTo(640, 792); g.closePath(); g.fill();
    g.strokeStyle = '#2a1830'; g.lineWidth = 10; g.strokeRect(517, 495, 128, 300);
    // inner shadow of the cut-away
    const ish = g.createLinearGradient(0, RY, 0, RY + 80); ish.addColorStop(0, 'rgba(0,0,0,0.45)'); ish.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = ish; g.fillRect(RX, RY, RW, 80);
    this.room = c;
  },
  draw(ctx, t, api) {
    const S = STORY, { P, ease, prog, clamp, pop, lerp } = api;
    const WALK = api.at(357), HOUSE = api.at(360), DONT = api.at(373), BAD = api.at(380), ITS = api.at(381), SAME = api.at(383);
    const CX = 960, CY = 590;
    const m = prog(t, ITS - 0.1, 0.75, ease.inOutCubic);         // house -> mouth morph (shape, lips)
    const mi = prog(t, ITS - 0.25, 0.35, ease.inOutCubic);       // room contents -> dark mouth interior (first)
    const mt = prog(t, ITS + 0.35, 0.35, ease.outBack);           // teeth grow in last
    S.stage(ctx, t, { warm: true, glows: [{ x: 0.5, y: 0.55, r: 0.55, c: '#ff8a6b', a: 0.35 }, { x: 0.5, y: 0.5, r: 0.4, c: '#b9e35a', a: 0.12 + 0.12 * m }] });
    ctx.save();
    api.cam(ctx, t, { zoom0: 1.0, zoom1: 1.05, dur: Math.max(1, ITS - 0.1), cx: CX, cy: CY });
    const zoomM = 1 + m * 0.12; ctx.translate(CX, CY); ctx.scale(zoomM, zoomM); ctx.translate(-CX, -CY);

    // morphing opening: room (squarish superellipse) -> open mouth
    const poly = [], N = 120;
    const n = lerp(14, 2.3, m), a = lerp(460, 560, m), bT = lerp(260, 165, m), bB = lerp(260, 250, m);
    for (let i = 0; i < N; i++) {
      const th = Math.PI + (i / N) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      const x = CX + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      let y = CY + (s < 0 ? bT : bB) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      if (s < 0) y += m * 38 * Math.exp(-Math.pow((x - CX) / 70, 2));     // cupid's bow dip
      poly.push([x, y]);
    }
    const polyPath = (g) => { g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };

    // house exterior (fades out as it becomes a mouth)
    const ex = 1 - clamp(m * 1.4);
    if (ex > 0) {
      ctx.save(); ctx.globalAlpha *= ex; ctx.translate(CX, CY); ctx.scale(1 + m * 0.2, 1 + m * 0.2); ctx.translate(-CX, -CY);
      S.solid(ctx, (g) => { g.beginPath(); g.moveTo(400, 318); g.lineTo(960, 95); g.lineTo(1520, 318); g.closePath(); }, { color: '#8e4a5e', light: '#c06a7c', dark: '#5a2b3c', bounds: [400, 95, 1120, 223], rim: '#ffb3a8', rimW: 8, rimDir: [1, -1] });
      S.solid(ctx, (g) => { g.beginPath(); g.rect(1230, 150, 70, 110); }, { color: '#7a3e50', bounds: [1230, 150, 70, 110], rim: '#ffb3a8', rimW: 6, shadow: false });
      S.solid(ctx, (g) => { g.beginPath(); g.rect(462, 300, 996, 588); g.rect(500, 330, 920, 520); }, { color: '#f0d9c8', light: '#fff1e6', dark: '#c9a996', bounds: [462, 300, 996, 588], rim: '#ffffff', rimW: 5, sBlur: 40 });
      ctx.fillStyle = '#3a2a3e'; ctx.fillRect(380, 884, 1160, 10);
      ctx.restore();
    }
    // interior: room content fades to the inside of a mouth
    ctx.save(); polyPath(ctx); ctx.clip();
    if (mi < 1) {
      ctx.save(); ctx.globalAlpha *= 1 - mi; ctx.drawImage(this.room, 0, 0, 1920, 1080);
      for (let i = 0; i < 9; i++) { const hx = 560 + ((i * 137 + t * 22) % 860), hy = 420 + ((i * 71) % 330) + Math.sin(t * 0.8 + i) * 20; api.icons.puff(ctx, hx, hy, 170, 0.8 * (0.16 + 0.14 * prog(t, 0.6, 0.8)), P.gas); }
      // lamp with warm glow
      S.glow(ctx, 1000, 560, 220, '#ffcf7a', 0.9);
      ctx.fillStyle = '#2a1830'; ctx.fillRect(996, 560, 8, 232); S.ell(ctx, 1000, 792, 40, 8); ctx.fill();
      S.solid(ctx, (g) => { g.beginPath(); g.moveTo(955, 560); g.lineTo(1045, 560); g.lineTo(1025, 500); g.lineTo(975, 500); g.closePath(); }, { color: '#ffd89a', bounds: [955, 500, 90, 60], shadow: false, rim: '#fff4d8', rimW: 4 });
      // owner on the sofa, oblivious and content
      const sway = Math.sin(t * 1.8) * 0.03;
      ctx.save(); ctx.translate(1200, 700); ctx.rotate(sway); ctx.translate(-1200, -700);
      S.bust(ctx, 1200, 585, 46, { skin: S.SKIN[2], hair: '#5a3526', hairStyle: 'curly', shirt: '#46c2a8', closed: true, happy: true, smile: 0.85, blush: 0.7, rimColor: '#ffcf8a', rimSide: -1 });
      ctx.restore();
      // sofa in front of the owner
      S.solid(ctx, (g) => { api.roundRect(g, 1050, 625, 320, 110, 28); }, { color: '#7c5cff', light: '#a58bff', dark: '#4a33b0', bounds: [1050, 625, 320, 110], rim: '#c9b8ff', rimW: 6, sBlur: 20 });
      S.solid(ctx, (g) => { api.roundRect(g, 1040, 700, 340, 80, 22); }, { color: '#6b4fe0', light: '#9277ff', dark: '#3f2aa8', bounds: [1040, 700, 340, 80], rim: '#c9b8ff', rimW: 5, sBlur: 20 });
      for (const ax of [1025, 1345]) S.solid(ctx, (g) => { api.roundRect(g, ax, 660, 50, 125, 22); }, { color: '#5a40c8', bounds: [ax, 660, 50, 125], rim: '#c9b8ff', rimW: 4, shadow: false });
      ctx.fillStyle = '#2a1830'; ctx.fillRect(1060, 780, 14, 14); ctx.fillRect(1346, 780, 14, 14);
      // visitor walks in, then recoils
      const wk = prog(t, WALK - 0.1, 0.55, ease.outCubic), recoil = prog(t, HOUSE + 0.15, 0.3, ease.outBack);
      const vx = lerp(560, 715, wk) - recoil * 24, walking = t > WALK - 0.1 && t < WALK + 0.5;
      S.person(ctx, vx, 824, 44, { skin: S.SKIN[0], hair: '#c98a3c', hairStyle: 'bun', shirt: '#ff7a59', pants: '#3b3560', walk: walking ? (t - WALK) * 11 : 0, lean: recoil * 0.13,
        turn: 0.35 - recoil * 0.55, look: [0.6 - recoil * 1.2, 0], smile: 0.5 - recoil * 0.5, stiff: recoil * 0.7, lid: 0.18 + recoil * 0.4, lowLid: recoil * 0.35, worry: recoil * 0.6, brow: recoil * 0.4, blush: 0.4, rimColor: '#ffcf8a' });
      for (let k = 0; k < 3; k++) S.wavy(ctx, vx + 40, 540 + k * 30, 100, -0.5 + k * 0.35, t, recoil * (1 - prog(t, BAD - 0.3, 0.3)), { color: '#9bc94a', lw: 6, ph: k * 2, amp: 7 });
      api.doodle.text(ctx, '!', vx - 30, 470, prog(t, HOUSE + 0.2, 0.2), { size: 110, color: P.marker, rotate: -0.1, stroke: 'rgba(20,6,16,0.6)', strokeWidth: 8 });
      // owner's thought: smells fine
      const tb = prog(t, DONT, 0.5, ease.linear);
      S.bubble(ctx, 1290, 430, 180, 130, tb, { tail: [1230, 530] });
      if (tb > 0.6) {
        const fk = ease.outBack(clamp((tb - 0.6) / 0.4)); ctx.save(); ctx.translate(1290, 430); ctx.scale(fk, fk); ctx.rotate(Math.sin(t * 2) * 0.1);
        for (let i = 0; i < 5; i++) { const an = (i / 5) * Math.PI * 2; ctx.fillStyle = '#ff8fb8'; S.ell(ctx, Math.cos(an) * 22, Math.sin(an) * 22, 18, 18); ctx.fill(); }
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        S.sparkle(ctx, 1355, 390, 18, ((t - DONT) * 1.3) % 1, '#fff6c8');
      }
      ctx.restore();
    }
    // mouth interior
    if (mi > 0) {
      ctx.save(); ctx.globalAlpha *= mi;
      const mg = ctx.createRadialGradient(CX, CY + 40, 20, CX, CY, 560); mg.addColorStop(0, '#5a1a30'); mg.addColorStop(1, '#2a0916'); ctx.fillStyle = mg; ctx.fillRect(300, 300, 1320, 600);
      S.solid(ctx, (g) => S.ell(g, CX, CY + 250, 400, 170), { color: P.tongue, light: P.tongueLight, dark: P.tongueDeep, bounds: [CX - 400, CY + 80, 800, 340], shadow: false, gloss: 0.25 });
      ctx.restore();
    }
    // the smell haze stays put through the morph
    for (let i = 0; i < 9; i++) {
      const hx = 560 + ((i * 137 + t * 22) % 860), hy = 420 + ((i * 71) % 330) + Math.sin(t * 0.8 + i) * 20;
      api.icons.puff(ctx, hx, hy, 170, (0.16 + 0.14 * prog(t, 0.6, 0.8)) * (i % 3 === 0 ? 1.2 : 1) * lerp(0.35, 1, mi), P.gas);
    }
    ctx.restore();
    // teeth + lips around the morphing opening
    if (m > 0) {
      ctx.save(); polyPath(ctx); ctx.clip(); ctx.globalAlpha *= clamp(mt * 3);
      const edgeY = (x, top) => { const u = Math.min(0.999, Math.abs(x - CX) / a), sth = Math.pow(Math.max(0, 1 - Math.pow(u, n)), 1 / n); return CY + (top ? -bT : bB) * sth; };
      for (let i = -4; i <= 4; i++) {
        const tx = CX + i * 98; if (Math.abs(tx - CX) > a * 0.8) continue; const ey = edgeY(tx, true), h = (95 - Math.abs(i) * 7) * mt;
        S.solid(ctx, (g) => api.roundRect(g, tx - 44, ey - 40, 88, 40 + h, 24), { color: '#f7f3ea', light: '#ffffff', dark: '#d8cfc0', bounds: [tx - 44, ey - 40, 88, 40 + h], shadow: false, gloss: 0.3 });
      }
      for (let i = -3; i <= 3; i++) {
        const tx = CX + i * 100; const ey = edgeY(tx, false), h = (80 - Math.abs(i) * 8) * mt;
        S.solid(ctx, (g) => api.roundRect(g, tx - 45, ey - h, 90, h + 40, 22), { color: '#efe9dd', bounds: [tx - 45, ey - h, 90, h + 40], shadow: false });
      }
      ctx.restore();
      ctx.save(); ctx.globalAlpha *= clamp(m * 1.5);
      ctx.lineJoin = 'round'; ctx.lineWidth = 90 * m; const lg = ctx.createLinearGradient(0, CY - 250, 0, CY + 300); lg.addColorStop(0, '#ff8aa0'); lg.addColorStop(0.5, '#e0485d'); lg.addColorStop(1, '#a52a44');
      ctx.strokeStyle = lg; ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30; polyPath(ctx); ctx.stroke(); ctx.shadowColor = 'transparent';
      ctx.lineWidth = 10 * m; ctx.strokeStyle = 'rgba(255,200,210,0.6)'; ctx.translate(0, -28 * m); ctx.beginPath(); for (let i = N * 0.02; i < N * 0.48; i++) { const [x, y] = poly[Math.floor(i)]; i === N * 0.02 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
      ctx.restore();
      // the smell escaping
      S.stink(ctx, CX, CY - 250, 90, t, prog(t, SAME, 0.5), { color: P.gas, lw: 10 });
    }
    ctx.restore();
    S.finish(ctx, t);
  },
});
