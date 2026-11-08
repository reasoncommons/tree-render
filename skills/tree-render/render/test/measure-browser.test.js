// Node (opentype.js) and browser (canvas) measurers must agree within 1.5%. Runs the browser side in
// headless Chrome; skipped when Chrome is not installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createMeasurer } from '../src/measure-node.js';
import { FONTS, here } from './helpers.js';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const hasChrome = fs.existsSync(CHROME);

const SAMPLES = [
  ['How should we approach the development of AI wisely?', 46, 'M'],
  ['Q1. Alignment:', 38, 'M'],
  ['can we align AI, and what role can wisdom traditions play?', 31, 'R'],
  ['What would it mean for AI to be aligned, or good?', 31, 'R'],
  ['Aligned to what: instructions, preferences, wellbeing, values, the good?', 27, 'R'],
  ['Must AI be wise, or is "safe and corrigible" enough?', 27, 'R'],
  ['Can we read a model\'s reasoning, and is it faithful?', 25, 'R'],
  ['+21 questions', 22, 'M'],
  ['+7', 22, 'M'],
  ['1.1.2 Which departure plan? ⚖️ 🔥🔥🔥', 27, 'R'],
  ['AVAVA Toy Wave Yo', 40, 'R'],
  ['Wise AI briefing · question tree · Q2 of 4', 24, 'R'],
  ['Rufus Pollock · draft · 8 Nov 2026', 22, 'R'],
  ['Seeds of Renaissance rebrand (Coggle has a stub)', 19, 'M'],
  ['What does social media teach us?', 17, 'R'],
  ['So: can we align AI,', 36, 'M'],
  ['Is a slower or different trajectory desirable (pause, pacing, steering)', 30, 'R'],
  ['0123456789 — – … “quotes” ‘single’', 26, 'R'],
  ['Montessori school: sorted ✓', 16, 'R'],
  ['Who decides?', 15, 'M'],
];

test('node and browser measurers agree within 1.5% on 20 strings', { skip: !hasChrome && 'Chrome not found' }, async () => {
  const b64 = f => fs.readFileSync(path.join(FONTS, f)).toString('base64');
  const lib = fs.readFileSync(path.join(here, '..', 'src', 'measure-browser.js'), 'utf8').replace(/^export\s+/gm, '');
  const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:ApfelRegular;src:url(data:font/otf;base64,${b64('ApfelGrotezk-Regular.otf')}) format("opentype")}
@font-face{font-family:ApfelMittel;src:url(data:font/otf;base64,${b64('ApfelGrotezk-Mittel.otf')}) format("opentype")}
</style><pre id="out"></pre><script>${lib}
(async () => {
  const m = await createMeasurer();
  const S = ${JSON.stringify(SAMPLES)};
  document.getElementById('out').textContent = JSON.stringify(S.map(([t, s, w]) => m(t, s, w)));
})();</script>`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-render-'));
  const file = path.join(dir, 'measure.html');
  fs.writeFileSync(file, html);
  const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=4000', '--dump-dom', 'file://' + file], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 << 20 }).toString();
  fs.rmSync(dir, { recursive: true, force: true });
  const mm = /<pre id="out">([^<]*)<\/pre>/.exec(dom);
  assert.ok(mm && mm[1], 'browser produced measurements');
  const browser = JSON.parse(mm[1]);
  const node = await createMeasurer();
  SAMPLES.forEach(([t, s, w], i) => {
    const a = node(t, s, w), b = browser[i];
    const diff = Math.abs(a - b) / b;
    assert.ok(diff <= 0.015, `"${t}" ${s}${w}: node ${a.toFixed(1)} vs browser ${b.toFixed(1)} (${(diff * 100).toFixed(2)}%)`);
  });
});
