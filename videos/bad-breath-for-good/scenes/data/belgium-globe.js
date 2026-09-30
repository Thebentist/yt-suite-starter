// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
// @use videos/bad-breath-for-good/scenes/data/_geo.js
/* belgium-globe (words 1290-1298): "But there's this bad breath clinic over in Belgium."
 * A lit 3D Earth on the GPU (continents from _geo.js as a texture, procedural terrain and clouds, sun glint on the
 * ocean, atmosphere rim), turning toward Europe; a ping and the tag BAD BREATH CLINIC on "clinic"; hard cut on
 * "Belgium" to a close orbit over Western Europe: Belgium glows, the pin drops on Leuven, chip LEUVEN, BELGIUM.
 */
const FRAG = `
uniform sampler2D uLand;
uniform float uLam0, uPhi0, uDist, uF;
uniform vec2 uCen;
uniform vec3 uSun;
const float PI = 3.14159265;
vec3 space(vec2 uv){
  vec3 c = mix(vec3(0.012, 0.010, 0.035), vec3(0.035, 0.028, 0.08), smoothstep(-0.8, 0.9, uv.y));
  vec2 g = floor(uv * 260.); float h = hash12(g);
  if (h > 0.9965) c += vec3(0.7, 0.75, 1.0) * (h - 0.9965) * 220. * smoothstep(0.5, 0.0, length(fract(uv * 260.) - 0.5));
  return c;
}
vec3 render(vec2 fc){
  vec2 uv = (fc - 0.5 * uRes) / uRes.y * 1080.;            // design px, y up, origin at screen centre
  vec3 ro = vec3(0., 0., -uDist);
  vec3 rd = normalize(vec3(uv - uCen, uF));
  // ray / unit sphere
  float b = dot(ro, rd), c = dot(ro, ro) - 1., h = b * b - c;
  float closest = length(ro - rd * b);                      // miss distance from the centre
  vec3 atmoC = vec3(0.25, 0.55, 1.0);
  vec3 L = normalize(uSun);
  if (h < 0.) {
    vec3 col = space(uv / 1080.);
    float glow = exp(-(closest - 1.) * 22.) * 0.9 + exp(-(closest - 1.) * 6.) * 0.14;
    // the halo is brighter on the sunlit side
    vec3 pc = normalize(ro - rd * b);
    float lit = clamp(dot(pc, L) * 0.7 + 0.45, 0.08, 1.);
    return col + atmoC * glow * lit;
  }
  float t = -b - sqrt(h);
  vec3 p = ro + rd * t, n = p;
  // view -> world (undo the tilt), then lon/lat
  float cp = cos(uPhi0), sp = sin(uPhi0);
  vec3 w = vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);
  float lat = asin(clamp(w.y, -1., 1.)), lon = uLam0 + atan(w.x, -w.z);
  vec2 tuv = vec2(fract((lon + PI) / (2. * PI)), (0.5 * PI - lat) / PI);
  float land = texture(uLand, tuv).r;
  vec3 wp = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));      // fixed-to-Earth position for noise
  float n1 = fbm3(wp * 7.0, 5), n2 = fbm3(wp * 22.0 + 3.1, 3);
  float latd = degrees(lat), lond = degrees(lon);
  // terrain colours: desert band, temperate green, boreal, ice
  vec3 green = mix(vec3(0.045, 0.075, 0.03), vec3(0.11, 0.13, 0.06), n1);
  vec3 desert = mix(vec3(0.38, 0.28, 0.16), vec3(0.58, 0.45, 0.28), n2);
  vec3 boreal = vec3(0.035, 0.06, 0.045);
  float arid = smoothstep(9., 17., latd) * (1. - smoothstep(33., 40., latd)) * smoothstep(0.35, 0.6, n1 + 0.25 * sin(lon * 3.));
  arid = max(arid, (1. - smoothstep(34., 45., latd)) * smoothstep(30., 38., latd) * smoothstep(0.45, 0.7, n1) * step(20., lond));   // Middle East / Central Asia
  vec3 terr = mix(green, desert, arid);
  terr = mix(terr, boreal, smoothstep(55., 64., latd));
  float ice = smoothstep(69., 74., latd + 6. * n2) + step(59., latd) * step(-75., lond) * step(lond, -12.);   // Arctic + Greenland
  terr = mix(terr, vec3(0.86, 0.9, 0.95), clamp(ice, 0., 1.));
  terr *= 0.7 + 0.5 * n2; terr *= 0.85 + 0.3 * smoothstep(0.3, 0.8, fbm3(wp * 40., 3));
  vec3 ocean = mix(vec3(0.003, 0.012, 0.035), vec3(0.006, 0.025, 0.06), n1);
  ocean = mix(ocean, vec3(0.012, 0.06, 0.09), smoothstep(0.02, 0.5, land) * (1. - land) * 1.6);    // shallow shelf near coasts
  vec3 base = mix(ocean, terr, smoothstep(0.45, 0.55, land));
  // clouds (drifting), with a soft shadow
  float cl = fbm3(wp * 4.2 + vec3(uTime * 0.02, 0., 0.), 5);
  cl = smoothstep(0.56, 0.82, cl) * 0.8;
  float cs = smoothstep(0.56, 0.82, fbm3(wp * 4.2 + vec3(uTime * 0.02 + 0.03, 0., 0.02), 5)) * 0.85;
  base *= 1. - 0.35 * cs;
  float dif = dot(n, L);
  float day = smoothstep(-0.12, 0.25, dif);
  vec3 col = base * (0.01 + 1.7 * max(dif, 0.));
  col = mix(col, vec3(1.0, 1.0, 1.05) * (0.05 + 1.25 * max(dif, 0.)), cl);
  // sun glint on water
  vec3 hv = normalize(L - rd);
  float water = 1. - smoothstep(0.4, 0.6, land);
  col += water * (1. - cl) * (pow(max(dot(n, hv), 0.), 700.) * 0.55 + pow(max(dot(n, hv), 0.), 60.) * 0.02) * day * vec3(1., 0.9, 0.75);
  // night side: faint blue
  col += (1. - day) * vec3(0.002, 0.004, 0.012);
  float city = smoothstep(0.55, 0.6, land) * step(0.985, hash12(floor(vec2(lon, lat) * 260.))) * smoothstep(0.55, 0.75, fbm3(wp * 14., 3)) * (1. - arid);
  col += (1. - day) * (1. - cl) * city * vec3(1.0, 0.7, 0.35) * 0.9;
  // atmosphere: fresnel rim, stronger on the lit side
  float fr = pow(1. - max(dot(n, -rd), 0.), 2.5);
  col = mix(col, atmoC * (0.12 + 1.0 * clamp(dif + 0.25, 0., 1.)), pow(fr, 1.6) * 0.6);
  return col;
}`;

