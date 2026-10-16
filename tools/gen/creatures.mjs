// creatures.mjs - 64x64 battle sprites for every Phase 1 creature.
// Original art drawn from code: cute base forms, noble middle forms,
// majestic godlike final forms. All face LEFT (mirrored in-engine for the
// player's side of the battle).
import { Pix, rng, shade, mix } from "./pix.mjs";

export const CSIZE = 64;

/* ---------------- shared micro-helpers ---------------- */

function blob(p, cx, cy, rx, ry, c) {
  p.ellipse(cx, cy, rx, ry, c);
}

/** Lighter top / darker bottom for volume on a filled region of one color. */
function volume(p, base, light, dark) {
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const c = p.get(x, y);
      if (c[3] === 0) continue;
      if (Math.abs(c[0] - base[0]) + Math.abs(c[1] - base[1]) + Math.abs(c[2] - base[2]) < 10) {
        const above = p.get(x, y - 1);
        const below = p.get(x, y + 1);
        const isBase = (o) => o[3] > 0 && Math.abs(o[0] - base[0]) + Math.abs(o[1] - base[1]) + Math.abs(o[2] - base[2]) < 10;
        if (isBase(above) && !isBase(below)) p.set(x, y, dark);
        else if (!isBase(above) && isBase(below)) p.set(x, y, light);
      }
    }
  }
}

/** Cute eye: dark socket, bright highlight, optional brow. */
function eye(p, x, y, opts = {}) {
  const s = opts.size ?? 3;
  const c = opts.color || "#241c26";
  p.rect(x, y, s === 3 ? 2 : 3, s, c);
  p.set(x, y, opts.glint || "#ffffff");
  if (opts.glow) {
    p.set(x + (s === 3 ? 1 : 2), y + s - 1, opts.glow);
  }
  if (opts.brow) {
    p.rect(x - 1, y - 2, s + 1, 1, opts.brow);
  }
  if (opts.worried) {
    p.set(x - 1, y - 2, opts.brow || c);
    p.set(x + s, y - 1, opts.brow || c);
  }
}

/** Small angular rune glyph (3-5 px), glowing. */
function rune(p, x, y, glyph, glow, core) {
  const g = glow;
  const k = core || "#ffffff";
  const put = (dx, dy, c) => p.set(x + dx, y + dy, c);
  switch (glyph) {
    case "fehu": // ᚠ
      put(0, 0, g); put(0, 1, g); put(0, 2, g); put(0, 3, g);
      put(1, 0, k); put(2, 1, g); put(1, 2, k); put(2, 3, g);
      break;
    case "uris": // ᚢ
      put(0, 0, g); put(0, 1, g); put(0, 2, g); put(0, 3, g);
      put(1, 1, g); put(2, 2, k); put(2, 3, g);
      break;
    case "thuris": // ᚦ
      put(0, 0, g); put(0, 1, g); put(0, 2, g); put(0, 3, g);
      put(1, 1, k); put(2, 2, g); put(1, 3, g);
      break;
    case "ansuz": // ᚨ
      put(0, 0, g); put(0, 1, g); put(0, 2, g); put(0, 3, g);
      put(1, 0, k); put(1, 2, g); put(2, 1, g); put(2, 3, g);
      break;
    case "raidho": // ᚱ
      put(0, 0, g); put(0, 1, g); put(0, 2, g); put(0, 3, g);
      put(1, 0, g); put(2, 1, k); put(1, 2, g); put(2, 3, g);
      break;
    case "kaunan": // ᚲ
      put(0, 0, g); put(1, 1, k); put(2, 2, g); put(1, 3, g); put(0, 4, g);
      break;
    case "hwel": // ᚹ sun-wheel
      put(0, 0, g); put(2, 0, g); put(1, 1, k); put(0, 2, g); put(2, 2, g); put(1, 3, g);
      break;
    case "algiz": // ᛉ
      put(1, 0, k); put(0, 1, g); put(1, 1, g); put(2, 1, g); put(1, 2, g); put(1, 3, g);
      break;
  }
}

function flameTuft(p, cx, cy, h, seed) {
  const r = rng(seed);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const w = Math.max(1, Math.round((1 - t) * h * 0.5));
    for (let x = -w; x <= w; x++) {
      const flick = Math.round(Math.sin(x * 1.3 + y * 0.9) * 0.8);
      const c = t > 0.66 ? "#e85d2a" : t > 0.33 ? "#ff9d3f" : "#ffcf5c";
      if (r() < 0.9) p.set(cx + x + flick * (t > 0.5 ? 1 : 0), cy - y, c);
    }
  }
  p.set(cx, cy - h, "#ffe89a");
}

function iceCrystal(p, cx, cy, s, c1, c2) {
  p.line(cx - s, cy, cx + s, cy, c1);
  p.line(cx, cy - s, cx, cy + s, c1);
  p.line(cx - s + 1, cy - s + 1, cx + s - 1, cy + s - 1, c2);
  p.line(cx - s + 1, cy + s - 1, cx + s - 1, cy - s + 1, c2);
  p.set(cx, cy, "#ffffff");
}

function spark(p, x, y, len, c1, c2) {
  p.line(x, y, x + len, y + (len >> 1), c1);
  p.line(x + len, y + (len >> 1), x + len - 2, y + len, c2);
  p.set(x + len, y + (len >> 1), "#ffffff");
}

function mossPatch(p, cx, cy, w, seed) {
  const r = rng(seed);
  for (let i = 0; i < w * 3; i++) {
    const x = cx + ((r() * w) | 0) - (w >> 1);
    const y = cy + ((r() * 3) | 0) - 1;
    p.set(x, y, r() < 0.6 ? "#6a8f4a" : "#87a85c");
  }
}

/** Ground shadow ellipse under the creature. */
function groundShadow(p, cx, w) {
  p.ellipse(cx, 60, w, 2, [20, 16, 26, 90]);
}

/* ================================================================
 *  FIRE BEAR FAMILY
 * ================================================================ */

