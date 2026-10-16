// village-tiles.mjs - Platinum-inspired 16x16 exterior tiles for Bjorvik.
//
// Rules for this pass (see the Fjellheim visual reference brief):
// - hand-placed motifs on a fixed grid, no random speckle noise;
// - hue-shifted ramps from village-palette.mjs;
// - ground transitions are autotiled: each family has 16 edge variants keyed
//   by a 4-bit neighbour mask (N=1, E=2, S=4, W=8) chosen by the renderer;
// - decorations are drawn on transparency and rendered on an overlay layer, so
//   they never carry a square of baked-in grass;
// - objects get a 1px ink outline, ground tiles never do.
import { Pix } from "./pix.mjs";
import { V, stamp, outlineWith } from "./village-palette.mjs";

const N = 1;
const E = 2;
const S = 4;
const W = 8;
export const MASKS = Array.from({ length: 16 }, (_, i) => i);

/* ================================================================ grass */

const TUFT = ["4.4", "2.2", ".2."];
const TUFT_MAP = { 4: V.g4, 2: V.g2 };
const GRASS_LAYOUTS = {
  grass: { tufts: [[1, 2], [9, 1], [5, 7], [12, 8], [2, 12], [9, 12]], specks: [[6, 2], [14, 4], [1, 7], [10, 10], [5, 14]] },
  grass2: { tufts: [[3, 1], [11, 4], [1, 8], [7, 10], [12, 13]], specks: [[8, 1], [5, 5], [14, 9], [3, 14], [10, 7]] },
  grass3: { tufts: [[6, 3], [2, 10], [11, 11]], specks: [[2, 3], [12, 2], [8, 8], [5, 14], [14, 13]] },
  meadow: { tufts: [[2, 1], [10, 2], [6, 6], [13, 9], [1, 11], [8, 12]], specks: [[5, 1], [14, 1], [3, 5], [11, 6], [6, 10], [12, 14], [2, 15]] },
};

function drawGrass(p, layout = GRASS_LAYOUTS.grass) {
  p.rect(0, 0, 16, 16, V.g3);
  for (const [x, y] of layout.tufts) stamp(p, x, y, TUFT, TUFT_MAP);
  for (const [x, y] of layout.specks) {
    p.set(x, y, V.g4);
    p.set(x, y + 1, V.g2);
  }
}

/**
 * Grass variants: the renderer picks one per cell from a position hash, so no
 * two neighbouring screens repeat. Layouts are sparse hand-style motifs from a
 * fixed seed (minimum spacing, away from tile borders), not per-pixel noise.
 */
export const GRASS_VARIANTS = 8;
function grassLayout(seed) {
  let a = (seed * 2654435761) >>> 0;
  const rnd = () => {
    a ^= a << 13;
    a >>>= 0;
    a ^= a >>> 17;
    a ^= a << 5;
    a >>>= 0;
    return (a % 1000) / 1000;
  };
  const pts = [];
  const far = (x, y, d) => pts.every(([px, py]) => Math.abs(px - x) + Math.abs(py - y) >= d);
  const tufts = [];
  for (let tries = 0; tries < 80 && tufts.length < 3 + (seed % 3); tries++) {
    const x = 1 + Math.floor(rnd() * 12);
    const y = 1 + Math.floor(rnd() * 12);
    if (far(x, y, 6)) {
      tufts.push([x, y]);
      pts.push([x, y]);
    }
  }
  const specks = [];
  for (let tries = 0; tries < 80 && specks.length < 3 + (seed % 2); tries++) {
    const x = 1 + Math.floor(rnd() * 14);
    const y = 1 + Math.floor(rnd() * 13);
    if (far(x, y, 4)) {
      specks.push([x, y]);
      pts.push([x, y]);
    }
  }
  return { tufts, specks };
}

/** rare feature tiles mixed into open grass */
const GRASS_FEATURES = {
  clover: (p) => {
    drawGrass(p, GRASS_LAYOUTS.grass3);
    for (const [x, y] of [[4, 5], [6, 4], [5, 7], [10, 9], [12, 8], [11, 11]]) {
      stamp(p, x, y, [".4.", "434", ".2."], { 4: V.g5, 3: V.g4, 2: V.g2 });
    }
    p.set(6, 6, V.cream);
    p.set(11, 10, V.cream);
  },
  clump: (p) => {
    drawGrass(p, GRASS_LAYOUTS.grass3);
    stamp(
      p,
      3,
      5,
      ["...4..4...", "..424.24..", ".42224224.", "4222222224", ".22121122.", "..111111.."],
      { 4: V.g4, 2: V.g2, 1: V.g1 },
    );
  },
};

/** pixel colour of the plain grass tile at (x,y) - used so fringes join seamlessly */
const GRASS_REF = (() => {
  const p = new Pix(16, 16);
  drawGrass(p);
  return p;
})();

