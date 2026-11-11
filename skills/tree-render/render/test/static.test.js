// The static options harness: style merge, attach geometry, wrap and ellipsis, branch shapes, checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from '../src/parse.js';
import { DEFAULT_STYLE, mergeStyle, resolveStyle, loadStyle, at, fontSize, STYLE_DIR } from '../src/style.js';
import { staticLayout, branchPoints, wrapWidth } from '../src/static-layout.js';
import { drawStatic } from '../src/static-draw.js';
import { checkStatic, branchesUnderText, textOverlaps } from '../src/static-check.js';
import { createMeasurer, fontFaceCSS } from '../src/measure-node.js';
import { readFixture } from './helpers.js';

const measure = await createMeasurer();
const Q2 = parse(readFixture('v01-q2.json'));
const OVERVIEW = parse(readFixture('v01-overview.json'));
const lay = (over, tree = Q2) => staticLayout(tree, resolveStyle(over), measure);
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const lastPt = g => g.points[g.points.length - 1];

// --- style merge -------------------------------------------------------------------------------

test('mergeStyle: objects merge key by key, arrays and scalars replace, inputs unchanged', () => {
  const before = JSON.stringify(DEFAULT_STYLE);
  const over = { font: { size: [50, 30] }, attach: { mode: 'side-mid' }, colour: { palette: ['#000000'] } };
  const S = mergeStyle(DEFAULT_STYLE, over);
  assert.deepEqual(S.font.size, [50, 30]);
  assert.equal(S.font.leadWeight, DEFAULT_STYLE.font.leadWeight);
  assert.equal(S.attach.mode, 'side-mid');
  assert.equal(S.attach.gap, DEFAULT_STYLE.attach.gap);
  assert.deepEqual(S.colour.palette, ['#000000']);
  assert.equal(JSON.stringify(DEFAULT_STYLE), before);
  S.font.size.push(1);
  assert.deepEqual(over.font.size, [50, 30]);
});

