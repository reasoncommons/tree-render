// styles2/index.js: the ribbon, dendrogram and lanes styles (promoted from the round-2 mock-ups).
// Each is set in IBM Plex Sans on a Canvas (src/directions/common.js) that checks itself for overlaps.
import fs from 'node:fs';
import path from 'node:path';
import ribbon from './ribbon.js';
import dendrogram from './dendrogram.js';
import { useFont } from '../directions/common.js';
import { getPalette } from '../palettes.js';
import { FONTS } from '../coggle/styles.js';

export const STYLES2 = { ribbon: ribbon.ribbon, dendrogram, lanes: ribbon.lanes };
export const STYLE2_NAMES = Object.keys(STYLES2);

// Draws tree in `style`; options: { rootBox, palette } (palette: a PALETTES object). Returns the Canvas.
export function drawStyle2(tree, style, opts = {}) {
  const f = STYLES2[style];
  if (!f) throw new Error(`unknown style "${style}" (have: ${STYLE2_NAMES.join(', ')})`);
  return f(tree, opts);
}

// tree → <outDir>/<name>.svg (+ .png at `scale`). Returns { canvas, svg, files, issues } (issues: overlaps found).
// `palette`: a key of PALETTES (palettes.js); `font`: a key of the coggle FONTS (default IBM Plex Sans).
export async function renderStyle2(tree, { style, outDir = '.', name, png = true, scale = 2, rootBox = false, palette, font } = {}) {
  const P = getPalette(palette);
  if (font != null && !FONTS[font]) throw new Error(`unknown font "${font}" (have: ${Object.keys(FONTS).join(', ')})`);
  let canvas, svg;
  useFont(font ? FONTS[font] : null);
  try {
    canvas = drawStyle2(tree, style, { rootBox, palette: P });
    svg = canvas.toSVG({ title: tree.root.text });
  } finally { useFont(null); }
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, name || style);
  fs.writeFileSync(base + '.svg', svg);
  const files = { svg: base + '.svg' };
  if (png) {
    const { svgToPng } = await import('../../scripts/png.js');
    svgToPng(svg, { out: base + '.png', scale });
    files.png = base + '.png';
  }
  return { canvas, svg, files, issues: canvas.check() };
}
