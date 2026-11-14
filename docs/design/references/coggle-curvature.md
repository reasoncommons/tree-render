# Coggle's curvature: what makes the branches look right, and a rule that keeps it when the tree is narrower

Research note, 2026-11-14. Numbers from Coggle's own exports (`coggle-extract/*.dom.json`, the real SVG paths) and from `out/curves/analyse.py`; pictures in `out/curves/sheet-fan.png` (seven branches, 260 px labels), `sheet-fan200.png` (same, 200 px labels), `sheet-list.png` (17 bands), `sheet-list25.png` (25 bands); rows cut out in `out/curves/crops/`. Regenerate with `node out/curves/sheet.mjs`, then `node skills/tree-render/render/scripts/png.js out/curves/sheet-fan.svg --out out/curves/sheet-fan.png`. The branch formula itself is in `coggle-spec.md` ("Control points"); this note is about why it looks good and how to shorten the run without losing that. Implemented 2026-11-14 as `--root-run short`, the default (see "As implemented" at the end).

## The invariant, in three sentences

A Coggle branch is one cubic that leaves and arrives horizontally, and in units of its own run dx its control points reach a = 0.7 + 0.08 r from the start and b = 0.5 + 0.3 r back from the end, r = dy/dx. Because both reaches grow with the rise, the tightest bend radius stays near a third of the run on both corners (0.27–0.48 dx at the root end, 0.32–0.46 dx at the label end, for r from 0.25 to 3) and the two corners stay within 1.6× of each other up to r = 2.3: a steeper branch does not get a tighter corner, it gets a longer near-vertical stretch in the middle. So the look is set by the run the S is drawn over, not by the rise; a narrower tree keeps it if the S is drawn over a run that is still about 25 stroke widths long (≈ 240 px at Coggle's sizes) and the rest of the way to the label is a straight horizontal tail.

## What Coggle draws

Formula (left-to-right branch; dx, dy the absolute differences): c1 = start + (max(0.08 dy + min(0.7 dx, 600), 16), 0); c2 = end − (max((dx + min(0.6 dy, 1200)) / 2, 8), 0); both control points at the y of their own end, so both tangents are horizontal. Below the caps (dx < 857, dy < 2000) this is a = 0.7 + 0.08 r, b = 0.5 + 0.3 r in units of dx. The control points are always crossed (a + b = 1.2 + 0.38 r) and the crossing grows with the aspect: that is what makes the middle steep and both ends flat.

Measured from the real exports:

| diagram | branch | stroke | dx | dy range | r range | a + b |
|---|---|---|---|---|---|---|
| web3 taxonomy (live) | root → level 1 | 9.19 | 338 | 42 … 791 | 0.12 … 2.34 | 1.25 … 2.09 |
| web3 taxonomy | level 1 → leaf | 8.45 | 46 | 0 … 225 | 0 … 4.8 | 1.1 … 3.0 |
| web3 evaluation | root → level 1 | 9.19 | 428 | 78 … 250 | 0.18 … 0.58 | 1.27 … 1.42 |
| public "trees" | root → level 1 | 9.19 | 39 … 102 | 80 … 328 | 2.0 … 3.1 | 2.0 … 2.4 |

Coggle's root curves run from flat to a little past vertical (r 2.3); its leaf fans go far past it (r 4.8); one formula for both. The short-branch pull-in (chord under 75 px) only affects leaves.

## Characterisation of the family

Unit curve dx = 1, dy = r; c1 = (a, 0), c2 = (1 − b, r). Midpoint = the curve at t = ½ (the steepest point is within 0.013 dx of it; y is symmetric in t, x is not). Rmin1, Rmin2 = the tightest radius of curvature on each half and where it sits; R0, R1 = the radius at the two ends (R0 = 1.5 a² dx²/dy, R1 = 1.5 b² dx²/dy). Departure = the angle of the chord from the start to the point at x = ¼ dx. Steep zone = where the slope is over 45°.

| r | a | b | midpoint x | max slope | steep zone x | Rmin1 (at x) | Rmin2 (at x) | Rmin2/Rmin1 | departure | inflection y/dy |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.25 | 0.72 | 0.58 | 0.55 | 36° | – | 0.48 (0.47) | 0.41 (0.67) | 0.86 | 3° | 0.54 |
| 0.5 | 0.74 | 0.65 | 0.53 | 59° | 0.45–0.63 | 0.36 (0.42) | 0.32 (0.67) | 0.89 | 6° | 0.53 |
| 1 | 0.78 | 0.80 | 0.49 | 78° | 0.34–0.65 | 0.33 (0.31) | 0.34 (0.67) | 1.03 | 11° | 0.50 |
| 1.5 | 0.82 | 0.95 | 0.45 | 86° | 0.28–0.64 | 0.31 (0.25) | 0.39 (0.67) | 1.23 | 16° | 0.47 |
| 2 | 0.86 | 1.10 | 0.41 | 90° | 0.25–0.61 | 0.29 (0.21) | 0.43 (0.66) | 1.46 | 20° | 0.45 |
| 2.34 | 0.89 | 1.20 | 0.38 | 91° | 0.24–0.60 | 0.28 (0.19) | 0.46 (0.65) | 1.62 | 22° | 0.44 |
| 3 | 0.94 | 1.40 | 0.33 | 94° | 0.22–0.56 | 0.27 (0.17) | 0.51 (0.62) | 1.92 | – | 0.43 |
| 4 | 1.02 | 1.70 | 0.25 | 96° | 0.20–0.50 | 0.25 (0.15) | 0.60 (0.58) | 2.38 | – | 0.41 |

Lengths in units of dx. What the table says:

- The tightest radius is about dx/3 on both corners and nearly independent of the rise. Doubling the rise does not halve the radius. The eye reads the corner radius, and the run sets it. (The end radii R0, R1 are larger still: 0.9 dx at r = 1, 0.5 and 0.9 dx at r = 2.3; the curve is flat where it meets the root and the label.)
- The label-end corner is pinned at x ≈ ⅔ dx for every aspect; the root-end corner slides towards the root as the rise grows (0.47 → 0.15 dx), and the midpoint with it: x_mid/dx = 0.575 − 0.0825 r, exact. In a fan this nests the strands: taller branches rise nearer the root, inner ones further out, so a long list fans into a sheaf, not a trunk (`sheet-list.png`, row 1).
- The curve leaves the root nearly flat: the first-quarter chord is 3° at r = 0.25, 11° at r = 1, 22° at r = 2.3. The bend is in the middle of the run, never at the root.
- The maximum slope is not bounded: it rises smoothly to vertical at r ≈ 2.1 (a + b = 2) and a little past it. Past the vertical the midpoint moves backwards (back-bulge 0.014 dx at r = 2.5, 0.04 at r = 3, 0.10 at r = 4, 0.16 at r = 4.8). Under half a stroke it is invisible; Coggle's leaf fans at r 4–5 show it as the slight back-lean of the outermost leaves.
- The inflection sits at the middle of the rise (y/dy 0.54 → 0.41) and the two halves are near mirror images up to r = 2.3 (peak-curvature ratio 0.9–1.6). Neither half is a hook.

## How Coggle lays out a long list (web3 taxonomy)

- All the root's children share one junction column (dx = 338 for every branch). Junctions are not staggered; nesting comes from the curves.
- The label column starts only 79 px right of the root edge (dx = 11 + T + max(40, 0.22 T), labels right-aligned 9 px left of the junction, up to 350 px wide), so every S passes through sibling labels: the pink, green and yellow spines climb through "Overcome wicked problems …" and "Just want to make money …". Coggle accepts the crossing and softens it with the text halo. Our layout refuses crossings; that, not the curve, is what forces our trees wide.
- Run against spread: half the spread is 791 px over a run of 338 (r 2.34), corners ≈ 0.28 × 338 ≈ 95 px. In the evaluation tree (r ≤ 0.58) the same formula gives gentle curves over 428 px, corners ≈ 150 px. Both are "Coggle" because corner radius : run is the same.
- Vertical packing is independent of the curve (leaves 15 px apart, bands centred on the junction). Coggle never adds vertical room to let a curve pass a label.

## Why our "middle" looks wrong

`ROOT_RUNS.middle` draws one cubic over the whole run with a = 0.45 (raised until the first-quarter chord is 45°) and b = 1. In the same terms (unit dx = the whole run):

| r | a (after cap) | Rmin1 (at x) | Rmin2 (at x) | Rmin2/Rmin1 | steep zone x | departure | inflection y/dy |
|---|---|---|---|---|---|---|---|
| 0.5 | 0.45 | 0.17 (0.17) | 0.35 (0.35) | 2.0 | 0.19–0.36 | 32° | 0.35 |
| 1 | 0.48 | 0.19 (0.13) | 0.49 (0.49) | 2.6 | 0.16–0.47 | 45° | 0.37 |
| 2 | 0.59 | 0.20 (0.09) | 0.47 (0.72) | 2.4 | 0.15–0.62 | 45° | 0.40 |

- The root corner is tighter than Coggle's (0.17–0.20 dx against 0.28–0.36) and sits at the root (x 0.09–0.17 dx against 0.2–0.4); the first-quarter chord is pinned at 45° where Coggle's is 6–20°. That is the spoke the eye picks up.
- The label-end corner is 2–2.6× broader than the root corner (Coggle 0.9–1.6) and lands far out: a hockey stick with a soft landing, inflection at 35–40 % of the rise instead of the middle, and a long straight diagonal between (steep zone 0.15 → 0.5–0.6 dx) where Coggle has a short near-vertical at the centre.
- It is not Coggle at any width: a = 0.45, b = 1 is a fixed shape, so the hook is there even at dx 520 (`sheet-fan.png`, row 2, column 1).
- The intent was right: with 260 px labels the climb has to happen before the label column. The mistake was to do it inside one cubic. Shrinking the departure reach while leaving the arrival reach alone redistributes the curvature; Coggle's proportions survive only if both reaches shrink together, which means drawing the whole S over a shorter run. The rejected "fan" (a = 0.05) was the same error taken further.

## The rule

A curve family that is Coggle's at any run length, and a layout rule for choosing the run length. It applies to any sibling group; in practice only the root's children trigger it. Leaf fans (the 54 px leaf run) stay as they are.

### Curve: Coggle's S over an S-run, then a straight tail

For a branch with run dx and rise dy and an S-run dxs with 0 < dxs ≤ dx:

1. Lengthen for very tall branches: dxs_i = min(dx, max(dxs, dy/3)), so r = dy/dxs_i ≤ 3 whenever the run allows (above r = 3 the back-bulge passes half a stroke).
2. One cubic from `start` to `start + (dxs_i, ±dy)` with Coggle's control points computed for (dxs_i, dy): c1 = start + (max(0.08 dy + min(0.7 dxs_i, 600), 16), 0), c2 = (start.x + dxs_i, end.y) − (max((dxs_i + min(0.6 dy, 1200)) / 2, 8), 0). Short-branch pull-in unchanged.
3. If dxs_i < dx: a straight horizontal line from the S-run's end to `end`. The cubic arrives horizontal with an end radius of at least 0.9 dxs_i, so the join is tangent-continuous and the curvature step is invisible at a 9–11 px stroke. The label rides on this tail as it rides on Coggle's flat arrival.
4. Only when dy/3 > dx (a branch taller than three times the whole run, i.e. a very long list at a width that will not take step 1): take the r = 3 curve for dxs (a = 0.94, b = 1.40, rise 3 dxs); it has vertical tangents at t = 0.316 (x = 0.367 dxs, y = 0.710 dxs) and t = 0.592 (x = 0.314 dxs, y = 1.91 dxs). Keep the piece before the first and the piece after the second, scale the second piece horizontally by (1 − 0.367)/(1 − 0.314) = 0.92 about the S-run's end so it starts at x = 0.367 dxs, shift the second piece up by dy − 3 dxs, and join them with a vertical line at x = 0.367 dxs from y = 0.710 dxs to y = dy − 1.09 dxs (length dy − 1.8 dxs). Both joins are tangent-continuous and the back-bulge is gone. Every branch past r = 3 then shares the spine x = 0.367 dxs, so these strands overlap into a trunk (`sheet-list25.png`, row 3, column 2); that is the price of the width, and why step 1 is the default.

With dxs = dx this is Coggle's formula unchanged, so wide trees are untouched.

### Layout: one junction column, one S-run per sibling group, with a floor

1. Junction column as now, shared by all children of the group (Coggle's rule plus whatever the collision search adds). No staggering: it breaks the one-column reading and does not reduce width.
2. One S-run dxs per group, shared by its branches (one turning zone; the strands nest by the drift above). Per-branch S-runs clear the same labels but the bundle reads worse (first sheets, not kept).
3. Floor: dxs ≥ 25 w, w the group's stroke width (Rmin ≈ 0.28 dxs ≥ 7 w): 230 px at Coggle's 9.19 px stroke, 275 at an 11 px stroke; call it 240 at Coggle's sizes. Hard minimum 22 w (200 px). Coggle's own root curves have Rmin ≈ 10–13 w. Rendered (200 px labels, `sheet-fan200.png`): S-run 335 and 270 look like Coggle, 270 a little brisk; 205 (dx 320) is plumbing: the outer two stems run within a stroke of each other and the label-end corners are elbows. With 260 px labels (`sheet-fan.png`): 425 and 305 are Coggle; 240 (dx 400) is the narrowest I would still call it, and the outer pairs are already close enough to read as a brace rather than a fan.
4. Clearance: the group's dxs is the largest value ≤ dx at which no branch, drawn by the curve rule, comes within w/2 + 4 px of anything in a sibling's subtree (its label, its leaves, its deeper labels: the existing `clashes()` test in `layout.js`, sampling cubic + line). Step down from dx in 5 px steps.
5. Search: the clearing dxs is monotone in dx (labels move right with the run while the S stays at ≤ dxs), so do not add dxs as a fourth search dimension. Run the existing search (band gap × interior wrap × extra run) with dxs fixed at the floor, keep the cost as it is (span + bandHeightCost × growth in height + bandWrapCost × wrap given up; keep `middle`'s 0.08 / 0.2 and its `minWrap` and `orphanBreak`, they are independent of the curve), and then, for the winning arrangement only, raise dxs from the floor until it stops clearing. The "still crossing" fallback stays as the last resort.
6. Width floor: dx ≈ dxs + T + 9 − u, where u is how far the label-end corner may overlap the label column given the vertical clearance to the next label. Rendered: with 3-line labels 170–190 px apart and 260 px labels the fan clears at dx 400 (S-run 240) and not at 360; with 200 px labels it clears at 360 (270) and not at 320 unless the floor drops to 205; the 17-band list with 200 px labels clears at 400 (265) and not at 340. Estimated from those: about 410 with 260 px labels, 360–370 with 220, 350 with 200 (root edge to junction).
7. Code touchpoints: a branch becomes a cubic plus a line (plus a vertical in step 4), so `branchControlPoints` / `branchPath` return segments; `collide.js`'s control-hull quick reject, the bounds hull in `layout.js` and `draw.js` all assume one cubic today. `ROOT_RUNS` goes: `coggle` is the rule with dxs = dx, `middle` and the 45° cap are deleted.

### When the floor would force spokes

When the width budget is below the width floor, do not bend tighter. In order: wrap the group's interior labels narrower (each 20 px of label is 20 px of width, down to the style's minimum); open the band gap (height is cheap in our portrait layouts and raises u); accept the width; and only if a hard width must be met, let the branch cross the top-left corner of the sibling label under the halo, as Coggle does, as an explicit option that is off by default. Never a departure reach under 0.7 dxs, an arrival reach over 1 dxs with a short departure, staggered junctions, or a curve whose shape depends on anything but r.

## How narrow, honestly

- S-run ≥ 300 px (r ≤ 2.3, Coggle's own taxonomy): indistinguishable from Coggle. Rendered at dx 440 with 260 px labels and dx 400 with 200 px labels.
- S-run 240–270: still Coggle, brisker; the recommended floor. Rendered at dx 400 (260 px labels) and dx 360 (200 px labels) for a fan of seven, dx 400 (200 px labels) for 17 bands.
- S-run ≈ 200: a bracket bundle with horizontal pipes. Rendered at dx 320 with 200 px labels. Long lists survive this better than small fans because the sheaf hides the individual corners.
- Below that there is no Coggle-looking answer without crossing labels. Coggle's answer to narrowness is to cross them under a halo; ours should be narrower labels or more width, not tighter curves.
- Very long lists (25 bands, 200 px labels): lengthening the outer S keeps the sheaf but needs dx 520; at dx 400 the vertical insert clears, with the outer strands sharing one spine. Treat the insert as the least-tested part of the rule.
- For q3 (five bands, 260–280 px labels, dx ≈ 370 in the current "middle" render): the rule will want roughly 30–40 px more run or a 220 px wrap for the level-1 labels. That is the price of Coggle's corners; the alternative that keeps 370 is the halo crossing.

## Files

- `out/curves/analyse.py`: the curvature tables (pure Python).
- `out/curves/sheet.mjs`: the sheets. Rows: Coggle's formula over the whole run; current "middle"; the rule (shared S-run, floor 240); the rule at floor 200. Each panel is annotated with its S-run, maximum r, and whether it clears; a label box turns red when another branch crosses it.
- `out/curves/sheet-fan.png` (dx 520 / 440 / 400 / 360, 260 px labels), `sheet-fan200.png` (dx 400 / 360 / 320 / 280, 200 px labels), `sheet-list.png` (17 bands, dx 520 / 460 / 400 / 340, 200 px labels), `sheet-list25.png` (25 bands, dx 520 / 400: Coggle, the rule, the vertical insert); rows in `out/curves/crops/`.

## As implemented (2026-11-14)

The rule above, with three changes found by rendering real trees (`out/curvature/`):

- **Lengthening is per group, not per branch.** Step 1 of the curve (dxs_i = max(dxs, dy/3) per branch) crosses the strands of a long list: a longer S rises more slowly off the root (a larger homothetic copy of the r = 3 curve lies below the smaller one near the start), so each lengthened outer strand dips under its inner neighbour. The group's S-run is instead raised once, to max(dxs, tallest dy / 3), capped at the run; one S-run for all strands keeps Coggle's nesting.
- **The vertical insert's spine moves with the rise.** With the spine at 0.367 dxs for every branch past r = 3, those strands sit right of the r ≈ 3 strands' steep middle (0.33 dxs) and cross them. The spine is at 0.314 dx · √(3 dx / dy) instead (the departure piece scaled horizontally about the start to meet it, the arrival piece about the end), so taller strands rise nearer the root. Still the least-tested part: none of the rendered trees reaches it.
- **Fallback for a label that does not move with the run.** A leaf of the root sits beside the root box, where a short S climbs; if no arrangement clears with the S-run at the floor, the search runs again with Coggle's S over the whole run.

The floor scales with the level-1 text size and with Coggle's stroke for the group's level, not the style's stroke, so `coggle-thin` draws the same curves. `--s-run N` forces the root group's S-run (at least the floor) and pushes its junctions out to fit it.


## Review of the real renders (2026-11-14)

On real trees the 240 floor failed: with aspect around 1.3–1.5 the steep branches read as near-vertical pipes with two tight corners (q3's outer branches, web3's pink branch, Q2's blue and teal running side by side). The floor is now 320 px at Coggle's sizes (about 35 root strokes). At 320 the curves read as Coggle's S; S-run 400 is indistinguishable from Coggle's own. v0.1 Q2 is 1034 px wide at the default against 1196 with Coggle's full run (14% narrower).
