# Tree design log

Archive page: `docs/design/archive/index.html` (one image per option, kept in the repo). Published copy (older, every image): https://claude.ai/artifact/Cgj6SM4cjY3e7ESeVkjBAo

Every design round, oldest first, including the ones we discarded. One image per option is on the archive page. Rounds dated 2026-11-12 after the first coggle-exact commit have renders in `out/` that are not committed and may have been re-rendered since.

| Date | Round | What | Verdict | Files in repo |
|---|---|---|---|---|
| 2026-10 | v0.1 mind maps | First Q2 and overview mind maps | "The best so far": text strong, drawing weak | `archive/v0.1/planning/trials/mindmap/` |
| 2026-11-07/08 | First design: Paper, Garden, Slate | Themed mock-ups, brief page, prototypes; branch as a shelf under the text | "Worse than v0.1": the branch under the text looks bad | `docs/design/mockups/`, `docs/design/brief-page/`, `docs/design/moodboard/`, `skills/tree-render/render/out/` |
| 2026-11-11 | Five options, then river and refined Coggle on the Wise set | coggle-faithful, coggle-refined, editorial, tufte, river on the v0.1 text; river and refined Coggle on the Wise set | "These look bad... nothing nearly as good as Coggle" | `docs/design/2026-11-11-options.md`, `docs/design/options-page/`, `skills/tree-render/render/styles/options-2026-11-11/`, `skills/tree-render/render/out/` |
| 2026-11-11/12 | coggle-exact | Dedicated engine reproducing Coggle, compared with Coggle originals | "Much better... we now have a good coggle style" | `docs/design/references/`, `skills/tree-render/render/out/coggle-compare/`, `skills/tree-render/render/out/coggle-exact/` |
| 2026-11-12 | coggle-exact, collisions fixed and tall layout | Branches kept off labels; layout prefers tall | "Prefer more vertical space and less width" (reference: `docs/design/references/coggle-web3-taxonomy.png`) | `out/coggle-exact/` |
| 2026-11-12 | Elegant: hairline, broadsheet, letterpress | Font and pigment variants on the same engine | Only variations, "not the right direction"; Hairline kept as coggle-thin; book typography not readable small; mono for some words does not work | `out/elegant/` |
| 2026-11-12 | Six diagram directions | Dendrogram, spine, outline, braces, ink-branch Coggle, radial | Dendrogram "works well but a bit dry"; braces "ok and quite clean but not as readable"; ink-branch "much worse than Coggle"; spine "not really convinced"; outline "useful for a doc, not engaging or shareable"; radial "does not work at all" | `out/directions/` |
| 2026-11-12 | coggle-thin | Thin-line Coggle and a mono variant | Keeper; root triangles liked for coggle-exact; bold lead on its own line reverted (dangling words); mono dropped | `out/thin/` |
