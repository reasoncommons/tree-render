# Engine asks from the 2026-11-11 options run

Things the five options in `skills/tree-render/render/styles/options-2026-11-11/` could not get from parameters alone. Each is one line plus the reason; none blocks the recommendation.

- **Junction cap.** Fill a disc (radius = half the start width) in the branch colour at every branch start, including `from: text-end` starts; today `fanDot` only draws at fan points, so where several ribbons leave one point (every L1 junction in `2-coggle-refined`) a small white hole shows at the shared origin.
- **Honour `accent` in palette mode.** Let a node marked `accent: true` take `colour.accent` instead of its palette slot, so the "So…" branch can be red (as in v0.1) without ordering the palette by hand (`3-editorial` relies on red being slot 5).
- **Run-in lead.** An option (`font.leadRunIn`) to set the continuation on the same line as the bold lead when the lead is short ("Alignment Partly, and not yet…"), as in Coggle's public "trees" diagram; today the continuation always starts a new line, which spends a line per node on the overview tree.
- **Text halo.** A background-coloured stroke behind text (d3 tidy-tree style, about 3 px) so that on dense trees a branch passing near or under a label never obscures it; the measured Coggle trees show this failure when crowded, and the halo is the standard fix.
- **Root vertical placement.** An option to place the root at the mean of its children's attach points weighted toward the middle child, or to let the root's trunks start from a short vertical spine, so a 5-branch tree does not leave the root alone in a tall empty left column (visible in all options; worst in `1-coggle-faithful`).
- **Shared fan spine.** For `elbow-rounded` fans, draw one vertical spine with leaves peeling off (Coggle's bracket) instead of one elbow per leaf; the overlapping elbows nearly coincide but the outer leaves' corners show a double edge at 2x zoom.
- **Trunk start width per child.** Let `branch.width` accept a per-child weight (for example by subtree size) so a branch with four leaves can leave the root a little wider than one with three, which is what makes OneZoom-style taper read as organic rather than uniform.

## Round 2

From tuning `default` and `river` on the five Wise AI trees (the cold reader's four points); parameters covered the type step, the junction tidy-up, the weight progression and most of the dead band. Left over:

- **Canvas fitted to content.** A `space.canvas: "fit"` (with a min and max width) that sizes the canvas to the map plus margins, so a narrow tree embedded in a report page has no dead band on the right; today the width is fixed per style and `fit: shrink` only scales down.
- **Per-depth wrap balance.** Let `wrap.balance` be per depth (for example `[true, true, false]`) so leaf lines can be greedy to the column width while leads and continuations stay balanced; balanced leaves are what leaves the right edge ragged.
- **Stem from the lead's end, straight to the fan point, at the fan's width.** For `from: fan` with a shared bracket spine, draw the stem and the first spine segment as one ribbon so the thin stem, the dot and the thick spine read as one element rather than three; today the stem is a separate `stemWidth` line and the cap sits between.
- **Root junction without a bar.** For `root.spine`, an option to stagger the trunks' start points along the spine but draw no spine (or draw it in the box fill), so five pastel trunks do not pile on one point without the heavy ink bar that `root.spine` paints today.