function embercub(p) {
  groundShadow(p, 32, 14);
  const fur = "#e07a3a";
  const furD = "#c05e2a";
  const belly = "#f2d9a8";
  // tail (flame tipped)
  blob(p, 50, 38, 4, 3, furD);
  flameTuft(p, 53, 36, 6, 11);
  // back legs
  p.rect(40, 46, 7, 10, furD);
  p.rect(39, 54, 9, 3, "#8a4420");
  // body
  blob(p, 37, 41, 13, 11, fur);
  blob(p, 33, 44, 9, 7, belly);
  // front legs
  p.rect(25, 46, 6, 10, fur);
  p.rect(24, 54, 8, 3, "#8a4420");
  p.set(26, 55, furD);
  p.set(29, 55, furD);
  // head
  blob(p, 22, 26, 12, 11, fur);
  // ears (round bear ears with flame tips)
  blob(p, 13, 15, 4, 4, fur);
  blob(p, 13, 15, 2, 2, "#b04a22");
  flameTuft(p, 13, 12, 5, 21);
  blob(p, 28, 13, 4, 4, fur);
  blob(p, 28, 13, 2, 2, "#b04a22");
  flameTuft(p, 28, 10, 5, 31);
  // head flame tuft
  flameTuft(p, 21, 14, 7, 41);
  // muzzle
  blob(p, 12, 30, 6, 4, belly);
  p.rect(7, 28, 3, 2, "#3a2018");
  p.set(8, 29, "#5a3828");
  // mouth
  p.line(9, 32, 12, 33, "#8a4420");
  // eyes
  eye(p, 16, 24, { brow: "#a04a20", glint: "#ffe8c8" });
  eye(p, 24, 24, { brow: "#a04a20", glint: "#ffe8c8" });
  // cheek embers
  p.set(14, 29, "#ff9d3f");
  p.set(27, 28, "#ff9d3f");
  // shoulder rune
  rune(p, 40, 38, "kaunan", "#ffcf5c", "#ffe89a");
  // volume + speckle
  volume(p, fur, shade(fur, 0.2), shade(fur, -0.18));
  const r = rng(5);
  for (let i = 0; i < 30; i++) {
    const x = 12 + ((r() * 44) | 0);
    const y = 16 + ((r() * 40) | 0);
    if (p.get(x, y).join() === [224, 122, 58, 255].join() && r() < 0.5) p.set(x, y, furD);
  }
  // floating embers
  p.set(56, 20, "#ff9d3f");
  p.set(6, 18, "#ffcf5c");
  p.set(52, 12, "#e85d2a");
}

function flamepelt(p) {
  groundShadow(p, 33, 17);
  const fur = "#c8482a";
  const furL = "#e07a3a";
  const belly = "#f2c888";
  const mane = "#ff9d3f";
  // tail
  blob(p, 55, 34, 5, 4, fur);
  flameTuft(p, 59, 32, 9, 12);
  flameTuft(p, 56, 30, 6, 13);
  // haunch + back legs
  blob(p, 45, 43, 9, 9, fur);
  p.rect(43, 48, 7, 9, shade(fur, -0.2));
  p.rect(41, 54, 10, 3, "#5a2818");
  // body
  blob(p, 38, 42, 15, 12, fur);
  blob(p, 33, 46, 9, 7, belly);
  // flame mane along back
  for (let i = 0; i < 5; i++) flameTuft(p, 30 + i * 6, 32 - (i % 2), 6 + (i % 3), 60 + i);
  // front legs
  p.rect(23, 46, 7, 11, fur);
  p.rect(21, 54, 10, 3, "#5a2818");
  p.set(24, 55, "#3a1810");
  p.set(28, 55, "#3a1810");
  // head
  blob(p, 21, 24, 13, 12, fur);
  // mane around head
  for (let a = 0; a < 10; a++) {
    const ang = (a / 10) * Math.PI * 2;
    const x = Math.round(21 + Math.cos(ang) * 13);
    const y = Math.round(24 + Math.sin(ang) * 12);
    if (y < 30) flameTuft(p, x, y, 4 + (a % 3), 100 + a);
  }
  // ears
  blob(p, 11, 13, 4, 4, fur);
  blob(p, 11, 13, 2, 2, "#8a3418");
  blob(p, 29, 11, 4, 4, fur);
  blob(p, 29, 11, 2, 2, "#8a3418");
  // muzzle
  blob(p, 10, 28, 7, 5, belly);
  p.rect(4, 26, 3, 2, "#2a1410");
  p.line(6, 31, 11, 32, "#5a2818");
  // fang
  p.set(8, 32, "#f5ead0");
  // eyes (determined)
  eye(p, 14, 22, { brow: "#7a2c14", glint: "#ffcf5c", glow: "#ff9d3f" });
  eye(p, 23, 22, { brow: "#7a2c14", glint: "#ffcf5c", glow: "#ff9d3f" });
  // rune lines on flank
  rune(p, 40, 40, "fehu", "#ffcf5c", "#ffe89a");
  rune(p, 45, 42, "uris", "#ff9d3f", "#ffcf5c");
  volume(p, fur, furL, shade(fur, -0.2));
  p.set(58, 16, "#ff9d3f");
  p.set(6, 12, "#ffcf5c");
  p.set(52, 8, "#e85d2a");
  p.set(60, 46, "#ff9d3f");
}

