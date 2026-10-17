// export-maps.mjs - one-way export of every game map to Tiled (.tmj/.tsj).
//
// The TypeScript maps in src/data/maps stay the single source of truth: story
// triggers, collision, autotiling and the map tests all read them. This export
// lets artists open any map in the Tiled editor (https://www.mapeditor.org) to
// inspect layers, collision and object placement, or render it headlessly:
//
//   npm run maps:tiled
//   QT_QPA_PLATFORM=offscreen tmxrasterizer tools/tiled/out/home.tmj home.png
//
// Edits made in Tiled are NOT read back; copy changed coordinates into the
// TypeScript map (the tile coordinates in Tiled match the map data 1:1).
//
// Output (git-ignored): tools/tiled/out/<map>.tmj plus two tilesets:
//   fjellheim.tsj - the generated 16x16 atlas (public/assets/tiles.png), each
//                   tile tagged with its art key, animations included;
//   objects.tsj   - an image-collection tileset of every scenery object.
import { createServer } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "tools", "tiled", "out");
const ASSETS = join(ROOT, "public", "assets");
const T = 16;

const server = await createServer({ root: ROOT, logLevel: "error", server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { MAPS } = await server.ssrLoadModule("/src/data/maps/index.ts");
  const { buildVisuals } = await server.ssrLoadModule("/src/data/maps/visual.ts");
  const { buildSolidGrid } = await server.ssrLoadModule("/src/data/maps/collision.ts");
  const { STORY_EVENTS } = await server.ssrLoadModule("/src/data/story.ts");
  const { ASSET_LAYOUT } = await server.ssrLoadModule("/src/assets/layout.ts");
  mkdirSync(OUT, { recursive: true });
  const rel = (p) => relative(OUT, p).split("\\").join("/");

  /* ---- tileset: the generated atlas ---- */
  const tiles = ASSET_LAYOUT.tiles;
  const meta = ASSET_LAYOUT.tileMeta;
  const { cols, rows } = ASSET_LAYOUT.tileAtlas;
  const atlasTiles = Object.entries(tiles).map(([key, id]) => {
    const t = { id, properties: [{ name: "key", type: "string", value: key }] };
    if (meta[key].solid) t.properties.push({ name: "solid", type: "bool", value: true });
    const frames = meta[key].frames ?? 1;
    if (frames > 1 && !key.includes("_f")) {
      t.animation = Array.from({ length: frames }, (_, f) => ({ tileid: tiles[f ? `${key}_f${f}` : key], duration: 240 }));
    }
    return t;
  });
  writeJson("fjellheim.tsj", {
    type: "tileset",
    version: "1.8",
    name: "fjellheim",
    image: rel(join(ASSETS, "tiles.png")),
    imagewidth: cols * T,
    imageheight: rows * T,
    tilewidth: T,
    tileheight: T,
    columns: cols,
    tilecount: Object.keys(tiles).length,
    margin: 0,
    spacing: 0,
    tiles: atlasTiles,
  });

  /* ---- tileset: scenery objects (image collection) ---- */
  const objKeys = Object.keys(ASSET_LAYOUT.objects);
  const objId = new Map(objKeys.map((k, i) => [k, i]));
  const objMeta = (k) => ASSET_LAYOUT.objects[k];
  // multi-frame objects (waterfall, rune ring) are stacked vertically; the
  // export shows the whole strip, which is enough to see the placement
  writeJson("objects.tsj", {
    type: "tileset",
    version: "1.8",
    name: "objects",
    columns: 0,
    grid: { orientation: "orthogonal", width: 1, height: 1 },
    tilewidth: Math.max(...objKeys.map((k) => objMeta(k).w)),
    tileheight: Math.max(...objKeys.map((k) => objMeta(k).h * (objMeta(k).frames ?? 1))),
    tilecount: objKeys.length,
    margin: 0,
    spacing: 0,
    tiles: objKeys.map((k, i) => ({
      id: i,
      image: rel(join(ASSETS, `${k}.png`)),
      imagewidth: objMeta(k).w,
      imageheight: objMeta(k).h * (objMeta(k).frames ?? 1),
    })),
  });
  const OBJ_FIRST = Object.keys(tiles).length + 1;

  /* ---- one .tmj per map ---- */
  for (const m of Object.values(MAPS)) {
    const w = m.grid[0].length;
    const h = m.grid.length;
    const has = (k) => tiles[k] !== undefined;
    const vis = buildVisuals(m, has);
    let layerId = 1;
    let objectId = 1;
    const gid = (k) => (k && tiles[k] !== undefined ? tiles[k] + 1 : 0);
    const tileLayer = (name, pickKey) => ({
      type: "tilelayer",
      id: layerId++,
      name,
      x: 0,
      y: 0,
      width: w,
      height: h,
      opacity: 1,
      visible: true,
      data: vis.flatMap((row) => row.map((c) => gid(pickKey(c)))),
    });
    const prop = (name, type, value) => ({ name, type, value });
    const point = (name, type, x, y, props = []) => ({ id: objectId++, name, type, x: x * T + T / 2, y: y * T + T / 2, point: true, width: 0, height: 0, rotation: 0, visible: true, properties: props });
    const rect = (name, type, x, y, rw, rh, props = []) => ({ id: objectId++, name, type, x: x * T, y: y * T, width: rw * T, height: rh * T, rotation: 0, visible: true, properties: props });
    const image = (asset, x, yBottom, props = []) => ({
      id: objectId++,
      name: asset,
      type: "scenery",
      gid: OBJ_FIRST + objId.get(asset),
      x,
      y: yBottom,
      width: objMeta(asset).w,
      height: objMeta(asset).h * (objMeta(asset).frames ?? 1),
      rotation: 0,
      visible: true,
      properties: props,
    });

    const layers = [
      tileLayer("ground", (c) => c.ground),
      tileLayer("edge", (c) => c.edge),
      tileLayer("corner", (c) => c.corner),
      tileLayer("deco", (c) => c.deco),
    ];
    // scenery: buildings and props are anchored top-left, objects bottom-left
    // (Tiled tile objects are anchored bottom-left, so convert)
    const scenery = [];
    for (const b of m.buildings) scenery.push(image(b.asset, b.x * T, b.y * T + objMeta(b.asset).h, [prop("solidRows", "int", b.solidH)]));
    for (const p of m.props) scenery.push(image(p.asset, p.x * T, p.y * T + objMeta(p.asset).h * (objMeta(p.asset).frames ?? 1), [prop("solid", "bool", !!p.solid)]));
    for (const o of m.objects ?? []) {
      const props = [prop("solid", "bool", o.solid !== false), prop("foot", "int", o.foot ?? 1)];
      if (o.layer) props.push(prop("layer", "string", o.layer));
      if (o.blend) props.push(prop("blend", "string", o.blend));
      scenery.push(image(o.asset, o.x * T, (o.y + 1) * T, props));
    }
    layers.push({ type: "objectgroup", id: layerId++, name: "scenery", draworder: "topdown", opacity: 1, visible: true, x: 0, y: 0, objects: scenery });

    // gameplay: warps, NPCs, signs, story triggers, merged collision runs
    const play = [];
    for (const wp of m.warps) play.push(rect(`warp to ${wp.to.map}`, "warp", wp.x, wp.y, 1, 1, [prop("to", "string", `${wp.to.map} ${wp.to.x},${wp.to.y} ${wp.to.dir}`)]));
    for (const b of m.buildings) if (b.door) play.push(rect(`door to ${b.door.to.map}`, "warp", b.door.x, b.door.y, 1, 1, [prop("to", "string", `${b.door.to.map} ${b.door.to.x},${b.door.to.y} ${b.door.to.dir}`)]));
    for (const n of m.npcs) play.push(point(n.id, "npc", n.x, n.y, [prop("char", "string", n.char), prop("dir", "string", n.dir)]));
    for (const s of m.signs) play.push(point("sign", "sign", s.x, s.y, [prop("text", "string", s.text.join("\n"))]));
    for (const ev of STORY_EVENTS) {
      if (ev.map !== m.id || ev.trigger.type !== "step") continue;
      const t = ev.trigger;
      play.push(rect(ev.id, "story", t.x, t.y, t.w, t.h));
    }
    layers.push({ type: "objectgroup", id: layerId++, name: "gameplay", draworder: "topdown", opacity: 1, visible: true, x: 0, y: 0, objects: play });

    const solid = buildSolidGrid(m);
    const blocks = [];
    for (let y = 0; y < h; y++) {
      let x = 0;
      while (x < w) {
        if (!solid[y * w + x]) {
          x++;
          continue;
        }
        const x0 = x;
        while (x < w && solid[y * w + x]) x++;
        blocks.push(rect("solid", "collision", x0, y, x - x0, 1));
      }
    }
    layers.push({ type: "objectgroup", id: layerId++, name: "collision", color: "#ff3030", opacity: 0.45, visible: false, x: 0, y: 0, draworder: "topdown", objects: blocks });

    writeJson(`${m.id}.tmj`, {
      type: "map",
      version: "1.8",
      tiledversion: "1.8.2",
      orientation: "orthogonal",
      renderorder: "right-down",
      width: w,
      height: h,
      tilewidth: T,
      tileheight: T,
      infinite: false,
      backgroundcolor: "#1a1220",
      nextlayerid: layerId,
      nextobjectid: objectId,
      properties: [prop("name", "string", m.name), prop("indoors", "bool", m.indoors), prop("source", "string", "src/data/maps (export only - edits are not read back)")],
      tilesets: [
        { firstgid: 1, source: "fjellheim.tsj" },
        { firstgid: OBJ_FIRST, source: "objects.tsj" },
      ],
      layers,
    });
  }
  console.log(`Tiled export: ${Object.keys(MAPS).length} maps -> ${relative(ROOT, OUT)}/`);
} finally {
  await server.close();
}

function writeJson(name, data) {
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 1) + "\n");
}
