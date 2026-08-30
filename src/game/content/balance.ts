export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;
export const ARENA = { left: 42, top: 92, right: 918, bottom: 506 } as const;

export const PLAYER = {
  radius: 15,
  speed: 190,
  dashSpeed: 570,
  dashDurationTicks: 10,
  dashCooldownTicks: 96,
  maxHealth: 100,
  fireCooldownTicks: 9,
  projectileSpeed: 610,
  projectileDamage: 26,
  heatPerShot: 0.17,
  heatCoolPerTick: 0.008,
  relayHeatCoolPerTick: 0.015,
  empRadius: 132,
  empCooldownTicks: 300,
} as const;

export const RELAY = {
  interactionRadius: 48,
  connectionRadius: 330,
  safeRadius: 116,
  installTicks: 60,
  uploadTicks: 180,
  repairTicks: 120,
  maxHealth: 100,
  jamTicks: 90,
} as const;

export const ENEMY = {
  chaserSpeed: 74,
  chaserRadius: 18,
  shooterRadius: 20,
  shooterFireIntervalTicks: 118,
  shooterTelegraphTicks: 38,
  projectileSpeed: 172,
  contactDamage: 14,
  projectileDamage: 12,
} as const;
