# Coggle tree measurements

Measured 2026-11-11 from the originals in this folder, using pixel scans (stroke thickness runs, glyph cap heights, line pitch) and zoomed crops. Sizes are in image px. The web3 images are about 1x Coggle output; the tao and iMED images are scaled differently, so compare ratios, not px. Arial/Helvetica-like text throughout: font size is cap height / 0.716, or line pitch / 1.15.

## Primary subject: web3 evaluation tree (1800x936)

| Factor | Root | Level 1 | Level 2 |
|---|---|---|---|
| Font size | 24 px (pitch 28) | 21 px (pitch 24, cap 15) | 21 px for most, 18 px (cap 13, pitch 21.5) in dense sibling sets |
| Ratio to parent | 1 | 0.86 | 1.0 (or 0.86) |
| Weight | regular | regular | regular. No bold in this image |
| Text colour | #383838 on a #b4b4b4 grey box | dark shade of the branch colour (see below) | same dark shade as level 1 |
| Stroke width | n/a | 19 px at the root end, 14 px at the junction (taper about 0.7 over the run) | 12-13 px along the run, then a chevron tip about 10 px long |
| Stroke / text size | | 0.65-0.9 em | 0.6 em |
| Horizontal run | root edge to junction about 615 px (29 em) | | junction to tip about 80 px (4 em); text starts about 12 px (0.5 em) after the tip |
| Wrap | about 35 chars (500 px, centred in a box) | right-aligned, about 38 chars (415 px, 20 em) | left-aligned, about 50 chars (470 px, 22 em) |
| Sibling spacing | | 2 to 4 lines of space between branches, set by the taller subtree | single lines: pitch 43 px = 2.4 em (gap of about 1.2 em between lines); two-line items: gap about 22 px = 1 em between blocks |

Colour per branch (stroke fill, text): pink #e096e9 / #7c3386, blue #7aa3e5 / #2e5081, teal #67d7c4 / #317266, green #9ed56b / #506e32. The stroke is a light pastel and the text is the same hue darkened (about 45% lightness, lightness of stroke about 70%). Everything under one L1 branch inherits its colour (L2 stroke, L2 text). Root box is neutral grey. Text is coloured, not black.

Curve shape:
- L1 trunk: leaves the root exactly horizontal, then an S-curve; the bend is not at the midpoint but late (about 60-70% of the run) for strong rises and drops (pink, green), with a long horizontal approach into the junction (about 60-100 px). Near the junction the stroke is perfectly horizontal.
- L2 fan: a bracket / curly-brace shape. From the junction the branches run horizontally about 20 px, then turn vertically at about x = junction + 40 px (the vertical run is the shared "spine"), and flatten again for about 25 px before the tip. Each tip is exactly horizontal. The middle child continues straight. Radius of the bend about 25-30 px, roughly 1.3 em.
- Junction is notched: a small white chevron cut where the parent ends and the children begin, and the parent end has a pointed (arrow) tip. The child strokes also end in a pointed chevron.

Where the branch meets the text:
- L2 (and every leaf): the branch ends with its tip about 10-12 px (0.5 em) before the left edge of the text, at the vertical centre of the first line (the x-height middle). It does not run under the text and does not touch it. For multi-line items the tip lines up with line 1, not the block centre.
- L1: the label is right-aligned and sits just before the junction, immediately above or below the last horizontal stretch of the trunk (a 4-10 px gap), not on it. Where another branch's curve passes through the label (blue crossing "i.e. how would", green crossing "background"), the line runs under the text: this is the case Rufus dislikes, and Coggle does it when branches are crowded.

## web3 taxonomy tree (1800x2393)

Same grammar, different sizes. Root 22-24 px; L1 labels 21 px (one emphasised label 22 px), L2 leaves 18 px (pitch 21, ratio 0.86). Branch stroke at the L1 end about 14 px; L2 stroke about 9-10 px with the tip. Leaf rows: single-line pitch about 40 px (2.2 em) between leaves and 3-line items run to about 66 px. Fans of up to 7 leaves: the spine is one shared vertical curve with leaves peeling off it; the first and last leaves have a wider arc. Wrap about 60 chars (470 px, 26 em at 18 px). A bold word inside regular text ("at **scale**") exists, but only as inline emphasis.

## iMED issue tree and hypothesis tree (3660x1706; 3256x2000)

Four levels. Text widths per char (Arial about 0.5 em per char): root 7.4, L1 5.5, L2 4.7, L3 4.2 display px per char, so font ratios are about 1 : 0.74 : 0.64 : 0.57, step about 0.86 per level from L1 on. Root pitch 41 px, L3 pitch 30 px at full size (ratio 0.73).

