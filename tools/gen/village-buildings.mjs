// village-buildings.mjs - Norse village buildings, trees and the longship for
// the Platinum-style Bjorvik pass.
//
// Architecture follows reconstructed Viking-age houses: steep reed-thatch or
// turf roofs with low eaves, vertical plank or wattle-and-daub walls on a
// fieldstone footing, small doors with carved posts, few windows.
// Every builder keeps the exact pixel size of the asset it replaces, and its
// door inside the same tile column, so map collision and warps are unchanged.
import { Pix } from "./pix.mjs";
import { V, outlineWith, stamp } from "./village-palette.mjs";

/* ================================================================ helpers */

/** fill a polygon, colouring each covered pixel with fn(x, y) */
function fillShape(p, pts, fn) {
  const mask = new Pix(p.w, p.h);
  mask.poly(pts, "#ffffff");
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (mask.opaque(x, y)) p.set(x, y, fn(x, y));
}

function finish(p) {
  outlineWith(p, V.ink);
  return p;
}

/** translucent contact shadow under a building/prop (drawn after the outline) */
function groundShadow(p, x0, x1, y, h = 3) {
  for (let j = 0; j < h; j++)
    for (let x = x0 + j; x <= x1 - j; x++) if (!p.opaque(x, y + j)) p.set(x, y + j, V.shadow);
}

/* ---------------- roofs ---------------- */

/**
 * Roof seen in three-quarter view: ridge (r0..r1, top) sloping out to the eave
 * line (x0..x1, eave). `skin(x, y, t, edge)` colours the surface, where t is
 * 0 at the ridge and 1 at the eave, and edge is true on the slanted hip sides.
 */
function roof(p, { x0, x1, r0, r1, top, eave }, skin) {
  fillShape(p, [[r0, top], [r1, top], [x1, eave], [x0, eave]], (x, y) => {
    const t = (y - top) / Math.max(1, eave - top);
    const leftEdge = r0 + (x0 - r0) * t;
    const rightEdge = r1 + (x1 - r1) * t;
    const edge = x - leftEdge < 3 || rightEdge - x < 3;
    return skin(x, y, t, edge, x - leftEdge, rightEdge - x);
  });
}

function thatchSkin(top) {
  return (x, y, t, edge) => {
    const row = (y - top) % 4;
    if (row === 0) return (x + y) % 5 === 0 ? V.h2 : V.h1; // course line
    let c = t < 0.3 ? V.h4 : t < 0.7 ? V.h3 : V.h2;
    if ((x * 3 + y) % 4 === 0) c = row === 1 ? V.h5 : V.h2; // straw strands
    if (edge) c = V.h1;
    return c;
  };
}

function turfSkin(top) {
  return (x, y, t, edge) => {
    let c = t < 0.25 ? V.g4 : t < 0.65 ? V.g3 : V.g2;
    const r = (y - top) % 5;
    if (r === 0 && (x + y) % 3 === 0) c = V.g2;
    if ((x * 7 + y * 3) % 23 === 0) c = V.g5;
    if ((x * 5 + y * 11) % 31 === 0) c = V.g1;
    if (edge) c = V.g1;
    return c;
  };
}

function shingleSkin(top) {
  return (x, y, t, edge) => {
    const row = Math.floor((y - top) / 3);
    const off = row % 2 ? 2 : 0;
    const col = (x + off) % 4;
    let c = t < 0.4 ? "#7a5a48" : "#664838";
    if ((y - top) % 3 === 2) c = "#3e2a24";
    else if (col === 0) c = "#4c3428";
    else if (col === 1) c = "#8c6c58";
    if (edge) c = "#3e2a24";
    return c;
  };
}

/** heavy eave: dark underside band where the roof overhangs the wall */
function eaveShadow(p, x0, x1, y, w = 2) {
  for (let x = x0; x <= x1; x++) for (let j = 0; j < w; j++) p.set(x, y + j, j === 0 ? V.t0 : V.t1);
}

/** ridge cap: bound turf / rope along the top of a thatch roof */
function ridgeCap(p, r0, r1, top) {
  for (let x = r0 - 1; x <= r1 + 1; x++) {
    p.set(x, top - 1, V.m2);
    p.set(x, top, x % 4 === 0 ? V.m1 : V.m3);
    p.set(x, top + 1, V.m1);
  }
}

