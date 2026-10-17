// Tiles outside the fill keys that borrow a fill's colours (Phase 4A step 3):
// grass features, meadow, creep blades, inner corners and the sand/soil
// overlays are recoloured from the painted fill, keeping their shapes.
import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { buildTileset } from "../tools/gen/tiles.mjs";
import { parseColor } from "../tools/gen/pix.mjs";
import { V } from "../tools/gen/village-palette.mjs";

const dirs = [];
function overrideDir() {
  const d = mkdtempSync(join(tmpdir(), "fjell-left-"));
  mkdirSync(join(d, "fills"));
  mkdirSync(join(d, "tiles"));
  dirs.push(d);
  return d;
}
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));
function png(path, f) {
  const p = new PNG({ width: 16, height: 16 });
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.data.set(f(x, y), (y * 16 + x) * 4);
  writeFileSync(path, PNG.sync.write(p));
}

const DEFAULT = buildTileset(overrideDir());
const tile = (ts, key) => {
  const i = ts.layout[key];
  const ox = (i % ts.cols) * 16;
  const oy = ((i / ts.cols) | 0) * 16;
  const out = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) out.push(ts.pix.get(ox + x, oy + y));
  return out;
};
const rgb = (c) => parseColor(c).slice(0, 3).join();
const keys = (re) => Object.keys(DEFAULT.layout).filter((k) => re.test(k));
const shade = (painted, colour, base) => {
  const c = parseColor(colour);
  const b = parseColor(base);
  return [0, 1, 2].map((i) => Math.min(255, Math.round((painted[i] * c[i]) / b[i]))).join();
};

