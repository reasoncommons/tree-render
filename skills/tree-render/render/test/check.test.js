import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../src/check.js';
import { layout } from '../src/layout.js';
import { draw } from '../src/draw.js';
import { parse } from '../src/parse.js';
import { FORMATS } from '../src/formats.js';
import { createMeasurer, fontFaceCSS } from '../src/measure-node.js';
import { EXAMPLE_FILES, readExample, readFixture } from './helpers.js';

const measure = await createMeasurer();
const fontCSS = fontFaceCSS();
const leads = parse(readFixture('wise-ai-questions-leads.md'));
const run = (tree, opts, extra = {}) => {
  const L = layout(tree, opts, measure);
  return { L, r: check(L, { tree, svg: draw(L, { fontCSS }), measure, ...extra }) };
};
const ids = list => list.map(x => x.check);

test('the Wise AI 16:9 branch slide passes clean', () => {
  const { r } = run(leads, { format: '16x9', root: '2', labels: 'lead', frame: { kicker: 'Wise AI briefing · question tree · Q2 of 4', footer: 'Life Itself · draft' } });
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.metrics.nodes, 18);
});

test('the Wise AI cover passes clean and reports the phone-equivalent size', () => {
  const { r } = run(leads, { format: '4x5', depth: 1, frame: { kicker: 'Wise AI briefing · question tree', footer: 'Life Itself · draft, November 2026' } });
  assert.deepEqual([...r.errors, ...r.warnings], []);
  assert.equal(r.metrics.minFont, 36);
  assert.equal(r.metrics.phoneFont, 13);
});

test('an over-deep DAM render at 4:5 warns on the type floor and the budget, with remedies', () => {
  const { r } = run(parse(readExample('dam-media-questions.md')), { format: '4x5', depth: 3 });
  assert.equal(r.ok, true, 'warnings only');
  assert.ok(ids(r.warnings).includes('floor'), JSON.stringify(r.warnings));
  assert.ok(ids(r.warnings).includes('budget'), JSON.stringify(r.warnings));
  const floor = r.warnings.find(w => w.check === 'floor');
  assert.match(floor.remedy, /open one level less/);
  assert.match(floor.remedy, /carousel/);
  assert.ok(r.metrics.minFont < r.metrics.floor);
});

test('a synthetic overlapping layout is a hard failure', () => {
  const L = layout(parse(readExample('wise-ai-questions.md')), { format: 'web', depth: 2 }, measure);
  const a = L.nodes.find(n => n.num === '1.1'), b = L.nodes.find(n => n.num === '1.2');
  b.top = a.top + 4;
  const r = check(L, { measure });
  assert.equal(r.ok, false);
  const e = r.errors.find(x => x.check === 'overlap');
  assert.ok(e, JSON.stringify(r.errors));
  assert.ok(e.nodes.some(p => p.includes('1.1') && p.includes('1.2')));
});

test('a block crossed by another branch is a hard failure', () => {
  const L = layout(parse(readExample('wise-ai-questions.md')), { format: 'web', depth: 2 }, measure);
  const n = L.nodes.find(x => x.num === '1.1');
  const q2 = L.nodes.find(x => x.num === '2');
  q2.x = n.x - 30; q2.top = n.top; q2.shelf = n.shelf; // drag Q2's block onto Q1's fan
  const r = check(L, { measure });
  assert.ok(ids(r.errors).includes('overlap') || ids(r.errors).includes('ribbon'), JSON.stringify(r.errors));
});

test('overflow: a map scaled past the canvas is a hard failure', () => {
  const L = layout(leads, { format: '4x5', depth: 1 }, measure);
  L.scale *= 1.3;
  const r = check(L, { measure });
  assert.ok(ids(r.errors).includes('overflow'));
});

test('overflow: a footer wider than the canvas is a hard failure', () => {
  const { r } = run(leads, { format: '4x5', depth: 1, frame: { footer: 'x'.repeat(200) } });
  assert.ok(ids(r.errors).includes('overflow'), JSON.stringify(r.errors));
});

