// @use videos/bad-breath-for-good/scenes/story/_lib.js
// @use videos/bad-breath-for-good/scenes/story/_gl.js
// house-smell (phase 2): words 347-387 "...like you walk into somebody's house and they're just used to the way that their house
// smells. They don't really know that their house smelled bad. It's the same thing with your mouth."
// Four cuts: night exterior, a visitor silhouetted in the warm open doorway ("walk into somebody's house") -> inside, the owner
// relaxed on the sofa in lamplight while a faint green haze hangs in the beam ("used to the way their house smells") -> the
// visitor in the doorway, backlit, hand to the nose ("they don't really know") -> extreme close-up of a mouth in silhouette with
// the same haze escaping ("same thing with your mouth"). Ends where not-food starts.
const ROOM = `
float mapExtra(vec3 p, out float mat){
  mat = 10.;
  float d = p.y + 1.62;                                                        // floor
  float wall = -(p.z + 2.2); if (wall > -9.) { wall = abs(p.z + 2.35) - 0.15; }
  if (wall < d) { d = wall; mat = 11.; }
  // sofa behind the owner (owner sits at the origin facing +z)
  vec3 s = p - vec3(0., -0.55, 0.1);
  float sofa = sdRoundBox(s - vec3(0., 0.2, 0.25), vec3(1.9, 0.32, 0.75), 0.18);            // seat
  sofa = min(sofa, sdRoundBox(s - vec3(0., 1.15, -0.55), vec3(1.9, 0.8, 0.25), 0.2));         // back
  sofa = min(sofa, sdRoundBox(vec3(abs(s.x), s.yz) - vec3(1.95, 0.75, 0.2), vec3(0.25, 0.55, 0.8), 0.18));   // arms
  if (sofa < d) { d = sofa; mat = 12.; }
  // floor lamp to the right
  vec3 l = p - vec3(2.9, 0., -0.6);
  float pole = sdCapsule(l, vec3(0., -1.62, 0.), vec3(0., 2.2, 0.), 0.035);
  float shade = sdRoundCone(l, vec3(0., 2.2, 0.), vec3(0., 2.75, 0.), 0.42, 0.26);
  shade = max(shade, -sdRoundCone(l, vec3(0., 2.15, 0.), vec3(0., 2.8, 0.), 0.4, 0.24));
  if (pole < d) { d = pole; mat = 13.; }
  if (shade < d) { d = shade; mat = 21.; }
  float bulb = sdSphere(l - vec3(0., 2.35, 0.), 0.12);
  if (bulb < d) { d = bulb; mat = 20.; }
  return d;
}
vec4 albedoExtra(float mat, vec3 p, vec3 n){
  if (mat < 10.5) return vec4(vec3(0.16, 0.09, 0.07) * (0.7 + 0.5 * fbm3(vec3(p.x * 1.5, 0., p.z * 9.), 3)), 0.6);   // wood floor
  if (mat < 11.5) return vec4(vec3(0.22, 0.13, 0.16) * (0.85 + 0.2 * step(0.5, fract(p.x * 1.6))), 0.1);          // striped wallpaper
  if (mat < 12.5) return vec4(vec3(0.24, 0.17, 0.4) * (0.85 + 0.25 * fbm3(p * 12., 2)), 0.15);                     // velvet sofa
  return vec4(0.1, 0.09, 0.1, 1.0);
}
vec3 emissiveExtra(float mat, vec3 p){ return mat < 20.5 ? vec3(6., 4., 2.) : vec3(1.6, 0.95, 0.45); }
`;
defineScene({
  name: 'house-smell',
  anchor: { word: 347, offset: -0.15 },
  anchorEnd: { word: 388, offset: -0.15 },
  tail: 0.5,
  setup(api) {
    const S = STORY.init(api);
    this.gFig = api.gl.create(api, STORYGL.frag({ figs: 1 }), { res: 0.5, aa: 1, steps: 100 });
    this.gRoom = api.gl.create(api, STORYGL.frag({ figs: 1, extra: ROOM, lamp: true }), { res: 0.5, aa: 1, steps: 120 });
    this.street = S.bokehField({ seed: 'street', cols: ['#ffb36b', '#ffd28a', '#5c7cff', '#a78bfa'], n: 45, big: 40, band: [520, 900], glows: 3, top: '#0a0c1e', mid: '#0b0a18', bottom: '#050409' });
    this.inside = S.bokehField({ seed: 'inside', cols: ['#ffb36b', '#ff8a5c'], n: 10, big: 30, glows: 2, top: '#140b10', mid: '#0d0709', bottom: '#060405' });
  },
  draw(ctx, t, api) {
    const S = STORY, G = STORYGL, { P, ease, prog, clamp, pop, lerp } = api;
    const WALK = api.at(357), HOUSE = api.at(360), AND = api.at(361), THEY = api.at(372), BAD = api.at(380), ITS = api.at(381), MOUTH = api.at(387);
    const sh = S.shot(t, [AND - 0.03, THEY - 0.03, ITS - 0.03], api.duration), k = ease.inOutSine(sh.k);
    const haze = (x, y, w, n, a, seed) => { for (let i = 0; i < n * 2; i++) { const ph = (t * 0.06 + i / n) % 1; S.puff(ctx, x + Math.sin(i * 2.7 + t * 0.4) * w * 0.5 + (ph - 0.5) * w * 0.4, y + Math.cos(i * 1.9 + t * 0.3) * w * 0.22, w * (0.12 + 0.07 * ((i * 7) % 3)), a * 0.55, S.mix(P.gas, '#8a9a40', (i % 3) / 3), i + seed); } };
    if (sh.i === 0) {
      // ---- night exterior: the house, the open door, a visitor stepping in (seen from behind)
      S.bokeh(ctx, this.street, -sh.local * 20, 60, 1);
      const zoom = lerp(1, 1.06, k);
      ctx.save(); ctx.translate(960, 560); ctx.scale(zoom, zoom); ctx.translate(-960, -560);
      // house silhouette
      ctx.fillStyle = '#0b0914'; ctx.beginPath(); ctx.moveTo(420, 1080); ctx.lineTo(420, 420); ctx.lineTo(960, 120); ctx.lineTo(1500, 420); ctx.lineTo(1500, 1080); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(167,139,250,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(420, 420); ctx.lineTo(960, 120); ctx.lineTo(1500, 420); ctx.stroke();
      ctx.fillStyle = '#0e0b18'; ctx.fillRect(1230, 200, 90, 160);
      // warm windows
      for (const [x, y] of [[520, 520], [1230, 520]]) { const wg = ctx.createLinearGradient(0, y, 0, y + 190); wg.addColorStop(0, '#ffcf8a'); wg.addColorStop(1, '#ff9a4a'); ctx.fillStyle = wg; ctx.fillRect(x, y, 170, 190); ctx.fillStyle = '#0b0914'; ctx.fillRect(x + 80, y, 10, 190); ctx.fillRect(x, y + 90, 170, 10); S.glow(ctx, x + 85, y + 95, 260, '#ffb060', 0.45); }
      // the door opening and its light spill
      const open = lerp(0.35, 1, prog(t, WALK - 0.2, 0.8, ease.inOutCubic));
      const dg = ctx.createLinearGradient(0, 560, 0, 1080); dg.addColorStop(0, '#ffe2a8'); dg.addColorStop(1, '#ffb45e'); ctx.fillStyle = dg; ctx.fillRect(880, 560, 160 * open, 520);
      ctx.fillStyle = '#1a1220'; ctx.fillRect(880 + 160 * open, 560, 18, 520);
      ctx.save(); ctx.globalCompositeOperation = 'screen'; const sp = ctx.createLinearGradient(0, 1080, 0, 760); sp.addColorStop(0, 'rgba(255,190,110,0.45)'); sp.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = sp; ctx.beginPath(); ctx.moveTo(880, 1080); ctx.lineTo(880 + 160 * open, 1080); ctx.lineTo(1300, 1080); ctx.lineTo(880 + 160 * open, 1080); ctx.lineTo(620, 1080); ctx.closePath(); ctx.fill(); S.glow(ctx, 960, 820, 420 * open, '#ffb060', 0.5); ctx.restore();
      ctx.restore();
      // the visitor, from behind, walking up to the door (GL, silhouetted by the door light)
      const camO = { ro: [0, 2.3, lerp(15.5, 14.5, k)], ta: [0, 1.3, 0], focal: 2.0 };
      const u = Object.assign({}, G.RIG.studio, { uKeyDir: [0.2, 0.6, 1], uKeyCol: [0.05, 0.05, 0.08], uRimDir: [0, 0.35, -1], uRimCol: [1.8, 1.1, 0.55], uFillCol: [0.02, 0.02, 0.04], uExposure: 1, uAO: 1, uWrap: 0.1, uShow: G.show([1]) },
        G.figs([{ pos: [0.15, -0.9, lerp(3.2, 1.6, prog(t, WALK - 0.3, 1.6, ease.inOutSine))], yaw: Math.PI, legs: 1, armR: 2, armL: 2, skin: [0.4, 0.3, 0.24], cloth: [0.3, 0.16, 0.12], hair: 2, hairCol: [0.18, 0.1, 0.05] }]), G.cam(camO));
      ctx.drawImage(this.gFig.draw(u), 0, 0, 1920, 1080);
    } else if (sh.i === 1 || sh.i === 2) {
      // ---- inside
      S.bokeh(ctx, this.inside, 0, 0, 1);
      const flick = 1 + 0.03 * Math.sin(t * 7.3);
      let camO, show, figsList;
      const owner = { pos: [0, 0, 0], yaw: 0, legs: 2, armR: 3, armL: 3, lean: 0.22, head: [0.15 + Math.sin(t * 0.8) * 0.05, 0.1, 0.1], skin: [0.5, 0.34, 0.26], cloth: [0.18, 0.36, 0.34], hair: 1, hairCol: [0.1, 0.06, 0.04] };
      if (sh.i === 1) { camO = { ro: [lerp(3.6, 3.0, k), 2.2, lerp(6.4, 5.8, k)], ta: [0.5, 1.2, 0], focal: 2.0 }; figsList = [owner]; show = [1]; }
      else {
        const nose = prog(t, THEY + 0.25, 0.6, ease.inOutCubic);
        const visitor = { pos: [-1.4, -0.3, 3.2], yaw: 0.5, legs: 1, armR: 4 + nose, armL: 2, lean: 0.1 * nose, head: [-0.25 * nose, -0.18 * nose, 0], skin: [0.4, 0.3, 0.24], cloth: [0.3, 0.16, 0.12], hair: 2, hairCol: [0.18, 0.1, 0.05] };
        camO = { ro: [lerp(2.6, 2.3, k), 2.4, lerp(9.8, 9.2, k)], ta: [-1.2, 1.9, 2.4], focal: 2.3 }; figsList = [visitor]; show = [1];
      }
      const u = Object.assign({}, G.RIG.cafe, { uKeyDir: [0.4, 0.8, 0.6], uKeyCol: [0.05, 0.04, 0.04], uRimDir: sh.i === 1 ? [-0.6, 0.4, -0.7] : [-0.5, 0.2, -1], uRimCol: sh.i === 1 ? [0.7, 0.55, 1.3] : [1.9, 1.15, 0.6], uFillCol: [0.02, 0.015, 0.02], uExposure: 1, uAO: 1, uWrap: 0.35, uExtra: sh.i === 1 ? 1 : 0, uRimExtra: 0.1,
        uLampPos: [2.9, 2.35, -0.6], uLampCol: [3.6 * flick, 2.1 * flick, 0.9 * flick], uLamp2Pos: [0, 5, 5], uLamp2Col: [0, 0, 0], uShow: G.show(show) }, G.figs(figsList), G.cam(camO));
      if (sh.i === 2) {
        // the doorway behind the visitor: warm light, the visitor silhouetted in it
        const d0 = G.project(camO, [-2.2, -1.6, 1.6]), d1 = G.project(camO, [-0.6, 3.6, 1.6]);
        ctx.fillStyle = '#0b0708'; ctx.fillRect(0, 0, 1920, 1080);
        const dg = ctx.createLinearGradient(0, d1[1], 0, d0[1]); dg.addColorStop(0, '#ffe3b0'); dg.addColorStop(1, '#ffae5a'); ctx.fillStyle = dg; ctx.fillRect(d0[0], d1[1], d1[0] - d0[0], d0[1] - d1[1]);
        S.glow(ctx, (d0[0] + d1[0]) / 2, (d0[1] + d1[1]) / 2, 700, '#ffb060', 0.55);
        ctx.drawImage(this.gFig.draw(u), 0, 0, 1920, 1080);
        haze(1250, 520, 900, 8, 0.22, 3);
        const hp = G.project(camO, [-1.4, 3.0, 3.4]);
        api.doodle.text(ctx, 'ugh', hp[0] + 150, hp[1] - 60, prog(t, THEY + 0.5, 0.35), { size: 90, color: P.gas, rotate: -0.1, stroke: 'rgba(10,6,18,0.6)', strokeWidth: 10 });
        for (let i = 0; i < 3; i++) S.wavy(ctx, hp[0] + 150, hp[1] + 40 + i * 34, 130, -0.2 + i * 0.2, t, prog(t, THEY + 0.2, 0.3), { color: P.gas, lw: 6, ph: i * 2 });
      } else {
        ctx.drawImage(this.gRoom.draw(u), 0, 0, 1920, 1080);
        // haze hanging in the lamp beam, the owner content
        const lp = G.project(camO, [2.9, 2.35, -0.6]);
        S.glow(ctx, lp[0], lp[1], 380, '#ffb060', 0.5);
        haze(900, 430, 1300, 11, 0.2 + 0.08 * prog(t, api.at(370), 0.5), 0);
        S.motes(ctx, t, { seed: 'room', n: 30, alpha: 0.3, dx: 200 });
      }
    } else {
      // ---- "same thing with your mouth": extreme close-up, a mouth in silhouette with the same haze escaping
      S.bokeh(ctx, this.inside, 120, 0, 1.2);
      const camO = { ro: [lerp(-0.05, -0.15, k), 2.52, lerp(1.35, 1.2, k)], ta: [-0.45, 2.52, 0], focal: 2.2 };
      const me = { pos: [-1.0, 0, 0], yaw: Math.PI / 2, skin: [0.42, 0.28, 0.22], cloth: [0.2, 0.17, 0.3], hair: 3, hairCol: [0.03, 0.025, 0.03], mouth: 0.3 + 0.1 * Math.sin(t * 5) };
      const hz = prog(t, ITS + 0.1, 0.5);
      const u = Object.assign({}, G.RIG.cafe, { uKeyDir: [0.5, 0.5, 0.6], uKeyCol: [0.03, 0.03, 0.03], uRimDir: [0.8, 0.3, -0.6], uRimCol: [0.9, 0.7, 1.7], uFillCol: [0.01, 0.01, 0.015], uExposure: 1, uAO: 1, uWrap: 0.1, uLampPos: [0, -5, 0], uLampCol: [0, 0, 0], uLamp2Pos: [-0.4, 2.45, 0.1], uLamp2Col: [0.5 * hz, 1.3 * hz, 0.2 * hz], uShow: G.show([1]) }, G.figs([me]), G.cam(camO));
      ctx.drawImage(this.gFig.draw(u), 0, 0, 1920, 1080);
      const mp = G.project(camO, [-0.58, 2.5, 0.0]);
      for (let i = 0; i < 9; i++) { const ph = ((t - ITS) * 0.35 + i / 9) % 1; if (t < ITS) break; S.puff(ctx, mp[0] + 20 + ph * 700, mp[1] - ph * 200 + Math.sin(i * 1.3 + t) * 30, 100 + ph * 300, 0.55 * hz * Math.sin(Math.PI * Math.min(1, ph * 1.2)), P.gas, i); }
      api.label(ctx, 'SAME THING WITH YOUR MOUTH', 110, 950, { size: 54, p: pop(t, api.at(383), 0.45) });
    }
    api.finish(ctx, t, { bloom: 0.35, grain: 0.06, vignette: 0.55 });
  },
});
