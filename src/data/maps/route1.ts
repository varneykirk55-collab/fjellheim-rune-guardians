// route1.ts - Whisperpine Path, the first wilderness route (72x26).
import { Grid } from "./build";
import { OUTDOOR_LEGEND } from "./legend";
import { MapDef } from "./types";

const W = 72;
const H = 26;

const g = new Grid(W, H, "m");

// cliff borders
g.rect(0, 0, W, 1, "T");
g.rect(0, 1, 2, H - 1, "X");
g.rect(W - 2, 1, 2, H - 1, "X");
g.hline(2, W - 3, 1, "Y");
g.hline(2, W - 3, 2, ".");

// winding path
g.vline(35, 4, 6, "p");
g.hline(34, 44, 6, "p");
g.vline(44, 6, 12, "p");
g.hline(24, 44, 12, "p");
g.vline(24, 12, 18, "p");
g.hline(24, 35, 18, "p");
g.vline(35, 18, 25, "p");
g.scatter("q", 19, 2, "p");

// tall grass patches
g.rect(26, 14, 7, 4, "t");
g.rect(38, 9, 8, 3, "t");
g.rect(16, 20, 7, 4, "t");
g.rect(47, 14, 8, 5, "t");
g.rect(60, 16, 6, 5, "t");

// stream + bridge (east half)
g.rect(56, 2, 2, H - 2, "w");
g.set(56, 12, "r");
g.set(57, 12, "r");
g.set(56, 11, "R");
g.set(57, 11, "R");
g.set(56, 13, "R");
g.set(57, 13, "R");

// waterfall pond (east of stream)
g.rect(64, 10, 6, 3, "w");
g.hline(64, 69, 10, "W");

// forest floor under tree clusters
g.rect(4, 4, 14, 8, "o");
g.rect(58, 4, 10, 5, "o");
g.rect(6, 14, 8, 8, "o");
g.scatter("j", 31, 6, ".mo");
g.scatter("1", 43, 8, ".mo");
g.scatter("2", 47, 3, ".mo");
g.scatter("3", 27, 5, ".mo");

// rocks & clearings debris
g.set(30, 8, "O");
g.set(50, 20, "O");
g.set(20, 8, "O");
g.set(63, 22, "O");
g.set(28, 22, "u");
g.set(41, 16, "l");
g.set(12, 12, "U");
g.set(52, 8, "U");
g.set(66, 14, "U");

// signposts under each SignDef below
g.set(33, 5, "G");
g.set(36, 24, "G");

export const ROUTE1: MapDef = {
  id: "route1",
  name: "Whisperpine Path",
  music: "route",
  indoors: false,
  grid: g.strings(),
  legend: OUTDOOR_LEGEND,
  buildings: [],
  props: [
    { asset: "runestones", x: 32.5, y: 0, solid: true },
    { asset: "waterfall", x: 66, y: 4, solid: true, anim: true },
    // pines
    ...[
      [5, 4], [9, 6], [13, 4], [7, 9], [15, 9], [4, 12], [10, 14], [8, 18], [12, 21], [5, 22],
      [20, 4], [26, 5], [30, 4], [48, 4], [52, 5], [60, 4], [63, 6], [68, 5], [61, 7], [66, 8],
      [18, 8], [22, 10], [46, 8], [50, 10], [62, 14], [68, 16], [64, 20], [68, 21], [16, 16], [21, 15],
      [40, 20], [44, 22], [52, 22], [30, 20], [58, 20], [3, 16], [69, 12],
    ].map(([x, y], i) => ({ asset: i % 2 ? "pine_0" : "pine_1", x, y, solid: true })),
  ],
  warps: [{ x: 35, y: 25, to: { map: "village", x: 25, y: 2, dir: "down" } }],
  npcs: [
    { id: "trainer_herdis", char: "hunter", x: 30, y: 18, dir: "down", hideIf: "beat_herdis" },
    { id: "trainer_bjarni", char: "woodsman", x: 44, y: 8, dir: "left", hideIf: "beat_bjarni" },
  ],
  signs: [
    { x: 33, y: 5, text: ["THE ELDER STONES", "Beyond them lies the wide world.", "The way seals itself... for now."] },
    { x: 36, y: 24, text: ["SOUTH: Bjorvik Village", "Heal your creatures before", "the long walk home."] },
  ],
  encounters: {
    rate: 0.12,
    table: [
      { species: "bergling", min: 3, max: 5, weight: 40 },
      { species: "vindhare", min: 3, max: 5, weight: 30 },
      { species: "glodref", min: 4, max: 6, weight: 20 },
      { species: "ormling", min: 4, max: 6, weight: 10 },
    ],
  },
};
