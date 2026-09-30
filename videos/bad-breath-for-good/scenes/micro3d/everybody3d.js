// @use videos/bad-breath-for-good/scenes/micro3d/_lib.js
// everybody3d (NEW) · words 4561-4613: "it kind of stinks that you can't smell your bad breath on yourself, but at least now you know what
// you can and can do to fix it. And don't worry, because everybody, and I mean everybody's got these bacteria pretty much. And a lot
// of people wake up with morning breath, too."
// Starts where data/two-weeks ends (word 4558 end + 0.25; starting at 4561 would leave a 4-frame flash of Ben) and ends where
// story/recap starts (word 4614 - 0.15).
// Shots: the tongue's papillae from above, faint gas rising / gas molecules drifting, then melting out of focus (you don't notice
// your own) / snapping back into focus ("now you know") / the colony at the bottom of a crevice, calm / one well of a sample plate
// glowing with a colony (EVERYBODY) / pull back: rows and rows of glowing wells ("everybody's got these bacteria") / sunrise over
// the papillae, gas backlit (MORNING BREATH). The notes say people are bad at judging their own breath (row 4) rather than unable,
// so nothing on screen says "can't". The plate is a metaphor, not a study; no numbers on screen.
(function () {
  const FRAG = M3.GLSL.core + M3.GLSL.cam + `
uniform float uWorld, uShafts, uFogK, uWarm, uGasA, uWellGlow;
uniform vec3 uKeyPos, uKeyCol;
uniform vec4 uMol[10];
` + M3.GLSL.creviceHead + M3.GLSL.bact + M3.GLSL.pap + M3.GLSL.mol + M3.GLSL.creviceBody + `
float gWell; vec2 gWellId;
// a black 96-well plate (8 x 12, pitch 1), each well holding a small glowing colony
float plate(vec3 p){
  float body=sdRoundBox(p-vec3(0.,-0.35,0.), vec3(6.4,0.35,4.4), 0.08);
  vec2 id=clamp(floor(p.xz+vec2(6.,4.)), vec2(0.), vec2(11.,7.)); vec2 c=id-vec2(5.5,3.5);
  vec3 q=p-vec3(c.x,0.,c.y);
  float well=max(length(q.xz)-0.4, -q.y-0.5);
  float d=smax(body, -well, 0.03);
  gWell=0.; gWellId=id;
  // colony: a few blobs at the bottom
  vec3 h=hash33(vec3(id,2.));
  float col=length(q-vec3(0.,-0.45,0.))+1.;
  for(int k=ZERO;k<4;k++){ vec3 hk=hash33(vec3(id,float(k)+5.)); vec3 b=vec3((hk.x-0.5)*0.34, -0.47+0.05*hk.z, (hk.y-0.5)*0.34); col=smin(col, length(q-b)-(0.07+0.07*hk.z)*(0.8+0.5*h.x), 0.06); }
  if(col<d){ gWell=1.; return col; }
  return d;
}
float mols(vec3 p){
  float d=1e5;
  for(int i=ZERO;i<10;i++){ vec4 m=uMol[i]; if(m.w<=0.01) continue; float b=length(p-m.xyz); if(b>2.2*m.w){ d=min(d,b-1.5*m.w); continue; }
    float o=h2s(p, m.xyz, rotAxis(hash33(vec3(float(i),7.,3.))-.5, uTime*0.5+float(i)*2.), m.w); if(o<d){ d=o; gMat=2.; } }
  return d;
}
float map(vec3 p){
  gMat=0.;
  if(uWorld<0.5){ return crevice(p); }
  if(uWorld<1.5){ return mols(p); }
  float d=plate(p); gMat=3.+gWell; return d;
}
float hMat, hHue, hTyp, hStr, hTip, hBl, hPart; vec2 hWellId;
void saveMat(){ hMat=gMat; hHue=gBHue; hTyp=gBType; hStr=gBStrand; hTip=gTip; hBl=smoothstep(-0.2,0.2,gDT-gDC); hPart=gMolPart; hWellId=gWellId; }
#include <raymarch>
vec3 sunSky(vec3 rd){ float h=rd.y; vec3 base=creviceSky(rd);
  vec3 warm=mix(vec3(0.75,0.34,0.14), vec3(0.05,0.03,0.08), smoothstep(-0.02,0.3,h))+vec3(1.6,0.85,0.4)*pow(max(dot(rd,normalize(vec3(0.15,0.1,-1.))),0.),40.)*1.4;
  return mix(base, warm, uWarm); }
vec3 studioBg(vec3 rd){ float v=clamp(rd.y*0.7+0.45,0.,1.); return mix(vec3(0.006,0.008,0.006), vec3(0.035,0.045,0.02), v); }
vec3 shade(vec3 ro, vec3 rd, out float dist){
  vec3 n; float ao;
  float t=trace(ro, rd, 320., n, ao);
  if(t<0.){ dist=1e4; return uWorld<0.5? sunSky(rd) : (uWorld<1.5? studioBg(rd) : vec3(0.004,0.005,0.006)); }
  dist=t; vec3 p=ro+rd*t; vec3 col; Mat m; vec3 nn=n;
  if(uWorld<0.5){
    creviceLights(p, uKeyPos, uKeyCol);
    if(uWarm>0.){ gKeyDir=mix(gKeyDir, vec3(0.15,0.2,-1.), uWarm); gKeyCol=mix(gKeyCol, vec3(2.4,1.5,0.8)*mix(0.5,1.,smoothstep(0.,60.,p.y)), uWarm); gFillCol=mix(gFillCol, vec3(0.15,0.12,0.3), uWarm); }
    m=creviceMat(p, n, hTip, hBl, hHue, hTyp, hStr, nn);
    col=lighting(m,p,nn,rd,ao,1.);
    col+=creviceWet(rd,n)*(1.-uWarm);
    col=creviceFog(col, p, t, uFogK);
    if(uWarm>0.) col=mix(col, vec3(0.3,0.16,0.14)*0.35, (1.-exp(-0.003*t))*uWarm);
    return col;
  }
  if(uWorld<1.5){
    gKeyDir=vec3(-0.6,0.8,0.5); gKeyCol=vec3(2.0,1.85,1.6); gFillDir=vec3(0.7,-0.2,-0.3); gFillCol=vec3(0.4,0.5,0.12)*0.7; gAmb=vec3(0.03,0.035,0.015); gPLCol=vec3(0.);
    m=molMat(hPart); return lighting(m,p,n,rd,ao,1.);
  }
  // plate: black glossy plastic, wells lit from inside by their colony's glow
  gKeyDir=vec3(-0.4,0.9,0.3); gKeyCol=vec3(0.9,0.95,1.1); gFillDir=vec3(0.5,0.3,-0.8); gFillCol=vec3(0.15,0.2,0.3); gAmb=vec3(0.01); gPLCol=vec3(0.);
  vec2 c=hWellId-vec2(5.5,3.5); vec3 q=p-vec3(c.x,-0.42,c.y); float h=hash12(hWellId*1.7);
  vec3 glowC=mix(vec3(0.15,1.,0.55), vec3(0.2,0.8,1.), h)*(0.55+0.7*hash12(hWellId+3.))*uWellGlow;
  if(hMat>3.5){ m=mkMat(glowC*0.3); m.spec=1.5; m.gloss=90.; m.rim=1.; m.rimCol=glowC*0.8; m.emit=glowC*(0.45+0.5*tn(p*40.)); col=lighting(m,p,bumpN(p,n,40.,0.15),rd,ao,1.); }
  else { m=mkMat(vec3(0.02,0.022,0.026)); m.spec=1.4; m.gloss=160.; m.rim=0.35; m.rimCol=vec3(0.35,0.4,0.5); col=lighting(m,p,n,rd,ao,1.);
    float inside=smoothstep(0.02,-0.1,p.y); col+=glowC*exp(-length(q)*4.)*1.2*mix(0.25,1.,inside); }
  return col;
}
float gasD(vec3 p){
  if(uGasA<=0.) return 0.;
  if(uWorld<0.5){ // wisps rising out of the gaps between papillae
    vec2 cell=floor(p.xz/44.)*44.; vec2 g=p.xz-cell-vec2(0.); vec2 dq=abs(fract(p.xz/44.)-0.5)*44.; float gap=exp(-dot(dq-22.,dq-22.)/260.);
    float d=gap*smoothstep(10.,40.,p.y)*smoothstep(110.,70.,p.y);
    float n=tn(p*vec3(0.06,0.03,0.06)-vec3(0.,uTime*0.25,0.)), n2=tn(p*0.16+vec3(0.,-uTime*0.5,3.));
    return d*smoothstep(0.4,0.85,n*0.6+n2*0.4)*uGasA*0.045;
  }
  float n=tn(p*0.35-vec3(0.,uTime*0.4,0.)), n2=tn(p*0.9+vec3(0.,-uTime*0.7,2.));
  return smoothstep(0.45,0.9,n*0.6+n2*0.4)*exp(-max(-p.z-2.,0.)*0.15)*uGasA*0.12;
}
#define HAS_VOLUME
vec4 volume(vec3 ro, vec3 rd, float tmax, vec2 fc){
  vec4 sh=uWorld<0.5? creviceShafts(ro, rd, tmax, fc, uShafts) : vec4(0.);
  if(uGasA<=0.) return sh;
  float t1=min(tmax, uWorld<0.5? 260. : 40.); const int N=40; float dt=t1/float(N); float t=dt*hash12(fc);
  vec3 acc=vec3(0.); float T=1.;
  for(int i=ZERO;i<N;i++){ vec3 p=ro+rd*t; float dn=gasD(p);
    if(dn>0.){ vec3 c=mix(vec3(0.3,0.36,0.06), vec3(0.85,1.,0.35), clamp(dn*2.,0.,1.))*1.4; if(uWarm>0.) c=mix(c, vec3(1.4,0.9,0.45), uWarm*0.7); float a=1.-exp(-dn*dt); acc+=T*a*c; T*=1.-a; if(T<0.02) break; }
    t+=dt; }
  return vec4(acc+sh.rgb*T, 1.-T*(1.-sh.a));
}`;

  defineScene({
    name: 'everybody3d',
    anchor: { word: 4558, edge: 'end', offset: 0.25 },
    anchorEnd: { word: 4614, offset: -0.15 },
    tail: 0,
    setup(api) {
      this.r = M3.create(api, FRAG, { res: 0.5, aa: 2, steps: 160, stepScale: 0.8, sc: 1 });
      const A = (w) => api.at(w);
      const T = this.T = { smell: A(4568), yourself: A(4573), now: A(4577), fix: A(4587), and: A(4589), dont: A(4590), everybody: A(4593), everybodys: A(4597), bacteria: A(4600), wake: A(4608), morning: A(4611), breath: A(4612) };
      const c = -0.04;
      this.shots = [{ at: 0, k: 'field' }, { at: T.smell + c, k: 'blur' }, { at: T.now + c, k: 'focus' }, { at: T.and + c, k: 'calm' }, { at: T.everybody + c, k: 'well' }, { at: T.everybodys + c, k: 'plate' }, { at: T.wake + c, k: 'sunrise' }];
      const r = api.rand('e3-mol'); this.mols = Array.from({ length: 10 }, (_, i) => ({ p: i === 0 ? [0, 0, 0] : [(r() - 0.5) * 9, (r() - 0.5) * 5, -2 - r() * 12], s: i === 0 ? 1.1 : 0.5 + r() * 0.4, ph: r() * 6.28 }));
      const q = api.rand('e3-motes'); this.motes = Array.from({ length: 110 }, () => ({ p: [(q() - 0.5) * 60, q() * 90, (q() - 0.5) * 60], r: 0.06 + q() * 0.12, a: 0.2 + q() * 0.35, ph: q() * 6.28 }));
    },
    draw(ctx, t, api) {
      const { ease, clamp, lerp, prog, pop } = api, T = this.T;
      const s = M3.shot(t, this.shots, api.duration), k = s.k, u = clamp(s.lt / Math.max(0.1, s.len));
      let world = 0, ro, ta, fov = 2, roll = 0, focus, blur = 0.012, maxR = 0.024, shafts = 0, fogK = 0.008, warm = 0, gasA = 0, wellGlow = 0;
      let keyPos = [-7, 8, 6], keyCol = [1.6, 1.4, 1.2];
      const mol = new Float32Array(40);
      if (k === 'field') {
        const e = ease.inOutSine(u); ro = [lerp(-4, 8, e), 104, lerp(30, 22, e)]; ta = [lerp(6, 16, e), 72, -110]; fov = 1.9; focus = 60; blur = 0.009; gasA = 0.7; shafts = 0; fogK = 0.006; keyCol = [0.6, 0.55, 0.5];
      } else if (k === 'blur' || k === 'focus') {
        world = 1; gasA = 0.35;
        this.mols.forEach((m, i) => mol.set([m.p[0] + Math.sin(t * 0.4 + m.ph) * 0.3, m.p[1] + (t - T.smell) * 0.25 + Math.cos(t * 0.3 + m.ph) * 0.2, m.p[2], m.s], i * 4));
        const a = -0.25 + 0.3 * clamp((t - T.smell) / (T.fix - T.smell));
        ro = [Math.sin(a) * 6.5, 0.6, Math.cos(a) * 6.5]; ta = [0, 0.1 + (t - T.smell) * 0.25, 0]; fov = 2.5;
        if (k === 'focus') { const b2 = 0.55 + 0.25 * u; ro = [Math.sin(b2) * 4.6, 1.3 + (t - T.smell) * 0.25, Math.cos(b2) * 4.6]; ta = [0, 0.2 + (t - T.smell) * 0.25, 0]; fov = 2.7; }
        if (k === 'blur') { const b = ease.inOutCubic(clamp((t - T.smell - 0.4) / 0.9)); focus = lerp(6.5, 30, b); blur = lerp(0.016, 0.03, b); maxR = 0.045; }
        else { const b = ease.outCubic(clamp((t - T.now + 0.02) / 0.3)); focus = lerp(30, 4.6, b); blur = lerp(0.03, 0.018, b); maxR = 0.045; }
      } else if (k === 'calm') {
        const e = ease.inOutSine(u); ro = [0.5, lerp(5.2, 4.6, e), lerp(17, 15.5, e)]; ta = [0, 1.1, 0]; focus = 16; blur = 0.012; keyCol = [1.1, 1.2, 1.45]; shafts = 0.3;
      } else if (k === 'well') {
        world = 2; wellGlow = prog(t, T.everybody - 0.15, 0.35); const e = ease.inOutSine(u);
        ro = [0.5 + 0.2 * e, lerp(1.9, 1.7, e), 0.5 + 1.25]; ta = [0.5, -0.4, 0.5]; fov = 2.3; focus = Math.hypot(ro[0] - 0.5, ro[1] + 0.4, ro[2] - 0.5); blur = 0.02; maxR = 0.034;
      } else if (k === 'plate') {
        world = 2; wellGlow = 1; const e = ease.inOutCubic(u);
        ro = [lerp(0.5, -4, e), lerp(1.7, 3.4, e), lerp(1.75, 8.5, e)]; ta = [lerp(0.5, 0.8, e), -0.4, lerp(0.5, -0.8, e)]; fov = 2.1; focus = Math.hypot(ro[0] - ta[0], ro[1] - ta[1], ro[2] - ta[2]); blur = 0.016; maxR = 0.03;
      } else {
        const e = ease.inOutSine(u); warm = 1; gasA = 0.6; fogK = 0.003; shafts = 0;
        ro = [lerp(-8, -4, e), lerp(70, 74, e), lerp(60, 50, e)]; ta = [lerp(4, 8, e), 62, -60]; fov = 1.9; focus = 70; blur = 0.009;
      }
      const cam = M3.camera(ro, ta, roll, fov), dof = { focus, blur, maxR };
      const cv = this.r.draw({ uTime: t, ...cam.uniforms, uWorld: world, uShafts: shafts, uFogK: fogK, uWarm: warm, uGasA: gasA, uWellGlow: wellGlow, uKeyPos: keyPos, uKeyCol: keyCol,
        uMol: { v4: mol }, uHeroC: [0, -50, 0], uHeroD: [1, 0, 0], uHeroS: 0, uClear: [100, 100, 1, 2] }, dof);
      ctx.drawImage(cv, 0, 0, api.W, api.H);
      if (world === 0) M3.motes(ctx, cam, dof, this.motes.map((m) => ({ ...m, p: [m.p[0] + Math.sin(t * 0.3 + m.ph), m.p[1] + t * 0.4, m.p[2]] })), { color: warm ? '255,210,160' : '220,230,255', alpha: 0.5 });
      if (k === 'well') api.label(ctx, 'EVERYBODY', 960, 190, { p: pop(t, T.everybody), size: 72, align: 'center' });
      if (k === 'plate') api.label(ctx, 'EVERYBODY', 960, 190, { p: 1, size: 72, align: 'center' });
      if (k === 'sunrise') api.label(ctx, 'MORNING BREATH', 960, 900, { p: pop(t, T.morning), size: 70, align: 'center' });
      M3.art(ctx, api);
      api.finish(ctx, t, { bloom: 0.36, grain: 0.05, vignette: 0.5 });
    },
  });
})();
