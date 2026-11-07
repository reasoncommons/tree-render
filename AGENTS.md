# Agent instructions

Tree render turns question and hypothesis trees into visuals that are good information design and compelling enough to share. See [README.md](README.md).

## Start clean

- Work from the [SCQ](docs/plans/2026-10-19-tree-render-scq.md), the [LTP](reports/ltp/tree-render/tree-render.ltp.yaml) and the plan that comes out of them. The current brief is [docs/plans/2026-11-07-handoff.md](docs/plans/2026-11-07-handoff.md).
- `archive/` is reference only. Don't build on it, import from it or copy code out of it unless a plan explicitly says to. Lessons from it go into new docs in your own words.
- `reports/ltp/` holds machine-drafted LTP files. Treat them as candidates until Rufus has reviewed them.
- Application trees (for example the Wise AI trees) live in their own repos and use the skill. Don't put them here.

## Beads

Tasks live only in Beads (`bd ready`). Issues sync through the repository's Dolt remote. `git push` also runs `bd dolt push` through the pre-push hook in `.beads/hooks`. After `git pull`, run `bd dolt pull`. If the hook push fails, or no Git commit is being pushed, run `bd dolt push` by hand.

## Changelog

At session end, only log new features or significant reader-facing changes
(behaviour, fixes to materially broken functionality, or public content).
Skip polish, tidying, and small fixes as standalone entries; include them only
as supporting detail in a larger feature or release announcement that qualifies
on its own. Planning/research/design must itself be a significant public
deliverable. When unsure, skip.

Use `changelog/YYYY-MM-DD-slug.md` with `date`/`title`/`promote` frontmatter:
a plain-text title, one or two reader-facing sentences, a live link where
available, and consider a screenshot for visual work. Substantial announcements
can use paragraphs or bullets. Omit internal implementation detail. For the
first entry or when the format is unclear, fetch and follow
https://raw.githubusercontent.com/life-itself/changelog/main/CONVENTION.md
