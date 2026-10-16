// DialogueBox.ts - pixel dialogue box with typewriter, speaker plaque,
// blip sounds and callback-based flow (used by the overworld story runner).
import Phaser from "phaser";
import { TXT, textStyle } from "./theme";
import { Audio } from "../core/audio";
import { Input } from "../core/input";
import { Session } from "../core/session";
import { paginate } from "./paginate";

const CPS: Record<string, number> = { slow: 16, normal: 26, fast: 44 };

export class DialogueBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.NineSlice;
  private textObj: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private speakerPlaque: Phaser.GameObjects.NineSlice;
  private speakerText: Phaser.GameObjects.Text;

  private pages: string[] = [];
  private full = "";
  private revealed = 0;
  private timer = 0;
  private cps = 26;
  private blipTimer = 0;
  private running = false;
  private cb: (() => void) | null = null;
  private arrowPulse: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(900).setVisible(false);
    this.bg = scene.add.nineslice(16, 196, "panel", undefined, 480, 80, 10, 10, 10, 10).setOrigin(0, 0);
    this.textObj = scene.add.text(32, 210, "", textStyle(TXT, { fontSize: "9px", lineSpacing: 6, wordWrap: { width: 448 } }));
    this.arrow = scene.add.text(478, 258, "\u25bc", textStyle(TXT, { fontSize: "8px", color: "#f0c860" })).setOrigin(1, 0);
    this.speakerPlaque = scene.add.nineslice(28, 186, "panel_alt", undefined, 96, 18, 6, 6, 6, 6).setOrigin(0, 0).setVisible(false);
    this.speakerText = scene.add.text(36, 190, "", textStyle(TXT, { fontSize: "8px", color: "#8ff0e8" }));
    this.container.add([this.bg, this.textObj, this.arrow, this.speakerPlaque, this.speakerText]);
    // HUD element: pin to the screen, otherwise it is drawn at world (16,196)
    // and scrolls out of view on any map larger than the screen
    this.container.setScrollFactor(0, 0, true);
    this.arrow.setVisible(false);
  }

  get active(): boolean {
    return this.running;
  }

  setSpeed(s: string) {
    this.cps = CPS[s] ?? 26;
  }

  show(text: string | string[], cb?: () => void) {
    this.begin(Array.isArray(text) ? text : [text], undefined, cb);
  }

  showWithSpeaker(text: string | string[], speaker: string, cb?: () => void) {
    this.begin(Array.isArray(text) ? text : [text], speaker, cb);
  }

  private begin(pages: string[], speaker: string | undefined, cb?: () => void) {
    this.pages = pages.length ? paginate(pages) : [""];
    this.cb = cb ?? null;
    this.running = true;
    this.container.setVisible(true);
    if (speaker) {
      this.speakerPlaque.setVisible(true);
      this.speakerText.setText(speaker.slice(0, 12));
      this.speakerPlaque.setSize(Math.max(48, speaker.length * 7 + 16), 18);
    } else {
      this.speakerPlaque.setVisible(false);
      this.speakerText.setText("");
    }
    this.cps = CPS[Session.get().settings.textSpeed] ?? 26;
    this.nextPage();
  }

  private nextPage() {
    const page = this.pages.shift();
    if (page === undefined) {
      this.close();
      return;
    }
    this.full = page;
    this.revealed = 0;
    this.timer = 0;
    this.textObj.setText("");
    this.stopArrowPulse();
  }

  private stopArrowPulse() {
    this.arrowPulse?.remove();
    this.arrowPulse = null;
    this.arrow.setVisible(false).setAlpha(1);
  }

  private close() {
    this.stopArrowPulse();
    this.running = false;
    this.container.setVisible(false);
    const cb = this.cb;
    this.cb = null;
    cb?.();
  }

  /** call from the owning scene's update with dt in seconds */
  update(dt: number) {
    if (!this.running) return;
    if (this.revealed < this.full.length) {
      this.timer += dt * this.cps;
      const target = Math.min(this.full.length, Math.floor(this.timer));
      if (target !== this.revealed) {
        this.revealed = target;
        this.textObj.setText(this.full.slice(0, this.revealed));
        this.blipTimer += 1;
        if (this.blipTimer % 2 === 0) Audio.sfx("blip");
      }
      if (Input.justPressed("a")) {
        this.revealed = this.full.length;
        this.textObj.setText(this.full);
        this.arrow.setVisible(true);
      }
    } else {
      if (!this.arrowPulse) {
        // start the "next page" pulse once per page; adding a tween every
        // frame here piled up thousands of tweens while text waited
        this.arrow.setVisible(true).setAlpha(1);
        this.arrowPulse = this.scene.tweens.add({ targets: this.arrow, alpha: 0.3, duration: 220, yoyo: true, repeat: -1 });
      }
      if (Input.justPressed("a")) {
        Audio.sfx("confirm");
        this.nextPage();
      }
    }
  }
}
