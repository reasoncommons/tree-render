#!/usr/bin/env node
// tree-render CLI. So far: --help, and `parse` / --emit json (writes the canonical tree JSON,
// TREE-FORMAT.md). Rendering arrives in task 9 of the implementation plan.
import fs from 'node:fs';
import { parse, toJSON } from '../src/parse.js';
const USAGE = `Usage: tree-render <tree.md|tree.json> [options]
       tree-render carousel <tree.md|tree.json> [options]
       tree-render check <tree.md|tree.json> [options]
       tree-render parse <tree.md|tree.json> [--out tree.json]

Options:
  --format 4x5|1x1|16x9|web     canvas (default 4x5)
  --theme paper|garden|slate    colour theme (default paper)
  --view questions|qa|answers   what each node shows
  --labels full|lead            full sentences or bold leads only
  --depth N                     levels below the root to open
  --root 2.3                    re-root at that node number
  --kicker TEXT                 frame line, top left
  --footer TEXT                 frame line, bottom right
  --out PATH                    output path without extension
  --png [--scale 2]             also write a PNG (needs Chrome)
  --html                        write the interactive page
  --state '#depth=1'            render a saved fold state
  --emit json                   write the parsed tree as canonical JSON (to --out or stdout)
  -h, --help                    show this help
`;

const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) {
  process.stdout.write(USAGE);
  process.exit(0);
}
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--png', '--html'].includes(args[i - 1])));
const sub = ['parse', 'carousel', 'check'].includes(positional[0]) ? positional.shift() : null;

if (sub === 'parse' || flag('--emit') === 'json') {
  const file = positional[0];
  if (!file) { process.stderr.write('tree-render: no tree file given\n'); process.exit(2); }
  const json = JSON.stringify(toJSON(parse(fs.readFileSync(file, 'utf8'))), null, 2) + '\n';
  const out = flag('--out');
  if (out) fs.writeFileSync(out, json); else process.stdout.write(json);
  process.exit(0);
}
process.stderr.write('tree-render: rendering is not implemented yet (task 9).\n');
process.exit(2);
