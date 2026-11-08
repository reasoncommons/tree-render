// measure-browser.js: text measurer for the browser, canvas measureText on the embedded fonts
// (families ApfelRegular and ApfelMittel, declared by the page's @font-face rules).
// No imports, so the bundle can inline it as is.

export function canvasMeasurer(ctx) {
  const cache = new Map();
  return function measure(text, size, weight) {
    const key = (weight === 'M' ? 'M' : 'R') + size + '|' + text;
    let w = cache.get(key);
    if (w == null) {
      ctx.font = size + 'px ' + (weight === 'M' ? 'ApfelMittel' : 'ApfelRegular');
      w = text ? ctx.measureText(text).width : 0;
      cache.set(key, w);
    }
    return w;
  };
}

// Waits for the fonts, then returns measure(text, size, weight).
export async function createMeasurer(doc = document) {
  await Promise.all([doc.fonts.load('16px ApfelRegular'), doc.fonts.load('16px ApfelMittel')]);
  await doc.fonts.ready;
  return canvasMeasurer(doc.createElement('canvas').getContext('2d'));
}
