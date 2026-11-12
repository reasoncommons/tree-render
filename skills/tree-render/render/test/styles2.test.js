// The ribbon, dendrogram and lanes styles (src/styles2/): every fixture renders with no overlaps, with and
// without the root box; the root is centred on its dot; ribbon has no dots at the ribbons' ends, lanes does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../src/parse.js';
import { STYLES2, STYLE2_NAMES, drawStyle2 } from '../src/styles2/index.js';
import { FIXTURES, readFixture } from './helpers.js';

const fixtures = fs.readdirSync(FIXTURES).filter(f => /\.(json|md)$/.test(f));
const Q2 = parse(readFixture('v01-q2.json'));

test('the three styles are ribbon, dendrogram and lanes', () => {
  assert.deepEqual(STYLE2_NAMES, ['ribbon', 'dendrogram', 'lanes']);
  assert.throws(() => drawStyle2(Q2, 'nope'), /unknown style/);
});

for (const style of STYLE2_NAMES) for (const rootBox of [false, true]) {
  test(`${style}${rootBox ? ' (root box)' : ''}: every fixture renders with no overlaps`, () => {
    for (const f of fixtures) {
      const cv = STYLES2[style](parse(readFixture(f)), { rootBox });
      assert.deepEqual(cv.check(), [], f);
      assert.match(cv.toSVG(), /^<svg /);
    }
  });
}

const circles = (svg) => [...svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/g)].map(m => ({ x: +m[1], y: +m[2], r: +m[3] }));

test('ribbon: one dot (the root), none at the ribbons\' ends; lanes keeps a dot per answer', () => {
  const r = circles(drawStyle2(Q2, 'ribbon').els.join(''));
  assert.equal(r.length, 1);
  const n = Q2.root.children.length;
  assert.ok(circles(drawStyle2(Q2, 'lanes').els.join('')).length >= 1 + n);
});

test('the root text is vertically centred on the root dot', () => {
  for (const style of ['ribbon', 'dendrogram']) {
    const cv = drawStyle2(Q2, style), [dot] = circles(cv.els.join(''));
    const lines = cv.texts.filter(t => t.x1 <= dot.x);  // the root block sits left of its dot
    const mid = (Math.min(...lines.map(t => t.y0)) + Math.max(...lines.map(t => t.y1))) / 2;
    assert.ok(Math.abs(mid - dot.y) < 4, `${style}: text middle ${mid} vs dot ${dot.y}`);
  }
});

test('root box: a light rounded box, no root dot, branches leaving its right edge at mid-height', () => {
  for (const style of ['ribbon', 'dendrogram']) {
    const cv = drawStyle2(Q2, style, { rootBox: true }), svg = cv.els.join('');
    const [, x, y, w, h] = /<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="8" fill="#ececec"\/>/.exec(svg).map(Number);
    assert.ok(Math.abs(x + w) < 0.01, 'right edge at x = 0');
    assert.ok(!circles(svg).some(c => Math.abs(c.x - x - w) < 6), 'no dot at the box edge');
    // every level-1 branch (its centre line) starts at (0, box middle)
    const starts = cv.strokes.filter(s => s.width).map(s => s.pts[0]).filter(p => Math.abs(p.x) < 0.01);
    assert.ok(starts.length >= Q2.root.children.length, style);
    for (const p of starts) assert.ok(Math.abs(p.y - (y + h / 2)) < 0.01, `${style}: start ${p.y} vs ${y + h / 2}`);
  }
});
