// TouchControls.ts - on-screen D-pad & buttons for mobile play.
import Phaser from "phaser";
import { Input, Action } from "../core/input";

export class TouchControls {
  private scene: Phaser.Scene;
  private objs: Phaser.GameObjects.Image[] = [];
  private zones: { obj: Phaser.GameObjects.Image; action: Action; region?: string }[] = [];
  enabled = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create() {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const dpad = this.scene.add.image(64, H - 60, "dpad").setAlpha(0.55).setDepth(950).setScrollFactor(0);
    const btnA = this.scene.add.image(W - 34, H - 40, "btn_a").setAlpha(0.6).setDepth(950).setScrollFactor(0);
    const btnB = this.scene.add.image(W - 70, H - 26, "btn_b").setAlpha(0.6).setDepth(950).setScrollFactor(0);
    const btnM = this.scene.add.image(W - 20, H - 84, "btn_menu").setAlpha(0.6).setDepth(950).setScrollFactor(0);
    this.objs = [dpad, btnA, btnB, btnM];
    this.zones = [
      { obj: dpad, action: "up", region: "up" },
      { obj: dpad, action: "down", region: "down" },
      { obj: dpad, action: "left", region: "left" },
      { obj: dpad, action: "right", region: "right" },
      { obj: btnA, action: "a" },
      { obj: btnB, action: "b" },
      { obj: btnM, action: "menu" },
    ];
    this.scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.pointer(p, true));
    this.scene.input.on("pointerup", (p: Phaser.Input.Pointer) => this.pointer(p, false));
    this.scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.pointer(p, true);
    });
    this.setVisible(false);
  }

  private pointer(p: Phaser.Input.Pointer, down: boolean) {
    if (!this.enabled) return;
    // reset directions each event then re-apply whatever is under pointer
    const hit = new Set<Action>();
    for (const z of this.zones) {
      const b = z.obj.getBounds();
      if (!b.contains(p.x, p.y)) continue;
      if (z.region) {
        // dpad quadrants
        const lx = p.x - z.obj.x;
        const ly = p.y - z.obj.y;
        const region = Math.abs(lx) > Math.abs(ly) ? (lx > 0 ? "right" : "left") : ly > 0 ? "down" : "up";
        if (region === z.region) hit.add(z.action);
      } else {
        hit.add(z.action);
      }
    }
    for (const z of this.zones) {
      if (!z.region) Input.setVirtual(z.action, down && hit.has(z.action));
    }
    for (const a of ["up", "down", "left", "right"] as Action[]) {
      Input.setVirtual(a, down && hit.has(a));
    }
    if (!down) {
      // release everything not under any remaining pointer
      const pointers = this.scene.input.manager.pointers.filter((pp) => pp.isDown);
      if (pointers.length === 0) {
        for (const z of this.zones) Input.setVirtual(z.action, false);
      }
    }
  }

  setVisible(v: boolean) {
    this.enabled = v;
    this.objs.forEach((o) => o.setVisible(v));
    if (!v) {
      for (const z of this.zones) Input.setVirtual(z.action, false);
    }
  }

  destroy() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }
}
