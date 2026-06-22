import { useState } from "react";

import { READING_TIMES } from "../../utils/constants";
import BookCover from "../BookCover/BookCover";

import styles from "./Card.module.scss";

import type { Book, ReadingTime } from "../../types/catalog";

interface CardProps {
  book: Book;
  onSelect: (book: Book, minutes: ReadingTime) => void;
}

function Card({ book, onSelect }: CardProps) {
  const [flipped, setFlipped] = useState(false);

  const choose = (minutes: ReadingTime) => {
    onSelect(book, minutes);
    setFlipped(false);
  };

  return (
    <div className={styles.item}>
      <span
        className={styles.titleChip}
        dir="rtl"
        lang="he"
        title={book.titleHe}
      >
        {book.titleHe}
      </span>
      <div className={styles.scene}>
        <div className={`${styles.card} ${flipped ? styles.flipped : ""}`}>
          <button
            type="button"
            className={`${styles.face} ${styles.front}`}
            onClick={() => setFlipped(true)}
            aria-label={`${book.title} — choose a reading time`}
            aria-hidden={flipped}
            tabIndex={flipped ? -1 : 0}
          >
            <BookCover
              book={book}
              imgClassName={styles.cover}
              placeholderClassName={styles.placeholder}
            />
          </button>

          <div
            className={`${styles.face} ${styles.back}`}
            aria-hidden={!flipped}
          >
            <button
              type="button"
              className={styles.flipBack}
              onClick={() => setFlipped(false)}
              aria-label="Back to cover"
              tabIndex={flipped ? 0 : -1}
            >
              ↩
            </button>
            <span className={styles.want}>I want</span>
            {book.media === "song" ? (
              <button
                type="button"
                className={styles.option}
                onClick={() => choose(2)}
                tabIndex={flipped ? 0 : -1}
              >
                Story of the song
              </button>
            ) : (
              READING_TIMES.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={styles.option}
                  onClick={() => choose(minutes)}
                  tabIndex={flipped ? 0 : -1}
                >
                  Story in {minutes} minutes
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Card;
