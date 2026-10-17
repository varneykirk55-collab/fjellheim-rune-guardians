// The approved Nordic house (art/approved/ -> tools/gen/art/nordic_house.png):
// a clean transparent asset whose collision footprint and door match its art.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { MAPS } from "../src/data/maps";
import { buildSolidGrid, tileKeyAt } from "../src/data/maps/collision";

const png = PNG.sync.read(readFileSync(new URL("../public/assets/nordic_house.png", import.meta.url)));
const src = PNG.sync.read(readFileSync(new URL("../tools/gen/art/nordic_house.png", import.meta.url)));
const village = MAPS.village;
const house = village.buildings.find((b) => b.asset === "nordic_house");
const alpha = (x, y) => png.data[(y * png.width + x) * 4 + 3];
/** share of opaque pixels inside one 16x16 tile of the image */
const cover = (tx, ty) => {
  let n = 0;
  for (let y = ty * 16; y < ty * 16 + 16; y++) for (let x = tx * 16; x < tx * 16 + 16; x++) if (alpha(x, y)) n++;
  return n / 256;
};

describe("approved Nordic house", () => {
  it("ships unchanged from the recovered art, 160x96 with hard-edged transparency", () => {
    expect([png.width, png.height]).toEqual([160, 96]);
    expect(Buffer.compare(png.data, src.data)).toBe(0);
    const alphas = new Set();
    for (let i = 3; i < png.data.length; i += 4) alphas.add(png.data[i]);
    expect([...alphas].sort((a, b) => a - b)).toEqual([0, 255]);
  });

  it("replaces the old player house in Bjorvik", () => {
    expect(house).toBeDefined();
    expect(village.buildings.some((b) => b.asset === "house_player")).toBe(false);
  });

  it("blocks exactly the wall tiles: every solid tile shows the house, every well-covered tile is solid", () => {
    const solid = buildSolidGrid(village);
    const W = village.grid[0].length;
    const inFoot = (tx, ty) => tx >= house.solidX && tx < house.solidX + house.solidW && ty >= house.solidY && ty < house.solidY + house.solidH;
    for (let ty = 0; ty < png.height / 16; ty++)
      for (let tx = 0; tx < png.width / 16; tx++) {
        const isSolid = solid[(house.y + ty) * W + house.x + tx] === 1;
        const c = cover(tx, ty);
        if (inFoot(tx, ty)) {
          expect(isSolid, `tile ${tx},${ty}`).toBe(true);
          expect(c, `solid tile ${tx},${ty} is drawn`).toBeGreaterThan(0.5);
        }
        if (c > 0.9) expect(inFoot(tx, ty), `covered tile ${tx},${ty} must block`).toBe(true);
      }
    // the transparent padding column and the sparse roof line stay walkable
    expect(solid[(house.y + 5) * W + house.x]).toBe(0);
    expect(solid[house.y * W + house.x + 4]).toBe(0);
  });

  it("the doorstep sits right below the doorway, on the path, and is walkable", () => {
    const meta = JSON.parse(readFileSync(new URL("../src/assets/layout.ts", import.meta.url), "utf8").replace(/^[\s\S]*?=\s*/, "").replace(/ as const;[\s\S]*$/, "")).objects.nordic_house;
    const doorTileX = house.x + Math.floor(meta.door.x / 16);
    expect(house.door.x).toBe(doorTileX);
    expect(house.door.y).toBe(house.y + house.solidY + house.solidH);
    expect(house.y * 16 + meta.door.y).toBe(house.door.y * 16 - 1); // sill on the last pixel row above the doorstep
    // the doorway art: dark door frame at the door column, opaque down to the sill
    expect(alpha(meta.door.x, meta.door.y)).toBe(255);
    const solid = buildSolidGrid(village);
    const W = village.grid[0].length;
    expect(solid[house.door.y * W + house.door.x]).toBe(0);
    expect(tileKeyAt(village, house.door.x, house.door.y)).toBe("path");
    expect(tileKeyAt(village, house.door.x, house.door.y + 1)).toBe("path");
  });
});
