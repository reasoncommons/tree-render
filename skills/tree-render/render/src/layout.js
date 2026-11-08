// layout.js: parsed tree → positioned text blocks (design spec sections 2–6).
// layout(tree, opts, measure) → { nodes, mapW, mapH, colX, depthW, scale, sizeScale, format, theme, ... }
//   opts: { format, theme, view, labels, depth, root, hue, kickers, moreWord, fold, frame, maxScale, airAfterBranch }
//   measure(text, size, weight) → px, from measure-node.js or measure-browser.js.
// Steps: re-root and prune; text blocks; column budget; columns; flextree; fill pass; fit; grow to fill.
// Pure with respect to the input tree: everything returned is a fresh object.
import { getFormat, levelStyle, gapAfter } from './formats.js';
import { getTheme, hueOf } from './themes.js';
import { wrap } from './wrap.js';
import { prune, reroot } from './parse.js';
import { flextree } from './flextree.js';

const LABELS_NUMBERED = /^Q?\d+(\.\d+)*[.)]?\s/;

export function layout(tree, opts0, measure) {
  const opts = resolveOptions(tree, opts0);
  const F0 = getFormat(opts.format);
  const T = getTheme(opts.theme);
  const visible = visibleTree(tree, opts, F0);
  const fixed = !!F0.W;
  let best;
  for (const k of fixed ? F0.grow : [1]) {
    // two column budgets per type scale (see budget); keep the better fit, the spec's budget on a tie
    const Fk = scaled(F0, k);
    const a = layoutAtScale(visible, opts, measure, Fk, T, false);
    const b = fixed ? layoutAtScale(visible, opts, measure, Fk, T, true) : a;
    best = b.scale > a.scale + 1e-6 ? b : a;
    best.sizeScale = k;
    if (best.scale >= F0.growMinScale) break;
  }
  return best;
}

function resolveOptions(tree, o = {}) {
  const format = o.format || '4x5';
  const kind = tree.kind || 'question';
  const F = getFormat(format);
  const depth = o.depth != null ? o.depth : (o.root ? F.depthCard : F.depth);
  const noun = kind === 'hypothesis' ? 'points' : 'questions';
  const moreWord = o.moreWord != null ? o.moreWord : (F.W && depth === 1 ? noun : '');
  return {
    format, theme: o.theme || undefined, depth, noun, moreWord,
    view: o.view || (kind === 'qa' || kind === 'hypothesis' ? 'answers' : 'questions'),
    labels: o.labels || 'full',
    root: o.root || null, hue: o.hue, kickers: o.kickers || 'root', fold: o.fold || [],
    frame: { kicker: (o.frame && o.frame.kicker) || '', footer: (o.frame && o.frame.footer) || '' },
    maxScale: o.maxScale || 1,
    airAfterBranch: o.airAfterBranch !== false,
  };
}

// Re-root, then prune to depth (and fold set). The hue index of the visible root: a re-rooted card keeps
// its top-level ancestor's hue unless opts.hue is 'fresh'; a number forces a hue.
function visibleTree(tree, opts) {
  let base = tree.root;
  let hue = -1;
  if (opts.root) {
    base = reroot(tree.root, opts.root);
    if (!base) throw new Error(`no node numbered "${opts.root}"`);
    if (opts.hue !== 'fresh' && base.branchIndex != null) hue = base.branchIndex;
  }
  if (typeof opts.hue === 'number') hue = opts.hue;
  else if (opts.hue != null && opts.hue !== 'fresh' && !isNaN(+opts.hue)) hue = +opts.hue;
  const root = prune(base, opts.depth, opts.fold);
  return { root, hue };
}

// Grow to fill: type sizes × k, strokes × √k (spec 3.8).
function scaled(F0, k) {
  if (k === 1) return F0;
  const F = structuredClone(F0);
  F.root.size = Math.round(F.root.size * k);
  F.answer.size = Math.round(F.answer.size * k);
  F.levels.forEach(S => { S.lead = Math.round(S.lead * k); S.cont = Math.round(S.cont * k); });
  F.stroke = F.stroke.map(w => w * Math.sqrt(k));
  return F;
}

