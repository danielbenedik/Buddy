import { useEffect, useState } from "react";

import { getFunFact } from "../../services/gemini";

import styles from "./LoadingFact.module.scss";

function LoadingFact() {
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

  return (
    <div className={styles.backdrop} role="status" aria-live="polite">
      <div className={styles.card}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.heading}>Content loading…</p>
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
