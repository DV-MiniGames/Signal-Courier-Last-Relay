import type { Rect, Vec2 } from "./types";

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function lengthSquared(vector: Vec2): number {
  return vector.x * vector.x + vector.y * vector.y;
}

export function distanceSquared(a: Vec2, b: Vec2): number {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return x * x + y * y;
}

export function normalize(vector: Vec2, fallback: Vec2 = { x: 0, y: 0 }): Vec2 {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude <= Number.EPSILON) return { ...fallback };
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

export function circlesOverlap(a: Vec2, aRadius: number, b: Vec2, bRadius: number): boolean {
  const combinedRadius = aRadius + bRadius;
  return distanceSquared(a, b) <= combinedRadius * combinedRadius;
}

export function circleIntersectsRect(center: Vec2, radius: number, rect: Rect): boolean {
  const closestX = clamp(center.x, rect.x, rect.x + rect.width);
  const closestY = clamp(center.y, rect.y, rect.y + rect.height);
  const deltaX = center.x - closestX;
  const deltaY = center.y - closestY;
  return deltaX * deltaX + deltaY * deltaY < radius * radius;
}
