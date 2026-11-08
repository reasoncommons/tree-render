# Tree visuals: analysis and design spec

**Draft: direction pending Rufus's pick.** The geometry, layout, type and behaviour below are proven in the prototype and shared by all three directions; section 7 (themes) is the only part that changes if Rufus picks a different direction or a blend from the mood board and directions page being prepared separately. Written 2026-11-07/08 by the design session, from the [brief](2026-11-07-tree-visual-brief.md), the [research note](../research/2026-11-07-tree-design-research.md), the v0.1 archive (lessons, not code) and the renders in [mockups/](mockups/index.html). Every number here is one the prototype (`prototypes/`) actually renders with.

## 1. Lessons from the archive and the prototype

- The v0.1 maps (`archive/v0.1/planning/trials/mindmap/q2-mindmap.png`) were "okay, not yet good" for three reasons: monochrome 1.3–2.4 px hairlines that vanish in a feed; labels rewritten by hand (and drifting); and column layout that left a third of the canvas empty. The fixes: branches 3–10 px in a hue per top-level branch; short forms only from the author, as a bold lead; and column widths budgeted from the canvas, with slack given back to columns that wrap.
- Coggle's three moves that make it loved (from product use, and now confirmed by the prototype): the text sits on its branch (the line runs under the label and the children spring from the line's end), one hue per top-level branch inherited by its sub-tree, and S-curves that leave and arrive horizontally. Its garishness is a palette and weight problem, not a geometry problem, so the geometry is kept and the colour is a theme.
- Sentence nodes are the central difficulty (Buzan assumed keywords). The answer is not shortening but a label with two parts: a bold lead and its continuation, shown together when there is room and lead-only when not.
- Formats have hard budgets. Measured on the Wise AI tree: a 4:5 cover holds root + 4 branches with full question text at 30–36 px; a 4:5 branch card holds about 18 nodes with lead-only leaves at 27 px; a 16:9 slide holds one branch of about 18 nodes at 27 px, or the whole top two levels (26 nodes) only by dropping to 20 px. Beyond that the renderer must say so, not shrink silently.
- The sharing-vs-thinking conflict in the LTP breaks if the share image is a saved, folded state of the same layout as the web view. The prototype does this: `render.mjs --format 4x5 --depth 1` and the interactive page at depth 2 are the same layout code with a fold set and a canvas size. (Still a recommendation for Rufus; see Open for Rufus.)

## 2. Geometry

Coordinates are canvas px; the root is at the left margin, children to the right. Every node has a text block (top-left at `(x, top)`, width `w` = widest line, height `h`) and a **shelf**: a horizontal run of its branch under the block.

