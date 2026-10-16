// input.ts - unified keyboard + mouse + touch input with edge detection.
//
// Edge lifecycle: DOM events fire BETWEEN frames, so presses are collected in
// pending sets and swapped into the readable sets by beginFrame() at the start
// of the active scene's update(). pollVirtual() then merges on-screen/mouse
// virtual button edges. Scenes must call beginFrame() + pollVirtual() exactly
// once per frame, before any justPressed() reads.
export type Action = "up" | "down" | "left" | "right" | "a" | "b" | "menu";

const KEYMAP: Record<string, Action> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
  KeyZ: "a",
  Space: "a",
  KeyX: "b",
  ShiftLeft: "b",
  ShiftRight: "b",
  Backspace: "b",
  Enter: "menu",
  KeyM: "menu",
  Escape: "menu",
};

export class InputManagerImpl {
  private down = new Set<Action>();
  private pressed = new Set<Action>();
  private released = new Set<Action>();
  private pendingPressed = new Set<Action>();
  private pendingReleased = new Set<Action>();
  private virtual = new Map<Action, boolean>();
  private prevVirtual = new Map<Action, boolean>();
  private suppressed = new Set<Action>();
  private mouseA = false;
  private mouseB = false;
  attached = false;

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Backspace"].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pendingPressed.add(a);
      this.down.add(a);
    });
    window.addEventListener("keyup", (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      this.down.delete(a);
      this.pendingReleased.add(a);
    });
    // Mouse: left click = confirm (a), right click = cancel (b).
    // Touch pointers are handled by TouchControls instead, to avoid double edges.
    window.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      if (e.button === 0) {
        this.mouseA = true;
        this.pendingPressed.add("a");
        this.down.add("a");
      } else if (e.button === 2) {
        this.mouseB = true;
        this.pendingPressed.add("b");
        this.down.add("b");
      }
    });
    const up = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (e.button === 0 && this.mouseA) {
        this.mouseA = false;
        this.down.delete("a");
        this.pendingReleased.add("a");
      }
      if (e.button === 2 && this.mouseB) {
        this.mouseB = false;
        this.down.delete("b");
        this.pendingReleased.add("b");
      }
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", () => {
      this.down.clear();
      for (const a of this.virtual.keys()) this.virtual.set(a, false);
      this.mouseA = false;
      this.mouseB = false;
    });
  }

  setVirtual(a: Action, isDown: boolean) {
    this.virtual.set(a, isDown);
  }

  /**
   * Swallow this action's click edge for the current frame. Called by UI rows
   * that handle a pointerdown themselves, so the global click-as-confirm
   * mapping does not trigger a second activation.
   */
  suppress(a: Action) {
    this.pendingPressed.delete(a);
    this.pressed.delete(a);
    this.suppressed.add(a);
  }

  /** Call once per frame BEFORE reading justPressed/justReleased. */
  beginFrame() {
    this.pressed = this.pendingPressed;
    this.released = this.pendingReleased;
    this.pendingPressed = new Set();
    this.pendingReleased = new Set();
    for (const a of this.suppressed) {
      this.pressed.delete(a);
      this.released.delete(a);
    }
  }

  /**
   * Merge virtual (touch/mouse-hold) edges; call after beginFrame, once per frame.
   * Virtual state is kept separate from keyboard/mouse state (see isDown) so an
   * idle on-screen pad can never cancel a key that is physically held.
   */
  pollVirtual() {
    for (const [a, isDown] of this.virtual) {
      const was = this.prevVirtual.get(a) ?? false;
      if (isDown && !was && !this.suppressed.has(a)) this.pressed.add(a);
      if (!isDown && was) this.released.add(a);
      this.prevVirtual.set(a, isDown);
    }
    this.suppressed.clear();
  }

  isDown(a: Action): boolean {
    return this.down.has(a) || this.virtual.get(a) === true;
  }

  justPressed(a: Action): boolean {
    return this.pressed.has(a);
  }

  justReleased(a: Action): boolean {
    return this.released.has(a);
  }

  /** Any-direction held as a vector pair for movement. */
  dir(): { x: number; y: number } | null {
    // A tap shorter than one frame is released before update() runs, so the
    // press edge counts as "held" for that frame - otherwise quick taps are lost.
    const held = (a: Action) => this.isDown(a) || this.pressed.has(a);
    if (held("up")) return { x: 0, y: -1 };
    if (held("down")) return { x: 0, y: 1 };
    if (held("left")) return { x: -1, y: 0 };
    if (held("right")) return { x: 1, y: 0 };
    return null;
  }
}

export const Input = new InputManagerImpl();
