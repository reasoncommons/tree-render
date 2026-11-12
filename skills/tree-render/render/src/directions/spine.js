// directions/spine.js — 2. Spine and ticks: a vertical "how it works" rail, as in an FT explainer.
// One 2 px spine runs down the left from the root to the last answer. Each top-level answer is a 10 px
// tick off the spine with a 6 px dot at the join, its bold lead set as a small headline and its
// continuation as a dek beneath. Its points hang from a thin grey rail set 32 px in, with hairline ticks.
// One accent colour, used only for the dots and the rule under the root. A single narrow column.
import { Canvas, block, runsFor, typo, xMiddleOf } from './common.js';

const ACCENT = '#990f3d'; // FT claret
const SPINE = '#111', RAIL = '#bbb';
const ROOT = { size: 24, wrap: 330 };
const L1 = { lead: 18, cont: 15, wrap: 320, tick: 10, gap: 8 };
const L2 = { size: 13, wrap: 290, inset: 32, tick: 8, gap: 6 };
const SPACE = { rule: 10, afterRule: 26, dek: 4, rail: 10, point: 8, group: 30 };

export function render(tree) {
  const cv = new Canvas();
  const spineX = 0;
  const root = block([{ text: typo(tree.root.text), weight: 600, role: 'lead' }], ROOT.size, ROOT.wrap, { leading: 1.2 });
  cv.text(root, spineX, 0, { lead: { fill: '#000' } });
  const ruleY = root.h + SPACE.rule;
  cv.rect(spineX - 1, ruleY - 1, root.w + 1, 2, ACCENT);

  let y = ruleY + SPACE.afterRule, lastTick = ruleY;
  const under = cv.mark();
  const textX = spineX + L1.tick + L1.gap;
  tree.root.children.forEach((c, i) => {
    // Lead as a headline, the continuation as a dek under it.
    const lead = block(runsFor(c, { leadOnly: true }), L1.lead, L1.wrap, { leading: 1.25 });
    const tickY = xMiddleOf(lead, y);
    cv.line([{ x: spineX, y: tickY }, { x: spineX + L1.tick, y: tickY }], { stroke: SPINE, width: 1.5 });
    cv.circle(spineX, tickY, 3, { fill: ACCENT });
    cv.text(lead, textX, y, { lead: { fill: '#000' }, cont: { fill: '#000' } });
    lastTick = tickY;
    y += lead.h;
    if (c.lead && c.cont) {
      const dek = block([{ text: typo(c.cont), weight: 400, role: 'cont' }], L1.cont, L1.wrap, { leading: 1.35 });
      cv.text(dek, textX, y + SPACE.dek, { cont: { fill: '#555' } });
      y += SPACE.dek + dek.h;
    }
    if (c.children.length) {
      const railX = spineX + L2.inset, railTop = y + SPACE.rail;
      y = railTop + 2;
      let lastY = railTop;
      c.children.forEach((p, j) => {
        const b = block(runsFor(p), L2.size, L2.wrap, { leading: 1.35 });
        const py = xMiddleOf(b, y);
        cv.line([{ x: railX, y: py }, { x: railX + L2.tick, y: py }], { stroke: RAIL, width: 1 });
        cv.text(b, railX + L2.tick + L2.gap, y, { lead: { fill: '#222' }, cont: { fill: '#333' } });
        lastY = py;
        y += b.h + (j < c.children.length - 1 ? SPACE.point : 0);
      });
      cv.line([{ x: railX, y: railTop }, { x: railX, y: lastY }], { stroke: RAIL, width: 1 });
    }
    if (i < tree.root.children.length - 1) y += SPACE.group;
  });
  cv.line([{ x: spineX, y: ruleY }, { x: spineX, y: lastTick }], { stroke: SPINE, width: 2 });
  cv.lower(under);
  return cv;
}

export default { n: 2, slug: 'spine', render };
