import { ARENA, ENEMY, PLAYER, RELAY } from "../content/balance";
import { getLevelDefinition, LEVEL_COUNT } from "../content/level";
import { TICKS_PER_SECOND } from "../core/clock";
import { circleIntersectsRect, circlesOverlap, clamp, distanceSquared, normalize } from "../core/math";
import type { EnemyState, GameEffect, GameState, ProjectileState, Rect, Vec2, VisualEffectKind } from "../core/types";
import type { InputFrame } from "../model/commands";
import { createGameState, createNextLevelState } from "../model/state";

export interface TickResult {
  state: GameState;
  effects: GameEffect[];
}

function decrement(value: number): number {
  return Math.max(0, value - 1);
}

function moveCircle(position: Vec2, velocity: Vec2, radius: number, blocks: readonly Rect[]): Vec2 {
  const next = { ...position };
  const nextX = clamp(position.x + velocity.x / TICKS_PER_SECOND, ARENA.left + radius, ARENA.right - radius);
  if (!blocks.some((block) => circleIntersectsRect({ x: nextX, y: next.y }, radius, block))) next.x = nextX;
  const nextY = clamp(position.y + velocity.y / TICKS_PER_SECOND, ARENA.top + radius, ARENA.bottom - radius);
  if (!blocks.some((block) => circleIntersectsRect({ x: next.x, y: nextY }, radius, block))) next.y = nextY;
  return next;
}

const VISUAL_EFFECTS: Partial<Record<GameEffect["type"], readonly [VisualEffectKind, number]>> = {
  dash: ["dash", 18],
  shot: ["muzzle", 8],
  emp: ["emp", 28],
  "enemy-hit": ["impact", 14],
  "enemy-destroyed": ["enemy-destroyed", 30],
  "player-hit": ["player-hit", 24],
  "relay-installed": ["relay-burst", 32],
  "relay-jammed": ["relay-burst", 22],
  "relay-offline": ["relay-burst", 34],
  "relay-repaired": ["relay-burst", 32],
  "stage-cleared": ["upload-burst", 50],
  "upload-complete": ["upload-burst", 60],
};

function updateVisualEffects(state: GameState): void {
  for (const effect of state.visualEffects) effect.ageTicks += 1;
  state.visualEffects = state.visualEffects.filter((effect) => effect.ageTicks < effect.durationTicks);
}

function finishTick(state: GameState, effects: GameEffect[]): TickResult {
  for (const effect of effects) {
    const visual = VISUAL_EFFECTS[effect.type];
    if (!visual) continue;
    state.visualEffects.push({
      id: state.nextEntityId++,
      kind: visual[0],
      x: effect.x,
      y: effect.y,
      ageTicks: 0,
      durationTicks: visual[1],
    });
  }
  return { state, effects };
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
  effects.push({ type: "player-hit", x: player.x, y: player.y });
  if (player.health <= 0) state.mode = "lost";
}

function updatePlayer(state: GameState, input: InputFrame, effects: GameEffect[]): void {
  const player = state.player;
  const level = getLevelDefinition(state.levelIndex);
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

  const movedPlayer = moveCircle(player, { x: player.vx, y: player.vy }, player.radius, level.cityBlocks);
  player.x = movedPlayer.x;
  player.y = movedPlayer.y;

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
  const level = getLevelDefinition(state.levelIndex);
  const targetRelay = state.relay.installed && enemy.attacksFired % 2 === 1;
  const target = targetRelay ? state.relay : state.player;
  enemy.targetX = target.x;
  enemy.targetY = target.y;
  enemy.targetKind = targetRelay ? "relay" : "player";
  enemy.telegraphTicks = Math.max(18, Math.round(ENEMY.shooterTelegraphTicks / level.enemyFireRateMultiplier));
}

function updateEnemies(state: GameState, effects: GameEffect[]): void {
  const level = getLevelDefinition(state.levelIndex);
  for (const enemy of state.enemies) {
    enemy.contactCooldownTicks = decrement(enemy.contactCooldownTicks);
    enemy.shotCooldownTicks = decrement(enemy.shotCooldownTicks);

    if (enemy.role === "chaser") {
      const direction = normalize({ x: state.player.x - enemy.x, y: state.player.y - enemy.y });
      enemy.vx = direction.x * ENEMY.chaserSpeed * level.enemySpeedMultiplier;
      enemy.vy = direction.y * ENEMY.chaserSpeed * level.enemySpeedMultiplier;
      const movedEnemy = moveCircle(enemy, { x: enemy.vx, y: enemy.vy }, enemy.radius, level.cityBlocks);
      enemy.x = movedEnemy.x;
      enemy.y = movedEnemy.y;
      if (circlesOverlap(enemy, enemy.radius, state.player, state.player.radius) && enemy.contactCooldownTicks === 0) {
        damagePlayer(state, Math.round(ENEMY.contactDamage * level.enemyDamageMultiplier), effects);
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
          ENEMY.projectileSpeed * (1 + state.levelIndex * 0.08),
          Math.round(ENEMY.projectileDamage * level.enemyDamageMultiplier),
        ));
        enemy.attacksFired += 1;
        enemy.shotCooldownTicks = Math.round(ENEMY.shooterFireIntervalTicks / level.enemyFireRateMultiplier);
      }
    } else if (enemy.shotCooldownTicks === 0) {
      beginShooterTelegraph(state, enemy);
    }
  }
}