// Column budget (spec 3.3): wrap widths from the canvas width and the number of visible levels.
// With `overheads`, the fixed per-column runs (shelf overrun on every column, the root's trunk) also come
// off the budget, so the columns add up to avail. Spec 3.3 (and the prototype) leave them out, which
// makes every budgeted map ~5% too wide, so a sparse cover never grows (spec 3.8); with them, tall maps
// get more lines and fit worse. layout() tries both and keeps the better fit.
function budget(F0, depths, overheads = false) {
  if (!F0.W) return F0;
  const F = structuredClone(F0);
  const avail = F.W - 2 * F.margin - F.availPad;
  let gaps = 0;
  for (let d = 1; d < depths; d++) gaps += gapAfter(F, d - 1);
  const weights = [];
  for (let d = 0; d < depths; d++) weights.push(F.colWeights[Math.min(d, F.colWeights.length - 1)]);
  const sumW = weights.reduce((a, b) => a + b, 0);
  const free = avail - gaps - (overheads ? depths * F.shelfOver + F.trunk : 0);
  const [lo, hi] = F.wrapClamp;
  const clamp = (v, nominal) => Math.max(nominal * lo, Math.min(nominal * hi, v));
  F.root.wrap = clamp(free * weights[0] / sumW, F.root.wrap);
  for (let d = 1; d < depths && d - 1 < F.levels.length; d++) {
    F.levels[d - 1].wrap = clamp(free * weights[d] / sumW, F.levels[d - 1].wrap);
  }
  return F;
}

function depthOf(n) { return 1 + (n.children.length ? Math.max(...n.children.map(depthOf)) : 0); }

// One full layout at a fixed type scale: blocks, budget, fill pass, fit.
function layoutAtScale(visible, opts, measure, Fk, T, overheads) {
  let F = budget(Fk, depthOf(visible.root), overheads);
  let o = opts;
  let L = layoutOnce(visible, o, measure, F, T);
  // all-or-none marker wording (spec 6): if any spelled marker does not fit, all go bare
  if (o.moreWord && L.markersFell) { o = { ...o, moreWord: '' }; L = layoutOnce(visible, o, measure, F, T); }
  if (F.W) {
    const avail = F.W - 2 * F.margin - F.availPad;
    for (let round = 0; round < F.fillRounds; round++) {
      const slack = avail - L.mapW;
      if (slack < F.fillMinSlack) break;
      const pressure = []; // lines per level, only levels whose nodes wrapped
      L.nodes.forEach(n => { if (n.depth > 0 && n.lines.length > 1) pressure[n.depth] = (pressure[n.depth] || 0) + n.lines.length; });
      const total = pressure.reduce((a, b) => a + (b || 0), 0);
      if (!total) break;
      const F2 = structuredClone(F);
      pressure.forEach((p, d) => { if (p) levelStyle(F2, d).wrap += slack * p / total; });
      const L2 = layoutOnce(visible, o, measure, F2, T);
      if (L2.mapW > avail + 1 || L2.mapH > L.mapH) break;
      F = F2; L = L2;
    }
  }
  return fit(L, o, F);
}

// Fit (spec 3.7): scale the map into the canvas below the kicker band and above the footer band;
// left-aligned at the margin, centred vertically. Fluid canvases are sized to the map at scale 1.
function fit(L, opts, F) {
  const M = F.margin;
  const frame = { ...opts.frame };
  const markers = { any: L.nodes.some(n => n.hidden), spelled: L.nodes.some(n => n.hidden && n.moreSpelled) };
  if (F.W && frame.footer && markers.any && !markers.spelled) frame.footer = '+N: ' + opts.noun + ' folded beneath  ·  ' + frame.footer;
  const kickerH = frame.kicker ? F.kicker * F.kickerBand : 0;
  const footerH = frame.footer ? F.footer * F.footerBand : 0;
  let W = F.W, H = F.H, scale = 1;
  if (W) {
    const availW = W - 2 * M, availH = H - 2 * M - kickerH - footerH;
    scale = Math.min(opts.maxScale, availW / (L.mapW + F.availPad), availH / L.mapH);
  } else {
    W = Math.ceil(L.mapW + 2 * M + F.availPad);
    H = Math.ceil(L.mapH + 2 * M + kickerH + footerH);
  }
  const availH = H - 2 * M - kickerH - footerH;
  const ox = M;
  const oy = M + kickerH + Math.max(0, (availH - L.mapH * scale) / 2);
  return {
    ...L, scale, W, H, ox, oy, format: F,
    frame: { ...frame, kickerH, footerH },
    markers, view: opts.view, labels: opts.labels, depth: opts.depth,
  };
}

