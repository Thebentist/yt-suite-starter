/* micro3d shared library (loaded with // @use by every scene in this folder).
 *
 * Why not api.gl.create: the lead's helper renders one pass straight to the canvas. The micro shots need real depth of
 * field (the medical-visualisation look: one plane sharp, everything else melting into bokeh), so this file brings its own
 * small WebGL2 pipeline, built on the same GLSL library (window.GL.LIB) and the same raymarch helpers:
 *
 *   pass 1  the scene shader renders into a half-float buffer: rgb = tone-mapped (ACES) linear colour, a = ray distance
 *   pass 2  a scatter-as-gather bokeh blur (golden-angle spiral) reads that buffer, sizes each tap's blur circle from its
 *           distance to the focus plane, keeps sharp foreground from being smeared by the blurred background, then
 *           applies gamma and writes the canvas.
 *
 * A scene's FRAG (GLSL ES 3.00, no header) defines, in this order:
 *   float map(vec3 p)                                   the SDF (set material globals as a side effect)
 *   #include <raymarch>                                 march / calcNormal / softShadow / calcAO (same as gl.js)
 *   void camRay(vec2 fc, out vec3 ro, out vec3 rd)       camera
 *   vec3 shade(vec3 ro, vec3 rd, out float dist)         linear HDR colour of the surface hit (and its distance)
 *   optional: #define HAS_VOLUME + vec4 volume(vec3 ro, vec3 rd, float tmax, vec2 fc)  premultiplied gas, once per pixel
 * M3.GLSL.core (+ bact, mol, pap, drop) are prepended by the scene as needed.
 *
 * Also here: a 3D value-noise texture (uNoise, 1 fetch per octave instead of 8 hashes), a JS camera that matches the
 * shader so 2D labels can be pinned to 3D points, bokeh motes, shot switching and the small type helpers.
 */
