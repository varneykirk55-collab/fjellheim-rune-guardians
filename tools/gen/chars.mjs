// chars.mjs - 16x24 overworld characters, 4 directions x 3 frames (idle, walkA, walkB).
// Frame order per character: down(3) up(3) right(3) left(3). Left is mirrored right.
import { Pix, rng, shade } from "./pix.mjs";

const W = 16;
const H = 24;

/**
 * opts: {
 *   hair, hairStyle: 'short'|'long'|'braid'|'bun'|'hood'|'bald'|'helmet'|'headscarf'|'cap',
 *   skin, tunic, trim, pants, boots, belt,
 *   beard: null|'short'|'long'|'white-long',
 *   dress: bool (skirt instead of pants), cape: color|null,
 *   staff: bool, spear: bool, apron: color|null, child: bool,
 *   hood: bool (hood over head, hides hair), eye: color
 * }
 */
export function drawChar(p, dir, frame, o) {
  const r = rng(7);
  const skin = o.skin || "#e8b48c";
  const skinS = shade(skin, -0.25);
  const hair = o.hair || "#6b4a2a";
  const hairS = shade(hair, -0.3);
  const tunic = o.tunic || "#4a6fa5";
  const tunicS = shade(tunic, -0.3);
  const tunicL = shade(tunic, 0.15);
  const trim = o.trim || "#d9a441";
  const pants = o.pants || "#5c4632";
  const pantsS = shade(pants, -0.3);
  const boots = o.boots || "#3a2a1c";
  const eye = o.eye || "#2a2028";
  const dy = 0; // children are scaled in-engine (keeps feet on ground)

  const F = frame; // 0 idle, 1/2 walk phases
  const legPhase = F === 0 ? 0 : F === 1 ? 1 : -1;

  if (dir === "down" || dir === "up") {
    const front = dir === "down";
    /* ---- legs / skirt ---- */
    if (o.dress) {
      // skirt trapezoid y16..21
      for (let y = 16 + dy; y <= 21 + dy; y++) {
        const wdt = 4 + (y - (16 + dy));
        p.rect(8 - wdt, y, wdt * 2 + 1, 1, y > 19 + dy ? tunicS : tunic);
      }
      p.rect(8 - 7, 21 + dy, 15, 1, shade(tunic, -0.45));
      // trim band
      for (let x = -6; x <= 6; x++) p.set(8 + x, 20 + dy, trim);
      // feet peek when walking
      if (legPhase !== 0) {
        p.rect(8 + legPhase * 2 - 1, 22 + dy, 2, 1, boots);
      }
    } else {
      const lx = legPhase; // -1,0,1
      // left leg
      p.rect(5 + (lx < 0 ? -1 : 0), 17 + dy, 2, 4 + (lx < 0 ? 1 : 0), pants);
      p.rect(5 + (lx < 0 ? -1 : 0), 17 + dy, 1, 4, shade(pants, 0.12));
      // right leg
      p.rect(9 + (lx > 0 ? 1 : 0), 17 + dy, 2, 4 + (lx > 0 ? 1 : 0), pants);
      // boots
      p.rect(4 + (lx < 0 ? -1 : 0), 21 + dy + (lx < 0 ? 1 : 0), 3, 2 - dy + (dy ? 0 : 0), boots);
      p.rect(9 + (lx > 0 ? 1 : 0), 21 + dy + (lx > 0 ? 1 : 0), 3, 2, boots);
      if (dy) {
        p.rect(4 + (lx < 0 ? -1 : 0), 21 + dy, 3, 2, boots);
        p.rect(9 + (lx > 0 ? 1 : 0), 21 + dy, 3, 2, boots);
      }
      p.rect(4 + (lx < 0 ? -1 : 0), 22 + dy + (lx < 0 ? 1 : 0), 3, 1, shade(boots, -0.4));
      p.rect(9 + (lx > 0 ? 1 : 0), 22 + dy + (lx > 0 ? 1 : 0), 3, 1, shade(boots, -0.4));
    }

    /* ---- torso ---- */
    p.rect(4, 10 + dy, 9, 8, tunic);
    p.rect(4, 10 + dy, 9, 1, tunicL);
    p.rect(4, 17 + dy, 9, 1, tunicS);
    // side shading
    p.rect(4, 10 + dy, 1, 8, tunicS);
    p.rect(12, 10 + dy, 1, 8, tunicS);
    if (!o.dress) {
      // belt
      p.rect(4, 15 + dy, 9, 1, o.belt || "#3a2a1c");
      if (front) p.set(8, 15 + dy, trim);
    } else {
      p.rect(4, 14 + dy, 9, 1, o.belt || "#3a2a1c");
      if (front) p.set(8, 14 + dy, trim);
    }
    // chest trim (front) / back seam (up)
    if (front) {
      p.rect(7, 10 + dy, 2, 5, trim);
      if (o.apron) {
        p.rect(5, 12 + dy, 6, 6, o.apron);
        p.rect(5, 12 + dy, 6, 1, shade(o.apron, 0.2));
      }
    } else {
      p.rect(8, 10 + dy, 1, 6, tunicS);
      if (o.cape) {
        p.rect(3, 10 + dy, 11, 10, o.cape);
        p.rect(3, 10 + dy, 11, 1, shade(o.cape, 0.18));
        p.rect(3, 19 + dy, 11, 1, shade(o.cape, -0.3));
        p.rect(7, 10 + dy, 3, 1, trim);
      }
    }
    /* ---- arms ---- */
    const armSwing = legPhase;
    for (const s of [-1, 1]) {
      const ax = s < 0 ? 3 : 13;
      const yo = s < 0 ? armSwing : -armSwing;
      p.rect(ax, 11 + dy + (yo < 0 ? -1 : 0), 1, 5, tunic);
      p.rect(ax, 15 + dy + yo, 1, 2, skin);
      p.set(ax, 17 + dy + yo, skinS);
    }

    /* ---- head ---- */
    // neck
    p.rect(7, 9 + dy, 2, 1, skinS);
    // face block
    p.rect(4, 3 + dy, 8, 7, skin);
    p.rect(4, 3 + dy, 1, 7, skinS);
    p.rect(11, 3 + dy, 1, 7, skinS);
    if (front) {
      // eyes
      if (!(F === 2 && o.child && r() < 0)) {
        p.rect(5, 6 + dy, 1, 2, eye);
        p.rect(9, 6 + dy, 1, 2, eye);
        p.set(5, 6 + dy, shade(eye, 0.3));
        p.set(9, 6 + dy, shade(eye, 0.3));
      }
      // mouth
      p.set(7, 9 + dy, shade(skin, -0.4));
      p.set(8, 9 + dy, shade(skin, -0.4));
    }
    /* hair / headwear */
    const hs = o.hairStyle || "short";
    if (hs === "short") {
      p.rect(3, 2 + dy, 10, 3, hair);
      p.rect(3, 2 + dy, 10, 1, shade(hair, 0.2));
      p.rect(3, 4 + dy, 1, 4, hair);
      p.rect(12, 4 + dy, 1, 4, hair);
      if (!front) p.rect(4, 5 + dy, 8, 4, hair);
      else {
        p.set(4, 5 + dy, hairS);
        p.set(11, 5 + dy, hairS);
      }
    } else if (hs === "long") {
      p.rect(3, 2 + dy, 10, 3, hair);
      p.rect(3, 2 + dy, 10, 1, shade(hair, 0.2));
      p.rect(3, 4 + dy, 1, 9, hair);
      p.rect(12, 4 + dy, 1, 9, hair);
      p.rect(4, 5 + dy, 8, 8, front ? hairS : hair);
      if (front) {
        p.rect(5, 3 + dy, 6, 2, hair); // fringe
        p.rect(3, 4 + dy, 2, 8, hair);
        p.rect(11, 4 + dy, 2, 8, hair);
        // re-draw face over fringe sides
        p.rect(5, 6 + dy, 6, 4, skin);
        p.rect(5, 6 + dy, 1, 2, eye);
        p.rect(9, 6 + dy, 1, 2, eye);
        p.set(7, 9 + dy, shade(skin, -0.4));
        p.set(8, 9 + dy, shade(skin, -0.4));
      } else {
        p.rect(4, 3 + dy, 8, 11, hair);
        p.rect(4, 3 + dy, 8, 1, shade(hair, 0.2));
        p.rect(7, 5 + dy, 1, 8, hairS);
      }
    } else if (hs === "braid") {
      p.rect(3, 2 + dy, 10, 3, hair);
      p.rect(3, 2 + dy, 10, 1, shade(hair, 0.2));
      p.rect(3, 4 + dy, 1, 4, hair);
      p.rect(12, 4 + dy, 1, 4, hair);
      if (front) {
        p.rect(4, 5 + dy, 2, 1, hair);
        p.rect(10, 5 + dy, 2, 1, hair);
        // twin braids
        p.rect(2, 5 + dy, 2, 7, hair);
        p.rect(12, 5 + dy, 2, 7, hair);
        for (let y = 0; y < 7; y++) {
          p.set(2, 5 + dy + y, y % 2 ? hairS : hair);
          p.set(13, 5 + dy + y, y % 2 ? hairS : hair);
        }
        p.set(2, 12 + dy, trim);
        p.set(13, 12 + dy, trim);
      } else {
        p.rect(4, 5 + dy, 8, 4, hair);
        p.rect(7, 9 + dy, 2, 6, hair);
        for (let y = 0; y < 6; y++) p.set(7, 9 + dy + y, y % 2 ? hairS : hair);
        p.set(7, 15 + dy, trim);
      }
    } else if (hs === "bun") {
      p.rect(3, 2 + dy, 10, 3, hair);
      p.ellipse(8, 1 + dy, 3, 2, hair);
      p.rect(3, 4 + dy, 1, 3, hair);
      p.rect(12, 4 + dy, 1, 3, hair);
      if (!front) p.rect(4, 4 + dy, 8, 4, hair);
    } else if (hs === "bald") {
      p.rect(3, 3 + dy, 10, 2, shade(skin, -0.1));
      p.rect(3, 4 + dy, 1, 2, hair);
      p.rect(12, 4 + dy, 1, 2, hair);
      if (!front) p.rect(4, 4 + dy, 8, 2, hair);
    } else if (hs === "hood") {
      p.rect(3, 1 + dy, 10, 5, o.hoodColor || tunic);
      p.rect(3, 1 + dy, 10, 1, shade(o.hoodColor || tunic, 0.2));
      p.rect(2, 4 + dy, 1, 7, o.hoodColor || tunic);
      p.rect(13, 4 + dy, 1, 7, o.hoodColor || tunic);
      if (front) {
        p.rect(4, 4 + dy, 8, 6, shade(o.hoodColor || tunic, -0.45)); // shadow
        p.rect(5, 5 + dy, 6, 4, skin);
        p.rect(5, 6 + dy, 1, 2, eye);
        p.rect(9, 6 + dy, 1, 2, eye);
      } else {
        p.rect(4, 4 + dy, 8, 9, o.hoodColor || tunic);
        p.rect(4, 10 + dy, 8, 3, shade(o.hoodColor || tunic, -0.2));
      }
      p.rect(4, 10 + dy, 8, 1, shade(o.hoodColor || tunic, -0.3));
    } else if (hs === "helmet") {
      p.rect(3, 1 + dy, 10, 4, "#9aa2ad");
      p.rect(3, 1 + dy, 10, 1, "#c3cad4");
      p.rect(2, 4 + dy, 12, 1, "#7d8590");
      p.rect(7, 4 + dy, 2, 3, "#9aa2ad"); // nose guard
      if (front) {
        p.rect(5, 6 + dy, 1, 2, eye);
        p.rect(9, 6 + dy, 1, 2, eye);
      }
      // cheek hair
      p.rect(3, 5 + dy, 1, 4, hair);
      p.rect(12, 5 + dy, 1, 4, hair);
      if (!front) p.rect(4, 5 + dy, 8, 3, hair);
    } else if (hs === "headscarf") {
      p.rect(3, 2 + dy, 10, 3, o.scarfColor || "#b0563c");
      p.rect(3, 2 + dy, 10, 1, shade(o.scarfColor || "#b0563c", 0.25));
      p.rect(3, 4 + dy, 1, 3, o.scarfColor || "#b0563c");
      p.rect(12, 4 + dy, 1, 3, o.scarfColor || "#b0563c");
      if (!front) {
        p.rect(4, 5 + dy, 8, 5, o.scarfColor || "#b0563c");
        p.rect(6, 8 + dy, 4, 4, shade(o.scarfColor || "#b0563c", -0.2)); // knot tail
      } else {
        p.set(4, 5 + dy, shade(o.scarfColor || "#b0563c", -0.25));
        p.set(11, 5 + dy, shade(o.scarfColor || "#b0563c", -0.25));
      }
    } else if (hs === "cap") {
      p.rect(3, 2 + dy, 10, 2, o.capColor || "#6e5224");
      p.rect(3, 4 + dy, 10, 1, shade(o.capColor || "#6e5224", -0.3));
      p.rect(3, 5 + dy, 1, 2, hair);
      p.rect(12, 5 + dy, 1, 2, hair);
      if (!front) p.rect(4, 5 + dy, 8, 3, hair);
    }
    /* beard */
    if (o.beard && front) {
      const bc = o.beard === "white-long" ? "#d8d4cc" : o.beardColor || hair;
      const bcs = shade(bc, -0.25);
      if (o.beard === "long" || o.beard === "white-long") {
        p.rect(4, 8 + dy, 8, 4, bc);
        p.rect(5, 12 + dy, 6, 1, bc);
        p.rect(6, 13 + dy, 4, 1, bcs);
        p.rect(4, 8 + dy, 1, 4, bcs);
        p.rect(11, 8 + dy, 1, 4, bcs);
        p.rect(7, 9 + dy, 2, 1, shade(skin, -0.4)); // mouth gap
      } else {
        p.rect(4, 8 + dy, 8, 2, bc);
        p.rect(5, 10 + dy, 6, 1, bcs);
        p.rect(7, 8 + dy, 2, 1, shade(skin, -0.4));
      }
    } else if (o.beard && !front && (o.beard === "long" || o.beard === "white-long")) {
      // beard wrap visible from behind
      const bc = o.beard === "white-long" ? "#d8d4cc" : o.beardColor || hair;
      p.rect(3, 8 + dy, 1, 3, bc);
      p.rect(12, 8 + dy, 1, 3, bc);
    }
    /* staff (right hand) */
    if (o.staff) {
      const sx = 14;
      const yo = armSwing;
      p.rect(sx, 3 + dy, 1, 19 - dy, "#6e5138");
      p.rect(sx, 3 + dy, 1, 1, "#8a6a4a");
      p.ellipse(sx, 2 + dy, 2, 2, PAL_orb());
      p.set(sx, 2 + dy, "#d8fffa");
      p.set(sx - 1, 3 + dy, "#8ff0e8");
      p.set(sx, 15 + dy + yo, skin); // hand grip
    }
    if (o.spear) {
      const sx = 14;
      p.rect(sx, 1, 1, 22, "#6e5138");
      p.poly([[sx - 1, 0], [sx + 1, 0], [sx, 4 + dy * 0]], "#c9ced6");
      p.rect(sx - 1, 1, 3, 3, "#aeb6c0");
      p.rect(sx, 0, 1, 4, "#d7dce2");
    }
    if (o.bow && !front) {
      // bow across back
      p.line(4, 10 + dy, 12, 17 + dy, "#6e5138");
      p.line(12, 10 + dy, 4, 17 + dy, "#6e5138");
      p.rect(7, 12 + dy, 2, 4, "#8a6a4a");
    }
  } else {
    /* ================= SIDE (facing right) ================= */
    const sgn = 1; // facing right
    const swing = legPhase;
    /* legs */
    if (o.dress) {
      for (let y = 16 + dy; y <= 21 + dy; y++) {
        const wdt = 3 + (y - (16 + dy));
        p.rect(8 - wdt + 1, y, wdt * 2 - 1, 1, y > 19 + dy ? tunicS : tunic);
      }
      p.rect(4, 21 + dy, 9, 1, shade(tunic, -0.45));
      if (swing !== 0) p.rect(8 + swing * 2, 22 + dy, 2, 1, boots);
      else p.rect(7, 22 + dy, 3, 1, boots);
    } else {
      // back leg
      p.rect(6 - swing, 17 + dy, 2, 4, pantsS);
      p.rect(6 - swing, 21 + dy, 3, 2, shade(boots, -0.2));
      // front leg
      p.rect(8 + swing, 17 + dy, 2, 4, pants);
      p.rect(8 + swing, 21 + dy, 3, 2, boots);
    }
    /* torso */
    p.rect(5, 10 + dy, 7, 8, tunic);
    p.rect(5, 10 + dy, 7, 1, tunicL);
    p.rect(11, 10 + dy, 1, 8, tunicS);
    p.rect(5, 10 + dy, 1, 8, tunicS);
    if (!o.dress) p.rect(5, 15 + dy, 7, 1, o.belt || "#3a2a1c");
    else p.rect(5, 14 + dy, 7, 1, o.belt || "#3a2a1c");
    p.set(9, 15 + dy, trim);
    if (o.apron) {
      p.rect(8, 12 + dy, 4, 6, o.apron);
      p.rect(8, 12 + dy, 4, 1, shade(o.apron, 0.2));
    }
    if (o.cape) {
      p.rect(3, 10 + dy, 4, 10, o.cape);
      p.rect(3, 10 + dy, 4, 1, shade(o.cape, 0.18));
      p.rect(3, 19 + dy, 4, 1, shade(o.cape, -0.3));
    }
    if (o.bow) {
      p.line(4, 10 + dy, 6, 17 + dy, "#6e5138");
      p.line(6, 10 + dy, 4, 17 + dy, "#6e5138");
    }
    /* arm (front) */
    p.rect(9, 11 + dy + (swing < 0 ? -1 : 0), 2, 5, tunic);
    p.rect(9, 15 + dy + (swing > 0 ? 1 : swing < 0 ? -1 : 0), 2, 2, skin);
    /* head */
    p.rect(7, 9 + dy, 2, 1, skinS);
    p.rect(5, 3 + dy, 7, 7, skin);
    p.rect(5, 3 + dy, 1, 7, skinS);
    // face front (right side)
    p.rect(11, 5 + dy, 1, 4, skin); // nose ridge
    p.set(12, 6 + dy, skin);
    p.set(12, 7 + dy, skinS);
    p.rect(9, 6 + dy, 1, 2, eye);
    p.set(10, 9 + dy, shade(skin, -0.4));
    const hs = o.hairStyle || "short";
    if (hs === "short" || hs === "bald") {
      if (hs === "short") {
        p.rect(4, 2 + dy, 8, 3, hair);
        p.rect(4, 2 + dy, 8, 1, shade(hair, 0.2));
        p.rect(4, 4 + dy, 2, 5, hair);
        p.rect(6, 5 + dy, 1, 2, hair);
      } else {
        p.rect(5, 3 + dy, 5, 1, shade(skin, -0.1));
        p.rect(4, 4 + dy, 2, 3, hair);
      }
      if (o.beard) {
        const bc = o.beard === "white-long" ? "#d8d4cc" : o.beardColor || hair;
        p.rect(8, 8 + dy, 4, 3, bc);
        p.rect(9, 11 + dy, 3, 1, shade(bc, -0.25));
        p.set(11, 8 + dy, shade(skin, -0.4));
      }
    } else if (hs === "long") {
      p.rect(4, 2 + dy, 8, 3, hair);
      p.rect(4, 4 + dy, 3, 10, hair);
      p.rect(5, 12 + dy, 2, 3, hairS);
      p.set(7, 5 + dy, hair);
    } else if (hs === "braid") {
      p.rect(4, 2 + dy, 8, 3, hair);
      p.rect(4, 4 + dy, 2, 5, hair);
      // braid hanging behind
      p.rect(3, 5 + dy, 2, 8, hair);
      for (let y = 0; y < 8; y++) p.set(3, 5 + dy + y, y % 2 ? hairS : hair);
      p.set(3, 13 + dy, trim);
      if (o.beard) {
        const bc = o.beardColor || hair;
        p.rect(8, 8 + dy, 4, 2, bc);
      }
    } else if (hs === "bun") {
      p.rect(4, 2 + dy, 8, 3, hair);
      p.ellipse(4, 3 + dy, 2, 2, hair);
      p.rect(4, 4 + dy, 2, 3, hair);
    } else if (hs === "hood") {
      const hc = o.hoodColor || tunic;
      p.rect(3, 1 + dy, 9, 4, hc);
      p.rect(3, 1 + dy, 9, 1, shade(hc, 0.2));
      p.rect(3, 4 + dy, 3, 8, hc);
      p.rect(6, 4 + dy, 6, 1, shade(hc, -0.35));
      p.rect(7, 5 + dy, 5, 5, skin);
      p.rect(10, 6 + dy, 1, 2, eye);
      p.rect(3, 10 + dy, 4, 3, shade(hc, -0.2));
    } else if (hs === "helmet") {
      p.rect(4, 1 + dy, 8, 4, "#9aa2ad");
      p.rect(4, 1 + dy, 8, 1, "#c3cad4");
      p.rect(3, 4 + dy, 10, 1, "#7d8590");
      p.rect(11, 5 + dy, 1, 3, "#9aa2ad");
      p.rect(4, 5 + dy, 1, 4, hair);
      p.rect(10, 6 + dy, 1, 2, eye);
    } else if (hs === "headscarf") {
      const sc = o.scarfColor || "#b0563c";
      p.rect(4, 2 + dy, 8, 3, sc);
      p.rect(4, 2 + dy, 8, 1, shade(sc, 0.25));
      p.rect(4, 4 + dy, 2, 4, sc);
      p.rect(3, 5 + dy, 2, 4, shade(sc, -0.2));
    } else if (hs === "cap") {
      const cc = o.capColor || "#6e5224";
      p.rect(4, 2 + dy, 8, 2, cc);
      p.rect(4, 4 + dy, 9, 1, shade(cc, -0.3));
      p.rect(4, 5 + dy, 1, 2, hair);
    }
    if (o.staff) {
      const sx = 12 + swing;
      p.rect(sx, 3 + dy, 1, 19 - dy, "#6e5138");
      p.ellipse(sx, 2 + dy, 2, 2, PAL_orb());
      p.set(sx, 2 + dy, "#d8fffa");
      p.set(sx, 14 + dy, skin);
    }
    if (o.spear) {
      p.rect(13, 1, 1, 22, "#6e5138");
      p.rect(12, 0, 3, 4, "#aeb6c0");
      p.rect(13, 0, 1, 4, "#d7dce2");
    }
  }
}

function PAL_orb() {
  return "#43c6c0";
}

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
  const atlas = new Pix(cols * W, keys.length * H);
  const layout = {};
  keys.forEach((name, row) => {
    const o = CAST[name];
    const dirs = ["down", "up", "right", "left"];
    dirs.forEach((dir, di) => {
      for (let f = 0; f < 3; f++) {
        const p = new Pix(W, H);
        const actualDir = dir === "left" ? "right" : dir;
        drawChar(p, actualDir, f, o);
        if (dir === "left") p.mirrorX();
        p.outline(0.5);
        atlas.blit(p, (di * 3 + f) * W, row * H);
      }
    });
    layout[name] = row;
  });
  return { pix: atlas, layout, rows: keys.length, cols, names: keys };
}
