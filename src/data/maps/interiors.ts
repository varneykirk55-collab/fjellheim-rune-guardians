// interiors.ts - all indoor maps.
import { Grid } from "./build";
import { INDOOR_LEGEND } from "./legend";
import { MapDef } from "./types";

function room(w: number, h: number, doorX: number, floor = "b"): Grid {
  const g = new Grid(w, h, floor);
  g.rect(0, 0, w, 2, "I");
  g.rect(0, h - 1, w, 1, "I");
  g.vline(0, 0, h - 1, "I");
  g.vline(w - 1, 0, h - 1, "I");
  g.set(doorX, h - 1, "h");
  return g;
}

/* ---------------- player home ---------------- */
const home = room(12, 9, 5);
home.set(6, 1, "A"); // hearth in wall
home.rect(2, 2, 1, 1, "S");
home.set(2, 3, "B");
home.set(9, 2, "N");
home.set(7, 4, "L");
home.set(6, 4, "M");
home.set(8, 5, "M");
home.rect(4, 6, 3, 1, "g");
home.set(5, 6, "f");
home.set(6, 6, "F");
home.set(10, 6, "x");
home.set(1, 6, "Z");
home.set(3, 1, "J");

export const HOME: MapDef = {
  id: "home",
  name: "Your Home",
  music: "village",
  indoors: true,
  grid: home.strings(),
  legend: INDOOR_LEGEND,
  buildings: [],
  props: [],
  warps: [{ x: 5, y: 8, to: { map: "village", x: 9, y: 12, dir: "down" } }],
  npcs: [{ id: "mother", char: "mother", x: 5, y: 3, dir: "down" }],
  signs: [],
  objects: [
    // wall: drying herbs by the hearth, a window, the family shield
    { asset: "herbs", x: 5, y: 1, solid: false },
    { asset: "window", x: 8, y: 1, solid: false },
    { asset: "shield", x: 10, y: 1, solid: false },
    // floor
    { asset: "chest", x: 3, y: 2 },
    { asset: "yarn_basket", x: 10, y: 3 },
    { asset: "light_warm", x: 5, y: 3, solid: false, layer: "floor", blend: "add" },
  ],
};

/* ---------------- seer's longhouse ---------------- */
const seer = room(16, 12, 8, "n");
seer.set(3, 1, "J");
seer.set(12, 1, "J");
seer.rect(1, 2, 2, 1, "Q");
seer.rect(13, 2, 2, 1, "Q");
seer.set(14, 4, "A");
seer.set(1, 5, "Z");
seer.set(2, 6, "x");

export const SEER_HALL: MapDef = {
  id: "seer",
  name: "Seer's Longhouse",
  music: "village",
  indoors: true,
  grid: seer.strings(),
  legend: INDOOR_LEGEND,
  buildings: [],
  props: [
    { asset: "pedestal", x: 4, y: 4, solid: true },
    { asset: "pedestal", x: 7, y: 4, solid: true },
    { asset: "pedestal", x: 10, y: 4, solid: true },
    { asset: "runering", x: 6, y: 6, anim: true, floor: true },
  ],
  warps: [{ x: 8, y: 11, to: { map: "village", x: 25, y: 11, dir: "down" } }],
  npcs: [{ id: "seer", char: "seer", x: 8, y: 3, dir: "down" }],
  signs: [],
  objects: [
    // wall: the world tree carving above the seer, herbs drying from the beam
    { asset: "yggdrasil", x: 7, y: 1, solid: false },
    { asset: "herbs", x: 5, y: 1, solid: false },
    { asset: "antlers", x: 10, y: 1, solid: false },
    // floor: spirit braziers, the ravens' perch, standing stones by the door
    { asset: "brazier", x: 5, y: 2 },
    { asset: "brazier", x: 11, y: 2 },
    { asset: "raven_perch", x: 14, y: 7 },
    { asset: "chest", x: 1, y: 8 },
    { asset: "seer_stone", x: 6, y: 10 },
    { asset: "seer_stone", x: 10, y: 10 },
    { asset: "light_teal", x: 6, y: 8, solid: false, layer: "floor", blend: "add" },
    { asset: "light_warm", x: 12, y: 5, solid: false, layer: "floor", blend: "add" },
  ],
};

/* ---------------- healing hall ---------------- */
const heal = room(12, 9, 5);
heal.rect(6, 3, 4, 1, "K");
heal.set(5, 1, "J");
heal.set(6, 1, "J");
heal.rect(1, 2, 2, 1, "N");
heal.set(10, 2, "N");
heal.set(5, 5, "v");
heal.set(6, 5, "v");
heal.set(10, 6, "x");
heal.set(1, 6, "Z");

