import { PLAYER, RELAY } from "../content/balance";
import { getLevelDefinition, LEVEL_COUNT } from "../content/level";
import { TICKS_PER_SECOND } from "../core/clock";
import { canonicalHash } from "./canonical";
import type { GameState } from "../core/types";

function rounded(value: number): number {
  return Number(value.toFixed(1));
}

export function renderTextState(state: Readonly<GameState>): string {
  const level = getLevelDefinition(state.levelIndex);
  const remainingTicks = Math.max(0, level.missionSeconds * TICKS_PER_SECOND - state.elapsedTicks);
  return JSON.stringify({
    schemaVersion: state.schemaVersion,
    coordinateSystem: "origin=(0,0) top-left; +x right; +y down; logicalCanvas=960x540",
    mode: state.mode,
    seed: state.seed,
    tick: state.tick,
    canonicalHash: canonicalHash(state as GameState),
    run: {
      level: state.levelIndex + 1,
      levelCount: LEVEL_COUNT,
      levelId: level.id,
      levelName: level.name,
      difficulty: level.difficulty,
      score: state.score,
      stageKills: state.stageKills,
      requiredKills: level.requiredKills,
      totalKills: state.totalKills,
      lastStageScore: state.lastStageScore,
    },
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
      killGateOpen: state.stageKills >= level.requiredKills,
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
    obstacles: level.cityBlocks.map((block) => ({
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
    })),
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
    visualEffects: state.visualEffects.map((effect) => ({
      kind: effect.kind,
      x: rounded(effect.x),
      y: rounded(effect.y),
      progress: rounded(effect.ageTicks / effect.durationTicks),
    })),
    controls: "WASD/arrows move; mouse aim; left fire; Space dash; right EMP; hold E install/upload/repair; P pause; R restart; F fullscreen; Escape exit fullscreen",
  });
}