/* ---------------- walls ---------------- */

function plankWall(p, x0, x1, y0, y1, step = 4) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const k = (x - x0) % step;
      let c = V.t3;
      if (k === 0) c = V.t1;
      else if (k === 1) c = V.t4;
      else if (k === step - 1) c = V.t2;
      if ((x * 13 + y * 7) % 29 === 0 && k > 1) c = V.t2; // knots
      p.set(x, y, c);
    }
}

function daubWall(p, x0, x1, y0, y1, posts) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      let c = "#e6d9b8";
      if ((x * 5 + y * 3) % 17 === 0) c = "#d4c49e";
      if (y > y1 - 3) c = "#cdbc94";
      p.set(x, y, c);
    }
  for (const px of posts) {
    for (let y = y0; y <= y1; y++) {
      p.set(px, y, V.t2);
      p.set(px + 1, y, V.t3);
      p.set(px + 2, y, V.t1);
    }
  }
  // sill beam
  for (let x = x0; x <= x1; x++) {
    p.set(x, y1, V.t2);
    p.set(x, y1 - 1, V.t3);
  }
}

/** fieldstone footing: rounded stones with lit tops */
function footing(p, x0, x1, y0, h = 6) {
  let x = x0;
  let i = 0;
  while (x <= x1) {
    const w = [6, 5, 7, 5, 6][i % 5];
    const tone = i % 3 === 0 ? [V.k4, V.k3, V.k2] : i % 3 === 1 ? [V.k3, V.k2, V.k1] : ["#b8b2a8", "#9a948c", "#787068"];
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w && x + xx <= x1; xx++) {
        const edgeX = xx === 0 || xx === w - 1;
        const edgeY = yy === 0 || yy === h - 1;
        if (edgeX && edgeY) continue; // round the corners
        let c = tone[1];
        if (yy <= 1) c = tone[0];
        if (yy >= h - 2 || xx === w - 1) c = tone[2];
        if (xx === 0) c = V.k1;
        p.set(x + xx, y0 + yy, c);
      }
    x += w;
    i++;
  }
}

function door(p, x0, y0, w, h, { carved = false } = {}) {
  // posts
  for (let y = y0 - 2; y < y0 + h; y++) {
    p.set(x0 - 2, y, V.t2);
    p.set(x0 - 1, y, V.t4);
    p.set(x0 + w, y, V.t1);
    p.set(x0 + w + 1, y, V.t2);
  }
  // lintel
  for (let x = x0 - 3; x <= x0 + w + 2; x++) {
    p.set(x, y0 - 3, V.t4);
    p.set(x, y0 - 2, V.t2);
  }
  // door leaf: dark planks with iron straps
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      let c = (x - x0) % 3 === 0 ? V.t0 : V.t1;
      if (y === y0) c = V.t0;
      if (y === y0 + 3 || y === y0 + h - 4) c = (x - x0) % 2 ? V.k1 : V.k2;
      p.set(x, y, c);
    }
  p.set(x0 + w - 3, y0 + (h >> 1), V.gold); // ring handle
  if (carved) {
    for (let y = y0; y < y0 + h; y += 3) {
      p.set(x0 - 2, y, V.t5);
      p.set(x0 + w + 1, y + 1, V.t5);
    }
  }
  // threshold stone
  for (let x = x0 - 3; x <= x0 + w + 2; x++) {
    p.set(x, y0 + h, V.k4);
    p.set(x, y0 + h + 1, V.k3);
    p.set(x, y0 + h + 2, V.k1);
  }
}

function windowGlow(p, x0, y0, w = 6, h = 5) {
  for (let y = y0 - 1; y <= y0 + h; y++)
    for (let x = x0 - 1; x <= x0 + w; x++) {
      const frame = y === y0 - 1 || y === y0 + h || x === x0 - 1 || x === x0 + w;
      if (frame) p.set(x, y, V.t1);
      else p.set(x, y, y < y0 + (h >> 1) ? V.window : V.windowD);
    }
  for (let y = y0; y < y0 + h; y++) p.set(x0 + (w >> 1), y, V.t1); // mullion
  // shutters
  for (let y = y0 - 1; y <= y0 + h; y++) {
    p.set(x0 - 3, y, V.t3);
    p.set(x0 - 2, y, V.t2);
    p.set(x0 + w + 1, y, V.t2);
    p.set(x0 + w + 2, y, V.t3);
  }
}

