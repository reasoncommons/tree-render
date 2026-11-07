---
title: Shareable Tree Visuals
description: Principles and an AI skill for drawing SCQ question/hypothesis trees as beautiful, graspable, shareable visuals.
created: 2026-10-17
status: in-progress
parent: [[scqa-trees-of-thought]]
tags:
  - scqa
  - issue-trees
  - visualisation
  - skill
---

Work out how to present SCQ question trees and their mirrored hypothesis trees (one assertion per node) visually, so a single thesis or a whole area can be grasped at a glance, read on a phone or a slide, and is the kind of thing people want to share. Capture the result as design principles plus an AI skill that produces the visuals (SVG first), not as an automated tool. First real case: the Wise AI briefing trees in [[2026-wise-ai-briefing]].

Working files: [projects/2026-shareable-tree-visuals/](2026-shareable-tree-visuals/) — `problem.md` (SCQ problem definition), research and options notes, critiques, trial visuals. Draft skill: `tree-mindmap` in the shared skills repo (`~/src/life-itself/skills/skills/tree-mindmap/SKILL.md`).

**Decision (Rufus, 2026-10-17):** the block/poster designs (trials v1, v2) are rejected: no blocks. The visual is a **classic left-to-right mindmap of the argument** (Coggle-like curved branches, plain text), styled for now after the Seeds of Renaissance diagram look (`~/src/life-itself/design/projects/sor-design-system/diagrams.md`). Elegance and simplicity first; better styling research later. Current visuals: `trials/mindmap/`.

## Relationships

- [[scqa-trees-of-thought]] — parent; this is the "visualise" stretch goal of its AI-skills approach, done as a skill.
- [[2026-issue-tree-workspace]] — sibling. That project is an interactive editing workspace; this one is static, presentational output for reading and sharing. Principles here should feed its overview view.

## Tasks

- [x] Problem definition (SCQ) + critique
- [x] Research prior art and rendering options + critique
- [x] Trials v1/v2 (poster) — rejected by Rufus; pivot to mindmap
- [x] Draft `tree-mindmap` skill + mindmap trials (Q2, Wise AI overview)
- [x] Rufus reviewed mindmaps (okay, not yet good) and reframed the work (2026-10-19)
- [ ] ⏭️ Run LTP on the signed-off SCQ: `~/src/life-itself/issuetrees.com/docs/plans/2026-10-19-tree-render-scq.md` (work now continues in the issuetrees repo, `render/`)
- [ ] Later: research styling (colour per branch vs SoR restraint), phone-shaped/carousel versions, questions-only view
