// interior-tiles.mjs - Platinum-style 16x16 interior tiles for Bjorvik's rooms.
//
// Rooms keep their gameplay grid (legend keys such as "wall_int", "table");
// the renderer (src/data/maps/visual.ts) maps each cell to these art keys:
// - floors:  floor@<room>~v         (4 variants per room material)
// - walls:   wall_hi@<room>~v / wall_lo@<room>~v (the two-tile wall face),
//            wall_top#mask + wall_in#corner (dark beam tops seen from above)
// - shading: fshade#mask            (soft shadow cast by walls onto the floor)
// - furniture is drawn on transparency (deco layer) over the floor, with an
//   ink outline like the village objects; tall pieces get a *_top tile drawn
//   on the wall cell above them.
// Every room id doubles as its material theme, so each room reads differently.
import { Pix, mix } from "./pix.mjs";
import { V, stamp, outlineWith } from "./village-palette.mjs";

const N = 1;
const E = 2;
const W = 8;
const NE = 1;
const SE = 2;
const SW = 4;
const NW = 8;
const sh = (a) => [24, 16, 40, a];

export const FLOOR_VARIANTS = 4;
export const WALL_VARIANTS = 4;
export const ROOMS = ["home", "seer", "heal", "shop", "houseA", "houseB"];

/** tiny stable hash for hand-placed detail positions */
const hh = (a, b) => {
  let n = Math.imul(a + 17, 2654435761) ^ Math.imul(b + 31, 1597334677);
  n = Math.imul(n ^ (n >>> 15), 2246822519);
  return (n ^ (n >>> 13)) >>> 0;
};

/* ================================================================ floors */

const ENDS = [0, 6, 11, 3, 9, 13, 5];

/** horizontal boards; tones are fixed per board row so neighbouring tiles join */
function boards(p, r, v, { h = 4, knots = true, nails = null } = {}) {
  const rows = 16 / h;
  const tones = [r.m, mix(r.m, r.l, 0.6), mix(r.m, r.d, 0.3), r.m];
  for (let k = 0; k < rows; k++) {
    const y0 = k * h;
    const tone = tones[k % tones.length];
    p.rect(0, y0, 16, h - 1, tone);
    p.rect(0, y0, 16, 1, mix(tone, r.hl, 0.25));
    p.rect(0, y0 + h - 1, 16, 1, r.seam);
    // one soft grain stroke
    if (hh(k, v) % 2 === 0) {
      const gx = 1 + (hh(k * 5, v) % 10);
      const gy = y0 + 1 + (hh(k, k + v) % Math.max(1, h - 2));
      p.rect(gx, gy, 4, 1, mix(tone, r.d, 0.3));
    }
    // staggered board ends, on every other board only
    if ((k + v) % 2 === 0) {
      const ex = ENDS[(k * 3 + v) % ENDS.length];
      p.rect(ex, y0, 1, h - 1, mix(tone, r.seam, 0.7));
      if (nails)
        for (const nx of [ex - 2, ex + 2]) if (nx >= 0 && nx < 16) p.set(nx, y0 + ((h - 1) >> 1), nails);
    }
    if (knots && hh(k, v * 7) % 7 === 0) {
      const kx = 2 + (hh(v, k * 3) % 11);
      p.rect(kx, y0 + 1, 2, 1, mix(tone, r.d, 0.6));
    }
  }
}

/** 8x8 blocks of short boards that alternate direction (the weaver's floor) */
function parquet(p, r, v) {
  for (let by = 0; by < 2; by++)
    for (let bx = 0; bx < 2; bx++) {
      const x0 = bx * 8;
      const y0 = by * 8;
      const horiz = (bx + by) % 2 === 0;
      for (let s = 0; s < 2; s++) {
        const tone = [r.m, r.l, mix(r.m, r.d, 0.4)][(s + bx + by * 2 + v) % 3];
        if (horiz) {
          p.rect(x0, y0 + s * 4, 8, 3, tone);
          p.rect(x0, y0 + s * 4, 8, 1, mix(tone, r.hl, 0.35));
          p.rect(x0, y0 + s * 4 + 3, 8, 1, r.seam);
        } else {
          p.rect(x0 + s * 4, y0, 3, 8, tone);
          p.rect(x0 + s * 4, y0, 1, 8, mix(tone, r.hl, 0.35));
          p.rect(x0 + s * 4 + 3, y0, 1, 8, r.seam);
        }
      }
      if (hh(bx + by * 2, v) % 3 === 0) p.set(x0 + 2 + (v % 3), y0 + 5, r.d);
    }
}

const FLAG_LAYOUTS = [
  [[0, 0, 9, 7], [9, 0, 7, 7], [0, 7, 5, 9], [5, 7, 11, 9]],
  [[0, 0, 6, 9], [6, 0, 10, 9], [0, 9, 10, 7], [10, 9, 6, 7]],
  [[0, 0, 16, 6], [0, 6, 7, 10], [7, 6, 9, 10]],
  [[0, 0, 5, 8], [5, 0, 11, 8], [0, 8, 11, 8], [11, 8, 5, 8]],
];

/** irregular slate flagstones; mortar runs along each stone's top and left */
function flagstones(p, r, v) {
  p.rect(0, 0, 16, 16, r.seam);
  FLAG_LAYOUTS[v % FLAG_LAYOUTS.length].forEach(([x, y, w, h], i) => {
    const tone = r.tones[(i + v) % r.tones.length];
    p.rect(x + 1, y + 1, w - 1, h - 1, tone);
    p.rect(x + 1, y + 1, w - 1, 1, mix(tone, r.hl, 0.25));
    p.rect(x + 1, y + h - 1, w - 1, 1, mix(tone, r.seam, 0.2));
    if (hh(i, v) % 4 === 1 && w > 5) {
      // hairline crack
      const cx = x + 2 + (hh(v, i) % (w - 3));
      p.set(cx, y + 2, r.seam);
      p.set(cx + 1, y + 3, r.seam);
    }
  });
}