(function () {
  const RAYMARCH = `
// trace(): march + 4 normal taps + 5 AO taps through ONE map() call site (the D3D compiler inlines map at every call
// site, so this keeps compile time sane). Needs void saveMat() (copy the material globals at the hit) defined before.
float trace(vec3 ro, vec3 rd, float tmax, out vec3 n, out float ao){
  float t=0., hitT=-1., occ=0., sca=1.; int ph=0, k=0; vec3 p=vec3(0.), nn=vec3(0.);
  for(int i=ZERO;i<RM_STEPS+10;i++){
    vec3 q, e=vec3(0.); float h=0.;
    if(ph==0) q=ro+rd*t;
    else if(ph==1){ e=0.5773*(2.0*vec3(float(((k+3)>>1)&1),float((k>>1)&1),float(k&1))-1.0); q=p+e*NRM_H; }
    else { h=(.02+.25*float(k)/4.)*SC; q=p+nn*h; }
    float d=map(q);
    if(ph==0){ if(abs(d)<RM_EPS*t){ hitT=t; p=q; saveMat(); ph=1; k=0; } else { t+=d*RM_STEP; if(t>tmax) break; } }
    else if(ph==1){ nn+=e*d; k++; if(k==4){ nn=normalize(nn); ph=2; k=0; } }
    else { occ+=(h-d)*sca; sca*=.9; k++; if(k==5) break; }
  }
  n=nn; ao=clamp(1.-2.2*occ/SC,0.,1.);
  return hitT;
}
float march(vec3 ro, vec3 rd, float tmax){ float t=0.; for(int i=0;i<RM_STEPS;i++){ vec3 p=ro+rd*t; float d=map(p); if(abs(d)<RM_EPS*t) return t; t+=d*RM_STEP; if(t>tmax) break; } return -1.; }
float marchFrom(vec3 ro, vec3 rd, float t0, float tmax){ float t=t0; for(int i=0;i<RM_STEPS;i++){ vec3 p=ro+rd*t; float d=map(p); if(abs(d)<RM_EPS*t) return t; t+=d*RM_STEP; if(t>tmax) break; } return -1.; }
vec3 calcNormal(vec3 p){ vec3 n=vec3(0.); for(int i=ZERO;i<4;i++){ vec3 e=0.5773*(2.0*vec3(float(((i+3)>>1)&1),float((i>>1)&1),float(i&1))-1.0); n+=e*map(p+e*NRM_H); } return normalize(n); }
float softShadow(vec3 ro,vec3 rd,float tmin,float tmax,float k){ float res=1., t=tmin; for(int i=ZERO;i<40;i++){ float h=map(ro+rd*t); res=min(res,k*h/t); t+=clamp(h,.02*SC,.5*SC); if(res<.004||t>tmax) break; } return clamp(res,0.,1.); }
float calcAO(vec3 p,vec3 n){ float occ=0., sca=1.; for(int i=ZERO;i<5;i++){ float h=(.02+.25*float(i)/4.)*SC; occ+=(h-map(p+h*n))*sca; sca*=.9; } return clamp(1.-2.2*occ/SC,0.,1.); }
`;
  const VERT = `#version 300 es
in vec2 aPos; void main(){ gl_Position = vec4(aPos, 0., 1.); }`;

  const DOF = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes; uniform float uFocus, uBlur, uMaxR, uRad, uLift, uSat; uniform vec3 uTint;
out vec4 outColor;
float coc(float d){ return min(uMaxR, uBlur*abs(1.-uFocus/max(d,1e-3))); }
void main(){
  vec2 px=1./uRes, uv=gl_FragCoord.xy*px;
  vec4 c0=texture(uTex, uv); float s0=coc(c0.a);
  vec3 col=c0.rgb; float tot=1., r=uRad;
  for(int k=0;k<3000;k++){
    if(r>=uMaxR) break;
    float ang=float(k)*2.39996323;
    vec4 s=texture(uTex, uv+vec2(cos(ang),sin(ang))*r*px);
    float ss=coc(s.a);
    if(s.a>c0.a) ss=min(ss, s0*2.);
    float m=smoothstep(r-.5, r+.5, ss);
    col+=mix(col/tot, s.rgb, m); tot+=1.; r+=uRad/r;
  }
  col/=tot;
  float l=dot(col, vec3(.2126,.7152,.0722));
  col=mix(vec3(l), col, uSat)*uTint + uLift;
  outColor=vec4(pow(max(col,0.), vec3(1./2.2)), 1.);
}`;

  // ------------------------------------------------------------------------------------------ shared GLSL
  const GLSL = {};
  GLSL.core = `
uniform highp sampler3D uNoise;
#define PI 3.14159265
float tn(vec3 p){ return texture(uNoise, p*0.0625).r; }
vec4 tn4(vec3 p){ return texture(uNoise, p*0.0625); }
float tfbm(vec3 p, int o){ float a=.5,s=0.,w=0.; for(int i=ZERO;i<6;i++){ if(i>=o) break; s+=a*texture(uNoise,p*0.0625).r; w+=a; p=p*2.07+vec3(3.1,1.7,5.3); a*=.5; } return s/w; }
float sdEgg(vec3 p, float ra, float rb){ vec2 q=vec2(length(p.xz), p.y); const float k=1.7320508; float r=ra-rb;
  return ((q.y<0.)? length(q)-r : (k*(q.x+r)<q.y)? length(vec2(q.x,q.y-k*r)) : length(vec2(q.x+r,q.y))-2.*r) - rb; }
float sdSpindle(vec3 p, vec3 a, vec3 b, float r){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float k=2.*h-1.; float rr=r*(0.16+0.84*sqrt(max(0.,1.-k*k))); return (length(pa-ba*h)-rr)*0.8; }
// helix along local x, half length hl, coil radius R, pitch, tube radius r
float sdHelix(vec3 p, float hl, float R, float pitch, float r){
  float a=atan(p.z,p.y); float x=p.x-a/(2.*PI)*pitch; float k=floor(x/pitch+.5); float xx=p.x-(a/(2.*PI)+k)*pitch;
  float c=2.*PI*R/sqrt(4.*PI*PI*R*R+pitch*pitch);
  float d=length(vec2(length(p.yz)-R, xx*c))-r;
  return max(d*.85, abs(p.x)-hl);
}
mat3 basisFrom(vec3 d){ vec3 w=normalize(d); vec3 u=normalize(cross(abs(w.y)<.95?vec3(0,1,0):vec3(1,0,0), w)); return mat3(w, cross(w,u), u); }
// 2D voronoi: x = distance to nearest edge-ish (F2-F1), y = cell id hash
vec2 voro(vec2 x){ vec2 n=floor(x), f=fract(x); float f1=8., f2=8.; float id=0.;
  for(int j=ZERO-1;j<=1;j++) for(int i=ZERO-1;i<=1;i++){ vec2 g=vec2(i,j); vec2 o=hash22(n+g); vec2 r=g+o-f; float d=dot(r,r);
    if(d<f1){ f2=f1; f1=d; id=hash12(n+g); } else if(d<f2) f2=d; }
  return vec2(sqrt(f2)-sqrt(f1), id); }
// small surface relief for shading (normal perturbation, not in the SDF)
vec3 bumpN(vec3 p, vec3 n, float f, float a){ float e=0.02/f; float b0=tn(p*f);
  vec3 g=vec3(tn((p+vec3(e,0,0))*f)-b0, tn((p+vec3(0,e,0))*f)-b0, tn((p+vec3(0,0,e))*f)-b0)/e; g-=n*dot(g,n); return normalize(n-a*g); }
// same, with the pattern fixed to a rotating object (R maps world to object space)
vec3 bumpNR(vec3 p, mat3 R, vec3 n, float f, float a){ float e=0.02/f; float b0=tn(R*p*f);
  vec3 g=vec3(tn(R*(p+vec3(e,0,0))*f)-b0, tn(R*(p+vec3(0,e,0))*f)-b0, tn(R*(p+vec3(0,0,e))*f)-b0)/e; g-=n*dot(g,n); return normalize(n-a*g); }
vec3 spectral(float x){ return clamp(0.5+0.5*cos(6.2832*(x+vec3(0.,0.33,0.67))),0.,1.); }

// ---- lights (set per shot) and a shared shading model: wrapped key, cool fill, SEM-style edge glow, wet specular
vec3 gKeyDir=vec3(-0.4,0.8,0.45); vec3 gKeyCol=vec3(2.2,2.0,1.8);
vec3 gFillDir=vec3(0.6,-0.3,-0.6); vec3 gFillCol=vec3(0.25,0.22,0.45);
vec3 gAmb=vec3(0.04,0.03,0.06); vec3 gPLPos=vec3(0.); vec3 gPLCol=vec3(0.); float gPLR=10.; vec3 gFog=vec3(0.03,0.015,0.04); float gFogK=0.01;
struct Mat { vec3 alb; float spec; float gloss; float rim; vec3 rimCol; float sss; vec3 sssCol; vec3 emit; float wrap; };
Mat mkMat(vec3 alb){ Mat m; m.alb=alb; m.spec=1.; m.gloss=70.; m.rim=0.8; m.rimCol=alb*1.4+0.12; m.sss=0.; m.sssCol=alb; m.emit=vec3(0.); m.wrap=0.45; return m; }
vec3 lighting(Mat m, vec3 p, vec3 n, vec3 rd, float ao, float sh){
  vec3 L=normalize(gKeyDir), F=normalize(gFillDir);
  float nv=clamp(dot(n,-rd),0.,1.);
  float dk=clamp((dot(n,L)+m.wrap)/(1.+m.wrap),0.,1.);
  float df=clamp(dot(n,F)*.5+.5,0.,1.);
  vec3 h=normalize(L-rd);
  float sp=pow(clamp(dot(n,h),0.,1.),m.gloss)*(m.gloss+8.)/40.*fresnel(nv,0.04)*m.spec;
  float fr=pow(1.-nv,2.6);
  vec3 c=m.alb*(gAmb*ao + gKeyCol*dk*sh + gFillCol*df*ao);
  c+=gKeyCol*sp*mix(0.25,1.,sh);
  c+=m.rimCol*fr*m.rim*(0.35+0.65*ao);
  float bs=pow(clamp(dot(rd,L)*.5+.5,0.,1.),3.);
  c+=m.sssCol*m.sss*(0.25+bs)*ao;
  if(gPLCol.x+gPLCol.y+gPLCol.z>0.){ vec3 lv=gPLPos-p; float ld=length(lv); vec3 Lp=lv/ld; float att=1./(1.+ld*ld/(gPLR*gPLR));
    float dp=clamp((dot(n,Lp)+m.wrap)/(1.+m.wrap),0.,1.); vec3 hp=normalize(Lp-rd);
    float spp=pow(clamp(dot(n,hp),0.,1.),m.gloss)*(m.gloss+8.)/40.*fresnel(nv,0.04)*m.spec;
    c+=(m.alb*dp + spp)*gPLCol*att; }
  c+=m.emit;
  return c;
}
Mat mixMat(Mat a, Mat b, float k){ Mat m; m.alb=mix(a.alb,b.alb,k); m.spec=mix(a.spec,b.spec,k); m.gloss=mix(a.gloss,b.gloss,k); m.rim=mix(a.rim,b.rim,k); m.rimCol=mix(a.rimCol,b.rimCol,k); m.sss=mix(a.sss,b.sss,k); m.sssCol=mix(a.sssCol,b.sssCol,k); m.emit=mix(a.emit,b.emit,k); m.wrap=mix(a.wrap,b.wrap,k); return m; }
vec3 applyFog(vec3 c, float t){ return mix(c, gFog, 1.-exp(-gFogK*t)); }
`;

  // bacteria. Units: 1 = about 1 micrometre. Types: rod, coccus pair, coccus chain, fusiform, spirochete, coccobacillus.
  // colony(p) needs the scene to define before it: float groundH(vec2 xz); float colonyDens(vec2 xz); uniform float uTime.
  GLSL.bact = `
float gBHue; float gBType; float gBKind; vec3 gBC; float gBStrand;
// one bacterium; ph = per-cell phase. Rods sometimes dividing (a pinch in the middle); fine relief comes from the noise texture.
float bacterium(vec3 p, vec3 c, vec3 dir, float type, float s, float ph){
  float d;
  if(type<0.42){ float r=0.34*s, hl=(0.6+0.55*fract(ph*3.1))*s; float bend=0.08*sin(ph*7.)*s; vec3 m=vec3(0.,bend,0.);
    d=min(sdCapsule(p, c-dir*hl, c+m, r), sdCapsule(p, c+m, c+dir*hl, r));
    if(fract(ph*5.3)<0.45){ float x=dot(p-c,dir); d+=0.09*s*exp(-x*x/(0.02*s*s)); } }
  else if(type<0.62){ float r=0.42*s; vec3 o=dir*r*0.84; d=smin(length(p-c-o)-r, length(p-c+o)-r*0.95, 0.05*s); }
  else if(type<0.78){ float r=0.36*s; d=length(p-c)+2.*s; for(int i=ZERO;i<4;i++){ float fi=float(i)-1.5; vec3 q=c+dir*fi*r*1.78+vec3(0.,0.14*sin(fi*1.7+ph),0.)*s; d=smin(d, length(p-q)-r*(0.93+0.1*sin(fi*3.+ph)), 0.04*s); } }
  else if(type<0.9){ float hl=1.6*s; vec3 bb=vec3(0.,0.18*sin(ph*3.),0.)*s; d=sdSpindle(p, c-dir*hl, c+dir*hl+bb, 0.3*s); }
  else if(type<0.965){ mat3 B=basisFrom(dir); vec3 q=transpose(B)*(p-c); q.yz=rot2(uTime*2.2+ph*6.)*q.yz; d=sdHelix(q, 2.4*s, 0.22*s, 0.66*s, 0.08*s); }
  else { float r=0.4*s, hl=0.3*s; d=sdCapsule(p, c-dir*hl, c+dir*hl, r); }
  return d;
}
float bactRelief(vec3 p){ return 0.035*(tn(p*5.5)-0.5)+0.012*(tn(p*17.)-0.5); }
// colony on the xz plane. amp = Brownian jiggle. Each bacterium also throws 2 thin matrix strands down to the ground.
float colony(vec3 p, float cs, float seed, float amp){
  vec2 cell=floor(p.xz/cs); float d=1e5, ds=1e5;
  for(int j=ZERO-1;j<=1;j++) for(int i=ZERO-1;i<=1;i++){
    vec2 id=cell+vec2(i,j);
    for(int k=ZERO;k<2;k++){
      vec3 h=hash33(vec3(id, float(k)*3.7+seed));
      vec2 c2=(id+0.5+(h.xy-0.5)*0.8)*cs;
      float dens=colonyDens(c2);
      if(h.z>dens*(k==0?1.:0.7)) continue;
      vec3 h2=hash33(vec3(id*1.73+vec2(3.1,7.7), float(k)*5.1+seed*1.3));
      float ang=h2.y*6.2832, tilt=(h2.z-.5)*.7;
      vec3 dir=normalize(vec3(cos(ang), tilt, sin(ang)));
      float s=0.8+0.35*h.x;
      float gy=groundH(c2);
      vec3 c=vec3(c2.x, gy+0.32*s+float(k)*0.66*s, c2.y);
      c+=amp*vec3(sin(uTime*1.3+h.x*20.), 0.4*sin(uTime*1.7+h.y*20.), cos(uTime*1.1+h.z*20.));
      float dd=bacterium(p, c, dir, h2.x, s, h.y*7.+h.z);
      if(dd<d){ d=dd; gBHue=fract(h.x*7.13+h2.z); gBType=h2.x; gBC=c; }
#ifdef WITH_STR
      if(dd<0.9){ // matrix strands (extracellular polymer threads)
        vec3 a1=c+dir*0.5*s, a2=c-dir*0.45*s;
        vec2 o1=(hash22(id*3.1+float(k))-0.5)*2.6, o2=(hash22(id*5.7+float(k)+2.)-0.5)*2.6;
        vec3 b1=vec3(a1.x+o1.x, groundH(a1.xz+o1)-0.05, a1.z+o1.y), b2=vec3(a2.x+o2.x, groundH(a2.xz+o2)-0.05, a2.z+o2.y);
        ds=min(ds, min(sdCapsule(p,a1,b1,0.035*s), sdCapsule(p,a2,b2,0.03*s)));
      }
#endif
    }
  }
  gBStrand=ds<d? 1. : 0.;
#ifndef NO_REL
  d=d+bactRelief(p)*step(d,0.4);
#endif
  d=min(d, ds);
  return d;
}
vec3 bactColor(float hue, float type){
  vec3 a=vec3(0.05,0.36,0.3), b=vec3(0.16,0.38,0.12), c=vec3(0.04,0.22,0.36);
  vec3 col=hue<0.3? mix(a,b,hue/0.3) : mix(a,c,(hue-0.3)/0.7);
  if(type>0.9 && type<0.965) col=vec3(0.42,0.46,0.12);
  return col;
}
Mat bactMat(vec3 p, vec3 n, float hue, float type){
  Mat m=mkMat(bactColor(hue,type));
  m.alb*=0.8+0.4*tn(p*3.1);
  m.spec=1.1; m.gloss=45.; m.rim=1.25; m.rimCol=m.alb*1.6+vec3(0.1,0.16,0.2); m.sss=0.55; m.sssCol=m.alb*vec3(0.9,1.3,1.); m.wrap=0.55;
  return m;
}
Mat strandMat(){ Mat m=mkMat(vec3(0.55,0.5,0.45)); m.spec=0.8; m.gloss=30.; m.rim=1.4; m.rimCol=vec3(0.7,0.65,0.6); m.sss=0.4; m.sssCol=vec3(0.6,0.5,0.4); return m; }
`;

  // tall filiform papillae as the walls of a crevice; the cell corner at the origin is a gap between four of them.
  GLSL.pap = `
float gPapTip;
// filiform papillae: bulbous base, long tapering keratin spire bending slightly, rough surface toward the tip
float papField(vec3 p, float C, float R, float Hh){
  vec2 cell=floor(p.xz/C); float d=1e5; gPapTip=0.;
  for(int j=ZERO-1;j<=1;j++) for(int i=ZERO-1;i<=1;i++){
    vec2 id=cell+vec2(i,j);
    vec2 b=(id+0.5)*C+(hash22(id+11.)-0.5)*C*0.16;
    float h=Hh*(0.8+0.4*hash12(id*1.31)); float rb=R*(0.85+0.3*hash12(id+5.2));
    vec2 lean=(hash22(id+2.7)-0.5)*R*1.2;
    float y=clamp(p.y/h,0.,1.);
    vec3 q=p; q.xz-=lean*y*y;                                   // bend: the spire curves over
    float dd=sdRoundCone(q, vec3(b.x,-R*0.6,b.y), vec3(b.x, h, b.y), rb, rb*0.1);
    dd=smin(dd, sdEllipsoid(q-vec3(b.x,R*0.15,b.y), vec3(rb*1.12,rb*0.62,rb*1.12)), R*0.35);   // bulbous base
    if(dd<d){ d=dd; gPapTip=y; }
  }
  float rough=(tn(p*vec3(0.22,0.05,0.22))-0.5)*R*0.07 + (tn(p*vec3(0.9,0.2,0.9))-0.5)*R*0.03*(0.3+gPapTip);
  return d + rough;
}
Mat tissueMat(vec3 p, vec3 n, float tip){
  vec3 deep=vec3(0.26,0.035,0.07), mid=vec3(0.58,0.13,0.19), keratin=vec3(0.82,0.66,0.66);
  vec3 alb=mix(deep, mid, smoothstep(0.,0.3,tip)); alb=mix(alb, keratin, smoothstep(0.4,1.,tip));
  alb*=0.8+0.4*tn(p*vec3(0.3,0.06,0.3));
  Mat m=mkMat(alb); m.spec=1.6; m.gloss=80.; m.rim=0.45; m.rimCol=vec3(0.5,0.35,0.8)*0.8; m.sss=0.35; m.sssCol=vec3(1.,0.3,0.3)*alb; m.wrap=0.6;
  return m;
}
`;

  // the tongue crevice world shared by colony3d, gas3d and everybody3d: a gap between four tall filiform papillae (origin),
  // slime dome with the colony, an optional hero bacterium. creviceHead goes before bact/pap, creviceBody after them.
  GLSL.creviceHead = `
uniform vec3 uHeroC, uHeroD; uniform float uHeroS; uniform vec4 uClear;
float groundH(vec2 xz){ float r2=dot(xz,xz); return 1.25*exp(-r2/60.) + 0.9*(tn(vec3(xz*0.06,0.5))-0.5) + 0.25*(tn(vec3(xz*0.3,2.1))-0.5); }
float colonyDens(vec2 xz){ float r=length(xz*vec2(1.,1.2)); return smoothstep(9.,3.5,r+2.5*(tn(vec3(xz*0.25,4.))-0.5))*smoothstep(uClear.z,uClear.w,length(xz-uClear.xy)); }
`;
  GLSL.creviceBody = `
float gMat; float gTip; float gDT, gDC;
float crevice(vec3 p){
  float g=p.y-groundH(p.xz);
  float pap=papField(p, 44., 13., 78.);
  float tip=gPapTip;
  float d=smin(g, pap, 5.);
  gDT=d; gTip=pap<g? tip : 0.; gMat=0.; gDC=1e5; gBStrand=0.;
  if(p.y<8. && dot(p.xz,p.xz)<200.){
    float c=colony(p, 2.2, 0., 0.035);
    if(uHeroS>0.){ float hb=bacterium(p, uHeroC, uHeroD, 0.1, uHeroS, 0.11); hb+=bactRelief(p)*step(hb,0.4); if(hb<c){ c=hb; gBHue=0.12; gBType=0.1; gBC=uHeroC; gBStrand=0.; } }
    gDC=c; if(c<d+1.) d=smin(d, c, 0.28);
    if(c<gDT) gMat=1.;
  }
  return d;
}
vec3 creviceSky(vec3 rd){ float up=clamp(rd.y,0.,1.);
  return mix(vec3(0.012,0.005,0.018), vec3(0.2,0.24,0.45), pow(up,6.)) + vec3(0.7,0.75,1.)*pow(up,40.)*0.8; }
float gDepthAtt;
void creviceLights(vec3 p, vec3 keyPos, vec3 keyCol){
  gDepthAtt=mix(0.05,1.,pow(smoothstep(0.,78.,p.y),1.3));
  gKeyDir=vec3(0.15,1.,0.25); gKeyCol=vec3(0.75,0.85,1.2)*1.5*gDepthAtt;
  gFillDir=vec3(-0.6,-0.4,0.3); gFillCol=vec3(0.4,0.1,0.16)*0.5;
  gAmb=vec3(0.02,0.012,0.03);
  gPLPos=keyPos; gPLCol=keyCol; gPLR=9.;
}
// tissue / bacteria material at a crevice hit (bl = bacteria blend, str = matrix strand); may bump the normal
Mat creviceMat(vec3 p, vec3 n, float tip, float bl, float hue, float typ, float str, inout vec3 nn){
  Mat mt=tissueMat(p,n,tip);
  if(tip<0.03){ vec2 v=voro(p.xz*0.075+vec2(0.3,1.7)); float e=smoothstep(0.,0.06,v.x); mt.alb*=mix(0.5,1.,e)*(0.92+0.14*v.y); }
  Mat mb=bactMat(p,n,hue,typ); if(str>0.5) mb=strandMat();
  if(bl>0.5 && str<0.5) nn=bumpN(p,n,9.,0.06);
  return mixMat(mt,mb,bl);
}
vec3 creviceWet(vec3 rd, vec3 n){ return vec3(0.7,0.8,1.)*pow(clamp(dot(reflect(rd,n),normalize(vec3(0.15,1.,0.25))),0.,1.),40.)*0.5*gDepthAtt; }
vec3 creviceFog(vec3 col, vec3 p, float t, float k){ vec3 fogC=mix(vec3(0.03,0.01,0.03), vec3(0.1,0.12,0.24), smoothstep(10.,90.,p.y)); return mix(col, fogC, 1.-exp(-k*t)); }
// light shafts from the opening above (volume helper)
vec4 creviceShafts(vec3 ro, vec3 rd, float tmax, vec2 fc, float amt){
  if(amt<0.01) return vec4(0.);
  float tEnd=min(tmax,220.); const int N=32; float dt=tEnd/float(N); float t=dt*hash12(fc);
  vec3 acc=vec3(0.); float T=1.;
  for(int i=ZERO;i<N;i++){ vec3 p=ro+rd*t;
    float h=smoothstep(4.,75.,p.y);
    float sh=tn(vec3(p.x*0.1+p.y*0.012, p.y*0.006-uTime*0.015, p.z*0.1)); sh=smoothstep(0.5,0.85,sh)*h;
    float dens=0.0012+0.008*sh;
    vec3 c=vec3(0.45,0.55,1.)*(0.1+1.8*sh)*amt;
    float a=1.-exp(-dens*dt);
    acc+=T*a*c; T*=1.-a; t+=dt; if(t>tEnd) break; }
  return vec4(acc, 1.-T);
}
`;

  // nano-lipid droplets: analytic spheres (cheap, and see-through): thin-film iridescent shell over a golden oil core.
  GLSL.drop = `
vec2 sphIntersect(vec3 ro, vec3 rd, vec3 c, float r){ vec3 oc=ro-c; float b=dot(oc,rd); float cc=dot(oc,oc)-r*r; float h=b*b-cc; if(h<0.) return vec2(-1.); h=sqrt(h); return vec2(-b-h, -b+h); }
vec3 dropletShade(vec3 ro, vec3 rd, vec3 c, float r, float tIn, vec3 bgCol, float seed){
  vec3 p=ro+rd*tIn, n=normalize(p-c);
  float nv=clamp(dot(n,-rd),0.,1.), fr=fresnel(nv,0.05);
  vec3 lp=(p-c)/r;
  float th=0.3+0.55*tn(lp*1.8+vec3(seed*7.,uTime*0.4,seed))+0.3*tn(lp*4.5+vec3(seed*3.,-uTime*0.3,0.));
  vec3 film=mix(vec3(0.8,0.85,0.9), spectral(th*1.9+nv*0.7), 0.72);
  vec3 R=reflect(rd,n), L=normalize(gKeyDir);
  vec3 env=vec3(0.03,0.07,0.09)+vec3(1.6,1.55,1.5)*pow(max(dot(R,L),0.),30.)+vec3(0.35,0.6,0.7)*pow(max(R.y,0.),3.)*0.45+vec3(0.9,0.5,0.6)*pow(max(-R.y,0.),4.)*0.25;
  vec3 refl=env*mix(vec3(1.),film*1.7,0.85);
  vec2 ci=sphIntersect(ro,rd,c,r*0.46);
  vec3 core=vec3(0.); float coreA=0.;
  if(ci.x>0.){ vec3 pc=ro+rd*ci.x, nc=normalize(pc-c); float d=clamp(dot(nc,-rd),0.,1.);
    core=vec3(0.95,0.6,0.2)*(0.18+0.75*d*d)+vec3(1.,0.9,0.6)*pow(max(dot(reflect(rd,nc),L),0.),50.)*2.2; coreA=0.9*smoothstep(0.,0.35,d); }
  vec3 trans=mix(bgCol*vec3(0.62,0.82,0.9), core, coreA);
  return mix(trans, refl, clamp(fr*1.1+0.06,0.,1.)) + film*pow(1.-nv,2.6)*0.9 + vec3(1.,0.95,0.9)*pow(max(dot(R,L),0.),200.)*3.;
}
`;
  // the lipid world (lipid3d, lipid3d-pop): a crowd of bacteria floating in the fluid of the crevice (papillae blurred behind),
  // per-bacterium state (target, burst, dead, film), a split-screen mode (left = alcohol state, right = targeted), droplets.
  GLSL.lipid = `
uniform vec4 uBP[16], uBD[16], uBS[16], uBSL[16];
uniform vec4 uDrop[20];
uniform float uSplit, uWave, uFogK;
uniform vec3 uKeyPos, uKeyCol;
uniform vec3 uCamPos, uCamTa; uniform float uCamRoll, uFov;
float gSide;
void camRay(vec2 fc, out vec3 ro, out vec3 rd){ vec2 uv=(2.*fc-uRes)/uRes.y; gSide=step(0.5*uRes.x, fc.x);
  if(uSplit>0.5) uv.x+=(gSide<0.5? 0.5 : -0.5)*uAspect;
  ro=uCamPos; mat3 c=camMat(ro,uCamTa,uCamRoll); rd=c*normalize(vec3(uv,uFov)); }
vec4 bState(int i){ return (uSplit>0.5 && gSide<0.5) ? uBSL[i] : uBS[i]; }
float gMat, gIdx, gPart, gTip;
float crowd(vec3 p){
  float d=1e5;
  for(int i=ZERO;i<16;i++){ vec4 P=uBP[i]; if(P.w<=0.) continue;
    float bb=length(p-P.xyz)-4.2*P.w; if(bb>0.4){ d=min(d,bb+0.2); continue; }
    vec4 Dd=uBD[i], S=bState(i);
    float ex=S.y, dead=S.z, dd, part=0.;
    if(ex<0.36){ float sw=(1.+0.34*smoothstep(0.,0.36,ex))*(1.-0.14*dead);
      dd=bacterium(p,P.xyz,Dd.xyz,Dd.w,P.w*sw,float(i)*0.37+0.2);
      if(dd<0.3) dd+=((0.035+0.07*dead)*(tn(p*5.5+float(i))-0.5)+0.012*(tn(p*17.)-0.5))*P.w;
    } else {
      float k=(ex-0.36)/0.64, g=1.+k*1.9;
      vec3 q=P.xyz+(p-P.xyz)/g;
      float body=bacterium(q,P.xyz,Dd.xyz,Dd.w,P.w*1.34,float(i)*0.37+0.2)*g;
      float sh=abs(body)-0.05*P.w*(1.-0.5*k);
      vec3 dir=normalize(p-P.xyz+1e-4);
      float m=tn(dir*3.+float(i)*1.7+vec3(0.,0.,k*0.4));
      dd=max(sh, (0.3+k*0.5-m)*0.45*P.w); part=1.;
      for(int j=ZERO;j<12;j++){ vec3 h=hash33(vec3(float(i),float(j),5.))-0.5; vec3 sd=normalize(h+1e-3); float rr=0.14*P.w*(1.-0.75*k)*(0.6+abs(h.x)*1.2); if(rr<0.004) continue;
        vec3 sc=P.xyz+sd*(0.7+3.2*sqrt(k)*(0.7+h.y))*P.w; float ds=length(p-sc)-rr; if(ds<dd){ dd=ds; part=2.; } }
    }
    if(dd<d){ d=dd; gIdx=float(i); gPart=part; }
  }
  return d;
}
float map(vec3 p){
  gMat=0.;
  float g=p.y+0.9*(tn(vec3(p.xz*0.06,0.5))-0.5);
  float pap=papField(p, 44., 13., 78.); gTip=pap<g? gPapTip : 0.;
  float d=smin(g,pap,5.);
  if(abs(p.y-12.)<9. && abs(p.z)<12.){ float c=crowd(p); if(c<d){ d=c; gMat=1.; } }
  return d;
}
float hMat, hIdx, hPart, hTip, hSide;
void saveMat(){ hMat=gMat; hIdx=gIdx; hPart=gPart; hTip=gTip; }
#include <raymarch>
vec3 lipidBg(vec3 rd){ float up=clamp(rd.y*0.5+0.5,0.,1.); return mix(vec3(0.006,0.018,0.024), vec3(0.03,0.09,0.11), up*up); }
Mat crowdMat(float fi, float part, vec3 p, vec3 n){
  int i=int(fi+0.5); vec4 S=bState(i); vec4 Dd=uBD[i];
  float tgt=S.x, dead=S.z, film=S.w;
  vec3 alb=tgt>0.5 ? vec3(0.3,0.08,0.42) : (fract(fi*0.618)<0.5? vec3(0.05,0.4,0.46) : vec3(0.07,0.46,0.4));
  alb*=0.85+0.3*tn(p*3.+fi);
  alb=mix(alb, vec3(0.2,0.2,0.21)*(0.8+0.4*tn(p*6.)), dead);
  Mat m=mkMat(alb); m.spec=mix(1.3,0.35,dead); m.gloss=mix(55.,18.,dead); m.rim=1.25*(1.-0.55*dead); m.rimCol=alb*1.5+mix(vec3(0.12,0.1,0.22),vec3(0.05),dead); m.sss=0.55*(1.-dead); m.sssCol=alb*1.25; m.wrap=0.55;
  if(part>1.5){ m=mkMat(tgt>0.5? vec3(0.55,0.35,0.7) : vec3(0.5,0.6,0.7)); m.spec=2.2; m.gloss=140.; m.rim=1.; m.rimCol=vec3(0.7,0.6,0.95); m.sss=0.4; }
  else if(part>0.5){ m.alb*=1.2; m.sss=0.9; m.emit=vec3(0.25,0.08,0.3)*0.4; }
  if(film>0.){ float th=0.4+0.6*tn((p-uBP[i].xyz)*2.2+vec3(0.,uTime*0.4,0.)); vec3 f=spectral(th*1.9);
    m.rimCol=mix(m.rimCol, f*1.8, film); m.spec+=film*1.5; m.gloss=mix(m.gloss,150.,film); m.emit+=f*0.07*film; }
  return m;
}
vec3 shade(vec3 ro, vec3 rd, out float dist){
  vec3 n; float ao;
  float t=trace(ro,rd,300.,n,ao);
  gKeyDir=vec3(-0.35,1.,0.45); gKeyCol=vec3(1.55,1.65,1.75);
  gFillDir=vec3(0.5,-0.6,0.3); gFillCol=vec3(0.1,0.35,0.4)*0.6;
  gAmb=vec3(0.015,0.03,0.035); gPLPos=uKeyPos; gPLCol=uKeyCol; gPLR=10.;
  vec3 col;
  if(t<0.){ col=lipidBg(rd); t=1e4; dist=1e4; }
  else {
    vec3 p=ro+rd*t; dist=t;
    Mat m; vec3 nn=n;
    if(hMat>0.5){ m=crowdMat(hIdx,hPart,p,n); if(hPart<0.5) nn=bumpN(p,n,9.,0.05); }
    else { m=tissueMat(p,n,hTip); m.alb*=0.5; m.spec=0.5; m.gloss=30.; }
    col=lighting(m,p,nn,rd,ao,1.);
    col=mix(col, vec3(0.01,0.035,0.045), 1.-exp(-uFogK*t));
  }
  if(!(uSplit>0.5 && gSide<0.5)){
    float best=min(t,1e4); int bi=-1; float bt=0.;
    for(int i=ZERO;i<20;i++){ vec4 D=uDrop[i]; if(D.w<=0.) continue; vec2 h=sphIntersect(ro,rd,D.xyz,D.w); if(h.x>0. && h.x<best){ best=h.x; bi=i; bt=h.x; } }
    if(bi>=0){ vec4 D=uDrop[bi]; col=dropletShade(ro,rd,D.xyz,D.w,bt,col,float(bi)); dist=bt; }
  }
  return col;
}
#define HAS_VOLUME
vec4 volume(vec3 ro, vec3 rd, float tmax, vec2 fc){
  gSide=step(0.5*uRes.x, fc.x);
  if(uWave<-50. || (uSplit>0.5 && gSide>0.5)) return vec4(0.);
  // the alcohol rinse: a bright turbulent front sweeping along +x through the crowd, clear-blue body behind it
  float t0=0., t1=min(tmax,60.); const int N=40; float dt=(t1-t0)/float(N); float t=t0+dt*hash12(fc);
  vec3 acc=vec3(0.); float T=1.;
  for(int i=ZERO;i<N;i++){ vec3 p=ro+rd*t;
    float x=p.x-uWave; float front=exp(-x*x/1.6)*(0.5+0.9*tn(p*0.7+vec3(0.,uTime*2.,0.))); float body=smoothstep(0.,-5.,x)*0.2*tn(p*0.35-vec3(uTime,0.,0.));
    float dn=(front*0.12+body*0.022)*smoothstep(0.,4.,p.y)*smoothstep(26.,18.,p.y);
    if(dn>0.){ vec3 c=mix(vec3(0.25,0.55,0.85), vec3(0.9,1.15,1.35), front)*0.9; float a=1.-exp(-dn*dt); acc+=T*a*c; T*=1.-a; }
    t+=dt; }
  return vec4(acc,1.-T);
}
`;

  // molecules: glossy ball-and-stick. H2S (S yellow, 2 H white, ~92 degrees), O2 (two pale blue balls, double bond).
  GLSL.mol = `
float gMolPart;
float h2s(vec3 p, vec3 c, mat3 R, float s){
  vec3 q=transpose(R)*(p-c)/s;
  float a=0.8; vec3 h1=vec3(sin(a),-cos(a),0.)*1.05, h2=vec3(-sin(a),-cos(a),0.)*1.05;
  float S=length(q)-0.52; float H=min(length(q-h1)-0.3, length(q-h2)-0.3);
  float B=min(sdCapsule(q, vec3(0.), h1, 0.1), sdCapsule(q, vec3(0.), h2, 0.1));
  float d=min(min(S,H),B); gMolPart=(S<=H && S<=B)?0.:(H<=B?1.:2.);
  return d*s;
}
float o2(vec3 p, vec3 c, mat3 R, float s){
  vec3 q=transpose(R)*(p-c)/s;
  float A=min(length(q-vec3(0.5,0,0))-0.42, length(q+vec3(0.5,0,0))-0.42);
  float B=min(sdCapsule(q, vec3(-0.5,0.09,0), vec3(0.5,0.09,0), 0.07), sdCapsule(q, vec3(-0.5,-0.09,0), vec3(0.5,-0.09,0), 0.07));
  float d=min(A,B); gMolPart=A<=B?3.:2.;
  return d*s;
}
mat3 rotAxis(vec3 ax, float a){ ax=normalize(ax); float c=cos(a), s=sin(a), t=1.-c;
  return mat3(t*ax.x*ax.x+c, t*ax.x*ax.y+s*ax.z, t*ax.x*ax.z-s*ax.y,  t*ax.x*ax.y-s*ax.z, t*ax.y*ax.y+c, t*ax.y*ax.z+s*ax.x,  t*ax.x*ax.z+s*ax.y, t*ax.y*ax.z-s*ax.x, t*ax.z*ax.z+c); }
Mat molMat(float part){
  Mat m;
  if(part<0.5){ m=mkMat(vec3(0.95,0.8,0.08)); m.rimCol=vec3(1.,0.9,0.4); m.sss=0.3; m.sssCol=vec3(1.,0.7,0.1); }
  else if(part<1.5){ m=mkMat(vec3(0.9,0.9,0.92)); m.rimCol=vec3(0.7,0.75,0.9); }
  else if(part<2.5){ m=mkMat(vec3(0.75,0.75,0.78)); m.rimCol=vec3(0.5); }
  else { m=mkMat(vec3(0.45,0.72,1.)); m.rimCol=vec3(0.6,0.85,1.); m.sss=0.25; m.sssCol=vec3(0.3,0.6,1.); }
  m.spec=2.2; m.gloss=160.; m.rim=0.9; m.wrap=0.3;
  return m;
}
`;

  // ------------------------------------------------------------------------------------------ pipeline
  let NOISE = null;
  // JS mirror of the shader's tn()/tn4(): same texels, same trilinear filtering (texcoord = p / 16, REPEAT)
  function tn(p, ch = 0) {
    if (!NOISE) return 0.5; const { data, N } = NOISE;
    const f = [0, 1, 2].map((k) => p[k] / 16 * N - 0.5), i0 = f.map(Math.floor), fr = f.map((v, k) => v - i0[k]);
    const g = (x, y, z) => data[((((z % N) + N) % N * N + (((y % N) + N) % N)) * N + (((x % N) + N) % N)) * 4 + ch] / 255;
    const [x, y, z] = i0, [a, b, c] = fr, l = (u, v, k) => u + (v - u) * k;
    return l(l(l(g(x, y, z), g(x + 1, y, z), a), l(g(x, y + 1, z), g(x + 1, y + 1, z), a), b), l(l(g(x, y, z + 1), g(x + 1, y, z + 1), a), l(g(x, y + 1, z + 1), g(x + 1, y + 1, z + 1), a), b), c);
  }
  function makeNoise3D(gl, api) {
    const N = 96, L = 16, s = N / L, rnd = api.rand('m3-noise');
    const lat = [0, 1, 2, 3].map(() => { const a = new Float32Array(L * L * L); for (let i = 0; i < a.length; i++) a[i] = rnd(); return a; });
    const q = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const data = new Uint8Array(N * N * N * 4);
    const L1 = L - 1;
    for (let z = 0; z < N; z++) {
      const fz = z / s, iz = Math.floor(fz), tz = q(fz - iz), z0 = iz & L1, z1 = (iz + 1) & L1;
      for (let y = 0; y < N; y++) {
        const fy = y / s, iy = Math.floor(fy), ty = q(fy - iy), y0 = iy & L1, y1 = (iy + 1) & L1;
        for (let x = 0; x < N; x++) {
          const fx = x / s, ix = Math.floor(fx), tx = q(fx - ix), x0 = ix & L1, x1 = (ix + 1) & L1;
          const o = ((z * N + y) * N + x) * 4;
          for (let c = 0; c < 4; c++) {
            const A = lat[c], g = (xx, yy, zz) => A[(zz * L + yy) * L + xx];
            const a = g(x0, y0, z0) + (g(x1, y0, z0) - g(x0, y0, z0)) * tx, b = g(x0, y1, z0) + (g(x1, y1, z0) - g(x0, y1, z0)) * tx;
            const cc = g(x0, y0, z1) + (g(x1, y0, z1) - g(x0, y0, z1)) * tx, d = g(x0, y1, z1) + (g(x1, y1, z1) - g(x0, y1, z1)) * tx;
            const v0 = a + (b - a) * ty, v1 = cc + (d - cc) * ty;
            data[o + c] = Math.round((v0 + (v1 - v0) * tz) * 255);
          }
        }
      }
    }
    NOISE = { data, N };
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, tex);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, N, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, w, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  function compile(gl, vs, fs) {
    const sh = (type, s) => { const o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(o) || ''; const lines = s.split('\n'); const m = /ERROR: \d+:(\d+)/.exec(log); throw new Error('GLSL: ' + log + (m ? '\n> ' + lines[+m[1] - 1] : '')); } return o; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('GLSL link: ' + gl.getProgramInfoLog(prog));
    const ul = {}; prog.U = (n) => (n in ul ? ul[n] : (ul[n] = gl.getUniformLocation(prog, n)));
    return prog;
  }

  function setUniforms(gl, prog, uniforms) {
    for (const [k, v] of Object.entries(uniforms)) {
      const l = prog.U(k); if (l == null) continue;
      if (typeof v === 'number') gl.uniform1f(l, v);
      else if (v && v.v4) gl.uniform4fv(l, v.v4);
      else if (v && v.v3) gl.uniform3fv(l, v.v3);
      else if (v && v.f) gl.uniform1fv(l, v.f);
      else if (Array.isArray(v) || v instanceof Float32Array) {
        if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v); else gl.uniform1fv(l, v);
      }
    }
  }

  function create(api, frag, opts = {}) {
    const tS = performance.now();
    const PR = api.params || {};
    const res = +(PR.res ?? opts.res ?? 0.5), aa = Math.max(1, Math.min(3, +(PR.aa ?? opts.aa ?? 1)));
    const W = Math.round(api.W * api.scale * res), H = Math.round(api.H * api.scale * res);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, alpha: false, antialias: false, premultipliedAlpha: false, depth: false });
    if (!gl) throw new Error('WebGL2 is not available');
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float is not available');
    const xdefs = String(PR.defs || '').split(',').filter(Boolean);
    const hasVol = /#define\s+HAS_VOLUME/.test(frag) && !xdefs.includes('NO_VOL');
    const defs = `#define RM_STEPS ${opts.steps ?? 140}\n#define RM_EPS ${(opts.eps ?? 0.0006).toFixed(6)}\n#define RM_STEP ${(opts.stepScale ?? 0.85).toFixed(3)}\n#define AA ${aa}\n#define SC ${(opts.sc ?? 1).toFixed(4)}\n#define NRM_H ${(opts.nrmH ?? 0.002).toFixed(5)}\n#define ZERO min(0,int(uTime))\n`;
    const main = `
out vec4 outColor;
void main(){
  vec3 acc=vec3(0.); float dm=1e9;
  for(int j=ZERO;j<AA;j++) for(int i=ZERO;i<AA;i++){
    vec2 o=(vec2(float(i),float(j))+.5)/float(AA)-.5;
    vec3 ro, rd; camRay(gl_FragCoord.xy+o, ro, rd);
    float d=1e4; vec3 c=shade(ro, rd, d);
    acc+=aces(max(c,0.)); dm=min(dm,d);
  }
  acc/=float(AA*AA); dm=min(dm, 6.0e4);
  ${hasVol ? '{ vec3 ro, rd; camRay(gl_FragCoord.xy, ro, rd); vec4 v=volume(ro, rd, dm, gl_FragCoord.xy); if(v.a>0.001){ acc=acc*(1.-v.a)+aces(v.rgb/max(v.a,1e-3))*v.a; } }' : ''}
  outColor=vec4(acc, dm);
}`;
    const src = `#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler3D;\nuniform vec2 uRes;\nuniform float uTime;\nuniform float uAspect;\n${defs}${xdefs.map((d) => '#define ' + d + '\n').join('')}${window.GL.LIB}\n${frag.replace('#include <raymarch>', RAYMARCH)}\n${main}`;
    const pScene = compile(gl, VERT, src), pDof = compile(gl, VERT, DOF);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    for (const p of [pScene, pDof]) { const loc = gl.getAttribLocation(p, 'aPos'); if (loc >= 0) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); } }
    const tC = performance.now();
    const noise = makeNoise3D(gl, api);
    if (PR.timing) console.warn(`[m3] compile ${(tC - tS).toFixed(0)} ms, noise ${(performance.now() - tC).toFixed(0)} ms`);
    const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W, H, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('half-float framebuffer incomplete');
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return {
      canvas: cv, gl, W, H,
      // uniforms for the scene shader; dof = { focus (world distance), blur (fraction of frame height at infinity), maxR (fraction), tint, lift, sat }
      draw(uniforms = {}, dof = {}) {
        gl.bindVertexArray(vao);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, W, H); gl.useProgram(pScene);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, noise);
        gl.uniform1i(pScene.U('uNoise'), 1);
        gl.uniform2f(pScene.U('uRes'), W, H); gl.uniform1f(pScene.U('uAspect'), W / H);
        setUniforms(gl, pScene, uniforms);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.useProgram(pDof);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(pDof.U('uTex'), 0);
        gl.uniform2f(pDof.U('uRes'), W, H);
        gl.uniform1f(pDof.U('uFocus'), dof.focus ?? 10);
        gl.uniform1f(pDof.U('uBlur'), (dof.blur ?? 0) * H); gl.uniform1f(pDof.U('uMaxR'), (dof.maxR ?? dof.blur ?? 0) * H);
        gl.uniform1f(pDof.U('uRad'), Math.max(0.45, 0.5 * H / 1080));
        gl.uniform1f(pDof.U('uLift'), dof.lift ?? 0); gl.uniform1f(pDof.U('uSat'), dof.sat ?? 1);
        gl.uniform3fv(pDof.U('uTint'), dof.tint || [1, 1, 1]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return cv;
      },
    };
  }

  // ------------------------------------------------------------------------------------------ JS camera (matches camMat)
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  function camera(ro, ta, roll = 0, fov = 2) {
    const cw = norm(sub(ta, ro)), cp = [Math.sin(roll), Math.cos(roll), 0], cu = norm(cross(cw, cp)), cv = cross(cu, cw);
    return { ro, ta, roll, fov, cu, cv, cw, uniforms: { uCamPos: ro, uCamTa: ta, uCamRoll: roll, uFov: fov } };
  }
  // world point -> design-space screen point {x, y, z (distance along view)}; null behind the camera
  function project(cam, p) {
    const q = sub(p, cam.ro), x = dot(q, cam.cu), y = dot(q, cam.cv), z = dot(q, cam.cw);
    if (z <= 1e-3) return null;
    return { x: 960 + (x / z) * cam.fov * 540, y: 540 - (y / z) * cam.fov * 540, z };
  }
  // GLSL camera matching camera()/project()
  GLSL.cam = `
uniform vec3 uCamPos, uCamTa; uniform float uCamRoll, uFov;
void camRay(vec2 fc, out vec3 ro, out vec3 rd){ vec2 uv=(2.*fc-uRes)/uRes.y; ro=uCamPos; mat3 c=camMat(ro,uCamTa,uCamRoll); rd=c*normalize(vec3(uv,uFov)); }
`;

  // ------------------------------------------------------------------------------------------ 2D helpers
  // shot list: [{ at, ... }] sorted; returns the active shot with local time lt and its index
  function shot(t, list, total = Infinity) { let i = 0; for (let k = 0; k < list.length; k++) if (t >= list[k].at) i = k; const s = list[i]; const end = i + 1 < list.length ? list[i + 1].at : total; return { ...s, i, lt: t - s.at, len: end - s.at }; }
  // bokeh motes: world points drawn as soft discs, blurred by their distance from the focus plane (same law as the DOF pass)
  function motes(ctx, cam, dof, pts, o = {}) {
    ctx.save(); ctx.globalCompositeOperation = o.blend || 'screen';
    for (const m of pts) {
      const s = project(cam, m.p); if (!s || s.z < (o.near ?? 0.2)) continue;
      const r0 = (m.r / s.z) * cam.fov * 540, coc = Math.min((dof.maxR ?? dof.blur ?? 0) * 1080, (dof.blur ?? 0) * 1080 * Math.abs(1 - (dof.focus ?? 10) / s.z));
      const R = Math.max(r0, coc, 0.6); const a = (m.a ?? 0.5) * Math.min(1, (r0 * r0 + 0.3) / (R * R)) * (o.alpha ?? 1);
      if (a < 0.003 || s.x < -R || s.x > 1920 + R || s.y < -R || s.y > 1080 + R) continue;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
      const c = m.c || o.color || '255,240,220';
      g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(coc > r0 ? 0.75 : 0.35, `rgba(${c},${a * (coc > r0 ? 0.85 : 0.4)})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function art(ctx, api) { api.text(ctx, '* ARTISTIC RENDERING', 1868, 52, { size: 19, color: api.P.faint, align: 'right', tracking: 2, weight: 600 }); }
  // medical-vis callout: dot on the object, thin line, small caps label with a soft shadow
  function callout(ctx, api, x0, y0, x1, y1, str, p, o = {}) {
    if (p <= 0) return;
    const { clamp, ease } = api, a = clamp(p * 1.5), lp = ease.outCubic(clamp(p * 1.4)), tp = clamp((p - 0.35) / 0.65);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
    ctx.strokeStyle = o.color || 'rgba(244,241,234,0.85)'; ctx.lineWidth = o.width || 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * lp, y0 + (y1 - y0) * lp); ctx.stroke();
    ctx.fillStyle = o.color || '#f4f1ea'; ctx.beginPath(); ctx.arc(x0, y0, (o.dot || 6) * clamp(p * 3), 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x0, y0, (o.dot || 6) * 2.4 * clamp(p * 2), 0, Math.PI * 2); ctx.lineWidth = 1.5; ctx.globalAlpha *= 0.5; ctx.stroke(); ctx.globalAlpha /= 0.5;
    const right = x1 >= x0, size = o.size || 40;
    if (tp > 0) {
      ctx.save(); ctx.beginPath(); const w = api.measure(ctx, str, { size, tracking: 3, upper: true }) + 30;
      ctx.rect(right ? x1 + 6 : x1 - 6 - w * tp, y1 - size, w * tp, size * 1.8); ctx.clip();
      api.text(ctx, str, right ? x1 + 14 : x1 - 14, y1 + size * 0.36, { size, color: o.textColor || '#f4f1ea', align: right ? 'left' : 'right', tracking: 3, upper: true, shadow: 'rgba(0,0,0,0.7)', shadowBlur: 14, shadowY: 2 });
      if (o.sub) api.text(ctx, o.sub, right ? x1 + 14 : x1 - 14, y1 + size * 0.36 + size * 0.95, { size: o.subSize || 30, color: 'rgba(244,241,234,0.72)', align: right ? 'left' : 'right', tracking: 2, upper: true, shadow: 'rgba(0,0,0,0.7)', shadowBlur: 12, shadowY: 2 });
      ctx.restore();
    }
    ctx.restore();
  }
  // big headline built word by word: words = [[str, t, color?]], centered at (cx, y)
  function headline(ctx, api, t, words, cx, y, o = {}) {
    const size = o.size || 96, gap = size * 0.28;
    const ws = words.map(([s]) => api.measure(ctx, s, { size, tracking: 2, upper: true }));
    const total = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
    let x = cx - total / 2;
    words.forEach(([s, tw, col], i) => {
      const k = api.prog(t, tw, 0.35, api.ease.outCubic);
      if (k > 0) api.text(ctx, s, x, y + (1 - k) * 26, { size, color: col || '#f4f1ea', tracking: 2, upper: true, alpha: k, shadow: 'rgba(0,0,0,0.65)', shadowBlur: 26, shadowY: 6 });
      x += ws[i] + gap;
    });
  }
  function lerp3(a, b, k) { return mix3(a, b, k); }

  // lipid scenes: one crowd layout for both (5 purple P. gingivalis-like targets, 11 teal/green others), uniform packing
  const LIPID = {
    crowd() {
      const B = [
        [2.5, 12.5, 1.0, 0.98, 1.3, 1], [-7.0, 14.5, -1.5, 0.98, 1.2, 1], [-3.5, 9.0, 2.0, 0.98, 1.2, 1], [7.5, 9.5, -1.0, 0.98, 1.2, 1], [-9.5, 9.5, 0.5, 0.98, 1.15, 1],
        [-4.5, 13.0, 0.0, 0.2, 1.2, 0], [0.0, 15.5, -2.0, 0.7, 1.0, 0], [5.5, 15.0, 0.5, 0.3, 1.1, 0], [-1.0, 11.0, -3.0, 0.5, 1.1, 0], [9.5, 13.0, -2.5, 0.85, 1.0, 0],
        [4.0, 8.0, 2.5, 0.55, 1.0, 0], [-6.5, 10.5, 3.0, 0.15, 1.0, 0], [-10.5, 13.0, -3.0, 0.5, 1.0, 0], [1.0, 8.5, -1.0, 0.25, 1.15, 0], [10.5, 16.0, 1.0, 0.72, 0.95, 0], [-2.0, 16.5, 2.5, 0.35, 1.0, 0],
      ];
      return B.map((b, i) => { const a = i * 2.39996, e = Math.sin(i * 1.7) * 0.5; return { p: [b[0], b[1], b[2]], type: b[3], s: b[4], tgt: b[5], a, e }; });
    },
    // bacterium position/direction at time t (gentle drift and tumble)
    at(b, t, i) { const p = [b.p[0] + Math.sin(t * 0.35 + i) * 0.25, b.p[1] + Math.sin(t * 0.5 + i * 2.1) * 0.3, b.p[2] + Math.cos(t * 0.3 + i) * 0.2];
      const a = b.a + t * 0.12 * (i % 2 ? 1 : -1), e = b.e + Math.sin(t * 0.4 + i) * 0.12; return { p, d: [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)] }; },
    // state(i) -> [tgt, burst 0..1, dead 0..1, film 0..1]; alt = the left half in split mode
    pack(crowd, t, state, alt) {
      const BP = new Float32Array(64), BD = new Float32Array(64), BS = new Float32Array(64), BSL = new Float32Array(64);
      crowd.forEach((b, i) => { const q = LIPID.at(b, t, i); BP.set([...q.p, b.s], i * 4); BD.set([...q.d, b.type], i * 4); BS.set(state(i, b), i * 4); BSL.set((alt || state)(i, b), i * 4); });
      return { uBP: { v4: BP }, uBD: { v4: BD }, uBS: { v4: BS }, uBSL: { v4: BSL } };
    },
    drops(list) { const D = new Float32Array(80); list.slice(0, 20).forEach((d, i) => D.set(d, i * 4)); return { uDrop: { v4: D } }; },
    // soft flash + shock ring for a burst at screen point s (2D, screen blend)
    flash(ctx, s, k, size) {
      if (!s || k <= 0 || k >= 1) return;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const r = size * (0.4 + 1.6 * k), a = (1 - k) * (1 - k);
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r); g.addColorStop(0, `rgba(235,215,255,${0.55 * a})`); g.addColorStop(0.5, `rgba(170,120,255,${0.18 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(230,220,255,${0.5 * a})`; ctx.lineWidth = 3 + 6 * (1 - k); ctx.beginPath(); ctx.arc(s.x, s.y, size * (0.5 + 2.4 * k), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    },
  };
  const groundH = (x, z) => 1.25 * Math.exp(-(x * x + z * z) / 60) + 0.9 * (tn([x * 0.06, z * 0.06, 0.5]) - 0.5) + 0.25 * (tn([x * 0.3, z * 0.3, 2.1]) - 0.5);
  window.M3 = { GLSL, create, tn, groundH, LIPID, camera, project, shot, motes, art, callout, headline, v: { sub, add, mul, dot, cross, norm, mix: lerp3 } };
})();
