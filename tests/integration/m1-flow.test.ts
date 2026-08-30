import { describe, expect, it } from "vitest";
import { MISSION_TICKS, RELAY } from "../../src/game/content/balance";
import { createGameState } from "../../src/game/model/state";
import { frame, runTicks } from "../helpers";

describe("M1 two-minute vertical slice", () => {
  it("completes move, relay install, packet pickup and upload in one pure Node simulation", () => {
    let state = createGameState(20260830, "playing");
    state.enemies = [];
    state = runTicks(state, 91, frame({ moveX: 1, aim: { x: 900, y: 300 } }));
    state = runTicks(state, RELAY.installTicks, frame({ interactHeld: true }));
    expect(state.relay.installed).toBe(true);
    expect(state.relay.linkState).toBe("normal");

    state = runTicks(state, 122, frame({ moveX: 1, aim: { x: 900, y: 224 } }));
    state = runTicks(state, 24, frame({ moveY: -1, aim: { x: 900, y: 224 } }));
    expect(state.packet.status).toBe("carried");

    state = runTicks(state, 122, frame({ moveX: -1, aim: { x: 100, y: 300 } }));
    state = runTicks(state, 24, frame({ moveY: 1, aim: { x: 100, y: 300 } }));
    state = runTicks(state, RELAY.uploadTicks, frame({ interactHeld: true }));
    expect(state.mode).toBe("won");
    expect(state.packet.status).toBe("uploaded");
    expect(state.uploadedPackets).toBe(1);
    expect(state.elapsedTicks).toBeLessThan(MISSION_TICKS);
  });

  it("loses exactly at the two-minute hard cap", () => {
    const initial = createGameState(11, "playing");
    initial.enemies = [];
    const state = runTicks(initial, MISSION_TICKS, frame());
    expect(state.mode).toBe("lost");
    expect(state.elapsedTicks).toBe(MISSION_TICKS);
  });
});
