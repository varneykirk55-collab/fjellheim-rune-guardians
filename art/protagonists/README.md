# Protagonist sprites (Eirik and Astri)

The in-game hero sheets (`tools/gen/overrides/chars/eirik.png` and `astri.png`,
384×32 each) are hand re-pixelled from the approved extractions in
`art/prototypes/protagonists/`, at the game's overworld scale: 32×32 frames,
with each figure 28–29 px tall and its feet on the bottom row.

- `protagonists.txt` holds the four standing poses per hero as text pixel
  grids (one letter per colour; `.` is transparent). The palette is in
  `pal.py`, sampled from the approved art.
- `build.py` makes the two step poses for each direction by editing those
  pixels:
  - **Front and back:** the stepping leg lifts (it gets one row shorter and its
    foot rises), the hands swing in opposite directions, and the hair tuft,
    braid ties and cloak hem sway.
  - **Sides:** hand-drawn stride legs with the near and far legs swapped, a
    forward or back hand swing, and the cloak tail trailing.

  The left-facing frames are the right-facing ones mirrored, as the game has
  always drawn them.

Rebuild with `python3 art/protagonists/build.py` (needs Pillow): it writes `eirik.png` and `astri.png` next to the script. Copy them to
`tools/gen/overrides/chars/`, then run `npm run assets`.

## Known limits

The approved art is about 50 px (male) and 150 px (female) tall. At 29 px the
cloak knotwork, bracers and fine hair strands are simplified to a few pixels.
The cycle is three frames per direction (stand, step, stand, other step),
the same as every other character in the game.
