// @use videos/bad-breath-for-good/scenes/cgi/_lib.js
/* cgi-lineup (words 4644-4707, ~13:01-13:13): "And I kind of love it, because honestly, now that you have all this knowledge,
 * you should be able to fix your bad breath in just a couple weeks. With a scraper that only costs a few bucks,
 * toothbrush and floss that you already have, or some new cool products that are out on the market that are really
 * kind of tackling this in a different way."
 * Same studio as cgi-brush-floss (whose ending left the middle plinth empty): the lights come on over the empty middle
 * plinth, macro teasers of brushed steel, then the reveal on "scraper": a generic stainless U tongue scraper, held the
 * way you'd hold it (end caps toward us, bend away), with a paper price tag hanging from its right end cap on a string.
 * The tag is 3D (lit by the studio, in the depth of field, swinging), and its handwriting writes itself on the words:
 * "only" (4674), "a few" / "bucks" (4676-4678), then a red underline. On "toothbrush" and "floss" the generic brush and
 * floss drop onto the side plinths with handwritten "toothbrush ✓" / "floss ✓" pinned to them and "already have" in
 * lime. On "new cool products" the camera trucks right to two panels showing Ben's own product photos (Something Nice:
 * Zero Pro, AquaClean Duo, from assets/somethingnice at his request; dimmed, cropped to the product, kept out of the
 * bloom); the last shot pulls back to the whole set. No brand on the generic three.
 * Starts exactly where story/recap ends (word 4640 end + 0.25; the brief's 4644 - 0.15 would flash Ben for one frame).
 * This scene now carries the few-bucks price tag and labels itself (the overlay few-bucks is out of the edit).
 */
const PI = Math.PI;
const SN = 'videos/bad-breath-for-good/assets/somethingnice/';
const TAG_W = 0.32, TAG_H = 0.36, TAG_TOP = 0.025;       // tag size (units = 10 cm) and how far its top sits above the hole
const TAG_UNIFORMS = `
uniform vec4 uTgP; uniform vec3 uTgX; uniform vec3 uTgY; uniform vec3 uTgZ; uniform vec3 uStA;
uniform sampler2D uImgC;
`;
const TAG_GLSL = `
void setupExtra(){}
// paper price tag, local: x right, y up (0 at the hole), z toward the viewer; chamfered top corners, round hole
float sdTag(vec3 q){
  vec2 p = q.xy;
  vec2 b = abs(p - vec2(0., ${(TAG_TOP - TAG_H / 2).toFixed(4)})) - vec2(${(TAG_W / 2).toFixed(4)}, ${(TAG_H / 2).toFixed(4)});
  float d2 = length(max(b, 0.)) + min(max(b.x, b.y), 0.);
  d2 = max(d2, (abs(p.x) + p.y - ${(TAG_TOP + TAG_W / 2 - 0.07).toFixed(4)}) * 0.7071);
  d2 = max(d2, -(length(p) - 0.013));
  vec2 w = vec2(d2, abs(q.z) - 0.0022);
  return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - 0.0008;
}
void mapExtra(vec3 p, inout float d){
  if (uTgP.w < 0.5) return;
  vec3 r = p - uTgP.xyz;
  float bb = length(r + uTgY * 0.155) - 0.28;
  if (bb < d) {
    if (bb > 0.12) d = bb;
    else { vec3 q = vec3(dot(r, uTgX), dot(r, uTgY), dot(r, uTgZ)); float dt = sdTag(q); if (dt < d) { d = dt; gMat = 23.; gL = q; } }
  }
  float ds = sdCapsule(p, uStA, uTgP.xyz, 0.0022);
  if (ds < d) { d = ds; gMat = 24.; gL = p; }
}
void matExtra(float mat, vec3 L, vec4 X, vec3 n, inout Mat m){
  if (mat < 23.5) {
    m.alb = vec3(0.92, 0.89, 0.82); m.rough = 0.65; m.f0 = 0.03; m.sss = 0.15;
    if (L.z > 0.) {
      vec4 tx = texture(uImgC, vec2(L.x / ${TAG_W.toFixed(4)} + 0.5, (${TAG_TOP.toFixed(4)} - L.y) / ${TAG_H.toFixed(4)}));
      m.alb = mix(m.alb, pow(tx.rgb, vec3(2.2)), tx.a);
    }
  } else { m.alb = vec3(0.82, 0.76, 0.66); m.rough = 0.7; m.f0 = 0.02; }
}
`;
const V = CGI.V;
const norm = (a) => V.mul(a, 1 / (V.len(a) || 1));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

