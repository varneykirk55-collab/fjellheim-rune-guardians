// village-chars.mjs - Platinum-style overworld characters (32x32 frames).
//
// DS overworld proportions: a large head (about 40% of the height), a compact
// body and short legs, about 25px tall standing on the bottom of the frame.
// Faces and hair are hand-authored pixel templates per direction; bodies are
// built from shaded blocks so every outfit option of the cast still works.
// Colours come from each character's look, expanded into hue-shifted ramps
// (shadows toward purple-blue, highlights toward warm yellow).
// Frames: 0 standing, 1 left step, 2 right step. Left-facing frames are the
// mirrored right-facing ones (done by the caller).
import { Pix, parseColor } from "./pix.mjs";
import { V, outlineWith, stamp } from "./village-palette.mjs";

export const CW = 32;
export const CH = 32;

/* ================================================================ colour */

function rgb2hsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hsl2hex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** [shadow, base, light] with hue drift: shadows cool, lights warm */
function ramp(hex) {
  const [h, s, l] = rgb2hsl(parseColor(hex));
  const toward = (target, amt) => h + ((((target - h + 540) % 360) - 180) * amt);
  return [
    hsl2hex(toward(250, 0.18), Math.min(1, s * 1.05), Math.max(0.06, l * 0.68)),
    hex,
    hsl2hex(toward(50, 0.12), s * 0.95, Math.min(0.94, l + (1 - l) * 0.28)),
  ];
}

/* ================================================================ heads */
// 12x11 templates placed at (10, headY). '.' keeps what is underneath.
// s skin, S skin shadow, E eye, h hair, H hair shadow, L hair light,
// x headwear, X headwear shadow, Y headwear light, d beard, D beard shadow.

const FACE = {
  down: [
    "............",
    "...ssssss...",
    "..ssssssss..",
    ".ssssssssss.",
    ".ssssssssss.",
    ".ssssssssss.",
    ".ssEssssEss.",
    ".ssEssssEss.",
    ".sssssssssS.",
    "..sssssssS..",
    "............",
  ],
  up: [
    "............",
    "...ssssss...",
    "..ssssssss..",
    ".ssssssssss.",
    ".ssssssssss.",
    ".ssssssssss.",
    ".ssssssssss.",
    ".ssssssssss.",
    ".sssssssssS.",
    "..sssssssS..",
    "............",
  ],
  right: [
    "............",
    "..sssssss...",
    ".sssssssss..",
    ".sssssssss..",
    ".sssssssss..",
    ".sssssssss..",
    ".ssssssEss..",
    ".ssssssEsss.",
    ".sssssssss..",
    "..sssssssS..",
    "............",
  ],
};