/* ================================================================ edge fringes */

// hand-picked fringe depth profiles (1..3 px); ends match neighbours (2).
// Three sets are picked per cell by the renderer so long edges never repeat.
const PROFS = [
  {
    [N]: [2, 2, 3, 2, 1, 2, 2, 3, 3, 2, 2, 1, 2, 2, 3, 2],
    [S]: [2, 1, 2, 2, 3, 2, 2, 2, 1, 2, 3, 3, 2, 2, 1, 2],
    [W]: [2, 3, 2, 2, 1, 2, 3, 2, 2, 2, 1, 2, 3, 2, 2, 2],
    [E]: [2, 2, 1, 2, 3, 3, 2, 2, 1, 2, 2, 3, 2, 1, 2, 2],
  },
  {
    [N]: [2, 1, 1, 2, 3, 3, 2, 2, 1, 2, 3, 2, 1, 1, 2, 2],
    [S]: [2, 3, 3, 2, 1, 2, 2, 3, 2, 1, 1, 2, 3, 2, 2, 2],
    [W]: [2, 2, 1, 1, 2, 3, 3, 2, 1, 2, 2, 3, 2, 1, 1, 2],
    [E]: [2, 3, 2, 1, 1, 2, 2, 3, 3, 2, 1, 2, 2, 3, 2, 2],
  },
  {
    [N]: [2, 3, 2, 2, 2, 1, 2, 3, 2, 1, 1, 2, 3, 3, 2, 2],
    [S]: [2, 2, 1, 1, 2, 3, 2, 1, 2, 3, 2, 2, 1, 2, 3, 2],
    [W]: [2, 1, 2, 3, 3, 2, 1, 1, 2, 3, 2, 1, 2, 2, 3, 2],
    [E]: [2, 1, 2, 2, 3, 2, 1, 2, 3, 3, 2, 2, 1, 1, 2, 2],
  },
];
let PROF = PROFS[0];

/** does the grass fringe cover (x,y) for this edge mask? */
function fringeAt(mask, x, y) {
  if (mask & N && y < PROF[N][x]) return true;
  if (mask & S && y > 15 - PROF[S][x]) return true;
  if (mask & W && x < PROF[W][y]) return true;
  if (mask & E && x > 15 - PROF[E][y]) return true;
  // rounded outer corners
  if (mask & N && mask & W && x + y < 5) return true;
  if (mask & N && mask & E && 15 - x + y < 5) return true;
  if (mask & S && mask & W && x + 15 - y < 5) return true;
  if (mask & S && mask & E && 30 - x - y < 5) return true;
  return false;
}

/**
 * Overlay a grass fringe on edges in `mask`. Boundary pixels get a lit lip on
 * the grass side and a contact shadow on the terrain side (light from above).
 */
function grassFringe(p, mask, terrainShadow, prof = 0) {
  if (!mask) return;
  PROF = PROFS[prof];
  const inG = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && fringeAt(mask, x, y);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (inG(x, y)) {
        const below = y < 15 && !inG(x, y + 1);
        const above = y > 0 && !inG(x, y - 1);
        const side = (x > 0 && !inG(x - 1, y)) || (x < 15 && !inG(x + 1, y));
        let c = V.g3;
        if (below) c = V.g1; // bottom lip of overhanging grass
        else if (above) c = V.g4; // sunlit top lip
        else if (side) c = V.g2;
        p.set(x, y, c);
      } else if (y > 0 && inG(x, y - 1)) {
        p.set(x, y, terrainShadow); // shadow cast by the grass edge above
      }
    }
}

/* ================================================================ path */

const PEBBLE = ["43", "21"];
function pebbleMap() {
  return { 4: "#f2e4c4", 3: "#c8aa7a", 2: V.d1, 1: V.d0 };
}

const PATH_LAYOUTS = {
  path: { dashes: [[2, 3], [10, 2], [6, 8], [12, 11], [1, 13]], pebbles: [[9, 6]] },
  path2: { dashes: [[4, 1], [11, 5], [1, 7], [8, 12], [13, 14]], pebbles: [] },
};

function drawPath(p, layout) {
  p.rect(0, 0, 16, 16, V.d3);
  for (const [x, y] of layout.dashes) {
    p.set(x, y, V.d4);
    p.set(x + 1, y, V.d4);
    p.set(x + 1, y + 1, V.d2);
    p.set(x + 2, y + 1, V.d2);
  }
  for (const [x, y] of layout.pebbles) stamp(p, x, y, PEBBLE, pebbleMap());
}

/* ================================================================ sand */

