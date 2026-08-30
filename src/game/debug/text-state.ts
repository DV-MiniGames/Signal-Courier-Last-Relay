import { MISSION_TICKS, PLAYER, RELAY } from "../content/balance";
import { canonicalHash } from "./canonical";
import type { GameState } from "../core/types";

function rounded(value: number): number {
  return Number(value.toFixed(1));
}

export function renderTextState(state: Readonly<GameState>): string {
  const remainingTicks = Math.max(0, MISSION_TICKS - state.elapsedTicks);
  return JSON.stringify({
    schemaVersion: state.schemaVersion,
    coordinateSystem: "origin=(0,0) top-left; +x right; +y down; logicalCanvas=960x540",
    mode: state.mode,
    seed: state.seed,
    tick: state.tick,
    canonicalHash: canonicalHash(state as GameState),
    player: {
      x: rounded(state.player.x),
      y: rounded(state.player.y),
      health: state.player.health,
      maxHealth: state.player.maxHealth,
      facing: { x: rounded(state.player.facingX), y: rounded(state.player.facingY) },
      dash: {
        ready: state.player.dashCooldownTicks === 0,
        cooldownSeconds: rounded(state.player.dashCooldownTicks / 60),
        active: state.player.dashTicks > 0,
      },
      weapon: {
        heat: rounded(state.player.heat),
        overheated: state.player.overheated,
      },
      emp: {
        ready: state.player.empCooldownTicks === 0,
        cooldownSeconds: rounded(state.player.empCooldownTicks / 60),
        radius: PLAYER.empRadius,
      },
    },
    mission: {
      timeRemainingSeconds: rounded(remainingTicks / 60),
      carryingPacket: state.packet.status === "carried",
      uploadedPackets: state.uploadedPackets,
      targetPackets: 1,
      extractionAvailable: state.uploadedPackets >= 1,
    },
    packet: {
      id: state.packet.id,
      status: state.packet.status,
      x: rounded(state.packet.x),
      y: rounded(state.packet.y),
    },
    relay: {
      id: state.relay.id,
      socketId: state.relay.socketId,
      x: state.relay.x,
      y: state.relay.y,
      installed: state.relay.installed,
      health: state.relay.health,
      maxHealth: state.relay.maxHealth,
      linkState: state.relay.linkState,
      installProgress: rounded(state.relay.installProgressTicks / RELAY.installTicks),
      repairProgress: rounded(state.relay.repairProgressTicks / RELAY.repairTicks),
      uploadProgress: rounded(state.relay.uploadProgressTicks / RELAY.uploadTicks),
      safeRadius: RELAY.safeRadius,
    },
    enemies: state.enemies.map((enemy) => ({
      id: enemy.id,
      role: enemy.role,
      x: rounded(enemy.x),
      y: rounded(enemy.y),
      health: enemy.health,
      telegraphing: enemy.telegraphTicks > 0,
      targetKind: enemy.telegraphTicks > 0 ? enemy.targetKind : null,
    })),
    projectiles: {
      player: state.projectiles.filter((projectile) => projectile.owner === "player").length,
      enemy: state.projectiles.filter((projectile) => projectile.owner === "enemy").length,
    },
    controls: "WASD/arrows move; mouse aim; left fire; Space dash; right EMP; hold E install/upload/repair; P pause; R restart; F fullscreen; Escape exit fullscreen",
  });
}
