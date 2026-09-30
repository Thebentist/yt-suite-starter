// @use videos/bad-breath-for-good/scenes/real/_lib.js
/* paper-cochrane (research-weak, words 2444-2455): "...and even big studies, I looked at all the small studies,"
 * The real PubMed page of the Cochrane review (Kumbargere Nagraj et al. 2019, research-notes row 11) lands on "even
 * big studies" with a circle on the journal (Cochrane Database Syst Rev); hard cut on "looked" to "We included 44
 * trials in the review with 1809 participants": highlight on "all the", circle "44 trials" on "small studies". Ends as
 * the data group's COCHRANE REVIEW card slides in (word 2455), which keeps the certainty grade and the WEAK stamp.
 */
defineScene({
  name: 'paper-cochrane', fps: 30,
  anchor: { word: 2444, offset: -0.1 }, anchorEnd: { word: 2455, offset: -0.1 }, tail: 0.3,
  assets: { page: REAL.img('paper-cochrane-2019.png') },
  async setup(api) { this.m = await REAL.meta('paper-cochrane-2019'); this.A = REAL.layer(api); this.B = REAL.layer(api); },
  draw(ctx, t, api) {
    const K = 'We included 44 trials in the review with 1809 participants';
    REAL.paper(ctx, t, api, this, {
      im: api.image('page'), m: this.m, cut: api.at(2449) - 0.06,
      wide: { fx: 520, fy: 360, s0: 1.36, s1: 1.44, x: 960, y: 540, enter: 0.4, from: [180, 640], rot0: -0.06, rot1: -0.02 },
      close: { key: K, fx: 470, fy: 1372, s0: 2.35, s1: 2.47, y: 540, dx: -26 },
      marks: [
        { kind: 'under', key: 'Cochrane Database Syst Rev', t0: api.at(2446) - 0.02, dur: 0.3, width: 7, seed: 41 },
        { kind: 'hl', key: K, t0: api.at(2450) - 0.12, dur: 0.5 },
        { kind: 'ring', key: '44 trials', t0: api.at(2453) - 0.02, dur: 0.34, padX: 16, padY: 15, width: 9, seed: 43 },
      ],
      source: 'PubMed · Cochrane review, Kumbargere Nagraj et al. 2019',
    });
    api.finish(ctx, t, { bloom: 0.1, grain: 0.055, vignette: 0.42 });
  },
});
