// @use videos/bad-breath-for-good/scenes/throat/_lib.js
// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js
/* flosser-b (words 4033-4120, with cuts): "A normal water flosser is very high pressured and will hurt and damage your
 * tonsils. Ours is a very soft flow on the tonsil stone mode. But if you're gonna do it, do it on the lowest setting,
 * use the tonsil stone mode"
 * Ben's own product (Something Nice AquaClean Duo), with the store's real photos (assets/somethingnice/). The store's
 * baked-in copy is left out, so the only words on screen are Ben's. Shots cut on the words:
 *   1 start   3D: a normal flosser's hard jet blasts the tonsil (NORMAL WATER FLOSSER, HIGH PRESSURE)
 *   2 "hurt"  closer: it reddens and flinches ("ouch!")
 *   3 "Ours"  the real AquaClean Duo and its box (logo), lit in a bright soft-box pool that fades into our dark stage
 *             (SOFT FLOW)
 *   4 "flow"  the device in hand, its blue light on, the photo feathered into the dark with a lavender glow
 *             (TONSIL STONE MODE)
 *   5 "But"   a dial turning down to the lowest mark over the out-of-focus tonsil (LOWEST SETTING)
 *   6 "use"   the tonsil nozzle photo keyed off its white background, floating on the dark stage (TONSIL STONE MODE) */
