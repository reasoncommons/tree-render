---
name: tree-render
description: Use when turning a question tree or hypothesis tree (a root question or answer with supporting assertions) into a static image (SVG and PNG) for a web page or report. Covers preparing the text, then rendering a left-to-right branching tree with the bundled CLI. Not for flowcharts, org charts or architecture diagrams.
---

# Tree render

Turn a question or hypothesis tree into a static image that is good information design and compelling enough to share: root on the left, tapered coloured branches curving right, bold lead plus lighter continuation. The image goes into a web page or report as a PNG (or the SVG).

Two steps, like making a slide: first decide the words, then draw them. The renderer never rewrites text, so every word on the image is a choice made in step 1.

## 1. Prepare the content

Follow [CONTENT-GUIDE.md](CONTENT-GUIDE.md). In short: compress an existing argument, don't invent one; question root, answer as the title; assertions at level 1, two levels below the root; 3-5 branches, 2-4 leaves each; a bold `lead` on level-1 nodes; a "So..." accent branch for the conclusion; length limits per string (lead 6 words, continuation 12, leaf 14).

Write the result as a canonical JSON tree ([render/TREE-FORMAT.md](render/TREE-FORMAT.md)) or as a Markdown tree (H1 title, nested `-` bullets, `**lead**` bold). Either works as input. Keep a `texts.md` beside it saying which strings are verbatim, cut or drafted, and what was left out.

## 2. Render

Run from `skills/tree-render/render/` (or use the full path to `bin/render.js`):

```
node bin/render.js tree.json --out out/
```

This writes `out/tree.svg` and `out/tree.png` (2x) and prints a one-line summary. The default style is `coggle-exact`, a faithful copy of Coggle's look (double-curve branches, Coggle's palette, text in a darker shade of its branch). The older styles stay available by name, e.g. `--style river` or `--style coggle` (files are then named after the style; add `--name tree` to keep the tree's name, and these also write `tree.report.json`). Other useful flags: `--no-png`, `--scale 2`, `--name N`.

`node bin/render.js check tree.json` prints the self-check report only. `node bin/render.js parse tree.md --out tree.json` converts Markdown to canonical JSON.

`--style coggle-exact` is a faithful copy of Coggle's own drawing (one stroked S-curve per branch with Coggle's widths, notched tails and arrow tips, its palette, each label in a darker shade of its branch, Arimo at 17/15.3/13/12 px, Coggle's label placement and spacing); it has its own engine in `render/src/coggle/` and the rules are in [docs/design/references/coggle-spec.md](../../docs/design/references/coggle-spec.md). It writes SVG and PNG only (no report). A node may set `colour` and `textSize` (see `render/TREE-FORMAT.md`).

Other styles live in `render/styles/` (`coggle`, `v01`, `v01-thick`, `coggle-tree`, `current`, and the 2026-11-11 experiments in `options-2026-11-11/`); pass the name or a file path to `--style`. Old, parked flags (`--format`, `--theme`, `carousel`, `--html`) are for framed social cards and the interactive view; ignore them for web and report images.

## 3. Look, then fix

Always open the PNG and look at it, and read the check report (printed summary and `.report.json`). Check that:

- no text overflows, overlaps or is clipped (a hard failure exits 1);
- the report does not say `shrunk`: that means the tree was too wide and the whole image was scaled down, so the type got smaller;
- the leads alone, read top to bottom, tell the argument;
- no leaf wraps to three or more lines; the "So..." branch is in the accent colour.

Fix problems by changing the content: shorten the string, cut a clause, drop a leaf, merge two branches. Never fix them by shrinking the type. Then render again; expect two or three rounds.

## Comparing styles

To see several styles side by side on the same tree, put the style JSON files you want in a folder and run:

```
node scripts/options.js tree.json <styles-dir> <out-dir> [--no-png]
```

It renders the tree in every `*.json` in the folder and writes `<out-dir>/index.html` with each image, its check summary and its style JSON. Example: `node scripts/options.js test/fixtures/v01-q2.json styles/options-2026-11-11 /tmp/options`.

## Setup

- Node 20 or later.
- `npm install` in `skills/tree-render/render/` (one dependency, opentype.js).
- Chrome, or Playwright's chromium, for the PNG. Without a browser the SVG is still written, and the CLI exits 3 for the PNG. Use `--no-png` to skip it.
- Install the skill by symlink: `ln -s <repo>/skills/tree-render ~/.claude/skills/tree-render`.

## Not in scope

Deciding the argument itself (that is the tree's source), flowcharts, and the interactive view (parked; the code is kept but gets no more work).
