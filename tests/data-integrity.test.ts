import { describe, it, expect } from "vitest";
import { MAPS } from "../src/data/maps";
import { STORY_EVENTS } from "../src/data/story";
import { TRAINERS, getTrainer } from "../src/data/trainers";
import { NPC_LINES } from "../src/data/dialogues";
import { ITEM_INDEX, shopInventory } from "../src/data/items";
import { SPECIES_INDEX, STARTERS, rivalStarterFor } from "../src/data/species";
import { MOVE_INDEX } from "../src/data/moves";
import { ASSET_LAYOUT } from "../src/assets/layout";
import { newGameState } from "../src/core/save";

const layout = ASSET_LAYOUT as unknown as {
  tiles: Record<string, number>;
  tileMeta: Record<string, { solid: boolean; frames: number; encounter: boolean }>;
  chars: Record<string, number>;
  creatures: Record<string, { x: number; y: number }>;
  objects: Record<string, { w: number; h: number }>;
};

function tileKey(mapId: string, x: number, y: number): string | null {
  const m = MAPS[mapId];
  const row = m.grid[y];
  if (!row) return null;
  const ch = row[x];
  if (ch === undefined) return null;
  return m.legend[ch] ?? null;
}

function walkable(mapId: string, x: number, y: number): boolean {
  const key = tileKey(mapId, x, y);
  if (!key) return false;
  return !layout.tileMeta[key]?.solid;
}

describe("map data integrity", () => {
  it("every warp targets an existing map at a walkable, in-bounds tile", () => {
    for (const [id, m] of Object.entries(MAPS)) {
      for (const w of m.warps) {
        expect(MAPS[w.to.map], `${id} warp -> ${w.to.map}`).toBeTruthy();
        expect(walkable(w.to.map, w.to.x, w.to.y), `${id} warp lands on blocked tile in ${w.to.map}`).toBe(true);
      }
      for (const b of m.buildings) {
        expect(layout.objects[b.asset], `${id} building asset ${b.asset}`).toBeTruthy();
        if (b.door) {
          expect(MAPS[b.door.to.map]).toBeTruthy();
          expect(walkable(b.door.to.map, b.door.to.x, b.door.to.y), `${id} door -> ${b.door.to.map} blocked`).toBe(true);
          // the door trigger tile itself must be inside this map
          expect(b.door.x >= 0 && b.door.y >= 0 && b.door.x < m.grid[0].length && b.door.y < m.grid.length).toBe(true);
        }
      }
      for (const n of m.npcs) {
        expect(layout.chars[n.char], `${id} npc ${n.id} char ${n.char}`).toBeDefined();
        expect(n.x >= 0 && n.y >= 0 && n.x < m.grid[0].length && n.y < m.grid.length).toBe(true);
      }
      for (const p of m.props) {
        expect(layout.objects[p.asset], `${id} prop ${p.asset}`).toBeTruthy();
      }
      for (const s of m.signs) {
        expect(s.x >= 0 && s.y >= 0 && s.x < m.grid[0].length && s.y < m.grid.length).toBe(true);
        expect(s.text.length).toBeGreaterThan(0);
      }
      if (m.encounters) {
        expect(m.encounters.rate).toBeGreaterThan(0);
        expect(m.encounters.rate).toBeLessThan(1);
        for (const e of m.encounters.table) {
          expect(SPECIES_INDEX[e.species], `encounter species ${e.species}`).toBeTruthy();
          expect(e.weight).toBeGreaterThan(0);
          expect(e.max).toBeGreaterThanOrEqual(e.min);
        }
      }
    }
  });

  it("new-game spawn point is walkable", () => {
    const s = newGameState("T", "eirik");
    expect(walkable(s.pos.map, s.pos.x, s.pos.y)).toBe(true);
  });

  it("starter-choice story scene happens in a real map", () => {
    for (const ev of STORY_EVENTS) {
      expect(MAPS[ev.map], `story event ${ev.id} map`).toBeTruthy();
      if (ev.trigger.type === "step") {
        const m = MAPS[ev.map];
        expect(ev.trigger.x >= 0 && ev.trigger.y >= 0).toBe(true);
        expect(ev.trigger.x + ev.trigger.w).toBeLessThanOrEqual(m.grid[0].length);
        expect(ev.trigger.y + ev.trigger.h).toBeLessThanOrEqual(m.grid.length);
      }
      if (ev.trigger.type === "talk") {
        const hasNpc = m_hasNpc(ev.map, ev.trigger.npc);
        expect(hasNpc, `story ${ev.id} talks to missing npc ${ev.trigger.npc}`).toBe(true);
      }
    }
  });
});

