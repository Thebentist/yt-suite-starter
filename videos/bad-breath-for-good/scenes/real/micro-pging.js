// @use videos/bad-breath-for-good/scenes/real/_lib.js
// @use videos/bad-breath-for-good/scenes/real/_micro.js
/* micro-pging (between-teeth, words 1444-1447): "...those gum disease bacteria..."
 * A real scanning-electron micrograph of P. gingivalis (a lab-grown biofilm; Romero-Lastra et al., PLOS ONE 2017,
 * Fig 1B, CC BY 4.0), one of the sulfur-making bacteria named in research-notes row 8, and the one the Zero Pro ad
 * names later. Scale bar from the figure's own 10 µm bar (765 px). The teeth group's sulfur puffs take over on "make".
 */
defineScene({
  name: 'micro-pging', fps: 30,
  anchor: { word: 1444, offset: -0.1 }, anchorEnd: { word: 1448, offset: 0.12 }, tail: 0.3,
  assets: { im: REAL.img('micro-pgingivalis-sem-plos2017.jpg') },
  draw(ctx, t, api) {
    MICRO.draw(ctx, t, api, api.image('im'), {
      scope: { ix: 0.62, iy: 0.55, zoom0: 1.0, zoom1: 1.12, dur: 1.5, blur: 14, focusDur: 0.4, rot: 0.04 },
      label: 'P. gingivalis', sub: 'A GUM-DISEASE BACTERIUM', sub2: 'ELECTRON MICROSCOPE · LAB CULTURE', labelAt: 0.14,
      bar: { px: 765, label: '10 µm' },
      source: 'Romero-Lastra et al., PLOS ONE 2017 (CC BY 4.0)',
    });
    api.finish(ctx, t, { bloom: 0.14, grain: 0.06, vignette: 0.4 });
  },
});
