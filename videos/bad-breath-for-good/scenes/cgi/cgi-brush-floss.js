// @use videos/bad-breath-for-good/scenes/cgi/_lib.js
/* cgi-brush-floss (words 2342-2401, ~8:01-8:13): "it's not like if you have that breath, you're not cleaning your mouth or
 * taking care of your mouth. It's probably a little different than that. I mean, more likely, you're probably doing what
 * you're doing. You're probably brushing, you're probably flossing. It's just that you're not doing exactly what you
 * need to do to get rid of that bad breath."
 * A studio product shoot of a generic toothbrush and floss (no brand) on two of three plinths. Seven hard cuts on the
 * words: bristle macro, wide hero, floss macro, brush head, the two-shot with BRUSHING / FLOSSING checks, then the
 * empty middle plinth: its spot flicks on, lighting nothing, and gets a red marker circle and a "?". The next scene
 * (tongue/one-spot) names the spot, so this one only hints at it.
 * Starts exactly where tongue/brush-vs-scrape ends (word 2328 end + 0.25; the brief's 2342 - 0.15 would leave a
 * 3-frame flash of Ben) and ends exactly where tongue/one-spot starts (2402 - 0.15).
 */
const PI = Math.PI;
defineScene({
  name: 'cgi-brush-floss',
  anchor: { word: 2328, edge: 'end', offset: 0.25 },
  anchorEnd: { word: 2402, offset: -0.15 },
  tail: 0.5,
  params: { res: 0.5, aa: 2 },
  setup(api) {
    // more march steps: rays that skim many thin filaments need them (a ray that runs out of steps shows as a popping hole)
    this.r = CGI.create(api, { res: +api.params.res, aa: +api.params.aa, steps: 320 });
    const A = (i) => api.at(i);
    this.T = { mouth: A(2353), different: A(2364), doing: A(2373), brushing: A(2379), flossing: A(2382), not: A(2387),
      exactly: A(2389), what: A(2390), need: A(2392), rid: A(2397), breath: A(2401), end: A(2402) - 0.15 };
    const T = this.T;
    this.cuts = [0, T.mouth, T.different, T.doing, T.brushing, T.not, T.what];
  },
  // the whole 3D state as a function of time (so a frame can be rendered as several subframes)
  stateAt(t, api) {
    const { ease } = api, T = this.T, S = CGI.shot(this.cuts, t, api.duration), k = S.k;
    const s = CGI.baseState();
    const bob = (ph) => 0.008 * Math.sin(t * 1.3 + ph);
    // the stand-up set: brush on the left plinth (in profile, bristles to the right), floss on the right, middle empty
    s.brush = { pos: [-1, 0.24 + bob(0), 0], rot: [1.25 + 0.06 * t, 0, 0], on: 1 };
    s.floss = { pos: [1, 0.50 + bob(1.7), 0], rot: [-0.75 + 0.08 * t, -1.0, 0], on: 1 };
    s.spot = [1.0, 0, 1.0]; s.haze = 0.5; s.fil = 0;
    const moody = () => { s.lit = [0.40, 0.85, 0.85, 0.0]; s.spot = [0.5, 2.4 * CGI.flick(t - T.exactly), 0.5]; s.haze = 1.0; s.bgGlow = 0.6; };
    if (S.i === 0) {
      // bristle macro: the brush lies bristles-up, the camera skims the tuft tips
      s.brush = { pos: [-1.685, 0.50, 0], rot: [0, -PI / 2, -PI / 2], on: 1 };
      s.floss.on = 0; s.fil = 1; s.haze = 0;
      // a slow, constant-speed drift (was 14 degrees and 8 mm of travel in 2.3 s)
      s.ta = [-0.01 + 0.025 * k, 0.645, 0.0];
      s.ro = CGI.orbit(s.ta, 0.335 - 0.012 * k, -27 + 5 * k, 22);
      s.lens = 4.4; s.aper = 0.022; s.maxR = 30; s.lit = [0.6, 1.4, 1.2, 0.6];
    } else if (S.i === 1) {
      s.ta = [0, 0.92, 0];
      s.ro = CGI.orbit(s.ta, 4.35 - 0.25 * k, -7 + 7 * k, 8);
      s.lens = 2.75; s.aper = 0.0016;
    } else if (S.i === 2) {
      // floss hero, three-quarter: the pearl lid, the mint base glowing at the seam, the strand curling out
      s.brush.on = 0;
      s.ta = [1.06, 0.60, 0];
      s.ro = CGI.orbit(s.ta, 1.15 - 0.12 * ease.inOutSine(k), -68 + 12 * k, 4);
      s.lens = 3.4; s.aper = 0.006; s.maxR = 22; s.expo = 0.85;
    } else if (S.i === 3) {
      // brush head in profile, backlit by the rim strip
      const hc = CGI.toWorld(s.brush, [0, 1.64, 0.05]);
      s.ta = hc;
      s.ro = CGI.orbit(s.ta, 0.84 - 0.06 * k, -40 + 6 * k, 12);
      s.lens = 3.6; s.aper = 0.006; s.fil = 1; s.lit = [0.8, 1.3, 1.1, 0.7];
    } else if (S.i === 4) {
      // the two-shot: brushing, flossing
      s.ta = [0, 0.78, 0];
      s.ro = CGI.orbit(s.ta, 4.8 - 0.3 * ease.inOutSine(k), -3, 4);
      s.lens = 2.7; s.aper = 0.001;
    } else if (S.i === 5) {
      // the studio dims; truck toward the middle; the empty plinth's spot flicks on and lights nothing
      moody();
      s.ta = [0, 0.40, 0];
      s.ro = CGI.orbit(s.ta, 3.2 - 0.3 * k, -16 + 10 * ease.inOutSine(k), 6);
      s.lens = 3.0; s.aper = 0.006;
    } else {
      moody();
      s.ta = [0, 0.26, 0];
      s.ro = CGI.orbit(s.ta, 1.75 - 0.2 * ease.inOutSine(k), 6, 11);
      s.lens = 3.2; s.aper = 0.006;
    }
    s.focus = V.len(V.sub(S.i === 6 ? [0, 0.07, 0] : s.ta, s.ro));
    return { s, S };
  },
  draw(ctx, t, api) {
    const { ease, prog, P } = api, T = this.T;
    const { s, S } = this.stateAt(t, api);
    if (S.i === 0 || S.i === 3) {
      // filament shots: 4 subframes over a 180-degree shutter, averaged (motion blur + temporal anti-aliasing), kept
      // inside the shot so a subframe never crosses a cut
      const N = 4, c0 = this.cuts[S.i], c1 = (S.i + 1 < this.cuts.length ? this.cuts[S.i + 1] : api.duration) - 1e-3;
      if (!this.acc || this.acc.width !== ctx.canvas.width) { this.acc = document.createElement('canvas'); this.acc.width = ctx.canvas.width; this.acc.height = ctx.canvas.height; }
      const a = this.acc.getContext('2d');
      for (let j = 0; j < N; j++) {
        const tj = Math.min(c1, Math.max(c0, t + ((j + 0.5) / N - 0.5) * (0.5 / api.fps)));
        const sj = this.stateAt(tj, api).s;
        const cv = this.r.draw(CGI.uniforms(sj, tj), { focus: sj.focus, aper: sj.aper, maxR: sj.maxR, expo: sj.expo });
        a.globalAlpha = 1 / (j + 1); a.drawImage(cv, 0, 0, this.acc.width, this.acc.height);
      }
      a.globalAlpha = 1;
      ctx.drawImage(this.acc, 0, 0, api.W, api.H);
    } else CGI.render(ctx, api, this.r, s, t);

    // overlays
    if (S.i === 4) {
      const pb = CGI.project(s, CGI.toWorld(s.brush, [0, 1.62, 0])), pf = CGI.project(s, [1, 0.98, 0]);
      if (pb) CGI.checkChip(ctx, api, 'BRUSHING', pb[0] - 70, pb[1], api.pop(t, T.brushing + 0.04, 0.5), { size: 52, align: 'right' });
      if (pf) CGI.checkChip(ctx, api, 'FLOSSING', pf[0] + 30, pf[1] - 80, api.pop(t, T.flossing + 0.04, 0.5), { size: 52, align: 'center' });
    }
    if (S.i === 6) {
      const c = CGI.project(s, [0, 0.07, 0]), ex = CGI.project(s, [0.46, 0.07, 0]), ez = CGI.project(s, [0, 0.07, -0.46]);
      if (c && ex && ez) {
        const rx = Math.abs(ex[0] - c[0]) * 1.05, ry = Math.max(40, Math.abs(ez[1] - c[1]));
        api.doodle.circle(ctx, c[0], c[1] - ry * 0.22, rx, ry * 1.28, prog(t, T.need - 0.05, 0.6, ease.inOutCubic), { color: P.marker, width: 11, seed: 21, glow: 'rgba(255,59,59,0.35)' });
        api.doodle.text(ctx, '?', c[0] + rx + 30, c[1] - ry * 1.5, prog(t, T.rid, 0.35), { color: P.marker, size: 210, stroke: 'rgba(0,0,0,0.5)', strokeWidth: 12, rotate: 0.12 });
      }
    }
    api.finish(ctx, t, { bloom: 0.32, grain: 0.045, vignette: 0.42 });
  },
});
function V3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
const V = CGI.V;
