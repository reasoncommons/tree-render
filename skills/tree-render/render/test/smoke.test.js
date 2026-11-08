import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const modules = ['parse', 'measure-node', 'measure-browser', 'wrap', 'formats', 'themes', 'layout', 'draw', 'check', 'interactive', 'bundle'];

for (const m of modules) {
  test(`imports src/${m}.js`, async () => {
    const mod = await import(`../src/${m}.js`);
    assert.equal(typeof mod, 'object');
  });
}

test('imports scripts/png.js', async () => {
  await import('../scripts/png.js');
});

test('bin/render.js --help prints usage', () => {
  const out = execFileSync(process.execPath, [path.join(here, '..', 'bin', 'render.js'), '--help']).toString();
  assert.match(out, /Usage: tree-render/);
});
