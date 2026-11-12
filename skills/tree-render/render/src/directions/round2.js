// directions/round2.js: helpers shared by the round-2 direction mock-ups (scripts/directions2.js):
// the accent branch, the horizontal-tangent S-curve and a tapered filled ribbon along it.
import { sampleCubic, block } from './common.js';

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
