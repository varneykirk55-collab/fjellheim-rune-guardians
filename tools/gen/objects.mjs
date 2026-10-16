// objects.mjs - multi-tile world objects: Norse buildings, longship, trees,
// waterfall, runestones, pedestals. All original, drawn from code.
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

function plankWall(p, x, y, w, h, c = WOOD, seed = 1) {
  const r = rng(seed);
  p.rect(x, y, w, h, c);
  // vertical planks
  for (let px = x; px < x + w; px += 6) {
    p.rect(px, y, 1, h, shade(c, -0.3));
    p.rect(px + 1, y, 1, h, shade(c, 0.12));
  }
  // grain
  for (let i = 0; i < w; i++) {
    const gx = x + ((r() * w) | 0);
    const gy = y + ((r() * h) | 0);
    p.set(gx, gy, shade(c, -0.18));
  }
  // cross beams
  p.rect(x, y, w, 2, WOOD_D);
  p.rect(x, y + h - 2, w, 2, WOOD_D);
}

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

function thatchRoof(p, ridgeY, halfW, eaveY, cx, opts = {}) {
  const r = rng(opts.seed || 3);
  const rows = eaveY - ridgeY;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = ridgeY + i;
    // Norse roof: near-straight sweeping sides with a slight curve
    const hw = Math.round(halfW * (0.25 + 0.75 * Math.pow(t, 0.9)));
    const c = i % 4 === 0 ? THATCH_D : i % 4 === 2 ? THATCH : THATCH_DD;
    p.rect(cx - hw, y, hw * 2 + 1, 1, c);
    for (let s = -hw; s <= hw; s += 3) {
      if (r() < 0.4) p.set(cx + s, y, shade(c, r() < 0.5 ? 0.12 : -0.15));
    }
  }
  // eave shadow line + bargeboards
  p.rect(cx - halfW - 2, eaveY, halfW * 2 + 5, 2, WOOD_DD);
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const hw = Math.round(halfW * (0.25 + 0.75 * Math.pow(t, 0.9)));
    p.set(cx - hw - 1, ridgeY + i, WOOD_D);
    p.set(cx + hw + 1, ridgeY + i, WOOD_D);
  }
  // turf strip along ridge
  const ridgeHW = Math.round(halfW * 0.3);
  if (opts.turf !== false) {
    for (let x = cx - ridgeHW; x <= cx + ridgeHW; x++) {
      const g = r() < 0.5 ? TURF : TURF_L;
      p.set(x, ridgeY - 1, g);
      if (r() < 0.3) p.set(x, ridgeY - 2, TURF_L);
    }
  }
  // ridge pole
  p.rect(cx - ridgeHW, ridgeY, ridgeHW * 2 + 1, 1, WOOD_D);
  // carved dragon heads at both ridge ends (attached to the ridge)
  dragonHead(p, cx - ridgeHW - 1, ridgeY + 4, -1, opts.dragonC || WOOD_D);
  dragonHead(p, cx + ridgeHW + 1, ridgeY + 4, 1, opts.dragonC || WOOD_D);
}

function dragonHead(p, x, y, dirx, c = WOOD_D) {
  // carved ridge dragon head
  const s = (dx, dy, cc) => p.set(x + dirx * dx, y + dy, cc);
  for (let i = 0; i < 7; i++) s(i * 0.7, -i, c);
  s(5, -7, c); s(6, -8, c); s(7, -8, c); // snout up
  s(6, -9, shade(c, 0.2));
  s(4, -9, c); // horn
  s(3, -10, c);
  s(5, -6, GOLD); // eye glint
  s(7, -7, shade(c, -0.3)); // jaw
  s(2, -6, c); s(2, -5, c); s(1, -4, c);
}

function glowWindow(p, x, y, w, h) {
  p.rect(x - 1, y - 1, w + 2, h + 2, WOOD_DD);
  p.rect(x, y, w, h, "#e8a840");
  p.rect(x, y, w, 1, "#f8c860");
  p.rect(x + (w >> 1), y, 1, h, WOOD_DD);
  p.rect(x, y + (h >> 1), w, 1, WOOD_DD);
}

