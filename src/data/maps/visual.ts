// visual.ts - which graphics to draw for each map cell (pure, render-only).
//
// The map grid stays the single source of truth for gameplay (collision,
// encounters, story triggers). This module only decides presentation, as four
// stacked tile layers per cell:
// - ground: grass variants, autotiled path/sand/cobble/water, cliff roles;
// - edge:   soft transitions (creeping blades, sand/soil
//           tongues, wet sand at the waterline);
// - corner: inner-corner grass nubs and foam;
// - deco:   decorations (grid decorations plus hand-placed MapDef.decor),
//           with the ground beneath inferred from the surrounding cells.
// Variety comes from a stable position hash, so the same map always looks the
// same. Any variant missing from the tileset falls back to a plainer key.
import { MapDef } from "./types";
import { tileKeyAt, tileMeta } from "./collision";

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
const NE = 1;
const SE = 2;
const SW = 4;
const NW = 8;

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

/** plain grass keys that get position-chosen variants */
const PLAIN_GRASS = new Set(["grass", "grass2", "grass3", "meadow"]);
const GRASS_VARIANTS = 8;
const GRASS_FEATURES = ["grass_clover", "grass_clump"];
const EDGE_PROFILES = 3;

/** fence pieces join to each other */
const FENCE = new Set(["fence_h", "fence_v", "fence_post"]);

export interface CellVisual {
  ground: string;
  edge: string | null;
  corner: string | null;
  deco: string | null;
}

const DIRS: [number, number, number][] = [
  [0, -1, N],
  [1, 0, E],
  [0, 1, S],
  [-1, 0, W],
];
/** diagonal bit, and the two orthogonal neighbours that frame that corner */
const DIAGS: [number, number, number][] = [
  [1, -1, NE],
  [1, 1, SE],
  [-1, 1, SW],
  [-1, -1, NW],
];

export function isDeco(key: string | null): boolean {
  return !!key && !!tileMeta(key)?.deco;
}

