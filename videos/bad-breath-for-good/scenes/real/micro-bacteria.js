// @use videos/bad-breath-for-good/scenes/real/_lib.js
// @use videos/bad-breath-for-good/scenes/real/_micro.js
/* micro-bacteria (anaerobes / colony3d, words 1049-1052): "The bacteria, they absolutely..."
 * A real image of bacteria living on a human tongue: a microbial consortium from the tongue's surface, each color a
 * different kind of bacterium (CLASI-FISH spectral imaging; Wilbert, Mark Welch & Borisy, Cell Reports 2020; image via
 * the Marine Biological Laboratory, credit Steven Wilbert and Gary Borisy, The Forsyth Institute). Scale bar from the
 * image's own 20 µm bar. Cuts back to the animated colony on "love it down there".
 */
defineScene({
  name: 'micro-bacteria', fps: 30,
  anchor: { word: 1049, offset: -0.1 }, anchorEnd: { word: 1053, offset: -0.06 }, tail: 0.3,
  assets: { im: REAL.img('micro-tongue-bacteria-clasifish.jpg') },
  draw(ctx, t, api) {
    MICRO.draw(ctx, t, api, api.image('im'), {
      scope: { ix: 0.47, iy: 0.53, zoom0: 1.12, zoom1: 1.28, dur: 1.9, blur: 16, focusDur: 0.45, rot: -0.05 },
      label: 'Real tongue bacteria', sub: 'EACH COLOR IS A DIFFERENT KIND', sub2: 'FLUORESCENCE MICROSCOPE', labelAt: 0.18,
      bar: { px: 198, label: '20 µm' },
      source: 'Wilbert, Mark Welch & Borisy, Cell Reports 2020 · MBL / Forsyth',
    });
    api.finish(ctx, t, { bloom: 0.22, grain: 0.06, vignette: 0.4 });
  },
});
