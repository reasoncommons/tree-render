// draw.js: laid-out tree → SVG string (design spec section 2 and the frame of section 6).
// draw(L, { fontCSS, interactive }) where L = layout(…). No Node or DOM APIs, so the browser bundle
// uses the same module: in the page the fonts come from the page's own @font-face rules (fontCSS null).
// Colours come from the theme on L (themes.js); every number from the format on L (formats.js).
import { strokeAt } from './formats.js';
import { hueOf, textHueOf } from './themes.js';

const FAMILY = { R: 'ApfelRegular', M: 'ApfelMittel' };

export function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f1 = v => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? '0' : String(r); };

// Tapered S-curve ribbon from (x0, y0) to (x1, y1), then a straight shelf of length `shelf` with a round
// end. Width runs w0 → w1 along the curve; the shelf is w2 wide. k: control-point fraction of dx.
export function branchPath(x0, y0, x1, y1, w0, w1, shelf, w2, k = 0.55, N = 28) {
  const dx = x1 - x0;
  const c1x = x0 + dx * k, c2x = x1 - dx * k;
  const up = [], dn = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, mt = 1 - t;
    const x = mt * mt * mt * x0 + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * x1;
    const y = (mt * mt * mt + 3 * mt * mt * t) * y0 + (3 * mt * t * t + t * t * t) * y1;
    const dxt = 3 * mt * mt * (c1x - x0) + 6 * mt * t * (c2x - c1x) + 3 * t * t * (x1 - c2x);
    const dyt = 6 * mt * t * (y1 - y0);
    const len = Math.hypot(dxt, dyt) || 1;
    const nx = -dyt / len, ny = dxt / len;
    const w = (w0 + (w1 - w0) * t) / 2;
    up.push([x + nx * w, y + ny * w]);
    dn.push([x - nx * w, y - ny * w]);
  }
  if (shelf > 0) {
    const r = w2 / 2, ex = x1 + shelf - r;
    up.push([ex, y1 + r]);
    for (let i = 1; i < 6; i++) { const a = Math.PI / 2 - (Math.PI * i) / 6; up.push([ex + r * Math.cos(a), y1 + r * Math.sin(a)]); }
    dn.push([ex, y1 - r]);
  }
  const pts = up.concat(dn.reverse());
  return 'M' + pts.map(p => f1(p[0]) + ',' + f1(p[1])).join('L') + 'Z';
}

// Points [x, y] along the branch curve from (x0, y0) to (x1, y1) (layout and check use it).
export function curvePoints(x0, y0, x1, y1, k = 0.55, N = 28) {
  const dx = x1 - x0, c1x = x0 + dx * k, c2x = x1 - dx * k, pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, mt = 1 - t;
    pts.push([mt * mt * mt * x0 + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * x1, (mt * mt * mt + 3 * mt * mt * t) * y0 + (3 * mt * t * t + t * t * t) * y1]);
  }
  return pts;
}

// Geometry shared by draw and check: where each node's shelf runs and each branch starts and ends.
export function shelfLen(L, n) { return n.w + n.moreW + L.format.shelfOver + (n.shelfExtra || 0); }
export function branchGeometry(L, n) {
  const F = L.format, T = L.theme, p = n.parent;
  const sw = d => strokeAt(F, d) * T.strokeScale;
  const x0 = p.x + shelfLen(L, p) + (p.depth === 0 ? F.trunk : 0);
  return {
    x0, y0: p.shelf, x1: n.x, y1: n.shelf,
    w0: sw(n.depth - 1) * (n.depth === 1 ? F.taperRoot : F.taperDeep),
    w1: sw(n.depth), w2: sw(n.depth) * F.shelfTaper, shelf: shelfLen(L, n),
  };
}

// Render options and fold state, so an SVG can be re-rendered or opened as a state.
export function metadataOf(L) {
  const o = L.options || {};
  return {
    generator: 'tree-render', format: L.format.name, theme: L.theme.key, view: L.view, labels: L.labels,
    depth: o.depth, root: o.root || null, hue: o.hue == null ? null : o.hue, fold: o.fold || [], open: o.open || [],
    kickers: o.kickers, kicker: (o.frame && o.frame.kicker) || '', footer: (o.frame && o.frame.footer) || '',
    scale: Math.round(L.scale * 1000) / 1000, sizeScale: L.sizeScale || 1,
  };
}

