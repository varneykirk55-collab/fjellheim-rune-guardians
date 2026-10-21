// Hand-painted overrides (tools/gen/overrides.mjs): a painted PNG replaces the
// generated art only when its size matches and its key exists.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { loadOverride, checkOverrideKeys } from "../tools/gen/overrides.mjs";

let dir = "";
function png(path, w, h, rgba) {
  const p = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) p.data.set(rgba, i * 4);
  writeFileSync(path, PNG.sync.write(p));
}

describe("art overrides", () => {
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "fjell-ovr-"));
    mkdirSync(join(dir, "tiles"));
    mkdirSync(join(dir, "objects"));
    png(join(dir, "tiles", "floor@home~0.png"), 16, 16, [200, 100, 50, 255]);
    png(join(dir, "objects", "chest.png"), 16, 12, [0, 0, 0, 255]);
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("uses a painted file of the right size, pixel for pixel", () => {
    const p = loadOverride("tiles", "floor@home~0", 16, 16, dir);
    expect(p).not.toBeNull();
    expect(Array.from(p.get(5, 5))).toEqual([200, 100, 50, 255]);
  });

  it("returns null when nothing was painted", () => {
    expect(loadOverride("tiles", "floor@home~1", 16, 16, dir)).toBeNull();
  });

  it("refuses a file whose size would change footprints", () => {
    expect(() => loadOverride("objects", "chest", 16, 16, dir)).toThrow(/16x12, expected 16x16/);
  });

  it("refuses files that match no generated key", () => {
    expect(checkOverrideKeys("tiles", ["floor@home~0"], dir)).toEqual(["floor@home~0"]);
    expect(() => checkOverrideKeys("objects", ["barrel"], dir)).toThrow(/chest.png/);
  });
});
