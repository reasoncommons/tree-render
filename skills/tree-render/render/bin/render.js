#!/usr/bin/env node
// tree-render CLI (task 9 of the implementation plan; design spec sections 4, 6, 8, 9).
import fs from 'node:fs';
import path from 'node:path';
import { parse, toJSON } from '../src/parse.js';
import { layout } from '../src/layout.js';
import { draw } from '../src/draw.js';
import { check } from '../src/check.js';
import { getFormat } from '../src/formats.js';
import { getTheme } from '../src/themes.js';
import { parseState } from '../src/state.js';
import { createMeasurer, fontFaceCSS } from '../src/measure-node.js';
import { COGGLE_STYLE_NAMES } from '../src/coggle/styles.js';
import { STYLE2_NAMES } from '../src/styles2/index.js';

const USAGE = `Usage: tree-render <tree.md|tree.json> [--out DIR] [--name N] [--scale 2] [--no-png]
                                     static render in the default style (styles/coggle-exact.json): DIR/<tree>.svg, .png (2×), .report.json
       tree-render <tree.md|tree.json> --format 4x5|1x1|16x9|web [options]   framed canvas render (any option below but --style)
       tree-render carousel <tree.md|tree.json> [options]   cover + one branch card per level-1 node
       tree-render check <tree.md|tree.json> [options]      print the self-check report only
       tree-render parse <tree.md|tree.json> [--out tree.json]
       tree-render <tree.md|tree.json> --style <style.json|name> [--out DIR] [--name N] [--scale 2] [--no-png]
                                     static render with a style (styles/*.json): writes DIR/N.svg, N.png (2×), N.report.json
       tree-render <tree.md|tree.json> --style ribbon|dendrogram|lanes [--out DIR] [--name N] [--scale 2] [--no-png] [--root-box]
                                     the round-2 styles (src/styles2/), IBM Plex Sans with a red accent branch:
                                       ribbon      tapered ribbons from the root to each answer, hairline S-curves to its points
                                       dendrogram  S-curves to each answer, rounded elbows to its points
                                       lanes       ribbons to each answer, each subtree on a soft band
                                     --root-box sets the root in a light box instead of on a dot (exit 1 if anything overlaps)
       tree-render <tree.md|tree.json> --style coggle-exact [--out DIR] [--name N] [--scale 2] [--no-png] [--allow-collisions]
                                     a faithful copy of Coggle's look (docs/design/references/coggle-spec.md); branches are kept
                                     off labels unless --allow-collisions (Coggle's own layout, for comparisons)
       tree-render <tree.md|tree.json> --style coggle-thin|coggle-thin-mono|coggle-broadsheet|coggle-letterpress [...]
                                     variants of coggle-exact (src/coggle/styles.js): other fonts, branch widths, palette
                                     shifts, background and root treatment on the same engine (coggle-hairline = coggle-thin)

Options:
  --format 4x5|1x1|16x9|web     canvas (default 4x5)
  --theme paper|garden|slate    colour theme (default paper)
  --view questions|qa|answers   what each node shows
  --labels full|lead            full sentences or bold leads only
  --depth N                     levels below the root to open
  --root 2.3                    re-root at that node number (keeps its branch hue)
  --kicker TEXT                 frame line, top left
  --footer TEXT                 frame line, bottom right
  --out PATH                    output path without extension (default <tree>-<format>)
  --png [--scale 2]             also write a PNG (needs Chrome or Playwright's chromium)
  --html                        also write the interactive page (<out>.html)
  --state '#depth=1&fold=2.3'   render a saved fold state (the page's URL hash); flags win
  --emit json                   write the parsed tree as canonical JSON (to --out or stdout)
  --style FILE|NAME             static render with a style (see above; default, river, …); --out is then a folder
  --name N                      file name (no extension) for static output (default: the style's name with --style, else the tree's)
  --no-png                      static render: skip the PNG
  -h, --help                    show this help

Writes <out>.svg and <out>.report.json and prints the report. Exit 1 on a hard check failure
(overlap, overflow, fidelity, fonts, markers), 2 on a usage error, 3 when a PNG needs a browser.
`;

const VALUE_FLAGS = ['style', 'name', 'format', 'theme', 'view', 'labels', 'depth', 'root', 'kicker', 'footer', 'out', 'scale', 'state', 'emit', 'hue'];
const BOOL_FLAGS = ['png', 'no-png', 'html', 'help', 'allow-collisions', 'root-box'];
// Flags of the framed canvas render; with none of them (and no --style) a tree renders statically in the default style.
const CANVAS_FLAGS = ['format', 'theme', 'view', 'labels', 'depth', 'root', 'kicker', 'footer', 'state', 'hue', 'html'];

