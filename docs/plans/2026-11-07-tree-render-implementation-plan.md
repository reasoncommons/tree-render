# Tree render: implementation plan

**Draft: direction pending Rufus's pick.** Everything here builds the geometry, layout, type and behaviour of the [design spec](../design/2026-11-07-tree-visual-design.md); the theme table (spec section 7) is the only input that may change, and it is isolated in one file (`themes.js`) so a different pick or a blend is a data edit. Written 2026-11-08 for execution by Opus subagents, task by task. The prototype in `prototypes/` is throwaway; tasks say which parts to port.

## Target

A clean renderer and a skill in this repo:

```
skills/tree-render/
  SKILL.md                 when to use, workflow, checks (task 11)
  README.md                install (symlink), CLI usage
  fonts/                   ApfelGrotezk-Regular.otf, ApfelGrotezk-Mittel.otf, README (OFL; copied from archive/v0.1)
  render/
    package.json           name tree-render, type module, bin: tree-render → bin/render.js, engines node ≥ 20
    bin/render.js          CLI (task 9)
    src/parse.js           Markdown or JSON → tree (task 2)
    src/measure-node.js    opentype.js text measurer (task 3)
    src/measure-browser.js canvas text measurer (task 3)
    src/wrap.js            greedy + balanced wrap (task 3)
    src/formats.js         canvas sizes, type scale, gaps, floors, budgets (spec 4–5)
    src/themes.js          the theme table (spec 7); the only file a direction change touches
    src/layout.js          blocks, column budget, flextree, fill, fit, grow (task 4)
    src/draw.js            SVG string: ribbons, shelves, trunk, text, markers, frame (task 5)
    src/check.js           self-checks → JSON report (task 8)
    src/interactive.js     page script for the self-contained HTML (task 7)
    src/bundle.js          concatenates the browser build (no bundler) (task 7)
    vendor/d3-flextree.min.js  2.1.2, MIT, self-contained UMD (copy from prototypes/vendor)
    scripts/png.js         headless Chrome screenshot (task 6)
    test/                  node:test; fixtures = ../../examples plus leads variants (every task)
    test/golden/           SVGs per example × format × theme, regenerated with UPDATE_GOLDEN=1
```

Dependencies: `opentype.js` (npm), `d3-flextree` (vendored). No framework, no bundler; the browser build is the ESM sources concatenated into one IIFE by `src/bundle.js`. PNGs need Google Chrome (`CHROME` env or the macOS default path) or Playwright's chromium if present (`~/Library/Caches/ms-playwright`); the renderer must work without either for SVG and HTML.

Working rules for every task: Node ESM, plain functions, no classes needed; one line per paragraph in Markdown; tests with `node --test`; do not touch `archive/`, `reports/`, `.beads/`, `examples/*.md` (add fixtures under `test/fixtures/` instead); don't commit unless the orchestrator says so; after each task run `node --test` and `node bin/render.js examples/wise-ai-questions.md --format 4x5 --out /tmp/t` and look at the PNG.

## Tasks

### 1. Scaffold

Create the tree above with empty modules, `package.json`, `npm install opentype.js`, copy fonts and the vendored flextree, a `test/smoke.test.js` that imports every module. Acceptance: `node --test` passes; `node bin/render.js --help` prints usage.

### 2. Parser (`src/parse.js`)

Port from `prototypes/lib/tree.js` `parse/splitLead/clean/number/count/find`, dropping the `Lead | rest` shorthand (rejected in the spec). Input: Markdown (spec 10) or JSON. Output: `{title, kind, source, root}`; node `{text, lead, cont, answer, children, depth, index, num}`. `prune(root, depth)` and `reroot(root, num)` as pure functions returning copies with `hidden` counts. Tests: every file in `examples/` parses to the node counts in `examples/README.md` (12, 53, 33, 94, 94) and answer counts (0, 0, 16, 0, 93); bold leads split correctly including `**Lead:**` and `**Lead**` forms; links and emphasis are cleaned; `A:` lines never become nodes; re-root at `2.3` of the Wise AI tree yields the node with 3 children; a fidelity test that `lead + ' ' + cont` or `text` equals the cleaned source line for every node.

### 3. Measurement and wrapping (`src/measure-node.js`, `src/measure-browser.js`, `src/wrap.js`)

