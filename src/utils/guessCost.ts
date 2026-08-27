import { COST_LADDER, TARGET_TILE_COST } from "./constants";

import type { Box, SubjectBoxes } from "../types/guess";

// A cell is never free: even empty sky costs a quarter of the scale, so the
// player still pays to eliminate background.
const FLOOR = 0.25;
// Kept below 1 so a cell sitting on the subject alone lands mid-range and the
// detail boxes still have headroom to push the giveaway cells to the top —
// at weight 1 the clamp flattened everything inside the subject to one price.
const SUBJECT_WEIGHT = 0.45;
const DETAIL_WEIGHT = 0.55;

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function boxToRect([ymin, xmin, ymax, xmax]: Box): Rect {
  return {
    x0: Math.min(xmin, xmax) / 1000,
    y0: Math.min(ymin, ymax) / 1000,
    x1: Math.max(xmin, xmax) / 1000,
    y1: Math.max(ymin, ymax) / 1000,
  };
}

function cellRect(row: number, col: number, size: number): Rect {
  return {
    x0: col / size,
    y0: row / size,
    x1: (col + 1) / size,
    y1: (row + 1) / size,
  };
}

// Fraction of the cell covered by the rect, 0-1.
function coverage(cell: Rect, rect: Rect): number {
  const w = Math.max(
    0,
    Math.min(cell.x1, rect.x1) - Math.max(cell.x0, rect.x0),
  );
  const h = Math.max(
    0,
    Math.min(cell.y1, rect.y1) - Math.max(cell.y0, rect.y0),
  );
  const cellArea = (cell.x1 - cell.x0) * (cell.y1 - cell.y0);
  return cellArea > 0 ? (w * h) / cellArea : 0;
}

// A box covering nearly the whole frame tells us nothing — every cell would
// score the same. Treat it as unusable and let the caller fall back.
export function isDegenerate(box: Box | null): boolean {
  if (!box) return true;
  const r = boxToRect(box);
  const area = (r.x1 - r.x0) * (r.y1 - r.y0);
  return area > 0.9 || area < 0.005;
}

export function importanceFromBoxes(
  boxes: SubjectBoxes,
  size: number,
): number[] {
  const usable = isDegenerate(boxes.subject) ? [] : [boxes.subject as Box];
  const details = boxes.details.filter((b) => !isDegenerate(b));

  const scores: number[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const cell = cellRect(row, col, size);
      let score = 0;
      usable.forEach((b) => {
        score += SUBJECT_WEIGHT * coverage(cell, boxToRect(b));
      });
      details.forEach((b) => {
        score += DETAIL_WEIGHT * coverage(cell, boxToRect(b));
      });
      scores.push(Math.min(1, score));
    }
  }
  return scores;
}

function nearestLadder(value: number): number {
  return COST_LADDER.reduce((best, step) =>
    Math.abs(step - value) < Math.abs(best - value) ? step : best,
  );
}

// Importance (0-1 per cell) -> tile costs snapped to the ladder. Scaled so the
// whole board lands near tiles * TARGET_TILE_COST, keeping boards of the same
// size comparable.
export function costsFromImportance(importance: number[]): number[] {
  const raw = importance.map((i) => FLOOR + (1 - FLOOR) * i);
  const sum = raw.reduce((a, b) => a + b, 0);
  const scale = sum > 0 ? (importance.length * TARGET_TILE_COST) / sum : 1;
  return raw.map((r) => nearestLadder(r * scale));
}

export function boardTotal(costs: number[]): number {
  return costs.reduce((a, b) => a + b, 0);
}
