// directions/braces.js — 4. Braces: a Ramist chart, a 17th-century table of knowledge.
// Left to right. Each parent is followed by one tall curly brace whose point faces back at the parent
// (at its vertical centre) and whose arms embrace its children's text. The brace is drawn as a filled,
// tapered shape (thin at the tips and the point, swelling mid-arm, like a typeset brace). Each parent is
// centred on its children, so every brace is symmetrical. Monochrome; the root has a black rule to its left.
import { Canvas, block, runsFor, typo } from './common.js';

const INK = '#333';
const ROOT = { size: 20, wrap: 150, rule: 1, ruleGap: 12 };
const L1 = { size: 16, wrap: 220 };
const L2 = { size: 13, wrap: 280 };
const GAP = { brace: 16, point: 8, group: 40 }; // brace 16 px from the parent's text and from the children
// Brace width grows a little with its height; thickness swells from `thin` at the tips and point to `thick`.
const BRACE = { thin: 0.4, thick: 2.1 };
const braceWidth = (h) => Math.min(22, Math.max(11, 8 + h / 60));

export function render(tree) {
  const cv = new Canvas();
  const root = block([{ text: typo(tree.root.text), weight: 600, role: 'lead' }], ROOT.size, ROOT.wrap, { leading: 1.25 });
  const groups = tree.root.children.map(c => {
    const b = block(runsFor(c), L1.size, L1.wrap, { leading: 1.3 });
    const kids = c.children.map(p => block(runsFor(p), L2.size, L2.wrap, { leading: 1.35 }));
    const kidsH = kids.reduce((s, k) => s + k.h, 0) + GAP.point * Math.max(0, kids.length - 1);
    return { node: c, b, kids, kidsH, h: Math.max(b.h, kidsH) };
  });

  const w0 = braceWidth(groups.reduce((s, g) => s + g.h + GAP.group, -GAP.group));
  const w1 = braceWidth(Math.max(...groups.map(g => g.kidsH)));
  const rootX = ROOT.rule + ROOT.ruleGap;
  const brace0X = rootX + root.w + GAP.brace;
  const l1X = brace0X + w0 + GAP.brace;
  const brace1X = l1X + Math.max(...groups.map(g => g.b.w)) + GAP.brace;
  const l2X = brace1X + w1 + GAP.brace;

  // Stack the groups; each parent and its children are centred on the group's middle.
  let y = 0;
  for (const g of groups) {
    const mid = y + g.h / 2;
    const top = mid - g.b.h / 2;
    cv.text(g.b, l1X, top, { lead: { fill: '#000' }, cont: { fill: '#555' } });
    g.top = top; g.bottom = top + g.b.h; g.mid = mid;
    if (g.kids.length) {
      let ky = mid - g.kidsH / 2;
      const k0 = ky;
      g.kids.forEach((k, j) => { cv.text(k, l2X, ky, { lead: { fill: '#222' }, cont: { fill: '#333' } }); ky += k.h + (j < g.kids.length - 1 ? GAP.point : 0); });
      brace(cv, brace1X, k0 + 2, ky - 2, mid, w1);
    }
    y += g.h + GAP.group;
  }

  // The root: centred on the span of the top-level answers, with its brace embracing them all.
  const span0 = groups[0].top, span1 = groups[groups.length - 1].bottom, rootMid = (span0 + span1) / 2;
  const rootTop = rootMid - root.h / 2;
  cv.text(root, rootX, rootTop, { lead: { fill: '#000' } });
  cv.rect(0, rootTop + 4, ROOT.rule, root.h - 8, '#000');
  brace(cv, brace0X, span0 + 2, span1 - 2, rootMid, w0);
  return cv;
}

// A curly brace pointing left: its point at (x, ym), its arm tips at (x + w, y0) and (x + w, y1).
// The centreline is two mirrored halves, each a quarter turn out of the tip, a straight run, and a quarter
// turn into the point; the outline is offset either side by a thickness that swells mid-arm.
export function brace(cv, x, y0, y1, ym, w) {
  const m = x + w / 2, q = Math.min(w * 0.9, (y1 - y0) / 6);
  const half = (yt, s) => { // s = +1 for the top half (going down), −1 for the bottom half
    const pts = [];
    const cubic = (p0, p1, p2, p3, k = 16) => { for (let i = pts.length ? 1 : 0; i <= k; i++) { const t = i / k, u = 1 - t; pts.push({ x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y }); } };
    cubic({ x: x + w, y: yt }, { x: m + w * 0.05, y: yt }, { x: m, y: yt + s * q * 0.45 }, { x: m, y: yt + s * q });
    const a = { x: m, y: ym - s * q };
    const runLen = Math.abs(a.y - (yt + s * q)), steps = Math.max(2, Math.round(runLen / 12));
    for (let i = 1; i <= steps; i++) pts.push({ x: m, y: yt + s * q + (a.y - (yt + s * q)) * i / steps });
    cubic(a, { x: m, y: ym - s * q * 0.4 }, { x: m - w * 0.2, y: ym }, { x, y: ym });
    return pts;
  };
  // Top half runs tip → point, bottom half point → tip; thickness by arc length within each half.
  const outline = (pts) => {
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const L = len[len.length - 1];
    const left = [], right = [];
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const s = len[i] / L, t = BRACE.thin + (BRACE.thick - BRACE.thin) * Math.pow(Math.sin(Math.PI * s), 0.6);
      left.push({ x: p.x - dy / d * t / 2, y: p.y + dx / d * t / 2 });
      right.push({ x: p.x + dy / d * t / 2, y: p.y - dx / d * t / 2 });
    });
    return [...left, ...right.reverse()];
  };
  const top = half(y0, 1), bottom = half(y1, -1);
  for (const pts of [top, bottom]) {
    const poly = outline(pts);
    const d = 'M ' + poly.map(p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ') + ' Z';
    cv.path(d, pts, { fill: INK });
  }
}

export default { n: 4, slug: 'braces', render };
