// directions/dendrogram.js — 1. Dendrogram: a scientific cladogram in Tufte's restraint.
// Monochrome, orthogonal elbows only. Each parent hangs its children in a column to its right: a leader
// runs from the parent's first line to a vertical stem, and a tick runs from the stem to each child's first
// line (baseline − 4 px), stopping 10 px short of the text. The first child sits on the parent's baseline,
// so parent, leader, tick and first child read as one straight line. Depth is shown by size (22/16/13 px).
import { Canvas, block, runsFor, baselineOf } from './common.js';

const SIZE = [22, 16, 13];
const WRAP = [200, 240, 270];
const INK = '#222', STROKE = 0.75;
const TICK = 16, TEXT_GAP = 10, STEM_GAP = 24; // stem at column right + 24; ticks 16 px long; 10 px clear of text
const LEAF_GAP = 0.5, GROUP_GAP = 2;
const LEAD_FILL = '#000', CONT_FILL = '#555', LEAF_FILL = '#222';

const lvl = (d) => Math.min(d, SIZE.length - 1);

export function render(tree) {
  const cv = new Canvas();
  // Measure every node, then set each depth's column at the widest block of the depth before it, so
  // children of one level share a left edge.
  const nodes = [];
  (function walk(nd, d) {
    const runs = d === 0 ? runsFor(nd, { weight: 600 }) : runsFor(nd);
    nodes.push(nd);
    nd._b = block(runs, SIZE[lvl(d)], WRAP[lvl(d)], { leading: 1.3 });
    nd._d = d;
    nd.children.forEach(c => walk(c, d + 1));
  })(tree.root, 0);
  const depth = Math.max(...nodes.map(nd => nd._d));
  const colW = Array.from({ length: depth + 1 }, (_, d) => Math.max(...nodes.filter(nd => nd._d === d).map(nd => nd._b.w)));
  const colX = [0];
  for (let d = 1; d <= depth; d++) colX[d] = colX[d - 1] + colW[d - 1] + STEM_GAP + TICK + TEXT_GAP;

  // White space between sibling blocks: half a line between leaves, two lines between branch groups.
  const gapAfter = (nd) => (nd.children.length ? GROUP_GAP : LEAF_GAP) * nd._b.lh;

  // Places nd with its top at `top`; returns the bottom of its subtree.
  function place(nd, top) {
    const b = nd._b, d = nd._d, x = colX[d];
    const y = baselineOf(b, top) - 4;
    nd._x = x; nd._top = top; nd._y = y;
    if (!nd.children.length) return top + b.h;
    let cTop = baselineOf(b, top) - nd.children[0]._b.base, bottom = top + b.h;
    nd.children.forEach((c, i) => {
      const cBottom = place(c, cTop);
      bottom = Math.max(bottom, cBottom);
      if (i < nd.children.length - 1) cTop = cBottom + gapAfter(c);
    });
    return bottom;
  }
  place(tree.root, 0);

  (function draw(nd) {
    const b = nd._b, d = nd._d;
    cv.text(b, nd._x, nd._top, d === 0
      ? { lead: { fill: LEAD_FILL }, cont: { fill: LEAD_FILL } }
      : { lead: { fill: LEAD_FILL }, cont: { fill: nd.lead ? CONT_FILL : LEAF_FILL } });
    if (!nd.children.length) return;
    const stemX = colX[d + 1] - TEXT_GAP - TICK;
    const first = nd.children[0], last = nd.children[nd.children.length - 1];
    // Leader from the end of the parent's first line to the stem.
    cv.line([{ x: nd._x + b.lines[0].w + TEXT_GAP, y: nd._y }, { x: stemX, y: nd._y }], { stroke: INK, width: STROKE });
    cv.line([{ x: stemX, y: Math.min(nd._y, first._y) }, { x: stemX, y: last._y }], { stroke: INK, width: STROKE, cap: 'square' });
    for (const c of nd.children) {
      cv.line([{ x: stemX, y: c._y }, { x: c._x - TEXT_GAP, y: c._y }], { stroke: INK, width: STROKE });
      draw(c);
    }
  })(tree.root);
  return cv;
}

export default { n: 1, slug: 'dendrogram', render };
