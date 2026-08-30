import { ARENA, ENEMY, MISSION_TICKS, PLAYER, RELAY } from "../content/balance";
import { HEADQUARTERS } from "../content/level";
import { TICKS_PER_SECOND } from "../core/clock";
import { circlesOverlap, clamp, distanceSquared, normalize } from "../core/math";
import type { EnemyState, GameEffect, GameState, ProjectileState, Vec2 } from "../core/types";
import type { InputFrame } from "../model/commands";
import { createGameState } from "../model/state";

export interface TickResult {
  state: GameState;
  effects: GameEffect[];
}

function decrement(value: number): number {
  return Math.max(0, value - 1);
}

function createProjectile(
  state: GameState,
  owner: ProjectileState["owner"],
  position: Vec2,
  direction: Vec2,
  speed: number,
  damage: number,
): ProjectileState {
  const projectile: ProjectileState = {
    id: state.nextEntityId,
    owner,
    x: position.x,
    y: position.y,
    vx: direction.x * speed,
    vy: direction.y * speed,
    radius: owner === "player" ? 4 : 6,
    damage,
    remainingTicks: owner === "player" ? 80 : 210,
  };
  state.nextEntityId += 1;
  return projectile;
}

function damagePlayer(state: GameState, damage: number, effects: GameEffect[]): void {
  const player = state.player;
  if (player.invulnerableTicks > 0 || player.damageCooldownTicks > 0) return;
  player.health = Math.max(0, player.health - damage);
  player.damageCooldownTicks = 28;
  player.invulnerableTicks = 12;
  effects.push({ type: "hit", x: player.x, y: player.y });
  if (player.health <= 0) state.mode = "lost";
}

function updatePlayer(state: GameState, input: InputFrame, effects: GameEffect[]): void {
  const player = state.player;
  player.shotCooldownTicks = decrement(player.shotCooldownTicks);
  player.dashCooldownTicks = decrement(player.dashCooldownTicks);
  player.dashTicks = decrement(player.dashTicks);
  player.invulnerableTicks = decrement(player.invulnerableTicks);
  player.empCooldownTicks = decrement(player.empCooldownTicks);
  player.empPulseTicks = decrement(player.empPulseTicks);
  player.damageCooldownTicks = decrement(player.damageCooldownTicks);

  const aimDirection = normalize({ x: input.aim.x - player.x, y: input.aim.y - player.y }, {
    x: player.facingX,
    y: player.facingY,
  });
  player.facingX = aimDirection.x;
  player.facingY = aimDirection.y;

  const movement = normalize({ x: clamp(input.moveX, -1, 1), y: clamp(input.moveY, -1, 1) });
  if (input.dashPressed && player.dashCooldownTicks === 0) {
    const dashDirection = movement.x !== 0 || movement.y !== 0 ? movement : aimDirection;
    player.vx = dashDirection.x * PLAYER.dashSpeed;
    player.vy = dashDirection.y * PLAYER.dashSpeed;
    player.dashTicks = PLAYER.dashDurationTicks;
    player.dashCooldownTicks = PLAYER.dashCooldownTicks;
    player.invulnerableTicks = PLAYER.dashDurationTicks + 2;
    effects.push({ type: "dash", x: player.x, y: player.y });
  } else if (player.dashTicks === 0) {
    player.vx = movement.x * PLAYER.speed;
    player.vy = movement.y * PLAYER.speed;
  }

  player.x = clamp(player.x + player.vx / TICKS_PER_SECOND, ARENA.left + player.radius, ARENA.right - player.radius);
  player.y = clamp(player.y + player.vy / TICKS_PER_SECOND, ARENA.top + player.radius, ARENA.bottom - player.radius);

  const relayBoost = state.relay.installed
    && state.relay.linkState === "normal"
    && distanceSquared(player, state.relay) <= RELAY.safeRadius * RELAY.safeRadius;
  if (relayBoost && player.dashCooldownTicks > 0) player.dashCooldownTicks = decrement(player.dashCooldownTicks);
  player.heat = Math.max(0, player.heat - (relayBoost ? PLAYER.relayHeatCoolPerTick : PLAYER.heatCoolPerTick));
  if (player.overheated && player.heat <= 0.35) player.overheated = false;

  if (input.fireHeld && !player.overheated && player.shotCooldownTicks === 0) {
    state.projectiles.push(createProjectile(
      state,
      "player",
      { x: player.x + aimDirection.x * 22, y: player.y + aimDirection.y * 22 },
      aimDirection,
      PLAYER.projectileSpeed,
      PLAYER.projectileDamage,
    ));
    player.shotCooldownTicks = PLAYER.fireCooldownTicks;
    player.heat = Math.min(1, player.heat + PLAYER.heatPerShot);
    if (player.heat >= 1) player.overheated = true;
    effects.push({ type: "shot", x: player.x, y: player.y });
  }

  if (input.empPressed && player.empCooldownTicks === 0) {
    const empRadiusSquared = PLAYER.empRadius * PLAYER.empRadius;
    for (const enemy of state.enemies) {
      if (distanceSquared(player, enemy) > empRadiusSquared) continue;
      const direction = normalize({ x: enemy.x - player.x, y: enemy.y - player.y }, { x: 1, y: 0 });
      enemy.x = clamp(enemy.x + direction.x * 72, ARENA.left + enemy.radius, ARENA.right - enemy.radius);
      enemy.y = clamp(enemy.y + direction.y * 72, ARENA.top + enemy.radius, ARENA.bottom - enemy.radius);
      enemy.health -= 10;
      enemy.telegraphTicks = 0;
      enemy.shotCooldownTicks = Math.max(enemy.shotCooldownTicks, 70);
    }
    state.projectiles = state.projectiles.filter(
      (projectile) => projectile.owner === "player" || distanceSquared(player, projectile) > empRadiusSquared,
    );
    if (state.relay.jammedTicks > 0 && distanceSquared(player, state.relay) <= empRadiusSquared) {
      state.relay.jammedTicks = 0;
      if (state.relay.health > 0) state.relay.linkState = "normal";
    }
    player.empCooldownTicks = PLAYER.empCooldownTicks;
    player.empPulseTicks = 24;
    effects.push({ type: "emp", x: player.x, y: player.y });
  }
}

