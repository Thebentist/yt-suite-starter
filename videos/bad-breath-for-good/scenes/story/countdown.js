// @use videos/bad-breath-for-good/scenes/story/_lib.js
// countdown (phase 2, after Ben's v4a note): the 10-second wait is gone. The cut keeps ~1.33 s after "I'll wait." (his sniff and
// grimace, raw 344.466-345.8) and jump-cuts to "Okay". This is a quick TRANSPARENT time-skip gag over that grimace, in the LEFT
// third only (his face is the joke): a clock ring whips round once while 10 -> 0 spins past, "10 SECONDS LATER" snaps on,
// then the whole thing whips out left before "Okay".  Anchor: { special: 'wrist-wait', offset: 0 }, fixed 1.33 s.
defineScene({
  name: 'countdown', transparent: true,
  anchor: { special: 'wrist-wait', offset: 0 },
  duration: 1.35,
  setup(api) { STORY.init(api); },
  draw(ctx, t, api) {
    const S = STORY, { P, ease, prog, clamp, pop, lerp } = api;
    const D = api.duration, CX = 262, CY = 460, R = 165;
    const inK = prog(t, 0, 0.14, ease.outBack), sweep = prog(t, 0.08, 0.62, ease.inOutCubic), land = 0.74, outK = prog(t, D - 0.2, 0.2, ease.inCubic);
    ctx.save(); ctx.translate(-outK * 700, 0); ctx.globalAlpha = 1 - outK * 0.6;
    if (outK > 0) ctx.filter = `blur(${Math.round(outK * 14)}px)`;
    // whip streaks behind
    const wk = clamp(1 - Math.abs(t - 0.05) / 0.12) + clamp(1 - Math.abs(t - (D - 0.12)) / 0.12);
    if (wk > 0) { ctx.save(); ctx.globalAlpha *= 0.6 * wk; for (let i = 0; i < 7; i++) { const y = 260 + i * 62; const g = ctx.createLinearGradient(0, 0, 620, 0); g.addColorStop(0, 'rgba(215,243,74,0)'); g.addColorStop(0.6, 'rgba(215,243,74,0.55)'); g.addColorStop(1, 'rgba(215,243,74,0)'); ctx.fillStyle = g; ctx.fillRect(20, y, 600, 4 + (i % 3) * 3); } ctx.restore(); }
    ctx.save(); ctx.translate(CX, CY); ctx.scale(inK, inK);
    // dark disc so it reads over the lavender set
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 10; const bd = ctx.createRadialGradient(0, -30, 10, 0, 0, R + 40); bd.addColorStop(0, 'rgba(32,24,64,0.94)'); bd.addColorStop(1, 'rgba(12,9,28,0.92)'); ctx.fillStyle = bd; ctx.beginPath(); ctx.arc(0, 0, R + 40, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // clock wipe: a lime sector sweeps once round, with a bright leading edge
    const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * sweep;
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1); ctx.closePath(); ctx.fillStyle = 'rgba(215,243,74,0.16)'; ctx.fill(); ctx.restore();
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(244,241,234,0.14)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    if (sweep > 0) { ctx.save(); ctx.shadowColor = P.lime; ctx.shadowBlur = 26; ctx.strokeStyle = P.lime; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.stroke(); ctx.restore();
      // motion-blurred hand
      for (let k = 0; k < 6; k++) { const a = a1 - k * 0.09; ctx.strokeStyle = `rgba(255,255,255,${0.9 - k * 0.15})`; ctx.lineWidth = 8 - k; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (R - 34), Math.sin(a) * (R - 34)); ctx.stroke(); } }
    for (let k = 0; k < 10; k++) { const a = a0 + (k / 10) * Math.PI * 2; ctx.strokeStyle = (k / 10) < sweep ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.22)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R - 22), Math.sin(a) * (R - 22)); ctx.lineTo(Math.cos(a) * (R - 36), Math.sin(a) * (R - 36)); ctx.stroke(); }
    // digits spin 10 -> 0 with the sweep (a slot-machine roll), then settle on 0
    const n = Math.max(0, 10 - Math.floor(sweep * 10.999)), frac = (sweep * 10.999) % 1;
    ctx.save(); ctx.beginPath(); ctx.rect(-R + 30, -95, 2 * R - 60, 190); ctx.clip();
    if (sweep < 1) {
      for (const [v, dy] of [[n, -frac * 150], [Math.max(0, n - 1), 150 - frac * 150]]) { ctx.save(); ctx.globalAlpha *= 1 - Math.abs(dy) / 170; api.text(ctx, String(v), 0, 62 + dy, { size: 180, align: 'center', color: '#ffffff' }); ctx.restore(); }
    } else api.text(ctx, '0', 0, 62, { size: 180, align: 'center', color: '#ffffff', glow: 'rgba(215,243,74,0.6)', glowBlur: 30 });
    ctx.restore();
    ctx.restore();
    // 10 SECONDS LATER snaps on (with a tiny shake)
    const cp = pop(t, land, 0.28), shake = S.kick(t, land, 0.35) * 6;
    S.chip(ctx, '10 SECONDS LATER', CX + shake, CY + R + 110, cp, { size: 58, rotate: -0.03 });
    ctx.restore();
  },
});
