import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { layout } from '../src/layout.js';
import { draw, branchPath, stripFonts } from '../src/draw.js';
import { FORMATS } from '../src/formats.js';
import { THEMES } from '../src/themes.js';
import { parse } from '../src/parse.js';
import { createMeasurer, fontFaceCSS } from '../src/measure-node.js';
import { EXAMPLE_FILES, readExample, readFixture, here } from './helpers.js';

const measure = await createMeasurer();
const fontCSS = fontFaceCSS();
const GOLDEN = path.join(here, 'golden');
const trees = Object.fromEntries(EXAMPLE_FILES.map(f => [f, parse(readExample(f))]));

const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
// text of each node group, keyed by data-num: [ [line, line, …], marker ]
function nodeTexts(svg) {
  const out = {};
  for (const m of svg.matchAll(/<g class="node" data-num="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g)) {
    const lines = [...m[2].matchAll(/<text(?![^>]*class="more")[^>]*>([^<]*)<\/text>/g)].map(x => unesc(x[1]));
    const more = /<text[^>]*class="more"[^>]*>([^<]*)<\/text>/.exec(m[2]);
    out[m[1]] = { lines, more: more ? unesc(more[1]) : null };
  }
  return out;
}

test('draw: a complete SVG with the canvas size, theme and background', () => {
  const L = layout(trees['wise-ai-questions.md'], { format: '4x5', theme: 'paper', frame: { kicker: 'Wise AI · question tree', footer: 'Life Itself' } }, measure);
  const svg = draw(L, { fontCSS });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /);
  assert.match(svg, /<\/svg>\n?$/);
  assert.match(svg, / width="1080" height="1350" viewBox="0 0 1080 1350"/);
  assert.match(svg, /data-theme="paper"/);
  assert.match(svg, new RegExp(`<rect width="1080" height="1350" fill="${THEMES.paper.bg}"/>`));
  assert.match(svg, />Wise AI · question tree<\/text>/);
  assert.match(svg, />\+N: questions folded beneath {2}· {2}Life Itself<\/text>|>Life Itself<\/text>/);
});

