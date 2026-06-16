import { useEffect, useState } from "react";

import { generateSummaryStream } from "../services/gemini";
import { getCached, setCached } from "../utils/cache";
import { cacheKeys, SUMMARY_TTL } from "../utils/constants";

import type { Book } from "../types/catalog";
import type { SummaryState } from "../types/summary";

const IDLE: SummaryState = { text: "", status: "idle" };

export function useStreamingSummary(book: Book | null): SummaryState {
  const [state, setState] = useState<SummaryState>(IDLE);

  useEffect(() => {
    if (!book) {
      setState(IDLE);
      return;
    }

    let cancelled = false;
    const key = cacheKeys.summary(book.id);

    const cached = getCached<string>(key);
    if (cached) {
      setState({ text: cached, status: "done" });
      return;
    }

    setState({ text: "", status: "streaming" });

    (async () => {
      try {
        let full = "";
        for await (const piece of generateSummaryStream(book)) {
          if (cancelled) return;
          full += piece;
          setState({ text: full, status: "streaming" });
        }
        if (cancelled) return;
        setCached(key, full, SUMMARY_TTL);
        setState({ text: full, status: "done" });
      } catch (err: unknown) {
        if (cancelled) return;
        setState({
          text: "",
          status: "error",
          error:
            err instanceof Error ? err.message : "Failed to generate summary",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [book]);

  return state;
}