export function draw(L, opts = {}) {
  const { nodes, theme: T, format: F, W, H, scale, ox, oy } = L;
  const M = F.margin;
  const sw = d => strokeAt(F, d) * T.strokeScale;
  const out = [];
  const title = L.title || (nodes[0] && nodes[0].src.text) || '';
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FAMILY.R}" xml:space="preserve" role="img" data-theme="${esc(T.key)}" data-format="${esc(F.name)}">`);
  out.push(`<title>${escText(title)}</title>`);
  out.push(`<metadata id="tree-render">${escText(JSON.stringify(metadataOf(L)))}</metadata>`);
  if (opts.fontCSS) out.push(`<style>${opts.fontCSS}</style>`);
  out.push(`<rect width="${W}" height="${H}" fill="${T.bg}"/>`);
  if (L.frame.kicker) out.push(`<text class="kicker" x="${M}" y="${f1(M + F.kicker * 0.9)}" font-size="${F.kicker}" fill="${T.muted}">${escText(L.frame.kicker)}</text>`);
  if (L.frame.footer) out.push(`<text class="footer" x="${W - M}" y="${f1(H - M + F.footer * 0.2)}" font-size="${F.footer}" fill="${T.muted}" text-anchor="end">${escText(L.frame.footer)}</text>`);
  out.push(`<g class="map" transform="translate(${f1(ox)},${f1(oy)}) scale(${+scale.toFixed(4)})">`);

  // ribbons first (shallow to deep, so deeper branches lie on top), then the text
  const byDepth = [...nodes].sort((a, b) => a.depth - b.depth);
  for (const n of byDepth) {
    if (n.depth === 0) {
      const w = sw(0), len = shelfLen(L, n) + F.trunk;
      out.push(`<path class="trunk" d="M${f1(n.x)},${f1(n.shelf - w / 2)}H${f1(n.x + len - w / 2)}a${f1(w / 2)},${f1(w / 2)} 0 0 1 0,${f1(w)}H${f1(n.x)}Z" fill="${T.ink}"/>`);
      continue;
    }
    const g = branchGeometry(L, n);
    const op = T.branchOpacity[Math.min(n.depth, T.branchOpacity.length - 1)];
    out.push(`<path class="branch" data-num="${esc(n.num)}" d="${branchPath(g.x0, g.y0, g.x1, g.y1, g.w0, g.w1, g.shelf, g.w2, F.curveK, F.ribbonSamples)}" fill="${hueOf(T, n.hueIndex)}"${op < 1 ? ` fill-opacity="${op}"` : ''}/>`);
  }
  for (const n of nodes) {
    const key = n.num || 'root';
    const g = [`<g class="node" data-num="${esc(key)}" data-depth="${n.depth}"${n.hidden ? ` data-hidden="${n.hidden}"` : ''} transform="translate(${f1(n.x)},${f1(n.top)})">`];
    if (opts.interactive && (n.children.length || n.hidden)) {
      const h0 = n.shelf - n.top + 4, h = Math.max(F.hitMin, h0);
      g.push(`<rect class="hit" x="-6" y="${f1(-(h - h0) / 2 - 2)}" width="${f1(n.w + n.moreW + 12)}" height="${f1(h)}" fill="transparent"/>`);
    }
    for (const ln of n.lines) g.push(`<text y="${f1(ln.y)}" font-size="${ln.size}"${ln.weight === 'M' ? ` font-family="${FAMILY.M}"` : ''} fill="${ln.color}">${escText(ln.t)}</text>`);
    if (n.hidden) {
      const fill = n.hueIndex < 0 ? T.ink : textHueOf(T, n.hueIndex);
      g.push(`<text class="more" x="${f1(n.moreX)}" y="${f1(n.moreY)}" font-size="${n.moreSize}" font-family="${FAMILY.M}" fill="${fill}">${escText(n.moreLabel)}</text>`);
    }
    g.push('</g>');
    out.push(g.join(''));
  }
  out.push('</g>', '</svg>');
  return out.join('\n') + '\n';
}

// The SVG with the base64 font data replaced by a stub (golden files, reports).
export function stripFonts(svg) { return svg.replace(/base64,[A-Za-z0-9+/=]+/g, 'base64,…'); }
