// directions/inked.js — 5. Coggle recoloured: ink branches, labelled margins. Tufte redraws Coggle.
// Coggle's double-curve S branches (cubic, horizontal at both ends: coggle/geometry.js), but every branch is
// the same 1 px dark ink. Colour lives only in a 4 px swatch bar left of each top-level lead and in the lead
// text (the same hue, darkened as Coggle darkens text). The root is plain bold text on a 1.5 px rule, and
// its branches leave from the rule's right end. Branches end short of the text, so text never sits on ink.
import { Canvas, block, runsFor, typo, xMiddleOf, sampleCubic } from './common.js';
import { branchControlPoints } from '../coggle/geometry.js';
import { PALETTE, darken } from '../coggle/colour.js';

const INK = '#333', BRANCH = 1;
const ROOT = { size: 22, wrap: 190, rule: 1.5, ruleDrop: 7 };
const L1 = { size: 16, wrap: 260 };
const L2 = { size: 13, wrap: 280 };
const X = { root: 70, swatch: 4, swatchGap: 8, out: 14, l2: 64, end: 8 };
const GAP = { point: 9, group: 34 };
// Coggle's palette in an order that keeps neighbours distinct, yellow last (it darkens to olive).
const HUES = [6, 0, 1, 2, 5, 7, 4, 3].map(i => PALETTE[i]);

function branch(cv, from, to) {
  const p = branchControlPoints(from, to);
  const f = (q) => `${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
  cv.path(`M ${f(p[0])} C ${f(p[1])} ${f(p[2])} ${f(p[3])}`, sampleCubic(...p), { stroke: INK, width: BRANCH });
}

export function render(tree) {
  const cv = new Canvas();
  const root = block([{ text: typo(tree.root.text), weight: 600, role: 'lead' }], ROOT.size, ROOT.wrap, { leading: 1.2 });
  const groups = tree.root.children.map((c, i) => {
    const b = block(runsFor(c), L1.size, L1.wrap, { leading: 1.3 });
    const kids = c.children.map(p => block(runsFor(p), L2.size, L2.wrap, { leading: 1.35 }));
    const kidsH = kids.reduce((s, k) => s + k.h, 0) + GAP.point * Math.max(0, kids.length - 1);
    return { node: c, b, kids, kidsH, h: Math.max(b.h, kidsH), hue: HUES[i % HUES.length] };
  });
  const swatchX = root.w + X.root, l1X = swatchX + X.swatch + X.swatchGap;
  const l2X = l1X + Math.max(...groups.map(g => g.b.w)) + X.out + X.l2;

  let y = 0;
  const ends = [];
  for (const g of groups) {
    const mid = y + g.h / 2, top = mid - g.b.h / 2;
    cv.text(g.b, l1X, top, { lead: { fill: darken(g.hue) }, cont: { fill: INK } });
    // The swatch covers the lines that carry the lead; the root's branch meets its midpoint.
    const leadLines = Math.max(1, g.b.lines.filter(l => l.segs.some(s => s.role === 'lead')).length);
    const sTop = xMiddleOf(g.b, top) - g.b.size * 0.55, sBot = xMiddleOf(g.b, top, leadLines - 1) + g.b.size * 0.55;
    cv.rect(swatchX, sTop, X.swatch, sBot - sTop, g.hue);
    ends.push({ x: swatchX, y: (sTop + sBot) / 2 });
    // Its points: branches from just right of its text, at the lead's line, to each point's first line.
    const from = { x: l1X + g.b.w + X.out, y: xMiddleOf(g.b, top) };
    let ky = mid - g.kidsH / 2;
    g.kids.forEach(k => {
      branch(cv, from, { x: l2X - X.end, y: xMiddleOf(k, ky) });
      cv.text(k, l2X, ky, { lead: { fill: INK }, cont: { fill: INK } });
      ky += k.h + GAP.point;
    });
    y += g.h + GAP.group;
  }

  // The root, centred on the top-level answers, set on a rule its branches leave from.
  const rootMid = (ends[0].y + ends[ends.length - 1].y) / 2;
  const rootTop = rootMid - root.h + root.lh * 0.25;
  cv.text(root, 0, rootTop, { lead: { fill: '#000' } });
  const ruleY = rootTop + root.base + (root.lines.length - 1) * root.lh + ROOT.ruleDrop;
  cv.rect(0, ruleY - ROOT.rule / 2, root.w, ROOT.rule, '#000');
  for (const e of ends) branch(cv, { x: root.w, y: ruleY }, e);
  return cv;
}

export default { n: 5, slug: 'inked', render };
