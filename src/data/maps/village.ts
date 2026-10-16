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
g.scatter("z", 11, 3, "s");
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
g.set(26, 24, "F"); // bonfire
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
g.scatter("1", 37, 5, ".m");
g.scatter("2", 41, 9, ".m");
g.scatter("3", 29, 7, ".m");
g.scatter(",", 23, 4, ".m");

// fences around plaza north edge
g.hline(20, 24, 21, "H");
g.hline(28, 32, 21, "H");
g.set(20, 21, "P");
g.set(24, 21, "P");
g.set(28, 21, "P");
g.set(32, 21, "P");

// reeds along shore
for (const x of [6, 7, 20, 21, 44, 45]) g.set(x, 29, "i");

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
