// @use videos/bad-breath-for-good/scenes/real/_lib.js
/* paper-romano (study-card, words 632-650): "And people have actually tested how good we are at this."
 * The real PubMed page of Romano et al., Int J Dent Hyg 2010 (research-notes row 4) lands; hard cut on "how" to the
 * title, a highlighter sweeps "Patients' self-assessment of oral malodour" on "how good we are" and the marker circles
 * "self-assessment" on "at this". Ends as "They had people..." starts, where the data group's method figures take over.
 * The 37.8% result is left for the data group's own reveal ("right less than half the time").
 */
defineScene({
  name: 'paper-romano', fps: 30,
  anchor: { word: 632, offset: -0.12 }, anchorEnd: { word: 650, offset: -0.1 }, tail: 0.3,
  assets: { page: REAL.img('paper-romano-2010.png') },
  async setup(api) { this.m = await REAL.meta('paper-romano-2010'); this.A = REAL.layer(api); this.B = REAL.layer(api); },
  draw(ctx, t, api) {
    const K = "Patients' self-assessment of oral malodour";
    REAL.paper(ctx, t, api, this, {
      im: api.image('page'), m: this.m, cut: api.at(637) - 0.06,
      wide: { fx: 640, fy: 520, s0: 0.98, s1: 1.03, x: 960, y: 560, from: [-160, 700], rot0: 0.06, rot1: 0.015 },
      close: { key: K, fx: 560, fy: 400, s0: 2.05, s1: 2.16, y: 470, dx: -30, band: 40 },
      marks: [
        { kind: 'hl', key: K, t0: api.at(638) - 0.1, dur: 0.55 },
        { kind: 'ring', key: 'self-assessment', t0: api.at(640) - 0.05, dur: 0.36, padX: 18, padY: 16, width: 9, seed: 21 },
      ],
      source: 'PubMed · Romano et al., Int J Dent Hyg 2010',
    });
    api.finish(ctx, t, { bloom: 0.1, grain: 0.055, vignette: 0.42 });
  },
});
