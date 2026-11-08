// app.js — page script: parse → prune/re-root → layout → draw; interactive toolbar when OPTS.interactive.
(async function () {
  const P = window.TreeProto;
  const O = window.OPTS;
  await document.fonts.ready;
  const ctx = document.createElement('canvas').getContext('2d');
  const measure = P.makeMeasurer(ctx);
  const full = P.parse(window.TREE_MD);
  let base = full.root;
  if (O.root) { const r = P.find(full.root, n => n.num === O.root); if (r) base = r; }
  const collapsed = new Set();
  const stage = document.getElementById('stage');
  const metricsEl = document.getElementById('metrics');
  let state = { theme: O.theme, view: O.view, labels: O.labels, depth: O.depth };

  // a re-rooted card keeps the hue of its top-level ancestor
  function hueOf(n) { if (!O.root || O.hue === 'fresh') return null; let a = n; while (a.depth > 1) a = P.find(full.root, x => x.children.includes(a)); return a.depth === 1 ? a.index : null; }
  function visibleTree() {
    // depth prune, then collapse set (interactive)
    const copy = (n, d) => {
      const out = Object.assign({}, n, { children: [] });
      out.hidden = 0;
      const cut = (O.interactive ? collapsed.has(n.num || 'root') : false) || d >= state.depth;
      if (!cut) out.children = n.children.map(c => copy(c, d + 1));
      else out.hidden = P.count(n);
      return out;
    };
    return copy(base, 0);
  }
  function outline() {
    const T = P.THEMES[state.theme];
    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const item = (n, hue, d) => {
      const col = d === 0 ? T.ink : T.hues[hue % T.hues.length];
      const open = !collapsed.has(n.num || 'root') && d < state.depth;
      const kids = n.children.length;
      const q = n.lead ? `<b>${esc(n.lead)}</b> ${esc(n.cont || '')}` : esc(n.text);
      const a = n.answer && state.view !== 'questions' ? `<div class="ans">${esc(n.answer)}</div>` : '';
      const label = state.view === 'answers' && n.answer ? `<div class="k">${esc(n.text)}</div><div>${esc(n.answer)}</div>` : `<div>${q}</div>${a}`;
      return `<li style="border-left-color:${col}"><div class="row" data-num="${n.num || 'root'}">${kids ? `<span class="tog" style="color:${col}">${open ? '−' : '+' + P.count(n)}</span>` : '<span class="tog"></span>'}<div class="lab">${label}</div></div>` +
        (kids && open ? `<ul>${n.children.map((c, i) => item(c, d === 0 ? i : hue, d + 1)).join('')}</ul>` : '') + '</li>';
    };
    stage.innerHTML = `<style>
      .ol{font:16px/1.35 ApfelRegular;color:${T.ink};max-width:720px;padding:8px 16px 40px;box-sizing:border-box}
      .ol ul{list-style:none;margin:0;padding:0 0 0 10px}.ol>ul{padding:0}
      .ol li{border-left:3px solid;margin:6px 0;padding-left:10px}.ol>ul>li{border-left:4px solid ${T.ink};}
      .ol .row{display:flex;gap:8px;align-items:flex-start;padding:4px 0;cursor:pointer}
      .ol .tog{font-family:ApfelMittel;min-width:34px;font-size:14px;padding-top:2px}.ol .lab{min-width:0;flex:1}
      .ol b{font-family:ApfelMittel;font-weight:normal}.ol .ans,.ol .k{color:${T.muted};font-size:14px;margin-top:2px}
      .ol>ul>li>.row .lab{font-family:ApfelMittel;font-size:20px}
    </style><div class="ol"><ul>${item(base, -1, 0)}</ul></div>`;
    stage.style.display = 'block';
    stage.querySelectorAll('.row').forEach(r => r.addEventListener('click', () => { const k = r.dataset.num; if (collapsed.has(k)) collapsed.delete(k); else collapsed.add(k); render(); }));
    const ol = stage.querySelector('.ol');
    metricsEl.textContent = JSON.stringify({ view: 'outline', innerW: window.innerWidth, scrollW: document.documentElement.scrollWidth, olW: ol.getBoundingClientRect().width, stageW: stage.getBoundingClientRect().width, stageDisplay: getComputedStyle(stage).display });
  }
  function render() {
    document.body.style.background = P.THEMES[state.theme].bg;
    if (O.interactive && window.innerWidth < 640 && !state.forceMap) { outline(); return; }
    stage.style.display = 'inline-block';
    const tree = { title: full.title, kind: full.kind, root: visibleTree() };
    const noun = full.kind === 'hypothesis' ? 'points' : 'questions';
    const cover = !O.interactive && state.depth === 1;
    const word = cover ? noun : '';
    const lopts = { format: O.format, theme: state.theme, view: state.view, labels: state.labels, hue: hueOf(base), kickers: O.kickers || (O.interactive ? 'all' : 'root'), moreWord: word };
    const anyHidden = (n) => n.hidden || n.children.some(anyHidden);
    const frame = Object.assign({}, O.frame);
    const dopts = { format: O.format, theme: state.theme, frame, interactive: O.interactive, maxScale: 1 };
    // grow to fill: on fixed canvases try larger type first and keep the largest that still fits at scale 1
    let L, R;
    for (const k of (P.FORMATS[O.format].W ? [1.3, 1.15, 1] : [1])) {
      L = P.layout(tree, Object.assign({ sizeScale: k }, lopts), measure);
      R = P.draw(tree, L, dopts);
      if (R.scale >= 0.995 || k === 1) break;
    }
    // key for bare "+N" markers: on the footer, unless the cover managed to spell the word out
    const spelled = L.nodes.some(n => n.hidden && / /.test(n.moreLabel));
    if (!O.interactive && frame.footer && anyHidden(tree.root) && !spelled) { frame.footer = '+N: ' + noun + ' folded beneath  ·  ' + O.frame.footer; R = P.draw(tree, L, dopts); }
    stage.innerHTML = R.svg;
    document.body.style.background = L.T.bg;
    const ov = P.overlaps(L.nodes);
    const m = { W: R.W, H: R.H, scale: +R.scale.toFixed(3), minFont: +R.minFont.toFixed(1), floor: R.floor, mapW: Math.round(R.mapW), mapH: Math.round(R.mapH), nodes: R.nodeCount, overlaps: ov, warnings: L.warnings };
    metricsEl.textContent = JSON.stringify(m);
    if (O.interactive) wire();
  }
  function wire() {
    stage.querySelectorAll('.node').forEach(g => {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => { const k = g.dataset.num; if (collapsed.has(k)) collapsed.delete(k); else collapsed.add(k); render(); });
    });
  }
  if (O.interactive) {
    const tb = document.getElementById('toolbar');
    tb.style.cssText = 'position:sticky;top:0;z-index:2;padding:10px 16px;font:14px ApfelRegular,system-ui;display:flex;gap:10px;flex-wrap:wrap;align-items:center;backdrop-filter:blur(8px);background:rgba(255,255,255,.6)';
    tb.innerHTML = `<b style="font-family:ApfelMittel">${(full.title || '').replace(/</g, '&lt;')}</b>
      <label>theme <select id="theme">${Object.keys(P.THEMES).map(k => `<option value="${k}"${k === state.theme ? ' selected' : ''}>${P.THEMES[k].name}</option>`).join('')}</select></label>
      <label>show <select id="view"><option value="questions">questions</option><option value="qa">questions + answers</option><option value="answers">answers</option></select></label>
      <label>labels <select id="labels"><option value="full">full</option><option value="lead">short</option></select></label>
      <label>open to depth <select id="depth">${[1, 2, 3, 4, 5, 6].map(d => `<option value="${d}"${d === state.depth ? ' selected' : ''}>${d}</option>`).join('')}</select></label>
      <button id="expand">expand all</button><button id="collapse">collapse all</button><button id="map">outline / map</button>
      <span style="opacity:.6">click a node to fold or unfold it</span>`;
    tb.querySelector('#view').value = state.view; tb.querySelector('#labels').value = state.labels;
    tb.querySelector('#theme').onchange = e => { state.theme = e.target.value; render(); };
    tb.querySelector('#view').onchange = e => { state.view = e.target.value; render(); };
    tb.querySelector('#labels').onchange = e => { state.labels = e.target.value; render(); };
    tb.querySelector('#depth').onchange = e => { state.depth = +e.target.value; collapsed.clear(); render(); };
    tb.querySelector('#expand').onclick = () => { state.depth = 99; collapsed.clear(); render(); };
    tb.querySelector('#collapse').onclick = () => { state.depth = 1; collapsed.clear(); render(); };
    tb.querySelector('#map').onclick = () => { state.forceMap = !state.forceMap; render(); };
    window.addEventListener('resize', () => render());
  }
  render();
})();
