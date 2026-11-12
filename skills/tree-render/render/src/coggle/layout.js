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
import { branchSamples, branchHitsBox } from './collide.js';
import { PALETTE, randomWalk, textColour, rootTextColour, adjust } from './colour.js';
import { fontSize, runsFor, WRAP_WIDTH } from './text.js';
import { EXACT } from './styles.js';

// Our default shape (with collision avoidance on): taller and narrower than Coggle's, since pages and phones
// are narrow but tall and vertical room keeps the S-curves clear of labels. Interior labels wrap narrow,
// leaves a little narrower than Coggle's 350 px, and sibling groups get a little more air.
export const TALL = { rootWrap: 260, interiorWrap: 260, leafWrap: 300, ySpace: 15, innerYSpace: 30 };
// Collision avoidance: wrap widths to try for interior labels (down to 200: no ragged 6–7 line blocks), gaps next
// to sibling labels (capped at 100 px) and the extra run (px) to add, in steps (wraps: only those at or below the
// style's interior wrap are tried). Cost = horizontal span + heightCost × growth in height + wrapCost × px of
// wrap given up. Other boxes (leaf groups) get only groupShare of the extra gap, so groups stay close together:
// compact (Rufus, 2026-11-12) rather than tall at any price.
export const AVOID = { wraps: [280, 260, 240, 220, 200], ySpaces: [30, 40, 50, 60, 70, 80, 90, 100], heightCost: 0.2, wrapCost: 1, maxExtra: 900, step: 5, groupShare: 0.5 };

// Root with kind 'rule': px between the root text and the hairline.
const RULE_GAP = 6;

export const SPACING = { ySpace: 15, leafX: 54, heightFactor: 0.02, minLine: 40, lineFactor: 0.22, labelPad: 9, leafPad: 4, leafLift: 1, rootGap: 2 };