const FLOORS = {
  home: (p, v) => boards(p, { seam: V.t1, d: V.t2, m: V.t3, l: "#93603a", hl: V.t5 }, v),
  seer: (p, v) =>
    flagstones(p, { seam: "#2e2a3a", tones: ["#4c4860", "#524e66", "#48445a"], hl: "#6e6a86" }, v),
  heal: (p, v) => boards(p, { seam: "#b0905e", d: "#b89668", m: "#d2b282", l: "#dcbe8e", hl: "#f4e2b8" }, v, { knots: false }),
  shop: (p, v) => boards(p, { seam: V.t0, d: V.t1, m: V.t2, l: "#6e4428", hl: V.t4 }, v, { h: 8, nails: "#8a8a9c" }),
  houseA: (p, v) =>
    boards(p, { seam: "#3a3c40", d: "#5c5a58", m: "#7a756c", l: "#878175", hl: "#b0a894" }, v),
  houseB: (p, v) => parquet(p, { seam: "#6a4228", d: "#7e5032", m: "#94603a", l: "#a06a40", hl: "#b88050" }, v),
};

/* ================================================================ wall faces */
// A wall face is a 16x32 column: hi tile (rows 0-15) over lo tile (16-31).
//  0-4  carved roof beam      5-24 wall surface      25-26 rail
//  27-30 wainscot             31   baseboard

function beam(p, c, carve) {
  p.rect(0, 0, 16, 5, c.body);
  p.rect(0, 0, 16, 1, c.top);
  p.rect(0, 4, 16, 1, c.bot);
  carve(p);
}

function vstaves(p, y0, y1, tones, seam, hl, width = 4) {
  for (let x = 0; x < 16; x += width) {
    const t = tones[(x / width) % tones.length];
    p.rect(x, y0, width, y1 - y0, t);
    p.rect(x, y0, 1, y1 - y0, hl);
    p.rect(x + width - 1, y0, 1, y1 - y0, seam);
  }
}

function underBeamShadow(p) {
  p.rect(0, 5, 16, 1, sh(90));
  p.rect(0, 6, 16, 1, sh(40));
}

function rail(p, top, body, bot) {
  p.rect(0, 25, 16, 2, body);
  p.rect(0, 25, 16, 1, top);
  p.rect(0, 27, 16, 1, bot);
}

