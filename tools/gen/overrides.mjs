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
