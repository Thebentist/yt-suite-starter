// @use videos/bad-breath-for-good/scenes/real/_lib.js
/* paper-quirynen (Ben on camera between the name-card and clinic-2000, words 1311-1319): "But they have this whole
 * clinic just for breath." Starts where the overlay group's quirynen card ends (word 1310 end + 0.6) and ends where
 * clinic-2000 starts. The real PubMed page of Quirynen et al., J Clin Periodontol 2009 (research-notes row 3) lands;
 * hard cut on "clinic" to the title: highlight "halitosis clinic", marker circle on "2000", then the data group's
 * counter counts to 2,000 on "2,000 patients".
 */
defineScene({
  name: 'paper-quirynen', fps: 30,
  anchor: { word: 1310, edge: 'end', offset: 0.6 }, anchorEnd: { word: 1328, offset: -0.15 }, tail: 0.3,
  assets: { page: REAL.img('paper-quirynen-2009.png') },
  async setup(api) { this.m = await REAL.meta('paper-quirynen-2009'); this.A = REAL.layer(api); this.B = REAL.layer(api); },
  draw(ctx, t, api) {
    const K = 'Characteristics of 2000 patients who visited a halitosis clinic';
    REAL.paper(ctx, t, api, this, {
      im: api.image('page'), m: this.m, cut: api.at(1316) - 0.1,
      wide: { fx: 640, fy: 500, s0: 1.02, s1: 1.07, x: 960, y: 560, enter: 0.4 },
      close: { key: K, fx: 470, fy: 400, s0: 2.2, s1: 2.32, y: 520, dx: -24, band: 36 },
      marks: [
        { kind: 'hl', key: 'halitosis clinic', t0: api.at(1316) - 0.02, dur: 0.36 },
        { kind: 'ring', key: '2000', t0: api.at(1318) - 0.22, dur: 0.32, padX: 16, padY: 14, width: 9, seed: 31 },
      ],
      source: 'PubMed · Quirynen et al., J Clin Periodontol 2009',
    });
    api.finish(ctx, t, { bloom: 0.1, grain: 0.055, vignette: 0.42 });
  },
});
