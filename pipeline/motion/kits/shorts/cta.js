/* Short-form follow / subscribe call-out (reusable kit; placed by pipeline/edit/shorts-build.mjs, cfg.cta). Ben
 * 2026-09-29: YouTube asked for "better subscribe / follow call outs without being intrusive" in his shorts.
 * Silent, about 3 s, drawn in the middle of the 16:9 design space on a transparent frame (the builder cuts it out and
 * places it in the vertical frame): a dark glass pill with a lime icon badge (bell for YouTube, plus for TikTok), a lime
 * button ("SUBSCRIBE" / "FOLLOW") and a short white line. It pops in, the button gets one tap (ripple, press) and turns
 * to "SUBSCRIBED" / "FOLLOWING" with a drawn check while the bell rings, then it scales away. No logos (generic icons).
 *   render: node pipeline/motion/render.mjs --scene pipeline/motion/kits/shorts/cta.js --out <dir>/cta-youtube
 *           --params '{"verb":"SUBSCRIBE","done":"SUBSCRIBED","icon":"bell","line":"FOR MORE FROM <HOST NAME>"}'
 */
defineScene({
  name: 'cta', fps: 30, duration: 3.2, transparent: true,
  params: { verb: 'SUBSCRIBE', done: 'SUBSCRIBED', icon: 'bell', line: 'FOR MORE LIKE THIS' },
  draw(ctx, t, api) {
    const { P, prog, ease, clamp, params: o } = api;
    const CX = 960, CY = 540, H = 124, size = 50, lineSize = 40;
    const tapT = 0.62, flipT = 0.8, outT = 2.72;
    const flipped = t >= flipT;
    const btnLabel = flipped ? o.done : o.verb;
    // widths are fixed from the longer label, so the pill does not change size when the button flips
    const bw = Math.max(api.measure(ctx, o.verb, { size, weight: 700, tracking: 2 }), api.measure(ctx, o.done, { size, weight: 700, tracking: 2 }) + 46) + 60;
    const lw = api.measure(ctx, o.line, { size: lineSize, weight: 700, tracking: 1.5 });
    const icon = 92, gap = 22, pad = 18, W = pad + icon + gap + bw + gap + lw + pad + 10;
    const x0 = CX - W / 2;
    // in (overshoot), out (shrink + fade)
    const inP = api.pop(t, 0, 0.42), outP = prog(t, outT, 0.4, ease.inCubic);
    const s = (0.72 + 0.28 * inP) * (1 - 0.12 * outP), alpha = clamp(inP * 1.6) * (1 - outP);
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(CX, CY); ctx.scale(s, s); ctx.translate(-CX, -CY);
    // glass pill
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(12,10,26,0.86)'; api.roundRect(ctx, x0, CY - H / 2, W, H, H / 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; api.roundRect(ctx, x0 + 1, CY - H / 2 + 1, W - 2, H - 2, H / 2 - 1); ctx.stroke();
    // icon badge
    const ix = x0 + pad + icon / 2;
    ctx.fillStyle = P.lime; ctx.beginPath(); ctx.arc(ix, CY, icon / 2, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(ix, CY);
    const ring = flipped ? Math.sin((t - flipT) * 26) * 0.32 * (1 - prog(t, flipT, 0.7)) : 0;
    ctx.rotate(ring);
    ctx.fillStyle = '#0a0a0f'; ctx.strokeStyle = '#0a0a0f'; ctx.lineCap = 'round';
    if (o.icon === 'plus') {
      ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.moveTo(0, -18); ctx.lineTo(0, 18); ctx.stroke();
    } else {
      // bell: dome, flared lip, clapper
      ctx.beginPath(); ctx.moveTo(-22, 14); ctx.bezierCurveTo(-20, 4, -20, -6, -17, -12); ctx.bezierCurveTo(-12, -24, 12, -24, 17, -12);
      ctx.bezierCurveTo(20, -6, 20, 4, 22, 14); ctx.lineTo(26, 18); ctx.lineTo(-26, 18); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 23, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -25, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // button: lime until the tap, then dark with lime type and a check
    const bx = x0 + pad + icon + gap, bh = 84, by = CY - bh / 2;
    const press = 1 - 0.07 * Math.sin(Math.PI * prog(t, tapT, 0.2, ease.linear));
    ctx.save(); ctx.translate(bx + bw / 2, CY); ctx.scale(press, press); ctx.translate(-(bx + bw / 2), -CY);
    if (!flipped) { ctx.fillStyle = P.lime; api.roundRect(ctx, bx, by, bw, bh, bh / 2); ctx.fill(); }
    else { ctx.fillStyle = 'rgba(215,243,74,0.14)'; api.roundRect(ctx, bx, by, bw, bh, bh / 2); ctx.fill(); ctx.strokeStyle = P.lime; ctx.lineWidth = 3; api.roundRect(ctx, bx + 1.5, by + 1.5, bw - 3, bh - 3, bh / 2); ctx.stroke(); }
    const tw = api.measure(ctx, btnLabel, { size, weight: 700, tracking: 2 }), ck = flipped ? 46 : 0;
    const tx = bx + (bw - tw - ck) / 2;
    api.text(ctx, btnLabel, tx, CY + size * 0.36, { size, weight: 700, tracking: 2, color: flipped ? P.lime : '#0a0a0f' });
    if (flipped) {
      const cp = prog(t, flipT + 0.05, 0.25, ease.outCubic), cx = tx + tw + 14, cy = CY + 2;
      ctx.strokeStyle = P.lime; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      const pts = [[cx, cy], [cx + 10, cy + 10], [cx + 28, cy - 14]], seg1 = clamp(cp / 0.4), seg2 = clamp((cp - 0.4) / 0.6);
      ctx.moveTo(...pts[0]); ctx.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * seg1, pts[0][1] + (pts[1][1] - pts[0][1]) * seg1);
      if (seg2 > 0) ctx.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * seg2, pts[1][1] + (pts[2][1] - pts[1][1]) * seg2);
      ctx.stroke();
    }
    ctx.restore();
    // the tap: a soft white ripple from the button's centre
    const rp = prog(t, tapT, 0.45, ease.outCubic);
    if (rp > 0 && rp < 1) {
      ctx.save(); ctx.globalAlpha *= 0.55 * (1 - rp); ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(bx + bw * 0.62, CY + 6, 18 + 70 * rp, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // the line
    api.text(ctx, o.line, bx + bw + gap, CY + lineSize * 0.36, { size: lineSize, weight: 700, tracking: 1.5, color: P.ink });
    ctx.restore();
  },
});
