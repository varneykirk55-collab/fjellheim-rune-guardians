// Hand-placed village scenery (MapDef.objects / MapDef.decor) must never get in
// the way of play: no blocking on paths, doors, warps, NPCs or story triggers.
// Route connectivity itself is covered by world-reachability.test.ts, which
// already includes object footprints through buildSolidGrid.
import { describe, it, expect } from "vitest";
import { MAPS } from "../src/data/maps";
import { buildSolidGrid, objectFootprint, objectMeta, tileKeyAt, tileMeta } from "../src/data/maps/collision";
import { STORY_EVENTS } from "../src/data/story";

const key = (x: number, y: number) => `${x},${y}`;

describe("village composition", () => {
  for (const m of Object.values(MAPS)) {
    if (!m.objects?.length && !m.decor?.length) continue;

    it(`${m.id}: objects use real assets and stay in bounds`, () => {
      for (const o of m.objects ?? []) {
        expect(() => objectMeta(o.asset), o.asset).not.toThrow();
        for (const t of objectFootprint(o)) {
          expect(t.x >= 0 && t.y >= 0 && t.x < m.grid[0].length && t.y < m.grid.length, `${o.asset} at ${key(t.x, t.y)}`).toBe(true);
        }
      }
    });

    it(`${m.id}: objects never block paths, doors, warps, NPCs or story triggers`, () => {
      const forbidden = new Map<string, string>();
      const ban = (x: number, y: number, why: string) => forbidden.set(key(x, y), why);
      for (let y = 0; y < m.grid.length; y++)
        for (let x = 0; x < m.grid[0].length; x++) {
          const k = tileKeyAt(m, x, y);
          if (k === "path" || k === "path2") ban(x, y, "path");
        }
      for (const b of m.buildings) if (b.door) {
        ban(b.door.x, b.door.y, "door");
        ban(b.door.x, b.door.y + 1, "door approach");
      }
      for (const w of m.warps) ban(w.x, w.y, "warp");
      for (const n of m.npcs) {
        ban(n.x, n.y, `npc ${n.id}`);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ban(n.x + dx, n.y + dy, `beside npc ${n.id}`);
      }
      for (const s of m.signs) ban(s.x, s.y + 1, "sign reading spot");
      for (const ev of STORY_EVENTS) {
        if (ev.map !== m.id || ev.trigger.type !== "step") continue;
        const t = ev.trigger;
        for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) ban(x, y, `story ${ev.id}`);
      }
      // nothing may sit on another object, building or prop footprint
      const baseSolid = buildSolidGrid({ ...m, objects: [] });
      const W = m.grid[0].length;
      const taken = new Set<string>();
      for (const o of m.objects ?? []) {
        for (const t of objectFootprint(o)) {
          const k = key(t.x, t.y);
          expect(forbidden.get(k), `${o.asset} at ${key(o.x, o.y)} blocks ${forbidden.get(k)} (${k})`).toBeUndefined();
          expect(baseSolid[t.y * W + t.x], `${o.asset} at ${k} overlaps existing solid scenery`).toBe(0);
          expect(taken.has(k), `${o.asset} overlaps another object at ${k}`).toBe(false);
          taken.add(k);
        }
      }
    });

    it(`${m.id}: decor is non-blocking and sits on open ground`, () => {
      const solid = buildSolidGrid(m);
      const W = m.grid[0].length;
      const seen = new Set<string>();
      for (const d of m.decor ?? []) {
        const meta = tileMeta(d.key);
        expect(meta?.deco, `${d.key} is a decoration tile`).toBe(true);
        expect(meta?.solid, `${d.key} must not block`).toBe(false);
        expect(solid[d.y * W + d.x], `decor ${d.key} at ${key(d.x, d.y)} sits on a blocked tile`).toBe(0);
        const ground = tileKeyAt(m, d.x, d.y) ?? "";
        expect(["grass", "grass2", "grass3", "meadow", "sand", "sand2"].includes(ground), `decor ${d.key} at ${key(d.x, d.y)} on ${ground}`).toBe(true);
        expect(seen.has(key(d.x, d.y)), `two decorations at ${key(d.x, d.y)}`).toBe(false);
        seen.add(key(d.x, d.y));
      }
    });
  }
});
