// BattleScene.ts - turn-based battle presentation & flow.
import Phaser from "phaser";
import { ASSET_LAYOUT } from "../assets/layout";
import { Audio } from "../core/audio";
import { Input } from "../core/input";
import { Session } from "../core/session";
import { Battle, name as cName } from "../battle/engine";
import { BattleConfig, BattleEvent, CreatureInstance } from "../battle/types";
import {
  gainExp,
  checkEvolution,
  resolveLearnChoice,
  maxHpOf,
  expProgress,
  ProgressEvent,
} from "../battle/progression";
import { getMove } from "../data/moves";
import { getSpecies } from "../data/species";
import { getItem } from "../data/items";
import { ELEMENT_LABEL } from "../data/elements";
import { Input as _I } from "../core/input";
import { TXT, textStyle, COLORS } from "../ui/theme";
import { TouchControls } from "../ui/TouchControls";
import { creatureFrameIndex } from "./WorldScene";

void _I;

type Mode = "events" | "menu" | "moves" | "bag" | "switch" | "message" | "done";

export class BattleScene extends Phaser.Scene {
  private engine!: Battle;
  private config!: BattleConfig;
  private queue: BattleEvent[] = [];
  private mode: Mode = "events";
  private menuIndex = 0;
  private moveIndex = 0;
  private bagIndex = 0;
  private switchIndex = 0;

  private enemySprite!: Phaser.GameObjects.Image;
  private playerSprite!: Phaser.GameObjects.Image;
  private enemyPanel!: Phaser.GameObjects.Container;
  private playerPanel!: Phaser.GameObjects.Container;
  private enemyHpBar!: Phaser.GameObjects.Rectangle;
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private playerExpBar!: Phaser.GameObjects.Rectangle;
  private playerHpText!: Phaser.GameObjects.Text;
  private enemyStatus!: Phaser.GameObjects.Text;
  private playerStatus!: Phaser.GameObjects.Text;
  private enemyNameText!: Phaser.GameObjects.Text;
  private playerNameText!: Phaser.GameObjects.Text;
  private enemyLvText!: Phaser.GameObjects.Text;
  private playerLvText!: Phaser.GameObjects.Text;

  private msgPanel!: Phaser.GameObjects.NineSlice;
  private msgText!: Phaser.GameObjects.Text;
  private cmdPanel!: Phaser.GameObjects.Container;
  private cmdTexts: Phaser.GameObjects.Text[] = [];
  private movePanel!: Phaser.GameObjects.Container;
  private cursor!: Phaser.GameObjects.Image;
  private touch!: TouchControls;

  private msgQueue: string[] = [];
  private msgCurrent = "";
  private msgRevealed = 0;
  private msgTimerAcc = 0;
  private afterMsg: (() => void) | null = null;

  constructor() {
    super("battle");
  }

  create(data: { config: BattleConfig }) {
    this.config = data.config;
    this.engine = new Battle(this.config);
    this.add.image(256, 144, `battle_${this.config.background}`).setDepth(0);

    // creatures
    this.enemySprite = this.add.image(368, 132, "creatures").setOrigin(0.5, 0.9).setScale(1.8).setDepth(5);
    this.playerSprite = this.add.image(136, 236, "creatures").setOrigin(0.5, 0.9).setScale(1.8).setFlipX(true).setDepth(5);
    this.setCreatureSprite(this.enemySprite, this.engine.active("enemy"));
    this.setCreatureSprite(this.playerSprite, this.engine.active("player"));
    this.idleBob(this.enemySprite);
    this.idleBob(this.playerSprite);

    this.buildInfoPanels();
    this.buildBottomUi();

    this.touch = new TouchControls(this);
    this.touch.create();
    const st = Session.get().settings;
    this.touch.setVisible(st.touch === "on" || (st.touch === "auto" && navigator.maxTouchPoints > 0));

    Audio.startMusic("battle");

    // opening
    const opening: BattleEvent[] = [];
    if (this.config.kind === "trainer") {
      opening.push({ t: "message", text: `${this.config.trainer!.name} (${this.config.trainer!.trainerClass}) sent out ${name(this.engine.active("enemy"))}!` });
    } else {
      opening.push({ t: "message", text: `Wild ${name(this.engine.active("enemy"))} appeared!` });
    }
    this.playCry(this.engine.active("enemy"));
    this.queue = opening;
    this.mode = "events";
    this.time.delayedCall(60, () => this.pump());
  }

