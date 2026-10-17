# Art tooling evaluation (Phase 2C)

Fjellheim's art is generated from code (`tools/gen/*.mjs`), and its maps are
TypeScript data (`src/data/maps/*.ts`). In Phase 2C we asked whether Tiled,
LibreSprite or Aseprite should join that pipeline. Each tool had to show a
real advantage, keep the asset pipeline reproducible, and add no runtime
dependency. None of their source code was copied into this repository.

## Summary

| | Tiled | LibreSprite | Aseprite |
| --- | --- | --- | --- |
| Purpose | Tile map editor | Pixel-art editor (Aseprite 1.1 fork) | Pixel-art editor |
| License | Editor: GPL-2.0. libtiled, `tmxrasterizer` and `tmxviewer`: BSD-2-Clause. Map files are open formats (TMX/TMJ) | GPL-2.0 | Proprietary EULA (paid binaries; the source can be compiled for personal use, but builds may not be redistributed) |
| Runs in this cloud container | Yes. Tiled 1.8.2 from apt; its CLI runs headless with `QT_QPA_PLATFORM=offscreen` | No. Release downloads were blocked by the network policy, and it has no headless UI | Not attempted: paid, no package available |
| Command line | `--export-map`, `tmxrasterizer` (renders a map to PNG) | `-b/--batch`, `--save-as`, `--sheet`, `--data` (sprite sheet + JSON) | Same as LibreSprite plus newer options (`--split-layers`, tags, scripts) |
| File formats Phaser reads | TMJ/JSON via `load.tilemapTiledJSON` | PNG; sprite sheet JSON in the Aseprite hash/array format | PNG; JSON via `load.aseprite` |
| Fit with our maps | Medium. Gameplay data (story triggers, NPC conditions, autotiling, collision rules, map tests) lives in code | — | — |
| Fit with our art | — | Good for hand-touching single tiles or props | Same, plus better animation tooling |

## Decisions

### Tiled: adopted for one-way export, not as the map source

The authoring loop stays in code. `src/data/maps/visual.ts` chooses edge,
corner and wall variants from a stable hash. Story triggers, NPC
`showIf`/`hideIf` rules and composition tests all read the TypeScript maps.
Authoring in Tiled would create a second source of truth that drifts from
them, and Tiled's own autotiling (Wang sets) would have to reproduce our
variant rules exactly.

Tiled is still useful for **seeing and reviewing** maps, so it gets a small
exporter:

```
npm run maps:tiled                       # writes tools/tiled/out/*.tmj (git-ignored)
QT_QPA_PLATFORM=offscreen tmxrasterizer tools/tiled/out/seer.tmj seer.png
```

`tools/tiled/export-maps.mjs` writes one `.tmj` file per map with:

- **Tile layers:** the four render layers exactly as the game draws them
  (`ground`, `edge`, `corner`, `deco`). Tiles are from `fjellheim.tsj`, with
  art keys as tile properties and the hearth/water animations included.
- **`scenery` layer:** buildings, props and objects as image objects (from
  `objects.tsj`), with `solid`, `foot`, `layer` and `blend` properties.
- **`gameplay` layer:** warps and doors (with destinations), NPCs, signs and
  story step triggers.
- **`collision` layer:** solid tiles as merged runs. It is hidden by default;
  toggle it on to review blocking.

Coordinates match the map data 1:1, so a placement tried out in Tiled can be
copied back into the TypeScript map. Edits are deliberately **not imported**.
`tmxrasterizer` renders were checked against the in-game screenshots; known
gap: multi-frame objects such as the rune ring show both frames stacked.

### LibreSprite: recommended for hand-painting, through art overrides

LibreSprite is a GUI application and could not run in this container. Its
formats and CLI still work with our pipeline: it edits PNG directly, and
`libresprite -b in.ase --save-as out.png` converts files in batch. Rather than
moving art out of code, `tools/gen/overrides.mjs` adds a narrow entry point:

- Put a PNG at `tools/gen/overrides/tiles/<tile key>.png` (16×16) or at
  `tools/gen/overrides/objects/<object key>.png` (the generated size).
- `npm run assets` then uses it in place of the coded drawing and lists which
  overrides were applied.
- A file with the wrong size, or a name that matches no generated key, stops
  the build. Footprints and collision depend on those sizes.

See `tools/gen/overrides/README.md` for the workflow. The path was verified
end to end:

- A recoloured `chest.png` was picked up.
- A 16×13 file was rejected with a clear error.
- Removing the override restored byte-identical output.

`tests/art-overrides.test.mjs` covers these cases. No overrides ship with this
pass; all interior art is still generated.

### Aseprite: not adopted (same role as LibreSprite)

Aseprite would serve the same override path and has better animation tools.
Its EULA forbids redistributing builds, and it costs money for each artist,
so it is optional per person rather than a project requirement. Its PNG
output works with the overrides as-is. If animated sprites are ever authored
in it, Phaser's `load.aseprite` can read its JSON sheets directly, but nothing
needs that yet.

## What was not adopted, and why

- **Phaser Tiled loading at runtime:** it would duplicate `visual.ts`, and it
  cannot express our hash-chosen variants or the story and NPC conditions.
- **Committing `.tmj`/`.ase` sources:** these would be generated or binary
  side files that could drift from the code. The export is reproducible on
  demand instead.
- **New npm dependencies:** none were added. The exporter uses Vite, which
  is already installed, to load the TypeScript maps.