function door(p, x, y, w, h, opts = {}) {
  p.rect(x - 2, y - 3, w + 4, h + 3, opts.frame || WOOD_DD);
  p.rect(x, y, w, h, opts.door || "#3a2413");
  p.rect(x + 1, y + 1, w - 2, h - 1, shade(opts.door || "#3a2413", 0.15));
  for (let px = x + 2; px < x + w - 1; px += 4) p.rect(px, y + 1, 1, h - 1, shade(opts.door || "#3a2413", -0.2));
  // rune carvings on frame
  if (opts.runes) {
    for (let i = 0; i < 3; i++) {
      p.set(x - 1, y + 2 + i * 4, RUNE);
      p.set(x + w, y + 2 + i * 4, RUNE);
    }
    p.set(x + (w >> 1), y - 2, RUNE_L);
    p.set(x + (w >> 1) - 1, y - 1, RUNE);
    p.set(x + (w >> 1) + 1, y - 1, RUNE);
  }
  // handle
  p.set(x + w - 2, y + (h >> 1), GOLD);
  // step
  p.rect(x - 3, y + h, w + 6, 2, STONE_D);
  p.rect(x - 3, y + h, w + 6, 1, STONE);
}

function banner(p, x, y, w, h, c, glyphC) {
  p.rect(x, y - 2, w, 2, WOOD_D); // rod
  p.rect(x, y, w, h, c);
  p.rect(x, y, 1, h, shade(c, 0.15));
  p.rect(x + w - 1, y, 1, h, shade(c, -0.25));
  // glyph
  p.rect(x + (w >> 1) - 1, y + 3, 2, h - 8, glyphC);
  p.rect(x + (w >> 1) - 3, y + 5, 6, 1, glyphC);
  // notched bottom
  p.set(x + (w >> 1), y + h - 1, 0);
  for (let i = 0; i < w; i++) if (i % 2 === 0) p.set(x + i, y + h, shade(c, -0.35));
}

/* ================= buildings ================= */

export function longhouseSeer() {
  // Grand seer's longhouse, 144x108. Door center at x=72, ground at y=107.
  const p = new Pix(144, 108);
  const r = rng(17);
  stoneBase(p, 8, 84, 128, 16, 21);
  plankWall(p, 12, 46, 120, 40, "#6e4a2c", 23);
  // beams
  p.rect(12, 46, 120, 3, WOOD_DD);
  for (const bx of [12, 44, 76, 108, 128]) p.rect(bx, 46, 4, 40, WOOD_D);
  // curved roof
  thatchRoof(p, 8, 70, 48, 72, { seed: 29, turf: true });
  // wider turf patches
  for (let i = 0; i < 40; i++) {
    const x = 20 + ((r() * 104) | 0);
    const y = 14 + ((r() * 26) | 0);
    if (p.get(x, y)[3]) p.set(x, y, r() < 0.5 ? TURF : TURF_L);
  }
  // door (runed)
  door(p, 64, 58, 16, 26, { runes: true, door: "#2c1c10" });
  // glowing rune circle above door
  p.ellipseOutline(72, 50, 6, 3, RUNE);
  p.set(72, 50, RUNE_L);
  p.set(69, 49, RUNE);
  p.set(75, 51, RUNE);
  // windows
  glowWindow(p, 30, 58, 8, 8);
  glowWindow(p, 106, 58, 8, 8);
  // banners
  banner(p, 52, 56, 7, 20, RED, GOLD);
  banner(p, 85, 56, 7, 20, "#3c4a7a", RUNE_L);
  // hanging herbs / charms by door
  p.line(60, 56, 60, 62, "#6a8f4a");
  p.set(60, 62, "#8a6a4a");
  p.line(84, 56, 84, 61, "#6a8f4a");
  p.set(84, 61, GOLD);
  // steps stones
  p.rect(58, 86, 28, 4, STONE);
  p.rect(56, 90, 32, 4, STONE_D);
  p.rect(56, 90, 32, 1, STONE_L);
  // corner posts carved
  for (const bx of [10, 130]) {
    p.rect(bx, 44, 6, 46, WOOD_D);
    for (let y = 48; y < 86; y += 6) {
      p.set(bx + 2, y, RUNE);
      p.set(bx + 3, y + 2, GOLD);
    }
    p.rect(bx, 42, 6, 2, GOLD);
  }
  return { pix: p, key: "longhouse_seer", w: 144, h: 108, doorX: 72, doorY: 88 };
}