const SAND_LAYOUTS = {
  sand: { ripples: [[1, 3], [8, 6], [3, 11], [11, 13]], glints: [[13, 2], [6, 1], [14, 9], [1, 15]] },
  sand2: { ripples: [[4, 2], [10, 9], [1, 7], [7, 14]], glints: [[2, 1], [12, 5], [5, 11], [14, 14]] },
};

function drawSand(p, layout) {
  p.rect(0, 0, 16, 16, V.s2);
  for (const [x, y] of layout.ripples) {
    // gentle wind ripple: lit crest over a soft trough
    p.set(x, y + 1, V.s1);
    p.set(x + 1, y, V.s3);
    p.set(x + 2, y, V.s3);
    p.set(x + 3, y + 1, V.s1);
    p.set(x + 1, y + 1, V.s1);
    p.set(x + 2, y + 1, V.s1);
  }
  for (const [x, y] of layout.glints) p.set(x, y, V.s4);
}

/* ================================================================ cobble (plaza flagstones) */

// '#' = mortar; letters = individual stones; shading is derived per stone
const FLAGS_A = [
  "################",
  "#aaaaaaa#bbbbbbb",
  "#aaaaaaa#bbbbbbb",
  "#aaaaaaa#bbbbbbb",
  "#aaaaaaa#bbbbbbb",
  "#aaaaaaa########",
  "#########ccccccc",
  "#dddddd#ccccccc#",
  "#dddddd#ccccccc#",
  "#dddddd#ccccccc#",
  "#dddddd#########",
  "#dddddd#eeeeeee#",
  "########eeeeeee#",
  "#fffffff#eeeeee#",
  "#fffffff#eeeeee#",
  "#fffffff#eeeeee#",
];
const FLAGS_B = [
  "################",
  "#aaaaa#bbbbbbbb#",
  "#aaaaa#bbbbbbbb#",
  "#aaaaa#bbbbbbbb#",
  "#aaaaa#bbbbbbbb#",
  "#aaaaa##########",
  "#######cccccc#dd",
  "#eeeee#cccccc#dd",
  "#eeeee#cccccc#dd",
  "#eeeee#cccccc#dd",
  "#eeeee########dd",
  "#eeeee#fffffff#d",
  "#######fffffff##",
  "#ggggg#fffffff#h",
  "#ggggg#fffffff#h",
  "#ggggg#fffffff#h",
];
// per-stone tone: slight warm/cool variation keeps the plaza from looking tiled
// worn granite flags: varied warm/cool tones, one darker weathered stone
const STONE_TONES = [
  ["#bdb6a6", "#d2ccbc", "#a29a8c"],
  ["#b2aea6", "#c8c4ba", "#9a958e"],
  ["#c4baa6", "#d6ccb8", "#a69c8a"],
  ["#aaa49a", "#bfb9ae", "#928c84"],
  ["#c0b8b0", "#d4cec6", "#a49e96"],
];
const MORTAR = "#968d80";

function drawFlagstones(p, grid) {
  for (let y = 0; y < 16; y++) {
    if (grid[y].length !== 16) throw new Error("flagstone row must be 16 wide");
    for (let x = 0; x < 16; x++) {
      const ch = grid[y][x];
      if (ch === "#") {
        p.set(x, y, MORTAR);
        continue;
      }
      const tone = STONE_TONES[(ch.charCodeAt(0) * 7) % STONE_TONES.length];
      const up = y === 0 || grid[y - 1][x] === "#";
      const left = x === 0 || grid[y][x - 1] === "#";
      const down = y === 15 || grid[y + 1]?.[x] === "#";
      const right = x === 15 || grid[y][x + 1] === "#";
      let c = tone[0];
      if (up || left) c = tone[1];
      if (down || right) c = tone[2];
      p.set(x, y, c);
    }
  }
}

/* ================================================================ water */

const RIPPLES = [
  [1, 2],
  [9, 4],
  [4, 8],
  [12, 10],
  [2, 13],
  [10, 14],
];

function drawWater(p, frame) {
  p.rect(0, 0, 16, 16, V.w2);
  // a few deeper patches give the surface body
  for (const [x, y] of [[6, 1], [13, 6], [0, 9], [7, 12]]) {
    p.rect(x, y, 3, 1, V.w1);
  }
  for (let i = 0; i < RIPPLES.length; i++) {
    const [bx, by] = RIPPLES[i];
    const x = (bx + frame * (i % 2 ? 1 : -1) + 16) % 16;
    // short crest: light line, bright end, darker trough under it
    for (let k = 0; k < 4; k++) p.set((x + k) % 16, by, k === 1 ? V.w4 : V.w3);
    p.set((x + 1) % 16, by + 1, V.w1);
    p.set((x + 2) % 16, by + 1, V.w1);
  }
  if (frame === 1) p.set(7, 6, V.w5);
  if (frame === 2) p.set(13, 13, V.w5);
}

