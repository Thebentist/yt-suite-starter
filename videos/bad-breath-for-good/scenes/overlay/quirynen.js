// @use videos/bad-breath-for-good/scenes/overlay/_lib.js
/* quirynen (words 1299-1310): "There's this periodontist named Mark Quirion and... Yeah, I completely botched that."
 * Timing from the cut (anchor/api.at); ends word 1310 end + 0.6 (the "(sorry, Marc)" gets a beat).
 * Premium glass name card bottom-left lands on "named": PROF. MARC QUIRYNEN / PERIODONTOLOGY · KU LEUVEN (research-notes row 3:
 * Department of Periodontology, Catholic University of Leuven). On the botch (Ben punched in 1.3x, head x ~860-1230)
 * the right third gets the correction in marker: "Quirion" (what Ben said) struck through on "completely",
 * "Quirynen" on a lime highlighter swipe on "botched", then "(sorry, Marc)".
 */
defineScene({
  name: 'quirynen', fps: 30, transparent: true,
  anchor: { word: 1299, offset: -0.15 }, anchorEnd: { word: 1310, edge: 'end', offset: 0.6 }, tail: 0.5,
  plan: { lane: 2 }, sfx: [{ w: 1302, kind: 'whoosh-soft', d: -0.14 }, { w: 1302, kind: 'pop', d: 0.2 }, { w: 1306, kind: 'scribble-short', d: -0.12 }, { w: 1308, kind: 'scribble' }, { w: 1309, kind: 'scribble-short' }, { w: 1310, kind: 'scribble-short', d: 0.05 }],
  draw(ctx, t, api) {
    const { P, prog, ease } = api, T = { named: api.at(1302), yeah: api.at(1306), completely: api.at(1308), botched: api.at(1309), that: api.at(1310) };
    const { out } = OV.lowerThird(ctx, api, t, { name: 'PROF. MARC QUIRYNEN', sub: 'PERIODONTOLOGY · KU LEUVEN', t0: T.named - 0.14, tSub: T.named + 0.5, end: OV.endT(api, this.anchorEnd), x: 96, y: 846, nameSize: 70, subSize: 32 });
    const INK = '#1b1a22', KEY = 'rgba(255,255,255,0.95)';
    ctx.save(); ctx.globalAlpha *= 1 - out;
    ctx.translate(1480, 380); ctx.rotate(-0.045); ctx.translate(-1440, -380);
    // what Ben said
    OV.hand(ctx, api, 'Quirion', 1336, 318, prog(t, T.yeah - 0.12, 0.42, ease.linear), { size: 84, color: INK, stroke: KEY, strokeWidth: 12, blur: 8 });
    // struck through on "completely"
    OV.mark(ctx, api, 'stroke', [[[1322, 298], [1470, 290], [1624, 294]]], prog(t, T.completely, 0.3, ease.inOutCubic), { width: 10, seed: 81, glow: KEY });
    // the right spelling on "botched", on a lime highlighter swipe
    const hp = prog(t, T.botched - 0.1, 0.3, ease.outCubic);
    if (hp > 0) api.doodle.highlight(ctx, 1334, 368, 330, 80, hp, { alpha: 0.9, color: P.lime });
    OV.hand(ctx, api, 'Quirynen', 1344, 432, prog(t, T.botched, 0.45, ease.linear), { size: 84, color: INK, stroke: false, blur: 0 });
    OV.mark(ctx, api, 'check', [1712, 404, 26], prog(t, T.botched + 0.45, 0.25, ease.inOutCubic), { width: 9, seed: 88, color: INK, glow: KEY });
    // the apology
    OV.hand(ctx, api, '(sorry, Marc)', 1372, 522, prog(t, T.that + 0.05, 0.5, ease.linear), { size: 58, color: P.marker, stroke: KEY, strokeWidth: 10, blur: 8 });
    ctx.restore();
  },
});
