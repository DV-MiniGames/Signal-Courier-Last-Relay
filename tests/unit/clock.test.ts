import { describe, expect, it } from "vitest";
import { FixedStepClock, STEP_MS } from "../../src/game/core/clock";

describe("FixedStepClock", () => {
  it("preserves fractional time and advances zero ticks for 0ms", () => {
    const clock = new FixedStepClock();
    let ticks = 0;
    expect(clock.advance(0, () => ticks += 1).steps).toBe(0);
    expect(ticks).toBe(0);
    expect(clock.advance(STEP_MS / 2, () => ticks += 1).steps).toBe(0);
    expect(clock.advance(STEP_MS / 2, () => ticks += 1).steps).toBe(1);
    expect(ticks).toBe(1);
  });

  it("uses the same callback for several complete fixed steps", () => {
    const clock = new FixedStepClock();
    let ticks = 0;
    const result = clock.advance(STEP_MS * 4 + STEP_MS / 3, () => ticks += 1);
    expect(result.steps).toBe(4);
    expect(ticks).toBe(4);
    expect(result.alpha).toBeCloseTo(1 / 3, 8);
  });
});