function roundShield(p, cx, cy, a, b) {
  stamp(
    p,
    cx - 3,
    cy - 3,
    [".kkkkk.", "kaabaak", "kabbbak", "kbbgbbk", "kabbbak", "kaabaak", ".kkkkk."],
    { k: V.ink, a, b, g: V.k4 },
  );
}

function banner(p, x, y, cloth, clothD, glyph) {
  for (let yy = 0; yy < 16; yy++)
    for (let xx = 0; xx < 6; xx++) {
      if (yy > 13 && (xx === 0 || xx === 5)) continue;
      if (yy === 15 && xx > 1 && xx < 4) continue;
      p.set(x + xx, y + yy, xx < 2 ? cloth : xx > 3 ? clothD : cloth);
    }
  for (let xx = -1; xx < 7; xx++) p.set(x + xx, y - 1, V.t1);
  for (const [dx, dy] of glyph) p.set(x + dx, y + dy, V.goldL);
}

/** carved crossed gable boards ending in curled dragon heads */
function dragonGable(p, cx, top, span) {
  for (let i = 0; i <= span; i++) {
    for (const dir of [-1, 1]) {
      const x = cx + dir * (span - i);
      const y = top + i;
      p.set(x, y, V.t2);
      p.set(x, y + 1, V.t4);
      p.set(x + dir, y + 1, V.t1);
    }
  }
  for (const dir of [-1, 1]) {
    const hx = cx + dir * (span + 1);
    const hy = top - 1;
    p.set(hx, hy, V.t4);
    p.set(hx + dir, hy - 1, V.t4);
    p.set(hx + dir * 2, hy - 1, V.t3);
    p.set(hx + dir * 2, hy, V.t2); // snout
    p.set(hx + dir, hy - 2, V.red2); // eye
  }
}

/* ================================================================ buildings */

export function longhouseSeer() {
  const w = 144;
  const h = 108;
  const p = new Pix(w, h);
  const top = 10;
  const eave = 62;
  roof(p, { x0: 2, x1: w - 3, r0: 26, r1: w - 27, top, eave }, thatchSkin(top));
  ridgeCap(p, 26, w - 27, top);
  // aged moss on the thatch
  for (const [x, y] of [[40, 30], [41, 30], [96, 42], [97, 43], [70, 22], [112, 54], [24, 52]]) p.set(x, y, V.m2);
  plankWall(p, 8, w - 9, eave, 94, 5);
  eaveShadow(p, 8, w - 9, eave);
  // corner posts carved with runes
  for (const px of [8, w - 12]) {
    for (let y = eave; y <= 94; y++) {
      p.set(px, y, V.t1);
      p.set(px + 1, y, V.t4);
      p.set(px + 2, y, V.t3);
      p.set(px + 3, y, V.t1);
      if (y % 5 === 0) p.set(px + 2, y, V.rune);
    }
  }
  footing(p, 6, w - 7, 94, 7);
  door(p, 66, 72, 12, 22, { carved: true });
  // the seer's rune ring glowing over the doorway
  stamp(p, 64, 64, ["..rrrrrr..", ".r..ll..r.", "r...ll...r"], { r: V.rune, l: V.runeL });
  banner(p, 52, 70, V.red2, V.red1, [[2, 4], [3, 5], [2, 6], [3, 7], [2, 8]]);
  banner(p, 86, 70, "#3a5aa0", "#2a4078", [[2, 4], [2, 5], [3, 6], [2, 7], [2, 8]]);
  windowGlow(p, 26, 74);
  windowGlow(p, 112, 74);
  roundShield(p, 42, 80, V.red2, V.cream);
  roundShield(p, 102, 80, "#3a5aa0", V.cream);
  dragonGable(p, 72, 1, 8);
  finish(p);
  groundShadow(p, 6, w - 7, 101, 4);
  return { pix: p, key: "longhouse_seer", w, h, doorX: 72, doorY: 94 };
}

