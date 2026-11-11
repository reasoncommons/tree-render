// coggle/layout.js: lay a parsed tree out the way Coggle's auto-arrange does (left to right, root on the left).
// Rules (docs/design/references/coggle-spec.md):
//   - A node's position is its junction: the point its incoming branch arrives at and its children leave from.
//   - Labels: a leaf's text starts 4 px right of its junction, centred 1 px above it. A node with children
//     has its text right-aligned 9 px left of its junction, sitting 9 px above the branch (if the node is
//     above its parent) or 9 px below it (if below). The root's text is centred in the grey root box.
//   - Horizontal: a leaf sits 54 + 0.02 × (tallest sibling leaf text) px right of its parent's junction; a
//     node with children sits xf + 11 + T + max(40, 0.22 T) px right, where xf is where its branch starts
//     (root: half the root box + 2; others: −1) and T is the widest label among those siblings.
//   - Vertical: siblings stack top to bottom with 15 px between any two text boxes that overlap in x; the
//     children's whole extent is then centred on the parent's junction.
import { lineWeight, endInset } from './geometry.js';
import { PALETTE, ROOT_COLOUR, randomWalk, textColour, rootTextColour } from './colour.js';
import { fontSize, runsFor, WRAP_WIDTH } from './text.js';

export const SPACING = { ySpace: 15, leafX: 54, heightFactor: 0.02, minLine: 40, lineFactor: 0.22, labelPad: 9, leafPad: 4, leafLift: 1, rootGap: 2 };

// `pin(r)` (optional, for comparisons): returns an absolute {x, y} junction for a node, overriding the layout.
export function coggleLayout(tree, T, { palette = PALETTE, paletteStart = 0, pin = null } = {}) {
  const nodes = [];
  const build = (n, level, parent, idx) => {
    const r = { node: n, level, parent, children: [], num: n.num || 'root', x: 0, y: 0, ttb: -1 };
    r.t = T.layoutText(runsFor(n), n.textSize || fontSize(level), WRAP_WIDTH);
    if (level === 0) { r.colour = n.colour || ROOT_COLOUR; r.textColour = rootTextColour(r.colour); }
    else if (level === 1) r.colour = n.colour || palette[(idx + paletteStart) % palette.length];
    else r.colour = n.colour || randomWalk(parent.colour, String(r.num));
    if (level > 0) { r.textColour = textColour(r.colour); r.weight = lineWeight(level); }
    nodes.push(r);
    r.children = n.children.map((c, i) => build(c, level + 1, r, i));
    return r;
  };
  const root = build(tree.root, 0, null, 0);

  // Root box (shape) size, Coggle's: content = text + 9 px padding; shape = content + 14 wide (min 80), + 8 tall.
  const contentW = root.t.w + 2 * SPACING.labelPad, contentH = root.t.h + 2 * SPACING.labelPad;
  let shapeW = Math.max(80, Math.round(contentW) + 14); if (shapeW % 2) shapeW += 1;
  const shapeH = Math.round(contentH) + 8;
  root.shape = { w: shapeW, h: shapeH };
  root.from = shapeW / 2 + SPACING.rootGap; // where the root's branches start

  const isLeaf = (r) => !r.children.length;
  // A node's own text box, relative to its junction.
  const ownBox = (r) => {
    const { w, h } = r.t;
    if (isLeaf(r)) return { x: SPACING.leafPad, y: -SPACING.leafLift - h / 2, w, h };
    return { x: -SPACING.labelPad - w, y: r.ttb > 0 ? SPACING.labelPad : -SPACING.labelPad - h, w, h };
  };
  const shift = (b, dx, dy) => ({ x: b.x + dx, y: b.y + dy, w: b.w, h: b.h });

  // Lay out r's subtree with r at (0, 0); returns its descendants' text boxes (not r's own).
  const sub = (r) => {
    if (isLeaf(r)) return [];
    const kids = r.children, subs = kids.map(sub);
    const from = r.level === 0 ? r.from : -1;
    const leaves = kids.filter(isLeaf), inner = kids.filter(k => !isLeaf(k));
    const leafDx = SPACING.leafX + SPACING.heightFactor * Math.max(0, ...leaves.map(k => k.t.h));
    const Tw = Math.max(0, ...inner.map(k => k.t.w));
    const innerDx = from + SPACING.labelPad + SPACING.rootGap + Tw + Math.max(SPACING.minLine, SPACING.lineFactor * Tw);
    kids.forEach(k => { k.rx = isLeaf(k) ? leafDx : innerDx; });
    // first guess at above/below: the upper half above, the lower half below
    kids.forEach((k, i) => { k.ttb = i > (kids.length - 1) / 2 ? 1 : -1; });
    let boxes = [];
    for (let pass = 0; pass < 6; pass++) {
      const placed = [];
      kids.forEach((k, i) => {
        const own = [ownBox(k), ...subs[i]].map(b => shift(b, k.rx, 0));
        let y = i ? kids[i - 1].ry : 0;
        for (const b of own) for (const c of placed) {
          if (b.x < c.x + c.w && c.x < b.x + b.w) y = Math.max(y, c.y + c.h + SPACING.ySpace - b.y);
        }
        k.ry = y;
        for (const b of own) placed.push(shift(b, 0, y));
      });
      const top = Math.min(...placed.map(b => b.y)), bottom = Math.max(...placed.map(b => b.y + b.h));
      const mid = (top + bottom) / 2;
      kids.forEach(k => { k.ry -= mid; });
      boxes = placed.map(b => shift(b, 0, -mid));
      let changed = false;
      kids.forEach(k => { const t = k.ry > 1 ? 1 : -1; if (!isLeaf(k) && t !== k.ttb) { k.ttb = t; changed = true; } });
      if (!changed) break;
    }
    return boxes;
  };
  sub(root);

  // Absolute positions, label boxes and branches.
  const place = (r, x, y) => {
    const p = pin && pin(r);
    if (p) { x = p.x; y = p.y; if (r.parent) r.ttb = y > r.parent.y + 1 ? 1 : -1; }
    r.x = x; r.y = y;
    if (r.level === 0) r.text = { x: x - r.t.w / 2, y: y - r.t.h / 2, w: r.t.w, h: r.t.h, align: 'center' };
    else { const b = ownBox(r); r.text = { x: x + b.x, y: y + b.y, w: b.w, h: b.h, align: isLeaf(r) ? 'left' : 'right' }; }
    r.children.forEach(k => place(k, x + k.rx, y + k.ry));
  };
  place(root, 0, 0);
  const branches = nodes.filter(r => r.parent).map(r => {
    const p = r.parent, w = r.weight;
    const from = p.level === 0 ? { x: p.x + p.from, y: p.y } : { x: p.x - 1, y: p.y };
    return { node: r, from, to: { x: r.x - endInset(w), y: r.y }, w, colour: r.colour };
  });

  // Bounds: text, the root box and every branch's control-point hull.
  let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
  const add = (x, y, w = 0, h = 0) => { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x + w); y2 = Math.max(y2, y + h); };
  for (const r of nodes) add(r.text.x, r.text.y, r.text.w, r.text.h);
  add(-shapeW / 2, -shapeH / 2, shapeW, shapeH);
  for (const b of branches) { add(b.from.x, b.from.y - b.w / 2, 0, b.w); add(b.to.x + 8, b.to.y - b.w / 2, 0, b.w); }
  return { root, nodes, branches, bounds: { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, title: tree.title || '' };
}
