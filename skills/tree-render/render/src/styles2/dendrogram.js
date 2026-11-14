// styles2/dendrogram.js: the `dendrogram` style (round-2 direction B, a less dry dendrogram).
// Round 1's dendrogram columns and left-aligned text, warmed up: the root is bold text centred on a dot (or,
// with `rootBox`, in a light box whose right edge the curves leave), and
// the level-1 answers leave it on 2.5 px S-curves (no end dots: 2026-11-13); each answer's points hang off rounded
// elbows (8 px corners, 1.25 px grey). The first point sits on its answer's baseline, so answer, leader and
// first point read as one line. Red marks the accent branch's curve, dot and lead.
import { Canvas, runsFor, xMiddleOf, sampleCubic } from '../directions/common.js';
import { paletteText, ensureContrast } from '../palettes.js';
import { RED, accentIndex, balanced, sCurve, cubicD, spreads, placeRoot } from './shared.js';

const INK = '#1a1a1a', CURVE = '#222', ELBOW = '#888';
const ROOT = { size: 28, wrap: 280, dot: 3.5, gap: 12 };
const L1 = { size: 20, lh: 26, wrap: 270, dot: 3, gap: 10, width: 2.5 };
const L2 = { size: 16, lh: 21, wrap: 320, fill: '#333', gap: 8, width: 1.25 };
const EL = { leaderGap: 12, stemGap: 28, tick: 18, textGap: 10, r: 8 };
const GROUP_GAP = 40, SPREAD = 10;

export function render(tree, { rootBox = false, palette: P = null } = {}) {
  const cv = new Canvas(P ? { bg: P.bg } : {});
  const acc = accentIndex(tree.root);
  // A palette (palettes.js): its branch colours cycled over the non-accent answers, its accent, ink and hairlines.
  const ink = P ? ensureContrast(P.ink, P.bg) : INK, l2Fill = P ? ensureContrast(P.muted, P.bg) : L2.fill, elbow = P ? P.hairline : ELBOW;
  let k = 0;
  const curveOf = (i) => !P ? (i === acc ? RED : CURVE) : i === acc ? P.accent : P.branches[k++ % P.branches.length];
  const groups = tree.root.children.map((c, i) => {
    const b = balanced(runsFor(c), L1.size, L1.wrap, { lineHeight: L1.lh });
    const kids = c.children.map(p => balanced(runsFor(p), L2.size, L2.wrap, { lineHeight: L2.lh }));
    const curve = curveOf(i);
    return { node: c, b, kids, red: i === acc, curve, lead: P ? paletteText(P, curve, { accent: i === acc }) : i === acc ? RED : INK };
  });
  const maxB = Math.max(...groups.map(g => g.b.w));

  // Stack: each group's answer and its first point share a line (their x-height middles align).
  let y = 0;
  for (const g of groups) {
    g.top = y;
    g.y = xMiddleOf(g.b, y);
    let ky = g.kids.length ? g.y - xMiddleOf(g.kids[0], 0) : 0, bottom = y + g.b.h;
    g.kidTops = g.kids.map(k => { const t = ky; ky += k.h + L2.gap; bottom = Math.max(bottom, t + k.h); return t; });
    y = bottom + GROUP_GAP;
  }
  const span = groups[groups.length - 1].y - groups[0].y;
  const reach = Math.max(180, Math.min(260, 0.28 * span));

  const root = placeRoot(cv, tree.root.text, (groups[0].y + groups[groups.length - 1].y) / 2, { ...ROOT, box: rootBox, ink: P ? ensureContrast(P.root.text, P.bg) : INK, ...(P ? { boxFill: P.root.fill } : {}) });
  const rootDot = root.from;
  const l1Dot = rootDot.x + reach, l1X = l1Dot + L1.dot + L1.gap;
  const stemX = l1X + maxB + EL.stemGap, l2X = stemX + EL.tick + EL.textGap;

  const sp = spreads(groups.length, SPREAD);
  const order = groups.map((g, i) => i).sort((a, b) => groups[a].red - groups[b].red);
  for (const i of order) {
    const g = groups[i], p = sCurve(rootDot, { x: l1Dot, y: g.y }, { spread: sp[i] });
    cv.path(cubicD(p), sampleCubic(...p), { stroke: g.curve, width: L1.width });
  }
  root.draw();

  for (const g of groups) {
    cv.text(g.b, l1X, g.top, { lead: { fill: g.lead }, cont: { fill: ink } });
    if (!g.kids.length) continue;
    // Leader from the end of the answer's first line to the stem, then one rounded elbow per point.
    const x0 = l1X + g.b.lines[0].w + EL.leaderGap, tipX = l2X - EL.textGap;
    const segs = [`M ${x0.toFixed(2)} ${g.y.toFixed(2)} H ${tipX.toFixed(2)}`], pts = [{ x: x0, y: g.y }, { x: tipX, y: g.y }];
    g.kids.forEach((k, j) => {
      const ky = xMiddleOf(k, g.kidTops[j]);
      cv.text(k, l2X, g.kidTops[j], { lead: { fill: l2Fill }, cont: { fill: l2Fill } });
      if (Math.abs(ky - g.y) < 0.5) return;
      const r = Math.min(EL.r, ky - g.y);
      segs.push(`M ${stemX.toFixed(2)} ${g.y.toFixed(2)} V ${(ky - r).toFixed(2)} Q ${stemX.toFixed(2)} ${ky.toFixed(2)} ${(stemX + r).toFixed(2)} ${ky.toFixed(2)} H ${tipX.toFixed(2)}`);
      pts.push({ x: stemX, y: g.y }, { x: stemX, y: ky }, { x: tipX, y: ky });
    });
    cv.els.push(`<path d="${segs.join(' ')}" fill="none" stroke="${elbow}" stroke-width="${L2.width}" stroke-linejoin="round"/>`);
    // Record each straight piece for bounds and the overlap check.
    cv.strokes.push({ pts: pts.slice(0, 2), width: L2.width });
    for (let k = 2; k < pts.length; k += 3) cv.strokes.push({ pts: pts.slice(k, k + 3), width: L2.width });
  }
  return cv;
}

export default (tree, o = {}) => render(tree, { rootBox: o.rootBox, palette: o.palette });
