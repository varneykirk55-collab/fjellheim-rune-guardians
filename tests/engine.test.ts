import { describe, it, expect } from "vitest";
import { Battle } from "../src/battle/engine";
import { makeCreature, maxHpOf, movesForLevel } from "../src/battle/progression";
import { BattleConfig, CreatureInstance } from "../src/battle/types";
import { MOVE_INDEX } from "../src/data/moves";
import { SPECIES_INDEX } from "../src/data/species";

function mk(speciesId: string, level: number, hp?: number, moveIds?: string[]): CreatureInstance {
  const c = makeCreature(speciesId, level);
  if (hp !== undefined) c.hp = hp;
  if (moveIds) c.moves = moveIds.map((id) => ({ id, pp: MOVE_INDEX[id].pp }));
  return c;
}

function wild(player: CreatureInstance[], enemy: CreatureInstance[], rng?: () => number): BattleConfig {
  return { kind: "wild", playerParty: player, enemyParty: enemy, background: "meadow", rng };
}

const firstMoveElement = (c: CreatureInstance) => MOVE_INDEX[c.moves[0].id].element;

describe("battle engine", () => {
  it("a damaging turn produces move + damage events and lowers hp", () => {
    const foe = mk("bergling", 10);
    const b = new Battle(wild([mk("embercub", 10)], [foe], () => 0.5));
    const ev = b.act({ kind: "move", index: 0 });
    expect(ev.some((e) => e.t === "move")).toBe(true);
    const start = maxHpOf(foe);
    // somebody lost hp (player hit, enemy may counter)
    const dmg = ev.filter((e) => e.t === "damage") as { amount: number; effectiveness: number }[];
    expect(dmg.length).toBeGreaterThan(0);
    for (const d of dmg) {
      if (d.effectiveness > 0) expect(d.amount).toBeGreaterThanOrEqual(1);
      else expect(d.amount).toBe(0);
    }
    expect(foe.hp + b.active("player").hp).toBeLessThan(start * 2 + 1);
    expect(b.over).toBeNull();
  });

  it("immunity deals zero damage (lightning vs earth)", () => {
    const earth = mk("bergling", 10, undefined, ["lunge"]);
    const bolt = mk("stormchick", 10);
    // force a pure-lightning first move
    const zap = Object.values(MOVE_INDEX).find((m) => m.element === "lightning" && m.power)!;
    bolt.moves = [{ id: zap.id, pp: zap.pp }, ...bolt.moves.slice(1, 3)];
    const b = new Battle(wild([bolt], [earth], () => 0.5));
    // make earth non-threatening so it cannot faint first
    earth.moves = [{ id: "lunge", pp: 20 }];
    const ev = b.act({ kind: "move", index: 0 });
    const hits = ev.filter((e) => e.t === "damage" && e.side === "enemy") as { effectiveness: number; amount: number }[];
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      expect(h.effectiveness).toBe(0);
      expect(h.amount).toBe(0);
    }
    expect(earth.hp).toBe(maxHpOf(earth));
  });

  it("switching changes the active creature", () => {
    const a = mk("embercub", 8);
    const c2 = mk("snowpup", 8);
    const b = new Battle(wild([a, c2], [mk("bergling", 8)], () => 0.9));
    b.act({ kind: "switch", index: 1 });
    expect(b.activeIndex("player")).toBe(1);
    expect(b.active("player").speciesId).toBe("snowpup");
  });

  it("wiping the player party ends in a loss", () => {
    const p = mk("stormchick", 2, 1);
    const b = new Battle(wild([p], [mk("bergreir", 30)], () => 0.5));
    for (let i = 0; i < 5 && !b.over; i++) b.act({ kind: "move", index: 0 });
    expect(b.over).toBe("lose");
  });

  it("trainer battle: defeating the last creature wins, earlier ones force a switch", () => {
    const t1 = mk("glodref", 3, 1);
    const t2 = mk("ormling", 3, 1);
    const player = mk("snowpup", 20);
    const b = new Battle({
      kind: "trainer",
      playerParty: [player],
      enemyParty: [t1, t2],
      background: "meadow",
      noCatch: true,
      rng: () => 0.5,
    });
    let guard = 0;
    while (!b.over && guard++ < 10) {
      if (b.awaitingSwitch === "player") b.sendOut(0);
      else b.act({ kind: "move", index: 0 });
    }
    expect(b.over).toBe("win");
    expect(guard).toBeLessThan(10);
  });

  it("run always succeeds when the player is faster; blocked with noRun", () => {
    const fast = mk("vindhare", 20);
    const b = new Battle(wild([fast], [mk("bergling", 2)], () => 0));
    const ev = b.act({ kind: "run" });
    expect(ev.some((e) => e.t === "runSuccess")).toBe(true);
    expect(b.over).toBe("run");

    const b2 = new Battle({ ...wild([mk("vindhare", 20)], [mk("bergling", 2)], () => 0), noRun: true });
    const ev2 = b2.act({ kind: "run" });
    expect(ev2.some((e) => e.t === "runSuccess")).toBe(false);
    expect(b2.over).toBeNull();
  });

  it("capture is guaranteed-ish only in the best case and can always fail otherwise", () => {
    // 1 HP + asleep + lucky rolls => capture
    const weak = mk("bergling", 5, 1);
    weak.status = "sleep";
    const b = new Battle(wild([mk("snowpup", 20)], [weak], () => 0.0001));
    const ev = b.act({ kind: "item", itemId: "rune_ball" });
    expect(ev.some((e) => e.t === "catchSuccess")).toBe(true);
    expect(b.over).toBe("catch");

    // full HP + worst rolls => fail, battle continues
    const fresh = mk("embercub", 5);
    const b2 = new Battle(wild([mk("snowpup", 20)], [fresh], () => 0.9999));
    const ev2 = b2.act({ kind: "item", itemId: "rune_ball" });
    expect(ev2.some((e) => e.t === "catchFail")).toBe(true);
    expect(b2.over).toBeNull();
  });

  it("capture is never guaranteed at full HP (statistical)", () => {
    let caught = 0;
    const trials = 400;
    for (let i = 0; i < trials; i++) {
      const b = new Battle(wild([mk("snowpup", 20)], [mk("embercub", 5)]));
      b.act({ kind: "item", itemId: "rune_ball" });
      if (b.over === "catch") caught++;
    }
    expect(caught).toBeGreaterThan(0); // possible
    expect(caught).toBeLessThan(trials * 0.5); // but far from guaranteed
  });

  it("balls cannot be used on trainer creatures", () => {
    const b = new Battle({
      kind: "trainer",
      playerParty: [mk("snowpup", 10)],
      enemyParty: [mk("bergling", 10)],
      background: "meadow",
      noCatch: true,
      rng: () => 0.0001,
    });
    const ev = b.act({ kind: "item", itemId: "rune_ball" });
    expect(ev.some((e) => e.t === "catchThrow")).toBe(false);
    expect(b.over).toBeNull();
  });

  it("every species move id referenced by progression exists", () => {
    for (const id of Object.keys(SPECIES_INDEX)) {
      for (const m of movesForLevel(id, 20)) expect(MOVE_INDEX[m.id]).toBeTruthy();
    }
  });

  it("starter moves stay within their element families (basic moves may be primal)", () => {
    for (const id of ["embercub", "snowpup", "stormchick"] as const) {
      const allowed = [...SPECIES_INDEX[id].types, "primal"];
      const c = mk(id, 12);
      for (const m of c.moves) {
        expect(allowed, `${id} move ${m.id}`).toContain(MOVE_INDEX[m.id].element);
      }
      expect(firstMoveElement(c)).toBeDefined();
    }
  });
});
