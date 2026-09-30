// @use videos/bad-breath-for-good/scenes/story/_lib.js
// hook-lean-v1: the phase-1 (v4b) illustrated look, restored at Ben's request ("liked first cut graphics of this better"), with the
// phase-2 timing machinery: anchor/anchorEnd + api.at, so it follows the cut.
// Words 258-291 "You're talking to somebody, you know, close enough to see their teeth, and then all of a sudden they lean away and
// you're like, wait a second, is my breath stink? Is it me?"
defineScene({
  name: 'hook-lean-v1',
  anchor: { word: 258, offset: -0.15 },
  anchorEnd: { word: 291, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    STORY.init(api);
    // warm café bokeh, pre-rendered at 2x
    const c = document.createElement('canvas'); c.width = 3840; c.height = 2160; const g = c.getContext('2d'); g.scale(2, 2);
    const rnd = api.rand('hook-bokeh'), cols = ['#ff9a6b', '#ffcf7a', '#ff6fae', '#a78bfa', '#ffb38a'];
    for (let i = 0; i < 30; i++) {
      const x = rnd() * 1920, y = 60 + rnd() * 700, r = 24 + rnd() * rnd() * 90, col = cols[Math.floor(rnd() * cols.length)], a = 0.05 + rnd() * 0.12;
      const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r); gr.addColorStop(0, STORY.rgba(col, a)); gr.addColorStop(0.85, STORY.rgba(col, a * 0.8)); gr.addColorStop(1, STORY.rgba(col, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = STORY.rgba(col, a * 0.9); g.lineWidth = 2; g.beginPath(); g.arc(x, y, r * 0.9, 0, Math.PI * 2); g.stroke();
    }
    this.bokeh = c;
  },
  draw(ctx, t, api) {
    const S = STORY, { P, ease, prog, clamp, pop } = api;
    const CLOSE = api.at(264), SEE = api.at(267), TEETH = api.at(269);
    const LEAN = api.at(277), WAIT = api.at(282), IS = api.at(285), BREATH = api.at(287), STINK = api.at(288), IS2 = api.at(289), IT = api.at(290), ME = api.at(291);
    const freeze = clamp((t - LEAN) / 0.08) * (1 - clamp((t - (LEAN + 1.1)) / 0.6));   // idle motion stops for the freeze-frame beat
    const live = 1 - freeze;

    S.stage(ctx, t, { warm: true, dust: 20, glows: [{ x: 0.7, y: 0.4, r: 0.55, c: '#ff8a6b', a: 0.5 }, { x: 0.12, y: 0.85, r: 0.5, c: '#7c5cff', a: 0.55 }, { x: 0.3, y: 0.15, r: 0.35, c: '#ff6fae', a: 0.25 }] });
    ctx.save(); ctx.globalAlpha = 0.9; ctx.drawImage(this.bokeh, -20 + Math.sin(t * 0.3) * 14, Math.cos(t * 0.25) * 8, 1960, 1102); ctx.restore();

    // camera: slow drift, push-in on "close enough to see their teeth", punch on "lean"
    const push = prog(t, CLOSE - 0.05, 0.9, ease.inOutCubic) * 0.06;
    const punch = prog(t, LEAN, 0.12, ease.outCubic) * 0.07 - prog(t, LEAN + 0.12, 1.0, ease.inOutCubic) * 0.03;
    const settle = prog(t, WAIT + 0.2, 1.4, ease.inOutCubic);
    ctx.save();
    api.cam(ctx, t, { zoom0: 1.0 + push + punch, zoom1: 1.04 + push + punch, dur: api.duration, cx: 1000 - settle * 260, cy: 520 - settle * 120 });

    // ---- the friend (right), facing left toward us-the-speaker
    const leanK = prog(t, LEAN, 0.28, ease.outBack);
    const nod = Math.sin(t * 2.3) * 0.022 * live * (t < LEAN ? 1 : 0.3);
    const blink = (at) => { const k = (t - at) / 0.16; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };
    const lid = Math.max(0.16, blink(1.1), blink(2.75), blink(6.4), blink(8.1)) - 0.08 * leanK;
    const grin = prog(t, SEE - 0.1, 0.35) * (1 - prog(t, LEAN, 0.2));
    const stiff = prog(t, LEAN, 0.22, ease.outCubic);
    const fx = 1270 + leanK * 70, fy = 470 - leanK * 12;
    ctx.save(); ctx.translate(fx, fy + 700); ctx.rotate(leanK * 0.07 + nod * 0.4); ctx.translate(-fx, -(fy + 700));
    S.bust(ctx, fx, fy, 225, {
      skin: '#e0a07a', hair: '#3b2420', hairStyle: 'bob', shirt: '#ff7a59', rimColor: '#ffcfae', rimSide: 1,
      turn: -0.42, look: [-0.72 - leanK * 0.1, 0.08], lid: Math.min(1, lid), headRot: -nod - leanK * 0.05, headDX: leanK * 0.12, headDY: -leanK * 0.04,
      smile: 0.75 - stiff * 0.55, open: grin * 0.42, stiff, brow: 0.15 + stiff * 0.75, worry: stiff * 0.5, wide: stiff * 0.35,
      sweat: prog(t, LEAN + 0.72, 0.4), blush: 0.55,
    });
    ctx.restore();
    // teeth sparkle on "teeth"
    S.sparkle(ctx, 1150, 600, 34, clamp((t - TEETH + 0.05) / 0.5), '#ffffff');
    S.sparkle(ctx, 1205, 585, 22, clamp((t - TEETH - 0.07) / 0.45), '#fff6c8');
    // motion lines behind the friend on "lean away" (marker)
    for (let i = 0; i < 3; i++) {
      const p = prog(t, LEAN + 0.05 + i * 0.06, 0.25, ease.outCubic) * (1 - prog(t, IS - 0.1, 0.4));
      api.doodle.stroke(ctx, [[1010 - i * 14, 330 + i * 64], [1080 - i * 6, 326 + i * 64]], p, { color: P.marker, width: 9, seed: 20 + i });
    }

    // ---- the speaker (you), over the shoulder, left foreground
    const talk = t < LEAN ? Math.sin(t * 9) * 0.006 : 0;
    ctx.save(); ctx.translate(330, 650 + talk * 200);
    S.backHead(ctx, 0, 0, 240, { skin: '#c98a5f', hair: '#231820', shirt: '#6b4fe0', rimColor: '#ffb48f' });
    ctx.restore();
    // talking arcs from the speaker toward the friend (stop at the lean)
    const arcs = (1 - prog(t, LEAN - 0.2, 0.25)) * prog(t, 0.15, 0.3);
    if (arcs > 0) {
      ctx.save(); ctx.strokeStyle = S.rgba('#ffe9d6', 0.75 * arcs); ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const ph = ((t * 1.6 + i / 3) % 1), r = 40 + ph * 90; ctx.globalAlpha = (1 - ph) * arcs; ctx.beginPath(); ctx.arc(640, 700, r, -0.55, 0.45); ctx.stroke(); }
      ctx.restore();
    }
    // café table edge in the foreground, two cups (one steaming)
    ctx.save();
    const tg = ctx.createLinearGradient(0, 930, 0, 1120); tg.addColorStop(0, '#6a3b3a'); tg.addColorStop(0.08, '#4a2630'); tg.addColorStop(1, '#1d1020');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(-100, 960); ctx.quadraticCurveTo(960, 925, 2020, 960); ctx.lineTo(2020, 1200); ctx.lineTo(-100, 1200); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,160,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-100, 960); ctx.quadraticCurveTo(960, 925, 2020, 960); ctx.stroke();
    ctx.restore();
    S.contact(ctx, 800, 968, 90, 16, 0.5); S.icons.coffee(ctx, 800, 905, 58);
    S.contact(ctx, 1080, 966, 80, 14, 0.5); S.icons.coffee(ctx, 1080, 910, 50);
    for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i / 3) % 1; ctx.save(); ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.35; ctx.strokeStyle = '#fff3e8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); for (let k = 0; k <= 10; k++) { const u = k / 10; const xx = 790 + (i - 1) * 16 + Math.sin(u * 6 + t * 3 + i) * 8, yy = 850 - ph * 60 - u * 70; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); ctx.restore(); }
    // "!?" on "wait a second"
    ctx.save(); ctx.globalAlpha *= 1 - prog(t, IS - 0.1, 0.2); api.doodle.text(ctx, '!?', 600, 400, prog(t, WAIT, 0.3), { size: 110, color: P.marker, rotate: -0.12 }); ctx.restore();
    ctx.restore();   // camera

    api.vignette(ctx, 0.55);
    // ---- thought bubble (screen space, over the vignette so it stays bright): stink cloud, then IS IT ME?
    const bp = prog(t, IS, 0.55, ease.linear);
    const bx = 540, by = 285, bw = 720, bh = 400;
    S.bubble(ctx, bx, by, bw, bh, bp, { tail: [440, 520] });
    if (bp > 0.5) {
      const k = clamp((bp - 0.45) / 0.55), ks = ease.outBack(k, 2);
      ctx.save(); ctx.translate(bx, by); ctx.scale(ks, ks); ctx.translate(-bx, -by);
      const sp = pop(t, BREATH, 0.45), cx0 = bx - 205, cy0 = by + 20;
      // tiny stink cloud with a sick little face
      ctx.save(); ctx.translate(cx0, cy0 + Math.sin(t * 3) * 4); ctx.scale(sp, sp);
      S.solid(ctx, (g) => { g.beginPath(); for (const [px, py, r] of [[-48, 12, 44], [0, -20, 54], [48, 10, 42], [0, 26, 42]]) { g.moveTo(px + r, py); g.arc(px, py, r, 0, Math.PI * 2); } }, { color: '#9bc94a', light: '#d6f28a', dark: '#5f8a2a', bounds: [-90, -75, 180, 145], rim: '#e9ffb0', rimW: 6, sBlur: 14, sY: 6 });
      ctx.strokeStyle = '#3d5a17'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-30, -6); ctx.lineTo(-14, 2); ctx.moveTo(-30, 8); ctx.lineTo(-14, 2); ctx.moveTo(30, -6); ctx.lineTo(14, 2); ctx.moveTo(30, 8); ctx.lineTo(14, 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-18, 34); ctx.quadraticCurveTo(-9, 26, 0, 34); ctx.quadraticCurveTo(9, 42, 18, 34); ctx.stroke();
      ctx.restore();
      S.stink(ctx, cx0, cy0 - 62, 62, t, prog(t, STINK - 0.1, 0.4), { puff: false, color: '#6f9a2a', lw: 9 });
      // IS IT ME? (each word on its word)
      const size = 124, words = [['IS', IS2], ['IT', IT], ['ME?', ME]], gap = 44;
      const ws = words.map(([w]) => api.measure(ctx, w, { size, weight: 700, tracking: 1 }));
      let x = bx - 82;
      words.forEach(([w, at], i) => {
        const p = pop(t, at, 0.45);
        if (p > 0) { ctx.save(); ctx.translate(x + ws[i] / 2, by + 62); ctx.scale(p, p); api.text(ctx, w, 0, 0, { size, weight: 700, align: 'center', color: w === 'ME?' ? '#e3263b' : P.paperInk, tracking: 1 }); ctx.restore(); }
        x += ws[i] + gap;
      });
      ctx.restore();
    }
    // freeze-frame flash
    const flash = clamp(1 - (t - LEAN) / 0.18) * (t >= LEAN ? 1 : 0);
    if (flash > 0) { ctx.save(); ctx.fillStyle = 'rgba(255,240,230,' + (0.28 * flash) + ')'; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); }
    api.grain(ctx, t, 0.06);
  },
});
