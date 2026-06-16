import { useStreamingSummary } from "../../hooks/useStreamingSummary";

import styles from "./Summary.module.scss";

import type { Book } from "../../types/catalog";

interface SummaryProps {
  book: Book;
}

function Summary({ book }: SummaryProps) {
  const { text, status, error } = useStreamingSummary(book);

  if (status === "error") {
    return (
      <p className={styles.error}>
        Couldn’t generate the summary. {error ?? ""}
      </p>
    );
  }

  return (
    <div className={styles.summary}>
      <p className={styles.text}>
        {text}
        {status === "streaming" && <span className={styles.caret} />}
      </p>
      {status === "streaming" && text.length === 0 && (
        <p className={styles.status}>Generating summary…</p>
      )}
    </div>
  );
}

export default Summary;
