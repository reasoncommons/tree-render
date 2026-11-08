// themes.js: the theme table of the design spec, section 7. The only file a change of visual direction
// touches: colours, stroke factor, numbering and opacity by depth. Paper is the default (pending
// Rufus's pick).

export const DEFAULT_THEME = 'paper';

export const THEMES = {
  paper: {
    name: 'Paper',
    bg: '#FBF8F2', ink: '#1F1C18', muted: '#6F6962',
    hues: ['#C0583A', '#2F7F8B', '#7A8F3E', '#8B5A9E', '#B8862B', '#4D6BAA'],
    textHues: null,
    strokeScale: 1.0,
    numbers: false,
    branchOpacity: [1, 1, 0.9, 0.8, 0.7, 0.7],
  },
  garden: {
    name: 'Garden',
    bg: '#FFFFFF', ink: '#1A1A1A', muted: '#7A7A7A',
    hues: ['#F2545B', '#F6A21E', '#2BB673', '#2F8BE6', '#9B5DE5', '#F15BB5'],
    textHues: ['#D63640', '#B87000', '#1E8A54', '#1F6CBE', '#7A3FC4', '#C92F8F'], // lead text on multi-hue overviews only
    strokeScale: 1.35,
    numbers: false,
    branchOpacity: [1, 1, 1, 0.95, 0.9, 0.9],
  },
  slate: {
    name: 'Slate',
    bg: '#16181D', ink: '#ECEAE4', muted: '#9A978F',
    hues: ['#F28B6E', '#5EC4C0', '#A8C65A', '#C59BE8', '#F0C05A', '#6FA8F5'],
    textHues: null,
    strokeScale: 1.0,
    numbers: true, // "2.1", "2.1.1" prefix, skipped when the label already starts with a number or Qn
    branchOpacity: [1, 1, 0.9, 0.8, 0.7, 0.7],
  },
};

export function getTheme(name = DEFAULT_THEME) {
  const T = THEMES[name];
  if (!T) throw new Error(`unknown theme "${name}" (use ${Object.keys(THEMES).join(', ')})`);
  return { ...T, key: name };
}

export function hueOf(T, i) { return T.hues[((i % T.hues.length) + T.hues.length) % T.hues.length]; }
