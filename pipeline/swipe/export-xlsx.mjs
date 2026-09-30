/* Regenerates "Video Swipe File.xlsx" from swipe.json. Tabs: Packaging (winners with their thumbnails, your versions
 * beside them), Brief, Niches, Videos, Checks, Concepts. Column names follow Angus Sewell's workbook. */
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { ROOT } from './lib.mjs';
import { BRIEF_COLUMNS, NICHE_COLUMNS, VIDEO_COLUMNS, CHECK_COLUMNS, CONCEPT_COLUMNS } from './store.mjs';

const cell = (v) => {
  if (v == null) return '';
  if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v);
  return v;
};

function sheet(wb, name, columns, rows, widths = {}) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c, key: c, width: widths[c] || Math.min(60, Math.max(12, c.length + 2)) }));
  for (const r of rows) ws.addRow(Object.fromEntries(columns.map((c) => [c, cell(r[c])])));
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

export async function exportWorkbook(s, outPath) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'claude-yt-suite';

  // Packaging first: the filming shortlist.
  const concepts = Object.fromEntries(s.concepts.map((c) => [c.video_id, c]));
  const winners = s.videos.filter((v) => ['qualified', 'rewritten'].includes(v.status)).sort((a, b) => (b.multiple || 0) - (a.multiple || 0));
  const pk = wb.addWorksheet('Packaging', { views: [{ state: 'frozen', ySplit: 1 }] });
  pk.columns = [
    { header: 'thumbnail', key: 'thumb', width: 30 }, { header: 'video_id', key: 'id', width: 11 }, { header: 'multiple', key: 'm', width: 9 }, { header: 'confidence', key: 'conf', width: 14 },
    { header: 'original title', key: 'title', width: 44 }, { header: 'creator (size)', key: 'creator', width: 22 },
    { header: 'mechanism', key: 'mech', width: 16 }, { header: 'my_title', key: 'my_title', width: 44 },
    { header: 'my_thumbnail', key: 'my_thumb', width: 50 }, { header: 'my_angle', key: 'my_angle', width: 50 }, { header: 'url', key: 'url', width: 40 },
  ];
  pk.getRow(1).font = { bold: true };
  winners.forEach((v, i) => {
    const c = concepts[v.video_id] || {};
    const row = pk.addRow({ id: v.video_id, m: v.multiple ? Number(v.multiple.toFixed(2)) : '', conf: v.confidence || '', title: v.title_or_caption, creator: `${v.creator_name || v.creator_id || ''} (${v.creator_size ?? '?'})`, mech: c.mechanism || '', my_title: c.my_title || '', my_thumb: c.my_thumbnail || '', my_angle: c.my_angle || '', url: { text: v.url, hyperlink: v.url } });
    row.height = 96;
    row.alignment = { vertical: 'top', wrapText: true };
    const tp = v.thumb_path && path.resolve(ROOT, v.thumb_path);
    if (tp && fs.existsSync(tp)) {
      const buf = fs.readFileSync(tp);
      const ext = buf[0] === 0x89 ? 'png' : 'jpeg';
      if (buf[0] === 0x89 || (buf[0] === 0xff && buf[1] === 0xd8)) {
        const img = wb.addImage({ buffer: buf, extension: ext });
        pk.addImage(img, { tl: { col: 0, row: i + 1 }, ext: { width: 208, height: 117 }, editAs: 'oneCell' });
      }
    }
  });

  sheet(wb, 'Brief', BRIEF_COLUMNS, [s.brief], { idea: 40, audience: 40, own_niche: 30, own_searches: 60 });
  sheet(wb, 'Niches', NICHE_COLUMNS, s.niches, { niche: 30, overlap: 36, transfer_reason: 60, searches: 60 });
  const vids = s.videos.map((v) => ({ ...v, baseline_sample: v.baseline_sample ? v.baseline_sample.map((b) => `${b.url} | ${b.published_at} | ${b.count}`).join('\n') : '', multiple: v.multiple ?? '' }));
  sheet(wb, 'Videos', [...VIDEO_COLUMNS, 'confidence', 'creator_name', 'duration', 'relevance', 'found_by'], vids, { url: 40, title_or_caption: 50, baseline_sample: 70, reason: 40, found_by: 40 });
  sheet(wb, 'Checks', CHECK_COLUMNS, s.checks, { query_or_url: 50, detail: 70 });
  sheet(wb, 'Concepts', CONCEPT_COLUMNS, s.concepts, { original_title_or_caption: 44, why_it_worked: 50, my_title: 44, my_thumbnail: 60, my_angle: 60, image_check: 60 });

  await wb.xlsx.writeFile(outPath);
  return outPath;
}
