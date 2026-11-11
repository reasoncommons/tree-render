#!/usr/bin/env node
// options.js: render one tree in every style of a folder and write a comparison page.
//   node scripts/options.js <tree.json|md> <styles-dir> <out-dir> [--scale 2] [--no-png]
// Writes <out-dir>/<style>.svg, .png, .report.json for each styles-dir/*.json, and <out-dir>/index.html:
// each option's image with its name, description, check summary and its style JSON in a <details>.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/parse.js';
import { createMeasurer } from '../src/measure-node.js';
import { loadStyle } from '../src/style.js';
import { renderStatic, reportLines } from '../src/static-render.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function options(treeFile, stylesDir, outDir, { png = true, scale = 2 } = {}) {
  const tree = parse(fs.readFileSync(treeFile, 'utf8'));
  const measure = await createMeasurer();
  const files = fs.readdirSync(stylesDir).filter(f => f.endsWith('.json')).sort();
  if (!files.length) throw new Error(`no *.json styles in ${stylesDir}`);
  const items = [];
  for (const f of files) {
    const file = path.join(stylesDir, f);
    const raw = fs.readFileSync(file, 'utf8');
    const S = loadStyle(file);
    const name = path.basename(f, '.json');
    const r = await renderStatic(tree, S, { outDir, name, measure, png, scale });
    console.log(reportLines(name, r.report));
    items.push({ name, S, raw, report: r.report, img: path.basename(r.files.png || r.files.svg), svg: path.basename(r.files.svg) });
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), page(tree, treeFile, items));
  return items;
}

function page(tree, treeFile, items) {
  const status = r => r.ok ? (r.warnings.length ? 'ok, ' + r.warnings.map(w => w.check).join(', ') : 'ok') : 'FAILED: ' + r.errors.map(e => e.check).join(', ');
  const figs = items.map(it => `<figure id="${esc(it.name)}">
  <figcaption><h2>${esc(it.name)}</h2><p>${esc(it.S.description || '')}</p><p class="meta">${it.report.metrics.width}×${it.report.metrics.height} · ${esc(status(it.report))} · <a href="${esc(it.svg)}">SVG</a></p></figcaption>
  <a href="${esc(it.img)}"><img src="${esc(it.img)}" alt="${esc(it.name)}" loading="lazy"></a>
  <details><summary>Style JSON</summary><pre>${esc(it.raw)}</pre>
  <details><summary>Resolved (merged over defaults)</summary><pre>${esc(JSON.stringify(it.S, null, 2))}</pre></details></details>
</figure>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tree render options</title>
<style>
:root{--bg:#f4f3f0;--fg:#1b1916;--muted:#6e6a64;--card:#fff}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}
header{max-width:1200px;margin:0 auto 20px}
h1{font-size:22px;margin:0 0 4px}
nav a{margin-right:12px;color:var(--fg)}
.grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(min(100%,760px),1fr))}
body.stack .grid{grid-template-columns:1fr}
figure{margin:0;background:var(--card);padding:16px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,.06);min-width:0}
figcaption h2{font-size:17px;margin:0}
figcaption p{margin:4px 0;color:var(--muted)}
.meta{font-size:13px}
img{display:block;width:100%;height:auto;margin-top:8px;border:1px solid #e6e4df}
pre{font-size:12px;overflow:auto;background:#f7f6f3;padding:8px;max-height:480px}
button{font:inherit;margin-left:8px}
</style></head><body>
<header><h1>Tree render options</h1><p>Tree: ${esc(path.basename(treeFile))} · ${items.length} styles · rendered ${new Date().toISOString().slice(0, 10)} <button onclick="document.body.classList.toggle('stack')">Side by side / stacked</button></p>
<nav>${items.map(it => `<a href="#${esc(it.name)}">${esc(it.name)}</a>`).join('')}</nav></header>
<main class="grid">
${figs}
</main></body></html>
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const pos = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] === '--scale'));
  if (pos.length < 3 || argv.includes('--help')) {
    process.stdout.write('Usage: options.js <tree.json|md> <styles-dir> <out-dir> [--scale 2] [--no-png]\n');
    process.exit(pos.length < 3 ? 2 : 0);
  }
  const si = argv.indexOf('--scale');
  options(pos[0], pos[1], pos[2], { png: !argv.includes('--no-png'), scale: si >= 0 ? +argv[si + 1] : 2 })
    .then(items => { console.log(`${path.join(pos[2], 'index.html')}  ${items.length} options`); process.exit(items.every(i => i.report.ok) ? 0 : 1); },
      e => { process.stderr.write(String(e.stack || e) + '\n'); process.exit(e.constructor && e.constructor.name === 'NoBrowserError' ? 3 : 1); });
}
