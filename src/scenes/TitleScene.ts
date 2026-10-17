// TitleScene.ts - title screen, new game / continue / settings.
import Phaser from "phaser";
import { Audio } from "../core/audio";
import { Input } from "../core/input";
import { SaveManager } from "../core/save";
import { Session } from "../core/session";
import { TXT, textStyle } from "../ui/theme";
import { charFrameIndex } from "./WorldScene";

/** the two playable heroes: same story and abilities, different sprite */
export const PROTAGONISTS = [
  { char: "eirik", name: "Eirik", title: "SON OF BJORN" },
  { char: "astri", name: "Astri", title: "DAUGHTER OF BJORN" },
] as const;

export class TitleScene extends Phaser.Scene {
  private menuIndex = 0;
  private items: string[] = [];
  private cursor!: Phaser.GameObjects.Image;
  private labels: Phaser.GameObjects.Text[] = [];
  private mode: "main" | "name" | "settings" = "main";
  private nameIndex = 0;
  private ring!: Phaser.GameObjects.Image;
  /** extra objects of the current menu (headings, character previews) */
  private extras: Phaser.GameObjects.GameObject[] = [];
  private previews: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super("title");
  }

  create() {
    Input.beginFrame();
    this.add.image(256, 144, "title_bg").setDepth(0);
    this.ring = this.add.image(256, 128, "rune_circle").setAlpha(0.5).setDepth(1);
    this.tweens.add({ targets: this.ring, angle: 360, duration: 90000, repeat: -1 });

    const title = this.add.text(256, 74, "FJELLHEIM", textStyle(TXT, { fontSize: "28px", color: "#f0c860" })).setOrigin(0.5).setDepth(2);
    title.setShadow(2, 2, "#241c26", 4, true, true);
    const sub = this.add.text(256, 104, "RUNE GUARDIANS", textStyle(TXT, { fontSize: "10px", color: "#a8f4ec" })).setOrigin(0.5).setDepth(2);
    sub.setShadow(1, 1, "#241c26", 3, true, true);
    this.add.text(256, 274, "an original viking creature saga - phase 1", textStyle(TXT, { fontSize: "7px", color: "#8a92a8" })).setOrigin(0.5).setDepth(2);
    this.add.text(504, 282, "v0.1", textStyle(TXT, { fontSize: "7px", color: "#5a6278" })).setOrigin(1, 1).setDepth(2);

    this.cursor = this.add.image(0, 0, "cursor").setDepth(3);
    this.buildMain();
    Audio.startMusic("title");

    this.input.once("pointerdown", () => Audio.unlock());
    this.input.keyboard?.on("keydown", () => Audio.unlock());
  }

  private clearMenu() {
    this.labels.forEach((l) => l.destroy());
    this.labels = [];
    this.extras.forEach((o) => o.destroy());
    this.extras = [];
    this.previews = [];
  }

  private buildMain() {
    this.clearMenu();
    this.mode = "main";
    this.items = ["NEW SAGA", ...(SaveManager.hasSave() ? ["CONTINUE"] : []), "SETTINGS"];
    this.items.forEach((it, i) => {
      const t = this.add.text(256, 190 + i * 22, it, textStyle(TXT, { fontSize: "11px" })).setOrigin(0.5).setDepth(3);
      this.clickable(t, i);
      this.labels.push(t);
    });
    this.menuIndex = 0;
    this.placeCursor();
  }

  /** hover selects, click activates - keeps mouse users in sync with keyboard nav */
  private clickable(t: Phaser.GameObjects.Text, i: number) {
    t.setInteractive({ useHandCursor: true });
    t.on("pointerover", () => {
      if (this.menuIndex !== i) Audio.sfx("cursor");
      this.menuIndex = i;
      this.placeCursor();
    });
    t.on("pointerdown", () => {
      this.menuIndex = i;
      this.placeCursor();
      Input.suppress("a");
      Input.suppress("b");
      this.activate();
    });
  }

  /** shared activation for keyboard 'a' and mouse clicks */
  private activate() {
    Audio.sfx("confirm");
    if (this.mode === "main") {
      const pick = this.items[this.menuIndex];
      if (pick === "NEW SAGA") this.buildName();
      else if (pick === "CONTINUE") {
        if (Session.continueFromSave()) {
          const st = Session.get();
          Audio.setVolumes(st.settings.music, st.settings.sfx);
          this.scene.start("world", { map: st.pos.map });
        }
      } else this.buildSettings();
      return;
    }
    if (this.mode === "name") {
      const hero = PROTAGONISTS[this.menuIndex];
      Session.startNew(hero.name, hero.char);
      Audio.unlock();
      this.scene.start("world", { map: "home", fresh: true });
      return;
    }
    // settings
    if (this.menuIndex === 4) this.buildMain();
    else {
      this.applySetting(this.menuIndex, 1);
      Audio.sfx("cursor");
    }
  }

  private buildName() {
    this.clearMenu();
    this.mode = "name";
    this.extras.push(this.add.text(256, 140, "WHO ANSWERS THE CALL?", textStyle(TXT, { fontSize: "9px", color: "#f0c860" })).setOrigin(0.5).setDepth(3));
    PROTAGONISTS.forEach((p, i) => {
      const x = 176 + i * 160;
      // the selected hero walks toward the camera; the other stands still
      const sprite = this.add.sprite(x, 226, "chars", charFrameIndex(p.char, "down", 0)).setOrigin(0.5, 1).setScale(2).setDepth(3);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on("pointerover", () => this.selectHero(i));
      sprite.on("pointerdown", () => {
        this.selectHero(i);
        Input.suppress("a");
        Input.suppress("b");
        this.activate();
      });
      this.previews.push(sprite);
      const t = this.add.text(x, 238, p.name.toUpperCase(), textStyle(TXT, { fontSize: "9px" })).setOrigin(0.5, 0).setDepth(3);
      this.clickable(t, i);
      this.labels.push(t);
      this.extras.push(this.add.text(x, 252, p.title, textStyle(TXT, { fontSize: "7px", color: "#a8b0c4" })).setOrigin(0.5, 0).setDepth(3));
    });
    this.nameIndex = 0;
    this.menuIndex = 0;
    this.placeCursor();
  }

  private selectHero(i: number) {
    if (this.menuIndex !== i) Audio.sfx("cursor");
    this.menuIndex = i;
    this.placeCursor();
  }

  private buildSettings() {
    this.clearMenu();
    this.mode = "settings";
    const st = Session.has() ? Session.get().settings : { music: 0.7, sfx: 0.8, textSpeed: "normal" as const, touch: "auto" as const };
    const rows = [
      ["MUSIC", Math.round(st.music * 10) + "/10"],
      ["SOUNDS", Math.round(st.sfx * 10) + "/10"],
      ["TEXT SPEED", st.textSpeed],
      ["TOUCH PAD", st.touch],
      ["BACK", ""],
    ];
    rows.forEach(([k, v], i) => {
      const t = this.add.text(176, 168 + i * 18, k, textStyle(TXT, { fontSize: "9px" })).setDepth(3);
      const t2 = this.add.text(336, 168 + i * 18, v, textStyle(TXT, { fontSize: "9px", color: "#a8f4ec" })).setDepth(3);
      this.clickable(t, i);
      this.clickable(t2, i);
      this.labels.push(t, t2);
    });
    this.menuIndex = 0;
    this.placeCursor();
  }

  private placeCursor() {
    if (this.mode === "name") {
      this.cursor.setPosition(176 + this.menuIndex * 160 - 44, 242);
      this.previews.forEach((p, i) => p.setAlpha(i === this.menuIndex ? 1 : 0.55));
      return;
    }
    const row = this.mode === "settings" ? 18 : 22;
    const base = this.mode === "main" ? 190 : 168;
    const x = this.mode === "settings" ? 164 : 256 - 90;
    this.cursor.setPosition(x, base + this.menuIndex * row);
  }

  private applySetting(idx: number, dir: number) {
    const st = Session.has() ? Session.get().settings : null;
    const bump = (v: number) => Math.max(0, Math.min(1, Math.round((v + dir * 0.1) * 10) / 10));
    if (!st) {
      // no session yet: adjust globals only
      if (idx === 0) Audio.setVolumes(bump(Audio.musicVol), Audio.sfxVol);
      if (idx === 1) Audio.setVolumes(Audio.musicVol, bump(Audio.sfxVol));
      this.buildSettings();
      return;
    }
    if (idx === 0) st.music = bump(st.music);
    if (idx === 1) st.sfx = bump(st.sfx);
    if (idx === 2) st.textSpeed = st.textSpeed === "slow" ? "normal" : st.textSpeed === "normal" ? "fast" : "slow";
    if (idx === 3) st.touch = st.touch === "auto" ? "on" : st.touch === "on" ? "off" : "auto";
    Audio.setVolumes(st.music, st.sfx);
    this.buildSettings();
  }

  update() {
    Input.beginFrame();
    Input.pollVirtual();
    if (this.mode === "name") {
      // the highlighted hero walks in place: stand, step, stand, other step
      const step = [0, 1, 0, 2][Math.floor(this.time.now / 170) % 4];
      this.previews.forEach((p, i) => p.setFrame(charFrameIndex(PROTAGONISTS[i].char, "down", i === this.menuIndex ? step : 0)));
    }
    if (this.mode === "main" || this.mode === "name") {
      const n = this.mode === "main" ? this.items.length : 2;
      if (Input.justPressed("down")) {
        this.menuIndex = (this.menuIndex + 1) % n;
        Audio.sfx("cursor");
        this.placeCursor();
      }
      if (Input.justPressed("up")) {
        this.menuIndex = (this.menuIndex + n - 1) % n;
        Audio.sfx("cursor");
        this.placeCursor();
      }
      if (this.mode === "name" && (Input.justPressed("left") || Input.justPressed("right"))) {
        this.selectHero(1 - this.menuIndex);
      }
      if (Input.justPressed("a")) this.activate();
      if (this.mode === "name") {
        this.nameIndex = this.menuIndex;
      }
      if (Input.justPressed("b") && this.mode === "name") {
        Audio.sfx("cancel");
        this.buildMain();
      }
    } else {
      // settings
      if (Input.justPressed("down")) {
        this.menuIndex = (this.menuIndex + 1) % 5;
        Audio.sfx("cursor");
        this.placeCursor();
      }
      if (Input.justPressed("up")) {
        this.menuIndex = (this.menuIndex + 4) % 5;
        Audio.sfx("cursor");
        this.placeCursor();
      }
      if (Input.justPressed("left")) {
        this.applySetting(this.menuIndex, -1);
        Audio.sfx("cursor");
      }
      if (Input.justPressed("right")) {
        this.applySetting(this.menuIndex, 1);
        Audio.sfx("cursor");
      }
      if (Input.justPressed("a")) this.activate();
      if (Input.justPressed("b")) {
        Audio.sfx("cancel");
        this.buildMain();
      }
    }
  }
}