function infernoskarn(p) {
  groundShadow(p, 32, 20);
  const fur = "#a83a22";
  const furL = "#c8522e";
  const belly = "#e8a860";
  const maneA = "#ff9d3f";
  const maneB = "#ffcf5c";
  // aura glow behind
  for (let i = 0; i < 26; i++) {
    const r2 = rng(200 + i);
    const x = (r2() * 64) | 0;
    const y = 4 + ((r2() * 44) | 0);
    if (!p.opaque(x, y)) p.set(x, y, [255, 140, 60, 40 + ((r2() * 40) | 0)]);
  }
  // massive tail
  blob(p, 54, 30, 6, 5, fur);
  for (let i = 0; i < 3; i++) flameTuft(p, 56 + i * 3, 26 - i * 2, 10 + i * 2, 300 + i);
  // haunch
  blob(p, 44, 40, 11, 11, fur);
  p.rect(42, 47, 8, 10, shade(fur, -0.25));
  p.rect(40, 54, 11, 4, "#3a1408");
  // body
  blob(p, 36, 40, 17, 14, fur);
  blob(p, 31, 45, 10, 8, belly);
  // great flame mane (back)
  for (let i = 0; i < 7; i++) flameTuft(p, 26 + i * 5, 28 - (i % 2) * 2, 8 + ((i * 3) % 5), 320 + i);
  // chest
  p.rect(20, 45, 8, 12, furL);
  p.rect(19, 54, 10, 4, "#3a1408");
  p.set(22, 55, "#1c0a04");
  p.set(26, 55, "#1c0a04");
  // head
  blob(p, 20, 21, 14, 12, fur);
  // mane crown around head
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    const x = Math.round(20 + Math.cos(ang) * 14);
    const y = Math.round(21 + Math.sin(ang) * 12);
    if (y < 28) flameTuft(p, x, y, 6 + (a % 3) * 2, 340 + a);
  }
  // horn crown (dark basalt horns with glowing cracks)
  const horn = (bx, by, dirx) => {
    for (let i = 0; i < 9; i++) {
      const x = bx + dirx * Math.round(i * 0.9);
      const y = by - i;
      p.rect(x, y, 3 - (i > 5 ? 1 : 0), 1, "#2e1a12");
      if (i % 3 === 0) p.set(x + 1, y, "#ff9d3f");
    }
  };
  horn(12, 12, -1);
  horn(27, 10, 1);
  // ears between horns
  blob(p, 9, 12, 3, 3, fur);
  blob(p, 30, 10, 3, 3, fur);
  // muzzle
  blob(p, 8, 26, 8, 6, belly);
  p.rect(1, 23, 4, 3, "#221008");
  p.line(3, 30, 10, 31, "#5a2410");
  p.set(5, 31, "#f5ead0");
  p.set(8, 32, "#f5ead0");
  // blazing eyes
  eye(p, 12, 19, { size: 4, color: "#ffcf5c", glint: "#ffffff", glow: "#ff9d3f", brow: "#5a1c0c" });
  eye(p, 22, 19, { size: 4, color: "#ffcf5c", glint: "#ffffff", glow: "#ff9d3f", brow: "#5a1c0c" });
  // glowing rune sigils
  rune(p, 38, 38, "fehu", "#ffcf5c", "#fff4c0");
  rune(p, 44, 42, "thuris", "#ff9d3f", "#ffcf5c");
  rune(p, 30, 34, "algiz", "#ffe89a", "#ffffff");
  volume(p, fur, furL, shade(fur, -0.25));
  // ember particles
  for (const [x, y, c] of [[58, 12, "#ffcf5c"], [4, 8, "#ff9d3f"], [50, 6, "#ffe89a"], [60, 50, "#ff9d3f"], [8, 40, "#e85d2a"], [56, 22, "#fff4c0"]]) p.set(x, y, c);
}

/* ================================================================
 *  ICE WOLF FAMILY
 * ================================================================ */

function snowpup(p) {
  groundShadow(p, 32, 14);
  const fur = "#cfe4f2";
  const furS = "#a8c8e0";
  const belly = "#f2f8fc";
  // fluffy tail
  blob(p, 51, 40, 6, 5, fur);
  blob(p, 54, 37, 4, 3, belly);
  iceCrystal(p, 57, 35, 2, "#9fd8ef", "#d8f0fa");
  // back legs
  p.rect(40, 47, 7, 9, furS);
  p.rect(39, 54, 9, 3, "#7a9ab8");
  // body
  blob(p, 37, 42, 13, 10, fur);
  blob(p, 33, 45, 9, 6, belly);
  // front legs
  p.rect(25, 47, 6, 9, fur);
  p.rect(24, 54, 8, 3, "#7a9ab8");
  // head
  blob(p, 22, 27, 12, 11, fur);
  // big pup ears
  const ear = (x, y, dx) => {
    p.poly([[x, y], [x + dx * 7, y - 10], [x + dx * 8, y + 2]], fur);
    p.poly([[x + dx * 2, y - 1], [x + dx * 6, y - 8], [x + dx * 7, y + 1]], "#e8a8b8");
    p.set(x + dx * 6, y - 9, "#d8f0fa");
  };
  ear(14, 18, -1);
  ear(28, 16, 1);
  // ice crystal on forehead
  iceCrystal(p, 21, 17, 2, "#7cc4e4", "#bfe6f5");
  // muzzle
  blob(p, 12, 31, 6, 4, belly);
  p.rect(7, 29, 3, 2, "#4a5a72");
  p.set(8, 29, "#6a7a92");
  p.line(9, 33, 12, 34, "#8aa0b8");
  // eyes (calm, icy blue)
  eye(p, 15, 25, { color: "#2a4a6a", glint: "#d8f0fa" });
  eye(p, 23, 25, { color: "#2a4a6a", glint: "#d8f0fa" });
  // cheek fluff
  p.set(13, 28, furS);
  p.set(28, 27, furS);
  // snowflake rune
  rune(p, 40, 40, "hwel", "#7cc4e4", "#e8f8ff");
  volume(p, fur, "#e8f4fc", furS);
  // snow motes
  for (const [x, y] of [[6, 14], [56, 16], [10, 8], [52, 8], [60, 40]]) p.set(x, y, "#e8f8ff");
}

function glacierfang(p) {
  groundShadow(p, 33, 17);
  const fur = "#b8d4e8";
  const furD = "#8fb4d0";
  const belly = "#e8f4fc";
  const iceA = "#9fd8ef";
  // tail
  blob(p, 54, 36, 6, 5, fur);
  blob(p, 58, 33, 4, 3, furD);
  iceCrystal(p, 60, 30, 3, iceA, "#e8f8ff");
  // haunch
  blob(p, 44, 42, 9, 9, fur);
  p.rect(42, 48, 7, 9, furD);
  p.rect(40, 54, 10, 3, "#5a7a98");
  // body
  blob(p, 37, 42, 15, 11, fur);
  blob(p, 32, 45, 9, 7, belly);
  // ice armor plates on back
  const plate = (x, y, w) => {
    p.poly([[x, y + 4], [x + w / 2, y - 4], [x + w, y + 4]], iceA);
    p.poly([[x + 2, y + 3], [x + w / 2, y - 2], [x + w / 2, y + 3]], "#d8f0fa");
  };
  plate(30, 32, 8);
  plate(38, 31, 9);
  plate(46, 33, 7);
  // front legs
  p.rect(23, 46, 7, 11, fur);
  p.rect(21, 54, 10, 3, "#5a7a98");
  // head
  blob(p, 21, 25, 13, 11, fur);
  // ears (pointed, ice-tipped)
  p.poly([[11, 18], [9, 6], [17, 14]], fur);
  p.poly([[11, 16], [10, 8], [15, 14]], "#d88a9a");
  p.set(9, 6, iceA);
  p.poly([[27, 15], [31, 4], [33, 14]], fur);
  p.poly([[28, 14], [31, 6], [31, 13]], "#d88a9a");
  p.set(31, 4, iceA);
  // frost crest
  iceCrystal(p, 20, 13, 3, iceA, "#ffffff");
  // muzzle with fang
  blob(p, 9, 29, 7, 5, belly);
  p.rect(3, 27, 3, 2, "#3a4a62");
  p.line(5, 32, 11, 33, "#6a8098");
  p.set(6, 33, "#ffffff");
  p.set(6, 34, "#e8f8ff");
  // eyes
  eye(p, 14, 23, { color: "#1c3a5a", glint: "#bfe6f5", brow: furD });
  eye(p, 22, 23, { color: "#1c3a5a", glint: "#bfe6f5", brow: furD });
  // runes
  rune(p, 40, 42, "uris", "#7cc4e4", "#e8f8ff");
  rune(p, 46, 44, "algiz", iceA, "#ffffff");
  volume(p, fur, "#dcf0fa", furD);
  for (const [x, y] of [[6, 10], [56, 12], [62, 44], [8, 6]]) iceCrystal(p, x, y, 1, "#d8f0fa", "#ffffff");
}

