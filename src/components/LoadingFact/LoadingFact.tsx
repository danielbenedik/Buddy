import { useEffect, useState } from "react";

import { getFunFact } from "../../services/gemini";

import styles from "./LoadingFact.module.scss";

interface LoadingFactProps {
  loading: boolean;
  onClose: () => void;
}

function LoadingFact({ loading, onClose }: LoadingFactProps) {
  // null = still fetching the fact, "" = failed/empty, string = the fact
  const [fact, setFact] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFunFact()
      .then((f) => {
        if (!cancelled) setFact(f || "");
      })
      .catch(() => {
        if (!cancelled) setFact("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} role="status" aria-live="polite">
      <div className={styles.card}>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        {loading && (
          <>
            <div className={styles.spinner} aria-hidden="true" />
            <p className={styles.heading}>Content loading…</p>
          </>
        )}
        {fact === null && (
          <p className={styles.factLoading} dir="rtl" lang="he">
            טוען עובדה מעניינת…
          </p>
        )}
        {fact && (
          <>
            <p className={styles.label}>עובדה על היום</p>
            <p className={styles.fact} dir="rtl" lang="he">
              {fact}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default LoadingFact;
