#!/usr/bin/env node
// render.mjs — throwaway prototype driver.
// Builds a self-contained HTML page (fonts, d3-flextree, tree.js, the tree) and, for static formats,
// screenshots it with headless Chrome and extracts the SVG and metrics.
//
//   node render.mjs --tree ../examples/wise-ai-questions.md --format 4x5 --theme paper --depth 1 --out out/x
//   options: --view questions|qa|answers  --labels full|lead  --root 2 (re-root at node number "2" / "2.3")
//            --kicker "..." --footer "..."  --scale 2  --html (interactive page only, no PNG)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) args[k] = true; else { args[k] = v; i++; } }
}
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const fontDir = path.join(here, '..', 'archive', 'v0.1', 'tree-mindmap-skill', 'fonts');
const b64 = f => fs.readFileSync(f).toString('base64');
const fonts = `@font-face{font-family:ApfelRegular;src:url(data:font/otf;base64,${b64(path.join(fontDir, 'ApfelGrotezk-Regular.otf'))}) format("opentype")}` +
  `@font-face{font-family:ApfelMittel;src:url(data:font/otf;base64,${b64(path.join(fontDir, 'ApfelGrotezk-Mittel.otf'))}) format("opentype")}`;
const vendor = fs.readFileSync(path.join(here, 'vendor', 'd3-flextree.min.js'), 'utf8');
const lib = fs.readFileSync(path.join(here, 'lib', 'tree.js'), 'utf8');
const app = fs.readFileSync(path.join(here, 'lib', 'app.js'), 'utf8');
const md = fs.readFileSync(args.tree, 'utf8');

const opts = {
  format: args.format || '4x5', theme: args.theme || 'paper', view: args.view || 'questions', labels: args.labels || 'full',
  depth: args.depth != null ? +args.depth : 2, root: args.root || null,
  frame: { kicker: args.kicker || '', footer: args.footer || '' }, interactive: !!args.html, title: args.title || '', maxScale: args.maxScale ? +args.maxScale : 1, hue: args.hue || null
};
const out = args.out || 'out/render';
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${(opts.title || path.basename(args.tree)).replace(/</g, '&lt;')}</title>
<style>${fonts}
html,body{margin:0;padding:0}body{background:#888;font-family:ApfelRegular,system-ui,sans-serif}
#stage{display:inline-block;line-height:0}
.probe{position:absolute;left:-9999px;top:0;font-family:ApfelRegular}.probe b{font-family:ApfelMittel}
</style></head><body>
<span class="probe">measure<b>measure</b></span>
<div id="toolbar"></div><div id="stage"></div><pre id="metrics" style="display:none"></pre>
<script>${vendor}</script>
<script>${lib}</script>
<script>window.TREE_MD=${JSON.stringify(md)};window.OPTS=${JSON.stringify(opts)};</script>
<script>${app}</script>
</body></html>`;

const htmlPath = out + '.html';
fs.writeFileSync(htmlPath, html);
if (opts.interactive) { console.log('wrote', htmlPath); process.exit(0); }

// headless: dump DOM to get SVG + metrics
const url = 'file://' + path.resolve(htmlPath);
const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=4000', '--dump-dom', url], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).toString();
const mm = /<pre id="metrics"[^>]*>([\s\S]*?)<\/pre>/.exec(dom);
const metrics = JSON.parse(mm ? mm[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '{}');
const sm = /<div id="stage">([\s\S]*?)<\/div><pre/.exec(dom);
if (sm) fs.writeFileSync(out + '.svg', sm[1].replace(/&amp;/g, '&').replace('<svg ', `<svg ><style>${fonts}</style>`.replace('<svg >', '<svg ')).replace(/<svg ([^>]*)>/, (m, a) => `<svg ${a}><style>${fonts}</style>`));
const scale = +(args.scale || 1);
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=4000', `--force-device-scale-factor=${scale}`,
  `--window-size=${metrics.W},${metrics.H}`, `--screenshot=${path.resolve(out + '.png')}`, url], { stdio: 'ignore' });
console.log(path.basename(out), JSON.stringify(metrics));
if (!args.keep) fs.unlinkSync(htmlPath);
