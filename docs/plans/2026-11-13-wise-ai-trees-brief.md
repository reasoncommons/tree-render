---
status: ready for handover (2026-11-14). Style, root and the four questions' wording signed off by Rufus.
---

# Brief: Wisdom and AI tree visuals, v1

For a session working in `~/src/life-itself/ai-wise` on the beads epic `ais-svl` (Rufus may run it himself and tweak). The goal is to ship the first tree visuals on the Wisdom and AI site (ai.lifeitself.org). It is also a test of the handover: everything you need is here or linked. Ask Rufus only about taste or publishing.

## What to make

| Tree | Source | Depth | Where it goes |
|---|---|---|---|
| The four questions | `trees/questions.json`, to create from the JSON below | 1 | `site/question-trees.md` (or the index; ask) |
| Q1 Can we make AI good? | `trees/q1.json` | 2 | `site/alignment.md` |
| Q2 How fast should we go? | `trees/q2.json` | 2 | `site/risk-and-pace.md` |
| Q3 How should we integrate AI? | `trees/q3.json` | 2 | `site/living-with-ai.md` |
| Q4 Could AI feel? | `trees/q4.json` | 2 | `site/consciousness.md` |

Paths are under `projects/wise-ai-briefing/`. The four questions, signed off 2026-11-14 (a short bold question, then a clause that pins down what it means; a `lead` must be the exact opening words of its `text`):

```json
{
  "title": "Wisdom and AI",
  "root": {
    "text": "How should we approach AI development wisely?",
    "children": [
      { "lead": "Can we make AI good?", "text": "Can we make AI good? Not just working well, but aligned with what is good; and what can wisdom traditions add?", "children": [] },
      { "lead": "How fast should we go,", "text": "How fast should we go, given the risk of catastrophe and the chance that alignment fails?", "children": [] },
      { "lead": "How should we integrate AI", "text": "How should we integrate AI into our lives and societies, setting catastrophe aside?", "children": [] },
      { "lead": "Could AI feel?", "text": "Could AI feel? If it could be conscious or a moral patient, how should we relate to it?", "children": [] }
    ]
  }
}
```

## How to draw them

- Renderer: `~/src/reasoncommons/tree-render/skills/tree-render/render/bin/render.js` (Node; `npm install` in `render/` if needed). Read `skills/tree-render/SKILL.md` first.
- Command, for every tree: `node <renderer> <tree.json> --style ribbon --palette wise-ink --font bricolage --root-style centre --out <dir> --name <name>`.
  - Ribbon, ink and seal: ink ribbons and warm-grey hairlines on the site's paper, seal red once on the conclusion (the level-1 node marked `"accent": true`, by default the one starting "So"), text in the site's Bricolage.
  - Root: the question centred on the dot, no box (Rufus's pick). Alternative if wanted: `--root-style outline` (thin square-cornered box).
  - Curves: leave the flag off for ribbon's own curve (the default; Rufus, 2026-11-14: keep it). `--curve coggle` is an option: Coggle's S over a run of at least 320 px, so the outer branches are not vertical pipes; trees are about 110 px wider.
- Sizes: the style's own (a one-level tree's root is capped at 1.15× the questions).
- One image per tree, made for desktop; phones show the same image.
- Output: SVG and 2× PNG. The renderer exits 1 if any text overlaps; fix that, don't ship it.
- Mockups (Q2 and the four questions in this style): https://claude.ai/artifact/Egai2sxXdFBFg3WBHBDvUW

## Text first (ais-svl.1)

- Each bold lead must stand alone as the point, like a heading, not just the first words of the sentence. Bad: "So every actor should push" (v0.1 Q2), "Whether AI can feel". Better: "Push towards the speed of wisdom".
- Keep leads short; the rest of the sentence follows in regular weight.
- Show Rufus the list of leads for Q1–Q4 before rendering.

## Checks before showing Rufus

- Check every render at actual size: no overlaps, no lone last words, leads read as headings, one red only.
- Have a subagent critique the renders, then apply its points with judgment.
- Each tree on the site gets alt text and the tree as a text outline beside it (accessible and searchable).
- Attribution: for v1, a small source line under the image, such as "Wisdom and AI · Life Itself · ai.lifeitself.org".

## Done

The five images and their placement are committed in ai-wise, Rufus has said yes, and the site is published. Close `ais-svl` and note anything the brief lacked in tree-render's `tree_render-5q0.4`.
