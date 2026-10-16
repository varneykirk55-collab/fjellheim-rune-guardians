// theme.ts - shared UI constants (pixel font settings, colors).
import type Phaser from "phaser";

export const FONT = "PressStart";

export const TXT = {
  fontFamily: FONT,
  fontSize: "8px",
  color: "#f4ecd8",
} as const;

export const TXT_DARK = { ...TXT, color: "#2a2438" } as const;
export const TXT_GOLD = { ...TXT, color: "#f0c860" } as const;
export const TXT_DIM = { ...TXT, color: "#9a92a8" } as const;

/** numeric colors for graphics objects (bars, fills) */
export const COLORS = {
  panelInner: 0x241e30,
  hpHigh: 0x58c858,
  hpMid: 0xe8b838,
  hpLow: 0xe05038,
  exp: 0x58a8e8,
} as const;

export function textStyle(
  base: typeof TXT,
  over: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return { ...base, ...over };
}
