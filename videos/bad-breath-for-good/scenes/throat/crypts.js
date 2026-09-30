// @use videos/bad-breath-for-good/scenes/throat/_lib.js
// @use videos/bad-breath-for-good/scenes/throat/_lib3d.js
/* crypts (words 1633-1698): "your tonsils have these little holes in them. We call them tonsillar crypts. And guess
 * what? Yes, food and gum can also get stuck up in there. And every time you swallow, they get squished down and
 * compacted into these tight little balls of nastiness called tonsil stones. It's literally rotten food, basically,
 * just stuck in your mouth that you can't get out. It's pretty bad."
 * All real 3D (the TONSIL world in _lib3d.js), cut on the words:
 *   1 start      the macro glide continues from throat-trip; the pits ring lime on "holes"
 *   2 "We"       looking down into one crypt with a headlamp: TONSIL CRYPTS
 *   3 "And"      a cutaway through that crypt: food bits drift down and get stuck inside (FOOD)
 *   4 "And every" closer: each swallow squeezes the pocket; the bits pack together ("swallow!")
 *   5 "compacted" close on the chamber: a stone forms from the packed bits
 *   6 "called"   3/4 view of the cutaway, the stone lit: TONSIL STONES
 *   7 "It's"     the surface: the stone lodged in the opening, a stink rising, "rotten food"
 *   8 "stuck"    close on the stone: it jiggles on "can't get out"
 * Ends 0.15 s before w1699, where micro3d's tonsilstone3d starts. */
