// starter.ts - the seer's starter choice, kept free of Phaser so it can be tested.
import { makeCreature } from "../battle/progression";
import { STARTERS, StarterId } from "../data/species";
import { GameState } from "./save";

/** screen-space x of starter slot i in the choice menu (512x288 canvas) */
export const starterSlotX = (i: number) => 140 + i * 116;

/** which starter slot (0-2) a screen point is over, or -1 */
export function starterSlotAt(x: number, y: number): number {
  if (y < 46 || y > 128) return -1;
  for (let i = 0; i < STARTERS.length; i++) if (Math.abs(x - starterSlotX(i)) <= 40) return i;
  return -1;
}

/**
 * Give the player their starter: exactly one level-5 creature of the chosen
 * species, recorded in flags.starter. A second call (a click and a key landing
 * in the same frame) changes nothing and returns false.
 */
export function grantStarter(state: GameState, id: StarterId): boolean {
  if (!STARTERS.includes(id)) throw new Error(`not a starter: ${id}`);
  if (state.flags.starter) return false;
  state.party.push(makeCreature(id, 5));
  state.flags.starter = id;
  return true;
}
