import { describe, it, expect, beforeEach } from "vitest";
import { SaveManager, newGameState, SAVE_VERSION } from "../src/core/save";
import { makeCreature } from "../src/battle/progression";

// minimal localStorage mock for node
const store = new Map<string, string>();
beforeEach(() => store.clear());
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};

describe("save system", () => {
  it("new game state has documented defaults", () => {
    const s = newGameState("Eirik", "eirik");
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.pos.map).toBe("home");
    expect(s.bag.silver).toBe(500);
    expect(s.party).toEqual([]);
    expect(s.box).toEqual([]);
    expect(s.flags).toEqual({});
    expect(s.settings.textSpeed).toBe("normal");
  });

  it("round-trips a full state", () => {
    const s = newGameState("Astri", "astri");
    s.party.push(makeCreature("embercub", 7));
    s.box.push(makeCreature("bergling", 4));
    s.bag.items["rune_ball"] = 5;
    s.flags["starter"] = "embercub";
    s.pos = { map: "route1", x: 30, y: 12, dir: "left" };
    expect(SaveManager.save(s)).toBe(true);
    expect(SaveManager.hasSave()).toBe(true);
    const loaded = SaveManager.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.playerName).toBe("Astri");
    expect(loaded!.party[0].speciesId).toBe("embercub");
    expect(loaded!.party[0].level).toBe(7);
    expect(loaded!.box[0].speciesId).toBe("bergling");
    expect(loaded!.bag.items["rune_ball"]).toBe(5);
    expect(loaded!.flags["starter"]).toBe("embercub");
    expect(loaded!.pos).toEqual({ map: "route1", x: 30, y: 12, dir: "left" });
  });

  it("rejects corrupted saves", () => {
    store.set("fjellheim.save", "not json {{{");
    expect(SaveManager.load()).toBeNull();

    SaveManager.save(newGameState("X", "eirik"));
    const good = store.get("fjellheim.save")!;
    const bad = { ...JSON.parse(good) };
    delete bad.bag;
    store.set("fjellheim.save", JSON.stringify(bad));
    expect(SaveManager.load()).toBeNull();

    store.set("fjellheim.save", JSON.stringify({ ...JSON.parse(good), v: "one" }));
    expect(SaveManager.load()).toBeNull();
  });

  it("clear removes the save", () => {
    SaveManager.save(newGameState("X", "eirik"));
    expect(SaveManager.hasSave()).toBe(true);
    SaveManager.clear();
    expect(SaveManager.hasSave()).toBe(false);
    expect(SaveManager.load()).toBeNull();
  });
});
