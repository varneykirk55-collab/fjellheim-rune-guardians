// interior-props.mjs - multi-tile furnishings that give each room its identity.
//
// Placed from MapDef.objects like the village props (anchored bottom-left).
// Wall pieces are 32px tall: anchored on the lower wall row they cover the
// whole two-tile wall face, and are placed with `solid: false` because the
// wall already blocks. Light pools (light_*) are drawn additively on the floor
// layer, under characters.
import { Pix, mix } from "./pix.mjs";
import { V, outlineWith, stamp } from "./village-palette.mjs";

const make = (key, w, h, draw, { outline = true, shadowAt = null } = {}) => () => {
  const p = new Pix(w, h);
  draw(p);
  if (outline) outlineWith(p, V.ink);
  if (shadowAt) {
    const [x0, x1, y] = shadowAt;
    for (let j = 0; j < 2; j++)
      for (let x = x0 + j * 2; x <= x1 - j * 2; x++) if (!p.opaque(x, y + j)) p.set(x, y + j, V.shadow);
  }
  return { pix: p, key, w, h };
};

/* ================================================================ wall pieces */

function roundShield(p, cx, cy, r, a, b) {
  p.ellipse(cx, cy, r, r, V.t1);
  p.ellipse(cx, cy, r - 1, r - 1, a);
  // painted quarters
  for (let y = -r + 1; y < r; y++)
    for (let x = -r + 1; x < r; x++) if (x * x + y * y < (r - 1) * (r - 1) && (x < 0) !== (y < 0)) p.set(cx + x, cy + y, b);
  p.ellipseOutline(cx, cy, r - 1, r - 1, V.t3);
  p.ellipse(cx, cy, 2, 2, V.k2);
  p.ellipse(cx, cy, 1, 1, V.k4);
  p.set(cx - 1, cy - 1, V.k5);
}

/** a single round shield on the upper wall */
const shield = make("shield", 16, 32, (p) => roundShield(p, 8, 11, 6, V.red2, V.cream));

/** two shields crossed over a pair of spears (shop wall) */
const shields = make("shields", 32, 32, (p) => {
  p.line(3, 3, 28, 20, V.t2);
  p.line(28, 3, 3, 20, V.t2);
  stamp(p, 1, 1, ["k.", "kk"], { k: V.k4 });
  stamp(p, 29, 1, [".k", "kk"], { k: V.k4 });
  roundShield(p, 9, 12, 7, "#3c5a8a", V.gold);
  roundShield(p, 22, 12, 7, V.red2, V.cream);
});

/** elk antlers on a carved plaque */
const antlers = make("antlers", 16, 32, (p) => {
  p.rect(6, 8, 4, 6, V.t3);
  p.rect(6, 8, 4, 1, V.t5);
  for (const s of [-1, 1]) {
    const x0 = 8 + s * 2;
    p.line(x0, 9, x0 + s * 5, 4, V.cream);
    p.line(x0 + s * 3, 6, x0 + s * 3, 2, V.cream);
    p.line(x0 + s * 5, 4, x0 + s * 6, 1, V.cream);
    p.set(x0 + s * 1, 8, "#d8c8a0");
  }
  p.ellipse(8, 12, 2, 2, "#e8dcc0");
  p.set(7, 12, V.ink);
  p.set(9, 12, V.ink);
});

/** small shuttered window with daylight */
const window_ = make("window", 16, 32, (p) => {
  p.rect(2, 6, 12, 11, V.t1);
  p.rect(3, 7, 10, 9, "#9fd0ee");
  p.rect(3, 7, 10, 3, "#c8e8f8");
  p.rect(3, 12, 10, 4, "#7ab060");
  p.rect(3, 12, 10, 1, "#9ac87a");
  p.rect(7, 7, 2, 9, V.t2);
  p.rect(3, 11, 10, 1, V.t2);
  // open shutters
  p.rect(0, 6, 2, 11, V.t3);
  p.rect(14, 6, 2, 11, V.t3);
  p.set(0, 9, V.t1);
  p.set(15, 13, V.t1);
  p.rect(1, 17, 14, 2, V.t4);
  p.rect(1, 17, 14, 1, V.t5);
});