// `pin(r)` (optional, for comparisons): returns an absolute {x, y} junction for a node, overriding the layout.
// `avoidCollisions` (default on): where Coggle's layout would run a branch through a sibling's label,
// re-wrap that group's interior labels narrower and lengthen its horizontal run until no branch comes
// within 4 px of a label, and use the TALL shape (our deviations from Coggle; off reproduces Coggle's own layout).
// `style` (styles.js): font sizes, branch widths, colours, root treatment and spacing; T must be made with its font.
// `leadBreak` / `chevrons` (default: the style's): a bold lead on its own line(s); Coggle's chevrons on the root box.
// Both are off in our styles' defaults but on in Coggle; the pinned Coggle comparison passes them explicitly.
export function coggleLayout(tree, T, { palette = PALETTE, paletteStart = 0, pin = null, avoidCollisions = true, style = EXACT, leadBreak = style.leadBreak, chevrons = style.root.chevrons } = {}) {
  const S = { ...SPACING, ...style.spacing };
  if (pin) avoidCollisions = false;
  const tall = avoidCollisions;
  const rootWrap = tall ? TALL.rootWrap : WRAP_WIDTH, leafWrap = tall ? (style.wrap?.leaf ?? TALL.leafWrap) : WRAP_WIDTH, innerWrap = tall ? (style.wrap?.interior ?? TALL.interiorWrap) : WRAP_WIDTH;
  const wraps = [innerWrap, ...AVOID.wraps.filter(w => w < innerWrap)];
  const nodes = [];
  const wrapped = new Map();
  const textAt = (r, wrap) => {
    const key = r.num + '|' + wrap;
    if (!wrapped.has(key)) wrapped.set(key, T.layoutText(r.runs, r.node.textSize || fontSize(r.level, style.sizes), wrap));
    return wrapped.get(key);
  };
  const build = (n, level, parent, idx) => {
    const r = { node: n, level, parent, children: [], num: n.num || 'root', x: 0, y: 0, ttb: -1 };
    // mono face (if the font has one): the text after a bold lead, and leaves' text
    const mono = level > 0 && (!!n.lead || !n.children.length);
    const runs = level === 0 && style.root.bold ? runsFor(n).map(x => ({ ...x, bold: true })) : runsFor(n, { leadBreak, mono });
    r.runs = runs;
    r.t = T.layoutText(runs, n.textSize || fontSize(level, style.sizes), !level ? rootWrap : !n.children.length ? leafWrap : WRAP_WIDTH);
    if (level === 0) { r.colour = n.colour || style.root.colour; r.textColour = rootTextColour(r.colour); }
    else if (level === 1) r.colour = n.colour || adjust(palette[(idx + paletteStart) % palette.length], style.colour);
    else r.colour = n.colour || randomWalk(parent.colour, String(r.num));
    if (level > 0) {
      r.textColour = textColour(r.colour);
      if (style.cont && n.lead) r.contColour = adjust(r.textColour, style.cont);
      r.weight = Math.max(style.branch.min, lineWeight(level) * style.branch.scale);
    }
    nodes.push(r);
    r.children = n.children.map((c, i) => build(c, level + 1, r, i));
    return r;
  };
  const root = build(tree.root, 0, null, 0);

  // Root box (shape) size, Coggle's: content = text + 9 px padding; shape = content + 14 wide (min 80), + 8 tall.
  const contentW = root.t.w + 2 * S.labelPad, contentH = root.t.h + 2 * S.labelPad;
  let shapeW = Math.max(80, Math.round(contentW) + 14); if (shapeW % 2) shapeW += 1;
  const shapeH = Math.round(contentH) + 8;
  // without chevrons the shape is just the box (7 px in from the chevron tips on each side)
  root.shape = chevrons ? { w: shapeW, h: shapeH, kind: style.root.kind, chevrons: true } : { w: shapeW - 14, h: shapeH - 14, kind: style.root.kind, chevrons: false };
  root.stroke = style.root.stroke;
  root.from = root.shape.w / 2 + S.rootGap; // where the root's branches start
  if (style.root.kind === 'rule') {
    // no box: a hairline just right of the text, the branches leaving from it
    root.rule = { x: Math.round(root.t.w / 2) + RULE_GAP, h: root.t.h + 6 };
    root.shape = { w: 2 * root.rule.x, h: root.rule.h, kind: 'rule' };
    root.from = root.rule.x + 1;
  }

  const isLeaf = (r) => !r.children.length;
  // A node's own text box, relative to its junction.
  const ownBox = (r) => {
    const { w, h } = r.t;
    if (isLeaf(r)) return { x: S.leafPad, y: -S.leafLift - h / 2, w, h };
    return { x: -S.labelPad - w, y: r.ttb > 0 ? S.labelPad : -S.labelPad - h, w, h };
  };
  const shift = (b, dx, dy) => ({ x: b.x + dx, y: b.y + dy, w: b.w, h: b.h });

  // Lay out r's subtree with r at (0, 0); returns its descendants' text boxes (not r's own).
  const sub = (r) => {
    if (isLeaf(r)) return [];
    const kids = r.children, subs = kids.map(sub);
    const from = r.level === 0 ? r.from : -1;
    const leaves = kids.filter(isLeaf), inner = kids.filter(k => !isLeaf(k));
    const leafDx = S.leafX + S.heightFactor * Math.max(0, ...leaves.map(k => k.t.h));

    // Coggle's arrangement, with three knobs that only collision avoidance turns: the wrap width of the
    // interior labels, extra horizontal run before the interior junctions, and extra space between siblings.
    const baseYSpace = tall && inner.length ? TALL.innerYSpace : S.ySpace;
    const arrange = ({ wrap = innerWrap, extra = 0, ySpace = baseYSpace } = {}) => {
      for (const k of inner) k.t = textAt(k, wrap);
      const Tw = Math.max(0, ...inner.map(k => k.t.w));
      const innerDx = from + S.labelPad + S.rootGap + Tw + Math.max(S.minLine, S.lineFactor * Tw) + extra;
      kids.forEach(k => { k.rx = isLeaf(k) ? leafDx : innerDx; });
      // first guess at above/below: the upper half above, the lower half below
      kids.forEach((k, i) => { k.ttb = i > (kids.length - 1) / 2 ? 1 : -1; });
      let boxes = [];
      for (let pass = 0; pass < 6; pass++) {
        const placed = [], labs = [];
        kids.forEach((k, i) => {
          const own = [ownBox(k), ...subs[i]].map(b => shift(b, k.rx, 0));
          let y = i ? kids[i - 1].ry : 0;
          // ySpace (the knob) applies next to a sibling's own label, which the S-curves have to pass;
          // anything else (leaves, deeper labels) keeps the base gap, so sibling groups don't drift apart
          own.forEach((b, m) => placed.forEach((c, n) => {
            const gap = m === 0 || labs[n] ? ySpace : baseYSpace + AVOID.groupShare * (ySpace - baseYSpace);
            if (b.x < c.x + c.w && c.x < b.x + b.w) y = Math.max(y, c.y + c.h + gap - b.y);
          }));
          k.ry = y;
          own.forEach((b, m) => { placed.push(shift(b, 0, y)); labs.push(m === 0); });
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
    // Does any branch of this group cross a sibling's label (or anything in a sibling's subtree)?
    const clashes = () => {
      const owned = kids.map((k, i) => [shift(ownBox(k), k.rx, k.ry), ...subs[i].map(b => shift(b, k.rx, k.ry))]);
      return kids.some((k, i) => {
        const f = { x: from, y: 0 }, t = { x: k.rx - endInset(k.weight), y: k.ry }, s = branchSamples(f, t);
        return owned.some((bs, j) => bs.some((b, m) => !(j === i && m === 0) && branchHitsBox(f, t, k.weight, b, { samples: s })));
      });
    };

    let boxes = arrange();
    if (!avoidCollisions || !clashes()) return boxes;
    // Search for the cheapest arrangement that clears: for each sibling gap and wrap width, the least extra
    // run that works; cost = horizontal span + growth in height. A narrower wrap shortens the labels so the
    // extra run pushes them right, out of the steep middle of the neighbouring S-curves, without the tree
    // growing much wider; a little more vertical room lets the S-curves pass between the labels.
    let best = null;
    const height = (bs) => Math.max(...bs.map(b => b.y + b.h)) - Math.min(...bs.map(b => b.y));
    const baseH = height(boxes);
    for (const ySpace of inner.length ? AVOID.ySpaces : AVOID.ySpaces.map(v => v - TALL.innerYSpace + S.ySpace)) {
      for (const wrap of inner.length ? wraps : [innerWrap]) {
        for (let extra = 0; extra <= AVOID.maxExtra; extra += AVOID.step) {
          const bs = arrange({ wrap, extra, ySpace });
          if (clashes()) continue;
          const span = Math.max(...kids.map(k => k.rx));
          const cost = span + AVOID.heightCost * (height(bs) - baseH) + AVOID.wrapCost * (innerWrap - wrap);
          if (!best || cost < best.cost - 0.5) best = { cost, span, wrap, extra, ySpace };
          break;
        }
      }
    }
    if (best) return arrange(best);
    // Still crossing (not seen in practice): open the sibling gap further at the narrowest wrap and longest run.
    for (let ySpace = 100; ySpace <= 300; ySpace += 10) {
      boxes = arrange({ wrap: wraps[wraps.length - 1], extra: AVOID.maxExtra, ySpace });
      if (!clashes()) return boxes;
    }
    return boxes;
  };
  sub(root);

  // Absolute positions, label boxes and branches.
  const place = (r, x, y) => {
    const p = pin && pin(r);
    if (p) { x = p.x; y = p.y; if (r.parent) r.ttb = y > r.parent.y + 1 ? 1 : -1; }
    r.x = x; r.y = y;
    if (r.level === 0 && r.rule) r.text = { x: x + r.rule.x - RULE_GAP - r.t.w, y: y - r.t.h / 2, w: r.t.w, h: r.t.h, align: 'right' };
    else if (r.level === 0) r.text = { x: x - r.t.w / 2, y: y - r.t.h / 2, w: r.t.w, h: r.t.h, align: 'center' };
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
  add(-root.shape.w / 2, -root.shape.h / 2, root.shape.w, root.shape.h);
  for (const b of branches) { add(b.from.x, b.from.y - b.w / 2, 0, b.w); add(b.to.x + 8, b.to.y - b.w / 2, 0, b.w); }
  return { root, nodes, branches, bounds: { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, title: tree.title || '' };
}