function frosthowl(p) {
  groundShadow(p, 32, 19);
  const fur = "#a8c8e4";
  const furL = "#d4e8f6";
  const spirit = "#8fe8e0";
  const belly = "#eef8ff";
  // spirit aura
  for (let i = 0; i < 34; i++) {
    const r = rng(400 + i);
    const x = (r() * 64) | 0;
    const y = 2 + ((r() * 48) | 0);
    if (!p.opaque(x, y)) p.set(x, y, [140, 220, 235, 30 + ((r() * 50) | 0)]);
  }
  // aurora tail (flowing)
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    const x = 50 + Math.round(t * 12);
    const y = 34 - Math.round(Math.sin(t * 3) * 6 + t * 8);
    p.ellipse(x, y, 5 - Math.round(t * 3), 4 - Math.round(t * 2), mix("#8fe8e0", "#eef8ff", t));
  }
  // haunch
  blob(p, 43, 41, 10, 10, fur);
  p.rect(41, 48, 8, 9, shade(fur, -0.2));
  p.rect(39, 54, 11, 4, "#4a6a8a");
  // body
  blob(p, 35, 41, 16, 12, fur);
  blob(p, 30, 45, 10, 8, belly);
  // spirit markings along flank
  for (let i = 0; i < 4; i++) {
    p.line(30 + i * 6, 36 + (i % 2), 34 + i * 6, 40 + (i % 2), [143, 232, 224, 160]);
  }
  // chest
  p.rect(18, 45, 9, 12, furL);
  p.rect(17, 54, 11, 4, "#4a6a8a");
  // head (regal, raised)
  blob(p, 20, 21, 13, 11, fur);
  // ears
  p.poly([[10, 15], [8, 3], [16, 11]], fur);
  p.set(8, 3, "#ffffff");
  p.poly([[27, 12], [31, 1], [33, 11]], fur);
  p.set(31, 1, "#ffffff");
  // ice antler crown
  const antler = (bx, by, d) => {
    p.line(bx, by, bx + d * 6, by - 9, "#bfe6f5");
    p.line(bx + d * 3, by - 4, bx + d * 6, by - 3, "#bfe6f5");
    p.line(bx + d * 4, by - 6, bx + d * 2, by - 10, "#e8f8ff");
    p.set(bx + d * 6, by - 9, "#ffffff");
    p.set(bx + d * 2, by - 10, "#ffffff");
  };
  antler(14, 10, -1);
  antler(26, 8, 1);
  iceCrystal(p, 20, 7, 3, spirit, "#ffffff");
  // muzzle
  blob(p, 8, 26, 8, 5, belly);
  p.rect(1, 24, 4, 3, "#2c4460");
  p.line(3, 29, 10, 30, "#5a7a98");
  p.set(5, 30, "#ffffff");
  p.set(5, 31, "#e8f8ff");
  p.set(8, 30, "#ffffff");
  // glowing spirit eyes
  eye(p, 13, 19, { size: 4, color: "#2a6a8a", glint: "#ffffff", glow: spirit });
  eye(p, 21, 19, { size: 4, color: "#2a6a8a", glint: "#ffffff", glow: spirit });
  // runes
  rune(p, 38, 38, "algiz", spirit, "#ffffff");
  rune(p, 44, 44, "hwel", "#7cc4e4", "#e8f8ff");
  volume(p, fur, furL, shade(fur, -0.2));
  // drifting snow
  for (const [x, y] of [[5, 8], [58, 10], [62, 52], [4, 20], [56, 46], [10, 4]]) p.set(x, y, "#e8f8ff");
}

/* ================================================================
 *  LIGHTNING RAVEN FAMILY
 * ================================================================ */

function stormchick(p) {
  groundShadow(p, 32, 10);
  const down = "#5a4a6a"; // fluffy dark down
  const downL = "#7a6a8c";
  const belly = "#b8a8c8";
  const bolt = "#ffd83f";
  // tiny tail feathers
  p.poly([[44, 40], [56, 34], [55, 40], [46, 44]], down);
  p.set(55, 36, bolt);
  // stubby wing (far)
  blob(p, 40, 38, 5, 6, shade(down, -0.2));
  // body (round chick)
  blob(p, 33, 42, 12, 11, down);
  blob(p, 29, 45, 8, 7, belly);
  // legs
  p.line(29, 52, 28, 57, "#c88a3a");
  p.line(28, 57, 25, 58, "#c88a3a");
  p.line(28, 57, 31, 58, "#c88a3a");
  p.line(37, 52, 38, 57, "#c88a3a");
  p.line(38, 57, 35, 58, "#c88a3a");
  p.line(38, 57, 41, 58, "#c88a3a");
  // stubby wing (near)
  blob(p, 36, 40, 6, 7, downL);
  p.line(33, 42, 39, 45, shade(downL, -0.25));
  p.set(38, 38, bolt);
  // head (big round)
  blob(p, 23, 26, 12, 11, down);
  // lightning tuft (3 zappy feathers)
  p.line(20, 15, 18, 7, bolt);
  p.line(18, 7, 20, 5, "#fff4b0");
  p.line(24, 14, 25, 5, bolt);
  p.line(25, 5, 23, 3, "#fff4b0");
  p.line(28, 15, 31, 8, bolt);
  p.set(31, 8, "#fff4b0");
  // beak
  p.poly([[11, 26], [2, 29], [11, 31]], "#d9a441");
  p.poly([[11, 26], [4, 28], [11, 28]], "#e8b850");
  p.line(4, 29, 11, 29, "#a87a2a");
  // eyes (big curious)
  eye(p, 15, 23, { size: 4, color: "#1c1424", glint: "#ffffff", glow: bolt });
  eye(p, 23, 23, { size: 4, color: "#1c1424", glint: "#ffffff", glow: bolt });
  // cheek sparks
  p.set(13, 29, bolt);
  p.set(28, 28, bolt);
  // chest rune
  rune(p, 28, 44, "kaunan", bolt, "#fff4b0");
  volume(p, down, downL, shade(down, -0.25));
  // sparks around
  spark(p, 50, 14, 4, bolt, "#fff4b0");
  spark(p, 8, 12, 3, bolt, "#fff4b0");
  p.set(56, 46, bolt);
}

