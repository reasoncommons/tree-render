// directions/radial2.js: round 2, C (radial cluster, leads only: the "share" poster).
// A full-circle radial cluster in the manner of d3.cluster + linkRadial. The root's question is centred; the
// level-1 answers sit on a ring, their leads set along the radius (flipped on the left half so they read
// left to right); a short tick carries each answer on to the point where it fans out to its points, whose
// leads sit on an outer ring. Leaves are spaced equally (one empty slot between branches) and every parent
// is centred on its children. Short text: a node's lead; without one, the clause before the first colon or
// comma, at most five words (listed as warnings). `hue`: a colour per level-1 branch instead of ink.
import { Canvas, block, typo, metrics, measure } from './common.js';
import { PALETTE, adjust, darken } from '../coggle/colour.js';
import { RED, accentIndex, balanced } from '../styles2/shared.js';

const INK = '#333';
const ROOT = { size: 24, wrap: 230, pad: 14 };
const R1 = 220;                       // level-1 ring
const BRANCH_GAP = 2;                 // empty leaf slots between branches (keeps each fan tight)
const L1 = { size: 16, wrap: 170, lh: 20, gap: 8, rule: 12 };
const L2 = { size: 16, gap: 7, span: 210 };
const W = { l1: 2, l2: 1 };
const HUES = [0, 1, 6, 2, 7, 3].map(i => PALETTE[i]);
const f = (v) => v.toFixed(2);

