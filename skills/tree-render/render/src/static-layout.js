// static-layout.js: parsed tree + resolved style (style.js) → a positioned static render.
// staticLayout(tree, S, measure) → { nodes, branches, stems, dots, map: { w, h }, W, H, scale, ox, oy, header, footer, style }
// Columns per depth (text left-aligned in each column); flextree places blocks vertically; branches run
// from a parent's start point (its text end, or a fan point shared by its column) to the child's attach
// point (left edge of the text at the first line's centre, the block's centre, or under it on a shelf).
// Map coordinates throughout; the map is drawn at translate(ox, oy) scale(scale).
import { at, fontSize, weightOf, branchWidths, margins } from './style.js';
import { greedy } from './wrap.js';
import { flextree } from './flextree.js';

export function staticLayout(tree, S, measure) {
  const nodes = [];
  const A = S.attach, C = S.colour;
  const branchInk = C.branchInk || C.ink;

  function block(src, depth, limb, parent) {
    const size = fontSize(S, depth);
    const lh = at(S.font.lineHeight, depth);
    const maxW = wrapWidth(S, depth, size, measure);
    const parts = []; // [text, size, weight, role]
    if (depth === 0 && !src.lead) parts.push([src.text, size, weightOf(S.font.rootWeight), 'text']);
    else if (src.lead) {
      parts.push([src.lead, size, weightOf(at(S.font.leadWeight, depth)), 'lead']);
      if (src.cont) parts.push([src.cont, Math.round(size * at(S.font.contScale, depth) * 10) / 10, 'R', 'cont']);
    } else parts.push([src.text, size, weightOf(at(S.font.plainWeight, depth)), 'text']);
    const maxLines = at(S.wrap.maxLines, depth);
    const { lines, truncated } = wrapParts(parts, maxW, measure, S.wrap, maxLines);
    const n = { src, depth, index: src.index, num: src.num || 'root', parent, limb, children: [], lines, truncated, wrapW: maxW, lh: size * lh, size };
    n.hue = hueOf(n);
    n.textHue = textHueOf(n);
    let y = 0;
    for (const l of lines) {
      const h = l.size * lh;
      l.top = y; l.h = h;
      l.y = y + (h - l.size) / 2 + l.size * S.font.baseline;
      l.color = colourName(l.role === 'cont' && S.font.contColor ? at(S.font.contColor, depth) : at(S.font.color, depth), n);
      y += h;
    }
    n.textW = Math.max(...lines.map(l => l.w));
    n.textH = y;
    const box = depth === 0 && S.root.style === 'box';
    n.padX = box ? S.root.padX : 0;
    n.padY = box ? S.root.padY : 0;
    n.w = n.textW + 2 * n.padX;
    n.h = n.textH + 2 * n.padY;
    n.box = box;
    nodes.push(n);
    n.children = src.children.map(c => block(c, depth + 1, depth === 1 ? n : limb, n));
    return n;
  }

  // colour of the branch into n (and of n's stem and fan dot)
  function hueOf(n) {
    if (n.depth === 0) return C.rootBranch || branchInk;
    const top = n.depth === 1 ? n.src : n.limb.src;
    const i = n.depth === 1 ? n.index : n.limb.index;
    if (n.depth > 1 && !C.inherit) return branchInk;
    if (C.mode === 'palette') return C.palette[i % C.palette.length];
    return top.accent ? C.accent : branchInk;
  }
  function textHueOf(n) {
    if (n.depth === 0) return C.ink;
    const i = n.depth === 1 ? n.index : n.limb.index;
    const top = n.depth === 1 ? n.src : n.limb.src;
    if (n.depth > 1 && !C.inherit) return C.ink;
    if (C.mode === 'palette') { const p = C.textPalette || C.palette; return p[i % p.length]; }
    return top.accent ? C.accent : C.ink;
  }
  function colourName(v, n) {
    if (!v || v === 'ink') return C.ink;
    if (v === 'muted') return C.muted;
    if (v === 'branch') return n.textHue;
    return v;
  }

  const root = block(tree.root, 0, null, null);

  // columns
  const maxD = Math.max(...nodes.map(n => n.depth));
  const colW = [], colX = [0];
  for (const n of nodes) colW[n.depth] = Math.max(colW[n.depth] || 0, n.w);
  const out = d => A.mode === 'shelf' ? A.shelfOver : at(A.from === 'fan' ? A.fanGap : A.startGap, d);
  for (let d = 1; d <= maxD; d++) colX[d] = colX[d - 1] + colW[d - 1] + out(d - 1) + at(S.space.run, d - 1);

  // vertical placement
  const lhOf = n => n.lh;
  const ft = flextree({
    children: n => n.children,
    nodeSize: d => [d.data.h + S.space.sib * lhOf(d.data), 1],
    spacing: (a, b) => a.parent === b.parent ? 0 : lhOf(a.data) * Math.max(0, S.space.cousin - S.space.sib),
  });
  const h = ft.hierarchy(root);
  ft(h);
  let minY = Infinity;
  h.each(d => { minY = Math.min(minY, d.x - d.data.h / 2); });
  h.each(d => { const n = d.data; n.x = colX[n.depth]; n.y = d.x - n.h / 2 - minY; });

  // attach points, start points
  for (const n of nodes) {
    n.tx = n.x + n.padX; n.ty = n.y + n.padY; // text origin
    const first = n.lines[0], last = n.lines[n.lines.length - 1];
    if (n.depth === 0 && (n.box || (A.rootAnchor || 'mid') === 'mid')) n.ay = n.y + n.h / 2, n.anchorLine = null;
    else if (A.mode === 'side') n.ay = n.ty + first.y - first.size * A.midline, n.anchorLine = first;
    else if (A.mode === 'side-mid') n.ay = n.y + n.h / 2, n.anchorLine = null;
    else n.ay = n.ty + n.textH + last.size * A.shelfLift, n.anchorLine = null;
    n.shelf = A.mode === 'shelf';
    if (n.shelf) n.ay = n.ty + n.textH + last.size * A.shelfLift;
    // incoming end
    n.ex = n.shelf ? n.x : n.x - at(A.gap, n.depth);
    // outgoing start
    if (n.children.length) {
      if (n.shelf) n.sx = n.x + n.w + A.shelfOver;
      else if (A.from === 'fan') n.sx = colX[n.depth] + colW[n.depth] + at(A.fanGap, n.depth);
      else n.sx = n.x + n.w + at(A.startGap, n.depth);
      n.sy = n.ay;
    }
  }

  // branches, stems, shelves, dots
  const branches = [], stems = [], dots = [], shelves = [];
  for (const n of nodes) {
    if (n.depth > 0) {
      const p = n.parent;
      const [w0, w1] = branchWidths(S, p.depth);
      const g = { num: n.num, depth: n.depth, x0: p.sx, y0: p.sy, x1: n.ex, y1: n.ay, w0, w1, colour: n.hue, opacity: at(S.branch.opacity, p.depth) };
      g.points = branchPoints(g, S.branch);
      branches.push(g);
      if (S.branch.cap === 'dot') dots.push({ x: n.ex, y: n.ay, r: at(S.branch.dotRadius, n.depth), colour: n.hue, kind: 'end' });
    }
    if (n.shelf) {
      const w = n.depth === 0 ? branchWidths(S, 0)[0] : branchWidths(S, n.depth - 1)[1] * 0.85;
      shelves.push({ num: n.num, x0: n.x, x1: n.x + n.w + A.shelfOver, y: n.ay, w, colour: n.depth === 0 ? (C.rootBranch || branchInk) : n.hue, opacity: n.depth === 0 ? 1 : at(S.branch.opacity, n.depth - 1) });
    }
    if (n.children.length && !n.shelf) {
      const lineEnd = (n.anchorLine ? n.tx + n.anchorLine.w : n.x + n.w) + at(A.startGap, n.depth);
      if (A.stem && n.sx - lineEnd > 0.5) stems.push({ num: n.num, x0: lineEnd, x1: n.sx, y: n.sy, w: at(A.stemWidth, n.depth) != null ? at(A.stemWidth, n.depth) : branchWidths(S, n.depth)[0], colour: n.hue });
      const r = at(A.fanDot, n.depth);
      if (r > 0) dots.push({ x: n.sx, y: n.sy, r, colour: n.hue, kind: 'fan' });
    }
  }

  // map extents
  let mw = 0, mh = 0;
  for (const n of nodes) { mw = Math.max(mw, n.x + n.w); mh = Math.max(mh, n.y + n.h); }
  for (const s of shelves) mw = Math.max(mw, s.x1 + s.w / 2), mh = Math.max(mh, s.y + s.w / 2);
  for (const d of dots) mw = Math.max(mw, d.x + d.r);
  let mx0 = 0;
  for (const d of dots) mx0 = Math.min(mx0, d.x - d.r);

  // canvas
  const M = margins(S), F = S.frame;
  const W = S.space.canvas;
  const availW = W - M.l - M.r;
  const header = [];
  let hy = M.t;
  if (F.show && tree.title) {
    for (const l of wrapLines(tree.title, availW, measure, F.titleSize, 'R')) { header.push({ ...l, x: M.l, y: hy + F.titleSize * 0.92, color: colourName(F.titleColor, root), cls: 'title' }); hy += F.titleSize * 1.15; }
  }
  if (F.show && tree.subtitle) {
    hy += F.subtitleSize * 0.2;
    for (const l of wrapLines(tree.subtitle, Math.min(F.subtitleWrap, availW), measure, F.subtitleSize, 'R')) { header.push({ ...l, x: M.l, y: hy + F.subtitleSize * 0.92, color: colourName(F.subtitleColor, root), cls: 'subtitle' }); hy += F.subtitleSize * 1.3; }
  }
  const headerH = header.length ? hy - M.t + F.gap : 0;
  const mapW = mw - mx0;
  const scale = S.space.fit === 'shrink' && mapW > availW ? availW / mapW : 1;
  const ox = M.l - mx0 * scale + (S.space.align === 'center' ? Math.max(0, (availW - mapW * scale) / 2) : 0);
  const oy = M.t + headerH;
  let H = oy + mh * scale;
  let footer = null;
  if (F.show && tree.footer) {
    H += F.gap * 0.75;
    footer = { t: tree.footer, x: W - M.r, y: H + F.footerSize * 0.8, size: F.footerSize, color: colourName(F.footerColor, root), w: measure(tree.footer, F.footerSize, 'R') };
    H += F.footerSize * 1.2;
  }
  H = Math.ceil(H + M.b);

  return { nodes, root, branches, stems, shelves, dots, colX, colW, map: { x0: mx0, w: mw, h: mh }, W, H, scale, ox, oy, header, footer, style: S, title: tree.title || tree.root.text, alt: tree.alt || '' };
}

