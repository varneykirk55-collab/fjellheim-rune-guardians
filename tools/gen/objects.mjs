// objects.mjs - multi-tile world objects: waterfall, runestones, pedestals,
// rune ring and title circle. All original, drawn from code.
import { Pix, rng, shade, mix } from "./pix.mjs";

const WOOD = "#8a5a33";
const WOOD_D = "#5c3a20";
const WOOD_DD = "#412815";
const WOOD_L = "#a3703f";
const THATCH = "#a8823f";
const THATCH_D = "#8f6c31";
const THATCH_DD = "#6e5224";
const STONE = "#7b7b86";
const STONE_D = "#5f5f6b";
const STONE_L = "#9a9aa4";
const RED = "#a63c2e";
const RED_D = "#7c2a20";
const GOLD = "#d9a441";
const GOLD_L = "#f0c860";
const RUNE = "#5fd8d0";
const RUNE_L = "#a8f4ec";
const TURF = "#4f7a3a";
const TURF_L = "#639a4a";

function stoneBase(p, x, y, w, h, seed = 2) {
  const r = rng(seed);
  p.rect(x, y, w, h, STONE_D);
  for (let by = y; by < y + h; by += 4) {
    let bx = x + ((by / 4) % 2 ? 2 : 0);
    while (bx < x + w) {
      const bw = 4 + ((r() * 4) | 0);
      const c = r() < 0.5 ? STONE : STONE_L;
      p.rect(bx + 1, by + 1, Math.min(bw - 1, x + w - bx - 1), Math.min(2, y + h - by - 1), c);
      bx += bw;
    }
  }
}

// Village buildings, longship and pines moved to village-buildings.mjs.

export function waterfallFrames() {
  // 16x48, 3 frames
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const p = new Pix(16, 48);
    const r = rng(101 + f);
    p.rect(1, 0, 14, 48, "#7fc4dd");
    for (let y = 0; y < 48; y++) {
      for (let x = 1; x < 15; x++) {
        const streak = Math.sin((y + f * 16) * 0.6 + x * 1.7) + r() * 0.8;
        if (streak > 1.1) p.set(x, y, "#e8f8ff");
        else if (streak > 0.4) p.set(x, y, "#bfe6f2");
        else if (x === 1 || x === 14) p.set(x, y, "#5a9ac0");
      }
    }
    // rocks at sides
    for (const rx of [0, 15]) {
      for (let y = 0; y < 48; y++) {
        if (r() < 0.35) p.set(rx, y, "#4c4e5c");
      }
    }
    // foam pool bottom
    p.ellipse(8, 46, 8, 3, "#e8f8ff");
    p.ellipse(8, 47, 7, 2, "#cdeaf2");
    for (let i = 0; i < 5; i++) p.set(2 + ((r() * 12) | 0), 42 + ((r() * 4) | 0), "#ffffff");
    frames.push(p);
  }
  return { frames, key: "waterfall", w: 16, h: 48 };
}

