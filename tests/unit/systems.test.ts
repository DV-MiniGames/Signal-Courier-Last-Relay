import { describe, expect, it } from "vitest";
import { PLAYER, RELAY } from "../../src/game/content/balance";
import { canonicalHash } from "../../src/game/debug/canonical";
import type { ProjectileState } from "../../src/game/core/types";
import { createGameState } from "../../src/game/model/state";
import { frame, runTicks } from "../helpers";

describe("M1 gameplay systems", () => {
  it("moves, dashes, fires, overheats and uses EMP through InputFrame", () => {
    let state = createGameState(7, "playing");
    state.enemies[0].x = state.player.x + 82;
    state.enemies[0].y = state.player.y;
    state.enemies[1].x = 850;
    state.enemies[1].y = 450;

    const initialX = state.player.x;
    state = runTicks(state, 1, frame({ moveX: 1, dashPressed: true, aim: { x: 900, y: 300 } }));
    expect(state.player.x - initialX).toBeGreaterThan(PLAYER.speed / 60);
    expect(state.player.dashCooldownTicks).toBeGreaterThan(0);

    state = runTicks(state, 48, frame({ fireHeld: true, aim: { x: 900, y: 300 } }));
    expect(state.enemies.some((enemy) => enemy.health < enemy.maxHealth)).toBe(true);
    expect(state.player.heat).toBeGreaterThan(0);

    const nearbyEnemy = state.enemies[0];
    if (nearbyEnemy) {
      nearbyEnemy.x = state.player.x + 50;
      nearbyEnemy.y = state.player.y;
      const beforeEmpX = nearbyEnemy.x;
      state.projectiles.push({
        id: state.nextEntityId++,
        owner: "enemy",
        x: state.player.x + 20,
        y: state.player.y,
        vx: 0,
        vy: 0,
        radius: 6,
        damage: 1,
        remainingTicks: 30,
      });
      state = runTicks(state, 1, frame({ empPressed: true }));
      expect(nearbyEnemy.x).toBeGreaterThan(beforeEmpX);
      expect(state.projectiles.some((projectile) => projectile.owner === "enemy")).toBe(false);
      expect(state.player.empCooldownTicks).toBe(RELAY.repairTicks + 180);
    }

    state.enemies = [];
    state.projectiles = [];
    state.player.heat = 0;
    state.player.overheated = false;
    state.player.shotCooldownTicks = 0;
    state = runTicks(state, 100, frame({ fireHeld: true, aim: { x: 900, y: 300 } }));
    expect(state.player.overheated).toBe(true);
    expect(state.player.heat).toBeGreaterThan(0.35);
  });

  it("exposes actual jammed, disconnected and repaired relay states", () => {
    let state = createGameState(9, "playing");
    state.enemies = [];
    state.relay.installed = true;
    state.relay.linkState = "normal";
    state.player.x = state.relay.x - 40;
    state.player.y = state.relay.y;

    const hitRelay = (): void => {
      const projectile: ProjectileState = {
        id: state.nextEntityId++, owner: "enemy", x: state.relay.x, y: state.relay.y,
        vx: 0, vy: 0, radius: 6, damage: 12, remainingTicks: 10,
      };
      state.projectiles.push(projectile);
      state = runTicks(state, 1, frame());
    };

    hitRelay();
    expect(state.relay.linkState).toBe("jammed");
    expect(state.relay.health).toBe(75);
    hitRelay();
    hitRelay();
    hitRelay();
    expect(state.relay.linkState).toBe("disconnected");
    expect(state.relay.health).toBe(0);

    state = runTicks(state, RELAY.repairTicks + 1, frame({ interactHeld: true }));
    expect(state.relay.health).toBe(RELAY.maxHealth);
    expect(state.relay.linkState).toBe("normal");
  });

  it("produces one canonical hash across ten identical runs", () => {
    const replay = (): string => {
      const state = runTicks(createGameState(0xabc123, "playing"), 360, (tick) => frame({
        moveX: tick < 120 ? 1 : tick < 210 ? 0 : -1,
        moveY: tick >= 120 && tick < 210 ? 1 : 0,
        aim: { x: 820, y: 280 },
        fireHeld: tick % 3 !== 0,
        dashPressed: tick === 10 || tick === 170,
        empPressed: tick === 220,
      }));
      return canonicalHash(state);
    };
    const hashes = Array.from({ length: 10 }, replay);
    expect(new Set(hashes)).toEqual(new Set([hashes[0]]));
  });

  it("does not let a fatal hit become an upload win in the same tick", () => {
    let state = createGameState(12, "playing");
    state.enemies = [];
    state.player.x = state.relay.x;
    state.player.y = state.relay.y;
    state.player.health = 1;
    state.relay.installed = true;
    state.relay.linkState = "normal";
    state.relay.uploadProgressTicks = RELAY.uploadTicks - 1;
    state.packet.status = "carried";
    state.projectiles.push({
      id: state.nextEntityId++,
      owner: "enemy",
      x: state.player.x,
      y: state.player.y,
      vx: 0,
      vy: 0,
      radius: 6,
      damage: 12,
      remainingTicks: 10,
    });

    state = runTicks(state, 1, frame({ interactHeld: true }));

    expect(state.mode).toBe("lost");
    expect(state.uploadedPackets).toBe(0);
    expect(state.packet.status).toBe("carried");
  });
});
