// static-render.js (Node): tree + style → <out>/<name>.svg, .png (2× by default) and .report.json.
import fs from 'node:fs';
import path from 'node:path';
import { loadStyle, STYLE_DIR } from './style.js';
import { staticLayout } from './static-layout.js';
import { drawStatic } from './static-draw.js';
import { checkStatic } from './static-check.js';
import { fontFaceCSS } from './measure-node.js';

// A style file path, or the name of a style in styles/.
export function findStyle(ref) {
  if (fs.existsSync(ref) && fs.statSync(ref).isFile()) return ref;
  const named = path.join(STYLE_DIR, ref.replace(/\.json$/, '') + '.json');
  if (fs.existsSync(named)) return named;
  throw new Error(`no such style: ${ref}`);
}

export async function renderStatic(tree, styleRef, { outDir, name, measure, png = true, scale = 2 }) {
  const S = typeof styleRef === 'string' ? loadStyle(findStyle(styleRef)) : styleRef;
  const L = staticLayout(tree, S, measure);
  const svg = drawStatic(L, { fontCSS: fontFaceCSS() });
  const report = checkStatic(L);
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, name || S.name || 'tree');
  fs.writeFileSync(base + '.svg', svg);
  fs.writeFileSync(base + '.report.json', JSON.stringify(report, null, 2) + '\n');
  const files = { svg: base + '.svg', report: base + '.report.json' };
  if (png) {
    const { svgToPng } = await import('../scripts/png.js');
    svgToPng(svg, { out: base + '.png', scale });
    files.png = base + '.png';
  }
  return { L, S, svg, report, files };
}

export function reportLines(name, rep) {
  const m = rep.metrics;
  const lines = [`${name}  style ${m.style} · ${m.width}×${m.height} · scale ${m.scale} · ${m.nodes} nodes · ${rep.ok ? (rep.warnings.length ? 'ok with warnings' : 'ok') : 'FAILED'}`];
  for (const [kind, list] of [['error', rep.errors], ['warning', rep.warnings]]) {
    for (const x of list) {
      lines.push(`  ${kind} ${x.check}: ${x.message}`);
      if (x.nodes && x.nodes.length) lines.push(`    nodes: ${x.nodes.slice(0, 8).map(n => Array.isArray(n) ? n.join(' × ') : n).join('; ')}${x.nodes.length > 8 ? ' …' : ''}`);
    }
  }
  return lines.join('\n');
}
