// Screenshot a public Coggle diagram with the page chrome hidden and a white background.
// Writes <out>.png (2x) and <out>.json {root:{x,y}, clip, scale} where root is the root node centre in CSS px within the clip.
import { chromium } from 'playwright-core';
import fs from 'fs';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const [url, out, pad = '30'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 2400, height: 1600 }, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(3000);
const info = await p.evaluate((pad) => {
  for (const s of ['.diagram-toolbar', '#diagram-header', '.status-bar', '#cookie-banner', '.cookie-banner', '.promo', '.signup-banner', '.help-button', '#intercom-container', '.topbar']) document.querySelectorAll(s).forEach(e => e.style.display = 'none');
  document.querySelectorAll('body > *').forEach(e => { const r = e.getBoundingClientRect(); if (getComputedStyle(e).position === 'fixed' && !e.querySelector('.diagram-editor')) e.style.display = 'none'; });
  const ed = document.querySelector('.diagram-editor');
  for (const e of [document.documentElement, document.body, ed]) e.style.setProperty('--c-bg', '#ffffff');
  ed.style.backgroundColor = '#ffffff';
  const root = document.querySelector('.node-container.root .node-content').getBoundingClientRect();
  const rc = { x: root.x + root.width / 2, y: root.y + root.height / 2 };
  let x = 1e9, y = 1e9, x2 = -1e9, y2 = -1e9;
  const add = r => { if (!r.width && !r.height) return; x = Math.min(x, r.x); y = Math.min(y, r.y); x2 = Math.max(x2, r.x + r.width); y2 = Math.max(y2, r.y + r.height); };
  document.querySelectorAll('.diagram-editor .node-container[data-nodeid] .text-content').forEach(e => add(e.getBoundingClientRect()));
  document.querySelectorAll('.diagram-editor .shapebackground').forEach(e => add(e.getBoundingClientRect()));
  document.querySelectorAll('svg.pannable g.node-connection path').forEach(e => add(e.getBoundingClientRect()));
  return { rc, box: { x: x - pad, y: y - pad, w: x2 - x + 2 * pad, h: y2 - y + 2 * pad } };
}, +pad);
// make sure the whole box is in the viewport
const vw = Math.ceil(Math.max(2400, info.box.x + info.box.w + 50)), vh = Math.ceil(Math.max(1600, info.box.y + info.box.h + 50));
await p.setViewportSize({ width: vw, height: vh });
await p.waitForTimeout(500);
const clip = { x: Math.round(info.box.x), y: Math.round(info.box.y), width: Math.round(info.box.w), height: Math.round(info.box.h) };
await p.screenshot({ path: out + '.png', clip });
fs.writeFileSync(out + '.json', JSON.stringify({ url, root: { x: info.rc.x - clip.x, y: info.rc.y - clip.y }, clip, scale: 2 }, null, 1));
await b.close();
console.log(JSON.stringify(info), clip);
