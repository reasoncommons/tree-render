# Preparing a tree for rendering (the content step)

A tree visual is made in two steps, like a slide. First, **content**: decide which nodes go in, how deep, and the exact words of each. Second, **render**: draw the prepared text well. This guide is for the first step. The renderer never rewrites text, so every word on the image is a choice you made here. Expect to go back and forth: render, look, cut, render again.

The output of this step is a canonical JSON tree (see [render/TREE-FORMAT.md](render/TREE-FORMAT.md)) plus a `texts.md` that records where each string came from.

## Start from the full tree, not a blank page

You compress an existing argument; you don't write a new one. Start from the source: the full question or hypothesis tree, its answers, and the essay or narrative it supports. The prepared tree is a view of that argument at a glance. If you find yourself inventing a claim to make a branch work, stop: the source needs fixing, not the picture.

## Questions and answers

- **The root is a question**, in plain words a stranger would ask ("How fast should we go?"), not the formal governing question. Keep it under about eight words; put any second clause in `note`.
- **The title is the answer**, as a slogan or headline (≤ 7 words). A hypothesis tree under a question root reads as "question → answer → reasons".
- **The subtitle defines the slogan** in one or two plain sentences (≤ 30 words). A catchy title that the reader can't decode is a weakness; the subtitle says what it means in practice and, if there's room, the single strongest reason.
- **Level 1 are assertions, not topics.** "The world races because it is caught in a collective action trap", not "Race dynamics". Topic labels make a table; assertions make an argument.
- **Don't mix modes in one tree.** A question tree shows questions all the way down; a hypothesis tree shows answers all the way down. Keep the question each node answers in `note` if you want it later.
- **An overview needs an answer too.** A tree of several questions still needs a title that states the overall claim. If the source has none, draft one and flag it.

## Choosing depth and nodes

- **Two levels below the root** is the default for a static image: level 1 carries the argument, level 2 the support. Deeper detail belongs in the essay.
- **3–5 level-1 branches.** If the source has six, merge two or drop the weakest, and record what went. Fewer, stronger branches beat completeness.
- **2–4 leaves per branch.** Pick the leaves that do the most work for the parent claim: evidence, the key mechanism, the main caveat. Skip leaves that only restate the parent.
- **Keep the branches roughly balanced.** One branch with five leaves and another with one looks like a mistake.
- **A parallel point is not a step.** If a branch sits beside the chain rather than following from it (for example "what traditions offer"), don't join it with "and" or "so"; let it stand as a sibling.

## Lead + continuation

Each level-1 node has a **lead**: the bold opening words that carry the claim on their own. The rest of the sentence, the **continuation**, is set lighter and qualifies or explains it. The lead must open the text exactly (`"lead"` is a prefix of `"text"`).

- The lead should read as a complete thought or a strong fragment: "The risks are real", "The world races", "We should slow and steer,".
- Split where a reader scanning only the bold would still get the argument. Read the leads alone, top to bottom: they should tell the story.
- Leaves are plain text, no lead. If a leaf needs a label, use a short prefix with a colon ("Labs: …").

## Length rules

| String | Limit |
| --- | --- |
| Title | ≤ 7 words |
| Subtitle | ≤ 30 words |
| Level-1 lead | ≤ 6 words |
| Level-1 continuation | ≤ 12 words |
| Leaf | ≤ 14 words |

These are ceilings, not targets. A leaf that wraps to three lines in the render is usually too long even if it is within the limit: cut it. An essay in a leaf never works; one claim per string. If something won't fit, the fix is a sharper sentence or a cut clause, never a smaller font. A short checker script that counts words per string catches most breaches before the render does.

## The "So…" branch

A hypothesis tree ends in a synthesis: what follows from the branches above. Make it the last level-1 node, start its lead with "So", and set `"accent": true` so the renderer marks it. Its leaves are usually concrete actions, one per actor ("Labs: …", "States: …", "Individuals: …").

- Use "So" only where the source draws the conclusion. Don't add "so", "because" or "therefore" elsewhere unless the source states that logic.
- Keep modality: if the source says actors *should* do something, the leaf is an imperative or a "should", never a claim that they *do* it.
- Attribute each action to the actor the source names. Don't merge two actors into one line.

## Provenance

Prefer the source's own words. The best text is a verbatim bold lead from the source tree, split into lead and continuation. Next best is a verbatim cut: the source sentence with whole clauses removed. Drafting new wording is the last resort, and every drafted string is marked.

Write a `texts.md` beside the JSON with one entry per string (or per group of verbatim strings): **verbatim**, **verbatim cut** (say what was cut) or **drafted** (give the source sentence it compresses). Also list what was left out of the tree entirely (whole branches, leaves, caveats), so a reviewer can see the cost of compression. Report the share of drafted strings; a high share means the source tree's leads need work.

## Qualifier diff: never drop a qualifier, never add a claim

Drift happens in the small text (leaves, levers, the traditions line), not in the headline, so check every string against its source:

1. **Qualifiers kept.** Hedges, scope and time markers survive compression: "some", "most of the time", "in ordinary use", "yet", "for now", "where teachers guide it", "accountable". Dropping one turns a careful claim into a sweeping one. If a qualifier won't fit, cut a different clause, or cut the claim.
2. **No added claims.** No stronger verbs, no broadened scope ("current AI" → "AI"), no new connectives.
3. **Modality unchanged.** Should ≠ do, can ≠ does, may ≠ will, "can be verified" ≠ "is verified".
4. **Caveats travel with claims.** If the source says traditions answer *what* but not *how*, the limit appears somewhere in that branch.
5. **Right actor.** Each action stays with the actor the source gives it to.

Have a second reader (a subagent works) run the diff with the sources open, flagging each issue as high (a reader would believe something false) or low (nuance). Fix the high ones; record the low ones you keep, and why, in `texts.md`.

## Write for a stranger

- No internal labels: node numbers, "Q2", status words like "signed off" or "Phase A". State draft status once, in the footer.
- Define a slogan or term on first use (the subtitle is the place).
- Keep `alt` text: the root question, the answer, and the level-1 claims in a sentence each.

## Check the render

Render with the default style and look at the PNG. Check that nothing overflows or collides, that no leaf runs to three lines or more, that the bold leads alone tell the argument, and that branch sizes look balanced. Then shorten within the rules and render again.
