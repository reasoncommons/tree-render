// flextree.js: the vendored d3-flextree 2.1.2 (MIT). In the browser bundle the UMD build sets
// window.d3 and that copy is used; in Node it is loaded through require.
import { createRequire } from 'node:module';

const g = globalThis.d3 && globalThis.d3.flextree;
export const flextree = g || createRequire(import.meta.url)('../vendor/d3-flextree.min.js').flextree;
