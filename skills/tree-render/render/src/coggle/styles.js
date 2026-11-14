// coggle/styles.js: coggle-exact and its "elegant" variants (docs/plans/2026-11-11-revision.md, "Third revision").
// Each variant is a few deltas from coggle-exact on the same engine: the S-curve geometry, a colour per
// root branch and text in a darker shade of its branch all stay. What a style can set:
//   font          (our layout) family, files (regular + the weight the lead uses), boldWeight, CSS stack; optional mono
//                 { family, file, stack, sizeDelta }: leaves and the text after a bold lead in that face
//   leadBreak     a bold lead sits on its own line(s), the rest starts on the next line (off in all styles:
//                 it left dangling words, e.g. "Alignment: a shot in the / dark"; kept as an option)
//   sizes         font size by level (root, 1, 2, 3+)
//   rootSize      root font size in our own (collision-free) layout; Coggle's own layout (avoidCollisions:
//                 false, the pinned comparison) keeps sizes[0]. null: sizes[0] everywhere
//   branch        width: Coggle's width × scale, at least min
//   colour        branch colours: saturation × s, lightness × l (text colours follow, via Coggle's darken)
//   cont          colour of the text after a bold lead: null = same as the lead, else the lead's text colour
//                 with saturation × s and lightness × l
//   bg            background (also the halo behind interior labels)
//   root          chevrons (Coggle's little pointers on the box; on in coggle-exact and coggle-thin, off in the rest);
//                 kind: 'box' (Coggle's box, filled) | 'outline' (the box, stroked) | 'rule' (no box,
//                 a hairline to the right of the text); colour (fill, or stroke); bold (root text in the lead weight)
//   spacing       overrides for layout.js SPACING (ySpace, leafX, …)
//   wrap          overrides for layout.js TALL wrap widths: { interior, leaf }; scale: × AVOID.wraps (the narrower
//                 interior wraps collision avoidance tries)
//   root.stroke   outline width for kind 'outline'
import { ARIMO, FONT_SIZES } from './text.js';
import { ROOT_COLOUR, BG } from './colour.js';
import { TALL } from './layout.js';

export const PLEX = { family: 'IBM Plex Sans', files: { regular: 'IBMPlexSans-Regular.woff', bold: 'IBMPlexSans-SemiBold.woff' }, boldWeight: 600, stack: "'IBM Plex Sans', Helvetica, Arial, sans-serif" };
// Plex Sans for the root and bold leads, Plex Mono (1 px smaller: it runs wide) for the rest.
const PLEX_MONO = { ...PLEX, mono: { family: 'IBM Plex Mono', file: 'IBMPlexMono-Regular.woff', stack: "'IBM Plex Mono', Menlo, Consolas, monospace", sizeDelta: 1 } };
const SOURCE_SANS = { family: 'Source Sans 3', files: { regular: 'SourceSans3-Regular.woff', bold: 'SourceSans3-Bold.woff' }, boldWeight: 700, stack: "'Source Sans 3', Helvetica, Arial, sans-serif" };
const SOURCE_SERIF = { family: 'Source Serif 4', files: { regular: 'SourceSerif4-Regular.woff', bold: 'SourceSerif4-Semibold.woff' }, boldWeight: 600, stack: "'Source Serif 4', Georgia, serif" };

// Fonts for --font (2026-11-13 comparison on coggle-exact): static files, the "bold" being the lead's weight.
export const ATKINSON = { family: 'Atkinson Hyperlegible Next', files: { regular: 'AtkinsonHyperlegibleNext-Regular.woff', bold: 'AtkinsonHyperlegibleNext-Bold.woff' }, boldWeight: 700, stack: "'Atkinson Hyperlegible Next', Verdana, Helvetica, Arial, sans-serif" };
export const BRICOLAGE = { family: 'Bricolage Grotesque', files: { regular: 'BricolageGrotesque-Regular.woff', bold: 'BricolageGrotesque-SemiBold.woff' }, boldWeight: 600, stack: "'Bricolage Grotesque', Helvetica, Arial, sans-serif" };
export const MERRIWEATHER = { family: 'Merriweather', files: { regular: 'Merriweather-Regular.woff', bold: 'Merriweather-Bold.woff' }, boldWeight: 700, stack: "Merriweather, Georgia, 'Times New Roman', serif" };
// Monospace and duospace for the whole tree (2026-11-13). They run wide, so a wrap holds fewer characters; widths are
// measured from the fonts, as for the rest.
export const PLEXMONO = { family: 'IBM Plex Mono', files: { regular: 'IBMPlexMono-Regular.woff', bold: 'IBMPlexMono-SemiBold.woff' }, boldWeight: 600, stack: "'IBM Plex Mono', Menlo, Consolas, monospace" };
export const QUATTRO = { family: 'iA Writer Quattro', files: { regular: 'iAWriterQuattroS-Regular.ttf', bold: 'iAWriterQuattroS-Bold.ttf' }, boldWeight: 700, stack: "'iA Writer Quattro', 'IBM Plex Sans', Helvetica, Arial, sans-serif" };
export const FONTS = { arimo: ARIMO, plex: PLEX, atkinson: ATKINSON, bricolage: BRICOLAGE, merriweather: MERRIWEATHER, plexmono: PLEXMONO, quattro: QUATTRO };

