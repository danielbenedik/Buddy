import { renderHook, act } from "@testing-library/react";

import { RUN_LENGTH } from "../utils/constants";

import { useGuessGame } from "./useGuessGame";

import type { GuessRound, GuessSubject } from "../types/guess";

const mockSubject: GuessSubject = {
  id: "eiffel-tower",
  wikiTitle: "Eiffel Tower",
  answer: { en: "Eiffel Tower", he: "מגדל אייפל" },
  decoys: [
    { en: "Big Ben", he: "הביג בן" },
    { en: "Tokyo Tower", he: "מגדל טוקיו" },
    { en: "Space Needle", he: "מחט החלל" },
  ],
  category: "אתרים",
};

const mockRound: GuessRound = {
  subject: mockSubject,
  imageUrl: "https://example.test/a.jpg",
  aspect: 1.5,
  costs: new Array(100).fill(3),
  boardTotal: 300,
  options: [mockSubject.answer, ...mockSubject.decoys],
};

jest.mock("../services/guessPic", () => ({
  getSubjectPool: () => Promise.resolve([mockSubject]),
  buildRound: () => Promise.resolve(mockRound),
  shuffle: (items: unknown[]) => items,
}));

async function startedGame() {
  const view = renderHook(() => useGuessGame());
  await act(async () => {
    await Promise.resolve();
  });
  return view;
}

// Reveal `count` tiles, then answer correctly.
async function clearPicture(
  result: { current: ReturnType<typeof useGuessGame> },
  count: number,
) {
  await act(async () => {
    for (let i = 0; i < count; i += 1) result.current.reveal(i);
  });
  await act(async () => {
    result.current.guess(mockSubject.answer);
  });
}

beforeEach(() => localStorage.clear());

test("run total accumulates cost across pictures, not picture count", async () => {
  const { result } = await startedGame();

  await clearPicture(result, 2); // 2 tiles x 3 points
  expect(result.current.runTotal).toBe(6);

  await act(async () => {
    result.current.next();
  });
  await clearPicture(result, 3);
  expect(result.current.runTotal).toBe(15);
  expect(result.current.pictureNumber).toBe(2);
});

test("does not double-count the live picture once it is solved", async () => {
  const { result } = await startedGame();

  await act(async () => {
    result.current.reveal(0);
  });
  expect(result.current.runTotal).toBe(3);

  await act(async () => {
    result.current.guess(mockSubject.answer);
  });
  // runSpent has absorbed it; the live spend must not be added again.
  expect(result.current.runTotal).toBe(3);
});

test("a wrong guess ends the run and records nothing", async () => {
  const { result } = await startedGame();

  await clearPicture(result, 1);
  await act(async () => {
    result.current.next();
  });
  await act(async () => {
    result.current.guess(mockSubject.decoys[0]);
  });

  expect(result.current.status).toBe("lost");
  expect(result.current.bestRun).toBeNull();
});

// Plays a whole run, revealing `perPicture` tiles on each picture.
async function completeRun(
  result: { current: ReturnType<typeof useGuessGame> },
  perPicture: number,
) {
  for (let i = 0; i < RUN_LENGTH; i += 1) {
    await clearPicture(result, perPicture);
    if (i < RUN_LENGTH - 1) {
      await act(async () => {
        result.current.next();
      });
    }
  }
}

test("a worse second run does not overwrite the record", async () => {
  const { result } = await startedGame();

  await completeRun(result, 1);
  expect(result.current.bestRun).toBe(RUN_LENGTH * 3);
  expect(result.current.isNewRecord).toBe(true);

  await act(async () => {
    result.current.restart();
  });
  await completeRun(result, 2); // twice the cost

  expect(result.current.isNewRecord).toBe(false);
  expect(result.current.bestRun).toBe(RUN_LENGTH * 3);
});

test("a better run replaces the record", async () => {
  const { result } = await startedGame();

  await completeRun(result, 3);
  expect(result.current.bestRun).toBe(RUN_LENGTH * 9);

  await act(async () => {
    result.current.restart();
  });
  await completeRun(result, 1);

  expect(result.current.isNewRecord).toBe(true);
  expect(result.current.bestRun).toBe(RUN_LENGTH * 3);
});

test("only a full run sets a record", async () => {
  const { result } = await startedGame();

  for (let i = 0; i < RUN_LENGTH; i += 1) {
    await clearPicture(result, 1);
    expect(result.current.bestRun).toBe(
      i === RUN_LENGTH - 1 ? RUN_LENGTH * 3 : null,
    );
    if (i < RUN_LENGTH - 1) {
      await act(async () => {
        result.current.next();
      });
    }
  }

  expect(result.current.status).toBe("finished");
  expect(result.current.isNewRecord).toBe(true);
});
