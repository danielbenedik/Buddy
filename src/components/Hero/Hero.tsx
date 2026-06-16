import BookCover from "../BookCover/BookCover";

import styles from "./Hero.module.scss";

import type { Book } from "../../types/catalog";

interface HeroProps {
  book: Book;
  onSelect: (book: Book) => void;
}

function Hero({ book, onSelect }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.info}>
        <span className={styles.eyebrow}>Featured today</span>
        <h1 className={styles.title}>{book.title}</h1>
        <p className={styles.meta}>
          {book.author}
          {book.year ? ` · ${book.year}` : ""}
        </p>
        <button
          type="button"
          className={styles.cta}
          onClick={() => onSelect(book)}
        >
          ▶ Read summary
        </button>
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