export function housePlayer() {
  const w = 112;
  const h = 92;
  const p = new Pix(w, h);
  const top = 8;
  const eave = 50;
  // turf roof: grass growing on birch bark, the classic Norse farmhouse
  roof(p, { x0: 2, x1: w - 3, r0: 22, r1: w - 23, top, eave }, turfSkin(top));
  for (let x = 2; x <= w - 3; x++) {
    p.set(x, eave - 1, V.t3); // birch-bark edge showing under the turf
    p.set(x, eave - 2, (x % 3 ? V.t4 : V.t2));
  }
  // a few wildflowers on the roof
  for (const [x, y] of [[40, 20], [70, 30], [55, 14], [86, 40]]) {
    p.set(x, y, V.goldL);
    p.set(x + 1, y + 1, V.cream);
  }
  // smoke vent
  stamp(p, 72, 4, ["kkkk", "k22k", "k11k"], { k: V.ink, 2: V.t2, 1: V.t1 });
  plankWall(p, 8, w - 9, eave, 80, 4);
  eaveShadow(p, 8, w - 9, eave);
  footing(p, 6, w - 7, 80, 6);
  door(p, 35, 59, 10, 21);
  windowGlow(p, 64, 60);
  windowGlow(p, 86, 60);
  // stacked firewood by the wall
  stamp(
    p,
    14,
    68,
    ["oOoOoO", "OoOoOo", "oOoOoO", "OoOoOo"],
    { o: V.t4, O: V.t2 },
  );
  finish(p);
  groundShadow(p, 6, w - 7, 86, 4);
  return { pix: p, key: "house_player", w, h, doorX: 40, doorY: 80 };
}

export function houseNpc(variant) {
  const w = 96;
  const h = 80;
  const p = new Pix(w, h);
  const top = 6;
  const eave = 40;
  const skin = variant === 0 ? thatchSkin(top) : shingleSkin(top);
  roof(p, { x0: 2, x1: w - 3, r0: 20, r1: w - 21, top, eave }, skin);
  if (variant === 0) ridgeCap(p, 20, w - 21, top);
  else for (let x = 19; x <= w - 20; x++) p.set(x, top, V.t1);
  if (variant === 0) {
    plankWall(p, 7, w - 8, eave, 66, 4);
  } else {
    daubWall(p, 7, w - 8, eave, 66, [7, 30, 50, w - 10]);
  }
  eaveShadow(p, 7, w - 8, eave);
  footing(p, 5, w - 6, 66, 6);
  door(p, 35, 47, 10, 19);
  windowGlow(p, 62, 50);
  if (variant === 0) {
    // fishing net and a hanging fish: the fisherman's house
    for (let y = 46; y < 60; y++) for (let x = 14; x < 26; x++) if ((x + y) % 3 === 0 || (x - y) % 3 === 0) p.set(x, y, "#c8b890");
    stamp(p, 78, 50, [".s.", "sSs", "sSs", ".s.", "s.s"], { s: "#8ca0b0", S: "#b8c8d4" });
  } else {
    // loom-woven cloth drying: the weaver's house
    banner(p, 15, 47, "#6a4a9a", "#4a3470", [[2, 4], [3, 5], [2, 6]]);
    banner(p, 78, 47, V.red2, V.red1, [[2, 4], [3, 5], [2, 6]]);
  }
  finish(p);
  groundShadow(p, 5, w - 6, 72, 4);
  return { pix: p, key: `house_npc_${variant}`, w, h, doorX: 40, doorY: 66 };
}

