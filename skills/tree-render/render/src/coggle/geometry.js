// coggle/geometry.js: Coggle's branch geometry, as extracted from coggle.it (docs/design/references/coggle-spec.md).
// A branch is ONE stroked cubic Bézier of constant width (no ribbon), leaving its parent horizontally and
// arriving horizontally, so it bends one way and then the other (a full S). A notched "tail" sits at the
// start and a pointed "tip" at the end, both filled in the branch colour.

// Number format Coggle writes: the shorter of the plain number and 4 decimals.
export function fmt(t) {
  const a = String(t), b = t.toFixed(4);
  return a.length <= b.length ? a : b;
}

// Default stroke width of the branch arriving at a node of this level (root = 0).
export function lineWeight(level) {
  return Math.max(2, (18 * Math.pow(0.91, level) + 2) / 2);
}

// Length of the tail notch and of the tip for a branch of width w.
export const tailLength = (w) => (4.54688 * w) / 6;
export const tipLength = (w) => 0.75811 * (w - 0.3);
// How far a branch stops short of the child's position (the tip fills the rest).
export const endInset = (w) => tailLength(w) + 3;

const d2 = (a, b) => (b.x - a.x) ** 2 + (b.y - a.y) ** 2;

// Control points of a left-to-right branch from `from` to `to` (Coggle's bezierCPForConnection with no
// user control points, from-side "right", to-side "left"):
//   c1 = from + (max(0.08|dy| + min(0.7|dx|, 600), 16), 0)
//   c2 = to   − (max((|dx| + min(0.6|dy|, 1200)) / 2, 8), 0)
// then, for branches shorter than 75 px, both control points are pulled towards their end point by
// i = 1 − 1 / (d⁴ / 390625 + 1), d² the squared length of the chord.
export function branchControlPoints(from, to, { sign = 1 } = {}) {
  const dx = Math.abs(from.x - to.x), dy = Math.abs(from.y - to.y);
  const f = Math.max(0.08 * dy + Math.min(0.7 * dx, 600), 16) * sign;
  const g = Math.max((dx + Math.min(0.6 * dy, 1200)) / 2, 8) * sign;
  const p = [{ x: from.x, y: from.y }, { x: from.x + f, y: from.y }, { x: to.x - g, y: to.y }, { x: to.x, y: to.y }];
  const n = d2(p[0], p[3]);
  if (n < 5625) {
    const i = 1 - 1 / ((n * n) / 390625 + 1);
    p[2] = { x: p[3].x + (p[2].x - p[3].x) * i, y: p[3].y + (p[2].y - p[3].y) * i };
    p[1] = { x: p[0].x + (p[1].x - p[0].x) * i, y: p[0].y + (p[1].y - p[0].y) * i };
  }
  return p;
}

export function branchPath(from, to, opts) {
  const p = branchControlPoints(from, to, opts);
  return `M ${fmt(p[0].x)} ${fmt(p[0].y)} C ` + p.slice(1).map(q => `${fmt(q.x)} ${fmt(q.y)}`).join(' ');
}

// Tail: a rectangle with a V notch cut into its back, w tall and tailLength(w) long, origin at the notch.
export function tailPath(w) {
  const n = tailLength(w), i = -w / 2, e = w / 2;
  return `M ${fmt(0)} ${fmt(i)} ${fmt(n)} ${fmt(0)} ${fmt(0)} ${fmt(e)} ${fmt(n)} ${fmt(e)} ${fmt(n)} ${fmt(i)} z`;
}

// Tip: a pointed arrowhead t tall (t = w − 0.3), pointing right, with a 0.3 px overlap back into the line.
export function tipPath(t) {
  return `M -0.2 ${fmt(-t / 2)} 0.1 ${fmt(-t / 2)} ${fmt(0.75811 * t)} 0 0.1 ${fmt(t / 2)} -0.2 ${fmt(t / 2)}`;
}

// The root box: a rounded rectangle (r 2.5) with a 7 px chevron at the middle of each side; w × h is the
// whole shape including the chevrons. Coggle: w = max(80, content width + 14), h = content height + 8,
// where the content box is the text plus 9 px padding.
// `chevrons: false`: just the rounded rectangle, w × h.
export function rootShapePath(w, h, { chevrons = true } = {}) {
  if (!chevrons) {
    const a = w / 2, b = h / 2, r = 2.5, n = (v) => fmt(v);
    return `M ${n(-a)},${n(-(b - r))} A ${r},${r},0,0,1,${n(-(a - r))},${n(-b)} L ${n(a - r)},${n(-b)} A ${r},${r},0,0,1,${n(a)},${n(-(b - r))} ` +
      `L ${n(a)},${n(b - r)} A ${r},${r},0,0,1,${n(a - r)},${n(b)} L ${n(-(a - r))},${n(b)} A ${r},${r},0,0,1,${n(-a)},${n(b - r)} Z`;
  }
  const a = w / 2 - 7, b = h / 2 - 7, r = 2.5, c = 4.9, k = 7;
  const n = (v) => fmt(v);
  return `M ${n(-a)},${c} L ${n(-a - k)},0,${n(-a)},${-c},${n(-a)},${n(-(b - r))} A ${r},${r},0,0,1,${n(-(a - r))},${n(-b)} ` +
    `L ${-c},${n(-b)},0,${n(-b - k)},${c},${n(-b)},${n(a - r)},${n(-b)} A ${r},${r},0,0,1,${n(a)},${n(-(b - r))} ` +
    `L ${n(a)},${-c},${n(a + k)},0,${n(a)},${c},${n(a)},${n(b - r)} A ${r},${r},0,0,1,${n(a - r)},${n(b)} ` +
    `L ${c},${n(b)},0,${n(b + k)},${-c},${n(b)},${n(-(a - r))},${n(b)} A ${r},${r},0,0,1,${n(-a)},${n(b - r)} Z`;
}
