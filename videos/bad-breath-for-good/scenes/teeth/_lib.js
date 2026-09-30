/* Shared kit for the `teeth` group (bad-breath-for-good). Loaded with
 *   // @use videos/bad-breath-for-good/scenes/teeth/_lib.js
 * Defines window.TEETH. Call TEETH.init(api) in setup().
 *
 * SECTION  a mesiodistal cross-section of the lower posterior teeth: second premolar | first molar | second molar |
 *          third molar (the outer two dimmed). Units are millimetres, origin = the contact point between the two
 *          molars at the level of the cemento-enamel junction (CEJ), +y toward the roots. Real proportions: crown
 *          ~7.5 mm, roots ~13-14 mm, enamel ~1.8 mm at the cusps thinning to nothing at the CEJ, pulp horns under the
 *          cusps, two roots per molar (the mesial one curving distally), furcation ~3.7 mm below the CEJ,
 *          interdental papilla filling the embrasure under the contact, bone crest ~1.8 mm below the CEJ, a periodontal
 *          ligament space and a lamina dura around every root. State: red / swell (gingivitis), drop (bone loss),
 *          pocket (periodontal pocket).
 * FRONT    a frontal view of both arches in occlusion, projected from a parabolic arch form (teeth foreshorten and
 *          shrink as the arch turns away), with scalloped gums, papillae, incisal translucency; plus the orthodontic
 *          hardware: twin brackets bonded at the centre of each crown, an archwire through the slots, elastic ties.
 * EXTERIOR the same two molars seen from the cheek side (crowns + gum), for the floss shot.
 * PROPS    generic unbranded mouthwash bottle, xylitol tablet mint, sugary swirl mint, floss strand, food crumbs,
 *          a top-view tongue with a dry / cracked state, bacteria (bad green rods, good teal), cocci chains.
 * CAMERA   keyframed camera: TEETH.cam(t, keys) -> {z, x, y} (design point at the screen centre); apply / toScreen.
 */
