# Protagonist prototypes (not used by the game)

Standing frames extracted from the two approved protagonist sheets (generated
outside this repo). Nothing in `src/` or `public/` refers to these files.

| Set | Frame | Directions | Colours |
| --- | --- | --- | --- |
| `male-size1-*` | 30×50 | front, back, left, right | 31 |
| `male-size2-*` | 40×66 | front, back, left, right | 30 |
| `male-size3-*` | 46×69 | front, back, left, right | 31 |
| `female-*` | 84×152 | front, back, left, right | 31 |

Each set comes as single frames (`<set>-<dir>.png`) and a horizontal strip
(`<set>-sheet.png`, frames in the order front, back, left, right). Sizes are in
`frames.json`. Each figure is centred with its feet on the bottom row, and
transparency is fully on or off.

## How they were made

The source images are AI-rendered imitations of pixel art, not native pixel
art:

- they have about 57,000 (male) and 52,000 (female) unique colours;
- their edges are soft and semi-transparent;
- they show lossy-compression noise;
- their pixel grid is only approximate (about 5 px blocks on the male sheet,
  about 4 px on the female).

Each figure was:

1. sampled on its best-fitting grid, keeping the median colour of each block;
2. reduced to one shared 32-colour palette per character;
3. cleaned of isolated stray pixels.

The design itself is unchanged.

## Why these are not game-ready

- **Too large.** Bjorvik uses 16 px tiles, and characters are about 25–30 px
  tall in 32×32 frames. The smallest male here is 50 px and the female is
  152 px. In-game comparisons show figures about 46 px tall standing three
  tiles high, twice the NPCs' height.
- **Automatic reduction fails.** Shrinking to about 30 px turns the faces,
  eyes, braids and knotwork to mush. A pixel artist has to re-draw them at
  that size.
- **No walk poses.** The sheets have one standing pose per direction. Walk
  frames need new pose artwork in the same style.
