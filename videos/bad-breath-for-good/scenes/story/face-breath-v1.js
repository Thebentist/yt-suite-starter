// @use videos/bad-breath-for-good/scenes/story/_lib.js
// face-breath-v1: the phase-1 (v4b) illustrated look, restored at Ben's request, timed with anchor/anchorEnd + api.at.
// Words 575-598 "And trust me, there's nothing more around you than your bad breath. I mean, literally, it's coming out of your face all day
// long."  Ends where cup-hand starts.
defineScene({
  name: 'face-breath-v1',
  anchor: { word: 575, offset: -0.15 },
  anchorEnd: { word: 599, offset: -0.15 },
  tail: 0.5,
  setup(api) { STORY.init(api); },
  draw(ctx, t, api) {
    const S = STORY, { P, ease, prog, clamp, pop, lerp } = api;
    const AROUND = api.at(581), LIT = api.at(589), OUT = api.at(592), ALL = api.at(596), LONG = api.at(598);
    // the clock runs faster from "literally"; its day/night disc sets the sky tint
    const spin = t * 0.5 + Math.max(0, t - LIT + 0.3) ** 2 * 2.2;
    const dayK = 0.5 + 0.5 * Math.cos(spin * Math.PI * 2);
    S.stage(ctx, t, { glows: [{ x: 0.72, y: 0.38, r: 0.5, c: S.mix('#3b5bd6', '#ffb86b', dayK), a: 0.5 }, { x: 0.3, y: 0.6, r: 0.5, c: '#7c5cff', a: 0.45 }] });
    ctx.save(); api.cam(ctx, t, { zoom0: 1.0, zoom1: 1.06, dur: 6, cx: 900 });
    // ---- clock (behind, right)
    const CX = 1390, CY = 420, R = 250, cp = pop(t, 0.1, 0.6);
    if (cp > 0) {
      ctx.save(); ctx.translate(CX, CY); ctx.scale(cp, cp);
      S.glow(ctx, 0, 0, R * 1.6, S.mix('#5b6cff', '#ffcf7a', dayK), 0.6);
      S.solid(ctx, (g) => { g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); }, { color: '#2a2350', light: '#3d3470', dark: '#171230', bounds: [-R, -R, 2 * R, 2 * R], rim: '#9d8cff', rimW: 8 });
      // day/night disc
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R * 0.84, 0, Math.PI * 2); ctx.clip(); ctx.rotate(spin * Math.PI * 2);
      const day = ctx.createLinearGradient(0, -R, 0, 0); day.addColorStop(0, '#6ec3ff'); day.addColorStop(1, '#ffd08a');
      ctx.fillStyle = day; ctx.fillRect(-R, -R, 2 * R, R);
      const night = ctx.createLinearGradient(0, 0, 0, R); night.addColorStop(0, '#2b2f7a'); night.addColorStop(1, '#141438');
      ctx.fillStyle = night; ctx.fillRect(-R, 0, 2 * R, R);
      // sun (top half) and moon (bottom half)
      S.glow(ctx, 0, -R * 0.52, 110, '#ffd43b', 0.9); ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(0, -R * 0.52, 44, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 8; ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 58, -R * 0.52 + Math.sin(a) * 58); ctx.lineTo(Math.cos(a) * 76, -R * 0.52 + Math.sin(a) * 76); ctx.stroke(); }
      ctx.fillStyle = '#fff5d6'; ctx.beginPath(); ctx.arc(0, R * 0.52, 40, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#20245e'; ctx.beginPath(); ctx.arc(16, R * 0.47, 34, 0, Math.PI * 2); ctx.fill();
      const rs = api.rand('stars2'); ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.arc((rs() - 0.5) * R * 1.5, 20 + rs() * R * 0.7, 2 + rs() * 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      // ticks + hands
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.lineWidth = i % 3 ? 5 : 9; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86); ctx.lineTo(Math.cos(a) * R * 0.96, Math.sin(a) * R * 0.96); ctx.stroke(); }
      const hA = spin * Math.PI * 4 - Math.PI / 2, mA = spin * Math.PI * 48 - Math.PI / 2;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(hA) * R * 0.45, Math.sin(hA) * R * 0.45); ctx.stroke();
      ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(mA) * R * 0.72, Math.sin(mA) * R * 0.72); ctx.stroke();
      ctx.fillStyle = P.lime; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      // motion arcs when it speeds up
      const fast = prog(t, LIT, 0.6);
      if (fast > 0) { ctx.strokeStyle = S.rgba('#ffffff', 0.5 * fast); ctx.lineWidth = 6; for (let k = 0; k < 2; k++) { const a0 = mA + 0.4 + k * Math.PI; ctx.beginPath(); ctx.arc(0, 0, R * 1.12, a0, a0 + 0.9); ctx.stroke(); } }
      ctx.restore();
    }
    // ---- the head in profile, breathing out all day
    const HX = 610, HY = 560, HS = 215;
    const [mx, my] = [HX + 0.72 * HS, HY + 0.48 * HS];
    // breath cloud: flows out, then wraps around the head from "around you"
    const wrap = prog(t, AROUND - 0.2, 0.9, ease.inOutCubic), strong = 1 + prog(t, OUT - 0.33, 0.6) * 0.5;
    const pathAt = (u) => {
      if (u < 0.28) { const k = u / 0.28; return [lerp(mx + 10, mx + 330, k), my - Math.sin(k * 1.4) * 70 - k * 30]; }
      const k = (u - 0.28) / 0.72, a = 0.18 - k * Math.PI * 1.8;   // counter-clockwise, up over the head and around
      return [HX + 60 + Math.cos(a) * 470, HY - 60 + Math.sin(a) * 380];
    };
    const N = 46;
    for (let i = 0; i < N; i++) {
      const ph = (t * 0.22 + i / N) % 1, u = ph * lerp(0.28, 1, wrap);
      const [x, y] = pathAt(u), r = (60 + u * 110) * strong * (0.8 + 0.4 * ((i * 7) % 5) / 5);
      S.puff(ctx, x + Math.sin(t * 1.3 + i) * 14, y + Math.cos(t * 1.1 + i * 1.7) * 12, r, (0.3 * (1 - u * 0.55)) * clamp(ph * 12) * prog(t, 0.05, 0.4), P.gas, i);
    }
    const breathe = 0.35 + 0.2 * Math.sin(t * 3);
    S.profile(ctx, HX, HY, HS, { skin: S.SKIN[2], hair: '#3b2420', shirt: '#ff7a59', open: breathe, lid: 0.45, blush: 0.8, rimColor: '#ffcf9a' });
    // exhale wisps right at the lips
    for (let k = 0; k < 3; k++) S.wavy(ctx, mx + 18, my - 6 + k * 14, 70 * strong, -0.15 + k * 0.12, t, prog(t, 0.2, 0.3), { color: P.gas, lw: 5, ph: k * 2, amp: 5 });
    // marker arrow at the mouth on "out of your face"
    api.doodle.arrow(ctx, 980, 900, mx + 40, my + 50, prog(t, OUT - 0.1, 0.45, ease.inOutCubic), { color: P.marker, width: 10, bend: -60, seed: 9 });
    ctx.restore();
    // 24/7
    const tp = prog(t, ALL - 0.05, 0.45);
    api.doodle.text(ctx, '24/7', 1440, 870, tp, { size: 150, color: P.lime, align: 'center', rotate: -0.06, stroke: 'rgba(10,6,20,0.6)', strokeWidth: 12 });
    api.doodle.underline(ctx, 1300, 1600, 900, prog(t, LONG, 0.35, ease.inOutCubic), { color: P.lime, width: 10, seed: 3 });
    S.finish(ctx, t);
  },
});
