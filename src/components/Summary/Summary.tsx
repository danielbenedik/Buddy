import styles from "./Summary.module.scss";

import type { StreamStatus } from "../../types/summary";

interface SummaryProps {
  text: string;
  status: StreamStatus;
  error?: string;
  english?: boolean;
}

function Summary({ text, status, error, english }: SummaryProps) {
  if (status === "error") {
    return (
      <p className={styles.error}>Couldn’t generate the story. {error ?? ""}</p>
    );
  }

  return (
    <div className={styles.summary}>
      <p
        className={styles.text}
        dir={english ? "ltr" : "rtl"}
        lang={english ? "en" : "he"}
        style={{ textAlign: english ? "left" : "right" }}
      >
        {text}
        {status === "streaming" && <span className={styles.caret} />}
        {status === "done" && text.length > 0 && (
          <span className={styles.doneMark} aria-label="Summary complete" />
        )}
      </p>
      {status === "streaming" && text.length === 0 && (
        <p className={styles.status}>Generating story…</p>
      )}
    </div>
  );
}

export default Summary;