const SN = 'videos/bad-breath-for-good/assets/somethingnice/';
defineScene({
  name: 'flosser-b',
  anchor: { word: 4033, offset: -0.15 },
  anchorEnd: { word: 4120, edge: 'end', offset: 0.25 },
  tail: 0.5,
  assets: {
    box: { image: SN + 'aquaclean-duo/01-ACD_PDP_01.png' },
    hand: { image: SN + 'aquaclean-duo/03-ACD_PDP_09.png' },
    refill: { image: SN + 'nozzle-refill-pack/01-Angle_4_purple.jpg' },
  },
  setup(api) {
    this.ton = window.THROAT3D.world3(api, 'TONSIL', { steps: 140 });
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    // device in hand: cover the store's "Built-in UV Sterilization" line (x 660-990, y 745-880) with the plain backdrop
    // from just below it, then feather the whole photo into a soft circle so no square edge ever shows
    const feather = (img, cx, cy, r0, r1, patch, dark) => {
      const c = mk(img.width, img.height), g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      if (patch) g.drawImage(img, patch[0], patch[1], patch[2], patch[3], patch[4], patch[5], patch[2], patch[3]);
      if (dark) {   // grade the studio backdrop down into our stage colour toward the edges (the subject stays untouched)
        g.globalCompositeOperation = 'multiply';
        const v = g.createRadialGradient(cx, cy, dark[0], cx, cy, dark[1]); v.addColorStop(0, '#ffffff'); v.addColorStop(0.55, '#8f84b8'); v.addColorStop(1, '#221a42');
        g.fillStyle = v; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over';
      }
      g.globalCompositeOperation = 'destination-in';
      const m = g.createRadialGradient(cx, cy, r0, cx, cy, r1); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over';
      return c;
    };
    this.hand = feather(api.image('hand'), 480, 440, 380, 530, [650, 885, 380, 150, 650, 738], [230, 500]);
    this.box = feather(api.image('box'), 540, 520, 440, 520);
    // the purple refill nozzles, keyed off their pure-white background (alpha from how far each pixel is from white)
    const r = api.image('refill'), K = 1500, kc = mk(K, K), kg = kc.getContext('2d', { willReadFrequently: true });
    kg.drawImage(r, 0, 0, K, K);
    const id = kg.getImageData(0, 0, K, K), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const m = Math.min(d[i], d[i + 1], d[i + 2]), a = Math.min(1, Math.max(0, (250 - m) / 60));
      if (a <= 0) { d[i + 3] = 0; continue; }
      for (let ch = 0; ch < 3; ch++) d[i + ch] = Math.max(0, Math.min(255, (d[i + ch] - 255 * (1 - a)) / a));
      d[i + 3] = Math.round(a * 255);
    }
    kg.putImageData(id, 0, 0); this.keyed = kc;
  },
  draw(ctx, t, api) {
    const TH = window.THROAT, T3 = window.THROAT3D, { P, prog, pop, ease, env, clamp, lerp } = api;
    const W = (i, o = 0) => api.at(i, o);
    const tNormal = W(4034), tHigh = W(4039), tHurt = W(4043), tDamage = W(4045), tOurs = W(4048), tSoft = W(4052), tFlow = W(4053), tTonsil2 = W(4056),
      tBut = W(4104), tLowest = W(4114), tUse = W(4116), tTonsil3 = W(4118);
    const sh = T3.shot(t, [{ t: -1, n: 'jet' }, { t: tHurt, n: 'hurt' }, { t: tOurs, n: 'box' }, { t: tFlow, n: 'hand' }, { t: tBut, n: 'dial' }, { t: tUse, n: 'nozzle' }]);
    const lt = sh.lt, end = { jet: tHurt, hurt: tOurs, box: tFlow, hand: tBut, dial: tUse, nozzle: api.duration }[sh.n];
    const k = ease.inOutSine(clamp(lt / Math.max(0.4, end - sh.t)));
    const cr1 = T3.CRYPTS3[5];
    if (sh.n === 'box') {
      // a bright soft-box pool: pure white at the core (the photo's own white), lavender falloff, then our dark stage
      const z = 1 + 0.045 * k, cx = 960, cy = 545;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1150);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.56, '#ffffff'); g.addColorStop(0.68, '#e9e1fb'); g.addColorStop(0.76, '#8a74c9'); g.addColorStop(0.9, '#2a2150'); g.addColorStop(1, '#0b0a18');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(z, z);
      ctx.drawImage(this.box, -625, -625 - 10, 1250, 1250);
      ctx.restore();
      // a slow light sweep across the product
      const sw = lerp(-600, 2500, clamp(lt / 1.6));
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; const lg = ctx.createLinearGradient(sw - 300, 0, sw + 300, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.5)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, 1920, 1080); ctx.restore();
      TH.chip(ctx, api, 'SOFT FLOW', null, null, 1580, 930, pop(t, tSoft, 0.5), { size: 64, bg: '#8fd8ff' });
      api.finish(ctx, t, { bloom: 0.05, grain: 0.035, vignette: 0.35 });
      return;
    }
    if (sh.n === 'hand') {
      api.stage(ctx, { gridOffset: [-t * 10, -t * 5], c1: '#221a42' });
      TH.motes(ctx, t, { x: t * 30, y: 0 }, 30, 91);
      TH.glow(ctx, 900, 520, 700, 'rgba(167,139,250,0.35)');
      const z = 1.12 + 0.05 * k, s = 1.02 * z, cx = 900, cy = 520;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.drawImage(this.hand, -500, -450); ctx.restore();
      // the blue light glows (a touch of bloom on the light itself, not the whole photo)
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      TH.glow(ctx, cx + (495 - 500) * s, cy + (470 - 450) * s, 150 * s, `rgba(80,130,255,${0.3 + 0.1 * Math.sin(t * 4)})`);
      ctx.restore();
      TH.chip(ctx, api, 'TONSIL STONE MODE', null, null, 1500, 820, pop(t, tTonsil2, 0.5), { size: 64 });
      T3.bokeh(ctx, t, 93, 6, 0.8, [150, 180, 255]);
      api.finish(ctx, t, { bloom: 0.08, grain: 0.04, vignette: 0.45 });
      return;
    }
    if (sh.n === 'nozzle') {
      api.stage(ctx, { gridOffset: [-t * 10, -t * 5], c1: '#1d1638' });
      TH.motes(ctx, t, { x: t * 30, y: 0 }, 40, 95);
      TH.glow(ctx, 900, 540, 620, 'rgba(167,139,250,0.28)');
      const s = 0.62 + 0.03 * k, rot = -0.08 + 0.05 * k;
      ctx.save(); ctx.translate(900, 560 + 8 * Math.sin(t * 1.5)); ctx.rotate(rot); ctx.scale(s, s);
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 30;
      ctx.drawImage(this.keyed, -750, -750, 1500, 1500);
      ctx.restore();
      TH.glow(ctx, 720, 430, 260, `rgba(215,243,74,${0.14 * prog(t, tTonsil3 - 0.2, 0.5)})`);
      TH.chip(ctx, api, 'TONSIL STONE MODE', null, null, 1440, 820, pop(t, tTonsil3, 0.5), { size: 64 });
      T3.bokeh(ctx, t, 97, 7, 1, [190, 160, 255]);
      api.finish(ctx, t, { bloom: 0.2, grain: 0.05, vignette: 0.5 });
      return;
    }
    // ---- the 3D tonsil shots
    const cams = {
      jet: { ro: [0.4, 1.9, -2.6], ta: [0.3, -0.1, 0.3], fov: 1.8 },
      hurt: { ro: [1.5, 0.75, -0.9], ta: [0.9, -0.05, 0.35], fov: 1.7 },
      dial: { ro: [0.3, 2.2, -2.8], ta: [0.2, -0.2, 0.3], fov: 1.8 },
    };
    const b = cams[sh.n], push = 0.1 * k;
    const c = { ro: b.ro.map((v, i) => v + (b.ta[i] - v) * push), ta: b.ta, fov: b.fov };
    let flinch = 0; for (const h of [tHigh + 0.05, tHurt, tDamage]) flinch = Math.max(flinch, env(t, h, h + 0.4, 0.06, 0.3));
    const u = { uHead: 0.3, uWet: 0.5, uS0: [cr1[0], -0.02, cr1[1], 0.14], uSq: 0.3 * flinch,
      uRed: sh.n === 'hurt' ? 0.7 * prog(t, tHurt, 0.4) : sh.n === 'jet' ? 0.3 * flinch : 0, uScratch: sh.n === 'hurt' ? prog(t, tDamage, 0.35) : 0 };
    if (sh.n === 'dial') ctx.filter = 'blur(9px)';
    T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, u);
    ctx.filter = 'none';
    if (sh.n === 'jet' || sh.n === 'hurt') {
      const [ex, ey] = T3.project(c.ro, c.ta, c.fov, [0.2, 0, 0.25]);
      const jp = sh.n === 'jet' ? prog(t, tNormal - 0.1, 0.2) : 1;
      stream(ctx, sh.n === 'jet' ? -60 : 2000, sh.n === 'jet' ? 380 : 180, ex, ey, 12, t, jp);
      if (jp >= 1) {
        TH.glow(ctx, ex, ey, 120, 'rgba(255,70,80,0.45)');
        const r = TH.rng(Math.floor(t * 30));
        ctx.fillStyle = 'rgba(215,240,255,0.95)';
        for (let i = 0; i < 34; i++) { const a = -Math.PI * 0.15 - r() * Math.PI * 1.3, d = 20 + r() * 220; ctx.beginPath(); ctx.arc(ex + Math.cos(a) * d, ey + Math.sin(a) * d * 0.7, 2 + r() * 6, 0, Math.PI * 2); ctx.fill(); }
      }
      if (sh.n === 'jet') {
        TH.chip(ctx, api, 'NORMAL WATER FLOSSER', null, null, 480, 150, pop(t, tNormal, 0.5), { size: 54 });
        TH.chip(ctx, api, 'HIGH PRESSURE', null, null, 400, 260, pop(t, tHigh, 0.45), { size: 60, bg: P.red, color: '#ffffff' });
      } else api.doodle.text(ctx, 'ouch!', 1440, 260, prog(t, tHurt, 0.4, ease.linear), { color: P.marker, size: 96, align: 'center', rotate: 0.08, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 14 });
    }
    if (sh.n === 'dial') {
      ctx.fillStyle = 'rgba(8,6,18,0.3)'; ctx.fillRect(0, 0, 1920, 1080);
      const dp = pop(t, tBut + 0.1, 0.5);
      if (dp > 0) {
        const val = lerp(0.8, 0, ease.inOutCubic(clamp((t - tLowest + 0.1) / 0.6)));
        ctx.save(); ctx.translate(960, 500); ctx.scale(dp, dp);
        ctx.fillStyle = 'rgba(12,10,24,0.85)'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; api.roundRect(ctx, -260, -250, 520, 470, 32); ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; api.roundRect(ctx, -260, -250, 520, 470, 32); ctx.stroke();
        TH.icons.dial(ctx, 0, -20, 170, val);
        api.text(ctx, 'LOW', -190, 175, { size: 44, color: P.lime, align: 'center' }); api.text(ctx, 'HIGH', 190, 175, { size: 44, color: '#ff8a93', align: 'center' });
        ctx.restore();
        if (val < 0.05) api.doodle.check(ctx, 1270, 330, 56, prog(t, tLowest + 0.5, 0.3), { color: P.lime, width: 14, seed: 3 });
      }
      TH.chip(ctx, api, 'LOWEST SETTING', null, null, 960, 900, pop(t, tLowest, 0.5), { size: 64 });
    }
    T3.bokeh(ctx, t, 99, 6, 0.8);
    T3.artistic(ctx, api);
    api.finish(ctx, t, { bloom: 0.3, grain: 0.05, vignette: 0.5 });

    function stream(ctx, x0, y0, x1, y1, w, t, p) {
      if (p <= 0) return;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 30, ex = x0 + (x1 - x0) * p, ey = y0 + (y1 - y0) * p, cx = x0 + (mx - x0) * p, cy = y0 + (my - y0) * p;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,90,100,0.28)'; ctx.lineWidth = w * 2.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(230,246,255,0.95)'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      ctx.setLineDash([w * 1.2, w * 1.2]); ctx.lineDashOffset = -t * 900;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(2, w * 0.28); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      ctx.restore();
    }
  },
});
