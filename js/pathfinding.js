import { COLS, ROWS, TERRAIN } from './data.js';

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

export function unitAt(units, x, y, aliveOnly = true) {
  return units.find((u) => u.alive === aliveOnly && u.x === x && u.y === y) || null;
}

/**
 * 이동 가능 칸 + 각 칸까지 남은 이동력
 */
export function getMoveTiles(map, units, unit, classData) {
  const blocked = new Set(
    units.filter((u) => u.alive && u.id !== unit.id).map((u) => `${u.x},${u.y}`)
  );

  const best = new Map();
  const queue = [{ x: unit.x, y: unit.y, left: classData.move }];
  best.set(`${unit.x},${unit.y}`, classData.move);

  while (queue.length) {
    const cur = queue.shift();
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!inBounds(nx, ny)) continue;
      const key = `${nx},${ny}`;
      if (blocked.has(key)) continue;
      const terrain = TERRAIN[map[ny][nx]];
      const cost = terrain.moveCost;
      if (cost >= 99) continue;
      const left = cur.left - cost;
      if (left < 0) continue;
      if (best.has(key) && best.get(key) >= left) continue;
      best.set(key, left);
      queue.push({ x: nx, y: ny, left });
    }
  }

  return [...best.entries()].map(([key, left]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, left };
  });
}

export function getAttackTilesFrom(x, y, rangeMin, rangeMax) {
  const tiles = [];
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const dist = Math.abs(tx - x) + Math.abs(ty - y);
      if (dist >= rangeMin && dist <= rangeMax) {
        tiles.push({ x: tx, y: ty });
      }
    }
  }
  return tiles;
}

/** 이동 후 공격 가능한 모든 칸 (미리보기용) */
export function getAttackTilesAfterMove(map, units, unit, classData) {
  const moveTiles = getMoveTiles(map, units, unit, classData);
  const set = new Set();
  for (const m of moveTiles) {
    // 아군이 서 있는 칸은 이동 불가이므로 moveTiles에 없음. 자기 위치는 포함됨.
    for (const a of getAttackTilesFrom(m.x, m.y, classData.rangeMin, classData.rangeMax)) {
      set.add(`${a.x},${a.y}`);
    }
  }
  return [...set].map((key) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });
}

export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
