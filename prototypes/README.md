# Prototypes (throwaway)

Design-session prototype for the tree renderer, 2026-11-07. It exists to prove the look in [`docs/design/mockups/`](../docs/design/mockups/index.html); the real renderer is specified in [`docs/design/2026-11-07-tree-visual-design.md`](../docs/design/2026-11-07-tree-visual-design.md) and planned in [`docs/plans/2026-11-07-tree-render-implementation-plan.md`](../docs/plans/2026-11-07-tree-render-implementation-plan.md). Don't build on this code; port the parts the plan names.

## Run

```
node prototypes/render.mjs --tree examples/wise-ai-questions.md --format 4x5 --theme paper --depth 1 --kicker "…" --footer "…" --out /tmp/x
node prototypes/render.mjs --tree prototypes/data/wise-ai-questions.md --format web --theme paper --depth 2 --html --out /tmp/x   # interactive page only
```

Options: `--format 4x5|1x1|16x9|web`, `--theme paper|garden|slate`, `--view questions|qa|answers`, `--labels full|lead`, `--depth N` (levels below the root to open), `--root 2.3` (re-root at that node number), `--kicker`, `--footer`, `--scale 2` (PNG device scale), `--keep` (keep the HTML). Needs Google Chrome at the default macOS path (or `CHROME=…`). Prints a metrics line: canvas, fit scale, smallest effective font, floor, map size, node count, overlaps.

## Files

- `lib/tree.js`: parse (the examples' Markdown, plus bold leads), themes, formats, text wrap, layout (columns + d3-flextree), SVG drawing, overlap check. Browser and Node (parse only).
- `lib/app.js`: page script; grow-to-fill, fold state, toolbar, phone outline mode.
- `render.mjs`: builds a self-contained HTML (fonts, vendor, lib, tree) and screenshots it with headless Chrome.
- `vendor/d3-flextree.min.js`: d3-flextree 2.1.2 (MIT), self-contained UMD build.
- `data/`: the Wise AI trees with illustrative bold leads added (the examples in `examples/` are untouched).

Fonts are read from `archive/v0.1/tree-mindmap-skill/fonts/` (Apfel Grotezk, OFL).