const WALLS = {
  home(p, v) {
    // cream wattle-and-daub between timber, carved zigzag roof beam
    p.rect(0, 5, 16, 20, "#d6c094");
    for (const [x, y] of [[3, 9], [11, 13], [6, 18], [13, 21], [2, 22], [9, 7]]) {
      if (hh(x, v) % 2) continue;
      p.set(x, y, "#bea476");
      p.set(x + 1, y, "#e6d4aa");
    }
    if (v === 2) {
      p.set(5, 14, "#a88e62");
      p.set(6, 15, "#a88e62");
      p.set(7, 15, "#a88e62");
      p.set(8, 16, "#a88e62");
    }
    if (v === 0) {
      // upright timber post
      p.rect(0, 5, 3, 20, V.t2);
      p.rect(0, 5, 1, 20, V.t3);
      p.rect(2, 5, 1, 20, V.t1);
      p.set(1, 12, V.t1);
      p.set(1, 20, V.t1);
    }
    beam(p, { body: V.t2, top: V.t4, bot: V.t0 }, (q) => {
      for (let x = 0; x < 16; x += 4) {
        q.set(x, 2, V.t3);
        q.set(x + 1, 1, V.t3);
        q.set(x + 2, 2, V.t3);
        q.set(x + 3, 3, V.t1);
      }
    });
    underBeamShadow(p);
    rail(p, V.t4, V.t3, V.t1);
    vstaves(p, 28, 31, [V.t2, V.t3, V.t2, "#704628"], V.t1, V.t3);
    p.rect(0, 31, 16, 1, V.t0);
  },
  seer(p, v) {
    // dark, smoke-blackened staves; knotwork beam lit by faint rune light
    vstaves(p, 5, 26, ["#3a2c3c", "#43334a", "#35283a", "#3e2f42"], "#221824", "#4f3d55");
    if (v === 1 || v === 3) {
      // a carved rune on one stave, glowing faintly
      const x = v === 1 ? 5 : 9;
      const glyph = v === 1 ? ["#.", "##", "#.", "##", "#."] : [".#.", "#.#", ".#.", ".#.", ".#."];
      stamp(p, x, 11, glyph, { "#": "#3f8f8a" });
      p.set(x, 10, "#2a5c5a");
    }
    if (v === 2) {
      p.set(7, 18, "#5a4458");
      p.set(7, 19, "#5a4458");
    }
    beam(p, { body: "#33242f", top: "#5a4458", bot: "#1c121a" }, (q) => {
      // interlace: two strands crossing every 8px
      for (let x = 0; x < 16; x++) {
        const a = Math.round(2 + Math.sin((x / 8) * Math.PI) * 1.4);
        const b = 4 - a;
        q.set(x, a, "#3f8f8a");
        q.set(x, b, "#2e6866");
      }
      q.set(4, 2, V.rune);
      q.set(12, 2, V.rune);
    });
    underBeamShadow(p);
    rail(p, "#4a3846", "#2a1e2a", "#160e16");
    // stone footing course
    p.rect(0, 27, 16, 5, "#1c1824");
    for (const [x, y, w] of [[0, 28, 6], [7, 28, 9], [0, 30, 10], [11, 30, 5]]) {
      p.rect(x, y, w - 1, 1, "#5a566a");
      p.rect(x, y + 1, w - 1, 1, "#47435a");
    }
  },
  heal(p, v) {
    // lime-washed planks, painted green beam with white dots
    vstaves(p, 5, 25, ["#e2dcc6", "#d8d2ba", "#e6e0cc", "#dcd6be"], "#b8ae92", "#f2eedc", 8);
    if (v === 1) {
      // stencilled healing leaves
      stamp(p, 4, 12, [".g.", "ggg", ".s.", ".s."], { g: "#7aa064", s: "#5a7a4a" });
      stamp(p, 10, 15, ["g.", "gg", ".s"], { g: "#7aa064", s: "#5a7a4a" });
    }
    if (v === 3) {
      p.set(6, 19, "#c4bca2");
      p.set(7, 19, "#c4bca2");
    }
    beam(p, { body: "#3f6a4c", top: "#6a9a6e", bot: "#243c2c" }, (q) => {
      for (let x = 1; x < 16; x += 4) q.set(x, 2, "#eef4e0");
    });
    underBeamShadow(p);
    rail(p, "#6a9a6e", "#3f6a4c", "#243c2c");
    vstaves(p, 28, 31, ["#c8a878", "#b8956a"], "#8a6c48", "#dcc092");
    p.rect(0, 31, 16, 1, "#6a5236");
  },
  shop(p, v) {
    // exposed wattle (woven withies) between oak stakes, brass-studded beam
    p.rect(0, 5, 16, 20, V.h1);
    for (let row = 0; row < 7; row++) {
      const y = 5 + row * 3;
      const off = row % 2 ? 2 : 0;
      for (let x = -off; x < 16; x += 4) {
        p.rect(x, y, 3, 2, row % 2 ? V.h3 : V.h2);
        p.rect(x, y, 3, 1, V.h4);
      }
    }
    const sx = v % 2 ? 11 : 3;
    p.rect(sx, 5, 2, 20, V.t2);
    p.rect(sx, 5, 1, 20, V.t3);
    beam(p, { body: V.t1, top: V.t3, bot: V.t0 }, (q) => {
      for (const x of [3, 11]) {
        q.set(x, 2, V.gold);
        q.set(x, 1, V.goldL);
      }
    });
    underBeamShadow(p);
    rail(p, V.t4, V.t2, V.t0);
    vstaves(p, 28, 31, [V.t1, V.t2], V.t0, V.t3, 8);
    p.rect(0, 31, 16, 1, V.t0);
  },
  houseA(p, v) {
    // salt-greyed clapboard, rope-wrapped rail
    for (let y = 5; y < 25; y += 4) {
      p.rect(0, y, 16, 4, ["#6e7882", "#76808a", "#68727c"][((y - 5) / 4) % 3]);
      p.rect(0, y, 16, 1, "#929ca4");
      p.rect(0, y + 3, 16, 1, "#4a525c");
    }
    if (v === 2) {
      p.set(9, 14, "#2e343c");
      p.set(10, 14, "#4a525c");
    }
    if (v === 1) {
      p.rect(3, 18, 4, 1, "#9aa6ae");
      p.set(4, 19, "#9aa6ae");
    }
    beam(p, { body: "#4a4e56", top: "#747c84", bot: "#2a2e34" }, (q) => {
      q.set(5, 2, "#2a2e34");
      q.set(13, 2, "#2a2e34");
    });
    underBeamShadow(p);
    // rope rail
    for (let x = 0; x < 16; x++) {
      p.set(x, 25, x % 3 === 0 ? "#9a8050" : "#d0b880");
      p.set(x, 26, x % 3 === 1 ? "#9a8050" : "#b89c64");
    }
    p.rect(0, 27, 16, 1, "#2a2e34");
    vstaves(p, 28, 31, ["#585e66", "#626870"], "#3a3e46", "#7a8088");
    p.rect(0, 31, 16, 1, "#2a2e34");
  },
  houseB(p, v) {
    // warm staves with a woven band - the weaver's own cloth
    vstaves(p, 5, 25, [V.t3, "#8a5832", V.t3, "#7e5030"], V.t2, V.t4);
    p.rect(0, 9, 16, 1, "#34407a");
    p.rect(0, 10, 16, 1, V.cream);
    p.rect(0, 11, 16, 3, V.red1);
    for (let x = 0; x < 16; x += 4) {
      p.set(x + 1, 12, V.cream);
      p.set(x, 11, V.red2);
      p.set(x + 2, 11, V.red2);
      p.set(x, 13, V.red2);
      p.set(x + 2, 13, V.red2);
    }
    p.rect(0, 14, 16, 1, V.cream);
    p.rect(0, 15, 16, 1, "#34407a");
    p.rect(0, 16, 16, 1, sh(50));
    if (v === 2) {
      p.set(6, 20, V.t1);
      p.set(6, 21, V.t1);
    }
    beam(p, { body: V.t2, top: V.t4, bot: V.t0 }, (q) => {
      for (let x = 0; x < 16; x += 4) {
        q.set(x + 1, 2, V.red2);
        q.set(x + 2, 2, V.red2);
      }
    });
    underBeamShadow(p);
    rail(p, V.t4, V.t3, V.t1);
    vstaves(p, 28, 31, [V.t2, "#704628"], V.t1, V.t3);
    p.rect(0, 31, 16, 1, V.t0);
  },
};

function wallColumn(room, v) {
  const p = new Pix(16, 32);
  WALLS[room](p, v);
  return p;
}

/* ================================================================ wall tops */

const TOP = { fill: "#1e141c", grain: "#271a22", rim: "#6a4a34", rim2: "#3e2a24" };

function drawWallTop(p, mask) {
  p.rect(0, 0, 16, 16, TOP.fill);
  for (let y = 3; y < 16; y += 5) p.rect(0, y, 16, 1, TOP.grain);
  if (mask & N) {
    p.rect(0, 0, 16, 1, TOP.rim);
    p.rect(0, 1, 16, 1, TOP.rim2);
  }
  if (mask & 4) {
    p.rect(0, 15, 16, 1, TOP.rim);
    p.rect(0, 14, 16, 1, TOP.rim2);
  }
  if (mask & W) {
    p.rect(0, 0, 1, 16, TOP.rim);
    p.rect(1, 0, 1, 16, TOP.rim2);
  }
  if (mask & E) {
    p.rect(15, 0, 1, 16, TOP.rim);
    p.rect(14, 0, 1, 16, TOP.rim2);
  }
}