/** bundles of drying herbs hung from the roof beam */
const herbs = make("herbs", 16, 32, (p) => {
  p.rect(1, 4, 14, 1, V.t3);
  for (const [x, len, c, d] of [[3, 9, "#6a9a4a", "#4a7038"], [8, 11, "#8aa858", "#5e7a3a"], [12, 8, "#9a7aa8", "#6a5078"]]) {
    p.rect(x, 5, 1, 2, V.h3);
    p.rect(x - 1, 7, 3, 1, V.red2);
    for (let y = 8; y < 8 + len; y++) {
      const w = Math.min(2, (y - 7) >> 1);
      p.rect(x - w, y, w * 2 + 1, 1, (y + x) % 3 ? c : d);
    }
    p.set(x, 8 + len, d);
  }
});

/** the seer's carved Yggdrasil panel: the world tree, its roots and three wells */
const yggdrasil = make("yggdrasil", 48, 32, (p) => {
  p.rect(1, 2, 46, 29, "#2a1c26");
  p.rect(2, 3, 44, 27, "#3a2836");
  p.rect(1, 2, 46, 1, "#5a4458");
  // crown
  p.ellipse(24, 10, 16, 6, "#2e4a40");
  p.ellipse(24, 9, 14, 5, "#3a5e4c");
  for (const [x, y] of [[14, 8], [20, 6], [28, 6], [34, 8], [24, 5], [17, 11], [31, 11]]) p.set(x, y, "#6aa080");
  // trunk and branches
  p.rect(22, 11, 4, 12, "#6a4a34");
  p.rect(22, 11, 1, 12, "#8a6448");
  p.line(22, 13, 15, 9, "#6a4a34");
  p.line(26, 13, 33, 9, "#6a4a34");
  // three roots to three wells
  p.line(22, 22, 9, 27, "#6a4a34");
  p.line(24, 23, 24, 27, "#6a4a34");
  p.line(25, 22, 39, 27, "#6a4a34");
  for (const x of [8, 24, 40]) {
    p.ellipse(x, 28, 3, 1, "#1c3a40");
    p.set(x, 28, V.rune);
  }
  // glowing runes framing the tree
  for (const [x, y] of [[5, 6], [5, 12], [5, 18], [42, 6], [42, 12], [42, 18]]) {
    p.set(x, y, V.rune);
    p.set(x, y + 1, "#3f8f8a");
    p.set(x + 1, y, "#3f8f8a");
  }
  // the eagle at the crown, the serpent at the root
  stamp(p, 23, 3, ["c.c", ".c."], { c: V.cream });
  p.line(28, 27, 32, 26, "#4a8a5a");
});

/** fishing net draped on the wall with cork floats */
const fishNetWall = make("fish_net", 32, 32, (p) => {
  p.rect(2, 4, 28, 1, V.t3);
  for (let y = 5; y < 22; y++)
    for (let x = 3; x < 29; x++) {
      const sag = Math.round(Math.sin(((x - 3) / 26) * Math.PI) * 3);
      if (y > 18 + sag) continue;
      if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) p.set(x, y, "#b8a888");
    }
  for (const x of [6, 12, 18, 24]) p.ellipse(x, 21 + Math.round(Math.sin(((x - 3) / 26) * Math.PI) * 3) - 2, 1, 1, x % 12 ? V.red2 : V.cream);
});

/** dried fish strung on a line */
const fishHanging = make("fish_hanging", 16, 32, (p) => {
  p.rect(1, 5, 14, 1, V.h3);
  for (const [x, len] of [[3, 8], [8, 10], [12, 7]]) {
    p.rect(x, 6, 1, 1, V.h2);
    p.rect(x - 1, 7, 3, len, "#a89878");
    p.rect(x - 1, 7, 1, len, "#c8b898");
    p.set(x - 1, 7 + len, "#7a6a50");
    p.set(x + 1, 7 + len, "#7a6a50");
    p.set(x, 8, V.ink);
  }
});

/** woven tapestry with a ship and waves (the weaver's pride) */
const tapestry = make("tapestry", 16, 32, (p) => {
  p.rect(1, 3, 14, 1, V.t2);
  p.rect(2, 4, 12, 22, V.cream);
  p.rect(2, 4, 12, 2, V.red1);
  p.rect(2, 24, 12, 2, V.red1);
  p.rect(2, 18, 12, 4, "#34407a");
  for (let x = 2; x < 14; x += 2) p.set(x, 18, "#5a6aa8");
  // longship
  p.rect(4, 15, 8, 2, V.t2);
  p.set(3, 14, V.t2);
  p.set(12, 14, V.t2);
  p.rect(7, 8, 1, 7, V.t1);
  p.rect(5, 9, 5, 4, V.red2);
  p.rect(5, 10, 5, 1, V.cream);
  for (const x of [3, 6, 9, 12]) p.set(x, 26, V.red2);
});

/* ================================================================ floor pieces */

