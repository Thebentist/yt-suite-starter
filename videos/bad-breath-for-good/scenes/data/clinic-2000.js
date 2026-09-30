// @use videos/bad-breath-for-good/scenes/data/_lib.js
// @use videos/bad-breath-for-good/scenes/data/_kit.js
/* clinic-2000 (words 1328-1389): "they went through like 2,000 patients. And the number one cause ... was just the
 * coating on the tongue. It was way more than ... gum problems or anything they found with teeth. And a good chunk of
 * people didn't even have bad breath. They were just really worried that they did."
 * 2,000 real glowing dots on a dark data floor, one per patient, seen through a moving 3D camera with hard cuts on the
 * words: the count (high angle) -> skimming low across the block -> TONGUE COATING forms (43%) -> GUMS 11% / BOTH 18%
 * / OTHER -> close on the chunk that lights blue: NO BAD BREATH AT ALL (16%) -> the wide summary, "just worried".
 * Dot counts are the study's shares of 2,000 (860 / 220 / 360 / 320, the rest 240 other).
 * Source: Quirynen et al., J Clin Periodontol 2009 (research-notes row 3).
 */
const N = 2000;
const GROUPS = { tongue: 860, gums: 220, both: 360, none: 320, other: 240 };
const SP = 0.12, A_DOT = 0.866 * SP * SP, DOT_R = 0.042;
const C1 = [-2.1, 0.35];                    // tongue-coating circle centre (x, z)
const NONE = [3.25, -0.7], OTHER = [3.7, 2.55], POOL = [2.6, 0.9];
const SPAWN = [-6.5, 2.2, -2.5];
let DATA, dots, spr, venn, T, SHOTS, centroidBoth;

