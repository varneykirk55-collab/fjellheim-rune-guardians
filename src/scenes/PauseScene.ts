// PauseScene.ts - pause overlay: party, bag, save, settings.
// Fully navigable by keyboard, mouse (hover + click) and touch.
import Phaser from "phaser";
import { Audio } from "../core/audio";
import { Input } from "../core/input";
import { Session } from "../core/session";
import { getSpecies } from "../data/species";
import { getItem } from "../data/items";
import { getMove } from "../data/moves";
import { maxHpOf } from "../battle/progression";
import { ELEMENT_LABEL } from "../data/elements";
import { TXT, textStyle } from "../ui/theme";
import { WorldScene, creatureFrameIndex } from "./WorldScene";
import { ASSET_LAYOUT } from "../assets/layout";

type View = "menu" | "party" | "partyDetail" | "bag" | "bagTarget" | "save" | "settings" | "title";

export class PauseScene extends Phaser.Scene {
  private view: View = "menu";
  private index = 0;
  private container!: Phaser.GameObjects.Container;
  private cursor!: Phaser.GameObjects.Image;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private bagReturnIndex: number | undefined;
  private partySel = 0;

  constructor() {
    super("pause");
  }

  create() {
    this.container = this.add.container(0, 0).setDepth(1000);
    this.add.rectangle(256, 144, 512, 288, 0x0d0a14, 0.55).setDepth(999);
    this.cursor = this.add.image(0, 0, "cursor").setDepth(1002);
    this.container.add(this.cursor);
    this.openView("menu");
  }

  private clear() {
    this.rows.forEach((r) => r.destroy());
    this.rows = [];
  }

