---
title: "Shareable tree visuals: options and direction"
created: 2026-10-17
status: v2 (revised after critique; see options-critique.md)
parent: [[2026-shareable-tree-visuals]]
---

# Options and direction

Synthesis of [research-prior-art-arguments.md](research-prior-art-arguments.md), [research-prior-art-design.md](research-prior-art-design.md) and [research-rendering-options.md](research-rendering-options.md), against the requirements in [problem.md](problem.md).

## What the research agrees on

- **No tradition makes sentence-length nodes fit by layout.** Minto, argument maps, editorial graphics and #betterposter all force a short headline at writing time. This confirms the working call: ≤ 12-word headline per node, written at source.
- **Answer as title, question as kicker, stakes as deck.** The editorial headline convention (Economist/NYT) maps exactly onto SCQ: kicker = Q, headline = governing answer, deck = C (the stakes line). This is the single most transferable pattern.
- **Two levels per image, at most root + pillars + one line per child.** Tufte, Feynman, #betterposter. Deeper detail goes to the source or a carousel.
- **Hierarchy by type, not boxes and arrows.** Boxes and connectors are what make it look like a software diagram.

## Layout options considered

| Option | Verdict | Why |
|---|---|---|
| **Pillar poster** (banner claim, 3–5 numbered pillars as columns at 16:9, stacked rows at 4:5) | **Chosen** | Reads top-down like a pyramid; small multiples per pillar; scales from phone to slide; numbering traces to source. |
| Node-and-link tree (top-down or left-right boxes + arrows) | Rejected as default | Software-diagram look; every node equal weight; tiny text when nodes are sentences. |
| Radial / mind map | Rejected | No top claim, no reading order; text on curves or small. |
| Treemap / icicle / sunburst | Rejected | Area encodes nothing (no weights); text cramped. |
| Wardley-style map | Rejected | Needs axes our trees don't have. |
| Hand-drawn (Excalidraw) | Only to signal draft status | Raises engagement but signals imprecision. |
| Carousel (hook → one slide per pillar → recap → link) | **Later**, for use 1 | Lets sub-claims keep their words; same grammar per slide. |

## Rendering options considered

| Option | Verdict |
|---|---|
| **HTML/CSS + headless Chrome** (installed), PNG via `--screenshot`, SVG with real `<text>` via a 42-line exporter that also reports overflow | **Chosen.** Browser-grade wrapping and typography, AI writes HTML fluently, self-check built in, zero installs. |
| Typst | Fallback for print/PDF; SVG text is outlines. |
| Hand-authored SVG | Rejected: no wrapping, overflow found only by rendering. |
| Templated SVG + measuring helper | Rejected: amounts to writing a layout engine. |
| Mermaid / Graphviz / D3 / Excalidraw / gstack `diagram` | Rejected for posters (wrong look); `diagram` stays the tool for flows and architecture. |

## Direction (v2, after [options-critique.md](options-critique.md))

1. **One visual grammar: an editorial "reason poster".** Kicker = short question (≤ 12 words); headline = governing answer (the hook, largest type by far); deck = the stakes or the key reason (one line); pillars = numbered reasons; "So:" strip = the synthesis node (never a pillar); footer = author, date, status stamp, short source link.
2. **Pillar logic decides the layout.** Ask of each tree: are the pillars a **chain** (because… yet… so) or **parallel** (independent supports)? Chain → a left spine from headline through big numerals, with small-caps connectives between pillars. Parallel → rows (4:5) or columns (16:9) with no connectives. Q2 is a chain.
3. **Text tiers per node.** Short label (≤ 6 words, the thing read at a glance), lead (≤ 14 words, verbatim from source where it exists, shown as one muted line), children (≤ 8 words each, handout only). Qualifiers are never cut. Drafted text is flagged for author review.
4. **Formats by use.**
   - **Phone post, 1080×1350**: headline, deck, pillars (label + lead), So: strip. ~80–120 words. First trial.
   - **Slide, 1920×1080**: same, pillars only. Handout (dense 16:9 or A4): adds children.
   - **Area overview, 1920×1080**: governing question as kicker; one tile per sub-tree (topic, short question, one-line answer, status); labelled hairlines for real relations between trees. No pillar headlines. Second trial.
   - **Carousel / thesis card**: next, built from the same template (slide 1 = thesis card).
5. **Visual language.** Warm paper, near-black ink, one accent (oxblood) on a branch poster; on the overview one muted hue per sub-tree, always redundant with number and position. Serif for claims (Charter), sans for labels (Avenir Next). Whitespace, alignment, a spine and hairlines; no boxes, no arrows, no shadows. System fonts for now: the PNG is the posted artefact, the SVG the editable master.
6. **Skill + bundled helper.** HTML templates with CSS tokens, `html2svg.js` (exporter + overflow report), `render.sh` (waits for fonts, PNG at 2x, SVG export, SVG re-render). Loop: extract text tiers → choose logic and format → write HTML → render → check report → view PNG → critique against V1–V8 → iterate.

## Risks

- **Consulting-slide dullness.** Beauty must come from the huge headline, proportion, the spine and restraint, not decoration.
- **Drafted short labels may drift from the source.** Flag them, keep qualifiers, and offer them back for the author to adopt into the tree.
- **Font portability**: macOS fonts in the SVG fall back elsewhere; PNG is the posted artefact.
