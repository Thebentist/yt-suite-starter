// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* tiktok-callback (words 4737-4748: "because well, then they react like this and you start crying, so..."). OPAQUE full
 * screen. Timing from the cut (anchor/api.at); ends where end-question starts, word 4764 - 0.15.
 * The open's TikTok comes back in the same phone on the dark stage, slowed to 0.75x from 0.5 s of the clip (her
 * crying stretch; it ends before the camera whip at ~3.4 s). Her face is circled on "then", "don't wait / for this"
 * handwritten on "react like this", arrow to her on "you start crying".
 */
defineScene({
  name: 'tiktok-callback', fps: 30, transparent: false,
  anchor: { word: 4737, offset: -0.15 }, anchorEnd: { word: 4764, offset: -0.15 }, tail: 0.5,
  plan: { lane: 2 }, sfx: [{ t: 0, kind: 'whoosh-soft' }, { w: 4739, kind: 'scribble' }, { w: 4741, kind: 'scribble-short' }, { w: 4745, kind: 'scribble-short' }],
  assets: { tt: { video: 'videos/bad-breath-for-good/sources/tiktok-sarahsaysyes34-7684287675171491086.mp4', start: 0.5, rate: 0.75, fps: 40, width: 1080 } },
  async setup(api) {
    this.phone = OV.makePhone(api, 520, 24, 580, 1032);
    // static layers baked once at 2x: stage gradient + glow (under), vignette (over)
    const mk = () => { const c = document.createElement('canvas'); c.width = 3840; c.height = 2160; const g = c.getContext('2d'); g.scale(2, 2); return [c, g]; };
    const [bg, g1] = mk();
    api.stage(g1, { cx: 0.42, cy: 0.5, grid: false });
    const glow = g1.createRadialGradient(810, 540, 40, 810, 540, 700); glow.addColorStop(0, 'rgba(124,92,255,0.28)'); glow.addColorStop(1, 'rgba(124,92,255,0)');
    g1.fillStyle = glow; g1.fillRect(0, 0, 1920, 1080);
    this.bg = bg;
  },
  draw(ctx, t, api) {
    const { P, prog, ease, clamp, pop, lerp } = api, T = { then: api.at(4739), react: api.at(4741), this: api.at(4743), you: api.at(4745) };
    const SRC0 = 0.5, RATE = 0.75, src = SRC0 + t * RATE;
    ctx.drawImage(this.bg, 0, 0, 1920, 1080);
    // the clip's own colours as soft ambient light behind the phone (a huge, very soft blur of the current frame)
    OV.ambient(ctx, api, api.video('tt'), { x: 0, y: 0, w: 1920, h: 1080 }, { alpha: 0.34 });
    ctx.fillStyle = 'rgba(11,10,24,0.35)'; ctx.fillRect(0, 0, 1920, 1080);
    // drifting grid
    ctx.save(); ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.beginPath();
    const ox = (t * 14) % 60, oy = (t * 8) % 60;
    for (let x = ox; x < 1920; x += 60) { ctx.moveTo(x, 0); ctx.lineTo(x, 1080); }
    for (let y = oy; y < 1080; y += 60) { ctx.moveTo(0, y); ctx.lineTo(1920, y); }
    ctx.stroke(); ctx.restore();
    // phone slides back in from the left (where it lived in the open), settles, slow push
    const inP = prog(t, 0, 0.5, ease.outExpo);
    const z = 1 + 0.04 * ease.inOutSine(clamp(t / 3.6));
    ctx.save();
    ctx.translate(810, 540); ctx.scale(z, z); ctx.rotate(lerp(-0.1, -0.012, inP)); ctx.translate(-810 + lerp(-1150, 0, inP), -540);
    let map = null;
    this.phone.draw(ctx, (sc) => { map = OV.cover(ctx, api.video('tt'), sc, { iw: 1080, ih: 1920 }); });
    // face track, in clip seconds (measured from the clip)
    const face = OV.track([[0.5, 0.67, 0.33], [0.75, 0.69, 0.33], [1.0, 0.71, 0.37], [1.25, 0.69, 0.35], [1.5, 0.65, 0.33], [1.75, 0.67, 0.32],
      [2.0, 0.64, 0.355], [2.25, 0.625, 0.35], [2.5, 0.625, 0.335], [2.75, 0.66, 0.33], [3.0, 0.63, 0.31], [3.25, 0.6, 0.285]], src);
    const [fx, fy] = map.at(face[0], face[1]);
    OV.mark(ctx, api, 'circle', [fx, fy, 175, 152], prog(t, T.then, 0.5, ease.inOutCubic), { width: 11, seed: 9, start: -2.5 });
    api.label(ctx, '@sarahsaysyes34 · 9.2M VIEWS', 554, 986, { p: pop(t, 0.4, 0.5), size: 34, upper: false, rotate: -0.02 });
    // arrow from the note to the circle (drawn in phone space so it follows the push)
    OV.mark(ctx, api, 'arrow', [1250, 420, fx + 160, fy + 30], prog(t, T.you, 0.4, ease.inOutCubic), { width: 10, seed: 14, bend: 40, head: 30 });
    ctx.restore();
    OV.hand(ctx, api, "don't wait", 1240, 360, prog(t, T.react, 0.45, ease.linear), { size: 96, rotate: -0.05 });
    OV.hand(ctx, api, 'for this', 1300, 470, prog(t, T.this + 0.15, 0.4, ease.linear), { size: 96, rotate: -0.05 });
    OV.mark(ctx, api, 'underline', [1300, 1640, 492], prog(t, T.you + 0.3, 0.3, ease.inOutCubic), { width: 9, seed: 19, color: P.lime });
    api.finish(ctx, t, { bloom: 0.28, grain: 0.05, vignette: 0.5 });
  },
});
