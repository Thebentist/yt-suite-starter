// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
/* ad-claims (words 3330-3429, part of Ben's ad for his own company's toothpaste): "And you can actually get this today,
 * which is really, really crazy. It actually took us two years of development. We have a universally backed double
 * blind human study on this, so yes, it is all there, it is all true, and it actually does work. And another crazy
 * thing is in our double blind study, we actually showed that it increased saliva by 30 percent in people."
 * Shots on the words: Zero Pro in its own teal studio world (Something Nice's product photo, slow push, parallax) with
 * AVAILABLE TODAY -> a neon timeline on the data floor, two years of development running into TODAY -> what a
 * double-blind study is: two groups, blindfolded, identical unmarked tubes, nobody knows who got what (wide, then
 * close on the tubes) -> the product card again, "our double-blind study" -> a glossy 3D saliva drop swelling, +30%
 * with SALIVA and a small COMPANY STUDY line.
 * On screen stays within Ben's words: no "university-backed", no study size, no other study detail. The 30% is shown
 * as his company's own result. Product photos: assets/somethingnice/zero-pro-toothpaste (Ben's company, at his request).
 */
const DROP = `
#define HAS_ALPHA
uniform float uScale, uWob;
float map(vec3 p){
  p /= uScale;
  p.y += 0.25;
  vec3 q = p; q.xz *= 1.0 + 0.03 * sin(uTime * 3.0 + p.y * 5.0) * uWob;
  return sdRoundCone(q, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.05, 0.0), 0.6, 0.035) * uScale;
}
#include <raymarch>
vec3 env(vec3 d){
  // studio environment: dark with a big soft key from the upper left, a teal fill from the right, lime floor bounce
  vec3 c = vec3(0.01, 0.012, 0.03);
  c += vec3(1.0, 0.98, 0.95) * pow(max(dot(d, normalize(vec3(-0.6, 0.7, -0.4))), 0.0), 18.0) * 3.0;
  c += vec3(0.2, 0.9, 1.0) * pow(max(dot(d, normalize(vec3(0.9, 0.2, -0.3))), 0.0), 6.0) * 0.8;
  c += vec3(0.6, 0.8, 0.2) * pow(max(-d.y, 0.0), 3.0) * 0.25;
  return c;
}
vec4 render4(vec2 fc){
  vec2 uv = (2.0 * fc - uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.35, -3.2), rd = normalize(vec3(uv, 2.2));
  float t = march(ro, rd, 8.0);
  if (t < 0.0) return vec4(0.0);
  vec3 p = ro + rd * t, n = calcNormal(p);
  float f = fresnel(dot(n, -rd), 0.03);
  vec3 refl = env(reflect(rd, n));
  vec3 rr = refract(rd, n, 1.0 / 1.33);
  vec3 body = env(rr) * vec3(0.35, 0.7, 1.0) * 0.7 + vec3(0.01, 0.05, 0.09);
  // internal caustic glow near the bottom
  body += vec3(0.3, 0.8, 1.0) * 0.5 * smoothstep(0.1, -0.7, p.y / uScale) * pow(max(dot(n, -rd), 0.0), 2.0);
  vec3 col = mix(body, refl, f) + pow(max(dot(reflect(rd, n), normalize(vec3(-0.6, 0.7, -0.4))), 0.0), 120.0) * 4.0;
  col += vec3(0.5, 0.85, 1.0) * pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * 0.6;
  return vec4(col * 1.2, 1.0);
}`;

let DATA, T, SHOTS, rDrop, bgBlur, blind = [];

