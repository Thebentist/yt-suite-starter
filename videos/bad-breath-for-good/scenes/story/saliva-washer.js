// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// saliva-washer (phase 2): words 1509-1540 "And another thing, your spit is also a really big part of this. You see saliva is basically the power
// washer of your mouth. It's what's washing things down all day long."  Ends where sleep-saliva starts (w1541).
// Real-3D lower teeth, gum and tongue in macro, bits of gunk on the enamel. Four cuts: a glossy drop of saliva falls onto a tooth ("your
// spit") -> "saliva is basically": the row, SALIVA -> "power washer": a glowing jet blasts the gunk off tooth by tooth -> "washing things
// down": wide, a sheen of saliva runs down over clean teeth, "all day long".
const MOUTH = `${STORYGL.TEETH_FN}
${STORYGL.TONGUE_FN}
uniform vec4 uDrop;   // xyz position, w radius (0 = none)
float mapExtra(vec3 p, out float mat){
  float gum; float d = sdTeeth(p, gum); mat = gum > 1.5 ? 53. : gum > 0.5 ? 51. : 50.;
  float tg = sdTongue(p); if (tg < d) { d = tg; mat = 30.; }
  if (uDrop.w > 0.) { float dr = sdEllipsoid(p - uDrop.xyz, vec3(uDrop.w, uDrop.w * 1.25, uDrop.w)); if (dr < d) { d = dr; mat = 52.; } }
  return d;
}
vec3 gTA; float gTS;
void normalHook(float mat, vec3 p, inout vec3 n){ if (mat > 29.5 && mat < 30.5) gTA = tongueShade(p, n, gTS); }
vec4 albedoExtra(float mat, vec3 p, vec3 n){
  if (mat < 30.5) return vec4(gTA, gTS);
  if (mat < 50.5) return vec4(mix(vec3(0.93, 0.9, 0.84), vec3(0.98, 0.95, 0.9), smoothstep(0.2, 0.9, (p.y - uTeethPos.y) / uTeeth.z)), 2.2);   // enamel
  if (mat < 51.5) return vec4(vec3(0.78, 0.32, 0.4) * (0.9 + 0.2 * noise3(p * 20.)), 1.8);                                                     // gum
  if (mat < 52.5) return vec4(0.45, 0.75, 1.0, 8.);                                                                                            // saliva drop
  return vec4(vec3(0.62, 0.16, 0.24) * (0.9 + 0.2 * noise3(p * 12.)), 3.);                                                                // lip
}
`;
defineScene({
  name: 'saliva-washer',
  anchor: { word: 1509, offset: -0.15 },
  anchorEnd: { word: 1541, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    const S = STORY.init(api);
    this.g = api.gl.create(api, STORYGL.frag({ figs: 0, extra: MOUTH }), { res: 0.5, aa: 1, steps: 120 });
    const rnd = api.rand('gunk2');
    this.gunk = Array.from({ length: 46 }, (_, i) => { const tooth = Math.floor(rnd() * 7) - 3; return { P: [tooth * 0.97 + (rnd() - 0.5) * 0.55, 0.12 + rnd() * 0.55, 0.32 + rnd() * 0.05], r: 5 + rnd() * 9, col: rnd() < 0.5 ? '#d9c56a' : rnd() < 0.5 ? '#b99a55' : '#efe7c4', vx: 0.4 + rnd() * 0.8, vy: -0.4 - rnd() * 0.9, rot: rnd() * 6 }; });
    this.bg = S.bokehField({ seed: 'saliva', cols: ['#5cc8ff', '#8fd8ff', '#a78bfa', '#ff6fae'], n: 30, big: 60, glows: 4, top: '#1a0a14', mid: '#12060e', bottom: '#060306' });
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const SPIT = api.at(1513), BIG = api.at(1518), SALIVA = api.at(1524), POWER = api.at(1528), WASHER = api.at(1529), ITS = api.at(1533), WASHING = api.at(1535), DOWN = api.at(1537), LONG = api.at(1540);
    const sh = S.shot(t, [SALIVA - 0.05, WASHER - 0.04, ITS - 0.04], api.duration), k = ease.inOutSine(sh.k);
    S.bokeh(ctx, this.bg, [0, -150, 120, 0][sh.i] - sh.local * 20, 0, 1.05);
    let camO;
    if (sh.i === 0) camO = { ro: [lerp(-0.4, -0.1, k), 1.25, lerp(3.2, 2.9, k)], ta: [0.4, 0.45, 0.2], focal: 2.2 };
    else if (sh.i === 1) camO = { ro: [lerp(0.3, -0.3, k), 2.2, lerp(8.2, 7.6, k)], ta: [0, 0.2, -0.5], focal: 2.0 };
    else if (sh.i === 2) camO = { ro: [lerp(2.6, 1.6, k), 1.0, 3.6], ta: [lerp(1.2, 0.2, k), 0.45, 0.2], focal: 2.2 };
    else camO = { ro: [lerp(-0.4, 0.4, k), 2.6, lerp(7.4, 7.0, k)], ta: [0, 0.1, -0.6], focal: 2.0 };
    // the drop: falls in shot 0 onto the tooth at x ~ 0.97
    const fall = prog(t, SPIT - 0.2, 0.6, ease.inQuad), dropY = lerp(3.0, 1.2, fall), splash = t > SPIT + 0.4;
    const u = Object.assign({}, G.RIG.studio, { uKeyDir: [-0.4, 0.9, 0.7], uKeyCol: [0.9, 0.78, 0.72], uRimDir: [0.6, 0.4, -1], uRimCol: [0.55, 0.6, 1.3], uFillCol: [0.06, 0.035, 0.05], uExposure: 1, uAO: 1, uWrap: 0, uExtra: 1, uRimExtra: 0.5,
      uTeeth: [7, 0.02, 1, 1], uTeethPos: [0, 0, 0], uTongue: [2.1, 0, -0.32, -2.55], uCoat: 0.35, uCoatCol: [0.84, 0.8, 0.55], uDrop: sh.i === 0 && !splash ? [0.97, dropY, 0.35, 0.16] : [0, 0, 0, 0] }, G.cam(camO));
    ctx.drawImage(this.g.draw(u), 0, 0, 1920, 1080);
    // the jet sweeps across the row (shot 2), the washed teeth sparkle
    const sweep = sh.i === 2 ? prog(t, WASHER, Math.max(0.8, ITS - WASHER - 0.1), ease.inOutSine) : sh.i === 3 ? 1 : 0;
    const hitX = lerp(-3.2, 3.2, sweep);
    for (const g of this.gunk) {
      const gone = sh.i >= 2 && g.P[0] < hitX ? (sh.i === 3 ? 9 : (hitX - g.P[0]) * 0.6) : 0;
      if (gone > 1.2) continue;
      const Pp = [g.P[0] + g.vx * gone * 2, g.P[1] + g.vy * gone + 0.8 * gone * gone * 0, g.P[2] + gone * 1.5];
      const q = G.project(camO, Pp); if (q[2] <= 0.2) continue;
      const sc = 2.2 / q[2];
      ctx.save(); ctx.globalAlpha = 1 - gone / 1.2; ctx.translate(q[0], q[1]); ctx.rotate(g.rot + gone * 5); ctx.fillStyle = g.col; ctx.beginPath(); ctx.ellipse(0, 0, g.r * sc * 1.2, g.r * sc * 0.8, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(-g.r * sc * 0.3, -g.r * sc * 0.3, g.r * sc * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (sh.i === 0 && splash) { const q = G.project(camO, [0.97, 1.1, 0.35]); const sp = clamp((t - SPIT - 0.4) / 0.5); for (let i = 0; i < 14; i++) { const a = -Math.PI * (0.05 + (i / 14) * 0.9), d = 30 + sp * 140; ctx.save(); ctx.globalAlpha = 1 - sp; ctx.fillStyle = i % 2 ? '#dff6ff' : P.saliva; ctx.beginPath(); ctx.arc(q[0] + Math.cos(a) * d, q[1] + Math.sin(a) * d * 0.7 + sp * sp * 80, 6 + (i % 3) * 3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } S.glow(ctx, q[0], q[1], 200, P.saliva, 0.5 * (1 - sp)); }
    if (sh.i === 2) {
      const a = G.project(camO, [hitX - 1.5, 3.2, 2.2]), b = G.project(camO, [hitX, 0.45, 0.35]);
      const ja = prog(t, WASHER, 0.12);
      ctx.save(); ctx.globalAlpha = ja; ctx.globalCompositeOperation = 'screen';
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), an = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ctx.translate(a[0], a[1]); ctx.rotate(an);
      const jg = ctx.createLinearGradient(0, 0, L, 0); jg.addColorStop(0, 'rgba(160,225,255,0.3)'); jg.addColorStop(1, 'rgba(235,250,255,0.95)');
      ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = 40; ctx.fillStyle = jg; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(L, -30); ctx.lineTo(L, 30); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { const o = ((t * 5 + i / 4) % 1) * L; ctx.beginPath(); ctx.moveTo(o, (i - 1.5) * 6 * o / L); ctx.lineTo(Math.min(L, o + 110), (i - 1.5) * 6 * Math.min(L, o + 110) / L); ctx.stroke(); }
      ctx.restore();
      const rs = api.rand('spl' + Math.floor(t * 30));
      ctx.save(); ctx.globalAlpha = ja; for (let i = 0; i < 22; i++) { const a2 = -Math.PI * (0.05 + rs() * 0.9), d = 20 + rs() * 160; ctx.fillStyle = rs() < 0.5 ? '#e6fbff' : P.saliva; ctx.beginPath(); ctx.arc(b[0] + Math.cos(a2) * d, b[1] + Math.sin(a2) * d * 0.8, 3 + rs() * 8, 0, Math.PI * 2); ctx.fill(); } S.glow(ctx, b[0], b[1], 180, '#bfefff', 0.9); ctx.restore();
    }
    if (sh.i === 3) {
      // a sheen of saliva running down over the clean teeth
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = 'rgba(190,235,255,0.45)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) { const x = -3.2 + i * 0.42, ph = ((t * 0.7 + i * 0.37) % 1); const a = G.project(camO, [x, 1.0 - ph * 1.2, 0.36]), b = G.project(camO, [x + 0.05, 0.75 - ph * 1.2, 0.36]); ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      ctx.restore();
      for (let i = 0; i < 6; i++) { const q = G.project(camO, [-2.9 + i * 1.16, 0.9, 0.35]); S.sparkle(ctx, q[0], q[1], 22, ((t - ITS) * 0.9 + i * 0.37) % 1, '#e6fbff'); }
      api.doodle.text(ctx, 'all day long', 1480, 210, prog(t, api.at(1538), 0.5), { size: 80, color: P.saliva, align: 'center', rotate: -0.05, stroke: 'rgba(0,0,0,0.5)', strokeWidth: 8 });
    }
    if (sh.i >= 1) api.label(ctx, 'SALIVA', 120, 150, { size: 56, p: pop(t, SALIVA, 0.45), bg: P.saliva, color: '#0a2233' });
    if (sh.i === 2) api.label(ctx, 'THE POWER WASHER', 120, 240, { size: 40, p: pop(t, WASHER, 0.4), bg: 'rgba(12,8,28,0.85)', color: P.ink });
    S.artistic(ctx);
    api.finish(ctx, t, { bloom: 0.34, grain: 0.055, vignette: 0.5 });
  },
});
