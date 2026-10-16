// trainers.ts - NPC trainer definitions (parties, rewards, dialogue).
import { CreatureInstance, TrainerRef } from "../battle/types";
import { makeCreature } from "../battle/progression";
import { getMove } from "./moves";
import { StarterId, rivalStarterFor } from "./species";

export interface TrainerPartySlot {
  species: string;
  level: number;
  /** keep only primal (non-elemental) moves - used for the first rival fight */
  basicMovesOnly?: boolean;
}

export interface TrainerDef extends TrainerRef {
  party: TrainerPartySlot[] | ((playerStarter: StarterId) => TrainerPartySlot[]);
}

export const TRAINERS: Record<string, TrainerDef> = {
  sten1: {
    id: "sten1",
    name: "Sten",
    trainerClass: "Rival",
    charKey: "sten",
    rewardSilver: 150,
    // The rival takes the starter with the elemental advantage. At level 5 with
    // its elemental move that fight was unwinnable (0-1% in simulation for every
    // starter), so the opening fight uses a level-4 creature with basic moves.
    party: (starter) => [{ species: rivalStarterFor(starter), level: 4, basicMovesOnly: true }],
    introLines: [
      "Sten: Finally! I was starting to think",
      "the seer picked YOU of all people.",
      "Sten: My creature and I - we'll show this",
      "village who the real talent is!",
    ],
    defeatLines: [
      "Sten: ...Luck. That was LUCK.",
      "Sten: Train all you want. Next time,",
      "I won't go easy on you.",
    ],
  },
  herdis: {
    id: "herdis",
    name: "Herdis",
    trainerClass: "Path Scout",
    charKey: "hunter",
    rewardSilver: 120,
    party: [
      { species: "vindhare", level: 5 },
      { species: "glodref", level: 5 },
    ],
    introLines: ["Herdis: Scouts observe, and then act!", "Show me what you've learned!"],
    defeatLines: ["Herdis: Well observed, well fought.", "The Path respects you now."],
  },
  bjarni: {
    id: "bjarni",
    name: "Bjarni",
    trainerClass: "Woodsman",
    charKey: "woodsman",
    rewardSilver: 140,
    party: [
      { species: "bergling", level: 6 },
      { species: "ormling", level: 6 },
    ],
    introLines: ["Bjarni: Hoho! Stand firm like a stump,", "little trainer - here we come!"],
    defeatLines: ["Bjarni: Hah! Split clean through!", "Good timber in you, truly."],
  },
};

export function getTrainer(id: string): TrainerDef {
  const t = TRAINERS[id];
  if (!t) throw new Error(`Unknown trainer ${id}`);
  return t;
}

/** Instantiate a trainer's party for battle (resolves starter-dependent parties). */
export function buildTrainerParty(t: TrainerDef, playerStarter: StarterId): CreatureInstance[] {
  const slots = typeof t.party === "function" ? t.party(playerStarter) : t.party;
  return slots.map((slot) => {
    const c = makeCreature(slot.species, slot.level);
    if (slot.basicMovesOnly) {
      const basic = c.moves.filter((m) => getMove(m.id).element === "primal");
      if (basic.length) c.moves = basic;
    }
    return c;
  });
}
