// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// wrist-steps (phase 2): words 728-775 "It is kind of gross, but basically what you want to do is you want to lick your wrist, and then what
// you're gonna do is you're gonna wait for about 10 seconds for it to dry, and then while that's dry, then you're going to smell it."
// Four cuts: a sculpted forearm, palm up, in soft light ("kind of gross...") -> "lick your wrist": macro, a wet gloss streak wipes
// across the inner wrist (1) -> "wait for about 10 seconds": raking light, the sheen dries off while a 10 s ring fills (2) ->
// "then you're going to smell it": the profile, wrist up at the nose (3). A step tracker sits bottom-left throughout.
const HAND = `
uniform float uWet, uWetX;   // wet amount, how far the lick streak has wiped across (0..1)
float sdHandL(vec3 p){
  vec3 q = p;
  float arm = sdRoundCone(vec3(q.x, q.y * 1.22, q.z), vec3(0., 0., -2.6), vec3(0., 0., -0.1), 0.3, 0.2);
  float d = smin(arm, sdEllipsoid(q, vec3(0.2, 0.105, 0.18)), 0.12);
  d = smin(d, sdRoundBox(q - vec3(0., 0.0, 0.43), vec3(0.23, 0.06, 0.27), 0.07), 0.08);
  d = smin(d, sdEllipsoid(q - vec3(-0.15, 0.05, 0.27), vec3(0.11, 0.08, 0.16)), 0.05);          // thumb pad
  for (int i = 0; i < 4; i++) {
    float fi = float(i), x = -0.16 + fi * 0.107, L = (i == 0 || i == 3) ? 0.36 : 0.44;
    vec3 k = vec3(x, 0.01, 0.7), m = k + vec3(x * 0.08, 0.05, L * 0.55), e = m + vec3(x * 0.06, 0.08, L * 0.45);
    d = smin(d, min(sdCapsule(q, k, m, 0.052), sdCapsule(q, m, e, 0.046)), 0.03);
  }
  d = smin(d, sdCapsule(q, vec3(-0.2, 0.0, 0.2), vec3(-0.4, 0.07, 0.5), 0.06), 0.05);
  return d;
}
uniform vec3 uHR0, uHR1, uHR2, uHandPos;
mat3 handRot(){ return mat3(uHR0, uHR1, uHR2); }
float mapExtra(vec3 p, out float mat){ mat = 40.; return sdHandL(handRot() * (p - uHandPos)); }
vec3 gHA; float gHS;
void normalHook(float mat, vec3 p, inout vec3 n){
  vec3 q = handRot() * (p - uHandPos);
  float wet = uWet * smoothstep(0.13, 0.03, abs(q.x - 0.02 - 0.06 * q.z)) * smoothstep(-0.95, -0.7, q.z) * smoothstep(0.2, 0.0, q.z) * step(q.x, mix(-0.3, 0.3, uWetX)) * step(0.05, q.y);
  gHA = vec3(0.62, 0.42, 0.33) * (0.9 + 0.2 * noise3(q * 30.));
  gHA = mix(gHA, gHA * 0.85, wet);
  gHS = 0.35 + 5. * wet;
  n = normalize(n + 0.06 * (1. - wet) * vec3(noise3(q * 70.) - 0.5, 0., noise3(q * 70. + 5.) - 0.5));
}
vec4 albedoExtra(float mat, vec3 p, vec3 n){ return vec4(gHA, gHS); }
`;
function rotMat(yaw, pitch, roll) {   // column-major mat3 for GLSL: world -> hand local
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const Ry = [[cy, 0, -sy], [0, 1, 0], [sy, 0, cy]], Rx = [[1, 0, 0], [0, cp, sp], [0, -sp, cp]], Rz = [[cr, sr, 0], [-sr, cr, 0], [0, 0, 1]];
  const mul = (A, B) => A.map((r, i) => r.map((_, j) => A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]));
  const M = mul(mul(Rz, Rx), Ry);
  return [M[0][0], M[1][0], M[2][0], M[0][1], M[1][1], M[2][1], M[0][2], M[1][2], M[2][2]];
}
defineScene({
  name: 'wrist-steps',
  anchor: { word: 728, offset: -0.15 },
  anchorEnd: { word: 775, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    const S = STORY.init(api);
    this.gHand = api.gl.create(api, STORYGL.frag({ figs: 0, extra: HAND }), { res: 0.5, aa: 1, steps: 110 });
    this.gFig = api.gl.create(api, STORYGL.frag({ figs: 1 }), { res: 0.5, aa: 1, steps: 100 });
    this.bg = S.bokehField({ seed: 'wrist', cols: ['#a78bfa', '#ff6fae', '#ffb36b'], n: 34, big: 60, glows: 4, top: '#161022', mid: '#0e0a18', bottom: '#050409' });
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const GROSS = api.at(732), LICK = api.at(744), WRIST = api.at(746), WAIT = api.at(756), TEN = api.at(759), DRY = api.at(764), AND2 = api.at(765), SMELL = api.at(774);
    const sh = S.shot(t, [LICK - 0.05, WAIT - 0.05, AND2 - 0.04], api.duration), k = ease.inOutSine(sh.k);
    S.bokeh(ctx, this.bg, [0, -200, 180, 60][sh.i] - sh.local * 20, 0, 1.05);
    const lick = prog(t, LICK + 0.1, 0.6, ease.inOutCubic), dry = prog(t, TEN - 0.2, Math.max(0.6, DRY - TEN + 0.4), ease.inOutSine);
    const wet = sh.i === 0 ? 0 : sh.i === 1 ? lick : 1 - dry;
    if (sh.i < 3) {
      let camO, rot, pos = [0, 0, 0];
      if (sh.i === 0) { camO = { ro: [lerp(1.0, 0.8, k), 1.15, lerp(1.6, 1.4, k)], ta: [0, 0, -0.1], focal: 2.1 }; rot = rotMat(0.35 + 0.1 * k, 0, 0); }
      else if (sh.i === 1) { camO = { ro: [0.8, 0.95, lerp(0.75, 0.6, k)], ta: [0, 0.05, 0.0], focal: 2.2 }; rot = rotMat(0.3, 0, 0); }
      else { camO = { ro: [lerp(-1.1, -0.9, k), 0.45, 0.2], ta: [0, 0.05, -0.3], focal: 2.3 }; rot = rotMat(0.3, 0, 0); }
      const u = Object.assign({}, G.RIG.studio, { uKeyDir: sh.i === 2 ? [-1, 0.35, 0.2] : [-0.4, 1, 0.5], uKeyCol: [0.85, 0.7, 0.62], uRimDir: [0.6, 0.4, -1], uRimCol: [0.6, 0.5, 1.2], uFillCol: [0.05, 0.035, 0.05], uExposure: 1, uAO: 1, uWrap: 0, uExtra: 1, uRimExtra: 0.8, uWet: wet, uWetX: sh.i === 1 ? lick : 1, uHR0: rot.slice(0, 3), uHR1: rot.slice(3, 6), uHR2: rot.slice(6, 9), uHandPos: pos }, G.cam(camO));
      ctx.drawImage(this.gHand.draw(u), 0, 0, 1920, 1080);
      if (sh.i === 1) for (let i = 0; i < 4; i++) S.sparkle(ctx, 780 + i * 120, 520 - i * 20, 26, clamp((t - WRIST - i * 0.12) / 0.5), '#e8f7ff');
      if (sh.i === 2) {
        // drying wisps + the 10-second ring
        for (let i = 0; i < 5; i++) { const ph = (t * 0.6 + i / 5) % 1; S.wavy(ctx, 820 + i * 70, 560 - ph * 160, 70, -Math.PI / 2, t, 0.55 * Math.sin(ph * Math.PI) * (1 - dry * 0.7), { color: '#cfefff', lw: 4, amp: 6, ph: i }); }
        const cx = 1620, cy = 300, R = 120, fr = prog(t, TEN - 0.1, Math.max(0.5, DRY - TEN + 0.3), ease.linear);
        ctx.save(); ctx.fillStyle = 'rgba(12,9,28,0.8)'; ctx.beginPath(); ctx.arc(cx, cy, R + 26, 0, Math.PI * 2); ctx.fill();
        ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = P.saliva; ctx.shadowColor = P.saliva; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fr); ctx.stroke(); ctx.shadowBlur = 0;
        api.text(ctx, '10s', cx, cy + 30, { size: 90, align: 'center', color: '#fff' }); ctx.restore();
        if (t > DRY) api.doodle.check(ctx, cx + 110, cy - 110, 34, prog(t, DRY, 0.35), { color: P.lime, width: 12 });
      }
      if (sh.i === 0) api.doodle.text(ctx, "it's kind of gross...", 960, 200, prog(t, GROSS - 0.35, 0.6), { size: 82, color: '#ff8fb1', align: 'center', rotate: -0.03, stroke: 'rgba(0,0,0,0.5)', strokeWidth: 8 });
    } else {
      const camO = { ro: [lerp(0.95, 0.8, k), 2.7, lerp(2.3, 2.1, k)], ta: [0.2, 2.55, 0], focal: 2.15 };
      const raise = prog(t, AND2, 0.5, ease.inOutCubic), sniff = S.bump(t, SMELL + 0.05, 0.6);
      const u = Object.assign({}, G.RIG.cafe, { uKeyDir: [0.6, 0.5, 0.7], uKeyCol: [0.08, 0.07, 0.08], uRimDir: [-0.6, 0.45, -0.7], uRimCol: [0.95, 0.75, 1.8], uFillCol: [0.015, 0.012, 0.025], uExposure: 1, uAO: 1, uWrap: 0.2, uLampPos: [0, -9, 0], uLampCol: [0, 0, 0], uShow: G.show([1]) },
        G.figs([{ pos: [-0.2, 0, 0], yaw: Math.PI / 2, skin: [0.62, 0.42, 0.33], cloth: [0.3, 0.2, 0.42], hair: 0, hairCol: [0.05, 0.04, 0.04], legs: 1, armL: 2, armR: 4 + raise, head: [0.05, -0.08 - sniff * 0.1, 0], lean: 0.03 }]), G.cam(camO));
      ctx.drawImage(this.gFig.draw(u), 0, 0, 1920, 1080);
      const np = G.project(camO, [0.3, 2.78, 0]);
      for (let i = 0; i < 3; i++) { const ph = (t * 1.4 + i / 3) % 1; ctx.save(); ctx.globalAlpha = Math.sin(ph * Math.PI) * prog(t, SMELL, 0.3); ctx.strokeStyle = P.gas; ctx.lineWidth = 6; ctx.lineCap = 'round'; const sx = np[0] + 60 + i * 34, sy = np[1] + 60 - ph * 90; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - 14, sy - 24, sx - 4, sy - 44); ctx.stroke(); ctx.restore(); }
    }
    // step header for the current step + the tracker, bottom-left
    const steps = [['1', 'LICK YOUR WRIST', LICK], ['2', 'WAIT ~10 SECONDS', WAIT], ['3', 'SMELL IT', api.at(772)]];
    const cur = sh.i === 1 ? 0 : sh.i === 2 ? 1 : sh.i === 3 ? 2 : -1;
    if (cur >= 0) {
      const [n, lab, at] = steps[cur], p = pop(t, at, 0.45);
      if (p > 0) { ctx.save(); ctx.translate(150, 190); ctx.scale(p, p); ctx.fillStyle = P.lime; ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.fill(); api.text(ctx, n, 0, 28, { size: 78, align: 'center', color: P.black }); ctx.restore(); api.text(ctx, lab, 230, 218, { size: 78, color: P.ink, tracking: 2, shadow: true, alpha: clamp(p) }); }
    }
    let tx = 120; const ty = 1000;
    steps.forEach(([n, lab], i) => { const on = i <= cur, w = api.measure(ctx, n + ' ' + lab.split(' ')[0], { size: 34, tracking: 2 }); api.text(ctx, n + ' ' + lab.split(' ')[0], tx, ty, { size: 34, tracking: 2, color: i === cur ? P.lime : on ? P.dim : P.faint, alpha: prog(t, 1.3, 0.4) }); tx += w + 40; });
    api.finish(ctx, t, { bloom: 0.32, grain: 0.06, vignette: 0.55 });
  },
});
