// battle/types.ts - shared battle data structures (pure, renderer-free).
import { StatKey, StatusId } from "../data/moves";

export interface MoveSlot {
  id: string;
  pp: number;
}

export interface CreatureInstance {
  uid: string;
  speciesId: string;
  nickname?: string;
  level: number;
  exp: number;
  hp: number;
  moves: MoveSlot[];
  status: StatusId | null;
  statusTurns: number;
}

export interface TrainerRef {
  id: string;
  name: string;
  trainerClass: string;
  charKey: string;
  rewardSilver: number;
  introLines: string[];
  defeatLines: string[];
}

export type BattleBackground = "meadow" | "forest" | "shore" | "indoor";

export interface BattleConfig {
  kind: "wild" | "trainer";
  playerParty: CreatureInstance[];
  enemyParty: CreatureInstance[];
  trainer?: TrainerRef;
  /** story battles: fleeing disabled */
  noRun?: boolean;
  /** trainer battles: catching disabled */
  noCatch?: boolean;
  background: BattleBackground;
  rng?: () => number;
}

export type Side = "player" | "enemy";

export type BattleEvent =
  | { t: "message"; text: string }
  | { t: "sendOut"; side: Side; index: number }
  | { t: "withdraw"; side: Side }
  | { t: "move"; side: Side; moveId: string; category: string }
  | { t: "miss"; side: Side }
  | { t: "damage"; side: Side; amount: number; hpLeft: number; effectiveness: number; crit: boolean }
  | { t: "heal"; side: Side; amount: number; hpLeft: number }
  | { t: "status"; side: Side; status: StatusId }
  | { t: "statusTick"; side: Side; status: StatusId; hpLeft: number }
  | { t: "statusCure"; side: Side }
  | { t: "statStage"; side: Side; stat: StatKey; delta: number; stage: number }
  | { t: "faint"; side: Side }
  | { t: "needSwitch"; side: Side }
  | { t: "forceSwitch"; side: Side }
  | { t: "catchThrow"; ballId: string }
  | { t: "catchShake"; n: number }
  | { t: "catchFail" }
  | { t: "catchSuccess"; creature: CreatureInstance }
  | { t: "runSuccess" }
  | { t: "runFail" }
  | { t: "itemUse"; side: Side; itemId: string; hpLeft?: number }
  | { t: "end"; result: "win" | "lose" | "catch" | "run" };

export type PlayerAction =
  | { kind: "move"; index: number }
  | { kind: "switch"; index: number }
  | { kind: "item"; itemId: string }
  | { kind: "run" };