export function wrapWidth(S, depth, size, measure) {
  const w = at(S.wrap.width, depth);
  if (S.wrap.unit === 'ch') return w * measure('abcdefghijklmnopqrstuvwxyz ', size, 'R') / 27;
  return w;
}

function wrapLines(text, maxW, measure, size, weight, balance = true, floor = 0.72) {
  const words = String(text).split(/\s+/).filter(Boolean);
  let lines = greedy(words, maxW, measure, size, weight);
  if (balance && lines.length > 1) {
    let lo = maxW * floor, hi = maxW;
    if (greedy(words, lo, measure, size, weight).length === lines.length) hi = lo;
    else for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (greedy(words, mid, measure, size, weight).length > lines.length) lo = mid; else hi = mid; }
    lines = greedy(words, hi, measure, size, weight);
  }
  return lines.map(t => ({ t, w: measure(t, size, weight), size, weight }));
}

// Wraps lead and continuation (or plain text) at maxW; with maxLines, cuts the block there and, with
// ellipsis, ends the last kept line with "…" (still within maxW).
export function wrapParts(parts, maxW, measure, W, maxLines) {
  let lines = [];
  for (const [text, size, weight, role] of parts) {
    for (const l of wrapLines(text, maxW, measure, size, weight, W.balance, W.balanceFloor)) lines.push({ ...l, role });
  }
  let truncated = false;
  if (maxLines && lines.length > maxLines) {
    truncated = true;
    if (W.ellipsis) {
      lines = lines.slice(0, maxLines);
      const last = lines[maxLines - 1];
      let words = last.t.split(' ');
      const withDots = ws => ws.join(' ').replace(/[\s,;:.–—-]+$/, '') + '…';
      while (words.length > 1 && measure(withDots(words), last.size, last.weight) > maxW) words = words.slice(0, -1);
      last.t = withDots(words);
      last.w = measure(last.t, last.size, last.weight);
      last.ellipsis = true;
    }
  }
  return { lines, truncated };
}

