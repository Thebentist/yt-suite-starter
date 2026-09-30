#!/usr/bin/env node
/* Review app server (a small local Frame.io): versions of a cut, timestamped comments with links, uploads and
 * drawings, and replies from Claude. Everything lives in videos/<slug>/review/:
 *   <version>.mp4          the review render (1080p H.264 from Resolve: out/final/resolve-review.py)
 *   <version>.json         { name, created, timeline, notes }            (optional)
 *   <version>.words.json   the cut's words with timeline times, for the transcript strip (optional)
 *   comments.json          [{ id, slug, version, t, t2, text, links[], files[], drawing, author, created, status, replies[] }]
 *   uploads/, drawings/    files attached to comments
 *
 *   node pipeline/review/server.mjs [--port 4600]      then open http://localhost:4600
 * Claude reads and answers comments with pipeline/review/comments.mjs. Binds to 127.0.0.1 only.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const PORT = +(argv[argv.indexOf('--port') + 1] || process.env.PORT || 4600) || 4600;
const VIDEOS = path.join(ROOT, 'videos');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf', '.txt': 'text/plain' };

const safeSlug = (s) => /^[\w.-]+$/.test(s || '') ? s : null;
const reviewDir = (slug) => path.join(VIDEOS, slug, 'review');
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(v, null, 1)); fs.renameSync(tmp, f); };
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const body = (req, limit = 200 << 20) => new Promise((resolve, reject) => { const chunks = []; let n = 0; req.on('data', (c) => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); }); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject); });

function projects() {
  if (!fs.existsSync(VIDEOS)) return [];
  return fs.readdirSync(VIDEOS).filter((s) => fs.existsSync(path.join(reviewDir(s)))).map((slug) => {
    const vs = versions(slug); const cs = readJson(path.join(reviewDir(slug), 'comments.json'), []);
    return { slug, versions: vs.length, latest: vs[vs.length - 1]?.id || null, open: cs.filter((c) => c.status !== 'done').length };
  });
}
function versions(slug) {
  const d = reviewDir(slug); if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => /\.(mp4|mov|webm)$/i.test(f) && !f.startsWith('_')).map((f) => {
    const id = f.replace(/\.[^.]+$/, ''), meta = readJson(path.join(d, id + '.json'), {}), st = fs.statSync(path.join(d, f));
    return { id, file: f, name: meta.name || id, notes: meta.notes || '', timeline: meta.timeline || '', created: meta.created || st.mtime.toISOString(), size: st.size, words: fs.existsSync(path.join(d, id + '.words.json')) };
  }).sort((a, b) => (a.created < b.created ? -1 : 1));
}
function streamFile(req, res, file, downloadName) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, { error: 'not found' });
  const size = fs.statSync(file).size, type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range); let a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : size - 1; b = Math.min(b, size - 1);
    if (a > b) { res.writeHead(416, { 'content-range': `bytes */${size}` }); return res.end(); }
    res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1, 'cache-control': 'no-store' });
    return fs.createReadStream(file, { start: a, end: b }).pipe(res);
  }
  // ?download=1: save to disk instead of playing (Ben, 2026-09-29: a download button per version)
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes', 'cache-control': 'no-store', ...(downloadName ? { 'content-disposition': `attachment; filename="${downloadName.replace(/[^\w.-]+/g, '_')}"` } : {}) });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname), slug = safeSlug(u.searchParams.get('slug'));
    if (p === '/' || p === '/index.html') return send(res, 200, fs.readFileSync(path.join(ROOT, 'pipeline', 'review', 'app.html')), MIME['.html']);
    if (p === '/api/projects') return send(res, 200, projects());
    if (p === '/api/versions') return slug ? send(res, 200, versions(slug)) : send(res, 400, { error: 'slug' });
    if (p === '/api/words') { const v = u.searchParams.get('version'); const f = slug && /^[\w.-]+$/.test(v || '') && path.join(reviewDir(slug), v + '.words.json'); return send(res, 200, f && fs.existsSync(f) ? fs.readFileSync(f) : '[]'); }
    // /media/<slug>/<path inside review/>
    if (p.startsWith('/media/')) {
      const [, , s, ...rest] = p.split('/'); if (!safeSlug(s)) return send(res, 400, { error: 'slug' });
      const f = path.join(reviewDir(s), ...rest); if (!f.startsWith(reviewDir(s))) return send(res, 403, { error: 'no' });
      return streamFile(req, res, f, u.searchParams.get('download') ? `${s}-${rest.join('-')}` : null);
    }
    if (p === '/api/comments' && req.method === 'GET') return slug ? send(res, 200, readJson(path.join(reviewDir(slug), 'comments.json'), [])) : send(res, 400, { error: 'slug' });
    if (p === '/api/comments' && req.method === 'POST') {
      if (!slug) return send(res, 400, { error: 'slug' });
      const c = JSON.parse((await body(req, 30 << 20)).toString('utf8'));
      const file = path.join(reviewDir(slug), 'comments.json'), all = readJson(file, []);
      const id = 'c' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
      let drawing = null;
      if (typeof c.drawing === 'string' && c.drawing.startsWith('data:image/png;base64,')) {
        const d = path.join(reviewDir(slug), 'drawings'); fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(path.join(d, id + '.png'), Buffer.from(c.drawing.split(',')[1], 'base64')); drawing = `drawings/${id}.png`;
      }
      const item = { id, version: String(c.version || ''), t: +c.t || 0, t2: c.t2 != null && c.t2 !== '' ? +c.t2 : null, text: String(c.text || '').slice(0, 5000),
        links: (c.links || []).map(String).filter(Boolean).slice(0, 20), files: (c.files || []).map(String).slice(0, 20), drawing, frame: c.frame ?? null,
        author: String(c.author || 'Host').slice(0, 60), created: new Date().toISOString(), status: 'open', replies: [] };
      all.push(item); writeJson(file, all); return send(res, 200, item);
    }
    const m = /^\/api\/comments\/([\w]+)(\/reply)?$/.exec(p);
    if (m && (req.method === 'PATCH' || req.method === 'POST' || req.method === 'DELETE')) {
      if (!slug) return send(res, 400, { error: 'slug' });
      const file = path.join(reviewDir(slug), 'comments.json'), all = readJson(file, []), c = all.find((x) => x.id === m[1]);
      if (!c) return send(res, 404, { error: 'no such comment' });
      if (req.method === 'DELETE') { writeJson(file, all.filter((x) => x.id !== c.id)); return send(res, 200, { ok: true }); }
      const b = JSON.parse((await body(req, 1 << 20)).toString('utf8') || '{}');
      if (m[2]) c.replies.push({ author: String(b.author || 'Host').slice(0, 60), text: String(b.text || '').slice(0, 5000), created: new Date().toISOString() });
      else { if (b.status) c.status = ['open', 'working', 'done'].includes(b.status) ? b.status : c.status; if (b.text != null) c.text = String(b.text).slice(0, 5000); }
      writeJson(file, all); return send(res, 200, c);
    }
    if (p === '/api/upload' && req.method === 'POST') {
      if (!slug) return send(res, 400, { error: 'slug' });
      const name = String(req.headers['x-filename'] || 'file').replace(/[^\w.-]+/g, '_').slice(-120);
      const d = path.join(reviewDir(slug), 'uploads'); fs.mkdirSync(d, { recursive: true });
      const f = `${Date.now().toString(36)}-${name}`; fs.writeFileSync(path.join(d, f), await body(req));
      return send(res, 200, { path: `uploads/${f}` });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 500, { error: e.message }); }
});
server.listen(PORT, '127.0.0.1', () => console.log(`[review] http://localhost:${PORT}  (videos/<slug>/review/)`));
