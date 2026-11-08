// state.js: the fold state as a URL hash (spec 8), shared by the page and the CLI's --state.
//   #theme=paper&view=qa&labels=lead&depth=2&fold=2.3,3.4&open=1.2&root=2&map=1
// fold: nodes closed; open: nodes opened beyond the depth; root: re-root; map: force the map on a phone.
// Unknown keys and invalid values are dropped, so a stale or hand-edited link still opens.
import { THEMES } from './themes.js';

const VIEWS = ['questions', 'qa', 'answers'];
const LABELS = ['full', 'lead'];
const NUM = /^(root|\d+(\.\d+)*)$/;

export function parseState(hash) {
  const s = {};
  const q = String(hash || '').replace(/^#/, '');
  if (!q) return s;
  for (const part of q.split('&')) {
    const i = part.indexOf('=');
    const k = i < 0 ? part : part.slice(0, i);
    const v = i < 0 ? '' : decodeURIComponent(part.slice(i + 1));
    if (k === 'theme' && THEMES[v]) s.theme = v;
    else if (k === 'view' && VIEWS.includes(v)) s.view = v;
    else if (k === 'labels' && LABELS.includes(v)) s.labels = v;
    else if (k === 'depth' && /^\d+$/.test(v)) s.depth = +v;
    else if ((k === 'fold' || k === 'open') && v) s[k] = v.split(',').filter(x => NUM.test(x));
    else if (k === 'root' && /^\d+(\.\d+)*$/.test(v)) s.root = v;
    else if (k === 'map' && (v === '1' || v === '')) s.map = true;
  }
  return s;
}

export function toHash(s) {
  const parts = [];
  for (const k of ['theme', 'view', 'labels', 'depth']) if (s[k] != null && s[k] !== '') parts.push(k + '=' + encodeURIComponent(s[k]));
  for (const k of ['fold', 'open']) if (s[k] && s[k].length) parts.push(k + '=' + [...s[k]].join(','));
  if (s.root) parts.push('root=' + s.root);
  if (s.map) parts.push('map=1');
  return parts.join('&');
}