export const HEAL_HALL: MapDef = {
  id: "heal",
  name: "Hall of Mending",
  music: "village",
  indoors: true,
  grid: heal.strings(),
  legend: INDOOR_LEGEND,
  buildings: [],
  props: [],
  warps: [{ x: 5, y: 8, to: { map: "village", x: 42, y: 13, dir: "down" } }],
  npcs: [{ id: "healer", char: "healer", x: 8, y: 2, dir: "down" }],
  signs: [],
  objects: [
    { asset: "herbs", x: 3, y: 1, solid: false },
    { asset: "window", x: 4, y: 1, solid: false },
    { asset: "herbs", x: 8, y: 1, solid: false },
    { asset: "healer_cot", x: 1, y: 4, foot: 2 },
    { asset: "healer_cot", x: 3, y: 4, foot: 2 },
    { asset: "cauldron", x: 10, y: 4 },
    { asset: "herb_table", x: 8, y: 6 },
    { asset: "light_teal", x: 4, y: 6, solid: false, layer: "floor", blend: "add" },
  ],
};

/* ---------------- shop ---------------- */
const shop = room(12, 9, 5);
shop.rect(5, 3, 5, 1, "K");
shop.rect(1, 2, 3, 1, "N");
shop.set(10, 2, "N");
shop.rect(1, 6, 2, 1, "C");
shop.set(10, 6, "Z");
shop.set(10, 5, "x");
shop.set(4, 1, "J");

export const SHOP: MapDef = {
  id: "shop",
  name: "Yrsa's Rune Goods",
  music: "village",
  indoors: true,
  grid: shop.strings(),
  legend: INDOOR_LEGEND,
  buildings: [],
  props: [],
  warps: [{ x: 5, y: 8, to: { map: "village", x: 39, y: 22, dir: "down" } }],
  npcs: [{ id: "trader", char: "trader", x: 7, y: 2, dir: "down" }],
  signs: [],
  objects: [
    { asset: "shields", x: 5, y: 1, solid: false },
    { asset: "window", x: 8, y: 1, solid: false },
    { asset: "fish_hanging", x: 9, y: 1, solid: false },
    { asset: "goods_rack", x: 1, y: 4 },
    { asset: "sacks", x: 3, y: 6 },
    { asset: "apple_barrel", x: 9, y: 6 },
  ],
};

/* ---------------- npc houses ---------------- */
const houseA = room(10, 8, 5);
houseA.set(1, 2, "S");
houseA.set(1, 3, "B");
houseA.set(5, 3, "L");
houseA.set(4, 4, "M");
houseA.set(8, 2, "N");
houseA.set(8, 5, "Z");
houseA.set(2, 6, "x");

export const HOUSE_A: MapDef = {
  id: "houseA",
  name: "Fisherman's House",
  music: "village",
  indoors: true,
  grid: houseA.strings(),
  legend: INDOOR_LEGEND,
  buildings: [],
  props: [],
  warps: [{ x: 5, y: 7, to: { map: "village", x: 9, y: 21, dir: "down" } }],
  npcs: [{ id: "carl", char: "carl", x: 6, y: 4, dir: "left" }],
  signs: [],
  objects: [
    { asset: "fish_net", x: 2, y: 1, solid: false },
    { asset: "window", x: 5, y: 1, solid: false },
    { asset: "antlers", x: 6, y: 1, solid: false },
    { asset: "sea_chest", x: 3, y: 2 },
    { asset: "fish_basket", x: 7, y: 6 },
  ],
};

const houseB = room(10, 8, 5);
houseB.set(8, 2, "S");
houseB.set(8, 3, "B");
houseB.set(3, 4, "L");
houseB.set(2, 4, "M");
houseB.set(1, 2, "N");
houseB.set(6, 6, "Z");
houseB.set(4, 1, "J");
houseB.rect(2, 6, 3, 1, "g"); // woven rug
houseB.set(3, 6, "f");
houseB.set(4, 6, "F");

export const HOUSE_B: MapDef = {
  id: "houseB",
  name: "Weaver's House",
  music: "village",
  indoors: true,
  grid: houseB.strings(),
  legend: INDOOR_LEGEND,
  buildings: [],
  props: [],
  warps: [{ x: 5, y: 7, to: { map: "village", x: 17, y: 21, dir: "down" } }],
  npcs: [{ id: "elder", char: "elder", x: 4, y: 3, dir: "down" }],
  signs: [],
  objects: [
    { asset: "tapestry", x: 2, y: 1, solid: false },
    { asset: "loom", x: 6, y: 2 },
    { asset: "yarn_basket", x: 5, y: 2 },
  ],
};