function drawWallInner(p, c) {
  if (c & NE) p.rect(14, 0, 2, 2, TOP.rim2), p.set(15, 0, TOP.rim);
  if (c & SE) p.rect(14, 14, 2, 2, TOP.rim2), p.set(15, 15, TOP.rim);
  if (c & SW) p.rect(0, 14, 2, 2, TOP.rim2), p.set(0, 15, TOP.rim);
  if (c & NW) p.rect(0, 0, 2, 2, TOP.rim2), p.set(0, 0, TOP.rim);
}

/** soft shadow the walls cast onto the floor (N = wall face above, E/W = side walls) */
function drawFloorShade(p, mask) {
  if (mask & N) {
    p.rect(0, 0, 16, 1, sh(120));
    p.rect(0, 1, 16, 1, sh(80));
    p.rect(0, 2, 16, 1, sh(45));
    p.rect(0, 3, 16, 1, sh(20));
  }
  if (mask & W) {
    p.rect(0, 0, 1, 16, sh(70));
    p.rect(1, 0, 1, 16, sh(30));
  }
  if (mask & E) {
    p.rect(15, 0, 1, 16, sh(70));
    p.rect(14, 0, 1, 16, sh(30));
  }
}

/* ================================================================ furniture */
// Pieces are painted on a canvas spanning their whole footprint, outlined in
// ink, then sliced into 16x16 tiles so seams between tiles never get outlines.

function piece(w, h, draw) {
  const p = new Pix(w, h);
  draw(p);
  return outlineWith(p, V.ink);
}

const slice = (pix, sx, sy) => (p) => p.blit(pix, -sx, -sy);

function drawTable(room) {
  return piece(16, 16, (p) => {
    // trestle legs and stretcher
    p.rect(2, 10, 2, 5, V.t1);
    p.rect(12, 10, 2, 5, V.t1);
    p.rect(3, 12, 10, 1, V.t1);
    // plank top, seen in three-quarter view
    p.rect(1, 3, 14, 6, V.t4);
    p.rect(1, 3, 14, 1, V.t5);
    p.rect(1, 6, 14, 1, V.t3);
    p.rect(1, 9, 14, 2, V.t2);
    p.rect(1, 10, 14, 1, V.t1);
    if (room === "houseA") {
      // fish on a board
      p.rect(3, 4, 6, 2, "#a8b4bc");
      p.rect(3, 4, 6, 1, "#d0dae0");
      p.set(2, 5, "#7a8890");
      p.set(9, 4, "#7a8890");
      p.set(9, 6, "#7a8890");
      p.set(4, 4, V.ink);
      stamp(p, 11, 3, ["cc", "bb"], { c: V.cream, b: V.t2 });
    } else if (room === "houseB") {
      // yarn ball and drop spindle
      p.ellipse(5, 5, 2, 2, V.red2);
      p.set(4, 4, V.red3);
      p.set(6, 6, V.red1);
      p.rect(9, 4, 5, 1, V.t2);
      p.ellipse(11, 4, 1, 1, V.t3);
      p.rect(8, 5, 2, 1, V.cream);
    } else {
      // bread, a wooden bowl and a cup
      p.ellipse(4, 5, 2, 1, V.d2);
      p.set(3, 4, V.d3);
      p.set(4, 4, V.d4);
      p.ellipse(10, 5, 2, 1, V.t2);
      p.rect(9, 4, 3, 1, V.cream);
      p.rect(13, 3, 1, 2, V.k3);
    }
  });
}

function drawStool() {
  return piece(16, 16, (p) => {
    p.rect(4, 9, 1, 5, V.t1);
    p.rect(11, 9, 1, 5, V.t1);
    p.rect(7, 10, 2, 5, V.t1);
    p.ellipse(8, 8, 5, 2, V.t3);
    p.ellipse(8, 7, 5, 2, V.t4);
    p.rect(5, 6, 4, 1, V.t5);
  });
}

function drawBarrel() {
  return piece(16, 16, (p) => {
    p.rect(3, 4, 10, 11, V.t3);
    p.rect(2, 6, 12, 7, V.t3);
    for (const x of [4, 7, 10]) p.rect(x, 4, 1, 11, V.t2);
    p.rect(3, 4, 1, 11, V.t4);
    p.rect(2, 6, 12, 1, V.k2);
    p.rect(2, 11, 12, 1, V.k2);
    p.rect(2, 6, 1, 1, V.k3);
    p.ellipse(8, 4, 5, 1, V.t4);
    p.rect(5, 4, 6, 1, V.t5);
    p.rect(3, 14, 10, 1, V.t1);
  });
}

function drawCrate() {
  return piece(16, 16, (p) => {
    p.rect(2, 3, 12, 12, V.t3);
    p.rect(2, 3, 12, 3, V.t4);
    p.rect(2, 3, 12, 1, V.t5);
    p.rect(2, 6, 12, 1, V.t1);
    p.rect(2, 6, 2, 9, V.t2);
    p.rect(12, 6, 2, 9, V.t2);
    p.rect(2, 13, 12, 2, V.t2);
    p.line(4, 12, 11, 7, V.t2);
    p.set(3, 7, V.k3);
    p.set(12, 7, V.k3);
  });
}

function drawPot() {
  return piece(16, 16, (p) => {
    p.ellipse(8, 10, 5, 4, "#9a5a34");
    p.ellipse(7, 9, 4, 3, "#b46e40");
    p.rect(5, 4, 6, 3, "#9a5a34");
    p.ellipse(8, 4, 3, 1, "#c88452");
    p.rect(6, 4, 4, 1, "#5a2e1c");
    p.rect(4, 10, 8, 1, "#6e3a22");
    p.set(5, 8, "#d49a64");
    p.set(6, 7, "#d49a64");
    p.rect(5, 14, 6, 1, "#6e3a22");
  });
}

