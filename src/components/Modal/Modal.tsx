import { useEffect } from "react";
import { createPortal } from "react-dom";

import BookCover from "../BookCover/BookCover";
import Summary from "../Summary/Summary";

import styles from "./Modal.module.scss";

import type { Book } from "../../types/catalog";

interface ModalProps {
  book: Book;
  genreLabel?: string;
  onClose: () => void;
}

function Modal({ book, genreLabel, onClose }: ModalProps) {
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
            <h2 className={styles.title}>{book.title}</h2>
            <p className={styles.meta}>
              {book.author}
              {book.year ? ` · ${book.year}` : ""}
            </p>
            <div className={styles.tags}>
              {genreLabel && <span className={styles.genre}>{genreLabel}</span>}
              <span className={styles.read}>2 min read</span>
            </div>
          </div>
        </div>
        <div className={styles.body}>
          <Summary book={book} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
