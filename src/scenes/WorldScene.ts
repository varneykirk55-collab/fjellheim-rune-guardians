// WorldScene.ts - overworld exploration: movement, collision, warps,
// NPCs, dialogue, story events, encounters, services.
import Phaser from "phaser";
import { ASSET_LAYOUT } from "../assets/layout";
import { Audio } from "../core/audio";
import { Input } from "../core/input";
import { Session } from "../core/session";
import { Facing } from "../core/save";
import { getMap, MapDef } from "../data/maps";
import { buildSolidGrid, tileMeta } from "../data/maps/collision";
import { buildVisuals } from "../data/maps/visual";
import { STORY_EVENTS, StoryEvent, StoryStep } from "../data/story";
import { NPC_LINES, Cond } from "../data/dialogues";
import { getSpecies, STARTERS, StarterId } from "../data/species";
import { getItem, MOVE_PP } from "../data/lookup";
import { makeCreature, maxHpOf } from "../battle/progression";
import { BattleConfig } from "../battle/types";
import { buildTrainerParty, getTrainer } from "../data/trainers";
import { DialogueBox } from "../ui/DialogueBox";
import { TouchControls } from "../ui/TouchControls";
import { TXT, textStyle } from "../ui/theme";

// Art is authored on a 16px grid and shown at an integer 2x, so the screen
// frames ~16x9 tiles like a DS (Platinum shows 16x12). TS is the on-screen size
// of a tile; depths stay in art pixels so the HUD (depth 900+) stays on top.
const ART = 16;
const SCALE = 2;
const TS = ART * SCALE;
const HALF = TS / 2;
const depthAt = (tileY: number) => tileY * ART;
/** whole-number sprite scale (fractional scales make uneven pixels) */
const spriteScale = (s = 1) => Math.max(1, Math.round(SCALE * s));
const CHAR_FRAMES = 12;

interface NpcRuntime {
  id: string;
  char: string;
  x: number;
  y: number;
  dir: Facing;
  sprite: Phaser.GameObjects.Image;
}

const TILE_INDEX = ASSET_LAYOUT.tiles as Record<string, number>;
type Layer = "ground" | "edge" | "corner" | "deco";

export function charFrameIndex(charKey: string, dir: Facing, step: number): number {
  const row = (ASSET_LAYOUT.chars as Record<string, number>)[charKey];
  const base = dir === "down" ? 0 : dir === "up" ? 3 : dir === "right" ? 6 : 9;
  return row * CHAR_FRAMES + base + step;
}

export function creatureFrameIndex(speciesSprite: string): number {
  const f = (ASSET_LAYOUT.creatures as Record<string, { x: number; y: number }>)[speciesSprite];
  const cols = ASSET_LAYOUT.creatureSheet.cols;
  return (f.y / 64) * cols + f.x / 64;
}

export class WorldScene extends Phaser.Scene {
  private map!: MapDef;
  private layers: Record<Layer, Phaser.Tilemaps.TilemapLayer> = {} as never;
  private solid!: Uint8Array;
  private npcs: NpcRuntime[] = [];
  private player!: Phaser.GameObjects.Image;
  private pDir: Facing = "down";
  private pX = 0;
  private pY = 0;
  private moving = false;
  private busy = false;
  private dialogue!: DialogueBox;
  private touch!: TouchControls;
  /** animated tiles, keyed "layer|tileKey" */
  private animTiles = new Map<string, { layer: Layer; key: string; at: { x: number; y: number }[] }>();
  private animFrame = 0;
  private storyCreatures: Phaser.GameObjects.Image[] = [];
  private uiTick: (() => void) | null = null;
  private battleNext: ((result: BattleResult) => void) | null = null;
  private pendingTrainerLoss = false;

  constructor() {
    super("world");
  }