test('draw: fonts embedded as base64 @font-face, only the two families used', () => {
  const L = layout(trees['dam-media-questions.md'], { format: '16x9', theme: 'garden' }, measure);
  const svg = draw(L, { fontCSS });
  assert.equal((svg.match(/@font-face\{font-family:ApfelRegular;src:url\(data:font\/otf;base64,[A-Za-z0-9+/=]{1000,}\)/g) || []).length, 1);
  assert.equal((svg.match(/@font-face\{font-family:ApfelMittel;src:url\(data:font\/otf;base64,[A-Za-z0-9+/=]{1000,}\)/g) || []).length, 1);
  const families = new Set([...svg.matchAll(/font-family[=:]"?([A-Za-z]+)/g)].map(m => m[1]));
  assert.deepEqual([...families].sort(), ['ApfelMittel', 'ApfelRegular']);
});

test('draw: every source label is present verbatim, line by line', () => {
  for (const f of EXAMPLE_FILES) for (const format of Object.keys(FORMATS)) {
    const L = layout(trees[f], { format, view: 'questions', theme: 'paper' }, measure);
    const texts = nodeTexts(draw(L, { fontCSS }));
    for (const n of L.nodes) {
      const got = texts[n.num || 'root'];
      assert.ok(got, `${f} ${format}: node ${n.num} drawn`);
      assert.equal(got.lines.join(' '), n.src.text, `${f} ${format} ${n.num}`);
      assert.equal(got.more, n.hidden ? n.moreLabel : null);
    }
  }
});

test('draw: data-num on nodes and branches; one branch per non-root node; trunk for the root', () => {
  const L = layout(trees['wise-ai-questions.md'], { format: 'web', depth: 2 }, measure);
  const svg = draw(L, { fontCSS });
  const branches = [...svg.matchAll(/<path class="branch" data-num="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(branches.sort(), L.nodes.filter(n => n.depth > 0).map(n => n.num).sort());
  assert.equal((svg.match(/<path class="trunk"/g) || []).length, 1);
  assert.equal((svg.match(/<g class="node"/g) || []).length, L.nodes.length);
});

test('draw: metadata carries the render options and fold state', () => {
  const L = layout(trees['wise-ai-questions.md'], { format: '4x5', root: '2', depth: 2, labels: 'lead', fold: ['2.3'], frame: { kicker: 'k' } }, measure);
  const svg = draw(L, { fontCSS });
  const m = /<metadata id="tree-render">([\s\S]*?)<\/metadata>/.exec(svg);
  assert.ok(m);
  const meta = JSON.parse(unesc(m[1]));
  assert.equal(meta.format, '4x5');
  assert.equal(meta.theme, 'paper');
  assert.equal(meta.root, '2');
  assert.equal(meta.depth, 2);
  assert.equal(meta.labels, 'lead');
  assert.deepEqual(meta.fold, ['2.3']);
  assert.equal(meta.kicker, 'k');
});

test('draw: text is escaped', () => {
  const t = parse('# T\n\n- Root\n  - a < b & "c"?\n');
  const svg = draw(layout(t, { format: 'web' }, measure), { fontCSS });
  assert.match(svg, />a &lt; b &amp; "c"\?<\/text>/);
});

test('draw: Slate numbers labels in the drawn text', () => {
  const L = layout(trees['wise-ai-questions.md'], { format: 'web', theme: 'slate' }, measure);
  const texts = nodeTexts(draw(L, { fontCSS }));
  assert.match(texts['1.1'].lines[0], /^1\.1 What/);
});

test('branchPath: a closed ribbon from parent end to child shelf end', () => {
  const d = branchPath(0, 0, 100, 50, 6, 4, 80, 3.4, 0.55, 28);
  assert.match(d, /^M-?[\d.]+,-?[\d.]+(L-?[\d.]+,-?[\d.]+)+Z$/);
  const pts = d.slice(1, -1).split('L').map(p => p.split(',').map(Number));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  assert.ok(Math.min(...xs) >= -0.1 && Math.max(...xs) <= 180.1);
  assert.ok(Math.min(...ys) >= -3.1 && Math.max(...ys) <= 52.1);
  // starts at the parent end with half of w0 either side of y0
  assert.deepEqual(pts[0], [0, 3]);
  assert.deepEqual(pts[pts.length - 1], [0, -3]);
});

test('draw is deterministic', () => {
  const L1 = layout(trees['taiwan-trip-issue-tree.md'], { format: '1x1' }, measure);
  const L2 = layout(trees['taiwan-trip-issue-tree.md'], { format: '1x1' }, measure);
  assert.equal(draw(L1, { fontCSS }), draw(L2, { fontCSS }));
});

test('interactive draw adds 44 px fold targets on nodes that fold', () => {
  const L = layout(trees['wise-ai-questions.md'], { format: 'web' }, measure);
  const svg = draw(L, { interactive: true });
  const hits = [...svg.matchAll(/<rect class="hit"[^>]* height="([\d.]+)"/g)].map(m => +m[1]);
  assert.equal(hits.length, L.nodes.filter(n => n.children.length || n.hidden).length);
  assert.ok(hits.every(h => h >= 44));
  assert.doesNotMatch(draw(L, {}), /class="hit"/);
});

// Golden renders: every example × format × theme at its default depth and view, fonts stripped.
for (const f of EXAMPLE_FILES) for (const format of Object.keys(FORMATS)) for (const theme of Object.keys(THEMES)) {
  test(`golden ${f} ${format} ${theme}`, () => {
    const L = layout(trees[f], { format, theme, frame: { kicker: 'Example · ' + f, footer: 'tree-render test' } }, measure);
    const svg = stripFonts(draw(L, { fontCSS }));
    const file = path.join(GOLDEN, `${f.replace(/\.md$/, '')}-${format}-${theme}.svg`);
    if (process.env.UPDATE_GOLDEN || !fs.existsSync(file)) {
      if (!process.env.UPDATE_GOLDEN) assert.fail(`missing golden ${path.basename(file)} (run with UPDATE_GOLDEN=1)`);
      fs.mkdirSync(GOLDEN, { recursive: true });
      fs.writeFileSync(file, svg);
    }
    assert.equal(svg, fs.readFileSync(file, 'utf8'));
  });
}

test('the leads fixture draws on a branch card', () => {
  const L = layout(parse(readFixture('wise-ai-questions-leads.md')), { format: '4x5', root: '2', labels: 'lead' }, measure);
  const texts = nodeTexts(draw(L, { fontCSS }));
  assert.equal(texts['2.3.1'].lines.join(' '), 'Is a slower or different trajectory desirable…');
});
