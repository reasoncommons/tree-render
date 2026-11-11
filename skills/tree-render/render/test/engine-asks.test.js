// The seven engine asks of 2026-11-11 (docs/design/2026-11-11-engine-asks.md), each behind a style
// parameter that is off by default: junction cap, accent in palette mode, run-in lead, text halo,
// root placement and root spine, shared fan spine, trunk width by subtree size.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parse.js';
import { resolveStyle, DEFAULT_STYLE } from '../src/style.js';
import { staticLayout, lineBoxes } from '../src/static-layout.js';
import { drawStatic } from '../src/static-draw.js';
import { checkStatic, branchesUnderText, textOverlaps } from '../src/static-check.js';
import { createMeasurer } from '../src/measure-node.js';
import { readFixture } from './helpers.js';

const measure = await createMeasurer();
const Q2 = parse(readFixture('v01-q2.json'));
const OVERVIEW = parse(readFixture('v01-overview.json'));
const lay = (over, tree = Q2) => staticLayout(tree, resolveStyle(over), measure);
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const node = (L, num) => L.nodes.find(n => n.num === num);
const branch = (L, num) => L.branches.find(g => g.num === num);

test('defaults: every engine ask is off', () => {
  assert.equal(DEFAULT_STYLE.branch.junctionCap, false);
  assert.equal(DEFAULT_STYLE.colour.accentInPalette, false);
  assert.equal(DEFAULT_STYLE.font.leadRunIn, 0);
  assert.equal(DEFAULT_STYLE.font.halo, 0);
  assert.equal(DEFAULT_STYLE.root.place, 'span');
  assert.equal(DEFAULT_STYLE.root.spine, 0);
  assert.equal(DEFAULT_STYLE.branch.spine, false);
  assert.equal(DEFAULT_STYLE.branch.weight, 0);
  const L = lay({});
  assert.equal(L.dots.filter(d => d.kind === 'cap').length, 0);
  assert.deepEqual(L.spines, []);
  assert.equal(L.rootSpine, null);
  assert.doesNotMatch(drawStatic(L), /paint-order/);
});

// --- 1. junction cap --------------------------------------------------------------------------------

test('junction cap: a disc of half the start width in the branch colour at every branch start', () => {
  for (const from of ['text-end', 'fan']) {
    const L = lay({ attach: { from }, branch: { junctionCap: true, width: [[15, 9], [8, 5]] }, colour: { mode: 'palette' } });
    const caps = L.dots.filter(d => d.kind === 'cap');
    for (const g of L.branches) {
      const c = caps.find(d => near(d.x, g.x0, 0.01) && near(d.y, g.y0, 0.01) && d.colour === g.colour);
      assert.ok(c, `${from}: no cap at the start of ${g.num}`);
      assert.ok(near(c.r, g.w0 / 2, 0.01));
    }
    // one disc per start point and colour
    const keys = caps.map(d => [d.x.toFixed(2), d.y.toFixed(2), d.colour].join());
    assert.equal(new Set(keys).size, keys.length);
    assert.equal((drawStatic(L).match(/class="dot cap"/g) || []).length, caps.length);
  }
});

test('junction cap per depth: [false, true] caps only the level-1 junctions', () => {
  const L = lay({ branch: { junctionCap: [false, true] } });
  const caps = L.dots.filter(d => d.kind === 'cap');
  assert.ok(caps.length);
  assert.ok(caps.every(c => L.nodes.some(n => n.depth === 1 && near(n.sx, c.x, 0.01) && near(n.sy, c.y, 0.01))));
});

// --- 2. accent in palette mode -----------------------------------------------------------------------

test('accent in palette mode: a node marked accent (and its subtree) takes colour.accent', () => {
  const S = { colour: { mode: 'palette', palette: ['#111111', '#222222', '#333333'], textPalette: ['#010101', '#020202', '#030303'], accent: '#D7261E', accentInPalette: true }, font: { color: ['ink', 'branch', 'branch'] } };
  const L = lay(S);
  assert.equal(branch(L, '5').colour, '#D7261E');
  assert.equal(branch(L, '5.2').colour, '#D7261E');
  assert.equal(node(L, '5').lines[0].color, '#D7261E');
  assert.equal(node(L, '5.1').lines[0].color, '#D7261E');
  assert.equal(branch(L, '1').colour, '#111111');
  assert.equal(branch(L, '4').colour, '#111111');
  assert.equal(node(L, '2').lines[0].color, '#020202');
  // a separate text colour for the accent
  const T = lay({ ...S, colour: { ...S.colour, accentText: '#991111' } });
  assert.equal(node(T, '5').lines[0].color, '#991111');
  assert.equal(branch(T, '5').colour, '#D7261E');
  // off: the palette slot
  const O = lay({ colour: { ...S.colour, accentInPalette: false } });
  assert.equal(branch(O, '5').colour, '#222222');
});

// --- 3. run-in lead ----------------------------------------------------------------------------------