  private text(x: number, y: number, s: string, style: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}) {
    const t = this.add.text(x, y, s, textStyle(TXT, style)).setDepth(1001);
    this.container.add(t);
    this.rows.push(t);
    return t;
  }

  private panel(x: number, y: number, w: number, h: number) {
    const p = this.add.nineslice(x, y, "panel", undefined, w, h, 10, 10, 10, 10).setOrigin(0, 0).setDepth(1000);
    this.container.add(p);
    this.rows.push(p);
    return p;
  }

  private sprite(x: number, y: number, key: string, frame?: number, scale = 1) {
    const img = this.add.image(x, y, key).setDepth(1001).setScale(scale);
    if (frame !== undefined) img.setFrame(frame);
    this.container.add(img);
    this.rows.push(img);
    return img;
  }

  /** hover selects the row, click activates it (suppressing the global click-as-confirm) */
  private clickRow(t: Phaser.GameObjects.Text, i: number, custom?: () => void) {
    t.setInteractive({ useHandCursor: true });
    t.on("pointerover", () => {
      if (this.index !== i) Audio.sfx("cursor");
      this.index = i;
      this.cursor.setY(this.cursorBase + i * this.cursorStep);
    });
    t.on("pointerdown", () => {
      Input.suppress("a");
      Input.suppress("b");
      this.index = i;
      if (custom) custom();
      else this.activate();
    });
  }

  private openView(v: View, keepIndex = false) {
    this.clear();
    this.view = v;
    if (!keepIndex) this.index = 0;
    const st = Session.get();
    if (v === "menu") {
      this.panel(196, 60, 120, 168);
      const items = ["PARTY", "BAG", "SAVE", "OPTIONS", "RESUME", "QUIT"];
      items.forEach((it, i) => this.clickRow(this.text(224, 76 + i * 24, it, { fontSize: "9px" }), i));
      this.placeCursor(212, 80, 24);
    } else if (v === "party") {
      this.panel(60, 30, 392, 228);
      this.text(76, 42, "PARTY", { fontSize: "10px", color: "#f0c860" });
      st.party.forEach((c, i) => {
        const sp = getSpecies(c.speciesId);
        this.sprite(92, 76 + i * 32, "creatures", creatureFrameIndex(sp.sprite), 0.45);
        const rowText = this.text(120, 64 + i * 32, `${(c.nickname || sp.name).slice(0, 10).toUpperCase()}  L${c.level}`, { fontSize: "8px" });
        this.text(260, 64 + i * 32, `HP ${c.hp}/${maxHpOf(c)}`, { fontSize: "8px", color: c.hp > 0 ? "#9ae070" : "#e05038" });
        this.text(360, 64 + i * 32, sp.types.map((t) => ELEMENT_LABEL[t]).join("/"), { fontSize: "7px", color: "#9a92a8" });
        this.clickRow(rowText, i);
      });
      if (st.party.length === 0) this.text(120, 90, "No creatures yet.", { fontSize: "8px", color: "#9a92a8" });
      this.text(76, 240, "Z/click: inspect   X: back", { fontSize: "7px", color: "#9a92a8" });
      this.placeCursor(108, 68, 32);
    } else if (v === "partyDetail") {
      const c = st.party[this.index];
      const sp = getSpecies(c.speciesId);
      this.panel(96, 24, 320, 240);
      this.sprite(150, 90, "creatures", creatureFrameIndex(sp.sprite), 1.4);
      this.text(220, 40, `${(c.nickname || sp.name).toUpperCase()}`, { fontSize: "11px", color: "#f0c860" });
      this.text(220, 60, `Level ${c.level}   ${sp.types.map((t) => ELEMENT_LABEL[t]).join("/")}`, { fontSize: "8px" });
      this.text(220, 76, `HP ${c.hp}/${maxHpOf(c)}`, { fontSize: "8px", color: "#9ae070" });
      this.text(220, 96, `MIGHT ${stat(c, "might")}  GUARD ${stat(c, "guard")}`, { fontSize: "7px", color: "#9a92a8" });
      this.text(220, 110, `SEIDR ${stat(c, "seidr")}  WARD ${stat(c, "ward")}`, { fontSize: "7px", color: "#9a92a8" });
      this.text(220, 124, `SWIFT ${stat(c, "swift")}`, { fontSize: "7px", color: "#9a92a8" });
      this.text(112, 150, "MOVES", { fontSize: "8px", color: "#f0c860" });
      c.moves.forEach((m, i) => {
        const mv = getMove(m.id);
        this.text(112, 166 + i * 16, `${mv.name.toUpperCase().slice(0, 14)}  ${ELEMENT_LABEL[mv.element]}  ${m.pp}/${mv.pp}`, { fontSize: "7px" });
      });
      this.text(112, 240, "Z/click: make leader   X: back", { fontSize: "7px", color: "#9a92a8" });
      this.cursor.setVisible(false);
    } else if (v === "bag") {
      this.panel(96, 30, 320, 228);
      this.text(112, 42, `BAG   silver: ${st.bag.silver}`, { fontSize: "9px", color: "#f0c860" });
      const ids = Object.keys(st.bag.items);
      ids.forEach((id, i) => {
        const it = getItem(id);
        this.sprite(124, 70 + i * 20, "icons", iconIdx(it.icon), 1);
        this.clickRow(this.text(140, 62 + i * 20, `${it.name} x${st.bag.items[id]}`, { fontSize: "8px" }), i);
      });
      if (ids.length === 0) this.text(140, 70, "Empty. Visit the shop!", { fontSize: "8px", color: "#9a92a8" });
      this.text(112, 240, "Z/click: use   X: back", { fontSize: "7px", color: "#9a92a8" });
      this.placeCursor(108, 66, 20);
    } else if (v === "bagTarget") {
      this.panel(96, 30, 320, 228);
      this.text(112, 42, "USE ON WHOM?", { fontSize: "9px", color: "#f0c860" });
      st.party.forEach((c, i) => {
        const sp = getSpecies(c.speciesId);
        this.clickRow(this.text(120, 66 + i * 20, `${sp.name.slice(0, 10).toUpperCase()} L${c.level}  HP ${c.hp}/${maxHpOf(c)}`, { fontSize: "8px" }), i);
      });
      this.text(112, 240, "Z/click: use   X: cancel", { fontSize: "7px", color: "#9a92a8" });
      this.placeCursor(108, 70, 20);
    } else if (v === "save") {
      this.panel(156, 100, 200, 88);
      this.text(176, 116, "Carve your saga into", { fontSize: "8px" });
      this.text(176, 130, "the save-stone?", { fontSize: "8px" });
      this.text(176, 152, "Z/click: save   X: cancel", { fontSize: "7px", color: "#9a92a8" });
      this.cursor.setVisible(false);
    } else if (v === "settings") {
      this.panel(136, 60, 240, 168);
      this.text(156, 74, "OPTIONS", { fontSize: "10px", color: "#f0c860" });
      const s = st.settings;
      const settingRows: [string, string][] = [
        ["MUSIC", `${Math.round(s.music * 10)}/10`],
        ["SOUNDS", `${Math.round(s.sfx * 10)}/10`],
        ["TEXT SPEED", s.textSpeed],
        ["TOUCH PAD", s.touch],
      ];
      settingRows.forEach(([k, val], i) => {
        const t = this.text(156, 100 + i * 20, k, { fontSize: "8px" });
        this.text(300, 100 + i * 20, val, { fontSize: "8px", color: "#a8f4ec" });
        // clicking a setting row cycles it forward (like the right arrow)
        this.clickRow(t, i, () => this.applyDelta(1));
      });
      const back = this.text(156, 190, "BACK (X)", { fontSize: "7px", color: "#9a92a8" });
      back.setInteractive({ useHandCursor: true });
      back.on("pointerdown", () => {
        Input.suppress("a");
        Input.suppress("b");
        Audio.sfx("cancel");
        this.closeSettings();
      });
      this.placeCursor(144, 104, 20);
    } else if (v === "title") {
      this.panel(136, 100, 240, 88);
      this.text(156, 116, "Return to title?", { fontSize: "8px" });
      this.text(156, 130, "Unsaved progress is lost!", { fontSize: "7px", color: "#e05038" });
      this.text(156, 152, "Z/click: quit   X: cancel", { fontSize: "7px", color: "#9a92a8" });
      this.cursor.setVisible(false);
    }
    if (v !== "partyDetail" && v !== "save" && v !== "title") this.cursor.setVisible(true);
  }

  private placeCursor(x: number, y: number, step: number) {
    this.cursor.setPosition(x, y + this.index * step);
    this.cursorStep = step;
    this.cursorBase = y;
  }

  private cursorStep = 24;
  private cursorBase = 80;

  private n(): number {
    const st = Session.get();
    switch (this.view) {
      case "menu": return 6;
      case "party": return Math.max(1, st.party.length);
      case "bag": return Math.max(1, Object.keys(st.bag.items).length);
      case "bagTarget": return Math.max(1, st.party.length);
      case "settings": return 4;
      default: return 1;
    }
  }

  /** the Z/click activation for the current view */
  private activate() {
    const st = Session.get();
    if (this.view === "menu") {
      Audio.sfx("confirm");
      if (this.index === 0) this.openView("party");
      else if (this.index === 1) this.openView("bag");
      else if (this.index === 2) this.openView("save");
      else if (this.index === 3) this.openView("settings");
      else if (this.index === 4) this.close();
      else this.openView("title");
      return;
    }
    if (this.view === "party") {
      if (!st.party.length) return;
      Audio.sfx("confirm");
      this.partySel = this.index;
      this.openView("partyDetail", true);
      return;
    }
    if (this.view === "partyDetail") {
      const c = st.party.splice(this.partySel, 1)[0];
      st.party.unshift(c);
      Audio.sfx("confirm");
      this.openView("party");
      this.index = 0;
      this.placeCursor(108, 68, 32);
      return;
    }
    if (this.view === "bag") {
      const ids = Object.keys(st.bag.items);
      if (!ids.length) return;
      const it = getItem(ids[this.index]);
      if (it.kind === "heal" || it.kind === "cure") {
        Audio.sfx("confirm");
        this.bagReturnIndex = this.index;
        this.openView("bagTarget");
      } else {
        Audio.sfx("error");
      }
      return;
    }
    if (this.view === "bagTarget") {
      const ids = Object.keys(st.bag.items);
      const it = getItem(ids[this.bagReturnIndex ?? 0]);
      const c = st.party[this.index];
      if (!c) return;
      if (it.kind === "heal") {
        c.hp = Math.min(maxHpOf(c), c.hp + (it.healAmount ?? 0));
        Audio.sfx("heal");
      } else if (it.kind === "cure" && c.status === it.cures) {
        c.status = null;
        Audio.sfx("heal");
      } else {
        Audio.sfx("error");
        return;
      }
      Session.addItem(it.id, -1);
      this.openView("bag");
      return;
    }
    if (this.view === "save") {
      const world = this.scene.get("world") as WorldScene;
      if (world?.sys.isActive()) world.syncPos();
      if (Session.save()) {
        Audio.sfx("save");
        this.openView("menu");
        this.flashMsg("Saga saved!");
      } else {
        Audio.sfx("error");
      }
      return;
    }
    if (this.view === "settings") {
      this.applyDelta(1);
      return;
    }
    if (this.view === "title") {
      Audio.sfx("confirm");
      this.scene.stop("world");
      this.scene.stop("pause");
      this.scene.start("title");
      return;
    }
  }

  private applyDelta(d: number) {
    const s = Session.get().settings;
    const bump = (v: number) => Math.max(0, Math.min(1, Math.round((v + d * 0.1) * 10) / 10));
    if (this.index === 0) s.music = bump(s.music);
    if (this.index === 1) s.sfx = bump(s.sfx);
    if (this.index === 2) s.textSpeed = s.textSpeed === "slow" ? "normal" : s.textSpeed === "normal" ? "fast" : "slow";
    if (this.index === 3) s.touch = s.touch === "auto" ? "on" : s.touch === "on" ? "off" : "auto";
    Audio.setVolumes(s.music, s.sfx);
    Audio.sfx("cursor");
    this.openView("settings", true);
  }

  private closeSettings() {
    const world = this.scene.get("world") as WorldScene;
    world?.refreshTouch();
    this.openView("menu");
  }

  update() {
    Input.beginFrame();
    Input.pollVirtual();

    const nav = () => {
      if (Input.justPressed("down")) {
        this.index = (this.index + 1) % this.n();
        Audio.sfx("cursor");
        this.cursor.setY(this.cursorBase + this.index * this.cursorStep);
      }
      if (Input.justPressed("up")) {
        this.index = (this.index + this.n() - 1) % this.n();
        Audio.sfx("cursor");
        this.cursor.setY(this.cursorBase + this.index * this.cursorStep);
      }
    };

    if (this.view === "menu" || this.view === "party" || this.view === "bag" || this.view === "bagTarget") nav();
    if (this.view === "settings" && (Input.justPressed("down") || Input.justPressed("up"))) {
      nav();
      return;
    }

    if (Input.justPressed("a")) this.activate();

    if (Input.justPressed("b")) {
      Audio.sfx("cancel");
      if (this.view === "menu") this.close();
      else if (this.view === "party" || this.view === "bag") this.openView("menu");
      else if (this.view === "partyDetail") {
        this.openView("party");
        this.index = this.partySel;
        this.placeCursor(108, 68, 32);
      } else if (this.view === "bagTarget") this.openView("bag");
      else if (this.view === "save" || this.view === "title") this.openView("menu");
      else if (this.view === "settings") this.closeSettings();
      return;
    }
    if (this.view === "menu" && Input.justPressed("menu")) this.close();
  }

  private flashMsg(text: string) {
    const t = this.add.text(256, 40, text, textStyle(TXT, { fontSize: "9px", color: "#8ff0e8", backgroundColor: "#1a2430", padding: { x: 6, y: 4 } })).setOrigin(0.5).setDepth(1100);
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() });
  }

  private close() {
    Audio.sfx("cancel");
    this.scene.stop("pause");
    // world sleeps while the menu is open; wake (not resume) makes it visible again
    this.scene.wake("world");
  }
}

function stat(c: { speciesId: string; level: number }, key: "might" | "guard" | "seidr" | "ward" | "swift"): number {
  const sp = getSpecies(c.speciesId);
  return Math.floor((2 * sp.base[key] * c.level) / 100) + 5;
}

function iconIdx(icon: string): number {
  return (ASSET_LAYOUT.ui.icons as Record<string, number>)[icon] ?? 0;
}