/** foam lip where the water meets land on edges in `mask` */
function waterEdges(p, mask, frame) {
  const wob = (i) => ((i * 5 + frame * 3) % 7 < 3 ? 1 : 0);
  for (let i = 0; i < 16; i++) {
    if (mask & N) {
      p.set(i, 0, V.w5);
      p.set(i, 1, wob(i) ? V.w5 : V.w4);
      p.set(i, 2, V.w3);
    }
    if (mask & S) {
      p.set(i, 15, V.w5);
      p.set(i, 14, wob(i) ? V.w4 : V.w3);
    }
    if (mask & W) {
      p.set(0, i, V.w5);
      p.set(1, i, wob(i) ? V.w5 : V.w4);
    }
    if (mask & E) {
      p.set(15, i, V.w5);
      p.set(14, i, wob(i) ? V.w5 : V.w4);
    }
  }
}

/* ================================================================ cliffs */

/**
 * Granite face built from hand-placed boulders (centres in a 16x32 block that
 * spans the upper and base face rows and wraps horizontally). Each pixel joins
 * its nearest boulder; shading runs light (upper-left) to dark (lower-right)
 * inside each boulder and seams between boulders become crevices.
 */
const BOULDERS = [
  [3, 3], [10, 2], [15, 6], [6, 9], [12, 11], [1, 13], [8, 17], [14, 19], [3, 21], [10, 25], [5, 29], [14, 29], [0, 26],
];
function rockAt(x, y) {
  let best = Infinity;
  let second = Infinity;
  let cx = 0;
  let cy = 0;
  for (const [bx, by] of BOULDERS)
    for (const wrap of [-16, 0, 16]) {
      const dx = (x - bx - wrap) * 0.8; // boulders are wider than tall
      const dy = y - by;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < best) {
        second = best;
        best = d;
        cx = bx + wrap;
        cy = by;
      } else if (d < second) second = d;
    }
  if (second - best < 0.9) return V.k0; // crevice
  if (second - best < 1.8) return V.k1; // crevice shadow
  const t = (x - cx) * 0.5 + (y - cy); // >0 toward lower-right
  if (t < -2.5) return V.k4;
  if (t < -0.5) return V.k3;
  if (t < 2.5) return V.k2;
  return V.k1;
}

function drawRockFace(p, y0, y1, rowOffset) {
  for (let y = y0; y <= y1; y++) for (let x = 0; x < 16; x++) p.set(x, y, rockAt(x, y + rowOffset));
}

function drawPlateau(p, mask) {
  drawGrass(p, GRASS_LAYOUTS.grass3);
  // rim of rock showing where the plateau drops away to the side / north
  if (mask & N) {
    p.rect(0, 0, 16, 2, V.k3);
    p.rect(0, 0, 16, 1, V.k1);
    p.rect(0, 2, 16, 1, V.g1);
  }
  if (mask & W) {
    p.rect(0, 0, 3, 16, V.k3);
    p.rect(0, 0, 1, 16, V.k1);
    p.rect(1, 0, 1, 16, V.k4);
    p.rect(3, 0, 1, 16, V.g1);
  }
  if (mask & E) {
    p.rect(13, 0, 3, 16, V.k2);
    p.rect(15, 0, 1, 16, V.k0);
    p.rect(13, 0, 1, 16, V.k3);
    p.rect(12, 0, 1, 16, V.g1);
  }
}

/** upper face row: grass lip overhanging, shadow, then rock */
function drawFaceUpper(p, mask) {
  drawRockFace(p, 0, 15, 0);
  const lip = [3, 3, 4, 3, 2, 3, 3, 4, 4, 3, 3, 2, 3, 3, 4, 3];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < lip[x]; y++) p.set(x, y, GRASS_REF.get(x, y));
    p.set(x, lip[x] - 1, V.g1);
    p.set(x, lip[x], V.k0);
    p.set(x, lip[x] + 1, V.k1);
  }
  sideEdges(p, mask, 0);
}

/** lower face row: rock down to a dark contact line with the ground */
function drawFaceBase(p, mask) {
  drawRockFace(p, 0, 15, 16);
  for (let x = 0; x < 16; x++) {
    p.set(x, 14, x % 3 === 0 ? V.k1 : V.k0);
    p.set(x, 15, V.k0);
  }
  // a few moss tufts at the foot
  for (const x of [2, 9, 13]) {
    p.set(x, 13, V.g2);
    p.set(x + 1, 13, V.g3);
  }
  sideEdges(p, mask, 15);
}