test('run-in lead: a short lead shares its line with the start of the continuation', () => {
  const S = { font: { size: [36, 30, 24], leadWeight: 'M', contScale: [1, 0.86, 1] }, wrap: { width: [300, 420, 460] } };
  const off = lay(S, OVERVIEW);
  const on = lay({ ...S, font: { ...S.font, leadRunIn: 0.5 } }, OVERVIEW);
  const a0 = node(off, '1'), a1 = node(on, '1');
  assert.equal(a0.lines[0].t, 'Alignment');
  const first = a1.lines[0];
  assert.ok(first.runs && first.runs.length === 2, 'two runs on the first line');
  const [lead, cont] = first.runs;
  assert.equal(lead.t, 'Alignment');
  assert.equal(lead.weight, 'M');
  assert.equal(lead.size, 30);
  assert.equal(lead.x, 0);
  assert.equal(cont.role, 'cont');
  assert.equal(cont.size, 25.8);
  assert.ok(cont.x > lead.w && cont.x < lead.w + 15, 'one space after the lead');
  assert.ok(cont.t.startsWith('Partly'));
  assert.ok(near(first.w, cont.x + cont.w, 0.01));
  assert.ok(first.w <= a1.wrapW + 0.01);
  assert.ok(a1.lines.length < a0.lines.length, 'a line saved');
  // every word kept, in order
  const words = l => (l.runs ? l.runs.map(r => r.t).join(' ') : l.t);
  assert.equal(a1.lines.map(words).join(' '), a0.lines.map(l => l.t).join(' '));
  // a lead wider than leadRunIn × wrap width stays on its own line
  const long = node(on, '4');
  assert.ok(!long.lines[0].runs, 'Consciousness (minor) is long');
  // drawn as one text with two tspans, the lead in Mittel
  const svg = drawStatic(on);
  assert.match(svg, /<text[^>]*><tspan x="0"[^>]*font-family="ApfelMittel"[^>]*>Alignment<\/tspan><tspan x="[\d.]+"[^>]*>Partly/);
  assert.deepEqual(textOverlaps(on), []);
  assert.deepEqual(branchesUnderText(on), []);
});

test('run-in lead with maxLines: an ellipsis on a run-in line cuts the continuation run', () => {
  const L = lay({ font: { leadRunIn: 0.6 }, wrap: { maxLines: [3, 1, 1] } }, OVERVIEW);
  const n = node(L, '1');
  assert.equal(n.lines.length, 1);
  const last = n.lines[0];
  assert.ok(last.runs);
  assert.match(last.runs[1].t, /…$/);
  assert.ok(last.w <= n.wrapW + 0.01);
});

// --- 4. text halo -------------------------------------------------------------------------------------

test('text halo: text is stroked in the background colour beneath its fill', () => {
  const L = lay({ font: { halo: 3 }, colour: { bg: '#FAFAF7' } });
  const svg = drawStatic(L);
  const texts = svg.match(/<text [^>]*>/g).filter(t => !/class="(title|subtitle|footer)"/.test(t));
  assert.ok(texts.length >= L.nodes.length);
  for (const t of texts) assert.match(t, /stroke="#FAFAF7" stroke-width="3" stroke-linejoin="round" paint-order="stroke"/);
  const C = drawStatic(lay({ font: { halo: [0, 2], haloColor: '#000000' } }));
  assert.match(C, /stroke="#000000" stroke-width="2"/);
  assert.doesNotMatch(C.split('\n').find(l => /data-depth="0"/.test(l)), /paint-order/);
});

// --- 5. root placement and root spine ----------------------------------------------------------------

test('root placement: mean of the children\'s attach points, or the middle child\'s', () => {
  for (const tree of [Q2, OVERVIEW]) {
    const M = lay({ root: { place: 'mean' } }, tree);
    const kids = M.root.children;
    assert.ok(near(M.root.ay, kids.reduce((s, c) => s + c.ay, 0) / kids.length, 0.5));
    const D = lay({ root: { place: 'middle' } }, tree);
    const k = D.root.children, m = k.length;
    const want = m % 2 ? k[(m - 1) / 2].ay : (k[m / 2 - 1].ay + k[m / 2].ay) / 2;
    assert.ok(near(D.root.ay, want, 0.5));
    for (const L of [M, D]) {
      assert.ok(Math.min(...L.nodes.map(n => n.y)) >= -0.01, 'nothing above the map');
      assert.ok(near(Math.min(...L.nodes.map(n => n.y)), 0, 0.01), 'the map starts at 0');
      assert.deepEqual(checkStatic(L).errors, []);
      for (const g of L.branches.filter(b => b.depth === 1)) assert.ok(near(g.y0, L.root.sy, 0.01));
    }
  }
});