// Centre line of a branch: [[x, y], …] from (x0, y0) to (x1, y1).
export function branchPoints(g, B) {
  const { x0, y0, x1, y1 } = g;
  const dx = x1 - x0, N = B.samples || 40;
  const cubic = (c1x, c2x) => {
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, mt = 1 - t;
      pts.push([mt * mt * mt * x0 + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * x1, (mt * mt * mt + 3 * mt * mt * t) * y0 + (3 * mt * t * t + t * t * t) * y1]);
    }
    return pts;
  };
  if (B.shape === 'bezier-s') return cubic(x0 + dx * B.kStart, x1 - dx * B.kEnd);
  if (B.shape === 'elbow-rounded') {
    const dy = y1 - y0, sy = Math.sign(dy);
    if (Math.abs(dy) < 0.5) return [[x0, y0], [x1, y1]];
    const xm = x0 + dx * B.elbow;
    const r = Math.max(0, Math.min(B.radius, Math.abs(dy) / 2, xm - x0, x1 - xm));
    const pts = [[x0, y0], [xm - r, y0]];
    const arc = (cx, cy, a0, a1) => { for (let i = 1; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    // first corner: heading +x, turning to ±y; centre at (xm − r, y0 + sy·r)
    arc(xm - r, y0 + sy * r, -sy * Math.PI / 2, 0);
    pts.push([xm, y1 - sy * r]);
    // second corner: heading ±y, turning to +x; centre at (xm + r, y1 − sy·r)
    arc(xm + r, y1 - sy * r, Math.PI, sy > 0 ? Math.PI / 2 : 3 * Math.PI / 2);
    pts.push([x1, y1]);
    return pts;
  }
  return cubic(x0 + dx * B.k, x1 - dx * B.k);
}

// Line boxes of every node, in map coordinates: { num, x, y, w, h }.
export function lineBoxes(L) {
  const out = [];
  for (const n of L.nodes) for (const l of n.lines) out.push({ num: n.num, x: n.tx, y: n.ty + l.top, w: l.w, h: l.h, line: l });
  return out;
}
