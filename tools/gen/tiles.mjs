// tiles.mjs - generates the 16x16 tileset atlas for the Viking world.
// All tiles are drawn from code with a fixed seed -> reproducible bytes.
import { Pix, rng, shade, mix } from "./pix.mjs";

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

function stoneWall(p, seed) {
  const r = rng(seed);
  p.rect(0, 0, 16, 16, PAL.rockB);
  // irregular stone blocks
  const blocks = [
    [0, 0, 7, 4], [8, 0, 8, 3], [0, 5, 4, 4], [5, 4, 6, 5], [12, 4, 4, 4],
    [0, 10, 6, 6], [7, 10, 5, 3], [13, 9, 3, 4], [7, 14, 9, 2], [11, 13, 5, 1],
  ];
  for (const [x, y, w, h] of blocks) {
    const c = r() < 0.5 ? PAL.rock : PAL.rockC;
    p.rect(x + 1, y + 1, w - 1, h - 1, c);
    for (let i = 0; i < 3; i++) p.set(x + 1 + ((r() * (w - 1)) | 0), y + 1 + ((r() * (h - 1)) | 0), shade(c, -0.15));
  }
}

function firePixels(p, frame, cx, cy, w, h) {
  const r = rng(900 + frame);
  for (let y = 0; y < h; y++) {
    for (let x = -w; x <= w; x++) {
      const t = y / h; // 0 top .. 1 bottom
      const spread = (1 - t) * w * 0.6 + w * 0.4;
      if (Math.abs(x) > spread) continue;
      const flick = Math.sin(x * 1.7 + frame * 2.1 + y) * 1.2;
      if (t < 0.25 + flick * 0.05) {
        if (r() < 0.75) p.set(cx + x, cy - y, PAL.fire2);
      } else if (t < 0.6 + flick * 0.08) {
        p.set(cx + x, cy - y, PAL.fire1);
      } else if (r() < 0.9) {
        p.set(cx + x, cy - y, PAL.fire3);
      }
    }
  }
  // licks
  const lick = (dx, hh) => {
    p.set(cx + dx, cy - hh, PAL.fire2);
    p.set(cx + dx, cy - hh - 1, r() < 0.5 ? PAL.fire1 : PAL.fire2);
  };
  lick(-1 - (frame % 2), h - 1);
  lick(1 + ((frame + 1) % 2), h - 2);
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
tile("grass", {}, (p) => baseGrass(p, 11));
tile("grass2", {}, (p) => baseGrass(p, 23));
tile("grass3", {}, (p) => baseGrass(p, 37));
tile("meadow", {}, (p) => baseGrass(p, 51, PAL.meadow, PAL.meadowB, PAL.grassC));
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
tile("flowers_r", {}, (p) => {
  baseGrass(p, 83);
  const spots = [[3, 4], [9, 7], [5, 12], [12, 3], [13, 11]];
  for (const [x, y] of spots) {
    p.set(x, y, PAL.redC);
    p.set(x + 1, y, "#e8e0c0");
    p.set(x, y + 1, "#e8e0c0");
    p.set(x + 1, y + 1, PAL.goldB);
  }
});
tile("flowers_w", {}, (p) => {
  baseGrass(p, 97);
  const spots = [[4, 3], [10, 6], [3, 11], [12, 12], [8, 2]];
  for (const [x, y] of spots) {
    p.set(x, y, "#efe9d0");
    p.set(x + 1, y, "#d8d0b0");
    p.set(x, y + 1, PAL.goldB);
    p.set(x + 1, y + 1, "#efe9d0");
  }
});
tile("tuft", {}, (p) => {
  baseGrass(p, 101);
  for (const [x, y] of [[4, 8], [11, 5], [7, 12]]) {
    p.set(x, y, PAL.grassDark);
    p.set(x + 1, y - 1, PAL.grassC);
    p.set(x + 2, y, PAL.grassDark);
    p.set(x + 1, y, PAL.grassA);
  }
});
tile("forestfloor", {}, (p) => {
  baseGrass(p, 113, PAL.forest, PAL.forestB, "#54804a");
  const r = rng(129);
  for (let i = 0; i < 6; i++) p.set((r() * 16) | 0, (r() * 16) | 0, "#3a4a2a");
});
tile("path", {}, (p) => {
  const r = rng(131);
  p.rect(0, 0, 16, 16, PAL.dirt);
  for (let i = 0; i < 40; i++) p.set((r() * 16) | 0, (r() * 16) | 0, r() < 0.5 ? PAL.dirtB : PAL.dirtC);
  for (let i = 0; i < 4; i++) {
    const x = (r() * 13) | 0;
    const y = (r() * 13) | 0;
    p.set(x, y, PAL.cobbleB);
    p.set(x + 1, y, PAL.cobble);
    p.set(x, y + 1, PAL.cobbleB);
    p.set(x + 1, y + 1, "#6a6a74");
  }
});
tile("path2", {}, (p) => {
  const r = rng(149);
  p.rect(0, 0, 16, 16, PAL.dirtB);
  for (let i = 0; i < 44; i++) p.set((r() * 16) | 0, (r() * 16) | 0, r() < 0.5 ? PAL.dirt : PAL.dirtC);
});
tile("sand", {}, (p) => {
  const r = rng(151);
  p.rect(0, 0, 16, 16, PAL.sand);
  for (let i = 0; i < 34; i++) p.set((r() * 16) | 0, (r() * 16) | 0, r() < 0.5 ? PAL.sandB : "#e4d3a4");
});
tile("sand2", {}, (p) => {
  const r = rng(157);
  p.rect(0, 0, 16, 16, PAL.sandB);
  for (let i = 0; i < 30; i++) p.set((r() * 16) | 0, (r() * 16) | 0, PAL.sand);
});
tile("cobble", {}, (p) => stoneWall(p, 163));
tile("cobble2", {}, (p) => stoneWall(p, 167));
tile("boards", {}, (p) => planks(p, 173, PAL.wood, PAL.woodB, PAL.woodD));
tile("boards2", {}, (p) => planks(p, 181, PAL.woodB, PAL.woodC, PAL.woodD));
tile("dock", {}, (p) => {
  planks(p, 191, PAL.woodB, PAL.woodC, PAL.woodD, false);
  // vertical dock planks
  for (const x of [0, 5, 10, 15]) {
    p.rect(x, 0, 1, 16, PAL.woodD);
    p.rect(x + 1, 0, 1, 16, shade(PAL.woodB, 0.1));
  }
  const r = rng(193);
  for (let i = 0; i < 14; i++) p.set((r() * 16) | 0, (r() * 16) | 0, PAL.woodC);
});
tile("bridge", {}, (p) => {
  planks(p, 197, PAL.wood, PAL.woodB, PAL.woodD, false);
  for (const x of [0, 8, 15]) p.rect(x, 0, 1, 16, PAL.woodD);
  p.rect(0, 0, 16, 1, shade(PAL.wood, 0.2));
});
animTiles("water", { solid: true }, 3, (p, f) => waterFrame(p, f));
animTiles("shore_water", { solid: true }, 3, (p, f) => {
  waterFrame(p, f);
  // foam lip along the top edge (shore below land above)
  p.rect(0, 0, 16, 2, PAL.foam);
  for (let x = 0; x < 16; x++) {
    const wob = Math.sin(x * 0.9 + f * 2.1) > 0 ? 3 : 2;
    p.set(x, wob, PAL.ice);
    if ((x + f) % 4 === 0) p.set(x, wob + 1, PAL.foam);
  }
});
tile("rug_l", {}, (p) => {
  p.rect(0, 0, 16, 16, PAL.red);
  p.rect(0, 2, 16, 2, PAL.gold);
  p.rect(0, 12, 16, 2, PAL.gold);
  p.rect(2, 5, 4, 6, PAL.redB);
  p.rect(10, 5, 4, 6, PAL.redB);
  p.rect(0, 0, 1, 16, PAL.redB);
});
tile("rug_m", {}, (p) => {
  p.rect(0, 0, 16, 16, PAL.red);
  p.rect(0, 2, 16, 2, PAL.gold);
  p.rect(0, 12, 16, 2, PAL.gold);
  p.poly([[8, 4], [13, 8], [8, 12], [3, 8]], PAL.goldB);
  p.poly([[8, 6], [10, 8], [8, 10], [6, 8]], PAL.redB);
});
tile("rug_r", {}, (p) => {
  p.rect(0, 0, 16, 16, PAL.red);
  p.rect(0, 2, 16, 2, PAL.gold);
  p.rect(0, 12, 16, 2, PAL.gold);
  p.rect(10, 5, 4, 6, PAL.redB);
  p.rect(2, 5, 4, 6, PAL.redB);
  p.rect(15, 0, 1, 16, PAL.redB);
});

/* ---------------- cliffs & rocks ---------------- */
tile("cliff_face", { solid: true }, (p) => {
  stoneWall(p, 211);
  p.rect(0, 0, 16, 3, PAL.rockD);
  p.rect(0, 3, 16, 1, shade(PAL.rockD, 0.2));
  for (let x = 0; x < 16; x++) {
    if ((x * 7) % 5 === 0) p.set(x, 4 + ((x * 3) % 6), PAL.rockD);
  }
});
tile("cliff_face_grass", { solid: true }, (p) => {
  stoneWall(p, 213);
  p.rect(0, 0, 16, 3, PAL.grassDark);
  const r = rng(221);
  for (let x = 0; x < 16; x++) {
    const h = 2 + ((r() * 3) | 0);
    p.rect(x, 0, 1, h, r() < 0.5 ? PAL.grassA : PAL.grassB);
    if (r() < 0.3) p.set(x, h, PAL.grassC);
  }
});
tile("cliff_top", { solid: true }, (p) => {
  const r = rng(223);
  p.rect(0, 0, 16, 16, PAL.rockC);
  for (let i = 0; i < 50; i++) p.set((r() * 16) | 0, (r() * 16) | 0, r() < 0.5 ? PAL.rock : PAL.rockB);
  p.rect(0, 0, 16, 1, shade(PAL.rockC, 0.15));
});
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
tile("reeds", {}, (p) => {
  p.rect(0, 0, 16, 16, PAL.sandB);
  const r = rng(257);
  for (let x = 1; x < 16; x += 2) {
    const h = 5 + ((r() * 6) | 0);
    for (let y = 0; y < h; y++) p.set(x + ((y > h - 3 && r() < 0.5) ? 1 : 0), 15 - y, y > h - 3 ? "#6b7a3a" : "#7d8f45");
    p.set(x, 15 - h - 1, "#8a6b3a");
  }
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
tile("fence_h", { solid: true }, (p) => {
  baseGrass(p, 269);
  p.rect(0, 6, 16, 3, PAL.wood);
  p.rect(0, 6, 16, 1, PAL.woodLight);
  p.rect(0, 10, 16, 3, PAL.woodB);
  p.rect(0, 10, 16, 1, PAL.wood);
  p.rect(0, 12, 16, 1, PAL.woodD);
});
tile("fence_v", { solid: true }, (p) => {
  baseGrass(p, 271);
  p.rect(6, 0, 3, 16, PAL.wood);
  p.rect(6, 0, 1, 16, PAL.woodLight);
  p.rect(10, 0, 3, 16, PAL.woodB);
  p.rect(10, 0, 1, 16, PAL.wood);
  p.rect(12, 0, 1, 16, PAL.woodD);
});
tile("fence_post", { solid: true }, (p) => {
  baseGrass(p, 277);
  p.rect(6, 2, 5, 13, PAL.wood);
  p.rect(6, 2, 2, 13, PAL.woodLight);
  p.rect(10, 2, 1, 13, PAL.woodD);
  p.rect(5, 1, 7, 2, PAL.woodB);
  p.rect(6, 0, 5, 1, PAL.woodLight);
});
tile("sign", { solid: true }, (p) => {
  baseGrass(p, 281);
  p.rect(7, 8, 2, 7, PAL.woodC);
  p.rect(2, 3, 12, 7, PAL.wood);
  p.rect(2, 3, 12, 1, PAL.woodLight);
  p.rect(2, 9, 12, 1, PAL.woodD);
  p.rect(1, 2, 1, 9, PAL.woodB);
  p.rect(14, 2, 1, 9, PAL.woodB);
  for (const x of [4, 6, 8, 10, 12]) p.set(x, 5, PAL.woodD);
  for (const x of [5, 7, 9, 11]) p.set(x, 7, PAL.woodD);
});
tile("well", { solid: true }, (p) => {
  p.rect(0, 0, 16, 16, PAL.cobbleB);
  p.ellipse(8, 10, 7, 5, PAL.cobble);
  p.ellipse(8, 9, 7, 5, PAL.cobbleC);
  p.ellipse(8, 9, 5, 3, "#1c2836");
  p.ellipse(8, 10, 5, 3, "#14202e");
  p.rect(2, 2, 2, 8, PAL.woodC);
  p.rect(12, 2, 2, 8, PAL.woodC);
  p.rect(1, 1, 14, 2, PAL.redB);
  p.poly([[8, -1], [15, 2], [1, 2]], PAL.red);
});
animTiles("bonfire", { solid: true }, 3, (p, f) => {
  p.rect(0, 0, 16, 16, PAL.cobbleB);
  // stone ring
  p.ellipse(8, 12, 7, 4, PAL.rockB);
  p.ellipse(8, 12, 6, 3, PAL.rock);
  p.ellipse(8, 12, 4, 2, "#2c2119");
  // logs
  p.line(4, 13, 12, 11, PAL.woodD);
  p.line(4, 11, 12, 13, PAL.woodC);
  firePixels(p, f, 8, 12, 4, 9);
});
tile("dock_post", { solid: true }, (p, _f, _r) => {
  waterFrame(p, 0);
  p.rect(5, 2, 6, 13, PAL.woodC);
  p.rect(5, 2, 2, 13, PAL.wood);
  p.rect(10, 2, 1, 13, PAL.woodD);
  p.ellipse(8, 2, 3, 1, PAL.woodB);
  p.rect(4, 13, 8, 2, PAL.foam);
});
tile("bridge_rail", { solid: true }, (p) => {
  p.rect(0, 8, 16, 8, PAL.water1);
  planks(p, 283, PAL.wood, PAL.woodB, PAL.woodD, false);
  p.rect(0, 0, 16, 8, [0, 0, 0, 0]);
  p.rect(0, 7, 16, 1, PAL.woodD);
});

/* ---------------- interiors ---------------- */
tile("wall_int", { solid: true }, (p) => {
  planks(p, 293, "#5c4230", "#4a3425", "#3a2718");
  p.rect(0, 0, 16, 6, "#4a3425");
  p.rect(0, 5, 16, 1, "#6e5138");
  p.rect(0, 6, 16, 1, PAL.woodC);
  for (const x of [3, 12]) p.set(x, 2, PAL.gold);
});
tile("wall_int_banner", { solid: true }, (p) => {
  planks(p, 297, "#5c4230", "#4a3425", "#3a2718");
  p.rect(0, 0, 16, 6, "#4a3425");
  p.rect(0, 5, 16, 1, "#6e5138");
  p.rect(5, 6, 6, 8, PAL.red);
  p.poly([[5, 14], [8, 12], [11, 14], [11, 15], [5, 15]], "#4a3425");
  p.rect(5, 7, 6, 1, PAL.gold);
  p.set(8, 10, PAL.goldB);
});
tile("counter", { solid: true }, (p) => {
  p.rect(0, 0, 16, 16, PAL.woodB);
  p.rect(0, 0, 16, 5, PAL.wood);
  p.rect(0, 0, 16, 1, PAL.woodLight);
  p.rect(0, 4, 16, 1, PAL.woodD);
  p.rect(2, 7, 5, 7, PAL.woodC);
  p.rect(9, 7, 5, 7, PAL.woodC);
  p.set(6, 10, PAL.gold);
  p.set(13, 10, PAL.gold);
});
tile("table", { solid: true }, (p) => {
  p.rect(0, 0, 16, 16, PAL.woodB);
  p.rect(0, 2, 16, 8, PAL.wood);
  p.rect(0, 2, 16, 1, PAL.woodLight);
  p.rect(0, 9, 16, 1, PAL.woodD);
  p.rect(2, 10, 2, 5, PAL.woodC);
  p.rect(12, 10, 2, 5, PAL.woodC);
  p.set(5, 5, "#c8b088");
  p.set(6, 5, "#c8b088");
  p.set(5, 6, "#a89068");
});
tile("stool", { solid: true }, (p) => {
  p.rect(0, 0, 16, 16, PAL.woodB);
  p.ellipse(8, 8, 4, 3, PAL.wood);
  p.ellipse(8, 7, 4, 3, PAL.woodLight);
  p.rect(4, 9, 1, 4, PAL.woodC);
  p.rect(11, 9, 1, 4, PAL.woodC);
  p.rect(7, 10, 1, 4, PAL.woodC);
});
tile("shelf", { solid: true }, (p) => {
  p.rect(0, 0, 16, 16, PAL.woodC);
  p.rect(0, 0, 16, 2, PAL.woodB);
  p.rect(0, 7, 16, 2, PAL.woodB);
  p.rect(0, 14, 16, 2, PAL.woodB);
  // goods
  p.rect(2, 3, 3, 4, "#c8503c");
  p.rect(6, 4, 2, 3, PAL.gold);
  p.rect(9, 3, 4, 4, "#5a7a9c");
  p.rect(2, 10, 4, 4, "#7a9a5a");
  p.rect(8, 11, 3, 3, PAL.purple);
  p.rect(12, 10, 2, 4, "#c8a860");
});
tile("bookshelf", { solid: true }, (p) => {
  p.rect(0, 0, 16, 16, PAL.woodC);
  p.rect(0, 0, 16, 2, PAL.woodB);
  p.rect(0, 8, 16, 1, PAL.woodB);
  const cols = ["#8a3c3c", "#3c5a8a", "#4a7a4a", "#8a7a3c", "#6a4a8a", "#3c7a7a"];
  for (let i = 0; i < 6; i++) {
    p.rect(1 + i * 2 + (i % 2), 2, 2, 6, cols[i]);
    p.rect(1 + i * 2 + ((i + 1) % 2), 9, 2, 6, cols[(i + 3) % 6]);
  }
});
animTiles("hearth", { solid: true }, 3, (p, f) => {
  stoneWall(p, 307);
  p.rect(2, 5, 12, 11, "#241a16");
  p.rect(1, 4, 14, 1, PAL.rockD);
  p.rect(3, 12, 10, 4, PAL.woodD);
  firePixels(p, f, 8, 15, 4, 8);
});
tile("bed_top", { solid: true }, (p) => {
  p.rect(0, 0, 16, 16, PAL.woodB);
  p.rect(1, 1, 14, 15, "#c8c0b0");
  p.rect(1, 1, 14, 5, "#e8e0d0");
  p.rect(2, 2, 12, 3, "#d8d0c0");
  p.rect(1, 6, 14, 10, PAL.red);
  p.rect(1, 6, 14, 2, PAL.redC);
});
tile("bed_bot", { solid: true }, (p) => {
  p.rect(0, 0, 16, 14, PAL.red);
  p.rect(0, 0, 16, 2, PAL.redC);
  p.rect(2, 4, 12, 6, PAL.redB);
  p.rect(4, 6, 8, 2, PAL.gold);
  p.rect(0, 13, 16, 3, PAL.woodC);
  p.rect(0, 13, 16, 1, PAL.woodB);
});
tile("barrel", { solid: true }, (p) => {
  planks(p, 311, PAL.woodB, PAL.woodC, PAL.woodD);
  p.ellipse(8, 9, 6, 7, PAL.wood);
  p.ellipse(8, 8, 6, 7, PAL.woodB);
  p.rect(2, 5, 12, 1, PAL.rockD);
  p.rect(2, 11, 12, 1, PAL.rockD);
  p.ellipse(8, 3, 5, 2, PAL.wood);
  p.ellipse(8, 3, 4, 1, PAL.woodLight);
});
tile("crate", { solid: true }, (p) => {
  p.rect(0, 0, 16, 16, PAL.woodB);
  p.rect(1, 1, 14, 14, PAL.wood);
  p.line(1, 1, 14, 14, PAL.woodC);
  p.line(14, 1, 1, 14, PAL.woodC);
  p.rect(1, 1, 14, 1, PAL.woodLight);
  p.rect(1, 14, 14, 1, PAL.woodD);
});
tile("pot", { solid: true }, (p) => {
  p.rect(0, 0, 16, 16, PAL.woodB);
  p.ellipse(8, 10, 5, 5, "#7a5232");
  p.ellipse(8, 9, 5, 5, "#8f6138");
  p.rect(5, 3, 6, 2, "#6e4a2c");
  p.ellipse(8, 3, 3, 1, "#a3703f");
  p.set(6, 8, "#b57f4a");
});
tile("door_int", {}, (p) => {
  planks(p, 313, "#5c4230", "#4a3425", "#3a2718");
  p.rect(3, 2, 10, 14, PAL.woodC);
  p.rect(4, 3, 8, 13, PAL.wood);
  p.rect(4, 3, 8, 1, PAL.woodLight);
  p.set(10, 9, PAL.gold);
  p.set(10, 10, PAL.goldB);
  p.rect(3, 1, 10, 1, PAL.woodD);
});
tile("stairs", {}, (p) => {
  p.rect(0, 0, 16, 16, PAL.woodD);
  for (let i = 0; i < 4; i++) {
    p.rect(1, 1 + i * 4, 14, 3, i % 2 ? PAL.woodB : PAL.wood);
    p.rect(1, 1 + i * 4, 14, 1, PAL.woodLight);
  }
});
tile("heal_rune", {}, (p) => {
  p.rect(0, 0, 16, 16, "#3f6e77");
  p.rect(0, 0, 16, 1, "#2c5158");
  p.ellipse(8, 8, 5, 5, "#35626b");
  // glowing valknut-ish knot
  p.line(8, 3, 8, 13, PAL.rune);
  p.line(4, 6, 12, 6, PAL.rune);
  p.line(5, 11, 11, 11, PAL.rune);
  p.line(5, 11, 8, 5, PAL.runeB);
  p.line(11, 11, 8, 5, PAL.runeB);
  p.set(8, 8, "#d8fffa");
});

/** Build the atlas. Returns {pix, layout} where layout maps key->index. */
export function buildTileset() {
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
    atlas.blit(p, x, y);
    layout[t.key] = i;
    meta[t.key] = {
      solid: t.meta.solid,
      frames: t.meta.frames,
      encounter: !!t.meta.encounter,
      frame: t.meta.frame ?? 0,
    };
  });
  return { pix: atlas, layout, meta, cols, rows, count: TILES.length };
}
