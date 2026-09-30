/* WebGL2 for motion scenes: real 3D (ray-marched SDFs) rendered on the GPU and drawn into the scene's 2D canvas.
 *
 *   setup(api) { this.gl = api.gl.create(api, FRAG, { aa: 2, res: 1 }); }
 *   draw(ctx, t, api) { const cv = this.gl.draw({ uTime: t, uCam: [x, y, z] }); ctx.drawImage(cv, 0, 0, api.W, api.H); }
 *
 * FRAG is GLSL ES 3.00 without the header. Write `vec3 render(vec2 fragCoord)` returning LINEAR colour (the module
 * averages aa x aa jittered samples, tone-maps with ACES and applies sRGB gamma), or `vec4 render4(vec2 fragCoord)` with
 * `#define HAS_ALPHA` for a transparent layer (premultiplied colour, alpha). Uniforms: uRes (px), uTime, uAspect, plus
 * any you pass to draw() (numbers -> float, arrays of 2/3/4 -> vec2/3/4; declare them yourself: uniform vec3 uCam;).
 *
 * Library (always available): hash12/hash13/hash22/hash33, noise3, fbm3(p, octaves), rot2(a), rotX/rotY/rotZ(a),
 * sdSphere, sdEllipsoid, sdBox, sdRoundBox, sdCapsule, sdRoundCone, sdTorus, sdCylinder, smin, smax, camMat(ro, ta, roll),
 * fresnel(cosTheta, f0), aces(c), and after YOUR `float map(vec3 p)` put the line `#include <raymarch>` to get
 * march(ro, rd, tmax) -> t (or -1), calcNormal(p), softShadow(ro, rd, tmin, tmax, k), calcAO(p, n).
 */
