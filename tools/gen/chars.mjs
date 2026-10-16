// chars.mjs - overworld cast. Looks are defined here; frames are drawn by
// village-chars.mjs (32x32, Platinum-style proportions).
// Frame order per character: down(3) up(3) right(3) left(3); left is mirrored right.
import { Pix } from "./pix.mjs";
import { CW, CH, drawCharFrame } from "./village-chars.mjs";

/** Full cast. dir frames: down0..2, up0..2, right0..2, left0..2 */
export const CAST = {
  eirik: { hair: "#c89848", hairStyle: "short", skin: "#e8b48c", tunic: "#3f6ea5", trim: "#d9a441", pants: "#5c4632", boots: "#3a2a1c" },
  astri: { hair: "#a0522d", hairStyle: "braid", skin: "#eec09a", tunic: "#3f8a6e", trim: "#d9a441", pants: "#5c4632", boots: "#3a2a1c", dress: true, belt: "#4a3425" },
  sten: { hair: "#2c2430", hairStyle: "short", skin: "#e0aa82", tunic: "#4a4a58", trim: "#c85a44", pants: "#3c3440", boots: "#28202a", cape: "#8a2f24", scarf: true },
  seer: { hair: "#d8d4cc", hairStyle: "long", skin: "#e0b090", tunic: "#3c4a7a", trim: "#d9a441", pants: "#3c4a7a", boots: "#28202a", dress: true, staff: true, beard: null, hoodColor: "#3c4a7a", eye: "#4a6fa5" },
  mother: { hair: "#8a5a33", hairStyle: "headscarf", scarfColor: "#b0563c", skin: "#eec09a", tunic: "#7a5a8a", trim: "#d9a441", dress: true, apron: "#c8b088", boots: "#3a2a1c" },
  fisher: { hair: "#6b4a2a", hairStyle: "bald", skin: "#d89870", tunic: "#8a7a3c", trim: "#6e5224", pants: "#4a5a6a", boots: "#2c3a48", beard: "long", beardColor: "#6b4a2a" },
  trader: { hair: "#4a3425", hairStyle: "headscarf", scarfColor: "#8f6bb5", skin: "#c88a5c", tunic: "#7a4a6a", trim: "#d9a441", dress: true, apron: "#a8823f", boots: "#3a2a1c" },
  healer: { hair: "#c8c0b0", hairStyle: "hood", hoodColor: "#3f6e77", skin: "#e8c8a8", tunic: "#3f6e77", trim: "#5fd8d0", pants: "#3f6e77", boots: "#2c4a52", dress: true },
  elder: { hair: "#9a948a", hairStyle: "cap", capColor: "#4a6b3a", skin: "#d8a880", tunic: "#4a6b3a", trim: "#a8823f", pants: "#5c4632", boots: "#3a2a1c", beard: "long", beardColor: "#9a948a" },
  sigrun: { hair: "#c86040", hairStyle: "bun", skin: "#eec09a", tunic: "#a63c2e", trim: "#d9a441", dress: true, boots: "#3a2a1c", belt: "#4a3425" },
  child: { hair: "#a88848", hairStyle: "short", skin: "#f0c8a0", tunic: "#6a9a4a", trim: "#c8b088", pants: "#5c4632", boots: "#3a2a1c", child: true },
  guard: { hair: "#6b4a2a", hairStyle: "helmet", skin: "#d89870", tunic: "#6a7280", trim: "#9aa2ad", pants: "#4a4a58", boots: "#2c2a34", spear: true, beard: "short", beardColor: "#6b4a2a" },
  hunter: { hair: "#8a6a4a", hairStyle: "hood", hoodColor: "#4a6b3a", skin: "#e0aa82", tunic: "#4a6b3a", trim: "#a8823f", pants: "#5c4632", boots: "#3a2a1c", bow: true },
  woodsman: { hair: "#5c4632", hairStyle: "short", skin: "#d89870", tunic: "#6b4a2a", trim: "#9aa2ad", pants: "#4a4a3a", boots: "#2c2a1c", beard: "long", beardColor: "#5c4632", spear: true },
  carl: { hair: "#3c2c1c", hairStyle: "short", skin: "#c88a5c", tunic: "#6e4a2c", trim: "#a8823f", pants: "#4a3a28", boots: "#2c2018", beard: "short", beardColor: "#3c2c1c" },
};

export function buildChars() {
  const keys = Object.keys(CAST);
  const cols = 12; // frames per character
  const atlas = new Pix(cols * CW, keys.length * CH);
  const layout = {};
  keys.forEach((name, row) => {
    const o = CAST[name];
    ["down", "up", "right", "left"].forEach((dir, di) => {
      for (let f = 0; f < 3; f++) {
        const p = drawCharFrame(dir === "left" ? "right" : dir, f, o);
        if (dir === "left") p.mirrorX();
        atlas.blit(p, (di * 3 + f) * CW, row * CH);
      }
    });
    layout[name] = row;
  });
  return { pix: atlas, layout, rows: keys.length, cols, names: keys, w: CW, h: CH };
}
