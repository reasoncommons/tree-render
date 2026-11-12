#!/usr/bin/env node
// directions2.js: render the round-2 direction mock-ups (A, A-mono, B, C, C-hue, D, D-hue) for one or more trees.
//   node scripts/directions2.js <tree.json>... [--out dir] [--only A,C] [--no-png]
// Writes <out>/<slug>-<tree>.svg and .png (2×); prints each render's size and any overlap the check finds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/parse.js';
import { A, AMono, D, DHue } from '../src/directions/elegant.js';
import B from '../src/directions/dendro2.js';
import { C, CHue } from '../src/directions/radial2.js';
import { svgToPng } from './png.js';

const DIRECTIONS = [A, AMono, B, C, CHue, D, DHue];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const noPng = args.includes('--no-png'); if (noPng) args.splice(args.indexOf('--no-png'), 1);
const out = path.resolve(flag('out', path.resolve(HERE, '..', '..', '..', '..', 'out', 'directions2')));
const only = flag('only', null);
if (!args.length) { console.error('usage: directions2.js <tree.json>... [--out dir] [--only A,C] [--no-png]'); process.exit(2); }

fs.mkdirSync(out, { recursive: true });
for (const file of args) {
  const name = path.basename(file).replace(/\.\w+$/, '');
  const tree = parse(fs.readFileSync(file, 'utf8'));
  for (const d of DIRECTIONS) {
    if (only && !only.split(',').includes(d.slug)) continue;
    const canvas = d.render(tree);
    const svg = canvas.toSVG({ title: tree.root.text });
    const base = path.join(out, `${d.slug}-${name}`);
    fs.writeFileSync(base + '.svg', svg);
    if (!noPng) svgToPng(svg, { out: base + '.png', scale: 2 });
    const [, w, h] = /width="(\d+)" height="(\d+)"/.exec(svg);
    const issues = canvas.check();
    console.log(`${path.basename(base)}  ${w}×${h}${issues.length ? '\n  ' + issues.join('\n  ') : '  ok'}${canvas.warnings?.length ? '\n  warning: short text derived for: ' + canvas.warnings.join(' | ') : ''}`);
  }
}
