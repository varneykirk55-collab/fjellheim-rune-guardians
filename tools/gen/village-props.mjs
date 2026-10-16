// village-props.mjs - trees, vegetation and lived-in details for Bjorvik.
//
// Each prop is drawn on transparency with an ink outline and a translucent
// contact shadow, so it sits on any ground. Props are placed from map data
// (MapDef.objects) anchored at their bottom-left tile; only the bottom `foot`
// rows of a prop block movement, so tall things (trees, lanterns) overlap the
// tiles behind them like Platinum's scenery.
import { Pix } from "./pix.mjs";
import { V, outlineWith, stamp } from "./village-palette.mjs";

function finish(p) {
  outlineWith(p, V.ink);
  return p;
}

/** translucent ellipse-ish contact shadow (after outlining) */
function shadow(p, x0, x1, y, rows = 2) {
  for (let j = 0; j < rows; j++)
    for (let x = x0 + j * 2; x <= x1 - j * 2; x++) if (!p.opaque(x, y + j)) p.set(x, y + j, V.shadow);
}

/* ================================================================ conifers */

/**
 * Tiered conifer. Tiers are drawn bottom-first so each upper tier overlaps the
 * one below; the pixel row under an upper tier's scalloped hem is shaded as
 * the shadow it casts. Light comes from the upper left.
 */
function conifer(p, { cx, top, tiers, trunk, lean = 0, cool = false }) {
  const owner = new Int16Array(p.w * p.h).fill(-1);
  const ramp = cool ? ["#1e3e36", "#2c5a46", "#3e7650", "#58945a", "#82b46a"] : [V.g0, V.g1, V.g2, V.g3, V.g4];
  // trunk first, foliage covers its top
  for (let y = trunk.y0; y <= trunk.y1; y++) {
    p.set(cx - 1, y, V.t4);
    p.set(cx, y, V.t3);
    p.set(cx + 1, y, V.t2);
    if (trunk.w > 3) p.set(cx + 2, y, V.t1);
  }
  for (let i = tiers.length - 1; i >= 0; i--) {
    const [ty, th, hw] = tiers[i];
    const tcx = cx + Math.round(lean * (i / Math.max(1, tiers.length - 1)));
    for (let yy = 0; yy < th; yy++) {
      const t = yy / (th - 1);
      const span = Math.round(1 + (hw - 1) * Math.pow(t, 0.85));
      for (let dx = -span; dx <= span; dx++) {
        // scalloped hem: bough tips hang lower than the gaps between them
        if (yy >= th - 2) {
          const k = ((dx + span) % 4 + 4) % 4;
          if (yy === th - 1 && k !== 1 && k !== 2) continue;
        }
        const x = tcx + dx;
        const y = ty + yy;
        if (x < 0 || y < 0 || x >= p.w || y >= p.h) continue;
        // light: strongest at upper-left of each tier
        const L = -dx / hw - t * 0.9 + 0.55;
        let c = L > 0.85 ? ramp[4] : L > 0.35 ? ramp[3] : L > -0.25 ? ramp[2] : ramp[1];
        // needle clumps: short diagonal strokes one shade darker
        if ((x * 2 + y * 3) % 7 === 0 && c !== ramp[1]) c = ramp[Math.max(1, ramp.indexOf(c) - 1)];
        p.set(x, y, c);
        owner[y * p.w + x] = i;
      }
    }
  }
  // cast shadow under each upper tier's hem
  for (let y = 1; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const o = owner[y * p.w + x];
      const above = owner[(y - 1) * p.w + x];
      if (o >= 0 && above >= 0 && above < o) p.set(x, y, ramp[0]);
    }
}

/** tall, slightly leaning spruce (keeps pine_0's 32x56 size) */
export function pine0() {
  const p = new Pix(32, 56);
  conifer(p, {
    cx: 15,
    top: 1,
    lean: 1,
    trunk: { y0: 40, y1: 51, w: 4 },
    tiers: [
      [1, 9, 5],
      [6, 11, 8],
      [13, 12, 11],
      [21, 13, 13],
      [30, 13, 15],
    ],
  });
  finish(p);
  shadow(p, 7, 25, 52, 2);
  return { pix: p, key: "pine_0", w: 32, h: 56 };
}

