// styles2/ribbon.js: the `ribbon` style (round-2 direction A, "elegant Coggle") and `lanes` (direction D).
// ribbon: the root is bold text, centred on a dot; every level-1 branch leaves that dot as a filled ribbon
// (Coggle's S-curve, horizontal at both ends) tapering 4 → 2 px (with a thin white halo) to just left of the lead. Level-2 points hang
// off hairline S-curves from a hub right of the level-1 column, joined to the lead by a rule (v0.1 pattern).
// One hue (slate) for ribbons and dots, ink for text, red for the accent branch. `mono`: charcoal ribbons.
// lanes: ribbon's root, ribbons and palette, with a dot at each ribbon's end; each subtree sits on a soft
// neutral band (red for the accent) across both text columns; no level-2 connectors, a small grey dot before
// each point instead. `hue` (mock-up D-hue only): one restrained hue per branch. `mono` (mock-up A-mono only):
// charcoal ribbons. `rootBox`: the root in a light Coggle-like box (shared.js placeRoot) instead of on a dot.
import { Canvas, runsFor, xMiddleOf, sampleCubic } from '../directions/common.js';
import { PALETTE, adjust, darken } from '../coggle/colour.js';
import { RED, accentIndex, balanced, sCurve, cubicD, ribbon, spreads, placeRoot } from './shared.js';

const INK = '#1a1a1a';
const ROOT = { size: 28, wrap: 300, dot: 3.5, gap: 12 };
const L1 = { size: 20, lh: 26, wrap: 300, dot: 3, gap: 10 };
const L2 = { size: 16, lh: 21, wrap: 340, fill: '#444', gap: 9 };
const RIB = { w0: 4, w1: 2, spread: 12, halo: 1.5 };   // halo: white edge so overlapping ribbons stay distinct
const HAIR = { width: 1.5, colour: '#7a7a7a', hub: 16, span: 84, end: 8, ruleGap: 10 };
// D: Coggle hues minus the red and orange (they would fight the accent), darkened for ribbons and text.
const LANE_HUES = [0, 1, 6, 2, 7, 3].map(i => PALETTE[i]);
const LANE = { pad: 20, radius: 12, alpha: 0.07, accentAlpha: 0.05, pointDot: 2, pointGap: 10, colGap: 36, groupGap: 56 };