export function housePlayer() {
  // Player's home 112x92; door center x=40.
  const p = new Pix(112, 92);
  const r = rng(31);
  stoneBase(p, 8, 70, 96, 14, 33);
  plankWall(p, 12, 38, 88, 34, WOOD, 37);
  thatchRoof(p, 6, 54, 40, 56, { seed: 41 });
  for (let i = 0; i < 24; i++) {
    const x = 16 + ((r() * 80) | 0);
    const y = 10 + ((r() * 22) | 0);
    if (p.get(x, y)[3]) p.set(x, y, r() < 0.5 ? TURF : TURF_L);
  }
  // chimney
  p.rect(76, 6, 10, 16, STONE_D);
  stoneBase(p, 76, 6, 10, 16, 43);
  p.rect(74, 4, 14, 3, STONE);
  door(p, 32, 48, 16, 24, { door: "#4a2c16" });
  glowWindow(p, 60, 50, 8, 8);
  glowWindow(p, 82, 50, 8, 8);
  // flower box
  p.rect(58, 59, 12, 4, WOOD_D);
  for (const fx of [59, 62, 65, 68]) p.set(fx, 58, r() < 0.5 ? "#e86048" : GOLD_L);
  // shield on wall (Bjorn's)
  p.ellipse(96, 52, 6, 6, RED);
  p.ellipse(96, 52, 4, 4, "#c8c0b0");
  p.ellipse(96, 52, 2, 2, GOLD);
  p.line(90, 52, 102, 52, WOOD_DD);
  p.line(96, 46, 96, 58, WOOD_DD);
  // woodpile
  for (let i = 0; i < 6; i++) {
    p.ellipse(12 + (i % 3) * 5, 64 - ((i / 3) | 0) * 5, 2, 2, WOOD_L);
    p.ellipse(12 + (i % 3) * 5, 64 - ((i / 3) | 0) * 5, 1, 1, THATCH_D);
  }
  p.rect(50, 72, 40, 4, STONE);
  return { pix: p, key: "house_player", w: 112, h: 92, doorX: 40, doorY: 76 };
}

export function houseNpc(v = 0) {
  // NPC homes 96x80.
  const p = new Pix(96, 80);
  const r = rng(51 + v * 7);
  const wallC = v === 0 ? "#7a5232" : "#6e5a3a";
  const roofC = v === 0 ? THATCH : "#5f6a7a";
  stoneBase(p, 8, 60, 80, 12, 53 + v);
  plankWall(p, 12, 32, 72, 30, wallC, 57 + v);
  // roof
  const rows = 28;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = 4 + i;
    const hw = Math.round(46 * (0.2 + 0.8 * t));
    const c = i % 4 === 0 ? shade(roofC, -0.15) : i % 4 === 2 ? roofC : shade(roofC, -0.3);
    p.rect(48 - hw, y, hw * 2 + 1, 1, c);
  }
  p.rect(48 - 47, 32, 95, 2, WOOD_DD);
  if (v === 0) {
    for (let i = 0; i < 18; i++) {
      const x = 16 + ((r() * 64) | 0);
      const y = 8 + ((r() * 18) | 0);
      if (p.get(x, y)[3]) p.set(x, y, r() < 0.5 ? TURF : TURF_L);
    }
  }
  door(p, 26, 40, 14, 22, { door: "#3a2413" });
  glowWindow(p, 56, 42, 8, 8);
  // props per variant
  if (v === 0) {
    // fishing nets & buoy
    for (let y = 0; y < 10; y++) for (let x = 0; x < 8; x++) if ((x + y) % 3 === 0) p.set(72 + x, 44 + y, "#8a7a5a");
    p.ellipse(84, 56, 3, 3, RED);
  } else {
    // stacked crates
    p.rect(68, 48, 12, 12, WOOD_L);
    p.rect(68, 48, 12, 1, WOOD);
    p.line(68, 48, 80, 60, WOOD_D);
    p.line(80, 48, 68, 60, WOOD_D);
    p.rect(70, 38, 10, 10, WOOD);
    p.line(70, 38, 80, 48, WOOD_D);
    banner(p, 14, 34, 6, 14, "#3c6a8a", GOLD);
  }
  p.rect(20, 62, 34, 4, STONE);
  return { pix: p, key: `house_npc_${v}`, w: 96, h: 80, doorX: 33, doorY: 66 };
}

