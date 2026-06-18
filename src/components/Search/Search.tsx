import { useEffect, useRef, useState } from "react";

import { searchTitles } from "../../services/gemini";

import styles from "./Search.module.scss";

import type { Book, MediaType, ReadingTime } from "../../types/catalog";

interface SearchProps {
  media: MediaType;
  onSelect: (book: Book, minutes: ReadingTime) => void;
}

const MagnifierIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </svg>
);

function Search({ media, onSelect }: SearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults(null);
    setError(false);
    setLoading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    setError(false);
    setResults(null);
    try {
      setResults(await searchTitles(media, q));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const pick = (book: Book) => {
    onSelect(book, 2);
    close();
  };

  if (!open) {
    return (
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => setOpen(true)}
        aria-label="Search books"
      >
        <MagnifierIcon />
      </button>
    );
  }

  return (
    <div className={styles.search} ref={containerRef}>
      <form className={styles.form} onSubmit={submit}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a book…"
          aria-label="Search a book"
        />
        <button type="submit" className={styles.submit} aria-label="Search">
          <MagnifierIcon />
        </button>
      </form>

      {(loading || error || results) && (
        <div className={styles.dropdown}>
          {loading && <div className={styles.message}>Searching…</div>}
          {error && (
            <div className={styles.message}>Search failed. Try again.</div>
          )}
          {results && results.length === 0 && (
            <div className={styles.message}>No matches found.</div>
          )}
          {results?.map((book) => (
            <button
              key={book.id}
              type="button"
              className={styles.result}
              onClick={() => pick(book)}
              dir="rtl"
              lang="he"
            >
              <span className={styles.resultTitle}>{book.titleHe}</span>
              <span className={styles.resultMeta}>
                {book.authorHe}
                {book.year ? ` · ${book.year}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;
