// @use videos/bad-breath-for-good/scenes/micro3d/_lib.js
// gas3d (replaces micro/sulfur-gas) · words 1144-1196: "So when the bacteria eat that and then they will poop out their remains,
// well, they poop out sulfur gas. We actually call these volatile sulfur compounds. And one of the main ones is the same gas that
// makes that rotten egg smell."
// Same crevice world as colony3d. Shots: a bacterium beside a protein strand (sulfur-carrying beads in yellow) / close: the strand
// is drawn into the cell / behind it: H2S molecules pop out with a puff / the colony releasing yellow-green gas (SULFUR GAS) / the
// gas rising between the papillae / looking up the gas column (VOLATILE SULFUR COMPOUNDS) / one H2S molecule, studio-lit (H2S ·
// hydrogen sulfide) / an egg with a cracked cap, the gas pouring out (ROTTEN EGG SMELL).
// Research-notes rows 8-9: anaerobes break down sulfur-containing amino acids from proteins into volatile sulfur compounds;
// hydrogen sulfide is one of the two main ones and is the rotten-egg smell. The bead chain is a picture of a protein, not a model.
(function () {
  const NB = 14, NM = 24, NE = 6;
  const FRAG = M3.GLSL.core + M3.GLSL.cam + `
uniform float uWorld, uShafts, uFogK, uHaze, uEggOpen, uGasEgg, uBgGlow;
uniform vec3 uKeyPos, uKeyCol;
uniform vec4 uBead[${NB}];
uniform vec4 uMol[${NM}];
uniform vec4 uGasE[${NE}];
uniform vec4 uHero;
` + M3.GLSL.creviceHead + M3.GLSL.bact + M3.GLSL.pap + M3.GLSL.mol + M3.GLSL.creviceBody + `
float gBeadS;
float chain(vec3 p){
  float d=1e5; gBeadS=0.;
  for(int i=ZERO;i<${NB};i++){ vec4 b=uBead[i]; float r=abs(b.w); if(r<0.01) continue;
    float db=length(p-b.xyz)-r; if(db<d){ d=db; gBeadS=b.w<0.?1.:0.; }
    if(i>0){ vec4 a=uBead[i-1]; if(abs(a.w)>0.01){ float ds=sdCapsule(p,a.xyz,b.xyz,0.075); if(ds<d){ d=ds; gBeadS=2.; } } }
  }
  return d;
}
float mols(vec3 p){
  float d=1e5;
  for(int i=ZERO;i<${NM};i++){ vec4 m=uMol[i]; if(m.w<=0.01) continue; float b=length(p-m.xyz); if(b>2.2*m.w){ d=min(d,b-1.5*m.w); continue; }
    mat3 R=rotAxis(hash33(vec3(float(i),7.,3.))-.5, uTime*1.3+float(i)*2.);
    if(i==0 && uWorld>0.5 && uWorld<1.5) R=rotY(0.35*sin(uTime*0.6))*rotX(0.12);
    float o=h2s(p, m.xyz, R, m.w); if(o<d){ d=o; gMat=2.; } }
  return d;
}
// ---- the egg: pointed egg, shell with a zig-zag crack, cap lifted and tilted on a hinge at the back
float gEggIn;
float crackY(vec3 p){ float a=atan(p.z,p.x); float z=abs(fract(a*9./6.2832)*2.-1.)*2.-1.; return 0.62+0.09*z+0.03*(tn(p*6.)-0.5); }
float egg(vec3 p){
  vec3 q=p-vec3(0.,1.,0.); q.y/=1.08;
  float e=sdEgg(q, 1., 0.42)*1.0;
  float shell=abs(e)-0.035;
  float yc=crackY(q);
  float bottom=max(shell, q.y-yc);
  // cap: rotate about a hinge at the back top
  vec3 h=vec3(0.,yc,-0.95); vec3 c=q-h; c.yz=rot2(-0.55*uEggOpen)*c.yz; c+=h; c.y-=0.12*uEggOpen;
  float ec=sdEgg(c,1.,0.42); float cap=max(abs(ec)-0.035, crackY(c)-c.y);
  gEggIn=step(0.,-e);
  return min(bottom, cap);
}
float map(vec3 p){
  gMat=0.;
  if(uWorld<0.5){
    float d=crevice(p);
    if(p.y<6. && length(p.xz-uHero.xz)<14.){ float c=chain(p); if(c<d){ d=c; gMat=3.; } }
    float m=mols(p); if(m<d){ d=m; gMat=2.; }
    return d;
  }
  if(uWorld<1.5){ return mols(p); }
  float fl=p.y+0.02;
  float e=egg(p);
  float m=mols(p);
  float d=min(fl,e); gMat=e<fl?4.:5.; if(m<d){ d=m; gMat=2.; }
  return d;
}
float hMat, hHue, hTyp, hStr, hTip, hBl, hPart, hBead;
void saveMat(){ hMat=gMat; hHue=gBHue; hTyp=gBType; hStr=gBStrand; hTip=gTip; hBl=smoothstep(-0.2,0.2,gDT-gDC); hPart=gMolPart; hBead=gBeadS; }
#include <raymarch>
vec3 studioBg(vec3 rd){ float v=clamp(rd.y*0.8+0.4,0.,1.); return mix(vec3(0.008,0.009,0.004), vec3(0.05,0.06,0.018), v) + vec3(0.18,0.22,0.04)*uBgGlow*pow(max(dot(rd,normalize(vec3(-0.3,0.4,-1.))),0.),6.); }
vec3 shade(vec3 ro, vec3 rd, out float dist){
  vec3 n; float ao;
  float t=trace(ro, rd, uWorld<0.5?280.:60., n, ao);
  if(t<0.){ dist=1e4; return uWorld<0.5? creviceSky(rd) : studioBg(rd); }
  dist=t;
  vec3 p=ro+rd*t;
  Mat m; vec3 nn=n; vec3 col;
  if(uWorld<0.5){
    creviceLights(p, uKeyPos, uKeyCol);
    if(hMat>2.5){ if(hBead>1.5){ m=mkMat(vec3(0.5,0.48,0.5)); m.spec=1.2; } else if(hBead>0.5){ m=molMat(0.); m.emit=vec3(0.25,0.18,0.)*0.5; } else { m=mkMat(vec3(0.36,0.32,0.62)); m.spec=1.8; m.gloss=120.; m.rimCol=vec3(0.5,0.45,0.9); m.sss=0.3; } }
    else if(hMat>1.5){ m=molMat(hPart); }
    else m=creviceMat(p, n, hTip, hBl, hHue, hTyp, hStr, nn);
    col=lighting(m,p,nn,rd,ao,1.);
    col+=creviceWet(rd,n)*step(hMat,1.5);
    return creviceFog(col, p, t, uFogK);
  }
  // studio worlds: warm key top-left, cool rim from behind, yellow-green bounce from the gas
  gKeyDir=vec3(-0.6,0.8,0.5); gKeyCol=vec3(2.2,2.0,1.75);
  gFillDir=vec3(0.7,-0.2,-0.3); gFillCol=vec3(0.45,0.55,0.12)*0.8;
  gAmb=vec3(0.03,0.035,0.015); gPLCol=vec3(0.);
  if(hMat>4.5){ // floor
    m=mkMat(vec3(0.05,0.05,0.045)); m.spec=0.6; m.gloss=40.; m.rim=0.;
    col=lighting(m,p,n,rd,ao,1.);
    vec2 so=p.xz-vec2(0.45,-0.35); float sh=smoothstep(0.7,1.6,length(so*vec2(1.,1.2)));
    col*=0.3+0.7*sh;
    col+=vec3(0.5,0.6,0.1)*0.12*uGasEgg*exp(-length(p.xz)*1.2);
    col=mix(col, studioBg(rd), smoothstep(2.5,9.,length(p.xz)));
  } else if(hMat>3.5){ // egg shell
    vec3 alb=vec3(0.86,0.8,0.7)*(0.92+0.12*tn(p*9.))-0.1*smoothstep(0.6,0.9,tn(p*22.+3.));
    m=mkMat(alb); m.spec=0.5; m.gloss=25.; m.rim=0.35; m.rimCol=vec3(0.6,0.7,0.9); m.sss=0.35; m.sssCol=vec3(1.,0.8,0.55)*0.6; m.wrap=0.5;
    col=lighting(m,p,n,rd,ao,1.);
    // inner surface: dark, lit by the gas glow
    vec3 q=p-vec3(0.,1.,0.); q.y/=1.08; float e=sdEgg(q,1.,0.42);
    float inner=smoothstep(0.01,-0.03,e+0.0)*step(dot(n,q),0.);
    col=mix(col, vec3(0.18,0.2,0.04)*(0.4+1.2*uGasEgg)*ao, inner);
  } else { m=molMat(hPart); col=lighting(m,p,n,rd,ao,1.); }
  return col;
}
// yellow-green gas: plumes rising from emitters, a column filling the crevice, the egg's plume
float gasDens(vec3 p){
  float d=0.;
  for(int i=ZERO;i<${NE};i++){ vec4 e=uGasE[i]; if(e.w<=0.) continue;
    float h=p.y-e.y; if(h<-1.5) continue;
    float hh=max(h,0.);
    vec2 ax=e.xz+vec2(sin(hh*0.25+uTime*0.5+float(i)), cos(hh*0.2+float(i)*2.))*hh*0.14;
    float r=(0.55+hh*0.28)*(uWorld>1.5?0.6:1.)*(uWorld>0.5&&uWorld<1.5?2.2:1.); vec2 dq=(p.xz-ax)/r; float q=dot(dq,dq);
    d+=e.w*exp(-q*1.4)*smoothstep(-1.5,0.2,h)/(1.+hh*0.3);
  }
  if(uWorld<0.5) d+=uHaze*exp(-dot(p.xz,p.xz)/(50.+p.y*8.))*smoothstep(0.,5.,p.y)*0.5;
  if(d<0.002) return 0.;
  float n=tn(p*0.45-vec3(0.,uTime*0.9,0.)), n2=tn(p*1.2-vec3(0.,uTime*1.6,0.)+7.3);
  float w=smoothstep(0.32,0.78,n*0.62+n2*0.38);
  return d*w*2.2;
}
#define HAS_VOLUME
vec4 volume(vec3 ro, vec3 rd, float tmax, vec2 fc){
  vec4 sh=vec4(0.);
  if(uWorld<0.5) sh=creviceShafts(ro, rd, tmax, fc, uShafts);
  // bound: vertical cylinder around the action
  vec2 cxz=vec2(0.); float R=uWorld<0.5? 17. : (uWorld<1.5? 12. : 4.);
  vec2 o=ro.xz-cxz, dxz=rd.xz; float a=dot(dxz,dxz), b=dot(o,dxz), c=dot(o,o)-R*R; float disc=b*b-a*c;
  if(disc<0.) return sh;
  float s=sqrt(disc); float t0=max((-b-s)/a,0.), t1=min((-b+s)/a, min(tmax, 160.));
  if(t1<=t0) return sh;
  const int N=44; float dt=(t1-t0)/float(N); float t=t0+dt*hash12(fc);
  vec3 acc=vec3(0.); float T=1.;
  for(int i=ZERO;i<N;i++){
    vec3 p=ro+rd*t; float dn=gasDens(p);
    if(dn>0.){
      float lit=uWorld<0.5? mix(0.35,1.2,smoothstep(0.,60.,p.y)) : 1.;
      vec3 cg=mix(vec3(0.2,0.26,0.03), vec3(0.85,1.,0.32), clamp(dn*1.4,0.,1.))*lit*1.7;
      float al=1.-exp(-dn*dt*0.75);
      acc+=T*al*cg; T*=1.-al; if(T<0.02) break;
    }
    t+=dt;
  }
  return vec4(acc+sh.rgb*T, 1.-T*(1.-sh.a));
}`;

  defineScene({
    name: 'gas3d',
    anchor: { word: 1144, offset: -0.15 },
    anchorEnd: { word: 1197, offset: -0.15 },
    tail: 0,
    setup(api) {
      this.r = M3.create(api, FRAG, { res: 0.5, aa: 2, steps: 160, stepScale: 0.8, sc: 1 });
      const A = (w) => api.at(w), V = M3.v;
      const T = this.T = { bacteria: A(1147), eat: A(1148), poop: A(1154), remains: A(1157), well: A(1158), they2: A(1159), poop2: A(1160), sulfur: A(1162), gas: A(1163), we: A(1164), volatile: A(1168), sulfur2: A(1169), compounds: A(1170), one: A(1172), ones: A(1176), same: A(1179), rotten: A(1184), egg: A(1185), smell: A(1186) };
      const c = -0.04;
      this.shots = [
        { at: 0, k: 'approach' }, { at: T.eat + c, k: 'eat' }, { at: T.poop + c, k: 'rear' }, { at: T.they2 + c, k: 'plumes' },
        { at: T.we + c, k: 'rise' }, { at: T.volatile + c, k: 'column' }, { at: T.one + c, k: 'mol' }, { at: T.same + c, k: 'egg' },
      ];
      // hero bacterium beside a protein strand
      const D = this.D = V.norm([0.3, 0.04, 1]), S = this.S = V.norm([D[2], 0, -D[0]]);
      const hx = -6.2, hz = 2.2; this.H = [hx, M3.groundH(hx, hz) + 0.62, hz];
      this.front = V.add(this.H, V.mul(D, 1.72)); this.rear = V.add(this.H, V.mul(D, -1.72));
      // strand path on the floor, curving gently away from the front
      this.path = (s) => { const b = V.add(this.front, V.add(V.mul(D, s * 0.92), V.mul(S, 0.9 * Math.sin(s * 0.55) - 0.2 * s))); b[1] = M3.groundH(b[0], b[2]) + 0.32; return b; };
      this.sulfurBead = (i) => i % 4 === 1 || i === 6;
      // molecules: births (hero first, then the colony emitters)
      const r = api.rand('g3-mol'); this.mols = [];
      const em = [[-2.5, 0.8, -1.5], [2.2, 1.2, 1.4], [0.3, 1.5, -3.2], [3.4, 0.9, -1.2]].map((e) => [e[0], M3.groundH(e[0], e[2]) + 0.6, e[2]]);
      this.em = em;
      const heroBirth = [T.poop + 0.05, T.poop + 0.3, T.poop + 0.55, T.poop2 - 0.05, T.poop2 + 0.2, T.poop2 + 0.45];
      heroBirth.forEach((b, i) => this.mols.push({ b, e: this.rear, kick: V.add(V.mul(D, -0.5 - r() * 0.4), V.add(V.mul(S, (i % 2 ? 1 : -1) * (0.5 + r() * 0.5)), [0, 0.4 + r() * 0.5, 0])), s: 0.24 + r() * 0.05, rise: 0.45 + r() * 0.25 }));
      for (let tb = T.they2 + 0.2, k = 0; tb < T.one; tb += 0.28, k++) { const e = em[k % 4]; this.mols.push({ b: tb, e, kick: [(r() - 0.5) * 1.6, 0.5 + r() * 0.5, (r() - 0.5) * 1.6], s: 0.26 + r() * 0.06, rise: 0.9 + r() * 0.6 }); }
      // studio molecules (world 1) and egg molecules (world 2) are placed per shot in draw()
      const q = api.rand('g3-motes'); this.motes = Array.from({ length: 100 }, () => ({ p: [(q() - 0.5) * 40, q() * 60, (q() - 0.5) * 40], r: 0.05 + q() * 0.1, a: 0.2 + q() * 0.35, ph: q() * 6.28 }));
      const q2 = api.rand('g3-studio'); this.bg = Array.from({ length: 14 }, (_, i) => ({ p: [(q2() - 0.5) * 16, (q2() - 0.5) * 9, -4 - q2() * 22], s: 0.7 + q2() * 0.5 }));
      this.bg.push({ p: [-3.4, -1.6, 5.0], s: 0.55 });
    },
    molAt(m, t) { const age = t - m.b; if (age < 0) return null; const V = M3.v;
      const k = 1 - Math.exp(-age * 3.2), rise = m.rise * (0.6 * age + 0.5 * age * age);
      const p = V.add(m.e, V.add(V.mul(m.kick, k), [Math.sin(age * 1.7 + m.b) * 0.25, rise, Math.cos(age * 1.3 + m.b) * 0.25]));
      return [p[0], p[1], p[2], m.s * Math.min(1, age / 0.18)]; },
    draw(ctx, t, api) {
      const { ease, clamp, lerp, prog, pop } = api, T = this.T, V = M3.v;
      const s = M3.shot(t, this.shots, api.duration), k = s.k, u = clamp(s.lt / Math.max(0.1, s.len));
      const H = this.H, D = this.D, S = this.S;
      let world = 0, ro, ta, fov = 2, roll = 0, focus, blur = 0.013, maxR = 0.024, shafts = 0.25, fogK = 0.009, haze = 0, eggOpen = 0, gasEgg = 0;
      let keyPos = [H[0] - 2, H[1] + 6, H[2] + 5], keyCol = [2.0, 1.75, 1.45];
      const junction = V.add(this.front, V.mul(D, 0.2));
      const cc = V.add(H, V.add(V.mul(D, 2.5), V.mul(S, 1.8)));
      let clear = ['approach', 'eat', 'rear'].includes(k) ? [cc[0], cc[2], 5.5, 8] : [H[0] + D[0] * 3, H[2] + D[2] * 3, 2.5, 4.5];
      // eating: beads slide into the cell during 'eat'
      const eat = 3.3 * ease.inOutSine(clamp((t - T.eat + 0.1) / (T.poop - T.eat + 0.2)));
      const beads = new Float32Array(56);
      for (let i = 0; i < 14; i++) { const sp = i * 0.72 - eat; const b = this.path(Math.max(sp, -0.9)); let rr = 0.3 * clamp((sp + 0.7) / 0.7); if (sp < -0.1) b[1] -= 0.1; beads.set([b[0], b[1], b[2], this.sulfurBead(i) ? -rr : rr], i * 4); }
      // molecules for this frame: newest 24 alive
      let mol = [];
      if (k === 'mol') { world = 1; mol = [[0, 0, 0, 2.0], ...this.bg.map((b) => [b.p[0] + Math.sin(t * 0.4 + b.p[2]) * 0.3, b.p[1] + t * 0.15, b.p[2], b.s])]; }
      else if (k === 'egg') { world = 2; const rr = api.rand('g3-eggm'); for (let i = 0; i < 9; i++) { const a = rr() * 6.28, age = t - T.rotten - 0.05 + rr() * 0.7; if (age < 0) { rr(); rr(); continue; } mol.push([Math.cos(a) * (0.4 + age * 0.35), 1.9 + age * 0.55 + rr() * 0.6, Math.sin(a) * (0.4 + age * 0.35) - 0.2, 0.2 * Math.min(1, age * 2) * (0.8 + rr() * 0.4)]); } }
      else { for (const m of this.mols) { const p = this.molAt(m, t); if (p && p[1] < 80) mol.push(p); } mol = mol.slice(-24); }
      const molArr = new Float32Array(96); mol.slice(0, 24).forEach((m, i) => molArr.set(m, i * 4));
      // gas emitters
      const gas = new Float32Array(24);
      const heroGas = 0.9 * prog(t, T.poop, 0.4) * (1 - 0.5 * prog(t, T.volatile, 2));
      gas.set([this.rear[0] - D[0] * 0.8, this.rear[1] - 0.2, this.rear[2] - D[2] * 0.8, heroGas], 0);
      this.em.forEach((e, i) => gas.set([e[0], e[1] - 0.3, e[2], 0.55 * prog(t, T.they2 + 0.1 + i * 0.15, 0.8)], 4 + i * 4));
      if (k === 'approach') {
        const e = ease.inOutSine(u); const tgt = V.add(junction, [0, 0.2, 0]);
        ro = V.add(tgt, V.add(V.mul(S, lerp(7.4, 6.2, e)), [0, 2.3, 0])); ro = V.add(ro, V.mul(D, 1.2)); ta = tgt; fov = 2.1;
        focus = Math.hypot(...V.sub(ro, tgt)); blur = 0.016;
      } else if (k === 'eat') {
        const tgt = V.add(junction, [0, 0.15, 0]);
        ro = V.add(tgt, V.add(V.mul(S, 2.9 - 0.35 * u), [0, 0.95, 0])); ro = V.add(ro, V.mul(D, 0.9 - 0.3 * u)); ta = tgt; fov = 2.5;
        focus = Math.hypot(...V.sub(ro, tgt)); blur = 0.024; maxR = 0.032;
      } else if (k === 'rear') {
        const tgt = V.add(this.rear, V.add(V.mul(D, -0.7), [0, 0.35, 0]));
        ro = V.add(tgt, V.add(V.mul(D, -1.6 + 0.25 * u), V.add(V.mul(S, 2.9), [0, 1.2, 0]))); ta = V.add(tgt, V.mul(D, 0.5)); fov = 2.3;
        focus = Math.hypot(...V.sub(ro, V.add(this.rear, [0, 0.3, 0]))); blur = 0.02; maxR = 0.03; keyPos = V.add(this.rear, [-2, 5, -3]);
      } else if (k === 'plumes') {
        const e = ease.inOutSine(u); ro = [lerp(13, 11, e), lerp(4.5, 5.5, e), lerp(12, 11, e)]; ta = [-0.5, 3, 0]; fov = 1.9;
        focus = 16; blur = 0.011; keyPos = [-4, 9, 6];
      } else if (k === 'rise') {
        const e = ease.inOutCubic(u); ro = [2.5, lerp(5, 15, e), lerp(26, 28, e)]; ta = [0, lerp(4, 19, e), 0]; fov = 1.9; focus = 26; blur = 0.011; haze = 0.1 * e; shafts = 0.35;
      } else if (k === 'column') {
        ro = [5.5, 2.4 + 1.2 * u, 12]; ta = [-0.5, 26, -2]; fov = 1.6; roll = -0.03; focus = 20; blur = 0.009; haze = 0.14 + 0.06 * u; shafts = 0.5; fogK = 0.006;
      } else if (k === 'mol') {
        const a = -0.45 + 0.45 * u; ro = [Math.sin(a) * 8.6, 1.0 - 0.3 * u, Math.cos(a) * 8.6]; ta = [0, -0.1, 0]; fov = 2.8; focus = 8.6; blur = 0.02; maxR = 0.034;
        gas.fill(0); gas.set([-2.4, -5, -4, 0.45], 0); gas.set([2.8, -5, -7, 0.4], 4);
      } else {
        const a = 0.35 + 0.25 * u; ro = [Math.sin(a) * 7.2, 2.6 + 0.3 * u, Math.cos(a) * 7.2]; ta = [0, 1.25, 0]; fov = 2.3; focus = 7.3; blur = 0.016;
        eggOpen = ease.outBack(clamp((t - T.rotten + 0.25) / 0.5), 1.4); gasEgg = prog(t, T.rotten - 0.1, 0.6);
        gas.fill(0); gas.set([0, 1.75, 0.2, 1.3 * gasEgg], 0);
      }
      const cam = M3.camera(ro, ta, roll, fov), dof = { focus, blur, maxR };
      const cv = this.r.draw({ uTime: t, ...cam.uniforms, uWorld: world, uShafts: shafts, uFogK: fogK, uHaze: haze, uEggOpen: eggOpen, uGasEgg: gasEgg, uBgGlow: world === 2 ? 0.25 + 0.75 * gasEgg : 1,
        uKeyPos: keyPos, uKeyCol: keyCol, uBead: { v4: beads }, uMol: { v4: molArr }, uGasE: { v4: gas },
        uHero: [H[0], H[1], H[2], 1], uHeroC: H, uHeroD: D, uHeroS: 1.5 * (1 + 0.04 * Math.sin(t * 9) * prog(t, T.eat, 0.3) * (1 - prog(t, T.poop, 0.3))),
        uClear: clear }, dof);
      ctx.drawImage(cv, 0, 0, api.W, api.H);
      if (world === 0) M3.motes(ctx, cam, dof, this.motes.map((m) => ({ ...m, p: [m.p[0] + Math.sin(t * 0.3 + m.ph) * 0.6, m.p[1] + t * 0.3, m.p[2]] })), { color: '240,255,200', alpha: 0.5 });
      // ---------- type
      if (k === 'approach') { const b = this.path(5.2 - eat); const p = M3.project(cam, b); if (p) M3.callout(ctx, api, p.x, p.y - 12, p.x + 170, p.y - 200, 'protein', prog(t, T.bacteria + 0.1, 0.6), { size: 42 }); }
      if (k === 'plumes') {
        const m = mol.filter((q) => q[1] > 3 && q[1] < 9).map((q) => ({ q, s: M3.project(cam, q) })).filter((o) => o.s && o.s.x > 700 && o.s.x < 1300).sort((a, b) => a.s.y - b.s.y)[0];
        if (!this.gasPin && m && t >= T.sulfur) this.gasPin = m.q;
        const pinned = m ? M3.project(cam, m.q) : null;
        if (pinned) M3.callout(ctx, api, pinned.x, pinned.y, pinned.x + 240, pinned.y - 170, 'sulfur gas', prog(t, T.sulfur, 0.6), { size: 48 });
      }
      if (k === 'column') {
        M3.headline(ctx, api, t, [['VOLATILE', T.volatile], ['SULFUR', T.sulfur2, '#e9e24a'], ['COMPOUNDS', T.compounds]], 960, 880, { size: 104 });
        api.label(ctx, 'VSCs', 960, 960, { p: pop(t, T.compounds + 0.4), size: 44, align: 'center', upper: false });
      }
      if (k === 'mol') {
        const p = M3.project(cam, [0.25, 0.75, 0.3]);
        if (p) M3.callout(ctx, api, p.x, p.y, p.x + 300, p.y - 170, 'H₂S', prog(t, T.ones, 0.6), { size: 64, sub: 'hydrogen sulfide', subSize: 34 });
      }
      if (k === 'egg') api.label(ctx, 'ROTTEN EGG SMELL', 960, 950, { p: pop(t, T.egg), size: 66, align: 'center' });
      M3.art(ctx, api);
      api.finish(ctx, t, { bloom: 0.34, grain: 0.05, vignette: 0.5 });
    },
  });
})();
