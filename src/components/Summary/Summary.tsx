import { useStreamingSummary } from "../../hooks/useStreamingSummary";

import styles from "./Summary.module.scss";

import type { Book, ReadingTime } from "../../types/catalog";

interface SummaryProps {
  book: Book;
  minutes: ReadingTime;
}

function Summary({ book, minutes }: SummaryProps) {
  const { text, status, error } = useStreamingSummary(book, minutes);

  if (status === "error") {
    return (
      <p className={styles.error}>Couldn’t generate the story. {error ?? ""}</p>
    );
  }

  return (
    <div className={styles.summary}>
      <p className={styles.text} dir="rtl" lang="he">
        {text}
        {status === "streaming" && <span className={styles.caret} />}
      </p>
      {status === "streaming" && text.length === 0 && (
        <p className={styles.status}>Generating story…</p>
      )}
    </div>
  );
}

export default Summary;
