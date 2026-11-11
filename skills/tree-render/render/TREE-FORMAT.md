# Tree format (canonical JSON)

The renderer's one input is a parsed tree. Markdown (spec section 10) is one front-end to it: `tree-render parse tree.md` (or `tree-render tree.md --emit json`) writes the JSON below, and any file in this shape can be passed to `tree-render` in place of Markdown. Layout and drawing only ever see the parsed tree.

## Shape

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
- `kind` (string): `question`, `qa` or `hypothesis`; empty if not given. It sets the default view and the fold-marker noun.
- `source` (string): where the tree came from; empty if not given.
- `root` (node): the root node.
- `subtitle`, `footer`, `alt` (strings, optional): frame text for a static render (subtitle under the title, footer bottom right, alt text). Kept only when present.

A node has:

- `text` (string, required): the full label, plain text (Markdown links reduced to their text, emphasis removed, whitespace collapsed). The renderer never changes it.
- `lead` (string, optional): the short label; it must open `text` exactly (the Markdown bold lead). The continuation is the rest of `text`. Omitted when there is no lead.
- `answer` (string, optional): the answer or hypothesis (the Markdown `- A:` line), plain text. Omitted when there is none.
- `accent` (boolean, optional): mark this branch for the accent colour (for example the "So…" branch of a hypothesis tree).
- `note` (string, optional): a side note, such as the question a node answers. Not drawn yet.
- `children` (array of nodes): may be empty.

Numbering (`2.3`), depth, the continuation and fold counts are derived when the tree is parsed and are not part of the format. Parsing the JSON of a Markdown tree gives an identical tree (tested).
