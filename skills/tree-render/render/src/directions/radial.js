// directions/radial.js — 6. Radial fan.
// The root sits at the top in a thin circle; the top-level answers radiate downward from it as straight
// 1 px lines in distinct hues, within ±70° of straight down. The answers sit in evenly spaced columns and
// each line's length is set so its end lands on one arc, so the leads form a smile under the root. Text is
// never rotated: it hangs from the line's end on the outward side (right-aligned on the left half). Each
// answer's points fan from a hub under its text as short, lighter lines in the same hue.
import { Canvas, block, runsFor, typo, xMiddleOf, metrics } from './common.js';
import { PALETTE, darken } from '../coggle/colour.js';

const HUES = [6, 0, 1, 2, 5, 7, 4, 3].map(i => PALETTE[i]);
const ROOT = { size: 16, wrap: 120, minR: 60 };
const L1 = { size: 15, wrap: 200 };
const L2 = { size: 12.5, wrap: 190 };
const COL = 240;                    // horizontal distance between the answers' line ends
const MAX_ANGLE = 68;               // degrees from straight down for the outermost answer (spec: ≤ 70)
const GAP = { text: 7, hub: 10, inset: 18, tick: 6, point: 6 };

export function render(tree) {
  const cv = new Canvas();
  const kids = tree.root.children, n = kids.length;
  const { xHeight } = metrics();

  // Root: centred at (0, 0) inside its circle.
  const root = block([{ text: typo(tree.root.text), weight: 600, role: 'lead' }], ROOT.size, ROOT.wrap, { leading: 1.2 });
  const r = Math.max(ROOT.minR, Math.hypot(root.w / 2, root.h / 2) + 8);
  cv.text(root, 0, -root.h / 2 + 1, { align: 'middle', lead: { fill: '#000' } });
  cv.circle(0, 0, r, { stroke: '#222', width: 1 });

  // Line ends: evenly spaced columns, on an arc of radius R about the root.
  const xs = kids.map((_, i) => (i - (n - 1) / 2) * COL);
  const R = Math.max(r + 140, Math.max(...xs.map(Math.abs)) / Math.sin(MAX_ANGLE * Math.PI / 180));
  kids.forEach((c, i) => {
    const hue = HUES[i % HUES.length], ink = darken(hue, 0.75);
    const x = xs[i], y = Math.sqrt(R * R - x * x), a = Math.atan2(x, y);
    const left = x < -1, dir = left ? -1 : 1, align = left ? 'end' : 'start';
    cv.line([{ x: r * Math.sin(a), y: r * Math.cos(a) }, { x, y }], { stroke: ink, width: 1 });
    // The answer hangs from the line end: its first line's x-height middle level with the end.
    const b = block(runsFor(c), L1.size, L1.wrap, { leading: 1.3 });
    const top = y - (b.base - xHeight * b.size / 2);
    cv.text(b, x + dir * GAP.text, top, { align, lead: { fill: darken(hue) }, cont: { fill: '#333' } });
    if (!c.children.length) return;
    // Points: a hub under the answer's text, short lines fanning from it to each point.
    const hub = { x, y: top + b.h + GAP.hub };
    cv.line([{ x, y: y + 3 }, hub], { stroke: ink, width: 0.75, opacity: 0.6 });
    let py = hub.y + 2;
    c.children.forEach(p => {
      const pb = block(runsFor(p), L2.size, L2.wrap, { leading: 1.35 });
      const my = xMiddleOf(pb, py);
      cv.line([hub, { x: x + dir * (GAP.inset - GAP.tick), y: my }], { stroke: ink, width: 0.75, opacity: 0.6 });
      cv.text(pb, x + dir * GAP.inset, py, { align, lead: { fill: '#333' }, cont: { fill: '#333' } });
      py += pb.h + GAP.point;
    });
  });
  return cv;
}

export default { n: 6, slug: 'radial', render };
