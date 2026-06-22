import { useState } from "react";

import Card from "../Card/Card";

import styles from "./Row.module.scss";

import type { Book, Genre, ReadingTime } from "../../types/catalog";

interface RowProps {
  genre: Genre;
  onSelect: (book: Book, minutes: ReadingTime) => void;
  onRefresh: (genreId: string) => Promise<void>;
}

const RefreshIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="15"
    height="15"
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

const ChevronDownIcon = () => (
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
    <path d="M6 9l6 6 6-6" />
  </svg>
);

function Row({ genre, onSelect, onRefresh }: RowProps) {
  const [busy, setBusy] = useState(false);
  const expanded = genre.books.length > 0;

  const fetchBooks = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onRefresh(genre.id);
    } catch {
      // keep current state on failure
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.row}>
      <div className={styles.header}>
        <h2 className={styles.label}>{genre.label}</h2>
        {expanded && (
          <button
            type="button"
            className={`${styles.refresh} ${busy ? styles.spinning : ""}`}
            onClick={fetchBooks}
            disabled={busy}
            aria-label={`Refresh ${genre.label}`}
            title="Refresh"
          >
            <RefreshIcon />
          </button>
        )}
      </div>

      {expanded ? (
        <div className={styles.track}>
          {genre.books.map((book) => (
            <Card key={book.id} book={book} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <button
          type="button"
          className={styles.expand}
          onClick={fetchBooks}
          disabled={busy}
        >
          <span>{busy ? "Loading…" : "Open"}</span>
          <ChevronDownIcon />
        </button>
      )}
    </section>
  );
}

export default Row;
