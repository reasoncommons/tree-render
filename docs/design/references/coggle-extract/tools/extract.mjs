// Usage: node extract.mjs <public coggle diagram url> <out-prefix>  (needs playwright-core and a Playwright Chromium)
import { chromium } from 'playwright-core';
import fs from 'fs';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 2 });
const css = [];
p.on('response', async r => { if (r.request().resourceType() === 'stylesheet' && r.url().includes('coggle')) css.push({ url: r.url(), body: await r.text() }); });
await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(4000);
const data = await p.evaluate(() => {
  const nodesEl = document.querySelector('.diagram-editor .nodes');
  const origin = { left: nodesEl.style.left, top: nodesEl.style.top };
  const nodes = [...document.querySelectorAll('.diagram-editor .node-container[data-nodeid]')].map(n => {
    const c = n.querySelector('.node-content'); const t = n.querySelector('.text-content');
    const cs = getComputedStyle(t || c);
    const spans = [...n.querySelectorAll('.text-content *')].filter(e => e.children.length === 0).map(e => { const s = getComputedStyle(e); return { tag: e.tagName, text: e.textContent, weight: s.fontWeight, style: s.fontStyle, color: s.color, size: s.fontSize }; });
    const rect = c.getBoundingClientRect(); const tr = t.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(t); const lines = [...range.getClientRects()].map(r => ({ x: r.x, y: r.y, w: r.width, h: r.height }));
    const bg = n.querySelector('svg.shapebackground path');
    return { id: n.dataset.nodeid, cls: n.className, style: n.getAttribute('style'), contentStyle: c.getAttribute('style'), text: t.innerText,
      fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight, color: cs.color, textAlign: cs.textAlign, letterSpacing: cs.letterSpacing,
      contentPadding: getComputedStyle(c).padding, contentBox: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, textBox: { x: tr.x, y: tr.y, w: tr.width, h: tr.height }, lineRects: lines, spans,
      shape: bg ? { d: bg.getAttribute('d'), fill: bg.getAttribute('fill'), svg: bg.parentElement.outerHTML.slice(0, 300) } : null };
  });
  const conns = [...document.querySelectorAll('svg.pannable g.node-connection')].map(g => ({ id: g.dataset.nodeid, parent: g.parentElement.closest('g.node-connection')?.dataset.nodeid || null, transform: g.getAttribute('transform'),
    paths: [...g.children].filter(e => e.tagName === 'path').map(e => ({ d: e.getAttribute('d'), transform: e.getAttribute('transform'), fill: e.getAttribute('fill'), stroke: e.getAttribute('stroke'), sw: e.getAttribute('stroke-width'), lj: e.getAttribute('stroke-linejoin'), lc: e.getAttribute('stroke-linecap') })) }));
  const pann = document.querySelector('svg.pannable');
  const rootG = pann.firstElementChild.getAttribute('transform');
  const pr = pann.getBoundingClientRect();
  return { origin, rootG, pannableRect: { x: pr.x, y: pr.y }, viewBox: pann.getAttribute('viewBox'), editorClass: document.querySelector('.diagram-editor').className, bodyBg: getComputedStyle(document.querySelector('.diagram-editor-scroll')).backgroundColor, nodes, conns };
});
data.url = url;
fs.writeFileSync(out + '.json', JSON.stringify(data, null, 1));
for (const c of css) fs.writeFileSync(out + '-' + c.url.split('/').pop(), c.body);
// screenshot the diagram area
await p.screenshot({ path: out + '-page.png' });
await b.close();
console.log(data.nodes.length, 'nodes', data.conns.length, 'conns');
