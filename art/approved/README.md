# Approved artwork recovered from screenshots

| File | What it is |
| --- | --- |
| `nordic-house-approved.png` | The approved Nordic turf-roof house screenshot (1374×1145, RGB). An unmodified copy of the reference. |
| `extract_house.py` | Rebuilds the game asset from that screenshot. Run `python3 art/approved/extract_house.py` (needs numpy, scipy and Pillow). |
| `../../tools/gen/art/nordic_house.png` | The recovered house: 160×96, transparent (alpha is only 0 or 255). `npm run assets` copies it to `public/assets/` unchanged. |

## How the house was recovered

1. **Native grid.** The screenshot is an upscaled render at about 6.2 screen
   pixels per art pixel, and the grid is not perfectly even.
   - Block boundaries are found column by column and row by row, wherever the
     colour changes.
   - Each block then takes the median colour of its inside.
   - Every colour comes from the screenshot. Nothing is reduced or redrawn.
   - Expanding the result back onto the recovered grid reproduces the
     screenshot to about 3/255 per channel.
2. **Mask.**
   - Some regions are marked as outside by hand: everything below the
     foundation line, the tree at top-left, and the cliff behind the roof's
     top-right (the boundary goes around the tall roof post).
   - A flood fill from the border then runs through grass, path and flower
     colours only, and stops at the house's dark outline.
   - The house's largest connected shape is kept.
   - Hand-checked trims remove grass outside the roof rim, grass beside the
     right corner post, and grass under the foundation.
   - The doorway sill's bottom row is the same tan as the path below it, so it
     is kept explicitly.
   - Nothing inside the outline is changed.
3. **Crop and pad.** The 135×93 house is padded to 160×96 (10×6 tiles) so the
   doorway's centre falls on a tile centre and the sill sits on the bottom row.

## In Bjorvik

The house replaces the old generated player house (`house_player` is still
generated but no longer placed).

- **Image:** placed at tile (4,5), covering columns 4–13 and rows 5–10.
- **Collision:** solid on columns 5–12 and rows 6–10, using
  `solidX`/`solidY`/`solidW`. The sparse roof line on row 5 can be walked
  behind, and the hero is drawn behind the roof there.
- **Door:** the doorstep is (9,11), as before, and the path now reaches it.
- **Layout:** `pine_1` moved to (2,9) and `shrub_0` to (4,12) to make room.

## Known limits

- **Edges:** the outline follows the screenshot's own pixels. The roof's
  turf-tuft top edge and the posts are kept exactly as drawn. A 2-pixel notch
  in the bottom row under the right end of the foundation is grass in the
  source.
- **No layers:** the screenshot is flat, so the house is a single image. The
  game already handles walking in front of and behind single-image buildings.
- **Surroundings not recovered:** the trees, cliffs and path around the house
  in the approved screenshot are not part of this asset.
