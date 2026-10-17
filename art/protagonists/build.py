# Build 32x32 protagonist sheets (stand + two step poses x 4 directions) from
# the hand-pixelled standing grids. Step poses are pixel edits of the stand
# pose: a lifted leg (shorter, foot raised), opposite hand swing, swaying hair
# tuft / braid tie / cloak hem; side views use hand-drawn stride legs.
import sys, os, copy; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import load, render
from pal import PAL
from PIL import Image

SIDE_LEGS = {
  "male": {"from": 24, "A": ["...odcCdoopPPPpo..", "....odo.oFfooFfFo.", ".......obbo.oBbBBo", "......obbbo.oBBBBo", "......ooooo.oooooo"],
                       "B": ["...odcCdoopPPPpo..", "....odo.oFFoofffo.", ".......oBBo.obbbbo", "......oBBBBoobbbbo", "......oooooooooooo"]},
  "female": {"from": 23, "A": ["....odcCdoocpppo..", ".....odoofFoFfFo..", "........obbooBBbo.", ".......obbbo.oBlBo", "......obbbo.oBBBBo", "......ooooo.oooooo"],
                         "B": ["....odcCdoocpppo..", ".....odooFfoofFfo.", "........oBBooobbbo", ".......oBlBo.obbbo", "......oBBBBo.obbbo", "......oooooo.ooooo"]},
}
SIDE_HAND = {"male": (20, ".oCcCCCCcFFLLSso..", ".oCcCCCCcFSsLLLo.."), "female": (19, ".ohoCcCCCFLLLSso..", ".ohoCcCCCSsLLLLo..")}

def lift_leg(g, cols, top, bottom):
    """shorten one leg: drop its top row, pull the rest up, clear the old foot row"""
    for x in cols:
        col = [g[y][x] for y in range(top, bottom + 1)]
        new = col[1:] + ["."]
        for i, y in enumerate(range(top, bottom + 1)): g[y][x] = new[i]

def move_px(g, rows, cols, chars, dy, fill):
    pts = [(y, x) for y in rows for x in cols if g[y][x] in chars]
    vals = {p: g[p[0]][p[1]] for p in pts}
    for (y, x) in pts: g[y][x] = fill
    for (y, x), v in vals.items():
        if 0 <= y + dy < len(g): g[y + dy][x] = v

def shift_row(g, y, dx, lo=0, hi=None):
    hi = len(g[y]) if hi is None else hi
    seg = g[y][lo:hi]
    seg = (["."] * dx + seg[:len(seg) - dx]) if dx > 0 else (seg[-dx:] + ["."] * (-dx))
    g[y][lo:hi] = seg

def frames(who, sp):
    out = {}
    W = 18
    for d in ("down", "up", "right"):
        base = [list(r) for r in sp[f"{who}-{d}"]]
        H = len(base)
        fs = [base]
        for k, step in enumerate("AB"):
            g = copy.deepcopy(base)
            # hair tuft / ahoge sways opposite to the step
            for y in (0, 1): shift_row(g, y, 1 if step == "A" else -1, 6, 14)
            if d in ("down", "up"):
                leg_top = 24 if who == "male" else 23
                lifted = range(9, W) if step == "A" else range(0, 9)
                lift_leg(g, lifted, leg_top, H - 1)
                # hands: the one on the planted-leg side swings forward (down)
                left_dy, right_dy = (1, -1) if step == "A" else (-1, 1)
                hrows = range(18, 23)
                move_px(g, hrows, range(1, 5), "Ss", left_dy if d == "down" else -left_dy, "c")
                move_px(g, hrows, range(13, 17), "Ss", right_dy if d == "down" else -right_dy, "c")
                if who == "female":  # braid ties swing with the step
                    for y in range(17, 20):
                        shift_row(g, y, 1 if step == "A" else -1, 0, 4) if g[y][1] in "RhjH" else None
                # cloak hem flutters toward the planted foot
                for y in (H - 6, H - 5):
                    shift_row(g, y, -1 if step == "A" else 1, 0, 4); shift_row(g, y, -1 if step == "A" else 1, 14, W)
            else:
                legs = SIDE_LEGS[who]
                for i, row in enumerate(legs[step]): g[legs["from"] + i] = list(row)
                hy, a, b = SIDE_HAND[who]; g[hy] = list(a if step == "A" else b)
                # cloak tail trails behind on the stride
                for y in range(H - 8, H - 4): shift_row(g, y, -1 if step == "A" else 0, 0, 8)
            fs.append(g)
        out[d] = ["".join(r) for r in fs[0]], ["".join(r) for r in fs[1]], ["".join(r) for r in fs[2]]
    return out

def sheet(who, sp):
    fr = frames(who, sp)
    img = Image.new("RGBA", (12 * 32, 32), (0, 0, 0, 0))
    order = [("down", False), ("up", False), ("right", False), ("right", True)]
    for di, (d, flip) in enumerate(order):
        for f in range(3):
            im = render(fr[d][f], PAL, 1)
            if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
            img.alpha_composite(im, (di * 96 + f * 32 + (32 - im.width) // 2, 32 - im.height))
    return img, fr

if __name__ == "__main__":
    sp = load(os.path.join(os.path.dirname(os.path.abspath(__file__)), "protagonists.txt"))
    for who, key in (("male", "eirik"), ("female", "astri")):
        img, fr = sheet(who, sp); img.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{key}.png"))
        for d in fr:
            assert fr[d][1] != fr[d][0] and fr[d][2] != fr[d][0] and fr[d][1] != fr[d][2], (who, d)
        print(key, img.size)
