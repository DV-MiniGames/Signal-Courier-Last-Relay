import { describe, expect, it } from "vitest";
import { RELAY } from "../../src/game/content/balance";
import { LEVELS } from "../../src/game/content/level";
import { circleIntersectsRect } from "../../src/game/core/math";
import { createGameState } from "../../src/game/model/state";
import { stepGame } from "../../src/game/systems/simulation";
import { frame, runTicks } from "../helpers";

describe("three-sector progression", () => {
  it("raises pressure monotonically across the three hand-authored sectors", () => {
    expect(LEVELS).toHaveLength(3);
    for (let index = 1; index < LEVELS.length; index += 1) {
      const previous = LEVELS[index - 1];
      const current = LEVELS[index];
      expect(current.missionSeconds).toBeLessThan(previous.missionSeconds);
      expect(current.enemySpawns.length).toBeGreaterThan(previous.enemySpawns.length);
      expect(current.requiredKills).toBeGreaterThan(previous.requiredKills);
      expect(current.enemySpeedMultiplier).toBeGreaterThan(previous.enemySpeedMultiplier);
      expect(current.enemyFireRateMultiplier).toBeGreaterThan(previous.enemyFireRateMultiplier);
      expect(current.enemyDamageMultiplier).toBeGreaterThan(previous.enemyDamageMultiplier);
    }
    expect(new Set(LEVELS.map((level) => JSON.stringify({
      headquarters: level.headquarters,
      relay: level.relaySocket,
      packet: level.packetLocation,
      blocks: level.cityBlocks,
    }))).size).toBe(3);
  });

  it("requires all three sector uploads before the final win and carries score forward", () => {
    let state = createGameState(20260830, "playing");
    let previousScore = 0;

    for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
      const level = LEVELS[levelIndex];
      state.enemies = [];
      state.stageKills = level.requiredKills;
      state.player.x = state.relay.x;
      state.player.y = state.relay.y;
      state.relay.installed = true;
      state.relay.linkState = "normal";
      state.packet.status = "carried";
      state = runTicks(state, RELAY.uploadTicks, frame({ interactHeld: true }));

      expect(state.score).toBeGreaterThan(previousScore);
      previousScore = state.score;
      if (levelIndex < LEVELS.length - 1) {
        expect(state.mode).toBe("stage-cleared");
        const transition = stepGame(state, frame({ startPressed: true }));
        expect(transition.effects.map((effect) => effect.type)).toContain("stage-started");
        state = transition.state;
        expect(state.mode).toBe("playing");
        expect(state.levelIndex).toBe(levelIndex + 1);
      } else {
        expect(state.mode).toBe("won");
      }
    }
  });

  it("uses city blocks as movement and projectile cover", () => {
    let state = createGameState(44, "playing", 1);
    state.enemies = [];
    const block = LEVELS[1].cityBlocks[1];
    state.player.x = block.x - state.player.radius - 2;
    state.player.y = block.y + block.height / 2;
    state = runTicks(state, 45, frame({ moveX: 1 }));
    expect(state.player.x).toBeLessThanOrEqual(block.x - state.player.radius);

    state.projectiles.push({
      id: state.nextEntityId++,
      owner: "player",
      x: block.x - 20,
      y: block.y + block.height / 2,
      vx: 610,
      vy: 0,
      radius: 4,
      damage: 1,
      remainingTicks: 20,
    });
    state = runTicks(state, 4, frame());
    expect(state.projectiles).toHaveLength(0);
  });

  it("keeps every objective and seeded enemy spawn clear of blocking geometry", () => {
    for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
      const level = LEVELS[levelIndex];
      const state = createGameState(20260830, "playing", levelIndex);
      const circles = [
        { label: "headquarters", point: level.headquarters, radius: 22 },
        { label: "relay", point: level.relaySocket, radius: 24 },
        { label: "packet", point: level.packetLocation, radius: 16 },
        ...state.enemies.map((enemy) => ({ label: `enemy-${enemy.id}`, point: enemy, radius: enemy.radius })),
      ];

      for (const circle of circles) {
        expect(
          level.cityBlocks.some((block) => circleIntersectsRect(circle.point, circle.radius, block)),
          `${level.id}:${circle.label} overlaps a city block`,
        ).toBe(false);
      }
    }
  });

  it("creates deterministic combat feedback and expires it on schedule", () => {
    let state = createGameState(9, "playing");
    state.enemies = [];
    state = stepGame(state, frame({ moveX: 1, dashPressed: true })).state;
    const dash = state.visualEffects.find((effect) => effect.kind === "dash");
    expect(dash).toBeDefined();
    state = runTicks(state, dash?.durationTicks ?? 0, frame());
    expect(state.visualEffects.some((effect) => effect.kind === "dash")).toBe(false);
  });
});
