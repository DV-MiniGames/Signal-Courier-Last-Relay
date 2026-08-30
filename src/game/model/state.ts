import { ENEMY, PLAYER, RELAY } from "../content/balance";
import { getLevelDefinition } from "../content/level";
import { normalizeSeed, randomRange } from "../core/rng";
import type { EnemyState, GameMode, GameState } from "../core/types";

function createEnemy(
  id: number,
  role: EnemyState["role"],
  x: number,
  y: number,
  shotCooldownTicks: number,
  targetX: number,
  targetY: number,
): EnemyState {
  const radius = role === "chaser" ? ENEMY.chaserRadius : ENEMY.shooterRadius;
  const maxHealth = role === "chaser" ? 58 : 72;
  return {
    id,
    role,
    x,
    y,
    vx: 0,
    vy: 0,
    radius,
    health: maxHealth,
    maxHealth,
    contactCooldownTicks: 0,
    shotCooldownTicks,
    telegraphTicks: 0,
    attacksFired: 0,
    targetX,
    targetY,
    targetKind: "player",
  };
}

export function createGameState(
  seed = 0x51c0ffee,
  mode: GameMode = "menu",
  levelIndex = 0,
  score = 0,
  totalKills = 0,
  health: number = PLAYER.maxHealth,
): GameState {
  const level = getLevelDefinition(levelIndex);
  let rngState = normalizeSeed(seed);
  const enemies = level.enemySpawns.map((spawn, index) => {
    const offsetX = randomRange(rngState, -10, 10);
    rngState = offsetX.state;
    const offsetY = randomRange(rngState, -10, 10);
    rngState = offsetY.state;
    return createEnemy(
      index + 2,
      spawn.role,
      spawn.x + offsetX.value,
      spawn.y + offsetY.value,
      spawn.shotCooldownTicks ?? 0,
      level.headquarters.x,
      level.headquarters.y,
    );
  });

  return {
    schemaVersion: 1,
    mode,
    seed: normalizeSeed(seed),
    rngState,
    tick: 0,
    elapsedTicks: 0,
    levelIndex,
    score,
    stageKills: 0,
    totalKills,
    lastStageScore: 0,
    nextEntityId: enemies.length + 2,
    player: {
      x: level.headquarters.x,
      y: level.headquarters.y,
      vx: 0,
      vy: 0,
      facingX: 1,
      facingY: 0,
      radius: PLAYER.radius,
      health,
      maxHealth: PLAYER.maxHealth,
      heat: 0,
      overheated: false,
      shotCooldownTicks: 0,
      dashCooldownTicks: 0,
      dashTicks: 0,
      invulnerableTicks: 0,
      empCooldownTicks: 0,
      empPulseTicks: 0,
      damageCooldownTicks: 0,
    },
    relay: {
      id: 1,
      socketId: 1,
      ...level.relaySocket,
      installed: false,
      health: RELAY.maxHealth,
      maxHealth: RELAY.maxHealth,
      linkState: "disconnected",
      jammedTicks: 0,
      installProgressTicks: 0,
      repairProgressTicks: 0,
      uploadProgressTicks: 0,
    },
    packet: {
      id: 1,
      ...level.packetLocation,
      status: "ground",
    },
    enemies,
    projectiles: [],
    visualEffects: [],
    uploadedPackets: 0,
  };
}

export function createNextLevelState(currentState: GameState): GameState {
  const next = createGameState(
    currentState.seed,
    "playing",
    currentState.levelIndex + 1,
    currentState.score,
    currentState.totalKills,
    Math.min(PLAYER.maxHealth, currentState.player.health + 24),
  );
  next.tick = currentState.tick;
  return next;
}