function sideEdges(p, mask, cornerY) {
  if (mask & W) {
    for (let y = 0; y < 16; y++) {
      p.set(0, y, V.k0);
      p.set(1, y, V.k3);
    }
    p.set(0, cornerY, [0, 0, 0, 0]);
  }
  if (mask & E) {
    for (let y = 0; y < 16; y++) {
      p.set(15, y, V.k0);
      p.set(14, y, V.k1);
    }
    p.set(15, cornerY, [0, 0, 0, 0]);
  }
}

/* ================================================================ decorations */

function flower(p, x, y, petal, petalD, centre) {
  p.set(x, y - 1, petal);
  p.set(x - 1, y, petal);
  p.set(x + 1, y, petalD);
  p.set(x, y + 1, petalD);
  p.set(x, y, centre);
}

function leafPair(p, x, y) {
  p.set(x - 1, y, V.g2);
  p.set(x + 1, y, V.g1);
  p.set(x, y + 1, V.g1);
}

function drawFlowers(p, petal, petalD, centre) {
  for (const [x, y] of [[4, 4], [11, 6], [6, 11], [12, 12]]) {
    leafPair(p, x, y + 2);
    flower(p, x, y, petal, petalD, centre);
  }
}

const TUFT_DECO = [
  "..4....4..",
  ".43...34..",
  ".32.4.23..",
  "2.2.3.2..4",
  ".2.232..32",
  "..21212.2.",
  "...1111...",
];

function drawTuftDeco(p) {
  stamp(p, 3, 7, TUFT_DECO, { 1: V.g1, 2: V.g2, 3: V.g3, 4: V.g4 });
  p.rect(5, 14, 6, 1, V.shadow);
}

function drawReeds(p) {
  const stalks = [
    [3, 3, 12],
    [7, 1, 14],
    [11, 4, 11],
    [13, 6, 9],
  ];
  for (const [x, top, h] of stalks) {
    for (let y = top + 3; y <= top + h; y++) {
      p.set(x, y, y % 3 === 0 ? V.g1 : V.g2);
    }
    // cattail head
    p.rect(x, top, 1, 3, V.t3);
    p.set(x, top, V.t4);
    p.set(x, top - 1, V.g3);
    // a leaf blade curling outward
    p.set(x + 1, top + h - 4, V.g3);
    p.set(x + 2, top + h - 5, V.g4);
  }
  p.rect(2, 15, 13, 1, V.shadow);
}

/** split-rail fence; rails continue into neighbours given by mask (E/W) */
function drawFenceRails(p, mask) {
  const left = mask & W ? 0 : 7;
  const right = mask & E ? 15 : 8;
  for (const [ry, light, mid, dark] of [[5, V.t5, V.t4, V.t2], [9, V.t4, V.t3, V.t1]]) {
    for (let x = left; x <= right; x++) {
      p.set(x, ry - 1, V.ink);
      p.set(x, ry, light);
      p.set(x, ry + 1, mid);
      p.set(x, ry + 2, dark);
      p.set(x, ry + 3, V.ink);
    }
  }
  for (let x = left; x <= right; x++) p.set(x, 14, V.shadow);
}

function drawFencePost(p, mask) {
  drawFenceRails(p, mask);
  // squared post with a weathered top
  p.rect(6, 1, 4, 13, V.t3);
  p.rect(6, 1, 1, 13, V.t4);
  p.rect(9, 1, 1, 13, V.t2);
  p.rect(6, 1, 4, 1, V.t5);
  for (let y = 0; y < 15; y++) {
    p.set(5, y, V.ink);
    p.set(10, y, V.ink);
  }
  p.rect(6, 0, 4, 1, V.ink);
  p.rect(6, 14, 4, 1, V.ink);
  p.rect(5, 15, 7, 1, V.shadow);
}

function drawFenceV(p) {
  p.rect(6, 0, 4, 16, V.t3);
  p.rect(6, 0, 1, 16, V.t4);
  p.rect(9, 0, 1, 16, V.t2);
  for (let y = 0; y < 16; y++) {
    p.set(5, y, V.ink);
    p.set(10, y, V.ink);
    p.set(11, y, V.shadow);
  }
}

function drawSign(p) {
  // post
  p.rect(7, 9, 2, 6, V.t2);
  p.set(7, 9, V.t3);
  // board with carved runes (outline added below)
  stamp(
    p,
    2,
    3,
    [
      "554444444445",
      "433333333334",
      "43r3r33r3r34",
      "433333333334",
      "43r33r3r3r34",
      "222222222222",
    ],
    { 5: V.t5, 4: V.t4, 3: V.t3, 2: V.t2, r: V.t1 },
  );
  outlineWith(p, V.ink);
  p.rect(4, 15, 8, 1, V.shadow);
}