function beginShooterTelegraph(state: GameState, enemy: EnemyState): void {
  const targetRelay = state.relay.installed && enemy.attacksFired % 2 === 1;
  const target = targetRelay ? state.relay : state.player;
  enemy.targetX = target.x;
  enemy.targetY = target.y;
  enemy.targetKind = targetRelay ? "relay" : "player";
  enemy.telegraphTicks = ENEMY.shooterTelegraphTicks;
}

function updateEnemies(state: GameState, effects: GameEffect[]): void {
  for (const enemy of state.enemies) {
    enemy.contactCooldownTicks = decrement(enemy.contactCooldownTicks);
    enemy.shotCooldownTicks = decrement(enemy.shotCooldownTicks);

    if (enemy.role === "chaser") {
      const direction = normalize({ x: state.player.x - enemy.x, y: state.player.y - enemy.y });
      enemy.vx = direction.x * ENEMY.chaserSpeed;
      enemy.vy = direction.y * ENEMY.chaserSpeed;
      enemy.x = clamp(enemy.x + enemy.vx / TICKS_PER_SECOND, ARENA.left + enemy.radius, ARENA.right - enemy.radius);
      enemy.y = clamp(enemy.y + enemy.vy / TICKS_PER_SECOND, ARENA.top + enemy.radius, ARENA.bottom - enemy.radius);
      if (circlesOverlap(enemy, enemy.radius, state.player, state.player.radius) && enemy.contactCooldownTicks === 0) {
        damagePlayer(state, ENEMY.contactDamage, effects);
        enemy.contactCooldownTicks = 48;
      }
      continue;
    }

    if (enemy.telegraphTicks > 0) {
      enemy.telegraphTicks -= 1;
      if (enemy.telegraphTicks === 0) {
        const direction = normalize({ x: enemy.targetX - enemy.x, y: enemy.targetY - enemy.y }, { x: -1, y: 0 });
        state.projectiles.push(createProjectile(
          state,
          "enemy",
          enemy,
          direction,
          ENEMY.projectileSpeed,
          ENEMY.projectileDamage,
        ));
        enemy.attacksFired += 1;
        enemy.shotCooldownTicks = ENEMY.shooterFireIntervalTicks;
      }
    } else if (enemy.shotCooldownTicks === 0) {
      beginShooterTelegraph(state, enemy);
    }
  }
}

function updateProjectiles(state: GameState, effects: GameEffect[]): void {
  const survivors: ProjectileState[] = [];
  for (const projectile of state.projectiles) {
    projectile.x += projectile.vx / TICKS_PER_SECOND;
    projectile.y += projectile.vy / TICKS_PER_SECOND;
    projectile.remainingTicks -= 1;
    if (
      projectile.remainingTicks <= 0
      || projectile.x < ARENA.left
      || projectile.x > ARENA.right
      || projectile.y < ARENA.top
      || projectile.y > ARENA.bottom
    ) continue;

    let consumed = false;
    if (projectile.owner === "player") {
      for (const enemy of state.enemies) {
        if (!circlesOverlap(projectile, projectile.radius, enemy, enemy.radius)) continue;
        enemy.health -= projectile.damage;
        effects.push({ type: "hit", x: enemy.x, y: enemy.y });
        consumed = true;
        break;
      }
    } else if (circlesOverlap(projectile, projectile.radius, state.player, state.player.radius)) {
      damagePlayer(state, projectile.damage, effects);
      consumed = true;
    } else if (
      state.relay.installed
      && circlesOverlap(projectile, projectile.radius, state.relay, 24)
    ) {
      state.relay.health = Math.max(0, state.relay.health - 25);
      state.relay.jammedTicks = RELAY.jamTicks;
      state.relay.linkState = state.relay.health > 0 ? "jammed" : "disconnected";
      effects.push({ type: state.relay.health > 0 ? "relay-jammed" : "relay-offline", x: state.relay.x, y: state.relay.y });
      consumed = true;
    }
    if (!consumed) survivors.push(projectile);
  }
  state.projectiles = survivors;
  state.enemies = state.enemies.filter((enemy) => enemy.health > 0).sort((a, b) => a.id - b.id);
}

