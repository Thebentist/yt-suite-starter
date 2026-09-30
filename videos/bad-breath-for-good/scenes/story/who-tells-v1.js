// @use videos/bad-breath-for-good/scenes/story/_lib.js
// who-tells-v1: the phase-1 (v4b) illustrated look, restored at Ben's request, timed with anchor/anchorEnd + api.at.
// Words 320-329 "Because to be honest, who's gonna ever tell me really?"
defineScene({
  name: 'who-tells-v1',
  anchor: { word: 320, offset: -0.15 },
  anchorEnd: { word: 329, edge: 'end', offset: 0.25 },
  tail: 0.5,
  setup(api) {
    const S = STORY.init(api), rnd = api.rand('who-tells');
    const kinds = ['dots', 'turn', 'zip', 'turn', 'dots', 'zip', 'zip', 'dots', 'turn', 'zip', 'turn', 'dots'];
    const styles = ['short', 'bob', 'curly', 'bun', 'short', 'bob', 'curly', 'short', 'bob', 'bun', 'short', 'curly'];
    const tags = { 1: 'FRIEND', 6: 'COWORKER', 10: 'DATE' };
    // the glass card, pre-rendered once (with its soft shadow) at 2x
    const cc = document.createElement('canvas'); cc.width = (250 + 120) * 2; cc.height = (300 + 120) * 2; const cg = cc.getContext('2d'); cg.scale(2, 2);
    S.solid(cg, (g) => api.roundRect(g, 60, 60, 250, 300, 26), { color: '#2a2150', light: '#3a2f6e', dark: '#191334', bounds: [60, 60, 250, 300], rim: '#6f5bd6', rimW: 3, sBlur: 30, sY: 14 });
    this.card = cc;
    this.people = kinds.map((k, i) => ({
      kind: k, style: styles[i], tag: tags[i],
      skin: S.SKIN[Math.floor(rnd() * S.SKIN.length)], hair: S.HAIR[Math.floor(rnd() * 5)], shirt: S.SHIRT[i % S.SHIRT.length],
      beard: styles[i] === 'short' && rnd() < 0.4, glasses: rnd() < 0.25, delay: [0, 3, 7, 1, 9, 5, 2, 10, 6, 11, 4, 8][i] * 0.055,
    }));
  },
  draw(ctx, t, api) {
    const S = STORY, { P, ease, prog, clamp, pop } = api;
    const WHO = api.at(324), TELL = api.at(327), REALLY = api.at(329);
    S.stage(ctx, t, { glows: [{ x: 0.5, y: 0.45, r: 0.6, c: '#7c5cff', a: 0.5 }, { x: 0.5, y: 0.95, r: 0.4, c: '#d7f34a', a: 0.12 * prog(t, REALLY, 0.4) }] });
    ctx.save(); api.cam(ctx, t, { zoom0: 1.0, zoom1: 1.06, dur: api.duration, cy: 480 });
    const CW = 250, CH = 300, GAP = 24, X0 = (1920 - (6 * CW + 5 * GAP)) / 2, Y0 = 110;
    this.people.forEach((p, i) => {
      const col = i % 6, row = Math.floor(i / 6), x = X0 + col * (CW + GAP), y = Y0 + row * (CH + GAP);
      const cp = pop(t, 0.05 + (col + row * 2) * 0.05, 0.5); if (cp <= 0) return;
      const r = clamp((t - WHO - p.delay) / 0.35), re = ease.outCubic(r);
      ctx.save(); ctx.translate(x + CW / 2, y + CH / 2); ctx.scale(cp, cp); ctx.translate(-(x + CW / 2), -(y + CH / 2));
      // card
      ctx.drawImage(this.card, x - 60, y - 60, CW + 120, CH + 120);
      ctx.save(); api.roundRect(ctx, x, y, CW, CH, 26); ctx.clip();
      S.glow(ctx, x + CW / 2, y + CH * 0.4, 170, p.shirt, 0.35);
      const cx = x + CW / 2, hy = y + 138 + Math.sin(t * 2 + i) * 2;
      const o = { skin: p.skin, hair: p.hair, hairStyle: p.style, shirt: p.shirt, beard: p.beard, glasses: p.glasses, rimColor: '#c9b8ff', smile: 0.55, look: [0, 0.1], blush: 0.4, cheap: true };
      if (p.kind === 'turn') Object.assign(o, { turn: 0.85 * re, look: [1, 0.2 * re], smile: 0.55 - 0.6 * re, frown: 0.4 * re, lid: 0.18 + 0.3 * re, headRot: 0.12 * re });
      if (p.kind === 'zip') Object.assign(o, { smile: 0.55 * (1 - re), zip: clamp((t - WHO - p.delay - 0.05) / 0.3), look: [0.4 * re, -0.8 * re], brow: 0.5 * re });
      if (p.kind === 'dots') Object.assign(o, { smile: 0.55 - 0.5 * re, worry: 0.7 * re, brow: 0.3 * re, look: [-0.5 * re, 0.4 * re] });
      const blink = ((t * 1.3 + i * 0.37) % 2.4) < 0.12 ? 0.95 : null; if (blink && p.kind !== 'turn') o.lid = blink;
      S.bust(ctx, cx, hy, 62, o);
      ctx.restore();
      // "..." speech bubble
      if (p.kind === 'dots') {
        const bp = clamp((t - WHO - p.delay - 0.1) / 0.3);
        if (bp > 0) {
          S.bubble(ctx, x + CW - 62, y + 58, 104, 58, bp, { speech: true, radius: 28, tailSide: -1 });
          for (let k = 0; k < 3; k++) { const a = 0.5 + 0.5 * Math.sin(t * 8 - k * 0.9); ctx.fillStyle = S.mix('#9a92b5', '#2b2440', a); ctx.globalAlpha = clamp(bp * 2); ctx.beginPath(); ctx.arc(x + CW - 62 + (k - 1) * 24, y + 58 - a * 3, 8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
        }
      }
      if (p.tag) api.label(ctx, p.tag, x + 18, y + CH - 34, { size: 34, bg: 'rgba(12,8,28,0.82)', color: P.ink, p: pop(t, 0.5 + i * 0.03, 0.45), radius: 8, shadow: false });
      ctx.restore();
    });
    ctx.restore();
    // chip
    S.chip(ctx, 'NOBODY TELLS YOU', 960, 900, pop(t, REALLY, 0.5), { size: 72 });
    S.finish(ctx, t);
  },
});