export function healHall() {
  // Hall of Mending 128x96; teal accents, healing knot banner.
  const p = new Pix(128, 96);
  const r = rng(61);
  stoneBase(p, 8, 76, 112, 14, 63);
  plankWall(p, 12, 42, 104, 36, "#9a7a4a", 67);
  thatchRoof(p, 6, 60, 44, 64, { seed: 71, dragonC: "#3f6e77" });
  // teal roof bands
  for (let i = 0; i < 38; i++) {
    const x = 12 + ((r() * 104) | 0);
    const y = 10 + ((r() * 28) | 0);
    if (p.get(x, y)[3]) p.set(x, y, "#3f6e77");
  }
  for (let i = 0; i < 20; i++) {
    const x = 20 + ((r() * 88) | 0);
    const y = 8 + ((r() * 20) | 0);
    if (p.get(x, y)[3]) p.set(x, y, TURF);
  }
  // double door
  door(p, 52, 52, 24, 26, { door: "#2c4a52", frame: "#3f6e77" });
  p.rect(63, 52, 2, 26, "#1c343c");
  // healing knot above door (glowing)
  const kx = 64;
  const ky = 46;
  p.line(kx, ky - 4, kx, ky + 4, RUNE);
  p.line(kx - 4, ky - 1, kx + 4, ky - 1, RUNE);
  p.line(kx - 3, ky + 3, kx + 3, ky + 3, RUNE);
  p.line(kx - 3, ky + 3, kx, ky - 3, RUNE_L);
  p.line(kx + 3, ky + 3, kx, ky - 3, RUNE_L);
  p.set(kx, ky, "#e8fffa");
  // windows with soft light
  glowWindow(p, 26, 54, 10, 10);
  glowWindow(p, 92, 54, 10, 10);
  for (const [x, y] of [[30, 58], [96, 58]]) {
    p.rect(x - 2, y - 2, 6, 6, [95, 216, 208, 80]);
  }
  // banners
  banner(p, 42, 50, 6, 18, "#3f6e77", RUNE_L);
  banner(p, 80, 50, 6, 18, "#3f6e77", RUNE_L);
  p.rect(46, 78, 36, 4, STONE);
  return { pix: p, key: "heal_hall", w: 128, h: 96, doorX: 64, doorY: 82 };
}

