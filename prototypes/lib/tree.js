// tree.js — throwaway prototype: parse the examples' Markdown tree format, lay it out left-to-right,
// draw it as SVG (tapered S-curve branches, text on the branch, colour per top-level branch).
// Works in the browser (canvas text measurement); the parse half also works in Node.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TreeProto = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- parse ----------
  // Returns { title, kind, source, root }. Node: { text, lead, cont, answer, children, depth, index, num }
  function parse(md) {
    const lines = md.split(/\r?\n/);
    let title = '', kind = '', source = '';
    const stack = [];
    let rootNode = null;
    for (const raw of lines) {
      if (!raw.trim()) continue;
      if (/^#\s+/.test(raw) && !title) { title = raw.replace(/^#\s+/, '').trim(); continue; }
      let m;
      if ((m = /^kind:\s*(.*)$/.exec(raw))) { kind = m[1].trim(); continue; }
      if ((m = /^source:\s*(.*)$/.exec(raw))) { source = m[1].trim(); continue; }
      m = /^(\s*)-\s+(.*)$/.exec(raw);
      if (!m) continue;
      const indent = m[1].replace(/\t/g, '  ').length;
      const text = m[2].trim();
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      const parent = stack.length ? stack[stack.length - 1].node : null;
      if (/^A:\s*/.test(text)) { if (parent) parent.answer = clean(text.replace(/^A:\s*/, '')); continue; }
      const node = { children: [], answer: null };
      splitLead(node, text);
      if (parent) { node.depth = parent.depth + 1; parent.children.push(node); }
      else { node.depth = 0; rootNode = rootNode || node; }
      stack.push({ node, indent });
    }
    if (rootNode) number(rootNode, '');
    return { title, kind, source, root: rootNode };
  }
  // "**Lead** rest" / "**Lead:** rest" → lead + continuation; "Lead | rest" is a prototype-only shorthand.
  function splitLead(node, text) {
    let m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(text);
    if (m) { node.lead = clean(m[1]); node.cont = clean(m[2]); node.text = clean(m[1] + ' ' + m[2]); return; }
    m = /^(.+?)\s\|\s(.*)$/.exec(text);
    if (m) { node.lead = clean(m[1]); node.cont = clean(m[2]); node.text = node.cont; return; }
    node.lead = null; node.cont = null; node.text = clean(text);
  }
  function clean(s) {
    return s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\s+/g, ' ').trim();
  }
  function number(n, prefix) {
    n.children.forEach((c, i) => { c.num = prefix ? prefix + '.' + (i + 1) : String(i + 1); c.index = i; number(c, c.num); });
  }
  function count(n) { return n.children.reduce((s, c) => s + 1 + count(c), 0); }
  function find(n, pred) { if (pred(n)) return n; for (const c of n.children) { const r = find(c, pred); if (r) return r; } return null; }

  // ---------- themes ----------
  const THEMES = {
    paper: {
      name: 'Paper', bg: '#FBF8F2', ink: '#1F1C18', muted: '#6F6962', faint: '#B9B3AA',
      hues: ['#C0583A', '#2F7F8B', '#7A8F3E', '#8B5A9E', '#B8862B', '#4D6BAA'],
      leadInHue: false, strokeScale: 1, numbers: false, branchOpacity: [1, 1, 0.9, 0.8, 0.7, 0.7]
    },
    garden: {
      name: 'Garden', bg: '#FFFFFF', ink: '#1A1A1A', muted: '#7A7A7A', faint: '#C8C8C8',
      hues: ['#F2545B', '#F6A21E', '#2BB673', '#2F8BE6', '#9B5DE5', '#F15BB5'],
      textHues: ['#D63640', '#B87000', '#1E8A54', '#1F6CBE', '#7A3FC4', '#C92F8F'],
      leadInHue: true, strokeScale: 1.35, numbers: false, branchOpacity: [1, 1, 1, 0.95, 0.9, 0.9]
    },
    slate: {
      name: 'Slate', bg: '#16181D', ink: '#ECEAE4', muted: '#9A978F', faint: '#4A4D55',
      hues: ['#F28B6E', '#5EC4C0', '#A8C65A', '#C59BE8', '#F0C05A', '#6FA8F5'],
      leadInHue: false, strokeScale: 1.0, numbers: true, branchOpacity: [1, 1, 0.9, 0.8, 0.7, 0.7]
    }
  };

  // ---------- formats (sizes in canvas px) ----------
  const FORMATS = {
    '4x5': { W: 1080, H: 1350, margin: 64, floor: 34,
      root: { size: 46, wrap: 300, lh: 1.12 },
      levels: [ { lead: 38, cont: 31, wrap: 340, lh: 1.22 }, { lead: 31, cont: 31, wrap: 380, lh: 1.25 }, { lead: 27, cont: 27, wrap: 380, lh: 1.25 } ],
      answer: { size: 26, lh: 1.28 }, gapX: [128, 60, 52], sib: 0.45, cousin: 1.0, stroke: [10, 6.5, 4.5, 3.2], shelfOver: 12, trunk: 36, kicker: 24, footer: 22 },
    '1x1': { W: 1080, H: 1080, margin: 64, floor: 34,
      root: { size: 46, wrap: 300, lh: 1.12 },
      levels: [ { lead: 38, cont: 31, wrap: 340, lh: 1.22 }, { lead: 31, cont: 31, wrap: 380, lh: 1.25 }, { lead: 27, cont: 27, wrap: 380, lh: 1.25 } ],
      answer: { size: 26, lh: 1.28 }, gapX: [128, 60, 52], sib: 0.45, cousin: 1.0, stroke: [10, 6.5, 4.5, 3.2], shelfOver: 12, trunk: 36, kicker: 24, footer: 22 },
    '16x9': { W: 1920, H: 1080, margin: 72, floor: 26,
      root: { size: 48, wrap: 340, lh: 1.12 },
      levels: [ { lead: 36, cont: 30, wrap: 400, lh: 1.22 }, { lead: 27, cont: 27, wrap: 560, lh: 1.25 }, { lead: 25, cont: 25, wrap: 480, lh: 1.25 }, { lead: 24, cont: 24, wrap: 420, lh: 1.25 } ],
      answer: { size: 25, lh: 1.28 }, gapX: [160, 68, 60, 50], sib: 0.35, cousin: 0.85, stroke: [10, 6.5, 4.5, 3.2, 2.4], shelfOver: 14, trunk: 40, kicker: 24, footer: 22 },
    'web': { W: 0, H: 0, margin: 32, floor: 14,
      root: { size: 26, wrap: 220, lh: 1.15 },
      levels: [ { lead: 19, cont: 17, wrap: 260, lh: 1.3 }, { lead: 17, cont: 17, wrap: 280, lh: 1.3 }, { lead: 16, cont: 16, wrap: 280, lh: 1.3 }, { lead: 15, cont: 15, wrap: 280, lh: 1.3 }, { lead: 15, cont: 15, wrap: 280, lh: 1.3 } ],
      answer: { size: 15, lh: 1.32 }, gapX: [96, 48, 44, 40, 40], sib: 0.45, cousin: 0.9, stroke: [6, 4, 2.8, 2, 1.6, 1.4], shelfOver: 10, trunk: 24, kicker: 14, footer: 13 }
  };
  function levelStyle(F, depth) { return F.levels[Math.min(depth - 1, F.levels.length - 1)]; }
  function moreSize(F, n) { return Math.round((n.depth === 0 ? F.root.size : levelStyle(F, n.depth).cont) * 0.72); }
  function lastSize(n) { return n.lines[n.lines.length - 1].size; }
  function lhOf(F, n) { return n.depth === 0 ? F.root.size * F.root.lh : levelStyle(F, n.depth).cont * levelStyle(F, n.depth).lh; }

  // ---------- text ----------
  function makeMeasurer(ctx) {
    const cache = new Map();
    return function (text, size, weight) {
      const key = weight + size + '|' + text;
      let w = cache.get(key);
      if (w == null) { ctx.font = size + 'px ' + (weight === 'M' ? 'ApfelMittel' : 'ApfelRegular'); w = ctx.measureText(text).width; cache.set(key, w); }
      return w;
    };
  }
  function greedy(words, maxW, measure, size, weight) {
    const lines = []; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (measure(t, size, weight) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  // balanced wrap: the narrowest width keeping the greedy line count (CSS text-wrap: balance),
  // but never narrower than balanceFloor × maxW so a column still fills its width
  function wrap(text, maxW, measure, size, weight, balanceFloor) {
    const words = text.split(/\s+/).filter(Boolean);
    let lines = greedy(words, maxW, measure, size, weight);
    if (lines.length > 1) {
      let lo = maxW * (balanceFloor == null ? 0.72 : balanceFloor), hi = maxW;
      if (greedy(words, lo, measure, size, weight).length === lines.length) {
        for (let i = 0; i < 10; i++) { const mid = (lo + hi) / 2; if (greedy(words, mid, measure, size, weight).length > lines.length) lo = mid; else hi = mid; }
        lines = greedy(words, hi, measure, size, weight);
      }
    }
    return lines.map(t => ({ t, w: measure(t, size, weight), size, weight }));
  }

  // ---------- layout ----------
  // opts: { format, theme, view: 'questions'|'qa'|'answers', labels: 'full'|'lead', noFill }
  // Column budget: for fixed canvases, wrap widths come from the canvas width and the number of visible levels
  // (weights: root 1.0, level 1 1.15, deeper 1.3), each clamped to [0.8, 1.5] × the format's nominal wrap.
  function budget(F0, depths) {
    if (!F0.W) return F0;
    const F = JSON.parse(JSON.stringify(F0));
    const avail = F.W - 2 * F.margin - 16;
    const gaps = []; for (let d = 1; d < depths; d++) gaps.push(F.gapX[Math.min(d - 1, F.gapX.length - 1)]);
    const weights = []; for (let d = 0; d < depths; d++) weights.push(d === 0 ? 1.0 : d === 1 ? 1.15 : 1.3);
    const sumW = weights.reduce((a, b) => a + b, 0);
    const free = avail - gaps.reduce((a, b) => a + b, 0);
    const clamp = (v, nominal) => Math.max(nominal * 0.8, Math.min(nominal * 1.5, v));
    F.root.wrap = clamp(free * weights[0] / sumW, F.root.wrap);
    for (let d = 1; d < depths; d++) { const i = Math.min(d - 1, F.levels.length - 1); if (d - 1 < F.levels.length) F.levels[i] = Object.assign({}, F.levels[i], { wrap: clamp(free * weights[d] / sumW, F.levels[i].wrap) }); }
    return F;
  }
  function depthOf(n) { return 1 + (n.children.length ? Math.max(...n.children.map(depthOf)) : 0); }
  function scaled(F0, k) {
    if (!k || k === 1) return F0;
    const F = JSON.parse(JSON.stringify(F0));
    F.root.size = Math.round(F.root.size * k); F.answer.size = Math.round(F.answer.size * k); F.levels.forEach(S => { S.lead = Math.round(S.lead * k); S.cont = Math.round(S.cont * k); });
    F.stroke = F.stroke.map(w => w * Math.sqrt(k));
    return F;
  }
  function layout(tree, opts, measure) {
    let F = budget(scaled(FORMATS[opts.format], opts.sizeScale), depthOf(tree.root));
    let L = layoutOnce(tree, opts, measure, F);
    if (opts.moreWord && L.nodes.some(n => n.moreFell)) { opts = Object.assign({}, opts, { moreWord: '' }); L = layoutOnce(tree, opts, measure, F); }
    if (!F.W) return L;
    const avail = F.W - 2 * F.margin - 16;
    for (let pass = 0; pass < 2; pass++) {
      const slack = avail - L.mapW;
      if (slack < 30) break;
      const pressure = []; // lines per column, only for columns whose nodes actually wrapped
      L.nodes.forEach(n => { if (n.lines.length > 1 && n.depth > 0) pressure[n.depth] = (pressure[n.depth] || 0) + n.lines.length; });
      const total = pressure.reduce((a, b) => a + (b || 0), 0);
      if (!total) break;
      const F2 = JSON.parse(JSON.stringify(F));
      pressure.forEach((pr, d) => { if (pr) { const i = Math.min(d - 1, F2.levels.length - 1); F2.levels[i] = Object.assign({}, F2.levels[i], { wrap: F2.levels[i].wrap + slack * pr / total }); } });
      const L2 = layoutOnce(tree, opts, measure, F2);
      if (L2.mapW > avail + 1 || L2.mapH > L.mapH) break;
      F = F2; L = L2;
    }
    return L;
  }
  function layoutOnce(tree, opts, measure, F) {
    const T = THEMES[opts.theme];
    const view = opts.view || 'questions';
    const labelsMode = opts.labels || 'full';
    const root = tree.root;
    const nodes = [];
    const warnings = [];

    function block(n, depth) {
      n.depth = depth;
      const lines = [];
      let y = 0;
      const push = (ls, color, lh, gapBefore) => {
        if (!ls.length) return;
        y += gapBefore || 0;
        for (const L of ls) { const h = L.size * lh; L.y = y + (h - L.size) / 2 + L.size * 0.78; L.color = color; lines.push(L); y += h; }
      };
      if (depth === 0) {
        const kicker = view === 'answers' && n.answer ? n.text : null;
        const main = view === 'answers' && n.answer ? n.answer : n.text;
        if (kicker) push(wrap(kicker, F.root.wrap * 1.1, measure, F.answer.size, 'R'), T.muted, F.answer.lh, 0);
        const fit = (text) => { for (const k of [1, 0.87, 0.76, 0.68]) { const sz = Math.round(F.root.size * k); const ls = wrap(text, F.root.wrap, measure, sz, 'M'); if (ls.length <= 5 || k === 0.68) return ls; } };
        if (!kicker && n.lead) {
          push(fit(n.lead), T.ink, F.root.lh, 0);
          if (n.cont) push(wrap(n.cont, F.root.wrap * 1.1, measure, F.levels[0].cont, 'R'), T.ink, F.levels[0].lh, F.root.size * 0.25);
        } else push(fit(main), T.ink, F.root.lh, kicker ? F.answer.size * 0.4 : 0);
        if (view === 'qa' && n.answer) push(wrap(n.answer, Math.min(F.root.wrap * 1.15, F.answer.size * 30), measure, F.answer.size, 'R'), T.muted, F.answer.lh, F.answer.size * 0.45);
      } else {
        const S = levelStyle(F, depth);
        const hue = T.hues[n.hueIndex % T.hues.length];
        const leadColor = T.leadInHue && depth === 1 && n.lead && root.hueIndex < 0 ? (T.textHues || T.hues)[n.hueIndex % T.hues.length] : T.ink;
        const numPrefix = T.numbers && !/^Q?\d+(\.\d+)*[.)]?\s/.test(n.lead || n.text) ? n.num + '  ' : '';
        if (view === 'answers' && n.answer) {
          if (opts.kickers === 'all') push(wrap(numPrefix + (n.lead || n.text), S.wrap * 1.05, measure, F.answer.size, 'R'), T.muted, F.answer.lh, 0);
          push(wrap(n.answer, S.wrap, measure, S.cont, depth === 1 ? 'M' : 'R'), T.ink, S.lh, opts.kickers === 'all' ? F.answer.size * 0.35 : 0);
        } else if (n.lead) {
          const showCont = labelsMode === 'full' && n.cont;
          const leadText = showCont ? n.lead : (/[,;]$/.test(n.lead) ? n.lead.replace(/[,;]$/, '') + '…' : n.lead.replace(/:$/, ''));
          const leadWeight = depth === 1 || showCont ? 'M' : 'R';
          push(wrap(numPrefix + leadText, S.wrap, measure, leadWeight === 'M' ? S.lead : S.cont, leadWeight), leadColor, S.lh, 0);
          if (showCont) push(wrap(n.cont, S.wrap, measure, S.cont, 'R'), T.ink, S.lh, 0);
        } else {
          push(wrap(numPrefix + n.text, S.wrap, measure, depth === 1 ? S.lead : S.cont, depth === 1 ? 'M' : 'R'), depth === 1 ? leadColor : T.ink, S.lh, 0);
        }
        if (view === 'qa' && n.answer) push(wrap(n.answer, Math.min(S.wrap * 1.05, F.answer.size * 30), measure, F.answer.size, 'R'), T.muted, F.answer.lh, F.answer.size * 0.4);
      }
      n.lines = lines;
      n.h = y;
      n.w = Math.max(...lines.map(l => l.w));
      n.moreW = 0;
      if (n.hidden) { const fs = moreSize(F, n); const last = lines[lines.length - 1]; const word = opts.moreWord ? ' ' + opts.moreWord : ''; n.moreLabel = '+' + n.hidden + word; let mw = measure(n.moreLabel, fs, 'M'); if (word && last.w + fs * 0.6 + mw > (n.depth === 0 ? F.root.wrap : levelStyle(F, depth).wrap) * 1.15) { n.moreLabel = '+' + n.hidden; mw = measure(n.moreLabel, fs, 'M'); n.moreFell = true; } n.moreW = Math.max(0, last.w + fs * 0.6 + mw - n.w); }
      nodes.push(n);
      n.children.forEach(c => { c.parent = n; c.hueIndex = depth === 0 && n.hueIndex < 0 ? c.index : n.hueIndex; block(c, depth + 1); });
    }
    root.hueIndex = opts.hue == null ? -1 : opts.hue;
    block(root, 0);

    // columns
    const depthW = [];
    nodes.forEach(n => { depthW[n.depth] = Math.max(depthW[n.depth] || 0, n.w + n.moreW + F.shelfOver + (n.depth === 0 ? F.trunk : 0)); });
    const colX = [0];
    for (let d = 1; d < depthW.length; d++) colX[d] = colX[d - 1] + depthW[d - 1] + F.gapX[Math.min(d - 1, F.gapX.length - 1)];

    // vertical: flextree; node breadth = block height + sibling gap; cousins get more
    const ft = d3.flextree({
      nodeSize: n => [n.data.h + lhOf(F, n.data) * (n.data.depth === 1 ? F.cousin : F.sib), 1],
      spacing: (a, b) => a.parent === b.parent ? 0 : lhOf(F, a.data) * (F.cousin - F.sib)
    });
    const h = ft.hierarchy(root);
    ft(h);
    let minY = Infinity, maxY = -Infinity;
    h.each(d => { d.data.cy = d.x; d.data.x = colX[d.data.depth]; minY = Math.min(minY, d.x - d.data.h / 2); maxY = Math.max(maxY, d.x + d.data.h / 2); });
    nodes.forEach(n => { n.cy -= minY; n.top = n.cy - n.h / 2; n.shelf = n.top + n.h + lastSize(n) * 0.26; });
    const mapW = colX[colX.length - 1] + depthW[depthW.length - 1];
    const mapH = maxY - minY;
    return { nodes, mapW, mapH, colX, depthW, F, T, warnings };
  }

  // ---------- draw ----------
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // tapered S-curve from (x0,y0) to (x1,y1) then a straight shelf; widths w0 → w1 → w2
  function branchPath(x0, y0, x1, y1, w0, w1, shelf, w2, k) {
    k = k == null ? 0.5 : k;
    const dx = x1 - x0;
    const c1x = x0 + dx * k, c2x = x1 - dx * k;
    const N = 28; const up = [], dn = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, mt = 1 - t;
      const x = mt * mt * mt * x0 + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * x1;
      const y = mt * mt * mt * y0 + 3 * mt * mt * t * y0 + 3 * mt * t * t * y1 + t * t * t * y1;
      const dxt = 3 * mt * mt * (c1x - x0) + 6 * mt * t * (c2x - c1x) + 3 * t * t * (x1 - c2x);
      const dyt = 6 * mt * t * (y1 - y0);
      const len = Math.hypot(dxt, dyt) || 1;
      const nx = -dyt / len, ny = dxt / len;
      const w = (w0 + (w1 - w0) * t) / 2;
      up.push([x + nx * w, y + ny * w]); dn.push([x - nx * w, y - ny * w]);
    }
    if (shelf > 0) {
      const r = w2 / 2, ex = x1 + shelf - r;
      up.push([ex, y1 - r]);
      for (let i = 1; i < 6; i++) { const a = -Math.PI / 2 + (Math.PI * i) / 6; up.push([ex + r * Math.cos(a), y1 + r * Math.sin(a)]); }
      dn.push([ex, y1 + r]);
    }
    const pts = up.concat(dn.reverse());
    return 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';
  }

  // Render the laid-out tree to an SVG string plus metrics. opts: { theme, frame: {kicker, footer} }
  function draw(tree, L, opts) {
    const { nodes, F, T } = L;
    const M = F.margin;
    const strokeOf = d => F.stroke[Math.min(d, F.stroke.length - 1)] * T.strokeScale;
    let W = F.W, H = F.H;
    const kickerH = opts.frame && opts.frame.kicker ? F.kicker * 2.2 : 0;
    const footerH = opts.frame && opts.frame.footer ? F.footer * 2.4 : 0;
    const availW = (W || L.mapW + 2 * M) - 2 * M;
    const availH = (H || L.mapH + 2 * M + kickerH + footerH) - 2 * M - kickerH - footerH;
    let s = 1;
    if (W) s = Math.min(opts.maxScale || 1, availW / (L.mapW + 16), availH / L.mapH);
    if (!W) { W = Math.ceil(L.mapW + 2 * M + 16); H = Math.ceil(L.mapH + 2 * M + kickerH + footerH); }
    const ox = M;
    const oy = M + kickerH + Math.max(0, (availH - L.mapH * s) / 2);

    const out = [];
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ApfelRegular" data-theme="${opts.theme}">`);
    out.push(`<rect width="${W}" height="${H}" fill="${T.bg}"/>`);
    if (opts.frame && opts.frame.kicker) out.push(`<text x="${M}" y="${M + F.kicker * 0.9}" font-size="${F.kicker}" fill="${T.muted}">${esc(opts.frame.kicker)}</text>`);
    if (opts.frame && opts.frame.footer) out.push(`<text x="${W - M}" y="${H - M + F.footer * 0.2}" font-size="${F.footer}" fill="${T.muted}" text-anchor="end">${esc(opts.frame.footer)}</text>`);
    out.push(`<g transform="translate(${ox},${oy}) scale(${s})">`);

    const shelfLen = n => n.w + n.moreW + F.shelfOver;
    const byDepth = [...nodes].sort((a, b) => a.depth - b.depth);
    for (const n of byDepth) {
      if (n.depth === 0) {
        const w = strokeOf(0), L = shelfLen(n) + F.trunk;
        out.push(`<path d="M${n.x},${n.shelf - w / 2}H${n.x + L - w / 2}a${w / 2},${w / 2} 0 0 1 0,${w}H${n.x}Z" fill="${T.ink}"/>`);
        continue;
      }
      const p = n.parent;
      const hue = T.hues[n.hueIndex % T.hues.length];
      const w0 = strokeOf(n.depth - 1) * (n.depth === 1 ? 0.75 : 0.9), w1 = strokeOf(n.depth), w2 = strokeOf(n.depth) * 0.85;
      const op = T.branchOpacity[Math.min(n.depth, T.branchOpacity.length - 1)];
      out.push(`<path class="branch" data-num="${n.num}" d="${branchPath(p.x + shelfLen(p) + (p.depth === 0 ? F.trunk : 0), p.shelf, n.x, n.shelf, w0, w1, shelfLen(n), w2, 0.55)}" fill="${hue}" fill-opacity="${op}"/>`);
    }
    for (const n of nodes) {
      const g = [`<g class="node" data-num="${n.num || 'root'}" data-depth="${n.depth}" transform="translate(${n.x},${n.top.toFixed(1)})">`];
      for (const Ln of n.lines) g.push(`<text x="0" y="${Ln.y.toFixed(1)}" font-size="${Ln.size}" font-family="${Ln.weight === 'M' ? 'ApfelMittel' : 'ApfelRegular'}" fill="${Ln.color}">${esc(Ln.t)}</text>`);
      if (n.hidden) {
        const hue = n.depth === 0 ? T.ink : T.hues[n.hueIndex % T.hues.length];
        const fs = moreSize(F, n);
        const last = n.lines[n.lines.length - 1];
        const sx = last.w + fs * 0.6, sy = last.y;
        g.push(`<text class="more" data-num="${n.num || 'root'}" x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" font-size="${fs}" font-family="ApfelMittel" fill="${hue}" style="cursor:pointer">${esc(n.moreLabel)}</text>`);
      }
      g.push('</g>');
      out.push(g.join(''));
    }
    out.push('</g></svg>');
    const minFont = Math.min(...nodes.flatMap(n => n.lines.map(l => l.size))) * s;
    return { svg: out.join('\n'), W, H, scale: s, minFont, floor: F.floor, mapW: L.mapW, mapH: L.mapH, nodeCount: nodes.length };
  }

  function overlaps(nodes) {
    const bad = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (a.x < b.x + b.w + b.moreW && b.x < a.x + a.w + a.moreW && a.top < b.top + b.h && b.top < a.top + a.h) bad.push([a.num || 'root', b.num || 'root']);
    }
    return bad;
  }

  return { parse, count, find, layout, draw, overlaps, makeMeasurer, THEMES, FORMATS, branchPath };
});