const BLANKET = {
  home: { a: V.red2, b: V.red1, c: V.cream, fur: "#b89470" },
  houseA: { a: "#5a7896", b: "#435c78", c: "#c8d4dc", fur: "#9a9488" },
  houseB: { a: "#6a4a8a", b: "#4e3468", c: V.gold, fur: "#c8a878" },
};

function drawBed(room) {
  const b = BLANKET[room] ?? BLANKET.home;
  return piece(16, 32, (p) => {
    // carved headboard
    p.rect(1, 1, 14, 7, V.t2);
    p.rect(1, 1, 14, 1, V.t4);
    p.rect(3, 3, 10, 3, V.t1);
    p.set(5, 4, V.t4);
    p.set(8, 4, V.t4);
    p.set(11, 4, V.t4);
    p.set(1, 0, V.t3);
    p.set(14, 0, V.t3);
    // side rails and mattress
    p.rect(1, 8, 14, 22, V.t2);
    p.rect(2, 8, 12, 21, V.cream);
    p.rect(3, 9, 10, 4, "#fff6dc");
    p.rect(3, 12, 10, 1, "#d8cca8");
    // wool blanket with stripes and a fur throw
    p.rect(2, 14, 12, 15, b.a);
    p.rect(2, 14, 12, 1, mix(b.a, "#ffffff", 0.25));
    p.rect(2, 18, 12, 1, b.c);
    p.rect(2, 24, 12, 1, b.c);
    p.rect(2, 19, 12, 5, b.b);
    for (let x = 3; x < 13; x += 3) p.set(x, 21, b.c);
    p.rect(2, 25, 12, 3, b.fur);
    for (let x = 2; x < 14; x += 2) p.set(x, 27, mix(b.fur, "#000000", 0.25));
    // footboard
    p.rect(1, 28, 14, 3, V.t3);
    p.rect(1, 28, 14, 1, V.t4);
  });
}

const SHELF_GOODS = {
  home(p) {
    p.ellipse(4, 7, 2, 2, "#b46e40");
    p.rect(3, 4, 3, 1, "#9a5a34");
    p.ellipse(10, 8, 3, 1, V.t2);
    p.rect(8, 7, 5, 1, V.cream);
    p.ellipse(5, 16, 3, 2, V.gold);
    p.rect(3, 15, 5, 1, V.goldL);
    p.rect(10, 13, 2, 4, V.k3);
    p.rect(12, 14, 1, 3, V.k2);
    p.ellipse(5, 25, 2, 2, "#5a7896");
    p.rect(9, 23, 4, 4, V.t3);
    p.rect(9, 23, 4, 1, V.t5);
  },
  heal(p) {
    // clay jars of dried herbs, horn vials, mortar and pestle
    for (const [x, c] of [[2, "#7aa064"], [6, "#a8783c"], [10, "#9a6aa8"]]) {
      p.rect(x, 5, 3, 4, "#c8a070");
      p.rect(x, 5, 3, 1, c);
      p.set(x + 1, 4, c);
    }
    for (const x of [3, 5, 7]) {
      p.rect(x, 13, 1, 4, "#e8dcc0");
      p.set(x, 13, V.t2);
    }
    p.ellipse(11, 16, 2, 1, V.k3);
    p.line(12, 12, 10, 15, V.t3);
    p.rect(2, 23, 5, 4, "#5a7a4a");
    p.rect(2, 23, 5, 1, "#88b070");
    p.set(4, 22, "#88b070");
    p.ellipse(11, 25, 2, 2, "#b46e40");
  },
  shop(p) {
    // rune balls, tonics and folded cloth
    for (const x of [3, 7, 11]) {
      p.ellipse(x, 7, 2, 2, V.k3);
      p.set(x, 7, V.rune);
      p.set(x - 1, 6, V.k5);
    }
    for (const x of [3, 6]) {
      p.rect(x, 14, 2, 3, "#c84a4a");
      p.rect(x, 13, 2, 1, V.t4);
    }
    p.rect(9, 14, 2, 3, "#4a7ac8");
    p.rect(9, 13, 2, 1, V.t4);
    p.rect(2, 24, 6, 3, "#3c5a8a");
    p.rect(2, 23, 6, 1, "#5a7aaa");
    p.rect(9, 24, 5, 3, V.red1);
    p.rect(9, 23, 5, 1, V.red2);
  },
  houseA(p) {
    // fishing tackle: rope coil, net floats, a lamp
    p.ellipse(5, 7, 3, 2, "#c8b07a");
    p.ellipse(5, 7, 1, 1, "#7a6440");
    p.rect(10, 4, 3, 4, V.k2);
    p.rect(11, 5, 1, 2, V.window);
    for (const x of [3, 6, 9, 12]) p.ellipse(x, 16, 1, 1, x % 2 ? V.red2 : V.cream);
    p.rect(3, 23, 9, 4, "#6a7a6a");
    for (let x = 3; x < 12; x += 2) p.set(x, 24, "#4a5a4a");
  },
  houseB(p) {
    // folded cloth stacks and yarn
    for (const [x, c] of [[2, V.red1], [8, "#34407a"]]) {
      p.rect(x, 5, 6, 2, c);
      p.rect(x, 7, 6, 2, V.cream);
      p.rect(x, 5, 6, 1, mix(c, "#ffffff", 0.3));
    }
    for (const [x, c] of [[3, V.red2], [7, V.gold], [11, "#5a8a5a"]]) {
      p.ellipse(x, 15, 2, 2, c);
      p.set(x - 1, 14, mix(c, "#ffffff", 0.4));
    }
    p.rect(2, 23, 11, 4, "#8a6aa8");
    p.rect(2, 23, 11, 1, "#a888c4");
  },
};

