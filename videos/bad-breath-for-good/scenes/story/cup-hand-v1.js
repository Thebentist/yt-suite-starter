// @use videos/bad-breath-for-good/scenes/story/_lib.js
// cup-hand-v1: the phase-1 (v4b) illustrated look, restored at Ben's request, timed with anchor/anchorEnd + api.at.
// Words 599-631 "And this whole, like, cup your hand over your mouth and snippet thing, that doesn't really work either. You're kind of just
// smelling the same air that you've been smelling all day long."  Ends where study-card starts (w632).
defineScene({
  name: 'cup-hand-v1',
  anchor: { word: 599, offset: -0.15 },
  anchorEnd: { word: 632, offset: -0.15 },
  tail: 0.5,
  setup(api) { STORY.init(api); },
  draw(ctx, t, api) {
    const S = STORY, { P, ease, prog, clamp, pop, lerp } = api;
    const CUP = api.at(603), OVER = api.at(606), SNIFF = api.at(610), DOESNT = api.at(613), YOURE = api.at(617), SAME = api.at(623), AIR = api.at(624), ALLDAY = api.at(629);
    S.stage(ctx, t, { warm: true, glows: [{ x: 0.45, y: 0.5, r: 0.5, c: '#ff8a6b', a: 0.35 }, { x: 0.75, y: 0.35, r: 0.4, c: '#7c5cff', a: 0.45 }] });
    const push = prog(t, YOURE - 0.1, 1.2, ease.inOutCubic);
    ctx.save(); api.cam(ctx, t, { zoom0: 1.0 + push * 0.22, zoom1: 1.04 + push * 0.22, dur: api.duration, cx: 880 + push * 20, cy: 600 });
    const HX = 640, HY = 500, HS = 255, skin = S.SKIN[1];
    const sniff = S.bump(t, SNIFF, 0.6);
    S.profile(ctx, HX, HY, HS, { skin, hair: '#2b1d24', shirt: '#46c2a8', open: 0.15, lid: 0.35 + 0.3 * prog(t, OVER, 0.3) - sniff * 0.3, brow: sniff * 0.8, blush: 0.6, rimColor: '#ffc9a8' });
    // the cupped hand rises and settles over mouth and nose
    const hp = prog(t, CUP - 0.1, 0.7, ease.outBack), hx = 925, hy = lerp(1150, 590, hp) + Math.sin(t * 2) * 2;
    const loopCx = 872, loopCy = 596;
    if (hp > 0) {
      ctx.save(); ctx.translate(hx, hy);
      const handPath = (g) => {
        g.beginPath(); g.moveTo(96, 560); g.lineTo(80, 330);
        g.bezierCurveTo(74, 220, 82, 90, 74, -30);                  // back of the hand
        g.bezierCurveTo(66, -100, 30, -150, -30, -156);             // curling fingers
        g.bezierCurveTo(-80, -160, -112, -140, -122, -112);         // fingertip at the nose bridge
        g.bezierCurveTo(-128, -92, -110, -84, -92, -90);
        g.bezierCurveTo(-52, -100, -14, -80, 2, -40);               // inside of the fingers
        g.bezierCurveTo(14, 0, 14, 60, 4, 92);                      // palm
        g.bezierCurveTo(-20, 108, -70, 104, -104, 108);             // along the thumb
        g.bezierCurveTo(-130, 112, -134, 140, -110, 150);           // thumb tip under the chin
        g.bezierCurveTo(-70, 164, -20, 170, 8, 200);
        g.lineTo(-26, 560); g.closePath();
      };
      S.solid(ctx, handPath, { color: S.dark(skin, 0.04), light: S.light(skin, 0.14), dark: S.dark(skin, 0.3), bounds: [-130, -160, 210, 720], gx0: 0.95, gx1: 0.1, gy0: 0.1, gy1: 0.7, rim: S.mix(skin, '#ffd9bf', 0.75), rimW: 9, rimDir: [1, -0.5], sBlur: 44, sY: 16 });
      // stacked fingers, knuckles, thumb crease, nail
      ctx.strokeStyle = S.rgba(S.dark(skin, 0.5), 0.5); ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const [k, off] of [[0, 0], [1, 34], [2, 66]]) { ctx.beginPath(); ctx.moveTo(60 - k * 4, -20 + off); ctx.bezierCurveTo(52 - k * 6, -86 + off * 0.7, 10, -128 + off * 0.8, -60 + k * 12, -132 + off * 0.9); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-20, 150); ctx.quadraticCurveTo(-60, 130, -100, 128); ctx.stroke();
      ctx.fillStyle = S.rgba('#ffe6dc', 0.75); S.ell(ctx, -108, -122, 14, 9, -0.8); ctx.fill();
      // sleeve cuff
      S.solid(ctx, (g) => { g.beginPath(); g.moveTo(112, 430); g.lineTo(-50, 430); g.lineTo(-60, 610); g.lineTo(130, 610); g.closePath(); }, { color: '#46c2a8', bounds: [-60, 430, 190, 180], shadow: false, rim: '#b9fff0', rimW: 6 });
      ctx.restore();
    }
    // the air loop: out of the mouth, into the cup, back up into the nose
    const lp = prog(t, SNIFF - 0.15, 0.6, ease.inOutCubic);
    if (lp > 0) {
      const loop = (u) => { const a = Math.PI * 0.78 - u * Math.PI * 1.6; return [loopCx + Math.cos(a) * 48 * (1 + 0.12 * Math.sin(u * 3)), loopCy + 12 + Math.sin(a) * 50]; };
      ctx.save(); ctx.strokeStyle = S.rgba(P.gas, 0.9); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.setLineDash([2, 16]); ctx.lineDashOffset = -t * 60;
      ctx.beginPath(); for (let i = 0; i <= 40 * lp; i++) { const [x, y] = loop(i / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
      if (lp > 0.95) { const [ax, ay] = loop(1), [bx, by] = loop(0.95), an = Math.atan2(ay - by, ax - bx); ctx.save(); ctx.fillStyle = P.gas; ctx.translate(ax, ay); ctx.rotate(an); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-12, -13); ctx.lineTo(-12, 13); ctx.closePath(); ctx.fill(); ctx.restore(); }
      // circulating whiffs
      for (let i = 0; i < 7; i++) { const u = (t * 0.45 + i / 7) % 1; if (u > lp) continue; const [x, y] = loop(u); S.puff(ctx, x, y, 28, 0.55, P.gas, i); }
    }
    ctx.restore();
    // big red X on "doesn't really work", fading back so the loop reads when he explains why
    const xa = 1 - 0.7 * prog(t, YOURE - 0.1, 0.5);
    ctx.save(); ctx.globalAlpha = xa; api.doodle.cross(ctx, 880, 580, 240, prog(t, DOESNT, 0.75, ease.inOutCubic), { color: P.marker, width: 30, seed: 5, glow: 'rgba(255,40,40,0.4)' }); ctx.restore();
    // SAME AIR
    api.doodle.text(ctx, 'SAME AIR', 1480, 330, prog(t, SAME - 0.1, 0.45), { size: 120, color: P.lime, align: 'center', rotate: -0.05, stroke: 'rgba(10,6,20,0.6)', strokeWidth: 12 });
    api.doodle.arrow(ctx, 1390, 390, 960, 570, prog(t, AIR - 0.05, 0.5, ease.inOutCubic), { color: P.lime, width: 10, bend: 70, seed: 4 });
    api.doodle.text(ctx, '(all day)', 1480, 470, prog(t, ALLDAY, 0.4), { size: 64, color: P.dim, align: 'center', rotate: -0.05 });
    S.finish(ctx, t);
  },
});
