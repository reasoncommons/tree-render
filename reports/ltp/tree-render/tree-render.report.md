# Render question and hypothesis trees beautifully: LTP report

|                    |                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Source             | [`docs/plans/2026-10-19-tree-render-scq.md`](../../../docs/plans/2026-10-19-tree-render-scq.md) (signed off 2026-10-19), plus the goal-tree review with Rufus on 2026-11-07 |
| Digest             | `a99d1e54…85fc` SCQ · `089ceadf…0709` candidate (`shasum -a 256`, 2026-11-07) |
| Reading conditions | Markdown, read whole                                                                           |
| Converted          | 2026-11-07, ltp-project skill; report written the same day                                     |
| Candidate          | [`tree-render.ltp.yaml`](tree-render.ltp.yaml)                                                 |
| Validation         | Not machine-validated. Structural check with PyYAML only (see Validator output)                |

## Check these first

1. **The conflict is unresolved, and it decides the format plan.** The cloud (sharing density vs thinking density) has no injection that breaks it. Its two candidate assumptions, "a shared visual has to be static" and "one visual cannot serve both uses", are the cheapest place to break it: one tree rendered as a static image *and* as a foldable web view from the same source would serve both. The implementation plan should test that before building two separate formats.
2. **"Good enough to post" and "compelling to share" overlap.** They are kept as two critical success factors because the first is a quality bar for any audience (the team included) and the second is a social outcome. If Rufus reads them as one, merge them.
3. **`r-e-folding-unused` is a root cause with no link.** The SCQ says folding goes unused, but never says what it causes. It plausibly causes "bullets overwhelm", and it bears on the second assumption (will people fold a web view if they don't fold a doc?). Left unlinked, because no sentence asserts the link.
4. **No new date.** The 2026-11-02 milestone has passed and is a plan milestone, not a success factor (2026-11-07 review). The new date belongs in the implementation plan (`tree-render-bjp.2`), not in this file.

## What the file claims

33 propositions, 33 roles, 13 relationships, 6 assumptions, 0 assessments, 0 changes.

By view: goal 6 · current_reality 19 · conflict 5 · future_reality 3. No prerequisite or transition view (see Not in this file).

## The shape, in one view

- **Goal:** any question or hypothesis tree becomes, reliably and quickly, a visual that is good information design and compelling enough to share. Four critical success factors: good enough to post as it is; about 15 minutes of AI work and 5 minutes or less of human input; compelling enough that people share it; usable for thinking together on the web or a phone. The audience (the team first, then the people they share with) is held as an observation.
- **Current reality:** six undesirable effects. Bullet trees are poor information design; readers miss the top-level shape; bullets overwhelm; nobody shares them; there is no reliable quick way to do better; results so far are only okay. Four root causes: bullets are the most editable structure (so they are the default); folding goes unused; the two uses pull apart; the design choices are unresolved and made by hand each time.
- **Conflict:** one cloud. Objective: serve both thinking together and sharing. Requirement A, a compelling image, needs sharing density; requirement B, a usable view, needs thinking density. The densities conflict.
- **Future reality:** three injections, none yet linked to a desired effect: left-to-right mindmap layout; a skill built on written patterns and principles; two or three themes for different audiences.

## Items

| id | view | role | statement (short) |
|---|---|---|---|
| g-e-trees-become-good-visuals | goal | goal | Any tree becomes reliably and quickly a good, shareable visual for both uses |
| g-e-good-enough-to-post | goal | CSF | Good enough to post or show the team as it is |
| g-e-fifteen-minutes-per-visual | goal | CSF | ~15 min AI, ≤5 min human, quick to regenerate (a guess) |
| g-e-compelling-to-share | goal | CSF | Compelling enough that people share it as it is |
| g-e-usable-for-thinking | goal | CSF | Usable for thinking together on the web or a phone |
| g-e-team-first-audience | goal | observation | Serves Rufus and the team first, then the people they share with |
| r-e-we-generate-trees | CR | observation | The team generates question trees and mirroring hypothesis trees |
| r-e-bullets-most-editable | CR | root cause | Nested bullets are the most editable structure |
| r-e-default-is-bullets | CR | intermediate cause | The default reading form is nested bullets |
| r-e-folding-unused | CR | root cause | Most people don't use list folding |
| r-e-bullets-poor-design | CR | UDE | Bullet trees are poor information design and not compelling |
| r-e-subbranches-push-out | CR | intermediate cause | The first branch's children push the second branch out of view |
| r-e-reader-misses-shape | CR | UDE | Readers miss the top-level shape and main points |
| r-e-bullets-overwhelm | CR | UDE | Bullets show everything at once and overwhelm |
| r-e-bullets-not-shared | CR | UDE | Nobody shares a screenshot of bullets |
| r-e-mindmaps-get-shared | CR | observation | A beautiful mindmap of a thesis gets shared |
| r-e-no-reliable-way | CR | UDE | No reliable, quick way to make a better visual |
| r-e-hand-judgment | CR | observation | Each visual takes hand judgment |
| r-e-results-only-okay | CR | UDE | Visuals so far are only okay |
| r-e-uses-pull-apart | CR | root cause | Sharing and thinking need different density and interactivity |
| r-e-design-choices-unresolved | CR | root cause | Design choices are unresolved and made by hand each time |
| r-e-coggle-can-be-garish | CR | observation | Coggle style is lovely but can be garish |
| r-e-audiences-differ | CR | observation | Audiences differ in taste |
| r-e-posters-rejected | CR | evidence | Block and poster layouts were rejected (2026-10-17 to 19) |
| r-e-mindmaps-okay | CR | evidence | Static left-to-right mindmaps were "okay, not yet good" |
| c-e-both-uses | conflict | objective | Visuals serve both thinking together and sharing |
| c-e-compelling-to-share | conflict | requirement | A shared visual is a compelling image |
| c-e-usable-for-thinking | conflict | requirement | A thinking visual is a usable view on web or phone |
| c-e-sharing-density | conflict | prerequisite | Density and interactivity that sharing needs |
| c-e-thinking-density | conflict | prerequisite | Density and interactivity that thinking needs |
| f-e-left-to-right-layout | FR | injection | Left-to-right mindmap layout |
| f-e-skill-and-principles | FR | injection | A skill built on written patterns and principles |
| f-e-themes-per-audience | FR | injection | Two or three themes for different audiences |

## Relationships asserted

Each link is listed with the sentence that asserts it.

| id | link | asserting sentence |
|---|---|---|
| g-rel-post-needed | good-enough-to-post → goal (necessary_for) | "Quality: good enough to post or put in front of the team as it is; better than 'okay'." (L37) |
| g-rel-speed-needed | fifteen-minutes → goal (necessary_for) | "Effort: a new visual takes about 15 minutes of AI work and 5 minutes or less of human input…" (L38) |
| g-rel-sharing-needed | compelling-to-share → goal (necessary_for) | "…compelling enough to share, for both thinking together and sharing publicly" (L33); made a CSF in the 2026-11-07 review |
| g-rel-thinking-needed | usable-for-thinking → goal (necessary_for) | "thinking together (a usable view on the web or a phone)" (L24); made a CSF in the 2026-11-07 review |
| r-rel-editable-causes-default | bullets-most-editable → default-is-bullets (causes) | "the default is nested bullets… because that is the most editable structure" (L12) |
| r-rel-pushout-causes-missed-shape | subbranches-push-out → reader-misses-shape (causes) | "the first branch's sub-branches push the second branch out of view, so even an attentive reader misses the top-level shape" (L20) |
| r-rel-missed-shape-supports-poor | reader-misses-shape → bullets-poor-design (supports) | L20 is a sub-bullet giving a reason for L19 |
| r-rel-overwhelm-supports-poor | bullets-overwhelm → bullets-poor-design (supports) | L21, same pattern |
| r-rel-not-shared-supports-poor | bullets-not-shared → bullets-poor-design (supports) | L22, same pattern |
| r-rel-pull-apart-drives | uses-pull-apart → no-reliable-way (contributes_to) | "Two things drive this: Two uses pull apart…" (L23–24) |
| r-rel-unresolved-drives | design-choices-unresolved → no-reliable-way (contributes_to) | "…The design choices are unresolved and get made by hand each time" (L23, L25) |
| r-rel-okay-supports-results | mindmaps-okay → results-only-okay (supports) | "results so far are only okay" (L23) with the trial verdict (L14) |
| c-rel-densities-conflict | sharing-density ⟷ thinking-density (conflicts_with) | "sharing… and thinking together… need different density and interactivity" (L24) |

The cloud's objective → requirement → prerequisite links are carried by `parent_designation_id`, as the schema expects, not by relationships.

## Assumptions

All six are candidates drawn from open questions in the SCQ issue tree. None is the author's assertion; each restates the belief its question puts in doubt.

| id | on link | statement |
|---|---|---|
| c-asm-shared-is-static | densities conflict | A visual made for sharing has to be a static image |
| c-asm-one-visual-per-use | densities conflict | One visual cannot serve both uses (e.g. by folding, or by cropping a fuller view) |
| g-asm-cold-read-measures-quality | post-needed | A 10-second cold read and "shared as it is" are fair tests |
| g-asm-ai-can-check-output | speed-needed | The AI can check its own output well enough to keep human input ≤5 min |
| g-asm-text-shortens-faithfully | speed-needed | Node text can be shortened faithfully without a person each time |
| r-asm-choices-can-be-settled | unresolved drives | Design choices can be settled once as defaults per use and audience |

## SCQ open questions, mapped

Every open question in the SCQ issue tree (L44–64), with the entity or assumption it would settle.

| SCQ question (line) | settles | note |
|---|---|---|
| What should a visual show? (L44) | `r-e-design-choices-unresolved`, `r-asm-choices-can-be-settled` | parent of the four below |
| Which views: question, hypothesis, or both together? (L45) | `r-asm-choices-can-be-settled` | a default per use |
| How much depth and density for each use? (L46) | `c-rel-densities-conflict`, `c-asm-one-visual-per-use` | the heart of the cloud |
| How do we show answers? (L47) | `r-asm-choices-can-be-settled` | a default per use |
| How do we shorten text faithfully; short labels at the source? (L48) | `g-asm-text-shortens-faithfully` | a source-side short label would make the assumption unnecessary |
| Which formats serve which uses? (L49) | `c-e-sharing-density`, `c-e-thinking-density` | the format plan is the cloud's injection |
| What are the uses, ranked? (L50) | `c-e-both-uses`, `g-e-team-first-audience` | ranking is a plan decision |
| When is interactivity worth it? (L51) | `c-asm-shared-is-static` | |
| What sizes and aspect ratios? (L52) | `c-e-sharing-density` | |
| Do other layouts (radial, …) earn a place? (L54) | `f-e-left-to-right-layout` | layout is decided "for now"; reopening it would change the injection |
| Which 2–3 themes for which audiences? (L55) | `f-e-themes-per-audience`, `r-e-audiences-differ` | |
| Typography, line weight and colour rules per theme? (L56) | `f-e-skill-and-principles`, `r-e-coggle-can-be-garish` | written into the principles |
| How do we make them reliably and quickly? (L57) | `g-e-fifteen-minutes-per-visual`, `r-e-no-reliable-way` | |
| Line between skill/principles and a pure tool? (L58) | `f-e-skill-and-principles`, `r-asm-choices-can-be-settled` | if choices settle into defaults, more of it becomes tool |
| What pipeline: source → JSON → SVG / PNG / HTML? (L59) | `g-e-fifteen-minutes-per-visual` | a plan question, no entity |
| How does it check its own output? (L60) | `g-asm-ai-can-check-output` | |
| How do we know it's good? (L61) | `g-asm-cold-read-measures-quality` | |
| Which tests: cold read, "shared as it is", team use? (L62) | `g-asm-cold-read-measures-quality`, `g-e-usable-for-thinking` | team use tests the thinking CSF |
| Which real trees make up the test set? (L63) | none | a plan question; a test set now exists in `examples/` |
| Where does it live? (L64) | none | settled 2026-11-07: its own repo, `reasoncommons/tree-render` |

## Goal tree review with Rufus (2026-11-07)

- The 2026-11-02 date is a plan milestone, not a critical success factor. It has passed; a new one is set in the plan.
- "Skill before tool" is an approach, not a success factor. It is held as the future-reality injection `f-e-skill-and-principles`.
- The two uses are separate critical success factors: compelling enough to share (`g-e-compelling-to-share`) and usable for thinking together (`g-e-usable-for-thinking`).

## Deliberately omitted

| what | where | why |
|---|---|---|
| The 2026-11-02 deadline as a CSF | SCQ L40 | a plan milestone (2026-11-07 review) |
| "Patterns, principles and a skill first; a pure tool only if it falls out" as a CSF | SCQ L39 | an approach, held as an injection (2026-11-07 review) |
| "A first good set (2–3 formats, 2 themes)" as a CSF | SCQ L40 | a deliverable of the plan, not a condition of success |
| Editing trees, the issuetrees viewer, a hosted app, publishing on issuetrees.com | SCQ L41 | off the table, outside the system boundary |
| The transition view ("move the skill into render/") | SCQ L64 | dropped with the clean start of 2026-11-07: the draft skill is archived, not moved, and the repo starts from this LTP |
| Desired effects for the injections | FRT | the SCQ asserts none; the plan should add them |
| Folding-unused → bullets overwhelm | SCQ L13, L21 | plausible, but no sentence asserts it (see Check these first, 3) |

## Judgment calls for the reviewer

1. **Four CSFs, two of them overlapping** (see Check these first, 2).
2. **The audience as an observation.** "For: Rufus and the Life Itself team first" is a scope statement, so it is not a CSF. It informs how the uses are ranked.
3. **The left-to-right layout as an injection.** The SCQ marks it "decided for now". It is drawn as committed, but its reopening question (L54) is mapped above.
4. **Two pieces of evidence, both from the archived trials.** The poster rejection and the "okay" verdict are Rufus's judgments of 2026-10-17 to 19, recorded in `archive/v0.1/planning/`. They are evidence of taste, not of what readers do.
5. **`r-e-default-is-bullets` leads nowhere.** It is an intermediate cause with no effect linked. The SCQ implies that the default form produces the undesirable effects, but the effects are asserted of bullets generally, not of "the default".

## Validator output

Not machine-validated: the Reason Commons app import check was not run. A PyYAML structural check (2026-11-07) found: 33 entities, 33 designations, 13 relationships, 6 assumptions; no duplicate ids; every reference resolves; no relationship crosses views.

Not linked in their view (14): `g-e-team-first-audience`, `r-e-we-generate-trees`, `r-e-folding-unused`, `r-e-mindmaps-get-shared`, `r-e-hand-judgment`, `r-e-coggle-can-be-garish`, `r-e-audiences-differ`, `r-e-posters-rejected`, the three cloud entities above the prerequisites (linked by designation parents instead), and the three injections. Most are context the SCQ states without asserting a link; the injections lack desired effects (see Deliberately omitted).

## Not in this file

- **No prerequisite or transition view.** The transition view was dropped with the clean start; the implementation plan (`tree-render-bjp.2`) replaces it.
- **No injection that breaks the cloud.** See Check these first, 1.
- **No assessments.** Nobody has yet concluded that a cloud is broken or a branch mitigated.
- **No new date.** Set in the plan.