function updateProjectiles(state: GameState, effects: GameEffect[]): void {
  const level = getLevelDefinition(state.levelIndex);
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
      || level.cityBlocks.some((block) => circleIntersectsRect(projectile, projectile.radius, block))
    ) continue;

    let consumed = false;
    if (projectile.owner === "player") {
      for (const enemy of state.enemies) {
        if (!circlesOverlap(projectile, projectile.radius, enemy, enemy.radius)) continue;
        enemy.health -= projectile.damage;
        effects.push({ type: "enemy-hit", x: enemy.x, y: enemy.y });
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
      state.relay.health = Math.max(0, state.relay.health - level.relayDamage);
      state.relay.jammedTicks = RELAY.jamTicks;
      state.relay.linkState = state.relay.health > 0 ? "jammed" : "disconnected";
      effects.push({ type: state.relay.health > 0 ? "relay-jammed" : "relay-offline", x: state.relay.x, y: state.relay.y });
      consumed = true;
    }
    if (!consumed) survivors.push(projectile);
  }
  state.projectiles = survivors;
  const defeated = state.enemies.filter((enemy) => enemy.health <= 0);
  for (const enemy of defeated) {
    state.stageKills += 1;
    state.totalKills += 1;
    state.score += 100 + state.levelIndex * 25;
    effects.push({ type: "enemy-destroyed", x: enemy.x, y: enemy.y });
  }
  state.enemies = state.enemies.filter((enemy) => enemy.health > 0).sort((a, b) => a.id - b.id);
}

function updateRelayAndMission(state: GameState, input: InputFrame, effects: GameEffect[]): void {
  const level = getLevelDefinition(state.levelIndex);
  const relay = state.relay;
  const playerNearRelay = distanceSquared(state.player, relay) <= RELAY.interactionRadius * RELAY.interactionRadius;
  const linkedToHeadquarters = distanceSquared(relay, level.headquarters) <= RELAY.connectionRadius * RELAY.connectionRadius;

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

  const killGateOpen = state.stageKills >= level.requiredKills;
  if (state.packet.status === "carried" && playerNearRelay && relay.linkState === "normal" && killGateOpen && input.interactHeld) {
    relay.uploadProgressTicks = Math.min(RELAY.uploadTicks, relay.uploadProgressTicks + 1);
    if (relay.uploadProgressTicks === RELAY.uploadTicks) {
      state.packet.status = "uploaded";
      state.uploadedPackets = 1;
      const remainingTicks = Math.max(0, level.missionSeconds * TICKS_PER_SECOND - state.elapsedTicks);
      state.lastStageScore = 1000 + Math.ceil(remainingTicks / TICKS_PER_SECOND) * 10 + state.levelIndex * 300;
      state.score += state.lastStageScore;
      const finalLevel = state.levelIndex >= LEVEL_COUNT - 1;
      state.mode = finalLevel ? "won" : "stage-cleared";
      effects.push({ type: finalLevel ? "upload-complete" : "stage-cleared", x: relay.x, y: relay.y });
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
  if (currentState.mode === "stage-cleared" && input.startPressed) {
    const nextState = createNextLevelState(currentState);
    return {
      state: nextState,
      effects: [{ type: "stage-started", x: nextState.player.x, y: nextState.player.y }],
    };
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
  const level = getLevelDefinition(currentState.levelIndex);
  updateVisualEffects(currentState);
  currentState.tick += 1;
  currentState.elapsedTicks += 1;
  updatePlayer(currentState, input, effects);
  updateEnemies(currentState, effects);
  if (currentState.mode !== "playing") return finishTick(currentState, effects);
  updateProjectiles(currentState, effects);
  if (currentState.mode !== "playing") return finishTick(currentState, effects);
  updatePacket(currentState, effects);
  updateRelayAndMission(currentState, input, effects);

  if (currentState.elapsedTicks >= level.missionSeconds * TICKS_PER_SECOND && currentState.mode === "playing") {
    currentState.mode = "lost";
  }
  return finishTick(currentState, effects);
}
