// story.ts - data-driven story event scripts.
// The WorldScene interpreter executes steps in order; battles branch via
// onResult. Keeping the story in data means Phase 2+ chapters are additive.
import { Cond } from "./dialogues";
import { Facing } from "../core/save";

export type StoryStep =
  | { say: string[]; speaker?: string }
  | { setFlag: string; value?: boolean | number | string }
  | { give: { item?: string; qty?: number; silver?: number } }
  | { starterChoice: true }
  | { battle: { trainer?: string; wild?: { species: string; level: number }; noRun?: boolean } }
  | { heal: true }
  | { shop: true }
  | { showCreature: { species: string; x: number; y: number } }
  | { hideCreature: true }
  | { facePlayer: Facing }
  | { movePlayer: { x: number; y: number; dir?: Facing } }
  | { cry: string };

export type BattleResult = "win" | "lose" | "run" | "catch";

export interface StoryEvent {
  id: string;
  map: string;
  trigger:
    | { type: "enter" }
    | { type: "step"; x: number; y: number; w: number; h: number }
    | { type: "talk"; npc: string };
  when?: Cond;
  steps: StoryStep[];
  onResult?: Partial<Record<BattleResult, StoryStep[]>>;
}

export const STORY_EVENTS: StoryEvent[] = [
  /* -------- opening: wake at home -------- */
  {
    id: "home_intro",
    map: "home",
    trigger: { type: "enter" },
    when: { not: "intro_done" },
    steps: [
      { say: ["Morning light spills through the shutters.", "The smell of bread and woodsmoke fills the house."] },
      { say: ["Mother: Up at last, my fjord-otter!", "Seer Ingrid sent word at dawn - she wants", "you at the longhouse. Today is the day."], speaker: "Mother" },
      { say: ["Mother: Go on, then. And comb your hair!"], speaker: "Mother" },
      { setFlag: "intro_done" },
    ],
  },
  /* -------- seer: starter selection + rival battle -------- */
  {
    id: "seer_starter",
    map: "seer",
    trigger: { type: "enter" },
    when: { not: "starter" },
    steps: [
      { movePlayer: { x: 8, y: 8, dir: "up" } },
      { say: ["The longhouse air hums. Three stone pedestals", "glow softly around a carved rune ring."], speaker: "" },
      { say: ["Seer Ingrid: Come, child. Stand upon the ring.", "The old songs have been waiting for you."], speaker: "Seer Ingrid" },
      { say: ["Seer Ingrid: Three guardians sleep here, bound to", "the world-tree since the first winter.", "One will wake for you. Choose with your heart."], speaker: "Seer Ingrid" },
      { starterChoice: true },
      { say: ["Seer Ingrid: It has chosen you as much as you it.", "Guard it, feed it, and it will guard you back."], speaker: "Seer Ingrid" },
      { say: ["Sten: HA! Knew I'd get the better one!", "Watch and learn, village-hero."], speaker: "Sten" },
      { battle: { trainer: "sten1" } },
    ],
    onResult: {
      win: [
        { setFlag: "rival_done" },
        { say: ["Sten: ...Luck. That was LUCK.", "Next time I won't go easy on you!"], speaker: "Sten" },
        { say: ["Seer Ingrid: Well fought, both of you.", "Take these Rune Balls - the wilds respect", "a trainer who catches with honour."], speaker: "Seer Ingrid" },
        { give: { item: "rune_ball", qty: 8 } },
        { give: { item: "tonic", qty: 2 } },
        { give: { silver: 100 } },
        { say: ["Seer Ingrid: Whisperpine Path lies north of the gate.", "Something frightened waits among the pines.", "Meet it with an open hand."], speaker: "Seer Ingrid" },
      ],
      lose: [
        { setFlag: "rival_pending" },
        { heal: true },
        { say: ["Seer Ingrid: A hard lesson, not a fatal one.", "Mend your team, steady your heart,", "and face him again."], speaker: "Seer Ingrid" },
      ],
    },
  },
  {
    id: "seer_rematch",
    map: "seer",
    trigger: { type: "talk", npc: "seer" },
    when: { flag: "rival_pending", is: true },
    steps: [
      { say: ["Sten: Still breathing, then?", "Come on - my creature's warmed up again!"], speaker: "Sten" },
      { battle: { trainer: "sten1" } },
    ],
    onResult: {
      win: [
        { setFlag: "rival_done" },
        { setFlag: "rival_pending", value: false },
        { say: ["Sten: ...Luck. That was LUCK.", "Next time I won't go easy on you!"], speaker: "Sten" },
        { give: { item: "rune_ball", qty: 8 } },
        { give: { item: "tonic", qty: 2 } },
        { give: { silver: 100 } },
        { say: ["Seer Ingrid: Whisperpine Path lies north of the gate.", "Something frightened waits among the pines.", "Meet it with an open hand."], speaker: "Seer Ingrid" },
      ],
      lose: [
        { heal: true },
        { say: ["Seer Ingrid: Breathe. Again, when you are ready."], speaker: "Seer Ingrid" },
      ],
    },
  },
  /* -------- village gate: no wandering into the wilds without a creature -------- */
  {
    id: "gate_needs_starter",
    map: "village",
    trigger: { type: "step", x: 24, y: 2, w: 3, h: 1 },
    when: { not: "starter" },
    steps: [
      { say: ["Guard: Whoa there! Seer Ingrid is waiting", "for you at the longhouse - and the Path", "is no place to wander without a creature."], speaker: "Guard" },
      { movePlayer: { x: 22, y: 3, dir: "left" } },
    ],
  },
  /* -------- route: frightened bergling (mandatory capture) -------- */
  {
    id: "bergling_event",
    map: "route1",
    trigger: { type: "step", x: 24, y: 10, w: 7, h: 5 },
    when: { not: "bergling_done" },
    steps: [
      { showCreature: { species: "bergling", x: 27, y: 12 } },
      { say: ["A frightened BERGLING blocks the path!", "It trembles like a leaf, but holds its ground.", "It needs a friend - and a Rune Ball."] },
      { battle: { wild: { species: "bergling", level: 4 }, noRun: true } },
    ],
    onResult: {
      catch: [
        { setFlag: "bergling_done" },
        { hideCreature: true },
        { say: ["The Rune Ball settles. The runes glow warm,", "then soft, then still.", "The Bergling nuzzles your hand. It has chosen you."] },
        { say: ["Far north, beyond the Elder Stones,", "something vast turns over in its sleep..."] },
      ],
      win: [
        { hideCreature: true },
        { say: ["Oh no - the Bergling scrambles into the brush!", "It will return. Wait for it, and be gentler."] },
      ],
      lose: [
        { say: ["Everything goes dark...", "You wake at the Hall of Mending.", "The Bergling is still out there, waiting."] },
      ],
    },
  },
  /* -------- mercy Rune Balls (anti-softlock) -------- */
  {
    id: "mercy_balls",
    map: "village",
    trigger: { type: "talk", npc: "child" },
    when: { custom: "needMercy" },
    steps: [
      { give: { item: "rune_ball", qty: 5 } },
      { setFlag: "mercy_given" },
    ],
  },
  /* -------- services -------- */
  {
    id: "heal_service",
    map: "heal",
    trigger: { type: "talk", npc: "healer" },
    steps: [{ heal: true }, { setFlag: "healed_once" }],
  },
  {
    id: "shop_service",
    map: "shop",
    trigger: { type: "talk", npc: "trader" },
    steps: [{ shop: true }, { setFlag: "bought_once" }],
  },
  /* -------- trainer battles -------- */
  {
    id: "battle_herdis",
    map: "route1",
    trigger: { type: "talk", npc: "trainer_herdis" },
    when: { not: "beat_herdis" },
    steps: [{ battle: { trainer: "herdis" } }],
    onResult: {
      win: [{ setFlag: "beat_herdis" }],
      lose: [{ say: ["You wake at the Hall of Mending,", "coin-lighter and wiser."], }],
    },
  },
  {
    id: "battle_bjarni",
    map: "route1",
    trigger: { type: "talk", npc: "trainer_bjarni" },
    when: { not: "beat_bjarni" },
    steps: [{ battle: { trainer: "bjarni" } }],
    onResult: {
      win: [{ setFlag: "beat_bjarni" }],
      lose: [{ say: ["You wake at the Hall of Mending,", "coin-lighter and wiser."] }],
    },
  },
];
