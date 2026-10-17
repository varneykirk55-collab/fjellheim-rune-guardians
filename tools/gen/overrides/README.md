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
