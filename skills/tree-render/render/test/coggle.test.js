// coggle-exact: the rules extracted from coggle.it (docs/design/references/coggle-spec.md). The expected
// numbers are copied from the live web3 evaluation diagram's DOM (docs/design/references/coggle-extract/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../src/parse.js';
import { lineWeight, branchControlPoints, branchPath, tailPath, tipPath, tailLength, tipLength, rootShapePath, fmt } from '../src/coggle/geometry.js';
import { darken, textColour, rootTextColour, randomWalk, PALETTE, toHsl } from '../src/coggle/colour.js';
import { createCoggleText, lineHeight, FONT_SIZES } from '../src/coggle/text.js';
import { coggleLayout } from '../src/coggle/layout.js';
import { drawCoggle } from '../src/coggle/draw.js';
import { readFixture, here } from './helpers.js';

const near = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;
const pt = (p, x, y, tol) => assert.ok(near(p.x, x, tol) && near(p.y, y, tol), `(${p.x}, ${p.y}) ≠ (${x}, ${y})`);

// --- branch geometry -----------------------------------------------------------------------------

test('line weight by level: (18 × 0.91^level + 2) / 2, at least 2', () => {
  assert.ok(near(lineWeight(1), 9.19));
  assert.ok(near(lineWeight(2), 8.4529));
  assert.ok(near(lineWeight(3), 7.782139));
  assert.equal(lineWeight(40), 2);
});

test('root branch control points match the web3 diagram exactly', () => {
  const [p0, c1, c2, p3] = branchControlPoints({ x: 193, y: 0 }, { x: 621.0357, y: -250.2725 });
  pt(p0, 193, 0); pt(c1, 512.6468, 0); pt(c2, 331.9361, -250.2725); pt(p3, 621.0357, -250.2725);
});

test('short branches pull both control points in (Coggle\'s < 75 px rule)', () => {
  const [, c1, c2] = branchControlPoints({ x: -1, y: 0 }, { x: 45.2943, y: -25.005 });
  pt(c1, 31.7378, 0); pt(c2, 16.1320, -25.005);
  const [, d1, d2] = branchControlPoints({ x: -1, y: 0 }, { x: 44.9143, y: 62.005 });
  pt(d1, 36.1004, 0); pt(d2, 3.3556, 62.005);
});

test('a branch is a full S: horizontal tangents at both ends and one inflection', () => {
  for (const to of [{ x: 621, y: -250 }, { x: 45, y: 25 }, { x: 300, y: 40 }]) {
    const [p0, c1, c2, p3] = branchControlPoints({ x: 0, y: 0 }, to);
    assert.equal(c1.y, p0.y); assert.equal(c2.y, p3.y);
    assert.ok(c1.x > p0.x && c2.x < p3.x);
    // signed curvature x'y'' − y'x'' changes sign exactly once on (0, 1)
    const d1 = (t) => ({ x: 3 * ((1 - t) ** 2 * (c1.x - p0.x) + 2 * (1 - t) * t * (c2.x - c1.x) + t * t * (p3.x - c2.x)), y: 3 * ((1 - t) ** 2 * (c1.y - p0.y) + 2 * (1 - t) * t * (c2.y - c1.y) + t * t * (p3.y - c2.y)) });
    const d2 = (t) => ({ x: 6 * ((1 - t) * (c2.x - 2 * c1.x + p0.x) + t * (p3.x - 2 * c2.x + c1.x)), y: 6 * ((1 - t) * (c2.y - 2 * c1.y + p0.y) + t * (p3.y - 2 * c2.y + c1.y)) });
    let flips = 0, prev = null;
    for (let i = 1; i < 200; i++) {
      const t = i / 200, a = d1(t), b = d2(t), k = Math.sign(a.x * b.y - a.y * b.x);
      if (prev && k && k !== prev) flips++;
      if (k) prev = k;
    }
    assert.equal(flips, 1, `inflections for ${JSON.stringify(to)}`);
  }
});

test('branch path, tail and tip strings match the DOM', () => {
  assert.equal(branchPath({ x: 193, y: 0 }, { x: 621.0357, y: -250.2725 }), 'M 193 0 C 512.6468 0 331.9361 -250.2725 621.0357 -250.2725');
  assert.equal(tailPath(9.19), 'M 0 -4.595 6.9643 0 0 4.595 6.9643 4.595 6.9643 -4.595 z');
  assert.equal(tipPath(9.19 - 0.3), 'M -0.2 -4.4450 0.1 -4.4450 6.7396 0 0.1 4.4450 -0.2 4.4450');
  assert.ok(near(tailLength(8.4529), 6.4057));
  assert.ok(near(tipLength(8.4529), 6.1808));
  assert.equal(fmt(631), '631');
  assert.equal(fmt(1 / 3), '0.3333');
});

