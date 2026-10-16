// index.mjs - runs the full asset generation pipeline.
// Outputs deterministic PNGs into public/assets/ and regenerates
// src/assets/layout.ts (single source of truth for frame indices).
import { writeFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pix } from "./pix.mjs";
import { buildTileset } from "./tiles.mjs";
import { buildChars } from "./chars.mjs";
import { buildCreatures } from "./creatures.mjs";
import * as OBJ from "./objects.mjs";
import * as VB from "./village-buildings.mjs";
import * as UI from "./ui.mjs";
import * as BG from "./backdrops.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url), ), "..", "..");
const OUT = join(ROOT, "public", "assets");
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "fonts"), { recursive: true });

const layout = { tiles: {}, tileMeta: {}, chars: {}, creatures: {}, objects: {}, ui: {} };

/* ---- tileset ---- */
const ts = buildTileset();
ts.pix.save(join(OUT, "tiles.png"));
layout.tiles = ts.layout;
layout.tileMeta = ts.meta;
layout.tileAtlas = { cols: ts.cols, rows: ts.rows, size: 16 };
console.log(`tiles.png  (${ts.count} tiles, ${ts.cols}x${ts.rows} grid)`);

/* ---- characters ---- */
const ch = buildChars();
ch.pix.save(join(OUT, "chars.png"));
layout.chars = ch.layout;
layout.charSheet = { w: 16, h: 24, framesPerChar: ch.cols, names: ch.names };
console.log(`chars.png  (${ch.names.length} characters)`);

/* ---- creatures ---- */
const cr = buildCreatures();
cr.pix.save(join(OUT, "creatures.png"));
layout.creatures = cr.layout;
layout.creatureSheet = { size: 64, cols: cr.cols };
console.log(`creatures.png  (${Object.keys(cr.layout).length} creatures)`);

/* ---- world objects ---- */
function saveObj(o) {
  o.pix.save(join(OUT, `${o.key}.png`));
  layout.objects[o.key] = { w: o.pix.w, h: o.pix.h };
  if (o.doorX !== undefined) layout.objects[o.key].door = { x: o.doorX, y: o.doorY };
  console.log(`${o.key}.png`);
}
// Bjorvik village pass (Platinum-style, Norse architecture)
saveObj(VB.longhouseSeer());
saveObj(VB.housePlayer());
saveObj(VB.houseNpc(0));
saveObj(VB.houseNpc(1));
saveObj(VB.healHall());
saveObj(VB.shop());
saveObj(VB.longship());
saveObj(VB.pineTree(0));
saveObj(VB.pineTree(1));
saveObj(OBJ.runeStones());
saveObj(OBJ.pedestal());

/* ---- animated objects (multi-frame single files) ---- */
function saveAnim(framesData) {
  const { frames, key, w, h } = framesData;
  const sheet = new Pix(w, h * frames.length);
  frames.forEach((f, i) => sheet.blit(f, 0, i * h));
  sheet.save(join(OUT, `${key}.png`));
  layout.objects[key] = { w, h, frames: frames.length };
  console.log(`${key}.png (${frames.length} frames)`);
}
saveAnim(OBJ.waterfallFrames());
saveAnim(OBJ.runeRingFrames());

/* ---- title rune circle ---- */
const trc = OBJ.titleRuneCircle();
trc.save(join(OUT, "rune_circle.png"));
layout.objects.rune_circle = { w: trc.w, h: trc.h };
console.log("rune_circle.png");

/* ---- backdrops ---- */
BG.titleBg().save(join(OUT, "title_bg.png"));
BG.battleMeadow().save(join(OUT, "battle_meadow.png"));
BG.battleForest().save(join(OUT, "battle_forest.png"));
BG.battleShore().save(join(OUT, "battle_shore.png"));
BG.battleIndoor().save(join(OUT, "battle_indoor.png"));
layout.ui.backdrops = { w: BG.BW, h: BG.BH };
console.log("backdrops (title + 4 battle)");

