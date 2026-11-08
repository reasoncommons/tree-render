import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greedy, wrap } from '../src/wrap.js';
import { createMeasurer } from '../src/measure-node.js';
import { parse } from '../src/parse.js';
import { EXAMPLE_FILES, readExample } from './helpers.js';

// Fixed-pitch fake: every character (space included) is 10 px at size 10.
const mono = (text, size) => text.length * size;

test('greedy breaks at the width, never inside a word', () => {
  assert.deepEqual(greedy('aa bb cc dd'.split(' '), 50, mono, 10, 'R'), ['aa bb', 'cc dd']);
  assert.deepEqual(greedy(['supercalifragilistic', 'x'], 50, mono, 10, 'R'), ['supercalifragilistic', 'x']);
});

test('wrap returns measured lines', () => {
  const ls = wrap('aa bb cc', 1000, mono, 10, 'M');
  assert.deepEqual(ls, [{ t: 'aa bb cc', w: 80, size: 10, weight: 'M' }]);
});

test('balanced wrap narrows to keep the line count (fixed-pitch)', () => {
  // greedy at 110: "aaa bbb ccc" / "ddd" (4 + 0 imbalance); balanced: "aaa bbb" / "ccc ddd"
  const t = 'aaa bbb ccc ddd';
  assert.deepEqual(greedy(t.split(' '), 110, mono, 10, 'R'), ['aaa bbb ccc', 'ddd']);
  assert.deepEqual(wrap(t, 110, mono, 10, 'R').map(l => l.t), ['aaa bbb', 'ccc ddd']);
});

test('balanced wrap never goes below 0.72 × width', () => {
  // the narrowest 2-line width is 70 ("aaaaaa" / "bb cccc"), below 0.72 × 130 = 93.6, so the floor holds
  // the search at 93.6, where greedy still gives "aaaaaa bb" / "cccc"
  const t = 'aaaaaa bb cccc';
  assert.deepEqual(wrap(t, 130, mono, 10, 'R').map(l => l.t), ['aaaaaa bb', 'cccc']);
  assert.deepEqual(wrap(t, 130, mono, 10, 'R', 0.5).map(l => l.t), ['aaaaaa', 'bb cccc']);
});

const m = await createMeasurer();

test('node measurer: advance widths with kerning, scaled by size, cached', () => {
  const w = m('Hello world', 100, 'R');
  assert.ok(w > 400 && w < 700, `width ${w}`);
  assert.equal(m('Hello world', 50, 'R'), w / 2);
  assert.ok(m('Hello world', 100, 'M') !== w, 'Mittel differs from Regular');
  assert.ok(m('AV', 100, 'R') < m('A', 100, 'R') + m('V', 100, 'R'), 'kerning applied');
  assert.equal(m('', 30, 'R'), 0);
});

test('wrap of a known sentence at 340 px (31 px Regular)', () => {
  const s = 'What is the strongest case that current methods will scale, and how convincing is it?';
  const ls = wrap(s, 340, m, 31, 'R');
  assert.deepEqual(ls.map(l => l.t), EXPECTED_340);
  for (const l of ls) assert.ok(l.w <= 340);
});
const EXPECTED_340 = ['What is the strongest', 'case that current', 'methods will scale, and', 'how convincing is it?'];

test('balanced never changes the line count (every example label, three widths)', () => {
  for (const f of EXAMPLE_FILES) {
    const all = (n) => [n, ...n.children.flatMap(all)];
    for (const n of all(parse(readExample(f)).root)) {
      for (const width of [260, 340, 560]) {
        const words = n.text.split(/\s+/).filter(Boolean);
        const g = greedy(words, width, m, 31, 'R');
        const b = wrap(n.text, width, m, 31, 'R');
        assert.equal(b.length, g.length, `${f}: "${n.text}" at ${width}`);
        assert.equal(b.map(l => l.t).join(' '), words.join(' '), 'no words lost or changed');
      }
    }
  }
});
