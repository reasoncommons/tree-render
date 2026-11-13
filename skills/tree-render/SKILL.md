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

Five styles are in use (`--style <name>`):

| Style | Look |
| --- | --- |
| `coggle-exact` (default) | Coggle's look: thick coloured S-curves, its palette, the root in a grey box with chevrons. |
| `coggle-thin` | Coggle's layout with IBM Plex Sans, half-width branches and an outlined root. |
| `ribbon` | Bold root on a dot; tapered slate ribbons to each answer (red for the "So…" branch), hairline S-curves to its points. |
| `dendrogram` | Bold root on a dot; dark S-curves to each answer, rounded grey elbows to its points. |
| `lanes` | `ribbon`'s root and ribbons, each answer and its points on a soft grey band, a small dot before each point. |

`ribbon`, `dendrogram` and `lanes` (engine in `render/src/styles2/`) take `--root-box` to set the root in a light Coggle-like box (no chevrons) with the branches leaving its right edge; they write SVG and PNG and exit 1 if any text overlaps.

`--style coggle-exact` is a faithful copy of Coggle's own drawing (one stroked S-curve per branch with Coggle's widths, notched tails and arrow tips, its palette, each label in a darker shade of its branch, Arimo at 17/15.3/13/12 px (the root at 22 px in our layout; Coggle's 17 with `--allow-collisions`), Coggle's label placement and spacing); it has its own engine in `render/src/coggle/` and the rules are in [docs/design/references/coggle-spec.md](../../docs/design/references/coggle-spec.md). Two deviations from Coggle: the layout favours height over width (narrower wraps and more room between sibling groups, so trees come out about square to portrait, which suits web pages and phones), and no branch is allowed to cross a label, so where a branch would run through a sibling's label that group opens up vertically or its labels wrap narrower (`--allow-collisions` restores Coggle's own layout, for comparisons). It writes SVG and PNG only (no report). A node may set `colour` and `textSize` (see `render/TREE-FORMAT.md`).

`coggle-exact` draws the root box with Coggle's chevrons (the little pointers on each side); the variants draw a plain box. In all coggle styles a bold lead runs on into the rest of the label (the `leadBreak` option, off by default, puts the lead on its own line, but it left dangling words). Variants of `coggle-exact` on the same engine (`render/src/coggle/styles.js`): `--style coggle-thin` (the candidate: IBM Plex Sans, half-width branches, outlined root; `coggle-hairline` is an alias). `coggle-thin-mono` (leaves and the text after each bold lead in IBM Plex Mono), `coggle-broadsheet` and `coggle-letterpress` remain in the code but are not candidates: switching just some words to mono does not work.

For comparing type on one shape, the coggle styles take `--font arimo|plex|atkinson|bricolage|merriweather|plexmono|quattro` (the text in that embedded font; `plexmono` is IBM Plex Mono for the whole tree, `quattro` iA Writer Quattro), `--sizes 22,17,15,14` (px for the root, level 1, level 2 and level 3+; the wraps grow with levels 1 and 2 so lines keep about the same words) and `--depth N` (only N levels below the root). Without them a style keeps its own look. With these styles the CLI exits 1 if a branch crosses a label. `render/scripts/deep-tree.js` nests whole trees under one root (e.g. an overview and its question trees) for a three-level test tree.

Sizing rule: choose sizes from the smallest (leaf) size up. Fix the leaf size first (it is the floor for reading, e.g. 14–16 px for desktop), then set level 1 at about 1.2× the leaf and the root at about 1.6× (rounded to 0.5 px): leaf 15 gives `--sizes 24,18,15,15`. A deeper tree keeps the leaf minimum and scales the levels above it, rather than shrinking the leaves. Only `--sizes` exists for now; the rule is not automated yet.

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
