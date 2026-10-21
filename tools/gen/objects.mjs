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
  // 32x26 carved slate plinth for the seer's longhouse (dark stone, teal runes)
  const p = new Pix(32, 26);
  const ink = "#26182a";
  // body
  p.rect(5, 10, 22, 13, "#423e52");
  p.rect(5, 10, 3, 13, "#5a566e");
  p.rect(24, 10, 3, 13, "#34304a");
  for (const x of [11, 16, 21]) p.rect(x, 12, 1, 9, "#34304a");
  // carved runes on the front, faintly lit
  for (const [x, y] of [[9, 14], [14, 16], [19, 14]]) {
    p.set(x, y, RUNE);
    p.set(x, y + 1, "#3f8f8a");
    p.set(x + 1, y + 2, "#3f8f8a");
  }
  // plinth foot and capstone
  p.rect(3, 21, 26, 3, "#4c4860");
  p.rect(3, 21, 26, 1, "#6e6a86");
  p.rect(3, 6, 26, 5, "#5a566e");
  p.rect(3, 6, 26, 1, "#8a86a2");
  p.rect(3, 10, 26, 1, "#34304a");
  // rune circle inlaid in the top, where a guardian rests
  p.ellipseOutline(16, 8, 8, 1, RUNE);
  p.set(16, 8, RUNE_L);
  p.set(9, 8, RUNE_L);
  p.set(23, 8, RUNE_L);
  // ink outline
  const out = [];
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (p.opaque(x, y)) continue;
      if (p.opaque(x - 1, y) || p.opaque(x + 1, y) || p.opaque(x, y - 1) || p.opaque(x, y + 1)) out.push([x, y]);
    }
  for (const [x, y] of out) p.set(x, y, ink);
  // contact shadow
  for (let x = 4; x < 28; x++) if (!p.opaque(x, 25)) p.set(x, 25, [24, 16, 40, 70]);
  return { pix: p, key: "pedestal", w: 32, h: 26 };
}

export function runeRingFrames() {
  // 64x28 rune circle inlaid in the floor, 2 frames of a slow pulse
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const p = new Pix(64, 28);
    const outer = f ? RUNE_L : RUNE;
    const inner = f ? RUNE : "#3f8f8a";
    // dark inlay band between two lit rings
    for (let y = 0; y < 28; y++)
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot((x - 31.5) / 29.5, (y - 13.5) / 12.5);
        if (d <= 1 && d >= 0.8) p.set(x, y, [30, 26, 44, 150]);
        if (d < 0.8) p.set(x, y, [63, 143, 138, f ? 40 : 26]);
      }
    p.ellipseOutline(32, 14, 29, 12, outer);
    p.ellipseOutline(32, 14, 23, 9, inner);
    // twelve runes around the band
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      const x = Math.round(32 + Math.cos(ang) * 26);
      const y = Math.round(14 + Math.sin(ang) * 10.5);
      p.set(x, y, (a + f) % 3 === 0 ? "#e8fffa" : RUNE);
      p.set(x, y - 1, inner);
    }
    // the guardian knot at the centre
    p.line(28, 14, 36, 14, inner);
    p.line(32, 11, 32, 17, inner);
    p.set(32, 14, f ? "#e8fffa" : RUNE_L);
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
