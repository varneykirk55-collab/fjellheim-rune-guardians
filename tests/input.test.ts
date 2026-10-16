// Regression tests for the unified input layer (core/input.ts).
import { describe, it, expect, beforeEach } from "vitest";
import { InputManagerImpl } from "../src/core/input";

type Handler = (e: Record<string, unknown>) => void;
let listeners: Map<string, Handler[]>;

// minimal window stub so attach() can register DOM listeners in node
function installWindow() {
  listeners = new Map();
  (globalThis as unknown as { window: unknown }).window = {
    addEventListener: (type: string, fn: Handler) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
  };
}

function fire(type: string, e: Record<string, unknown>) {
  for (const fn of listeners.get(type) ?? []) fn({ preventDefault() {}, repeat: false, ...e });
}

/** one game frame, as every scene's update() does it */
function frame(input: InputManagerImpl) {
  input.beginFrame();
  input.pollVirtual();
}

function freshInput(): InputManagerImpl {
  installWindow();
  const input = new InputManagerImpl();
  input.attach();
  // TouchControls.create() -> setVisible(false) registers every action as an
  // idle virtual button; this is the state on every desktop session.
  for (const a of ["up", "down", "left", "right", "a", "b", "menu"] as const) input.setVirtual(a, false);
  return input;
}

describe("input: keyboard with idle touch controls", () => {
  let input: InputManagerImpl;
  beforeEach(() => {
    input = freshInput();
  });

  it("a held arrow key stays held across frames (was erased by idle virtual pad -> player could not move)", () => {
    fire("keydown", { code: "ArrowDown" });
    for (let i = 0; i < 5; i++) {
      frame(input);
      expect(input.isDown("down")).toBe(true);
      expect(input.dir()).toEqual({ x: 0, y: 1 });
    }
    fire("keyup", { code: "ArrowDown" });
    frame(input);
    expect(input.isDown("down")).toBe(false);
    expect(input.dir()).toBeNull();
  });

  it("a tap shorter than one frame still yields a direction for that frame", () => {
    fire("keydown", { code: "KeyW" });
    fire("keyup", { code: "KeyW" });
    frame(input);
    expect(input.dir()).toEqual({ x: 0, y: -1 });
    frame(input);
    expect(input.dir()).toBeNull();
  });

  it("confirm press is a single-frame edge", () => {
    fire("keydown", { code: "KeyZ" });
    frame(input);
    expect(input.justPressed("a")).toBe(true);
    frame(input);
    expect(input.justPressed("a")).toBe(false);
    expect(input.isDown("a")).toBe(true);
  });

  it("touch d-pad still drives movement and releases cleanly", () => {
    input.setVirtual("left", true);
    frame(input);
    expect(input.justPressed("left")).toBe(true);
    expect(input.dir()).toEqual({ x: -1, y: 0 });
    input.setVirtual("left", false);
    frame(input);
    expect(input.justReleased("left")).toBe(true);
    expect(input.dir()).toBeNull();
  });

  it("keyboard hold survives a touch release of the same action", () => {
    fire("keydown", { code: "ArrowRight" });
    input.setVirtual("right", true);
    frame(input);
    input.setVirtual("right", false);
    frame(input);
    expect(input.isDown("right")).toBe(true);
  });

  it("window blur releases everything", () => {
    fire("keydown", { code: "ArrowUp" });
    input.setVirtual("a", true);
    frame(input);
    fire("blur", {});
    frame(input);
    expect(input.isDown("up")).toBe(false);
    expect(input.isDown("a")).toBe(false);
  });

  it("suppress() swallows a click-confirm edge for UI rows", () => {
    fire("pointerdown", { pointerType: "mouse", button: 0 });
    input.suppress("a");
    frame(input);
    expect(input.justPressed("a")).toBe(false);
  });
});
