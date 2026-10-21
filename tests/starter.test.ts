// The seer's starter choice must grant exactly the creature that was picked.
import { describe, it, expect } from "vitest";
import { newGameState } from "../src/core/save";
import { grantStarter, starterSlotAt, starterSlotX } from "../src/core/starter";
import { STARTERS } from "../src/data/species";

describe("starter choice", () => {
  for (const id of ["embercub", "snowpup", "stormchick"] as const) {
    it(`choosing ${id} grants exactly one ${id}`, () => {
      const st = newGameState("Eirik", "eirik");
      expect(grantStarter(st, id)).toBe(true);
      expect(st.party.map((c) => c.speciesId)).toEqual([id]);
      expect(st.party[0].level).toBe(5);
      expect(st.flags.starter).toBe(id);
    });
  }

  it("a second pick in the same moment changes nothing", () => {
    const st = newGameState("Astri", "astri");
    grantStarter(st, "snowpup");
    expect(grantStarter(st, "embercub")).toBe(false);
    expect(st.party.map((c) => c.speciesId)).toEqual(["snowpup"]);
    expect(st.flags.starter).toBe("snowpup");
  });

  it("menu slots are in STARTERS order and hit-test where they are drawn", () => {
    expect([...STARTERS]).toEqual(["embercub", "snowpup", "stormchick"]);
    STARTERS.forEach((_, i) => {
      expect(starterSlotAt(starterSlotX(i), 100)).toBe(i);
      expect(starterSlotAt(starterSlotX(i) - 39, 60)).toBe(i);
    });
    // between the creatures, and the text area below, are not a creature
    expect(starterSlotAt((starterSlotX(0) + starterSlotX(1)) / 2, 100)).toBe(-1);
    expect(starterSlotAt(starterSlotX(1), 200)).toBe(-1);
  });
});
