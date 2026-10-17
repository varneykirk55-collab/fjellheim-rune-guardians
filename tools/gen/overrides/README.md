# Hand-painted art overrides

All game art is generated from code (`npm run assets`). To refine a single
tile or object by hand, paint it in LibreSprite or Aseprite and drop the PNG
here. The generator then uses your file instead of its own drawing.

| Put the file at | Size | Example |
| --- | --- | --- |
| `tiles/<tile key>.png` | 16×16 | `tiles/floor@home~0.png` |
| `objects/<object key>.png` | same as the generated PNG in `public/assets/` | `objects/chest.png` (16×16) |
| `chars/<character key>.png` | 384×32: 12 frames of 32×32 (down, up, right, left × stand, step, step) | `chars/eirik.png` |

The two protagonists (`chars/eirik.png`, `chars/astri.png`) ship as overrides:
they are hand-pixelled from the approved designs. Their source grids and build
script are in `art/protagonists/` (`python3 art/protagonists/build.py`).

1. Start from the generated file: copy `public/assets/<key>.png` (objects), or
   cut the 16×16 tile out of `public/assets/tiles.png` (the key → index map is
   in `src/assets/layout.ts`).
2. Edit with the shared palette in `tools/gen/village-palette.mjs`. Keep the
   1px ink outline on objects; ground tiles have no outline.
3. Export as PNG with the same size and transparency (LibreSprite: *File →
   Export*; from the command line `libresprite -b in.ase --save-as out.png`, or
   `aseprite -b in.ase --save-as out.png`).
4. Run `npm run assets`. It lists the overrides it used, and it stops with an
   error if a file's size is wrong or its name doesn't match a generated key.
   Sizes are fixed because map footprints and collision depend on them.

Multi-frame objects (`runering`, `waterfall`) keep their frames stacked
vertically in one PNG. Animated tiles have one key per frame (`hearth`,
`hearth_f1`, `hearth_f2`).

## Ground fills

A tile override replaces one finished key. A **fill** replaces the texture of a
whole ground family, and the generator rebuilds every edge tile from it:

| Put the file at | Size | Rebuilds |
| --- | --- | --- |
| `fills/grass~0.png` … `fills/grass~7.png` | 16×16 | that grass variant; the lowest supplied one also colours the grass fringe on every path, sand and cobble edge |
| `fills/path.png`, `path2`, `sand`, `sand2`, `cobble`, `cobble2` | 16×16 | the base key plus all 48 edge keys (`path#<mask>`, `path#<mask>~1`, `path#<mask>~2`) |

- The edges keep the generator's 16 neighbour masks, three fringe profiles,
  grass lips and contact shadow; only the texture under them changes. With a
  painted grass fill the fringe keeps its lit and shaded lips, scaled from the
  painted colour.
- A fill must be exactly 16×16, fully opaque, and named exactly as above, or
  `npm run assets` stops.
- Paint fills to tile seamlessly. The build prints a **seam score** per fill:
  the left/right and top/bottom wraparound difference divided by the
  texture's own pixel-to-pixel difference (about 1 or less is seamless). Above
  2 it warns but still builds. Generated textures score 0–1.5.
- The map alternates `path`/`path2`, `sand`/`sand2` and `cobble`/`cobble2`
  cells; supplying only one of a pair warns, because the other stays generated.
- Tile overrides in `tiles/` are applied after fills, so a single painted edge
  key still wins.
- Tiles that borrow a family's colours are recoloured from its fill, keeping
  their shapes: with a grass fill, `grass`, `grass2`, `grass3`, `meadow`,
  `grass_clover`, `grass_clump`, the `creep` blades and `inner` corners; with
  a path fill, the `blend_dirt` tongues; with a sand fill, `blend_sand` and
  `wet`. The grass's contact shadow on each family's edge tiles follows that
  family's fill. Pixels of the ramp's base colour take the fill's own pixel;
  the other shades keep their relation to it, scaled from the fill's most
  common colour. Flowers, foam and cast shadows keep their colours.
- Still generated green: cliff tops and faces, and the plant decorations
  (`tuft`, `fern`, `reeds`, flower and heather stems).