  create(data: { map?: string; x?: number; y?: number; dir?: Facing; afterBlackout?: (r: BattleResult) => void }) {
    // Phaser reuses this scene instance for every warp (scene.start("world")),
    // so per-map runtime state must be reset here, not in field initializers.
    this.npcs = [];
    this.animTiles = new Map();
    this.animFrame = 0;
    this.storyCreatures = [];
    this.moving = false;
    this.pendingTrainerLoss = false;

    const state = Session.get();
    const mapId = data?.map ?? state.pos.map;
    this.map = getMap(mapId);
    if (data?.map) {
      state.pos.map = mapId;
      if (data.x !== undefined) state.pos.x = data.x;
      if (data.y !== undefined) state.pos.y = data.y;
      if (data.dir) state.pos.dir = data.dir;
    }
    this.pX = state.pos.x;
    this.pY = state.pos.y;
    this.pDir = state.pos.dir;
    this.busy = false;
    this.uiTick = null;
    this.battleNext = null;

    this.buildMap();
    this.buildObjects();
    this.buildPlayer();

    this.setCameraBounds();
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(240, 10, 8, 16);

    this.dialogue = new DialogueBox(this);
    this.dialogue.setSpeed(state.settings.textSpeed);
    this.touch = new TouchControls(this);
    this.touch.create();
    this.refreshTouch();

    Audio.startMusic(this.map.music);

    this.time.addEvent({
      delay: 240,
      loop: true,
      callback: () => {
        this.animFrame += 1;
        for (const { layer, key, at } of this.animTiles.values()) {
          const frames = tileMeta(key)?.frames ?? 1;
          const f = this.animFrame % frames;
          const idx = TILE_INDEX[f === 0 ? key : `${key}_f${f}`];
          if (idx === undefined) continue;
          for (const p of at) this.layers[layer].putTileAt(idx, p.x, p.y);
        }
      },
    });

    this.game.events.on("battle-end", this.onBattleEnd, this);
    this.events.once("shutdown", () => {
      this.game.events.off("battle-end", this.onBattleEnd, this);
    });

    const afterBlackout = data?.afterBlackout;
    if (afterBlackout) {
      // story lose-branch handed over from the previous run of this scene
      this.busy = true;
      this.time.delayedCall(320, () => this.runLoseContinuation(afterBlackout));
    } else {
      this.time.delayedCall(80, () => this.tryEnterEvents());
    }
  }

  /** Small interiors are centred in the view instead of pinned to the top-left. */
  private setCameraBounds() {
    const cam = this.cameras.main;
    const mw = this.map.grid[0].length * TS;
    const mh = this.map.grid.length * TS;
    const bx = mw < cam.width ? (mw - cam.width) / 2 : 0;
    const by = mh < cam.height ? (mh - cam.height) / 2 : 0;
    cam.setBounds(bx, by, Math.max(mw, cam.width), Math.max(mh, cam.height));
  }

  /* -------------------------------------------------- build */

  private tileKeyAt(x: number, y: number): string | null {
    const row = this.map.grid[y];
    if (!row) return null;
    const ch = row[x];
    if (ch === undefined) return null;
    return this.map.legend[ch] ?? null;
  }

