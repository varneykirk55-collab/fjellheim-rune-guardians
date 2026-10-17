// Painted ground fills (tools/gen/overrides/fills): one 16x16 texture per
// family rebuilds the base tile and all of its edge tiles through the
// generator's own masks and grass fringe; per-key tile overrides still win.
import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { buildTileset } from "../tools/gen/tiles.mjs";
import { loadFills, seamScore, FILL_KEYS } from "../tools/gen/overrides.mjs";
import { Pix, parseColor } from "../tools/gen/pix.mjs";
import { V } from "../tools/gen/village-palette.mjs";

/** a generated ramp colour carried onto a painted colour: painted * colour / base, per channel */
function shade(painted, colour, base) {
  const c = parseColor(colour);
  const b = parseColor(base);
  return [0, 1, 2].map((i) => Math.min(255, Math.round((painted[i] * c[i]) / b[i]))).concat(255).join();
}

const dirs = [];
function overrideDir() {
  const d = mkdtempSync(join(tmpdir(), "fjell-fill-"));
  mkdirSync(join(d, "fills"));
  mkdirSync(join(d, "tiles"));
  dirs.push(d);
  return d;
}
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

/** write a PNG whose pixel colour is f(x, y) */
function png(path, w, h, f) {
  const p = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.data.set(f(x, y), (y * w + x) * 4);
  writeFileSync(path, PNG.sync.write(p));
}
const solid = (rgba) => () => rgba;

// the reference atlas is generated from an empty overrides folder, so installed fills never leak into it
const DEFAULT = buildTileset(overrideDir());
const tileOf = (ts, key) => {
  const i = ts.layout[key];
  const ox = (i % ts.cols) * 16;
  const oy = ((i / ts.cols) | 0) * 16;
  return (x, y) => ts.pix.get(ox + x, oy + y);
};
const pixels = (ts, key) => {
  const t = tileOf(ts, key);
  const out = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) out.push(t(x, y).join());
  return out;
};
const EDGE_KEYS = (fam) => {
  const keys = [];
  for (let m = 0; m < 16; m++) for (let prof = 0; prof < 3; prof++) keys.push(prof ? `${fam}#${m}~${prof}` : `${fam}#${m}`);
  return keys;
};