- **Shelf position.** `shelfY = top + h + 0.26 × lastLineSize`. Lifting the text off the line by a quarter of the type size is what makes the line read as a branch under the text rather than an underline (cold-reader finding).
- **Shelf length.** `shelfLen = w + markerW + over`, where `markerW` is any "+N" marker's overhang past the widest line and `over` = 12 px (1080/1920 canvases) or 10 px (web). The shelf therefore always ends 12 px past everything in the block. It ends in a semicircle of the shelf's half-width.
- **Branch curve.** From the parent's shelf end `P0 = (xp + shelfLen(p), shelfY(p))` (plus the trunk run for the root) to the child's shelf start `P1 = (xc, shelfY(c))`: cubic Bézier with control points `C1 = (x0 + 0.55·dx, y0)` and `C2 = (x1 − 0.55·dx, y1)`, `dx = x1 − x0`. Horizontal tangents at both ends; k = 0.55 gives the river-tributary look without the near-vertical bunching the archive warned about.
- **Taper.** The branch is a filled ribbon, not a stroke. Width runs linearly from `w0` at the parent end to `w1` at the child end, then the shelf is drawn at `w2 = 0.85 × w1`. `w1 = stroke[depth]`, `w0 = stroke[depth − 1] × (0.75 if depth = 1, else 0.9)`. Build the outline by sampling the curve at 28 points and offsetting along the normal by ± width/2; close with the shelf's rounded end.
- **Stroke table** (`stroke[d]`, d = 0 is the root trunk): 1080-wide canvases `[10, 6.5, 4.5, 3.2]`; 1920-wide `[10, 6.5, 4.5, 3.2, 2.4]`; web `[6, 4, 2.8, 2, 1.6, 1.4]`. Multiply by the theme's stroke factor (section 7) and by √(type scale) when the type is grown to fill (section 4). Deeper than the table: use the last value.
- **Opacity by depth** (fill-opacity on the ribbon): theme-defined, default `[1, 1, 0.9, 0.8, 0.7, 0.7]`.
- **Root trunk.** The root has no incoming branch; its shelf is drawn in ink at `stroke[0]`, length `shelfLen(root) + trunk` with `trunk` = 36 px (1080/1920) or 24 px (web), rounded end. All depth-1 branches leave from the trunk's end point. The run before the fan is what makes it read as a trunk (cold-reader finding).
- **Horizontal gaps** `gapX[d]` between column d's right edge and column d+1's left edge: 1080 `[128, 60, 52]`; 1920 `[160, 68, 60, 50]`; web `[96, 48, 44, 40, 40]`. The root gap includes room for the trunk and the fan; deeper gaps are just the curve's run.

## 3. Layout algorithm

