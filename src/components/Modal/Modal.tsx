import { useEffect } from "react";
import { createPortal } from "react-dom";

import { useStreamingSummary } from "../../hooks/useStreamingSummary";
import { READING_TIMES } from "../../utils/constants";
import BookCover from "../BookCover/BookCover";
import Summary from "../Summary/Summary";

import styles from "./Modal.module.scss";

import type { Book, ReadingTime } from "../../types/catalog";

interface ModalProps {
  book: Book;
  minutes: ReadingTime;
  genreLabel?: string;
  onMinutesChange: (minutes: ReadingTime) => void;
  onClose: () => void;
}

const RefreshIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);

function Modal({
  book,
  minutes,
  genreLabel,
  onMinutesChange,
  onClose,
}: ModalProps) {
  const { text, status, error, reload } = useStreamingSummary(book, minutes);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.backdrop}>
      <button
        type="button"
        className={styles.backdropClose}
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={book.title}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <div className={styles.header}>
          <BookCover
            book={book}
            imgClassName={styles.cover}
            placeholderClassName={styles.coverPlaceholder}
          />
          <div className={styles.headerInfo}>
            <h2 className={styles.title} dir="rtl" lang="he">
              {book.titleHe}
            </h2>
            <p className={styles.meta} dir="rtl" lang="he">
              {book.authorHe}
              {book.year ? ` · ${book.year}` : ""}
            </p>
            <div className={styles.tags}>
              {genreLabel && <span className={styles.genre}>{genreLabel}</span>}
              <div className={styles.times}>
                {READING_TIMES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={m === minutes ? styles.timeActive : styles.time}
                    onClick={() => onMinutesChange(m)}
                  >
                    {m} min
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`${styles.refresh} ${
                  status === "streaming" ? styles.spinning : ""
                }`}
                onClick={reload}
                disabled={status === "streaming"}
                aria-label="Regenerate summary"
                title="Regenerate"
              >
                <RefreshIcon />
              </button>
            </div>
          </div>
        </div>
        <div className={styles.body}>
          <Summary text={text} status={status} error={error} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
