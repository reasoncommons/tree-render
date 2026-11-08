# Tree visuals: design brief

Status: draft, direction pending Rufus's pick. Written 2026-11-07 by the design session (Claude), without Rufus in the loop; decisions are recorded so he can override. A mood board and directions page are being prepared separately for him to choose from. Settles the open questions in the [SCQ issue tree](../plans/2026-10-19-tree-render-scq.md) where a design decision settles them. Companion documents: [the analysis and spec](2026-11-07-tree-visual-design.md) and [the mockups](mockups/index.html).

## The feel

**"The argument, drawn by a careful hand."**

- The shape reads before the words: a glance gives the question and how many ways it splits; reading gives the questions themselves.
- Calm enough to think with, warm enough to share: colour tells you which branch you are on, and nothing else shouts.
- Everything on the page is the tree: text sits on its branch; no boxes, arrows, icons, badges or chrome.

What we are not: a software diagram (boxes, elbows, arrowheads); a brainstorm scribble (icons, rainbow, every depth equally loud); a slide template (bands, numbered cards, columns); a bullet list in disguise (dots on every leaf, uniform hairlines).

## Who it is for, and the uses ranked

For Rufus and the Life Itself team first, then the people they share with. The uses, in order of how much they shape the design:

| Rank | Use | Format | Depth shown | Density | Interactivity | Type floor (source px) |
|---|---|---|---|---|---|---|
| 1 | Social post: a cover card, then a carousel of one card per branch | 4:5 (1080×1350), 1:1 (1080×1080) | Cover: root + top level. Branch card: branch + 2 levels, deeper level as short labels | 5–8 nodes on a cover, up to ~18 on a branch card with short labels; about 450 characters | None; a static image | 30 (cover), 26 (branch card); 1080 px shows at ~390 px on a phone, so 30 px is ~11 px |
| 2 | Slide: one branch per slide, an overview slide of the top two levels | 16:9 (1920×1080) | Branch: root + 2 levels. Overview: root + 2 levels with short labels | ~20 nodes, about 900 characters | None | 26 |
| 3 | Thinking together: the whole tree on the web, usable on a phone | Fluid HTML | Root + 2 levels open, the rest folded behind "+N" | The whole tree (94 nodes in the Wise AI case) | Fold and unfold, open to a depth, switch question / answer view, switch theme; outline mode under 640 px | 15 (desktop), 16 (phone outline) |

Trees are read left to right, root on the left; this is the consulting issue-tree convention and the Coggle convention, so both audiences already know how to read it.

## What each use needs

- **Social** needs one idea per image: the root question and its first split, or one branch and its split. It needs the biggest type the card allows, a shared visual identity across the cards of a carousel (the branch keeps its overview colour), and a footer that keeps the image attributed when it travels.
- **Slides** need three levels at most, no text under 26 px, and a strand-per-slide drill-down for anything bigger, with a cover slide that shows the top two levels as short labels.
- **Thinking together** needs the whole tree available, folded by default so the top-level shape stays visible, with full text (never shortened), answers on demand, and a phone form that does not need pinch-zoom.

## What is fixed

- Left-to-right mindmap, root on the left, branches curving right (Rufus, 2026-10-17). Radial layouts are not reopened.
- Node text is a sentence, not a keyword; the renderer never shortens, drops a qualifier or adds a word. Short forms come from the author, as a bold lead at the start of the sentence.
- Plain text on the ground, no boxes. Real text in SVG, fonts embedded (Apfel Grotezk Regular and Mittel, OFL).
- Input is the examples' Markdown format (title, `kind:`, `source:`, nested `-` bullets, `- A:` for an answer), plus the bold-lead convention.
- One geometry for all outputs: the static SVG/PNG and the interactive HTML are the same layout with a collapse state added.

## Decisions that settle the SCQ's open questions

- **Which views (question, hypothesis, both)?** Three views of one source: `questions` (questions only, the default for question trees), `answers` (the hypothesis view: the answer is the node, the root question a muted kicker; the default for sharing a tree that has answers), `qa` (question with its answer in muted type beneath; for slides and the web). Question and answer never both appear in full on a social card.
- **Depth and density per use?** As the table above: cover root + 1, branch card root + 2 (deepest as short labels), slide root + 2, web root + 2 open and the rest folded. The renderer reports the smallest effective type size and warns below the floor instead of silently shrinking.
- **How do answers show?** Beneath the question in muted Regular (`qa`), or as the node itself (`answers`). Never inline in the question's line. Long answers are not cut; a card that does not fit at the floor is split.
- **Shortening and short labels at the source?** Yes, at the source: a bold lead opens the sentence (`- **Risk and pace:** given existential risk…`). The renderer shows lead + continuation when there is room, the lead alone when there is not (with "…" if the lead ends mid-sentence), and never invents a lead. Trees without leads still render; they just hold fewer nodes per card.
- **When is interactivity worth it?** Only for thinking together. Sharing is static. The two are the same render with fold state added, which breaks the sharing-density vs thinking-density conflict in the LTP: one source, two outputs, no second design.
- **Themes?** Three, one feel, three readings: Paper (calm, editorial; the default), Garden (Coggle colour, tamed), Slate (dark, numbered, for engineers and dark feeds). Colour, stroke weight and numbering differ; geometry and type do not.
- **Sizes and aspect ratios?** 4:5 and 1:1 for feeds, 16:9 for slides, fluid for the web. No 9:16 story format in the first set (the left-to-right tree is portrait-hostile; a story would need the outline form).

## Done-check

The design is done when all of these hold, on the real trees in `examples/`:

1. A cold reader names the root question and counts the branches of a 4:5 cover in 10 seconds, at phone size.
2. The Wise AI tree renders as a cover + 4 branch cards (4:5), a cover slide + 4 branch slides (16:9), and one foldable web page, from one source file, with no manual placement.
3. No overlaps, no clipped text, nothing below the format's type floor without a warning, every theme passing on every example.
4. Rufus would post the Paper cover as it is.

## Not in this brief

Editing trees, hosting, publishing on issuetrees.com, LTP trees (goal trees, clouds), other layouts. The hypothesis-tree examples here are question trees with answers; a true assertion tree with supporting assertions is still to be found and tested.
