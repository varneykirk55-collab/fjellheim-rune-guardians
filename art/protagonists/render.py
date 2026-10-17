# Render hand-authored pixel grids (text) to PNG. Each sprite: "== name" then rows.
import sys, json
from PIL import Image
def load(path):
    sprites, cur, name = {}, None, None
    for line in open(path):
        line = line.rstrip("\n")
        if line.startswith("=="):
            name = line[2:].strip(); cur = []; sprites[name] = cur
        elif line.strip() and cur is not None and not line.startswith("#"):
            cur.append(line.split()[0] if line.split() else line)
    return sprites
def render(rows, pal, scale=1):
    w = max(len(r) for r in rows); h = len(rows)
    for i, r in enumerate(rows):
        if len(r) != w: print(f"  row {i} len {len(r)} != {w}: {r}", file=sys.stderr)
    im = Image.new("RGBA", (w, h))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in ".": continue
            if ch not in pal: print(f"  unknown '{ch}' at {x},{y}", file=sys.stderr); continue
            c = pal[ch].lstrip("#"); im.putpixel((x, y), tuple(int(c[i:i+2], 16) for i in (0, 2, 4)) + (255,))
    return im.resize((w * scale, h * scale), Image.NEAREST)
