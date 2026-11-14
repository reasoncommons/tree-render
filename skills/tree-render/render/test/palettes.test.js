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
  assert.deepEqual(levelOneColours(PALETTES['wise-print'], 5, 2), ['#3d6f78', '#a87b42', '#c8372d', '#3f4a6b', '#6a9a66']);
  // each wise-print branch reads at >= 3:1 as a line on paper
  for (const c of PALETTES['wise-print'].branches) assert.ok(contrast(c, PALETTES['wise-print'].bg) >= 3, c);
});

test('palette applies to the coggle styles: background, branch colours, root box, root text', async () => {
  for (const [style, kind] of [['coggle-exact', 'box'], ['coggle-thin', 'outline']]) {
    const P = PALETTES['wise-print'], { svg } = await coggle(style, 'wise-print');
    assert.match(svg, new RegExp(`<rect width="\\d+" height="\\d+" fill="${P.bg}"/>`));
    for (const c of ['#3d6f78', '#a87b42', P.accent]) assert.ok(svg.includes(`stroke="${c}"`), `${style}: branch ${c}`);
    const box = /<path class="root-box"[^>]*>/.exec(svg)[0];
    assert.ok(box.includes(kind === 'box' ? `fill="${P.root.fill}"` : `stroke="${P.root.outline}"`), box);
    assert.ok(/<g class="label" data-node="root" fill="([^"]+)"/.exec(svg)[1] === P.root.text);
  }
});

test('accent in coggle: the "So" branch and its subtree drawn in the accent colour; only its level-1 lead is red', async () => {
  const { L } = await coggle('coggle-thin', 'wise-ink');
  const P = PALETTES['wise-ink'], accent = ensureContrast(P.accent, P.bg);
  for (const r of L.nodes.filter(r => r.level > 0)) {
    const inAccent = r.num.startsWith('3');
    assert.equal(r.colour, inAccent ? P.accent : P.branches[0], r.num);
    assert.equal(r.textColour, r.num === '3' ? accent : P.ink, r.num);
    assert.equal(r.contColour, r.num === '3' ? P.ink : undefined, r.num);
  }
  // without a palette coggle has no accent: the third branch takes the style's own third colour
  const own = await renderCoggle(TREE, { style: 'coggle-thin', outDir: tmp, name: 'own', png: false });
  assert.notEqual(own.L.nodes.find(r => r.num === '3').colour, P.accent);
});

test('wise-print text: ink body, bold leads in their branch colour (≥ 4.5:1), accent subtree text ink', async () => {
  const P = PALETTES['wise-print'], { L, svg } = await coggle('coggle-thin', 'wise-print');
  const by = (num) => L.nodes.find(r => r.num === num);
  assert.equal(by('1').textColour, ensureContrast('#3d6f78', P.bg));
  assert.equal(by('2').textColour, ensureContrast('#a87b42', P.bg));
  assert.equal(by('3').textColour, ensureContrast(P.accent, P.bg));
  for (const n of ['1', '2', '3']) assert.equal(by(n).contColour, P.ink, n);
  for (const n of ['1.1', '1.2', '2.1', '3.1', '3.2']) { assert.equal(by(n).textColour, P.ink, n); assert.equal(by(n).contColour, undefined, n); }
  assert.ok(svg.includes(`<tspan fill="${P.ink}"`));
});

test('a one-level tree caps the root at 1.15 × the level-1 size (coggle our layout, styles2); --sizes and deeper trees unchanged', async () => {
  const flat = parse(JSON.stringify({ root: { text: 'How should we approach AI development wisely?', children: ['Can we make AI good?', 'Could AI feel?'].map(text => ({ text, children: [] })) } }));
  const rootSize = (L) => L.nodes.find(r => r.level === 0).t.size;
  const run = (tree, o = {}) => renderCoggle(tree, { style: 'coggle-thin', outDir: tmp, name: 'flat', png: false, ...o });
  const S = coggleStyle('coggle-thin');
  assert.equal(rootSize((await run(flat)).L), Math.round(1.15 * S.sizes[1]));
  assert.equal(rootSize((await run(flat, { sizes: [26, 19, 15, 13] })).L), 26);
  assert.equal(rootSize((await run(TREE)).L), S.rootSize ?? S.sizes[0]);
  const rootFont = async (tree) => { const { svg } = await renderStyle2(tree, { style: 'ribbon', outDir: tmp, name: 'flat2', png: false }); return [...svg.matchAll(/font-size="([\d.]+)"/g)].map(m => +m[1]); };
  assert.ok(Math.max(...await rootFont(flat)) <= 23);
  assert.ok((await rootFont(TREE)).includes(28));
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
