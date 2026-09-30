/* Shared drawing code for the `throat` group: "the trip" (the Magic School Bus device).
 *
 * One stylised mid-sagittal cross-section of the head and body, face to the LEFT, in WORLD units (about one design px
 * at zoom 1): lips, teeth, tongue (with papillae and the coated back third), hard and soft palate, nasal cavity with
 * turbinates, frontal and sphenoid sinuses, the palatine tonsil on the far wall of the oropharynx between its pillars,
 * pharynx, epiglottis, larynx and trachea, the esophagus running down in front of the spine, the diaphragm and far
 * below a simplified stomach with the lower esophageal sphincter (a ring valve).
 *
 *   THROAT.world(ctx, api, cam, t, st)   draw the world through a camera { x, y, z } (world point at screen centre)
 *   THROAT.camAt(t, keys)                keyframed camera: keys [{ t, x, y, z, e }] (zoom interpolated in log space)
 *   THROAT.toScreen(cam, x, y)           world -> screen (design px)
 *   THROAT.tonsil(ctx, cx, cy, h, t, st) the palatine tonsil (same drawing in the world and in the close-ups)
 *   THROAT.crypt(...)                    cross-section of one crypt (food drifts in, swallows compact it to a stone)
 *   THROAT.front(...)                    front view into an open mouth (flashlight scene)
 *   THROAT.icons.*                       cotton swab, finger, pick, water flosser (generic), dial, glass, bottle...
 *
 * Every scene loads this with `// @use videos/bad-breath-for-good/scenes/throat/_lib.js`.
 */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const EASE = {
    io: easeIO,
    sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    quart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
    expo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    lin: (t) => t,
    in2: (t) => t * t, out2: (t) => 1 - (1 - t) * (1 - t),
  };

  // ------------------------------------------------------------------ deterministic helpers (no Math.random)
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const nz = (x, s = 0) => Math.sin(x * 1.7 + s) * 0.5 + Math.sin(x * 3.1 + s * 2.3) * 0.3 + Math.sin(x * 5.3 + s * 0.7) * 0.2;

  // ------------------------------------------------------------------ smooth paths (Catmull-Rom -> Bezier)
  // pts: [[x, y, sharp?], ...]; a truthy third value makes that point a corner.
  function addSmooth(path, pts, closed = true, k = 1, move = true) {
    const n = pts.length, P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    if (move) path.moveTo(pts[0][0], pts[0][1]); else path.lineTo(pts[0][0], pts[0][1]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const s1 = p1[2] ? 0 : k / 6, s2 = p2[2] ? 0 : k / 6;
      path.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * s1, p1[1] + (p2[1] - p0[1]) * s1,
        p2[0] - (p3[0] - p1[0]) * s2, p2[1] - (p3[1] - p1[1]) * s2, p2[0], p2[1]);
    }
    if (closed) path.closePath();
    return path;
  }
  const sp = (pts, closed = true, k = 1) => addSmooth(new Path2D(), pts, closed, k);
  // dense samples of the same spline, with cumulative length (for draw-on, travelling things, normals)
  function sample(pts, closed = false, k = 1, per = 16) {
    const n = pts.length, P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    const out = [], segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const s1 = p1[2] ? 0 : k / 6, s2 = p2[2] ? 0 : k / 6;
      const c1 = [p1[0] + (p2[0] - p0[0]) * s1, p1[1] + (p2[1] - p0[1]) * s1], c2 = [p2[0] - (p3[0] - p1[0]) * s2, p2[1] - (p3[1] - p1[1]) * s2];
      for (let j = i ? 1 : 0; j <= per; j++) {
        const u = j / per, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
        out.push([a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]]);
      }
    }
    let L = 0; out[0][2] = 0;
    for (let i = 1; i < out.length; i++) { L += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]); out[i][2] = L; }
    out.L = L; return out;
  }
  // point + unit tangent at fraction u (0..1) of a sampled polyline
  function at(s, u) {
    const target = clamp(u) * s.L; let lo = 0, hi = s.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m][2] < target) lo = m; else hi = m; }
    const a = s[lo], b = s[hi], seg = b[2] - a[2] || 1, k = (target - a[2]) / seg;
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), tx: dx / d, ty: dy / d, a: Math.atan2(dy, dx) };
  }
  function strokePart(ctx, s, u0, u1) {  // stroke the sampled polyline between fractions u0..u1
    if (u1 <= u0) return;
    const a = at(s, u0), b0 = u0 * s.L, b1 = u1 * s.L;
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    for (const p of s) if (p[2] > b0 && p[2] < b1) ctx.lineTo(p[0], p[1]);
    const b = at(s, u1); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // offset outline of an open centreline with a width function -> closed Path2D (tubes, crypts, streams)
  function tube(s, wf) {
    const L = [], R = [];
    for (let i = 0; i < s.length; i++) {
      const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d, w = wf(s[i][2] / s.L, i) / 2;
      L.push([s[i][0] + nx * w, s[i][1] + ny * w]); R.push([s[i][0] - nx * w, s[i][1] - ny * w]);
    }
    const p = new Path2D(); p.moveTo(L[0][0], L[0][1]);
    for (const q of L) p.lineTo(q[0], q[1]);
    for (let i = R.length - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1]);
    p.closePath(); return p;
  }
  function blobPts(cx, cy, rx, ry, n, amp, seed, rot = 0) {
    const r = rng(seed), ph = [r() * TAU, r() * TAU, r() * TAU], out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, k = 1 + amp * (Math.sin(a * 3 + ph[0]) * 0.5 + Math.sin(a * 5 + ph[1]) * 0.3 + Math.sin(a * 2 + ph[2]) * 0.4);
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return out;
  }

  // ------------------------------------------------------------------ colours (anatomy on the dark stage)
  const C = {
    head: '#34203c', head2: '#261830', skin: '#7a4a64', rim: '#e6b3c8',
    brain: '#43304f', brainLine: '#5a4268', skull: '#b9a896',
    bone: '#d8c8b2', boneDark: '#9c8a76',
    air: '#2a0f22', air2: '#16070f',
    lining: '#e07c95', wallBack: '#b95571',
    tongue: '#ee8497', tongueDeep: '#b24763', tongueLight: '#f7a9b6', coat: '#efe7c4',
    palate: '#e27a90', palateDeep: '#b85069', lip: '#e98193', gum: '#f08da0',
    enamel: '#f7f3ea', dentin: '#eadcbc', pulp: '#e98a9a',
    tonsil: '#ec7690', tonsilDeep: '#a93d59', tonsilLight: '#ffb0c0', crypt: '#3b0c1f', stone: '#f4ecd4', stoneDeep: '#cbbf98',
    eso: '#e5809a', esoDeep: '#a9445f', lumen: '#3a1026',
    stomach: '#ea8c9d', stomachDeep: '#b0506a', rugae: '#c4627a', acid: '#d9cf6a',
    ghost: '#8b7bc0', heart: '#8f4f6b', diaphragm: '#8e4f69',
    lime: '#d7f34a', saliva: '#8fd8ff', gas: '#b9e35a', mucus: '#e6f59a', red: '#ff4d5a', marker: '#ff3b3b',
  };

  // ------------------------------------------------------------------ the world geometry (built once)
  const G = {};
  function build() {
    if (G.ok) return G;
    // head + neck + torso silhouette, face to the left, clockwise from the forehead
    G.headPts = [
      [300, 235], [355, 128], [480, 58], [650, 24], [830, 26], [1010, 62], [1170, 140], [1300, 262], [1376, 420], [1392, 585],
      [1352, 745], [1270, 885], [1212, 995], [1190, 1130], [1186, 1320], [1196, 1520], [1214, 1700], [1240, 1950],
      [1258, 2300], [1256, 2700], [1236, 3100], [1206, 3500], [1190, 3800], [1186, 4100, 1], [470, 4100, 1], [462, 3800],
      [446, 3500], [424, 3100], [404, 2700], [410, 2300], [434, 1950], [476, 1720], [506, 1560], [508, 1380], [496, 1200],
      [468, 1090], [384, 1054], [302, 1026], [258, 988], [236, 940], [230, 890], [240, 858], [222, 842], [202, 818], [206, 796],
      [216, 786], [214, 752], [200, 728], [198, 708], [214, 684], [222, 656], [188, 644], [150, 618], [158, 586], [196, 530],
      [240, 460], [262, 414], [258, 356], [272, 292],
    ];
    G.head = sp(G.headPts);
    // brain (muted context): cerebrum with gyri, cerebellum, brainstem
    G.brainPts = [[420, 300], [470, 190], [590, 118], [770, 92], [960, 116], [1120, 186], [1246, 316], [1300, 460], [1284, 560], [1210, 596],
      [1090, 588], [990, 568], [890, 536], [780, 474], [640, 434], [500, 420], [432, 382]];
    G.brain = sp(G.brainPts);
    G.cerebellum = sp(blobPts(1168, 652, 112, 60, 16, 0.04, 44, 0.12));
    G.brainstem = sp([[900, 526], [956, 556], [996, 620], [1012, 700], [1010, 770], [970, 770], [952, 690], [922, 612], [874, 560]]);
    const bs = sample(G.brainPts, true, 1, 18), bc = [850, 350];
    G.gyri = new Path2D();
    [0.2, 0.4, 0.6].forEach((f, ring) => {
      let pen = false;
      for (let i = 0; i < bs.length; i++) {
        const u = bs[i][2] / bs.L, on = Math.sin(u * TAU * (5 + ring * 2) + ring * 1.7) > -0.35;
        const wob = Math.sin(u * TAU * (26 + ring * 6)) * 9;
        const x = lerp(bs[i][0], bc[0], f), y = lerp(bs[i][1], bc[1], f) + wob;
        if (on) { pen ? G.gyri.lineTo(x, y) : G.gyri.moveTo(x, y); pen = true; } else pen = false;
      }
    });
    G.folia = new Path2D();
    for (let k = -2; k <= 2; k++) { G.folia.moveTo(1080, 652 + k * 20); G.folia.quadraticCurveTo(1170, 640 + k * 22, 1262, 656 + k * 17); }
    G.frontalSinus = sp([[312, 262], [338, 256], [356, 276], [352, 314], [334, 348], [318, 344], [306, 306]]);
    G.sphenoidSinus = sp(blobPts(740, 470, 52, 36, 12, 0.08, 9, -0.1));
    G.maxSinus = sp(blobPts(440, 596, 118, 56, 14, 0.05, 13, 0.04));   // lateral: a dashed ghost, shown only when sinuses glow

    // air spaces (what we look through: the far lateral walls in shadow); all wound the same way so their union clips
    const cw = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a >= 0 ? pts : pts.slice().reverse(); };
    G.nasalPts = cw([[200, 642], [222, 596], [258, 528], [300, 470], [350, 440], [410, 432], [480, 442], [560, 466], [630, 496], [682, 532],
      [706, 580], [710, 630], [698, 662], [620, 668], [500, 672], [380, 672], [290, 666], [232, 658]]);
    G.nasal = sp(G.nasalPts);
    G.pharynxPts = cw([[664, 560], [720, 540], [790, 546], [846, 582], [880, 650], [894, 750], [898, 870], [894, 990], [884, 1100], [874, 1196],
      [820, 1210], [786, 1188], [762, 1140], [736, 1070], [712, 900], [694, 780], [668, 700], [654, 620]]);
    G.pharynx = sp(G.pharynxPts);
    G.oralPts = cw([[208, 758], [236, 742], [300, 720], [420, 710], [560, 708], [650, 712], [694, 736], [716, 792], [704, 852], [620, 800],
      [500, 780], [360, 778], [270, 792], [208, 792]]);
    G.oral = sp(G.oralPts);
    G.larynxPts = cw([[744, 1086], [800, 1092], [812, 1136], [800, 1180], [782, 1212], [772, 1270], [768, 1400], [764, 1600], [758, 1800],
      [754, 1880], [730, 1928], [694, 1930], [666, 1880], [670, 1800], [674, 1600], [678, 1400], [684, 1270], [692, 1216], [704, 1164], [720, 1116]]);
    G.larynx = sp(G.larynxPts);
    G.airAll = new Path2D(); for (const p of [G.nasalPts, G.pharynxPts, G.oralPts, G.larynxPts]) addSmooth(G.airAll, p, true);
    // posterior pharyngeal wall band (mucosa + constrictors), behind the air
    G.backWall = sample([[700, 544], [790, 544], [856, 586], [892, 660], [906, 760], [910, 880], [906, 1000], [896, 1110], [884, 1200]], false, 1, 14);
    // faint folds / glisten on the far wall
    G.wallLines = new Path2D();
    for (let i = 0; i < 5; i++) addSmooth(G.wallLines, [[840 + i * 9, 640], [856 + i * 8, 760], [852 + i * 7, 880], [846 + i * 6, 1000], [836 + i * 5, 1120]], false);

    // hard palate shelf (pink mucosa on both faces, bone core), soft palate, lips, jaw
    G.palate = sp([[238, 652], [300, 646], [400, 655], [520, 659], [640, 663], [664, 674], [668, 698], [640, 710], [520, 714], [400, 714], [312, 716], [288, 712], [268, 704], [252, 690]]);
    G.palateCore = sample([[262, 670], [400, 680], [520, 684], [648, 688]], false, 1, 10);
    G.softPalatePts = [[648, 668], [690, 680], [724, 706], [752, 744], [770, 788], [774, 826], [764, 846], [748, 840], [736, 812], [716, 772], [690, 740], [660, 716], [648, 708]];
    G.softPalate = sp(G.softPalatePts);
    G.upperLip = sp([[224, 652], [208, 680], [196, 708], [200, 732], [214, 754], [238, 750], [248, 724], [246, 690], [240, 664]]);
    G.lowerLip = sp([[214, 790], [200, 810], [204, 836], [226, 852], [246, 840], [250, 810], [240, 792]]);
    G.mandible = sp([[254, 816], [272, 808], [292, 832], [308, 880], [334, 934], [338, 984], [304, 1010], [262, 998], [244, 962], [238, 910], [244, 858]]);
    G.maxilla = sp([[240, 640], [270, 634], [292, 660], [286, 700], [262, 712], [244, 700], [236, 668]]);
    G.hyoid = sp(blobPts(624, 1086, 24, 12, 10, 0.05, 3, -0.15));
    G.thyroid = sp([[626, 1130], [676, 1130], [698, 1168], [696, 1226], [662, 1244], [628, 1230], [616, 1180]]);
    G.cricoid = sp([[786, 1214], [806, 1218], [812, 1270], [798, 1298], [778, 1290], [772, 1248]]);

    // tongue: dorsum (top edge, front to back) + underside
    G.dorsumPts = [[272, 798], [292, 782], [340, 766], [410, 755], [490, 748], [570, 750], [636, 764], [684, 794], [716, 842], [734, 906], [742, 970], [736, 1040]];
    G.tonguePts = G.dorsumPts.concat([[708, 1066], [654, 1072], [600, 1078], [540, 1056], [460, 1014], [380, 970], [330, 934], [300, 886], [280, 844]]);
    G.tongue = sp(G.tonguePts);
    G.dorsum = sample(G.dorsumPts, false, 1, 24);
    // papillae fringe: fine strands along the dorsum, longer toward the back (the shag carpet), coated back third
    G.papFront = new Path2D(); G.papBack = new Path2D(); G.papBack2 = new Path2D();
    const pr = rng(77);
    for (let d = 6; d < G.dorsum.L * 0.93; d += 2.1 + pr() * 1.6) {
      const u = d / G.dorsum.L, p = at(G.dorsum, u), nx = p.ty, ny = -p.tx;       // outward normal (up/back)
      const len = lerp(2, 12, Math.pow(u, 1.25)) * (0.55 + pr() * 0.8), lean = (pr() - 0.5) * 0.7, bend = (pr() - 0.5) * 0.5;
      const path = u > 0.56 ? (pr() < 0.5 ? G.papBack : G.papBack2) : G.papFront;
      const x0 = p.x - nx * 1.5, y0 = p.y - ny * 1.5, x1 = p.x + (nx + p.tx * lean) * len, y1 = p.y + (ny + p.ty * lean) * len;
      path.moveTo(x0, y0); path.quadraticCurveTo((x0 + x1) / 2 + p.tx * bend * len, (y0 + y1) / 2 + p.ty * bend * len, x1, y1);
    }
    // genioglossus fibres fanning from the chin (subtle muscle texture on the cut surface)
    G.fibres = new Path2D();
    for (let i = 0; i < 9; i++) {
      const a = lerp(-1.25, 0.15, i / 8), x0 = 318, y0 = 928;
      G.fibres.moveTo(x0, y0);
      G.fibres.quadraticCurveTo(x0 + Math.cos(a) * 170, y0 + Math.sin(a) * 110 - 40, x0 + Math.cos(a) * 330, y0 + Math.sin(a) * 240 - 40);
    }

    // epiglottis (leaf) + vallecula; vocal folds on the far wall
    G.epiglottis = sp([[724, 1080], [738, 1046], [756, 1010], [778, 982], [798, 968], [808, 976], [798, 1002], [782, 1034], [766, 1070], [752, 1102], [738, 1112]]);
    G.folds = [sp(blobPts(742, 1170, 32, 7, 10, 0.05, 21, 0.1)), sp(blobPts(746, 1198, 34, 6, 10, 0.05, 22, 0.05))];

    // far wall of the oropharynx: pillars around the tonsil, adenoid, turbinates (scrolls on the lateral nasal wall)
    G.tonsilC = { x: 808, y: 884, h: 132 };
    G.pillarFront = sample([[704, 748], [734, 798], [750, 858], [752, 920], [744, 968]], false, 1, 16);
    G.pillarBack = sample([[772, 822], [814, 846], [852, 900], [872, 980], [878, 1060]], false, 1, 16);
    G.adenoid = sp(blobPts(814, 590, 38, 20, 12, 0.12, 31, 0.6));
    const turb = (x0, x1, yTop, th, curl) => {
      const L = x1 - x0;
      return [[x0 + L * 0.01, yTop + th * 0.5], [x0 + L * 0.07, yTop + th * 0.02], [x0 + L * 0.3, yTop - th * 0.14], [x0 + L * 0.6, yTop - th * 0.04], [x0 + L * 0.88, yTop + th * 0.18],
        [x1, yTop + th * 0.44], [x0 + L * 0.9, yTop + th * 0.7], [x0 + L * 0.6, yTop + th * 0.78], [x0 + L * 0.32, yTop + th * 0.9], [x0 + L * 0.13, yTop + th * 1.15 + curl], [x0 + L * 0.04, yTop + th * 1.05 + curl]];
    };
    G.turbPts = [turb(500, 640, 486, 26, 4), turb(390, 668, 526, 34, 8), turb(280, 690, 590, 42, 10)];
    G.turbinates = G.turbPts.map((p) => sp(p));
    G.turbShadow = G.turbPts.map((p) => sp(p.map(([x, y, s]) => [x + 6, y + 10, s])));

    // incisors (cut through the midline): incisal tip, axis angle, length, width
    G.upperIncisor = { x: 258, y: 760, a: -1.36, L: 128, w: 40 };
    G.lowerIncisor = { x: 263, y: 782, a: 1.44, L: 110, w: 32 };

    // spine: vertebral bodies along a centreline
    G.spine = sample([[950, 720], [944, 850], [942, 1000], [946, 1150], [956, 1300], [972, 1450], [992, 1600], [1012, 1800], [1028, 2100],
      [1032, 2400], [1022, 2700], [1006, 3000], [1000, 3300], [1004, 3600], [1012, 4100]], false, 1, 20);
    // chest: sternum, ghost lungs, diaphragm, trachea rings
    G.sternum = sample([[520, 1790], [500, 2000], [478, 2250], [462, 2500]], false, 1, 12);
    G.lungs = sp([[640, 1880], [760, 1860], [900, 1900], [1080, 1960], [1170, 2150], [1190, 2450], [1160, 2700], [1040, 2760], [880, 2720],
      [760, 2700], [640, 2660], [560, 2560], [540, 2300], [560, 2060]]);
    G.diaphragm = sample([[420, 2830], [500, 2760], [620, 2716], [760, 2706], [900, 2694], [1050, 2724], [1206, 2820]], false, 1, 16);
    G.rings = [];
    for (let y = 1290; y < 1880; y += 42) { const x = y < 1400 ? lerp(684, 678, (y - 1270) / 130) : y < 1600 ? lerp(678, 674, (y - 1400) / 200) : y < 1800 ? lerp(674, 670, (y - 1600) / 200) : lerp(670, 664, (y - 1800) / 160); G.rings.push([x, y]); }

    // esophagus: centreline from the bottom of the laryngopharynx to the stomach (the LES sits at its end)
    G.esoPts = [[846, 1170], [846, 1300], [846, 1500], [848, 1750], [852, 2000], [854, 2250], [846, 2450], [826, 2600], [800, 2700], [778, 2766], [764, 2822]];
    G.eso = sample(G.esoPts, false, 1, 20);
    { let b = 0, bd = 1e9; for (const p of G.eso) { const d = Math.hypot(p[0] - 779, p[1] - 2762); if (d < bd) { bd = d; b = p[2] / G.eso.L; } } G.lesU = b; }
    G.les = { x: 777, y: 2768 };
    // stomach (J-shaped sac hanging below the diaphragm), its lining and rugae
    G.stomachPts = [[724, 2806], [752, 2770], [792, 2748], [852, 2740], [924, 2764], [966, 2830], [972, 2930], [946, 3060], [890, 3190], [800, 3290],
      [690, 3336], [586, 3322], [512, 3272], [480, 3206], [488, 3142], [540, 3150], [616, 3176], [690, 3148], [734, 3060], [740, 2950], [726, 2862]];
    G.stomach = sp(G.stomachPts);
    G.stomachInner = sp(G.stomachPts.map(([x, y]) => [lerp(x, 740, 0.1), lerp(y, 3040, 0.1)]));
    G.rugae = new Path2D();
    for (let i = 0; i < 7; i++) {
      const y0 = 2860 + i * 58, pts = [];
      for (let k = 0; k <= 6; k++) pts.push([640 + k * 50 - i * 18, y0 + Math.sin(k * 1.4 + i) * 12 + k * (i * 2 - 4)]);
      addSmooth(G.rugae, pts, false);
    }
    G.duodenum = sample([[492, 3170], [456, 3196], [440, 3240]], false, 1, 12);

    // the trip route (lips -> over the tongue -> tonsils -> down the pharynx -> esophagus -> stomach)
    G.routePts = [[120, 772], [214, 772], [320, 740], [450, 731], [580, 731], [664, 752], [728, 800], [790, 870], [822, 980], [838, 1100],
      [846, 1250], [846, 1500], [849, 1750], [853, 2000], [854, 2250], [846, 2450], [826, 2600], [800, 2700], [776, 2780], [800, 2900], [830, 2990]];
    G.route = sample(G.routePts, false, 1, 18);
    // route fractions of the stops, measured once
    const near = (x, y) => { let best = 0, bd = 1e9; for (const p of G.route) { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = p[2] / G.route.L; } } return best; };
    G.stops = { lips: near(214, 772), teeth: near(262, 762), tongue: near(580, 731), tongueBack: near(664, 752), tonsils: near(790, 870),
      throat: near(838, 1100), esophagus: near(846, 1500), valve: near(776, 2780), stomach: near(830, 2990) };
    G.ok = true; return G;
  }

  // ------------------------------------------------------------------ camera
  const W = 1920, H = 1080;
  function applyCam(ctx, c) { ctx.translate(W / 2, H / 2); ctx.scale(c.z, c.z); if (c.r) ctx.rotate(c.r); ctx.translate(-c.x, -c.y); }
  function toScreen(c, x, y) {
    let dx = x - c.x, dy = y - c.y;
    if (c.r) { const cs = Math.cos(c.r), sn = Math.sin(c.r); [dx, dy] = [dx * cs - dy * sn, dx * sn + dy * cs]; }
    return [W / 2 + dx * c.z, H / 2 + dy * c.z];
  }
  // keys: [{ t, x, y, z, e: 'io'|'sine'|'quart'|'expo'|'out'|'lin', r }]; a gentle float keeps it alive
  function camAt(t, keys, o = {}) {
    let c;
    if (t <= keys[0].t) c = { ...keys[0] };
    else if (t >= keys[keys.length - 1].t) c = { ...keys[keys.length - 1] };
    else {
      let i = 0; while (i < keys.length - 2 && t > keys[i + 1].t) i++;
      const a = keys[i], b = keys[i + 1], u = (EASE[b.e || 'io'] || easeIO)(clamp((t - a.t) / (b.t - a.t)));
      c = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), r: lerp(a.r || 0, b.r || 0, u) };
    }
    const f = o.float ?? 5, tf = t + (o.t0 || 0);   // screen px of drift; t0 = time offset so continuous scenes match
    c.x += nz(tf * 0.35, 1.3) * f / c.z; c.y += nz(tf * 0.3, 4.1) * f / c.z;
    return c;
  }
  const view = (c) => ({ x0: c.x - W / 2 / c.z, y0: c.y - H / 2 / c.z, x1: c.x + W / 2 / c.z, y1: c.y + H / 2 / c.z });
  const inView = (v, x0, y0, x1, y1, pad = 0) => !(x1 < v.x0 - pad || x0 > v.x1 + pad || y1 < v.y0 - pad || y0 > v.y1 + pad);

  // ------------------------------------------------------------------ gradients cached per context
  const gcache = new WeakMap();
  function grad(ctx, key, make) {
    let m = gcache.get(ctx); if (!m) { m = {}; gcache.set(ctx, m); }
    return m[key] || (m[key] = make(ctx));
  }
  function lin(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) g.addColorStop(o, c); return g; }
  function rad(ctx, x0, y0, r0, x1, y1, r1, stops) { const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1); for (const [o, c] of stops) g.addColorStop(o, c); return g; }
  function glow(ctx, x, y, r, color, a = 1) {
    ctx.save(); ctx.globalAlpha *= a;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  // ------------------------------------------------------------------ teeth (sagittal wedge profile)
  function toothPath(o) {
    const { x, y, a, L, w } = o, ca = Math.cos(a), sa = Math.sin(a), nxv = -sa, nyv = ca;
    const P = (s, n) => [x + ca * s + nxv * n, y + sa * s + nyv * n];
    // labial side then lingual side, incisal edge at s=0, apex at s=L
    const pts = [P(0, -w * 0.12), P(L * 0.1, -w * 0.4), P(L * 0.36, -w * 0.52), P(L * 0.5, -w * 0.44), P(L * 0.78, -w * 0.24), P(L, 0),
      P(L * 0.78, w * 0.24), P(L * 0.5, w * 0.44), P(L * 0.38, w * 0.54), P(L * 0.18, w * 0.34), P(L * 0.02, w * 0.12)];
    return sp(pts);
  }
  function drawTooth(ctx, o) {
    const p = toothPath(o), ca = Math.cos(o.a), sa = Math.sin(o.a);
    ctx.save();
    ctx.fillStyle = lin(ctx, o.x, o.y, o.x + ca * o.L, o.y + sa * o.L, [[0, C.enamel], [0.42, '#efe6d2'], [0.5, C.dentin], [1, '#d9c7a0']]);
    ctx.fill(p);
    ctx.clip(p);
    // pulp canal
    ctx.strokeStyle = C.pulp; ctx.lineWidth = o.w * 0.12; ctx.lineCap = 'round'; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(o.x + ca * o.L * 0.3, o.y + sa * o.L * 0.3); ctx.lineTo(o.x + ca * o.L * 0.95, o.y + sa * o.L * 0.95); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(120,90,70,0.5)'; ctx.lineWidth = 1.2; ctx.stroke(p); ctx.restore();
  }

  // ------------------------------------------------------------------ the palatine tonsil (world + close-ups)
  // crypt layout in unit coordinates of the tonsil (u right, v down; the almond is 1 x 1): the same pits everywhere.
  // l = length, r = roundness (0 slit .. 1 round pit)
  const CRYPTS = [
    { u: -0.34, v: -0.58, a: 0.35, l: 0.24, r: 0.35 }, { u: 0.26, v: -0.5, a: -0.45, l: 0.2, r: 0.5 }, { u: -0.04, v: -0.18, a: 0.12, l: 0.34, r: 0.28 },
    { u: 0.46, v: -0.06, a: 0.9, l: 0.18, r: 0.45 }, { u: -0.48, v: 0.14, a: -0.3, l: 0.2, r: 0.6 }, { u: 0.16, v: 0.28, a: 0.22, l: 0.3, r: 0.3 },
    { u: -0.22, v: 0.56, a: -0.12, l: 0.2, r: 0.55 }, { u: 0.34, v: 0.62, a: 0.5, l: 0.15, r: 0.7 },
  ];
  const tonsilCache = {};
  function tonsilOutline(h) {
    const key = 'o' + Math.round(h * 100);
    if (tonsilCache[key]) return tonsilCache[key];
    const pts = [], n = 64, rx = h * 0.34, ry = h * 0.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, lob = 1 + 0.008 * Math.sin(a * 4 + 0.6);
      const taper = 1 - 0.14 * Math.max(0, Math.sin(a)) * Math.abs(Math.cos(a));   // almond: narrower toward the lower pole
      pts.push([Math.cos(a) * rx * lob * taper, Math.sin(a) * ry * lob]);
    }
    const pores = [], r = rng(99);
    for (let i = 0; i < 40; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.86; pores.push([Math.cos(a) * rx * d, Math.sin(a) * ry * d, h * (0.004 + r() * 0.005)]); }
    const lobes = [], r2 = rng(12);
    for (let i = 0; i < 14; i++) { const a = r2() * TAU, d = Math.sqrt(r2()) * 0.8; lobes.push([Math.cos(a) * rx * d, Math.sin(a) * ry * d, h * (0.1 + r2() * 0.07)]); }
    return (tonsilCache[key] = { path: sp(pts), rx, ry, pores, lobes });
  }
  // crypt k in tonsil-local coords (origin at centre, scale h)
  function cryptPos(k, h) { const c = CRYPTS[k]; return { x: c.u * h * 0.34, y: c.v * h * 0.5, a: c.a, l: c.l * h * 0.5, w: lerp(0.14, 0.42, c.r) * c.l * h * 0.5 }; }
  function cryptShape(k, h) {
    const key = 'c' + k + '_' + Math.round(h * 10);
    if (!tonsilCache[key]) { const c = cryptPos(k, h); tonsilCache[key] = sp(blobPts(0, 0, c.l * 0.5, 1, 12, 0.16, 300 + k)); }
    return tonsilCache[key];
  }
  /* st: { open (crypt opening, default 1), stones: [sizes 0..1 per crypt], stoneOut: { k, p, dx, dy } (popping out 0..1),
          wiggle: { k, amp }, red (inflammation 0..1), flinch (0..1 squash), specks (0..1), glow (lime rim 0..1),
          clean (0..1 lime rings in the pits), glowPits: [alpha per crypt], detail (0..1), scratch (0..1) } */
  function tonsil(ctx, cx, cy, h, t, st = {}) {
    const o = tonsilOutline(h), open = st.open ?? 1;
    ctx.save(); ctx.translate(cx, cy);
    if (st.rot) ctx.rotate(st.rot);
    if (st.flinch) { const f = st.flinch; ctx.scale(1 + 0.05 * f, 1 - 0.07 * f); }
    glow(ctx, h * 0.05, h * 0.1, h * 0.66, 'rgba(18,0,10,0.6)', 1);             // contact shadow on the wall
    ctx.fillStyle = rad(ctx, -o.rx * 0.4, -o.ry * 0.45, h * 0.04, 0, 0, h * 0.62, [[0, C.tonsilLight], [0.38, C.tonsil], [1, C.tonsilDeep]]);
    ctx.fill(o.path);
    ctx.save(); ctx.clip(o.path);
    // lobules (lymphoid bulges under the surface): lit top-left, shaded bottom-right
    const det = st.detail ?? 1;
    for (const [x, y, rr] of o.lobes) {
      glow(ctx, x - rr * 0.25, y - rr * 0.3, rr * 0.9, 'rgba(255,200,212,0.55)', 0.5 * det);
      glow(ctx, x + rr * 0.35, y + rr * 0.45, rr * 0.8, 'rgba(120,20,55,0.5)', 0.35 * det);
    }
    ctx.fillStyle = 'rgba(120,25,60,0.35)';
    for (const [x, y, rr] of o.pores) { ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); }
    if (st.red) { ctx.fillStyle = `rgba(255,40,60,${0.4 * st.red})`; ctx.fill(o.path); glow(ctx, 0, 0, h * 0.5, `rgba(255,60,60,${0.5 * st.red})`); }
    // rim darkening (the surface curving away) and a specular sheen
    ctx.strokeStyle = 'rgba(80,5,35,0.5)'; ctx.lineWidth = h * 0.1; ctx.stroke(o.path);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,238,242,0.5)'; ctx.lineWidth = h * 0.022;
    ctx.beginPath(); ctx.ellipse(-o.rx * 0.06, -o.ry * 0.04, o.rx * 0.74, o.ry * 0.8, 0, Math.PI * 1.08, Math.PI * 1.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,238,242,0.3)'; ctx.lineWidth = h * 0.012;
    ctx.beginPath(); ctx.ellipse(-o.rx * 0.06, -o.ry * 0.04, o.rx * 0.62, o.ry * 0.7, 0, Math.PI * 1.5, Math.PI * 1.62); ctx.stroke();
    // scratches (dont-dig): thin red lines
    if (st.scratch) {
      ctx.strokeStyle = `rgba(255,60,80,${0.9 * st.scratch})`; ctx.lineWidth = h * 0.008;
      const sr = rng(66);
      for (let i = 0; i < 5; i++) { const x = (sr() - 0.5) * o.rx, y = (sr() - 0.3) * o.ry, a = -0.6 + sr() * 0.5, L = h * (0.08 + sr() * 0.08) * clamp(st.scratch * 1.5 - i * 0.12);
        if (L > 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke(); } }
    }
    // crypts: dark pits with a lit lower lip and a shaded upper edge
    for (let k = 0; k < CRYPTS.length; k++) {
      const c = cryptPos(k, h), pth = cryptShape(k, h), ww = Math.max(h * 0.006, c.w * open * (1 + 0.06 * Math.sin(t * 1.3 + k)));
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
      // soft depression around the pit, then the dark opening, then a thin lit lower lip
      ctx.save(); ctx.scale(1, Math.min(1, (ww * 2.6) / c.l)); glow(ctx, 0, 0, c.l * 0.75, 'rgba(100,15,48,0.42)'); ctx.restore();
      ctx.save(); ctx.scale(1, ww);
      ctx.fillStyle = rad(ctx, 0, -0.2, 0, 0, 0, c.l * 0.5, [[0, '#16030c'], [0.65, C.crypt], [1, '#6e1f3b']]); ctx.fill(pth);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,214,224,0.75)'; ctx.lineWidth = h * 0.007; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(0, ww * 0.18, c.l * 0.44, ww * 1.02, 0, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke();
      if (st.clean) { ctx.strokeStyle = rgba(C.lime, 0.9 * st.clean); ctx.lineWidth = h * 0.011; ctx.beginPath(); ctx.ellipse(0, 0, c.l * 0.6, ww * 1.35 + h * 0.014, 0, 0, TAU); ctx.stroke(); }
      const gp = st.glowPits ? st.glowPits[k] || 0 : 0;
      if (gp > 0) { ctx.strokeStyle = rgba(C.lime, gp); ctx.beginPath(); ctx.ellipse(0, 0, c.l * 0.66, ww * 1.6 + h * 0.02, 0, 0, TAU); ctx.lineWidth = h * 0.014; ctx.stroke(); }
      ctx.restore();
      const sz = st.stones ? st.stones[k] || 0 : 0;
      if (sz > 0) {
        let sx = c.x, sy = c.y, rot = c.a;
        if (st.wiggle && st.wiggle.k === k) { rot += Math.sin(t * 24) * 0.22 * st.wiggle.amp; sx += Math.sin(t * 19) * h * 0.008 * st.wiggle.amp; }
        const so = st.stoneOut && st.stoneOut.k === k ? st.stoneOut : null, out = so ? so.p : 0;
        if (out < 0.02) stone(ctx, sx, sy, Math.min(c.l * 0.42, h * 0.07) * sz, t, { seed: 100 + k, rot, shine: st.shine ?? 0.6 });
      }
    }
    // white specks (seen with the flashlight): tiny bits of stone showing in the pits
    if (st.specks) {
      const r2 = rng(5);
      for (let i = 0; i < 12; i++) {
        const c = cryptPos(i % CRYPTS.length, h), a = r2() * TAU, s = h * (0.02 + r2() * 0.016) * clamp(st.specks * 1.8 - i * 0.07);
        if (s > 0) { glow(ctx, c.x + Math.cos(a) * c.l * 0.2, c.y + Math.sin(a) * c.w * 0.3, s * 2.2, 'rgba(255,255,240,0.5)'); ctx.fillStyle = '#fffbea'; ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * c.l * 0.2, c.y + Math.sin(a) * c.w * 0.3, s, 0, TAU); ctx.fill(); }
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,195,210,0.6)'; ctx.lineWidth = h * 0.009; ctx.stroke(o.path);
    if (st.glow) { ctx.save(); ctx.scale(1.1, 1.07); ctx.strokeStyle = rgba(C.lime, 0.9 * st.glow); ctx.lineWidth = h * 0.02; ctx.stroke(o.path); ctx.restore(); }
    // a stone popping out of its crypt (drawn above everything, can leave the tonsil)
    if (st.stoneOut && st.stoneOut.p > 0.02 && st.stones && st.stones[st.stoneOut.k]) {
      const so = st.stoneOut, c = cryptPos(so.k, h), sz = st.stones[so.k];
      stone(ctx, c.x + (so.dx || 0) * h, c.y + (so.dy || 0) * h, Math.min(c.l * 0.42, h * 0.07) * sz * (1 + 0.3 * clamp(so.p * 3)), t, { seed: 100 + so.k, rot: c.a + (so.spin || 0), shine: 0.7 });
    }
    ctx.restore();
  }
  // a tonsil stone: lumpy cream nugget with shading and pores
  function stone(ctx, x, y, r, t, o = {}) {
    if (r <= 0.2) return;
    const key = 's' + (o.seed || 1);
    if (!tonsilCache[key]) tonsilCache[key] = sp(blobPts(0, 0, 1, 0.86, 14, 0.12, o.seed || 1));
    const p = tonsilCache[key];
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(r, r);
    glow(ctx, 0.15, 0.3, 1.9, 'rgba(0,0,0,0.35)', 1);
    if (o.glowC) glow(ctx, 0, 0, 2.6, o.glowC, 1);
    ctx.fillStyle = rad(ctx, -0.35, -0.4, 0.05, 0, 0, 1.2, [[0, '#fffdf4'], [0.5, C.stone], [1, C.stoneDeep]]);
    ctx.fill(p);
    ctx.save(); ctx.clip(p);
    const r2 = rng(o.seed || 1);
    ctx.fillStyle = 'rgba(160,140,90,0.35)';
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc((r2() - 0.5) * 1.4, (r2() - 0.5) * 1.2, 0.06 + r2() * 0.08, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (o.shine) { ctx.globalAlpha *= o.shine; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(-0.35, -0.42, 0.22, 0.12, -0.5, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // ------------------------------------------------------------------ the world
  /* st (all optional):
       route: [u0, u1] dotted lime trip line drawn between route fractions; probe: u (glowing traveller)
       tonsilGlow, tonsil: {...tonsil st}, coat (0..1), stomachGlow, valve (0 closed .. 1 open), valveGlow, bolus: u on esophagus,
       reflux: 0..1 (puff travelling up from the valve), acid: slosh amount, sinusGlow, drip: 0..1, water: 0..1 (gargle),
       spot: { x, y, r, a } darkens everything outside a world circle */
  function world(ctx, api, cam, t, st = {}) {
    build();
    const z = cam.z, px = 1 / z, v = view(cam);
    ctx.save(); applyCam(ctx, cam);
    // --- silhouette
    ctx.fillStyle = grad(ctx, 'head', (c) => lin(c, 0, 0, 0, 4100, [[0, C.head], [0.35, C.head2], [1, '#1d1226']])); ctx.fill(G.head);
    ctx.save(); ctx.clip(G.head);
    ctx.strokeStyle = C.skin; ctx.lineWidth = 34; ctx.globalAlpha = 0.5; ctx.stroke(G.head); ctx.globalAlpha = 1;
    // --- brain (muted), lungs (ghost)
    if (inView(v, 400, 80, 1320, 780)) {
      ctx.strokeStyle = C.skull; ctx.globalAlpha = 0.34; ctx.lineWidth = 24; ctx.stroke(G.brain); ctx.stroke(G.cerebellum); ctx.globalAlpha = 1;
      ctx.fillStyle = grad(ctx, 'brain', (c) => rad(c, 760, 240, 40, 820, 380, 560, [[0, '#5a4470'], [1, C.brain]])); ctx.fill(G.brain);
      ctx.fillStyle = '#3d2b4a'; ctx.fill(G.brainstem); ctx.fillStyle = '#4a3558'; ctx.fill(G.cerebellum);
      ctx.strokeStyle = C.brainLine; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(G.gyri);
      ctx.save(); ctx.clip(G.cerebellum); ctx.lineWidth = 4; ctx.stroke(G.folia); ctx.restore();
    }
    if (inView(v, 400, 1800, 1250, 2900)) {
      ctx.fillStyle = rgba(C.ghost, 0.09); ctx.fill(G.lungs); ctx.strokeStyle = rgba(C.ghost, 0.22); ctx.lineWidth = 2.5 * px; ctx.stroke(G.lungs);
      ctx.strokeStyle = rgba(C.ghost, 0.28); ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(700, 1900); ctx.quadraticCurveTo(660, 1990, 600, 2080); ctx.moveTo(724, 1900); ctx.quadraticCurveTo(800, 1990, 880, 2060); ctx.stroke();
    }
    // --- bones (muted so the airway reads first)
    const boneG = grad(ctx, 'bone', (c) => lin(c, 0, 0, 1400, 0, [[0, C.bone], [1, '#c2b09a']])); ctx.fillStyle = boneG;
    ctx.strokeStyle = C.boneDark; ctx.lineWidth = Math.max(1, 2 * px);
    ctx.globalAlpha = 0.14;
    for (let d = 40; d < G.spine.L; d += 104) {
      const p = at(G.spine, d / G.spine.L); if (!inView(v, p.x - 90, p.y - 90, p.x + 150, p.y + 90)) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a - Math.PI / 2);
      api.roundRect(ctx, -50, -40, 100, 80, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(30,14,40,0.9)'; api.roundRect(ctx, 62, -32, 24, 64, 10); ctx.fill();   // spinal canal
      ctx.fillStyle = boneG;
      ctx.restore();
    }
    ctx.globalAlpha = 0.5;
    ctx.fill(G.mandible); ctx.stroke(G.mandible); ctx.fill(G.maxilla); ctx.fill(G.hyoid);
    ctx.fill(G.thyroid); ctx.stroke(G.thyroid); ctx.fill(G.cricoid);
    if (inView(v, 400, 1750, 600, 2550)) { ctx.globalAlpha = 0.25; ctx.lineWidth = 30; ctx.lineCap = 'round'; ctx.strokeStyle = C.bone; strokePart(ctx, G.sternum, 0, 1); }
    ctx.globalAlpha = 1;
    // --- sinuses (air pockets in bone, pink lining); the lateral maxillary sinus appears as a dashed ghost when lit
    const sg = st.sinusGlow || 0;
    for (const s of [G.frontalSinus, G.sphenoidSinus]) {
      ctx.fillStyle = C.air; ctx.fill(s); ctx.strokeStyle = sg ? rgba(C.lime, 0.4 + 0.6 * sg) : C.lining; ctx.lineWidth = sg ? 4 + 4 * sg : 4; ctx.stroke(s);
    }
    // --- posterior pharyngeal wall band, behind the air
    ctx.strokeStyle = C.wallBack; ctx.lineWidth = 34; ctx.lineCap = 'round'; strokePart(ctx, G.backWall, 0, 1);
    // --- air spaces: lining stroke first, then the fills (so outlines only show where air meets tissue)
    ctx.strokeStyle = C.lining; ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.stroke(G.airAll);
    const airG = grad(ctx, 'air', (c) => lin(c, 0, 440, 0, 1300, [[0, '#3a1530'], [0.45, C.air], [1, C.air2]]));
    ctx.fillStyle = airG; ctx.fill(G.airAll);
    ctx.save(); ctx.clip(G.airAll);
    ctx.strokeStyle = 'rgba(200,90,130,0.16)'; ctx.lineWidth = 60; ctx.stroke(G.airAll);          // far wall curving toward us
    ctx.strokeStyle = 'rgba(255,160,190,0.07)'; ctx.lineWidth = 3; ctx.stroke(G.wallLines);
    glow(ctx, 812, 890, 170, 'rgba(210,90,130,0.3)');                                                // light on the tonsil's wall
    glow(ctx, 470, 560, 200, 'rgba(210,90,130,0.12)');
    // turbinates: scrolls on the lateral wall of the nose, each with a shadow (the meatus) under it
    for (const p of G.turbShadow) { ctx.fillStyle = 'rgba(10,0,8,0.55)'; ctx.fill(p); }
    ctx.fillStyle = grad(ctx, 'turb', (c) => lin(c, 0, 470, 0, 640, [[0, '#e08aa0'], [1, '#9c4462']]));
    for (const p of G.turbinates) ctx.fill(p);
    ctx.strokeStyle = 'rgba(255,200,215,0.45)'; ctx.lineWidth = 2.5; for (const p of G.turbinates) ctx.stroke(p);
    ctx.fillStyle = '#b8566f'; ctx.fill(G.adenoid);
    ctx.fillStyle = '#c86a82'; for (const f of G.folds) ctx.fill(f);
    ctx.restore();
    if (sg) {
      glow(ctx, 332, 300, 80, rgba(C.lime, 0.35 * sg)); glow(ctx, 740, 470, 100, rgba(C.lime, 0.35 * sg));
    }
    // --- incisors (their roots end up under the palate, tongue and lips drawn next)
    drawTooth(ctx, G.upperIncisor); drawTooth(ctx, G.lowerIncisor);
    // --- the oropharynx far wall: back pillar, tonsil, front pillar
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#a84862'; ctx.lineWidth = 22; strokePart(ctx, G.pillarBack, 0, 1);
    ctx.strokeStyle = 'rgba(255,170,190,0.3)'; ctx.lineWidth = 3.5; strokePart(ctx, G.pillarBack, 0.05, 0.95);
    const T = G.tonsilC;
    if (st.tonsilGlow) glow(ctx, T.x, T.y, T.h * 0.9, rgba(C.lime, 0.35 * st.tonsilGlow));
    tonsil(ctx, T.x, T.y, T.h, t, { ...(st.tonsil || {}), glow: st.tonsilGlow || 0 });
    ctx.strokeStyle = '#d06a84'; ctx.lineWidth = 22; strokePart(ctx, G.pillarFront, 0, 1);
    ctx.strokeStyle = 'rgba(255,195,210,0.5)'; ctx.lineWidth = 3.5; strokePart(ctx, G.pillarFront, 0.05, 0.95);
    // --- gargle water (in the back of the mouth and the throat) + bubbles
    if (st.water) waterFill(ctx, t, st.water, st.waterLevel);
    // --- cut-surface soft tissue: palate shelf, soft palate, tongue, epiglottis
    ctx.fillStyle = grad(ctx, 'pal', (c) => lin(c, 0, 648, 0, 718, [[0, '#e48399'], [0.5, '#f29db0'], [1, C.gum]])); ctx.fill(G.palate);
    ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = C.bone; ctx.lineWidth = 16; ctx.lineCap = 'round'; strokePart(ctx, G.palateCore, 0, 1); ctx.restore();
    ctx.strokeStyle = 'rgba(255,200,212,0.5)'; ctx.lineWidth = 2.5; ctx.stroke(G.palate);
    ctx.fillStyle = grad(ctx, 'soft', (c) => lin(c, 650, 680, 760, 840, [[0, C.palate], [1, C.palateDeep]])); ctx.fill(G.softPalate);
    ctx.strokeStyle = 'rgba(255,190,205,0.55)'; ctx.lineWidth = 3; ctx.stroke(G.softPalate);
    ctx.fillStyle = grad(ctx, 'tongue', (c) => lin(c, 0, 740, 0, 1070, [[0, C.tongue], [0.55, '#d4667f'], [1, C.tongueDeep]])); ctx.fill(G.tongue);
    ctx.save(); ctx.clip(G.tongue); ctx.strokeStyle = 'rgba(120,20,50,0.16)'; ctx.lineWidth = 5; ctx.stroke(G.fibres);
    glow(ctx, 470, 800, 160, 'rgba(255,200,215,0.25)'); ctx.restore();
    ctx.strokeStyle = 'rgba(255,200,212,0.6)'; ctx.lineWidth = 2.5; ctx.stroke(G.tongue);
    // coated back third (under the strands), then the papillae fringe
    const coat = st.coat ?? 0.7;
    if (coat > 0) { ctx.strokeStyle = rgba(C.coat, 0.55 * coat); ctx.lineWidth = 5; ctx.lineCap = 'round'; strokePart(ctx, G.dorsum, 0.56, 0.93); }
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.tongueLight; ctx.stroke(G.papFront);
    ctx.lineWidth = 1.7; ctx.strokeStyle = rgba('#f3e2c4', 0.45 + 0.5 * coat); ctx.stroke(G.papBack);
    ctx.strokeStyle = rgba('#e9c9a8', 0.4 + 0.5 * coat); ctx.stroke(G.papBack2);
    ctx.fillStyle = grad(ctx, 'epi', (c) => lin(c, 720, 970, 800, 1110, [[0, '#f4a2b3'], [1, '#c45b76']])); ctx.fill(G.epiglottis);
    ctx.strokeStyle = 'rgba(255,220,225,0.6)'; ctx.lineWidth = 2; ctx.stroke(G.epiglottis);
    // --- trachea rings, esophagus (a pink muscular tube), the valve + stomach
    ctx.fillStyle = 'rgba(216,200,178,0.5)';
    for (const [x, y] of G.rings) if (y > v.y0 - 20 && y < v.y1 + 20) { ctx.beginPath(); ctx.ellipse(x - 4, y, 8, 13, 0, 0, TAU); ctx.fill(); }
    esophagus(ctx, t, st, v, px);
    // --- lips
    ctx.fillStyle = grad(ctx, 'lip', (c) => lin(c, 190, 0, 250, 0, [[0, '#f09aa8'], [1, '#c45e74']])); ctx.fill(G.upperLip); ctx.fill(G.lowerLip);
    ctx.strokeStyle = 'rgba(255,210,220,0.45)'; ctx.lineWidth = 2; ctx.stroke(G.upperLip); ctx.stroke(G.lowerLip);
    // --- sinus drip (postnasal): drops run from the back of the nose down the throat wall onto the back of the tongue
    if (st.drip) drip(ctx, t, st.drip, st.dripA ?? 1);
    // fade out the bottom of the torso
    if (v.y1 > 3450) { ctx.fillStyle = grad(ctx, 'tfade', (c) => lin(c, 0, 3450, 0, 4050, [[0, 'rgba(11,10,24,0)'], [1, 'rgba(11,10,24,1)']])); ctx.fillRect(300, 3450, 1100, 700); }
    ctx.restore();   // end of head clip
    // --- rim light on the silhouette
    ctx.strokeStyle = rgba(C.rim, 0.55); ctx.lineWidth = 2.6 * px; ctx.stroke(G.head);
    ctx.strokeStyle = 'rgba(167,139,250,0.18)'; ctx.lineWidth = 12 * px; ctx.stroke(G.head);
    // --- the trip route + traveller
    if (st.route) route(ctx, t, st.route[0], st.route[1], px, st.routeAlpha ?? 1);
    if (st.probe != null) probe(ctx, t, st.probe, px, st.probeAlpha ?? 1);
    ctx.restore();
    if (st.spot) spotlight(ctx, cam, st.spot);
  }

  function esophagus(ctx, t, st, v, px) {
    const E = G.eso;
    if (!inView(v, 700, 1150, 1000, 3400, 60) && !inView(v, 420, 2700, 1000, 3420)) return;
    // diaphragm (under the tube)
    if (inView(v, 400, 2650, 1250, 2860)) {
      ctx.strokeStyle = rgba(C.diaphragm, 0.85); ctx.lineWidth = 30; ctx.lineCap = 'round'; strokePart(ctx, G.diaphragm, 0, 1);
      ctx.strokeStyle = 'rgba(255,180,200,0.22)'; ctx.lineWidth = 3; strokePart(ctx, G.diaphragm, 0, 1);
    }
    const valve = st.valve || 0, bolus = st.bolus;
    // valve ring: back half first (behind the tube)
    valveRing(ctx, t, valve, st.valveGlow || 0, 'back');
    // the tube: outer wall, muscle rings, lumen; the lumen opens around a bolus and at the valve when it opens
    const wOuter = (u) => 60 + (bolus != null ? 26 * Math.exp(-Math.pow((u - bolus) * 22, 2)) : 0) - 12 * Math.exp(-Math.pow((u - G.lesU) * 40, 2)) * (1 - valve);
    const outer = tube(E, wOuter);
    ctx.fillStyle = grad(ctx, 'eso', (c) => lin(c, 800, 0, 900, 0, [[0, C.eso], [0.6, '#cf6a84'], [1, C.esoDeep]]));
    ctx.fill(outer);
    ctx.strokeStyle = 'rgba(255,200,215,0.5)'; ctx.lineWidth = 3; ctx.stroke(outer);
    ctx.strokeStyle = 'rgba(140,40,70,0.22)'; ctx.lineWidth = 3;
    for (let d = 0.02; d < 0.95; d += 0.022) { const p = at(E, d), w = wOuter(d) / 2 - 4; if (p.y < v.y0 - 40 || p.y > v.y1 + 40) continue; ctx.beginPath(); ctx.moveTo(p.x - p.ty * w, p.y + p.tx * w); ctx.lineTo(p.x + p.ty * w, p.y - p.tx * w); ctx.stroke(); }
    const lum = (u) => Math.max(0.5, 10 + (bolus != null ? 48 * Math.exp(-Math.pow((u - bolus) * 20, 2)) : 0) - 10 * smooth01(u, G.lesU - 0.035, G.lesU) * (1 - valve) + 18 * valve * smooth01(u, G.lesU - 0.06, G.lesU + 0.02));
    ctx.fillStyle = C.lumen; ctx.fill(tube(E, lum));
    if (bolus != null && bolus > 0 && bolus < 1.02) {       // food going down
      const p = at(E, Math.min(1, bolus));
      ctx.fillStyle = rad(ctx, p.x - 6, p.y - 8, 2, p.x, p.y, 26, [[0, '#f3d9a0'], [1, '#c9955a']]);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 20, 25, p.a - Math.PI / 2, 0, TAU); ctx.fill();
    }
    stomach(ctx, t, st, px);
    valveRing(ctx, t, valve, st.valveGlow || 0, 'front');
  }
  function smooth01(v, a, b) { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); }

  function stomach(ctx, t, st, px) {
    const S = G.stomach;
    if (st.stomachGlow) glow(ctx, 850, 2990, 330, rgba(C.lime, 0.22 * st.stomachGlow));
    ctx.fillStyle = grad(ctx, 'stom', (c) => rad(c, 700, 2900, 40, 730, 3040, 360, [[0, '#f6a9b6'], [0.6, C.stomach], [1, C.stomachDeep]])); ctx.fill(S);
    ctx.save(); ctx.clip(G.stomachInner);
    ctx.fillStyle = 'rgba(70,14,40,0.88)'; ctx.fill(G.stomachInner);
    glow(ctx, 760, 2950, 220, 'rgba(230,110,150,0.25)');
    if (st.inStomach) st.inStomach(ctx);
    // contents: a pool with a sloshing surface + a few bubbles
    const slosh = 10 + 18 * (st.acid || 0), lvl = 3150;
    ctx.fillStyle = grad(ctx, 'acid', (c) => lin(c, 0, 3100, 0, 3330, [[0, 'rgba(236,200,96,0.62)'], [1, 'rgba(190,140,50,0.8)']]));
    ctx.beginPath(); ctx.moveTo(420, 3400);
    for (let x = 420; x <= 1000; x += 20) ctx.lineTo(x, lvl + Math.sin(x * 0.02 + t * 2.2) * slosh * 0.5 + Math.sin(x * 0.011 - t * 1.4) * slosh * 0.4);
    ctx.lineTo(1000, 3400); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,150,0.6)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = 420; x <= 1000; x += 20) { const y = lvl + Math.sin(x * 0.02 + t * 2.2) * slosh * 0.5 + Math.sin(x * 0.011 - t * 1.4) * slosh * 0.4; x === 420 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    ctx.strokeStyle = C.rugae; ctx.globalAlpha = 0.45; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke(G.rugae); ctx.globalAlpha = 1;
    const r = rng(8);
    for (let i = 0; i < 10; i++) {
      const bx = 560 + r() * 330, sp0 = r() * 3, yy = 3300 - ((t * 40 + sp0 * 60) % 150), rr = 4 + r() * 7;
      ctx.strokeStyle = 'rgba(255,245,200,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, yy, rr, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    if (st.stomachGlow) { ctx.save(); ctx.clip(S); ctx.strokeStyle = rgba(C.lime, 0.75 * st.stomachGlow); ctx.lineWidth = 14; ctx.stroke(S); ctx.restore(); }
    ctx.strokeStyle = 'rgba(255,200,215,0.6)'; ctx.lineWidth = 3; ctx.stroke(S); ctx.strokeStyle = 'rgba(255,200,215,0.3)'; ctx.stroke(G.stomachInner);
    ctx.save(); ctx.globalAlpha = 0.8; ctx.strokeStyle = C.stomachDeep; ctx.lineWidth = 30; ctx.lineCap = 'round'; strokePart(ctx, G.duodenum, 0, 1); ctx.restore();
    // reflux puff travelling up the tube
    if (st.reflux > 0 && st.reflux < 1) {
      const u = G.lesU - st.reflux * (st.refluxSpan ?? 0.6), p = at(G.eso, u), a = Math.sin(st.reflux * Math.PI);
      glow(ctx, p.x, p.y, 80, rgba(C.gas, 0.8 * a));
      for (let i = 0; i < 5; i++) { const q = at(G.eso, Math.min(1, u + i * 0.012)); glow(ctx, q.x + Math.sin(i * 2 + t * 5) * 8, q.y, 36, rgba('#e4ff7a', 0.55 * a)); }
    }
  }
  // lower esophageal sphincter: a muscular ring around the tube just above the stomach (back or front half)
  function valveRing(ctx, t, open, glowA, half) {
    const p = at(G.eso, G.lesU), rw = 44 + 8 * open, rh = rw * 0.34;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a - Math.PI / 2);
    ctx.lineCap = 'round';
    if (half === 'back') {
      if (glowA) glow(ctx, 0, 0, 130, rgba(C.lime, 0.35 * glowA));
      ctx.strokeStyle = '#8f3651'; ctx.lineWidth = 18; ctx.beginPath(); ctx.ellipse(0, 0, rw, rh, 0, Math.PI, TAU); ctx.stroke();
    } else {
      const col = glowA ? `rgba(215,243,74,${0.55 + 0.45 * glowA})` : '#f08aa2';
      ctx.strokeStyle = 'rgba(60,5,30,0.45)'; ctx.lineWidth = 26; ctx.beginPath(); ctx.ellipse(0, 3, rw, rh, 0, 0.08, Math.PI - 0.08); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 20; ctx.beginPath(); ctx.ellipse(0, 0, rw, rh, 0, 0.05, Math.PI - 0.05); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,245,0.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, -4, rw, rh, 0, 0.5, Math.PI - 0.5); ctx.stroke();
    }
    ctx.restore();
  }

  function drip(ctx, t, p, a = 1) {
    // path: back of the nasal cavity -> down the posterior pharyngeal wall -> onto the back of the tongue
    if (!G.dripPath) G.dripPath = sample([[690, 600], [760, 600], [846, 640], [880, 760], [876, 880], [846, 960], [790, 1000], [746, 990], [736, 960]], false, 1, 18);
    const D = G.dripPath, reach = clamp(p * 1.05);
    ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha *= a;
    glowLine(ctx, D, reach); ctx.strokeStyle = rgba(C.mucus, 0.4); ctx.lineWidth = 5; strokePart(ctx, D, 0, reach);
    // the lead drop rides the front of the trickle; more drops keep sliding down behind it
    const drops = [reach];
    for (let i = 0; i < 4; i++) { const u = ((t * 0.32 + i / 4) % 1) * reach; if (u < reach - 0.04) drops.push(u); }
    for (const u of drops) {
      if (u <= 0.02 || u >= 0.995) continue;
      const q = at(D, u);
      ctx.fillStyle = rad(ctx, q.x - 3, q.y - 4, 1, q.x, q.y, 14, [[0, '#ffffff'], [0.4, C.mucus], [1, 'rgba(200,220,150,0.7)']]);
      glow(ctx, q.x, q.y, 26, 'rgba(230,245,154,0.35)'); ctx.beginPath(); ctx.ellipse(q.x, q.y, 9, 13, q.a - Math.PI / 2, 0, TAU); ctx.fill();
    }
    if (p > 0.85) glow(ctx, 740, 975, 60, rgba(C.mucus, 0.6 * clamp((p - 0.85) / 0.15)));
    ctx.restore();
  }

  function glowLine(ctx, D, u) { ctx.save(); ctx.strokeStyle = 'rgba(230,245,154,0.18)'; ctx.lineWidth = 30; strokePart(ctx, D, 0, u); ctx.restore(); }
  function waterFill(ctx, t, amt, level) {
    const lv = level ?? lerp(1060, 820, amt);
    const region = new Path2D(); region.addPath(G.pharynx); region.addPath(G.oral);
    ctx.save(); ctx.clip(region);
    ctx.beginPath(); ctx.moveTo(400, 1300);
    for (let x = 400; x <= 950; x += 10) ctx.lineTo(x, lv + Math.sin(x * 0.05 + t * 7) * 6 + Math.sin(x * 0.021 - t * 4) * 5);
    ctx.lineTo(950, 1300); ctx.closePath();
    ctx.fillStyle = 'rgba(120,200,255,0.42)'; ctx.fill();
    ctx.strokeStyle = 'rgba(210,240,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); for (let x = 400; x <= 950; x += 10) { const y = lv + Math.sin(x * 0.05 + t * 7) * 6 + Math.sin(x * 0.021 - t * 4) * 5; x === 400 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    // bubbles rising from below (air pushed up through the water)
    const r = rng(19);
    for (let i = 0; i < 26; i++) {
      const bx = 770 + (r() - 0.5) * 110, spd = 60 + r() * 90, ph = r() * 10, rr = 4 + r() * 11;
      const yy = 1080 - ((t * spd + ph * 40) % Math.max(40, 1080 - lv + 20));
      if (yy < lv) continue;
      ctx.strokeStyle = 'rgba(230,248,255,0.85)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(bx + Math.sin(t * 6 + i) * 6, yy, rr * amt, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(bx + Math.sin(t * 6 + i) * 6 - rr * 0.3, yy - rr * 0.3, rr * 0.25 * amt, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function route(ctx, t, u0, u1, px, alpha) {
    if (u1 <= u0) return;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(215,243,74,0.22)'; ctx.lineWidth = 14 * px; strokePart(ctx, G.route, u0, u1);
    ctx.setLineDash([0.1, 16 * px]); ctx.lineDashOffset = -t * 30 * px;
    ctx.strokeStyle = C.lime; ctx.lineWidth = 7 * px; strokePart(ctx, G.route, u0, u1);
    ctx.restore();
  }
  function probe(ctx, t, u, px, alpha) {
    const p = at(G.route, u);
    ctx.save(); ctx.globalAlpha *= alpha;
    glow(ctx, p.x, p.y, 46 * px, 'rgba(215,243,74,0.55)');
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, 7 * px, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.lime; ctx.lineWidth = 4 * px; ctx.beginPath(); ctx.arc(p.x, p.y, (15 + 3 * Math.sin(t * 6)) * px, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function spotlight(ctx, cam, s) {
    const [x, y] = toScreen(cam, s.x, s.y), r = s.r * cam.z;
    ctx.save();
    const g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r * 1.35);
    g.addColorStop(0, 'rgba(8,6,18,0)'); g.addColorStop(1, `rgba(8,6,18,${s.a ?? 0.6})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  // ------------------------------------------------------------------ close-up backdrop: the oropharynx around a tonsil
  // A full-screen "inside the throat" background with the tonsil between its two pillars. cx, cy, h: tonsil placement.
  function throatBackdrop(ctx, cx, cy, h, t, o = {}) {
    ctx.save();
    ctx.fillStyle = rad(ctx, cx, cy, 20, cx, cy, h * 1.8, [[0, '#5a1f3a'], [0.5, '#34122a'], [1, '#150612']]);
    ctx.fillRect(0, 0, W, H);
    // mucosa texture: faint soft blobs
    const r = rng(3);
    for (let i = 0; i < 26; i++) glow(ctx, r() * W, r() * H, 60 + r() * 140, 'rgba(160,60,100,0.12)');
    // back wall glisten
    ctx.strokeStyle = 'rgba(255,170,195,0.08)'; ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(cx + h * (0.7 + i * 0.12), -20); ctx.bezierCurveTo(cx + h * (0.9 + i * 0.1), H * 0.3, cx + h * (0.6 + i * 0.13), H * 0.7, cx + h * (0.85 + i * 0.1), H + 20); ctx.stroke(); }
    // pillars: posterior (behind, right) and anterior (in front, left), as soft pink curtains
    const pil = (x0, flip, col, hi) => {
      ctx.save(); ctx.translate(cx, cy);
      const p = new Path2D();
      p.moveTo(x0 * h, -h * 1.2); p.bezierCurveTo((x0 + 0.18 * flip) * h, -h * 0.4, (x0 + 0.2 * flip) * h, h * 0.4, (x0 + 0.02 * flip) * h, h * 1.2);
      p.lineTo((x0 - 0.2 * flip) * h, h * 1.2); p.bezierCurveTo((x0 - 0.02 * flip) * h, h * 0.4, (x0 - 0.04 * flip) * h, -h * 0.4, (x0 - 0.2 * flip) * h, -h * 1.2); p.closePath();
      ctx.fillStyle = lin(ctx, (x0 - 0.2 * flip) * h, 0, (x0 + 0.2 * flip) * h, 0, [[0, col[0]], [1, col[1]]]); ctx.fill(p);
      ctx.strokeStyle = hi; ctx.lineWidth = h * 0.012; ctx.stroke(p);
      ctx.restore();
    };
    pil(0.55, 1, ['#7c2c48', '#b04d6a'], 'rgba(255,170,195,0.25)');
    o.drawTonsil && o.drawTonsil();
    pil(-0.56, -1, ['#e0768f', '#a84460'], 'rgba(255,200,215,0.45)');
    ctx.restore();
  }

  // ------------------------------------------------------------------ crypt cross-section (inside one pit)
  /* Draw in a local frame: (x, y) = centre of the section, s = scale (the section is ~ 2s wide, 2s tall).
     st: { squeeze 0..1, food: [{ t0, x0, y0, tx, ty, kind, r, seed }], compact 0..1, stone 0..1, stink 0..1, clean }  */
  function cryptSection(ctx, x, y, s, t, st = {}) {
    ctx.save(); ctx.translate(x, y);
    const top = -s * 0.62;                  // tonsil surface line
    const surf = (xx) => top + Math.sin(xx / s * 3.2 + 0.4) * s * 0.018;
    // lumen above the surface: a few drifting motes
    const rm = rng(29);
    for (let i = 0; i < 14; i++) { const mx = (rm() - 0.5) * s * 2.2, my = top - s * (0.1 + rm() * 0.6) + Math.sin(t * 0.8 + i) * s * 0.02; glow(ctx, mx, my, s * (0.01 + rm() * 0.02), 'rgba(255,190,210,0.35)'); }
    // tissue (cut face)
    const tissue = new Path2D(); tissue.moveTo(-s * 1.3, surf(-s * 1.3));
    for (let i = 0; i <= 26; i++) { const xx = -s * 1.3 + (i / 26) * s * 2.6; tissue.lineTo(xx, surf(xx)); }
    tissue.lineTo(s * 1.3, s * 1.3); tissue.lineTo(-s * 1.3, s * 1.3); tissue.closePath();
    ctx.fillStyle = rad(ctx, -s * 0.3, -s * 0.3, s * 0.1, 0, s * 0.2, s * 1.5, [[0, '#f6a0b4'], [0.55, '#dd6f89'], [1, '#9c3a57']]); ctx.fill(tissue);
    // lymphoid follicles (the tonsil's texture), kept soft
    const r = rng(17);
    for (let i = 0; i < 11; i++) {
      const fx = (r() - 0.5) * s * 2.3, fy = top + s * 0.3 + r() * s * 1.2, fr = s * (0.11 + r() * 0.07);
      if (Math.abs(fx) < s * 0.42 && fy < s * 0.5) continue;
      glow(ctx, fx, fy, fr * 1.25, 'rgba(170,55,95,0.28)');
      glow(ctx, fx - fr * 0.1, fy - fr * 0.12, fr * 0.6, 'rgba(255,200,215,0.3)');
    }
    // the crypt: a pocket with a narrow neck and a wider chamber (+ a small side branch); squeeze narrows it
    const sq = st.squeeze || 0;
    const cl = sample([[0, top - s * 0.03], [s * 0.03, top + s * 0.28], [-s * 0.02, top + s * 0.58], [s * 0.02, top + s * 0.86], [0, top + s * 1.06]], false, 1, 18);
    const wf = (u) => s * (0.17 + 0.3 * Math.pow(Math.sin(Math.PI * clamp(u * 1.02)), 1.3) * smooth01(u, 0.05, 0.4)) * (1 - 0.3 * sq * Math.sin(Math.PI * u)) + s * 0.06 * Math.exp(-Math.pow(u * 12, 2));
    const branch = sample([[-s * 0.12, top + s * 0.52], [-s * 0.32, top + s * 0.62], [-s * 0.46, top + s * 0.82]], false, 1, 10);
    const bw = (u) => s * 0.11 * (1 - 0.55 * u) * (1 - 0.35 * sq);
    const end = cl[cl.length - 1];
    ctx.fillStyle = '#ffc3d1';
    ctx.fill(tube(cl, (u) => wf(u) + s * 0.08)); ctx.fill(tube(branch, (u) => bw(u) + s * 0.07));
    ctx.beginPath(); ctx.arc(end[0], end[1], (wf(1) + s * 0.08) / 2, 0, TAU); ctx.fill();
    ctx.beginPath(); const be = branch[branch.length - 1]; ctx.arc(be[0], be[1], (bw(1) + s * 0.07) / 2, 0, TAU); ctx.fill();
    const lum = new Path2D(); lum.addPath(tube(cl, wf)); lum.addPath(tube(branch, bw));
    const caps = new Path2D(); caps.arc(end[0], end[1], wf(1) / 2, 0, TAU); caps.moveTo(be[0] + bw(1) / 2, be[1]); caps.arc(be[0], be[1], bw(1) / 2, 0, TAU);
    ctx.fillStyle = lin(ctx, 0, top, 0, top + s * 1.2, [[0, '#4d152b'], [1, '#1c0510']]); ctx.fill(lum); ctx.fill(caps); lum.addPath(caps);
    ctx.save(); ctx.clip(lum); glow(ctx, -s * 0.05, top + s * 0.4, s * 0.3, 'rgba(160,60,100,0.25)'); ctx.restore();
    if (st.clean) { ctx.save(); ctx.strokeStyle = rgba(C.lime, 0.9 * st.clean); ctx.lineWidth = s * 0.02; ctx.stroke(lum); ctx.restore(); }
    // surface epithelium band
    ctx.strokeStyle = '#ffc6d3'; ctx.lineWidth = s * 0.05; ctx.lineJoin = 'round';
    ctx.beginPath(); for (let i = 0; i <= 26; i++) { const xx = -s * 1.3 + (i / 26) * s * 2.6; i ? ctx.lineTo(xx, surf(xx)) : ctx.moveTo(xx, surf(xx)); } ctx.stroke();
    // cover the band over the crypt mouth so the opening reads
    ctx.fillStyle = '#4d152b'; ctx.beginPath(); ctx.ellipse(0, top + s * 0.01, wf(0) / 2 + s * 0.01, s * 0.05, 0, 0, TAU); ctx.fill();
    // food + gunk particles, and the stone they turn into
    const stoneY = top + s * 0.74, stoneR = s * 0.19 * (st.stone || 0);
    for (const f of st.food || []) {
      const k = clamp((t - f.t0) / (f.dur || 2.2)); if (k <= 0) continue;
      const mx = f.mx ?? 0;
      let px, py;
      if (k < 0.5) { const m = easeIO(k / 0.5); px = lerp(f.x0 * s, mx * s, m); py = lerp(f.y0 * s, top - s * 0.04, m); }
      else { const m = easeIO((k - 0.5) / 0.5); px = lerp(mx * s, f.tx * s, m); py = lerp(top - s * 0.04, f.ty * s, m); }
      px += Math.sin(t * 2 + f.seed) * s * 0.012 * (1 - k);
      py += sq * s * 0.03;
      const c = st.compact || 0;
      px = lerp(px, 0, c * 0.9); py = lerp(py, stoneY, c * 0.9);
      const fade = 1 - smooth01(c, 0.55, 0.95);
      if (fade <= 0) continue;
      ctx.globalAlpha = fade; particle(ctx, px, py, f.r * s * (1 - 0.35 * c), f.kind, f.seed, t);
      ctx.globalAlpha = 1;
    }
    const jx = (st.jiggle || 0) * Math.sin(t * 28) * s * 0.014, jr = (st.jiggle || 0) * Math.sin(t * 23) * 0.12;
    if (stoneR > 0) stone(ctx, jx, stoneY - (st.lift || 0) * s * 0.1, stoneR, t, { seed: 71, shine: 0.7, rot: jr });
    if (st.stink) for (let i = 0; i < 4; i++) { const k = (t * 0.35 + i / 4) % 1; puffAt(ctx, Math.sin(i * 2.1 + t) * s * 0.12, lerp(stoneY - s * 0.15, top - s * 0.5, k), s * (0.14 + 0.1 * k), st.stink * Math.sin(Math.PI * k) * 0.8); }
    ctx.restore();
  }
  function puffAt(ctx, x, y, s, a) {
    if (a <= 0) return;
    for (let i = 0; i < 4; i++) glow(ctx, x + Math.cos(i * 1.7) * s * 0.35, y + Math.sin(i * 2.3) * s * 0.25, s * 0.75, rgba(C.gas, 0.55 * a));
  }
  // food bits and gunk: crumbs (warm), leafy bit (green), mucus blobs (pale), dead cells (flat pale polygons)
  function particle(ctx, x, y, r, kind, seed, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(seed * 1.7 + t * 0.4);
    ctx.strokeStyle = 'rgba(40,5,20,0.55)'; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.lineJoin = 'round';
    if (kind === 'crumb') { ctx.fillStyle = rad(ctx, -r * 0.3, -r * 0.3, 0, 0, 0, r * 1.2, [[0, '#f2c48a'], [1, '#b0773e']]); const pp = sp(blobPts(0, 0, r, r * 0.8, 7, 0.22, seed)); ctx.fill(pp); ctx.stroke(pp); ctx.fillStyle = 'rgba(255,235,200,0.6)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.2, 0, TAU); ctx.fill(); }
    else if (kind === 'leaf') { ctx.fillStyle = '#6cc36a'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.55, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(30,90,40,0.6)'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke(); }
    else if (kind === 'mucus') { ctx.fillStyle = 'rgba(232,240,200,0.8)'; ctx.fill(sp(blobPts(0, 0, r * 1.1, r * 0.8, 9, 0.18, seed))); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.25, r * 0.22, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = 'rgba(250,230,220,0.85)'; ctx.fill(sp(blobPts(0, 0, r * 1.1, r * 0.6, 6, 0.1, seed).map((p, i) => [p[0], p[1], 1]))); ctx.fillStyle = 'rgba(200,120,140,0.6)'; ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // ------------------------------------------------------------------ front view into an open mouth (flashlight)
  // Drawn centred at (cx, cy), s = half-width of the mouth opening. st: { specks 0..1, tonsil: {...extra tonsil st} }
  // Returns the screen centres of the two tonsils (for beams, circles, labels).
  function front(ctx, cx, cy, s, t, st = {}) {
    ctx.save(); ctx.translate(cx, cy);
    // face skin fills the frame (a close crop), soft shading toward the edges
    ctx.fillStyle = rad(ctx, 0, -s * 0.15, s * 0.3, 0, 0, s * 2.3, [[0, '#e9ad99'], [0.55, '#cf8f7c'], [1, '#6b3d45']]);
    ctx.fillRect(-cx - 20, -cy - 20, 1960, 1120);
    glow(ctx, 0, -s * 1.15, s * 0.5, 'rgba(120,60,60,0.35)');                       // under-nose shadow
    // lips ring
    ctx.fillStyle = lin(ctx, 0, -s * 0.85, 0, s * 0.85, [[0, '#e07a8a'], [0.5, '#c75b70'], [1, '#e48494']]);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.14, s * 0.82, 0, 0, TAU); ctx.fill();
    const mouth = new Path2D(); mouth.ellipse(0, 0, s, s * 0.66, 0, 0, TAU);
    ctx.save(); ctx.clip(mouth);
    // 1. roof of the mouth (pink, lit from the front) over the whole interior
    ctx.fillStyle = lin(ctx, 0, -s * 0.7, 0, s * 0.3, [[0, '#f2a3b2'], [0.6, '#cf6982'], [1, '#8f3553']]); ctx.fill(mouth);
    // cheeks' inner walls (sides), darker
    for (const sd of [-1, 1]) { ctx.fillStyle = lin(ctx, sd * s, 0, sd * s * 0.6, 0, [[0, 'rgba(60,10,30,0.8)'], [1, 'rgba(60,10,30,0)']]); ctx.fillRect(sd > 0 ? s * 0.6 : -s, -s, s * 0.4, s * 2); }
    // 2. the throat: an arch framed by the soft palate
    const arch = new Path2D();
    arch.moveTo(-s * 0.68, s * 0.6); arch.bezierCurveTo(-s * 0.66, -s * 0.02, -s * 0.42, -s * 0.42, 0, -s * 0.42); arch.bezierCurveTo(s * 0.42, -s * 0.42, s * 0.66, -s * 0.02, s * 0.68, s * 0.6); arch.closePath();
    ctx.fillStyle = rad(ctx, 0, s * 0.05, s * 0.02, 0, s * 0.08, s * 0.66, [[0, '#9a3a58'], [0.55, '#5e1c36'], [1, '#34101f']]); ctx.fill(arch);
    ctx.save(); ctx.clip(arch);
    ctx.strokeStyle = 'rgba(255,170,195,0.16)'; ctx.lineWidth = s * 0.008;
    for (let i = 0; i < 7; i++) { const x = -s * 0.24 + i * s * 0.08; ctx.beginPath(); ctx.moveTo(x, -s * 0.3); ctx.quadraticCurveTo(x + s * 0.02, s * 0.1, x - s * 0.01, s * 0.55); ctx.stroke(); }
    glow(ctx, 0, s * 0.18, s * 0.28, 'rgba(20,0,10,0.5)');                          // depth down the throat
    ctx.restore();
    // uvula hanging from the top of the arch
    const uv = new Path2D(); uv.moveTo(-s * 0.12, -s * 0.445); uv.bezierCurveTo(-s * 0.075, -s * 0.36, -s * 0.07, -s * 0.14, 0, -s * 0.11); uv.bezierCurveTo(s * 0.07, -s * 0.14, s * 0.075, -s * 0.36, s * 0.12, -s * 0.445); uv.closePath();
    ctx.fillStyle = lin(ctx, -s * 0.08, 0, s * 0.08, 0, [[0, '#d9667f'], [0.45, '#f29aad'], [1, '#c9587a']]); ctx.fill(uv);
    glow(ctx, -s * 0.02, -s * 0.18, s * 0.035, 'rgba(255,235,240,0.7)');
    // 3. pillars and tonsils on both sides
    const tc = [];
    for (const sd of [-1, 1]) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#a8435f'; ctx.lineWidth = s * 0.055;                                   // posterior pillar
      ctx.beginPath(); ctx.moveTo(sd * s * 0.1, -s * 0.38); ctx.bezierCurveTo(sd * s * 0.3, -s * 0.3, sd * s * 0.4, -s * 0.06, sd * s * 0.4, s * 0.6); ctx.stroke();
      const tx = sd * s * 0.52, ty = s * 0.15;
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(sd * 0.12);
      tonsil(ctx, 0, 0, s * 0.44, t, { specks: st.specks || 0, detail: 0.85, ...(st.tonsil || {}) });
      ctx.restore();
      tc.push([cx + tx, cy + ty]);
      ctx.strokeStyle = lin(ctx, sd * s * 0.6, 0, sd * s * 0.75, 0, [[0, '#f09aac'], [1, '#c45a74']]); ctx.lineWidth = s * 0.08;   // anterior pillar
      ctx.beginPath(); ctx.moveTo(sd * s * 0.14, -s * 0.42); ctx.bezierCurveTo(sd * s * 0.5, -s * 0.4, sd * s * 0.7, -s * 0.08, sd * s * 0.72, s * 0.6); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,215,225,0.55)'; ctx.lineWidth = s * 0.012;
      ctx.beginPath(); ctx.moveTo(sd * s * 0.14, -s * 0.45); ctx.bezierCurveTo(sd * s * 0.48, -s * 0.43, sd * s * 0.67, -s * 0.1, sd * s * 0.69, s * 0.6); ctx.stroke();
    }
    // 4. tongue (bottom), with a midline groove, rising toward the back
    ctx.fillStyle = rad(ctx, 0, s * 0.3, s * 0.1, 0, s * 0.62, s * 1.1, [[0, '#f59aac'], [0.6, C.tongue], [1, C.tongueDeep]]);
    ctx.beginPath(); ctx.moveTo(-s * 1.1, s * 0.9); ctx.bezierCurveTo(-s * 0.9, s * 0.36, -s * 0.5, s * 0.3, 0, s * 0.32); ctx.bezierCurveTo(s * 0.5, s * 0.3, s * 0.9, s * 0.36, s * 1.1, s * 0.9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(150,40,70,0.45)'; ctx.lineWidth = s * 0.014; ctx.beginPath(); ctx.moveTo(0, s * 0.36); ctx.quadraticCurveTo(s * 0.01, s * 0.55, 0, s * 0.75); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,215,222,0.55)'; ctx.lineWidth = s * 0.01; ctx.beginPath(); ctx.moveTo(-s * 0.8, s * 0.44); ctx.bezierCurveTo(-s * 0.5, s * 0.32, s * 0.5, s * 0.32, s * 0.8, s * 0.44); ctx.stroke();
    // 5. teeth: upper arc and lower arc
    for (const [yy, dir] of [[-s * 0.64, 1], [s * 0.68, -1]]) {
      for (let i = -5; i <= 5; i++) {
        const u = i / 5.6, tx = u * s * 0.98, curve = Math.pow(Math.abs(u), 2) * s * 0.16 * dir, tw = s * (0.15 - Math.abs(u) * 0.05), th = s * (0.2 - Math.abs(u) * 0.07);
        ctx.fillStyle = lin(ctx, 0, yy + curve - th * 0.5 * dir, 0, yy + curve + th * 0.5 * dir, [[0, '#fbf8f0'], [1, '#e2d8c2']]);
        api0.roundRect(ctx, tx - tw / 2, yy + curve - (dir > 0 ? th * 0.35 : th * 0.65), tw * 0.94, th, s * 0.03); ctx.fill();
      }
    }
    ctx.restore();
    // lip highlight
    ctx.strokeStyle = 'rgba(255,215,222,0.5)'; ctx.lineWidth = s * 0.014;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.08, s * 0.76, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.restore();
    return tc;
  }
  function rrPath(x, y, w, h, r) { const p = new Path2D(); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; }
  let api0 = { roundRect(ctx, x, y, w, h, r) { r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); } };

  // ------------------------------------------------------------------ icons (generic, unbranded, drawn here)
  const icons = {
    // cotton swab: white stick with cotton tips; (x, y) centre, L length, a angle
    swab(ctx, x, y, L, a = 0) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = lin(ctx, 0, -6, 0, 6, [[0, '#ffffff'], [1, '#cfd6e6']]); api0.roundRect(ctx, -L / 2, -5, L, 10, 5); ctx.fill();
      for (const s of [-1, 1]) {
        const g = rad(ctx, s * L / 2 - 4, -6, 2, s * L / 2, 0, 24, [[0, '#ffffff'], [1, '#d9dfe9']]);
        ctx.fillStyle = g; ctx.fill(sp(blobPts(s * L / 2, 0, 24, 15, 12, 0.08, 7 + s)));
      }
      ctx.restore();
    },
    // a stylised index finger pointing along +x (skin tone, nail, knuckle creases)
    finger(ctx, x, y, L, a = 0) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      const w = L * 0.2;
      ctx.fillStyle = lin(ctx, 0, -w, 0, w, [[0, '#f2c1a6'], [1, '#c98a6e']]);
      ctx.beginPath(); ctx.moveTo(-L * 0.5, -w * 0.62); ctx.lineTo(L * 0.34, -w * 0.52); ctx.bezierCurveTo(L * 0.52, -w * 0.5, L * 0.52, w * 0.5, L * 0.34, w * 0.52); ctx.lineTo(-L * 0.5, w * 0.66); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f7dccd'; ctx.beginPath(); ctx.ellipse(L * 0.36, -w * 0.12, L * 0.09, w * 0.3, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(140,80,60,0.5)'; ctx.lineWidth = L * 0.012; ctx.lineCap = 'round';
      for (const k of [0.02, 0.06, -0.26]) { ctx.beginPath(); ctx.moveTo(L * k, -w * 0.4); ctx.quadraticCurveTo(L * (k + 0.015), 0, L * k, w * 0.3); ctx.stroke(); }
      ctx.restore();
    },
    // a thin metal pick / scraper with a hooked end
    pick(ctx, x, y, L, a = 0) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = lin(ctx, 0, -9, 0, 9, [[0, '#eef2f8'], [0.5, '#9aa6b8'], [1, '#5e6a7c']]); api0.roundRect(ctx, -L / 2, -9, L * 0.6, 18, 8); ctx.fill();
      ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(L * 0.1, 0); ctx.lineTo(L * 0.42, 0); ctx.quadraticCurveTo(L * 0.52, 0, L * 0.5, -L * 0.08); ctx.stroke();
      ctx.strokeStyle = 'rgba(80,90,110,0.5)'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-L * 0.42 + i * 16, -8); ctx.lineTo(-L * 0.46 + i * 16, 8); ctx.stroke(); }
      ctx.restore();
    },
    // generic water flosser silhouette (no brand): body with a reservoir base, a button, a long angled tip.
    // Its nozzle tip is returned so a stream can start there. o: { mode: 0..1 (the mode light), s: scale }
    flosser(ctx, x, y, s, t, o = {}) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); if (o.rot) ctx.rotate(o.rot);
      glow(ctx, 0, 40, 260, 'rgba(167,139,250,0.25)');
      // tip
      ctx.strokeStyle = lin(ctx, 0, -330, 0, -170, [[0, '#dfe6f2'], [1, '#aab4c8']]); ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -170); ctx.lineTo(0, -300); ctx.quadraticCurveTo(0, -340, 36, -356); ctx.stroke();
      ctx.fillStyle = '#c9d2e2'; api0.roundRect(ctx, -22, -196, 44, 34, 10); ctx.fill();
      // body
      const body = new Path2D(); body.moveTo(-56, -168); body.bezierCurveTo(-70, -60, -84, 80, -80, 190); body.lineTo(80, 190); body.bezierCurveTo(84, 80, 70, -60, 56, -168); body.closePath();
      ctx.fillStyle = lin(ctx, -80, 0, 80, 0, [[0, '#f4f2fb'], [0.55, '#d9d4ef'], [1, '#a79fcf']]); ctx.fill(body);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.stroke(body);
      // reservoir (translucent water)
      const res = rrPath(-86, 150, 172, 120, 26);
      ctx.fillStyle = 'rgba(143,216,255,0.35)'; ctx.fill(res); ctx.strokeStyle = 'rgba(200,235,255,0.8)'; ctx.lineWidth = 3; ctx.stroke(res);
      ctx.fillStyle = 'rgba(143,216,255,0.5)'; ctx.fillRect(-80, 200 + Math.sin(t * 2) * 3, 160, 66);
      // button + mode light
      ctx.fillStyle = '#8b80c4'; ctx.beginPath(); ctx.ellipse(0, -60, 20, 26, 0, 0, TAU); ctx.fill();
      const m = o.mode || 0;
      if (m > 0) glow(ctx, 0, 10, 40, `rgba(215,243,74,${0.8 * m})`);
      ctx.fillStyle = m > 0 ? `rgba(215,243,74,${0.35 + 0.65 * m})` : '#6c6490'; ctx.beginPath(); ctx.arc(0, 10, 10, 0, TAU); ctx.fill();
      ctx.restore();
      return { x: x + 36 * s, y: y - 356 * s };
    },
    // a pressure dial, value 0..1 (0 = lowest)
    dial(ctx, x, y, r, value, o = {}) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = rad(ctx, -r * 0.3, -r * 0.3, r * 0.1, 0, 0, r, [[0, '#3a3558'], [1, '#1c1a2e']]); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(167,139,250,0.6)'; ctx.lineWidth = 4; ctx.stroke();
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
      for (let i = 0; i <= 10; i++) {
        const a = lerp(a0, a1, i / 10), hot = i / 10;
        ctx.strokeStyle = i === 0 ? C.lime : `rgba(${Math.round(lerp(200, 255, hot))},${Math.round(lerp(200, 77, hot))},${Math.round(lerp(220, 90, hot))},0.9)`;
        ctx.lineWidth = i === 0 ? 8 : 5;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72); ctx.lineTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88); ctx.stroke();
      }
      const a = lerp(a0, a1, value);
      ctx.fillStyle = lin(ctx, 0, -r * 0.5, 0, r * 0.5, [[0, '#f4f1ea'], [1, '#b9b3cf']]); ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = o.pointer || '#0b0a18'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.12, Math.sin(a) * r * 0.12); ctx.lineTo(Math.cos(a) * r * 0.44, Math.sin(a) * r * 0.44); ctx.stroke();
      ctx.restore();
    },
    // glass of warm water (with steam wisps)
    glass(ctx, x, y, s, t, fill = 0.7) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      const g = new Path2D(); g.moveTo(-60, -90); g.lineTo(60, -90); g.lineTo(48, 90); g.lineTo(-48, 90); g.closePath();
      ctx.save(); ctx.clip(g); ctx.fillStyle = 'rgba(143,216,255,0.5)'; ctx.fillRect(-70, 90 - 180 * fill + Math.sin(t * 3) * 2, 140, 200); ctx.restore();
      ctx.strokeStyle = 'rgba(230,245,255,0.95)'; ctx.lineWidth = 5; ctx.stroke(g);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; ctx.globalAlpha = Math.sin(Math.PI * k) * 0.9; ctx.beginPath(); ctx.moveTo(-26 + i * 26, -100 - k * 60); ctx.bezierCurveTo(-40 + i * 26, -130 - k * 60, -12 + i * 26, -150 - k * 60, -26 + i * 26, -175 - k * 60); ctx.stroke(); }
      ctx.restore();
    },
    // salt shaker
    shaker(ctx, x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = lin(ctx, -40, 0, 40, 0, [[0, '#f7f7fb'], [1, '#bdbfd2']]); api0.roundRect(ctx, -40, -40, 80, 120, 18); ctx.fill();
      ctx.fillStyle = '#9aa3b8'; api0.roundRect(ctx, -44, -76, 88, 44, 16); ctx.fill();
      ctx.fillStyle = '#4a4f63'; for (const [dx, dy] of [[-14, -62], [0, -56], [14, -62]]) { ctx.beginPath(); ctx.arc(dx, dy, 4, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
    // generic rinse bottle (no brand), label text optional
    bottle(ctx, x, y, s, color = '#8fd8ff') {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      const b = new Path2D(); b.moveTo(-30, -120); b.lineTo(30, -120); b.lineTo(34, -90); b.bezierCurveTo(70, -80, 70, -40, 70, 0); b.lineTo(70, 110); b.quadraticCurveTo(70, 130, 50, 130); b.lineTo(-50, 130); b.quadraticCurveTo(-70, 130, -70, 110); b.lineTo(-70, 0); b.bezierCurveTo(-70, -40, -70, -80, -34, -90); b.closePath();
      ctx.fillStyle = lin(ctx, -70, 0, 70, 0, [[0, rgba(color, 0.9)], [1, rgba(color, 0.55)]]); ctx.fill(b);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.stroke(b);
      ctx.fillStyle = '#e9e6f5'; api0.roundRect(ctx, -34, -160, 68, 44, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; api0.roundRect(ctx, -52, -10, 104, 80, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-58, -60, 12, 150);
      ctx.restore();
    },
  };

  // ------------------------------------------------------------------ small screen-space helpers
  // chip anchored to a screen point with a leader line: the dot sits on (ax, ay), the chip at (bx, by)
  function chip(ctx, api, str, ax, ay, bx, by, p, o = {}) {
    if (p <= 0) return;
    if (ax != null) api.leader(ctx, ax, ay, bx, by, Math.min(1, p * 1.4), { color: o.leaderColor || api.P.lime, width: 3.5, dot: 8 });
    api.label(ctx, str, bx, by, { size: o.size || 46, align: o.align || 'center', p, bg: o.bg, color: o.color });
  }
  // a stink puff (smell) in screen space, drifting up
  function stink(ctx, x, y, s, t, a = 1, color = C.gas) {
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.4 + i / 3) % 1;
      glow(ctx, x + Math.sin(t * 1.3 + i * 2) * s * 0.3, y - k * s * 1.6, s * (0.5 + 0.6 * k), rgba(color, 0.5 * a * Math.sin(Math.PI * k)));
    }
    ctx.save(); ctx.strokeStyle = rgba(color, 0.8 * a); ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const k = (t * 0.5 + (i + 1) / 3) % 1, x0 = x + i * s * 0.35, y0 = y - s * 0.2 - k * s * 0.8;
      ctx.globalAlpha = Math.sin(Math.PI * k);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0 + s * 0.15, y0 - s * 0.15, x0 - s * 0.15, y0 - s * 0.3, x0, y0 - s * 0.45); ctx.stroke();
    }
    ctx.restore();
  }
  // floating motes for depth (screen space, parallax with the camera)
  function motes(ctx, t, cam, n = 36, seed = 5) {
    const r = rng(seed);
    ctx.save();
    for (let i = 0; i < n; i++) {
      const depth = 0.25 + r() * 0.75, x0 = r() * 2400, y0 = r() * 1500, s = 1.5 + r() * 3.5;
      const x = ((x0 - (cam ? cam.x * depth * 0.25 : 0) + t * 8 * depth) % 2200 + 2200) % 2200 - 140;
      const y = ((y0 - (cam ? cam.y * depth * 0.25 : 0) - t * 5 * depth) % 1400 + 1400) % 1400 - 160;
      ctx.globalAlpha = 0.18 + 0.3 * depth; ctx.fillStyle = i % 5 ? '#c9b8ff' : '#ffc1d4';
      ctx.beginPath(); ctx.arc(x, y, s * depth, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function finish(ctx, api, t, o = {}) { api.vignette(ctx, o.vignette ?? 0.55); api.grain(ctx, t, o.grain ?? 0.06); }
  // a scratch canvas at render resolution (for masks), reused
  const scratch = {};
  function canvasFor(key, ctx) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    if (!scratch[key] || scratch[key].width !== w) { const c = document.createElement('canvas'); c.width = w; c.height = h; scratch[key] = c; }
    const c = scratch[key], g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    const s = w / W; g.setTransform(s, 0, 0, s, 0, 0); return g;
  }


  // ------------------------------------------------------------------ helpers for the stomach beats
  // big glowing question mark (screen space); p = pop progress, rot in radians
  function question(ctx, api, x, y, size, p, rot = 0, color = '#f4f1ea') {
    if (p <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(p, p); ctx.globalAlpha *= clamp(p * 1.5);
    glow(ctx, 0, -size * 0.3, size * 0.9, 'rgba(215,243,74,0.28)');
    api.text(ctx, '?', 0, 0, { size, weight: 700, color, align: 'center', stroke: 'rgba(11,10,24,0.8)', strokeWidth: size * 0.06, shadow: 'rgba(0,0,0,0.5)', shadowBlur: 24 });
    ctx.restore();
  }
  // simple food icons (garlic bulb, onion), drawn at (x, y) with size s, rotation a
  function food(ctx, kind, x, y, s, a = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    if (kind === 'garlic') {
      const b = new Path2D(); b.moveTo(0, -s * 0.95); b.bezierCurveTo(s * 0.18, -s * 0.6, s * 0.95, -s * 0.35, s * 0.8, s * 0.25); b.bezierCurveTo(s * 0.65, s * 0.72, -s * 0.65, s * 0.72, -s * 0.8, s * 0.25); b.bezierCurveTo(-s * 0.95, -s * 0.35, -s * 0.18, -s * 0.6, 0, -s * 0.95); b.closePath();
      ctx.fillStyle = rad(ctx, -s * 0.3, -s * 0.2, s * 0.05, 0, 0, s, [[0, '#ffffff'], [0.6, '#f1eadb'], [1, '#cdbfa6']]); ctx.fill(b);
      ctx.strokeStyle = 'rgba(150,120,90,0.7)'; ctx.lineWidth = s * 0.05; ctx.stroke(b);
      ctx.strokeStyle = 'rgba(170,140,110,0.6)'; ctx.lineWidth = s * 0.04;
      for (const k of [-0.42, 0, 0.42]) { ctx.beginPath(); ctx.moveTo(k * s * 0.4, -s * 0.8); ctx.quadraticCurveTo(k * s * 1.3, 0, k * s * 0.9, s * 0.62); ctx.stroke(); }
      ctx.strokeStyle = '#b89c7a'; ctx.lineWidth = s * 0.035; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.1, s * 0.62); ctx.lineTo(i * s * 0.16, s * 0.82); ctx.stroke(); }
    } else {
      const b = new Path2D(); b.moveTo(0, -s * 1.0); b.bezierCurveTo(s * 0.1, -s * 0.7, s * 0.95, -s * 0.55, s * 0.85, s * 0.15); b.bezierCurveTo(s * 0.75, s * 0.75, -s * 0.75, s * 0.75, -s * 0.85, s * 0.15); b.bezierCurveTo(-s * 0.95, -s * 0.55, -s * 0.1, -s * 0.7, 0, -s * 1.0); b.closePath();
      ctx.fillStyle = rad(ctx, -s * 0.3, -s * 0.3, s * 0.05, 0, 0, s, [[0, '#e7a9d8'], [0.55, '#a8488f'], [1, '#6b2560']]); ctx.fill(b);
      ctx.strokeStyle = 'rgba(60,10,50,0.6)'; ctx.lineWidth = s * 0.05; ctx.stroke(b);
      ctx.strokeStyle = 'rgba(255,220,245,0.45)'; ctx.lineWidth = s * 0.04;
      for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(k * s * 0.2, -s * 0.85); ctx.quadraticCurveTo(k * s * 1.5, 0, k * s * 0.8, s * 0.6); ctx.stroke(); }
    }
    ctx.restore();
  }
  // a numbered list chip: badge + label, lime when active, dim otherwise
  function listChip(ctx, api, n, str, x, y, p, active = 1, o = {}) {
    if (p <= 0) return;
    const size = o.size || 46, P = api.P;
    ctx.save(); ctx.translate(x, y); ctx.scale(p, p); ctx.globalAlpha *= clamp(p * 1.6);
    const tw = api.measure(ctx, str, { size, weight: 700, tracking: 1 }), padX = size * 0.4, bh = size * 1.5, badge = bh;
    const bg = active > 0.5 ? P.lime : 'rgba(30,26,50,0.85)', fg = active > 0.5 ? P.black : P.ink;
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    ctx.fillStyle = bg; api.roundRect(ctx, 0, -bh / 2, badge + tw + padX * 2, bh, 8); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = active > 0.5 ? 'rgba(10,10,15,0.9)' : P.lime; api.roundRect(ctx, 0, -bh / 2, badge, bh, 8); ctx.fill();
    api.text(ctx, String(n), badge / 2, size * 0.36, { size, weight: 700, color: active > 0.5 ? P.lime : P.black, align: 'center' });
    api.text(ctx, str, badge + padX, size * 0.36, { size, weight: 700, color: fg, tracking: 1 });
    ctx.restore();
  }


  // ------------------------------------------------------------------ stomach contents (world space, via st.inStomach)
  const poolY = (x, t, acid = 0) => { const sl = 10 + 18 * acid; return 3150 + Math.sin(x * 0.02 + t * 2.2) * sl * 0.5 + Math.sin(x * 0.011 - t * 1.4) * sl * 0.4; };
  const FOODS = [{ kind: 'garlic', x: 712, s: 36, a0: -0.5, a1: 0.35, d: 0 }, { kind: 'onion', x: 846, s: 34, a0: 0.6, a1: -0.25, d: 0.3 }];
  // food drops through the valve at t0 (scene seconds; a negative t0 = already in the stomach)
  function stomachFood(ctx, t, t0, fade = 1, acid = 0.3) {
    for (const f of FOODS) {
      const k = clamp((t - t0 - f.d) / 0.6); if (k <= 0) continue;
      const land = poolY(f.x, t, acid) + f.s * 0.12;
      const x = lerp(G.les.x, f.x, EASE.out(k)), y = lerp(G.les.y + 20, land, k * k), a = lerp(f.a0, f.a1, k) + (k >= 1 ? Math.sin(t * 2 + f.x) * 0.12 : 0);
      ctx.save(); ctx.globalAlpha *= fade * clamp(k * 4); food(ctx, f.kind, x, y, f.s, a); ctx.restore();
      const sk = clamp((t - t0 - f.d - 0.6) / 0.7);
      if (sk > 0 && sk < 1) { ctx.strokeStyle = `rgba(255,240,170,${0.8 * (1 - sk)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, poolY(f.x, t, acid), 14 + 60 * sk, 4 + 12 * sk, 0, 0, TAU); ctx.stroke(); }
    }
  }
  function stomachFoodMarks(ctx, api, cam, t, p, acid = 0.3) {
    if (!(p > 0)) return;
    for (const f of FOODS) { const [sx, sy] = toScreen(cam, f.x, poolY(f.x, t, acid) - f.s * 0.1); api.doodle.cross(ctx, sx, sy, f.s * cam.z * 1.05, p, { color: api.P.marker, width: 10, seed: f.x | 0 }); }
  }

  window.THROAT = {
    C, G, EASE, build, world, camAt, applyCam, toScreen, view, tonsil, stone, cryptSection, cryptPos, CRYPTS, throatBackdrop, front, icons,
    chip, stink, motes, finish, question, food, listChip, poolY, stomachFood, stomachFoodMarks, glow, rgba, sp, sample, at, strokePart, tube, blobPts, rng, canvasFor, particle, puffAt, lin, rad,
  };
})();
