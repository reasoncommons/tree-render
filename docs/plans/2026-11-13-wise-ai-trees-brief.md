---
status: draft (style decided 2026-11-14: ribbon, ink and seal; root placement and the four questions' wording pending)
---

# Brief: Wisdom and AI tree visuals, v1

For a sub-session working in `~/src/life-itself/ai-wise` on the beads epic `ais-svl`. The goal is to ship the first tree visuals on the Wisdom and AI site (ai.lifeitself.org). It is also a test of the handover: everything you need should be here or linked. Ask Rufus only about taste or publishing.

## What to make

| Tree | Source | Depth | Where it goes |
|---|---|---|---|
| The four questions | root + the four questions, each a short bold question and a clarifying clause (draft in tree-render `out/wise/wise-questions-full.json`; wording to be signed off) | 1 | `site/question-trees.md` (or the index; ask) |
| Q1 Can we make AI good? | `trees/q1.json` | 2 | `site/alignment.md` |
| Q2 How fast should we go? | `trees/q2.json` | 2 | `site/risk-and-pace.md` |
| Q3 How should we integrate AI? | `trees/q3.json` | 2 | `site/living-with-ai.md` |
| Q4 Could AI feel? | `trees/q4.json` | 2 | `site/consciousness.md` |

## How to draw them

- Renderer: `~/src/reasoncommons/tree-render/skills/tree-render/render/bin/render.js`. Read `skills/tree-render/SKILL.md` first.
- Style: `--style ribbon --palette wise-ink --font bricolage` (Rufus 2026-11-14): ink ribbons and warm-grey hairlines on the site's paper, seal red once on the conclusion, the site's Bricolage. Root: `--root-style` centre or outline, to be picked. Mockups: https://claude.ai/artifact/Egai2sxXdFBFg3WBHBDvUW
- Sizes: the style's own (ribbon caps a one-level tree's root at 1.15× the answers).
- Depth: `--depth 1` for the overview; the question trees in full (two levels). One image per tree, made for desktop; phones show the same image.
- Output: SVG and 2× PNG. The renderer exits 1 if anything overlaps; fix that, don't ship it.

## Text first (ais-svl.1)

- Each bold lead must stand alone as the point, like a heading, not just the first words of the sentence. Bad: "So every actor should push" (v0.1 Q2), "Whether AI can feel". Better: "Push towards the speed of wisdom".
- Keep leads short; the rest of the sentence follows in regular weight.
- Show Rufus the list of leads before rendering.

## Checks before showing Rufus

- Check every render at actual size: no overlaps, no lone last words, leads read as headings.
- Have a subagent critique the renders, then apply its points with judgment.
- Each tree on the site gets alt text and the tree as a text outline beside it (accessible and searchable).
- Attribution: **TBD** (tree_render-5q0.5). For v1, a small source line such as "Wisdom and AI · Life Itself · ai.lifeitself.org" under the image is enough.

## Done

The five images and their placement are committed in ai-wise, Rufus has said yes, and the site is published. Close `ais-svl` and note anything the brief lacked in `tree_render-5q0.4`.
