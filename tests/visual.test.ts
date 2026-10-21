// Render-only map visuals (src/data/maps/visual.ts): decorations sit on an
// overlay with inferred ground, ground families pick edge variants, cliffs pick
// face/plateau roles - and none of it may change collision.
import { describe, it, expect } from "vitest";
import { MAPS } from "../src/data/maps";
import { buildVisuals, isDeco, N, E, S, W } from "../src/data/maps/visual";
import { tileMeta } from "../src/data/maps/collision";
import { ASSET_LAYOUT } from "../src/assets/layout";

const TILES = ASSET_LAYOUT.tiles as Record<string, number>;
const has = (k: string) => TILES[k] !== undefined;

describe("map visuals", () => {
  it("every cell of every map resolves to tiles that exist in the atlas", () => {
    for (const m of Object.values(MAPS)) {
      const v = buildVisuals(m, has);
      v.forEach((row, y) =>
        row.forEach((c, x) => {
          expect(has(c.ground), `${m.id} ${x},${y} ground ${c.ground}`).toBe(true);
          expect(isDeco(c.ground), `${m.id} ${x},${y} ground is a decoration`).toBe(false);
          if (c.deco) expect(has(c.deco), `${m.id} ${x},${y} deco ${c.deco}`).toBe(true);
        }),
      );
    }
  });

  it("decorations get the ground of their surroundings (no baked grass squares)", () => {
    const v = buildVisuals(MAPS.village, has);
    // reeds on the shore sit on sand; fence posts at the plaza edge are decorations
    expect(v[29][6].deco).toBe("reeds");
    expect(v[29][6].ground.startsWith("sand")).toBe(true);
    expect(v[21][20].deco?.startsWith("fence_post")).toBe(true);
    // dock posts stand in the water
    expect(v[34][12].ground.startsWith("water")).toBe(true);
  });

  it("paths fringe onto grass with the right edge mask", () => {
    const v = buildVisuals(MAPS.village, has);
    // the vertical path below the player's house door (col 9): grass on both sides
    // pattern (path/path2) and edge profile (~1, ~2) vary by position; the mask must not
    expect(v[15][9].ground).toMatch(new RegExp(`^path2?#${E | W}(~[12])?$`));
  });

  it("cliffs: two face rows at the south edge of the mass, plateau above", () => {
    const v = buildVisuals(MAPS.village, has);
    expect(v[3][40].ground).toBe("cliff_base#0");
    expect(v[2][40].ground).toBe("cliff_upper#0");
    expect(v[1][40].ground).toBe("cliff_top#0");
    // the west wall shows a rim toward the village
    expect(v[10][1].ground).toBe(`cliff_top#${E}`);
  });

  it("water foams only where it meets land", () => {
    const v = buildVisuals(MAPS.village, has);
    expect(v[30][30].ground).toBe(`water#${N}`); // shore line under the sand
    expect(v[33][30].ground).toBe("water#0"); // open sea
    void S;
  });

  it("the art pass keeps every tile's collision flag", () => {
    const solid = ["water", "shore_water", "cliff_top", "cliff_face", "cliff_face_grass", "fence_h", "fence_v", "fence_post", "sign", "well", "bonfire", "dock_post"];
    const open = ["grass", "grass2", "grass3", "meadow", "path", "path2", "sand", "sand2", "cobble", "cobble2", "dock", "flowers_r", "flowers_w", "tuft", "reeds"];
    for (const k of solid) expect(tileMeta(k)?.solid, k).toBe(true);
    for (const k of open) expect(tileMeta(k)?.solid, k).toBe(false);
  });
});