describe("ground fills", () => {
  it("accepts exactly the fourteen fill names", () => {
    expect(FILL_KEYS).toEqual(["grass~0", "grass~1", "grass~2", "grass~3", "grass~4", "grass~5", "grass~6", "grass~7", "path", "path2", "sand", "sand2", "cobble", "cobble2"]);
    for (const k of FILL_KEYS) expect(DEFAULT.layout[k], k).toBeDefined();
  });

  it("with no fills the atlas is unchanged", () => {
    const d = overrideDir();
    const ts = buildTileset(d);
    expect(ts.fills).toEqual([]);
    expect(Buffer.from(ts.pix.d).equals(Buffer.from(DEFAULT.pix.d))).toBe(true);
    expect(ts.layout).toEqual(DEFAULT.layout);
  });

  it("a fill identical to the generated texture rebuilds all 49 keys byte for byte", () => {
    const d = overrideDir();
    const gen = tileOf(DEFAULT, "sand");
    png(join(d, "fills", "sand.png"), 16, 16, (x, y) => gen(x, y));
    const ts = buildTileset(d);
    for (const k of ["sand", ...EDGE_KEYS("sand")]) expect(pixels(ts, k), k).toEqual(pixels(DEFAULT, k));
  });

  it("a fill drives the base and every edge tile; the fringe keeps its shape", () => {
    // build with two different fills: pixels that follow the fill are texture
    // or the grass's contact shadow (scaled from the fill); everything else
    // (the grass fringe) must be the generated art
    const A = [200, 40, 160, 255];
    const B = [30, 220, 90, 255];
    const da = overrideDir();
    const db = overrideDir();
    png(join(da, "fills", "path.png"), 16, 16, solid(A));
    png(join(db, "fills", "path.png"), 16, 16, solid(B));
    const ta = buildTileset(da);
    const tb = buildTileset(db);
    expect(new Set(pixels(ta, "path"))).toEqual(new Set([A.join()]));
    expect(new Set(pixels(ta, "path#0"))).toEqual(new Set([A.join()]));
    for (const k of EDGE_KEYS("path").filter((k) => !k.startsWith("path#0"))) {
      const pa = pixels(ta, k);
      const pb = pixels(tb, k);
      const was = pixels(DEFAULT, k);
      let texture = 0;
      pa.forEach((px, i) => {
        if (px !== pb[i]) {
          if (px === A.join()) texture++;
          else expect(px, `${k} shadow ${i}`).toBe(shade(A, V.d2, V.d3));
          expect(pb[i], `${k} pixel ${i}`).toBe(px === A.join() ? B.join() : shade(B, V.d2, V.d3));
        } else expect(px, `${k} pixel ${i}`).toBe(was[i]);
      });
      expect(texture, k).toBeGreaterThan(0);
      expect(texture, k).toBeLessThan(256);
    }
    // the other families are untouched
    for (const k of ["path2", "path2#5~1", "sand#3", "cobble#12~2", "grass~0"]) expect(pixels(ta, k), k).toEqual(pixels(DEFAULT, k));
  });

  it("a grass fill replaces its variant and recolours the grass fringe", () => {
    const d = overrideDir();
    const C = [90, 140, 200, 255];
    png(join(d, "fills", "grass~0.png"), 16, 16, solid(C));
    const ts = buildTileset(d);
    expect(new Set(pixels(ts, "grass~0"))).toEqual(new Set([C.join()]));
    expect(pixels(ts, "grass~1")).toEqual(pixels(DEFAULT, "grass~1"));
    // path#15: the fringe pixels that were plain grass (V.g3) take the fill colour exactly,
    // the lips keep their light; terrain pixels are untouched
    const now = pixels(ts, "path#15");
    const was = pixels(DEFAULT, "path#15");
    const base = pixels(DEFAULT, "path");
    const G3 = [0x68, 0xb0, 0x52, 255].join();
    let body = 0;
    let lips = 0;
    was.forEach((px, i) => {
      if (px === G3) {
        expect(now[i]).toBe(C.join());
        body++;
      } else if (px !== base[i]) {
        if (now[i] !== px) lips++;
      } else expect(now[i]).toBe(px);
    });
    expect(body).toBeGreaterThan(0);
    expect(lips).toBeGreaterThan(0);
  });

  it("per-key tile overrides win over fills", () => {
    const d = overrideDir();
    png(join(d, "fills", "cobble.png"), 16, 16, solid([10, 20, 30, 255]));
    png(join(d, "tiles", "cobble#5~1.png"), 16, 16, solid([250, 250, 0, 255]));
    const ts = buildTileset(d);
    expect(new Set(pixels(ts, "cobble#5~1"))).toEqual(new Set(["250,250,0,255"]));
    expect(pixels(ts, "cobble#5")).toContain("10,20,30,255");
    expect(ts.overridden).toEqual(["cobble#5~1"]);
  });

  it("refuses unknown names, wrong sizes and transparency", () => {
    let d = overrideDir();
    png(join(d, "fills", "grass.png"), 16, 16, solid([0, 0, 0, 255]));
    expect(() => loadFills(d)).toThrow(/grass\.png is not a fill key/);
    d = overrideDir();
    png(join(d, "fills", "grass~8.png"), 16, 16, solid([0, 0, 0, 255]));
    expect(() => loadFills(d)).toThrow(/not a fill key/);
    d = overrideDir();
    png(join(d, "fills", "sand.png"), 16, 15, solid([0, 0, 0, 255]));
    expect(() => loadFills(d)).toThrow(/16x15, expected 16x16/);
    d = overrideDir();
    png(join(d, "fills", "sand.png"), 16, 16, (x, y) => [0, 0, 0, x === 3 && y === 7 ? 128 : 255]);
    expect(() => loadFills(d)).toThrow(/not opaque \(alpha 128 at 3,7\)/);
  });

  it("scores the wraparound seam and warns instead of failing", () => {
    // a horizontal ramp: smooth inside, a hard jump where the right edge meets the left
    const ramp = (x) => [40 + x * 10, 80, 40, 255];
    const d = overrideDir();
    png(join(d, "fills", "path.png"), 16, 16, (x) => ramp(x));
    png(join(d, "fills", "path2.png"), 16, 16, solid([120, 90, 60, 255]));
    const { fills, reports } = loadFills(d);
    expect(Object.keys(fills).sort()).toEqual(["path", "path2"]);
    const path = reports.find((r) => r.key === "path");
    expect(path.seam.lr).toBe(50);
    expect(path.seam.tb).toBe(0);
    expect(path.seam.score).toBeGreaterThan(2);
    expect(path.warnings.join()).toMatch(/visible seam/);
    expect(reports.find((r) => r.key === "path2").warnings).toEqual([]);
    // a seam warning never stops the build
    expect(() => buildTileset(d)).not.toThrow();
  });

  it("generated textures pass their own seam check", () => {
    for (const k of FILL_KEYS) {
      const t = tileOf(DEFAULT, k);
      const p = new Pix(16, 16);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, t(x, y));
      expect(seamScore(p).score, k).toBeLessThanOrEqual(2);
    }
  });

  it("warns when only one of an alternating pair has a fill", () => {
    const d = overrideDir();
    png(join(d, "fills", "sand.png"), 16, 16, solid([200, 180, 120, 255]));
    const { reports } = loadFills(d);
    expect(reports[0].warnings.join()).toMatch(/sand2 has no fill/);
  });

  it("fills last only for the build that loaded them", () => {
    const d = overrideDir();
    png(join(d, "fills", "path.png"), 16, 16, solid([1, 2, 3, 255]));
    buildTileset(d);
    expect(Buffer.from(buildTileset(overrideDir()).pix.d).equals(Buffer.from(DEFAULT.pix.d))).toBe(true);
  });
});
