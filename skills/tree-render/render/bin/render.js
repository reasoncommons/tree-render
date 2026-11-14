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
import { PALETTE_NAMES } from '../src/palettes.js';

const USAGE = `Usage: tree-render <tree.md|tree.json> [--style NAME] [options]
                  writes <name>.svg and <name>.png (2x) in the current folder, or in --out DIR
       tree-render parse <tree.md|tree.json> [--out tree.json]
                  convert a Markdown tree to canonical JSON (render/TREE-FORMAT.md)
       tree-render --help legacy
                  the older canvas engine and styles (framed cards, carousel, interactive page)

Styles (--style NAME):
  ribbon         the default: bold root on a dot, tapered ribbons to each answer, hairlines to its points
  coggle-exact   Coggle's look, thick coloured S-curves, grey root box (Arimo)
  coggle-thin    Coggle's layout with IBM Plex Sans, half-width branches, outlined root
  dendrogram     bold root on a dot, dark S-curves to each answer, rounded elbows to its points
  lanes          ribbon's root and ribbons, each answer and its points on a soft grey band
  (other names in render/styles/ are legacy: see --help legacy)

Options (all styles):
  --out DIR             output folder (default: current folder)
  --name N              file name without extension (default: the tree's file name when no
                        --style is given, else the style's name)
  --no-png              write the SVG only (no browser needed)
  --scale 2             PNG pixel scale (default 2)
  --palette wise-ink|wise-print
                        replace the style's colours: background, branch colours, a red accent
                        branch (the level-1 node marked "accent", else the first starting "So"),
                        text ink and root box
  --font arimo|plex|atkinson|bricolage|merriweather|plexmono|quattro
                        set the text in that embedded font

Options (coggle-exact, coggle-thin):
  --sizes 22,17,15,14   font sizes in px: root, level 1, level 2, level 3+
  --depth N             show only N levels below the root
  --root-run short|coggle
                        how branches clear labels: short (default) draws Coggle's S over a
                        shorter shared run, then a straight tail; coggle is Coggle's own, widest
  --s-run N             force the root's shared S-run to N px (one tree at several widths)
  --allow-collisions    Coggle's own layout, even where a branch crosses a label

Options (ribbon, dendrogram, lanes):
  --root-style dot|centre|box|outline
                        the root question: right-aligned on a dot (default), centred on the dot,
                        in a light filled box (also --root-box) or a thin outlined box
  --curve coggle|coggle-l1|ribbon
                        the branch curve: coggle (default: Coggle's S for the level-1 branches and
                        ribbon's hairlines, over a run long enough to keep Coggle's corners),
                        coggle-l1 (Coggle's for the level-1 branches only), or ribbon (the older,
                        narrower S; also --curve current)

Exit codes: 0 ok; 1 a branch crosses a label or text overlaps (shorten the text and render
again); 2 usage error; 3 the PNG needs Chrome or Chromium (set CHROME=/path, or use --no-png).
`;

const LEGACY_USAGE = `Legacy: the older canvas engine and JSON styles. Kept working, but not developed and not
recommended for new images. Use the styles in tree-render --help.

Usage: tree-render <tree.md|tree.json> --format 4x5|1x1|16x9|web [options]   framed canvas render
       tree-render carousel <tree.md|tree.json> [options]   cover + one branch card per level-1 node
       tree-render check <tree.md|tree.json> [options]      the canvas engine's self-check report only
       tree-render <tree.md|tree.json> --style <style.json|name> [--out DIR] [--name N] [--no-png]
                  older JSON styles (render/styles/: river, coggle, v01, v01-thick, coggle-tree,
                  current, options-2026-11-11/...): writes DIR/N.svg, N.png (2x), N.report.json
       --style coggle-thin-mono|coggle-broadsheet|coggle-letterpress: parked coggle variants

Canvas options:
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

The canvas render writes <out>.svg and <out>.report.json and prints the report. Exit 1 on a hard
check failure (overlap, overflow, fidelity, fonts, markers), 2 on a usage error, 3 when a PNG
needs a browser.
`;

