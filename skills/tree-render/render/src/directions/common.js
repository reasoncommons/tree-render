// directions/common.js: shared helpers for the six diagram-direction mock-ups (scripts/directions.js).
// Every direction is set in IBM Plex Sans (Regular 400 + SemiBold 600, embedded), measured with the real
// font metrics, and drawn on a Canvas that tracks every text line box and every stroke so the result can
// be checked for overlaps (no line may run under or through text) and cropped to its own bounds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

export const FONT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'fonts');
export const FAMILY = 'IBM Plex Sans';
export const STACK = "'IBM Plex Sans', Helvetica, Arial, sans-serif";
const FILES = { 400: 'IBMPlexSans-Regular.woff', 600: 'IBMPlexSans-SemiBold.woff' };

const load = (f) => { const b = fs.readFileSync(path.join(FONT_DIR, f)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
let FONTS = null;
function fonts() {
  if (FONTS) return FONTS;
  const regular = load(FILES[400]), bold = load(FILES[600]);
  const u = regular.unitsPerEm, h = regular.tables.hhea, os2 = regular.tables.os2;
  FONTS = { 400: regular, 600: bold, asc: h.ascender / u, desc: Math.abs(h.descender) / u, xHeight: os2.sxHeight / u, capHeight: os2.sCapHeight / u };
  return FONTS;
}
export const metrics = () => { const f = fonts(); return { asc: f.asc, desc: f.desc, xHeight: f.xHeight, capHeight: f.capHeight }; };

export function fontCSS() {
  return Object.entries(FILES).map(([w, f]) =>
    `@font-face{font-family:'${FAMILY}';font-weight:${w};src:url(data:font/woff;base64,${fs.readFileSync(path.join(FONT_DIR, f)).toString('base64')}) format('woff');}`).join('');
}

const widthCache = new Map();
export function measure(text, size, weight = 400) {
  const key = weight + '|' + text;
  let w = widthCache.get(key);
  if (w == null) {
    const f = fonts()[weight];
    w = text ? f.getAdvanceWidth(text, f.unitsPerEm, { kerning: true }) / f.unitsPerEm : 0;
    widthCache.set(key, w);
  }
  return w * size;
}

// A node's runs: the lead (weight 600, role 'lead') then the continuation (400, 'cont'); or the whole text.
// `leadOnly` keeps just the lead; `weight` overrides the plain-text weight (e.g. a bold root).
export function runsFor(node, { leadOnly = false, weight = 400 } = {}) {
  if (node.lead) return [{ text: typo(node.lead), weight: 600, role: 'lead' }, ...(node.cont && !leadOnly ? [{ text: typo(node.cont), weight: 400, role: 'cont' }] : [])];
  return [{ text: typo(node.text), weight, role: weight === 600 ? 'lead' : 'cont' }];
}

// Typographer's apostrophes and quotes.
export const typo = (s) => s.replace(/(\w)'/g, '$1\u2019').replace(/'(\w)/g, '\u2018$1').replace(/"(\w)/g, '\u201c$1').replace(/(\S)"/g, '$1\u201d');

// Greedy word wrap of runs at `size` into lines of at most maxWidth px. `leading` is the line height as a
// multiple of the size (or `lineHeight` in px, e.g. to sit on a baseline grid). Returns a text block:
//   { lines: [{ segs: [{ text, weight, role }], w }], w, h, size, lh, base }
// where `base` is the first baseline below the block top (half the leading, then the ascent).
export function block(runs, size, maxWidth, { leading = 1.3, lineHeight } = {}) {
  const { asc, desc } = fonts();
  const words = [];
  runs.forEach(r => r.text.split(/\s+/).filter(Boolean).forEach(t => words.push({ text: t, weight: r.weight, role: r.role })));
  const lineW = (ws) => ws.reduce((s, w, i) => s + (i ? measure(' ', size, w.weight) : 0) + measure(w.text, size, w.weight), 0);
  const lines = [];
  let cur = [];
  for (const w of words) {
    if (cur.length && lineW([...cur, w]) > maxWidth) { lines.push(cur); cur = []; }
    cur.push(w);
  }
  if (cur.length) lines.push(cur);
  const lh = lineHeight ?? Math.round(size * leading);
  const out = lines.map(ws => {
    const segs = [];
    ws.forEach((w, i) => {
      const piece = (i ? ' ' : '') + w.text, last = segs[segs.length - 1];
      if (last && last.weight === w.weight && last.role === w.role) last.text += piece; else segs.push({ text: piece, weight: w.weight, role: w.role });
    });
    return { segs, w: lineW(ws) };
  });
  return { lines: out, w: Math.max(0, ...out.map(l => l.w)), h: out.length * lh, size, lh, base: (lh - (asc + desc) * size) / 2 + asc * size };
}

// Baseline of line i of block b set with its top at `top`.
export const baselineOf = (b, top, i = 0) => top + b.base + i * b.lh;
// The vertical middle of the lower-case letters on line i (where a connector should meet the text).
export const xMiddleOf = (b, top, i = 0) => baselineOf(b, top, i) - fonts().xHeight * b.size / 2;
// The ink box of line i (cap height above the baseline, descenders below), for overlap checks.
const inkBox = (b, top, i, x0, x1) => ({ x0, x1, y0: baselineOf(b, top, i) - 0.74 * b.size, y1: baselineOf(b, top, i) + 0.22 * b.size });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (v) => +v.toFixed(2);

// A drawing surface in free coordinates. Elements are SVG strings; text lines and strokes are also kept as
// geometry, so toSVG can crop to the content and check() can find text colliding with text or with ink.
export class Canvas {
  constructor({ bg = '#ffffff' } = {}) { this.bg = bg; this.els = []; this.texts = []; this.strokes = []; this.blockId = 0; }

  // Draws block b with its top at `top`. align: 'start' (x is the left edge), 'end' (x is the right edge) or
  // 'middle'. style: { lead: { fill }, cont: { fill }, family? }. Returns the block's box.
  text(b, x, top, { align = 'start', lead = { fill: '#000' }, cont = { fill: '#444' }, extra = '' } = {}) {
    const id = this.blockId++;
    const anchor = align === 'end' ? 'end' : align === 'middle' ? 'middle' : 'start';
    b.lines.forEach((ln, i) => {
      const y = baselineOf(b, top, i);
      const tspans = ln.segs.map(s => {
        const st = s.role === 'lead' ? lead : cont;
        return `<tspan font-weight="${s.weight}" fill="${st.fill}">${esc(s.text)}</tspan>`;
      }).join('');
      this.els.push(`<text x="${n(x)}" y="${n(y)}" font-size="${b.size}" text-anchor="${anchor}"${extra}>${tspans}</text>`);
      const x0 = align === 'end' ? x - ln.w : align === 'middle' ? x - ln.w / 2 : x;
      this.texts.push({ ...inkBox(b, top, i, x0, x0 + ln.w), id });
    });
    const x0 = align === 'end' ? x - b.w : align === 'middle' ? x - b.w / 2 : x;
    return { x0, x1: x0 + b.w, y0: top, y1: top + b.h };
  }

  // A plain string of text (numbers, labels) at a baseline.
  label(str, x, y, size, { weight = 400, fill = '#000', align = 'start', extra = '' } = {}) {
    const w = measure(str, size, weight), anchor = align === 'end' ? 'end' : align === 'middle' ? 'middle' : 'start';
    this.els.push(`<text x="${n(x)}" y="${n(y)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${extra}>${esc(str)}</text>`);
    const x0 = align === 'end' ? x - w : align === 'middle' ? x - w / 2 : x;
    this.texts.push({ x0, x1: x0 + w, y0: y - 0.74 * size, y1: y + 0.22 * size, id: this.blockId++ });
  }

  // A polyline stroke.
  line(pts, { stroke = '#222', width = 1, opacity = 1, cap = 'butt' } = {}) {
    const d = 'M ' + pts.map(p => `${n(p.x)} ${n(p.y)}`).join(' L ');
    this.els.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="${cap}"${opacity < 1 ? ` stroke-opacity="${opacity}"` : ''}/>`);
    this.strokes.push({ pts, width });
  }

  // Any path, with `pts` a polyline sampling of it (for bounds and checks). fill: a filled shape.
  path(d, pts, { stroke = 'none', width = 0, fill = 'none', opacity = 1 } = {}) {
    this.els.push(`<path d="${d}" fill="${fill}" stroke="${stroke}"${width ? ` stroke-width="${width}"` : ''}${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`);
    this.strokes.push({ pts, width: width || 1 });
  }

  rect(x, y, w, h, fill) {
    this.els.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"/>`);
    this.strokes.push({ pts: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }], width: 0 });
  }

  circle(cx, cy, r, { stroke = 'none', width = 0, fill = 'none' } = {}) {
    this.els.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}" stroke="${stroke}"${width ? ` stroke-width="${width}"` : ''}/>`);
    const pts = Array.from({ length: 49 }, (_, i) => ({ x: cx + r * Math.cos(i / 48 * 2 * Math.PI), y: cy + r * Math.sin(i / 48 * 2 * Math.PI) }));
    this.strokes.push({ pts, width: width || 1 });
  }

  // Moves the most recently drawn element back to position `at` (a value of `mark()`), so it sits under
  // what was drawn after that mark.
  mark() { return this.els.length; }
  lower(at) { this.els.splice(at, 0, this.els.pop()); }

  bounds() {
    const xs = [], ys = [];
    for (const t of this.texts) { xs.push(t.x0, t.x1); ys.push(t.y0 - 0.1 * (t.y1 - t.y0), t.y1); }
    for (const s of this.strokes) for (const p of s.pts) { xs.push(p.x - s.width / 2, p.x + s.width / 2); ys.push(p.y - s.width / 2, p.y + s.width / 2); }
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  }

  // Overlaps: text lines of different blocks whose ink boxes intersect, and strokes passing through a line's
  // ink box (shrunk by `slack` px). Returns a list of human-readable problems.
  check({ slack = 1 } = {}) {
    const issues = [];
    const T = this.texts;
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
      const a = T[i], b = T[j];
      if (a.id !== b.id && a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) issues.push(`text overlaps text at (${n(a.x0)}, ${n(a.y0)}) / (${n(b.x0)}, ${n(b.y0)})`);
    }
    for (const s of this.strokes) {
      if (!s.width) continue;
      for (let k = 1; k < s.pts.length; k++) {
        const p = s.pts[k - 1], q = s.pts[k];
        for (const t of T) {
          if (segHitsBox(p, q, { x0: t.x0 + slack, x1: t.x1 - slack, y0: t.y0 + slack, y1: t.y1 - slack })) { issues.push(`stroke crosses text at (${n(t.x0)}, ${n(t.y0)})`); break; }
        }
      }
    }
    return [...new Set(issues)];
  }

  toSVG({ pad = 40, title = '' } = {}) {
    const b = this.bounds();
    const w = Math.ceil(b.x1 - b.x0 + 2 * pad), h = Math.ceil(b.y1 - b.y0 + 2 * pad);
    const tx = n(pad - b.x0), ty = n(pad - b.y0);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"${title ? ` aria-label="${esc(title)}"` : ''}>` +
      `<style>${fontCSS()}text{font-family:${STACK};font-kerning:normal}</style>` +
      `<rect width="100%" height="100%" fill="${this.bg}"/>` +
      `<g transform="translate(${tx} ${ty})">${this.els.join('')}</g></svg>`;
  }
}

// Liang–Barsky: does segment pq cross the box?
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

// Points along a cubic Bézier.
export function sampleCubic(p0, p1, p2, p3, k = 24) {
  return Array.from({ length: k + 1 }, (_, i) => {
    const t = i / k, u = 1 - t;
    return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y };
  });
}
