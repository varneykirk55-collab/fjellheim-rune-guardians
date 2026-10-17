// Interior art pass: rooms render with their own materials, wall faces and
// furniture overlays, without changing what blocks movement.
import { describe, it, expect } from "vitest";
import { MAPS } from "../src/data/maps";
import { buildVisuals, isDeco } from "../src/data/maps/visual";
import { buildSolidGrid, objectMeta, tileMeta } from "../src/data/maps/collision";
import { INDOOR_LEGEND } from "../src/data/maps/legend";
import { ASSET_LAYOUT } from "../src/assets/layout";

const TILES = ASSET_LAYOUT.tiles as Record<string, number>;
const has = (k: string) => TILES[k] !== undefined;
const ROOMS = Object.values(MAPS).filter((m) => m.indoors);

/** gameplay solidity of each room legend key - fixed before the art pass */
const SOLID: Record<string, boolean> = {
  boards: false,
  boards2: false,
  wall_int: true,
  wall_int_banner: true,
  counter: true,
  table: true,
  stool: true,
  shelf: true,
  bookshelf: true,
  hearth: true,
  bed_top: true,
  bed_bot: true,
  crate: true,
  barrel: true,
  pot: true,
  door_int: false,
  stairs: false,
  heal_rune: false,
  rug_l: false,
  rug_m: false,
  rug_r: false,
};

describe("interiors", () => {
  it("every room legend key keeps its collision", () => {
    for (const key of Object.values(INDOOR_LEGEND)) {
      expect(SOLID[key], `${key} is listed`).toBeDefined();
      expect(!!tileMeta(key)?.solid, key).toBe(SOLID[key]);
    }
  });

  it("all six rooms are covered and each has its own floor and wall art", () => {
    expect(ROOMS.map((m) => m.id).sort()).toEqual(["heal", "home", "houseA", "houseB", "seer", "shop"]);
    const looks = new Set<string>();
    for (const m of ROOMS) {
      const v = buildVisuals(m, has);
      const floor = v[m.grid.length - 2][1].ground;
      const wall = v[1][1].ground;
      expect(floor.startsWith(`floor@${m.id}~`), `${m.id} floor ${floor}`).toBe(true);
      expect(wall.startsWith(`wall_lo@${m.id}~`), `${m.id} wall ${wall}`).toBe(true);
      looks.add(floor.split("~")[0] + wall.split("~")[0]);
    }
    expect(looks.size).toBe(ROOMS.length);
  });

  it("the north wall is a two-tile face; side and bottom walls are beam tops", () => {
    for (const m of ROOMS) {
      const v = buildVisuals(m, has);
      const w = m.grid[0].length;
      const h = m.grid.length;
      for (let x = 1; x < w - 1; x++) {
        expect(v[0][x].ground.startsWith("wall_hi@"), `${m.id} ${x},0 ${v[0][x].ground}`).toBe(true);
        const lo = v[1][x].ground;
        expect(lo.startsWith("wall_lo@") || lo === "hearth_wall", `${m.id} ${x},1 ${lo}`).toBe(true);
      }
      for (let y = 0; y < h; y++) {
        expect(v[y][0].ground.startsWith("wall_top#"), `${m.id} 0,${y}`).toBe(true);
        expect(v[y][w - 1].ground.startsWith("wall_top#"), `${m.id} ${w - 1},${y}`).toBe(true);
      }
      // floor cells under the north wall get its shadow
      expect(v[2][3].edge?.startsWith("fshade#"), `${m.id} wall shadow`).toBe(true);
    }
  });

  it("furniture draws on the decoration layer over floor, and tall pieces rise into the wall", () => {
    for (const m of ROOMS) {
      const v = buildVisuals(m, has);
      m.grid.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          const key = m.legend[ch];
          const c = v[y][x];
          if (key === "shelf" || key === "bookshelf") expect(c.deco && v[y - 1][x].deco?.startsWith(`${key}_top`), `${m.id} ${key} top at ${x},${y - 1}`).toBeTruthy();
          if (["table", "stool", "bed_top", "bed_bot", "barrel", "crate", "pot", "counter", "rug_l", "rug_m", "rug_r", "heal_rune"].includes(key)) {
            expect(c.deco, `${m.id} ${key} at ${x},${y}`).toBeTruthy();
            expect(isDeco(c.deco), `${c.deco} is a decoration tile`).toBe(true);
            expect(c.ground.startsWith("floor@"), `${m.id} ${key} at ${x},${y} sits on ${c.ground}`).toBe(true);
            // the art key may differ per room, but must block exactly like the legend key
            expect(!!tileMeta(c.deco!)?.solid, `${c.deco} solidity`).toBe(SOLID[key]);
          }
        }),
      );
    }
  });

  it("hearths: a fireplace in the wall, an open fire pit on the floor", () => {
    expect(buildVisuals(MAPS.home, has)[1][6].ground).toBe("hearth_wall");
    expect(buildVisuals(MAPS.home, has)[0][6].deco).toBe("hearth_top");
    const seer = buildVisuals(MAPS.seer, has)[4][14];
    expect(seer.deco).toBe("hearth");
    expect(seer.ground.startsWith("floor@seer")).toBe(true);
  });

  it("wall hangings and light pools never block; floor furniture stays off the walls", () => {
    for (const m of ROOMS) {
      const tiles = buildSolidGrid({ ...m, objects: [] });
      const W = m.grid[0].length;
      for (const o of m.objects ?? []) {
        const meta = objectMeta(o.asset);
        if (o.asset.startsWith("light_")) {
          expect(o.solid, `${m.id} ${o.asset}`).toBe(false);
          expect(o.layer).toBe("floor");
          expect(o.blend).toBe("add");
          continue;
        }
        const onWall = tiles[o.y * W + o.x] === 1 && o.y <= 1;
        if (onWall) {
          expect(o.solid, `${m.id} ${o.asset} on the wall must be solid: false`).toBe(false);
          expect(meta.h, `${o.asset} spans the two-tile wall face`).toBe(32);
        } else {
          expect(o.solid, `${m.id} ${o.asset} on the floor blocks like furniture`).not.toBe(false);
        }
      }
    }
  });

  it("arrival tiles and the step inside each door stay clear", () => {
    for (const m of ROOMS) {
      const solid = buildSolidGrid(m);
      const W = m.grid[0].length;
      const spots = m.warps.map((w) => ({ x: w.x, y: w.y - 1 }));
      for (const other of Object.values(MAPS))
        for (const b of other.buildings) if (b.door?.to.map === m.id) spots.push({ x: b.door.to.x, y: b.door.to.y });
      for (const s of spots) expect(solid[s.y * W + s.x], `${m.id} ${s.x},${s.y}`).toBe(0);
    }
  });
});
