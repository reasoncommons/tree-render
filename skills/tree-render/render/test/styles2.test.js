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

test('root style: centred lines on the dot, or a thin outlined box (no fill); both render with no overlaps', () => {
  for (const style of ['ribbon', 'dendrogram']) {
    const c = drawStyle2(Q2, style, { rootCentre: true }), svgC = c.els.join('');
    assert.deepEqual(c.check(), [], `${style} centre`);
    assert.match(svgC, /text-anchor="middle"/, `${style}: centred root`);
    const o = drawStyle2(Q2, style, { rootBox: 'outline' }), svgO = o.els.join('');
    assert.deepEqual(o.check(), [], `${style} outline`);
    assert.match(svgO, /<rect [^>]*rx="0" fill="none" stroke="#5d584f" stroke-width="1.25"\/>/, `${style}: outlined box`);
  }
});

// curve 'coggle' (bead tree_render-5q0.8): Coggle's cubic for the level-1 branches (and ribbon's hairlines).
test('curve coggle: every fixture renders with no overlaps; coggle is the default, ribbon (alias current) the older S; level-1 branches use Coggle\'s control points', async () => {
  const { branchControlPoints } = await import('../src/coggle/geometry.js');
  for (const style of STYLE2_NAMES) {
    for (const f of fixtures) for (const curve of ['coggle', 'coggle-l1', 'ribbon']) {
      const cv = STYLES2[style](parse(readFixture(f)), { curve });
      assert.deepEqual(cv.check(), [], `${style} ${curve} ${f}`);
    }
    const def = drawStyle2(Q2, style).toSVG();
    assert.equal(drawStyle2(Q2, style, { curve: 'coggle' }).toSVG(), def, style);
    assert.equal(drawStyle2(Q2, style, { curve: 'current' }).toSVG(), drawStyle2(Q2, style, { curve: 'ribbon' }).toSVG(), style);
    assert.notEqual(drawStyle2(Q2, style, { curve: 'ribbon' }).toSVG(), def, style);
    assert.throws(() => drawStyle2(Q2, style, { curve: 'wiggly' }), /unknown curve/);
  }
  // dendrogram strokes the centre line itself: its level-1 paths are exactly Coggle's cubic from the root dot.
  const paths = [...drawStyle2(Q2, 'dendrogram', { curve: 'coggle' }).els.join('').matchAll(/<path d="M ([-\d.]+) ([-\d.]+) C ([-\d. ]+)"/g)];
  assert.equal(paths.length, Q2.root.children.length);
  for (const m of paths) {
    const n = m[3].trim().split(/\s+/).map(Number), from = { x: +m[1], y: +m[2] }, to = { x: n[4], y: n[5] };
    const p = branchControlPoints(from, to);
    assert.ok(Math.abs(p[1].x - n[0]) < 0.01 && Math.abs(p[2].x - n[2]) < 0.01, 'control points');
    assert.ok(Math.abs(n[1] - from.y) < 0.01 && Math.abs(n[3] - to.y) < 0.01, 'horizontal tangents');
  }
  // ribbon: the hairlines are Coggle's with 'coggle', the older S with 'coggle-l1' (the hub is in the same place).
  const hairs = (o) => drawStyle2(Q2, 'ribbon', o).els.filter(e => /stroke-width="1.5"/.test(e)).join('');
  assert.notEqual(hairs({ curve: 'coggle-l1' }), hairs({}));
  assert.equal(hairs({ curve: 'coggle' }), hairs({}));
});

test('curve coggle: the level-1 run follows the curvature rule (floor, aspect, cap, R_MAX)', async () => {
  const { coggleReach, REACH } = await import('../src/styles2/shared.js');
  assert.equal(coggleReach(100), REACH.floor);                        // short rise: the floor
  assert.equal(coggleReach(100, 25), REACH.floor * 25 / 20);          // scaled with the level-1 size
  assert.equal(coggleReach(520), 520 / REACH.aspect);                 // outer aspect held at REACH.aspect
  assert.equal(coggleReach(1000), REACH.cap * REACH.floor);           // lengthening capped
  assert.equal(coggleReach(2400), 800);                               // but never past aspect 3
  // In a render: the root dot to the level-1 dots is that run (dendrogram strokes the centre line itself).
  const paths = [...drawStyle2(Q2, 'dendrogram').els.join('').matchAll(/<path d="M ([-\d.]+) ([-\d.]+) C ([-\d. ]+)"/g)];
  const runs = paths.map(m => +m[3].trim().split(/\s+/)[4] - +m[1]), rises = paths.map(m => Math.abs(+m[3].trim().split(/\s+/)[5] - +m[2]));
  for (const r of runs) assert.ok(r >= REACH.floor - 0.01, `run ${r}`);
  assert.ok(Math.max(...rises) / runs[0] <= REACH.aspect + 1e-6);
});