export function render(tree, { mono = false, lanes = false, hue = false, rootBox = false } = {}) {
  const cv = new Canvas();
  const acc = accentIndex(tree.root);
  const groupGap = lanes ? LANE.groupGap : 36;
  const hueOf = (i) => {
    if (i === acc) return { rib: RED, lead: RED, band: RED, dot: RED, alpha: LANE.accentAlpha, point: hue ? RED : '#9a9a9a' };
    if (lanes && hue) { const h = LANE_HUES[i % LANE_HUES.length]; return { rib: adjust(h, { s: 0.85, l: 0.78 }), lead: darken(h, 0.9), band: h, dot: adjust(h, { s: 0.85, l: 0.78 }), alpha: LANE.alpha }; }
    const c = mono ? '#444' : '#3b5b8f';
    return { rib: c, lead: INK, dot: c, band: '#000', alpha: 0.04, point: '#9a9a9a' };
  };

  const groups = tree.root.children.map((c, i) => {
    const b = balanced(runsFor(c), L1.size, L1.wrap, { lineHeight: L1.lh });
    const kids = c.children.map(p => balanced(runsFor(p), L2.size, L2.wrap, { lineHeight: L2.lh }));
    const kidsH = kids.reduce((s, k) => s + k.h, 0) + L2.gap * Math.max(0, kids.length - 1);
    return { node: c, b, kids, kidsH, h: Math.max(b.h, kidsH), col: hueOf(i) };
  });
  const maxB = Math.max(...groups.map(g => g.b.w));
  const maxK = Math.max(0, ...groups.flatMap(g => g.kids.map(k => k.w)));

  // Vertical stacking first (x is fixed once the root's reach is known).
  let y = 0;
  for (const g of groups) { g.top = y; g.mid = y + g.h / 2; g.bTop = g.mid - g.b.h / 2; g.dotY = xMiddleOf(g.b, g.bTop); y += g.h + groupGap; }
  const span = groups[groups.length - 1].dotY - groups[0].dotY;
  const reach = Math.max(200, Math.min(300, 0.3 * span));

  // Root: centred on the point every ribbon leaves (a dot, or the right edge of the root box).
  const root = placeRoot(cv, tree.root.text, (groups[0].dotY + groups[groups.length - 1].dotY) / 2, { ...ROOT, box: rootBox, ink: INK });
  const rootDot = root.from;
  const l1Dot = rootDot.x + reach, l1X = l1Dot + L1.dot + L1.gap;
  const hubX = l1X + maxB + HAIR.hub, l2X = lanes ? l1X + maxB + LANE.colGap : hubX + HAIR.span;

  // Bands under everything.
  if (lanes) for (const g of groups) {
    const x0 = l1Dot - L1.dot - LANE.pad, x1 = l2X + maxK + LANE.pad, y0 = g.top - LANE.pad, y1 = g.top + g.h + LANE.pad;
    cv.els.push(`<rect x="${x0.toFixed(2)}" y="${y0.toFixed(2)}" width="${(x1 - x0).toFixed(2)}" height="${(y1 - y0).toFixed(2)}" rx="${LANE.radius}" fill="${g.col.band}" fill-opacity="${g.col.alpha}"/>`);
    cv.strokes.push({ pts: [{ x: x0, y: y0 }, { x: x1, y: y1 }], width: 0 });
  }

  // Ribbons, accent last so it sits on top.
  const sp = spreads(groups.length, RIB.spread);
  const order = groups.map((g, i) => i).sort((a, b) => (a === acc) - (b === acc));
  for (const i of order) {
    const g = groups[i];
    const r = ribbon(sCurve(rootDot, { x: l1Dot, y: g.dotY }, { spread: sp[i] }), RIB.w0, RIB.w1);
    cv.els.push(`<path d="${r.d}" fill="#fff" stroke="#fff" stroke-width="${2 * RIB.halo}" stroke-linejoin="round"/>`);
    cv.path(r.d, r.pts, { fill: g.col.rib });
  }
  root.draw();

  for (const g of groups) {
    if (lanes) cv.circle(l1Dot, g.dotY, L1.dot, { fill: g.col.dot });
    cv.text(g.b, l1X, g.bTop, { lead: { fill: g.col.lead }, cont: { fill: INK } });
    let ky = g.mid - g.kidsH / 2;
    if (!lanes && g.kids.length) {
      const hub = { x: hubX, y: g.dotY };
      cv.line([{ x: l1X + g.b.lines[0].w + HAIR.ruleGap, y: g.dotY }, hub], { stroke: HAIR.colour, width: HAIR.width });
      for (const k of g.kids) {
        const p = sCurve(hub, { x: l2X - HAIR.end, y: xMiddleOf(k, ky) });
        cv.path(cubicD(p), sampleCubic(...p), { stroke: HAIR.colour, width: HAIR.width });
        ky += k.h + L2.gap;
      }
      ky = g.mid - g.kidsH / 2;
    }
    for (const k of g.kids) {
      if (lanes) cv.circle(l2X - LANE.pointGap - LANE.pointDot, xMiddleOf(k, ky), LANE.pointDot, { fill: g.col.point || g.col.dot });
      cv.text(k, l2X, ky, { lead: { fill: L2.fill }, cont: { fill: L2.fill } });
      ky += k.h + L2.gap;
    }
  }
  return cv;
}

export default {
  ribbon: (tree, o = {}) => render(tree, { rootBox: o.rootBox }),
  lanes: (tree, o = {}) => render(tree, { lanes: true, rootBox: o.rootBox }),
};
