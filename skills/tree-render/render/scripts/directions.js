#!/usr/bin/env node
// directions.js: render the six diagram-direction mock-ups (src/directions/) for side-by-side comparison.
//   node scripts/directions.js <tree.json> [--name q3] [--out dir] [--only 1,4,5] [--no-png]
// Writes <out>/<n>-<slug>-<name>.svg and .png (2×), prints each render's size and any overlap the
// layout check finds (text on text, or a stroke through text).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/parse.js';
import { DIRECTIONS } from '../src/directions/index.js';
import { svgToPng } from './png.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const noPng = args.includes('--no-png'); if (noPng) args.splice(args.indexOf('--no-png'), 1);
const out = path.resolve(flag('out', path.resolve(HERE, '..', '..', '..', '..', 'out', 'directions')));
const only = flag('only', null);
const file = args[0];
if (!file) { console.error('usage: directions.js <tree.json> [--name N] [--out dir] [--only 1,4,5] [--no-png]'); process.exit(2); }
const name = flag('name', null) || path.basename(file).replace(/\.\w+$/, '');
const tree = parse(fs.readFileSync(file, 'utf8'));

fs.mkdirSync(out, { recursive: true });
for (const d of DIRECTIONS) {
  if (only && !only.split(',').includes(String(d.n))) continue;
  const canvas = d.render(tree);
  const svg = canvas.toSVG({ title: tree.root.text });
  const base = path.join(out, `${d.n}-${d.slug}-${name}`);
  fs.writeFileSync(base + '.svg', svg);
  if (!noPng) svgToPng(svg, { out: base + '.png', scale: 2 });
  const [, w, h] = /width="(\d+)" height="(\d+)"/.exec(svg);
  const issues = canvas.check();
  console.log(`${path.basename(base)}  ${w}×${h}${issues.length ? '\n  ' + issues.join('\n  ') : '  ok'}`);
}
