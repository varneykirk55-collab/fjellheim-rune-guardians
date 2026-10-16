// session.ts - in-memory game session shared between scenes.
import { GameState, newGameState, SaveManager } from "./save";

class SessionImpl {
  state: GameState | null = null;
  sessionStart = Date.now();

  startNew(playerName: string, playerChar: "eirik" | "astri") {
    this.state = newGameState(playerName, playerChar);
    this.sessionStart = Date.now();
  }

  continueFromSave(): boolean {
    const s = SaveManager.load();
    if (!s) return false;
    this.state = s;
    this.sessionStart = Date.now();
    return true;
  }

  get(): GameState {
    if (!this.state) throw new Error("No active session");
    return this.state;
  }

  has(): boolean {
    return this.state !== null;
  }

  flag(name: string): boolean | number | string | undefined {
    return this.state?.flags[name];
  }

  setFlag(name: string, value: boolean | number | string = true) {
    if (this.state) this.state.flags[name] = value;
  }

  addItem(id: string, qty: number) {
    const s = this.get();
    s.bag.items[id] = (s.bag.items[id] ?? 0) + qty;
    if (s.bag.items[id] <= 0) delete s.bag.items[id];
  }

  countItem(id: string): number {
    return this.get().bag.items[id] ?? 0;
  }

  /** Persist current session (called from save menu & key story beats). */
  save(): boolean {
    if (!this.state) return false;
    this.state.playtimeMs += Date.now() - this.sessionStart;
    this.sessionStart = Date.now();
    return SaveManager.save(this.state);
  }
}

export const Session = new SessionImpl();