test('fidelity: a changed label is a hard failure', () => {
  const tree = parse(readExample('wise-ai-questions.md'));
  const L = layout(tree, { format: '4x5', depth: 1 }, measure);
  L.nodes[1].lines[0] = { ...L.nodes[1].lines[0], t: 'Q1. Alignment (shortened)' };
  const r = check(L, { tree, measure });
  assert.ok(ids(r.errors).includes('fidelity'));
});

test('fidelity holds for every example, format, view and label mode', () => {
  for (const f of EXAMPLE_FILES) {
    const tree = parse(readExample(f));
    for (const format of Object.keys(FORMATS)) for (const view of ['questions', 'qa', 'answers']) for (const labels of ['full', 'lead']) for (const theme of ['paper', 'slate']) {
      const L = layout(tree, { format, view, labels, theme }, measure);
      const r = check(L, { tree, measure });
      assert.ok(!ids(r.errors).includes('fidelity'), `${f} ${format} ${view} ${labels} ${theme}: ${JSON.stringify(r.errors)}`);
    }
  }
  const r = run(leads, { format: 'web', depth: 9, labels: 'lead' }).r;
  assert.ok(!ids(r.errors).includes('fidelity'), JSON.stringify(r.errors));
});

test('no overlaps for every example and format at default depth', () => {
  for (const f of EXAMPLE_FILES) for (const format of Object.keys(FORMATS)) {
    const { r } = run(parse(readExample(f)), { format, frame: { kicker: 'k', footer: 'f' } });
    assert.ok(!ids(r.errors).includes('overlap') && !ids(r.errors).includes('ribbon'), `${f} ${format}: ${JSON.stringify(r.errors)}`);
  }
});

test('fonts: an SVG without embedded fonts is a hard failure', () => {
  const L = layout(leads, { format: '4x5', depth: 1 }, measure);
  const r = check(L, { svg: draw(L, {}), measure });
  assert.ok(ids(r.errors).includes('fonts'));
  const ok = check(L, { svg: draw(L, { fontCSS }), measure });
  assert.ok(!ids(ok.errors).includes('fonts'));
});

test('markers: mixed wording is a hard failure; bare markers need the footer key', () => {
  const L = layout(leads, { format: '4x5', depth: 1, moreWord: 'questions', frame: { footer: 'f' } }, measure);
  const spelled = L.nodes.filter(n => n.hidden);
  spelled[0].moreLabel = '+' + spelled[0].hidden; spelled[0].moreSpelled = false;
  spelled[1].moreLabel = '+' + spelled[1].hidden + ' questions'; spelled[1].moreSpelled = true;
  assert.ok(ids(check(L, { measure }).errors).includes('markers'));
  const B = layout(parse(readExample('wise-ai-questions.md')), { format: '4x5', root: '1', depth: 2 }, measure);
  const r = check(B, { measure });
  assert.ok(ids(r.warnings).includes('markers'), 'no footer: warn that the key is missing');
});

test('view sanity: answers view reports nodes without answers; qa reports long answers', () => {
  const { r } = run(parse(readExample('seeds-rebrand-qa.md')), { format: 'web', view: 'answers', depth: 9 });
  const w = r.warnings.find(x => x.check === 'view');
  assert.ok(w, JSON.stringify(r.warnings));
  assert.ok(w.nodes.length > 0);
  const q = run(parse(readExample('seeds-rebrand-qa.md')), { format: '16x9', view: 'qa', depth: 9 }).r;
  assert.ok(ids(q.warnings).includes('view') || q.metrics.longAnswers === 0);
});

test('report is plain JSON', () => {
  const { r } = run(leads, { format: '1x1', depth: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(r)), r);
  for (const k of ['format', 'W', 'H', 'scale', 'sizeScale', 'minFont', 'floor', 'nodes', 'chars', 'budget', 'mapW', 'mapH']) assert.ok(k in r.metrics, k);
});
