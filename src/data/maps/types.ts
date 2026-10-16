// maps/types.ts - map data structures. Maps are pure data (string grids +
// object lists) so new areas can be added without touching engine code.
import { Facing } from "../../core/save";

export interface WarpTarget {
  map: string;
  x: number;
  y: number;
  dir: Facing;
}

export interface BuildingDef {
  asset: string;
  x: number; // tile coords of top-left
  y: number;
  solidH: number; // how many tile rows are solid (from y)
  door?: { x: number; y: number; to: WarpTarget }; // walkable trigger tile in front
}

export interface PropDef {
  asset: string;
  x: number; // tile coords (floats allowed for pixel nudging)
  y: number;
  solid?: boolean;
  scale?: number;
  /** animated multi-frame object (waterfall, runering) */
  anim?: boolean;
  /** creature sprite standing on this prop (starter pedestals etc.) */
  creature?: string;
}

export interface NpcDef {
  id: string;
  char: string;
  x: number;
  y: number;
  dir: Facing;
  scale?: number;
  /** only present when this flag is truthy / falsy */
  showIf?: string;
  hideIf?: string;
}

export interface SignDef {
  x: number;
  y: number;
  text: string[];
}

export interface EncounterTable {
  rate: number; // chance per grass step 0..1
  table: { species: string; min: number; max: number; weight: number }[];
}

export interface MapDef {
  id: string;
  name: string;
  music: string;
  indoors: boolean;
  grid: string[];
  legend: Record<string, string>; // char -> tile key
  buildings: BuildingDef[];
  props: PropDef[];
  warps: WarpDef[];
  npcs: NpcDef[];
  signs: SignDef[];
  encounters?: EncounterTable;
}

export interface WarpDef {
  x: number;
  y: number;
  to: WarpTarget;
}