/** fuller, rounder pine (keeps pine_1's 32x56 size) */
export function pine1() {
  const p = new Pix(32, 56);
  conifer(p, {
    cx: 16,
    top: 4,
    lean: -1,
    cool: true,
    trunk: { y0: 41, y1: 51, w: 4 },
    tiers: [
      [4, 10, 6],
      [10, 12, 10],
      [18, 13, 13],
      [27, 14, 15],
    ],
  });
  finish(p);
  shadow(p, 7, 25, 52, 2);
  return { pix: p, key: "pine_1", w: 32, h: 56 };
}

/** young spruce, one tile wide */
export function spruceYoung() {
  const p = new Pix(16, 32);
  conifer(p, {
    cx: 8,
    top: 1,
    trunk: { y0: 24, y1: 28, w: 3 },
    tiers: [
      [1, 7, 3],
      [5, 8, 5],
      [11, 9, 6],
      [17, 9, 7],
    ],
  });
  finish(p);
  shadow(p, 3, 13, 29, 2);
  return { pix: p, key: "spruce_young", w: 16, h: 32 };
}

/* ================================================================ birch */

/** clustered leafy crown: overlapping lumps each lit from the upper left */
function crown(p, lumps, ramp) {
  const owner = new Int16Array(p.w * p.h).fill(-1);
  lumps.forEach(([cx, cy, r], i) => {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r - 1; x <= cx + r + 1; x++) {
        const dx = (x - cx) / (r + 1);
        const dy = (y - cy) / r;
        const d = dx * dx + dy * dy;
        // leafy, bumpy rim instead of a smooth circle
        const bump = ((x * 3 + y * 5) % 4 === 0 ? 0.18 : 0) - ((x + y * 2) % 5 === 0 ? 0.12 : 0);
        if (d > 1 + bump) continue;
        const L = -(dx + dy) * 0.7;
        let c = L > 0.55 ? ramp[3] : L > 0.05 ? ramp[2] : L > -0.45 ? ramp[1] : ramp[0];
        if ((x * 5 + y * 3) % 9 === 0 && c !== ramp[0]) c = ramp[Math.max(0, ramp.indexOf(c) - 1)];
        p.set(x, y, c);
        owner[y * p.w + x] = i;
      }
  });
  return owner;
}

export function birch() {
  const p = new Pix(32, 48);
  // pale trunk with dark bark marks, slight S-curve
  for (let y = 22; y <= 43; y++) {
    const x = 15 + (y > 36 ? 0 : y > 29 ? 1 : 0);
    p.set(x - 1, y, "#f4f0e4");
    p.set(x, y, "#dcd6c8");
    p.set(x + 1, y, "#b4ae9e");
    if (y % 5 === 0 || y % 7 === 3) {
      p.set(x - 1, y, V.ink);
      p.set(x, y, "#3a3438");
    }
  }
  // a low branch
  p.set(17, 30, "#dcd6c8");
  p.set(18, 29, "#dcd6c8");
  const ramp = ["#3e6a30", "#5e8c3a", "#82ac48", "#b4d266"];
  crown(p, [
    [15, 18, 8],
    [9, 14, 6],
    [21, 13, 6],
    [15, 8, 6],
    [23, 21, 5],
    [8, 22, 5],
  ], ramp);
  // a few sunlit leaf glints
  for (const [x, y] of [[11, 7], [14, 4], [20, 9], [7, 13], [17, 12]]) p.set(x, y, "#e2ee9a");
  finish(p);
  shadow(p, 6, 26, 44, 2);
  return { pix: p, key: "birch", w: 32, h: 48 };
}

/* ================================================================ shrubs & rocks */

export function shrub(variant) {
  const p = new Pix(16, 16);
  const ramp = variant === 1 ? ["#24483a", "#2e5e44", "#3e7a4c", "#5a9858"] : [V.g1, V.g2, V.g3, V.g4];
  crown(p, [
    [8, 9, 5],
    [5, 10, 3],
    [11, 10, 3],
    [8, 6, 3],
  ], ramp);
  if (variant === 1) {
    // lingonberries
    for (const [x, y] of [[6, 9], [10, 7], [9, 12], [12, 10], [4, 11]]) {
      p.set(x, y, V.red2);
      p.set(x, y - 1, V.red3);
    }
  }
  finish(p);
  shadow(p, 2, 13, 14, 2);
  return { pix: p, key: `shrub_${variant}`, w: 16, h: 16 };
}

