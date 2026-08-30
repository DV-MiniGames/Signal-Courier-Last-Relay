import type { Rect, Vec2 } from "../core/types";

export const HEADQUARTERS: Vec2 = { x: 128, y: 300 };
export const RELAY_SOCKET: Vec2 = { x: 416, y: 300 };
export const PACKET_LOCATION: Vec2 = { x: 802, y: 224 };

export const CITY_BLOCKS: Rect[] = [
  { x: 58, y: 112, width: 176, height: 90 },
  { x: 282, y: 112, width: 142, height: 70 },
  { x: 500, y: 110, width: 170, height: 72 },
  { x: 714, y: 102, width: 186, height: 76 },
  { x: 58, y: 402, width: 190, height: 82 },
  { x: 712, y: 396, width: 188, height: 88 },
];

export const ROAD_MARKS: Rect[] = [
  { x: 265, y: 238, width: 126, height: 8 },
  { x: 462, y: 352, width: 160, height: 8 },
  { x: 654, y: 246, width: 110, height: 8 },
];
