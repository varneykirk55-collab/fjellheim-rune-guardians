// audio.ts - original synthesized soundtrack & SFX (WebAudio, no samples).
// All melodies are original compositions in Norse-flavoured modes.
export interface Channel {
  wave: OscillatorType;
  vol: number;
  /** [midiNote | null, beats] pairs; loops */
  seq: [number | null, number][];
  transpose?: number;
}

export interface Track {
  bpm: number;
  loop: boolean;
  channels: Channel[];
}

const N = {
  G2: 43, A2: 45, Bb2: 46, C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, Bb3: 58, C4: 60,
  D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, Bb4: 70, C5: 72, D5: 74, F5: 77,
  D2: 38, C2: 36, A1: 33, F2: 41, E2: 40, G1: 31, D1: 26, A1b: 34,
};

export const TRACKS: Record<string, Track> = {
  title: {
    bpm: 72,
    loop: true,
    channels: [
      { wave: "sine", vol: 0.16, seq: [[N.D2, 4], [N.D2, 4], [N.Bb2, 4], [N.Bb2, 4], [N.C3, 4], [N.C3, 4], [N.A2, 4], [N.A2, 4]] },
      { wave: "triangle", vol: 0.14, seq: [
        [N.A3, 2], [N.D4, 2], [N.F4, 4], [N.E4, 2], [N.D4, 2], [N.C4, 4],
        [N.Bb3, 2], [N.C4, 2], [N.D4, 4], [N.C4, 2], [N.A3, 2], [N.A3, 4],
      ] },
      { wave: "sine", vol: 0.07, seq: [
        [N.D5, 1], [null, 3], [N.A4, 1], [null, 3], [N.F5, 1], [null, 3], [N.E4, 1], [null, 3],
        [N.D5, 1], [null, 3], [N.C5, 1], [null, 3], [N.A4, 2], [null, 2], [null, 4],
      ] },
    ],
  },
  village: {
    bpm: 100,
    loop: true,
    channels: [
      { wave: "triangle", vol: 0.16, seq: [
        [N.D3, 2], [N.D3, 2], [N.A2, 2], [N.A2, 2], [N.D3, 2], [N.D3, 2], [N.A2, 2], [N.A2, 2],
        [N.F2, 2], [N.F2, 2], [N.C3, 2], [N.C3, 2], [N.F2, 2], [N.F2, 2], [N.A2, 2], [N.A2, 2],
      ] },
      { wave: "square", vol: 0.055, seq: [
        [N.D4, 1], [N.E4, 1], [N.F4, 1], [N.E4, 1], [N.D4, 1], [N.A3, 1], [N.D4, 2],
        [N.F4, 1], [N.G4, 1], [N.A4, 1], [N.G4, 1], [N.F4, 1], [N.D4, 1], [N.E4, 2],
        [N.D4, 1], [N.E4, 1], [N.F4, 1], [N.E4, 1], [N.D4, 1], [N.A3, 1], [N.D4, 2],
        [N.C4, 1], [N.D4, 1], [N.E4, 1], [N.D4, 1], [N.A3, 4],
      ] },
      { wave: "sine", vol: 0.05, seq: [
        [N.A4, 0.5], [null, 0.5], [N.A4, 0.5], [null, 0.5], [N.A4, 0.5], [null, 0.5], [N.A4, 0.5], [null, 0.5],
        [N.A4, 0.5], [null, 0.5], [N.A4, 0.5], [null, 0.5], [N.A4, 0.5], [null, 0.5], [N.A4, 0.5], [null, 0.5],
      ] },
    ],
  },
  route: {
    bpm: 118,
    loop: true,
    channels: [
      { wave: "triangle", vol: 0.16, seq: [
        [N.D3, 1], [N.D3, 1], [N.A2, 1], [N.D3, 1], [N.C3, 1], [N.C3, 1], [N.G2, 1], [N.C3, 1],
        [N.Bb2, 1], [N.Bb2, 1], [N.F2, 1], [N.Bb2, 1], [N.A2, 1], [N.A2, 1], [N.E2, 1], [N.A2, 1],
      ] },
      { wave: "square", vol: 0.06, seq: [
        [N.A3, 1], [N.D4, 1], [N.D4, 1], [N.E4, 1], [N.F4, 1], [N.E4, 1], [N.D4, 2],
        [N.G4, 1], [N.F4, 1], [N.E4, 1], [N.D4, 1], [N.C4, 2], [null, 2],
        [N.F4, 1], [N.E4, 1], [N.D4, 1], [N.C4, 1], [N.D4, 1], [N.E4, 1], [N.F4, 2],
        [N.E4, 1], [N.D4, 1], [N.C4, 1], [N.A3, 1], [N.A3, 4],
      ] },
      { wave: "sine", vol: 0.06, seq: [
        [N.D5, 0.5], [null, 1.5], [N.C5, 0.5], [null, 1.5], [N.A4, 0.5], [null, 1.5], [N.F4, 0.5], [null, 1.5],
      ] },
    ],
  },
  battle: {
    bpm: 150,
    loop: true,
    channels: [
      { wave: "square", vol: 0.09, seq: [
        [N.D2, 0.5], [N.D2, 0.5], [N.D2, 0.5], [N.D3, 0.5], [N.D2, 0.5], [N.D2, 0.5], [N.C3, 0.5], [N.D3, 0.5],
        [N.D2, 0.5], [N.D2, 0.5], [N.D2, 0.5], [N.D3, 0.5], [N.Bb2, 0.5], [N.A2, 0.5], [N.G2, 0.5], [N.A2, 0.5],
      ] },
      { wave: "square", vol: 0.065, seq: [
        [N.D4, 0.5], [N.F4, 0.5], [N.G4, 0.5], [N.A4, 1], [N.G4, 0.5], [N.F4, 0.5], [N.D4, 1],
        [N.Bb3, 0.5], [N.C4, 0.5], [N.D4, 0.5], [N.F4, 1], [N.D4, 0.5], [N.C4, 0.5], [N.A3, 1],
      ] },
      { wave: "sine", vol: 0.12, seq: [
        [N.D1, 0.5], [null, 0.5], [N.D1, 0.5], [null, 0.5], [N.D1, 0.5], [null, 0.5], [N.D1, 0.5], [null, 0.5],
        [N.D1, 0.5], [null, 0.5], [N.D1, 0.5], [null, 0.5], [N.C2, 0.5], [null, 0.5], [N.A1, 0.5], [null, 0.5],
      ] },
      { wave: "sine", vol: 0.045, seq: [
        [null, 0.5], [N.A4, 0.5], [null, 0.5], [N.A4, 0.5], [null, 0.5], [N.A4, 0.5], [null, 0.5], [N.A4, 0.5],
        [null, 0.5], [N.A4, 0.5], [null, 0.5], [N.A4, 0.5], [null, 0.5], [N.A4, 0.5], [null, 0.5], [N.A4, 0.5],
      ] },
    ],
  },
  victory: {
    bpm: 132,
    loop: false,
    channels: [
      { wave: "square", vol: 0.08, seq: [
        [N.D4, 0.5], [N.F4, 0.5], [N.A4, 0.5], [N.D5, 1.5], [N.C5, 0.5], [N.A4, 0.5], [N.F4, 0.5], [N.D5, 3],
      ] },
      { wave: "triangle", vol: 0.14, seq: [[N.D3, 1], [N.A2, 1], [N.Bb2, 1], [N.A2, 1], [N.D3, 4]] },
    ],
  },
  catchJingle: {
    bpm: 120,
    loop: false,
    channels: [
      { wave: "triangle", vol: 0.15, seq: [[N.G3, 0.5], [N.Bb3, 0.5], [N.D4, 0.5], [N.G4, 1], [N.F4, 0.5], [N.D4, 0.5], [N.G4, 3]] },
      { wave: "sine", vol: 0.1, seq: [[N.D5, 0.5], [null, 0.5], [N.F5, 0.5], [null, 0.5], [N.G4, 3], [null, 1]] },
    ],
  },
  healJingle: {
    bpm: 100,
    loop: false,
    channels: [
      { wave: "sine", vol: 0.14, seq: [[N.C4, 0.75], [N.E4, 0.75], [N.G4, 0.75], [N.C5, 1.5], [N.G4, 0.75], [N.C5, 2]] },
      { wave: "triangle", vol: 0.1, seq: [[N.C3, 1.5], [N.G3, 1.5], [N.C3, 3]] },
    ],
  },
  evolve: {
    bpm: 90,
    loop: false,
    channels: [
      { wave: "sine", vol: 0.12, seq: [[N.D3, 1], [N.E3, 1], [N.F3, 1], [N.G3, 1], [N.A3, 1], [N.Bb3, 1], [N.C4, 1], [N.D4, 2]] },
      { wave: "triangle", vol: 0.1, seq: [[N.D4, 1], [N.E4, 1], [N.F4, 1], [N.G4, 1], [N.A4, 1], [N.Bb4, 1], [N.C5, 1], [N.D5, 2]] },
    ],
  },
};

