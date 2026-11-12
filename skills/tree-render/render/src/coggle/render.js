// coggle/render.js: tree → <out>/<name>.svg (+ .png at 2×) in the coggle-exact style or a coggle-* variant.
import fs from 'node:fs';
import path from 'node:path';
import { createCoggleText, fontFaceCSS } from './text.js';
import { coggleLayout } from './layout.js';
import { drawCoggle } from './draw.js';
import { coggleStyle } from './styles.js';

export const STYLE_NAME = 'coggle-exact';

// `style`: 'coggle-exact' or one of its variants (styles.js), e.g. 'coggle-hairline'.
export async function renderCoggle(tree, { outDir = '.', name, png = true, scale = 2, avoidCollisions = true, style = STYLE_NAME } = {}) {
  const S = coggleStyle(style);
  const T = await createCoggleText(S.font);
  const L = coggleLayout(tree, T, { avoidCollisions, style: S });
  const svg = drawCoggle(L, { fontCSS: fontFaceCSS(S.font), style: S });
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, name || S.name);
  fs.writeFileSync(base + '.svg', svg);
  const files = { svg: base + '.svg' };
  if (png) {
    const { svgToPng } = await import('../../scripts/png.js');
    svgToPng(svg, { out: base + '.png', scale });
    files.png = base + '.png';
  }
  return { L, svg, files };
}
