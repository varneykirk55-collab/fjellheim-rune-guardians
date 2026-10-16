// village-palette.mjs - hue-shifted colour ramps for the Platinum-style
// village pass. Each ramp runs dark -> light; shadows drift toward blue/purple
// and highlights toward yellow, instead of mixing toward black/white.
import { Pix } from "./pix.mjs";

export const V = {
  ink: "#26182a", // outline for objects (never on ground tiles)
  shadow: [24, 16, 40, 70], // translucent cast shadow, works on any ground

  // grass
  g0: "#2c5638",
  g1: "#3a7440",
  g2: "#4f9446",
  g3: "#68b052",
  g4: "#88c862",
  g5: "#b0de7e",

  // packed-earth path
  d0: "#6a4a34",
  d1: "#966e48",
  d2: "#ba935e",
  d3: "#d4b27a",
  d4: "#e6cc96",

  // beach sand
  s0: "#a08458",
  s1: "#c8aa76",
  s2: "#dfc690",
  s3: "#efdcaa",
  s4: "#f8ecc8",

  // granite
  k0: "#2e2c3c",
  k1: "#4a4a5e",
  k2: "#69697e",
  k3: "#8a8a9c",
  k4: "#aeaebc",
  k5: "#cfcfd8",

  // water
  w0: "#244c98",
  w1: "#2f62b6",
  w2: "#3f7ccc",
  w3: "#5c98de",
  w4: "#94c6f2",
  w5: "#e2f4ff",

  // timber
  t0: "#2a1812",
  t1: "#44281a",
  t2: "#633c24",
  t3: "#845430",
  t4: "#a67040",
  t5: "#c89458",

  // reed thatch
  h0: "#4a3418",
  h1: "#6c4e22",
  h2: "#8e6c32",
  h3: "#b08c44",
  h4: "#ccaa5c",
  h5: "#e4c87c",

  // turf / moss on roofs
  m1: "#3e5a2c",
  m2: "#557a36",
  m3: "#6e9440",

  // accents
  red0: "#5e1c1c",
  red1: "#8c2a26",
  red2: "#b84232",
  red3: "#dc6a48",
  cream: "#f2e6c4",
  gold: "#e8b448",
  goldL: "#f8dc80",
  rune: "#5fd8d0",
  runeL: "#b8fff4",
  fire0: "#c23a20",
  fire1: "#ec7428",
  fire2: "#f8b440",
  fire3: "#fff0a0",
  window: "#ffd878",
  windowD: "#d89838",
  dark: "#1a1220",
};

/**
 * Paint a hand-authored pixel motif. `rows` are equal-length strings; each char
 * maps to a colour in `map`; "." and " " are transparent.
 */
export function stamp(p, x, y, rows, map) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === "." || ch === " ") continue;
      const c = map[ch];
      if (c === undefined) throw new Error(`stamp: no colour for '${ch}'`);
      p.set(x + i, y + j, c);
    }
  });
}

/** Opaque pixels of `p` get a 1px outline of colour `c` on transparent neighbours (4-way). */
export function outlineWith(p, c = V.ink) {
  const out = [];
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (p.opaque(x, y)) continue;
      if (p.opaque(x - 1, y) || p.opaque(x + 1, y) || p.opaque(x, y - 1) || p.opaque(x, y + 1)) out.push([x, y]);
    }
  for (const [x, y] of out) p.set(x, y, c);
  return p;
}

/** Copy `src` onto `dst` (opaque pixels only). */
export function over(dst, src, dx = 0, dy = 0) {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c[3]) dst.set(dx + x, dy + y, c);
    }
  return dst;
}

export function canvas(w, h) {
  return new Pix(w, h);
}
