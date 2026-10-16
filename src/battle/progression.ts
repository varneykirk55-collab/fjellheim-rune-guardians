// progression.ts - experience, level-ups, move learning and evolution.
// Pure functions; consumed after battles and by debug/test tooling.
import { getMove } from "../data/moves";
import { getSpecies, Species } from "../data/species";
import { calcStat } from "./engine";
import { CreatureInstance } from "./types";

export type ProgressEvent =
  | { t: "exp"; uid: string; amount: number }
  | { t: "levelup"; uid: string; level: number; maxHp: number }
  | { t: "learn"; uid: string; moveId: string; auto: boolean }
  | { t: "evolveStart"; uid: string; from: string; to: string }
  | { t: "evolveDone"; uid: string; to: string };

export function expAtLevel(level: number, growth: Species["growth"]): number {
  const n = level ** 3;
  if (growth === "fast") return Math.floor(n * 0.8);
  if (growth === "slow") return Math.floor(n * 1.25);
  return n;
}

export function expForNextLevel(c: CreatureInstance): number {
  const sp = getSpecies(c.speciesId);
  return expAtLevel(c.level + 1, sp.growth);
}

export function expProgress(c: CreatureInstance): { current: number; next: number; prev: number } {
  const sp = getSpecies(c.speciesId);
  return {
    current: c.exp,
    next: expAtLevel(c.level + 1, sp.growth),
    prev: expAtLevel(c.level, sp.growth),
  };
}

/** Standard move set for a freshly encountered creature of a level. */
export function movesForLevel(speciesId: string, level: number): { id: string; pp: number }[] {
  const sp = getSpecies(speciesId);
  const known = sp.learnset.filter((l) => l.level <= level).map((l) => l.move);
  const unique = [...new Set(known)].slice(-4);
  return unique.map((id) => ({ id, pp: getMove(id).pp }));
}

let uidCounter = 0;
export function makeCreature(speciesId: string, level: number): CreatureInstance {
  uidCounter += 1;
  const sp = getSpecies(speciesId);
  const maxHp = calcStat(sp.base.hp, level, true);
  return {
    uid: `${speciesId}-${Date.now().toString(36)}-${uidCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    speciesId,
    level,
    exp: expAtLevel(level, sp.growth),
    hp: maxHp,
    moves: movesForLevel(speciesId, level),
    status: null,
    statusTurns: 0,
  };
}

export function maxHpOf(c: CreatureInstance): number {
  return calcStat(getSpecies(c.speciesId).base.hp, c.level, true);
}

/**
 * Apply experience after a victory. Returns events in display order.
 * Learning a move when all four slots are full yields a `learn` event with
 * auto=false; the UI must call resolveLearnChoice afterwards.
 */
export function gainExp(c: CreatureInstance, amount: number): ProgressEvent[] {
  const ev: ProgressEvent[] = [];
  const sp0 = getSpecies(c.speciesId);
  c.exp += amount;
  ev.push({ t: "exp", uid: c.uid, amount });
  let guard = 0;
  while (c.level < 100 && c.exp >= expAtLevel(c.level + 1, getSpecies(c.speciesId).growth) && guard++ < 60) {
    c.level += 1;
    const sp = getSpecies(c.speciesId);
    const newMax = calcStat(sp.base.hp, c.level, true);
    c.hp = Math.min(newMax, c.hp + (newMax - calcStat(sp.base.hp, c.level - 1, true)));
    ev.push({ t: "levelup", uid: c.uid, level: c.level, maxHp: newMax });
    for (const entry of sp.learnset) {
      if (entry.level === c.level) {
        const already = c.moves.some((m) => m.id === entry.move);
        if (already) continue;
        if (c.moves.length < 4) {
          c.moves.push({ id: entry.move, pp: getMove(entry.move).pp });
          ev.push({ t: "learn", uid: c.uid, moveId: entry.move, auto: true });
        } else {
          ev.push({ t: "learn", uid: c.uid, moveId: entry.move, auto: false });
        }
      }
    }
    void sp0;
  }
  return ev;
}

/** UI resolution for a full move pool: forgetIndex -1 cancels the learn. */
export function resolveLearnChoice(c: CreatureInstance, moveId: string, forgetIndex: number): ProgressEvent[] {
  if (forgetIndex < 0) return [];
  c.moves.splice(forgetIndex, 1, { id: moveId, pp: getMove(moveId).pp });
  return [{ t: "learn", uid: c.uid, moveId, auto: true }];
}

/** Check + apply evolution. Returns events; caller animates between start/done. */
export function checkEvolution(c: CreatureInstance): ProgressEvent[] {
  const sp = getSpecies(c.speciesId);
  if (!sp.evolvesTo || c.level < sp.evolvesTo.level) return [];
  const to = sp.evolvesTo.species;
  const oldMax = maxHpOf(c);
  const ev: ProgressEvent[] = [{ t: "evolveStart", uid: c.uid, from: c.speciesId, to }];
  c.speciesId = to;
  const newMax = maxHpOf(c);
  c.hp = Math.min(newMax, c.hp + (newMax - oldMax));
  // keep known moves; evolutions may bring their own signature moves at level 1
  for (const entry of getSpecies(to).learnset) {
    if (entry.level === 1 && !c.moves.some((m) => m.id === entry.move) && c.moves.length < 4) {
      c.moves.push({ id: entry.move, pp: getMove(entry.move).pp });
    }
  }
  ev.push({ t: "evolveDone", uid: c.uid, to });
  return ev;
}
