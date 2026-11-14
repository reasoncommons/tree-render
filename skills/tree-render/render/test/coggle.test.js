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
import { branchHitsBox, branchSamples, findCollisions } from '../src/coggle/collide.js';
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
// Coggle's own drawing: its layout (collisions allowed), the lead running on, and the chevrons on the root box.
// coggle-exact is set in Coggle's Arimo in both layouts (Bricolage only on request).
const COGGLE = { avoidCollisions: false, leadBreak: false, chevrons: true };
const ARIMO_EXACT = EXACT;

test('web3 layout (Coggle\'s own, collisions allowed): level-1 junctions at x = 631, leaves 54 + 0.02 × height further on', () => {
  const L = coggleLayout(WEB3, T, COGGLE);
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

test('golden: with collisions allowed, the web3 fixture renders exactly Coggle\'s layout (checked-in SVG)', () => {
  const svg = drawCoggle(coggleLayout(WEB3, T, { ...COGGLE, style: ARIMO_EXACT }), { fontCSS: '', style: ARIMO_EXACT });
  const golden = path.join(here, 'golden', 'coggle-web3-eval-original.svg');
  if (process.env.UPDATE_GOLDEN) fs.writeFileSync(golden, svg);
  assert.equal(svg, fs.readFileSync(golden, 'utf8'));
});

test('golden: the web3 fixture renders to the checked-in SVG (our layout, in its default font, Arimo)', async () => {
  const TB = await createCoggleText(EXACT.font);
  const svg = drawCoggle(coggleLayout(WEB3, TB), { fontCSS: '' });
  const golden = path.join(here, 'golden', 'coggle-web3-eval.svg');
  if (process.env.UPDATE_GOLDEN) fs.writeFileSync(golden, svg);
  assert.equal(svg, fs.readFileSync(golden, 'utf8'));
});

// --- collisions: no branch crosses a label ------------------------------------------------------------

test('collision check: a branch through a box hits it; one passing clear (beyond w/2 + 4 px) does not', () => {
  const from = { x: 0, y: 0 }, to = { x: 400, y: -200 };
  // the S's steep middle is near x = 200, y = -100
  assert.equal(branchHitsBox(from, to, 9, { x: 180, y: -120, w: 40, h: 40 }), true);
  // a box hugging the start, just above the horizontal run: within 4.5 + 4 px → hit; further up → clear
  assert.equal(branchHitsBox(from, to, 9, { x: 0, y: -12, w: 20, h: 5 }), true);
  assert.equal(branchHitsBox(from, to, 9, { x: 0, y: -30, w: 20, h: 5 }), false);
  // to the right of the curve's end, and below it
  assert.equal(branchHitsBox(from, to, 9, { x: 420, y: -220, w: 50, h: 40 }), false);
  assert.equal(branchHitsBox(from, to, 9, { x: 100, y: 20, w: 300, h: 50 }), false);
  // clearance is a parameter
  assert.equal(branchHitsBox(from, to, 9, { x: 0, y: -14, w: 20, h: 5 }, { clearance: 0 }), false);
});

test('Coggle\'s own layout runs branches through labels in the web3 tree (the flaw we fix)', () => {
  const hits = findCollisions(coggleLayout(WEB3, T, { avoidCollisions: false }));
  assert.ok(hits.length > 0);
});

// Every coggle fixture, a synthetic worst case, and (when checked out next to this repo) the Wise AI trees.
const WISE = path.join(process.env.HOME || '', 'src/life-itself/ai-wise/projects/wise-ai-briefing/trees');
const long = (i) => `Interior claim ${i}: a long sentence about why this matters, which wraps over several lines at the default width.`;
const kid = (i, n) => ({ text: long(i), children: Array.from({ length: n }, (_, j) => ({ text: `Leaf ${i}.${j} with a few words of support.` })) });
const STRESS = { title: 'stress', root: { text: 'A root question?', children: [
  kid(1, 3), { text: 'A leaf among interior siblings, quite long so that it reaches far to the right of the column.' }, kid(2, 1), kid(3, 4), kid(4, 2), kid(5, 3), kid(6, 1), kid(7, 2),
] } };
const trees = [
  ...['coggle-web3-eval.json', 'v01-q2.json', 'v01-overview.json'].map(f => [f, parse(readFixture(f))]),
  ['stress', parse(JSON.stringify(STRESS))],
  ...(fs.existsSync(WISE) ? fs.readdirSync(WISE).filter(f => f.endsWith('.json')).map(f => ['wise ' + f, parse(fs.readFileSync(path.join(WISE, f), 'utf8'))]) : []),
];
for (const [name, tree] of trees) {
  test(`no branch crosses a label: ${name}`, () => {
    const L = coggleLayout(tree, T);
    assert.deepEqual(findCollisions(L), []);
    // and the tree stays reasonably shaped: no wider than twice Coggle's own layout
    const O = coggleLayout(tree, T, { avoidCollisions: false });
    assert.ok(L.bounds.w < 2 * O.bounds.w, `${name}: ${L.bounds.w} vs ${O.bounds.w}`);
  });
}

test('a group without collisions keeps Coggle\'s horizontal layout; only the gap between interior siblings opens (15 → 30 px)', () => {
  const tree = parse(JSON.stringify({ title: 't', root: { text: 'Root', children: [{ text: 'One', children: [{ text: 'a' }, { text: 'b' }] }, { text: 'Two', children: [{ text: 'c' }] }] } }));
  const a = coggleLayout(tree, T), b = coggleLayout(tree, T, { avoidCollisions: false });
  assert.deepEqual(findCollisions(b), []);
  // x measured from where the root's branches start (our root box is bigger: 22 px text, padding to match)
  const xs = (L) => L.nodes.map(n => n.level ? n.x - L.nodes[0].from : 0);
  assert.deepEqual(xs(a), xs(b));
  const leaves = (L) => L.nodes.filter(n => n.level === 2);
  const gap = (L) => { const [x, , z] = leaves(L); return z.text.y - (x.text.y + x.text.h); };
  // 'a' and 'b' still 15 px apart; the two families' leaves 'b' and 'c' further apart in ours
  for (const L of [a, b]) { const [x, y] = leaves(L); assert.ok(near(y.text.y - (x.text.y + x.text.h), 15, 0.01)); }
  assert.ok(gap(a) > gap(b));
});

test('compact, leaning tall: real trees come out at most 1.8 × as wide as tall, short of Coggle\'s landscape, and not much bigger in area', () => {
  for (const [name, tree] of trees.filter(([n]) => n !== 'stress')) {
    const L = coggleLayout(tree, T), O = coggleLayout(tree, T, { avoidCollisions: false });
    const msg = `${name}: ${Math.round(L.bounds.w)}×${Math.round(L.bounds.h)} vs ${Math.round(O.bounds.w)}×${Math.round(O.bounds.h)}`;
    assert.ok(L.bounds.w / L.bounds.h < Math.min(1.8, 0.9 * O.bounds.w / O.bounds.h), msg);
    assert.ok(L.bounds.w * L.bounds.h < 1.8 * O.bounds.w * O.bounds.h, msg);
  }
});

// --- the "elegant" variants (styles.js): same engine, other fonts, widths, colours and root ------------------

import { COGGLE_STYLES } from '../src/coggle/styles.js';
import { fontFaceCSS } from '../src/coggle/text.js';
for (const [name, style] of Object.entries(COGGLE_STYLES).filter(([n]) => n !== 'coggle-exact')) {
  test(`variant ${name}: renders with its font embedded, its background, and no branch across a label`, async () => {
    const TV = await createCoggleText(style.font);
    for (const [tname, tree] of trees) {
      const L = coggleLayout(tree, TV, { style });
      assert.deepEqual(findCollisions(L), [], `${name} on ${tname}`);
    }
    const L = coggleLayout(WEB3, TV, { style });
    const svg = drawCoggle(L, { fontCSS: fontFaceCSS(style.font), style });
    assert.match(svg, new RegExp(`data-style="${name}"`));
    assert.match(svg, new RegExp(`font-family:'${style.font.family}'`));
    assert.match(svg, new RegExp(`<rect width="\\d+" height="\\d+" fill="${style.bg}"/>`));
    for (const b of L.branches) assert.ok(b.w >= style.branch.min - 1e-9);
  });
}

// --- 2026-11-12: chevrons (coggle-exact only), leadBreak option, coggle-thin(-mono) --------------------------------------

import { coggleStyle } from '../src/coggle/styles.js';
const LEADY = parse(JSON.stringify({ title: 't', root: { text: 'Root', children: [{ lead: 'A bold lead:', text: 'A bold lead: and the rest.', children: [{ text: 'A leaf.' }] }] } }));

test('root box: chevrons in coggle-exact and coggle-thin (Coggle\'s pointers); a plain rounded box in the other variants or on request', () => {
  const plain = drawCoggle(coggleLayout(LEADY, T, { chevrons: false }), { fontCSS: '' });
  const d = /class="root-box" d="([^"]+)"/.exec(plain)[1];
  assert.equal((d.match(/L/g) || []).length, 3); // four sides, four arcs, no chevron points
  const c = drawCoggle(coggleLayout(LEADY, T), { fontCSS: '' });
  assert.ok(/class="root-box" d="([^"]+)"/.exec(c)[1].length > d.length);
  for (const name of ['coggle-exact', 'coggle-thin']) assert.equal(coggleStyle(name).root.chevrons, true, name);
  for (const name of ['coggle-broadsheet', 'coggle-letterpress']) assert.equal(coggleStyle(name).root.chevrons, false, name);
});

