// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* something-nice (words 3129-3141: "...at Something Nice, my own company, created a way to deal with this").
 * Ben on camera at ~9:50 (v4d). A premium lower third in the brand's own light (aqua-teal accent): the glass card opens
 * on "at"; Ben's official logo (assets/somethingnice/sn-logo-white.png, "Something ♥ Nice", white on transparent, sent
 * by Ben 2026-09-29: "would love our actual logo here") reveals with a soft-edged wipe and a slight rise on "Something";
 * BEN'S OWN COMPANY wipes on with "my own company"; it folds away before "that has never been done".
 * The logo is trimmed to its visible pixels and pre-scaled once to its exact on-screen size (never upscaled, never
 * distorted), then drawn on the pixel grid so it stays crisp at 4K. The AD chip (lane 3) stays top-left above it.
 */
defineScene({
  name: 'something-nice', fps: 30, transparent: true,
  anchor: { word: 3129, offset: -0.2 }, anchorEnd: { word: 3142, offset: 0 }, tail: 0.5,
  plan: { lane: 2 }, sfx: [{ w: 3129, kind: 'whoosh-soft', d: -0.1 }, { w: 3130, kind: 'pop' }],
  assets: { logo: { image: 'videos/bad-breath-for-good/assets/somethingnice/sn-logo-white.png' } },
  setup(api) {
    // logo height 64 design px (cap height ~ the old 72 px type's), top 24 px inside the card
    this.logo = OV.makeLogo(api, api.image('logo'), 64);
    this.logo.top = 24;
  },
  draw(ctx, t, api) {
    const END = OV.endT(api, this.anchorEnd);
    OV.lowerThird(ctx, api, t, {
      name: 'Something Nice', logo: this.logo, sub: "BEN'S OWN COMPANY", t0: api.at(3129) - 0.08, tSub: api.at(3132), end: END, x: 96, y: 842,
      nameSize: 72, subSize: 32, accent: [127, 227, 214], tint: '127,227,214',
    });
  },
});
