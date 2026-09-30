// @use videos/bad-breath-for-good/scenes/micro3d/_lib.js
// colony3d (replaces micro/anaerobes) · words 1046-1103: "And guess what? The bacteria, they absolutely love it down there. And fun
// fact, they're the kind that actually don't even like oxygen. And guess what? Not a lot of oxygen down there. So technically
// it's the perfect spot for those bacteria to live."
// Real 3D: a crevice between tall filiform papillae; a biofilm colony (rods, cocci pairs and chains, fusiforms, a spirochete,
// threads of matrix) sits in the slime at the bottom. Shots: low dolly between the papillae to the colony / the colony / one rod
// in macro (ANAEROBIC) / oxygen molecules up at the tips / reverse angle from the colony up to the far-away oxygen (LOW OXYGEN) /
// wide of the gap / the colony glowing (THE PERFECT SPOT). Research-notes rows 8 and 10: the sulfur-makers are anaerobes and the
// low-oxygen crevices favour them. No species named on screen.
(function () {
  const FRAG = M3.GLSL.core + M3.GLSL.cam + `
uniform float uShot, uGlow, uO2, uShafts, uFogK;
uniform vec3 uKeyPos, uKeyCol;
uniform vec3 uO2P[14];
` + M3.GLSL.creviceHead + M3.GLSL.bact + M3.GLSL.pap + M3.GLSL.mol + M3.GLSL.creviceBody + `
float map(vec3 p){
  float d=crevice(p);
  if(uO2>0.5 && p.y>14.){
    for(int i=ZERO;i<14;i++){ vec3 c=uO2P[i]; float b=length(p-c); if(b>3.) { d=min(d, b-1.3); continue; }
      float o=o2(p, c, rotAxis(hash33(vec3(float(i),3.,1.))-.5, uTime*0.6+float(i)), 1.25);
      if(o<d){ d=o; gMat=2.; } }
  }
  return d;
}
float hMat, hHue, hTyp, hStr, hTip, hBl, hPart;
void saveMat(){ hMat=gMat; hHue=gBHue; hTyp=gBType; hStr=gBStrand; hTip=gTip; hBl=smoothstep(-0.2,0.2,gDT-gDC); hPart=gMolPart; }
#include <raymarch>
vec3 shade(vec3 ro, vec3 rd, out float dist){
  vec3 n; float ao;
  float t=trace(ro, rd, 280., n, ao);
  if(t<0.){ dist=1e4; return creviceSky(rd); }
  dist=t;
  vec3 p=ro+rd*t;
  creviceLights(p, uKeyPos, uKeyCol);
  Mat m; vec3 nn=n;
  if(hMat>1.5){ m=molMat(hPart); m.alb*=0.8; m.rimCol=vec3(0.3,0.55,1.)*0.9; }
  else m=creviceMat(p, n, hTip, hBl, hHue, hTyp, hStr, nn);
  vec3 col=lighting(m,p,nn,rd,ao,1.);
  col+=creviceWet(rd,n)*step(hMat,1.5);
  vec3 toC=vec3(0.,1.2,0.)-p; float dc=length(toC);
  float fr=pow(1.-clamp(dot(nn,-rd),0.,1.),2.2);
  col+=vec3(1.,0.62,0.28)*uGlow*exp(-dc*0.18)*(hBl*(0.25+1.3*fr) + (1.-hBl)*0.22*(0.4+0.6*clamp(dot(n,toC/dc),0.,1.)));
  return creviceFog(col, p, t, uFogK);
}
#define HAS_VOLUME
vec4 volume(vec3 ro, vec3 rd, float tmax, vec2 fc){ return creviceShafts(ro, rd, tmax, fc, uShafts); }`;

  defineScene({
    name: 'colony3d',
    anchor: { word: 1046, offset: -0.15 },
    anchorEnd: { word: 1104, offset: -0.15 },
    tail: 0,
    setup(api) {
      this.r = M3.create(api, FRAG, { res: 0.5, aa: 2, steps: 160, stepScale: 0.8, sc: 1 });
      const A = (w) => api.at(w);
      this.T = { bacteria: A(1050), love: A(1053), and2: A(1071), kind: A(1076), dont: A(1079), oxygen: A(1082), and3: A(1083), not: A(1086), oxygen2: A(1090), down: A(1091), so: A(1093), perfect: A(1097), spot: A(1098), live: A(1103) };
      const T = this.T, c = -0.04;
      this.shots = [
        { at: 0, k: 'track' }, { at: T.bacteria + c, k: 'colony' }, { at: T.and2 + c, k: 'hero' }, { at: T.oxygen + c, k: 'top' },
        { at: T.not + c, k: 'up' }, { at: T.so + c, k: 'wide' }, { at: T.perfect + c, k: 'glow' },
      ];
            this.heroD = M3.v.norm([-0.45, 0.08, 1]);
      this.heroC = [6.2, M3.groundH(6.2, 2.6) + 0.5, 2.6];
      const q = api.rand('c3-o2');
      this.o2 = Array.from({ length: 14 }, (_, i) => { const h = [q(), q(), q()]; const y = 36 + h[1] * 34; return { h, a: h[0] * 6.2832, y, r: 3 + h[2] * (6 + 0.12 * (y - 34)), dive: i === 3 || i === 8 }; });
      const r = api.rand('c3-motes'); this.motes = [];
      for (let i = 0; i < 110; i++) this.motes.push({ p: [(r() - 0.5) * 44, r() * 75, (r() - 0.5) * 44], r: 0.05 + r() * 0.1, a: 0.2 + r() * 0.4, ph: r() * 6.28 });
    },
    o2At(i, t) { const m = this.o2[i]; const c = [Math.cos(m.a) * m.r, m.y, Math.sin(m.a) * m.r];
      c[0] += Math.sin(t * 0.35 + m.h[0] * 9) * 1.6; c[1] += Math.sin(t * 0.27 + m.h[1] * 9) * 1.0; c[2] += Math.cos(t * 0.31 + m.h[2] * 9) * 1.6;
      if (m.dive) c[1] -= 16 * Math.sin(Math.min(1, Math.max(0, (t - this.T.oxygen2 + 1.5) / 4)) * Math.PI);
      return c; },
    draw(ctx, t, api) {
      const { ease, clamp, lerp, prog } = api, T = this.T, V = M3.v;
      const s = M3.shot(t, this.shots, api.duration), k = s.k, u = clamp(s.lt / Math.max(0.1, s.len));
      const heroC = this.heroC, heroD = this.heroD;
      let ro, ta, fov = 1.9, roll = 0, focus, blur = 0.012, maxR = 0.022, glow = 0, o2 = 0, shafts = 0;
      let keyPos = [-7, 8, 6], keyCol = [1.9, 1.6, 1.35], fogK = 0.009;
      if (k === 'track') {
        const e = ease.inOutSine(u);
        ro = [0.5, lerp(7, 4.2, e), lerp(66, 17, e)]; ta = [0, 1.3, 0]; fov = 1.9; roll = 0.03;
        focus = Math.hypot(ro[0], ro[1] - 1.3, ro[2]) - 2; blur = 0.013; shafts = 0.4;
      } else if (k === 'colony') {
        const a = 0.62 + 0.3 * u; ro = [Math.cos(a) * 10.5, 3.4 - 0.5 * u, Math.sin(a) * 10.5]; ta = [0, 1.1, 0]; fov = 2.0;
        focus = Math.hypot(ro[0], ro[1] - 1.1, ro[2]) * 0.8; blur = 0.013; keyPos = [-6, 7, 8];
      } else if (k === 'hero') {
        const a = 0.22 + 0.3 * u, R = 5.2 - 0.5 * u;
        ro = [heroC[0] + Math.cos(a) * R, heroC[1] + 1.3 - 0.2 * u, heroC[2] + Math.sin(a) * R]; ta = [heroC[0] - 0.3, heroC[1] - 0.1, heroC[2]]; fov = 2.4;
        focus = Math.hypot(ro[0] - heroC[0], ro[1] - heroC[1], ro[2] - heroC[2]) - 0.3; blur = 0.02; maxR = 0.03; keyPos = [heroC[0] - 1, heroC[1] + 5, heroC[2] + 5]; keyCol = [2.2, 1.9, 1.6];
      } else if (k === 'top') {
        o2 = 1; shafts = 0.45; fogK = 0.004; ro = [3.5 - 1.2 * u, 68 - 3 * u, 6.5]; ta = [0.5, 40, 0]; fov = 1.8; focus = 14; blur = 0.016; maxR = 0.026; keyPos = [0, 30, 0]; keyCol = [0.6, 0.5, 0.45];
      } else if (k === 'up') {
        const e = ease.inOutCubic(clamp(u * 1.15)); o2 = 1; shafts = 0.6; ro = [1.5, lerp(50, 5.5, e), lerp(13, 15, e)]; ta = [0, lerp(47, 1.2, e), 0]; fov = 1.85; focus = lerp(13, 15.5, e); blur = 0.012; keyPos = [-5, 7, 9];
      } else if (k === 'wide') {
        const e = ease.inOutSine(u); ro = [0.5, lerp(10, 12.5, e), lerp(36, 32, e)]; ta = [0, 2.5, 0]; fov = 1.55; focus = 34; blur = 0.008;
        glow = 0.35 * e; shafts = 0.6;
      } else {
        const e = ease.outCubic(u); ro = [lerp(7.5, 6.4, e), lerp(4.8, 4.1, e), lerp(9.5, 8.3, e)]; ta = [0, 1.0, 0]; fov = 2.1; focus = 11.4; blur = 0.014;
        glow = 0.35 + 0.65 * prog(t, T.spot - 0.3, 0.8); keyCol = [1.6, 1.3, 1.0];
      }
      const cam = M3.camera(ro, ta, roll, fov);
      const dof = { focus, blur, maxR, sat: 1.0 };
      const o2p = new Float32Array(42); for (let i = 0; i < 14; i++) o2p.set(this.o2At(i, t), i * 3);
      const cv = this.r.draw({ uTime: t, ...cam.uniforms, uShot: s.i, uGlow: glow, uO2: o2, uShafts: shafts, uFogK: fogK, uHeroC: heroC, uHeroD: heroD, uHeroS: 1.4, uClear: [heroC[0], heroC[2], 1.8, 3.6], uKeyPos: keyPos, uKeyCol: keyCol, uO2P: { v3: o2p } }, dof);
      ctx.drawImage(cv, 0, 0, api.W, api.H);
      const mp = this.motes.map((m) => ({ ...m, p: [m.p[0] + Math.sin(t * 0.3 + m.ph) * 0.6, m.p[1] + Math.sin(t * 0.2 + m.ph * 2) * 0.5, m.p[2] + Math.cos(t * 0.25 + m.ph) * 0.6] }));
      M3.motes(ctx, cam, dof, mp, { color: '255,220,230', alpha: 0.55 });

      // ---------- type
      if (k === 'hero') {
        const hp = M3.project(cam, V.add(heroC, [0, 0.45, 0]));
        api.label(ctx, 'ANAEROBIC', 150, 170, { p: api.pop(t, T.kind), size: 64 });
        if (hp) M3.callout(ctx, api, hp.x, hp.y, hp.x + 260, hp.y - 200, "doesn't like oxygen", prog(t, T.dont, 0.6), { size: 42 });
      }
      if (k === 'top') {
        let best = null;
        for (let i = 0; i < 14; i++) { const p = M3.project(cam, this.o2At(i, t)); if (!p || p.z < 3) continue; const dd = Math.hypot(p.x - 1100, p.y - 470); if (!best || dd < best.d) best = { ...p, d: dd }; }
        if (best) M3.callout(ctx, api, best.x, best.y, best.x + 190, best.y - 170, 'O₂ · oxygen', prog(t, T.oxygen + 0.08, 0.6), { size: 46 });
      }
      if (k === 'up') {
        api.label(ctx, 'LOW OXYGEN', 960, 190, { p: api.pop(t, T.down), size: 64, align: 'center' });
      }
      if (k === 'glow') api.label(ctx, 'THE PERFECT SPOT', 960, 190, { p: api.pop(t, T.spot), size: 70, align: 'center' });
      M3.art(ctx, api);
      api.finish(ctx, t, { bloom: 0.32, grain: 0.05, vignette: 0.5 });
    },
  });
})();
