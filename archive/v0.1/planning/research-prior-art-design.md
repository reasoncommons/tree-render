---
title: "Prior art: information design and editorial/social graphics for argument trees"
created: 2026-10-17
parent: [[2026-shareable-tree-visuals]]
---

# Prior art: the design family

Scope: what information design (Tufte, typographic hierarchy), editorial explainer graphics (NYT, FT, Economist, Pudding, Reuters) and social formats teach about turning a 3–5-branch tree of sentence-length claims (e.g. Q2 "go at the speed of wisdom", 5 pillars, ~15 sub-claims) into a shareable image. Sources are linked inline; where only secondary sources were found, that is flagged.

## 1. Tufte and typographic hierarchy

- **The PowerPoint critique is directly about our problem.** In *The Cognitive Style of PowerPoint* (2003; Columbia section "PowerPoint Does Rocket Science", https://www.edwardtufte.com/?p=460) Tufte shows Boeing's Columbia briefings used bullet outlines with 4–6 levels of hierarchy; the Columbia Accident Investigation Board quoted the infamous slide whose key fact was buried at level 4. His contrast: the Feynman lectures cover all of physics in ~1,800 pages with **only 2 levels of headings**. Transferable rule: **a shareable image should show at most 2 levels of the tree, plus the root.** Deep nesting rendered as indentation reads as bureaucracy and hides the main claim. (Counterpoint: Don Norman, "In defense of PowerPoint", https://jnd.org/in-defense-of-powerpoint/ — slides serve a speaker; relevant to use 2, where Rufus talks to the image and it can be sparser.)
- **Sentences, not fragments.** Tufte argues for full-sentence assertions over noun-phrase bullets ("sentence-like" graphics; *Beautiful Evidence*, 2006). This supports the working call that node headlines are **assertions** (≤ 12 words, with a verb), not topic labels like "Risks".
- **Layering and separation** (*Envisioning Information*, 1990): differentiate levels by a small number of weak cues (weight, size, a hairline, a tint) rather than heavy boxes; "1 + 1 = 3" — every pair of boxes or lines creates unwanted interaction effects between them. Implication: **avoid boxed nodes and arrow connectors**; use whitespace and alignment as the structure, a single thin rule or tint to group a branch.
- **Data-ink / small multiples.** For argument trees "data-ink" becomes "claim-ink": every mark should be a word of the argument or a structural cue. Small multiples maps neatly to **parallel pillars with identical internal structure** (number, headline, 2–3 supporting lines), which lets the eye compare across branches.
- **Typographic hierarchy (Bringhurst, *The Elements of Typographic Style*).** Use a modular scale (e.g. 1.25–1.5 ratio) and keep to ~3 sizes; measure of 45–75 characters per line (66 ideal) for body text; distinguish levels with one change at a time (size *or* weight *or* colour). For posters: root claim at ~2.5–3× the smallest size; pillar headlines ~1.4–1.6×; supporting text 1×. Left-aligned ragged-right, never justified at narrow widths.

## 2. Editorial explainer graphics

- **Headline that states the finding.** The Economist's charts carry a one-line declarative title plus a subtitle stating what is shown, a small red "tag" and a source line; Sarah Leo's "Mistakes, we've drawn a few" (https://medium.economist.com/mistakes-weve-drawn-a-few-8cdd8a42d368) groups failures into misleading, confusing, and *failing to make the point* — the third is the common failure of tree diagrams. Pattern: **title = the answer, kicker = the question, footer = source/author/date/status.**
- **Annotation is the product.** Amanda Cox (ex-NYT graphics editor): the annotation layer is "the most important thing we do" (quoted via the EU Data Visualisation Guide, https://data.europa.eu/apps/data-visualisation-guide/visual-annotations-introduction; primary source not found; see also the 2012 interview https://simplystatistics.org/posts/2012-06-01-interview-with-amanda-cox-graphics-editor-at-the-new/). For us the "annotation" is the stakes line (complication) and a short "so what" under the root.
- **Choose form by relationship.** FT Visual Vocabulary (https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary; ~70 forms in 9 relationship categories) has a "part-to-whole" and "flow" family but **no category for argument structure**: editorial graphics teams do not draw argument trees as node-link diagrams. When they explain an argument (NYT "The Upshot" explainers, FT Big Read graphics, Reuters Graphics https://www.reuters.com/graphics/) they use **numbered stacked text panels**, annotated "explainer cards", or a vertical sequence, i.e. typography plus a number, not nodes and edges.
- **Colour restraint.** Economist and FT use one brand accent plus greys; colour encodes one thing. Datawrapper's guidance (https://www.datawrapper.de/academy/what-to-consider-when-choosing-colors-for-data-visualization): **no more than ~7 categorical colours**, and highlight-plus-grey usually beats a rainbow. For a 5-pillar tree, one accent for the root and greyscale or one hue family for pillars is enough; distinct hues per branch are useful only on the area overview (Q1–Q4).
- **The Pudding** (https://pudding.cool) leans on scrollytelling for depth, but its social preview images are single bold statements with one visual motif: the image sells the hook, the link carries the depth. Same split as our "poster vs source".
- **What makes them shareable:** a claim readable in the thumbnail, a recognisable visual signature (FT pink, Economist red bar), and visible provenance (source line, logo). Credibility comes from the footer as much as the content.

## 3. Social formats: sizes and legibility

| Format | Pixels | Ratio | Notes |
|---|---|---|---|
| LinkedIn/Instagram portrait post, carousel slide | 1080×1350 | 4:5 | Largest feed footprint on phones; LinkedIn PDF carousel takes ratio from slide 1 (https://www.trymypost.com/blog/linkedin-pdf-carousel-specs) |
| Square post | 1080×1080 | 1:1 | Safe everywhere; less height for a tree |
| Link preview / OG / newsletter header | 1200×630 | 1.91:1 | LinkedIn, Facebook, Bluesky, Mastodon, Slack; X large card ~1200×628–675; ≥ 600×315 minimum (https://frontendchecklist.io/rules/seo/og-image-size) |
| Slide | 1920×1080 | 16:9 | Use 2 |
| A4/Letter print | ~2480×3508 @300 dpi | ~1:1.41 | Use 3 if printed |

**Legibility arithmetic.** On a phone the image displays at ~360–430 CSS px wide (390 is a fair target). A 1080-wide image at 390 px is scaled by 0.36, so **V6's 11 px effective minimum needs ≥ 31 px type in the 1080 source**; Apple's HIG gives 11 pt as the iOS floor and 17 pt as default body (secondary sources, e.g. https://median.co/blog/apples-ui-dos-and-donts-typography), so for comfortable reading aim for **~40–44 px body in a 1080-wide canvas, 56–64 px pillar headlines, 80–110 px root claim**. Carousel guides quote 24–30 pt minimums (no authoritative source). A 1200×630 OG card in a phone feed shrinks to ~0.32×, so text must be ≥ 36 px and the card can only hold a title-sized claim plus ~10 words. On a 1920×1080 slide, 18 pt ≈ 36 px (1920 px / 13.33 in = 144 px/in).

**Word budgets that follow** (4:5 at 40 px body, ~45 chars/line in a two-column grid): roughly **80–120 words** per image including title and footer; a 5-pillar poster therefore gets ~12 words per pillar headline and **at most one supporting line per pillar**, or the sub-claims go on carousel slides. A 1200×630 card: ≤ 25 words. A slide: ≤ 50–70 words if spoken to. This is why the "≤ 12-word headline" authoring rule is the critical enabler.

**Carousels.** The established LinkedIn pattern (hook slide, one idea per slide, summary slide, CTA slide; 5–10 slides) maps naturally to a tree: slide 1 = question + root answer, slides 2–6 = one pillar each with its 2–3 sub-claims, last = the whole tree in miniature plus link. It lets each sub-claim keep 20–30 words without breaking legibility. Thread cards and quote cards are the single-node version (one assertion, large type, attribution).

## 4. Hand-drawn and sketch styles

- Wood et al., "Sketchy Rendering for Information Visualization" (IEEE TVCG 2012, https://openaccess.city.ac.uk/id/eprint/1274/): sketchiness **raises engagement** and willingness to annotate, but **signals imprecision and provisionality** and degrades area judgements. Follow-up work uses sketchiness deliberately to encode uncertainty (https://www.aviz.fr/Research/UncertaintySketchy).
- Dan Roam (*The Back of the Napkin*, 2008) and sketchnoting (Mike Rohde, *The Sketchnote Handbook*) work for simple frameworks with few words; Excalidraw's hand font (Excalifont/Virgil) becomes hard to read at small sizes and in long sentences.
- Verdict: **hurts credibility for a serious, sourced argument on existential risk**; reads as "brainstorm" or "draft". Possibly useful to signal *draft* status (V4) or for the internal orientation map, never for the posted thesis.

## 5. Layout families for a text-heavy 3–5-branch tree

| Family | Fit | Why |
|---|---|---|
| **Column of cards / pillar poster** (root banner on top, 3–5 numbered columns or rows below) | **Best** | Classic "temple/pillars" and Minto storyline page; text flows in rectangles; parallel structure = small multiples; works at 16:9 (columns) and 4:5 (stacked rows) |
| **Left-to-right indented tree / outline with a spine** | Good | Natural for sentences (text runs horizontally); hierarchy by indent + rule; this is the stacked-row variant for 4:5 |
| Top-down node-link tree | Weak | Width explodes with 5 children × sentence nodes; text gets tiny; reads as an org chart or software diagram (the brief's complication) |
| Nested boxes | Weak–OK | Faithful but box-heavy (Tufte 1+1=3); fine for overview at 2 levels only |
| Radial / sunburst / mind map | Poor | Curved or rotated text, angular wedges waste area, no reading order; mind maps signal brainstorming |
| Treemap / icicle | Poor | Area should encode quantity; our nodes have no weights, and text in variable rectangles overflows |
| Wardley-style map | Wrong | Axes encode evolution/value chain; an argument has none |

## 6. Colour and fonts

- **Accessible palette.** Okabe–Ito (8 colours, CVD-safe; #E69F00, #56B4E9, #009E73, #F0E442, #0072B2, #D55E00, #CC79A7, black) is the default; for ≤ 4 sub-trees use blue #0072B2, vermillion #D55E00, bluish green #009E73, reddish purple #CC79A7 (yellow and sky blue fail contrast as text on white). Apply colour to a rule, number or tint, and set text in near-black; **WCAG AA: 4.5:1 for text, 3:1 for large text (≥ 24 px, or ≥ 18.7 px bold) and for graphical cues (1.4.11)**. Meaning must survive greyscale: carry branch identity by number and position, colour is redundant.
- **Light vs dark.** Posted images carry their own background; choose a warm off-white (e.g. #FAF8F3, the FT/Economist "paper" feel) for credibility. Dark versions need desaturated, lighter accents (raise lightness ~15–25%) and should be generated from tokens, not hand-swapped.
- **Fonts and rendering.** SVG text has **no automatic line wrapping** in SVG 1.1; wrapping must be computed (tspans) or done via HTML/CSS. `foreignObject` (HTML inside SVG) renders in browsers but not in resvg/rsvg. System fonts differ across machines, so an SVG that says `font-family: Inter` renders differently elsewhere; resvg ignores OS font APIs and needs fonts loaded explicitly (https://cdn.jsdelivr.net/npm/@resvg/resvg-js@2.6.2/README.md). Most reliable route for an AI skill: **author HTML/CSS at fixed pixel size, render with headless Chromium (Playwright) to PNG, with a bundled open font (e.g. Source Serif 4 / Source Sans 3, Inter, IBM Plex) as base64 `@font-face`**; Chromium does real text layout and lets the skill detect overflow via `scrollHeight`. Export SVG only if fonts are outlined or embedded. A serif headline plus sans body reads as editorial rather than software.

## Top 10 transferable patterns (ranked)

1. **Title = the answer, kicker = the question, stakes line = the complication** (Economist/NYT headline + subhead convention). Directly satisfies V1/V2.
2. **Show at most root + 2 levels per image** (Tufte vs PowerPoint; Feynman's 2 levels). Deeper levels go to carousel slides or the source.
3. **Headlines are ≤ 12-word assertions with a verb**, written at source; the image never shortens on the fly.
4. **Pillar layout as small multiples**: identical structure per branch (number, headline, 1–2 support lines), aligned on a grid.
5. **Structure by whitespace, alignment, numbering and one hairline; no boxes, no arrows** (Tufte layering and separation; avoids the "software diagram" look).
6. **Design from the phone backwards**: 1080×1350 canvas, ≥ 40 px body, 80–120 words total; verify at 390 px.
7. **Colour restraint**: one accent + greys for a branch poster; Okabe–Ito hues only to distinguish sub-trees in the overview; colour redundant with number/position; WCAG AA.
8. **Footer provenance** (author, date, status, source link) in a consistent signature strip: builds credibility and V4.
9. **Carousel decomposition**: hook (question + answer) → one slide per pillar → whole-tree recap → link. Lets sub-claims keep their words.
10. **Fixed-size HTML/CSS rendered by headless Chromium with bundled fonts**, with automated overflow checks; editorial serif/sans pairing, warm paper background.

## Layout family verdict

For our case (sentence claims, 3–5 pillars, no weights) the answer is the **pillar poster**: root claim as a full-width banner with the question as kicker and the stakes as a one-line deck, then 3–5 numbered pillars. At **16:9** (slide, overview) the pillars are columns; at **4:5** (social) they become stacked rows, i.e. an indented outline with a spine, each row a pillar headline plus one supporting line. The **area overview** is the same grammar one level up (Q1–Q4 as four coloured columns with one-line answers). Node-link trees, radial/mind-map, treemap/icicle and Wardley forms should be rejected for this content; sketch style only to mark drafts.
