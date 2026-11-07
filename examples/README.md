# Example trees

Real question (issue) trees and question trees with answers, converted into one simple Markdown format for testing the renderer. Stats are computed by a script (`tree_stats.py`, kept outside the repo in the session scratchpad), counting a label as the bullet text after `- `.

## Format

- An H1 title, then optional `kind:` (`question`, `hypothesis` or `qa`) and `source:` lines (source paths are relative to `~/src`), then nested `-` bullets with two-space indent. The first bullet is the root.
- If a question has an answer or hypothesis, it is the first child, on a line starting `- A: `, before the sub-questions. `A:` lines are not counted as nodes.
- Wording is the original. Markup is stripped (bold markers, list numbers on the Wise AI trees, `**✅ ...**` answer markers), nothing is shortened.

## Files

| File | Source | Nodes | Max depth | Max label (chars) | Median label (chars) | Has answers | Notes |
|---|---|---|---|---|---|---|---|
| [dam-media-questions.md](dam-media-questions.md) | `rufuspollock/agent-skills/skills/project-planning/tests/2026-10-16-dam/scq.md` | 12 | 3 | 174 | 78 | no | Small |
| [taiwan-trip-issue-tree.md](taiwan-trip-issue-tree.md) | `rufuspollock/childcare-housekeeper/projects/2601-taiwan/issue-tree.md` | 53 | 5 | 364 | 72 | no | Medium-large, mixed question/statement labels |
| [seeds-rebrand-qa.md](seeds-rebrand-qa.md) | `reasoncommons/issuetrees/tools/viewer/examples/rebrand.md` | 33 | 4 | 254 | 35 | yes (16 answers; max 356, median 139 chars) | Medium, questions with recorded decisions |
| [wise-ai-questions.md](wise-ai-questions.md) | `life-itself/ai-wise/projects/wise-ai-briefing/question-tree.md` | 94 | 5 | 168 | 55 | no | Large, deep, questions only |
| [wise-ai-answers.md](wise-ai-answers.md) | `life-itself/ai-wise/projects/wise-ai-briefing/question-tree-answers.md` | 94 | 5 | 168 | 53 | yes (93 answers; max 559, median 194 chars) | Large, deep, every question has an answer |

Nodes exclude `A:` lines. Depth counts the root as 1.

## Label length distribution

All distinct question labels across the set (192 nodes; `wise-ai-answers.md` is not counted again because its questions repeat `wise-ai-questions.md`):

| min | p25 | median | p75 | p90 | max | mean |
|---|---|---|---|---|---|---|
| 8 | 35 | 59 | 91 | 136 | 364 | 72 |

| Label length (chars) | Nodes |
|---|---|
| 0-40 | 60 |
| 41-60 | 37 |
| 61-80 | 30 |
| 81-100 | 24 |
| 101-150 | 25 |
| 151-200 | 12 |
| >200 | 4 |

Answers (109 `A:` lines):

| min | p25 | median | p75 | p90 | max | mean |
|---|---|---|---|---|---|---|
| 37 | 139 | 187 | 241 | 296 | 559 | 202 |

| Answer length (chars) | Answers |
|---|---|
| 0-100 | 8 |
| 101-200 | 52 |
| 201-300 | 40 |
| 301-400 | 6 |
| 401-600 | 3 |
| >600 | 0 |

## Wording oddities

- **Wise AI**: the strand questions keep their `Q1.` to `Q4.` prefixes, but sub-question numbers (`1.`, `1.1`, `1.1.1`) are dropped, so cross-references in labels such as "(cites Q1.4.1)" no longer have a visible target. The governing question is the root; it comes from the `## Governing question` section and has no answer. `(synthesis)` tags appear in `wise-ai-questions.md` but not in `wise-ai-answers.md` (the answers file omits them). Q4 is labelled "(minor)" in both files (the public site calls it "a smaller strand"). Labels contain `*italic*` markers and nested parentheses.
- **Wise AI answers** are full paragraphs (up to about 560 characters), and each strand question also has an overall answer. The answers file is generated from the question tree, so the trees match one to one.
- **Taiwan**: mixed register. Some nodes are questions, others are statements, options or notes ("Scores", "Criteria, C vs E"). Labels carry the original numbering (`1.1.2`), priority emoji (🔥) and a choice marker (⚖️), and many are "title — long explanation" strings. Prose paragraphs, decision tables and the quoted key question markup around the tree are left out; the quote is the root. Section 1.4 has no bullets in the source, so its one-line paragraph is a child. Contains an in-tree dated status note ("2 Nov 2026: ...") and `*(TODO)*` markers.
- **Rebrand**: the answers are decisions recorded against questions, not hypotheses (originally bold text after a ✅). Several labels carry extra inline notes ("Partial direction: ...", "Current direction (Rufus, 2026-09-25): ...", "(Coggle has a stub ...)"), and one answer is followed by a trailing comment that is merged into the answer. Unanswered questions have leading status emoji (⏭️ 🔥 ⏫). Several answers repeat the same Canva link. Some labels contain Markdown links.
- **DAM**: the source marks every node "open"; that tag is dropped. Contains a clumsy question ("Can use, a quick human pick, or AI signal \"strong\"?") kept as written.
- Nothing here is a true hypothesis tree (assertions with supporting assertions); `wise-ai-answers.md` is the closest, as its answers are the hypotheses. A real assertion-style tree is still to be found.

## Reference

The earlier JSON shape (label, text, children) is in `archive/v0.1/planning/trials/mindmap/*.json`; reference only.
