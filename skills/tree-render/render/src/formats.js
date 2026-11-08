// formats.js: every number of the design spec sections 2–5 that is not a colour. Sizes in canvas px.
// Themes (colour, stroke factor, numbering) live in themes.js.

// Shared by all formats.
export const COMMON = {
  availPad: 16,             // avail = W − 2·margin − availPad (spec 3.3, 3.7)
  colWeights: [1.0, 1.15, 1.3], // column budget weights: root, level 1, deeper (spec 3.3)
  wrapClamp: [0.8, 1.5],    // budgeted wrap clamped to this × nominal (spec 3.3)
  fillMinSlack: 30,         // fill pass runs when avail − mapW ≥ this (spec 3.6)
  fillRounds: 2,
  grow: [1.3, 1.15, 1],     // grow-to-fill type scales, tried in order (spec 3.8)
  growMinScale: 0.995,      // keep the first whose fit scale is at least this
  rootShrink: [1, 0.87, 0.76, 0.68], // adaptive root size (spec 5)
  rootMaxLines: 5,
  balanceFloor: 0.72,       // balanced wrap floor × wrap (spec 5)
  shelfLift: 0.26,          // shelf sits 0.26 × last line size below the block (spec 2)
  markerScale: 0.72,        // "+N" marker size × the level's text size (spec 5, 6)
  markerGap: 0.6,           // marker starts 0.6 × marker size after the last line (spec 6)
  markerWordMax: 1.15,      // a spelled marker must fit within 1.15 × its column's wrap (spec 6)
  answerMeasure: 30,        // answers wrap at most 30 × answer size (spec 5)
  answerGap: 0.4,           // gap before an answer in qa view, × answer size (spec 6)
  kickerBand: 2.2,          // frame kicker band height × kicker size (spec 3.7)
  footerBand: 2.4,          // frame footer band height × footer size (spec 3.7)
  baseline: 0.78,           // baseline at 0.78 × size below the line's ink top (spec 5)
  airAfterBranch: 0.5,
  curveK: 0.55,             // branch Bézier control points at 0.55 × dx (spec 2)
  ribbonSamples: 28,        // points sampled along a branch to build its ribbon (spec 2)
  taperRoot: 0.75,          // w0 = stroke[d − 1] × this at depth 1 …
  taperDeep: 0.9,           // … and × this deeper (spec 2)
  shelfTaper: 0.85,         // the shelf is drawn at 0.85 × the branch's end width (spec 2)
  hitMin: 44,               // interactive fold targets at least this tall (spec 8)      // candidate rule (spec 13): extra × lh before a childless node after a sibling with visible children
};

const SQUARE = {
  margin: 64, floor: 30, floorCard: 26,
  depth: 1, depthCard: 2,
  budget: { nodesFull: 8, nodesLead: 18, chars: 450 },
  root: { size: 46, wrap: 300, lh: 1.12 },
  levels: [
    { lead: 38, cont: 31, wrap: 340, lh: 1.22 },
    { lead: 31, cont: 31, wrap: 380, lh: 1.25 },
    { lead: 27, cont: 27, wrap: 380, lh: 1.25 },
  ],
  answer: { size: 26, lh: 1.28 },
  gapX: [128, 60, 52], sib: 0.45, cousin: 1.0,
  stroke: [10, 6.5, 4.5, 3.2], shelfOver: 12, trunk: 36,
  kicker: 24, footer: 22,
};

export const FORMATS = {
  '4x5': { ...SQUARE, W: 1080, H: 1350 },
  '1x1': { ...SQUARE, W: 1080, H: 1080, budget: { nodesFull: 6, nodesLead: 14, chars: null } },
  '16x9': {
    W: 1920, H: 1080, margin: 72, floor: 26, floorCard: 26,
    depth: 2, depthCard: 2,
    budget: { nodesFull: 20, nodesLead: 20, chars: 900 },
    root: { size: 48, wrap: 340, lh: 1.12 },
    levels: [
      { lead: 36, cont: 30, wrap: 400, lh: 1.22 },
      { lead: 27, cont: 27, wrap: 560, lh: 1.25 },
      { lead: 25, cont: 25, wrap: 480, lh: 1.25 },
      { lead: 24, cont: 24, wrap: 420, lh: 1.25 },
    ],
    answer: { size: 25, lh: 1.28 },
    gapX: [160, 68, 60, 50], sib: 0.35, cousin: 0.85,
    stroke: [10, 6.5, 4.5, 3.2, 2.4], shelfOver: 14, trunk: 40,
    kicker: 24, footer: 22,
  },
  web: {
    W: 0, H: 0, margin: 32, floor: 15, floorCard: 15,
    depth: 2, depthCard: 2,
    budget: null,
    root: { size: 26, wrap: 220, lh: 1.15 },
    levels: [
      { lead: 19, cont: 17, wrap: 260, lh: 1.3 },
      { lead: 17, cont: 17, wrap: 280, lh: 1.3 },
      { lead: 16, cont: 16, wrap: 280, lh: 1.3 },
      { lead: 15, cont: 15, wrap: 280, lh: 1.3 },
      { lead: 15, cont: 15, wrap: 280, lh: 1.3 },
    ],
    answer: { size: 15, lh: 1.32 },
    gapX: [96, 48, 44, 40, 40], sib: 0.45, cousin: 0.9,
    stroke: [6, 4, 2.8, 2, 1.6, 1.4], shelfOver: 10, trunk: 24,
    kicker: 14, footer: 13,
  },
};

export function getFormat(name) {
  const F = FORMATS[name];
  if (!F) throw new Error(`unknown format "${name}" (use ${Object.keys(FORMATS).join(', ')})`);
  return { ...COMMON, ...structuredClone(F), name };
}

// Style of a level (depth ≥ 1); deeper than the table uses the last row.
export function levelStyle(F, depth) { return F.levels[Math.min(depth - 1, F.levels.length - 1)]; }
export function gapAfter(F, d) { return F.gapX[Math.min(d, F.gapX.length - 1)]; }
export function strokeAt(F, d) { return F.stroke[Math.min(d, F.stroke.length - 1)]; }
