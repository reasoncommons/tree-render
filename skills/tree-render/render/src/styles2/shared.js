// styles2/shared.js: helpers shared by the ribbon, dendrogram and lanes styles (and the round-2 mock-ups in
// src/directions/): the accent branch, the horizontal-tangent S-curve, a tapered filled ribbon along it, and the root.
import { sampleCubic, block, typo, xMiddleOf } from '../directions/common.js';

export const RED = '#d7261e';
const f = (q) => `${q.x.toFixed(2)} ${q.y.toFixed(2)}`;

// The branch to highlight in red: the level-1 node marked `accent`, else the first whose lead (or text)
// starts with "So". -1 if neither.
export function accentIndex(root) {
  const i = root.children.findIndex(c => c.accent);
  return i >= 0 ? i : root.children.findIndex(c => /^So\b/.test(c.lead || c.text));
}

// The S-curve: cubic Bézier with horizontal tangents at both ends (C x0+0.5dx,y0  x1-0.45dx,y1  x1,y1).
// `spread` shifts the first control point vertically, so branches leaving one point fan apart at once.
export function sCurve(from, to, { spread = 0 } = {}) {
  const dx = to.x - from.x;
  return [{ ...from }, { x: from.x + 0.5 * dx, y: from.y + spread }, { x: to.x - 0.45 * dx, y: to.y }, { ...to }];
}

export const cubicD = (p) => `M ${f(p[0])} C ${f(p[1])} ${f(p[2])} ${f(p[3])}`;

// A filled ribbon along cubic p, w0 wide at the start tapering linearly to w1 at the end, with round caps.
// Returns { d, pts } (pts: the centre line, for bounds and overlap checks).
export function ribbon(p, w0, w1, k = 64) {
  const pts = sampleCubic(...p, k);
  const der = (t) => {
    const u = 1 - t;
    return {
      x: 3 * u * u * (p[1].x - p[0].x) + 6 * u * t * (p[2].x - p[1].x) + 3 * t * t * (p[3].x - p[2].x),
      y: 3 * u * u * (p[1].y - p[0].y) + 6 * u * t * (p[2].y - p[1].y) + 3 * t * t * (p[3].y - p[2].y),
    };
  };
  const L = [], R = [];
  pts.forEach((q, i) => {
    const t = i / k, d = der(t), len = Math.hypot(d.x, d.y) || 1, h = (w0 + (w1 - w0) * t) / 2;
    const nx = -d.y / len, ny = d.x / len;
    L.push({ x: q.x + nx * h, y: q.y + ny * h });
    R.push({ x: q.x - nx * h, y: q.y - ny * h });
  });
  const r0 = w0 / 2, r1 = w1 / 2;
  const d = `M ${f(L[0])} L ${L.slice(1).map(f).join(' ')} A ${r1} ${r1} 0 0 0 ${f(R[k])} L ${R.slice(0, k).reverse().map(f).join(' ')} A ${r0} ${r0} 0 0 0 ${f(L[0])} Z`;
  return { d, pts };
}

// Evenly spread offsets in [-s, s] for n branches.
export const spreads = (n, s) => Array.from({ length: n }, (_, i) => (n > 1 ? -s + (2 * s * i) / (n - 1) : 0));

// Balanced wrap: the narrowest column (down to half of maxWidth) that keeps the same number of lines as a
// greedy wrap at maxWidth, so the last line is not a lone word.
export function balanced(runs, size, maxWidth, opts) {
  const b = block(runs, size, maxWidth, opts), n = b.lines.length;
  if (n < 2) return b;
  let lo = maxWidth / 2, hi = maxWidth;
  while (hi - lo > 2) { const mid = (lo + hi) / 2; if (block(runs, size, mid, opts).lines.length === n) hi = mid; else lo = mid; }
  return block(runs, size, hi, opts);
}

// The root question, bold, vertically centred on y (the middle of its first and last lines' x-heights).
//   plain: right-aligned so it ends at x = 0, with a dot `gap` px to its right that the branches leave.
//   box:   a light Coggle-like box (no border, no chevrons) ending at x = 0; the branches leave its right
//          edge at mid-height.
// `ink`: text and dot colour; `boxFill`: the box's fill (a palette's root fill).
// Returns { from, draw }: `from` is where the branches start; call draw() after the branches so the dot, box
// and text sit on top of them.
// The root's size and wrap: a one-level tree (no grandchildren; short labels) caps the root at FLAT_ROOT × the
// level-1 size so it doesn't dominate; deeper trees keep `root` as is.
export const FLAT_ROOT = 1.15;
export function rootFor(tree, root, l1Size) {
  const flat = tree.root.children.length && tree.root.children.every(c => !c.children.length);
  return flat ? { ...root, size: Math.min(root.size, Math.round(FLAT_ROOT * l1Size)) } : root;
}

export const ROOT_BOX = { fill: '#ececec', radius: 8, padX: 16, padY: 10 };
export function placeRoot(cv, text, y, { size, wrap, dot, gap, box = false, ink = '#1a1a1a', boxFill = ROOT_BOX.fill }) {
  const b = balanced([{ text: typo(text), weight: 600, role: 'lead' }], size, wrap, { leading: 1.2 });
  const top = y - (xMiddleOf(b, 0) + xMiddleOf(b, 0, b.lines.length - 1)) / 2;
  if (!box) {
    const from = { x: gap + dot, y };
    return { from, draw: () => { cv.circle(from.x, y, dot, { fill: ink }); cv.text(b, 0, top, { align: 'end', lead: { fill: ink } }); } };
  }
  const B = ROOT_BOX, w = b.w + 2 * B.padX, h = b.h + 2 * B.padY, x0 = -w, y0 = y - h / 2; // centred on the text's visual middle
  return {
    from: { x: 0, y },
    draw: () => {
      cv.els.push(`<rect x="${x0.toFixed(2)}" y="${y0.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${B.radius}" fill="${boxFill}"/>`);
      cv.strokes.push({ pts: [{ x: x0, y: y0 }, { x: 0, y: y0 + h }], width: 0 });
      cv.text(b, -w / 2, top, { align: 'middle', lead: { fill: ink } });
    },
  };
}
