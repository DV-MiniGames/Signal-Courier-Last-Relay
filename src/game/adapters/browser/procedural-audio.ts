import type { GameEffect } from "../../core/types";

const TONES: Partial<Record<GameEffect["type"], readonly [number, number]>> = {
  dash: [310, 0.07],
  shot: [440, 0.035],
  emp: [130, 0.24],
  hit: [90, 0.055],
  "packet-picked": [660, 0.12],
  "relay-installed": [520, 0.16],
  "relay-jammed": [170, 0.18],
  "relay-offline": [80, 0.22],
  "relay-repaired": [580, 0.16],
  "upload-complete": [780, 0.28],
};

export class ProceduralAudio {
  private audioContext: AudioContext | null = null;

  constructor() {
    const unlock = (): void => this.unlock();
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("pointerdown", unlock, { once: true });
  }

  playEffects(effects: readonly GameEffect[]): void {
    const audioContext = this.audioContext;
    if (!audioContext || audioContext.state !== "running") return;
    for (const effect of effects) {
      const tone = TONES[effect.type];
      if (!tone) continue;
      this.playTone(audioContext, tone[0], tone[1], effect.type.includes("jammed") ? "sawtooth" : "triangle");
      if (effect.type === "upload-complete") {
        this.playTone(audioContext, tone[0] * 1.25, tone[1] * 0.8, "sine", 0.09);
        this.playTone(audioContext, tone[0] * 1.5, tone[1] * 0.7, "sine", 0.17);
      }
    }
  }

  private unlock(): void {
    this.audioContext ??= new AudioContext();
    if (this.audioContext.state === "suspended") void this.audioContext.resume();
  }

  private playTone(
    audioContext: AudioContext,
    frequency: number,
    duration: number,
    type: OscillatorType,
    delay = 0,
  ): void {
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }
}