function drawWell(p) {
  // stone ring seen from the three-quarter view
  stamp(
    p,
    1,
    5,
    [
      "...kkkkkkkk...",
      ".kk54444445kk.",
      "k54dddddddd34k",
      "k4dwwwwwwwwd3k",
      "k3dwwwwwwwwd2k",
      "k32dddddddd22k",
      "k4334433443322k".slice(0, 14),
      "k3223322332211k".slice(0, 14),
      ".kk22111122kk.",
      "...kkkkkkkk...",
    ],
    { k: V.ink, 5: V.k5, 4: V.k4, 3: V.k3, 2: V.k2, 1: V.k1, d: V.k0, w: V.w1 },
  );
  // timber frame and crossbar with rope
  p.rect(2, 0, 2, 9, V.t3);
  p.rect(12, 0, 2, 9, V.t2);
  p.rect(2, 0, 12, 2, V.t4);
  p.rect(2, 0, 12, 1, V.t5);
  p.set(8, 2, V.cream);
  p.set(8, 3, V.cream);
  p.rect(7, 4, 3, 2, V.t2);
  outlineWith(p, V.ink);
}

function drawBonfire(p, frame) {
  // ring of hearth stones
  stamp(
    p,
    1,
    9,
    [
      "..kkk.kkk.kk..",
      ".k443k443k43k.",
      "k32ttTTtt22k3k".slice(0, 14),
      ".k22k322k21k..",
      "..kk.kkk.kk...",
    ],
    { k: V.ink, 4: V.k4, 3: V.k3, 2: V.k2, 1: V.k1, t: V.t2, T: V.t3 },
  );
  // flames: three hand-keyed frames
  const F = [
    ["....3....", "...323...", "..32123..", "..21012..", ".2100012.", ".2100012."],
    [".....3...", "...3.23..", "..32123..", "..21012..", ".2100012.", ".2100012."],
    ["...3.....", "..32.3...", "..32123..", "..21012..", ".2100012.", ".2100012."],
  ][frame];
  stamp(p, 3, 4, F, { 3: V.fire3, 2: V.fire2, 1: V.fire1, 0: V.fire0 });
  // embers
  p.set([5, 10, 7][frame], [2, 1, 3][frame], V.fire2);
}

function drawDockPost(p) {
  // round pile seen from above-front, with a foam ring where it meets the water
  stamp(
    p,
    4,
    1,
    [
      ".kkkkkk.",
      "k455543k",
      "k534453k",
      "k455543k",
      "k433332k",
      "k433322k",
      "k433322k",
      "k433322k",
      "k433221k",
      "k432211k",
      ".kkkkkk.",
    ],
    { k: V.ink, 5: V.t5, 4: V.t4, 3: V.t3, 2: V.t2, 1: V.t1 },
  );
  for (const [x, y] of [[3, 12], [4, 13], [5, 13], [10, 13], [11, 13], [12, 12], [7, 13], [8, 13]]) p.set(x, y, V.w5);
}

function drawDock(p) {
  // weathered boards running north-south over the water
  p.rect(0, 0, 16, 16, V.t3);
  for (const x of [0, 5, 10, 15]) {
    p.rect(x, 0, 1, 16, V.t1);
  }
  for (const x of [1, 6, 11]) p.rect(x, 0, 1, 16, V.t4);
  for (const [x, y] of [[3, 2], [8, 7], [13, 12], [3, 13], [12, 3]]) {
    p.set(x, y, V.t2);
    p.set(x, y + 1, V.t2);
  }
  // nails at the cross-beams
  for (const y of [3, 11]) for (const x of [2, 7, 12]) p.set(x, y, V.k3);
}

/* ================================================================ overlays */
// Transparent tiles for the renderer's "edge" and "corner" layers. They soften
// seams between terrains without adding ground variants for every pairing.

const TONGUES = [
  [0, 1, 2, 2, 1, 0, 0, 1, 3, 2, 1, 0, 1, 2, 1, 0],
  [1, 2, 1, 0, 0, 1, 2, 3, 2, 1, 0, 0, 1, 1, 0, 0],
];

/** irregular tongues of a material reaching in from each masked edge */
function tongues(p, mask, variant, base, rim, lit) {
  const prof = TONGUES[variant % TONGUES.length];
  const put = (x, y, d, k) => p.set(x, y, k === d - 1 ? rim : k === 0 ? lit : base);
  for (let i = 0; i < 16; i++) {
    const d = prof[i];
    for (let k = 0; k < d; k++) {
      if (mask & N) put(i, k, d, k);
      if (mask & S) put(15 - i, 15 - k, d, k);
      if (mask & W) put(k, 15 - i, d, k);
      if (mask & E) put(15 - k, i, d, k);
    }
  }
}

