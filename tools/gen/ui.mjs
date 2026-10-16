// ui.mjs - pixel UI kit: panels, buttons, item icons, element badges, touch controls.
import { Pix, rng, shade } from "./pix.mjs";

const WOOD = "#8a5a33";
const WOOD_D = "#5c3a20";
const WOOD_DD = "#3a2413";
const WOOD_L = "#a3703f";
const GOLD = "#d9a441";
const GOLD_L = "#f0c860";
const RUNE = "#5fd8d0";
const INK = "#241c2e";
const PARCH = "#2a2438";

/* ---------- 9-slice panel (32x32, margins 10) ---------- */
export function panel(borderC = WOOD_D, innerC = PARCH, cornerC = GOLD) {
  const p = new Pix(32, 32);
  // interior
  p.rect(6, 6, 20, 20, innerC);
  p.rect(6, 6, 20, 1, shade(innerC, 0.12));
  p.rect(6, 25, 20, 1, shade(innerC, -0.25));
  // frame
  p.rect(2, 2, 28, 4, borderC);
  p.rect(2, 26, 28, 4, borderC);
  p.rect(2, 2, 4, 28, borderC);
  p.rect(26, 2, 4, 28, borderC);
  p.rect(2, 2, 28, 1, shade(borderC, 0.25));
  p.rect(2, 2, 1, 28, shade(borderC, 0.15));
  p.rect(2, 29, 28, 1, shade(borderC, -0.3));
  p.rect(29, 2, 1, 28, shade(borderC, -0.2));
  // outer dark edge
  p.rect(0, 4, 1, 24, WOOD_DD);
  p.rect(31, 4, 1, 24, WOOD_DD);
  p.rect(4, 0, 24, 1, WOOD_DD);
  p.rect(4, 31, 24, 1, WOOD_DD);
  p.rect(1, 1, 3, 3, WOOD_DD);
  p.rect(28, 1, 3, 3, WOOD_DD);
  p.rect(1, 28, 3, 3, WOOD_DD);
  p.rect(28, 28, 3, 3, WOOD_DD);
  p.rect(2, 1, 2, 1, borderC);
  p.rect(1, 2, 1, 2, borderC);
  // carved corner knots
  for (const [cx, cy] of [[3, 3], [28, 3], [3, 28], [28, 28]]) {
    p.set(cx, cy, cornerC);
    p.set(cx + 1, cy, shade(cornerC, -0.3));
    p.set(cx, cy + 1, shade(cornerC, -0.3));
  }
  // rune studs along edges
  p.set(15, 3, RUNE);
  p.set(16, 3, shade(RUNE, -0.3));
  p.set(15, 28, RUNE);
  p.set(3, 15, RUNE);
  p.set(28, 15, RUNE);
  return p;
}

/* ---------- button (32x14, 9-slice margins 6) ---------- */
export function button(pressed = false) {
  const p = new Pix(32, 14);
  const base = pressed ? "#6e4a2c" : WOOD;
  p.rect(1, 1, 30, 12, base);
  p.rect(1, 1, 30, 1, shade(base, 0.3));
  p.rect(1, pressed ? 2 : 11, 30, 2, shade(base, -0.3));
  p.rect(0, 0, 32, 1, WOOD_DD);
  p.rect(0, 13, 32, 1, WOOD_DD);
  p.rect(0, 0, 1, 14, WOOD_DD);
  p.rect(31, 0, 1, 14, WOOD_DD);
  p.set(2, 2, GOLD);
  p.set(29, 2, GOLD);
  p.set(2, 11, GOLD);
  p.set(29, 11, GOLD);
  if (pressed) p.rect(1, 1, 30, 1, shade(base, -0.15));
  return p;
}

/* ---------- cursor hand (8x8) ---------- */
export function cursor() {
  const p = new Pix(8, 8);
  // pointing right-hand gauntlet arrow
  const pts = [
    "..XXXX..",
    ".XGGGGX.",
    "XGGGGGGG",
    "XGGWWGGG",
    "XGGWWGGG",
    "XGGGGGGG",
    ".XGGGGX.",
    "..XXXX..",
  ];
  pts.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c === "X") p.set(x, y, INK);
      if (c === "G") p.set(x, y, GOLD);
      if (c === "W") p.set(x, y, GOLD_L);
    });
  });
  return p;
}

