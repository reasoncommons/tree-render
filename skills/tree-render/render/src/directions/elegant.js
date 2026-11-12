// directions/elegant.js: round 2, A (Elegant Coggle) and D (tinted lanes).
// A: the root is bold text ending in a dot; every level-1 branch leaves that dot as a filled ribbon (Coggle's
// S-curve, horizontal at both ends) tapering 5 → 2.5 px into a dot just left of the lead. Level-2 points hang
// off hairline S-curves from a hub right of the level-1 column, joined to the lead by a rule (v0.1 pattern).
// One hue (slate) for ribbons and dots, ink for text, red for the accent branch. `mono`: grey ribbons.
// D (`lanes`): A's root and ribbons, one restrained hue per branch; each subtree sits on a soft rounded band
// across both text columns; no level-2 connectors, a small hue dot before each point instead.
import { Canvas, block, runsFor, typo, xMiddleOf } from './common.js';
import { PALETTE, adjust, darken } from '../coggle/colour.js';
import { RED, accentIndex, balanced, sCurve, cubicD, ribbon, spreads } from './round2.js';
import { sampleCubic } from './common.js';

const INK = '#1a1a1a';
const ROOT = { size: 28, wrap: 300, dot: 3.5, gap: 12 };
const L1 = { size: 20, lh: 26, wrap: 300, dot: 3, gap: 10 };
const L2 = { size: 16, lh: 21, wrap: 340, fill: '#444', gap: 9 };
const RIB = { w0: 5, w1: 2.5, spread: 12 };
const HAIR = { width: 1.25, colour: '#8a8a8a', hub: 16, span: 84, end: 8, ruleGap: 10 };
// D: Coggle hues minus the red and orange (they would fight the accent), darkened for ribbons and text.
const LANE_HUES = [0, 1, 6, 2, 7, 3].map(i => PALETTE[i]);
const LANE = { pad: 20, radius: 12, alpha: 0.07, accentAlpha: 0.05, pointDot: 2, pointGap: 10, colGap: 36, groupGap: 56 };

export function render(tree, { mono = false, lanes = false } = {}) {
  const cv = new Canvas();
  const acc = accentIndex(tree.root);
  const groupGap = lanes ? LANE.groupGap : 36;
  const hueOf = (i) => {
    if (i === acc) return { rib: RED, lead: RED, band: RED, dot: RED, alpha: LANE.accentAlpha };
    if (lanes) { const h = LANE_HUES[i % LANE_HUES.length]; return { rib: adjust(h, { s: 0.85, l: 0.78 }), lead: darken(h, 0.9), band: h, dot: adjust(h, { s: 0.85, l: 0.78 }), alpha: LANE.alpha }; }
    const c = mono ? '#9a9a9a' : '#3b5b8f';
    return { rib: c, lead: INK, dot: c };
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

  // Root: right-aligned at x = 0, its last line ending in the dot that every ribbon leaves.
  const root = balanced([{ text: typo(tree.root.text), weight: 600, role: 'lead' }], ROOT.size, ROOT.wrap, { leading: 1.2 });
  const rootDot = { x: ROOT.gap + ROOT.dot, y: (groups[0].dotY + groups[groups.length - 1].dotY) / 2 };
  const rootTop = rootDot.y - (xMiddleOf(root, 0, root.lines.length - 1));
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
    cv.path(r.d, r.pts, { fill: g.col.rib });
  }
  cv.circle(rootDot.x, rootDot.y, ROOT.dot, { fill: INK });
  cv.text(root, 0, rootTop, { align: 'end', lead: { fill: INK } });

  for (const g of groups) {
    cv.circle(l1Dot, g.dotY, L1.dot, { fill: g.col.dot });
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
      if (lanes) cv.circle(l2X - LANE.pointGap - LANE.pointDot, xMiddleOf(k, ky), LANE.pointDot, { fill: g.col.dot });
      cv.text(k, l2X, ky, { lead: { fill: L2.fill }, cont: { fill: L2.fill } });
      ky += k.h + L2.gap;
    }
  }
  return cv;
}

export const A = { slug: 'A', render: (t) => render(t) };
export const AMono = { slug: 'A-mono', render: (t) => render(t, { mono: true }) };
export const D = { slug: 'D', render: (t) => render(t, { lanes: true }) };
