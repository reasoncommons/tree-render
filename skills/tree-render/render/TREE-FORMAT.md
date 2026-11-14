# Tree format

The renderer reads a tree in Markdown or JSON. Markdown is easier to write by hand; JSON can carry a few extra fields. `node bin/render.js parse tree.md --out tree.json` converts Markdown to JSON, and either can be passed to the renderer.

## Markdown

```markdown
# Go at the speed of wisdom

kind: hypothesis

- How fast should we develop AI?
  - **The risks are real** and contested, and the uncertainty itself calls for caution.
    - The precursors became visible in 2026.
    - Experts disagree deeply on the odds, and we must decide anyway.
  - **So push towards the speed of wisdom:** every actor, with its own lever.
    - Labs: accept binding external checks.
```

- An H1 (`# `) gives the title. It is not drawn on the image.
- Optional `kind:` (`question`, `hypothesis` or `qa`) and `source:` lines.
- Nested `- ` bullets, indented two spaces per level. The first top-level bullet is the root; any later top-level bullets are ignored.
- A bullet that opens with `**bold**` text has a lead: the bold words, drawn heavier. The rest of the bullet is the continuation.
- A bullet starting `A: ` is the answer to its parent, not a node of its own. Current styles don't draw answers.
- Links are reduced to their text and other emphasis is removed.

A full example is [examples/speed-of-wisdom.md](../../../examples/speed-of-wisdom.md).

## JSON

```json
{
  "title": "Wise AI: question tree",
  "kind": "question",
  "source": "life-itself/ai-wise/projects/wise-ai-briefing/question-tree.md",
  "root": {
    "text": "How should we approach the development of AI wisely, and what do wisdom traditions offer?",
    "children": [
      { "text": "Q1. Alignment: can we align AI, and what role can wisdom traditions play?", "lead": "Q1. Alignment:", "answer": "Alignment is still a shot in the dark.", "children": [] }
    ]
  }
}
```

## Fields

- `title` (string): the tree's title; the Markdown H1. Empty string if none.
- `kind` (string): `question`, `qa` or `hypothesis`; empty if not given. Used only by the legacy canvas render.
- `source` (string): where the tree came from; empty if not given.
- `root` (node): the root node.
- `subtitle`, `footer`, `alt` (strings, optional): frame text. Only the legacy canvas render draws them; keep `alt` for the alt text of the image on your page.

A node has:

- `text` (string, required): the full label, plain text (Markdown links reduced to their text, emphasis removed, whitespace collapsed). The renderer never changes it.
- `lead` (string, optional): the short label; it must open `text` exactly (the Markdown bold lead). The continuation is the rest of `text`. Omitted when there is no lead.
- `answer` (string, optional): the answer or hypothesis (the Markdown `- A:` line), plain text. Omitted when there is none. Not drawn by the current styles.
- `accent` (boolean, optional): mark this level-1 branch for the accent colour (for example the "So…" branch of a hypothesis tree). With `--palette`, if no node is marked, the first level-1 node starting "So" gets the accent.
- `colour` (string, optional): a `#rrggbb` branch colour for this node, used by `coggle-exact` and `coggle-thin` (Coggle stores a colour per node). Its descendants vary it slightly, as Coggle does.
- `textSize` (number, optional): font size in px for this node, used by `coggle-exact` and `coggle-thin` (Coggle's per-node `text_size`; the default is 17 / 15.3 / 13 / 12 px by level).
- `note` (string, optional): a side note, such as the question a node answers. Not drawn yet.
- `children` (array of nodes): may be empty.

Numbering (`2.3`), depth, the continuation and fold counts are derived when the tree is parsed and are not part of the format. Parsing the JSON of a Markdown tree gives an identical tree (tested).
