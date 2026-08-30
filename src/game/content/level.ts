import type { EnemyRole, Rect, Vec2 } from "../core/types";

export interface EnemySpawn extends Vec2 {
  role: EnemyRole;
  shotCooldownTicks?: number;
}

export interface LevelDefinition {
  id: string;
  name: string;
  signal: string;
  difficulty: string;
  accent: string;
  missionSeconds: number;
  headquarters: Vec2;
  relaySocket: Vec2;
  packetLocation: Vec2;
  cityBlocks: readonly Rect[];
  roadMarks: readonly Rect[];
  enemySpawns: readonly EnemySpawn[];
  requiredKills: number;
  enemySpeedMultiplier: number;
  enemyFireRateMultiplier: number;
  enemyDamageMultiplier: number;
  relayDamage: number;
}

export const LEVELS: readonly LevelDefinition[] = [
  {
    id: "outer-link",
    name: "외곽 회선",
    signal: "SIGNAL I",
    difficulty: "탐색",
    accent: "#28F2D3",
    missionSeconds: 105,
    headquarters: { x: 128, y: 300 },
    relaySocket: { x: 416, y: 300 },
    packetLocation: { x: 802, y: 224 },
    cityBlocks: [
      { x: 58, y: 112, width: 176, height: 90 },
      { x: 282, y: 112, width: 142, height: 70 },
      { x: 500, y: 110, width: 170, height: 72 },
      { x: 714, y: 102, width: 186, height: 76 },
      { x: 58, y: 402, width: 190, height: 82 },
      { x: 712, y: 396, width: 188, height: 88 },
    ],
    roadMarks: [
      { x: 265, y: 238, width: 126, height: 8 },
      { x: 462, y: 352, width: 160, height: 8 },
      { x: 654, y: 246, width: 110, height: 8 },
    ],
    enemySpawns: [
      { role: "chaser", x: 610, y: 276 },
      { role: "shooter", x: 822, y: 360, shotCooldownTicks: 72 },
    ],
    requiredKills: 0,
    enemySpeedMultiplier: 1,
    enemyFireRateMultiplier: 1,
    enemyDamageMultiplier: 1,
    relayDamage: 25,
  },
  {
    id: "cross-grid",
    name: "교차 구역",
    signal: "SIGNAL II",
    difficulty: "경계",
    accent: "#FF9D3D",
    missionSeconds: 90,
    headquarters: { x: 132, y: 166 },
    relaySocket: { x: 402, y: 274 },
    packetLocation: { x: 816, y: 414 },
    cityBlocks: [
      { x: 54, y: 278, width: 178, height: 82 },
      { x: 270, y: 104, width: 126, height: 108 },
      { x: 454, y: 220, width: 154, height: 106 },
      { x: 660, y: 96, width: 116, height: 170 },
      { x: 276, y: 390, width: 170, height: 94 },
      { x: 706, y: 454, width: 194, height: 34 },
    ],
    roadMarks: [
      { x: 96, y: 212, width: 122, height: 8 },
      { x: 414, y: 116, width: 118, height: 8 },
      { x: 498, y: 372, width: 154, height: 8 },
      { x: 780, y: 310, width: 112, height: 8 },
    ],
    enemySpawns: [
      { role: "chaser", x: 354, y: 334 },
      { role: "chaser", x: 708, y: 338 },
      { role: "shooter", x: 548, y: 154, shotCooldownTicks: 48 },
      { role: "shooter", x: 844, y: 346, shotCooldownTicks: 82 },
    ],
    requiredKills: 2,
    enemySpeedMultiplier: 1.18,
    enemyFireRateMultiplier: 1.18,
    enemyDamageMultiplier: 1.12,
    relayDamage: 30,
  },
  {
    id: "collapse-core",
    name: "붕괴 코어",
    signal: "SIGNAL III",
    difficulty: "위험",
    accent: "#F04BE2",
    missionSeconds: 75,
    headquarters: { x: 126, y: 432 },
    relaySocket: { x: 398, y: 324 },
    packetLocation: { x: 824, y: 126 },
    cityBlocks: [
      { x: 54, y: 104, width: 196, height: 122 },
      { x: 52, y: 282, width: 132, height: 88 },
      { x: 284, y: 206, width: 132, height: 72 },
      { x: 474, y: 96, width: 126, height: 158 },
      { x: 474, y: 368, width: 170, height: 120 },
      { x: 690, y: 252, width: 160, height: 92 },
      { x: 704, y: 398, width: 196, height: 86 },
    ],
    roadMarks: [
      { x: 196, y: 394, width: 134, height: 8 },
      { x: 410, y: 302, width: 134, height: 8 },
      { x: 610, y: 190, width: 126, height: 8 },
      { x: 768, y: 210, width: 108, height: 8 },
    ],
    enemySpawns: [
      { role: "chaser", x: 242, y: 326 },
      { role: "chaser", x: 448, y: 324 },
      { role: "chaser", x: 660, y: 342 },
      { role: "shooter", x: 350, y: 132, shotCooldownTicks: 36 },
      { role: "shooter", x: 652, y: 146, shotCooldownTicks: 58 },
      { role: "shooter", x: 848, y: 370, shotCooldownTicks: 76 },
    ],
    requiredKills: 4,
    enemySpeedMultiplier: 1.36,
    enemyFireRateMultiplier: 1.38,
    enemyDamageMultiplier: 1.25,
    relayDamage: 35,
  },
] as const;

export const LEVEL_COUNT = LEVELS.length;
export const HEADQUARTERS = LEVELS[0].headquarters;
export const RELAY_SOCKET = LEVELS[0].relaySocket;
export const PACKET_LOCATION = LEVELS[0].packetLocation;
export const CITY_BLOCKS = LEVELS[0].cityBlocks;
export const ROAD_MARKS = LEVELS[0].roadMarks;

export function getLevelDefinition(levelIndex: number): LevelDefinition {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Math.trunc(levelIndex)))] as LevelDefinition;
}
