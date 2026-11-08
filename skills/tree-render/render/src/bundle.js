// bundle.js (Node only): the browser build and the self-contained interactive page (task 7).
// No bundler: each ESM source becomes a function in one IIFE; `import { a, b as c } from './x.js'`
// becomes a lookup in the module table and `export` keywords are dropped. src/flextree.js is replaced
// by the vendored UMD build's window.d3.flextree. All modules' exports are merged onto window.TreeRender.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontFaceCSS } from './measure-node.js';
import { toJSON } from './parse.js';
import { getFormat } from './formats.js';

const SRC = path.dirname(fileURLToPath(import.meta.url));
export const VENDOR_FLEXTREE = path.join(SRC, '..', 'vendor', 'd3-flextree.min.js');

// In dependency order.
export const BROWSER_MODULES = ['themes', 'formats', 'wrap', 'parse', 'flextree', 'state', 'measure-browser', 'draw', 'layout', 'interactive'];

function transform(name, src) {
  if (name === 'flextree') return { body: 'const flextree = window.d3.flextree;', names: ['flextree'] };
  const names = [];
  let body = src.replace(/^import\s*\{([^}]*)\}\s*from\s*'\.\/([\w-]+)\.js';?\s*$/gm, (m, list, mod) => {
    if (!BROWSER_MODULES.includes(mod)) throw new Error(`bundle: ${name}.js imports ${mod}.js, which is not in the browser build`);
    const binds = list.split(',').map(s => s.trim()).filter(Boolean).map(s => s.replace(/\s+as\s+/, ': '));
    return `const { ${binds.join(', ')} } = __m[${JSON.stringify(mod)}];`;
  });
  body = body.replace(/^export\s+((?:async\s+)?function\*?\s+([\w$]+)|(?:const|let|var|class)\s+([\w$]+))/gm, (m, decl, fn, v) => { names.push(fn || v); return decl; });
  body = body.replace(/^export\s*\{([^}]*)\};?\s*$/gm, (m, list) => { names.push(...list.split(',').map(s => s.trim()).filter(Boolean)); return ''; });
  if (/^\s*(import|export)\b/m.test(body)) throw new Error(`bundle: ${name}.js has an import or export the bundler does not handle`);
  return { body, names };
}

export function bundleBrowser() {
  const parts = ['(function () {', "'use strict';", 'const __m = {};'];
  for (const name of BROWSER_MODULES) {
    const { body, names } = transform(name, name === 'flextree' ? '' : fs.readFileSync(path.join(SRC, name + '.js'), 'utf8'));
    parts.push(`// ---- ${name}.js`, `__m[${JSON.stringify(name)}] = (function () {`, body, `return { ${names.join(', ')} };`, '})();');
  }
  parts.push('window.TreeRender = Object.assign({}, ...Object.values(__m), { modules: __m });', '})();');
  return parts.join('\n');
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON safe inside <script>: no "</script>", no "<!--".
const scriptJSON = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));

// Page chrome. Colours are theme variables set by the page script from themes.js.
const PAGE_CSS = `
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font:14px/1.35 ApfelRegular,system-ui,sans-serif;-webkit-text-size-adjust:100%}
#bar{position:sticky;top:0;left:0;z-index:2;display:flex;align-items:center;gap:12px;padding:8px 16px;background:var(--bar);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--rule)}
#bar h1{font:15px/1.2 ApfelMittel,system-ui,sans-serif;margin:0;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#controls{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;margin-left:auto;color:var(--muted)}
#controls label{display:flex;align-items:center;gap:4px;white-space:nowrap}
#bar select,#bar button{font:13px ApfelRegular,system-ui,sans-serif;color:var(--ink);background:transparent;border:1px solid var(--rule);border-radius:6px;padding:3px 6px;min-height:28px;cursor:pointer}
#bar button:hover,#bar select:hover{border-color:var(--muted)}
#bar :focus-visible,#stage :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
#menu{display:none;margin-left:auto}
#stage{line-height:0}
#stage svg{display:block}
#stage g.node{cursor:pointer}
#stage g.node:focus{outline:none}
#stage g.node:focus-visible rect.hit{stroke:var(--focus);stroke-width:2}
.ol{font:16px/1.4 ApfelRegular,system-ui,sans-serif;color:var(--ink);max-width:720px;padding:12px 16px 48px;line-height:1.4}
.ol ul{list-style:none;margin:0;padding:0 0 0 10px}
.ol>ul{padding:0}
.ol li{border-left:3px solid;margin:4px 0;padding-left:8px}
.ol .row{display:flex;gap:8px;align-items:flex-start;padding:8px 0;min-height:44px;cursor:pointer}
.ol .tog{font:14px/1.6 ApfelMittel,system-ui,sans-serif;min-width:36px;flex:none}
.ol .lab{min-width:0;flex:1;overflow-wrap:anywhere}
.ol b{font-family:ApfelMittel;font-weight:normal}
.ol .ans,.ol .k{color:var(--muted);font-size:14px;margin-top:2px}
.ol .d0>.row .lab{font:20px/1.3 ApfelMittel,system-ui,sans-serif}
@media (max-width:639px){
  #bar{flex-wrap:wrap;padding:8px 12px}
  #bar h1{flex:1;white-space:normal}
  #menu{display:inline-block}
  #controls{display:none;width:100%;margin-left:0;padding-top:4px}
  body.menu-open #controls{display:flex}
}
`;

// The self-contained interactive page for a parsed tree. opts: { theme, view, labels, depth, root, title }.
export function buildPage(tree, opts = {}) {
  const F = getFormat('web');
  const config = {
    tree: toJSON(tree),
    defaults: {
      theme: opts.theme || 'paper',
      view: opts.view || (tree.kind === 'qa' || tree.kind === 'hypothesis' ? 'answers' : 'questions'),
      labels: opts.labels || 'full',
      depth: opts.depth != null ? opts.depth : F.depth,
      root: opts.root || null,
    },
  };
  const title = opts.title || tree.title || (tree.root && tree.root.text) || 'Tree';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${fontFaceCSS()}
${PAGE_CSS}</style></head>
<body data-mode="loading">
<header id="bar"><h1>${esc(title)}</h1><button id="menu" type="button" aria-expanded="false" aria-controls="controls">Options</button><div id="controls"></div></header>
<main id="stage" aria-live="polite"></main>
<script>${fs.readFileSync(VENDOR_FLEXTREE, 'utf8')}</script>
<script>${bundleBrowser()}</script>
<script>window.__treeRenderReady = TreeRender.start(${scriptJSON(config)});</script>
</body></html>
`;
}
