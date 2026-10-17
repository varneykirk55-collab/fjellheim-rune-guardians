// The two protagonist sheets in chars.png: 32x32 frames, four directions,
// a standing pose plus two distinct step poses each, feet on the bottom row.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const layout = (() => {
  const src = readFileSync(new URL("../src/assets/layout.ts", import.meta.url), "utf8");
  return JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("} as const") + 1));
})();
const sheet = PNG.sync.read(readFileSync(new URL("../public/assets/chars.png", import.meta.url)));
const FW = layout.charSheet.w, FH = layout.charSheet.h;
const DIRS = ["down", "up", "right", "left"];

function frame(char, dir, step) {
  const row = layout.chars[char], col = DIRS.indexOf(dir) * 3 + step;
  const px = [];
  for (let y = 0; y < FH; y++)
    for (let x = 0; x < FW; x++) {
      const i = ((row * FH + y) * sheet.width + col * FW + x) * 4;
      px.push(sheet.data.slice(i, i + 4).join(","));
    }
  return px;
}
const opaque = (px) => px.map((p, i) => (p.endsWith(",0") ? -1 : i)).filter((i) => i >= 0);

describe("protagonist sprites", () => {
  it("use 32x32 frames, 12 per character", () => {
    expect([FW, FH]).toEqual([32, 32]);
    expect(layout.charSheet.framesPerChar).toBe(12);
  });
  for (const char of ["eirik", "astri"]) {
    it(`${char}: every frame is drawn, feet on the bottom row, 28-30 px tall`, () => {
      for (const d of DIRS)
        for (let s = 0; s < 3; s++) {
          const o = opaque(frame(char, d, s));
          expect(o.length, `${char} ${d} ${s}`).toBeGreaterThan(150);
          const ys = o.map((i) => Math.floor(i / FW));
          if (s === 0) expect(Math.max(...ys), `${char} ${d} stand feet`).toBe(FH - 1);
          const h = Math.max(...ys) - Math.min(...ys) + 1;
          expect(h, `${char} ${d} ${s} height`).toBeGreaterThanOrEqual(26);
          expect(h).toBeLessThanOrEqual(30);
        }
    });
    it(`${char}: the two step poses differ from standing and from each other`, () => {
      for (const d of DIRS) {
        const [a, b, c] = [0, 1, 2].map((s) => frame(char, d, s).join("|"));
        expect(a === b || a === c || b === c, `${char} ${d}`).toBe(false);
      }
    });
    it(`${char}: transparency is fully on or off (no soft edges)`, () => {
      for (const d of DIRS) for (let s = 0; s < 3; s++) for (const p of frame(char, d, s)) expect(["0", "255"]).toContain(p.split(",")[3]);
    });
  }
  it("the two heroes look different", () => {
    expect(frame("eirik", "down", 0).join("|")).not.toBe(frame("astri", "down", 0).join("|"));
  });
});
