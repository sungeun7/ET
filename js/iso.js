import { COLS, ROWS, elevAt } from './data.js';

/** 아이소메트릭 타일 크기 (대각선 위 시점) */
export const ISO_W = 56;
export const ISO_H = 28;
/** 고도 픽셀 배율 — 높낮이 차이를 강하게 */
export const ELEV_SCALE = 1.35;

export function isoOrigin(canvasW, canvasH) {
  const cx = (COLS - 1) / 2;
  const cy = (ROWS - 1) / 2;
  return {
    ox: canvasW / 2 - (cx - cy) * (ISO_W / 2),
    oy: canvasH / 2 - 28 - (cx + cy) * (ISO_H / 2),
  };
}

/** 격자 → 화면 (타일 윗면 중심) */
export function toScreen(gx, gy, elev = 0, ox = 0, oy = 0) {
  return {
    sx: ox + (gx - gy) * (ISO_W / 2),
    sy: oy + (gx + gy) * (ISO_H / 2) - elev * ELEV_SCALE,
  };
}

/** 타일 마름모 네 꼭짓점 (윗면) */
export function diamondPoints(sx, sy) {
  const hw = ISO_W / 2;
  const hh = ISO_H / 2;
  return {
    top: { x: sx, y: sy - hh },
    right: { x: sx + hw, y: sy },
    bottom: { x: sx, y: sy + hh },
    left: { x: sx - hw, y: sy },
  };
}

/**
 * 화면 좌표 → 격자 (고도 보정 탐색)
 */
export function fromScreen(px, py, map, ox, oy) {
  let best = null;
  let bestDist = Infinity;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const elev = elevAt(map, x, y);
      const { sx, sy } = toScreen(x, y, elev, ox, oy);
      // 마름모 hit-test (맨해튼 정규화)
      const dx = Math.abs(px - sx) / (ISO_W / 2);
      const dy = Math.abs(py - sy) / (ISO_H / 2);
      if (dx + dy <= 1.05) {
        const d = dx + dy;
        if (d < bestDist) {
          bestDist = d;
          best = { x, y };
        }
      }
    }
  }
  return best;
}

export function sortDrawOrder(cols, rows) {
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({ x, y, depth: x + y });
    }
  }
  cells.sort((a, b) => a.depth - b.depth || a.x - b.x);
  return cells;
}
