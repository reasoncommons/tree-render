import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findBrowser, pngSize } from '../scripts/png.js';
import { EXAMPLES, FIXTURES, here } from './helpers.js';

const BIN = path.join(here, '..', 'bin', 'render.js');
const WISE = path.join(EXAMPLES, 'wise-ai-questions.md');
const LEADS = path.join(FIXTURES, 'wise-ai-questions-leads.md');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-render-cli-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
const skip = !findBrowser() && 'no Chrome or Chromium found';

function cli(...args) {
  const r = spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', cwd: dir });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const out = name => path.join(dir, name);
const stripMeta = s => s.replace(/<metadata[\s\S]*?<\/metadata>/, '');

test('render: writes the SVG and the report; exit 0 when checks pass', () => {
  const r = cli(LEADS, '--format', '4x5', '--depth', '1', '--kicker', 'Wise AI briefing · question tree', '--footer', 'Life Itself · draft', '--out', out('cover'));
  assert.equal(r.code, 0, r.err + r.out);
  const svg = fs.readFileSync(out('cover.svg'), 'utf8');
  assert.match(svg, /width="1080" height="1350"/);
  assert.match(svg, /@font-face\{font-family:ApfelMittel/);
  const rep = JSON.parse(fs.readFileSync(out('cover.report.json'), 'utf8'));
  assert.equal(rep.ok, true);
  assert.equal(rep.metrics.format, '4x5');
  assert.match(r.out, /cover\.svg/);
  assert.match(r.out, /scale/);
});

test('--state renders a saved fold state: #depth=1 equals --depth 1 (the 4:5 cover)', () => {
  cli(WISE, '--format', '4x5', '--depth', '1', '--out', out('a'));
  cli(WISE, '--format', '4x5', '--state', '#depth=1', '--out', out('b'));
  assert.equal(fs.readFileSync(out('a.svg'), 'utf8'), fs.readFileSync(out('b.svg'), 'utf8'));
  cli(WISE, '--format', '4x5', '--state', '#theme=slate&depth=2&fold=2,3&root=1', '--out', out('c'));
  cli(WISE, '--format', '4x5', '--theme', 'slate', '--depth', '2', '--root', '1', '--out', out('d'));
  // fold=2,3 is outside the Q1 card, so the two renders draw the same; only the metadata differs
  assert.equal(stripMeta(fs.readFileSync(out('c.svg'), 'utf8')), stripMeta(fs.readFileSync(out('d.svg'), 'utf8')));
});

test('explicit flags win over --state', () => {
  cli(WISE, '--format', '16x9', '--state', '#theme=slate', '--theme', 'garden', '--out', out('e'));
  assert.match(fs.readFileSync(out('e.svg'), 'utf8'), /data-theme="garden"/);
});

test('--png writes a PNG of exactly the canvas × scale', { skip }, () => {
  const r = cli(WISE, '--format', '16x9', '--root', '2', '--png', '--scale', '2', '--out', out('slide'));
  assert.ok(r.code === 0 || r.code === 1, r.err);
  assert.deepEqual(pngSize(out('slide.png')), { width: 3840, height: 2160 });
});

test('--html writes the interactive page', () => {
  const r = cli(WISE, '--html', '--out', out('page'));
  assert.equal(r.code, 0, r.err);
  const html = fs.readFileSync(out('page.html'), 'utf8');
  assert.match(html, /TreeRender\.start/);
});

test('carousel: a cover and one branch card per level-1 node, numbered, kicker "Qn of N", hue kept', () => {
  const r = cli('carousel', WISE, '--format', '4x5', '--kicker', 'Wise AI briefing', '--footer', 'Life Itself', '--out', out('car'));
  assert.equal(r.code, 0, r.err + r.out);
  const files = fs.readdirSync(dir).filter(f => f.startsWith('car-') && f.endsWith('.svg')).sort();
  assert.deepEqual(files, ['car-0-cover.svg', 'car-1.svg', 'car-2.svg', 'car-3.svg', 'car-4.svg']);
  const card2 = fs.readFileSync(out('car-2.svg'), 'utf8');
  assert.match(card2, />Wise AI briefing · Q2 of 4<\/text>/);
  assert.match(card2, /"labels":"lead"/);
  assert.match(card2, /class="branch"[^>]*fill="#2F7F8B"/, 'Q2 keeps the second hue');
  for (const f of files) assert.equal(JSON.parse(fs.readFileSync(out(f.replace('.svg', '.report.json')), 'utf8')).ok, true, f);
});

test('carousel --png writes 5 PNGs that pass checks', { skip }, () => {
  const r = cli('carousel', LEADS, '--format', '4x5', '--png', '--kicker', 'Wise AI briefing', '--footer', 'Life Itself', '--out', out('carp'));
  assert.equal(r.code, 0, r.err + r.out);
  const pngs = fs.readdirSync(dir).filter(f => f.startsWith('carp-') && f.endsWith('.png'));
  assert.equal(pngs.length, 5);
});

test('check: prints the report and writes nothing; exit 1 on a hard failure', () => {
  const ok = cli('check', LEADS, '--format', '16x9', '--root', '2', '--labels', 'lead');
  assert.equal(ok.code, 0, ok.err);
  assert.equal(JSON.parse(ok.out).ok, true);
  const bad = cli('check', LEADS, '--format', '4x5', '--depth', '1', '--footer', 'x'.repeat(300));
  assert.equal(bad.code, 1);
  assert.equal(JSON.parse(bad.out).errors[0].check, 'overflow');
  assert.deepEqual(fs.readdirSync(dir).filter(f => f.startsWith('wise-ai-questions-leads')), []);
});

test('a hard failure on render still writes the files and exits 1', () => {
  const r = cli(LEADS, '--format', '4x5', '--depth', '1', '--footer', 'x'.repeat(300), '--out', out('bad'));
  assert.equal(r.code, 1);
  assert.ok(fs.existsSync(out('bad.svg')));
  assert.match(r.out + r.err, /overflow/);
});

test('usage errors exit 2 with a message', () => {
  const a = cli(WISE, '--format', '3x2');
  assert.equal(a.code, 2);
  assert.match(a.err, /unknown format "3x2"/);
  const b = cli(WISE, '--root', '9.9');
  assert.equal(b.code, 2);
  assert.match(b.err, /no node numbered "9\.9"/);
  const c = cli('nope.md');
  assert.equal(c.code, 2);
});

test('default output path: <tree>-<format> in the working directory', () => {
  const r = cli(WISE, '--format', '1x1');
  assert.equal(r.code, 0, r.err);
  assert.ok(fs.existsSync(out('wise-ai-questions-1x1.svg')));
});

test('--style: writes <out>/<name>.svg, a 2× PNG and the report', { skip }, () => {
  const r = cli(path.join(FIXTURES, 'v01-q2.json'), '--style', 'v01', '--out', out('opts'), '--name', 'q2');
  assert.equal(r.code, 0, r.err + r.out);
  const svg = fs.readFileSync(out('opts/q2.svg'), 'utf8');
  assert.match(svg, /width="1735"/);
  assert.match(svg, /@font-face\{font-family:ApfelMittel/);
  assert.equal(pngSize(out('opts/q2.png')).width, 3470);
  assert.equal(JSON.parse(fs.readFileSync(out('opts/q2.report.json'), 'utf8')).ok, true);
});

test('no --style and no format flags: a static render in the default style, named after the tree', () => {
  const r = cli(path.join(FIXTURES, 'v01-q2.json'), '--no-png', '--out', out('def'));
  assert.equal(r.code, 0, r.err + r.out);
  const svg = fs.readFileSync(out('def/v01-q2.svg'), 'utf8');
  assert.match(svg, /data-style="coggle-exact"/);

  // a named style keeps its own name as the file name; river is a named style
  const v = cli(path.join(FIXTURES, 'v01-q2.json'), '--style', 'river', '--no-png', '--out', out('def'));
  assert.equal(v.code, 0, v.err + v.out);
  assert.match(fs.readFileSync(out('def/river.svg'), 'utf8'), /data-style="river"/);
});

test('--style with an unknown style is a usage error', () => {
  const r = cli(path.join(FIXTURES, 'v01-q2.json'), '--style', 'no-such-style', '--no-png', '--out', out('x'));
  assert.equal(r.code, 2);
  assert.match(r.err, /no such style/);
});

test('scripts/options.js renders every style in a folder and writes index.html', () => {
  const styles = out('styles');
  fs.mkdirSync(styles, { recursive: true });
  fs.writeFileSync(path.join(styles, 'a.json'), JSON.stringify({ extends: 'v01', description: 'first' }));
  fs.writeFileSync(path.join(styles, 'b.json'), JSON.stringify({ extends: 'v01-thick' }));
  const r = spawnSync(process.execPath, [path.join(here, '..', 'scripts', 'options.js'), path.join(FIXTURES, 'v01-q2.json'), styles, out('cmp'), '--no-png'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const html = fs.readFileSync(out('cmp/index.html'), 'utf8');
  for (const n of ['a', 'b']) {
    assert.ok(fs.existsSync(out(`cmp/${n}.svg`)));
    assert.match(html, new RegExp(`<figure id="${n}">`));
  }
  assert.match(html, /<details><summary>Style JSON<\/summary>/);
  assert.match(html, /first/);
});

test('--style ribbon|dendrogram|lanes (and --root-box): writes <style>.svg, exit 0 with no overlaps; listed in --help', () => {
  for (const style of ['ribbon', 'dendrogram', 'lanes']) {
    const r = cli(path.join(FIXTURES, 'v01-q2.json'), '--style', style, '--no-png', '--out', out('s2'));
    assert.equal(r.code, 0, r.err + r.out);
    assert.match(r.out, new RegExp(`${style}\\.svg  style ${style} · \\d+×\\d+ · ok`));
    assert.match(fs.readFileSync(out(`s2/${style}.svg`), 'utf8'), /^<svg /);
  }
  const b = cli(path.join(FIXTURES, 'v01-q2.json'), '--style', 'ribbon', '--root-box', '--name', 'boxed', '--no-png', '--out', out('s2'));
  assert.equal(b.code, 0, b.err + b.out);
  assert.match(fs.readFileSync(out('s2/boxed.svg'), 'utf8'), /rx="8" fill="#ececec"/);
  const h = cli('--help');
  for (const s of ['ribbon', 'dendrogram', 'lanes', '--root-box']) assert.match(h.out, new RegExp(s));
});