function thunderwing(p) {
  groundShadow(p, 33, 13);
  const feat = "#3c3450";
  const featL = "#5a5070";
  const belly = "#8a7a9c";
  const bolt = "#ffd83f";
  // tail (forked, bolt-tipped)
  p.poly([[44, 36], [60, 28], [58, 34], [46, 40]], feat);
  p.poly([[44, 40], [60, 40], [57, 45], [45, 44]], shade(feat, -0.15));
  p.set(60, 28, bolt);
  p.set(60, 40, bolt);
  // far wing (partially spread)
  p.poly([[34, 34], [54, 16], [58, 20], [40, 38]], featL);
  p.line(54, 16, 58, 20, bolt);
  // body
  blob(p, 33, 42, 13, 11, feat);
  blob(p, 28, 45, 8, 7, belly);
  // legs
  p.line(29, 52, 28, 57, "#c88a3a");
  p.line(28, 57, 25, 58, "#c88a3a");
  p.line(37, 52, 38, 57, "#c88a3a");
  p.line(38, 57, 41, 58, "#c88a3a");
  // near wing (folded, lightning vein)
  blob(p, 37, 40, 8, 9, featL);
  p.line(32, 36, 43, 46, shade(featL, -0.3));
  spark(p, 34, 38, 5, bolt, "#fff4b0");
  p.set(42, 43, bolt);
  // head
  blob(p, 22, 25, 12, 10, feat);
  // crest (3 swept feathers)
  p.poly([[24, 15], [34, 8], [30, 16]], featL);
  p.poly([[21, 14], [28, 4], [26, 14]], featL);
  p.poly([[18, 15], [20, 5], [22, 14]], featL);
  p.set(34, 8, bolt);
  p.set(28, 4, bolt);
  p.set(20, 5, bolt);
  // beak (longer, sharper)
  p.poly([[11, 24], [0, 27], [11, 29]], "#c89830");
  p.poly([[11, 24], [2, 26], [11, 26]], "#e0b040");
  p.line(2, 27, 11, 27, "#8a6820");
  // eyes
  eye(p, 14, 21, { size: 4, color: "#14101c", glint: "#ffffff", glow: bolt, brow: featL });
  eye(p, 22, 21, { size: 4, color: "#14101c", glint: "#ffffff", glow: bolt, brow: featL });
  // chest rune
  rune(p, 27, 43, "fehu", bolt, "#fff4b0");
  volume(p, feat, featL, shade(feat, -0.25));
  spark(p, 54, 48, 5, bolt, "#fff4b0");
  spark(p, 6, 10, 4, bolt, "#fff4b0");
}

function skyreign(p) {
  groundShadow(p, 32, 16);
  const feat = "#2c2840";
  const featL = "#4a4468";
  const belly = "#7a6a94";
  const bolt = "#ffe04a";
  const boltW = "#fff8c0";
  const wind = "#8fe8e0";
  // storm aura
  for (let i = 0; i < 36; i++) {
    const r = rng(500 + i);
    const x = (r() * 64) | 0;
    const y = 1 + ((r() * 40) | 0);
    if (!p.opaque(x, y)) p.set(x, y, [255, 224, 74, 25 + ((r() * 45) | 0)]);
  }
  // GREAT SPREAD WINGS (behind body)
  const wing = (flip) => {
    for (let f = 0; f < 7; f++) {
      const t = f / 7;
      const x1 = 32 + (flip ? -1 : 1) * Math.round(6 + t * 24);
      const y1 = 24 - Math.round(Math.sin(t * 2.2) * 16) - (flip ? 2 : 0);
      const x2 = 32 + (flip ? -1 : 1) * Math.round(2 + t * 14);
      const y2 = 38;
      p.line(x2, y2, x1, y1, f % 2 ? feat : featL);
      p.line(x2 + 1, y2, x1 + 1, y1, shade(feat, -0.3));
      p.set(x1, y1, bolt);
    }
  };
  wing(false);
  wing(true);
  // wing membrane hint
  p.poly([[32, 30], [56, 12], [50, 26], [34, 38]], [60, 54, 88, 220]);
  p.poly([[32, 30], [8, 14], [14, 28], [30, 38]], [60, 54, 88, 220]);
  // tail (long bolt feathers)
  p.poly([[40, 42], [62, 44], [60, 50], [40, 48]], feat);
  p.poly([[40, 46], [58, 54], [54, 57], [39, 50]], shade(feat, -0.15));
  p.set(62, 44, bolt);
  p.set(62, 45, boltW);
  p.set(58, 54, bolt);
  // body
  blob(p, 32, 42, 13, 12, feat);
  blob(p, 27, 46, 8, 7, belly);
  // talons
  p.line(27, 53, 26, 58, "#c88a3a");
  p.line(26, 58, 22, 59, "#c88a3a");
  p.line(26, 58, 26, 61, "#c88a3a");
  p.line(36, 53, 37, 58, "#c88a3a");
  p.line(37, 58, 41, 59, "#c88a3a");
  // head (regal)
  blob(p, 22, 24, 12, 10, feat);
  // crown crest (5 feathers, glowing tips)
  for (let i = 0; i < 5; i++) {
    const bx = 14 + i * 4;
    const tipY = 6 - (i === 2 ? 4 : i === 1 || i === 3 ? 2 : 0);
    p.line(bx, 16, bx + (i - 2), tipY, featL);
    p.set(bx + (i - 2), tipY, bolt);
    p.set(bx + (i - 2), tipY - 1, boltW);
  }
  // beak
  p.poly([[11, 22], [-1, 26], [11, 28]], "#d9a441");
  p.poly([[11, 22], [1, 25], [11, 25]], "#eec050");
  p.line(1, 26, 11, 26, "#9a7428");
  // storm eyes
  eye(p, 13, 20, { size: 4, color: bolt, glint: "#ffffff", glow: boltW, brow: featL });
  eye(p, 21, 20, { size: 4, color: bolt, glint: "#ffffff", glow: boltW, brow: featL });
  // runes on chest & wings
  rune(p, 26, 44, "algiz", bolt, boltW);
  rune(p, 48, 20, "kaunan", wind, "#ffffff");
  rune(p, 12, 36, "hwel", bolt, boltW);
  // wind swirls
  for (let i = 0; i < 3; i++) {
    const y = 10 + i * 14;
    p.line(50 + i * 2, y, 60, y - 2, [143, 232, 224, 140]);
    p.set(60, y - 2, [200, 250, 245, 180]);
  }
  volume(p, feat, featL, shade(feat, -0.25));
  // lightning bolts in sky
  spark(p, 52, 4, 6, bolt, boltW);
  spark(p, 4, 6, 5, bolt, boltW);
}