defineScene({
  name: 'cgi-lineup',
  anchor: { word: 4640, edge: 'end', offset: 0.25 },
  anchorEnd: { word: 4707, edge: 'end', offset: 0.25 },
  tail: 0.5,
  params: { res: 0.5, aa: 2 },
  assets: {
    zp: { image: SN + 'zero-pro-toothpaste/02-ZeroPro-PDP-02-1.png' },
    acd: { image: SN + 'aquaclean-duo/01-ACD_PDP_01.png' },
  },
  setup(api) {
    this.tag = document.createElement('canvas'); this.tag.width = 520; this.tag.height = 585;
    this.r = CGI.create(api, { res: +api.params.res, aa: +api.params.aa, imgA: api.image('zp'), imgB: api.image('acd'), imgC: this.tag,
      extra: TAG_GLSL, extraUniforms: TAG_UNIFORMS });
    const A = (i) => api.at(i);
    this.T = { love: A(4645), knowledge: A(4655), breath: A(4664), weeks: A(4669), scraper: A(4672), only: A(4674),
      a: A(4676), few: A(4677), bucks: A(4678), bucksEnd: api.atEnd(4678), toothbrush: A(4679), floss: A(4681),
      already: A(4684), haveEnd: api.atEnd(4685), or: A(4686), neu: A(4688), products: A(4690), market: A(4696),
      tackling: A(4702), different: A(4706), way: A(4707) };
    const T = this.T;
    this.cuts = [0, T.knowledge, T.breath, T.scraper, T.toothbrush, T.or, T.market, T.different];
  },
  // the tag's handwriting, redrawn each frame and uploaded as texture C
  drawTag(api, t) {
    const g = this.tag.getContext('2d'), T = this.T, { prog, ease, P } = api, lin = ease.linear;
    g.clearRect(0, 0, 520, 585);
    const hx = 260, hy = 585 * TAG_TOP / TAG_H;           // the hole
    g.fillStyle = 'rgba(176,150,112,0.55)'; g.beginPath(); g.arc(hx, hy, 30, 0, PI * 2); g.fill();
    const ink = '#211e27', size = 112;
    // the words write on as Ben says them; the underline lands between "few" and the cut to the wide shot
    api.doodle.text(g, 'only', hx, 200, prog(t, T.only, 0.3, lin), { color: ink, size, align: 'center' });
    api.doodle.text(g, 'a few', hx, 352, prog(t, T.a, 0.14, lin), { color: ink, size, align: 'center' });
    api.doodle.text(g, 'bucks', hx, 500, prog(t, T.bucks, 0.2, lin), { color: ink, size, align: 'center' });
    api.font(g, { size, weight: 700, family: 'hand' });
    const wAF = g.measureText('a few').width, wA = g.measureText('a ').width, wF = g.measureText('few').width, wB = g.measureText('bucks').width;
    const u0 = T.few + 0.03, u = prog(t, u0, Math.max(0.2, T.toothbrush - 0.08 - u0), ease.inOutCubic);
    const x0 = hx - wAF / 2 + wA - 6;
    api.doodle.underline(g, x0, x0 + wF + 12, 376, api.clamp(u * 2), { color: P.marker, width: 11, seed: 31 });
    api.doodle.underline(g, hx - wB / 2 - 8, hx + wB / 2 + 8, 524, api.clamp(u * 2 - 1), { color: P.marker, width: 11, seed: 37 });
  },
  draw(ctx, t, api) {
    const { ease, prog, P } = api, T = this.T, S = CGI.shot(this.cuts, t, api.duration), k = S.k;
    const s = CGI.baseState();
    const bob = (ph) => 0.008 * Math.sin(t * 1.3 + ph);
    // lights: the middle spot flicks on over the empty plinth, then the softboxes fade up; full on at the reveal
    const up = ease.inOutSine(api.clamp((t - T.love - 0.5) / 1.2));
    s.lit = [0.15 + 0.85 * up, 0.25 + 0.75 * up, 0.25 + 0.75 * up, up];
    s.spot = [0, 1.6 * CGI.flick(t - T.love), 0]; s.haze = 0.9;
    // the scraper descends onto the middle plinth during the teasers and lands just before the reveal. Held the way you'd
    // hold it: end caps toward the camera and low, the bend away and higher; a gentle turntable sway
    const land = ease.outCubic(api.clamp((t - T.knowledge) / Math.max(0.5, T.scraper - T.knowledge - 0.1)));
    const scrRot = [-0.1 + 0.3 * Math.sin(0.4 * (t - T.scraper)), 1.12, 0];
    const scrC = [0, 0.70 + 0.55 * (1 - land) + bob(0), 0];
    s.scr = { pos: V.sub(scrC, CGI.rotate(scrRot, [0, 0.47, 0])), rot: scrRot, on: t >= T.knowledge ? 1 : 0 };
    // the price tag: a short string from the right end cap's tip, a pendulum swing, a slow twist around the string
    const cap = CGI.toWorld(s.scr, [0.22, -0.006, 0]);
    const uS = Math.max(0, t - T.scraper);
    const th = 0.11 * Math.sin(2.3 * uS + 0.6) * Math.exp(-0.12 * uS) + 0.03 * Math.sin(3.9 * t);
    const ph = 0.06 * Math.sin(1.9 * uS + 1.1);
    const down = norm([Math.sin(th), -Math.cos(th) * Math.cos(ph), Math.sin(ph)]);
    const hole = V.add(cap, V.mul(down, 0.05)), Y = V.mul(down, -1);
    const tw = -0.10 + 0.16 * Math.sin(0.8 * t + 0.3);
    const Z0 = [-Math.sin(tw), 0, -Math.cos(tw)];
    const Z = norm(V.sub(Z0, V.mul(Y, dot(Z0, Y)))), X = cross(Z, Y);
    const tagOn = s.scr.on && t >= T.scraper ? 1 : 0;
    s.extraU = { uTgP: [...hole, tagOn], uTgX: X, uTgY: Y, uTgZ: Z, uStA: cap };
    // brush and floss drop onto the side plinths on their words
    const drop = (t0) => { const u = api.clamp((t - t0 + 0.05) / 0.5); return u <= 0 ? 1 : 1 - ease.outBack(u, 1.2); };
    const db = drop(T.toothbrush), df = drop(T.floss);
    s.brush = { pos: [-1, 0.24 + 1.7 * db + bob(1), 0], rot: [1.25 + 0.06 * t + 2.2 * db, 0, 0], on: t >= T.toothbrush - 0.06 ? 1 : 0 };
    s.floss = { pos: [1, 0.50 + 1.7 * df + bob(2), 0], rot: [-0.75 + 0.08 * t - 2.0 * df, -1.0, 0], on: t >= T.floss - 0.06 ? 1 : 0 };
    s.spot[0] = 1.0 * CGI.flick(t - T.toothbrush - 0.25); s.spot[2] = 1.0 * CGI.flick(t - T.floss - 0.25);
    // Ben's products: two light panels in the same studio, to the right of the plinths
    s.cards = t >= T.or ? 1 : 0; s.cardH = 0.52;
    // photos at ~0.7 of their full brightness, cropped in on the product (less white), and kept out of the bloom
    s.cardGain = 0.5; s.cropA = [0.133, 0.104, 0.70, 0.70]; s.cropB = [0.062, 0.062, 0.82, 0.82];
    s.ca = { pos: [2.45, 0.64, 0.25], yaw: 0.22, on: 1.25 * CGI.flick(t - T.neu) };
    s.cb = { pos: [3.62, 0.64, 0.45], yaw: 0.34, on: 1.25 * CGI.flick(t - T.products) };

    let focusAt = null;
    if (S.i === 0) {
      // lights on over the empty middle plinth
      s.ta = [0, 0.32, 0];
      s.ro = CGI.orbit(s.ta, 3.4 - 0.45 * ease.inOutSine(k), 14 - 6 * k, 7);
      s.lens = 3.0; s.aper = 0.005;
    } else if (S.i === 1) {
      // macro: the brushed steel band of the U bend, sliding past as the scraper turns and descends
      s.ta = CGI.toWorld(s.scr, [0.0, 0.94, 0.0]);
      s.ro = CGI.orbit(s.ta, 0.42 - 0.05 * k, 24 - 14 * k, 26);
      s.lens = 4.0; s.aper = 0.012; s.maxR = 26; s.lit = [0.35, 1.3, 1.1, 0.6]; s.fil = 0;
    } else if (S.i === 2) {
      // low angle: the arch in silhouette, rim-lit against the lavender glow
      s.ta = scrC.slice();
      s.ro = CGI.orbit(s.ta, 1.45 - 0.15 * k, 24 - 10 * k, -4);
      s.ro[1] = Math.max(0.12, s.ro[1]);
      s.lens = 3.2; s.aper = 0.006; s.lit = [0.12, 1.4, 1.3, 0.3]; s.bgGlow = 1.5;
    } else if (S.i === 3) {
      // the reveal: the scraper with its price tag; focus on the tag while it writes "only a few bucks"
      s.lit = [1.1, 1, 1, 1];
      s.ta = [0.15, 0.47, -0.22];
      s.ro = CGI.orbit(s.ta, 1.62 - 0.12 * ease.inOutSine(k), -10 + 4 * k, 9);
      s.lens = 2.9; s.aper = 0.004;
      focusAt = V.add(hole, V.mul(Y, -0.155));
    } else if (S.i === 4) {
      // toothbrush and floss drop in: the three lined up like a product shot
      s.lit = [1.1, 1, 1, 1];
      s.ta = [0, 0.84, 0];
      s.ro = CGI.orbit(s.ta, 5.1 - 0.25 * ease.inOutSine(k), 5 - 5 * k, 7);
      s.lens = 2.8; s.aper = 0.0012;
    } else if (S.i === 5) {
      // new cool products: truck right to the two panels, which power on
      s.lit = [0.8, 1, 1, 0.8];
      s.ta = [3.0 + 0.1 * k, 0.64, 0.35];
      s.ro = CGI.orbit(s.ta, 3.3 - 0.25 * ease.inOutSine(k), -8 + 4 * k, 6);
      s.lens = 2.8; s.aper = 0.002;
    } else if (S.i === 6) {
      // closer, sliding across the panels
      s.lit = [0.8, 1, 1, 0.8];
      s.ta = [2.45 + 1.17 * ease.inOutSine(k), 0.64, 0.25 + 0.2 * ease.inOutSine(k)];
      s.ro = CGI.orbit(s.ta, 1.6, -22 + 8 * k, 3);
      s.lens = 2.55; s.aper = 0.004;
    } else {
      // pull back to everything: the three basics and the two new ones
      s.lit = [1.0, 1, 1, 1];
      s.ta = [1.3, 0.70, 0.25];
      s.ro = CGI.orbit(s.ta, 5.5 + 0.35 * ease.inOutSine(k), 10, 8);
      s.lens = 2.9; s.aper = 0.0012;
    }
    s.focus = V.len(V.sub(focusAt || s.ta, s.ro));
    if (tagOn) { this.drawTag(api, t); this.r.updateC(this.tag); }
    CGI.render(ctx, api, this.r, s, t);

    // handwritten labels pinned to the brush and the floss as they land, and "already have"
    if (S.i === 4) {
      const hand = (str, x, y, p, align, check) => {
        if (p <= 0) return;
        const size = 62;
        api.doodle.text(ctx, str, x, y, p, { color: P.ink, size, align, stroke: 'rgba(10,10,15,0.7)', strokeWidth: 10 });
        const w = api.measure(ctx, str, { size, weight: 700, family: 'hand' });
        const xe = align === 'right' ? x : align === 'center' ? x + w / 2 : x + w;
        if (check) api.doodle.check(ctx, xe + 42, y - 20, 22, api.clamp((p - 0.75) / 0.25), { color: P.lime, width: 9, seed: 7, glow: 'rgba(0,0,0,0.5)' });
      };
      const pb = CGI.project(s, CGI.toWorld(s.brush, [0, 1.68, 0])), pf = CGI.project(s, [1, 0.92, 0]);
      if (pb) hand('toothbrush', pb[0] - 110, pb[1] + 20, prog(t, T.toothbrush + 0.12, 0.45, ease.linear), 'right', true);
      if (pf) hand('floss', pf[0] - 40, pf[1] - 90, prog(t, T.floss + 0.12, 0.30, ease.linear), 'center', true);
      api.doodle.text(ctx, 'already have', 1400, 250, prog(t, T.already, Math.max(0.35, T.haveEnd - T.already), ease.linear),
        { color: P.lime, size: 78, align: 'center', stroke: 'rgba(10,10,15,0.7)', strokeWidth: 11, rotate: -0.04 });
    }
    CGI.finishMasked(ctx, t, api, { bloom: 0.32, grain: 0.045, vignette: 0.42 }, CGI.cardQuads(s));
  },
});