/* ---------- item icons (16x16) ---------- */
function iconFrame(p) {
  return p;
}

export function iconRuneBall(glow = false, carved = false) {
  const p = new Pix(16, 16);
  const woodBase = carved ? "#9a6a3a" : "#7a5230";
  p.ellipse(8, 8, 6, 6, woodBase);
  p.ellipse(8, 6, 5, 4, shade(woodBase, 0.2));
  p.ellipse(6, 5, 2, 1, shade(woodBase, 0.35));
  // irregular wood grain
  const r = rng(carved ? 5 : 3);
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2;
    const rr = 2 + r() * 4;
    p.set(Math.round(8 + Math.cos(a) * rr), Math.round(8 + Math.sin(a) * rr), shade(woodBase, -0.2));
  }
  // seam
  p.line(2, 9, 14, 8, woodBase === "#9a6a3a" ? "#5c3a20" : "#4a2c16");
  // runes carved
  const runeC = glow ? (carved ? "#ffd83f" : RUNE) : "#3a2818";
  p.set(5, 5, runeC);
  p.set(5, 6, runeC);
  p.set(6, 7, runeC);
  p.set(9, 4, runeC);
  p.set(9, 5, runeC);
  p.set(10, 6, runeC);
  p.set(11, 5, runeC);
  p.set(7, 10, runeC);
  p.set(8, 11, runeC);
  p.set(9, 10, runeC);
  if (glow) {
    p.set(5, 4, "#ffffff");
    p.set(9, 3, "#ffffff");
    p.set(8, 12, "#ffffff");
    // outer glow
    p.ellipseOutline(8, 8, 7, 7, glow ? [carved ? 255 : 95, carved ? 216 : 216, carved ? 63 : 208, 120] : [0, 0, 0, 0]);
  }
  if (carved) {
    // metal band
    p.ellipseOutline(8, 8, 6, 6, "#4a4a58");
    p.set(2, 8, "#9aa2ad");
    p.set(14, 8, "#9aa2ad");
  }
  p.outline(0.5);
  return iconFrame(p);
}

export function iconTonic(strong = false) {
  const p = new Pix(16, 16);
  const liquid = strong ? "#e85d8a" : "#e8604a";
  // horn/flask
  p.rect(6, 2, 4, 2, "#6e5224");
  p.rect(5, 1, 6, 1, "#8a6a3a");
  p.rect(5, 4, 6, 9, "#c8dce8");
  p.rect(6, 5, 4, 7, liquid);
  p.rect(6, 5, 2, 7, shade(liquid, 0.25));
  p.rect(4, 6, 1, 6, "#c8dce8");
  p.rect(11, 6, 1, 6, "#c8dce8");
  p.rect(5, 13, 6, 1, "#9ab0c0");
  p.set(7, 7, "#ffffff");
  p.set(8, 9, shade(liquid, 0.4));
  if (strong) p.set(8, 3, GOLD_L);
  p.outline(0.5);
  return p;
}

export function iconAntidote() {
  const p = new Pix(16, 16);
  p.rect(6, 2, 4, 2, "#6e5224");
  p.rect(5, 1, 6, 1, "#8a6a3a");
  p.rect(5, 4, 6, 9, "#c8dce8");
  p.rect(6, 5, 4, 7, "#7ac850");
  p.rect(6, 5, 2, 7, "#9ae070");
  p.rect(5, 13, 6, 1, "#9ab0c0");
  p.set(7, 7, "#ffffff");
  // leaf mark
  p.set(8, 9, "#3a7a2a");
  p.set(9, 10, "#3a7a2a");
  p.outline(0.5);
  return p;
}

export function iconSilver() {
  const p = new Pix(16, 16);
  // three stacked silver coins
  p.ellipse(8, 10, 5, 3, "#9aa2ad");
  p.ellipse(8, 9, 5, 3, "#c3cad4");
  p.ellipse(8, 9, 3, 1, "#e2e8ee");
  p.ellipse(6, 6, 4, 3, "#9aa2ad");
  p.ellipse(6, 5, 4, 3, "#c3cad4");
  p.ellipse(10, 6, 4, 3, "#8a929d");
  p.ellipse(10, 5, 4, 3, "#b3bac4");
  p.set(6, 4, "#ffffff");
  p.outline(0.5);
  return p;
}

