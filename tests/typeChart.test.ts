import { describe, it, expect } from "vitest";
import { TYPE_CHART, effectiveness, singleEffectiveness, validateChart } from "../src/data/typeChart";
import { ELEMENTS } from "../src/data/elements";

describe("type chart", () => {
  it("is self-consistent", () => {
    expect(validateChart()).toEqual([]);
  });

  it("enforces the three fixed immunities", () => {
    expect(singleEffectiveness("steel", "spirit")).toBe(0);
    expect(singleEffectiveness("lightning", "earth")).toBe(0);
    expect(singleEffectiveness("spirit", "shadow")).toBe(0);
  });

  it("keeps the starter triangle", () => {
    expect(singleEffectiveness("fire", "ice")).toBe(2);
    expect(singleEffectiveness("ice", "lightning")).toBe(2);
    expect(singleEffectiveness("lightning", "fire")).toBe(2);
  });

  it("only uses legal multipliers", () => {
    for (const [atk, row] of Object.entries(TYPE_CHART)) {
      for (const [def, mult] of Object.entries(row!)) {
        expect([0, 0.5, 1, 2]).toContain(mult);
        expect(ELEMENTS).toContain(atk);
        expect(ELEMENTS).toContain(def);
      }
    }
  });

  it("defaults to neutral for unlisted pairs", () => {
    expect(singleEffectiveness("arcane", "light")).toBe(1);
  });

  it("multiplies dual-type matchups", () => {
    // immunity on either type zeroes the whole hit
    expect(effectiveness("lightning", ["earth", "water"])).toBe(0);
    expect(effectiveness("spirit", ["shadow", "fire"])).toBe(0);
    // dual multiplication stays within {0, .25, .5, 1, 2, 4}
    for (const atk of ELEMENTS) {
      for (const d1 of ELEMENTS) {
        for (const d2 of ELEMENTS) {
          const m = effectiveness(atk, [d1, d2]);
          expect([0, 0.25, 0.5, 1, 2, 4]).toContain(m);
          expect(m).toBeCloseTo(singleEffectiveness(atk, d1) * singleEffectiveness(atk, d2), 10);
        }
      }
    }
  });
});