export function healHall() {
  const w = 128;
  const h = 96;
  const p = new Pix(w, h);
  const top = 6;
  const eave = 52;
  roof(p, { x0: 2, x1: w - 3, r0: 26, r1: w - 27, top, eave }, thatchSkin(top));
  ridgeCap(p, 26, w - 27, top);
  // healing rune woven into the roof
  stamp(
    p,
    56,
    20,
    ["...rr...", "..rllr..", ".rl..lr.", "rl.rr.lr", ".rl..lr.", "..rllr..", "...rr..."],
    { r: V.rune, l: V.runeL },
  );
  daubWall(p, 7, w - 8, eave, 84, [7, 34, 58, 88, w - 10]);
  eaveShadow(p, 7, w - 8, eave);
  footing(p, 5, w - 6, 84, 6);
  door(p, 66, 62, 12, 22, { carved: true });
  // teal-painted lintel sign and hanging lanterns
  for (let x = 62; x <= 81; x++) p.set(x, 57, V.rune);
  for (const lx of [56, 86]) {
    stamp(p, lx, 60, [".k.", "kfk", "kFk", ".k."], { k: V.ink, f: V.fire3, F: V.fire2 });
  }
  windowGlow(p, 22, 64);
  windowGlow(p, 102, 64);
  finish(p);
  groundShadow(p, 5, w - 6, 90, 4);
  return { pix: p, key: "heal_hall", w, h, doorX: 72, doorY: 84 };
}

export function shop() {
  const w = 112;
  const h = 88;
  const p = new Pix(w, h);
  const top = 6;
  const eave = 46;
  roof(p, { x0: 2, x1: w - 3, r0: 22, r1: w - 23, top, eave }, shingleSkin(top));
  for (let x = 21; x <= w - 22; x++) p.set(x, top, V.t1);
  plankWall(p, 7, w - 8, eave, 76, 4);
  eaveShadow(p, 7, w - 8, eave);
  footing(p, 5, w - 6, 76, 6);
  door(p, 19, 55, 10, 21);
  // striped market awning over the trading window
  const ax0 = 38;
  const ax1 = 98;
  for (let y = 50; y < 58; y++)
    for (let x = ax0 + (57 - y) % 2; x <= ax1; x++) {
      const stripe = Math.floor((x - ax0) / 5) % 2;
      let c = stripe ? V.cream : V.red2;
      if (y >= 56) c = stripe ? "#d8caa4" : V.red1;
      p.set(x, y, c);
    }
  for (let x = ax0; x <= ax1; x += 5) p.set(x, 58, Math.floor((x - ax0) / 5) % 2 ? V.cream : V.red2); // scalloped edge
  // counter with goods
  for (let x = ax0 + 2; x <= ax1 - 2; x++) {
    p.set(x, 66, V.t4);
    p.set(x, 67, V.t2);
  }
  for (const [x, c] of [[46, V.gold], [54, V.rune], [62, V.red2], [70, V.cream], [80, V.gold], [88, V.rune]]) {
    p.set(x, 64, c);
    p.set(x + 1, 64, c);
    p.set(x, 65, c);
    p.set(x + 1, 65, c);
  }
  // barrels by the door
  for (const bx of [86, 96]) {
    stamp(
      p,
      bx,
      68,
      [".kkkk.", "k4334k", "kk22kk", "k3223k", "kk22kk", "k3221k", ".kkkk."],
      { k: V.ink, 4: V.t4, 3: V.t3, 2: V.t2, 1: V.t1 },
    );
  }
  // hanging sign: a coin
  stamp(p, 34, 48, [".kk.", "kggk", "kGgk", ".kk."], { k: V.ink, g: V.gold, G: V.goldL });
  finish(p);
  groundShadow(p, 5, w - 6, 82, 4);
  return { pix: p, key: "shop", w, h, doorX: 24, doorY: 76 };
}

/* ================================================================ nature & ship */

