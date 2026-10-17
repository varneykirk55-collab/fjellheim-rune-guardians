// tiles.mjs - generates the 16x16 tileset atlas for the Viking world.
// All tiles are drawn from code with a fixed seed -> reproducible bytes.
import { Pix, rng, shade, mix } from "./pix.mjs";
import { registerVillageTiles } from "./village-tiles.mjs";
import { registerInteriorTiles } from "./interior-tiles.mjs";
import { loadOverride, checkOverrideKeys } from "./overrides.mjs";

export const TILE = 16;

// Shared Nordic palette
export const PAL = {
  outline: "#241c26",
  grassA: "#639a4a",
  grassB: "#578b40",
  grassC: "#71a856",
  grassDark: "#44703a",
  meadow: "#77ad52",
  meadowB: "#679a47",
  forest: "#47713d",
  forestB: "#3c6134",
  dirt: "#a9814f",
  dirtB: "#93703f",
  dirtC: "#bd9362",
  sand: "#d8c08a",
  sandB: "#c3aa72",
  cobble: "#8f8f99",
  cobbleB: "#7b7b86",
  cobbleC: "#a3a3ad",
  mortar: "#5f5f6b",
  water1: "#2f6e9e",
  water2: "#3a7fae",
  water3: "#4a92c0",
  wave: "#7fc4dd",
  foam: "#cdeaf2",
  rock: "#77798a",
  rockB: "#646675",
  rockC: "#8d8fa0",
  rockD: "#4c4e5c",
  wood: "#8a5a33",
  woodB: "#71482a",
  woodC: "#5c3a20",
  woodD: "#412815",
  woodLight: "#a3703f",
  thatch: "#a8823f",
  thatchB: "#8f6c31",
  thatchC: "#6e5224",
  red: "#a63c2e",
  redB: "#8a2f24",
  redC: "#c85a44",
  gold: "#d9a441",
  goldB: "#f0c860",
  rune: "#5fd8d0",
  runeB: "#8ff0e8",
  ice: "#bfe0f2",
  iceB: "#93c7e4",
  fire1: "#ff9d3f",
  fire2: "#ffcf5c",
  fire3: "#e85d2a",
  purple: "#8f6bb5",
};

/** helpers ------------------------------------------------------------ */

function baseGrass(p, seed, cA = PAL.grassA, cB = PAL.grassB, cC = PAL.grassC) {
  const r = rng(seed);
  p.rect(0, 0, 16, 16, cA);
  for (let i = 0; i < 26; i++) {
    const x = (r() * 16) | 0;
    const y = (r() * 16) | 0;
    p.set(x, y, r() < 0.5 ? cB : cC);
  }
  // small blade tufts
  for (let i = 0; i < 4; i++) {
    const x = 1 + ((r() * 13) | 0);
    const y = 2 + ((r() * 12) | 0);
    p.set(x, y, cC);
    p.set(x + 1, y - 1, cC);
    p.set(x - 1, y, cB);
  }
}

function planks(p, seed, cA, cB, cC, horizontal = true) {
  const r = rng(seed);
  p.rect(0, 0, 16, 16, cA);
  for (let i = 0; i < 40; i++) {
    const x = (r() * 16) | 0;
    const y = (r() * 16) | 0;
    if (r() < 0.5) p.set(x, y, cB);
  }
  if (horizontal) {
    for (const y of [0, 5, 10, 15]) {
      p.rect(0, y, 16, 1, cC);
      p.rect(0, y + 1, 16, 1, shade(cA, 0.12));
    }
    // nails
    for (const y of [2, 7, 12]) {
      p.set(1, y, cC);
      p.set(14, y, cC);
    }
  }
}

function waterFrame(p, phase) {
  p.rect(0, 0, 16, 16, PAL.water1);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const w = Math.sin((x + phase * 3) * 0.55 + y * 0.45) + Math.sin((y - phase * 2) * 0.7);
      if (w > 0.9) p.set(x, y, PAL.water3);
      else if (w > 0.2) p.set(x, y, PAL.water2);
    }
  }
  // glints
  for (let i = 0; i < 3; i++) {
    const gx = ((i * 6 + phase * 4) % 16 + 16) % 16;
    const gy = ((i * 5 + phase * 2) % 16 + 16) % 16;
    p.set(gx, gy, PAL.wave);
    p.set(gx + 1, gy, PAL.wave);
  }
}

/** tile registry --------------------------------------------------------
 * Each tile: key, meta {solid, frames(anim), encounter, overlay}, draw(p, frame, r).
 * Index in this array == index in atlas (row-major). Animated tiles get
 * consecutive entries (frame 0..n-1).
 */
export const TILES = [];
function tile(key, meta, draw) {
  TILES.push({ key, meta: { solid: false, frames: 1, ...meta }, draw });
}
function animTiles(key, meta, frames, draw) {
  for (let f = 0; f < frames; f++) {
    tile(f === 0 ? key : `${key}_f${f}`, { ...meta, frames, animBase: f === 0 ? key : undefined, frame: f }, (p, _f, r) => draw(p, f, r));
  }
}