let DATA, T, GEO, tex, rGlobe;

defineScene({
  name: 'belgium-globe',
  anchor: { word: 1290, offset: -0.15 },
  anchorEnd: { word: 1298, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    DATA = window.DATA.init(api); GEO = window.GEO;
    T = { clinic: api.at(1295), over: api.at(1296), belgium: api.at(1298) };
    // equirectangular land mask
    const W = 4096, H = 2048, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const px = ([lon, lat]) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
    const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => { const q = px(p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); g.fill(); };
    g.filter = 'blur(2px)';
    for (const p of GEO.land) poly(p, '#fff');
    for (const p of GEO.water) poly(p, '#000');
    g.filter = 'none';
    rGlobe = api.gl.create(api, FRAG, { res: 0.5, aa: 2 });
    tex = DATA.glTex(rGlobe, 'uLand', cv, 0);
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    const sh = DATA.shot(t, [0, T.belgium - 0.08]), lt = sh.lt;
    const rad = (d) => (d * Math.PI) / 180;
    // camera per shot: A wide globe turning toward Europe, B close orbit over Belgium
    let lam, phi, dist, F, cen;
    if (sh.i === 0) {
      const e = ease.outCubic(clamp(t / (T.belgium + 0.3)));
      lam = 4.7 + 58 * (1 - e); phi = lerp(28, 38, e); dist = lerp(4.6, 4.3, t / 3); F = 1850; cen = [0, -40];
    } else {
      lam = -9 + 2.5 * lt; phi = 29 + 1.0 * lt; dist = lerp(2.25, 2.08, clamp(lt / 1.6)); F = 1500; cen = [-120, -620];
    }
    const sun = [-0.85, 0.42, -0.35];
    ctx.drawImage(rGlobe.draw({ uTime: t, uLam0: rad(lam), uPhi0: rad(phi), uDist: dist, uF: F, uCen: cen, uSun: sun }), 0, 0, 1920, 1080);
    // JS projection matching the shader
    const cp = Math.cos(rad(phi)), sp = Math.sin(rad(phi));
    const project = (lon, lat) => {
      const la = rad(lat), dl = rad(lon - lam);
      const wx = Math.cos(la) * Math.sin(dl), wy = Math.sin(la), wz = -Math.cos(la) * Math.cos(dl);
      const vx = wx, vy = wy * cp + wz * sp, vz = -wy * sp + wz * cp;            // Rx(-phi)
      if (vz > -1 / dist) return null;
      const k = F / (vz + dist);
      return { x: 960 + cen[0] + vx * k, y: 540 - (cen[1] + vy * k), k };
    };
    const [llon, llat] = GEO.leuven;
    const L = project(llon, llat);
    // Belgium: glowing fill + outline (from the moment the clinic is named, stronger on "Belgium")
    const bk = sh.i === 0 ? prog(t, T.clinic, 0.5) * 0.5 : 0.5 + 0.5 * prog(lt, 0.05, 0.4);
    if (bk > 0) {
      const pts = GEO.belgium.map(([lo, la]) => project(lo, la));
      if (pts.every(Boolean)) {
        ctx.save(); ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
        ctx.fillStyle = `rgba(215,243,74,${0.32 * bk})`; ctx.shadowColor = P.lime; ctx.shadowBlur = 30 * bk; ctx.fill();
        ctx.strokeStyle = P.lime; ctx.lineWidth = sh.i === 0 ? 2 : 4; ctx.globalAlpha = bk; ctx.stroke(); ctx.restore();
      }
    }
    if (L) {
      if (sh.i === 0) {
        // ping on Belgium and the tag on "clinic"
        const pk = prog(t, T.clinic - 0.1, 0.4);
        for (let k = 0; k < 2; k++) { const rp = clamp((t - T.clinic - k * 0.35) / 1.0); if (rp > 0 && rp < 1) { ctx.save(); ctx.strokeStyle = `rgba(215,243,74,${0.9 * (1 - rp)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(L.x, L.y, 8 + rp * 70, (8 + rp * 70) * 0.6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } }
        if (pk > 0) { DATA.glow(ctx, L.x, L.y, 40, P.lime, 0.8 * pk); ctx.fillStyle = P.lime; ctx.beginPath(); ctx.arc(L.x, L.y, 6 * pk, 0, Math.PI * 2); ctx.fill(); }
        const tg = pop(t, T.clinic, 0.5);
        if (tg > 0) {
          const tx = L.x + 330, ty = L.y - 190, lk = clamp(tg);
          ctx.save(); ctx.strokeStyle = 'rgba(244,241,234,0.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(L.x + 6, L.y - 6); ctx.lineTo(lerp(L.x, tx - 150, lk), lerp(L.y, ty + 26, lk)); ctx.lineTo(lerp(L.x, tx - 150, lk) + 20 * lk, lerp(L.y, ty + 26, lk)); ctx.stroke(); ctx.restore();
          api.label(ctx, 'BAD BREATH CLINIC', tx, ty, { size: 50, align: 'center', p: tg, bg: P.ink, color: P.black });
        }
      } else {
        // the pin drops on Leuven
        const drop = prog(lt, 0.0, 0.32, ease.inQuad), sq = lt > 0.32 ? 1 - 0.15 * Math.sin(clamp((lt - 0.32) / 0.25) * Math.PI) : 1;
        for (let k = 0; k < 3; k++) { const rp = clamp((lt - 0.3 - k * 0.3) / 1.1); if (rp > 0 && rp < 1) { ctx.save(); ctx.strokeStyle = `rgba(215,243,74,${0.85 * (1 - rp)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(L.x, L.y, 14 + rp * 150, (14 + rp * 150) * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } }
        if (drop > 0) {
          ctx.save(); ctx.translate(L.x, L.y - (1 - drop) * 300); ctx.scale(1 / sq, sq);
          ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(0, 0, 22 * drop, 8 * drop, 0, 0, Math.PI * 2); ctx.fill();
          const pg = ctx.createLinearGradient(-30, -110, 30, -20); pg.addColorStop(0, '#f6ffb0'); pg.addColorStop(1, '#8fae10');
          ctx.shadowColor = 'rgba(215,243,74,0.9)'; ctx.shadowBlur = 30; ctx.fillStyle = pg;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-12, -32, -36, -54, -36, -80); ctx.arc(0, -80, 36, Math.PI, 0); ctx.bezierCurveTo(36, -54, 12, -32, 0, 0); ctx.fill();
          ctx.shadowColor = 'transparent'; ctx.fillStyle = '#0b0a18'; ctx.beginPath(); ctx.arc(0, -80, 13, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-14, -96, 8, 12, -0.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        // the parallel through Leuven, dotted, with its latitude
        { const pts = []; for (let lo = -40; lo <= 50; lo += 1) { const q = project(lo, llat); if (q) pts.push(q); } ctx.save(); ctx.setLineDash([3, 9]); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(244,241,234,0.45)'; ctx.lineWidth = 2; ctx.globalAlpha = prog(lt, 0.1, 0.5); ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke(); ctx.restore();
          const lq = project(-22, llat); if (lq) DATA.caps(ctx, '50.9° N', lq.x, lq.y - 14, { size: 30, color: 'rgba(244,241,234,0.7)', alpha: prog(lt, 0.3, 0.5), tracking: 3 }); }
        api.label(ctx, 'LEUVEN, BELGIUM', L.x + 260, L.y - 150, { size: 60, align: 'center', p: pop(lt, 0.18, 0.5) });
        api.label(ctx, 'BAD BREATH CLINIC', L.x + 260, L.y - 66, { size: 40, align: 'center', p: pop(lt, 0.32, 0.5), bg: P.ink, color: P.black });
      }
    }
    DATA.artistic(ctx);
    DATA.finish(ctx, t, { bloom: 0.3 });
  },
});