export const EXACT = {
  name: 'coggle-exact',
  font: ARIMO, // Coggle's font; Bricolage only on request (--font bricolage), Rufus 2026-11-14
  sizes: FONT_SIZES,
  rootSize: 22, // 2026-11-12: Coggle's 17 px root read too small next to the branches
  branch: { scale: 1, min: 2 },
  colour: { s: 1, l: 1 },
  cont: null,
  leadBreak: false,
  bg: BG,
  root: { kind: 'box', colour: ROOT_COLOUR, bold: false, chevrons: true },
  spacing: {},
};

// Variants draw the root without chevrons unless they say otherwise.
const variant = (name, d) => ({ ...EXACT, ...d, name, root: { ...EXACT.root, chevrons: false, ...d.root } });

const THIN = variant('coggle-thin', {
  font: PLEX,
  branch: { scale: 0.5, min: 1.5 },
  colour: { s: 1, l: 0.85 },
  root: { kind: 'outline', colour: '#555555', stroke: 1.5, chevrons: true },
  spacing: { ySpace: 20, leafX: 70 },
});

export const COGGLE_STYLES = {
  'coggle-exact': EXACT,
  // Tufte, least ink: thin lines, a little more air, the root only outlined. (Was coggle-hairline.)
  'coggle-thin': THIN,
  // coggle-thin with leaves and the text after each bold lead in IBM Plex Mono, 1 px smaller, wrapped a little wider.
  // Not a candidate (2026-11-12: switching just some words to mono does not work); kept for reference.
  'coggle-thin-mono': variant('coggle-thin-mono', { ...THIN, font: PLEX_MONO, wrap: { leaf: 320 } }),
  // No longer candidates (2026-11-12), kept for reference:
  // FT / Economist graphics desk: a sturdier sans, slightly muted colour, the root set bold without a box.
  'coggle-broadsheet': variant('coggle-broadsheet', {
    font: SOURCE_SANS,
    sizes: [18, 15.5, 13, 12],
    rootSize: null,
    branch: { scale: 0.85, min: 2 },
    colour: { s: 0.9, l: 1 },
    root: { kind: 'rule', colour: '#8a8a8a', bold: true },
  }),
  // Book typography on warm paper: a text serif, Coggle's palette and S-curves at lighter weight, a warm root box.
  'coggle-letterpress': variant('coggle-letterpress', {
    font: SOURCE_SERIF,
    sizes: [18, 16, 14, 13],
    rootSize: null,
    branch: { scale: 0.55, min: 1.5 },
    wrap: { interior: 280 },
    bg: '#fbf9f4',
    cont: { s: 0.8, l: 0.7 },
    root: { kind: 'box', colour: '#e6dccb' },
  }),
};

export const COGGLE_ALIASES = { 'coggle-hairline': 'coggle-thin' };
export const COGGLE_STYLE_NAMES = [...Object.keys(COGGLE_STYLES), ...Object.keys(COGGLE_ALIASES)];

export function coggleStyle(name = 'coggle-exact') {
  const s = COGGLE_STYLES[COGGLE_ALIASES[name] || name];
  if (!s) throw new Error(`unknown coggle style "${name}" (have: ${COGGLE_STYLE_NAMES.join(', ')})`);
  return s;
}

// A style with its font and/or sizes overridden (--font, --sizes). `font`: a key of FONTS. `sizes`: [root, level 1,
// level 2, level 3+]. The root size becomes rootSize (our layout; sizes[0] stays the style's own, the reference the
// root wrap and root box padding scale from); the rest set the levels. With sizes overridden the interior and leaf
// wrap widths grow (or shrink) with level 1 and level 2 relative to Coggle's 15.3 and 13, so bigger text keeps about
// the same number of words per line (and so do the narrower wraps collision avoidance tries). With neither given the style comes back unchanged.
export function withOverrides(style, { font, sizes } = {}) {
  if (!font && !sizes) return style;
  const out = { ...style };
  if (font) {
    out.font = FONTS[font];
    if (!out.font) throw new Error(`unknown font "${font}" (have: ${Object.keys(FONTS).join(', ')})`);
  }
  if (sizes) {
    if (sizes.length !== 4 || !sizes.every(v => Number.isFinite(v) && v > 0)) throw new Error('sizes: four positive numbers (root, level 1, level 2, level 3+)');
    out.sizes = [style.sizes[0], ...sizes.slice(1)];
    out.rootSize = sizes[0];
    out.wrap = {
      scale: sizes[1] / FONT_SIZES[1], // the narrower interior wraps collision avoidance tries
      interior: Math.round((style.wrap?.interior ?? TALL.interiorWrap) * sizes[1] / FONT_SIZES[1]),
      leaf: Math.round((style.wrap?.leaf ?? TALL.leafWrap) * sizes[2] / FONT_SIZES[2]),
    };
  }
  return out;
}