/* ---------- element badges (16x16) ---------- */
const ELEMENT_STYLE = {
  fire: ["#e85d2a", "#ff9d3f"],
  ice: ["#4a9ac8", "#a8dcf0"],
  lightning: ["#c8a020", "#ffe04a"],
  water: ["#2f6e9e", "#6aa8d0"],
  earth: ["#7a6238", "#a8905a"],
  wind: ["#4aa894", "#a8e8d8"],
  spirit: ["#5a7ac8", "#a8c0f0"],
  shadow: ["#3c2c50", "#7a5a9a"],
  light: ["#c8a840", "#f8e890"],
  steel: ["#5f6672", "#aab2be"],
  primal: ["#8a4a2a", "#c87a44"],
  arcane: ["#6a3c8a", "#b07ad0"],
  poison: ["#5a7a2a", "#a0c850"],
};

export function elementBadge(el) {
  const p = new Pix(16, 16);
  const [dark, light] = ELEMENT_STYLE[el] || ["#666", "#999"];
  // rounded badge
  p.ellipse(8, 8, 7, 7, dark);
  p.ellipse(8, 7, 6, 6, light);
  p.ellipse(8, 6, 4, 3, shade(light, 0.2));
  const w = "#ffffff";
  const d = shade(dark, -0.3);
  switch (el) {
    case "fire":
      p.poly([[8, 3], [11, 8], [9, 8], [10, 12], [6, 7], [8, 7], [6, 4]], w);
      break;
    case "ice":
      p.line(8, 3, 8, 12, w);
      p.line(4, 5, 12, 10, w);
      p.line(4, 10, 12, 5, w);
      p.set(8, 7, d);
      break;
    case "lightning":
      p.poly([[9, 2], [5, 8], [8, 8], [6, 13], [11, 6], [8, 6], [10, 2]], w);
      break;
    case "water":
      p.poly([[8, 3], [11, 9], [8, 12], [5, 9]], w);
      p.set(7, 8, d);
      break;
    case "earth":
      p.poly([[3, 11], [7, 5], [10, 9], [12, 6], [14, 11]], w);
      break;
    case "wind":
      p.line(4, 5, 10, 5, w);
      p.set(11, 6, w);
      p.line(4, 8, 12, 8, w);
      p.set(3, 9, w);
      p.line(5, 11, 10, 11, w);
      p.set(11, 10, w);
      break;
    case "spirit":
      p.poly([[6, 11], [5, 6], [8, 3], [11, 6], [10, 11], [9, 9], [8, 11], [7, 9]], w);
      p.set(7, 6, d);
      p.set(9, 6, d);
      break;
    case "shadow":
      p.poly([[10, 3], [6, 5], [5, 8], [6, 11], [10, 13], [8, 10], [8, 6]], w);
      break;
    case "light":
      p.ellipse(8, 7, 2, 2, w);
      for (const [dx, dy] of [[0, -5], [0, 5], [-5, 0], [5, 0], [-4, -4], [4, 4], [-4, 4], [4, -4]]) p.set(8 + dx, 7 + dy, w);
      break;
    case "steel":
      p.poly([[4, 9], [6, 6], [10, 6], [12, 9], [10, 11], [6, 11]], w);
      p.line(6, 8, 10, 8, d);
      break;
    case "primal":
      for (let i = 0; i < 3; i++) p.line(4 + i * 3, 4 + i, 6 + i * 3, 12 - i, w);
      break;
    case "arcane":
      p.line(8, 3, 8, 12, w);
      p.line(8, 5, 5, 8, w);
      p.line(8, 5, 11, 8, w);
      p.set(8, 7, d);
      break;
    case "poison":
      p.poly([[8, 3], [11, 7], [8, 12], [5, 7]], w);
      p.set(7, 6, d);
      p.set(9, 9, d);
      p.set(4, 11, w);
      p.set(12, 4, w);
      break;
  }
  p.outline(0.5);
  return p;
}

