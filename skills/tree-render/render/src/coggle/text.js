// coggle/text.js: Coggle's text, set in Arimo (metric-compatible with the Helvetica/Arial Coggle asks for),
// or another embedded font for the coggle-* variants (styles.js).
// Sizes by level 17 / 15.3 / 13 / 12 px; line-height "normal" as Chrome computes it (ascent, descent and
// line gap each rounded to whole pixels); a label wraps at 350 px of text, otherwise it is as wide as its
// one line. A bold lead is a <strong> run inside the label, in the same colour.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

export const FONT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'fonts');
// A font: a family with a regular and a "bold" file (the bold is whatever weight the lead uses).
export const ARIMO = { family: 'Arimo', files: { regular: 'Arimo-Regular.ttf', bold: 'Arimo-Bold.ttf' }, boldWeight: 700, stack: 'Arimo, Helvetica, Arial, sans-serif' };
export const FONT_FILES = ARIMO.files;
export const FONT_FAMILY = ARIMO.family;
export const FONT_STACK = ARIMO.stack;
export const FONT_SIZES = [17, 15.3, 13, 12];
export const WRAP_WIDTH = 350;

export const fontSize = (level, sizes = FONT_SIZES) => sizes[Math.min(level, sizes.length - 1)];

// Line height "normal" as Chrome computes it from the hhea metrics (ascent, descent and line gap each
// rounded to whole pixels), and the baseline below the top of a line box (half the leading, then the ascent).
// Arimo (units per em 2048): ascender 1854, descender 434, line gap 67.
function metricsFns(asc, desc, gap) {
  const lineHeight = (size) => Math.round(asc * size) + Math.round(desc * size) + Math.round(gap * size);
  const baseline = (size) => (lineHeight(size) - Math.round(asc * size) - Math.round(desc * size)) / 2 + Math.round(asc * size);
  return { lineHeight, baseline };
}
const ARIMO_METRICS = metricsFns(1854 / 2048, 434 / 2048, 67 / 2048);
export const lineHeight = (size) => ARIMO_METRICS.lineHeight(size);
export const baseline = (size) => ARIMO_METRICS.baseline(size);

const cache = new Map();
function loadFonts(font) {
  if (cache.has(font.family)) return cache.get(font.family);
  const load = (f) => { const b = fs.readFileSync(path.join(FONT_DIR, f)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
  const fonts = { regular: load(font.files.regular), bold: load(font.files.bold) };
  const h = fonts.regular.tables.hhea, u = fonts.regular.unitsPerEm;
  fonts.metrics = metricsFns(h.ascender / u, Math.abs(h.descender) / u, h.lineGap / u);
  cache.set(font.family, fonts);
  return fonts;
}

const FORMATS = { ttf: ['font/ttf', 'truetype'], otf: ['font/otf', 'opentype'], woff: ['font/woff', 'woff'] };
export function fontFaceCSS(font = ARIMO) {
  return Object.entries(font.files).map(([k, f]) => {
    const b64 = fs.readFileSync(path.join(FONT_DIR, f)).toString('base64');
    const [mime, format] = FORMATS[path.extname(f).slice(1)];
    return `@font-face{font-family:'${font.family}';font-weight:${k === 'bold' ? font.boldWeight : 400};src:url(data:${mime};base64,${b64}) format('${format}');}`;
  }).join('');
}

// Label runs: a bold lead (if any) then the regular rest.
export function runsFor(node) {
  if (node.lead) return [{ text: node.lead, bold: true }, ...(node.cont ? [{ text: node.cont, bold: false }] : [])];
  return [{ text: node.text, bold: false }];
}

export async function createCoggleText(font = ARIMO) {
  const fonts = loadFonts(font), { lineHeight, baseline } = fonts.metrics;
  const unit = new Map();
  const measure = (text, size, bold) => {
    const key = (bold ? 'b|' : 'r|') + text;
    let w = unit.get(key);
    if (w == null) {
      const f = bold ? fonts.bold : fonts.regular;
      w = text ? f.getAdvanceWidth(text, f.unitsPerEm, { kerning: true }) / f.unitsPerEm : 0;
      unit.set(key, w);
    }
    return w * size;
  };

  // Greedy wrap, as the browser does: words keep their run's weight; a space takes the weight of the run it is in.
  function layoutText(runs, size, maxWidth = WRAP_WIDTH) {
    const words = [];
    runs.forEach((r, ri) => r.text.split(/\s+/).filter(Boolean).forEach((t, wi) => words.push({ text: t, bold: r.bold, spaceBold: wi === 0 ? (ri === 0 ? r.bold : r.bold) : r.bold })));
    const lineW = (ws) => ws.reduce((s, w, i) => s + (i ? measure(' ', size, w.spaceBold) : 0) + measure(w.text, size, w.bold), 0);
    const one = lineW(words);
    const lines = [];
    if (one <= maxWidth) lines.push(words);
    else {
      let cur = [];
      for (const w of words) {
        if (cur.length && lineW([...cur, w]) > maxWidth) { lines.push(cur); cur = []; }
        cur.push(w);
      }
      if (cur.length) lines.push(cur);
    }
    const lh = lineHeight(size);
    const out = lines.map(ws => {
      const segs = [];
      ws.forEach((w, i) => {
        const piece = (i ? ' ' : '') + w.text;
        const last = segs[segs.length - 1];
        if (last && last.bold === w.bold) last.text += piece; else segs.push({ text: piece, bold: w.bold });
      });
      return { segs, w: lineW(ws) };
    });
    return { lines: out, w: one <= maxWidth ? one : maxWidth, h: out.length * lh, size, lineHeight: lh, baseline: baseline(size) };
  }

  return { measure, layoutText };
}