test('the lead runs on by default (leadBreak off in every style); leadBreak: true puts a bold lead on its own line', () => {
  const n = (L) => L.nodes.find(r => r.level === 1).t.lines;
  const on = n(coggleLayout(LEADY, T, { leadBreak: true })), off = n(coggleLayout(LEADY, T));
  assert.equal(on.length, 2);
  assert.deepEqual(on[0].segs.map(s => s.bold), [true]);
  assert.equal(on[1].segs[0].text, 'and the rest.');
  assert.equal(off.length, 1);
  for (const name of ['coggle-exact', 'coggle-thin', 'coggle-thin-mono', 'coggle-broadsheet', 'coggle-letterpress']) assert.equal(coggleStyle(name).leadBreak, false, name);
});

test('coggle-thin-mono: leaves and continuations in IBM Plex Mono, 1 px smaller; leads and root in Plex Sans; coggle-hairline is an alias of coggle-thin', async () => {
  assert.equal(coggleStyle('coggle-hairline'), coggleStyle('coggle-thin'));
  const S = coggleStyle('coggle-thin-mono'), TM = await createCoggleText(S.font);
  const L = coggleLayout(LEADY, TM, { style: S, leadBreak: true });
  const svg = drawCoggle(L, { fontCSS: fontFaceCSS(S.font), style: S });
  assert.match(svg, /font-family:'IBM Plex Mono'/);
  const leaf = L.nodes.find(r => r.level === 2), mid = L.nodes.find(r => r.level === 1), root = L.nodes[0];
  assert.ok(leaf.t.lines[0].segs.every(s => s.mono));
  assert.deepEqual(mid.t.lines.flatMap(l => l.segs.map(s => s.mono)), [false, true]);
  assert.ok(root.t.lines[0].segs.every(s => !s.mono));
  assert.match(svg, new RegExp(`font-size="${leaf.t.size - 1}">A leaf\\.</tspan>`));
});