const GREENS = new Set([V.g0, V.g1, V.g2, V.g3, V.g4, V.g5].map(rgb));
const DIRT = new Set([V.d0, V.d1, V.d2, V.d3, V.d4].map(rgb));
const SAND = new Set([V.s0, V.s1, V.s2, V.s3, V.s4, "#bfa070"].map(rgb));
/** every tile that sits on or against grass in the village */
const GRASS_DEPENDENT = keys(/^(grass(~\d)?|grass2|grass3|meadow|grass_clover|grass_clump|creep#.*|inner#.*|(path|path2|sand|sand2|cobble|cobble2)(#.*)?)$/);

// a gold, lightly textured grass: nothing like the generated greens
const GOLD = (v) => (x, y) => [176 + ((x * 3 + y + v) % 4) * 4, 132, 49, 255];

describe("fill leftovers", () => {
  it("with no fills the atlas matches the committed tiles.png byte for byte", () => {
    const disk = PNG.sync.read(readFileSync("public/assets/tiles.png"));
    expect(disk.width).toBe(DEFAULT.pix.w);
    expect(Buffer.from(disk.data).equals(Buffer.from(DEFAULT.pix.d))).toBe(true);
  });

  it("covers every tile the problem listed", () => {
    for (const k of ["grass_clover", "grass_clump", "meadow", "creep#5~1", "inner#9", "blend_sand#3~0", "blend_dirt#12~1", "wet#4"]) expect(DEFAULT.layout[k], k).toBeDefined();
    // without a fill they really are the old green
    for (const k of ["grass_clover", "grass_clump", "meadow", "creep#5~1", "inner#9"]) expect(tile(DEFAULT, k).some((px) => GREENS.has(px.slice(0, 3).join())), k).toBe(true);
  });

  it("with a non-green grass fill no original-green pixel survives in any grass-dependent tile", () => {
    const d = overrideDir();
    for (let v = 0; v < 8; v++) png(join(d, "fills", `grass~${v}.png`), GOLD(v));
    const ts = buildTileset(d);
    expect(GRASS_DEPENDENT.length).toBe(14 + 6 * 49 + 30 + 15);
    const left = [];
    for (const k of GRASS_DEPENDENT) for (const px of tile(ts, k)) if (px[3] && GREENS.has(px.slice(0, 3).join())) left.push(k);
    expect([...new Set(left)]).toEqual([]);
  });

  it("recolouring keeps every shape, transparency and non-grass colour", () => {
    const d = overrideDir();
    for (let v = 0; v < 8; v++) png(join(d, "fills", `grass~${v}.png`), GOLD(v));
    const ts = buildTileset(d);
    for (const k of keys(/^(grass_clover|grass_clump|meadow|creep#.*|inner#.*)$/)) {
      const was = tile(DEFAULT, k);
      tile(ts, k).forEach((px, i) => {
        expect(px[3], `${k} alpha ${i}`).toBe(was[i][3]);
        if (!GREENS.has(was[i].slice(0, 3).join())) expect(px, `${k} ${i}`).toEqual(was[i]);
      });
    }
    // clover flowers stay cream; inner corners keep their translucent shadow
    expect(tile(ts, "grass_clover").some((px) => px.slice(0, 3).join() === rgb(V.cream))).toBe(true);
    expect(tile(ts, "inner#1").some((px) => px[3] === 70)).toBe(true);
  });

  it("the base green takes the fill's own pixel; other greens scale from the fill's main colour", () => {
    const d = overrideDir();
    const C = [180, 120, 60, 255];
    png(join(d, "fills", "grass~0.png"), () => C);
    const ts = buildTileset(d);
    const was = tile(DEFAULT, "grass_clover");
    const now = tile(ts, "grass_clover");
    const want = { [rgb(V.g3)]: C.slice(0, 3).join() };
    for (const g of [V.g0, V.g1, V.g2, V.g4, V.g5]) want[rgb(g)] = shade(C, g, V.g3);
    was.forEach((px, i) => {
      const k = px.slice(0, 3).join();
      if (want[k]) expect(now[i].slice(0, 3).join(), `pixel ${i} was ${k}`).toBe(want[k]);
    });
  });

  it("a path fill recolours the soil tongues; a sand fill the sand tongues and the wet shore", () => {
    const d = overrideDir();
    png(join(d, "fills", "path.png"), () => [110, 120, 150, 255]);
    let ts = buildTileset(d);
    const anyOf = (ts, ks, set) => ks.some((k) => tile(ts, k).some((px) => px[3] && set.has(px.slice(0, 3).join())));
    expect(anyOf(DEFAULT, keys(/^blend_dirt#/), DIRT)).toBe(true);
    expect(anyOf(ts, keys(/^blend_dirt#/), DIRT)).toBe(false);
    for (const k of keys(/^(blend_sand|wet)#/)) expect(tile(ts, k), k).toEqual(tile(DEFAULT, k));

    const e = overrideDir();
    png(join(e, "fills", "sand.png"), () => [150, 150, 160, 255]);
    png(join(e, "fills", "sand2.png"), () => [150, 150, 160, 255]);
    ts = buildTileset(e);
    expect(anyOf(DEFAULT, keys(/^(blend_sand|wet)#/), SAND)).toBe(true);
    expect(anyOf(ts, keys(/^(blend_sand|wet)#/), SAND)).toBe(false);
    for (const k of keys(/^blend_dirt#/)) expect(tile(ts, k), k).toEqual(tile(DEFAULT, k));
    // the shore foam is water, not sand: it keeps its colour
    expect(tile(ts, "wet#4").some((px) => px.slice(0, 3).join() === rgb(V.cream))).toBe(true);
  });

  it("the contact shadow under the fringe follows its own family's fill", () => {
    const d = overrideDir();
    png(join(d, "fills", "cobble.png"), () => [90, 100, 140, 255]);
    const ts = buildTileset(d);
    expect(tile(ts, "cobble#1").some((px) => px.slice(0, 3).join() === rgb("#968d80"))).toBe(false);
    expect(tile(ts, "cobble2#1")).toEqual(tile(DEFAULT, "cobble2#1"));
  });

  it("a per-key tile override still wins over a recoloured tile", () => {
    const d = overrideDir();
    for (let v = 0; v < 8; v++) png(join(d, "fills", `grass~${v}.png`), GOLD(v));
    png(join(d, "tiles", "grass_clump.png"), () => [1, 2, 3, 255]);
    const ts = buildTileset(d);
    expect(new Set(tile(ts, "grass_clump").map((px) => px.join()))).toEqual(new Set(["1,2,3,255"]));
  });
});
