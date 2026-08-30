import { FixedStepClock } from "./core/clock";
import type { GameEffect, GameState } from "./core/types";
import type { InputFrame } from "./model/commands";
import { createGameState } from "./model/state";
import { stepGame } from "./systems/simulation";

export interface InputSource {
  readFrame(): InputFrame;
}

export type EffectSink = (effects: readonly GameEffect[]) => void;

export class GameRuntime {
  private state: GameState;
  private readonly clock = new FixedStepClock();
  private automationMode = false;

  constructor(
    seed: number,
    private readonly input: InputSource,
    private readonly effectSink: EffectSink = () => undefined,
  ) {
    this.state = createGameState(seed, "menu");
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  isAutomationMode(): boolean {
    return this.automationMode;
  }

  resetClock(): void {
    this.clock.reset();
  }

  advanceRealTime(milliseconds: number): { droppedMilliseconds: number; alpha: number } {
    if (this.automationMode) return { droppedMilliseconds: 0, alpha: 0 };
    const result = this.clock.advance(milliseconds, () => this.tick(), 5);
    return { droppedMilliseconds: result.droppedMilliseconds, alpha: result.alpha };
  }

  advanceAutomation(milliseconds: number): number {
    if (!this.automationMode) {
      this.automationMode = true;
      this.clock.reset();
    }
    const result = this.clock.advance(milliseconds, () => this.tick());
    return result.steps;
  }

  private tick(): void {
    const result = stepGame(this.state, this.input.readFrame());
    this.state = result.state;
    if (result.effects.length > 0) this.effectSink(result.effects);
  }
}
