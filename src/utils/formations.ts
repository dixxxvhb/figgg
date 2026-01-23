// Formation Builder Utilities

export interface Position {
  x: number;
  y: number;
}

export interface DancerPosition extends Position {
  id: string;
  name: string;
  color: string;
}

// Check if two dancers are overlapping (within a threshold)
export function checkCollision(
  pos1: Position,
  pos2: Position,
  threshold: number = 8 // percentage units
): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < threshold;
}

// Find all overlapping dancers
export function findOverlappingDancers(
  dancers: DancerPosition[],
  threshold: number = 8
): Set<string> {
  const overlapping = new Set<string>();

  for (let i = 0; i < dancers.length; i++) {
    for (let j = i + 1; j < dancers.length; j++) {
      if (checkCollision(dancers[i], dancers[j], threshold)) {
        overlapping.add(dancers[i].id);
        overlapping.add(dancers[j].id);
      }
    }
  }

  return overlapping;
}

// Snap position to grid
export function snapToGrid(
  position: Position,
  gridSize: number = 10
): Position {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

// Clamp position to stage bounds
export function clampPosition(
  position: Position,
  minPercent: number = 5,
  maxPercent: number = 95
): Position {
  return {
    x: Math.max(minPercent, Math.min(maxPercent, position.x)),
    y: Math.max(minPercent, Math.min(maxPercent, position.y)),
  };
}

// Calculate center of mass for a group of dancers
export function calculateCenterOfMass(dancers: DancerPosition[]): Position {
  if (dancers.length === 0) return { x: 50, y: 50 };

  const sum = dancers.reduce(
    (acc, d) => ({ x: acc.x + d.x, y: acc.y + d.y }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / dancers.length,
    y: sum.y / dancers.length,
  };
}

// Spread overlapping dancers apart
export function spreadOverlappingDancers(
  dancers: DancerPosition[],
  threshold: number = 8
): DancerPosition[] {
  const result = [...dancers];
  const overlapping = findOverlappingDancers(result, threshold);

  if (overlapping.size === 0) return result;

  // Push overlapping dancers apart
  for (let iteration = 0; iteration < 10; iteration++) {
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        if (checkCollision(result[i], result[j], threshold)) {
          const dx = result[j].x - result[i].x || 0.1;
          const dy = result[j].y - result[i].y || 0.1;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const overlap = threshold - distance;

          if (overlap > 0) {
            const pushX = (dx / distance) * (overlap / 2);
            const pushY = (dy / distance) * (overlap / 2);

            result[i] = {
              ...result[i],
              ...clampPosition({ x: result[i].x - pushX, y: result[i].y - pushY }),
            };
            result[j] = {
              ...result[j],
              ...clampPosition({ x: result[j].x + pushX, y: result[j].y + pushY }),
            };
          }
        }
      }
    }
  }

  return result;
}

// Dancer colors palette
export const DANCER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4',
];

// Get a color for a dancer index
export function getDancerColor(index: number): string {
  return DANCER_COLORS[index % DANCER_COLORS.length];
}
