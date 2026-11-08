import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, overlaps } from '../src/layout.js';
import { getFormat, FORMATS } from '../src/formats.js';
import { parse } from '../src/parse.js';
import { createMeasurer } from '../src/measure-node.js';
import { EXAMPLE_FILES, readExample, readFixture } from './helpers.js';

const measure = await createMeasurer();
const VIEWS = ['questions', 'qa', 'answers'];
const trees = Object.fromEntries(EXAMPLE_FILES.map(f => [f, parse(readExample(f))]));

for (const f of EXAMPLE_FILES) {
  for (const format of Object.keys(FORMATS)) {
    for (const view of VIEWS) {
      test(`${f} ${format} ${view}: no overlaps, fits, root centred`, () => {
        const L = layout(trees[f], { format, view }, measure);
        assert.deepEqual(overlaps(L.nodes), []);
        const F = getFormat(format);
        // the map as fitted (mapW × scale) stays inside avail (spec 9.2: availW = W − 2·margin)
        if (F.W) assert.ok(L.mapW * L.scale <= F.W - 2 * F.margin + 0.5, `mapW ${L.mapW.toFixed(1)} × ${L.scale.toFixed(3)}`);
        const root = L.nodes[0];
        if (root.children.length) {
          const kids = root.children;
          // flextree centres a parent on the span of its children's blocks (first top to last bottom)
          const last = kids[kids.length - 1];
          const mid = (kids[0].top + last.top + last.h) / 2;
          assert.ok(Math.abs(root.cy - mid) <= 1, `root ${root.cy} vs children ${mid}`);
        }
        assert.ok(L.scale > 0 && L.scale <= 1);
      });
    }
  }
}

test('layout does not mutate the parsed tree', () => {
  const t = parse(readExample('wise-ai-questions.md'));
  const before = JSON.stringify(t);
  layout(t, { format: '4x5', depth: 2 }, measure);
  assert.equal(JSON.stringify(t), before);
});

test('defaults: 4x5 opens root + 1, web root + 2; kind qa defaults to answers view', () => {
  const a = layout(trees['wise-ai-questions.md'], { format: '4x5' }, measure);
  assert.equal(a.nodes.length, 5);
  const b = layout(trees['wise-ai-questions.md'], { format: 'web' }, measure);
  assert.equal(Math.max(...b.nodes.map(n => n.depth)), 2);
  assert.equal(b.scale, 1);
  assert.ok(b.W > 0 && b.H > 0);
  assert.equal(layout(trees['wise-ai-answers.md'], { format: 'web' }, measure).view, 'answers');
  assert.equal(b.view, 'questions');
});

// The cover is the Wise AI tree with bold leads (spec 1: grow lifts its 31 px continuations to 36 px).
test('grow-to-fill picks 1.15 for the Wise AI cover', () => {
  const L = layout(parse(readFixture('wise-ai-questions-leads.md')), { format: '4x5', depth: 1, frame: { kicker: 'Wise AI briefing · question tree', footer: 'Life Itself · draft' } }, measure);
  assert.equal(L.sizeScale, 1.15);
  assert.ok(L.scale >= 0.995);
  assert.equal(Math.min(...L.nodes.flatMap(n => n.lines.map(l => l.size))), 36);
});

test('columns: x follows column widths and gaps', () => {
  const L = layout(trees['wise-ai-questions.md'], { format: 'web', depth: 3 }, measure);
  for (const n of L.nodes) assert.equal(n.x, L.colX[n.depth]);
  for (let d = 1; d < L.colX.length; d++) assert.equal(L.colX[d], L.colX[d - 1] + L.depthW[d - 1] + L.format.gapX[Math.min(d - 1, L.format.gapX.length - 1)]);
});

test('shelf sits 0.26 × last line size under the block', () => {
  const L = layout(trees['dam-media-questions.md'], { format: '16x9' }, measure);
  for (const n of L.nodes) {
    const last = n.lines[n.lines.length - 1];
    assert.ok(Math.abs(n.shelf - (n.top + n.h + 0.26 * last.size)) < 1e-9);
  }
});

function markerWords(L) { return L.nodes.filter(n => n.hidden).map(n => / /.test(n.moreLabel)); }

test('cover markers spell the noun when they fit, all of them', () => {
  const t = parse('# T\nkind: question\n\n- Why?\n  - Who?\n    - a\n    - b\n  - How?\n    - c\n');
  const L = layout(t, { format: '4x5', depth: 1, frame: { footer: 'x' } }, measure);
  assert.deepEqual(L.nodes.filter(n => n.hidden).map(n => n.moreLabel), ['+2 questions', '+1 questions']);
  assert.equal(L.frame.footer, 'x', 'no key when spelled');
  const H = layout({ ...t, kind: 'hypothesis' }, { format: '4x5', depth: 1 }, measure);
  assert.equal(H.nodes[1].moreLabel, '+2 points');
});

test('all-or-none marker wording holds for every example and format', () => {
  for (const f of EXAMPLE_FILES) for (const format of Object.keys(FORMATS)) for (const depth of [1, 2]) {
    const L = layout(trees[f], { format, depth, frame: { footer: 'foot' } }, measure);
    const w = markerWords(L);
    assert.ok(w.every(Boolean) || w.every(x => !x), `${f} ${format} depth ${depth}: mixed`);
    if (F_fixed(format) && w.length && !w[0]) assert.match(L.frame.footer, /^\+N: (questions|points) folded beneath {2}· {2}foot$/);
  }
});
function F_fixed(format) { return !!FORMATS[format].W; }