const VALUE_FLAGS = ['root-style', 'style', 'name', 'format', 'theme', 'view', 'labels', 'depth', 'root', 'kicker', 'footer', 'out', 'scale', 'state', 'emit', 'hue', 'font', 'sizes', 'root-run', 's-run', 'palette', 'curve'];
const BOOL_FLAGS = ['png', 'no-png', 'html', 'help', 'allow-collisions', 'root-box'];
// Flags of the framed canvas render; with none of them (and no --style) a tree renders statically in the default style
// (ribbon). --depth is not one: it applies to the coggle styles, so the canvas render needs --format (or another flag here).
const CANVAS_FLAGS = ['format', 'theme', 'view', 'labels', 'root', 'kicker', 'footer', 'state', 'hue', 'html'];

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
  if (a.help || !argv.length) { process.stdout.write(a._[0] === 'legacy' ? LEGACY_USAGE : USAGE); return 0; }
  const sub = ['parse', 'carousel', 'check'].includes(a._[0]) ? a._.shift() : null;
  const file = a._[0];

  if (sub === 'parse' || a.emit === 'json') {
    const json = JSON.stringify(toJSON(readTree(file)), null, 2) + '\n';
    if (a.out) fs.writeFileSync(a.out, json); else process.stdout.write(json);
    return 0;
  }

  const tree = readTree(file);
  // No --style (and no canvas flags): the default style, ribbon, named after the tree file.
  const defaultStyle = !a.style && !sub && !CANVAS_FLAGS.some(k => a[k] != null);
  if (COGGLE_STYLE_NAMES.includes(a.style)) {
    const { renderCoggle } = await import('../src/coggle/render.js');
    const { FONTS } = await import('../src/coggle/styles.js');
    const { findCollisions } = await import('../src/coggle/collide.js');
    const style = a.style;
    if (a.font != null && !FONTS[a.font]) throw new UsageError(`unknown font "${a.font}" (have: ${Object.keys(FONTS).join(', ')})`);
    let sizes;
    if (a.sizes != null) {
      sizes = a.sizes.split(',').map(Number);
      if (sizes.length !== 4 || !sizes.every(v => Number.isFinite(v) && v > 0)) throw new UsageError('--sizes takes four sizes in px: root,level1,level2,level3 (e.g. 22,17,15,14)');
    }
    if (a.depth != null && !/^\d+$/.test(a.depth)) throw new UsageError('--depth takes a whole number');
    const { ROOT_RUNS } = await import('../src/coggle/layout.js');
    if (a['root-run'] != null && !ROOT_RUNS[a['root-run']]) throw new UsageError(`unknown --root-run "${a['root-run']}" (have: ${Object.keys(ROOT_RUNS).join(', ')})`);
    if (a['s-run'] != null && !(+a['s-run'] > 0)) throw new UsageError('--s-run takes a run in px (e.g. 300)');
    if (a['s-run'] != null && a['root-run'] === 'coggle') throw new UsageError('--s-run needs --root-run short (the default)');
    if (a.palette != null && !PALETTE_NAMES.includes(a.palette)) throw new UsageError(`unknown palette "${a.palette}" (have: ${PALETTE_NAMES.join(', ')})`);
    const r = await renderCoggle(tree, { style, font: a.font, sizes, depth: a.depth != null ? +a.depth : undefined, rootRun: a['root-run'], sRun: a['s-run'] != null ? +a['s-run'] : undefined, palette: a.palette, outDir: a.out || '.', name: a.name, png: !a['no-png'], scale: +(a.scale || 2), avoidCollisions: !a['allow-collisions'] });
    const b = r.L.bounds;
    const hits = a['allow-collisions'] ? [] : findCollisions(r.L);
    const extra = [a.font && `font ${a.font}`, sizes && `sizes ${sizes.join('/')}`, a.depth != null && `depth ${a.depth}`, a['root-run'] && `root run ${a['root-run']}`, a['s-run'] && `S-run ${a['s-run']}`, a.palette && `palette ${a.palette}`].filter(Boolean).join(' · ');
    console.log(`${Object.values(r.files).map(f => path.basename(f)).join(', ')}  style ${style}${extra ? ' · ' + extra : ''} · ${Math.ceil(b.w + 60)}×${Math.ceil(b.h + 60)} · ${r.L.nodes.length} nodes${hits.length ? ' · FAILED' : ''}`);
    for (const h of hits) console.log(`  error overlap: branch ${h.branch} crosses label ${h.label}`);
    return hits.length ? 1 : 0;
  }
  if (STYLE2_NAMES.includes(a.style) || defaultStyle) {
    const style = a.style || 'ribbon';
    const { renderStyle2 } = await import('../src/styles2/index.js');
    const { CURVES } = await import('../src/styles2/shared.js');
    for (const k of ['sizes', 'depth', 'root-run', 's-run', 'allow-collisions']) if (a[k] != null) throw new UsageError(`--${k} works with --style coggle-exact or coggle-thin only`);
    if (a.curve != null && !CURVES.includes(a.curve)) throw new UsageError(`unknown --curve "${a.curve}" (have: ${CURVES.join(', ')})`);
    const { FONTS } = await import('../src/coggle/styles.js');
    if (a.palette != null && !PALETTE_NAMES.includes(a.palette)) throw new UsageError(`unknown palette "${a.palette}" (have: ${PALETTE_NAMES.join(', ')})`);
    if (a.font != null && !FONTS[a.font]) throw new UsageError(`unknown font "${a.font}" (have: ${Object.keys(FONTS).join(', ')})`);
    const r = await renderStyle2(tree, { style, outDir: a.out || '.', name: a.name || (a.style ? undefined : path.basename(file).replace(/\.(md|json|markdown)$/i, '')), png: !a['no-png'], scale: +(a.scale || 2), rootBox: a['root-box'] || a['root-style'] === 'box' ? true : a['root-style'] === 'outline' ? 'outline' : false, rootCentre: a['root-style'] === 'centre', palette: a.palette, font: a.font, curve: a.curve });
    const [, w, h] = /width="(\d+)" height="(\d+)"/.exec(r.svg);
    console.log(`${Object.values(r.files).map(f => path.basename(f)).join(', ')}  style ${style}${a['root-box'] ? ' (root box)' : a['root-style'] ? ` (root ${a['root-style']})` : ''}${a.palette ? ' · palette ' + a.palette : ''}${a.font ? ' · font ' + a.font : ''}${a.curve ? ' · curve ' + a.curve : ''} · ${w}×${h} · ${r.issues.length ? 'FAILED' : 'ok'}`);
    for (const x of r.issues) console.log('  error overlap: ' + x);
    if (r.dropped) console.log(`  note: ${style} draws two levels below the root; ${r.dropped} deeper node${r.dropped > 1 ? 's are' : ' is'} not drawn (--style coggle-exact draws every level)`);
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
