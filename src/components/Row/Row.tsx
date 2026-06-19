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

function Row({ genre, onSelect, onRefresh }: RowProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh(genre.id);
    } catch {
      // keep the current books on failure
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section className={styles.row}>
      <div className={styles.header}>
        <h2 className={styles.label}>{genre.label}</h2>
        <button
          type="button"
          className={`${styles.refresh} ${refreshing ? styles.spinning : ""}`}
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label={`Refresh ${genre.label}`}
          title="Refresh"
        >
          <RefreshIcon />
        </button>
      </div>
      <div className={styles.track}>
        {genre.books.map((book) => (
          <Card key={book.id} book={book} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

export default Row;
