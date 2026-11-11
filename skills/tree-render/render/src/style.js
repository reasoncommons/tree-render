// style.js: the parameter set of a static render (the options harness). A style is a JSON object merged
// over DEFAULT_STYLE: plain objects merge key by key; arrays and scalars replace. A style file may name
// a base with "extends" (a style name in the same folder, or a path).
//
// Per-depth values are a single value (all depths) or an array indexed by depth, root = 0; the last
// entry repeats for deeper levels. Branch and run values are indexed by the depth the branch LEAVES
// (entry 0 = the root's branches).
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_STYLE = {
  name: 'default',
  attach: {
    mode: 'side',          // side: branch ends at the text's left edge, first line's centre | side-mid: the block's centre | shelf: under the text
                           // | coggle: interior labels right-aligned on the branch that runs beneath them to a junction; leaves as side
    from: 'text-end',      // where a parent's branches start: text-end (its own block's right edge) | fan (a fan point shared by the column)
    gap: 10,               // px between a branch's end (or its dot) and the text's left edge, per depth arrived at
    startGap: 12,          // px between a text's right edge (or its anchor line's end, for a stem) and its outgoing branches, per depth
    fanGap: 24,            // px between the column's widest text and the fan point (fan), per depth
    stem: true,            // fan: draw a straight line from the text's end to the fan point
    stemWidth: null,       // px, per depth (null = the start width of the branches leaving that depth)
    fanDot: 0,             // radius of a dot at each fan point / branch start, per depth (0 = none)
    midline: 0.32,         // a line's visual centre sits midline × size above its baseline
    shelfLift: 0.26,       // shelf: the shelf runs shelfLift × last line size below the block
    shelfOver: 12,         // shelf: the shelf runs this far past the text's end
    labelGap: 4,           // coggle: px between an interior label's text box and the branch beneath (or above) it
    label: 'above',        // coggle: above (label always above its branch) | outside (above for nodes above their parent's junction, below for nodes below)
    notch: false,          // coggle: a chevron notch cut (in the background colour) at each junction
  },
  font: {
    size: [40, 32, 26],    // px per depth, or { base, ratio }: size(d) = base × ratio^d
    leadWeight: 'M',       // M (Mittel) | R (Regular), per depth
    plainWeight: 'R',      // weight of a node without a lead, per depth
    rootWeight: 'R',
    contScale: 0.85,       // continuation size ÷ lead size, per depth
    lineHeight: 1.25,      // per depth
    color: 'ink',          // lead / plain text colour per depth: ink | muted | branch | #hex
    contColor: null,       // continuation colour per depth (null = same as color)
    baseline: 0.78,        // baseline at 0.78 × size below the top of the line's ink box
    leadRunIn: 0,          // per depth; > 0: a lead no wider than leadRunIn × the wrap width shares its line with the
                           // start of the continuation ("Alignment Partly, and not yet…"); 0 = the continuation starts a new line
    halo: 0,               // px, per depth: a stroke in haloColor behind the text so a branch passing near never obscures it
    haloColor: null,       // null = colour.bg
  },
  wrap: {
    width: [320, 420, 440], // per depth, in px (unit px) or characters (unit ch)
    unit: 'px',            // px | ch (average characters) | em (× the depth's font size)
    maxLines: null,        // per depth; null = no limit (lead and continuation lines count together)
    ellipsis: true,        // past maxLines: cut with "…" (false: keep every line and warn)
    balance: true,         // balanced lines (CSS text-wrap: balance) rather than greedy
    balanceFloor: 0.72,
  },
  branch: {
    width: [[2.4, 1.3], [1.6, 0.9]], // per depth left: [start, end] or one number
    shape: 'cubic',        // cubic | bezier-s | elbow-rounded; this and k, kStart, kEnd, elbow, radius may be per depth left
    k: 0.5,                // cubic: control points at k × dx from each end
    kStart: 0.15,          // bezier-s: control point at kStart × dx from the start …
    kEnd: 0.6,             // … and kEnd × dx back from the end (bends early, lands flat)
    elbow: 0.35,           // elbow-rounded: the vertical run sits at elbow × dx
    radius: 14,            // elbow-rounded: corner radius
    fill: 'ribbon',        // ribbon (filled, tapered) | stroke (one width: start)
    opacity: 1,            // per depth left
    cap: 'round',          // round | butt | point (a chevron tip, ribbon only) | dot (a dot at the end, radius dotRadius)
    dotRadius: 4,          // per depth arrived at
    samples: 40,
    junctionCap: false,    // per depth left: a disc (radius = half the start width) in the branch colour at every branch start
    spine: false,          // per depth left, elbow-rounded only: one shared vertical spine per fan, leaves peeling off it
    weight: 0,             // per depth left: start width × (leaves in the subtree ÷ siblings' mean)^weight; 0 = off
    weightClamp: [0.75, 1.35], // bounds of that factor
  },
  colour: {
    bg: '#FFFFFF',
    ink: '#1B1916',
    muted: '#6E6A64',
    branchInk: null,       // branch colour when not coloured (null = ink)
    mode: 'accent',        // accent: ink plus one accent for nodes marked accent | palette: a colour per top-level branch
    accent: '#D7261E',
    palette: ['#E0533D', '#2C8C99', '#7BA23F', '#8E5BA6', '#D99A1E', '#3D6FB6'],
    textPalette: null,     // palette for text coloured "branch" (null = palette)
    inherit: true,         // deeper branches take their top-level branch's colour (false: branchInk)
    rootBranch: null,      // colour of the root's fan dot and stem (null = branchInk)
    accentInPalette: false, // palette mode: a top-level node marked accent (and its subtree) takes accent, not its palette slot
    accentText: null,      // text colour of that branch when text is coloured "branch" (null = accent)
  },
  root: {
    style: 'plain',        // plain | box
    fill: '#EDEDED',
    radius: 4,
    padX: 18,
    padY: 12,
    place: 'span',         // root's height: span (centre of its subtree) | mean (mean of its children's attach points) | middle (the middle child's)
    spine: 0,              // px; > 0: the root's trunks leave a vertical spine this long (cut to the children's span), in rootBranch
  },
  space: {
    canvas: 1760,          // px wide; the height fits the content
    margin: 72,            // px, or [top, right, bottom, left]
    run: [130, 110, 100],  // per depth left: px from a branch's start to its children's text
    sib: 0.55,             // gap between siblings, in line heights of the child level
    cousin: 1.3,           // gap between children of different parents, in line heights
    align: 'left',         // left | center: the map within the canvas
    fit: 'shrink',         // shrink: scale the map down if wider than the canvas | none
  },
  frame: {
    show: true,
    titleSize: 46, subtitleSize: 28, footerSize: 22,
    subtitleWrap: 1100,
    titleColor: 'ink', subtitleColor: 'muted', footerColor: 'muted',
    gap: 72,               // px between the header and the map, and the map and the footer
  },
};

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

