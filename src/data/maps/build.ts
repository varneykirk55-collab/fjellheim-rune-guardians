// build.ts - tiny grid authoring helper for map data files.
export class Grid {
  w: number;
  h: number;
  rows: string[][];

  constructor(w: number, h: number, fill = ".") {
    this.w = w;
    this.h = h;
    this.rows = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }

  set(x: number, y: number, ch: string) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.rows[y][x] = ch;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, ch: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ch);
    return this;
  }

  hline(x0: number, x1: number, y: number, ch: string) {
    for (let x = x0; x <= x1; x++) this.set(x, y, ch);
    return this;
  }

  vline(x: number, y0: number, y1: number, ch: string) {
    for (let y = y0; y <= y1; y++) this.set(x, y, ch);
    return this;
  }

  /**
   * Scatter a char deterministically on a fixed lattice. `onlyOn` limits it to
   * the listed base chars - without it, decoration overwrote cliffs and water
   * and punched walkable holes through map borders and streams.
   */
  scatter(ch: string, period: number, mod: number, onlyOn?: string) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (onlyOn !== undefined && !onlyOn.includes(this.rows[y][x])) continue;
        if ((x * 7 + y * 13) % period === mod) this.set(x, y, ch);
      }
    }
    return this;
  }

  strings(): string[] {
    return this.rows.map((r) => r.join(""));
  }
}
