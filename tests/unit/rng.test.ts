import { describe, expect, it } from "vitest";
import { nextRandom } from "../../src/game/core/rng";

describe("seeded RNG", () => {
  it("replays the same uint32 sequence for the same seed", () => {
    const sequence = (seed: number): number[] => {
      let state = seed;
      return Array.from({ length: 12 }, () => {
        const next = nextRandom(state);
        state = next.state;
        return state;
      });
    };
    expect(sequence(20260830)).toEqual(sequence(20260830));
    expect(sequence(20260830)).not.toEqual(sequence(20260831));
  });
});
