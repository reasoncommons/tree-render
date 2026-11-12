// coggle/styles.js: coggle-exact and its "elegant" variants (docs/plans/2026-11-11-revision.md, "Third revision").
// Each variant is a few deltas from coggle-exact on the same engine: the S-curve geometry, a colour per
// root branch and text in a darker shade of its branch all stay. What a style can set:
//   font          family, files (regular + the weight the lead uses), boldWeight, CSS stack
//   sizes         font size by level (root, 1, 2, 3+)
//   branch        width: Coggle's width × scale, at least min
//   colour        branch colours: saturation × s, lightness × l (text colours follow, via Coggle's darken)
//   cont          colour of the text after a bold lead: null = same as the lead, else the lead's text colour
//                 with saturation × s and lightness × l
//   bg            background (also the halo behind interior labels)
//   root          kind: 'box' (Coggle's chevron box, filled) | 'outline' (the box, stroked) | 'rule' (no box,
//                 a hairline to the right of the text); colour (fill, or stroke); bold (root text in the lead weight)
//   spacing       overrides for layout.js SPACING (ySpace, leafX, …)
import { ARIMO, FONT_SIZES } from './text.js';
import { ROOT_COLOUR, BG } from './colour.js';

const PLEX = { family: 'IBM Plex Sans', files: { regular: 'IBMPlexSans-Regular.woff', bold: 'IBMPlexSans-SemiBold.woff' }, boldWeight: 600, stack: "'IBM Plex Sans', Helvetica, Arial, sans-serif" };
const SOURCE_SANS = { family: 'Source Sans 3', files: { regular: 'SourceSans3-Regular.woff', bold: 'SourceSans3-Bold.woff' }, boldWeight: 700, stack: "'Source Sans 3', Helvetica, Arial, sans-serif" };
const SOURCE_SERIF = { family: 'Source Serif 4', files: { regular: 'SourceSerif4-Regular.woff', bold: 'SourceSerif4-Semibold.woff' }, boldWeight: 600, stack: "'Source Serif 4', Georgia, serif" };

export const EXACT = {
  name: 'coggle-exact',
  font: ARIMO,
  sizes: FONT_SIZES,
  branch: { scale: 1, min: 2 },
  colour: { s: 1, l: 1 },
  cont: null,
  bg: BG,
  root: { kind: 'box', colour: ROOT_COLOUR, bold: false },
  spacing: {},
};

const variant = (name, d) => ({ ...EXACT, ...d, name, root: { ...EXACT.root, ...d.root } });

export const COGGLE_STYLES = {
  'coggle-exact': EXACT,
  // Tufte, least ink: thin lines, a little more air, the root only outlined.
  'coggle-hairline': variant('coggle-hairline', {
    font: PLEX,
    branch: { scale: 0.5, min: 1.5 },
    colour: { s: 1, l: 0.85 },
    root: { kind: 'outline', colour: '#9a9a9a' },
    spacing: { ySpace: 20, leafX: 70 },
  }),
  // FT / Economist graphics desk: a sturdier sans, muted colour, the root set bold without a box.
  'coggle-broadsheet': variant('coggle-broadsheet', {
    font: SOURCE_SANS,
    sizes: [18, 15.5, 13, 12],
    branch: { scale: 0.85, min: 2 },
    colour: { s: 0.8, l: 1 },
    root: { kind: 'rule', colour: '#8a8a8a', bold: true },
  }),
  // Book typography on warm paper: a text serif, Coggle's palette and geometry, a warm root box.
  'coggle-letterpress': variant('coggle-letterpress', {
    font: SOURCE_SERIF,
    sizes: [18, 16, 14, 13],
    bg: '#fbf9f4',
    cont: { s: 0.8, l: 0.7 },
    root: { kind: 'box', colour: '#e6dccb' },
  }),
};

export const COGGLE_STYLE_NAMES = Object.keys(COGGLE_STYLES);

export function coggleStyle(name = 'coggle-exact') {
  const s = COGGLE_STYLES[name];
  if (!s) throw new Error(`unknown coggle style "${name}" (have: ${COGGLE_STYLE_NAMES.join(', ')})`);
  return s;
}
