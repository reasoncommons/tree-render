// check.js: the renderer's self-checks (design spec section 9).
// check(L, { tree, svg, measure }) → { ok, errors[], warnings[], metrics }
//   L: a layout result; tree: the parsed source (fidelity is checked against it, else against the
//   layout's own copies); svg: the drawn SVG (fonts check); measure: to size the frame lines (overflow).
// Errors (ok = false): overlap, ribbon, overflow, fidelity, fonts, markers (mixed). Warnings: floor,
// budget, markers (no key), view. Each item: { check, message, remedy?, nodes? }.
import { find } from './parse.js';
import { leadOnlyText } from './layout.js';
import { branchGeometry, shelfLen } from './draw.js';
import { strokeAt } from './formats.js';

export const REMEDY = 'open one level less (--depth), use lead labels (--labels lead, after adding bold leads at the source), re-root at a branch (--root 2), or split into a carousel (tree-render carousel)';
const remedyFor = L => L.labels === 'lead'
  ? 'open one level less (--depth), add or shorten bold leads at the source, re-root at a branch (--root 2.3), or split into a carousel (tree-render carousel)'
  : REMEDY;
const BUDGET_SLACK = 1.2;  // budgets are "about": warn only past 1.2 × the number
const QA_MAX_LINES = 8;    // spec 9.8
const PHONE_W = 390;
const EPS = 0.5;

