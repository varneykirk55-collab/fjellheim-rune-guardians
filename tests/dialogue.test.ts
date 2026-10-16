import { describe, it, expect } from "vitest";
import { paginate } from "../src/ui/paginate";
import { STORY_EVENTS } from "../src/data/story";
import { NPC_LINES } from "../src/data/dialogues";
import { MAPS } from "../src/data/maps";

describe("dialogue pagination", () => {
  it("keeps an authored 3-line box together (sentences no longer split across presses)", () => {
    expect(paginate(["Seer Ingrid sent word at dawn - she wants", "you at the longhouse.", "Today is the day."])).toEqual([
      "Seer Ingrid sent word at dawn - she wants\nyou at the longhouse.\nToday is the day.",
    ]);
  });

  it("starts a new page on a new speaker turn and after three lines", () => {
    expect(paginate(["Sten: Finally!", "the seer picked YOU.", "Sten: My creature and I", "will show them!"])).toEqual([
      "Sten: Finally!\nthe seer picked YOU.",
      "Sten: My creature and I\nwill show them!",
    ]);
    expect(paginate(["a", "b", "c", "d"])).toEqual(["a\nb\nc", "d"]);
  });

  it("does not treat mid-sentence colons as speaker turns", () => {
    expect(paginate(["NORTH: Whisperpine Path", "Travelers beware: tall grass", "hides wild creatures."])).toHaveLength(1);
  });

  it("every scripted text fits the box (max 3 lines per page)", () => {
    const all: string[][] = [];
    for (const ev of STORY_EVENTS) for (const s of [...ev.steps, ...Object.values(ev.onResult ?? {}).flat()]) if ("say" in s) all.push(s.say);
    for (const entries of Object.values(NPC_LINES)) for (const e of entries) all.push(e.text);
    for (const m of Object.values(MAPS)) for (const s of m.signs) all.push(s.text);
    for (const lines of all) for (const page of paginate(lines)) expect(page.split("\n").length).toBeLessThanOrEqual(3);
  });
});