  private buildMap() {
    const w = this.map.grid[0].length;
    const h = this.map.grid.length;
    const has = (k: string) => TILE_INDEX[k] !== undefined;
    const visuals = buildVisuals(this.map, has);
    const tm = this.make.tilemap({ width: w, height: h, tileWidth: ART, tileHeight: ART });
    const set = tm.addTilesetImage("tiles", "tiles", ART, ART, 0, 0)!;
    // ground -> soft edge overlays -> inner corners -> decorations
    this.layers = {
      ground: tm.createBlankLayer("ground", set)!.setScale(SCALE),
      edge: tm.createBlankLayer("edge", set)!.setScale(SCALE),
      corner: tm.createBlankLayer("corner", set)!.setScale(SCALE),
      deco: tm.createBlankLayer("deco", set)!.setScale(SCALE),
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = visuals[y][x];
        this.placeTile("ground", v.ground, x, y);
        if (v.edge) this.placeTile("edge", v.edge, x, y);
        if (v.corner) this.placeTile("corner", v.corner, x, y);
        if (v.deco) this.placeTile("deco", v.deco, x, y);
      }
    }
    this.solid = buildSolidGrid(this.map);
  }

  private placeTile(layer: Layer, key: string, x: number, y: number) {
    const idx = TILE_INDEX[key];
    if (idx === undefined) return;
    this.layers[layer].putTileAt(idx, x, y);
    if ((tileMeta(key)?.frames ?? 1) > 1) {
      const id = `${layer}|${key}`;
      const entry = this.animTiles.get(id) ?? { layer, key, at: [] };
      entry.at.push({ x, y });
      this.animTiles.set(id, entry);
    }
  }

  private setSolid(x: number, y: number, v: number) {
    const w = this.map.grid[0].length;
    if (x >= 0 && y >= 0 && x < w && y < this.map.grid.length) this.solid[y * w + x] = v;
  }

  isSolid(x: number, y: number): boolean {
    const w = this.map.grid[0].length;
    if (x < 0 || y < 0 || x >= w || y >= this.map.grid.length) return true;
    return this.solid[y * w + x] === 1;
  }

  private buildObjects() {
    for (const b of this.map.buildings) {
      const meta = ASSET_LAYOUT.objects[b.asset as keyof typeof ASSET_LAYOUT.objects];
      const img = this.add.image(b.x * TS, b.y * TS, b.asset).setOrigin(0, 0).setScale(SCALE);
      img.setDepth(depthAt(b.y + Math.round(meta.h / ART)));
    }
    for (const p of this.map.props) {
      const meta = ASSET_LAYOUT.objects[p.asset as keyof typeof ASSET_LAYOUT.objects] as { w: number; h: number; frames?: number };
      const img = this.add.image(p.x * TS, p.y * TS, p.asset).setOrigin(0, 0).setScale(spriteScale(p.scale));
      img.setDepth(depthAt(p.y + Math.round(meta.h / ART)));
      if (p.anim && (meta.frames ?? 1) > 1) {
        this.time.addEvent({
          delay: 260,
          loop: true,
          callback: () => {
            const f = ((this.time.now / 260) | 0) % (meta.frames ?? 1);
            img.setCrop(0, f * meta.h, meta.w, meta.h);
          },
        });
      }
    }
    // hand-placed scenery, anchored at its bottom-left tile
    for (const o of this.map.objects ?? []) {
      this.add
        .image(o.x * TS, (o.y + 1) * TS, o.asset)
        .setOrigin(0, 1)
        .setScale(SCALE)
        .setDepth(depthAt(o.y + 1));
    }
    for (const n of this.map.npcs) {
      if (n.showIf && !Session.flag(n.showIf)) continue;
      if (n.hideIf && Session.flag(n.hideIf)) continue;
      const sprite = this.add
        .image(n.x * TS + HALF, n.y * TS + HALF, "chars")
        .setFrame(charFrameIndex(n.char, n.dir, 0))
        .setScale(spriteScale(n.scale))
        .setDepth(depthAt(n.y + 1));
      sprite.setInteractive({ useHandCursor: true });
      sprite.on("pointerdown", () => {
        Input.suppress("a");
        Input.suppress("b");
        if (this.busy || this.dialogue.active || this.uiTick || this.moving) return;
        const dx = n.x - this.pX;
        const dy = n.y - this.pY;
        if (Math.abs(dx) + Math.abs(dy) === 1) {
          this.pDir = dx === 1 ? "right" : dx === -1 ? "left" : dy === 1 ? "down" : "up";
          this.setPlayerFrame(0);
          this.interact();
        }
      });
      this.npcs.push({ id: n.id, char: n.char, x: n.x, y: n.y, dir: n.dir, sprite });
      this.setSolid(n.x, n.y, 1);
    }
  }

  private buildPlayer() {
    this.player = this.add
      .image(this.pX * TS + HALF, this.pY * TS + HALF, "chars")
      .setFrame(charFrameIndex(Session.get().playerChar, this.pDir, 0))
      .setScale(SCALE)
      .setDepth(depthAt(this.pY + 1));
  }

  private setPlayerFrame(step: number) {
    this.player.setFrame(charFrameIndex(Session.get().playerChar, this.pDir, step));
  }

  refreshTouch() {
    const st = Session.get().settings;
    const touchDevice = navigator.maxTouchPoints > 0;
    this.touch.setVisible(st.touch === "on" || (st.touch === "auto" && touchDevice));
  }

  /* -------------------------------------------------- update loop */

  update(_t: number, dt: number) {
    Input.beginFrame();
    Input.pollVirtual();
    // If dialogue/story owned this frame's input, the confirm that closed it
    // must not also reach interact() - that re-opened the same conversation forever.
    const engaged = this.busy || this.dialogue.active;
    const dialogueWasOpen = this.dialogue.active;
    this.dialogue.update(dt / 1000);
    if (this.uiTick) {
      // a menu opened by the press that closed a dialogue (the starter choice)
      // starts next frame, else that same press instantly picks the first entry
      if (!dialogueWasOpen) this.uiTick();
      return;
    }
    if (engaged || this.busy || this.dialogue.active) return;

    if (Input.justPressed("menu")) {
      Audio.sfx("confirm");
      this.syncPos();
      this.scene.sleep("world");
      this.scene.launch("pause");
      return;
    }

    if (this.moving) return;

    const dir = Input.dir();
    if (dir) {
      const nd: Facing = dir.y < 0 ? "up" : dir.y > 0 ? "down" : dir.x < 0 ? "left" : "right";
      this.pDir = nd;
      const nx = this.pX + dir.x;
      const ny = this.pY + dir.y;
      if (this.isSolid(nx, ny) || this.npcAt(nx, ny)) {
        this.setPlayerFrame(0);
        return;
      }
      this.moving = true;
      const tween = this.tweens.add({
        targets: this.player,
        x: nx * TS + HALF,
        y: ny * TS + HALF,
        duration: 150,
        ease: "Linear",
        onUpdate: (tw) => {
          this.setPlayerFrame(tw.progress < 0.5 ? 1 : 2);
        },
        onComplete: () => {
          this.moving = false;
          this.pX = nx;
          this.pY = ny;
          this.player.setDepth(depthAt(ny + 1));
          this.setPlayerFrame(0);
          this.onStep();
        },
      });
      void tween;
    } else {
      this.setPlayerFrame(0);
      if (Input.justPressed("a")) this.interact();
    }
  }

  private npcAt(x: number, y: number): NpcRuntime | null {
    return this.npcs.find((n) => n.x === x && n.y === y) ?? null;
  }

  syncPos() {
    const st = Session.get();
    st.pos = { map: this.map.id, x: this.pX, y: this.pY, dir: this.pDir };
  }

  getPos() {
    return { map: this.map.id, x: this.pX, y: this.pY, dir: this.pDir };
  }

  /* -------------------------------------------------- steps, warps, encounters */

  private onStep() {
    this.syncPos();
    Session.get().stats.steps += 1;
    const warp = this.findWarp(this.pX, this.pY);
    if (warp) {
      Audio.sfx("door");
      this.busy = true;
      this.cameras.main.fadeOut(220, 10, 8, 16);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("world", { map: warp.to.map, x: warp.to.x, y: warp.to.y, dir: warp.to.dir });
      });
      return;
    }
    for (const ev of STORY_EVENTS) {
      if (ev.map !== this.map.id || ev.trigger.type !== "step") continue;
      if (!this.condOk(ev.when)) continue;
      const t = ev.trigger;
      if (this.pX >= t.x && this.pX < t.x + t.w && this.pY >= t.y && this.pY < t.y + t.h) {
        this.runEvent(ev);
        return;
      }
    }
    const key = this.tileKeyAt(this.pX, this.pY);
    if (key) {
      const meta = (ASSET_LAYOUT.tileMeta as Record<string, { encounter: boolean }>)[key];
      if (meta?.encounter && this.map.encounters && Session.get().party.some((c) => c.hp > 0)) {
        if (Math.random() < this.map.encounters.rate) this.startWildBattle();
      }
    }
  }

  private findWarp(x: number, y: number) {
    for (const w of this.map.warps) if (w.x === x && w.y === y) return w;
    for (const b of this.map.buildings) if (b.door && b.door.x === x && b.door.y === y) return { x, y, to: b.door.to };
    return null;
  }

  private startWildBattle() {
    const enc = this.map.encounters!;
    const total = enc.table.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    let pick = enc.table[0];
    for (const e of enc.table) {
      roll -= e.weight;
      if (roll <= 0) {
        pick = e;
        break;
      }
    }
    const level = pick.min + Math.floor(Math.random() * (pick.max - pick.min + 1));
    Audio.sfx("encounter");
    this.cameras.main.flash(300, 20, 16, 26);
    const bg = this.map.id === "route1" ? (Math.random() < 0.5 ? "forest" : "meadow") : this.map.id === "village" ? "shore" : "meadow";
    const config: BattleConfig = {
      kind: "wild",
      playerParty: Session.get().party,
      enemyParty: [makeCreature(pick.species, level)],
      background: bg,
    };
    this.busy = true;
    this.battleNext = null;
    this.pendingTrainerLoss = false;
    this.time.delayedCall(320, () => {
      this.scene.sleep("world");
      this.scene.launch("battle", { config });
    });
  }

  /* -------------------------------------------------- interaction */

  private interact() {
    const dx = this.pDir === "left" ? -1 : this.pDir === "right" ? 1 : 0;
    const dy = this.pDir === "up" ? -1 : this.pDir === "down" ? 1 : 0;
    const tx = this.pX + dx;
    const ty = this.pY + dy;
    // healer & trader stand behind counters: talk across the counter tile
    const npc = this.npcAt(tx, ty) ?? (this.tileKeyAt(tx, ty) === "counter" ? this.npcAt(tx + dx, ty + dy) : null);
    if (npc) {
      const nd: Facing = this.pDir === "up" ? "down" : this.pDir === "down" ? "up" : this.pDir === "left" ? "right" : "left";
      this.setNpcDir(npc, nd);
      for (const ev of STORY_EVENTS) {
        if (ev.map !== this.map.id || ev.trigger.type !== "talk" || ev.trigger.npc !== npc.id) continue;
        if (!this.condOk(ev.when)) continue;
        this.runEvent(ev);
        return;
      }
      const lines = NPC_LINES[npc.id];
      if (lines) {
        const entry = lines.find((l) => !l.cond || this.condOk(l.cond)) ?? lines[lines.length - 1];
        Audio.sfx("confirm");
        this.busy = true;
        this.dialogue.show(entry.text, () => {
          this.busy = false;
        });
      }
      return;
    }
    const sign = this.map.signs.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      Audio.sfx("confirm");
      this.busy = true;
      this.dialogue.show(sign.text, () => {
        this.busy = false;
      });
    }
  }

  private setNpcDir(npc: NpcRuntime, dir: Facing) {
    npc.dir = dir;
    npc.sprite.setFrame(charFrameIndex(npc.char, dir, 0));
  }

  /* -------------------------------------------------- conditions */

  condOk(cond?: Cond): boolean {
    if (!cond) return true;
    if (cond.custom === "needMercy") {
      const st = Session.get();
      return (
        !st.flags.bergling_done &&
        !st.flags.mercy_given &&
        (st.bag.items["rune_ball"] ?? 0) === 0 &&
        st.bag.silver < 200
      );
    }
    if (cond.not) return !Session.flag(cond.not);
    if (cond.flag) {
      const v = Session.flag(cond.flag);
      if (cond.is !== undefined) return v === cond.is;
      return !!v;
    }
    return true;
  }

  /* -------------------------------------------------- story runner */

  private tryEnterEvents() {
    for (const ev of STORY_EVENTS) {
      if (ev.map !== this.map.id || ev.trigger.type !== "enter") continue;
      if (!this.condOk(ev.when)) continue;
      this.runEvent(ev);
      return;
    }
  }

  runEvent(ev: StoryEvent) {
    this.busy = true;
    this.runSteps(ev.steps, (result) => {
      const follow = result ? ev.onResult?.[result] : undefined;
      if (follow) {
        this.runSteps(follow, () => {
          this.busy = false;
        });
      } else {
        this.busy = false;
      }
    });
  }

  private runSteps(steps: StoryStep[], done: (result?: BattleResult) => void) {
    let i = 0;
    const next = (result?: BattleResult) => {
      if (result) {
        done(result);
        return;
      }
      if (i >= steps.length) {
        done();
        return;
      }
      const step = steps[i++];
      this.execStep(step, next);
    };
    next();
  }

  private execStep(step: StoryStep, next: (result?: BattleResult) => void) {
    const st = Session.get();
    if ("say" in step) {
      if (step.speaker) this.dialogue.showWithSpeaker(step.say, step.speaker, () => next());
      else this.dialogue.show(step.say, () => next());
    } else if ("setFlag" in step) {
      Session.setFlag(step.setFlag, step.value ?? true);
      next();
    } else if ("give" in step) {
      const msgs: string[] = [];
      if (step.give.item) {
        Session.addItem(step.give.item, step.give.qty ?? 1);
        msgs.push(`Received ${step.give.qty ?? 1} x ${getItem(step.give.item).name}!`);
      }
      if (step.give.silver) {
        st.bag.silver += step.give.silver;
        msgs.push(`Received ${step.give.silver} silver!`);
      }
      Audio.sfx("heal");
      this.dialogue.show(msgs, () => next());
    } else if ("starterChoice" in step) {
      this.openStarterChoice(() => next());
    } else if ("battle" in step) {
      this.startStoryBattle(step.battle, next);
    } else if ("heal" in step) {
      this.healParty();
      this.dialogue.show(["Your creatures are fully restored!"], () => next());
    } else if ("shop" in step) {
      this.openShop(() => next());
    } else if ("showCreature" in step) {
      const img = this.add
        .image(step.showCreature.x * TS + HALF, step.showCreature.y * TS + HALF, "creatures")
        .setFrame(creatureFrameIndex(step.showCreature.species))
        .setOrigin(0.5, 0.5)
        .setScale(spriteScale(0.5))
        .setDepth(depthAt(step.showCreature.y + 1));
      this.tweens.add({ targets: img, y: img.y - SCALE * 2, duration: 500, yoyo: true, repeat: -1 });
      this.storyCreatures.push(img);
      this.setSolid(step.showCreature.x, step.showCreature.y, 1);
      next();
    } else if ("hideCreature" in step) {
      this.storyCreatures.forEach((c) => c.destroy());
      this.storyCreatures = [];
      for (const ev of STORY_EVENTS) {
        for (const s2 of [...ev.steps, ...Object.values(ev.onResult ?? {}).flat()]) {
          if ("showCreature" in s2) this.setSolid(s2.showCreature.x, s2.showCreature.y, 0);
        }
      }
      next();
    } else if ("cry" in step) {
      this.playCry(step.cry);
      next();
    } else if ("movePlayer" in step) {
      this.pX = step.movePlayer.x;
      this.pY = step.movePlayer.y;
      if (step.movePlayer.dir) this.pDir = step.movePlayer.dir;
      this.player.setPosition(this.pX * TS + HALF, this.pY * TS + HALF);
      this.player.setDepth(depthAt(this.pY + 1));
      this.setPlayerFrame(0);
      this.syncPos();
      next();
    } else {
      next();
    }
  }

  healParty() {
    for (const c of Session.get().party) {
      c.hp = maxHpOf(c);
      c.status = null;
      c.statusTurns = 0;
      for (const m of c.moves) m.pp = MOVE_PP[m.id] ?? 10;
    }
    void Audio.jingle("healJingle");
  }

  /* -------------------------------------------------- story battles */

  private startStoryBattle(
    b: { trainer?: string; wild?: { species: string; level: number }; noRun?: boolean },
    next: (result?: BattleResult) => void,
  ) {
    const st = Session.get();
    if (!st.party.some((c) => c.hp > 0)) {
      // The battle engine needs a usable creature; ending the event without a
      // result leaves its flags unset so it can trigger again later.
      this.dialogue.show(["You have no creature ready to fight!", "Seek out Seer Ingrid in Bjorvik."], () => next());
      return;
    }
    if (b.trainer) {
      const t = getTrainer(b.trainer);
      const config: BattleConfig = {
        kind: "trainer",
        playerParty: st.party,
        enemyParty: buildTrainerParty(t, st.flags.starter as StarterId),
        trainer: {
          id: t.id,
          name: t.name,
          trainerClass: t.trainerClass,
          charKey: t.charKey,
          rewardSilver: t.rewardSilver,
          introLines: t.introLines,
          defeatLines: t.defeatLines,
        },
        noCatch: true,
        background: this.map.indoors ? "indoor" : this.map.id === "route1" ? "forest" : "meadow",
      };
      this.battleNext = next;
      this.pendingTrainerLoss = true;
      this.dialogue.show(t.introLines, () => this.launchBattle(config));
      return;
    }
    const w = b.wild!;
    const config: BattleConfig = {
      kind: "wild",
      playerParty: st.party,
      enemyParty: [makeCreature(w.species, w.level)],
      noRun: b.noRun,
      background: this.map.id === "route1" ? "forest" : "meadow",
    };
    this.battleNext = next;
    this.pendingTrainerLoss = false;
    this.launchBattle(config);
  }

  private launchBattle(config: BattleConfig) {
    Audio.sfx("encounter");
    this.cameras.main.flash(300, 20, 16, 26);
    this.time.delayedCall(320, () => {
      this.scene.sleep("world");
      this.scene.launch("battle", { config });
    });
  }

  private onBattleEnd(result: BattleResult, extra: { caught?: string; reward?: number }) {
    // world was put to sleep (not paused) for the battle: wake restores both
    // update and rendering; resume() left it running but invisible.
    this.scene.wake("world");
    this.scene.stop("battle");
    if (result === "lose") {
      if (this.pendingTrainerLoss) {
        const st = Session.get();
        st.bag.silver = Math.floor(st.bag.silver / 2);
      }
      this.pendingTrainerLoss = false;
      this.healParty();
      this.busy = true;
      const next = this.battleNext;
      this.battleNext = null;
      this.cameras.main.fadeOut(300, 10, 8, 16);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        // The story's lose branch travels with the restart data: a delayedCall
        // queued here would be destroyed by the scene's own shutdown.
        this.scene.start("world", { map: "heal", x: 5, y: 6, dir: "down", afterBlackout: next ?? undefined });
      });
      return;
    }
    if (extra?.reward) Session.get().bag.silver += extra.reward;
    const next = this.battleNext;
    this.battleNext = null;
    if (next) next(result);
    else this.busy = false;
  }

  /** called on the fresh world scene after a blackout with pending story */
  runLoseContinuation(next: (r: BattleResult) => void) {
    this.busy = true;
    next("lose");
  }

  /* -------------------------------------------------- starter choice UI */

  private openStarterChoice(done: () => void) {
    Audio.sfx("confirm");
    const c = this.add.container(0, 0).setDepth(960);
    let idx = 0;
    // flavour text wraps inside the screen; the prompt lists only keys this menu handles
    const info = this.add
      .text(256, 190, "", textStyle(TXT, { fontSize: "8px", lineSpacing: 5, align: "center", wordWrap: { width: 480 } }))
      .setOrigin(0.5, 0);
    const prompt = this.add.text(256, 268, "LEFT/RIGHT: BROWSE   Z: CHOOSE", textStyle(TXT, { fontSize: "7px", color: "#a8f4ec" })).setOrigin(0.5);
    const cursor = this.add.image(0, 0, "cursor");
    const sprites = STARTERS.map((id, i) => {
      const img = this.add
        .image(140 + i * 116, 110, "creatures")
        .setFrame(creatureFrameIndex(id))
        .setScale(1.2)
        .setOrigin(0.5, 0.8);
      this.tweens.add({ targets: img, y: 106, duration: 600, yoyo: true, repeat: -1, delay: i * 150 });
      img.setInteractive({ useHandCursor: true });
      img.on("pointerover", () => {
        if (idx !== i) {
          idx = i;
          refresh();
        }
      });
      img.on("pointerdown", () => {
        Input.suppress("a");
        Input.suppress("b");
        idx = i;
        pick();
      });
      return img;
    });
    c.add([info, prompt, cursor, ...sprites]);
    c.setScrollFactor(0, 0, true); // screen-space overlay (also keeps click hit-tests aligned)

    const refresh = () => {
      const sp = getSpecies(STARTERS[idx]);
      info.setText(`${sp.name}\n${sp.types.join(" / ").toUpperCase()} ELEMENT\n\n${sp.flavor}`);
      cursor.setPosition(140 + idx * 116 - 44, 110);
      Audio.sfx("cursor");
    };
    refresh();

    const pick = () => {
      Audio.sfx("confirm");
      const picked = STARTERS[idx];
      Session.get().party.push(makeCreature(picked, 5));
      Session.setFlag("starter", picked);
      c.destroy();
      this.uiTick = null;
      Audio.sfx("evolve");
      this.playCry(picked);
      this.dialogue.show([`${getSpecies(picked).name} joins your saga!`, "Its runes glow softly, bound to you now."], done);
    };

    this.uiTick = () => {
      if (Input.justPressed("left")) {
        idx = (idx + 2) % 3;
        refresh();
      }
      if (Input.justPressed("right")) {
        idx = (idx + 1) % 3;
        refresh();
      }
      if (Input.justPressed("a")) pick();
    };
  }

  playCry(speciesId: string) {
    const sp = getSpecies(speciesId);
    const cry = sp.cry;
    const ctxTry = () => {
      // simple synth cry via Audio manager tone path
      Audio.cry(cry.base, cry.sweep, cry.wave, cry.dur, cry.vibrato);
    };
    ctxTry();
  }

  /* -------------------------------------------------- shop UI */

  private openShop(done: () => void) {
    const c = this.add.container(0, 0).setDepth(960);
    const panel = this.add.nineslice(96, 36, "panel", undefined, 320, 208, 10, 10, 10, 10).setOrigin(0, 0);
    const title = this.add.text(112, 48, "RUNE GOODS  Z: SELECT  X: BUY/SELL TAB", textStyle(TXT, { fontSize: "8px", color: "#f0c860" }));
    const silver = this.add.text(112, 226, "", textStyle(TXT, { fontSize: "8px", color: "#c3cad4" }));
    const cursor = this.add.image(0, 0, "cursor");
    c.add([panel, title, silver, cursor]);
    const buyItems = ["rune_ball", "tonic", "antidote"];
    let idx = 0;
    let mode: "buy" | "sell" = "buy";
    let rows: Phaser.GameObjects.Text[] = [];

    const sellables = () => Object.keys(Session.get().bag.items);

    const activate = () => {
      const ids = mode === "buy" ? buyItems : sellables();
      if (idx === ids.length) {
        Audio.sfx("cancel");
        c.destroy();
        this.uiTick = null;
        done();
        return;
      }
      const id = ids[idx];
      const it = getItem(id);
      const st = Session.get();
      if (mode === "buy") {
        if (st.bag.silver >= it.price) {
          st.bag.silver -= it.price;
          Session.addItem(id, 1);
          Audio.sfx("confirm");
        } else Audio.sfx("error");
      } else if ((st.bag.items[id] ?? 0) > 0) {
        Session.addItem(id, -1);
        st.bag.silver += it.sellPrice;
        Audio.sfx("confirm");
      } else Audio.sfx("error");
      refresh();
    };
    const refresh = () => {
      rows.forEach((r) => r.destroy());
      rows = [];
      const ids = mode === "buy" ? buyItems : sellables();
      ids.forEach((id, i) => {
        const it = getItem(id);
        const qty = Session.get().bag.items[id] ?? 0;
        const t = this.add.text(
          128,
          76 + i * 18,
          mode === "buy" ? `${it.name} ....... ${it.price}s` : `${it.name} x${qty} ....... ${it.sellPrice}s`,
          textStyle(TXT, { fontSize: "8px" }),
        );
        t.setInteractive({ useHandCursor: true });
        t.on("pointerover", () => {
          if (idx !== i) Audio.sfx("cursor");
          idx = i;
          cursor.setPosition(116, 80 + idx * 18);
        });
        t.on("pointerdown", () => {
          Input.suppress("a");
          Input.suppress("b");
          idx = i;
          activate();
        });
        c.add(t);
        rows.push(t);
      });
      const exit = this.add.text(128, 76 + ids.length * 18 + 6, mode === "buy" ? "-- LEAVE --" : "-- BACK TO BUY --", textStyle(TXT, { fontSize: "8px", color: "#a8f4ec" }));
      exit.setInteractive({ useHandCursor: true });
      exit.on("pointerdown", () => {
        Input.suppress("a");
        Input.suppress("b");
        idx = ids.length;
        activate();
      });
      c.add(exit);
      rows.push(exit);
      silver.setText(`YOUR SILVER: ${Session.get().bag.silver}`);
      cursor.setPosition(116, 80 + idx * 18);
      c.setScrollFactor(0, 0, true); // screen-space overlay, including rows added above
    };
    refresh();
    Audio.sfx("confirm");

    this.uiTick = () => {
      const ids = mode === "buy" ? buyItems : sellables();
      const n = ids.length + 1;
      if (Input.justPressed("down")) {
        idx = (idx + 1) % n;
        Audio.sfx("cursor");
        cursor.setPosition(116, 80 + idx * 18);
      }
      if (Input.justPressed("up")) {
        idx = (idx + n - 1) % n;
        Audio.sfx("cursor");
        cursor.setPosition(116, 80 + idx * 18);
      }
      if (Input.justPressed("b")) {
        mode = mode === "buy" ? "sell" : "buy";
        idx = 0;
        Audio.sfx("cancel");
        refresh();
        return;
      }
      if (Input.justPressed("a")) activate();
    };
  }
}

export type BattleResult = "win" | "lose" | "run" | "catch";
