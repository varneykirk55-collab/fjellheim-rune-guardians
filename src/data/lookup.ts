// lookup.ts - convenience re-exports & precomputed tables.
export { getItem, ITEMS, ITEM_INDEX, shopInventory } from "./items";
export { getMove, MOVES, MOVE_INDEX } from "./moves";
import { MOVE_INDEX } from "./moves";

export const MOVE_PP: Record<string, number> = Object.fromEntries(
  Object.values(MOVE_INDEX).map((m) => [m.id, m.pp]),
);