const ROCK_MAP = { 5: V.k5, 4: V.k4, 3: V.k3, 2: V.k2, 1: V.k1, m: V.m3, M: V.m2 };

export function rockSmall() {
  const p = new Pix(16, 16);
  stamp(
    p,
    2,
    4,
    [
      "...mmMm.....",
      "..m445M3....",
      ".4455443322.",
      "445544333221",
      "445433332211",
      "343333222211",
      ".3322222111.",
      "..22211111..",
    ],
    ROCK_MAP,
  );
  finish(p);
  shadow(p, 3, 14, 12, 2);
  return { pix: p, key: "rock_small", w: 16, h: 16 };
}

export function rockLarge() {
  const p = new Pix(32, 24);
  stamp(
    p,
    2,
    3,
    [
      ".......mmMMm..............",
      ".....mm4455Mm.............",
      "....44555544332...........",
      "...4455544433322..mmm.....",
      "..445554443333221m445m....",
      "..44554433333322144553....",
      ".4455443333332221455433...",
      ".44443333332222214443332..",
      ".34433333322222114433322..",
      ".3333333222222111333322211",
      "..3332222222111113333222211",
      "...222222111111..222221111.",
      "....1111111.......1111111..",
    ].map((r) => r.slice(0, 26)),
    ROCK_MAP,
  );
  finish(p);
  shadow(p, 2, 29, 17, 3);
  return { pix: p, key: "rock_large", w: 32, h: 24 };
}

export function fallenLog() {
  const p = new Pix(32, 16);
  for (let x = 4; x <= 27; x++) {
    p.set(x, 5, V.t4);
    p.set(x, 6, x % 4 === 0 ? V.t2 : V.t4);
    p.set(x, 7, V.t3);
    p.set(x, 8, x % 5 === 2 ? V.t1 : V.t3);
    p.set(x, 9, V.t2);
    p.set(x, 10, V.t1);
  }
  // cut end with growth rings
  stamp(p, 25, 4, [".kk.", "k45k", "4554", "4554", "k44k", ".kk."].map((r) => r), { k: V.t2, 4: V.t4, 5: V.t5 });
  // moss and a broken branch stub
  for (const x of [8, 9, 14, 15, 16, 21]) p.set(x, 5, V.m3);
  p.set(12, 4, V.t3);
  p.set(12, 3, V.t3);
  p.set(13, 2, V.t4);
  finish(p);
  shadow(p, 4, 29, 12, 2);
  return { pix: p, key: "log_fallen", w: 32, h: 16 };
}

/* ================================================================ village life */

/** split firewood stacked under a little bark-shingle lean-to */
export function woodpile() {
  const p = new Pix(32, 24);
  // lean-to roof
  for (let x = 1; x <= 30; x++) {
    p.set(x, 2, V.t5);
    p.set(x, 3, V.t3);
    p.set(x, 4, x % 3 ? V.t2 : V.t1);
  }
  for (let y = 5; y <= 19; y++) {
    p.set(2, y, V.t2);
    p.set(29, y, V.t2);
  }
  // log ends: rows of rings
  const ends = [];
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 6; col++) ends.push([4 + col * 4 + (row % 2 ? 2 : 0), 6 + row * 3]);
  for (const [x, y] of ends) {
    if (x > 25) continue;
    stamp(p, x, y, [".55.", "5435", ".33."], { 5: V.t5, 4: V.t4, 3: V.t3 });
  }
  finish(p);
  shadow(p, 1, 30, 20, 2);
  return { pix: p, key: "woodpile", w: 32, h: 24 };
}