// --- 2026-11-13: --font, --sizes and --depth on coggle-exact (font and level-size comparisons) ----------------------

import { FONTS, withOverrides, EXACT } from '../src/coggle/styles.js';
import { trimDepth } from '../src/coggle/render.js';
const LARGER = [22, 17, 15, 14];

test('withOverrides: no overrides gives the style back unchanged (coggle-exact keeps its look)', () => {
  assert.equal(withOverrides(EXACT, {}), EXACT);
  assert.throws(() => withOverrides(EXACT, { font: 'comic' }), /unknown font/);
  assert.throws(() => withOverrides(EXACT, { sizes: [22, 17, 15] }), /four/);
});

test('font override: the SVG embeds and names that family, with the lead in its bold weight', async () => {
  for (const key of ['atkinson', 'bricolage', 'merriweather', 'plexmono', 'quattro']) {
    const S = withOverrides(EXACT, { font: key }), TF = await createCoggleText(S.font);
    const svg = drawCoggle(coggleLayout(LEADY, TF, { style: S }), { fontCSS: fontFaceCSS(S.font), style: S });
    assert.match(svg, new RegExp(`@font-face\\{font-family:'${S.font.family}';font-weight:400;src:url\\(data:font/(woff|ttf);base64,`));
    assert.match(svg, new RegExp(`@font-face\\{font-family:'${S.font.family}';font-weight:${S.font.boldWeight};`));
    assert.ok(svg.includes(`text{font-family:${S.font.stack}`), key);
    assert.match(svg, new RegExp(`<tspan font-weight="${S.font.boldWeight}">A bold lead:</tspan>`));
  }
});

