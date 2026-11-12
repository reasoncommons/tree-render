// directions/outline.js — 3. Typographic outline: a contents page, or an Argdown outline. No connectors.
// Hierarchy comes only from indentation (0 / 40 / 80 px), hanging numbers in the left margin (1., 1.1,
// grey) and size (26 headline, then 20 / 15 px). A hairline separates the top-level groups. Every baseline
// sits on a 4 px grid: we track baselines, not boxes, and every step between them is a multiple of 4.
import { Canvas, block, runsFor, typo } from './common.js';

const GRID = 4;
const LEVELS = [
  { size: 26, lh: 32, wrap: 520, indent: 0 },
  { size: 20, lh: 28, wrap: 470, indent: 40 },
  { size: 15, lh: 20, wrap: 440, indent: 80 }, // 440 px of 15 px Plex is about 60 characters
];
const NUM = { fill: '#999', gap: 12 };
const CONT = '#666', TEXT = '#222';
const STEP = { afterRoot: 48, afterParent: 10, point: 8, ruleAbove: 22, ruleBelow: 34 };
const RULE = { stroke: '#ddd', width: 0.5 };

const snap = (v) => Math.ceil(v / GRID) * GRID;

export function render(tree) {
  const cv = new Canvas();
  const L = (d) => LEVELS[Math.min(d, LEVELS.length - 1)];
  const blockFor = (nd, d) => block(d === 0 ? [{ text: typo(nd.text), weight: 600, role: 'lead' }] : runsFor(nd), L(d).size, L(d).wrap, { lineHeight: L(d).lh });
  // Sets block b so its first baseline is at `base`; returns its last baseline.
  const put = (b, x, base, style) => { cv.text(b, x, base - b.base, style); return base + (b.lines.length - 1) * b.lh; };

  const root = blockFor(tree.root, 0);
  let base = put(root, 0, 0, { lead: { fill: '#000' } });
  const ruleX1 = Math.max(...LEVELS.map(l => l.indent + l.wrap)) - 40;

  tree.root.children.forEach((c, i) => {
    if (i === 0) base += snap(STEP.afterRoot + L(1).size * 0.74);
    else {
      const ruleY = base + STEP.ruleAbove;
      cv.line([{ x: L(1).indent, y: ruleY }, { x: ruleX1, y: ruleY }], RULE);
      base = snap(ruleY + STEP.ruleBelow);
    }
    const b = blockFor(c, 1);
    cv.label(c.num + '.', L(1).indent - NUM.gap, base, L(1).size, { fill: NUM.fill, align: 'end' });
    base = put(b, L(1).indent, base, { lead: { fill: '#000' }, cont: { fill: CONT } });
    c.children.forEach((p, j) => {
      base += snap((j ? STEP.point : STEP.afterParent) + L(2).lh);
      cv.label(p.num, L(2).indent - NUM.gap, base, L(2).size, { fill: NUM.fill, align: 'end' });
      base = put(blockFor(p, 2), L(2).indent, base, { lead: { fill: TEXT }, cont: { fill: TEXT } });
    });
  });
  return cv;
}

export default { n: 3, slug: 'outline', render };
