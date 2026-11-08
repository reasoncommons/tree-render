#!/usr/bin/env node
// png.js: screenshots with headless Chrome (task 6).
//   node scripts/png.js in.svg  [--out x.png] [--scale 2]
//   node scripts/png.js in.html --width 390 --height 844 [--out x.png] [--scale 2] [--full]
// An SVG is wrapped in a minimal HTML page and shot at its own width × height. An HTML page is loaded
// in an iframe of exactly width × height (Chrome floors its window at 500 px, so a phone width needs the
// iframe). Browser: $CHROME, else Google Chrome at the macOS default path, else Playwright's chromium or
// headless shell under ~/Library/Caches/ms-playwright (or ~/.cache/ms-playwright).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export function findBrowser(env = process.env) {
  if (env.CHROME) return fs.existsSync(env.CHROME) ? env.CHROME : null;
  if (fs.existsSync(MAC_CHROME)) return MAC_CHROME;
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) if (fs.existsSync(p)) return p;
  return playwrightBrowser();
}
export { playwrightBrowser };

function playwrightBrowser() {
  const roots = [path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'), path.join(os.homedir(), '.cache', 'ms-playwright')];
  const found = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const d of fs.readdirSync(root).sort().reverse()) {
      const base = path.join(root, d);
      if (d.startsWith('chromium_headless_shell-')) {
        for (const sub of safeList(base)) found.push(path.join(base, sub, 'chrome-headless-shell'));
      } else if (d.startsWith('chromium-')) {
        for (const sub of safeList(base)) {
          found.push(path.join(base, sub, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
          found.push(path.join(base, sub, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'));
          found.push(path.join(base, sub, 'chrome'));
        }
      }
    }
  }
  return found.find(p => fs.existsSync(p)) || null;
}
function safeList(d) { try { return fs.readdirSync(d); } catch { return []; } }

export class NoBrowserError extends Error {}
function browserOrThrow() {
  const b = findBrowser();
  if (!b) throw new NoBrowserError('tree-render: PNG needs Google Chrome or Chromium. Install Chrome, set CHROME=/path/to/chrome, or run `npx playwright install chromium`. SVG and HTML output do not need it.');
  return b;
}
const isHeadlessShell = b => /headless[-_]shell/.test(b);

function run(browser, args) {
  const mode = isHeadlessShell(browser) ? [] : ['--headless=new'];
  return execFileSync(browser, [...mode, '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', ...args],
    { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20, timeout: 60000 });
}

// Width × height from a PNG header.
export function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${file} is not a PNG`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

export function svgSize(svg) {
  const m = /<svg\b[^>]*?\swidth="([\d.]+)"[^>]*?\sheight="([\d.]+)"/.exec(svg);
  if (!m) throw new Error('SVG has no width and height');
  return { width: Math.ceil(+m[1]), height: Math.ceil(+m[2]) };
}

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'tree-render-png-')); }

// Shoots `htmlFile` (a page sized to width × height) to `out`.
function shoot(htmlFile, { width, height, scale = 1, out, budget = 4000 }) {
  const browser = browserOrThrow();
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  run(browser, [`--virtual-time-budget=${budget}`, `--force-device-scale-factor=${scale}`, `--window-size=${width},${height}`,
    `--screenshot=${path.resolve(out)}`, pathToFileURL(path.resolve(htmlFile)).href]);
  if (!fs.existsSync(out)) throw new Error(`browser wrote no PNG to ${out}`);
  return out;
}

const PROBE = `<pre id="tree-render-fonts" style="display:none"></pre><script>
(async () => {
  await Promise.all([document.fonts.load('40px ApfelRegular'), document.fonts.load('40px ApfelMittel')]);
  const c = document.createElement('canvas').getContext('2d'), w = f => { c.font = '40px ' + f; return +c.measureText('Hamburgefonstiv').width.toFixed(2); };
  document.getElementById('tree-render-fonts').textContent = JSON.stringify({ regular: document.fonts.check('40px ApfelRegular'), mittel: document.fonts.check('40px ApfelMittel'), widthRegular: w('ApfelRegular'), widthMittel: w('ApfelMittel'), widthFallback: w('serif') });
})();
</script>`;

function svgPage(svg, probe = false) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden}svg{display:block}</style></head><body>${svg}${probe ? PROBE : ''}</body></html>`;
}

// SVG string → PNG of exactly its width × height × scale.
export function svgToPng(svg, { out, scale = 1 }) {
  const { width, height } = svgSize(svg);
  const dir = tmpDir();
  try {
    const page = path.join(dir, 'page.html');
    fs.writeFileSync(page, svgPage(svg));
    shoot(page, { width, height, scale, out });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  return { out, width: width * scale, height: height * scale };
}

// Loads the SVG's fonts in the browser and reports whether Apfel Grotezk is used (glyph widths at 40 px
// differ from the fallback's). Returns { regular, mittel, widthRegular, widthMittel, widthFallback }.
export function fontProbe(svg) {
  const browser = browserOrThrow();
  const dir = tmpDir();
  try {
    const page = path.join(dir, 'probe.html');
    fs.writeFileSync(page, svgPage(svg, true));
    const dom = run(browser, ['--virtual-time-budget=4000', '--dump-dom', pathToFileURL(page).href]).toString();
    const m = /<pre id="tree-render-fonts"[^>]*>([^<]*)<\/pre>/.exec(dom);
    return m && m[1] ? JSON.parse(m[1]) : null;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// HTML page → PNG of its first width × height viewport (or, with fullHeight, as tall as given).
export function htmlToPng(file, { out, width, height, scale = 1, budget = 6000 }) {
  const dir = tmpDir();
  try {
    const wrap = path.join(dir, 'frame.html');
    fs.writeFileSync(wrap, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden}iframe{display:block;border:0;width:${width}px;height:${height}px}</style></head><body><iframe src="${pathToFileURL(path.resolve(file)).href}"></iframe></body></html>`);
    shoot(wrap, { width, height, scale, out, budget });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  return { out, width: width * scale, height: height * scale };
}

// CLI
function main(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const v = argv[i + 1]; if (v === undefined || v.startsWith('--')) args[a.slice(2)] = true; else { args[a.slice(2)] = v; i++; } } else args._.push(a);
  }
  const file = args._[0];
  if (!file || args.help) { process.stdout.write('Usage: png.js <in.svg|in.html> [--out x.png] [--scale 2] [--width W --height H] [--fonts]\n'); return 0; }
  const out = args.out || file.replace(/\.(svg|html)$/, '') + '.png';
  const scale = +(args.scale || 1);
  try {
    if (/\.svg$/.test(file)) {
      const svg = fs.readFileSync(file, 'utf8');
      const r = svgToPng(svg, { out, scale });
      console.log(JSON.stringify({ png: r.out, ...pngSize(r.out), ...(args.fonts ? { fonts: fontProbe(svg) } : {}) }));
    } else {
      const r = htmlToPng(file, { out, scale, width: +(args.width || 1400), height: +(args.height || 1000) });
      console.log(JSON.stringify({ png: r.out, ...pngSize(r.out) }));
    }
  } catch (e) {
    process.stderr.write((e instanceof NoBrowserError ? e.message : String(e.stack || e)) + '\n');
    return e instanceof NoBrowserError ? 3 : 1;
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