  private idleBob(sp: Phaser.GameObjects.Image) {
    this.tweens.add({ targets: sp, y: sp.y - 3, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }

  private setCreatureSprite(sp: Phaser.GameObjects.Image, c: CreatureInstance) {
    sp.setFrame(creatureFrameIndex(getSpecies(c.speciesId).sprite));
  }

  /* -------------------------------------------------- UI build */

  private buildInfoPanels() {
    // enemy info (top-left)
    this.enemyPanel = this.add.container(0, 0).setDepth(20);
    const ep = this.add.nineslice(16, 16, "panel", undefined, 190, 46, 10, 10, 10, 10).setOrigin(0, 0);
    this.enemyNameText = this.add.text(28, 24, "", textStyle(TXT, { fontSize: "8px" }));
    this.enemyLvText = this.add.text(160, 24, "", textStyle(TXT, { fontSize: "8px", color: "#f0c860" }));
    this.enemyStatus = this.add.text(28, 44, "", textStyle(TXT, { fontSize: "7px", color: "#e05038" }));
    const ehpLabel = this.add.text(120, 40, "HP", textStyle(TXT, { fontSize: "7px", color: "#f0a848" }));
    const ebg = this.add.rectangle(140, 44, 56, 6, 0x1a1626).setOrigin(0, 0.5);
    this.enemyHpBar = this.add.rectangle(140, 44, 56, 6, COLORS.hpHigh).setOrigin(0, 0.5);
    this.enemyPanel.add([ep, this.enemyNameText, this.enemyLvText, this.enemyStatus, ehpLabel, ebg, this.enemyHpBar]);

    // player info (right-middle)
    this.playerPanel = this.add.container(0, 0).setDepth(20);
    const pp = this.add.nineslice(296, 140, "panel", undefined, 200, 62, 10, 10, 10, 10).setOrigin(0, 0);
    this.playerNameText = this.add.text(308, 148, "", textStyle(TXT, { fontSize: "8px" }));
    this.playerLvText = this.add.text(452, 148, "", textStyle(TXT, { fontSize: "8px", color: "#f0c860" }));
    this.playerStatus = this.add.text(308, 168, "", textStyle(TXT, { fontSize: "7px", color: "#e05038" }));
    const phpLabel = this.add.text(396, 164, "HP", textStyle(TXT, { fontSize: "7px", color: "#f0a848" }));
    const pbg = this.add.rectangle(416, 168, 68, 6, 0x1a1626).setOrigin(0, 0.5);
    this.playerHpBar = this.add.rectangle(416, 168, 68, 6, COLORS.hpHigh).setOrigin(0, 0.5);
    this.playerHpText = this.add.text(484, 176, "", textStyle(TXT, { fontSize: "7px", color: "#c3cad4" })).setOrigin(1, 0);
    const xbg = this.add.rectangle(340, 192, 144, 4, 0x1a1626).setOrigin(0, 0.5);
    this.playerExpBar = this.add.rectangle(340, 192, 0, 4, COLORS.exp).setOrigin(0, 0.5);
    this.playerPanel.add([pp, this.playerNameText, this.playerLvText, this.playerStatus, phpLabel, pbg, this.playerHpBar, this.playerHpText, xbg, this.playerExpBar]);

    this.refreshInfo();
  }

  private buildBottomUi() {
    this.msgPanel = this.add.nineslice(8, 216, "panel", undefined, 300, 64, 10, 10, 10, 10).setOrigin(0, 0).setDepth(20);
    this.msgText = this.add.text(22, 228, "", textStyle(TXT, { fontSize: "8px", lineSpacing: 5, wordWrap: { width: 272 } })).setDepth(21);

    this.cmdPanel = this.add.container(0, 0).setDepth(20);
    const cp = this.add.nineslice(316, 216, "panel_alt", undefined, 188, 64, 10, 10, 10, 10).setOrigin(0, 0);
    this.cmdPanel.add(cp);
    const labels = ["FIGHT", "BAG", "CREW", "RUN"];
    labels.forEach((l, i) => {
      const t = this.add.text(340 + (i % 2) * 88, 230 + ((i / 2) | 0) * 22, l, textStyle(TXT, { fontSize: "9px" })).setDepth(21);
      this.clickRow(
        t,
        () => {
          if (this.mode !== "menu") return;
          if (this.menuIndex !== i) Audio.sfx("cursor");
          this.menuIndex = i;
          this.placeCmdCursor();
        },
        () => {
          if (this.mode !== "menu") return;
          this.menuIndex = i;
          this.confirmMenu();
        },
      );
      this.cmdTexts.push(t);
      this.cmdPanel.add(t);
    });
    this.cursor = this.add.image(0, 0, "cursor").setDepth(22);

    this.movePanel = this.add.container(0, 0).setDepth(20).setVisible(false);
    const mp = this.add.nineslice(316, 150, "panel_alt", undefined, 188, 130, 10, 10, 10, 10).setOrigin(0, 0);
    this.movePanel.add(mp);
  }

  /** hover selects, click activates; suppresses the global click-as-confirm edge */
  private clickRow(t: Phaser.GameObjects.Text, over: () => void, down: () => void) {
    t.setInteractive({ useHandCursor: true });
    t.on("pointerover", over);
    t.on("pointerdown", () => {
      Input.suppress("a");
      Input.suppress("b");
      down();
    });
  }

  private confirmMenu() {
    Audio.sfx("confirm");
    if (this.menuIndex === 0) this.openMoves();
    else if (this.menuIndex === 1) this.openBag();
    else if (this.menuIndex === 2) this.openSwitch(false);
    else this.doAction({ kind: "run" });
  }

  private chooseSwitch() {
    const party = this.engine.party("player");
    const c = party[this.switchIndex];
    if (!c || c.hp <= 0 || this.switchIndex === this.engine.activeIndex("player")) {
      Audio.sfx("error");
      return;
    }
    Audio.sfx("confirm");
    if (this.switchForced) {
      this.queue = this.engine.sendOut(this.switchIndex);
      this.mode = "events";
      this.movePanel.setVisible(false);
      this.cursor.setVisible(false);
      this.pump();
    } else {
      this.doAction({ kind: "switch", index: this.switchIndex });
    }
  }

  private refreshInfo() {
    const e = this.engine.active("enemy");
    const p = this.engine.active("player");
    this.enemyNameText.setText(name(e).toUpperCase().slice(0, 12));
    this.enemyLvText.setText(`L${e.level}`);
    this.playerNameText.setText(name(p).toUpperCase().slice(0, 12));
    this.playerLvText.setText(`L${p.level}`);
    this.setHpBar(this.enemyHpBar, e, 56);
    this.setHpBar(this.playerHpBar, p, 68);
    this.playerHpText.setText(`${p.hp}/${maxHpOf(p)}`);
    this.enemyStatus.setText(e.status ? statusLabel(e.status) : "");
    this.playerStatus.setText(p.status ? statusLabel(p.status) : "");
    const prog = expProgress(p);
    const t = Math.max(0, Math.min(1, (prog.current - prog.prev) / Math.max(1, prog.next - prog.prev)));
    this.playerExpBar.setSize(144 * t, 4);
  }

  private setHpBar(bar: Phaser.GameObjects.Rectangle, c: CreatureInstance, width: number) {
    const ratio = Math.max(0, c.hp / maxHpOf(c));
    bar.setSize(width * ratio, 6);
    bar.setFillStyle(ratio > 0.5 ? COLORS.hpHigh : ratio > 0.2 ? COLORS.hpMid : COLORS.hpLow);
  }

  /* -------------------------------------------------- message box */

  private say(text: string, after: () => void) {
    this.mode = "message";
    this.msgCurrent = text;
    this.msgRevealed = 0;
    this.msgTimerAcc = 0;
    this.afterMsg = after;
    this.msgText.setText("");
  }

  private updateMessage(dt: number) {
    if (this.mode !== "message") return;
    if (this.msgRevealed < this.msgCurrent.length) {
      this.msgTimerAcc += dt * 40;
      const target = Math.min(this.msgCurrent.length, Math.floor(this.msgTimerAcc));
      if (target !== this.msgRevealed) {
        this.msgRevealed = target;
        this.msgText.setText(this.msgCurrent.slice(0, this.msgRevealed));
      }
      if (Input.justPressed("a")) {
        this.msgRevealed = this.msgCurrent.length;
        this.msgText.setText(this.msgCurrent);
      }
    } else {
      this.time.delayedCall(0, () => {});
      if (Input.justPressed("a") || this.autoAdvance()) {
        const cb = this.afterMsg;
        this.afterMsg = null;
        cb?.();
      }
    }
  }

  private autoTimer = 0;
  private autoAdvance(): boolean {
    this.autoTimer += 1;
    if (this.autoTimer > 45) {
      this.autoTimer = 0;
      return true;
    }
    return false;
  }

  /* -------------------------------------------------- event pump */

  private pump() {
    if (this.queue.length === 0) {
      this.afterQueue();
      return;
    }
    const ev = this.queue.shift()!;
    this.handleEvent(ev, () => this.pump());
  }

  private afterQueue() {
    if (this.engine.awaitingSwitch === "player") {
      this.openSwitch(true);
      return;
    }
    if (this.engine.over) {
      this.finishBattle();
      return;
    }
    this.openMenu();
  }

  private handleEvent(ev: BattleEvent, next: () => void) {
    switch (ev.t) {
      case "message":
        this.say(ev.text, next);
        return;
      case "move": {
        const isPlayer = ev.side === "player";
        const sp = isPlayer ? this.playerSprite : this.enemySprite;
        const dx = isPlayer ? 26 : -26;
        const dy = isPlayer ? -14 : 14;
        Audio.sfx(ev.category === "physical" ? "hitPhys" : "hitSpec");
        this.tweens.add({
          targets: sp,
          x: sp.x + dx,
          y: sp.y + dy,
          duration: 110,
          yoyo: true,
          ease: "Quad.out",
          onComplete: () => next(),
        });
        return;
      }
      case "miss": {
        const sp = ev.side === "player" ? this.playerSprite : this.enemySprite;
        this.tweens.add({ targets: sp, alpha: 0.4, duration: 90, yoyo: true, onComplete: () => next() });
        return;
      }
      case "damage": {
        const sp = ev.side === "player" ? this.playerSprite : this.enemySprite;
        if (ev.effectiveness >= 2) {
          Audio.sfx("superEff");
          this.cameras.main.shake(160, 0.008);
        }
        const c = ev.side === "player" ? this.engine.active("player") : this.engine.active("enemy");
        const bar = ev.side === "player" ? this.playerHpBar : this.enemyHpBar;
        const width = ev.side === "player" ? 68 : 56;
        this.tweens.add({ targets: sp, tint: 0xffffff, duration: 60, yoyo: true, repeat: 1 });
        this.tweens.add({
          targets: bar,
          width: Math.max(0, width * (ev.hpLeft / maxHpOf(c))),
          duration: 320,
          onComplete: () => {
            this.refreshInfo();
            next();
          },
        });
        if (ev.hpLeft > 0 && ev.effectiveness > 0) void 0;
        return;
      }
      case "heal":
      case "itemUse": {
        const sp = ev.side === "player" ? this.playerSprite : this.enemySprite;
        Audio.sfx("heal");
        this.tweens.add({ targets: sp, tint: 0x88ff88, duration: 120, yoyo: true, repeat: 1 });
        this.time.delayedCall(300, () => {
          this.refreshInfo();
          next();
        });
        return;
      }
      case "status":
      case "statusCure":
      case "statStage":
        this.refreshInfo();
        this.time.delayedCall(120, next);
        return;
      case "statusTick": {
        const sp = ev.side === "player" ? this.playerSprite : this.enemySprite;
        this.tweens.add({ targets: sp, tint: ev.status === "burn" ? 0xff6622 : 0x99dd44, duration: 100, yoyo: true, repeat: 1 });
        this.time.delayedCall(260, () => {
          this.refreshInfo();
          next();
        });
        return;
      }
      case "faint": {
        const sp = ev.side === "player" ? this.playerSprite : this.enemySprite;
        Audio.sfx("faint");
        this.tweens.add({
          targets: sp,
          y: sp.y + 30,
          alpha: 0,
          duration: 380,
          ease: "Quad.in",
          onComplete: next,
        });
        return;
      }
      case "sendOut": {
        const isPlayer = ev.side === "player";
        const c = this.engine.active(ev.side);
        const sp = isPlayer ? this.playerSprite : this.enemySprite;
        this.setCreatureSprite(sp, c);
        sp.setAlpha(1);
        sp.setScale(0.2);
        this.playCry(c);
        this.tweens.add({
          targets: sp,
          scale: 1.8,
          duration: 300,
          ease: "Back.out",
          onComplete: () => {
            this.refreshInfo();
            next();
          },
        });
        return;
      }
      case "withdraw": {
        const sp = ev.side === "player" ? this.playerSprite : this.enemySprite;
        this.tweens.add({ targets: sp, scale: 0.1, alpha: 0, duration: 200, onComplete: next });
        return;
      }
      case "needSwitch":
        next();
        return;
      case "forceSwitch":
        next();
        return;
      case "catchThrow": {
        Audio.sfx("throw");
        const ball = this.add.image(150, 200, "icons").setFrame(iconFrame("rune_ball_glow")).setDepth(30).setScale(2);
        this.tweens.add({
          targets: ball,
          x: 368,
          y: 90,
          duration: 380,
          ease: "Quad.out",
          onComplete: () => {
            this.tweens.add({ targets: this.enemySprite, scale: 0.05, alpha: 0, duration: 260 });
            this.tweens.add({
              targets: ball,
              y: 128,
              duration: 260,
              ease: "Quad.in",
              onComplete: () => {
                this.tweens.add({ targets: ball, y: 122, duration: 120, yoyo: true, ease: "Bounce.out" });
                this.time.delayedCall(320, next);
              },
            });
          },
        });
        this.catchBall = ball;
        return;
      }
      case "catchShake": {
        Audio.sfx("shake");
        if (this.catchBall) {
          this.tweens.add({ targets: this.catchBall, angle: 18, duration: 110, yoyo: true });
        }
        this.time.delayedCall(420, next);
        return;
      }
      case "catchFail": {
        Audio.sfx("burst");
        if (this.catchBall) {
          this.catchBall.destroy();
          this.catchBall = null;
        }
        this.enemySprite.setAlpha(1);
        this.tweens.add({ targets: this.enemySprite, scale: 1.8, duration: 260, ease: "Back.out", onComplete: next });
        return;
      }
      case "catchSuccess": {
        void Audio.jingle("catchJingle");
        this.time.delayedCall(600, next);
        return;
      }
      case "runSuccess":
      case "runFail":
        next();
        return;
      case "end":
        next();
        return;
    }
  }

  private catchBall: Phaser.GameObjects.Image | null = null;

  /* -------------------------------------------------- player UI states */

  private openMenu() {
    this.mode = "menu";
    this.cmdPanel.setVisible(true);
    this.movePanel.setVisible(false);
    this.msgText.setText("What will " + name(this.engine.active("player")) + " do?");
    this.placeCmdCursor();
  }

  private placeCmdCursor() {
    this.cursor.setVisible(true);
    this.cursor.setPosition(328 + (this.menuIndex % 2) * 88, 234 + ((this.menuIndex / 2) | 0) * 22);
  }

  private openMoves() {
    this.mode = "moves";
    this.cmdPanel.setVisible(false);
    this.movePanel.setVisible(true);
    this.moveIndex = 0;
    this.renderMoves();
  }

  private renderMoves() {
    // rebuild texts
    this.movePanel.list.slice(1).forEach((o) => o.destroy());
    const c = this.engine.active("player");
    c.moves.forEach((m, i) => {
      const mv = getMove(m.id);
      const y = 162 + i * 24;
      const t = this.add.text(332, y, mv.name.toUpperCase().slice(0, 12), textStyle(TXT, { fontSize: "8px" })).setDepth(21);
      this.clickRow(
        t,
        () => {
          if (this.mode !== "moves") return;
          this.moveIndex = i;
          this.placeMoveCursor();
        },
        () => {
          if (this.mode !== "moves") return;
          this.moveIndex = i;
          const slot = this.engine.active("player").moves[i];
          if (slot.pp <= 0) {
            Audio.sfx("error");
            return;
          }
          Audio.sfx("confirm");
          this.doAction({ kind: "move", index: i });
        },
      );
      const pp = this.add.text(488, y, `${m.pp}/${mv.pp}`, textStyle(TXT, { fontSize: "7px", color: "#9a92a8" })).setOrigin(1, 0).setDepth(21);
      const icon = this.add.image(340, y + 16, "elements").setFrame(elementFrame(mv.element)).setScale(1).setDepth(21);
      const info = this.add.text(356, y + 12, `${ELEMENT_LABEL[mv.element]}  PWR ${mv.power || "--"}`, textStyle(TXT, { fontSize: "6px", color: "#9a92a8" })).setDepth(21);
      this.movePanel.add([t, pp, icon, info]);
    });
    const back = this.add.text(332, 162 + 4 * 24, "BACK", textStyle(TXT, { fontSize: "8px", color: "#a8f4ec" })).setDepth(21);
    this.clickRow(back, () => {}, () => {
      if (this.mode !== "moves") return;
      Audio.sfx("cancel");
      this.openMenu();
    });
    this.movePanel.add(back);
    this.placeMoveCursor();
  }

  private placeMoveCursor() {
    this.cursor.setVisible(true);
    this.cursor.setPosition(322, 166 + this.moveIndex * 24);
  }

  private bagItems(): string[] {
    const st = Session.get();
    return Object.keys(st.bag.items).filter((id) => {
      const it = getItem(id);
      if (it.kind === "ball") return this.config.kind === "wild";
      return it.kind === "heal" || it.kind === "cure";
    });
  }

  private openBag() {
    this.mode = "bag";
    this.bagIndex = 0;
    this.cmdPanel.setVisible(false);
    this.renderBag();
  }

  private renderBag() {
    this.movePanel.setVisible(true);
    this.movePanel.list.slice(1).forEach((o) => o.destroy());
    const ids = this.bagItems();
    ids.forEach((id, i) => {
      const it = getItem(id);
      const y = 162 + i * 20;
      const icon = this.add.image(336, y + 6, "icons").setFrame(iconFrame(it.icon)).setDepth(21);
      const t = this.add.text(352, y, `${it.name} x${Session.countItem(id)}`, textStyle(TXT, { fontSize: "8px" })).setDepth(21);
      this.clickRow(
        t,
        () => {
          if (this.mode !== "bag") return;
          this.bagIndex = i;
          this.cursor.setPosition(324, 166 + i * 20);
        },
        () => {
          if (this.mode !== "bag") return;
          this.bagIndex = i;
          Audio.sfx("confirm");
          Session.addItem(id, -1);
          this.doAction({ kind: "item", itemId: id });
        },
      );
      this.movePanel.add([icon, t]);
    });
    const back = this.add.text(352, 162 + ids.length * 20, "BACK", textStyle(TXT, { fontSize: "8px", color: "#a8f4ec" })).setDepth(21);
    this.clickRow(back, () => {}, () => {
      if (this.mode !== "bag") return;
      Audio.sfx("cancel");
      this.openMenu();
    });
    this.movePanel.add(back);
    this.cursor.setVisible(true);
    this.cursor.setPosition(324, 166 + this.bagIndex * 20);
  }

  private openSwitch(forced: boolean) {
    this.mode = "switch";
    this.switchIndex = 0;
    this.cmdPanel.setVisible(false);
    this.movePanel.setVisible(true);
    this.renderSwitch(forced);
  }

  private renderSwitch(forced: boolean) {
    this.movePanel.list.slice(1).forEach((o) => o.destroy());
    const party = this.engine.party("player");
    party.forEach((c, i) => {
      const y = 160 + i * 18;
      const dead = c.hp <= 0;
      const active = i === this.engine.activeIndex("player");
      const t = this.add.text(332, y, `${name(c).slice(0, 10).toUpperCase()} L${c.level} ${c.hp}/${maxHpOf(c)}${active ? " *" : ""}`, textStyle(TXT, { fontSize: "7px", color: dead ? "#5a5268" : "#f4ecd8" })).setDepth(21);
      this.clickRow(
        t,
        () => {
          if (this.mode !== "switch") return;
          this.switchIndex = i;
          this.cursor.setPosition(322, 164 + i * 18);
        },
        () => {
          if (this.mode !== "switch") return;
          this.switchIndex = i;
          this.chooseSwitch();
        },
      );
      this.movePanel.add(t);
    });
    if (!forced) {
      const back = this.add.text(332, 160 + party.length * 18, "BACK", textStyle(TXT, { fontSize: "8px", color: "#a8f4ec" })).setDepth(21);
      this.clickRow(back, () => {}, () => {
        if (this.mode !== "switch" || this.switchForced) return;
        Audio.sfx("cancel");
        this.openMenu();
      });
      this.movePanel.add(back);
    }
    this.cursor.setVisible(true);
    this.cursor.setPosition(322, 164 + this.switchIndex * 18);
    this.switchForced = forced;
    if (forced) this.msgText.setText("Choose your next creature!");
  }

  private switchForced = false;

  /* -------------------------------------------------- update */

  update(_t: number, dt: number) {
    Input.beginFrame();
    Input.pollVirtual();
    if (this.uiOverride) {
      this.uiOverride();
      return;
    }
    this.updateMessage(dt / 1000);
    if (this.mode === "message" || this.mode === "events" || this.mode === "done") return;

    if (this.mode === "menu") {
      if (Input.justPressed("right") || Input.justPressed("down")) {
        this.menuIndex = (this.menuIndex + 1) % 4;
        Audio.sfx("cursor");
        this.placeCmdCursor();
      }
      if (Input.justPressed("left") || Input.justPressed("up")) {
        this.menuIndex = (this.menuIndex + 3) % 4;
        Audio.sfx("cursor");
        this.placeCmdCursor();
      }
      if (Input.justPressed("a")) this.confirmMenu();
      return;
    }

    if (this.mode === "moves") {
      const n = this.engine.active("player").moves.length + 1;
      if (Input.justPressed("down")) {
        this.moveIndex = (this.moveIndex + 1) % n;
        Audio.sfx("cursor");
        this.placeMoveCursor();
      }
      if (Input.justPressed("up")) {
        this.moveIndex = (this.moveIndex + n - 1) % n;
        Audio.sfx("cursor");
        this.placeMoveCursor();
      }
      if (Input.justPressed("b")) {
        Audio.sfx("cancel");
        this.openMenu();
      }
      if (Input.justPressed("a")) {
        if (this.moveIndex === n - 1) {
          Audio.sfx("cancel");
          this.openMenu();
          return;
        }
        const slot = this.engine.active("player").moves[this.moveIndex];
        if (slot.pp <= 0) {
          Audio.sfx("error");
          return;
        }
        Audio.sfx("confirm");
        this.doAction({ kind: "move", index: this.moveIndex });
      }
      return;
    }

    if (this.mode === "bag") {
      const ids = this.bagItems();
      const n = ids.length + 1;
      if (Input.justPressed("down")) {
        this.bagIndex = (this.bagIndex + 1) % n;
        Audio.sfx("cursor");
        this.cursor.setPosition(324, 166 + this.bagIndex * 20);
      }
      if (Input.justPressed("up")) {
        this.bagIndex = (this.bagIndex + n - 1) % n;
        Audio.sfx("cursor");
        this.cursor.setPosition(324, 166 + this.bagIndex * 20);
      }
      if (Input.justPressed("b")) {
        Audio.sfx("cancel");
        this.openMenu();
      }
      if (Input.justPressed("a")) {
        if (this.bagIndex === ids.length) {
          Audio.sfx("cancel");
          this.openMenu();
          return;
        }
        const id = ids[this.bagIndex];
        Audio.sfx("confirm");
        Session.addItem(id, -1);
        this.doAction({ kind: "item", itemId: id });
      }
      return;
    }

    if (this.mode === "switch") {
      const party = this.engine.party("player");
      const n = party.length + (this.switchForced ? 0 : 1);
      if (Input.justPressed("down")) {
        this.switchIndex = (this.switchIndex + 1) % n;
        Audio.sfx("cursor");
        this.cursor.setPosition(322, 164 + this.switchIndex * 18);
      }
      if (Input.justPressed("up")) {
        this.switchIndex = (this.switchIndex + n - 1) % n;
        Audio.sfx("cursor");
        this.cursor.setPosition(322, 164 + this.switchIndex * 18);
      }
      if (!this.switchForced && Input.justPressed("b")) {
        Audio.sfx("cancel");
        this.openMenu();
        return;
      }
      if (Input.justPressed("a")) {
        if (!this.switchForced && this.switchIndex === party.length) {
          Audio.sfx("cancel");
          this.openMenu();
          return;
        }
        this.chooseSwitch();
      }
      return;
    }
  }

  private doAction(action: Parameters<Battle["act"]>[0]) {
    this.cmdPanel.setVisible(false);
    this.movePanel.setVisible(false);
    this.cursor.setVisible(false);
    this.mode = "events";
    this.queue = this.engine.act(action);
    this.pump();
  }

  /* -------------------------------------------------- end of battle */

  private finishBattle() {
    this.mode = "done";
    this.cursor.setVisible(false);
    this.cmdPanel.setVisible(false);
    this.movePanel.setVisible(false);
    const result = this.engine.over!;
    if (result === "win") {
      const enemy = this.engine.party("enemy")[0];
      const playerActive = this.engine.active("player");
      const sp = getSpecies(enemy.speciesId);
      const amount = Math.max(1, Math.floor((sp.expYield * enemy.level) / 7) * (this.config.kind === "trainer" ? 1.5 : 1));
      const reward = this.config.trainer?.rewardSilver ?? 0;
      Session.get().stats.wins += 1;
      Session.get().stats.battles += 1;
      void Audio.jingle("victory");
      const progress = gainExp(playerActive, Math.floor(amount));
      this.playProgress(progress, () => {
        const evo = checkEvolution(playerActive);
        if (evo.length) {
          this.playEvolution(evo, () => this.emitEnd(result, reward));
        } else {
          this.emitEnd(result, reward);
        }
      });
      return;
    }
    if (result === "catch") {
      Session.get().stats.captures += 1;
      Session.get().stats.battles += 1;
      const caught = this.engine.party("enemy")[0];
      const st = Session.get();
      const toParty = st.party.length < 6;
      if (toParty) st.party.push(caught);
      else st.box.push(caught);
      this.say(`${name(caught)} was added to your ${toParty ? "party" : "storage box"}!`, () => this.emitEnd(result));
      return;
    }
    Session.get().stats.battles += 1;
    this.emitEnd(result);
  }

  private emitEnd(result: "win" | "lose" | "run" | "catch", reward = 0) {
    const caught = result === "catch" ? this.engine.party("enemy")[0].speciesId : undefined;
    this.game.events.emit("battle-end", result, { caught, reward });
  }

  private playProgress(events: ProgressEvent[], done: () => void) {
    let i = 0;
    const next = () => {
      if (i >= events.length) {
        done();
        return;
      }
      const ev = events[i++];
      if (ev.t === "exp") {
        this.say(`${name(this.engine.active("player"))} gained ${ev.amount} experience!`, () => {
          this.refreshInfo();
          next();
        });
      } else if (ev.t === "levelup") {
        Audio.sfx("heal");
        this.playCry(this.engine.active("player"));
        this.say(`${name(this.engine.active("player"))} grew to level ${ev.level}!`, () => {
          this.refreshInfo();
          next();
        });
      } else if (ev.t === "learn") {
        if (ev.auto) {
          this.say(`${name(this.engine.active("player"))} learned ${getMove(ev.moveId).name}!`, next);
        } else {
          this.openForgetChoice(ev.moveId, next);
        }
      } else next();
    };
    next();
  }

  private openForgetChoice(moveId: string, next: () => void) {
    const c = this.engine.active("player");
    this.mode = "switch";
    this.switchForced = false;
    this.switchIndex = 0;
    this.movePanel.setVisible(true);
    this.cmdPanel.setVisible(false);
    this.movePanel.list.slice(1).forEach((o) => o.destroy());
    this.msgText.setText(`Forget a move to learn ${getMove(moveId).name}?`);
    const rows: Phaser.GameObjects.Text[] = [];
    const pick = (i: number) => {
      const forget = i === c.moves.length ? -1 : i;
      const forgotten = forget >= 0 ? getMove(c.moves[forget].id).name : null;
      Audio.sfx("confirm");
      this.movePanel.setVisible(false);
      this.cursor.setVisible(false);
      this.uiOverride = null;
      resolveLearnChoice(c, moveId, forget);
      if (forgotten) {
        this.say(`${name(c)} forgot ${forgotten} and learned ${getMove(moveId).name}!`, next);
      } else {
        this.say(`${name(c)} did not learn ${getMove(moveId).name}.`, next);
      }
    };
    c.moves.forEach((m, i) => {
      const t = this.add.text(332, 160 + i * 18, getMove(m.id).name.toUpperCase(), textStyle(TXT, { fontSize: "8px" })).setDepth(21);
      this.clickRow(
        t,
        () => {
          if (!this.uiOverride) return;
          this.switchIndex = i;
          this.cursor.setPosition(322, 164 + i * 18);
        },
        () => {
          if (!this.uiOverride) return;
          pick(i);
        },
      );
      this.movePanel.add(t);
      rows.push(t);
    });
    const cancel = this.add.text(332, 160 + c.moves.length * 18, "NEVER MIND", textStyle(TXT, { fontSize: "8px", color: "#a8f4ec" })).setDepth(21);
    this.clickRow(
      cancel,
      () => {
        if (!this.uiOverride) return;
        this.switchIndex = c.moves.length;
        this.cursor.setPosition(322, 164 + c.moves.length * 18);
      },
      () => {
        if (!this.uiOverride) return;
        pick(c.moves.length);
      },
    );
    this.movePanel.add(cancel);
    rows.push(cancel);
    this.cursor.setVisible(true);
    this.cursor.setPosition(322, 164 + this.switchIndex * 18);
    const n = c.moves.length + 1;
    this.uiOverride = () => {
      if (Input.justPressed("down")) {
        this.switchIndex = (this.switchIndex + 1) % n;
        Audio.sfx("cursor");
        this.cursor.setPosition(322, 164 + this.switchIndex * 18);
      }
      if (Input.justPressed("up")) {
        this.switchIndex = (this.switchIndex + n - 1) % n;
        Audio.sfx("cursor");
        this.cursor.setPosition(322, 164 + this.switchIndex * 18);
      }
      if (Input.justPressed("a")) pick(this.switchIndex);
      if (Input.justPressed("b")) {
        Audio.sfx("cancel");
        this.movePanel.setVisible(false);
        this.cursor.setVisible(false);
        this.uiOverride = null;
        this.say(`${name(c)} did not learn ${getMove(moveId).name}.`, next);
      }
    };
  }

  private uiOverride: (() => void) | null = null;

  private playEvolution(events: ProgressEvent[], done: () => void) {
    void Audio.jingle("evolve");
    Audio.sfx("evolve");
    const c = this.engine.active("player");
    this.say(`${name(c)} is evolving!`, () => {
      this.tweens.add({ targets: this.playerSprite, tint: 0xffffff, duration: 300, yoyo: true, repeat: 3 });
      this.time.delayedCall(1400, () => {
        this.setCreatureSprite(this.playerSprite, c);
        this.playCry(c);
        this.say(`${name(c)} evolved into ${getSpecies(c.speciesId).name}!`, done);
      });
    });
    void events;
  }

  private playCry(c: CreatureInstance) {
    const sp = getSpecies(c.speciesId);
    Audio.cry(sp.cry.base, sp.cry.sweep, sp.cry.wave, sp.cry.dur, sp.cry.vibrato);
  }
}

function name(c: CreatureInstance): string {
  return cName(c);
}

function statusLabel(s: string): string {
  return { burn: "BRN", poison: "PSN", paralysis: "PAR", sleep: "SLP", freeze: "FRZ" }[s] ?? "";
}

function iconFrame(icon: string): number {
  return (ASSET_LAYOUT.ui.icons as Record<string, number>)[icon] ?? 0;
}

function elementFrame(el: string): number {
  return (ASSET_LAYOUT.ui.elements as Record<string, number>)[el] ?? 0;
}
