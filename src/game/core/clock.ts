export const TICKS_PER_SECOND = 60;
export const STEP_MS = 1000 / TICKS_PER_SECOND;

export interface AdvanceResult {
  steps: number;
  droppedMilliseconds: number;
  alpha: number;
}

export class FixedStepClock {
  private remainderMilliseconds = 0;

  reset(): void {
    this.remainderMilliseconds = 0;
  }

  advance(milliseconds: number, step: () => void, maximumSteps = Number.POSITIVE_INFINITY): AdvanceResult {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new RangeError("Time advance must be a finite non-negative number.");
    }

    this.remainderMilliseconds += milliseconds;
    const availableSteps = Math.floor((this.remainderMilliseconds + 1e-9) / STEP_MS);
    const steps = Math.min(availableSteps, maximumSteps);
    for (let index = 0; index < steps; index += 1) step();
    this.remainderMilliseconds -= steps * STEP_MS;

    let droppedMilliseconds = 0;
    if (availableSteps > maximumSteps) {
      const droppedSteps = availableSteps - maximumSteps;
      droppedMilliseconds = droppedSteps * STEP_MS;
      this.remainderMilliseconds -= droppedMilliseconds;
    }

    if (Math.abs(this.remainderMilliseconds) < 1e-9) this.remainderMilliseconds = 0;
    return {
      steps,
      droppedMilliseconds,
      alpha: this.remainderMilliseconds / STEP_MS,
    };
  }
}
