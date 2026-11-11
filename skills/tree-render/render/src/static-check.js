// static-check.js: engineering checks on a static layout. checkStatic(L) → { ok, errors, warnings, metrics }.
// Errors: text lines of two nodes overlap; a branch or stem runs through a line of text; anything
// drawn falls outside the canvas. Warnings: the map was shrunk to fit; text was cut with an ellipsis.
import { lineBoxes } from './static-layout.js';

const inside = (x, y, b, inset = 1) => x > b.x + inset && x < b.x + b.w - inset && y > b.y + inset && y < b.y + b.h - inset;

// Branches (and stems) whose centre line passes through a line box: [{ branch, node }].
export function branchesUnderText(L) {
  const boxes = lineBoxes(L);
  const bad = [];
  const segs = L.branches.map(g => ({ id: g.num, pts: g.points }))
    .concat(L.stems.map(s => ({ id: 'stem ' + s.num, pts: Array.from({ length: 21 }, (_, i) => [s.x0 + (s.x1 - s.x0) * i / 20, s.y]) })))
    .concat((L.spines || []).map(s => ({ id: 'spine ' + s.num, pts: s.points })))
    .concat(L.rootSpine ? [{ id: 'root spine', pts: Array.from({ length: 21 }, (_, i) => [L.rootSpine.x, L.rootSpine.y0 + (L.rootSpine.y1 - L.rootSpine.y0) * i / 20]) }] : []);
  for (const s of segs) {
    s.pts = densify(s.pts);
    for (const b of boxes) {
      if (s.pts.some(([x, y]) => inside(x, y, b))) { bad.push({ branch: s.id, node: b.num }); break; }
    }
  }
  return bad;
}

// Polyline with a point at least every 4 px, so long straight runs are checked along their length.
function densify(pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], k = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
    for (let j = 1; j <= k; j++) out.push([x0 + (x1 - x0) * j / k, y0 + (y1 - y0) * j / k]);
  }
  return out;
}

export function textOverlaps(L) {
  const boxes = lineBoxes(L), bad = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.num === b.num) continue;
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) bad.push([a.num, b.num]);
  }
  return bad;
}

export function clipped(L) {
  const bad = [];
  const toCanvas = (x, y) => [L.ox + x * L.scale, L.oy + y * L.scale];
  for (const n of L.nodes) {
    const [x0, y0] = toCanvas(n.x, n.y), [x1, y1] = toCanvas(n.x + n.w, n.y + n.h);
    if (x0 < -0.5 || y0 < -0.5 || x1 > L.W + 0.5 || y1 > L.H + 0.5) bad.push(n.num);
  }
  for (const l of L.header) if (l.x + l.w > L.W + 0.5) bad.push(l.cls);
  if (L.footer && L.footer.x - L.footer.w < -0.5) bad.push('footer');
  return bad;
}

export function checkStatic(L) {
  const errors = [], warnings = [];
  const ov = textOverlaps(L);
  if (ov.length) errors.push({ check: 'overlap', message: `${ov.length} pairs of text lines overlap`, nodes: ov });
  const under = branchesUnderText(L);
  if (under.length) errors.push({ check: 'branch-under-text', message: `${under.length} branches or stems cross text`, nodes: under.map(u => `${u.branch} × ${u.node}`) });
  const cl = clipped(L);
  if (cl.length) errors.push({ check: 'clipped', message: `${cl.length} items fall outside the canvas`, nodes: cl });
  if (L.scale < 1) warnings.push({ check: 'shrunk', message: `the map is ${Math.round(L.map.w)} px wide; shrunk to ${L.scale.toFixed(3)} to fit the canvas (narrow the wraps or runs)` });
  const cut = L.nodes.filter(n => n.truncated).map(n => n.num);
  if (cut.length) warnings.push({ check: 'truncated', message: `${cut.length} nodes exceed wrap.maxLines${L.style.wrap.ellipsis ? ' and were cut with an ellipsis' : ''}`, nodes: cut });
  return { ok: !errors.length, errors, warnings, metrics: { style: L.style.name, width: L.W, height: L.H, scale: Math.round(L.scale * 1000) / 1000, nodes: L.nodes.length } };
}