/* ================================================================
 *  WILD CREATURES
 * ================================================================ */

function bergling(p) {
  groundShadow(p, 32, 13);
  const rock = "#8a8578";
  const rockD = "#6e6a5e";
  const rockL = "#a5a090";
  const moss = "#6a8f4a";
  // pebble tail
  blob(p, 49, 46, 3, 3, rockD);
  blob(p, 53, 47, 2, 2, rock);
  // legs (stubby stone)
  p.rect(38, 48, 7, 8, rockD);
  p.rect(37, 54, 9, 3, "#54514a");
  p.rect(24, 48, 7, 8, rock);
  p.rect(23, 54, 9, 3, "#54514a");
  // body (rounded boulder)
  blob(p, 35, 41, 14, 11, rock);
  // stone facets
  p.line(28, 34, 36, 32, rockL);
  p.line(40, 36, 46, 42, rockD);
  p.line(30, 46, 38, 48, rockD);
  // moss on back
  mossPatch(p, 34, 32, 14, 707);
  mossPatch(p, 42, 36, 6, 709);
  // head (big shy stone head)
  blob(p, 21, 28, 12, 10, rock);
  blob(p, 21, 26, 11, 8, rockL);
  // head moss tuft
  mossPatch(p, 19, 19, 10, 711);
  p.set(15, 17, moss);
  p.set(23, 17, moss);
  // pebble ears
  blob(p, 11, 20, 3, 3, rockD);
  blob(p, 29, 19, 3, 3, rockD);
  // worried face
  blob(p, 13, 32, 5, 3, "#b8b2a0");
  p.set(9, 31, "#3a382e");
  p.set(10, 31, "#3a382e");
  eye(p, 15, 26, { size: 4, color: "#2c2a24", glint: "#ffffff", worried: true, brow: rockD });
  eye(p, 23, 25, { size: 4, color: "#2c2a24", glint: "#ffffff", worried: true, brow: rockD });
  // tiny trembling marks
  p.line(6, 20, 4, 18, "#c8c0a8");
  p.line(8, 16, 7, 13, "#c8c0a8");
  // amber rune (glowing softly)
  rune(p, 36, 40, "uris", "#e8a840", "#ffd880");
  rune(p, 16, 34, "kaunan", "#e8a840", "#ffd880");
  volume(p, rock, rockL, rockD);
  // crumbs
  p.set(56, 54, rockD);
  p.set(6, 52, rock);
}

function bergreir(p) {
  groundShadow(p, 33, 18);
  const rock = "#7d7868";
  const rockD = "#5f5b4e";
  const rockL = "#9a9484";
  const moss = "#5f8a42";
  const amber = "#e8a840";
  // boulder shoulders + tail
  blob(p, 52, 38, 6, 5, rockD);
  blob(p, 57, 42, 4, 4, rock);
  mossPatch(p, 54, 34, 6, 801);
  // legs (thick pillars)
  p.rect(40, 44, 10, 12, rockD);
  p.rect(38, 54, 13, 4, "#44413a");
  p.rect(22, 45, 9, 11, rock);
  p.rect(20, 54, 12, 4, "#44413a");
  // body (monolith)
  blob(p, 35, 38, 16, 14, rock);
  p.line(26, 30, 36, 27, rockL);
  p.line(42, 32, 49, 40, rockD);
  // glowing amber veins
  p.line(30, 36, 36, 42, amber);
  p.line(36, 42, 34, 48, amber);
  p.set(36, 42, "#ffd880");
  p.line(40, 30, 44, 36, amber);
  // moss mantle
  mossPatch(p, 33, 26, 18, 803);
  mossPatch(p, 44, 30, 8, 805);
  // head (heavy brow)
  blob(p, 20, 24, 13, 11, rock);
  blob(p, 20, 22, 12, 8, rockL);
  p.rect(9, 20, 22, 2, rockD); // brow ridge
  // stone horns
  p.poly([[10, 16], [4, 6], [12, 12]], rockD);
  p.poly([[28, 14], [34, 4], [30, 13]], rockD);
  p.set(4, 6, rockL);
  p.set(34, 4, rockL);
  mossPatch(p, 20, 13, 8, 807);
  // muzzle
  blob(p, 10, 29, 6, 4, "#b0aa96");
  p.rect(5, 27, 4, 3, "#3a382e");
  // stern glowing eyes
  eye(p, 13, 23, { size: 4, color: amber, glint: "#ffd880", glow: "#c88a30", brow: rockD });
  eye(p, 22, 22, { size: 4, color: amber, glint: "#ffd880", glow: "#c88a30", brow: rockD });
  // runes
  rune(p, 38, 38, "thuris", amber, "#ffd880");
  rune(p, 28, 42, "algiz", amber, "#ffd880");
  volume(p, rock, rockL, rockD);
  p.set(58, 52, rockD);
  p.set(5, 48, rock);
}

