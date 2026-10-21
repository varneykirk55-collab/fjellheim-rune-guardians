// save.ts - versioned persistent local save data.
import { CreatureInstance } from "../battle/types";

export const SAVE_VERSION = 1;
const SAVE_KEY = "fjellheim.save";

export type Facing = "up" | "down" | "left" | "right";

export interface GameSettings {
  music: number; // 0..1
  sfx: number; // 0..1
  textSpeed: "slow" | "normal" | "fast";
  touch: "auto" | "on" | "off";
}

export interface GameState {
  v: number;
  playerName: string;
  playerChar: "eirik" | "astri";
  pos: { map: string; x: number; y: number; dir: Facing };
  party: CreatureInstance[];
  box: CreatureInstance[];
  bag: { silver: number; items: Record<string, number> };
  flags: Record<string, boolean | number | string>;
  stats: { battles: number; wins: number; captures: number; steps: number };
  playtimeMs: number;
  settings: GameSettings;
}

export function newGameState(playerName: string, playerChar: "eirik" | "astri"): GameState {
  return {
    v: SAVE_VERSION,
    playerName,
    playerChar,
    pos: { map: "home", x: 5, y: 6, dir: "down" },
    party: [],
    box: [],
    bag: { silver: 500, items: {} },
    flags: {},
    stats: { battles: 0, wins: 0, captures: 0, steps: 0 },
    playtimeMs: 0,
    settings: { music: 0.7, sfx: 0.8, textSpeed: "normal", touch: "auto" },
  };
}

/** Migrations run oldest-first when loading older saves. */
const MIGRATIONS: Record<number, (data: GameState) => GameState> = {
  // 1: (example for future sessions) 1->2 transform goes here
};

export const SaveManager = {
  hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  },

  save(state: GameState): boolean {
    try {
      state.v = SAVE_VERSION;
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error("Save failed", e);
      return false;
    }
  },

  load(): GameState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      let data = JSON.parse(raw) as GameState;
      if (typeof data?.v !== "number") return null;
      while (data.v < SAVE_VERSION) {
        const mig = MIGRATIONS[data.v];
        if (!mig) {
          console.warn(`No migration from save version ${data.v}; discarding save.`);
          return null;
        }
        data = mig(data);
      }
      if (!validateState(data)) return null;
      // an unknown hero would render with no sprite: fall back to the first one
      if (data.playerChar !== "eirik" && data.playerChar !== "astri") data.playerChar = "eirik";
      return data;
    } catch (e) {
      console.error("Load failed", e);
      return null;
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  },
};

function validateState(s: GameState): boolean {
  return (
    !!s &&
    typeof s.playerName === "string" &&
    Array.isArray(s.party) &&
    Array.isArray(s.box) &&
    !!s.pos &&
    typeof s.pos.map === "string" &&
    !!s.bag &&
    typeof s.bag.silver === "number" &&
    !!s.flags &&
    !!s.settings
  );
}
