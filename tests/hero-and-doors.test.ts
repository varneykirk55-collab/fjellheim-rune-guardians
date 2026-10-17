// Hero choice persists through saves; building doors get their own sounds.
import { describe, it, expect, beforeEach } from "vitest";
import { doorSound } from "../src/core/audio";
import { MAPS } from "../src/data/maps";
import { newGameState, SaveManager } from "../src/core/save";

describe("door sounds", () => {
  it("entering a building, leaving it, and plain transitions", () => {
    expect(doorSound(false, true)).toBe("doorIn");
    expect(doorSound(true, false)).toBe("doorOut");
    expect(doorSound(false, false)).toBe("door");
  });
  it("every building door in the village plays doorIn, every interior exit doorOut", () => {
    const village = MAPS.village;
    const doors = village.buildings.filter((b) => b.door).map((b) => b.door!.to.map);
    expect(doors.length).toBeGreaterThanOrEqual(6);
    for (const to of doors) expect(doorSound(village.indoors, MAPS[to].indoors), to).toBe("doorIn");
    for (const m of Object.values(MAPS).filter((m) => m.indoors))
      for (const w of m.warps) expect(doorSound(m.indoors, MAPS[w.to.map].indoors), m.id).toBe("doorOut");
  });
});

describe("hero choice in saves", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    } as Storage;
  });
  for (const char of ["eirik", "astri"] as const) {
    it(`${char} survives save and load`, () => {
      expect(SaveManager.save(newGameState(char === "eirik" ? "Eirik" : "Astri", char))).toBe(true);
      expect(SaveManager.load()?.playerChar).toBe(char);
    });
  }
  it("a save with an unknown hero loads as Eirik instead of an invisible player", () => {
    const st = newGameState("Eirik", "eirik") as unknown as Record<string, unknown>;
    st.playerChar = "nobody";
    SaveManager.save(st as never);
    expect(SaveManager.load()?.playerChar).toBe("eirik");
  });
});
