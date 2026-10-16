// backdrops.mjs - title screen art and battle backgrounds (512x288).
import { Pix, rng, shade, mix } from "./pix.mjs";

export const BW = 512;
export const BH = 288;

function skyGradient(p, stops, y0 = 0, y1 = BH) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0);
    let c = stops[0].c;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (t >= a.t && t <= b.t) {
        c = mix(a.c, b.c, (t - a.t) / (b.t - a.t));
        break;
      }
    }
    p.rect(0, y, BW, 1, c);
  }
}

function stars(p, count, seed, maxY) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = (r() * BW) | 0;
    const y = (r() * maxY) | 0;
    const b = r();
    p.set(x, y, b > 0.85 ? "#ffffff" : b > 0.5 ? "#c8d4e8" : "#8a96b0");
    if (b > 0.95) {
      p.set(x + 1, y, "#5a6680");
      p.set(x, y + 1, "#5a6680");
    }
  }
}

function mountainRange(p, baseY, height, color, seed, snow = false) {
  const r = rng(seed);
  const pts = [];
  let h = height * 0.5;
  for (let x = 0; x <= BW; x += 8) {
    h += (r() - 0.5) * height * 0.7;
    h = Math.max(height * 0.25, Math.min(height, h));
    pts.push([x, baseY - h]);
  }
  for (let x = 0; x < BW; x++) {
    const seg = Math.min(pts.length - 1, (x / 8) | 0);
    const [x0, y0] = pts[seg];
    const [x1, y1] = pts[Math.min(pts.length - 1, seg + 1)];
    const t = (x - x0) / 8;
    const y = Math.round(y0 + (y1 - y0) * t);
    for (let yy = y; yy < baseY + 40; yy++) p.set(x, yy, color);
    if (snow) {
      for (let yy = y; yy < y + 6; yy++) {
        if (r() < 0.6) p.set(x, yy, shade(color, 0.55));
      }
    }
  }
}

function cloudBand(p, y, w, h, c, seed) {
  const r = rng(seed);
  for (let i = 0; i < w; i++) {
    const x = (r() * BW) | 0;
    const cy = y + ((r() * h) | 0);
    const rw = 8 + ((r() * 24) | 0);
    p.ellipse(x, cy, rw, 2 + ((r() * 3) | 0), c);
  }
}

function treeLine(p, baseY, color, seed, scale = 1) {
  const r = rng(seed);
  for (let x = -8; x < BW + 8; x += Math.round(6 * scale)) {
    const th = Math.round((10 + r() * 16) * scale);
    const tw = Math.round((3 + r() * 3) * scale);
    for (let y = 0; y < th; y++) {
      const wdt = Math.max(1, Math.round(tw * (1 - y / th)));
      p.rect(x - wdt, baseY - y, wdt * 2, 1, y > th * 0.8 ? shade(color, 0.08) : color);
    }
  }
}

function platform(p, cx, cy, rx, ry, grass, dirt, seed) {
  const r = rng(seed);
  p.ellipse(cx, cy + 3, rx, ry, dirt);
  p.ellipse(cx, cy, rx, ry, grass);
  p.ellipse(cx, cy - 1, rx - 3, ry - 2, shade(grass, 0.1));
  for (let i = 0; i < rx; i++) {
    const x = cx - rx + ((r() * rx * 2) | 0);
    const y = cy - ry + ((r() * ry * 2) | 0);
    if (p.get(x, y).slice(0, 3).join() === [...Array(3)].map(() => 0).join()) continue;
    if (r() < 0.3) p.set(x, y, shade(grass, r() < 0.5 ? 0.16 : -0.12));
  }
}

