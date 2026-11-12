// coggle/draw.js: a Coggle layout → SVG. Paint order as in Coggle: branches (each as tail, tip, line, then
// its children's branches), then the root box, then the text. Labels of nodes with children get Coggle's
// halo (CSS text-shadow 0 0 6px background, four times) so a branch passing under them stays readable.
import { branchPath, tailPath, tipPath, tailLength, rootShapePath, fmt } from './geometry.js';
import { EXACT } from './styles.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (v) => fmt(Math.round(v * 10000) / 10000);

export const PAD = 30;

// Four stacked 6 px text-shadows ≈ one Gaussian blur (σ 3) with alpha a → 1 − (1 − a)^4.
function haloFilter(bg) {
  const table = Array.from({ length: 11 }, (_, i) => +(1 - (1 - i / 10) ** 4).toFixed(4)).join(' ');
  return `<filter id="cg-halo" x="-50%" y="-100%" width="200%" height="300%" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b"/>` +
    `<feComponentTransfer in="b" result="b4"><feFuncA type="table" tableValues="${table}"/></feComponentTransfer>` +
    `<feFlood flood-color="${bg}"/><feComposite in2="b4" operator="in" result="h"/>` +
    `<feMerge><feMergeNode in="h"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

export function drawCoggle(L, { fontCSS = '', style = EXACT, bg = style.bg, pad = PAD } = {}) {
  const W = Math.ceil(L.bounds.w + 2 * pad), H = Math.ceil(L.bounds.h + 2 * pad);
  const ox = pad - L.bounds.x, oy = pad - L.bounds.y;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-style="${style.name}" data-root-x="${n2(ox)}" data-root-y="${n2(oy)}">`);
  if (L.title) out.push(`<title>${esc(L.title)}</title>`);
  out.push(`<defs><style>${fontCSS}text{font-family:${style.font.stack};font-kerning:normal}</style>${haloFilter(bg)}</defs>`);
  out.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`);
  out.push(`<g transform="translate(${n2(ox)},${n2(oy)})">`);

  // Branches, depth-first so a parent's line is painted before its children's.
  const byNode = new Map(L.branches.map(b => [b.node, b]));
  const paint = (r) => {
    for (const k of r.children) {
      const b = byNode.get(k), w = b.w;
      out.push(`<g class="branch" data-node="${esc(k.num)}">`);
      out.push(`<path d="${tailPath(w)}" transform="translate(${n2(b.from.x + 1 - tailLength(w))},${n2(b.from.y)})" fill="${b.colour}"/>`);
      out.push(`<path d="${tipPath(w - 0.3)}" transform="translate(${n2(b.to.x - 0.01)},${n2(b.to.y)})" fill="${b.colour}"/>`);
      out.push(`<path d="${branchPath(b.from, b.to)}" fill="none" stroke="${b.colour}" stroke-width="${n2(w)}" stroke-linejoin="round"/>`);
      out.push(`</g>`);
      paint(k);
    }
  };
  paint(L.root);

  // Root: Coggle's filled box, the box outlined, or (no box) a hairline rule where the branches leave.
  const R = L.root;
  if (R.rule) out.push(`<path class="root-rule" d="M ${n2(R.rule.x)} ${n2(-R.rule.h / 2)} V ${n2(R.rule.h / 2)}" stroke="${R.colour}" stroke-width="1"/>`);
  else if (R.shape.kind === 'outline') out.push(`<path class="root-box" d="${rootShapePath(R.shape.w, R.shape.h)}" fill="${bg}" stroke="${R.colour}" stroke-width="1"/>`);
  else out.push(`<path class="root-box" d="${rootShapePath(R.shape.w, R.shape.h)}" fill="${R.colour}"/>`);

  // Text.
  for (const r of L.nodes) {
    const t = r.text, lh = r.t.lineHeight;
    const anchor = t.align === 'right' ? 'end' : t.align === 'center' ? 'middle' : 'start';
    const x = t.align === 'right' ? t.x + t.w : t.align === 'center' ? t.x + t.w / 2 : t.x;
    const halo = r.level > 0 && r.children.length ? ' filter="url(#cg-halo)"' : '';
    out.push(`<g class="label" data-node="${esc(r.num)}" fill="${r.textColour}" font-size="${r.t.size}"${halo}>`);
    r.t.lines.forEach((ln, i) => {
      const y = t.y + i * lh + r.t.baseline;
      const body = ln.segs.map(s => s.bold ? `<tspan font-weight="${style.font.boldWeight}">${esc(s.text)}</tspan>` : r.contColour ? `<tspan fill="${r.contColour}">${esc(s.text)}</tspan>` : `<tspan>${esc(s.text)}</tspan>`).join('');
      out.push(`<text x="${n2(x)}" y="${n2(y)}" text-anchor="${anchor}" xml:space="preserve">${body}</text>`);
    });
    out.push(`</g>`);
  }
  out.push(`</g></svg>`);
  return out.join('\n') + '\n';
}
