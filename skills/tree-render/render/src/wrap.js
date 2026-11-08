// wrap.js: greedy line breaking at a width, then balanced (spec 5). Never breaks inside a word.
// measure(text, size, weight) → width in px; weight is 'R' (Regular) or 'M' (Mittel).

export const BALANCE_FLOOR = 0.72;

export function greedy(words, maxW, measure, size, weight) {
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (cur && measure(t, size, weight) > maxW) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Greedy at maxW, then the narrowest width that keeps the same line count (CSS text-wrap: balance),
// but never narrower than balanceFloor × maxW so a column still fills its width.
// Returns [{ t, w, size, weight }].
export function wrap(text, maxW, measure, size, weight, balanceFloor = BALANCE_FLOOR) {
  const words = String(text).split(/\s+/).filter(Boolean);
  let lines = greedy(words, maxW, measure, size, weight);
  if (lines.length > 1) {
    let lo = maxW * balanceFloor, hi = maxW;
    if (greedy(words, lo, measure, size, weight).length === lines.length) hi = lo;
    else {
      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2;
        if (greedy(words, mid, measure, size, weight).length > lines.length) lo = mid; else hi = mid;
      }
    }
    lines = greedy(words, hi, measure, size, weight);
  }
  return lines.map(t => ({ t, w: measure(t, size, weight), size, weight }));
}