const CR = (() => {
  let a = 2024 >>> 0;
  const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // ten bits of food/gunk: start above the surface, fall into the crypt, rest in the chamber
  const parts = [];
  for (let i = 0; i < 10; i++) parts.push({ d: i * 0.16, x0: -0.2 + rnd() * 0.5, z0: -0.3 + rnd() * 0.6, rx: 0.03 + rnd() * 0.18, ry: -0.55 - rnd() * 0.5, rz: -0.12 + rnd() * 0.24, r: 0.045 + rnd() * 0.03 });
  return { parts, STONE: [0.07, -0.88, 0.0] };
})();
defineScene({
  name: 'crypts',
  anchor: { word: 1633, offset: -0.15 },
  anchorEnd: { word: 1699, offset: -0.15 },
  tail: 0.5,
  setup(api) { this.ton = window.THROAT3D.world3(api, 'TONSIL', { steps: 140 }); },
  draw(ctx, t, api) {
    const TH = window.THROAT, T3 = window.THROAT3D, { P, prog, pop, ease, env, clamp, lerp } = api;
    const W = (i, o = 0) => api.at(i, o);
    const tHoles = W(1638), tWe = W(1641), tCrips = W(1644), tAnd = W(1646), tFood = W(1650), tAnd2 = W(1660), tSwallow = W(1664),
      tSquished = W(1667), tCompacted = W(1670), tTight = W(1673), tCalled = W(1678), tTonsil = W(1679), tIts = W(1681), tRotten = W(1683),
      tStuck = W(1687), tCant = W(1693), tOut = W(1695);
    // swallows: squeeze pulses; the bits pack and a stone grows
    const SQ = [tSwallow, tSquished, tCompacted, tTight];
    let squeeze = 0, compact = 0;
    for (const s of SQ) { squeeze = Math.max(squeeze, env(t, s - 0.05, s + 0.5, 0.15, 0.3)); compact += 0.25 * prog(t, s, 0.45); }
    const stoneR = 0.2 * clamp(prog(t, tCompacted - 0.1, 1.4, ease.outBack));
    const partsAt = () => {
      const list = [];
      for (const q of CR.parts) {
        const k = clamp((t - tFood - q.d) / 1.9); if (k <= 0) continue;
        let x, y, z;
        if (k < 0.5) { const m = ease.inOutCubic(k / 0.5); x = lerp(q.x0, 0.03, m); y = lerp(1.3, 0.15, m); z = lerp(q.z0, 0.0, m); }
        else { const m = ease.inOutCubic((k - 0.5) / 0.5); x = lerp(0.03, q.rx, m); y = lerp(0.15, q.ry, m); z = lerp(0, q.rz, m); }
        y -= 0.04 * squeeze;
        const c = clamp(compact);
        x = lerp(x, CR.STONE[0], c * 0.85); y = lerp(y, CR.STONE[1], c * 0.85); z = lerp(z, CR.STONE[2], c * 0.85);
        const r = q.r * (1 - smooth(c, 0.55, 1));
        if (r > 0.004) list.push([x, y, z, r]);
      }
      return T3.parts(list);
    };
    const shots = [
      { t: -1, name: 'glide' }, { t: tWe, name: 'down' }, { t: tAnd, name: 'cut' }, { t: tAnd2, name: 'cutClose' }, { t: tCompacted, name: 'chamber' },
      { t: tCalled, name: 'hero' }, { t: tIts, name: 'surface' }, { t: tStuck, name: 'stoneClose' },
    ];
    const sh = T3.shot(t, shots), lt = sh.lt;
    const stone0 = [CR.STONE[0], CR.STONE[1], CR.STONE[2], stoneR];
    const none = [0, 0, 0, 0];
    const cr3 = T3.CRYPTS3[3];
    const tripStone = [cr3[0], -0.02, cr3[1], 0.15];
    let c;
    if (sh.name === 'glide') {
      // continues throat-trip's last shot (same camera path, timed from w1629)
      c = T3.macroCam(t - W(1629));
      T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, { uS0: tripStone, uRing: 0.9 * env(t, tHoles, tWe + 0.3, 0.3, 0.3), uHead: 0.2 });
      T3.tripNotes3(ctx, api, c, t - W(1630), 1 - prog(t, 0, 0.35));
    } else if (sh.name === 'down') {
      const k = ease.inOutSine(clamp(lt / (tAnd - tWe)));
      c = { ro: [lerp(0.55, 0.3, k), lerp(1.55, 1.2, k), lerp(-0.85, -0.6, k)], ta: [0, -0.35, 0.02], fov: 1.7 };
      T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, { uS0: tripStone, uRing: 0.9, uHead: 0.45 });
      const cp = pop(t, tCrips - 0.4, 0.5);
      if (cp > 0) {
        const [ax, ay] = T3.project(c.ro, c.ta, c.fov, [0, 0.02, 0]), [bx, by] = T3.project(c.ro, c.ta, c.fov, [-1.05, 0.02, -0.85]);
        api.leader(ctx, ax, ay, 520, 200, Math.min(1, cp * 1.4), { color: P.lime, width: 3.5, dot: 9 });
        if (bx > 0 && bx < 1920) api.leader(ctx, bx, by, 480, 220, Math.min(1, cp * 1.4), { color: P.lime, width: 3.5, dot: 9 });
        TH.chip(ctx, api, 'TONSIL CRYPTS', null, null, 500, 180, cp, { size: 64 });
      }
    } else if (sh.name === 'cut' || sh.name === 'cutClose' || sh.name === 'chamber' || sh.name === 'hero') {
      if (sh.name === 'cut') { const k = ease.inOutSine(clamp(lt / (tAnd2 - tAnd))); c = { ro: [-2.9, lerp(0.05, -0.1, k), lerp(-0.35, -0.2, k)], ta: [0.1, -0.4, 0], fov: 1.8 }; }
      else if (sh.name === 'cutClose') { const k = ease.inOutSine(clamp(lt / (tCompacted - tAnd2))); c = { ro: [lerp(-1.95, -1.75, k), -0.45, -0.25], ta: [0.1, -0.62, 0], fov: 1.8 }; }
      else if (sh.name === 'chamber') { const k = ease.inOutSine(clamp(lt / (tCalled - tCompacted))); c = { ro: [lerp(-1.05, -0.9, k), -0.72, lerp(0.35, 0.25, k)], ta: [0.08, -0.86, 0], fov: 1.7 }; }
      else { const k = ease.inOutSine(clamp(lt / (tIts - tCalled))); c = { ro: [lerp(-2.0, -1.7, k), lerp(0.75, 0.55, k), lerp(-1.6, -1.35, k)], ta: [0.08, -0.62, 0], fov: 1.8 }; }
      T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, { uCut: 1, uCutX: 0, uSq: squeeze, uP: partsAt(), uS0: stoneR > 0.003 ? stone0 : none, uHead: 0.45, uGlowStone: sh.name === 'hero' ? 0.5 : 0.15 });
      // squeeze arrows on each swallow
      if (squeeze > 0.02 && (sh.name === 'cutClose' || sh.name === 'chamber')) {
        const [px, py] = T3.project(c.ro, c.ta, c.fov, [0.05, -0.8, 0]);
        ctx.save(); ctx.globalAlpha = squeeze;
        api.doodle.arrow(ctx, px - 430, py - 20, px - 190, py - 10, 1, { color: P.lime, width: 9, bend: 14, seed: 8, head: 28 });
        api.doodle.arrow(ctx, px + 430, py - 20, px + 190, py - 10, 1, { color: P.lime, width: 9, bend: -14, seed: 9, head: 28 });
        ctx.restore();
      }
      if (sh.name === 'cut') {
        const fP = pop(t, tFood, 0.5);
        if (fP > 0) { const [fx, fy] = T3.project(c.ro, c.ta, c.fov, [0.03, 0.6, 0]); TH.chip(ctx, api, 'FOOD', fx + 40, fy, fx + 330, fy - 120, fP, { size: 58 }); }
        const sP = prog(t, W(1656), 0.5, ease.linear);
        if (sP > 0) api.doodle.text(ctx, 'stuck in there', 1440, 820, sP, { color: P.lime, size: 64, align: 'center', rotate: -0.05, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      }
      if (sh.name === 'cutClose') api.doodle.text(ctx, 'swallow!', 1480, 200, prog(t, tSwallow - 0.05, 0.45, ease.linear), { color: P.lime, size: 76, align: 'center', rotate: 0.06, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      if (sh.name === 'chamber') api.doodle.text(ctx, 'compacted', 1460, 200, prog(t, tCompacted, 0.5, ease.linear), { color: P.lime, size: 72, align: 'center', rotate: 0.05, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
      if (sh.name === 'hero') {
        const [sx, sy] = T3.project(c.ro, c.ta, c.fov, CR.STONE);
        TH.chip(ctx, api, 'TONSIL STONES', sx + 60, sy, sx + 420, sy - 260, pop(t, tTonsil, 0.5), { size: 66 });
      }
    } else if (sh.name === 'surface') {
      const k = ease.inOutSine(clamp(lt / (tStuck - tIts)));
      c = { ro: [lerp(0.8, 0.6, k), lerp(0.95, 0.8, k), lerp(-1.75, -1.5, k)], ta: [0, -0.1, 0.1], fov: 1.75 };
      T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, { uS0: [0, -0.03, 0, 0.17], uHead: 0.25 });
      const [sx, sy] = T3.project(c.ro, c.ta, c.fov, [0, 0.05, 0]);
      TH.stink(ctx, sx + 30, sy - 110, 130, t, prog(t, tIts, 0.5)); TH.stink(ctx, sx - 130, sy - 200, 100, t + 1.3, prog(t, tIts + 0.2, 0.5) * 0.8);
      api.doodle.text(ctx, 'rotten food', sx + 330, sy - 300, prog(t, tRotten - 0.05, 0.7, ease.linear), { color: P.marker, size: 76, align: 'center', rotate: -0.06, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
    } else {
      const k = ease.inOutSine(clamp(lt / Math.max(1, api.duration - tStuck)));
      c = { ro: [lerp(0.42, 0.34, k), lerp(0.5, 0.44, k), lerp(-0.78, -0.66, k)], ta: [0, -0.05, 0], fov: 1.7 };
      const jig = env(t, tCant - 0.05, tOut + 0.4, 0.1, 0.25);
      const sx0 = 0.012 * jig * Math.sin(t * 31), sy0 = -0.03 + 0.03 * jig * Math.abs(Math.sin(t * 23));
      T3.draw3(ctx, api, this.ton, 'TONSIL', c, t, { uS0: [sx0, sy0, 0, 0.17], uHead: 0.35 });
      const [sx, sy] = T3.project(c.ro, c.ta, c.fov, [0, 0.08, 0]);
      TH.stink(ctx, sx + 40, sy - 160, 160, t, 0.9);
      if (jig > 0.05) {
        ctx.save(); ctx.globalAlpha = jig; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x = sx + s * (230 + i * 22), y = sy - 20 + i * 30; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 26, y - 8); ctx.stroke(); }
        ctx.restore();
      }
      api.doodle.text(ctx, "can't get out", 1400, 900, prog(t, tCant, 0.6, ease.linear), { color: P.marker, size: 72, align: 'center', rotate: -0.05, stroke: 'rgba(11,10,24,0.85)', strokeWidth: 12 });
    }
    T3.bokeh(ctx, t, 21, 6, 0.8);
    T3.artistic(ctx, api);
    api.finish(ctx, t, { bloom: 0.32, grain: 0.05, vignette: 0.5 });
    function smooth(v, a, b) { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); }
  },
});