(function () {
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hexRgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const A = typeof a === 'string' ? hexRgb(a) : a, B = typeof b === 'string' ? hexRgb(b) : b; return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]; };
  const rgba = (c, a = 1) => { const C = typeof c === 'string' ? hexRgb(c) : c; return `rgba(${Math.round(C[0])},${Math.round(C[1])},${Math.round(C[2])},${a})`; };
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return [c, c.getContext('2d')]; }
  let api = null, P = null, SS = 2;

  // ================================================================= geometry helpers ==============================
  // centripetal Catmull-Rom through pts -> dense polyline (no overshoot loops on uneven spacing)
  function crp(pts, closed = true, n = 10) {
    const N = pts.length, out = [];
    if (N < 2) return pts.slice();
    const get = (i) => {
      if (closed) return pts[((i % N) + N) % N];
      if (i < 0) return [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]];
      if (i >= N) return [2 * pts[N - 1][0] - pts[N - 2][0], 2 * pts[N - 1][1] - pts[N - 2][1]];
      return pts[i];
    };
    const segs = closed ? N : N - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const d = (a, b) => Math.max(1e-4, Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5));
      const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
      for (let k = 0; k < n; k++) {
        const t = lerp(t1, t2, k / n), P2 = [0, 0];
        for (let c = 0; c < 2; c++) {
          const A1 = ((t1 - t) / (t1 - t0)) * p0[c] + ((t - t0) / (t1 - t0)) * p1[c];
          const A2 = ((t2 - t) / (t2 - t1)) * p1[c] + ((t - t1) / (t2 - t1)) * p2[c];
          const A3 = ((t3 - t) / (t3 - t2)) * p2[c] + ((t - t2) / (t3 - t2)) * p3[c];
          const B1 = ((t2 - t) / (t2 - t0)) * A1 + ((t - t0) / (t2 - t0)) * A2;
          const B2 = ((t3 - t) / (t3 - t1)) * A2 + ((t - t1) / (t3 - t1)) * A3;
          P2[c] = ((t2 - t) / (t2 - t1)) * B1 + ((t - t1) / (t2 - t1)) * B2;
        }
        out.push(P2);
      }
    }
    if (!closed) out.push(pts[N - 1].slice());
    return out;
  }
  function path(ctx, pts, close = true) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
  }
  const xf = (pts, f) => pts.map((p) => f(p[0], p[1]));
  // x where a closed polyline crosses the horizontal line y: side 'min' (leftmost) or 'max'
  function crossX(pts, y, side = 'max') {
    let best = null;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] - y) * (b[1] - y) > 0 || a[1] === b[1]) continue;
      const x = lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1]));
      if (best == null || (side === 'max' ? x > best : x < best)) best = x;
    }
    return best;
  }

  // ================================================================= camera ========================================
  // keys: [[t, z, x, y], ...]; smooth (inOutCubic) between keys; (x, y) is the design point at the screen centre
  function cam(t, keys) {
    if (t <= keys[0][0]) return { z: keys[0][1], x: keys[0][2], y: keys[0][3] };
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0]);
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        return { z: lerp(a[1], b[1], e), x: lerp(a[2], b[2], e), y: lerp(a[3], b[3], e) };
      }
    }
    const k = keys[keys.length - 1]; return { z: k[1], x: k[2], y: k[3] };
  }
  function camApply(ctx, c) { ctx.translate(W / 2, H / 2); ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y); }
  const toScreen = (c, x, y) => [W / 2 + (x - c.x) * c.z, H / 2 + (y - c.y) * c.z];

  // ================================================================= SECTION: tooth shapes (mm) ====================
  // Lower teeth, mesial on the left, crown up. y = 0 at the CEJ, +y toward the apex.
  const DEF = {
    M1: {
      crown: [[-4.15, 0], [-4.55, -1.5], [-5.15, -3.4], [-5.5, -4.85], [-5.3, -6.0], [-4.6, -6.8], [-3.7, -7.3], [-2.9, -7.6], [-2.1, -7.35],
        [-1.25, -6.8], [-0.4, -7.2], [0.55, -7.45], [1.45, -7.2], [2.25, -6.75], [2.95, -6.95], [3.6, -7.05], [4.35, -6.65], [4.95, -5.9],
        [5.3, -4.8], [5.05, -3.2], [4.5, -1.5], [3.95, 0]],
      root: [[4.1, 1.6], [4.3, 4.2], [4.35, 7.2], [4.1, 10.2], [3.6, 12.4], [3.05, 13.35], [2.45, 13.1], [1.95, 11.8], [1.6, 9.3], [1.25, 6.6],
        [0.8, 4.5], [0.0, 3.75], [-0.85, 4.5], [-1.2, 6.8], [-1.35, 9.5], [-1.55, 11.9], [-1.95, 13.4], [-2.55, 13.95], [-3.2, 13.6], [-3.75, 12.3],
        [-4.2, 10.0], [-4.5, 7.0], [-4.55, 4.2], [-4.35, 1.6]],
      dej: [[-4.15, 0], [-4.05, -1.4], [-4.15, -3.0], [-4.1, -4.4], [-3.6, -5.35], [-2.75, -5.8], [-1.9, -5.55], [-1.2, -5.2], [-0.4, -5.5],
        [0.5, -5.75], [1.4, -5.45], [2.25, -5.2], [2.95, -5.35], [3.5, -5.4], [4.0, -4.6], [4.05, -3.2], [3.75, -1.5], [3.95, 0]],
      pulp: [[-2.45, 13.2], [-2.7, 10.5], [-2.85, 7.0], [-2.8, 3.8], [-2.6, 1.2], [-2.55, -0.8], [-2.35, -2.4], [-2.05, -3.0], [-1.7, -2.3], [-0.9, -1.75], [0.0, -1.95], [0.55, -2.85], [0.95, -2.1], [1.7, -1.8], [2.2, -1.95], [2.5, -0.8], [2.55, 1.2], [2.85, 3.8], [3.05, 7.0], [3.05, 10.4], [2.95, 12.8], [2.7, 10.4], [2.55, 7.0], [2.3, 3.9], [1.8, 1.9], [0.0, 1.5], [-1.8, 1.9], [-2.2, 3.9], [-2.3, 7.0], [-2.2, 10.5]],
      tilt: 0.02,
    },
    M2: {
      crown: [[-4.0, 0], [-4.45, -1.5], [-5.0, -3.4], [-5.25, -4.85], [-5.0, -6.1], [-4.3, -6.8], [-3.3, -7.2], [-2.3, -7.45], [-1.3, -7.15],
        [-0.2, -6.7], [0.9, -7.1], [1.9, -7.3], [2.9, -7.05], [3.95, -6.45], [4.7, -5.5], [4.95, -4.4], [4.7, -3.0], [4.2, -1.5], [3.75, 0]],
      root: [[3.95, 1.6], [4.2, 4.3], [4.2, 7.3], [3.95, 9.9], [3.45, 11.9], [2.95, 12.8], [2.35, 12.55], [1.9, 11.2], [1.55, 8.8], [1.1, 6.5],
        [0.55, 5.1], [0.0, 4.7], [-0.6, 5.2], [-1.0, 7.0], [-1.3, 9.3], [-1.6, 11.4], [-2.05, 12.7], [-2.65, 13.05], [-3.25, 12.6], [-3.75, 11.0],
        [-4.15, 8.4], [-4.35, 5.2], [-4.3, 1.6]],
      dej: [[-4.0, 0], [-3.95, -1.4], [-4.0, -3.0], [-3.95, -4.5], [-3.4, -5.4], [-2.3, -5.7], [-1.3, -5.4], [-0.25, -5.1], [0.9, -5.4], [1.9, -5.55],
        [3.0, -5.2], [3.7, -4.5], [3.8, -3.0], [3.55, -1.4], [3.75, 0]],
      pulp: [[-2.2, 12.3], [-2.45, 9.8], [-2.55, 6.8], [-2.5, 3.8], [-2.4, 1.1], [-2.35, -0.9], [-2.1, -2.4], [-1.75, -2.95], [-1.35, -2.2], [-0.4, -1.8], [0.6, -2.0], [1.3, -2.8], [1.7, -2.1], [2.3, -0.9], [2.4, 1.1], [2.65, 3.8], [2.85, 6.8], [2.8, 9.8], [2.6, 12.0], [2.35, 9.8], [2.3, 6.8], [2.05, 4.8], [1.4, 3.0], [0.0, 2.6], [-1.4, 3.0], [-1.95, 4.8], [-2.0, 6.8], [-1.9, 9.8]],
      tilt: 0.06,
    },
    PM2: {
      crown: [[-2.5, 0], [-2.95, -1.5], [-3.45, -3.6], [-3.5, -4.85], [-3.1, -5.9], [-2.1, -6.7], [-0.9, -7.4], [0.1, -7.7], [1.1, -7.35],
        [2.3, -6.6], [3.2, -5.7], [3.5, -4.85], [3.35, -3.4], [2.85, -1.5], [2.4, 0]],
      root: [[2.45, 1.6], [2.5, 4.5], [2.2, 8.0], [1.6, 11.2], [0.9, 13.4], [0.2, 14.3], [-0.5, 13.6], [-1.3, 11.3], [-2.0, 8.0], [-2.4, 4.5], [-2.5, 1.6]],
      dej: [[-2.5, 0], [-2.45, -1.5], [-2.55, -3.5], [-2.2, -4.8], [-1.2, -5.6], [0.1, -6.0], [1.3, -5.6], [2.15, -4.8], [2.4, -3.4], [2.3, -1.5], [2.4, 0]],
      pulp: [[0.15, 13.6], [-0.3, 10], [-0.55, 6], [-0.8, 2], [-0.9, -1.2], [-0.45, -3.3], [0.15, -3.5], [0.65, -2.9], [0.85, -1], [0.8, 2], [0.55, 6], [0.4, 10]],
      tilt: 0.0,
    },
  };
  function buildTooth(def, dx, sc = 1) {
    const tl = (x, y) => [dx + (x + def.tilt * Math.max(0, y - 2)) * sc, y * sc];
    const outline = xf(crp([...def.crown, ...def.root], true, 10), tl);
    const crownOpen = xf(crp(def.crown, false, 10), tl);
    const dej = xf(crp(def.dej, false, 10), tl);
    const pulp = xf(crp(def.pulp, true, 8), tl);
    const top = Math.min(...outline.map((p) => p[1])), bot = Math.max(...outline.map((p) => p[1]));
    // dentinal tubules: crown ones run from the pulp chamber to the DEJ, root ones from the canal to the root surface
    const tubules = [], pc = [dx, -0.6 * sc];
    for (let i = 2; i < dej.length - 2; i += 2) {
      const e = dej[i], s0 = [lerp(e[0], pc[0], 0.66), lerp(e[1], pc[1], 0.66)];
      const L = Math.hypot(e[0] - s0[0], e[1] - s0[1]) || 1, nx = -(e[1] - s0[1]) / L, ny = (e[0] - s0[0]) / L;
      tubules.push([s0[0], s0[1], (e[0] + s0[0]) / 2 + nx * 0.22, (e[1] + s0[1]) / 2 + ny * 0.22, e[0], e[1]]);
    }
    for (let i = 0; i < outline.length; i += 3) {
      const e = outline[i]; if (e[1] < 1.2 * sc || e[1] > 11.5 * sc) continue;
      let best = null;
      for (let j = 0; j < pulp.length; j++) { const a = pulp[j], b = pulp[(j + 1) % pulp.length]; if ((a[1] - e[1]) * (b[1] - e[1]) > 0 || a[1] === b[1]) continue; const x = lerp(a[0], b[0], (e[1] - a[1]) / (b[1] - a[1])); if (best == null || Math.abs(x - e[0]) < Math.abs(best - e[0])) best = x; }
      if (best == null || Math.abs(best - e[0]) > 2.2) continue;
      tubules.push([best, e[1] + 0.3, (best + e[0]) / 2, e[1] - 0.05, e[0], e[1] - 0.25]);
    }
    return { outline, crownOpen, dej, pulp, dx, sc, top, bot, tubules };
  }
  // the four teeth; embrasure contact points at x = -10.8, 0, 10.2
  const SEC = { teeth: [], emb: [-10.8, 0, 10.2], crest0: 1.8 };
  function buildSection() {
    SEC.teeth = [
      Object.assign(buildTooth(DEF.PM2, -14.3), { name: 'PM2', side: true }),
      Object.assign(buildTooth(DEF.M1, -5.3), { name: 'M1' }),
      Object.assign(buildTooth(DEF.M2, 5.25), { name: 'M2' }),
      Object.assign(buildTooth(DEF.M2, 15.19, 0.95), { name: 'M3', side: true }),
    ];
    // bone texture (cancellous bone with marrow spaces), mm range x[-26,26] y[0,26] at TPX px/mm
    const TPX = 34, [c, g] = mk(52 * TPX, 26 * TPX); g.scale(TPX, TPX); g.translate(26, 0);
    const gr = g.createLinearGradient(0, 0, 0, 26); gr.addColorStop(0, '#e9dcc1'); gr.addColorStop(0.35, '#dccaa6'); gr.addColorStop(1, '#c9b18b');
    g.fillStyle = gr; g.fillRect(-26, 0, 52, 26);
    const rnd = api.rand('teeth-bone');
    for (let i = 0; i < 1500; i++) {
      const x = -26 + rnd() * 52, y = 0.4 + rnd() * 25.6, depth = clamp((y - 0.8) / 4);
      const r = (0.12 + rnd() * 0.42) * (0.45 + depth * 0.7), a = rnd() * Math.PI;
      g.save(); g.translate(x, y); g.rotate(a); g.scale(1, 0.45 + rnd() * 0.5);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
      rg.addColorStop(0, `rgba(176,110,92,${0.5 * depth + 0.12})`); rg.addColorStop(0.75, `rgba(150,112,82,${0.35 * depth + 0.1})`); rg.addColorStop(1, 'rgba(150,112,82,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
    }
    // light trabecular struts
    g.strokeStyle = 'rgba(255,248,230,0.35)'; g.lineWidth = 0.07; g.lineCap = 'round';
    for (let i = 0; i < 420; i++) {
      const x = -26 + rnd() * 52, y = 1 + rnd() * 25, a = rnd() * Math.PI, l = 0.3 + rnd() * 0.8;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rnd() - 0.5) * 0.3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    SEC.boneTex = c; SEC.TPX = TPX;
    // gum stipple texture (orange-peel dots), same mm frame, rows y[-8, 8]
    const [c2, g2] = mk(52 * TPX, 16 * TPX); g2.scale(TPX, TPX); g2.translate(26, 8);
    for (let i = 0; i < 2600; i++) {
      const x = -26 + rnd() * 52, y = -8 + rnd() * 16, r = 0.05 + rnd() * 0.08;
      g2.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(120,20,50,0.10)'; g2.beginPath(); g2.arc(x, y, r, 0, TAU); g2.fill();
    }
    SEC.gumTex = c2;
    // soft lavender glow silhouette behind the teeth (screen-independent, mm frame at 16 px/mm)
    const GP = 16, [c3, g3] = mk(56 * GP, 30 * GP); g3.translate(28 * GP, 10 * GP); g3.scale(GP, GP);
    g3.filter = `blur(${0.9 * GP}px)`; g3.fillStyle = '#9d86ff';
    for (const T of SEC.teeth) { path(g3, T.outline); g3.fill(); }
    SEC.glow = c3; SEC.GP = GP;
  }

  // ---------------------------------------------------------------- section state -> paths
  function crest(x, st) {
    const D = [0.55, 1.0, 0.55];
    let y = SEC.crest0;
    for (let k = 0; k < 3; k++) y += (st.drop || 0) * 2.4 * D[k] * (1 - sstep(0.9, 2.4, Math.abs(x - SEC.emb[k])));
    return y;
  }
  function papillaTop(k, st) {
    const main = k === 1 ? 1 : 0.6;
    return -3.55 - 0.5 * (st.swell || 0) * main + 1.15 * (st.drop || 0) * main;
  }
  function gumPts(st) {
    const pts = [[-27, -0.9]];
    for (let k = 0; k < 3; k++) {
      const e = SEC.emb[k], py = papillaTop(k, st), sw = (st.swell || 0) * (k === 1 ? 1 : 0.6), sh = 0.95 * (1 - 0.55 * sw);
      pts.push([e - 2.4, -0.9], [e - 1.05, py + sh + 0.2], [e - 0.5, py + 0.22 * (1 - sw)], [e, py], [e + 0.5, py + 0.22 * (1 - sw)], [e + 1.05, py + sh + 0.2], [e + 2.4, -0.9]);
    }
    pts.push([27, -0.9]);
    return crp(pts, false, 8);
  }
  function drawSection(ctx, st = {}) {
    const red = st.red || 0, sw = st.swell || 0;
    // glow
    ctx.save(); ctx.globalAlpha = 0.28; ctx.drawImage(SEC.glow, -28, -10, 56, 30); ctx.restore();
    // --- gum (sits on the bone; the bone is drawn over its lower part)
    const top = gumPts(st), gum = [...top, [27, 14], [-27, 14]];
    const g1 = ctx.createLinearGradient(0, -4.2, 0, 3);
    g1.addColorStop(0, rgba(mix('#ffb0c0', '#ff6a78', red))); g1.addColorStop(0.3, rgba(mix(P.gum, P.gumRed, red)));
    g1.addColorStop(1, rgba(mix('#c65d78', '#a3203a', red)));
    path(ctx, gum); ctx.fillStyle = g1; ctx.fill();
    ctx.save(); path(ctx, gum); ctx.clip(); ctx.globalAlpha = 1 - 0.8 * sw; ctx.drawImage(SEC.gumTex, -26, -8, 52, 16); ctx.restore();
    // inflamed: hot, glossy surface (red rim just under the epithelium) + warning pulse
    const hot = red * (0.8 + 0.2 * Math.sin((st.t || 0) * 5.5)) + (st.pulse || 0);
    if (hot > 0.01) {
      ctx.save(); path(ctx, gum); ctx.clip();
      ctx.globalAlpha = clamp(0.55 * hot); ctx.strokeStyle = '#ff1f4a'; ctx.lineWidth = 1.1; path(ctx, top, false); ctx.stroke();
      if (st.pulse) { ctx.globalAlpha = clamp(st.pulse * 0.55); ctx.fillStyle = '#ff2d55'; path(ctx, gum); ctx.fill(); }
      ctx.restore();
    }
    // epithelium surface line
    ctx.save(); path(ctx, top, false); ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(mix('#ffd0da', '#ffc0c8', red), 0.85); ctx.lineWidth = 0.1; ctx.stroke();
    if (sw > 0.01) { ctx.translate(0.05, 0.12); path(ctx, top, false); ctx.strokeStyle = `rgba(255,255,255,${0.45 * sw})`; ctx.lineWidth = 0.08; ctx.stroke(); }
    ctx.restore();
    // --- bone
    const bone = [];
    for (let x = -27; x <= 27.001; x += 0.2) bone.push([x, crest(x, st)]);
    const bonePoly = [...bone, [27, 34], [-27, 34]];
    ctx.save(); path(ctx, bonePoly); ctx.clip();
    ctx.drawImage(SEC.boneTex, -26, 0, 52, 26);
    // lamina dura + periodontal ligament around every root
    for (const T of SEC.teeth) {
      path(ctx, T.outline); ctx.lineJoin = 'round';
      ctx.strokeStyle = '#f6ecd4'; ctx.lineWidth = 0.78; ctx.stroke();
      ctx.strokeStyle = 'rgba(112,58,58,0.8)'; ctx.lineWidth = 0.34; ctx.stroke();
    }
    ctx.restore();
    // cortical crest
    ctx.save(); path(ctx, bone, false); ctx.lineJoin = 'round';
    ctx.strokeStyle = '#f7eedb'; ctx.lineWidth = 0.34; ctx.stroke();
    ctx.translate(0, -0.18); path(ctx, bone, false); ctx.strokeStyle = 'rgba(120,70,60,0.45)'; ctx.lineWidth = 0.07; ctx.stroke();
    ctx.restore();
    // --- sulcus / pocket: a dark gap between gum and tooth under the papilla (clipped to the gum)
    ctx.save(); path(ctx, gum); ctx.clip();
    for (let k = 0; k < 3; k++) {
      const e = SEC.emb[k], main = k === 1 ? 1 : 0.55, py = papillaTop(k, st);
      const depth = lerp(py + 1.6, crest(e, st) - 0.75, clamp((st.pocket || 0) * main * 1.1));
      const w = 0.16 + 0.4 * (st.pocket || 0) * main;
      ctx.save(); ctx.beginPath(); ctx.rect(e - 2.5, py - 0.5, 5, depth - py + 0.5); ctx.clip();
      for (const T of SEC.teeth) {
        path(ctx, T.outline); ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(70,14,32,0.92)'; ctx.lineWidth = w; ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    // --- teeth
    for (const T of SEC.teeth) drawSecTooth(ctx, T, st);
    // inflamed papilla glow (sits over the tooth surfaces a little, like heat)
    if (hot > 0.01) {
      for (let k = 0; k < 3; k++) {
        const e = SEC.emb[k], py = papillaTop(k, st), m = k === 1 ? 1 : 0.6;
        const g = ctx.createRadialGradient(e, py + 1.2, 0, e, py + 1.2, 2.6);
        g.addColorStop(0, `rgba(255,40,80,${0.32 * clamp(hot) * m})`); g.addColorStop(1, 'rgba(255,40,80,0)');
        ctx.fillStyle = g; ctx.fillRect(e - 3, py - 2, 6, 6);
      }
    }
    // dim the far neighbours (focus on the molar pair; their papillae stay readable)
    if (st.dim !== 0) {
      const d = st.dim ?? 1;
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? -11.6 : 11.0, x1 = s < 0 ? -20.5 : 20.2;
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, 'rgba(11,10,24,0)'); g.addColorStop(0.55, `rgba(11,10,24,${0.7 * d})`); g.addColorStop(1, `rgba(11,10,24,${d})`);
        ctx.fillStyle = g;
        if (s < 0) ctx.fillRect(-40, -16, 40 + x0, 56); else ctx.fillRect(x0, -16, 40, 56);
      }
    }
    // fade the bone into the stage at the bottom
    const gb = ctx.createLinearGradient(0, 12.5, 0, 18.5); gb.addColorStop(0, 'rgba(11,10,24,0)'); gb.addColorStop(1, 'rgba(11,10,24,1)');
    ctx.fillStyle = gb; ctx.fillRect(-30, 12.5, 60, 30);
  }
  function drawSecTooth(ctx, T, st) {
    ctx.save(); ctx.lineJoin = 'round';
    // dentin
    const gd = ctx.createLinearGradient(0, -6, 0, 14); gd.addColorStop(0, '#fbe7bd'); gd.addColorStop(0.35, '#f4d59c'); gd.addColorStop(1, '#dcae6c');
    path(ctx, T.outline); ctx.fillStyle = gd; ctx.fill();
    // enamel cap = inside the outline, above the DEJ
    ctx.save(); path(ctx, T.outline); ctx.clip();
    const cap = [...T.dej, [T.dx + 9, T.dej[T.dej.length - 1][1]], [T.dx + 9, -12], [T.dx - 9, -12], [T.dx - 9, T.dej[0][1]]];
    const ge = ctx.createLinearGradient(T.dx - 3, -8, T.dx + 3, 0);
    ge.addColorStop(0, '#ffffff'); ge.addColorStop(0.45, '#f5f3ee'); ge.addColorStop(1, '#dcd8cc');
    path(ctx, cap); ctx.fillStyle = ge; ctx.fill();
    // dentinal tubules: faint S-curves from the pulp toward the enamel (only on the hero pair)
    if (!T.side && T.tubules) {
      ctx.strokeStyle = 'rgba(190,140,70,0.16)'; ctx.lineWidth = 0.035;
      for (const tb of T.tubules) { ctx.beginPath(); ctx.moveTo(tb[0], tb[1]); ctx.quadraticCurveTo(tb[2], tb[3], tb[4], tb[5]); ctx.stroke(); }
    }
    // enamel translucency toward the DEJ (bluish-grey inner band)
    path(ctx, T.dej, false); ctx.strokeStyle = 'rgba(160,175,200,0.3)'; ctx.lineWidth = 0.26; ctx.stroke();
    path(ctx, T.dej, false); ctx.strokeStyle = 'rgba(176,150,100,0.55)'; ctx.lineWidth = 0.06; ctx.stroke();
    // enamel prism sheen: soft diagonal bands
    ctx.save(); path(ctx, cap); ctx.clip();
    const gs = ctx.createLinearGradient(T.dx - 6, -8, T.dx + 4, -2);
    gs.addColorStop(0, 'rgba(255,255,255,0)'); gs.addColorStop(0.28, 'rgba(255,255,255,0.55)'); gs.addColorStop(0.36, 'rgba(255,255,255,0)');
    gs.addColorStop(0.62, 'rgba(200,215,255,0)'); gs.addColorStop(0.7, 'rgba(200,215,255,0.25)'); gs.addColorStop(0.8, 'rgba(200,215,255,0)');
    ctx.fillStyle = gs; ctx.fillRect(T.dx - 8, -10, 16, 11);
    ctx.restore();
    // rim light along the occlusal outline (light from upper left)
    const gr = ctx.createLinearGradient(T.dx - 5, -7, T.dx + 5, -3);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(210,225,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    path(ctx, T.crownOpen, false); ctx.strokeStyle = gr; ctx.lineWidth = 0.5; ctx.stroke();
    // cool reflected light on the right flank
    path(ctx, T.outline); ctx.strokeStyle = 'rgba(150,130,255,0.28)'; ctx.lineWidth = 0.35;
    ctx.save(); ctx.beginPath(); ctx.rect(T.dx + 1.5 * T.sc, -9, 8, 24); ctx.clip(); path(ctx, T.outline); ctx.stroke(); ctx.restore();
    ctx.restore();
    // gloss on the mesial cusp slope
    ctx.save(); ctx.translate(T.dx - 3.3 * T.sc, -6.55 * T.sc); ctx.rotate(-0.42); ctx.scale(1, 0.33);
    const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.1); gg.addColorStop(0, 'rgba(255,255,255,0.85)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 1.1, 0, TAU); ctx.fill(); ctx.restore();
    // pulp
    const gp = ctx.createLinearGradient(0, -3.5, 0, 13); gp.addColorStop(0, '#f08ea4'); gp.addColorStop(0.3, '#d9667f'); gp.addColorStop(1, '#a93f5e');
    path(ctx, T.pulp); ctx.fillStyle = gp; ctx.fill(); ctx.strokeStyle = 'rgba(140,40,62,0.55)'; ctx.lineWidth = 0.06; ctx.stroke();
    // outline
    path(ctx, T.outline); ctx.strokeStyle = 'rgba(64,40,40,0.6)'; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.restore();
  }
  // where a tooth's surface is at height y (side: 'm' mesial/left, 'd' distal/right)
  function surf(name, y, side) {
    const T = SEC.teeth.find((q) => q.name === name);
    // only consider points near the requested side
    const pts = T.outline.filter((p) => (side === 'm' ? p[0] < T.dx : p[0] > T.dx));
    let best = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if ((a[1] - y) * (b[1] - y) > 0 || a[1] === b[1] || Math.abs(a[0] - b[0]) > 2) continue;
      const x = lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1]));
      if (best == null || (side === 'm' ? x < best : x > best)) best = x;
    }
    return best;
  }

  // ================================================================= little props =================================
  // irregular food crumb (units: whatever the ctx is in); kind: 'meat' | 'bread' | 'leaf' | 'gunk'
  const FOOD = {
    meat: ['#c98b5c', '#8a4f2c', '#f0c39a'], bread: ['#e8c07e', '#b98845', '#fff0c8'], leaf: ['#6cc36a', '#2f7a3a', '#c6f5b0'],
    gunk: ['#efe6c2', '#c9b98a', '#ffffff'], brown: ['#a86a44', '#6b3a22', '#e0a77a'],
  };
  function crumb(ctx, x, y, r, seed, kind = 'meat', o = {}) {
    const rnd = api.rand('crumb' + seed), C = FOOD[kind] || FOOD.meat, n = 9, pts = [];
    const sx = o.sx || 1, sy = o.sy || 1;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd() * 0.3, rr = r * (0.72 + rnd() * 0.45); pts.push([Math.cos(a) * rr * sx, Math.sin(a) * rr * sy]); }
    const poly = crp(pts, true, 6);
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r * 1.2); g.addColorStop(0, C[2]); g.addColorStop(0.45, C[0]); g.addColorStop(1, C[1]);
    path(ctx, poly); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = r * 0.07; ctx.strokeStyle = rgba(C[1], 0.7); ctx.stroke();
    if (kind === 'meat' || kind === 'brown') { // fibres
      ctx.save(); path(ctx, poly); ctx.clip(); ctx.strokeStyle = rgba(C[1], 0.5); ctx.lineWidth = r * 0.06;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-r, i * r * 0.3 - r * 0.2); ctx.quadraticCurveTo(0, i * r * 0.3 + r * 0.15, r, i * r * 0.3 - r * 0.1); ctx.stroke(); }
      ctx.restore();
    }
    if (kind === 'leaf') { ctx.strokeStyle = rgba(C[1], 0.8); ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.1); ctx.quadraticCurveTo(0, -r * 0.2, r * 0.7, 0); ctx.stroke(); }
    ctx.restore();
  }
  // bacteria (screen or mm units): kind 'bad' (green rod), 'bad2' (lime-green rod), 'good' (teal, matches micro group), 'cocc'
  const BUG = {
    bad: { color: '#46d58a', light: '#d4ffe2', dark: '#146b44', flag: 'rgba(200,255,215,0.6)', rod: true },
    bad2: { color: '#9bdc3c', light: '#f0ffc4', dark: '#3f7417', flag: 'rgba(225,255,190,0.55)', rod: true },
    good: { color: '#35c3c9', light: '#d8fcff', dark: '#0f5e70', flag: 'rgba(200,250,255,0.5)', rod: false },
    cocc: { color: '#3fc47e', light: '#d9ffe6', dark: '#12603c', flag: null, rod: false },
  };
  function bug(ctx, x, y, s, phase, o = {}) {
    const K = BUG[o.kind || 'bad'];
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    let color = K.color, light = K.light, dark = K.dark;
    if (o.dead) { const d = clamp(o.dead); color = rgba(mix(K.color, '#8b8a94', d)); light = rgba(mix(K.light, '#c9c8d0', d)); dark = rgba(mix(K.dark, '#3c3b44', d)); }
    if (o.glow) { ctx.save(); ctx.translate(x, y); const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.6); gg.addColorStop(0, rgba(o.glow, 0.45)); gg.addColorStop(1, rgba(o.glow, 0)); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, TAU); ctx.fill(); ctx.restore(); }
    if (K.rod || o.rod) {
      api.icons.bacterium(ctx, x, y, s, phase, { rot: o.rot || 0, rod: true, color, light, dark, flagella: K.flag || 'rgba(255,255,255,0.3)' });
    } else {
      // round coccus with a soft sheen (good bacteria get a little tail)
      ctx.translate(x, y); ctx.rotate(o.rot || 0);
      const r = s * 0.42, sq = 1 + 0.06 * Math.sin(phase * 6);
      if (K.flag) { ctx.strokeStyle = K.flag; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-r, 0); for (let i = 1; i <= 10; i++) ctx.lineTo(-r - i * s * 0.07, Math.sin(phase * 7 + i * 0.9) * s * 0.07); ctx.stroke(); }
      ctx.scale(sq, 1 / sq);
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r); g.addColorStop(0, light); g.addColorStop(0.55, color); g.addColorStop(1, dark);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.globalAlpha *= 0.45; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.4, r * 0.32, r * 0.16, -0.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // chain of cocci (streptococci), n beads along a gentle curve
  function chain(ctx, x, y, s, n, phase, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    for (let i = 0; i < n; i++) {
      const u = i - (n - 1) / 2, bx = u * s * 0.72, by = Math.sin(phase * 2 + i * 0.9) * s * 0.12;
      bug(ctx, bx, by, s, phase + i, { kind: o.kind || 'cocc', dead: o.dead, alpha: o.alpha });
    }
    ctx.restore();
  }
  // translucent smell puff at the local origin (stable shape; move it with translate)
  function puff(ctx, x, y, s, a, color, seed = 1) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= a; const rnd = api.rand('puff' + seed);
    for (let i = 0; i < 6; i++) {
      const r = s * (0.35 + rnd() * 0.4), ox = (rnd() - 0.5) * s, oy = (rnd() - 0.5) * s * 0.6;
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // a warning triangle icon (rounded), centred at x, y, size s (height)
  function warnTri(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); const h = s, w = s * 1.12, r = s * 0.12;
    const pts = [[0, -h * 0.55], [w / 2, h * 0.45], [-w / 2, h * 0.45]];
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = pts[i], b = pts[(i + 1) % 3], c = pts[(i + 2) % 3];
      const m1 = [lerp(c[0], a[0], 0.5), lerp(c[1], a[1], 0.5)];
      if (i === 0) ctx.moveTo(m1[0], m1[1]);
      ctx.arcTo(a[0], a[1], b[0], b[1], r);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, o.c1 || '#ffe066'); g.addColorStop(1, o.c2 || '#ffb020');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = s * 0.05; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();
    ctx.fillStyle = '#1a1206';
    api.roundRect(ctx, -s * 0.055, -h * 0.22, s * 0.11, h * 0.4, s * 0.05); ctx.fill();
    ctx.beginPath(); ctx.arc(0, h * 0.3, s * 0.07, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // chip with custom colours (red "bad" chip: white on marker red)
  function chip(ctx, str, x, y, o = {}) {
    return api.label(ctx, str, x, y, { size: o.size || 44, align: o.align || 'center', p: o.p, bg: o.bg, color: o.color, rotate: o.rotate });
  }
  // a small white caps label with a leader line from (px,py) to (lx,ly); p = progress
  function tag(ctx, str, px, py, lx, ly, p, o = {}) {
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp(p * 1.5) * (o.alpha ?? 1);
    api.leader(ctx, px, py, lx, ly, clamp(p * 1.4), { color: o.color || P.ink, width: o.width || 3, dot: 7 });
    const a = o.align || (lx < px ? 'right' : 'left'), off = a === 'right' ? -14 : a === 'left' ? 14 : 0;
    api.text(ctx, str, lx + off, ly + (o.size || 40) * 0.36, { size: o.size || 40, weight: 700, color: o.color || P.ink, align: a, tracking: 1.5, alpha: clamp((p - 0.3) * 2), stroke: 'rgba(11,10,24,0.75)', strokeWidth: 8 });
    ctx.restore();
  }

  // ================================================================= the gum-disease story (between-teeth + warning-sign)
  // T = seconds in the between-teeth scene (word r happens at r + 0.15). warning-sign calls it with T = 19.62 + t.
  const SX = 42, OX0 = 960, OY0 = 400;               // section: 42 px per mm, contact/CEJ at design (960, 400)
  const STORY_KEYS = [[0, 0.86, 960, 520], [3.3, 0.9, 960, 505], [5.2, 1.45, 960, 300], [9.9, 1.5, 962, 302], [11.2, 1.42, 960, 345],
    [14.6, 1.4, 960, 340], [19.62, 1.34, 960, 318], [21, 1.33, 960, 315]];
  let STORY = null;
  function storyBugs() {
    if (STORY) return STORY;
    const rnd = api.rand('story-bugs'), bugs = [];
    const homes = [];
    for (let i = 0; i < 9; i++) { const a = -Math.PI + (i + 0.5) * (Math.PI / 9); homes.push([Math.cos(a) * 1.45, -6.35 + Math.sin(a) * 1.05]); }
    homes.push([0.02, -4.5], [-0.04, -4.05], [0.05, -3.75]);
    const late = [[-1.25, -6.9], [1.3, -7.0], [-0.55, -7.65], [0.6, -7.7], [-1.9, -7.25], [2.0, -7.35], [0.0, -8.05], [-1.0, -7.8], [1.05, -7.85],
      [-0.1, -5.2], [0.08, -5.55], [0.0, -4.25]];
    homes.push(...late);
    for (let i = 0; i < homes.length; i++) {
      const late = i >= 12;
      bugs.push({
        home: homes[i], ta: late ? 7.1 + (i - 12) * 0.16 + rnd() * 0.1 : 5.95 + i * 0.05 + rnd() * 0.08,
        from: [6 + rnd() * 5, -16 - rnd() * 4], kind: rnd() < 0.3 ? 'bad2' : rnd() < 0.25 ? 'cocc' : 'bad', rot: (rnd() - 0.5) * 2.4, s: 0.38 + rnd() * 0.1,
        seed: rnd() * 100,
        pocket: i % 3 === 0 || i === 9 || i === 10 || i === 11, side: rnd() < 0.5 ? 'd' : 'm', py: -2.0 + rnd() * 4.6, pt: 12.0 + rnd() * 1.3,
      });
    }
    STORY = { bugs };
    return STORY;
  }
  function gumStory(ctx, T, o = {}) {
    const { ease, prog } = api;
    const k = (a, d, e = ease.inOutCubic) => prog(T, a, d, e);
    const st = { t: T, red: k(10.35, 1.2), swell: k(10.45, 1.3), drop: k(11.6, 1.5), pocket: k(11.7, 1.7), dim: 1 };
    if (o.pulse) st.pulse = o.pulse;
    const c = cam(T, o.keys || STORY_KEYS);
    const toS = (x, y) => toScreen(c, OX0 + x * SX, OY0 + y * SX);
    const S = storyBugs(), nz = api.noise('story-wiggle');

    ctx.save(); camApply(ctx, c); ctx.translate(OX0, OY0); ctx.scale(SX, SX);
    drawSection(ctx, st);

    // plaque film on the proximal surfaces around the contact
    const plq = k(6.3, 3.4, ease.outCubic);
    if (plq > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(-1.6, -8.2, 3.2, papillaTop(1, st) - 0.02 + 8.2); ctx.clip();
      for (const Tn of SEC.teeth.slice(1, 3)) { path(ctx, Tn.outline); ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(236,226,168,${0.62 * plq})`; ctx.lineWidth = 0.15 + 0.55 * plq; ctx.stroke(); }
      ctx.restore();
    }
    // food: a fibrous chunk falls into the embrasure, a strand wedges under the contact
    const fall = k(4.35, 0.55, ease.inQuad), land = prog(T, 4.9, 0.4, ease.outBack);
    if (T > 4.3) {
      const shrink = 1 - 0.32 * k(6.8, 2.6), fy = lerp(-15, -6.25, fall) + (fall >= 1 ? -0.12 * Math.sin(clamp((T - 4.9) / 0.35) * Math.PI) : 0);
      const sq = fall >= 1 ? 1 + 0.18 * Math.sin(clamp((T - 4.9) / 0.35) * Math.PI) : 1;
      // wedged strand (appears on "stuck")
      const wedge = k(5.0, 0.45, ease.outCubic);
      if (wedge > 0) {
        ctx.save(); ctx.lineCap = 'round';
        const y1 = lerp(-5.6, papillaTop(1, st) - 0.25, wedge);
        ctx.strokeStyle = '#8a4f2c'; ctx.lineWidth = 0.42 * shrink; ctx.beginPath(); ctx.moveTo(0.02, -5.7); ctx.quadraticCurveTo(-0.08, (y1 - 5.7) / 2, 0.03, y1); ctx.stroke();
        ctx.strokeStyle = '#d19a6a'; ctx.lineWidth = 0.2 * shrink; ctx.stroke();
        ctx.restore();
      }
      crumb(ctx, 0.04, fy, 0.95 * shrink, 'chunk', 'meat', { sx: 1.25 / sq, sy: 0.9 * sq, rot: -0.1 + fall * 0.25 });
      crumb(ctx, -0.55, fy - 0.35, 0.36 * shrink, 'chunk2', 'bread', { rot: 0.4, alpha: land });
      // bits breaking off while bacteria digest it
      const brk = k(6.8, 1.6, ease.linear);
      for (let i = 0; i < 7 && brk > 0; i++) {
        const u = clamp(brk * 1.4 - i * 0.1); if (u <= 0 || u >= 1) continue;
        const a = -2.6 + i * 0.75;
        crumb(ctx, Math.cos(a) * (0.8 + u * 1.6), -6.3 + Math.sin(a) * (0.6 + u * 1.2) + u * 0.8, 0.13 * (1 - u * 0.5), 'bit' + i, 'meat', { alpha: 1 - u });
      }
    }
    // bacteria: swim in, gather, multiply, then move down into the pocket
    for (let i = 0; i < S.bugs.length; i++) {
      const b = S.bugs[i], a = clamp((T - b.ta) / 0.9);
      if (a <= 0) continue;
      const e = ease.outCubic(a);
      let x = lerp(b.from[0], b.home[0], e) + nz(T * 0.6 + b.seed, 1) * 0.18, y = lerp(b.from[1], b.home[1], e) + nz(T * 0.6 + b.seed, 5) * 0.14;
      let rot = b.rot + nz(T * 0.8 + b.seed, 9) * 0.4, s = b.s;
      if (b.pocket) {
        const pp = clamp((T - b.pt) / 1.4), pe = ease.inOutCubic(pp);
        if (pp > 0) {
          const py = lerp(papillaTop(1, st) + 0.2, b.py, 1) , yy = Math.min(py, crest(0, st) - 0.9);
          const sx = b.side === 'd' ? (surf('M1', yy, 'd') ?? 0) + 0.12 : (surf('M2', yy, 'm') ?? 0) - 0.12;
          x = lerp(x, sx, pe); y = lerp(y, yy, pe); rot = lerp(rot, Math.PI / 2 + nz(T + b.seed, 3) * 0.3, pe); s = lerp(s, 0.36, pe);
        }
      }
      const glow = o.glowBugs ? o.glowBugs(b) : null;
      bug(ctx, x, y, s, T * 1.3 + b.seed, { kind: b.kind, rot, alpha: clamp(a * 3), glow });
    }
    // bone loss marker: dashed line at the old crest level
    const bl = k(11.75, 0.6, ease.outCubic) * (1 - k(19.7, 0.3));
    if (bl > 0) {
      ctx.save(); ctx.globalAlpha = bl; ctx.setLineDash([0.28, 0.2]); ctx.lineDashOffset = -T * 0.4;
      ctx.strokeStyle = '#ff4d5a'; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(-1.9, SEC.crest0); ctx.lineTo(1.9, SEC.crest0); ctx.stroke();
      ctx.setLineDash([]);
      const cy = crest(0, st);
      ctx.strokeStyle = '#ff4d5a'; ctx.lineWidth = 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(0, SEC.crest0 + 0.2); ctx.lineTo(0, cy - 0.25); ctx.moveTo(-0.3, cy - 0.55); ctx.lineTo(0, cy - 0.22); ctx.lineTo(0.3, cy - 0.55); ctx.stroke();
      ctx.restore();
    }
    // sulfur: puffs and H2S rising from the pocket
    const sf0 = o.sulfurFrom ?? 17.2;
    if (T > sf0 - 0.2) {
      const ptop = papillaTop(1, st);
      // tiny gas bubbles climbing out of the pocket
      for (let i = 0; i < 10; i++) {
        const t0 = sf0 - 0.3 + i * 0.22, u = (T - t0) / 1.1; if (u <= 0 || u >= 1) continue;
        const yy = lerp(crest(0, st) - 1.0, -5.0, u), xx = (i % 2 ? 0.12 : -0.12) + Math.sin(u * 9 + i) * 0.08;
        ctx.fillStyle = 'rgba(233,226,74,' + (Math.sin(u * Math.PI) * 0.9).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(xx, yy, 0.13, 0, TAU); ctx.fill();
      }
      // puffs rise out of the gap between the crowns into the air above
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 16; i++) {
        const t0 = sf0 + i * 0.28, u = (T - t0) / 2.8;
        if (u <= 0 || u >= 1) continue;
        const e = 1 - Math.pow(1 - u, 1.6);
        const px = nz(i * 3.1 + u * 1.5, 2) * 1.8 + (i % 3 - 1) * 1.1 * e, py = -6.8 - e * 7.2;
        puff(ctx, px, py, 0.8 + e * 2.6, Math.sin(Math.min(1, u * 1.4) * Math.PI) * 0.75, '#c9f06a', 'sp' + i);
      }
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        const t0 = sf0 + 0.15 + i * 0.5, u = (T - t0) / 2.6;
        if (u <= 0 || u >= 1) continue;
        ctx.save(); ctx.globalAlpha = Math.sin(u * Math.PI) * 0.95;
        api.icons.h2s(ctx, (i % 2 ? 1 : -1) * (0.9 + i * 0.4) + nz(i + u, 4) * 0.5, -7.6 - u * 5.5, 0.5, T * 0.9 + i);
        ctx.restore();
      }
    }
    ctx.restore();

    // ---------------------------------------------------------------- screen-space labels
    const lo = o.labelsOut ?? 99, out = 1 - prog(T, lo, 0.3, ease.inCubic);
    // anatomy tags (the "other spots" opener)
    const an = (a) => prog(T, a, 0.5) * (1 - prog(T, 3.05, 0.35, ease.inCubic));
    { const [px, py] = toS(-7.2, -4.5); tag(ctx, 'TOOTH', px, py, 430, 112, an(0.45), { size: 44 }); }
    { const [px, py] = toS(10.2, -2.3); tag(ctx, 'GUM', px, py, 1560, 112, an(0.85), { size: 44 }); }
    { const [px, py] = toS(-5.3, 8.0); tag(ctx, 'BONE', px, py, 330, 830, an(1.25), { size: 44 }); }
    // "between your teeth"
    const bt = api.pop(T, 3.47, 0.5) * (1 - prog(T, 5.9, 0.3, ease.inCubic));
    if (bt > 0) {
      chip(ctx, 'BETWEEN YOUR TEETH', 560, 116, { size: 52, p: bt });
      const [ex, ey] = toS(-0.1, -6.9);
      api.doodle.arrow(ctx, 850, 112, ex - 6, ey - 8, prog(T, 3.75, 0.55, ease.inOutCubic), { color: P.lime, width: 9, bend: -60, seed: 3, alpha: Math.min(1, bt) });
    }
    // food / bacteria chips with leaders
    const fo = api.pop(T, 4.75, 0.45) * (1 - prog(T, 9.6, 0.35, ease.inCubic));
    if (fo > 0) { const fy = lerp(-15, -6.25, k(4.35, 0.55, ease.inQuad)); const [px, py] = toS(0.3, fy - 0.2); api.leader(ctx, px, py, 1290, 116, clamp(fo), { color: P.ink, width: 3 }); chip(ctx, 'FOOD', 1290, 116, { size: 46, p: fo, align: 'left' }); }
    const ba = api.pop(T, 6.25, 0.45) * (1 - prog(T, 9.6, 0.35, ease.inCubic));
    if (ba > 0) { const [px, py] = toS(1.35, -7.05); api.leader(ctx, px, py, 1440, 210, clamp(ba), { color: '#9ff0bf', width: 3 }); chip(ctx, 'BACTERIA', 1440, 210, { size: 46, p: ba, bg: '#46d58a', align: 'left' }); }
    // yada yada yada (fast-forward doodle, top left)
    const yd = prog(T, 8.3, 0.9, ease.linear) * (1 - prog(T, 9.9, 0.3, ease.inCubic));
    if (yd > 0) {
      ctx.save(); ctx.globalAlpha *= Math.min(1, yd * 4);
      const x0 = 150, y0 = 130;
      for (let q = 0; q < 2; q++) api.doodle.stroke(ctx, [[x0 + q * 40, y0 - 30], [x0 + q * 40 + 34, y0], [x0 + q * 40, y0 + 30]], clamp(yd * 3 - q * 0.3), { color: P.ink, width: 7, seed: 20 + q });
      api.doodle.text(ctx, 'yada yada yada', x0 + 110, y0 + 16, clamp((yd - 0.1) * 1.5), { color: P.ink, size: 52, stroke: 'rgba(11,10,24,0.7)', strokeWidth: 8 });
      ctx.restore();
    }
    // inflamed / bone loss / gum disease / sulfur
    const inf = api.pop(T, 11.2, 0.5) * out;
    if (inf > 0) { const [px, py] = toS(-0.3, papillaTop(1, st) + 0.5); api.leader(ctx, px, py, 600, 420, clamp(inf), { color: '#ff8a93', width: 3 }); chip(ctx, 'INFLAMED', 600, 420, { size: 48, p: inf, bg: P.marker, color: '#ffffff', align: 'right' }); }
    const th = prog(T, 10.9, 0.5) * out;
    if (th > 0) {
      const [px, py] = toS(0, papillaTop(1, st) + 1.1), beat = 0.5 + 0.5 * Math.sin(T * 7.5);
      for (const sd of [-1, 1]) for (let q = 0; q < 3; q++) {
        const r0 = 70 + q * 26 + beat * 8, a0 = (q - 1) * 0.42;
        const pts = []; for (let u = 0; u <= 8; u++) { const a = a0 - 0.2 + (u / 8) * 0.4; pts.push([px + sd * Math.cos(a) * r0, py + Math.sin(a) * r0 * 0.9]); }
        api.doodle.stroke(ctx, pts, clamp(th * 1.6 - q * 0.2), { color: P.marker, width: 6, seed: 40 + q + (sd > 0 ? 9 : 0), alpha: 0.65 + 0.35 * beat });
      }
    }
    const bn = api.pop(T, 11.73, 0.5) * out;
    if (bn > 0) { const [px, py] = toS(-0.5, crest(0, st) + 0.15); api.leader(ctx, px, py, 600, 850, clamp(bn), { color: '#ff8a93', width: 3 }); chip(ctx, 'BONE LOSS', 600, 850, { size: 48, p: bn, bg: P.marker, color: '#ffffff', align: 'right' }); }
    const gd = api.pop(T, 12.43, 0.55) * out;
    if (gd > 0) chip(ctx, 'GUM DISEASE', 1470, 116, { size: 72, p: gd });
    const ss = api.pop(T, 17.99, 0.5) * out;
    if (ss > 0) chip(ctx, 'SAME SULFUR SMELL', 470, 150, { size: 50, p: ss, bg: P.gas, rotate: -0.03 });
    return { cam: c, toS, st };
  }

  // ================================================================= FRONT: both arches in occlusion ================
  // Arch form: the tangent heading theta(s) (from the transverse axis) grows with arch length s from the midline,
  // theta = 72deg * (1 - exp(-(s/L)^1.6)); X = int cos, Z = int sin. Upper L = 15 (canine tip ~16.6 mm from the
  // midline, ~9 mm back), lower L = 12.5 and 2.4 mm further back (overjet). Perspective: f = D / (D + Z), D = 110.
  // Tooth outlines are (u, v): u -0.5 mesial .. 0.5 distal (mapped along the arch), v 0 at the tip .. 1 at the gum.
  const OUT = {
    uci: [[-0.42, 1.3], [-0.43, 1.0], [-0.47, 0.72], [-0.5, 0.42], [-0.5, 0.16], [-0.47, 0.03], [-0.38, 0.0], [-0.1, -0.01], [0.2, 0.0], [0.36, 0.02], [0.45, 0.08], [0.49, 0.2], [0.5, 0.45], [0.47, 0.75], [0.42, 1.0], [0.41, 1.3]],
    uli: [[-0.41, 1.3], [-0.42, 1.0], [-0.47, 0.7], [-0.5, 0.4], [-0.49, 0.17], [-0.43, 0.05], [-0.3, 0.0], [0.0, -0.01], [0.25, 0.02], [0.4, 0.08], [0.48, 0.2], [0.5, 0.45], [0.46, 0.75], [0.4, 1.0], [0.39, 1.3]],
    uc: [[-0.38, 1.3], [-0.4, 1.0], [-0.47, 0.7], [-0.5, 0.42], [-0.47, 0.26], [-0.3, 0.12], [-0.05, 0.0], [0.2, 0.1], [0.42, 0.26], [0.5, 0.42], [0.47, 0.72], [0.4, 1.0], [0.38, 1.3]],
    upm: [[-0.36, 1.3], [-0.39, 1.0], [-0.47, 0.7], [-0.5, 0.42], [-0.44, 0.24], [-0.22, 0.08], [0.04, 0.0], [0.28, 0.08], [0.46, 0.24], [0.5, 0.42], [0.46, 0.72], [0.38, 1.0], [0.36, 1.3]],
    um: [[-0.4, 1.3], [-0.43, 1.0], [-0.49, 0.62], [-0.48, 0.24], [-0.36, 0.06], [-0.2, 0.0], [0.0, 0.1], [0.22, 0.02], [0.4, 0.08], [0.49, 0.3], [0.48, 0.68], [0.42, 1.0], [0.4, 1.3]],
    lci: [[-0.36, 1.3], [-0.37, 1.0], [-0.44, 0.6], [-0.5, 0.2], [-0.48, 0.03], [-0.3, 0.0], [0.3, 0.0], [0.48, 0.03], [0.5, 0.2], [0.44, 0.6], [0.37, 1.0], [0.36, 1.3]],
    lc: [[-0.36, 1.3], [-0.38, 1.0], [-0.46, 0.6], [-0.5, 0.3], [-0.4, 0.14], [-0.12, 0.0], [0.2, 0.1], [0.45, 0.28], [0.5, 0.45], [0.45, 0.7], [0.38, 1.0], [0.36, 1.3]],
    lpm: [[-0.36, 1.3], [-0.4, 1.0], [-0.47, 0.65], [-0.5, 0.4], [-0.4, 0.18], [-0.12, 0.0], [0.2, 0.06], [0.44, 0.22], [0.5, 0.42], [0.46, 0.7], [0.39, 1.0], [0.36, 1.3]],
  };
  const ARCH = {
    upper: { L: 15, z0: 0, dir: -1, // crown goes up (-y) from the tip
      teeth: [ // type, mesiodistal width, crown height, tip y (mm below the occlusal plane), tip angle (rad), bracket height from tip, zenith u
        ['uci', 8.6, 10.5, 1.2, 0.08, 4.6, 0.08], ['uli', 6.6, 9.0, 0.45, 0.14, 4.1, 0.06], ['uc', 7.6, 10.2, 1.0, 0.16, 5.0, 0.04],
        ['upm', 7.0, 8.4, 0.65, 0.05, 4.5, 0.0], ['upm', 6.7, 7.6, 0.4, 0.04, 4.2, 0.0], ['um', 10.2, 7.0, 0.3, 0.0, 0, 0.05]] },
    lower: { L: 12.5, z0: 2.4, dir: 1,
      teeth: [['lci', 5.3, 9.0, -1.3, 0.0, 4.2, 0.0], ['lci', 5.9, 9.4, -1.3, 0.03, 4.2, 0.02], ['lc', 6.9, 10.6, -1.9, 0.1, 4.8, 0.03],
        ['lpm', 7.0, 8.5, -1.1, 0.04, 4.5, 0.0], ['lpm', 7.1, 8.0, -0.8, 0.03, 4.3, 0.0], ['um', 11.2, 7.4, -0.6, 0.0, 0, 0.05]] },
  };
  const FR = { PX: 36, cx: 960, cy: 560, D: 110, built: false };
  function archTable(L) {
    const tab = []; let X = 0, Z = 0; const ds = 0.05;
    for (let s = 0; s <= 60; s += ds) {
      const th = 1.2566 * (1 - Math.exp(-Math.pow(s / L, 1.6)));
      tab.push([s, X, Z, th]); X += Math.cos(th) * ds; Z += Math.sin(th) * ds;
    }
    return tab;
  }
  function archAt(tab, s) { const i = clamp(Math.floor(s / 0.05), 0, tab.length - 2), a = tab[i], b = tab[i + 1], k = (s - a[0]) / 0.05; return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]; }
  // 3D arch point (s along the arch, side -1/+1, y vertical mm, extra depth dz) -> design px [x, y, f, theta]
  function fproj(A, s, side, y, dz = 0) {
    const [X, Z, th] = archAt(A.tab, s), f = FR.D / (FR.D + Z + A.z0 + dz);
    return [FR.cx + side * X * f * FR.PX, FR.cy + y * f * FR.PX, f, th];
  }
  function buildFront() {
    for (const key of ['upper', 'lower']) {
      const A = ARCH[key]; A.tab = archTable(A.L); A.list = [];
      let s = 0;
      for (let i = 0; i < A.teeth.length; i++) {
        const [type, w, h, tip, ang, bh, zu] = A.teeth[i];
        A.list.push({ i, type, w, h, tip, ang, bh, zu, s0: s, s1: s + w, sc: s + w / 2 }); s += w;
      }
      // papilla heights at each contact (average of the neighbours at ~58% of crown height)
      A.pap = [];
      for (let i = 0; i < A.list.length; i++) {
        const t = A.list[i], n = A.list[i + 1] || t;
        const frac = i < 2 ? 0.52 : 0.6;
        A.pap.push(A.dir < 0 ? ((t.tip - frac * t.h) + (n.tip - frac * n.h)) / 2 : ((t.tip + frac * t.h) + (n.tip + frac * n.h)) / 2);
      }
      A.midPap = A.dir < 0 ? A.list[0].tip - 0.5 * A.list[0].h : A.list[0].tip + 0.5 * A.list[0].h;
    }
    FR.built = true;
  }
  // screen outline of one tooth (design px)
  function toothPts(A, t, side) {
    return crp(OUT[t.type], false, 6).map(([u, v]) => {
      const s = t.sc + u * t.w, y0 = t.tip + A.dir * v * t.h;
      const lean = (v - 0.5) * t.h * Math.sin(t.ang);        // crown tip: the gingival end leans distally
      const [x, y, f] = fproj(A, Math.max(0, s + lean), side, y0);
      return [x, y, f];
    });
  }
  function marginY(A, t, u) {
    const pL = t.i === 0 ? A.midPap : A.pap[t.i - 1], pR = A.pap[t.i], cer = t.tip + A.dir * t.h;
    const a = (u - t.zu) / (u < t.zu ? t.zu + 0.5 : 0.5 - t.zu), p = a < 0 ? pL : pR;
    return p + (cer - p) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(a), 2.6)), 0.55);
  }
  // gum margin polyline across the arch (left M1 -> right M1), design px
  function marginLine(A) {
    const pts = [];
    for (const side of [-1, 1]) {
      const seq = side < 0 ? A.list.slice().reverse() : A.list;
      for (const t of seq) {
        for (let k = 0; k <= 14; k++) {
          const u = side < 0 ? 0.5 - k / 14 : -0.5 + k / 14;
          const p = fproj(A, t.sc + u * t.w, side, marginY(A, t, u)); pts.push([p[0], p[1]]);
        }
      }
    }
    return pts;
  }
  function drawFrontTooth(ctx, A, t, side) {
    const pts = toothPts(A, t, side), poly = pts.map((p) => [p[0], p[1]]);
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), yTip = fproj(A, t.sc, side, t.tip)[1], yCer = fproj(A, t.sc, side, t.tip + A.dir * t.h)[1];
    const th = archAt(A.tab, t.sc)[2], turn = 1 - Math.cos(th);
    ctx.save(); path(ctx, poly); ctx.clip();
    // body: warm at the gum, bright middle, cool translucent tip (incisors)
    const g = ctx.createLinearGradient(0, yCer, 0, yTip);
    g.addColorStop(0, '#eadcc0'); g.addColorStop(0.3, '#f7f1e4'); g.addColorStop(0.72, '#fbf8f2');
    const inc = t.type === 'uci' || t.type === 'uli' || t.type === 'lci';
    g.addColorStop(0.93, inc ? '#dfe6ee' : '#f3efe6'); g.addColorStop(1, inc ? '#c9d3de' : '#e9e3d6');
    ctx.fillStyle = g; ctx.fillRect(x0 - 5, Math.min(yTip, yCer) - 60, x1 - x0 + 10, Math.abs(yTip - yCer) + 120);
    // roundness: darker toward the mesial / distal edges; darker overall as the arch turns away
    const gr = ctx.createLinearGradient(x0, 0, x1, 0);
    const dk = 0.34 + 0.25 * turn;
    gr.addColorStop(0, `rgba(96,72,92,${dk})`); gr.addColorStop(0.22, 'rgba(96,72,92,0)'); gr.addColorStop(0.78, 'rgba(96,72,92,0)'); gr.addColorStop(1, `rgba(96,72,92,${dk})`);
    ctx.fillStyle = gr; ctx.fillRect(x0 - 5, Math.min(yTip, yCer) - 60, x1 - x0 + 10, Math.abs(yTip - yCer) + 120);
    if (turn > 0.05) { ctx.fillStyle = `rgba(30,18,40,${0.62 * turn * turn + 0.12 * turn})`; ctx.fillRect(x0 - 5, Math.min(yTip, yCer) - 60, x1 - x0 + 10, Math.abs(yTip - yCer) + 120); }
    // incisal halo (bright rim at the very edge of incisors)
    if (inc) { ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x0, yTip + (A.dir < 0 ? -1 : 1)); ctx.lineTo(x1, yTip + (A.dir < 0 ? -1 : 1)); ctx.stroke(); }
    // specular highlight on the facial convexity
    const hx = lerp(x0, x1, side > 0 ? 0.4 : 0.6), hy = lerp(yTip, yCer, 0.48), hw = (x1 - x0) * 0.13, hh = Math.abs(yCer - yTip) * 0.3;
    const gh = ctx.createRadialGradient(hx, hy, 0, hx, hy, hh);
    gh.addColorStop(0, `rgba(255,255,255,${0.75 * (1 - turn)})`); gh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.translate(hx, hy); ctx.scale(hw / hh, 1); ctx.translate(-hx, -hy); ctx.fillStyle = gh; ctx.beginPath(); ctx.arc(hx, hy, hh, 0, TAU); ctx.fill(); ctx.restore();
    // faint perikymata (horizontal growth lines)
    ctx.strokeStyle = 'rgba(160,140,120,0.08)'; ctx.lineWidth = 1;
    for (let k = 1; k < 7; k++) { const yy = lerp(yCer, yTip, k / 8); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.quadraticCurveTo((x0 + x1) / 2, yy + (A.dir < 0 ? 3 : -3), x1, yy); ctx.stroke(); }
    ctx.restore();
    path(ctx, poly); ctx.strokeStyle = 'rgba(92,64,76,0.45)'; ctx.lineWidth = 1.6; ctx.stroke();
    return { poly, x0, x1, yTip, yCer };
  }
  function drawGum(ctx, A, o = {}) {
    const m = marginLine(A), far = A.dir < 0 ? -200 : H + 200;
    const poly = [...m, [m[m.length - 1][0] + 400, m[m.length - 1][1]], [m[m.length - 1][0] + 400, far], [m[0][0] - 400, far], [m[0][0] - 400, m[0][1]]];
    // soft shadow the gum casts on the teeth just under the margin
    ctx.save(); path(ctx, m, false); ctx.strokeStyle = 'rgba(120,40,60,0.35)'; ctx.lineWidth = 10; ctx.translate(0, A.dir < 0 ? 3 : -3); ctx.stroke(); ctx.restore();
    const my = m.reduce((a, p) => a + p[1], 0) / m.length;
    const g = ctx.createLinearGradient(0, my, 0, my + A.dir * 250);
    const red = o.red || 0;
    g.addColorStop(0, rgba(mix('#f8a9b8', '#ff5f76', red))); g.addColorStop(0.16, rgba(mix('#f093a6', '#e84a63', red))); g.addColorStop(0.38, rgba(mix('#e47f97', '#d93a58', red)));
    g.addColorStop(0.55, '#c75479'); g.addColorStop(0.78, '#6a2447'); g.addColorStop(1, '#0b0a18');
    path(ctx, poly); ctx.fillStyle = g; ctx.fill();
    ctx.save(); path(ctx, poly); ctx.clip();
    // root eminences: soft vertical bulges above each tooth (canine strongest)
    for (const side of [-1, 1]) for (const t of A.list) {
      if (t.type === 'um' || !o.eminence) continue;
      const [x, y, f] = fproj(A, t.sc, side, t.tip + A.dir * t.h * 1.0), wpx = t.w * f * FR.PX * 0.26 * Math.cos(archAt(A.tab, t.sc)[2]);
      const len = (t.type === 'uc' || t.type === 'lc' ? 3.2 : 2.4) * f * FR.PX, ex = x, ey = y + A.dir * len * 0.7;
      const ge = ctx.createRadialGradient(ex, ey, 0, ex, ey, len * 0.6);
      ge.addColorStop(0, 'rgba(255,205,216,0.22)'); ge.addColorStop(1, 'rgba(255,205,216,0)');
      ctx.save(); ctx.translate(ex, ey); ctx.scale(Math.max(0.2, wpx / (len * 0.6)), 1); ctx.translate(-ex, -ey); ctx.fillStyle = ge; ctx.beginPath(); ctx.arc(ex, ey, len * 0.6, 0, TAU); ctx.fill(); ctx.restore();
    }
    // stipple (attached gum only: fades out with distance from the margin)
    ctx.save(); ctx.globalAlpha = 0.45; ctx.drawImage(FR.stipple, 0, 0, W, H); ctx.restore();
    ctx.restore();
    // wet rim along the margin
    path(ctx, m, false); ctx.strokeStyle = 'rgba(255,225,232,0.75)'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.save(); ctx.translate(0, A.dir * 4); path(ctx, m, false); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    return m;
  }
  // stainless twin bracket (base layer: pad, body, slot). (x, y) design px, k px/mm, fx horizontal foreshortening
  function bracket(ctx, x, y, k, fx, o = {}) {
    const bw = (o.w || 3.2) * k, bh = 3.2 * k, slot = 0.6 * k;
    ctx.save(); ctx.translate(x, y); ctx.scale(fx, 1);
    ctx.fillStyle = 'rgba(50,30,45,0.3)'; api.roundRect(ctx, -bw * 0.55 + 3, -bh * 0.55 + 5, bw * 1.1, bh * 1.1, 0.5 * k); ctx.fill();
    const gp = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); gp.addColorStop(0, '#b9bec8'); gp.addColorStop(1, '#6f7682');
    ctx.fillStyle = gp; api.roundRect(ctx, -bw * 0.55, -bh * 0.55, bw * 1.1, bh * 1.1, 0.45 * k); ctx.fill();
    // recessed body between the wings
    const gb = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); gb.addColorStop(0, '#7d8490'); gb.addColorStop(0.5, '#a3aab5'); gb.addColorStop(1, '#6d7480');
    ctx.fillStyle = gb; api.roundRect(ctx, -bw * 0.46, -bh * 0.46, bw * 0.92, bh * 0.92, 0.3 * k); ctx.fill();
    // slot: the dark channel the wire runs in
    const gs = ctx.createLinearGradient(0, -slot / 2, 0, slot / 2); gs.addColorStop(0, '#24282f'); gs.addColorStop(1, '#484e59');
    ctx.fillStyle = gs; ctx.fillRect(-bw * 0.5, -slot / 2, bw, slot);
    ctx.restore();
  }
  // elastic ligature stretched around the four tie wings (after the wire), then the wings on top: the colour shows as a
  // frame around the bracket and crosses the wire at the sides and the vertical groove at the top and bottom.
  function tie(ctx, x, y, k, fx, o = {}) {
    const bw = (o.w || 3.2) * k, bh = 3.2 * k, slot = 0.6 * k, col = o.color || '#a78bfa';
    const ww = bw * 0.4, wh = (bh - slot) / 2, t = 0.62 * k;
    ctx.save(); ctx.translate(x, y); ctx.scale(fx, 1);
    const rw = bw * 0.98, rh = bh * 0.9, rr = Math.min(rw, rh) * 0.34;
    ctx.lineWidth = t; ctx.strokeStyle = rgba(mix(col, '#1c1033', 0.45)); api.roundRect(ctx, -rw / 2, -rh / 2, rw, rh, rr); ctx.stroke();
    ctx.lineWidth = t * 0.7; ctx.strokeStyle = col; ctx.stroke();
    ctx.save(); ctx.translate(-t * 0.1, -t * 0.12); ctx.lineWidth = t * 0.18; ctx.strokeStyle = 'rgba(255,255,255,0.65)'; api.roundRect(ctx, -rw / 2, -rh / 2, rw, rh, rr); ctx.stroke(); ctx.restore();
    // four tie wings (bevelled stainless), over the ring
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const wx = sx < 0 ? -bw / 2 + bw * 0.06 : bw / 2 - bw * 0.06 - ww, wy = sy < 0 ? -bh / 2 + bh * 0.05 : slot / 2 + bh * 0.02, hh = wh - bh * 0.07;
      ctx.fillStyle = 'rgba(30,20,40,0.35)'; api.roundRect(ctx, wx + 1, wy + 2.5, ww, hh, 0.3 * k); ctx.fill();
      const gw = ctx.createLinearGradient(0, wy, 0, wy + hh);
      if (sy < 0) { gw.addColorStop(0, '#ffffff'); gw.addColorStop(0.3, '#e1e5ec'); gw.addColorStop(1, '#8c94a0'); }
      else { gw.addColorStop(0, '#c4cad3'); gw.addColorStop(0.55, '#9ca3af'); gw.addColorStop(1, '#5b626e'); }
      ctx.fillStyle = gw; api.roundRect(ctx, wx, wy, ww, hh, 0.3 * k); ctx.fill();
      ctx.strokeStyle = 'rgba(38,42,52,0.6)'; ctx.lineWidth = Math.max(1, 0.05 * k); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; api.roundRect(ctx, wx + ww * 0.16, wy + hh * (sy < 0 ? 0.14 : 0.2), ww * 0.52, Math.max(1.5, hh * 0.13), 0.08 * k); ctx.fill();
    }
    ctx.restore();
  }
  function wire(ctx, pts, k) {
    const line = crp(pts, false, 8);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.translate(0, 3); path(ctx, line, false); ctx.strokeStyle = 'rgba(40,20,40,0.28)'; ctx.lineWidth = 0.62 * k; ctx.stroke(); ctx.translate(0, -3);
    path(ctx, line, false); ctx.strokeStyle = '#6d7480'; ctx.lineWidth = 0.52 * k; ctx.stroke();
    path(ctx, line, false); ctx.strokeStyle = '#c9ced6'; ctx.lineWidth = 0.34 * k; ctx.stroke();
    ctx.translate(0, -0.1 * k); path(ctx, line, false); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.1 * k; ctx.stroke();
    ctx.restore();
  }
  // the whole frontal dentition with braces; returns bracket positions for props / food
  function drawFront(ctx, o = {}) {
    if (!FR.built) buildFront();
    const brk = [];
    // mouth interior behind the teeth
    const mu = marginLine(ARCH.upper), ml = marginLine(ARCH.lower);
    const back = [...mu, ...ml.slice().reverse()];
    const gb = ctx.createLinearGradient(0, 380, 0, 760); gb.addColorStop(0, '#2a0d1c'); gb.addColorStop(0.5, '#12060e'); gb.addColorStop(1, '#2a0d1c');
    path(ctx, back); ctx.fillStyle = gb; ctx.fill();
    for (const key of ['lower', 'upper']) {
      const A = ARCH[key];
      // posterior first so the front teeth overlap
      if (key === 'upper') { // the upper teeth cast a soft shadow down onto the lower ones
        for (let q = 3; q >= 1; q--) for (let i = A.list.length - 1; i >= 0; i--) for (const side of [-1, 1]) {
          const pts = toothPts(A, A.list[i], side).map((p) => [p[0], p[1] + q * 7]);
          path(ctx, pts); ctx.fillStyle = 'rgba(25,6,18,' + (0.16 / q).toFixed(3) + ')'; ctx.fill();
        }
      }
      for (let i = A.list.length - 1; i >= 0; i--) for (const side of [-1, 1]) drawFrontTooth(ctx, A, A.list[i], side);
      if (key === 'lower') { const gl = ctx.createLinearGradient(0, 420, 0, 760); gl.addColorStop(0, 'rgba(20,8,20,0.28)'); gl.addColorStop(1, 'rgba(20,8,20,0.05)'); ctx.save(); for (let i = A.list.length - 1; i >= 0; i--) for (const side of [-1, 1]) { path(ctx, toothPts(A, A.list[i], side)); ctx.fillStyle = gl; ctx.fill(); } ctx.restore(); }
      drawGum(ctx, A, o);
      if (o.braces === false) continue;
      // brackets
      const wpts = [], list = [];
      for (const side of [-1, 1]) {
        const seq = side < 0 ? A.list.slice().reverse() : A.list;
        for (const t of seq) {
          const [bx, by, f, th] = fproj(A, t.sc - 0.1 * t.w, side, t.tip + A.dir * t.bh, -0.6);
          if (t.type === 'um') { const [mx, my] = fproj(A, t.sc - 0.2 * t.w, side, t.tip + A.dir * 4.0, -0.6); wpts.push([mx, my]); continue; }
          const k = f * FR.PX, fx = Math.max(0.3, Math.cos(th)), w = t.type === 'lci' ? 2.6 : t.type === 'upm' || t.type === 'lpm' ? 3.0 : 3.2;
          list.push({ x: bx, y: by, k, fx, w, arch: key, side, type: t.type, i: t.i });
          wpts.push([bx, by]);
        }
      }
      // extend the wire a little beyond the last brackets (into the molar tubes, in shadow)
      for (const b of list) bracket(ctx, b.x, b.y, b.k, b.fx, { w: b.w });
      wire(ctx, wpts, FR.PX * 0.92);
      for (const b of list) tie(ctx, b.x, b.y, b.k, b.fx, { w: b.w, color: o.tie || '#a78bfa' });
      brk.push(...list);
    }
    // buccal corridors: the sides fall into shadow
    for (const s of [-1, 1]) {
      const g = ctx.createLinearGradient(s < 0 ? 60 : W - 60, 0, s < 0 ? 560 : W - 560, 0);
      g.addColorStop(0, 'rgba(11,10,24,1)'); g.addColorStop(0.45, 'rgba(11,10,24,0.72)'); g.addColorStop(1, 'rgba(11,10,24,0)');
      ctx.fillStyle = g; ctx.fillRect(s < 0 ? 0 : W - 560, 0, 560, H);
    }
    ctx.fillStyle = 'rgba(11,10,24,1)'; ctx.fillRect(0, 0, 60, H); ctx.fillRect(W - 60, 0, 60, H);
    return brk;
  }

  // ================================================================= EXTERIOR: the molars from the cheek side =======
  // Same mm frame as SECTION (origin = molar contact at CEJ level). Crowns are the section outlines drawn as solid
  // enamel with the buccal grooves; the gum covers the roots with a scalloped margin (zenith ~0.9 mm above the CEJ at
  // mid-tooth, papillae up to ~1.4 mm under each contact), leaving a small dark embrasure under each contact.
  const EXT = { contacts: [-17.8, -10.8, 0, 10.2, 19.9], centers: [-14.3, -5.3, 5.25, 15.19] };
  function extMarginY(x, o = {}) {
    const C = EXT.contacts;
    for (let i = 0; i < C.length - 1; i++) {
      if (x >= C[i] && x <= C[i + 1]) {
        const xc = (C[i] + C[i + 1]) / 2 + 0.2, hw = (C[i + 1] - C[i]) / 2, a = clamp((x - xc) / (x < xc ? xc - C[i] : C[i + 1] - xc), -1, 1);
        const pap = -3.45 + (o.recede || 0), zen = -0.9 + (o.recede || 0) * 0.6;
        return pap + (zen - pap) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(a), 2.4)), 0.55);
      }
    }
    return -0.9;
  }
  const GROOVES = { M1: [[[-1.25, -6.8], [-1.1, -5.4], [-1.0, -3.9]], [[2.25, -6.75], [2.35, -5.9], [2.4, -5.1]]], M2: [[[-0.2, -6.7], [-0.1, -5.3], [0.0, -3.9]]], M3: [[[-0.2, -6.7], [-0.1, -5.3], [0.0, -3.9]]], PM2: [] };
  function drawExterior(ctx, o = {}) {
    // teeth
    for (const T of SEC.teeth) {
      ctx.save(); path(ctx, T.outline); ctx.clip();
      const g = ctx.createLinearGradient(0, -8 * T.sc, 0, 0);
      g.addColorStop(0, '#fdfcf8'); g.addColorStop(0.55, '#f4efe3'); g.addColorStop(1, '#e6d4ae');
      ctx.fillStyle = g; ctx.fillRect(T.dx - 8, -10, 16, 26);
      const hw = 5.6 * T.sc, gr = ctx.createLinearGradient(T.dx - hw, 0, T.dx + hw, 0);
      gr.addColorStop(0, 'rgba(92,70,96,0.42)'); gr.addColorStop(0.24, 'rgba(92,70,96,0)'); gr.addColorStop(0.72, 'rgba(92,70,96,0)'); gr.addColorStop(1, 'rgba(92,70,96,0.48)');
      ctx.fillStyle = gr; ctx.fillRect(T.dx - 8, -10, 16, 26);
      for (const gv of GROOVES[T.name] || []) {
        const gx = T.dx + gv[0][0] * T.sc, gl = ctx.createLinearGradient(gx - 1.1, 0, gx + 1.1, 0);
        gl.addColorStop(0, 'rgba(120,96,110,0)'); gl.addColorStop(0.5, 'rgba(120,96,110,0.16)'); gl.addColorStop(1, 'rgba(120,96,110,0)');
        ctx.fillStyle = gl; ctx.fillRect(gx - 1.1, -8, 2.2, 7);
      }
      // buccal grooves with a pit at the end
      for (const gv of GROOVES[T.name] || []) {
        const pts = crp(gv.map(([x, y]) => [T.dx + x * T.sc, y * T.sc]), false, 8);
        path(ctx, pts, false); ctx.strokeStyle = 'rgba(150,118,86,0.5)'; ctx.lineWidth = 0.13; ctx.lineCap = 'round'; ctx.stroke();
        ctx.translate(0.06, 0); path(ctx, pts, false); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.06; ctx.stroke(); ctx.translate(-0.06, 0);
        const e = pts[pts.length - 1]; ctx.fillStyle = 'rgba(130,98,70,0.55)'; ctx.beginPath(); ctx.arc(e[0], e[1], 0.14, 0, TAU); ctx.fill();
      }
      // soft highlight on the buccal convexity + rim light along the cusps
      const hx = T.dx - 1.6 * T.sc, hy = -4.4 * T.sc, gh = ctx.createRadialGradient(hx, hy, 0, hx, hy, 2.4);
      gh.addColorStop(0, 'rgba(255,255,255,0.75)'); gh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); ctx.translate(hx, hy); ctx.scale(0.6, 1); ctx.translate(-hx, -hy); ctx.fillStyle = gh; ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, TAU); ctx.fill(); ctx.restore();
      path(ctx, T.crownOpen, false); ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 0.22; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(T.dx + 2.5 * T.sc, -4.6, 8, 26); ctx.clip(); path(ctx, T.outline); ctx.strokeStyle = 'rgba(150,130,255,0.22)'; ctx.lineWidth = 0.32; ctx.stroke(); ctx.restore();
      ctx.restore();
      path(ctx, T.outline); ctx.strokeStyle = 'rgba(80,58,62,0.55)'; ctx.lineWidth = 0.07; ctx.stroke();
    }
    // gum: scalloped margin, attached gum, mucogingival line, redder lining below, fading into the dark
    const top = [];
    for (let x = -26; x <= 26.001; x += 0.12) top.push([x, extMarginY(x, o)]);
    const poly = [...top, [26, 22], [-26, 22]];
    ctx.save(); ctx.translate(0, 0.12); path(ctx, top, false); ctx.strokeStyle = 'rgba(110,40,60,0.35)'; ctx.lineWidth = 0.35; ctx.stroke(); ctx.restore();
    const red = o.red || 0, g = ctx.createLinearGradient(0, -3.5, 0, 12);
    g.addColorStop(0, rgba(mix('#f9adbc', '#ff6278', red))); g.addColorStop(0.18, rgba(mix(P.gum, P.gumRed, red))); g.addColorStop(0.42, '#e27592');
    g.addColorStop(0.55, '#cf5a80'); g.addColorStop(0.8, '#6d2548'); g.addColorStop(1, '#0b0a18');
    path(ctx, poly); ctx.fillStyle = g; ctx.fill();
    ctx.save(); path(ctx, poly); ctx.clip();
    ctx.globalAlpha = 0.6; ctx.drawImage(SEC.gumTex, -26, -8, 52, 16); ctx.globalAlpha = 1;
    // root eminences (two per molar, one per premolar)
    for (const T of SEC.teeth) {
      const roots = T.name === 'PM2' ? [0] : [-2.6, 2.4];
      for (const rx of roots) {
        const ex = T.dx + rx * T.sc, ey = 3.2, ge = ctx.createRadialGradient(ex, ey, 0, ex, ey, 3.2);
        ge.addColorStop(0, 'rgba(255,205,218,0.22)'); ge.addColorStop(1, 'rgba(255,205,218,0)');
        ctx.save(); ctx.translate(ex, ey); ctx.scale(0.42, 1); ctx.translate(-ex, -ey); ctx.fillStyle = ge; ctx.beginPath(); ctx.arc(ex, ey, 3.2, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
    ctx.restore();
    path(ctx, top, false); ctx.strokeStyle = 'rgba(255,226,233,0.85)'; ctx.lineWidth = 0.09; ctx.stroke();
    // dim the far neighbours
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -11.5 : 11.0, x1 = s < 0 ? -19 : 18.5, gd = ctx.createLinearGradient(x0, 0, x1, 0);
      gd.addColorStop(0, 'rgba(11,10,24,0)'); gd.addColorStop(0.6, 'rgba(11,10,24,0.7)'); gd.addColorStop(1, 'rgba(11,10,24,1)');
      ctx.fillStyle = gd; if (s < 0) ctx.fillRect(-40, -20, 40 + x0, 60); else ctx.fillRect(x0, -20, 40, 60);
    }
    return top;
  }
  // a strand of floss through points (flat white ribbon with a soft shadow)
  function floss(ctx, pts, w = 0.3) {
    const line = crp(pts, false, 10);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.translate(0.08, 0.14); path(ctx, line, false); ctx.strokeStyle = 'rgba(30,14,40,0.35)'; ctx.lineWidth = w * 1.3; ctx.stroke(); ctx.translate(-0.08, -0.14);
    path(ctx, line, false); ctx.strokeStyle = '#cfc8ea'; ctx.lineWidth = w; ctx.stroke();
    path(ctx, line, false); ctx.strokeStyle = '#fbfaff'; ctx.lineWidth = w * 0.55; ctx.stroke();
    ctx.restore();
  }

  // ================================================================= PROPS: bottles, mints, dry-tongue cracks =======
  // Generic, unbranded mouthwash bottle. (x, y) = centre of the base, h = height, rot = tilt (radians, about the base).
  // o: { liquid, label, sub, level (0..1), cap (0 on .. 1 flown off), labelBg, labelInk, tiltLevel }
  function bottleShape(ctx, h) {
    const bw = 0.42 * h, r = 0.08 * h, sh = 0.7 * h, nk = 0.085 * h, nt = 0.86 * h;
    ctx.beginPath();
    ctx.moveTo(-bw / 2 + r, 0); ctx.lineTo(bw / 2 - r, 0); ctx.quadraticCurveTo(bw / 2, 0, bw / 2, -r);
    ctx.lineTo(bw / 2, -0.36 * h); ctx.quadraticCurveTo(bw / 2 - 0.035 * h, -0.42 * h, bw / 2, -0.48 * h);   // grip waist
    ctx.lineTo(bw / 2, -sh); ctx.bezierCurveTo(bw / 2, -0.8 * h, nk, -0.8 * h, nk, -nt);
    ctx.lineTo(-nk, -nt); ctx.bezierCurveTo(-nk, -0.8 * h, -bw / 2, -0.8 * h, -bw / 2, -sh);
    ctx.lineTo(-bw / 2, -0.48 * h); ctx.quadraticCurveTo(-bw / 2 + 0.035 * h, -0.42 * h, -bw / 2, -0.36 * h);
    ctx.lineTo(-bw / 2, -r); ctx.quadraticCurveTo(-bw / 2, 0, -bw / 2 + r, 0); ctx.closePath();
  }
  function bottle(ctx, x, y, h, o = {}) {
    const liquid = o.liquid || '#e2a23b', rot = o.rot || 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    // soft shadow on the floor (only when upright)
    if (Math.abs(rot) < 0.2) { ctx.save(); ctx.rotate(-rot); const sg = ctx.createRadialGradient(0, 4, 0, 0, 4, 0.34 * h); sg.addColorStop(0, 'rgba(0,0,0,0.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.scale(1, 0.18); ctx.beginPath(); ctx.arc(0, 20, 0.34 * h, 0, TAU); ctx.fill(); ctx.restore(); }
    // plastic body
    bottleShape(ctx, h);
    const gb = ctx.createLinearGradient(-0.21 * h, 0, 0.21 * h, 0); gb.addColorStop(0, 'rgba(255,255,255,0.16)'); gb.addColorStop(0.5, 'rgba(255,255,255,0.05)'); gb.addColorStop(1, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = gb; ctx.fill();
    // liquid: its surface stays level in the world while the bottle tilts
    ctx.save(); bottleShape(ctx, h); ctx.clip();
    ctx.rotate(-rot);
    const lvl = o.level ?? 0.82, surf = -h * lerp(0.04, 0.8, lvl) * Math.cos(Math.min(1.3, Math.abs(rot))) + (o.tiltLevel || 0) * h;
    const gl = ctx.createLinearGradient(-0.25 * h, 0, 0.25 * h, 0); gl.addColorStop(0, rgba(mix(liquid, '#000000', 0.25))); gl.addColorStop(0.45, liquid); gl.addColorStop(1, rgba(mix(liquid, '#000000', 0.35)));
    ctx.fillStyle = gl; ctx.fillRect(-h, surf, 2 * h, 2 * h);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-h, surf - 1, 2 * h, 3);
    ctx.restore();
    // outline + gloss streaks
    bottleShape(ctx, h); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); bottleShape(ctx, h); ctx.clip();
    const gs = ctx.createLinearGradient(-0.21 * h, 0, -0.08 * h, 0); gs.addColorStop(0, 'rgba(255,255,255,0)'); gs.addColorStop(0.5, 'rgba(255,255,255,0.5)'); gs.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gs; ctx.fillRect(-0.21 * h, -0.8 * h, 0.13 * h, 0.78 * h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0.12 * h, -0.7 * h, 0.03 * h, 0.6 * h);
    ctx.restore();
    // label band
    const lw = 0.42 * h + 2, ly = -0.64 * h, lh = 0.3 * h;
    ctx.save(); bottleShape(ctx, h); ctx.clip();
    ctx.fillStyle = o.labelBg || '#f4f1ea'; ctx.fillRect(-lw / 2, ly, lw, lh);
    const shade = ctx.createLinearGradient(-lw / 2, 0, lw / 2, 0); shade.addColorStop(0, 'rgba(0,0,0,0.28)'); shade.addColorStop(0.3, 'rgba(0,0,0,0)'); shade.addColorStop(0.75, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = shade; ctx.fillRect(-lw / 2, ly, lw, lh);
    ctx.fillStyle = o.stripe || liquid; ctx.fillRect(-lw / 2, ly + lh - 0.045 * h, lw, 0.045 * h);
    if (o.sub) api.text(ctx, o.sub, 0, ly + 0.085 * h, { size: 0.05 * h, color: 'rgba(20,20,30,0.65)', align: 'center', tracking: 3 });
    if (o.label) api.text(ctx, o.label, 0, ly + 0.195 * h, { size: (o.labelSize || 0.1) * h, color: o.labelInk || '#1a1320', align: 'center', tracking: 1, maxWidth: lw * 0.9 });
    ctx.restore();
    // cap (ribbed), flies off with o.cap
    const cap = clamp(o.cap || 0);
    ctx.save(); ctx.translate(cap * 0.5 * h, -cap * 0.45 * h + cap * cap * 0.3 * h); ctx.rotate(cap * 2.2); ctx.globalAlpha *= 1 - clamp((cap - 0.7) / 0.3);
    const cw = 0.21 * h, ch = 0.11 * h, cy = -0.86 * h - ch;
    const gc = ctx.createLinearGradient(-cw / 2, 0, cw / 2, 0); gc.addColorStop(0, '#d9d6e6'); gc.addColorStop(0.45, '#ffffff'); gc.addColorStop(1, '#a9a5bb');
    ctx.fillStyle = gc; api.roundRect(ctx, -cw / 2, cy, cw, ch, 0.02 * h); ctx.fill();
    ctx.strokeStyle = 'rgba(90,86,110,0.35)'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 9; i++) { const xx = -cw / 2 + (cw * i) / 9; ctx.beginPath(); ctx.moveTo(xx, cy + 3); ctx.lineTo(xx, cy + ch - 3); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
  }
  // world position of the bottle mouth for (x, y, h, rot)
  function bottleMouth(x, y, h, rot) { const lx = 0, ly = -0.87 * h; return [x + lx * Math.cos(rot) - ly * Math.sin(rot), y + lx * Math.sin(rot) + ly * Math.cos(rot)]; }
  // sugary hard candy: red and white pinwheel swirl, glossy (x, y centre, r radius)
  function mintSwirl(ctx, x, y, r, o = {}) {
    ctx.save(); ctx.translate(x, y);
    if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(r * 0.08, r * 0.9, r * 0.9, r * 0.22, 0, 0, TAU); ctx.fill(); }
    ctx.rotate(o.rot || 0);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = '#fbf7f2'; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * TAU;
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let k = 0; k <= 12; k++) { const u = k / 12, a = a0 + u * 0.55 + u * u * 0.35; ctx.lineTo(Math.cos(a) * r * u * 1.05, Math.sin(a) * r * u * 1.05); }
      for (let k = 12; k >= 0; k--) { const u = k / 12, a = a0 + 0.3 + u * 0.55 + u * u * 0.35; ctx.lineTo(Math.cos(a) * r * u * 1.05, Math.sin(a) * r * u * 1.05); }
      ctx.closePath(); ctx.fillStyle = o.color || '#e8384f'; ctx.fill();
    }
    const sh = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r * 1.05);
    sh.addColorStop(0, 'rgba(255,255,255,0.55)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(60,0,20,0.35)');
    ctx.fillStyle = sh; ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.48, r * 0.24, r * 0.1, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // sugar-free pressed tablet mint: matte white disc with a bevel and a pressed centre line
  function mintTablet(ctx, x, y, r, o = {}) {
    ctx.save(); ctx.translate(x, y);
    if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(r * 0.08, r * 0.9, r * 0.9, r * 0.22, 0, 0, TAU); ctx.fill(); }
    ctx.rotate(o.rot || 0);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#e9f4f4'); g.addColorStop(1, '#b8cfd3');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,150,160,0.5)'; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = r * 0.03; ctx.beginPath(); ctx.arc(-r * 0.01, -r * 0.02, r * 0.8, Math.PI * 0.95, Math.PI * 1.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(110,140,150,0.55)'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-r * 0.55, 0); ctx.lineTo(r * 0.55, 0); ctx.stroke();
    // cool mint flecks
    const rnd = api.rand('tablet'); ctx.fillStyle = 'rgba(98,220,200,0.55)';
    for (let i = 0; i < 26; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r * 0.75; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.02 + rnd() * 0.03), 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // dry-tongue cracks (tongue-local units of the TONGUE kit: L = 800 long, HW = 280), Voronoi edges baked once
  function crackTexture(TG, res = 1.2) {
    const pad = 20, w = (2 * TG.HW + 2 * pad), h = (TG.L + 2 * pad), [c, g] = mk(w * res, h * res);
    const img = g.createImageData(c.width, c.height), rnd = api.rand('cracks'), seeds = [];
    for (let i = 0; seeds.length < 90 && i < 4000; i++) { const x = (rnd() * 2 - 1) * TG.HW, y = (rnd() - 0.5) * TG.L; if (TG.inside(x, y)) seeds.push([x, y]); }
    for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
      const x = px / res - TG.HW - pad, y = py / res - TG.L / 2 - pad; if (!TG.inside(x, y)) continue;
      let d1 = 1e9, d2 = 1e9;
      for (const s of seeds) { const d = (s[0] - x) ** 2 + (s[1] - y) ** 2; if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      const e = Math.sqrt(d2) - Math.sqrt(d1), j = (py * c.width + px) * 4;
      if (e < 2.4) { const a = sstep(2.4, 0.5, e); img.data[j] = 92; img.data[j + 1] = 18; img.data[j + 2] = 42; img.data[j + 3] = Math.round(a * 235); }
      else if (e < 7) { const a = (1 - sstep(2.4, 7, e)) * 0.38; img.data[j] = 255; img.data[j + 1] = 230; img.data[j + 2] = 225; img.data[j + 3] = Math.round(a * 255); }
    }
    g.putImageData(img, 0, 0);
    return { c, pad, w, h };
  }

  function init(a) {
    api = a; P = a.P; SS = Math.max(1, a.scale || 2);
    if (!SEC.teeth.length) buildSection();
    if (!FR.stipple) {
      const [c, g] = mk(W, H), rnd = a.rand('front-stipple');
      for (let i = 0; i < 9000; i++) { const x = rnd() * W, y = rnd() * H, r = 0.6 + rnd() * 1.3; g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(140,30,70,0.16)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      FR.stipple = c;
    }
    return window.TEETH;
  }

  window.TEETH = {
    init, crp, path, crossX, cam, camApply, toScreen, clamp, lerp, sstep, mix, rgba, hexRgb, mk,
    SEC, DEF, drawSection, crest, papillaTop, gumPts, surf, gumStory, STORY_KEYS, SX, OX0, OY0,
    FR, ARCH, drawFront, bracket, tie, wire, fproj, marginLine,
    EXT, extMarginY, drawExterior, floss,
    bottle, bottleMouth, mintSwirl, mintTablet, crackTexture,
    crumb, FOOD, bug, BUG, chain, puff, warnTri, chip, tag,
  };
})();
