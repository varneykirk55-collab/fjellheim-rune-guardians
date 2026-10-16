// items.ts - data-driven item database with an expandable shop system.
export type ItemKind = "ball" | "heal" | "cure" | "key";

export interface Item {
  id: string;
  name: string;
  kind: ItemKind;
  price: number; // buy price in silver
  sellPrice: number;
  /** ball items: capture-rate bonus multiplier */
  ballBonus?: number;
  /** heal items: flat HP restored */
  healAmount?: number;
  /** cure items: status removed */
  cures?: string;
  /** whether the item is stocked in the Phase 1 shop (expandable later) */
  shopStock?: boolean;
  desc: string;
  icon: string; // icon frame key in icons.png
}

export const ITEMS: Item[] = [
  {
    id: "rune_ball",
    name: "Rune Ball",
    kind: "ball",
    price: 200,
    sellPrice: 100,
    ballBonus: 1,
    shopStock: true,
    desc: "A wooden sphere carved with binding runes. The runes glow when thrown.",
    icon: "rune_ball",
  },
  {
    id: "carved_ball",
    name: "Deep-Carved Ball",
    kind: "ball",
    price: 600,
    sellPrice: 300,
    ballBonus: 1.5,
    shopStock: false, // unlocked in a later phase
    desc: "A reinforced Rune Ball with deep-cut runes and an iron band. Catches more reliably.",
    icon: "carved_ball",
  },
  {
    id: "tonic",
    name: "Herb Tonic",
    kind: "heal",
    price: 300,
    sellPrice: 150,
    healAmount: 30,
    shopStock: true,
    desc: "A bitter fjord-herb tonic. Restores 30 HP.",
    icon: "tonic",
  },
  {
    id: "strong_tonic",
    name: "Strong Tonic",
    kind: "heal",
    price: 700,
    sellPrice: 350,
    healAmount: 80,
    shopStock: false,
    desc: "A potent brew of mountain herbs. Restores 80 HP.",
    icon: "strong_tonic",
  },
  {
    id: "antidote",
    name: "Moss Antidote",
    kind: "cure",
    price: 200,
    sellPrice: 100,
    cures: "poison",
    shopStock: true,
    desc: "Crushed moss salve that draws out poison.",
    icon: "antidote",
  },
];

export const ITEM_INDEX: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): Item {
  const it = ITEM_INDEX[id];
  if (!it) throw new Error(`Unknown item: ${id}`);
  return it;
}

/** Items available for purchase in the current phase (expandable list). */
export function shopInventory(): Item[] {
  return ITEMS.filter((i) => i.shopStock);
}