| Factor | Value |
|---|---|
| Stroke width (full-res px) | root start about 20, L1 trunk 18-31 (thicker where it is vertical), junction 11-18, L2 15-17, L3 15-16 near the tip, then a chevron. Almost constant stroke across levels while text steps down. Stroke / text about 0.65 em at L1 and L2. |
| Horizontal run per level | root to L1 junction about 26 em (of L1 type); L1 to L2 junction about 11 em; L2 to L3 tip about 13 em. First hop is long, later hops are about 12 em, which leaves room for the label. |
| Wrap | root about 30-40 chars; L1 about 22-25 chars; L2 right-aligned about 25 chars; L3 about 55-60 chars. |
| Text | sentence case questions in the issue tree; statements in the hypothesis tree. No bold. Text coloured per branch as in web3. |
| Colour | red #e88a8a family, magenta, indigo-purple, blue, again stroke light and text dark. |
| Where branch meets text | L3 tip about 8 px before text, at line 1 centre. L2 labels sit right-aligned just before the L2 junction and above or below the trunk line; some L2 labels (for example "Are access better..." ) sit above a line that continues, which is the "label on top of the line" variant. |

## Other Coggle trees (scans from the tao and public captures)

- tao 2019 issue tree: type 12-13 px for L1 right-aligned labels (yellow trunk 9 px at the root, 8 px at the junction, 5-6 px at L2 tips, about 0.5 em of the 11 px text). L2 gap between siblings pitch 26 px at 11 px text (2.3 em). Root box grey #b3b3b3 with centred text. Right-aligned L1 labels end 4-8 px before the junction and sit slightly above or below the trunk end.
- tao v3 tree (right side): three text sizes. L1 labels 14 px, L2 leaf 13 px, root 13 px. Stroke 12-13 px at the L1 end, 6 px at L2 tips (taper about 0.5 from L1 to L2). Leaf pitch 22 px = 1.7 em: tighter than web3, still readable.
- decision-making (public): leaves in one clean column, text 8-9 px, label directly at the tip centre line, stroke about 1 em thick at each tip; leaf pitch about 2.7 em.
- trees (public): all bold lead + regular tail, one colour, tips at first-line centre, 10-20 leaves in a single column: shows the structure survives dense fans.
- Should-we-do-X template: labels sit on top of the branch line; branches end in arrow tips; text sits above the stroke not left of the tip. This is the version where the branch does run beneath its label. Rufus' "branch under text" objection applies here.

## Key ratios to carry into the design

- Font step: about 0.86 per level (root 1, L1 0.86, L2 0.75 or 0.86 again in dense sets). Root 24 : L1 21 : L2 18-21.
- Stroke about 0.6-0.7 em of the adjacent text, tapering about 0.7 from the start to the end of a trunk; leaf stroke about 0.5 of the trunk it hangs off in sparse trees, about equal in dense ones.
- Sibling leaf pitch: 2.2-2.4 em (gap about 1.2 em); between sibling groups the gap is about 1 line more.
- Tip to text: 0.5 em, at the first-line vertical centre. Fan run: about 4 em from junction to tip, vertical turn at about 2 em.
- Colour: one hue per L1 branch, stroke at about 70% lightness (pastel), text at about 30-45% lightness of the same hue.
- Wrap at about 22 em for leaf text (50-60 chars at 18-21 px) and about 20 em for right-aligned L1 labels.
- Bold appears only as a lead (public "trees" diagram) or as user styling for large headings: not a default Coggle feature.

## Best two non-Coggle references

1. d3 tidy tree (Observable). Values from the screenshot and the d3 example's usual settings (not remeasured from source): labels 10 px sans, one size for all depths; node dots about 2.5 px; links hairline grey about 1.5 px at 40% opacity; S-curve links with the bend at the midpoint (linkHorizontal: control points at the mid x); leaf pitch 10 px = 1 em (very tight, no wrapping); internal labels sit left of the node on the parent side with a white halo (3 px) so lines can pass under text; leaves sit right of the node. Takeaway: a text halo is the Tufte-style fix for lines running under text, and one text size works when structure carries the hierarchy.
2. OneZoom. Branches taper strongly by depth: trunk about 120 px at the root, second-level arms about 60-75 px (about 0.55-0.6), third level about 20-25 px (about 0.4 of the second). Curvature stays smooth and arms always leave tangent to the parent. No text on the branch: labels go in discs at nodes, and colour is used only as grey plus photos. Takeaway: taper per level (about 0.5-0.6) is what makes a tree look like a tree; Coggle's taper is much gentler (about 0.7 along a trunk, about equal across levels).

The Hug et al. tree of life is a third useful reference for line weight only: even 1 px lines with colour per clade.