type SfxName =
  | "cursor" | "confirm" | "cancel" | "blip" | "bump" | "encounter" | "hitPhys" | "hitSpec"
  | "superEff" | "faint" | "throw" | "shake" | "burst" | "heal" | "save" | "error" | "evolve" | "door";

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private current: { track: Track; timer: number; nextTime: number; pos: number[]; beat: number } | null = null;
  musicVol = 0.7;
  sfxVol = 0.8;

  /** Must be called from a user gesture at least once. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicVol;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxVol;
      this.sfxBus.connect(this.master);
      const len = this.ctx.sampleRate * 1;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setVolumes(music: number, sfx: number) {
    this.musicVol = music;
    this.sfxVol = sfx;
    if (this.ctx) {
      this.musicBus.gain.value = music;
      this.sfxBus.gain.value = sfx;
    }
  }

  private freq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private tone(opts: { wave: OscillatorType; f0: number; f1?: number; dur: number; vol: number; when?: number; bus?: GainNode }) {
    if (!this.ctx) return;
    const t = (opts.when ?? this.ctx.currentTime) + 0.001;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.wave;
    osc.frequency.setValueAtTime(opts.f0, t);
    if (opts.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), t + opts.dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(opts.vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    osc.connect(g);
    g.connect(opts.bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + opts.dur + 0.05);
  }

  private noise(opts: { dur: number; vol: number; f0?: number; f1?: number; q?: number; when?: number; bus?: GainNode }) {
    if (!this.ctx || !this.noiseBuf) return;
    const t = (opts.when ?? this.ctx.currentTime) + 0.001;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(opts.f0 ?? 800, t);
    if (opts.f1) filt.frequency.exponentialRampToValueAtTime(opts.f1, t + opts.dur);
    filt.Q.value = opts.q ?? 1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(opts.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(opts.bus ?? this.sfxBus);
    src.start(t);
    src.stop(t + opts.dur + 0.05);
  }

  sfx(name: SfxName) {
    if (!this.ctx) return;
    switch (name) {
      case "cursor": this.tone({ wave: "square", f0: 880, dur: 0.045, vol: 0.12 }); break;
      case "confirm": this.tone({ wave: "square", f0: 660, f1: 990, dur: 0.09, vol: 0.14 }); break;
      case "cancel": this.tone({ wave: "square", f0: 440, f1: 300, dur: 0.09, vol: 0.12 }); break;
      case "blip": this.tone({ wave: "square", f0: 520, dur: 0.022, vol: 0.05 }); break;
      case "bump": this.tone({ wave: "triangle", f0: 130, f1: 90, dur: 0.07, vol: 0.16 }); break;
      case "door": this.noise({ dur: 0.14, vol: 0.12, f0: 500, f1: 200 }); break;
      case "encounter":
        this.tone({ wave: "sawtooth", f0: 200, f1: 900, dur: 0.28, vol: 0.14 });
        this.noise({ dur: 0.3, vol: 0.1, f0: 300, f1: 2400 });
        break;
      case "hitPhys":
        this.noise({ dur: 0.09, vol: 0.22, f0: 900, f1: 200, q: 0.8 });
        this.tone({ wave: "sine", f0: 200, f1: 70, dur: 0.1, vol: 0.2 });
        break;
      case "hitSpec":
        this.tone({ wave: "sawtooth", f0: 950, f1: 220, dur: 0.14, vol: 0.13 });
        this.noise({ dur: 0.12, vol: 0.1, f0: 2000, f1: 500 });
        break;
      case "superEff":
        this.noise({ dur: 0.2, vol: 0.26, f0: 1400, f1: 150, q: 0.7 });
        this.tone({ wave: "square", f0: 120, f1: 60, dur: 0.2, vol: 0.16 });
        break;
      case "faint": this.tone({ wave: "sine", f0: 420, f1: 60, dur: 0.42, vol: 0.18 }); break;
      case "throw": this.noise({ dur: 0.22, vol: 0.16, f0: 400, f1: 2600, q: 1.4 }); break;
      case "shake": this.tone({ wave: "triangle", f0: 190, f1: 150, dur: 0.06, vol: 0.16 }); break;
      case "burst": this.noise({ dur: 0.18, vol: 0.2, f0: 1800, f1: 300 }); break;
      case "heal":
        [660, 880, 990, 1320].forEach((f, i) => this.tone({ wave: "sine", f0: f, dur: 0.16, vol: 0.1, when: this.ctx!.currentTime + i * 0.09 }));
        break;
      case "save":
        this.tone({ wave: "sine", f0: 523, dur: 0.3, vol: 0.12 });
        this.tone({ wave: "sine", f0: 784, dur: 0.4, vol: 0.1, when: this.ctx!.currentTime + 0.12 });
        break;
      case "error": this.tone({ wave: "square", f0: 110, dur: 0.16, vol: 0.14 }); break;
      case "evolve":
        this.tone({ wave: "sine", f0: 300, f1: 1200, dur: 1.1, vol: 0.12 });
        this.tone({ wave: "triangle", f0: 600, f1: 2400, dur: 1.1, vol: 0.07 });
        break;
    }
  }

  /** Creature cry synthesis from species cry specs. */
  cry(base: number, sweep: number, wave: OscillatorType, dur: number, vibrato = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, base * sweep), t + dur);
    if (vibrato) {
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.value = vibrato;
      lg.gain.value = base * 0.06;
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  startMusic(id: string) {
    const track = TRACKS[id];
    if (!track) return;
    if (this.current && (this.current as { id?: string }).id === id) return;
    this.stopMusic();
    if (!this.ctx) return;
    const state = {
      id,
      track,
      timer: 0,
      nextTime: this.ctx.currentTime + 0.08,
      pos: track.channels.map(() => 0),
      rem: track.channels.map(() => 0),
      beat: 0,
    };
    this.current = state as unknown as typeof this.current;
    (this.current as unknown as { id: string }).id = id;
    state.timer = window.setInterval(() => this.pump(state), 90);
    this.pump(state);
  }

  private pump(state: { track: Track; nextTime: number; pos: number[]; rem: number[]; beat: number }) {
    if (!this.ctx) return;
    const spb = 60 / state.track.bpm;
    let guard = 0;
    while (state.nextTime < this.ctx.currentTime + 0.35 && guard++ < 64) {
      // schedule every channel whose current note has fully elapsed
      state.track.channels.forEach((ch, ci) => {
        if (state.rem[ci] <= 0) {
          const [note, beats] = ch.seq[state.pos[ci]];
          if (note !== null) {
            this.tone({
              wave: ch.wave,
              f0: this.freq(note + (ch.transpose ?? 0)),
              dur: Math.max(0.06, beats * spb * 0.92),
              vol: ch.vol,
              when: state.nextTime,
              bus: this.musicBus,
            });
          }
          state.rem[ci] = beats;
        }
      });
      const minRem = Math.min(...state.rem);
      state.nextTime += minRem * spb;
      state.rem = state.rem.map((r) => Math.max(0, r - minRem));
      state.track.channels.forEach((ch, ci) => {
        if (state.rem[ci] === 0) state.pos[ci] = (state.pos[ci] + 1) % ch.seq.length;
      });
      const allWrapped = state.track.channels.every((ch, ci) => state.pos[ci] === 0);
      if (allWrapped && !state.track.loop) {
        window.clearInterval((this.current as unknown as { timer: number }).timer);
        this.current = null;
        return;
      }
    }
  }

  stopMusic() {
    if (this.current) {
      window.clearInterval((this.current as unknown as { timer: number }).timer);
      this.current = null;
    }
  }

  /** Play a non-looping jingle to completion, then resume previous track. */
  jingle(id: string): Promise<void> {
    const track = TRACKS[id];
    if (!track || !this.ctx) return Promise.resolve();
    const prev = (this.current as unknown as { id?: string } | null)?.id ?? null;
    this.stopMusic();
    this.startMusic(id);
    const spb = 60 / track.bpm;
    const total = Math.max(...track.channels.map((ch) => ch.seq.reduce((s, [, b]) => s + b, 0))) * spb;
    return new Promise((res) => {
      window.setTimeout(() => {
        this.stopMusic();
        if (prev) this.startMusic(prev);
        res();
      }, total * 1000 + 250);
    });
  }
}

export const Audio = new AudioManagerImpl();