test('fonts opentype.js cannot shape (Bricolage, Merriweather) still measure: widths grow with the text and size', async () => {
  for (const key of ['bricolage', 'merriweather']) {
    const TF = await createCoggleText(FONTS[key]);
    const a = TF.measure('Wisdom', 15), b = TF.measure('Wisdom traditions', 15);
    assert.ok(a > 30 && b > a, key);
    assert.ok(Math.abs(TF.measure('Wisdom', 30) - 2 * a) < 1e-9, key);
  }
});

test('sizes override: root, level 1, level 2 and level 3+ text at the given sizes; wraps grow with the text', () => {
  const S = withOverrides(EXACT, { sizes: [26, 19, 15, 13] });
  assert.equal(S.rootSize, 26);
  assert.equal(S.sizes[0], EXACT.sizes[0]); // the reference the root wrap and padding scale from
  const tree = parse(JSON.stringify({ title: 't', root: { text: 'Root?', children: [{ text: 'One', children: [{ text: 'Two', children: [{ text: 'Three' }, { text: 'Three b', children: [{ text: 'Four' }] }] }] }] } }));
  const L = coggleLayout(tree, T, { style: S });
  const at = (lv) => [...new Set(L.nodes.filter(r => r.level === lv).map(r => r.t.size))];
  assert.deepEqual([0, 1, 2, 3, 4].map(at), [[26], [19], [15], [13], [13]]);
  assert.ok(S.wrap.interior > 260 && S.wrap.leaf > 300);
  // and the root box padding grows with the root, as for the default 22 px root
  const D = coggleLayout(tree, T), pad = (L) => (L.root.shape.h - L.root.t.h) / 2;
  assert.ok(pad(L) > pad(D));
});

test('depth: trimDepth keeps only N levels below the root; leaves of the root sit clear of the root box', () => {
  const tree = parse(fs.readFileSync(path.join(here, 'fixtures', 'v01-q2.json'), 'utf8'));
  const deepest = (n, d = 0) => Math.max(d, ...n.children.map(c => deepest(c, d + 1)));
  assert.ok(deepest(tree.root) >= 2);
  const t1 = trimDepth(tree, 1);
  assert.equal(deepest(t1.root), 1);
  assert.equal(t1.root.children.length, tree.root.children.length);
  assert.ok(deepest(tree.root) >= 2); // the original is untouched
  const L = coggleLayout(t1, T);
  assert.deepEqual(findCollisions(L), []);
  for (const r of L.nodes.filter(r => r.level === 1)) assert.ok(r.text.x > L.root.shape.w / 2, `${r.num} at ${r.text.x}`);
});

for (const key of ['atkinson', 'bricolage', 'merriweather', 'plexmono', 'quattro']) {
  test(`font ${key}: no branch crosses a label, at Coggle's sizes and at 22/17/15/14`, async () => {
    for (const sizes of [undefined, LARGER]) {
      const S = withOverrides(EXACT, { font: key, sizes }), TF = await createCoggleText(S.font);
      for (const [tname, tree] of trees) for (const t of [tree, trimDepth(tree, 1)]) {
        assert.deepEqual(findCollisions(coggleLayout(t, TF, { style: S })), [], `${key} ${sizes || 'default'} on ${tname}`);
      }
    }
  });
}