/** 16x32 open shelf; rows 0-15 overlap the wall face above the shelf's tile */
function drawShelf(room) {
  return piece(16, 32, (p) => {
    p.rect(1, 1, 14, 30, V.t1);
    p.rect(2, 2, 12, 28, "#2e1c16");
    p.rect(1, 1, 1, 30, V.t3);
    p.rect(14, 1, 1, 30, V.t2);
    for (const y of [10, 19, 28]) {
      p.rect(1, y, 14, 2, V.t3);
      p.rect(1, y, 14, 1, V.t4);
    }
    p.rect(1, 1, 14, 1, V.t4);
    (SHELF_GOODS[room] ?? SHELF_GOODS.home)(p);
  });
}

/** the seer's scroll rack: rolled scrolls, carved bone tablets, a glowing shard */
function drawScrollRack(seed) {
  return piece(16, 32, (p) => {
    p.rect(1, 1, 14, 30, "#2a1c26");
    p.rect(2, 2, 12, 28, "#160e14");
    p.rect(1, 1, 1, 30, "#4e3a4c");
    for (const y of [10, 19, 28]) {
      p.rect(1, y, 14, 2, "#3e2c3a");
      p.rect(1, y, 14, 1, "#5a4458");
    }
    // cubby dividers
    for (const x of [5, 10]) p.rect(x, 2, 1, 26, "#2a1c26");
    // scrolls end-on
    const cubbies = [[3, 7], [8, 7], [12, 7], [3, 16], [8, 16], [12, 16], [3, 25], [8, 25], [12, 25]];
    cubbies.forEach(([x, y], i) => {
      const k = (i + seed) % 5;
      if (k === 0 || k === 3) {
        p.ellipse(x, y, 1, 1, V.cream);
        p.ellipse(x + 1, y + 1, 1, 1, "#d8c8a0");
        p.set(x, y, V.red1);
      } else if (k === 1) {
        p.rect(x - 1, y - 2, 3, 4, "#e8dcc0");
        p.set(x, y - 1, "#7a6a5a");
        p.set(x, y + 1, "#7a6a5a");
      } else if (k === 2) {
        p.set(x, y, V.rune);
        p.set(x, y - 1, V.runeL);
        p.set(x + 1, y + 1, "#3f8f8a");
      } else {
        p.ellipse(x, y, 1, 1, "#8a6a9a");
      }
    });
    p.rect(1, 1, 14, 1, "#5a4458");
  });
}

const COUNTER = {
  default: { top: V.t4, hl: V.t5, edge: V.t2, front: V.t3, panel: V.t2, carve: V.t1 },
  shop: { top: V.t3, hl: V.t5, edge: V.t1, front: V.t2, panel: V.t1, carve: V.gold },
  heal: { top: "#cfae7e", hl: "#f4e2b8", edge: "#8a6c48", front: "#b08c60", panel: "#3f6a4c", carve: "#6a9a6e" },
};

/** counters join left/right; `mask` uses E/W bits for neighbouring counter cells */
function drawCounter(room, mask) {
  const c = COUNTER[room] ?? COUNTER.default;
  const p = new Pix(16, 16);
  const x0 = mask & W ? 0 : 1;
  const x1 = mask & E ? 16 : 15;
  const w = x1 - x0;
  p.rect(x0, 3, w, 5, c.top);
  p.rect(x0, 3, w, 1, c.hl);
  p.rect(x0, 7, w, 1, c.edge);
  p.rect(x0, 8, w, 6, c.front);
  // carved front panels
  for (let x = 2; x < 16; x += 8) {
    if (x < x0 + 1 || x + 4 > x1) continue;
    p.rect(x, 9, 5, 4, c.panel);
    p.set(x + 2, 10, c.carve);
    p.set(x + 1, 11, c.carve);
    p.set(x + 3, 11, c.carve);
  }
  p.rect(x0, 14, w, 1, c.edge);
  if (room === "heal" && !(mask & W)) {
    // healer's mortar and a bowl of herbs
    p.ellipse(5, 4, 2, 1, V.k3);
    p.line(6, 1, 5, 3, V.t3);
  }
  if (room === "heal" && !(mask & E)) {
    p.ellipse(10, 4, 3, 1, V.t2);
    p.rect(8, 3, 5, 1, "#7aa064");
  }
  if (room === "shop" && !(mask & W)) {
    // merchant's balance scale
    p.rect(6, 0, 1, 5, V.k2);
    p.rect(3, 1, 7, 1, V.k3);
    p.rect(2, 3, 3, 1, V.gold);
    p.rect(8, 3, 3, 1, V.gold);
  }
  if (room === "shop" && !(mask & E)) {
    // stacked silver
    p.rect(7, 4, 3, 1, V.k4);
    p.rect(8, 3, 3, 1, V.k5);
    p.set(11, 5, V.k4);
  }
  // ink outline: top, bottom, and the open ends
  const ink = (x, y) => p.set(x, y, V.ink);
  for (let x = x0; x < x1; x++) {
    if (!p.opaque(x, 2)) ink(x, 2);
    ink(x, 15);
  }
  for (let x = 0; x < 16; x++) for (let y = 0; y < 3; y++) if (p.opaque(x, y + 1) && !p.opaque(x, y) && y < 2) ink(x, y);
  if (!(mask & W)) for (let y = 3; y < 15; y++) ink(0, y);
  if (!(mask & E)) for (let y = 3; y < 15; y++) ink(15, y);
  return p;
}

function drawRug(part) {
  return (p) => {
    const x0 = part === "l" ? 2 : 0;
    const x1 = part === "r" ? 14 : 16;
    p.rect(x0, 3, x1 - x0, 11, V.red1);
    p.rect(x0, 4, x1 - x0, 1, V.gold);
    p.rect(x0, 12, x1 - x0, 1, V.gold);
    p.rect(x0, 5, x1 - x0, 7, V.red2);
    if (part === "m") {
      // knotwork lozenge
      p.poly([[8, 5], [12, 8], [8, 11], [4, 8]], V.gold);
      p.poly([[8, 6], [10, 8], [8, 10], [6, 8]], V.red1);
      p.set(8, 8, V.goldL);
    } else {
      const cx = part === "l" ? 8 : 7;
      p.rect(cx - 1, 7, 3, 3, V.red1);
      p.set(cx, 8, V.gold);
    }
    // fringe at the ends
    if (part === "l") for (let y = 4; y < 13; y += 2) p.set(1, y, V.cream);
    if (part === "r") for (let y = 4; y < 13; y += 2) p.set(14, y, V.cream);
    p.rect(x0, 14, x1 - x0, 1, sh(60));
  };
}

