// @use videos/bad-breath-for-good/scenes/cgi/_lib.js
// @use videos/bad-breath-for-good/scenes/cgi/_offers.js
/* cgi-mouthwash (in plan.json, lane 3: a cutaway on top of the start of teeth/alcohol-mouthwash). Words 2552-2560:
 * "And then obviously we have the alcohol mouthwash thing." A generic amber mouthwash bottle (no brand; the label only
 * says MOUTHWASH / ALCOHOL, Ben's words) on the middle plinth of the cgi studio: a slow 3/4 hero, then a close-up on the
 * label on "alcohol".
 */
const PI = Math.PI;
defineScene({
  name: 'cgi-mouthwash',
  anchor: { word: 2552, offset: -0.15 },
  anchorEnd: { word: 2560, edge: 'end', offset: 0.25 },
  tail: 0.5,
  params: { res: 0.5, aa: 2 },
  setup(api) {
    // the printed label: plain type, no brand, no invented claims
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#f1ece2'; g.fillRect(0, 0, 1024, 1024);
    g.fillStyle = '#c9761c'; g.fillRect(0, 120, 1024, 26); g.fillRect(0, 878, 1024, 26);
    const txt = (s, y, px, w, col, tr) => { g.font = `${w} ${px}px Bahnschrift, "Segoe UI", Arial`; try { g.fontStretch = 'condensed'; g.letterSpacing = tr + 'px'; } catch (e) {} g.fillStyle = col; g.textAlign = 'center'; g.fillText(s, 512, y); };
    txt('MOUTHWASH', 380, 104, 600, '#6b5a45', 16);
    txt('ALCOHOL', 640, 250, 700, '#2a2320', 4);
    this.r = CGI.create(api, { res: +api.params.res, aa: +api.params.aa, imgA: c, extra: CGI_OFFERS.EXTRA, extraUniforms: CGI_OFFERS.EXTRA_UNIFORMS });
    this.T = { alcohol: api.at(2558) };
    this.cuts = [0, this.T.alcohol];
  },
  draw(ctx, t, api) {
    const { ease } = api, S = CGI.shot(this.cuts, t, api.duration), k = S.k;
    const s = CGI.baseState();
    s.spot = [0.35, 1.4, 0.35]; s.haze = 0.8;
    const mw = { pos: [0, 0.075 + 0.006 * Math.sin(t * 1.3), 0], rot: [PI - 0.5 + 0.22 * t, 0, 0] };
    s.extraU = { uMwP: [...mw.pos, 1], uMwR: mw.rot, uMnP: [0, 0, 0, 0], uMnR: [0, 0, 0], uMints: 0 };
    if (S.i === 0) {
      s.ta = [0.25, 1.02, 0];
      s.ro = CGI.orbit(s.ta, 3.9 - 0.25 * ease.inOutSine(k), -14 + 6 * k, 9);
      s.lens = 2.8; s.aper = 0.002;
    } else {
      s.ta = CGI.toWorld(mw, [0, 0.74, 0.25]);
      s.ro = CGI.orbit(s.ta, 1.25 - 0.12 * ease.inOutSine(k), -22 + 8 * k, 5);
      s.lens = 3.2; s.aper = 0.006;
    }
    s.focus = CGI.V.len(CGI.V.sub(s.ta, s.ro));
    CGI.render(ctx, api, this.r, s, t);
    api.finish(ctx, t, { bloom: 0.32, grain: 0.045, vignette: 0.42 });
  },
});
