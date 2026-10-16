// typeChart.ts - configurable elemental effectiveness chart.
//
// PHASE 1 BASELINE CHART (documented for future balancing sessions).
// Multipliers: 2 = super effective, 0.5 = resisted, 0 = immune, absent = neutral (1).
//
// Design notes / established rules (do not remove without design approval):
//  - Spirit is immune to Steel attacks.        (steel -> spirit = 0)
//  - Earth is immune to Lightning attacks.     (lightning -> earth = 0)
//  - Shadow is immune to Spirit attacks.       (spirit -> shadow = 0)
//  - Starter triangle: Fire > Ice > Lightning > Fire (each 2x), forming the
//    classic advantage loop between the three divine guardian families.
//
// To rebalance later: edit CHART only. The engine and all UI read from here.
import { Element, ELEMENTS } from "./elements";

export type Chart = Partial<Record<Element, Partial<Record<Element, number>>>>;

export const TYPE_CHART: Chart = {
  fire: { ice: 2, steel: 2, fire: 0.5, water: 0.5, earth: 0.5, lightning: 0.5, primal: 0.5 },
  ice: { lightning: 2, wind: 2, earth: 2, fire: 0.5, ice: 0.5, water: 0.5, steel: 0.5 },
  lightning: { fire: 2, water: 2, wind: 2, ice: 0.5, earth: 0, steel: 0.5 },
  water: { fire: 2, earth: 2, water: 0.5, wind: 0.5 },
  earth: { fire: 2, lightning: 2, poison: 2, steel: 2, wind: 0.5 },
  wind: { earth: 2, shadow: 2, poison: 2, steel: 0.5, wind: 0.5 },
  spirit: { shadow: 0, spirit: 0.5, steel: 0.5 },
  shadow: { light: 2, spirit: 2, shadow: 0.5 },
  light: { shadow: 2, poison: 2, light: 0.5 },
  steel: { ice: 2, spirit: 0, fire: 0.5, water: 0.5, lightning: 0.5, steel: 0.5 },
  primal: { primal: 2, steel: 0.5, light: 0.5, spirit: 0.5 },
  arcane: { primal: 2, poison: 2, arcane: 0.5, steel: 0.5 },
  poison: { light: 2, steel: 0, earth: 0.5, poison: 0.5, shadow: 0.5, spirit: 0.5 },
};

/** Single-type effectiveness of an attacking element vs one defending element. */
export function singleEffectiveness(attacking: Element, defending: Element): number {
  return TYPE_CHART[attacking]?.[defending] ?? 1;
}

/** Dual (or single) defending types multiply. */
export function effectiveness(attacking: Element, defendingTypes: readonly Element[]): number {
  let m = 1;
  for (const t of defendingTypes) m *= singleEffectiveness(attacking, t);
  return m;
}

/** Validation helper used by tests to catch chart typos. */
export function validateChart(): string[] {
  const errors: string[] = [];
  for (const atk of Object.keys(TYPE_CHART) as Element[]) {
    if (!ELEMENTS.includes(atk)) errors.push(`unknown attacking element ${atk}`);
    const row = TYPE_CHART[atk]!;
    for (const def of Object.keys(row) as Element[]) {
      if (!ELEMENTS.includes(def)) errors.push(`unknown defending element ${def}`);
      const v = row[def]!;
      if (![0, 0.5, 1, 2].includes(v)) errors.push(`${atk}->${def} invalid multiplier ${v}`);
    }
  }
  // established immunities
  if (singleEffectiveness("steel", "spirit") !== 0) errors.push("Spirit must be immune to Steel");
  if (singleEffectiveness("lightning", "earth") !== 0) errors.push("Earth must be immune to Lightning");
  if (singleEffectiveness("spirit", "shadow") !== 0) errors.push("Shadow must be immune to Spirit");
  // starter triangle
  if (singleEffectiveness("fire", "ice") !== 2) errors.push("Fire must beat Ice");
  if (singleEffectiveness("ice", "lightning") !== 2) errors.push("Ice must beat Lightning");
  if (singleEffectiveness("lightning", "fire") !== 2) errors.push("Lightning must beat Fire");
  return errors;
}
