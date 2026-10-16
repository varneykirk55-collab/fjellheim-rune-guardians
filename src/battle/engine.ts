// engine.ts - the turn-based battle engine. Pure logic, no rendering.
// The BattleScene consumes BattleEvents and animates them.
import { getMove, Move, StatKey } from "../data/moves";
import { getSpecies } from "../data/species";
import { effectiveness } from "../data/typeChart";
import { getItem } from "../data/items";
import {
  BattleConfig,
  BattleEvent,
  CreatureInstance,
  PlayerAction,
  Side,
} from "./types";

const MAX_STAGE = 6;

export function stageMultiplier(stage: number): number {
  const s = Math.max(-MAX_STAGE, Math.min(MAX_STAGE, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

export function calcStat(base: number, level: number, isHp: boolean): number {
  if (isHp) return Math.floor((2 * base * level) / 100) + level + 10;
  return Math.floor((2 * base * level) / 100) + 5;
}

interface SideState {
  party: CreatureInstance[];
  activeIndex: number;
  stages: Record<StatKey, number>[];
}

export class Battle {
  readonly config: BattleConfig;
  private sides: Record<Side, SideState>;
  private rng: () => number;
  over: null | "win" | "lose" | "catch" | "run" = null;
  awaitingSwitch: Side | null = null;

  constructor(config: BattleConfig) {
    this.config = config;
    this.rng = config.rng ?? Math.random;
    this.sides = {
      player: {
        party: config.playerParty,
        activeIndex: config.playerParty.findIndex((c) => c.hp > 0),
        stages: config.playerParty.map(() => emptyStages()),
      },
      enemy: {
        party: config.enemyParty,
        activeIndex: 0,
        stages: config.enemyParty.map(() => emptyStages()),
      },
    };
    if (this.sides.player.activeIndex < 0) this.sides.player.activeIndex = 0;
  }

  active(side: Side): CreatureInstance {
    return this.sides[side].party[this.sides[side].activeIndex];
  }

  activeIndex(side: Side): number {
    return this.sides[side].activeIndex;
  }

  party(side: Side): CreatureInstance[] {
    return this.sides[side].party;
  }

  stagesOf(side: Side): Record<StatKey, number> {
    return this.sides[side].stages[this.sides[side].activeIndex];
  }

  /* ------------------------------------------------ turn entry points */

  /** Execute one player action; returns the ordered event stream. */
  act(action: PlayerAction): BattleEvent[] {
    if (this.over || this.awaitingSwitch) return [];
    const ev: BattleEvent[] = [];
    if (action.kind === "switch") {
      this.doSwitch("player", action.index, ev, false);
      this.enemyTurn(ev);
      this.endOfTurn(ev);
      return ev;
    }
    if (action.kind === "item") {
      this.useItem(action.itemId, ev);
      if (!this.over) {
        this.enemyTurn(ev);
        this.endOfTurn(ev);
      }
      return ev;
    }
    if (action.kind === "run") {
      this.tryRun(ev);
      if (!this.over) {
        this.enemyTurn(ev);
        this.endOfTurn(ev);
      }
      return ev;
    }
    // move
    const playerMove = this.active("player").moves[action.index];
    if (!playerMove) return ev;
    const order = this.turnOrder("move", playerMove.id);
    for (const side of order) {
      if (this.over) break;
      const mover = this.active(side);
      if (mover.hp <= 0) continue;
      const moveId = side === "player" ? playerMove.id : this.enemyChooseMove();
      if (!moveId) continue;
      this.executeMove(side, moveId, ev);
    }
    this.endOfTurn(ev);
    return ev;
  }

  /** Called by the scene after a needSwitch event. */
  sendOut(index: number): BattleEvent[] {
    const ev: BattleEvent[] = [];
    if (this.awaitingSwitch !== "player") return ev;
    this.doSwitch("player", index, ev, true);
    this.awaitingSwitch = null;
    if (this.sides.player.party.every((c) => c.hp <= 0)) this.finish("lose", ev);
    return ev;
  }

  private turnOrder(playerIntent: "move", playerMoveId: string): Side[] {
    const pm = getMove(playerMoveId);
    const em = getMove(this.enemyChooseMove(true) || "lunge");
    const ps = this.effSpeed("player");
    const es = this.effSpeed("enemy");
    const pp = pm.priority ?? 0;
    const ep = em.priority ?? 0;
    if (pp !== ep) return pp > ep ? ["player", "enemy"] : ["enemy", "player"];
    if (ps !== es) return ps > es ? ["player", "enemy"] : ["enemy", "player"];
    return this.rng() < 0.5 ? ["player", "enemy"] : ["enemy", "player"];
  }

  private effSpeed(side: Side): number {
    const c = this.active(side);
    const sp = getSpecies(c.speciesId);
    let v = calcStat(sp.base.swift, c.level, false) * stageMultiplier(this.stagesOf(side).swift);
    if (c.status === "paralysis") v *= 0.5;
    return Math.floor(v);
  }

  /* ------------------------------------------------ moves & damage */

  private executeMove(side: Side, moveId: string, ev: BattleEvent[]) {
    const foe: Side = side === "player" ? "enemy" : "player";
    const mover = this.active(side);
    const move = getMove(moveId);
    const slot = mover.moves.find((m) => m.id === moveId);
    if (slot && slot.pp > 0) slot.pp -= 1;

    // status blocks
    if (mover.status === "sleep") {
      mover.statusTurns -= 1;
      ev.push({ t: "message", text: `${name(mover)} is fast asleep.` });
      if (mover.statusTurns <= 0) {
        mover.status = null;
        ev.push({ t: "statusCure", side });
        ev.push({ t: "message", text: `${name(mover)} woke up!` });
      } else {
        return;
      }
    }
    if (mover.status === "freeze") {
      if (this.rng() < 0.2) {
        mover.status = null;
        ev.push({ t: "statusCure", side });
        ev.push({ t: "message", text: `${name(mover)} thawed out!` });
      } else {
        ev.push({ t: "message", text: `${name(mover)} is frozen solid!` });
        return;
      }
    }
    if (mover.status === "paralysis" && this.rng() < 0.25) {
      ev.push({ t: "message", text: `${name(mover)} is paralyzed! It can't move!` });
      return;
    }

    ev.push({ t: "move", side, moveId, category: move.category });

    if (move.category === "status") {
      const eff = move.effect!;
      if (eff.kind === "stat") {
        const target: Side = eff.target === "foe" ? foe : side;
        const st = this.stagesOf(target);
        const cur = st[eff.stat!];
        const next = Math.max(-MAX_STAGE, Math.min(MAX_STAGE, cur + eff.stages!));
        if (next === cur) {
          ev.push({ t: "message", text: `${name(this.active(target))}'s ${eff.stat} won't go ${eff.stages! > 0 ? "higher" : "lower"}!` });
        } else {
          st[eff.stat!] = next;
          ev.push({ t: "statStage", side: target, stat: eff.stat!, delta: eff.stages!, stage: next });
          ev.push({
            t: "message",
            text: `${name(this.active(target))}'s ${statLabel(eff.stat!)} ${eff.stages! > 0 ? "rose" : "fell"}!`,
          });
        }
      }
      return;
    }

    // accuracy
    if (this.rng() * 100 >= move.accuracy) {
      ev.push({ t: "miss", side });
      ev.push({ t: "message", text: `${name(mover)}'s attack missed!` });
      return;
    }

    const def = this.active(foe);
    const defSp = getSpecies(def.speciesId);
    const atkSp = getSpecies(mover.speciesId);
    const stages = this.stagesOf(side);
    const defStages = this.stagesOf(foe);

    const phys = move.category === "physical";
    let atk =
      calcStat(phys ? atkSp.base.might : atkSp.base.seidr, mover.level, false) *
      stageMultiplier(phys ? stages.might : stages.seidr);
    if (phys && mover.status === "burn") atk *= 0.5;
    let dfn =
      calcStat(phys ? defSp.base.guard : defSp.base.ward, def.level, false) *
      stageMultiplier(phys ? defStages.guard : defStages.ward);
    atk = Math.max(1, Math.floor(atk));
    dfn = Math.max(1, Math.floor(dfn));

    const eff = effectiveness(move.element, defSp.types);
    const stab = atkSp.types.includes(move.element) ? 1.5 : 1;
    const crit = this.rng() < 1 / 16 ? 1.5 : 1;
    const rand = 0.85 + this.rng() * 0.15;

    let dmg = 0;
    if (eff > 0) {
      const base = Math.floor(Math.floor((Math.floor((2 * mover.level) / 5 + 2) * move.power * atk) / dfn) / 50) + 2;
      dmg = Math.max(1, Math.floor(Math.floor(Math.floor(Math.floor(base * stab) * eff) * crit) * rand));
    }
    def.hp = Math.max(0, def.hp - dmg);
    ev.push({ t: "damage", side: foe, amount: dmg, hpLeft: def.hp, effectiveness: eff, crit: crit > 1 });
    if (eff === 0) ev.push({ t: "message", text: `It doesn't affect ${name(def)}...` });
    else if (eff >= 2) ev.push({ t: "message", text: "It's super effective!" });
    else if (eff <= 0.5) ev.push({ t: "message", text: "It's not very effective..." });
    if (crit > 1) ev.push({ t: "message", text: "A critical hit!" });

    // secondary status
    if (move.effect?.kind === "status" && move.effect.status && def.hp > 0 && eff > 0) {
      if (this.rng() * 100 < (move.effect.chance ?? 100)) this.applyStatus(foe, move.effect.status, ev);
    }

    if (def.hp <= 0) this.handleFaint(foe, ev);
  }

  private applyStatus(side: Side, status: NonNullable<CreatureInstance["status"]>, ev: BattleEvent[]) {
    const c = this.active(side);
    if (c.status) return;
    const sp = getSpecies(c.speciesId);
    if (status === "burn" && sp.types.includes("fire")) return;
    if (status === "freeze" && sp.types.includes("ice")) return;
    if (status === "poison" && sp.types.includes("poison")) return;
    c.status = status;
    c.statusTurns = status === "sleep" ? 1 + Math.floor(this.rng() * 3) : 0;
    ev.push({ t: "status", side, status });
    const msgs: Record<string, string> = {
      burn: `${name(c)} was burned!`,
      poison: `${name(c)} was poisoned!`,
      paralysis: `${name(c)} is paralyzed!`,
      sleep: `${name(c)} fell asleep!`,
      freeze: `${name(c)} was frozen solid!`,
    };
    ev.push({ t: "message", text: msgs[status] });
  }

  private handleFaint(side: Side, ev: BattleEvent[]) {
    const c = this.active(side);
    ev.push({ t: "faint", side });
    ev.push({ t: "message", text: `${name(c)} fainted!` });
    if (side === "enemy") {
      if (this.config.kind === "trainer") {
        const next = this.sides.enemy.party.findIndex((p) => p.hp > 0);
        if (next >= 0) {
          ev.push({ t: "forceSwitch", side: "enemy" });
          this.doSwitch("enemy", next, ev, true);
          return;
        }
      }
      this.finish("win", ev);
    } else {
      const next = this.sides.player.party.findIndex((p) => p.hp > 0);
      if (next < 0) {
        this.finish("lose", ev);
      } else {
        this.awaitingSwitch = "player";
        ev.push({ t: "needSwitch", side: "player" });
      }
    }
  }

  private doSwitch(side: Side, index: number, ev: BattleEvent[], silent: boolean) {
    const st = this.sides[side];
    if (index === st.activeIndex || !st.party[index] || st.party[index].hp <= 0) return;
    if (!silent) {
      ev.push({ t: "withdraw", side });
      ev.push({ t: "message", text: `${name(st.party[st.activeIndex])}, return!` });
    }
    st.activeIndex = index;
    st.stages[index] = emptyStages();
    ev.push({ t: "sendOut", side, index });
    ev.push({ t: "message", text: side === "player" ? `Go, ${name(st.party[index])}!` : `${this.config.trainer?.name ?? "The wild"} sent out ${name(st.party[index])}!` });
  }

  private enemyTurn(ev: BattleEvent[]) {
    if (this.over) return;
    const enemy = this.active("enemy");
    if (enemy.hp <= 0) return;
    const moveId = this.enemyChooseMove();
    if (moveId) this.executeMove("enemy", moveId, ev);
  }

  private endOfTurn(ev: BattleEvent[]) {
    if (this.over) return;
    const order: Side[] = this.effSpeed("player") >= this.effSpeed("enemy") ? ["player", "enemy"] : ["enemy", "player"];
    for (const side of order) {
      const c = this.active(side);
      if (c.hp <= 0 || this.over) continue;
      if (c.status === "burn" || c.status === "poison") {
        const sp = getSpecies(c.speciesId);
        const maxHp = calcStat(sp.base.hp, c.level, true);
        const chip = Math.max(1, Math.floor(maxHp / (c.status === "burn" ? 16 : 8)));
        c.hp = Math.max(0, c.hp - chip);
        ev.push({ t: "statusTick", side, status: c.status, hpLeft: c.hp });
        ev.push({ t: "message", text: c.status === "burn" ? `${name(c)} is hurt by its burn!` : `${name(c)} is hurt by poison!` });
        if (c.hp <= 0) this.handleFaint(side, ev);
      }
    }
  }

  /* ------------------------------------------------ items & capture */

  private useItem(itemId: string, ev: BattleEvent[]) {
    const item = getItem(itemId);
    if (item.kind === "ball") {
      this.throwBall(itemId, ev);
      return;
    }
    const c = this.active("player");
    if (item.kind === "heal") {
      const sp = getSpecies(c.speciesId);
      const maxHp = calcStat(sp.base.hp, c.level, true);
      const healed = Math.min(item.healAmount!, maxHp - c.hp);
      c.hp += healed;
      ev.push({ t: "itemUse", side: "player", itemId, hpLeft: c.hp });
      ev.push({ t: "message", text: `${name(c)} recovered ${healed} HP!` });
    } else if (item.kind === "cure") {
      if (c.status === item.cures) {
        c.status = null;
        ev.push({ t: "statusCure", side: "player" });
      }
      ev.push({ t: "itemUse", side: "player", itemId });
      ev.push({ t: "message", text: `${name(c)} was cured!` });
    }
  }

  /**
   * Rune Ball capture math (documented):
   *   a = floor(((3*MaxHP - 2*HP) * catchRate * ballBonus * statusBonus) / (3*MaxHP))
   *   statusBonus: sleep/freeze 2.0, poison/burn/paralysis 1.5, else 1.0
   *   Four shake checks, each succeeding with probability (a/255)^0.25,
   *   so the overall capture chance equals a/255. a >= 255 = guaranteed.
   */
  private throwBall(ballId: string, ev: BattleEvent[]) {
    if (this.config.kind !== "wild" || this.config.noCatch) {
      ev.push({ t: "message", text: "You can't capture another trainer's creature!" });
      return;
    }
    const item = getItem(ballId);
    const c = this.active("enemy");
    const sp = getSpecies(c.speciesId);
    const maxHp = calcStat(sp.base.hp, c.level, true);
    const statusBonus = c.status === "sleep" || c.status === "freeze" ? 2 : c.status ? 1.5 : 1;
    const a = Math.floor(((3 * maxHp - 2 * c.hp) * sp.catchRate * (item.ballBonus ?? 1) * statusBonus) / (3 * maxHp));
    ev.push({ t: "catchThrow", ballId });
    ev.push({ t: "message", text: `You threw a ${item.name}!` });
    const need = a >= 255 ? 4 : 0;
    let shakes = 0;
    if (a >= 255) shakes = 4;
    else {
      const p = Math.pow(Math.min(1, a / 255), 0.25);
      for (let i = 0; i < 4; i++) {
        if (this.rng() < p) shakes++;
        else break;
      }
    }
    for (let i = 1; i <= shakes; i++) ev.push({ t: "catchShake", n: i });
    if (shakes >= 4) {
      ev.push({ t: "catchSuccess", creature: c });
      ev.push({ t: "message", text: `${name(c)} was caught! The runes seal the bond.` });
      this.finish("catch", ev);
    } else {
      ev.push({ t: "catchFail" });
      ev.push({
        t: "message",
        text: shakes === 0 ? `Oh no! ${name(c)} broke free at once!` : `So close! ${name(c)} broke free!`,
      });
      this.enemyTurn(ev);
    }
    if (need) void need;
  }

  private tryRun(ev: BattleEvent[]) {
    if (this.config.noRun) {
      ev.push({ t: "message", text: "You can't leave now - the way is blocked!" });
      ev.push({ t: "runFail" });
      return;
    }
    if (this.config.kind === "trainer") {
      ev.push({ t: "message", text: "You can't run from a trainer battle!" });
      ev.push({ t: "runFail" });
      return;
    }
    const ps = this.effSpeed("player");
    const es = this.effSpeed("enemy");
    const chance = ps >= es ? 1 : Math.min(0.95, 0.5 + (ps - es) / (2 * Math.max(1, es)));
    if (this.rng() < chance) {
      ev.push({ t: "runSuccess" });
      ev.push({ t: "message", text: "You got away safely!" });
      this.finish("run", ev);
    } else {
      ev.push({ t: "runFail" });
      ev.push({ t: "message", text: "Can't escape!" });
    }
  }

  /* ------------------------------------------------ AI */

  enemyChooseMove(peek = false): string | null {
    const enemy = this.active("enemy");
    const usable = enemy.moves.filter((m) => m.pp > 0 || peek);
    if (!usable.length) return null;
    const player = this.active("player");
    const pSp = getSpecies(player.speciesId);
    const scored = usable.map((slot) => {
      const m = getMove(slot.id);
      let score = 1;
      if (m.category !== "status") {
        const eff = effectiveness(m.element, pSp.types);
        score = eff >= 2 ? 3.2 : eff === 1 ? 2 : eff > 0 ? 1 : 0.15;
        if (getSpecies(enemy.speciesId).types.includes(m.element)) score *= 1.2; // STAB preference
        score *= 0.8 + m.power / 100;
      } else {
        score = 1.1;
      }
      return { id: slot.id, score };
    });
    if (this.config.kind === "wild") {
      // wild creatures are less tactical
      const total = scored.reduce((s, x) => s + x.score, 0);
      let roll = this.rng() * total;
      for (const s of scored) {
        roll -= s.score;
        if (roll <= 0) return s.id;
      }
      return scored[0].id;
    }
    const best = Math.max(...scored.map((s) => s.score));
    const pool = scored.filter((s) => s.score >= best * (this.rng() < 0.8 ? 1 : 0.6));
    return pool[Math.floor(this.rng() * pool.length)].id;
  }

  private finish(result: "win" | "lose" | "catch" | "run", ev: BattleEvent[]) {
    this.over = result;
    ev.push({ t: "end", result });
  }
}

function emptyStages(): Record<StatKey, number> {
  return { might: 0, guard: 0, seidr: 0, ward: 0, swift: 0 };
}

function statLabel(s: StatKey): string {
  return { might: "Might", guard: "Guard", seidr: "Seidr", ward: "Ward", swift: "Swift" }[s];
}

export function name(c: CreatureInstance): string {
  return c.nickname || getSpecies(c.speciesId).name;
}
