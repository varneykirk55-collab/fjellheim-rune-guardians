// preview.mjs - dev aid: render selected generated tiles/objects magnified for review.
// Usage: node tools/gen/preview.mjs <out.png> [scale] [keyPrefix ...]
import { PNG } from "pngjs";
import { writeFileSync } from "node:fs";
import { buildTileset, TILES } from "./tiles.mjs";

const [out, scaleArg, ...prefixes] = process.argv.slice(2);
const scale = Number(scaleArg || 4);
const ts = buildTileset();
const keys = Object.keys(ts.layout).filter((k) => !prefixes.length || prefixes.some((p) => k.startsWith(p)));
const cols = 16;
const rows = Math.ceil(keys.length / cols);
const gap = 2;
const W = cols * (16 * scale + gap);
const H = rows * (16 * scale + gap);
const png = new PNG({ width: W, height: H });
// neutral checker so transparent decorations are visible
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const c = ((x >> 3) + (y >> 3)) % 2 ? 70 : 90;
    png.data[i] = c; png.data[i + 1] = c; png.data[i + 2] = c + 10; png.data[i + 3] = 255;
  }
keys.forEach((k, n) => {
  const idx = ts.layout[k];
  const sx = (idx % ts.cols) * 16;
  const sy = ((idx / ts.cols) | 0) * 16;
  const ox = (n % cols) * (16 * scale + gap);
  const oy = ((n / cols) | 0) * (16 * scale + gap);
  for (let y = 0; y < 16 * scale; y++)
    for (let x = 0; x < 16 * scale; x++) {
      const c = ts.pix.get(sx + ((x / scale) | 0), sy + ((y / scale) | 0));
      if (!c[3]) continue;
      const i = ((oy + y) * W + ox + x) * 4;
      const a = c[3] / 255;
      for (let ch = 0; ch < 3; ch++) png.data[i + ch] = Math.round(c[ch] * a + png.data[i + ch] * (1 - a));
    }
});
writeFileSync(out, PNG.sync.write(png));
console.log(`${keys.length} tiles -> ${out}`);
void TILES;