/** iron-banded chest */
const chest = make(
  "chest",
  16,
  16,
  (p) => {
    p.rect(2, 6, 12, 8, V.t3);
    p.rect(2, 4, 12, 3, V.t4);
    p.rect(3, 3, 10, 1, V.t4);
    p.rect(3, 3, 10, 1, V.t5);
    p.rect(2, 7, 12, 1, V.t1);
    for (const x of [4, 11]) p.rect(x, 3, 1, 11, V.k2);
    p.rect(7, 7, 2, 3, V.gold);
    p.set(7, 7, V.goldL);
  },
  { shadowAt: [2, 13, 14] },
);

/** iron brazier with spirit-blue flame (seer) */
const brazier = make(
  "brazier",
  16,
  32,
  (p) => {
    p.line(4, 29, 7, 20, V.k1);
    p.line(11, 29, 8, 20, V.k1);
    p.rect(7, 20, 2, 10, V.k2);
    p.rect(3, 17, 10, 3, V.k2);
    p.rect(3, 17, 10, 1, V.k4);
    p.rect(4, 20, 8, 1, V.k1);
    // teal flame
    p.ellipse(8, 14, 3, 3, "#2e8a8a");
    p.ellipse(8, 13, 2, 3, V.rune);
    p.rect(8, 8, 1, 4, V.runeL);
    p.set(6, 10, V.rune);
    p.set(10, 9, V.rune);
    p.set(8, 6, "#3f8f8a");
  },
  { shadowAt: [3, 12, 30] },
);

/** carved raven perch: the seer's messengers, Huginn's watch */
const ravenPerch = make(
  "raven_perch",
  16,
  32,
  (p) => {
    p.rect(7, 12, 2, 18, V.t2);
    p.rect(7, 12, 1, 18, V.t4);
    p.rect(3, 12, 10, 2, V.t3);
    p.rect(3, 12, 10, 1, V.t5);
    p.rect(4, 28, 8, 2, V.t1);
    // raven
    p.ellipse(8, 8, 3, 3, "#22202e");
    p.ellipse(6, 5, 2, 2, "#22202e");
    p.rect(3, 5, 2, 1, "#3a3848");
    p.set(6, 4, "#e8e0ff");
    p.rect(10, 9, 3, 2, "#2e2c3c");
    p.set(7, 7, "#4a4860");
    p.set(8, 11, V.gold);
  },
  { shadowAt: [3, 12, 30] },
);

/** a short standing stone carved with glowing runes */
const seerStone = make(
  "seer_stone",
  16,
  24,
  (p) => {
    p.poly([[3, 22], [4, 6], [7, 2], [11, 3], [13, 8], [13, 22]], V.k2);
    p.poly([[4, 21], [5, 7], [7, 3], [9, 4], [9, 21]], V.k3);
    p.rect(4, 6, 1, 15, V.k4);
    stamp(p, 7, 7, ["#.", "##", "#.", "#.", ".#", "##", "#."], { "#": V.rune });
    p.set(6, 14, "#3f8f8a");
    p.rect(3, 21, 11, 2, V.m2);
    p.set(5, 21, V.m3);
  },
  { shadowAt: [2, 13, 22] },
);

/** wicker-and-wool healing cot */
const healerCot = make(
  "healer_cot",
  16,
  32,
  (p) => {
    p.rect(1, 4, 14, 26, V.t2);
    p.rect(2, 5, 12, 23, "#e8e2cc");
    p.rect(3, 6, 10, 4, "#fff8e4");
    p.rect(3, 9, 10, 1, "#d8d0b4");
    p.rect(2, 12, 12, 16, "#5f8f66");
    p.rect(2, 12, 12, 1, "#88b88a");
    p.rect(2, 16, 12, 1, V.cream);
    p.rect(2, 24, 12, 1, V.cream);
    p.set(7, 20, V.cream);
    p.set(8, 20, V.cream);
    p.rect(1, 28, 14, 2, V.t3);
    p.rect(2, 30, 2, 1, V.t1);
    p.rect(12, 30, 2, 1, V.t1);
  },
  { shadowAt: [1, 14, 30] },
);