export function shop() {
  // Trader's booth 112x88 with awning and hanging wares.
  const p = new Pix(112, 88);
  const r = rng(73);
  stoneBase(p, 8, 66, 96, 14, 75);
  plankWall(p, 12, 34, 88, 34, "#7a4a32", 77);
  thatchRoof(p, 4, 52, 36, 56, { seed: 79 });
  // awning over front window (red/cream stripes)
  for (let i = 0; i < 10; i++) {
    const c = i % 2 ? "#e8dcc0" : RED;
    p.rect(58 + i * 0, 0, 0, 0, c); // noop keep shape
  }
  for (let y = 0; y < 8; y++) {
    for (let x = 56; x < 100; x++) {
      const stripe = ((x - 56) / 6 | 0) % 2 ? "#e8dcc0" : RED;
      p.set(x, 46 + y, shade(stripe, -y * 0.04));
    }
  }
  p.rect(56, 45, 44, 1, WOOD_D);
  for (let x = 56; x < 100; x += 6) p.rect(x, 54, 3, 2, RED_D);
  // counter window under awning
  p.rect(60, 55, 36, 10, "#2c1c10");
  p.rect(60, 62, 36, 3, WOOD_L);
  p.set(62, 58, GOLD);
  p.set(66, 59, RUNE);
  p.set(90, 58, "#c8503c");
  // door
  door(p, 22, 44, 14, 24, { door: "#3a2413" });
  glowWindow(p, 44, 46, 6, 6);
  // sign: rune ball + coin
  p.rect(8, 38, 14, 12, WOOD_D);
  p.rect(9, 39, 12, 10, WOOD_L);
  p.ellipse(13, 44, 3, 3, "#6e5224");
  p.set(13, 42, GOLD);
  p.set(12, 44, "#523a18");
  p.ellipse(18, 44, 2, 2, GOLD);
  // hanging wares
  p.line(102, 40, 102, 46, "#8a7a5a");
  p.ellipse(102, 48, 2, 2, "#c8503c");
  p.line(106, 40, 106, 44, "#8a7a5a");
  p.rect(105, 44, 3, 4, GOLD);
  // barrels at side
  p.ellipse(96, 74, 7, 8, WOOD);
  p.ellipse(96, 70, 7, 4, WOOD_L);
  p.rect(89, 72, 14, 1, WOOD_D);
  p.rect(89, 77, 14, 1, WOOD_D);
  p.rect(34, 68, 28, 4, STONE);
  return { pix: p, key: "shop", w: 112, h: 88, doorX: 29, doorY: 72 };
}

export function longship() {
  // Moored longship 140x96 (sits over water).
  const p = new Pix(140, 96);
  const r = rng(83);
  const hullTop = 52;
  // hull curve
  for (let x = 8; x < 132; x++) {
    const t = (x - 8) / 124;
    const depth = Math.round(18 * Math.sin(Math.PI * Math.min(1, Math.max(0, t))));
    const top = hullTop + Math.round(6 * Math.cos(Math.PI * t * 1.0));
    for (let y = top; y < top + depth; y++) {
      const c = y === top ? WOOD_L : (y - top) % 5 === 0 ? WOOD_D : WOOD;
      p.set(x, y, c);
    }
  }
  // prow (left dragon) & stern (right curl) - connected to hull
  const edgeTop = (x) => {
    const t = Math.min(1, Math.max(0, (x - 8) / 124));
    return hullTop + Math.round(6 * Math.cos(Math.PI * t));
  };
  const pTop = edgeTop(8);
  for (let i = 0; i <= 24; i++) {
    const x = 9 - Math.round(i * 0.55);
    const y = pTop - Math.round(i * 1.0);
    p.rect(x - 1, y, 4, 2, i % 4 === 0 ? WOOD : WOOD_D);
  }
  // dragon head
  const dx = 9 - Math.round(24 * 0.55);
  const dy = pTop - 24;
  p.poly([[dx - 8, dy - 4], [dx + 4, dy - 8], [dx + 5, dy + 2], [dx - 6, dy + 4]], WOOD_D);
  p.poly([[dx - 8, dy - 4], [dx + 2, dy - 6], [dx + 2, dy - 1], [dx - 6, dy]], WOOD);
  p.set(dx - 5, dy - 3, GOLD);
  p.set(dx - 7, dy - 1, WOOD_DD);
  p.line(dx - 2, dy - 7, dx, dy - 11, WOOD_D); // horn
  // stern curl
  const sTop = edgeTop(131);
  for (let i = 0; i <= 20; i++) {
    const x = 131 + Math.round(i * 0.5);
    const y = sTop - Math.round(i * 1.0);
    p.rect(x - 2, y, 4, 2, i % 4 === 0 ? WOOD : WOOD_D);
  }
  p.line(139, sTop - 20, 136, sTop - 25, WOOD_D);
  p.line(136, sTop - 25, 131, sTop - 26, WOOD_D);
  p.set(131, sTop - 26, GOLD);
  // shield row
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 12;
    const y = hullTop + 4 + Math.round(4 * Math.sin(Math.PI * ((x - 8) / 124)));
    p.ellipse(x, y, 4, 4, i % 2 ? RED : "#c8c0b0");
    p.ellipse(x, y, 2, 2, i % 2 ? "#c8c0b0" : RED_D);
    p.set(x, y, GOLD);
  }
  // mast + sail
  p.rect(68, 6, 4, 48, WOOD_D);
  p.rect(69, 6, 1, 48, WOOD_L);
  // yard
  p.rect(38, 10, 64, 3, WOOD_D);
  // sail (striped, slightly billowing)
  for (let y = 13; y < 44; y++) {
    const bulge = Math.round(2 * Math.sin(((y - 13) / 31) * Math.PI));
    for (let x = 42 - bulge; x < 98 + bulge; x++) {
      const stripe = ((x - 42) / 9 | 0) % 2 ? "#e8dcc0" : RED;
      p.set(x, y, shade(stripe, -((y - 13) % 6 === 5 ? 0.12 : 0)));
    }
  }
  // sail emblem: rune sun-wheel
  const ex = 70;
  const ey = 28;
  p.ellipseOutline(ex, ey, 7, 7, GOLD);
  p.line(ex, ey - 6, ex, ey + 6, GOLD);
  p.line(ex - 6, ey, ex + 6, ey, GOLD);
  p.line(ex - 4, ey - 4, ex + 4, ey + 4, GOLD);
  p.line(ex - 4, ey + 4, ex + 4, ey - 4, GOLD);
  p.set(ex, ey, RED_D);
  // rigging
  p.line(70, 6, 14, hullTop - 18, "#6e5a3a");
  p.line(70, 6, 136, hullTop - 14, "#6e5a3a");
  // hull rivets & waterline foam
  for (let x = 12; x < 130; x += 7) p.set(x, hullTop + 2, WOOD_DD);
  for (let x = 10; x < 132; x++) {
    if (r() < 0.5) p.set(x, 88 + ((x / 6) | 0) % 2, "#cdeaf2");
  }
  return { pix: p, key: "longship", w: 140, h: 96 };
}

