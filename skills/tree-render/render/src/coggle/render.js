// coggle/render.js: tree → <out>/<name>.svg (+ .png at 2×) in the coggle-exact style or a coggle-* variant.
import fs from 'node:fs';
import path from 'node:path';
import { createCoggleText, fontFaceCSS } from './text.js';
import { coggleLayout } from './layout.js';
import { drawCoggle } from './draw.js';
import { coggleStyle, withOverrides } from './styles.js';

export const STYLE_NAME = 'coggle-exact';

// A copy of the tree showing only `depth` levels below the root (deeper nodes dropped).
export function trimDepth(tree, depth) {
  const cut = (n, level) => ({ ...n, children: level < depth ? n.children.map(c => cut(c, level + 1)) : [] });
  return { ...tree, root: cut(tree.root, 0) };
}

// `style`: 'coggle-exact' or one of its variants (styles.js), e.g. 'coggle-thin'. `font` / `sizes`: override
// the style's font (a key of FONTS) and sizes by level ([root, 1, 2, 3+]); `depth`: levels below the root to show;
// `rootRun`: the shape of the root's branches in our layout (layout.js ROOT_RUNS: middle, fan or coggle).
export async function renderCoggle(tree, { outDir = '.', name, png = true, scale = 2, avoidCollisions = true, style = STYLE_NAME, font, sizes, depth, rootRun } = {}) {
  const S = withOverrides(coggleStyle(style), { font, sizes });
  if (depth != null) tree = trimDepth(tree, depth);
  const T = await createCoggleText(S.font);
  const L = coggleLayout(tree, T, { avoidCollisions, style: S, ...(rootRun ? { rootRun } : {}) });
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
