// coggle/render.js: tree → <out>/<name>.svg (+ .png at 2×) in the coggle-exact style.
import fs from 'node:fs';
import path from 'node:path';
import { createCoggleText, fontFaceCSS } from './text.js';
import { coggleLayout } from './layout.js';
import { drawCoggle } from './draw.js';

export const STYLE_NAME = 'coggle-exact';

export async function renderCoggle(tree, { outDir = '.', name, png = true, scale = 2 } = {}) {
  const T = await createCoggleText();
  const L = coggleLayout(tree, T);
  const svg = drawCoggle(L, { fontCSS: fontFaceCSS() });
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, name || STYLE_NAME);
  fs.writeFileSync(base + '.svg', svg);
  const files = { svg: base + '.svg' };
  if (png) {
    const { svgToPng } = await import('../../scripts/png.js');
    svgToPng(svg, { out: base + '.png', scale });
    files.png = base + '.png';
  }
  return { L, svg, files };
}