class UsageError extends Error {}

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '-h') { a.help = true; continue; }
    if (!t.startsWith('--')) { a._.push(t); continue; }
    const k = t.slice(2);
    if (BOOL_FLAGS.includes(k)) { a[k] = true; continue; }
    if (!VALUE_FLAGS.includes(k)) throw new UsageError(`unknown option --${k}`);
    if (i + 1 >= argv.length) throw new UsageError(`--${k} needs a value`);
    a[k] = argv[++i];
  }
  return a;
}

// Render options from --state, then the explicit flags.
function renderOptions(a) {
  const s = a.state ? parseState(a.state) : {};
  const o = { format: a.format || '4x5' };
  getFormat(o.format);
  for (const k of ['theme', 'view', 'labels', 'depth', 'root', 'fold', 'open']) if (s[k] != null) o[k] = s[k];
  for (const k of ['theme', 'view', 'labels', 'root']) if (a[k] != null) o[k] = a[k];
  if (a.depth != null) { if (!/^\d+$/.test(a.depth)) throw new UsageError('--depth takes a whole number'); o.depth = +a.depth; }
  if (a.hue != null) o.hue = a.hue;
  if (o.theme) getTheme(o.theme);
  if (o.view && !['questions', 'qa', 'answers'].includes(o.view)) throw new UsageError(`unknown view "${o.view}"`);
  if (o.labels && !['full', 'lead'].includes(o.labels)) throw new UsageError(`unknown labels "${o.labels}"`);
  o.frame = { kicker: a.kicker || '', footer: a.footer || '' };
  return o;
}

function readTree(file) {
  if (!file) throw new UsageError('no tree file given');
  if (!fs.existsSync(file)) throw new UsageError(`no such file: ${file}`);
  const tree = parse(fs.readFileSync(file, 'utf8'));
  if (!tree.root) throw new UsageError(`${file}: no tree found (expected nested "-" bullets)`);
  return tree;
}

function lay(tree, opts, measure) {
  try { return layout(tree, opts, measure); } catch (e) {
    if (/^no node numbered|^unknown (format|theme)/.test(e.message)) throw new UsageError(e.message);
    throw e;
  }
}

function summary(name, rep) {
  const m = rep.metrics;
  const lines = [`${name}  ${m.format} ${m.theme} ${m.view}${m.labels === 'lead' ? ' lead' : ''} · scale ${m.scale} · smallest ${m.minFont} px (floor ${m.floor})${m.phoneFont ? ` · ${m.phoneFont} px on a phone` : ''} · ${m.nodes} nodes · ${rep.ok ? (rep.warnings.length ? 'ok with warnings' : 'ok') : 'FAILED'}`];
  for (const [kind, list] of [['error', rep.errors], ['warning', rep.warnings]]) {
    for (const x of list) {
      lines.push(`  ${kind} ${x.check}: ${x.message}`);
      if (x.nodes && x.nodes.length) lines.push(`    nodes: ${x.nodes.slice(0, 8).map(n => Array.isArray(n) ? n.join(' × ') : n).join('; ')}${x.nodes.length > 8 ? ' …' : ''}`);
      if (x.remedy) lines.push(`    remedy: ${x.remedy}`);
    }
  }
  return lines.join('\n');
}

async function renderOne(tree, opts, a, out, measure) {
  const L = lay(tree, opts, measure);
  const svg = draw(L, { fontCSS: fontFaceCSS() });
  const rep = check(L, { tree, svg, measure });
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out + '.svg', svg);
  fs.writeFileSync(out + '.report.json', JSON.stringify(rep, null, 2) + '\n');
  const written = [out + '.svg'];
  if (a.png) {
    const { svgToPng } = await import('../scripts/png.js');
    svgToPng(svg, { out: out + '.png', scale: +(a.scale || 1) });
    written.push(out + '.png');
  }
  console.log(summary(written.map(f => path.basename(f)).join(', '), rep));
  return rep;
}

