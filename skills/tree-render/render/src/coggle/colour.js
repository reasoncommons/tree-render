// coggle/colour.js: Coggle's colours (docs/design/references/coggle-spec.md).
// Branch colours come from an 8-colour palette, one per root branch; each child takes its parent's colour
// with a tiny random walk in saturation and lightness. The text of a node is its branch colour with
// saturation × 0.7 and lightness × 0.5 (same hue, darker). Text on the grey root box: × 0.4375 and × 0.3125.

export const PALETTE = ['#7aa3e5', '#67d7c4', '#9ed56b', '#ebd95f', '#efa670', '#e68782', '#e096e9', '#988ee3'];
export const ROOT_COLOUR = '#d0d0d0';
export const BG = '#ffffff';

// HSL as tinycolor gives it: h in degrees, s and l in [0, 1].
export function toHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s, l };
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
export function fromHsl({ h, s, l }) {
  h = (((h % 360) + 360) % 360) / 360; s = clamp01(s); l = clamp01(l);
  let r, g, b;
  if (s === 0) r = g = b = l;
  else {
    const hue = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    r = hue(p, q, h + 1 / 3); g = hue(p, q, h); b = hue(p, q, h - 1 / 3);
  }
  return '#' + [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

// Coggle's darken(c, n): saturation × 0.7 / n, lightness × 0.5 / n.
export function darken(hex, n = 1) {
  const c = toHsl(hex);
  return fromHsl({ h: c.h, s: c.s * (0.7 / n), l: c.l * (0.5 / n) });
}

export const textColour = (branchColour) => darken(branchColour);
export const rootTextColour = (rootColour) => darken(rootColour, 1.6);

// A small deterministic PRNG (mulberry32) seeded from a string, standing in for Coggle's Math.random().
function rng(key) {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Coggle's randomWalkColour: h += (−9…9)/256 (degrees, so almost nothing), s and l += (−6…6)/256.
export function randomWalk(hex, key) {
  const r = rng(key), c = toHsl(hex);
  c.h += (Math.floor(19 * r()) - 9) / 256;
  c.s = clamp01(c.s + (Math.floor(13 * r()) - 6) / 256);
  c.l = clamp01(c.l + (Math.floor(13 * r()) - 6) / 256);
  return fromHsl(c);
}

// A colour with its saturation × s and lightness × l (the coggle-* variants' palette shifts; 1, 1 is a no-op).
export function adjust(hex, { s = 1, l = 1 } = {}) {
  if (s === 1 && l === 1) return hex;
  const c = toHsl(hex);
  return fromHsl({ h: c.h, s: c.s * s, l: c.l * l });
}
