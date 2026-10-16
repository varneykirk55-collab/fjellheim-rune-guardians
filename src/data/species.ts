// species.ts - creature database. Data-driven: stats, types, growth,
// learnsets, evolutions, catch rates and synthesized cry parameters.
import { Element } from "./elements";

export interface BaseStats {
  hp: number;
  might: number; // physical attack
  guard: number; // physical defense
  seidr: number; // special attack (seiðr = Norse magic)
  ward: number; // special defense
  swift: number; // speed
}

export interface CrySpec {
  base: number; // base frequency Hz
  sweep: number; // frequency multiplier over the cry
  wave: OscillatorType;
  dur: number; // seconds
  vibrato?: number;
}

export interface Species {
  id: string;
  name: string;
  types: Element[];
  base: BaseStats;
  catchRate: number; // 3..255
  expYield: number;
  growth: "medium" | "fast" | "slow";
  evolvesTo?: { species: string; level: number };
  learnset: { level: number; move: string }[];
  sprite: string; // frame key in creatures.png
  flavor: string;
  cry: CrySpec;
  /** divine guardian families (story-relevant) */
  guardian?: boolean;
}

const S = (s: Species) => s;

export const SPECIES: Species[] = [
  /* ---------------- Fire Bear family ---------------- */
  S({
    id: "embercub",
    name: "Embercub",
    types: ["fire"],
    base: { hp: 55, might: 60, guard: 45, seidr: 50, ward: 40, swift: 45 },
    catchRate: 45,
    expYield: 62,
    growth: "medium",
    evolvesTo: { species: "flamepelt", level: 16 },
    learnset: [
      { level: 1, move: "lunge" },
      { level: 1, move: "ember_claw" },
      { level: 5, move: "sharpen" },
      { level: 9, move: "flame_maw" },
      { level: 13, move: "swift_talon" },
    ],
    sprite: "embercub",
    flavor: "A bold bear cub whose ear-flames never go out. It naps on warm stones.",
    cry: { base: 220, sweep: 1.4, wave: "square", dur: 0.22 },
    guardian: true,
  }),
  S({
    id: "flamepelt",
    name: "Flamepelt",
    types: ["fire"],
    base: { hp: 70, might: 78, guard: 58, seidr: 65, ward: 52, swift: 60 },
    catchRate: 25,
    expYield: 142,
    growth: "medium",
    evolvesTo: { species: "infernoskarn", level: 36 },
    learnset: [
      { level: 1, move: "blaze_charge" },
      { level: 1, move: "flame_maw" },
      { level: 1, move: "sharpen" },
      { level: 20, move: "intimidate_howl" },
      { level: 28, move: "primal_crush" },
    ],
    sprite: "flamepelt",
    flavor: "Its mane of fire brightens with its mood. Hunters respect its territory.",
    cry: { base: 160, sweep: 1.5, wave: "sawtooth", dur: 0.3 },
    guardian: true,
  }),
  S({
    id: "infernoskarn",
    name: "Infernoskarn",
    types: ["fire", "primal"],
    base: { hp: 90, might: 100, guard: 75, seidr: 90, ward: 70, swift: 80 },
    catchRate: 5,
    expYield: 250,
    growth: "medium",
    learnset: [
      { level: 1, move: "blaze_charge" },
      { level: 1, move: "primal_crush" },
      { level: 1, move: "intimidate_howl" },
      { level: 40, move: "iron_meteor" },
    ],
    sprite: "infernoskarn",
    flavor: "A crowned guardian of the old fires. Sagas say mountains bow when it wakes.",
    cry: { base: 90, sweep: 1.8, wave: "sawtooth", dur: 0.45, vibrato: 6 },
    guardian: true,
  }),
  /* ---------------- Ice Wolf family ---------------- */
  S({
    id: "snowpup",
    name: "Snowpup",
    types: ["ice"],
    base: { hp: 58, might: 45, guard: 50, seidr: 60, ward: 48, swift: 48 },
    catchRate: 45,
    expYield: 62,
    growth: "medium",
    evolvesTo: { species: "glacierfang", level: 16 },
    learnset: [
      { level: 1, move: "lunge" },
      { level: 1, move: "frost_nip" },
      { level: 5, move: "ward_chant" },
      { level: 9, move: "rime_howl" },
      { level: 13, move: "gust_cutter" },
    ],
    sprite: "snowpup",
    flavor: "A calm, curious wolf pup. Its forehead crystal chimes in cold wind.",
    cry: { base: 330, sweep: 0.8, wave: "triangle", dur: 0.25 },
    guardian: true,
  }),
  S({
    id: "glacierfang",
    name: "Glacierfang",
    types: ["ice"],
    base: { hp: 74, might: 58, guard: 66, seidr: 80, ward: 64, swift: 64 },
    catchRate: 25,
    expYield: 142,
    growth: "medium",
    evolvesTo: { species: "frosthowl", level: 36 },
    learnset: [
      { level: 1, move: "glacier_slam" },
      { level: 1, move: "rime_howl" },
      { level: 1, move: "ward_chant" },
      { level: 20, move: "focus_mind" },
      { level: 28, move: "hex_whisper" },
    ],
    sprite: "glacierfang",
    flavor: "Ice plates grow along its spine like armor forged by winter itself.",
    cry: { base: 260, sweep: 0.7, wave: "triangle", dur: 0.32 },
    guardian: true,
  }),
  S({
    id: "frosthowl",
    name: "Frosthowl",
    types: ["ice", "spirit"],
    base: { hp: 92, might: 70, guard: 80, seidr: 105, ward: 85, swift: 80 },
    catchRate: 5,
    expYield: 250,
    growth: "medium",
    learnset: [
      { level: 1, move: "glacier_slam" },
      { level: 1, move: "hex_whisper" },
      { level: 1, move: "soul_gleam" },
      { level: 40, move: "wyrd_pulse" },
    ],
    sprite: "frosthowl",
    flavor: "Half wolf, half winter spirit. Its howl opens doors between worlds.",
    cry: { base: 180, sweep: 1.6, wave: "sine", dur: 0.5, vibrato: 8 },
    guardian: true,
  }),
  /* ---------------- Lightning Raven family ---------------- */
  S({
    id: "stormchick",
    name: "Stormchick",
    types: ["lightning"],
    base: { hp: 52, might: 48, guard: 40, seidr: 58, ward: 42, swift: 58 },
    catchRate: 45,
    expYield: 62,
    growth: "medium",
    evolvesTo: { species: "thunderwing", level: 16 },
    learnset: [
      { level: 1, move: "lunge" },
      { level: 1, move: "spark_peck" },
      { level: 5, move: "quicken" },
      { level: 9, move: "storm_call" },
      { level: 13, move: "swift_talon" },
    ],
    sprite: "stormchick",
    flavor: "A clever raven chick that hoards shiny sparks instead of shiny things.",
    cry: { base: 520, sweep: 1.3, wave: "square", dur: 0.16 },
    guardian: true,
  }),
  S({
    id: "thunderwing",
    name: "Thunderwing",
    types: ["lightning"],
    base: { hp: 68, might: 62, guard: 54, seidr: 78, ward: 56, swift: 76 },
    catchRate: 25,
    expYield: 142,
    growth: "medium",
    evolvesTo: { species: "skyreign", level: 36 },
    learnset: [
      { level: 1, move: "gale_talon" },
      { level: 1, move: "storm_call" },
      { level: 1, move: "quicken" },
      { level: 20, move: "cyclone_dive" },
      { level: 28, move: "thunder_lance" },
    ],
    sprite: "thunderwing",
    flavor: "Lightning veins run through its wings. Storms follow it like loyal hounds.",
    cry: { base: 420, sweep: 1.5, wave: "square", dur: 0.22 },
    guardian: true,
  }),
  S({
    id: "skyreign",
    name: "Skyreign",
    types: ["lightning", "wind"],
    base: { hp: 88, might: 78, guard: 68, seidr: 102, ward: 76, swift: 95 },
    catchRate: 5,
    expYield: 250,
    growth: "medium",
    learnset: [
      { level: 1, move: "cyclone_dive" },
      { level: 1, move: "thunder_lance" },
      { level: 1, move: "gale_talon" },
      { level: 40, move: "iron_meteor" },
    ],
    sprite: "skyreign",
    flavor: "Crowned sovereign of the high storms. Sailors pray to the flash of its wings.",
    cry: { base: 300, sweep: 2.0, wave: "square", dur: 0.4, vibrato: 10 },
    guardian: true,
  }),
  /* ---------------- Wild creatures ---------------- */
  S({
    id: "bergling",
    name: "Bergling",
    types: ["earth"],
    base: { hp: 62, might: 55, guard: 65, seidr: 30, ward: 40, swift: 30 },
    catchRate: 190,
    expYield: 52,
    growth: "medium",
    evolvesTo: { species: "bergreir", level: 22 },
    learnset: [
      { level: 1, move: "lunge" },
      { level: 1, move: "stone_throw" },
      { level: 6, move: "harden_hide" },
      { level: 10, move: "boulder_guard" },
      { level: 14, move: "quake_stomp" },
    ],
    sprite: "bergling",
    flavor: "A shy pebble-cub with moss for a cap. It trembles when strangers approach.",
    cry: { base: 150, sweep: 0.7, wave: "triangle", dur: 0.28 },
  }),
  S({
    id: "bergreir",
    name: "Bergreir",
    types: ["earth"],
    base: { hp: 85, might: 80, guard: 95, seidr: 45, ward: 60, swift: 35 },
    catchRate: 90,
    expYield: 140,
    growth: "medium",
    learnset: [
      { level: 1, move: "quake_stomp" },
      { level: 1, move: "boulder_guard" },
      { level: 26, move: "primal_crush" },
    ],
    sprite: "bergreir",
    flavor: "A walking cairn. Old farmers leave offerings where bergreir pass.",
    cry: { base: 100, sweep: 0.6, wave: "sawtooth", dur: 0.4 },
  }),
  S({
    id: "vindhare",
    name: "Vindhare",
    types: ["wind"],
    base: { hp: 50, might: 40, guard: 38, seidr: 45, ward: 40, swift: 70 },
    catchRate: 200,
    expYield: 48,
    growth: "fast",
    learnset: [
      { level: 1, move: "lunge" },
      { level: 1, move: "gust_cutter" },
      { level: 6, move: "quicken" },
      { level: 10, move: "swift_talon" },
      { level: 15, move: "gale_talon" },
    ],
    sprite: "vindhare",
    flavor: "A hare that races the breeze. Its ears trail ribbons of moving air.",
    cry: { base: 600, sweep: 1.4, wave: "sine", dur: 0.14 },
  }),
  S({
    id: "glodref",
    name: "Glodref",
    types: ["fire"],
    base: { hp: 48, might: 55, guard: 38, seidr: 55, ward: 38, swift: 62 },
    catchRate: 160,
    expYield: 55,
    growth: "medium",
    learnset: [
      { level: 1, move: "lunge" },
      { level: 1, move: "ember_claw" },
      { level: 7, move: "quicken" },
      { level: 11, move: "flame_maw" },
      { level: 16, move: "blaze_charge" },
    ],
    sprite: "glodref",
    flavor: "An ember fox that den in old hearths. Its tail tip never stops smouldering.",
    cry: { base: 380, sweep: 1.2, wave: "square", dur: 0.18 },
  }),
  S({
    id: "ormling",
    name: "Ormling",
    types: ["poison"],
    base: { hp: 52, might: 48, guard: 42, seidr: 45, ward: 40, swift: 42 },
    catchRate: 180,
    expYield: 50,
    growth: "medium",
    evolvesTo: { species: "ormstave", level: 12 },
    learnset: [
      { level: 1, move: "lunge" },
      { level: 1, move: "venom_spit" },
      { level: 6, move: "fang_venom" },
      { level: 10, move: "pierce_screech" },
    ],
    sprite: "ormling",
    flavor: "A coiled wyrmlet. Its bite numbs; its manners are worse.",
    cry: { base: 240, sweep: 1.6, wave: "sawtooth", dur: 0.2 },
  }),
  S({
    id: "ormstave",
    name: "Ormstave",
    types: ["poison"],
    base: { hp: 68, might: 66, guard: 58, seidr: 62, ward: 55, swift: 55 },
    catchRate: 90,
    expYield: 130,
    growth: "medium",
    learnset: [
      { level: 1, move: "fang_venom" },
      { level: 1, move: "shadow_fang" },
      { level: 14, move: "intimidate_howl" },
      { level: 20, move: "wyrd_pulse" },
    ],
    sprite: "ormstave",
    flavor: "A rearing venom-wyrm carved into many a warning stave.",
    cry: { base: 170, sweep: 1.7, wave: "sawtooth", dur: 0.34 },
  }),
];

export const SPECIES_INDEX: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export function getSpecies(id: string): Species {
  const s = SPECIES_INDEX[id];
  if (!s) throw new Error(`Unknown species: ${id}`);
  return s;
}

/** Which starter counters which (starter triangle used by the rival AI). */
export const STARTERS = ["embercub", "snowpup", "stormchick"] as const;
export type StarterId = (typeof STARTERS)[number];

export function rivalStarterFor(playerStarter: StarterId): StarterId {
  // The rival always takes the starter with the elemental advantage.
  if (playerStarter === "embercub") return "stormchick"; // lightning > fire
  if (playerStarter === "snowpup") return "embercub"; // fire > ice
  return "snowpup"; // ice > lightning
}
