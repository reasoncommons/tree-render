// static-draw.js: static layout (static-layout.js) → SVG string. Fonts embedded through opts.fontCSS.
import { esc } from './draw.js';

const FAMILY = { R: 'ApfelRegular', M: 'ApfelMittel' };
const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f1 = v => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? '0' : String(r); };
const P = pts => pts.map(p => f1(p[0]) + ',' + f1(p[1]));

// Filled ribbon around a centre line, width w0 → w1 along its length; round caps add half-discs.
export function ribbonPath(pts, w0, w1, cap = 'round') {
  const n = pts.length, len = [0];
  for (let i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = len[n - 1] || 1;
  const up = [], dn = [];
  const normals = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    const w = (w0 + (w1 - w0) * len[i] / total) / 2;
    normals.push([nx, ny, dx / l, dy / l, w]);
    up.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    dn.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  const ring = [...up];
  if (cap === 'round') {
    const [nx, ny, tx, ty, w] = normals[n - 1], [cx, cy] = pts[n - 1];
    for (let k = 1; k < 8; k++) { const a = Math.PI * k / 8; ring.push([cx + w * (nx * Math.cos(a) + tx * Math.sin(a)), cy + w * (ny * Math.cos(a) + ty * Math.sin(a))]); }
  }
  if (cap === 'point') {
    const [, , tx, ty, w] = normals[n - 1], [cx, cy] = pts[n - 1];
    ring.push([cx + tx * w * 1.4, cy + ty * w * 1.4]);
  }
  ring.push(...dn.reverse());
  if (cap === 'round') {
    const [nx, ny, tx, ty, w] = normals[0], [cx, cy] = pts[0];
    for (let k = 1; k < 8; k++) { const a = Math.PI * k / 8; ring.push([cx - w * (nx * Math.cos(a) + tx * Math.sin(a)), cy - w * (ny * Math.cos(a) + ty * Math.sin(a))]); }
  }
  return 'M' + P(ring).join('L') + 'Z';
}

export function drawStatic(L, opts = {}) {
  const S = L.style, C = S.colour, B = S.branch;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}" font-family="${FAMILY.R}" xml:space="preserve" role="img" data-style="${esc(S.name || '')}">`);
  out.push(`<title>${escText(L.title)}</title>`);
  if (L.alt) out.push(`<desc>${escText(L.alt)}</desc>`);
  out.push(`<metadata id="tree-render-style">${escText(JSON.stringify(S))}</metadata>`);
  if (opts.fontCSS) out.push(`<style>${opts.fontCSS}</style>`);
  out.push(`<rect width="${L.W}" height="${L.H}" fill="${C.bg}"/>`);
  for (const l of L.header) out.push(`<text class="${l.cls}" x="${f1(l.x)}" y="${f1(l.y)}" font-size="${l.size}" fill="${l.color}">${escText(l.t)}</text>`);
  if (L.footer) out.push(`<text class="footer" x="${f1(L.footer.x)}" y="${f1(L.footer.y)}" font-size="${L.footer.size}" fill="${L.footer.color}" text-anchor="end">${escText(L.footer.t)}</text>`);
  out.push(`<g class="map" transform="translate(${f1(L.ox)},${f1(L.oy)})${L.scale !== 1 ? ` scale(${+L.scale.toFixed(4)})` : ''}">`);

  const op = o => (o != null && o < 1 ? ` opacity="${o}"` : '');
  const capEnd = B.cap === 'round' ? 'round' : 'butt';
  // shallow branches first, so deeper ones lie on top
  for (const g of [...L.branches].sort((a, b) => a.depth - b.depth)) {
    if (B.fill === 'stroke') out.push(`<path class="branch" data-num="${esc(g.num)}" d="M${P(g.points).join('L')}" fill="none" stroke="${g.colour}" stroke-width="${f1(g.w0)}" stroke-linecap="${capEnd}" stroke-linejoin="round"${op(g.opacity)}/>`);
    else out.push(`<path class="branch" data-num="${esc(g.num)}" d="${ribbonPath(g.points, g.w0, g.w1, B.cap === 'round' || B.cap === 'point' ? B.cap : 'butt')}" fill="${g.colour}"${op(g.opacity)}/>`);
  }
  for (const s of L.shelves) out.push(`<path class="shelf" data-num="${esc(s.num)}" d="M${f1(s.x0)},${f1(s.y - s.w / 2)}H${f1(s.x1 - s.w / 2)}a${f1(s.w / 2)},${f1(s.w / 2)} 0 0 1 0,${f1(s.w)}H${f1(s.x0)}Z" fill="${s.colour}"${op(s.opacity)}/>`);
  for (const s of L.stems) out.push(`<line class="stem" data-num="${esc(s.num)}" x1="${f1(s.x0)}" y1="${f1(s.y)}" x2="${f1(s.x1)}" y2="${f1(s.y)}" stroke="${s.colour}" stroke-width="${f1(s.w)}"/>`);
  for (const c of L.notches || []) out.push(`<path class="notch" data-num="${esc(c.num)}" d="M${f1(c.x - c.s * 0.35)},${f1(c.y - c.s * 0.75)}L${f1(c.x + c.s * 0.15)},${f1(c.y)}L${f1(c.x - c.s * 0.35)},${f1(c.y + c.s * 0.75)}" fill="none" stroke="${c.colour}" stroke-width="${f1(Math.max(1.5, c.s * 0.16))}" stroke-linejoin="miter"/>`);
  for (const d of L.dots) out.push(`<circle class="dot ${d.kind}" cx="${f1(d.x)}" cy="${f1(d.y)}" r="${f1(d.r)}" fill="${d.colour}"/>`);
  for (const n of L.nodes) {
    const g = [`<g class="node" data-num="${esc(n.num)}" data-depth="${n.depth}" transform="translate(${f1(n.tx)},${f1(n.ty)})">`];
    if (n.box) g.push(`<rect class="root-box" x="${f1(-n.padX)}" y="${f1(-n.padY)}" width="${f1(n.w)}" height="${f1(n.h)}" rx="${S.root.radius}" fill="${S.root.fill}"/>`);
    for (const l of n.lines) g.push(`<text x="${f1(l.dx || 0)}" y="${f1(l.y)}" font-size="${l.size}"${l.weight === 'M' ? ` font-family="${FAMILY.M}"` : ''} fill="${l.color}">${escText(l.t)}</text>`);
    g.push('</g>');
    out.push(g.join(''));
  }
  out.push('</g>', '</svg>');
  return out.join('\n') + '\n';
}
