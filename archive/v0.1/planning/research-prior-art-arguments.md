---
title: "Prior art: visualising structured arguments (argument and consulting family)"
created: 2026-10-17
parent: [[2026-shareable-tree-visuals]]
---

# Prior art: visualising structured arguments

Scope: the "argument and consulting" family for next-step question 0 in [problem.md](problem.md). For each tradition: what it does well, what it does badly, and the patterns that transfer to a hypothesis-tree poster (use 1), slide (use 2) and area overview (use 3). Sources are mostly practitioner material; claims about effectiveness are thin everywhere and flagged where relevant.

## 1. Minto pyramid and consulting storylines

**What it is.** Barbara Minto's *Pyramid Principle* (McKinsey, 1970s onward) puts the governing thought at the top, 3–5 grouped supports below, each a summary of what is beneath it ("vertical logic": each node answers the question its parent raises; "horizontal logic": siblings are MECE and of one kind, either a deductive chain or an inductive group). The introduction is SCQ: situation, complication, question, then answer. In decks this becomes the **storyline** or **ghost deck**: slide titles written first as full-sentence **action titles**, so that reading only the titles gives the whole argument ([Deckary, Pyramid Principle](https://deckary.com/blog/pyramid-principle-consulting); [SlideModel, McKinsey structure](https://slidemodel.com/mckinsey-presentation-structure/); [Piktochart](https://piktochart.com/blog/mckinsey-style-presentation)). A common rule of thumb: if an action title needs "and", it is two slides. The one-page version is the **executive summary page** or **storyline page**: governing thought as a bold sentence at top, 3–5 numbered bold leads, each with one or two lines of support indented below, no boxes.

**Does well.** Answer first, so V1 is nearly automatic. The question is explicit in the SCQ and implicit at each node (the "why?/how?" the parent provokes). Action titles are exactly the "≤12-word headline" working call in problem.md, and the consultant habit of writing them before the body is the precedent for fixing text at source. The storyline page is typographic, not diagrammatic: hierarchy comes from weight, size and indentation, which reads as an argument rather than as architecture (V5).

**Does badly.** Visually dull and corporate; nothing hooks on a phone feed. The pyramid *diagram* itself (boxes and connector lines) is a teaching device, rarely used for real content, because sentence-length boxes overflow. Issue-tree slides (left-to-right, question at root, branches as questions) get dense at level three and rely on tiny text. The method hides uncertainty: everything is asserted with equal confidence.

**Transferable patterns.**
- Action titles: every node a complete, short, declarative sentence; the headline carries the claim, the body carries the evidence.
- Storyline page as a layout: governing thought on top, numbered pillars as a list or row, sub-points as a smaller indented line. Hierarchy by type, not boxes.
- SCQ as a header band: one-line situation/complication as the "stakes" kicker, the question in small caps, the answer large.
- Horizontal logic visible: siblings set in a parallel row of equal weight so the reader counts pillars ("five reasons").
- Left-to-right issue-tree layout for the question side; it fits 16:9 and puts the root where reading starts.

## 2. Argument maps