/* ---- UI sheet: icons on one atlas + panels separate ---- */
// icons.png: 16x16 cells, 16 per row
const icons = [
  ["rune_ball", UI.iconRuneBall(false)],
  ["rune_ball_glow", UI.iconRuneBall(true)],
  ["carved_ball", UI.iconRuneBall(false, true)],
  ["carved_ball_glow", UI.iconRuneBall(true, true)],
  ["tonic", UI.iconTonic(false)],
  ["strong_tonic", UI.iconTonic(true)],
  ["antidote", UI.iconAntidote()],
  ["silver", UI.iconSilver()],
  ["ball_pouch", UI.ballPouch()],
  ["save_rune", UI.saveRune()],
];
const iconSheet = new Pix(16 * 16, 16);
layout.ui.icons = {};
icons.forEach(([name, pix], i) => {
  iconSheet.blit(pix, (i % 16) * 16, ((i / 16) | 0) * 16);
  layout.ui.icons[name] = i;
});
iconSheet.save(join(OUT, "icons.png"));

// elements.png: 13 badges 16x16 in a row
const ELEMENTS = ["fire", "ice", "lightning", "water", "earth", "wind", "spirit", "shadow", "light", "steel", "primal", "arcane", "poison"];
const elSheet = new Pix(16 * ELEMENTS.length, 16);
layout.ui.elements = {};
ELEMENTS.forEach((el, i) => {
  elSheet.blit(UI.elementBadge(el), i * 16, 0);
  layout.ui.elements[el] = i;
});
elSheet.save(join(OUT, "elements.png"));

// panel.png / panel_alt.png / buttons / cursor
UI.panel().save(join(OUT, "panel.png"));
UI.panel("#3f6e77", "#1e2c38").save(join(OUT, "panel_alt.png"));
UI.button(false).save(join(OUT, "button.png"));
UI.button(true).save(join(OUT, "button_pressed.png"));
UI.cursor().save(join(OUT, "cursor.png"));
layout.ui.panel = { size: 32, margin: 10 };
layout.ui.button = { w: 32, h: 14, margin: 6 };
layout.ui.cursor = { w: 8, h: 8 };
console.log("ui panels/buttons/icons");

// touch controls
UI.dpad().save(join(OUT, "dpad.png"));
UI.touchButton("A", "#a63c2e").save(join(OUT, "btn_a.png"));
UI.touchButton("B", "#3c5a8a").save(join(OUT, "btn_b.png"));
UI.touchButton("M", "#4a6b3a").save(join(OUT, "btn_menu.png"));
layout.ui.dpad = { size: 96 };
layout.ui.touchButton = { size: 36 };
console.log("touch controls");

/* ---- font (OFL licensed, bundled locally) ---- */
const fontSrc = join(ROOT, "node_modules", "@fontsource", "press-start-2p", "files", "press-start-2p-latin-400-normal.woff2");
copyFileSync(fontSrc, join(OUT, "fonts", "press-start-2p.woff2"));
console.log("font copied (Press Start 2P, OFL)");

/* ---- write layout TS ---- */
const tsOut = `// AUTO-GENERATED by tools/gen/index.mjs - do not edit by hand.
// Frame indices & sizes shared between the asset generator and the game code.
export const ASSET_LAYOUT = ${JSON.stringify(layout, null, 2)} as const;

export type TileKey = keyof typeof ASSET_LAYOUT.tiles;
export type CharKey = keyof typeof ASSET_LAYOUT.chars;
export type CreatureSpriteKey = keyof typeof ASSET_LAYOUT.creatures;
`;
const srcAssets = join(ROOT, "src", "assets");
mkdirSync(srcAssets, { recursive: true });
writeFileSync(join(srcAssets, "layout.ts"), tsOut);
console.log("src/assets/layout.ts written");

// sanity: report generated files
const files = readdirSync(OUT);
console.log(`\nDone. ${files.length} asset files in public/assets/`);
