// coggle/text.js: Coggle's text, set in Arimo (metric-compatible with the Helvetica/Arial Coggle asks for).
// Sizes by level 17 / 15.3 / 13 / 12 px; line-height "normal" as Chrome computes it (ascent, descent and
// line gap each rounded to whole pixels); a label wraps at 350 px of text, otherwise it is as wide as its
// one line. A bold lead is a <strong> run inside the label, in the same colour.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

export const FONT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'fonts');
export const FONT_FILES = { regular: 'Arimo-Regular.ttf', bold: 'Arimo-Bold.ttf' };
export const FONT_FAMILY = 'Arimo';
export const FONT_STACK = "Arimo, Helvetica, Arial, sans-serif";
export const FONT_SIZES = [17, 15.3, 13, 12];
export const WRAP_WIDTH = 350;

// Arimo's hhea metrics (units per em 2048): ascender 1854, descender 434, line gap 67.
const ASC = 1854 / 2048, DESC = 434 / 2048, GAP = 67 / 2048;

export const fontSize = (level) => FONT_SIZES[Math.min(level, FONT_SIZES.length - 1)];
export function lineHeight(size) {
  return Math.round(ASC * size) + Math.round(DESC * size) + Math.round(GAP * size);
}
// Baseline below the top of a line box: half the leading above, then the ascent.
export function baseline(size) {
  const lh = lineHeight(size), a = Math.round(ASC * size), d = Math.round(DESC * size);
  return (lh - a - d) / 2 + a;
}

let cache = null;
function loadFonts() {
  if (cache) return cache;
  const load = (f) => { const b = fs.readFileSync(path.join(FONT_DIR, f)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
  cache = { regular: load(FONT_FILES.regular), bold: load(FONT_FILES.bold) };
  return cache;
}

export function fontFaceCSS() {
  return Object.entries(FONT_FILES).map(([k, f]) => {
    const b64 = fs.readFileSync(path.join(FONT_DIR, f)).toString('base64');
    return `@font-face{font-family:'${FONT_FAMILY}';font-weight:${k === 'bold' ? 700 : 400};src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
  }).join('');
}

// Label runs: a bold lead (if any) then the regular rest.
export function runsFor(node) {
  if (node.lead) return [{ text: node.lead, bold: true }, ...(node.cont ? [{ text: node.cont, bold: false }] : [])];
  return [{ text: node.text, bold: false }];
}

export async function createCoggleText() {
  const fonts = loadFonts();
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