async function main(argv) {
  const a = parseArgs(argv);
  if (a.help || !argv.length) { process.stdout.write(USAGE); return 0; }
  const sub = ['parse', 'carousel', 'check'].includes(a._[0]) ? a._.shift() : null;
  const file = a._[0];

  if (sub === 'parse' || a.emit === 'json') {
    const json = JSON.stringify(toJSON(readTree(file)), null, 2) + '\n';
    if (a.out) fs.writeFileSync(a.out, json); else process.stdout.write(json);
    return 0;
  }

  const tree = readTree(file);
  if (COGGLE_STYLE_NAMES.includes(a.style) || (!a.style && !sub && !CANVAS_FLAGS.some(k => a[k] != null))) {
    const { renderCoggle } = await import('../src/coggle/render.js');
    const style = a.style || 'coggle-exact';
    const r = await renderCoggle(tree, { style, outDir: a.out || '.', name: a.name || (a.style ? undefined : path.basename(file).replace(/\.(md|json|markdown)$/i, '')), png: !a['no-png'], scale: +(a.scale || 2), avoidCollisions: !a['allow-collisions'] });
    const b = r.L.bounds;
    console.log(`${Object.values(r.files).map(f => path.basename(f)).join(', ')}  style ${style} · ${Math.ceil(b.w + 60)}×${Math.ceil(b.h + 60)} · ${r.L.nodes.length} nodes`);
    return 0;
  }
  if (STYLE2_NAMES.includes(a.style)) {
    const { renderStyle2 } = await import('../src/styles2/index.js');
    const r = await renderStyle2(tree, { style: a.style, outDir: a.out || '.', name: a.name, png: !a['no-png'], scale: +(a.scale || 2), rootBox: !!a['root-box'] });
    const [, w, h] = /width="(\d+)" height="(\d+)"/.exec(r.svg);
    console.log(`${Object.values(r.files).map(f => path.basename(f)).join(', ')}  style ${a.style}${a['root-box'] ? ' (root box)' : ''} · ${w}×${h} · ${r.issues.length ? 'FAILED' : 'ok'}`);
    for (const x of r.issues) console.log('  error overlap: ' + x);
    return r.issues.length ? 1 : 0;
  }
  if (a.style || (!sub && !CANVAS_FLAGS.some(k => a[k] != null))) {
    const { renderStatic, reportLines, findStyle } = await import('../src/static-render.js');
    let styleFile;
    try { styleFile = findStyle(a.style); } catch (e) { throw new UsageError(e.message); }
    const name = a.name || (a.style ? undefined : path.basename(file).replace(/\.(md|json|markdown)$/i, ''));
    const r = await renderStatic(tree, styleFile, { outDir: a.out || '.', name, measure: await createMeasurer(), png: !a['no-png'], scale: +(a.scale || 2) });
    console.log(reportLines(Object.values(r.files).map(f => path.basename(f)).join(', '), r.report));
    return r.report.ok ? 0 : 1;
  }
  const opts = renderOptions(a);
  const measure = await createMeasurer();
  const base = a.out || `${path.basename(file).replace(/\.(md|json|markdown)$/i, '')}-${opts.format}`;

  if (sub === 'check') {
    const L = lay(tree, opts, measure);
    const rep = check(L, { tree, svg: draw(L, { fontCSS: fontFaceCSS() }), measure });
    process.stdout.write(JSON.stringify(rep, null, 2) + '\n');
    return rep.ok ? 0 : 1;
  }

  if (sub === 'carousel') {
    const F = getFormat(opts.format);
    const branches = tree.root.children;
    const N = branches.length;
    const reps = [await renderOne(tree, { ...opts, root: null, depth: 1, fold: [], open: [] }, a, `${base}-0-cover`, measure)];
    for (let i = 0; i < N; i++) {
      const kicker = (opts.frame.kicker ? opts.frame.kicker + ' · ' : '') + `Q${i + 1} of ${N}`;
      const card = { ...opts, root: branches[i].num, depth: a.depth != null ? opts.depth : F.depthCard, labels: opts.labels || 'lead', frame: { ...opts.frame, kicker } };
      reps.push(await renderOne(tree, card, a, `${base}-${i + 1}`, measure));
    }
    return reps.every(r => r.ok) ? 0 : 1;
  }

  const rep = await renderOne(tree, opts, a, base, measure);
  if (a.html) {
    const { buildPage } = await import('../src/bundle.js');
    fs.writeFileSync(base + '.html', buildPage(tree, { theme: opts.theme, view: opts.view, labels: opts.labels, depth: opts.depth, root: opts.root }));
    console.log(path.basename(base + '.html') + '  interactive page');
  }
  return rep.ok ? 0 : 1;
}

main(process.argv.slice(2)).then(code => process.exit(code), e => {
  if (e instanceof UsageError || /^unknown (format|theme)/.test(e.message)) { process.stderr.write(`tree-render: ${e.message}\n`); process.exit(2); }
  if (e && e.constructor && e.constructor.name === 'NoBrowserError') { process.stderr.write(e.message + '\n'); process.exit(3); }
  process.stderr.write(String(e && e.stack || e) + '\n');
  process.exit(1);
});