/* ---------- touch controls ---------- */
export function dpad() {
  const p = new Pix(96, 96);
  const arm = (dx, dy, rot) => {
    // each arm 32x32
    const c = "#4a3a2e";
    const cl = "#6e5a44";
    p.rect(dx + 4, dy + 4, 24, 24, c);
    p.rect(dx + 4, dy + 4, 24, 2, cl);
  };
  // cross base
  p.rect(32, 0, 32, 96, "#3a2e24");
  p.rect(0, 32, 96, 32, "#3a2e24");
  p.rect(32, 0, 32, 96, "#4a3a2e");
  p.rect(0, 32, 96, 32, "#4a3a2e");
  p.rect(32, 32, 32, 32, "#544434");
  // edges
  p.rect(32, 0, 32, 2, "#6e5a44");
  p.rect(0, 32, 2, 32, "#6e5a44");
  p.rect(32, 94, 32, 2, "#241c14");
  p.rect(94, 32, 2, 32, "#241c14");
  // arrows
  const arrow = (cx, cy, dirx, diry) => {
    for (let i = 0; i < 6; i++) {
      const w = 6 - i;
      if (diry) p.rect(cx - w + 1, cy + diry * (i - 3), w * 2 - 1, 1, "#d8c8a8");
      else p.rect(cx + dirx * (i - 3), cy - w + 1, 1, w * 2 - 1, "#d8c8a8");
    }
  };
  arrow(48, 16, 0, -1);
  arrow(48, 80, 0, 1);
  arrow(16, 48, -1, 0);
  arrow(80, 48, 1, 0);
  // center rune stud
  p.ellipse(48, 48, 5, 5, "#3a2e24");
  p.ellipse(48, 48, 3, 3, RUNE);
  p.set(48, 48, "#d8fffa");
  p.outline(0.55);
  return p;
}

export function touchButton(letter, color) {
  const p = new Pix(36, 36);
  p.ellipse(18, 19, 17, 16, "#241c14");
  p.ellipse(18, 18, 17, 16, color);
  p.ellipse(18, 14, 12, 9, shade(color, 0.2));
  p.ellipse(14, 11, 5, 3, shade(color, 0.35));
  // pixel letter
  const glyphs = {
    A: ["0110", "1001", "1111", "1001"],
    B: ["1110", "1001", "1110", "1111"],
    M: ["10001", "11011", "10101", "10001"],
  };
  const g = glyphs[letter] || glyphs.A;
  const gh = g.length;
  const gw = g[0].length;
  const ox = 18 - (gw >> 1);
  const oy = 18 - (gh >> 1);
  g.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c === "1") {
        p.set(ox + x, oy + y + 1, "#241c14");
        p.set(ox + x, oy + y, "#ffffff");
      }
    });
  });
  return p;
}

/* ---------- misc ui ---------- */
export function ballPouch() {
  // 16x16 icon: leather pouch with balls peeking
  const p = new Pix(16, 16);
  p.rect(3, 6, 10, 8, "#6e4a2c");
  p.rect(3, 6, 10, 1, "#8a6a3a");
  p.rect(2, 5, 12, 1, "#5c3a20");
  p.ellipse(6, 5, 2, 2, "#7a5230");
  p.ellipse(10, 5, 2, 2, "#7a5230");
  p.set(6, 4, "#a8845a");
  p.rect(6, 9, 4, 1, "#d9a441");
  p.rect(7, 8, 2, 3, "#d9a441");
  p.outline(0.5);
  return p;
}

export function saveRune() {
  // 16x16: carved save-stone icon
  const p = new Pix(16, 16);
  p.poly([[4, 14], [3, 5], [8, 1], [13, 5], [12, 14]], "#7b7b86");
  p.poly([[5, 13], [4, 5], [8, 2], [9, 4], [6, 6], [6, 13]], "#9a9aa4");
  p.line(8, 5, 8, 11, RUNE);
  p.line(6, 7, 10, 7, RUNE);
  p.set(8, 7, "#e8fffa");
  p.outline(0.5);
  return p;
}
