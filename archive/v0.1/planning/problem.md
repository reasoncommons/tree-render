---
title: "Shareable tree visuals: problem definition"
created: 2026-10-17
status: v2 (revised after critique; see problem-critique.md)
parent: [[2026-shareable-tree-visuals]]
---

# Problem definition

## Situation

- Rufus structures thinking as **SCQ** (situation, complication, question) plus a **question tree**: a governing question broken into 3–5 sub-questions, each broken again (MECE, up to 5–7 children).
- Each question tree is mirrored by a **hypothesis tree**: same shape, one assertion per node, answering that node's question. Essays are built from it (summary = top of tree, headings = assertions).
- Live example: the Wise AI briefing (`projects/2026-wise-ai-briefing/`): one governing question, four sub-trees (Q1 alignment, Q2 risk and pace, Q3 broader impacts, Q4 consciousness), about 60 nodes. Assertions run 10–50 words; governing answers 60–120 words. Some trees (Q2) already carry a short bold lead per node; others (Q1, Q4) do not.
- The trees live as Markdown nested lists: precise, editable, the right source of truth.

### Uses (ranked)

1. **Post one thesis.** A social post (LinkedIn, X, Bluesky, newsletter) of one sub-tree's answer, e.g. Q2 "go at the speed of wisdom", to people who have not read the work. The image must stand alone, hook, and read on a phone.
2. **Present.** A slide in a talk or briefing, Rufus speaking to it.
3. **Orient collaborators.** A one-page overview of a whole area (governing question + Q1–Q4 with one-line answers) for people working on or reviewing it, on screen or printed.

## Complication

- **The trees have no short form.** A legible node holds 8–15 words; most assertions are 20–50. Where a tree has short headlines, layout is tractable; where it doesn't, no layout saves it, and shortening at drawing time risks drifting from the source.
- **The shape is invisible.** In a nested list you can't see the main claim, how many pillars hold it up, or where the weight sits; so few people read it, and nobody shares it.
- **The obvious tools look like software diagrams.** Auto-laid-out Mermaid or Graphviz trees of sentence-length nodes give tiny text or sprawling box-and-arrow charts, which read as system architecture, not as an argument.

## Question

**What visual form makes a hypothesis tree (with its question) graspable at a glance, and good enough that Rufus would post or present it as-is, for the three uses above?**

Deliverable: principles plus an AI skill that produces such visuals from the Markdown tree, repeatably.

## Design tensions (to resolve, not complications)

- **Coverage vs legibility.** More nodes means smaller text; one image cannot hold 60 sentence nodes at phone size.
- **Answer vs question.** Readers want the answers, but the question gives each answer its meaning.
- **Inform vs persuade.** Recall of claims is not the same as seeing *why* they hold; for sharing, the stakes are the hook.

## Requirements

### For the visual

| # | Requirement | Test |
|---|---|---|
| V1 | **Main claim and pillars at a glance.** | In ~10 s a cold reader can state the main claim and most pillars. |
| V2 | **The logic is visible.** The reader can see why the main claim follows: the question it answers and the stakes (complication) are on the image. | A cold reader can say why the main claim follows, and what question it answers. |
| V3 | **Area overview** (use 3). For a multi-tree area, what was asked and concluded in each part, and how parts relate. | In ~30 s a cold reader can name each sub-tree's topic and its one-line answer. |
| V4 | **Stands alone.** Title, question, source/link line, author, date, and status (draft vs signed off). | Reads correctly with no surrounding text. |
| V5 | **Looks designed.** Typographic, calm, not a generated software diagram. | Rufus would post it as-is (proxy: design critique subagent). |
| V6 | **Legible at size.** | At 390 px display width, smallest text ≥ 11 px effective; on a 16:9 slide, smallest text ≥ ~18 pt equivalent. |
| V7 | **Faithful.** Structure, numbering and claims match the source; nothing the source doesn't say. | Node count and parentage match; each label traces to a numbered source node. |
| V8 | **Accessible.** | WCAG AA contrast; meaning survives greyscale; real text in SVG; alt text supplied. |

### For the skill

| # | Requirement | Test |
|---|---|---|
| S1 | **Repeatable.** A fresh agent with the skill and a Markdown tree produces an acceptable visual in one session. | Trial run from the skill text alone. |
| S2 | **Self-checking.** The skill renders to PNG, inspects it, and checks text overflow and V-requirements before handing over. | Checklist in the skill; trial shows it caught something. |
| S3 | **No product to maintain.** Guidance plus at most a small template or layout helper bundled in the skill; no app or service. | Skill folder is self-contained. |

**Evaluation proxy.** "Cold reader" = a fresh vision-capable subagent shown only the PNG, then Rufus. The subagent answers V1–V3 questions from the image; answers are scored against the source.

## Working calls (made without Rufus; revisit if wrong)

- **Fix the text at source.** Add an authoring rule to the hypothesis-tree method: every node gets a headline of ≤ 12 words, written by the author with the tree, used verbatim in visuals. Where a tree lacks headlines, the skill drafts them as a separate, reviewable step and marks them as drafted.
- **Answer-first, question visible.** The assertion leads; the question appears as a small label (governing question always; sub-questions on branch posters). The complication appears as a one-line kicker on posters and overviews.
- **One format to post quality first: the branch poster** (one sub-tree, e.g. Q2), because use 1 is top-ranked. Then the **area overview**, which use 3 needs. A thesis card (one node) only if a use calls for it.
- **Static first.** SVG plus PNG; interactive drill-down belongs to [[2026-issue-tree-workspace]]. Posted images carry their own background; light/dark only matters for inline web embedding.
- **Inform, with the logic visible.** No marketing gloss; the persuasion comes from the stakes line and the structure.

## Out of scope

- Editing trees or round-tripping edits; a live app; an automated Markdown-to-image pipeline.
- Argument-map semantics beyond support (objections, rebuttals, evidence weights).

## Next-step questions (in order)

0. **Prior art:** what do Minto/McKinsey storyline pages, argument maps (Rationale, Kialo, Argdown), mind maps, editorial explainer graphics and social "thread cards" do well and badly?
1. **Text:** what text goes in each node at each level; how to shorten faithfully.
2. **Formats and layout, with rendering constraints:** which layout family, which aspect ratios; what an AI can render reliably (hand-authored SVG, templated SVG, Mermaid, Graphviz, D3, Excalidraw).
3. **Visual language:** typography, colour, hierarchy cues, connectors or none.
4. **Evaluation:** score trials against V1–V8 with the proxy above.
