import type { FixtureKind, TableShape } from "../types";

export const GRID = 20;

export function tableSize(shape: TableShape): { width: number; height: number } {
  if (shape === "round") return { width: 90, height: 90 };
  if (shape === "rectangle") return { width: 136, height: 82 };
  if (shape === "bar") return { width: 52, height: 52 };
  if (shape === "booth") return { width: 172, height: 92 };
  return { width: 84, height: 84 };
}

export function fixtureSize(kind: FixtureKind): { width: number; height: number } {
  if (kind === "window") return { width: 98, height: 14 };
  return { width: 56, height: 16 };
}

export function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function collides(
  x: number,
  y: number,
  width: number,
  height: number,
  occupied: Array<{ x: number; y: number; width: number; height: number }>
): boolean {
  return occupied.some((entry) => {
    const pad = 4;
    return !(
      x + width <= entry.x - pad ||
      x >= entry.x + entry.width + pad ||
      y + height <= entry.y - pad ||
      y >= entry.y + entry.height + pad
    );
  });
}

export function resolveSpawnPosition(
  desiredX: number,
  desiredY: number,
  width: number,
  height: number,
  bounds: { width: number; height: number },
  occupied: Array<{ x: number; y: number; width: number; height: number }>
): { x: number; y: number } {
  const maxX = Math.max(0, bounds.width - width);
  const maxY = Math.max(0, bounds.height - height);
  const startX = clamp(snap(desiredX), 0, maxX);
  const startY = clamp(snap(desiredY), 0, maxY);
  if (!collides(startX, startY, width, height, occupied)) return { x: startX, y: startY };

  const seen = new Set<string>();
  for (let radius = 1; radius <= 22; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const x = clamp(startX + dx * GRID, 0, maxX);
        const y = clamp(startY + dy * GRID, 0, maxY);
        const key = `${x}:${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (collides(x, y, width, height, occupied)) continue;
        return { x, y };
      }
    }
  }
  return { x: startX, y: startY };
}
