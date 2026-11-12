// directions/elegant.js: the round-2 mock-ups A, A-mono, D and D-hue (scripts/directions2.js). A and D became
// the `ribbon` and `lanes` styles; the engine lives in src/styles2/ribbon.js.
import { render } from '../styles2/ribbon.js';

export const A = { slug: 'A', render: (t) => render(t) };
export const AMono = { slug: 'A-mono', render: (t) => render(t, { mono: true }) };
export const D = { slug: 'D', render: (t) => render(t, { lanes: true }) };
export const DHue = { slug: 'D-hue', render: (t) => render(t, { lanes: true, hue: true }) };
