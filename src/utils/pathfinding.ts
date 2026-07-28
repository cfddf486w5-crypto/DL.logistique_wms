export interface Point {
  x: number;
  y: number;
}

export function findPath(start: Point, goal: Point, width: number, height: number, obstacles: {x: number, y: number, w: number, h: number}[]): Point[] {
  // Simple A* implementation on a coarse grid to avoid freezing the UI
  // Resolution: 0.5 meters
  const res = 0.5;
  const cols = Math.ceil(width / res);
  const rows = Math.ceil(height / res);

  const grid = new Array(cols).fill(0).map(() => new Array(rows).fill(0));
  
  // Mark obstacles
  for (const obs of obstacles) {
    const minX = Math.max(0, Math.floor(obs.x / res));
    const maxX = Math.min(cols - 1, Math.ceil((obs.x + obs.w) / res));
    const minY = Math.max(0, Math.floor(obs.y / res));
    const maxY = Math.min(rows - 1, Math.ceil((obs.y + obs.h) / res));
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        grid[x][y] = 1;
      }
    }
  }

  const startX = Math.max(0, Math.min(cols - 1, Math.floor(start.x / res)));
  const startY = Math.max(0, Math.min(rows - 1, Math.floor(start.y / res)));
  const goalX = Math.max(0, Math.min(cols - 1, Math.floor(goal.x / res)));
  const goalY = Math.max(0, Math.min(rows - 1, Math.floor(goal.y / res)));

  // If start or goal is inside an obstacle, try to clear it slightly
  grid[startX][startY] = 0;
  grid[goalX][goalY] = 0;

  const openSet = new Set<string>();
  const closedSet = new Set<string>();
  const cameFrom = new Map<string, string>();

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  const startKey = `${startX},${startY}`;
  openSet.add(startKey);
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(startX, startY, goalX, goalY));

  while (openSet.size > 0) {
    let currentKey = '';
    let minF = Infinity;
    for (const key of openSet) {
      const f = fScore.get(key) ?? Infinity;
      if (f < minF) {
        minF = f;
        currentKey = key;
      }
    }

    if (!currentKey) break;

    const [cx, cy] = currentKey.split(',').map(Number);

    if (cx === goalX && cy === goalY) {
      return reconstructPath(cameFrom, currentKey, res);
    }

    openSet.delete(currentKey);
    closedSet.add(currentKey);

    const neighbors = [
      [cx, cy - 1], [cx, cy + 1], [cx - 1, cy], [cx + 1, cy],
      [cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx + 1, cy + 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (grid[nx][ny] === 1) continue;

      const nKey = `${nx},${ny}`;
      if (closedSet.has(nKey)) continue;

      // Distance to neighbor
      const dist = (nx === cx || ny === cy) ? 1 : 1.414;
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + dist;

      if (!openSet.has(nKey)) {
        openSet.add(nKey);
      } else if (tentativeG >= (gScore.get(nKey) ?? Infinity)) {
        continue;
      }

      cameFrom.set(nKey, currentKey);
      gScore.set(nKey, tentativeG);
      fScore.set(nKey, tentativeG + heuristic(nx, ny, goalX, goalY));
    }
  }

  // Fallback if no path found: direct line
  return [start, goal];
}

function heuristic(x1: number, y1: number, x2: number, y2: number) {
  // Diagonal distance
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return dx + dy + (1.414 - 2) * Math.min(dx, dy);
}

function reconstructPath(cameFrom: Map<string, string>, currentKey: string, res: number): Point[] {
  const path = [];
  let curr = currentKey;
  while (cameFrom.has(curr)) {
    const [x, y] = curr.split(',').map(Number);
    path.push({ x: x * res + res / 2, y: y * res + res / 2 });
    curr = cameFrom.get(curr)!;
  }
  const [sx, sy] = curr.split(',').map(Number);
  path.push({ x: sx * res + res / 2, y: sy * res + res / 2 });
  
  // Apply a basic smoothing pass to remove unnecessary jagged diagonals
  return smoothPath(path.reverse());
}

function smoothPath(path: Point[]): Point[] {
  if (path.length <= 2) return path;
  const smoothed = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = smoothed[smoothed.length - 1];
    const curr = path[i];
    const next = path[i+1];
    
    // Check if we really need this point
    // Simple collinearity check
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    
    // If direction changed, keep the point
    if (Math.abs(dx1 * dy2 - dy1 * dx2) > 0.001) {
      smoothed.push(curr);
    }
  }
  smoothed.push(path[path.length - 1]);
  return smoothed;
}