function updateRelayAndMission(state: GameState, input: InputFrame, effects: GameEffect[]): void {
  const relay = state.relay;
  const playerNearRelay = distanceSquared(state.player, relay) <= RELAY.interactionRadius * RELAY.interactionRadius;
  const linkedToHeadquarters = distanceSquared(relay, HEADQUARTERS) <= RELAY.connectionRadius * RELAY.connectionRadius;

  if (!relay.installed) {
    relay.linkState = "disconnected";
    if (playerNearRelay && linkedToHeadquarters && input.interactHeld) {
      relay.installProgressTicks = Math.min(RELAY.installTicks, relay.installProgressTicks + 1);
      if (relay.installProgressTicks === RELAY.installTicks) {
        relay.installed = true;
        relay.linkState = "normal";
        effects.push({ type: "relay-installed", x: relay.x, y: relay.y });
      }
    } else {
      relay.installProgressTicks = Math.max(0, relay.installProgressTicks - 2);
    }
    return;
  }

  if (relay.health <= 0) {
    relay.linkState = "disconnected";
    if (playerNearRelay && input.interactHeld) {
      relay.repairProgressTicks = Math.min(RELAY.repairTicks, relay.repairProgressTicks + 1);
      if (relay.repairProgressTicks === RELAY.repairTicks) {
        relay.health = relay.maxHealth;
        relay.jammedTicks = 0;
        relay.repairProgressTicks = 0;
        relay.linkState = "normal";
        effects.push({ type: "relay-repaired", x: relay.x, y: relay.y });
      }
    } else {
      relay.repairProgressTicks = Math.max(0, relay.repairProgressTicks - 1);
    }
    return;
  }

  relay.jammedTicks = decrement(relay.jammedTicks);
  relay.linkState = relay.jammedTicks > 0 ? "jammed" : "normal";

  if (state.packet.status === "carried" && playerNearRelay && relay.linkState === "normal" && input.interactHeld) {
    relay.uploadProgressTicks = Math.min(RELAY.uploadTicks, relay.uploadProgressTicks + 1);
    if (relay.uploadProgressTicks === RELAY.uploadTicks) {
      state.packet.status = "uploaded";
      state.uploadedPackets = 1;
      state.mode = "won";
      effects.push({ type: "upload-complete", x: relay.x, y: relay.y });
    }
  }
}

function updatePacket(state: GameState, effects: GameEffect[]): void {
  if (
    state.packet.status === "ground"
    && circlesOverlap(state.player, state.player.radius, state.packet, 16)
  ) {
    state.packet.status = "carried";
    effects.push({ type: "packet-picked", x: state.packet.x, y: state.packet.y });
  }
  if (state.packet.status === "carried") {
    state.packet.x = state.player.x;
    state.packet.y = state.player.y - 27;
  }
}

export function stepGame(currentState: GameState, input: InputFrame): TickResult {
  if (input.restartPressed || (currentState.mode === "menu" && input.startPressed)) {
    return { state: createGameState(currentState.seed, "playing"), effects: [] };
  }
  if (input.pausePressed && currentState.mode === "paused") {
    currentState.mode = "playing";
    return { state: currentState, effects: [] };
  }
  if (input.pausePressed && currentState.mode === "playing") {
    currentState.mode = "paused";
    return { state: currentState, effects: [] };
  }
  if (currentState.mode !== "playing") return { state: currentState, effects: [] };

  const effects: GameEffect[] = [];
  currentState.tick += 1;
  currentState.elapsedTicks += 1;
  updatePlayer(currentState, input, effects);
  updateEnemies(currentState, effects);
  if (currentState.mode !== "playing") return { state: currentState, effects };
  updateProjectiles(currentState, effects);
  if (currentState.mode !== "playing") return { state: currentState, effects };
  updatePacket(currentState, effects);
  updateRelayAndMission(currentState, input, effects);

  if (currentState.elapsedTicks >= MISSION_TICKS && currentState.mode === "playing") {
    currentState.mode = "lost";
  }
  return { state: currentState, effects };
}