test('root spine: trunks leave a short vertical spine, each at its child\'s height clamped to the spine', () => {
  const L = lay({ root: { spine: 80 }, branch: { width: [[12, 8], [6, 4]] }, colour: { rootBranch: '#444444' } });
  const s = L.rootSpine;
  assert.ok(s);
  assert.ok(near(s.x, L.root.sx, 0.01));
  assert.ok(near(s.y0, L.root.ay - 40, 0.01) && near(s.y1, L.root.ay + 40, 0.01));
  assert.equal(s.colour, '#444444');
  assert.equal(s.w, 12);
  for (const g of L.branches.filter(b => b.depth === 1)) {
    const c = node(L, g.num);
    assert.ok(near(g.x0, s.x, 0.01));
    assert.ok(near(g.y0, Math.max(s.y0, Math.min(s.y1, c.ay)), 0.01), `${g.num}`);
  }
  assert.match(drawStatic(L), /class="root-spine"/);
  assert.deepEqual(checkStatic(L).errors, []);
  // a spine longer than the children's span is cut to it
  const T = lay({ root: { spine: 5000 } });
  const ys = T.root.children.map(c => c.ay);
  assert.ok(near(T.rootSpine.y0, Math.min(...ys), 0.01) && near(T.rootSpine.y1, Math.max(...ys), 0.01));
});

// --- 6. shared fan spine --------------------------------------------------------------------------------

test('shared fan spine: elbow fans draw one spine per parent and each leaf peels off it', () => {
  for (const tree of [Q2, OVERVIEW]) {
    for (const mode of ['side', 'coggle']) {
      const S = { attach: { mode }, branch: { shape: ['bezier-s', 'elbow-rounded'], radius: 24, elbow: 0.42, spine: [false, true], width: [[15, 9.5], [8, 5]] } };
      const L = lay(S, tree);
      const base = lay({ ...S, branch: { ...S.branch, spine: false } }, tree);
      const parents = L.nodes.filter(n => n.depth === 1 && n.children.length > 1);
      assert.ok(parents.length);
      for (const p of parents) {
        const sp = L.spines.filter(s => s.num === p.num);
        assert.ok(sp.length >= 1 && sp.length <= 2, `${mode} ${p.num} spines`);
        for (const s of sp) {
          assert.deepEqual(s.points[0].map(v => +v.toFixed(2)), [+p.sx.toFixed(2), +p.sy.toFixed(2)]);
          assert.equal(s.w, 8);
        }
        const xs = p.children.map(c => branch(L, c.num)).filter(g => Math.abs(g.y1 - g.y0) >= 0.5).map(g => g.points[0][0]);
        assert.ok(xs.every(x => near(x, xs[0], 0.01)), 'all leaves peel off the same x');
        const spineX = sp[0].points[sp[0].points.length - 1][0];
        assert.ok(near(xs[0], spineX, 0.01));
        // the outermost leaf above and below starts where its spine ends
        for (const s of sp) {
          const end = s.points[s.points.length - 1];
          assert.ok(p.children.some(c => { const st = branch(L, c.num).points[0]; return near(st[0], end[0], 0.01) && near(st[1], end[1], 0.01); }));
        }
        // leaves still end where they did
        for (const c of p.children) {
          const a = branch(L, c.num).points.at(-1), b = branch(base, c.num).points.at(-1);
          assert.ok(near(a[0], b[0], 0.01) && near(a[1], b[1], 0.01));
        }
      }
      assert.deepEqual(branchesUnderText(L), [], `${mode}`);
      assert.deepEqual(textOverlaps(L), [], `${mode}`);
      assert.equal((drawStatic(L).match(/class="spine"/g) || []).length, L.spines.length);
    }
  }
});

test('shared fan spine is ignored for shapes other than elbow-rounded', () => {
  const L = lay({ branch: { shape: 'bezier-s', spine: true } });
  assert.deepEqual(L.spines, []);
});

// --- 7. trunk width by subtree size ---------------------------------------------------------------------

test('trunk width by subtree size: more leaves, a wider start; clamped; equal subtrees unchanged', () => {
  const L = lay({ branch: { width: [[15, 9], [8, 5]], weight: 0.5, weightClamp: [0.8, 1.25] } });
  const t = L.branches.filter(g => g.depth === 1);
  const leaves = num => node(L, num).children.length;
  const w3 = t.filter(g => leaves(g.num) === 3).map(g => g.w0), w4 = t.filter(g => leaves(g.num) === 4).map(g => g.w0);
  assert.ok(w3.length && w4.length);
  assert.ok(w4[0] > w3[0]);
  assert.ok(near(w4[0] / w3[0], Math.sqrt(4 / 3), 0.01));
  for (const g of t) assert.ok(g.w0 >= 15 * 0.8 - 1e-9 && g.w0 <= 15 * 1.25 + 1e-9);
  // the end width is the style's
  for (const g of t) assert.equal(g.w1, 9);
  // depth 1 → 2 branches lead to single leaves: all equal
  assert.ok(L.branches.filter(g => g.depth === 2).every(g => g.w0 === 8));
  const C = lay({ branch: { width: [[15, 9]], weight: 4, weightClamp: [0.9, 1.1] } });
  for (const g of C.branches.filter(b => b.depth === 1)) assert.ok(g.w0 >= 13.5 - 1e-9 && g.w0 <= 16.5 + 1e-9);
});
