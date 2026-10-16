// visual.ts - which graphic to draw for each map cell (pure, render-only).
//
// The map grid stays the single source of truth for gameplay (collision,
// encounters, story triggers). This module only decides presentation:
// - decorations (flowers, fences, signs, ...) go on an overlay layer, and the
//   ground beneath them is inferred from the surrounding cells;
// - ground families (path, sand, cobble, water) pick an edge variant from a
//   4-bit neighbour mask so transitions are soft instead of square;
// - cliffs pick plateau / upper face / base face by their position in the
//   cliff mass.
// Any variant missing from the tileset falls back to the cell's own key.
import { MapDef } from "./types";
import { tileKeyAt, tileMeta } from "./collision";

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

type Group = "grass" | "path" | "sand" | "cobble" | "water" | "cliff";

const GROUP: Record<string, Group> = {
  grass: "grass",
  grass2: "grass",
  grass3: "grass",
  meadow: "grass",
  forestfloor: "grass",
  tallgrass: "grass",
  path: "path",
  path2: "path",
  sand: "sand",
  sand2: "sand",
  cobble: "cobble",
  cobble2: "cobble",
  water: "water",
  shore_water: "water",
  dock: "water",
  cliff_top: "cliff",
  cliff_face: "cliff",
  cliff_face_grass: "cliff",
};

/** fence pieces join to each other */
const FENCE = new Set(["fence_h", "fence_v", "fence_post"]);

export interface CellVisual {
  ground: string;
  deco: string | null;
}

const DIRS: [number, number, number][] = [
  [0, -1, N],
  [1, 0, E],
  [0, 1, S],
  [-1, 0, W],
];

export function isDeco(key: string | null): boolean {
  return !!key && !!tileMeta(key)?.deco;
}

/**
 * Compute ground + overlay keys for every cell. `has(key)` reports whether the
 * tileset contains a variant, so maps without the new art degrade gracefully.
 */
export function buildVisuals(map: MapDef, has: (key: string) => boolean): CellVisual[][] {
  const h = map.grid.length;
  const w = map.grid[0].length;
  const raw = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? null : tileKeyAt(map, x, y));

  // 1. ground key per cell: decorations take the most common neighbouring ground
  const ground: (string | null)[][] = [];
  for (let y = 0; y < h; y++) {
    ground.push([]);
    for (let x = 0; x < w; x++) {
      const k = raw(x, y);
      ground[y].push(isDeco(k) ? null : k);
    }
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (ground[y][x] !== null || raw(x, y) === null) continue;
      ground[y][x] = inferGround(ground, x, y);
    }

  const groupAt = (x: number, y: number): Group | null => {
    const k = x < 0 || y < 0 || x >= w || y >= h ? null : ground[y][x];
    return k ? (GROUP[k] ?? null) : null;
  };
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const pick = (variant: string, fallback: string) => (has(variant) ? variant : fallback);

  // 2. choose variants
  const out: CellVisual[][] = [];
  for (let y = 0; y < h; y++) {
    out.push([]);
    for (let x = 0; x < w; x++) {
      const k = ground[y][x];
      if (!k) {
        out[y].push({ ground: "", deco: null });
        continue;
      }
      const g = GROUP[k];
      let groundKey = k;
      if (g === "path" || g === "sand" || g === "cobble") {
        // grass overhangs the terrain on every side that touches grass
        let mask = 0;
        for (const [dx, dy, bit] of DIRS) if (groupAt(x + dx, y + dy) === "grass") mask |= bit;
        groundKey = pick(`${k}#${mask}`, k);
      } else if (g === "water" && k !== "dock") {
        // foam wherever the water meets anything that is not water
        let mask = 0;
        for (const [dx, dy, bit] of DIRS)
          if (inBounds(x + dx, y + dy) && groupAt(x + dx, y + dy) !== "water") mask |= bit;
        groundKey = pick(`water#${mask}`, k);
      } else if (g === "cliff") {
        groundKey = cliffVariant(groupAt, inBounds, x, y, pick, k);
      }

      const r = raw(x, y);
      let deco: string | null = null;
      if (isDeco(r)) {
        deco = r;
        if (r === "fence_post") {
          let mask = 0;
          for (const [dx, dy, bit] of DIRS) if (FENCE.has(raw(x + dx, y + dy) ?? "")) mask |= bit;
          deco = pick(`fence_post#${mask}`, r!);
        }
      }
      out[y].push({ ground: groundKey, deco });
    }
  }
  return out;
}

function inferGround(ground: (string | null)[][], x: number, y: number): string {
  const counts = new Map<string, number>();
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const k = ground[y + dy]?.[x + dx];
      const g = k ? GROUP[k] : undefined;
      if (!k || !g || g === "cliff") continue;
      // orthogonal neighbours count double: they decide the visible seam
      counts.set(k, (counts.get(k) ?? 0) + (dx && dy ? 1 : 2));
    }
  let best = "grass";
  let bestN = 0;
  for (const [k, n] of counts) if (n > bestN) [best, bestN] = [k, n];
  return best;
}

/**
 * Three-quarter cliffs: the southern two rows of a cliff mass are its rock face
 * (upper row with an overhanging grass lip, base row meeting the ground); every
 * cell further north is the grassy plateau. Side bits mark exposed E/W edges.
 */
function cliffVariant(
  groupAt: (x: number, y: number) => Group | null,
  inBounds: (x: number, y: number) => boolean,
  x: number,
  y: number,
  pick: (variant: string, fallback: string) => string,
  fallback: string,
): string {
  const cliff = (cx: number, cy: number) => !inBounds(cx, cy) || groupAt(cx, cy) === "cliff";
  let side = 0;
  if (!cliff(x + 1, y)) side |= E;
  if (!cliff(x - 1, y)) side |= W;
  if (!cliff(x, y + 1)) return pick(`cliff_base#${side}`, fallback);
  if (!cliff(x, y + 2)) return pick(`cliff_upper#${side}`, fallback);
  const top = side | (cliff(x, y - 1) ? 0 : N);
  return pick(`cliff_top#${top}`, fallback);
}