function vindhare(p) {
  groundShadow(p, 32, 11);
  const fur = "#cfe0d8";
  const furD = "#a8c0b4";
  const belly = "#f0f6f2";
  const swirl = "#8fe8e0";
  // wind trails behind
  for (let i = 0; i < 3; i++) {
    const y = 30 + i * 8;
    p.line(48 + i * 3, y, 62, y - 3, [143, 232, 224, 120 - i * 25]);
    p.set(62, y - 3, [200, 250, 245, 150 - i * 30]);
  }
  // fluffy round tail
  blob(p, 47, 38, 4, 4, belly);
  blob(p, 48, 37, 3, 3, "#ffffff");
  // haunch (big hare thigh)
  blob(p, 40, 44, 8, 7, furD);
  p.rect(42, 49, 5, 7, furD);
  p.rect(41, 54, 8, 2, "#8aa89c");
  // body (lean, leaping)
  blob(p, 32, 42, 12, 8, fur);
  blob(p, 30, 45, 8, 5, belly);
  // front legs
  p.rect(22, 47, 4, 9, fur);
  p.rect(21, 54, 6, 2, "#8aa89c");
  // head
  blob(p, 20, 29, 9, 8, fur);
  // LONG ears swept back with wind streaks
  p.poly([[22, 22], [40, 8], [42, 12], [26, 25]], fur);
  p.poly([[24, 22], [39, 10], [40, 12], [26, 24]], "#e8b8c8");
  p.poly([[18, 21], [32, 4], [35, 7], [22, 24]], fur);
  p.poly([[20, 20], [32, 6], [33, 8], [22, 23]], "#e8b8c8");
  p.line(40, 8, 46, 6, swirl);
  p.line(33, 4, 38, 1, swirl);
  // face
  blob(p, 13, 32, 4, 3, belly);
  p.set(10, 31, "#e8a8b8");
  p.set(11, 31, "#d08a9a");
  // whiskers
  p.line(8, 33, 3, 34, "#8aa89c");
  p.line(8, 34, 3, 37, "#8aa89c");
  eye(p, 16, 27, { size: 3, color: "#2c4a44", glint: "#ffffff" });
  eye(p, 22, 26, { size: 3, color: "#2c4a44", glint: "#ffffff" });
  // cheek fluff
  p.set(15, 33, furD);
  // swirl rune on flank
  rune(p, 34, 41, "hwel", swirl, "#e8fffa");
  volume(p, fur, "#e4f0e8", furD);
  p.set(52, 18, swirl);
  p.set(8, 12, "#c8f0ea");
}

function glodref(p) {
  groundShadow(p, 32, 12);
  const fur = "#e08a3a";
  const furD = "#b86a28";
  const soot = "#4a3428";
  const belly = "#f2e0c0";
  const ember = "#ff9d3f";
  // big fluffy tail with ember tip
  blob(p, 50, 36, 7, 6, fur);
  blob(p, 55, 32, 5, 4, furD);
  blob(p, 58, 30, 3, 3, soot);
  p.set(60, 28, ember);
  p.set(59, 26, "#ffcf5c");
  // haunch
  blob(p, 41, 44, 7, 7, furD);
  p.rect(42, 49, 5, 7, furD);
  p.rect(41, 54, 7, 3, soot);
  // body (sleek fox)
  blob(p, 33, 42, 12, 9, fur);
  blob(p, 29, 45, 7, 5, belly);
  // soot back
  for (let x = 26; x < 44; x++) {
    if (p.get(x, 35)[3]) p.set(x, 35, soot);
    if (p.get(x, 36)[3] && (x % 3)) p.set(x, 36, shade(soot, 0.15));
  }
  // front legs (dark socks)
  p.rect(23, 46, 5, 8, fur);
  p.rect(23, 51, 5, 4, soot);
  p.rect(22, 54, 7, 3, "#2e1e14");
  // head (fox wedge)
  blob(p, 20, 28, 10, 9, fur);
  // big ears, one flame-tipped
  p.poly([[12, 21], [9, 8], [18, 17]], fur);
  p.poly([[13, 20], [11, 11], [16, 17]], "#8a4a22");
  p.poly([[26, 19], [31, 7], [32, 17]], fur);
  p.poly([[27, 18], [30, 9], [31, 17]], "#8a4a22");
  flameTuft(p, 31, 8, 6, 911);
  // muzzle
  blob(p, 11, 31, 6, 4, belly);
  p.rect(6, 30, 3, 2, "#2e1e14");
  p.line(8, 33, 12, 34, "#8a5a30");
  // eyes (clever)
  eye(p, 14, 26, { size: 3, color: "#3a2410", glint: "#ffcf5c", brow: furD });
  eye(p, 22, 25, { size: 3, color: "#3a2410", glint: "#ffcf5c", brow: furD });
  // coal-mark runes
  rune(p, 34, 41, "kaunan", "#ff9d3f", "#ffcf5c");
  p.set(30, 39, soot);
  p.set(38, 44, soot);
  volume(p, fur, shade(fur, 0.18), furD);
  // embers
  p.set(6, 14, ember);
  p.set(52, 12, "#ffcf5c");
  p.set(58, 50, ember);
}

function ormling(p) {
  groundShadow(p, 30, 11);
  const body = "#7a5a9a";
  const bodyL = "#9a7ab8";
  const belly = "#a8c060";
  const spot = "#5a9a4a";
  // coiled body (3 loops)
  p.ellipse(34, 48, 14, 8, shade(body, -0.2));
  p.ellipse(34, 46, 14, 8, body);
  p.ellipse(34, 46, 9, 5, shade(body, -0.3));
  p.ellipse(36, 44, 9, 5, bodyL);
  p.ellipse(36, 44, 5, 3, shade(body, -0.3));
  p.ellipse(36, 43, 5, 3, body);
  // belly scales visible on coil front
  for (let x = 24; x < 45; x += 2) {
    p.set(x, 52, belly);
    p.set(x + 1, 52, shade(belly, -0.2));
  }
  // tail tip flicking up behind
  p.line(48, 46, 54, 40, body);
  p.line(54, 40, 56, 34, bodyL);
  p.set(56, 33, spot);
  p.set(57, 32, "#c8e880");
  // head raised (big cute head)
  blob(p, 20, 30, 10, 9, body);
  blob(p, 20, 28, 9, 7, bodyL);
  // neck connecting
  p.rect(24, 34, 8, 8, body);
  // tiny frill
  p.poly([[27, 22], [33, 16], [31, 24]], spot);
  p.poly([[13, 21], [8, 15], [10, 23]], spot);
  // head spots
  p.set(16, 23, spot);
  p.set(24, 22, spot);
  p.set(20, 20, spot);
  // snout
  blob(p, 12, 33, 5, 4, shade(bodyL, 0.12));
  p.set(8, 32, "#3a2c48");
  p.set(9, 32, "#3a2c48");
  // little fangs
  p.set(10, 36, "#f0e8d8");
  p.set(13, 36, "#f0e8d8");
  // big round eyes
  eye(p, 14, 27, { size: 4, color: "#241c2e", glint: "#ffffff", glow: "#c8e880" });
  eye(p, 22, 26, { size: 4, color: "#241c2e", glint: "#ffffff", glow: "#c8e880" });
  // drool drop (poison hint)
  p.set(11, 38, "#c8e880");
  p.set(11, 39, "#a8c860");
  // spots along coil
  for (const [x, y] of [[40, 40], [44, 44], [30, 42], [26, 46]]) p.set(x, y, spot);
  // poison rune
  rune(p, 38, 46, "uris", "#c8e880", "#e8ffc0");
  volume(p, body, bodyL, shade(body, -0.25));
  // bubbles
  p.set(6, 18, "#c8e880");
  p.set(50, 14, "#a8c860");
  p.set(56, 22, "#c8e880");
}

