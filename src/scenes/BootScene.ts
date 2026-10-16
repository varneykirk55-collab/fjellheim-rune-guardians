// BootScene.ts - asset loading & boot splash.
import Phaser from "phaser";
import { ASSET_LAYOUT } from "../assets/layout";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    const A = "assets/";
    this.load.setCORS?.("");
    this.load.image("tiles", A + "tiles.png");
    this.load.spritesheet("chars", A + "chars.png", { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet("creatures", A + "creatures.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("icons", A + "icons.png", { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("elements", A + "elements.png", { frameWidth: 16, frameHeight: 16 });
    for (const key of Object.keys(ASSET_LAYOUT.objects)) {
      this.load.image(key, A + key + ".png");
    }
    this.load.image("title_bg", A + "title_bg.png");
    this.load.image("battle_meadow", A + "battle_meadow.png");
    this.load.image("battle_forest", A + "battle_forest.png");
    this.load.image("battle_shore", A + "battle_shore.png");
    this.load.image("battle_indoor", A + "battle_indoor.png");
    this.load.image("panel", A + "panel.png");
    this.load.image("panel_alt", A + "panel_alt.png");
    this.load.image("button", A + "button.png");
    this.load.image("button_pressed", A + "button_pressed.png");
    this.load.image("cursor", A + "cursor.png");
    this.load.image("dpad", A + "dpad.png");
    this.load.image("btn_a", A + "btn_a.png");
    this.load.image("btn_b", A + "btn_b.png");
    this.load.image("btn_menu", A + "btn_menu.png");
    this.load.font("PressStart", A + "fonts/press-start-2p.woff2", "woff2");

    const bar = this.add.rectangle(256, 160, 200, 8, 0x241e30).setOrigin(0.5);
    const fill = this.add.rectangle(256, 160, 0, 8, 0x5fd8d0).setOrigin(0.5, 0.5);
    const label = this.add.text(256, 120, "CARVING RUNES...", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#f0c860",
    }).setOrigin(0.5);
    this.load.on("progress", (p: number) => fill.setSize(200 * p, 8));
    this.load.on("complete", () => {
      bar.destroy();
      fill.destroy();
      label.destroy();
    });
  }

  create() {
    this.scene.start("title");
  }
}