**Rationale / bCisive (Austhink, Tim van Gelder).** Box-and-arrow trees with the contention at top, reasons below. Convention: green boxes for reasons (labelled "because"), red for objections ("but"), with a small text label so meaning survives without colour ([U. Melbourne text](https://minerva-access.unimelb.edu.au/server/api/core/bitstreams/f891a7a2-1bfb-5ba6-8800-b55b89108af5/content); [OSU tutorial](https://open.library.okstate.edu/kathye/?p=505); [HuntLab slides](https://blogs.unimelb.edu.au/huntlab/files/2023/03/AM-Workshop-1-Slides.pdf)). Co-premises are grouped into a single "reason" bracket, which makes the logic (not just topic grouping) visible. Teaching evidence (van Gelder, Twardy) suggests mapping improves critical-thinking scores, though gains are for the mapper, not a cold reader. bCisive applied it to business decisions with a question at the root.

**Argdown.** Markdown-like text syntax that compiles to a map; claims are rounded or square boxes, edges coloured green (support), red (attack), purple (undercut); groups from headings become grey clusters; colours can come from tags ([Argdown: elements](https://argdown.org/guide/elements-of-an-argument-map.html); [creating maps](https://argdown.org/guide/creating-argument-maps.html)). Relevant here because it is text-as-source-of-truth, like Rufus's Markdown trees, and it lets nodes show a short title with the full text hidden (`[Title]: full statement`), an existing precedent for a headline/body split.

**Kialo.** Thesis at top, pro/con columns below, each claim drillable; also a **sunburst** view of the whole debate radiating from the thesis, useful to see which branches are developed ([Kialo Edu summary](https://www.schooldataleadership.org/systems/instruction-curriculum/kialo-edu.html); [feeldothink on colour](https://feeldothink.org/p/colour-coded-discussion-diagrams-in-kialo/)). Colour is relative to the parent, so a green claim can oppose the thesis, which confuses readers. Critics note context is lost when traversing deep, and pro/con fits balance-of-considerations questions, not open "how should we" questions ([LessWrong discussion](https://www.lesswrong.com/posts/g3odvaj8opqCF9egv/kialo-an-online-discussion-platform-that-attempts-to-support)).

**Toulmin diagrams.** Claim, data, warrant, backing, qualifier, rebuttal laid out horizontally (data → so, qualifier, claim; warrant below "since"). Strong on making the warrant and the qualifier ("probably") visible; too fine-grained for a 15-node poster, but the **qualifier** idea matters: Q2's answers carry hedges ("plausibly", "partly") that a poster should not drop (V7).

**IBIS / Compendium (Rittel; Conklin's dialogue mapping).** Three element types: questions (green "?" nodes), ideas/positions (yellow light bulbs), pro/con arguments (green +, red −); questions can attach anywhere, ideas only to questions ([eight2late on IBIS](https://eight2late.com/2009/07/08/the-what-and-whence-of-issue-based-information-systems/); [zhurnaly](https://zhurnaly.com/z/QuestionsIdeasArguments.html); [P2P Foundation](https://wiki.p2pfoundation.net/Dialogue_Mapping)). It is the only family that treats **question and answer as distinct, visibly typed nodes**, which is exactly the problem.md tension "answer vs question". Icons make types readable in greyscale.

**Does well (family).** Logic as structure: you can see what supports what. Typed nodes with consistent colour plus a text label. Text-first tools (Argdown) separate source from rendering.

**Does badly (family).** They look like software: auto-layout, equal-weight boxes, arrows everywhere; every node gets the same visual weight, so nothing is "the main claim" at a glance (fails V1/V5). Sentence-length boxes force small text or sprawl. Red/green is a colour-blindness problem and carries debate semantics (pro/con) that a pure support tree does not need; problem.md puts objections out of scope, so the support-only subset is all that transfers. Shared-to-social examples are rare; these are working tools, not publishing formats.

**Transferable patterns.**
- Distinct visual type for question vs answer (IBIS): e.g. questions as small grey italic labels or "?"-marked tabs above each answer, never boxed the same way.
- Headline/body split as part of the source syntax (Argdown titles).
- Colour encodes *branch identity* or *node type*, never pro/con; always duplicated by a text or icon cue (Rationale's "because"/"but" labels) for greyscale (V8).
- Group co-premises/children into a bracket under their parent rather than drawing one arrow per child: fewer lines, clearer grouping.
- Keep qualifiers in the headline (Toulmin).

## 3. Mind maps (Buzan, Coggle, MindNode)

**What they are.** Central topic in the middle of a landscape page, main branches radiating out, curved organic lines, one colour per main branch, one keyword per line, images ([Nottingham guide](https://www.nottingham.ac.uk/nursing/sonet/rlos/placs/critical_reflection/other_methods/mindmaps_steps.html); [Xmind summary of Buzan's steps](https://templates.xmind.com/templates/mind-map-7-steps-hujr)). Coggle and MindNode keep this look: tapered coloured branches, text sitting on the line rather than in boxes, auto-balanced left/right.

**Why they feel friendly.** No boxes; colour per branch gives instant "how many parts" chunking; curves read as hand-made, not engineered; text sits on the branch so the connector and the label are one object; radial balance looks finished.

**Weaknesses for arguments.** Built for association, not inference: radial layout has no top, so the governing claim does not dominate and there is no reading order (fails V1/V2 unless numbered). One-keyword labels cannot carry a claim; "Restraint" is a topic, "Restraint is possible but start narrow" is an argument. Radial trees waste corners and squash sentence text at phone width. Popular templates look childish for serious material.

**Transferable patterns.**
- One colour (or tint) per pillar, carried down its whole sub-tree, so the reader tracks a branch without lines.
- Text on or beside a single soft connector instead of inside a box.
- Balanced symmetric layout for the area overview (four sub-trees round a governing question is a natural 2×2 or radial), but with numbering for order.

## 4. One-page argument summaries and posters

**#betterposter (Mike Morrison, 2019).** The centre of the poster is the main finding in plain English in very large type, readable while walking past; a side "silent presenter" column gives method and results in brief; an "ammo bar" holds extra charts for conversation; a QR code links to the paper ([Morrison template, OSF](https://osf.io/6ua4k/); [EdSurge](https://www.edsurge.com/news/2019-06-21-research-posters-are-a-staple-of-academic-conferences-could-a-new-design-speed-discovery); [Limbic](https://thelimbic.com/betterposters-revolution-aims-to-overthrown-walls-of-crappy-text/)). One exit survey reported 68% preferring it; critics say it oversimplifies and loses nuance. **Transfers directly** to use 1: the image is a billboard for one claim with a route to the source, not a container for everything.

**Tufte's critique and the one-page handout.** Tufte argues bullet outlines impose deep single-path hierarchy and fragment reasoning, and recommends dense paper handouts read at the reader's pace ([Tufte essay PDF](https://www.inf.ed.ac.uk/teaching/courses/pi/2016_2017/phil/tufte-powerpoint.pdf)); Norman and others reply that the fault is the author's judgement, not the outline ([Norman](https://jnd.org/in-defense-of-powerpoint/); [five experts](https://www.robertgaskins.com/files/five-experts-dispute-edward-tufte-on-powerpoint-sociable-media-cliff-atkinson.htm)). Lesson: a hypothesis tree is not a bullet outline as long as each item is a full claim and the relations are visible; keep depth to two levels on any single image.

**Wait But Why and explainer drawings.** Tim Urban's posts use crude stick-figure diagrams and hand-lettered labels to make one step of an argument vivid; the charm is informality plus one idea per image. Transfer: a single image should carry one move, and a little hand-made feel (rough line, warm off-white background) signals "thinking", not "system". Illustration is costly and hard for an AI to render well, so it is a garnish at most.

**Horn's information mapping / "infomural".** Robert Horn's large argument murals (e.g. the Can Computers Think? maps) combine argument-map structure with editorial layout, headline per region and illustrations. Shows that whole-debate maps can be beautiful, but only at wall size; they do not survive phone width.

## Synthesis

Consulting tradition supplies the **text discipline** (action titles, answer first, SCQ, MECE pillars) and a box-free typographic layout. Argument maps supply **typed nodes** (question vs answer) and logic made visible, but their look is the thing to avoid. Mind maps supply **branch colour and friendliness**, but not hierarchy. Posters supply the **billboard principle**: one huge claim, a quiet support column, a link to the full source. None of the traditions solves sentence-length nodes by layout; all of them solve it by forcing a short headline at authoring time, which supports problem.md's "fix the text at source" call.

## Top 10 transferable patterns (ranked)

1. **Action-title headlines, authored at source.** Every node a ≤12-word declarative sentence with its qualifier intact; body text stays in the essay (Minto, Argdown titles, Toulmin).
2. **Billboard governing claim.** The main answer is the largest type on the image by a wide margin, readable at thumbnail size (#betterposter, storyline page).
3. **Hierarchy by typography, not boxes.** Size, weight, indent and whitespace carry levels; few or no outlined boxes or arrows (consulting exec summary; avoids the software-diagram look).
4. **SCQ header band.** A one-line stakes/complication kicker and the question in small label type above the answer (Minto intro).
5. **Pillars as a numbered parallel row or list of 3–5.** Equal weight, source numbering (2.1, 2.2) kept so the reader counts pillars and traces to source (horizontal logic; V7).
6. **Question visibly typed differently from answer.** Small grey or italic "Q" label above each pillar answer, never the same treatment (IBIS).
7. **One colour per pillar, carried down its children, with a non-colour cue** (number or label) so it works in greyscale (mind maps, Rationale labels).
8. **Two levels per image, max.** Governing + pillars on the poster; children as one short line each or omitted; deeper detail via link/QR (Tufte, #betterposter).
9. **Group children under a parent with a bracket or shared tint, not one arrow each.** Fewer connectors, clearer grouping (Rationale co-premise grouping).
10. **Silent-presenter footer.** Source link or QR, author, date, status (draft/signed off) in a quiet strip so the image stands alone (V4; #betterposter).