/* ================= title ================= */
export function titleBg() {
  const p = new Pix(BW, BH);
  const r = rng(1301);
  // dusk sky
  skyGradient(p, [
    { t: 0, c: "#101830" },
    { t: 0.35, c: "#2a3054" },
    { t: 0.55, c: "#5a4264" },
    { t: 0.68, c: "#a85a4a" },
    { t: 0.76, c: "#d88a4a" },
    { t: 0.8, c: "#e8a85a" },
  ], 0, 210);
  stars(p, 90, 1303, 130);
  // aurora ribbons
  for (let band = 0; band < 3; band++) {
    for (let x = 0; x < BW; x++) {
      const yBase = 40 + band * 22 + Math.sin(x * 0.02 + band * 2) * 14;
      for (let k = 0; k < 14; k++) {
        const a = Math.max(0, 46 - k * 4 - band * 6);
        const c = band === 1 ? [140, 230, 220, a] : [110, 220, 160, a];
        p.set(x, Math.round(yBase + k * 1.4), c);
      }
    }
  }
  // far mountains
  mountainRange(p, 176, 74, "#3c3a5e", 1307, true);
  mountainRange(p, 188, 52, "#33304e", 1309, true);
  // fjord water
  skyGradient(p, [
    { t: 0, c: "#2c3e5e" },
    { t: 0.5, c: "#223450" },
    { t: 1, c: "#1a2840" },
  ], 196, 288);
  // sun glint path
  for (let y = 196; y < 288; y++) {
    const w = 10 + (y - 196) * 0.4;
    for (let x = 300 - w / 2 + ((r() * 6) | 0) - 3; x < 300 + w / 2; x++) {
      if (r() < 0.28) p.set(Math.round(x), y, [240, 180, 110, 100 + ((r() * 90) | 0)]);
    }
  }
  // water shimmer lines
  for (let i = 0; i < 90; i++) {
    const y = 198 + ((r() * 88) | 0);
    const x = (r() * BW) | 0;
    const w = 3 + ((r() * 14) | 0);
    p.line(x, y, x + w, y, [120, 150, 190, 60 + ((r() * 60) | 0)]);
  }
  // distant shore with village lights (left)
  mountainRange(p, 200, 16, "#241f38", 1311);
  for (let i = 0; i < 12; i++) {
    const x = 20 + ((r() * 140) | 0);
    const y = 194 + ((r() * 5) | 0);
    p.set(x, y, "#f0c860");
    p.set(x, y + 1, [240, 200, 96, 120]);
  }
  // longship silhouette sailing
  const sx = 170;
  const sy = 236;
  for (let x = 0; x < 64; x++) {
    const t = x / 64;
    const depth = Math.round(7 * Math.sin(Math.PI * t));
    const top = sy - Math.round(3 * Math.cos(Math.PI * t));
    for (let y = top; y < top + depth; y++) p.set(sx + x, y, "#120e1c");
  }
  // prow & stern
  p.line(sx - 1, sy, sx - 8, sy - 14, "#120e1c");
  p.line(sx - 8, sy - 14, sx - 12, sy - 16, "#120e1c");
  p.line(sx + 64, sy - 2, sx + 70, sy - 12, "#120e1c");
  // mast + sail
  p.rect(sx + 30, sy - 34, 2, 30, "#120e1c");
  p.rect(sx + 16, sy - 30, 30, 18, "#1a1426");
  p.rect(sx + 16, sy - 30, 30, 1, "#120e1c");
  // reflection
  for (let i = 0; i < 40; i++) {
    const x = sx + ((r() * 64) | 0);
    const y = sy + 8 + ((r() * 10) | 0);
    p.set(x, y, [18, 14, 28, 150]);
  }
  // foreground cliff right with pines
  p.poly([[380, 288], [400, 230], [440, 216], [480, 226], [512, 210], [512, 288]], "#171320");
  p.poly([[400, 288], [418, 246], [452, 232], [500, 240], [512, 232], [512, 288]], "#1e1830");
  const pine = (x, baseY, h) => {
    for (let y = 0; y < h; y++) {
      const w = Math.max(1, Math.round((h - y) * 0.32));
      p.rect(x - w, baseY - y, w * 2, 1, y % 5 === 0 ? "#141020" : "#191428");
    }
    p.rect(x - 1, baseY, 2, 4, "#100c1a");
  };
  pine(424, 230, 34);
  pine(452, 226, 44);
  pine(484, 232, 30);
  pine(505, 222, 40);
  // foreground cliff left
  p.poly([[0, 288], [0, 250], [40, 242], [90, 258], [120, 288]], "#171320");
  pine(24, 248, 30);
  pine(58, 252, 22);
  // birds
  const bird = (x, y) => {
    p.line(x - 3, y, x - 1, y - 2, "#120e1c");
    p.line(x + 1, y - 2, x + 3, y, "#120e1c");
  };
  bird(120, 70);
  bird(140, 62);
  bird(100, 84);
  return p;
}

