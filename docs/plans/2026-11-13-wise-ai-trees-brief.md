---
status: draft (font and sizes decided 2026-11-13; layout width being tightened)
---

# Brief: Wisdom and AI tree visuals, v1

For a sub-session working in `~/src/life-itself/ai-wise` on the beads epic `ais-svl`. The goal is to ship the first tree visuals on the Wisdom and AI site (ai.lifeitself.org). It is also a test of the handover: everything you need should be here or linked. Ask Rufus only about taste or publishing.

## What to make

| Tree | Source | Depth | Where it goes |
|---|---|---|---|
| Overview | `projects/wise-ai-briefing/trees/overview.json` | 1 (root and its four answers) | `site/question-trees.md` (or the index; ask) |
| Q1 Can we make AI good? | `trees/q1.json` | 2 | `site/alignment.md` |
| Q2 How fast should we go? | `trees/q2.json` | 2 | `site/risk-and-pace.md` |
| Q3 How should we integrate AI? | `trees/q3.json` | 2 | `site/living-with-ai.md` |
| Q4 Could AI feel? | `trees/q4.json` | 2 | `site/consciousness.md` |

## How to draw them

- Renderer: `~/src/reasoncommons/tree-render/skills/tree-render/render/bin/render.js`. Read `skills/tree-render/SKILL.md` first.
- Shape: `--style coggle-exact` (Coggle's curves and palette, branches never cross text; the default `middle` root run keeps the tree narrower). Comparison of the five styles: https://claude.ai/artifact/M2kRH44N1Ci7zRy1s1YbLV
- Font: Bricolage Grotesque, the default (also the site's body font). Arimo is the alternative (`--font arimo`). Fonts page: https://claude.ai/artifact/5uAwQ34AUDiEWa4AkCiwbr
- Sizes: the defaults, Coggle's (root 22, answers 15.3, points 13). Don't pass `--sizes`.
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
