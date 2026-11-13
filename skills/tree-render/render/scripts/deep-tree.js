#!/usr/bin/env node
// deep-tree.js: nest whole trees under one root, for a three-level test tree (e.g. an overview and its question trees).
//   node scripts/deep-tree.js <top.json> <sub1.json> [<sub2.json> ...] [--out deep.json]
// The result keeps the top tree's title and root text, and its level 1 becomes each sub-tree's root (a question)
// with that tree's whole subtree under it: root → questions → answers → points. The top tree's own children are
// dropped (in an overview they are the answers in summary, which the sub-trees hold in full). Writes tree JSON.
import fs from 'node:fs';

const args = process.argv.slice(2);
const i = args.indexOf('--out');
const out = i >= 0 ? args.splice(i, 2)[1] : null;
const [top, ...subs] = args.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
if (!top || !subs.length) { console.error('usage: deep-tree.js top.json sub1.json [sub2.json ...] [--out deep.json]'); process.exit(2); }

const clean = (n) => ({ ...(n.lead ? { lead: n.lead } : {}), text: n.text, children: (n.children || []).map(clean) });
const deep = { title: top.title, kind: top.kind, root: { text: top.root.text, children: subs.map(s => clean(s.root)) } };
const json = JSON.stringify(deep, null, 2) + '\n';
if (out) fs.writeFileSync(out, json); else process.stdout.write(json);
