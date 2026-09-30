// @use videos/bad-breath-for-good/scenes/micro3d/_lib.js
// tonsilstone3d (NEW) · words 1699-1762: "And trust me, these ones, they smell different. They smell a whole world of different. If you've
// ever grabbed a tonsil stone, smished it in your mouth and smelled it, you know exactly what I'm talking about. It's not good. And
// I can tell if someone has tonsil stones a mile away. It's a way different smell."
// Starts where throat/crypts ends (word 1699 - 0.15) and ends where data/ct-study starts (word 1778 - 0.15). The transparent
// overlay/mile-away sits on the last 2.6 s (nose + dotted line on the right third), so the last shot keeps that area calm.
// A macro tonsil stone: lodged in a crypt (tonsil stone) / alone like a small planet with a haze of gas ("a whole world of
// different") / on a dark surface, squashed and cracking, a puff of gas ("smished it") / the plume rising ("smelled it") / the gas
// curling ("not good") / a long trail of gas drifting away across a dark plain ("a mile away"). No numbers, no claims on screen.
(function () {
  const FRAG = M3.GLSL.core + M3.GLSL.cam + `
uniform float uWorld, uCrush, uGas, uSpin, uTrail;
uniform vec3 uKeyPos, uKeyCol;
float gMat, gChunk;
float stone(vec3 p){
  float d=sdEllipsoid(p, vec3(1.0,0.74,0.86));
  if(d>0.6) return d;
  d+=0.2*(tn(p*1.5+3.1)-0.5)+0.09*(tn(p*3.6+7.)-0.5)+0.035*(tn(p*9.+1.)-0.5);
  d+=0.055*smoothstep(0.6,0.82,tn(p*5.5+13.));
  return d*0.75;
}
mat3 spinM(){ return rotY(uSpin)*rotX(0.25); }
// squashed and cracked: five wedge chunks pushed apart and flattened
float crushed(vec3 p){
  if(uCrush<=0.) return stone(spinM()*p);
  float d=1e5, sq=1.-0.38*uCrush;
  for(int i=ZERO;i<5;i++){
    float ca=(float(i)+0.5)*1.2566+0.3; vec3 off=vec3(cos(ca),0.,sin(ca))*uCrush*(0.42+0.14*float(i%2))-vec3(0.,0.24*uCrush,0.);
    vec3 q=p-off; q.y/=sq;
    float a=atan(q.z,q.x); float da=abs(mod(a-ca+PI,2.*PI)-PI)-0.6283+0.07*(tn(q*4.+float(i))-0.5)*6.;
    float wedge=da*length(q.xz)*0.9;
    float sd=stone(spinM()*q)*sq; float di=max(sd, wedge+0.02*uCrush);
    if(di<d){ d=di; gChunk=float(i)+(wedge+0.02*uCrush>sd?10.:0.); }
  }
  return d;
}
float tissue(vec3 p){
  float s=p.y-0.45*(tn(vec3(p.xz*0.22,1.))-0.5)-0.22*(tn(vec3(p.xz*0.7,5.))-0.5)+0.12*abs(tn(p*1.3+2.)-0.5)*2.-0.4*exp(-dot(p.xz-vec2(3.,-2.),p.xz-vec2(3.,-2.))/8.);
  s=smax(s, -sdEllipsoid(p-vec3(0.,0.25,0.), vec3(1.45,1.35,1.25)), 0.7);
  s=smin(s, sdEllipsoid(p-vec3(-2.6,-0.2,-1.4), vec3(1.8,1.,1.6)), 0.8);
  return s;
}
float map(vec3 p){
  gMat=0.;
  if(uWorld<0.5){ float t=tissue(p); float s=stone(spinM()*(p-vec3(0.,0.22,0.))); if(s<t){ gMat=1.; return s; } return t; }
  if(uWorld<1.5){ gMat=1.; return stone(spinM()*p); }
  float fl=p.y+0.78;
  float s=uWorld<2.5? crushed(p) : stone(spinM()*p);
  if(s<fl){ gMat=1.; return s; }
  gMat=2.; return fl;
}
float hMat, hChunk;
void saveMat(){ hMat=gMat; hChunk=gChunk; }
#include <raymarch>
Mat stoneMat(vec3 p){
  vec3 q=spinM()*p;
  vec3 alb=mix(vec3(0.74,0.62,0.33), vec3(0.56,0.44,0.2), tn(q*2.2+4.));
  alb*=0.78+0.3*tn(q*7.)-0.18*smoothstep(0.62,0.85,tn(q*5.5+13.));
  Mat m=mkMat(alb); m.spec=0.7; m.gloss=35.; m.rim=0.6; m.rimCol=vec3(0.75,0.8,0.55); m.sss=0.45; m.sssCol=vec3(1.,0.85,0.5)*0.55; m.wrap=0.5;
  return m;
}
vec3 bgCol(vec3 rd){ float v=clamp(rd.y*0.6+0.45,0.,1.); return mix(vec3(0.008,0.006,0.012), vec3(0.03,0.025,0.04), v); }
vec3 shade(vec3 ro, vec3 rd, out float dist){
  vec3 n; float ao;
  float t=trace(ro, rd, 400., n, ao);
  gKeyDir=vec3(-0.6,0.85,0.45); gKeyCol=vec3(1.65,1.5,1.3);
  gFillDir=vec3(0.7,-0.1,-0.5); gFillCol=uWorld<0.5? vec3(0.45,0.12,0.16)*0.7 : vec3(0.2,0.24,0.35)*0.6;
  gAmb=vec3(0.02,0.018,0.025); gPLPos=uKeyPos; gPLCol=uKeyCol; gPLR=4.;
  if(t<0.){ dist=1e4; return bgCol(rd); }
  dist=t; vec3 p=ro+rd*t; vec3 col;
  if(hMat>1.5){ // dark studio floor, fading into the backdrop
    Mat m=mkMat(vec3(0.035,0.032,0.04)); m.spec=0.9; m.gloss=60.; m.rim=0.;
    col=lighting(m,p,n,rd,ao,1.);
    col*=0.4+0.6*smoothstep(0.6,1.5,length(p.xz));
    col=mix(col, bgCol(rd), smoothstep(6.,uWorld>2.5? 120.:14., length(p.xz-ro.xz)));
  } else if(hMat>0.5){ Mat m=stoneMat(p); if(hChunk>9.){ m.alb=m.alb*vec3(0.75,0.66,0.5); m.spec=0.2; m.rim*=0.4; } vec3 nn=bumpNR(p, spinM(), n, 14., hChunk>9.?0.12:0.05); col=lighting(m,p,nn,rd,ao,1.); }
  else { // tonsil tissue: lumpy, wet, deep pink
    float cr=abs(tn(p*1.3+2.)-0.5)*2.; vec3 alb=mix(vec3(0.22,0.025,0.05), vec3(0.46,0.09,0.13), tn(p*0.9))*mix(0.55,1.,smoothstep(0.,0.25,cr)); alb*=0.8+0.3*tn(p*3.2);
    Mat m=mkMat(alb); m.spec=2.2; m.gloss=110.; m.rim=0.4; m.rimCol=vec3(0.5,0.3,0.6); m.sss=0.3; m.sssCol=vec3(1.,0.3,0.3)*alb; m.wrap=0.6;
    col=lighting(m,p,bumpN(p,n,3.,0.08),rd,ao,1.);
    col*=mix(0.35,1.,smoothstep(-0.9,0.3,p.y));
  }
  return col;
}
// gas: wisps off the stone (crypt), an atmosphere (planet), a burst and plume (studio), a long drifting trail (mile)
float gasD(vec3 p){
  float d=0.;
  if(uWorld<0.5){ vec3 q=p-vec3(0.,0.9,0.); float h=max(q.y,0.); d=exp(-dot(q.xz,q.xz)/(0.25+h*0.5))*smoothstep(-0.4,0.3,q.y)/(1.+h*0.5)*0.9; }
  else if(uWorld<1.5){ float r=length(p); d=exp(-max(r-0.95,0.)*5.)*smoothstep(0.75,1.,r)*0.45; }
  else if(uWorld<2.5){ float h=max(p.y+0.3,0.); float r=0.45+h*0.42; vec2 ax=vec2(sin(h*0.9+uTime*0.6),cos(h*0.7))*h*0.12; d=exp(-dot(p.xz-ax,p.xz-ax)/(r*r))*smoothstep(-0.9,0.,p.y)/(1.+h*0.18); d+=exp(-dot(p,p)/(0.4+uCrush*1.2))*0.45; d*=0.6; }
  else { float x=max(p.x,0.); vec3 c=vec3(x, 0.2+0.035*x+0.6*sin(x*0.045+uTime*0.3), 1.2*sin(x*0.03)); float r=0.5+x*0.05; vec3 dq=p-c; d=exp(-(dq.y*dq.y+dq.z*dq.z)/(r*r))*smoothstep(-0.8,0.6,p.x)*step(p.x,uTrail)*(0.9+0.4*exp(-x*0.05)); d/=1.+x*0.012; }
  d*=uGas; if(d<0.003) return 0.;
  float n=tn(p*(uWorld>2.5?0.5:1.6)-vec3(uTime*(uWorld>2.5?1.2:0.1),uTime*0.7,0.)), n2=tn(p*(uWorld>2.5?1.4:4.)+vec3(0.,-uTime*1.3,5.));
  return d*smoothstep(0.3,0.82,n*0.6+n2*0.4)*1.8;
}
#define HAS_VOLUME
vec4 volume(vec3 ro, vec3 rd, float tmax, vec2 fc){
  if(uGas<0.01) return vec4(0.);
  float t0=0., t1=min(tmax, uWorld>2.5? 160. : 14.);
  const int N=48; float dt=(t1-t0)/float(N); float t=t0+dt*hash12(fc);
  vec3 acc=vec3(0.); float T=1.;
  for(int i=ZERO;i<N;i++){ vec3 p=ro+rd*t; float dn=gasD(p);
    if(dn>0.){ float lit=0.55+0.6*clamp(dot(normalize(p+vec3(0.001)),normalize(gKeyDir))*0.5+0.5,0.,1.);
      vec3 c=mix(vec3(0.2,0.25,0.04), vec3(0.8,0.95,0.32), clamp(dn,0.,1.))*lit*1.5; float a=1.-exp(-dn*dt*(uWorld>2.5?0.35:1.2)); acc+=T*a*c; T*=1.-a; if(T<0.02) break; }
    t+=dt; }
  return vec4(acc, 1.-T);
}`;

  defineScene({
    name: 'tonsilstone3d',
    anchor: { word: 1699, offset: -0.15 },
    anchorEnd: { word: 1778, offset: -0.15 },
    tail: 0,
    setup(api) {
      this.r = M3.create(api, FRAG, { res: 0.5, aa: 2, steps: 150, stepScale: 0.75, sc: 0.35 });
      const A = (w) => api.at(w);
      const T = this.T = { these: A(1702), smell: A(1705), different: A(1706), they2: A(1707), world: A(1711), grabbed: A(1717), stone: A(1720), smished: A(1721), smelled: A(1727), notIt: A(1736), good: A(1738), tell: A(1749), tonsil: A(1753), mile: A(1756), way: A(1760), smell2: A(1762) };
      const c = -0.04;
      this.shots = [{ at: 0, k: 'crypt' }, { at: T.they2 + c, k: 'world' }, { at: T.grabbed + c, k: 'smish' }, { at: T.smelled + c, k: 'plume' }, { at: T.notIt + c, k: 'curl' }, { at: T.tell + c, k: 'mile' }];
      const q = api.rand('ts-motes'); this.motes = Array.from({ length: 90 }, () => ({ p: [(q() - 0.5) * 16, -0.5 + q() * 8, (q() - 0.5) * 16], r: 0.015 + q() * 0.03, a: 0.2 + q() * 0.4, ph: q() * 6.28 }));
    },
    draw(ctx, t, api) {
      const { ease, clamp, lerp, prog } = api, T = this.T;
      const s = M3.shot(t, this.shots, api.duration), k = s.k, u = clamp(s.lt / Math.max(0.1, s.len));
      let world = 0, ro, ta, fov = 2.2, focus, blur = 0.016, maxR = 0.03, gas = 0, crush = 0, spin = 0.4 + t * 0.12, trail = 0;
      let keyPos = [-2.5, 3.5, 2.5], keyCol = [0.8, 0.7, 0.6];
      if (k === 'crypt') {
        const e = ease.inOutSine(u); ro = [lerp(3.6, 3.0, e), lerp(2.5, 2.0, e), lerp(4.6, 3.9, e)]; ta = [0, 0.35, 0]; focus = Math.hypot(ro[0], ro[1] - 0.35, ro[2]); gas = 0.35;
      } else if (k === 'world') {
        world = 1; spin = 0.4 + t * 0.35; const a = -0.3 + 0.2 * u; ro = [Math.sin(a) * 4.6, 0.9, Math.cos(a) * 4.6]; ta = [0.15, 0.05, 0]; fov = 2.3; focus = 4.6; blur = 0.012; gas = prog(t, T.world - 0.3, 0.6) * 0.9 + 0.1;
        keyPos = [-4, 3, 1]; keyCol = [0.8, 0.75, 0.65];
      } else if (k === 'smish' || k === 'plume' || k === 'curl') {
        world = 2; spin = 0.9;
        crush = ease.outBack(clamp((t - T.smished + 0.05) / 0.35), 1.2);
        gas = clamp((t - T.smished) / 0.3) * 1.0;
        if (k === 'smish') { const e = ease.inOutSine(u); ro = [lerp(3.4, 3.0, e), lerp(1.3, 1.1, e), lerp(4.2, 3.8, e)]; ta = [0, -0.25, 0]; focus = Math.hypot(ro[0], ro[1] + 0.25, ro[2]); }
        else if (k === 'plume') { const e = ease.inOutCubic(u); ro = [2.4, lerp(0.8, 2.2, e), 5.2]; ta = [0, lerp(0.2, 2.6, e), 0]; focus = 5.6; fov = 2.1; blur = 0.013; }
        else { const e = ease.inOutSine(u); ro = [-3.2 + 0.5 * e, 1.5, 3.6]; ta = [0.2, 0.7, 0]; fov = 2.4; focus = lerp(3.2, 4.9, e); blur = 0.02; }
      } else {
        world = 3; spin = 0.9 + t * 0.05; const e = ease.inOutCubic(u);
        trail = lerp(10, 170, ease.outCubic(clamp(u * 1.3))); gas = 1;
        ro = [lerp(-3, -2, e), lerp(1.4, 6, e), lerp(6.5, 34, e)]; ta = [lerp(2.5, 14, e), lerp(0.3, 1.2, e), 0]; fov = 1.9; focus = lerp(7, 32, e); blur = 0.011;
      }
      const cam = M3.camera(ro, ta, 0, fov), dof = { focus, blur, maxR };
      ctx.drawImage(this.r.draw({ uTime: t, ...cam.uniforms, uWorld: world, uCrush: crush, uGas: gas, uSpin: spin, uTrail: trail, uKeyPos: keyPos, uKeyCol: keyCol }, dof), 0, 0, api.W, api.H);
      if (world !== 3) M3.motes(ctx, cam, dof, this.motes.map((m) => ({ ...m, p: [m.p[0] + Math.sin(t * 0.3 + m.ph) * 0.2, m.p[1] + t * 0.08, m.p[2]] })), { color: '230,240,210', alpha: 0.45 });
      if (k === 'crypt') { const p = M3.project(cam, [0.3, 0.75, 0.3]); if (p) M3.callout(ctx, api, p.x, p.y, p.x + 260, p.y - 190, 'tonsil stone', prog(t, T.these - 0.1, 0.6), { size: 46 }); }
      M3.art(ctx, api);
      api.finish(ctx, t, { bloom: 0.34, grain: 0.05, vignette: 0.52 });
    },
  });
})();
