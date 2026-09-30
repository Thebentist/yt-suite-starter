// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// recap (phase 2): words 4614-4640 "But now you know the spots that you need to clean to kind of help get it out of the way, at least a
// little bit better."  The three stops of the trip, in real 3D: a fast montage (back of the tongue on "spots", between the teeth on
// "that", the tonsils on "need"), then on "clean" all three land side by side as lit panels with lime checks.
const TONGUE_X = `${STORYGL.TONGUE_FN}
float mapExtra(vec3 p, out float mat){ mat = 30.; return sdTongue(p); }
vec3 gTA; float gTS;
void normalHook(float mat, vec3 p, inout vec3 n){ gTA = tongueShade(p, n, gTS); }
vec4 albedoExtra(float mat, vec3 p, vec3 n){ return vec4(gTA, gTS); }`;
const TEETH_X = `${STORYGL.TEETH_FN}
float mapExtra(vec3 p, out float mat){ float gum; float d = sdTeeth(p, gum); mat = gum > 1.5 ? 53. : gum > 0.5 ? 51. : 50.; return d; }
vec4 albedoExtra(float mat, vec3 p, vec3 n){ if (mat < 50.5) return vec4(0.95, 0.92, 0.86, 2.2); if (mat < 51.5) return vec4(0.78, 0.32, 0.4, 1.8); return vec4(0.62, 0.16, 0.24, 3.); }`;
const THROAT_X = `${STORYGL.TONGUE_FN}
${STORYGL.THROAT_FN}
float mapExtra(vec3 p, out float mat){ float m; float d = sdThroat(p, m); mat = m; float tg = sdTongue(p); if (tg < d) { d = tg; mat = 30.; } return d; }
vec3 gTA; float gTS;
void normalHook(float mat, vec3 p, inout vec3 n){ if (mat < 30.5) gTA = tongueShade(p, n, gTS); }
vec4 albedoExtra(float mat, vec3 p, vec3 n){ if (mat < 30.5) return vec4(gTA, gTS); return throatAlbedo(mat, p); }`;
defineScene({
  name: 'recap',
  anchor: { word: 4614, offset: -0.15 },
  anchorEnd: { word: 4640, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    STORY.init(api);
    this.gT = api.gl.create(api, STORYGL.frag({ figs: 0, extra: TONGUE_X }), { res: 0.5, aa: 1, steps: 110 });
    this.gD = api.gl.create(api, STORYGL.frag({ figs: 0, extra: TEETH_X }), { res: 0.5, aa: 1, steps: 110 });
    this.gH = api.gl.create(api, STORYGL.frag({ figs: 0, extra: THROAT_X, lamp: true }), { res: 0.5, aa: 1, steps: 120 });
    this.bg = STORY.bokehField({ seed: 'recap', cols: ['#a78bfa', '#7c5cff', '#ff6fae', '#d7f34a'], n: 30, big: 60, glows: 4, top: '#120d22', mid: '#0b0918', bottom: '#050409' });
    this.panel = document.createElement('canvas'); this.panel.width = 1920; this.panel.height = 1080;
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const SPOTS = api.at(4619), THAT = api.at(4620), NEED = api.at(4622), CLEAN = api.at(4624);
    const sh = S.shot(t, [THAT - 0.04, NEED - 0.04, CLEAN - 0.04], api.duration), k = ease.inOutSine(sh.k);
    const base = Object.assign({}, G.RIG.studio, { uFillCol: [0.05, 0.03, 0.04], uExposure: 1, uAO: 1, uExtra: 1, uRimExtra: 0.4 });
    const renderView = (i, kk) => {
      if (i === 0) { const camO = { ro: [lerp(-0.3, 0.3, kk), 2.4, 1.5], ta: [0, -0.1, -0.35], focal: 2.2 }; return [this.gT.draw(Object.assign({}, base, { uKeyDir: [-0.9, 0.85, 0.35], uKeyCol: [0.8, 0.62, 0.55], uRimDir: [0.8, 0.5, -0.7], uRimCol: [0.35, 0.28, 0.7], uCoat: 0.9, uCoatCol: [0.84, 0.8, 0.52], uTongue: [1, 0, 0, 0] }, G.cam(camO))), camO]; }
      if (i === 1) { const camO = { ro: [lerp(1.2, 0.6, kk), 1.0, 3.2], ta: [0.2, 0.45, 0], focal: 2.2 }; return [this.gD.draw(Object.assign({}, base, { uKeyDir: [-0.4, 0.9, 0.7], uKeyCol: [0.9, 0.78, 0.72], uRimDir: [0.6, 0.4, -1], uRimCol: [0.55, 0.6, 1.3], uTeeth: [7, 0.06, 1, 1], uTeethPos: [0, 0, 0] }, G.cam(camO))), camO]; }
      const camO = { ro: [lerp(-0.1, 0.1, kk), 0.3, lerp(0.25, -0.05, kk)], ta: [0, 0.12, -2.6], focal: 1.6 };
      return [this.gH.draw(Object.assign({}, base, { uKeyDir: [0, 0.3, 1], uKeyCol: [0.2, 0.15, 0.15], uRimDir: [0, 0.5, -1], uRimCol: [0.3, 0.2, 0.4], uLampPos: [0, 0.45, 0.2], uLampCol: [4.5, 3.4, 2.9], uLamp2Pos: [0, 5, 5], uLamp2Col: [0, 0, 0], uStones: 1, uRimExtra: 0, uTongue: [1.2, 0, -0.55, -1.2] }, G.cam(camO))), camO];
    };
    const labels = ['BACK OF THE TONGUE', 'BETWEEN YOUR TEETH', 'TONSILS'];
    if (sh.i < 3) {
      ctx.fillStyle = '#07050b'; ctx.fillRect(0, 0, 1920, 1080);
      const [img, camO] = renderView(sh.i, k);
      ctx.drawImage(img, 0, 0, 1920, 1080);
      if (sh.i === 0) { const bc = G.project(camO, [0, 0.05, -0.55]); api.doodle.circle(ctx, bc[0], bc[1] + 30, 300, 130, prog(t, SPOTS, 0.4, ease.inOutCubic), { color: P.marker, width: 11, seed: 3 }); }
      api.label(ctx, labels[sh.i], 960, 960, { size: 64, align: 'center', p: pop(t, [SPOTS, THAT, NEED][sh.i], 0.35) });
      api.text(ctx, String(sh.i + 1), 120, 180, { size: 110, color: P.lime, alpha: 0.9 });
    } else {
      S.bokeh(ctx, this.bg, -sh.local * 15, 0, 1.05);
      api.text(ctx, 'THE SPOTS YOU NEED TO CLEAN', 960, 190, { size: 78, align: 'center', tracking: 3, color: P.ink, shadow: true, alpha: prog(t, CLEAN - 0.1, 0.3) });
      const W = 540, H = 560, gap = 44, x0 = 960 - (3 * W + 2 * gap) / 2, y0 = 280;
      for (let i = 0; i < 3; i++) {
        const [img] = renderView(i, 0.5 + 0.5 * k);
        const g = this.panel.getContext('2d'); g.clearRect(0, 0, 1920, 1080); g.drawImage(img, 0, 0, 1920, 1080);
        const p = prog(t, CLEAN - 0.04 + i * 0.09, 0.4, ease.outBack), x = x0 + i * (W + gap);
        if (p <= 0) continue;
        ctx.save(); ctx.globalAlpha = clamp(p * 2); ctx.translate(x + W / 2, y0 + H / 2 + (1 - p) * 60); ctx.scale(0.92 + 0.08 * p, 0.92 + 0.08 * p); ctx.translate(-(x + W / 2), -(y0 + H / 2));
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; api.roundRect(ctx, x, y0, W, H, 22); ctx.fillStyle = '#07050b'; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.save(); api.roundRect(ctx, x, y0, W, H, 22); ctx.clip(); const sc = H / 1080 * 1.35; ctx.drawImage(this.panel, x + W / 2 - 960 * sc, y0 + H / 2 - 540 * sc, 1920 * sc, 1080 * sc); ctx.restore();
        ctx.strokeStyle = 'rgba(215,243,74,0.6)'; ctx.lineWidth = 2; api.roundRect(ctx, x, y0, W, H, 22); ctx.stroke();
        api.text(ctx, labels[i], x + W / 2, y0 + H + 70, { size: 44, align: 'center', color: P.ink, tracking: 1 });
        const cb = pop(t, CLEAN + 0.35 + i * 0.12, 0.4);
        if (cb > 0) { ctx.translate(x + W - 30, y0 + 30); ctx.scale(cb, cb); ctx.fillStyle = P.lime; ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill(); api.doodle.check(ctx, 0, 2, 18, 1, { color: P.black, width: 9, wobble: 0.5, passes: 1 }); }
        ctx.restore();
      }
    }
    S.artistic(ctx);
    api.finish(ctx, t, { bloom: 0.3, grain: 0.055, vignette: 0.5 });
  },
});
