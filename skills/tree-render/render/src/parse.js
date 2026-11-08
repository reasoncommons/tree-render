// parse.js: Markdown (spec 10) or canonical tree JSON (TREE-FORMAT.md) → { title, kind, source, root }.
// Markdown is one front-end; layout and draw only ever see the parsed tree.
// Node: { text, lead, cont, answer, children, depth, index, num }. The root has num null and index null.
// prune and reroot are pure: they return copies and never touch the parsed tree.

export function parse(input) {
  if (input && typeof input === 'object') return fromJSON(input);
  const s = String(input);
  if (/^\s*\{/.test(s)) return fromJSON(JSON.parse(s));
  return parseMarkdown(s);
}

export function parseMarkdown(md) {
  let title = '', kind = '', source = '';
  const stack = [];
  let root = null;
  for (const raw of md.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    let m;
    if (!title && (m = /^#\s+(.*)$/.exec(raw))) { title = m[1].trim(); continue; }
    if ((m = /^kind:\s*(.*)$/.exec(raw))) { kind = m[1].trim(); continue; }
    if ((m = /^source:\s*(.*)$/.exec(raw))) { source = m[1].trim(); continue; }
    m = /^(\s*)-\s+(.*)$/.exec(raw);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, '  ').length;
    const text = m[2].trim();
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].node : null;
    if (/^A:\s*/.test(text)) {
      if (parent) parent.answer = clean(text.replace(/^A:\s*/, ''));
      continue;
    }
    if (!parent && root) continue; // a second top-level bullet: only the first is the root
    const node = makeNode(splitLead(text));
    if (parent) parent.children.push(node); else root = node;
    stack.push({ node, indent });
  }
  if (root) number(root);
  return { title, kind, source, root };
}

// "**Lead** rest" / "**Lead:** rest" → lead + continuation. Anything else has no lead.
export function splitLead(text) {
  const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(text);
  if (m) {
    const lead = clean(m[1]), cont = clean(m[2]);
    return { lead, cont, text: cont ? lead + ' ' + cont : lead };
  }
  return { lead: null, cont: null, text: clean(text) };
}

// Markdown cleaning: [text](url) → text, **bold** and *emphasis* → plain, whitespace collapsed.
export function clean(s) {
  return String(s)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeNode({ text, lead, cont }) {
  return { text, lead, cont, answer: null, children: [], depth: 0, index: null, num: null };
}

// Sets depth, index and num ("2", "2.3", "2.3.1") from the root down. Mutates; used on fresh trees only.
function number(n, depth = 0, prefix = '') {
  n.depth = depth;
  n.children.forEach((c, i) => {
    c.index = i;
    c.num = prefix ? prefix + '.' + (i + 1) : String(i + 1);
    number(c, depth + 1, c.num);
  });
}

// Canonical tree JSON (TREE-FORMAT.md) → parsed tree. Node: { text, lead?, answer?, children? };
// `lead`, when present, opens `text` and the continuation is the rest. `cont` is accepted as an
// alternative to a full `text` (text = lead + ' ' + cont).
function fromJSON(obj) {
  const conv = (j) => {
    let lead = j.lead == null || j.lead === '' ? null : clean(j.lead);
    let text, cont = null;
    if (j.text != null) {
      text = clean(j.text);
      if (lead == null) ({ lead, cont, text } = splitLead(String(j.text)));
      else if (text.startsWith(lead)) cont = text.slice(lead.length).trim();
      else throw new Error(`tree JSON: lead "${lead}" does not open text "${text}"`);
    } else {
      cont = lead == null ? null : clean(j.cont || '');
      text = lead == null ? '' : (cont ? lead + ' ' + cont : lead);
    }
    const n = makeNode({ text, lead, cont });
    n.answer = j.answer ? clean(j.answer) : null;
    n.children = (j.children || []).map(conv);
    return n;
  };
  const root = obj.root ? conv(obj.root) : null;
  if (root) number(root);
  return { title: obj.title || '', kind: obj.kind || '', source: obj.source || '', root };
}

// Parsed tree → canonical tree JSON object (TREE-FORMAT.md). Derived fields (cont, depth, index,
// num, hidden) are left out; parse(toJSON(t)) rebuilds them.
export function toJSON(tree) {
  const conv = (n) => {
    const o = { text: n.text };
    if (n.lead != null) o.lead = n.lead;
    if (n.answer) o.answer = n.answer;
    o.children = n.children.map(conv);
    return o;
  };
  return { title: tree.title || '', kind: tree.kind || '', source: tree.source || '', root: tree.root ? conv(tree.root) : null };
}

// Number of descendants (not counting n).
export function count(n) { return n.children.reduce((s, c) => s + 1 + count(c), 0); }

export function find(n, pred) {
  if (pred(n)) return n;
  for (const c of n.children) { const r = find(c, pred); if (r) return r; }
  return null;
}

// Copy of the tree opened to `depth` levels below the root (root = 0), plus any node nums in `folded`
// closed. Every copied node gets `hidden` = number of descendants folded away under it (0 if open).
export function prune(root, depth, folded = []) {
  const fold = new Set(folded);
  const copy = (n, d) => {
    const cut = d >= depth || fold.has(n.num == null ? 'root' : n.num);
    const out = { ...n, children: [], hidden: 0 };
    if (cut) out.hidden = count(n);
    else out.children = n.children.map(c => copy(c, d + 1));
    return out;
  };
  return copy(root, 0);
}

// Copy of the sub-tree at node `num` with depths renumbered from 0; nums are kept so labels and fold
// state still refer to the source. `branchIndex` is the index of its top-level ancestor (its hue).
// Returns null if no node has that num.
export function reroot(root, num) {
  const target = find(root, n => n.num === num);
  if (!target) return null;
  const copy = (n, d) => ({ ...n, depth: d, children: n.children.map(c => copy(c, d + 1)) });
  const out = copy(target, 0);
  out.branchIndex = target.num ? Number(target.num.split('.')[0]) - 1 : null;
  return out;
}