function m_hasNpc(mapId: string, npcId: string): boolean {
  return MAPS[mapId].npcs.some((n) => n.id === npcId);
}

describe("story / trainer / dialogue integrity", () => {
  it("story battles reference real trainers and species", () => {
    for (const ev of STORY_EVENTS) {
      const all = [...ev.steps, ...Object.values(ev.onResult ?? {}).flat()];
      for (const step of all) {
        if ("battle" in step) {
          const b = step.battle as { trainer?: string; wild?: { species: string } };
          if (b.trainer) expect(TRAINERS[b.trainer], `trainer ${b.trainer}`).toBeTruthy();
          if (b.wild) expect(SPECIES_INDEX[b.wild.species]).toBeTruthy();
        }
        if ("give" in step) {
          const g = step.give as { item?: string };
          if (g.item) expect(ITEM_INDEX[g.item], `story item ${g.item}`).toBeTruthy();
        }
        if ("showCreature" in step) {
          const sc = step.showCreature as { species: string };
          expect(SPECIES_INDEX[sc.species]).toBeTruthy();
          expect(layout.creatures[SPECIES_INDEX[sc.species].sprite], `sprite for ${sc.species}`).toBeTruthy();
        }
      }
    }
  });

  it("trainers have legal parties and sprites", () => {
    for (const t of Object.values(TRAINERS)) {
      expect(layout.chars[t.charKey], `trainer char ${t.charKey}`).toBeDefined();
      const party = typeof t.party === "function" ? t.party("embercub") : t.party;
      expect(party.length).toBeGreaterThan(0);
      expect(party.length).toBeLessThanOrEqual(6);
      for (const p of party) {
        expect(SPECIES_INDEX[p.species]).toBeTruthy();
        expect(p.level).toBeGreaterThan(0);
        expect(p.level).toBeLessThanOrEqual(100);
      }
    }
    expect(getTrainer("sten1").id).toBe("sten1");
  });

  it("npc dialogue keys match placed npcs or trainers", () => {
    const npcIds = new Set<string>();
    for (const m of Object.values(MAPS)) for (const n of m.npcs) npcIds.add(n.id);
    for (const key of Object.keys(NPC_LINES)) {
      expect(npcIds.has(key), `dialogue for unknown npc ${key}`).toBe(true);
    }
  });

  it("rival starter mapping gives the advantaged element", () => {
    for (const s of STARTERS) {
      const r = rivalStarterFor(s as (typeof STARTERS)[number]);
      expect(STARTERS).toContain(r);
      expect(r).not.toBe(s);
    }
    expect(rivalStarterFor("embercub")).toBe("stormchick"); // lightning > fire
    expect(rivalStarterFor("snowpup")).toBe("embercub"); // fire > ice
    expect(rivalStarterFor("stormchick")).toBe("snowpup"); // ice > lightning
  });
});

describe("shop & items", () => {
  it("shop stock exists with positive prices", () => {
    const stock = shopInventory();
    expect(stock.length).toBeGreaterThan(0);
    for (const it of stock) {
      expect(it.price).toBeGreaterThan(0);
      expect(ITEM_INDEX[it.id]).toBeTruthy();
    }
  });

  it("every learnset move exists", () => {
    for (const sp of Object.values(SPECIES_INDEX)) {
      for (const entry of sp.learnset) expect(MOVE_INDEX[entry.move], `${sp.id} learns ${entry.move}`).toBeTruthy();
      if (sp.evolvesTo) expect(SPECIES_INDEX[sp.evolvesTo.species], `${sp.id} evolves to ${sp.evolvesTo.species}`).toBeTruthy();
      expect(layout.creatures[sp.sprite], `sprite ${sp.sprite}`).toBeTruthy();
    }
  });
});