// hair / headwear overlays: [dy, rows]
const HAIR = {
  short: {
    down: [0, [
      "............",
      "...LLhhhh...",
      "..LhhhhhhH..",
      ".LhhhhhhhhH.",
      ".hhhHhhhHhH.",
      ".hH.h..hH.H.",
      ".h........h.",
    ]],
    up: [0, [
      "............",
      "...LLhhhh...",
      "..LhhhhhhH..",
      ".LhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hHhhhhhHhH.",
      ".HhHhhhHhHH.",
    ]],
    right: [0, [
      "............",
      "..LLhhhhh...",
      ".LhhhhhhhH..",
      ".hhhhhhhhH..",
      ".hhhhhhhHh..",
      ".hhhhhH.h...",
      ".hhhhH......",
      ".hhhH.......",
      ".HhH........",
    ]],
  },
  long: {
    down: [0, [
      "............",
      "...LLhhhh...",
      "..LhhhhhhH..",
      ".LhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hh.h..h.hH.",
      ".hh......hH.",
      ".hh......hH.",
      ".hh......hH.",
      ".hh......HH.",
      ".hhh....hHH.",
      ".hhh....hHH.",
      ".hH......HH.",
      ".H........H.",
    ]],
    up: [0, [
      "............",
      "...LLhhhh...",
      "..LhhhhhhH..",
      ".LhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhHH.",
      "..hhhhhhhH..",
      "..hhhhhhHH..",
      "..hHhhhhHH..",
      "...HhHhHH...",
    ]],
    right: [0, [
      "............",
      "..LLhhhhh...",
      ".LhhhhhhhH..",
      ".hhhhhhhhH..",
      ".hhhhhhhHh..",
      ".hhhhhH.h...",
      ".hhhhH......",
      ".hhhhH......",
      ".hhhhH......",
      ".hhhhH......",
      ".hhhH.......",
      ".hhhH.......",
      ".hHH........",
      ".HH.........",
    ]],
  },
  braid: {
    down: [0, [
      "............",
      "...LLhhhh...",
      "..LhhhhhhH..",
      ".LhhhhhhhhH.",
      ".hhHhhhhhhH.",
      ".hh.hh..hhH.",
      ".h.......hH.",
      ".........hH.",
      "..........hH",
      "..........Hh",
      "..........hH",
      "..........Hh",
      "..........rr",
      "..........hH",
    ]],
    up: [0, [
      "............",
      "...LLhhhh...",
      "..LhhhhhhH..",
      ".LhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hHhhhhhhhH.",
      ".HhHhhhhHhHH",
      "..........Hh",
      "..........hH",
      "..........Hh",
      "..........rr",
      "..........hH",
    ]],
    right: [0, [
      "............",
      "..LLhhhhh...",
      ".LhhhhhhhH..",
      ".hhhhhhhhH..",
      ".hhhhhhhHh..",
      ".hhhhhH.h...",
      ".hhhhH......",
      ".hhhH.......",
      "hHhH........",
      "Hh..........",
      "hH..........",
      "Hh..........",
      "rr..........",
    ]],
  },
  bun: {
    down: [-1, [
      "....LhhH....",
      "...LLhhhh...",
      "..LhhhhhhH..",
      ".LhhhhhhhhH.",
      ".hhhHhhhHhH.",
      ".hH.h..hH.H.",
      ".h........h.",
    ]],
    up: [-2, [
      "....LhhH....",
      "...LhrrhH...",
      "...LhhhhH...",
      "..LhhhhhhH..",
      ".LhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hHhhhhhHhH.",
      ".HhHhhhHhHH.",
    ]],
    right: [-1, [
      ".LhhH.......",
      "LhhhhHhhh...",
      ".LhhhhhhhH..",
      ".hhhhhhhhH..",
      ".hhhhhhhHh..",
      ".hhhhhH.h...",
      ".hhhhH......",
      ".hhhH.......",
      ".HhH........",
    ]],
  },
  bald: {
    down: [0, [
      "............",
      "............",
      "............",
      "............",
      "............",
      ".h........h.",
      ".hh......hh.",
    ]],
    up: [0, [
      "............",
      "............",
      "............",
      "............",
      "............",
      ".h........h.",
      ".hhhhhhhhhh.",
      ".hHhhhhhhHH.",
      "..HhhhhhHH..",
    ]],
    right: [0, [
      "............",
      "............",
      "............",
      "............",
      "............",
      ".hh.........",
      ".hhhH.......",
      ".hhH........",
      ".HH.........",
    ]],
  },
  hood: {
    down: [0, [
      "...YYxxxx...",
      "..YxxxxxxX..",
      ".YxxxxxxxxX.",
      ".xxhhhhhhxX.",
      ".xxh....hxX.",
      ".xx......xX.",
      ".xx......xX.",
      ".xx......xX.",
      ".xX......XX.",
      "..xx....XX..",
      ".xxxx..XXXX.",
      ".xxxX..XXXX.",
    ]],
    up: [0, [
      "...YYxxxx...",
      "..YxxxxxxX..",
      ".YxxxxxxxxX.",
      ".xxxxxxxxxX.",
      ".xxxxxxxxxX.",
      ".xxxxXxxxxX.",
      ".xxxxXxxxxX.",
      ".xxxxXxxxxX.",
      ".xxxxXxxxXX.",
      ".xxxxXxxxXX.",
      ".xxxxxxxXXX.",
      ".xxxxxxXXXX.",
    ]],
    right: [0, [
      "..YYxxxx....",
      ".YxxxxxxxX..",
      ".xxxxxxxxX..",
      ".xxxxxhhhX..",
      ".xxxxxh.....",
      ".xxxxX......",
      ".xxxxX......",
      ".xxxxX......",
      ".xxxxX......",
      ".xxxXX......",
      ".xxxXXX.....",
      ".xxXXXX.....",
    ]],
  },
  helmet: {
    down: [0, [
      "...YYxxxx...",
      "..YxxxxxxX..",
      ".YxxxxxxxxX.",
      ".xxxxrrxxxX.",
      ".XXXXrrXXXX.",
      "......rr....",
      ".h....rr..h.",
    ]],
    up: [0, [
      "...YYxxxx...",
      "..YxxxxxxX..",
      ".YxxxxxxxxX.",
      ".xxxxxxxxxX.",
      ".XXXXXXXXXX.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hHhhhhhHhH.",
    ]],
    right: [0, [
      "..YYxxxx....",
      ".YxxxxxxxX..",
      ".xxxxxxxxX..",
      ".xxxxxxxxX..",
      ".XXXXXXXXX..",
      ".hhhh...r...",
      ".hhhH.......",
      ".hhH........",
    ]],
  },
  headscarf: {
    down: [0, [
      "...YYxxxx...",
      "..YxxxxxxX..",
      ".YxxxxxxxxX.",
      ".xxxxxxxxxX.",
      ".XhhhhhhhhX.",
      ".Xh......hX.",
    ]],
    up: [0, [
      "...YYxxxx...",
      "..YxxxxxxX..",
      ".YxxxxxxxxX.",
      ".xxxxxxxxxX.",
      ".xxxxxxxxxX.",
      ".xxxxxxxxXX.",
      ".hxxXxxXxxh.",
      ".hhxxXXxxhh.",
      "...xX..Xx...",
      "...xX..XX...",
    ]],
    right: [0, [
      "..YYxxxx....",
      ".YxxxxxxxX..",
      ".xxxxxxxxX..",
      ".xxxxxxxxX..",
      ".xxxxhhhh...",
      ".xxxXh......",
      ".xxxX.......",
      "xXxX........",
      "xX..........",
    ]],
  },
  cap: {
    down: [0, [
      "............",
      "...YYxxxx...",
      "..YxxxxxxX..",
      ".YxxxxxxxxX.",
      ".rrrrrrrrrr.",
      ".h........h.",
      ".h........h.",
    ]],
    up: [0, [
      "............",
      "...YYxxxx...",
      "..YxxxxxxX..",
      ".YxxxxxxxxX.",
      ".rrrrrrrrrr.",
      ".hhhhhhhhhH.",
      ".hhhhhhhhhH.",
      ".hHhhhhhHhH.",
    ]],
    right: [0, [
      "............",
      "..YYxxxx....",
      ".YxxxxxxxX..",
      ".xxxxxxxxX..",
      ".rrrrrrrrrr.",
      ".hhhh.......",
      ".hhhH.......",
      ".hhH........",
    ]],
  },
};

