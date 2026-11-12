# Coggle, exactly: the extracted drawing rules

Extracted 2026-11-11 from live public Coggle diagrams, to implement `--style coggle-exact` (`skills/tree-render/render/src/coggle/`). Everything below is measured, not guessed: each rule was read from Coggle's DOM or its JavaScript bundle and then checked against the numbers in the DOM. The tests in `test/coggle.test.js` assert the rules against those numbers.

## How it was extracted

- **Coggle draws SVG, not canvas.** The diagram is one big `<svg class="pannable">` holding the branches (`g.node-connection`, nested parent → child), with the labels as absolutely positioned HTML `div.node-container` elements on top. The root's grey box is a small `svg.shapebackground` inside the root's label div (so it paints over the branch starts).
- Opened with Playwright (Chromium 1234, headless, 2×) and dumped every branch `<path>` (raw `d`, fill, stroke, stroke-width, transform), every label's classes, inline style and computed font, colour, size, line height, alignment and boxes, the root shape and the CSS. Files: `coggle-extract/*.dom.json`.
  - `web3eval.dom.json`: https://coggle.it/diagram/Yh-L7j5DfRykGi7e (the web3 About-page tree; the primary subject).
  - `taxonomy.dom.json`: https://coggle.it/diagram/YnpnzQ8o3JWk-DSu (web3 taxonomy).
  - `trees.dom.json`: https://coggle.it/diagram/W4huaYdcxhdzTB9z (bold lead + regular tail).
  - `shouldx.dom.json`: https://coggle.it/diagram/aPf98LuztF7nllZj (Coggle's own template; deeper levels, label shapes).
  - `web3eval-live.png` / `.json`: a clean 2× screenshot of the live web3 diagram (page chrome hidden, background white), with the root centre in CSS px; the reference for the comparison page.
- The formulas were then found in Coggle's bundle (`static.coggle.it/assets/web-main.*.js`): the connection module (path, tail, tip), the connection-geometry module (`bezierCPForConnection`, `connectionParameters`), the node model (`lineWeight`, `textColour`, `textSizeForLevel`), the colour helpers (`darken`, palette) and the layout constants (`nodeBox`, the auto-arrange constants). Coggle's code is not copied into this repo; the rules are restated here and reimplemented.
- Tools used: `coggle-extract/tools/extract.mjs` (DOM dump) and `capture.mjs` (clean screenshot); they need `playwright-core` and a Playwright Chromium.

## Branches

