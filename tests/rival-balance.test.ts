// The opening rival fight is a mandatory story battle. With the rival's
// level-5 advantaged starter using its elemental move, the player won 0-1% of
// seeded simulations for every starter. These tests keep it winnable.
import { describe, it, expect } from "vitest";
import { Battle } from "../src/battle/engine";
import { makeCreature } from "../src/battle/progression";
import { getMove } from "../src/data/moves";
import { STARTERS } from "../src/data/species";
import { buildTrainerParty, getTrainer } from "../src/data/trainers";

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** player always uses its strongest-by-power usable move (a typical new player) */
function winRate(starter: (typeof STARTERS)[number], runs = 400): number {
  let wins = 0;
  for (let i = 0; i < runs; i++) {
    const player = makeCreature(starter, 5);
    const b = new Battle({
      kind: "trainer",
      playerParty: [player],
      enemyParty: buildTrainerParty(getTrainer("sten1"), starter),
      noCatch: true,
      background: "indoor",
      rng: seeded(i * 7919 + 13),
    });
    for (let turn = 0; turn < 60 && !b.over; turn++) {
      const idx = player.moves
        .map((m, j) => ({ j, p: m.pp > 0 ? getMove(m.id).power : -1 }))
        .sort((x, y) => y.p - x.p)[0].j;
      b.act({ kind: "move", index: idx });
    }
    if (b.over === "win") wins++;
  }
  return wins / runs;
}

describe("opening rival battle", () => {
  it("the rival keeps the advantaged starter but only basic moves", () => {
    for (const st of STARTERS) {
      const [rival] = buildTrainerParty(getTrainer("sten1"), st);
      expect(rival.speciesId).not.toBe(st);
      expect(rival.moves.length).toBeGreaterThan(0);
      for (const m of rival.moves) expect(getMove(m.id).element).toBe("primal");
    }
  });

  it("is winnable with every starter using its strongest move", () => {
    for (const st of STARTERS) expect(winRate(st), st).toBeGreaterThanOrEqual(0.9);
  });
});
