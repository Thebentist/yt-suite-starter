/* cgi group: GLSL for the offer scenes only (cgi-mints, cgi-mouthwash): a generic amber mouthwash bottle with a plain
 * printed label, and peppermint-swirl pillow mints. Passed to CGI.create as opts.extra / opts.extraUniforms, which switches
 * on the CGI_EXTRA hooks in _lib.js; the delivered scenes (cgi-brush-floss, cgi-lineup) never load this file.
 */
window.CGI_OFFERS = {
  EXTRA_UNIFORMS: "\nuniform vec4 uMwP; uniform vec3 uMwR; uniform vec4 uMnP; uniform vec3 uMnR; uniform float uMints;\nmat3 gMwM, gMwI, gMnM, gMnI;\n",
  EXTRA: `
void setupExtra(){ gMwM = eul(uMwR); gMwI = transpose(gMwM); gMnM = eul(uMnR); gMnI = transpose(gMnM); }
// generic mouthwash bottle, local: bottom y = 0, cap on top, label on the +z face
float sdBottle(vec3 q, out float part){
  float waist = 0.025 * exp(-pow((q.y - 0.80) / 0.20, 2.));
  float body = sdRoundBox(q - vec3(0., 0.74, 0.), vec3(0.37 - waist, 0.72, 0.25 - waist * 0.6), 0.14);
  float d = smin(body, sdEllipsoid(q - vec3(0., 1.40, 0.), vec3(0.33, 0.24, 0.23)), 0.08);
  d = smin(d, sdCylinder(q - vec3(0., 1.62, 0.), 0.1, 0.115), 0.05);
  float cap = sdCylinder(q - vec3(0., 1.84, 0.), 0.14, 0.153) - 0.012;
  cap += 0.003 * smoothstep(0.2, 0.9, sin(atan(q.z, q.x) * 44.)) * step(q.y, 1.94);
  part = 0.; if (cap < d) { d = cap; part = 1.; }
  return d;
}
// a pillow mint: a disc with round edges, axis = local y
float sdMint(vec3 q){ vec2 w = vec2(length(q.xz) - 0.068, abs(q.y) - 0.010); return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - 0.024; }
void mapExtra(vec3 p, inout float d){
  if (uMwP.w > 0.5) {
    vec3 q = gMwI * (p - uMwP.xyz);
    float bb = sdCapsule(q, vec3(0., 0.2, 0.), vec3(0., 1.8, 0.), 0.5);
    if (bb < d) { if (bb > 0.12) d = bb; else { float part; float db = sdBottle(q, part); if (db < d) { d = db; gMat = part > 0.5 ? 21. : 20.; gL = q; } } }
  }
  if (uMnP.w > 0.5) { vec3 q = gMnI * (p - uMnP.xyz); float dm = sdMint(q); if (dm < d) { d = dm; gMat = 22.; gL = q; } }
  if (uMints > 0.5) {
    float bm = length(p - vec3(0., 0.1, 0.)) - 0.34;
    if (bm < d) {
      if (bm > 0.12) d = bm;
      else for (int i = ZERO; i < 5; i++) {
        float fi = float(i), rr = 0.07 + 0.045 * fi;
        vec3 c = vec3(rr * cos(fi * 2.4 + 0.6), 0.07 + 0.034, rr * sin(fi * 2.4 + 0.6) * 0.8);
        vec3 q = rotZ(0.05 * sin(fi * 3.1)) * (rotY(fi * 1.7) * (p - c));
        float dm = sdMint(q); if (dm < d) { d = dm; gMat = 22.; gL = q; }
      }
    }
  }
}
void matExtra(float mat, vec3 L, vec4 X, vec3 n, inout Mat m){
  if (mat < 20.5) {
    bool upper = L.y > 1.50;
    m.alb = upper ? vec3(0.96, 0.70, 0.30) : vec3(0.95, 0.50, 0.08); m.rough = 0.02; m.f0 = 0.05; m.sss = upper ? 0.7 : 1.0;
    vec3 nl = gMwI * n;
    if (L.z > 0.0 && nl.z > 0.3 && abs(L.x) < 0.27 && L.y > 0.43 && L.y < 1.03) {
      vec2 uv = vec2(0.5 - L.x / 0.54, (L.y - 0.43) / 0.60);   // seen from the front, local +x is on the viewer's left
      m.alb = pow(texture(uImgA, vec2(uv.x, 1. - uv.y)).rgb, vec3(2.2)); m.rough = 0.4; m.f0 = 0.035; m.sss = 0.;
    }
  } else if (mat < 21.5) { m.alb = vec3(0.90, 0.90, 0.92); m.rough = 0.3; m.f0 = 0.04; }
  else {
    float a = atan(L.z, L.x), r = length(L.xz);
    float sw = smoothstep(0.40, 0.60, fract(a / 6.2831853 * 8. + r * 9.)) * (1. - smoothstep(0.070, 0.082, r));
    m.alb = mix(vec3(0.95, 0.96, 0.97), vec3(0.16, 0.74, 0.68), sw); m.rough = 0.10; m.f0 = 0.05; m.sss = 0.45;
  }
}
`,
};