export function pineTree(v = 0) {
  // 32x56 pine, 2 variants
  const p = new Pix(32, 56);
  const r = rng(97 + v * 11);
  p.rect(14, 42, 4, 13, "#4a3420");
  p.rect(14, 42, 1, 13, "#5f452c");
  const tiers = v === 0 ? [[16, 6, 13, 14], [16, 16, 15, 16], [16, 28, 16, 16]] : [[16, 4, 11, 13], [16, 13, 13, 15], [16, 24, 15, 15], [16, 35, 16, 10]];
  for (const [cx, ty, hw, hh] of tiers) {
    p.poly([[cx, ty], [cx + hw, ty + hh], [cx - hw, ty + hh]], "#2f5a33");
    p.poly([[cx, ty], [cx + hw - 3, ty + hh - 2], [cx - 2, ty + hh - 2]], "#37663a");
    p.poly([[cx - 1, ty + 2], [cx + hw - 7, ty + hh - 4], [cx - 4, ty + hh - 3]], "#43753f");
    for (let i = 0; i < 8; i++) {
      const x = cx - hw + ((r() * hw * 2) | 0);
      const y = ty + 2 + ((r() * (hh - 2)) | 0);
      if (p.get(x, y)[3]) p.set(x, y, r() < 0.5 ? "#28502c" : "#4c7f46");
    }
  }
  // snow-free; add a bird? nah. Root shadow
  p.ellipse(16, 55, 8, 1, [30, 24, 20, 120]);
  return { pix: p, key: `pine_${v}`, w: 32, h: 56 };
}

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

export const OBJECTS = { longhouseSeer, housePlayer, houseNpc, healHall, shop, longship, pineTree, waterfallFrames, runeStones, pedestal, runeRingFrames, titleRuneCircle };