/** grass blades creeping onto a path along grass-facing edges */
function drawCreep(p, mask, variant) {
  const at = variant ? [3, 11] : [6, 12];
  const blade = (x, y) => stamp(p, x, y, ["4.4", ".2."], { 4: V.g4, 2: V.g2 });
  for (const a of at) {
    if (mask & N) blade(a, 3);
    if (mask & S) blade(a, 11);
    if (mask & W) blade(3, a);
    if (mask & E) blade(11, a);
  }
}

/** darker wet sand and a tide line where the beach meets the water */
function drawWet(p, mask) {
  const prof = [3, 3, 4, 3, 2, 3, 3, 4, 4, 3, 3, 2, 3, 3, 4, 3];
  for (let i = 0; i < 16; i++)
    for (let k = 0; k < prof[i]; k++) {
      const c = k === prof[i] - 1 ? V.s2 : k === 0 ? "#bfa070" : V.s1;
      if (mask & S) p.set(i, 15 - k, c);
      if (mask & N) p.set(i, k, c);
      if (mask & W) p.set(k, i, c);
      if (mask & E) p.set(15 - k, i, c);
    }
  if (mask & S) {
    p.set(5, 13, V.s4);
    p.set(11, 14, V.cream);
  }
}

/** rounded grass nubs in corners whose diagonal neighbour is grass (NE=1 SE=2 SW=4 NW=8) */
const CORNERS = [
  [1, 15, 0, -1, 1],
  [2, 15, 15, -1, -1],
  [4, 0, 15, 1, -1],
  [8, 0, 0, 1, 1],
];
const NUB = ["333", "33.", "3.."];
function drawInnerCorners(p, cmask) {
  for (const [bit, cx, cy, sx, sy] of CORNERS) {
    if (!(cmask & bit)) continue;
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 3; i++) {
        if (NUB[j][i] === ".") continue;
        const edge = NUB[j][i + 1] === "." || NUB[j + 1]?.[i] === "." || i === 2 || j === 2;
        p.set(cx + i * sx, cy + j * sy, edge ? V.g2 : V.g3);
      }
    p.set(cx + 3 * sx, cy, V.shadow);
    p.set(cx, cy + 3 * sy, V.shadow);
  }
}

function drawFoamCorners(p, cmask, frame) {
  for (const [bit, cx, cy, sx, sy] of CORNERS) {
    if (!(cmask & bit)) continue;
    p.set(cx, cy, V.w5);
    p.set(cx + sx, cy, V.w5);
    p.set(cx, cy + sy, V.w5);
    p.set(cx + sx, cy + sy, frame === 1 ? V.w5 : V.w4);
  }
}

/* ---------------- small hand-placed decorations ---------------- */

function drawHeather(p) {
  for (const [x, y] of [[3, 6], [6, 4], [9, 7], [12, 5], [5, 10], [10, 11]]) {
    stamp(p, x, y, [".p.", "pPp", ".g."], { p: "#9a6ab8", P: "#c89ad8", g: V.g1 });
  }
}
function drawFern(p) {
  stamp(
    p,
    1,
    3,
    ["......4......", "...4..3..4...", "....3.3.3....", ".4..33333..4.", "..3333233333.", "...32222223..", "4333222222334", ".22..2.2..22."],
    { 4: V.g4, 3: V.g3, 2: V.g2 },
  );
  p.rect(4, 11, 8, 1, V.shadow);
}
function drawBluebells(p) {
  for (const [x, y] of [[4, 6], [8, 4], [11, 8], [6, 10]]) {
    stamp(p, x, y, ["b.", "Bb", ".g", ".g"], { b: "#6a7ad8", B: "#9aaaf0", g: V.g2 });
  }
}
function drawPebbles(p) {
  stamp(p, 3, 5, [".54.", "5433", ".22."], { 5: V.k5, 4: V.k4, 3: V.k3, 2: V.k2 });
  stamp(p, 10, 9, ["43", "21"], { 4: V.k4, 3: V.k3, 2: V.k2, 1: V.k1 });
  stamp(p, 7, 12, ["4", "2"], { 4: V.k4, 2: V.k2 });
}
function drawTwigs(p) {
  stamp(p, 2, 7, ["......4..", "44433.3..", "...3333..", "......33."], { 4: V.t4, 3: V.t2 });
  for (const [x, y] of [[11, 4], [12, 11], [4, 12]]) p.set(x, y, V.red1);
}

/* ================================================================ registry */

/**
 * Register the village tiles. `tile(key, meta, draw)` and
 * `animTiles(key, meta, frames, draw)` come from tiles.mjs.
 */
