// pix.mjs - minimal deterministic pixel-art canvas used by the asset generator.
// Everything is drawn from code so all game art is original, reproducible and
// consistent in palette / pixel density. No external art tools required.
import { PNG } from "pngjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** mulberry32 seeded RNG -> deterministic output bytes. */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function parseColor(c) {
  if (Array.isArray(c)) {
    return [c[0] | 0, c[1] | 0, c[2] | 0, c.length > 3 ? c[3] | 0 : 255];
  }
  if (typeof c === "number") {
    return [(c >> 16) & 255, (c >> 8) & 255, c & 255, 255];
  }
  let s = c.replace("#", "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) : 255;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), a];
}

export function shade(c, f) {
  const [r, g, b, a] = parseColor(c);
  if (f >= 0) {
    return [
      Math.min(255, r + (255 - r) * f) | 0,
      Math.min(255, g + (255 - g) * f) | 0,
      Math.min(255, b + (255 - b) * f) | 0,
      a,
    ];
  }
  const k = 1 + f;
  return [Math.max(0, r * k) | 0, Math.max(0, g * k) | 0, Math.max(0, b * k) | 0, a];
}

export function mix(c1, c2, t) {
  const a = parseColor(c1);
  const b = parseColor(c2);
  return [
    (a[0] + (b[0] - a[0]) * t) | 0,
    (a[1] + (b[1] - a[1]) * t) | 0,
    (a[2] + (b[2] - a[2]) * t) | 0,
    (a[3] + (b[3] - a[3]) * t) | 0,
  ];
}

export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8Array(w * h * 4);
  }

  inB(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inB(x, y)) return;
    const [r, g, b, a] = parseColor(c);
    const i = (y * this.w + x) * 4;
    if (a === 255) {
      this.d[i] = r;
      this.d[i + 1] = g;
      this.d[i + 2] = b;
      this.d[i + 3] = 255;
    } else if (a > 0) {
      const da = this.d[i + 3] / 255;
      const na = a / 255;
      const oa = na + da * (1 - na);
      this.d[i] = ((r * na + this.d[i] * da * (1 - na)) / oa) | 0;
      this.d[i + 1] = ((g * na + this.d[i + 1] * da * (1 - na)) / oa) | 0;
      this.d[i + 2] = ((b * na + this.d[i + 2] * da * (1 - na)) / oa) | 0;
      this.d[i + 3] = (oa * 255) | 0;
    }
  }

  get(x, y) {
    if (!this.inB(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }

  opaque(x, y) {
    return this.get(x, y)[3] > 0;
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  line(x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Filled ellipse (pixelated, symmetric). */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) {
      const t = ry === 0 ? 0 : y / ry;
      const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - t * t)) + 0.001);
      for (let x = -dx; x <= dx; x++) this.set(cx + x, cy + y, c);
    }
  }

  ellipseOutline(cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) {
      const t = ry === 0 ? 0 : y / ry;
      const dx = rx * Math.sqrt(Math.max(0, 1 - t * t));
      const x0 = Math.floor(dx + 0.001);
      const x1 = Math.max(0, Math.floor(dx - 0.9));
      for (let x = x1; x <= x0; x++) {
        this.set(cx + x, cy + y, c);
        this.set(cx - x, cy + y, c);
      }
    }
  }

  /** Filled polygon via scanline (integer vertices). */
  poly(pts, c) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if (y0 === y1) continue;
        if (y >= Math.min(y0, y1) && y < Math.max(y0, y1)) {
          xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.round(xs[i]);
        const xb = Math.round(xs[i + 1]);
        for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) this.set(x, y, c);
      }
    }
  }

  /** Deterministic speckle noise inside existing opaque pixels (or everywhere if mask=null). */
  speckle(seed, prob, colors, onlyOpaque = true) {
    const r = rng(seed);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (onlyOpaque && !this.opaque(x, y)) continue;
        if (r() < prob) this.set(x, y, colors[(r() * colors.length) | 0]);
      }
    }
  }

  /** Flip whole canvas horizontally; returns this. */
  mirrorX() {
    const out = new Pix(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const [r, g, b, a] = this.get(x, y);
        if (a) {
          const i = (y * this.w + (this.w - 1 - x)) * 4;
          out.d[i] = r; out.d[i + 1] = g; out.d[i + 2] = b; out.d[i + 3] = a;
        }
      }
    }
    this.d = out.d;
    return this;
  }

  blit(other, dx, dy, flipX = false) {
    for (let y = 0; y < other.h; y++) {
      for (let x = 0; x < other.w; x++) {
        const sx = flipX ? other.w - 1 - x : x;
        const [r, g, b, a] = other.get(sx, y);
        if (a) {
          const i = (y * other.w + sx) * 4;
          const px = dx + x;
          const py = dy + y;
          if (this.inB(px, py)) {
            const j = (py * this.w + px) * 4;
            this.d[j] = other.d[i];
            this.d[j + 1] = other.d[i + 1];
            this.d[j + 2] = other.d[i + 2];
            this.d[j + 3] = other.d[i + 3];
          }
        }
      }
    }
  }

  /**
   * Auto dark outline: every transparent pixel 4-adjacent to opaque pixels
   * becomes a darkened version of the darkest neighbour. Gives a cohesive
   * hand-drawn pixel look to every sprite.
   */
  outline(f = 0.42, alphaThreshold = 0) {
    const snaps = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.opaque(x, y)) continue;
        let darkest = null;
        let lum = Infinity;
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
          const c = this.get(nx, ny);
          if (c[3] <= alphaThreshold) continue;
          const l = c[0] * 0.3 + c[1] * 0.6 + c[2] * 0.1;
          if (l < lum) {
            lum = l;
            darkest = c;
          }
        }
        if (darkest) snaps.push([x, y, shade(darkest, -f)]);
      }
    }
    for (const [x, y, c] of snaps) this.set(x, y, c);
    return this;
  }

  /** Inner shading pass: darken bottom rows / lighten top of a color region (simple volume). */
  toonShade(light = 0.18, dark = 0.22) {
    // Clone original colors first so we shade against untouched data.
    const src = new Uint8Array(this.d);
    const at = (x, y) => {
      const i = (y * this.w + x) * 4;
      return [src[i], src[i + 1], src[i + 2], src[i + 3]];
    };
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = at(x, y);
        if (!c[3]) continue;
        // count same-ish opaque neighbours below / above to detect region edges
        const below = at(x, y + 1);
        const above = at(x, y - 1);
        const similar = (o) => o[3] > 0 && Math.abs(o[0] - c[0]) + Math.abs(o[1] - c[1]) + Math.abs(o[2] - c[2]) < 60;
        if (!similar(below) && below[3] === 0) continue; // edge pixel: leave to outline pass
        if (similar(below) && !similar(above) && above[3] === 0) {
          this.set(x, y, shade(c, light)); // top of region -> highlight
        } else if (!similar(below) && similar(above)) {
          this.set(x, y, shade(c, -dark)); // bottom of region -> shadow
        }
      }
    }
    return this;
  }

  save(path) {
    const png = new PNG({ width: this.w, height: this.h });
    png.data = Buffer.from(this.d);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, PNG.sync.write(png, { deflateLevel: 9 }));
    return path;
  }
}

/** Compose multiple draw calls into one canvas of given size. */
export function canvas(w, h, fn) {
  const p = new Pix(w, h);
  if (fn) fn(p);
  return p;
}