function drawHealRune(p) {
  p.ellipse(8, 8, 6, 5, [63, 143, 138, 110]);
  p.ellipseOutline(8, 8, 6, 5, V.rune);
  // berkanan, the birch rune of healing
  stamp(p, 6, 4, ["#..", "##.", "#.#", "##.", "#.#", "##.", "#.."], { "#": V.runeL });
}

function drawFire(p, f, cx, by, w, hgt) {
  const flick = [0, 1, -1][f % 3];
  for (let i = 0; i < w; i++) {
    const x = cx - (w >> 1) + i;
    const hh2 = Math.max(1, hgt - Math.abs(i - (w >> 1)) * 2 + ((i + f) % 2 ? flick : -flick));
    for (let y = 0; y < hh2; y++) {
      const t = y / hh2;
      p.set(x, by - y, t < 0.3 ? V.fire1 : t < 0.7 ? V.fire2 : V.fire3);
    }
    p.set(x, by, V.fire0);
  }
}

/** fireplace set into the wall: the stone breast is the hearth_top tile */
function drawWallHearth(p, f) {
  p.rect(0, 0, 16, 16, V.k1);
  for (const [x, y, w] of [[0, 0, 5], [5, 0, 6], [11, 0, 5], [0, 4, 3], [13, 4, 3], [0, 9, 3], [13, 9, 3]]) {
    p.rect(x, y, w - 1, 3, V.k2);
    p.rect(x, y, w - 1, 1, V.k3);
  }
  p.rect(3, 4, 10, 12, V.dark);
  p.rect(4, 3, 8, 1, V.k3);
  p.rect(2, 3, 12, 1, V.k4);
  p.rect(4, 13, 8, 2, V.t1);
  p.rect(5, 12, 6, 1, V.t2);
  drawFire(p, f, 8, 13, 6, 6 + (f === 1 ? 1 : 0));
  p.rect(3, 15, 10, 1, "#3a2420");
}

function drawHearthTop(p) {
  // stone chimney breast rising into the roof beam
  for (const [x, y, w] of [[2, 0, 6], [8, 0, 6], [2, 4, 4], [6, 4, 8], [2, 8, 7], [9, 8, 5], [2, 12, 5], [7, 12, 7]]) {
    p.rect(x, y, w, 4, V.k1);
    p.rect(x, y, w - 1, 3, V.k2);
    p.rect(x, y, w - 1, 1, V.k3);
  }
  p.rect(1, 0, 1, 16, V.ink);
  p.rect(14, 0, 1, 16, V.ink);
  p.rect(0, 15, 16, 1, V.k1);
  p.rect(0, 14, 16, 1, V.k3);
  p.rect(0, 15, 1, 1, V.ink);
  p.rect(15, 15, 1, 1, V.ink);
  // carved knot on the breast
  p.set(8, 6, V.k4);
  p.set(7, 7, V.k4);
  p.set(9, 7, V.k4);
  p.set(8, 8, V.k4);
}

/** open floor fire pit, ringed with stones (longhouse hearth) */
function drawFirePit(p, f) {
  p.ellipse(8, 10, 6, 4, V.ink);
  p.ellipse(8, 10, 5, 3, V.k1);
  p.ellipse(8, 10, 4, 2, "#3a2420");
  for (const [x, y] of [[3, 9], [5, 7], [8, 7], [11, 7], [13, 9], [12, 12], [8, 13], [4, 12]]) {
    p.rect(x - 1, y - 1, 2, 2, V.k3);
    p.set(x - 1, y - 1, V.k4);
  }
  p.rect(5, 10, 6, 1, V.t2);
  p.line(6, 11, 10, 9, V.t1);
  drawFire(p, f, 8, 10, 5, 7);
  p.set(6, 12, V.fire1);
  p.set(10, 11, V.fire0);
}

const BANNERS = {
  home: { cloth: V.red2, dark: V.red1, sign: V.gold, emblem: [".#.", "###", ".#."] },
  seer: { cloth: "#2e3a6a", dark: "#1e2648", sign: V.rune, emblem: ["#.#", ".#.", "###"] },
  heal: { cloth: "#4a7a54", dark: "#2e5038", sign: V.cream, emblem: ["#.", "##", "#.", "##"] },
  shop: { cloth: "#b8862e", dark: "#8a5e1c", sign: V.t1, emblem: [".#.", "#.#", ".#."] },
  houseA: { cloth: "#4a6a8a", dark: "#2e4a68", sign: V.cream, emblem: ["#..", "###", "#.."] },
  houseB: { cloth: "#6a4a8a", dark: "#4e3468", sign: V.gold, emblem: ["#.#", ".#.", "#.#"] },
};

/** 16x32 hanging banner; rows 0-15 on the upper wall face, 16-31 on the lower */
function drawBanner(room) {
  const b = BANNERS[room] ?? BANNERS.home;
  return piece(16, 32, (p) => {
    p.rect(4, 11, 8, 15, b.cloth);
    p.rect(4, 11, 1, 15, mix(b.cloth, "#ffffff", 0.2));
    p.rect(11, 11, 1, 15, b.dark);
    p.rect(4, 13, 8, 1, b.sign);
    p.rect(4, 24, 8, 1, b.sign);
    stamp(p, 7 - (b.emblem[0].length > 2 ? 0 : 0), 17, b.emblem, { "#": b.sign });
    // swallowtail hem
    p.rect(4, 26, 3, 2, b.cloth);
    p.rect(9, 26, 3, 2, b.cloth);
    p.set(4, 28, b.dark);
    p.set(11, 28, b.dark);
    // pole with finials
    p.rect(2, 10, 12, 1, V.t2);
    p.rect(2, 9, 12, 1, V.t4);
    p.set(1, 9, V.gold);
    p.set(14, 9, V.gold);
    p.set(7, 8, V.t1);
    p.set(8, 7, V.t1);
  });
}