/* ================= battle backgrounds ================= */
export function battleMeadow() {
  const p = new Pix(BW, BH);
  const r = rng(1401);
  skyGradient(p, [
    { t: 0, c: "#4a8ac8" },
    { t: 0.6, c: "#7ab4dc" },
    { t: 1, c: "#b8dcec" },
  ], 0, 150);
  cloudBand(p, 20, 90, 40, [255, 255, 255, 200], 1403);
  cloudBand(p, 50, 50, 30, [232, 244, 250, 160], 1405);
  mountainRange(p, 130, 46, "#5f7a94", 1407);
  mountainRange(p, 142, 30, "#4f6a5a", 1409);
  treeLine(p, 156, "#3c6134", 1411, 1.4);
  // ground
  skyGradient(p, [
    { t: 0, c: "#639a4a" },
    { t: 0.3, c: "#5c9244" },
    { t: 1, c: "#47713d" },
  ], 152, BH);
  for (let i = 0; i < 400; i++) {
    const x = (r() * BW) | 0;
    const y = 154 + ((r() * 130) | 0);
    p.set(x, y, r() < 0.5 ? "#6da852" : "#527f3e");
  }
  // flowers
  for (let i = 0; i < 40; i++) {
    const x = (r() * BW) | 0;
    const y = 160 + ((r() * 124) | 0);
    p.set(x, y, ["#e86048", "#f0e8d0", "#f0c860"][(r() * 3) | 0]);
  }
  // distant village roofs
  for (const [x, y] of [[60, 148], [90, 150], [430, 147]]) {
    p.poly([[x, y], [x + 10, y - 8], [x + 20, y]], "#8f6c31");
    p.rect(x + 2, y, 16, 5, "#6e4a2c");
  }
  // platforms
  platform(p, 372, 118, 62, 15, "#6da852", "#7a5e3b", 1413);
  platform(p, 138, 226, 82, 20, "#639a4a", "#6e5236", 1415);
  // grass tufts on platform edges
  for (let i = 0; i < 24; i++) {
    const x = 320 + ((r() * 110) | 0);
    const y = 110 + ((r() * 16) | 0);
    p.set(x, y, "#79b45c");
  }
  return p;
}

