// coggle/collide.js: does a branch cross a label? A branch is a stroked cubic Bézier (in our layout, plus straight lines) of width w; it collides
// with a text box when any point of its centre line comes within w/2 + clearance of the box. The default
// clearance (4 px) is about the reach of the white halo behind interior labels.
import { branchSegments } from './geometry.js';

export const CLEARANCE = 4;

// Points along the branch's centre line, about every 2 px.
// `sRun`: the branch's group S-run in our layout (geometry.js branchSegments); null: Coggle's one cubic.
export function branchSamples(from, to, { sRun = null } = {}) {
  const out = [];
  for (const g of branchSegments(from, to, { sRun })) {
    const p = g.c || g.l;
    let len = 0;
    for (let i = 1; i < p.length; i++) len += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
    const n = Math.max(g.c ? 8 : 1, Math.ceil(len / 2));
    for (let i = out.length ? 1 : 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      if (g.l) { out.push({ x: p[0].x + (p[1].x - p[0].x) * t, y: p[0].y + (p[1].y - p[0].y) * t }); continue; }
      const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      out.push({ x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y });
    }
  }
  return out;
}

const distToBox = (q, b) => {
  const dx = Math.max(b.x - q.x, 0, q.x - (b.x + b.w)), dy = Math.max(b.y - q.y, 0, q.y - (b.y + b.h));
  return Math.hypot(dx, dy);
};

// True when the branch from → to (stroke width w) comes within w/2 + clearance of box {x, y, w, h}.
export function branchHitsBox(from, to, w, box, { clearance = CLEARANCE, samples, sRun = null } = {}) {
  const r = w / 2 + clearance;
  // quick reject on the control-point hull (each segment stays inside its own)
  const p = branchSegments(from, to, { sRun }).flatMap(g => g.c || g.l), xs = p.map(q => q.x), ys = p.map(q => q.y);
  if (Math.min(...xs) - r > box.x + box.w || Math.max(...xs) + r < box.x) return false;
  if (Math.min(...ys) - r > box.y + box.h || Math.max(...ys) + r < box.y) return false;
  for (const q of samples || branchSamples(from, to, { sRun })) if (distToBox(q, box) < r) return true;
  return false;
}

// Every (branch, label) pair in a coggle layout where the branch crosses a label other than its own node's.
export function findCollisions(L, { clearance = CLEARANCE } = {}) {
  const hits = [];
  for (const b of L.branches) {
    const s = branchSamples(b.from, b.to, { sRun: b.sRun });
    for (const r of L.nodes) {
      if (r === b.node || r.level === 0) continue;
      if (branchHitsBox(b.from, b.to, b.w, r.text, { clearance, samples: s, sRun: b.sRun })) hits.push({ branch: b.node.num, label: r.num });
    }
  }
  return hits;
}