function drawDoorMat(p) {
  p.rect(0, 0, 16, 16, TOP.fill);
  p.rect(0, 0, 2, 16, V.t1);
  p.rect(14, 0, 2, 16, V.t1);
  p.rect(1, 0, 1, 16, V.t2);
  p.rect(14, 0, 1, 16, V.t2);
  // woven doormat
  p.rect(2, 0, 12, 10, V.h2);
  for (let y = 0; y < 10; y += 2) for (let x = 2 + ((y / 2) % 2); x < 14; x += 2) p.set(x, y, V.h3);
  p.rect(2, 9, 12, 1, V.h1);
  // daylight through the doorway
  p.rect(2, 10, 12, 2, "#c8a864");
  p.rect(2, 12, 12, 2, "#e8cc84");
  p.rect(2, 14, 12, 2, "#f8e8b0");
}

/* ================================================================ register */

export function registerInteriorTiles(tile, animTiles) {
  // plain keys from the room legend: used for collision, and as fallbacks
  tile("boards", {}, (p) => FLOORS.home(p, 0));
  tile("boards2", {}, (p) => FLOORS.seer(p, 0));
  tile("wall_int", { solid: true }, (p) => p.blit(wallColumn("home", 1), 0, -16));
  tile("wall_int_banner", { solid: true }, (p) => p.blit(wallColumn("home", 1), 0, -16));
  tile("door_int", {}, drawDoorMat);
  tile("stairs", {}, (p) => {
    p.rect(0, 0, 16, 16, V.t0);
    for (let i = 0; i < 4; i++) {
      p.rect(1, 1 + i * 4, 14, 3, i % 2 ? V.t2 : V.t3);
      p.rect(1, 1 + i * 4, 14, 1, V.t4);
    }
  });

  for (const room of ROOMS) {
    for (let v = 0; v < FLOOR_VARIANTS; v++) tile(`floor@${room}~${v}`, {}, (p) => FLOORS[room](p, v));
    for (let v = 0; v < WALL_VARIANTS; v++) {
      const col = wallColumn(room, v);
      tile(`wall_hi@${room}~${v}`, { solid: true }, slice(col, 0, 0));
      tile(`wall_lo@${room}~${v}`, { solid: true }, slice(col, 0, 16));
    }
    const banner = drawBanner(room);
    tile(`banner_top@${room}`, { solid: true, deco: true }, slice(banner, 0, 0));
    tile(`banner@${room}`, { solid: true, deco: true }, slice(banner, 0, 16));
  }
  for (let m = 0; m < 16; m++) tile(`wall_top#${m}`, { solid: true }, (p) => drawWallTop(p, m));
  for (let c = 1; c < 16; c++) tile(`wall_in#${c}`, { solid: true, overlay: true }, (p) => drawWallInner(p, c));
  for (let m = 1; m < 16; m++) tile(`fshade#${m}`, { overlay: true }, (p) => drawFloorShade(p, m));

  // furniture (solid, drawn over the floor on the decoration layer)
  const furn = { solid: true, deco: true };
  tile("table", furn, slice(drawTable("home"), 0, 0));
  tile("table@houseA", furn, slice(drawTable("houseA"), 0, 0));
  tile("table@houseB", furn, slice(drawTable("houseB"), 0, 0));
  tile("stool", furn, slice(drawStool(), 0, 0));
  tile("barrel", furn, slice(drawBarrel(), 0, 0));
  tile("crate", furn, slice(drawCrate(), 0, 0));
  tile("pot", furn, slice(drawPot(), 0, 0));
  for (const room of ["home", "houseA", "houseB"]) {
    const bed = drawBed(room);
    const sfx = room === "home" ? "" : `@${room}`;
    tile(`bed_top${sfx}`, furn, slice(bed, 0, 0));
    tile(`bed_bot${sfx}`, furn, slice(bed, 0, 16));
  }
  for (const room of ["home", "heal", "shop", "houseA", "houseB"]) {
    const shelf = drawShelf(room);
    const sfx = room === "home" ? "" : `@${room}`;
    tile(`shelf_top${sfx}`, furn, slice(shelf, 0, 0));
    tile(`shelf${sfx}`, furn, slice(shelf, 0, 16));
  }
  for (let v = 0; v < 2; v++) {
    const rack = drawScrollRack(v * 2);
    const sfx = v ? `~${v}` : "";
    tile(`bookshelf_top${sfx}`, furn, slice(rack, 0, 0));
    tile(`bookshelf${sfx}`, furn, slice(rack, 0, 16));
  }
  for (const room of ["default", "heal", "shop"]) {
    for (const m of [0, E, W, E | W]) {
      const sfx = room === "default" ? "" : `@${room}`;
      const pix = drawCounter(room, m);
      tile(m === 0 && room === "default" ? "counter" : `counter${sfx}#${m}`, furn, slice(pix, 0, 0));
    }
  }
  tile("rug_l", { deco: true }, drawRug("l"));
  tile("rug_m", { deco: true }, drawRug("m"));
  tile("rug_r", { deco: true }, drawRug("r"));
  tile("heal_rune", { deco: true }, drawHealRune);
  // "hearth" in the legend: an open fire pit on the floor, or (in the wall band)
  // a stone fireplace - the renderer picks hearth_wall for the latter
  animTiles("hearth", { solid: true, deco: true }, 3, drawFirePit);
  animTiles("hearth_wall", { solid: true }, 3, drawWallHearth);
  tile("hearth_top", { solid: true, deco: true }, drawHearthTop);
}
