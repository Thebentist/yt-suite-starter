// @use videos/bad-breath-for-good/scenes/micro3d/_lib.js
// lipid3d-pop (replaces micro/pop-balloon; second half of the lipid3d pair) · words 3501-3544, inside Ben's Zero Pro segment:
// "What it does, it basically seeks it out, attaches to it, and then pops it. Like a water balloon. And the cool thing is, unlike
// alcohol mouthwashes that harm all the bacteria that they've got, this only specifically kills the bacteria that we target."
// Same world as lipid3d. Shots: a droplet drifts, then heads for a purple P. gingivalis cell / close: it fuses into the membrane,
// an oily film spreads / the cell swells and bursts in slow motion, like a water balloon / an alcohol rinse sweeps a mixed crowd
// and every cell goes grey (ALCOHOL MOUTHWASH) / the grey crowd close (HARMS ALL) / split screen: left the rinsed crowd, right the
// droplets pop only the purple cells, the teal ones stay (ONLY THE TARGET). Claims nothing beyond Ben's words; the P. gingivalis
// target is Ben's own statement earlier in the segment (pg-target). Type stays bottom/centre (the ad chip owns the top-left).
(function () {
  const FRAG = M3.GLSL.core + `
float groundH(vec2 xz){ return 0.; } float colonyDens(vec2 xz){ return 0.; }
` + M3.GLSL.bact + M3.GLSL.pap + M3.GLSL.drop + M3.GLSL.lipid;

  defineScene({
    name: 'lipid3d-pop',
    anchor: { word: 3501, offset: -0.15 },
    anchorEnd: { word: 3544, edge: 'end', offset: 0.25 },
    tail: 0,
    setup(api) {
      this.r = M3.create(api, FRAG, { res: 0.5, aa: 2, steps: 150, stepScale: 0.8, sc: 1 });
      const A = (w) => api.at(w);
      const T = this.T = { seeks: A(3506), attaches: A(3509), pops: A(3514), like: A(3516), balloon: A(3519), and: A(3520), unlike: A(3525), alcohol: A(3526), harm: A(3529), all: A(3530), got: A(3535), thisW: A(3536), only: A(3537), kills: A(3539), target: A(3544) };
      const c = -0.04;
      this.shots = [{ at: 0, k: 'seek' }, { at: T.attaches + c, k: 'attach' }, { at: T.pops + c, k: 'pop' }, { at: T.unlike + c, k: 'alcohol' }, { at: T.harm + c, k: 'dead' }, { at: T.thisW + c, k: 'split' }];
      this.crowd = M3.LIPID.crowd();
      this.crowd2 = this.crowd.map((b) => ({ ...b, p: [-b.p[0], b.p[1], -b.p[2]], a: b.a + 1.3 }));
      const r = api.rand('lp-drops');
      this.free = Array.from({ length: 8 }, () => ({ p: [(r() - 0.5) * 22, 8 + r() * 10, -4 + r() * 10], r: 0.3 + r() * 0.35, ph: r() * 6.28 }));
      const q = api.rand('lp-motes'); this.motes = Array.from({ length: 120 }, () => ({ p: [(q() - 0.5) * 50, q() * 30, (q() - 0.5) * 40], r: 0.04 + q() * 0.08, a: 0.25 + q() * 0.4, ph: q() * 6.28 }));
    },
    // rinse bubbles along the wave front (2D glossy rings placed in 3D, sized and softened by distance)
    bubbles(ctx, api, cam, dof, wave, t) {
      const r = api.rand('lp-bub');
      for (let i = 0; i < 70; i++) { const ox = (r() - 0.8) * 5, y = 5 + r() * 16, z = -8 + r() * 16, rad = 0.12 + r() * 0.3, sp = r();
        const x = wave + ox - (t * 0.8 + sp) % 1 * 0.5; const s = M3.project(cam, [x, y + Math.sin(t * 2 + i) * 0.3, z]); if (!s) continue;
        const R = Math.max(2, (rad / s.z) * cam.fov * 540), coc = Math.min(dof.maxR * 1080, dof.blur * 1080 * Math.abs(1 - dof.focus / s.z));
        const a = Math.exp(-ox * ox / 6) * 0.8 * Math.min(1, (R * R) / (R + coc) / (R + coc) * 1.5);
        ctx.save(); ctx.globalAlpha = a; if (coc > 2) ctx.filter = 'blur(' + (coc * 0.5).toFixed(1) + 'px)';
        ctx.strokeStyle = 'rgba(210,235,255,0.9)'; ctx.lineWidth = Math.max(1.2, R * 0.12); ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(s.x - R * 0.35, s.y - R * 0.35, R * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    },
    draw(ctx, t, api) {
      const { ease, clamp, lerp, prog, pop } = api, T = this.T, L = M3.LIPID, V = M3.v;
      const s = M3.shot(t, this.shots, api.duration), k = s.k, u = clamp(s.lt / Math.max(0.1, s.len));
      const hero = L.at(this.crowd[0], t, 0), hs = this.crowd[0].s;
      const contact = V.add(hero.p, V.mul(V.norm([-1, 0.25, 0.55]), 0.55 * hs));
      let ro, ta, fov = 2.1, focus, blur = 0.015, maxR = 0.028, drops = [], crowd = this.crowd, split = 0, wave = -100;
      // hero timeline: film from the attach, swell then burst on "pops" (burst slows down like slow motion)
      const film = prog(t, T.attaches + 0.25, 0.7);
      const swell = 0.36 * ease.inOutSine(clamp((t - T.pops + 0.12) / 0.3));
      const burst = 0.64 * ease.outQuad(clamp((t - T.pops - 0.2) / 2.6));
      const heroEx = burst > 0 ? 0.36 + burst : swell;
      let state = (i, b) => [b.tgt, i === 0 ? heroEx : 0, 0, i === 0 ? film : 0], alt = null;
      const freeDrops = () => this.free.map((d, i) => [d.p[0] + Math.sin(t * 0.4 + d.ph) * 0.8, d.p[1] + Math.sin(t * 0.5 + d.ph) * 0.4, d.p[2], d.r]);
      if (k === 'seek') {
        const e = ease.inOutSine(u);
        const start = V.add(hero.p, [-7.5 + t * 0.9, 1.6, 2.2]);
        const go = ease.inOutCubic(clamp((t - T.seeks + 0.05) / (T.attaches - T.seeks + 0.1)));
        const dp = V.mix(start, V.add(contact, V.mul(V.norm([-1, 0.25, 0.55]), 0.52)), go);
        drops = [[...dp, 0.52], ...freeDrops()];
        ta = V.add(hero.p, [lerp(-3.2, -1.2, e), 0.3, 0]); ro = V.add(ta, [-0.8, 1.4, 9.5 - 0.8 * e]); focus = Math.hypot(...V.sub(ro, V.add(hero.p, [-2, 0, 0]))); fov = 2.2;
      } else if (k === 'attach') {
        const sink = ease.inOutCubic(clamp((t - T.attaches) / 0.8));
        const dir = V.norm([-1, 0.25, 0.55]);
        const dp = V.add(contact, V.mul(dir, lerp(0.52, -0.2, sink)));
        drops = [[...dp, 0.52 * (1 - sink * 0.9)], ...freeDrops().slice(0, 4)];
        ta = contact; ro = V.add(contact, [-1.7 + 0.3 * u, 0.9, 4.4 - 0.4 * u]); fov = 2.5; focus = Math.hypot(...V.sub(ro, contact)); blur = 0.024; maxR = 0.032;
      } else if (k === 'pop') {
        const e = ease.outCubic(u);
        ta = V.add(hero.p, [0, 0.2, 0]); ro = V.add(ta, [-2.2 + 0.6 * e, 1.1, 8.5 - 1.3 * e]); fov = 2.1; focus = Math.hypot(...V.sub(ro, ta)); blur = 0.017;
        drops = freeDrops().slice(0, 5);
      } else if (k === 'alcohol' || k === 'dead') {
        crowd = this.crowd2;
        wave = lerp(-26, 26, ease.inOutSine(clamp((t - T.unlike - 0.1) / 1.7)));
        state = (i, b) => [b.tgt, 0, clamp((wave - b.p[0]) / 4), 0];
        if (k === 'alcohol') { ro = [0, 12.8, 23]; ta = [0, 12, 0]; fov = 1.9; focus = 23; blur = 0.011; }
        else { ro = [-3 + 1.2 * u, 12.6, 14.5 - 0.8 * u]; ta = [-2.5 + 1.2 * u, 11.8, 0]; fov = 2.0; focus = 14.4; blur = 0.015; }
      } else {
        crowd = this.crowd2; split = 1; wave = -100;
        ro = [0, 12.6, 21]; ta = [0, 12, 0]; fov = 1.9; focus = 21; blur = 0.011;
        alt = (i, b) => [b.tgt, 0, 1, 0];
        const popT = (j) => T.kills - 0.1 + j * 0.16;
        let j = 0; const tj = {};
        crowd.forEach((b, i) => { if (b.tgt) tj[i] = j++; });
        state = (i, b) => { if (!b.tgt) return [0, 0, 0, 0]; const pt = popT(tj[i]); const sw = 0.36 * clamp((t - pt + 0.25) / 0.25); const bu = 0.64 * ease.outCubic(clamp((t - pt) / 1.4)); return [1, bu > 0 ? 0.36 + bu : sw, 0, prog(t, pt - 0.6, 0.4)]; };
        crowd.forEach((b, i) => { if (!b.tgt) return; const q = L.at(b, t, i); const pt = popT(tj[i]); const go = ease.inOutCubic(clamp((t - T.thisW) / (pt - 0.5 - T.thisW)));
          const sink = clamp((t - pt + 0.5) / 0.5); const dir = V.norm([Math.sin(i), 0.4, 1]);
          const far = V.add(q.p, [(tj[i] - 2) * 2, 3, 9]); const near = V.add(q.p, V.mul(dir, (0.55 + 0.45) * b.s - sink * 0.7));
          if (t < pt) drops.push([...V.mix(far, near, go), 0.45 * (1 - sink * 0.9)]); });
      }
      const cam = M3.camera(ro, ta, 0, fov), dof = { focus, blur, maxR };
      const U = { uTime: t, ...cam.uniforms, uSplit: split, uWave: wave, uFogK: 0.028, uKeyPos: [ta[0] - 6, ta[1] + 8, ta[2] + 6], uKeyCol: [1.1, 1.0, 0.95],
        ...L.pack(crowd, t, state, alt), ...L.drops(drops) };
      ctx.drawImage(this.r.draw(U, dof), 0, 0, api.W, api.H);
      M3.motes(ctx, cam, dof, this.motes.map((m) => ({ ...m, p: [m.p[0] + t * 0.4, m.p[1] + Math.sin(t * 0.3 + m.ph) * 0.5, m.p[2]] })), { color: '200,240,255', alpha: 0.5 });

      // ---------- bursts (2D flash + ring), labels
      if (k === 'pop') { const sp = M3.project(cam, hero.p); L.flash(ctx, sp, clamp((t - T.pops - 0.18) / 0.9), sp ? (1.6 * hs / sp.z) * fov * 540 : 0); }
      if (k === 'split') {
        let j = 0;
        this.crowd2.forEach((b, i) => { if (!b.tgt) return; const pt = T.kills - 0.1 + (j++) * 0.16; const q = L.at(b, t, i); const sp = M3.project(cam, q.p);
          if (sp) L.flash(ctx, { x: sp.x + 480, y: sp.y }, clamp((t - pt - 0.05) / 0.8), (1.6 * b.s / sp.z) * fov * 540); });
        // divider
        const dv = prog(t, T.thisW - 0.04, 0.3);
        ctx.save(); ctx.fillStyle = `rgba(244,241,234,${0.85 * dv})`; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; ctx.fillRect(959, 540 - 540 * dv, 3, 1080 * dv); ctx.restore();
        api.label(ctx, 'ALCOHOL MOUTHWASH', 480, 945, { p: pop(t, T.thisW + 0.05), size: 50, align: 'center', bg: '#d9d6cf' });
        api.label(ctx, 'ONLY THE TARGET', 1440, 945, { p: pop(t, T.only), size: 50, align: 'center' });
      }
      if (k === 'seek') {
        const sp = M3.project(cam, V.add(hero.p, [0.35, 0.45, 0]));
        if (sp) M3.callout(ctx, api, sp.x, sp.y, sp.x + 230, sp.y - 190, 'P. gingivalis', prog(t, 0.35, 0.6), { size: 42 });
      }
      if (k === 'alcohol' || k === 'dead') this.bubbles(ctx, api, cam, dof, wave, t);
      if (k === 'alcohol') api.label(ctx, 'ALCOHOL MOUTHWASH', 960, 945, { p: pop(t, T.alcohol), size: 60, align: 'center', bg: '#d9d6cf' });
      if (k === 'dead') api.label(ctx, 'HARMS ALL', 960, 945, { p: pop(t, T.harm + 0.05), size: 64, align: 'center', bg: api.P.red, color: '#fff' });
      M3.art(ctx, api);
      api.finish(ctx, t, { bloom: 0.36, grain: 0.05, vignette: 0.5 });
    },
  });
})();
