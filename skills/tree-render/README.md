# tree-render skill

Turns a question or hypothesis tree into a static SVG and PNG for web pages and reports. Two steps: prepare the content (lead, continuation, length limits), then render it with a Node CLI. The default style is `river`; `--style coggle` is calmer.

## Install

```
cd skills/tree-render/render && npm install
ln -s "$PWD/.." ~/.claude/skills/tree-render
```

Needs Node 20 or later, and Chrome or Playwright's chromium for the PNG.

## Example

```
cd skills/tree-render/render
node bin/render.js test/fixtures/v01-q2.json --out out/demo
```

Writes `out/demo/v01-q2.svg`, `out/demo/v01-q2.png` and `out/demo/v01-q2.report.json`.

## Docs

- [SKILL.md](SKILL.md): the workflow, for agents.
- [CONTENT-GUIDE.md](CONTENT-GUIDE.md): preparing the text (step 1).
- [render/TREE-FORMAT.md](render/TREE-FORMAT.md): the canonical JSON tree.
