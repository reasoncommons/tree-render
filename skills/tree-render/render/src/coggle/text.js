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
// A font: a family with a regular and a "bold" file (the bold is whatever weight the lead uses), and optionally
// `mono`: { family, file, stack, sizeDelta } for text set in a second (monospace) face, sizeDelta px smaller.
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
  const key = font.family + '|' + (font.mono?.family || '');
  if (cache.has(key)) return cache.get(key);
  const load = (f) => { const b = fs.readFileSync(path.join(FONT_DIR, f)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
  const fonts = { regular: load(font.files.regular), bold: load(font.files.bold), mono: font.mono ? load(font.mono.file) : null };
  // opentype.js can't shape some fonts (e.g. Bricolage Grotesque, Merriweather: GSUB chained-context lookups it
  // doesn't support throw in getAdvanceWidth). For those, sum the glyph advances plus whatever pair kerning it
  // can read (none, where the kerning sits in GPOS extension lookups): a little wider than the browser sets it
  // (kerning mostly tightens, ~2%), so boxes err on the roomy side.
  for (const f of Object.values(fonts)) {
    if (!f) continue;
    try { f.getAdvanceWidth('Ta', f.unitsPerEm, { kerning: true }); f.shapes = true; } catch { f.shapes = false; }
  }
  const h = fonts.regular.tables.hhea, u = fonts.regular.unitsPerEm;
  fonts.metrics = metricsFns(h.ascender / u, Math.abs(h.descender) / u, h.lineGap / u);
  cache.set(key, fonts);
  return fonts;
}

// Advance width (font units) without shaping: glyph advances plus pair kerning.
function plainAdvance(f, text) {
  let w = 0, prev = null;
  for (const ch of text) { const g = f.charToGlyph(ch); if (prev) w += f.getKerningValue(prev, g); w += g.advanceWidth; prev = g; }
  return w;
}

const FORMATS = { ttf: ['font/ttf', 'truetype'], otf: ['font/otf', 'opentype'], woff: ['font/woff', 'woff'] };
export function fontFaceCSS(font = ARIMO) {
  const face = (family, weight, f) => {
    const b64 = fs.readFileSync(path.join(FONT_DIR, f)).toString('base64');
    const [mime, format] = FORMATS[path.extname(f).slice(1)];
    return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:${mime};base64,${b64}) format('${format}');}`;
  };
  const css = Object.entries(font.files).map(([k, f]) => face(font.family, k === 'bold' ? font.boldWeight : 400, f));
  if (font.mono) css.push(face(font.mono.family, 400, font.mono.file));
  return css.join('');
}

// Label runs: a bold lead (if any) then the regular rest. `leadBreak`: the rest starts on a new line.
// `mono`: set the regular rest in the font's mono face.
export function runsFor(node, { leadBreak = false, mono = false } = {}) {
  if (node.lead) return [{ text: node.lead, bold: true }, ...(node.cont ? [{ text: node.cont, bold: false, br: leadBreak, mono }] : [])];
  return [{ text: node.text, bold: false, mono }];
}

export async function createCoggleText(font = ARIMO) {
  const fonts = loadFonts(font), { lineHeight, baseline } = fonts.metrics;
  const unit = new Map();
  const monoDelta = font.mono?.sizeDelta || 0;
  // `face`: true / 'bold', 'mono', or falsy (regular). Mono text is set sizeDelta px smaller.
  const measure = (text, size, face) => {
    const fc = face === 'mono' && fonts.mono ? 'mono' : face ? 'bold' : 'regular';
    const key = fc[0] + '|' + text;
    let w = unit.get(key);
    if (w == null) {
      const f = fonts[fc];
      w = !text ? 0 : (f.shapes ? f.getAdvanceWidth(text, f.unitsPerEm, { kerning: true }) : plainAdvance(f, text)) / f.unitsPerEm;
      unit.set(key, w);
    }
    return w * (fc === 'mono' ? size - monoDelta : size);
  };

  // Greedy wrap, as the browser does: words keep their run's face; a space takes the face of the run it is in.
  // A run with `br` starts on a new line.
  function layoutText(runs, size, maxWidth = WRAP_WIDTH) {
    const words = [];
    runs.forEach((r) => {
      const face = r.bold ? 'bold' : r.mono && fonts.mono ? 'mono' : '';
      r.text.split(/\s+/).filter(Boolean).forEach((t, wi) => words.push({ text: t, bold: r.bold, mono: face === 'mono', face, br: wi === 0 && !!r.br && words.length > 0 }));
    });
    const lineW = (ws) => ws.reduce((s, w, i) => s + (i ? measure(' ', size, w.face) : 0) + measure(w.text, size, w.face), 0);
    const one = lineW(words), forced = words.some(w => w.br);
    const lines = [];
    let soft = false;
    if (one <= maxWidth && !forced) lines.push(words);
    else {
      let cur = [];
      for (const w of words) {
        if (cur.length && w.br) { lines.push(cur); cur = []; }
        else if (cur.length && lineW([...cur, w]) > maxWidth) { lines.push(cur); cur = []; soft = true; }
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
        if (last && last.bold === w.bold && last.mono === w.mono) last.text += piece; else segs.push({ text: piece, bold: w.bold, mono: w.mono });
      });
      return { segs, w: lineW(ws) };
    });
    // a soft-wrapped label is as wide as its wrap width (as in the browser); otherwise as wide as its longest line
    const w = soft || (one > maxWidth && !forced) ? maxWidth : Math.max(...out.map(l => l.w));
    return { lines: out, w, h: out.length * lh, size, lineHeight: lh, baseline: baseline(size), monoSize: size - monoDelta };
  }

  return { measure, layoutText };
}