export function check(L, ctx = {}) {
  const errors = [], warnings = [];
  const F = L.format, T = L.theme, M = F.margin;
  const key = n => n.num || 'root';
  const box = n => ({ x0: n.x, y0: n.top, x1: n.x + n.w + n.moreW, y1: n.top + n.h });

  // 1. overlap: text blocks (markers included), then ribbons against blocks other than their own node
  const pairs = [];
  for (let i = 0; i < L.nodes.length; i++) for (let j = i + 1; j < L.nodes.length; j++) {
    const a = box(L.nodes[i]), b = box(L.nodes[j]);
    if (a.x0 < b.x1 - EPS && b.x0 < a.x1 - EPS && a.y0 < b.y1 - EPS && b.y0 < a.y1 - EPS) pairs.push([key(L.nodes[i]), key(L.nodes[j])]);
  }
  if (pairs.length) errors.push({ check: 'overlap', message: `${pairs.length} pair(s) of text blocks overlap`, nodes: pairs });
  const crossed = [];
  for (const n of L.nodes) {
    const segs = ribbonPoints(L, n);
    for (const m of L.nodes) {
      if (m === n) continue;
      const b = box(m);
      if (segs.some(([x, y, r]) => x > b.x0 + EPS && x < b.x1 - EPS && y + r > b.y0 + EPS && y - r < b.y1 - EPS)) crossed.push([key(n), key(m)]);
    }
  }
  if (crossed.length) errors.push({ check: 'ribbon', message: `${crossed.length} branch(es) run through another node's text`, nodes: crossed });

  // 2. overflow: the fitted map inside the canvas below the kicker band and above the footer band; frame lines inside the margins
  const s = L.scale;
  if (F.W) {
    const availW = F.W - 2 * M, availH = F.H - 2 * M - L.frame.kickerH - L.frame.footerH;
    if (L.mapW * s > availW + EPS || L.mapH * s > availH + EPS) errors.push({ check: 'overflow', message: `map ${Math.round(L.mapW * s)} × ${Math.round(L.mapH * s)} exceeds ${Math.round(availW)} × ${Math.round(availH)}` });
    else if (L.ox + L.mapW * s > F.W - M + EPS || L.oy + L.mapH * s > F.H - M - L.frame.footerH + EPS || L.oy < M + L.frame.kickerH - EPS) errors.push({ check: 'overflow', message: 'map drawn outside the canvas margins' });
  }
  if (ctx.measure) {
    for (const [part, size] of [['kicker', F.kicker], ['footer', F.footer]]) {
      const t = L.frame[part];
      if (t && ctx.measure(t, size, 'R') > L.W - 2 * M + EPS) errors.push({ check: 'overflow', message: `the ${part} line is wider than the canvas (${Math.round(ctx.measure(t, size, 'R'))} > ${L.W - 2 * M})`, remedy: `shorten the ${part}` });
    }
  }

  // 3. type floor
  const card = !!(L.options && (L.options.root || L.options.depth >= 2));
  const floor = card ? F.floorCard : F.floor;
  const minSize = Math.min(...L.nodes.flatMap(n => n.lines.map(l => l.size)));
  const minFont = round1(minSize * s);
  const phoneFont = F.W === 1080 ? round1(minFont * PHONE_W / 1080) : null;
  if (minFont < floor - 0.05) warnings.push({ check: 'floor', message: `smallest text is ${minFont} px at scale ${s.toFixed(3)}, below the ${floor} px floor${phoneFont ? ` (${phoneFont} px on a phone)` : ''}`, remedy: remedyFor(L) });

  // 4. budget (node count always; characters for full labels only, since leads are the remedy)
  const chars = L.nodes.reduce((a, n) => a + n.lines.map(l => l.t).join(' ').length, 0);
  const leadOnly = L.labels === 'lead';
  const B = F.budget;
  const budget = B ? { nodes: leadOnly ? B.nodesLead : B.nodesFull, chars: leadOnly ? null : B.chars } : null;
  if (budget) {
    const over = [];
    if (L.nodes.length > budget.nodes * BUDGET_SLACK) over.push(`${L.nodes.length} nodes (about ${budget.nodes} fit)`);
    if (budget.chars && chars > budget.chars * BUDGET_SLACK) over.push(`${chars} characters (about ${budget.chars} fit)`);
    if (over.length) warnings.push({ check: 'budget', message: `over the ${F.name} budget: ${over.join(', ')}`, remedy: remedyFor(L) });
  }

  // 5. fidelity: every drawn label equals the source after cleaning, whole or as its lead
  const bad = [];
  for (const n of L.nodes) {
    const src = (ctx.tree && n.num != null ? find(ctx.tree.root, x => x.num === n.num) : null) || (ctx.tree && n.num == null ? ctx.tree.root : null) || n.src;
    const parts = {};
    for (const l of n.lines) (parts[l.part || 'text'] = parts[l.part || 'text'] || []).push(l.t);
    for (const [part, ls] of Object.entries(parts)) {
      const got = ls.join(' ');
      const ok = allowed(src, part);
      const unnumbered = T.numbers && n.num && got.startsWith(n.num + ' ') ? got.slice(n.num.length + 1) : null;
      if (!ok.includes(got) && !(unnumbered && ok.includes(unnumbered))) bad.push({ num: key(n), part, got });
    }
    if (n.hidden && !new RegExp(`^\\+${n.hidden}( \\w+)?$`).test(n.moreLabel || '')) bad.push({ num: key(n), part: 'marker', got: n.moreLabel });
  }
  if (bad.length) errors.push({ check: 'fidelity', message: `${bad.length} label(s) differ from the source`, nodes: bad.map(b => `${b.num} ${b.part}: "${b.got}"`) });

  // 6. fonts embedded, two families only
  if (ctx.svg != null) {
    const faces = ['ApfelRegular', 'ApfelMittel'].filter(f => new RegExp(`@font-face\\{font-family:${f};src:url\\(data:font/otf;base64,[A-Za-z0-9+/=]{100,}`).test(ctx.svg));
    const families = new Set([...ctx.svg.matchAll(/font-family[=:]"?([\w-]+)/g)].map(m => m[1]));
    const extra = [...families].filter(f => f !== 'ApfelRegular' && f !== 'ApfelMittel');
    if (faces.length < 2 || extra.length) errors.push({ check: 'fonts', message: `fonts: ${faces.length} of 2 embedded${extra.length ? `; other families used: ${extra.join(', ')}` : ''}` });
  }

  // 7. markers: all-or-none wording; the footer key when bare
  const marked = L.nodes.filter(n => n.hidden);
  const spelled = marked.filter(n => / /.test(n.moreLabel));
  if (spelled.length && spelled.length < marked.length) errors.push({ check: 'markers', message: `${spelled.length} of ${marked.length} fold markers spell the noun; all or none` });
  else if (F.W && marked.length && !spelled.length && !/^\+N: /.test(L.frame.footer || '')) warnings.push({ check: 'markers', message: 'bare "+N" markers and no footer key; add --footer so the key "+N: … folded beneath" is shown' });

  // 8. view sanity
  let longAnswers = 0;
  if (L.view === 'answers') {
    const none = L.nodes.filter(n => !n.src.answer).map(key);
    if (none.length) warnings.push({ check: 'view', message: `${none.length} node(s) have no answer and show their question`, nodes: none });
  } else if (L.view === 'qa') {
    const long = L.nodes.filter(n => n.lines.filter(l => l.part === 'answer').length > QA_MAX_LINES).map(key);
    longAnswers = long.length;
    if (long.length) warnings.push({ check: 'view', message: `${long.length} answer(s) run past ${QA_MAX_LINES} lines; qa view suits the web or a small sub-tree`, nodes: long });
  }

  const metrics = {
    format: F.name, theme: T.key, view: L.view, labels: L.labels, W: L.W, H: L.H,
    scale: round3(s), sizeScale: L.sizeScale || 1, minFont, floor, phoneFont,
    nodes: L.nodes.length, chars, budget, mapW: Math.round(L.mapW), mapH: Math.round(L.mapH), longAnswers,
  };
  return { ok: errors.length === 0, errors, warnings, metrics };
}

// The labels a part of a node may show (spec 5, 6, 10).
function allowed(src, part) {
  const out = [];
  if (part === 'text') out.push(src.text);
  if (part === 'lead' && src.lead) out.push(src.lead, leadOnlyText(src.lead));
  if (part === 'cont' && src.cont) out.push(src.cont);
  if (part === 'answer' && src.answer) out.push(src.answer);
  if (part === 'question') out.push(src.text, src.lead, leadOnlyText(src.lead || ''));
  return out.filter(Boolean);
}

// Points along a node's incoming branch and shelf (or the root's trunk) as [x, y, half-width].
function ribbonPoints(L, n) {
  const F = L.format, T = L.theme;
  const pts = [];
  if (n.depth === 0 || !n.parent) {
    const w = strokeAt(F, 0) * T.strokeScale / 2, len = shelfLen(L, n) + F.trunk;
    for (let i = 0; i <= 20; i++) pts.push([n.x + len * i / 20, n.shelf, w]);
    return pts;
  }
  const g = branchGeometry(L, n);
  const dx = g.x1 - g.x0, c1 = g.x0 + dx * F.curveK, c2 = g.x1 - dx * F.curveK;
  for (let i = 0; i <= F.ribbonSamples; i++) {
    const t = i / F.ribbonSamples, mt = 1 - t;
    const x = mt * mt * mt * g.x0 + 3 * mt * mt * t * c1 + 3 * mt * t * t * c2 + t * t * t * g.x1;
    const y = (mt * mt * mt + 3 * mt * mt * t) * g.y0 + (3 * mt * t * t + t * t * t) * g.y1;
    pts.push([x, y, (g.w0 + (g.w1 - g.w0) * t) / 2]);
  }
  for (let i = 1; i <= 20; i++) pts.push([g.x1 + g.shelf * i / 20, g.y1, g.w2 / 2]);
  return pts;
}

const round1 = v => Math.round(v * 10) / 10;
const round3 = v => Math.round(v * 1000) / 1000;