export function registerVillageTiles(tile, animTiles) {
  // grass family (no edges: everything else fringes onto grass)
  for (const key of ["grass", "grass2", "grass3", "meadow"]) tile(key, {}, (p) => drawGrass(p, GRASS_LAYOUTS[key]));
  for (let v = 0; v < GRASS_VARIANTS; v++) tile(`grass~${v}`, {}, (p) => drawGrass(p, grassLayout(v + 3)));
  for (const [name, draw] of Object.entries(GRASS_FEATURES)) tile(`grass_${name}`, {}, (p) => draw(p));

  // autotiled ground families: base key (no edges) + key#mask variants
  const families = [
    ["path", (p) => drawPath(p, PATH_LAYOUTS.path), V.d2, {}],
    ["path2", (p) => drawPath(p, PATH_LAYOUTS.path2), V.d2, {}],
    ["sand", (p) => drawSand(p, SAND_LAYOUTS.sand), V.s1, {}],
    ["sand2", (p) => drawSand(p, SAND_LAYOUTS.sand2), V.s1, {}],
    ["cobble", (p) => drawFlagstones(p, FLAGS_A), MORTAR, {}],
    ["cobble2", (p) => drawFlagstones(p, FLAGS_B), MORTAR, {}],
  ];
  for (const [key, base, shadow, meta] of families) {
    tile(key, meta, (p) => base(p));
    for (const m of MASKS)
      for (let prof = 0; prof < PROFS.length; prof++)
        tile(prof ? `${key}#${m}~${prof}` : `${key}#${m}`, meta, (p) => {
          base(p);
          grassFringe(p, m, shadow, prof);
        });
  }

  // water (animated): legacy keys keep their collision meta; variants are visual
  animTiles("water", { solid: true }, 3, (p, f) => drawWater(p, f));
  animTiles("shore_water", { solid: true }, 3, (p, f) => {
    drawWater(p, f);
    waterEdges(p, N, f);
  });
  for (const m of MASKS)
    animTiles(`water#${m}`, { solid: true }, 3, (p, f) => {
      drawWater(p, f);
      waterEdges(p, m, f);
    });
  tile("dock", {}, (p) => drawDock(p));

  // cliffs: legacy keys + role variants chosen by the renderer
  tile("cliff_top", { solid: true }, (p) => drawPlateau(p, 0));
  tile("cliff_face", { solid: true }, (p) => drawFaceUpper(p, 0));
  tile("cliff_face_grass", { solid: true }, (p) => drawFaceBase(p, 0));
  for (const m of MASKS) {
    tile(`cliff_top#${m}`, { solid: true }, (p) => drawPlateau(p, m));
    tile(`cliff_upper#${m}`, { solid: true }, (p) => drawFaceUpper(p, m));
    tile(`cliff_base#${m}`, { solid: true }, (p) => drawFaceBase(p, m));
  }

  // decorations (transparent, overlay layer)
  const D = { deco: true };
  tile("flowers_r", D, (p) => drawFlowers(p, V.red2, V.red1, V.goldL));
  tile("flowers_w", D, (p) => drawFlowers(p, V.cream, "#d4c8a4", V.gold));
  tile("tuft", D, (p) => drawTuftDeco(p));
  tile("reeds", D, (p) => drawReeds(p));
  tile("fence_h", { ...D, solid: true }, (p) => drawFenceRails(p, E | W));
  tile("fence_v", { ...D, solid: true }, (p) => drawFenceV(p));
  tile("fence_post", { ...D, solid: true }, (p) => drawFencePost(p, 0));
  for (const m of MASKS) tile(`fence_post#${m}`, { ...D, solid: true }, (p) => drawFencePost(p, m));
  tile("sign", { ...D, solid: true }, (p) => drawSign(p));
  tile("well", { ...D, solid: true }, (p) => drawWell(p));
  animTiles("bonfire", { ...D, solid: true }, 3, (p, f) => drawBonfire(p, f));
  tile("dock_post", { ...D, solid: true }, (p) => drawDockPost(p));
  tile("heather", D, (p) => drawHeather(p));
  tile("fern", D, (p) => drawFern(p));
  tile("bluebells", D, (p) => drawBluebells(p));
  tile("pebbles", D, (p) => drawPebbles(p));
  tile("twigs", D, (p) => drawTwigs(p));

  // overlay layers (transparent)
  const O = { overlay: true };
  for (const m of MASKS) {
    if (!m) continue;
    for (const v of [0, 1]) {
      tile(`creep#${m}~${v}`, O, (p) => drawCreep(p, m, v));
      tile(`blend_sand#${m}~${v}`, O, (p) => tongues(p, m, v, V.s2, V.s1, V.s3));
      tile(`blend_dirt#${m}~${v}`, O, (p) => tongues(p, m, v, V.d3, V.d2, V.d4));
    }
    tile(`wet#${m}`, O, (p) => drawWet(p, m));
    tile(`inner#${m}`, O, (p) => drawInnerCorners(p, m));
    animTiles(`foam_inner#${m}`, O, 3, (p, f) => drawFoamCorners(p, m, f));
  }
}