Node measurer: load the two OTFs with opentype.js, `measure(text, size, weight)` = sum of advance widths × size / unitsPerEm with kerning; cache. Browser measurer: canvas `measureText` after `document.fonts.ready`. Wrap: greedy at width, balanced to the narrowest width keeping the line count with a floor of 0.72 × width (spec 5). Tests: wrap of a known sentence at 340 px gives the expected lines; balanced never changes line count; Node and browser measurers agree within 1.5% on 20 sample strings (browser test runs through the PNG script's Chrome, skipped if Chrome is absent).

### 4. Layout (`src/formats.js`, `src/layout.js`)

Port and clean `layoutOnce`, `budget`, the fill pass, `scaled` (grow to fill) and the flextree call from `prototypes/lib/tree.js`, and the grow loop from `prototypes/lib/app.js`, into `layout(tree, opts, measure) → {nodes, mapW, mapH, colX, scale, format}` with `opts = {format, theme, view, labels, depth, root, hue, kickers, moreWord}`. Formats hold every number from spec sections 2–5 (sizes, wraps, lh, gaps, strokes, shelfOver, trunk, sib, cousin, floors, budgets). Implement the candidate rule from spec 13 (extra 0.5 lh before a childless node that follows a sibling with visible children) behind an option, default on, and check it on the Q2 card. Tests: for every example × format × view at default depth, no overlaps (bounding boxes incl. markers), `mapW ≤ avail` on fixed canvases, root centred on its children within 1 px, grow-to-fill picks 1.15 for the Wise AI cover, all-or-none marker wording holds.

### 5. SVG drawing (`src/draw.js`)

Port `branchPath`, the trunk, shelves, text, markers and frame from the prototype's `draw`. Output a complete SVG string with `@font-face` base64 fonts, real `<text>`, `data-num` on nodes and branches, `data-theme`, and a `<metadata>` block carrying the render options and fold state (so an SVG can be re-rendered or opened as a state). Golden tests: render each example at each format in each theme; compare to `test/golden/*.svg` byte for byte (regenerate with `UPDATE_GOLDEN=1`); assert fonts embedded, only two families used, every source label present verbatim.

### 6. PNG (`scripts/png.js`)

Write the SVG into a minimal HTML, screenshot with headless Chrome at the canvas size and `--force-device-scale-factor` 1 or 2 (`--scale`); fall back to Playwright chromium when present; clear error when neither exists. Acceptance: `render … --png` produces a PNG of exactly W×H (× scale); the Wise AI cover PNG renders with Apfel (check a glyph width via the metrics the script prints, or by eye).

### 7. Interactive HTML (`src/interactive.js`, `src/bundle.js`)

Self-contained page: fonts, vendored flextree, bundled layout/draw/measure-browser, the tree JSON, and the page script (port and tidy `prototypes/lib/app.js`): fold/unfold on click or tap (44 px targets), controls (theme, view, labels, depth, expand, collapse, outline/map) in one compact bar, collapsed behind one button under 640 px; outline mode under 640 px (spec 8); state in the URL hash; `prefers-reduced-motion` respected if a transition is added. Acceptance: open `examples/wise-ai-questions.md` rendered with `--html`; at 1400 px it shows root + 2 levels, clicking "+N" unfolds, hash updates; at 390 px (Chrome floors the window at 500 px: test through an iframe or Playwright) the outline shows with no horizontal scroll; a hash state rendered by the CLI (`--state '#depth=1'`) equals the 4:5 cover layout.

### 8. Self-checks (`src/check.js`)

Implement spec section 9 as `check(layoutResult, source) → {ok, errors[], warnings[], metrics}` with the remedies text. Report printed by the CLI and written as `<out>.report.json`. Tests: an over-deep render of the DAM tree at 4:5 warns on floor and budget; a synthetic overlapping layout errors; the Wise AI 16:9 branch slide passes clean.

### 9. CLI (`bin/render.js`)

`tree-render <tree.md|json> --format 4x5|1x1|16x9|web --theme paper|garden|slate --view questions|qa|answers --labels full|lead --depth N --root 2.3 --kicker … --footer … --out path [--png] [--scale 2] [--html] [--state '#…']`. Subcommands: `carousel` (cover + one branch card per level-1 node, numbered files, kicker "Qn of N", branch hue inherited), `check` (report only). Exit code 1 on a hard check failure. Acceptance: the command lines in `docs/design/mockups/index.html`'s captions can be reproduced; `carousel` on the Wise AI tree writes 5 PNGs that pass checks.

### 10. Golden renders and the review page

A script `scripts/review.js` that renders the standard set (the mockup set in `docs/design/mockups/`, from `examples/` plus `test/fixtures/wise-ai-*-leads.md` copied from `prototypes/data/`) into `skills/tree-render/examples/` with an `index.html` like the mockups page. Acceptance: the page opens and every image passes checks; the three best images match or beat `docs/design/mockups/` by eye (reviewer looks at them).

### 11. Skill (`SKILL.md`, `README.md`)

SKILL.md: when to use (a question or hypothesis tree to share or think with; not flowcharts, not LTP trees); the workflow (convert the source to the Markdown format, add bold leads where labels are long, choose format and view from the brief's table, run `tree-render`, read the report, look at the PNG, fix at the source, never in the output); the cold-read test; attribution footer; what to do when a render is over budget (carousel, re-root, leads). Install by symlink into `~/.claude/skills/` (and the agent-skills convention). Acceptance: a fresh agent following SKILL.md produces the Wise AI cover and carousel from `examples/wise-ai-questions.md` within the brief's 15-minute budget.

### 12. Housekeeping

Update `README.md` (what lives where), add a changelog entry (feature shipped: renderer + skill + mockups), remove or mark `prototypes/` as superseded (keep for history until the skill passes task 10), file Beads for the open items in spec 13 and Open for Rufus. No commit or push unless the orchestrator asks.

## Order and parallelism

1 → 2, 3 (parallel) → 4 → 5 → 6, 7, 8 (parallel) → 9 → 10 → 11 → 12. Tasks 2 and 3 can start from the prototype code at once; task 7 should wait for 5 so the browser bundle and the static output share one draw module.

## Acceptance for the whole

- The brief's done-check holds: cover + 4 branch cards (4:5), cover slide + 4 branch slides (16:9) and one foldable web page from `examples/wise-ai-questions.md`, with no hand placement, all passing checks; the same for `wise-ai-answers.md` in `answers` and `qa` views.
- `node --test` green; golden renders stable across two runs.
- A theme swap (edit `themes.js`) changes colour, stroke and numbering only; goldens for geometry (a test that strips colour attributes and compares paths) stay identical.
