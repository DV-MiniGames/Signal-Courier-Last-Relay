export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GameMode = "menu" | "playing" | "paused" | "won" | "lost";
export type EnemyRole = "chaser" | "shooter";
export type LinkState = "normal" | "jammed" | "disconnected";
export type PacketStatus = "ground" | "carried" | "uploaded";

export interface PlayerState extends Vec2 {
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  radius: number;
  health: number;
  maxHealth: number;
  heat: number;
  overheated: boolean;
  shotCooldownTicks: number;
  dashCooldownTicks: number;
  dashTicks: number;
  invulnerableTicks: number;
  empCooldownTicks: number;
  empPulseTicks: number;
  damageCooldownTicks: number;
}

export interface EnemyState extends Vec2 {
  id: number;
  role: EnemyRole;
  vx: number;
  vy: number;
  radius: number;
  health: number;
  maxHealth: number;
  contactCooldownTicks: number;
  shotCooldownTicks: number;
  telegraphTicks: number;
  attacksFired: number;
  targetX: number;
  targetY: number;
  targetKind: "player" | "relay";
}

export interface ProjectileState extends Vec2 {
  id: number;
  owner: "player" | "enemy";
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  remainingTicks: number;
}

export interface RelayState extends Vec2 {
  id: number;
  socketId: number;
  installed: boolean;
  health: number;
  maxHealth: number;
  linkState: LinkState;
  jammedTicks: number;
  installProgressTicks: number;
  repairProgressTicks: number;
  uploadProgressTicks: number;
}

export interface PacketState extends Vec2 {
  id: number;
  status: PacketStatus;
}

export type GameEffectType =
  | "dash"
  | "shot"
  | "emp"
  | "hit"
  | "packet-picked"
  | "relay-installed"
  | "relay-jammed"
  | "relay-offline"
  | "relay-repaired"
  | "upload-complete";

export interface GameEffect extends Vec2 {
  type: GameEffectType;
}

export interface GameState {
  schemaVersion: 1;
  mode: GameMode;
  seed: number;
  rngState: number;
  tick: number;
  elapsedTicks: number;
  nextEntityId: number;
  player: PlayerState;
  relay: RelayState;
  packet: PacketState;
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  uploadedPackets: number;
}
