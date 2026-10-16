import { describe, it, expect } from "vitest";
import {
  expAtLevel,
  movesForLevel,
  makeCreature,
  maxHpOf,
  gainExp,
  resolveLearnChoice,
  checkEvolution,
} from "../src/battle/progression";
import { SPECIES_INDEX, STARTERS } from "../src/data/species";
import { MOVE_INDEX } from "../src/data/moves";

describe("progression", () => {
  it("exp curves increase monotonically", () => {
    for (const growth of ["fast", "medium", "slow"] as const) {
      let prev = 0;
      for (let lv = 1; lv <= 100; lv++) {
        const e = expAtLevel(lv, growth);
        expect(e).toBeGreaterThanOrEqual(prev);
        prev = e;
      }
    }
  });

  it("movesForLevel returns <=4 unique known moves", () => {
    for (const id of Object.keys(SPECIES_INDEX)) {
      for (const lv of [1, 5, 10, 20, 40]) {
        const moves = movesForLevel(id, lv);
        expect(moves.length).toBeLessThanOrEqual(4);
        expect(moves.length).toBeGreaterThan(0);
        expect(new Set(moves.map((m) => m.id)).size).toBe(moves.length);
        for (const m of moves) expect(MOVE_INDEX[m.id]).toBeTruthy();
      }
    }
  });

  it("makeCreature builds a legal instance", () => {
    const c = makeCreature("embercub", 5);
    expect(c.speciesId).toBe("embercub");
    expect(c.level).toBe(5);
    expect(c.hp).toBe(maxHpOf(c));
    expect(c.exp).toBe(expAtLevel(5, SPECIES_INDEX["embercub"].growth));
    expect(c.status).toBeNull();
  });

  it("gainExp levels up and heals max-hp delta", () => {
    const c = makeCreature("embercub", 5);
    c.hp = 10;
    const before = c.level;
    const events = gainExp(c, expAtLevel(8, "medium") - expAtLevel(5, "medium") + 50);
    expect(c.level).toBeGreaterThan(before);
    expect(events.some((e) => e.t === "levelup")).toBe(true);
    expect(events[0].t).toBe("exp");
    expect(c.hp).toBeGreaterThan(10);
    expect(c.hp).toBeLessThanOrEqual(maxHpOf(c));
  });

  it("full move pool asks the UI instead of auto-learning", () => {
    const c = makeCreature("embercub", 30);
    while (c.moves.length < 4) c.moves.push({ id: "tackle", pp: 20 });
    const sp = SPECIES_INDEX["embercub"];
    const future = sp.learnset.find((e) => e.level > 30);
    if (future) {
      const events = gainExp(c, expAtLevel(future.level, sp.growth) - c.exp + 1);
      const learn = events.find((e) => e.t === "learn" && e.moveId === future.move);
      if (learn && learn.t === "learn") expect(learn.auto).toBe(false);
      // resolve by forgetting slot 0
      const n = c.moves.length;
      resolveLearnChoice(c, future.move, 0);
      expect(c.moves.length).toBe(n);
      expect(c.moves[0].id).toBe(future.move);
    }
    // cancel path leaves moves untouched
    const snapshot = c.moves.map((m) => m.id).join(",");
    resolveLearnChoice(c, "tackle", -1);
    expect(c.moves.map((m) => m.id).join(",")).toBe(snapshot);
  });

  it("starters evolve at their documented levels", () => {
    for (const id of STARTERS) {
      const sp = SPECIES_INDEX[id];
      expect(sp.evolvesTo).toBeTruthy();
      const c = makeCreature(id, sp.evolvesTo!.level);
      const events = checkEvolution(c);
      expect(events.length).toBeGreaterThan(0);
      expect(c.speciesId).toBe(sp.evolvesTo!.species);
      expect(events[0].t).toBe("evolveStart");
      expect(events[events.length - 1].t).toBe("evolveDone");
    }
  });

  it("does not evolve below level", () => {
    const c = makeCreature("embercub", 5);
    expect(checkEvolution(c)).toEqual([]);
    expect(c.speciesId).toBe("embercub");
  });
});