/** Platinum-style conifer: stacked rounded tiers, lit from the upper left */
export function pineTree(variant) {
  const w = 32;
  const h = 56;
  const p = new Pix(w, h);
  // trunk
  for (let y = 44; y < 52; y++) {
    p.set(14, y, V.t4);
    p.set(15, y, V.t3);
    p.set(16, y, V.t2);
    p.set(17, y, V.t1);
  }
  const tiers = variant === 0
    ? [[16, 2, 6], [16, 10, 9], [16, 19, 12], [16, 29, 14]]
    : [[16, 4, 7], [16, 12, 10], [16, 22, 13], [16, 31, 15]];
  for (const [cx, ty, half] of tiers) {
    const th = 13;
    for (let yy = 0; yy < th; yy++) {
      const t = yy / (th - 1);
      const span = Math.round(1 + half * t);
      for (let xx = -span; xx <= span; xx++) {
        const x = cx + xx;
        const y = ty + yy;
        let c = V.g1;
        if (xx < -span * 0.3) c = V.g2;
        if (xx < -span * 0.6 && t < 0.85) c = V.g3;
        if (yy >= th - 2) c = V.g0; // tier underside
        if (yy === th - 3 && Math.abs(xx) % 3 === 1) c = V.g0; // drooping tips
        p.set(x, y, c);
      }
    }
    // needle highlights
    p.set(cx - 2, ty + 3, V.g4);
    p.set(cx - 4, ty + 7, V.g4);
    p.set(cx - 1, ty + 6, V.g3);
  }
  p.set(16, 1, V.g2);
  finish(p);
  for (let x = 8; x <= 24; x++) {
    p.set(x, 52, V.shadow);
    if (x > 10 && x < 22) p.set(x, 53, V.shadow);
  }
  return { pix: p, key: `pine_${variant}`, w, h };
}

/** clinker-built longship with striped sail, shields and a carved prow */
export function longship() {
  const w = 140;
  const h = 96;
  const p = new Pix(w, h);
  // mast and yard
  for (let y = 12; y < 74; y++) {
    p.set(69, y, V.t4);
    p.set(70, y, V.t2);
  }
  for (let x = 38; x <= 102; x++) {
    p.set(x, 14, V.t4);
    p.set(x, 15, V.t2);
  }
  // striped sail billowing slightly
  for (let y = 16; y < 50; y++) {
    const bulge = Math.round(Math.sin(((y - 16) / 34) * Math.PI) * 3);
    for (let x = 40 - bulge; x <= 100 + bulge; x++) {
      const stripe = Math.floor((x - 40 + 60) / 10) % 2;
      let c = stripe ? V.red2 : V.cream;
      if (y > 44) c = stripe ? V.red1 : "#d8caa4";
      if (x < 44 - bulge) c = stripe ? V.red1 : "#d8caa4";
      p.set(x, y, c);
    }
  }
  // sun-wheel emblem
  stamp(
    p,
    64,
    24,
    ["..gggg..", ".g.gg.g.", "g..gg..g", "gggggggg", "g..gg..g", ".g.gg.g.", "..gggg.."],
    { g: V.gold },
  );
  // rigging
  p.line(70, 12, 10, 58, V.t1);
  p.line(70, 12, 130, 58, V.t1);
  // hull: clinker strakes curving up to stem and stern
  const hullTop = (x) => 62 - Math.round(Math.pow((x - 70) / 64, 4) * 26);
  for (let x = 4; x <= 136; x++) {
    const yt = hullTop(x);
    const yb = 80 - Math.round(Math.pow((x - 70) / 66, 2) * 10);
    for (let y = yt; y <= yb; y++) {
      const strake = Math.floor((y - yt) / 3);
      let c = strake % 2 ? V.t3 : V.t2;
      if ((y - yt) % 3 === 0) c = V.t4;
      if (y === yb) c = V.t0;
      p.set(x, y, c);
    }
  }
  // shields along the gunwale
  for (let x = 22; x <= 118; x += 12) roundShield(p, x, 64, (x / 12) % 2 ? V.red2 : "#3a5aa0", V.cream);
  // dragon prow (left) and curled stern (right)
  stamp(
    p,
    0,
    28,
    [
      "..kk....",
      ".k44k...",
      "k4r34k..",
      "k3333kk.",
      ".kk334k.",
      "...k34k.",
      "...k34k.",
      "...k43k.",
    ],
    { k: V.ink, 4: V.t4, 3: V.t3, r: V.red2 },
  );
  stamp(p, 132, 30, ["kk..", "k4k.", ".k4k", "..k4", "..k3", "..k3"], { k: V.ink, 4: V.t4, 3: V.t3 });
  finish(p);
  // reflection / wake on the water below the hull
  for (let x = 14; x <= 126; x += 3) {
    p.set(x, 84, V.w5);
    p.set(x + 1, 84, V.w4);
  }
  return { pix: p, key: "longship", w, h };
}
