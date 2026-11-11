import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, clean, count, find, prune, reroot, toJSON } from '../src/parse.js';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { here, EXAMPLES, FIXTURES } from './helpers.js';
import { EXAMPLE_FILES, readExample, readFixture } from './helpers.js';

const expected = {
  'dam-media-questions.md': { nodes: 12, answers: 0 },
  'taiwan-trip-issue-tree.md': { nodes: 53, answers: 0 },
  'seeds-rebrand-qa.md': { nodes: 33, answers: 16 },
  'wise-ai-questions.md': { nodes: 94, answers: 0 },
  'wise-ai-answers.md': { nodes: 94, answers: 93 },
};

function all(n) { return [n, ...n.children.flatMap(all)]; }

for (const f of EXAMPLE_FILES) {
  test(`${f}: node and answer counts match examples/README.md`, () => {
    const t = parse(readExample(f));
    const nodes = all(t.root);
    assert.equal(nodes.length, expected[f].nodes);
    assert.equal(1 + count(t.root), expected[f].nodes);
    assert.equal(nodes.filter(n => n.answer).length, expected[f].answers);
  });

  test(`${f}: A: lines never become nodes`, () => {
    const t = parse(readExample(f));
    for (const n of all(t.root)) assert.doesNotMatch(n.text, /^A:/);
  });
}

test('title, kind and source are read', () => {
  const t = parse(readExample('wise-ai-questions.md'));
  assert.equal(t.title, 'Wise AI: question tree');
  assert.equal(t.kind, 'question');
  assert.equal(t.source, 'life-itself/ai-wise/projects/wise-ai-briefing/question-tree.md');
});

test('nodes carry depth, index and num', () => {
  const t = parse(readExample('wise-ai-questions.md'));
  assert.equal(t.root.depth, 0);
  const q2 = t.root.children[1];
  assert.equal(q2.num, '2');
  assert.equal(q2.index, 1);
  assert.equal(q2.depth, 1);
  assert.equal(q2.children[2].num, '2.3');
  assert.equal(q2.children[2].children[0].depth, 3);
});

test('bold leads split: **Lead:** form', () => {
  const t = parse('# T\n\n- Root\n  - **Q1. Alignment:** can we align AI?\n');
  const n = t.root.children[0];
  assert.equal(n.lead, 'Q1. Alignment:');
  assert.equal(n.cont, 'can we align AI?');
  assert.equal(n.text, 'Q1. Alignment: can we align AI?');
});

test('bold leads split: **Lead** form and lead-only line', () => {
  const t = parse('# T\n\n- Root\n  - **Will current methods scale?** What is the case?\n  - **Just a lead**\n');
  const [a, b] = t.root.children;
  assert.equal(a.lead, 'Will current methods scale?');
  assert.equal(a.cont, 'What is the case?');
  assert.equal(b.lead, 'Just a lead');
  assert.equal(b.cont, '');
  assert.equal(b.text, 'Just a lead');
});

test('no lead: lead and cont are null', () => {
  const t = parse('# T\n\n- Root question?\n');
  assert.equal(t.root.lead, null);
  assert.equal(t.root.cont, null);
  assert.equal(t.root.text, 'Root question?');
});

test('the rejected "Lead | rest" shorthand is not split', () => {
  const t = parse('# T\n\n- Root\n  - Lead | the rest\n');
  const n = t.root.children[0];
  assert.equal(n.lead, null);
  assert.equal(n.text, 'Lead | the rest');
});

test('links and emphasis are cleaned, whitespace collapsed', () => {
  assert.equal(clean('See [the doc](https://x.y/z) and *this*  and **that**'), 'See the doc and this and that');
  assert.equal(clean('what can traditions *not* tell us?'), 'what can traditions not tell us?');
  const t = parse(readExample('seeds-rebrand-qa.md'));
  for (const n of all(t.root)) {
    assert.doesNotMatch(n.text, /\]\(/);
    if (n.answer) assert.doesNotMatch(n.answer, /\]\(|\*\*/);
  }
});

test('emoji and status markers are kept', () => {
  const t = parse(readExample('taiwan-trip-issue-tree.md'));
  assert.match(t.root.children[0].text, /🔥/);
});

test('re-root at 2.3 of the Wise AI tree yields the node with 3 children', () => {
  const t = parse(readExample('wise-ai-questions.md'));
  const r = reroot(t.root, '2.3');
  assert.equal(r.text, 'Should we change pace or trajectory, and can we?');
  assert.equal(r.children.length, 3);
  assert.equal(r.depth, 0);
  assert.equal(r.children[0].depth, 1);
  assert.equal(r.num, '2.3');
  assert.equal(r.children[0].num, '2.3.1');
  assert.equal(r.branchIndex, 1, 'keeps its top-level ancestor index for the hue');
  assert.notEqual(r, find(t.root, n => n.num === '2.3'), 'returns a copy');
  assert.equal(reroot(t.root, '9.9'), null);
});

test('prune cuts at a depth and records hidden counts, without mutating', () => {
  const t = parse(readExample('wise-ai-questions.md'));
  const p = prune(t.root, 1);
  assert.equal(p.children.length, 4);
  assert.equal(p.hidden, 0);
  for (const [i, c] of p.children.entries()) {
    assert.equal(c.children.length, 0);
    assert.equal(c.hidden, count(t.root.children[i]));
  }
  assert.equal(p.children.reduce((s, c) => s + c.hidden, 0) + 5, 94);
  assert.ok(t.root.children[0].children.length > 0, 'source untouched');
  assert.equal(t.root.children[0].hidden, undefined);
  const deep = prune(t.root, 99);
  assert.equal(1 + count(deep), 94);
});