export function battleForest() {
  const p = new Pix(BW, BH);
  const r = rng(1501);
  skyGradient(p, [
    { t: 0, c: "#2c4a3a" },
    { t: 0.7, c: "#3f6148" },
    { t: 1, c: "#547a52" },
  ], 0, 140);
  // canopy blobs top
  for (let i = 0; i < 120; i++) {
    const x = (r() * BW) | 0;
    const y = (r() * 70) | 0;
    p.ellipse(x, y, 12 + ((r() * 24) | 0), 6 + ((r() * 10) | 0), r() < 0.5 ? "#22381f" : "#2b4626");
  }
  // trunks
  for (const [x, w] of [[30, 22], [90, 14], [200, 10], [330, 12], [420, 18], [490, 24]]) {
    p.rect(x, 30, w, 200, "#3a2c1c");
    p.rect(x, 30, Math.max(2, w * 0.3), 200, "#4c3a26");
    p.rect(x + w - 2, 30, 2, 200, "#2c2014");
    for (let y = 40; y < 220; y += 14 + ((r() * 8) | 0)) p.rect(x + 2, y, w - 4, 1, "#2c2014");
  }
  // sun rays
  for (let i = 0; i < 5; i++) {
    const x0 = 120 + i * 80;
    for (let t = 0; t < 120; t++) {
      const x = x0 + t * 0.4;
      const y = 40 + t;
      p.set(x, y, [240, 230, 160, 40 - (t % 8)]);
      p.set(x + 1, y, [240, 230, 160, 26 - (t % 6)]);
    }
  }
  // fern floor
  skyGradient(p, [
    { t: 0, c: "#3c5a30" },
    { t: 1, c: "#2c4426" },
  ], 190, BH);
  for (let i = 0; i < 500; i++) {
    const x = (r() * BW) | 0;
    const y = 190 + ((r() * 98) | 0);
    p.set(x, y, r() < 0.5 ? "#47663a" : "#334c2a");
  }
  // mushrooms & stones
  for (let i = 0; i < 10; i++) {
    const x = (r() * BW) | 0;
    const y = 210 + ((r() * 70) | 0);
    p.rect(x, y, 2, 3, "#e8e0c8");
    p.ellipse(x + 1, y - 1, 3, 2, "#c8503c");
  }
  platform(p, 372, 150, 58, 14, "#4f7a42", "#5f452c", 1503);
  platform(p, 138, 236, 80, 19, "#47713d", "#57402a", 1505);
  // moss highlights on platforms
  for (let i = 0; i < 20; i++) {
    p.set(320 + ((r() * 100) | 0), 142 + ((r() * 14) | 0), "#5f8a4a");
  }
  return p;
}

export function battleShore() {
  const p = new Pix(BW, BH);
  const r = rng(1601);
  skyGradient(p, [
    { t: 0, c: "#3f7ab8" },
    { t: 1, c: "#9ac8e0" },
  ], 0, 118);
  cloudBand(p, 16, 60, 30, [255, 255, 255, 190], 1603);
  // sea
  skyGradient(p, [
    { t: 0, c: "#2f6e9e" },
    { t: 1, c: "#3a7fae" },
  ], 110, 176);
  for (let i = 0; i < 200; i++) {
    const x = (r() * BW) | 0;
    const y = 112 + ((r() * 62) | 0);
    const w = 4 + ((r() * 12) | 0);
    p.line(x, y, x + w, y, r() < 0.3 ? "#7fc4dd" : "#4a92c0");
  }
  // gulls
  const bird = (x, y) => {
    p.line(x - 3, y, x - 1, y - 2, "#f0f4f8");
    p.line(x + 1, y - 2, x + 3, y, "#f0f4f8");
  };
  bird(390, 50);
  bird(420, 64);
  bird(80, 40);
  // wet sand + beach
  skyGradient(p, [
    { t: 0, c: "#b8a878" },
    { t: 0.15, c: "#d8c08a" },
    { t: 1, c: "#c3aa72" },
  ], 172, BH);
  // foam line
  for (let x = 0; x < BW; x++) {
    const wob = Math.sin(x * 0.05) * 3;
    p.rect(x, 172 + Math.round(wob), 1, 3, "#e8f4f8");
    if ((x / 5 | 0) % 3 === 0) p.set(x, 176 + Math.round(wob), "#cdeaf2");
  }
  for (let i = 0; i < 300; i++) {
    const x = (r() * BW) | 0;
    const y = 178 + ((r() * 106) | 0);
    p.set(x, y, r() < 0.5 ? "#e4d3a4" : "#b09a68");
  }
  // dock posts left
  for (const x of [40, 80]) {
    p.rect(x, 150, 10, 60, "#5c3a20");
    p.rect(x, 150, 3, 60, "#7a5230");
    p.ellipse(x + 5, 150, 5, 2, "#8a5a33");
  }
  // rocks & shells
  p.ellipse(460, 250, 18, 10, "#7b7b86");
  p.ellipse(458, 246, 14, 8, "#9a9aa4");
  for (let i = 0; i < 8; i++) {
    const x = (r() * BW) | 0;
    const y = 200 + ((r() * 80) | 0);
    p.set(x, y, "#f0e8d8");
  }
  platform(p, 372, 140, 58, 14, "#d8c08a", "#a8905e", 1605);
  platform(p, 138, 232, 80, 19, "#cdb47e", "#9a8254", 1607);
  return p;
}