test('monospace (plexmono): every character the same width, so wraps hold fewer characters than Arimo', async () => {
  const TF = await createCoggleText(FONTS.plexmono);
  assert.ok(Math.abs(TF.measure('iiii', 15) - TF.measure('WWWW', 15)) < 1e-9);
  assert.ok(Math.abs(TF.measure('iiii', 15, true) - TF.measure('WWWW', 15, true)) < 1e-9);
  const words = 'Wisdom is knowing what matters and acting well on it in a world we only partly understand';
  const lines = (M) => M.layoutText([{ text: words, bold: false }], 15, 260).lines.map(l => l.w);
  const mono = lines(TF), sans = lines(T);
  assert.ok(mono.length > sans.length);
  assert.ok(mono.every(w => w <= 260));
});

// --- phone readability (2026-11-13 review: narrow canvas, no orphans, even rhythm, contrast) -----------------

import { contrast, TALL_PALETTE, MIN_TEXT_CONTRAST } from '../src/coggle/colour.js';
import { TALL } from '../src/coggle/layout.js';

const SHIP = [24, 18, 15, 14];
const lastLine = (r) => r.t.lines[r.t.lines.length - 1].segs.map(g => g.text).join('').trim();
const orphans = (L) => L.nodes.filter(r => r.level > 0 && r.t.lines.length > 1 && !/\s/.test(lastLine(r))).map(r => `${r.num}: "${lastLine(r)}"`);

// (the root is held to the root box cap, so it may keep one: "How should we / approach AI / development / wisely?")
test('no orphans: no wrapped label ends with one word on its own line (default style, and bricolage at 24/18/15/14)', async () => {
  const TB = await createCoggleText(FONTS.bricolage), SB = withOverrides(EXACT, { font: 'bricolage', sizes: SHIP });
  for (const [name, tree] of trees) for (const t of [tree, trimDepth(tree, 1), trimDepth(tree, 2)]) {
    assert.deepEqual(orphans(coggleLayout(t, T)), [], `default on ${name}`);
    assert.deepEqual(orphans(coggleLayout(t, TB, { style: SB })), [], `bricolage on ${name}`);
  }
});

test('contrast: every palette text colour is at least WCAG AA (4.5:1) on white in our layout', () => {
  assert.equal(MIN_TEXT_CONTRAST, 4.5);
  for (const c of TALL_PALETTE) {
    assert.ok(contrast(textColour(c, { minContrast: MIN_TEXT_CONTRAST })) >= 4.5, c);
    // child colours wander a little lighter; the floor still holds
    for (const k of ['1.1', '2.3', '4.4']) assert.ok(contrast(textColour(randomWalk(c, k), { minContrast: 4.5 })) >= 4.5);
  }
  // the yellow branch is deeper than Coggle's, so its tail shows on white
  assert.ok(contrast(TALL_PALETTE[3]) > contrast(PALETTE[3]));
  for (const [name, tree] of trees) for (const r of coggleLayout(tree, T).nodes.filter(r => r.level > 0)) assert.ok(contrast(r.textColour) >= 4.5, `${name} ${r.num}`);
});

test('root box: at most rootBox × the root size wide in our layout (bricolage 24 px: ≤ 216 px), lines balanced', async () => {
  const TB = await createCoggleText(FONTS.bricolage), SB = withOverrides(EXACT, { font: 'bricolage', sizes: SHIP });
  const tree = parse(JSON.stringify({ title: 't', root: { text: 'How should we approach AI development wisely?', children: [{ text: 'A' }, { text: 'B' }] } }));
  const L = coggleLayout(tree, TB, { style: SB });
  assert.ok(L.root.shape.w <= TALL.rootBox * 24, `root box ${L.root.shape.w}`);
  assert.ok(L.root.shape.chevrons);
  assert.ok(L.root.t.lines.length <= 4);
  // a long root wraps to even lines, none of them a lone word
  const W = coggleLayout(trees[0][1], T), last = W.root.t.lines[W.root.t.lines.length - 1].segs.map(g => g.text).join('').trim();
  assert.ok(/\s/.test(last), last);
  const D = coggleLayout(tree, T);
  assert.ok(D.root.shape.w <= TALL.rootBox * EXACT.rootSize, `default root box ${D.root.shape.w}`);
});