const BEARD = {
  short: {
    down: [8, [
      ".d........d.",
      ".dd.dddd.dd.",
      "..dddddddD..",
    ]],
    right: [8, [
      ".....ddd....",
      "..ddddddD...",
      "...dddDD....",
    ]],
  },
  long: {
    down: [8, [
      ".d........d.",
      ".dd.dddd.dd.",
      "..dddddddD..",
      "...ddddddD..",
      "....ddddD...",
      "....dDdD....",
      ".....dD.....",
    ]],
    right: [8, [
      ".....ddd....",
      "..ddddddD...",
      "...dddddD...",
      "....ddddD...",
      "....dddD....",
      ".....dD.....",
    ]],
  },
};

/* ================================================================ bodies */

/**
 * Body in frame coordinates. `y` is the top of the torso; legs end at
 * `feet`. Walk frames swing arms and alternate the legs; the whole figure
 * bobs up a pixel on step frames (handled by the caller via y).
 */
function drawBody(p, dir, frame, o, c, y, feet) {
  const set = (x, yy, col) => p.set(x, yy, col);
  const rect = (x, yy, w, h, col) => p.rect(x, yy, w, h, col);
  const torsoH = o.child ? 5 : 7;
  const step = frame === 0 ? 0 : frame === 1 ? 1 : -1;
  const legTop = y + torsoH;

  // cape behind everything when seen from the back or side
  if (o.cape && dir !== "down") {
    const [cs, cb, cl] = c.cape;
    if (dir === "up") {
      for (let yy = y; yy <= feet - 2; yy++) {
        const spread = Math.min(2, Math.floor((yy - y) / 4));
        for (let x = 12 - spread; x <= 19 + spread; x++) set(x, yy, x === 12 - spread ? cl : x >= 18 + spread ? cs : cb);
      }
    } else {
      for (let yy = y; yy <= feet - 3; yy++) {
        const back = Math.min(3, Math.floor((yy - y) / 3)) + (step !== 0 && yy > y + 6 ? 1 : 0);
        for (let x = 11 - back; x <= 14; x++) set(x, yy, x === 11 - back ? cs : cb);
      }
    }
  }

  /* legs / skirt */
  const [ps, pb] = c.pants;
  const [bs, bb, bl] = c.boots;
  if (o.dress) {
    const [ts, tb, tl] = c.tunic;
    const skirtTop = legTop - 2;
    for (let yy = skirtTop; yy <= feet - 2; yy++) {
      const wgrow = Math.floor((yy - skirtTop) / 2);
      for (let x = 13 - wgrow; x <= 18 + wgrow; x++) {
        let col = tb;
        if (x === 13 - wgrow) col = tl;
        if (x >= 17 + wgrow) col = ts;
        if (yy === feet - 2) col = c.trim[1];
        set(x, yy, col);
      }
    }
    // feet peeking under the hem
    const f1 = 14 + (dir === "right" ? step : 0);
    const f2 = 17 - (dir === "right" ? step : 0);
    if (dir === "right") {
      rect(f1 + 1, feet - 1, 3, 1, bb);
      if (step) rect(f2 - 2, feet - 1, 2, 1, bs);
    } else {
      rect(f1, feet - 1 - (step === 1 ? 1 : 0), 2, 1, bb);
      rect(f2, feet - 1 - (step === -1 ? 1 : 0), 2, 1, bb);
    }
  } else if (dir === "right") {
    // one leg in front of the other; they scissor on step frames
    const legs = step === 0 ? [[15, 0], [16, 0]] : [[14 - step, 0], [17 + step, 1]];
    for (const [lx, back] of legs) {
      for (let yy = legTop; yy <= feet - 2; yy++) {
        set(lx, yy, back ? ps : pb);
        set(lx + 1, yy, ps);
      }
      set(lx, feet - 1, back ? bs : bb);
      set(lx + 1, feet - 1, bs);
      set(lx + 2, feet - 1, back ? bs : bl);
    }
  } else {
    // front/back: two legs, the stepping leg lifts a pixel
    for (const [lx, side] of [[13, 1], [16, -1]]) {
      const lift = step === side ? 1 : 0;
      for (let yy = legTop; yy <= feet - 2 - lift; yy++) {
        set(lx, yy, pb);
        set(lx + 1, yy, pb);
        set(lx + 2, yy, ps);
      }
      rect(lx, feet - 2 - lift, 3, 1, bl);
      rect(lx, feet - 1 - lift, 3, 1, bb);
      set(lx + 2, feet - 1 - lift, bs);
    }
  }

  /* torso */
  const [ts, tb, tl] = c.tunic;
  if (dir === "right") {
    for (let yy = y; yy < legTop + 1; yy++)
      for (let x = 13; x <= 18; x++) set(x, yy, x === 13 ? ts : x === 18 ? tl : tb);
    // hem
    rect(13, legTop, 6, 1, c.trim[0]);
  } else {
    for (let yy = y; yy < legTop + 1; yy++)
      for (let x = 12; x <= 19; x++) set(x, yy, x === 12 ? tl : x === 19 ? ts : tb);
    if (dir === "down") {
      set(15, y, c.trim[1]);
      set(16, y, c.trim[1]);
      set(15, y + 1, c.trim[0]);
      set(16, y + 1, c.trim[0]);
    }
    rect(12, legTop, 8, 1, c.trim[0]);
  }
  // belt
  if (!o.child) {
    const by = y + 5;
    const [ks, kb] = c.belt;
    if (dir === "right") rect(13, by, 6, 1, kb);
    else {
      rect(12, by, 8, 1, kb);
      set(dir === "down" ? 15 : 16, by, V.gold);
      set(19, by, ks);
    }
  }
  // apron over the front
  if (o.apron && dir !== "up") {
    const [as, ab, al] = c.apron;
    const ax0 = dir === "down" ? 14 : 16;
    const ax1 = dir === "down" ? 17 : 18;
    for (let yy = y + 2; yy <= (o.dress ? feet - 4 : legTop); yy++)
      for (let x = ax0; x <= ax1; x++) set(x, yy, x === ax0 ? al : x === ax1 ? as : ab);
  }
  // scarf wrapped at the neck
  if (o.scarf) {
    const [ss, sb, sl] = c.cape;
    rect(12, y, 8, 2, sb);
    rect(12, y, 8, 1, sl);
    if (dir === "up") rect(17, y + 2, 2, 3, ss);
    if (dir === "right") rect(12, y + 1, 2, 3, ss);
  }

  /* arms with hands; they swing opposite to the legs */
  const sb = c.skin[1];
  const sleeve = (x, top, len, lit) => {
    for (let yy = top; yy < top + len; yy++) set(x, yy, lit ? tl : ts);
    // hands in the base skin tone (the hue-shifted shadow reads as a red cuff)
    set(x, top + len, sb);
    set(x, top + len + 1, sb);
  };
  if (dir === "right") {
    const swing = step;
    for (let yy = y + 1; yy < y + 5; yy++) {
      set(15 + swing, yy, tl);
      set(16 + swing, yy, tb);
    }
    set(15 + swing, y + 5, sb);
    set(16 + swing, y + 5, sb);
  } else {
    const armLen = o.child ? 2 : 4;
    sleeve(11, y + 1 + (step === 1 ? 1 : 0), armLen, true);
    sleeve(20, y + 1 + (step === -1 ? 1 : 0), armLen, false);
  }

  /* held items */
  if (o.staff || o.spear) {
    const [ws, wb] = [V.t2, V.t4];
    const sx = dir === "right" ? 18 : 21;
    const top = y - 12;
    for (let yy = top; yy <= feet - 1; yy++) {
      set(sx, yy, wb);
      set(sx + 1, yy, ws);
    }
    if (o.staff) {
      stamp(p, sx - 1, top - 3, [".rr.", "rRRr", "rRRr", ".rr."], { r: V.rune, R: V.runeL });
    } else {
      stamp(p, sx, top - 4, [".k", "kK", "kK", "kk"], { k: V.k2, K: V.k5 });
    }
  }
  if (o.bow && dir !== "down") {
    // bow slung across the back
    for (let i = 0; i < 12; i++) set(12 + Math.round(i * 0.6), y - 2 + i, V.t3);
    for (let i = 0; i < 12; i++) set(13 + Math.round(i * 0.6), y - 1 + i, V.cream);
  } else if (o.bow) {
    for (let i = 0; i < 7; i++) set(13 + i, y + i, V.t2); // quiver strap
  }
}

