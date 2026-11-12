// styles2/index.js: the ribbon, dendrogram and lanes styles (promoted from the round-2 mock-ups).
// Each is set in IBM Plex Sans on a Canvas (src/directions/common.js) that checks itself for overlaps.
import fs from 'node:fs';
import path from 'node:path';
import ribbon from './ribbon.js';
import dendrogram from './dendrogram.js';

export const STYLES2 = { ribbon: ribbon.ribbon, dendrogram, lanes: ribbon.lanes };
export const STYLE2_NAMES = Object.keys(STYLES2);

// Draws tree in `style`; options: { rootBox }. Returns the Canvas.
export function drawStyle2(tree, style, opts = {}) {
  const f = STYLES2[style];
  if (!f) throw new Error(`unknown style "${style}" (have: ${STYLE2_NAMES.join(', ')})`);
  return f(tree, opts);
}

// tree → <outDir>/<name>.svg (+ .png at `scale`). Returns { canvas, svg, files, issues } (issues: overlaps found).
export async function renderStyle2(tree, { style, outDir = '.', name, png = true, scale = 2, rootBox = false } = {}) {
  const canvas = drawStyle2(tree, style, { rootBox });
  const svg = canvas.toSVG({ title: tree.root.text });
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