1. **Parse** the tree (section 10). Optionally re-root at a node (a branch card); optionally prune at a depth, recording on each cut node `hidden` = the number of descendants folded away.
2. **Build text blocks** (section 5) with a text measurer (Node: opentype.js on the embedded fonts; browser: canvas `measureText` with the same fonts). Each block is a list of lines `{text, size, weight, colour, baselineY}`; `w` = max line width, `h` = sum of line heights.
3. **Column budget.** `avail = W − 2·margin − 16`. With `D` visible levels (root = level 0), gaps `Σ gapX[0..D−2]`, `free = avail − Σgaps`, weights `root 1.0, level 1 1.15, deeper 1.3`: `wrap_d = clamp(free × weight_d / Σweights, 0.8 × nominal_d, 1.5 × nominal_d)` where `nominal_d` is the format's wrap for that level (section 5). Fluid (web) canvases skip this and use the nominal wraps.
4. **Columns.** `colWidth_d = max over nodes at depth d of (w + markerW + over + (trunk if root))`; `x_0 = 0`, `x_d = x_{d−1} + colWidth_{d−1} + gapX[d−1]`.
5. **Vertical placement** with d3-flextree (van der Ploeg's non-layered tidy tree, O(n)): `nodeSize = [h + lh × g, 1]` where `lh` is the node's line height (font size × line-height of its level) and `g` = `cousin` at depth 1, `sib` otherwise; `spacing(a, b) = 0` for siblings, `lh × (cousin − sib)` otherwise. Format values: 4:5 and 1:1 `sib 0.45, cousin 1.0`; 16:9 `sib 0.35, cousin 0.85`; web `sib 0.45, cousin 0.9`. Flextree returns each node's breadth centre; `top = centre − h/2`. Parents are centred on their children by the algorithm; the root is therefore centred on the whole map.
6. **Fill pass** (fixed canvases, up to two rounds): if `avail − mapW ≥ 30`, give the slack to the columns whose nodes wrapped, in proportion to their total line count, by widening those levels' `wrap`; re-run steps 2–5 and keep the result if it is no wider than `avail` and no taller than before.
7. **Fit.** `scale = min(1, availW / (mapW + 16), availH / mapH)` where `availH` excludes the kicker band (2.2 × kicker size) and footer band (2.4 × footer size). The map is left-aligned at the margin and vertically centred in the remaining space.
8. **Grow to fill** (fixed canvases): run steps 2–7 with all type sizes × 1.3, then × 1.15, then × 1; keep the first whose fit scale ≥ 0.995. Strokes scale by √k. This is what lifts a sparse cover from 31 px to 36 px.
9. **Variable-height labels** need no special handling beyond step 5: flextree takes each node's own breadth, so a three-line node simply occupies more of the column than a one-line sibling, and cousins never collide. A node is never split across columns; nothing is ever moved by hand.

## 4. Formats

| Format | Canvas | Margin | Depth default | Type floor (effective px) | Budget at scale 1 |
|---|---|---|---|---|---|
| `4x5` | 1080 × 1350 | 64 | cover: root + 1; branch card: root + 2 with lead-only leaves | 30 cover, 26 branch card | about 8 nodes full text, 18 with leads, about 450 characters |
| `1x1` | 1080 × 1080 | 64 | as 4:5 | as 4:5 | about 6 / 14 nodes |
| `16x9` | 1920 × 1080 | 72 | root + 2 | 26 | about 20 nodes, about 900 characters |
| `web` | fluid (SVG sized to content, page scrolls) | 32 | root + 2 open, rest folded | 15 | the whole tree |

Below the floor the renderer still produces the image (scaled to fit) but reports `minFont < floor` with the remedy: open one level less, use lead labels, re-root at a branch, or split into a carousel.

## 5. Type and text

One family, two weights: Apfel Grotezk Regular (R) and Mittel (M), OFL, embedded as base64 `@font-face` in every SVG and HTML. Sizes are canvas px at type scale 1; `wrap` is the nominal wrap width before the budget (section 3.3); `lh` is line height as a multiple of size.

| Level | 4:5 and 1:1 | 16:9 | web |
|---|---|---|---|
| Root | 46 M, wrap 300, lh 1.12 | 48 M, wrap 340, lh 1.12 | 26 M, wrap 220, lh 1.15 |
| Level 1 | lead 38 M / cont 31 R, wrap 340, lh 1.22 | 36 M / 30 R, wrap 400, lh 1.22 | 19 M / 17 R, wrap 260, lh 1.3 |
| Level 2 | 31 R, wrap 380, lh 1.25 | 27 R, wrap 560, lh 1.25 | 17 R, wrap 280, lh 1.3 |
| Level 3 | 27 R, wrap 380, lh 1.25 | 25 R, wrap 480, lh 1.25 | 16 R, wrap 280, lh 1.3 |
| Level 4+ | as level 3 | 24 R, wrap 420 | 15 R, wrap 280 |
| Answer / kicker text | 26 R, lh 1.28, muted | 25 R, lh 1.28 | 15 R, lh 1.32 |
| "+N" marker | 0.72 × the level's text size, M, in the branch hue | same | same |
| Frame kicker / footer | 24 / 22 R, muted | 24 / 22 | 14 / 13 |

- **Root size is adaptive**: try the root size, then × 0.87, × 0.76, × 0.68, and take the first at which the root wraps to 5 lines or fewer. (The Wise AI root question needs 46 → 40 on a 4:5; a 230-character root answer needs 31.)
- **Weight per level is uniform**: the root and depth-1 labels are Mittel; depth 2 and deeper are Regular; a lead is Mittel only when its continuation follows it. Never mix weights across siblings.
- **Baselines**: within a block, line i's baseline is at `y_i + (lh − 1)/2 × size + 0.78 × size` where `y_i` is the running top; the block height is the sum of `size × lh`. (Top-aligned, so descenders stay inside the block and the shelf clears them.)
- **Wrapping**: greedy at the wrap width, then balanced: binary-search the narrowest width that keeps the same line count, but never below 0.72 × wrap, so columns still fill (CSS `text-wrap: balance` with a floor). Never break inside a word.
- **Answers** wrap at `min(1.05 × level wrap, 30 × answer size)`: about 60 characters a line, since paragraph text needs a measure.
- **Text is never shortened, truncated or paraphrased** by the renderer. In lead-only mode a lead that ends with "," or ";" gets "…" (the sentence goes on); a lead that ends with ":" loses the colon; a lead that ends with "?" or "." stands as is. Hedges and qualifiers stay (v0.1 lesson).

## 6. Views, answers, depth and the fold marker

- **Views** of one source: `questions` (default for `kind: question`): the question is the node. `answers` (default share view for `kind: qa` / `hypothesis`): the answer is the node, in the level's text weight; the root's question is a muted kicker above the root answer; other nodes' questions are not shown on static canvases and are shown on demand in the web view (`kickers: all` renders them as a muted line above the answer). `qa`: the question is the node and its answer runs beneath in muted Regular at the answer size, with a gap of 0.4 × answer size; a `qa` node without an answer is simply a question. Unanswered questions in `answers` view fall back to showing the question.
- **Depth**: a render opens the tree to a depth (root = 0). Cut nodes get a fold marker. Defaults per format in section 4. Re-rooting at a node (`--root 2.3`) makes that node the root of the card; it keeps its top-level ancestor's hue so a carousel ties back to its cover.
- **Fold marker ("+N")**: `+N` where N is the count of descendants hidden under the node, set in Mittel at 0.72 × the node's text size, in the branch hue, placed on the last line's baseline 0.6 × marker size after the line's end; the shelf extends under it. On covers (depth 1) the marker spells the noun, `+21 questions` (`points` for hypothesis trees), if every marker on the image fits within 1.15 × its column's wrap; otherwise all markers are bare `+N` and the footer starts with the key `+N: questions folded beneath  ·  `. All-or-none, never mixed. In the web view the marker is the fold control and needs no key.
- **Frame**: a kicker line top-left (project and what the image is, e.g. "Wise AI briefing · question tree · Q2 of 4") and a footer line bottom-right (author or team, status, date, optionally URL), both in muted type. Nothing else decorative. The root is the title; no separate heading.
- **Carousel**: a cover (root + level 1) plus one branch card per level-1 node (re-rooted, root + 2 with lead-only leaves), all in the same theme; the kicker carries "Qn of N".

## 7. Themes (the part that changes with Rufus's pick)

All three share everything above. A theme is: background, ink, muted, six hues (used in order for the depth-1 branches, cycling after six; a re-rooted card inherits one), optional darker text hues, a stroke factor, a numbering flag, and the opacity-by-depth list. Text is ink; answers, kickers and the frame are muted; hue appears only on branches, shelves and fold markers, with one exception noted for Garden.

| | Paper (recommended default) | Garden | Slate |
|---|---|---|---|
| Reading of the feel | an editorial diagram on good paper | Coggle's pleasure, held in check | an engineer's dark board |
| Background | `#FBF8F2` | `#FFFFFF` | `#16181D` |
| Ink / muted | `#1F1C18` / `#6F6962` | `#1A1A1A` / `#7A7A7A` | `#ECEAE4` / `#9A978F` |
| Hues 1–6 | `#C0583A` rust, `#2F7F8B` teal, `#7A8F3E` olive, `#8B5A9E` plum, `#B8862B` amber, `#4D6BAA` blue | `#F2545B`, `#F6A21E`, `#2BB673`, `#2F8BE6`, `#9B5DE5`, `#F15BB5` | `#F28B6E`, `#5EC4C0`, `#A8C65A`, `#C59BE8`, `#F0C05A`, `#6FA8F5` |
| Text hues (lead text on multi-hue overviews only) | none (ink) | `#D63640`, `#B87000`, `#1E8A54`, `#1F6CBE`, `#7A3FC4`, `#C92F8F` | none (ink) |
| Stroke factor | 1.0 | 1.35 | 1.0 |
| Opacity by depth | `[1, 1, .9, .8, .7, .7]` | `[1, 1, 1, .95, .9, .9]` | `[1, 1, .9, .8, .7, .7]` |
| Numbering | off | off | on: `2.1`, `2.1.1` as a prefix in the label, skipped when the label already starts with a number or `Qn` |
| Where it is strongest | covers, hypothesis view, slides | covers for a general audience | dark feeds, engineering decks; the lines glow and never read as underlines |
| Known weakness | can look quiet on a bright feed | amber text hue is at the contrast limit; the six hues read as a stock palette | numbering costs width (a 4:5 branch card drops to 0.81 scale) |

Rules for a blend or a new theme: six hues of similar lightness (so none shouts), none yellow on white, chroma capped (Okabe-Ito-like); ink text, hue on lines only; text hues, if any, must pass 4.5:1 on the background; stroke factor between 0.9 and 1.4.

## 8. Interactive behaviour (web format)

- One self-contained HTML file: fonts, d3-flextree, the layout module and the tree inlined; no network.
- The page renders the same layout as the static output, with a **fold state**: a set of folded node ids plus an open depth (default 2). Click or tap a node's label or marker to fold or unfold; the layout re-runs and the SVG is replaced (a 300 ms transition on node positions is optional and must not block). Fold targets are at least 44 × 44 px on touch.
- Controls: theme, view (`questions`, `qa`, `answers`), labels (`full`, `lead`), open to depth, expand all, collapse all. The state is mirrored in the URL hash (`#theme=paper&view=qa&depth=2&fold=2.3,3.4`) so a state can be shared and, in the CLI, rendered as a static image: a share image is a saved fold state.
- Under 640 px viewport width the page shows an **outline** instead of the map: an indented list with a left rule in the branch hue, the same fold controls, lead in Mittel, answers in muted; an "outline / map" button forces the map (which then scrolls horizontally). The phone outline is the accessible view and the fallback for screen readers (the SVG text is real text as well).
- Text is never shortened in the web view; lead-only mode is a choice.

## 9. Self-checks the renderer must run (and report as JSON)

1. **Overlap**: no two text blocks (including markers) intersect; no block intersects a branch ribbon other than its own shelf and the curve arriving at it. Hard failure.
2. **Overflow**: `mapW × scale ≤ availW` and `mapH × scale ≤ availH`; nothing drawn outside the canvas (frame included). Hard failure.
3. **Type floor**: smallest effective font (size × scale) ≥ the format's floor; otherwise a warning with the remedy list (section 4). Also report the phone-equivalent size (× 390/1080) for 4:5 and 1:1.
4. **Budget**: node count and character count on the canvas against the format's budget; warn when over.
5. **Fidelity**: every label in the output equals the source text after Markdown cleaning (links to their text, emphasis markers removed, whitespace collapsed), as lead + continuation or lead alone; no other transformation. Test by diffing.
6. **Fonts embedded**: the SVG contains both `@font-face` rules and uses only the two families.
7. **Markers**: all-or-none wording; footer key present when bare.
8. **View sanity**: in `answers` view, report nodes without answers; in `qa`, report answers longer than 8 lines.

## 10. Input format

The examples' Markdown, unchanged, plus one convention:

- An H1 title; optional `kind: question | qa | hypothesis` and `source:` lines; then nested `-` bullets with two-space indent; the first bullet is the root.
- `- A: …` as the first child of a question is its answer or hypothesis; it is not a node.
- **Bold lead**: `- **Risk and pace:** given existential risk…` marks the first words of the sentence as the short label. The lead must open the sentence (rewrite the sentence if it does not); the renderer never invents one. The lead shows alone in lead-only mode (punctuation rules in section 5). Trees without leads render fully; they hold fewer nodes per card.
- Markdown cleaning: `[text](url)` → text; `*emphasis*` and `**bold**` elsewhere in the line → plain; whitespace collapsed. Emoji and status markers in the source are kept (they are the author's).
- Rejected alternative: a separate `short:` field or `Short | Full` syntax. One syntax, readable in any Markdown viewer, and no duplicated text.
- JSON input: the parsed tree (`{title, kind, source, root: {text, lead, cont, answer, children}}`) is accepted as an alternative input.

## 11. Decisions

- Left-to-right, root left, text on the branch, no boxes: settled by Rufus (2026-10-17) and confirmed by the renders; nothing else carries the "mindmap" reading.
- Branches as tapered filled ribbons, 10 → 3 px, one hue per top-level branch: the single biggest legibility gain over v0.1's hairlines; colour tracks a branch without following a line.
- Text lifted 0.26 em off its shelf, shelf ends 12 px past the block with a round end, trunk runs 36 px before the fan: the three changes that stopped lines reading as underlines (cold-reader critique).
- Column widths from a canvas budget plus a fill pass, not fixed wraps: removes the empty right third that v0.1 had.
- Bold lead as the only short-label syntax: no renderer paraphrase, no drift, readable in a doc.
- Type grows to fill a sparse canvas (×1.15 or ×1.3) rather than scaling the SVG: keeps strokes and gaps in proportion.
- Formats have budgets and the renderer warns below the floor rather than refusing: a working draft is more useful than an error, and the author decides.
- Hypothesis view = answer as node, root question as kicker, per-node questions on demand: showing both everywhere doubles the text and kills the card.
- A re-rooted branch card keeps its overview hue: a carousel then reads as one thing.
- Phone = outline, not a shrunken map: a 94-node map at 390 px is unusable; the outline keeps colour and fold.
- Three themes as three readings of one feel, differing only in colour, stroke and numbering: a blend is a table edit, not a redesign.
- d3-flextree for vertical placement (vendored, MIT, 9 KB): variable node heights are the whole problem and it solves them in linear time; everything else is hand-written.
- Node, not Python, for the renderer: the layout must run identically in the browser, and opentype.js gives exact glyph metrics for the embedded fonts.

## 12. Open for Rufus

1. **The injection "one source, two outputs": the share image is a saved, folded state of the same layout as the thinking view.** Recommendation: adopt it. The prototype shows the same layout code producing the 4:5 cover (depth 1), the branch cards (depth 2, lead-only) and the foldable web view; the only differences are canvas size and fold state. It breaks the LTP's sharing-vs-thinking cloud without a second design. If rejected, the formats still work; they just stop being one artefact.
2. **Default theme.** Recommendation: Paper, because it is the one that reads as "editorial" at a glance and the one the team would put in front of readers unprompted; Garden for a general social audience, Slate for engineering decks. This is exactly the choice the mood board and directions page are being made for, so this spec's section 7 is written to be swapped.
3. **Adopt the bold-lead convention in the source trees** (starting with the Wise AI question tree, whose strand questions already carry natural leads "Alignment", "Risk and pace"…). Recommendation: yes; it is a five-minute edit per tree, and without it the 16:9 overview and the 4:5 branch cards fall below the type floor.

## 13. What still looks weak

- The 4:5 cover's continuation text sits at 30 px (11 px on a phone): legible, not generous. A cover with shorter strand questions, or lead-only strands at 48 px, would be bolder; that is an authoring choice.
- The 16:9 whole-tree overview (26 nodes) is at 20 px. It is over budget by design; the honest slide is one branch per slide.
- Where a childless branch follows a branch with children (Q2's "So: …" under "What do wisdom traditions offer here?"), the two still sit close; the shelf separates them but an extra half line of air would help. Candidate rule: add 0.5 × lh when a node's previous sibling has visible children and it has none.
- The `qa` view with paragraph answers (rebrand tree) is a document wearing a tree; it scales to 0.66 on 16:9. The budget check will say so; the plan keeps `qa` for the web and small sub-trees.
- Leaf shelves have a ragged right edge (they end 12 px after each label). It is deliberate (equal shelves read as a table) but a critic read it as untidy; worth one more look once a direction is chosen.
- The prototype's interactive toolbar looks like a developer tool; the real one should be a single compact bar, hidden behind one button on phones.
- Only question trees with answers have been tested; a true assertion tree with supporting assertions is still to be found.
