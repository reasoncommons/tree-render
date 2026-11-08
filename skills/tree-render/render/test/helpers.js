// Shared test helpers: fixture paths and readers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const EXAMPLES = path.resolve(here, '..', '..', '..', '..', 'examples');
export const FIXTURES = path.join(here, 'fixtures');
export const FONTS = path.resolve(here, '..', '..', 'fonts');

export const EXAMPLE_FILES = ['dam-media-questions.md', 'taiwan-trip-issue-tree.md', 'seeds-rebrand-qa.md', 'wise-ai-questions.md', 'wise-ai-answers.md'];

export function readExample(name) { return fs.readFileSync(path.join(EXAMPLES, name), 'utf8'); }
export function readFixture(name) { return fs.readFileSync(path.join(FIXTURES, name), 'utf8'); }
