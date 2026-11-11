#!/usr/bin/env node
// coggle-compare.js: a side-by-side and overlay page comparing a Coggle original with our coggle-exact render.
//   node scripts/coggle-compare.js <ref.png> <ref.json> <ours.svg> <out-dir> [--title T] [--notes notes.html]
// ref.json (from the capture script) gives the root centre in CSS px within the 2× reference PNG; ours.svg
// carries data-root-x / data-root-y. Both are shown at 1 CSS px = 1 Coggle px, aligned on the root centre.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf('--' + k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const title = flag('title') || 'Coggle original vs coggle-exact';
const notesFile = flag('notes');
const [refPng, refJson, oursSvg, outDir] = args;
if (!outDir) { console.error('usage: coggle-compare.js ref.png ref.json ours.svg out-dir [--title T] [--notes notes.html]'); process.exit(2); }

const ref = JSON.parse(fs.readFileSync(refJson, 'utf8'));
const svg = fs.readFileSync(oursSvg, 'utf8');
const num = (k) => +svg.match(new RegExp(`${k}="([-\\d.]+)"`))[1];
const ours = { w: num('width'), h: num('height'), rx: num('data-root-x'), ry: num('data-root-y') };
const refW = ref.clip.width, refH = ref.clip.height;

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(refPng, path.join(outDir, 'coggle.png'));
fs.copyFileSync(oursSvg, path.join(outDir, 'ours.svg'));
const oursPng = oursSvg.replace(/\.svg$/, '.png');
const haveOursPng = fs.existsSync(oursPng);
if (haveOursPng) fs.copyFileSync(oursPng, path.join(outDir, 'ours.png'));

// Common frame for the overlay: both pictures placed so the root centres coincide.
const dx = ref.root.x - ours.rx, dy = ref.root.y - ours.ry;
const fx = Math.min(0, dx), fy = Math.min(0, dy);
const FW = Math.ceil(Math.max(refW, dx + ours.w) - fx), FH = Math.ceil(Math.max(refH, dy + ours.h) - fy);
const oursImg = haveOursPng ? 'ours.png' : 'ours.svg';
const notes = notesFile ? fs.readFileSync(notesFile, 'utf8') : '';

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
:root{--bg:#f4f4f2;--ink:#222;--muted:#666;--card:#fff}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,Helvetica,Arial,sans-serif}
h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}p{margin:4px 0;color:var(--muted);max-width:900px}
.row{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
figure{margin:0;background:var(--card);padding:8px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,.08);overflow:auto;max-width:100%}
figcaption{font-size:13px;color:var(--muted);margin-bottom:6px}
.frame{position:relative;width:${FW}px;height:${FH}px;background:#fff}
.frame img{position:absolute;display:block}
.ref{left:${-fx}px;top:${-fy}px;width:${refW}px;height:${refH}px}
.ours{left:${dx - fx}px;top:${dy - fy}px;width:${ours.w}px;height:${ours.h}px}
.overlay .ours{opacity:.5}
.diff .ours{mix-blend-mode:difference}
.diff{filter:invert(1)}
.notes{background:var(--card);padding:12px 16px;border-radius:6px;max-width:900px}
.notes li{margin:3px 0}
</style></head><body>
<h1>${title}</h1>
<p>Left: Coggle's own rendering of the live diagram (Chromium, page chrome hidden, background set to white). Right: our <code>--style coggle-exact</code> render of the same text. Both at 1 px = 1 Coggle px, aligned on the centre of the root box.</p>
<h2>Side by side</h2>
<div class="row">
<figure><figcaption>Coggle (original)</figcaption><img src="coggle.png" width="${refW}" height="${refH}" alt="Coggle original"></figure>
<figure><figcaption>Ours (coggle-exact)</figcaption><img src="${oursImg}" width="${ours.w}" height="${ours.h}" alt="Our render"></figure>
</div>
<h2>Overlay (ours at 50% over Coggle)</h2>
<figure><div class="frame overlay"><img class="ref" src="coggle.png" alt=""><img class="ours" src="${oursImg}" alt=""></div></figure>
<h2>Difference (identical pixels are white)</h2>
<figure><div class="frame diff"><img class="ref" src="coggle.png" alt=""><img class="ours" src="${oursImg}" alt=""></div></figure>
${notes ? `<h2>Remaining differences</h2><div class="notes">${notes}</div>` : ''}
</body></html>
`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(path.join(outDir, 'index.html'), `frame ${FW}×${FH}, ours offset (${dx.toFixed(1)}, ${dy.toFixed(1)})`);
