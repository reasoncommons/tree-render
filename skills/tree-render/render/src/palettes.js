// palettes.js: named colour worlds for the coggle styles and the styles2 styles (--palette <name>).
// Without a palette every style keeps its own colours. A palette gives:
//   bg         background (also the halo behind labels)
//   branches   level-1 branch colours, cycled over the level-1 nodes that are not the accent
//   walk       children's colour: true = Coggle's random walk from the parent, false = the parent's colour
//   accent     the accent branch (the level-1 node marked `accent`, else the first starting "So") and its subtree
//   text       'ink': all text in `ink`; 'darken': Coggle's darken of the branch colour (styles2: level-1 leads only).
//              Either way text is darkened until it reads at MIN_CONTRAST on bg; the accent branch's text is the
//              accent colour itself, darkened only if needed
//   ink        plain text colour; muted: secondary text (styles2 level-2 points); hairline: thin connectors (styles2)
//   root       fill: the root box fill (coggle-exact, styles2 --root-box); outline: the root box stroke
//              (coggle-thin) or rule; text: the root's text colour
// The wise-* palettes follow the Wisdom and AI site (ai-wise/site/custom.css: paper #fbfaf6, ink #1b1916, muted
// #5d584f) and its Yoshitoshi woodblock: sumi ink, verdigris and celadon, ochre, madder, a seal-red accent.
import { contrast, toHsl, fromHsl, darken } from './coggle/colour.js';

export const MIN_CONTRAST = 4.5;

const SITE = { bg: '#fbfaf6', ink: '#1b1916', muted: '#5d584f', hairline: '#8c8479', accent: '#c8372d', root: { fill: '#ece7dc', outline: '#5d584f', text: '#1b1916' } };

export const PALETTES = {
  // Sumi ink on paper, one seal-red branch.
  'wise-ink': { ...SITE, branches: ['#2b2724'], walk: false, text: 'ink' },
  // The woodblock's colours, muted: deep verdigris, celadon, ochre, sumi grey, madder.
  'wise-print': { ...SITE, branches: ['#3d6f78', '#5f978f', '#a87b42', '#6b625a', '#9c4a3f'], walk: false, text: 'darken' },
};
export const PALETTE_NAMES = Object.keys(PALETTES);

export function getPalette(name) {
  if (name == null) return null;
  const p = PALETTES[name];
  if (!p) throw new Error(`unknown palette "${name}" (have: ${PALETTE_NAMES.join(', ')})`);
  return p;
}

// `hex` darkened (lightness down, same hue) until it reads at `min` on `bg`.
export function ensureContrast(hex, bg, min = MIN_CONTRAST) {
  const c = toHsl(hex);
  let out = hex;
  while (contrast(out, bg) < min && c.l > 0.01) { c.l -= 0.01; out = fromHsl(c); }
  return out;
}

// The level-1 colours for `n` nodes with the accent at index `acc` (-1: none): the accent colour there, the
// palette's branch colours cycled over the rest.
export function levelOneColours(P, n, acc) {
  let k = 0;
  return Array.from({ length: n }, (_, i) => i === acc ? P.accent : P.branches[k++ % P.branches.length]);
}

// Text colour for a node whose branch colour is `branch`; `accent`: the node is in the accent branch.
export function paletteText(P, branch, { accent = false } = {}) {
  if (accent) return ensureContrast(P.accent, P.bg);
  if (P.text === 'darken') return ensureContrast(darken(branch), P.bg);
  return ensureContrast(P.ink, P.bg);
}
