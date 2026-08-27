import { TARGET_TILE_COST } from "./constants";
import {
  boardTotal,
  costsFromImportance,
  importanceFromBoxes,
  isDegenerate,
} from "./guessCost";

const SIZE = 10;
const TILES = SIZE * SIZE;

describe("isDegenerate", () => {
  test("rejects a missing box", () => {
    expect(isDegenerate(null)).toBe(true);
  });

  test("rejects a box covering the whole frame", () => {
    expect(isDegenerate([0, 0, 1000, 1000])).toBe(true);
  });

  test("accepts a tight box", () => {
    expect(isDegenerate([0, 300, 980, 690])).toBe(false);
  });
});

describe("importanceFromBoxes", () => {
  test("scores cells inside the subject above cells outside it", () => {
    // Subject fills the bottom half of the frame.
    const scores = importanceFromBoxes(
      { subject: [500, 0, 1000, 1000], details: [] },
      SIZE,
    );
    expect(scores).toHaveLength(TILES);

    const topRow = scores.slice(0, SIZE);
    const bottomRow = scores.slice(-SIZE);
    topRow.forEach((s) => expect(s).toBe(0));
    bottomRow.forEach((s) => expect(s).toBeGreaterThan(0));
  });

  test("scales to the requested grid size", () => {
    const scores = importanceFromBoxes(
      { subject: [500, 0, 1000, 1000], details: [] },
      5,
    );
    expect(scores).toHaveLength(25);
    scores.slice(0, 5).forEach((s) => expect(s).toBe(0));
    scores.slice(-5).forEach((s) => expect(s).toBeGreaterThan(0));
  });

  test("detail boxes outrank plain subject coverage", () => {
    const scores = importanceFromBoxes(
      { subject: [0, 0, 1000, 1000], details: [[0, 0, 250, 250]] },
      SIZE,
    );
    // A full-frame subject is degenerate, so only the detail cell scores.
    expect(scores[0]).toBeGreaterThan(scores[SIZE - 1]);
  });

  test("a cell on both subject and detail beats subject alone", () => {
    const [withDetail, withoutDetail] = [
      importanceFromBoxes(
        { subject: [0, 0, 1000, 500], details: [[0, 0, 250, 250]] },
        SIZE,
      ),
      importanceFromBoxes({ subject: [0, 0, 1000, 500], details: [] }, SIZE),
    ];
    expect(withDetail[0]).toBeGreaterThan(withoutDetail[0]);
  });
});

describe("costsFromImportance", () => {
  test("every tile carries a cost, so nothing is free", () => {
    const costs = costsFromImportance(new Array(TILES).fill(0));
    costs.forEach((c) => expect(c).toBeGreaterThan(0));
  });

  test("normalizes wildly different boards to a comparable total", () => {
    const flat = boardTotal(costsFromImportance(new Array(TILES).fill(0)));
    const peaked = boardTotal(
      costsFromImportance(
        new Array(TILES).fill(0).map((_, i) => (i < TILES / 4 ? 1 : 0)),
      ),
    );
    // Ladder snapping costs some precision, but both boards must still land
    // near the target so run scores stay comparable.
    const target = TILES * TARGET_TILE_COST;
    [flat, peaked].forEach((total) => {
      const drift = Math.abs(total - target) / target;
      expect(drift).toBeLessThan(0.2);
    });
  });

  test("higher importance never costs less", () => {
    const costs = costsFromImportance([
      0, 0.25, 0.5, 0.75, 1, 0, 0.25, 0.5, 0.75, 1, 0, 0.25, 0.5, 0.75, 1, 0.5,
    ]);
    expect(costs[0]).toBeLessThanOrEqual(costs[4]);
    expect(costs[1]).toBeLessThanOrEqual(costs[3]);
  });
});