test('bare markers on a branch card get the footer key', () => {
  const L = layout(trees['wise-ai-questions.md'], { format: '4x5', root: '1', depth: 2, frame: { footer: 'foot' } }, measure);
  const w = markerWords(L);
  assert.ok(w.length > 0 && w.every(x => !x));
  assert.equal(L.frame.footer, '+N: questions folded beneath  ·  foot');
});

test('re-rooted card keeps its top-level hue; hue "fresh" drops it', () => {
  const L = layout(trees['wise-ai-questions.md'], { format: '4x5', root: '2.3', depth: 2 }, measure);
  assert.equal(L.nodes[0].num, '2.3');
  assert.ok(L.nodes.every(n => n.hueIndex === 1));
  const M = layout(trees['wise-ai-questions.md'], { format: '4x5', root: '2', depth: 2, hue: 'fresh' }, measure);
  assert.deepEqual(M.nodes.filter(n => n.depth === 1).map(n => n.hueIndex), [0, 1, 2, 3, 4]);
});

test('lead labels: lead-only drops the continuation with punctuation rules', () => {
  const t = parse(readFixture('wise-ai-questions-leads.md'));
  const L = layout(t, { format: 'web', depth: 3, labels: 'lead' }, measure);
  const label = (num) => L.nodes.find(n => n.num === num).lines.map(l => l.t).join(' ');
  assert.equal(label('1'), 'Q1. Alignment'); // trailing ":" dropped
  assert.equal(label('1.2.1'), 'What are the main approaches…'); // trailing "," → "…"
  assert.equal(label('1.2.4'), 'Will current methods scale?');
  const F = layout(t, { format: 'web', depth: 3, labels: 'full' }, measure);
  assert.equal(F.nodes.find(n => n.num === '1').lines.map(l => l.t).join(' '), 'Q1. Alignment: can we align AI, and what role can wisdom traditions play?');
});

test('answers view: root question is a muted kicker above the root answer', () => {
  const t = parse(readExample('seeds-rebrand-qa.md'));
  const L = layout(t, { format: 'web', view: 'answers' }, measure);
  const withAnswer = L.nodes.filter(n => n.depth > 0 && n.src.answer);
  for (const n of withAnswer) assert.equal(n.lines.map(l => l.t).join(' '), n.src.answer);
});

test('fold set closes nodes in the layout', () => {
  const L = layout(trees['wise-ai-questions.md'], { format: 'web', depth: 2, fold: ['2'] }, measure);
  const q2 = L.nodes.find(n => n.num === '2');
  assert.equal(q2.children.length, 0);
  assert.ok(q2.hidden > 0);
});

test('Slate numbers labels, skipping ones that start with a number', () => {
  const L = layout(trees['wise-ai-questions.md'], { format: 'web', depth: 2, theme: 'slate' }, measure);
  assert.match(L.nodes.find(n => n.num === '1.1').lines[0].t, /^1\.1 What/);
  assert.match(L.nodes.find(n => n.num === '1').lines[0].t, /^Q1\. /);
});

test('candidate rule (spec 13): extra air before a childless node after a sibling with children (Q2 card)', () => {
  const t = parse(readFixture('wise-ai-questions-leads.md'));
  const opts = { format: '4x5', root: '2', depth: 2, labels: 'lead' };
  const on = layout(t, opts, measure);
  const off = layout(t, { ...opts, airAfterBranch: false }, measure);
  const gap = (L) => {
    const a = L.nodes.find(n => n.num === '2.4'), b = L.nodes.find(n => n.num === '2.5');
    return b.top - (a.top + a.h);
  };
  assert.ok(on.nodes.find(n => n.num === '2.4').children.length > 0 && on.nodes.find(n => n.num === '2.5').children.length === 0);
  const lh = on.nodes.find(n => n.num === '2.5').lh;
  assert.ok(Math.abs((gap(on) - gap(off)) - 0.5 * lh) < 1, `on ${gap(on)} off ${gap(off)} lh ${lh}`);
  assert.deepEqual(overlaps(on.nodes), []);
});

test('fit: the map is left-aligned at the margin and centred vertically', () => {
  const L = layout(trees['dam-media-questions.md'], { format: '16x9', frame: { kicker: 'k', footer: 'f' } }, measure);
  const F = L.format;
  assert.equal(L.ox, F.margin);
  const kickerH = F.kicker * 2.2, footerH = F.footer * 2.4;
  const availH = F.H - 2 * F.margin - kickerH - footerH;
  assert.ok(Math.abs(L.oy - (F.margin + kickerH + Math.max(0, (availH - L.mapH * L.scale) / 2))) < 1e-9);
});

test('a fan that would cross a wider sibling below starts past it (shelf extended within the column)', () => {
  const L = layout(parse(readExample('seeds-rebrand-qa.md')), { format: '16x9', frame: { kicker: 'k', footer: 'f' } }, measure);
  const p = L.nodes.find(n => n.num === '3');
  assert.ok(p.shelfExtra > 0, 'shelf of node 3 extended');
  assert.ok(p.x + p.w + p.moreW + L.format.shelfOver + p.shelfExtra <= L.colX[1] + L.depthW[1] + 1e-6, 'within its column');
  for (const n of L.nodes) if (n.num !== '3') assert.ok(!(n.shelfExtra > 0) || n.children.length, `${n.num} only parents extend`);
});
