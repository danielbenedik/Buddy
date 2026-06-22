import { READING_TIMES } from "../../utils/constants";
import BookCover from "../BookCover/BookCover";

import styles from "./Hero.module.scss";

import type { Book, ReadingTime } from "../../types/catalog";

interface HeroProps {
  book: Book;
  onSelect: (book: Book, minutes: ReadingTime) => void;
}

function Hero({ book, onSelect }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.info}>
        <span className={styles.eyebrow}>Featured today</span>
        <h1 className={styles.title} dir="rtl" lang="he">
          {book.titleHe}
        </h1>
        <p className={styles.meta} dir="rtl" lang="he">
          {book.authorHe}
          {book.year ? ` · ${book.year}` : ""}
        </p>
        {book.media === "song" ? (
          <div className={styles.options}>
            <button
              type="button"
              className={styles.cta}
              onClick={() => onSelect(book, 2)}
            >
              Story of the song
            </button>
          </div>
        ) : (
          <>
            <span className={styles.want}>I want</span>
            <div className={styles.options}>
              {READING_TIMES.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={styles.cta}
                  onClick={() => onSelect(book, minutes)}
                >
                  Story in {minutes} minutes
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <BookCover
        book={book}
        imgClassName={styles.cover}
        placeholderClassName={styles.coverPlaceholder}
      />
    </section>
  );
}

export default Hero;
