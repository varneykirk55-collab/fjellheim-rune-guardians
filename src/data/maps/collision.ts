// collision.ts - static collision grid for a map (tiles, building footprints,
// solid props). Pure data so the same rules drive WorldScene and the map tests.
// NPCs and story creatures are added on top at runtime by WorldScene.
import { ASSET_LAYOUT } from "../../assets/layout";
import { MapDef } from "./types";

export const TILE_SIZE = 16;

type TileMeta = { solid: boolean; frames: number; encounter: boolean; deco?: boolean; overlay?: boolean };
type ObjectMeta = { w: number; h: number; frames?: number };

export function tileMeta(key: string): TileMeta | undefined {
  return (ASSET_LAYOUT.tileMeta as Record<string, TileMeta>)[key];
}

export function objectMeta(asset: string): ObjectMeta {
  const meta = (ASSET_LAYOUT.objects as Record<string, ObjectMeta>)[asset];
  if (!meta) throw new Error(`Unknown object asset: ${asset}`);
  return meta;
}

export function tileKeyAt(map: MapDef, x: number, y: number): string | null {
  const ch = map.grid[y]?.[x];
  if (ch === undefined) return null;
  return map.legend[ch] ?? null;
}

/** 1 = blocked. Row-major, width = map.grid[0].length. */
export function buildSolidGrid(map: MapDef): Uint8Array {
  const w = map.grid[0].length;
  const h = map.grid.length;
  const solid = new Uint8Array(w * h);
  const set = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < w && y < h) solid[y * w + x] = 1;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const key = tileKeyAt(map, x, y);
      if (key && tileMeta(key)?.solid) set(x, y);
    }
  }
  for (const b of map.buildings) {
    const x0 = b.x + (b.solidX ?? 0);
    const y0 = b.y + (b.solidY ?? 0);
    const wTiles = b.solidW ?? Math.round(objectMeta(b.asset).w / TILE_SIZE);
    for (let y = y0; y < y0 + b.solidH; y++) for (let x = x0; x < x0 + wTiles; x++) set(x, y);
  }
  for (const p of map.props) {
    if (!p.solid) continue;
    const meta = objectMeta(p.asset);
    const pw = Math.max(1, Math.round(meta.w / TILE_SIZE));
    const ph = Math.max(1, Math.round(meta.h / TILE_SIZE));
    for (let y = Math.floor(p.y); y < Math.floor(p.y) + ph; y++)
      for (let x = Math.floor(p.x); x < Math.floor(p.x) + pw; x++) set(x, y);
  }
  for (const o of map.objects ?? []) {
    if (o.solid === false) continue;
    const wTiles = Math.max(1, Math.round(objectMeta(o.asset).w / TILE_SIZE));
    const foot = o.foot ?? 1;
    for (let y = o.y - foot + 1; y <= o.y; y++) for (let x = o.x; x < o.x + wTiles; x++) set(x, y);
  }
  return solid;
}

/** tiles an object blocks (empty for non-solid objects) */
export function objectFootprint(o: { asset: string; x: number; y: number; foot?: number; solid?: boolean }): { x: number; y: number }[] {
  if (o.solid === false) return [];
  const wTiles = Math.max(1, Math.round(objectMeta(o.asset).w / TILE_SIZE));
  const out: { x: number; y: number }[] = [];
  for (let y = o.y - (o.foot ?? 1) + 1; y <= o.y; y++) for (let x = o.x; x < o.x + wTiles; x++) out.push({ x, y });
  return out;
}
