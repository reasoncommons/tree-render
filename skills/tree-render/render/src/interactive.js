// interactive.js: the page script of the self-contained HTML (spec 8). Runs in the browser only;
// importing it in Node is harmless. start(config) renders the tree with the same layout and draw
// modules as the static output, on the web format, with a fold state mirrored in the URL hash:
//   click or tap a node (or its "+N") to fold or unfold it; Enter or Space when focused;
//   one compact bar: theme, view, labels, open to depth, expand all, collapse all, outline / map;
//   under 640 px: an outline instead of the map, and the controls behind one button.
import { layout } from './layout.js';
import { draw } from './draw.js';
import { parse, prune, reroot, count } from './parse.js';
import { THEMES, getTheme, hueOf, textHueOf } from './themes.js';
import { parseState, toHash } from './state.js';
import { createMeasurer } from './measure-browser.js';

const NARROW = 640;
const VIEWS = [['questions', 'questions'], ['qa', 'questions + answers'], ['answers', 'answers']];
const LABELS = [['full', 'full'], ['lead', 'short']];

export async function start(config) {
  const doc = document;
  const tree = parse(config.tree);
  const defaults = config.defaults;
  const maxDepth = (function deepest(n) { return n.children.length ? 1 + Math.max(...n.children.map(deepest)) : 0; })(tree.root);
  const state = { ...defaults, fold: [], open: [], map: false };
  const fromHash = () => {
    const h = parseState(location.hash);
    Object.assign(state, defaults, { fold: [], open: [], map: false }, h);
  };
  fromHash();
  const measure = await createMeasurer(doc);
  const stage = doc.getElementById('stage');
  const controls = doc.getElementById('controls');
  const menu = doc.getElementById('menu');
  const api = { state, render, toggle };
  window.__treeRender = api;

  const sync = () => {
    const h = toHash(state);
    if (location.hash.replace(/^#/, '') !== h) history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
  };
  const narrow = () => window.innerWidth < NARROW;

  // ---- controls
  const opt = (pairs, cur) => pairs.map(([v, t]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${t}</option>`).join('');
  function buildControls() {
    const depths = [];
    for (let d = 1; d <= Math.max(1, maxDepth); d++) depths.push([String(d), String(d)]);
    controls.innerHTML =
      `<label>theme <select id="theme">${opt(Object.keys(THEMES).map(k => [k, THEMES[k].name]), state.theme)}</select></label>` +
      `<label>show <select id="view">${opt(VIEWS, state.view)}</select></label>` +
      `<label>labels <select id="labels">${opt(LABELS, state.labels)}</select></label>` +
      `<label>depth <select id="depth">${opt(depths, String(Math.min(state.depth, maxDepth)))}</select></label>` +
      `<button id="expand" type="button">expand all</button>` +
      `<button id="collapse" type="button">collapse all</button>` +
      `<button id="mode" type="button"></button>`;
    const on = (id, ev, f) => doc.getElementById(id).addEventListener(ev, f);
    on('theme', 'change', e => { state.theme = e.target.value; render(); });
    on('view', 'change', e => { state.view = e.target.value; render(); });
    on('labels', 'change', e => { state.labels = e.target.value; render(); });
    on('depth', 'change', e => { state.depth = +e.target.value; state.fold = []; state.open = []; render(); });
    on('expand', 'click', () => { state.depth = maxDepth; state.fold = []; state.open = []; render(); });
    on('collapse', 'click', () => { state.depth = 1; state.fold = []; state.open = []; render(); });
    on('mode', 'click', () => { state.map = !state.map; render(); });
  }
  function updateControls() {
    const set = (id, v) => { const el = doc.getElementById(id); if (el && el.value !== v) el.value = v; };
    set('theme', state.theme); set('view', state.view); set('labels', state.labels); set('depth', String(Math.min(state.depth, maxDepth)));
    const mode = doc.getElementById('mode');
    mode.hidden = !narrow();
    mode.textContent = state.map ? 'outline' : 'map';
  }
  menu.addEventListener('click', () => {
    const open = doc.body.classList.toggle('menu-open');
    menu.setAttribute('aria-expanded', String(open));
  });

  // ---- theme on the page chrome
  function paint(T) {
    const s = doc.documentElement.style;
    s.setProperty('--bg', T.bg); s.setProperty('--ink', T.ink); s.setProperty('--muted', T.muted);
    s.setProperty('--rule', T.muted + '55'); s.setProperty('--bar', T.bg + 'E6'); s.setProperty('--focus', textHueOf(T, 1));
    doc.documentElement.style.colorScheme = T.key === 'slate' ? 'dark' : 'light';
  }

  // ---- fold
  // A node with visible children folds; a folded one (or one cut by the depth) opens one level.
  function toggle(num) {
    const fold = new Set(state.fold), open = new Set(state.open);
    const visible = currentTree();
    const n = findNum(visible, num);
    if (!n) return;
    if (n.children.length) { fold.add(num); open.delete(num); }
    else if (n.hidden) { fold.delete(num); open.add(num); }
    else return;
    state.fold = [...fold]; state.open = [...open];
    render();
  }
  function findNum(n, num) {
    if ((n.num == null ? 'root' : n.num) === num) return n;
    for (const c of n.children) { const r = findNum(c, num); if (r) return r; }
    return null;
  }
  function baseTree() {
    if (!state.root) return tree.root;
    return reroot(tree.root, state.root) || tree.root;
  }
  function currentTree() { return prune(baseTree(), state.depth, state.fold, state.open); }

  // ---- map
  function renderMap() {
    const L = layout(tree, {
      format: 'web', theme: state.theme, view: state.view, labels: state.labels, depth: state.depth,
      root: state.root, fold: state.fold, open: state.open, kickers: 'all',
    }, measure);
    stage.innerHTML = draw(L, { interactive: true });
    for (const g of stage.querySelectorAll('g.node')) {
      const foldable = g.querySelector('rect.hit');
      if (!foldable) { g.style.cursor = 'default'; continue; }
      const n = L.nodes.find(x => (x.num || 'root') === g.dataset.num);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-expanded', String(!!(n && n.children.length)));
      g.addEventListener('click', () => toggle(g.dataset.num));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(g.dataset.num); } });
    }
    api.layout = L;
  }

  // ---- outline (phone)
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function renderOutline() {
    const T = getTheme(state.theme);
    const root = currentTree();
    const rootHue = state.root ? Number(state.root.split('.')[0]) - 1 : -1;
    const item = (n, hue, d) => {
      const rule = d === 0 && hue < 0 ? T.ink : hueOf(T, hue);
      const ink = d === 0 && hue < 0 ? T.ink : textHueOf(T, hue);
      const key = n.num == null ? 'root' : n.num;
      const open = n.children.length > 0;
      const foldable = open || n.hidden > 0;
      const q = n.lead ? `<b>${esc(n.lead)}</b> ${esc(n.cont || '')}` : d === 1 ? `<b>${esc(n.text)}</b>` : esc(n.text);
      let label;
      if (state.view === 'answers' && n.answer) label = `<div class="k">${esc(n.text)}</div><div>${esc(n.answer)}</div>`;
      else if (state.labels === 'lead' && n.lead && d > 0) label = `<div><b>${esc(n.lead)}</b></div>${state.view === 'qa' && n.answer ? `<div class="ans">${esc(n.answer)}</div>` : ''}`;
      else label = `<div>${q}</div>${state.view === 'qa' && n.answer ? `<div class="ans">${esc(n.answer)}</div>` : ''}`;
      const tog = foldable ? `<span class="tog" style="color:${ink}" aria-hidden="true">${open ? '−' : '+' + (n.hidden || count(n))}</span>` : '<span class="tog"></span>';
      const attrs = foldable ? ` role="button" tabindex="0" aria-expanded="${open}"` : '';
      return `<li class="d${Math.min(d, 2)}" style="border-left-color:${rule}"><div class="row" data-num="${esc(key)}"${attrs}>${tog}<div class="lab">${label}</div></div>` +
        (open ? `<ul>${n.children.map(c => item(c, d === 0 && hue < 0 ? c.index : hue, d + 1)).join('')}</ul>` : '') + '</li>';
    };
    stage.innerHTML = `<div class="ol"><ul>${item(root, rootHue, 0)}</ul></div>`;
    for (const r of stage.querySelectorAll('.row[role="button"]')) {
      r.addEventListener('click', () => toggle(r.dataset.num));
      r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(r.dataset.num); } });
    }
  }

  function render() {
    const T = getTheme(state.theme);
    paint(T);
    const outline = narrow() && !state.map;
    doc.body.dataset.mode = outline ? 'outline' : 'map';
    if (outline) renderOutline(); else renderMap();
    updateControls();
    sync();
  }

  buildControls();
  window.addEventListener('hashchange', () => { fromHash(); render(); });
  let wasNarrow = narrow();
  window.addEventListener('resize', () => { if (narrow() !== wasNarrow) { wasNarrow = narrow(); render(); } });
  render();
  return api;
}