function lensArea(R1, R2, d) {
  if (d >= R1 + R2) return 0; if (d <= Math.abs(R1 - R2)) return Math.PI * Math.min(R1, R2) ** 2;
  const a = R1 * R1 * Math.acos((d * d + R1 * R1 - R2 * R2) / (2 * d * R1)), b = R2 * R2 * Math.acos((d * d + R2 * R2 - R1 * R1) / (2 * d * R2));
  return a + b - 0.5 * Math.sqrt((-d + R1 + R2) * (d + R1 - R2) * (d - R1 + R2) * (d + R1 + R2));
}
const bez = (a, m, b, k) => [(1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * m[0] + k * k * b[0], (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * m[1] + k * k * b[1], (1 - k) * (1 - k) * a[2] + 2 * (1 - k) * k * m[2] + k * k * b[2]];

defineScene({
  name: 'clinic-2000',
  anchor: { word: 1328, offset: -0.15 },
  anchorEnd: { word: 1390, offset: -0.15 },     // butts against teeth/between-teeth
  tail: 0.1,                                   // a few frames past the handoff (the assembler trims)
  setup(api) {
    DATA = window.DATA.init(api);
    const { P } = api, r = api.rand('clinic3d');
    T = { count0: api.at(1328), twoK: api.at(1333), patients: api.at(1334), number: api.at(1337), coating: api.at(1348), gums: api.at(1359),
      anything: api.at(1362), chunk: api.at(1369), none: api.at(1377), they: api.at(1382), worried: api.at(1386) };
    SHOTS = [0, T.number - 0.05, T.coating - 0.08, T.gums - 0.08, T.chunk - 0.1, T.they - 0.05];
    // ---- Venn geometry (world units): areas proportional to dot counts at one density
    const R1 = Math.sqrt(((GROUPS.tongue + GROUPS.both) * A_DOT) / Math.PI), R2 = Math.sqrt(((GROUPS.gums + GROUPS.both) * A_DOT) / Math.PI);
    let lo = R1 - R2, hi = R1 + R2; const L = GROUPS.both * A_DOT;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (lensArea(R1, R2, m) > L) lo = m; else hi = m; }
    const C2 = [C1[0] + (lo + hi) / 2, C1[1]];
    venn = { R1, R2, C2 };
    const in1 = (x, z) => Math.hypot(x - C1[0], z - C1[1]) <= R1 - 0.03, in2 = (x, z) => Math.hypot(x - C2[0], z - C2[1]) <= R2 - 0.03;
    const bb = [C1[0] - R1 - 0.2, C1[1] - R1 - 0.2, C2[0] + R2 + 0.2, C1[1] + R1 + 0.2];
    const slots = {
      tongue: DATA.packRegion(GROUPS.tongue, (x, z) => in1(x, z) && !in2(x, z), bb, SP, 's-t'),
      both: DATA.packRegion(GROUPS.both, (x, z) => in1(x, z) && in2(x, z), bb, SP, 's-b'),
      gums: DATA.packRegion(GROUPS.gums, (x, z) => in2(x, z) && !in1(x, z), bb, SP, 's-g'),
    };
    const disc = (n, c, seed) => { const R = Math.sqrt((n * A_DOT) / Math.PI) + SP * 2; return DATA.packRegion(n, (x, z) => Math.hypot(x - c[0], z - c[1]) <= R, [c[0] - R, c[1] - R, c[0] + R, c[1] + R], SP, seed, c[0], c[1]); };
    const pool = disc(GROUPS.gums + GROUPS.none + GROUPS.other, POOL, 's-pool'), noneS = disc(GROUPS.none, NONE, 's-none'), otherS = disc(GROUPS.other, OTHER, 's-other');
    centroidBoth = slots.both.reduce((a, p) => [a[0] + p[0] / slots.both.length, a[1] + p[1] / slots.both.length], [0, 0]);
    // ---- the block: 50 x 40 on the floor, centred at the origin
    const cols = 50, rows = 40, grid = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) grid.push([(i - (cols - 1) / 2) * SP, (j - (rows - 1) / 2) * SP, i, j]);
    const order = grid.map((g, k) => ({ k, key: g[2] + (rows - g[3]) * 0.45 + r() * 6 })).sort((a, b) => a.key - b.key).map((o) => grid[o.k]);
    const labels = []; for (const [g, n] of Object.entries(GROUPS)) for (let i = 0; i < n; i++) labels.push(g);
    for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; }
    dots = order.map((g, k) => ({ k, g: [g[0], g[1]], group: labels[k], r1: r(), r2: r(), r3: r() }));
    // arrival follows the counter: c(t) = 2000 * outExpo((t - count0) / 1.1)
    const inv = (c) => { const u = c / N; return T.count0 + 1.1 * (u >= 1 ? 1 : -Math.log2(1 - u) / 10); };
    for (const d of dots) { d.arrive = Math.min(T.count0 + 1.25, inv(d.k + 1)); d.spawn = d.arrive - 0.5; }
    const byZ = (a, b) => (a[1] - b[1]) || (a[0] - b[0]);
    const assign = (list, targets, key) => { const L2 = list.slice().sort((a, b) => (a.g[1] - b.g[1]) || (a.g[0] - b.g[0])); const tg = targets.slice().sort(byZ); L2.forEach((d, i) => { d[key] = tg[i % tg.length]; }); };
    assign(dots.filter((d) => d.group === 'tongue'), slots.tongue, 'v'); assign(dots.filter((d) => d.group === 'both'), slots.both, 'v');
    const rest = dots.filter((d) => ['gums', 'none', 'other'].includes(d.group)); assign(rest, pool, 'p');
    for (const [grp, tg] of [['gums', slots.gums], ['none', noneS], ['other', otherS]]) assign(rest.filter((d) => d.group === grp), tg, 'v');
    for (const d of dots) {
      const lift = 0.4 + d.r1 * 1.1;
      if (d.group === 'tongue' || d.group === 'both') d.legs = [{ t0: T.coating - 0.05 + (d.g[0] + 3) / 6 * 0.5 + d.r2 * 0.2, d: 0.9, to: d.v, lift }];
      else {
        const t1 = d.group === 'gums' ? T.gums - 0.05 + d.r2 * 0.35 : d.group === 'other' ? T.anything + d.r2 * 0.35 : T.chunk + d.r2 * 0.3;
        d.legs = [{ t0: T.coating + 0.1 + d.r2 * 0.35, d: 0.85, to: d.p, lift: lift * 0.6 }, { t0: t1, d: d.group === 'none' ? 0.75 : 0.85, to: d.v, lift }];
      }
    }
    // dot sprites: per colour, 4 blur levels (depth of field)
    const mk = (color, blur, ha = 0.45) => DATA.sprite(64, 64, (g) => {
      const core = 12 + blur * 6, halo = 30;
      const hg = g.createRadialGradient(32, 32, 0, 32, 32, halo); hg.addColorStop(0, DATA.alpha(color, ha - blur * 0.06)); hg.addColorStop(1, DATA.alpha(color, 0)); g.fillStyle = hg; g.fillRect(0, 0, 64, 64);
      const cg = g.createRadialGradient(32 - core * 0.3, 32 - core * 0.35, 0, 32, 32, core);
      cg.addColorStop(0, DATA.shade(color, 0.7 - blur * 0.15)); cg.addColorStop(0.6 - blur * 0.1, DATA.alpha(color, 1 - blur * 0.2)); cg.addColorStop(1, DATA.alpha(color, blur ? 0 : 0.9));
      g.fillStyle = cg; g.beginPath(); g.arc(32, 32, core, 0, Math.PI * 2); g.fill();
    });
    const cols5 = { base: '#b8aef2', tongue: P.lime, both: '#f6b26b', gums: P.pink, none: P.saliva, other: '#8580a8' };
    spr = {}; for (const [k, c] of Object.entries(cols5)) spr[k] = [0, 1, 2, 3].map((b) => mk(k === 'base' ? '#8a7fd6' : c, b, k === 'base' ? 0.12 : 0.4));
  },
  draw(ctx, t, api) {
    const { P, ease, prog, pop, clamp, lerp } = api;
    const sh = DATA.shot(t, SHOTS), lt = sh.lt;
    const { R1, R2, C2 } = venn;
    // ---- one camera per shot (hard cuts), each slowly dollying
    const cams = [
      { pos: [0.6 - lt * 0.12, 8.2 - lt * 0.25, -5.8 + lt * 0.2], target: [0.3, 0, 0.3], f: 1250, focus: 10 },
      { pos: [-4.6 + lt * 0.35, 1.05, -3.7 + lt * 0.12], target: [1.6, 0, 1.4], f: 1150, focus: 5.2 },
      { pos: [-0.8 + lt * 0.2, 5.4 - lt * 0.15, -6.3 + lt * 0.15], target: [-1.6, 0, 0.5], f: 1250, focus: 7.5 },
      { pos: [5.6 - lt * 0.2, 3.3, -5.2 + lt * 0.1], target: [0.2, 0, 0.9], f: 1150, focus: 7.4 },
      { pos: [5.9 - lt * 0.25, 1.35, -3.9 + lt * 0.12], target: [3.25, 0.25, -0.7], f: 1350, focus: 3.9 },
      { pos: [0.4, 9.2 - lt * 0.2, -7.6 + lt * 0.2], target: [0.4, 0, 0.95], f: 1270, focus: 12 },
    ];
    const c = cams[sh.i], cam = DATA.cam3(c);
    // ---- stage: dark with a coloured horizon glow, then the data floor
    const g0 = ctx.createLinearGradient(0, 0, 0, 1080); g0.addColorStop(0, '#07061a'); g0.addColorStop(0.55, '#110e2c'); g0.addColorStop(1, '#0a0918');
    ctx.fillStyle = g0; ctx.fillRect(0, 0, 1920, 1080);
    DATA.glow(ctx, 960, sh.i === 1 || sh.i === 4 ? 360 : 500, 1100, P.purple, 0.16);
    DATA.floorGrid(ctx, cam, { step: 0.6, x: [-9, 9], z: [-7, 9], fog: 22, alpha: 0.32, color: '#7a6cff', wRef: 180 });
    // light pools under the groups as they form
    const pool = (x, z, R, col, a) => { if (a <= 0) return; const p = cam.project(x, 0, z), px = cam.project(x + R, 0, z), pz = cam.project(x, 0, z + R); if (!p || !px || !pz) return;
      DATA.lightPool(ctx, p.x, p.y, Math.hypot(px.x - p.x, px.y - p.y) * 1.35, Math.max(8, Math.abs(pz.y - p.y) * 1.35), col, a); };
    const kT = prog(t, T.coating + 0.4, 0.8), kG = prog(t, T.gums + 0.3, 0.8), kN = prog(t, T.none, 0.6), kO = prog(t, T.anything + 0.4, 0.8);
    pool(C1[0], C1[1], R1, P.lime, 0.2 * kT); pool(C2[0], C2[1], R2, P.pink, 0.16 * kG); pool(NONE[0], NONE[1], 1.2, P.saliva, 0.3 * kN * (0.85 + 0.15 * Math.sin(t * 3))); pool(OTHER[0], OTHER[1], 1.0, '#8580a8', 0.08 * kO);
    // Venn rings drawn on the floor
    const ring = (cx, cz, R, p, col) => { if (p <= 0) return; const pts = []; for (let i = 0; i <= 96 * p; i++) { const a = -Math.PI / 2 + (i / 96) * Math.PI * 2; pts.push([cx + Math.cos(a) * (R + 0.14), 0.005, cz + Math.sin(a) * (R + 0.14)]); }
      DATA.neon(ctx, () => DATA.path3(ctx, cam, pts), col, 2.4, { alpha: 0.8, core: 0.4 }); };
    ring(C1[0], C1[1], R1, prog(t, T.coating + 0.5, 0.9, ease.inOutCubic), P.lime);
    ring(C2[0], C2[1], R2, prog(t, T.gums + 0.2, 0.8, ease.inOutCubic), P.pink);
    ring(NONE[0], NONE[1], 1.18, prog(t, T.none + 0.1, 0.8, ease.inOutCubic), P.saliva);
    // scan light sweeping across the block (shot B)
    let scanX = null;
    if (t > SHOTS[1] && t < T.coating) { scanX = lerp(-3.4, 3.4, (t - SHOTS[1]) / (T.coating - SHOTS[1])); DATA.neon(ctx, () => DATA.path3(ctx, cam, [[scanX, 0.01, -2.6], [scanX, 0.01, 2.6]]), P.lime, 3, { alpha: 0.9 }); }

    // ---- the dots (depth sorted, blur by distance from focus)
    const list = [];
    for (const d of dots) {
      if (t < d.spawn) continue;
      let w;
      if (t < d.arrive) {
        const k = ease.outCubic(clamp((t - d.spawn) / (d.arrive - d.spawn)));
        const s0 = [SPAWN[0] + d.r1 * 0.6, SPAWN[1] + d.r2 * 0.6, SPAWN[2] + d.r3 * 1.2], e = [d.g[0], DOT_R, d.g[1]];
        w = bez(s0, [(s0[0] + e[0]) / 2, 2.8 + d.r1 * 1.5, (s0[2] + e[2]) / 2], e, k);
      } else {
        w = [d.g[0], DOT_R, d.g[1]]; let from = [d.g[0], d.g[1]];
        for (const L of d.legs) {
          if (t <= L.t0) break;
          const k = ease.inOutCubic(clamp((t - L.t0) / L.d)), a = [from[0], DOT_R, from[1]], b = [L.to[0], DOT_R, L.to[1]];
          w = bez(a, [(a[0] + b[0]) / 2, L.lift, (a[2] + b[2]) / 2], b, k); from = L.to;
        }
      }
      // colour state
      let from = 'base', to = 'base', mk = 0;
      const L0 = d.legs[0], L1 = d.legs[1];
      if (d.group === 'tongue') { to = 'tongue'; mk = clamp((t - L0.t0) / L0.d); }
      else if (d.group === 'both') { if (t < T.gums + 0.3) { to = 'tongue'; mk = clamp((t - L0.t0) / L0.d); } else { from = 'tongue'; to = 'both'; mk = clamp((t - T.gums - 0.3 - d.r1 * 0.4) / 0.4); } }
      else if (d.group === 'gums') { to = 'gums'; mk = clamp((t - L1.t0) / L1.d); }
      else if (d.group === 'other') { to = 'other'; mk = clamp((t - L1.t0) / L1.d); }
      else { to = 'none'; mk = clamp((t - T.none - d.r1 * 0.5) / 0.35); }
      const q = cam.project(w[0], w[1], w[2]); if (!q) continue;
      list.push({ q, from, to, mk, d });
    }
    list.sort((a, b) => b.q.z - a.q.z);
    for (const it of list) {
      const { q, d } = it, blur = Math.min(3, Math.floor(Math.abs(q.z - c.focus) / (c.focus * 0.28)));
      let R = DOT_R * q.s * 2.6 * (1 + blur * 0.35);
      if (scanX != null && t < T.coating) R *= 1 + 0.7 * Math.max(0, 1 - Math.abs(d.g[0] - scanX) / 0.35);
      if (d.group === 'none' && t > T.none) R *= 1 + 0.18 * Math.sin(t * 5 + d.r1 * 30) * prog(t, T.none, 0.5);
      if (R < 0.6) continue;
      if (scanX != null && d.group !== 'x') { const sk = Math.max(0, 1 - Math.abs(d.g[0] - scanX) / 0.3); if (sk > 0 && it.mk < 0.01) { it.to = 'tongue'; it.mk = sk * 0.85; } }
      if (it.mk < 1) { ctx.globalAlpha = 1 - it.mk; ctx.drawImage(spr[it.from][blur], q.x - R, q.y - R, R * 2, R * 2); }
      if (it.mk > 0) { ctx.globalAlpha = it.mk; ctx.drawImage(spr[it.to][blur], q.x - R, q.y - R, R * 2, R * 2); }
    }
    ctx.globalAlpha = 1;
    if (scanX != null) { const q = [[scanX, 0, -2.6], [scanX, 0, 2.6], [scanX, 0.7, 2.6], [scanX, 0.7, -2.6]].map((p) => cam.project(...p)); if (q.every(Boolean)) { ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createLinearGradient(0, q[0].y, 0, q[3].y); g.addColorStop(0, 'rgba(215,243,74,0.35)'); g.addColorStop(1, 'rgba(215,243,74,0)'); ctx.fillStyle = g; ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill(); ctx.restore(); } }
    if (sh.i === 1 || sh.i === 4) DATA.bokeh(ctx, t, { n: 10, seed: 'clinic-bk' + sh.i, alpha: 0.12, size: [120, 320], colors: sh.i === 4 ? ['#8fd8ff', '#a78bfa'] : ['#d7f34a', '#a78bfa'] });

    // ---- 2D overlays anchored to the world
    const at3 = (x, y, z) => cam.project(x, y, z);
    // the counter (shot A)
    if (sh.i === 0) {
      const cnt = Math.min(N, Math.floor(DATA.count(t, T.count0, 1.1, N) + 1e-4));
      const land = t < T.twoK ? 1 : 1 + 0.06 * Math.sin(clamp((t - T.twoK) / 0.45) * Math.PI);
      DATA.big(ctx, DATA.fmt(cnt), 420, 520, { size: 230, p: land, glow: 'rgba(215,243,74,0.3)' });
      DATA.caps(ctx, 'patients', 420, 610, { size: 58, align: 'center', color: P.dim, tracking: 8, alpha: prog(t, T.patients - 0.1, 0.4) });
    } else DATA.kicker(ctx, t, '2,000 patients · bad-breath clinic, Leuven', SHOTS[1]);
    const lab = (str, pct, w, at, o = {}) => {
      const p = pop(t, at, 0.5); if (p <= 0) return; const q = at3(...w); if (!q) return;
      const r = api.label(ctx, str, q.x, q.y, { size: o.size || 46, align: 'center', p, bg: o.bg, color: o.color });
      if (pct) api.text(ctx, pct, q.x + r.w / 2 + 16, q.y + 14, { size: 40, weight: 700, color: o.pctColor || P.ink, alpha: prog(t, at + 0.25, 0.4), shadow: 'rgba(0,0,0,0.7)', shadowBlur: 10 });
    };
    const tongueAt = T.coating + 0.15, gumsAt = T.gums + 0.05;
    if (sh.i >= 2) lab('TONGUE COATING', '43%', [C1[0] - 0.4, 0.25, C1[1] - R1 - 0.55], sh.i === 2 ? tongueAt : SHOTS[sh.i]);
    if (sh.i >= 3) {
      lab('GUMS', '11%', [C2[0] + R2 * 0.55, 0.25, C2[1] - R2 - 0.5], sh.i === 3 ? gumsAt : SHOTS[sh.i], { bg: P.pink });
      lab('BOTH', '18%', [centroidBoth[0], 0.25, centroidBoth[1] + R1 + 0.25], sh.i === 3 ? T.gums + 0.55 : SHOTS[sh.i], { bg: '#f6b26b', size: 40 });
      const o = at3(OTHER[0], 0.2, OTHER[1] + 1.3), kk = sh.i === 3 ? prog(t, T.anything + 0.5, 0.5) : 1;
      if (o && kk > 0) DATA.caps(ctx, 'other', o.x, o.y + 10, { size: 38, align: 'center', color: 'rgba(244,241,234,0.6)', alpha: kk });
    }
    if (sh.i >= 4) lab('NO BAD BREATH AT ALL', '16%', sh.i === 4 ? [NONE[0] - 0.3, 1.25, NONE[1] + 0.9] : [NONE[0], 0.3, NONE[1] - 1.55], sh.i === 4 ? T.none + 0.1 : SHOTS[sh.i], { bg: P.saliva, pctColor: P.saliva, size: sh.i === 4 ? 54 : 46 });
    if (sh.i === 5) {
      const q = at3(NONE[0] - 0.2, 0.2, NONE[1] + 1.55), wr = prog(t, T.worried - 0.25, 0.6, ease.outCubic);
      if (q && wr > 0) api.doodle.text(ctx, 'just worried', q.x, q.y + 30, wr, { color: P.saliva, size: 62, align: 'center', rotate: -0.06, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 8 });
    }
    DATA.source(ctx, t, 'Quirynen et al., J Clin Periodontol 2009 · 2,000 patients, multidisciplinary bad-breath clinic, KU Leuven', { at: 0.5 });
    DATA.finish(ctx, t);
  },
});