const strip = (s) => s.replace(/[\s:;,.]+$/, '');
// Words a shortened clause should not end on.
const WEAK = new Set('a an the of in on for to and or but is are be will with by as at its our their not can so from that this into'.split(' '));
// The text before the first colon, semicolon, comma or bracket, run on past it if that is under three words
// ("Take cheap, proportionate care").
function firstClause(text) {
  const parts = text.split(/(?=[:;,(])/);
  let out = parts[0];
  for (let i = 1; i < parts.length && out.trim().split(/\s+/).length < 3; i++) out += parts[i];
  return out.trim();
}
function shortText(node, warn) {
  if (node.lead) return strip(typo(node.lead));
  // The clause before the first colon, semicolon, comma or bracket; a short label before a colon
  // ("Labs: accept binding external checks") keeps the clause after it.
  let m = node.text.match(/^([^:;,(]+):\s*([^:;,(]+)/), clause;
  clause = m && m[1].trim().split(/\s+/).length <= 2 ? m[1].trim() + ': ' + m[2].trim() : firstClause(node.text);
  let words = strip(clause).split(/\s+/), cut = false;
  if (words.length > 5) { words = words.slice(0, 5); cut = true; }
  while (cut && words.length > 2 && WEAK.has(words[words.length - 1].toLowerCase())) words.pop();
  const out = words.join(' ') + (cut ? '\u2026' : '');
  warn.push(`"${node.text}" \u2192 "${out}"`);
  return typo(out);
}

export function render(tree, { hue = false } = {}) {
  const cv = new Canvas(), warnings = [], rot = [];
  let blockId = 0;
  cv.warnings = warnings;
  const { xHeight } = metrics();
  const acc = accentIndex(tree.root);
  const kids = tree.root.children;

  // Slots: one per leaf, one empty between branches (and between the last and first).
  const slots = kids.reduce((s, c) => s + Math.max(1, c.children.length), 0) + BRANCH_GAP * kids.length;
  const step = (2 * Math.PI) / slots;
  let s = 0;
  const pt = (a, r) => ({ x: r * Math.cos(a), y: r * Math.sin(a) });
  const start = -Math.PI / 2 + step; // the empty slot after the last branch straddles 12 o'clock
  const branches = kids.map((c, i) => {
    const leaves = c.children.map(p => { const a = start + (s + 0.5) * step; s += 1; return { node: p, a }; });
    if (!leaves.length) s += 1;
    const a = leaves.length ? (leaves[0].a + leaves[leaves.length - 1].a) / 2 : start + (s - 0.5) * step;
    s += BRANCH_GAP;
    let col = INK, lead = '#111', l2col = INK;
    if (hue) { const h = HUES[i % HUES.length]; col = adjust(h, { s: 0.85, l: 0.75 }); lead = darken(h, 0.9); l2col = darken(h, 1.15); }
    if (i === acc) col = lead = l2col = RED;
    return { node: c, a, leaves, col, lead, l2col };
  });

  // Text along the radius from radius r0, flipped on the left half. Records rotated ink boxes for the check.
  function radialText(b, a, r0, fill, weight) {
    const left = Math.cos(a) < -1e-6, deg = (a * 180) / Math.PI + (left ? 180 : 0);
    const p = pt(a, r0), dir = left ? -1 : 1, id = blockId++;
    const top = -((b.lines.length - 1) * b.lh) / 2 - (b.base - (xHeight * b.size) / 2);
    b.lines.forEach((ln, i) => {
      const y = top + b.base + i * b.lh;
      const tspans = ln.segs.map(sg => `<tspan font-weight="${weight}">${sg.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</tspan>`).join('');
      cv.els.push(`<text transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(deg)})" x="0" y="${f(y)}" font-size="${b.size}" text-anchor="${left ? 'end' : 'start'}" fill="${fill}">${tspans}</text>`);
      const lx0 = left ? -ln.w : 0, box = { x0: lx0, x1: lx0 + ln.w, y0: y - 0.74 * b.size, y1: y + 0.22 * b.size };
      const th = (deg * Math.PI) / 180, c = Math.cos(th), sn = Math.sin(th);
      const toW = (q) => ({ x: p.x + q.x * c - q.y * sn, y: p.y + q.x * sn + q.y * c });
      const corners = [{ x: box.x0, y: box.y0 }, { x: box.x1, y: box.y0 }, { x: box.x1, y: box.y1 }, { x: box.x0, y: box.y1 }].map(toW);
      rot.push({ origin: p, th, box, corners, id });
      cv.strokes.push({ pts: corners, width: 0 });
    });
    return dir;
  }
  const linkRadial = (a0, r0, a1, r1, col, width) => {
    const rm = (r0 + r1) / 2, P = [pt(a0, r0), pt(a0, rm), pt(a1, rm), pt(a1, r1)];
    cv.path(`M ${f(P[0].x)} ${f(P[0].y)} C ${f(P[1].x)} ${f(P[1].y)} ${f(P[2].x)} ${f(P[2].y)} ${f(P[3].x)} ${f(P[3].y)}`,
      Array.from({ length: 33 }, (_, k) => { const t = k / 32, u = 1 - t; return { x: u ** 3 * P[0].x + 3 * u * u * t * P[1].x + 3 * u * t * t * P[2].x + t ** 3 * P[3].x, y: u ** 3 * P[0].y + 3 * u * u * t * P[1].y + 3 * u * t * t * P[2].y + t ** 3 * P[3].y }; }),
      { stroke: col, width });
  };

  // Root, centred.
  const rootB = block([{ text: typo(tree.root.text), weight: 600, role: 'lead' }], ROOT.size, ROOT.wrap, { leading: 1.2 });
  cv.text(rootB, 0, -rootB.h / 2, { align: 'middle', lead: { fill: '#111' } });
  // A hairline ring round the question; the level-1 links leave it.
  const r0 = Math.hypot(rootB.w / 2, rootB.h / 2) + ROOT.pad / 2;
  cv.circle(0, 0, r0, { stroke: '#b5b5b5', width: 1 });

  // Level-1 leads; the points' ring sits a fan's span past the longest lead.
  const l1 = branches.map(br => ({ br, b: balanced([{ text: shortText(br.node, warnings), weight: 600, role: 'lead' }], L1.size, L1.wrap, { lineHeight: L1.lh }) }));
  const rFan = R1 + L1.gap + Math.max(...l1.map(x => x.b.w)) + L1.rule;
  const r2 = rFan + L2.span;

  const order = branches.map((_, i) => i).sort((a, b) => (a === acc) - (b === acc));
  for (const i of order) {
    const br = branches[i], { b } = l1[i];
    linkRadial(br.a, r0, br.a, R1, br.col, W.l1);
    cv.circle(pt(br.a, R1).x, pt(br.a, R1).y, 3, { fill: br.col });
    radialText(b, br.a, R1 + L1.gap, br.lead, 600);
    if (!br.leaves.length) continue;
    // Each branch fans out just past its own lead (a short tick carries it on), so short leads get long fans.
    const fan = R1 + L1.gap + b.w + L1.rule;
    cv.line([pt(br.a, fan - L1.rule + L1.gap / 2), pt(br.a, fan)], { stroke: br.col, width: W.l2 });
    for (const lf of br.leaves) {
      linkRadial(br.a, fan, lf.a, r2, br.col, W.l2);
      const lb = block([{ text: shortText(lf.node, warnings), weight: 400, role: 'cont' }], L2.size, 10000);
      radialText(lb, lf.a, r2 + L2.gap, br.l2col, 400);
    }
  }

  // Overlap check for rotated text: strokes in each text's own frame, and text boxes against each other (SAT).
  const baseCheck = cv.check.bind(cv);
  cv.check = (opts) => {
    const issues = baseCheck(opts);
    const local = (t, q) => { const dx = q.x - t.origin.x, dy = q.y - t.origin.y, c = Math.cos(t.th), sn = Math.sin(t.th); return { x: dx * c + dy * sn, y: -dx * sn + dy * c }; };
    for (const st of cv.strokes) {
      if (!st.width) continue;
      for (const t of rot) {
        const bx = { x0: t.box.x0 + 1, x1: t.box.x1 - 1, y0: t.box.y0 + 1, y1: t.box.y1 - 1 };
        let hit = false;
        for (let k = 1; k < st.pts.length && !hit; k++) hit = segHitsBox(local(t, st.pts[k - 1]), local(t, st.pts[k]), bx);
        if (hit) issues.push(`stroke crosses rotated text near (${f(t.corners[0].x)}, ${f(t.corners[0].y)})`);
      }
    }
    for (let i = 0; i < rot.length; i++) for (let j = i + 1; j < rot.length; j++) {
      if (rot[i].id === rot[j].id) continue;
      if (polysOverlap(rot[i].corners, rot[j].corners)) issues.push(`rotated text overlaps near (${f(rot[i].corners[0].x)}, ${f(rot[i].corners[0].y)})`);
    }
    // And against the (unrotated) root text.
    for (const t of rot) for (const u of cv.texts) {
      const box = [{ x: u.x0, y: u.y0 }, { x: u.x1, y: u.y0 }, { x: u.x1, y: u.y1 }, { x: u.x0, y: u.y1 }];
      if (polysOverlap(t.corners, box)) issues.push('rotated text overlaps the root');
    }
    return [...new Set(issues)];
  };
  return cv;
}

function polysOverlap(A, B) {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], nx = q.y - p.y, ny = p.x - q.x;
    const pr = (Q) => Q.map(v => v.x * nx + v.y * ny);
    const a = pr(A), b = pr(B);
    if (Math.max(...a) <= Math.min(...b) || Math.max(...b) <= Math.min(...a)) return false;
  }
  return true;
}

function segHitsBox(p, q, r) {
  if (r.x0 >= r.x1 || r.y0 >= r.y1) return false;
  let t0 = 0, t1 = 1;
  const dx = q.x - p.x, dy = q.y - p.y;
  for (const [pp, qq] of [[-dx, p.x - r.x0], [dx, r.x1 - p.x], [-dy, p.y - r.y0], [dy, r.y1 - p.y]]) {
    if (pp === 0) { if (qq < 0) return false; continue; }
    const t = qq / pp;
    if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

export const C = { slug: 'C', render: (t) => render(t) };
export const CHue = { slug: 'C-hue', render: (t) => render(t, { hue: true }) };
