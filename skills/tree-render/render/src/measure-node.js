// measure-node.js: text measurer for Node, using opentype.js on the embedded Apfel Grotezk OTFs.
// measure(text, size, weight) = advance width with kerning × size / unitsPerEm; weight 'R' or 'M'.
// Characters the font lacks (emoji, ✓) are drawn by a fallback font in the browser; they are measured
// here with the widths Chrome on macOS gives them (emoji 1 em, other symbols about 0.8 em).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

export const FONT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'fonts');
export const FONT_FILES = { R: 'ApfelGrotezk-Regular.otf', M: 'ApfelGrotezk-Mittel.otf' };

let fontsPromise = null;
export function loadFonts(dir = FONT_DIR) {
  if (dir === FONT_DIR && fontsPromise) return fontsPromise;
  const p = Promise.resolve().then(() => {
    const out = {};
    for (const [k, f] of Object.entries(FONT_FILES)) {
      const b = fs.readFileSync(path.join(dir, f));
      out[k] = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    }
    return out;
  });
  if (dir === FONT_DIR) fontsPromise = p;
  return p;
}

export async function createMeasurer(dir) {
  const fonts = await loadFonts(dir);
  const unit = new Map(); // width at size 1, per weight + text
  return function measure(text, size, weight) {
    const key = (weight === 'M' ? 'M' : 'R') + '|' + text;
    let w = unit.get(key);
    if (w == null) {
      const font = fonts[weight === 'M' ? 'M' : 'R'];
      w = text ? unitWidth(font, text) : 0;
      unit.set(key, w);
    }
    return w * size;
  };
}

const EMOJI_W = 1.0, SYMBOL_W = 0.8;
const ZERO = /[\u200D\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}\u20E3]/u;

// Width at 1 px: runs the font covers are measured with kerning; missing characters get fallback widths.
function unitWidth(font, text) {
  const cps = [...text];
  let total = 0, run = '';
  const flush = () => { if (run) total += font.getAdvanceWidth(run, font.unitsPerEm, { kerning: true }) / font.unitsPerEm; run = ''; };
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i];
    if (font.charToGlyphIndex(c) > 0) { run += c; continue; }
    flush();
    if (ZERO.test(c)) { if (c === '\u200D') i++; continue; } // a ZWJ joins the next emoji into this one
    total += /\p{Emoji_Presentation}/u.test(c) || cps[i + 1] === '\uFE0F' ? EMOJI_W : SYMBOL_W;
  }
  flush();
  return total;
}