test('prune honours a fold set', () => {
  const t = parse(readExample('wise-ai-questions.md'));
  const p = prune(t.root, 99, ['2']);
  assert.equal(p.children[1].children.length, 0);
  assert.equal(p.children[1].hidden, count(t.root.children[1]));
  assert.ok(p.children[0].children.length > 0);
});

test('JSON input is accepted and normalised', () => {
  const t = parse(readExample('wise-ai-questions.md'));
  const strip = n => ({ text: n.text, lead: n.lead, cont: n.cont, answer: n.answer, children: n.children.map(strip) });
  const json = JSON.stringify({ title: t.title, kind: t.kind, source: t.source, root: strip(t.root) });
  const j = parse(json);
  assert.equal(j.title, t.title);
  assert.equal(1 + count(j.root), 94);
  assert.equal(find(j.root, n => n.num === '2.3').children.length, 3);
  const k = parse({ root: { lead: 'L', cont: 'rest', children: [{ text: 'c' }] } });
  assert.equal(k.root.text, 'L rest');
  assert.equal(k.root.children[0].num, '1');
  assert.equal(k.root.children[0].answer, null);
});

// Fidelity: every node's label is exactly the cleaned source bullet. The reference cleaner here
// is written independently of src/parse.js.
function refClean(s) {
  return s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').replace(/\*([^*]+)\*/g, '$1').replace(/\s+/g, ' ').trim();
}
const fidelityFiles = [...EXAMPLE_FILES.map(f => [f, readExample(f)]), ...['wise-ai-questions-leads.md', 'wise-ai-answers-leads.md'].map(f => [f, readFixture(f)])];
for (const [f, md] of fidelityFiles) {
  test(`${f}: fidelity, every label equals its cleaned source line`, () => {
    const lines = md.split(/\r?\n/).map(l => /^\s*-\s+(.*)$/.exec(l)).filter(Boolean).map(m => m[1]).filter(t => !/^A:\s*/.test(t));
    const nodes = all(parse(md).root);
    assert.equal(nodes.length, lines.length);
    nodes.forEach((n, i) => {
      const label = n.lead != null ? (n.cont ? n.lead + ' ' + n.cont : n.lead) : n.text;
      assert.equal(label, refClean(lines[i]));
      assert.equal(n.text, refClean(lines[i]));
    });
  });
}

test('leads fixture: leads are found', () => {
  const t = parse(readFixture('wise-ai-questions-leads.md'));
  const q1 = t.root.children[0];
  assert.equal(q1.lead, 'Q1. Alignment:');
  assert.ok(all(t.root).filter(n => n.lead).length >= 30);
});

const roundTripFiles = [...EXAMPLE_FILES.map(f => path.join(EXAMPLES, f)), ...['wise-ai-questions-leads.md', 'wise-ai-answers-leads.md'].map(f => path.join(FIXTURES, f))];
for (const file of roundTripFiles) {
  test(`${path.basename(file)}: md → json → parse gives an identical tree`, async () => {
    const md = (await import('node:fs')).readFileSync(file, 'utf8');
    const t = parse(md);
    const json = JSON.stringify(toJSON(t));
    assert.deepEqual(parse(json), t);
    assert.deepEqual(parse(JSON.parse(json)), t);
    assert.deepEqual(toJSON(parse(json)), JSON.parse(json));
  });
}

test('canonical JSON: only documented fields are emitted', () => {
  const j = toJSON(parse(readFixture('wise-ai-answers-leads.md')));
  assert.deepEqual(Object.keys(j), ['title', 'kind', 'source', 'root']);
  const keys = new Set();
  const walk = (n) => { Object.keys(n).forEach(k => keys.add(k)); n.children.forEach(walk); };
  walk(j.root);
  assert.deepEqual([...keys].sort(), ['answer', 'children', 'lead', 'text']);
});

test('canonical JSON: a lead that does not open the text is rejected', () => {
  assert.throws(() => parse({ root: { text: 'abc def', lead: 'xyz' } }), /does not open/);
});

test('CLI: parse subcommand and --emit json write the canonical JSON', () => {
  const bin = path.join(here, '..', 'bin', 'render.js');
  const file = path.join(EXAMPLES, 'wise-ai-answers.md');
  const expected = toJSON(parse(readExample('wise-ai-answers.md')));
  assert.deepEqual(JSON.parse(execFileSync(process.execPath, [bin, 'parse', file]).toString()), expected);
  assert.deepEqual(JSON.parse(execFileSync(process.execPath, [bin, file, '--emit', 'json']).toString()), expected);
});

test('tree JSON keeps the frame fields (subtitle, footer) and node accent and note', async () => {
  const { readFixture } = await import('./helpers.js');
  const t = parse(readFixture('v01-q2.json'));
  assert.equal(t.root.text, 'How fast should we develop AI?');
  assert.match(t.subtitle, /^Pace AI/);
  assert.match(t.footer, /Rufus Pollock/);
  const so = t.root.children[4];
  assert.equal(so.lead, 'So every actor should push');
  assert.equal(so.cont, 'towards the speed of wisdom, each with its own lever.');
  assert.equal(so.accent, true);
  assert.equal(t.root.children[0].accent, undefined);
  const again = parse(JSON.stringify(toJSON(t)));
  assert.deepEqual(toJSON(again), toJSON(t));
  const o = parse(readFixture('v01-overview.json'));
  assert.equal(o.root.children[0].note, 'Can we make AI good?');
});
