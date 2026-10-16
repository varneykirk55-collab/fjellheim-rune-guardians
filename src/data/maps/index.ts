// maps/index.ts - map registry.
import { MapDef } from "./types";
import { VILLAGE } from "./village";
import { ROUTE1 } from "./route1";
import { HOME, SEER_HALL, HEAL_HALL, SHOP, HOUSE_A, HOUSE_B } from "./interiors";

export const MAPS: Record<string, MapDef> = {
  village: VILLAGE,
  route1: ROUTE1,
  home: HOME,
  seer: SEER_HALL,
  heal: HEAL_HALL,
  shop: SHOP,
  houseA: HOUSE_A,
  houseB: HOUSE_B,
};

export function getMap(id: string): MapDef {
  const m = MAPS[id];
  if (!m) throw new Error(`Unknown map: ${id}`);
  return m;
}

export * from "./types";