- **One stroked cubic Bézier per branch, constant width.** No ribbon, no taper along a branch: `fill="none"`, `stroke-linejoin="round"`, butt caps. What reads as taper is the step down in width from one level to the next, plus the tail and tip shapes.
- **Width by level** (level of the node the branch arrives at, root = 0): `w = max(2, (18 × 0.91^level + 2) / 2)`, so 9.19, 8.4529, 7.7821, 7.1717 … px.
- **Start and end.** From the root: `xf = shape width / 2 + 2` (the root box's right chevron tip + 2), `yf = 0`. From any other node: `xf = −1` relative to that node's junction. The branch ends `tailLength(w) + 3` px short of the child's junction, where `tailLength(w) = 4.54688 w / 6`.
- **Control points** (left-to-right; `dx`, `dy` the absolute differences between start and end):
  - `c1 = start + (max(0.08 dy + min(0.7 dx, 600), 16), 0)`
  - `c2 = end − (max((dx + min(0.6 dy, 1200)) / 2, 8), 0)`
  - Both have the same y as their end point, so the branch leaves and arrives **horizontally**: a full S with one inflection, bending one way and then the other. `c1` reaches further than `c2` is pulled back, so the bend comes late and lands flat.
  - Short branches (chord under 75 px): both control points are pulled towards their own end point by `i = 1 − 1 / (d⁴ / 390625 + 1)`, `d` the chord length. This is what gives the tight, rounded little forks at the leaves.
  - Check: web3 root branch `M 193 0 C 512.6468 0 331.9361 -250.2725 621.0357 -250.2725`; leaf branch `M -1 0 C 31.7378 0 16.1320 -25.005 45.2943 -25.005`. The formulas give exactly these.
- **Tail** (at every branch start): a block `w` tall and `tailLength(w)` long with a V notch cut into its back (`M 0 −w/2  L n 0  L 0 w/2  L n w/2  L n −w/2 z`), placed at `x = xf + 1 − n`. At a junction the incoming branch's tip nests into the V of the outgoing tails: that is the chevron look.
- **Tip** (at every branch end): an arrowhead `t = w − 0.3` tall and `0.75811 t` long, overlapping the line by 0.2 px (`M −0.2 −t/2  0.1 −t/2  0.75811t 0  0.1 t/2  −0.2 t/2`), placed at the branch end − 0.01.
- **Paint order:** per branch tail, tip, line, then that node's child branches (nested groups), in creation order. Labels and the root box are above all branches.

## Colour

- **Palette** (Coggle's default, in order): `#7aa3e5` blue, `#67d7c4` teal, `#9ed56b` green, `#ebd95f` yellow, `#efa670` orange, `#e68782` red, `#e096e9` pink, `#988ee3` purple. Each child of the root takes the next palette colour (Coggle offsets the start by a hash of the diagram id).
- **Below level 1**, a child takes its parent's colour with a small random walk: hue ± up to 9/256 of a degree (nothing), saturation and lightness ± up to 6/256 each. So siblings differ very slightly (`#db8de6`, `#dd8fe8` under `#e096e9`). Ours uses the same walk with a seeded PRNG, so renders are deterministic.
- **Text colour = the branch colour darkened:** in HSL, keep the hue, saturation × 0.7, lightness × 0.5. Example: branch `#e096e9` → text `#82348c`; `#7aa3e5` → `#2e4e81`; `#67d7c4` → `#2f7065`; `#9ed56b` → `#4f6f31`. Every label is its own branch's colour, so text colour varies node by node exactly as the branches do.
- **Root:** box fill `#d0d0d0`; its text is the box colour with saturation × 0.4375 and lightness × 0.3125 (`darken(c, 1.6)`) = `#414141`.
- **Background:** white in Coggle's PNG export (the live page uses `#fafafa`).

## Text

- **Font:** `font: 14px Helvetica, Arial, sans-serif` on every label; weight 400; bold user text is `<strong>` at 700 in the same colour. No web font is loaded. Coggle's PNG export renders it as Liberation Sans (Arial metrics). We use **Arimo** (Google Fonts, SIL OFL 1.1, no Reserved Font Name; metric-compatible with Arial and Liberation Sans), vendored in `skills/tree-render/fonts/` with its licence. Measured against the DOM's own text widths, Arimo matches to within 0.03% on every unwrapped label, so lines break in the same places.
- **Size by level:** 17, 15.3, 13, 12 px (then 12). A node may override it (Coggle's per-node `text_size`; the web3 author set several leaves to 15.3 and 13.8).
- **Line height:** CSS `normal`, which Chrome computes as the font's ascent, descent and line gap each rounded to whole pixels: 13 px → 15, 15.3 → 18, 17 → 20, 12 → 14.
- **Wrapping:** a label is as wide as its one line, up to 350 px of text; longer text wraps (greedy, by word) at 350 px. Padding 9 px all round (the label box is the text + 18).
- **Halo:** labels of nodes that have children get `text-shadow: 0 0 6px <background>` four times, so a branch passing under them fades out around the letters. Leaves and the root have none. Ours: an SVG filter (Gaussian blur σ 3 of the glyph alpha, alpha → 1 − (1 − a)⁴, flood background); calibrated against Chrome's own text-shadow on the same probe (equal within 1%).

## Labels relative to the junction

A node's position is its junction: where its branch arrives and its children's branches leave.

- **Leaf:** left-aligned; text starts 4 px right of the junction (box at −5, padding 9) and is vertically centred 1 px above it. The tip ends about 7.5 px before the first letter.
- **Node with children:** right-aligned; text ends 9 px left of the junction. It sits on the side away from its parent: if the node is above its parent's junction (`y ≤ parent y + 1`) the text's bottom is 9 px above the branch line; if below, the text's top is 9 px below it. So the label rides on top of (or under) the last, horizontal stretch of its own branch.
- **Root:** centred in the grey box. Box = a rectangle the size of the text + 18 wide and text + 12 tall, corner radius 2.5, with a 7 px chevron (half-base 4.9) at the middle of each side; overall `max(80, content + 14)` × `content + 8`.

## Spacing (auto-arrange)

- **Leaves** sit `54 + 0.02 × h` px right of their parent's junction (`3 × xSpace` with `xSpace = 18`, plus `0.02` × the tallest sibling leaf's text height): 54.3 for one-line 13 px leaves, 54.7 for two-line 15.3 px leaves, 55.06 for a three-line sibling. Exact in the web3 tree.
- **Nodes with children** sit `xf + 11 + T + max(40, 0.22 T)` px right of the parent's junction, `T` the widest label among those siblings, `xf` where the parent's branches start (root: shape half-width + 2; others −1). Siblings share one column. Web3: 193 + 11 + 350 + 77 = 631, exact; taxonomy: 540.7, exact.
- **Vertical:** siblings stack top to bottom with **15 px** between any two text boxes (of the two subtrees) that overlap horizontally (`ySpace = 15`); the children's whole text extent is then centred on the parent's junction (exact at level 2 in all four web3 subtrees).
- Coggle's other auto-arrange constants (for reference): `xSpaceMultiplier 1.22`, `minLine 40`, `xSpaceHeightFactor 0.02`, `rootYSpace 30`, `leafLineMin 36`, `leafLineMax 90`, `arrowGap 5`, `lineGap 15`.

## Our deviations: taller than wide, and branches never cross labels

Pages and phones are narrow but tall, so our default favours height over width (Rufus, 2026-11-12, after the web3 taxonomy reference `coggle-web3-taxonomy.png`): interior labels wrap at 260 px, leaves at 300 px and the root at 260 px (Coggle: 350 for all), and siblings that include an interior node sit 30 px apart (Coggle: 15). Leaves among themselves keep 15 px. Typical Wise AI trees come out about square to portrait (e.g. q3 1252×1304 px) instead of landscape (1329×894).


Coggle lets a branch run straight through a sibling's label: interior labels sit right-aligned just left of their junction, across the right-hand part of the span, while the S-curves of siblings further up or down climb through the middle of it (the white halo only softens this). Our layout (`render/src/coggle/layout.js`, check in `render/src/coggle/collide.js`) avoids it, per sibling group and only where Coggle's own arrangement collides:

- **Check:** a branch collides with a label when any point of its centre line comes within `w/2 + 4 px` of the label's text box (4 px ≈ the halo). A branch never counts against its own node's label.
- **Fix:** search over the gap between siblings (30, 45 … 260 px), the wrap width of the group's interior labels (260 down to 160 px in 20 px steps) and extra horizontal run before the interior junctions (in 5 px steps); for each gap and wrap take the least run that clears, and keep the arrangement with the smallest horizontal span + 0.2 × growth in height + 3 × px of wrap given up. So a pixel of width costs five of height, and narrowing a label (which makes it a ragged 5–7 line block) is a last resort. More vertical room and a longer run let the S-curves pass the labels.
- Branch shape, widths, colours, fonts, leaf placement and every other spacing rule above are unchanged.
- **Off switch:** `coggleLayout(tree, T, { avoidCollisions: false })` or the CLI's `--allow-collisions` reproduces Coggle's layout, wraps and gaps included (pinned comparisons, `test/golden/coggle-web3-eval-original.svg`); a `pin` turns avoidance off too.

## What we could not pin down

- The saved layouts are older than Coggle's current auto-arrange (which launched 2026-11-07), and their vertical gaps vary by about ±1 px around 15 (16 in web3's teal fan, 14 in the taxonomy), and the root's children are not centred by any rule that fits both diagrams (text-extent mid −5.5 px in web3, −15 px in taxonomy). We use 15 px and centre the text extent. Result: in the web3 tree our junctions sit 4.5–11 px lower than Coggle's (x is exact).
- Creation order (paint order of overlapping branches at the root) is not in the text; we paint in tree order.

## Appendix: raw samples (web3 evaluation tree)

Root branch group (pink), as in the DOM:

```
<path d="M 0 -4.595 6.9643 0 0 4.595 6.9643 4.595 6.9643 -4.595 z" transform="translate(187.0357,0)" fill="#e096e9" stroke="none"/>
<path d="M -0.2 -4.4450 0.1 -4.4450 6.7396 0 0.1 4.4450 -0.2 4.4450 " transform="translate(621.0257,-250.2725)" fill="#e096e9" stroke="none"/>
<path fill="none" stroke-linejoin="round" stroke-width="9.19" d="M 193 0 C 512.6468 0 331.9361 -250.2725 621.0357 -250.2725 " stroke="#e096e9"/>
```

Its first child (leaf), nested in a `<g class="node-connection" transform="translate(631,-250.2725)">`:

```
<path d="M 0 -4.2264 6.4057 0 0 4.2264 6.4057 4.2264 6.4057 -4.2264 z" transform="translate(-6.4057,0)" fill="#db8de6"/>
<path d="M -0.2 -4.0764 0.1 -4.0764 6.1808 0 0.1 4.0764 -0.2 4.0764 " transform="translate(45.2843,-25.005)" fill="#db8de6"/>
<path fill="none" stroke-linejoin="round" stroke-width="8.4529" d="M -1 0 C 31.7378 0 16.1320 -25.005 45.2943 -25.005 " stroke="#db8de6"/>
```

Root shape (`svg.shapebackground` 382 × 226, viewBox −191 −113):

```
M -184,4.9 L -191,0,-184,-4.9,-184,-103.5 A 2.5,2.5,0,0,1,-181.5,-106 L -4.9,-106,0,-113,4.9,-106,181.5,-106 A 2.5,2.5,0,0,1,184,-103.5 L 184,-4.9,191,0,184,4.9,184,103.5 A 2.5,2.5,0,0,1,181.5,106 L 4.9,106,0,113,-4.9,106,-181.5,106 A 2.5,2.5,0,0,1,-184,103.5 Z   fill #d0d0d0
```

Computed styles:

| Label | Classes | Font | Colour | Align | Text box (w × h) |
|---|---|---|---|---|---|
| Root | `shape lr-center tb-middle root` | Helvetica, Arial, sans-serif 17px/normal 400 | rgb(65, 65, 65) | center | 350 × 200 (10 lines) |
| "What are the core high level …" (level 1, above) | `lr-left tb-top haschildren` | 15.3px/normal 400 | rgb(130, 52, 140) | right | 350 × 54 |
| "What key background ideas …" (level 1, below) | `lr-left tb-bottom haschildren` | 15.3px/normal 400 | rgb(47, 112, 101) | right | 350 × 18 |
| "What is an inventory …" (leaf) | `lr-right tb-middle` | 15.3px/normal 400 | rgb(124, 51, 134) | left | 350 × 36 |
| "What computer science?" (leaf) | `lr-right tb-middle` | 13px/normal 400 | rgb(46, 111, 99) | left | 143.08 × 15 |

Relevant CSS (main.css): `.node-container{font:14px Helvetica,Arial,sans-serif}`, `.node-content{padding:9px; word-wrap:break-word}`, `.lr-left{text-align:right}`, `.lr-right{text-align:left}`, `.lr-left.tb-top .node-content{right:0; bottom:0}`, `.lr-left.tb-bottom .node-content{right:0; top:0}`, `.lr-right.tb-middle .node-content{left:-5px; top:-1px; transform:translateY(-50%)}`, `.lod-1 .node-container.haschildren:not(.shape) .node-content{text-shadow:0 0 6px var(--c-bg) ×4}`.
