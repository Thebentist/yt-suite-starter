// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* open-tiktok: the cold open (special anchor tiktok-watch). Transparent overlay, rendered 7.6 s from TikTok 0; the lead
 * trims it to render 0.45-7.45 s (plan in: 0.45, duration: 7, same as the tiktok-audio stem).
 * Ben's A-roll sits underneath shifted right 250 design px (500 px at 4K), face around x 60-68 %; its left edge
 * (x < 250) is empty, so a dark stage panel covers the left third and fades out before his shoulder.
 * The TikTok plays from 0 in a phone on the left; marker doodles: face circled at ~1.6 s (tracked), note
 * "her friend just told her" + arrow, then the clip's own caption "Stunk for Years" underlined; credit chip.
 */
defineScene({
  name: 'open-tiktok', duration: 7.6, fps: 30, transparent: true,
  anchor: { special: 'tiktok-watch' },
  plan: { lane: 2, in: 0.45, duration: 7 }, sfx: [{ t: 0.5, kind: 'pop' }, { t: 1.55, kind: 'scribble' }, { t: 1.95, kind: 'scribble-short' }, { t: 2.55, kind: 'scribble-short' }, { t: 4.35, kind: 'scribble-short' }],
  assets: { tt: { video: 'videos/bad-breath-for-good/sources/tiktok-sarahsaysyes34-7684287675171491086.mp4', start: 0, fps: 30, width: 1080 } },
  setup(api) {
    const { P, W, H } = api;
    // left stage panel (static): near-black indigo, grid, glow behind the phone, soft edge into Ben's footage
    const S = 2, c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
    const g = c.getContext('2d'); g.scale(S, S);
    const x0 = 600, x1 = 960; // solid until x0, gone by x1
    const base = g.createLinearGradient(0, 0, x1, 0);
    base.addColorStop(0, 'rgba(11,10,24,1)'); base.addColorStop(x0 / x1, 'rgba(13,11,28,0.97)');
    base.addColorStop((x0 + 120) / x1, 'rgba(13,11,28,0.78)'); base.addColorStop((x0 + 250) / x1, 'rgba(13,11,28,0.3)'); base.addColorStop(1, 'rgba(13,11,28,0)');
    g.fillStyle = base; g.fillRect(0, 0, x1, H);
    const glow = g.createRadialGradient(330, 520, 40, 330, 520, 620); glow.addColorStop(0, 'rgba(124,92,255,0.30)'); glow.addColorStop(1, 'rgba(124,92,255,0)');
    g.fillStyle = glow; g.fillRect(0, 0, x1, H);
    // grid, faded with the panel
    const gc = document.createElement('canvas'); gc.width = x1 * S; gc.height = H * S; const gg = gc.getContext('2d'); gg.scale(S, S);
    gg.strokeStyle = 'rgba(167,139,250,0.10)'; gg.lineWidth = 1; gg.beginPath();
    for (let x = 30; x < x1; x += 60) { gg.moveTo(x, 0); gg.lineTo(x, H); }
    for (let y = 0; y < H; y += 60) { gg.moveTo(0, y); gg.lineTo(x1, y); }
    gg.stroke();
    gg.globalCompositeOperation = 'destination-in'; const m = gg.createLinearGradient(0, 0, x1, 0); m.addColorStop(0, '#000'); m.addColorStop(x0 / x1, '#000'); m.addColorStop(0.9, 'rgba(0,0,0,0)'); gg.fillStyle = m; gg.fillRect(0, 0, x1, H);
    g.drawImage(gc, 0, 0, x1, H);
    this.panel = c;
    // mask for the clip's ambient light: solid under the phone, fading out with the panel's soft edge
    const mk = document.createElement('canvas'); mk.width = 480; mk.height = 540; const mg = mk.getContext('2d');
    const mgr = mg.createLinearGradient(0, 0, 480, 0); mgr.addColorStop(0, 'rgba(0,0,0,1)'); mgr.addColorStop(0.6, 'rgba(0,0,0,0.9)'); mgr.addColorStop(1, 'rgba(0,0,0,0)');
    mg.fillStyle = mgr; mg.fillRect(0, 0, 480, 540); this.ambMask = mk;
    this.phone = OV.makePhone(api, 44, 24, 580, 1032);
    this.dust = Array.from({ length: 26 }, (_, i) => { const r = api.rand('dust' + i); return { x: r() * 640, y: r() * H, s: 1.5 + r() * 3.5, v: 6 + r() * 14, a: 0.12 + r() * 0.25, ph: r() * 6.28 }; });
  },
  draw(ctx, t, api) {
    const { P, prog, ease, clamp, env, pop, W, H } = api;
    ctx.drawImage(this.panel, 0, 0, W, H);
    // the clip's colours spill softly onto the stage around the phone (ambient light)
    OV.ambient(ctx, api, api.video('tt'), { x: 0, y: 0, w: 960, h: 1080 }, { alpha: 0.34, mask: this.ambMask });
    // drifting dust on the panel (everything moves)
    for (const d of this.dust) {
      const y = ((d.y - t * d.v) % H + H) % H, x = d.x + Math.sin(t * 0.7 + d.ph) * 8;
      ctx.fillStyle = `rgba(200,185,255,${d.a * (0.6 + 0.4 * Math.sin(t * 1.3 + d.ph))})`; ctx.beginPath(); ctx.arc(x, y, d.s, 0, 7); ctx.fill();
    }
    // slow push-in on the phone and everything attached to it
    const z = 1 + 0.03 * ease.inOutSine(clamp(t / 7.43));
    ctx.save(); ctx.translate(334, 540); ctx.scale(z, z); ctx.translate(-334, -540);
    let map = null;
    this.phone.draw(ctx, (sc) => {
      const img = api.video('tt');
      map = OV.cover(ctx, img, sc, { iw: 1080, ih: 1920 });
    });

    // 1) her face circled at ~1.6 s, tracking her head (face centre in video u,v measured from the clip)
    const face = OV.track([[1.4, 0.65, 0.33], [1.8, 0.66, 0.345], [2.0, 0.64, 0.355], [2.25, 0.625, 0.35], [2.5, 0.625, 0.335], [2.75, 0.66, 0.33], [3.0, 0.63, 0.31], [3.25, 0.6, 0.285], [3.5, 0.53, 0.28]], t);
    const [fx, fy] = map.at(face[0], face[1]);
    const fadeA = 1 - prog(t, 3.42, 0.26, ease.inCubic);
    ctx.save(); ctx.globalAlpha *= fadeA;
    OV.mark(ctx, api, 'circle', [fx, fy, 172, 150], prog(t, 1.55, 0.55, ease.inOutCubic), { width: 10, seed: 5, start: -2.6 });
    // arrow from the note to the circle
    OV.mark(ctx, api, 'arrow', [712, 226, fx + 150, fy - 70], prog(t, 2.55, 0.42, ease.inOutCubic), { width: 8, seed: 12, bend: -26, head: 26 });
    ctx.restore();

    // 2) the clip's own caption: "Stunk for Years" double-underlined (u 0.298-0.611, baseline v 0.758)
    const [ux0, uy] = map.at(0.29, 0.772), [ux1] = map.at(0.62, 0.772);
    OV.mark(ctx, api, 'underline', [ux0, ux1, uy], prog(t, 4.35, 0.35, ease.inOutCubic), { width: 7, seed: 21 });
    OV.mark(ctx, api, 'underline', [ux0 + 14, ux1 - 6, uy + 13], prog(t, 4.62, 0.3, ease.inOutCubic), { width: 6, seed: 27 });

    // 3) credit chip, bottom-left of the phone
    api.label(ctx, '@sarahsaysyes34 · 9.2M VIEWS', 78, 986, { p: pop(t, 0.5, 0.5), size: 34, upper: false, rotate: -0.02 });
    ctx.restore();

    // 4) handwritten note beside the phone
    OV.hand(ctx, api, 'her friend', 668, 128, prog(t, 1.95, 0.36, ease.linear), { size: 62, rotate: -0.05 });
    OV.hand(ctx, api, 'just told her', 690, 198, prog(t, 2.22, 0.42, ease.linear), { size: 62, rotate: -0.05 });
  },
});
