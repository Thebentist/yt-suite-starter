// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// question-title (phase 2): words 517-529 "Because, because I don't think it's where most people think it comes from." then the TITLE.
// Three quick x-ray cuts on a rim-lit figure: head with a "?" -> "most people think": the stomach glows -> "think": back up to
// the mouth, which glows lime -> on "comes" the title slams: a real 3D wet tongue seen from above, its back third coated and
// circled in red marker, BAD BREATH over it and a red FOR GOOD stamp on "from". Holds 1.2 s after the last word.
const TONGUE_EXTRA = `${STORYGL.TONGUE_FN}
float mapExtra(vec3 p, out float mat){ mat = 30.; return sdTongue(p); }
vec3 gTA; float gTS;
void normalHook(float mat, vec3 p, inout vec3 n){ gTA = tongueShade(p, n, gTS); }
vec4 albedoExtra(float mat, vec3 p, vec3 n){ return vec4(gTA, gTS); }
`;
defineScene({
  name: 'question-title',
  anchor: { word: 517, offset: -0.15 },
  anchorEnd: { word: 529, edge: 'end', offset: 1.2 },
  tail: 0.5,
  setup(api) {
    const S = STORY.init(api);
    this.gFig = api.gl.create(api, STORYGL.frag({ figs: 1 }), { res: 0.5, aa: 1, steps: 110 });
    this.gTon = api.gl.create(api, STORYGL.frag({ figs: 0, extra: TONGUE_EXTRA }), { res: 0.5, aa: 2, steps: 120 });
    this.bg = S.bokehField({ seed: 'qt', cols: ['#a78bfa', '#7c5cff', '#ff6fae'], n: 36, big: 60, glows: 5, top: '#140e26', mid: '#0d0a1a', bottom: '#060409' });
    // FOR GOOD rubber stamp, distressed, pre-rendered at 2x
    const st = document.createElement('canvas'); st.width = 1600; st.height = 440; const h = st.getContext('2d'); h.scale(2, 2);
    const red = '#ff3346';
    h.strokeStyle = red; h.lineWidth = 9; api.roundRect(h, 14, 14, 772, 192, 20); h.stroke();
    h.lineWidth = 3.5; api.roundRect(h, 30, 30, 740, 160, 12); h.stroke();
    api.text(h, 'FOR GOOD', 400, 160, { size: 150, weight: 700, align: 'center', color: red, tracking: 10 });
    h.globalCompositeOperation = 'destination-out';
    const rn = api.rand('stamp-distress');
    for (let i = 0; i < 900; i++) { h.globalAlpha = 0.25 + rn() * 0.75; h.beginPath(); h.arc(rn() * 800, rn() * 220, 0.6 + rn() * rn() * 5, 0, Math.PI * 2); h.fill(); }
    for (let i = 0; i < 14; i++) { h.globalAlpha = 0.25 + rn() * 0.3; h.lineWidth = 1 + rn() * 3; const y = rn() * 220; h.beginPath(); h.moveTo(rn() * 300, y); h.lineTo(400 + rn() * 400, y + (rn() - 0.5) * 20); h.stroke(); }
    this.stamp = st;
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const MOST = api.at(524), THINK2 = api.at(526), COMES = api.at(528), FROM = api.at(529);
    const sh = S.shot(t, [MOST - 0.04, THINK2 - 0.04, COMES - 0.03], api.duration), k = ease.inOutSine(sh.k);
    if (sh.i < 3) {
      // ---------- the x-ray figure (profile, facing right)
      const person = { pos: [0, 0, 0], yaw: Math.PI / 2, skin: [0.42, 0.3, 0.26], cloth: [0.16, 0.14, 0.24], hairCol: [0.03, 0.025, 0.03], hair: 3, legs: 1, armR: 2, armL: 2, head: [0, -0.03 + Math.sin(t * 1.4) * 0.01, 0], mouth: sh.i === 2 ? 0.15 : 0 };
      let camO;
      if (sh.i === 0) camO = { ro: [lerp(-0.1, 0.1, k), 2.75, lerp(4.4, 4.0, k)], ta: [0.35, 2.55, 0], focal: 2.1 };
      else if (sh.i === 1) camO = { ro: [0.1, lerp(1.35, 1.2, k), 3.9], ta: [0.25, 1.1, 0], focal: 2.0 };
      else camO = { ro: [lerp(1.3, 1.15, k), 2.6, lerp(2.2, 2.0, k)], ta: [0.1, 2.52, 0], focal: 2.2 };
      S.bokeh(ctx, this.bg, [-100, 60, 220][sh.i] - sh.local * 25, [0, -90, 30][sh.i]);
      const u = Object.assign({}, G.RIG.studio, { uKeyDir: [0.6, 0.5, 0.6], uKeyCol: [0.08, 0.07, 0.09], uRimDir: [-0.8, 0.5, -0.6], uRimCol: [0.9, 0.75, 1.9], uFillCol: [0.015, 0.012, 0.025], uExposure: 1, uAO: 1, uWrap: 0.2, uShow: G.show([1]) }, G.figs([person]), G.cam(camO));
      ctx.drawImage(this.gFig.draw(u), 0, 0, 1920, 1080);
      // x-ray organs, glowing through (screen blend)
      const stom = G.project(camO, [0.12, 1.08, -0.1]), mouth = G.project(camO, [0.42, 2.56, 0]);
      const sGlow = prog(t, MOST, 0.3) * (1 - prog(t, THINK2, 0.25)), mGlow = prog(t, THINK2, 0.3);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      if (sGlow > 0) { S.glow(ctx, stom[0], stom[1], 380, '#ff6fae', sGlow); ctx.globalAlpha = 0.85 * sGlow; ctx.save(); ctx.translate(stom[0], stom[1]); ctx.rotate(-0.2); S.icons.stomach(ctx, 0, 0, 125, { color: '#ff7aa8', rim: '#ffd0e0' }); ctx.restore(); ctx.globalAlpha = 1; }
      if (mGlow > 0) { S.glow(ctx, mouth[0], mouth[1], 260, P.lime, mGlow); S.glow(ctx, mouth[0], mouth[1], 90, '#f7ffd0', mGlow); }
      ctx.restore();
      // the "?" hops: above the head -> the stomach -> the mouth
      const qTarget = sh.i === 0 ? G.project(camO, [0.1, 3.75, 0]) : sh.i === 1 ? [stom[0] + 240, stom[1] - 150] : [mouth[0] + 250, mouth[1] - 200];
      const qp = pop(t, sh.i === 0 ? 0.1 : sh.t0, 0.4), bob = Math.sin(t * 3) * 10;
      if (qp > 0) { ctx.save(); ctx.translate(qTarget[0], qTarget[1] + bob); ctx.rotate(Math.sin(t * 2.4) * 0.08); ctx.scale(qp, qp); S.type(ctx, '?', 0, 90, 1, { size: 260, color: '#fbf7f0', side: '#5b3fd6', depth: 12, glow: '#a78bfa' }); ctx.restore(); }
      const lab = sh.i === 1 ? ['STOMACH?', stom[0] - 330, stom[1] + 20, sGlow] : sh.i === 2 ? ['MOUTH?', mouth[0] - 520, mouth[1] + 150, mGlow] : null;
      if (lab && lab[3] > 0) api.label(ctx, lab[0], lab[1], lab[2], { size: 46, p: pop(t, sh.t0 + 0.05, 0.4), bg: 'rgba(12,8,28,0.85)', color: P.ink });
      S.artistic(ctx);
    } else {
      // ---------- the TITLE: 3D tongue from above
      const tl = t - COMES, slam = prog(t, COMES, 0.3, ease.outCubic), shake = S.kick(t, COMES, 0.45) * 8 + S.kick(t, FROM, 0.4) * 6;
      const bg = ctx.createRadialGradient(960, 300, 50, 960, 540, 1100); bg.addColorStop(0, '#3a0f22'); bg.addColorStop(0.5, '#160818'); bg.addColorStop(1, '#050308'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1920, 1080);
      const camO = { ro: [0.02 * Math.sin(t * 0.5), lerp(3.35, 3.05, ease.inOutSine(clamp(tl / 2.2))), lerp(1.25, 1.05, ease.inOutSine(clamp(tl / 2.2)))], ta: [0, -0.1, -0.12], focal: 2.25 - slam * 0.08 };
      const u = Object.assign({}, G.RIG.studio, { uKeyDir: [-0.9, 0.85, 0.35], uKeyCol: [0.8, 0.62, 0.55], uRimDir: [0.8, 0.5, -0.7], uRimCol: [0.35, 0.28, 0.7], uFillCol: [0.05, 0.02, 0.03], uExposure: 1, uAO: 1, uWrap: 0, uExtra: 1, uRimExtra: 0.3, uCoat: 0.85, uCoatCol: [0.84, 0.8, 0.52], uTongue: [1, 0, 0, 0] }, G.cam(camO));
      ctx.save(); ctx.translate(shake, shake * 0.5); ctx.drawImage(this.gTon.draw(u), 0, 0, 1920, 1080); ctx.restore();
      // the back of the tongue falls off into the dark throat
      const tf = ctx.createLinearGradient(0, 0, 0, 380); tf.addColorStop(0, 'rgba(5,3,8,0.95)'); tf.addColorStop(1, 'rgba(5,3,8,0)'); ctx.fillStyle = tf; ctx.fillRect(0, 0, 1920, 380);
      // red marker circle around the back third (the thumbnail idea)
      const bc = G.project(camO, [0, 0.05, -0.62]);
      api.doodle.circle(ctx, bc[0], bc[1], 400, 175, prog(t, FROM + 0.3, 0.75, ease.inOutCubic), { color: P.marker, width: 13, seed: 12, glow: 'rgba(255,40,40,0.35)' });
      // a band of shadow so the type reads over the tongue
      ctx.save(); ctx.translate(960, 700); ctx.scale(1, 0.3); const db = ctx.createRadialGradient(0, 0, 0, 0, 0, 950); db.addColorStop(0, 'rgba(10,4,16,0.7)'); db.addColorStop(1, 'rgba(10,4,16,0)'); ctx.fillStyle = db; ctx.fillRect(-950, -950, 1900, 1900); ctx.restore();
      const tp = prog(t, COMES, 0.22, ease.outCubic), ts = 1 + (1 - ease.outBack(clamp(tl / 0.35), 2.2)) * 0.35;
      ctx.save(); ctx.translate(960 + shake, 740); ctx.scale(ts, ts);
      S.type(ctx, 'BAD BREATH', 0, 0, tp, { size: 250, color: '#fbf7f0', side: '#3a2470', depth: 14, tracking: 3, glow: 'rgba(255,200,230,0.8)' });
      ctx.restore();
      const sw = prog(t, FROM + 0.5, 0.9, ease.inOutCubic);
      if (sw > 0 && sw < 1) { ctx.save(); api.font(ctx, { size: 250, weight: 700, tracking: 3 }); ctx.textAlign = 'center'; ctx.beginPath(); const x0 = lerp(380, 1540, sw); ctx.moveTo(x0 - 60, 500); ctx.lineTo(x0 + 40, 500); ctx.lineTo(x0 - 40, 780); ctx.lineTo(x0 - 140, 780); ctx.closePath(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText('BAD BREATH', 960, 740); ctx.restore(); }
      const sp = clamp((t - FROM) / 0.26);
      if (sp > 0) { const sc = 0.86 * (1 + (1 - ease.outBack(sp, 2.2)) * 0.8); ctx.save(); ctx.translate(985, 905); ctx.rotate(-0.07); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(sp * 2.5); ctx.shadowColor = 'rgba(255,40,60,0.45)'; ctx.shadowBlur = 30; ctx.drawImage(this.stamp, -400, -110, 800, 220); ctx.restore(); }
      const fl = clamp(1 - (t - (COMES - 0.03)) / 0.2);
      if (fl > 0) { ctx.fillStyle = 'rgba(255,245,250,' + (0.35 * fl) + ')'; ctx.fillRect(0, 0, 1920, 1080); }
      S.artistic(ctx);
    }
    api.finish(ctx, t, { bloom: 0.32, grain: 0.055, vignette: 0.5 });
  },
});
