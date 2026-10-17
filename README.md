# Fjellheim: Rune Guardians

An original Viking-themed creature-collecting RPG for the browser (desktop + mobile,
landscape). Phase 1 delivers the opening playable sequence: home village **Bjorvik**,
the Seer's starter choice, a rival battle, **Whisperpine Path** (Route 1), a story
capture tutorial, wild battles, trainers, a shop, healing, and versioned save/load.

> All creatures, characters, art, music and text are original works created for this
> project. Nothing here is derived from Nintendo / Game Freak / Creatures Inc. properties.

## Quick start

```bash
git clone https://github.com/varneykirk55-collab/fjellheim-rune-guardians.git
cd fjellheim-rune-guardians
npm install
npm run dev        # http://localhost:5180 (binds 0.0.0.0)
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on port 5180 |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Vitest suite for the pure engine/data layers (incl. map reachability, input, dialogue paging, rival balance) |
| `npm run test:e2e` | Browser playthrough of the opening (new game -> rival -> capture -> heal -> save/reload) with real key presses; needs Playwright + Chromium (local or global install), screenshots in `test-results/e2e/` |
| `npm run assets` | Regenerate all pixel-art PNGs + `src/assets/layout.ts` (uses any hand-painted files in `tools/gen/overrides/`) |
| `npm run maps:tiled` | Export every map to Tiled (`tools/tiled/out/*.tmj`) for review; one-way, see `docs/ART-TOOLING.md` |

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Arrows / WASD | D-pad (left side) |
| Confirm / talk / advance | Z / Enter / Space | A button |
| Cancel / tab | X / Shift | B button |
| Pause menu | Esc / Q | MENU button |

Touch controls appear automatically on touch devices and can be forced on/off in
**Title > Settings** or the pause menu (**OPTIONS**).

## Phase 1 walkthrough (milestone sequence)

1. **New Adventure** on the title screen - choose your hero, **Eirik** or **Astri**.
2. You wake in your **home**; Mother sends you to the Seer. Walk onto the door mat to exit.
3. Cross the village to the **Seer's Longhouse** (north-west of the plaza). Stand on the
   rune ring: choose one of three starters (**Embercub** the fire bear, **Snowpup** the
   ice wolf, **Stormchick** the lightning raven).
4. Rival **Sten** takes the elementally-advantaged starter and battles you immediately
   (this teaches the battle menu: FIGHT / BAG / CREW / RUN).
5. Win and the Seer gives you **8 Rune Balls** + tonics; lose and you wake in the
   **Hall of Mending** with a rematch available.
6. Leave through the **north gate** to Whisperpine Path (the road skirts the longhouse's
   west side; the gate guard turns you back until you have a creature). A frightened wild **Bergling**
   blocks the path - the story forces a capture tutorial (no running). Weaken it, then
   throw a Rune Ball; capture is *not* guaranteed - shake, fail, retry.
7. Wild encounters also roam the tall grass (Bergling, Vindhare, Glodref, Ormling,
   levels 3-6). Two optional trainers (Herdis, Bjarni) guard the path.
8. Return south to the village: **Hall of Mending** heals your party for free,
   **Yrsa's Rune Goods** sells Rune Balls/Tonics/Antidotes (X toggles the sell tab).
9. **Esc > SAVE** writes a versioned save to `localStorage` (`fjellheim.save`).
   **Continue** on the title screen restores party, bag, flags, position and playtime.

## Architecture

Pure-data and engine layers have **zero Phaser imports** and are unit-tested headlessly.

```
src/
  assets/layout.ts      GENERATED asset metadata (never hand-edit)
  core/                 save.ts (versioned localStorage), session.ts (active run),
                        audio.ts (procedural chiptune + SFX + creature cries),
                        input.ts (keyboard + virtual touch, edge detection)
  data/                 elements.ts, typeChart.ts, moves.ts, items.ts, species.ts,
                        dialogues.ts, trainers.ts, story.ts (event/step scripts)
  data/maps/            build.ts (Grid helpers), legend.ts, village.ts, route1.ts,
                        interiors.ts, index.ts (registry) - maps are string grids
  battle/               types.ts, engine.ts (turn resolution, AI, capture, run),
                        progression.ts (exp curves, learnsets, evolution)
  ui/                   theme.ts, DialogueBox.ts (typewriter), TouchControls.ts
  scenes/               Boot -> Title -> World <-> Battle, Pause (overlay)
  main.ts               Phaser.Game config (512x288, Scale.FIT, pixelArt)
tools/gen/              deterministic PNG generators (pngjs); run `npm run assets`
tests/                  vitest suites (type chart, engine, progression, saves, data,
                        reachability, input, dialogue, rival balance)
tests/e2e/              Playwright opening-sequence playthrough (npm run test:e2e)
```

Scenes communicate through contracts, not globals: the world launches `battle` with a
`BattleConfig`; the battle scene emits `game.events.emit('battle-end', result, extra)`
and the world resumes, applies rewards and continues any pending story steps.

## Element chart (13 elements)

Fire, Ice, Lightning, Water, Earth, Wind, Spirit, Shadow, Light, Steel, Primal,
Arcane, Poison. The chart lives entirely in `src/data/typeChart.ts` (data, not code):
multipliers are limited to **2x / 0.5x / 0x / 1x**, dual-type matchups multiply, and
`validateChart()` enforces the design-fixed rules at test time:

- Spirit is immune to Steel
- Earth is immune to Lightning
- Shadow is immune to Spirit
- the starter triangle: Fire > Ice > Lightning > Fire

Balance tweaks only require editing that table; `tests/typeChart.test.ts` guards the
invariants.

## Art & audio pipeline

Every sprite, tile, backdrop and UI piece is generated programmatically by
`tools/gen/*.mjs` (pngjs) at a consistent pixel density (16px tiles, 16x24 characters,
64x64 creatures, 512x288 screens) and written to `public/assets/` with machine-readable
metadata in `src/assets/layout.ts`.

**Bjorvik village pass (Platinum-style):** exterior village tiles are drawn by
`tools/gen/village-tiles.mjs` and the buildings, pines and longship by
`tools/gen/village-buildings.mjs`, using the hue-shifted ramps in
`village-palette.mjs`. The world renders at an integer 2x (about 16x9 tiles on
screen, close to the DS framing). `src/data/maps/visual.ts` picks ground edge
variants, cliff roles and a separate decoration layer at render time; collision
still comes only from the map grid. `node tools/gen/preview.mjs out.png 4 <prefix>`
renders magnified tile previews for review.
Village scenery is composed by hand in map data: `MapDef.objects` (trees, firewood,
barrels, gardens...; anchored at the bottom-left tile, only the bottom `foot` rows
block movement) and `MapDef.decor` (non-blocking flowers, ferns, pebbles). Props are
drawn by `tools/gen/village-props.mjs`; `tests/village-composition.test.ts` keeps
them off paths, doors, warps, NPCs and story triggers.

**Interiors:** each room id selects a material set from
`tools/gen/interior-tiles.mjs`:

- **Home:** daub and timber with honey planks.
- **Seer's longhouse:** smoke-dark staves and a slate floor.
- **Hall of Mending:** lime-washed walls with birch boards.
- **Shop:** wattle and dark oak.
- **Fisherman's house:** salt-grey clapboard.
- **Weaver's house:** a woven band over a parquet floor.

`visual.ts` renders:

- the north wall as a two-tile face (upper/lower);
- other walls as dark beam tops;
- the shadow walls cast onto the floor;
- furniture as transparent tiles over the floor, with shelves and banners rising into the wall.

Room-specific pieces (Yggdrasil panel, braziers, healer cots, goods rack, loom, light pools...) come from
`tools/gen/interior-props.mjs` and are placed through `MapDef.objects`. Wall pieces use `solid: false`; light uses
`layer: "floor"` and `blend: "add"`. `tests/interiors.test.ts` checks that collision and doorways are unchanged.
Tooling notes (Tiled export, LibreSprite/Aseprite overrides): `docs/ART-TOOLING.md`. Music and SFX are synthesized at runtime with the
WebAudio API (no audio files, no licensing concerns). Fonts: Press Start 2P (OFL).

## Save format

`localStorage["fjellheim.save"]`, JSON, `v: 1`. Contains player name/look, position,
party, storage box, bag, story flags, stats, playtime and settings. Loading runs
migration hooks then structural validation; corrupt saves are rejected, not crashed on.

## Known limitations (Phase 1)

- Storage box is data-only; no PC/box browsing UI yet (party overflow is stored safely).
- Vindhare and Glodref evolution lines are single-stage for now.
- The third starter stays with the Seer (reserved for a postgame quest).
- Rival arc ends at the first battle (Champion storyline is a later phase).
- Landscape-only by design; portrait shows a rotate-device notice.