test('even rhythm: the root\'s branches stack as bands with equal gaps (depth 2)', () => {
  const desc = (r) => [r, ...r.children.flatMap(desc)];
  for (const [name, tree] of trees) {
    const L = coggleLayout(trimDepth(tree, 2), T);
    const bands = L.root.children.map(k => { const ns = desc(k); return [Math.min(...ns.map(n => n.text.y)), Math.max(...ns.map(n => n.text.y + n.text.h))]; });
    const gaps = bands.slice(1).map((b, i) => b[0] - bands[i][1]);
    if (gaps.length) assert.ok(Math.max(...gaps) - Math.min(...gaps) < 1, `${name}: gaps ${gaps.map(g => g.toFixed(0))}`);
  }
});

// --- root runs (2026-11-13 reviews: fan read as spokes and was removed; middle is Coggle's S compressed) and ink ------

import { ROOT_RUNS } from '../src/coggle/layout.js';
import { departure } from '../src/coggle/geometry.js';
import { PAD } from '../src/coggle/draw.js';
const Q2 = parse(fs.readFileSync(path.join(here, 'fixtures', 'v01-q2.json'), 'utf8'));
const DESKTOP = [25.5, 19, 16, 16];
// Angle off the horizontal of the chord from a branch's start to its point a quarter of the way across.
const depart = (b) => {
  const s = branchSamples(b.from, b.to, { shape: b.shape }), dx = b.to.x - b.from.x, q = s.find(p => p.x - b.from.x >= 0.25 * dx);
  return Math.atan2(Math.abs(q.y - b.from.y), q.x - b.from.x) * 180 / Math.PI;
};

test('root run middle is the default: root branches leave flat (≤ 45° over the first quarter), level-1 wraps no narrower than 250 px at 18 px, no crossings', async () => {
  for (const font of ['arimo', 'bricolage', 'plexmono', 'quattro']) {
    const S = withOverrides(EXACT, { font, sizes: DESKTOP }), TF = await createCoggleText(S.font);
    for (const tree of [Q2, trimDepth(Q2, 2), WEB3]) {
      const L = coggleLayout(tree, TF, { style: S });
      const root = L.branches.filter(b => b.node.level === 1);
      assert.ok(root.every(b => b.shape === ROOT_RUNS.middle.shape) && L.branches.every(b => b.node.level === 1 || !b.shape));
      for (const b of root) assert.ok(depart(b) <= 45.5, `${font} ${b.node.num}: ${depart(b).toFixed(1)}°`);
      for (const r of L.nodes.filter(r => r.level === 1 && r.children.length)) assert.ok(r.t.w >= 250 * 19 / 18 - 1, `${font} ${r.num}: wrap ${r.t.w}`);
      assert.deepEqual(findCollisions(L), [], font);
    }
  }
});

