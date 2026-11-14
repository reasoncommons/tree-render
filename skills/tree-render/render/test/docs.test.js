// Docs smoke test: every `node … render.js …` command (fenced or inline code) in README.md or SKILL.md runs and
// exits 0 against the examples (with --no-png), and every flag the docs use is listed in --help. Keeps the
// docs from drifting from the CLI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { here, EXAMPLES } from './helpers.js';

const RENDER = path.resolve(here, '..');
const BIN = path.join(RENDER, 'bin', 'render.js');
const ROOT = path.resolve(RENDER, '..', '..', '..');
const DOCS = [path.join(ROOT, 'README.md'), path.join(ROOT, 'skills', 'tree-render', 'SKILL.md')];
const EXAMPLE = path.join(EXAMPLES, 'speed-of-wisdom.md');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-render-docs-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

// Commands that run the renderer: lines inside fenced blocks, and inline code spans: from `node` up to a `&&`, `;` or `#` comment.
export function docCommands(md) {
  const cmds = [];
  let fenced = false;
  for (const line of md.split('\n')) {
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    if (!fenced) continue;
    const m = /(?:^\s*|&&\s*|;\s*)(node\s+\S*render\.js\b[^&;#]*)/.exec(line);
    if (m) cmds.push(m[1].trim());
  }
  for (const m of md.matchAll(/`(node\s+\S*render\.js\b[^`]*)`/g)) cmds.push(m[1].trim()); // inline code
  return cmds;
}

// Placeholders and paths in a doc command → real files: the tree → the bundled example (or its JSON),
// --out → a fresh folder, relative paths as seen from skills/tree-render/render/.
function resolveArgs(cmd, i) {
  const toks = cmd.split(/\s+/).slice(1);
  const json = path.join(dir, 'tree.json');
  const args = toks.map((t, k) => {
    if (/render\.js$/.test(t)) return BIN;
    if (toks[k - 1] === '--out') return /\.json$/.test(t) ? path.join(dir, `out-${i}.json`) : path.join(dir, `out-${i}`);
    if (/(^|\/)tree\.md$/.test(t)) return EXAMPLE;
    if (/(^|\/)tree\.json$/.test(t)) return json;
    if (!t.startsWith('-') && fs.existsSync(path.resolve(RENDER, t))) return path.resolve(RENDER, t);
    return t;
  });
  if (args[1] !== 'parse' && !args.includes('--no-png')) args.push('--no-png');
  return args;
}

const run = args => spawnSync(process.execPath, args, { encoding: 'utf8', cwd: dir });

test('docs: the tree.json placeholder exists (parse the example)', () => {
  const r = run([BIN, 'parse', EXAMPLE, '--out', path.join(dir, 'tree.json')]);
  assert.equal(r.status, 0, r.stderr);
});

for (const doc of DOCS) {
  const name = path.relative(ROOT, doc);
  const cmds = docCommands(fs.readFileSync(doc, 'utf8'));
  test(`docs: ${name} has renderer commands`, () => assert.ok(cmds.length > 0));
  cmds.forEach((cmd, i) => {
    test(`docs: ${name}: ${cmd}`, () => {
      if (!fs.existsSync(path.join(dir, 'tree.json'))) run([BIN, 'parse', EXAMPLE, '--out', path.join(dir, 'tree.json')]);
      const r = run(resolveArgs(cmd, `${path.basename(doc)}-${i}`));
      assert.equal(r.status, 0, `exit ${r.status}\n${r.stdout}${r.stderr}`);
    });
  });
}

test('docs: every --flag in README.md and SKILL.md is in --help', () => {
  const help = run([BIN, '--help']).stdout;
  const flags = new Set();
  // Flags in renderer commands and in inline code (`--style NAME`); other tools' flags (git) are skipped.
  for (const doc of DOCS) {
    const md = fs.readFileSync(doc, 'utf8');
    const spans = [...docCommands(md), ...[...md.matchAll(/`(--[^`]*)`/g)].map(m => m[1])];
    for (const s of spans) for (const m of s.matchAll(/(?<![\w-])--([a-z][a-z-]*)/g)) flags.add(m[1]);
  }
  // SKILL.md names a few legacy flags (--format, --theme, --html) to say they are legacy: `--help legacy` lists those.
  const legacy = run([BIN, '--help', 'legacy']).stdout;
  for (const f of flags) assert.ok(help.includes('--' + f) || legacy.includes('--' + f), `--${f} is in the docs but not in --help`);
});
