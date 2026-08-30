import type { GameState } from "../src/game/core/types";
import type { InputFrame } from "../src/game/model/commands";
import { neutralInput } from "../src/game/model/commands";
import { stepGame } from "../src/game/systems/simulation";

export function runTicks(state: GameState, count: number, input: InputFrame | ((tick: number) => InputFrame)): GameState {
  let current = state;
  for (let tick = 0; tick < count; tick += 1) {
    const frame = typeof input === "function" ? input(tick) : input;
    current = stepGame(current, frame).state;
  }
  return current;
}

export function frame(overrides: Partial<InputFrame> = {}): InputFrame {
  return { ...neutralInput(), ...overrides };
}
