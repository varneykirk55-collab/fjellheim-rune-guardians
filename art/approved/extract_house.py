"""Recover the approved Nordic turf-roof house from its screenshot.

  python3 art/approved/extract_house.py      (needs numpy, scipy, Pillow)

Input:  art/approved/nordic-house-approved.png  (the approved screenshot, unmodified)
Output: tools/gen/art/nordic_house.png          (160x96, transparent; used by `npm run assets`)

1. Native grid. The screenshot is an upscaled render (~6.2 px per art pixel,
   not perfectly uniform). Block boundaries are found per column and per row
   from colour-change energy (dynamic programming keeps spacing near the
   period); each block takes the median colour of its interior. Colours come
   from the image itself: no palette reduction, no redrawing. Re-expanding the
   result onto the recovered grid reproduces the screenshot to ~3/255 per channel.
2. Mask. Hand-drawn outside regions (below the foundation line, the tree at
   top-left, the cliff behind the roof's top-right, stepping around the tall
   roof post), then a flood fill from the border through background colours
   only (bright grass, path, flowers), which stops at the house's dark outline.
   The largest connected shape is kept, then hand-checked edge trims remove grass
   outside the roof rim (x<=3), outside the right corner post (x>=140, and green
   pixels in its brown outline column x=139) and green grass under the foundation
   (rows >= 93). The doorway sill's bottom row is the
   same tan as the path below it, so it is kept explicitly (door frame columns).
   Nothing inside the outline is changed.
3. Crop to the house (136x93) and pad to 160x96 (14 px left, 10 right, 3 top) so
   the doorway centre falls on a tile centre and the sill sits on the bottom row.
"""
import os
from collections import deque
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "nordic-house-approved.png")
OUT = os.path.join(HERE, "..", "..", "tools", "gen", "art", "nordic_house.png")

X0, Y0, X1, Y1 = 214, 30, 1130, 670  # screenshot region holding the house with margin


def boundaries(profile, lo=4, hi=9, target=6.2):
    n = len(profile)
    best = np.full(n + 1, -1e18)
    prev = np.full(n + 1, -1, int)
    best[0] = 0.0
    for i in range(1, n + 1):
        for s in range(lo, hi + 1):
            j = i - s
            if j < 0 or best[j] <= -1e17:
                continue
            v = best[j] + profile[i - 1] - 0.15 * profile.mean() * (s - target) ** 2
            if v > best[i]:
                best[i], prev[i] = v, j
    i = int(np.argmax(best[n - hi:])) + n - hi
    cuts = []
    while i > 0:
        cuts.append(i)
        i = prev[i]
    return [0] + sorted(cuts)


def native_grid(img):
    reg = img[Y0:Y1, X0:X1]
    dx = np.abs(np.diff(reg, axis=1)).sum(axis=2).sum(axis=0)
    dy = np.abs(np.diff(reg, axis=0)).sum(axis=2).sum(axis=1)
    xs, ys = boundaries(np.append(dx, 0)), boundaries(np.append(dy, 0))
    out = np.zeros((len(ys) - 1, len(xs) - 1, 3), np.uint8)
    for r in range(len(ys) - 1):
        for c in range(len(xs) - 1):
            y0, y1, x0, x1 = ys[r], ys[r + 1], xs[c], xs[c + 1]
            core = reg[y0 + 1:max(y0 + 2, y1 - 1), x0 + 1:max(x0 + 2, x1 - 1)].reshape(-1, 3)
            out[r, c] = np.median(core, axis=0).round()
    return out


def house_mask(nat):
    H, W = nat.shape[:2]
    r, g, b = (nat[..., i].astype(int) for i in range(3))
    bright_grass = (g > 115) & (g - r > 40) & (g - b > 40)
    path = (r > 165) & (g > 135) & (b < 150) & (r - b > 45)
    flower = (r > 190) & (g > 190) & (b > 150)
    bg_colour = bright_grass | path | flower

    def poly(points):
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).polygon(points, fill=1)
        return np.asarray(m).astype(bool)

    outside = np.zeros((H, W), bool)
    outside[97:, :] = True  # below the stone foundation (last row 96)
    outside |= poly([(0, 0), (22, 0), (22, 10), (16, 12), (0, 26)])  # tree, top-left
    # cliff + grass above the roof; the boundary steps around the tall post (x 108-113, top row 7)
    outside |= poly([(43, 0), (W, 0), (W, 24), (131, 24), (120, 15), (114, 13), (114, 6), (108, 6), (43, 6)])
    passable = bg_colour | outside
    fill = np.zeros((H, W), bool)
    q = deque()
    for y in range(H):
        for x in range(W):
            if (y in (0, H - 1) or x in (0, W - 1)) and passable[y, x]:
                fill[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < H and 0 <= xx < W and not fill[yy, xx] and passable[yy, xx]:
                fill[yy, xx] = True
                q.append((yy, xx))
    house = ~fill
    house[:, :4] = False  # grass outside the roof's dark rim
    house[:, 140:] = False  # grass outside the right corner post
    greenish = (g > r + 20) & (g > b + 10)
    house[93:, :] &= ~greenish[93:, :]  # grass under the foundation / gable wedge
    house[:, 139] &= ~greenish[:, 139]  # grass in the right corner post's outline column (the post is brown)
    house[96, 70:88] = True  # the doorway sill's bottom row (path-coloured, inside the door frame)
    lab, n = ndimage.label(house, structure=np.ones((3, 3)))
    sizes = ndimage.sum(house, lab, range(1, n + 1))
    return lab == (int(np.argmax(sizes)) + 1)


def main():
    img = np.asarray(Image.open(SRC).convert("RGB")).astype(float)
    nat = native_grid(img)
    mask = house_mask(nat)
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    rgba[..., :3] = nat[y0:y1, x0:x1]
    rgba[..., 3] = np.where(mask[y0:y1, x0:x1], 255, 0)
    house = Image.fromarray(rgba)
    canvas = Image.new("RGBA", (160, 96), (0, 0, 0, 0))
    canvas.paste(house, (14, 96 - house.height))
    canvas.save(OUT)
    print(f"source {img.shape[1]}x{img.shape[0]} -> native region {nat.shape[1]}x{nat.shape[0]} -> house {house.width}x{house.height} -> {OUT} (160x96)")


if __name__ == "__main__":
    main()
