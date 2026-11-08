// PNG output through headless Chrome; skipped when no browser is found.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findBrowser, svgToPng, htmlToPng, pngSize, svgSize, fontProbe } from '../scripts/png.js';
import { layout } from '../src/layout.js';
import { draw } from '../src/draw.js';
import { parse } from '../src/parse.js';
import { createMeasurer, fontFaceCSS } from '../src/measure-node.js';
import { readExample } from './helpers.js';

const browser = findBrowser();
const skip = !browser && 'no Chrome or Chromium found';
const measure = await createMeasurer();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-render-test-'));
const cover = draw(layout(parse(readExample('wise-ai-questions.md')), { format: '4x5', depth: 1, frame: { kicker: 'Wise AI', footer: 'Life Itself' } }, measure), { fontCSS: fontFaceCSS() });

test('findBrowser: a missing $CHROME gives null, not a guess', () => {
  assert.equal(findBrowser({ CHROME: '/nonexistent/chrome' }), null);
});

test('svgSize reads the canvas', () => {
  assert.deepEqual(svgSize(cover), { width: 1080, height: 1350 });
});

test('svgToPng: exactly W × H, and × scale', { skip }, () => {
  const a = svgToPng(cover, { out: path.join(dir, 'a.png') });
  assert.deepEqual(pngSize(a.out), { width: 1080, height: 1350 });
  const b = svgToPng(cover, { out: path.join(dir, 'b.png'), scale: 2 });
  assert.deepEqual(pngSize(b.out), { width: 2160, height: 2700 });
});

test('the cover renders with Apfel Grotezk: browser glyph widths match opentype.js, not the fallback', { skip }, () => {
  const p = fontProbe(cover);
  assert.ok(p && p.regular && p.mittel, JSON.stringify(p));
  const r = measure('Hamburgefonstiv', 40, 'R'), m = measure('Hamburgefonstiv', 40, 'M');
  assert.ok(Math.abs(p.widthRegular - r) / r < 0.015, `regular ${p.widthRegular} vs ${r}`);
  assert.ok(Math.abs(p.widthMittel - m) / m < 0.015, `mittel ${p.widthMittel} vs ${m}`);
  assert.notEqual(p.widthRegular, p.widthFallback);
});

test('htmlToPng: a phone-width viewport through the iframe', { skip }, () => {
  const page = path.join(dir, 'w.html');
  fs.writeFileSync(page, '<!doctype html><body style="margin:0;background:#f00"><div id=w></div><script>document.getElementById("w").textContent=innerWidth</script>');
  const r = htmlToPng(page, { out: path.join(dir, 'w.png'), width: 390, height: 844 });
  assert.deepEqual(pngSize(r.out), { width: 390, height: 844 });
});

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
