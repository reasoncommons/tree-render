import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseState, toHash } from '../src/state.js';
import { bundleBrowser, buildPage } from '../src/bundle.js';
import { parse } from '../src/parse.js';
import { findBrowser } from '../scripts/png.js';
import { readExample, readFixture } from './helpers.js';

test('state: hash parses to options and back', () => {
  const s = parseState('#theme=slate&view=qa&labels=lead&depth=3&fold=2.3,3.4&open=1.2&root=2&map=1');
  assert.deepEqual(s, { theme: 'slate', view: 'qa', labels: 'lead', depth: 3, fold: ['2.3', '3.4'], open: ['1.2'], root: '2', map: true });
  assert.deepEqual(parseState(toHash(s)), s);
  assert.deepEqual(parseState(''), {});
  assert.deepEqual(parseState('depth=1'), { depth: 1 });
  assert.equal(toHash({ theme: 'paper', depth: 2, fold: [], open: [] }), 'theme=paper&depth=2');
  assert.deepEqual(parseState('#depth=x&theme=nope&view=bad&bogus=1'), {}, 'invalid values dropped');
});

test('bundle: the browser build evaluates without Node APIs and exposes the modules', () => {
  const js = bundleBrowser();
  assert.doesNotMatch(js, /^\s*(import|export)\s/m);
  assert.doesNotMatch(js, /node:/);
  const flextree = fs.readFileSync(new URL('../vendor/d3-flextree.min.js', import.meta.url), 'utf8');
  const ctx = { console, structuredClone };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(flextree, ctx);
  vm.runInContext(js, ctx);
  const R = ctx.TreeRender;
  for (const k of ['layout', 'draw', 'parse', 'prune', 'parseState', 'toHash', 'canvasMeasurer', 'start', 'THEMES']) assert.ok(R[k], k);
  // the bundled layout + draw run with a crude measurer
  const t = R.parse(readExample('wise-ai-questions.md'));
  const L = R.layout(t, { format: 'web' }, (s, size) => s.length * size * 0.5);
  assert.match(R.draw(L, { interactive: true }), /^<svg/);
});

