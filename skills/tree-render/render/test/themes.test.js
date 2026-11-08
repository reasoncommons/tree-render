import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, contrast } from '../src/themes.js';

test('contrast: known WCAG ratios', () => {
  assert.equal(contrast('#000000', '#FFFFFF').toFixed(2), '21.00');
  assert.ok(Math.abs(contrast('#B8862B', '#FBF8F2') - 3.06) < 0.01);
});

for (const [k, T] of Object.entries(THEMES)) {
  test(`${k}: every text hue is at least 4.5:1 on the ground, one per branch hue`, () => {
    assert.equal(T.textHues.length, T.hues.length);
    for (const h of T.textHues) assert.ok(contrast(h, T.bg) >= 4.5, `${h} on ${T.bg}: ${contrast(h, T.bg).toFixed(2)}`);
    assert.ok(contrast(T.ink, T.bg) >= 4.5 && contrast(T.muted, T.bg) >= 4.5, 'ink and muted');
  });
}