(function () {
  const LIB = `
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float hash13(vec3 p3){ p3=fract(p3*.1031); p3+=dot(p3,p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
vec2 hash22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec3 hash33(vec3 p3){ p3=fract(p3*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yxz+33.33); return fract((p3.xxy+p3.yxx)*p3.zyx); }
float noise3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p,int oct){ float a=.5,s=0.; for(int i=0;i<8;i++){ if(i>=oct) break; s+=a*noise3(p); p=p*2.02+vec3(1.7,9.2,3.1); a*=.5; } return s; }
mat2 rot2(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
mat3 rotX(float a){ float c=cos(a),s=sin(a); return mat3(1,0,0, 0,c,s, 0,-s,c); }
mat3 rotY(float a){ float c=cos(a),s=sin(a); return mat3(c,0,-s, 0,1,0, s,0,c); }
mat3 rotZ(float a){ float c=cos(a),s=sin(a); return mat3(c,s,0, -s,c,0, 0,0,1); }
float sdSphere(vec3 p,float r){ return length(p)-r; }
float sdEllipsoid(vec3 p,vec3 r){ float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.)/k1; }
float sdBox(vec3 p,vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
float sdRoundBox(vec3 p,vec3 b,float r){ vec3 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r; }
float sdCapsule(vec3 p,vec3 a,vec3 b,float r){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
float sdRoundCone(vec3 p,vec3 a,vec3 b,float r1,float r2){ vec3 ba=b-a; float l2=dot(ba,ba), rr=r1-r2, a2=l2-rr*rr, il2=1./l2; vec3 pa=p-a; float y=dot(pa,ba), z=y-l2; vec3 xv=pa*l2-ba*y; float x2=dot(xv,xv), y2=y*y*l2, z2=z*z*l2; float k=sign(rr)*rr*rr*x2; if(sign(z)*a2*z2>k) return sqrt(x2+z2)*il2-r2; if(sign(y)*a2*y2<k) return sqrt(x2+y2)*il2-r1; return (sqrt(x2*a2*il2)+y*rr)*il2-r1; }
float sdTorus(vec3 p,vec2 t){ vec2 q=vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
float sdCylinder(vec3 p,float h,float r){ vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h); return min(max(d.x,d.y),0.)+length(max(d,0.)); }
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float smax(float a,float b,float k){ return -smin(-a,-b,k); }
mat3 camMat(vec3 ro,vec3 ta,float cr){ vec3 cw=normalize(ta-ro), cp=vec3(sin(cr),cos(cr),0.), cu=normalize(cross(cw,cp)), cv=cross(cu,cw); return mat3(cu,cv,cw); }
float fresnel(float c,float f0){ return f0+(1.-f0)*pow(1.-clamp(c,0.,1.),5.); }
vec3 aces(vec3 x){ const float a=2.51,b=.03,c=2.43,d=.59,e=.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.); }
`;
  const RAYMARCH = `
float march(vec3 ro, vec3 rd, float tmax){ float t=0.; for(int i=0;i<RM_STEPS;i++){ vec3 p=ro+rd*t; float d=map(p); if(abs(d)<RM_EPS*t) return t; t+=d*RM_STEP; if(t>tmax) break; } return -1.; }
vec3 calcNormal(vec3 p){ const float h=.0008; const vec2 k=vec2(1,-1); return normalize(k.xyy*map(p+k.xyy*h)+k.yyx*map(p+k.yyx*h)+k.yxy*map(p+k.yxy*h)+k.xxx*map(p+k.xxx*h)); }
float softShadow(vec3 ro,vec3 rd,float tmin,float tmax,float k){ float res=1., t=tmin; for(int i=0;i<48;i++){ float h=map(ro+rd*t); res=min(res,k*h/t); t+=clamp(h,.01,.25); if(res<.004||t>tmax) break; } return clamp(res,0.,1.); }
float calcAO(vec3 p,vec3 n){ float occ=0., sca=1.; for(int i=0;i<5;i++){ float h=.01+.12*float(i)/4.; occ+=(h-map(p+h*n))*sca; sca*=.95; } return clamp(1.-3.*occ,0.,1.); }
`;
  const VERT = `#version 300 es
in vec2 aPos; void main(){ gl_Position = vec4(aPos, 0., 1.); }`;

  function create(api, frag, opts = {}) {
    const res = opts.res ?? 1, aa = Math.max(1, Math.min(3, opts.aa ?? 1));
    const cv = document.createElement('canvas');
    cv.width = Math.round(api.W * api.scale * res); cv.height = Math.round(api.H * api.scale * res);
    const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) throw new Error('WebGL2 is not available in this Chrome');
    const alpha = /#define\s+HAS_ALPHA/.test(frag);
    const defs = `#define RM_STEPS ${opts.steps ?? 160}\n#define RM_EPS ${(opts.eps ?? 0.0006).toFixed(6)}\n#define RM_STEP ${(opts.stepScale ?? 0.9).toFixed(3)}\n#define AA ${aa}\n`;
    const body = frag.replace('#include <raymarch>', RAYMARCH);
    const main = alpha
      ? `out vec4 outColor; void main(){ vec4 acc=vec4(0.); for(int j=0;j<AA;j++) for(int i=0;i<AA;i++){ vec2 o=(vec2(float(i),float(j))+.5)/float(AA)-.5; vec4 c=render4(gl_FragCoord.xy+o); acc+=vec4(aces(c.rgb/max(c.a,1e-4))*c.a, c.a); } acc/=float(AA*AA); outColor=vec4(pow(acc.rgb/max(acc.a,1e-4),vec3(1./2.2))*acc.a, acc.a); }`
      : `out vec4 outColor; void main(){ vec3 acc=vec3(0.); for(int j=0;j<AA;j++) for(int i=0;i<AA;i++){ vec2 o=(vec2(float(i),float(j))+.5)/float(AA)-.5; acc+=aces(render(gl_FragCoord.xy+o)); } acc/=float(AA*AA); outColor=vec4(pow(acc,vec3(1./2.2)),1.); }`;
    const src = `#version 300 es\nprecision highp float;\nprecision highp int;\nuniform vec2 uRes;\nuniform float uTime;\nuniform float uAspect;\n${defs}${LIB}\n${body}\n${main}`;
    const sh = (type, s) => { const o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(o); const lines = s.split('\n'); const m = /ERROR: \d+:(\d+)/.exec(log || ''); throw new Error('GLSL: ' + log + (m ? '\n> ' + lines[+m[1] - 1] : '')); } return o; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, src)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('GLSL link: ' + gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const ul = {}; const U = (n) => (n in ul ? ul[n] : (ul[n] = gl.getUniformLocation(prog, n)));
    return {
      canvas: cv, gl,
      draw(uniforms = {}) {
        gl.viewport(0, 0, cv.width, cv.height); gl.useProgram(prog);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(U('uRes'), cv.width, cv.height); gl.uniform1f(U('uAspect'), cv.width / cv.height);
        for (const [k, v] of Object.entries(uniforms)) {
          const l = U(k); if (l == null) continue;
          if (typeof v === 'number') gl.uniform1f(l, v);
          else if (Array.isArray(v) || v instanceof Float32Array) {
            if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v); else gl.uniform1fv(l, v);
          }
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return cv;
      },
    };
  }
  window.GL = { create, LIB };
})();