/** stable per-cell hash (same map -> same picture) */
export function cellHash(x: number, y: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

/**
 * Compute every layer for every cell. `has(key)` reports whether the tileset
 * contains a variant, so maps without the new art degrade gracefully.
 */
export function buildVisuals(map: MapDef, has: (key: string) => boolean): CellVisual[][] {
  if (map.indoors) return buildInteriorVisuals(map, has);
  const h = map.grid.length;
  const w = map.grid[0].length;
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const raw = (x: number, y: number) => (inBounds(x, y) ? tileKeyAt(map, x, y) : null);

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
    const k = inBounds(x, y) ? ground[y][x] : null;
    return k ? (GROUP[k] ?? null) : null;
  };
  const pick = (variant: string, fallback: string) => (has(variant) ? variant : fallback);
  const maskOf = (x: number, y: number, test: (g: Group | null, nx: number, ny: number) => boolean) => {
    let m = 0;
    for (const [dx, dy, bit] of DIRS) if (test(groupAt(x + dx, y + dy), x + dx, y + dy)) m |= bit;
    return m;
  };

  const decorAt = new Map<string, string>();
  for (const d of map.decor ?? []) decorAt.set(`${d.x},${d.y}`, d.key);

  // 2. choose variants and overlays
  const out: CellVisual[][] = [];
  for (let y = 0; y < h; y++) {
    out.push([]);
    for (let x = 0; x < w; x++) {
      const k = ground[y][x];
      if (!k) {
        out[y].push({ ground: "", edge: null, corner: null, deco: null });
        continue;
      }
      const hash = cellHash(x, y);
      const g = GROUP[k];
      let groundKey = k;
      let edge: string | null = null;
      let corner: string | null = null;
      const v = (hash >>> 9) & 1;

      if (g === "grass" && PLAIN_GRASS.has(k)) {
        groundKey =
          hash % 100 < 7
            ? pick(GRASS_FEATURES[(hash >>> 8) % GRASS_FEATURES.length], k)
            : pick(`grass~${(hash >>> 4) % GRASS_VARIANTS}`, k);
      } else if (g === "path" || g === "sand" || g === "cobble") {
        // grass overhangs the terrain on every side that touches grass
        const toGrass = maskOf(x, y, (n) => n === "grass");
        const pattern = hash & 2 ? g : `${g}2`;
        const prof = (hash >>> 5) % EDGE_PROFILES;
        const key = `${pattern}#${toGrass}${prof ? `~${prof}` : ""}`;
        groundKey = pick(key, pick(`${k}#${toGrass}`, k));

        if (g === "path") {
          const toSand = maskOf(x, y, (n) => n === "sand");
          if (toSand) edge = pick(`blend_sand#${toSand}~${v}`, "") || null;
          else if (toGrass && hash % 3 === 0) edge = pick(`creep#${toGrass}~${v}`, "") || null;
        } else if (g === "sand") {
          const toWater = maskOf(x, y, (n) => n === "water");
          const toPath = maskOf(x, y, (n) => n === "path" || n === "cobble");
          if (toWater) edge = pick(`wet#${toWater}`, "") || null;
          else if (toPath) edge = pick(`blend_dirt#${toPath}~${v}`, "") || null;
        } else {
          const toPath = maskOf(x, y, (n) => n === "path");
          const toSand = maskOf(x, y, (n) => n === "sand");
          if (toPath) edge = pick(`blend_dirt#${toPath}~${v}`, "") || null;
          else if (toSand) edge = pick(`blend_sand#${toSand}~${v}`, "") || null;
        }
        // inner corners: grass only on the diagonal
        let c = 0;
        for (const [dx, dy, bit] of DIAGS)
          if (groupAt(x + dx, y + dy) === "grass" && groupAt(x + dx, y) !== "grass" && groupAt(x, y + dy) !== "grass") c |= bit;
        if (c) corner = pick(`inner#${c}`, "") || null;
      } else if (g === "water" && k !== "dock") {
        // foam wherever the water meets anything that is not water
        const toLand = maskOf(x, y, (n, nx, ny) => inBounds(nx, ny) && n !== "water");
        groundKey = pick(`water#${toLand}`, k);
        let c = 0;
        for (const [dx, dy, bit] of DIAGS) {
          const dg = groupAt(x + dx, y + dy);
          if (inBounds(x + dx, y + dy) && dg !== "water" && groupAt(x + dx, y) === "water" && groupAt(x, y + dy) === "water") c |= bit;
        }
        if (c) corner = pick(`foam_inner#${c}`, "") || null;
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
      } else {
        const placed = decorAt.get(`${x},${y}`);
        if (placed && has(placed)) deco = placed;
      }
      out[y].push({ ground: groundKey, edge, corner, deco });
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

/* ------------------------------------------------------------------ rooms */

const FLOOR_KEYS = new Set(["boards", "boards2"]);
const WALL_KEYS = new Set(["wall_int", "wall_int_banner"]);
/** furniture tall enough to rise in front of the wall face above it */
const TALL = new Set(["shelf", "bookshelf"]);
const FLOOR_VARIANTS = 4;
const WALL_VARIANTS = 4;

/**
 * Rooms, in the Platinum layout: the north wall band is a two-tile wall face
 * (upper/lower), every other wall cell is a dark beam top seen from above with
 * a rim toward the room, and walls cast a soft shadow onto the floor.
 * Furniture is drawn on the decoration layer over the room's floor. The room id
 * picks the material set (`floor@home~2`, `wall_lo@seer~1`, `banner@heal`).
 */
function buildInteriorVisuals(map: MapDef, has: (key: string) => boolean): CellVisual[][] {
  const h = map.grid.length;
  const w = map.grid[0].length;
  const room = map.id;
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const raw = (x: number, y: number) => (inBounds(x, y) ? tileKeyAt(map, x, y) : null);
  const isWall = (x: number, y: number): boolean => {
    if (!inBounds(x, y)) return true;
    const r = raw(x, y) ?? "";
    return WALL_KEYS.has(r) || (r === "hearth" && WALL_KEYS.has(raw(x, y - 1) ?? ""));
  };
  const isFaceLo = (x: number, y: number) => isWall(x, y) && inBounds(x, y + 1) && !isWall(x, y + 1) && inBounds(x, y - 1) && isWall(x, y - 1) && x > 0 && x < w - 1;
  const isFaceHi = (x: number, y: number) => isWall(x, y) && isFaceLo(x, y + 1);
  const isTop = (x: number, y: number) => isWall(x, y) && !isFaceLo(x, y) && !isFaceHi(x, y);
  /** room-specific art first, then the shared key */
  const themed = (base: string, v?: number) => {
    const opts = v === undefined ? [`${base}@${room}`, base] : [`${base}@${room}~${v}`, `${base}~${v}`, `${base}@${room}`, base];
    return opts.find(has) ?? base;
  };
  const decorAt = new Map<string, string>();
  for (const d of map.decor ?? []) decorAt.set(`${d.x},${d.y}`, d.key);

  const out: CellVisual[][] = [];
  for (let y = 0; y < h; y++) {
    out.push([]);
    for (let x = 0; x < w; x++) {
      const r = raw(x, y);
      const cell: CellVisual = { ground: r ?? "", edge: null, corner: null, deco: null };
      out[y].push(cell);
      if (!r) continue;
      const hash = cellHash(x, y);
      // wall faces vary per column, so the upper and lower halves always match
      const wv = cellHash(x, 0) % WALL_VARIANTS;
      if (isWall(x, y)) {
        if (isFaceLo(x, y)) {
          cell.ground = r === "hearth" && has("hearth_wall") ? "hearth_wall" : themed("wall_lo", wv);
          const below = raw(x, y + 1) ?? "";
          if (r === "wall_int_banner") cell.deco = themed("banner");
          else if (TALL.has(below)) cell.deco = furnitureKey(below, x, y + 1, true);
        } else if (isFaceHi(x, y)) {
          cell.ground = themed("wall_hi", wv);
          const below = raw(x, y + 1) ?? "";
          if (below === "wall_int_banner") cell.deco = themed("banner_top");
          else if (below === "hearth" && has("hearth_top")) cell.deco = "hearth_top";
        } else {
          let m = 0;
          for (const [dx, dy, bit] of DIRS) if (inBounds(x + dx, y + dy) && !isTop(x + dx, y + dy)) m |= bit;
          cell.ground = has(`wall_top#${m}`) ? `wall_top#${m}` : r;
          let c = 0;
          for (const [dx, dy, bit] of DIAGS)
            if (inBounds(x + dx, y + dy) && !isTop(x + dx, y + dy) && isTop(x + dx, y) && isTop(x, y + dy)) c |= bit;
          if (c && has(`wall_in#${c}`)) cell.corner = `wall_in#${c}`;
        }
        continue;
      }
      if (r === "door_int") {
        cell.ground = themed("door_int");
        continue;
      }
      const floor = themed("floor", (hash >>> 4) % FLOOR_VARIANTS);
      cell.ground = has(floor) ? floor : FLOOR_KEYS.has(r) ? r : nearestFloor(map, x, y);
      let shade = 0;
      if (isWall(x, y - 1)) shade |= N;
      if (isWall(x + 1, y)) shade |= E;
      if (isWall(x - 1, y)) shade |= W;
      if (shade && has(`fshade#${shade}`)) cell.edge = `fshade#${shade}`;
      if (!FLOOR_KEYS.has(r)) cell.deco = furnitureKey(r, x, y, false);
      else {
        const placed = decorAt.get(`${x},${y}`);
        if (placed && has(placed)) cell.deco = placed;
      }
    }
  }
  return out;

  function furnitureKey(r: string, x: number, y: number, top: boolean): string | null {
    const base = top ? `${r}_top` : r;
    if (r === "counter") {
      let m = 0;
      if (raw(x + 1, y) === "counter") m |= E;
      if (raw(x - 1, y) === "counter") m |= W;
      const k = [`counter@${room}#${m}`, `counter#${m}`].find(has);
      return k ?? (has(r) ? r : null);
    }
    if (r === "bookshelf") {
      // alternate the scroll racks so a run of them does not repeat
      const k = `${base}~${x % 2}`;
      if (has(k)) return k;
    }
    const k = themed(base);
    return has(k) ? k : null;
  }
}

function nearestFloor(map: MapDef, x: number, y: number): string {
  for (let d = 1; d < 4; d++)
    for (let dy = -d; dy <= d; dy++)
      for (let dx = -d; dx <= d; dx++) {
        const k = tileKeyAt(map, x + dx, y + dy);
        if (k && FLOOR_KEYS.has(k)) return k;
      }
  return "boards";
}
