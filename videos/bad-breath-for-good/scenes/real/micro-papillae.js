// @use videos/bad-breath-for-good/scenes/real/_lib.js
// @use videos/bad-breath-for-good/scenes/real/_micro.js
/* micro-papillae (papillae-fly / papillae3d opening, words 945-948): "...a tongue close up microscopically,"
 * A real photo of a human tongue's surface through a (USB) microscope, Wikimedia Commons, J. Whyatt, CC BY-SA 3.0:
 * the field focuses in on "tongue", pushes in on "close up", and steps up a magnification on "microscopically"; the 3D
 * papillae take over on "it's not smooth at all". Starts just after chapter-02 ends (same lane).
 */
defineScene({
  name: 'micro-papillae', fps: 30,
  anchor: { word: 945, offset: 0.08 }, anchorEnd: { word: 949, offset: -0.08 }, tail: 0.3,
  assets: { im: REAL.img('micro-tongue-papillae-usb-x3.jpg') },
  draw(ctx, t, api) {
    const step = api.at(948) - 0.04, stepped = t >= step;
    MICRO.draw(ctx, t, api, api.image('im'), {
      scope: { ix: stepped ? 0.46 : 0.5, iy: stepped ? 0.52 : 0.5, zoom0: 1.0, zoom1: 1.14, dur: 2.2, zoomMul: stepped ? 1.55 : 1, refocusAt: step, blur: 16, focusDur: 0.5 },
      label: 'A real tongue', sub: 'UP CLOSE, UNDER A MICROSCOPE', labelAt: 0.2, stepAt: step,
      source: 'Wikimedia Commons · J. Whyatt (CC BY-SA 3.0)',
    });
    api.finish(ctx, t, { bloom: 0.18, grain: 0.06, vignette: 0.4 });
  },
});
