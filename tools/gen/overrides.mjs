// overrides.mjs - hand-painted art that replaces generated art, key for key.
//
// Drop a PNG into tools/gen/overrides/tiles/<tile key>.png (16x16) or
// tools/gen/overrides/objects/<object key>.png (same size as the generated
// object; multi-frame objects keep their frames stacked vertically) and run
// `npm run assets`. The generator uses the painted file instead of its own
// drawing, so a single prop or tile can be refined in LibreSprite/Aseprite
// without touching code. A file whose size does not match is an error: map
// footprints and collision depend on these sizes.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { Pix } from "./pix.mjs";

export const OVERRIDE_DIR = join(dirname(fileURLToPath(import.meta.url)), "overrides");

/** the override for `key`, or null; throws if its size is wrong */
export function loadOverride(kind, key, w, h, dir = OVERRIDE_DIR) {
  const file = join(dir, kind, `${key}.png`);
  if (!existsSync(file)) return null;
  const png = PNG.sync.read(readFileSync(file));
  if (png.width !== w || png.height !== h) {
    throw new Error(`override ${kind}/${key}.png is ${png.width}x${png.height}, expected ${w}x${h}`);
  }
  const p = new Pix(w, h);
  p.d.set(png.data);
  return p;
}

/** every override file must name something the generator actually makes */
export function checkOverrideKeys(kind, knownKeys, dir = OVERRIDE_DIR) {
  const folder = join(dir, kind);
  if (!existsSync(folder)) return [];
  const known = new Set(knownKeys);
  const files = readdirSync(folder).filter((f) => f.endsWith(".png"));
  for (const f of files) {
    const key = f.slice(0, -4);
    if (!known.has(key)) throw new Error(`override ${kind}/${f} does not match any generated ${kind === "tiles" ? "tile" : "object"} key`);
  }
  return files.map((f) => f.slice(0, -4));
}

/* ---- fills: one seamless 16x16 texture per ground family ---- */
//
// tools/gen/overrides/fills/<key>.png replaces the flat fill of a ground
// family. Unlike a tile override (one finished key), a fill feeds every key
// built from it: `path.png` rebuilds `path` and all 48 `path#mask~prof` edge
// tiles with the generator's own masks and grass fringe; `grass~v.png`
// replaces that grass variant and recolours the grass fringe. Per-key tile
// overrides are applied after this and still win.

export const FILL_KEYS = [
  ...Array.from({ length: 8 }, (_, v) => `grass~${v}`),
  "path",
  "path2",
  "sand",
  "sand2",
  "cobble",
  "cobble2",
];

/** families the renderer alternates between; supplying only one of a pair mixes painted and generated cells */
const FILL_PAIRS = [
  ["path", "path2"],
  ["sand", "sand2"],
  ["cobble", "cobble2"],
];

const dist = (p, x0, y0, x1, y1) => {
  const a = p.get(x0, y0);
  const b = p.get(x1, y1);
  return (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;
};

/**
 * How visible the wraparound seam is when the fill repeats. `lr` compares the
 * right column with the left column it will sit next to, `tb` the bottom row
 * with the top row (mean RGB difference, 0-255). `interior` is the same
 * measure between neighbouring pixels inside the tile, so a busy texture is
 * not punished for being busy. `score` = worst seam / max(interior, 1);
 * about 1 means the seam is as smooth as the texture itself.
 */
export function seamScore(p) {
  let lr = 0;
  let tb = 0;
  for (let i = 0; i < 16; i++) {
    lr += dist(p, 15, i, 0, i);
    tb += dist(p, i, 15, i, 0);
  }
  lr /= 16;
  tb /= 16;
  let interior = 0;
  let n = 0;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (x < 15) (interior += dist(p, x, y, x + 1, y)), n++;
      if (y < 15) (interior += dist(p, x, y, x, y + 1)), n++;
    }
  interior /= n;
  const r = (v) => Math.round(v * 100) / 100;
  return { lr: r(lr), tb: r(tb), interior: r(interior), score: r(Math.max(lr, tb) / Math.max(interior, 1)) };
}

/** seams scoring above this (and visibly different, > SEAM_MIN) get a warning */
export const SEAM_WARN = 2;
const SEAM_MIN = 6;

/**
 * Load every fill. Wrong names, sizes and any transparency stop the build
 * (a fill is a ground texture: holes would show the atlas background).
 * Seams and half-supplied pairs only warn.
 */
export function loadFills(dir = OVERRIDE_DIR) {
  const folder = join(dir, "fills");
  const fills = {};
  const reports = [];
  if (!existsSync(folder)) return { fills, reports };
  const known = new Set(FILL_KEYS);
  for (const f of readdirSync(folder).filter((f) => f.endsWith(".png")).sort()) {
    const key = f.slice(0, -4);
    if (!known.has(key)) throw new Error(`fill fills/${f} is not a fill key (expected one of ${FILL_KEYS.join(", ")})`);
    const p = loadOverride("fills", key, 16, 16, dir);
    for (let i = 3; i < p.d.length; i += 4)
      if (p.d[i] !== 255) {
        const k = (i - 3) / 4;
        throw new Error(`fill fills/${f} is not opaque (alpha ${p.d[i]} at ${k % 16},${(k / 16) | 0})`);
      }
    const seam = seamScore(p);
    const warnings = [];
    if (seam.score > SEAM_WARN && Math.max(seam.lr, seam.tb) > SEAM_MIN)
      warnings.push(`visible seam when tiled (left/right ${seam.lr}, top/bottom ${seam.tb}, texture ${seam.interior})`);
    fills[key] = p;
    reports.push({ key, seam, warnings });
  }
  for (const pair of FILL_PAIRS) {
    const have = pair.filter((k) => fills[k]);
    if (have.length === 1) {
      const missing = pair.find((k) => !fills[k]);
      reports.find((r) => r.key === have[0]).warnings.push(`${missing} has no fill; the map alternates ${pair.join("/")} cells, so generated ${missing} stays mixed in`);
    }
  }
  return { fills, reports };
}