export function choppingBlock() {
  const p = new Pix(16, 16);
  stamp(
    p,
    3,
    6,
    [
      ".5555555.",
      "554445555",
      "545544455",
      "355555553",
      "322332233",
      "322332223",
      "321222213",
      ".1111111.",
    ],
    { 5: V.t5, 4: V.t4, 3: V.t3, 2: V.t2, 1: V.t1 },
  );
  // axe bitten into the block
  stamp(p, 7, 1, ["..ss", ".sSs", "..s.", "..h.", "..h.", "..h."], { s: V.k3, S: V.k5, h: V.t2 });
  // a few chips on the ground
  p.set(2, 14, V.t5);
  p.set(13, 13, V.t4);
  finish(p);
  shadow(p, 2, 13, 14, 2);
  return { pix: p, key: "chopping_block", w: 16, h: 16 };
}

const BARREL = [
  "..kkkkkk..",
  ".k555555k.",
  ".k433334k.",
  "kiiiiiiiik",
  "k43433343k",
  "k43433332k",
  "k43433332k",
  "kiiiiiiiik",
  "k43433332k",
  "k43333322k",
  ".kiiiiiik.",
  "..kkkkkk..",
];
const BARREL_MAP = { k: V.ink, 5: V.t5, 4: V.t4, 3: V.t3, 2: V.t2, i: V.k2 };

export function barrel() {
  const p = new Pix(16, 24);
  stamp(p, 3, 9, BARREL, BARREL_MAP);
  finish(p);
  shadow(p, 2, 13, 21, 2);
  return { pix: p, key: "barrel", w: 16, h: 24 };
}

export function barrels() {
  const p = new Pix(32, 24);
  stamp(p, 3, 9, BARREL, BARREL_MAP);
  stamp(p, 15, 10, BARREL, BARREL_MAP);
  // lid with a sack on the right barrel
  stamp(p, 17, 6, ["..sss..", ".sSSSs.", "sSSSSSs", ".sssss."], { s: "#a8885a", S: "#ccae7c" });
  finish(p);
  shadow(p, 2, 29, 21, 2);
  return { pix: p, key: "barrels", w: 32, h: 24 };
}

const CRATE = [
  "kkkkkkkkkkk",
  "k554444445k",
  "k5k333332kk",
  "k43k3332k2k",
  "k433k32k32k",
  "k4333k4332k",
  "k433k32k32k",
  "k43k3332k2k",
  "k4k333332kk",
  "k222222222k",
  "kkkkkkkkkkk",
];
const CRATE_MAP = { k: V.t1, 5: V.t5, 4: V.t4, 3: V.t3, 2: V.t2 };

export function crates() {
  const p = new Pix(16, 24);
  stamp(p, 2, 12, CRATE, CRATE_MAP);
  stamp(p, 4, 2, CRATE.slice(0, 11), CRATE_MAP);
  finish(p);
  shadow(p, 1, 14, 23, 1);
  return { pix: p, key: "crates", w: 16, h: 24 };
}

export function basket() {
  const p = new Pix(16, 16);
  stamp(
    p,
    2,
    5,
    [
      ".ffffffffff.",
      "fFfFfFfFfFff",
      "545454545454",
      "454545454545",
      "545454545454",
      ".4545454545.",
      "..44444444..",
    ],
    { f: "#8ca0b0", F: "#c8d6e0", 5: V.h4, 4: V.h2 },
  );
  finish(p);
  shadow(p, 2, 13, 13, 2);
  return { pix: p, key: "basket", w: 16, h: 16 };
}

/** vegetable plot inside a woven wattle fence (3x2 tiles) */
export function garden() {
  const p = new Pix(48, 32);
  // soil
  for (let y = 7; y <= 26; y++)
    for (let x = 3; x <= 44; x++) p.set(x, y, (y - 7) % 5 === 4 ? V.d1 : (x + y) % 7 === 0 ? V.d2 : "#8a6440");
  // crop rows: cabbages and leeks
  for (let r = 0; r < 4; r++) {
    const y = 9 + r * 5;
    for (let x = 6; x <= 41; x += 6) {
      if (r % 2 === 0) stamp(p, x, y - 1, [".33.", "3443", "3443", ".22."], { 4: V.g4, 3: V.g3, 2: V.g1 });
      else stamp(p, x + 1, y - 2, ["4.4", "3.3", "333", ".c."], { 4: V.g4, 3: V.g2, c: V.cream });
    }
  }
  // wattle fence: stakes with woven withies
  for (let x = 1; x <= 46; x++) {
    for (const y of [4, 28]) {
      p.set(x, y, (x + y) % 2 ? V.t4 : V.t2);
      p.set(x, y + 1, (x + y) % 2 ? V.t2 : V.t4);
    }
  }
  for (let y = 4; y <= 29; y++) {
    for (const x of [1, 46]) {
      p.set(x, y, (y % 2) ? V.t4 : V.t2);
      p.set(x + (x === 1 ? 1 : -1), y, (y % 2) ? V.t2 : V.t4);
    }
  }
  for (const x of [1, 12, 24, 35, 46]) for (let y = 2; y <= 6; y++) p.set(x, y, V.t3);
  finish(p);
  shadow(p, 1, 46, 31, 1);
  return { pix: p, key: "garden", w: 48, h: 32 };
}

