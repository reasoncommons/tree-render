---
title: "Tree design research: mindmap tools, issue trees, information design, sharing and interaction"
created: 2026-11-07
extends: [archive/v0.1/planning/research-prior-art-design.md, archive/v0.1/planning/research-prior-art-arguments.md]
---

# Tree design research (2026-11-07)

Layout is decided: left-to-right mindmap, root on the left, branches curving right, text on or beside the branch. This note extends the v0.1 prior-art notes (pillar-poster, no node-link) and mostly argues against their verdict on layout, while keeping their text discipline. Sources are linked inline. Evidence quality varies and is flagged: web search turned up almost nothing primary on Coggle's visual design (its blog at bloggle.coggle.it returned 403 to fetches), so Coggle observations below are marked **[from product use, unverified]**.

## Where this disagrees with v0.1

- v0.1 rejected mind maps and node-link trees as "software diagram / brainstorm" looks. The rejection holds for boxed, arrowed, equal-weight trees and for radial maps. It does not hold for a left-to-right tree with text on soft tapered branches: that is what the Coggle/MindNode family does well, and the issue-tree slide convention is also left-to-right. v0.1's own pattern list (colour per pillar, text on a single soft connector, no boxes) already describes it.
- v0.1 said "two levels per image maximum". Keep that as the default for the *social* format, but the web/phone format should hold the whole tree via collapse (section 6). Tufte's two-level point is about slides read linearly, not a navigable map.
- v0.1 recommends HTML/CSS plus headless Chromium. Fine for posters; for a mindmap the layout is a tree algorithm with measured text, so the renderer should compute geometry itself (d3-flextree, section 4) and emit SVG with real text.

## 1. Coggle: why it is loved, and what to keep

Primary evidence is thin. Coggle's homepage lists "control line style" and "control line paths" as paid features, free "auto-arrange branches", floating annotations, 1,600+ icons, but gives no defaults ([coggle.it](https://coggle.it)). Reviews call the palette "very attractive" and the interface clean and colourful, but note a limited colour count on the free plan, restricted font and shape customisation, and fiddly auto-placement on large maps ([Capterra](https://www.capterra.com/p/162678/Coggle/reviews/), [TechRadar](https://www.techradar.com/pro/coggle-flowchart-and-mind-mapping-tool-review)). A Coggle post titled "More Colours!" says clicking any branch opens a colour wheel ([bloggle.coggle.it](https://bloggle.coggle.it/post/139246659232/more-colours-our-awesome-and-organistion-plans), via search snippet only). In Oct 2025 the team said its old homepage was "too green" ([bloggle.coggle.it](https://bloggle.coggle.it/)). Everything else is observation of the product:

- **Branch shape [from product use, unverified].** Branches are smooth S-curves (cubic Béziers) leaving the parent horizontally and arriving horizontally, so siblings fan out like river tributaries rather than elbow connectors. Lines are visually heavy near the root and lighter further out; text sits on the line as a short run, with no box.
- **Colour [unverified].** Each top-level branch gets its own colour from a fixed palette and its whole sub-tree inherits it; the root is neutral. This is the single biggest legibility win: the reader tracks a branch by colour without following a line.
- **Typography [unverified].** One sans face, mostly one size, with depth carried by line weight and position rather than type scale. Labels are short, centred or left-aligned on the line, wrapped at a modest width.
- **Collapse [unverified].** Branches can be folded, and a folded branch shows as a small marker at its tip.
- **Why "garish":** saturated mid-tone hues at full strength, thick lines, a white canvas, bright red/orange/green/blue adjacent, and all depths equally loud. The colour budget is spent evenly, so nothing is quiet.
- **Calmer variant that keeps the good parts:** keep S-curve branches, colour-by-top-branch, no boxes, text on the line. Change: lower chroma and mid-high lightness hues (muted Okabe-Ito-like), warm off-white background, line weight and opacity falling with depth, near-black text (colour only on the line and a small marker), and a hairline neutral for the deepest level.

