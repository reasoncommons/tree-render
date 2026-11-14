// coggle/geometry.js: Coggle's branch geometry, as extracted from coggle.it (docs/design/references/coggle-spec.md).
// A branch is ONE stroked cubic Bézier of constant width (no ribbon), leaving its parent horizontally and
// arriving horizontally, so it bends one way and then the other (a full S). A notched "tail" sits at the
// start and a pointed "tip" at the end, both filled in the branch colour. In our layout a branch may be that S over
// a shorter run plus a straight tail (branchSegments).

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

// Our layout's branches (docs/design/references/coggle-curvature.md, "The rule"): Coggle's S drawn over a shorter
// run, then a straight horizontal tail to the junction. Coggle's corners are about a third of the run the S is drawn
// over, whatever the rise, so a narrower tree keeps Coggle's look by shortening the S-run, never by bending tighter.
// R_MAX: the steepest aspect (rise / S-run) drawn as one cubic; past it the S's midpoint leans back by over half a
// stroke, so the branch's S-run is lengthened to rise / R_MAX where the run allows, else a vertical is inserted.
export const R_MAX = 3;

// A branch as segments: { c: [p0, c1, c2, p3] } cubics and { l: [p0, p1] } lines, joined end to end.
// `sRun` (our layout; the group's shared S-run, px): null draws Coggle's one cubic over the whole run (dx). Otherwise
//   1. this branch's S-run is dxs = min(dx, max(sRun, dy / R_MAX)) (aspect ≤ R_MAX wherever the run allows);
//   2. one cubic from `from` to (from.x + dxs, to.y), with Coggle's control points for (dxs, dy);
//   3. if dxs < dx, a straight horizontal line on to `to` (tangent-continuous: the S arrives flat);
//   4. if dy > R_MAX · dx (a very tall branch in a narrow tree): the R_MAX curve over dx, split at its two vertical
//      tangents (x ≈ 0.367 and 0.314 dx), with a vertical line between at the spine x = 0.314 dx · √(R_MAX dx / dy):
//      the departure piece scaled horizontally about the start and the arrival piece about the end to meet it. The
//      spine moves towards the root as the branch gets taller, so the outer strands of a long list nest (a sheaf)
//      instead of crossing on one shared spine.
export function branchSegments(from, to, { sign = 1, sRun = null } = {}) {
  const dx = Math.abs(to.x - from.x), dy = Math.abs(to.y - from.y);
  if (sRun == null) return [{ c: branchControlPoints(from, to, { sign }) }];
  const dxs = Math.min(dx, Math.max(sRun, dy / R_MAX));
  if (dy <= R_MAX * dxs + 1e-9) {
    const end = { x: from.x + sign * dxs, y: to.y };
    const segs = [{ c: branchControlPoints(from, end, { sign }) }];
    if (dxs < dx - 1e-9) segs.push({ l: [end, { x: to.x, y: to.y }] });
    return segs;
  }
  // 4: in local units (x along the run, y along the rise), the R_MAX curve over dx
  const s = to.y < from.y ? -1 : 1, rise = R_MAX * dx;
  const f = Math.max(0.08 * rise + Math.min(0.7 * dx, 600), 16), g = Math.max((dx + Math.min(0.6 * rise, 1200)) / 2, 8);
  const P = [[0, 0], [f, 0], [dx - g, rise], [dx, rise]];
  const [t1, t2] = verticalTangents(P);
  const A = cubicPart(P, 0, t1), B = cubicPart(P, t2, 1);
  const spine = B[0][0] * Math.sqrt(rise / dy), ka = spine / A[3][0], kb = (dx - spine) / (dx - B[0][0]), up = dy - rise;
  const As = A.map(([x, y]) => [x * ka, y]), Bs = B.map(([x, y]) => [dx - (dx - x) * kb, y + up]);
  const at = ([x, y]) => ({ x: from.x + sign * x, y: from.y + s * y });
  return [{ c: As.map(at) }, { l: [at(As[3]), at(Bs[0])] }, { c: Bs.map(at) }];
}

// The part of cubic P (arrays [x, y]) between parameters t0 and t1 (de Casteljau).
function cubicPart(P, t0, t1) {
  const split = (Q, t) => {
    const L = (p, q) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const a = L(Q[0], Q[1]), b = L(Q[1], Q[2]), c = L(Q[2], Q[3]), d = L(a, b), e = L(b, c), m = L(d, e);
    return [[Q[0], a, d, m], [m, e, c, Q[3]]];
  };
  const right = t0 > 0 ? split(P, t0)[1] : P;
  return t1 >= 1 ? right : split(right, (t1 - t0) / (1 - t0))[0];
}
// The two parameters where a cubic whose x runs back for a while (x' < 0 somewhere in (0, 1)) has a vertical tangent.
function verticalTangents(P) {
  const xd = (t) => (P[1][0] - P[0][0]) * (1 - t) ** 2 + 2 * (P[2][0] - P[1][0]) * t * (1 - t) + (P[3][0] - P[2][0]) * t * t;
  let tm = 0.5, lo = Infinity;
  for (let i = 1; i < 200; i++) { const v = xd(i / 200); if (v < lo) { lo = v; tm = i / 200; } }
  const root = (a, b, up) => { for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if ((xd(m) > 0) === up) a = m; else b = m; } return (a + b) / 2; };
  return [root(0, tm, true), root(tm, 1, false)];
}

export function branchPath(from, to, opts) {
  const segs = branchSegments(from, to, opts), p = (q) => `${fmt(q.x)} ${fmt(q.y)}`;
  let d = `M ${p(segs[0].c ? segs[0].c[0] : segs[0].l[0])}`;
  for (const g of segs) d += g.c ? ' C ' + g.c.slice(1).map(p).join(' ') : ` L ${p(g.l[1])}`;
  return d;
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
