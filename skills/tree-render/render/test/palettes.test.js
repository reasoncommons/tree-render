// --palette (src/palettes.js): the wise-* palettes on the coggle styles and the styles2 styles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from '../src/parse.js';
import { PALETTES, PALETTE_NAMES, getPalette, ensureContrast, levelOneColours } from '../src/palettes.js';
import { contrast } from '../src/coggle/colour.js';
import { renderCoggle } from '../src/coggle/render.js';
import { coggleStyle, withPalette } from '../src/coggle/styles.js';
import { renderStyle2, STYLE2_NAMES } from '../src/styles2/index.js';

const TREE = parse(JSON.stringify({ root: { text: 'How fast should we go?', children: [
  { lead: 'The risks are real', text: 'The risks are real and contested.', children: [{ text: 'Four kinds of catastrophe.', children: [] }, { text: 'The precursors are visible.', children: [] }] },
  { lead: 'The world races', text: 'The world races because it is trapped.', children: [{ text: 'Each actor races because the others do.', children: [] }] },
  { lead: 'So pace the frontier', text: 'So pace the frontier now.', children: [{ text: 'Labs: stop racing.', children: [] }, { text: 'States: agree red lines.', children: [] }] },
] } }));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'palettes-'));
const coggle = (style, palette, font) => renderCoggle(TREE, { style, palette, font, outDir: tmp, name: `${style}-${palette}`, png: false });
const fills = (svg) => [...svg.matchAll(/<g class="label"[^>]* fill="(#[0-9a-f]{6})"/g)].map(m => m[1]);

test('palettes: wise-ink and wise-print, unknown names throw, no name is no palette', () => {
  assert.deepEqual(PALETTE_NAMES, ['wise-ink', 'wise-print']);
  assert.equal(getPalette(undefined), null);
  assert.throws(() => getPalette('nope'), /unknown palette "nope"/);
  assert.deepEqual(levelOneColours(PALETTES['wise-print'], 4, 2), ['#3d6f78', '#5f978f', '#c8372d', '#a87b42']);
});

test('palette applies to the coggle styles: background, branch colours, root box, root text', async () => {
  for (const [style, kind] of [['coggle-exact', 'box'], ['coggle-thin', 'outline']]) {
    const P = PALETTES['wise-print'], { svg } = await coggle(style, 'wise-print');
    assert.match(svg, new RegExp(`<rect width="\\d+" height="\\d+" fill="${P.bg}"/>`));
    for (const c of ['#3d6f78', '#5f978f', P.accent]) assert.ok(svg.includes(`stroke="${c}"`), `${style}: branch ${c}`);
    const box = /<path class="root-box"[^>]*>/.exec(svg)[0];
    assert.ok(box.includes(kind === 'box' ? `fill="${P.root.fill}"` : `stroke="${P.root.outline}"`), box);
    assert.ok(/<g class="label" data-node="root" fill="([^"]+)"/.exec(svg)[1] === P.root.text);
  }
});

test('accent in coggle: the "So" branch and its subtree in the accent colour, its text in red at ≥ 4.5:1', async () => {
  const { L } = await coggle('coggle-thin', 'wise-ink');
  const P = PALETTES['wise-ink'], accent = ensureContrast(P.accent, P.bg);
  for (const r of L.nodes.filter(r => r.level > 0)) {
    const inAccent = r.num.startsWith('3');
    assert.equal(r.colour, inAccent ? P.accent : P.branches[0], r.num);
    assert.equal(r.textColour, inAccent ? accent : P.ink, r.num);
  }
  // without a palette coggle has no accent: the third branch takes the style's own third colour
  const own = await renderCoggle(TREE, { style: 'coggle-thin', outDir: tmp, name: 'own', png: false });
  assert.notEqual(own.L.nodes.find(r => r.num === '3').colour, P.accent);
});

test('every text colour in every palette reads at ≥ 4.5:1 on its background (coggle and styles2)', async () => {
  for (const name of PALETTE_NAMES) {
    const P = PALETTES[name];
    for (const style of ['coggle-exact', 'coggle-thin']) {
      const { L, svg } = await coggle(style, name, 'bricolage');
      for (const r of L.nodes) assert.ok(contrast(r.textColour, r.level ? P.bg : (style === 'coggle-exact' ? P.root.fill : P.bg)) >= 4.5, `${name} ${style} ${r.num} ${r.textColour}`);
      assert.ok(fills(svg).length === L.nodes.length);
    }
    for (const style of STYLE2_NAMES) {
      const { svg, issues } = await renderStyle2(TREE, { style, palette: name, font: 'bricolage', outDir: tmp, name: `${style}-${name}`, png: false });
      assert.deepEqual(issues, []);
      const text = new Set([...svg.matchAll(/<tspan font-weight="\d+" fill="(#[0-9a-f]{6})"/g)].map(m => m[1]));
      assert.ok(text.size >= 2);
      for (const c of text) assert.ok(contrast(c, P.bg) >= 4.5, `${name} ${style} ${c}`);
      assert.ok(svg.includes(`fill="${P.bg}"`) && svg.includes(P.accent), `${name} ${style}: background and accent`);
      assert.ok(svg.includes("font-family:'Bricolage Grotesque'"));
    }
  }
});

test('defaults unchanged: no palette leaves the coggle style as is; styles2 keep slate, red and IBM Plex Sans', async () => {
  for (const s of ['coggle-exact', 'coggle-thin']) assert.equal(withPalette(coggleStyle(s), null), coggleStyle(s));
  await renderStyle2(TREE, { style: 'ribbon', palette: 'wise-ink', font: 'bricolage', outDir: tmp, name: 'x', png: false });
  const { svg } = await renderStyle2(TREE, { style: 'ribbon', outDir: tmp, name: 'ribbon', png: false });
  assert.ok(svg.includes('#3b5b8f') && svg.includes('#d7261e') && svg.includes('fill="#ffffff"'));
  assert.ok(svg.includes("font-family:'IBM Plex Sans'") && !svg.includes('Bricolage'));
});
