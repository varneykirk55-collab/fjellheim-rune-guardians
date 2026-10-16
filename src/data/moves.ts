// moves.ts - data-driven move database.
import { Element } from "./elements";

export type MoveCategory = "physical" | "special" | "status";
export type StatKey = "might" | "guard" | "seidr" | "ward" | "swift";
export type StatusId = "burn" | "poison" | "paralysis" | "sleep" | "freeze";

export interface MoveEffect {
  kind: "status" | "stat";
  /** for kind=status */
  status?: StatusId;
  chance?: number; // 0..100
  /** for kind=stat */
  stat?: StatKey;
  stages?: number; // -6..6
  target?: "self" | "foe";
}

export interface Move {
  id: string;
  name: string;
  element: Element;
  category: MoveCategory;
  power: number; // 0 for status moves
  accuracy: number; // 0..100
  pp: number;
  priority?: number;
  effect?: MoveEffect;
  desc: string;
}

const M = (m: Move) => m;

export const MOVES: Move[] = [
  // ---- Primal (raw force) ----
  M({ id: "lunge", name: "Lunge", element: "primal", category: "physical", power: 40, accuracy: 100, pp: 35, desc: "A straightforward body slam." }),
  M({ id: "primal_crush", name: "Primal Crush", element: "primal", category: "physical", power: 75, accuracy: 85, pp: 12, desc: "A heavy, reckless overhead blow." }),
  M({ id: "swift_talon", name: "Swift Talon", element: "primal", category: "physical", power: 30, accuracy: 100, pp: 30, priority: 1, desc: "Strikes first, always." }),
  M({ id: "sharpen", name: "Sharpen", element: "primal", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "stat", stat: "might", stages: 1, target: "self" }, desc: "Raises own Might." }),
  M({ id: "harden_hide", name: "Harden Hide", element: "primal", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "stat", stat: "guard", stages: 1, target: "self" }, desc: "Raises own Guard." }),
  M({ id: "focus_mind", name: "Focus Mind", element: "primal", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "stat", stat: "seidr", stages: 1, target: "self" }, desc: "Raises own Seidr." }),
  M({ id: "ward_chant", name: "Ward Chant", element: "primal", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "stat", stat: "ward", stages: 1, target: "self" }, desc: "Raises own Ward." }),
  M({ id: "quicken", name: "Quicken", element: "primal", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "stat", stat: "swift", stages: 1, target: "self" }, desc: "Raises own Swift." }),
  M({ id: "intimidate_howl", name: "Intimidate Howl", element: "primal", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "stat", stat: "might", stages: -1, target: "foe" }, desc: "Lowers the foe's Might." }),
  M({ id: "pierce_screech", name: "Pierce Screech", element: "primal", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "stat", stat: "guard", stages: -1, target: "foe" }, desc: "Lowers the foe's Guard." }),
  // ---- Fire ----
  M({ id: "ember_claw", name: "Ember Claw", element: "fire", category: "physical", power: 40, accuracy: 100, pp: 30, effect: { kind: "status", status: "burn", chance: 10 }, desc: "A raking swipe wreathed in sparks." }),
  M({ id: "flame_maw", name: "Flame Maw", element: "fire", category: "special", power: 65, accuracy: 95, pp: 15, effect: { kind: "status", status: "burn", chance: 15 }, desc: "Breathes a cone of roaring flame." }),
  M({ id: "blaze_charge", name: "Blaze Charge", element: "fire", category: "physical", power: 70, accuracy: 90, pp: 10, effect: { kind: "status", status: "burn", chance: 20 }, desc: "A burning tackle that scatters embers." }),
  // ---- Ice ----
  M({ id: "frost_nip", name: "Frost Nip", element: "ice", category: "physical", power: 40, accuracy: 100, pp: 30, effect: { kind: "status", status: "freeze", chance: 5 }, desc: "A chilling little bite." }),
  M({ id: "rime_howl", name: "Rime Howl", element: "ice", category: "special", power: 65, accuracy: 95, pp: 15, effect: { kind: "status", status: "freeze", chance: 10 }, desc: "A howl that freezes the air itself." }),
  M({ id: "glacier_slam", name: "Glacier Slam", element: "ice", category: "physical", power: 75, accuracy: 90, pp: 10, desc: "Slams the foe with a shard of glacier ice." }),
  // ---- Lightning ----
  M({ id: "spark_peck", name: "Spark Peck", element: "lightning", category: "physical", power: 40, accuracy: 100, pp: 30, effect: { kind: "status", status: "paralysis", chance: 10 }, desc: "A peck that crackles with static." }),
  M({ id: "storm_call", name: "Storm Call", element: "lightning", category: "special", power: 65, accuracy: 95, pp: 15, effect: { kind: "status", status: "paralysis", chance: 15 }, desc: "Calls a small storm down upon the foe." }),
  M({ id: "thunder_lance", name: "Thunder Lance", element: "lightning", category: "special", power: 80, accuracy: 85, pp: 8, effect: { kind: "status", status: "paralysis", chance: 20 }, desc: "A spear of pure lightning." }),
  // ---- Water ----
  M({ id: "tide_slap", name: "Tide Slap", element: "water", category: "physical", power: 45, accuracy: 100, pp: 25, desc: "A crashing slap of seawater." }),
  M({ id: "brine_surge", name: "Brine Surge", element: "water", category: "special", power: 65, accuracy: 95, pp: 15, desc: "A surging wave of stinging brine." }),
  // ---- Earth ----
  M({ id: "stone_throw", name: "Stone Throw", element: "earth", category: "physical", power: 45, accuracy: 95, pp: 25, desc: "Hurls a heavy stone." }),
  M({ id: "quake_stomp", name: "Quake Stomp", element: "earth", category: "physical", power: 70, accuracy: 90, pp: 12, desc: "Stomps the ground into a shaking wave." }),
  M({ id: "boulder_guard", name: "Boulder Guard", element: "earth", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "stat", stat: "guard", stages: 1, target: "self" }, desc: "Coats the body in stone-hard grit." }),
  // ---- Wind ----
  M({ id: "gust_cutter", name: "Gust Cutter", element: "wind", category: "special", power: 45, accuracy: 100, pp: 25, desc: "A slicing blade of compressed wind." }),
  M({ id: "gale_talon", name: "Gale Talon", element: "wind", category: "physical", power: 60, accuracy: 95, pp: 15, desc: "Talons trailed by whipping gales." }),
  M({ id: "cyclone_dive", name: "Cyclone Dive", element: "wind", category: "physical", power: 75, accuracy: 85, pp: 10, desc: "A spiralling dive inside a small cyclone." }),
  // ---- Spirit ----
  M({ id: "soul_gleam", name: "Soul Gleam", element: "spirit", category: "special", power: 50, accuracy: 100, pp: 20, desc: "A soft gleam that touches the soul." }),
  M({ id: "hex_whisper", name: "Hex Whisper", element: "spirit", category: "special", power: 70, accuracy: 90, pp: 10, desc: "Whispers an old, heavy hex." }),
  // ---- Shadow ----
  M({ id: "umbral_swipe", name: "Umbral Swipe", element: "shadow", category: "physical", power: 55, accuracy: 100, pp: 20, desc: "A swipe from the corner of the eye." }),
  M({ id: "night_veil", name: "Night Veil", element: "shadow", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "stat", stat: "ward", stages: 1, target: "self" }, desc: "Wraps the body in a veil of night." }),
  M({ id: "shadow_fang", name: "Shadow Fang", element: "shadow", category: "physical", power: 70, accuracy: 90, pp: 12, desc: "Bites with fangs of solid darkness." }),
  // ---- Light ----
  M({ id: "dawn_ray", name: "Dawn Ray", element: "light", category: "special", power: 50, accuracy: 100, pp: 20, desc: "A warm ray of the first sun." }),
  M({ id: "gilded_horn", name: "Gilded Horn", element: "light", category: "physical", power: 65, accuracy: 95, pp: 15, desc: "Gores with a horn of golden light." }),
  // ---- Steel ----
  M({ id: "steel_cleave", name: "Steel Cleave", element: "steel", category: "physical", power: 60, accuracy: 95, pp: 15, desc: "A hard, metallic cleaving strike." }),
  M({ id: "forge_wall", name: "Forge Wall", element: "steel", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "stat", stat: "guard", stages: 1, target: "self" }, desc: "Raises a wall of forged plates." }),
  M({ id: "iron_meteor", name: "Iron Meteor", element: "steel", category: "physical", power: 80, accuracy: 80, pp: 8, desc: "Falls upon the foe like falling iron." }),
  // ---- Arcane ----
  M({ id: "rune_bolt", name: "Rune Bolt", element: "arcane", category: "special", power: 55, accuracy: 100, pp: 20, desc: "Fires a bolt of carved rune-light." }),
  M({ id: "sigil_ward", name: "Sigil Ward", element: "arcane", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "stat", stat: "ward", stages: 1, target: "self" }, desc: "Traces a protective sigil in the air." }),
  M({ id: "wyrd_pulse", name: "Wyrd Pulse", element: "arcane", category: "special", power: 75, accuracy: 90, pp: 10, desc: "Releases a pulse of woven wyrd." }),
  // ---- Poison ----
  M({ id: "venom_spit", name: "Venom Spit", element: "poison", category: "special", power: 40, accuracy: 100, pp: 25, effect: { kind: "status", status: "poison", chance: 30 }, desc: "Spits a stinging venom." }),
  M({ id: "fang_venom", name: "Fang Venom", element: "poison", category: "physical", power: 55, accuracy: 95, pp: 15, effect: { kind: "status", status: "poison", chance: 20 }, desc: "A biting strike that leaves venom." }),
];

export const MOVE_INDEX: Record<string, Move> = Object.fromEntries(MOVES.map((m) => [m.id, m]));

export function getMove(id: string): Move {
  const m = MOVE_INDEX[id];
  if (!m) throw new Error(`Unknown move: ${id}`);
  return m;
}