export function runeStones() {
  // Gateway runestones 96x72 (two stones, gap in middle = walkable path)
  const p = new Pix(96, 72);
  const r = rng(103);
  const glyphShapes = [
    [[0,0],[0,1],[0,2],[0,3],[1,0],[2,1],[1,2],[2,3]],
    [[0,0],[0,1],[0,2],[0,3],[1,1],[2,2],[2,3]],
    [[1,0],[0,1],[1,1],[2,1],[1,2],[1,3]],
    [[0,0],[1,0],[2,1],[1,2],[2,3],[0,1],[0,2],[0,3]],
  ];
  const stone = (cx, lean) => {
    for (let y = 6; y < 72; y++) {
      const t = (y - 6) / 66;
      const hw = Math.round(12 + t * 7 + Math.sin(t * 4.2) * 2);
      const x0 = Math.round(cx + lean * (1 - t) * 4);
      for (let x = x0 - hw; x <= x0 + hw; x++) {
        const c = y < 10 ? STONE_L : x < x0 - hw + 2 ? STONE_D : x > x0 + hw - 2 ? STONE_D : r() < 0.14 ? STONE_L : r() < 0.1 ? STONE_D : STONE;
        p.set(x, y, c);
      }
    }
    // rounded weathered top
    p.ellipse(cx + lean * 4, 9, 13, 6, STONE_L);
    p.ellipse(cx + lean * 4, 8, 10, 4, shade(STONE_L, 0.1));
    // deep carved runes (dark groove + glowing fill)
    for (let g = 0; g < 4; g++) {
      const gx = cx + lean * 2 - 1;
      const gy = 16 + g * 13;
      const shp = glyphShapes[g];
      for (const [dx, dy] of shp) {
        p.set(gx + dx, gy + dy, "#3a3c48"); // groove
      }
      for (const [dx, dy] of shp) {
        if (dx === 0 || dy % 2 === 0) p.set(gx + dx, gy + dy, r() < 0.4 ? RUNE_L : RUNE);
      }
    }
    // moss & lichen
    for (let i = 0; i < 26; i++) {
      const x = cx - 14 + ((r() * 28) | 0);
      const y = 34 + ((r() * 36) | 0);
      if (p.get(x, y)[3]) p.set(x, y, r() < 0.6 ? TURF : "#5f7a4a");
    }
    for (let i = 0; i < 10; i++) {
      const x = cx - 12 + ((r() * 24) | 0);
      const y = 10 + ((r() * 20) | 0);
      if (p.get(x, y)[3]) p.set(x, y, "#8a9a6a");
    }
    // base rubble
    for (let i = 0; i < 5; i++) {
      p.ellipse(cx - 14 + i * 7, 70 - (i % 2), 3, 2, STONE_D);
    }
  };
  stone(22, -1);
  stone(74, 1);
  return { pix: p, key: "runestones", w: 96, h: 72 };
}

export function pedestal() {
  // 32x26 creature pedestal for the seer's longhouse
  const p = new Pix(32, 26);
  stoneBase(p, 4, 12, 24, 12, 107);
  p.rect(2, 10, 28, 3, STONE_L);
  p.rect(2, 10, 28, 1, "#b8b8c2");
  p.ellipseOutline(16, 10, 9, 2, RUNE);
  p.set(16, 10, RUNE_L);
  p.set(10, 9, RUNE);
  p.set(22, 11, RUNE);
  return { pix: p, key: "pedestal", w: 32, h: 26 };
}

export function runeRingFrames() {
  // 64x28 glowing floor ring in front of pedestals, 2 frames
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const p = new Pix(64, 28);
    const c = f ? RUNE_L : RUNE;
    const c2 = f ? RUNE : RUNE_L;
    p.ellipseOutline(32, 14, 29, 12, c);
    p.ellipseOutline(32, 14, 25, 10, c2);
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + f * 0.2;
      const x = Math.round(32 + Math.cos(ang) * 27);
      const y = Math.round(14 + Math.sin(ang) * 11);
      p.set(x, y, "#e8fffa");
    }
    frames.push(p);
  }
  return { frames, key: "runering", w: 64, h: 28 };
}

export function titleRuneCircle() {
  // 152x152 decorative rune ring for the title screen
  const p = new Pix(152, 152);
  const cx = 76;
  const cy = 76;
  p.ellipseOutline(cx, cy, 74, 74, "#6e5224");
  p.ellipseOutline(cx, cy, 72, 72, GOLD);
  p.ellipseOutline(cx, cy, 62, 62, "#6e5224");
  p.ellipseOutline(cx, cy, 61, 61, GOLD);
  const glyphs = ["fehu", "uris", "thuris", "ansuz", "raidho", "kaunan", "hwel", "algiz", "fehu", "uris", "thuris", "ansuz", "raidho", "kaunan", "hwel", "algiz"];
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const x = Math.round(cx + Math.cos(ang) * 67) - 1;
    const y = Math.round(cy + Math.sin(ang) * 67) - 1;
    const g = glyphs[i];
    const put = (dx, dy) => p.set(x + dx, y + dy, i % 2 ? RUNE_L : GOLD_L);
    put(0, 0);
    put(0, 1);
    put(0, 2);
    put(1, g === "kaunan" ? 0 : 1);
    put(2, g === "hwel" ? 0 : 2);
    put(1, 2);
  }
  // inner knot hints
  p.ellipseOutline(cx, cy, 52, 52, [110, 82, 36, 160]);
  return p;
}

export const OBJECTS = { waterfallFrames, runeStones, pedestal, runeRingFrames, titleRuneCircle };