// Deep merge: objects key by key, everything else replaced. Inputs are not changed.
export function mergeStyle(base, ...overs) {
  let out = structuredClone(base);
  for (const o of overs) out = merge2(out, o || {});
  return out;
}
function merge2(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (k === 'extends') continue;
    out[k] = isObj(v) && isObj(a[k]) ? merge2(a[k], v) : structuredClone(v);
  }
  return out;
}

// A style object (or file) resolved over the defaults, following "extends".
export function resolveStyle(style = {}, dir = process.cwd(), seen = new Set()) {
  const chain = [];
  let s = style, d = dir;
  while (s) {
    chain.unshift(s);
    if (!s.extends) break;
    const file = styleFile(s.extends, d);
    if (seen.has(file)) throw new Error(`style: "extends" loops at ${file}`);
    seen.add(file);
    s = JSON.parse(fs.readFileSync(file, 'utf8'));
    d = path.dirname(file);
  }
  return mergeStyle(DEFAULT_STYLE, ...chain);
}
function styleFile(ref, dir) {
  for (const f of [path.resolve(dir, ref), path.resolve(dir, ref + '.json'), path.join(STYLE_DIR, ref + '.json')]) if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  throw new Error(`style: cannot find "${ref}"`);
}
export const STYLE_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'styles');

export function loadStyle(file) {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!s.name) s.name = path.basename(file, '.json');
  return resolveStyle(s, path.dirname(path.resolve(file)));
}

// Value at depth d of a per-depth parameter (single value or array; last entry repeats).
export function at(v, d) {
  if (!Array.isArray(v)) return v;
  if (!v.length) return undefined;
  return v[Math.min(d, v.length - 1)];
}

export function fontSize(S, d) {
  const f = S.font.size;
  if (isObj(f)) return Math.round(f.base * Math.pow(f.ratio, d) * 10) / 10;
  return at(f, d);
}

export function weightOf(w) {
  const s = String(w || 'R').toLowerCase();
  return s === 'm' || s === 'mittel' || s === 'bold' || s === 'medium' ? 'M' : 'R';
}

export function branchWidths(S, d) {
  const w = at(S.branch.width, d);
  return Array.isArray(w) ? [w[0], w[1] != null ? w[1] : w[0]] : [w, w];
}

export function margins(S) {
  const m = S.space.margin;
  if (Array.isArray(m)) return { t: m[0], r: m[1] != null ? m[1] : m[0], b: m[2] != null ? m[2] : m[0], l: m[3] != null ? m[3] : (m[1] != null ? m[1] : m[0]) };
  return { t: m, r: m, b: m, l: m };
}