function lineHeightOf(F, depth) {
  if (depth === 0) return F.root.size * F.root.lh;
  const S = levelStyle(F, depth);
  return S.cont * S.lh;
}

function layoutOnce(visible, opts, measure, F, T) {
  const nodes = [];
  const rootHue = visible.hue;
  const view = opts.view;
  const leadOnly = opts.labels === 'lead';

  // Text block of one node (spec 5, 6): lines with size, weight, colour and baseline y.
  function block(src, depth, hueIndex, parent) {
    const lines = [];
    let y = 0;
    const push = (ls, role, color, lh, gapBefore = 0) => {
      if (!ls.length) return;
      y += gapBefore;
      for (const l of ls) {
        const h = l.size * lh;
        lines.push({ ...l, role, color, y: y + (h - l.size) / 2 + l.size * F.baseline });
        y += h;
      }
    };
    const wr = (text, width, size, weight) => wrap(text, width, measure, size, weight, F.balanceFloor);
    const answerWidth = (w, k) => Math.min(w * k, F.answer.size * F.answerMeasure);
    const showAnswer = view === 'answers' && src.answer;

    if (depth === 0) {
      const fitRoot = (text) => {
        for (const k of F.rootShrink) {
          const ls = wr(text, F.root.wrap, Math.round(F.root.size * k), 'M');
          if (ls.length <= F.rootMaxLines || k === F.rootShrink[F.rootShrink.length - 1]) return ls;
        }
      };
      if (showAnswer) {
        push(wr(src.text, F.root.wrap * 1.1, F.answer.size, 'R'), 'muted', T.muted, F.answer.lh);
        push(fitRoot(src.answer), 'ink', T.ink, F.root.lh, F.answer.size * 0.4);
      } else if (src.lead) {
        push(fitRoot(src.lead), 'ink', T.ink, F.root.lh);
        if (src.cont) push(wr(src.cont, F.root.wrap * 1.1, F.levels[0].cont, 'R'), 'ink', T.ink, F.levels[0].lh, F.root.size * 0.25);
      } else push(fitRoot(src.text), 'ink', T.ink, F.root.lh);
      if (view === 'qa' && src.answer) push(wr(src.answer, answerWidth(F.root.wrap, 1.15), F.answer.size, 'R'), 'muted', T.muted, F.answer.lh, F.answer.size * 0.45);
    } else {
      const S = levelStyle(F, depth);
      const multiHue = rootHue < 0;
      const leadColor = T.textHues && depth === 1 && src.lead && multiHue ? hueOf({ hues: T.textHues }, hueIndex) : T.ink;
      const leadRole = leadColor === T.ink ? 'ink' : 'textHue';
      const num = T.numbers && !LABELS_NUMBERED.test(src.lead || src.text) ? src.num + '  ' : '';
      if (showAnswer) {
        const kick = opts.kickers === 'all';
        if (kick) push(wr(num + (src.lead || src.text), S.wrap * 1.05, F.answer.size, 'R'), 'muted', T.muted, F.answer.lh);
        push(wr(src.answer, S.wrap, S.cont, depth === 1 ? 'M' : 'R'), 'ink', T.ink, S.lh, kick ? F.answer.size * 0.35 : 0);
      } else if (src.lead) {
        const showCont = !leadOnly && src.cont;
        const lead = showCont ? src.lead : leadOnlyText(src.lead);
        const weight = depth === 1 || showCont ? 'M' : 'R';
        push(wr(num + lead, S.wrap, weight === 'M' ? S.lead : S.cont, weight), leadRole, leadColor, S.lh);
        if (showCont) push(wr(src.cont, S.wrap, S.cont, 'R'), 'ink', T.ink, S.lh);
      } else {
        const d1 = depth === 1;
        push(wr(num + src.text, S.wrap, d1 ? S.lead : S.cont, d1 ? 'M' : 'R'), d1 ? leadRole : 'ink', d1 ? leadColor : T.ink, S.lh);
      }
      if (view === 'qa' && src.answer) push(wr(src.answer, answerWidth(S.wrap, 1.05), F.answer.size, 'R'), 'muted', T.muted, F.answer.lh, F.answer.size * F.answerGap);
    }

    const n = {
      num: src.num, depth, index: src.index, hueIndex, hidden: src.hidden || 0,
      src, parent, children: [], lines, h: y, w: Math.max(...lines.map(l => l.w)),
      lh: lineHeightOf(F, depth), moreW: 0, moreLabel: null, moreSize: 0, moreSpelled: false, moreFell: false,
    };
    // fold marker "+N" (spec 6), on the last line's baseline, 0.6 × its size after the line's end
    if (n.hidden) {
      const fs = Math.round((depth === 0 ? F.root.size : levelStyle(F, depth).cont) * F.markerScale);
      const last = lines[lines.length - 1];
      const colWrap = depth === 0 ? F.root.wrap : levelStyle(F, depth).wrap;
      let label = '+' + n.hidden + (opts.moreWord ? ' ' + opts.moreWord : '');
      let mw = measure(label, fs, 'M');
      if (opts.moreWord && last.w + fs * F.markerGap + mw > colWrap * F.markerWordMax) {
        n.moreFell = true;
        label = '+' + n.hidden;
        mw = measure(label, fs, 'M');
      }
      n.moreLabel = label;
      n.moreSize = fs;
      n.moreSpelled = !!opts.moreWord && !n.moreFell;
      n.moreX = last.w + fs * F.markerGap;
      n.moreY = last.y;
      n.moreW = Math.max(0, n.moreX + mw - n.w);
    }
    nodes.push(n);
    n.children = src.children.map(c => block(c, depth + 1, depth === 0 && hueIndex < 0 ? c.index : hueIndex, n));
    return n;
  }
  const root = block(visible.root, 0, rootHue, null);

  // columns (spec 3.4)
  const depthW = [];
  for (const n of nodes) depthW[n.depth] = Math.max(depthW[n.depth] || 0, n.w + n.moreW + F.shelfOver + (n.depth === 0 ? F.trunk : 0));
  const colX = [0];
  for (let d = 1; d < depthW.length; d++) colX[d] = colX[d - 1] + depthW[d - 1] + gapAfter(F, d - 1);

  // vertical placement (spec 3.5): flextree, breadth = block height + sibling gap; cousins get more
  const air = (a, b) => opts.airAfterBranch && a.parent === b.parent && a.data.children.length > 0 && b.data.children.length === 0 ? F.airAfterBranch * b.data.lh : 0;
  const ft = flextree({
    children: n => n.children,
    nodeSize: d => [d.data.h + d.data.lh * (d.data.depth === 1 ? F.cousin : F.sib), 1],
    spacing: (a, b) => (a.parent === b.parent ? 0 : a.data.lh * (F.cousin - F.sib)) + air(a, b),
  });
  const h = ft.hierarchy(root);
  ft(h);
  let minY = Infinity, maxY = -Infinity;
  h.each(d => {
    const n = d.data;
    n.cy = d.x;
    n.x = colX[n.depth];
    minY = Math.min(minY, d.x - n.h / 2);
    maxY = Math.max(maxY, d.x + n.h / 2);
  });
  for (const n of nodes) {
    n.cy -= minY;
    n.top = n.cy - n.h / 2;
    n.shelf = n.top + n.h + n.lines[n.lines.length - 1].size * F.shelfLift;
  }
  const mapW = colX[colX.length - 1] + depthW[depthW.length - 1];
  return { nodes, root, mapW, mapH: maxY - minY, colX, depthW, theme: T, warnings: [], markersFell: nodes.some(n => n.moreFell) };
}

// Lead-only label (spec 5): "," or ";" at the end → "…"; ":" dropped; "?" and "." stand.
export function leadOnlyText(lead) {
  if (/[,;]$/.test(lead)) return lead.slice(0, -1) + '…';
  return lead.replace(/:$/, '');
}

// Pairs of nodes whose text blocks (markers included) intersect.
export function overlaps(nodes) {
  const bad = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (a.x < b.x + b.w + b.moreW && b.x < a.x + a.w + a.moreW && a.top < b.top + b.h && b.top < a.top + a.h) bad.push([a.num || 'root', b.num || 'root']);
    }
  }
  return bad;
}
