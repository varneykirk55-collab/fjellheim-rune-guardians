// village.ts - Bjorvik, the starting coastal village (52x36).
import { Grid } from "./build";
import { OUTDOOR_LEGEND } from "./legend";
import { MapDef } from "./types";

const W = 52;
const H = 36;

const g = new Grid(W, H, ".");

// cliff ring (north + sides), gate opening at cols 24-26
g.rect(0, 0, W, 1, "T");
g.rect(0, 1, W, 2, "X");
g.rect(24, 0, 3, 3, "p");
g.vline(0, 3, 27, "X");
g.vline(1, 3, 27, "X");
g.vline(W - 1, 3, 27, "X");
g.vline(W - 2, 3, 27, "X");
g.hline(2, W - 3, 3, "Y");

// shore + sea (south)
g.rect(2, 28, W - 4, 2, "s");
g.hline(2, W - 3, 30, "W");
g.rect(2, 31, W - 4, H - 31, "w");

// dock & ship basin
g.rect(12, 30, 2, 5, "d");
g.set(12, 34, "D");
g.set(13, 34, "D");
g.rect(10, 29, 4, 1, "s");

// cobble plaza
g.rect(20, 22, 13, 6, "c");
for (let y = 22; y < 28; y++) for (let x = 20; x < 33; x++) if ((x * 5 + y * 3) % 9 === 0) g.set(x, y, "e");
// (the plaza bonfire is placed after the paths below - this one was overwritten)
g.set(30, 23, "E"); // well

// paths
g.vline(25, 3, 22, "p");
// The seer's longhouse (x21-29, y4-9) sits across the north road, so the gate
// is reached by a walkway along the cliff base and down the longhouse's west side.
g.hline(20, 24, 3, "p");
g.vline(20, 4, 10, "p");
g.hline(9, 42, 24, "p");
g.vline(9, 11, 24, "p");
g.vline(42, 12, 24, "p");
g.vline(17, 20, 24, "p");
g.vline(39, 21, 24, "p");
g.vline(25, 22, 27, "p");
g.vline(12, 25, 29, "p"); // to dock
g.hline(12, 20, 27, "q");

// meadow patches & flowers
g.rect(4, 4, 8, 8, "m");
g.rect(34, 12, 6, 6, "m");
// Flowers, ferns and stones are hand-placed in VILLAGE.decor below instead of
// a regular scatter lattice, so the village reads as composed, not generated.

// fences around plaza north edge
g.hline(20, 24, 21, "H");
g.hline(28, 32, 21, "H");
g.set(20, 21, "P");
g.set(24, 21, "P");
g.set(28, 21, "P");
g.set(32, 21, "P");

// reeds along shore
for (const x of [6, 7, 20, 21, 44, 45]) g.set(x, 29, "i");

// the plaza hearth ("Mind the fire" on the plaza sign), in the west quadrant
g.set(22, 26, "F");

// signposts: draw the sign tile under each SignDef below (they were invisible);
// the north sign moved from (27,3), where no walkable tile faced it
g.set(24, 22, "G");
g.set(19, 4, "G");