function ormstave(p) {
  groundShadow(p, 33, 14);
  const body = "#5f4a85";
  const bodyL = "#7a62a5";
  const belly = "#98b850";
  const glow = "#c8f060";
  // coiled lower body (thicker)
  p.ellipse(38, 50, 16, 9, shade(body, -0.25));
  p.ellipse(38, 48, 16, 9, body);
  p.ellipse(38, 48, 10, 6, shade(body, -0.3));
  p.ellipse(40, 46, 10, 6, bodyL);
  p.ellipse(40, 46, 6, 3, shade(body, -0.3));
  p.ellipse(40, 45, 6, 3, body);
  for (let x = 26; x < 52; x += 2) {
    p.set(x, 55, belly);
    p.set(x + 1, 55, shade(belly, -0.25));
  }
  // rearing neck (S-curve up to head)
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const x = Math.round(38 - Math.sin(t * 2.6) * 12 - t * 8);
    const y = Math.round(46 - t * 26);
    const w = Math.round(5 - t * 2);
    p.ellipse(x, y, w, 2, t < 0.5 ? body : bodyL);
    p.ellipse(x, y - 1, Math.max(1, w - 2), 1, shade(bodyL, 0.12));
    // belly stripe
    p.set(x + w - 1, y + 1, belly);
  }
  // tail tip behind, glowing rattle-fin
  p.line(52, 48, 58, 44, body);
  p.line(58, 44, 60, 38, bodyL);
  p.poly([[60, 38], [57, 32], [63, 33]], glow);
  p.set(60, 36, "#e8ffb0");
  // neck frill (larger, venomous)
  const hx = 25;
  const hy = 18;
  p.poly([[hx + 2, hy + 2], [hx + 12, hy - 6], [hx + 10, hy + 6]], glow);
  p.poly([[hx - 4, hy], [hx - 12, hy - 8], [hx - 8, hy + 4]], glow);
  p.poly([[hx + 2, hy + 4], [hx + 10, hy - 3], [hx + 8, hy + 5]], shade(glow, -0.3));
  // head (hooded serpent)
  blob(p, hx, hy, 10, 8, body);
  blob(p, hx, hy - 2, 9, 6, bodyL);
  // horn buds
  p.poly([[hx - 6, hy - 6], [hx - 8, hy - 12], [hx - 3, hy - 7]], "#3c2c55");
  p.poly([[hx + 5, hy - 7], [hx + 8, hy - 13], [hx + 2, hy - 8]], "#3c2c55");
  p.set(hx - 8, hy - 12, glow);
  p.set(hx + 8, hy - 13, glow);
  // snout
  blob(p, hx - 8, hy + 2, 5, 4, shade(bodyL, 0.12));
  p.set(hx - 12, hy + 1, "#241c2e");
  p.set(hx - 11, hy + 1, "#241c2e");
  // long fangs + drip
  p.set(hx - 11, hy + 5, "#f0e8d8");
  p.set(hx - 11, hy + 6, "#f0e8d8");
  p.set(hx - 8, hy + 5, "#f0e8d8");
  p.set(hx - 11, hy + 7, glow);
  // slit eyes
  eye(p, hx - 5, hy - 1, { size: 3, color: glow, glint: "#ffffff", glow: "#e8ffb0" });
  p.set(hx - 4, hy, "#241c2e");
  eye(p, hx + 2, hy - 2, { size: 3, color: glow, glint: "#ffffff", glow: "#e8ffb0" });
  p.set(hx + 3, hy - 1, "#241c2e");
  // glowing runes along coil
  rune(p, 42, 44, "thuris", glow, "#e8ffb0");
  rune(p, 32, 50, "kaunan", glow, "#e8ffb0");
  volume(p, body, bodyL, shade(body, -0.25));
  // venom motes
  p.set(8, 10, glow);
  p.set(50, 8, "#a8d840");
  p.set(58, 26, glow);
  p.set(10, 30, "#a8d840");
}

/* ---------------- atlas ---------------- */

export const CREATURES = [
  ["embercub", embercub],
  ["flamepelt", flamepelt],
  ["infernoskarn", infernoskarn],
  ["snowpup", snowpup],
  ["glacierfang", glacierfang],
  ["frosthowl", frosthowl],
  ["stormchick", stormchick],
  ["thunderwing", thunderwing],
  ["skyreign", skyreign],
  ["bergling", bergling],
  ["bergreir", bergreir],
  ["vindhare", vindhare],
  ["glodref", glodref],
  ["ormling", ormling],
  ["ormstave", ormstave],
];

export function buildCreatures() {
  const cols = 4;
  const rows = Math.ceil(CREATURES.length / cols);
  const atlas = new Pix(cols * CSIZE, rows * CSIZE);
  const layout = {};
  CREATURES.forEach(([name, fn], i) => {
    const p = new Pix(CSIZE, CSIZE);
    fn(p);
    p.outline(0.45);
    const x = (i % cols) * CSIZE;
    const y = ((i / cols) | 0) * CSIZE;
    atlas.blit(p, x, y);
    layout[name] = { x, y, w: CSIZE, h: CSIZE };
  });
  return { pix: atlas, layout, cols, rows };
}
