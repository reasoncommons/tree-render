#!/usr/bin/env node
// tree-render CLI. Only --help works so far; rendering arrives in task 9 of the implementation plan.
const USAGE = `Usage: tree-render <tree.md|tree.json> [options]
       tree-render carousel <tree.md|tree.json> [options]
       tree-render check <tree.md|tree.json> [options]

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
  -h, --help                    show this help
`;

const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) {
  process.stdout.write(USAGE);
  process.exit(0);
}
process.stderr.write('tree-render: rendering is not implemented yet (task 9).\n');
process.exit(2);
