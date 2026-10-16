// main.ts - Phaser boot configuration. Landscape pixel-art RPG.
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { WorldScene } from "./scenes/WorldScene";
import { BattleScene } from "./scenes/BattleScene";
import { PauseScene } from "./scenes/PauseScene";
import { Input } from "./core/input";
import { Session } from "./core/session";
import { SaveManager } from "./core/save";

Input.attach();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  width: 512,
  height: 288,
  backgroundColor: "#10141c",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 4,
  },
  scene: [BootScene, TitleScene, WorldScene, BattleScene, PauseScene],
});

// block mobile scroll/zoom gestures over the canvas
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
document.addEventListener("contextmenu", (e) => e.preventDefault());

// portrait reminder overlay (game is landscape-only by design)
const overlay = document.createElement("div");
overlay.innerHTML = "&#x21bb; Rotate your device - Fjellheim is played in landscape.";
overlay.style.cssText =
  "position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(16,20,28,0.9);color:#f0c860;font-family:monospace;font-size:14px;text-align:center;padding:24px;z-index:9999;pointer-events:none;";
document.body.appendChild(overlay);
function checkOrient() {
  const portrait = window.innerHeight > window.innerWidth * 1.1;
  overlay.style.display = portrait ? "flex" : "none";
}
window.addEventListener("resize", checkOrient);
window.addEventListener("orientationchange", checkOrient);
checkOrient();

// Browser-test hook: only exposed when the page is opened with ?e2e, so
// automated playthroughs (tests/e2e) can read state without affecting players.
if (new URLSearchParams(window.location.search).has("e2e")) {
  (window as unknown as Record<string, unknown>).__fjellheim = { game, Session, Input, SaveManager };
}

export default game;
