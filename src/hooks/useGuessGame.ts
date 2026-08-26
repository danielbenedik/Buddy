import { useCallback, useEffect, useRef, useState } from "react";

import { buildRound, getSubjectPool, shuffle } from "../services/guessPic";
import { getCached, setCached } from "../utils/cache";
import {
  BOX_BATCH_SIZE,
  cacheKeys,
  GUESS_RECORD_TTL,
  RUN_LENGTH,
} from "../utils/constants";

import type {
  GuessOption,
  GuessRound,
  GuessStatus,
  GuessSubject,
} from "../types/guess";

interface GuessGame {
  round: GuessRound | null;
  loading: boolean;
  error: string | null;
  revealed: number[];
  status: GuessStatus;
  // Cost of the current picture, and of every picture in the run so far.
  spent: number;
  runSpent: number;
  // 1-based position in the fixed-length run.
  pictureNumber: number;
  runLength: number;
  // Running total: the solved pictures, plus the current one while it's live.
  runTotal: number;
  // Lowest total that has ever cleared a full run; null until one is completed.
  bestRun: number | null;
  isNewRecord: boolean;
  reveal: (tile: number) => void;
  guess: (option: GuessOption) => void;
  next: () => void;
  restart: () => void;
}

export function useGuessGame(): GuessGame {
  const [round, setRound] = useState<GuessRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [status, setStatus] = useState<GuessStatus>("playing");
  const [runSpent, setRunSpent] = useState(0);
  const [pictureNumber, setPictureNumber] = useState(1);
  const [bestRun, setBestRun] = useState<number | null>(() =>
    getCached<number>(cacheKeys.guessBestRun),
  );
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Subjects in this run's play order, plus how far into it we are. Reshuffled
  // per run so a restart doesn't replay the same pictures in the same order.
  const queue = useRef<GuessSubject[]>([]);
  const position = useRef(0);
  // Carries the queue index too: a failed subject means the next playable
  // round isn't necessarily position + 1.
  const prefetched = useRef<{ round: GuessRound; at: number } | null>(null);

  const spent = revealed.reduce(
    (sum, tile) => sum + (round?.costs[tile] ?? 0),
    0,
  );

  const refillQueue = useCallback(async (force: boolean) => {
    queue.current = shuffle(await getSubjectPool(force));
    position.current = 0;
  }, []);

  // A subject can fail on a missing or unusable photo, so walk forward until a
  // round builds. Running off the end pulls a fresh pool rather than dead-ending.
  const loadFrom = useCallback(
    async (start: number): Promise<{ round: GuessRound; at: number }> => {
      if (!queue.current.length) await refillQueue(false);

      // Hand buildRound the subjects that follow so it can price them in the
      // same vision call instead of one request each.
      const attempt = async (from: number) => {
        for (let i = from; i < queue.current.length; i += 1) {
          try {
            const upcoming = queue.current.slice(i + 1, i + BOX_BATCH_SIZE);
            return {
              round: await buildRound(queue.current[i], upcoming),
              at: i,
            };
          } catch {
            continue;
          }
        }
        return null;
      };

      const found = await attempt(start);
      if (found) return found;

      await refillQueue(true);
      const refilled = await attempt(0);
      if (refilled) return refilled;

      throw new Error("Couldn't build a playable round");
    },
    [refillQueue],
  );

  const startRound = useCallback(
    async (start: number) => {
      setLoading(true);
      setError(null);
      try {
        const { round: next, at } = await loadFrom(start);
        position.current = at;
        setRound(next);
        setRevealed([]);
        setStatus("playing");
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load the game",
        );
      } finally {
        setLoading(false);
      }
    },
    [loadFrom],
  );

  useEffect(() => {
    void startRound(0);
  }, [startRound]);

  // Warm the next round's image + costs while the player is still on this one.
  useEffect(() => {
    if (!round || status !== "playing") return;
    let cancelled = false;
    prefetched.current = null;
    loadFrom(position.current + 1)
      .then((ready) => {
        if (!cancelled) prefetched.current = ready;
      })
      .catch(() => {
        // Best-effort; next() falls back to loading on demand.
      });
    return () => {
      cancelled = true;
    };
    // Re-arm only when the round itself changes, not on every reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.subject.id, loadFrom]);

  const reveal = useCallback(
    (tile: number) => {
      if (status !== "playing") return;
      setRevealed((prev) => (prev.includes(tile) ? prev : [...prev, tile]));
    },
    [status],
  );

  const guess = useCallback(
    (option: GuessOption) => {
      if (!round || status !== "playing") return;

      // A wrong answer ends the run without a score — an unfinished run has no
      // total to compare against a completed one.
      if (option.en !== round.subject.answer.en) {
        setStatus("lost");
        return;
      }

      const runTotal = runSpent + spent;
      setRunSpent(runTotal);

      if (pictureNumber < RUN_LENGTH) {
        setStatus("won");
        return;
      }

      setStatus("finished");
      const beatsRecord = bestRun === null || runTotal < bestRun;
      setIsNewRecord(beatsRecord);
      if (beatsRecord) {
        setBestRun(runTotal);
        setCached(cacheKeys.guessBestRun, runTotal, GUESS_RECORD_TTL);
      }
    },
    [round, status, spent, runSpent, pictureNumber, bestRun],
  );

  const next = useCallback(() => {
    setPictureNumber((n) => n + 1);
    const ready = prefetched.current;
    if (ready) {
      prefetched.current = null;
      position.current = ready.at;
      setRound(ready.round);
      setRevealed([]);
      setStatus("playing");
      return;
    }
    void startRound(position.current + 1);
  }, [startRound]);

  const restart = useCallback(() => {
    setRunSpent(0);
    setPictureNumber(1);
    setIsNewRecord(false);
    prefetched.current = null;
    queue.current = [];
    void startRound(0);
  }, [startRound]);

  return {
    round,
    loading,
    error,
    revealed,
    status,
    spent,
    runSpent,
    runTotal: status === "playing" ? runSpent + spent : runSpent,
    pictureNumber,
    runLength: RUN_LENGTH,
    bestRun,
    isNewRecord,
    reveal,
    guess,
    next,
    restart,
  };
}