test('resolveStyle follows "extends" through files, the child winning', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-render-style-'));
  try {
    fs.writeFileSync(path.join(dir, 'base.json'), JSON.stringify({ name: 'base', font: { size: [44, 30, 24], leadWeight: 'R' } }));
    fs.writeFileSync(path.join(dir, 'child.json'), JSON.stringify({ extends: 'base', name: 'child', font: { leadWeight: 'M' } }));
    const S = loadStyle(path.join(dir, 'child.json'));
    assert.equal(S.name, 'child');
    assert.deepEqual(S.font.size, [44, 30, 24]);
    assert.equal(S.font.leadWeight, 'M');
    assert.equal(S.extends, undefined);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('per-depth values: arrays repeat their last entry; size as { base, ratio }', () => {
  assert.equal(at([1, 2, 3], 7), 3);
  assert.equal(at(5, 3), 5);
  const S = mergeStyle(DEFAULT_STYLE, { font: { size: { base: 40, ratio: 0.8 } } });
  assert.equal(fontSize(S, 0), 40);
  assert.equal(fontSize(S, 2), 25.6);
});

test('the starter styles load and resolve', () => {
  for (const f of ['v01', 'v01-thick', 'current', 'coggle-tree']) {
    const S = loadStyle(path.join(STYLE_DIR, f + '.json'));
    assert.equal(S.name, f);
    assert.ok(S.font && S.branch && S.space);
  }
});

// --- attach geometry -----------------------------------------------------------------------------

test('attach side: every branch ends at the text left edge, at the first line\'s centre (gap 0)', () => {
  for (const from of ['text-end', 'fan']) {
    const L = lay({ attach: { mode: 'side', from, gap: 0 } });
    for (const g of L.branches) {
      const n = L.nodes.find(m => m.num === g.num);
      const first = n.lines[0];
      const [x, y] = lastPt(g);
      assert.ok(near(x, n.tx), `${g.num} ends at x ${x}, text at ${n.tx}`);
      assert.ok(near(y, n.ty + first.y - first.size * L.style.attach.midline), `${g.num} y ${y}`);
      // the end is on the first line's band, not under the block
      assert.ok(y > n.ty + first.top && y < n.ty + first.top + first.h);
    }
  }
});

test('attach side: the gap parameter sets the space between branch end and text', () => {
  const L = lay({ attach: { mode: 'side', gap: [0, 14, 10] } });
  for (const g of L.branches) {
    const n = L.nodes.find(m => m.num === g.num);
    assert.ok(near(n.tx - lastPt(g)[0], n.depth === 1 ? 14 : 10));
  }
});

test('attach side-mid: branches end at the vertical centre of the block', () => {
  const L = lay({ attach: { mode: 'side-mid', gap: 0 } });
  for (const g of L.branches) {
    const n = L.nodes.find(m => m.num === g.num);
    assert.ok(near(lastPt(g)[0], n.tx));
    assert.ok(near(lastPt(g)[1], n.y + n.h / 2));
  }
});

test('outgoing branches start at the parent\'s text end (text-end) or at one fan point per column (fan)', () => {
  const T = lay({ attach: { mode: 'side', from: 'text-end', startGap: 12 } });
  for (const g of T.branches) {
    const p = T.nodes.find(m => m.num === g.num).parent;
    assert.ok(near(g.points[0][0], p.x + p.w + 12));
    assert.ok(near(g.points[0][1], p.ay));
  }
  const F = lay({ attach: { mode: 'side', from: 'fan', fanGap: 20, stem: true } });
  const starts = new Set(F.branches.filter(g => g.depth === 2).map(g => Math.round(g.points[0][0])));
  assert.equal(starts.size, 1, 'one fan x for the whole level-1 column');
  for (const s of F.stems) assert.ok(s.x1 > s.x0);
});

test('attach side: no branch or stem passes under a text line (all shapes, both trees, both starts)', () => {
  for (const tree of [Q2, OVERVIEW]) {
    for (const shape of ['cubic', 'bezier-s', 'elbow-rounded']) {
      for (const from of ['text-end', 'fan']) {
        const L = lay({ attach: { mode: 'side', from }, branch: { shape } }, tree);
        assert.deepEqual(branchesUnderText(L), [], `${shape} ${from}`);
        assert.deepEqual(textOverlaps(L), [], `${shape} ${from}`);
      }
    }
  }
});

test('the under-text check catches a branch run into the text', () => {
  const L = lay({ attach: { mode: 'side', gap: -60 } });
  assert.ok(branchesUnderText(L).length > 0);
  assert.equal(checkStatic(L).ok, false);
});

test('attach shelf: the branch arrives under the text and a shelf runs to its end', () => {
  const L = lay({ attach: { mode: 'shelf' } });
  for (const g of L.branches) {
    const n = L.nodes.find(m => m.num === g.num);
    assert.ok(near(lastPt(g)[0], n.x));
    assert.ok(lastPt(g)[1] > n.ty + n.textH, 'below the last line');
  }
  assert.equal(L.shelves.length, L.nodes.length);
});

// --- wrap and ellipsis ---------------------------------------------------------------------------

test('wrap.maxLines with ellipsis: blocks are cut to maxLines, the last line ends with … and fits', () => {
  const L = lay({ wrap: { maxLines: [3, 2, 1], ellipsis: true } });
  const leaves = L.nodes.filter(n => n.depth === 2);
  for (const n of leaves) {
    assert.equal(n.lines.length, 1);
    if (n.truncated) {
      assert.match(n.lines[0].t, /…$/);
      assert.ok(n.lines[0].w <= n.wrapW + 0.01, `${n.num} ${n.lines[0].w} > ${n.wrapW}`);
    }
  }
  assert.ok(leaves.some(n => n.truncated));
  for (const n of L.nodes.filter(m => m.depth === 1)) assert.ok(n.lines.length <= 2);
  assert.ok(checkStatic(L).warnings.some(w => w.check === 'truncated'));
});

test('wrap.maxLines without ellipsis keeps every line and flags the node', () => {
  const L = lay({ wrap: { maxLines: 1, ellipsis: false } });
  const n = L.nodes.find(m => m.depth === 2 && m.lines.length > 1);
  assert.ok(n && n.truncated);
  assert.ok(!n.lines.some(l => /…$/.test(l.t)));
});

test('wrap width in characters scales with the font size', () => {
  const S = resolveStyle({ wrap: { unit: 'ch', width: 30 } });
  const w20 = wrapWidth(S, 0, 20, measure), w40 = wrapWidth(S, 0, 40, measure);
  assert.ok(near(w40, 2 * w20, 0.01));
  const L = staticLayout(Q2, S, measure);
  for (const n of L.nodes) for (const l of n.lines) assert.ok(l.w <= n.wrapW + 0.01 || !l.t.includes(' '));
});

test('lead and continuation: lead in the lead weight and size, continuation scaled', () => {
  const L = lay({ font: { size: [40, 30, 24], leadWeight: 'M', contScale: 0.8 } });
  const n = L.nodes.find(m => m.depth === 1);
  const lead = n.lines.filter(l => l.role === 'lead'), cont = n.lines.filter(l => l.role === 'cont');
  assert.ok(lead.length && cont.length);
  assert.ok(lead.every(l => l.weight === 'M' && l.size === 30));
  assert.ok(cont.every(l => l.weight === 'R' && l.size === 24));
});

// --- colour ----------------------------------------------------------------------------------------

test('colour: palette per top-level branch, inherited or not; accent marks only the accent branch', () => {
  const P = lay({ colour: { mode: 'palette', palette: ['#111111', '#222222'], inherit: true } });
  const b = num => P.branches.find(g => g.num === num).colour;
  assert.equal(b('1'), '#111111'); assert.equal(b('2'), '#222222'); assert.equal(b('3'), '#111111');
  assert.equal(b('2.1'), '#222222');
  const N = lay({ colour: { mode: 'palette', palette: ['#111111'], inherit: false, ink: '#000000' } });
  assert.equal(N.branches.find(g => g.num === '1.1').colour, '#000000');
  const A = lay({ colour: { mode: 'accent', accent: '#ff0000', ink: '#000000', inherit: false }, font: { color: ['ink', 'branch'] } });
  assert.equal(A.branches.find(g => g.num === '5').colour, '#ff0000');
  assert.equal(A.branches.find(g => g.num === '5.1').colour, '#000000');
  assert.equal(A.branches.find(g => g.num === '1').colour, '#000000');
  assert.equal(A.nodes.find(n => n.num === '5').lines[0].color, '#ff0000');
});

// --- branch shapes ---------------------------------------------------------------------------------

test('branch shapes start and end on their points; elbow-rounded never runs backwards', () => {
  const g = { x0: 0, y0: 0, x1: 200, y1: 120 };
  for (const shape of ['cubic', 'bezier-s', 'elbow-rounded']) {
    const pts = branchPoints(g, { ...DEFAULT_STYLE.branch, shape });
    assert.deepEqual(pts[0].map(Math.round), [0, 0]);
    assert.deepEqual(pts[pts.length - 1].map(Math.round), [200, 120]);
    for (let i = 1; i < pts.length; i++) assert.ok(pts[i][0] >= pts[i - 1][0] - 1e-6, `${shape} x runs back at ${i}`);
  }
  const up = branchPoints({ x0: 0, y0: 100, x1: 200, y1: 0 }, { ...DEFAULT_STYLE.branch, shape: 'elbow-rounded' });
  for (let i = 1; i < up.length; i++) assert.ok(up[i][1] <= up[i - 1][1] + 1e-6);
});

// --- canvas, draw, checks -------------------------------------------------------------------------

test('canvas: fixed width, height fits the content; a too-wide map is shrunk with a warning', () => {
  const L = lay({ space: { canvas: 1600 } });
  assert.equal(L.W, 1600);
  assert.ok(L.H > L.oy + L.map.h);
  const N = lay({ space: { canvas: 900 } });
  assert.ok(N.scale < 1);
  assert.ok(checkStatic(N).warnings.some(w => w.check === 'shrunk'));
  assert.deepEqual(checkStatic(N).errors, []);
});

test('the starter styles render both v0.1 trees with no check errors', () => {
  for (const f of ['v01', 'v01-thick', 'current', 'coggle-tree']) {
    const S = loadStyle(path.join(STYLE_DIR, f + '.json'));
    for (const tree of [Q2, OVERVIEW]) {
      const L = staticLayout(tree, S, measure);
      const r = checkStatic(L);
      assert.deepEqual(r.errors, [], `${f}: ${JSON.stringify(r.errors)}`);
      const svg = drawStatic(L, { fontCSS: fontFaceCSS() });
      assert.match(svg, new RegExp(`width="${S.space.canvas}"`));
      assert.match(svg, /@font-face\{font-family:ApfelMittel/);
      assert.equal((svg.match(/class="branch"/g) || []).length, L.nodes.length - 1);
    }
  }
});

// --- coggle attach ---------------------------------------------------------------------------------

test('attach coggle: interior labels right-aligned, ending startGap before the junction, the branch beneath', () => {
  for (const label of ['above', 'outside']) {
    const L = lay({ attach: { mode: 'coggle', label, startGap: [0, 10], labelGap: 4, notch: true }, branch: { width: [[18, 12], [10, 7]] } });
    const interior = L.nodes.filter(n => n.depth > 0 && n.children.length);
    assert.ok(interior.length);
    for (const n of interior) {
      const right = Math.max(...n.lines.map(l => n.tx + l.dx + l.w));
      for (const l of n.lines) assert.ok(near(n.tx + l.dx + l.w, right), `${n.num} line not right-aligned`);
      const g = L.branches.find(b => b.num === n.num);
      const [jx, jy] = lastPt(g);
      assert.ok(near(jx, right + 10), `${n.num} junction ${jx} vs label end ${right}`);
      // the last stretch is horizontal and runs under (or over) the whole label, clear of its text
      const pre = g.points[g.points.length - 2];
      assert.ok(near(pre[1], jy) && pre[0] <= n.tx + 0.5, `${n.num} final run`);
      const top = n.ty, bottom = n.ty + n.textH;
      assert.ok(jy - 6 >= bottom + 4 - 1 || jy + 6 <= top - 4 + 1, `${n.num} branch at ${jy} vs text ${top}–${bottom}`);
      if (label === 'above') assert.ok(jy > bottom);
      // children fan from the junction
      for (const c of n.children) assert.deepEqual(L.branches.find(b => b.num === c.num).points[0].map(Math.round), [Math.round(jx), Math.round(jy)]);
    }
    assert.equal(L.notches.length, interior.length);
    // leaves: left-aligned, tip gap before the text, at the first line's centre
    for (const n of L.nodes.filter(m => !m.children.length)) {
      const g = L.branches.find(b => b.num === n.num), first = n.lines[0];
      assert.ok(near(lastPt(g)[0], n.tx - at(L.style.attach.gap, n.depth)));
      assert.ok(near(lastPt(g)[1], n.ty + first.y - first.size * L.style.attach.midline));
    }
    for (const tree of [Q2, OVERVIEW]) {
      const T = lay({ attach: { mode: 'coggle', label } }, tree);
      assert.deepEqual(branchesUnderText(T), [], label);
      assert.deepEqual(textOverlaps(T), [], label);
    }
  }
});

test('wrap width in em is width × the depth\'s font size', () => {
  const S = resolveStyle({ wrap: { unit: 'em', width: 20 } });
  assert.equal(wrapWidth(S, 1, 25, measure), 500);
});

test('the coggle-tree starter style renders both trees with no check errors', () => {
  const S = loadStyle(path.join(STYLE_DIR, 'coggle-tree.json'));
  for (const tree of [Q2, OVERVIEW]) {
    const L = staticLayout(tree, S, measure);
    assert.deepEqual(checkStatic(L).errors, []);
    assert.match(drawStatic(L, {}), /class="notch"/);
  }
});

// --- default and river styles ----------------------------------------------------------------------

test('the coggle and river styles render both v0.1 trees with no check errors; So… takes the accent', () => {
  for (const f of ['coggle', 'river']) {
    const S = loadStyle(path.join(STYLE_DIR, f + '.json'));
    assert.equal(S.name, f);
    assert.equal(S.branch.junctionCap, true);
    for (const tree of [Q2, OVERVIEW]) assert.deepEqual(checkStatic(staticLayout(tree, S, measure)).errors, [], f);
    const L = staticLayout(Q2, S, measure);
    assert.equal(L.branches.find(g => g.num === '5').colour, S.colour.accent);
  }
});

// Golden renders of the default style on the v0.1 fixtures (fonts not embedded). UPDATE_GOLDEN=1 rewrites.
for (const f of ['v01-q2', 'v01-overview']) {
  test(`golden coggle ${f}`, () => {
    const S = loadStyle(path.join(STYLE_DIR, 'coggle.json'));
    const svg = drawStatic(staticLayout(parse(readFixture(f + '.json')), S, measure));
    const file = path.join(path.dirname(new URL(import.meta.url).pathname), 'golden', `static-coggle-${f}.svg`);
    if (process.env.UPDATE_GOLDEN || !fs.existsSync(file)) {
      if (!process.env.UPDATE_GOLDEN) assert.fail(`missing golden ${path.basename(file)} (run with UPDATE_GOLDEN=1)`);
      fs.writeFileSync(file, svg);
    }
    assert.equal(svg, fs.readFileSync(file, 'utf8'));
  });
}
