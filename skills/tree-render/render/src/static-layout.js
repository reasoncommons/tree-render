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
    const runIn = parts.length === 2 ? runInLines(parts, maxW, measure, S.wrap, at(S.font.leadRunIn, depth)) : null;
    const { lines, truncated } = runIn ? cutLines(runIn, maxW, measure, S.wrap, maxLines) : wrapParts(parts, maxW, measure, S.wrap, maxLines);
    const n = { src, depth, index: src.index, num: src.num || 'root', parent, limb, children: [], lines, truncated, wrapW: maxW, lh: size * lh, size };
    n.hue = hueOf(n);
    n.textHue = textHueOf(n);
    let y = 0;
    for (const l of lines) {
      const h = l.size * lh;
      l.top = y; l.h = h;
      l.y = y + (h - l.size) / 2 + l.size * S.font.baseline;
      const colourOf = role => colourName(role === 'cont' && S.font.contColor ? at(S.font.contColor, depth) : at(S.font.color, depth), n);
      l.color = colourOf(l.role);
      if (l.runs) for (const r of l.runs) r.color = colourOf(r.role);
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
    if (C.mode === 'palette') return top.accent && C.accentInPalette ? C.accent : C.palette[i % C.palette.length];
    return top.accent ? C.accent : branchInk;
  }
  function textHueOf(n) {
    if (n.depth === 0) return C.ink;
    const i = n.depth === 1 ? n.index : n.limb.index;
    const top = n.depth === 1 ? n.src : n.limb.src;
    if (n.depth > 1 && !C.inherit) return C.ink;
    if (C.mode === 'palette') {
      if (top.accent && C.accentInPalette) return C.accentText || C.accent;
      const p = C.textPalette || C.palette; return p[i % p.length];
    }
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

  // coggle: an interior node's label is right-aligned in its column and sits on the branch that runs
  // beneath it to the junction where its children fan out; its laid-out height includes that branch
  const cog = n => A.mode === 'coggle' && n.depth > 0 && n.children.length > 0;
  for (const n of nodes) {
    n.hLay = n.h;
    if (!cog(n)) continue;
    n.cog = true;
    n.win = branchWidths(S, n.depth - 1)[1];
    n.hLay = n.h + A.labelGap + n.win;
    for (const l of n.lines) l.dx = n.textW - l.w;
  }

  // vertical placement
  const lhOf = n => n.lh;
  const ft = flextree({
    children: n => n.children,
    nodeSize: d => [d.data.hLay + S.space.sib * lhOf(d.data), 1],
    spacing: (a, b) => a.parent === b.parent ? 0 : lhOf(a.data) * Math.max(0, S.space.cousin - S.space.sib),
  });
  const h = ft.hierarchy(root);
  ft(h);
  let minY = Infinity;
  h.each(d => { minY = Math.min(minY, d.x - d.data.hLay / 2); });
  h.each(d => { const n = d.data; n.x = n.cog ? colX[n.depth] + colW[n.depth] - n.w : colX[n.depth]; n.y = d.x - n.hLay / 2 - minY; });
  const mode = A.mode === 'coggle' ? 'side' : A.mode;

  // attach points, start points
  const attachAll = () => { for (const n of nodes) attachOne(n); };
  function attachOne(n) {
    n.tx = n.x + n.padX; n.ty = n.y + n.padY; // text origin
    if (n.cog) {
      const jx = colX[n.depth] + colW[n.depth] + at(A.startGap, n.depth);
      n.labelBelow = A.label === 'outside' && n.y + n.hLay / 2 > n.parent.sy;
      if (n.labelBelow) { n.ay = n.y + n.win / 2; n.ty = n.y + n.win + A.labelGap; }
      else n.ay = n.y + n.textH + A.labelGap + n.win / 2;
      n.anchorLine = null; n.shelf = false;
      n.ex = n.sx = jx; n.sy = n.ay;
      return;
    }
    const first = n.lines[0], last = n.lines[n.lines.length - 1];
    if (n.depth === 0 && (n.box || (A.rootAnchor || 'mid') === 'mid')) n.ay = n.y + n.h / 2, n.anchorLine = null;
    else if (mode === 'side') n.ay = n.ty + first.y - first.size * A.midline, n.anchorLine = first;
    else if (mode === 'side-mid') n.ay = n.y + n.h / 2, n.anchorLine = null;
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
  attachAll();

  // root placement: move the root to the mean (or the middle) of its children's attach points, then
  // shift the map so its top is at 0 again
  if (S.root.place && S.root.place !== 'span' && root.children.length) {
    const ys = root.children.map(c => c.ay), m = ys.length;
    const want = S.root.place === 'middle' ? (m % 2 ? ys[(m - 1) / 2] : (ys[m / 2 - 1] + ys[m / 2]) / 2) : ys.reduce((a, b) => a + b, 0) / m;
    root.y += want - root.ay;
    const top = Math.min(...nodes.map(n => n.y));
    for (const n of nodes) n.y -= top;
    attachAll();
  }

  // root spine: the root's trunks leave a vertical spine at its start point, each at its child's height
  let rootSpine = null;
  const spineLen = S.root.spine || 0;
  if (spineLen > 0 && root.children.length && root.sx != null) {
    const ys = root.children.map(c => c.ay);
    const y0 = Math.max(root.sy - spineLen / 2, Math.min(...ys)), y1 = Math.min(root.sy + spineLen / 2, Math.max(...ys));
    if (y1 > y0) rootSpine = { x: root.sx, y0, y1, w: branchWidths(S, 0)[0], colour: C.rootBranch || branchInk };
  }

  // branches, stems, shelves, dots
  const branches = [], stems = [], dots = [], shelves = [], notches = [], spines = [], caps = [];
  const leafCount = n => n.children.length ? n.children.reduce((s, c) => s + leafCount(c), 0) : 1;
  const fans = new Map(); // parent → shared-spine geometry
  for (const n of nodes) {
    if (n.depth > 0) {
      const p = n.parent;
      let [w0, w1] = branchWidths(S, p.depth);
      const e = at(S.branch.weight, p.depth) || 0;
      if (e && p.children.length > 1) {
        const mean = p.children.reduce((s, c) => s + leafCount(c), 0) / p.children.length;
        const [lo, hi] = S.branch.weightClamp || [0, Infinity];
        w0 *= Math.max(lo, Math.min(hi, Math.pow(leafCount(n) / mean, e)));
      }
      const y0 = rootSpine && p === root ? Math.max(rootSpine.y0, Math.min(rootSpine.y1, n.ay)) : p.sy;
      const g = { num: n.num, depth: n.depth, x0: p.sx, y0, x1: n.cog ? n.x - at(A.gap, n.depth) : n.ex, y1: n.ay, w0, w1, colour: n.hue, opacity: at(S.branch.opacity, p.depth) };
      const spine = at(S.branch.spine, p.depth) && at(S.branch.shape, p.depth) === 'elbow-rounded' && p.children.length > 1;
      if (spine) {
        if (!fans.has(p)) fans.set(p, fanSpine(p, S, A, colX[p.depth] + colW[p.depth] + at(A.startGap, p.depth)));
        g.points = fans.get(p).leaf(g);
      } else g.points = branchPoints(g, S.branch, p.depth);
      if (n.cog) { g.points.push([n.ex, n.ay]); g.x1 = n.ex; }
      if (at(S.branch.junctionCap, p.depth)) caps.push({ x: g.x0, y: g.y0, r: g.w0 / 2, colour: g.colour, parentColour: p.hue, kind: 'cap' });
      if (n.cog && A.notch) notches.push({ num: n.num, x: n.ex, y: n.ay, s: n.win, colour: S.colour.bg });
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

  for (const [p, f] of fans) for (const pts of f.spines) {
    const c = p.children[0];
    const w = Math.max(...branches.filter(g => p.children.some(k => k.num === g.num)).map(g => g.w0));
    spines.push({ num: p.num, depth: p.depth + 1, points: pts, w, colour: c.hue, opacity: at(S.branch.opacity, p.depth) });
  }
  // junction caps: one disc per start point, as wide as the widest branch leaving it, in the branches'
  // colour, or in the parent's hue (colour.rootBranch at the root) where several colours leave one point
  const capAt = new Map();
  for (const c of caps) {
    const k = c.x.toFixed(2) + ',' + c.y.toFixed(2), o = capAt.get(k);
    if (!o) { capAt.set(k, { x: c.x, y: c.y, r: c.r, colour: c.colour, kind: 'cap' }); continue; }
    o.r = Math.max(o.r, c.r);
    if (o.colour !== c.colour) o.colour = c.parentColour;
  }
  dots.unshift(...[...capAt.values()].sort((a, b) => b.r - a.r));

  // map extents
  let mw = 0, mh = 0;
  for (const n of nodes) { mw = Math.max(mw, n.x + n.w, n.sx || 0); mh = Math.max(mh, n.y + n.hLay); }
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

  return { nodes, root, branches, stems, shelves, dots, notches, spines, rootSpine, colX, colW, map: { x0: mx0, w: mw, h: mh }, W, H, scale, ox, oy, header, footer, style: S, title: tree.title || tree.root.text, alt: tree.alt || '' };
}

export function wrapWidth(S, depth, size, measure) {
  const w = at(S.wrap.width, depth);
  if (S.wrap.unit === 'em') return w * size;
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
  const lines = [];
  for (const [text, size, weight, role] of parts) {
    for (const l of wrapLines(text, maxW, measure, size, weight, W.balance, W.balanceFloor)) lines.push({ ...l, role });
  }
  return cutLines(lines, maxW, measure, W, maxLines);
}

// Cuts wrapped lines at maxLines; with ellipsis, the last kept line (or its last run) ends with "…".
export function cutLines(lines, maxW, measure, W, maxLines) {
  let truncated = false;
  if (maxLines && lines.length > maxLines) {
    truncated = true;
    if (W.ellipsis) {
      lines = lines.slice(0, maxLines);
      const line = lines[maxLines - 1];
      const last = line.runs ? line.runs[line.runs.length - 1] : line;
      const room = maxW - (line.runs ? last.x : 0);
      let words = last.t.split(' ');
      const withDots = ws => ws.join(' ').replace(/[\s,;:.–—-]+$/, '') + '…';
      while (words.length > 1 && measure(withDots(words), last.size, last.weight) > room) words = words.slice(0, -1);
      last.t = withDots(words);
      last.w = measure(last.t, last.size, last.weight);
      if (line.runs) { line.t = line.runs.map(r => r.t).join(' '); line.w = last.x + last.w; }
      line.ellipsis = true;
    }
  }
  return { lines, truncated };
}

// Centre line of a branch: [[x, y], …] from (x0, y0) to (x1, y1).
export function branchPoints(g, B0, depth = 0) {
  const { x0, y0, x1, y1 } = g;
  const B = {};
  for (const k of ['shape', 'k', 'kStart', 'kEnd', 'elbow', 'radius', 'elbowSmall']) B[k] = at(B0[k], depth);
  const dx = x1 - x0, N = B0.samples || 40;
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
    if (B.elbowSmall === 'curve' && Math.abs(dy) < 2 * B.radius) return cubic(x0 + dx * B.kStart, x1 - dx * B.kEnd);
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

// Shared fan spine for an elbow-rounded fan (Coggle's bracket): one constant-width spine runs from the
// parent's start point to a vertical at xm, up to the outermost leaf above and down to the outermost
// below; each leaf peels off the vertical with its own corner. Returns { spines: [points…], leaf(g) → points }.
// The vertical never runs inside the parent's text column: it sits at least at colEnd.
function fanSpine(p, S, A, colEnd = -Infinity) {
  const B = S.branch, d = p.depth;
  const x0 = p.sx, y0 = p.sy;
  const ends = p.children.map(c => ({ x1: c.cog ? c.x - at(A.gap, c.depth) : c.ex, y1: c.ay }));
  const dxMin = Math.min(...ends.map(e => e.x1 - x0));
  const from = Math.min(Math.max(x0, colEnd), x0 + dxMin - 1); // elbow × the run from the column's end to the leaves
  const xm = from + (x0 + dxMin - from) * at(B.elbow, d);
  const radius = at(B.radius, d);
  // a leaf within one start width of the junction's height runs straight on from it
  const flatDy = Math.max(0.5, branchWidths(S, d)[0]);
  const dirs = {};
  for (const sy of [-1, 1]) {
    const own = ends.filter(e => Math.sign(e.y1 - y0) === sy && Math.abs(e.y1 - y0) >= flatDy);
    if (!own.length) continue;
    const r1 = Math.max(0, Math.min(radius, xm - x0, Math.min(...own.map(e => Math.abs(e.y1 - y0))) / 2));
    dirs[sy] = { r1, far: Math.max(...own.map(e => Math.abs(e.y1 - y0))) };
  }
  const r2Of = (e, sy) => Math.max(0, Math.min(radius, Math.abs(e.y1 - y0) - dirs[sy].r1, e.x1 - xm));
  const arc = (pts, cx, cy, r, a0, a1) => { for (let i = 1; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  const spines = [];
  for (const sy of [-1, 1]) {
    const D = dirs[sy];
    if (!D) continue;
    const farE = ends.find(e => Math.sign(e.y1 - y0) === sy && Math.abs(e.y1 - y0) === D.far && Math.abs(e.y1 - y0) >= flatDy);
    const pts = [[x0, y0], [xm - D.r1, y0]];
    if (D.r1 > 0) arc(pts, xm - D.r1, y0 + sy * D.r1, D.r1, -sy * Math.PI / 2, 0);
    pts.push([xm, farE.y1 - sy * r2Of(farE, sy)]);
    spines.push(pts);
  }
  return {
    spines,
    leaf(g) {
      const dy = g.y1 - y0, sy = Math.sign(dy);
      if (Math.abs(dy) < flatDy) return [[x0, y0], [xm, y0], [g.x1, g.y1]];
      const r = r2Of(g, sy);
      // start 1 px back up the spine so the two shapes overlap (no antialiasing seam at the join)
      const pts = [[xm, g.y1 - sy * r - sy], [xm, g.y1 - sy * r]];
      if (r > 0) arc(pts, xm + r, g.y1 - sy * r, r, Math.PI, sy > 0 ? Math.PI / 2 : 3 * Math.PI / 2);
      pts.push([g.x1, g.y1]);
      return pts;
    },
  };
}

// Run-in lead: [lead, cont] parts → lines, the first holding the lead and the continuation's first
// words as two runs; null when off, when the lead is wider than ratio × maxW, or when no word fits.
export function runInLines(parts, maxW, measure, W, ratio) {
  if (!ratio || parts[0][3] !== 'lead' || parts[1][3] !== 'cont') return null;
  const [[lt, ls, lw], [ct, cs, cw]] = parts;
  const leadW = measure(lt, ls, lw);
  if (leadW > ratio * maxW) return null;
  const space = measure('a a', cs, cw) - measure('aa', cs, cw);
  const x = leadW + space;
  const words = String(ct).split(/\s+/).filter(Boolean);
  const first = greedy(words, maxW - x, measure, cs, cw)[0];
  if (!first || measure(first, cs, cw) > maxW - x) return null;
  const n = first.split(' ').length;
  const lead = { t: lt, w: leadW, size: ls, weight: lw, role: 'lead', x: 0 };
  const cont = { t: first, w: measure(first, cs, cw), size: cs, weight: cw, role: 'cont', x };
  const lines = [{ t: lt + ' ' + first, w: x + cont.w, size: ls, weight: lw, role: 'lead', runs: [lead, cont] }];
  const rest = words.slice(n).join(' ');
  if (rest) for (const l of wrapLines(rest, maxW, measure, cs, cw, W.balance, W.balanceFloor)) lines.push({ ...l, role: 'cont' });
  return lines;
}

// Line boxes of every node, in map coordinates: { num, x, y, w, h }.
export function lineBoxes(L) {
  const out = [];
  for (const n of L.nodes) for (const l of n.lines) out.push({ num: n.num, x: n.tx + (l.dx || 0), y: n.ty + l.top, w: l.w, h: l.h, line: l });
  return out;
}