/* ================================================================ composition */

function paletteFor(o) {
  const hair = o.hair || "#6b4a2a";
  return {
    skin: ramp(o.skin || "#e8b48c"),
    hair: ramp(hair),
    tunic: ramp(o.tunic || "#4a6fa5"),
    trim: ramp(o.trim || "#d9a441"),
    pants: ramp(o.pants || o.tunic || "#5c4632"),
    boots: ramp(o.boots || "#3a2a1c"),
    belt: ramp(o.belt || "#4a3425"),
    cape: ramp(o.cape || "#8a2f24"),
    apron: ramp(o.apron || "#c8b088"),
    hat: ramp(o.hoodColor || o.scarfColor || o.capColor || (o.hairStyle === "helmet" ? "#8c94a0" : hair)),
    beard: ramp(o.beard === "white-long" ? "#d8d4cc" : o.beardColor || hair),
    eye: o.eye || "#24182a",
  };
}

export function drawCharFrame(dir, frame, o) {
  const p = new Pix(CW, CH);
  const c = paletteFor(o);
  const bob = frame === 0 ? 0 : 1; // step frames lift the figure a pixel
  const feet = 29;
  const headY = (o.child ? 10 : 7) - bob;
  const bodyY = headY + 10;
  drawBody(p, dir, frame, o, c, bodyY, feet - (frame === 0 ? 0 : 0));

  const map = {
    s: c.skin[1],
    S: c.skin[0],
    E: c.eye,
    h: c.hair[1],
    H: c.hair[0],
    L: c.hair[2],
    x: c.hat[1],
    X: c.hat[0],
    Y: c.hat[2],
    d: c.beard[1],
    D: c.beard[0],
    r: o.hairStyle === "helmet" ? V.k3 : c.trim[1],
  };
  stamp(p, 10, headY, FACE[dir], map);
  const style = HAIR[o.hairStyle || "short"] ?? HAIR.short;
  const [dy, rows] = style[dir];
  stamp(p, 10, headY + dy, rows, map);
  if (o.beard && dir !== "up") {
    const kind = o.beard === "short" ? "short" : "long";
    const [by, brows] = BEARD[kind][dir];
    stamp(p, 10, headY + by, brows, map);
  }
  outlineWith(p, V.ink);
  // soft contact shadow under the feet
  for (let x = 11; x <= 20; x++) if (!p.opaque(x, feet + 1)) p.set(x, feet + 1, V.shadow);
  for (let x = 13; x <= 18; x++) if (!p.opaque(x, feet + 2)) p.set(x, feet + 2, V.shadow);
  return p;
}
