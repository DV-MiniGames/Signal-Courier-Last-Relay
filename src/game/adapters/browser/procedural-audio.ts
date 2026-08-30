import type { GameEffect } from "../../core/types";

export class ProceduralAudio {
  private audioContext: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private captureDestination: MediaStreamAudioDestinationNode | null = null;

  constructor() {
    const unlock = (): void => this.unlock();
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("pointerdown", unlock, { once: true });
  }

  playEffects(effects: readonly GameEffect[]): void {
    const audioContext = this.audioContext;
    if (!audioContext || audioContext.state !== "running" || !this.master) return;
    for (const effect of effects) this.playEffect(audioContext, effect);
  }

  getCaptureStream(): MediaStream {
    this.ensureAudioGraph();
    if (!this.captureDestination) throw new Error("Gameplay audio capture destination was not initialized.");
    return this.captureDestination.stream;
  }

  private unlock(): void {
    this.ensureAudioGraph();
    if (this.audioContext?.state === "suspended") void this.audioContext.resume();
  }

  private ensureAudioGraph(): void {
    if (!this.audioContext) {
      const audioContext = new AudioContext();
      this.audioContext = audioContext;
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.18;
      this.master = audioContext.createGain();
      this.master.gain.value = 0.72;
      this.captureDestination = audioContext.createMediaStreamDestination();
      this.master.connect(compressor);
      compressor.connect(audioContext.destination);
      compressor.connect(this.captureDestination);
      this.noiseBuffer = this.createNoiseBuffer(audioContext);
    }
  }

  private playEffect(audioContext: AudioContext, effect: GameEffect): void {
    switch (effect.type) {
      case "shot":
        this.playTone(audioContext, 520, 170, 0.055, "square", 0, 0.045);
        this.playNoise(audioContext, 0.028, 0.026, 2600);
        break;
      case "enemy-hit":
        this.playTone(audioContext, 150, 86, 0.06, "triangle", 0, 0.06);
        this.playNoise(audioContext, 0.045, 0.035, 1250);
        break;
      case "enemy-destroyed":
        this.playNoise(audioContext, 0.18, 0.075, 780);
        this.playTone(audioContext, 135, 48, 0.18, "sawtooth", 0, 0.08);
        this.playTone(audioContext, 220, 92, 0.11, "triangle", 0.035, 0.05);
        break;
      case "player-hit":
        this.playNoise(audioContext, 0.14, 0.09, 540);
        this.playTone(audioContext, 92, 48, 0.15, "sawtooth", 0, 0.1);
        break;
      case "dash":
        this.playNoise(audioContext, 0.09, 0.035, 1800);
        this.playTone(audioContext, 230, 620, 0.09, "triangle", 0, 0.055);
        break;
      case "emp":
        this.playTone(audioContext, 92, 310, 0.28, "sine", 0, 0.09);
        this.playTone(audioContext, 184, 72, 0.22, "sawtooth", 0.03, 0.045);
        this.playNoise(audioContext, 0.2, 0.035, 920);
        break;
      case "packet-picked":
        this.playTone(audioContext, 540, 760, 0.11, "sine", 0, 0.055);
        this.playTone(audioContext, 680, 920, 0.1, "sine", 0.07, 0.045);
        break;
      case "relay-installed":
      case "relay-repaired":
        this.playTone(audioContext, 260, 560, 0.18, "triangle", 0, 0.055);
        this.playTone(audioContext, 520, 780, 0.16, "sine", 0.1, 0.05);
        break;
      case "relay-jammed":
        this.playTone(audioContext, 188, 132, 0.2, "sawtooth", 0, 0.065);
        this.playTone(audioContext, 116, 82, 0.18, "square", 0.08, 0.045);
        break;
      case "relay-offline":
        this.playNoise(audioContext, 0.22, 0.06, 460);
        this.playTone(audioContext, 118, 42, 0.32, "sawtooth", 0, 0.075);
        break;
      case "stage-cleared":
      case "upload-complete": {
        const notes = effect.type === "upload-complete" ? [440, 554, 659, 880] : [392, 494, 659];
        notes.forEach((frequency, index) => this.playTone(audioContext, frequency, frequency * 1.03, 0.2, "sine", index * 0.095, 0.055));
        this.playNoise(audioContext, 0.28, 0.024, 2400, 0.04);
        break;
      }
      case "stage-started":
        this.playNoise(audioContext, 0.12, 0.025, 1800);
        this.playTone(audioContext, 330, 660, 0.16, "triangle", 0, 0.05);
        this.playTone(audioContext, 660, 990, 0.12, "sine", 0.08, 0.04);
        break;
    }
  }

  private playTone(
    audioContext: AudioContext,
    startFrequency: number,
    endFrequency: number,
    duration: number,
    type: OscillatorType,
    delay: number,
    volume: number,
  ): void {
    if (!this.master) return;
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.008, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }

  private playNoise(audioContext: AudioContext, duration: number, volume: number, lowpass: number, delay = 0): void {
    if (!this.master || !this.noiseBuffer) return;
    const start = audioContext.currentTime + delay;
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(lowpass, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
    source.stop(start + duration);
  }

  private createNoiseBuffer(audioContext: AudioContext): AudioBuffer {
    const length = Math.ceil(audioContext.sampleRate * 0.5);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    let noiseState = 0x51c0ffee;
    for (let index = 0; index < length; index += 1) {
      noiseState ^= noiseState << 13;
      noiseState ^= noiseState >>> 17;
      noiseState ^= noiseState << 5;
      data[index] = ((noiseState >>> 0) / 0xffff_ffff) * 2 - 1;
    }
    return buffer;
  }
}
