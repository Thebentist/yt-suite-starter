/* _mock-under: stand-in backgrounds for checking overlays that will sit over other groups' shots that do not exist yet
 * (params.kind 'studio' = cgi-lineup's dark turntable with a steel U scraper in the centre; 'tonsil' = micro3d's
 * tonsil-stone macro). Look-only; never rendered as a final and not in plan.json.
 */
defineScene({
  name: '_mock-under', duration: 1, fps: 30, transparent: false, params: { kind: 'studio' },
  draw(ctx, t, api) {
    const { W, H } = api;
    if (api.params.kind === 'tonsil') {
      const g = ctx.createRadialGradient(900, 520, 40, 960, 540, 1100); g.addColorStop(0, '#6b2a3a'); g.addColorStop(0.5, '#2a0f1a'); g.addColorStop(1, '#0a0508');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const s = ctx.createRadialGradient(900, 500, 20, 930, 540, 230); s.addColorStop(0, '#f4ecd6'); s.addColorStop(0.7, '#c9b98f'); s.addColorStop(1, 'rgba(120,100,70,0)');
      ctx.fillStyle = s; ctx.beginPath(); ctx.ellipse(930, 540, 250, 200, 0.3, 0, 7); ctx.fill();
      return;
    }
    const g = ctx.createRadialGradient(960, 500, 60, 960, 560, 1200); g.addColorStop(0, '#2b2a33'); g.addColorStop(0.6, '#101014'); g.addColorStop(1, '#050507');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#18181d'; ctx.beginPath(); ctx.ellipse(960, 800, 520, 110, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(200,210,230,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(960, 800, 520, 110, 0, Math.PI, 2 * Math.PI); ctx.stroke();
    const m = ctx.createLinearGradient(760, 0, 1160, 0); m.addColorStop(0, '#6d717a'); m.addColorStop(0.5, '#e8ecf2'); m.addColorStop(1, '#5d6068');
    ctx.strokeStyle = m; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(800, 330); ctx.lineTo(800, 560); ctx.quadraticCurveTo(800, 740, 960, 740); ctx.quadraticCurveTo(1120, 740, 1120, 560); ctx.lineTo(1120, 330); ctx.stroke();
  },
});