/** worktable of herbs: bowls, a knife, leaves, a stone mortar */
const herbTable = make(
  "herb_table",
  32,
  24,
  (p) => {
    p.rect(3, 15, 2, 8, V.t1);
    p.rect(27, 15, 2, 8, V.t1);
    p.rect(1, 7, 30, 7, "#cfae7e");
    p.rect(1, 7, 30, 1, "#f4e2b8");
    p.rect(1, 13, 30, 2, "#9c7c54");
    // contents
    p.ellipse(7, 9, 3, 1, V.t2);
    p.rect(5, 8, 5, 1, "#88b070");
    for (const [x, c] of [[13, "#6a9a4a"], [15, "#9a7aa8"], [17, "#6a9a4a"]]) p.rect(x, 9, 1, 3, c);
    p.ellipse(24, 9, 3, 2, V.k3);
    p.ellipse(24, 8, 2, 1, V.k2);
    p.line(26, 4, 24, 8, V.t3);
    p.rect(19, 11, 4, 1, V.k4);
    p.rect(18, 11, 1, 1, V.t2);
    // drying leaves under the table
    p.rect(8, 19, 6, 2, "#5a7a4a");
    p.rect(8, 19, 6, 1, "#7aa064");
  },
  { shadowAt: [1, 30, 22] },
);

/** iron cauldron over a small fire, a steaming herbal brew */
const cauldron = make(
  "cauldron",
  16,
  24,
  (p) => {
    p.rect(4, 19, 8, 2, V.t1);
    p.set(6, 18, V.fire1);
    p.set(9, 18, V.fire2);
    p.ellipse(8, 14, 6, 5, V.k1);
    p.ellipse(7, 13, 5, 4, V.k2);
    p.ellipse(8, 10, 6, 2, V.k0);
    p.ellipse(8, 10, 5, 1, "#5f9a6a");
    p.set(6, 10, "#9ad09a");
    p.set(4, 14, V.k3);
    // steam
    p.set(7, 6, [230, 240, 235, 170]);
    p.set(8, 5, [230, 240, 235, 140]);
    p.set(10, 4, [230, 240, 235, 110]);
    p.set(9, 3, [230, 240, 235, 80]);
  },
  { shadowAt: [2, 13, 21] },
);

/** stepped goods rack: baskets, bolts of cloth, pelts, horn cups */
const goodsRack = make(
  "goods_rack",
  32,
  32,
  (p) => {
    p.rect(1, 6, 2, 25, V.t2);
    p.rect(29, 6, 2, 25, V.t2);
    for (const y of [12, 20, 28]) {
      p.rect(1, y, 30, 2, V.t3);
      p.rect(1, y, 30, 1, V.t4);
    }
    // top: pelts
    p.rect(4, 7, 9, 5, "#a8804c");
    p.rect(4, 7, 9, 1, "#c8a06c");
    p.rect(15, 8, 12, 4, "#8a8a8a");
    p.rect(15, 8, 12, 1, "#b0b0b0");
    // middle: bolts of cloth
    for (const [x, c] of [[4, V.red2], [11, "#34407a"], [18, "#5a8a5a"], [24, V.gold]]) {
      p.rect(x, 15, 5, 5, c);
      p.rect(x, 15, 5, 1, mix(c, "#ffffff", 0.3));
    }
    // bottom: baskets
    for (const x of [4, 13, 22]) {
      p.rect(x, 23, 7, 5, V.h2);
      p.rect(x, 23, 7, 1, V.h4);
      for (let i = 0; i < 7; i += 2) p.set(x + i, 25, V.h1);
    }
    p.ellipse(7, 22, 1, 1, V.red3);
    p.ellipse(25, 22, 1, 1, V.red3);
  },
  { shadowAt: [1, 30, 30] },
);

/** grain sacks */
const sacks = make(
  "sacks",
  16,
  16,
  (p) => {
    p.ellipse(5, 10, 4, 4, V.h3);
    p.ellipse(5, 9, 3, 3, V.h4);
    p.rect(4, 4, 3, 2, V.h2);
    p.ellipse(11, 11, 4, 3, V.h3);
    p.ellipse(10, 10, 3, 2, V.h4);
    p.rect(10, 6, 2, 2, V.h2);
    p.set(11, 11, V.h1);
    p.rect(3, 12, 3, 1, V.h1);
  },
  { shadowAt: [1, 14, 14] },
);

/** open barrel of red apples */
const appleBarrel = make(
  "apple_barrel",
  16,
  16,
  (p) => {
    p.rect(3, 6, 10, 9, V.t3);
    for (const x of [5, 8, 11]) p.rect(x, 6, 1, 9, V.t2);
    p.rect(3, 8, 10, 1, V.k2);
    p.rect(3, 12, 10, 1, V.k2);
    p.ellipse(8, 5, 5, 2, V.t1);
    for (const [x, y] of [[5, 4], [8, 3], [11, 4], [6, 5], [10, 5], [8, 5]]) {
      p.set(x, y, V.red2);
      p.set(x + 1, y, V.red1);
    }
    p.set(8, 2, V.g3);
  },
  { shadowAt: [2, 13, 15] },
);

