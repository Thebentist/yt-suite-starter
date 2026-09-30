// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// teeth-belief (NEW, phase 2): words 1271-1289 "And you really, you think it would be your teeth because that's what we've been told our whole
// lives."  Fills the gap between tongue/coated-tongue (ends w1270 end +0.25) and data/belgium-globe (starts w1290 -0.15).
// Three cuts: real-3D teeth in low, cool light, a "?" hanging over them ("you think it would be") -> "your teeth": a hero gleam sweeps
// the enamel -> "that's what we've been told our whole lives": the same teeth on an old CRT television, graded like an archival ad,
// scanlines and roll; "our whole lives" in marker. No invented slogans on screen.
const TEETH_X = `${STORYGL.TEETH_FN}
uniform float uGleam;
float mapExtra(vec3 p, out float mat){ float gum; float d = sdTeeth(p, gum); mat = gum > 1.5 ? 53. : gum > 0.5 ? 51. : 50.; return d; }
vec4 albedoExtra(float mat, vec3 p, vec3 n){ if (mat < 50.5) return vec4(vec3(0.95, 0.92, 0.86) + uGleam * 0.3 * smoothstep(0.3, 0., abs(p.x - mix(-4., 4., fract(uTime * 0.0) + uGleam))), 2.4 + uGleam * 3.); if (mat < 51.5) return vec4(0.78, 0.32, 0.4, 1.8); return vec4(0.62, 0.16, 0.24, 3.); }`;
defineScene({
  name: 'teeth-belief',
  anchor: { word: 1270, edge: 'end', offset: 0.25 },
  anchorEnd: { word: 1290, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    STORY.init(api);
    this.g = api.gl.create(api, STORYGL.frag({ figs: 0, extra: TEETH_X }), { res: 0.5, aa: 1, steps: 110 });
    this.bg = STORY.bokehField({ seed: 'teeth', cols: ['#5cc8ff', '#a78bfa', '#7c5cff'], n: 30, big: 60, glows: 4, top: '#0e1024', mid: '#0a0a18', bottom: '#050409' });
    this.tv = document.createElement('canvas'); this.tv.width = 1920; this.tv.height = 1080;
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const THINK = api.at(1275), YOUR = api.at(1279), TEETH = api.at(1280), THATS = api.at(1282), TOLD = api.at(1286), WHOLE = api.at(1288), LIVES = api.at(1289);
    const sh = S.shot(t, [YOUR - 0.04, THATS - 0.04], api.duration), k = ease.inOutSine(sh.k);
    const gleam = sh.i === 1 ? prog(t, TEETH - 0.1, 0.9, ease.inOutSine) : 0;
    const camO = sh.i === 0 ? { ro: [lerp(-1.6, -0.8, k), 1.6, 4.6], ta: [0, 0.5, 0], focal: 2.1 } : sh.i === 1 ? { ro: [lerp(1.1, 0.6, k), 0.95, 2.5], ta: [0.1, 0.55, 0], focal: 2.3 } : { ro: [0, 1.3, 5.2], ta: [0, 0.4, 0], focal: 2.1 };
    const u = Object.assign({}, G.RIG.studio, { uKeyDir: sh.i === 0 ? [-0.3, 0.6, 1] : [-0.5, 0.9, 0.7], uKeyCol: sh.i === 0 ? [0.35, 0.4, 0.55] : [0.95, 0.85, 0.8], uRimDir: [0.6, 0.4, -1], uRimCol: [0.55, 0.6, 1.3], uFillCol: [0.04, 0.035, 0.05], uExposure: 1, uAO: 1, uExtra: 1, uRimExtra: 0.5,
      uTeeth: [7, 0.02, 1, 1], uTeethPos: [0, 0, 0], uGleam: gleam }, G.cam(camO));
    const img = this.g.draw(u);
    if (sh.i < 2) {
      S.bokeh(ctx, this.bg, -sh.local * 20, 0, 1.05);
      ctx.drawImage(img, 0, 0, 1920, 1080);
      if (sh.i === 0) { const qp = pop(t, THINK - 0.1, 0.45); if (qp > 0) { ctx.save(); ctx.translate(1320, 170 + Math.sin(t * 2.5) * 10); ctx.scale(qp, qp); ctx.rotate(Math.sin(t * 2) * 0.08); S.type(ctx, '?', 0, 90, 1, { size: 280, color: '#fbf7f0', side: '#3a2470', depth: 12, glow: '#a78bfa' }); ctx.restore(); } }
      if (sh.i === 1) {
        for (let i = 0; i < 7; i++) { const q = G.project(camO, [-2.85 + i * 0.97, 1.0, 0.32]); S.sparkle(ctx, q[0], q[1], 34, clamp((gleam * 1.3 - i * 0.12)), '#ffffff'); }
        api.label(ctx, 'YOUR TEETH', 960, 950, { size: 70, align: 'center', p: pop(t, TEETH, 0.45) });
      }
      S.artistic(ctx);
    } else {
      // ---- the archival look: the teeth on an old CRT set in a dark room
      ctx.fillStyle = '#080609'; ctx.fillRect(0, 0, 1920, 1080);
      S.glow(ctx, 960, 520, 900, '#6a8cff', 0.25 + 0.04 * Math.sin(t * 20));
      const z = lerp(1.08, 1.0, ease.outCubic(clamp(sh.local / 1.2)));
      ctx.save(); ctx.translate(960, 540); ctx.scale(z, z); ctx.translate(-960, -540);
      // cabinet
      S.solid(ctx, (g) => api.roundRect(g, 380, 140, 1160, 860, 60), { color: '#3a2a22', light: '#5a4032', dark: '#1a120e', bounds: [380, 140, 1160, 860], rim: '#8a6a55', rimW: 4, sBlur: 60, sY: 20 });
      ctx.fillStyle = '#120d0c'; api.roundRect(ctx, 440, 200, 830, 640, 70); ctx.fill();
      // the screen content, graded and scan-lined
      const tg = this.tv.getContext('2d'); tg.clearRect(0, 0, 1920, 1080);
      tg.fillStyle = '#1a1a24'; tg.fillRect(0, 0, 1920, 1080);
      tg.filter = 'sepia(0.55) saturate(0.75) contrast(1.25) brightness(1.1)'; tg.drawImage(img, 0, 0, 1920, 1080); tg.filter = 'none';
      tg.fillStyle = 'rgba(0,0,0,0.28)'; for (let y = 0; y < 1080; y += 6) tg.fillRect(0, y, 1920, 2);
      const roll = ((t * 0.35) % 1) * 1300 - 200; const rb = tg.createLinearGradient(0, roll, 0, roll + 160); rb.addColorStop(0, 'rgba(255,255,255,0)'); rb.addColorStop(0.5, 'rgba(255,255,255,0.1)'); rb.addColorStop(1, 'rgba(255,255,255,0)'); tg.fillStyle = rb; tg.fillRect(0, roll, 1920, 160);
      ctx.save(); api.roundRect(ctx, 470, 230, 770, 580, 90); ctx.clip();
      ctx.drawImage(this.tv, 470 - 90, 230 - 40, 950, 534 * 950 / 950 + 120);
      const vg = ctx.createRadialGradient(855, 520, 150, 855, 520, 520); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)'); ctx.fillStyle = vg; ctx.fillRect(470, 230, 770, 580);
      const gl = ctx.createLinearGradient(470, 230, 900, 700); gl.addColorStop(0, 'rgba(255,255,255,0.14)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(470, 230, 770, 580);
      ctx.restore();
      // knobs + speaker grille
      for (const [y, r] of [[330, 46], [470, 46]]) S.solid(ctx, (g) => { g.beginPath(); g.arc(1400, y, r, 0, Math.PI * 2); }, { color: '#2a2a2e', light: '#6a6a70', dark: '#0e0e10', bounds: [1400 - r, y - r, 2 * r, 2 * r], rim: '#9a9aa0', rimW: 3, sBlur: 12 });
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(1330, 600 + i * 26); ctx.lineTo(1470, 600 + i * 26); ctx.stroke(); }
      ctx.restore();
      api.doodle.text(ctx, 'our whole lives', 1540, 950, prog(t, WHOLE - 0.1, 0.5), { size: 78, color: P.lime, align: 'center', rotate: -0.05, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 10 });
      api.doodle.arrow(ctx, 1450, 900, 1250, 760, prog(t, LIVES - 0.1, 0.4, ease.inOutCubic), { color: P.lime, width: 8, bend: -40, seed: 6 });
    }
    api.finish(ctx, t, { bloom: 0.32, grain: sh.i === 2 ? 0.09 : 0.055, vignette: 0.55 });
  },
});
