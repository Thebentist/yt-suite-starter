// @use videos/bad-breath-for-good/scenes/cgi/_lib.js
// @use videos/bad-breath-for-good/scenes/cgi/_offers.js
/* cgi-mints (in plan.json, lane 1, replaces micro/mint-mask). Words 2205-2217: "you see, a mint just
 * covers up your breath for a few minutes." Generic peppermint-swirl pillow mints (no brand) in the cgi studio: a macro of
 * one mint turning in the air, then wider with a few more on the middle plinth and a lime chip A FEW MINUTES on "few
 * minutes". Ends exactly where micro/sugar-feeds starts.
 */
const PI = Math.PI;
defineScene({
  name: 'cgi-mints',
  anchor: { word: 2205, offset: -0.15 },
  anchorEnd: { word: 2231, offset: -0.15 },       // = where micro/sugar-feeds starts (2217 ends exactly where 2231 begins)
  tail: 0.5,
  params: { res: 0.5, aa: 2 },
  setup(api) {
    this.r = CGI.create(api, { res: +api.params.res, aa: +api.params.aa, extra: CGI_OFFERS.EXTRA, extraUniforms: CGI_OFFERS.EXTRA_UNIFORMS });
    this.T = { breath: api.at(2213), few: api.at(2216) };
    this.cuts = [0, this.T.breath];
  },
  draw(ctx, t, api) {
    const { ease } = api, T = this.T, S = CGI.shot(this.cuts, t, api.duration), k = S.k;
    const s = CGI.baseState();
    s.spot = [0.35, 1.4, 0.35]; s.haze = 0.8;
    const mint = { pos: [0, 0.44 + 0.012 * Math.sin(t * 1.6), -0.05], rot: [0.55 * Math.sin(1.1 * t), -PI / 2 + 0.28, 0] };
    s.extraU = { uMwP: [0, 0, 0, 0], uMwR: [0, 0, 0], uMnP: [...mint.pos, 1], uMnR: mint.rot, uMints: 1 };
    if (S.i === 0) {
      s.ta = mint.pos.slice();
      s.ro = CGI.orbit(s.ta, 0.46 - 0.05 * k, -16 + 12 * k, 7);
      s.lens = 3.6; s.aper = 0.012; s.maxR = 24;
    } else {
      s.ta = [0, 0.28, 0];
      s.ro = CGI.orbit(s.ta, 1.55 - 0.12 * ease.inOutSine(k), -8, 15);
      s.lens = 3.0; s.aper = 0.004;
    }
    s.focus = CGI.V.len(CGI.V.sub(S.i === 0 ? mint.pos : [0, 0.3, 0], s.ro));
    CGI.render(ctx, api, this.r, s, t);
    if (S.i === 1) api.label(ctx, 'A FEW MINUTES', 1380, 330, { p: api.pop(t, T.few, 0.5), size: 54 });
    api.finish(ctx, t, { bloom: 0.32, grain: 0.045, vignette: 0.42 });
  },
});