test('root runs: middle is Coggle\'s S compressed (leaves flat, arrives flat, swings early) and narrower than coggle; only middle and coggle', () => {
  const S = withOverrides(EXACT, { sizes: DESKTOP });
  assert.deepEqual(Object.keys(ROOT_RUNS).sort(), ['coggle', 'middle']);
  const [M, C] = ['middle', 'coggle'].map(rootRun => coggleLayout(Q2, T, { style: S, rootRun }));
  for (const b of M.branches.filter(b => b.node.level === 1)) {
    const p = branchControlPoints(b.from, b.to, { shape: b.shape });
    assert.equal(p[1].y, p[0].y); // the first control point level with the root: a flat departure
    assert.equal(p[2].y, p[3].y); // the last level with the junction: a flat arrival
    assert.ok(p[1].x - p[0].x >= 0.45 * (b.to.x - b.from.x) - 0.01); // leaves the root flat (not a spoke)
    assert.ok(b.to.x - p[2].x >= 0.99 * (b.to.x - b.from.x)); // swings early and runs in flat under the label
  }
  assert.ok(C.branches.every(b => b.shape == null));
  assert.ok(M.bounds.w < C.bounds.w - 100, `middle ${M.bounds.w}, coggle ${C.bounds.w}`);
  for (const L of [M, C]) assert.deepEqual(findCollisions(L), []);
  // the unit curve's departure falls as a grows
  assert.ok(departure(0.05, 0.7, 1) > 60 && departure(0.65, 0.85, 1) < 20);
  assert.throws(() => coggleLayout(Q2, T, { rootRun: 'fan' }), /unknown root run/);
});

test('root run middle: the Wise-style q2 fixture runs from the root to level 1 in at most label width + 160 px', async () => {
  const TB = await createCoggleText(EXACT.font);
  for (const tree of [Q2, WEB3]) {
    const L = coggleLayout(tree, TB);
    const l1 = L.nodes.filter(r => r.level === 1), Tw = Math.max(...l1.map(r => r.t.w));
    for (const r of l1.filter(r => r.children.length)) assert.ok(r.x - L.root.from <= Tw + 160, `${r.num}: run ${(r.x - L.root.from).toFixed(0)}, label ${Tw.toFixed(0)}`);
    assert.deepEqual(findCollisions(L), []);
  }
});

test('coggle-exact: Coggle\'s Arimo by default; Bricolage only with --font', () => {
  assert.equal(EXACT.font, FONTS.arimo);
  assert.deepEqual(EXACT.sizes, [17, 15.3, 13, 12]);
  assert.equal(EXACT.rootSize, 22);
});

for (const font of ['arimo', 'bricolage', 'plexmono', 'quattro', 'atkinson', 'merriweather', 'plex']) {
  test(`font ${font}: every label's ink (its glyphs' real outlines) lies inside the canvas, with the padding to spare`, async () => {
    const TF = await createCoggleText(FONTS[font]);
    for (const rootRun of Object.keys(ROOT_RUNS)) for (const sizes of [DESKTOP, LARGER]) for (const tree of [Q2, WEB3]) {
      const S = withOverrides(EXACT, { font, sizes }), L = coggleLayout(tree, TF, { style: S, rootRun });
      const svg = drawCoggle(L, { style: S });
      const [, W, H] = svg.match(/width="(\d+)" height="(\d+)"/).map(Number);
      const [, ox, oy] = svg.match(/translate\(([\d.-]+),([\d.-]+)\)">/).map(Number);
      for (const r of L.nodes) {
        const k = TF.ink(r.t, r.text.align), x = ox + r.text.x + k.x, y = oy + r.text.y + k.y, at = `${font} ${rootRun} ${r.num}`;
        assert.ok(k.h > 0 && k.w > 0, at);
        assert.ok(x >= PAD - 0.5 && y >= PAD - 0.5 && x + k.w <= W - PAD + 0.5 && y + k.h <= H - PAD + 0.5, `${at}: ink ${x.toFixed(1)},${y.toFixed(1)} ${k.w.toFixed(1)}×${k.h.toFixed(1)} in ${W}×${H}`);
      }
    }
  });
}

test('ink: reaches the glyphs, not the line box (a bold lead is wider than its regular text; descenders go below the baseline)', () => {
  const plain = T.layoutText([{ text: 'Hamburg', bold: false }], 20, 999), bold = T.layoutText([{ text: 'Hamburg', bold: true }], 20, 999);
  const a = T.ink(plain), b = T.ink(bold);
  assert.ok(b.w > a.w);
  assert.ok(a.y + a.h > plain.baseline + 2 && a.y < plain.baseline - 12);
  const right = T.ink(plain, 'right');
  assert.ok(Math.abs((right.x + right.w) - (a.x + a.w)) < 1e-9 || plain.w === plain.lines[0].w);
});
