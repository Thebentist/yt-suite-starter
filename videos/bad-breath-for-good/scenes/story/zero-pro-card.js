// @use videos/bad-breath-for-good/scenes/story/_lib.js
// zero-pro-card (phase 2): words 3302-3329 "Because what we've done is we've taken that activated oil system, those nano lipid emulsions and
// we've actually put it in our toothpaste, and it's called Zero Pro."  The AD chip (overlay group) sits on top.
// Four cuts: real-3D iridescent oil droplets drifting in the dark (ACTIVATED OIL SYSTEM) -> macro, the droplets fill the frame (NANO LIPID
// EMULSIONS) -> "put it in our toothpaste": Ben's own product photo (Something Nice, Zero Pro tube with molecules) in its bright teal
// world, slow push -> "it's called Zero Pro": back in our dark world, the box-and-tube photo as a lit card, ZERO PRO in plain type.
// On-screen words are only Ben's. Product photos: videos/bad-breath-for-good/assets/somethingnice/ (see its README.md).
const DROPS = `
uniform vec3 uRo, uTa; uniform float uFocal, uDrift;
float map(vec3 p){
  vec3 q = p + vec3(0., uDrift, 0.);
  vec3 c = floor(q / 1.6); vec3 h = hash33(c);
  vec3 lq = q - c * 1.6;                                   // position inside the cell
  float cellD = min(min(min(lq.x, 1.6 - lq.x), min(lq.y, 1.6 - lq.y)), min(lq.z, 1.6 - lq.z)) + 0.05;
  if (h.y > 0.5) return cellD;                             // about half the cells are empty
  vec3 o = (c + 0.5) * 1.6 + (h - 0.5) * 0.4 + 0.08 * vec3(sin(uTime * 0.7 + h.x * 6.), cos(uTime * 0.6 + h.y * 6.), sin(uTime * 0.5 + h.z * 6.));
  float r = 0.14 + 0.24 * h.x;
  return min(length(q - o) - r, cellD + 0.3);
}
#include <raymarch>
vec3 render(vec2 fc){
  vec2 uv = (2. * fc - uRes) / uRes.y;
  mat3 cam = camMat(uRo, uTa, 0.);
  vec3 rd = cam * normalize(vec3(uv, uFocal));
  vec3 bg = mix(vec3(0.01, 0.012, 0.03), vec3(0.03, 0.035, 0.07), 0.5 + 0.5 * uv.y);
  float t = march(uRo, rd, 16.);
  if (t < 0.) return bg;
  vec3 p = uRo + rd * t, n = calcNormal(p);
  float ndv = clamp(dot(n, -rd), 0., 1.), fr = fresnel(ndv, 0.04);
  // thin-film interference: the colour shifts with the viewing angle (oil on water)
  float film = 1.6 * (1. - ndv) + 0.35 * noise3(p * 3. + uTime * 0.2);
  vec3 irid = 0.5 + 0.5 * cos(6.2832 * (film + vec3(0.0, 0.33, 0.67)));
  vec3 L = normalize(vec3(-0.5, 0.8, 0.6));
  float sp = pow(clamp(dot(reflect(rd, n), L), 0., 1.), 120.) * 6.;
  vec3 col = vec3(0.02, 0.05, 0.06) + irid * (1.6 * fr + 0.6 * pow(1. - ndv, 3.)) + vec3(1.) * sp + vec3(0.25, 0.9, 0.85) * pow(1. - ndv, 5.) * 0.5;
  col += vec3(0.05, 0.08, 0.1) * clamp(dot(n, L), 0., 1.);
  col = mix(col, bg, 1. - exp(-0.018 * t * t));
  return col;
}`;
defineScene({
  name: 'zero-pro-card',
  anchor: { word: 3302, offset: -0.15 },
  anchorEnd: { word: 3329, edge: 'end', offset: 0.25 },
  tail: 0.5,
  assets: {
    tube: { image: 'videos/bad-breath-for-good/assets/somethingnice/zero-pro-toothpaste/02-ZeroPro-PDP-02-1.png' },
    box: { image: 'videos/bad-breath-for-good/assets/somethingnice/zero-pro-toothpaste/01-ZeroPro-PDP-01-SSS_739d6fd2-ac22-4fa7-a42b-e922e158ab03.png' },
  },
  setup(api) {
    STORY.init(api); this.g = api.gl.create(api, DROPS, { res: 0.5, aa: 1, steps: 90 });
    // the hero photo with feathered edges, so it melts into its own blurred background
    const c = document.createElement('canvas'); c.width = c.height = 1080; const g = c.getContext('2d'); g.drawImage(api.image('tube'), 0, 0, 1080, 1080);
    g.globalCompositeOperation = 'destination-in'; const m = g.createRadialGradient(540, 540, 330, 540, 540, 560); m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, 1080, 1080);
    this.tubeSoft = c;
  },
  draw(ctx, t, api) {
    const S = STORY, { P, ease, prog, clamp, pop, lerp } = api;
    const ACT = api.at(3310), OIL = api.at(3311), SYS = api.at(3312), NANO = api.at(3314), LIPID = api.at(3315), EMUL = api.at(3316), PUT = api.at(3320), TOOTH = api.at(3324), ITS = api.at(3326), ZERO = api.at(3328), PRO = api.at(3329);
    const sh = S.shot(t, [NANO - 0.05, PUT - 0.05, ITS - 0.05], api.duration), k = ease.inOutSine(sh.k);
    const words = (list, y, size, color) => {
      const ws = list.map(([w]) => api.measure(ctx, w, { size, tracking: 4 })), tot = ws.reduce((a, b) => a + b, 0) + 34 * (list.length - 1);
      let x = 960 - tot / 2;
      list.forEach(([w, at], i) => { const p = prog(t, at - 0.04, 0.32, ease.outCubic); if (p > 0) { ctx.save(); ctx.beginPath(); ctx.rect(x - 10, y - size * 0.95, ws[i] + 20, size * 1.15); ctx.clip(); api.text(ctx, w, x, y + (1 - p) * size * 0.9, { size, tracking: 4, color, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 30 }); ctx.restore(); } x += ws[i] + 34; });
    };
    if (sh.i < 2) {
      const camO = sh.i === 0 ? { ro: [lerp(-0.5, 0.5, k), 0.2, lerp(6, 5.2, k)], ta: [0, 0, 0] } : { ro: [lerp(0.8, 0.5, k), 0.5, lerp(1.6, 1.2, k)], ta: [0, 0.2, -1] };
      ctx.drawImage(this.g.draw({ uTime: t, uRo: camO.ro, uTa: camO.ta, uFocal: sh.i === 0 ? 1.8 : 2.4, uDrift: t * 0.25 }), 0, 0, 1920, 1080);
      if (sh.i === 0) words([['ACTIVATED', ACT], ['OIL', OIL], ['SYSTEM', SYS]], 590, 120, P.ink);
      else words([['NANO', NANO], ['LIPID', LIPID], ['EMULSIONS', EMUL]], 590, 120, '#e9ffc0');
      S.artistic(ctx);
    } else if (sh.i === 2) {
      // Ben's product photo in its own bright world: a blurred full-bleed copy behind, the sharp square on top, slow push
      const img = api.image('tube'), z = lerp(1.0, 1.05, k);
      ctx.save(); ctx.filter = 'blur(40px) saturate(1.1)'; ctx.drawImage(img, -200, -620, 2320, 2320); ctx.restore();
      ctx.save(); ctx.translate(960, 540); ctx.scale(z, z); ctx.drawImage(this.tubeSoft, -540, -540, 1080, 1080); ctx.restore();
      const lk = ctx.createRadialGradient(1700, 80, 0, 1700, 80, 900); lk.addColorStop(0, 'rgba(255,255,255,0.35)'); lk.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = lk; ctx.fillRect(0, 0, 1920, 1080);
      api.label(ctx, 'IN OUR TOOTHPASTE', 110, 960, { size: 54, p: pop(t, TOOTH - 0.1, 0.45) });
    } else {
      // our dark world: the box-and-tube photo as a lit card, the name in plain type
      const bg = ctx.createRadialGradient(700, 540, 50, 960, 540, 1200); bg.addColorStop(0, '#1d2a3a'); bg.addColorStop(1, '#05060b'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1920, 1080);
      S.glow(ctx, 640, 540, 700, '#5ce1d6', 0.35);
      const cp = prog(t, ITS - 0.05, 0.45, ease.outCubic), tilt = lerp(-0.05, -0.02, k);
      ctx.save(); ctx.translate(640, 560 + (1 - cp) * 60); ctx.rotate(tilt); ctx.scale(lerp(0.96, 1.0, k), lerp(0.96, 1.0, k)); ctx.globalAlpha = cp;
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 30; api.roundRect(ctx, -380, -380, 760, 760, 26); ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.save(); api.roundRect(ctx, -380, -380, 760, 760, 26); ctx.clip(); ctx.drawImage(api.image('box'), -380, -380, 760, 760); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; api.roundRect(ctx, -380, -380, 760, 760, 26); ctx.stroke();
      ctx.restore();
      const zp = prog(t, ZERO - 0.03, 0.4, ease.outCubic), pp = prog(t, PRO - 0.03, 0.4, ease.outCubic);
      api.text(ctx, "IT'S CALLED", 1130, 400, { size: 46, tracking: 12, color: 'rgba(244,241,234,0.6)', alpha: prog(t, ITS, 0.35) });
      if (zp > 0) api.text(ctx, 'ZERO', 1120, 600 + (1 - zp) * 40, { size: 220, tracking: 14, color: '#ffffff', alpha: zp, glow: 'rgba(255,255,255,0.35)', glowBlur: 36 });
      if (pp > 0) api.text(ctx, 'PRO', 1120, 800 + (1 - pp) * 40, { size: 220, tracking: 14, color: '#ffffff', alpha: pp, glow: 'rgba(255,255,255,0.35)', glowBlur: 36 });
      const ul = prog(t, PRO + 0.05, 0.4, ease.inOutCubic);
      if (ul > 0) { ctx.save(); ctx.fillStyle = P.lime; ctx.shadowColor = P.lime; ctx.shadowBlur = 20; api.roundRect(ctx, 1124, 840, 620 * ul, 12, 6); ctx.fill(); ctx.restore(); }
      api.text(ctx, 'SOMETHING NICE', 1128, 910, { size: 32, tracking: 8, color: P.faint, alpha: prog(t, PRO + 0.2, 0.4) });
    }
    api.finish(ctx, t, { bloom: sh.i === 2 ? 0.12 : 0.3, grain: 0.05, vignette: sh.i === 2 ? 0.2 : 0.5 });
  },
});
