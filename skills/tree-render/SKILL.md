---
name: tree-render
description: Use when turning a question tree or hypothesis tree (a root question with supporting assertions or answers) into a static image (SVG and PNG) for a web page, report or post. Covers preparing the text, then rendering a left-to-right branching tree with the bundled CLI and checking the result. Not for flowcharts, org charts or architecture diagrams.
---

# Tree render

Turn a question or hypothesis tree into a static image that is good information design and worth sharing: the root question on the left, coloured branches curving right, each main point with a bold lead. The output is an SVG and a PNG.

Work in two steps, like making a slide: first decide the words, then draw them. The renderer never rewrites text, so every word on the image is a choice you make in step 1.

## 1. Prepare the content

Follow [CONTENT-GUIDE.md](CONTENT-GUIDE.md). The rules that matter most:

- Compress the user's argument; never invent claims, drop qualifiers or change "should" to "does".
- The root is a plain question (about 8 words or fewer). Level 1 holds 3–5 assertions, not topics. Each has 2–4 short leaves. Two levels below the root.
- Each level-1 node opens with a bold lead (6 words or fewer) that stands alone as the point, like a heading. Read alone, top to bottom, the leads tell the argument.
- If the source draws a conclusion, make it the last level-1 node, starting "So".
- Length limits: lead 6 words, the rest of a level-1 node 12, a leaf 14.

Write the tree as Markdown ([render/TREE-FORMAT.md](render/TREE-FORMAT.md)): an H1 title, then nested `-` bullets with two-space indents, the first bullet being the root, and `**lead**` in bold. For example, [examples/speed-of-wisdom.md](../../examples/speed-of-wisdom.md). JSON works too. Tell the user which wording you drafted rather than took from them.

## 2. Render

Setup, once: Node 20 or later, then `npm install` in `skills/tree-render/render/`. For the PNG you need Chrome or Chromium (set `CHROME=/path/to/chrome` if it isn't found); without one, use `--no-png` and the SVG.

From `skills/tree-render/render/`:

```
node bin/render.js tree.md --out out
```

This writes `out/tree.svg` and `out/tree.png` (at 2x) in the default style, `ribbon`. With `--style NAME` the files are named after the style unless you add `--name NAME`.

Pick a style by purpose:

| Style | Look | Use when |
| --- | --- | --- |
| `ribbon` (default) | Bold root on a dot, tapered ribbons, hairlines to the leaves | Most cases; a host site's own palette (with `--palette`) |
| `coggle-exact` | Coggle's look: thick coloured S-curves, grey root box | Coggle's colourful look; trees more than two levels deep |
| `coggle-thin` | The same layout in IBM Plex Sans, thin branches, outlined root | A quieter page |
| `dendrogram` | Dark S-curves, rounded elbows to the leaves | Print, or a sober look |
| `lanes` | Like `ribbon`, each branch on a soft grey band | Many leaves per branch |

For example:

```
node bin/render.js tree.md --style ribbon --palette wise-ink --root-style centre --out out
```

The [gallery](../../docs/gallery.md) shows each style and the main options on one tree, with the command for each.

Main options (the full list is in `node bin/render.js --help`):

- `--palette wise-ink|wise-print`: the Wisdom and AI site's colours, with a red accent on the "So" branch. Without it each style keeps its own colours.
- `--font arimo|plex|atkinson|bricolage|merriweather|plexmono|quattro`: set the text in another embedded font.
- `--root-style dot|centre|box|outline` (`ribbon`, `dendrogram`, `lanes`): how the root question is drawn.
- `--curve ribbon|coggle|coggle-l1` (`ribbon`, `dendrogram`, `lanes`): the main branches' curve. `ribbon` (default) is the styles' own S; `coggle` is Coggle's S over a run of at least 320 px, longer for a tall tree so the outer branches stay soft S's, not vertical pipes (the tree is a little wider). These styles draw two levels below the root and print a note if a tree has more.
- `--depth N` (`coggle-exact`, `coggle-thin`): show only N levels below the root.
- `--sizes 22,17,15,14` (`coggle-exact`, `coggle-thin`): font sizes in px for the root, level 1, level 2 and deeper. Choose from the leaf size up: fix the leaf (14–16 px on desktop), level 1 at about 1.2x, the root at about 1.6x; leaf 15 gives `--sizes 24,18,15,15`.
- `--root-run` and `--s-run` (`coggle-exact`, `coggle-thin`): how wide the root's branches run; see [coggle-curvature.md](../../docs/design/references/coggle-curvature.md).
- `--no-png`, `--scale N`, `--name N`, `--out DIR`.

A node in JSON may also set `colour` and `textSize` (coggle styles). To convert Markdown to JSON: `node bin/render.js parse tree.md --out tree.json`.

Exit codes: 0 ok; 1 a branch crosses a label or text overlaps (the files are still written); 2 a usage error; 3 no browser for the PNG.

## 3. Look, then fix

Always open the PNG and look at it. Check that:

- nothing overlaps, overflows or is clipped (exit code 1 means it does);
- the bold leads alone, read top to bottom, tell the argument;
- no leaf wraps to three or more lines;
- the branches look roughly balanced.

Fix problems by changing the content: shorten a string, cut a clause, drop a leaf, merge two branches. Never fix them by shrinking the type. Render again; expect two or three rounds.

## Not in scope

Deciding the argument itself (that comes from the source), flowcharts, and the interactive view (parked). `--help legacy` lists the older canvas engine (`--format`, `--theme`, `carousel`, `--html`, `check`) and JSON styles; don't use them for new images.
