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
  /** flat on the floor (rune ring): always drawn under characters */
  floor?: boolean;
  /** creature sprite standing on this prop (starter pedestals etc.) */
  creature?: string;
}

/**
 * A placed scenery object (tree, barrel, garden...), anchored by its
 * bottom-left tile: the image extends up and right from (x, y). Only the
 * bottom `foot` rows (default 1) of its width block movement, unless
 * `solid` is false (e.g. torches mounted on an already-solid cliff).
 */
export interface ObjectDef {
  asset: string;
  x: number;
  y: number;
  foot?: number;
  solid?: boolean;
  /** "floor": drawn flat on the floor, under every character (light pools) */
  layer?: "floor";
  /** "add": additive blending, for light */
  blend?: "add";
}

/** a small hand-placed, non-blocking decoration tile (flowers, ferns, pebbles) */
export interface DecorDef {
  key: string;
  x: number;
  y: number;
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
  /** hand-placed scenery objects (render + footprint collision) */
  objects?: ObjectDef[];
  /** hand-placed non-blocking decoration tiles (render only) */
  decor?: DecorDef[];
}

export interface WarpDef {
  x: number;
  y: number;
  to: WarpTarget;
}