test('root shape: rounded rectangle with a chevron on each side', () => {
  assert.equal(rootShapePath(382, 226), 'M -184,4.9 L -191,0,-184,-4.9,-184,-103.5 A 2.5,2.5,0,0,1,-181.5,-106 L -4.9,-106,0,-113,4.9,-106,181.5,-106 A 2.5,2.5,0,0,1,184,-103.5 L 184,-4.9,191,0,184,4.9,184,103.5 A 2.5,2.5,0,0,1,181.5,106 L 4.9,106,0,113,-4.9,106,-181.5,106 A 2.5,2.5,0,0,1,-184,103.5 Z');
});

// --- colour ----------------------------------------------------------------------------------------

test('text colour = HSL(h, 0.7 s, 0.5 l) of the branch colour', () => {
  const pairs = { '#e096e9': '#82348c', '#7aa3e5': '#2e4e81', '#67d7c4': '#2f7065', '#9ed56b': '#4f6f31', '#db8de6': '#7c3386', '#75a2e6': '#2d4e81', '#6fd7c4': '#317266' };
  for (const [arc, text] of Object.entries(pairs)) assert.equal(textColour(arc), text, arc);
  assert.equal(darken('#e096e9'), '#82348c');
});

test('the text is the same hue as its branch, darker and less saturated', () => {
  for (const c of PALETTE) {
    const a = toHsl(c), b = toHsl(textColour(c));
    assert.ok(Math.abs(a.h - b.h) < 2, c);
    assert.ok(near(b.l, a.l / 2, 0.01) && near(b.s, a.s * 0.7, 0.02), c);
  }
});

test('root text on the grey root box: darken by 1.6', () => {
  assert.equal(rootTextColour('#d0d0d0'), '#414141');
});

test('child colours wander from the parent by at most 6/256 in s and l, deterministically', () => {
  const a = randomWalk('#e096e9', 'x.1'), b = randomWalk('#e096e9', 'x.1');
  assert.equal(a, b);
  const p = toHsl('#e096e9'), q = toHsl(a);
  assert.ok(Math.abs(p.s - q.s) <= 6 / 256 + 0.005 && Math.abs(p.l - q.l) <= 6 / 256 + 0.005);
  assert.deepEqual(PALETTE.slice(0, 3), ['#7aa3e5', '#67d7c4', '#9ed56b']);
});

// --- text ------------------------------------------------------------------------------------------

test('font sizes by level and Chrome-rounded "normal" line heights', () => {
  assert.deepEqual(FONT_SIZES, [17, 15.3, 13, 12]);
  assert.equal(lineHeight(13), 15); assert.equal(lineHeight(15.3), 18); assert.equal(lineHeight(17), 20); assert.equal(lineHeight(13.8134), 16);
});

// --- layout on the web3 fixture --------------------------------------------------------------------

const T = await createCoggleText();
const WEB3 = parse(readFixture('coggle-web3-eval.json'));

test('web3 layout: level-1 junctions at x = 631, leaves 54 + 0.02 × height further on', () => {
  const L = coggleLayout(WEB3, T);
  const l1 = L.nodes.filter(n => n.level === 1);
  assert.equal(l1.length, 4);
  for (const n of l1) assert.ok(near(n.x, 631, 0.5), `L1 x ${n.x}`);
  const pink = l1[0], leaves = L.nodes.filter(n => n.parent === pink);
  for (const n of leaves) assert.ok(near(n.x - pink.x, 54.72, 0.3), `leaf dx ${n.x - pink.x}`);
  // sibling leaves: 15 px between text boxes
  const [a, b] = leaves;
  assert.ok(near(b.text.y - (a.text.y + a.text.h), 15, 0.01));
  // labels: interior right-aligned 9 px left of the junction, above or below; leaves 4 px right
  assert.ok(near(pink.text.x + pink.text.w, pink.x - 9, 0.01) && near(pink.text.y + pink.text.h, pink.y - 9, 0.01));
  const green = l1[3];
  assert.ok(near(green.text.y, green.y + 9, 0.01));
  assert.ok(near(a.text.x, a.x + 4, 0.01));
});

test('golden: the web3 fixture renders to the checked-in SVG', () => {
  const svg = drawCoggle(coggleLayout(WEB3, T), { fontCSS: '' });
  const golden = path.join(here, 'golden', 'coggle-web3-eval.svg');
  if (process.env.UPDATE_GOLDEN) fs.writeFileSync(golden, svg);
  assert.equal(svg, fs.readFileSync(golden, 'utf8'));
});