export const VILLAGE: MapDef = {
  id: "village",
  name: "Bjorvik Village",
  music: "village",
  indoors: false,
  grid: g.strings(),
  legend: OUTDOOR_LEGEND,
  buildings: [
    { asset: "longhouse_seer", x: 21, y: 4, solidH: 6, door: { x: 25, y: 10, to: { map: "seer", x: 8, y: 9, dir: "down" } } },
    { asset: "house_player", x: 7, y: 6, solidH: 5, door: { x: 9, y: 11, to: { map: "home", x: 5, y: 6, dir: "down" } } },
    { asset: "heal_hall", x: 38, y: 6, solidH: 6, door: { x: 42, y: 12, to: { map: "heal", x: 5, y: 6, dir: "down" } } },
    { asset: "shop", x: 38, y: 16, solidH: 5, door: { x: 39, y: 21, to: { map: "shop", x: 5, y: 6, dir: "down" } } },
    { asset: "house_npc_0", x: 7, y: 16, solidH: 4, door: { x: 9, y: 20, to: { map: "houseA", x: 5, y: 5, dir: "down" } } },
    { asset: "house_npc_1", x: 15, y: 16, solidH: 4, door: { x: 17, y: 20, to: { map: "houseB", x: 5, y: 5, dir: "down" } } },
  ],
  props: [
    { asset: "longship", x: 16, y: 29, solid: true },
    { asset: "pine_0", x: 3, y: 5, solid: true },
    { asset: "pine_1", x: 5, y: 9, solid: true },
    { asset: "pine_0", x: 46, y: 4, solid: true },
    { asset: "pine_1", x: 47, y: 9, solid: true },
    { asset: "pine_1", x: 3, y: 22, solid: true },
    { asset: "pine_0", x: 46, y: 22, solid: true },
    { asset: "pine_1", x: 34, y: 5, solid: true },
    { asset: "pine_0", x: 16, y: 5, solid: true },
  ],
  // Hand-composed village life. Anchored at the bottom-left tile; only the
  // bottom row blocks movement (see ObjectDef). Kept off paths, doors, warps,
  // NPC tiles and story triggers - tests/village-composition.test.ts checks it.
  objects: [
    // player's home: firewood, chopping block, kitchen garden
    { asset: "woodpile", x: 14, y: 10 },
    { asset: "chopping_block", x: 13, y: 11 },
    { asset: "garden", x: 14, y: 14, foot: 2 },
    // seer's longhouse: lanterns flank the approach, a raised runestone, stores
    { asset: "lantern_post", x: 23, y: 10 },
    { asset: "lantern_post", x: 28, y: 10 },
    { asset: "runestone", x: 31, y: 9 },
    { asset: "barrel", x: 19, y: 9 },
    { asset: "crates", x: 19, y: 7 },
    // north gate: torches on the rock either side of the road
    { asset: "wall_torch", x: 23, y: 2, solid: false },
    { asset: "wall_torch", x: 27, y: 2, solid: false },
    { asset: "lantern_post", x: 18, y: 6 },
    // hall of mending: herb planters by the door
    { asset: "herb_planter", x: 40, y: 12 },
    { asset: "herb_planter", x: 44, y: 12 },
    // shop: goods stacked outside
    { asset: "barrels", x: 45, y: 20 },
    { asset: "basket", x: 37, y: 21 },
    // fisherman and weaver
    { asset: "net_rack", x: 4, y: 19 },
    { asset: "barrel", x: 13, y: 19 },
    { asset: "basket", x: 21, y: 18 },
    // plaza hearth seating
    { asset: "log_bench", x: 21, y: 25 },
    { asset: "log_bench", x: 23, y: 27 },
    { asset: "barrels", x: 31, y: 22 },
    { asset: "crates", x: 32, y: 26 },
    // harbour
    { asset: "rowboat", x: 3, y: 29 },
    { asset: "fish_rack", x: 8, y: 28 },
    { asset: "barrels", x: 14, y: 29 },
    { asset: "basket", x: 11, y: 29 },
    { asset: "lantern_post", x: 11, y: 27 },
    { asset: "fish_rack", x: 40, y: 28 },
    { asset: "rock_large", x: 35, y: 29 },
    { asset: "rock_small", x: 47, y: 29 },
    // forest edge on the cliff plateaus framing the village (cliff tiles are
    // already solid, so these block nothing new)
    ...[
      [0, 1, "pine_1"], [3, 1, "pine_0"], [6, 1, "spruce_young"], [8, 1, "pine_1"], [12, 1, "pine_0"], [15, 1, "spruce_young"],
      [17, 1, "pine_1"], [20, 1, "pine_0"], [28, 1, "pine_1"], [31, 1, "spruce_young"], [33, 1, "pine_0"], [37, 1, "pine_1"],
      [40, 1, "spruce_young"], [42, 1, "pine_0"], [45, 1, "pine_1"], [49, 1, "spruce_young"], [50, 1, "spruce_young"],
      [0, 6, "pine_0"], [0, 10, "spruce_young"], [0, 13, "pine_1"], [0, 18, "pine_0"], [1, 21, "spruce_young"], [0, 25, "pine_1"],
      [50, 6, "pine_1"], [50, 9, "spruce_young"], [50, 13, "pine_0"], [51, 17, "spruce_young"], [50, 20, "pine_1"], [50, 25, "pine_0"],
    ].map(([x, y, asset]) => ({ asset: asset as string, x: x as number, y: y as number, solid: false })),
    // fields and margins: mixed trees, shrubs and stones
    { asset: "birch", x: 3, y: 15 },
    { asset: "rock_small", x: 2, y: 17 },
    { asset: "shrub_0", x: 2, y: 10 },
    { asset: "spruce_young", x: 18, y: 12 },
    { asset: "birch", x: 19, y: 15 },
    { asset: "shrub_0", x: 22, y: 12 },
    { asset: "shrub_1", x: 32, y: 5 },
    { asset: "log_fallen", x: 30, y: 12 },
    { asset: "birch", x: 35, y: 16 },
    { asset: "spruce_young", x: 37, y: 13 },
    { asset: "shrub_1", x: 33, y: 18 },
    { asset: "rock_small", x: 36, y: 19 },
    { asset: "birch", x: 6, y: 23 },
    { asset: "shrub_1", x: 6, y: 26 },
    { asset: "log_fallen", x: 35, y: 26 },
    { asset: "shrub_0", x: 44, y: 26 },
    { asset: "rock_large", x: 47, y: 27 },
  ],
  decor: [
    // beds by doors
    { key: "flowers_r", x: 8, y: 11 },
    { key: "flowers_w", x: 10, y: 11 },
    { key: "bluebells", x: 12, y: 12 },
    { key: "flowers_r", x: 22, y: 10 },
    { key: "flowers_w", x: 29, y: 10 },
    { key: "flowers_w", x: 43, y: 12 },
    { key: "bluebells", x: 14, y: 20 },
    { key: "flowers_r", x: 21, y: 19 },
    { key: "heather", x: 18, y: 4 },
    // fields
    { key: "fern", x: 5, y: 13 },
    { key: "twigs", x: 2, y: 13 },
    { key: "heather", x: 36, y: 14 },
    { key: "flowers_w", x: 37, y: 17 },
    { key: "pebbles", x: 33, y: 14 },
    { key: "fern", x: 20, y: 13 },
    { key: "flowers_w", x: 23, y: 14 },
    { key: "twigs", x: 15, y: 11 },
    { key: "bluebells", x: 30, y: 14 },
    { key: "flowers_r", x: 44, y: 14 },
    { key: "fern", x: 48, y: 15 },
    { key: "heather", x: 3, y: 20 },
    { key: "fern", x: 7, y: 25 },
    { key: "heather", x: 44, y: 24 },
    { key: "flowers_w", x: 48, y: 24 },
    { key: "twigs", x: 35, y: 22 },
    { key: "pebbles", x: 38, y: 25 },
    { key: "flowers_r", x: 6, y: 4 },
    { key: "heather", x: 13, y: 4 },
    { key: "fern", x: 31, y: 5 },
    { key: "flowers_w", x: 37, y: 10 },
    { key: "twigs", x: 40, y: 4 },
    { key: "tuft", x: 27, y: 15 },
    { key: "tuft", x: 15, y: 22 },
    { key: "tuft", x: 47, y: 17 },
    // beach
    { key: "pebbles", x: 30, y: 28 },
    { key: "pebbles", x: 26, y: 29 },
  ],
  warps: [{ x: 25, y: 1, to: { map: "route1", x: 35, y: 23, dir: "down" } }],
  npcs: [
    { id: "guard", char: "guard", x: 26, y: 3, dir: "down" },
    { id: "child", char: "child", x: 11, y: 13, dir: "right", scale: 0.85 },
    { id: "sigrun", char: "sigrun", x: 31, y: 24, dir: "left" },
    { id: "fisher", char: "fisher", x: 13, y: 31, dir: "down" },
    { id: "sten", char: "sten", x: 27, y: 11, dir: "left", hideIf: "starter" },
  ],
  signs: [
    { x: 24, y: 22, text: ["BJORVIK PLAZA", "Mind the fire, feed the goats,", "greet your neighbours."] },
    { x: 19, y: 4, text: ["NORTH: Whisperpine Path", "Travelers beware: tall grass", "hides wild creatures."] },
  ],
};
