// dialogues.ts - NPC conversation lines, selected by story flags.
// First matching entry wins; the last entry (no cond) is the default.
export interface Cond {
  flag?: string;
  is?: boolean | number | string;
  not?: string; // this flag must be falsy
  custom?: string; // interpreted by the story runner
}

export interface DialogueEntry {
  cond?: Cond;
  text: string[];
}

export const NPC_LINES: Record<string, DialogueEntry[]> = {
  mother: [
    { cond: { not: "starter" }, text: [
      "There you are! Seer Ingrid sent word at dawn -",
      "she wants you at the longhouse, today of all days.",
      "North past the plaza, mind the bonfire smoke.",
    ] },
    { cond: { not: "bergling_done" }, text: [
      "Ohh, look at you - a real creature trainer!",
      "Your father would grin from ear to ear.",
      "Be kind to your creatures. They remember kindness.",
    ] },
    { text: [
      "A Bergling! Shy little dear, aren't they?",
      "The whole village is talking about it.",
      "Soup's on the stove if you're hungry.",
    ] },
  ],
  guard: [
    { cond: { not: "bergling_done" }, text: [
      "Halt! ...Heh. Practising my gate voice.",
      "Whisperpine Path lies north. Wild creatures",
      "nest in the tall grass - keep your wits sharp.",
    ] },
    { text: [
      "Heard you tamed a Bergling out on the Path!",
      "That's proper Viking work, that.",
      "The Elder Stones still seal the north road...",
    ] },
  ],
  child: [
    { cond: { custom: "needMercy" }, text: [
      "Hey... you look all out of Rune Balls.",
      "Here! I carved these myself. The runes are",
      "a bit crooked, but they hold. Promise.",
    ] },
    { text: [
      "I dropped my best ball in the harbour...",
      "Grownups keep saying 'be careful'.",
      "Booooring.",
    ] },
  ],
  sigrun: [
    { text: [
      "The plaza bonfire hasn't gone out in ninety years.",
      "Someone tends it every single evening.",
      "...It's me. I tend it.",
    ] },
  ],
  fisher: [
    { cond: { not: "bergling_done" }, text: [
      "Bjorn's longship, aye. Finest hull in the fjord.",
      "He'll sail home when the winds allow.",
      "Till then, the fish keep me company.",
    ] },
    { text: [
      "Your father wrote from the far islands, did you know?",
      "...No? Ha! Keep it secret, then. Sailors' luck.",
    ] },
  ],
  carl: [
    { text: [
      "Nets, nets, nets. Salt, salt, salt.",
      "The sea's honest work, if your hands are willing.",
    ] },
  ],
  elder: [
    { text: [
      "My bones say rain. My knees say snow.",
      "Either way, the kettle's on.",
      "Sit a while, if the wilds can spare you.",
    ] },
  ],
  seer: [
    { cond: { not: "starter" }, text: [
      "Patience, child. The moment is not yet ripe.",
      "Stand upon the rune ring when you are ready.",
    ] },
    { cond: { not: "rival_done" }, text: [
      "The guardians have chosen. Now stand your ground -",
      "Sten waits, and his pride will not cool forever.",
    ] },
    { cond: { not: "bergling_done" }, text: [
      "Whisperpine Path calls to you.",
      "Something frightened waits among the pines -",
      "meet it with an open hand, not a raised fist.",
    ] },
    { text: [
      "The old songs speak of three guardians,",
      "bound to the world-tree since the first winter.",
      "You carry one of them now. Walk gently.",
    ] },
  ],
  sten: [
    { text: [
      "Took you long enough.",
      "The seer's been waiting ALL morning.",
      "Well? Going in, or what?",
    ] },
  ],
  healer: [
    { cond: { not: "healed_once" }, text: [
      "Welcome to the Hall of Mending.",
      "Bring your creatures to my counter and I will",
      "knit their wounds and calm their spirits. Free of charge.",
    ] },
    { text: [
      "Every creature mended, every spirit eased.",
      "Step up whenever you need me.",
    ] },
  ],
  trader: [
    { cond: { not: "bought_once" }, text: [
      "Rune Balls, tonics, honest prices!",
      "A trainer without balls is a walker, ha!",
      "Browse my counter whenever you like.",
    ] },
    { text: [
      "Back again! Coins well spent are coins well earned.",
      "Browse away!",
    ] },
  ],
  trainer_herdis: [
    { cond: { not: "beat_herdis" }, text: [
      "A new face on the Path! I scout these pines.",
      "Show me your creatures measure up -",
      "fair warning: I don't hold back!",
    ] },
    { text: [
      "You've a good bond with your creatures.",
      "The Path is safer with you walking it.",
    ] },
  ],
  trainer_bjarni: [
    { cond: { not: "beat_bjarni" }, text: [
      "Hoho! A village trainer, out past the grass?",
      "My wood-creatures and I will test your mettle!",
    ] },
    { text: [
      "Sturdy as birch, that team of yours!",
      "Cut yourself firewood before the frost, eh?",
    ] },
  ],
};
