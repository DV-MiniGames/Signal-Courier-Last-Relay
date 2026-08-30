import { ENEMY, PLAYER, RELAY } from "../content/balance";
import { HEADQUARTERS, PACKET_LOCATION, RELAY_SOCKET } from "../content/level";
import { normalizeSeed, randomRange } from "../core/rng";
import type { EnemyState, GameMode, GameState } from "../core/types";

function createEnemy(
  id: number,
  role: EnemyState["role"],
  x: number,
  y: number,
  shotCooldownTicks: number,
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
    targetX: HEADQUARTERS.x,
    targetY: HEADQUARTERS.y,
    targetKind: "player",
  };
}

export function createGameState(seed = 0x51c0ffee, mode: GameMode = "menu"): GameState {
  let rngState = normalizeSeed(seed);
  const chaserOffset = randomRange(rngState, -24, 24);
  rngState = chaserOffset.state;
  const shooterOffset = randomRange(rngState, -18, 18);
  rngState = shooterOffset.state;

  return {
    schemaVersion: 1,
    mode,
    seed: normalizeSeed(seed),
    rngState,
    tick: 0,
    elapsedTicks: 0,
    nextEntityId: 5,
    player: {
      x: HEADQUARTERS.x,
      y: HEADQUARTERS.y,
      vx: 0,
      vy: 0,
      facingX: 1,
      facingY: 0,
      radius: PLAYER.radius,
      health: PLAYER.maxHealth,
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
      ...RELAY_SOCKET,
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
      ...PACKET_LOCATION,
      status: "ground",
    },
    enemies: [
      createEnemy(2, "chaser", 610, 272 + chaserOffset.value, 0),
      createEnemy(3, "shooter", 822, 414 + shooterOffset.value, 72),
    ],
    projectiles: [],
    uploadedPackets: 0,
  };
}