export function battleIndoor() {
  const p = new Pix(BW, BH);
  const r = rng(1701);
  // plank wall
  p.rect(0, 0, BW, 190, "#5c4230");
  for (let y = 0; y < 190; y += 14) {
    p.rect(0, y, BW, 13, y % 28 ? "#64482f" : "#5c4230");
    p.rect(0, y + 13, BW, 1, "#3a2718");
    for (let x = ((y / 14) | 0) % 2 ? 20 : 60; x < BW; x += 96) {
      p.rect(x, y, 1, 13, "#4a3425");
      p.set(x + 3, y + 6, "#3a2718");
      p.set(x - 3, y + 6, "#3a2718");
    }
  }
  // big beams
  p.rect(0, 0, BW, 10, "#3a2718");
  p.rect(0, 60, BW, 8, "#4a3425");
  for (const x of [70, 250, 440]) {
    p.rect(x, 0, 16, 190, "#4a3425");
    p.rect(x, 0, 3, 190, "#5c4230");
    p.rect(x + 13, 0, 3, 190, "#3a2718");
  }
  // banners
  for (const [bx, bc] of [[140, "#a63c2e"], [330, "#3c4a7a"]]) {
    p.rect(bx, 20, 40, 78, bc);
    p.rect(bx, 20, 40, 4, shade(bc, 0.2));
    p.rect(bx, 90, 40, 8, shade(bc, -0.25));
    p.poly([[bx, 98], [bx + 20, 88], [bx + 40, 98], [bx + 40, 100], [bx, 100]], bc);
    p.set(bx + 20, 100, 0);
    // glyph
    p.line(bx + 20, 34, bx + 20, 74, "#d9a441");
    p.line(bx + 10, 44, bx + 30, 44, "#d9a441");
    p.line(bx + 12, 64, bx + 28, 64, "#d9a441");
  }
  // shield decor
  p.ellipse(44, 50, 20, 20, "#8a2f24");
  p.ellipse(44, 50, 14, 14, "#c8c0b0");
  p.ellipse(44, 50, 6, 6, "#d9a441");
  p.line(24, 50, 64, 50, "#3a2718");
  p.line(44, 30, 44, 70, "#3a2718");
  p.ellipse(470, 46, 18, 18, "#3c4a7a");
  p.ellipse(470, 46, 12, 12, "#c8c0b0");
  p.ellipse(470, 46, 5, 5, "#5fd8d0");
  // floor
  skyGradient(p, [
    { t: 0, c: "#4a3425" },
    { t: 1, c: "#5c4230" },
  ], 190, BH);
  for (let y = 190; y < BH; y += 10) {
    p.rect(0, y, BW, 1, "#3a2718");
    for (let x = ((y / 10) | 0) % 2 ? 30 : 70; x < BW; x += 80) p.rect(x, y, 1, 10, "#3a2718");
  }
  // rug
  p.ellipse(256, 244, 200, 44, "#7c2a20");
  p.ellipse(256, 242, 190, 40, "#a63c2e");
  p.ellipseOutline(256, 242, 160, 32, "#d9a441");
  p.ellipseOutline(256, 242, 150, 29, "#7c2a20");
  // platforms (rug circles)
  platform(p, 372, 196, 56, 13, "#b8442e", "#7c2a20", 1703);
  platform(p, 138, 250, 78, 18, "#b8442e", "#7c2a20", 1705);
  // hearth glow left
  for (let i = 0; i < 26; i++) {
    const x = (r() * 60) | 0;
    const y = 170 + ((r() * 30) | 0);
    p.set(x, y, [255, 160, 70, 40 + ((r() * 40) | 0)]);
  }
  return p;
}