/* ---------------- ground ---------------- */
// Exterior village tiles (ground families, water, cliffs, decorations) live in
// village-tiles.mjs; the remaining tiles here are route and interior art.
registerVillageTiles(tile, animTiles);
animTiles("tallgrass", { encounter: true }, 3, (p, f) => {
  baseGrass(p, 61, PAL.grassB, PAL.grassDark, PAL.grassA);
  const sway = f - 1; // -1,0,1
  const r = rng(77);
  for (let x = 0; x < 16; x++) {
    const hgt = 7 + ((r() * 5) | 0);
    const cx = x + ((x % 5 === 2 ? sway : x % 5 === 4 ? -sway : 0));
    for (let y = 0; y < hgt; y++) {
      const t = y / hgt;
      const bx = Math.round(cx + sway * t * 1.2);
      const c = t < 0.25 ? PAL.grassC : t < 0.7 ? PAL.grassA : PAL.grassB;
      p.set(bx, 15 - y, c);
      if (r() < 0.3) p.set(bx + (r() < 0.5 ? 1 : -1), 15 - y, shade(c, -0.18));
    }
    if (x % 4 === 1) p.set(Math.round(cx + sway), 15 - hgt - 1, PAL.grassC);
  }
});
tile("forestfloor", {}, (p) => {
  baseGrass(p, 113, PAL.forest, PAL.forestB, "#54804a");
  const r = rng(129);
  for (let i = 0; i < 6; i++) p.set((r() * 16) | 0, (r() * 16) | 0, "#3a4a2a");
});
tile("bridge", {}, (p) => {
  planks(p, 197, PAL.wood, PAL.woodB, PAL.woodD, false);
  for (const x of [0, 8, 15]) p.rect(x, 0, 1, 16, PAL.woodD);
  p.rect(0, 0, 16, 1, shade(PAL.wood, 0.2));
});
/* ---------------- cliffs & rocks ---------------- */
tile("boulder", { solid: true }, (p) => {
  baseGrass(p, 227);
  p.ellipse(8, 9, 6, 5, PAL.rockB);
  p.ellipse(7, 8, 5, 4, PAL.rock);
  p.ellipse(6, 7, 3, 2, PAL.rockC);
  p.set(9, 11, PAL.rockD);
  p.set(5, 10, PAL.rockD);
  p.rect(2, 13, 12, 1, PAL.grassDark);
});
tile("pine_young", { solid: true }, (p) => {
  baseGrass(p, 229, PAL.forest, PAL.forestB, "#54804a");
  p.rect(7, 11, 2, 4, PAL.woodC);
  p.poly([[8, 1], [13, 8], [3, 8]], "#2f5a33");
  p.poly([[8, 4], [14, 12], [2, 12]], "#37663a");
  p.poly([[8, 1], [10, 5], [6, 5]], "#43753f");
  p.set(8, 0, "#2f5a33");
});
tile("stump", { solid: true }, (p) => {
  baseGrass(p, 233);
  p.rect(4, 8, 8, 6, PAL.woodC);
  p.rect(4, 8, 8, 1, PAL.woodB);
  p.ellipse(8, 8, 4, 2, PAL.wood);
  p.ellipse(8, 8, 2, 1, PAL.woodB);
  p.rect(4, 13, 8, 1, PAL.woodD);
});
tile("log", { solid: true }, (p) => {
  baseGrass(p, 239);
  p.rect(1, 9, 14, 5, PAL.woodB);
  p.rect(1, 9, 14, 1, PAL.wood);
  p.rect(1, 13, 14, 1, PAL.woodD);
  p.ellipse(3, 11, 2, 2, PAL.wood);
  p.ellipse(3, 11, 1, 1, PAL.woodC);
  const r = rng(241);
  for (let i = 0; i < 6; i++) p.set(5 + ((r() * 9) | 0), 10 + ((r() * 3) | 0), PAL.woodC);
});
tile("bush", { solid: true }, (p) => {
  baseGrass(p, 251);
  p.ellipse(8, 10, 6, 5, "#2f5a33");
  p.ellipse(6, 8, 4, 3, "#3d6f3c");
  p.ellipse(10, 9, 3, 2, "#487a44");
  p.set(4, 12, PAL.redC);
  p.set(11, 11, PAL.redC);
  p.set(8, 7, PAL.redC);
});
tile("mushrooms", {}, (p) => {
  baseGrass(p, 263, PAL.forest, PAL.forestB, "#54804a");
  const spots = [[4, 10], [10, 12], [8, 6]];
  for (const [x, y] of spots) {
    p.rect(x, y, 1, 2, "#e8e0c8");
    p.ellipse(x, y - 1, 2, 1, "#c8503c");
    p.set(x - 1, y - 1, "#f0e8d0");
  }
});

/* ---------------- fences & village props ---------------- */
tile("bridge_rail", { solid: true }, (p) => {
  p.rect(0, 8, 16, 8, PAL.water1);
  planks(p, 283, PAL.wood, PAL.woodB, PAL.woodD, false);
  p.rect(0, 0, 16, 8, [0, 0, 0, 0]);
  p.rect(0, 7, 16, 1, PAL.woodD);
});

/* ---------------- interiors ---------------- */
registerInteriorTiles(tile, animTiles);

/** Build the atlas. Returns {pix, layout} where layout maps key->index. */
export function buildTileset() {
  const overridden = checkOverrideKeys("tiles", TILES.map((t) => t.key));
  const cols = 16;
  const rows = Math.ceil(TILES.length / cols);
  const atlas = new Pix(cols * TILE, rows * TILE);
  const layout = {};
  const meta = {};
  TILES.forEach((t, i) => {
    const x = (i % cols) * TILE;
    const y = ((i / cols) | 0) * TILE;
    const p = new Pix(TILE, TILE);
    t.draw(p, t.meta.frame ?? 0, rng(1000 + i));
    atlas.blit(loadOverride("tiles", t.key, TILE, TILE) ?? p, x, y);
    layout[t.key] = i;
    meta[t.key] = {
      solid: t.meta.solid,
      frames: t.meta.frames,
      encounter: !!t.meta.encounter,
      frame: t.meta.frame ?? 0,
      ...(t.meta.deco ? { deco: true } : {}),
    };
  });
  return { pix: atlas, layout, meta, cols, rows, count: TILES.length, overridden };
}
