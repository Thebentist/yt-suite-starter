// @use videos/bad-breath-for-good/scenes/real/_lib.js
/* paper-memon (mouth-stat, words 439-448): "And more than likely, it's actually your mouth, like eight..."
 * The real PubMed page of Memon et al., Oral Diseases 2023 (research-notes row 2) lands on the desk; hard cut on
 * "actually" to the line "Eighty to ninety percent of halitosis is caused by intra-oral factors": a highlighter sweeps
 * it on "your mouth" and a marker circles "Eighty to ninety percent" on "like"; then the data group's 8-9/10 count
 * takes over on "eight". Lane 3 over mouth-stat's slow icon build.
 */
defineScene({
  name: 'paper-memon', fps: 30,
  anchor: { word: 439, offset: -0.12 }, anchorEnd: { word: 448, offset: 0.1 }, tail: 0.3,
  assets: { page: REAL.img('paper-memon-2023.png') },
  async setup(api) { this.m = await REAL.meta('paper-memon-2023'); this.A = REAL.layer(api); this.B = REAL.layer(api); },
  draw(ctx, t, api) {
    const K = 'Eighty to ninety percent of halitosis is caused by intra-oral factors';
    REAL.paper(ctx, t, api, this, {
      im: api.image('page'), m: this.m, cut: api.at(444) - 0.06,
      wide: { fx: 640, fy: 470, s0: 1.0, s1: 1.05, x: 960, y: 560 },
      close: { key: K, fx: 520, fy: 858, s0: 2.3, s1: 2.42, y: 560 },
      marks: [
        { kind: 'hl', key: K, t0: api.at(445) - 0.28, dur: 0.62 },
        { kind: 'ring', key: 'Eighty to ninety percent', t0: api.at(446) - 0.06, dur: 0.34, padX: 16, padY: 12, width: 9, seed: 12 },
      ],
      source: 'PubMed · Memon et al., Oral Diseases 2023',
    });
    api.finish(ctx, t, { bloom: 0.1, grain: 0.055, vignette: 0.42 });
  },
});