/** basket of the day's catch */
const fishBasket = make(
  "fish_basket",
  16,
  16,
  (p) => {
    p.rect(2, 7, 12, 7, V.h2);
    for (let y = 8; y < 14; y += 2) for (let x = 2 + ((y / 2) % 2); x < 14; x += 2) p.set(x, y, V.h3);
    p.rect(2, 7, 12, 1, V.h4);
    for (const [x, y] of [[4, 5], [8, 4], [10, 6]]) {
      p.rect(x, y, 4, 2, "#a8b4bc");
      p.rect(x, y, 4, 1, "#d0dae0");
      p.set(x + 4, y, "#7a8890");
    }
  },
  { shadowAt: [2, 13, 14] },
);

/** coiled rope and a wooden sea chest corner (fisherman) */
const seaChest = make(
  "sea_chest",
  16,
  16,
  (p) => {
    p.rect(1, 6, 14, 8, "#4a6a8a");
    p.rect(1, 4, 14, 3, "#5a7a9a");
    p.rect(1, 4, 14, 1, "#7a9aba");
    p.rect(1, 7, 14, 1, "#2e4a68");
    for (const x of [3, 12]) p.rect(x, 4, 1, 10, V.k2);
    p.rect(7, 7, 2, 2, V.k4);
    p.ellipse(13, 3, 2, 1, "#c8b07a");
  },
  { shadowAt: [1, 14, 14] },
);

/** warp-weighted loom leaning against the wall, half-woven cloth */
const loom = make(
  "loom",
  32,
  32,
  (p) => {
    // uprights
    p.line(3, 1, 5, 30, V.t2);
    p.line(28, 1, 26, 30, V.t2);
    p.rect(2, 2, 28, 2, V.t3);
    p.rect(2, 2, 28, 1, V.t5);
    // woven part at the top, warp threads below
    p.rect(6, 4, 20, 9, V.red1);
    for (let y = 5; y < 13; y += 2) p.rect(6, y, 20, 1, V.red2);
    p.rect(6, 8, 20, 1, V.cream);
    for (let x = 8; x < 26; x += 4) p.set(x, 10, V.gold);
    for (let x = 7; x < 26; x += 2) p.rect(x, 13, 1, 12, "#e8dcc0");
    p.rect(6, 17, 20, 1, V.t3);
    // loom weights: clay rings
    for (let x = 7; x < 26; x += 4) {
      p.ellipse(x + 1, 26, 1, 1, "#9a5a34");
      p.set(x + 1, 26, "#5a2e1c");
    }
  },
  { shadowAt: [3, 28, 30] },
);

/** basket of wool and yarn */
const yarnBasket = make(
  "yarn_basket",
  16,
  16,
  (p) => {
    p.rect(2, 8, 12, 6, V.h2);
    p.rect(2, 8, 12, 1, V.h4);
    for (let x = 3; x < 14; x += 2) p.set(x, 11, V.h1);
    for (const [x, c] of [[5, V.red2], [8, V.cream], [11, "#34407a"]]) {
      p.ellipse(x, 6, 2, 2, c);
      p.set(x - 1, 5, mix(c, "#ffffff", 0.4));
    }
    p.line(11, 7, 14, 13, V.red2);
  },
  { shadowAt: [2, 13, 14] },
);

/* ================================================================ light */

function lightPool(key, w, h, color) {
  return () => {
    const p = new Pix(w, h);
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    // banded, not smooth: three soft pixel rings
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = Math.hypot((x - cx) / (w / 2), (y - cy) / (h / 2));
        const a = d < 0.45 ? 60 : d < 0.72 ? 38 : d < 0.95 ? 18 : 0;
        if (a) p.set(x, y, [...color, a]);
      }
    return { pix: p, key, w, h };
  };
}

export const INTERIOR_PROPS = [
  shield,
  shields,
  antlers,
  window_,
  herbs,
  yggdrasil,
  fishNetWall,
  fishHanging,
  tapestry,
  chest,
  brazier,
  ravenPerch,
  seerStone,
  healerCot,
  herbTable,
  cauldron,
  goodsRack,
  sacks,
  appleBarrel,
  fishBasket,
  seaChest,
  loom,
  yarnBasket,
  lightPool("light_warm", 48, 48, [255, 170, 80]),
  lightPool("light_teal", 64, 48, [80, 220, 210]),
];