defineScene({
  name: 'ad-claims',
  anchor: { word: 3329, edge: 'end', offset: 0.25 },
  anchorEnd: { word: 3501, offset: -0.15 },     // butts against micro/pop-balloon
  tail: 0.1,                                   // a few frames past the handoff (the assembler trims)
  assets: {
    hero: { image: 'videos/bad-breath-for-good/assets/somethingnice/zero-pro-toothpaste/02-ZeroPro-PDP-02-1.png' },
    box: { image: 'videos/bad-breath-for-good/assets/somethingnice/zero-pro-toothpaste/08-ZeroPro-PDP-01_2b36fdc0-5bd0-4a3c-a7f0-807ad169d0ba.png' },
    two: { image: 'videos/bad-breath-for-good/assets/somethingnice/zero-pro-toothpaste/09-ZeroPro-PDP-07.png' },
  },
  setup(api) {
    DATA = window.DATA.init(api);
    T = { get: api.at(3334), today: api.at(3336), crazy: api.at(3341), took: api.at(3344), two: api.at(3346), years: api.at(3347), dev: api.at(3348),
      we: api.at(3349), double: api.at(3354), blind: api.at(3355), human: api.at(3356), study: api.at(3357), so: api.at(3360), all: api.at(3364), true: api.at(3369), work: api.at(3373),
      another: api.at(3409), our: api.at(3414), dstudy: api.at(3417), showed: api.at(3420), increased: api.at(3423), saliva: api.at(3424), thirty: api.at(3426), percent: api.at(3427), people: api.at(3429) };
    SHOTS = [0, T.took - 0.12, T.we - 0.12, T.so - 0.12, T.another - 0.12, T.increased - 0.2];
    rDrop = api.gl.create(api, DROP, { res: 0.5, aa: 2, steps: 90 });
    // a blurred, enlarged copy of the hero photo fills the frame behind the sharp one (the brand's teal world)
    const img = api.image('hero');
    bgBlur = DATA.sprite(960, 540, (g) => { g.filter = 'blur(30px) saturate(1.2)'; g.drawImage(img, 60, 60, 960, 960, -60, -60, 1080, 660); g.filter = 'none'; });
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    const sh = DATA.shot(t, SHOTS), lt = sh.lt;
    const dark = () => { const g = ctx.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, '#07061a'); g.addColorStop(0.55, '#131030'); g.addColorStop(1, '#07061a'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); };

    if (sh.i === 0) {
      // ---- the brand's world: full-frame product photo, slow push, parallax
      ctx.drawImage(bgBlur, -40 - lt * 20, -20, 2000, 1125);
      const hero = api.image('hero'), s = 1.42 + lt * 0.05, w = 1080 * s;
      ctx.save(); ctx.translate(960 + lt * 12, 540 + 60);
      // soft-edged sharp layer (the photo's own frame is hidden by the mask)
      const mk = DATA.sprite(1080, 1080, (g) => { const gr = g.createRadialGradient(540, 520, 330, 540, 540, 560); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1080); g.globalCompositeOperation = 'source-in'; g.drawImage(hero, 0, 0, 1080, 1080); });
      ctx.drawImage(mk, -w / 2, -w / 2, w, w); ctx.restore();
      // light leak from the upper right
      ctx.save(); ctx.globalCompositeOperation = 'screen'; DATA.glow(ctx, 1750 - lt * 40, 120, 700, '#8fe8ff', 0.25); DATA.glow(ctx, 200, 980, 600, '#c9b8ff', 0.18); ctx.restore();
      api.label(ctx, 'AVAILABLE TODAY', 1500, 820, { size: 64, align: 'center', p: pop(t, T.today - 0.05, 0.5), bg: P.black, color: P.lime });
      DATA.caps(ctx, 'zero pro · something nice', 1500, 910, { size: 32, align: 'center', color: 'rgba(20,30,40,0.7)', alpha: prog(t, 0.3, 0.5), tracking: 6 });
    } else if (sh.i === 1) {
      // ---- two years of development: a neon timeline on the data floor
      dark();
      const cam = DATA.cam3({ pos: [-1.2 + lt * 0.35, 2.4, -7.0 + lt * 0.2], target: [0.6 + lt * 0.2, 0.5, 1.2], f: 1250 });
      DATA.glow(ctx, 960, 560, 1100, P.purple, 0.14);
      DATA.floorGrid(ctx, cam, { step: 0.5, x: [-8, 10], z: [-4, 12], fog: 18, alpha: 0.26, color: '#7a6cff', wRef: 170 });
      const X0 = -4, X1 = 4, Z = 1.2, run = prog(t, SHOTS[1] + 0.05, Math.max(0.55, T.dev - SHOTS[1]), ease.inOutSine);
      DATA.neon(ctx, () => DATA.path3(ctx, cam, [[X0, 0.02, Z], [X1, 0.02, Z]]), '#b7a8ff', 2, { alpha: 0.45 });
      if (run > 0) DATA.neon(ctx, () => DATA.path3(ctx, cam, [[X0, 0.02, Z], [lerp(X0, X1, run), 0.02, Z]]), P.lime, 4.5);
      const nodes = [[X0, 'start', 0], [0, 'year 1', 0.5], [X1, 'year 2', 1]];
      for (const [x, lab, at] of nodes) {
        const q = cam.project(x, 0.02, Z), on = run >= at - 0.01; if (!q) continue;
        DATA.glow(ctx, q.x, q.y, 60, on ? P.lime : '#b7a8ff', on ? 0.8 : 0.3); ctx.fillStyle = on ? P.lime : '#b7a8ff'; ctx.beginPath(); ctx.arc(q.x, q.y, 9, 0, Math.PI * 2); ctx.fill();
        const top = cam.project(x, 0.9, Z); if (top) { ctx.save(); ctx.strokeStyle = on ? 'rgba(215,243,74,0.6)' : 'rgba(183,168,255,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(top.x, top.y); ctx.stroke(); ctx.restore();
          DATA.caps(ctx, lab, top.x, top.y - 16, { size: 34, align: 'center', color: on ? P.lime : P.dim, tracking: 5 }); }
      }
      // the pulse at the head of the line
      const hq = cam.project(lerp(X0, X1, run), 0.02, Z); if (hq && run > 0 && run < 1) { DATA.glow(ctx, hq.x, hq.y, 90, '#ffffff', 0.7); }
      const pe = cam.project(X1, 1.6, Z), pk = pop(t, T.years, 0.4);
      if (pe && pk > 0) { DATA.glow(ctx, pe.x, pe.y, 220, '#62f0e0', 0.25 * Math.min(1, pk)); DATA.card(ctx, api.image('box'), pe.x + 250, pe.y + 60, 300 * Math.min(1, pk), { r: 18 }); }
      DATA.chip(ctx, t, '2 YEARS OF DEVELOPMENT', 960, 170, Math.min(T.two, SHOTS[1] + 0.1), { size: 60 });
    } else if (sh.i === 2 || sh.i === 3) {
      // ---- what a double-blind study is
      dark();
      const cam = sh.i === 2 ? DATA.cam3({ pos: [0.2 + lt * 0.15, 2.0, -6.0 + lt * 0.25], target: [0, 1.0, 1.2], f: 1300 })
        : DATA.cam3({ pos: [0.1, 1.6, -3.0 + lt * 0.12], target: [0, 1.3, 1.2], f: 1500 });
      DATA.glow(ctx, 960, 480, 1100, P.purple, 0.16);
      DATA.floorGrid(ctx, cam, { step: 0.5, x: [-8, 8], z: [-4, 12], fog: 18, alpha: 0.24, color: '#7a6cff', wRef: 170 });
      const groups = [{ x: -2.3, lab: 'group a', col: P.lavender }, { x: 2.3, lab: 'group b', col: P.cyan }];
      const people = [];
      for (const g of groups) for (let k = 0; k < 5; k++) people.push({ x: g.x + (k < 3 ? (k - 1) * 0.95 : (k - 3.5) * 0.95), z: 1.4 + (k > 2 ? 1.0 : 0), col: g.col, side: g.x < 0 ? 1 : -1 });
      const draw = (g, far) => {
        const list = people.map((p) => ({ p, q: cam.project(p.x, 0, p.z) })).filter((o) => o.q).sort((a, b) => b.q.z - a.q.z);
        for (const { p, q } of list) {
          const s = 1.45 * q.s, pk = pop(t, SHOTS[2] + (p.x + 3) * 0.04, 0.45); if (pk <= 0) continue;
          DATA.figure(g, q.x, q.y, s * Math.min(1, pk), { rim: p.col, rimSide: p.side, cheap: far });
          // blindfold band across the head, on "blind"
          const bl = prog(t, T.blind - 0.05 + p.x * 0.01, 0.3);
          if (bl > 0) { const hy = q.y - s * 0.8, hw = s * 0.21 * bl; g.fillStyle = '#0b0a18'; g.fillRect(q.x - hw, hy - s * 0.05, hw * 2, s * 0.1); g.strokeStyle = P.lime; g.lineWidth = 2; g.strokeRect(q.x - hw, hy - s * 0.05, hw * 2, s * 0.1); }
        }
      };
      if (sh.i === 3) DATA.blurLayer(ctx, 9, (g) => draw(g, true)); else draw(ctx, false);
      // identical, unmarked tubes: one for each group, with a "?"
      const tube = (x, z, s) => {
        const q = cam.project(x, 1.9, z); if (!q) return; const k = s * q.s / 300;
        ctx.save(); ctx.translate(q.x, q.y); ctx.scale(k, k); ctx.rotate(0.12 * Math.sin(t + x));
        const g = ctx.createLinearGradient(-60, 0, 60, 0); g.addColorStop(0, '#b9b7c9'); g.addColorStop(0.4, '#ffffff'); g.addColorStop(1, '#a3a0b8');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-60, -150); ctx.lineTo(60, -150); ctx.lineTo(48, 110); ctx.lineTo(-48, 110); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e8e6f0'; api.roundRect(ctx, -34, 110, 68, 50, 10); ctx.fill(); ctx.fillStyle = '#d8d6e4'; ctx.fillRect(-62, -164, 124, 18);
        api.text(ctx, '?', 0, 30, { size: 130, weight: 700, align: 'center', color: '#5b5870' });
        ctx.restore();
      };
      const tk = prog(t, T.human - 0.1, 0.4);
      if (tk > 0 && sh.i === 2) { ctx.save(); ctx.globalAlpha *= tk; tube(-2.3, 0.2, 0.5); tube(2.3, 0.2, 0.5); ctx.restore(); }
      if (sh.i === 3) { for (const [x, lab, col] of [[700, 'A', P.lavender], [1220, 'B', P.cyan]]) { ctx.save(); ctx.translate(x, 540 + Math.sin(t * 1.4 + x) * 8); ctx.rotate(0.1 * Math.sin(t + x)); ctx.scale(1.25 + lt * 0.03, 1.25 + lt * 0.03);
        DATA.glow(ctx, 0, 0, 260, col, 0.25); const g = ctx.createLinearGradient(-60, 0, 60, 0); g.addColorStop(0, '#b9b7c9'); g.addColorStop(0.4, '#ffffff'); g.addColorStop(1, '#a3a0b8');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-60, -150); ctx.lineTo(60, -150); ctx.lineTo(48, 110); ctx.lineTo(-48, 110); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#e8e6f0'; api.roundRect(ctx, -34, 110, 68, 50, 10); ctx.fill(); ctx.fillStyle = '#d8d6e4'; ctx.fillRect(-62, -164, 124, 18);
        api.text(ctx, '?', 0, 30, { size: 130, weight: 700, align: 'center', color: '#5b5870' }); ctx.restore(); DATA.caps(ctx, 'group ' + lab.toLowerCase(), x, 800, { size: 40, align: 'center', color: col, tracking: 6 }); } }
      if (sh.i === 2) for (const g of groups) { const q = cam.project(g.x, 0, 0.3); if (q) DATA.caps(ctx, g.lab, q.x, q.y + 40, { size: sh.i === 2 ? 34 : 40, align: 'center', color: g.col, tracking: 6 }); }
      api.label(ctx, 'DOUBLE-BLIND HUMAN STUDY', 960, 150, { size: 58, align: 'center', p: sh.i === 2 ? pop(t, T.double, 0.5) : 1 });
      DATA.caps(ctx, 'company study', 960, 240, { size: 30, align: 'center', color: P.dim, alpha: sh.i === 2 ? prog(t, T.double + 0.3, 0.4) : 1, tracking: 8 });
      const nk = sh.i === 2 ? prog(t, T.study, 0.5) : 1;
      if (nk > 0) DATA.caps(ctx, 'nobody knows who got what', 960, 990 - 40, { size: 46, align: 'center', color: P.ink, alpha: nk, tracking: 8 });
    } else if (sh.i === 4) {
      // ---- the product card on the dark stage: "our double-blind study"
      dark(); DATA.glow(ctx, 960, 520, 900, '#62f0e0', 0.14);
      DATA.bokeh(ctx, t, { n: 9, seed: 'ad-bk', alpha: 0.12, size: [160, 360], colors: ['#62f0e0', P.lavender] });
      DATA.card(ctx, api.image('two'), 960 + lt * 10, 560, 640, { r: 26, rot: -0.02 + lt * 0.004, scale: 1 + lt * 0.03 });
      api.label(ctx, 'OUR DOUBLE-BLIND STUDY', 960, 150, { size: 54, align: 'center', p: pop(t, T.our, 0.5) });
    } else {
      // ---- the saliva drop swells: +30%
      dark(); DATA.glow(ctx, 760, 560, 900, P.saliva, 0.18);
      const cam = DATA.cam3({ pos: [0, 2.2, -8], target: [0, 0.6, 0], f: 1300 });
      DATA.floorGrid(ctx, cam, { step: 0.5, x: [-8, 8], z: [-4, 12], fog: 18, alpha: 0.2, color: '#7a6cff', wRef: 170 });
      const grow = prog(t, T.thirty - 0.1, 1.0, ease.outCubic), sc = (1 + 0.3 * grow) * 0.85;
      const cv = rDrop.draw({ uTime: t, uScale: sc, uWob: 1 });
      ctx.save(); ctx.translate(-260, 30); ctx.drawImage(cv, 0, 0, 1920, 1080); ctx.restore();
      DATA.lightPool(ctx, 700, 830, 330 * sc, 60, P.saliva, 0.3);
      // a ring gauge: a 30% band added onto a full ring
      const cx = 1380, cy = 520, R = 190;
      DATA.arcBar(ctx, cx, cy, R, 0.001, 1, '#3b5a8a', 30, { alpha: 0.6, glow: 0 });
      DATA.arcBar(ctx, cx, cy, R + 42, 0.001, 0.3 * grow, P.saliva, 34, { glow: 30 });
      DATA.big(ctx, '+' + Math.round(30 * grow) + '%', cx, cy + 60, { size: 170, noScale: true, glow: 'rgba(143,216,255,0.45)', p: grow > 0 ? 1 : 0 });
      api.label(ctx, 'SALIVA', cx, cy - 290, { size: 58, align: 'center', p: pop(t, T.saliva - 0.1, 0.5), bg: P.saliva });
      DATA.caps(ctx, 'company study', cx, cy + 330, { size: 34, align: 'center', color: P.dim, alpha: prog(t, T.percent, 0.4), tracking: 8 });
    }
    DATA.finish(ctx, t, { bloom: sh.i === 0 ? 0.18 : 0.3 });
  },
});