export function herbPlanter() {
  const p = new Pix(16, 16);
  stamp(
    p,
    1,
    3,
    [
      "..4.3..4..3...",
      ".434.434.434..",
      "..3.p.3.p.3.p.",
      ".434.434.434..",
      "55555555555555",
      "43333333333332",
      "43222222222222",
      "43333333333332",
      "22222222222222",
    ],
    { 4: V.g4, 3: V.g2, p: "#a07ac8", 5: V.t5, 2: V.t2 },
  );
  finish(p);
  shadow(p, 1, 14, 13, 2);
  return { pix: p, key: "herb_planter", w: 16, h: 16 };
}

export function lanternPost() {
  const p = new Pix(16, 32);
  for (let y = 9; y <= 28; y++) {
    p.set(7, y, V.t4);
    p.set(8, y, V.t2);
  }
  // arm and hanging iron lantern
  for (let x = 8; x <= 12; x++) p.set(x, 8, V.t3);
  stamp(
    p,
    9,
    9,
    [".kk.", "kffk", "kFfk", "kffk", ".kk."],
    { k: V.k1, f: V.fire2, F: V.fire3 },
  );
  // carved cap
  stamp(p, 6, 6, ["5554", "4332"], { 5: V.t5, 4: V.t4, 3: V.t3, 2: V.t2 });
  finish(p);
  // warm glow on the ground
  for (const [x, y] of [[9, 29], [10, 29], [11, 29], [12, 29], [10, 30], [11, 30]]) p.set(x, y, [255, 210, 120, 50]);
  shadow(p, 4, 11, 29, 1);
  return { pix: p, key: "lantern_post", w: 16, h: 32 };
}

/** torch on an iron bracket, mounted on a cliff face (decorative, non-blocking) */
export function wallTorch() {
  const p = new Pix(16, 24);
  stamp(
    p,
    5,
    2,
    [
      "..3..",
      ".323.",
      ".212.",
      "21012",
      ".000.",
      ".tTt.",
      "..t..",
      "..t..",
      "kkKkk",
      "..k..",
    ],
    { 3: V.fire3, 2: V.fire2, 1: V.fire1, 0: V.fire0, t: V.t2, T: V.t4, k: V.k1, K: V.k3 },
  );
  finish(p);
  return { pix: p, key: "wall_torch", w: 16, h: 24 };
}

/** fishing net hung to dry between two poles */
export function netRack() {
  const p = new Pix(32, 32);
  for (let y = 4; y <= 27; y++) {
    p.set(3, y, V.t4);
    p.set(4, y, V.t2);
    p.set(27, y, V.t4);
    p.set(28, y, V.t2);
  }
  for (let x = 3; x <= 28; x++) p.set(x, 5, V.t3);
  // sagging net mesh
  for (let x = 5; x <= 26; x++) {
    const sag = Math.round(Math.sin(((x - 5) / 21) * Math.PI) * 3);
    for (let y = 6; y <= 20 + sag; y++) if ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0) p.set(x, y, "#d8ccaa");
    p.set(x, 21 + sag, "#b8a882");
  }
  // cork floats along the bottom
  for (const x of [8, 14, 20]) {
    p.set(x, 23, V.red2);
    p.set(x + 1, 23, V.red3);
  }
  finish(p);
  shadow(p, 2, 29, 28, 2);
  return { pix: p, key: "net_rack", w: 32, h: 32 };
}

