// elements.ts - the thirteen elements of Fjellheim.
export const ELEMENTS = [
  "fire",
  "ice",
  "lightning",
  "water",
  "earth",
  "wind",
  "spirit",
  "shadow",
  "light",
  "steel",
  "primal",
  "arcane",
  "poison",
] as const;

export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_LABEL: Record<Element, string> = {
  fire: "Fire",
  ice: "Ice",
  lightning: "Lightning",
  water: "Water",
  earth: "Earth",
  wind: "Wind",
  spirit: "Spirit",
  shadow: "Shadow",
  light: "Light",
  steel: "Steel",
  primal: "Primal",
  arcane: "Arcane",
  poison: "Poison",
};

export const ELEMENT_COLOR: Record<Element, string> = {
  fire: "#e85d2a",
  ice: "#4a9ac8",
  lightning: "#c8a020",
  water: "#2f6e9e",
  earth: "#7a6238",
  wind: "#4aa894",
  spirit: "#5a7ac8",
  shadow: "#3c2c50",
  light: "#c8a840",
  steel: "#5f6672",
  primal: "#8a4a2a",
  arcane: "#6a3c8a",
  poison: "#5a7a2a",
};

export function isElement(v: string): v is Element {
  return (ELEMENTS as readonly string[]).includes(v);
}