test('page: self-contained (fonts, flextree, tree inlined; no network)', () => {
  const html = buildPage(parse(readExample('wise-ai-questions.md')), { theme: 'paper' });
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /@font-face\{font-family:ApfelRegular;src:url\(data:font\/otf;base64,/);
  assert.match(html, /@font-face\{font-family:ApfelMittel;src:url\(data:font\/otf;base64,/);
  assert.match(html, /flextree/);
  assert.match(html, /How should we approach the development of AI wisely/);
  assert.doesNotMatch(html, /(src|href)="https?:/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
});

test('page: a "</script>" in the tree cannot break out of the script', () => {
  const html = buildPage(parse('# T\n\n- Root </script><b>x\n  - a\n'), {});
  assert.equal((html.match(/<\/script>/g) || []).length, (html.match(/<script>/g) || []).length);
});

// ---- in the browser ----
const browser = findBrowser();
const skip = !browser && 'no Chrome or Chromium found';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-render-int-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

// Loads the page at a window size, runs `probe` (async function body; `R` = window.__treeRender) once
// the page has rendered and returns what it returns.
function inBrowser(html, { width = 1400, height = 1000, hash = '', probe }) {
  const page = html.replace('</body>', `<script>(async () => { const out = document.createElement('pre'); out.id = 'probe';
    try { await window.__treeRenderReady; const R = window.__treeRender; out.textContent = JSON.stringify(await (async () => { ${probe} })()); }
    catch (e) { out.textContent = JSON.stringify({ error: String(e && e.stack || e) }); } document.body.appendChild(out); })();</script></body>`);
  const file = path.join(dir, `p${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(file, page);
  const dom = execFileSync(browser, ['--headless=new', '--disable-gpu', '--virtual-time-budget=6000', `--window-size=${width},${height}`, '--dump-dom', pathToFileURL(file).href + hash],
    { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).toString();
  const m = /<pre id="probe">([^<]*)<\/pre>/.exec(dom);
  assert.ok(m, 'probe ran');
  const r = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  assert.ok(!r.error, r.error);
  return r;
}

const wise = parse(readFixture('wise-ai-questions-leads.md'));

test('desktop: root + 2 levels; clicking a "+N" node unfolds it and updates the hash', { skip }, () => {
  const r = inBrowser(buildPage(wise, {}), {
    probe: `
      const depths = [...document.querySelectorAll('#stage g.node')].map(g => +g.dataset.depth);
      const before = depths.length, maxDepth = Math.max(...depths);
      const g = document.querySelector('#stage g.node[data-num="2.1"]');
      const hidden = +g.dataset.hidden;
      g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const after = document.querySelectorAll('#stage g.node').length;
      const hash1 = location.hash;
      document.querySelector('#stage g.node[data-num="2.1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const hash2 = location.hash;
      const svg = document.querySelector('#stage svg');
      return { before, maxDepth, hidden, after, hash1, hash2, mode: document.body.dataset.mode, svgW: +svg.getAttribute('width'),
        bar: document.getElementById('bar').getBoundingClientRect().height,
        controls: [...document.querySelectorAll('#bar select, #bar button')].map(e => e.id) };`,
  });
  assert.equal(r.mode, 'map');
  assert.equal(r.maxDepth, 2);
  assert.equal(r.before, 1 + 4 + 21);
  assert.equal(r.after, r.before + 3, 'one level opened under 2.1');
  assert.match(r.hash1, /open=2\.1/);
  assert.match(r.hash2, /fold=2\.1/);
  assert.doesNotMatch(r.hash2, /open=2\.1/);
  assert.ok(r.bar < 60, `one compact bar (${r.bar}px)`);
  for (const id of ['theme', 'view', 'labels', 'depth', 'expand', 'collapse', 'mode']) assert.ok(r.controls.includes(id), id);
});

test('desktop: the hash sets the state on load (theme, depth, fold)', { skip }, () => {
  const r = inBrowser(buildPage(wise, {}), {
    hash: '#theme=slate&depth=1&fold=root',
    probe: `return { n: document.querySelectorAll('#stage g.node').length, theme: document.querySelector('#stage svg').dataset.theme, sel: document.getElementById('theme').value };`,
  });
  assert.deepEqual(r, { n: 1, theme: 'slate', sel: 'slate' });
});

test('desktop: controls change view and expand all', { skip }, () => {
  const r = inBrowser(buildPage(parse(readExample('wise-ai-answers.md')), {}), {
    probe: `
      const n0 = document.querySelectorAll('#stage g.node').length;
      document.getElementById('expand').click();
      const n1 = document.querySelectorAll('#stage g.node').length;
      const v = document.getElementById('view'); v.value = 'questions'; v.dispatchEvent(new Event('change'));
      return { n0, n1, hash: location.hash, view: R.state.view };`,
  });
  assert.equal(r.n1, 94);
  assert.ok(r.n0 < r.n1);
  assert.equal(r.view, 'questions');
  assert.match(r.hash, /view=questions/);
});

test('phone: the outline shows, no horizontal scroll, folds work, controls behind one button', { skip }, () => {
  const r = inBrowser(buildPage(wise, {}), {
    width: 390, height: 844,
    probe: `
      const rows0 = document.querySelectorAll('#stage .row').length;
      const scroll = document.documentElement.scrollWidth <= window.innerWidth;
      const controlsHidden = getComputedStyle(document.getElementById('controls')).display === 'none';
      document.getElementById('menu').click();
      const controlsShown = getComputedStyle(document.getElementById('controls')).display !== 'none';
      document.querySelector('#stage .row[data-num="1"]').click();
      const rows1 = document.querySelectorAll('#stage .row').length;
      return { mode: document.body.dataset.mode, innerW: window.innerWidth, rows0, rows1, scroll, controlsHidden, controlsShown, svg: !!document.querySelector('#stage svg') };`,
  });
  assert.equal(r.mode, 'outline');
  assert.ok(r.innerW < 640);
  assert.equal(r.svg, false);
  assert.equal(r.rows0, 26);
  assert.equal(r.rows1, 26 - 5, 'folding Q1 hides its 5 children');
  assert.ok(r.scroll, 'no horizontal scroll');
  assert.ok(r.controlsHidden && r.controlsShown);
});