/** A-frame rack of stockfish drying in the sea wind */
export function fishRack() {
  const p = new Pix(32, 32);
  // A-frames
  for (const x0 of [3, 26]) {
    for (let y = 4; y <= 27; y++) {
      const spread = Math.round((y - 4) / 5);
      p.set(x0 - spread, y, V.t3);
      p.set(x0 + spread, y, V.t2);
    }
  }
  for (let x = 2; x <= 29; x++) {
    p.set(x, 5, V.t4);
    p.set(x, 6, V.t2);
  }
  // pairs of fish tied over the pole
  for (let x = 6; x <= 24; x += 4) {
    stamp(p, x, 7, ["ss", "sS", "sS", "sS", "ss", ".t"], { s: "#8c9aa4", S: "#c4ccd0", t: "#6a7680" });
    stamp(p, x + 1, 8, ["ss", "Ss", "Ss", "ss", "t."], { s: "#7a8892", S: "#b4bec4", t: "#5e6a74" });
  }
  finish(p);
  shadow(p, 1, 30, 28, 2);
  return { pix: p, key: "fish_rack", w: 32, h: 32 };
}

/** small clinker boat pulled up on the beach, upturned */
export function rowboat() {
  const p = new Pix(48, 24);
  for (let x = 3; x <= 44; x++) {
    const t = (x - 24) / 21;
    const top = 6 + Math.round(t * t * 6);
    const bot = 18 - Math.round(t * t * 2);
    for (let y = top; y <= bot; y++) {
      const strake = Math.floor((y - top) / 3);
      let c = strake % 2 ? V.t3 : V.t4;
      if ((y - top) % 3 === 0) c = V.t5;
      if (y >= bot - 1) c = V.t1;
      p.set(x, y, c);
    }
  }
  // keel line and a pair of oars
  for (let x = 6; x <= 41; x++) p.set(x, 6 + Math.round(((x - 24) / 21) ** 2 * 6), V.t2);
  for (let x = 8; x <= 40; x++) {
    p.set(x, 20, V.t4);
    p.set(x, 21, V.t2);
  }
  finish(p);
  shadow(p, 3, 44, 22, 2);
  return { pix: p, key: "rowboat", w: 48, h: 24 };
}

export function logBench() {
  const p = new Pix(32, 16);
  for (let x = 3; x <= 28; x++) {
    p.set(x, 6, V.t5);
    p.set(x, 7, V.t4);
    p.set(x, 8, x % 6 === 0 ? V.t2 : V.t3);
    p.set(x, 9, V.t2);
  }
  for (const x of [6, 24]) for (let y = 10; y <= 12; y++) {
    p.set(x, y, V.t3);
    p.set(x + 1, y, V.t1);
  }
  finish(p);
  shadow(p, 3, 28, 13, 2);
  return { pix: p, key: "log_bench", w: 32, h: 16 };
}

/** standing runestone with a red-painted serpent band */
export function runestone() {
  const p = new Pix(16, 32);
  stamp(
    p,
    3,
    3,
    [
      "...4444...",
      "..455544..",
      ".45rrrr43.",
      ".4r5443r3.",
      ".4r4343r3.",
      "44r4.3.r32",
      "43r434.r32",
      "43r4333r32",
      "43r3.33r32",
      "43r3333r32",
      "43rr333r32",
      "433rr3rr22",
      "4333rr3322",
      "3333333322",
      "3333232221",
      "3322222221",
      "3222222211",
      "3222222211",
      ".22222221.",
      ".mm.....m.",
    ],
    { 5: V.k5, 4: V.k4, 3: V.k3, 2: V.k2, 1: V.k1, r: V.red2, m: V.m3, ".": undefined },
  );
  finish(p);
  shadow(p, 2, 13, 23, 2);
  return { pix: p, key: "runestone", w: 16, h: 32 };
}

export const VILLAGE_PROPS = [
  pine0,
  pine1,
  spruceYoung,
  birch,
  () => shrub(0),
  () => shrub(1),
  rockSmall,
  rockLarge,
  fallenLog,
  woodpile,
  choppingBlock,
  barrel,
  barrels,
  crates,
  basket,
  garden,
  herbPlanter,
  lanternPost,
  wallTorch,
  netRack,
  fishRack,
  rowboat,
  logBench,
  runestone,
];