The general Buzan rules transfer partly. Nottingham's summary lists curved lines ("straight lines are dull"), colour, images, and one keyword per line ([Nottingham](https://www.nottingham.ac.uk/nursing/sonet/rlos/placs/critical_reflection/other_methods/mindmaps_steps.html)). Curves and colour stay; **one keyword per line is exactly what we must break**, since our nodes are sentences. That is the central design problem: Buzan's form assumes a keyword, so any sentence-capable variant needs a wrap width, a type scale and a depth-limiting rule that Buzan never needed.

## 2. Other tools, for sentence-length argument nodes

Review sites yielded almost nothing on text wrapping, so judgements below are partly inference from documented features; verify by testing.

| Tool | Useful for us | Weak for us |
|---|---|---|
| **markmap** (markdown to d3 SVG) | Open source; options include `maxWidth` (default 0 = unlimited), `spacingHorizontal` 80, `spacingVertical` 5, `paddingX` 8, `initialExpandLevel`, `duration` 500, `fitRatio` 0.95, colour per branch from d3 `schemeCategory10` with `colorFreezeLevel` ([JSON options](https://markmap.js.org/docs/json-options), defaults read from `markmap-view` 0.18 source on jsDelivr) | Default palette is the garish rainbow; uniform thin lines; text wrapping depends on `maxWidth` set manually; looks like a dev tool |
| **Mermaid mindmap** | Text source, `colorBy: branch` by default, markdown strings with automatic text wrapping, optional tidy-tree layout ([docs](https://mermaid.js.org/syntax/mindmap)) | Marked experimental; shapes are boxy; themes limited; not a publishing aesthetic |
| **MindNode / Xmind / MindMeister** | Polished themes, branch colours, folding | Reviewers mention layout limits (MindNode horizontal only) and shape customisation, nothing on long text ([G2](https://www.g2.com/products/mindnode/reviews)); designed for keyword nodes |
| **Miro mind map** | Collaborative | Users request per-node text size and better autoscaling to text ([Miro community](https://community.miro.com/ideas/edit-the-text-size-of-mind-map-nodes-individually-6346)) |
| **Heptabase / Obsidian canvas / Excalidraw** | Cards hold long text; spatial thinking | Heptabase mind map nodes default to single-line, and a user reports "a huge amount of tiny text at first glance" ([forum](https://forum.obsidian.md/t/visual-spatial-note-taking-whiteboard-mind-map-concept-map/32346/20)); Excalidraw separates text from boxes ([Heptabase wiki](https://wiki.heptabase.com/mindmap)) |
| **Whimsical** | Clean look | Nothing found on sentence nodes |

Takeaway: no mainstream tool is designed for sentence nodes; all rely on the author keeping labels short. Markmap and Mermaid are useful as architecture precedents (markdown in, tree out, `maxWidth`, collapse), not as aesthetics.

## 3. Issue trees and hypothesis trees

- **Conventions.** Issue trees ask questions; hypothesis trees make claims; both are "logic trees". Siblings should be MECE. The common slide form is root on the left, 3 primary branches, each splitting into sub-issues, left to right ([mconsultingprep](https://mconsultingprep.com/issue-tree), [Deckary](https://deckary.com/template/issue-tree)). Evidence is consulting-prep and template vendors, not McKinsey; treat as common practice. One template says beyond 3 levels per slide is unreadable and recommends drill-down slides where each level-2 branch becomes a new root ([SlideUplift](https://slideuplift.com/powerpoint-templates/consulting-mece-issue-tree-3-branch-powerpoint-and-google-slides-template/)). That matches the tool's needs: **left-to-right is the genre convention, so it is legible to anyone who knows it.**
- **Minto.** Answer first, 3 to 5 grouped supports, each node a summary of what is below ([Deckary](https://deckary.com/blog/pyramid-principle-consulting)). Covered in v0.1; nothing to add except that the left-to-right tree is the same pyramid rotated.
- **Argument maps.** Rationale uses green "because" and red "but" boxes with labels; Argdown separates a short title from full statement text and has export options to show title or full text per node ([Argdown](https://argdown.org/guide/creating-oldschool-argument-maps-and-inference-trees.html)); Kialo uses a sunburst overview. IBIS types questions, ideas and arguments distinctly. None publishes well at sentence length: they shrink the text or become boxy.
- **Questions and answers together.** Our trees mirror question and answer one-to-one. Showing both on every node doubles text and noise. The IBIS lesson (visible typing) says to differentiate them, not to show both everywhere. See recommendations: answer is the node; question is the same position in a toggled layer.

## 4. Information design and layout algorithms

- **Tufte.** Data-ink: remove marks that carry no information. Small multiples: repeat one structure for comparison. For a tree, boxes, arrowheads and heavy frames are non-data ink; branch colour and curve are structural data. (Two-level and 1+1=3 points are in v0.1.)
- **Progressive disclosure.** NN/g: show the frequently needed first, make the progression obvious, and **limit disclosure to two levels**, since more usually hurts ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)). On a tree: initial view root plus two levels, a visible affordance on collapsed nodes, no third hidden layer of modes.
- **Layout algorithms.** d3.tree is Reingold-Tilford made linear-time by Buchheim et al.: compact, parents centred over children; `nodeSize` is fixed per node; default separation 1 for siblings, 2 for cousins ([d3-hierarchy](https://d3js.org/d3-hierarchy/tree)). Fixed node size fails for sentence nodes whose heights differ. **d3-flextree** takes a per-node `[xSize, ySize]` and a `spacing` function (min gap between neighbours, so cousins can get more), still O(n), based on van der Ploeg's "Drawing Non-layered Tidy Trees in Linear Time" (2013) ([d3-flextree](https://github.com/Klortho/d3-flextree)). Cluster (dendrogram) aligns leaves at one depth; wasteful here. Practical procedure for left-to-right: measure each wrapped label (width fixed per depth, height from line count), feed heights to flextree as the breadth axis, and depth columns as the other, with column width = max label width at that depth.
- **Text measure.** Sentence labels need a wrap width: 28 to 40 characters per line (about 4 to 7 words) keeps labels tall rather than wide, which suits a left-to-right layout that has spare vertical room. Bringhurst's 45 to 75 characters (v0.1) is for running text; node labels are shorter measures.

## 5. Shareable formats

- 4:5 portrait, 1080x1350, is the largest feed footprint on Instagram (guidance: width at least 1080, ratio between 1.91:1 and 4:5); the profile grid previews 3:4, so keep content in the central safe area ([Stellar Digital](https://stellardigital.com.au/instagram-size-guide-2025/), [Postiz on LinkedIn](https://postiz.com/blog/image-sizes-for-linkedin-posts)). Sources disagree on LinkedIn's accepted range and are secondary blogs; Meta documentation not confirmed. v0.1's table of pixel sizes still stands.
- **Left-to-right is landscape-friendly and portrait-hostile.** On 4:5 the tree is tall and narrow only if depth is shallow. A 3-column tree (root, level 1, level 2) with 28-character wraps fits 1080 wide at about 34 to 40 px type; that is the real constraint. 16:9 (1920x1080 or 1600x900 for X) gives roughly 2x the horizontal room; use it for three levels.
- **Node budgets (my estimate, untested).** 16:9: root plus up to 5 branches plus up to ~12 leaves, about 150 words. 4:5: root plus 4 branches plus up to ~8 leaves, about 90 words. 1:1: between the two. Beyond that, split into a carousel (one branch per slide, with the root as a small stub on each).
- **Legibility.** Phone display is about 390 CSS px, so 1080 px sources scale 0.36; 36 to 40 px source type lands near 13 to 14 px, the floor (arithmetic from v0.1; no authoritative minimum found).
- **Text in image, alt text and the link.** The image is the billboard; the source URL or QR goes in a footer strip (v0.1).

## 6. Interactive patterns

- **Collapsible tree.** The Bostock/Observable collapsible tree toggles children on click and re-runs the layout with a transition ([Observable example](https://observablehq.com/notebook-kit/ex/d3/collapsible-tree)); a zoomable variant exists ([example](https://observablehq.com/@20ea4301bd6009e3/collapsible-horizontal-tree-with-zoom)). Markmap does the same with `initialExpandLevel` and 500 ms transitions, plus pan and zoom with `fitRatio` 0.95.
- **Focus plus context.** For phones, tap a node to re-root: the selected node and its children at full size, siblings and ancestors dimmed or reduced to a breadcrumb. This is progressive disclosure and also doubles as the carousel slide generator (one view per branch).
- **Outline to map toggle.** The tree is already an outline (the source text). Offering outline view as the phone default, map view as the overview, avoids the "map on a 390 px screen" problem; it is also the accessible view.
- **Static vs interactive.** The same geometry code can produce both SVG for sharing and the live view; the interactive version adds collapse state, not new layout rules.

## Implications for our design

1. **Layout:** left-to-right tidy tree with variable node height (d3-flextree or equivalent), depth columns, root vertically centred on its children. Curves, not elbows.
2. **Branches:** S-shaped cubic Béziers, horizontal tangents at both ends, drawn as tapered filled shapes (about 3.5 px at depth 1 down to about 1 px at depth 3 on a 1080 canvas; taper along each branch, not just by depth), so the tree reads as growth.
3. **Colour:** one hue per top-level branch inherited down its sub-tree; root and branch-less elements in neutral ink. Maximum 5 branch hues. Palette: muted Okabe-Ito-derived, chroma capped, no yellow lines on white; every branch also numbered so colour is redundant (WCAG, v0.1).
4. **Calm over loud:** warm off-white background, line opacity falling with depth (about 100%, 80%, 60%), near-black text. No fills, no boxes, no arrowheads.
5. **Text on the branch:** label sits on the line start, left-aligned, baseline just above the stroke (Coggle-like). Label never in a box; a faint paper-coloured halo behind text where it crosses a line.
6. **Type scale by depth:** three sizes only, e.g. root 2.4x, level 1 1.4x, deeper 1x of base 36 px on a 1080 canvas; weight (medium for level 1) rather than extra sizes. One serif or humanist face; embed fonts so the SVG is portable.
7. **Label limits:** assertion labels 6 to 14 words; hard wrap width 30 characters at depth 1, 36 at depth 2 and below; a label over 3 lines is a lint failure that goes back to the author, not truncated. Root may be up to 3 lines at larger size.
8. **Depth per format:** social 4:5 and 1:1: root plus 2 levels; 16:9: root plus 3 levels; phone web: root plus 2 levels expanded, the rest collapsed (NN/g two-level rule). Deeper material is a drill-down or another slide with that branch as root.
9. **Node budgets:** 4:5 up to about 12 nodes and about 90 words; 16:9 up to about 20 nodes and about 150 words. Over budget: render a carousel with one branch per slide and a tiny root stub for orientation.
10. **Questions vs answers:** the node is the assertion. In a hypothesis tree show only answers on the map; show the mirrored question as a small muted line above the node only for the root (as the kicker) and optionally per branch on tap or in a "questions" layer toggle. In a pure issue tree, questions are the nodes, same style.
11. **Hedges stay in the label** (v0.1): "probably", "partly" are part of the assertion; the renderer must never shorten them.
12. **Collapse affordance:** a collapsed node shows a small filled dot with the hidden-descendant count in the branch colour; expanded shows none. Tap target at least 44 px on phone.
13. **Phone interaction:** default to outline view (indented, same colours), with a button for map view; in map view, tap re-roots (focus plus context) with a breadcrumb, pinch zoom as secondary. Keep animation to 300 to 500 ms.
14. **Sharing frame:** title is the root answer, kicker is the question, footer carries author, date, status and the URL or QR; nothing else decorative (v0.1).
15. **One geometry, two outputs:** a single layout module produces SVG with real text for sharing and the same node coordinates for the live view; do not use markmap or Mermaid as the renderer (default look is the thing we are avoiding), but copy their source-as-markdown and `maxWidth` ideas.
16. **Test fixtures:** render the Q2 tree and the Wise AI tree at all three formats and check at 390 px width; the pass test is whether the root claim and the five branch stubs can be read without zooming.
17. **Open points to verify by hand:** actual Coggle defaults (line width, colour values, fold marker) by screenshotting a Coggle free account; how Kialo and Argdown render long claims; whether X's 16:9 crop of a 4:5 image mangles the tree. These were not answerable from the web search tooling used here.
