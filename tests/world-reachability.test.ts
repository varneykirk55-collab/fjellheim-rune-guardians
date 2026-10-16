// Reachability tests over the real collision grid (tiles + building
// footprints + solid props + NPCs), mirroring WorldScene movement rules:
// 4-way steps, out-of-bounds is solid, stepping onto a warp/door teleports.
import { describe, it, expect } from "vitest";
import { MAPS, MapDef } from "../src/data/maps";
import { buildSolidGrid, tileKeyAt } from "../src/data/maps/collision";
import { STORY_EVENTS } from "../src/data/story";
import { newGameState } from "../src/core/save";

type P = { x: number; y: number };
const key = (p: P) => `${p.x},${p.y}`;
const DIRS: P[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

function exits(m: MapDef): { at: P; to: string }[] {
  return [
    ...m.warps.map((w) => ({ at: { x: w.x, y: w.y }, to: w.to.map })),
    ...m.buildings.filter((b) => b.door).map((b) => ({ at: { x: b.door!.x, y: b.door!.y }, to: b.door!.to.map })),
  ];
}

function blockedFn(m: MapDef) {
  const solid = buildSolidGrid(m);
  const w = m.grid[0].length;
  const h = m.grid.length;
  // every NPC blocks its tile (worst case: flag-hidden NPCs counted as present)
  const npc = new Set(m.npcs.map((n) => key(n)));
  return (p: P) => p.x < 0 || p.y < 0 || p.x >= w || p.y >= h || solid[p.y * w + p.x] === 1 || npc.has(key(p));
}

/** tiles the player can stand on starting from `start`; warp tiles are reached but not walked through */
function reachable(m: MapDef, start: P): { stand: Set<string>; exitsHit: Set<string> } {
  const blocked = blockedFn(m);
  const warpTiles = new Set(exits(m).map((e) => key(e.at)));
  const stand = new Set([key(start)]);
  const exitsHit = new Set<string>();
  const queue: P[] = [start];
  while (queue.length) {
    const p = queue.shift()!;
    for (const d of DIRS) {
      const n = { x: p.x + d.x, y: p.y + d.y };
      if (blocked(n)) continue;
      if (warpTiles.has(key(n))) {
        exitsHit.add(key(n));
        continue;
      }
      if (stand.has(key(n))) continue;
      stand.add(key(n));
      queue.push(n);
    }
  }
  return { stand, exitsHit };
}

/** every place the game can put the player on a map */
function arrivals(): { map: string; at: P; why: string }[] {
  const list: { map: string; at: P; why: string }[] = [];
  for (const [id, m] of Object.entries(MAPS)) {
    for (const w of m.warps) list.push({ map: w.to.map, at: w.to, why: `warp from ${id}` });
    for (const b of m.buildings) if (b.door) list.push({ map: b.door.to.map, at: b.door.to, why: `door from ${id}` });
  }
  const s = newGameState("T", "eirik");
  list.push({ map: s.pos.map, at: s.pos, why: "new game" });
  list.push({ map: "heal", at: { x: 5, y: 6 }, why: "blackout" });
  for (const ev of STORY_EVENTS)
    for (const st of ev.steps) if ("movePlayer" in st) list.push({ map: ev.map, at: st.movePlayer, why: `story ${ev.id}` });
  return list;
}

describe("world reachability", () => {
  it("every arrival point is standable and not itself an exit", () => {
    for (const a of arrivals()) {
      const m = MAPS[a.map];
      expect(blockedFn(m)(a.at), `${a.why} lands on a blocked tile ${key(a.at)} in ${a.map}`).toBe(false);
      expect(exits(m).some((e) => key(e.at) === key(a.at)), `${a.why} lands on an exit in ${a.map}`).toBe(false);
    }
  });

  it("from every arrival point, every exit of that map can be reached", () => {
    for (const a of arrivals()) {
      const m = MAPS[a.map];
      const { exitsHit } = reachable(m, a.at);
      for (const e of exits(m)) {
        expect(exitsHit.has(key(e.at)), `${a.map}: exit ${key(e.at)} -> ${e.to} unreachable from ${a.why} ${key(a.at)}`).toBe(true);
      }
    }
  });

  it("every NPC and sign can be faced from a reachable tile (counters can be talked across)", () => {
    for (const a of arrivals()) {
      const m = MAPS[a.map];
      const { stand } = reachable(m, a.at);
      const canFace = (t: P) =>
        DIRS.some((d) => {
          if (stand.has(key({ x: t.x - d.x, y: t.y - d.y }))) return true;
          const mid = { x: t.x - d.x, y: t.y - d.y };
          return tileKeyAt(m, mid.x, mid.y) === "counter" && stand.has(key({ x: t.x - 2 * d.x, y: t.y - 2 * d.y }));
        });
      for (const n of m.npcs) expect(canFace(n), `${a.map}: npc ${n.id} cannot be talked to`).toBe(true);
      for (const s of m.signs) expect(canFace(s), `${a.map}: sign at ${key(s)} cannot be read`).toBe(true);
    }
  });

  it("signposts are drawn on the map, not invisible", () => {
    for (const m of Object.values(MAPS))
      for (const s of m.signs) expect(tileKeyAt(m, s.x, s.y), `${m.id}: sign at ${key(s)} has no sign tile`).toBe("sign");
  });

  it("story step triggers can be stepped on", () => {
    for (const ev of STORY_EVENTS) {
      if (ev.trigger.type !== "step") continue;
      const t = ev.trigger;
      const m = MAPS[ev.map];
      const starts = arrivals().filter((a) => a.map === ev.map);
      const hit = starts.some((a) => {
        const { stand } = reachable(m, a.at);
        for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) if (stand.has(key({ x, y }))) return true;
        return false;
      });
      expect(hit, `story ${ev.id} trigger region never reachable`).toBe(true);
    }
  });

  it("the route north is gated until a starter is chosen (no battle with an empty party)", () => {
    const gate = STORY_EVENTS.find((e) => e.map === "village" && e.when?.not === "starter" && e.trigger.type === "step");
    expect(gate, "village gate event").toBeTruthy();
    const t = gate!.trigger as { x: number; y: number; w: number; h: number };
    const village = MAPS.village;
    const inGate = (p: P) => p.x >= t.x && p.x < t.x + t.w && p.y >= t.y && p.y < t.y + t.h;
    const routeWarp = village.warps.find((w) => w.to.map === "route1")!;
    // with the gate tiles treated as walls, the route warp must be unreachable from the house
    const blocked = blockedFn(village);
    const start = MAPS.home.warps[0].to;
    const seen = new Set([key(start)]);
    const queue: P[] = [start];
    let reached = false;
    while (queue.length) {
      const p = queue.shift()!;
      for (const d of DIRS) {
        const n = { x: p.x + d.x, y: p.y + d.y };
        if (blocked(n) || inGate(n) || seen.has(key(n))) continue;
        if (n.x === routeWarp.x && n.y === routeWarp.y) reached = true;
        seen.add(key(n));
        queue.push(n);
      }
    }
    expect(reached).toBe(false);
    // and the push-back position is outside the gate
    const back = gate!.steps.find((s) => "movePlayer" in s) as { movePlayer: P } | undefined;
    expect(back && !inGate(back.movePlayer)).toBe(true);
  });

  it("story battles are always the last step of their script (empty-party guard relies on it)", () => {
    for (const ev of STORY_EVENTS) {
      const idx = ev.steps.findIndex((s) => "battle" in s);
      if (idx >= 0) expect(idx, `story ${ev.id}`).toBe(ev.steps.length - 1);
    }
  });
});
